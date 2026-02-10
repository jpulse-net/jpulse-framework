/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Time-Based Counters
 * @tagline         Unit tests for TimeBasedCounter and CounterManager
 * @description     Tests for time-based event counters with rolling time windows
 * @file            webapp/tests/unit/utils/time-based-counters.test.js
 * @version         1.6.12
 * @release         2026-02-09
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.1, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('TimeBasedCounter', () => {
    let TimeBasedCounter, CounterManager;

    beforeEach(async () => {
        const module = await import('../../../utils/time-based-counters.js');
        TimeBasedCounter = module.TimeBasedCounter;
        CounterManager = module.CounterManager;

        // Clear all counters before each test
        CounterManager.resetAll();
        CounterManager.stopAllCleanup();
    });

    afterEach(() => {
        // Clean up after each test
        CounterManager.resetAll();
        CounterManager.stopAllCleanup();
    });

    describe('constructor', () => {
        test('should create counter with default options', () => {
            const counter = new TimeBasedCounter('test');
            expect(counter.name).toBe('test');
            expect(counter.timestamps).toEqual([]);
            expect(counter.total).toBe(0);
            expect(counter.retentionHours).toBe(25);
            expect(counter.cleanupInterval).toBe(0); // Disabled in test mode
        });

        test('should create counter with custom options', () => {
            const counter = new TimeBasedCounter('test', {
                retentionHours: 48,
                cleanupInterval: 60000
            });
            expect(counter.retentionHours).toBe(48);
            // In test mode, cleanupInterval is forced to 0
            expect(counter.cleanupInterval).toBe(0);
        });
    });

    describe('increment()', () => {
        test('should increment by 1 by default', () => {
            const counter = new TimeBasedCounter('test');
            counter.increment();
            expect(counter.total).toBe(1);
            expect(counter.timestamps.length).toBe(1);
        });

        test('should increment by specified count', () => {
            const counter = new TimeBasedCounter('test');
            counter.increment(5);
            expect(counter.total).toBe(5);
            expect(counter.timestamps.length).toBe(5);
        });

        test('should record current timestamp for each increment', () => {
            const counter = new TimeBasedCounter('test');
            const before = Date.now();
            counter.increment(3);
            const after = Date.now();

            expect(counter.timestamps.length).toBe(3);
            counter.timestamps.forEach(ts => {
                expect(ts).toBeGreaterThanOrEqual(before);
                expect(ts).toBeLessThanOrEqual(after);
            });
        });
    });

    describe('getStats()', () => {
        test('should return zero stats for empty counter', () => {
            const counter = new TimeBasedCounter('test');
            const stats = counter.getStats();
            expect(stats).toEqual({
                lastHour: 0,
                last24h: 0,
                total: 0
            });
        });

        test('should count events in last hour', async () => {
            const counter = new TimeBasedCounter('test');
            counter.increment(3);
            const stats = counter.getStats();
            expect(stats.lastHour).toBe(3);
            expect(stats.last24h).toBe(3);
            expect(stats.total).toBe(3);
        });

        test('should correctly categorize events by time windows', async () => {
            const counter = new TimeBasedCounter('test');
            const now = Date.now();

            // Add events at different times
            counter.timestamps = [
                now - 7200000,  // 2 hours ago (outside last hour, inside last 24h)
                now - 1800000,  // 30 minutes ago (inside last hour)
                now - 300000,   // 5 minutes ago (inside last hour)
                now             // now (inside last hour)
            ];
            counter.total = 4;

            const stats = counter.getStats();
            expect(stats.lastHour).toBe(3); // Last 3 events
            expect(stats.last24h).toBe(4); // All events
            expect(stats.total).toBe(4);
        });

        test('should exclude events older than 24 hours', async () => {
            const counter = new TimeBasedCounter('test');
            const now = Date.now();

            counter.timestamps = [
                now - 86400000 - 1000,  // 24h 1s ago (outside last 24h)
                now - 3600000,          // 1 hour ago (inside last 24h)
                now                     // now (inside last 24h)
            ];
            counter.total = 3;

            const stats = counter.getStats();
            expect(stats.lastHour).toBe(1); // Only the most recent
            expect(stats.last24h).toBe(2); // Last 2 events
            expect(stats.total).toBe(3);
        });
    });

    describe('reset()', () => {
        test('should clear all data', () => {
            const counter = new TimeBasedCounter('test');
            counter.increment(5);
            expect(counter.total).toBe(5);
            expect(counter.timestamps.length).toBe(5);

            counter.reset();
            expect(counter.total).toBe(0);
            expect(counter.timestamps.length).toBe(0);
        });
    });

    describe('getSize()', () => {
        test('should return number of timestamps', () => {
            const counter = new TimeBasedCounter('test');
            expect(counter.getSize()).toBe(0);
            counter.increment(3);
            expect(counter.getSize()).toBe(3);
        });
    });

    describe('stopCleanup()', () => {
        test('should stop cleanup timer', () => {
            const counter = new TimeBasedCounter('test');
            // In test mode, timer shouldn't be created, but test the method anyway
            counter.stopCleanup();
            expect(counter._cleanupTimer).toBeUndefined();
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty counter', () => {
            const counter = new TimeBasedCounter('test');
            const stats = counter.getStats();
            expect(stats).toEqual({ lastHour: 0, last24h: 0, total: 0 });
        });

        test('should handle very old timestamps', () => {
            const counter = new TimeBasedCounter('test');
            const now = Date.now();
            counter.timestamps = [
                now - 365 * 24 * 3600 * 1000,  // 1 year ago
                now - 30 * 24 * 3600 * 1000,   // 30 days ago
                now - 2 * 24 * 3600 * 1000      // 2 days ago
            ];
            counter.total = 3;

            const stats = counter.getStats();
            expect(stats.lastHour).toBe(0);
            expect(stats.last24h).toBe(0); // All older than 24h
            expect(stats.total).toBe(3);
        });

        test('should handle large increment counts', () => {
            const counter = new TimeBasedCounter('test');
            counter.increment(1000);
            expect(counter.total).toBe(1000);
            expect(counter.timestamps.length).toBe(1000);
        });
    });
});

describe('CounterManager', () => {
    let CounterManager, TimeBasedCounter;

    beforeEach(async () => {
        const module = await import('../../../utils/time-based-counters.js');
        CounterManager = module.CounterManager;
        TimeBasedCounter = module.TimeBasedCounter;

        // Clear all counters before each test
        CounterManager.resetAll();
        CounterManager.stopAllCleanup();
    });

    afterEach(() => {
        CounterManager.resetAll();
        CounterManager.stopAllCleanup();
    });

    describe('getCounter()', () => {
        test('should create new counter if not exists', () => {
            const counter = CounterManager.getCounter('test', 'counter1');
            expect(counter).toBeInstanceOf(TimeBasedCounter);
            expect(counter.name).toBe('test.counter1');
        });

        test('should return same counter instance for same group and name', () => {
            const counter1 = CounterManager.getCounter('test', 'counter1');
            const counter2 = CounterManager.getCounter('test', 'counter1');
            expect(counter1).toBe(counter2);
        });

        test('should create different counters for different names', () => {
            const counter1 = CounterManager.getCounter('test', 'counter1');
            const counter2 = CounterManager.getCounter('test', 'counter2');
            expect(counter1).not.toBe(counter2);
        });

        test('should create different counters for different groups', () => {
            const counter1 = CounterManager.getCounter('group1', 'counter1');
            const counter2 = CounterManager.getCounter('group2', 'counter1');
            expect(counter1).not.toBe(counter2);
        });
    });

    describe('getGroupStats()', () => {
        test('should return empty object for non-existent group', () => {
            const stats = CounterManager.getGroupStats('nonexistent');
            expect(stats).toEqual({});
        });

        test('should return stats for all counters in group', () => {
            const counter1 = CounterManager.getCounter('test', 'counter1');
            const counter2 = CounterManager.getCounter('test', 'counter2');

            counter1.increment(2);
            counter2.increment(3);

            const stats = CounterManager.getGroupStats('test');
            expect(stats.counter1).toEqual({
                lastHour: 2,
                last24h: 2,
                total: 2
            });
            expect(stats.counter2).toEqual({
                lastHour: 3,
                last24h: 3,
                total: 3
            });
        });
    });

    describe('resetGroup()', () => {
        test('should reset all counters in a group', () => {
            const counter1 = CounterManager.getCounter('test', 'counter1');
            const counter2 = CounterManager.getCounter('test', 'counter2');

            counter1.increment(5);
            counter2.increment(3);

            CounterManager.resetGroup('test');

            expect(counter1.total).toBe(0);
            expect(counter2.total).toBe(0);
            expect(counter1.getSize()).toBe(0);
            expect(counter2.getSize()).toBe(0);
        });
    });

    describe('resetAll()', () => {
        test('should reset all counters across all groups', () => {
            const counter1 = CounterManager.getCounter('group1', 'counter1');
            const counter2 = CounterManager.getCounter('group2', 'counter2');

            counter1.increment(5);
            counter2.increment(3);

            CounterManager.resetAll();

            expect(counter1.total).toBe(0);
            expect(counter2.total).toBe(0);
        });
    });

    describe('stopAllCleanup()', () => {
        test('should stop all cleanup timers', () => {
            CounterManager.getCounter('test', 'counter1');
            CounterManager.getCounter('test', 'counter2');
            // Should not throw
            CounterManager.stopAllCleanup();
        });
    });
});

// EOF webapp/tests/unit/utils/time-based-counters.test.js
