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
import constants from '../library/constants.js';
import wrapper from './../library/wrapper.js';
let VolumeStackButton = class VolumeStackButton extends Button {
    static MULTI = true;
    static STATABLE = true;
    constructor() {
        super();
        this.setStatelessImage('images/states/volume-stack-unknown');
        wrapper.on('mutedStateChanged', (state) => this.#onStateChanged());
        wrapper.on('volumePercentChanged', (percent) => this.#onStateChanged());
    }
    #roundToNext(percent) {
        return Math.max(10, Math.min(100, Math.floor(percent / 10) * 10));
    }
    async #onStateChanged(contexts = this.contexts) {
        const promises = [];
        for (const context of contexts)
            if (((!wrapper.muted) && wrapper.volumePercent === null) || (wrapper.muted && wrapper.mutedVolumePercent === null && wrapper.volumePercent === null))
                promises.push(this.setImage(context));
            else
                promises.push(this.setImage(context, `images/states/volume-stack-${this.#roundToNext(wrapper.muted ? (wrapper.mutedVolumePercent ?? wrapper.volumePercent) : wrapper.volumePercent)}${wrapper.muted ? '-muted' : ''}`));
        return Promise.allSettled(promises);
    }
    async #invokePress(context, action) {
        switch (action) {
            case 'volume_up':
                return wrapper.volumeUp(this.settings[context].step);
            case 'volume_down':
                return wrapper.volumeDown(this.settings[context].step);
            case 'volume_mute_unmute':
                return wrapper.toggleVolumeMute();
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
            return constants.WRAPPER_RESPONSE_SUCCESS;
        else if (type === Button.TYPES.LONG_PRESS)
            return this.#invokePress(context, this.settings[context].long_press);
        else
            return constants.WRAPPER_RESPONSE_NOT_AVAILABLE;
    }
    async onSettingsUpdated(context, oldSettings) {
        await super.onSettingsUpdated(context, oldSettings);
        if (!this.settings[context].step)
            await this.setSettings(context, {
                step: constants.DEFAULT_VOLUME_STACK_STEP
            });
        if (!this.settings[context].single_press)
            await this.setSettings(context, {
                single_press: 'volume_up'
            });
        if (!this.settings[context].double_press)
            await this.setSettings(context, {
                double_press: 'volume_down'
            });
        if (!this.settings[context].long_press)
            await this.setSettings(context, {
                long_press: 'volume_mute_unmute'
            });
    }
    async onStateSettled(context) {
        await super.onStateSettled(context, true);
        await this.#onStateChanged([context]);
    }
};
VolumeStackButton = __decorate([
    action({ UUID: 'com.ntanis.essentials-for-spotify.volume-stack-button' }),
    __metadata("design:paramtypes", [])
], VolumeStackButton);
export default VolumeStackButton;
