import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import { LoadConfigList } from "./storageHelper";

 

let WidgetConfigurationContext: any;

 

export class Settings{

    itterationBack: number;

    itterationForword: number;

    dataName: string;

}

VSS.register("ChartViewsWidget.Configuration", function () {    

    let $MonthsBack = $("#MonthsBack");

    let $MonthsForword = $("#MonthsForword");    

    let $DataName = $("#DataName");

    $MonthsForword.on('change',function () {                

        UpdateConfigurations();

    });

 

    $MonthsBack.on('change',function () {                

        UpdateConfigurations();

    });

 

    $DataName.on('change',function () {                

        UpdateConfigurations();

    });

    return {

        load: function (widgetSettings, widgetConfigurationContext) {

            WidgetConfigurationContext = widgetConfigurationContext;

            let settings:Settings = JSON.parse(widgetSettings.customSettings.data);

            if (settings) {

                if (!settings.itterationBack){

                    settings.itterationBack=5;

                }

                if (!settings.itterationForword){

                    settings.itterationForword=0;

                }

                SetTheView(settings);

                VSS.resize();

            }            

            return WidgetHelpers.WidgetStatusHelper.Success();

        },

        onSave: function () {

            let customSettings = {

                data: JSON.stringify({

                    itterationBack: $MonthsBack.val(),

                    itterationForword: $MonthsForword.val(),

                    dataName: $DataName.val()

                })

            };

            return WidgetHelpers.WidgetConfigurationSave.Valid(customSettings);

        }

    }

});

function SetTheView(settings: Settings) {

    let $MonthsBack = $("#MonthsBack");

    $MonthsBack.val(settings.itterationBack);

 

    let $MonthsForword = $("#MonthsForword");

    $MonthsForword.val(settings.itterationForword);

 

    let $DataName = $("#DataName");  

    LoadConfigList().then((configList)=>{

        if (configList.length>0){

            configList.forEach(config => {

                $DataName.append(new Option(config));  

            });

            if (settings.dataName!=null && settings.dataName!=""){

                $DataName.val(settings.dataName);

            }

            else{

                $DataName.val($("#DataName option:first").val());

            }

        }

        VSS.resize();

    })

    VSS.resize();

}

function UpdateConfigurations() {

    let $MonthsBack = $("#MonthsBack");

    let $MonthsForword = $("#MonthsForword");

    let $DataName = $("#DataName");

    let customSettings = {

        data: JSON.stringify({

            itterationBack: $MonthsBack.val(),

            itterationForword: $MonthsForword.val(),

            dataName: $DataName.val()

        })

    };

    let eventName = WidgetHelpers.WidgetEvent.ConfigurationChange;

    let eventArgs = WidgetHelpers.WidgetEvent.Args(customSettings);

    VSS.resize();

    WidgetConfigurationContext.notify(eventName, eventArgs);

}