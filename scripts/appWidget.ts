import Services = require("Charts/Services");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers"); 
import WidgetClient = require("TFS/Dashboards/RestClient");
import WorkItemClient = require("TFS/WorkItemTracking/RestClient");
import WorkClient = require("TFS/Work/RestClient");
import CoretionClient = require("TFS/Core/RestClient");
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
let WCClient = WidgetClient.getClient();
let WClient = WorkClient.getClient();
let CClient = CoretionClient.getClient();  

let Team = VSS.getWebContext().team;
let Project = VSS.getWebContext().project;
let MyTeamContext: TeamContext;
let WidgetSettings:Settings;
let DoneStates:String = "'Closed','Done','Rejected'";
let Done:String = "Done";
let Approve: String = "Approved";
let OnGoing: String = "On Going";
let MaxBack: number = 5;
let MaxForword: number = 0;

let TeamDic = {};
let ItterationDic = {};
let ItterationId = {}; 

// let WorkItems: string[] = [];
// let Mode: string;
// let MonthsBack: number=0;
// let MonthsForword: number=0;

let Itterations: TeamSettingsIteration[]= [];
let CharType = ChartTypesConstants.StackedColumn;
let hybridChartOptions: HybridChartOptions = {chartTypes:[ChartTypesConstants.Bar,ChartTypesConstants.StackedColumn,ChartTypesConstants.Bar]}
class ViewModel1 {
    id: string;                  // sprint ID
    startTime: string;           // start time
    endTime: string;             // end time
    name: string;                // sprint name
    path: string;                // sprint path
    url: string;
    postPoned: BarModel;
    planed: BarModel;    
    movedForward: BarModel; 
}
class BarModel {
    Total: number;         // Wits counter
    Done: StateModel;      // done success
    OnGoing: StateModel;   // any state else
    New: StateModel;       // not started
    Closed: StateModel;    // not done
}
class StateModel {
    Total: number;         // state counter
    Wits: string[];        // wits id+title
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
            MyTeamContext = {"project": Project.name,"projectId": Project.id,"team": Team.name,"teamId": Team.id};
            // WorkItems = settings.workItems;
            // Mode = settings.mode;
            // MonthsBack = settings.monthsBack;
            // MonthsForword = settings.monthsForword;            
            //let TeamSelect = $("<select />");   
            //let ItterationSelect = $("<select />"); 
            //let ItterationSelect = $("<checkboxes />"); 
            //container.append(TeamSelect);         
            //container.append(ItterationSelect);                
            //TeamSelect.change((eventObject: JQueryEventObject) => ChangeTeam(TeamSelect,ItterationSelect));            
            //ItterationSelect.change((eventObject: JQueryEventObject)=> ChangeItteration(ItterationSelect.val(),TeamSelect.val()));            
            //GetAllTeams(TeamSelect,ItterationSelect); 
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
    let AllItterations: TeamSettingsIteration[] = await WClient.getTeamIterations(MyTeamContext);
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
    };       
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
        let Newest: TeamSettingsIteration = HistoryItterations.pop();
        TempList = [];
        while(HistoryItterations.length>0){ 
            let CheclIt: TeamSettingsIteration = HistoryItterations.pop(); 
            if (CheclIt.attributes.startDate < Newest.attributes.startDate){
                TempList.push(CheclIt);  
            }
            else {
                TempList.push(Newest); 
                Newest=CheclIt;
            }  
        }
        while(TempList.length>0){
            HistoryItterations.push(TempList.pop());
        }
    }
    AllItterations=HistoryItterations;
    AllItterations.push(CurentItteration);
    AllItterations.concat(FeaatureItterations);
    return AllItterations;
} 
function SetViewMode1(){
    GetViewModel1().then((ViewModel1)=> ShowViewModel1(ViewModel1));
}
async function GetViewModel1(){      
    let IdLists: number[][]=[]; 
    let IdList: number[] = [];
    let OpendWiql: Wiql = {'query' : "SELECT [System.Id] FROM workitems Where [System.TeamProject] = '" + Project.name + "' And [System.State] NOT IN (" + DoneStates + ")"};
    let WitsList = await WIClient.queryByWiql(OpendWiql, Project.name,Team.name);
    WitsList.workItems.forEach(wit => {        
        if (IdList.length==50)
        {
            IdLists.push(IdList);
            IdList = [];
        }
        IdList.push(wit.id);
    });
    let CloseddWiql: Wiql = {'query' : "SELECT [System.Id] FROM workitems Where [System.TeamProject] = '" + Project.name + "' And [System.State] IN (" + DoneStates + ")"}; // Add last update is smaller then smalest date
    WitsList = await WIClient.queryByWiql(CloseddWiql, Project.name,Team.name);
    WitsList.workItems.forEach(wit => {        
        if (IdList.length==50)
        {
            IdLists.push(IdList);
            IdList = [];
        }
        IdList.push(wit.id);
    });
    IdLists.push(IdList);
    let FullWorkItemList: WorkItem[];
    for (const Ids of IdLists) {
    // IdLists.forEach(async Ids => {
        let WorkItemList = await WIClient.getWorkItems(Ids, null, null, WorkItemExpand.Fields);
        if (FullWorkItemList){
            FullWorkItemList.concat(WorkItemList);
        }
        else{
            FullWorkItemList=WorkItemList;
        }
    };   
    let ViewModel1: ViewModel1 = BuildViewModel(FullWorkItemList);  
    return ViewModel1;
}
function BuildViewModel(FullWorkItemList: WorkItem[]){
    let ViewModel1: ViewModel1; 
    FullWorkItemList.forEach(async WorkItem => {
        let revisions: WorkItem[] = await WIClient.getRevisions(WorkItem.id,null,null,WorkItemExpand.Fields);
        let FolowState = 0; // 0 - new / 1 - commited / 2 - on going / 3 - done /
        let IterationValue: String;
        revisions.forEach(revision => {
            if (FolowState == 0){
                IterationValue = revisions[0].fields["System.ItterationPath"];
                if (Approve == revision.fields["System.State"]){
                    // changed to appeoved => mean planed
                    // check if date in the view -> add to planed by itteration path
                    // set the itterationValue to the approved itterarion path
                    FolowState = 1;
                }
            }
            else if (FolowState == 1){
                if (IterationValue != revision.fields["System.ItterationPath"]){
                    // add to pospone by itteration
                }
                else if (OnGoing == revision.fields["System.State"]){
                    FolowState = 2;
                }
            } 
            else if (FolowState == 2){
                if (IterationValue != revision.fields["System.ItterationPath"]){
                    // add to pospone by itteration
                }
                else if (Done == revision.fields["System.State"]){
                    FolowState = 3;
                }
            } 
            else if (FolowState == 3){
                // check if reopen
            }
        });
    });
    return ViewModel1;
}
async function ShowViewModel1(ViewModel1: ViewModel1){

}



//////// Old Function ///////




function GetAllTeams(NewSelect,ItterationSelect){
    // CClient.getAllTeams().then((TeamList)=>{
    //     TeamList.forEach(Team =>{
    //         if (Team.projectName==Project.name){
    //             NewSelect.append(new Option(Team.name)); //NewSelect.append(new Option(Team.id));
    //             let teamContext: TeamContext = {"project": Team.projectName,"projectId": Team.projectId,"team": Team.name,"teamId": Team.id}
    //             TeamDic[Team.name]=teamContext;
    //         }
    //     });
    // }).then(()=>{
    //     NewSelect.val(TeamName);
    //     ChangeTeam(NewSelect,ItterationSelect);
    // }); 
} 
async function ChangeTeam(TeamSelect:JQuery,ItterationSelect:JQuery){ 
    ItterationDic = {};
    ItterationId = {};
    ItterationSelect.empty();
    let SelectedTeam = TeamSelect.val(); 
    let teamContext: TeamContext = TeamDic[SelectedTeam];
    Itterations = await WClient.getTeamIterations(teamContext);
    //let counter:number = 0; 
    let Itteration = await WClient.getTeamIterations(teamContext,"Current");  
    Itterations.forEach(itteration =>{
        let IsCheck = false;
        if (Itteration[0].name==itteration.name)
            IsCheck=true;
        let Label = $("<label />").append($('<input>').attr({
            type: 'checkbox',
            value: itteration.name,
            checked: IsCheck 
          }).click(()=>function(){
            Itterations = []; 
            $('#checkboxes input[type="checkbox"]:checked').each(function() {
                Itterations.push($(this).val());
                ChangeCharts(SelectedTeam);
            });
        })).append(itteration.name);  
        //ItterationSelect.append(new Option(itteration.name));        
        //ItterationId[itteration.name]= counter;
        //ItterationDic[itteration.name] = itteration;
        //counter = counter +1;
        ItterationSelect.append(Label);
    });   
    ChangeCharts(SelectedTeam);
}
function ChangeCharts(Team){
    // switch(Mode){
    //     case "Mode-1":{  
    //         let ViewModel :ViewModel[]=[];
    //         Itterations.forEach(Itteration => {
    //             let SprintView :ViewModel = {
    //                 id: Itteration.id,
    //                 endTime: Itteration.attributes.finishDate.toString(),
    //                 startTime: Itteration.attributes.startDate.toString(),
    //                 movedForward:null,
    //                 name: Itteration.name,
    //                 path: Itteration.path,
    //                 planed:null,
    //                 postPoned:null,
    //                 url: Itteration.url
    //             }
    //         });
    //         return;                        
    //     }
    //     case "Mode-2":{    

    //         return;                        
    //     }
    //     case "Mode-3":{    
  
    //         return;                        
    //     }
    // }
} 
function ChangeItterationOld(Itteration,Team){
    let IttId = ItterationId[Itteration];  
    let Maxnum:number = IttId + Number(WidgetSettings.monthsForword);
    let Minnum:number = IttId - Number(WidgetSettings.monthsBack);
    let ItterationArray = []
    for (let Itte in ItterationDic)
    {
        let CheckId :Number = ItterationDic[Itte];
        if ( CheckId >= Minnum && CheckId <= Maxnum ){
            ItterationArray.push(ItterationDic[Itte]);
        }
    }
    switch(WidgetSettings.mode){
        case "Mode-1":{  
            let ViewModel = null
            ShowViewMode1(ViewModel,"Mode-1 chart",Colorize1());  
            MakeQueryMode1(ItterationArray,Itteration,Team).then((ViewModel)=>{
                ShowViewMode1(ViewModel,"Mode-1 chart",Colorize1());
            });  
            return;                        
        }
        case "Mode-2":{    
            let ViewModel = null
            ShowViewMode2(ViewModel,"Mode-2 chart",Colorize1());
            MakeQueryMode1(ItterationArray,Itteration,Team).then((ViewModel)=>{
                ShowViewMode2(ViewModel,"Mode-2 chart",Colorize1());
            });  
            return;                        
        }
        case "Mode-3":{    
            let ViewModel = null
            ShowViewMode3(ViewModel,"Mode-3 chart",Colorize1());
            MakeQueryMode1(ItterationArray,Itteration,Team).then((ViewModel)=>{
                ShowViewMode3(ViewModel,"Mode-3 chart",Colorize1());
            });  
            return;                        
        }
    }
} 
async function MakeQueryMode1(ItterationArray,Itteration,Team){  
    // build query
    let ItterationString = "";
    ItterationArray.forEach(itt => {       
        ItterationString = ItterationString + "'" + itt.path + "',";
    });
    ItterationString = ItterationString.slice(0,-1)
    let WorkItemsString = "";
    // WorkItems.forEach(WorkItem => {
    //     WorkItemsString = WorkItemsString + "'" + WorkItem + "',";
    // });
    WorkItemsString = WorkItemsString.slice(0,-1)
    let valval = "Test\\Sprint January";
    let wiql: Wiql = {'query' : "SELECT [System.Id] FROM workitems Where [System.TeamProject] = '" + Project.name + "' And [IterationPath] = '" + valval + "'"};  //+ ItterationString + ")" };// AND [System.WorkItemType] IN (" + WorkItemsString + ")"};
    // call query
    let WitsList = await WIClient.queryByWiql(wiql, "test",Team);
    // Get All work items with all data
    // WIClient.getWorkItems()
    // build Model
    return WitsList;
}
function Colorize1() {
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
function ShowViewMode1(ViewModel,title,colorize){
    let $ChartDiv = $("#ChartContainer"); 
    // Clear
    // Generate the chart
    let data: number[] = [
        4,
        1,
        8,
        12,
        5,
        7,
        3
    ]
    
    let legend: LegendOptions = {
        enabled: false
    }
    let chartPieOptions: CommonChartOptions = {
        "title": title,
        "suppressMargin": true,
        "legend": legend,
        suppressAnimation: true,
        hostOptions: { height: 250, width: 250 },
        "chartType": CharType,
        colorCustomizationOptions: colorize,
        "xAxis": {
            title: title,
            canZoom: true,
            labelsEnabled: false,
            labelValues: ["A", "B", "C", "D", "E", "F", "G"]
        },
        "series": [{
            data
        }],
        "click": (clickeEvent: ClickEvent) => {
            DrillDown2();
        },
        "specializedOptions": {
            showLabels: true,
            size: "80%"
        },
    }
    
    Services.ChartsService.getService().then((chartService) => {
        chartService.createChart($ChartDiv, chartPieOptions);
    });
}
function ShowViewMode2(ViewModel,title,colorize)
{
    let legendd:LegendOptions = {
        enabled: false
    }
    let hostOption: ChartHostOptions = {
        height: 250,
        width: 200
    }
    let $ChartDiv = $("#ChartContainer"); 
    let $Char1 = $("<td />");   
    let $Char2 = $("<td />");   
    let $Char3 = $("<td />"); 
    $ChartDiv.append($Char1);
    $ChartDiv.append($Char2);
    $ChartDiv.append($Char3);
    let series = [];
    series.push({
        name: "Done",
        data: [
            [1,5],
            [2,2],
            [3,7]
        ]
    }); 
    series.push({
        name: "In Progress",
        data: [
            [1,1],
            [2,2],
            [3,6]
        ]
    });
    series.push({
        name: "Pospone",
        data: [
            [1,2],
            [2,3],
            [3,4]
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
        "Un Planed",
        ""
    ]
    let chartStackedColumnOptions: CommonChartOptions = {   
        title: "Try",
        hostOptions: hostOption,
        tooltip: toolTipOption,
        //"chartType": CharType,
        chartType: ChartTypesConstants.StackedColumn,
        colorCustomizationOptions: colorize,
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
            DrillDown1()
        },
    }  

    Services.ChartsService.getService().then((chartService) => { 
        VSS.resize();
        chartStackedColumnOptions.title="Sprint 1";
        chartService.createChart($Char1, chartStackedColumnOptions);
        chartStackedColumnOptions.title="Sprint 2";
        chartService.createChart($Char2, chartStackedColumnOptions);
        chartStackedColumnOptions.title="Sprint 3";
        chartService.createChart($Char3, chartStackedColumnOptions);
        VSS.resize();
    });
}
function ShowViewMode3(ViewModel,title,colorize)
{
    let $ChartDiv = $("#ChartContainer"); 
    let series = [];
    series.push({
        name: "Avi",
        data: [
            [1,2,4],
            [1,3,5],
            [2,1,4],
            [2,3,4]
        ]
    });
    series.push({
        name: "Moshe",
        data: [
            [1,5,1],
            [2,3,2],
            [1,2,4],
            [1,3,5]
        ]
    });
    series.push({
        name: "David",
        data: [
            [4,4,4],
            [5,2,5],
            [1,5,1],
            [2,3,2]
        ]
    });
    let toolTipOption: TooltipOptions = {
        onlyShowFocusedSeries: true        
    }
    let labels = ["A","B","C","D","E","F","G","H","I","J"]
    let chartStackedColumnOptions: CommonChartOptions = {
        "tooltip": toolTipOption,
        "chartType": CharType,
        "specializedOptions": hybridChartOptions, 
        colorCustomizationOptions: colorize,
        "xAxis": {
            title: title,
            canZoom: true,
            labelsEnabled: true,  
            suppressLabelTruncation: true,
            labelValues: labels
        },
        "yAxis": {
            title: title,
            canZoom: true,
            labelsEnabled: true,  
            suppressLabelTruncation: true,
            renderToEdges: true
        },
        "yAxisSecondary":{
            title: title,
            canZoom: true,
            labelsEnabled: true,  
            suppressLabelTruncation: true,
            renderToEdges: true
        }, 
        "series": series,
        "click": (clickeEvent: ClickEvent) => {
            DrillDown1()
        },
    }  
    Services.ChartsService.getService().then((chartService) => {
        chartService.createChart($ChartDiv, chartStackedColumnOptions);
    });
}
function DrillDown1(){

}
function DrillDown2(){

}
class SumeSuite {
    constructor(name: string, id: number, url: string = "") {
        this.SuiteName = name;
        this.Blocked = 0
        this.Failed = 0
        this.InProgress = 0
        this.NotApplicable = 0
        this.NotRun = 0
        this.Passed = 0
        this.Paused = 0
        this.totalPoints = 0
        this.suiteLevel = 0
        this.TotalPassed = 0;
        this.TotalFailed = 0;
        this.TotalNotRun = 0;
        this.TotalNotApplicable = 0;
        this.TotalInProgress = 0;
        this.TotalPaused = 0;
        this.TotalBlocked = 0;
        this.SuiteId = id;
        this.url = url;
    }
    SuiteId: number;
    SuiteName: string;
    Passed: number;
    Failed: number;
    NotRun: number;
    NotApplicable: number;
    InProgress: number;
    Paused: number;
    Blocked: number;
    TotalPassed: number;
    TotalFailed: number;
    TotalNotRun: number;
    TotalNotApplicable: number;
    TotalInProgress: number;
    TotalPaused: number;
    TotalBlocked: number;
    totalPoints: number;
    suiteLevel: number;
    ParentID: string;
    TotalIncludeChildren: number;
    AssignTo: string;
    url: string;
}
function OpenWorkItem(id: number, url: string) {
    witManager.WorkItemFormNavigationService.getService().then((service) => {
        service.openWorkItem(id, false);
    })
}