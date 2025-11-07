/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / View
 * @tagline         Unit tests for view controller handlebars functionality
 * @description     Tests for viewController handlebars template processing
 * @file            webapp/tests/unit/controller/view.test.js
 * @version         1.1.1
 * @release         2025-11-07
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';
import ViewController from '../../../controller/view.js';

// Mock dependencies
jest.mock('../../../controller/log.js', () => ({
    logRequest: jest.fn(),
    logError: jest.fn(),
    logInfo: jest.fn()
}));

// Mock appConfig globally for this test
global.appConfig = {
    app: {
        version: '0.9.3',  // This will be overridden by TestUtils
        release: '2025-10-08'  // This will be overridden by TestUtils
    },
    view: {
        defaultTemplate: 'index.shtml',
        cacheTemplates: false,
        maxIncludeDepth: 10
    },
    log: {
        maxMsgLength: 256
    }
};

describe('View Controller Unit Tests', () => {
    let mockReq, mockContext;

    beforeEach(() => {
        // Use consolidated configuration
        TestUtils.setupGlobalMocksWithConsolidatedConfig();

        // Mock request object
        mockReq = {
            path: '/test',
            protocol: 'http',
            get: jest.fn().mockReturnValue('localhost:8080'),
            hostname: 'localhost',
            url: '/test?param=value',
            query: { param: 'value' },
            session: {
                user: {
                    loginId: 'testuser',
                    firstName: 'Test',
                    lastName: 'User',
                    isAuthenticated: true
                }
            },
            ip: '127.0.0.1'
        };

        // Mock context with user and app data (matching view controller structure)
        mockContext = {
            app: global.appConfig.app,
            user: mockReq.session.user,
            url: {
                domain: 'http://localhost:8080',
                protocol: 'http',
                hostname: 'localhost',
                port: '8080',
                pathname: '/test',
                search: '?param=value',
                param: { param: 'value' }
            },
            appConfig: global.appConfig,
            i18n: {
                welcome: 'Welcome',
                goodbye: 'Goodbye'
            }
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Controller Structure', () => {
        test('should export required methods', async () => {
            expect(ViewController).toBeDefined();
            expect(typeof ViewController.initialize).toBe('function');
            expect(typeof ViewController.load).toBe('function');
            expect(typeof ViewController.processHandlebars).toBe('function');
        });
    });

    describe('processHandlebars() - Basic Functionality', () => {
        test('should process simple variable substitution', async () => {
            const content = 'Hello {{user.firstName}} {{user.lastName}}!';
            const result = ViewController.processHandlebars(content, mockContext, mockReq);
            expect(result).toBe('Hello Test User!');
        });

        test('should process app config variables', async () => {
            const content = 'Version: {{app.site.version}}';
            const result = ViewController.processHandlebars(content, mockContext, mockReq);
            expect(result).toBe(`Version: ${mockContext.app.site.version}`);
        });

        test('should handle undefined variables gracefully', async () => {
            const content = 'Missing: {{user.nonexistent}}';
            const result = ViewController.processHandlebars(content, mockContext, mockReq);
            expect(result).toBe('Missing: ');
        });

        test('should handle nested property access', async () => {
            const content = 'URL: {{url.domain}}';
            const result = ViewController.processHandlebars(content, mockContext, mockReq);
            expect(result).toBe('URL: http://localhost:8080');
        });
    });

    describe('processHandlebars() - {{#if}} Blocks', () => {
        test('should process {{#if}} block with true condition', async () => {
            const content = '{{#if user.isAuthenticated}}Logged in{{/if}}';
            const result = ViewController.processHandlebars(content, mockContext, mockReq);
            expect(result).toBe('Logged in');
        });

        test('should process {{#if}} block with false condition', async () => {
            const falseContext = { ...mockContext, user: { isAuthenticated: false } };
            const content = '{{#if user.isAuthenticated}}Logged in{{/if}}';
            const result = ViewController.processHandlebars(content, falseContext, mockReq);
            expect(result).toBe('');
        });

        test('should process {{#if}} with {{else}} - true condition', async () => {
            const content = '{{#if user.isAuthenticated}}Logged in{{else}}Not logged in{{/if}}';
            const result = ViewController.processHandlebars(content, mockContext, mockReq);
            expect(result).toBe('Logged in');
        });

        test('should process {{#if}} with {{else}} - false condition', async () => {
            const falseContext = { ...mockContext, user: { isAuthenticated: false } };
            const content = '{{#if user.isAuthenticated}}Logged in{{else}}Not logged in{{/if}}';
            const result = ViewController.processHandlebars(content, falseContext, mockReq);
            expect(result).toBe('Not logged in');
        });
    });

    describe('processHandlebars() - {{#unless}} Helper (W-077)', () => {
        test('should render content when condition is false', async () => {
            const content = '{{#unless user.isAdmin}}Regular user content{{/unless}}';
            const context = { ...mockContext, user: { ...mockContext.user, isAdmin: false } };
            const result = ViewController.processHandlebars(content, context, mockReq);
            expect(result).toBe('Regular user content');
        });

        test('should not render content when condition is true', async () => {
            const content = '{{#unless user.isAuthenticated}}Please log in{{/unless}}';
            const result = ViewController.processHandlebars(content, mockContext, mockReq);
            expect(result).toBe('');
        });

        test('should handle undefined conditions as falsy', async () => {
            const content = '{{#unless user.nonexistent}}Show this{{/unless}}';
            const result = ViewController.processHandlebars(content, mockContext, mockReq);
            expect(result).toBe('Show this');
        });

        test('should handle complex conditions with appConfig', async () => {
            const content = '{{#unless appConfig.view.auth.hideLogin}}Login available{{/unless}}';
            const context = {
                ...mockContext,
                appConfig: {
                    ...mockContext.appConfig,
                    view: { auth: { hideLogin: false } }
                }
            };
            const result = ViewController.processHandlebars(content, context, mockReq);
            expect(result).toBe('Login available');
        });

        test('should handle nested handlebars inside {{#unless}}', async () => {
            const content = '{{#unless user.isAuthenticated}}<p>Welcome, {{user.firstName}}!</p>{{/unless}}';
            const context = { ...mockContext, user: { ...mockContext.user, isAuthenticated: false } };
            const result = ViewController.processHandlebars(content, context, mockReq);
            expect(result).toBe('<p>Welcome, Test!</p>');
        });

        test('should handle {{#unless}} with zero and empty string as falsy', async () => {
            const content1 = '{{#unless count}}No items{{/unless}}';
            const content2 = '{{#unless message}}No message{{/unless}}';

            const context1 = { ...mockContext, count: 0 };
            const context2 = { ...mockContext, message: '' };

            const result1 = ViewController.processHandlebars(content1, context1, mockReq);
            const result2 = ViewController.processHandlebars(content2, context2, mockReq);

            expect(result1).toBe('No items');
            expect(result2).toBe('No message');
        });
    });

    describe('processHandlebars() - Nested {{#if}} with {{else}} Bug Fix (W-077)', () => {
        test('should handle nested {{#if}} inside {{#if}} with {{else}}', async () => {
            const content = `{{#if user.isAuthenticated}}
                {{#if user.isAdmin}}
                    Admin panel
                {{else}}
                    User panel
                {{/if}}
            {{else}}
                {{#if allowGuests}}
                    Guest access
                {{else}}
                    Please log in
                {{/if}}
            {{/if}}`;

            // Test case 1: authenticated admin user
            const context1 = {
                ...mockContext,
                user: { ...mockContext.user, isAdmin: true },
                allowGuests: false
            };
            const result1 = ViewController.processHandlebars(content, context1, mockReq);
            expect(result1.trim()).toContain('Admin panel');

            // Test case 2: authenticated non-admin user
            const context2 = {
                ...mockContext,
                user: { ...mockContext.user, isAdmin: false },
                allowGuests: false
            };
            const result2 = ViewController.processHandlebars(content, context2, mockReq);
            expect(result2.trim()).toContain('User panel');

            // Test case 3: not authenticated, guests allowed
            const context3 = {
                ...mockContext,
                user: { ...mockContext.user, isAuthenticated: false },
                allowGuests: true
            };
            const result3 = ViewController.processHandlebars(content, context3, mockReq);
            expect(result3.trim()).toContain('Guest access');

            // Test case 4: not authenticated, guests not allowed
            const context4 = {
                ...mockContext,
                user: { ...mockContext.user, isAuthenticated: false },
                allowGuests: false
            };
            const result4 = ViewController.processHandlebars(content, context4, mockReq);
            expect(result4.trim()).toContain('Please log in');
        });

        test('should handle deeply nested {{#if}} with multiple {{else}} blocks', async () => {
            const content = `{{#if level1}}
                Level 1 true
                {{#if level2}}
                    Level 2 true
                    {{#if level3}}
                        Level 3 true
                    {{else}}
                        Level 3 false
                    {{/if}}
                {{else}}
                    Level 2 false
                    {{#if level3}}
                        But level 3 true
                    {{else}}
                        And level 3 false
                    {{/if}}
                {{/if}}
            {{else}}
                Level 1 false
            {{/if}}`;

            const context = {
                ...mockContext,
                level1: true,
                level2: false,
                level3: true
            };

            const result = ViewController.processHandlebars(content, context, mockReq);

            expect(result).toContain('Level 1 true');
            expect(result).toContain('Level 2 false');
            expect(result).toContain('But level 3 true');
            expect(result).not.toContain('Level 2 true');
            expect(result).not.toContain('Level 3 false');
            expect(result).not.toContain('And level 3 false');
        });

        test('should correctly escape {{else}} in nested blocks', async () => {
            const content = `{{#if outer}}
                Outer true
                {{#if inner}}
                    Inner true
                {{else}}
                    Inner false with {{someVar}}
                {{/if}}
            {{else}}
                Outer false
                {{#if anotherInner}}
                    Another inner true
                {{else}}
                    Another inner false
                {{/if}}
            {{/if}}`;

            const context = {
                ...mockContext,
                outer: true,
                inner: false,
                someVar: 'test value',
                anotherInner: true
            };

            const result = ViewController.processHandlebars(content, context, mockReq);

            expect(result).toContain('Outer true');
            expect(result).toContain('Inner false with test value');
            expect(result).not.toContain('Outer false');
            expect(result).not.toContain('Another inner');
        });
    });

    describe('processHandlebars() - {{#each}} Blocks', () => {
        test('should process {{#each}} with simple array', async () => {
            const content = '{{#each items}}{{this}} {{/each}}';
            const context = { ...mockContext, items: ['apple', 'banana', 'cherry'] };
            const result = ViewController.processHandlebars(content, context, mockReq);
            expect(result).toBe('apple banana cherry ');
        });

        test('should process {{#each}} with object array', async () => {
            const content = '{{#each users}}{{this.name}} {{/each}}';
            const context = {
                ...mockContext,
                users: [
                    { name: 'Alice' },
                    { name: 'Bob' }
                ]
            };
            const result = ViewController.processHandlebars(content, context, mockReq);
            expect(result).toBe('Alice Bob ');
        });

        test('should handle @index in {{#each}}', async () => {
            const content = '{{#each items}}{{@index}}: {{this}} {{/each}}';
            const context = { ...mockContext, items: ['first', 'second'] };
            const result = ViewController.processHandlebars(content, context, mockReq);
            expect(result).toBe('0: first 1: second ');
        });

        test('should handle empty arrays in {{#each}}', async () => {
            const content = '{{#each items}}{{this}} {{/each}}';
            const context = { ...mockContext, items: [] };
            const result = ViewController.processHandlebars(content, context, mockReq);
            expect(result).toBe('');
        });
    });

    describe('processHandlebars() - Error Handling', () => {
        test('should handle malformed handlebars gracefully', async () => {
            const content = '{{unclosed handlebars';
            const result = ViewController.processHandlebars(content, mockContext, mockReq);
            expect(result).toBe('{{unclosed handlebars');
        });

        test('should handle unknown block types', async () => {
            const content = '{{#unknown}}content{{/unknown}}';
            const result = ViewController.processHandlebars(content, mockContext, mockReq);
            expect(result).toContain('Error');
            expect(result).toContain('Unknown block type');
        });

        test('should prevent infinite recursion', async () => {
            const content = 'test content';
            // Test with maximum depth + 1
            const result = ViewController.processHandlebars(content, mockContext, mockReq, 17);
            expect(result).toBe('test content'); // Should return unchanged due to depth limit
        });
    });

    describe('processHandlebars() - Complex Scenarios', () => {
        test('should handle multiple handlebars in single template', async () => {
            const content = 'Hello {{user.firstName}}, version {{app.site.version}} is available!';
            const result = ViewController.processHandlebars(content, mockContext, mockReq);
            expect(result).toBe(`Hello ${mockContext.user.firstName}, version ${mockContext.app.site.version} is available!`);
        });

        test('should handle nested handlebars within blocks', async () => {
            const content = '{{#if user.isAuthenticated}}Welcome {{user.firstName}}!{{/if}}';
            const result = ViewController.processHandlebars(content, mockContext, mockReq);
            expect(result).toBe(`Welcome ${mockContext.user.firstName}!`);
        });

        test('should handle mixed content with HTML', async () => {
            const content = '<div class="user">{{user.firstName}}</div>';
            const result = ViewController.processHandlebars(content, mockContext, mockReq);
            expect(result).toBe(`<div class="user">${mockContext.user.firstName}</div>`);
        });
    });
});

// EOF webapp/tests/unit/controller/view.test.js
