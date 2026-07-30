/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / jPulse UI Input fieldGrid
 * @tagline         Unit Tests for fieldGrid inputType (W-191)
 * @description     Tests for _renderSchemaBlockFields fieldGrid rendering, initAll handler,
 *                  adjustRows, serializeRows, and setFormData/getFormData integration
 * @file            webapp/tests/unit/utils/jpulse-ui-input-fieldgrid.test.js
 * @version         1.7.3
 * @release         2026-07-30
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 4.x, Claude Sonnet 4.6
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
global.CustomEvent = dom.window.CustomEvent;

const jpulseCommonPath = path.join(process.cwd(), 'webapp/view/jpulse-common.js');
let jpulseCommonContent = fs.readFileSync(jpulseCommonPath, 'utf8');
// W-185: strip the unquoted subtree-embed token (would otherwise break JS parse when loaded raw)
jpulseCommonContent = jpulseCommonContent.replace(/\{\{i18n\.controller\.handlebar\.date\.fromNow\}\}/g, '{}');
const context = vm.createContext(window);
vm.runInContext(jpulseCommonContent, context);

// Standard 3-column definition reused across tests
const STD_COLUMNS = [
    { id: 'col', label: 'Column', inputType: 'text',   width: '40%', placeholder: 'Enter column' },
    { id: 'op',  label: 'Op',     inputType: 'select', width: '20%',
      options: [{ value: '==', label: '==' }, { value: '!=', label: '!=' }], default: '==' },
    { id: 'val', label: 'Value',  inputType: 'text',   width: '40%' }
];

// Schema for setFormData / getFormData tests: block key 'blk', field 'filters'
const STD_SCHEMA = {
    data: {
        blk: {
            filters: { inputType: 'fieldGrid', columns: STD_COLUMNS }
        }
    }
};

/**
 * Render a fieldGrid schema block and return the HTML string.
 * blockKey is 'blk', field id is 'filters'.
 */
function renderHtml(fieldDef = {}) {
    const blockDef = {
        _meta: {},
        filters: Object.assign({ inputType: 'fieldGrid', label: 'Filters', columns: STD_COLUMNS }, fieldDef)
    };
    return window.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, {});
}

/**
 * Inject rendered HTML into body, optionally pre-load a JSON value into the
 * hidden proxy, then call initAll. Returns the hidden input element.
 */
function setupDom(fieldDef = {}, hiddenValue = '') {
    document.body.innerHTML = renderHtml(fieldDef);
    const hidden = document.querySelector('input[data-field-grid]');
    if (hidden && hiddenValue) hidden.value = hiddenValue;
    window.jPulse.UI.input.initAll(document.body);
    return hidden;
}

describe('fieldGrid inputType (W-191)', () => {

    beforeEach(() => {
        document.body.innerHTML = '';
    });

    // ──────────────────────────────────────────────────────────────
    // Group 1 — _renderSchemaBlockFields HTML output
    // ──────────────────────────────────────────────────────────────
    describe('_renderSchemaBlockFields HTML', () => {

        test('renders jp-field-grid table with data-columns attribute', () => {
            const html = renderHtml();
            expect(html).toContain('class="jp-field-grid"');
            expect(html).toContain('data-columns=');
        });

        test('wrapper has data-empty-rows and data-max-rows with defaults', () => {
            const html = renderHtml();
            expect(html).toContain('data-empty-rows="2"');
            expect(html).toContain('data-max-rows="16"');
        });

        test('respects custom emptyRows and maxRows values', () => {
            const html = renderHtml({ emptyRows: 3, maxRows: 8 });
            expect(html).toContain('data-empty-rows="3"');
            expect(html).toContain('data-max-rows="8"');
        });

        test('thead contains correct th labels with widths', () => {
            const html = renderHtml();
            expect(html).toContain('<th style="width:40%">Column</th>');
            expect(html).toContain('<th style="width:20%">Op</th>');
            expect(html).toContain('<th style="width:40%">Value</th>');
        });

        test('column width defaults to auto when omitted', () => {
            const blockDef = {
                _meta: {},
                f: { inputType: 'fieldGrid', label: 'F', columns: [{ id: 'x', label: 'X', inputType: 'text' }] }
            };
            const html = window.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, {});
            expect(html).toContain('<th style="width:auto">X</th>');
        });

        test('tbody is seeded with exactly emptyRows initial rows', () => {
            const html = renderHtml({ emptyRows: 3 });
            const matches = html.match(/data-row-idx="\d+"/g) || [];
            expect(matches.length).toBe(3);
        });

        test('text column renders input[type=text] with placeholder', () => {
            const html = renderHtml();
            expect(html).toMatch(/<input type="text" data-col-id="col" placeholder="Enter column">/);
        });

        test('number column renders input[type=number]', () => {
            const blockDef = {
                _meta: {},
                f: { inputType: 'fieldGrid', label: 'F', columns: [{ id: 'n', label: 'N', inputType: 'number' }] }
            };
            const html = window.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, {});
            expect(html).toMatch(/<input type="number" data-col-id="n">/);
        });

        test('select column renders native select with options; col.default is pre-selected', () => {
            const html = renderHtml();
            expect(html).toContain('<select data-col-id="op">');
            expect(html).toMatch(/<option value="==" selected>==<\/option>/);
            expect(html).toMatch(/<option value="!=">!=<\/option>/);
        });

        test('select column without default does not mark any option selected', () => {
            const blockDef = {
                _meta: {},
                f: { inputType: 'fieldGrid', label: 'F', columns: [{
                    id: 's', label: 'S', inputType: 'select',
                    options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]
                }] }
            };
            const html = window.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, {});
            expect(html).not.toContain(' selected>');
        });

        test('checkbox column renders input[type=checkbox]', () => {
            const blockDef = {
                _meta: {},
                f: { inputType: 'fieldGrid', label: 'F',
                    columns: [{ id: 'active', label: 'Active', inputType: 'checkbox' }] }
            };
            const html = window.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, {});
            expect(html).toMatch(/<input type="checkbox" data-col-id="active">/);
        });

        test('hidden proxy has jp-edit-field class and data-field-grid attribute', () => {
            const html = renderHtml();
            expect(html).toMatch(/<input type="hidden"[^>]*class="jp-edit-field"[^>]*data-field-grid=/);
        });

        test('wrapper always carries jp-schema-field-full and jp-schema-field-new-row', () => {
            const html = renderHtml();
            expect(html).toContain('jp-schema-field-full');
            expect(html).toContain('jp-schema-field-new-row');
        });

        test('help text is rendered when provided', () => {
            const html = renderHtml({ help: 'Enter filter conditions' });
            expect(html).toContain('Enter filter conditions');
            expect(html).toContain('jp-text-small');
        });

        test('renders valid structure with empty columns array', () => {
            const blockDef = {
                _meta: {},
                f: { inputType: 'fieldGrid', label: 'F', columns: [] }
            };
            const html = window.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, {});
            expect(html).toContain('jp-field-grid');
            expect(html).not.toContain('<th>');
        });
    });

    // ──────────────────────────────────────────────────────────────
    // Group 2 — initAll: init phase
    // ──────────────────────────────────────────────────────────────
    describe('initAll — init phase', () => {

        test('starts with emptyRows rows when hidden field is empty', () => {
            setupDom({ emptyRows: 2 });
            expect(document.querySelectorAll('tr[data-row-idx]').length).toBe(2);
        });

        test('populates text and select cells from saved JSON', () => {
            const saved = JSON.stringify([{ col: 'status', op: '==', val: 'open' }]);
            setupDom({}, saved);
            expect(document.querySelector('[data-col-id="col"]').value).toBe('status');
            expect(document.querySelector('[data-col-id="op"]').value).toBe('==');
            expect(document.querySelector('[data-col-id="val"]').value).toBe('open');
        });

        test('grows tbody to data.length + emptyRows rows', () => {
            const saved = JSON.stringify([
                { col: 'a', op: '==', val: '1' },
                { col: 'b', op: '!=', val: '2' }
            ]);
            setupDom({ emptyRows: 2 }, saved);
            expect(document.querySelectorAll('tr[data-row-idx]').length).toBe(4);
        });

        test('caps row count at maxRows even if saved data exceeds it', () => {
            const saved = JSON.stringify([
                { col: 'a', op: '==', val: '1' },
                { col: 'b', op: '==', val: '2' },
                { col: 'c', op: '==', val: '3' }
            ]);
            setupDom({ emptyRows: 2, maxRows: 3 }, saved);
            expect(document.querySelectorAll('tr[data-row-idx]').length).toBe(3);
        });

        test('populates checkbox cell from saved boolean true', () => {
            const blockDef = {
                _meta: {},
                f: { inputType: 'fieldGrid', label: 'F', columns: [
                    { id: 'active', label: 'Active', inputType: 'checkbox' },
                    { id: 'name',   label: 'Name',   inputType: 'text' }
                ] }
            };
            document.body.innerHTML = window.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, {});
            const hidden = document.querySelector('input[data-field-grid]');
            hidden.value = JSON.stringify([{ active: true, name: 'foo' }]);
            window.jPulse.UI.input.initAll(document.body);
            expect(document.querySelector('[data-col-id="active"]').checked).toBe(true);
        });

        test('invalid JSON in hidden field results in empty rows with emptyRows count', () => {
            setupDom({ emptyRows: 2 }, 'NOT_VALID_JSON');
            expect(document.querySelectorAll('tr[data-row-idx]').length).toBe(2);
            document.querySelectorAll('tr[data-row-idx]').forEach(tr => {
                tr.querySelectorAll('input[type="text"]').forEach(inp => {
                    expect(inp.value).toBe('');
                });
            });
        });

        test('re-calling initAll does not reset already-inited cells', () => {
            setupDom({}, JSON.stringify([{ col: 'x', op: '==', val: 'y' }]));
            document.querySelector('[data-col-id="col"]').value = 'changed';
            window.jPulse.UI.input.initAll(document.body);
            expect(document.querySelector('[data-col-id="col"]').value).toBe('changed');
        });
    });

    // ──────────────────────────────────────────────────────────────
    // Group 3 — initAll: adjustRows (dynamic row management)
    // ──────────────────────────────────────────────────────────────
    describe('initAll — adjustRows', () => {

        test('typing in the first empty row adds a new trailing empty row', () => {
            // Type into row 0 (first row); row 1 stays empty at bottom.
            // adjustRows sees: tail=0 (row 1 is empty), dataCount=1, targetTotal=1+2=3.
            setupDom({ emptyRows: 2 });
            const tbody = document.querySelector('tbody');
            const row0 = tbody.querySelector('tr[data-row-idx="0"]');
            row0.querySelector('[data-col-id="col"]').value = 'issue';
            row0.querySelector('[data-col-id="col"]').dispatchEvent(new window.Event('input', { bubbles: true }));
            expect(tbody.querySelectorAll('tr[data-row-idx]').length).toBe(3);
        });

        test('clearing the only filled row trims back to emptyRows', () => {
            const saved = JSON.stringify([{ col: 'x', op: '==', val: 'y' }]);
            setupDom({ emptyRows: 2 }, saved);
            const tbody = document.querySelector('tbody');
            expect(tbody.querySelectorAll('tr[data-row-idx]').length).toBe(3);
            // Clear text cells in the first row
            tbody.querySelector('[data-col-id="col"]').value = '';
            tbody.querySelector('[data-col-id="val"]').value = '';
            tbody.querySelector('[data-col-id="col"]').dispatchEvent(new window.Event('input', { bubbles: true }));
            expect(tbody.querySelectorAll('tr[data-row-idx]').length).toBe(2);
        });

        test('maxRows cap prevents further row creation', () => {
            setupDom({ emptyRows: 2, maxRows: 2 });
            const tbody = document.querySelector('tbody');
            const cell = tbody.querySelector('[data-col-id="col"]');
            cell.value = 'issue';
            cell.dispatchEvent(new window.Event('input', { bubbles: true }));
            expect(tbody.querySelectorAll('tr[data-row-idx]').length).toBe(2);
        });

        test('row data-row-idx values are contiguous after adjustRows', () => {
            setupDom({ emptyRows: 2 });
            const tbody = document.querySelector('tbody');
            const cell = tbody.querySelector('[data-col-id="col"]');
            cell.value = 'foo';
            cell.dispatchEvent(new window.Event('input', { bubbles: true }));
            Array.from(tbody.querySelectorAll('tr[data-row-idx]')).forEach((tr, i) => {
                expect(tr.dataset.rowIdx).toBe(String(i));
            });
        });

        test('auto-appended row select starts blank (no column default leaks in)', () => {
            // emptyRows=2: row 0 + row 1 are server-rendered (blanked by init pass).
            // Typing in row 0 grows the grid to 3 rows; row 2 is built by buildRow().
            setupDom({ emptyRows: 2 });
            const tbody = document.querySelector('tbody');
            const row0 = tbody.querySelector('tr[data-row-idx="0"]');
            row0.querySelector('[data-col-id="col"]').value = 'issue';
            row0.querySelector('[data-col-id="col"]').dispatchEvent(new window.Event('input', { bubbles: true }));
            expect(tbody.querySelectorAll('tr[data-row-idx]').length).toBe(3);
            // The auto-appended row's select must not pre-select col.default ('==').
            const appendedSelect = tbody.querySelector('tr[data-row-idx="2"] [data-col-id="op"]');
            expect(appendedSelect).not.toBeNull();
            expect(appendedSelect.selectedIndex).toBe(-1);
            expect(appendedSelect.value).toBe('');
        });

        test('select-column-only change event triggers adjustRows', () => {
            setupDom({ emptyRows: 2 });
            const tbody = document.querySelector('tbody');
            // Change a select — since only text/number determines emptiness, row stays empty
            const op = tbody.querySelector('[data-col-id="op"]');
            op.value = '!=';
            op.dispatchEvent(new window.Event('change', { bubbles: true }));
            // Row count stays at emptyRows (select-only change is not "non-empty")
            expect(tbody.querySelectorAll('tr[data-row-idx]').length).toBe(2);
        });
    });

    // ──────────────────────────────────────────────────────────────
    // Group 4 — initAll: serializeRows
    // ──────────────────────────────────────────────────────────────
    describe('initAll — serializeRows', () => {

        test('empty rows produce empty JSON array in hidden field', () => {
            const hidden = setupDom({ emptyRows: 2 });
            // trigger serialization without adding data
            document.querySelector('[data-col-id="col"]').dispatchEvent(new window.Event('input', { bubbles: true }));
            expect(JSON.parse(hidden.value || '[]')).toEqual([]);
        });

        test('filled row is serialized with all column values', () => {
            // Pre-load saved data so initAll populates cells (including the select).
            const saved = JSON.stringify([{ col: 'status', op: '==', val: 'open' }]);
            const hidden = setupDom({ emptyRows: 2 }, saved);
            // Trigger re-serialization via an input event.
            document.querySelector('[data-col-id="col"]').dispatchEvent(new window.Event('input', { bubbles: true }));
            const result = JSON.parse(hidden.value);
            expect(result).toHaveLength(1);
            expect(result[0].col).toBe('status');
            expect(result[0].op).toBe('==');
            expect(result[0].val).toBe('open');
        });

        test('checkbox column value is serialized as boolean', () => {
            const blockDef = {
                _meta: {},
                f: { inputType: 'fieldGrid', label: 'F', columns: [
                    { id: 'active', label: 'Active', inputType: 'checkbox' },
                    { id: 'name',   label: 'Name',   inputType: 'text' }
                ] }
            };
            document.body.innerHTML = window.jPulse.UI.tabs._renderSchemaBlockFields('blk', blockDef, {});
            window.jPulse.UI.input.initAll(document.body);
            const hidden = document.querySelector('input[data-field-grid]');
            const tbody = document.querySelector('tbody');
            const row0 = tbody.querySelector('tr[data-row-idx="0"]');
            row0.querySelector('[data-col-id="active"]').checked = true;
            row0.querySelector('[data-col-id="name"]').value = 'foo';
            row0.querySelector('[data-col-id="name"]').dispatchEvent(new window.Event('input', { bubbles: true }));
            const result = JSON.parse(hidden.value);
            expect(result[0].active).toBe(true);
        });

        test('hidden field value is valid JSON after any input', () => {
            const hidden = setupDom({ emptyRows: 2 });
            const cell = document.querySelector('[data-col-id="col"]');
            cell.value = 'assignee';
            cell.dispatchEvent(new window.Event('input', { bubbles: true }));
            expect(() => JSON.parse(hidden.value)).not.toThrow();
        });

        test('change event from hidden field does not re-trigger serialize (no re-entry)', () => {
            const hidden = setupDom({ emptyRows: 2 });
            let changeCount = 0;
            hidden.addEventListener('change', () => changeCount++);
            const cell = document.querySelector('[data-col-id="col"]');
            cell.value = 'test';
            cell.dispatchEvent(new window.Event('input', { bubbles: true }));
            expect(changeCount).toBe(1);
        });

        test('multiple filled rows are all serialized; order matches row index', () => {
            const hidden = setupDom({ emptyRows: 1 });
            const tbody = document.querySelector('tbody');
            // Fill row 0; adjustRows will grow to 1 data + 1 empty = 2 rows total.
            const row0Cell = tbody.querySelector('tr[data-row-idx="0"] [data-col-id="col"]');
            row0Cell.value = 'first';
            row0Cell.dispatchEvent(new window.Event('input', { bubbles: true }));
            // Now a row 1 exists (built by buildRow using data-columns); fill it.
            const row1 = tbody.querySelector('tr[data-row-idx="1"]');
            expect(row1).not.toBeNull();
            const row1Cell = row1.querySelector('[data-col-id="col"]');
            expect(row1Cell).not.toBeNull();
            row1Cell.value = 'second';
            row1Cell.dispatchEvent(new window.Event('input', { bubbles: true }));
            const result = JSON.parse(hidden.value);
            expect(result.length).toBeGreaterThanOrEqual(2);
            expect(result[0].col).toBe('first');
            expect(result[1].col).toBe('second');
        });
    });

    // ──────────────────────────────────────────────────────────────
    // Group 5 — setFormData / getFormData integration
    // ──────────────────────────────────────────────────────────────
    describe('setFormData / getFormData', () => {

        test('setFormData converts array value to JSON string in hidden field', () => {
            setupDom({});
            const hidden = document.querySelector('input[data-field-grid]');
            const data = { blk: { filters: [{ col: 'issue', op: '==', val: '5' }] } };
            window.jPulse.UI.input.setFormData(document.body, data, STD_SCHEMA);
            const parsed = JSON.parse(hidden.value);
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed[0].col).toBe('issue');
        });

        test('setFormData with array does not leave [object Object] in hidden field', () => {
            setupDom({});
            const hidden = document.querySelector('input[data-field-grid]');
            const data = { blk: { filters: [{ col: 'x', op: '!=', val: 'y' }] } };
            window.jPulse.UI.input.setFormData(document.body, data, STD_SCHEMA);
            expect(hidden.value).not.toContain('[object');
        });

        test('setFormData with empty array sets hidden field to []', () => {
            setupDom({});
            const hidden = document.querySelector('input[data-field-grid]');
            window.jPulse.UI.input.setFormData(document.body, { blk: { filters: [] } }, STD_SCHEMA);
            expect(hidden.value).toBe('[]');
        });

        test('setFormData slices array to maxRows', () => {
            const bigRows = Array.from({ length: 20 }, (_, i) => ({ col: 'c' + i, op: '==', val: String(i) }));
            setupDom({ maxRows: 5 });
            const hidden = document.querySelector('input[data-field-grid]');
            const schema = { data: { blk: { filters: { inputType: 'fieldGrid', maxRows: 5, columns: STD_COLUMNS } } } };
            window.jPulse.UI.input.setFormData(document.body, { blk: { filters: bigRows } }, schema);
            const parsed = JSON.parse(hidden.value);
            expect(parsed.length).toBeLessThanOrEqual(5);
        });

        test('getFormData parses hidden JSON string back to array', () => {
            setupDom({});
            const hidden = document.querySelector('input[data-field-grid]');
            hidden.value = JSON.stringify([{ col: 'team', op: '==', val: 'backend' }]);
            const result = window.jPulse.UI.input.getFormData(document.body, STD_SCHEMA);
            expect(result).toHaveProperty('data');
            expect(Array.isArray(result.data.blk.filters)).toBe(true);
            expect(result.data.blk.filters[0].col).toBe('team');
        });

        test('getFormData returns [] for malformed JSON in hidden field', () => {
            setupDom({});
            const hidden = document.querySelector('input[data-field-grid]');
            hidden.value = 'NOT_VALID_JSON';
            const result = window.jPulse.UI.input.getFormData(document.body, STD_SCHEMA);
            expect(Array.isArray(result.data.blk.filters)).toBe(true);
            expect(result.data.blk.filters).toEqual([]);
        });

        test('getFormData returns [] when hidden field holds a non-array JSON value', () => {
            setupDom({});
            const hidden = document.querySelector('input[data-field-grid]');
            hidden.value = '"just a string"';
            const result = window.jPulse.UI.input.getFormData(document.body, STD_SCHEMA);
            expect(result.data.blk.filters).toEqual([]);
        });

        test('round-trip: setFormData then getFormData returns equivalent array', () => {
            setupDom({});
            const original = [{ col: 'priority', op: '==', val: 'high' }];
            window.jPulse.UI.input.setFormData(document.body, { blk: { filters: original } }, STD_SCHEMA);
            const result = window.jPulse.UI.input.getFormData(document.body, STD_SCHEMA);
            expect(result.data.blk.filters).toEqual(original);
        });
    });
});

// EOF webapp/tests/unit/utils/jpulse-ui-input-fieldgrid.test.js
