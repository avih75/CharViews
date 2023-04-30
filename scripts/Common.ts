import { WorkItem } from "TFS/WorkItemTracking/Contracts";

import witManager = require("TFS/WorkItemTracking/Services");

 

export type MonthTuple = {monthName:string,startDate:Date, endDate:Date};

let modal: HTMLElement;

let closeModal: HTMLElement;

 

export class StateModel {

    constructor() {

        this.Total = 0;

        this.WitIds = [];

        this.WitTitle = [];

    }

    Total: number;         // state counter

    WitIds: number[];        // wits id

    WitTitle: string[];

    NewSpot(WitId: number,WitTitle: string){

        this.WitIds.push(WitId);

        this.WitTitle.push(WitTitle);

        this.Total+=1;

    }

    UpdateSpotState(RevState: SpotState,WitId: number,WitTitle: string){

 

    }  

    RemoveSpot(WitId: number,WitTitle: string){

        if (this.WitIds.indexOf(WitId)>-1){

            let newWitIds: number[]  = [];

            let newWitTitle: string[]  = [];

            this.WitIds.forEach(WId => {

                if (WId!=WitId){

                    newWitIds.push(WId);

                }

            });

            this.WitTitle.forEach(WTitle => {

                if (WTitle!=WitTitle){

                    newWitTitle.push(WTitle);

                }

            });

            this.WitIds = newWitIds;

            this.WitTitle = newWitTitle;

            this.Total-=1;

        }

    }

}

export enum SpotLocation {

    Fresh,

    Trailing

}

export enum SpotState {

    New,

    Commited,

    OnGoing,

    Closed,    

    Postponed,

    Cancle    

}

export class SpotData{

    WitIttrationPath: string;

    Commited:Boolean;

    Planing:Planing;

    FlowStates:FlowStates;

 

    constructor(){//planing:Planing,flowStates:FlowStates,commited:boolean,witIttrationPath: string){

        this.WitIttrationPath="";

        this.Commited=false;

        this.Planing=null;

        this.FlowStates=null;

    }

}

export class ConfigModel{

    ProjectName: string;

    ViewMode: string;

    WorkItemList: WorkItemModel[];

    ItterationBack:number;

    ItterationForward:number;

    constructor(projectName:string,viewMode:string){

        this.ProjectName=projectName;

        this.ViewMode = viewMode;

        this.WorkItemList=[];

        this.ItterationBack=0;

        this.ItterationForward=0

    }

}

export class ConfigMod{

    ProjectName: string;

    ViewModeList: ViewMode[];

    constructor(projectName:string){

        this.ProjectName=projectName;

        this.ViewModeList = [];

    }

}

export class ViewMode{

    ViewMode: string;

    WorkItemList: WorkItemModel[];

    ItterationBack:number;

    ItterationForward:number;

    constructor(viewMode:string){

        this.ViewMode = viewMode;

        this.WorkItemList=[];

        this.ItterationBack=0;

        this.ItterationForward=0

    }

}

export class WorkItemModel{

    Enable: boolean;

    WorkItemName: string;

    WorkItemCommited:string;

    WorkItemAllStates: string[];

    WorkItemNewStates: string[];    

    WorkItemInProgress: string[];

    WorkItemRemoveStates :string[];

    WorkItemDone :string[];  

    constructor(workItemName:string){

        this.Enable=false;

        this.WorkItemName= workItemName;

        this.WorkItemAllStates=[];

        this.WorkItemNewStates=[];

        this.WorkItemInProgress=[];

        this.WorkItemRemoveStates =[];

        this.WorkItemDone =[];  

    }

}

export enum Planing{

    Posponed,

    Planed,

    Pushed

}

export enum FlowStates{

    New,

    InProgress,

    Done,

    Removed

}

export class WorkItemExtra{

    Id:number;

    Wit:WorkItem;

    State:FlowStates;

    Plan:Planing;

}

function AddRowModal(Wit: WorkItem) {

    let row = $("<tr/>");

    row.on('click', function (){

        OpenWit(Wit.id);

    })

    row.append($("<td/>").addClass("cell").append($("<label/>").addClass("cell").text(Wit.id)));

    row.append($("<td/>").addClass("cell").append($("<label/>").addClass("cell").text(Wit.fields["System.Title"])));

    row.append($("<td/>").addClass("cell").append($("<label/>").addClass("cell").text(Wit.fields["System.State"])));  

    return row  

}

function OpenWit(id: number) {

    witManager.WorkItemFormNavigationService.getService().then((service) => {

        service.openWorkItem(id, false);

    })

}

export function ModalBuild() {

    modal = document.getElementById("myModal");

    closeModal = document.getElementById("close");

    closeModal.onclick = function () {

        modal.style.display = "none";

    }

    window.onclick = function (event) {

        if (event.target == modal) {

            modal.style.display = "none";

        }

    }

}

export function ShowModal(title:string,Wits:WorkItem[]){

    $("#modalView").empty();

    $("#modalTitle").text(title);

    modal.style.display = "block";

    let row = $("<tr/>");

    row.append($("<th/>").addClass("Hcell").append($("<label/>").addClass("Hcell").text("ID")));

    row.append($("<th/>").addClass("Hcell").append($("<label/>").addClass("Hcell").text("Title")));

    row.append($("<th/>").addClass("Hcell").append($("<label/>").addClass("Hcell").text("State")));

    $("#modalView").append(row);

    Wits.forEach(Wit => {

        $("#modalView").append(AddRowModal(Wit));        

    });

}