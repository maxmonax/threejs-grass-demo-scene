import * as datGui from "dat.gui";

export class DebugGui {
    private static _instance: DebugGui;
    private _gui: datGui.GUI;

    private constructor() {
        if (DebugGui._instance) throw new Error("Double using DebugGui.constructor()!");
        this._gui = new datGui.GUI();
    }

    static getInstance() {
        if (!this._instance) this._instance = new DebugGui();
        return this._instance;
    }
    
    public get gui(): datGui.GUI {
        return this._gui;
    }
    

}