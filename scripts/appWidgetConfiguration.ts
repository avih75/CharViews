import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

let WidgetConfigurationContext: any;

VSS.register("ChartViewsWidget.Configuration", function () {
    let $SeletModel = $("#ModelList");
    let $MonthsBack = $("#MonthsBack");
    let $MonthsForword = $("#MonthsForword");
    $MonthsForword.change((eventObject: JQueryEventObject) => {                
        UpdateConfigurations();
    });
    $SeletModel.change((eventObject: JQueryEventObject) => {                
        UpdateConfigurations();
    });
    $MonthsBack.change((eventObject: JQueryEventObject) => {                
        UpdateConfigurations();
    });
    return {
        load: function (widgetSettings, widgetConfigurationContext) {
            WidgetConfigurationContext = widgetConfigurationContext;
            let settings = JSON.parse(widgetSettings.customSettings.data);
            if (settings) {
                SetTheView(settings.model,settings.monthsBack,settings.monthsForword);
            }
            VSS.resize();
            return WidgetHelpers.WidgetStatusHelper.Success();
        },
        onSave: function () {
            var customSettings = {
                data: JSON.stringify({
                    model: $SeletModel.val(),
                    monthsBack: $MonthsBack.val(),
                    monthsForword: $MonthsForword.val()
                })
            };
            return WidgetHelpers.WidgetConfigurationSave.Valid(customSettings);
        }
    }
});

function SetTheView(model: string,monthsBack: string,monthsForword: string) {
    let $SeletModel = $("#ModelList"); 
    let $MonthsBack = $("#MonthsBack");
    let $MonthsForword = $("#MonthsForword");
    $SeletModel.val(model);
    $MonthsBack.val(monthsBack);
    $MonthsForword.val(monthsForword);
}
function UpdateConfigurations() {
    let $SeletModel = $("#ModelList");
    let $MonthsBack = $("#MonthsBack");
    let $MonthsForword = $("#MonthsForword");
    var customSettings = {
        data: JSON.stringify({
            model:  $SeletModel.val(),
            monthsBack: $MonthsBack.val(),
            monthsForword: $MonthsForword.val()
        })
    };
    var eventName = WidgetHelpers.WidgetEvent.ConfigurationChange;
    var eventArgs = WidgetHelpers.WidgetEvent.Args(customSettings);
    WidgetConfigurationContext.notify(eventName, eventArgs);
}