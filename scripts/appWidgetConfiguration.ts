import { async } from "q";
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import { WorkItemClassificationNode, WorkItemStateColor } from "TFS/WorkItemTracking/Contracts";
import WorkItemClient = require("TFS/WorkItemTracking/RestClient");
import CoreClient = require("TFS/Core/RestClient");
import WorkClient = require("TFS/Work/RestClient");
import { TeamContext } from "TFS/Core/Contracts";

let WIClient = WorkItemClient.getClient();
let WClient = WorkClient.getClient();
let CClient = CoreClient.getClient();  
let ProjectName = VSS.getWebContext().project.name;
let MyTeamContext: TeamContext;
let WidgetConfigurationContext: any;
let WorkItems: string[] = [];
let AreaPathList: WorkItemClassificationNode[]= [];
let EndStateList: string[] = [];
let OnGoingStateList: string[] = [];
let CommitState:string="";
export class Settings{
    mode: string;
    monthsBack: number;
    monthsForword: number;
    workItems: string[];
    areaPaths: string[];
    endStateList:string[];
    onGoingStateList:string[];
    commitState: string;
}
VSS.register("ChartViewsWidget.Configuration", function () {
    let $SeletMode = $("#ModeList");
    let $MonthsBack = $("#MonthsBack");
    let $MonthsForword = $("#MonthsForword");
    let $CommitState = $("#CommitState");
    let $OnGoingStateList = $("#OnGoingStateList");
    let $EndStateList = $("#EndStateList");
    let $WitsList = $("#WitsList");
    let $AreaPaths = $("#AreaPaths");
    $WitsList.change((eventObject: JQueryEventObject) => {                
        UpdateConfigurations();
    });
    $AreaPaths.change((eventObject: JQueryEventObject) => {                
        UpdateConfigurations();
    });
    $MonthsForword.change((eventObject: JQueryEventObject) => {                
        UpdateConfigurations();
    });
    $SeletMode.change((eventObject: JQueryEventObject) => {                
        UpdateConfigurations();
    });
    $MonthsBack.change((eventObject: JQueryEventObject) => {                
        UpdateConfigurations();
    });
    $CommitState.change((eventObject: JQueryEventObject) => {                
        UpdateConfigurations();
    });
    $OnGoingStateList.change((eventObject: JQueryEventObject) => {                
        UpdateConfigurations();
    });
    $EndStateList.change((eventObject: JQueryEventObject) => {                
        UpdateConfigurations();
    });
    return {
        load: function (widgetSettings, widgetConfigurationContext) {
            WidgetConfigurationContext = widgetConfigurationContext;
            let settings:Settings = JSON.parse(widgetSettings.customSettings.data);
            if (settings) {
                GetAlWits().then(()=>{
                    if (!settings.monthsBack){
                        settings.monthsBack=0;
                    }
                    if (!settings.monthsForword){
                        settings.monthsForword=0;
                    }
                    SetTheView(settings);
                    VSS.resize();
                });
            }            
            return WidgetHelpers.WidgetStatusHelper.Success();
        },
        onSave: function () {
            let customSettings = {
                data: JSON.stringify({
                    mode: $SeletMode.val(),
                    monthsBack: $MonthsBack.val(),
                    monthsForword: $MonthsForword.val(),
                    commitState: $CommitState.val(),
                    workItems: WorkItems,
                    endStateList: EndStateList,
                    onGoingStateList: OnGoingStateList,                    
                    areaPaths: AreaPathList
                })
            };
            return WidgetHelpers.WidgetConfigurationSave.Valid(customSettings);
        }
    }
});
function SetTheView(settings: Settings) {
    let $CommitState = $("#CommitState");    
    $CommitState.val(settings.commitState);

    let $SeletMode = $("#ModeList"); 
    $SeletMode.val(settings.mode);

    let $MonthsBack = $("#MonthsBack");
    $MonthsBack.val(settings.monthsBack);

    let $MonthsForword = $("#MonthsForword");
    $MonthsForword.val(settings.monthsForword);

    WorkItems = settings.workItems;
    WorkItems.forEach(Wit => {
        $("#" + Wit + "-wit-checkbox").attr('checked','true'); 
    });

    EndStateList = settings.endStateList;
    EndStateList.forEach(EndState => {
        $("#" + EndState + "-end-checkbox").attr('checked','true'); 
    });
    
    OnGoingStateList = settings.onGoingStateList;
    OnGoingStateList.forEach(OnGoingState => {
        $("#" + OnGoingState + "-ongoing-checkbox").attr('checked','true'); 
    });

    // AreaPathList = settings.areaPaths;
    // AreaPathList.forEach(AreaPath => {
    //     $("#" + AreaPath + "-area-checkbox").attr('checked','true'); 
    // });

    VSS.resize();
}
function UpdateConfigurations() {
    let $SeletMode = $("#ModeList");
    let $MonthsBack = $("#MonthsBack");
    let $MonthsForword = $("#MonthsForword");
    let $CommitState = $("#CommitState");
    let customSettings = {
        data: JSON.stringify({
            mode:  $SeletMode.val(),
            monthsBack: $MonthsBack.val(),
            monthsForword: $MonthsForword.val(),
            commitState: $CommitState.val(),
            workItems: WorkItems,
            endStateList: EndStateList,
            onGoingStateList: OnGoingStateList,
            areaPaths: AreaPathList
        })
    };
    let eventName = WidgetHelpers.WidgetEvent.ConfigurationChange;
    let eventArgs = WidgetHelpers.WidgetEvent.Args(customSettings);
    VSS.resize();
    WidgetConfigurationContext.notify(eventName, eventArgs);
}
async function GetAlWits(){
    let StateList: string[] = [];
    let Wits = $("#WitsList");
    let AreaPaths = $("#AreaPaths");
    let EndStateListChecks = $("#EndStateList");
    let OnGoingStateListChecks = $("#OnGoingStateList");
    let CommitState = $("#CommitState");    
    await WIClient.getWorkItemTypes(ProjectName).then(async (WitsTypes)=>{
        for (const WitsType of WitsTypes){
            await WIClient.getWorkItemTypeStates(ProjectName,WitsType.name).then((WorkItemStates:WorkItemStateColor[])=>{
                WorkItemStates.forEach(WorkItemState => {
                    if (StateList.lastIndexOf(WorkItemState.name)<0){
                        StateList.push(WorkItemState.name);
                    }
                });                
            })
            let WitLabel = $('<label>').append(WitsType.name);
            let WitCheckBox = $('<input type="checkbox">').attr({
                'id': WitsType.name + '-wit-checkbox',
                'name': WitsType.name + '-wit-checkbox',
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
        };
        StateList.forEach(state => {
            let EndStateLabel = $('<label>').append(state);
            let EndSateCheckBox = $('<input type="checkbox">').attr({
                'id': state + '-end-checkbox',
                'name': state + '-end-checkbox',
                'value': state,
                'checked': false
              }); 
              EndSateCheckBox.click(function(){
                EndStateList = []; 
                $('#EndStateList input[type="checkbox"]:checked').each(function() {
                    EndStateList.push($(this).val());
                    UpdateConfigurations();
                });
            });
            EndStateLabel.append(EndSateCheckBox);
            EndStateListChecks.append(EndStateLabel);  

            let OnGoingStateLabel = $('<label>').append(state);
            let OnGoingSateCheckBox = $('<input type="checkbox">').attr({
                'id': state + '-ongoing-checkbox',
                'name': state + '-ongoing-checkbox',
                'value': state,
                'checked': false
              }); 
              OnGoingSateCheckBox.click(function(){
                OnGoingStateList = []; 
                $('#OnGoingStateList input[type="checkbox"]:checked').each(function() {
                    OnGoingStateList.push($(this).val());
                    UpdateConfigurations();
                });
            });
            OnGoingStateLabel.append(OnGoingSateCheckBox);
            OnGoingStateListChecks.append(OnGoingStateLabel); 
            CommitState.append(new Option(state));
            VSS.resize();          
        });
    })
    await WIClient.getClassificationNodes(ProjectName,[4],10).then((Nodes)=>{  // 4-area /// 1-itteration
        AreaPathList = Nodes;
    })
} 