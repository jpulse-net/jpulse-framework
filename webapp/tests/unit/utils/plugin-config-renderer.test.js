/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Plugin Config Renderer
 * @tagline         Unit Tests for plugin.json schema → unified block-structure adapter (W-189)
 * @description     pluginSchemaToBlocks normalization table, flattenBlockValues, integration smoke tests
 * @file            webapp/tests/unit/utils/plugin-config-renderer.test.js
 * @version         1.7.16
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.2, Claude Opus 4.7
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

describe('jPulse.schemaForm.pluginSchemaToBlocks (W-189)', () => {

    beforeEach(() => {
        doc.body.innerHTML = '';
    });

    describe('legacy type → (type, inputType) normalization table', () => {
        test('text/password/email/url/tel/textarea → string + inputType=<same>', () => {
            ['text', 'password', 'email', 'url', 'tel', 'textarea'].forEach((t) => {
                const out = win.jPulse.schemaForm._normalizePluginFieldDef({ id: 'x', type: t, label: 'X' });
                expect(out.type).toBe('string');
                expect(out.inputType).toBe(t);
            });
        });

        test('select/radio/jpSelect/jpCombo → string + inputType=<same>', () => {
            ['select', 'radio', 'jpSelect', 'jpCombo'].forEach((t) => {
                const out = win.jPulse.schemaForm._normalizePluginFieldDef({ id: 'x', type: t, label: 'X' });
                expect(out.type).toBe('string');
                expect(out.inputType).toBe(t);
            });
        });

        test('number → number (no inputType)', () => {
            const out = win.jPulse.schemaForm._normalizePluginFieldDef({ id: 'n', type: 'number' });
            expect(out.type).toBe('number');
            expect(out.inputType).toBeUndefined();
        });

        test('boolean / checkbox → boolean (no inputType)', () => {
            ['boolean', 'checkbox'].forEach((t) => {
                const out = win.jPulse.schemaForm._normalizePluginFieldDef({ id: 'b', type: t });
                expect(out.type).toBe('boolean');
                expect(out.inputType).toBeUndefined();
            });
        });

        test('multiselect → array + inputType:multiselect', () => {
            const out = win.jPulse.schemaForm._normalizePluginFieldDef({ id: 'r', type: 'multiselect' });
            expect(out.type).toBe('array');
            expect(out.inputType).toBe('multiselect');
        });

        test('checkbox-group → array + inputType:checkboxGroup', () => {
            const out = win.jPulse.schemaForm._normalizePluginFieldDef({ id: 't', type: 'checkbox-group' });
            expect(out.type).toBe('array');
            expect(out.inputType).toBe('checkboxGroup');
        });

        test('checkboxGroup (camelCase) preserved → array + checkboxGroup', () => {
            const out = win.jPulse.schemaForm._normalizePluginFieldDef({ id: 't', type: 'checkboxGroup' });
            expect(out.type).toBe('array');
            expect(out.inputType).toBe('checkboxGroup');
        });

        test('tagInput → array + inputType:tagInput', () => {
            const out = win.jPulse.schemaForm._normalizePluginFieldDef({ id: 'tags', type: 'tagInput' });
            expect(out.type).toBe('array');
            expect(out.inputType).toBe('tagInput');
        });

        test('slider → number + inputType:slider', () => {
            const out = win.jPulse.schemaForm._normalizePluginFieldDef({ id: 'level', type: 'slider', min: 0, max: 10 });
            expect(out.type).toBe('number');
            expect(out.inputType).toBe('slider');
        });

        test('custom → type:custom + inputType:custom, renderer preserved (W-194)', () => {
            const out = win.jPulse.schemaForm._normalizePluginFieldDef({
                id: 'links', type: 'custom', label: 'Links', renderer: 'myPlugin.renderLinks', default: []
            });
            expect(out.type).toBe('custom');
            expect(out.inputType).toBe('custom');
            expect(out.renderer).toBe('myPlugin.renderLinks');
            expect(out.default).toEqual([]);
        });

        test('help / separator → inputType only (no data type)', () => {
            ['help', 'separator'].forEach((t) => {
                const out = win.jPulse.schemaForm._normalizePluginFieldDef({ id: 'note', type: t, label: 'Note' });
                expect(out.type).toBeUndefined();
                expect(out.inputType).toBe(t);
            });
        });

        test('strips id and tab from normalized fieldDef', () => {
            const out = win.jPulse.schemaForm._normalizePluginFieldDef({ id: 'x', tab: 'Connection', type: 'text', label: 'X' });
            expect(out.id).toBeUndefined();
            expect(out.tab).toBeUndefined();
            expect(out.label).toBe('X');
        });
    });

    describe('pluginSchemaToBlocks: tab grouping + initial values', () => {
        test('groups fields by tab into separate blocks', () => {
            const configSchema = [
                { id: 'apiKey', type: 'text', label: 'API Key', tab: 'Connection' },
                { id: 'endpoint', type: 'url', label: 'Endpoint', tab: 'Connection' },
                { id: 'timeout', type: 'number', label: 'Timeout', tab: 'Advanced', default: 30 }
            ];
            const { schema, data } = win.jPulse.schemaForm.pluginSchemaToBlocks(configSchema, {});
            expect(Object.keys(schema.data).sort()).toEqual(['advanced', 'connection']);
            expect(schema.data.connection._meta.tabLabel).toBe('Connection');
            expect(schema.data.advanced._meta.tabLabel).toBe('Advanced');
            expect(Object.keys(schema.data.connection)).toContain('apiKey');
            expect(Object.keys(schema.data.connection)).toContain('endpoint');
            expect(Object.keys(schema.data.advanced)).toContain('timeout');
            expect(data.advanced.timeout).toBe(30);
        });

        test('preserves first-seen tab order in _meta.order', () => {
            const configSchema = [
                { id: 'a', type: 'text', tab: 'Z' },
                { id: 'b', type: 'text', tab: 'A' }
            ];
            const { schema } = win.jPulse.schemaForm.pluginSchemaToBlocks(configSchema, {});
            expect(schema.data.z._meta.order).toBe(0);
            expect(schema.data.a._meta.order).toBe(1);
        });

        test('fields with no tab go to "general" block', () => {
            const configSchema = [
                { id: 'apiKey', type: 'text', label: 'API Key' },
                { id: 'mode', type: 'select', options: [{ value: 'a' }] }
            ];
            const { schema } = win.jPulse.schemaForm.pluginSchemaToBlocks(configSchema, {});
            expect(Object.keys(schema.data)).toEqual(['general']);
            expect(schema.data.general._meta.tabLabel).toBe('General');
        });

        test('threads currentValues into block-keyed data', () => {
            const configSchema = [
                { id: 'apiKey', type: 'text', tab: 'Connection' },
                { id: 'timeout', type: 'number', tab: 'Advanced', default: 30 }
            ];
            const values = { apiKey: 'sk-xyz', timeout: 60 };
            const { data } = win.jPulse.schemaForm.pluginSchemaToBlocks(configSchema, values);
            expect(data.connection.apiKey).toBe('sk-xyz');
            expect(data.advanced.timeout).toBe(60);
        });

        test('uses default when value is missing', () => {
            const configSchema = [{ id: 'timeout', type: 'number', default: 30 }];
            const { data } = win.jPulse.schemaForm.pluginSchemaToBlocks(configSchema, {});
            expect(data.general.timeout).toBe(30);
        });

        test('skips type:hidden fields', () => {
            const configSchema = [
                { id: 'apiKey', type: 'text' },
                { id: 'secret', type: 'hidden' }
            ];
            const { schema } = win.jPulse.schemaForm.pluginSchemaToBlocks(configSchema, {});
            expect(Object.keys(schema.data.general)).not.toContain('secret');
            expect(Object.keys(schema.data.general)).toContain('apiKey');
        });

        test('bug fix: help/separator fields (no id) survive into the block instead of being dropped', () => {
            const configSchema = [
                { type: 'help', content: '<p>Intro</p>', tab: 'Advanced' },
                { id: 'timeout', type: 'number', tab: 'Advanced', default: 30 },
                { type: 'separator', tab: 'Advanced' },
                { id: 'apiKey', type: 'text', tab: 'Advanced' }
            ];
            const { schema, data } = win.jPulse.schemaForm.pluginSchemaToBlocks(configSchema, {});
            const keys = Object.keys(schema.data.advanced);
            expect(keys).toContain('timeout');
            expect(keys).toContain('apiKey');
            // Two non-id fields must both be present under distinct synthetic keys.
            const nonFieldKeys = keys.filter((k) => k !== '_meta' && k !== 'timeout' && k !== 'apiKey');
            expect(nonFieldKeys).toHaveLength(2);
            expect(schema.data.advanced[nonFieldKeys[0]].inputType).toBe('help');
            expect(schema.data.advanced[nonFieldKeys[1]].inputType).toBe('separator');
            // Synthetic keys must never leak into persisted data (no id => no value).
            expect(Object.keys(data.advanced).sort()).toEqual(['timeout']);
        });

        test('bug fix: rendered HTML includes help/separator content that was previously dropped', () => {
            const configSchema = [
                { type: 'help', content: 'Intro text', tab: 'Advanced' },
                { id: 'timeout', type: 'number', label: 'Timeout', tab: 'Advanced', default: 30 }
            ];
            const { schema, data } = win.jPulse.schemaForm.pluginSchemaToBlocks(configSchema, {});
            const html = win.jPulse.UI.tabs._renderSchemaBlockFields('advanced', schema.data.advanced, data.advanced);
            expect(html).toContain('Intro text');
            expect(html).toContain('Timeout');
        });

        test('normalizes tab labels with non-alphanumeric chars to clean block keys', () => {
            const configSchema = [{ id: 'x', type: 'text', tab: 'Auth & API' }];
            const { schema } = win.jPulse.schemaForm.pluginSchemaToBlocks(configSchema, {});
            expect(Object.keys(schema.data)[0]).toBe('auth-api');
        });

        test('handles empty configSchema gracefully', () => {
            const { schema, data } = win.jPulse.schemaForm.pluginSchemaToBlocks([], {});
            expect(Object.keys(schema.data)).toEqual([]);
            expect(Object.keys(data)).toEqual([]);
        });
    });

    describe('flattenBlockValues', () => {
        test('flattens block-keyed data into a flat key/value map', () => {
            const blockData = {
                connection: { apiKey: 'x', endpoint: 'https://e' },
                advanced: { timeout: 30 }
            };
            const flat = win.jPulse.schemaForm.flattenBlockValues(blockData);
            expect(flat).toEqual({ apiKey: 'x', endpoint: 'https://e', timeout: 30 });
        });

        test('returns empty object for null/undefined input', () => {
            expect(win.jPulse.schemaForm.flattenBlockValues(null)).toEqual({});
            expect(win.jPulse.schemaForm.flattenBlockValues(undefined)).toEqual({});
        });

        test('skips non-object block values', () => {
            const flat = win.jPulse.schemaForm.flattenBlockValues({ a: { x: 1 }, b: null, c: 'not obj' });
            expect(flat).toEqual({ x: 1 });
        });
    });

    describe('integration: render → setFormData → getFormData → flattenBlockValues round-trip', () => {
        test('plugin form values survive a render+save cycle', () => {
            const configSchema = [
                { id: 'apiKey', type: 'text', label: 'API Key', tab: 'Connection' },
                { id: 'enabled', type: 'boolean', label: 'Enabled', tab: 'Connection' },
                { id: 'timeout', type: 'number', label: 'Timeout', tab: 'Advanced', default: 30 }
            ];
            const initial = { apiKey: 'sk-xyz', enabled: true, timeout: 45 };
            const { schema, data } = win.jPulse.schemaForm.pluginSchemaToBlocks(configSchema, initial);

            doc.body.innerHTML = '<form id="f"></form>';
            const form = doc.getElementById('f');
            const html = Object.entries(schema.data)
                .map(([blockKey, blockDef]) => win.jPulse.UI.tabs._renderSchemaBlockFields(blockKey, blockDef, data[blockKey] || {}))
                .join('');
            form.innerHTML = html;
            win.jPulse.UI.input.setFormData(form, data, schema);

            const blockData = win.jPulse.UI.input.getFormData(form, schema).data;
            const flat = win.jPulse.schemaForm.flattenBlockValues(blockData);
            expect(flat.apiKey).toBe('sk-xyz');
            expect(flat.enabled).toBe(true);
            expect(flat.timeout).toBe(45);
        });

        test('custom field: render emits container + hidden proxy; value survives round-trip (W-194)', () => {
            const configSchema = [
                { id: 'links', type: 'custom', label: 'Links', renderer: 'test.renderLinks', tab: 'Advanced', default: [] }
            ];
            const initial = { links: [{ label: 'Docs', url: 'https://example.com' }] };
            const { schema, data } = win.jPulse.schemaForm.pluginSchemaToBlocks(configSchema, initial);

            doc.body.innerHTML = '<form id="f"></form>';
            const form = doc.getElementById('f');
            const html = Object.entries(schema.data)
                .map(([blockKey, blockDef]) => win.jPulse.UI.tabs._renderSchemaBlockFields(blockKey, blockDef, data[blockKey] || {}))
                .join('');
            form.innerHTML = html;

            const hidden = form.querySelector('[data-path="advanced.links"]');
            expect(hidden).not.toBeNull();
            expect(hidden.type).toBe('hidden');
            const containerId = hidden.dataset.customContainer;
            expect(containerId).toBeTruthy();
            expect(form.querySelector('#' + containerId)).not.toBeNull();

            win.jPulse.UI.input.setFormData(form, data, schema);
            expect(JSON.parse(hidden.value)).toEqual([{ label: 'Docs', url: 'https://example.com' }]);

            const blockData = win.jPulse.UI.input.getFormData(form, schema).data;
            const flat = win.jPulse.schemaForm.flattenBlockValues(blockData);
            expect(flat.links).toEqual([{ label: 'Docs', url: 'https://example.com' }]);
        });

        test('custom field: getFormData falls back to schema default on invalid JSON (W-194)', () => {
            const configSchema = [
                { id: 'links', type: 'custom', label: 'Links', renderer: 'test.renderLinks', default: [] }
            ];
            const { schema, data } = win.jPulse.schemaForm.pluginSchemaToBlocks(configSchema, {});
            doc.body.innerHTML = '<form id="f"></form>';
            const form = doc.getElementById('f');
            form.innerHTML = win.jPulse.UI.tabs._renderSchemaBlockFields('general', schema.data.general, data.general || {});
            const hidden = form.querySelector('[data-path="general.links"]');
            hidden.value = 'not-json{';

            const blockData = win.jPulse.UI.input.getFormData(form, schema).data;
            expect(blockData.general.links).toEqual([]);
        });
    });
});

// EOF webapp/tests/unit/utils/plugin-config-renderer.test.js
