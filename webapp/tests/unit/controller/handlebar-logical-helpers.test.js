/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Handlebar Logical Helpers
 * @tagline         Unit tests for W-114: {{and}}, {{or}}, {{eq}} logical helpers
 * @description     Tests for logical and comparison helpers with subexpression support
 * @file            webapp/tests/unit/controller/handlebar-logical-helpers.test.js
 * @version         1.4.10
 * @release         2026-01-10
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.2, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

describe('W-114: Handlebars Logical Helpers - {{and}}, {{or}}, {{eq}}', () => {
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
                    isAdmin: true,
                    isActive: true,
                    isPremium: false,
                    role: 'admin',
                    count: 5
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

    describe('{{and}} Logical Helper', () => {
        test('should return true for single truthy value', async () => {
            const template = '{{and user.isAdmin}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('true');
        });

        test('should return false for single falsy value', async () => {
            const template = '{{and user.isPremium}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('false');
        });

        test('should return true when all values are truthy', async () => {
            const template = '{{and user.isAdmin user.isActive}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('true');
        });

        test('should return false when any value is falsy', async () => {
            const template = '{{and user.isAdmin user.isPremium}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('false');
        });

        test('should handle literal values', async () => {
            const template = '{{let test1=true test2=true}}{{and vars.test1 vars.test2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });

        test('should return false when all values are falsy', async () => {
            const template = '{{let test1=false test2=false}}{{and vars.test1 vars.test2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('false');
        });
    });

    describe('{{or}} Logical Helper', () => {
        test('should return true for single truthy value', async () => {
            const template = '{{or user.isAdmin}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('true');
        });

        test('should return false for single falsy value', async () => {
            const template = '{{or user.isPremium}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('false');
        });

        test('should return true when any value is truthy', async () => {
            const template = '{{or user.isPremium user.isActive}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('true');
        });

        test('should return true when all values are truthy', async () => {
            const template = '{{or user.isAdmin user.isActive}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('true');
        });

        test('should return false when all values are falsy', async () => {
            const template = '{{let test1=false test2=false}}{{or vars.test1 vars.test2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('false');
        });

        test('should handle literal values', async () => {
            const template = '{{let test1=false test2=true}}{{or vars.test1 vars.test2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });
    });

    describe('{{eq}} Comparison Helper', () => {
        test('should return true for equal strings', async () => {
            const template = '{{eq user.role "admin"}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('true');
        });

        test('should return false for unequal strings', async () => {
            const template = '{{eq user.role "user"}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('false');
        });

        test('should return true for equal numbers', async () => {
            const template = '{{eq user.count 5}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('true');
        });

        test('should return false for unequal numbers', async () => {
            const template = '{{eq user.count 10}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('false');
        });

        test('should use type coercion - string "5" equals number 5', async () => {
            const template = '{{eq user.count "5"}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('true');
        });

        test('should use type coercion - string "10" equals number 10', async () => {
            const template = '{{let numVal=10}}{{eq vars.numVal "10"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });

        test('should handle boolean equality', async () => {
            const template = '{{let testVal=true}}{{eq vars.testVal true}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });

        test('should compare two literal values', async () => {
            const template = '{{let val1="test" val2="test"}}{{eq vars.val1 vars.val2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });
    });

    describe('Nested Subexpressions (Simple)', () => {
        test('should evaluate {{and}} with {{eq}} subexpression', async () => {
            const template = '{{and (eq user.role "admin") user.isActive}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('true');
        });

        test('should evaluate {{or}} with {{eq}} subexpression', async () => {
            const template = '{{or (eq user.role "superadmin") user.isAdmin}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('true');
        });

        test('should evaluate {{and}} with two {{eq}} subexpressions', async () => {
            const template = '{{and (eq user.role "admin") (eq user.isActive true)}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('true');
        });

        test('should evaluate nested {{and}} with {{or}} inside', async () => {
            const template = '{{and user.isActive (or user.isAdmin user.isPremium)}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('true');
        });

        test('should handle false result from nested subexpression', async () => {
            const template = '{{and (eq user.role "user") user.isActive}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('false');
        });
    });

    describe('Quoted Strings with Parentheses', () => {
        test('should preserve parentheses in quoted strings', async () => {
            const template = '{{let name="James (Jim)"}}{{eq vars.name "James (Jim)"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });

        test('should not treat parentheses in quotes as subexpressions', async () => {
            const template = '{{let company="Smith & Co (USA)"}}{{vars.company}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('Smith & Co (USA)');
        });

        test('should handle mixed: subexpressions and quoted parentheses', async () => {
            const template = '{{let name="James (Jim)"}}{{and (eq vars.name "James (Jim)") user.isActive}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('true');
        });
    });

    describe('{{not}} Logical Helper', () => {
        test('should return true for falsy value', async () => {
            const template = '{{not user.isPremium}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('true');
        });

        test('should return false for truthy value', async () => {
            const template = '{{not user.isAdmin}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('false');
        });

        test('should handle subexpression result', async () => {
            const template = '{{not (eq user.role "admin")}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('false'); // user.role is "admin", so eq returns 'true', not returns 'false'
        });

        test('should handle string false from subexpression', async () => {
            const template = '{{not (eq user.role "user")}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('true'); // user.role is not "user", so eq returns 'false', not returns 'true'
        });
    });

    describe('{{#unless}} with {{else}}', () => {
        test('should render unless content when condition is falsy', async () => {
            const template = '{{#unless user.isPremium}}Free user{{else}}Premium user{{/unless}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Free user');
        });

        test('should render else content when condition is truthy', async () => {
            const template = '{{#unless user.isAdmin}}Regular user{{else}}Admin user{{/unless}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Admin user');
        });

        test('should handle without else block', async () => {
            const template = '{{#unless user.isPremium}}Free user{{/unless}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Free user');
        });
    });

    describe('Block Helpers - {{#and}}', () => {
        test('should render content when all conditions are truthy', async () => {
            const template = '{{#and user.isAdmin user.isActive}}Active admin{{else}}Not active admin{{/and}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Active admin');
        });

        test('should render else when any condition is falsy', async () => {
            const template = '{{#and user.isAdmin user.isPremium}}Admin premium{{else}}Not admin premium{{/and}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Not admin premium');
        });
    });

    describe('Block Helpers - {{#or}}', () => {
        test('should render content when any condition is truthy', async () => {
            const template = '{{#or user.isPremium user.isActive}}Has access{{else}}No access{{/or}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Has access');
        });

        test('should render else when all conditions are falsy', async () => {
            const template = '{{#or user.isPremium user.isPremium}}Premium{{else}}Not premium{{/or}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Not premium');
        });
    });

    describe('Block Helpers - {{#not}}', () => {
        test('should render content when condition is falsy', async () => {
            const template = '{{#not user.isPremium}}Not premium{{else}}Premium{{/not}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Not premium');
        });

        test('should render else when condition is truthy', async () => {
            const template = '{{#not user.isAdmin}}Not admin{{else}}Admin{{/not}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Admin');
        });
    });

    describe('Block Helpers - {{#eq}}', () => {
        test('should render content when values are equal', async () => {
            const template = '{{#eq user.role "admin"}}Admin access{{else}}Regular user{{/eq}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Admin access');
        });

        test('should render else when values are not equal', async () => {
            const template = '{{#eq user.role "user"}}Regular user{{else}}Not regular user{{/eq}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Not regular user');
        });
    });

    describe('Block Helpers - {{#ne}}', () => {
        test('should render content when values are not equal', async () => {
            const template = '{{#ne user.role "user"}}Not regular user{{else}}Regular user{{/ne}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Not regular user');
        });

        test('should render else when values are equal', async () => {
            const template = '{{#ne user.role "admin"}}Not admin{{else}}Admin{{/ne}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Admin');
        });
    });

    describe('Block Helpers - {{#gt}}', () => {
        test('should render content when first value is greater', async () => {
            const template = '{{#gt user.count 3}}Count is greater{{else}}Count is not greater{{/gt}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Count is greater');
        });

        test('should render else when first value is not greater', async () => {
            const template = '{{#gt user.count 10}}Count is greater{{else}}Count is not greater{{/gt}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Count is not greater');
        });
    });

    describe('Block Helpers - {{#gte}}', () => {
        test('should render content when first value is greater or equal', async () => {
            const template = '{{#gte user.count 5}}Count is 5 or more{{else}}Count is less{{/gte}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Count is 5 or more');
        });

        test('should render else when first value is less', async () => {
            const template = '{{#gte user.count 10}}Count is 10 or more{{else}}Count is less{{/gte}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Count is less');
        });
    });

    describe('Block Helpers - {{#lt}}', () => {
        test('should render content when first value is less', async () => {
            const template = '{{#lt user.count 10}}Count is less{{else}}Count is not less{{/lt}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Count is less');
        });

        test('should render else when first value is not less', async () => {
            const template = '{{#lt user.count 3}}Count is less{{else}}Count is not less{{/lt}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Count is not less');
        });
    });

    describe('Block Helpers - {{#lte}}', () => {
        test('should render content when first value is less or equal', async () => {
            const template = '{{#lte user.count 5}}Count is 5 or less{{else}}Count is more{{/lte}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Count is 5 or less');
        });

        test('should render else when first value is more', async () => {
            const template = '{{#lte user.count 3}}Count is 3 or less{{else}}Count is more{{/lte}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Count is more');
        });
    });

    describe('Block Helpers - Nested and Complex', () => {
        test('should handle nested block helpers', async () => {
            const template = '{{#and user.isAdmin (gt user.count 3)}}Admin with count > 3{{else}}Not admin or count <= 3{{/and}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Admin with count > 3');
        });

        test('should handle block helper with subexpression', async () => {
            const template = '{{#and (eq user.role "admin") user.isActive}}Active admin{{else}}Not active admin{{/and}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Active admin');
        });
    });

    describe('Subexpressions in {{#if}} and {{#unless}}', () => {
        test('{{#if}} with {{and}} subexpression', async () => {
            const template = '{{#if (and user.isAdmin user.isActive)}}Active admin{{else}}Not active admin{{/if}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Active admin');
        });

        test('{{#if}} with {{or}} subexpression', async () => {
            const template = '{{#if (or user.isPremium user.isActive)}}Has access{{else}}No access{{/if}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Has access');
        });

        test('{{#if}} with {{not}} subexpression', async () => {
            const template = '{{#if (not user.isPremium)}}Not premium{{else}}Premium{{/if}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Not premium');
        });

        test('{{#if}} with {{eq}} subexpression', async () => {
            const template = '{{#if (eq user.role "admin")}}Admin user{{else}}Regular user{{/if}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Admin user');
        });

        test('{{#if}} with {{gt}} subexpression', async () => {
            const template = '{{#if (gt user.count 3)}}Count is greater{{else}}Count is not greater{{/if}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Count is greater');
        });

        test('{{#if}} with nested subexpressions', async () => {
            const template = '{{#if (and (eq user.role "admin") (gt user.count 3))}}Admin with count > 3{{else}}Not admin or count <= 3{{/if}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Admin with count > 3');
        });

        test('{{#unless}} with subexpression', async () => {
            const template = '{{#unless (eq user.role "user")}}Not regular user{{else}}Regular user{{/unless}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Not regular user');
        });

        test('{{#unless}} with {{not}} subexpression', async () => {
            const template = '{{#unless (not user.isPremium)}}Premium{{else}}Not premium{{/unless}}';
            const context = { user: mockReq.session.user };
            const result = await HandlebarController.expandHandlebars(mockReq, template, context);
            expect(result.trim()).toBe('Not premium');
        });
    });

    describe('Escaped Quotes in {{let}}', () => {
        test('should handle escaped double quotes in double-quoted strings', async () => {
            const template = '{{let name="escaped double quote: \\"stuff\\""}}{{vars.name}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template);
            expect(result).toBe('escaped double quote: "stuff"');
        });

        test('should handle escaped single quotes in single-quoted strings', async () => {
            const template = "{{let name='escaped single quote: \\'stuff\\''}}{{vars.name}}";
            const result = await HandlebarController.expandHandlebars(mockReq, template);
            expect(result).toBe("escaped single quote: 'stuff'");
        });

        test('should handle single quotes in double-quoted strings', async () => {
            const template = "{{let name=\"single quote in double: 'stuff'\"}}{{vars.name}}";
            const result = await HandlebarController.expandHandlebars(mockReq, template);
            expect(result).toBe("single quote in double: 'stuff'");
        });

        test('should handle double quotes in single-quoted strings', async () => {
            const template = '{{let name=\'double quote in single: "stuff"\'}}{{vars.name}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template);
            expect(result).toBe('double quote in single: "stuff"');
        });

        test('should handle multiple escaped quotes', async () => {
            const template = '{{let name="multiple: \\"one\\" and \\"two\\""}}{{vars.name}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template);
            expect(result).toBe('multiple: "one" and "two"');
        });

        test('should handle escaped quotes with parentheses', async () => {
            const template = '{{let name="James (\\"Jim\\")"}}{{vars.name}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template);
            expect(result).toBe('James ("Jim")');
        });

        test('should escape unescaped double quotes when normalizing from single quotes', async () => {
            const template = '{{let name=\'bar "quoted" text\'}}{{vars.name}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template);
            expect(result).toBe('bar "quoted" text');
        });

        test('should preserve escaped double quotes when normalizing from single quotes', async () => {
            const template = '{{let name=\'bar \\"quoted\\" text\'}}{{vars.name}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template);
            expect(result).toBe('bar "quoted" text');
        });

        test('should unescape escaped single quotes in double-quoted strings', async () => {
            const template = '{{let name="it\\\'s working"}}{{vars.name}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template);
            expect(result).toBe("it's working");
        });

        test('should handle mixed escaped and unescaped quotes in single quotes', async () => {
            const template = '{{let name=\'He said "hello" and \\"goodbye\\"\'}}{{vars.name}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template);
            expect(result).toBe('He said "hello" and "goodbye"');
        });

        test('should handle escaped single quotes in single-quoted strings (preserved)', async () => {
            const template = "{{let name='it\\'s a test'}}{{vars.name}}";
            const result = await HandlebarController.expandHandlebars(mockReq, template);
            expect(result).toBe("it's a test");
        });
    });
});

// EOF webapp/tests/unit/controller/handlebar-logical-helpers.test.js
