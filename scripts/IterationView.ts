import Services = require("Charts/Services");

import WorkItemClient = require("TFS/WorkItemTracking/RestClient");

import { TooltipOptions, CommonChartOptions, ChartTypesConstants, ClickEvent, LegendOptions, ChartHostOptions, ColorEntry, ColorCustomizationOptions } from "Charts/Contracts";

import { WorkItem, WorkItemExpand, Wiql } from "TFS/WorkItemTracking/Contracts";

import { TeamSettingsIteration } from "azure-devops-node-api/interfaces/WorkInterfaces";

import { Planing, FlowStates, SpotData, WorkItemExtra, ShowModal} from "./Common";

 

let WIClient = WorkItemClient.getClient();

 

export async function GetThinerQueryData(ProjectName: string,TeamName: string, MaxCallIds:number,FirstDate:Date,TeamAreaPaths: string,SelecctedWitsList: string,NewStates: string){

    let IdLists: number[][]=[];

    let IdList: number[] = [];

    let stringQuery = "SELECT [System.Id],[System.IterationPath],[System.AreaPath] FROM workitems Where [System.TeamProject] = \"" + ProjectName + "\" AND [System.AreaPath] IN (" + TeamAreaPaths + ") AND [System.State] NOT IN (" + NewStates  + ") AND [System.WorkItemType] IN (" + SelecctedWitsList + ") AND ([Microsoft.VSTS.Common.StateChangeDate] > \"" + FirstDate.toDateString() + "\" OR [Microsoft.VSTS.Common.IterationChangeDate] > \"" + FirstDate.toDateString() + "\")";

    let OpendWiql: Wiql = {'query':stringQuery};

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

            FullWorkItemList=FullWorkItemList.concat(WorkItemList);

        }

        else{

            FullWorkItemList=WorkItemList;

        }

    };      

    return FullWorkItemList;

}

export class DataModelICV {

    Xasix: string;

    Yasix: string;

    Title: string;

    IterationBars: IteratnDataBar[];  

    constructor(AllItterations: TeamSettingsIteration[],Title: string) {

        this.IterationBars = [];        

        this.Title = Title;

        AllItterations.forEach(Itteration => {

            let IterationBar:IteratnDataBar = new IteratnDataBar(Itteration);

            this.IterationBars.push(IterationBar);

        });

    }

    NewSpot(ItterationPath: string,Wit:WorkItemExtra,UpdateTime:Date,RevFlowState: FlowStates,WitDataSpot:SpotData){

        this.IterationBars.forEach(IterationBar => {

            if (IterationBar.path==ItterationPath)

            {

                if (WitDataSpot.Planing==null){

                    if (WitDataSpot.Commited){

                        if (UpdateTime<IterationBar.startTime){

                            WitDataSpot.Planing = Planing.Planed;

                        }

                        else{

                            WitDataSpot.Planing = Planing.Pushed;

                        }

                    }  

                    WitDataSpot.Commited=false;

                }                    

                Wit.Plan=WitDataSpot.Planing;        

                IterationBar.NewSpot(WitDataSpot.Planing,Wit,UpdateTime,RevFlowState);

            }

        });

    }

    UpdateSpot(ItterationPath: string,Wit:WorkItemExtra,WitData:SpotData,RevFlowState:FlowStates){

        this.IterationBars.forEach(IterationBar => {

            if (IterationBar.path==ItterationPath)

            {

                IterationBar.UpdateSpot(Wit,WitData.FlowStates,RevFlowState);

            }

        });

    }

}

class IteratnDataBar {    

    id: string;                 // sprint ID

    startTime: Date;            // start time

    endTime: Date;              // end time

    name: string;               // sprint name

    path: string;               // sprint path

    url: string;                //

    PlaningBar: PlaningDataBar;

    StatesBar: StatesDataBar;

    constructor(Itteration: TeamSettingsIteration){

        this.id = Itteration.id;                 // sprint ID

        this.startTime = Itteration.attributes.startDate;            // start time

        this.endTime= Itteration.attributes.finishDate;             // end time

        this.name= Itteration.name;               // sprint name

        this.path= Itteration.path;               // sprint path

        this.url= Itteration.url;                 //

        this.PlaningBar = new PlaningDataBar(this.startTime);

        this.StatesBar = new StatesDataBar();

    }

    NewSpot(RevPlaning:Planing,Wit:WorkItemExtra,UpdateTime:Date,RevFlowState:FlowStates){

        this.PlaningBar.NewPlaning(RevPlaning,Wit,UpdateTime);

        this.StatesBar.NewState(Wit,RevFlowState);

    }

    UpdateSpot(Wit:WorkItemExtra,WitFlowState:FlowStates,RevFlowState:FlowStates){

        this.StatesBar.UpdateState(Wit,RevFlowState,WitFlowState);

    }

}

class PlaningDataBar {

    Planed: number;

    Posponed :number;

    Pushed: number;

    Wits:WorkItemExtra[];

    StartDate:Date;

    constructor(StartDate:Date){

        this.Posponed = 0;

        this.Planed = 0;

        this.Pushed = 0;

        this.Wits=[];

        this.StartDate=StartDate;

    }  

    NewPlaning(Plan:Planing,WIT:WorkItemExtra,UpdateTime:Date){

        let IsNew=true;

        this.Wits.forEach(myWit => {

            if(myWit.Id==WIT.Id){

                IsNew=false;

                myWit.Wit=WIT.Wit;

            }

        });

        if(IsNew){

            if (Plan==Planing.Planed){

                this.Planed+=1;

            }

            else if(Plan==Planing.Pushed){

                this.Pushed+=1;                

            }

            else if(Plan==Planing.Posponed){

                this.Posponed+=1;

            }  

            let newWit:WorkItemExtra = {Id:WIT.Id,Plan:WIT.Plan,State:WIT.State,Wit:WIT.Wit}

            this.Wits.push(newWit);

        }

    }

}

class StatesDataBar {

    Done: number;

    InProgress :number;

    Removed: number;

    Wits:WorkItemExtra[];

    constructor(){

        this.InProgress = 0;

        this.Done = 0;

        this.Removed =0;

        this.Wits=[];

    }

    NewState(WIT:WorkItemExtra,RevFlowState:FlowStates){

        let IsNew: boolean =true;

        this.Wits.forEach(MyWit => {

            if (WIT.Id==MyWit.Id){

                IsNew=false;

                MyWit.Wit=WIT.Wit;

            }

        });

        if (IsNew){

            let newWit:WorkItemExtra = {Id:WIT.Id,Plan:WIT.Plan,State:WIT.State,Wit:WIT.Wit}

            this.Wits.push(newWit);

            if (RevFlowState==FlowStates.Done){

                this.Done+=1;

            }

            else if (RevFlowState==FlowStates.InProgress){

                this.InProgress+=1;

            }

            else if (RevFlowState==FlowStates.Removed){

                this.Removed+=1;

            }

        }

    }    

    UpdateState(WIT:WorkItemExtra,RevFlowState:FlowStates,WitFlowState:FlowStates){

        let thisWit:WorkItemExtra;

        this.Wits.forEach(MyWit => {

            if (WIT.Id==MyWit.Id){

                if (WitFlowState==FlowStates.Done){

                    this.Done-=1;

                }

                else if (WitFlowState==FlowStates.InProgress){

                    this.InProgress-=1;

                }

                else if (WitFlowState==FlowStates.Removed){

                    this.Removed-=1;

                }  

                MyWit.Wit=WIT.Wit;

                thisWit=MyWit;

            }

        });

        if (RevFlowState==FlowStates.Done){

            this.Done+=1;

            thisWit.State=FlowStates.Done;

        }

        else if (RevFlowState==FlowStates.InProgress){

            this.InProgress+=1;

            thisWit.State=FlowStates.InProgress;

        }

        else if (RevFlowState==FlowStates.Removed){

            this.Removed+=1;

            thisWit.State=FlowStates.Removed;

        }

    }

}

export async function BuildViewICV(AllItterations: TeamSettingsIteration[],FullWorkItemList: WorkItem[],NewStates: string[], InProgressStates: string[], DoneStates: string[], RemoveStates: string[], ItterationPats: string[]){

    let ViewModel: DataModelICV = new DataModelICV(AllItterations,"Title");    

    for (const WorkItem of FullWorkItemList) {

        if (true){  

            let WitDataSpot:SpotData = new SpotData();      

            let revisions: WorkItem[] = await WIClient.getRevisions(WorkItem.id,null,null,WorkItemExpand.Fields);        

            revisions.forEach(revision => {

                let RevState: string = revision.fields["System.State"];

                let RevFlowState:FlowStates;

                let RevUpdateTime: Date = revision.fields["System.RevisedDate"];                

                let RevIttrationPath: string = revision.fields["System.IterationPath"];

                if(CheckState(RevState,NewStates)){    

                   RevFlowState=FlowStates.New;                

                }

                else if (CheckState(RevState,InProgressStates)){

                    RevFlowState = FlowStates.InProgress;

                }

                else if (CheckState(RevState,DoneStates)){

                    RevFlowState = FlowStates.Done;

                }

                else if (CheckState(RevState,RemoveStates)){

                    RevFlowState = FlowStates.Removed;

                }

                let RevWit:WorkItemExtra = {Id:revision.id,Plan:null,State:RevFlowState,Wit:revision}

                HandleRev(ViewModel,WitDataSpot,RevFlowState,RevUpdateTime,RevIttrationPath,RevWit);

            })            

        }

    }

    return ViewModel;

}

function HandleRev(ViewModel: DataModelICV,WitDataSpot:SpotData,NewFlowState:FlowStates,RevUpdateTime: Date,NewIttrationPath: string,Wit:WorkItemExtra){

    if(WitDataSpot.FlowStates==null){   // first time

        if(NewFlowState!=FlowStates.New){

            WitDataSpot.Commited=true;

            ViewModel.NewSpot(NewIttrationPath,Wit,RevUpdateTime,NewFlowState,WitDataSpot); // create new

            WitDataSpot.FlowStates=NewFlowState;            

            WitDataSpot.WitIttrationPath=NewIttrationPath;

        }

    }

    else{

        if (WitDataSpot.WitIttrationPath!=NewIttrationPath){

            // New => as posponed

            WitDataSpot.WitIttrationPath=NewIttrationPath;

            WitDataSpot.Planing=Planing.Posponed;

            ViewModel.NewSpot(NewIttrationPath,Wit,RevUpdateTime,NewFlowState,WitDataSpot);

            Wit.State = WitDataSpot.FlowStates;

        }

        if (WitDataSpot.FlowStates==FlowStates.InProgress){    

            if (NewFlowState==FlowStates.New){

                // Back to new still think of it

            }

            else if(NewFlowState==FlowStates.InProgress){

                // do nothing

            }

            else if(NewFlowState==FlowStates.Done) {

                // update to done                

                ViewModel.UpdateSpot(NewIttrationPath,Wit,WitDataSpot,NewFlowState);

                WitDataSpot.FlowStates=NewFlowState;                

            }

            else if (NewFlowState==FlowStates.Removed){

                // update to removed                

                ViewModel.UpdateSpot(NewIttrationPath,Wit,WitDataSpot,NewFlowState);

                WitDataSpot.FlowStates=NewFlowState;

            }

            Wit.State=WitDataSpot.FlowStates;

        }

        else if (WitDataSpot.FlowStates==FlowStates.Done){

            if (NewFlowState==FlowStates.New){

                // Back to new still think of it

            }

            else if(NewFlowState==FlowStates.InProgress){

                // update to In progress (my be old iteration path)

            }

            else if(NewFlowState==FlowStates.Done) {

                // do nothing

            }

            else if (NewFlowState==FlowStates.Removed){

                // update to removed                

                ViewModel.UpdateSpot(NewIttrationPath,Wit,WitDataSpot,NewFlowState);

                WitDataSpot.FlowStates=NewFlowState;

            }

            Wit.State=WitDataSpot.FlowStates;

        }

        else if (WitDataSpot.FlowStates==FlowStates.Removed){

            if (NewFlowState==FlowStates.New){

                // Back to new ?!?

            }

            else if(NewFlowState==FlowStates.InProgress){

                // update to In progress (my be old iteration path)

            }

            else if(NewFlowState==FlowStates.Done) {

                // update to done                

                ViewModel.UpdateSpot(NewIttrationPath,Wit,WitDataSpot,NewFlowState);

                WitDataSpot.FlowStates=NewFlowState;

            }

            else if (NewFlowState==FlowStates.Removed){

                // do nothing

            }

            Wit.State=WitDataSpot.FlowStates;

        }

    }

}

export async function ShowViewICV(DataModel: DataModelICV,Container: JQuery){  

    let series = [];

    let labels: string[] = [];  

    let Planned = [];

    let Postponed = [];

    let Unplanned = [];

    let Completed = [];

    let Removed = [];

    let Incomplete = [];

    let PlanCustom=[];

    let StateCustom=[];

    DataModel.IterationBars.forEach(Bars => {

        PlanCustom.push(Bars.PlaningBar.Wits);

        StateCustom.push(Bars.StatesBar.Wits);

        Unplanned.push(Bars.PlaningBar.Pushed)

        Planned.push(Bars.PlaningBar.Planed);

        Postponed.push(Bars.PlaningBar.Posponed);

        Completed.push(Bars.StatesBar.Done);

        Incomplete.push(Bars.StatesBar.InProgress);

        Removed.push(Bars.StatesBar.Removed);

        labels.push(Bars.name);

    });

    labels.push("");

    series.push(Serie(Planned,"Planned","Planing",PlanCustom));

    series.push(Serie(Postponed,"Postponed","Planing",PlanCustom));

    series.push(Serie(Unplanned,"Unplanned","Planing",PlanCustom));

    series.push(Serie(Completed,"Completed","State",StateCustom));

    series.push(Serie(Incomplete,"Incomplete","State",StateCustom));    

    series.push(Serie(Removed,"Removed","State",StateCustom));    

    ShowChartICV(labels,series,Container,DataModel.Title,DataModel.Xasix,DataModel.Yasix,DataModel);

}

function Serie(Data:any[],Name:string,Group: string,Wits:WorkItem[][]){

    return {

        name: Name,         // + "-" + Group,        //color: "",

        data: Data,        //customData: [],

        useSecondaryAxis: false,

        markerType: "diamond",

        markerRadius: 5,

        enableTooltip: true,

        seriesCustomData: Wits,

        stackGroup: Group  

    }    

}

function ShowChartICV(labels: string[],series:any[],$container: JQuery,ChartTitle: string,XTitle: string,YTitle:string,ViewModel: DataModelICV){

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

        colorCustomizationOptions: ItterationColorize(),

        xAxis: {

            title: XTitle,

            canZoom: true,

            labelsEnabled: true,  

            suppressLabelTruncation: true,

            labelValues: labels,

            allowDecimals:false

        },

        yAxis: {

            title: YTitle,

            canZoom: true,

            labelsEnabled: true,  

            suppressLabelTruncation: true,

            allowDecimals:false,

        },

        legend: legendd,

        series: series,

        click: (clickeEvent: ClickEvent) => {

            DrillDownICV(clickeEvent,ViewModel);

        }

    }

    Services.ChartsService.getService().then((chartService) => {

        chartService.createChart($container, chartStackedColumnOptions);

    });

}

function CheckState(WitStatus: string,States: string[]){

    let founded=false;

    States.forEach(State => {

        if (WitStatus==State){

            founded= true;

        }

    });

    return founded;

}

function DrillDownICV(clickeEvent: ClickEvent,ViewModel: DataModelICV){

    let iterationView = ViewModel.IterationBars[clickeEvent.itemX];

    let Wits:WorkItem[]=[];

    // if (clickeEvent.seriesName=="Planed-Planing" || clickeEvent.seriesName=="Posponed-Planing" || clickeEvent.seriesName=="Pushed-Planing"){

    if (clickeEvent.seriesName=="Planned" || clickeEvent.seriesName=="Postponed" || clickeEvent.seriesName=="Unplanned"){

        iterationView.PlaningBar.Wits.forEach(Wit => {

            if ((Wit.Plan==Planing.Planed&&clickeEvent.seriesName=="Planned")||

                (Wit.Plan==Planing.Posponed&&clickeEvent.seriesName=="Postponed")||

                (Wit.Plan==Planing.Pushed&&clickeEvent.seriesName=="Unplanned")){

                Wits.push(Wit.Wit);

            }

        });

    }

    else{

        iterationView.StatesBar.Wits.forEach(Wit => {

            if ((Wit.State==FlowStates.Done&&clickeEvent.seriesName=="Completed")||

                (Wit.State==FlowStates.InProgress&&clickeEvent.seriesName=="Incomplete")||

                (Wit.State==FlowStates.Removed&&clickeEvent.seriesName=="Removed")){

                    Wits.push(Wit.Wit);

            }

        });

    }

    ShowModal(clickeEvent.labelName + " - " + clickeEvent.seriesName + " Total: " + clickeEvent.itemY,Wits);

}

export function ItterationColorize() {

 

    let colors: Array<ColorEntry> = new Array<ColorEntry>();

 

    colors.push({backgroundColor: 'Green',value: 'Done-State'});

    colors.push({backgroundColor: 'Green',value: 'Completed'});

    colors.push({backgroundColor: 'Red',value: 'UnDone-State'});

    colors.push({backgroundColor: 'Red',value: 'Incomplete'});

    colors.push({backgroundColor: 'Gray',value: 'Removed-State'});

    colors.push({backgroundColor: 'Gray',value: 'Removed'});

 

    colors.push({backgroundColor: 'Yellow',value: 'Posponed-Planing'});

    colors.push({backgroundColor: 'Yellow',value: 'Postponed'});

    colors.push({backgroundColor: 'Blue',value: 'Planned-Planing'});

    colors.push({backgroundColor: 'Blue',value: 'Planned'});

    colors.push({backgroundColor: 'Orange',value: 'Pushed-Planing'});

    colors.push({backgroundColor: 'Orange',value: 'Unplanned'});

   

    let colorize: ColorCustomizationOptions = {

        customColors: colors

    }

   

    return colorize;

}