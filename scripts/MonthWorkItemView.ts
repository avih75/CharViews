import Services = require("Charts/Services");

import WorkItemClient = require("TFS/WorkItemTracking/RestClient");

import { TooltipOptions, CommonChartOptions, ChartTypesConstants, ClickEvent, LegendOptions, ChartHostOptions, ColorEntry, ColorCustomizationOptions } from "Charts/Contracts";

import { WorkItem, WorkItemExpand, Wiql } from "TFS/WorkItemTracking/Contracts";

import { MonthTuple, ShowModal} from "./Common";

 

let WIClient = WorkItemClient.getClient();

 

export class MonthWits {

    Month:string;

    WitsOpend:WorkItem[]=[];

    WitsDraged:WorkItem[]=[];

    WitsFastClosed:WorkItem[]=[];  

    WitsDragedClosed:WorkItem[]=[];  

    WitsDragedRemoved:WorkItem[]=[];  

    WitsFastRemoved:WorkItem[]=[];  

    constructor(Month:string){

        this.Month=Month;

        this.WitsOpend=[];

        this.WitsDraged=[];  

        this.WitsFastClosed=[];

        this.WitsFastRemoved=[];

        this.WitsDragedClosed=[];

        this.WitsDragedRemoved=[];

    }

    AddNewWits(newWit:WorkItem){

        this.WitsOpend.push(newWit);

    }

    AddDragedWits(dragedWit:WorkItem){

        this.WitsDraged.push(dragedWit);

    }

    AddFastClosedWits(fastClosedWit:WorkItem){

        this.WitsFastClosed.push(fastClosedWit);

    }

    AddDragedClosedWits(dragedClosedWit:WorkItem){

        this.WitsDragedClosed.push(dragedClosedWit)

    }

    AddFastRemovedWits(fastRemovedWit:WorkItem){

        this.WitsFastRemoved.push(fastRemovedWit);

    }

    AddDragedRemoveWits(dragedRemovedWit:WorkItem){

        this.WitsDragedRemoved.push(dragedRemovedWit);

    }

}

export class MonthWitModel{

    MontTitle:String;

    MontDraged:number;

    MonthNew:number;

    MonthDone:number;

}

export async function GetMWQueryData(ProjectName: string,TeamName: string, MaxCallIds:number,MonthList:MonthTuple[],TeamAreaPaths: string,SelecctedWitsList: string, DoneStateList: string, RemoveStateList: string){

    let MonthsWits:MonthWits[]=[];

    for (const Month of MonthList) {

        let MWits:MonthWits = new MonthWits(Month.monthName) ;

        let baseQuery : string = "SELECT [System.Id] FROM workitems Where [System.TeamProject] = '" + ProjectName + "' AND [System.AreaPath] IN (" + TeamAreaPaths + ") AND [System.WorkItemType] IN (" + SelecctedWitsList + ") "  // [System.IterationPath],[System.AreaPath]  ////  

        // this time gap

        // create

        let NewWitsWiql:            Wiql = {'query' : baseQuery + "AND [System.CreatedDate] >= '" + Month.startDate.toDateString() + "' AND [System.CreatedDate] <= '" +  Month.endDate.toDateString() + "'"}  // new betwint dates

        MWits.WitsOpend = await GetWitList(NewWitsWiql,MaxCallIds,ProjectName,TeamName);

        // results

        let DoneFastWitsWiql:       Wiql = {'query' : baseQuery + "AND [System.State] IN (" + DoneStateList   + ") AND [System.CreatedDate] >= '" + Month.startDate.toDateString() + "' AND [Microsoft.VSTS.Common.ClosedDate] <= '" +  Month.endDate.toDateString() + "'"}

        MWits.WitsFastClosed = await GetWitList(DoneFastWitsWiql,MaxCallIds,ProjectName,TeamName);

        let RemoveFastWitsWiql:     Wiql = {'query' : baseQuery + "AND [System.State] IN (" + RemoveStateList + ") AND [System.CreatedDate] >= '" + Month.startDate.toDateString() + "' AND [Microsoft.VSTS.Common.ClosedDate] <= '" +  Month.endDate.toDateString() + "'"}

        MWits.WitsFastRemoved = await GetWitList(RemoveFastWitsWiql,MaxCallIds,ProjectName,TeamName);

        // befor this time gap

        // create

        let DragedWitsWiql:         Wiql = {'query' : baseQuery + "AND [System.CreatedDate] <  '" + Month.startDate.toDateString() + "' AND [Microsoft.VSTS.Common.ClosedDate] >  '" + Month.startDate.toDateString() + "'"};  //  ([System.State] NOT IN (" + DoneStateList + "," + RemoveStateList + ") OR  // )

        MWits.WitsDraged = await GetWitList(DragedWitsWiql,MaxCallIds,ProjectName,TeamName);

        let DragedWitsWiql2:        Wiql = {'query' : baseQuery + "AND [System.CreatedDate] <  '" + Month.startDate.toDateString() + "' AND [System.State] NOT IN (" + DoneStateList + "," + RemoveStateList + ")"};  //   OR  // )

        let moreWitsDraged = await GetWitList(DragedWitsWiql2,MaxCallIds,ProjectName,TeamName);

        MWits.WitsDraged.concat(moreWitsDraged);

        // result

        let DoneDragedWitsWiql:     Wiql = {'query' : baseQuery + "AND [System.State] IN (" + DoneStateList   + ") AND [System.CreatedDate] <  '" + Month.startDate.toDateString() + "' AND [Microsoft.VSTS.Common.ClosedDate] <= '" + Month.endDate.toDateString() + "' AND [Microsoft.VSTS.Common.ClosedDate] >= '" + Month.startDate.toDateString() + "'"}

        MWits.WitsDragedClosed = await GetWitList(DoneDragedWitsWiql,MaxCallIds,ProjectName,TeamName);

        let RemoveDragedWitsWiql:   Wiql = {'query' : baseQuery + "AND [System.State] IN (" + RemoveStateList + ") AND [System.CreatedDate] <  '" + Month.startDate.toDateString() + "' AND [Microsoft.VSTS.Common.ClosedDate] <= '" + Month.endDate.toDateString() + "' AND [Microsoft.VSTS.Common.ClosedDate] >= '" + Month.startDate.toDateString() + "'"}

        MWits.WitsDragedRemoved = await GetWitList(RemoveDragedWitsWiql,MaxCallIds,ProjectName,TeamName);        

 

        MonthsWits.push(MWits);

    };    

    return MonthsWits;

}

export async function GetWitList(OpendWiql: Wiql, MaxCallIds:number, ProjectName: string,TeamName: string){

    let IdLists: number[][]=[];

    let IdList: number[] = [];

    let WitsList = await WIClient.queryByWiql(OpendWiql, ProjectName,TeamName);

    WitsList.workItems.forEach(wit => {        

        if (IdList.length==MaxCallIds)

        {

            IdLists.push(IdList);

            IdList = [];

        }

        IdList.push(wit.id);

    });

    if(IdList.length>0){

        IdLists.push(IdList);

    }    

    let FullWorkItemList: WorkItem[]=[];    

    for (const Ids of IdLists) {

        if (Ids.length>0){

            let WorkItemList = await WIClient.getWorkItems(Ids, null, null, WorkItemExpand.Fields);

            if (FullWorkItemList){

                FullWorkItemList=FullWorkItemList.concat(WorkItemList);

            }

            else{

                FullWorkItemList=WorkItemList;

            }

        }

    };    

    return FullWorkItemList;

}

export async function ShowWitListViewMode(YTitle:string,XTitle: string,Title: string,MontshWits: MonthWits[],Container: JQuery){      

    let series = [];

    let labels: string[] = [];  

    let DoneFast = [];

    let RemoveFast = [];

    let DoneDraged = [];

    let RemoveDraged = [];

    let Draged = [];

    let New = [];

    MontshWits.forEach(MonthWits => {

        labels.push(MonthWits.Month);

        Draged.push(MonthWits.WitsDraged.length);

        DoneFast.push(MonthWits.WitsFastClosed.length);

        New.push(MonthWits.WitsOpend.length);

        DoneDraged.push(MonthWits.WitsDragedClosed.length);

        RemoveFast.push(MonthWits.WitsFastRemoved.length);

        RemoveDraged.push(MonthWits.WitsDragedRemoved.length);

    });

    labels.push("");

    series.push(Serie(Draged,"Draged","Left"));

    series.push(Serie(New,"New","Left"));

    series.push(Serie(DoneFast,"DoneFast","Right"));

    series.push(Serie(DoneDraged,"DoneDraged","Right"));

    series.push(Serie(RemoveFast,"RemoveFast","Right"));

    series.push(Serie(RemoveDraged,"RemoveDraged","Right"));

    ShowChartMWCV(labels,series,Container,Title,XTitle,YTitle,MontshWits);

}

function Serie(Data:any[],Name:string,Group: string){

    return {

        name: Name,        

        data: Data,        

        useSecondaryAxis: false,

        markerType: "diamond",

        markerRadius: 5,

        enableTooltip: true,

        stackGroup: Group  

    }    

}

function ShowChartMWCV(labels: string[],series:any[],$container: JQuery,ChartTitle: string,XTitle: string,YTitle:string,MontshWits: MonthWits[]){

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

        colorCustomizationOptions: MonthColorize(),

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

            DrillDownMWCV(clickeEvent,MontshWits);

        }

    }

    Services.ChartsService.getService().then((chartService) => {

        chartService.createChart($container, chartStackedColumnOptions);

    });

}

function DrillDownMWCV(clickeEvent: ClickEvent,MontshWits: MonthWits[]){

    let MonthView = MontshWits[clickeEvent.itemX];

    let Wits:WorkItem[]=[];

    if (clickeEvent.seriesName=="New"){//} || ){

        MonthView.WitsOpend.forEach(Wit => {

            Wits.push(Wit);

        });

    }

    else if (clickeEvent.seriesName=="Draged")

    {

        MonthView.WitsDraged.forEach(Wit => {

            Wits.push(Wit);

        });

    }

    else if (clickeEvent.seriesName=="DoneDraged"){

        MonthView.WitsDragedClosed.forEach(Wit => {

            Wits.push(Wit);

        });

    }

    else {

        MonthView.WitsFastClosed.forEach(Wit => {

            Wits.push(Wit);

        });

    }

    ShowModal(clickeEvent.labelName + " - " + clickeEvent.seriesName + " Total: " + clickeEvent.itemY,Wits);

}

export function MonthColorize() {

 

    let colors: Array<ColorEntry> = new Array<ColorEntry>();

 

    colors.push({backgroundColor: 'Red',value: 'Draged'});

    colors.push({backgroundColor: 'Yellow',value: 'New'});

    colors.push({backgroundColor: 'Green',value: 'DoneFast'});

    colors.push({backgroundColor: 'Blue',value: 'DoneDraged'});

    colors.push({backgroundColor: 'Gray',value: 'RemoveDraged'});

    colors.push({backgroundColor: 'Pink',value: 'RemoveFast'});

   

    let colorize: ColorCustomizationOptions = {

        customColors: colors

    }

   

    return colorize;

}