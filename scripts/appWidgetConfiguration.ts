import { async } from "q";
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import WorkItemClient = require("TFS/WorkItemTracking/RestClient");

let WIClient = WorkItemClient.getClient();
let ProjectName = VSS.getWebContext().project.name;
let WidgetConfigurationContext: any;
let WorkItems: string[] = [];
export class Settings{
    mode: string;
    monthsBack: number;
    monthsForword: number;
    workItems: string[];
}

VSS.register("ChartViewsWidget.Configuration", function () {
    let $SeletMode = $("#ModeList");
    let $MonthsBack = $("#MonthsBack");
    let $MonthsForword = $("#MonthsForword");
    ;
    $MonthsForword.change((eventObject: JQueryEventObject) => {                
        UpdateConfigurations();
    });
    $SeletMode.change((eventObject: JQueryEventObject) => {                
        UpdateConfigurations();
    });
    $MonthsBack.change((eventObject: JQueryEventObject) => {                
        UpdateConfigurations();
    });
    return {
        load: function (widgetSettings, widgetConfigurationContext) {
            WidgetConfigurationContext = widgetConfigurationContext;
            let settings:Settings = JSON.parse(widgetSettings.customSettings.data);
            if (settings) {
                GetAlWits().then(()=>{
                    SetTheView(settings.mode,settings.monthsBack,settings.monthsForword,settings.workItems)
                    VSS.resize();
                });
            }            
            return WidgetHelpers.WidgetStatusHelper.Success();
        },
        onSave: function () {
            var customSettings = {
                data: JSON.stringify({
                    mode: $SeletMode.val(),
                    monthsBack: $MonthsBack.val(),
                    monthsForword: $MonthsForword.val(),
                    workItems: WorkItems
                })
            };
            return WidgetHelpers.WidgetConfigurationSave.Valid(customSettings);
        }
    }
});

function SetTheView(mode: string,monthsBack: number,monthsForword: number, workItems:string[]) {
    let $SeletMode = $("#ModeList"); 
    let $MonthsBack = $("#MonthsBack");
    let $MonthsForword = $("#MonthsForword");
    $SeletMode.val(mode);
    $MonthsBack.val(monthsBack);
    $MonthsForword.val(monthsForword);
    WorkItems = workItems;
    WorkItems.forEach(Wit => {
        $("#" + Wit + "-checkbox").attr('checked','true'); 
    });
}
function UpdateConfigurations() {
    let $SeletMode = $("#ModeList");
    let $MonthsBack = $("#MonthsBack");
    let $MonthsForword = $("#MonthsForword");
    var customSettings = {
        data: JSON.stringify({
            mode:  $SeletMode.val(),
            monthsBack: $MonthsBack.val(),
            monthsForword: $MonthsForword.val(),
            workItems: WorkItems
        })
    };
    var eventName = WidgetHelpers.WidgetEvent.ConfigurationChange;
    var eventArgs = WidgetHelpers.WidgetEvent.Args(customSettings);
    WidgetConfigurationContext.notify(eventName, eventArgs);
}
async function GetAlWits(){
    let Wits = $("#WitsList");
    await WIClient.getWorkItemTypes(ProjectName).then((WitsTypes)=>{
        WitsTypes.forEach(WitsType => {
            let WitLabel = $('<label>').append(WitsType.name);
            let WitCheckBox = $('<input type="checkbox">').attr({
                'id': WitsType.name + '-checkbox',
                'name': WitsType.name + '-checkbox',
                'value': WitsType.name,
                'checked': false
              }); 
            WitCheckBox.click(function(){
                WorkItems = []; 
                $('#WitsList input[type="checkbox"]:checked').each(function() {
                    WorkItems.push($(this).val());
                    UpdateConfigurations();
                });
            });
            WitLabel.append(WitCheckBox);
            Wits.append(WitLabel);
        });
    })
}