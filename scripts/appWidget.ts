import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers"); 
import WorkItemClient = require("TFS/WorkItemTracking/RestClient");
import WorkClient = require("TFS/Work/RestClient");
import CoretionClient = require("TFS/Core/RestClient");
import CollectionClient = require("TFS/Core/RestClient");

WidgetHelpers.IncludeWidgetStyles();
let WIClient = WorkItemClient.getClient();
let WClient = WorkClient.getClient();
let CClient = CoretionClient.getClient();
VSS.register("ChartViewsWidget", function () {
    let getQueryInfo = function (widgetSettings) {
        var settings = JSON.parse(widgetSettings.customSettings.data);
        let container = $('#View-container');
        if (!settings) {
            container.empty();
            container.text("Sorry nothing to show, please configure a buttons");
            return WidgetHelpers.WidgetStatusHelper.Success();
        }
        else {     
            let TeamSelect = $("<select />");            
            TeamSelect.change((eventObject: JQueryEventObject) =>{   
                let SelectedTeam = TeamSelect.val();                      
                WClient.getTeamIterations(SelectedTeam).then((Itterations)=>{
                    let ItterationSelect = $("<select />");
                    Itterations.forEach(itteration =>{
                        ItterationSelect.append(itteration.name);
                    })
                    ItterationSelect.change((eventObject: JQueryEventObject)=>{
                        MakeQuery(settings.model,settings.monthsBack,settings.monthsForword,ItterationSelect.val(),SelectedTeam.val()).then((ViewModel)=>{
                            ShowViewModel(ViewModel);
                        });                          
                    })
                    container.add(ItterationSelect);                   
                });
            });
            container.add(TeamSelect);
            GetAllTeams(TeamSelect);    
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
function GetAllTeams(newSelect){
    CClient.getAllTeams().then((TeamList)=>{
        TeamList.forEach(Team =>{
            newSelect.append(new Option(Team.name));
        })
    });
} 
async function MakeQuery(SelecctModel,MonthsBack,MonthsForword,Itteration,Team){
    // build query
    // call query
    // build Model
    return Object;
}
function ShowViewModel(ViewModel){
    // Clear
    // Generate the chart
}