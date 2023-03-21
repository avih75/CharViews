import { ColorEntry, ColorCustomizationOptions } from "Charts/Contracts";

 

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

export function Colorize() {

    let colorPass: ColorEntry = {
        backgroundColor: 'Green',
        value: 'Done'
    }
    let colorClosed: ColorEntry = {
        backgroundColor: 'Green',
        value: 'Closed'
    }
    let colorFailed: ColorEntry = {
        backgroundColor: 'Red',
        value: 'UnClosed'
    }
    let colorPospond: ColorEntry = {
        backgroundColor: 'Red',
        value: 'Pospone'
    }
    let colorNotRun: ColorEntry = {
        backgroundColor: 'Gray',
        value: 'Cancle'
    }
    let colorInProgress: ColorEntry = {
        backgroundColor: 'Blue',
        value: 'In Progress'
    }
    let colorPlaned: ColorEntry = {
        backgroundColor: 'Blue',
        value: 'Planed'
    }
    let colorInNotApplicable: ColorEntry = {
        backgroundColor: 'Yellow',
        value: 'Commited'
    }

    let colors: Array<ColorEntry> = new Array<ColorEntry>();
    colors.push(colorClosed);
    colors.push(colorPass);
    colors.push(colorFailed);
    colors.push(colorNotRun);
    colors.push(colorInProgress);
    colors.push(colorInNotApplicable);
    colors.push(colorPospond);
    colors.push(colorPlaned);

    let colorize: ColorCustomizationOptions = {

        customColors: colors

    }

    return colorize;

}