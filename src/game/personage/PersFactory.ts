import { MyMath } from "../../utils/MyMath";
import { Config } from "../data/Config";
import { ModelAlias } from "../data/ModelData";
import { Personage } from "./Personage";

export const PERS_PARAMS = {

    aliases: [
        'persRun',
        'persStay',
        'persFalling'
    ],

    startPos: {
        x: -Config.METER_SIZE * 8,
        y: 0,
        z: 0
    },

    startRotation: Math.PI / 2,
    walkSpd: 0,//Config.METER_SIZE * 1.6,
    runSpd: 0,//Config.METER_SIZE * 6,
    backSpd: 0,//Config.METER_SIZE * 1.2,
    fallAccel: Config.METER_SIZE / 1.5,

    thirdPersoneCameraOffset: {
        x: -Config.METER_SIZE * 0.5,
        y: Config.METER_SIZE * 1.8,
        z: -Config.METER_SIZE * 4
    },
    thirdPersoneCameraLookat: {
        x: -Config.METER_SIZE * 0.25,
        y: Config.METER_SIZE * 1.,
        z: Config.METER_SIZE * 2
    },

    currSpdForward: 0,
    currSpdDown: 0,
    targetTorsAngle: 0,
    cameraState: 'orbit'

};

export class PersFactory {

    static createShibainu(aPos: { x, y, z }): Personage {

        let pers = new Personage();

        pers.init({
            modelAlias: ModelAlias.shibainu,
            walkSpd: PERS_PARAMS.walkSpd,
            runSpd: PERS_PARAMS.runSpd,
            backSpd: PERS_PARAMS.backSpd,
            fallAccel: PERS_PARAMS.fallAccel,
            sideTurn: {
                walkAngle: Math.PI / 30,
                runAngle: Math.PI / 20,
                spdWalk: 1,
                spdRun: 3
            },
            rays: {
                forwardLength: Config.METER_SIZE / 3,
                forwardBotHeight: Config.METER_SIZE / 2.2,
                forwardLevelCount: 5,
                forwardLevelStepSize: Config.METER_SIZE / 3.2,
                downLength: Config.METER_SIZE,
                downRayDeltaHeight: Config.METER_SIZE * 0.03
                // downRayDeltaHeight: setti
            },
            camera: {
                orbitCameraHeight: Config.METER_SIZE * 1.5
            },
            thirdPersoneCameraOffset: PERS_PARAMS.thirdPersoneCameraOffset,
            thirdPersoneCameraLookat: PERS_PARAMS.thirdPersoneCameraLookat,
            scale: Config.METER_SIZE / 200
        });

        // debugger;
        pers.addAnimation({
            // animAlias: ModelAlias.shibainu,
            key: 'AnimalArmature|Idle',
            newKey: 'idle'
        });
        pers.addAnimation({
            // animAlias: ModelAlias.shibainu,
            key: 'AnimalArmature|Walk',
            newKey: 'walk'
        });
        pers.addAnimation({
            // animAlias: ModelAlias.shibainu,
            key: 'AnimalArmature|Walk',
            newKey: 'backWalk',
            timeScale: -0.8
        });
        pers.addAnimation({
            // animAlias: ModelAlias.shibainu,
            key: 'AnimalArmature|Gallop',
            newKey: 'run'
        });
        // pers.addAnimation({
        //     animAlias: 'persFalling',
        //     key: 'Male_V3',
        //     newKey: 'falling'
        // });
        // pers.addAnimation({
        //     animAlias: 'persJump1',
        //     key: 'Male_V3',
        //     newKey: 'jumpUp'
        // });
        pers.playAnimation('idle');

        pers.position.set(aPos.x, aPos.y, aPos.z);
        pers.rotation.y = PERS_PARAMS.startRotation;
        pers.update(0.0);

        return pers;
    }

}