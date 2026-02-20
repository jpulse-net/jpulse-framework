/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Handlebar Array Helpers
 * @tagline         Unit tests for W-136: Array helpers (array.at, array.first, array.includes, array.isEmpty, array.join, array.last, array.length)
 * @description     Tests for array helpers with support for arrays, JSON arrays, and objects (selective)
 * @file            webapp/tests/unit/controller/handlebar-array-helpers.test.js
 * @version         1.6.20
 * @release         2026-02-20
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.3, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

describe('W-136: Handlebars Array Helpers', () => {
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

    describe('{{array.at}} Helper', () => {
        test('should get element at index 0', async () => {
            const template = '{{array.at items 0}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: ['a', 'b', 'c']
            });
            expect(result.trim()).toBe('a');
        });

        test('should get element at index 1', async () => {
            const template = '{{array.at items 1}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: ['a', 'b', 'c']
            });
            expect(result.trim()).toBe('b');
        });

        test('should get element at index 2', async () => {
            const template = '{{array.at items 2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: ['a', 'b', 'c']
            });
            expect(result.trim()).toBe('c');
        });

        test('should return empty string for out of bounds index', async () => {
            const template = '{{array.at items 5}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: ['a', 'b', 'c']
            });
            expect(result.trim()).toBe('');
        });

        test('should return empty string for negative index', async () => {
            const template = '{{array.at items -1}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: ['a', 'b', 'c']
            });
            expect(result.trim()).toBe('');
        });

        test('should work with JSON array string', async () => {
            const template = '{{array.at (json.parse \'["a","b","c"]\') 1}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('b');
        });

        test('should return empty string for objects', async () => {
            const template = '{{array.at config 0}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                config: { a: 1, b: 2 }
            });
            expect(result.trim()).toBe('');
        });

        test('should handle empty array', async () => {
            const template = '{{array.at items 0}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: []
            });
            expect(result.trim()).toBe('');
        });
    });

    describe('{{array.first}} Helper', () => {
        test('should get first element', async () => {
            const template = '{{array.first items}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: ['a', 'b', 'c']
            });
            expect(result.trim()).toBe('a');
        });

        test('should return empty string for empty array', async () => {
            const template = '{{array.first items}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: []
            });
            expect(result.trim()).toBe('');
        });

        test('should work with single element array', async () => {
            const template = '{{array.first items}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: ['only']
            });
            expect(result.trim()).toBe('only');
        });

        test('should work with JSON array string', async () => {
            const template = '{{array.first (json.parse \'["x","y","z"]\')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('x');
        });

        test('should work with context array', async () => {
            const template = '{{array.first user.roles}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                user: { roles: ['admin', 'editor'] }
            });
            expect(result.trim()).toBe('admin');
        });

        test('should return empty string for objects', async () => {
            const template = '{{array.first config}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                config: { a: 1, b: 2 }
            });
            expect(result.trim()).toBe('');
        });
    });

    describe('{{array.includes}} Helper', () => {
        test('should return true when element is found', async () => {
            const template = '{{array.includes items "b"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: ['a', 'b', 'c']
            });
            expect(result.trim()).toBe('true');
        });

        test('should return false when element is not found', async () => {
            const template = '{{array.includes items "d"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: ['a', 'b', 'c']
            });
            expect(result.trim()).toBe('false');
        });

        test('should work with user.roles use case', async () => {
            const template = '{{array.includes user.roles "admin"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                user: { roles: ['admin', 'editor', 'viewer'] }
            });
            expect(result.trim()).toBe('true');
        });

        test('should return false for empty array', async () => {
            const template = '{{array.includes items "a"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: []
            });
            expect(result.trim()).toBe('false');
        });

        test('should work with JSON array string', async () => {
            const template = '{{array.includes (json.parse \'["admin","editor"]\') "admin"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });

        test('should work in conditional', async () => {
            const template = '{{#if (array.includes user.roles "admin")}}yes{{else}}no{{/if}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                user: { roles: ['admin'] }
            });
            expect(result.trim()).toBe('yes');
        });

        test('should return false for objects', async () => {
            const template = '{{array.includes config "admin"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                config: { a: 1, b: 2 }
            });
            expect(result.trim()).toBe('false');
        });
    });

    describe('{{array.isEmpty}} Helper', () => {
        test('should return true for empty array', async () => {
            const template = '{{array.isEmpty items}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: []
            });
            expect(result.trim()).toBe('true');
        });

        test('should return false for non-empty array', async () => {
            const template = '{{array.isEmpty items}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: ['a']
            });
            expect(result.trim()).toBe('false');
        });

        test('should work with empty object', async () => {
            const template = '{{array.isEmpty config}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                config: {}
            });
            expect(result.trim()).toBe('true');
        });

        test('should work with non-empty object', async () => {
            const template = '{{array.isEmpty config}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                config: { a: 1 }
            });
            expect(result.trim()).toBe('false');
        });

        test('should work with JSON array string (empty)', async () => {
            const template = '{{array.isEmpty (json.parse \'[]\')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });

        test('should work with JSON array string (non-empty)', async () => {
            const template = '{{array.isEmpty (json.parse \'["a"]\')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('false');
        });

        test('should work with JSON object string (empty)', async () => {
            const template = '{{array.isEmpty (json.parse \'{}\')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('true');
        });

        test('should work with JSON object string (non-empty)', async () => {
            const template = '{{array.isEmpty (json.parse \'{"a":1}\')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('false');
        });

        test('should work in conditional', async () => {
            const template = '{{#if (array.isEmpty items)}}empty{{else}}not empty{{/if}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: []
            });
            expect(result.trim()).toBe('empty');
        });
    });

    describe('{{array.join}} Helper', () => {
        test('should join with comma separator', async () => {
            const template = '{{array.join items ", "}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: ['a', 'b', 'c']
            });
            expect(result.trim()).toBe('a, b, c');
        });

        test('should join with default comma separator', async () => {
            const template = '{{array.join items}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: ['a', 'b', 'c']
            });
            expect(result.trim()).toBe('a,b,c');
        });

        test('should join with custom separator', async () => {
            const template = '{{array.join items " | "}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: ['admin', 'editor', 'viewer']
            });
            expect(result.trim()).toBe('admin | editor | viewer');
        });

        test('should work with user.roles use case', async () => {
            const template = '{{array.join user.roles ", "}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                user: { roles: ['admin', 'editor'] }
            });
            expect(result.trim()).toBe('admin, editor');
        });

        test('should return empty string for empty array', async () => {
            const template = '{{array.join items ", "}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: []
            });
            expect(result.trim()).toBe('');
        });

        test('should work with single element', async () => {
            const template = '{{array.join items ", "}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: ['only']
            });
            expect(result.trim()).toBe('only');
        });

        test('should work with JSON array string', async () => {
            const template = '{{array.join (json.parse \'["x","y","z"]\') "-"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('x-y-z');
        });

        test('should return empty string for objects', async () => {
            const template = '{{array.join config ", "}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                config: { a: 1, b: 2 }
            });
            expect(result.trim()).toBe('');
        });
    });

    describe('{{array.last}} Helper', () => {
        test('should get last element', async () => {
            const template = '{{array.last items}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: ['a', 'b', 'c']
            });
            expect(result.trim()).toBe('c');
        });

        test('should return empty string for empty array', async () => {
            const template = '{{array.last items}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: []
            });
            expect(result.trim()).toBe('');
        });

        test('should work with single element array', async () => {
            const template = '{{array.last items}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: ['only']
            });
            expect(result.trim()).toBe('only');
        });

        test('should work with JSON array string', async () => {
            const template = '{{array.last (json.parse \'["x","y","z"]\')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('z');
        });

        test('should work with context array', async () => {
            const template = '{{array.last user.roles}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                user: { roles: ['admin', 'editor', 'viewer'] }
            });
            expect(result.trim()).toBe('viewer');
        });

        test('should return empty string for objects', async () => {
            const template = '{{array.last config}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                config: { a: 1, b: 2 }
            });
            expect(result.trim()).toBe('');
        });
    });

    describe('{{array.length}} Helper', () => {
        test('should return length for array', async () => {
            const template = '{{array.length items}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: ['a', 'b', 'c']
            });
            expect(result.trim()).toBe('3');
        });

        test('should return 0 for empty array', async () => {
            const template = '{{array.length items}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: []
            });
            expect(result.trim()).toBe('0');
        });

        test('should return length for object (key count)', async () => {
            const template = '{{array.length config}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                config: { a: 1, b: 2, c: 3 }
            });
            expect(result.trim()).toBe('3');
        });

        test('should return 0 for empty object', async () => {
            const template = '{{array.length config}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                config: {}
            });
            expect(result.trim()).toBe('0');
        });

        test('should work with user.roles use case', async () => {
            const template = '{{array.length user.roles}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                user: { roles: ['admin', 'editor'] }
            });
            expect(result.trim()).toBe('2');
        });

        test('should work with JSON array string', async () => {
            const template = '{{array.length (json.parse \'["a","b","c"]\')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('3');
        });

        test('should work with JSON object string', async () => {
            const template = '{{array.length (json.parse \'{"a":1,"b":2}\')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('2');
        });

        test('should work in conditional', async () => {
            const template = '{{#if (gt (array.length items) 0)}}yes{{else}}no{{/if}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: ['a', 'b']
            });
            expect(result.trim()).toBe('yes');
        });
    });

    describe('json.parse Helper', () => {
        test('should parse valid JSON array', async () => {
            const template = '{{array.length (json.parse \'["a","b","c"]\')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('3');
        });

        test('should parse valid JSON object', async () => {
            const template = '{{array.length (json.parse \'{"a":1,"b":2}\')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('2');
        });

        test('should handle JSON with whitespace', async () => {
            const template = '{{array.length (json.parse \'  ["a","b"]  \')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('2');
        });

        test('should return null for malformed JSON (missing closing bracket)', async () => {
            const template = '{{array.length (json.parse \'["a","b"\')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0'); // null is not array
        });

        test('should return null for plain strings starting with [', async () => {
            const template = '{{array.length (json.parse \'[not json\')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0'); // null is not array
        });

        test('should parse JSON from variable', async () => {
            const template = '{{array.length (json.parse vars.jsonData)}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                vars: { jsonData: '["x","y","z"]' }
            });
            expect(result.trim()).toBe('3');
        });
    });

    describe('Error Handling', () => {
        test('should handle undefined gracefully', async () => {
            const template = '{{array.length items}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0');
        });

        test('should handle null gracefully', async () => {
            const template = '{{array.length items}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: null
            });
            expect(result.trim()).toBe('0');
        });

        test('should handle string input gracefully', async () => {
            const template = '{{array.length "not an array"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0');
        });

        test('should handle number input gracefully', async () => {
            const template = '{{array.length 42}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0');
        });
    });

    describe('Subexpressions', () => {
        test('should work with nested array.length in conditional', async () => {
            const template = '{{#if (gt (array.length items) 2)}}many{{else}}few{{/if}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: ['a', 'b', 'c']
            });
            expect(result.trim()).toBe('many');
        });

        test('should work with array.includes in conditional', async () => {
            const template = '{{#if (eq (array.includes user.roles "admin") true)}}admin{{else}}not admin{{/if}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                user: { roles: ['admin', 'editor'] }
            });
            expect(result.trim()).toBe('admin');
        });

        test('should work with array.isEmpty in conditional', async () => {
            const template = '{{#if (eq (array.isEmpty items) true)}}empty{{else}}not empty{{/if}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: []
            });
            expect(result.trim()).toBe('empty');
        });

        test('should work with array.at in string.concat', async () => {
            const template = '{{string.concat "First: " (array.first items)}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: ['alpha', 'beta']
            });
            expect(result.trim()).toBe('First: alpha');
        });

        test('should work with multiple array helpers', async () => {
            const template = '{{#if (and (gt (array.length items) 0) (array.includes items "admin"))}}yes{{else}}no{{/if}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: ['admin', 'editor']
            });
            expect(result.trim()).toBe('yes');
        });
    });

    describe('{{#each}} with JSON Arrays', () => {
        test('should iterate over JSON array string', async () => {
            const template = '{{#each (json.parse \'["a","b","c"]\')}}{{this}}{{/each}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('abc');
        });

        test('should iterate over JSON object string', async () => {
            const template = '{{#each (json.parse \'{"x":1,"y":2}\')}}{{@key}}:{{this}},{{/each}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('x:1,y:2,');
        });

        test('should handle JSON array with whitespace', async () => {
            const template = '{{#each (json.parse \'  ["a","b"]  \')}}{{this}}{{/each}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('ab');
        });

        test('should not parse malformed JSON in {{#each}}', async () => {
            const template = '{{#each (json.parse \'["a","b"\')}}{{this}}{{/each}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe(''); // Not parsed, no iteration
        });
    });

    describe('Real-World Use Cases', () => {
        test('should check if user has admin role', async () => {
            const template = '{{#if (array.includes user.roles "admin")}}<button>Admin Panel</button>{{/if}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                user: { roles: ['admin', 'editor'] }
            });
            expect(result.trim()).toBe('<button>Admin Panel</button>');
        });

        test('should display role count badge', async () => {
            const template = '<span class="badge">{{array.length user.roles}}</span>';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                user: { roles: ['admin', 'editor', 'viewer'] }
            });
            expect(result.trim()).toBe('<span class="badge">3</span>');
        });

        test('should show empty state for no items', async () => {
            const template = '{{#if (array.isEmpty items)}}<p>No items found.</p>{{else}}<p>Showing {{array.length items}} items</p>{{/if}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                items: []
            });
            expect(result.trim()).toBe('<p>No items found.</p>');
        });

        test('should format list of tags', async () => {
            const template = '<p>Tags: {{array.join article.tags ", "}}</p>';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                article: { tags: ['javascript', 'nodejs', 'handlebars'] }
            });
            expect(result.trim()).toBe('<p>Tags: javascript, nodejs, handlebars</p>');
        });

        test('should show primary category', async () => {
            const template = '<p>Primary category: {{array.first product.categories}}</p>';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                product: { categories: ['electronics', 'computers', 'laptops'] }
            });
            expect(result.trim()).toBe('<p>Primary category: electronics</p>');
        });

        test('should combine multiple array helpers', async () => {
            const template = '{{#if (and (gt (array.length user.roles) 0) (array.includes user.roles "premium"))}}Premium user with {{array.length user.roles}} roles{{/if}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                user: { roles: ['premium', 'editor'] }
            });
            expect(result.trim()).toBe('Premium user with 2 roles');
        });
    });

    // W-136 Phase 2: array.concat, array.reverse, array.sort
    describe('{{array.concat}} Helper', () => {
        test('should concatenate two arrays', async () => {
            const template = '{{array.concat (json.parse \'["a","b"]\') (json.parse \'["c","d"]\')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('["a","b","c","d"]');
        });

        test('should concatenate multiple arrays', async () => {
            const template = '{{array.concat (json.parse \'["a"]\') (json.parse \'["b"]\') (json.parse \'["c"]\')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('["a","b","c"]');
        });

        test('should handle single array', async () => {
            const template = '{{array.concat (json.parse \'["a","b"]\')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('["a","b"]');
        });

        test('should skip non-array arguments with warning', async () => {
            const template = '{{array.concat (json.parse \'["a"]\') "not-array" (json.parse \'["b"]\')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('["a","b"]');
        });

        test('should return empty array for no arguments', async () => {
            const template = '{{array.concat}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('[]');
        });
    });

    describe('{{array.reverse}} Helper', () => {
        test('should reverse array', async () => {
            const template = '{{array.reverse (json.parse \'["a","b","c"]\')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('["c","b","a"]');
        });

        test('should reverse numeric array', async () => {
            const template = '{{array.reverse (json.parse \'[1,2,3]\')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('[3,2,1]');
        });

        test('should return empty array for non-array', async () => {
            const template = '{{array.reverse "not-array"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('[]');
        });

        test('should not mutate original array', async () => {
            const template = '{{let orig=(json.parse \'["a","b"]\')}}{{array.reverse vars.orig}}{{vars.orig}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('["b","a"]["a","b"]');
        });
    });

    describe('{{array.sort}} Helper - Primitives', () => {
        test('should auto-detect and sort numeric array', async () => {
            const template = '{{array.sort (json.parse \'[3,1,2]\')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('[1,2,3]');
        });

        test('should auto-detect and sort string array', async () => {
            const template = '{{array.sort (json.parse \'["c","a","b"]\')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('["a","b","c"]');
        });

        test('should force numeric sort with sortAs', async () => {
            const template = '{{array.sort (json.parse \'["10","2","1"]\') sortAs="number"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('["1","2","10"]');
        });

        test('should force string sort with sortAs', async () => {
            const template = '{{array.sort (json.parse \'[10,2,1]\') sortAs="string"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('[1,10,2]');
        });

        test('should sort in reverse with reverse=true', async () => {
            const template = '{{array.sort (json.parse \'[1,2,3]\') reverse=true}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('[3,2,1]');
        });

        test('should return empty array for non-array', async () => {
            const template = '{{array.sort "not-array"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('[]');
        });

        test('should return empty array for empty array', async () => {
            const template = '{{array.sort (json.parse \'[]\')}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('[]');
        });
    });

    describe('{{array.sort}} Helper - Objects', () => {
        test('should sort by property (auto-detect string)', async () => {
            const template = '{{array.sort (json.parse \'[{"name":"Charlie"},{"name":"Alice"},{"name":"Bob"}]\') sortBy="name"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            const parsed = JSON.parse(result.trim());
            expect(parsed[0].name).toBe('Alice');
            expect(parsed[1].name).toBe('Bob');
            expect(parsed[2].name).toBe('Charlie');
        });

        test('should sort by property (auto-detect number)', async () => {
            const template = '{{array.sort (json.parse \'[{"age":30},{"age":25},{"age":35}]\') sortBy="age"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            const parsed = JSON.parse(result.trim());
            expect(parsed[0].age).toBe(25);
            expect(parsed[1].age).toBe(30);
            expect(parsed[2].age).toBe(35);
        });

        test('should sort by nested property', async () => {
            // Simpler nested structure to avoid parser issues
            const arr = [
                {user: {name: "Charlie"}},
                {user: {name: "Alice"}},
                {user: {name: "Bob"}}
            ];
            const template = '{{array.sort items sortBy="user.name"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {items: arr});
            const parsed = JSON.parse(result.trim());
            expect(parsed[0].user.name).toBe('Alice');
            expect(parsed[1].user.name).toBe('Bob');
            expect(parsed[2].user.name).toBe('Charlie');
        });

        test('should sort by property with sortAs override', async () => {
            const template = '{{array.sort (json.parse \'[{"id":"10"},{"id":"2"},{"id":"1"}]\') sortBy="id" sortAs="number"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            const parsed = JSON.parse(result.trim());
            expect(parsed[0].id).toBe('1');
            expect(parsed[1].id).toBe('2');
            expect(parsed[2].id).toBe('10');
        });

        test('should sort by property in reverse', async () => {
            const template = '{{array.sort (json.parse \'[{"age":25},{"age":30},{"age":35}]\') sortBy="age" reverse=true}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            const parsed = JSON.parse(result.trim());
            expect(parsed[0].age).toBe(35);
            expect(parsed[1].age).toBe(30);
            expect(parsed[2].age).toBe(25);
        });

        test('should handle missing properties (sort to end)', async () => {
            const template = '{{array.sort (json.parse \'[{"name":"Bob"},{"age":30},{"name":"Alice"}]\') sortBy="name"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            const parsed = JSON.parse(result.trim());
            expect(parsed[0].name).toBe('Alice');
            expect(parsed[1].name).toBe('Bob');
            expect(parsed[2].name).toBeUndefined();
        });

        test('should handle null values (sort to end)', async () => {
            const template = '{{array.sort (json.parse \'[{"name":"Bob"},{"name":null},{"name":"Alice"}]\') sortBy="name"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            const parsed = JSON.parse(result.trim());
            expect(parsed[0].name).toBe('Alice');
            expect(parsed[1].name).toBe('Bob');
            expect(parsed[2].name).toBeNull();
        });
    });
});

// EOF webapp/tests/unit/controller/handlebar-array-helpers.test.js
