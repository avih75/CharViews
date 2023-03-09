import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers"); 
import WidgetClient = require("TFS/Dashboards/RestClient");
import WorkItemClient = require("TFS/WorkItemTracking/RestClient");
import WorkClient = require("TFS/Work/RestClient");
import CoretionClient = require("TFS/Core/RestClient");
import { Wiql } from "TFS/WorkItemTracking/Contracts";
import { TeamContext } from "TFS/Core/Contracts";
import { VssConnection, VssService } from "VSS/Service";
import { IterationWorkItems } from "TFS/Work/Contracts";

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