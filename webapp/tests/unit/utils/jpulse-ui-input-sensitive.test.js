/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Sensitive Input
 * @tagline         Unit tests for the masked / reveal password widget
 * @description     Renders configured vs not-configured, omits untouched secrets from
 *                  getFormData, and confirms a programmatic reveal does not mark dirty
 * @file            webapp/tests/unit/utils/jpulse-ui-input-sensitive.test.js
 * @version         1.7.17
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.15, Grok 4.6
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost:8080',
    pretendToBeVisual: true
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
const win = global.window;
const doc = win.document;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;

const jpulseCommonPath = path.join(process.cwd(), 'webapp/view/jpulse-common.js');
let jpulseCommonContent = fs.readFileSync(jpulseCommonPath, 'utf8');
jpulseCommonContent = jpulseCommonContent.replace(/\{\{i18n\.controller\.handlebar\.date\.fromNow\}\}/g, '{}');
const context = vm.createContext(win);
vm.runInContext(jpulseCommonContent, context);

const MASK = '********';

function schemaFor(fieldDef) {
    return {
        data: {
            email: {
                _meta: { tabLabel: 'Email' },
                smtpPass: fieldDef
            }
        }
    };
}

function renderField(fieldDef, value) {
    const blockDef = {
        _meta: {},
        smtpPass: fieldDef
    };
    const html = win.jPulse.UI.tabs._renderSchemaBlockFields('email', blockDef, { smtpPass: value });
    const form = doc.createElement('form');
    form.id = 'test-form';
    form.setAttribute('data-jp-secret-reveal', '/api/1/config/_default/secret?path={path}');
    form.innerHTML = html;
    doc.body.appendChild(form);
    return form;
}

function fieldEl(form) {
    return form.querySelector('[data-path="email.smtpPass"]');
}

describe('jPulse.UI.input sensitive password widget', () => {

    beforeEach(() => {
        doc.body.innerHTML = '';
        win.jPulse.api = {
            get: jest.fn()
        };
        win.jPulse.UI.toast = {
            error: jest.fn(),
            success: jest.fn()
        };
    });

    afterEach(() => {
        doc.body.innerHTML = '';
    });

    describe('isSensitiveField', () => {
        test('password inputType is sensitive', () => {
            expect(win.jPulse.UI.input.isSensitiveField({ inputType: 'password' })).toBe(true);
        });

        test('explicit sensitive: true is sensitive', () => {
            expect(win.jPulse.UI.input.isSensitiveField({ type: 'string', sensitive: true })).toBe(true);
        });

        test('sensitive: false is the escape hatch even on password', () => {
            expect(win.jPulse.UI.input.isSensitiveField({ inputType: 'password', sensitive: false })).toBe(false);
        });

        test('ordinary text is not sensitive', () => {
            expect(win.jPulse.UI.input.isSensitiveField({ type: 'string', inputType: 'text' })).toBe(false);
        });
    });

    describe('_renderSchemaBlockFields', () => {
        test('mask renders as configured with a reveal button and no value in the input', () => {
            const form = renderField({ type: 'string', inputType: 'password', label: 'SMTP Password' }, MASK);
            const el = fieldEl(form);
            expect(el.dataset.jpSensitive).toBe('1');
            expect(el.dataset.jpSensitiveState).toBe('masked');
            expect(el.dataset.jpSensitiveInitial).toBe(MASK);
            expect(el.value).toBe('');
            expect(el.placeholder).toMatch(/configured/i);
            const reveal = form.querySelector('.jp-sensitive-reveal');
            expect(reveal).toBeTruthy();
            expect(reveal.classList.contains('jp-hidden')).toBe(false);
            const eye = form.querySelector('.jp-password-toggle');
            expect(eye.classList.contains('jp-hidden')).toBe(true);
        });

        test('empty value renders as not configured without a visible reveal button', () => {
            const form = renderField({ type: 'string', inputType: 'password', label: 'SMTP Password' }, '');
            const el = fieldEl(form);
            expect(el.dataset.jpSensitiveState).toBe('empty');
            expect(el.dataset.jpSensitiveInitial).toBe('');
            expect(el.value).toBe('');
            expect(el.placeholder).toMatch(/notConfigured|not configured/i);
            const reveal = form.querySelector('.jp-sensitive-reveal');
            expect(reveal.classList.contains('jp-hidden')).toBe(true);
        });

        test('plaintext value (plugin read before mask) stays in the input, reveal hidden', () => {
            const form = renderField({ type: 'string', inputType: 'password', label: 'API Key' }, 'plain-secret');
            const el = fieldEl(form);
            expect(el.dataset.jpSensitiveState).toBe('plain');
            expect(el.value).toBe('plain-secret');
            expect(form.querySelector('.jp-sensitive-reveal').classList.contains('jp-hidden')).toBe(true);
            expect(form.querySelector('.jp-password-toggle').classList.contains('jp-hidden')).toBe(false);
        });

        test('sensitive: false keeps a plain password input without the reveal widget', () => {
            const form = renderField({ type: 'string', inputType: 'password', sensitive: false, label: 'Legacy' }, 'keep-me');
            const el = fieldEl(form);
            expect(el.dataset.jpSensitive).toBeUndefined();
            expect(el.value).toBe('keep-me');
            expect(form.querySelector('.jp-sensitive-reveal')).toBeNull();
        });
    });

    describe('getFormData omit', () => {
        const fieldDef = { type: 'string', inputType: 'password', label: 'SMTP Password' };

        test('omits an untouched masked field', () => {
            const form = renderField(fieldDef, MASK);
            const { data } = win.jPulse.UI.input.getFormData(form, schemaFor(fieldDef));
            expect(data.email).toBeUndefined();
        });

        test('omits an untouched empty field', () => {
            const form = renderField(fieldDef, '');
            const { data } = win.jPulse.UI.input.getFormData(form, schemaFor(fieldDef));
            expect(data.email).toBeUndefined();
        });

        test('includes a newly typed value', () => {
            const form = renderField(fieldDef, MASK);
            const el = fieldEl(form);
            el.value = 'new-pass';
            el.dataset.jpSensitiveTouched = '1';
            const { data } = win.jPulse.UI.input.getFormData(form, schemaFor(fieldDef));
            expect(data.email.smtpPass).toBe('new-pass');
        });

        test('includes an explicit clear after the user edits', () => {
            const form = renderField(fieldDef, MASK);
            const el = fieldEl(form);
            el.value = '';
            el.dataset.jpSensitiveTouched = '1';
            const { data } = win.jPulse.UI.input.getFormData(form, schemaFor(fieldDef));
            expect(data.email.smtpPass).toBe('');
        });

        test('includes an untouched plaintext value so plugin saves stay intact', () => {
            const form = renderField(fieldDef, 'plain-secret');
            const { data } = win.jPulse.UI.input.getFormData(form, schemaFor(fieldDef));
            expect(data.email.smtpPass).toBe('plain-secret');
        });
    });

    describe('reveal', () => {
        const fieldDef = { type: 'string', inputType: 'password', label: 'SMTP Password' };

        test('fills the value and does not mark the field touched', async () => {
            const form = renderField(fieldDef, MASK);
            win.jPulse.UI.input.initSensitiveFields(form);
            const el = fieldEl(form);
            win.jPulse.api.get.mockResolvedValue({
                success: true,
                data: { path: 'email.smtpPass', value: 's3cret' }
            });

            await win.jPulse.UI.input._revealSensitiveField(el, form, {});

            expect(win.jPulse.api.get).toHaveBeenCalledWith('/api/1/config/_default/secret?path=email.smtpPass');
            expect(el.value).toBe('s3cret');
            expect(el.dataset.jpSensitiveTouched).not.toBe('1');
            expect(el.dataset.jpSensitiveState).toBe('revealed');
            expect(el.type).toBe('text');

            const { data } = win.jPulse.UI.input.getFormData(form, schemaFor(fieldDef));
            expect(data.email).toBeUndefined();

            win.jPulse.UI.input.initSensitiveFields(form);
            expect(el.dataset.jpSensitiveTouched).not.toBe('1');
            expect(el.dataset.jpSensitiveInitial).toBe(MASK);
            const again = win.jPulse.UI.input.getFormData(form, schemaFor(fieldDef));
            expect(again.data.email).toBeUndefined();
        });

        test('a dirty snapshot that uses the initial marker does not change after reveal', async () => {
            const form = renderField(fieldDef, MASK);
            win.jPulse.UI.input.initSensitiveFields(form);
            const el = fieldEl(form);
            const before = el.dataset.jpSensitiveTouched !== '1'
                ? (el.dataset.jpSensitiveInitial || '')
                : el.value;

            win.jPulse.api.get.mockResolvedValue({
                success: true,
                data: { path: 'email.smtpPass', value: 's3cret' }
            });
            await win.jPulse.UI.input._revealSensitiveField(el, form, {});

            const after = el.dataset.jpSensitiveTouched !== '1'
                ? (el.dataset.jpSensitiveInitial || '')
                : el.value;
            expect(after).toBe(before);
            expect(after).toBe(MASK);
        });

        test('toasts when the reveal request fails', async () => {
            const form = renderField(fieldDef, MASK);
            const el = fieldEl(form);
            win.jPulse.api.get.mockResolvedValue({ success: false, error: 'nope' });

            await win.jPulse.UI.input._revealSensitiveField(el, form, {});

            expect(el.value).toBe('');
            expect(win.jPulse.UI.toast.error).toHaveBeenCalledWith('nope');
        });
    });
});

// EOF webapp/tests/unit/utils/jpulse-ui-input-sensitive.test.js
