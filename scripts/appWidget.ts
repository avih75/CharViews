import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import WorkClient = require("TFS/Work/RestClient");
import { TeamContext } from "TFS/Core/Contracts";
import { TeamSettingsIteration } from "azure-devops-node-api/interfaces/WorkInterfaces";
import { Settings } from "./appWidgetConfiguration";
import { BuildViewICV, ShowViewICV, DataModelICV, GetThinerQueryData } from "./IterationView"
import { GetMWQueryData, MonthWits ,ShowWitListViewMode} from "./MonthWorkItemView"
import { RetriveData } from "./storageHelper";
import { ConfigModel,ModalBuild,MonthTuple,WorkItemModel } from "./Common";  
 
WidgetHelpers.IncludeWidgetStyles();
WidgetHelpers.IncludeWidgetConfigurationStyles(); 

const MaxCallIds:number=200;
let VMode: ConfigModel;
let Wits: WorkItemModel[];
let WClient: WorkClient.WorkHttpClient4_1;
let Team = VSS.getWebContext().team;
let Project: ContextIdentifier;
let DataName: string;
let MyTeamContext: TeamContext;
let DoneStates: string[];
let DoneStatesQuery: string="";
let RemoveStatesQuery: string="";
let NewStatesQuery:string="";
let InProgressStates: string[];
let SelectedWitsList: string="";
let SelectedItterations: TeamSettingsIteration[];
let FirstDate:Date;
let LastDate:Date;
let TeamAreaPaths:string="";
let AreaPaths:string[];
let NewStates:string[];
let RemovedState:string[];
let MonthList:MonthTuple[];
let Title:string="";
function InitWidget(WidgetSettings: Settings){  
    Wits=[];
    DoneStates=[];
    InProgressStates=[];
    SelectedItterations=[];
    NewStates=[];
    RemovedState=[];
    DoneStates=[];
    AreaPaths=[];
    WClient = WorkClient.getClient();  
    Project = VSS.getWebContext().project;  
    if (!WidgetSettings) {  
        WidgetSettings.itterationBack=0;
        WidgetSettings.itterationForword=0;
        WidgetSettings.dataName="";
    }
    DataName = WidgetSettings.dataName;
}
VSS.register("ChartViewsWidget", function (){
        let getQueryInfo = function (widgetSettings) {
            Title=widgetSettings.name;
            let WidgetSettings:Settings = JSON.parse(widgetSettings.customSettings.data);
            InitWidget(WidgetSettings);  
            RetriveData(DataName).then((CMDataRetrived: ConfigModel)=>{
                if(CMDataRetrived!=null){
                    VMode=CMDataRetrived;
                }
                VMode.ItterationBack = WidgetSettings.itterationBack;
                VMode.ItterationForward = WidgetSettings.itterationForword;
                VMode.ProjectName=Project.name;          
                MyTeamContext = {"project": Project.name,"projectId": Project.id,"team": Team.name,"teamId": Team.id};        
                if (VMode){
                    SetViews();                
                }
            })            
            return WidgetHelpers.WidgetStatusHelper.Success();        
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
async function SetViews(){
    await TestAreaPAth();
    ModalBuild();
    let container = $("#ViewContainer");
    container.empty();
    switch(VMode.ViewMode){
        case "Month Wits Chart View":{
            SetInfoMWCV();
            SetMonths();
            let FullMonthsWorkItemList:MonthWits[] = await GetMWQueryData(Project.name,Team.name,MaxCallIds,MonthList,TeamAreaPaths,SelectedWitsList,DoneStatesQuery,RemoveStatesQuery);
            ShowWitListViewMode("Wits","Months",Title,FullMonthsWorkItemList,container);
            return;
        }
        case "Itteration Chart View":{
            SetInfoICV();
            await SetItterations();
            let FullWorkItemList = await GetThinerQueryData(Project.name,Team.name,MaxCallIds,FirstDate,TeamAreaPaths,SelectedWitsList,NewStatesQuery);//.then((FullWorkItemList)=>{
            let ViewModel2: DataModelICV = await BuildViewICV(SelectedItterations,FullWorkItemList,NewStates,InProgressStates,DoneStates,RemovedState,AreaPaths);
            ViewModel2.Title=Title;
            ViewModel2.Xasix="Itterations";
            ViewModel2.Yasix="Wits";
            ShowViewICV(ViewModel2,container);
            return;
        }
        case "3":{
            return;
        }
    }
}
function SetInfoMWCV(){
    VMode.WorkItemList.forEach(Wit => {
        if(Wit.Enable){
            Wits.push(Wit);
            SelectedWitsList = "\"" + Wit.WorkItemName + "\"," + SelectedWitsList;  
            Wit.WorkItemDone.forEach(DoneState => {
                DoneStates.push(DoneState);
                DoneStatesQuery = "\"" + DoneState + "\"," + DoneStatesQuery;
            });
            DoneStatesQuery = DoneStatesQuery.slice(0, -1);
            Wit.WorkItemRemoveStates.forEach(RemoveState=>{
                RemovedState.push(RemoveState);
                RemoveStatesQuery = "\"" + RemoveState + "\"," + RemoveStatesQuery;
            })
            RemoveStatesQuery = RemoveStatesQuery.slice(0, -1);
        }
    });
    SelectedWitsList = SelectedWitsList.slice(0, -1);
}
function SetMonths(){
    MonthList=[];
    let TempMonthList:MonthTuple[]=[];
    let date = new Date();
    for (let i = 0; i <= VMode.ItterationBack; i++) {
        let month = date.getMonth()-i;
        let year = date.getFullYear();
        while (month<0){
            month+=12;
            year--;
        }
        let firstDay = new Date(year,month, 1);
        let lastDay = new Date(year,month+1, 0);
        if (month==0){
            month=12;
            year=year-1
        }
        TempMonthList.push({monthName:month+"/"+year,startDate:firstDay,endDate:lastDay});
    }
    while (TempMonthList.length>0){
        MonthList.push(TempMonthList.pop());
    }
}
function SetInfoICV(){
    VMode.WorkItemList.forEach(Wit => {
        if(Wit.Enable){
            Wits.push(Wit);
            SelectedWitsList = "\"" + Wit.WorkItemName + "\"," + SelectedWitsList;  
            Wit.WorkItemDone.forEach(DoneState => {
                DoneStates.push(DoneState);
                DoneStatesQuery = "\"" + DoneState + "\"," + DoneStatesQuery;
            });
            DoneStatesQuery = DoneStatesQuery.slice(0, -1);
            Wit.WorkItemInProgress.forEach(InProgressState=>{
                InProgressStates.push(InProgressState);
            })
            Wit.WorkItemNewStates.forEach(NewState=>{
                NewStates.push(NewState);
                NewStatesQuery = "\"" + NewState + "\"," + NewStatesQuery;
            })
            NewStatesQuery = NewStatesQuery.slice(0, -1);
            Wit.WorkItemRemoveStates.forEach(RemoveState=>{
                RemovedState.push(RemoveState);
            })
        }              
    });                  
    SelectedWitsList = SelectedWitsList.slice(0, -1);
}
async function SetItterations(){
    let AllItterations: TeamSettingsIteration[] = await WClient.getTeamIterations(MyTeamContext);
    let HistoryItterations: TeamSettingsIteration[]=[];
    let FeaatureItterations: TeamSettingsIteration[]=[];
    let TempList:TeamSettingsIteration[] = [];
    while(AllItterations.length>0){
        TempList = CheckIt(AllItterations.pop(), TempList);
    }
    let CurentItteration: TeamSettingsIteration;
    while(TempList.length>0){
        let Itteration: TeamSettingsIteration = TempList.pop();
        if (Itteration.attributes.timeFrame == 0 ){ // past
            if (VMode.ItterationBack>0){
                HistoryItterations.push(Itteration);
            }
        }
        else if (Itteration.attributes.timeFrame == 1){ // current
            CurentItteration = Itteration;
        }
        else{ // feature
            if (VMode.ItterationForward>0){
                FeaatureItterations.push(Itteration);
            }
        }
    }    
    while(HistoryItterations.length>VMode.ItterationBack){
        let Oldest: TeamSettingsIteration = HistoryItterations.pop();
        TempList= [];
        while(HistoryItterations.length>0){
            let CheclIt: TeamSettingsIteration = HistoryItterations.pop();
            if (CheclIt.attributes.startDate > Oldest.attributes.startDate){
                TempList.push(CheclIt);  
            }
            else {
                TempList.push(Oldest);
                Oldest=CheclIt;
            }  
        }
        while(TempList.length>0){
            HistoryItterations.push(TempList.pop());
        }
    }
    while(FeaatureItterations.length>VMode.ItterationForward){
        let Newest: TeamSettingsIteration = FeaatureItterations.pop();
        TempList = [];
        while(FeaatureItterations.length>0){
            let CheclIt: TeamSettingsIteration = FeaatureItterations.pop();
            if (CheclIt.attributes.finishDate > Newest.attributes.finishDate){
                TempList.push(CheclIt);  
            }
            else {
                TempList.push(Newest);
                Newest=CheclIt;
            }  
        }
        while(TempList.length>0){
            FeaatureItterations.push(TempList.pop());
        }
    }
    if (HistoryItterations && HistoryItterations.length>0 && HistoryItterations[0].attributes.finishDate){
        FirstDate = HistoryItterations[0].attributes.startDate;
    }
    else{
        FirstDate = CurentItteration.attributes.startDate;
    }
    if (FeaatureItterations && FeaatureItterations.length>0 && FeaatureItterations[FeaatureItterations.length-1].attributes.finishDate){
        LastDate = FeaatureItterations[0].attributes.finishDate;
    }
    else{
        LastDate = CurentItteration.attributes.finishDate;
    }
    SelectedItterations=HistoryItterations;
    HistoryItterations.push(CurentItteration);
    HistoryItterations.concat(FeaatureItterations);
    return
}
function CheckIt(newItter: TeamSettingsIteration, ItterList: TeamSettingsIteration[]){    
    if (ItterList.length==0){
        ItterList.push(newItter);
    }
    else{
        let newPath: string[] = newItter.path.split('\\');
        let OldPath: string[] =  ItterList[0].path.split('\\');
        if (ItterList.length == 1 && newPath.length > OldPath.length){          
            ItterList.pop();
            ItterList.push(newItter);        
        }
        else if (newPath.length == OldPath.length){
            ItterList.push(newItter);;
        }
    }
    return ItterList;
}
async function TestAreaPAth(){
    let TeamFields = await WClient.getTeamFieldValues(MyTeamContext);
    TeamAreaPaths="";
    TeamFields.values.forEach(Field =>{
        let temp = "";
        Field.value.split('\\').forEach(path=>{
            temp+=path+'\\';            
        })
        //let newVal = Field.value.substring(0,Field.value.length-5);
        temp = temp.slice(0, -1);
        AreaPaths.push(temp);
        TeamAreaPaths = "\"" + temp + "\"," + TeamAreaPaths;
    })
    TeamAreaPaths = TeamAreaPaths.slice(0, -1);      
}