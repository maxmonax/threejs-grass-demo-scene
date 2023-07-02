import { ThreeLoader } from '../../utils/threejs/ThreeLoader';
import { Signal } from '../../utils/events/Signal';
import { TEXTURE_LOAD_LIST } from '../data/TextureData';
import { MODEL_LOAD_LIST } from '../data/ModelData';
import { LogMng } from '../../utils/LogMng';

export class GamePreloader {
    private _loader: ThreeLoader;
    private _assetsPath: string;
    private _isDefaultLoaded = false;
    private _isLoadingInProcess = false;

    onLoadCompleteSignal = new Signal();
    onLoadProgressSignal = new Signal();

    constructor(aAssetsPath: string) {
        this._assetsPath = aAssetsPath;
    }

    start() {
        if (this._isDefaultLoaded || this._isLoadingInProcess) {
            LogMng.warn(``);
            return;
        }
        this._isDefaultLoaded = true;
        this._isLoadingInProcess = true;
        // init ThreeLoader
        this._loader = ThreeLoader.getInstance({
            retryCount: 2
        });
        let setId = this._loader.createNewSet({
            context: this,
            onProgress: this.onLoadProgress,
            onComplete: this.onLoadComplete
        });
        this.addAssetsToLoader(setId);
        this._loader.startSetLoading(setId);
    }
    
    private addAssetsToLoader(aSetId: number) {

        let assetsPath = this._assetsPath;
        
        // models
        let modelsPath = `${assetsPath}models/`;
        for (let i = 0; i < MODEL_LOAD_LIST.length; i++) {
            const item = MODEL_LOAD_LIST[i];
            this._loader.addFileToSet(aSetId, {
                alias: item.alias,
                file: modelsPath + item.file
            });
        }

        // textures
        let texturesPath = `${assetsPath}textures/`;
        for (let i = 0; i < TEXTURE_LOAD_LIST.length; i++) {
            const item = TEXTURE_LOAD_LIST[i];
            this._loader.addFileToSet(aSetId, {
                alias: item.alias,
                file: texturesPath + item.file
            });
        }

    }

    private onLoadProgress(aProgressPercent: number) {
        this.onLoadProgressSignal.dispatch(aProgressPercent);
    }

    private onLoadComplete() {
        this._isLoadingInProcess = false;
        this.onLoadCompleteSignal.dispatch();
    }

}
