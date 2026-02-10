/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / jPulse UI Input jpSelect
 * @tagline         Unit Tests for jPulse.UI.input.jpSelect (W-151)
 * @description     Tests for jpSelect init, setAllValues/getAllValues multi-select
 * @file            webapp/tests/unit/utils/jpulse-ui-input-jpselect.test.js
 * @version         1.6.14
 * @release         2026-02-11
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.4, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

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

const vm = require('vm');
const context = vm.createContext(window);
vm.runInContext(jpulseCommonContent, context);

describe('jPulse.UI.input.jpSelect (W-151)', () => {

    beforeEach(() => {
        document.body.innerHTML = '';
    });

    describe('init', () => {
        test('no-op when selector matches nothing', () => {
            window.jPulse.UI.input.jpSelect.init('#nonexistent');
            expect(document.querySelector('.jp-jpselect-wrap')).toBeFalsy();
        });

        test('no-op when element is not a select', () => {
            const input = document.createElement('input');
            input.type = 'text';
            document.body.appendChild(input);
            window.jPulse.UI.input.jpSelect.init(input);
            expect(document.querySelector('.jp-jpselect-wrap')).toBeFalsy();
        });

        test('enhances select and creates wrapper, trigger, dropdown', () => {
            const sel = document.createElement('select');
            sel.id = 'testSelect';
            sel.innerHTML = '<option value="a">A</option><option value="b">B</option>';
            sel.setAttribute('data-jpselect', '1');
            document.body.appendChild(sel);

            window.jPulse.UI.input.jpSelect.init(sel);

            const wrap = sel.closest('.jp-jpselect-wrap');
            expect(wrap).toBeTruthy();
            expect(wrap.querySelector('.jp-jpselect-trigger')).toBeTruthy();
            expect(wrap.querySelector('.jp-jpselect-dropdown')).toBeTruthy();
            expect(wrap.querySelector('.jp-jpselect-list')).toBeTruthy();
            expect(sel.classList.contains('jp-jpselect-native')).toBe(true);
            expect(sel.dataset.jpselectInited).toBe('1');
        });

        test('does not double-init', () => {
            const sel = document.createElement('select');
            sel.innerHTML = '<option value="x">X</option>';
            sel.setAttribute('data-jpselect', '1');
            document.body.appendChild(sel);

            window.jPulse.UI.input.jpSelect.init(sel);
            window.jPulse.UI.input.jpSelect.init(sel);

            const wraps = document.querySelectorAll('.jp-jpselect-wrap');
            expect(wraps.length).toBe(1);
        });

        test('init with search: true adds search input', () => {
            const sel = document.createElement('select');
            sel.innerHTML = '<option value="a">A</option><option value="b">B</option>';
            sel.setAttribute('data-jpselect', '1');
            document.body.appendChild(sel);

            window.jPulse.UI.input.jpSelect.init(sel, { search: true });

            const wrap = sel.closest('.jp-jpselect-wrap');
            expect(wrap.querySelector('.jp-jpselect-search')).toBeTruthy();
        });

        test('init multi with selectAll: true adds select-all button', () => {
            const sel = document.createElement('select');
            sel.multiple = true;
            sel.innerHTML = '<option value="x">X</option><option value="y">Y</option>';
            sel.setAttribute('data-jpselect', '1');
            document.body.appendChild(sel);

            window.jPulse.UI.input.jpSelect.init(sel, { selectAll: true });

            const wrap = sel.closest('.jp-jpselect-wrap');
            expect(wrap.querySelector('.jp-jpselect-select-all')).toBeTruthy();
        });

        test('init multi with custom separator uses it in trigger caption', () => {
            const sel = document.createElement('select');
            sel.multiple = true;
            sel.innerHTML = '<option value="a">LabelA</option><option value="b">LabelB</option>';
            sel.setAttribute('data-jpselect', '1');
            document.body.appendChild(sel);

            window.jPulse.UI.input.jpSelect.init(sel, { separator: '; ' });

            sel.options[0].selected = true;
            sel.options[1].selected = true;
            sel._jpSelectUpdateCaption();

            const trigger = sel.closest('.jp-jpselect-wrap').querySelector('.jp-jpselect-trigger');
            expect(trigger.textContent).toBe('LabelA; LabelB');
        });
    });

    describe('getAllValues / setAllValues multi-select', () => {
        test('getAllValues returns array for multi select', () => {
            const form = document.createElement('form');
            const sel = document.createElement('select');
            sel.multiple = true;
            sel.setAttribute('data-path', 'foo.bar');
            sel.innerHTML = '<option value="1">One</option><option value="2">Two</option><option value="3">Three</option>';
            form.appendChild(sel);
            document.body.appendChild(form);

            sel.options[0].selected = true;
            sel.options[2].selected = true;

            const data = window.jPulse.UI.input.getAllValues(form);
            expect(data.foo.bar).toEqual(['1', '3']);
        });

        test('setAllValues sets selected options for multi select', () => {
            const form = document.createElement('form');
            const sel = document.createElement('select');
            sel.multiple = true;
            sel.setAttribute('data-path', 'foo.bar');
            sel.innerHTML = '<option value="a">A</option><option value="b">B</option><option value="c">C</option>';
            form.appendChild(sel);
            document.body.appendChild(form);

            window.jPulse.UI.input.setAllValues(form, { foo: { bar: ['b', 'c'] } });

            expect(sel.options[0].selected).toBe(false);
            expect(sel.options[1].selected).toBe(true);
            expect(sel.options[2].selected).toBe(true);
        });

        test('setAllValues on jpSelect-enhanced form refreshes trigger caption', () => {
            const form = document.createElement('form');
            const sel = document.createElement('select');
            sel.multiple = true;
            sel.setAttribute('data-path', 'demo.tags');
            sel.setAttribute('data-jpselect', '1');
            sel.innerHTML = '<option value="a">Alpha</option><option value="b">Beta</option><option value="c">Gamma</option>';
            form.appendChild(sel);
            document.body.appendChild(form);

            window.jPulse.UI.input.jpSelect.init(sel);
            window.jPulse.UI.input.setAllValues(form, { demo: { tags: ['a', 'c'] } });

            const trigger = sel.closest('.jp-jpselect-wrap').querySelector('.jp-jpselect-trigger');
            expect(sel.options[0].selected).toBe(true);
            expect(sel.options[2].selected).toBe(true);
            expect(trigger.textContent).toMatch(/Alpha|Gamma|selected/);
        });
    });
});

// EOF webapp/tests/unit/utils/jpulse-ui-input-jpselect.test.js
