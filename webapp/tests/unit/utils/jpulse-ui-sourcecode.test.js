/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / jPulse UI Source Code
 * @tagline         Unit Tests for jPulse.UI.sourceCode and jPulse.clipboard (W-063)
 * @description     Tests for client-side source code widget and clipboard functionality
 * @file            webapp/tests/unit/utils/jpulse-ui-sourcecode.test.js
 * @version         1.0.0-rc.2
 * @release         2025-10-27
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           80%, Cursor 1.2, Claude Sonnet 4
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

// Set up DOM environment
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

// Mock clipboard API
global.navigator.clipboard = {
    writeText: jest.fn().mockResolvedValue(undefined)
};

// Mock document.execCommand for fallback clipboard functionality
global.document.execCommand = jest.fn().mockReturnValue(true);

// Mock Prism.js
global.window.Prism = {
    highlightElement: jest.fn(),
    highlightAllUnder: jest.fn()
};

// Load jpulse-common.js content and evaluate it in the window context
const jpulseCommonPath = path.join(process.cwd(), 'webapp/view/jpulse-common.js');
const jpulseCommonContent = fs.readFileSync(jpulseCommonPath, 'utf8');

// Execute the code in the window context
const vm = require('vm');
const context = vm.createContext(window);
vm.runInContext(jpulseCommonContent, context);

describe('jPulse.clipboard (W-063)', () => {

    beforeEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    test('should exist and have copy method', () => {
        expect(window.jPulse).toBeDefined();
        expect(window.jPulse.clipboard).toBeDefined();
        expect(typeof window.jPulse.clipboard.copy).toBe('function');
    });

    test('should copy text to clipboard using modern API', async () => {
        const testText = 'Hello, World!';

        const result = await window.jPulse.clipboard.copy(testText);

        expect(result).toBe(true);
        // In test environment, it falls back to execCommand
        expect(document.execCommand).toHaveBeenCalledWith('copy');
    });

    test('should handle clipboard API failure gracefully', async () => {
        navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard access denied'));

        const result = await window.jPulse.clipboard.copy('test');

        // Should fall back to execCommand and succeed
        expect(result).toBe(true);
        expect(document.execCommand).toHaveBeenCalledWith('copy');
    });

    test('should handle empty text', async () => {
        const result = await window.jPulse.clipboard.copy('');

        expect(result).toBe(true);
        // In test environment, it falls back to execCommand
        expect(document.execCommand).toHaveBeenCalledWith('copy');
    });

    test('should handle null/undefined text', async () => {
        const result1 = await window.jPulse.clipboard.copy(null);
        const result2 = await window.jPulse.clipboard.copy(undefined);

        expect(result1).toBe(true);
        expect(result2).toBe(true);
        // In test environment, it falls back to execCommand
        expect(document.execCommand).toHaveBeenCalled();
    });

    test('should use fallback when clipboard API not available', async () => {
        // Temporarily remove clipboard API
        const originalClipboard = navigator.clipboard;
        delete navigator.clipboard;

        const result = await window.jPulse.clipboard.copy('fallback test');

        expect(result).toBe(true);
        expect(document.execCommand).toHaveBeenCalledWith('copy');

        // Restore clipboard API
        navigator.clipboard = originalClipboard;
    });
});

describe('jPulse.UI.sourceCode (W-063)', () => {

    beforeEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    test('should exist and have required methods', () => {
        expect(window.jPulse.UI.sourceCode).toBeDefined();
        expect(typeof window.jPulse.UI.sourceCode.init).toBe('function');
        expect(typeof window.jPulse.UI.sourceCode.initAll).toBe('function');
    });

    test('should initialize source code block with basic setup', () => {
        document.body.innerHTML = `
            <div class="jp-source-code" data-lang="js">
                <pre><code>console.log('Hello, World!');</code></pre>
            </div>
        `;

        const element = document.querySelector('.jp-source-code');
        window.jPulse.UI.sourceCode.init(element);

        // Should add copy button
        expect(element.querySelector('.jp-copy-btn')).toBeTruthy();

        // Should add language class to code element
        const codeElement = element.querySelector('code');
        expect(codeElement.classList.contains('language-js')).toBe(true);
    });

    test('should show language label when data-show-lang="true"', () => {
        document.body.innerHTML = `
            <div class="jp-source-code" data-lang="javascript" data-show-lang="true">
                <pre><code>const x = 42;</code></pre>
            </div>
        `;

        const element = document.querySelector('.jp-source-code');
        window.jPulse.UI.sourceCode.init(element);

        const langLabel = element.querySelector('.jp-lang-label');
        expect(langLabel).toBeTruthy();
        expect(langLabel.textContent).toBe('JAVASCRIPT');
    });

    test('should not show language label by default', () => {
        document.body.innerHTML = `
            <div class="jp-source-code" data-lang="python">
                <pre><code>print("Hello")</code></pre>
            </div>
        `;

        const element = document.querySelector('.jp-source-code');
        window.jPulse.UI.sourceCode.init(element);

        expect(element.querySelector('.jp-lang-label')).toBeFalsy();
    });

    test('should hide copy button when data-show-copy="false"', () => {
        document.body.innerHTML = `
            <div class="jp-source-code" data-lang="html" data-show-copy="false">
                <pre><code>&lt;div&gt;Test&lt;/div&gt;</code></pre>
            </div>
        `;

        const element = document.querySelector('.jp-source-code');
        window.jPulse.UI.sourceCode.init(element);

        expect(element.querySelector('.jp-copy-btn')).toBeFalsy();
    });

    test('should handle copy button click', async () => {
        document.body.innerHTML = `
            <div class="jp-source-code" data-lang="css">
                <pre><code>.test { color: red; }</code></pre>
            </div>
        `;

        const element = document.querySelector('.jp-source-code');
        window.jPulse.UI.sourceCode.init(element);

        const copyBtn = element.querySelector('.jp-copy-btn');
        expect(copyBtn).toBeTruthy();

        // Simulate click
        copyBtn.click();

        // Should have called clipboard copy (falls back to execCommand in test)
        expect(document.execCommand).toHaveBeenCalledWith('copy');
    });

    test('should initialize all source code blocks with initAll', () => {
        document.body.innerHTML = `
            <div class="jp-source-code" data-lang="js">
                <pre><code>console.log('Block 1');</code></pre>
            </div>
            <div class="jp-source-code" data-lang="html">
                <pre><code>&lt;p&gt;Block 2&lt;/p&gt;</code></pre>
            </div>
        `;

        window.jPulse.UI.sourceCode.initAll();

        const blocks = document.querySelectorAll('.jp-source-code');
        expect(blocks).toHaveLength(2);

        // Both should have copy buttons
        expect(blocks[0].querySelector('.jp-copy-btn')).toBeTruthy();
        expect(blocks[1].querySelector('.jp-copy-btn')).toBeTruthy();

        // Both should have language classes
        expect(blocks[0].querySelector('code').classList.contains('language-js')).toBe(true);
        expect(blocks[1].querySelector('code').classList.contains('language-html')).toBe(true);
    });

    test('should handle missing pre/code elements gracefully', () => {
        document.body.innerHTML = `
            <div class="jp-source-code" data-lang="js">
                <p>Not a code block</p>
            </div>
        `;

        const element = document.querySelector('.jp-source-code');

        // Should not throw error
        expect(() => {
            window.jPulse.UI.sourceCode.init(element);
        }).not.toThrow();
    });

    test('should call Prism.highlightElement when available', () => {
        document.body.innerHTML = `
            <div class="jp-source-code" data-lang="js">
                <pre><code>const test = true;</code></pre>
            </div>
        `;

        const element = document.querySelector('.jp-source-code');
        window.jPulse.UI.sourceCode.init(element);

        const codeElement = element.querySelector('code');
        expect(window.Prism.highlightElement).toHaveBeenCalledWith(codeElement);
    });

    test('should handle different language mappings', () => {
        const testCases = [
            { input: 'javascript', expected: 'JAVASCRIPT' },
            { input: 'js', expected: 'JS' },
            { input: 'html', expected: 'HTML' },
            { input: 'css', expected: 'CSS' },
            { input: 'python', expected: 'PYTHON' },
            { input: 'unknown', expected: 'UNKNOWN' }
        ];

        testCases.forEach(({ input, expected }) => {
            document.body.innerHTML = `
                <div class="jp-source-code" data-lang="${input}" data-show-lang="true">
                    <pre><code>test code</code></pre>
                </div>
            `;

            const element = document.querySelector('.jp-source-code');
            window.jPulse.UI.sourceCode.init(element);

            const langLabel = element.querySelector('.jp-lang-label');
            expect(langLabel.textContent).toBe(expected);
        });
    });

    test('should preserve existing code content', () => {
        const originalCode = 'function test() {\n    return "hello";\n}';

        document.body.innerHTML = `
            <div class="jp-source-code" data-lang="js">
                <pre><code>${originalCode}</code></pre>
            </div>
        `;

        const element = document.querySelector('.jp-source-code');
        window.jPulse.UI.sourceCode.init(element);

        const codeElement = element.querySelector('code');
        expect(codeElement.textContent).toBe(originalCode);
    });
});

describe('Integration Tests', () => {

    beforeEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    test('should work together - source code widget with clipboard', async () => {
        document.body.innerHTML = `
            <div class="jp-source-code" data-lang="js" data-show-lang="true">
                <pre><code>const message = "Hello, jPulse!";</code></pre>
            </div>
        `;

        // Initialize source code widget
        window.jPulse.UI.sourceCode.initAll();

        const element = document.querySelector('.jp-source-code');
        const copyBtn = element.querySelector('.jp-copy-btn');
        const langLabel = element.querySelector('.jp-lang-label');

        // Verify setup
        expect(copyBtn).toBeTruthy();
        expect(langLabel).toBeTruthy();
        expect(langLabel.textContent).toBe('JS');

        // Test copy functionality
        copyBtn.click();

        expect(document.execCommand).toHaveBeenCalledWith('copy');
    });

    test('should handle DOM ready initialization', () => {
        document.body.innerHTML = `
            <div class="jp-source-code" data-lang="html">
                <pre><code>&lt;div class="test"&gt;Content&lt;/div&gt;</code></pre>
            </div>
        `;

        // Simulate DOM ready event
        const domReadyEvent = new Event('DOMContentLoaded');
        document.dispatchEvent(domReadyEvent);

        // Should auto-initialize
        const element = document.querySelector('.jp-source-code');
        expect(element.querySelector('.jp-copy-btn')).toBeTruthy();
    });
});

// EOF webapp/tests/unit/utils/jpulse-ui-sourcecode.test.js
