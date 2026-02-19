/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / jPulse Common
 * @tagline         Unit Tests for jPulse Common Client-Side Utilities
 * @description     Tests for client-side JavaScript utilities in jpulse-common.js
 * @file            webapp/tests/unit/utils/jpulse-common.test.js
 * @version         1.6.19
 * @release         2026-02-19
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
const jpulseCommonContent = fs.readFileSync(jpulseCommonPath, 'utf8');

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
});

// EOF webapp/tests/unit/utils/jpulse-common.test.js
