import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import WidgetClient = require("TFS/Dashboards/RestClient");

import WorkItemClient = require("TFS/WorkItemTracking/RestClient");

import WorkClient = require("TFS/Work/RestClient");

import CoreClient = require("TFS/Core/RestClient");

import { TeamContext } from "TFS/Core/Contracts";

import { ChartTypesConstants } from "Charts/Contracts";

import { TeamSettingsIteration } from "azure-devops-node-api/interfaces/WorkInterfaces";

import { Settings } from "./appWidgetConfiguration";

import { GetViewModeData1, BuildViewModel1, ShowViewMode1, DataModel1 } from "./Mode1"

import { GetViewModeData2, BuildViewModel2, ShowViewMode2, DataModel2 } from "./Mode2"

 

WidgetHelpers.IncludeWidgetStyles();

WidgetHelpers.IncludeWidgetConfigurationStyles();

 

let WIClient = WorkItemClient.getClient();

let WClient = WorkClient.getClient();

let WCClient = WidgetClient.getClient();

let CClient = CoreClient.getClient();  

 

const MaxCallIds:number=200;

let Team = VSS.getWebContext().team;

let Project = VSS.getWebContext().project;

let MyTeamContext: TeamContext;

let WidgetSettings:Settings;

let EndStates: string[]; //= "'Closed','Done','Rejected'";

let DoneStates: string="";

let Commited: string; //"Approved";

let OnGoing: string[];// = "On Going";

let MaxBack: number = 5;

let MaxForword: number = 0;

let SelecctedWitsList: string="";

let AllItterations: TeamSettingsIteration[]= [];

let FirstDate:Date;

let LastDate:Date;

VSS.register("ChartViewsWidget", function (){

    let getQueryInfo = function (widgetSettings) {

        WidgetSettings = JSON.parse(widgetSettings.customSettings.data);

        let container = $("#ViewContainer");      

        container.empty();

        if (!WidgetSettings) {            

            container.text("Sorry nothing to show, please Check cconfiguration.");

            return WidgetHelpers.WidgetStatusHelper.Success();

        }

        else {            

            EndStates = WidgetSettings.endStateList;

            EndStates.forEach(EndState => {

                DoneStates = "'" + EndState + "'," + DoneStates;

            });

            DoneStates = DoneStates.slice(0, -1);

 

            WidgetSettings.workItems.forEach(Wit => {

                SelecctedWitsList = "'" + Wit + "'," + SelecctedWitsList;

            });

            SelecctedWitsList = SelecctedWitsList.slice(0, -1);

            OnGoing = WidgetSettings.onGoingStateList;

            Commited = WidgetSettings.commitState;

            MyTeamContext = {"project": Project.name,"projectId": Project.id,"team": Team.name,"teamId": Team.id};

            SetViews();      

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

async function SetViews(){

    AllItterations = await WClient.getTeamIterations(MyTeamContext);

    AllItterations = SetItterations(AllItterations);

    let $container = $("#ViewContainer");

    switch(WidgetSettings.mode){

        case "Mode-1":{

            GetViewModeData1(Project.name,Team.name,MaxCallIds,FirstDate,DoneStates,SelecctedWitsList).then((FullWorkItemList)=>{

                let x = FullWorkItemList;

                let ViewModel1: DataModel1 = BuildViewModel1(AllItterations,FullWorkItemList,Commited,OnGoing,EndStates);  

                return ViewModel1;

            }).then((ViewModel1)=> ShowViewMode1(ViewModel1,$container));

            return;

        }

        case "Mode-2":{
            GetViewModeData2(Project.name,Team.name,MaxCallIds,FirstDate,DoneStates,SelecctedWitsList).then((FullWorkItemList)=>
                BuildViewModel2(AllItterations,FullWorkItemList,Commited,EndStates).then((ViewModel2: DataModel2)=>
                ShowViewMode2(ViewModel2,$container)));    
            return;
        }

        case "Mode-3":{

            return;

        }

        case "Mode-4":{

            return;

        }

    }

}

function SetItterations(AllItterations: TeamSettingsIteration[]){

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

            if (MaxBack>0){

                HistoryItterations.push(Itteration);

            }

        }

        else if (Itteration.attributes.timeFrame == 1){ // current

            CurentItteration = Itteration;

        }

        else{ // feature

            if (MaxForword>0){

                FeaatureItterations.push(Itteration);

            }

        }

    }    

    while(HistoryItterations.length>MaxBack){

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

    while(FeaatureItterations.length>MaxForword){

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

    AllItterations=HistoryItterations;

    AllItterations.push(CurentItteration);

    AllItterations.concat(FeaatureItterations);

    return AllItterations;

}

function CheckIt(tempIt: TeamSettingsIteration, TempList: TeamSettingsIteration[]){    

    if (TempList.length==0){

        TempList.push(tempIt);

    }

    else{

        let path: string[] = tempIt.path.split('\\');

        let OldPath: string[] =  TempList[0].path.split('\\');

        if (TempList.length == 1 && path.length < OldPath.length){          

            TempList.pop();

            TempList.push(tempIt);        

        }

        else if (path.length == OldPath.length){

            TempList.push(tempIt);;

        }

    }

    return TempList;

}

 

//const options = { day: 'numeric', month: 'numeric', year: 'numeric' };

//const shortDate = date.toLocaleDateString('en-US', options);