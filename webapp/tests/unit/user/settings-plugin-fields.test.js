/**
 * @name            jPulse Framework / WebApp / Tests / Unit / User / Settings Plugin Fields
 * @tagline         Unit tests for W-170: settings page slider/tagInput widget support
 * @description     Tests for renderSettingsPluginFieldInput() slider/tagInput branches,
 *                  syncSettingsPluginFieldFromElement() tagInput branch, and
 *                  renderPluginCards() initAll() call after DOM insertion.
 * @file            webapp/tests/unit/user/settings-plugin-fields.test.js
 * @version         1.6.39
 * @release         2026-04-12
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

global.window   = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;

const jpulseCommonPath = path.join(process.cwd(), 'webapp/view/jpulse-common.js');
const jpulseCommonContent = fs.readFileSync(jpulseCommonPath, 'utf8');

const context = vm.createContext(window);
vm.runInContext(jpulseCommonContent, context);

// ---------------------------------------------------------------------------
// Helpers mirroring settings.tmpl functions (W-170 additions only).
// Using window.jPulse.* so they exercise the real framework utilities.
// ---------------------------------------------------------------------------

function isPluginCardCheckboxField(fieldDef) {
    if (fieldDef.inputType === 'switch') return false;
    return fieldDef.inputType === 'checkbox' || fieldDef.type === 'boolean';
}

function makeRenderSettingsPluginFieldInput() {
    return function renderSettingsPluginFieldInput(blockKey, fieldKey, fieldDef, value, fieldId) {
        const inputType = fieldDef.inputType || fieldDef.type || 'string';
        const esc = (v) => (v === null || v === undefined ? '' : window.jPulse.string.escapeHtml(String(v)));
        const dataAttrs = `data-plugin-block="${esc(blockKey)}" data-plugin-field="${esc(fieldKey)}"`;

        if (isPluginCardCheckboxField(fieldDef)) {
            const checked = value ? 'checked' : '';
            return `<input type="checkbox" id="${fieldId}" class="jp-form-input" ${dataAttrs} ${checked}>`;
        }
        if (inputType === 'textarea') {
            const rows = fieldDef.rows || 3;
            return `<textarea id="${fieldId}" name="${fieldKey}" rows="${rows}" class="jp-form-input jp-form-textarea" ${dataAttrs}>${esc(value)}</textarea>`;
        }
        if (inputType === 'select' && fieldDef.options) {
            const opts = (fieldDef.options || []).map(opt => {
                const ov = typeof opt === 'object' ? opt.value : opt;
                const ol = typeof opt === 'object' ? (opt.label || opt.value) : opt;
                const sel = value === ov ? ' selected' : '';
                return `<option value="${esc(ov)}"${sel}>${esc(ol)}</option>`;
            }).join('');
            return `<select id="${fieldId}" name="${fieldKey}" class="jp-form-select" ${dataAttrs}>${opts}</select>`;
        }
        // W-170: slider
        if (inputType === 'slider') {
            const min  = fieldDef.min     != null ? ` data-slider-min="${fieldDef.min}"`             : '';
            const max  = fieldDef.max     != null ? ` data-slider-max="${fieldDef.max}"`             : '';
            const step = fieldDef.step    != null ? ` data-slider-step="${fieldDef.step}"`           : '';
            const def  = fieldDef.default != null ? ` data-slider-default="${fieldDef.default}"`     : '';
            const suf  = fieldDef.suffix  != null ? ` data-slider-suffix="${esc(fieldDef.suffix)}"` : '';
            const numVal = (value === null || value === undefined) ? '' : esc(value);
            return `<input type="number" id="${fieldId}" name="${fieldKey}" value="${numVal}" class="jp-form-input" data-slider${min}${max}${step}${def}${suf} ${dataAttrs}>`;
        }
        // W-170: tagInput
        if (inputType === 'tagInput') {
            const arr = Array.isArray(value) ? value : (value ? String(value).split(',').map(s => s.trim()) : []);
            const formatted = window.jPulse.UI.input.tagInput.formatValue(arr);
            return `<input type="text" id="${fieldId}" name="${fieldKey}" value="${esc(formatted)}" class="jp-form-input" data-taginput ${dataAttrs}>`;
        }
        const type = (inputType === 'number' || fieldDef.type === 'number') ? 'number' : 'text';
        const numVal = (type === 'number' && (value === null || value === undefined)) ? '' : esc(value);
        return `<input type="${type}" id="${fieldId}" name="${fieldKey}" value="${numVal}" class="jp-form-input" ${dataAttrs}>`;
    };
}

function makeSyncSettingsPluginFieldFromElement(currentUserData) {
    return function syncSettingsPluginFieldFromElement(el) {
        if (!el || !el.getAttribute) return;
        const blockKey = el.getAttribute('data-plugin-block');
        const fieldKey = el.getAttribute('data-plugin-field');
        if (!blockKey || !fieldKey) return;

        let value;
        if (el.type === 'checkbox') {
            value = el.checked;
        } else if (el.type === 'number') {
            const v = parseFloat(el.value);
            value = isNaN(v) ? el.value : v;
        } else if (el.getAttribute('data-taginput') !== null) {
            // W-170: tagInput stores comma-separated string; parseValue returns string[]
            value = window.jPulse.UI.input.tagInput.parseValue(el.value);
        } else {
            value = el.value;
        }

        if (!currentUserData[blockKey]) currentUserData[blockKey] = {};
        currentUserData[blockKey][fieldKey] = value;
    };
}

// ---------------------------------------------------------------------------

describe('W-170: settings.tmpl — renderSettingsPluginFieldInput()', () => {
    const render = makeRenderSettingsPluginFieldInput();

    describe('slider branch', () => {
        const fieldDef = {
            type: 'number', inputType: 'slider',
            min: 120, max: 240, step: 20, default: 160, suffix: 'px'
        };

        test('renders type=number with data-slider attribute', () => {
            const html = render('bubblemap', 'colStep', fieldDef, 160, 'fld-1');
            expect(html).toContain('type="number"');
            expect(html).toContain('data-slider');
        });

        test('includes data-slider-min/max/step/default/suffix from fieldDef', () => {
            const html = render('bubblemap', 'colStep', fieldDef, 160, 'fld-1');
            expect(html).toContain('data-slider-min="120"');
            expect(html).toContain('data-slider-max="240"');
            expect(html).toContain('data-slider-step="20"');
            expect(html).toContain('data-slider-default="160"');
            expect(html).toContain('data-slider-suffix="px"');
        });

        test('includes name, id and data-plugin-block/field attributes', () => {
            const html = render('bubblemap', 'colStep', fieldDef, 160, 'fld-1');
            expect(html).toContain('id="fld-1"');
            expect(html).toContain('name="colStep"');
            expect(html).toContain('data-plugin-block="bubblemap"');
            expect(html).toContain('data-plugin-field="colStep"');
        });

        test('renders provided value as input value', () => {
            const html = render('bubblemap', 'colStep', fieldDef, 200, 'fld-1');
            expect(html).toContain('value="200"');
        });

        test('renders empty string when value is null', () => {
            const html = render('bubblemap', 'colStep', fieldDef, null, 'fld-1');
            expect(html).toContain('value=""');
        });

        test('renders empty string when value is undefined', () => {
            const html = render('bubblemap', 'colStep', fieldDef, undefined, 'fld-1');
            expect(html).toContain('value=""');
        });

        test('omits data-slider-min when fieldDef.min is undefined', () => {
            const fd = { type: 'number', inputType: 'slider', max: 100 };
            const html = render('block', 'field', fd, 50, 'fld-2');
            expect(html).not.toContain('data-slider-min');
            expect(html).toContain('data-slider-max="100"');
        });

        test('HTML-escapes suffix', () => {
            const fd = { type: 'number', inputType: 'slider', suffix: '<px>' };
            const html = render('block', 'field', fd, 50, 'fld-3');
            expect(html).toContain('data-slider-suffix="&lt;px&gt;"');
        });

        test('slider widget is initialized by initAll on the rendered input', () => {
            document.body.innerHTML = render('bubblemap', 'colStep', fieldDef, 160, 'fld-slider-init');
            const input = document.getElementById('fld-slider-init');
            expect(input).toBeTruthy();
            window.jPulse.UI.input.initAll(document.body);
            expect(input.closest('.jp-slider-wrap')).toBeTruthy();
            expect(input.dataset.sliderInited).toBe('1');
        });
    });

    describe('tagInput branch', () => {
        const fieldDef = { type: 'string', inputType: 'tagInput' };

        test('renders type=text with data-taginput attribute', () => {
            const html = render('block', 'tags', fieldDef, ['admin', 'user'], 'fld-ti');
            expect(html).toContain('type="text"');
            expect(html).toContain('data-taginput');
        });

        test('formats array value via tagInput.formatValue', () => {
            const html = render('block', 'tags', fieldDef, ['user', 'admin'], 'fld-ti');
            // formatValue sorts and joins with ', '
            expect(html).toContain('value="admin, user"');
        });

        test('splits comma-string value before formatting', () => {
            const html = render('block', 'tags', fieldDef, 'user,admin', 'fld-ti');
            expect(html).toContain('value="admin, user"');
        });

        test('renders empty string for undefined value', () => {
            const html = render('block', 'tags', fieldDef, undefined, 'fld-ti');
            expect(html).toContain('value=""');
        });

        test('renders empty string for empty array', () => {
            const html = render('block', 'tags', fieldDef, [], 'fld-ti');
            expect(html).toContain('value=""');
        });

        test('includes name, id and data-plugin-block/field attributes', () => {
            const html = render('myBlock', 'myTags', fieldDef, [], 'fld-ti-2');
            expect(html).toContain('id="fld-ti-2"');
            expect(html).toContain('name="myTags"');
            expect(html).toContain('data-plugin-block="myBlock"');
            expect(html).toContain('data-plugin-field="myTags"');
        });

        test('tagInput widget is initialized by initAll on the rendered input', () => {
            document.body.innerHTML = render('block', 'tags', fieldDef, ['admin'], 'fld-ti-init');
            const input = document.getElementById('fld-ti-init');
            expect(input).toBeTruthy();
            window.jPulse.UI.input.initAll(document.body);
            expect(input.dataset.taginputInited).toBe('1');
            expect(input.closest('.jp-taginput-wrap')).toBeTruthy();
        });
    });
});

describe('W-170: settings.tmpl — syncSettingsPluginFieldFromElement() tagInput branch', () => {

    beforeEach(() => {
        document.body.innerHTML = '';
    });

    test('reads tagInput el.value via parseValue, stores string[] in currentUserData', () => {
        const currentUserData = {};
        const sync = makeSyncSettingsPluginFieldFromElement(currentUserData);

        const input = document.createElement('input');
        input.type = 'text';
        input.setAttribute('data-taginput', '1');
        input.setAttribute('data-plugin-block', 'block');
        input.setAttribute('data-plugin-field', 'roles');
        input.value = 'admin, user, editor';
        document.body.appendChild(input);

        sync(input);

        expect(Array.isArray(currentUserData.block.roles)).toBe(true);
        expect(currentUserData.block.roles).toEqual(['admin', 'editor', 'user']);
    });

    test('returns empty array for blank tagInput value', () => {
        const currentUserData = {};
        const sync = makeSyncSettingsPluginFieldFromElement(currentUserData);

        const input = document.createElement('input');
        input.type = 'text';
        input.setAttribute('data-taginput', '1');
        input.setAttribute('data-plugin-block', 'block');
        input.setAttribute('data-plugin-field', 'roles');
        input.value = '';
        document.body.appendChild(input);

        sync(input);

        expect(currentUserData.block.roles).toEqual([]);
    });

    test('treats number input (slider) as numeric value, not tagInput path', () => {
        const currentUserData = {};
        const sync = makeSyncSettingsPluginFieldFromElement(currentUserData);

        const input = document.createElement('input');
        input.type = 'number';
        input.setAttribute('data-plugin-block', 'bubblemap');
        input.setAttribute('data-plugin-field', 'colStep');
        input.value = '180';
        document.body.appendChild(input);

        sync(input);

        expect(typeof currentUserData.bubblemap.colStep).toBe('number');
        expect(currentUserData.bubblemap.colStep).toBe(180);
    });

    test('skips element without data-plugin-block/field', () => {
        const currentUserData = {};
        const sync = makeSyncSettingsPluginFieldFromElement(currentUserData);

        const input = document.createElement('input');
        input.type = 'text';
        input.setAttribute('data-taginput', '1');
        input.value = 'foo';
        document.body.appendChild(input);

        sync(input);

        expect(Object.keys(currentUserData).length).toBe(0);
    });
});

describe('W-170: settings.tmpl — renderPluginCards() calls initAll(container)', () => {

    beforeEach(() => {
        document.body.innerHTML = '<div id="pluginCardsContainer"></div>';
    });

    test('initAll is called on the container after cards are inserted', () => {
        const container = document.getElementById('pluginCardsContainer');
        const schemaMetadata = {
            bubblemap: {
                _meta: {
                    userCard: { visible: true, label: 'BubbleMap', icon: '🫧', order: 20 }
                },
                colStep: {
                    type: 'number', inputType: 'slider',
                    min: 120, max: 240, step: 20, default: 160, suffix: 'px',
                    userCard: { visible: true, readOnly: false }
                }
            }
        };
        const currentUserData = { bubblemap: { colStep: 160 } };
        const render = makeRenderSettingsPluginFieldInput();

        // Simulate renderPluginCards with initAll call (W-170)
        container.innerHTML = '';
        const sortedBlocks = Object.entries(schemaMetadata)
            .filter(([, blockDef]) => blockDef._meta?.userCard?.visible)
            .sort((a, b) => (a[1]._meta?.userCard?.order || 999) - (b[1]._meta?.userCard?.order || 999));

        let fieldHtml = '';
        sortedBlocks.forEach(([blockKey, blockDef]) => {
            const cardConfig = blockDef._meta.userCard;
            const userData = currentUserData[blockKey] || {};
            for (const [fieldKey, fieldDef] of Object.entries(blockDef)) {
                if (fieldKey === '_meta') continue;
                if (!fieldDef.userCard?.visible) continue;
                const value = userData[fieldKey] ?? fieldDef.default;
                const fieldId = `settings-plugin-${blockKey}-${fieldKey}`;
                fieldHtml += render(blockKey, fieldKey, fieldDef, value, fieldId);
            }
            container.insertAdjacentHTML('beforeend',
                `<div class="jp-card" id="card-${blockKey}">${fieldHtml}</div>`);
        });
        // W-170: call initAll after all cards inserted
        window.jPulse.UI.input.initAll(container);

        // Verify slider inside the card was initialized
        const sliderInput = container.querySelector('[data-slider]');
        expect(sliderInput).toBeTruthy();
        expect(sliderInput.dataset.sliderInited).toBe('1');
        expect(sliderInput.closest('.jp-slider-wrap')).toBeTruthy();
    });

    test('initAll is safe to call on empty container (no cards)', () => {
        const container = document.getElementById('pluginCardsContainer');
        container.innerHTML = '';
        expect(() => window.jPulse.UI.input.initAll(container)).not.toThrow();
    });
});

// EOF webapp/tests/unit/user/settings-plugin-fields.test.js
