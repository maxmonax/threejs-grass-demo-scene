import * as THREE from 'three';
import { LogMng } from '../../utils/LogMng';
import { ThreeLoader } from '../../utils/threejs/ThreeLoader';
// import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils';

export type PersParams = {
    modelAlias: string,
    thirdPersoneCameraOffset: { x: number, y: number, z: number },
    thirdPersoneCameraLookat: { x: number, y: number, z: number },
    walkSpd: number;
    runSpd: number;
    backSpd: number;
    fallAccel: number;
    sideTurn: {
        walkAngle: number;
        backwalkAngle?: number;
        runAngle: number;
        spdWalk: number;
        spdRun: number;
    },
    rays: {
        forwardLength: number; // length of ray
        forwardBotHeight: number; // height from a bottom of pers
        forwardLevelCount: number; // how many levels use of forward lines
        forwardLevelStepSize: number; // distance between lines

        downLength: number; // length of down ray
        // downHeight: number; // height of a down ray
        downRayDeltaHeight?: number; // inc deltaHeight
        // downCheckHeightFactor?: number;
    },
    camera: {
        orbitCameraHeight: number;
    },
    scale?: number
};

export class Personage extends THREE.Group {
    protected _params: PersParams;
    protected _innerDummy: THREE.Group;
    protected _pers: THREE.Group;
    protected _mixer: THREE.AnimationMixer;
    protected _animations: any; // { 'name': THREE.AnimationClip }
    protected _currAnimName: string;
    // protected _nextAnimName: string;
    protected _animationStartTime: number;
    protected _action: THREE.AnimationAction;

    protected _acceleration: THREE.Vector3;
    protected _decceleration: THREE.Vector3;
    protected _velocity: THREE.Vector3;

    private _sideTurnDir: 0 | -1 | 1 = 0;
    private _sideTurnTimer = 0;


    constructor() {
        super();
        this._innerDummy = new THREE.Group();
        this.add(this._innerDummy);
        this._animations = {};
    }

    protected logDebug(aMsg: string) {
        LogMng.debug(`Personage(class): ${aMsg}`);
    }

    protected logWarn(aMsg: string) {
        LogMng.warn(`Personage(class): ${aMsg}`);
    }

    protected getAnimationTime(): number {
        return Date.now() - this._animationStartTime;
    }

    public get params(): PersParams {
        return this._params;
    }

    get animationName(): string {
        return this._currAnimName;
    }

    get acceleration(): THREE.Vector3 {
        return this._acceleration;
    }

    get decceleration(): THREE.Vector3 {
        return this._decceleration;
    }

    get velocity(): THREE.Vector3 {
        return this._velocity;
    }

    set sideTurnDir(val: 0 | -1 | 1) {
        this._sideTurnDir = val;
    }

    get thirdPersoneCameraOffset(): THREE.Vector3 {
        let xyz = this._params.thirdPersoneCameraOffset;
        return new THREE.Vector3(xyz.x, xyz.y, xyz.z);
    }

    get thirdPersoneCameraLookat(): THREE.Vector3 {
        let xyz = this._params.thirdPersoneCameraLookat;
        return new THREE.Vector3(xyz.x, xyz.y, xyz.z);
    }

    init(aParams: PersParams) {

        this._params = aParams;
        let loader = ThreeLoader.getInstance();

        let model = loader.getModel(this._params.modelAlias, true);

        // this._pers = SkeletonUtils.clone(model) as THREE.Group;
        this._pers = model;

        this._pers['parentObject'] = this;

        this._pers.traverse((obj: THREE.Object3D) => {
            if (obj instanceof THREE.Mesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
                obj['parentObject'] = this;
            }
        });

        let scale = this._params.scale || 1;
        this._pers.scale.set(scale, scale, scale);
        this._innerDummy.add(this._pers);
        this._mixer = new THREE.AnimationMixer(this._pers);

        let factor = 100;
        this._acceleration = new THREE.Vector3(1 * scale, 0.0025, 50 * scale).multiplyScalar(factor);
        this._decceleration = new THREE.Vector3(-0.0005 * scale, -0.0001, -50.0 * scale).multiplyScalar(factor);
        this._velocity = new THREE.Vector3();
    }

    addDebugLine(aColor: number, aPoints: THREE.Vector3[]) {
        const material = new THREE.LineBasicMaterial({
            color: aColor
        });
        const geometry = new THREE.BufferGeometry().setFromPoints(aPoints);
        const line = new THREE.Line(geometry, material);
        this._innerDummy.add(line);
    }

    addAnimation(aParams: {
        animAlias?: string,
        key: string,
        newKey?: string,
        timeScale?: number
    }) {
        let loader = ThreeLoader.getInstance();
        let model = aParams.animAlias != null
            ? loader.getModel(aParams.animAlias, true)
            : this._pers;
        if (!model) {
            this.logWarn(`model == NULL for animation alias: ${aParams.animAlias}`);
            return;
        }
        let anims: any[] = model['animations'];
        if (!anims) {
            this.logWarn(`model.animations == NULL for animation alias: ${aParams.animAlias}`);
            return;
        }
        if (anims.length <= 0) {
            this.logWarn(`model.animations.length == 0 for animation alias: ${aParams.animAlias}`);
            return;
        }

        // let animKey = aParams.newKey || aParams.key;

        // if (this._animations[animKey] != null) {
        //     this.logWarn(`animation already exists, alias: ${aParams.animAlias}`);
        //     return;
        // }

        // let clipAction = this._mixer.clipAction(anims[0]);

        // this._animations[animKey] = {
        //     clip: anims[0],
        //     action: clipAction,
        //     timeScale: aParams.timeScale
        // };
        
        if (aParams.newKey != null) {

            for (let i = 0; i < anims.length; i++) {
                const anim = anims[i];
                if (anim.name == aParams.key) {
                    this._animations[aParams.newKey] = {
                        clip: anim,
                        action: this._mixer.clipAction(anim),
                        timeScale: aParams.timeScale
                    } 
                }
            }

        }

    }

    playAnimation(aName: string, aParams: {
        crossTime?: number
    } = {}) {

        if (this._currAnimName == aName) return;
        // if (this._nextAnimName == aName) return;

        // this.logDebug(`playAnimation() -> animName = ${aName}`);
        
        // if (this._currAnimName == 'falling' && this._nextAnimName == 'idle') {
        //     debugger;
        // }

        if (!this._animations[aName]) {
            this.logWarn(`playAnimation() -> no animation named ${aName}`);
            return;
        }
        let clip = this._animations[aName].clip;
        let newAction = this._animations[aName].action;
        let timeScale = this._animations[aName].timeScale;
        if (!clip) {
            this.logWarn(`playAnimation(): undefined animation name: ${aName}`);
            return;
        }

        if (this._action) {
            const prevAction = this._action;
            newAction.time = 0.0;
            newAction.enabled = true;
            newAction.setEffectiveTimeScale(1.0);
            newAction.setEffectiveWeight(1.0);
            newAction.crossFadeFrom(prevAction, aParams.crossTime ? aParams.crossTime : 0.5, true);
            if (timeScale != null) newAction['timeScale'] = timeScale;
            newAction.play();
        }
        else {
            newAction.play();
        }

        this._animationStartTime = Date.now();
        // this._nextAnimName = aName;
        this._currAnimName = aName;
        this._action = newAction;
    }

    update(dt: number) {
        if (this._mixer) this._mixer.update(dt);

        // turn update
        let turnAn = 0;
        let turnSpd = 1;
        switch (this._currAnimName) {
            
            case 'idle':
                turnSpd = 10;
                break;
            
            case 'walk':
                turnAn = this._params.sideTurn.walkAngle;
                turnSpd = this._params.sideTurn.spdWalk;
                break;
            
            case 'run':
                turnAn = this._params.sideTurn.runAngle;
                turnSpd = this._params.sideTurn.spdRun;
                break;
        
            default:
                break;
        }
        let targetRot = turnAn * this._sideTurnDir;
        this._innerDummy.rotation.z += (targetRot - this._innerDummy.rotation.z) * turnSpd * dt;

    }

}