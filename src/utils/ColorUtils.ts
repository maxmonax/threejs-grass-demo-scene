import { MyMath } from "./MyMath";

export class ColorUtils {

    /**
     * Convert a Hex to RGB
     * @param aHexColorStr Hex string (#FFAA22 or #FA2)
     * @returns RGB { r, g, b }
     */
    public static strHexToRGB(aHexColorStr: string): { r: number, g: number, b: number } {
        let newHex = aHexColorStr.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => '#' + r + r + g + g + b + b);
        let res: number[] = newHex.substring(1).match(/.{2}/g).map(x => parseInt(x, 16));
        return res ? {
            r: res[0],
            g: res[1],
            b: res[2]
        } : null;
    }

    /**
     * Convert Hex number to RGB
     * @param aHexNum Hex number (0x2266FF)
     * @returns RGB 0..255
     */
    public static hexToRGB(aHexNum: number): { r: number, g: number, b: number } {
        let res = {
            r: (aHexNum >> 16) & 255,
            g: (aHexNum >> 8) & 255,
            b: aHexNum & 255
        };
        return res;
    }

    /**
     * 
     * @param c number in 0-255 format
     * @returns 
     */
    static byteToHexStr(c: number): string {
        let hex = c.toString(16);
        //LogMng.debug(`componentToHex: c = ${c}, hex = ${hex}`);
        return hex.length == 1 ? "0" + hex : hex;
    }

    /**
     * Convert RGB to Hex string
     * @param r Red in format 0 - 255
     * @param g Green in format 0 - 255
     * @param b Blue in format 0 - 255
     * @returns 
     */
    public static rgbToHexStr(r: number, g: number, b: number): string {
        return "#" + this.byteToHexStr(r) + this.byteToHexStr(g) + this.byteToHexStr(b);
    }

    // public static rgbToHex(r: number, g: number, b: number): number {
    //     return r * 10000 + g * 100 + b;
    // }

    public static getRandomRBG(min = 0, max = 255): number {
        // let alphaStepCnt = 15;
        // let alphaStepValue = 255 / alphaStepCnt;
        let r = Math.trunc(min + Math.random() * (max - min));
        let g = Math.trunc(min + Math.random() * (max - min));
        let b = Math.trunc(min + Math.random() * (max - min));
        // let step = randomIntInRange(0, alphaStepCnt);
        // let a = Math.trunc(step * alphaStepValue);
        return (r << 16) + (g << 8) + b;
    }

    /**
     * Lerp 2 colors in hex
     * @param aColor1 Color 1
     * @param aColor2 Color 2
     * @param t time [0..1]
     * @returns rgb in 0..255 or 0..1 if selected normalize option
     */
    public static lerpColors(aColor1: number, aColor2: number, t: number, isNormalize = false): {
        r: number,
        g: number,
        b: number
    } {

        let rgb1 = this.hexToRGB(aColor1);
        let rgb2 = this.hexToRGB(aColor2);
        let rgb = {
            r: Math.floor(MyMath.lerp(rgb1.r, rgb2.r, t)),
            g: Math.floor(MyMath.lerp(rgb1.g, rgb2.g, t)),
            b: Math.floor(MyMath.lerp(rgb1.b, rgb2.b, t))
        };

        if (isNormalize) {
            rgb.r /= 255;
            rgb.g /= 255;
            rgb.b /= 255;
        }

        return rgb;
    }

}
