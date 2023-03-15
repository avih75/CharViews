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
let EndStates: String[]; //= "'Closed','Done','Rejected'";
let DoneStates: String="";
//let Done:String = "Done";
let Commited: String; //"Approved";
let OnGoing: String[];// = "On Going";
let MaxBack: number = 5;
let MaxForword: number = 0;
let SelecctedWitsList: String="";
let AllItterations: TeamSettingsIteration[]= [];
let FirstDate:String;
let LastDate:String;

let TeamDic = {};
let ItterationDic = {};
let ItterationId = {};  

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
        FirstDate = HistoryItterations[0].attributes.startDate.toDateString();
    }
    else{
        FirstDate = CurentItteration.attributes.startDate.toDateString();
    }
    if (FeaatureItterations && FeaatureItterations.length>0 && FeaatureItterations[FeaatureItterations.length-1].attributes.finishDate){
        LastDate = FeaatureItterations[0].attributes.finishDate.toDateString();
    }
    else{
        LastDate = CurentItteration.attributes.finishDate.toDateString();
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
    let DuplicateCheck: number[]=[];   
    let IdLists: number[][]=[]; 
    let IdList: number[] = [];
    let OpendWiql: Wiql = {'query' : "SELECT [System.Id],[System.IterationPath],[System.AreaPath] FROM workitems Where [System.TeamProject] = '" + Project.name + "' AND [System.WorkItemType] IN (" + SelecctedWitsList + ") And [System.State] NOT IN (" + DoneStates + ")"};
    let WitsList = await WIClient.queryByWiql(OpendWiql, Project.name,Team.name);
    WitsList.workItems.forEach(wit => {        
        if (IdList.length==50)
        {
            IdLists.push(IdList);
            IdList = [];
        }
        if (DuplicateCheck.lastIndexOf(wit.id)==-1) {
            DuplicateCheck.push(wit.id);
            IdList.push(wit.id);
        } 
    });
    let CloseddWiql: Wiql = {'query' : "SELECT [System.Id],[System.IterationPath],[System.AreaPath]  FROM workitems Where [System.TeamProject] = '" + Project.name + "' AND [System.WorkItemType] IN (" + SelecctedWitsList + ") And [System.State] IN (" + DoneStates + ") AND [System.ChangedDate] > '" + FirstDate + "'"}; // Add last update is smaller then smalest date
    WitsList = await WIClient.queryByWiql(CloseddWiql, Project.name,Team.name);
    WitsList.workItems.forEach(wit => {        
        if (IdList.length==50)
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
                if (Commited == revision.fields["System.State"]){
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
                else {
                    EndStates.forEach(Done => {
                        if (Done == revision.fields["System.State"]){
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
async function ShowViewModel1(ViewModel1: ViewModel1){

}
//const options = { day: 'numeric', month: 'numeric', year: 'numeric' };
//const shortDate = date.toLocaleDateString('en-US', options);