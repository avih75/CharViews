import Services = require("Charts/Services");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers"); 
import WidgetClient = require("TFS/Dashboards/RestClient");
import WorkItemClient = require("TFS/WorkItemTracking/RestClient");
import WorkClient = require("TFS/Work/RestClient");
import CoretionClient = require("TFS/Core/RestClient");
import { Wiql, WorkItemExpand, WorkItem } from "TFS/WorkItemTracking/Contracts";
import { TeamContext } from "TFS/Core/Contracts";
import { VssConnection, VssService } from "VSS/Service";
import { IterationWorkItems } from "TFS/Work/Contracts";
import { CommonChartOptions, ChartTypesConstants, ClickEvent, LegendOptions, TooltipOptions, ColorCustomizationOptions, ColorEntry } from "Charts/Contracts";

import witManager = require("TFS/WorkItemTracking/Services");

WidgetHelpers.IncludeWidgetStyles();
WidgetHelpers.IncludeWidgetConfigurationStyles();

let WIClient = WorkItemClient.getClient();
let WCClient = WidgetClient.getClient();
let WClient = WorkClient.getClient();
let CClient = CoretionClient.getClient();  


let TeamName = VSS.getWebContext().team.name;
let ProjectName = VSS.getWebContext().project.name;
let WorkItems: string[] = [];
let TeamDic = {};
let ItterationDic = {};
let ItterationId = {}; 

VSS.register("ChartViewsWidget", function () {
    let getQueryInfo = function (widgetSettings) {
        var settings = JSON.parse(widgetSettings.customSettings.data);
        let container = $("#ViewContainer");      
        container.empty();
        if (!settings) {            
            container.text("Sorry nothing to show, please configure a buttons");
            return WidgetHelpers.WidgetStatusHelper.Success();
        }
        else {                
            let TeamSelect = $("<select />");   
            let ItterationSelect = $("<select />"); 
            container.append(TeamSelect);         
            container.append(ItterationSelect);                
            TeamSelect.change((eventObject: JQueryEventObject) => ChangeTeam(TeamSelect,ItterationSelect));            
            ItterationSelect.change((eventObject: JQueryEventObject)=> ChangeItteration(settings,ItterationSelect.val(),TeamSelect.val()));
            GetAlWits();
            GetAllTeams(TeamSelect,ItterationSelect);        
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
function GetAlWits(){
    let Wits = $("#WitsList");
    WIClient.getWorkItemTypes(ProjectName).then((WitsTypes)=>{
        WitsTypes.forEach(WitsType => {
            let WitLabel = $('<label>').append(WitsType.name);
            let WitCheckBox = $('<input type="checkbox">').attr({
                'name': WitsType.name + '-checkbox',
                'value': WitsType.name,
                'checked': false
              }); 
            WitCheckBox.click(function(){
                WorkItems = []; 
                $('#WitsList input[type="checkbox"]:checked').each(function() {
                    WorkItems.push($(this).val());
                });
            });
            WitLabel.append(WitCheckBox);
            Wits.append(WitLabel);
        });
    })
}
function GetAllTeams(NewSelect,ItterationSelect){
    CClient.getAllTeams().then((TeamList)=>{
        TeamList.forEach(Team =>{
            if (Team.projectName==ProjectName){
                NewSelect.append(new Option(Team.name)); //NewSelect.append(new Option(Team.id));
                let teamContext: TeamContext = {"project": Team.projectName,"projectId": Team.projectId,"team": Team.name,"teamId": Team.id}
                TeamDic[Team.name]=teamContext;
            }
        });
    }).then(()=>{
        NewSelect.val(TeamName);
        ChangeTeam(NewSelect,ItterationSelect);
    }); 
} 
async function ChangeTeam(TeamSelect:JQuery,ItterationSelect:JQuery){ 
    ItterationDic = {};
    ItterationId = {};
    ItterationSelect.empty();
    let SelectedTeam = TeamSelect.val(); 
    let teamContext: TeamContext = TeamDic[SelectedTeam];
    let Itterations = await WClient.getTeamIterations(teamContext);
    let counter:number = 0;
    Itterations.forEach(itteration =>{
        ItterationSelect.append(new Option(itteration.name));        
        ItterationId[itteration.name]= counter;
        ItterationDic[itteration.name] = itteration;
        counter = counter +1;
    });   
    let Itteration = await WClient.getTeamIterations(teamContext,"Current");  
    ItterationSelect.val(Itteration[0].name);
}
function ChangeItteration(settings,Itteration,Team){
    let IttId = ItterationId[Itteration];  
    let Fmont:number = settings.monthsForword;
    let Bmont:number = settings.monthsBack;
    let Maxnum:number = IttId + Number(Fmont);
    let Minnum:number = IttId - Number(Bmont);
    let ItterationArray = []
    for (let Itte in ItterationDic)
    {
        let CheckId :Number = ItterationDic[Itte];
        if ( CheckId >= Minnum && CheckId <= Maxnum ){
            ItterationArray.push(ItterationDic[Itte]);
        }
    }
    MakeQuery(settings.model,ItterationArray,Itteration,Team).then((ViewModel)=>{
        ShowViewModel(ViewModel);
    });                          
} 
async function MakeQuery(SelecctModel,ItterationArray,Itteration,Team){  
    // build query
    let ItterationString = "";
    ItterationArray.forEach(itt => {       
        ItterationString = ItterationString + "'" + itt.path + "',";
    });
    ItterationString = ItterationString.slice(0,-1)
    let WorkItemsString = "";
    WorkItems.forEach(WorkItem => {
        WorkItemsString = WorkItemsString + "'" + WorkItem + "',";
    });
    WorkItemsString = WorkItemsString.slice(0,-1)
    let valval = "Test\\Sprint January";
    let wiql: Wiql = {'query' : "SELECT [System.Id],[System.WorkItemType],[System.Title],[System.State],[System.AreaPath],[System.IterationPath] FROM workitems Where [System.TeamProject] = '" + ProjectName + "' And [IterationPath] = '" + valval + "'"};  //+ ItterationString + ")" };// AND [System.WorkItemType] IN (" + WorkItemsString + ")"};
    // call query
    let WitsList = await WIClient.queryByWiql(wiql, "test",Team);
    // Get All work items with all data
    // WIClient.getWorkItems()
    // build Model
    return WitsList;
}
function ShowViewModel(ViewModel){
    // Clear
    // Generate the chart
}
function ShowViewModel2(selectedSuite: SumeSuite, $rightGraph: JQuery, title: string, colorize: ColorCustomizationOptions, isIsolate: boolean, projectName: string, palnId: number)
{
    let legend: LegendOptions = {
        enabled: false
    }
    let data: number[] = [
        selectedSuite.TotalPaused,
        selectedSuite.TotalBlocked,
        selectedSuite.TotalNotApplicable,
        selectedSuite.TotalPassed,
        selectedSuite.TotalFailed,
        selectedSuite.TotalInProgress,
        selectedSuite.TotalNotRun
    ]
    let chartPieOptions: CommonChartOptions = {
        "title": title,
        "suppressMargin": true,
        "legend": legend,
        suppressAnimation: true,
        hostOptions: { height: 250, width: 250 },
        "chartType": ChartTypesConstants.Pie,
        colorCustomizationOptions: colorize,
        "xAxis": {
            title: title,
            canZoom: true,
            labelsEnabled: false,
            labelValues: ["Paused", "Blocked", "Not Applicable", "Passed", "Failed", "In Progress", "Not Run"]
        },
        "series": [{
            data
        }],
        "click": (clickeEvent: ClickEvent) => {
            DrillDown();
        },
        "specializedOptions": {
            showLabels: true,
            size: "80%"
        },
    }
    Services.ChartsService.getService().then((chartService) => {
        chartService.createChart($rightGraph, chartPieOptions);
    });
}
function DrillDown(){

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