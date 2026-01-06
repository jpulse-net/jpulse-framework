/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Redis Config
 * @tagline         Unit tests for Redis configuration validation (W-076)
 * @description     Tests Redis config parsing, validation, and fallback behavior
 * @file            webapp/tests/unit/utils/redis-config.test.js
 * @version         1.4.6
 * @release         2026-01-06
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Redis Configuration (W-076)', () => {
    let RedisManager;
    let originalAppConfig;

    beforeEach(async () => {
        // Save original config
        originalAppConfig = global.appConfig;

        // Set up minimal appConfig for tests
        global.appConfig = {
            system: {
                hostname: 'test-host',
                port: 8080,
                pid: process.pid,
                instanceId: `test-host:${process.env.NODE_APP_INSTANCE || '0'}:${process.pid}`
            }
        };

        // Import RedisManager fresh for each test
        jest.resetModules();
        const module = await import('../../../utils/redis-manager.js');
        RedisManager = module.default;
    });

    afterEach(() => {
        // Restore original config
        global.appConfig = originalAppConfig;

        // Clean up any Redis connections
        if (RedisManager && typeof RedisManager.shutdown === 'function') {
            RedisManager.shutdown();
        }
    });

    describe('Configuration Parsing', () => {
        it('should handle disabled Redis configuration', () => {
            const config = { enabled: false };

            RedisManager.initialize(config);

            expect(RedisManager.isAvailable).toBe(false);
            expect(RedisManager.getInstanceId()).toBeDefined();
        });

        it('should generate consistent instance IDs', () => {
            const config = { enabled: false };

            RedisManager.initialize(config);
            const instanceId1 = RedisManager.getInstanceId();

            RedisManager.initialize(config);
            const instanceId2 = RedisManager.getInstanceId();

            expect(instanceId1).toBe(instanceId2);
        });
    });

    describe('Instance ID Generation', () => {
        it('should generate instance ID in correct format', () => {
            RedisManager.initialize({ enabled: false });

            const instanceId = RedisManager.getInstanceId();

            expect(instanceId).toMatch(/^[^:]+:\d+:\d+$/); // hostname:number:pid format
            expect(instanceId.length).toBeGreaterThan(3);
        });

        it('should include hostname in instance ID', () => {
            RedisManager.initialize({ enabled: false });

            const instanceId = RedisManager.getInstanceId();
            const [hostname, instance, pid] = instanceId.split(':');

            expect(hostname).toBeDefined();
            expect(hostname.length).toBeGreaterThan(0);
            expect(instance).toBeDefined();
            expect(parseInt(instance)).toBeGreaterThanOrEqual(0);
            expect(instance.length).toBeGreaterThan(0);
            expect(pid).toBeDefined();
            expect(parseInt(pid)).toBeGreaterThan(0);
        });

        it('should handle process environment variables', async () => {
            const originalEnv = process.env.NODE_APP_INSTANCE;
            process.env.NODE_APP_INSTANCE = '5';

            // Update global.appConfig to reflect the new instance ID
            global.appConfig.system.instanceId = `test-host:5:${process.pid}`;

            // Re-import RedisManager to pick up the new instanceId
            jest.resetModules();
            const module = await import('../../../utils/redis-manager.js');
            const TestRedisManager = module.default;

            TestRedisManager.initialize({ enabled: false });
            const instanceId = TestRedisManager.getInstanceId();

            // Should contain the instance number
            expect(instanceId).toMatch(/^test-host:5:\d+$/); // hostname:5:pid format
            expect(instanceId).toContain(':5:'); // Specifically has ":5:" in it

            // Restore original environment
            if (originalEnv !== undefined) {
                process.env.NODE_APP_INSTANCE = originalEnv;
            } else {
                delete process.env.NODE_APP_INSTANCE;
            }

            // Clean up
            await TestRedisManager.shutdown();
        });
    });

    describe('Availability Checks', () => {
        it('should report unavailable when disabled', () => {
            RedisManager.initialize({ enabled: false });

            expect(RedisManager.isRedisAvailable()).toBe(false);
            expect(RedisManager.isAvailable).toBe(false);
        });

        it('should provide consistent availability status', () => {
            RedisManager.initialize({ enabled: false });

            const available1 = RedisManager.isRedisAvailable();
            const available2 = RedisManager.isAvailable;

            expect(available1).toBe(available2);
        });

        it('should handle multiple availability checks', () => {
            RedisManager.initialize({ enabled: false });

            for (let i = 0; i < 5; i++) {
                expect(RedisManager.isRedisAvailable()).toBe(false);
                expect(RedisManager.isAvailable).toBe(false);
            }
        });
    });

    describe('Graceful Fallback Behavior', () => {
        it('should handle publish broadcast when Redis unavailable', async () => {
            RedisManager.initialize({ enabled: false });

            const result = await RedisManager.publishBroadcast('test:channel', { data: 'test' });

            // Returns true because it successfully processes local callbacks (graceful fallback)
            expect(result).toBe(true); // Should return true (local callbacks processed) but not throw
        });

        it('should handle broadcast callback registration when Redis unavailable', () => {
            RedisManager.initialize({ enabled: false });

            // Should not throw even when Redis is unavailable
            expect(() => {
                RedisManager.registerBroadcastCallback('controller:test:channel:event', jest.fn());
            }).not.toThrow();
        });

        it('should handle session store configuration when Redis unavailable', async () => {
            RedisManager.initialize({ enabled: false });

            const sessionStore = await RedisManager.configureSessionStore({});

            expect(sessionStore).toBeDefined();
            expect(sessionStore.constructor.name).toBe('MemoryStore');
        });

        it('should handle shutdown when Redis unavailable', async () => {
            RedisManager.initialize({ enabled: false });

            await expect(RedisManager.shutdown()).resolves.not.toThrow();
        });
    });

    describe('Configuration Validation', () => {
        it('should handle boolean enabled flag', () => {
            const configs = [
                { enabled: true },
                { enabled: false },
                { enabled: 'true' },
                { enabled: 'false' },
                { enabled: 1 },
                { enabled: 0 }
            ];

            configs.forEach(config => {
                expect(() => {
                    RedisManager.initialize(config);
                }).not.toThrow();
            });
        });

        it('should handle partial configuration objects', () => {
            const configs = [
                { host: 'localhost' },
                { port: 6379 },
                { cluster: { enabled: false } },
                { prefix: 'test:' },
                { ttl: { default: 3600 } }
            ];

            configs.forEach(config => {
                expect(() => {
                    RedisManager.initialize(config);
                }).not.toThrow();
            });
        });

        it('should handle empty configuration object', () => {
            expect(() => {
                RedisManager.initialize({});
            }).not.toThrow();

            expect(RedisManager.isAvailable).toBe(false);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid configuration gracefully', () => {
            const invalidConfigs = [
                'invalid string',
                123,
                [],
                true,
                false
            ];

            invalidConfigs.forEach(config => {
                expect(() => {
                    RedisManager.initialize(config);
                }).not.toThrow();
            });
        });

        it('should maintain consistent state after errors', () => {
            // Initialize with invalid config
            RedisManager.initialize('invalid');

            // Should still be able to get instance ID
            expect(RedisManager.getInstanceId()).toBeDefined();
            expect(RedisManager.isAvailable).toBe(false);
        });

        it('should handle multiple initialization calls', () => {
            RedisManager.initialize({ enabled: false });
            const firstInstanceId = RedisManager.getInstanceId();

            RedisManager.initialize({ enabled: true });
            const secondInstanceId = RedisManager.getInstanceId();

            expect(firstInstanceId).toBe(secondInstanceId);
        });
    });
});

// EOF webapp/tests/unit/utils/redis-config.test.js
