import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { LogMng } from "../../utils/LogMng";
import { BasicScene } from "./BasicScene";
import { DeviceInfo } from "../../utils/DeviceInfo";
import { ThreeLoader } from "../../utils/threejs/ThreeLoader";
import { TextureAlias } from "../data/TextureData";
// shaders
import skyVertex from '../shaders/sky/vert.glsl';
import skyFragment from '../shaders/sky/frag.glsl';
import grassVertex from '../shaders/grass/vert.glsl';
import grassFragment from '../shaders/grass/frag.glsl';
import { groundVertexPrefix } from "../shaders/ground/vertPrefix";
import { InputMng } from "../../utils/input/InputMng";
import { DebugGui } from "../debug/DebugGui";
import { MyMath } from "../../utils/MyMath";
import { PersFactory } from "../personage/PersFactory";
import { Personage } from "../personage/Personage";
import { PersonageController } from "../personage/PersonageController";
import { Config } from "../data/Config";
import { ThreejsUtils } from "../../utils/threejs/ThreejsUtils";
import { Settings } from "../data/Settings";

// Based on:
// "Realistic real-time grass rendering" by Eddie Lee, 2010
// https://www.eddietree.com/grass
// https://en.wikibooks.org/wiki/GLSL_Programming/Unity/Translucent_Surfaces

// There are two scenes: one for the sky/sun and another for the grass.
// The sky is rendered without depth information on a plane geometry that fills the screen.
// Automatic clearing is disabled and after the sky has been rendered, we draw the grass scene on top of the background.
// Both scenes share a camera and light direction information.

// variables for blade mesh
var joints = 4;
var bladeWidth = 0.12;
var bladeHeight = 1;

//Patch side length
var width = 100;
//Number of vertices on ground plane side
var resolution = 64;
//Distance between two ground plane vertices
var delta = width / resolution;
//Radius of the sphere onto which the ground plane is bent
var radius = 240;
//User movement speed
var speed = 3;

//The global coordinates
//The geometry never leaves a box of width*width around (0, 0)
//But we track where in space the camera would be globally
var pos = new THREE.Vector2(0.0, 0.0);

//Number of blades
var instances = 20000;
if (!DeviceInfo.getInstance().desktop) {
    instances = 7000;
    width = 50;
}

//Sun
//Height over horizon in range [0, PI/2.0]
var elevation = Math.PI / 8;
//Rotation around Y axis in range [0, 2*PI]
var azimuth = 0.4;

var fogFade = 0.009;

//Lighting variables for grass
var ambientStrength = 0.7;
var translucencyStrength = 1.5;
var specularStrength = 0.5;
var diffuseStrength = 1.5;
var shininess = 256;
var sunColour = new THREE.Vector3(1.0, 1.0, 1.0);
var specularColour = new THREE.Vector3(1.0, 1.0, 1.0);

// Camera rotate
let rotate = false;

// Initialise three.js. There are two scenes which are drawn after one another with clear() called manually at the start of each frame
// Sky scene
let backgroundScene: THREE.Scene;
// Grass scene
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
// camera
let distance = 1500;
let FOV = 45;//2 * Math.atan(window.innerHeight / distance) * 180 / Math.PI;
let camera: THREE.PerspectiveCamera;

let controls: OrbitControls;

// Get alpha map and blade texture
// These have been taken from "https://cdn.skypack.dev/Realistic real-time grass rendering" by Eddie Lee, 2010
var grassTexture;
var alphaMap;
var noiseTexture;

let backgroundMaterial: THREE.ShaderMaterial;

var groundBaseGeometry;
var groundGeometry;
var groundShader;
var groundMaterial;
var ground;

//Define the material, specifying attributes, uniforms, shaders etc.
var grassMaterial: THREE.RawShaderMaterial;
var grassBaseGeometry;

// Define the bend of the grass blade as the combination of three quaternion rotations
let vertex = new THREE.Vector3();
let quaternion0 = new THREE.Quaternion();
let quaternion1 = new THREE.Quaternion();
let x, y, z, w, angle, sinAngle, rotationAxis;

let viewDirection = new THREE.Vector3();
let upVector = new THREE.Vector3(0, 1, 0);

let forward = false;
let backward = false;
let left = false;
let right = false;
let isShift = false;

var time = 0;

let helper;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

export class GameScene extends BasicScene {
    private cameraTarget: THREE.Vector3;
    private currPers: Personage;
    private personageController: PersonageController;
    private colliders: THREE.Object3D[] = [];

    protected initScenes() {
        backgroundScene = new THREE.Scene();
        scene = new THREE.Scene();
    }

    protected initCamera() {

        this.cameraTarget = new THREE.Vector3();

        camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 1, 20000);
        camera.position.set(-14, 8, 28);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        scene.add(camera);
        // backgroundScene.add(camera);

    }

    protected initRender() {
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.autoClear = false;
        this._params.canvasParent.appendChild(renderer.domElement);
    }

    logDebug(aMsg: string, aData?: any): void {
        LogMng.debug(`GameScene -> ${aMsg}`, aData);
    }
    logWarn(aMsg: string, aData?: any): void {
        LogMng.warn(`GameScene -> ${aMsg}`, aData);
    }
    logError(aMsg: string, aData?: any): void {
        LogMng.error(`GameScene -> ${aMsg}`, aData);
    }

    init(aDomCanvasParent: HTMLElement) {
        super.init();
        this.initOrbit(aDomCanvasParent);
        this.initTextures();
        this.initSky();
        this.initGround();
        this.initGrass();
        this.initKeyboard();
        // this.initPersonage();
        // if (Settings.isDebugMode) this.initDebug();
    }

    // OrbitControls.js for camera manipulation
    private initOrbit(domCanvasParent: HTMLElement) {
        controls = new OrbitControls(camera, domCanvasParent);
        controls.autoRotate = rotate;
        controls.autoRotateSpeed = 1.0;
        
        controls.minDistance = 5;
        controls.maxDistance = 40;
        if (!DeviceInfo.getInstance().desktop) controls.maxDistance = 30.0;

        // controls.rotateSpeed = 0.4;
        controls.enableDamping = true;
        // controls.dampingFactor = 0.1;
        controls.enablePan = false;

        // controls.minPolarAngle = MyMath.toRadian(30);
        controls.maxPolarAngle = Math.PI - MyMath.toRadian(90);
        // controls.target = aParams.cameraTarget;

        controls.update();
    }

    private initTextures() {
        let loader = ThreeLoader.getInstance();
        grassTexture = loader.getTexture(TextureAlias.blade_diffuse);
        alphaMap = loader.getTexture(TextureAlias.blade_alpha);
        noiseTexture = loader.getTexture(TextureAlias.perlinFbm);
        noiseTexture.wrapS = THREE.RepeatWrapping;
        noiseTexture.wrapT = THREE.RepeatWrapping;
    }

    private initSky() {

        // Light for ground plane
        let ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambientLight);

        let dirLight = new THREE.DirectionalLight(0xffffff, .4);
        dirLight.position.set(Math.sin(azimuth) * 20, Math.sin(elevation) * 20, -Math.cos(azimuth) * 20);
        scene.add(dirLight);

        // let dirLightHepler = new THREE.DirectionalLightHelper(dirLight, 6);
        // scene.add(dirLightHepler);

        //https://discourse.threejs.org/t/how-do-i-use-my-own-custom-shader-as-a-scene-background/13598/2
        backgroundMaterial = new THREE.ShaderMaterial({
            uniforms: {
                sunDirection: { value: new THREE.Vector3(Math.sin(azimuth), Math.sin(elevation), -Math.cos(azimuth)) },
                resolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
                fogFade: { value: fogFade },
                fov: { value: FOV }
            },
            vertexShader: skyVertex,
            fragmentShader: skyFragment
        });

        backgroundMaterial.depthWrite = false;
        var backgroundGeometry = new THREE.PlaneGeometry(2, 2, 1, 1);
        var background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
        backgroundScene.add(background);
    }

    private initGround() {

        //Ground material is a modification of the existing THREE.MeshPhongMaterial rather than one from scratch
        groundBaseGeometry = new THREE.PlaneGeometry(width, width, resolution, resolution);
        groundBaseGeometry.lookAt(new THREE.Vector3(0, 1, 0));
        (groundBaseGeometry as any).verticesNeedUpdate = true;

        groundGeometry = new THREE.PlaneGeometry(width, width, resolution, resolution);
        groundGeometry.setAttribute('basePosition', groundBaseGeometry.getAttribute('position'));
        groundGeometry.lookAt(new THREE.Vector3(0, 1, 0));
        (groundBaseGeometry as any).verticesNeedUpdate = true;
        groundMaterial = new THREE.MeshLambertMaterial({
            color: new THREE.Color("rgb(10%, 25%, 2%)"),
            side: THREE.DoubleSide
        });

        groundMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.delta = { value: delta };
            shader.uniforms.posX = { value: pos.x };
            shader.uniforms.posZ = { value: pos.y };
            shader.uniforms.radius = { value: radius };
            shader.uniforms.width = { value: width };
            shader.uniforms.noiseTexture = { value: noiseTexture };
            shader.vertexShader = groundVertexPrefix + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(
                '#include <beginnormal_vertex>',
                `//https://dev.to/maurobringolf/a-neat-trick-to-compute-modulo-of-negative-numbers-111e
                vec3 pos = vec3(0);
                pos.x = basePosition.x - mod(mod((delta*posX),delta) + delta, delta);
                pos.z = basePosition.z - mod(mod((delta*posZ),delta) + delta, delta);
                pos.y = max(0.0, placeOnSphere(pos)) - radius;
                pos.y += getYPosition(vec2(basePosition.x+delta*floor(posX), basePosition.z+delta*floor(posZ)));
                vec3 objectNormal = getNormal(pos);
                #ifdef USE_TANGENT
                    vec3 objectTangent = vec3( tangent.xyz );
                #endif`
            );
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `vec3 transformed = vec3(pos);`
            );
            groundShader = shader;
        };

        ground = new THREE.Mesh(groundGeometry, groundMaterial);

        ground.geometry.computeVertexNormals();
        scene.add(ground);

        this.colliders.push(ground);

    }

    private initGrass() {

        // Define base geometry that will be instanced. We use a plane for an individual blade of grass
        grassBaseGeometry = new THREE.PlaneGeometry(bladeWidth, bladeHeight, 1, joints);
        grassBaseGeometry.translate(0, bladeHeight / 2, 0);

        // Rotate around Y
        angle = 0.05;
        sinAngle = Math.sin(angle / 2.0);
        rotationAxis = new THREE.Vector3(0, 1, 0);
        x = rotationAxis.x * sinAngle;
        y = rotationAxis.y * sinAngle;
        z = rotationAxis.z * sinAngle;
        w = Math.cos(angle / 2.0);
        quaternion0.set(x, y, z, w);

        // Rotate around X
        angle = 0.5;
        sinAngle = Math.sin(angle / 2.0);
        rotationAxis.set(1, 0, 0);
        x = rotationAxis.x * sinAngle;
        y = rotationAxis.y * sinAngle;
        z = rotationAxis.z * sinAngle;
        w = Math.cos(angle / 2.0);
        quaternion1.set(x, y, z, w);

        // combine rotations to a single quaternion
        quaternion0.multiply(quaternion1);

        // Rotate around Z
        angle = 0.1;
        sinAngle = Math.sin(angle / 2.0);
        rotationAxis.set(0, 0, 1);
        x = rotationAxis.x * sinAngle;
        y = rotationAxis.y * sinAngle;
        z = rotationAxis.z * sinAngle;
        w = Math.cos(angle / 2.0);
        quaternion1.set(x, y, z, w);

        // combine rotations to a single quaternion
        quaternion0.multiply(quaternion1);

        let quaternion2 = new THREE.Quaternion();

        // Bend grass base geometry for more organic look
        for (let v = 0; v < grassBaseGeometry.attributes.position.array.length; v += 3) {
            quaternion2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
            vertex.x = grassBaseGeometry.attributes.position.array[v];
            vertex.y = grassBaseGeometry.attributes.position.array[v + 1];
            vertex.z = grassBaseGeometry.attributes.position.array[v + 2];
            let frac = vertex.y / bladeHeight;
            quaternion2.slerp(quaternion0, frac);
            vertex.applyQuaternion(quaternion2);
            (grassBaseGeometry as any).attributes.position.array[v] = vertex.x;
            (grassBaseGeometry as any).attributes.position.array[v + 1] = vertex.y;
            (grassBaseGeometry as any).attributes.position.array[v + 2] = vertex.z;
        }

        grassBaseGeometry.computeVertexNormals();

        let instancedGeometry = new THREE.InstancedBufferGeometry();

        instancedGeometry.index = grassBaseGeometry.index;
        instancedGeometry.attributes.position = grassBaseGeometry.attributes.position;
        instancedGeometry.attributes.uv = grassBaseGeometry.attributes.uv;
        instancedGeometry.attributes.normal = grassBaseGeometry.attributes.normal;

        // Each instance has its own data for position, orientation and scale
        var indices = [];
        var offsets = [];
        var scales = [];
        var halfRootAngles = [];

        // For each instance of the grass blade
        for (let i = 0; i < instances; i++) {

            indices.push(i / instances);

            // offset of the roots
            x = Math.random() * width - width / 2;
            z = Math.random() * width - width / 2;
            y = 0;
            offsets.push(x, y, z);

            // random orientation
            let angle = Math.PI - Math.random() * (2 * Math.PI);
            halfRootAngles.push(Math.sin(0.5 * angle), Math.cos(0.5 * angle));

            // Define variety in height
            if (i % 3 != 0) {
                scales.push(2.0 + Math.random() * 1.5);
            } else {
                scales.push(2.0 + Math.random());
            }
        }

        var offsetAttribute = new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3);
        var scaleAttribute = new THREE.InstancedBufferAttribute(new Float32Array(scales), 1);
        var halfRootAngleAttribute = new THREE.InstancedBufferAttribute(new Float32Array(halfRootAngles), 2);
        var indexAttribute = new THREE.InstancedBufferAttribute(new Float32Array(indices), 1);

        instancedGeometry.setAttribute('offset', offsetAttribute);
        instancedGeometry.setAttribute('scale', scaleAttribute);
        instancedGeometry.setAttribute('halfRootAngle', halfRootAngleAttribute);
        instancedGeometry.setAttribute('index', indexAttribute);

        grassMaterial = new THREE.RawShaderMaterial({
            uniforms: {
                time: { value: 0 },
                bladeHeight: { value: bladeHeight },
                delta: { value: delta },
                posX: { value: pos.x },
                posZ: { value: pos.y },
                radius: { value: radius },
                width: { value: width },
                map: { value: grassTexture },
                alphaMap: { value: alphaMap },
                noiseTexture: { value: noiseTexture },
                sunDirection: { value: new THREE.Vector3(Math.sin(azimuth), Math.sin(elevation), -Math.cos(azimuth)) },
                cameraPosition: { value: camera.position },
                ambientStrength: { value: ambientStrength },
                translucencyStrength: { value: translucencyStrength },
                diffuseStrength: { value: diffuseStrength },
                specularStrength: { value: specularStrength },
                shininess: { value: shininess },
                lightColour: { value: sunColour },
                specularColour: { value: specularColour },
            },
            vertexShader: grassVertex,
            fragmentShader: grassFragment,
            side: THREE.DoubleSide,
            // wireframe: true
        });

        var grass = new THREE.Mesh(instancedGeometry, grassMaterial);
        scene.add(grass);
    }

    private initKeyboard() {
        let input = InputMng.getInstance({
            desktop: DeviceInfo.getInstance().desktop,
            inputDomElement: this._params.canvasParent,
            isRightClickProcessing: false
        });
        input.onKeyDownSignal.add(this.onKeyDown, this);
        input.onKeyUpSignal.add(this.onKeyUp, this);

    }

    private initPersonage() {

        let startPos = {
            x: 0, y: 0, z: 0
        };
        // this.currPers = PersFactory.createRandomMCPPers(startPos);
        this.currPers = PersFactory.createShibainu(startPos);

        this.personageController = new PersonageController({
            scene: scene,
            camera: camera,
            cameraTarget: this.cameraTarget,
            pers: this.currPers,

            orbitParams: {
                camera: camera,
                cameraTarget: this.cameraTarget,
                domElement: this._params.canvasParent,
                minDist: Config.METER_SIZE * 4,
                maxDist: Config.METER_SIZE * 6
            },

            colliders: this.colliders

        });

        scene.add(this.currPers);

    }

    private initDebug() {
        var gui = DebugGui.getInstance().gui;
        // gui.add(this, 'radius').min(85).max(1000).step(5);
        // gui.add(this, 'speed').min(0.5).max(10).step(0.01);
        // gui.add(this, 'elevation').min(0.0).max(Math.PI / 2.0).step(0.01).listen().onChange(function (value) { updateSunPosition(); });
        // gui.add(this, 'azimuth').min(0.0).max(Math.PI * 2.0).step(0.01).listen().onChange(function (value) { updateSunPosition(); });
        // gui.add(this, 'fogFade').min(0.001).max(0.01).step(0.0001).listen().onChange(function (value) { backgroundMaterial.uniforms.fogFade.value = fogFade; });
        gui.close();
    }

    private cross(a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    }

    //Find the height of the spherical world at given x,z position
    private placeOnSphere(v) {
        let theta = Math.acos(v.z / radius);
        let phi = Math.acos(v.x / (radius * Math.sin(theta)));
        let sV = radius * Math.sin(theta) * Math.sin(phi);
        //If undefined, set to default value
        if (sV != sV) {
            sV = v.y;
        }
        return sV;
    }

    private onKeyDown(aCode: string, aKey: string) {
        switch (aCode) {
            case 'KeyW':
            case 'ArrowUp':
                forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                backward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                right = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                isShift = true;
                break;
            default:
                this.logDebug(`onKeyDown: ${aCode}`);
                break;
                
        }
    }

    private onKeyUp(aCode: string, aKey: string) {
        switch (aCode) {
            case 'KeyW':
            case 'ArrowUp':
                forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                backward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                right = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                isShift = false;
                break;
        }
    }

    onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        renderer.setSize(window.innerWidth, window.innerHeight);
        backgroundMaterial.uniforms.resolution.value = new THREE.Vector2(innerWidth, innerHeight);
        camera.fov = FOV;
        camera.updateProjectionMatrix();
        backgroundMaterial.uniforms.fov.value = FOV;
    }

    private getPositionByHighMap(p: { x, y }): { y: number } {
        let tx = p.x + 512 / 2;
        let ty = p.y + 512 / 2;
        // return 8 * (2 * texture2D(noiseTexture, p / 800.0).r - 1.0);

        let imagedata = ThreejsUtils.getImageData(noiseTexture.image);
        let px = {
            x: Math.round(tx),
            y: Math.round(ty)
        };

        while (px.x > imagedata.width) px.x -= imagedata.width;
        while (px.x < 0) px.x += imagedata.width;
        while (px.y > imagedata.height) px.y -= imagedata.height;
        while (px.y < 0) px.y += imagedata.height;

        let color = ThreejsUtils.getPixel(imagedata, px.x, px.y);
        let res = 8 * (2 * color.r / 255 - 1.0);
        let heightFactor = res;

        return {
            y: heightFactor
        };

    }

    private updateSunPosition() {
        var sunDirection = new THREE.Vector3(Math.sin(azimuth), Math.sin(elevation), -Math.cos(azimuth));
        grassMaterial.uniforms.sunDirection.value = sunDirection;
        backgroundMaterial.uniforms.sunDirection.value = sunDirection;
    }

    private moveUpdate(dt: number) {

        let spd = speed;
        if (isShift) spd *= 3;
        camera.getWorldDirection(viewDirection);
        // this.currPers.getWorldDirection(viewDirection);
        length = Math.sqrt(viewDirection.x * viewDirection.x + viewDirection.z * viewDirection.z);
        viewDirection.x /= length;
        viewDirection.z /= length;
        if (forward) {
            pos.x += dt * spd * viewDirection.x;
            pos.y += dt * spd * viewDirection.z;
        }
        if (backward) {
            pos.x -= dt * spd * viewDirection.x;
            pos.y -= dt * spd * viewDirection.z;
        }
        if (left) {
            var rightVector = this.cross(upVector, viewDirection);
            pos.x += dt * spd * rightVector.x;
            pos.y += dt * spd * rightVector.z;
        }
        if (right) {
            var rightVector = this.cross(upVector, viewDirection);
            pos.x -= dt * spd * rightVector.x;
            pos.y -= dt * spd * rightVector.z;
        }

        if (groundShader) {
            groundShader.uniforms.posX.value = pos.x;
            groundShader.uniforms.posZ.value = pos.y;
            groundShader.uniforms.radius.value = radius;
        }
        grassMaterial.uniforms.posX.value = pos.x;
        grassMaterial.uniforms.posZ.value = pos.y;
        grassMaterial.uniforms.radius.value = radius;
    }

    render() {
        renderer.clear();
        renderer.render(backgroundScene, camera);
        renderer.render(scene, camera);
    }

    update(dt: number) {
        time += dt * 2;
        grassMaterial.uniforms.time.value = time;
        this.currPers?.update(dt);
        this.personageController?.update(dt);
        controls?.update();
        this.moveUpdate(dt * 3);
        // updateSunPosition();

    }

}
