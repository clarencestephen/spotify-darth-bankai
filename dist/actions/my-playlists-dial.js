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
import ItemsDial from './items-dial.js';
import wrapper from './../library/wrapper.js';
let MyPlaylistsDial = class MyPlaylistsDial extends ItemsDial {
    constructor() {
        super('layouts/items-layout.json', 'images/icons/playlists.png');
    }
    async fetchItems(page) {
        return await wrapper.getPlaylists(page);
    }
};
MyPlaylistsDial = __decorate([
    action({ UUID: 'com.ntanis.essentials-for-spotify.my-playlists-dial' }),
    __metadata("design:paramtypes", [])
], MyPlaylistsDial);
export default MyPlaylistsDial;
