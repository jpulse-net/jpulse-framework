/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Handlebar String Helpers
 * @tagline         Unit tests for W-128: String helpers (concat, default, replace, substring, padLeft, padRight, startsWith, endsWith, contains)
 * @description     Tests for string helpers with variadic support and error handling
 * @file            webapp/tests/unit/controller/handlebar-string-helpers.test.js
 * @version         1.4.12
 * @release         2026-01-12
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.2, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

describe('W-128: Handlebars String Helpers', () => {
    let mockReq;
    let HandlebarController;

    beforeEach(() => {
        HandlebarController = global.HandlebarController;
        mockReq = {
            session: { user: null },
            user: null,
            url: '/test',
            path: '/test',
            query: {},
            protocol: 'http',
            hostname: 'localhost',
            get: (header) => header === 'host' ? 'localhost:3000' : '',
            t: (key) => key
        };
    });

    describe('{{string.concat}} Helper', () => {
        test('should concatenate two strings', async () => {
            const template = '{{string.concat "hello" " " "world"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello world');
        });

        test('should concatenate multiple strings', async () => {
            const template = '{{string.concat "a" "b" "c" "d"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('abcd');
        });

        test('should return single arg when only one provided', async () => {
            const template = '{{string.concat "hello"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello');
        });

        test('should handle empty strings', async () => {
            const template = '{{string.concat "hello" "" "world"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('helloworld');
        });

        test('should handle null/undefined as empty string', async () => {
            const template = '{{string.concat "hello" vars.missing "world"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('helloworld');
        });

        test('should work with variables', async () => {
            const template = '{{let prefix="themes/" theme="light" suffix=".css"}}{{string.concat vars.prefix vars.theme vars.suffix}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('themes/light.css');
        });

        test('should work with subexpressions', async () => {
            // Test with undefined/missing value (should use fallback)
            // Note: subexpressions with spaces aren't supported, so use a different approach
            const template = '{{string.concat "hello" (string.default vars.missing "-") "world"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            // vars.missing is undefined, so string.default should return "-" (fallback)
            expect(result.trim()).toBe('hello-world');
        });
    });

    describe('{{string.default}} Helper', () => {
        test('should return first non-empty value', async () => {
            const template = '{{string.default "hello" "world"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello');
        });

        test('should return second value when first is empty', async () => {
            const template = '{{string.default "" "world"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('world');
        });

        test('should return last value as fallback', async () => {
            const template = '{{string.default "" "" "fallback"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('fallback');
        });

        test('should return single arg when only one provided', async () => {
            const template = '{{string.default "hello"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello');
        });

        test('should handle empty string as empty', async () => {
            const template = '{{string.default "" "default"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('default');
        });

        test('should work with variables', async () => {
            const template = '{{let theme=""}}{{string.default vars.theme "light"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('light');
        });

        test('should work with subexpressions', async () => {
            const template = '{{string.default vars.missing (string.concat "the" "me")}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('theme');
        });
    });

    describe('{{string.replace}} Helper', () => {
        test('should replace single occurrence', async () => {
            const template = '{{string.replace "hello world" "world" "jPulse"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello jPulse');
        });

        test('should replace all occurrences', async () => {
            const template = '{{string.replace "hello hello" "hello" "hi"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hi hi');
        });

        test('should handle empty search string', async () => {
            const template = '{{string.replace "hello" "" "x"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            // Empty string split gives individual characters: ['h','e','l','l','o'] -> 'hxexlxlxo'
            expect(result.trim()).toBe('hxexlxlxo');
        });

        test('should handle empty replace string', async () => {
            const template = '{{string.replace "hello world" " " ""}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('helloworld');
        });

        test('should work with variables', async () => {
            const template = '{{let name="John Doe"}}{{string.replace vars.name " " "-"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('John-Doe');
        });

        test('should handle wrong number of args (return original string)', async () => {
            const template = '{{string.replace "hello" "world"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello');
        });
    });

    describe('{{string.substring}} Helper', () => {
        test('should extract substring from start', async () => {
            const template = '{{string.substring "hello world" 0 5}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello');
        });

        test('should extract substring from middle', async () => {
            const template = '{{string.substring "hello world" 6 5}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('world');
        });

        test('should handle length beyond string end', async () => {
            const template = '{{string.substring "hello" 0 10}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello');
        });

        test('should handle zero length', async () => {
            const template = '{{string.substring "hello" 0 0}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('');
        });

        test('should work with variables', async () => {
            const template = '{{let email="user@example.com"}}{{string.substring vars.email 0 4}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('user');
        });

        test('should handle wrong number of args (return original string)', async () => {
            const template = '{{string.substring "hello" 0}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello');
        });

        test('should handle invalid start/length (return original string)', async () => {
            const template = '{{string.substring "hello" "invalid" 5}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello');
        });
    });

    describe('{{string.padLeft}} Helper', () => {
        test('should pad left with character', async () => {
            const template = '{{string.padLeft "5" 3 "0"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('005');
        });

        test('should pad left with spaces', async () => {
            const template = '{{string.padLeft "42" 5 " "}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            // Don't trim - we want to verify the padding
            expect(result).toBe('   42');
        });

        test('should not pad if string is already longer', async () => {
            const template = '{{string.padLeft "hello" 3 "0"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello');
        });

        test('should handle zero length', async () => {
            const template = '{{string.padLeft "5" 0 "0"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('5');
        });

        test('should work with variables', async () => {
            const template = '{{let id="5"}}{{string.padLeft vars.id 6 "0"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('000005');
        });

        test('should handle wrong number of args (return original string)', async () => {
            const template = '{{string.padLeft "5" 3}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('5');
        });

        test('should handle invalid length (return original string)', async () => {
            const template = '{{string.padLeft "5" "invalid" "0"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('5');
        });
    });

    describe('{{string.padRight}} Helper', () => {
        test('should pad right with character', async () => {
            const template = '{{string.padRight "5" 3 "0"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('500');
        });

        test('should pad right with spaces', async () => {
            const template = '{{string.padRight "42" 5 " "}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            // Don't trim - we want to verify the padding
            expect(result).toBe('42   ');
        });

        test('should not pad if string is already longer', async () => {
            const template = '{{string.padRight "hello" 3 "0"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('hello');
        });

        test('should handle zero length', async () => {
            const template = '{{string.padRight "5" 0 "0"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('5');
        });

        test('should work with variables', async () => {
            const template = '{{let name="John"}}{{string.padRight vars.name 10 " "}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            // Don't trim - we want to verify the padding
            expect(result).toBe('John      ');
        });

        test('should handle wrong number of args (return original string)', async () => {
            const template = '{{string.padRight "5" 3}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('5');
        });

        test('should handle invalid length (return original string)', async () => {
            const template = '{{string.padRight "5" "invalid" "0"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('5');
        });
    });

    describe('{{string.startsWith}} Helper', () => {
        test('should return true when string starts with prefix', async () => {
            const template = '{{string.startsWith "hello" "he"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });

        test('should return false when string does not start with prefix', async () => {
            const template = '{{string.startsWith "hello" "lo"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('false');
        });

        test('should return true for exact match', async () => {
            const template = '{{string.startsWith "hello" "hello"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });

        test('should return true for empty prefix', async () => {
            const template = '{{string.startsWith "hello" ""}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });

        test('should work with variables', async () => {
            const template = '{{let path="/admin/users"}}{{string.startsWith vars.path "/admin"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });

        test('should handle wrong number of args (return false)', async () => {
            const template = '{{string.startsWith "hello"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('false');
        });
    });

    describe('{{string.endsWith}} Helper', () => {
        test('should return true when string ends with suffix', async () => {
            const template = '{{string.endsWith "hello" "lo"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });

        test('should return false when string does not end with suffix', async () => {
            const template = '{{string.endsWith "hello" "he"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('false');
        });

        test('should return true for exact match', async () => {
            const template = '{{string.endsWith "hello" "hello"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });

        test('should return true for empty suffix', async () => {
            const template = '{{string.endsWith "hello" ""}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });

        test('should work with variables', async () => {
            const template = '{{let email="user@example.com"}}{{string.endsWith vars.email "@example.com"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });

        test('should handle wrong number of args (return false)', async () => {
            const template = '{{string.endsWith "hello"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('false');
        });
    });

    describe('{{string.contains}} Helper', () => {
        test('should return true when string contains substring', async () => {
            const template = '{{string.contains "hello" "ell"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });

        test('should return false when string does not contain substring', async () => {
            const template = '{{string.contains "hello" "xyz"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('false');
        });

        test('should return true for exact match', async () => {
            const template = '{{string.contains "hello" "hello"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });

        test('should return true for empty substring', async () => {
            const template = '{{string.contains "hello" ""}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });

        test('should work with variables', async () => {
            const template = '{{let email="user@example.com"}}{{string.contains vars.email "@"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });

        test('should handle wrong number of args (return false)', async () => {
            const template = '{{string.contains "hello"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('false');
        });
    });

    describe('Nested Expressions', () => {
        test('should work with nested string operations', async () => {
            const template = '{{string.concat "themes/" (string.default vars.theme "light") ".css"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('themes/light.css');
        });

        test('should work in conditionals', async () => {
            const template = '{{#if (string.startsWith "/admin/users" "/admin")}}Admin{{else}}Public{{/if}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            // string.startsWith returns "true" which is truthy
            expect(result.trim()).toBe('Admin');
        });

        test('should work with complex nested expressions', async () => {
            // Test replace with nested concat (without spaces in subexpression result)
            const template = '{{string.replace (string.concat "hello" "-" "world") "world" "jPulse"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            // string.concat should produce "hello-world", then replace "world" with "jPulse"
            expect(result.trim()).toBe('hello-jPulse');
        });

        test('should work with string and math helpers together', async () => {
            const template = '{{string.padLeft (string.concat (math.add 1 2) "") 3 "0"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('003');
        });
    });
});

// EOF webapp/tests/unit/controller/handlebar-string-helpers.test.js
