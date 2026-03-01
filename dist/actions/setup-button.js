var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { exec } from 'child_process';
import { action } from '@elgato/streamdeck';
import { Button } from './button.js';
import constants from '../library/constants.js';
import connector from './../library/connector.js';
import logger from './../library/logger.js';
let SetupButton = class SetupButton extends Button {
    static SETUPLESS = true;
    static STATABLE = true;
    FAKE = false;
    constructor() {
        super();
        connector.on('setupStateChanged', this.#onSetupStateChanged.bind(this));
    }
    #onSetupStateChanged(state) {
        const promises = [];
        for (const context of this.contexts)
            promises.push(this.setState(context, state ? 1 : 0));
        return Promise.allSettled(promises);
    }
    async invokeWrapperAction(context, type) {
        if (type === Button.TYPES.RELEASED)
            return;
        if (this.FAKE)
            if (connector.set)
                connector.fakeOff();
            else
                connector.fakeOn();
        else {
            if (connector.set)
                connector.invalidateSetup();
            exec(`${process.platform == 'darwin' ? 'open' : (process.platform == 'win32' ? 'start' : 'xdg-open')} http://127.0.0.1:${constants.CONNECTOR_DEFAULT_PORT}`, (error, stdout, stderr) => {
                if (error)
                    logger.error(`An error occurred while opening browser: "${error.message || 'No message.'}" @ "${error.stack || 'No stack trace.'}".`);
            });
        }
        return constants.WRAPPER_RESPONSE_SUCCESS_INDICATIVE;
    }
    async onStateSettled(context) {
        await super.onStateSettled(context);
        await this.#onSetupStateChanged(true);
    }
    async onStateLoss(context) {
        await super.onStateLoss(context);
        await this.#onSetupStateChanged(false);
    }
};
SetupButton = __decorate([
    action({ UUID: 'com.ntanis.essentials-for-spotify.setup-button' }),
    __metadata("design:paramtypes", [])
], SetupButton);
export default SetupButton;
