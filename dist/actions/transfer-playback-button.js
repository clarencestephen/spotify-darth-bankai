var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import StreamDeck, { action } from '@elgato/streamdeck';
import { Button } from './button.js';
import constants from '../library/constants.js';
import wrapper from './../library/wrapper.js';
import connector from '../library/connector.js';
let TransferPlaybackButton = class TransferPlaybackButton extends Button {
    static STATABLE = true;
    constructor() {
        super();
        wrapper.on('devicesChanged', this.#updateDevices.bind(this));
        this.setStatelessImage('images/states/transfer-playback-unknown');
    }
    async #updateDevices(devices, contexts = this.contexts) {
        if (!connector.set)
            return;
        const promises = [];
        const items = [];
        for (const context of contexts)
            for (const device of devices)
                if (device.id !== this.settings[context].spotify_device_id)
                    items.push({
                        value: device.id,
                        label: device.name
                    });
        for (const context of contexts)
            promises.push(new Promise(async (resolve) => {
                const deviceOnline = devices.some((device) => device.id === this.settings[context].spotify_device_id);
                if (deviceOnline)
                    await this.setSettings(context, {
                        spotify_device_label: (this.settings[context].spotify_device_id) ? (wrapper.devices.find((device) => device.id === this.settings[context].spotify_device_id)?.name) : undefined
                    });
                if (this.settings[context].spotify_device_id)
                    items.unshift({
                        value: this.settings[context].spotify_device_id,
                        label: deviceOnline ? (this.settings[context].spotify_device_label ?? 'Unknown\nDevice') : (this.settings[context].spotify_device_label ? `${this.settings[context].spotify_device_label} (Offline)` : 'Unknown\nDevice (Offline)')
                    });
                await StreamDeck.client.sendToPropertyInspector(context, {
                    event: 'getDevices',
                    items
                });
                await this.setTitle(context, this.settings[context].spotify_device_label ? this.splitToLines(this.settings[context].spotify_device_label) : (this.settings[context].spotify_device_id ? 'Unknown\nDevice' : 'No Device\nSelected'));
                if (deviceOnline)
                    await this.setImage(context, 'images/states/transfer-playback');
                else
                    await this.setImage(context, 'images/states/transfer-playback-offline');
                resolve(true);
            }));
        await Promise.allSettled(promises);
    }
    async invokeWrapperAction(context, type) {
        if (type === Button.TYPES.RELEASED)
            return;
        if ((!this.settings[context].spotify_device_id) || (!wrapper.devices.some((device) => device.id === this.settings[context].spotify_device_id)))
            return constants.WRAPPER_RESPONSE_NOT_AVAILABLE;
        else {
            const response = await wrapper.transferPlayback(this.settings[context].spotify_device_id);
            if (response === constants.WRAPPER_RESPONSE_SUCCESS)
                return constants.WRAPPER_RESPONSE_SUCCESS_INDICATIVE;
            else
                return response;
        }
    }
    async onSendToPlugin(ev) {
        if (ev.payload?.event === 'getDevices')
            await this.#updateDevices(wrapper.devices, [ev.action.id]);
    }
    async onSettingsUpdated(context, oldSettings) {
        await this.#updateDevices(wrapper.devices, [context]);
    }
    async onStateSettled(context) {
        await super.onStateSettled(context, true);
        await this.#updateDevices(wrapper.devices, [context]);
    }
    async onStateLoss(context) {
        await super.onStateLoss(context);
        await this.setTitle(context, '');
    }
};
TransferPlaybackButton = __decorate([
    action({ UUID: 'com.ntanis.essentials-for-spotify.transfer-playback-button' }),
    __metadata("design:paramtypes", [])
], TransferPlaybackButton);
export default TransferPlaybackButton;
