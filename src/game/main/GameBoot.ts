import { LogMng } from "../../utils/LogMng";
import { Settings } from '../data/Settings';
import { MyUtils } from '../../utils/MyUtils';
import { ILogger } from '../interfaces/ILogger';

export class GameBoot implements ILogger {

    constructor() {

        // init debug mode
        Settings.isDebugMode = window.location.hash === '#debug';

        // LogMng settings
        if (!Settings.isDebugMode) LogMng.setMode(LogMng.MODE_RELEASE);
        LogMng.system('log mode: ' + LogMng.getMode());

        // GET Params
        this.readGETParams();

    }

    logDebug(aMsg: string, aData?: any): void {
        LogMng.debug(`GameBoot -> ${aMsg}`, aData);
    }
    logWarn(aMsg: string, aData?: any): void {
        LogMng.warn(`GameBoot -> ${aMsg}`, aData);
    }
    logError(aMsg: string, aData?: any): void {
        LogMng.error(`GameBoot -> ${aMsg}`, aData);
    }

    private readGETParams() {

        const LIST = [
            {
                // anti aliasing
                keys: ['aa'],
                onReadHandler: (aValue: string) => {
                    Settings.AA_TYPE = aValue;
                    LogMng.debug('Config.AA_TYPE = ' + Settings.AA_TYPE);
                }
            }
        ];

        for (let i = 0; i < LIST.length; i++) {
            const listItem = LIST[i];
            const keys = listItem.keys;
            for (let j = 0; j < keys.length; j++) {
                const getName = keys[j];
                let qValue = MyUtils.getQueryValue(getName);
                if (qValue != null && qValue != undefined) {
                    listItem.onReadHandler(qValue);
                }
            }
        }

    }
    
}
