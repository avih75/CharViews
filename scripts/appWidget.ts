import Services = require("Charts/Services");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers"); 
import WidgetClient = require("TFS/Dashboards/RestClient");
import WorkItemClient = require("TFS/WorkItemTracking/RestClient");
import WorkClient = require("TFS/Work/RestClient");
import CoreClient = require("TFS/Core/RestClient");
import witManager = require("TFS/WorkItemTracking/Services");
import { TeamContext } from "TFS/Core/Contracts";
import { ColorEntry, TooltipOptions, CommonChartOptions, ChartTypesConstants, ClickEvent, LegendOptions,  ColorCustomizationOptions, HybridChartOptions, ChartHostOptions } from "Charts/Contracts";
import { WorkItem, WorkItemExpand, Wiql } from "TFS/WorkItemTracking/Contracts";
import { VssConnection, VssService } from "VSS/Service";
import { IterationWorkItems } from "TFS/Work/Contracts";
import { TeamSettingsIteration } from "azure-devops-node-api/interfaces/WorkInterfaces";
import { Settings } from "./appWidgetConfiguration";
import { StringDecoder } from "string_decoder";

WidgetHelpers.IncludeWidgetStyles();
WidgetHelpers.IncludeWidgetConfigurationStyles();

let WIClient = WorkItemClient.getClient();
let WClient = WorkClient.getClient();
let WCClient = WidgetClient.getClient();
let CClient = CoreClient.getClient();  

const MaxCallIds:number=200;
let Team = VSS.getWebContext().team;
let Project = VSS.getWebContext().project;
let MyTeamContext: TeamContext;
let WidgetSettings:Settings;
let EndStates: string[]; //= "'Closed','Done','Rejected'"; 
let DoneStates: string="";
//let Done:String = "Done";
let Commited: string; //"Approved";
let OnGoing: string[];// = "On Going";
let MaxBack: number = 5;
let MaxForword: number = 0;
let SelecctedWitsList: string="";
let AllItterations: TeamSettingsIteration[]= [];
let FirstDate:Date;
let LastDate:Date;

let TeamDic = {};
let ItterationDic = {};
let ItterationId = {};  

let Itterations: TeamSettingsIteration[]= [];
let CharType = ChartTypesConstants.StackedColumn;
let hybridChartOptions: HybridChartOptions = {chartTypes:[ChartTypesConstants.Bar,ChartTypesConstants.StackedColumn,ChartTypesConstants.Bar]}

class DataModel1 {
    ItterationData: ItterationData1[];
    constructor() {
        this.ItterationData = [];
        AllItterations.forEach(Itteration => {
            let ItterationView:ItterationData1 = new ItterationData1(Itteration);
            this.ItterationData.push(ItterationView);
        });
    }
    NewSpot(Spt:Spot){
        this.ItterationData.forEach(Itteration => {
            if (Itteration.id==Spt.Itteration.id)
            {
                Itteration.NewSpot(Spt)
            }
        });
    }
    UpdateSpotState(){

    }
    RemoveSpot(){

    }
}
class ItterationData1{   
    constructor(Itteration: TeamSettingsIteration) {
        this.id= Itteration.id;
        this.name= Itteration.name;
        this.path= Itteration.path;
        this.url= Itteration.url;
        this.startTime= Itteration.attributes.startDate;
        this.endTime= Itteration.attributes.finishDate;
        this.planed= new BarModel();
        this.postPoned= new BarModel();
    }
    id: string;                  // sprint ID
    startTime: Date;           // start time
    endTime: Date;             // end time
    name: string;                // sprint name
    path: string;                // sprint path
    url: string;
    postPoned: BarModel;
    planed: BarModel;  
    NewSpot(Spt:Spot){ 
        if (Spt.SpotLocation==SpotLocation.Planed){
            this.planed.NewSpot(Spt);
        }
        else if (Spt.SpotLocation==SpotLocation.PostPoned){
            this.postPoned.NewSpot(Spt);
        }
    }
    UpdateSpotState(){

    }   
    RemoveSpot(){

    }
}
class BarModel {
    constructor() {
        this.Total = 0;
        this.Closed = new StateModel();
        this.OnGoing = new StateModel();
        this.new = new StateModel(); 
        this.Cancle = new StateModel();
        this.Postponed = new StateModel();
    }
    Total: number;         // Wits counter
    Closed: StateModel;      // done success
    OnGoing: StateModel;   // any state else
    new: StateModel;        // not started 
    Postponed: StateModel;   // any state else
    Cancle: StateModel;        // not started 
    NewSpot(Spt:Spot){
        switch(Spt.SpotState){
            case SpotState.New:{
                this.new.NewSpot(Spt);
                break;
            }
            case SpotState.Cancle:{
                this.Cancle.NewSpot(Spt);
                break;
            }
            case SpotState.Closed:{
                this.Closed.NewSpot(Spt);
                break;
            }
            case SpotState.Postponed:{
                this.Postponed.NewSpot(Spt);
                break;
            }
            case SpotState.OnGoing:{
                this.OnGoing.NewSpot(Spt);
                break;
            }
        } 
        this.Total+=1;
    }
    UpdateSpotState(){

    }   
    RemoveSpot(){
        this.Total-=1;
    }
}
class StateModel {
    constructor() {
        this.Total = 0;
        this.WitIds = [];
        this.WitTitle = [];
    }
    Total: number;         // state counter
    WitIds: number[];        // wits id
    WitTitle: string[];
    NewSpot(Spt:Spot){
        this.WitIds.push(Spt.WitId);
        this.WitTitle.push(Spt.WitTitle);
        this.Total+=1;
    }
    UpdateSpotState(){

    }   
    RemoveSpot(){
        this.Total-=1;
    }
}
class Spot{
    SpotLocation:SpotLocation;
    SpotState:SpotState;
    Itteration:TeamSettingsIteration;
    WitId:number;
    WitTitle:string;
}
enum SpotLocation {
    Planed,
    PostPoned
}
enum SpotState {
    Closed,
    OnGoing,
    Postponed,
    Cancle,
    New
}
VSS.register("ChartViewsWidget", function (){
    let getQueryInfo = function (widgetSettings) {
        WidgetSettings = JSON.parse(widgetSettings.customSettings.data);
        let container = $("#ViewContainer");      
        container.empty();
        if (!WidgetSettings) {            
            container.text("Sorry nothing to show, please Check cconfiguration.");
            return WidgetHelpers.WidgetStatusHelper.Success();
        }
        else {             
            EndStates = WidgetSettings.endStateList;
            EndStates.forEach(EndState => {
                DoneStates = "'" + EndState + "'," + DoneStates;
            });
            DoneStates = DoneStates.slice(0, -1); 

            WidgetSettings.workItems.forEach(Wit => {
                SelecctedWitsList = "'" + Wit + "'," + SelecctedWitsList;
            });
            SelecctedWitsList = SelecctedWitsList.slice(0, -1);
            OnGoing = WidgetSettings.onGoingStateList;
            Commited = WidgetSettings.commitState;
            MyTeamContext = {"project": Project.name,"projectId": Project.id,"team": Team.name,"teamId": Team.id};
            SetViews();       
            return WidgetHelpers.WidgetStatusHelper.Success();
        }
    }
    return {
        load: function (widgetSettings) {
            return getQueryInfo(widgetSettings);
        },
        reload: function (widgetSettings) {
            return getQueryInfo(widgetSettings);
        }
    }
});
async function SetViews(){
    AllItterations = await WClient.getTeamIterations(MyTeamContext);
    AllItterations = SetItterations(AllItterations);
    switch(WidgetSettings.mode){
        case "Mode-1":{
            SetViewMode1();
            return; 
        }
        case "Mode-2":{
            return; 
        }
        case "Mode-3":{
            return; 
        }
        case "Mode-4":{
            return; 
        }
    }
}
function SetItterations(AllItterations: TeamSettingsIteration[]){
    let HistoryItterations: TeamSettingsIteration[]=[];
    let FeaatureItterations: TeamSettingsIteration[]=[];
    let TempList:TeamSettingsIteration[] = [];
    while(AllItterations.length>0){
        TempList.push(AllItterations.pop());
    } 
    let CurentItteration: TeamSettingsIteration;
    while(TempList.length>0){
        let Itteration: TeamSettingsIteration = TempList.pop(); 
        if (Itteration.attributes.timeFrame == 0 ){ // past
            if (MaxBack>0){
                HistoryItterations.push(Itteration);
            }
        }
        else if (Itteration.attributes.timeFrame == 1){ // current
            CurentItteration = Itteration;
        }
        else{ // feature
            if (MaxForword>0){
                FeaatureItterations.push(Itteration);
            }
        }
    }     
    while(HistoryItterations.length>MaxBack){ 
        let Oldest: TeamSettingsIteration = HistoryItterations.pop();
        TempList= [];
        while(HistoryItterations.length>0){ 
            let CheclIt: TeamSettingsIteration = HistoryItterations.pop(); 
            if (CheclIt.attributes.startDate > Oldest.attributes.startDate){
                TempList.push(CheclIt);  
            }
            else {
                TempList.push(Oldest); 
                Oldest=CheclIt;
            }  
        }
        while(TempList.length>0){
            HistoryItterations.push(TempList.pop());
        }
    }
    while(FeaatureItterations.length>MaxForword){ 
        let Newest: TeamSettingsIteration = FeaatureItterations.pop();
        TempList = [];
        while(FeaatureItterations.length>0){ 
            let CheclIt: TeamSettingsIteration = FeaatureItterations.pop(); 
            if (CheclIt.attributes.finishDate > Newest.attributes.finishDate){
                TempList.push(CheclIt);  
            }
            else {
                TempList.push(Newest); 
                Newest=CheclIt;
            }  
        }
        while(TempList.length>0){
            FeaatureItterations.push(TempList.pop());
        }
    }
    if (HistoryItterations && HistoryItterations.length>0 && HistoryItterations[0].attributes.finishDate){
        FirstDate = HistoryItterations[0].attributes.startDate;
    }
    else{
        FirstDate = CurentItteration.attributes.startDate;
    }
    if (FeaatureItterations && FeaatureItterations.length>0 && FeaatureItterations[FeaatureItterations.length-1].attributes.finishDate){
        LastDate = FeaatureItterations[0].attributes.finishDate;
    }
    else{
        LastDate = CurentItteration.attributes.finishDate;
    }
    AllItterations=HistoryItterations;
    AllItterations.push(CurentItteration);
    AllItterations.concat(FeaatureItterations);
    return AllItterations;
} 
function SetViewMode1(){
    GetViewModel1().then((ViewModel1)=> ShowViewModels1(ViewModel1));
}
async function GetViewModel1(){
    let DuplicateCheck: number[]=[];   
    let IdLists: number[][]=[]; 
    let IdList: number[] = [];
    let OpendWiql: Wiql = {'query' : "SELECT [System.Id],[System.IterationPath],[System.AreaPath] FROM workitems Where [System.TeamProject] = '" + Project.name + "' AND [System.WorkItemType] IN (" + SelecctedWitsList + ") And [System.State] NOT IN (" + DoneStates + ")"};
    let WitsList = await WIClient.queryByWiql(OpendWiql, Project.name,Team.name);
    WitsList.workItems.forEach(wit => {        
        if (IdList.length==MaxCallIds)
        {
            IdLists.push(IdList);
            IdList = [];
        }
        if (DuplicateCheck.lastIndexOf(wit.id)==-1) {
            DuplicateCheck.push(wit.id);
            IdList.push(wit.id);
        } 
    });
    let CloseddWiql: Wiql = {'query' : "SELECT [System.Id],[System.IterationPath],[System.AreaPath]  FROM workitems Where [System.TeamProject] = '" + Project.name + "' AND [System.WorkItemType] IN (" + SelecctedWitsList + ") And [System.State] IN (" + DoneStates + ") AND [System.ChangedDate] > '" + FirstDate.toDateString() + "'"}; // Add last update is smaller then smalest date
    WitsList = await WIClient.queryByWiql(CloseddWiql, Project.name,Team.name);
    WitsList.workItems.forEach(wit => {        
        if (IdList.length==MaxCallIds)
        {
            IdLists.push(IdList);
            IdList = [];
        }
        if (DuplicateCheck.lastIndexOf(wit.id)==-1) {
            DuplicateCheck.push(wit.id);
            IdList.push(wit.id);
        }        
    });
    IdLists.push(IdList);
    let FullWorkItemList: WorkItem[];
    for (const Ids of IdLists) { 
        let WorkItemList = await WIClient.getWorkItems(Ids, null, null, WorkItemExpand.Fields);
        if (FullWorkItemList){
            FullWorkItemList.concat(WorkItemList);
        }
        else{
            FullWorkItemList=WorkItemList;
        }
    };   
    let ViewModel1: DataModel1 = BuildViewModel(FullWorkItemList);  
    return ViewModel1;
}
function BuildViewModel(FullWorkItemList: WorkItem[]){
    let ViewModel1: DataModel1 = new DataModel1();
    FullWorkItemList.forEach(async WorkItem => {
        let FolowState = 0; // 0 - new / 1 - commited / 2 - on going / 3 - done /
        let WorkItemIterationValue: string;
        let ChangeToCommit: Date;
        let revisions: WorkItem[] = await WIClient.getRevisions(WorkItem.id,null,null,WorkItemExpand.Fields);
        revisions.forEach(revision => {
            let RevIterationValue: string = revision.fields["System.IterationPath"];
            let RevChangedDate :Date = revision.fields["System.ChangedDate"]; 
            let RevState = revision.fields["System.State"]; 
            if (FolowState == 0){                          
                if (RevState == Commited){ // changed to appeoved => mean planed
                    ChangeToCommit = RevChangedDate;                  
                    RevisionAnalyze(ViewModel1,RevState,RevIterationValue,SpotLocation.Planed,revision.id,revision.fields["System.Title"]);                                                    
                    FolowState = 1;
                    WorkItemIterationValue = RevIterationValue;
                }
            }
            else if (FolowState == 1){
                if (WorkItemIterationValue != RevIterationValue){
                    if (false){ // check if the change made in one day or previuse itteration
                        // remove from last show
                        // add to new planed
                    }
                    else{
                        // add pospone to itteration
                    }
                }
                else{
                    OnGoing.forEach(Going => {
                        if (RevState == Going){
                            // update the value to on going
                            FolowState = 2;
                        }
                    })
                }
            } 
            else if (FolowState == 2){
                if (WorkItemIterationValue != RevIterationValue){
                    // add to pospone by itteration
                }
                else {
                    EndStates.forEach(Done => {
                        if (RevState == Done){
                            FolowState = 3;
                        }
                    });                
                }
            } 
            else if (FolowState == 3){
                // check if reopen
            }
        });
    });
    return ViewModel1;
}
function RevisionAnalyze(ViewModel1: DataModel1,RevState: string,IterationValue:string,SptLocation:SpotLocation,WitId:number,WitTitle:string){
    let Spot:Spot = null; 
    let SptState:SpotState;
    let itter: TeamSettingsIteration;
    AllItterations.forEach(Itteration => {
        if (Itteration.path==IterationValue)
        {
            itter=Itteration;
        }
    }); 
    if(SptLocation == SpotLocation.PostPoned){
        SptState = SpotState.Postponed;
    }
    else if (SptLocation == SpotLocation.Planed){
        if (RevState == Commited){ 
            Spot = {
                SpotLocation:SpotLocation.Planed,
                SpotState:SpotState.New,
                Itteration:itter,
                WitId:WitId,
                WitTitle:WitTitle
            } 
            ViewModel1.NewSpot(Spot);
        }
        else if (OnGoing.indexOf(RevState)>-1){
            SptState = SpotState.OnGoing;
        }
        else if (EndStates.indexOf(RevState)>-1){
            SptState = SpotState.Closed;
        } 
        else{ // cancled
            SptState = SpotState.Cancle;
        }
    } 
}
async function ShowViewModels1(DataModel1: DataModel1){
    let container = $("#ViewContainer");
    let $Table = $("<table />");
    container.append($Table);
    let $Tr = $("<tr />"); 
    DataModel1.ItterationData.forEach(ItterationData => {
        let $td = $("<td />");       
        $Tr.append($td);
        ShowViewModel1(ItterationData,$td);
    });
    $Table.append($Tr);
}
function Colorize() {
    let colorPass: ColorEntry = {
        backgroundColor: 'Green',
        value: 'Passed'
    }
    let colorFailed: ColorEntry = {
        backgroundColor: 'Red',
        value: 'Failed'
    }
    let colorNotRun: ColorEntry = {
        backgroundColor: 'Gray',
        value: 'Not Run'
    }
    let colorInProgress: ColorEntry = {
        backgroundColor: 'Blue',
        value: 'In Progress'
    }
    let colorInNotApplicable: ColorEntry = {
        backgroundColor: 'Yellow',
        value: 'Not Applicable'
    }
    let colors: Array<ColorEntry> = new Array<ColorEntry>();
    colors.push(colorPass);
    colors.push(colorFailed);
    colors.push(colorNotRun);
    colors.push(colorInProgress);
    colors.push(colorInNotApplicable);
    let colorize: ColorCustomizationOptions = {
        customColors: colors
    }
    return colorize;
}
function ShowViewModel1(ItterationData: ItterationData1,$td: JQuery){ 
    let legendd:LegendOptions = { 
        enabled: false 
    }
    let hostOption: ChartHostOptions = {
        height: 250,
        width: 200
    }  
    let series = [];
    series.push({
        name: "Done",
        data: [
            [1,5],
            [2,2]
        ]
    }); 
    series.push({
        name: "In Progress",
        data: [
            [1,1],
            [2,2]
        ]
    });
    series.push({
        name: "Pospone",
        data: [
            [1,2],
            [2,3]
        ]
    });
    let toolTipOption: TooltipOptions = {
        enabled: true,
        onlyShowFocusedSeries: false        
    }
    let labels = [
        "",
        "Posponed",
        "Planed",
        ""
    ]
    let chartStackedColumnOptions: CommonChartOptions = {   
        title: "Try",
        hostOptions: hostOption,
        tooltip: toolTipOption,
        //"chartType": CharType,
        chartType: ChartTypesConstants.StackedColumn,
        colorCustomizationOptions: Colorize(),
        xAxis: { 
            canZoom: true,
            labelsEnabled: true,  
            suppressLabelTruncation: true,
            labelValues: labels,
            renderToEdges: true
        },
        yAxis: { 
            canZoom: true,
            labelsEnabled: true,  
            suppressLabelTruncation: true,
            renderToEdges: true
        }, 
        legend: legendd,
        //"suppressMargin": true,
        //"specializedOptions": hybridChartOptions,
        series: series,
        click: (clickeEvent: ClickEvent) => {
            DrillDown1();
        },
    }
    Services.ChartsService.getService().then((chartService) => {
        chartService.createChart($td, chartStackedColumnOptions);
    });
}
function DrillDown1(){

}
//const options = { day: 'numeric', month: 'numeric', year: 'numeric' };
//const shortDate = date.toLocaleDateString('en-US', options);