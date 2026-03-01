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
import images from '../library/images.js';
import wrapper from '../library/wrapper.js';
let PlayContextButton = class PlayContextButton extends Button {
    static STATABLE = true;
    #cachedPlayContexts = {};
    #forcedActiveContexts = {};
    constructor() {
        super();
        this.setStatelessImage('images/states/play-context-unknown');
        wrapper.on('playbackContextChanged', () => {
            for (const context of this.contexts)
                if (wrapper.playbackContext?.uri === this.#cachedPlayContexts[context]?.uri)
                    delete this.#forcedActiveContexts[context];
            for (const context of this.contexts)
                this.#updatePlayContext(context, this.settings[context]);
        });
    }
    async #updatePlayContext(context, oldSettings = undefined) {
        this.setUnpressable(context, true);
        const badUrl = !/^https?:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(?:album|artist|playlist)\/[A-Za-z0-9]{22}(?:\/)?(?:\?.*)?$/.test(this.settings[context].spotify_url);
        if ((!oldSettings) || badUrl || this.settings[context].spotify_url !== this.#cachedPlayContexts[context]?.url || (!(oldSettings.show || []).every((entry) => entry === 'active_border' || entry === 'inactive_border' || (this.settings[context].show || []).includes(entry))) || (!(this.settings[context].show || []).every((entry) => entry === 'active_border' || entry === 'inactive_border' || (oldSettings.show || []).includes(entry))))
            this.clearMarquee(context);
        if (this.settings[context].spotify_url !== this.#cachedPlayContexts[context]?.url || badUrl) {
            if (!badUrl)
                await this.setImage(context, 'images/states/pending');
            await this.setTitle(context, '');
            if (this.settings[context].spotify_url && (!badUrl))
                this.#cachedPlayContexts[context] = await wrapper.getInformationOnUrl(this.settings[context].spotify_url);
            else
                this.#cachedPlayContexts[context] = null;
        }
        if (this.#cachedPlayContexts[context]) {
            if (!images.isItemCached(this.#cachedPlayContexts[context]))
                await this.setImage(context, 'images/states/pending');
            const image = await images.getForItem(this.#cachedPlayContexts[context]);
            if ((!this.marquees[context]) || this.marquees[context].id !== this.#cachedPlayContexts[context].url)
                await this.marqueeTitle(this.#cachedPlayContexts[context].url, [
                    this.settings[context].show.includes('title') ? {
                        key: 'title',
                        value: this.#cachedPlayContexts[context].title
                    } : undefined,
                    this.#cachedPlayContexts[context].subtitle && this.settings[context].show.includes('subtitle') ? {
                        key: 'subtitle',
                        value: this.#cachedPlayContexts[context].subtitle
                    } : undefined,
                    this.#cachedPlayContexts[context].extra && this.settings[context].show.includes('extra') ? {
                        key: 'extra',
                        value: this.#cachedPlayContexts[context].extra
                    } : undefined
                ].filter(v => !!v), context);
            else
                this.resumeMarquee(context);
            if (image)
                await this.setImage(context, this.processImage(`data:image/jpeg;base64,${image}`, 'none', (this.settings[context].show.includes('active_border') && (wrapper.playbackContext?.uri === this.#cachedPlayContexts[context].uri || this.#forcedActiveContexts[context] === this.#cachedPlayContexts[context].uri)) ? (wrapper.playbackContext?.uri === this.#cachedPlayContexts[context].uri ? '#1db954' : '#dab824') : (this.settings[context].show.includes('inactive_border') ? '#888888' : null)));
            else if (this.#cachedPlayContexts[context].type === 'local')
                await this.setImage(context, 'images/states/local');
            else
                await this.setImage(context);
        }
        else
            await this.setImage(context, 'images/states/play-context-unknown');
        this.setUnpressable(context, false);
    }
    async invokeWrapperAction(context, type) {
        if (type === Button.TYPES.RELEASED)
            return;
        if (this.#cachedPlayContexts[context]) {
            const response = await wrapper.playItem(this.#cachedPlayContexts[context]);
            if (response === constants.WRAPPER_RESPONSE_SUCCESS) {
                this.#forcedActiveContexts = {};
                this.#forcedActiveContexts[context] = this.#cachedPlayContexts[context].uri;
                for (const ctx of this.contexts)
                    setImmediate(() => this.#updatePlayContext(ctx, this.settings[ctx]));
                return constants.WRAPPER_RESPONSE_SUCCESS_INDICATIVE;
            }
            else
                return response;
        }
        else
            return constants.WRAPPER_RESPONSE_NOT_AVAILABLE;
    }
    async onSettingsUpdated(context, oldSettings) {
        await super.onSettingsUpdated(context, oldSettings);
        if (!this.settings[context].show)
            await this.setSettings(context, {
                show: ['title', 'extra', 'subtitle', 'active_border', 'inactive_border']
            });
        if (this.#cachedPlayContexts[context]?.url !== this.settings[context].spotify_url || oldSettings.show?.length !== this.settings[context].show?.length || (oldSettings.show && this.settings[context].show && (!oldSettings.show.every((value, index) => value === this.settings[context].show[index]))))
            await this.#updatePlayContext(context, oldSettings);
    }
    async onWillDisappear(ev) {
        await super.onWillDisappear(ev);
        this.pauseMarquee(ev.action.id);
    }
    async onStateSettled(context) {
        await super.onStateSettled(context, true);
        await this.#updatePlayContext(context);
    }
    async onStateLoss(context) {
        await super.onStateLoss(context);
        this.clearMarquee(context);
        await this.setTitle(context, '');
    }
};
PlayContextButton = __decorate([
    action({ UUID: 'com.ntanis.essentials-for-spotify.play-context-button' }),
    __metadata("design:paramtypes", [])
], PlayContextButton);
export default PlayContextButton;
