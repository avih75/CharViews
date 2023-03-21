import Services = require("Charts/Services");

import WorkItemClient = require("TFS/WorkItemTracking/RestClient");

import { TooltipOptions, CommonChartOptions, ChartTypesConstants, ClickEvent, LegendOptions, ChartHostOptions } from "Charts/Contracts";

import { WorkItem, WorkItemExpand, Wiql } from "TFS/WorkItemTracking/Contracts";

import { TeamSettingsIteration } from "azure-devops-node-api/interfaces/WorkInterfaces";

import { StateModel, Colorize} from "./Common";

import { BarModel } from "./Mode1";
import { async } from "q";

 

let WIClient = WorkItemClient.getClient();

export enum Planing{
    Posponed,
    Planed    
}
export enum States{
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

export class TwinsBars {    
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
export class PlaningBar {
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

export class StatesBar {
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
    //FullWorkItemList.forEach(async WorkItem => {

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
    }///)
    return ViewModel2;
}

export async function ShowViewMode2(DataModel2: DataModel2,Container: JQuery){    

    let $Table = $("<table />");

    Container.append($Table);

    let $Tr = $("<tr />");

    DataModel2.TwinsBar.forEach(Bar => {

        let $td = $("<td />");      

        $Tr.append($td);

        ShowViewModel2(Bar,$td);

    });

    $Table.append($Tr);

}

export function ShowViewModel2(Bar: TwinsBars,$container: JQuery){
    let legendd:LegendOptions = {
        enabled: false
    }
    let hostOption: ChartHostOptions = {
        height: 250,
        width: 200
    }  
    let series = [];
    let Planed = {
        name: "Planed",
        data:[null,Bar.Planing.Planed,null,null]
    }
    let Posponed = {
         name: "Posponed",
         data: [null,Bar.Planing.Posponed,null,null]
    }
    let Commited = {
         name: "UnClosed",
         data: [null,null,Bar.States.UnClosed,null]
    }
    let Closed = {
         name: "Closed",
         data: [null,null,Bar.States.Closed,null]
    }
    series.push(Planed);
    series.push(Posponed);
    series.push(Commited);
    series.push(Closed); 
    let toolTipOption: TooltipOptions = {
        enabled: true,
        onlyShowFocusedSeries: false        
    }
    let labels: string[] = [];
    let chartStackedColumnOptions: CommonChartOptions = {  
        title: Bar.name,
        hostOptions: hostOption,
        tooltip: toolTipOption,
        //"chartType": CharType,
        chartType: ChartTypesConstants.StackedColumn,
        colorCustomizationOptions: Colorize(),
        xAxis: {
            title: Bar.name,
            canZoom: true,
            labelsEnabled: true,  
            suppressLabelTruncation: true,
            //labelValues: labels,
            renderToEdges: true,
            labelValues: ["", "Planing", "State", ""]
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
            DrillDown2();
        }
    }
    Services.ChartsService.getService().then((chartService) => {
        chartService.createChart($container, chartStackedColumnOptions);
    });
}

export function DrillDown2(){

 

}