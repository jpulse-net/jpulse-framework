/**
 * @name            jPulse Framework / WebApp / Utils / Time-Based Counters
 * @tagline         Time-based event counters for metrics
 * @description     Provides efficient in-memory counters with rolling time windows
 *                  for tracking events (emails sent, pages served, etc.) over time
 * @file            webapp/utils/time-based-counters.js
 * @version         1.4.9
 * @release         2026-01-09
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.1, Claude Sonnet 4.5
 */

/**
 * TimeBasedCounter - Efficient in-memory counters with rolling time windows
 *
 * Tracks events with timestamps and provides counts for:
 * - Last hour
 * - Last 24 hours
 * - Total (since app start)
 *
 * Automatically cleans up old timestamps to prevent memory growth.
 *
 * @example
 * // Create a counter instance
 * const emailCounter = new TimeBasedCounter('emailsSent');
 *
 * // Increment on event
 * emailCounter.increment();
 *
 * // Get counts
 * const stats = emailCounter.getStats();
 * // Returns: { lastHour: 42, last24h: 150, total: 1200 }
 */
class TimeBasedCounter {
    /**
     * @param {string} name - Counter name (for debugging/logging)
     * @param {object} options - Configuration options
     * @param {number} options.retentionHours - Hours to retain timestamps (default: 25)
     * @param {number} options.cleanupInterval - Cleanup interval in ms (default: 300000 = 5 min)
     */
    constructor(name, options = {}) {
        this.name = name;
        this.timestamps = [];
        this.total = 0;
        this.retentionHours = options.retentionHours || 25; // Keep 25 hours for safety
        // Disable cleanup timer in test mode to prevent hanging tests
        const isTest = process.env.NODE_ENV === 'test' || global.jest;
        this.cleanupInterval = isTest ? 0 : (options.cleanupInterval || 300000); // 5 minutes, or 0 in tests
        this.lastCleanup = Date.now();

        // Start cleanup timer if interval is set
        if (this.cleanupInterval > 0) {
            this._scheduleCleanup();
        }
    }

    /**
     * Increment counter (record event)
     * @param {number} count - Number to increment by (default: 1)
     */
    increment(count = 1) {
        const now = Date.now();
        for (let i = 0; i < count; i++) {
            this.timestamps.push(now);
        }
        this.total += count;

        // Periodic cleanup check (every 1000 increments to avoid overhead)
        if (this.timestamps.length % 1000 === 0) {
            this._cleanupIfNeeded();
        }
    }

    /**
     * Get statistics for this counter
     * @returns {object} Stats object with lastHour, last24h, and total
     */
    getStats() {
        this._cleanupIfNeeded();

        const now = Date.now();
        const oneHourAgo = now - 3600000;   // 1 hour in ms
        const oneDayAgo = now - 86400000;  // 24 hours in ms

        // Count timestamps in each window
        let lastHour = 0;
        let last24h = 0;

        // Single pass through timestamps (most recent first, so we can break early)
        // Reverse iterate for better performance (newer timestamps are at the end)
        for (let i = this.timestamps.length - 1; i >= 0; i--) {
            const ts = this.timestamps[i];
            if (ts > oneDayAgo) {
                last24h++;
                if (ts > oneHourAgo) {
                    lastHour++;
                }
            } else {
                // Older than 24h, can stop (timestamps are in order)
                break;
            }
        }

        return {
            lastHour,
            last24h,
            total: this.total
        };
    }

    /**
     * Reset counter (clear all data)
     */
    reset() {
        this.timestamps = [];
        this.total = 0;
        this.lastCleanup = Date.now();
    }

    /**
     * Get current array size (for monitoring)
     * @returns {number} Number of timestamps stored
     */
    getSize() {
        return this.timestamps.length;
    }

    /**
     * Clean up old timestamps if needed
     * @private
     */
    _cleanupIfNeeded() {
        const now = Date.now();
        if (now - this.lastCleanup < this.cleanupInterval) {
            return; // Not time for cleanup yet
        }

        this._cleanup();
    }

    /**
     * Clean up old timestamps
     * @private
     */
    _cleanup() {
        const now = Date.now();
        const cutoff = now - (this.retentionHours * 3600 * 1000);

        // Filter out timestamps older than cutoff
        const before = this.timestamps.length;
        this.timestamps = this.timestamps.filter(ts => ts > cutoff);
        const after = this.timestamps.length;

        this.lastCleanup = now;

        if (before !== after) {
            global.LogController?.logInfo(null, 'time-based-counters',
                `Cleaned up ${before - after} old timestamps from counter '${this.name}' (${after} remaining)`);
        }
    }

    /**
     * Schedule periodic cleanup
     * @private
     */
    _scheduleCleanup() {
        // Use setInterval for periodic cleanup
        if (this._cleanupTimer) {
            clearInterval(this._cleanupTimer);
        }

        this._cleanupTimer = setInterval(() => {
            this._cleanup();
        }, this.cleanupInterval);
    }

    /**
     * Stop cleanup timer (for testing or cleanup)
     */
    stopCleanup() {
        if (this._cleanupTimer) {
            clearInterval(this._cleanupTimer);
            this._cleanupTimer = null;
        }
    }
}

/**
 * CounterManager - Manages multiple TimeBasedCounter instances
 *
 * Provides a centralized way to create and access counters across the application.
 *
 * @example
 * // Create or get a counter
 * const emailCounter = CounterManager.getCounter('email', 'sent');
 *
 * // Increment
 * emailCounter.increment();
 *
 * // Get stats
 * const stats = emailCounter.getStats();
 */
class CounterManager {
    /**
     * Map of counter groups: { groupName: { counterName: TimeBasedCounter } }
     */
    static counters = new Map();

    /**
     * Get or create a counter
     * @param {string} group - Counter group (e.g., 'email', 'view', 'handlebar')
     * @param {string} name - Counter name (e.g., 'sent', 'failed', 'rendered')
     * @param {object} options - Options for TimeBasedCounter constructor
     * @returns {TimeBasedCounter} Counter instance
     */
    static getCounter(group, name, options = {}) {
        if (!this.counters.has(group)) {
            this.counters.set(group, new Map());
        }

        const groupCounters = this.counters.get(group);
        if (!groupCounters.has(name)) {
            const fullName = `${group}.${name}`;
            groupCounters.set(name, new TimeBasedCounter(fullName, options));
        }

        return groupCounters.get(name);
    }

    /**
     * Get all counters for a group
     * @param {string} group - Counter group
     * @returns {Map<string, TimeBasedCounter>} Map of counter name to counter instance
     */
    static getGroupCounters(group) {
        return this.counters.get(group) || new Map();
    }

    /**
     * Get stats for all counters in a group
     * @param {string} group - Counter group
     * @returns {object} Object with counter names as keys and stats as values
     */
    static getGroupStats(group) {
        const groupCounters = this.getGroupCounters(group);
        const stats = {};

        for (const [name, counter] of groupCounters) {
            stats[name] = counter.getStats();
        }

        return stats;
    }

    /**
     * Reset all counters in a group
     * @param {string} group - Counter group
     */
    static resetGroup(group) {
        const groupCounters = this.getGroupCounters(group);
        for (const counter of groupCounters.values()) {
            counter.reset();
        }
    }

    /**
     * Reset all counters (for testing)
     */
    static resetAll() {
        for (const groupCounters of this.counters.values()) {
            for (const counter of groupCounters.values()) {
                counter.reset();
            }
        }
    }

    /**
     * Stop all cleanup timers (for testing)
     */
    static stopAllCleanup() {
        for (const groupCounters of this.counters.values()) {
            for (const counter of groupCounters.values()) {
                counter.stopCleanup();
            }
        }
    }
}

export default CounterManager;
export { TimeBasedCounter, CounterManager };

// EOF webapp/utils/time-based-counters.js
