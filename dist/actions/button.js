var _a;
import StreamDeck from '@elgato/streamdeck';
import { Action } from './action.js';
import constants from './../library/constants.js';
import connector from './../library/connector.js';
import logger from './../library/logger.js';
export class Button extends Action {
    static ACTIONLESS = false;
    static HOLDABLE = false;
    static MULTI = false;
    static SETUPLESS = false;
    static STATABLE = false;
    static TYPES = {
        SINGLE_PRESS: Symbol('SINGLE_PRESS'),
        DOUBLE_PRESS: Symbol('DOUBLE_PRESS'),
        TRIPLE_PRESS: Symbol('TRIPLE_PRESS'),
        LONG_PRESS: Symbol('LONG_PRESS'),
        HOLDING: Symbol('HOLDING'),
        RELEASED: Symbol('RELEASED')
    };
    #pressed = {};
    #holding = {};
    #busy = {};
    #unpressable = {};
    #flashing = {};
    #statelessImage = '';
    #keyUpTracker = {};
    #lastImage = {};
    #lastTitle = {};
    marquees = {};
    constructor() {
        super();
        if (this.constructor.STATABLE)
            connector.on('setupStateChanged', (state) => {
                if (!state)
                    for (const context of this.contexts)
                        this.onStateLoss(context);
                else
                    for (const context of this.contexts)
                        this.onStateSettled(context);
            });
    }
    async #flashImage(action, image, duration = 500, times = 2) {
        action.setTitle('');
        this.#flashing[action.id] = new Promise(async (resolve) => {
            this.pauseMarquee(action.id);
            for (let i = 0; i < times; i++) {
                await action.setImage(image).catch((e) => logger.error(`An error occurred while setting the Stream Deck image of "${this.manifestId}": "${e.message || 'No message.'}" @ "${e.stack || 'No stack trace.'}".`));
                await new Promise(resolve => setTimeout(resolve, duration));
                await action.setImage(this.#lastImage[action.id] ?? (this.constructor.STATABLE && (!connector.set) ? this.#statelessImage : undefined)).catch((e) => logger.error(`An error occurred while setting the Stream Deck image of "${this.manifestId}": "${e.message || 'No message.'}" @ "${e.stack || 'No stack trace.'}".`));
                if (i + 1 < times)
                    await new Promise(resolve => setTimeout(resolve, duration));
            }
            if (this.#lastTitle[action.id])
                await action.setTitle(this.#lastTitle[action.id]);
            delete this.#flashing[action.id];
            if (this.constructor.STATABLE && connector.set)
                await this.onStateSettled(action.id);
            this.resumeMarquee(action.id, true);
            resolve(true);
        });
    }
    async onKeyDown(ev) {
        if (this.#busy[ev.action.id] || this.#unpressable[ev.action.id] || this.constructor.ACTIONLESS)
            return;
        this.#busy[ev.action.id] = true;
        this.#pressed[ev.action.id] = {
            invoked: false,
            timeout: null,
            long: false
        };
        if ((!this.#holding[ev.action.id]) && this.constructor.HOLDABLE) {
            this.#holding[ev.action.id] = {
                held: false,
                resolve: null,
                timeout: null
            };
            await new Promise(resolve => {
                this.#holding[ev.action.id].resolve = resolve;
                this.#holding[ev.action.id].timeout = setTimeout(() => {
                    if (this.#pressed[ev.action.id] && this.#holding[ev.action.id])
                        this.#holding[ev.action.id].held = true;
                    resolve(true);
                }, constants.BUTTON_HOLD_DELAY);
            });
            if (!this.#holding[ev.action.id])
                return;
        }
        else if ((!this.constructor.HOLDABLE) && this.constructor.MULTI)
            this.#pressed[ev.action.id].timeout = setTimeout(async () => {
                if (this.#pressed[ev.action.id]) {
                    this.#pressed[ev.action.id].long = true;
                    this.#pressed[ev.action.id].invoked = true;
                    await this.#invokePress(ev, true, 1);
                }
            }, constants.BUTTON_HOLD_DELAY);
        if (this.#holding[ev.action.id] || (!this.constructor.MULTI))
            if ((!connector.set) && (!this.constructor.SETUPLESS))
                await this.#flashImage(ev.action, 'images/states/setup-error', constants.LONG_FLASH_DURATION, constants.LONG_FLASH_TIMES);
            else {
                this.#pressed[ev.action.id].invoked = true;
                const held = this.#holding[ev.action.id]?.held || false;
                const startedInvokingAt = Date.now();
                const response = await this.invokeWrapperAction(ev.action.id, this.#holding[ev.action.id] ? _a.TYPES.HOLDING : _a.TYPES.SINGLE_PRESS);
                if (response === constants.WRAPPER_RESPONSE_SUCCESS_INDICATIVE)
                    await this.#flashImage(ev.action, 'images/states/success', constants.SHORT_FLASH_DURATION, constants.SHORT_FLASH_TIMES);
                if ((response === constants.WRAPPER_RESPONSE_SUCCESS || response === constants.WRAPPER_RESPONSE_SUCCESS_INDICATIVE || response === constants.WRAPPER_RESPONSE_BUSY) && (held || this.#holding[ev.action.id]?.held) && this.#pressed[ev.action.id])
                    this.#pressed[ev.action.id].timeout = setTimeout(() => {
                        if (this.#pressed[ev.action.id])
                            this.onKeyDown(ev);
                    }, Math.max(0, constants.BUTTON_HOLD_REPEAT_INTERVAL - (Date.now() - startedInvokingAt)));
                else if (response === constants.WRAPPER_RESPONSE_NOT_AVAILABLE)
                    await this.#flashImage(ev.action, 'images/states/not-available', constants.LONG_FLASH_DURATION, constants.LONG_FLASH_TIMES);
                else if (response === constants.WRAPPER_RESPONSE_API_RATE_LIMITED)
                    await this.#flashImage(ev.action, 'images/states/api-rate-limited', constants.LONG_FLASH_DURATION, constants.LONG_FLASH_TIMES);
                else if (response === constants.WRAPPER_RESPONSE_API_ERROR)
                    await this.#flashImage(ev.action, 'images/states/api-error', constants.LONG_FLASH_DURATION, constants.LONG_FLASH_TIMES);
                else if (response === constants.WRAPPER_RESPONSE_FATAL_ERROR)
                    await this.#flashImage(ev.action, 'images/states/fatal-error', constants.LONG_FLASH_DURATION, constants.LONG_FLASH_TIMES);
                else if (response === constants.WRAPPER_RESPONSE_NO_DEVICE_ERROR)
                    await this.#flashImage(ev.action, 'images/states/no-device-error', constants.LONG_FLASH_DURATION, constants.LONG_FLASH_TIMES);
                else if (response === constants.WRAPPER_RESPONSE_BUSY)
                    await this.#flashImage(ev.action, 'images/states/busy', constants.SHORT_FLASH_DURATION, constants.SHORT_FLASH_TIMES);
            }
        if ((!this.#holding[ev.action.id]) && this.#pressed[ev.action.id]?.invoked) {
            this.#pressed[ev.action.id].invoked = false;
            await this.invokeWrapperAction(ev.action.id, _a.TYPES.RELEASED);
        }
        delete this.#busy[ev.action.id];
    }
    async #invokePress(ev, long, presses) {
        if ((!connector.set) && (!this.constructor.SETUPLESS))
            await this.#flashImage(ev.action, 'images/states/setup-error', constants.LONG_FLASH_DURATION, constants.LONG_FLASH_TIMES);
        else {
            if (long)
                await this.#flashImage(ev.action, 'images/states/long', constants.VERY_SHORT_FLASH_DURATION, constants.SHORT_FLASH_TIMES);
            const response = await this.invokeWrapperAction(ev.action.id, long ? _a.TYPES.LONG_PRESS : (presses === 1 ? _a.TYPES.SINGLE_PRESS : (presses === 2 ? _a.TYPES.DOUBLE_PRESS : _a.TYPES.TRIPLE_PRESS)));
            if (response === constants.WRAPPER_RESPONSE_SUCCESS_INDICATIVE)
                await this.#flashImage(ev.action, 'images/states/success', constants.SHORT_FLASH_DURATION, constants.SHORT_FLASH_TIMES);
            else if (response === constants.WRAPPER_RESPONSE_NOT_AVAILABLE)
                await this.#flashImage(ev.action, 'images/states/not-available', constants.LONG_FLASH_DURATION, constants.LONG_FLASH_TIMES);
            else if (response === constants.WRAPPER_RESPONSE_API_RATE_LIMITED)
                await this.#flashImage(ev.action, 'images/states/api-rate-limited', constants.LONG_FLASH_DURATION, constants.LONG_FLASH_TIMES);
            else if (response === constants.WRAPPER_RESPONSE_API_ERROR)
                await this.#flashImage(ev.action, 'images/states/api-error', constants.LONG_FLASH_DURATION, constants.LONG_FLASH_TIMES);
            else if (response === constants.WRAPPER_RESPONSE_FATAL_ERROR)
                await this.#flashImage(ev.action, 'images/states/fatal-error', constants.LONG_FLASH_DURATION, constants.LONG_FLASH_TIMES);
            else if (response === constants.WRAPPER_RESPONSE_NO_DEVICE_ERROR)
                await this.#flashImage(ev.action, 'images/states/no-device-error', constants.LONG_FLASH_DURATION, constants.LONG_FLASH_TIMES);
            else if (response === constants.WRAPPER_RESPONSE_BUSY)
                await this.#flashImage(ev.action, 'images/states/busy', constants.SHORT_FLASH_DURATION, constants.SHORT_FLASH_TIMES);
        }
    }
    async onKeyUp(ev) {
        if (this.#busy[ev.action.id] || this.#unpressable[ev.action.id] || this.constructor.ACTIONLESS) {
            let wasReleasedBeforeHoldDelay = false;
            let wasHeld = false;
            if (this.#holding[ev.action.id] && (!this.#holding[ev.action.id].held)) {
                const resolve = this.#holding[ev.action.id].resolve;
                clearTimeout(this.#holding[ev.action.id].timeout);
                delete this.#holding[ev.action.id];
                resolve(true);
                wasReleasedBeforeHoldDelay = true;
            }
            else if (this.#holding[ev.action.id]) {
                wasHeld = true;
                clearTimeout(this.#holding[ev.action.id].timeout);
                delete this.#holding[ev.action.id];
            }
            if ((!this.constructor.MULTI) || wasHeld) {
                if ((!this.#unpressable[ev.action.id]) && (!this.constructor.ACTIONLESS)) {
                    if (wasReleasedBeforeHoldDelay)
                        await this.#invokePress(ev, false, 1);
                    if (this.#pressed[ev.action.id]?.invoked || wasReleasedBeforeHoldDelay)
                        await this.invokeWrapperAction(ev.action.id, _a.TYPES.RELEASED);
                }
                if (this.#pressed[ev.action.id]) {
                    clearTimeout(this.#pressed[ev.action.id].timeout);
                    delete this.#pressed[ev.action.id];
                }
                if (wasReleasedBeforeHoldDelay)
                    delete this.#busy[ev.action.id];
                return;
            }
        }
        this.#busy[ev.action.id] = true;
        if (this.#holding[ev.action.id]?.resolve)
            this.#holding[ev.action.id].resolve(true);
        clearTimeout(this.#pressed[ev.action.id]?.timeout);
        clearTimeout(this.#holding[ev.action.id]?.timeout);
        if (this.#pressed[ev.action.id])
            if ((!this.#holding[ev.action.id]) && this.constructor.MULTI && (!this.#pressed[ev.action.id].long))
                if ((!this.#keyUpTracker[ev.action.id]) || this.#keyUpTracker[ev.action.id].presses < 3) {
                    clearTimeout(this.#keyUpTracker[ev.action.id]?.timeout);
                    this.#keyUpTracker[ev.action.id] = {
                        time: Date.now(),
                        presses: (this.#keyUpTracker[ev.action.id]?.presses || 0) + 1,
                        timeout: setTimeout(async () => {
                            this.#busy[ev.action.id] = true;
                            await this.#invokePress(ev, false, this.#keyUpTracker[ev.action.id].presses);
                            await this.invokeWrapperAction(ev.action.id, _a.TYPES.RELEASED);
                            delete this.#keyUpTracker[ev.action.id];
                            delete this.#busy[ev.action.id];
                        }, constants.BUTTON_MULTI_PRESS_INTERVAL)
                    };
                }
        if (this.#pressed[ev.action.id]?.invoked)
            await this.invokeWrapperAction(ev.action.id, _a.TYPES.RELEASED);
        delete this.#pressed[ev.action.id];
        delete this.#holding[ev.action.id];
        delete this.#busy[ev.action.id];
    }
    async onWillAppear(ev) {
        await super.onWillAppear(ev);
        await this.setImage(ev.action.id, this.#lastImage[ev.action.id] ?? (this.constructor.STATABLE && (!connector.set) ? this.#statelessImage : undefined));
        await this.setTitle(ev.action.id, this.#lastTitle[ev.action.id] ?? '');
        if (this.constructor.STATABLE)
            if (!connector.set)
                await this.onStateLoss(ev.action.id);
            else
                await this.onStateSettled(ev.action.id, true);
    }
    async onWillDisappear(ev) {
        await super.onWillDisappear(ev);
        if (this.#flashing[ev.action.id])
            await this.#flashing[ev.action.id];
        if (this.#holding[ev.action.id]?.resolve)
            this.#holding[ev.action.id].resolve(true);
        clearTimeout(this.#pressed[ev.action.id]?.timeout);
        clearTimeout(this.#holding[ev.action.id]?.timeout);
        clearTimeout(this.#keyUpTracker[ev.action.id]?.timeout);
        delete this.#pressed[ev.action.id];
        delete this.#holding[ev.action.id];
        delete this.#keyUpTracker[ev.action.id];
    }
    async invokeWrapperAction(context, type) {
        return constants.WRAPPER_RESPONSE_NOT_AVAILABLE;
    }
    async setTitle(context, title) {
        this.#lastTitle[context] = title;
        if (!this.#flashing[context])
            await StreamDeck.client.setTitle(context, title).catch((e) => logger.error(`An error occurred while setting the Stream Deck title of "${this.manifestId}": "${e.message || 'No message.'}" @ "${e.stack || 'No stack trace.'}".`));
    }
    async setImage(context, image) {
        this.#lastImage[context] = image;
        if (!this.#flashing[context])
            await StreamDeck.client.setImage(context, image).catch((e) => logger.error(`An error occurred while setting the Stream Deck image of "${this.manifestId}": "${e.message || 'No message.'}" @ "${e.stack || 'No stack trace.'}".`));
    }
    async setState(context, state) {
        await StreamDeck.client.setState(context, state).catch((e) => logger.error(`An error occurred while setting the Stream Deck state of "${this.manifestId}": "${e.message || 'No message.'}" @ "${e.stack || 'No stack trace.'}".`));
    }
    async onStateSettled(context, skipImageReset = false) {
        if (!skipImageReset)
            await this.setImage(context);
    }
    async onStateLoss(context) {
        await this.setImage(context, this.#statelessImage);
    }
    async marqueeTitle(id, data, context, forced = false) {
        if (this.#flashing[context])
            return;
        data = data.filter(item => !!item);
        if (data.length === 0) {
            this.clearMarquee(context);
            this.setTitle(context, '');
            return;
        }
        const isInitial = !this.marquees[context];
        const marqueeData = this.marquees[context] || {
            timeout: null,
            id,
            data,
            entries: {}
        };
        if (!this.marquees[context])
            for (let i = 0; i < data.length; i++) {
                marqueeData.entries[data[i].key] = {
                    original: data[i].value,
                    render: `${data[i].value}${' '.repeat(constants.BUTTON_MARQUEE_SPACING * constants.BUTTON_MARQUEE_SPACING_MULTIPLIER)}`,
                    frame: null,
                    totalFrames: null
                };
            }
        if (this.marquees[context] && this.marquees[context].id !== id)
            return;
        this.marquees[context] = marqueeData;
        let finalText = '';
        for (let i = 0; i < data.length; i++) {
            if (marqueeData.entries[data[i].key].frame === null)
                marqueeData.entries[data[i].key].frame = (marqueeData.entries[data[i].key].original.length / 2) + constants.BUTTON_MARQUEE_SPACING;
            if (marqueeData.entries[data[i].key].totalFrames === null)
                marqueeData.entries[data[i].key].totalFrames = marqueeData.entries[data[i].key].render.length;
            finalText += `${this.getTextSpacingWidth(marqueeData.entries[data[i].key].original) > constants.BUTTON_MARQUEE_SPACING ? `${marqueeData.entries[data[i].key].render.slice(marqueeData.entries[data[i].key].frame)}${marqueeData.entries[data[i].key].render.slice(0, marqueeData.entries[data[i].key].frame)}` : marqueeData.entries[data[i].key].original}\n`;
        }
        this.setTitle(context, finalText.slice(0, -1));
        if ((!this.marquees[context]) || this.marquees[context].id !== id)
            return;
        for (let i = 0; i < data.length; i++) {
            marqueeData.entries[data[i].key].frame++;
            if (marqueeData.entries[data[i].key].frame >= marqueeData.entries[data[i].key].totalFrames)
                marqueeData.entries[data[i].key].frame = 0;
        }
        if (!forced)
            marqueeData.timeout = setTimeout(() => this.marqueeTitle(id, marqueeData.data, context), isInitial ? constants.BUTTON_MARQUEE_INTERVAL_INITIAL : constants.BUTTON_MARQUEE_INTERVAL);
    }
    updateMarqueeEntry(context, key, value) {
        if (this.marquees[context] && this.marquees[context].entries[key]) {
            this.marquees[context].entries[key].original = value;
            this.marquees[context].entries[key].render = `${value}${' '.repeat(constants.BUTTON_MARQUEE_SPACING * constants.BUTTON_MARQUEE_SPACING_MULTIPLIER)}`;
            this.marquees[context].entries[key].totalFrames = this.marquees[context].entries[key].render.length;
        }
    }
    resumeMarquee(context, forced = false) {
        if (this.marquees[context]) {
            clearTimeout(this.marquees[context].timeout);
            if (forced)
                this.marqueeTitle(this.marquees[context].id, this.marquees[context].data, context, true);
            this.marquees[context].timeout = setTimeout(() => this.marqueeTitle(this.marquees[context].id, this.marquees[context].data, context), constants.BUTTON_MARQUEE_INTERVAL);
        }
    }
    pauseMarquee(context) {
        if (this.marquees[context]) {
            clearTimeout(this.marquees[context].timeout);
            this.marquees[context].timeout = null;
        }
    }
    clearMarquee(context) {
        if (this.marquees[context]) {
            clearTimeout(this.marquees[context].timeout);
            delete this.marquees[context];
        }
    }
    getTextSpacingWidth(text) {
        let totalWidth = 0;
        for (const char of text)
            totalWidth += constants.CHARACTER_WIDTH_MAP[char] || 1;
        return totalWidth;
    }
    setStatelessImage(image) {
        this.#statelessImage = image;
    }
    setUnpressable(context, busy) {
        if (!busy)
            delete this.#unpressable[context];
        else
            this.#unpressable[context] = busy;
    }
}
_a = Button;
