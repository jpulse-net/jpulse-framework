/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Handlebar Components
 * @tagline         Unit tests for W-097 Phase 1: Reusable handlebars components
 * @description     Tests for component definition and usage functionality
 * @file            webapp/tests/unit/controller/handlebar-components.test.js
 * @version         1.5.0
 * @release         2026-01-25
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.2, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

describe('W-097 Phase 1: Reusable Handlebars Components', () => {
    let mockReq;
    let HandlebarController;

    beforeEach(() => {
        // Access pre-initialized HandlebarController from global setup
        HandlebarController = global.HandlebarController;

        // Create mock request object (mimicking Express req)
        mockReq = {
            session: { user: null },
            user: null,
            url: '/test',
            protocol: 'http',
            hostname: 'localhost',
            get: (header) => {
                if (header === 'host') return 'localhost:3000';
                return '';
            },
            t: (key) => key  // Mock translation function
        };
    });

    describe('Component Name Conversion', () => {
        test('should convert kebab-case to camelCase', () => {
            expect(HandlebarController._convertComponentName('logs-svg')).toBe('logsSvg');
            expect(HandlebarController._convertComponentName('user-card')).toBe('userCard');
            expect(HandlebarController._convertComponentName('my-icon-button')).toBe('myIconButton');
        });

        test('should preserve names without hyphens', () => {
            expect(HandlebarController._convertComponentName('LogsSvg')).toBe('LogsSvg');
            expect(HandlebarController._convertComponentName('ab')).toBe('ab');
            expect(HandlebarController._convertComponentName('icon123')).toBe('icon123');
        });

        test('should handle dot-notation namespaces', () => {
            expect(HandlebarController._convertComponentName('icons.config-svg')).toBe('icons.configSvg');
            expect(HandlebarController._convertComponentName('ui.buttons.primary')).toBe('ui.buttons.primary');
            expect(HandlebarController._convertComponentName('forms.text-input')).toBe('forms.textInput');
            expect(HandlebarController._convertComponentName('admin.user-card')).toBe('admin.userCard');
        });
    });

    describe('Component Definition', () => {
        test('should register component with default parameters', async () => {
            const template = `
                {{#component "test-icon" fillColor="currentColor" size="64"}}
                    <svg width="{{size}}" height="{{size}}">
                        <rect fill="{{fillColor}}"/>
                    </svg>
                {{/component}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            // Component definition should produce no output
            expect(result.trim()).toBe('');

            // Component should be registered
            expect(mockReq.componentRegistry.has('testIcon')).toBe(true);

            const component = mockReq.componentRegistry.get('testIcon');
            expect(component.originalName).toBe('test-icon');
            expect(component.defaults.fillColor).toBe('currentColor');
            expect(component.defaults.size).toBe('64');
        });

        test('should reject invalid component names', async () => {
            const templates = [
                `{{#component "-invalid" size="64"}}test{{/component}}`,  // Starts with hyphen
                `{{#component "invalid-" size="64"}}test{{/component}}`,  // Ends with hyphen
                `{{#component "invalid name" size="64"}}test{{/component}}`  // Contains space
            ];

            for (const template of templates) {
                const result = await HandlebarController.expandHandlebars(mockReq, template, {});
                expect(result).toContain('<!-- Error:');
                expect(result).toContain('Invalid component name');
            }
        });
    });

    describe('Component Usage', () => {
        test('should render component with default parameters', async () => {
            const template = `
                {{#component "simple-icon" size="32"}}
                    <svg width="{{size}}"></svg>
                {{/component}}
                {{components.simpleIcon}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            expect(result).toContain('<svg width="32"></svg>');
        });

        test('should override default parameters', async () => {
            const template = `
                {{#component "box" width="100" height="100"}}
                    <div style="width:{{width}}px; height:{{height}}px;"></div>
                {{/component}}
                {{components.box width="200" height="150"}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            expect(result).toContain('width:200px');
            expect(result).toContain('height:150px');
        });

        test('should error when component not found', async () => {
            const template = `{{components.nonexistentComponent}}`;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            expect(result).toContain('<!-- Error:');
            expect(result).toContain('Component "nonexistentComponent" not found');
        });
    });

    describe('Nested Components', () => {
        test('should support nested component calls', async () => {
            const template = `
                {{#component "inner" text="Hello"}}
                    <span>{{text}}</span>
                {{/component}}
                {{#component "outer"}}
                    <div>{{components.inner text="World"}}</div>
                {{/component}}
                {{components.outer}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            expect(result).toContain('<div>');
            expect(result).toContain('<span>World</span>');
        });

        test('should detect circular references', async () => {
            const template = `
                {{#component "comp-a"}}
                    {{components.compB}}
                {{/component}}
                {{#component "comp-b"}}
                    {{components.compA}}
                {{/component}}
                {{components.compA}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            expect(result).toContain('<!-- Error:');
            expect(result).toContain('Circular component reference');
        });

        test('should enforce maximum nesting depth', async () => {
            // Create deeply nested component
            const template = `
                {{#component "recursive" depth="0"}}
                    {{components.recursive depth="1"}}
                {{/component}}
                {{components.recursive}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            // Should eventually hit depth limit and show error
            expect(result).toContain('<!-- Error:');
        });
    });

    describe('Component Library Import', () => {
        test('should import components via file.include', async () => {
            const template = `
                {{file.include "components/svg-icons.tmpl"}}
                <div class="icon">{{components.jpIcons.logsSvg size="32" fillColor="red"}}</div>
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            // Should contain SVG with custom size and color
            expect(result).toContain('<svg width="32"');
            expect(result).toContain('fill="red"');
        });
    });

    describe('Namespaced Components', () => {
        test('should register and use namespaced components', async () => {
            const template = `
                {{#component "jpIcons.star-svg" size="24" fillColor="currentColor"}}
                    <svg width="{{size}}" height="{{size}}">
                        <polygon points="12,2 15,10 23,10 17,15 19,23 12,18 5,23 7,15 1,10 9,10" fill="{{fillColor}}"/>
                    </svg>
                {{/component}}
                {{components.jpIcons.starSvg size="32" fillColor="gold"}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            // Should render namespaced component
            expect(result).toContain('<svg width="32"');
            expect(result).toContain('fill="gold"');
            expect(mockReq.componentRegistry.has('jpIcons.starSvg')).toBe(true);
        });

        test('should support multi-level namespaces', async () => {
            const template = `
                {{#component "ui.buttons.primary" text="Click" color="blue"}}
                    <button style="color:{{color}}">{{text}}</button>
                {{/component}}
                {{components.ui.buttons.primary text="Submit" color="green"}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            expect(result).toContain('<button style="color:green">Submit</button>');
            expect(mockReq.componentRegistry.has('ui.buttons.primary')).toBe(true);
        });

        test('should allow both flat and namespaced components together', async () => {
            const template = `
                {{#component "button" text="Flat"}}
                    <button>{{text}}</button>
                {{/component}}
                {{#component "ui.button" text="Namespaced"}}
                    <button class="ui">{{text}}</button>
                {{/component}}
                {{components.button}}
                {{components.ui.button}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            expect(result).toContain('<button>Flat</button>');
            expect(result).toContain('<button class="ui">Namespaced</button>');
            expect(mockReq.componentRegistry.has('button')).toBe(true);
            expect(mockReq.componentRegistry.has('ui.button')).toBe(true);
        });
    });

    describe('Inline Parameter (_inline)', () => {
        test('should remove newlines with _inline="true"', async () => {
            const template = `{{#component "inline-svg" size="24"}}<svg width="{{size}}">
<rect x="0"/>
</svg>{{/component}}{{components.inlineSvg _inline="true"}}`;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            // Component output should be on single line (newlines replaced with spaces)
            expect(result).toContain('<svg width="24"> <rect x="0"/> </svg>');
            expect(result).not.toContain('<svg width="24">\n');
        });

        test('should not pass _inline to component context', async () => {
            const template = `{{#component "param-test" _inline="should-not-appear"}}<div>_inline={{_inline}}</div>{{/component}}{{components.paramTest _inline="true"}}`;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            // _inline should be filtered out, not passed to component
            expect(result).toContain('_inline='); // undefined becomes empty
            expect(result).not.toContain('_inline=should-not-appear');
            expect(result).not.toContain('_inline=true');
        });
    });
});

// EOF webapp/tests/unit/controller/handlebar-components.test.js
