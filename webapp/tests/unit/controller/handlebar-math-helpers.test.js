/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Handlebar Math Helpers
 * @tagline         Unit tests for W-128: Math helpers (math.add, math.subtract, math.multiply, math.divide, math.mod, math.round, math.floor, math.ceil, math.min, math.max)
 * @description     Tests for math helpers with variadic support and error handling
 * @file            webapp/tests/unit/controller/handlebar-math-helpers.test.js
 * @version         1.6.9
 * @release         2026-02-06
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.2, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

describe('W-128: Handlebars Math Helpers', () => {
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

    describe('{{math.add}} Helper', () => {
        test('should sum two numbers', async () => {
            const template = '{{math.add 10 20}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('30');
        });

        test('should sum multiple numbers', async () => {
            const template = '{{math.add 2 4 6 8}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('20');
        });

        test('should return single arg when only one provided', async () => {
            const template = '{{math.add 42}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('42');
        });

        test('should handle string numbers with coercion', async () => {
            const template = '{{math.add "5" "10"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('15');
        });

        test('should handle invalid inputs (return 0 for invalid, sum valid)', async () => {
            const template = '{{math.add "invalid" 10}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('10'); // invalid treated as 0
        });

        test('should work with variables', async () => {
            const template = '{{let a=5 b=10}}{{math.add vars.a vars.b}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('15');
        });

        test('should work with subexpressions', async () => {
            const template = '{{math.add 2 (math.multiply 4 6)}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('26');
        });

        test('should handle negative numbers', async () => {
            const template = '{{math.add 10 -5}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('5');
        });

        test('should handle decimal numbers', async () => {
            const template = '{{math.add 1.5 2.5}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('4');
        });
    });

    describe('{{math.subtract}} Helper', () => {
        test('should subtract two numbers', async () => {
            const template = '{{math.subtract 10 3}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('7');
        });

        test('should subtract multiple numbers sequentially', async () => {
            const template = '{{math.subtract 10 3 2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('5'); // 10 - 3 - 2
        });

        test('should return single arg when only one provided', async () => {
            const template = '{{math.subtract 42}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('42');
        });

        test('should handle negative results', async () => {
            const template = '{{math.subtract 5 10}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('-5');
        });

        test('should work with variables', async () => {
            const template = '{{let a=20 b=5}}{{math.subtract vars.a vars.b}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('15');
        });

        test('should work with subexpressions', async () => {
            const template = '{{math.subtract 100 (math.multiply 10 5)}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('50');
        });
    });

    describe('{{math.multiply}} Helper', () => {
        test('should multiply two numbers', async () => {
            const template = '{{math.multiply 5 6}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('30');
        });

        test('should multiply multiple numbers', async () => {
            const template = '{{math.multiply 2 3 4}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('24');
        });

        test('should return single arg when only one provided', async () => {
            const template = '{{math.multiply 42}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('42');
        });

        test('should handle zero', async () => {
            const template = '{{math.multiply 10 0}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0');
        });

        test('should work with variables', async () => {
            const template = '{{let price=10 quantity=3}}{{math.multiply vars.price vars.quantity}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('30');
        });

        test('should work with subexpressions', async () => {
            const template = '{{math.multiply 2 (math.add 3 4)}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('14');
        });
    });

    describe('{{math.divide}} Helper', () => {
        test('should divide two numbers', async () => {
            const template = '{{math.divide 100 4}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('25');
        });

        test('should divide multiple numbers sequentially', async () => {
            const template = '{{math.divide 100 4 2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('12.5'); // 100 / 4 / 2
        });

        test('should return single arg when only one provided', async () => {
            const template = '{{math.divide 42}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('42');
        });

        test('should handle division by zero (return 0)', async () => {
            const template = '{{math.divide 10 0}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0');
        });

        test('should handle decimal results', async () => {
            const template = '{{math.divide 7 2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('3.5');
        });

        test('should work with variables', async () => {
            const template = '{{let total=100 parts=4}}{{math.divide vars.total vars.parts}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('25');
        });

        test('should work with subexpressions', async () => {
            const template = '{{math.divide (math.add 100 50) 3}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('50');
        });
    });

    describe('{{math.mod}} Helper', () => {
        test('should calculate modulo', async () => {
            const template = '{{math.mod 17 5}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('2');
        });

        test('should handle modulo with zero remainder', async () => {
            const template = '{{math.mod 20 5}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0');
        });

        test('should handle modulo by zero (return 0)', async () => {
            const template = '{{math.mod 10 0}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0');
        });

        test('should work with variables', async () => {
            const template = '{{let dividend=17 divisor=5}}{{math.mod vars.dividend vars.divisor}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('2');
        });
    });

    describe('{{math.round}} Helper', () => {
        test('should round to nearest integer', async () => {
            const template = '{{math.round 3.7}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('4');
        });

        test('should round down when .5 or less', async () => {
            const template = '{{math.round 3.4}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('3');
        });

        test('should round up when .5 or more', async () => {
            const template = '{{math.round 3.5}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('4');
        });

        test('should work with subexpressions', async () => {
            const template = '{{math.round (math.divide 22 7)}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('3');
        });

        test('should handle negative numbers', async () => {
            const template = '{{math.round -3.7}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('-4');
        });
    });

    describe('{{math.floor}} Helper', () => {
        test('should round down to integer', async () => {
            const template = '{{math.floor 3.7}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('3');
        });

        test('should round down even for .9', async () => {
            const template = '{{math.floor 3.9}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('3');
        });

        test('should work with subexpressions', async () => {
            const template = '{{math.floor (math.divide 22 7)}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('3');
        });

        test('should handle negative numbers', async () => {
            const template = '{{math.floor -3.7}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('-4');
        });
    });

    describe('{{math.ceil}} Helper', () => {
        test('should round up to integer', async () => {
            const template = '{{math.ceil 3.2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('4');
        });

        test('should round up even for .1', async () => {
            const template = '{{math.ceil 3.1}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('4');
        });

        test('should work with subexpressions', async () => {
            const template = '{{math.ceil (math.divide 22 7)}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('4');
        });

        test('should handle negative numbers', async () => {
            const template = '{{math.ceil -3.2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('-3');
        });
    });

    describe('{{math.min}} Helper', () => {
        test('should find minimum of two numbers', async () => {
            const template = '{{math.min 5 3}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('3');
        });

        test('should find minimum of multiple numbers', async () => {
            const template = '{{math.min 5 3 8 2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('2');
        });

        test('should return single arg when only one provided', async () => {
            const template = '{{math.min 42}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('42');
        });

        test('should work with variables', async () => {
            const template = '{{let price1=10 price2=5 price3=8}}{{math.min vars.price1 vars.price2 vars.price3}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('5');
        });

        test('should handle negative numbers', async () => {
            const template = '{{math.min 5 -3 8}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('-3');
        });
    });

    describe('{{math.max}} Helper', () => {
        test('should find maximum of two numbers', async () => {
            const template = '{{math.max 5 3}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('5');
        });

        test('should find maximum of multiple numbers', async () => {
            const template = '{{math.max 5 3 8 2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('8');
        });

        test('should return single arg when only one provided', async () => {
            const template = '{{math.max 42}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('42');
        });

        test('should work with variables', async () => {
            const template = '{{let score1=50 score2=75 score3=60}}{{math.max vars.score1 vars.score2 vars.score3}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('75');
        });

        test('should handle negative numbers', async () => {
            const template = '{{math.max -5 -3 -8}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('-3');
        });
    });

    describe('Error Handling', () => {
        test('should handle division by zero (return 0)', async () => {
            const template = '{{math.divide 10 0}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0');
        });

        test('should handle invalid number inputs (return 0 for invalid)', async () => {
            const template = '{{math.add "not-a-number" 10}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('10'); // invalid treated as 0
        });

        test('should handle empty arguments for variadic helpers', async () => {
            const template = '{{math.add}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0');
        });

        test('should handle wrong number of args for unary helper', async () => {
            const template = '{{math.round 3.7 4.2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0'); // wrong arg count
        });

        test('should handle wrong number of args for binary helper', async () => {
            const template = '{{math.mod 17}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('0'); // wrong arg count
        });
    });

    describe('Nested Expressions', () => {
        test('should work with nested math operations', async () => {
            const template = '{{math.divide (math.add 100 50) 3}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('50');
        });

        test('should work in conditionals', async () => {
            const template = '{{#if (gt (math.add 50 50) 90)}}High{{else}}Low{{/if}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('High');
        });

        test('should work with complex nested expressions', async () => {
            const template = '{{math.add 2 (math.multiply 4 6) (math.divide 20 2)}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('36'); // 2 + 24 + 10
        });

        test('should work with rounding in nested expressions', async () => {
            const template = '{{math.round (math.divide (math.add 100 50) 3)}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(result.trim()).toBe('50');
        });
    });
});

// EOF webapp/tests/unit/controller/handlebar-math-helpers.test.js
