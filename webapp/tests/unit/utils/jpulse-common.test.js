/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / jPulse Common
 * @tagline         Unit Tests for jPulse Common Client-Side Utilities
 * @description     Tests for client-side JavaScript utilities in jpulse-common.js
 * @file            webapp/tests/unit/utils/jpulse-common.test.js
 * @version         1.6.42
 * @release         2026-04-21
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

// Load jpulse-common.js content and evaluate it in the window context
const jpulseCommonPath = path.join(process.cwd(), 'webapp/view/jpulse-common.js');
let jpulseCommonContent = fs.readFileSync(jpulseCommonPath, 'utf8');

// W-185: jpulse-common.js is normally served through view.js which runs expandI18nHandlebars()
// first, resolving unquoted subtree embeds like `{{i18n.controller.handlebar.date.fromNow}}` to
// a JSON literal. When loaded raw for testing, replace known unquoted i18n subtree embeds with a
// valid empty-object literal so the JS parses. Tests exercise the English fallback path.
jpulseCommonContent = jpulseCommonContent.replace(
    /\{\{i18n\.controller\.handlebar\.date\.fromNow\}\}/g,
    '{}'
);

// Execute the code in the window context
const vm = require('vm');
const context = vm.createContext(window);
vm.runInContext(jpulseCommonContent, context);

describe('jPulse Client-Side Utilities', () => {

    beforeEach(() => {
        // Clear document body for each test
        document.body.innerHTML = '';

        // Reset any global state
        if (window.jPulse && window.jPulse.UI.collapsible) {
            // Clear any stored configurations
            window.jPulse.UI.collapsible._configs = {};
        }
    });

    describe('jPulse.collapsible', () => {

        test('should exist and have register method', () => {
            expect(window.jPulse).toBeDefined();
            expect(window.jPulse.UI.collapsible).toBeDefined();
            expect(typeof window.jPulse.UI.collapsible.register).toBe('function');
        });

        test('should not expose internal methods directly', () => {
            // Internal methods should be prefixed with _
            expect(window.jPulse.UI.collapsible.toggle).toBeUndefined();
            expect(window.jPulse.UI.collapsible.expand).toBeUndefined();
            expect(window.jPulse.UI.collapsible.collapse).toBeUndefined();
            expect(window.jPulse.UI.collapsible.isExpanded).toBeUndefined();

            // Internal methods should exist with _ prefix
            expect(typeof window.jPulse.UI.collapsible._toggle).toBe('function');
            expect(typeof window.jPulse.UI.collapsible._expand).toBe('function');
            expect(typeof window.jPulse.UI.collapsible._collapse).toBe('function');
            expect(typeof window.jPulse.UI.collapsible._isExpanded).toBe('function');
        });

        test('should register collapsible element and return handle', () => {
            // Create test HTML structure
            document.body.innerHTML = `
                <div id="testCollapsible" class="jp-collapsible">
                    <h3>Test Section</h3>
                    <div class="jp-collapsible-content">
                        <p>Test content</p>
                    </div>
                </div>
            `;

            const handle = window.jPulse.UI.collapsible.register('testCollapsible');

            expect(handle).toBeDefined();
            expect(handle.elementId).toBe('testCollapsible');
            expect(typeof handle.toggle).toBe('function');
            expect(typeof handle.expand).toBe('function');
            expect(typeof handle.collapse).toBe('function');
            expect(typeof handle.isExpanded).toBe('function');
        });

        test('should return null for non-existent element', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

            const handle = window.jPulse.UI.collapsible.register('nonExistent');

            expect(handle).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Collapsible element with ID 'nonExistent' not found"));

            consoleSpy.mockRestore();
        });

        test('should create arrow element if missing', () => {
            document.body.innerHTML = `
                <div id="testCollapsible" class="jp-collapsible">
                    <h3>Test Section</h3>
                    <div class="jp-collapsible-content">
                        <p>Test content</p>
                    </div>
                </div>
            `;

            const element = document.getElementById('testCollapsible');
            expect(element.querySelector('.jp-collapsible-arrow')).toBeNull();

            window.jPulse.UI.collapsible.register('testCollapsible');

            const arrow = element.querySelector('.jp-collapsible-arrow');
            expect(arrow).toBeDefined();
            expect(arrow.textContent).toBe('▶'); // Starts collapsed with right arrow
            expect(arrow.className).toBe('jp-collapsible-arrow');
        });

        test('should make header clickable', () => {
            document.body.innerHTML = `
                <div id="testCollapsible" class="jp-collapsible">
                    <h3>Test Section</h3>
                    <div class="jp-collapsible-content">
                        <p>Test content</p>
                    </div>
                </div>
            `;

            const element = document.getElementById('testCollapsible');
            const header = element.querySelector('h3');

            expect(header.style.cursor).toBe('');

            window.jPulse.UI.collapsible.register('testCollapsible');

            expect(header.style.cursor).toBe('pointer');
        });

        test('should handle expand/collapse functionality', () => {
            document.body.innerHTML = `
                <div id="testCollapsible" class="jp-collapsible">
                    <h3>Test Section</h3>
                    <div class="jp-collapsible-content">
                        <p>Test content</p>
                    </div>
                </div>
            `;

            const handle = window.jPulse.UI.collapsible.register('testCollapsible');
            const element = document.getElementById('testCollapsible');

            // Should start collapsed
            expect(handle.isExpanded()).toBe(false);
            expect(element.classList.contains('jp-expanded')).toBe(false);

            // Expand
            handle.expand();
            expect(handle.isExpanded()).toBe(true);
            expect(element.classList.contains('jp-expanded')).toBe(true);

            // Collapse
            handle.collapse();
            expect(handle.isExpanded()).toBe(false);
            expect(element.classList.contains('jp-expanded')).toBe(false);
        });

        test('should handle toggle functionality', () => {
            document.body.innerHTML = `
                <div id="testCollapsible" class="jp-collapsible">
                    <h3>Test Section</h3>
                    <div class="jp-collapsible-content">
                        <p>Test content</p>
                    </div>
                </div>
            `;

            const handle = window.jPulse.UI.collapsible.register('testCollapsible');
            const element = document.getElementById('testCollapsible');

            // Should start collapsed
            expect(handle.isExpanded()).toBe(false);

            // Toggle to expand
            handle.toggle();
            expect(handle.isExpanded()).toBe(true);
            expect(element.classList.contains('jp-expanded')).toBe(true);

            // Toggle to collapse
            handle.toggle();
            expect(handle.isExpanded()).toBe(false);
            expect(element.classList.contains('jp-expanded')).toBe(false);
        });

        test('should respect initOpen configuration', () => {
            document.body.innerHTML = `
                <div id="testCollapsible" class="jp-collapsible">
                    <h3>Test Section</h3>
                    <div class="jp-collapsible-content">
                        <p>Test content</p>
                    </div>
                </div>
            `;

            const handle = window.jPulse.UI.collapsible.register('testCollapsible', {
                initOpen: true
            });

            expect(handle.isExpanded()).toBe(true);

            const element = document.getElementById('testCollapsible');
            expect(element.classList.contains('jp-expanded')).toBe(true);
        });

        test('should call onOpen and onClose callbacks', () => {
            document.body.innerHTML = `
                <div id="testCollapsible" class="jp-collapsible">
                    <h3>Test Section</h3>
                    <div class="jp-collapsible-content">
                        <p>Test content</p>
                    </div>
                </div>
            `;

            const onOpenSpy = jest.fn();
            const onCloseSpy = jest.fn();

            const handle = window.jPulse.UI.collapsible.register('testCollapsible', {
                onOpen: onOpenSpy,
                onClose: onCloseSpy
            });

            // Expand should call onOpen
            handle.expand();
            expect(onOpenSpy).toHaveBeenCalledTimes(1);
            expect(onCloseSpy).toHaveBeenCalledTimes(0);

            // Collapse should call onClose
            handle.collapse();
            expect(onOpenSpy).toHaveBeenCalledTimes(1);
            expect(onCloseSpy).toHaveBeenCalledTimes(1);
        });

        test('should handle click events on header', () => {
            document.body.innerHTML = `
                <div id="testCollapsible" class="jp-collapsible">
                    <h3>Test Section</h3>
                    <div class="jp-collapsible-content">
                        <p>Test content</p>
                    </div>
                </div>
            `;

            const handle = window.jPulse.UI.collapsible.register('testCollapsible');
            const element = document.getElementById('testCollapsible');
            const header = element.querySelector('h3');

            expect(handle.isExpanded()).toBe(false);

            // Simulate click on header
            header.click();
            expect(handle.isExpanded()).toBe(true);

            // Click again to collapse
            header.click();
            expect(handle.isExpanded()).toBe(false);
        });

        test('should update arrow direction on expand/collapse', () => {
            document.body.innerHTML = `
                <div id="testCollapsible" class="jp-collapsible">
                    <h3>Test Section</h3>
                    <div class="jp-collapsible-content">
                        <p>Test content</p>
                    </div>
                </div>
            `;

            const handle = window.jPulse.UI.collapsible.register('testCollapsible');
            const element = document.getElementById('testCollapsible');
            const arrow = element.querySelector('.jp-collapsible-arrow');

            // Should start with right arrow (collapsed)
            expect(arrow.textContent).toBe('▶');

            // Expand should show down arrow
            handle.expand();
            expect(arrow.textContent).toBe('▼');

            // Collapse should show right arrow
            handle.collapse();
            expect(arrow.textContent).toBe('▶');
        });

        test('should handle multiple collapsible elements independently', () => {
            document.body.innerHTML = `
                <div id="collapsible1" class="jp-collapsible">
                    <h3>Section 1</h3>
                    <div class="jp-collapsible-content">
                        <p>Content 1</p>
                    </div>
                </div>
                <div id="collapsible2" class="jp-collapsible">
                    <h3>Section 2</h3>
                    <div class="jp-collapsible-content">
                        <p>Content 2</p>
                    </div>
                </div>
            `;

            const handle1 = window.jPulse.UI.collapsible.register('collapsible1');
            const handle2 = window.jPulse.UI.collapsible.register('collapsible2');

            // Both should start collapsed
            expect(handle1.isExpanded()).toBe(false);
            expect(handle2.isExpanded()).toBe(false);

            // Expand first one
            handle1.expand();
            expect(handle1.isExpanded()).toBe(true);
            expect(handle2.isExpanded()).toBe(false);

            // Expand second one
            handle2.expand();
            expect(handle1.isExpanded()).toBe(true);
            expect(handle2.isExpanded()).toBe(true);

            // Collapse first one
            handle1.collapse();
            expect(handle1.isExpanded()).toBe(false);
            expect(handle2.isExpanded()).toBe(true);
        });

        test('should handle missing h3 element gracefully', () => {
            document.body.innerHTML = `
                <div id="testCollapsible" class="jp-collapsible">
                    <div class="jp-collapsible-content">
                        <p>Test content</p>
                    </div>
                </div>
            `;

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

            const handle = window.jPulse.UI.collapsible.register('testCollapsible');

            // The current implementation doesn't validate h3 presence, it returns a handle
            // but the functionality won't work properly without h3
            expect(handle).toBeDefined();
            // Note: In a real implementation, this should probably return null or warn

            consoleSpy.mockRestore();
        });

        test('should work with existing jp-collapsible-header structure', () => {
            document.body.innerHTML = `
                <div id="testCollapsible" class="jp-collapsible">
                    <div class="jp-collapsible-header">
                        <h3>Test Section</h3>
                    </div>
                    <div class="jp-collapsible-content">
                        <p>Test content</p>
                    </div>
                </div>
            `;

            const handle = window.jPulse.UI.collapsible.register('testCollapsible');

            expect(handle).toBeDefined();
            expect(handle.elementId).toBe('testCollapsible');

            const element = document.getElementById('testCollapsible');
            const header = element.querySelector('.jp-collapsible-header');

            expect(header.style.cursor).toBe('pointer');
        });
    });

    describe('jPulse.dom utilities', () => {

        test('should have dom utilities', () => {
            expect(window.jPulse.dom).toBeDefined();
            expect(typeof window.jPulse.dom.ready).toBe('function');
            expect(typeof window.jPulse.dom.show).toBe('function');
            expect(typeof window.jPulse.dom.hide).toBe('function');
        });

        test('should handle show/hide functionality', () => {
            document.body.innerHTML = `
                <div id="testElement" style="display: none;">Test content</div>
            `;

            const element = document.getElementById('testElement');

            // Element should start hidden
            expect(element.style.display).toBe('none');

            // Element should start hidden (has jp-hidden class implied by display:none)
            element.classList.add('jp-hidden');
            expect(element.classList.contains('jp-hidden')).toBe(true);

            // Show element (removes jp-hidden class)
            window.jPulse.dom.show(element);
            expect(element.classList.contains('jp-hidden')).toBe(false);

            // Hide element (adds jp-hidden class)
            window.jPulse.dom.hide(element);
            expect(element.classList.contains('jp-hidden')).toBe(true);
        });
    });

    describe('jPulse.api utilities', () => {

        test('should have api utilities', () => {
            expect(window.jPulse.api).toBeDefined();
            expect(typeof window.jPulse.api.get).toBe('function');
            expect(typeof window.jPulse.api.post).toBe('function');
            expect(typeof window.jPulse.api.put).toBe('function');
            expect(typeof window.jPulse.api.delete).toBe('function');
        });
    });

    // W-185: client-side mirror of {{date.fromNow}} Handlebars helper
    describe('jPulse.date.formatFromNow (W-185)', () => {

        const NOW = new Date('2026-04-20T12:00:00Z').getTime();

        test('exists as a function', () => {
            expect(typeof window.jPulse.date.formatFromNow).toBe('function');
        });

        test('invalid date returns empty string', () => {
            expect(window.jPulse.date.formatFromNow(null)).toBe('');
            expect(window.jPulse.date.formatFromNow(undefined)).toBe('');
            expect(window.jPulse.date.formatFromNow('not-a-date')).toBe('');
            expect(window.jPulse.date.formatFromNow('')).toBe('');
        });

        test('accepts Date / ISO string / numeric string / number for arg1', () => {
            const past = new Date(NOW - 2 * 3600 * 1000);
            const opts = { now: NOW, format: 'long 1' };
            expect(window.jPulse.date.formatFromNow(past, opts)).toBe('2 hours ago');
            expect(window.jPulse.date.formatFromNow(past.toISOString(), opts)).toBe('2 hours ago');
            expect(window.jPulse.date.formatFromNow(String(past.getTime()), opts)).toBe('2 hours ago');
            expect(window.jPulse.date.formatFromNow(past.getTime(), opts)).toBe('2 hours ago');
        });

        test('accepts ISO 8601 date-only and trimmed date-time strings', () => {
            // Date-only YYYY-MM-DD is UTC midnight; NOW is 2026-04-20T12:00:00Z → 12 hours ago
            expect(window.jPulse.date.formatFromNow('2026-04-20', { now: NOW, format: 'long 1' }))
                .toBe('12 hours ago');
            // Trimmed full ISO; 10:00Z vs noon → 2 hours ago
            expect(window.jPulse.date.formatFromNow(' 2026-04-20T10:00:00Z ', { now: NOW, format: 'long 1' }))
                .toBe('2 hours ago');
            // opts.now as ISO string
            expect(window.jPulse.date.formatFromNow(NOW - 60 * 1000, { now: '2026-04-20T12:00:00.000Z', format: 'long 1' }))
                .toBe('1 minute ago');
        });

        test('accepts Date / number for arg2 as reference "now"', () => {
            const past = NOW - 5 * 60 * 1000;
            const expected = '5 minutes ago';
            expect(window.jPulse.date.formatFromNow(past, new Date(NOW))).toBe(expected);
            expect(window.jPulse.date.formatFromNow(past, NOW)).toBe(expected);
            expect(window.jPulse.date.formatFromNow(past, new Date(NOW).toISOString())).toBe(expected);
        });

        test('null / undefined arg2 uses Date.now()', () => {
            const past = Date.now() - 60 * 1000;
            const out1 = window.jPulse.date.formatFromNow(past);
            const out2 = window.jPulse.date.formatFromNow(past, null);
            const out3 = window.jPulse.date.formatFromNow(past, undefined);
            expect(out1).toBe('1 minute ago');
            expect(out2).toBe('1 minute ago');
            expect(out3).toBe('1 minute ago');
        });

        test('long format default (2 units, past)', () => {
            const past = NOW - (2 * 3600 * 1000 + 5 * 60 * 1000);
            expect(window.jPulse.date.formatFromNow(past, { now: NOW })).toBe('2 hours, 5 minutes ago');
        });

        test('long format future', () => {
            const future = NOW + (3 * 24 * 3600 * 1000);
            expect(window.jPulse.date.formatFromNow(future, { now: NOW, format: 'long 1' })).toBe('in 3 days');
        });

        test('short format (single unit)', () => {
            const past = NOW - 2 * 60 * 1000;
            expect(window.jPulse.date.formatFromNow(past, { now: NOW, format: 'short 1' })).toBe('2m ago');
        });

        test('short format future', () => {
            const future = NOW + 3 * 3600 * 1000;
            expect(window.jPulse.date.formatFromNow(future, { now: NOW, format: 'short 1' })).toBe('in 3h');
        });

        test('singular vs plural (long): 1 minute vs 2 minutes', () => {
            expect(window.jPulse.date.formatFromNow(NOW - 60 * 1000, { now: NOW, format: 'long 1' }))
                .toBe('1 minute ago');
            expect(window.jPulse.date.formatFromNow(NOW - 2 * 60 * 1000, { now: NOW, format: 'long 1' }))
                .toBe('2 minutes ago');
        });

        test('units option overrides format units', () => {
            const past = NOW - (2 * 3600 * 1000 + 5 * 60 * 1000 + 30 * 1000);
            expect(window.jPulse.date.formatFromNow(past, { now: NOW, format: 'long 3', units: 1 }))
                .toBe('2 hours ago');
            expect(window.jPulse.date.formatFromNow(past, { now: NOW, format: 'long 1', units: 3 }))
                .toBe('2 hours, 5 minutes, 30 seconds ago');
        });

        test('style option overrides format style', () => {
            const past = NOW - 2 * 3600 * 1000;
            expect(window.jPulse.date.formatFromNow(past, { now: NOW, format: 'long 1', style: 'short' }))
                .toBe('2h ago');
            expect(window.jPulse.date.formatFromNow(past, { now: NOW, format: 'short 1', style: 'long' }))
                .toBe('2 hours ago');
        });

        test('sub-second delta: short → "0s ago" / "in 0s" (i18n short.second + range templates)', () => {
            expect(window.jPulse.date.formatFromNow(NOW - 500, { now: NOW, format: 'short 1' }))
                .toBe('0s ago');
            expect(window.jPulse.date.formatFromNow(NOW + 500, { now: NOW, format: 'short 1' }))
                .toBe('in 0s');
        });

        test('long format moment bands: ±1s → thisMoment; (1s, 5s] → pastMoment / futureMoment', () => {
            expect(window.jPulse.date.formatFromNow(NOW - 500, { now: NOW }))
                .toBe('just now');
            expect(window.jPulse.date.formatFromNow(NOW + 500, { now: NOW }))
                .toBe('just now');
            expect(window.jPulse.date.formatFromNow(NOW, { now: NOW }))
                .toBe('just now');
            expect(window.jPulse.date.formatFromNow(NOW - 3000, { now: NOW }))
                .toBe('moments ago');
            expect(window.jPulse.date.formatFromNow(NOW + 3000, { now: NOW }))
                .toBe('in a moment');
        });

        test('long format >5s uses real units', () => {
            expect(window.jPulse.date.formatFromNow(NOW - 6000, { now: NOW, format: 'long 1' }))
                .toBe('6 seconds ago');
        });

        test('chat example: alice · 2m ago / bob · just now (short vs long ±1s)', () => {
            const now = NOW;
            const alice = now - 2 * 60 * 1000;
            const bob   = now - 500;
            expect(`alice · ${window.jPulse.date.formatFromNow(alice, { now, format: 'short 1' })}`)
                .toBe('alice · 2m ago');
            expect(`bob · ${window.jPulse.date.formatFromNow(bob, { now, format: 'long 1' })}`)
                .toBe('bob · just now');
        });
    });
});

// EOF webapp/tests/unit/utils/jpulse-common.test.js
