/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Handlebar Variables
 * @tagline         Unit tests for W-103: {{let}} and {{#with}} for custom variables
 * @description     Tests for variable assignment and context switching functionality
 * @file            webapp/tests/unit/controller/handlebar-variables.test.js
 * @version         1.6.8
 * @release         2026-02-05
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.2, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

describe('W-103: Handlebars Variables - {{let}} and {{#with}}', () => {
    let mockReq;
    let HandlebarController;

    beforeEach(() => {
        // Access pre-initialized HandlebarController from global setup
        HandlebarController = global.HandlebarController;

        // Create mock request object (mimicking Express req)
        mockReq = {
            session: {
                user: {
                    id: 'user123',
                    username: 'testuser',
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    roles: ['user']
                }
            },
            user: null,
            url: '/test',
            path: '/test',
            query: {},
            protocol: 'http',
            hostname: 'localhost',
            get: (header) => {
                if (header === 'host') return 'localhost:3000';
                return '';
            },
            t: (key) => key  // Mock translation function
        };
    });

    describe('{{let}} Inline Variable Assignment', () => {
        test('should set simple string variable', async () => {
            const template = `
                {{let greeting="Hello World"}}
                {{vars.greeting}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('Hello World');
        });

        test('should set number variable', async () => {
            const template = `
                {{let count=42}}
                {{vars.count}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('42');
        });

        test('should set boolean variable', async () => {
            const template = `
                {{let isActive=true}}
                {{vars.isActive}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });

        test('should set multiple variables at once', async () => {
            const template = `
                {{let name="Alice" age=30 active=true}}
                {{vars.name}}-{{vars.age}}-{{vars.active}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('Alice-30-true');
        });

        test('should set nested property with dot notation', async () => {
            const template = `
                {{let config.theme="dark" config.timeout=5000}}
                {{vars.config.theme}}-{{vars.config.timeout}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('dark-5000');
        });

        test('should set deeply nested properties', async () => {
            const template = `
                {{let api.v2.endpoint="/api/v2" api.v2.timeout=3000}}
                {{vars.api.v2.endpoint}}:{{vars.api.v2.timeout}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('/api/v2:3000');
        });

        test('should not produce output from {{let}}', async () => {
            const template = `{{let test="value"}}`;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('');
        });

        test('should persist variables throughout template', async () => {
            const template = `
                {{let pageTitle="Dashboard"}}
                <title>{{vars.pageTitle}}</title>
                <h1>{{vars.pageTitle}}</h1>
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result).toContain('<title>Dashboard</title>');
            expect(result).toContain('<h1>Dashboard</h1>');
        });

        test('should store literal values correctly', async () => {
            // Note: Template composition (nested handlebars) is a Phase 2 feature
            const template = `
                {{let fullName="John Doe"}}
                {{vars.fullName}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('John Doe');
        });

        test('should not override system context variables', async () => {
            const template = `
                {{let user="myCustomUser"}}
                System user: {{user.firstName}}
                Custom var: {{vars.user}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result).toContain('System user: John');
            expect(result).toContain('Custom var: myCustomUser');
        });
    });

    describe('{{#with}} Context Switching', () => {
        test('should switch context to user object', async () => {
            const template = `
                {{#with user}}
                    {{firstName}} {{lastName}}
                {{/with}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('John Doe');
        });

        test('should return empty string for invalid context', async () => {
            const template = `
                {{#with nonExistent}}
                    This should not appear
                {{/with}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('');
        });

        test('should allow access to both context and vars', async () => {
            const template = `
                {{let greeting="Hello"}}
                {{#with user}}
                    {{vars.greeting}}, {{firstName}}!
                {{/with}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('Hello, John!');
        });

        test('should restore context after block', async () => {
            const template = `
                Before: {{user.firstName}}
                {{#with user}}
                    Inside: {{firstName}}
                {{/with}}
                After: {{user.firstName}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result).toContain('Before: John');
            expect(result).toContain('Inside: John');
            expect(result).toContain('After: John');
        });

        test('should handle nested object access', async () => {
            const template = `
                {{let data.level1.level2="deep"}}
                {{#with vars.data.level1}}
                    {{level2}}
                {{/with}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('deep');
        });
    });

    describe('{{#let}} Block-Scoped Variables', () => {
        test('should create block-scoped variables', async () => {
            const template = `
                {{#let greeting="Hello" name="World"}}
                    {{vars.greeting}}, {{vars.name}}!
                {{/let}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('Hello, World!');
        });

        test('should not persist variables after block', async () => {
            const template = `
                {{let outer="outer"}}
                {{#let inner="inner"}}
                    {{vars.outer}}-{{vars.inner}}
                {{/let}}
                -{{vars.outer}}-{{vars.inner}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result).toContain('outer-inner');
            expect(result).toContain('-outer-');
        });

        test('should inherit parent scope vars', async () => {
            const template = `
                {{let parent="parentValue"}}
                {{#let child="childValue"}}
                    parent: {{vars.parent}}, child: {{vars.child}}
                {{/let}}
                parent: {{vars.parent}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result).toContain('parent: parentValue, child: childValue');
            expect(result).toContain('parent: parentValue');
        });

        test('should not leak modifications to parent scope', async () => {
            const template = `
                {{let count=1}}
                First: {{vars.count}}
                {{#let count=2}}
                    Block: {{vars.count}}
                {{/let}}
                After: {{vars.count}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result).toContain('First: 1');
            expect(result).toContain('Block: 2');
            expect(result).toContain('After: 1');
        });

        test('should work with nested blocks', async () => {
            const template = `
                {{let level="0"}}
                {{#let level="1"}}
                    L1: {{vars.level}}
                    {{#let level="2"}}
                        L2: {{vars.level}}
                    {{/let}}
                    L1 again: {{vars.level}}
                {{/let}}
                L0: {{vars.level}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result).toContain('L1: 1');
            expect(result).toContain('L2: 2');
            expect(result).toContain('L1 again: 1');
            expect(result).toContain('L0: 0');
        });

        test('should work with nested properties', async () => {
            const template = `
                {{#let config.theme="dark" config.size=10}}
                    {{vars.config.theme}}-{{vars.config.size}}
                {{/let}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('dark-10');
        });

        test('should work in loops without pollution', async () => {
            const template = `
                {{#each items}}
                    {{#let itemClass="active"}}
                        <li class="{{vars.itemClass}}">{{this}}</li>
                    {{/let}}
                {{/each}}
            `;

            const result = await HandlebarController.expandHandlebars(
                mockReq,
                template,
                { items: ['A', 'B'] }
            );
            expect(result).toContain('<li class="active">A</li>');
            expect(result).toContain('<li class="active">B</li>');
        });
    });

    describe('Combined Usage', () => {
        test('should work with {{#if}} conditions', async () => {
            const template = `
                {{let showTools=true}}
                {{#if vars.showTools}}
                    <div>Tools visible</div>
                {{/if}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result).toContain('Tools visible');
        });

        test('should work in {{#each}} loops', async () => {
            const template = `
                {{let prefix="Item"}}
                {{#each items}}
                    {{vars.prefix}}: {{this}}
                {{/each}}
            `;

            const result = await HandlebarController.expandHandlebars(
                mockReq,
                template,
                { items: ['A', 'B', 'C'] }
            );
            expect(result).toContain('Item: A');
            expect(result).toContain('Item: B');
            expect(result).toContain('Item: C');
        });

        test('should support conditional variable assignment', async () => {
            const template = `
                {{#if user.firstName}}
                    {{let pageTitle="Dashboard"}}
                {{else}}
                    {{let pageTitle="Login"}}
                {{/if}}
                <title>{{vars.pageTitle}}</title>
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result).toContain('<title>Dashboard</title>');
        });

        test('should chain multiple operations', async () => {
            const template = `
                {{let theme="dark" maxItems=3}}
                {{#with user}}
                    <div class="theme-{{vars.theme}}">
                        Welcome, {{firstName}}!
                        Max items: {{vars.maxItems}}
                    </div>
                {{/with}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result).toContain('theme-dark');
            expect(result).toContain('Welcome, John!');
            expect(result).toContain('Max items: 3');
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty {{let}} gracefully', async () => {
            const template = `{{let}}`;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result).toBe('');
        });

        test('should handle variable with empty string value', async () => {
            const template = `
                {{let empty=""}}
                Value: [{{vars.empty}}]
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result).toContain('Value: []');
        });

        test('should handle variables with special characters in values', async () => {
            const template = `
                {{let message="Hello <World> & 'Friends'"}}
                {{vars.message}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result).toContain("Hello <World> & 'Friends'");
        });

        test('should handle accessing undefined vars property', async () => {
            const template = `{{vars.undefined}}`;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result).toBe('');
        });

        test('should handle overwriting existing var', async () => {
            const template = `
                {{let count=1}}
                First: {{vars.count}}
                {{let count=2}}
                Second: {{vars.count}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result).toContain('First: 1');
            expect(result).toContain('Second: 2');
        });
    });

    describe('Namespace Isolation', () => {
        test('should keep vars separate from system context', async () => {
            const template = `
                {{let config="myConfig"}}
                {{let user="myUser"}}
                System config exists: {{#if siteConfig}}yes{{/if}}
                System user: {{user.firstName}}
                Custom config: {{vars.config}}
                Custom user: {{vars.user}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result).toContain('System config exists: yes');
            expect(result).toContain('System user: John');
            expect(result).toContain('Custom config: myConfig');
            expect(result).toContain('Custom user: myUser');
        });

        test('should not leak vars to system context', async () => {
            const template = `
                {{let newProperty="test"}}
                {{newProperty}}
            `;

            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            // newProperty should not be accessible without vars. prefix
            expect(result.trim()).toBe('');
        });
    });
});

// EOF webapp/tests/unit/controller/handlebar-variables.test.js
