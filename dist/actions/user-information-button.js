var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { action, } from '@elgato/streamdeck';
import { Button } from './button.js';
import images from '../library/images.js';
import wrapper from '../library/wrapper.js';
let UserInformationButton = class UserInformationButton extends Button {
    static STATABLE = true;
    constructor() {
        super();
        wrapper.on('userChanged', this.#refreshUser.bind(this));
        this.setStatelessImage('images/states/user-information-unknown');
    }
    async #refreshUser(user, pending = false, contexts = this.contexts, force = false) {
        const promises = [];
        for (const context of contexts)
            promises.push(new Promise(async (resolve) => {
                if ((!user) || typeof (user) !== 'object' || (this.marquees[context] && this.marquees[context].id !== user.id)) {
                    images.clearRaw('userProfilePicture');
                    this.clearMarquee(context);
                    await this.setTitle(context, '');
                }
                else if (force) {
                    this.clearMarquee(context);
                    await this.setTitle(context, '');
                }
                if (!images.isRawCached('userProfilePicture'))
                    await this.setImage(context, 'images/states/pending');
                if ((!user) || typeof user !== 'object') {
                    if (!pending)
                        await this.setImage(context, 'images/states/user-information');
                    resolve(true);
                    return;
                }
                const image = await images.getRaw(user.images.sort((a, b) => a.width - b.width)[0]?.url, 'userProfilePicture');
                if (!image)
                    await this.setImage(context, 'images/states/user-information');
                else
                    await this.setImage(context, `data:image/jpeg;base64,${image}`);
                if (this.settings[context].show?.includes('display_name'))
                    if ((!this.marquees[context]) || this.marquees[context].id !== user.id || force)
                        await this.marqueeTitle(user.id, [
                            {
                                key: 'display_name',
                                value: user.display_name || user.id
                            }
                        ], context);
                    else
                        this.resumeMarquee(context);
                resolve(true);
            }));
        await Promise.allSettled(promises);
    }
    async onWillDisappear(ev) {
        await super.onWillDisappear(ev);
        this.pauseMarquee(ev.action.id);
    }
    async invokeWrapperAction(context, type) {
        if (type === Button.TYPES.RELEASED)
            return;
        await this.#refreshUser(null, true, [context]);
        return await wrapper.updateUser();
    }
    async onSettingsUpdated(context, oldSettings) {
        await super.onSettingsUpdated(context, oldSettings);
        if (!this.settings[context].show)
            await this.setSettings(context, {
                show: ['display_name']
            });
        if (oldSettings.show?.length !== this.settings[context].show?.length || (oldSettings.show && this.settings[context].show && (!oldSettings.show.every((value, index) => value === this.settings[context].show[index]))))
            await this.#refreshUser(wrapper.user, false, [context], true);
    }
    async onStateSettled(context) {
        await super.onStateSettled(context, true);
        if (!wrapper.user)
            await wrapper.updateUser().then(() => this.#refreshUser(wrapper.user, false, [context]));
        else
            await this.#refreshUser(wrapper.user, false, [context]);
    }
    async onStateLoss(context) {
        await super.onStateLoss(context);
        this.clearMarquee(context);
        await this.setTitle(context, '');
    }
};
UserInformationButton = __decorate([
    action({ UUID: 'com.ntanis.essentials-for-spotify.user-information-button' }),
    __metadata("design:paramtypes", [])
], UserInformationButton);
export default UserInformationButton;
