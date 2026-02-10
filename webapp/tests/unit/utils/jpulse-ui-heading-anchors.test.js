/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / jPulse UI Heading Anchors
 * @tagline         Unit Tests for jPulse.UI.headingAnchors (W-118)
 * @description     Tests for heading anchor links feature: slugify, ID generation, link creation
 * @file            webapp/tests/unit/utils/jpulse-ui-heading-anchors.test.js
 * @version         1.6.13
 * @release         2026-02-10
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
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
global.KeyboardEvent = dom.window.KeyboardEvent;

// Mock clipboard API
global.navigator.clipboard = {
    writeText: jest.fn().mockResolvedValue(undefined)
};

// Mock i18n for testing
global.window.i18n = {
    view: {
        ui: {
            headingAnchor: {
                linkCopied: 'Link copied to clipboard',
                linkFailed: 'Failed to copy link',
                linkToSection: 'Link to %SECTION%',
                copyLinkTitle: 'Copy link to clipboard'
            }
        }
    }
};

// Mock toast - must be set up before loading jpulse-common.js
global.window.jPulse = {
    UI: {
        toast: {
            show: jest.fn()
        }
    }
};

// Load jpulse-common.js content and evaluate it in the window context
const jpulseCommonPath = path.join(process.cwd(), 'webapp/view/jpulse-common.js');
let jpulseCommonContent = fs.readFileSync(jpulseCommonPath, 'utf8');

// Replace Handlebars i18n template strings with actual values for testing
jpulseCommonContent = jpulseCommonContent.replace(/\{\{i18n\.view\.ui\.headingAnchor\.linkCopied\}\}/g, 'Link copied to clipboard');
jpulseCommonContent = jpulseCommonContent.replace(/\{\{i18n\.view\.ui\.headingAnchor\.linkFailed\}\}/g, 'Failed to copy link');
jpulseCommonContent = jpulseCommonContent.replace(/\{\{i18n\.view\.ui\.headingAnchor\.linkToSection\}\}/g, 'Link to %SECTION%');
jpulseCommonContent = jpulseCommonContent.replace(/\{\{i18n\.view\.ui\.headingAnchor\.copyLinkTitle\}\}/g, 'Copy link to clipboard');

// Execute the code in the window context
const vm = require('vm');
const context = vm.createContext(window);
vm.runInContext(jpulseCommonContent, context);

// Re-assign toast mock after jpulse-common.js loads (it may overwrite our mock)
if (window.jPulse?.UI?.toast) {
    window.jPulse.UI.toast.show = jest.fn();
}

describe('jPulse.UI.headingAnchors (W-118)', () => {

    beforeEach(() => {
        // Clear document body for each test
        document.body.innerHTML = '';
        // Reset clipboard mock
        if (navigator.clipboard?.writeText?.mockClear) {
            navigator.clipboard.writeText.mockClear();
        }
        // Ensure toast mock exists and reset it
        if (window.jPulse?.UI?.toast) {
            if (typeof window.jPulse.UI.toast.show.mockClear === 'function') {
                window.jPulse.UI.toast.show.mockClear();
            } else {
                // Re-create as jest mock if it was overwritten
                window.jPulse.UI.toast.show = jest.fn();
            }
        }
        // Reset headingAnchors config to defaults for each test
        // headingAnchors is defined by jpulse-common.js which is loaded before tests
        window.jPulse.UI.headingAnchors._config = {
            enabled: true,
            levels: [1, 2, 3, 4, 5, 6],
            icon: '🔗'
        };
        window.jPulse.UI.headingAnchors._initialized = false;
    });

    afterEach(() => {
        // Clean up
        document.body.innerHTML = '';
    });

    describe('_slugify function', () => {
        test('should convert simple text to slug', () => {
            const result = window.jPulse.UI.headingAnchors._slugify('Framework Architecture');
            expect(result).toBe('framework-architecture');
        });

        test('should handle lowercase conversion', () => {
            const result = window.jPulse.UI.headingAnchors._slugify('HELLO WORLD');
            expect(result).toBe('hello-world');
        });

        test('should replace spaces with hyphens', () => {
            const result = window.jPulse.UI.headingAnchors._slugify('Multiple   Spaces');
            expect(result).toBe('multiple-spaces');
        });

        test('should remove punctuation', () => {
            const result = window.jPulse.UI.headingAnchors._slugify("What's New?");
            expect(result).toBe('whats-new');
        });

        test('should handle special characters', () => {
            const result = window.jPulse.UI.headingAnchors._slugify('Test & Example (v1.0)');
            expect(result).toBe('test-example-v10');
        });

        test('should preserve Unicode characters', () => {
            const result = window.jPulse.UI.headingAnchors._slugify('日本語');
            expect(result).toBe('日本語');
        });

        test('should handle mixed Unicode and ASCII', () => {
            const result = window.jPulse.UI.headingAnchors._slugify('日本語文章はOKです');
            expect(result).toBe('日本語文章はokです');
        });

        test('should trim leading and trailing hyphens', () => {
            const result = window.jPulse.UI.headingAnchors._slugify('---Test---');
            expect(result).toBe('test');
        });

        test('should collapse multiple hyphens', () => {
            const result = window.jPulse.UI.headingAnchors._slugify('Test---Example');
            expect(result).toBe('test-example');
        });

        test('should handle empty string', () => {
            const result = window.jPulse.UI.headingAnchors._slugify('');
            expect(result).toBe('');
        });

        test('should handle only punctuation', () => {
            const result = window.jPulse.UI.headingAnchors._slugify('***');
            expect(result).toBe('');
        });
    });

    describe('ID generation (_ensureHeadingIds)', () => {
        test('should generate IDs for headings without IDs', () => {
            document.body.innerHTML = '<h1>Test Heading</h1><h2>Another Heading</h2>';

            window.jPulse.UI.headingAnchors.init({ enabled: true, levels: [1, 2] });

            const h1 = document.querySelector('h1');
            const h2 = document.querySelector('h2');
            expect(h1.id).toBe('test-heading');
            expect(h2.id).toBe('another-heading');
        });

        test('should skip headings that already have IDs', () => {
            document.body.innerHTML = '<h1 id="custom-id">Test Heading</h1>';

            window.jPulse.UI.headingAnchors.init({ enabled: true, levels: [1] });

            const h1 = document.querySelector('h1');
            expect(h1.id).toBe('custom-id');
        });

        test('should handle duplicate headings with suffix', () => {
            document.body.innerHTML = '<h2>Overview</h2><h2>Overview</h2><h2>Overview</h2>';

            window.jPulse.UI.headingAnchors.init({ enabled: true, levels: [2] });

            const headings = document.querySelectorAll('h2');
            expect(headings[0].id).toBe('overview');
            expect(headings[1].id).toBe('overview-1');
            expect(headings[2].id).toBe('overview-2');
        });

        test('should handle ID conflicts with non-heading elements', () => {
            document.body.innerHTML = '<div id="settings"></div><h2>Settings</h2>';

            window.jPulse.UI.headingAnchors.init({ enabled: true, levels: [2] });

            const h2 = document.querySelector('h2');
            expect(h2.id).toBe('settings-1');
        });

        test('should respect configured heading levels', () => {
            document.body.innerHTML = '<h1>Level 1</h1><h2>Level 2</h2><h3>Level 3</h3>';

            window.jPulse.UI.headingAnchors.init({ enabled: true, levels: [1, 3] });

            const h1 = document.querySelector('h1');
            const h2 = document.querySelector('h2');
            const h3 = document.querySelector('h3');
            expect(h1.id).toBe('level-1');
            expect(h2.id).toBe(''); // Should not have ID
            expect(h3.id).toBe('level-3');
        });

        test('should skip empty slugs', () => {
            document.body.innerHTML = '<h1>***</h1>';

            window.jPulse.UI.headingAnchors.init({ enabled: true, levels: [1] });

            const h1 = document.querySelector('h1');
            expect(h1.id).toBe('');
        });
    });

    describe('Anchor link creation (_addLinks)', () => {
        test('should create anchor links for headings with IDs', () => {
            document.body.innerHTML = '<h1 id="test-heading">Test Heading</h1>';

            window.jPulse.UI.headingAnchors.init({ enabled: true, levels: [1], icon: '🔗' });

            const anchor = document.querySelector('.heading-anchor');
            expect(anchor).toBeTruthy();
            // In JSDOM, href resolves to full URL, so check getAttribute instead
            expect(anchor.getAttribute('href')).toBe('#test-heading');
            expect(anchor.innerHTML).toBe('🔗');
        });

        test('should use custom icon from config', () => {
            document.body.innerHTML = '<h1 id="test">Test</h1>';

            window.jPulse.UI.headingAnchors.init({ enabled: true, levels: [1], icon: '#' });

            const anchor = document.querySelector('.heading-anchor');
            expect(anchor.innerHTML).toBe('#');
        });

        test('should set aria-label with heading text', () => {
            document.body.innerHTML = '<h1 id="test-heading">My Heading</h1>';

            window.jPulse.UI.headingAnchors.init({ enabled: true, levels: [1] });

            const anchor = document.querySelector('.heading-anchor');
            expect(anchor.getAttribute('aria-label')).toBe('Link to My Heading');
        });

        test('should set title attribute', () => {
            document.body.innerHTML = '<h1 id="test">Test</h1>';

            window.jPulse.UI.headingAnchors.init({ enabled: true, levels: [1] });

            const anchor = document.querySelector('.heading-anchor');
            expect(anchor.getAttribute('title')).toBe('Copy link to clipboard');
        });

        test('should not create duplicate anchor links', () => {
            document.body.innerHTML = '<h1 id="test">Test</h1>';

            window.jPulse.UI.headingAnchors.init({ enabled: true, levels: [1] });
            window.jPulse.UI.headingAnchors.init({ enabled: true, levels: [1] });

            const anchors = document.querySelectorAll('.heading-anchor');
            expect(anchors.length).toBe(1);
        });

        test('should create anchor links for headings that get IDs generated', () => {
            document.body.innerHTML = '<h1>No ID</h1>';

            window.jPulse.UI.headingAnchors.init({ enabled: true, levels: [1] });

            // The heading should get an ID generated, and then an anchor link created
            const h1 = document.querySelector('h1');
            const anchor = document.querySelector('.heading-anchor');
            expect(h1.id).toBe('no-id');
            expect(anchor).toBeTruthy();
            expect(anchor.getAttribute('href')).toBe('#no-id');
        });
    });

    describe('Click behavior', () => {
        test('should update URL hash on click', async () => {
            document.body.innerHTML = '<h1 id="test-heading">Test</h1>';

            window.jPulse.UI.headingAnchors.init({ enabled: true, levels: [1] });

            const anchor = document.querySelector('.heading-anchor');
            anchor.click();

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(window.location.hash).toBe('#test-heading');
        });

        test('should copy URL to clipboard on click', async () => {
            document.body.innerHTML = '<h1 id="test-heading">Test</h1>';

            window.jPulse.UI.headingAnchors.init({ enabled: true, levels: [1] });

            const anchor = document.querySelector('.heading-anchor');
            anchor.click();

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            // URL includes trailing slash (correct behavior)
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://localhost:8080/#test-heading');
        });

        test('should show success toast on successful copy', async () => {
            document.body.innerHTML = '<h1 id="test">Test</h1>';

            window.jPulse.UI.headingAnchors.init({ enabled: true, levels: [1] });

            const anchor = document.querySelector('.heading-anchor');
            anchor.click();

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(window.jPulse.UI.toast.show).toHaveBeenCalledWith(
                'Link copied to clipboard',
                'success',
                { duration: 2000 }
            );
        });

        test('should show error toast on clipboard failure', async () => {
            document.body.innerHTML = '<h1 id="test">Test</h1>';

            // Mock clipboard failure
            navigator.clipboard.writeText.mockRejectedValueOnce(new Error('Clipboard error'));

            window.jPulse.UI.headingAnchors.init({ enabled: true, levels: [1] });

            const anchor = document.querySelector('.heading-anchor');
            anchor.click();

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(window.jPulse.UI.toast.show).toHaveBeenCalledWith(
                expect.stringContaining('Failed to copy link'),
                'info',
                { duration: 5000 }
            );
        });
    });

    describe('Configuration', () => {
        test('should respect enabled: false', () => {
            document.body.innerHTML = '<h1>Test</h1>';

            window.jPulse.UI.headingAnchors.init({ enabled: false, levels: [1] });

            const h1 = document.querySelector('h1');
            const anchor = document.querySelector('.heading-anchor');
            expect(h1.id).toBe('');
            expect(anchor).toBeNull();
        });

        test('should use default config when options not provided', () => {
            document.body.innerHTML = '<h1>Test</h1>';

            window.jPulse.UI.headingAnchors.init();

            const h1 = document.querySelector('h1');
            expect(h1.id).toBe('test');
        });

        test('should merge partial config with defaults', () => {
            document.body.innerHTML = '<h1>Test</h1><h2>Test 2</h2>';

            window.jPulse.UI.headingAnchors.init({ levels: [1] });

            const h1 = document.querySelector('h1');
            const h2 = document.querySelector('h2');
            expect(h1.id).toBe('test');
            expect(h2.id).toBe(''); // h2 not in levels
        });
    });

    describe('Edge cases', () => {
        test('should handle very long headings', () => {
            const longText = 'A'.repeat(200);
            document.body.innerHTML = `<h1>${longText}</h1>`;

            window.jPulse.UI.headingAnchors.init({ enabled: true, levels: [1] });

            const h1 = document.querySelector('h1');
            expect(h1.id.length).toBeGreaterThan(0);
            // Should not throw or truncate
        });

        test('should handle headings with only whitespace', () => {
            document.body.innerHTML = '<h1>   </h1>';

            window.jPulse.UI.headingAnchors.init({ enabled: true, levels: [1] });

            const h1 = document.querySelector('h1');
            expect(h1.id).toBe('');
        });

        test('should handle complex Unicode headings', () => {
            document.body.innerHTML = '<h1>日本語のテストはOKですか?</h1>';

            window.jPulse.UI.headingAnchors.init({ enabled: true, levels: [1] });

            const h1 = document.querySelector('h1');
            expect(h1.id).toBe('日本語のテストはokですか');
        });
    });
});

// EOF webapp/tests/unit/utils/jpulse-ui-heading-anchors.test.js
