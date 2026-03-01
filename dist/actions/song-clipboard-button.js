var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { action } from '@elgato/streamdeck';
import { Button } from './button.js';
import { spawn } from 'child_process';
import os from 'os';
import constants from '../library/constants.js';
import logger from './../library/logger.js';
import wrapper from './../library/wrapper.js';
let SongClipboardButton = class SongClipboardButton extends Button {
    #copyToClipboard(text) {
        let process = null;
        try {
            switch (os.platform()) {
                case 'darwin':
                    process = spawn('pbcopy');
                    break;
                case 'win32':
                    process = spawn('clip');
                    break;
                case 'linux':
                    process = spawn('xclip', ['-selection', 'c']);
                    break;
                default:
                    return constants.WRAPPER_RESPONSE_NOT_AVAILABLE;
            }
            process.stdin.end(text.replace(/[\x00-\x1F\x7F-\x9F]/g, ''));
        }
        catch (e) {
            logger.error(`An error occurred while copying to clipboard: "${e.message || 'No message.'}" @ "${e.stack || 'No stack trace.'}".`);
            return constants.WRAPPER_RESPONSE_FATAL_ERROR;
        }
        return constants.WRAPPER_RESPONSE_SUCCESS_INDICATIVE;
    }
    async invokeWrapperAction(context, type) {
        if (type === Button.TYPES.RELEASED)
            return;
        if (wrapper.song)
            return this.#copyToClipboard(`${wrapper.song.item.name} - ${wrapper.song.item.artists.map((artist) => artist.name).join(', ')} \n${wrapper.song.item.external_urls.spotify}`);
        return constants.WRAPPER_RESPONSE_NOT_AVAILABLE;
    }
};
SongClipboardButton = __decorate([
    action({ UUID: 'com.ntanis.essentials-for-spotify.song-clipboard-button' })
], SongClipboardButton);
export default SongClipboardButton;
