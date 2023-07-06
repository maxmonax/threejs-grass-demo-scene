import * as THREE from "three";
import { ILogger } from "../interfaces/ILogger";
import { LogMng } from "../../utils/LogMng";
import { GameBoot } from "./GameBoot";
import { GamePreloader } from "./GamePreloader";
import { GameScene } from "./GameScene";
import { Settings } from "../data/Settings";
import { FrontEvents } from "../events/FrontEvents";
import { DebugGui } from "../debug/DebugGui";

type GameParams = {
    canvasParent: HTMLElement;
    assetsPath: string;
    scenes?: any[];
    onLoadProgress?: (status: number) => void;
    onLoadComplete?: () => void;
}

export class Game implements ILogger {

    private _params: GameParams;
    private _gameScene: GameScene;
    private _stats: Stats;
    private _clock: THREE.Clock;

    constructor(aParams: GameParams) {
        this._params = aParams;
        new GameBoot();
        this.initStats();
        this.startPreloader(aParams.assetsPath);
        this.initEvents();
        this.initDebugGui();
        this._clock = new THREE.Clock();
    }

    logDebug(aMsg: string, aData?: any): void {
        LogMng.debug(`Game -> ${aMsg}`, aData);
    }
    logWarn(aMsg: string, aData?: any): void {
        LogMng.warn(`Game -> ${aMsg}`, aData);
    }
    logError(aMsg: string, aData?: any): void {
        LogMng.error(`Game -> ${aMsg}`, aData);
    }
    
    private initStats() {
        if (Settings.isDebugMode) {
            this._stats = new Stats();
            this._stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
            document.body.appendChild(this._stats.dom);
        }
    }

    private initEvents() {
        FrontEvents.onWindowResizeSignal.add(this.onWindowResize, this);
    }

    private initDebugGui() {
        if (Settings.isDebugMode) {
            // DebugGui.getInstance();
        }
    }

    private onWindowResize() {
        if (this._gameScene) this._gameScene.onWindowResize();
    }

    private startPreloader(aAssetsPath: string) {
        let preloader = new GamePreloader(aAssetsPath);

        let extOnLoadProgress: Function; 
        if (typeof this._params.onLoadProgress === 'function') {
            extOnLoadProgress = this._params.onLoadProgress;
        }

        preloader.onLoadProgressSignal.add((aProgressPercent: number) => {
            this.logDebug(`loading: ${aProgressPercent}%`);
            if (extOnLoadProgress) extOnLoadProgress(aProgressPercent);
        }, this);

        preloader.onLoadCompleteSignal.addOnce(() => {
            this.onLoadingComplete();
            if (typeof this._params.onLoadComplete === 'function') {
                this._params.onLoadComplete();
            }
        }, this);

        preloader.start();
    }

    private onLoadingComplete() {
        this.initScene();
        this.animate();
    }

    private initScene() {
        this._gameScene = new GameScene({
            canvasParent: this._params.canvasParent,
            game: this
        });
        this._gameScene.init(this._params.canvasParent);
    }

    private animate() {
        let dt = this._clock.getDelta();
        
        if (Settings.isDebugMode) this._stats.begin();
        this._gameScene.update(dt);
        this._gameScene.render();
        if (Settings.isDebugMode) this._stats.end();

        requestAnimationFrame(() => this.animate());
    }
    
}