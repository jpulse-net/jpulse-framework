/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Handlebar Date Helpers
 * @tagline         Unit tests for W-131: Date helpers (date.now, date.parse, date.format) and W-132: Timezone support
 * @description     Tests for date helpers for Unix timestamp operations and timezone formatting
 * @file            webapp/tests/unit/controller/handlebar-date-helpers.test.js
 * @version         1.4.15
 * @release         2026-01-15
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

            expect(result.trim()).toBe('14:53');
        });

        test('should format date value with %DATETIME% token', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.format testDate format="%DATETIME%"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });

            expect(result.trim()).toBe('2025-01-18 14:53');
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

    describe('{{date.format}} Helper - W-132: Timezone Support', () => {
        test('should format with timezone="server"', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.format testDate format="%DATETIME%" timezone="server"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });

            // Should format in server timezone (exact value depends on server TZ)
            expect(result.trim()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
        });

        test('should format with timezone="browser" when cookie is set', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const mockReqWithCookie = {
                ...mockReq,
                cookies: { timezone: 'America/New_York' },
                baseContext: undefined // Clear any cached context to force rebuild
            };

            // Verify context is built with user.timezone
            const context = await HandlebarController._buildInternalContext(mockReqWithCookie);
            expect(context.user.timezone).toBe('America/New_York');

            const template = '{{date.format testDate format="%DATETIME%" timezone="browser"}}';
            const result = await HandlebarController.expandHandlebars(mockReqWithCookie, template, {
                testDate: testDate
            });

            // Should format in browser timezone (America/New_York = UTC-5 in January)
            // 14:53 UTC = 09:53 EST
            expect(result.trim()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
            // Verify it's different from UTC (which would be 14:53) - should be converted to EST
            expect(result.trim()).not.toContain('14:53');
            // Verify it contains a valid time (not empty)
            expect(result.trim()).toMatch(/\d{2}:\d{2}/);
        });

        test('should format with timezone="browser" when cookie is not set (fallback to server)', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.format testDate format="%DATETIME%" timezone="browser"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });

            // Should fallback to server timezone
            expect(result.trim()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
        });

        test('should format with timezone="browser" using manual cookie parsing', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const mockReqWithHeaderCookie = {
                ...mockReq,
                headers: { cookie: 'timezone=America/Los_Angeles' },
                cookies: undefined // Simulate no cookie-parser
            };
            const template = '{{date.format testDate format="%DATETIME%" timezone="browser"}}';
            const result = await HandlebarController.expandHandlebars(mockReqWithHeaderCookie, template, {
                testDate: testDate
            });

            // Should format in browser timezone (America/Los_Angeles = UTC-8 in January)
            expect(result.trim()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
        });

        test('should format with specific IANA timezone', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const mockReqFresh = {
                ...mockReq,
                baseContext: undefined // Clear any cached context
            };
            const template = '{{date.format testDate format="%DATETIME%" timezone="America/New_York"}}';
            const result = await HandlebarController.expandHandlebars(mockReqFresh, template, {
                testDate: testDate
            });

            // Should format in America/New_York timezone (UTC-5 in January)
            // 14:53 UTC = 09:53 EST
            expect(result.trim()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
            // Verify it's converted to EST (not UTC 14:53)
            expect(result.trim()).not.toContain('14:53');
            // Verify it contains a valid time (not empty)
            expect(result.trim()).toMatch(/\d{2}:\d{2}/);
        });

        test('should format ISO with timezone offset for non-UTC timezone', async () => {
            const testDate = new Date('2025-01-18T14:53:20.123Z');
            const template = '{{date.format testDate format="%ISO%" timezone="America/New_York"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });

            // Should include timezone offset (America/New_York = UTC-5 in January)
            expect(result.trim()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);
            expect(result.trim()).toContain('-05:00');
        });

        test('should format ISO with positive timezone offset', async () => {
            const testDate = new Date('2025-01-18T14:53:20.123Z');
            const template = '{{date.format testDate format="%ISO%" timezone="Asia/Tokyo"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });

            // Should include positive timezone offset (Asia/Tokyo = UTC+9)
            expect(result.trim()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+\d{2}:\d{2}$/);
            expect(result.trim()).toContain('+09:00');
        });

        test('should format ISO with UTC (no offset) when no timezone specified', async () => {
            const testDate = new Date('2025-01-18T14:53:20.123Z');
            const template = '{{date.format testDate format="%ISO%"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });

            // Should use UTC (Z suffix)
            expect(result.trim()).toBe('2025-01-18T14:53:20.123Z');
        });

        test('should format with timezone="client" (alias for browser)', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const mockReqWithCookie = {
                ...mockReq,
                cookies: { timezone: 'Europe/London' }
            };
            const template = '{{date.format testDate format="%DATETIME%" timezone="client"}}';
            const result = await HandlebarController.expandHandlebars(mockReqWithCookie, template, {
                testDate: testDate
            });

            expect(result.trim()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
        });

        test('should format with timezone="user" (alias for browser)', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const mockReqWithCookie = {
                ...mockReq,
                cookies: { timezone: 'Europe/Paris' }
            };
            const template = '{{date.format testDate format="%DATETIME%" timezone="user"}}';
            const result = await HandlebarController.expandHandlebars(mockReqWithCookie, template, {
                testDate: testDate
            });

            expect(result.trim()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
        });

        test('should format with timezone="view" (alias for browser)', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const mockReqWithCookie = {
                ...mockReq,
                cookies: { timezone: 'Australia/Sydney' }
            };
            const template = '{{date.format testDate format="%DATETIME%" timezone="view"}}';
            const result = await HandlebarController.expandHandlebars(mockReqWithCookie, template, {
                testDate: testDate
            });

            expect(result.trim()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
        });

        test('should handle invalid timezone gracefully (fallback to UTC)', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.format testDate format="%ISO%" timezone="Invalid/Timezone"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });

            // Should fallback to UTC (Z suffix) when timezone is invalid
            expect(result.trim()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        });

        test('should format DATE token with timezone', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.format testDate format="%DATE%" timezone="America/New_York"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });

            // Should format date in timezone (might be different day if crossing midnight)
            expect(result.trim()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        test('should format TIME token with timezone', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const mockReqFresh = {
                ...mockReq,
                baseContext: undefined // Clear any cached context
            };
            const template = '{{date.format testDate format="%TIME%" timezone="America/New_York"}}';
            const result = await HandlebarController.expandHandlebars(mockReqFresh, template, {
                testDate: testDate
            });

            // Should format time in timezone (14:53 UTC = 09:53 EST)
            expect(result.trim()).toMatch(/^\d{2}:\d{2}$/);
            // Verify it's converted to EST (not UTC 14:53)
            expect(result.trim()).not.toBe('14:53');
            // Verify it contains a valid time (not empty)
            expect(result.trim().length).toBeGreaterThan(0);
        });

        test('should format with timezone and custom format string', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.format testDate format="%Y%-%M%-%D% %H%:%MIN%" timezone="America/New_York"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });

            expect(result.trim()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
        });
    });

    describe('{{date.fromNow}} Helper - W-132: Relative Time Formatting', () => {
        test('should format future date with default format (long 2)', async () => {
            const futureDate = new Date(Date.now() + (6 * 24 * 60 * 60 * 1000) + (13 * 60 * 60 * 1000)); // 6 days, 13 hours from now
            const template = '{{date.fromNow testDate}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: futureDate
            });

            expect(result.trim()).toMatch(/^in \d+ days?, \d+ hours?$/);
        });

        test('should format past date with default format (long 2)', async () => {
            const pastDate = new Date(Date.now() - (2 * 60 * 60 * 1000) - (30 * 60 * 1000)); // 2 hours, 30 minutes ago
            const template = '{{date.fromNow testDate}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: pastDate
            });

            expect(result.trim()).toMatch(/^\d+ hours?, \d+ minutes? ago$/);
        });

        test('should format with format="long 1" (single unit)', async () => {
            const futureDate = new Date(Date.now() + (6 * 24 * 60 * 60 * 1000) + (13 * 60 * 60 * 1000));
            const template = '{{date.fromNow testDate format="long 1"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: futureDate
            });

            expect(result.trim()).toMatch(/^in \d+ days?$/);
        });

        test('should format with format="long 3" (three units)', async () => {
            const futureDate = new Date(Date.now() + (6 * 24 * 60 * 60 * 1000) + (13 * 60 * 60 * 1000) + (29 * 60 * 1000));
            const template = '{{date.fromNow testDate format="long 3"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: futureDate
            });

            expect(result.trim()).toMatch(/^in \d+ days?, \d+ hours?, \d+ minutes?$/);
        });

        test('should format with format="short" (short 2 default)', async () => {
            const futureDate = new Date(Date.now() + (6 * 24 * 60 * 60 * 1000) + (13 * 60 * 60 * 1000));
            const template = '{{date.fromNow testDate format="short"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: futureDate
            });

            expect(result.trim()).toMatch(/^in \d+d \d+h$/);
        });

        test('should format with format="short 1" (single unit)', async () => {
            const futureDate = new Date(Date.now() + (6 * 24 * 60 * 60 * 1000) + (13 * 60 * 60 * 1000));
            const template = '{{date.fromNow testDate format="short 1"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: futureDate
            });

            expect(result.trim()).toMatch(/^in \d+d$/);
        });

        test('should format with format="short 3" (three units)', async () => {
            const futureDate = new Date(Date.now() + (6 * 24 * 60 * 60 * 1000) + (13 * 60 * 60 * 1000) + (29 * 60 * 1000));
            const template = '{{date.fromNow testDate format="short 3"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: futureDate
            });

            expect(result.trim()).toMatch(/^in \d+d \d+h \d+m$/);
        });

        test('should format with format="long" (long 2 default)', async () => {
            const futureDate = new Date(Date.now() + (6 * 24 * 60 * 60 * 1000) + (13 * 60 * 60 * 1000));
            const template = '{{date.fromNow testDate format="long"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: futureDate
            });

            expect(result.trim()).toMatch(/^in \d+ days?, \d+ hours?$/);
        });

        test('should handle very recent past date (< 1 second)', async () => {
            const recentDate = new Date(Date.now() - 500); // 500ms ago
            const template = '{{date.fromNow testDate format="long"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: recentDate
            });

            // Translation file has "moments ago", but fallback is "just now"
            expect(result.trim()).toMatch(/^(moments ago|just now)$/);
        });

        test('should handle very recent future date (< 1 second)', async () => {
            const recentDate = new Date(Date.now() + 500); // 500ms from now
            const template = '{{date.fromNow testDate format="long"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: recentDate
            });

            expect(result.trim()).toBe('in a moment');
        });

        test('should handle very recent past date with short format', async () => {
            const recentDate = new Date(Date.now() - 500);
            const template = '{{date.fromNow testDate format="short"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: recentDate
            });

            expect(result.trim()).toBe('0s ago');
        });

        test('should handle very recent future date with short format', async () => {
            const recentDate = new Date(Date.now() + 500);
            const template = '{{date.fromNow testDate format="short"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: recentDate
            });

            expect(result.trim()).toBe('in 0s');
        });

        test('should format timestamp number', async () => {
            const futureTimestamp = Date.now() + (2 * 60 * 60 * 1000); // 2 hours from now
            const template = `{{date.fromNow ${futureTimestamp} format="long 1"}}`;
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            expect(result.trim()).toMatch(/^in \d+ hours?$/);
        });

        test('should format ISO string', async () => {
            const futureDate = new Date(Date.now() + (3 * 24 * 60 * 60 * 1000));
            const isoString = futureDate.toISOString();
            const template = `{{date.fromNow "${isoString}" format="long 1"}}`;
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            expect(result.trim()).toMatch(/^in \d+ days?$/);
        });

        test('should handle invalid date', async () => {
            const template = '{{date.fromNow "invalid-date"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            expect(result.trim()).toBe('');
        });

        test('should handle empty string', async () => {
            const template = '{{date.fromNow ""}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            expect(result.trim()).toBe('');
        });

        test('should handle null value', async () => {
            const template = '{{date.fromNow nullValue}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                nullValue: null
            });

            expect(result.trim()).toBe('');
        });

        test('should handle missing argument (returns empty)', async () => {
            const template = '{{date.fromNow}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            expect(result.trim()).toBe('');
        });

        test('should format hours and minutes for past date', async () => {
            const pastDate = new Date(Date.now() - (5 * 60 * 60 * 1000) - (30 * 60 * 1000)); // 5 hours, 30 minutes ago
            const template = '{{date.fromNow testDate format="long 2"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: pastDate
            });

            expect(result.trim()).toMatch(/^\d+ hours?, \d+ minutes? ago$/);
        });

        test('should format days and hours for future date with short format', async () => {
            const futureDate = new Date(Date.now() + (2 * 24 * 60 * 60 * 1000) + (5 * 60 * 60 * 1000)); // 2 days, 5 hours from now
            const template = '{{date.fromNow testDate format="short 2"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: futureDate
            });

            expect(result.trim()).toMatch(/^in \d+d \d+h$/);
        });
    });

    describe('{{date.add}} Helper', () => {
        test('should add days to a date', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.add testDate value=7 unit="days"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });
            const timestamp = parseInt(result.trim(), 10);
            const expected = new Date('2025-01-25T14:53:20Z').getTime();

            expect(timestamp).toBe(expected);
        });

        test('should subtract days from a date (negative value)', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.add testDate value=-7 unit="days"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });
            const timestamp = parseInt(result.trim(), 10);
            const expected = new Date('2025-01-11T14:53:20Z').getTime();

            expect(timestamp).toBe(expected);
        });

        test('should add hours to a date', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.add testDate value=5 unit="hours"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });
            const timestamp = parseInt(result.trim(), 10);
            const expected = new Date('2025-01-18T19:53:20Z').getTime();

            expect(timestamp).toBe(expected);
        });

        test('should add months to a date', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.add testDate value=2 unit="months"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });
            const timestamp = parseInt(result.trim(), 10);
            // JavaScript setMonth() may be affected by DST, so calculate expected value
            const expectedDate = new Date(testDate);
            expectedDate.setMonth(expectedDate.getMonth() + 2);
            const expected = expectedDate.getTime();

            expect(timestamp).toBe(expected);
        });

        test('should add years to a date', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.add testDate value=1 unit="years"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });
            const timestamp = parseInt(result.trim(), 10);
            const expected = new Date('2026-01-18T14:53:20Z').getTime();

            expect(timestamp).toBe(expected);
        });

        test('should add weeks to a date', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.add testDate value=2 unit="weeks"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });
            const timestamp = parseInt(result.trim(), 10);
            const expected = new Date('2025-02-01T14:53:20Z').getTime();

            expect(timestamp).toBe(expected);
        });

        test('should add minutes to a date', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.add testDate value=30 unit="minutes"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });
            const timestamp = parseInt(result.trim(), 10);
            const expected = new Date('2025-01-18T15:23:20Z').getTime();

            expect(timestamp).toBe(expected);
        });

        test('should add seconds to a date', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.add testDate value=45 unit="seconds"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });
            const timestamp = parseInt(result.trim(), 10);
            const expected = new Date('2025-01-18T14:54:05Z').getTime();

            expect(timestamp).toBe(expected);
        });

        test('should add milliseconds to a date', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.add testDate value=500 unit="milliseconds"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });
            const timestamp = parseInt(result.trim(), 10);
            const expected = new Date('2025-01-18T14:53:20.500Z').getTime();

            expect(timestamp).toBe(expected);
        });

        test('should use current time if no date provided', async () => {
            const before = Date.now();
            const template = '{{date.add value=1 unit="days"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            const after = Date.now();
            const timestamp = parseInt(result.trim(), 10);
            const expectedBefore = before + (24 * 60 * 60 * 1000);
            const expectedAfter = after + (24 * 60 * 60 * 1000);

            expect(timestamp).toBeGreaterThanOrEqual(expectedBefore);
            expect(timestamp).toBeLessThanOrEqual(expectedAfter);
        });

        test('should handle ISO date string', async () => {
            const template = '{{date.add "2025-01-18T14:53:20Z" value=7 unit="days"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            const timestamp = parseInt(result.trim(), 10);
            const expected = new Date('2025-01-25T14:53:20Z').getTime();

            expect(timestamp).toBe(expected);
        });

        test('should handle timestamp number', async () => {
            const testTimestamp = new Date('2025-01-18T14:53:20Z').getTime();
            const template = `{{date.add ${testTimestamp} value=7 unit="days"}}`;
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            const timestamp = parseInt(result.trim(), 10);
            const expected = new Date('2025-01-25T14:53:20Z').getTime();

            expect(timestamp).toBe(expected);
        });

        test('should handle singular unit names', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.add testDate value=7 unit="day"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });
            const timestamp = parseInt(result.trim(), 10);
            const expected = new Date('2025-01-25T14:53:20Z').getTime();

            expect(timestamp).toBe(expected);
        });

        test('should return empty string for invalid date', async () => {
            const template = '{{date.add "invalid-date" value=7 unit="days"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});

            expect(result.trim()).toBe('');
        });

        test('should return empty string for missing value parameter', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.add testDate unit="days"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });

            expect(result.trim()).toBe('');
        });

        test('should return empty string for missing unit parameter', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.add testDate value=7}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });

            expect(result.trim()).toBe('');
        });

        test('should return empty string for invalid unit', async () => {
            const testDate = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.add testDate value=7 unit="invalid"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });

            expect(result.trim()).toBe('');
        });

        test('should handle month overflow correctly', async () => {
            const testDate = new Date('2025-01-31T14:53:20Z');
            const template = '{{date.add testDate value=1 unit="months"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                testDate: testDate
            });
            const timestamp = parseInt(result.trim(), 10);
            // JavaScript setMonth() rolls over to next month when day doesn't exist
            // January 31 + 1 month = March 3 (Feb 31 doesn't exist, so it rolls to March)
            const expectedDate = new Date(testDate);
            expectedDate.setMonth(expectedDate.getMonth() + 1);
            const expected = expectedDate.getTime();

            expect(timestamp).toBe(expected);
        });
    });

    describe('{{date.diff}} Helper', () => {
        test('should calculate difference in days', async () => {
            const date1 = new Date('2025-01-18T14:53:20Z');
            const date2 = new Date('2025-01-25T14:53:20Z');
            const template = '{{date.diff date1 date2 unit="days"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                date1: date1,
                date2: date2
            });
            const diff = parseFloat(result.trim());

            expect(diff).toBe(7);
        });

        test('should calculate negative difference when first date is later', async () => {
            const date1 = new Date('2025-01-25T14:53:20Z');
            const date2 = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.diff date1 date2 unit="days"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                date1: date1,
                date2: date2
            });
            const diff = parseFloat(result.trim());

            expect(diff).toBe(-7);
        });

        test('should calculate difference in hours', async () => {
            const date1 = new Date('2025-01-18T14:53:20Z');
            const date2 = new Date('2025-01-18T19:53:20Z');
            const template = '{{date.diff date1 date2 unit="hours"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                date1: date1,
                date2: date2
            });
            const diff = parseFloat(result.trim());

            expect(diff).toBe(5);
        });

        test('should calculate difference in minutes', async () => {
            const date1 = new Date('2025-01-18T14:53:20Z');
            const date2 = new Date('2025-01-18T14:58:20Z');
            const template = '{{date.diff date1 date2 unit="minutes"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                date1: date1,
                date2: date2
            });
            const diff = parseFloat(result.trim());

            expect(diff).toBe(5);
        });

        test('should calculate difference in seconds', async () => {
            const date1 = new Date('2025-01-18T14:53:20Z');
            const date2 = new Date('2025-01-18T14:53:25Z');
            const template = '{{date.diff date1 date2 unit="seconds"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                date1: date1,
                date2: date2
            });
            const diff = parseFloat(result.trim());

            expect(diff).toBe(5);
        });

        test('should calculate difference in milliseconds (default)', async () => {
            const date1 = new Date('2025-01-18T14:53:20Z');
            const date2 = new Date('2025-01-18T14:53:20.500Z');
            const template = '{{date.diff date1 date2}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                date1: date1,
                date2: date2
            });
            const diff = parseInt(result.trim(), 10);

            expect(diff).toBe(500);
        });

        test('should calculate difference in weeks', async () => {
            const date1 = new Date('2025-01-18T14:53:20Z');
            const date2 = new Date('2025-02-01T14:53:20Z');
            const template = '{{date.diff date1 date2 unit="weeks"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                date1: date1,
                date2: date2
            });
            const diff = parseFloat(result.trim());

            expect(Math.round(diff)).toBe(2);
        });

        test('should calculate difference in months (approximate)', async () => {
            const date1 = new Date('2025-01-18T14:53:20Z');
            const date2 = new Date('2025-03-18T14:53:20Z');
            const template = '{{date.diff date1 date2 unit="months"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                date1: date1,
                date2: date2
            });
            const diff = parseFloat(result.trim());

            // Approximate: should be close to 2 months
            expect(diff).toBeGreaterThan(1.9);
            expect(diff).toBeLessThan(2.1);
        });

        test('should calculate difference in years (approximate)', async () => {
            const date1 = new Date('2025-01-18T14:53:20Z');
            const date2 = new Date('2026-01-18T14:53:20Z');
            const template = '{{date.diff date1 date2 unit="years"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                date1: date1,
                date2: date2
            });
            const diff = parseFloat(result.trim());

            // Approximate: should be close to 1 year
            expect(diff).toBeGreaterThan(0.99);
            expect(diff).toBeLessThan(1.01);
        });

        test('should use current time as second date if only one date provided', async () => {
            const date1 = new Date(Date.now() - (24 * 60 * 60 * 1000)); // 1 day ago
            const template = '{{date.diff date1 unit="days"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                date1: date1
            });
            const diff = parseFloat(result.trim());

            // Should be approximately 1 day (allowing small margin for execution time)
            expect(diff).toBeGreaterThan(0.99);
            expect(diff).toBeLessThan(1.01);
        });

        test('should handle ISO date strings', async () => {
            const template = '{{date.diff "2025-01-18T14:53:20Z" "2025-01-25T14:53:20Z" unit="days"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            const diff = parseFloat(result.trim());

            expect(diff).toBe(7);
        });

        test('should handle timestamp numbers', async () => {
            const date1 = new Date('2025-01-18T14:53:20Z').getTime();
            const date2 = new Date('2025-01-25T14:53:20Z').getTime();
            const template = `{{date.diff ${date1} ${date2} unit="days"}}`;
            const result = await HandlebarController.expandHandlebars(mockReq, template, {});
            const diff = parseFloat(result.trim());

            expect(diff).toBe(7);
        });

        test('should handle singular unit names', async () => {
            const date1 = new Date('2025-01-18T14:53:20Z');
            const date2 = new Date('2025-01-25T14:53:20Z');
            const template = '{{date.diff date1 date2 unit="day"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                date1: date1,
                date2: date2
            });
            const diff = parseFloat(result.trim());

            expect(diff).toBe(7);
        });

        test('should handle ms unit alias', async () => {
            const date1 = new Date('2025-01-18T14:53:20Z');
            const date2 = new Date('2025-01-18T14:53:20.500Z');
            const template = '{{date.diff date1 date2 unit="ms"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                date1: date1,
                date2: date2
            });
            const diff = parseInt(result.trim(), 10);

            expect(diff).toBe(500);
        });

        test('should return empty string for invalid first date', async () => {
            const date2 = new Date('2025-01-25T14:53:20Z');
            const template = '{{date.diff "invalid-date" date2 unit="days"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                date2: date2
            });

            expect(result.trim()).toBe('');
        });

        test('should return empty string for invalid second date', async () => {
            const date1 = new Date('2025-01-18T14:53:20Z');
            const template = '{{date.diff date1 "invalid-date" unit="days"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                date1: date1
            });

            expect(result.trim()).toBe('');
        });

        test('should round result for non-millisecond units', async () => {
            const date1 = new Date('2025-01-18T14:53:20Z');
            const date2 = new Date('2025-01-18T14:53:20.123Z');
            const template = '{{date.diff date1 date2 unit="seconds"}}';
            const result = await HandlebarController.expandHandlebars(mockReq, template, {
                date1: date1,
                date2: date2
            });
            const diff = parseFloat(result.trim());

            // Should be rounded to 2 decimal places
            expect(diff).toBe(0.12);
        });
    });
});

// EOF webapp/tests/unit/controller/handlebar-date-helpers.test.js
