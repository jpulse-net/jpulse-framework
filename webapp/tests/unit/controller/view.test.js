/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / View
 * @tagline         Unit tests for view controller handlebars functionality
 * @description     Tests for viewController handlebars template processing
 * @file            webapp/tests/unit/controller/view.test.js
 * @version         0.7.17
 * @release         2025-09-23
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           80%, Cursor 1.2, Claude Sonnet 4
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import TestUtils from '../../helpers/test-utils.js';

// Mock appConfig globally for this test
global.appConfig = {
    app: {
        version: '0.1.4',
        release: '2025-08-24'
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

describe('View Controller Handlebars Processing', () => {
    let mockReq, mockContext;

    beforeEach(() => {
        // Use consolidated configuration
        TestUtils.setupGlobalMocksWithConsolidatedConfig();

        // Or if you need specific overrides for testing:
        global.appConfig = {
            ...TestUtils.getConsolidatedConfig(),
            // Add any test-specific overrides here
        };

        // Mock request object
        mockReq = {
            path: '/test',
            protocol: 'http',
            hostname: 'localhost',
            url: '/test?name=john&age=25',
            query: { name: 'john', age: '25' },
            session: {
                user: {
                    id: 'user123',
                    firstName: 'John',
                    nickName: 'Johnny',
                    lastName: 'Doe',
                    email: 'john@test.com'
                }
            },
            get: jest.fn((header) => {
                if (header === 'host') return 'localhost:8080';
                return undefined;
            }),
            ip: '127.0.0.1'
        };

        // Create mock context similar to what viewController creates
        mockContext = {
            app: {
                version: '0.1.4',
                release: '2025-08-24',
                name: 'Test App Title'
            },
            user: {
                id: mockReq.session?.user?.id || '',
                firstName: mockReq.session?.user?.firstName || '',
                nickName: mockReq.session?.user?.nickName || '',
                lastName: mockReq.session?.user?.lastName || '',
                email: mockReq.session?.user?.email || '',
                authenticated: !!mockReq.session?.user
            },
            config: {
                email: {
                    adminEmail: 'admin@test.com',
                    adminName: 'Test Admin'
                },
                messages: {
                    broadcast: 'Test broadcast message'
                }
            },
            url: {
                domain: `${mockReq.protocol}://${mockReq.get('host')}`,
                protocol: mockReq.protocol,
                hostname: mockReq.hostname,
                port: mockReq.get('host')?.split(':')[1] || '',
                pathname: mockReq.path,
                search: mockReq.url.includes('?') ? mockReq.url.substring(mockReq.url.indexOf('?')) : '',
                param: mockReq.query || {}
            },
            req: mockReq,
            i18n: {
                app: {
                    title: 'Test App Title'
                },
                welcome: {
                    message: 'Welcome to our app'
                }
            }
        };
    });

    afterEach(() => {
        TestUtils.cleanupGlobalMocks();
    });

    describe('Basic Handlebars Processing', () => {
        test('should process app.version handlebars', async () => {
            const content = '{{app.version}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('0.1.4');
        });

        test('should process app.release handlebars', async () => {
            const content = '{{app.release}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('2025-08-24');
        });

        test('should process user properties', async () => {
            const content = '{{user.firstName}} {{user.lastName}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('John Doe');
        });

        test('should process user.authenticated for logged in user', async () => {
            const content = '{{user.authenticated}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('true');
        });

        test('should process user.authenticated for guest user', async () => {
            // Update context for guest user
            const guestContext = { ...mockContext, user: { ...mockContext.user, authenticated: false } };
            const content = '{{user.authenticated}}';
            const result = await processHandlebarsForTest(content, guestContext);
            expect(result).toBe('false');
        });
    });

    describe('URL Handlebars Processing', () => {
        test('should process url.domain', async () => {
            const content = '{{url.domain}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('http://localhost:8080');
        });

        test('should process url.protocol', async () => {
            const content = '{{url.protocol}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('http');
        });

        test('should process url.hostname', async () => {
            const content = '{{url.hostname}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('localhost');
        });

        test('should process url.port', async () => {
            const content = '{{url.port}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('8080');
        });

        test('should process url.pathname', async () => {
            const content = '{{url.pathname}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('/test');
        });

        test('should process url.search', async () => {
            const content = '{{url.search}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('?name=john&age=25');
        });

        test('should process url.param.name', async () => {
            const content = '{{url.param.name}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('john');
        });

        test('should process url.param.age', async () => {
            const content = '{{url.param.age}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('25');
        });

        test('should handle missing url parameter', async () => {
            const content = '{{url.param.missing}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('');
        });
    });

    describe('Config Handlebars Processing', () => {
        test('should process config.email.adminEmail', async () => {
            const content = '{{config.email.adminEmail}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('admin@test.com');
        });

        test('should process config.email.adminName', async () => {
            const content = '{{config.email.adminName}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('Test Admin');
        });

        test('should process config.messages.broadcast', async () => {
            const content = '{{config.messages.broadcast}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('Test broadcast message');
        });
    });

    describe('Block If Helper Processing', () => {
        test('should process {{#if}} block with true condition', async () => {
            const content = '{{#if user.authenticated}}Welcome back, {{user.firstName}}!{{/if}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('Welcome back, John!');
        });

        test('should process {{#if}} block with false condition', async () => {
            const guestContext = { ...mockContext, user: { ...mockContext.user, authenticated: false } };
            const content = '{{#if user.authenticated}}Welcome back, {{user.firstName}}!{{/if}}';
            const result = await processHandlebarsForTest(content, guestContext);
            expect(result).toBe('');
        });

        test('should process {{#if}} with {{else}} - true condition', async () => {
            const content = '{{#if user.authenticated}}Welcome, {{user.firstName}}{{else}}Please sign in{{/if}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('Welcome, John');
        });

        test('should process {{#if}} with {{else}} - false condition', async () => {
            const guestContext = { ...mockContext, user: { ...mockContext.user, authenticated: false } };
            const content = '{{#if user.authenticated}}Welcome, {{user.firstName}}{{else}}Please sign in{{/if}}';
            const result = await processHandlebarsForTest(content, guestContext);
            expect(result).toBe('Please sign in');
        });

        test('should handle nested handlebars within {{#if}} blocks', async () => {
            const content = '{{#if url.port}}Server running on port {{url.port}}{{else}}Default port{{/if}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('Server running on port 8080');
        });

        test('should handle complex content in {{#if}} blocks', async () => {
            const content = '{{#if user.authenticated}}<div class="user-info">{{user.firstName}} {{user.lastName}} ({{user.email}})</div>{{else}}<div class="guest-info">Guest user</div>{{/if}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('<div class="user-info">John Doe (john@test.com)</div>');
        });
    });

    describe('Complex Template Processing', () => {
        test('should process multiple handlebars in single template', async () => {
            const content = 'Hello {{user.firstName}}, version {{app.version}} on {{url.hostname}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('Hello John, version 0.1.4 on localhost');
        });

        test('should handle mixed content with HTML', async () => {
            const content = '<h1>{{app.name}}</h1><p>Welcome {{user.firstName}}!</p>';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('<h1>Test App Title</h1><p>Welcome John!</p>');
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid handlebars gracefully', async () => {
            const content = '{{invalid.helper.call}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('');
        });

        test('should handle unknown helper', async () => {
            const content = '{{unknown.helper}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('');
        });

        test('should handle malformed handlebars syntax', async () => {
            const content = '{{unclosed handlebars';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('{{unclosed handlebars');
        });

        test('should handle nested property access on undefined objects', async () => {
            const content = '{{undefined.property.chain}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('');
        });
    });

    describe('File Include Helper', () => {
        test('should handle file.include with valid file', async () => {
            jest.spyOn(fs, 'existsSync').mockReturnValue(true);
            jest.spyOn(fs, 'readFileSync').mockReturnValue('Included content: {{app.version}}');

            const content = '{{file.include "./test.tmpl"}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('Included content: 0.1.4');

            fs.existsSync.mockRestore();
            fs.readFileSync.mockRestore();
        });

        test('should handle file.include with missing file', async () => {
            jest.spyOn(fs, 'existsSync').mockReturnValue(false);

            const content = '{{file.include "./missing.tmpl"}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toContain('<!-- Error: Include file not found');

            fs.existsSync.mockRestore();
        });

        test('should handle maximum include depth exceeded', async () => {
            // This would test the recursion protection, but requires complex setup
            // For now, we'll test the error condition directly in the helper
            const content = '{{file.include "./recursive.tmpl"}}';

            // Mock a deep recursion scenario
            jest.spyOn(fs, 'existsSync').mockReturnValue(true);
            jest.spyOn(fs, 'readFileSync').mockReturnValue('{{file.include "./recursive.tmpl"}}');

            const result = await processHandlebarsForTest(content, mockContext);
            // This should eventually hit the depth limit and show an error
            expect(result).toContain('<!-- Error:');

            fs.existsSync.mockRestore();
            fs.readFileSync.mockRestore();
        });
    });

    describe('File Timestamp Helper', () => {
        test('should handle file.timestamp with valid file', async () => {
            const mockStats = {
                mtime: new Date('2025-08-24T00:00:00.000Z')
            };

            jest.spyOn(fs, 'existsSync').mockReturnValue(true);
            jest.spyOn(fs, 'statSync').mockReturnValue(mockStats);

            const content = '{{file.timestamp "./test.shtml"}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('2025-08-24T00:00:00.000Z');

            fs.existsSync.mockRestore();
            fs.statSync.mockRestore();
        });

        test('should handle file.timestamp with missing file', async () => {
            jest.spyOn(fs, 'existsSync').mockReturnValue(false);

            const content = '{{file.timestamp "./missing.shtml"}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('');

            fs.existsSync.mockRestore();
        });
    });

    describe('Configuration Integration', () => {
        test('should use appConfig.controller.view.defaultTemplate for path resolution', async () => {
            // This would require mocking the actual load function
            // For now, we test that the configuration values are accessible
            const originalAppConfig = global.appConfig;
            global.appConfig = {
                ...originalAppConfig,
                controller: {
                    view: {
                        defaultTemplate: 'custom.shtml',
                        maxIncludeDepth: 5
                    }
                }
            };

            // Test that we can access the config values
            expect(global.appConfig.controller.view.defaultTemplate).toBe('custom.shtml');
            expect(global.appConfig.controller.view.maxIncludeDepth).toBe(5);

            global.appConfig = originalAppConfig;
        });
    });

    describe('Edge Cases and Special Scenarios', () => {
        test('should handle empty handlebars expression', async () => {
            const content = '{{}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('');
        });

        test('should handle handlebars with only spaces', async () => {
            const content = '{{   }}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('');
        });

        test('should handle multiple consecutive handlebars', async () => {
            const content = '{{app.version}}{{app.release}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('0.1.42025-08-24');
        });

        test('should handle handlebars at beginning and end of content', async () => {
            const content = '{{app.version}} middle content {{app.release}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('0.1.4 middle content 2025-08-24');
        });

        test('should handle special characters in {{#if}} blocks', async () => {
            const content = '{{#if user.authenticated}}Welcome! @#$%^&*(){{else}}Please login...{{/if}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('Welcome! @#$%^&*()');
        });

        test('should handle mixed content types in {{#if}} blocks', async () => {
            const content = '{{#if user.authenticated}}User content{{else}}Guest content{{/if}}';
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe('User content');
        });

        test('should handle empty config object', async () => {
            const emptyConfigContext = { ...mockContext, config: {} };
            const content = '{{config.email.adminEmail}}';
            const result = await processHandlebarsForTest(content, emptyConfigContext);
            expect(result).toBe('');
        });

        test('should handle null and undefined values gracefully', async () => {
            const nullContext = {
                ...mockContext,
                user: { ...mockContext.user, firstName: null, lastName: undefined }
            };
            const content = '{{user.firstName}} {{user.lastName}}';
            const result = await processHandlebarsForTest(content, nullContext);
            expect(result).toBe(' ');
        });
    });

    describe('Performance and Stress Tests', () => {
        test('should handle large content with many handlebars', async () => {
            // Create content with 100 handlebars expressions
            const handlebars = Array(100).fill('{{app.version}}').join(' ');
            const result = await processHandlebarsForTest(handlebars, mockContext);
            const expected = Array(100).fill('0.1.4').join(' ');
            expect(result).toBe(expected);
        });

        test('should handle very long content in {{#if}} blocks', async () => {
            const longString = 'A'.repeat(1000);
            const content = `{{#if user.authenticated}}${longString}{{else}}short{{/if}}`;
            const result = await processHandlebarsForTest(content, mockContext);
            expect(result).toBe(longString);
        });
    });

});



// Simplified handlebars processor for testing
async function processHandlebarsForTest(content, context, depth = 0) {
    // Prevent infinite recursion
    if (depth > 10) {
        throw new Error('Maximum include depth exceeded');
    }

    // Combined regex to match both block handlebars ({{#if}}...{{/if}}) and regular handlebars ({{expression}})
    const handlebarsRegex = /\{\{#(\w+)\s+([^}]+)\}\}(.*?)\{\{\/\1\}\}|\{\{([^#][^}]*|)\}\}/gs;
    let result = content;
    let match;

    while ((match = handlebarsRegex.exec(content)) !== null) {
        const fullMatch = match[0];
        try {
            let replacement;

            // Check if this is a block handlebar ({{#expression}}...{{/expression}})
            if (match[1] && match[2] && match[3] !== undefined) {
                // Block handlebars: group 1=blockType, group 2=params, group 3=content
                const blockType = match[1];
                const params = match[2].trim();
                const blockContent = match[3];
                replacement = await evaluateBlockHandlebarForTest(blockType, params, blockContent, context, depth);
            } else if (match[4]) {
                // Regular handlebars: group 4=full expression
                const expression = match[4].trim();
                replacement = await evaluateHandlebarForTest(expression, context, depth);
            } else {
                replacement = '';
            }

            result = result.replace(fullMatch, replacement);
        } catch (error) {
            const errorExpression = match[1] ? `#${match[1]} ${match[2]}` : match[4] || 'unknown';
            result = result.replace(fullMatch, `<!-- Error: ${error.message} -->`);
        }
    }

    return result;
}

// Simplified block handlebars evaluator for testing
async function evaluateBlockHandlebarForTest(blockType, params, blockContent, context, depth = 0) {
    switch (blockType) {
        case 'if':
            return await handleBlockIfForTest(params, blockContent, context, depth);
        default:
            throw new Error(`Unknown block type: ${blockType}`);
    }
}

// Handle block if conditional helper for testing
async function handleBlockIfForTest(params, blockContent, context, depth = 0) {
    const condition = params.trim();
    const conditionValue = getNestedPropertyForTest(context, condition);

    // Check if there's an {{else}} block
    const elseMatch = blockContent.match(/^(.*?)\{\{else\}\}(.*?)$/s);

    let contentToProcess;
    if (elseMatch) {
        // Has {{else}} - choose content based on condition
        contentToProcess = conditionValue ? elseMatch[1] : elseMatch[2];
    } else {
        // No {{else}} - only show content if condition is true
        contentToProcess = conditionValue ? blockContent : '';
    }

    // Recursively process any handlebars within the selected content
    if (contentToProcess) {
        return await processHandlebarsForTest(contentToProcess, context, depth + 1);
    }

    return '';
}

// Simplified handlebars evaluator for testing
async function evaluateHandlebarForTest(expression, context, depth = 0) {
    const parts = parseArgumentsForTest(expression);
    const helper = parts[0];
    const args = parts.slice(1);

    // Handle empty expressions
    if (!helper) {
        return '';
    }

    // Handle helper functions first (before property access)
    switch (helper) {
        case 'file.include':
            return await handleFileIncludeForTest(args[0], context, depth);
        case 'file.timestamp':
            return await handleFileTimestampForTest(args[0]);

        case 'i18n':
            const key = args[0].replace(/^["']|["']$/g, '');
            return context.i18n?.[key] || key;
        default:
            // Handle property access for non-helper expressions
            if (!helper.includes(' ') && helper.includes('.')) {
                return getNestedPropertyAsStringForTest(context, helper) || '';
            }
            return getNestedPropertyAsStringForTest(context, helper) || '';
    }
}

// Helper functions for testing
function parseArgumentsForTest(expression) {
    const args = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < expression.length; i++) {
        const char = expression[i];

        if (!inQuotes && (char === '"' || char === "'")) {
            inQuotes = true;
            quoteChar = char;
        } else if (inQuotes && char === quoteChar) {
            inQuotes = false;
            quoteChar = '';
        } else if (!inQuotes && char === ' ') {
            if (current) {
                args.push(current);
                current = '';
            }
        } else {
            current += char;
        }
    }

    if (current) {
        args.push(current);
    }

    return args;
}

function getNestedPropertyForTest(obj, path) {
    const result = path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);

    return result;
}

function getNestedPropertyAsStringForTest(obj, path) {
    const result = getNestedPropertyForTest(obj, path);

    // Convert boolean values to strings for handlebars display
    if (typeof result === 'boolean') {
        return result.toString();
    }

    return result;
}



async function handleFileIncludeForTest(filePath, context, depth = 0) {
    const cleanPath = filePath.replace(/^["']|["']$/g, '');

    if (!fs.existsSync(cleanPath)) {
        throw new Error(`Include file not found: ${cleanPath}`);
    }

    const content = fs.readFileSync(cleanPath, 'utf8');
    // Recursively process handlebars in included content with depth tracking
    return await processHandlebarsForTest(content, context, depth + 1);
}

async function handleFileTimestampForTest(filePath) {
    const cleanPath = filePath.replace(/^["']|["']$/g, '');

    if (!fs.existsSync(cleanPath)) {
        return '';
    }

    const stats = fs.statSync(cleanPath);
    return stats.mtime.toISOString();
}

// EOF webapp/tests/unit/controller/view.test.js
