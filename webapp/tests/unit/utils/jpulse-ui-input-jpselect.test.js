/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / jPulse UI Input jpSelect
 * @tagline         Unit Tests for jPulse.UI.input.jpSelect (W-151)
 * @description     Tests for jpSelect init, setAllValues/getAllValues multi-select
 * @file            webapp/tests/unit/utils/jpulse-ui-input-jpselect.test.js
 * @version         1.6.43
 * @release         2026-04-22
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
let jpulseCommonContent = fs.readFileSync(jpulseCommonPath, 'utf8');
// W-185: strip the unquoted subtree-embed token (would otherwise break JS parse when loaded raw)
jpulseCommonContent = jpulseCommonContent.replace(/\{\{i18n\.controller\.handlebar\.date\.fromNow\}\}/g, '{}');

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

        test('enhances select and creates wrapper, trigger, dropdown in body (W-173)', () => {
            const sel = document.createElement('select');
            sel.id = 'testSelect';
            sel.innerHTML = '<option value="a">A</option><option value="b">B</option>';
            sel.setAttribute('data-jpselect', '1');
            document.body.appendChild(sel);

            window.jPulse.UI.input.jpSelect.init(sel);

            const wrap = sel.closest('.jp-jpselect-wrap');
            expect(wrap).toBeTruthy();
            expect(wrap.querySelector('.jp-jpselect-trigger')).toBeTruthy();
            expect(wrap.querySelector('.jp-jpselect-dropdown')).toBeFalsy();
            const dropdown = document.querySelector('.jp-jpselect-dropdown');
            expect(dropdown).toBeTruthy();
            expect(document.body.contains(dropdown)).toBe(true);
            expect(dropdown.classList.contains('jp-jpselect-dropdown-portal')).toBe(true);
            expect(dropdown.querySelector('.jp-jpselect-list')).toBeTruthy();
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

            const dropdown = document.querySelector('.jp-jpselect-dropdown');
            expect(dropdown.querySelector('.jp-jpselect-search')).toBeTruthy();
        });

        test('init multi with selectAll: true adds select-all button', () => {
            const sel = document.createElement('select');
            sel.multiple = true;
            sel.innerHTML = '<option value="x">X</option><option value="y">Y</option>';
            sel.setAttribute('data-jpselect', '1');
            document.body.appendChild(sel);

            window.jPulse.UI.input.jpSelect.init(sel, { selectAll: true });

            const dropdown = document.querySelector('.jp-jpselect-dropdown');
            expect(dropdown.querySelector('.jp-jpselect-select-all')).toBeTruthy();
        });

        test('init with onOptionPreview calls callback on option hover and (null, null) on leave', () => {
            const sel = document.createElement('select');
            sel.innerHTML = '<option value="x">OptionX</option><option value="y">OptionY</option>';
            sel.setAttribute('data-jpselect', '1');
            document.body.appendChild(sel);

            const onOptionPreview = jest.fn();
            window.jPulse.UI.input.jpSelect.init(sel, { onOptionPreview });

            const wrap = sel.closest('.jp-jpselect-wrap');
            const trigger = wrap.querySelector('.jp-jpselect-trigger');
            const dropdown = document.querySelector('.jp-jpselect-dropdown');
            const listEl = dropdown.querySelector('.jp-jpselect-list');

            trigger.click();
            const options = listEl.querySelectorAll('.jp-jpselect-option');
            expect(options.length).toBe(2);

            options[0].dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
            expect(onOptionPreview).toHaveBeenLastCalledWith('x', 'OptionX');

            options[1].dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
            expect(onOptionPreview).toHaveBeenLastCalledWith('y', 'OptionY');

            listEl.dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: true }));
            expect(onOptionPreview).toHaveBeenLastCalledWith(null, null);
        });

        test('onOptionPreview with empty value passes "" and (null, null) on leave', () => {
            const sel = document.createElement('select');
            sel.innerHTML = '<option value="">— Select —</option><option value="a">A</option>';
            sel.setAttribute('data-jpselect', '1');
            document.body.appendChild(sel);

            const onOptionPreview = jest.fn();
            window.jPulse.UI.input.jpSelect.init(sel, { onOptionPreview });

            const wrap = sel.closest('.jp-jpselect-wrap');
            wrap.querySelector('.jp-jpselect-trigger').click();
            const dropdown = document.querySelector('.jp-jpselect-dropdown');
            const options = dropdown.querySelector('.jp-jpselect-list').querySelectorAll('.jp-jpselect-option');
            options[0].dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
            expect(onOptionPreview).toHaveBeenLastCalledWith('', '— Select —');
            dropdown.querySelector('.jp-jpselect-list').dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: true }));
            expect(onOptionPreview).toHaveBeenLastCalledWith(null, null);
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

    describe('W-173: dropdown in body, viewport flip', () => {
        test('dropdown is in document.body when open', () => {
            const sel = document.createElement('select');
            sel.innerHTML = '<option value="a">A</option><option value="b">B</option>';
            sel.setAttribute('data-jpselect', '1');
            document.body.appendChild(sel);
            window.jPulse.UI.input.jpSelect.init(sel);

            const dropdown = document.querySelector('.jp-jpselect-dropdown');
            expect(dropdown.parentNode).toBe(document.body);

            const trigger = document.querySelector('.jp-jpselect-trigger');
            trigger.click();
            expect(dropdown.classList.contains('jp-jpselect-open')).toBe(true);
            expect(dropdown.parentNode).toBe(document.body);
        });

        test('dropdown gets open-up class when insufficient space below trigger', () => {
            const sel = document.createElement('select');
            sel.innerHTML = '<option value="a">A</option><option value="b">B</option>';
            sel.setAttribute('data-jpselect', '1');
            document.body.appendChild(sel);
            window.jPulse.UI.input.jpSelect.init(sel);

            const trigger = document.querySelector('.jp-jpselect-trigger');
            const dropdown = document.querySelector('.jp-jpselect-dropdown');

            Object.defineProperty(trigger, 'getBoundingClientRect', {
                value: () => ({ left: 10, top: 800, width: 200, height: 40, bottom: 840, right: 210 }),
                configurable: true
            });
            trigger.click();

            expect(dropdown.classList.contains('jp-jpselect-open')).toBe(true);
            expect(dropdown.classList.contains('jp-jpselect-dropdown-open-up')).toBe(true);
        });
    });
});

// EOF webapp/tests/unit/utils/jpulse-ui-input-jpselect.test.js
