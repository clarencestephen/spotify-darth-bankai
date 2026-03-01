var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { action } from '@elgato/streamdeck';
import { Button } from './button.js';
import constants from '../library/constants.js';
import wrapper from './../library/wrapper.js';
let VolumeUpButton = class VolumeUpButton extends Button {
    static HOLDABLE = true;
    async invokeWrapperAction(context, type) {
        if (type === Button.TYPES.RELEASED)
            return;
        if (wrapper.volumePercent === null)
            return constants.WRAPPER_RESPONSE_NOT_AVAILABLE;
        return wrapper.volumeUp(this.settings[context].step);
    }
    async onSettingsUpdated(context, oldSettings) {
        await super.onSettingsUpdated(context, oldSettings);
        if (!this.settings[context].step)
            await this.setSettings(context, {
                step: constants.DEFAULT_VOLUME_STEP
            });
    }
};
VolumeUpButton = __decorate([
    action({ UUID: 'com.ntanis.essentials-for-spotify.volume-up-button' })
], VolumeUpButton);
export default VolumeUpButton;
