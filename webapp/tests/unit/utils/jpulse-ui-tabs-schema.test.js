/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / jPulse UI Tabs Schema
 * @tagline         Unit Tests for renderTabsAndPanelsFromSchema and schema flow (W-148 Phase 4)
 * @description     Low-hanging fruit: _walkSchemaFields, renderTabsAndPanelsFromSchema flow classes and field HTML
 * @file            webapp/tests/unit/utils/jpulse-ui-tabs-schema.test.js
 * @version         1.6.20
 * @release         2026-02-20
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
const jpulseCommonContent = fs.readFileSync(jpulseCommonPath, 'utf8');
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
});

// EOF webapp/tests/unit/utils/jpulse-ui-tabs-schema.test.js
