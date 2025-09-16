/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / jPulse UI Widgets
 * @tagline         Unit Tests for jPulse.UI Dialog and Accordion Widgets (W-048)
 * @description     Tests for client-side UI widgets: alertDialog, infoDialog, accordion
 * @file            webapp/tests/unit/utils/jpulse-ui-widgets.test.js
 * @version         0.7.6
 * @release         2025-09-16
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
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

// Mock i18n for testing
global.window.i18n = {
    view: {
        ui: {
            alertDialog: {
                title: 'Alert',
                oKButton: 'OK'
            },
            infoDialog: {
                title: 'Information',
                oKButton: 'OK'
            }
        }
    }
};

// Load jpulse-common.js content and evaluate it in the window context
const jpulseCommonPath = path.join(process.cwd(), 'webapp/view/jpulse-common.js');
const jpulseCommonContent = fs.readFileSync(jpulseCommonPath, 'utf8');

// Execute the code in the window context
const vm = require('vm');
const context = vm.createContext(window);
vm.runInContext(jpulseCommonContent, context);

describe('jPulse.UI Dialog Widgets (W-048)', () => {

    beforeEach(() => {
        // Clear document body for each test
        document.body.innerHTML = '';

        // Reset dialog stack
        if (window.jPulse && window.jPulse.UI) {
            window.jPulse.UI._dialogStack = [];
        }

        // Clear any existing timers
        jest.clearAllTimers();
    });

    afterEach(() => {
        // Clean up any remaining dialogs
        const overlays = document.querySelectorAll('.jp-dialog-overlay');
        overlays.forEach(overlay => overlay.remove());
    });

    describe('Alert Dialog', () => {
        test('should create alert dialog with correct structure', async () => {
            const dialogPromise = window.jPulse.UI.alertDialog('Test alert message');

            // Check if dialog was created
            const overlay = document.querySelector('.jp-dialog-overlay');
            expect(overlay).toBeTruthy();

            const dialog = overlay.querySelector('.jp-dialog');
            expect(dialog).toBeTruthy();
            expect(dialog.classList.contains('jp-dialog-alert')).toBe(true);

            // Check header
            const header = dialog.querySelector('.jp-dialog-header');
            expect(header).toBeTruthy();
            expect(header.classList.contains('jp-dialog-header-alert')).toBe(true);

            const title = header.querySelector('.jp-dialog-title');
            expect(title.textContent).toBe('Alert');

            // Check content
            const message = dialog.querySelector('.jp-dialog-message');
            expect(message.textContent).toBe('Test alert message');

            // Check button
            const button = dialog.querySelector('.jp-dialog-btn');
            expect(button).toBeTruthy();
            expect(button.textContent).toBe('OK');

            // Close dialog
            button.click();
            await dialogPromise;
        });

        test('should support custom title and options', async () => {
            const dialogPromise = window.jPulse.UI.alertDialog('Custom message', {
                title: 'Custom Alert',
                minWidth: 500
            });

            const dialog = document.querySelector('.jp-dialog');
            const title = dialog.querySelector('.jp-dialog-title');
            expect(title.textContent).toBe('Custom Alert');

            // Check custom styling
            expect(dialog.style.minWidth).toBe('500px');

            // Close dialog
            const button = dialog.querySelector('.jp-dialog-btn');
            button.click();
            await dialogPromise;
        });

        test('should support raw HTML content', async () => {
            const dialogPromise = window.jPulse.UI.alertDialog('<script>alert("xss")</script><b>Bold</b> and <i>italic</i>');
            
            const message = document.querySelector('.jp-dialog-message');
            // No sanitization - raw HTML is preserved
            expect(message.innerHTML).toBe('<script>alert("xss")</script><b>Bold</b> and <i>italic</i>');
            expect(message.innerHTML).toContain('<script>');

            // Close dialog
            const button = document.querySelector('.jp-dialog-btn');
            button.click();
            await dialogPromise;
        });

        test('should handle ESC key to close dialog', async () => {
            const dialogPromise = window.jPulse.UI.alertDialog('Test message');

            // Simulate ESC key press
            const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escEvent);

            await dialogPromise;

            // Wait for animation to complete (300ms timeout in _closeDialog)
            await new Promise(resolve => setTimeout(resolve, 350));

            // Dialog should be removed
            const overlay = document.querySelector('.jp-dialog-overlay');
            expect(overlay).toBeFalsy();
        });
    });

    describe('Info Dialog', () => {
        test('should create info dialog with blue header', async () => {
            const dialogPromise = window.jPulse.UI.infoDialog('Test info message');

            const dialog = document.querySelector('.jp-dialog');
            expect(dialog.classList.contains('jp-dialog-info')).toBe(true);

            const header = dialog.querySelector('.jp-dialog-header');
            expect(header.classList.contains('jp-dialog-header-info')).toBe(true);

            const title = header.querySelector('.jp-dialog-title');
            expect(title.textContent).toBe('Information');

            // Close dialog
            const button = dialog.querySelector('.jp-dialog-btn');
            button.click();
            await dialogPromise;
        });
    });

    describe('Dialog Z-Index Management', () => {
        test('should assign higher z-index to subsequent dialogs', async () => {
            const dialog1Promise = window.jPulse.UI.alertDialog('First dialog');
            const dialog2Promise = window.jPulse.UI.infoDialog('Second dialog');

            const overlays = document.querySelectorAll('.jp-dialog-overlay');
            expect(overlays.length).toBe(2);

            const zIndex1 = parseInt(overlays[0].style.zIndex);
            const zIndex2 = parseInt(overlays[1].style.zIndex);

            expect(zIndex2).toBeGreaterThan(zIndex1);

            // Close dialogs
            const buttons = document.querySelectorAll('.jp-dialog-btn');
            buttons.forEach(button => button.click());

            await Promise.all([dialog1Promise, dialog2Promise]);
        });
    });
});

describe('jPulse.UI Accordion Widget (W-048)', () => {

    beforeEach(() => {
        document.body.innerHTML = '';
    });

    describe('Accordion Registration', () => {
        test('should register accordion and return handle object', () => {
            // Create accordion HTML
            document.body.innerHTML = `
                <div id="testAccordion" class="jp-accordion">
                    <div class="jp-accordion-section">
                        <h3>Section 1</h3>
                        <div class="jp-accordion-content">Content 1</div>
                    </div>
                    <div class="jp-accordion-section">
                        <h3>Section 2</h3>
                        <div class="jp-accordion-content">Content 2</div>
                    </div>
                </div>
            `;

            const handle = window.jPulse.UI.accordion.register('testAccordion');

            expect(handle).toBeTruthy();
            expect(handle.elementId).toBe('testAccordion');
            expect(typeof handle.openSection).toBe('function');
            expect(typeof handle.closeAll).toBe('function');
            expect(typeof handle.getOpenSection).toBe('function');
        });

        test('should return null for non-existent element', () => {
            const handle = window.jPulse.UI.accordion.register('nonExistent');
            expect(handle).toBeNull();
        });
    });

    describe('Accordion Decoration Detection', () => {
        test('should apply standalone styling when not in section', () => {
            document.body.innerHTML = `
                <div id="standaloneAccordion" class="jp-accordion">
                    <div class="jp-accordion-section">
                        <h3>Section 1</h3>
                        <div class="jp-accordion-content">Content 1</div>
                    </div>
                </div>
            `;

            window.jPulse.UI.accordion.register('standaloneAccordion');

            const accordion = document.getElementById('standaloneAccordion');
            expect(accordion.classList.contains('jp-accordion-standalone')).toBe(true);
            expect(accordion.classList.contains('jp-accordion-nested')).toBe(false);
        });

        test('should apply nested styling when inside section', () => {
            document.body.innerHTML = `
                <div class="local-demo-section">
                    <div id="nestedAccordion" class="jp-accordion">
                        <div class="jp-accordion-section">
                            <h3>Section 1</h3>
                            <div class="jp-accordion-content">Content 1</div>
                        </div>
                    </div>
                </div>
            `;

            window.jPulse.UI.accordion.register('nestedAccordion');

            const accordion = document.getElementById('nestedAccordion');
            expect(accordion.classList.contains('jp-accordion-nested')).toBe(true);
            expect(accordion.classList.contains('jp-accordion-standalone')).toBe(false);
        });
    });

    describe('Accordion Section Management', () => {
        let handle;

        beforeEach(() => {
            document.body.innerHTML = `
                <div id="testAccordion" class="jp-accordion">
                    <div class="jp-accordion-section">
                        <h3>Section 1</h3>
                        <div class="jp-accordion-content">Content 1</div>
                    </div>
                    <div class="jp-accordion-section">
                        <h3>Section 2</h3>
                        <div class="jp-accordion-content">Content 2</div>
                    </div>
                    <div class="jp-accordion-section">
                        <h3>Section 3</h3>
                        <div class="jp-accordion-content">Content 3</div>
                    </div>
                </div>
            `;

            handle = window.jPulse.UI.accordion.register('testAccordion', {
                exclusive: true
            });
        });

        test('should add arrows to section headers', () => {
            const arrows = document.querySelectorAll('.jp-accordion-arrow');
            expect(arrows.length).toBe(3);

            arrows.forEach(arrow => {
                expect(arrow.textContent).toBe('▶');
            });
        });

        test('should open section programmatically', () => {
            handle.openSection(0);

            const sections = document.querySelectorAll('.jp-accordion-section');
            expect(sections[0].classList.contains('jp-accordion-expanded')).toBe(true);
            expect(sections[1].classList.contains('jp-accordion-expanded')).toBe(false);
            expect(sections[2].classList.contains('jp-accordion-expanded')).toBe(false);

            const arrow = sections[0].querySelector('.jp-accordion-arrow');
            expect(arrow.textContent).toBe('▼');
        });

        test('should enforce mutual exclusion', () => {
            handle.openSection(0);
            handle.openSection(1);

            const sections = document.querySelectorAll('.jp-accordion-section');
            expect(sections[0].classList.contains('jp-accordion-expanded')).toBe(false);
            expect(sections[1].classList.contains('jp-accordion-expanded')).toBe(true);
            expect(sections[2].classList.contains('jp-accordion-expanded')).toBe(false);
        });

        test('should close all sections', () => {
            handle.openSection(1);
            expect(handle.getOpenSection()).toBe(1);

            handle.closeAll();
            expect(handle.getOpenSection()).toBeNull();

            const sections = document.querySelectorAll('.jp-accordion-section');
            sections.forEach(section => {
                expect(section.classList.contains('jp-accordion-expanded')).toBe(false);
            });
        });

        test('should handle click events on headers', () => {
            const header = document.querySelector('.jp-accordion-section h3');
            header.click();

            expect(handle.getOpenSection()).toBe(0);

            // Click again to close
            header.click();
            expect(handle.getOpenSection()).toBeNull();
        });

        test('should trigger custom events', () => {
            let expandedEvent = null;
            let collapsedEvent = null;

            const section = document.querySelector('.jp-accordion-section');
            section.addEventListener('jp-accordion-expanded', (e) => {
                expandedEvent = e;
            });
            section.addEventListener('jp-accordion-collapsed', (e) => {
                collapsedEvent = e;
            });

            handle.openSection(0);
            expect(expandedEvent).toBeTruthy();
            expect(expandedEvent.detail.index).toBe(0);

            handle.closeAll();
            expect(collapsedEvent).toBeTruthy();
            expect(collapsedEvent.detail.index).toBe(0);
        });
    });

    describe('Accordion Configuration Options', () => {
        test('should support initOpen option', () => {
            document.body.innerHTML = `
                <div id="testAccordion" class="jp-accordion">
                    <div class="jp-accordion-section">
                        <h3>Section 1</h3>
                        <div class="jp-accordion-content">Content 1</div>
                    </div>
                    <div class="jp-accordion-section">
                        <h3>Section 2</h3>
                        <div class="jp-accordion-content">Content 2</div>
                    </div>
                </div>
            `;

            const handle = window.jPulse.UI.accordion.register('testAccordion', {
                initOpen: 1
            });

            expect(handle.getOpenSection()).toBe(1);

            const sections = document.querySelectorAll('.jp-accordion-section');
            expect(sections[1].classList.contains('jp-accordion-expanded')).toBe(true);
        });

        test('should call onSectionChange callback', () => {
            document.body.innerHTML = `
                <div id="testAccordion" class="jp-accordion">
                    <div class="jp-accordion-section">
                        <h3>Section 1</h3>
                        <div class="jp-accordion-content">Content 1</div>
                    </div>
                    <div class="jp-accordion-section">
                        <h3>Section 2</h3>
                        <div class="jp-accordion-content">Content 2</div>
                    </div>
                </div>
            `;

            let callbackData = null;
            const handle = window.jPulse.UI.accordion.register('testAccordion', {
                onSectionChange: (openIndex, clickedIndex) => {
                    callbackData = { openIndex, clickedIndex };
                }
            });

            handle.openSection(1);
            expect(callbackData).toEqual({ openIndex: 1, clickedIndex: 1 });
        });
    });
});

describe('jPulse.UI Collapsible Migration (W-048)', () => {
    test('should maintain collapsible functionality under UI namespace', () => {
        document.body.innerHTML = `
            <div id="testCollapsible" class="jp-collapsible">
                <h3>Test Section</h3>
                <div class="jp-collapsible-content">Test content</div>
            </div>
        `;

        const handle = window.jPulse.UI.collapsible.register('testCollapsible');

        expect(handle).toBeTruthy();
        expect(typeof handle.expand).toBe('function');
        expect(typeof handle.collapse).toBe('function');
        expect(typeof handle.toggle).toBe('function');
        expect(typeof handle.isExpanded).toBe('function');

        // Test functionality
        handle.expand();
        expect(handle.isExpanded()).toBe(true);

        handle.collapse();
        expect(handle.isExpanded()).toBe(false);
    });
});

describe('HTML Content Support', () => {
    test('should support raw HTML in dialog messages', () => {
        document.body.innerHTML = '<div id="testContainer"></div>';

        window.jPulse.UI.alertDialog('<b>Bold</b> and <i>italic</i> text with <br> breaks and <p>paragraphs</p>');

        const message = document.querySelector('.jp-dialog-message');
        expect(message.innerHTML).toBe('<b>Bold</b> and <i>italic</i> text with <br> breaks and <p>paragraphs</p>');
    });

    test('should support form elements in confirm dialogs', () => {
        document.body.innerHTML = '<div id="testContainer"></div>';

        const htmlContent = '<div><input type="checkbox" id="test1" checked><label for="test1">Test Item</label></div>';
        window.jPulse.UI.confirmDialog({ message: htmlContent, buttons: ['OK'] });

        const message = document.querySelector('.jp-dialog-message');
        expect(message.querySelector('input[type="checkbox"]')).toBeTruthy();
        expect(message.querySelector('label[for="test1"]')).toBeTruthy();
        expect(message.querySelector('input').checked).toBe(true);
    });

    test('should support complex HTML structures', () => {
        document.body.innerHTML = '<div id="testContainer"></div>';

        const complexHtml = '<ul><li><input type="checkbox" checked> Item 1</li><li><input type="checkbox"> Item 2</li></ul>';
        window.jPulse.UI.confirmDialog({ message: complexHtml, buttons: ['OK'] });

        const message = document.querySelector('.jp-dialog-message');
        expect(message.querySelector('ul')).toBeTruthy();
        expect(message.querySelectorAll('li')).toHaveLength(2);
        expect(message.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
    });
});

// EOF webapp/tests/unit/utils/jpulse-ui-widgets.test.js
