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
let PlayPauseButton = class PlayPauseButton extends Button {
    constructor() {
        super();
        wrapper.on('playbackStateChanged', this.#onPlaybackStateChanged.bind(this));
    }
    async #onPlaybackStateChanged(state, contexts = this.contexts) {
        const promises = [];
        for (const context of contexts)
            if (this.settings[context].action === 'play_pause')
                promises.push(this.setState(context, state ? 1 : 0));
        await Promise.allSettled(promises);
    }
    async invokeWrapperAction(context, type) {
        if (type === Button.TYPES.RELEASED)
            return;
        if (wrapper.playing && this.settings[context].action !== 'play')
            return wrapper.pausePlayback();
        else if ((!wrapper.playing) && this.settings[context].action !== 'pause')
            return wrapper.resumePlayback();
    }
    async onWillAppear(ev) {
        await super.onWillAppear(ev);
        await this.#onPlaybackStateChanged(wrapper.playing, [ev.action.id]);
    }
    async onSettingsUpdated(context, oldSettings) {
        await super.onSettingsUpdated(context, oldSettings);
        if (!this.settings[context].action)
            await this.setSettings(context, {
                action: 'play_pause'
            });
        switch (this.settings[context].action) {
            case 'play_pause':
                await this.#onPlaybackStateChanged(wrapper.playing, [context]);
                break;
            case 'play':
                await this.setState(context, 0);
                break;
            case 'pause':
                await this.setState(context, 1);
                break;
        }
    }
};
PlayPauseButton = __decorate([
    action({ UUID: 'com.ntanis.essentials-for-spotify.play-pause-button' }),
    __metadata("design:paramtypes", [])
], PlayPauseButton);
export default PlayPauseButton;
