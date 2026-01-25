/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Health Controller Compliance
 * @tagline         Unit tests for W-137 compliance reporting
 * @description     Tests for compliance scheduling, gating, and state handling
 * @file            webapp/tests/unit/controller/health-compliance.test.js
 * @version         1.5.0
 * @release         2026-01-25
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.3, GPT-5.2
 */

import { jest } from '@jest/globals';
import HealthController from '../../../controller/health.js';

function createFakeRedis(initial = {}) {
    const store = new Map(Object.entries(initial));
    return {
        get: jest.fn(async (key) => {
            const value = store.get(key);
            return value === undefined ? null : String(value);
        }),
        set: jest.fn(async (key, value) => {
            store.set(key, String(value));
            return 'OK';
        }),
        del: jest.fn(async (key) => {
            store.delete(key);
            return 1;
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

            const redis = createFakeRedis({
                'metrics:compliance:report_time': '07:15',
                'metrics:compliance:last_scheduled_timestamp': '0',
                'metrics:compliance:next_attempt': '0'
            });

            global.RedisManager = { getClient: () => redis };

            const result = await HealthController._shouldSendReport();
            expect(result).toBe(false);
        });

        test('returns true within scheduled window if not already sent in this window', async () => {
            // 2026-01-22 07:20:00Z (within 07:15 ±30 min)
            jest.setSystemTime(new Date('2026-01-22T07:20:00.000Z'));

            const redis = createFakeRedis({
                'metrics:compliance:report_time': '07:15',
                'metrics:compliance:last_scheduled_timestamp': '0',
                'metrics:compliance:next_attempt': '0'
            });

            global.RedisManager = { getClient: () => redis };

            const result = await HealthController._shouldSendReport();
            expect(result).toBe(true);
        });

        test('returns false if already sent within the active scheduled window', async () => {
            // 2026-01-22 07:20:00Z (within window)
            const now = new Date('2026-01-22T07:20:00.000Z');
            jest.setSystemTime(now);

            // Window start is 06:45Z (07:15 - 30 min). Set last scheduled at 07:00Z.
            const lastScheduled = new Date('2026-01-22T07:00:00.000Z').getTime();

            const redis = createFakeRedis({
                'metrics:compliance:report_time': '07:15',
                'metrics:compliance:last_scheduled_timestamp': String(lastScheduled),
                'metrics:compliance:next_attempt': '0'
            });

            global.RedisManager = { getClient: () => redis };

            const result = await HealthController._shouldSendReport();
            expect(result).toBe(false);
        });

        test('returns false if in backoff period even within scheduled window', async () => {
            // 2026-01-22 07:20:00Z (within window)
            const now = new Date('2026-01-22T07:20:00.000Z');
            jest.setSystemTime(now);

            const nextAttempt = now.getTime() + 3600_000;

            const redis = createFakeRedis({
                'metrics:compliance:report_time': '07:15',
                'metrics:compliance:last_scheduled_timestamp': '0',
                'metrics:compliance:next_attempt': String(nextAttempt)
            });

            global.RedisManager = { getClient: () => redis };

            const result = await HealthController._shouldSendReport();
            expect(result).toBe(false);
        });
    });

    describe('_recordReportSent() scheduled vs manual', () => {
        test('manual send does not update last_scheduled_timestamp', async () => {
            jest.setSystemTime(new Date('2026-01-22T07:20:00.000Z'));
            const redis = createFakeRedis({
                'metrics:compliance:report_time': '07:15'
            });
            global.RedisManager = { getClient: () => redis };

            await HealthController._recordReportSent({ success: true }, { uuid: 'x' }, false);

            const setKeys = redis.set.mock.calls.map((c) => c[0]);
            expect(setKeys).toContain('metrics:compliance:last_report');
            expect(setKeys).toContain('metrics:compliance:last_timestamp');
            expect(setKeys).toContain('metrics:compliance:last_response');
            expect(setKeys).not.toContain('metrics:compliance:last_scheduled_timestamp');
        });

        test('scheduled send updates last_scheduled_timestamp', async () => {
            jest.setSystemTime(new Date('2026-01-22T07:20:00.000Z'));
            const redis = createFakeRedis({
                'metrics:compliance:report_time': '07:15'
            });
            global.RedisManager = { getClient: () => redis };

            await HealthController._recordReportSent({ success: true }, { uuid: 'x' }, true);

            const setKeys = redis.set.mock.calls.map((c) => c[0]);
            expect(setKeys).toContain('metrics:compliance:last_scheduled_timestamp');
        });
    });

    describe('_getComplianceData() nextReportTimestamp scheduling', () => {
        test('nextReportTimestamp is today scheduled time when before schedule', async () => {
            // 2026-01-22 06:00Z, reportTime is 07:15Z
            jest.setSystemTime(new Date('2026-01-22T06:00:00.000Z'));

            const reportTime = '07:15';
            const scheduledToday = Date.UTC(2026, 0, 22, 7, 15, 0, 0);

            const redis = createFakeRedis({
                'metrics:compliance:report_time': reportTime,
                'metrics:compliance:last_timestamp': '0',
                'metrics:compliance:last_scheduled_timestamp': '0',
                'metrics:compliance:retry_count': '0',
                'metrics:compliance:next_attempt': '0'
            });

            global.RedisManager = { getClient: () => redis };
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

            const redis = createFakeRedis({
                'metrics:compliance:report_time': reportTime,
                'metrics:compliance:last_timestamp': '0',
                'metrics:compliance:last_scheduled_timestamp': '0',
                'metrics:compliance:retry_count': '0',
                'metrics:compliance:next_attempt': '0'
            });

            global.RedisManager = { getClient: () => redis };
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
