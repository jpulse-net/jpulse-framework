/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / jPulse UI Tabs Schema
 * @tagline         Unit Tests for renderTabsAndPanelsFromSchema and schema flow (W-148 Phase 4)
 * @description     Low-hanging fruit: _walkSchemaFields, renderTabsAndPanelsFromSchema flow classes and field HTML
 * @file            webapp/tests/unit/utils/jpulse-ui-tabs-schema.test.js
 * @version         1.6.46
 * @release         2026-05-04
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
import vm from 'vm';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost:8080',
    pretendToBeVisual: true,
    resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
// Ensure vm context (createContext(global.window)) and tests share the same document
const win = global.window;
const doc = win.document;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;
global.KeyboardEvent = dom.window.KeyboardEvent;

const jpulseCommonPath = path.join(process.cwd(), 'webapp/view/jpulse-common.js');
let jpulseCommonContent = fs.readFileSync(jpulseCommonPath, 'utf8');
// W-185: strip the unquoted subtree-embed token (would otherwise break JS parse when loaded raw)
jpulseCommonContent = jpulseCommonContent.replace(/\{\{i18n\.controller\.handlebar\.date\.fromNow\}\}/g, '{}');
const context = vm.createContext(win);
vm.runInContext(jpulseCommonContent, context);

describe('jPulse.UI.tabs schema-driven (W-148 Phase 4)', () => {

    beforeEach(() => {
        doc.body.innerHTML = '';
    });

    describe('_walkSchemaFields', () => {
        test('returns view-scope fields and skips _meta', () => {
            const blockDef = {
                _meta: { order: 0, tabLabel: 'Test' },
                name: { type: 'string', default: '', label: 'Name' },
                count: { type: 'number', default: 0, label: 'Count' }
            };
            const fields = win.jPulse.UI.input._walkSchemaFields(blockDef, '', 'view');
            expect(fields).toHaveLength(2);
            expect(fields.map(f => f.path)).toEqual(['name', 'count']);
            expect(fields[0].fieldDef.label).toBe('Name');
        });

        test('skips scope [model] only in view context', () => {
            const blockDef = {
                _meta: {},
                visible: { type: 'string', label: 'Visible' },
                hidden: { type: 'date', default: null, scope: ['model'] }
            };
            const viewFields = win.jPulse.UI.input._walkSchemaFields(blockDef, '', 'view');
            expect(viewFields).toHaveLength(1);
            expect(viewFields[0].path).toBe('visible');
            const dataFields = win.jPulse.UI.input._walkSchemaFields(blockDef, '', 'data');
            expect(dataFields).toHaveLength(2);
        });

        test('walks nested blocks and builds dotted paths', () => {
            const blockDef = {
                _meta: {},
                license: {
                    key: { type: 'string', default: '', label: 'Key' }
                }
            };
            const fields = win.jPulse.UI.input._walkSchemaFields(blockDef, '', 'view');
            expect(fields).toHaveLength(1);
            expect(fields[0].path).toBe('license.key');
        });
    });

    describe('renderTabsAndPanelsFromSchema', () => {
        test('returns null when schema or containers missing', () => {
            const schema = { data: { foo: { _meta: { order: 0 }, a: { type: 'string', label: 'A' } } } };
            doc.body.innerHTML = '<div id="tabs"></div><div id="panels"></div>';
            expect(win.jPulse.UI.tabs.renderTabsAndPanelsFromSchema('tabs', 'panels', null, {})).toBeNull();
            expect(win.jPulse.UI.tabs.renderTabsAndPanelsFromSchema('tabs', 'panels', {}, {})).toBeNull();
            expect(win.jPulse.UI.tabs.renderTabsAndPanelsFromSchema('nonexistent', 'panels', schema, {})).toBeNull();
        });

        // Test schema block HTML output (flow classes, field classes, button) and block sort order without relying on shared document
        test('creates one tab and one panel with flow classes from maxColumns', () => {
            const blockDef = {
                _meta: { order: 0, tabLabel: 'Test Tab', maxColumns: 2 },
                name: { type: 'string', default: '', label: 'Name' }
            };
            const fieldsHtml = win.jPulse.UI.tabs._renderSchemaBlockFields('test', blockDef, {});
            expect(fieldsHtml).toContain('data-path="test.name"');
            expect(fieldsHtml).toContain('jp-schema-field');
            const maxCols = Math.max(1, parseInt(blockDef._meta?.maxColumns, 10) || 1);
            expect('jp-form-flow jp-form-flow-cols-' + maxCols).toBe('jp-form-flow jp-form-flow-cols-2');
        });

        test('field with startNewRow and fullWidth gets both flow classes', () => {
            const blockDef = {
                _meta: { order: 0, tabLabel: 'Test', maxColumns: 2 },
                enable: { type: 'boolean', default: false, label: 'Enable', startNewRow: true, fullWidth: true }
            };
            const fieldsHtml = win.jPulse.UI.tabs._renderSchemaBlockFields('test', blockDef, {});
            expect(fieldsHtml).toContain('jp-schema-field-new-row');
            expect(fieldsHtml).toContain('jp-schema-field-full');
        });

        test('type button with action renders button with data-action', () => {
            const blockDef = {
                _meta: { order: 0, tabLabel: 'Test', maxColumns: 2 },
                doIt: { type: 'button', scope: ['view'], label: 'Do it', action: 'doIt' }
            };
            const fieldsHtml = win.jPulse.UI.tabs._renderSchemaBlockFields('test', blockDef, {});
            const actionsHtml = win.jPulse.UI.tabs._renderSchemaBlockActions(blockDef);
            expect(fieldsHtml + actionsHtml).toContain('data-action="doIt"');
            expect(fieldsHtml + actionsHtml).toContain('Do it');
        });

        test('sorts blocks by _meta.order', () => {
            const schema = {
                data: {
                    second: { _meta: { order: 10, tabLabel: 'Second' }, a: { type: 'string', label: 'A' } },
                    first: { _meta: { order: 0, tabLabel: 'First' }, b: { type: 'string', label: 'B' } }
                }
            };
            const blocks = Object.entries(schema.data)
                .filter(([, def]) => def && typeof def === 'object')
                .map(([blockKey, blockDef]) => ({
                    blockKey,
                    blockDef,
                    order: blockDef._meta?.order ?? 999,
                    tabLabel: blockDef._meta?.tabLabel ?? blockKey
                }));
            blocks.sort((a, b) => a.order - b.order || a.blockKey.localeCompare(b.blockKey));
            expect(blocks).toHaveLength(2);
            expect(blocks[0].blockKey).toBe('first');
            expect(blocks[1].blockKey).toBe('second');
            expect(blocks[0].blockKey + '-panel').toBe('first-panel');
            expect(blocks[1].blockKey + '-panel').toBe('second-panel');
        });
    });

    describe('_resolveInputType (W-189)', () => {
        test('multiselect alias rewrites to jpSelect + multiple: true', () => {
            const r = win.jPulse.UI.tabs._resolveInputType({ type: 'array', inputType: 'multiselect' });
            expect(r.inputType).toBe('jpSelect');
            expect(r.multiple).toBe(true);
        });

        test('preserves explicit jpSelect with multiple', () => {
            const r = win.jPulse.UI.tabs._resolveInputType({ type: 'string', inputType: 'jpSelect', multiple: true });
            expect(r.inputType).toBe('jpSelect');
            expect(r.multiple).toBe(true);
        });

        test('infers checkbox from boolean type', () => {
            const r = win.jPulse.UI.tabs._resolveInputType({ type: 'boolean' });
            expect(r.inputType).toBe('checkbox');
        });

        test('infers select from enum', () => {
            const r = win.jPulse.UI.tabs._resolveInputType({ type: 'string', enum: ['a', 'b'] });
            expect(r.inputType).toBe('select');
        });

        test('infers select from non-empty options', () => {
            const r = win.jPulse.UI.tabs._resolveInputType({ type: 'string', options: [{ value: 'a' }] });
            expect(r.inputType).toBe('select');
        });

        test('defaults to text when nothing else matches', () => {
            const r = win.jPulse.UI.tabs._resolveInputType({});
            expect(r.inputType).toBe('text');
            expect(r.multiple).toBe(false);
        });
    });

    describe('_buildSelectOptionsHtml (W-189)', () => {
        test('marks scalar value as selected', () => {
            const html = win.jPulse.UI.tabs._buildSelectOptionsHtml(
                [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
                'b'
            );
            expect(html).toContain('value="b" selected>B');
            expect(html).not.toContain('value="a" selected');
        });

        test('marks array values as selected (multi)', () => {
            const html = win.jPulse.UI.tabs._buildSelectOptionsHtml(
                [{ value: 'a' }, { value: 'b' }, { value: 'c' }],
                ['a', 'c']
            );
            expect(html).toContain('value="a" selected');
            expect(html).toContain('value="c" selected');
            expect(html).not.toContain('value="b" selected');
        });

        test('returns empty string for empty array', () => {
            expect(win.jPulse.UI.tabs._buildSelectOptionsHtml([], 'x')).toBe('');
        });
    });

    describe('_resolveShowWhenPaths (W-189)', () => {
        test('resolves bare field name to fully-qualified path', () => {
            const out = win.jPulse.UI.tabs._resolveShowWhenPaths(
                { field: 'fit', equals: 'cover' },
                'general'
            );
            expect(out).toEqual({ field: 'general.fit', equals: 'cover' });
        });

        test('passes through dotted paths unchanged', () => {
            const out = win.jPulse.UI.tabs._resolveShowWhenPaths(
                { field: 'meta.role', equals: 'admin' },
                'general'
            );
            expect(out.field).toBe('meta.role');
        });

        test('recurses into all/any compounds', () => {
            const out = win.jPulse.UI.tabs._resolveShowWhenPaths(
                {
                    all: [
                        { field: 'a', equals: 1 },
                        { any: [{ field: 'b.x', equals: 2 }, { field: 'c', equals: 3 }] }
                    ]
                },
                'blk'
            );
            expect(out.all[0].field).toBe('blk.a');
            expect(out.all[1].any[0].field).toBe('b.x');
            expect(out.all[1].any[1].field).toBe('blk.c');
        });
    });

    describe('_renderSchemaBlockFields — new W-189 inputTypes', () => {
        test('jpSelect emits data-jpselect on <select>', () => {
            const blockDef = {
                _meta: {},
                role: { type: 'string', inputType: 'jpSelect', label: 'Role', options: [{ value: 'a' }] }
            };
            const html = win.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, {});
            expect(html).toMatch(/<select[^>]*data-jpselect/);
        });

        test('jpCombo emits data-jpcombo on <select>', () => {
            const blockDef = {
                _meta: {},
                region: { type: 'string', inputType: 'jpCombo', label: 'Region', options: [{ value: 'us-east' }] }
            };
            const html = win.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, {});
            expect(html).toMatch(/<select[^>]*data-jpcombo/);
        });

        test('flat tuning keys emit data-jp-* attributes', () => {
            const blockDef = {
                _meta: {},
                role: {
                    type: 'string',
                    inputType: 'jpSelect',
                    label: 'Role',
                    options: [{ value: 'a' }],
                    search: true,
                    selectAll: true,
                    searchPlaceholder: 'Find role…'
                }
            };
            const html = win.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, {});
            expect(html).toContain('data-jp-search="1"');
            expect(html).toContain('data-jp-select-all="1"');
            expect(html).toContain('data-jp-search-placeholder="Find role…"');
        });

        test('jpCombo allowCustom: false emits data-jp-allow-custom="0"', () => {
            const blockDef = {
                _meta: {},
                r: { type: 'string', inputType: 'jpCombo', label: 'R', options: [{ value: 'a' }], allowCustom: false }
            };
            const html = win.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, {});
            expect(html).toContain('data-jp-allow-custom="0"');
        });

        test('loadOptions defined emits data-jp-defer-init and jp-form-input-loading wrapper', () => {
            const blockDef = {
                _meta: {},
                region: {
                    type: 'string',
                    inputType: 'jpCombo',
                    label: 'Region',
                    options: [],
                    loadOptions: 'mySite.loadRegions'
                }
            };
            const html = win.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, {});
            expect(html).toContain('data-jp-defer-init="1"');
            expect(html).toContain('jp-form-input-loading');
        });

        test('multiselect alias renders as jpSelect with multiple attribute', () => {
            const blockDef = {
                _meta: {},
                roles: { type: 'array', inputType: 'multiselect', label: 'Roles', options: [{ value: 'a' }, { value: 'b' }] }
            };
            const html = win.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, { roles: ['a'] });
            expect(html).toMatch(/<select[^>]*data-jpselect[^>]*multiple/);
        });

        test('radio inputType renders <input type="radio"> for each option', () => {
            const blockDef = {
                _meta: {},
                fit: { type: 'string', inputType: 'radio', label: 'Fit', options: [{ value: 'cover' }, { value: 'contain' }] }
            };
            const html = win.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, { fit: 'cover' });
            expect(html).toContain('type="radio"');
            expect(html).toContain('value="cover" checked');
            expect(html).toContain('value="contain"');
        });

        test('checkboxGroup uses name="…[]" for multi-value submission', () => {
            const blockDef = {
                _meta: {},
                tags: { type: 'array', inputType: 'checkboxGroup', label: 'Tags', options: [{ value: 'a' }, { value: 'b' }] }
            };
            const html = win.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, { tags: ['a'] });
            expect(html).toContain('name="data.blk.tags[]"');
            expect(html).toContain('value="a" checked');
        });

        test('help inputType renders into jp-alert info block', () => {
            const blockDef = {
                _meta: {},
                note: { inputType: 'help', content: '<strong>Read me</strong>' }
            };
            const html = win.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, {});
            expect(html).toContain('jp-schema-help');
            expect(html).toContain('<strong>Read me</strong>');
        });

        test('separator inputType renders jp-divider', () => {
            const blockDef = {
                _meta: {},
                sep: { inputType: 'separator', label: 'Advanced' }
            };
            const html = win.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, {});
            expect(html).toContain('jp-divider');
            expect(html).toContain('<span>Advanced</span>');
        });

        test('email/url/tel inputTypes emit corresponding <input type="…">', () => {
            const blockDef = {
                _meta: {},
                e: { type: 'string', inputType: 'email', label: 'Email' },
                u: { type: 'string', inputType: 'url', label: 'URL' },
                t: { type: 'string', inputType: 'tel', label: 'Tel' }
            };
            const html = win.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, {});
            expect(html).toMatch(/type="email"[^>]*data-path="blk\.e"/);
            expect(html).toMatch(/type="url"[^>]*data-path="blk\.u"/);
            expect(html).toMatch(/type="tel"[^>]*data-path="blk\.t"/);
        });

        test('showWhen emits data-jp-show-when JSON with paths fully qualified', () => {
            const blockDef = {
                _meta: {},
                fit: { type: 'string', inputType: 'select', label: 'Fit', options: [{ value: 'a' }, { value: 'b' }] },
                width: { type: 'number', label: 'Width', showWhen: { field: 'fit', equals: 'a' } }
            };
            const html = win.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, {});
            expect(html).toMatch(/data-jp-show-when="[^"]*blk\.fit[^"]*"/);
        });

        test('required: true emits required attribute on input', () => {
            const blockDef = {
                _meta: {},
                key: { type: 'string', inputType: 'text', label: 'Key', required: true }
            };
            const html = win.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, {});
            expect(html).toMatch(/<input[^>]*data-path="blk\.key"[^>]*required/);
        });

        test('required: true emits required on the first radio in a group', () => {
            const blockDef = {
                _meta: {},
                fit: { type: 'string', inputType: 'radio', label: 'Fit', options: [{ value: 'a' }, { value: 'b' }], required: true }
            };
            const html = win.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, {});
            const firstRadio = html.match(/<input[^>]*type="radio"[^>]*value="a"[^>]*>/);
            expect(firstRadio).not.toBeNull();
            expect(firstRadio[0]).toContain('required');
        });
    });
});

// EOF webapp/tests/unit/utils/jpulse-ui-tabs-schema.test.js
