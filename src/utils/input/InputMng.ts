import { Signal } from "../events/Signal";
import { LogMng } from "../LogMng";

type InitParams = {
    inputDomElement: HTMLElement;
    desktop: boolean;
    isRightClickProcessing: boolean;
};

export class InputMng {

    private static instance: InputMng = null;
    private params: InitParams;

    isTouchDown = false;

    currInputClientX = 0;
    currInputClientY = 0;

    inputDownClientX = 0;
    inputDownClientY = 0;

    inputUpClientX = 0;
    inputUpClientY = 0;

    normalInputPos = {
        x: 0,
        y: 0
    };

    normalInputDown = {
        x: 0,
        y: 0
    };

    normalUpDown = {
        x: 0,
        y: 0
    };

    keysDown = {};

    /**
     * keyCode: string, key: string
     */
    onKeyDownSignal = new Signal();

    /**
     * keyCode: string, key: string
     */
    onKeyUpSignal = new Signal();

    /**
     * x, y
     */
    onInputDownSignal = new Signal();

    /**
     * x, y
     */
    onInputUpSignal = new Signal();

    /**
     * x, y
     */
    onInputMoveSignal = new Signal();

    /**
     * x, y
     */
    onContextMenuSignal = new Signal();
    

    private constructor(aParams: InitParams) {

        this.params = aParams;

        document.addEventListener('keydown', (event: KeyboardEvent) => {
            // LogMng.debug('keydown event code: ' + event.code);
            // LogMng.debug('keydown event key: ' + event.key);
            this.keysDown[event.code] = true;
            this.onKeyDownSignal.dispatch(event.code, event.key);
        }, false);

        document.addEventListener('keyup', (event: KeyboardEvent) => {
            // LogMng.debug('keyup event: ' + event.code);
            this.keysDown[event.code] = false;
            this.onKeyUpSignal.dispatch(event.code, event.key);
        }, false);

        let dom = this.params.inputDomElement;

        if (dom) {

            // if (this.params.desktop) {
            LogMng.debug(`InputMng: init input events...`);

            dom.addEventListener('mousemove', (e: MouseEvent) => {

                // LogMng.debug(`mousemove: x: ${e.clientX}, y: ${e.clientY}`);

                this.currInputClientX = e.clientX;
                this.currInputClientY = e.clientY;

                // for 3d
                this.normalInputPos = {
                    x: (e.clientX / dom.clientWidth) * 2 - 1,
                    y: -(e.clientY / dom.clientHeight) * 2 + 1
                }

                if (this.params.desktop) {
                    this.onInputMoveSignal.dispatch(this.currInputClientX, this.currInputClientY);
                }

            }, true);

            dom.addEventListener('pointerdown', (e: PointerEvent) => {

                // e.button: 0 - left, 1 - middle, 2 - right

                // LogMng.debug(`mousedown: x: ${e.clientX}, y: ${e.clientY}`);
                // LogMng.debug(`pointerdown: button == ${e.button}`);

                if (this.params.desktop && e.button != 0) return;

                this.inputDownClientX = e.clientX;
                this.inputDownClientY = e.clientY;

                // for 3d
                this.normalInputDown = {
                    x: (e.clientX / dom.clientWidth) * 2 - 1,
                    y: -(e.clientY / dom.clientHeight) * 2 + 1
                }

                this.onInputDownSignal.dispatch(this.inputDownClientX, this.inputDownClientY);
            }, true);

            dom.addEventListener("pointerup", (e: PointerEvent) => {

                // LogMng.debug(`mouseup: x: ${e.clientX}, y: ${e.clientY}`);

                if (this.params.desktop && e.button != 0) return;

                this.inputUpClientX = e.clientX;
                this.inputUpClientY = e.clientY;

                // for 3d
                this.normalUpDown = {
                    x: (e.clientX / dom.clientWidth) * 2 - 1,
                    y: -(e.clientY / dom.clientHeight) * 2 + 1
                }

                this.onInputUpSignal.dispatch(e.clientX, e.clientY);
            }, true);

            // }
            // else {
            //     LogMng.debug(`init mouse events for mobile`);

            //     dom.addEventListener("touchstart", (e) => {
            //         var touches = e.changedTouches;
            //         if (touches.length > 1)
            //             return;
            //         var t = touches[0];
            //         this.currInputClientX = this.inputDownClientX = t.clientX;
            //         this.currInputClientY = this.inputDownClientY = t.clientY;
            //         this.isTouchDown = true;
            //         this.onInputDownSignal.dispatch(t.clientX, t.clientY);
            //     }, false);

            //     dom.addEventListener("touchmove", (e) => {
            //         let touches = e.changedTouches;
            //         if (touches.length > 1)
            //             return;
            //         let t = touches[0];
            //         this.currInputClientX = t.clientX;
            //         this.currInputClientY = t.clientY;
            //     }, false);

            //     dom.addEventListener("touchend", (e) => {
            //         var touches = e.changedTouches;
            //         if (touches.length > 1)
            //             return;
            //         var t = touches[0];
            //         this.isTouchDown = false;
            //         this.onInputUpSignal.dispatch(t.clientX, t.clientY);
            //     }, false);
            // }

            if (this.params.desktop && aParams.isRightClickProcessing) {
                window.oncontextmenu = () => {
                    this.onContextMenuSignal.dispatch(this.currInputClientX, this.currInputClientY);
                    return false; // cancel default menu
                };
            }

        }
        else {
            LogMng.warn(`InputMng => undefined input DOM element = ${this.params.inputDomElement}`);
            console.log('InputMng => init params:', this.params);
        }

    }

    static getInstance(aParams?: InitParams): InputMng {
        if (!InputMng.instance) {
            if (aParams) {
                if (InputMng.instance) throw new Error("Reinicialization of InputMng, use single inicialization point");
                InputMng.instance = new InputMng(aParams);
            }
            else {
                LogMng.error('InputMng.getInstance(): aParams = null!');
            }
        }
        return InputMng.instance;
    }

    isKeyDown(aKey: string): boolean {
        return this.keysDown[aKey];
    }

    update() {

    }

}
