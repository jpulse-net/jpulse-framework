/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / View
 * @tagline         Unit tests for view controller handlebars functionality
 * @description     Tests for viewController handlebars template processing
 * @file            webapp/tests/unit/controller/view.test.js
 * @version         1.6.15
 * @release         2026-02-11
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.4, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, jest } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';
import ViewController from '../../../controller/view.js';
import HandlebarController from '../../../controller/handlebar.js';
import ConfigController from '../../../controller/config.js';

// Mock dependencies
jest.mock('../../../controller/log.js', () => ({
    logRequest: jest.fn(),
    logError: jest.fn(),
    logInfo: jest.fn()
}));

jest.mock('../../../model/config.js', () => ({
    default: {
        findById: jest.fn().mockResolvedValue({ data: {} }),
        getEffectiveAdminRoles: jest.fn().mockReturnValue(['admin', 'root']),
        getEffectiveRoles: jest.fn().mockReturnValue(['user', 'admin', 'root'])
    }
}));

// Mock RedisManager
global.RedisManager = {
    registerBroadcastCallback: jest.fn(),
    isRedisAvailable: jest.fn().mockReturnValue(false)
};

// Mock appConfig globally for this test
global.appConfig = {
    app: {
        version: '0.9.3',  // This will be overridden by TestUtils
        release: '2025-10-08'  // This will be overridden by TestUtils
    },
    controller: {
        config: {
            defaultDocName: 'global'
        },
        handlebar: {
            cacheIncludes: {
                enabled: false  // Disabled for tests
            },
            contextFilter: {
                withoutAuth: [],
                withAuth: []
            },
            maxIncludeDepth: 10
        }
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

    beforeAll(async () => {
        // Setup consolidated config first
        TestUtils.setupGlobalMocksWithConsolidatedConfig();

        // Ensure controller config exists (may be overridden by consolidated config)
        if (!global.appConfig.controller) {
            global.appConfig.controller = {};
        }
        if (!global.appConfig.controller.config) {
            global.appConfig.controller.config = { defaultDocName: 'global' };
        }
        if (!global.appConfig.controller.handlebar) {
            global.appConfig.controller.handlebar = {
                cacheIncludes: { enabled: false },
                contextFilter: { withoutAuth: [], withAuth: [] },
                maxIncludeDepth: 10
            };
        }

        // Initialize ConfigController before HandlebarController
        ConfigController.initialize();
        global.ConfigController = ConfigController;

        // Initialize HandlebarController for tests
        await HandlebarController.initialize();
    });

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
        });

        test('should have HandlebarController available', async () => {
            expect(HandlebarController).toBeDefined();
            expect(typeof HandlebarController.expandHandlebars).toBe('function');
        });
    });

    describe('HandlebarController.expandHandlebars() - Basic Functionality', () => {
        test('should process simple variable substitution', async () => {
            const content = 'Hello {{user.firstName}} {{user.lastName}}!';
            const result = await HandlebarController.expandHandlebars(mockReq, content, mockContext);
            expect(result).toBe('Hello Test User!');
        });

        test('should process app config variables', async () => {
            const content = 'Version: {{app.site.version}}';
            const result = await HandlebarController.expandHandlebars(mockReq, content, mockContext);
            expect(result).toBe(`Version: ${mockContext.app.site.version}`);
        });

        test('should handle undefined variables gracefully', async () => {
            const content = 'Missing: {{user.nonexistent}}';
            const result = await HandlebarController.expandHandlebars(mockReq, content, mockContext);
            expect(result).toBe('Missing: ');
        });

        test('should handle nested property access', async () => {
            const content = 'URL: {{url.domain}}';
            const result = await HandlebarController.expandHandlebars(mockReq, content, mockContext);
            expect(result).toBe('URL: http://localhost:8080');
        });
    });

    describe('HandlebarController.expandHandlebars() - {{#if}} Blocks', () => {
        test('should process {{#if}} block with true condition', async () => {
            const content = '{{#if user.isAuthenticated}}Logged in{{/if}}';
            const result = await HandlebarController.expandHandlebars(mockReq, content, mockContext);
            expect(result).toBe('Logged in');
        });

        test('should process {{#if}} block with false condition', async () => {
            const falseContext = { ...mockContext, user: { isAuthenticated: false } };
            const content = '{{#if user.isAuthenticated}}Logged in{{/if}}';
            const result = await HandlebarController.expandHandlebars(mockReq, content, falseContext);
            expect(result).toBe('');
        });

        test('should process {{#if}} with {{else}} - true condition', async () => {
            const content = '{{#if user.isAuthenticated}}Logged in{{else}}Not logged in{{/if}}';
            const result = await HandlebarController.expandHandlebars(mockReq, content, mockContext);
            expect(result).toBe('Logged in');
        });

        test('should process {{#if}} with {{else}} - false condition', async () => {
            const falseContext = { ...mockContext, user: { isAuthenticated: false } };
            const content = '{{#if user.isAuthenticated}}Logged in{{else}}Not logged in{{/if}}';
            const result = await HandlebarController.expandHandlebars(mockReq, content, falseContext);
            expect(result).toBe('Not logged in');
        });
    });

    describe('HandlebarController.expandHandlebars() - {{#unless}} Helper (W-077)', () => {
        test('should render content when condition is false', async () => {
            const content = '{{#unless user.isAdmin}}Regular user content{{/unless}}';
            const context = { ...mockContext, user: { ...mockContext.user, isAdmin: false } };
            const result = await HandlebarController.expandHandlebars(mockReq, content, context);
            expect(result).toBe('Regular user content');
        });

        test('should not render content when condition is true', async () => {
            const content = '{{#unless user.isAuthenticated}}Please log in{{/unless}}';
            const result = await HandlebarController.expandHandlebars(mockReq, content, mockContext);
            expect(result).toBe('');
        });

        test('should handle undefined conditions as falsy', async () => {
            const content = '{{#unless user.nonexistent}}Show this{{/unless}}';
            const result = await HandlebarController.expandHandlebars(mockReq, content, mockContext);
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
            const result = await HandlebarController.expandHandlebars(mockReq, content, context);
            expect(result).toBe('Login available');
        });

        test('should handle nested handlebars inside {{#unless}}', async () => {
            const content = '{{#unless user.isAuthenticated}}<p>Welcome, {{user.firstName}}!</p>{{/unless}}';
            const context = { ...mockContext, user: { ...mockContext.user, isAuthenticated: false } };
            const result = await HandlebarController.expandHandlebars(mockReq, content, context);
            expect(result).toBe('<p>Welcome, Test!</p>');
        });

        test('should handle {{#unless}} with zero and empty string as falsy', async () => {
            const content1 = '{{#unless count}}No items{{/unless}}';
            const content2 = '{{#unless message}}No message{{/unless}}';

            const context1 = { ...mockContext, count: 0 };
            const context2 = { ...mockContext, message: '' };

            const result1 = await HandlebarController.expandHandlebars(mockReq, content1, context1);
            const result2 = await HandlebarController.expandHandlebars(mockReq, content2, context2);

            expect(result1).toBe('No items');
            expect(result2).toBe('No message');
        });
    });

    describe('HandlebarController.expandHandlebars() - Nested {{#if}} with {{else}} Bug Fix (W-077)', () => {
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
            const result1 = await HandlebarController.expandHandlebars(mockReq, content, context1);
            expect(result1.trim()).toContain('Admin panel');

            // Test case 2: authenticated non-admin user
            const context2 = {
                ...mockContext,
                user: { ...mockContext.user, isAdmin: false },
                allowGuests: false
            };
            const result2 = await HandlebarController.expandHandlebars(mockReq, content, context2);
            expect(result2.trim()).toContain('User panel');

            // Test case 3: not authenticated, guests allowed
            const context3 = {
                ...mockContext,
                user: { ...mockContext.user, isAuthenticated: false },
                allowGuests: true
            };
            const result3 = await HandlebarController.expandHandlebars(mockReq, content, context3);
            expect(result3.trim()).toContain('Guest access');

            // Test case 4: not authenticated, guests not allowed
            const context4 = {
                ...mockContext,
                user: { ...mockContext.user, isAuthenticated: false },
                allowGuests: false
            };
            const result4 = await HandlebarController.expandHandlebars(mockReq, content, context4);
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

            const result = await HandlebarController.expandHandlebars(mockReq, content, context);

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

            const result = await HandlebarController.expandHandlebars(mockReq, content, context);

            expect(result).toContain('Outer true');
            expect(result).toContain('Inner false with test value');
            expect(result).not.toContain('Outer false');
            expect(result).not.toContain('Another inner');
        });
    });

    describe('HandlebarController.expandHandlebars() - {{#each}} Blocks', () => {
        test('should process {{#each}} with simple array', async () => {
            const content = '{{#each items}}{{this}} {{/each}}';
            const context = { ...mockContext, items: ['apple', 'banana', 'cherry'] };
            const result = await HandlebarController.expandHandlebars(mockReq, content, context);
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
            const result = await HandlebarController.expandHandlebars(mockReq, content, context);
            expect(result).toBe('Alice Bob ');
        });

        test('should handle @index in {{#each}}', async () => {
            const content = '{{#each items}}{{@index}}: {{this}} {{/each}}';
            const context = { ...mockContext, items: ['first', 'second'] };
            const result = await HandlebarController.expandHandlebars(mockReq, content, context);
            expect(result).toBe('0: first 1: second ');
        });

        test('should handle empty arrays in {{#each}}', async () => {
            const content = '{{#each items}}{{this}} {{/each}}';
            const context = { ...mockContext, items: [] };
            const result = await HandlebarController.expandHandlebars(mockReq, content, context);
            expect(result).toBe('');
        });
    });

    describe('HandlebarController.expandHandlebars() - Error Handling', () => {
        test('should handle malformed handlebars gracefully', async () => {
            const content = '{{unclosed handlebars';
            const result = await HandlebarController.expandHandlebars(mockReq, content, mockContext);
            expect(result).toBe('{{unclosed handlebars');
        });

        test('should handle unknown block types', async () => {
            const content = '{{#unknown}}content{{/unknown}}';
            const result = await HandlebarController.expandHandlebars(mockReq, content, mockContext);
            expect(result).toContain('Error');
            expect(result).toContain('Unknown block type');
        });

        test('should prevent infinite recursion', async () => {
            const content = 'test content';
            // Test with maximum depth + 1
            const result = await HandlebarController.expandHandlebars(mockReq, content, mockContext, 17);
            expect(result).toBe('test content'); // Should return unchanged due to depth limit
        });
    });

    describe('HandlebarController.expandHandlebars() - Complex Scenarios', () => {
        test('should handle multiple handlebars in single template', async () => {
            const content = 'Hello {{user.firstName}}, version {{app.site.version}} is available!';
            const result = await HandlebarController.expandHandlebars(mockReq, content, mockContext);
            expect(result).toBe(`Hello ${mockContext.user.firstName}, version ${mockContext.app.site.version} is available!`);
        });

        test('should handle nested handlebars within blocks', async () => {
            const content = '{{#if user.isAuthenticated}}Welcome {{user.firstName}}!{{/if}}';
            const result = await HandlebarController.expandHandlebars(mockReq, content, mockContext);
            expect(result).toBe(`Welcome ${mockContext.user.firstName}!`);
        });

        test('should handle mixed content with HTML', async () => {
            const content = '<div class="user">{{user.firstName}}</div>';
            const result = await HandlebarController.expandHandlebars(mockReq, content, mockContext);
            expect(result).toBe(`<div class="user">${mockContext.user.firstName}</div>`);
        });
    });
});

// EOF webapp/tests/unit/controller/view.test.js
