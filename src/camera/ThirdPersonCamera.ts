import * as THREE from 'three';
import { Personage } from '../game/personage/Personage';

export class ThirdPersonCamera {

    private _camera: THREE.PerspectiveCamera;
    private _cameraTarget: THREE.Vector3;
    private _pers: Personage;
    private _currentPosition: THREE.Vector3;
    private _isActive = false;

    constructor(aParams: {
        camera: THREE.PerspectiveCamera,
        cameraTarget: THREE.Vector3,
        pers: Personage,
    }) {
        this._camera = aParams.camera;
        this._cameraTarget = aParams.cameraTarget;
        this._pers = aParams.pers;
        this._currentPosition = this._camera.position.clone();
        this.isActive = true;
    }

    public get isActive(): boolean {
        return this._isActive;
    }

    public set isActive(aVal: boolean) {
        this._isActive = aVal;
    }

    public set personage(aPers: Personage) {
        this._pers = aPers;
    }

    private _calculateIdealOffset() {
        const idealOffset = this._pers.thirdPersoneCameraOffset.clone();
        idealOffset.applyQuaternion(this._pers.quaternion);
        idealOffset.add(this._pers.position);
        return idealOffset;
    }

    private _calculateIdealLookat() {
        const idealLookat = this._pers.thirdPersoneCameraLookat.clone();
        idealLookat.applyQuaternion(this._pers.quaternion);
        idealLookat.add(this._pers.position);
        return idealLookat;
    }

    setCurrentPosToCameraPos() {
        this._currentPosition.copy(this._camera.position);
    }

    setCameraToPosition() {
        const idealOffset = this._calculateIdealOffset();
        this._currentPosition.copy(idealOffset);
        this._camera.position.copy(this._currentPosition);
    }

    setCameraTargetToPosition() {
        const idealLookat = this._calculateIdealLookat();
        this._cameraTarget.copy(idealLookat);
    }

    setCameraLookat() {
        const idealLookat = this._calculateIdealLookat();
        this._cameraTarget.copy(idealLookat);
        this._camera.lookAt(this._cameraTarget);
    }

    update(dt: number) {

        if (!this._isActive) return;
        if (!this._pers) return;

        const idealOffset = this._calculateIdealOffset();
        const idealLookat = this._calculateIdealLookat();

        // const t = 0.05;
        // const t = 4.0 * timeElapsed;
        const t = 1.0 - Math.pow(0.01, dt);
        const t2 = 1.0 - Math.pow(0.1, dt);

        this._currentPosition.lerp(idealOffset, t2);
        this._cameraTarget.lerp(idealLookat, t2);
        this._camera.position.copy(this._currentPosition);
        this._camera.lookAt(this._cameraTarget);

    }

}