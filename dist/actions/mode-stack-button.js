var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { action } from '@elgato/streamdeck';
import { Button } from './button.js';
import wrapper from './../library/wrapper.js';
import constants from '../library/constants.js';
let ModeStackButton = class ModeStackButton extends Button {
    static STATABLE = true;
    static MULTI = true;
    constructor() {
        super();
        this.setStatelessImage('images/states/mode-stack-unknown');
        wrapper.on('shuffleStateChanged', (state) => this.#onStateChanged());
        wrapper.on('repeatStateChanged', (state) => this.#onStateChanged());
    }
    async #onStateChanged(contexts = this.contexts) {
        const promises = [];
        for (const context of contexts)
            promises.push(this.setImage(context, `images/states/mode-stack-${wrapper.shuffleState ? '1' : '0'}-${wrapper.repeatState === 'track' ? '1' : '0'}-${wrapper.repeatState === 'context' ? '1' : '0'}`));
        return Promise.allSettled(promises);
    }
    async #invokePress(context, action) {
        switch (action) {
            case 'shuffle':
                return wrapper.toggleShuffle();
            case 'loop_song':
                return wrapper.toggleTrackRepeat();
            case 'loop_context':
                return wrapper.toggleContextRepeat();
            case 'reset_all': {
                const promises = [];
                if (wrapper.shuffleState)
                    promises.push(wrapper.turnOffShuffle());
                if (wrapper.repeatState !== 'off')
                    promises.push(wrapper.turnOffRepeat());
                return Promise.allSettled(promises);
            }
        }
    }
    async invokeWrapperAction(context, type) {
        if (type === Button.TYPES.RELEASED)
            return;
        if (type === Button.TYPES.SINGLE_PRESS)
            return this.#invokePress(context, this.settings[context].single_press);
        else if (type === Button.TYPES.DOUBLE_PRESS)
            return this.#invokePress(context, this.settings[context].double_press);
        else if (type === Button.TYPES.TRIPLE_PRESS)
            return this.#invokePress(context, this.settings[context].triple_press);
        else if (type === Button.TYPES.LONG_PRESS)
            return this.#invokePress(context, this.settings[context].long_press);
        else
            return constants.WRAPPER_RESPONSE_NOT_AVAILABLE;
    }
    async onSettingsUpdated(context, oldSettings) {
        await super.onSettingsUpdated(context, oldSettings);
        if (!this.settings[context].single_press)
            await this.setSettings(context, {
                single_press: 'shuffle'
            });
        if (!this.settings[context].double_press)
            await this.setSettings(context, {
                double_press: 'loop_song'
            });
        if (!this.settings[context].triple_press)
            await this.setSettings(context, {
                triple_press: 'loop_context'
            });
        if (!this.settings[context].long_press)
            await this.setSettings(context, {
                long_press: 'reset_all'
            });
    }
    async onStateSettled(context) {
        await super.onStateSettled(context);
        await this.#onStateChanged([context]);
    }
};
ModeStackButton = __decorate([
    action({ UUID: 'com.ntanis.essentials-for-spotify.mode-stack-button' }),
    __metadata("design:paramtypes", [])
], ModeStackButton);
export default ModeStackButton;
