var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import os from 'os';
import { action } from '@elgato/streamdeck';
import { Button } from './button.js';
import { spawn } from 'child_process';
import constants from '../library/constants.js';
import images from '../library/images.js';
import wrapper from '../library/wrapper.js';
let SongStackButton = class SongStackButton extends Button {
    static STATABLE = true;
    static MULTI = true;
    constructor() {
        super();
        this.setStatelessImage('images/states/song-stack-unknown');
        wrapper.on('songChanged', this.#onSongChanged.bind(this));
        wrapper.on('songTimeChanged', this.#onSongTimeChanged.bind(this));
        wrapper.on('songLikedStateChanged', (liked, pending = false) => this.#onSongChanged(wrapper.song, wrapper.pendingSongChange));
    }
    #onSongTimeChanged(progress, duration, pending = false, contexts = this.contexts) {
        for (const context of contexts)
            if (this.marquees[context])
                this.updateMarqueeEntry(context, 'time', this.beautifyTime(progress, duration, this.settings[context].show.includes('progress'), this.settings[context].show.includes('duration')));
    }
    async #onSongChanged(song, pending = false, contexts = this.contexts, force = false) {
        const promises = [];
        for (const context of contexts)
            promises.push(new Promise(async (resolve) => {
                this.setUnpressable(context, true);
                if ((song && this.marquees[context] && this.marquees[context].id !== song.item.id) || ((!song) && this.marquees[context]) || force) {
                    this.clearMarquee(context);
                    await this.setTitle(context, '');
                }
                if (song) {
                    if (!images.isSongCached(song))
                        await this.setImage(context, 'images/states/pending');
                    const image = await images.getForSong(song);
                    if ((!this.marquees[context]) || this.marquees[context].id !== song.item.id || force)
                        await this.marqueeTitle(song.item.id, [
                            this.settings[context].show.includes('name') ? {
                                key: 'title',
                                value: song.item.name
                            } : undefined,
                            this.settings[context].show.includes('artists') ? {
                                key: 'artists',
                                value: song.item.artists.map((artist) => artist.name).join(', ')
                            } : undefined,
                            this.settings[context].show.includes('progress') || this.settings[context].show.includes('duration') ? {
                                key: 'time',
                                value: this.beautifyTime(song.progress, song.item.duration_ms, this.settings[context].show.includes('progress'), this.settings[context].show.includes('duration'))
                            } : undefined
                        ], context);
                    else
                        this.resumeMarquee(context);
                    if (image)
                        await this.setImage(context, this.processImage(`data:image/jpeg;base64,${image}`, this.settings[context].show.includes('liked') && song.liked ? 'center' : 'none'));
                    else if (song.item.uri.includes('local:'))
                        await this.setImage(context, 'images/states/local');
                    else
                        await this.setImage(context);
                }
                else if (pending)
                    await this.setImage(context, 'images/states/pending');
                else
                    await this.setImage(context, 'images/states/song-stack-unknown');
                if (!pending)
                    this.setUnpressable(context, false);
                resolve(true);
            }));
        await Promise.allSettled(promises);
    }
    async #openSpotify() {
        if (wrapper.song) {
            switch (os.platform()) {
                case 'darwin':
                    spawn('open', [wrapper.song.item.uri]);
                    break;
                case 'win32':
                    spawn('cmd', ['/c', 'start', '', wrapper.song.item.uri]);
                    break;
                case 'linux':
                    spawn('xdg-open', [wrapper.song.item.uri]);
                    break;
                default:
                    return constants.WRAPPER_RESPONSE_NOT_AVAILABLE;
            }
            return constants.WRAPPER_RESPONSE_SUCCESS_INDICATIVE;
        }
    }
    async #invokePress(context, action) {
        switch (action) {
            case 'play_pause':
                return wrapper.togglePlayback();
            case 'open_spotify':
                return this.#openSpotify();
            case 'next_song':
                return wrapper.nextSong();
            case 'previous_song':
                return wrapper.previousSong();
            case 'like_unlike':
                return wrapper.toggleCurrentSongLike();
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
                single_press: 'play_pause'
            });
        if (!this.settings[context].double_press)
            await this.setSettings(context, {
                double_press: 'next_song'
            });
        if (!this.settings[context].triple_press)
            await this.setSettings(context, {
                triple_press: 'previous_song'
            });
        if (!this.settings[context].long_press)
            await this.setSettings(context, {
                long_press: 'like_unlike'
            });
        if (!this.settings[context].show)
            await this.setSettings(context, {
                show: ['name', 'artists', 'progress', 'duration', 'liked']
            });
        if (oldSettings.show?.length !== this.settings[context].show?.length || (oldSettings.show && this.settings[context].show && (!oldSettings.show.every((value, index) => value === this.settings[context].show[index]))))
            await this.#onSongChanged(wrapper.song, wrapper.pendingSongChange, [context], true);
    }
    async onWillDisappear(ev) {
        await super.onWillDisappear(ev);
        this.pauseMarquee(ev.action.id);
    }
    async onStateSettled(context) {
        await super.onStateSettled(context, true);
        await this.#onSongChanged(wrapper.song, wrapper.pendingSongChange, [context]);
        this.#onSongTimeChanged(wrapper.song?.progress, wrapper.song?.item.duration_ms, wrapper.pendingSongChange, [context]);
    }
    async onStateLoss(context) {
        await super.onStateLoss(context);
        this.clearMarquee(context);
        await this.setTitle(context, '');
    }
};
SongStackButton = __decorate([
    action({ UUID: 'com.ntanis.essentials-for-spotify.song-stack-button' }),
    __metadata("design:paramtypes", [])
], SongStackButton);
export default SongStackButton;
