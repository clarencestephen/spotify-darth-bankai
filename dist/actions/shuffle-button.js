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
let ShuffleButton = class ShuffleButton extends Button {
    static STATABLE = true;
    constructor() {
        super();
        this.setStatelessImage('images/states/shuffle-unknown');
        wrapper.on('shuffleStateChanged', this.#onShuffleStateChanged.bind(this));
    }
    async #onShuffleStateChanged(state, contexts = this.contexts) {
        const promises = [];
        for (const context of contexts)
            promises.push(this.setState(context, state ? 1 : 0));
        return Promise.allSettled(promises);
    }
    async invokeWrapperAction(context, type) {
        if (type === Button.TYPES.RELEASED)
            return;
        return wrapper.toggleShuffle();
    }
    async onStateSettled(context) {
        await super.onStateSettled(context);
        await this.#onShuffleStateChanged(wrapper.shuffleState, [context]);
    }
};
ShuffleButton = __decorate([
    action({ UUID: 'com.ntanis.essentials-for-spotify.shuffle-button' }),
    __metadata("design:paramtypes", [])
], ShuffleButton);
export default ShuffleButton;
