import WorkItemClient = require("TFS/WorkItemTracking/RestClient");
import WorkItemClientA = require("TFS/Core/RestClient");
import { KillData, LoadConfigList, RetriveData, StoreConfigList, StoreData } from "./storageHelper";
import { ConfigModel,WorkItemModel } from "./Common";
import { WorkItemStateColor, WorkItemType } from "TFS/WorkItemTracking/Contracts";   

let ConfigList:string[]=[];
let CMData: ConfigModel;
let Projects:string[]=[];
let ProjectName = "test";
let SelectedConfig: string;
let WIClient = WorkItemClient.getClient(); 
let x = WorkItemClientA.getClient();
function InitP() {  
    $("#ProjectList").on('change',function(){ProjectName = $("#ProjectList").val();});
    $("#saveWidget").on('click',function(){StoreData(CMData,SelectedConfig).then(()=>{alert("Configuration Saved")})});
    $("#resetConfig").on('click',function(){InitConfigModel().then(()=>{RefreshWitList();});});
    $("#ModeList").on('change',function(){CMData.ViewMode=$("#ModeList").val().toString();});      
    $("#WitList").on('change',function(){RefreshWorkItem()});      
    $("#WorkItem").on('click',function(){
        let check:boolean;
        if (this.checked){
            check=true;
        }
        else{
            check = false;
        }
        WorkItemEnableChanged(check)
    });    
    $("#Commited").on('change',function(){ChangeCommited()});
    $("#addNew").on('click',function(){AddConfiguration();});
    $("#delete").on('click',function(){RemoveConfiguration();});
    $("#ConfigList").on('change',function(){InitConfigModel().then(()=>{RefreshView();});}); //'click'
    LoadProjectList();
    StartConfig();  
}
async function LoadProjectList(){
    let ProjectList = $("#ProjectList");
    ProjectList.empty(); 
    Projects=[];
    let TeamProjectReferences = await x.getProjects();
    TeamProjectReferences.forEach(TeamProjectReference => {
        Projects.push(TeamProjectReference.name); 
        ProjectList.append(new Option(TeamProjectReference.name));   
    });    
    ProjectList.val($("#WitList option:first").val());
    ProjectName = ProjectList.val();
}
async function StartConfig() {
    LoadConfigList().then((CnfgList)=>{
        if (CnfgList!=null){
            ConfigList=CnfgList;
        }
    }).then(()=>{
        RefreshConfigSelect();  
    })
}
function RefreshConfigSelect(){
    let CnfgList = $("#ConfigList");    
    CnfgList.empty();
    ConfigList.forEach(Cnfg=>{
        CnfgList.append(new Option(Cnfg));    
    });
    $("#ConfigList").val($("#ConfigList option:first").val());    
}
async function InitConfigModel(){
    SelectedConfig = $("#ConfigList").val().toString();
    CMData = new ConfigModel(SelectedConfig,"");  
    await WIClient.getWorkItemTypes(ProjectName).then(async (WitsTypes: WorkItemType[])=>{        
        for (const WitsType of WitsTypes){
            let WitModel: WorkItemModel = new WorkItemModel(WitsType.name);
            await WIClient.getWorkItemTypeStates(ProjectName,WitsType.name).then((WorkItemStates:WorkItemStateColor[])=>{
                WorkItemStates.forEach(WorkItemState => {
                    WitModel.WorkItemAllStates.push(WorkItemState.name);
                });                
            });
            CMData.WorkItemList.push(WitModel);        
        };
    });   
}
async function RefreshView(){
    RetriveData(SelectedConfig).then((CMDataRetrived: ConfigModel) => {
        if (CMDataRetrived)
        {
            UpdateData(CMDataRetrived);
        }
        RefreshWitList();
    })
}
function UpdateData(CDataRetrived: ConfigModel){
    CMData.ViewMode=CDataRetrived.ViewMode;
    CMData.WorkItemList.forEach(CDataWit => {
        CDataRetrived.WorkItemList.forEach(RetriveWit => {
            if(CDataWit.WorkItemName==RetriveWit.WorkItemName){
                UpdateWorkItem (CDataWit,RetriveWit);
            }
        });
    });
}
function UpdateWorkItem (CDataWit: WorkItemModel,RetriveWit: WorkItemModel){
    CDataWit.Enable=RetriveWit.Enable;
    FixStateList(CDataWit.WorkItemAllStates,CDataWit.WorkItemRemoveStates,RetriveWit.WorkItemRemoveStates);
    FixStateList(CDataWit.WorkItemAllStates,CDataWit.WorkItemNewStates,RetriveWit.WorkItemNewStates);
    FixStateList(CDataWit.WorkItemAllStates,CDataWit.WorkItemDone,RetriveWit.WorkItemDone);
    FixStateList(CDataWit.WorkItemAllStates,CDataWit.WorkItemInProgress,RetriveWit.WorkItemInProgress);
}
function FixStateList(CDataWorkItemAllStates: string[],CDataWorkItemStates: string[],RetriveWorkItemStates: string[]){
    if (RetriveWorkItemStates==null){
        RetriveWorkItemStates=[];
    }
    RetriveWorkItemStates.forEach(RetriveState => {
        CDataWorkItemAllStates.forEach(thisState => {
            if (thisState==RetriveState){
                CDataWorkItemStates.push(RetriveState);
            }
        });
    });
}
function RefreshWitList(){
    let ModeList  = $("#ModeList");
    ModeList.val(CMData.ViewMode);
    let WitList = $("#WitList");  
    WitList.empty();
    CMData.WorkItemList.forEach(wit => {
        WitList.append(new Option(wit.WorkItemName));  
    });            
    WitList.val($("#WitList option:first").val());
    RefreshWorkItem();
}
function RefreshWorkItem(){    
    let WitList = $("#WitList");
    let WorkItemEnable = $("#WorkItem");  
    CMData.WorkItemList.forEach(wit => {
        if (wit.WorkItemName==WitList.val()){
            if (wit.Enable){
                WorkItemEnable.prop('checked',true);
            }
            else{
                WorkItemEnable.prop('checked',false);
            }  
            AddStates(wit);                                      
        }                
    });    
}
function AddStates(wit: WorkItemModel){
    let InProgress = $("#InProgress");
    InProgress.empty();
    let Done = $("#Done");
    Done.empty();
    let Removed = $("#Removed");
    Removed.empty();
    let New = $("#New");
    New.empty();
    let Commited = $("#Commited");
    Commited.empty();
    wit.WorkItemAllStates.forEach(state => {
        CheckBox(InProgress,"InProgress",state,wit.WorkItemInProgress);
        CheckBox(Done,"Done",state,wit.WorkItemDone);
        CheckBox(Removed,"Removed",state,wit.WorkItemRemoveStates);
        CheckBox(New,"New",state,wit.WorkItemNewStates);
        Commited.append(new Option(state));
    });
    if (wit.WorkItemCommited!=null && wit.WorkItemCommited!=""){
        Commited.val(wit.WorkItemCommited);
    }
    else{
        Commited.val($("#Commited option:first").val());
    }
}
function CheckBox(container:JQuery,flowState:string,state:string,States: string[]){
    let Checked:boolean=false;
    States.forEach(Stat => {
        if(Stat==state){
            Checked=true;
        }
    });
    let CheckBoxLabel = $('<label>').append(state);
    let SatetCheckBox = $('<input type="checkbox">').attr({
        'id': state.replace(/\s/g, "") + '-'+flowState+'-checkbox',
        'value': state,
        'checked': Checked
    });
    SatetCheckBox.on('change',function(){
        let check:boolean;
        let thisState = state;
        if (this.checked){
            check=true;
        }
        else{
            check = false;
        }
        ChangeState(flowState,thisState,check)
    });
    container.append(SatetCheckBox);
    container.append(CheckBoxLabel);
}
function ChangeState(flowState:string,state:string,checked:boolean){
    let WitList = $("#WitList");
    CMData.WorkItemList.forEach(wit => {
        if (wit.WorkItemName==WitList.val()){
            if (flowState=="InProgress"){
                wit.WorkItemInProgress=UpdateState(wit.WorkItemInProgress,state,checked);
            }
            else if(flowState=="Done") {
                wit.WorkItemDone=UpdateState(wit.WorkItemDone,state,checked);
            }
            else if (flowState=="Removed"){
                wit.WorkItemRemoveStates=UpdateState(wit.WorkItemRemoveStates,state,checked);
            }
            else { // New
                wit.WorkItemNewStates = UpdateState(wit.WorkItemNewStates,state,checked);
            }
        }
    })
}
function UpdateState(witStates: string[],state:string,checked:boolean){
    let states: string[]=[];
    if (checked){
        witStates.push(state);
    }
    else{
        witStates.forEach(stt => {
            if (stt!=state){
                states.push(stt);
            }            
        });
        witStates=states;
    }
    return witStates;
}
function WorkItemEnableChanged(checked:boolean){
    let WitList = $("#WitList");
    CMData.WorkItemList.forEach(wit => {
        if (wit.WorkItemName==WitList.val()){
            wit.Enable=checked;
        }
    })
}
function ChangeCommited(){
    let WitList = $("#WitList");
    let Commited = $("#Commited");  
    CMData.WorkItemList.forEach(wit => {
        if (wit.WorkItemName==WitList.val()){
            wit.WorkItemCommited = Commited.val().toString();
        }
    })
}
function AddConfiguration(){
    let newConfig = $("#newConfiguration").val();
    if (newConfig!=null&&newConfig!=""){
        let add:boolean=true;
        ConfigList.forEach(conf => {
            if (conf==newConfig){
                add=false;
            }
        });
        if (add){
            ConfigList.push(newConfig.toString());
            StoreConfigList(ConfigList);
            $("#ConfigList").append(new Option(newConfig.toString()));
            $("#ConfigList").val(newConfig);
        }
    }
    $("#newConfiguration").val("");
    InitConfigModel();
    RefreshView();
}
function RemoveConfiguration(){
    let delConfig = $("#ConfigList").val().toString();
    let temp:string[]=[]
    ConfigList.forEach(conf => {
        if (conf!=delConfig){
            temp.push(conf);
        }
    });
    ConfigList = temp;
    KillData(delConfig);
    StoreConfigList(ConfigList);    
    RefreshConfigSelect();
    InitConfigModel();
    RefreshView();
}
VSS.register(VSS.getContribution().id, InitP);
InitP();