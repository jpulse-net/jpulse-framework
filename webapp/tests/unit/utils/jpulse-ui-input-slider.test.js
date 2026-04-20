/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / jPulse UI Input Slider
 * @tagline         Unit Tests for jPulse.UI.input.slider (W-168)
 * @description     Tests for slider init, initAll, setAllValues/getAllValues, _jpSliderSetValue
 * @file            webapp/tests/unit/utils/jpulse-ui-input-slider.test.js
 * @version         1.6.41
 * @release         2026-04-20
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.5, Claude Sonnet 4.6
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

const jpulseCommonPath = path.join(process.cwd(), 'webapp/view/jpulse-common.js');
const jpulseCommonContent = fs.readFileSync(jpulseCommonPath, 'utf8');

const context = vm.createContext(window);
vm.runInContext(jpulseCommonContent, context);

describe('jPulse.UI.input.slider (W-168)', () => {

    beforeEach(() => {
        document.body.innerHTML = '';
    });

    describe('init', () => {
        test('no-op when selector matches nothing', () => {
            window.jPulse.UI.input.slider.init('#nonexistent');
            expect(document.querySelector('.jp-slider-wrap')).toBeFalsy();
        });

        test('no-op when element is not an input', () => {
            const div = document.createElement('div');
            div.setAttribute('data-slider', '1');
            document.body.appendChild(div);
            window.jPulse.UI.input.slider.init(div);
            expect(document.querySelector('.jp-slider-wrap')).toBeFalsy();
        });

        test('enhances input and creates wrap, track, fill, thumb, value label', () => {
            const input = document.createElement('input');
            input.type = 'number';
            input.setAttribute('data-slider', '1');
            input.setAttribute('data-slider-min', '0');
            input.setAttribute('data-slider-max', '100');
            input.value = '50';
            document.body.appendChild(input);

            window.jPulse.UI.input.slider.init(input);

            const wrap = input.closest('.jp-slider-wrap');
            expect(wrap).toBeTruthy();
            expect(wrap.querySelector('.jp-slider-track')).toBeTruthy();
            expect(wrap.querySelector('.jp-slider-fill')).toBeTruthy();
            expect(wrap.querySelector('.jp-slider-thumb')).toBeTruthy();
            expect(wrap.querySelector('.jp-slider-value')).toBeTruthy();
            expect(input.classList.contains('jp-slider-value-input')).toBe(true);
            expect(input.dataset.sliderInited).toBe('1');
        });

        test('does not double-init', () => {
            const input = document.createElement('input');
            input.type = 'number';
            input.setAttribute('data-slider', '1');
            input.value = '10';
            document.body.appendChild(input);

            window.jPulse.UI.input.slider.init(input);
            window.jPulse.UI.input.slider.init(input);

            const wraps = document.querySelectorAll('.jp-slider-wrap');
            expect(wraps.length).toBe(1);
        });

        test('with data-slider-default adds default tick', () => {
            const input = document.createElement('input');
            input.type = 'number';
            input.setAttribute('data-slider', '1');
            input.setAttribute('data-slider-default', '50');
            input.value = '25';
            document.body.appendChild(input);

            window.jPulse.UI.input.slider.init(input);

            const wrap = input.closest('.jp-slider-wrap');
            expect(wrap.querySelector('.jp-slider-default-tick')).toBeTruthy();
        });
    });

    describe('_jpSliderSetValue', () => {
        test('_jpSliderSetValue updates thumb label and input value', () => {
            const input = document.createElement('input');
            input.type = 'number';
            input.setAttribute('data-slider', '1');
            input.setAttribute('data-slider-min', '0');
            input.setAttribute('data-slider-max', '100');
            input.value = '20';
            document.body.appendChild(input);

            window.jPulse.UI.input.slider.init(input);
            const valueLabel = document.querySelector('.jp-slider-value');
            expect(valueLabel).toBeTruthy();
            expect(typeof input._jpSliderSetValue).toBe('function');

            input._jpSliderSetValue(75);

            expect(valueLabel.textContent).toBe('75');
            expect(input.value).toBe('75');
        });
    });

    describe('getAllValues', () => {
        test('getAllValues returns slider input value', () => {
            const form = document.createElement('form');
            const input = document.createElement('input');
            input.type = 'number';
            input.setAttribute('data-slider', '1');
            input.setAttribute('data-path', 'demo.volume');
            input.value = '60';
            form.appendChild(input);
            document.body.appendChild(form);

            window.jPulse.UI.input.slider.init(input);
            input.value = '60';

            const data = window.jPulse.UI.input.getAllValues(form);
            expect(data.demo.volume).toBe('60');
        });
    });

    describe('initAll', () => {
        test('initAll inits all input[data-slider] in container', () => {
            const form = document.createElement('form');
            const input1 = document.createElement('input');
            input1.type = 'number';
            input1.setAttribute('data-slider', '1');
            input1.value = '0';
            const input2 = document.createElement('input');
            input2.type = 'number';
            input2.setAttribute('data-slider', '1');
            input2.value = '100';
            form.appendChild(input1);
            form.appendChild(input2);
            document.body.appendChild(form);

            window.jPulse.UI.input.initAll(form);

            expect(input1.closest('.jp-slider-wrap')).toBeTruthy();
            expect(input2.closest('.jp-slider-wrap')).toBeTruthy();
            expect(document.querySelectorAll('.jp-slider-wrap').length).toBe(2);
        });
    });
});

// EOF webapp/tests/unit/utils/jpulse-ui-input-slider.test.js
