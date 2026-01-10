/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Handlebar Date Helpers
 * @tagline         Unit tests for W-131: Date helpers (date.now, date.parse)
 * @description     Tests for date helpers for Unix timestamp operations
 * @file            webapp/tests/unit/controller/handlebar-date-helpers.test.js
 * @version         1.4.11
 * @release         2026-01-11
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.3, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

describe('W-131: Handlebars Date Helpers', () => {
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

    describe('{{date.now}} Helper', () => {
        test('should return current Unix timestamp in milliseconds', async () => {
            const before = Date.now();
            const template = '{{date.now}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            const after = Date.now();
            const timestamp = parseInt(result.trim(), 10);

            expect(timestamp).toBeGreaterThanOrEqual(before);
            expect(timestamp).toBeLessThanOrEqual(after);
            expect(typeof timestamp).toBe('number');
        });

        test('should return timestamp as string', async () => {
            const template = '{{date.now}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            expect(typeof result.trim()).toBe('string');
            expect(/^\d+$/.test(result.trim())).toBe(true);
        });
    });

    describe('{{date.parse}} Helper', () => {
        test('should parse ISO date string to Unix timestamp', async () => {
            const isoDate = '2025-01-18T14:53:20Z';
            const template = `{{date.parse "${isoDate}"}}`;
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            const timestamp = parseInt(result.trim(), 10);
            const expected = new Date(isoDate).valueOf();

            expect(timestamp).toBe(expected);
        });

        test('should parse Date object from context', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            // Note: Handlebars may stringify Date objects, so we test with the ISO string representation
            const template = '{{date.parse testDate}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });
            const timestamp = parseInt(result.trim(), 10);

            // Date objects may be stringified by Handlebars, so we check if it's parseable
            expect(isNaN(timestamp)).toBe(false);
            expect(timestamp).toBeGreaterThan(0);
            // The timestamp should match the original date (allowing for timezone differences in string representation)
            const expectedTimestamp = testDate.valueOf();
            expect(Math.abs(timestamp - expectedTimestamp)).toBeLessThan(1000); // Allow 1 second difference for timezone parsing
        });

        test('should return timestamp number as-is', async () => {
            const timestamp = 1737216000000; // 2025-01-18T14:53:20Z
            const template = `{{date.parse ${timestamp}}}`;
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            const parsed = parseInt(result.trim(), 10);

            expect(parsed).toBe(timestamp);
        });

        test('should handle invalid date string', async () => {
            const template = '{{date.parse "invalid-date"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            expect(result.trim()).toBe('');
        });

        test('should handle empty value', async () => {
            const template = '{{date.parse}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            expect(result.trim()).toBe('');
        });

        test('should handle null value', async () => {
            const template = '{{date.parse nullValue}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                nullValue: null
            });

            expect(result.trim()).toBe('');
        });

        test('should work with broadcast.enabledAt in context', async () => {
            const enabledAt = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.parse siteConfig.broadcast.enabledAt}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                siteConfig: {
                    broadcast: {
                        enabledAt: enabledAt
                    }
                }
            });
            const timestamp = parseInt(result.trim(), 10);

            // Date objects may be stringified by Handlebars, so we check if it's parseable
            expect(isNaN(timestamp)).toBe(false);
            expect(timestamp).toBeGreaterThan(0);
            // The timestamp should match the original date (allowing for timezone differences in string representation)
            const expectedTimestamp = enabledAt.valueOf();
            expect(Math.abs(timestamp - expectedTimestamp)).toBeLessThan(1000); // Allow 1 second difference for timezone parsing
        });
    });

    describe('{{date.format}} Helper', () => {
        test('should return current time in ISO format when no arguments', async () => {
            const before = new Date();
            const template = '{{date.format}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            const after = new Date();

            expect(result.trim()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            const parsed = new Date(result.trim());
            expect(parsed.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(parsed.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        test('should format date value to ISO format (default)', async () => {
            const testDate = new Date('2025-01-18T14:53:20.123Z');
            const template = '{{date.format testDate}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });

            expect(result.trim()).toBe('2025-01-18T14:53:20.123Z');
        });

        test('should format date value with %DATE% token', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.format testDate format="%DATE%"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });

            expect(result.trim()).toBe('2025-01-18');
        });

        test('should format date value with %TIME% token', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.format testDate format="%TIME%"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });

            expect(result.trim()).toBe('14:53:20');
        });

        test('should format date value with %DATETIME% token', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.format testDate format="%DATETIME%"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });

            expect(result.trim()).toBe('2025-01-18 14:53:20');
        });

        test('should format date value with individual tokens', async () => {
            const testDate = new Date('2025-01-18T14:53:20.123Z');
            const template = '{{date.format testDate format="%Y%-%M%-%D% %H%:%MIN%:%SEC%.%MS%"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });

            expect(result.trim()).toBe('2025-01-18 14:53:20.123');
        });

        test('should format timestamp number', async () => {
            const timestamp = 1737212000123; // 2025-01-18T14:53:20.123Z
            const template = `{{date.format ${timestamp} format="%DATE%"}}`;
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            expect(result.trim()).toBe('2025-01-18');
        });

        test('should format ISO string', async () => {
            const isoString = '2025-01-18T14:53:20Z';
            const template = `{{date.format "${isoString}" format="%DATE%"}}`;
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            expect(result.trim()).toBe('2025-01-18');
        });

        test('should handle invalid date', async () => {
            const template = '{{date.format "invalid-date" format="%DATE%"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            expect(result.trim()).toBe('');
        });

        test('should handle empty string', async () => {
            const template = '{{date.format "" format="%DATE%"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            expect(result.trim()).toBe('');
        });

        test('should use %ISO% token explicitly', async () => {
            const testDate = new Date('2025-01-18T14:53:20.123Z');
            const template = '{{date.format testDate format="%ISO%"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });

            expect(result.trim()).toBe('2025-01-18T14:53:20.123Z');
        });
    });
});

// EOF webapp/tests/unit/controller/handlebar-date-helpers.test.js
