var _a;
import StreamDeck from '@elgato/streamdeck';
import { Action } from './action.js';
import { v4 } from 'uuid';
import connector from './../library/connector.js';
import constants from './../library/constants.js';
import logger from './../library/logger.js';
export class Dial extends Action {
    static HOLDABLE = false;
    static STATABLE = false;
    static TYPES = {
        ROTATE_CLOCKWISE: Symbol('ROTATE_CLOCKWISE'),
        ROTATE_COUNTERCLOCKWISE: Symbol('ROTATE_COUNTERCLOCKWISE'),
        UP: Symbol('UP'),
        DOWN: Symbol('DOWN'),
        TAP: Symbol('TAP'),
        LONG_TAP: Symbol('LONG_TAP')
    };
    layout;
    #busy = {};
    #unpressable = {};
    #holding = {};
    #marquees = {};
    icon;
    originalIcon;
    contexts = [];
    constructor(layout, icon) {
        super();
        this.layout = layout;
        this.icon = icon;
        this.originalIcon = icon;
        connector.on('setupStateChanged', (state) => {
            if (this.constructor.STATABLE)
                if (!state)
                    for (const context of this.contexts)
                        this.onStateLoss(context);
                else
                    for (const context of this.contexts)
                        this.onStateSettled(context);
            if (!state)
                for (const context of this.contexts)
                    this.resetFeedbackLayout(context);
            else
                for (const context of this.contexts)
                    this.updateFeedback(context);
        });
        if (connector.set)
            for (const context of this.contexts)
                this.updateFeedback(context);
    }
    async #processAction(action, type) {
        if (this.#busy[action.id] || this.#unpressable[action.id] || (type === _a.TYPES.DOWN && this.#holding[action.id]) || (type === _a.TYPES.UP && this.constructor.HOLDABLE && (!this.#holding[action.id])))
            return;
        this.#busy[action.id] = true;
        if (type === _a.TYPES.UP)
            delete this.#holding[action.id];
        if (!connector.set)
            await this.flashIcon(action.id, 'images/icons/setup-error.png');
        else {
            const response = (this.constructor.HOLDABLE && (type === _a.TYPES.DOWN || type === _a.TYPES.UP)) ? (type === _a.TYPES.DOWN ? await this.invokeHoldWrapperAction(action.id) : await this.invokeHoldReleaseWrapperAction(action.id)) : await this.invokeWrapperAction(action.id, type);
            if ((response === constants.WRAPPER_RESPONSE_SUCCESS || response === constants.WRAPPER_RESPONSE_SUCCESS_INDICATIVE) && type === _a.TYPES.DOWN && this.constructor.HOLDABLE)
                this.#holding[action.id] = true;
            if (response === constants.WRAPPER_RESPONSE_SUCCESS_INDICATIVE)
                await this.flashIcon(action.id, 'images/icons/success.png', false);
            else if (response === constants.WRAPPER_RESPONSE_NOT_AVAILABLE)
                await this.flashIcon(action.id, 'images/icons/not-available.png');
            else if (response === constants.WRAPPER_RESPONSE_API_RATE_LIMITED)
                await this.flashIcon(action.id, 'images/icons/api-rate-limited.png');
            else if (response === constants.WRAPPER_RESPONSE_API_ERROR)
                await this.flashIcon(action.id, 'images/icons/api-error.png');
            else if (response === constants.WRAPPER_RESPONSE_FATAL_ERROR)
                await this.flashIcon(action.id, 'images/icons/fatal-error.png');
            else if (response === constants.WRAPPER_RESPONSE_NO_DEVICE_ERROR)
                await this.flashIcon(action.id, 'images/icons/no-device-error.png');
            else if (response === constants.WRAPPER_RESPONSE_BUSY)
                await this.flashIcon(action.id, 'images/icons/busy.png');
        }
        delete this.#busy[action.id];
    }
    getIconForStatus(status) {
        if (!connector.set)
            return 'images/icons/setup-error.png';
        else if (status === constants.WRAPPER_RESPONSE_SUCCESS)
            return 'images/icons/success.png';
        else if (status === constants.WRAPPER_RESPONSE_NOT_AVAILABLE)
            return 'images/icons/not-available.png';
        else if (status === constants.WRAPPER_RESPONSE_API_RATE_LIMITED)
            return 'images/icons/api-rate-limited.png';
        else if (status === constants.WRAPPER_RESPONSE_API_ERROR)
            return 'images/icons/api-error.png';
        else if (status === constants.WRAPPER_RESPONSE_FATAL_ERROR)
            return 'images/icons/fatal-error.png';
        else if (status === constants.WRAPPER_RESPONSE_NO_DEVICE_ERROR)
            return 'images/icons/no-device-error.png';
        else if (status === constants.WRAPPER_RESPONSE_BUSY)
            return 'images/icons/busy.png';
    }
    async flashIcon(context, icon, alert = true, duration = 500, times = 1) {
        for (let i = 0; i < times; i++) {
            if (alert)
                await this.showAlert(context).catch((e) => logger.error(`An error occurred while showing the Stream Deck alert of "${this.manifestId}": "${e.message || 'No message.'}" @ "${e.stack || 'No stack trace.'}".`));
            await this.setFeedback(context, {
                icon
            }, true).catch((e) => logger.error(`An error occurred while setting the Stream Deck feedback of "${this.manifestId}": "${e.message || 'No message.'}" @ "${e.stack || 'No stack trace.'}".`));
            await new Promise(resolve => setTimeout(resolve, duration));
            await this.setFeedback(context, {
                icon: connector.set ? this.icon : this.originalIcon
            }, true).catch((e) => logger.error(`An error occurred while setting the Stream Deck feedback of "${this.manifestId}": "${e.message || 'No message.'}" @ "${e.stack || 'No stack trace.'}".`));
            if (i + 1 < times)
                await new Promise(resolve => setTimeout(resolve, duration));
        }
    }
    async marquee(id, key, value, countable, visible, context) {
        const marqueeIdentifier = `${context}-${key}`;
        const isInitial = !this.#marquees[marqueeIdentifier];
        id = id ?? v4();
        const marqueeData = this.#marquees[marqueeIdentifier] || {
            timeout: null,
            id,
            key,
            original: value,
            countable,
            render: `${value} | `,
            visible,
            frame: 0,
            context,
            last: null,
            totalFrames: null
        };
        if (this.#marquees[marqueeIdentifier] && this.#marquees[marqueeIdentifier].id !== id)
            return;
        this.#marquees[marqueeIdentifier] = marqueeData;
        if (marqueeData.totalFrames === null)
            marqueeData.totalFrames = marqueeData.render.length;
        if (marqueeData.last && countable.length > marqueeData.visible)
            while (marqueeData.last[1] === ' ') {
                marqueeData.last = marqueeData.last.substr(1);
                marqueeData.frame++;
                if (marqueeData.frame >= marqueeData.totalFrames) {
                    marqueeData.frame = 0;
                    marqueeData.last = marqueeData.original;
                }
            }
        marqueeData.last = countable.length > marqueeData.visible ? `${marqueeData.render.substr(marqueeData.frame, marqueeData.visible)}${marqueeData.frame + marqueeData.visible > marqueeData.render.length ? marqueeData.render.substr(0, (marqueeData.frame + marqueeData.visible) - marqueeData.render.length) : ''}` : marqueeData.original;
        await this.setFeedback(context, {
            [marqueeData.key]: marqueeData.last
        });
        if ((!this.#marquees[marqueeIdentifier]) || this.#marquees[marqueeIdentifier].id !== id)
            return;
        marqueeData.frame++;
        if (marqueeData.frame >= marqueeData.totalFrames)
            marqueeData.frame = 0;
        marqueeData.timeout = setTimeout(() => this.marquee(id, marqueeData.key, marqueeData.original, marqueeData.countable, marqueeData.visible, context), isInitial ? constants.DIAL_MARQUEE_INTERVAL_INITIAL : constants.DIAL_MARQUEE_INTERVAL);
    }
    async onDialRotate(ev) {
        return this.#processAction(ev.action, ev.payload.ticks > 0 ? _a.TYPES.ROTATE_CLOCKWISE : _a.TYPES.ROTATE_COUNTERCLOCKWISE);
    }
    async onDialUp(ev) {
        if (this.constructor.HOLDABLE)
            while (this.#busy[ev.action.id])
                await new Promise(resolve => setTimeout(resolve, 100));
        return this.#processAction(ev.action, _a.TYPES.UP);
    }
    async onDialDown(ev) {
        return this.#processAction(ev.action, _a.TYPES.DOWN);
    }
    async onTouchTap(ev) {
        return this.#processAction(ev.action, ev.payload.hold ? _a.TYPES.LONG_TAP : _a.TYPES.TAP);
    }
    async onWillAppear(ev) {
        await super.onWillAppear(ev);
        if (connector.set)
            await this.updateFeedback(ev.action.id);
    }
    async onWillDisappear(ev) {
        this.contexts.splice(this.contexts.indexOf(ev.action.id), 1);
    }
    async invokeWrapperAction(context, type) {
        return constants.WRAPPER_RESPONSE_NOT_AVAILABLE;
    }
    async invokeHoldWrapperAction(context) {
        if (this.constructor.HOLDABLE)
            return constants.WRAPPER_RESPONSE_NOT_AVAILABLE;
    }
    async invokeHoldReleaseWrapperAction(context) {
        if (this.constructor.HOLDABLE)
            return constants.WRAPPER_RESPONSE_NOT_AVAILABLE;
    }
    async setFeedback(context, feedback, force = false) {
        if (((!this.contexts.includes(context)) || (!connector.set)) && (!force))
            return;
        await StreamDeck.client.setFeedback(context, feedback).catch((e) => logger.error(`An error occurred while setting the Stream Deck feedback of "${this.manifestId}": "${e.message || 'No message.'}" @ "${e.stack || 'No stack trace.'}".`));
    }
    async showAlert(context) {
        await StreamDeck.client.showAlert(context).catch((e) => logger.error(`An error occurred while showing the Stream Deck alert of "${this.manifestId}": "${e.message || 'No message.'}" @ "${e.stack || 'No stack trace.'}".`));
    }
    async setIcon(context, icon, force = false) {
        if (((!this.contexts.includes(context)) || (!connector.set) && (!force)))
            return;
        this.icon = icon;
        await StreamDeck.client.setFeedback(context, {
            icon
        }).catch((e) => logger.error(`An error occurred while setting the Stream Deck feedback of "${this.manifestId}": "${e.message || 'No message.'}" @ "${e.stack || 'No stack trace.'}".`));
    }
    async resetFeedbackLayout(context, feedback = null) {
        for (const key in this.#marquees)
            this.pauseMarquee(context, this.#marquees[key].key);
        await StreamDeck.client.setFeedbackLayout(context, this.layout).catch((e) => logger.error(`An error occurred while setting the Stream Deck feedback layout of "${this.manifestId}": "${e.message || 'No message.'}" @ "${e.stack || 'No stack trace.'}".`));
        if (feedback)
            await StreamDeck.client.setFeedback(context, feedback).catch((e) => logger.error(`An error occurred while setting the Stream Deck feedback of "${this.manifestId}": "${e.message || 'No message.'}" @ "${e.stack || 'No stack trace.'}".`));
    }
    isHolding(context) {
        return this.#holding[context];
    }
    updateMarquee(context, key, value, countable) {
        const marqueeIdentifier = `${context}-${key}`;
        if (this.#marquees[marqueeIdentifier]) {
            this.#marquees[marqueeIdentifier].frame = 0;
            this.#marquees[marqueeIdentifier].original = value;
            this.#marquees[marqueeIdentifier].countable = countable;
            this.#marquees[marqueeIdentifier].render = `${value} | `;
            this.#marquees[marqueeIdentifier].totalFrames = this.#marquees[marqueeIdentifier].render.length;
        }
    }
    resumeMarquee(context, key) {
        const marqueeIdentifier = `${context}-${key}`;
        if (this.#marquees[marqueeIdentifier]) {
            this.#marquees[marqueeIdentifier].frame--;
            if (this.#marquees[marqueeIdentifier].frame < 0)
                this.#marquees[marqueeIdentifier].frame = this.#marquees[marqueeIdentifier].totalFrames;
            clearTimeout(this.#marquees[marqueeIdentifier].timeout);
            this.marquee(this.#marquees[marqueeIdentifier].id, this.#marquees[marqueeIdentifier].key, this.#marquees[marqueeIdentifier].original, this.#marquees[marqueeIdentifier].countable, this.#marquees[marqueeIdentifier].visible, context);
        }
    }
    pauseMarquee(context, key) {
        const marqueeIdentifier = `${context}-${key}`;
        if (this.#marquees[marqueeIdentifier]) {
            clearTimeout(this.#marquees[marqueeIdentifier].timeout);
            this.#marquees[marqueeIdentifier].timeout = null;
        }
    }
    clearMarquee(context, key) {
        const marqueeIdentifier = `${context}-${key}`;
        if (this.#marquees[marqueeIdentifier]) {
            clearTimeout(this.#marquees[marqueeIdentifier].timeout);
            delete this.#marquees[marqueeIdentifier];
        }
    }
    getMarquee(context, key) {
        return this.#marquees[`${context}-${key}`];
    }
    setUnpressable(context, busy) {
        if (!busy)
            delete this.#unpressable[context];
        else
            this.#unpressable[context] = busy;
    }
    async onStateSettled(context) { }
    async onStateLoss(context) { }
    async updateFeedback(context) { }
}
_a = Dial;
