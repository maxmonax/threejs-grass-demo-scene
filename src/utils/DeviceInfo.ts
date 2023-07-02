import { UAParser } from "ua-parser-js";

export class DeviceInfo {
    private static _instance: DeviceInfo = null;
    private _parserResult: UAParser.IResult;
    // desktop or mobile
    private _desktop = false;

    private constructor() {
        
        if (DeviceInfo._instance) throw new Error("Don't use DeviceInfo.constructor(), it's SINGLETON, use getInstance() method");

        this._parserResult = new UAParser().getResult();

        let devTypes = ['console', 'mobile', 'tablet', 'smarttv', 'wearable', 'embedded'];
        this._desktop = devTypes.indexOf(this._parserResult.device.type) < 0;

    }

    static getInstance(): DeviceInfo {
        if (!DeviceInfo._instance) DeviceInfo._instance = new DeviceInfo();
        return DeviceInfo._instance;
    }

    /**
     * is Desktop
     */
    public get desktop(): boolean {
        return this._desktop;
    }

    /**
     * is iOS?
     */
    public get iOS(): boolean {
        return this._parserResult.os.name == 'iOS';
    }

    /**
     * is Android
     */
    public get android(): boolean {
        return this._parserResult.os.name.indexOf('Android') >= 0;
    }

    /**
     * is Safari
     */
    public get safari(): boolean {
        return this._parserResult.browser.name == 'Safari';
    }

    public get devicePixelRatio(): number {
        return window.devicePixelRatio || 1;
    }

}