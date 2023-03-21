import Services = require("Charts/Services");
import WorkItemClient = require("TFS/WorkItemTracking/RestClient");
import { TooltipOptions, CommonChartOptions, ChartTypesConstants, ClickEvent, LegendOptions, ChartHostOptions } from "Charts/Contracts";
import { WorkItem, WorkItemExpand, Wiql } from "TFS/WorkItemTracking/Contracts";
import { TeamSettingsIteration } from "azure-devops-node-api/interfaces/WorkInterfaces";
import { Colorize} from "./Common"; 

let WIClient = WorkItemClient.getClient();

enum Planing{
    Posponed,
    Planed    
}
enum States{
    New,
    Commited,
    Closed
}
export async function GetViewModeData2(ProjectName: string,TeamName: string, MaxCallIds:number,FirstDate:Date,DoneStates: string,SelecctedWitsList: string){
    let IdLists: number[][]=[];
    let IdList: number[] = [];
    let OpendWiql: Wiql = {'query' : "SELECT [System.Id],[System.IterationPath],[System.AreaPath] FROM workitems Where [System.TeamProject] = '" + ProjectName + "' AND [System.WorkItemType] IN (" + SelecctedWitsList + ") AND ( [System.ChangedDate] > '" + FirstDate.toDateString() + "' OR [System.State] NOT IN (" + DoneStates + "))"};
    let WitsList = await WIClient.queryByWiql(OpendWiql, ProjectName,TeamName);
    WitsList.workItems.forEach(wit => {        
        if (IdList.length==MaxCallIds)
        {
            IdLists.push(IdList);
            IdList = [];
        }
        IdList.push(wit.id);
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
    return FullWorkItemList;
}
export class DataModel2 {
    Xasix: string;
    Yasix: string;
    Title: string;
    TwinsBar: TwinsBars[];  
    constructor(AllItterations: TeamSettingsIteration[],Title: string) {
        this.TwinsBar = [];        
        this.Title = Title;
        AllItterations.forEach(Itteration => {
            let Twins:TwinsBars = new TwinsBars(Itteration);
            this.TwinsBar.push(Twins);
        });
    }
    AddNewSpotIteration(ItterationPath: string,State:States,Plan:Planing){
        this.TwinsBar.forEach(Twins => {
            if (Twins.path==ItterationPath)
            {
                Twins.AddNew(State,Plan);
            }
        });
    }
    UpdateState(ItterationPath: string,State:States,Plan:Planing){
        this.TwinsBar.forEach(Twins => {
            if (Twins.path==ItterationPath)
            {
                Twins.Update(State);
            }
        });
    }
}
class TwinsBars {    
    id: string;                 // sprint ID
    startTime: Date;            // start time
    endTime: Date;              // end time
    name: string;               // sprint name
    path: string;               // sprint path
    url: string;                // 
    Planing: PlaningBar;
    States: StatesBar;
    constructor(Itteration: TeamSettingsIteration){
        this.Planing = new PlaningBar();
        this.States = new StatesBar();
        this.id = Itteration.id;                 // sprint ID
        this.startTime = Itteration.attributes.startDate;            // start time
        this.endTime= Itteration.attributes.finishDate;             // end time
        this.name= Itteration.name;               // sprint name
        this.path= Itteration.path;               // sprint path
        this.url= Itteration.url;                 //
    }
    AddNew(State:States,Plan:Planing){
        this.Planing.AddPlan(Plan);
        this.States.AddState(State);
    }
    Update(NewState:States){
        this.States.UpdateState(NewState);
    }
}
class PlaningBar {
    Planed: number;
    Posponed :number;
    constructor(){
        this.Posponed = 0;
        this.Planed = 0;
    }
    AddPlan(Plan:Planing){
        if (Plan==Planing.Planed){
            this.Planed+=1;
        }
        else{
            this.Posponed+=1;
        }
    }
}
class StatesBar {
    Closed: number;
    UnClosed :number;
    constructor(){
        this.UnClosed = 0;
        this.Closed = 0;
    }
    AddState(State: States){
        if (State==States.Closed){
            this.Closed+=1;
        }
        else{
            this.UnClosed+=1;
        }
    }
    UpdateState(NewState: States){
        if (NewState==States.Closed){
            this.Closed+=1;
            this.UnClosed-=1;
        }
        else{
            this.UnClosed+=1;
            this.Closed-=1;
        }
    }
}
export async function BuildViewModel2(AllItterations: TeamSettingsIteration[],FullWorkItemList: WorkItem[], Commited: string, EndStates: string[]){
    let ViewModel2: DataModel2 = new DataModel2(AllItterations,"Title");    
    for (const WorkItem of FullWorkItemList) {
        let WitPlaning: Planing = Planing.Planed;
        let WitStatus: States = States.New;
        let WitIttrationPath: string = "";
        let revisions: WorkItem[] = await WIClient.getRevisions(WorkItem.id,null,null,WorkItemExpand.Fields);        
        revisions.forEach(revision => {
            let RevIterationValue: string = revision.fields["System.IterationPath"];
            let RevState: string = revision.fields["System.State"];
            if (WitStatus==States.New){
                WitIttrationPath = RevIterationValue;
                if (RevState == Commited){
                    WitStatus = States.Commited;
                    ViewModel2.AddNewSpotIteration(RevIterationValue,WitStatus,WitPlaning);
                }
            }
            else if (WitStatus==States.Commited){
                if (RevIterationValue!=WitIttrationPath){
                    WitIttrationPath = RevIterationValue;
                    WitPlaning = Planing.Posponed;
                    ViewModel2.AddNewSpotIteration(RevIterationValue,WitStatus,WitPlaning);                    
                }
                EndStates.forEach(End => {
                    if (RevState == End){
                        WitStatus = States.Closed;
                        ViewModel2.UpdateState(RevIterationValue,WitStatus,WitPlaning);
                    }
                })
            }
            else if (WitStatus==States.Closed){ 

            }
        })
    }
    return ViewModel2;
}
export async function ShowViewMode21(DataModel2: DataModel2,Container: JQuery){   
    let series = [];
    let labels: string[] = [];    
    let Planed = [];
    let Posponed = [];
    let Closed = [];
    let UnClosed = [];
    Planed.push(0);
    Posponed.push(0);
    Closed.push(0);
    UnClosed.push(0);
    labels.push(""); 
    DataModel2.TwinsBar.forEach(Bars => {
        Planed.push(Bars.Planing.Planed);
        Posponed.push(Bars.Planing.Posponed);
        Closed.push(Bars.States.Closed);
        UnClosed.push(Bars.States.UnClosed);
        labels.push(Bars.name);
    }); 
    labels.push("");
    series.push(Serie(Planed,"Planed","Planing"));
    series.push(Serie(Posponed,"Posponed","Planing"));
    series.push(Serie(Closed,"Closed","State"));
    series.push(Serie(UnClosed,"UnClosed","State"));    
    ShowViewModel21(labels,series,Container,DataModel2.Title,DataModel2.Xasix,DataModel2.Yasix); 
}
function Serie(Data:any[],Name:string,Group: string){
    return {
        name:Name+"-"+Group,        //color: "",
        data: Data,        //customData: [],
        useSecondaryAxis: false,
        markerType: "diamond",
        markerRadius: 5,
        enableTooltip: true,
        stackGroup: Group  
    }
}
function ShowViewModel21(labels: string[],series:any[],$container: JQuery,ChartTitle: string,XTitle: string,YTitle:string){
    let legendd:LegendOptions = {
        enabled: true,    
        limitLabelSize: false, /** Opt-in option for restricting Legend label sizes. False by default.*/    
        rightAlign: false, /** Opt-in option for placing legend as a right aligned vertical stack. */     /** This option is maintained for legacy compat purposes only. */     /** The following options should be used henceforth: stackVertically */    
        stackVertically: false,  /** Opt-in option for placing legend as a vertical stack. False by default.*/    
        align: 'left' /** Opt-in option for alignment of the horizontal stack.*/     /** Valid values are: 'left', 'right', 'center' */    /** Note that this option is not supported if 'stackVertically' option is true.*/
    }
    let hostOption: ChartHostOptions = {
        height: 300,
        width: 600
    }  
    let toolTipOption: TooltipOptions = {
        enabled: true,
        onlyShowFocusedSeries: true        
    }
    let chartStackedColumnOptions: CommonChartOptions = {  
        title: ChartTitle,
        hostOptions: hostOption,
        tooltip: toolTipOption, 
        chartType: ChartTypesConstants.StackedColumn,
        colorCustomizationOptions: Colorize(),
        xAxis: {
            title: XTitle,
            canZoom: true,
            labelsEnabled: true,  
            suppressLabelTruncation: true,
            //renderToEdges: true,
            labelValues: labels,
            allowDecimals:false
        },
        yAxis: {
            title: YTitle,
            canZoom: true,
            labelsEnabled: true,  
            suppressLabelTruncation: true,
            allowDecimals:false,
            //renderToEdges: true
        },
        legend: legendd, 
        series: series,
        click: (clickeEvent: ClickEvent) => {
            DrillDown2();
        }
    }
    Services.ChartsService.getService().then((chartService) => {
        chartService.createChart($container, chartStackedColumnOptions);
    });
}
function DrillDown2(){
    
}