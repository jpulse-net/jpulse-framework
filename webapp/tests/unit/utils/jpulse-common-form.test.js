/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / jPulse Common Form Handling
 * @tagline         Unit Tests for jPulse Common Client-Side Form Utilities
 * @description     Tests for client-side form submission utilities in jpulse-common.js
 * @file            webapp/tests/unit/utils/jpulse-common-form.test.js
 * @version         1.3.14
 * @release         2025-12-13
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

// --- Test Setup ---

// 1. JSDOM Environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.fetch = jest.fn();
global.CustomEvent = dom.window.CustomEvent;

// 2. Load jpulse-common.js into the JSDOM context
const jpulseCommonPath = path.resolve(process.cwd(), 'webapp/view/jpulse-common.js');
const jpulseCommonContent = fs.readFileSync(jpulseCommonPath, 'utf8');
const context = vm.createContext(window);
vm.runInContext(jpulseCommonContent, context);

// --- Tests ---

describe('jPulse.form Submission Handling', () => {

    let form;
    let submitButton;

    // Mocks
    let showSuccessMock;
    let showErrorMock;
    let clearErrorsMock;
    let setLoadingStateMock;
    let apiCallMock;

    beforeEach(() => {
        // Clear all existing mocks first
        jest.clearAllMocks();

        // Reset mocks before each test
        global.fetch.mockClear();
        showSuccessMock = jest.spyOn(window.jPulse.UI.toast, 'success').mockImplementation(() => {});
        showErrorMock = jest.spyOn(window.jPulse.UI.toast, 'error').mockImplementation(() => {});
        clearErrorsMock = jest.spyOn(window.jPulse.form, 'clearErrors').mockImplementation(() => {});
        setLoadingStateMock = jest.spyOn(window.jPulse.form, 'setLoadingState').mockImplementation(() => {});

        // Mock apiCall instead of fetch since handleSubmission uses apiCall
        apiCallMock = jest.spyOn(window.jPulse.api, 'call');

        // Mock the serialize function to avoid FormData issues in JSDOM
        jest.spyOn(window.jPulse.form, 'serialize').mockReturnValue({
            username: 'testuser',
            password: 'password123'
        });

        // Create a fresh form for each test
        document.body.innerHTML = `
            <form id="testForm">
                <input name="username" value="testuser" required>
                <input name="password" value="password123" required>
                <button type="submit">Submit</button>
            </form>
        `;
        form = document.getElementById('testForm');
        submitButton = form.querySelector('button');

        // Manually set values for JSDOM, which doesn't automatically reflect `value` attributes
        // This is required to pass the built-in `validateBeforeSubmit` check.
        form.querySelector('[name="username"]').value = 'testuser';
        form.querySelector('[name="password"]').value = 'password123';
    });

    afterEach(() => {
        // Clean up any event listeners and restore all mocks
        jest.restoreAllMocks();
        document.body.innerHTML = '';
    });

    // Helper to simulate form submission
    const submitForm = async () => {
        const event = new window.CustomEvent('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(event);
        // Allow microtasks (like async/await promises) to resolve
        await new Promise(process.nextTick);
    };

    describe('bindSubmission (Auto-binding for simple forms)', () => {

        test('should bind to the submit event and handle a successful submission', async () => {
            apiCallMock.mockResolvedValueOnce({
                success: true,
                data: { userId: 123 }
            });

            const onSuccess = jest.fn();
            const beforeSubmit = jest.fn(() => true);

            window.jPulse.form.bindSubmission(form, '/api/test', {
                onSuccess: onSuccess,
                beforeSubmit: beforeSubmit
            });

            await submitForm();

            expect(beforeSubmit).toHaveBeenCalledTimes(1);
            expect(apiCallMock).toHaveBeenCalledWith('/api/test', expect.any(Object));
            expect(onSuccess).toHaveBeenCalledWith({ userId: 123 }, form);
            expect(showErrorMock).not.toHaveBeenCalled();
            expect(clearErrorsMock).toHaveBeenCalledTimes(1);
        });

        test('should show a default error if submission fails and no onError is provided', async () => {
            apiCallMock.mockResolvedValueOnce({
                success: false,
                error: 'Server validation failed'
            });

            window.jPulse.form.bindSubmission(form, '/api/test');

            await submitForm();

            expect(apiCallMock).toHaveBeenCalledTimes(1);
            expect(showErrorMock).toHaveBeenCalledWith('Server validation failed');
        });

        test('should not submit if beforeSubmit returns false', async () => {
            const beforeSubmit = jest.fn(() => false);
            window.jPulse.form.bindSubmission(form, '/api/test', { beforeSubmit });

            await submitForm();

            expect(beforeSubmit).toHaveBeenCalledTimes(1);
            expect(apiCallMock).not.toHaveBeenCalled();
        });
    });

    describe('handleSubmission (Immediate execution for custom handlers)', () => {

        test('should fail validation if a required field is empty', async () => {
            form.querySelector('[name="username"]').value = ''; // Empty a required field

            await window.jPulse.form.handleSubmission(form, '/api/handle');

            expect(showErrorMock).toHaveBeenCalledWith('Please fill in all required fields.');
            expect(apiCallMock).not.toHaveBeenCalled();
        });

        test('should execute immediately and handle a successful submission', async () => {
            apiCallMock.mockResolvedValueOnce({
                success: true,
                data: { status: 'ok' }
            });

            const onSuccess = jest.fn();

            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                await window.jPulse.form.handleSubmission(form, '/api/handle', { onSuccess });
            });

            await submitForm();

            expect(apiCallMock).toHaveBeenCalledWith('/api/handle', expect.any(Object));
            expect(onSuccess).toHaveBeenCalledWith({ status: 'ok' }, form);
            expect(showErrorMock).not.toHaveBeenCalled();
        });

        test('should call custom onError handler and NOT show default error on failure', async () => {
            apiCallMock.mockResolvedValueOnce({
                success: false,
                error: 'Custom error reason'
            });

            const onError = jest.fn();

            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                await window.jPulse.form.handleSubmission(form, '/api/handle', { onError });
            });

            await submitForm();

            expect(apiCallMock).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith('Custom error reason', form);
            // Crucially, the default error handler should NOT be called
            expect(showErrorMock).not.toHaveBeenCalled();
        });

        test('should show field-specific errors if provided in the API response', async () => {
            apiCallMock.mockResolvedValueOnce({
                success: false,
                error: 'Validation failed',
                data: {
                    fieldErrors: { username: 'Already taken' }
                }
            });

            const showFieldErrorsMock = jest.spyOn(window.jPulse.form, 'showFieldErrors').mockImplementation(() => {});

            await window.jPulse.form.handleSubmission(form, '/api/handle');

            expect(showFieldErrorsMock).toHaveBeenCalledWith(form, { username: 'Already taken' });
        });
    });
});

// EOF webapp/tests/unit/utils/jpulse-common-form.test.js
