import * as THREE from "three";
import { ILogger } from "../interfaces/ILogger";
import { IUpdatable } from "../interfaces/IUpdatable";
import { LogMng } from "../../utils/LogMng";
import { Game } from "./Game";

type SceneParams = {
    game: Game,
    canvasParent: HTMLElement
}

export class BasicScene implements ILogger, IUpdatable {

    protected _params: SceneParams;
    
    constructor(aParams: SceneParams) {
        this._params = aParams;
    }

    logDebug(aMsg: string, aData?: any): void {
        LogMng.debug(`BasicScene -> ${aMsg}`, aData);
    }
    logWarn(aMsg: string, aData?: any): void {
        LogMng.warn(`BasicScene -> ${aMsg}`, aData);
    }
    logError(aMsg: string, aData?: any): void {
        LogMng.error(`BasicScene -> ${aMsg}`, aData);
    }

    protected initScenes() {
        
    }

    protected initCamera() {
        
    }

    protected initRender() {

    }

    init(...params) {
        this.initScenes();
        this.initCamera();
        this.initRender();
    }

    onWindowResize() {

    }

    render() {
        
    }
    
    update(dt: number) {

    }

}