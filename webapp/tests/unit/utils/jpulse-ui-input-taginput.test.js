/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / jPulse UI Input tagInput
 * @tagline         Unit Tests for jPulse.UI.input.tagInput (W-148)
 * @description     Tests for tagInput: parseValue, formatValue, init/sync
 * @file            webapp/tests/unit/utils/jpulse-ui-input-taginput.test.js
 * @version         1.6.21
 * @release         2026-02-21
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
global.CustomEvent = dom.window.CustomEvent;
global.KeyboardEvent = dom.window.KeyboardEvent;

const jpulseCommonPath = path.join(process.cwd(), 'webapp/view/jpulse-common.js');
let jpulseCommonContent = fs.readFileSync(jpulseCommonPath, 'utf8');
const vm = require('vm');
const context = vm.createContext(window);
vm.runInContext(jpulseCommonContent, context);

describe('jPulse.UI.input.tagInput (W-148)', () => {

    beforeEach(() => {
        document.body.innerHTML = '';
    });

    describe('parseValue', () => {
        test('returns empty array for empty or invalid input', () => {
            expect(window.jPulse.UI.input.tagInput.parseValue('')).toEqual([]);
            expect(window.jPulse.UI.input.tagInput.parseValue(null)).toEqual([]);
            expect(window.jPulse.UI.input.tagInput.parseValue(undefined)).toEqual([]);
            expect(window.jPulse.UI.input.tagInput.parseValue(123)).toEqual([]);
        });

        test('splits on comma, newline, CR', () => {
            expect(window.jPulse.UI.input.tagInput.parseValue('a,b,c')).toEqual(['a', 'b', 'c']);
            expect(window.jPulse.UI.input.tagInput.parseValue('a\nb\nc')).toEqual(['a', 'b', 'c']);
            expect(window.jPulse.UI.input.tagInput.parseValue('a\rb\rc')).toEqual(['a', 'b', 'c']);
            expect(window.jPulse.UI.input.tagInput.parseValue('a, b , c')).toEqual(['a', 'b', 'c']);
        });

        test('allows space inside a tag', () => {
            expect(window.jPulse.UI.input.tagInput.parseValue('eng manager,admin')).toEqual(['admin', 'eng manager']);
        });

        test('trims and filters empty', () => {
            expect(window.jPulse.UI.input.tagInput.parseValue('  a  ,  b  ,  ')).toEqual(['a', 'b']);
        });

        test('dedupes and sorts', () => {
            expect(window.jPulse.UI.input.tagInput.parseValue('z,a,z,b,a')).toEqual(['a', 'b', 'z']);
        });
    });

    describe('formatValue', () => {
        test('returns empty string for empty or invalid input', () => {
            expect(window.jPulse.UI.input.tagInput.formatValue([])).toBe('');
            expect(window.jPulse.UI.input.tagInput.formatValue(null)).toBe('');
            expect(window.jPulse.UI.input.tagInput.formatValue(undefined)).toBe('');
        });

        test('sorts and joins with comma-space', () => {
            expect(window.jPulse.UI.input.tagInput.formatValue(['user', 'admin', 'root'])).toBe('admin, root, user');
            expect(window.jPulse.UI.input.tagInput.formatValue(['z', 'a', 'b'])).toBe('a, b, z');
        });

        test('round-trip with parseValue', () => {
            const arr = ['admin', 'root', 'user'];
            const str = window.jPulse.UI.input.tagInput.formatValue(arr);
            expect(window.jPulse.UI.input.tagInput.parseValue(str)).toEqual(arr);
        });
    });

    describe('init', () => {
        test('enhances input and keeps element as value store', () => {
            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'testRoles';
            input.value = 'admin, user';
            input.setAttribute('data-taginput', '1');
            document.body.appendChild(input);

            window.jPulse.UI.input.tagInput.init(input);

            const wrap = input.closest('.jp-taginput-wrap');
            expect(wrap).toBeTruthy();
            expect(wrap.contains(input)).toBe(true);
            expect(input.value).toBe('admin, user');
            const tags = wrap.querySelectorAll('.jp-taginput-tag');
            expect(tags.length).toBe(2);
        });

        test('syncs value on Enter add', () => {
            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'testAdd';
            input.value = '';
            input.setAttribute('data-taginput', '1');
            document.body.appendChild(input);

            window.jPulse.UI.input.tagInput.init(input);

            const wrap = input.closest('.jp-taginput-wrap');
            const typingInput = wrap.querySelector('[data-taginput-typing]');
            typingInput.value = 'newrole';
            typingInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

            expect(input.value).toBe('newrole');
            expect(wrap.querySelectorAll('.jp-taginput-tag').length).toBe(1);
        });

        test('does not init non-input or already inited', () => {
            const div = document.createElement('div');
            div.setAttribute('data-taginput', '1');
            document.body.appendChild(div);
            window.jPulse.UI.input.tagInput.init(div);
            expect(div.querySelector('.jp-taginput-wrap')).toBeFalsy();

            const input = document.createElement('input');
            input.type = 'text';
            input.value = 'a';
            input.setAttribute('data-taginput', '1');
            document.body.appendChild(input);
            window.jPulse.UI.input.tagInput.init(input);
            window.jPulse.UI.input.tagInput.init(input);
            expect(input.closest('.jp-taginput-wrap')).toBeTruthy();
        });

        test('data-pattern filters pasted content (HTML pattern syntax, anchored)', () => {
            jest.useFakeTimers();
            const input = document.createElement('input');
            input.type = 'text';
            input.value = '';
            input.setAttribute('data-taginput', '1');
            input.setAttribute('data-pattern', '[a-z0-9_-]+');
            document.body.appendChild(input);

            window.jPulse.UI.input.tagInput.init(input);

            const wrap = input.closest('.jp-taginput-wrap');
            const typingInput = wrap.querySelector('[data-taginput-typing]');
            typingInput.value = 'foo!bar@baz';
            typingInput.dispatchEvent(new Event('paste', { bubbles: true }));
            jest.runAllTimers();

            expect(typingInput.value).toBe('foobarbaz');
            jest.useRealTimers();
        });

        test('data-pattern filters tag on Enter', () => {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = '';
            input.setAttribute('data-taginput', '1');
            input.setAttribute('data-pattern', '[a-z0-9_-]+');
            document.body.appendChild(input);

            window.jPulse.UI.input.tagInput.init(input);

            const wrap = input.closest('.jp-taginput-wrap');
            const typingInput = wrap.querySelector('[data-taginput-typing]');
            typingInput.value = 'eng-manager!';
            typingInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

            expect(input.value).toBe('eng-manager');
            expect(wrap.querySelectorAll('.jp-taginput-tag').length).toBe(1);
        });
    });

    describe('initAll', () => {
        test('inits all [data-taginput] in container', () => {
            const form = document.createElement('form');
            const i1 = document.createElement('input');
            i1.type = 'text';
            i1.setAttribute('data-taginput', '1');
            i1.value = 'a';
            const i2 = document.createElement('input');
            i2.type = 'text';
            i2.setAttribute('data-taginput', '1');
            i2.value = 'b';
            form.appendChild(i1);
            form.appendChild(i2);
            document.body.appendChild(form);

            window.jPulse.UI.input.initAll(form);

            expect(i1.closest('.jp-taginput-wrap')).toBeTruthy();
            expect(i2.closest('.jp-taginput-wrap')).toBeTruthy();
        });
    });

    describe('Phase 2: getByPath, setByPath, setAllValues, getAllValues', () => {
        test('getByPath returns value by dotted path', () => {
            const obj = { general: { roles: ['admin', 'user'], adminRoles: ['admin'] } };
            expect(window.jPulse.UI.input.getByPath(obj, 'general.roles')).toEqual(['admin', 'user']);
            expect(window.jPulse.UI.input.getByPath(obj, 'general.adminRoles')).toEqual(['admin']);
            expect(window.jPulse.UI.input.getByPath(obj, 'general')).toEqual({ roles: ['admin', 'user'], adminRoles: ['admin'] });
            expect(window.jPulse.UI.input.getByPath(obj, 'missing')).toBeUndefined();
        });

        test('setByPath sets value by dotted path', () => {
            const obj = {};
            window.jPulse.UI.input.setByPath(obj, 'general.roles', ['admin', 'user']);
            expect(obj.general).toBeTruthy();
            expect(obj.general.roles).toEqual(['admin', 'user']);
            window.jPulse.UI.input.setByPath(obj, 'general.adminRoles', ['admin']);
            expect(obj.general.adminRoles).toEqual(['admin']);
        });

        test('setAllValues and getAllValues round-trip data-path fields', () => {
            const form = document.createElement('form');
            const input = document.createElement('input');
            input.type = 'text';
            input.setAttribute('data-path', 'general.roles');
            input.setAttribute('data-taginput', '1');
            form.appendChild(input);
            document.body.appendChild(form);

            window.jPulse.UI.input.setAllValues(form, { general: { roles: ['admin', 'user', 'root'] } });
            expect(input.value).toBe('admin, root, user');

            const got = window.jPulse.UI.input.getAllValues(form);
            expect(got.general).toBeTruthy();
            expect(got.general.roles).toEqual(['admin', 'root', 'user']);

            document.body.removeChild(form);
        });

        test('setAllValues and getAllValues handle checkboxes', () => {
            const form = document.createElement('form');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.setAttribute('data-path', 'options.enabled');
            form.appendChild(cb);
            document.body.appendChild(form);

            window.jPulse.UI.input.setAllValues(form, { options: { enabled: true } });
            expect(cb.checked).toBe(true);
            window.jPulse.UI.input.setAllValues(form, { options: { enabled: false } });
            expect(cb.checked).toBe(false);

            cb.checked = true;
            const got = window.jPulse.UI.input.getAllValues(form);
            expect(got.options).toBeTruthy();
            expect(got.options.enabled).toBe(true);

            document.body.removeChild(form);
        });
    });

    describe('setFormData / getFormData (schema-driven)', () => {
        test('setFormData applies schema defaults and normalize then setAllValues', () => {
            const form = document.createElement('form');
            const input = document.createElement('input');
            input.type = 'text';
            input.setAttribute('data-path', 'general.roles');
            input.setAttribute('data-taginput', '');
            form.appendChild(input);
            document.body.appendChild(form);

            const schema = {
                data: {
                    general: {
                        roles: { type: 'array', default: ['user', 'admin'], normalize: 'lowercase' }
                    }
                }
            };
            window.jPulse.UI.input.setFormData(form, {}, schema);
            const got = window.jPulse.UI.input.getAllValues(form);
            expect(got.general.roles).toEqual(['admin', 'user']);

            window.jPulse.UI.input.setFormData(form, { general: { roles: ['Root', 'Admin'] } }, schema);
            const got2 = window.jPulse.UI.input.getAllValues(form);
            expect(got2.general.roles).toEqual(['admin', 'root']);

            document.body.removeChild(form);
        });

        test('getFormData coerces by schema.type and applies normalize, returns { data }', () => {
            const form = document.createElement('form');
            const numInput = document.createElement('input');
            numInput.type = 'number';
            numInput.setAttribute('data-path', 'broadcast.nagTime');
            numInput.value = '4';
            form.appendChild(numInput);
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.setAttribute('data-path', 'broadcast.enable');
            cb.checked = true;
            form.appendChild(cb);
            document.body.appendChild(form);

            const schema = {
                data: {
                    broadcast: {
                        nagTime: { type: 'number', default: 4 },
                        enable: { type: 'boolean', default: false }
                    }
                }
            };
            const result = window.jPulse.UI.input.getFormData(form, schema);
            expect(result).toHaveProperty('data');
            expect(result.data.broadcast.nagTime).toBe(4);
            expect(result.data.broadcast.enable).toBe(true);

            document.body.removeChild(form);
        });
    });
});

// EOF webapp/tests/unit/utils/jpulse-ui-input-taginput.test.js
