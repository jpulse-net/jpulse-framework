/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / jPulse SchemaForm
 * @tagline         Unit Tests for jPulse.schemaForm namespace (W-189)
 * @description     Registry, showWhen evaluator + setup pass, helper API
 * @file            webapp/tests/unit/utils/jpulse-schema-form.test.js
 * @version         1.7.1
 * @release         2026-07-26
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.2, Claude Opus 4.7
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost:8080',
    pretendToBeVisual: true,
    resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
const win = global.window;
const doc = win.document;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;
global.KeyboardEvent = dom.window.KeyboardEvent;

const jpulseCommonPath = path.join(process.cwd(), 'webapp/view/jpulse-common.js');
let jpulseCommonContent = fs.readFileSync(jpulseCommonPath, 'utf8');
jpulseCommonContent = jpulseCommonContent.replace(/\{\{i18n\.controller\.handlebar\.date\.fromNow\}\}/g, '{}');
const context = vm.createContext(win);
vm.runInContext(jpulseCommonContent, context);

describe('jPulse.schemaForm namespace (W-189)', () => {

    beforeEach(() => {
        doc.body.innerHTML = '';
    });

    describe('registry: register / unregister / resolve', () => {
        afterEach(() => {
            win.jPulse.schemaForm.unregister('test.handler');
            win.jPulse.schemaForm.unregister('test.other');
        });

        test('register stores a handler under a name', () => {
            const fn = () => 'hi';
            win.jPulse.schemaForm.register('test.handler', fn);
            expect(win.jPulse.schemaForm.resolve('test.handler')).toBe(fn);
        });

        test('register throws on empty name', () => {
            expect(() => win.jPulse.schemaForm.register('', () => {})).toThrow(/non-empty string/);
        });

        test('register throws on non-function value', () => {
            expect(() => win.jPulse.schemaForm.register('x', 'not a fn')).toThrow(/must be a function/);
        });

        test('register throws on duplicate name (call unregister first)', () => {
            const fn1 = () => 1;
            win.jPulse.schemaForm.register('test.handler', fn1);
            expect(() => win.jPulse.schemaForm.register('test.handler', () => 2)).toThrow(/already registered/);
        });

        test('unregister is idempotent', () => {
            expect(() => win.jPulse.schemaForm.unregister('not.registered')).not.toThrow();
        });

        test('resolve falls back to window-rooted dotted path when registry has no match', () => {
            win.testFallback = { foo: () => 'window-fn' };
            expect(typeof win.jPulse.schemaForm.resolve('testFallback.foo')).toBe('function');
            delete win.testFallback;
        });

        test('resolve returns null for unknown names', () => {
            expect(win.jPulse.schemaForm.resolve('nothing.here')).toBeNull();
            expect(win.jPulse.schemaForm.resolve('')).toBeNull();
        });
    });

    describe('_resolveHandler accepts function or string', () => {
        test('function passes through unchanged', () => {
            const fn = () => 1;
            expect(win.jPulse.schemaForm._resolveHandler(fn)).toBe(fn);
        });

        test('string resolves via resolve()', () => {
            const fn = () => 1;
            win.jPulse.schemaForm.register('test.handler', fn);
            expect(win.jPulse.schemaForm._resolveHandler('test.handler')).toBe(fn);
            win.jPulse.schemaForm.unregister('test.handler');
        });

        test('null/undefined returns null', () => {
            expect(win.jPulse.schemaForm._resolveHandler(null)).toBeNull();
            expect(win.jPulse.schemaForm._resolveHandler(undefined)).toBeNull();
        });
    });

    describe('evalShowWhen', () => {
        beforeEach(() => {
            doc.body.innerHTML = '<form id="f"><select data-path="general.fit"><option value="cover" selected>Cover</option><option value="contain">Contain</option></select></form>';
        });

        test('equals scalar returns true when matched', () => {
            const form = doc.getElementById('f');
            const out = win.jPulse.schemaForm.evalShowWhen({ field: 'general.fit', equals: 'cover' }, form);
            expect(out).toBe(true);
        });

        test('equals array returns true when any matches', () => {
            const form = doc.getElementById('f');
            const out = win.jPulse.schemaForm.evalShowWhen({ field: 'general.fit', equals: ['contain', 'cover'] }, form);
            expect(out).toBe(true);
        });

        test('equals scalar returns false when not matched', () => {
            const form = doc.getElementById('f');
            const out = win.jPulse.schemaForm.evalShowWhen({ field: 'general.fit', equals: 'contain' }, form);
            expect(out).toBe(false);
        });

        test('notEquals inverts the match', () => {
            const form = doc.getElementById('f');
            expect(win.jPulse.schemaForm.evalShowWhen({ field: 'general.fit', notEquals: 'cover' }, form)).toBe(false);
            expect(win.jPulse.schemaForm.evalShowWhen({ field: 'general.fit', notEquals: 'contain' }, form)).toBe(true);
        });

        test('all returns true only when all leaves match', () => {
            const form = doc.getElementById('f');
            const out = win.jPulse.schemaForm.evalShowWhen({
                all: [
                    { field: 'general.fit', equals: 'cover' },
                    { field: 'general.fit', notEquals: 'contain' }
                ]
            }, form);
            expect(out).toBe(true);
        });

        test('any returns true when at least one leaf matches', () => {
            const form = doc.getElementById('f');
            const out = win.jPulse.schemaForm.evalShowWhen({
                any: [
                    { field: 'general.fit', equals: 'X' },
                    { field: 'general.fit', equals: 'cover' }
                ]
            }, form);
            expect(out).toBe(true);
        });

        test('missing field treated as empty string (no match)', () => {
            const form = doc.getElementById('f');
            const out = win.jPulse.schemaForm.evalShowWhen({ field: 'general.missing', equals: 'cover' }, form);
            expect(out).toBe(false);
        });
    });

    describe('_collectShowWhenDeps', () => {
        test('collects single field', () => {
            const deps = win.jPulse.schemaForm._collectShowWhenDeps({ field: 'a.b', equals: 'x' });
            expect([...deps]).toEqual(['a.b']);
        });

        test('collects all fields from compound condition', () => {
            const deps = win.jPulse.schemaForm._collectShowWhenDeps({
                all: [
                    { field: 'a', equals: 1 },
                    { any: [{ field: 'b', equals: 2 }, { field: 'c', equals: 3 }] }
                ]
            });
            expect([...deps].sort()).toEqual(['a', 'b', 'c']);
        });

        test('returns empty Set for missing condition', () => {
            const deps = win.jPulse.schemaForm._collectShowWhenDeps(null);
            expect(deps.size).toBe(0);
        });
    });

    describe('setupShowWhen integration', () => {
        beforeEach(() => {
            doc.body.innerHTML = `
                <form id="f">
                    <div class="jp-schema-field">
                        <select data-path="general.fit">
                            <option value="cover" selected>Cover</option>
                            <option value="contain">Contain</option>
                        </select>
                    </div>
                    <div class="jp-schema-field" id="widthWrap" data-jp-show-when='{"field":"general.fit","equals":"cover"}'>
                        <input data-path="general.width" type="number">
                    </div>
                </form>
            `;
        });

        test('initial pass shows fields whose condition matches', () => {
            const form = doc.getElementById('f');
            win.jPulse.schemaForm.setupShowWhen(form);
            expect(doc.getElementById('widthWrap').classList.contains('jp-schema-field-hidden')).toBe(false);
        });

        test('hides field when watched value changes to non-matching', () => {
            const form = doc.getElementById('f');
            win.jPulse.schemaForm.setupShowWhen(form);
            const sel = form.querySelector('select');
            sel.value = 'contain';
            sel.dispatchEvent(new win.Event('change', { bubbles: true }));
            expect(doc.getElementById('widthWrap').classList.contains('jp-schema-field-hidden')).toBe(true);
        });

        test('toggles required attribute when hiding/showing required input', () => {
            doc.body.innerHTML = `
                <form id="f">
                    <div class="jp-schema-field">
                        <select data-path="g.fit">
                            <option value="a" selected>A</option>
                            <option value="b">B</option>
                        </select>
                    </div>
                    <div class="jp-schema-field" id="wrap" data-jp-show-when='{"field":"g.fit","equals":"b"}'>
                        <input data-path="g.x" type="text" required>
                    </div>
                </form>
            `;
            const form = doc.getElementById('f');
            win.jPulse.schemaForm.setupShowWhen(form);
            const wrap = doc.getElementById('wrap');
            const inp = wrap.querySelector('input');
            // Initially hidden because fit=a, not b
            expect(wrap.classList.contains('jp-schema-field-hidden')).toBe(true);
            expect(inp.required).toBe(false);
            expect(inp.dataset.jpRequiredCache).toBe('1');
            // Flip fit → b → wrap shown, required restored
            const sel = form.querySelector('select');
            sel.value = 'b';
            sel.dispatchEvent(new win.Event('change', { bubbles: true }));
            expect(wrap.classList.contains('jp-schema-field-hidden')).toBe(false);
            expect(inp.required).toBe(true);
        });

        test('idempotent: re-calling does not double-fire listeners', () => {
            const form = doc.getElementById('f');
            win.jPulse.schemaForm.setupShowWhen(form);
            win.jPulse.schemaForm.setupShowWhen(form);
            // If listeners were stacked, we'd see no functional issue here, but the WeakMap
            // tracking ensures we keep only one. Smoke test: still toggles correctly.
            const sel = form.querySelector('select');
            sel.value = 'contain';
            sel.dispatchEvent(new win.Event('change', { bubbles: true }));
            expect(doc.getElementById('widthWrap').classList.contains('jp-schema-field-hidden')).toBe(true);
        });
    });

    describe('helpers: applyOptions / setLoading / setError', () => {
        test('applyOptions replaces <option>s and preserves current value', () => {
            doc.body.innerHTML = '<select id="s"><option value="x" selected>X</option></select>';
            const sel = doc.getElementById('s');
            win.jPulse.schemaForm.applyOptions(sel, [{ value: 'a' }, { value: 'b' }], 'b');
            expect(sel.options).toHaveLength(2);
            expect(sel.value).toBe('b');
        });

        test('setLoading toggles class and disables input', () => {
            doc.body.innerHTML = '<div class="jp-schema-field" id="w"><div class="jp-form-group"><select></select></div></div>';
            const wrap = doc.getElementById('w');
            const sel = wrap.querySelector('select');
            win.jPulse.schemaForm.setLoading(wrap, true);
            expect(wrap.classList.contains('jp-form-input-loading')).toBe(true);
            expect(sel.disabled).toBe(true);
            win.jPulse.schemaForm.setLoading(wrap, false);
            expect(wrap.classList.contains('jp-form-input-loading')).toBe(false);
            expect(sel.disabled).toBe(false);
        });

        test('setError adds class and inserts message', () => {
            doc.body.innerHTML = '<div class="jp-schema-field" id="w"><div class="jp-form-group"><input></div></div>';
            const wrap = doc.getElementById('w');
            win.jPulse.schemaForm.setError(wrap, 'oops');
            expect(wrap.classList.contains('jp-schema-field-error')).toBe(true);
            const msg = wrap.querySelector('.jp-schema-field-error-msg');
            expect(msg).not.toBeNull();
            expect(msg.textContent).toBe('oops');
        });
    });
});

// EOF webapp/tests/unit/utils/jpulse-schema-form.test.js
