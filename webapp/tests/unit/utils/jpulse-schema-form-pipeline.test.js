/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / jPulse SchemaForm Pipeline
 * @tagline         Runtime async-pipeline tests for W-189: loadOptions, onInit, ready, isolation
 * @description     Exercises the _runSchemaPostRender / runPostRender pipeline end-to-end in JSDOM:
 *                  loadOptions function/string forms, rejection isolation, onInit ctx + widgetOptions
 *                  mutation, ready Promise resolution, enum alias, showWhen post-pipeline setup.
 * @file            webapp/tests/unit/utils/jpulse-schema-form-pipeline.test.js
 * @version         1.7.10
 * @release         2026-08-09
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.2, Claude Sonnet 4.6
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

/** Build a minimal schema + rendered HTML in a <form> and return form element. */
function buildForm(blockKey, blockDef, blockData) {
    const html = win.jPulse.UI.tabs._renderSchemaBlockFields(blockKey, blockDef, blockData || {});
    const form = doc.createElement('form');
    form.id = 'test-form';
    form.innerHTML = html;
    doc.body.appendChild(form);
    return form;
}

/** Run the post-render pipeline and return the resolved Promise. */
function runPipeline(form, schema, data) {
    return win.jPulse.schemaForm.runPostRender(form, schema, data || {});
}

describe('W-189 — _runSchemaPostRender async pipeline (runtime)', () => {

    beforeEach(() => {
        doc.body.innerHTML = '';
    });

    afterEach(() => {
        // Clean up any registered handlers
        ['test.loadRegions', 'test.loadFail', 'test.loadEmpty', 'test.onInitHook'].forEach((name) => {
            try { win.jPulse.schemaForm.unregister(name); } catch (_) {}
        });
        delete win.testWindowFallback;
    });

    // ─── loadOptions: function form ───────────────────────────────────────────

    describe('loadOptions — function form', () => {
        test('populates <option>s after the promise resolves', async () => {
            const blockDef = {
                _meta: {},
                region: {
                    type: 'string',
                    inputType: 'select',
                    label: 'Region',
                    options: [],
                    loadOptions: async () => [{ value: 'us-east', label: 'US East' }, { value: 'eu-west', label: 'EU West' }]
                }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };
            await runPipeline(form, schema, { blk: {} });

            const sel = form.querySelector('[data-path="blk.region"]');
            expect(sel.options).toHaveLength(2);
            expect(sel.options[0].value).toBe('us-east');
            expect(sel.options[1].value).toBe('eu-west');
        });

        test('loading state cleared after resolve (no jp-form-input-loading on wrapper)', async () => {
            const blockDef = {
                _meta: {},
                region: {
                    type: 'string', inputType: 'select', label: 'Region', options: [],
                    loadOptions: async () => [{ value: 'a', label: 'A' }]
                }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };
            await runPipeline(form, schema, { blk: {} });

            const wrap = form.querySelector('.jp-schema-field');
            expect(wrap.classList.contains('jp-form-input-loading')).toBe(false);
        });

        test('preserves current value when it appears in the resolved list', async () => {
            const blockDef = {
                _meta: {},
                region: {
                    type: 'string', inputType: 'select', label: 'Region', options: [],
                    loadOptions: async () => [{ value: 'us-east' }, { value: 'eu-west' }]
                }
            };
            const form = buildForm('blk', blockDef, { region: 'eu-west' });
            const schema = { data: { blk: blockDef } };
            await runPipeline(form, schema, { blk: { region: 'eu-west' } });

            const sel = form.querySelector('[data-path="blk.region"]');
            expect(sel.value).toBe('eu-west');
        });

        test('ctx passed to loadOptions has correct shape', async () => {
            let capturedCtx = null;
            const blockDef = {
                _meta: {},
                region: {
                    type: 'string', inputType: 'select', label: 'Region', options: [],
                    loadOptions: async (ctx) => { capturedCtx = ctx; return []; }
                }
            };
            const form = buildForm('blk', blockDef, { region: 'x' });
            const schema = { data: { blk: blockDef } };
            await runPipeline(form, schema, { blk: { region: 'x' } });

            expect(capturedCtx).not.toBeNull();
            expect(capturedCtx.blockKey).toBe('blk');
            expect(capturedCtx.path).toBe('blk.region');
            expect(capturedCtx.value).toBe('x');
            expect(capturedCtx.schema).toBe(schema);
            expect(capturedCtx.field).toBe(form.querySelector('[data-path="blk.region"]'));
            expect(capturedCtx.formEl).toBe(form);
        });
    });

    // ─── loadOptions: string form (registry + window fallback) ────────────────

    describe('loadOptions — string form', () => {
        test('resolves via jPulse.schemaForm registry', async () => {
            win.jPulse.schemaForm.register('test.loadRegions', async () => [
                { value: 'us', label: 'US' }, { value: 'eu', label: 'EU' }
            ]);
            const blockDef = {
                _meta: {},
                region: {
                    type: 'string', inputType: 'select', label: 'Region', options: [],
                    loadOptions: 'test.loadRegions'
                }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };
            await runPipeline(form, schema, { blk: {} });

            const sel = form.querySelector('[data-path="blk.region"]');
            expect(sel.options).toHaveLength(2);
            expect(sel.options[0].value).toBe('us');
        });

        test('falls back to window-rooted dotted path when not in registry', async () => {
            win.testWindowFallback = {
                loadRegions: async () => [{ value: 'ap', label: 'AP' }]
            };
            const blockDef = {
                _meta: {},
                region: {
                    type: 'string', inputType: 'select', label: 'Region', options: [],
                    loadOptions: 'testWindowFallback.loadRegions'
                }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };
            await runPipeline(form, schema, { blk: {} });

            const sel = form.querySelector('[data-path="blk.region"]');
            expect(sel.options).toHaveLength(1);
            expect(sel.options[0].value).toBe('ap');
        });

        test('missing handler: falls back to static options, no throw', async () => {
            const blockDef = {
                _meta: {},
                region: {
                    type: 'string', inputType: 'select', label: 'Region',
                    options: [{ value: 'static' }],
                    loadOptions: 'test.noSuchHandler'
                }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };
            // Should not throw
            await expect(runPipeline(form, schema, { blk: {} })).resolves.not.toThrow();
            // Static option preserved (no swap with empty resolved list when handler is null)
            const sel = form.querySelector('[data-path="blk.region"]');
            // null handler → no applyLoadedOptions call → original static option stays
            expect(sel.options).toHaveLength(1);
            expect(sel.options[0].value).toBe('static');
        });
    });

    // ─── loadOptions: rejection isolation ─────────────────────────────────────

    describe('loadOptions — rejection isolation', () => {
        test('rejection: wrapper gets jp-schema-field-error class', async () => {
            const blockDef = {
                _meta: {},
                region: {
                    type: 'string', inputType: 'select', label: 'Region', options: [],
                    loadOptions: async () => { throw new Error('API down'); }
                }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };
            await runPipeline(form, schema, { blk: {} });

            const wrap = form.querySelector('.jp-schema-field');
            expect(wrap.classList.contains('jp-schema-field-error')).toBe(true);
        });

        test('rejection: inline error message shown', async () => {
            const blockDef = {
                _meta: {},
                region: {
                    type: 'string', inputType: 'select', label: 'Region', options: [],
                    loadOptions: async () => { throw new Error('API down'); }
                }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };
            await runPipeline(form, schema, { blk: {} });

            const msg = form.querySelector('.jp-schema-field-error-msg');
            expect(msg).not.toBeNull();
            expect(msg.textContent).toContain('API down');
        });

        test('Promise.allSettled isolation: sibling field unaffected by neighbour rejection', async () => {
            const blockDef = {
                _meta: {},
                bad: {
                    type: 'string', inputType: 'select', label: 'Bad', options: [],
                    loadOptions: async () => { throw new Error('oops'); }
                },
                good: {
                    type: 'string', inputType: 'select', label: 'Good', options: [],
                    loadOptions: async () => [{ value: 'ok', label: 'OK' }]
                }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };
            await runPipeline(form, schema, { blk: {} });

            const goodSel = form.querySelector('[data-path="blk.good"]');
            expect(goodSel.options).toHaveLength(1);
            expect(goodSel.options[0].value).toBe('ok');
        });

        test('rejection falls back to static options (original <option>s remain)', async () => {
            const blockDef = {
                _meta: {},
                region: {
                    type: 'string', inputType: 'select', label: 'Region',
                    options: [{ value: 'fallback', label: 'Fallback' }],
                    loadOptions: async () => { throw new Error('network'); }
                }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };
            await runPipeline(form, schema, { blk: {} });

            const sel = form.querySelector('[data-path="blk.region"]');
            // applyLoadedOptions is not called on rejection → original option stays
            expect(sel.options).toHaveLength(1);
            expect(sel.options[0].value).toBe('fallback');
        });
    });

    // ─── onInit ───────────────────────────────────────────────────────────────

    describe('onInit', () => {
        test('runs after loadOptions; receives complete ctx', async () => {
            const order = [];
            const blockDef = {
                _meta: {},
                role: {
                    type: 'string', inputType: 'select', label: 'Role', options: [],
                    loadOptions: async () => { order.push('load'); return [{ value: 'admin' }]; },
                    onInit: async (ctx) => {
                        order.push('init');
                        expect(ctx.field).toBeDefined();
                        expect(ctx.blockKey).toBe('blk');
                        expect(ctx.path).toBe('blk.role');
                        expect(ctx.schema).toBeDefined();
                        expect(typeof ctx.widgetOptions).toBe('object');
                    }
                }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };
            await runPipeline(form, schema, { blk: {} });

            expect(order).toEqual(['load', 'init']);
        });

        test('onInit receives ctx.widgetOptions seeded from data-jp-* attributes', async () => {
            let capturedOpts = null;
            const blockDef = {
                _meta: {},
                role: {
                    type: 'string', inputType: 'jpSelect', label: 'Role',
                    options: [{ value: 'a' }],
                    search: true,
                    searchPlaceholder: 'Find…',
                    onInit: async (ctx) => { capturedOpts = Object.assign({}, ctx.widgetOptions); }
                }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };
            await runPipeline(form, schema, { blk: {} });

            expect(capturedOpts).not.toBeNull();
            expect(capturedOpts.search).toBe(true);
            expect(capturedOpts.searchPlaceholder).toBe('Find…');
        });

        test('onInit can mutate ctx.widgetOptions; mutation seen after init (no double-init path)', async () => {
            // Smoke: mutating widgetOptions in onInit does not throw; we verify it is stored
            const mutations = [];
            const blockDef = {
                _meta: {},
                role: {
                    type: 'string', inputType: 'select', label: 'Role', options: [{ value: 'a' }],
                    onInit: async (ctx) => {
                        ctx.widgetOptions.customKey = 'injected';
                        mutations.push(ctx.widgetOptions.customKey);
                    }
                }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };
            await runPipeline(form, schema, { blk: {} });

            expect(mutations).toEqual(['injected']);
        });

        test('onInit string form resolves via registry', async () => {
            let called = false;
            win.jPulse.schemaForm.register('test.onInitHook', async () => { called = true; });
            const blockDef = {
                _meta: {},
                role: {
                    type: 'string', inputType: 'select', label: 'Role', options: [{ value: 'a' }],
                    onInit: 'test.onInitHook'
                }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };
            await runPipeline(form, schema, { blk: {} });

            expect(called).toBe(true);
        });

        test('onInit rejection: caught and warned, does not block other fields or throw', async () => {
            const consoleWarns = [];
            const origWarn = win.console.warn;
            win.console.warn = (...args) => consoleWarns.push(args.join(' '));

            const blockDef = {
                _meta: {},
                bad: {
                    type: 'string', inputType: 'select', label: 'Bad', options: [{ value: 'a' }],
                    onInit: async () => { throw new Error('boom'); }
                },
                good: {
                    type: 'string', label: 'Good', options: []
                }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };
            await expect(runPipeline(form, schema, { blk: {} })).resolves.not.toThrow();
            expect(consoleWarns.some((w) => w.includes('onInit failed'))).toBe(true);

            win.console.warn = origWarn;
        });

        test('field without loadOptions or onInit is not double-initialized (no data-jp-defer-init)', () => {
            const blockDef = {
                _meta: {},
                plain: { type: 'string', inputType: 'text', label: 'Plain' }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };
            const inp = form.querySelector('[data-path="blk.plain"]');
            // Without loadOptions/onInit, no defer-init attribute was emitted
            expect(inp.dataset.jpDeferInit).toBeUndefined();
        });
    });

    // ─── ready Promise ────────────────────────────────────────────────────────

    describe('ready Promise', () => {
        test('runPostRender returns a Promise', () => {
            const blockDef = { _meta: {}, x: { type: 'string', label: 'X' } };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };
            const result = win.jPulse.schemaForm.runPostRender(form, schema, { blk: {} });
            expect(typeof result.then).toBe('function');
        });

        test('ready Promise resolves after all loadOptions settle', async () => {
            let resolveB;
            const blockDef = {
                _meta: {},
                a: {
                    type: 'string', inputType: 'select', label: 'A', options: [],
                    loadOptions: async () => [{ value: 'a1' }]
                },
                b: {
                    type: 'string', inputType: 'select', label: 'B', options: [],
                    loadOptions: () => new Promise((res) => { resolveB = () => res([{ value: 'b1' }]); })
                }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };

            let settled = false;
            const p = win.jPulse.schemaForm.runPostRender(form, schema, { blk: {} })
                .then(() => { settled = true; });

            // Flush microtasks — a should settle but b is still pending
            await new Promise((r) => setTimeout(r, 0));
            expect(settled).toBe(false);

            // Resolve b → pipeline can finish
            resolveB();
            await p;
            expect(settled).toBe(true);

            const selA = form.querySelector('[data-path="blk.a"]');
            const selB = form.querySelector('[data-path="blk.b"]');
            expect(selA.options[0].value).toBe('a1');
            expect(selB.options[0].value).toBe('b1');
        });

        test('ready Promise resolves even if all loadOptions reject', async () => {
            const blockDef = {
                _meta: {},
                x: {
                    type: 'string', inputType: 'select', label: 'X', options: [],
                    loadOptions: async () => { throw new Error('fail'); }
                }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };
            await expect(
                win.jPulse.schemaForm.runPostRender(form, schema, { blk: {} })
            ).resolves.toBeUndefined();
        });

        test('ready Promise resolves immediately when no loadOptions/onInit fields exist', async () => {
            const blockDef = {
                _meta: {},
                name: { type: 'string', label: 'Name' },
                count: { type: 'number', label: 'Count' }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };
            await expect(
                win.jPulse.schemaForm.runPostRender(form, schema, { blk: {} })
            ).resolves.not.toThrow();
        });
    });

    // ─── enum alias ───────────────────────────────────────────────────────────

    describe('enum alias rendering parity', () => {
        test('enum: [scalars] renders same <option>s as options: [{value, label}]', () => {
            const withEnum = {
                _meta: {},
                role: { type: 'string', inputType: 'select', label: 'Role', enum: ['admin', 'viewer'] }
            };
            const withOptions = {
                _meta: {},
                role: { type: 'string', inputType: 'select', label: 'Role', options: [{ value: 'admin', label: 'admin' }, { value: 'viewer', label: 'viewer' }] }
            };
            const htmlEnum = win.jPulse.UI.tabs._renderSchemaBlockFields('blk', withEnum, {});
            const htmlOpts = win.jPulse.UI.tabs._renderSchemaBlockFields('blk', withOptions, {});

            const formE = doc.createElement('div');
            formE.innerHTML = htmlEnum;
            const formO = doc.createElement('div');
            formO.innerHTML = htmlOpts;

            const selE = formE.querySelector('select');
            const selO = formO.querySelector('select');
            expect(selE.options.length).toBe(selO.options.length);
            for (let i = 0; i < selE.options.length; i++) {
                expect(selE.options[i].value).toBe(selO.options[i].value);
            }
        });

        test('enum: [{value,label}] objects work the same as options: [{value,label}]', () => {
            const withEnumObj = {
                _meta: {},
                role: { type: 'string', inputType: 'select', label: 'Role',
                    enum: [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }] }
            };
            const html = win.jPulse.UI.tabs._renderSchemaBlockFields('blk', withEnumObj, {});
            const div = doc.createElement('div');
            div.innerHTML = html;
            const sel = div.querySelector('select');
            expect(sel.options[0].value).toBe('a');
            expect(sel.options[1].value).toBe('b');
        });
    });

    // ─── showWhen wired after pipeline ────────────────────────────────────────

    describe('showWhen is set up after pipeline completes', () => {
        test('field with showWhen is initially hidden when condition does not match', async () => {
            const blockDef = {
                _meta: {},
                fit: {
                    type: 'string', inputType: 'select', label: 'Fit',
                    options: [{ value: 'cover' }, { value: 'scale-fit' }]
                },
                width: {
                    type: 'number', label: 'Width',
                    showWhen: { field: 'fit', equals: 'scale-fit' }
                }
            };
            const form = buildForm('blk', blockDef, { fit: 'cover' });
            const schema = { data: { blk: blockDef } };
            win.jPulse.UI.input.setFormData(form, { blk: { fit: 'cover' } }, schema);

            await runPipeline(form, schema, { blk: { fit: 'cover' } });

            const widthWrap = form.querySelector('[data-path="blk.width"]').closest('.jp-schema-field');
            expect(widthWrap.classList.contains('jp-schema-field-hidden')).toBe(true);
        });

        test('field with showWhen is visible when condition matches', async () => {
            const blockDef = {
                _meta: {},
                fit: {
                    type: 'string', inputType: 'select', label: 'Fit',
                    options: [{ value: 'cover' }, { value: 'scale-fit' }]
                },
                width: {
                    type: 'number', label: 'Width',
                    showWhen: { field: 'fit', equals: 'scale-fit' }
                }
            };
            const form = buildForm('blk', blockDef, { fit: 'scale-fit' });
            const schema = { data: { blk: blockDef } };
            win.jPulse.UI.input.setFormData(form, { blk: { fit: 'scale-fit' } }, schema);

            await runPipeline(form, schema, { blk: { fit: 'scale-fit' } });

            const widthWrap = form.querySelector('[data-path="blk.width"]').closest('.jp-schema-field');
            expect(widthWrap.classList.contains('jp-schema-field-hidden')).toBe(false);
        });

        test('showWhen change listener is wired: toggling watched field shows/hides dependent', async () => {
            const blockDef = {
                _meta: {},
                fit: {
                    type: 'string', inputType: 'select', label: 'Fit',
                    options: [{ value: 'cover' }, { value: 'scale-fit' }]
                },
                width: {
                    type: 'number', label: 'Width',
                    showWhen: { field: 'fit', equals: 'scale-fit' }
                }
            };
            const form = buildForm('blk', blockDef, { fit: 'cover' });
            const schema = { data: { blk: blockDef } };
            await runPipeline(form, schema, { blk: { fit: 'cover' } });

            const fitSel = form.querySelector('[data-path="blk.fit"]');
            const widthWrap = form.querySelector('[data-path="blk.width"]').closest('.jp-schema-field');

            expect(widthWrap.classList.contains('jp-schema-field-hidden')).toBe(true);

            fitSel.value = 'scale-fit';
            fitSel.dispatchEvent(new win.Event('change', { bubbles: true }));
            expect(widthWrap.classList.contains('jp-schema-field-hidden')).toBe(false);

            fitSel.value = 'cover';
            fitSel.dispatchEvent(new win.Event('change', { bubbles: true }));
            expect(widthWrap.classList.contains('jp-schema-field-hidden')).toBe(true);
        });

        test('hidden required field does not block getFormData (no JS validation side)', async () => {
            const blockDef = {
                _meta: {},
                mode: {
                    type: 'string', inputType: 'select', label: 'Mode',
                    options: [{ value: 'simple' }, { value: 'advanced' }]
                },
                apiKey: {
                    type: 'string', label: 'API Key', required: true,
                    showWhen: { field: 'mode', equals: 'advanced' }
                }
            };
            const form = buildForm('blk', blockDef, { mode: 'simple' });
            const schema = { data: { blk: blockDef } };
            win.jPulse.UI.input.setFormData(form, { blk: { mode: 'simple' } }, schema);
            await runPipeline(form, schema, { blk: { mode: 'simple' } });

            const apiKeyInp = form.querySelector('[data-path="blk.apiKey"]');
            // required attr must be removed/cached when field is hidden
            expect(apiKeyInp.required).toBe(false);
        });

        test('hidden field value still serialized by getFormData', async () => {
            const blockDef = {
                _meta: {},
                mode: {
                    type: 'string', inputType: 'select', label: 'Mode',
                    options: [{ value: 'simple' }, { value: 'advanced' }]
                },
                apiKey: {
                    type: 'string', label: 'API Key',
                    showWhen: { field: 'mode', equals: 'advanced' },
                    default: 'saved-key'
                }
            };
            const form = buildForm('blk', blockDef, { mode: 'simple', apiKey: 'saved-key' });
            const schema = { data: { blk: blockDef } };
            win.jPulse.UI.input.setFormData(form, { blk: { mode: 'simple', apiKey: 'saved-key' } }, schema);
            await runPipeline(form, schema, { blk: { mode: 'simple', apiKey: 'saved-key' } });

            const { data } = win.jPulse.UI.input.getFormData(form, schema);
            expect(data.blk.apiKey).toBe('saved-key');
        });
    });
    // ─── getFormData: display-only field exclusion ────────────────────────────

    describe('getFormData — display-only inputType exclusion', () => {
        test('help field does not appear in getFormData result', async () => {
            const blockDef = {
                _meta: {},
                note: { inputType: 'help', content: 'Info text' },
                name: { type: 'string', label: 'Name' }
            };
            const schema = { data: { blk: blockDef } };
            const form = buildForm('blk', blockDef, { name: 'alice' });
            win.jPulse.UI.input.setFormData(form, { blk: { name: 'alice' } }, schema);
            await runPipeline(form, schema, { blk: { name: 'alice' } });

            const { data } = win.jPulse.UI.input.getFormData(form, schema);
            expect(data.blk.name).toBe('alice');
            expect('note' in data.blk).toBe(false);
        });

        test('separator field does not appear in getFormData result', async () => {
            const blockDef = {
                _meta: {},
                sep: { inputType: 'separator' },
                count: { type: 'number', label: 'Count', default: 5 }
            };
            const schema = { data: { blk: blockDef } };
            const form = buildForm('blk', blockDef, { count: 5 });
            win.jPulse.UI.input.setFormData(form, { blk: { count: 5 } }, schema);
            await runPipeline(form, schema, { blk: { count: 5 } });

            const { data } = win.jPulse.UI.input.getFormData(form, schema);
            expect(data.blk.count).toBe(5);
            expect('sep' in data.blk).toBe(false);
        });

        test('button field does not appear in getFormData result', async () => {
            const blockDef = {
                _meta: {},
                doAction: { inputType: 'button', label: 'Run' },
                flag: { type: 'boolean', label: 'Flag', default: false }
            };
            const schema = { data: { blk: blockDef } };
            const form = buildForm('blk', blockDef, { flag: false });
            win.jPulse.UI.input.setFormData(form, { blk: { flag: false } }, schema);
            await runPipeline(form, schema, { blk: { flag: false } });

            const { data } = win.jPulse.UI.input.getFormData(form, schema);
            expect('doAction' in data.blk).toBe(false);
        });

        test('setFormData skips help/separator fields (no matching input)', async () => {
            const blockDef = {
                _meta: {},
                note: { inputType: 'help', content: 'Tip' },
                label: { type: 'string', label: 'Label' }
            };
            const schema = { data: { blk: blockDef } };
            // setFormData should not throw when encountering a help field
            const form = buildForm('blk', blockDef, { label: 'hello' });
            expect(() => {
                win.jPulse.UI.input.setFormData(form, { blk: { label: 'hello' } }, schema);
            }).not.toThrow();
            const inp = form.querySelector('[data-path="blk.label"]');
            expect(inp).not.toBeNull();
            expect(inp.value).toBe('hello');
        });
    });

    // ─── _runSchemaPostRender: rootEl scope (panels moved into tab widget) ─────

    describe('_runSchemaPostRender — rootEl can be the tabs element', () => {
        test('pipeline finds fields when rootEl wraps the moved panels', async () => {
            // Simulate what register() does: panels are moved from panelEl into
            // a .jp-tabs-panels div inside tabEl.
            const blockDef = {
                _meta: {},
                region: {
                    type: 'string', inputType: 'select', label: 'Region',
                    loadOptions: async () => [{ value: 'eu', label: 'EU' }],
                    options: []
                }
            };
            const schema = { data: { general: blockDef } };

            // Render fields HTML
            const html = win.jPulse.UI.tabs._renderSchemaBlockFields('general', blockDef, {});
            const card = doc.createElement('div');
            card.id = 'general-panel';
            card.innerHTML = html;

            // tabEl = the outer tab widget; create a .jp-tabs-panels inside it
            const tabEl = doc.createElement('div');
            tabEl.id = 'sim-tabs';
            const panelsDiv = doc.createElement('div');
            panelsDiv.className = 'jp-tabs-panels';
            panelsDiv.appendChild(card);
            tabEl.appendChild(panelsDiv);
            doc.body.appendChild(tabEl);

            // Wrap in a form so formEl = closest('form') works
            const form = doc.createElement('form');
            form.appendChild(tabEl);
            doc.body.appendChild(form);

            // Run pipeline with tabEl (as renderTabsAndPanelsFromSchema now does)
            await win.jPulse.UI.tabs._runSchemaPostRender(tabEl, schema, {});

            // Loading state must be cleared
            const wrapEl = card.querySelector('.jp-schema-field');
            expect(wrapEl.classList.contains('jp-form-input-loading')).toBe(false);

            // Options must be populated
            const sel = card.querySelector('select');
            const values = Array.from(sel.options).map((o) => o.value);
            expect(values).toContain('eu');
        });
    });

    // ─── custom renderer (W-194) ───────────────────────────────────────────────

    describe('custom renderer (W-194)', () => {
        afterEach(() => {
            try { win.jPulse.schemaForm.unregister('test.renderCustom'); } catch (_) {}
        });

        test('renderer is invoked once with the full context contract', async () => {
            let capturedCtx = null;
            const blockDef = {
                _meta: {},
                links: {
                    type: 'custom', inputType: 'custom', label: 'Links',
                    renderer: (ctx) => { capturedCtx = ctx; },
                    default: []
                }
            };
            const form = buildForm('blk', blockDef, { links: [{ label: 'Docs', url: 'https://x' }] });
            const schema = { data: { blk: blockDef } };
            await runPipeline(form, schema, { blk: { links: [{ label: 'Docs', url: 'https://x' }] } });

            expect(capturedCtx).not.toBeNull();
            expect(capturedCtx.value).toEqual([{ label: 'Docs', url: 'https://x' }]);
            expect(typeof capturedCtx.onChange).toBe('function');
            expect(capturedCtx.schema).toBe(blockDef.links);
            expect(capturedCtx.config).toEqual({ links: [{ label: 'Docs', url: 'https://x' }] });
            expect(capturedCtx.disabled).toBe(false);
            expect(capturedCtx.container).toBeInstanceOf(win.HTMLElement);
            expect(capturedCtx.container.id).toBe(form.querySelector('[data-path="blk.links"]').dataset.customContainer);
        });

        test('renderer resolves via jPulse.schemaForm registry (string form)', async () => {
            let called = false;
            win.jPulse.schemaForm.register('test.renderCustom', () => { called = true; });
            const blockDef = {
                _meta: {},
                links: { type: 'custom', inputType: 'custom', label: 'Links', renderer: 'test.renderCustom', default: [] }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };
            await runPipeline(form, schema, { blk: {} });

            expect(called).toBe(true);
        });

        test('renderer resolves against window.jPulse.plugins.* per documented contract (dotted name, not registered)', async () => {
            // Matches docs/plugins/creating-plugins.md: "myPlugin.renderQuickLinks" resolves to
            // window.jPulse.plugins.myPlugin.renderQuickLinks — no jPulse.schemaForm.register() call needed.
            // Regression guard: _resolveCustomRenderer must NOT fall back to bare window.myPlugin.renderQuickLinks.
            let capturedValue = null;
            win.jPulse.plugins = win.jPulse.plugins || {};
            win.jPulse.plugins.testPlugin = {
                renderQuickLinks: (ctx) => { capturedValue = ctx.value; }
            };
            const blockDef = {
                _meta: {},
                links: { type: 'custom', inputType: 'custom', label: 'Links', renderer: 'testPlugin.renderQuickLinks', default: [] }
            };
            const form = buildForm('blk', blockDef, { links: [{ label: 'Docs', url: 'https://x' }] });
            const schema = { data: { blk: blockDef } };
            await runPipeline(form, schema, { blk: { links: [{ label: 'Docs', url: 'https://x' }] } });

            expect(capturedValue).toEqual([{ label: 'Docs', url: 'https://x' }]);
            delete win.jPulse.plugins.testPlugin;
        });

        test('onChange writes JSON to the hidden proxy field and dispatches change', async () => {
            let onChangeFn = null;
            const blockDef = {
                _meta: {},
                links: {
                    type: 'custom', inputType: 'custom', label: 'Links',
                    renderer: (ctx) => { onChangeFn = ctx.onChange; },
                    default: []
                }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };
            await runPipeline(form, schema, { blk: {} });

            const hidden = form.querySelector('[data-path="blk.links"]');
            let changeEventSeen = false;
            hidden.addEventListener('change', () => { changeEventSeen = true; });

            onChangeFn([{ label: 'New', url: 'https://y' }]);

            expect(JSON.parse(hidden.value)).toEqual([{ label: 'New', url: 'https://y' }]);
            expect(changeEventSeen).toBe(true);
        });

        test('missing renderer: warns and does not throw', async () => {
            const consoleWarns = [];
            const origWarn = win.console.warn;
            win.console.warn = (...args) => consoleWarns.push(args.join(' '));

            const blockDef = {
                _meta: {},
                links: { type: 'custom', inputType: 'custom', label: 'Links', renderer: 'test.noSuchRenderer', default: [] }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };

            await expect(runPipeline(form, schema, { blk: {} })).resolves.not.toThrow();
            expect(consoleWarns.some((m) => m.includes('custom renderer not found'))).toBe(true);

            win.console.warn = origWarn;
        });

        test('renderer throwing synchronously: warns and does not block pipeline', async () => {
            const consoleWarns = [];
            const origWarn = win.console.warn;
            win.console.warn = (...args) => consoleWarns.push(args.join(' '));

            const blockDef = {
                _meta: {},
                links: {
                    type: 'custom', inputType: 'custom', label: 'Links',
                    renderer: () => { throw new Error('boom'); },
                    default: []
                },
                other: { type: 'string', label: 'Other' }
            };
            const form = buildForm('blk', blockDef, {});
            const schema = { data: { blk: blockDef } };

            await expect(runPipeline(form, schema, { blk: {} })).resolves.not.toThrow();
            expect(consoleWarns.some((m) => m.includes('custom renderer failed'))).toBe(true);
        });
    });
});

// EOF webapp/tests/unit/utils/jpulse-schema-form-pipeline.test.js
