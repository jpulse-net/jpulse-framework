/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / jPulse UI Input Segment
 * @tagline         Unit Tests for jPulse.UI.input.segment
 * @description     Tests for segment init, keyboard, set/value, and form get/set
 * @file            webapp/tests/unit/utils/jpulse-ui-input-segment.test.js
 * @version         2.0.15
 * @release         2026-11-09
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.27, Grok 4.7
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import vm from 'node:vm';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost:8080',
    pretendToBeVisual: true,
    resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.KeyboardEvent = dom.window.KeyboardEvent;

const jpulseCommonPath = path.join(process.cwd(), 'webapp/view/jpulse-common.js');
let jpulseCommonContent = fs.readFileSync(jpulseCommonPath, 'utf8');
jpulseCommonContent = jpulseCommonContent.replace(/\{\{i18n\.controller\.handlebar\.date\.fromNow\}\}/g, '{}');

const context = vm.createContext(window);
vm.runInContext(jpulseCommonContent, context);

function buildSegment(options = {}) {
    const withNames = options.names !== false;
    const checked = options.checked === undefined ? 'grouped' : options.checked;
    const el = document.createElement('div');
    el.className = 'jp-segment';
    el.setAttribute('aria-label', 'Layout');
    const items = options.items || [
        { value: 'grouped', label: 'Grouped' },
        { value: 'flat', label: 'Flat' },
        { value: 'locked', label: 'Locked', disabled: true }
    ];
    items.forEach((item) => {
        const label = document.createElement('label');
        label.className = 'jp-segment-item';
        const input = document.createElement('input');
        input.type = 'radio';
        input.value = item.value;
        if (withNames) input.name = options.name || 'layout';
        if (item.disabled) input.disabled = true;
        if (checked !== null && item.value === checked) input.checked = true;
        const span = document.createElement('span');
        span.textContent = item.label;
        label.appendChild(input);
        label.appendChild(span);
        el.appendChild(label);
    });
    document.body.appendChild(el);
    return el;
}

function key(el, name) {
    const target = el.querySelector('input[type="radio"]:checked') || el.querySelector('input[type="radio"]');
    target.dispatchEvent(new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
}

describe('jPulse.UI.input.segment', () => {

    beforeEach(() => {
        document.body.innerHTML = '';
    });

    test('init on a missing element is a no-op', () => {
        window.jPulse.UI.input.segment.init(null);
        window.jPulse.UI.input.segment.init('#missing-segment');
        expect(document.querySelector('.jp-segment')).toBeNull();
    });

    test('a second init does not bind Home/End twice', () => {
        const el = buildSegment();
        let keydownBinds = 0;
        const orig = el.addEventListener.bind(el);
        el.addEventListener = (type, fn, opts) => {
            if (type === 'keydown') keydownBinds += 1;
            return orig(type, fn, opts);
        };
        window.jPulse.UI.input.segment.init(el);
        window.jPulse.UI.input.segment.init(el);
        expect(keydownBinds).toBe(1);
        expect(el.dataset.jpSegmentInited).toBe('1');
    });

    test('click selects one radio, clears the other, and dispatches one change', () => {
        const el = buildSegment();
        window.jPulse.UI.input.segment.init(el);
        const radios = el.querySelectorAll('input[type="radio"]');
        let changes = 0;
        let value = '';
        el.addEventListener('change', (event) => {
            changes += 1;
            value = event.target.value;
        });
        radios[1].click();
        expect(radios[0].checked).toBe(false);
        expect(radios[1].checked).toBe(true);
        expect(changes).toBe(1);
        expect(value).toBe('flat');
        expect(window.jPulse.UI.input.segment.value(el)).toBe('flat');
    });

    test('set checks without a change event and ignores unknown or disabled values', () => {
        const el = buildSegment();
        window.jPulse.UI.input.segment.init(el);
        let changes = 0;
        el.addEventListener('change', () => { changes += 1; });
        window.jPulse.UI.input.segment.set(el, 'flat');
        expect(window.jPulse.UI.input.segment.value(el)).toBe('flat');
        expect(changes).toBe(0);
        window.jPulse.UI.input.segment.set(el, 'nope');
        expect(window.jPulse.UI.input.segment.value(el)).toBe('flat');
        window.jPulse.UI.input.segment.set(el, 'locked');
        expect(window.jPulse.UI.input.segment.value(el)).toBe('flat');
        expect(changes).toBe(0);
    });

    test('a disabled radio ignores click, and aria-disabled disables every radio', () => {
        const el = buildSegment();
        const radios = el.querySelectorAll('input[type="radio"]');
        radios[2].click();
        expect(radios[2].checked).toBe(false);
        expect(radios[0].checked).toBe(true);

        const group = buildSegment({ name: 'status' });
        group.setAttribute('aria-disabled', 'true');
        window.jPulse.UI.input.segment.init(group);
        const all = group.querySelectorAll('input[type="radio"]');
        all.forEach((radio) => {
            expect(radio.disabled).toBe(true);
        });
        const before = window.jPulse.UI.input.segment.value(group);
        all[1].click();
        expect(window.jPulse.UI.input.segment.value(group)).toBe(before);
    });

    test('a missing name becomes one generated name, and no checked radio becomes the first enabled', () => {
        const el = buildSegment({ names: false, checked: null });
        let changes = 0;
        el.addEventListener('change', () => { changes += 1; });
        window.jPulse.UI.input.segment.init(el);
        const radios = el.querySelectorAll('input[type="radio"]');
        expect(radios[0].getAttribute('name')).toMatch(/^jp-segment-\d+$/);
        expect(radios[1].getAttribute('name')).toBe(radios[0].getAttribute('name'));
        expect(radios[0].checked).toBe(true);
        expect(changes).toBe(0);

        const other = buildSegment({ names: false, name: 'other', checked: 'flat' });
        window.jPulse.UI.input.segment.init(other);
        const otherName = other.querySelector('input[type="radio"]').getAttribute('name');
        expect(otherName).not.toBe(radios[0].getAttribute('name'));
    });

    test('Home and End move to the enabled ends and change fires only when the selection changes', () => {
        const el = buildSegment({ checked: 'flat' });
        window.jPulse.UI.input.segment.init(el);
        const radios = el.querySelectorAll('input[type="radio"]');
        let changes = 0;
        el.addEventListener('change', () => { changes += 1; });

        key(el, 'Home');
        expect(radios[0].checked).toBe(true);
        expect(changes).toBe(1);

        key(el, 'Home');
        expect(changes).toBe(1);

        key(el, 'End');
        expect(radios[1].checked).toBe(true);
        expect(radios[2].checked).toBe(false);
        expect(changes).toBe(2);

        key(el, 'End');
        expect(changes).toBe(2);
    });

    test('getAllValues and setAllValues round-trip data-path on the first radio', () => {
        const form = document.createElement('form');
        form.innerHTML = ''
            + '<div class="jp-segment" aria-label="Layout">'
            + '<label class="jp-segment-item"><input type="radio" name="layout" value="grouped" data-path="demo.layout" checked><span>Grouped</span></label>'
            + '<label class="jp-segment-item"><input type="radio" name="layout" value="flat"><span>Flat</span></label>'
            + '</div>';
        document.body.appendChild(form);
        const group = form.querySelector('.jp-segment');
        window.jPulse.UI.input.segment.init(group);

        window.jPulse.UI.input.setAllValues(form, { demo: { layout: 'flat' } });
        expect(window.jPulse.UI.input.segment.value(group)).toBe('flat');
        expect(window.jPulse.UI.input.getAllValues(form)).toEqual({ demo: { layout: 'flat' } });

        window.jPulse.UI.input.setAllValues(form, { demo: { layout: 'grouped' } });
        expect(window.jPulse.UI.input.getAllValues(form).demo.layout).toBe('grouped');
    });

    test('input.initAll inits a segment, and the widget does not touch localStorage', () => {
        const el = buildSegment();
        window.jPulse.UI.input.initAll(document.body);
        expect(el.dataset.jpSegmentInited).toBe('1');

        ['init', 'initAll', 'set', 'value', '_resolve', '_radios', '_enabled'].forEach((name) => {
            expect(window.jPulse.UI.input.segment[name].toString()).not.toMatch(/localStorage/);
        });
        const calls = jpulseCommonContent.match(/jPulse\.UI\.input\.segment\.initAll\(/g) || [];
        expect(calls.length).toBeGreaterThanOrEqual(2);
    });
});

// EOF webapp/tests/unit/utils/jpulse-ui-input-segment.test.js
