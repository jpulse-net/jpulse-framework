/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Redis Get Client
 * @tagline         Unit tests for RedisManager.getClient() per-connection accuracy (W-199)
 * @description     Regression tests for the startup race where an unrelated connection's
 *                   transient error/close flips the shared isAvailable flag to false even
 *                   though the specifically-requested client is healthy (and vice versa) -
 *                   getClient() must trust the requested client's own ioredis status first
 * @file            webapp/tests/unit/utils/redis-get-client.test.js
 * @version         1.7.17
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           85%, Cursor 3.13, Claude Sonnet 5
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('RedisManager.getClient() per-connection accuracy (W-199)', () => {
    let RedisManager;
    let originalAppConfig;
    let originalLogController;

    beforeEach(async () => {
        originalAppConfig = global.appConfig;
        originalLogController = global.LogController;

        global.appConfig = {
            system: {
                hostname: 'test-host',
                port: 8080,
                pid: process.pid,
                instanceId: `test-host:0:${process.pid}`
            }
        };

        global.LogController = {
            logInfo: jest.fn(),
            logWarning: jest.fn(),
            logError: jest.fn()
        };

        jest.resetModules();
        const module = await import('../../../utils/redis-manager.js');
        RedisManager = module.default;

        // Initialize disabled to avoid any real connection attempts, then inject fake
        // connection objects directly (same pattern as redis-cache.test.js)
        await RedisManager.initialize({ enabled: false });
        RedisManager.config = { enabled: true };
    });

    afterEach(() => {
        global.appConfig = originalAppConfig;
        global.LogController = originalLogController;

        if (RedisManager && typeof RedisManager.shutdown === 'function') {
            RedisManager.shutdown();
        }
    });

    test('returns null when Redis is disabled, regardless of client status', () => {
        RedisManager.config = { enabled: false };
        RedisManager.connections.session = { status: 'ready' };
        RedisManager.isAvailable = true;

        expect(RedisManager.getClient('session')).toBeNull();
    });

    test('returns null when the requested connection does not exist', () => {
        RedisManager.connections.session = null;
        RedisManager.isAvailable = true;

        expect(RedisManager.getClient('session')).toBeNull();
    });

    test('returns the client when its own status is "ready", even if the shared isAvailable flag is false (the reported bug)', () => {
        // Reproduces the exact reported race: an unrelated connection's transient error
        // flipped the shared isAvailable to false, even though session itself is healthy
        RedisManager.connections.session = { status: 'ready' };
        RedisManager.isAvailable = false;

        const client = RedisManager.getClient('session');
        expect(client).toBe(RedisManager.connections.session);
    });

    test('returns null when the client status is "end" (torn down), even if the shared isAvailable flag is true', () => {
        RedisManager.connections.session = { status: 'end' };
        RedisManager.isAvailable = true;

        expect(RedisManager.getClient('session')).toBeNull();
    });

    test.each(['wait', 'connecting', 'connect', 'close', 'reconnecting', undefined])(
        'falls back to the shared isAvailable flag for ambiguous status %p',
        (status) => {
            RedisManager.connections.session = { status };

            RedisManager.isAvailable = true;
            expect(RedisManager.getClient('session')).toBe(RedisManager.connections.session);

            RedisManager.isAvailable = false;
            expect(RedisManager.getClient('session')).toBeNull();
        }
    );

    test('checks the specific pub/sub client status independently for type-qualified services', () => {
        RedisManager.connections.broadcast.publisher = { status: 'ready' };
        RedisManager.connections.broadcast.subscriber = { status: 'end' };
        RedisManager.isAvailable = false;

        expect(RedisManager.getClient('broadcast', 'publisher')).toBe(RedisManager.connections.broadcast.publisher);
        expect(RedisManager.getClient('broadcast', 'subscriber')).toBeNull();
    });
});

// EOF webapp/tests/unit/utils/redis-get-client.test.js
