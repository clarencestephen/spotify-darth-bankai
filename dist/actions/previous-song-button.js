var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { action } from '@elgato/streamdeck';
import { Button } from './button.js';
import wrapper from './../library/wrapper.js';
import constants from './../library/constants.js';
let PreviousSongButton = class PreviousSongButton extends Button {
    static HOLDABLE = true;
    async invokeWrapperAction(context, type) {
        if (type === Button.TYPES.RELEASED) {
            await this.setImage(context);
            return;
        }
        if (type === Button.TYPES.SINGLE_PRESS)
            return wrapper.previousSong();
        else if (type === Button.TYPES.HOLDING) {
            await this.setImage(context, 'images/states/backward-seek');
            return wrapper.backwardSeek(this.settings[context].step);
        }
    }
    async onSettingsUpdated(context, oldSettings) {
        await super.onSettingsUpdated(context, oldSettings);
        if (!this.settings[context].step)
            await this.setSettings(context, {
                step: constants.DEFAULT_SEEK_STEP_SIZE
            });
    }
};
PreviousSongButton = __decorate([
    action({ UUID: 'com.ntanis.essentials-for-spotify.previous-song-button' })
], PreviousSongButton);
export default PreviousSongButton;
