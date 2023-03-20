import Services = require("Charts/Services");

import WorkItemClient = require("TFS/WorkItemTracking/RestClient");

import { TooltipOptions, CommonChartOptions, ChartTypesConstants, ClickEvent, LegendOptions, ChartHostOptions } from "Charts/Contracts";

import { WorkItem, WorkItemExpand, Wiql } from "TFS/WorkItemTracking/Contracts";

import { TeamSettingsIteration } from "azure-devops-node-api/interfaces/WorkInterfaces";

import { StateModel, SpotLocation, SpotState, Colorize} from "./Common";

 

let WIClient = WorkItemClient.getClient();

 

export class DataModel1 {

    ItterationData: ItterationData1[];

    AllItterations: TeamSettingsIteration[];

    constructor(AllItterations: TeamSettingsIteration[]) {

        this.AllItterations = AllItterations;

        this.ItterationData = [];

        this.AllItterations.forEach(Itteration => {

            let ItterationView:ItterationData1 = new ItterationData1(Itteration);

            this.ItterationData.push(ItterationView);

        });

    }

    NewSpot(WorkItemIterationValue: string,FolowState: SpotLocation, RevState: SpotState,WitId: number,WitTitle: string){

        this.ItterationData.forEach(Itteration => {        

            if (Itteration.path==WorkItemIterationValue)

            {

                Itteration.NewSpot(FolowState, RevState, WitId,WitTitle)

            }

        });  

    }

    UpdateSpotState(WorkItemIterationValue: string,FolowState: SpotLocation, WitState: SpotState, RevState: SpotState,WitId: number,WitTitle: string){

        this.ItterationData.forEach(Itteration => {

            if (Itteration.path==WorkItemIterationValue)

            {

                Itteration.UpdateSpotState(FolowState,WitState,RevState,WitId,WitTitle);

            }

        });

    }

    RemoveSpot(RevIterationValue: string,WitId: string){

        // remove

    }

}

export class ItterationData1{  

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

    NewSpot(FolowState: SpotLocation, SptState: SpotState,WitId: number,WitTitle: string){

        if (FolowState==SpotLocation.Fresh){

            this.planed.NewSpot(SptState,WitId,WitTitle);

        }

        else if (FolowState==SpotLocation.Trailing){

            this.postPoned.NewSpot(SptState,WitId,WitTitle);

        }

    }

    UpdateSpotState(FolowState: SpotLocation,WitState: SpotState,RevState: SpotState,WitId: number,WitTitle: string){

        if (FolowState == SpotLocation.Fresh){

            this.planed.UpdateSpotState(WitState,RevState,WitId,WitTitle);

        }

        else{

            this.postPoned.UpdateSpotState(WitState,RevState,WitId,WitTitle);

        }        

    }  

    RemoveSpot(){

        // remove

    }

}

export class BarModel {

    constructor() {

        this.Total = 0;

        this.Closed = new StateModel();

        this.OnGoing = new StateModel();

        this.new = new StateModel();

        this.Cancle = new StateModel();

        this.Postponed = new StateModel();

        this.Commited = new StateModel();

    }

    Total: number;         // Wits counter

    Closed: StateModel;      // done success

    OnGoing: StateModel;   // any state else

    new: StateModel;        // not started

    Postponed: StateModel;   // any state else

    Cancle: StateModel;        // not started

    Commited: StateModel;

    NewSpot(RevState: SpotState,WitId: number,WitTitle: string){

        switch(RevState){

            case SpotState.New:{

                this.new.NewSpot(WitId,WitTitle);

                break;

            }

            case SpotState.Cancle:{

                this.Cancle.NewSpot(WitId,WitTitle);

                break;

            }

            case SpotState.Closed:{

                this.Closed.NewSpot(WitId,WitTitle);

                break;

            }

            case SpotState.Postponed:{

                this.Postponed.NewSpot(WitId,WitTitle);

                break;

            }

            case SpotState.OnGoing:{

                this.OnGoing.NewSpot(WitId,WitTitle);

                break;

            }

            case SpotState.Commited:{

                this.Commited.NewSpot(WitId,WitTitle);

                break;

            }

        }

        this.Total+=1;

    }

    UpdateSpotState(WitState: SpotState,RevState: SpotState,WitId: number,WitTitle: string){

        switch(WitState){

            case SpotState.New:{

                this.new.RemoveSpot(WitId,WitTitle);

                break;

            }

            case SpotState.Cancle:{

                this.Cancle.RemoveSpot(WitId,WitTitle);

                break;

            }

            case SpotState.Closed:{

                this.Closed.RemoveSpot(WitId,WitTitle);

                break;

            }

            case SpotState.Postponed:{

                this.Postponed.RemoveSpot(WitId,WitTitle);

                break;

            }

            case SpotState.OnGoing:{

                this.OnGoing.RemoveSpot(WitId,WitTitle);

                break;

            }

            case SpotState.Commited:{

                this.Commited.RemoveSpot(WitId,WitTitle);

                break;

            }

        }

        this.Total-=1;

        this.NewSpot(RevState,WitId,WitTitle);

    }  

    RemoveSpot(){

        // remove

        this.Total-=1;

    }

}

export async function GetViewModeData1(ProjectName: string,TeamName: string, MaxCallIds:number,FirstDate:Date,DoneStates: string,SelecctedWitsList: string){

    let DuplicateCheck: number[]=[];  

    let IdLists: number[][]=[];

    let IdList: number[] = [];

    let OpendWiql: Wiql = {'query' : "SELECT [System.Id],[System.IterationPath],[System.AreaPath] FROM workitems Where [System.TeamProject] = '" + ProjectName + "' AND [System.WorkItemType] IN (" + SelecctedWitsList + ") And [System.State] NOT IN (" + DoneStates + ")"};

    let WitsList = await WIClient.queryByWiql(OpendWiql, ProjectName,TeamName);

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

    let CloseddWiql: Wiql = {'query' : "SELECT [System.Id],[System.IterationPath],[System.AreaPath]  FROM workitems Where [System.TeamProject] = '" + ProjectName + "' AND [System.WorkItemType] IN (" + SelecctedWitsList + ") And [System.State] IN (" + DoneStates + ") AND [System.ChangedDate] > '" + FirstDate.toDateString() + "'"}; // Add last update is smaller then smalest date

    WitsList = await WIClient.queryByWiql(CloseddWiql, ProjectName,TeamName);

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

    return FullWorkItemList;

}

export function BuildViewModel1(AllItterations: TeamSettingsIteration[],FullWorkItemList: WorkItem[],Commited: string,OnGoing: string[],EndStates: string[]){

    let ViewModel1: DataModel1 = new DataModel1(AllItterations);

    FullWorkItemList.forEach(async WorkItem => {

        let FolowState: SpotLocation = SpotLocation.Fresh; // 0 - new / 1 - Commited / 2 - OnGoing / 3 - Closed / 4 - Postponed / 5 - Cancle

        let WorkItemIterationValue: string;

        let WorkItemState: SpotState = SpotState.New;;

        let ChangeToCommit: Date;

        let ChangeToOnGoing: Date;

        let ChangeToDone: Date;

        let revisions: WorkItem[] = await WIClient.getRevisions(WorkItem.id,null,null,WorkItemExpand.Fields);

        revisions.forEach(revision => {

            let RevIterationValue: string = revision.fields["System.IterationPath"];

            let RevChangedDate :Date = revision.fields["System.ChangedDate"];

            let RevState: string = revision.fields["System.State"];

            let Title: string = revision.fields["System.Title"];

            if (WorkItemState == SpotState.New){                          

                if (RevState == Commited){ // changed to appeoved => mean planed

                    ChangeToCommit = RevChangedDate;    

                    ViewModel1.NewSpot(RevIterationValue, FolowState, SpotState.Commited, revision.id, Title);                                            

                    WorkItemState = SpotState.Commited;

                    WorkItemIterationValue = RevIterationValue;

                }

            }

            else if (WorkItemState == SpotState.Commited){

                if (WorkItemIterationValue != RevIterationValue){

                    if (false){ // check if the change made in one day or previuse itteration

                        // remove from last show

                        // add to new planed

                    }

                    else{                        

                        ViewModel1.UpdateSpotState(WorkItemIterationValue,FolowState,WorkItemState,SpotState.Postponed,revision.id,Title);

                        FolowState = SpotLocation.Trailing;

                        WorkItemIterationValue = RevIterationValue;

                        ViewModel1.NewSpot(RevIterationValue, FolowState, SpotState.Commited, revision.id, Title);

                    }

                }

                else{

                    OnGoing.forEach(Going => {

                        if (RevState == Going){

                            ViewModel1.UpdateSpotState(WorkItemIterationValue,FolowState,WorkItemState,SpotState.OnGoing,revision.id,Title);                            

                            WorkItemState = SpotState.OnGoing;

                            ChangeToOnGoing = RevChangedDate;  

                        }

                    })

                    EndStates.forEach(End => {

                        if (RevState == End){

                            ViewModel1.UpdateSpotState(WorkItemIterationValue,FolowState,WorkItemState,SpotState.Closed,revision.id,Title);                            

                            WorkItemState = SpotState.Closed;

                            ChangeToDone = RevChangedDate;  

                        }

                    })

                }

            }

            else if (WorkItemState == SpotState.OnGoing){

                if (WorkItemIterationValue != RevIterationValue){

                    if (false){ // check if the change made in one day or previuse itteration

                        // remove from last show

                        // add to new planed

                    }

                    else{

                        ViewModel1.UpdateSpotState(WorkItemIterationValue,FolowState,WorkItemState,SpotState.Postponed,revision.id,Title);

                        FolowState = SpotLocation.Trailing;

                        WorkItemIterationValue = RevIterationValue;

                        ViewModel1.NewSpot(RevIterationValue, FolowState, SpotState.Commited, revision.id, Title);

                    }

                }

                else {

                    EndStates.forEach(End => {

                        if (RevState == End){

                            ViewModel1.UpdateSpotState(WorkItemIterationValue,FolowState,WorkItemState,SpotState.Closed,revision.id,Title);                            

                            WorkItemState = SpotState.Closed;

                            ChangeToDone = RevChangedDate;  

                        }

                    })              

                }

            }

            else if (WorkItemState == SpotState.Closed){

                // check if reopen

            }

        });

    });

    return ViewModel1;

}

export async function ShowViewMode1(DataModel1: DataModel1,Container: JQuery){    

    let $Table = $("<table />");

    Container.append($Table);

    let $Tr = $("<tr />");

    DataModel1.ItterationData.forEach(ItterationData => {

        let $td = $("<td />");      

        $Tr.append($td);

        ShowViewModel1(ItterationData,$td);

    });

    $Table.append($Tr);

}

export function ShowViewModel1(ItterationData: ItterationData1,$td: JQuery){

    let legendd:LegendOptions = {

        enabled: false

    }

    let hostOption: ChartHostOptions = {

        height: 250,

        width: 200

    }  

    let series = [];

    let Commited = {

        name: "Commited",

        data: [

            [ItterationData.planed.Commited.Total,ItterationData.postPoned.Commited.Total]

        ]

    }

    let Done = {

        name: "Done",

        data: [

            [ItterationData.planed.Closed.Total,ItterationData.postPoned.Closed.Total]

        ]

    }

    let Progress = {

        name: "In Progress",

        data: [

            [ItterationData.planed.OnGoing.Total,ItterationData.postPoned.OnGoing.Total]

        ]

    }

    let Posponed = {

        name: "Pospone",

        data: [

            [ItterationData.planed.Postponed.Total,ItterationData.postPoned.Postponed.Total]

        ]

    }    

    let Cancle = {

        name: "Cancle",

        data: [

            [ItterationData.planed.Cancle.Total,ItterationData.postPoned.Cancle.Total]

        ]

    }

    series.push(Done);

    series.push(Progress);

    series.push(Posponed);

    series.push(Cancle);

    series.push(Commited);

 

    let toolTipOption: TooltipOptions = {

        enabled: true,

        onlyShowFocusedSeries: false        

    }

    let labels = [

        "",

        "Fresh",

        "Trailing",        

        ""

    ]

    let chartStackedColumnOptions: CommonChartOptions = {  

        title: ItterationData.name,

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

export function DrillDown1(){

 

}