import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Personage } from "./Personage";
import { InputMng } from '../../utils/input/InputMng';
import { ThirdPersonCamera } from '../../camera/ThirdPersonCamera';
import { MyMath } from '../../utils/MyMath';
import { Settings } from '../data/Settings';


type CameraOrbitControlParams = {
    domElement: any;
    camera: THREE.Camera;
    minDist: number;
    maxDist: number;
    cameraTarget: THREE.Vector3;
};

type Params = {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    cameraTarget: THREE.Vector3;
    pers: Personage;
    orbitParams: CameraOrbitControlParams;
    colliders: THREE.Object3D[]
};
                        
export class PersonageController {
                            
    private _params: Params;
    private _pers: Personage;
    private _colliders: THREE.Object3D[] = [];
    private _thirdPersonCamera: ThirdPersonCamera;
    private _orbitControl: OrbitControls;
    private _isDebugMode = false;

    // TODO: controls
    private _controls = {
        forwardKeys: ['KeyW'],
        backwardKeys: ['KeyS']
    };

    // work params
    // private _currSpdForward = 0;
    private _velocity = { x: 0, y: 0, z: 0 };
    private _fallingTime = 0;
    // private _sideTurnDir = 0;
    private _cameraState = 'orbit';

    // debug
    debugArrows: THREE.ArrowHelper[];


    constructor(aParams: Params) {

        this._params = aParams;
        this._pers = aParams.pers;
        // this._pers.params = aParams.persParams;

        this._thirdPersonCamera = new ThirdPersonCamera({
            camera: aParams.camera,
            cameraTarget: aParams.cameraTarget,
            pers: this._pers
        });
        // this._thirdPersonCamera.setCameralookat();
        // this._thirdPersonCamera.setCameraTargetToPosition();
        // this._thirdPersonCamera.setCurrentPosToCameraPos();

        // let orbitCamTarget = this._pers.position.clone();
        // orbitCamTarget.y += this._pers.params.camera.orbitCameraHeight; // 150 * WORLD_CONFIG.MCP_SCALE;
        // this._params.cameraTarget.copy(orbitCamTarget);

        this.createOrbitControl({
            domElement: this._params.orbitParams.domElement,
            camera: this._params.orbitParams.camera,
            minDist: this._params.orbitParams.minDist,
            maxDist: this._params.orbitParams.maxDist,
            cameraTarget: this._params.cameraTarget
        });

        this._colliders = aParams.colliders;

    }

    private createOrbitControl(aParams: CameraOrbitControlParams) {
        this._orbitControl = new OrbitControls(aParams.camera, aParams.domElement);
        // if (!aParams.noTarget) this._orbitControl.target = new THREE.Vector3();
        // this._orbitControl.enabled = !(aParams.isOrbitLock == true);
        this._orbitControl.enabled = false;
        this._orbitControl.rotateSpeed = 0.4;
        this._orbitControl.enableDamping = true;
        this._orbitControl.dampingFactor = 0.1;
        // this._orbitControl.zoomSpeed = ZOOM_SPEED;
        this._orbitControl.enablePan = false; // aParams.enablePan == true;
        // this._orbitControl.enableKeys = false;
        this._orbitControl.minDistance = aParams.minDist;
        this._orbitControl.maxDistance = aParams.maxDist;
        let an = MyMath.toRadian(70);
        this._orbitControl.minPolarAngle = an;// Math.PI / 2.5;
        this._orbitControl.maxPolarAngle = Math.PI / 1.9;// - an;
        this._orbitControl.target = aParams.cameraTarget;
        // this._orbitControl.update();
    }

    // public get persParams(): PersParams {
    //     return this._pers.params;
    // }

    public set personage(aPers: Personage) {
        this._pers = aPers;
        this._thirdPersonCamera.personage = this._pers;
    }
    
    public get personage(): Personage {
        return this._pers;
    }

    public set isDebugMode(aValue: boolean) {
        this._isDebugMode = aValue;
    }

    public get isDebugMode(): boolean {
        return this._isDebugMode;
    }
    
    private clearDebugArrows() {
        for (let i = 0; i < this.debugArrows?.length; i++) {
            const arrow = this.debugArrows[i];
            this._params.scene.remove(arrow);
        }
        this.debugArrows = [];
    }

    private addDebugArrow(dir, pos, dist, color) {
        let arrow = new THREE.ArrowHelper(dir, pos, dist, 0x00ff00);
        this._params.scene.add(arrow);
        this.debugArrows.push(arrow);
    }

    update(dt: number) {

        const forwardRaysData = [
            { dist: this._pers.params.rays.forwardLength }, // .METER_SIZE / 3, },
            {
                dist: this._pers.params.rays.forwardLength,
                angle: Math.PI / 6,
                axis: new THREE.Vector3(0, 1, 0)
            },
            {
                dist: this._pers.params.rays.forwardLength,
                angle: -Math.PI / 6,
                axis: new THREE.Vector3(0, 1, 0)
            },
            {
                dist: this._pers.params.rays.forwardLength,
                angle: -Math.PI / 6,
                axis: new THREE.Vector3(1, 0, 0)
            }
        ];

        let inputMng = InputMng.getInstance();
        let keys = {};
        let moveBlocked = false;
        let inAir = false;
        // let inAirHeight = 0;
        let falling = false;

        this.clearDebugArrows();

        // read keys
        if (inputMng.isKeyDown('KeyW')) keys['forward'] = true;
        if (inputMng.isKeyDown('KeyS')) keys['backward'] = true;
        if (keys['forward'] && keys['backward']) keys['forward'] = keys['backward'] = false;
        if (inputMng.isKeyDown('KeyA')) keys['left'] = true;
        else if (inputMng.isKeyDown('KeyD')) keys['right'] = true;
        if (keys['left'] && keys['right']) keys['left'] = keys['right'] = false;
        if (inputMng.isKeyDown('Space')) keys['jump'] = true;
        if (inputMng.isKeyDown('ShiftLeft')) keys['shift'] = true;
        const isShift = keys['shift'] == true;

        // check move collisions

        for (let step = 0; step < this._pers.params.rays.forwardLevelCount; step++) {

            // const deltaHeight = Config.METER_SIZE / 2.2 + step * Config.METER_SIZE / 3.2;
            const rayHeight = this._pers.params.rays.forwardBotHeight + step * this._pers.params.rays.forwardLevelStepSize;

            for (let i = 0; i < forwardRaysData.length; i++) {
                const rData = forwardRaysData[i];
                let rayPos = this._pers.position.clone();
                rayPos.y += rayHeight;
                let dir = new THREE.Vector3(0, 0, 1);
                // this._pers.getWorldDirection(dir);
                if (rData.angle && rData.axis) dir.applyAxisAngle(rData.axis, rData.angle);
                dir.applyQuaternion(this._pers.quaternion);
                if (keys['backward'] == true) dir.negate();

                if (this._isDebugMode) this.addDebugArrow(dir, rayPos, rData.dist, 0x00ff00);

                let raycaster = new THREE.Raycaster(rayPos, dir);
                // moveRaycasters.push(raycaster);

                // move check
                const intersect = raycaster.intersectObjects(this._colliders, true);
                moveBlocked = intersect.length > 0 && intersect[0].distance <= rData.dist;
                if (moveBlocked) break;
            }

            if (moveBlocked) break;

        }

        // check down rays

        const rayPos = this._pers.position.clone();
        rayPos.y += this._pers.params.rays.downLength + (this._pers.params.rays.downRayDeltaHeight || 0);
        let dirDown = new THREE.Vector3(0, -1, 0);
        let raycasterDown = new THREE.Raycaster(rayPos, dirDown);
        const downCheckHeight = this._pers.params.rays.downLength;

        // debug arrows
        if (this._isDebugMode) this.addDebugArrow(dirDown, rayPos, downCheckHeight, 0x00ff00);

        const intersectDown = raycasterDown.intersectObjects(this._colliders, true);

        if (intersectDown.length > 0) {
            let intersect = intersectDown[0];
            let dist = intersect.distance;

            if (dist > downCheckHeight * 1.05) {
                // in air
                inAir = true;
            }
            else {
                this._pers.position.y += (downCheckHeight - dist) / 3;
            }
        }
        else {
            // falling
            keys['jump'] = false;
        }

        if (moveBlocked) {
            keys['forward'] = false;
            keys['backward'] = false;
            this._velocity.z = 0;
        }

        // check falling
        falling = (inAir && this._velocity.y < 0);
        if (falling) this._fallingTime += dt;
        else this._fallingTime = 0;

        const controlObject = this._pers;
        const _Q = new THREE.Quaternion();
        const _A = new THREE.Vector3();
        const _R = controlObject.quaternion.clone();

        let acc = this._pers.acceleration.clone();
        let decel = this._pers.decceleration.clone();

        let maxSpdForward = this._pers.params.walkSpd;

        if (isShift) {
            acc.multiplyScalar(2.0);
            maxSpdForward = this._pers.params.runSpd;
        }

        // calculate velocity (x - side, y - up, z - front)

        if (keys['forward'] == true) {

            if (this._velocity.z <= maxSpdForward) {
                // velocity.z += acc.z * dt;
                this._velocity.z += acc.z * dt;
                if (this._velocity.z > maxSpdForward) this._velocity.z = maxSpdForward;
            }
            else {
                // velocity.z += decel.z * dt;
                this._velocity.z += decel.z * dt;
            }
            // velocity.z += acc.z * dt;
            // let newSpd = Math.min(velocity.z, currSpdForward);
            // velocity.z = this._currSpdForward;

        }
        else if (keys['backward'] == true) {

            // velocity.z -= acc.z * dt;
            // velocity.z = -this._pers.params.backSpd;
            this._velocity.z = -this._pers.params.backSpd;

        }
        else {
            this._velocity.z *= 0.9;
            if (this._velocity.z <= 0.1) this._velocity.z = 0;
        }

        if (inAir) {
            this._velocity.y -= dt * this._pers.params.fallAccel;
        }
        else {
            if (keys['jump']) this._velocity.y = 0;
            else this._velocity.y = 0;
        }

        let sideTurnDir: 0 | -1 | 1 = 0;

        if (keys['left'] == true) {
            _A.set(0, 1, 0);
            let an = 2.0 * Math.PI * dt * this._pers.acceleration.y;
            if (keys['backward']) an = -an;
            _Q.setFromAxisAngle(_A, an);
            _R.multiply(_Q);
            // this.pers.playAnimation('turnLeft');
            sideTurnDir = -1;
        }
        if (keys['right'] == true) {
            _A.set(0, 1, 0);
            let an = 2.0 * -Math.PI * dt * this._pers.acceleration.y;
            if (keys['backward']) an = -an;
            _Q.setFromAxisAngle(_A, an);
            _R.multiply(_Q);
            // this.pers.playAnimation('turnRight');
            sideTurnDir = 1;
        }

        this._pers.sideTurnDir = sideTurnDir;

        controlObject.quaternion.copy(_R);

        const forwardVelocity = new THREE.Vector3(0, 0, 1);
        forwardVelocity.applyQuaternion(controlObject.quaternion);
        forwardVelocity.normalize();
        forwardVelocity.multiplyScalar(this._velocity.z * dt);
        
        // const sideways = new THREE.Vector3(1, 0, 0);
        // sideways.applyQuaternion(controlObject.quaternion);
        // sideways.normalize();
        // sideways.multiplyScalar(this._velocity.x * dt);

        const upVelocity = new THREE.Vector3(0, 1, 0);
        upVelocity.applyQuaternion(controlObject.quaternion);
        upVelocity.normalize();
        upVelocity.multiplyScalar(this._velocity.y);

        // let totalVelocity = forward.clone().add(sideways).add(up);
        let totalVelocity = forwardVelocity.clone().add(upVelocity);

        controlObject.position.add(totalVelocity);


        // animations

        if (this._velocity.y > 0 || (inAir && this._pers.animationName == 'falling') || this._fallingTime >= 0.1) {
            // just for test
            // this._pers.playAnimation('falling', { crossTime: 0.1 });
            this._pers.playAnimation('falling');
        }
        else {
            if (keys['forward'] == true) {
                if (isShift) this._pers.playAnimation('run')
                else this._pers.playAnimation('walk');
            }
            else if (keys['backward'] == true) {
                this._pers.playAnimation('backWalk');
            }
            else {
                this._pers.playAnimation('idle');
            }
        }

        let newCamState = (keys['forward'] == true || keys['backward'] == true)
            ? 'pers'
            : 'orbit';

        switch (this._cameraState) {

            case 'pers':

                // debugger;
                this._thirdPersonCamera.update(dt);

                if (newCamState == 'orbit') {
                    // this._orbitControl.target = orbitCamTarget;
                    this._orbitControl.enabled = true;
                }

                break;

            case 'orbit':

                // orbit camera

                if (!this._orbitControl.enabled) this._orbitControl.enabled = true;

                let orbitCamTarget = this._pers.position.clone();
                orbitCamTarget.y += this._pers.params.camera.orbitCameraHeight; // 150 * WORLD_CONFIG.MCP_SCALE;

                const t = 1.0 - Math.pow(0.1, dt);

                this._params.cameraTarget.lerp(orbitCamTarget, t);

                if (this._orbitControl.enabled) {
                    // this._orbitControl.target = orbitCamTarget;
                    this._orbitControl.update();
                }

                if (newCamState == 'pers') {
                    this._orbitControl.enabled = false;
                    this._thirdPersonCamera.setCurrentPosToCameraPos();
                }

                break;
        }

        this._cameraState = newCamState;

        
        if (this.isDebugMode) {
            // for (let i = 0; i < debugArrows.length; i++) {
            //     const arrow = debugArrows[i];
            //     this.debugArrows.push(arrow);
            //     this.scene.add(arrow);
            // }
        }

    }

}