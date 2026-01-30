/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Health Controller Compliance
 * @tagline         Unit tests for W-137 compliance reporting
 * @description     Tests for compliance scheduling, gating, and state handling
 * @file            webapp/tests/unit/controller/health-compliance.test.js
 * @version         1.6.2
 * @release         2026-01-30
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.4, Claude Sonnet 4.5 & GPT-5.2
 */

import { jest } from '@jest/globals';
import HealthController from '../../../controller/health.js';

/**
 * Create fake RedisManager cache wrapper for W-143 cache API
 * Maps cache paths (category:key) to values
 */
function createFakeRedisManager(initial = {}) {
    const store = new Map(Object.entries(initial));

    return {
        isAvailable: true,
        cacheGet: jest.fn(async (category, key) => {
            const fullKey = `${category}:${key}`;
            const value = store.get(fullKey);
            return value === undefined ? null : String(value);
        }),
        cacheSet: jest.fn(async (category, key, value) => {
            const fullKey = `${category}:${key}`;
            store.set(fullKey, String(value));
            return true;
        }),
        cacheDel: jest.fn(async (category, key) => {
            const fullKey = `${category}:${key}`;
            store.delete(fullKey);
            return true;
        }),
        cacheGetObject: jest.fn(async (category, key) => {
            const fullKey = `${category}:${key}`;
            const value = store.get(fullKey);
            if (value === undefined || value === null) return null;
            try {
                return typeof value === 'string' ? JSON.parse(value) : value;
            } catch (e) {
                return null;
            }
        }),
        cacheSetObject: jest.fn(async (category, key, obj) => {
            const fullKey = `${category}:${key}`;
            store.set(fullKey, JSON.stringify(obj));
            return true;
        })
    };
}

describe('HealthController W-137 compliance', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
        delete global.RedisManager;
        delete global.LogController;
    });

    describe('_shouldSendReport()', () => {
        test('returns false outside scheduled window', async () => {
            // 2026-01-22 10:00:00Z
            jest.setSystemTime(new Date('2026-01-22T10:00:00.000Z'));

            // W-143: Use cache wrapper pattern
            global.RedisManager = createFakeRedisManager({
                'controller:compliance:timing:report_time': '07:15',
                'controller:compliance:history:last_scheduled_timestamp': '0',
                'controller:compliance:retry:next_attempt': '0'
            });

            const result = await HealthController._shouldSendReport();
            expect(result).toBe(false);
        });

        test('returns true within scheduled window if not already sent in this window', async () => {
            // 2026-01-22 07:20:00Z (within 07:15 ±30 min)
            jest.setSystemTime(new Date('2026-01-22T07:20:00.000Z'));

            // W-143: Use cache wrapper pattern
            global.RedisManager = createFakeRedisManager({
                'controller:compliance:timing:report_time': '07:15',
                'controller:compliance:history:last_scheduled_timestamp': '0',
                'controller:compliance:retry:next_attempt': '0'
            });

            const result = await HealthController._shouldSendReport();
            expect(result).toBe(true);
        });

        test('returns false if already sent within the active scheduled window', async () => {
            // 2026-01-22 07:20:00Z (within window)
            const now = new Date('2026-01-22T07:20:00.000Z');
            jest.setSystemTime(now);

            // Window start is 06:45Z (07:15 - 30 min). Set last scheduled at 07:00Z.
            const lastScheduled = new Date('2026-01-22T07:00:00.000Z').getTime();

            // W-143: Use cache wrapper pattern
            global.RedisManager = createFakeRedisManager({
                'controller:compliance:timing:report_time': '07:15',
                'controller:compliance:history:last_scheduled_timestamp': String(lastScheduled),
                'controller:compliance:retry:next_attempt': '0'
            });

            const result = await HealthController._shouldSendReport();
            expect(result).toBe(false);
        });

        test('returns false if in backoff period even within scheduled window', async () => {
            // 2026-01-22 07:20:00Z (within window)
            const now = new Date('2026-01-22T07:20:00.000Z');
            jest.setSystemTime(now);

            const nextAttempt = now.getTime() + 3600_000;

            // W-143: Use cache wrapper pattern
            global.RedisManager = createFakeRedisManager({
                'controller:compliance:timing:report_time': '07:15',
                'controller:compliance:history:last_scheduled_timestamp': '0',
                'controller:compliance:retry:next_attempt': String(nextAttempt)
            });

            const result = await HealthController._shouldSendReport();
            expect(result).toBe(false);
        });
    });

    describe('_recordReportSent() scheduled vs manual', () => {
        test('manual send does not update last_scheduled_timestamp', async () => {
            jest.setSystemTime(new Date('2026-01-22T07:20:00.000Z'));

            // W-143: Use cache wrapper pattern
            global.RedisManager = createFakeRedisManager({
                'controller:compliance:timing:report_time': '07:15'
            });

            await HealthController._recordReportSent({ success: true }, { uuid: 'x' }, false);

            // W-143: Check cacheSetObject for last_report and last_response, cacheSet for timestamps
            const setObjectCalls = global.RedisManager.cacheSetObject.mock.calls.map(c => `${c[0]}:${c[1]}`);
            const setCalls = global.RedisManager.cacheSet.mock.calls.map(c => `${c[0]}:${c[1]}`);

            expect(setObjectCalls).toContain('controller:compliance:history:last_report');
            expect(setObjectCalls).toContain('controller:compliance:history:last_response');
            expect(setCalls).toContain('controller:compliance:history:last_timestamp');
            expect(setCalls).not.toContain('controller:compliance:history:last_scheduled_timestamp');
        });

        test('scheduled send updates last_scheduled_timestamp', async () => {
            jest.setSystemTime(new Date('2026-01-22T07:20:00.000Z'));

            // W-143: Use cache wrapper pattern
            global.RedisManager = createFakeRedisManager({
                'controller:compliance:timing:report_time': '07:15'
            });

            await HealthController._recordReportSent({ success: true }, { uuid: 'x' }, true);

            // W-143: Check cacheSet calls for scheduled timestamp
            const setCalls = global.RedisManager.cacheSet.mock.calls.map(c => `${c[0]}:${c[1]}`);
            expect(setCalls).toContain('controller:compliance:history:last_scheduled_timestamp');
        });
    });

    describe('_getComplianceData() nextReportTimestamp scheduling', () => {
        test('nextReportTimestamp is today scheduled time when before schedule', async () => {
            // 2026-01-22 06:00Z, reportTime is 07:15Z
            jest.setSystemTime(new Date('2026-01-22T06:00:00.000Z'));

            const reportTime = '07:15';
            const scheduledToday = Date.UTC(2026, 0, 22, 7, 15, 0, 0);

            // W-143: Use cache wrapper pattern
            global.RedisManager = createFakeRedisManager({
                'controller:compliance:timing:report_time': reportTime,
                'controller:compliance:history:last_timestamp': '0',
                'controller:compliance:history:last_scheduled_timestamp': '0',
                'controller:compliance:retry:retry_count': '0',
                'controller:compliance:retry:next_attempt': '0'
            });

            HealthController.globalConfig = {
                data: {
                    manifest: { compliance: { adminEmailOptIn: true, siteUuid: '96543dee-f630-4399-a562-04a5bd211208' } }
                }
            };

            const compliance = await HealthController._getComplianceData();
            expect(compliance.nextReportTimestamp).toBe(scheduledToday);
        });

        test('nextReportTimestamp is tomorrow scheduled time when after schedule', async () => {
            // 2026-01-22 08:00Z, reportTime is 07:15Z
            jest.setSystemTime(new Date('2026-01-22T08:00:00.000Z'));

            const reportTime = '07:15';
            const scheduledTomorrow = Date.UTC(2026, 0, 23, 7, 15, 0, 0);

            // W-143: Use cache wrapper pattern
            global.RedisManager = createFakeRedisManager({
                'controller:compliance:timing:report_time': reportTime,
                'controller:compliance:history:last_timestamp': '0',
                'controller:compliance:history:last_scheduled_timestamp': '0',
                'controller:compliance:retry:retry_count': '0',
                'controller:compliance:retry:next_attempt': '0'
            });

            HealthController.globalConfig = {
                data: {
                    manifest: { compliance: { adminEmailOptIn: true, siteUuid: '96543dee-f630-4399-a562-04a5bd211208' } }
                }
            };

            const compliance = await HealthController._getComplianceData();
            expect(compliance.nextReportTimestamp).toBe(scheduledTomorrow);
        });
    });
});

// webapp/tests/unit/controller/health-compliance.test.js
