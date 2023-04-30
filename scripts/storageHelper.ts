/// <reference types="vss-web-extension-sdk" />

export async function StoreData(Data: object, DataName: string) {
    var deferred = $.Deferred();
    let dataService: any = await VSS.getService(VSS.ServiceIds.ExtensionData);
    let result = await dataService.setValue(DataName, Data);
    deferred.resolve();
    return deferred;
}

export async function RetriveData(DataName: string) {
    let dataService: any = await VSS.getService(VSS.ServiceIds.ExtensionData);
    let CData: object = await dataService.getValue(DataName);
    return CData;
}

export async function KillData(DataName: string) {
    let dataService: any = await VSS.getService(VSS.ServiceIds.ExtensionData);
    dataService.setValue(DataName, undefined);
    dataService.deleteValue(DataName);
}

export async function StoreConfigList(ConfigList: string[]) {
    var deferred = $.Deferred();
    let dataService: any = await VSS.getService(VSS.ServiceIds.ExtensionData);
    let result = await dataService.setValue("CharViewConfigList",ConfigList);
    deferred.resolve();
    return deferred;
}
export async function LoadConfigList(){
    let dataService: any = await VSS.getService(VSS.ServiceIds.ExtensionData);
    let ConfigList: string[] = await dataService.getValue("CharViewConfigList");
    return ConfigList;
}