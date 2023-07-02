import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import { FontLoader, Font } from "three/examples/jsm/loaders/FontLoader";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils';
import { LogMng } from "../LogMng";
import { Callbacks } from "../events/Callbacks";

export enum ThreeLoaderFileType {
    texture = 'texture',
    cubeTexture = 'cubeTexture',
    hdr = 'hdr',
    obj = 'obj',
    fbx = 'fbx',
    glb = 'glb',
    gltf = 'gltf',
    json = 'json',
    font = 'font',
    gz = 'gz',
    gzip = 'gzip'
};

enum AliasPreference {
    texture = 't_',
    model = 'm_',
    json = 'json_'
};

type LoaderParams = {
    retryCount?: number;
    textureMapping?: THREE.Mapping;
    textureEncoding?: THREE.TextureEncoding;
};

type LoadItem = {
    type?: ThreeLoaderFileType;
    alias: string;
    file?: string;
    files?: string[];
};

type SetItem = {
    loadItem: LoadItem[],
    callbacks: Callbacks[],
    loadCounter: number
};

export class ThreeLoader {

    private static instance: ThreeLoader = null;

    private _params: LoaderParams;

    private cache: { [index: string]: any } = {};
    private sets: { [index: number]: SetItem } = {};

    private setCounter = 0;

    private constructor(aParams: LoaderParams) {

        if (ThreeLoader.instance) {
            throw new Error("Don't use ThreeLoader.constructor(), it's SINGLETON, use getInstance() method");
        }

        this._params = aParams || {};
        if (!this._params.retryCount) this._params.retryCount = 0;

    }

    static getInstance(aParams: LoaderParams = null): ThreeLoader {
        if (!ThreeLoader.instance) ThreeLoader.instance = new ThreeLoader(aParams);
        return ThreeLoader.instance;
    }

    private logDebug(aMessage: string, aData?: any) {
        LogMng.debug(`ThreeLoader: ${aMessage}`, aData);
    }

    private logWarn(aMessage: string, aData?: any) {
        LogMng.warn(`ThreeLoader: ${aMessage}`, aData);
    }

    private logError(aMessage: string, aData?: any) {
        LogMng.error(`ThreeLoader: ${aMessage}`, aData);
    }

    private getFileType(aFileName: string): ThreeLoaderFileType {

        let fn = aFileName;

        // remove file GET postfix
        if (fn.indexOf('?') > 0) {
            fn = fn.substring(0, fn.indexOf('?'));
        }

        let fileType = '';
        for (let i = fn.length - 1; i >= 0; i--) {
            if (fn[i] == '.') {
                if (fileType == ThreeLoaderFileType.gz || fileType == ThreeLoaderFileType.gzip) {
                    // ignore archive types
                    fileType = '';
                    continue;
                }
                break;
            }
            else {
                fileType = fn[i] + fileType;
            }
        }

        fileType.toLowerCase();

        switch (fileType) {
            case 'png':
            case 'jpg':
            case 'jpeg':
            case 'bmp':
            case 'gif':
            case 'dds':
            // case 'mp4':
            case 'ogg':
            case 'ogv':
                return ThreeLoaderFileType.texture;
                break;

            default:
                return fileType as ThreeLoaderFileType;
                break;
        }

    }

    private isAliasInLoader(aAlias: string): boolean {

        // check in cache
        if (this.cache[aAlias]) {
            this.logWarn(`item exists in cache ${aAlias}:`, this.cache[aAlias]);
            return true;
        }

        // check in sets
        for (const key in this.sets) {
            const set = this.sets[key];
            if (!set) continue;
            for (let i = 0; i < set.loadItem.length; i++) {
                const item = set.loadItem[i];
                if (item.alias == aAlias) {
                    this.logWarn(`item exists in loading sets ${aAlias}:`, item);
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Create new loading set and return set id
     */
    createNewSet(aCallback?: Callbacks): number {
        this.setCounter++;
        let setId = this.setCounter;
        this.sets[setId] = {
            loadItem: [],
            callbacks: aCallback ? [aCallback] : [],
            loadCounter: 0
        };
        return setId;
    }

    /**
     * Add any file to set except CubeTexture | Font
     * @param aSetId 
     * @param aItem 
     * @returns 
     */
    addFileToSet(aSetId: number, aItem: LoadItem) {
        if (this.isAliasInLoader(aItem.alias)) {
            throw new Error(`addFileToSet() -> File with same alias (${aItem.alias}) already exists in loader!`);
        }
        this.sets[aSetId].loadItem.push({
            type: aItem.type != null ? aItem.type : this.getFileType(aItem.file),
            alias: aItem.alias,
            file: aItem.file
        });
    }

    /**
     * Load CubeTexture via CubeTextureLoader
     * @param aKey alias
     * @param files [px, nx, py, ny, pz, nz]
     * @returns 
     */
    addCubeTextureToSet(aSetId: number, aAlias: string, aFiles: string[]) {
        if (this.isAliasInLoader(aAlias)) {
            this.logError(`addCubeTextureToSet() -> File with same alias (${aAlias}) already exists in loader!`);
            return;
        }
        // this.loadQueue.push({ type: ResType.cubeTexture, key: aAlias, files: files });
        this.sets[aSetId].loadItem.push({
            type: ThreeLoaderFileType.cubeTexture,
            alias: aAlias,
            files: aFiles
        });
    }

    addFontToSet(aSetId: number, aAlias: string, aFile: string) {
        if (this.isAliasInLoader(aAlias)) {
            this.logError(`addFontToSet() -> File with same alias (${aAlias}) already exists in loader!`);
            return;
        }
        // this.loadQueue.push({ type: ResType.font, key: aAlias, file: aFile });
        this.sets[aSetId].loadItem.push({
            type: ThreeLoaderFileType.font,
            alias: aAlias,
            file: aFile
        });
    }

    /**
     * Load file list
     * @param aSet 
     * @param aCallbacks 
     */
    loadSet(aSet: LoadItem[], aCallbacks: Callbacks) {

        let setId = this.createNewSet(aCallbacks);

        for (let i = 0; i < aSet.length; i++) {
            const item = aSet[i];
            switch (item.type) {

                case ThreeLoaderFileType.cubeTexture:
                    this.addCubeTextureToSet(setId, item.alias, item.files);
                    break;

                case ThreeLoaderFileType.font:
                    this.addFontToSet(setId, item.alias, item.file);

                default:
                    this.addFileToSet(setId, item);
                    break;

            }
        }

        this.startSetLoading(setId);

    }

    /**
     * Start loading of Set
     * @param aSetId 
     * @param aCallback 
     */
    startSetLoading(aSetId: number, aCallback?: Callbacks) {
        let setData = this.sets[aSetId];
        if (aCallback) setData.callbacks.push(aCallback);

        if (setData.loadItem.length <= 0) {
            this.onSetFileFinished(aSetId);
        }

        // start each file
        for (let i = 0; i < setData.loadItem.length; i++) {
            this.loadSetItem(aSetId, setData.loadItem[i]);
        }
    }

    /**
     * Set loading finished
     * @param aSetId 
     * @param aData 
     * @param aError 
     */
    private onSetFileFinished(aSetId: number, aData?: LoadItem, aError?: any) {
        let sd = this.sets[aSetId];
        sd.loadCounter++;

        this.logDebug(`onSetFileFinished ${aError != null ? '(ERROR)' : ''} (${aData?.alias}): `, {
            loadCounter: sd.loadCounter,
            totalFiles: sd.loadItem.length
        });

        if (sd.loadCounter >= sd.loadItem.length) {
            // set loaded
            for (let i = 0; i < sd.callbacks.length; i++) {
                const cb = sd.callbacks[i];
                if (cb.onComplete) cb.onComplete.call(cb.context);
            }
            // clear set
            this.sets[aSetId] = null;
        }
        else {
            for (let i = 0; i < sd.callbacks.length; i++) {
                const cb = sd.callbacks[i];
                if (cb.onProgress) cb.onProgress.call(cb.context, sd.loadCounter / sd.loadItem.length);
            }
        }

    }

    /**
     * Load 1 item from Set
     * @param aSetId 
     * @param aItem 
     */
    private loadSetItem(aSetId: number, aItem: LoadItem) {

        switch (aItem.type) {

            case ThreeLoaderFileType.texture:
                this.loadTexture(aItem.alias, aItem.file, {
                    onComplete: () => {
                        this.onSetFileFinished(aSetId, aItem);
                    },
                    onError: (aError?: any) => {
                        this.onSetFileFinished(aSetId, aItem, aError);
                    }
                });
                break;

            case ThreeLoaderFileType.cubeTexture:
                this.loadCubeTexture(aItem.alias, aItem.files, {
                    onComplete: () => {
                        this.onSetFileFinished(aSetId, aItem);
                    },
                    onError: () => {
                        this.onSetFileFinished(aSetId, aItem);
                    }
                });
                break;

            case ThreeLoaderFileType.hdr:
                this.loadHdr(aItem.alias, aItem.file, {
                    onComplete: () => {
                        this.onSetFileFinished(aSetId, aItem);
                    },
                    onError: () => {
                        this.onSetFileFinished(aSetId, aItem);
                    }
                });
                break;

            case ThreeLoaderFileType.obj:
                this.loadObj(aItem.alias, aItem.file, {
                    onComplete: () => {
                        this.onSetFileFinished(aSetId, aItem);
                    },
                    onError: (aError?: any) => {
                        this.onSetFileFinished(aSetId, aItem, aError);
                    }
                });
                break;

            case ThreeLoaderFileType.fbx:
                this.loadFBX(aItem.alias, aItem.file, {
                    onComplete: () => {
                        this.onSetFileFinished(aSetId, aItem);
                    },
                    onError: (aError?: any) => {
                        this.onSetFileFinished(aSetId, aItem, aError);
                    }
                });
                break;

            case ThreeLoaderFileType.glb:
            case ThreeLoaderFileType.gltf:
                this.loadGLB(aItem.alias, aItem.file, {
                    onComplete: () => {
                        this.onSetFileFinished(aSetId, aItem);
                    },
                    onError: () => {
                        this.onSetFileFinished(aSetId, aItem);
                    }
                });
                break;

            case ThreeLoaderFileType.json:
                this.loadJSON(aItem.alias, aItem.file, {
                    onComplete: () => {
                        this.onSetFileFinished(aSetId, aItem);
                    },
                    onError: () => {
                        this.onSetFileFinished(aSetId, aItem);
                    }
                });
                break;

            case ThreeLoaderFileType.font:
                this.loadFont(aItem.alias, aItem.file, {
                    onComplete: () => {
                        this.onSetFileFinished(aSetId, aItem);
                    },
                    onError: () => {
                        this.onSetFileFinished(aSetId, aItem);
                    }
                });
                break;

            default:
                this.logError('loadByData() -> unknown data type: ' + aItem.type);
                break;
        }

    }

    /**
     * Load texture file
     */
    private loadTexture(aAlias: string, aFile: string, aCallbacks?: Callbacks, aRetryCount = 0) {
        let textureLoader = new THREE.TextureLoader();
        textureLoader.crossOrigin = "Anonymous";
        textureLoader.load(aFile,
            (aTexture: THREE.Texture) => {
                this.logDebug(`loadTexture: Complete (${aAlias}) file(${aFile}):`, aTexture);
                // pre setups
                if (this._params.textureMapping) aTexture.mapping = this._params.textureMapping;
                if (this._params.textureEncoding) aTexture.encoding = this._params.textureEncoding;
                // save to cache
                this.cache[aAlias] = aTexture;
                if (aCallbacks && aCallbacks.onComplete) aCallbacks.onComplete.call(aCallbacks.context);
            },
            (progressEvent) => {
                let p = progressEvent.loaded / progressEvent.total;
                if (aCallbacks && aCallbacks.onProgress) aCallbacks.onProgress.call(aCallbacks.context, p);
            },
            (errorEvent) => {
                const retryMaxCount = this._params.retryCount;
                if (aRetryCount >= retryMaxCount) {
                    this.logError(`loadTexture: ERROR (${aRetryCount} retries):`, errorEvent);
                    if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context, errorEvent);
                }
                else {
                    aRetryCount++;
                    this.logWarn(`loadTexture: Retry ${aRetryCount} (${aAlias})`);
                    setTimeout(() => {
                        this.loadTexture(aAlias, aFile, aCallbacks, aRetryCount);
                    }, 100);
                }
            });
    }

    private loadCubeTexture(aAlias: string, aFiles: string[], aCallbacks?: Callbacks, aRetryCount = 0) {
        let loader = new THREE.CubeTextureLoader();
        loader.crossOrigin = "Anonymous";
        loader.load(aFiles,
            (cubeTexture: THREE.CubeTexture) => {
                // pre sets
                if (this._params.textureMapping) cubeTexture.mapping = this._params.textureMapping;
                if (this._params.textureEncoding) cubeTexture.encoding = this._params.textureEncoding;
                // to cache
                this.cache[aAlias] = cubeTexture;
                this.logDebug(`loadCubeTexture: load complete (${aAlias}):`, cubeTexture);
                if (aCallbacks && aCallbacks.onComplete) aCallbacks.onComplete.call(aCallbacks.context);
            },
            (progressEvent) => {
                let p = progressEvent.loaded / progressEvent.total;
                if (aCallbacks && aCallbacks.onProgress) aCallbacks.onProgress.call(aCallbacks.context, p);
            },
            (errorEvent) => {
                const retryMaxCount = this._params.retryCount;
                if (aRetryCount >= retryMaxCount) {
                    this.logError(`loadCubeTexture: ERROR (${aRetryCount} retries):`, errorEvent);
                    if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context, errorEvent);
                }
                else {
                    aRetryCount++;
                    this.logWarn(`loadCubeTexture: Retry ${aRetryCount} (${aAlias})`);
                    setTimeout(() => {
                        this.loadCubeTexture(aAlias, aFiles, aCallbacks, aRetryCount);
                    }, 100);
                }
            });
    }

    private loadHdr(aAlias: string, aFile: string, aCallbacks?: Callbacks, aRetryCount = 0) {
        let rgbeLoader = new RGBELoader();
        rgbeLoader.crossOrigin = "Anonymous";
        rgbeLoader.load(aFile,
            (textureData: THREE.DataTexture) => {
                // pre sets
                if (this._params.textureMapping) textureData.mapping = this._params.textureMapping;
                if (this._params.textureEncoding) textureData.encoding = this._params.textureEncoding;
                // to cache
                this.cache[aAlias] = textureData;
                this.logDebug(`loadHdr: Complete (${aAlias}) file(${aFile}):`, textureData);
                if (aCallbacks && aCallbacks.onComplete) aCallbacks.onComplete.call(aCallbacks.context);
            },
            (progressEvent) => {
                let p = progressEvent.loaded / progressEvent.total;
                if (aCallbacks && aCallbacks.onProgress) aCallbacks.onProgress.call(aCallbacks.context, p);
            },
            (errorEvent) => {
                const retryMaxCount = this._params.retryCount;
                if (aRetryCount >= retryMaxCount) {
                    this.logError(`loadHdr: ERROR (${aRetryCount} retries):`, errorEvent);
                    if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context, errorEvent);
                }
                else {
                    aRetryCount++;
                    this.logWarn(`loadHdr: Retry ${aRetryCount} (${aAlias})`);
                    setTimeout(() => {
                        this.loadHdr(aAlias, aFile, aCallbacks, aRetryCount);
                    }, 200);
                }
            });
    }

    private loadObj(aAlias: string, aFile: string, aCallbacks?: Callbacks, aRetryCount = 0) {
        let objLoader = new OBJLoader();
        objLoader.crossOrigin = "Anonymous";
        objLoader.load(aFile,
            (aObj: THREE.Group) => {
                this.cache[aAlias] = aObj;
                this.logDebug(`loadObj: Complete (${aAlias}):`, aObj);
                if (aCallbacks && aCallbacks.onComplete) aCallbacks.onComplete.call(aCallbacks.context);
            },
            (progressEvent) => {
                let p = progressEvent.loaded / progressEvent.total;
                if (aCallbacks && aCallbacks.onProgress) aCallbacks.onProgress.call(aCallbacks.context, p);
            },
            (error) => {
                const retryMaxCount = this._params.retryCount;
                if (aRetryCount >= retryMaxCount) {
                    this.logError(`loadObj: ERROR (${aRetryCount} retries):`, error);
                    if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context, error);
                }
                else {
                    aRetryCount++;
                    this.logWarn(`loadObj: Retry ${aRetryCount} (${aAlias})`);
                    setTimeout(() => {
                        this.loadObj(aAlias, aFile, aCallbacks, aRetryCount);
                    }, 100);
                }
            }
        );
    }

    private loadFBX(aAlias: string, aFile: string, aCallbacks?: Callbacks, aRetryCount = 0) {
        let fbxLoader = new FBXLoader();
        fbxLoader.crossOrigin = "Anonymous";
        fbxLoader.load(aFile,
            (aObj: THREE.Group) => {
                this.cache[aAlias] = aObj;
                this.logDebug(`loadFBX: Complete (${aAlias}):`, aObj);
                if (aCallbacks && aCallbacks.onComplete) aCallbacks.onComplete.call(aCallbacks.context);
            },
            (progressEvent) => {
                let p = progressEvent.loaded / progressEvent.total;
                if (aCallbacks && aCallbacks.onProgress) aCallbacks.onProgress.call(aCallbacks.context, p);
            },
            (errorEvent) => {
                const retryMaxCount = this._params.retryCount;
                if (aRetryCount >= retryMaxCount) {
                    this.logError(`loadFBX: ERROR (${aRetryCount} retries):`, errorEvent);
                    if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context, errorEvent);
                }
                else {
                    aRetryCount++;
                    this.logWarn(`loadFBX: Retry ${aRetryCount} (${aAlias})`);
                    setTimeout(() => {
                        this.loadFBX(aAlias, aFile, aCallbacks, aRetryCount);
                    }, 200);
                }
            }
        );
    }

    private loadGLB(aAlias: string, aFile: string, aCallbacks?: Callbacks, aRetryCount = 0) {
        let loader = new GLTFLoader();
        loader.load(aFile,
            (aObj: GLTF) => {
                this.cache[aAlias] = aObj;
                this.logDebug(`loadGLB: load complete (${aAlias}):`, aObj);
                if (aCallbacks && aCallbacks.onComplete) aCallbacks.onComplete.call(aCallbacks.context);
            },
            (progressEvent) => {
                let p = progressEvent.loaded / progressEvent.total;
                if (aCallbacks && aCallbacks.onProgress) aCallbacks.onProgress.call(aCallbacks.context, p);
            },
            (errorEvent) => {
                const retryMaxCount = this._params.retryCount;
                if (aRetryCount >= retryMaxCount) {
                    this.logError(`loadGLB: ERROR (${aRetryCount} retries):`, errorEvent);
                    if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context, errorEvent);
                }
                else {
                    aRetryCount++;
                    this.logWarn(`loadGLB: Retry ${aRetryCount} (${aAlias})`);
                    setTimeout(() => {
                        this.loadGLB(aAlias, aFile, aCallbacks, aRetryCount);
                    }, 200);
                }
            }
        );
    }

    private loadJSONFromUrl(url: string, aCallback: Function) {
        const HEADERS = {
            requestedWith: false,
            json: 'application/json',
            xml: 'application/xml'
        };
        let xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'json';
        xhr.setRequestHeader('X-Requested-With', 'true');
        xhr.setRequestHeader('Accept', HEADERS.json);
        xhr.onload = () => {
            let status = xhr.status;
            if (xhr.readyState === 4 && status >= 400 && status <= 599) { // Handle HTTP status codes of 4xx and 5xx as errors, even if xhr.onerror was not called.
                aCallback(status, xhr.response);
            }
            else {
                aCallback(null, xhr.response);
            }
        };
        xhr.send();
    }

    private loadJSON(aAlias: string, aFile: string, aCallbacks?: Callbacks, aRetryCount = 0) {
        this.loadJSONFromUrl(aFile,
            (aError, aData) => {
                if (aError !== null) {
                    const retryMaxCount = this._params.retryCount;
                    if (aRetryCount >= retryMaxCount) {
                        this.logError(`loadJSON: ERROR (${aRetryCount} retries):`, aError);
                        if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context, aError);
                    }
                    else {
                        aRetryCount++;
                        this.logWarn(`loadJSON: Retry ${aRetryCount} (${aAlias})`);
                        setTimeout(() => {
                            this.loadJSON(aAlias, aFile, aCallbacks, aRetryCount);
                        }, 200);
                    }
                }
                else {
                    this.cache[aAlias] = aData;
                    this.logDebug(`loadJSON: Complete (${aAlias}):`, aData);
                    if (aCallbacks && aCallbacks.onComplete) aCallbacks.onComplete.call(aCallbacks.context);
                }
            }
        );
    }

    private loadFont(aAlias: string, aFile: string, aCallbacks?: Callbacks, aRetryCount = 0) {
        let fontLoader = new FontLoader();
        fontLoader.load(aFile,
            (aFont: Font) => {
                this.cache[aAlias] = aFont;
                this.logDebug(`loadFont: load complete (${aAlias}):`, aFont);
                if (aCallbacks && aCallbacks.onComplete) aCallbacks.onComplete.call(aCallbacks.context);
            },
            (progressEvent) => {
                let p = progressEvent.loaded / progressEvent.total;
                if (aCallbacks && aCallbacks.onProgress) aCallbacks.onProgress.call(aCallbacks.context, p);
            },
            (errorEvent) => {
                const retryMaxCount = this._params.retryCount;
                if (aRetryCount >= retryMaxCount) {
                    this.logError(`loadFont: ERROR (${aRetryCount} retries):`, errorEvent);
                    if (aCallbacks && aCallbacks.onError) aCallbacks.onError.call(aCallbacks.context, errorEvent);
                }
                else {
                    aRetryCount++;
                    this.logWarn(`loadFont: Retry ${aRetryCount} (${aAlias})`);
                    setTimeout(() => {
                        this.loadFont(aAlias, aFile, aCallbacks, aRetryCount);
                    }, 200);
                }
            }
        );
    }

    getTexture(aAlias: string): THREE.Texture {
        let data = this.cache[aAlias];
        if (!data) this.logWarn('getTexture() -> key not found: ' + aAlias);
        return data;
    }

    getCubeTexture(aAlias: string): THREE.CubeTexture {
        let data = this.cache[aAlias];
        if (!data) this.logWarn('getCubeTexture() -> key not found: ' + aAlias);
        return data;
    }

    /**
     * Get model
     */
    getModel(aAlias: string, aGetRealData = false): THREE.Group {
        let data = this.cache[aAlias];

        if (!data) {
            this.logWarn(`getModel() -> key not found: ${aAlias}`);
            return null;
        }

        if (aGetRealData) return data;

        if (data.scene && data.scene instanceof THREE.Group) {
            // glb
            return data.scene.clone(true);
        }
        else {
            // other models
            
            // try to clone
            // let copy = data.clone(true);
            // for (const key in data) {
            //     if (!Object.prototype.hasOwnProperty.call(copy, key)) {
            //         copy[key] = data[key];
            //     }
            // }

            let copy = SkeletonUtils.clone(data);
            return copy as THREE.Group;
        }

    }

    getJSON(aAlias: string): any {
        let data = this.cache[aAlias];
        if (!data) this.logWarn('ThreeLoader.getJSON() key not found: ' + aAlias);
        return data;
    }

    getFont(aAlias: string): Font {
        let font = this.cache[aAlias];
        if (!font) this.logWarn('ThreeLoader.getFont() key not found: ' + aAlias);
        return font;
    }

}