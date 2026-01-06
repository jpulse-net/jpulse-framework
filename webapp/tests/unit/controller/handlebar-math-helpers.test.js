/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Handlebar Math Helpers
 * @tagline         Unit tests for W-127: Math helpers (add, subtract, multiply, divide, mod, round, floor, ceil, min, max)
 * @description     Tests for math helpers with variadic support and error handling
 * @file            webapp/tests/unit/controller/handlebar-math-helpers.test.js
 * @version         1.4.7
 * @release         2026-01-07
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.2, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

describe('W-127: Handlebars Math Helpers', () => {
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

    describe('{{add}} Helper', () => {
        test('should sum two numbers', async () => {
            const template = '{{add 10 20}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('30');
        });

        test('should sum multiple numbers', async () => {
            const template = '{{add 2 4 6 8}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('20');
        });

        test('should return single arg when only one provided', async () => {
            const template = '{{add 42}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('42');
        });

        test('should handle string numbers with coercion', async () => {
            const template = '{{add "5" "10"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('15');
        });

        test('should handle invalid inputs (return 0 for invalid, sum valid)', async () => {
            const template = '{{add "invalid" 10}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('10'); // invalid treated as 0
        });

        test('should work with variables', async () => {
            const template = '{{let a=5 b=10}}{{add vars.a vars.b}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('15');
        });

        test('should work with subexpressions', async () => {
            const template = '{{add 2 (multiply 4 6)}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('26');
        });

        test('should handle negative numbers', async () => {
            const template = '{{add 10 -5}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('5');
        });

        test('should handle decimal numbers', async () => {
            const template = '{{add 1.5 2.5}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('4');
        });
    });

    describe('{{subtract}} Helper', () => {
        test('should subtract two numbers', async () => {
            const template = '{{subtract 10 3}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('7');
        });

        test('should subtract multiple numbers sequentially', async () => {
            const template = '{{subtract 10 3 2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('5'); // 10 - 3 - 2
        });

        test('should return single arg when only one provided', async () => {
            const template = '{{subtract 42}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('42');
        });

        test('should handle negative results', async () => {
            const template = '{{subtract 5 10}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('-5');
        });

        test('should work with variables', async () => {
            const template = '{{let a=20 b=5}}{{subtract vars.a vars.b}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('15');
        });

        test('should work with subexpressions', async () => {
            const template = '{{subtract 100 (multiply 10 5)}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('50');
        });
    });

    describe('{{multiply}} Helper', () => {
        test('should multiply two numbers', async () => {
            const template = '{{multiply 5 6}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('30');
        });

        test('should multiply multiple numbers', async () => {
            const template = '{{multiply 2 3 4}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('24');
        });

        test('should return single arg when only one provided', async () => {
            const template = '{{multiply 42}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('42');
        });

        test('should handle zero', async () => {
            const template = '{{multiply 10 0}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0');
        });

        test('should work with variables', async () => {
            const template = '{{let price=10 quantity=3}}{{multiply vars.price vars.quantity}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('30');
        });

        test('should work with subexpressions', async () => {
            const template = '{{multiply 2 (add 3 4)}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('14');
        });
    });

    describe('{{divide}} Helper', () => {
        test('should divide two numbers', async () => {
            const template = '{{divide 100 4}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('25');
        });

        test('should divide multiple numbers sequentially', async () => {
            const template = '{{divide 100 4 2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('12.5'); // 100 / 4 / 2
        });

        test('should return single arg when only one provided', async () => {
            const template = '{{divide 42}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('42');
        });

        test('should handle division by zero (return 0)', async () => {
            const template = '{{divide 10 0}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0');
        });

        test('should handle decimal results', async () => {
            const template = '{{divide 7 2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('3.5');
        });

        test('should work with variables', async () => {
            const template = '{{let total=100 parts=4}}{{divide vars.total vars.parts}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('25');
        });

        test('should work with subexpressions', async () => {
            const template = '{{divide (add 100 50) 3}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('50');
        });
    });

    describe('{{mod}} Helper', () => {
        test('should calculate modulo', async () => {
            const template = '{{mod 17 5}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('2');
        });

        test('should handle modulo with zero remainder', async () => {
            const template = '{{mod 20 5}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0');
        });

        test('should handle modulo by zero (return 0)', async () => {
            const template = '{{mod 10 0}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0');
        });

        test('should work with variables', async () => {
            const template = '{{let dividend=17 divisor=5}}{{mod vars.dividend vars.divisor}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('2');
        });
    });

    describe('{{round}} Helper', () => {
        test('should round to nearest integer', async () => {
            const template = '{{round 3.7}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('4');
        });

        test('should round down when .5 or less', async () => {
            const template = '{{round 3.4}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('3');
        });

        test('should round up when .5 or more', async () => {
            const template = '{{round 3.5}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('4');
        });

        test('should work with subexpressions', async () => {
            const template = '{{round (divide 22 7)}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('3');
        });

        test('should handle negative numbers', async () => {
            const template = '{{round -3.7}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('-4');
        });
    });

    describe('{{floor}} Helper', () => {
        test('should round down to integer', async () => {
            const template = '{{floor 3.7}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('3');
        });

        test('should round down even for .9', async () => {
            const template = '{{floor 3.9}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('3');
        });

        test('should work with subexpressions', async () => {
            const template = '{{floor (divide 22 7)}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('3');
        });

        test('should handle negative numbers', async () => {
            const template = '{{floor -3.7}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('-4');
        });
    });

    describe('{{ceil}} Helper', () => {
        test('should round up to integer', async () => {
            const template = '{{ceil 3.2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('4');
        });

        test('should round up even for .1', async () => {
            const template = '{{ceil 3.1}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('4');
        });

        test('should work with subexpressions', async () => {
            const template = '{{ceil (divide 22 7)}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('4');
        });

        test('should handle negative numbers', async () => {
            const template = '{{ceil -3.2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('-3');
        });
    });

    describe('{{min}} Helper', () => {
        test('should find minimum of two numbers', async () => {
            const template = '{{min 5 3}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('3');
        });

        test('should find minimum of multiple numbers', async () => {
            const template = '{{min 5 3 8 2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('2');
        });

        test('should return single arg when only one provided', async () => {
            const template = '{{min 42}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('42');
        });

        test('should work with variables', async () => {
            const template = '{{let price1=10 price2=5 price3=8}}{{min vars.price1 vars.price2 vars.price3}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('5');
        });

        test('should handle negative numbers', async () => {
            const template = '{{min 5 -3 8}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('-3');
        });
    });

    describe('{{max}} Helper', () => {
        test('should find maximum of two numbers', async () => {
            const template = '{{max 5 3}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('5');
        });

        test('should find maximum of multiple numbers', async () => {
            const template = '{{max 5 3 8 2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('8');
        });

        test('should return single arg when only one provided', async () => {
            const template = '{{max 42}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('42');
        });

        test('should work with variables', async () => {
            const template = '{{let score1=50 score2=75 score3=60}}{{max vars.score1 vars.score2 vars.score3}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('75');
        });

        test('should handle negative numbers', async () => {
            const template = '{{max -5 -3 -8}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('-3');
        });
    });

    describe('Error Handling', () => {
        test('should handle division by zero (return 0)', async () => {
            const template = '{{divide 10 0}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0');
        });

        test('should handle invalid number inputs (return 0 for invalid)', async () => {
            const template = '{{add "not-a-number" 10}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('10'); // invalid treated as 0
        });

        test('should handle empty arguments for variadic helpers', async () => {
            const template = '{{add}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0');
        });

        test('should handle wrong number of args for unary helper', async () => {
            const template = '{{round 3.7 4.2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0'); // wrong arg count
        });

        test('should handle wrong number of args for binary helper', async () => {
            const template = '{{mod 17}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0'); // wrong arg count
        });
    });

    describe('Nested Expressions', () => {
        test('should work with nested math operations', async () => {
            const template = '{{divide (add 100 50) 3}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('50');
        });

        test('should work in conditionals', async () => {
            const template = '{{#if (gt (add 50 50) 90)}}High{{else}}Low{{/if}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('High');
        });

        test('should work with complex nested expressions', async () => {
            const template = '{{add 2 (multiply 4 6) (divide 20 2)}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('36'); // 2 + 24 + 10
        });

        test('should work with rounding in nested expressions', async () => {
            const template = '{{round (divide (add 100 50) 3)}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('50');
        });
    });
});

// EOF webapp/tests/unit/controller/handlebar-math-helpers.test.js
