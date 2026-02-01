/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Redis Cache
 * @tagline         Unit tests for Redis cache wrapper operations (W-143)
 * @description     Tests cache operations, pattern methods, JSON handling, and rate limiting
 * @file            webapp/tests/unit/utils/redis-cache.test.js
 * @version         1.6.4
 * @release         2026-02-01
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.4, Claude Sonnet 4.5
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Redis Cache Operations (W-143)', () => {
    let RedisManager;
    let mockRedisClient;
    let originalAppConfig;
    let originalLogController;

    beforeEach(async () => {
        // Save originals
        originalAppConfig = global.appConfig;
        originalLogController = global.LogController;

        // Set up minimal appConfig for tests
        global.appConfig = {
            system: {
                hostname: 'test-host',
                port: 8080,
                pid: process.pid,
                instanceId: `test-host:0:${process.pid}`
            },
            redis: {
                enabled: true,
                mode: 'single',
                connections: {
                    cache: {
                        keyPrefix: 'cache:',
                        ttl: 3600
                    }
                }
            }
        };

        // Mock LogController
        global.LogController = {
            logInfo: jest.fn(),
            logWarning: jest.fn(),
            logError: jest.fn()
        };

        // Create mock Redis client
        mockRedisClient = {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue('OK'),
            setex: jest.fn().mockResolvedValue('OK'),
            del: jest.fn().mockResolvedValue(1),
            exists: jest.fn().mockResolvedValue(1),
            incr: jest.fn().mockResolvedValue(1),
            decr: jest.fn().mockResolvedValue(0),
            incrby: jest.fn().mockResolvedValue(10),
            ttl: jest.fn().mockResolvedValue(-1),
            expire: jest.fn().mockResolvedValue(1),
            scan: jest.fn().mockResolvedValue(['0', []]),
            quit: jest.fn().mockResolvedValue('OK')
        };

        // Import RedisManager and inject mock client
        jest.resetModules();
        const module = await import('../../../utils/redis-manager.js');
        RedisManager = module.default;

        // Initialize without Redis (to avoid connection attempts)
        await RedisManager.initialize({ enabled: false });

        // Inject mock client and mark Redis as available for testing
        RedisManager.connections.cache = mockRedisClient;
        RedisManager.config = global.appConfig.redis; // Use test config
        RedisManager.config.enabled = true; // Enable Redis for tests
        RedisManager.isAvailable = true; // Mark as available
    });

    afterEach(() => {
        // Restore originals
        global.appConfig = originalAppConfig;
        global.LogController = originalLogController;

        // Clean up
        if (RedisManager && typeof RedisManager.shutdown === 'function') {
            RedisManager.shutdown();
        }
    });

    // ========================================================================
    // Core Cache Operations
    // ========================================================================

    describe('Core Cache Operations', () => {
        describe('cacheSet()', () => {
            it('should set cache value with TTL', async () => {
                mockRedisClient.setex.mockResolvedValue('OK');

                const result = await RedisManager.cacheSet(
                    'controller:test:token',
                    'user123',
                    'token-value',
                    { ttl: 3600 }
                );

                expect(result).toBe(true);
                expect(mockRedisClient.setex).toHaveBeenCalled();
                const args = mockRedisClient.setex.mock.calls[0];
                expect(args[0]).toContain('cache:controller:test:token:user123');
                expect(args[1]).toBe(3600);
                expect(args[2]).toBe('token-value');
            });

            it('should set cache value without TTL (indefinite)', async () => {
                mockRedisClient.set.mockResolvedValue('OK');

                const result = await RedisManager.cacheSet(
                    'controller:test:data',
                    'key1',
                    'value1'
                );

                expect(result).toBe(true);
                expect(mockRedisClient.set).toHaveBeenCalled();
                const args = mockRedisClient.set.mock.calls[0];
                expect(args[0]).toContain('cache:controller:test:data:key1');
                expect(args[1]).toBe('value1');
            });

            it('should handle negative TTL (convert to 0)', async () => {
                mockRedisClient.set.mockResolvedValue('OK');

                const result = await RedisManager.cacheSet(
                    'controller:test:data',
                    'key1',
                    'value1',
                    { ttl: -100 }
                );

                expect(result).toBe(true);
                expect(mockRedisClient.set).toHaveBeenCalled();
                expect(global.LogController.logWarning).toHaveBeenCalledWith(
                    null,
                    'redis-manager.cacheSet',
                    expect.stringContaining('Negative TTL')
                );
            });

            it('should warn on very large TTL (> 1 year)', async () => {
                mockRedisClient.setex.mockResolvedValue('OK');

                await RedisManager.cacheSet(
                    'controller:test:data',
                    'key1',
                    'value1',
                    { ttl: 40000000 } // > 1 year
                );

                expect(global.LogController.logWarning).toHaveBeenCalledWith(
                    null,
                    'redis-manager.cacheSet',
                    expect.stringContaining('Very large TTL')
                );
            });

            it('should handle invalid path (too few parts)', async () => {
                const result = await RedisManager.cacheSet(
                    'invalid:path',
                    'key1',
                    'value1'
                );

                expect(result).toBe(false);
                expect(global.LogController.logError).toHaveBeenCalled();
            });

            it('should handle invalid component', async () => {
                const result = await RedisManager.cacheSet(
                    'invalid:test:data',
                    'key1',
                    'value1'
                );

                expect(result).toBe(false);
                expect(global.LogController.logError).toHaveBeenCalledWith(
                    null,
                    'redis-manager._validateCacheParams',
                    expect.stringContaining('must be one of')
                );
            });

            it('should return false when Redis unavailable', async () => {
                RedisManager.connections.cache = null;

                const result = await RedisManager.cacheSet(
                    'controller:test:data',
                    'key1',
                    'value1'
                );

                expect(result).toBe(false);
                expect(global.LogController.logWarning).toHaveBeenCalled();
            });
        });

        describe('cacheGet()', () => {
            it('should get cache value (hit)', async () => {
                mockRedisClient.get.mockResolvedValue('cached-value');

                const result = await RedisManager.cacheGet(
                    'controller:test:data',
                    'key1'
                );

                expect(result).toBe('cached-value');
                expect(mockRedisClient.get).toHaveBeenCalled();
                expect(global.LogController.logInfo).toHaveBeenCalledWith(
                    null,
                    'redis-manager.cacheGet',
                    expect.stringContaining('Cache hit')
                );
            });

            it('should return null on cache miss', async () => {
                mockRedisClient.get.mockResolvedValue(null);

                const result = await RedisManager.cacheGet(
                    'controller:test:data',
                    'key1'
                );

                expect(result).toBe(null);
            });

            it('should track cache statistics (hits)', async () => {
                mockRedisClient.get.mockResolvedValue('value');

                // Reset stats
                RedisManager._cacheStats.hits = 0;
                RedisManager._cacheStats.gets = 0;

                await RedisManager.cacheGet('controller:test:data', 'key1');

                expect(RedisManager._cacheStats.gets).toBe(1);
                expect(RedisManager._cacheStats.hits).toBe(1);
            });

            it('should track cache statistics (misses)', async () => {
                mockRedisClient.get.mockResolvedValue(null);

                // Reset stats
                RedisManager._cacheStats.misses = 0;
                RedisManager._cacheStats.gets = 0;

                await RedisManager.cacheGet('controller:test:data', 'key1');

                expect(RedisManager._cacheStats.gets).toBe(1);
                expect(RedisManager._cacheStats.misses).toBe(1);
            });

            it('should return null when Redis unavailable', async () => {
                RedisManager.connections.cache = null;

                const result = await RedisManager.cacheGet(
                    'controller:test:data',
                    'key1'
                );

                expect(result).toBe(null);
            });
        });

        describe('cacheDel()', () => {
            it('should delete cache value', async () => {
                mockRedisClient.del.mockResolvedValue(1);

                const result = await RedisManager.cacheDel(
                    'controller:test:data',
                    'key1'
                );

                expect(result).toBe(true);
                expect(mockRedisClient.del).toHaveBeenCalled();
            });

            it('should return false if key not found', async () => {
                mockRedisClient.del.mockResolvedValue(0);

                const result = await RedisManager.cacheDel(
                    'controller:test:data',
                    'key1'
                );

                expect(result).toBe(false);
            });

            it('should track delete operations', async () => {
                mockRedisClient.del.mockResolvedValue(1);

                RedisManager._cacheStats.deletes = 0;

                await RedisManager.cacheDel('controller:test:data', 'key1');

                expect(RedisManager._cacheStats.deletes).toBe(1);
            });
        });

        describe('cacheExists()', () => {
            it('should return true if key exists', async () => {
                mockRedisClient.exists.mockResolvedValue(1);

                const result = await RedisManager.cacheExists(
                    'controller:test:data',
                    'key1'
                );

                expect(result).toBe(true);
            });

            it('should return false if key does not exist', async () => {
                mockRedisClient.exists.mockResolvedValue(0);

                const result = await RedisManager.cacheExists(
                    'controller:test:data',
                    'key1'
                );

                expect(result).toBe(false);
            });
        });
    });

    // ========================================================================
    // JSON Operations
    // ========================================================================

    describe('JSON Operations', () => {
        describe('cacheSetObject()', () => {
            it('should serialize and cache object', async () => {
                mockRedisClient.set.mockResolvedValue('OK');

                const obj = { name: 'John', age: 30, active: true };
                const result = await RedisManager.cacheSetObject(
                    'model:user:profile',
                    'user123',
                    obj
                );

                expect(result).toBe(true);
                expect(mockRedisClient.set).toHaveBeenCalled();
                const args = mockRedisClient.set.mock.calls[0];
                expect(args[1]).toBe(JSON.stringify(obj));
            });

            it('should handle serialization errors', async () => {
                const circular = {};
                circular.self = circular;

                const result = await RedisManager.cacheSetObject(
                    'model:user:profile',
                    'user123',
                    circular
                );

                expect(result).toBe(false);
                expect(global.LogController.logError).toHaveBeenCalledWith(
                    null,
                    'redis-manager.cacheSetObject',
                    expect.stringContaining('Failed to serialize')
                );
            });
        });

        describe('cacheGetObject()', () => {
            it('should deserialize cached object', async () => {
                const obj = { name: 'John', age: 30 };
                mockRedisClient.get.mockResolvedValue(JSON.stringify(obj));

                const result = await RedisManager.cacheGetObject(
                    'model:user:profile',
                    'user123'
                );

                expect(result).toEqual(obj);
            });

            it('should return null for cache miss', async () => {
                mockRedisClient.get.mockResolvedValue(null);

                const result = await RedisManager.cacheGetObject(
                    'model:user:profile',
                    'user123'
                );

                expect(result).toBe(null);
            });

            it('should handle parse errors', async () => {
                mockRedisClient.get.mockResolvedValue('invalid-json{');

                const result = await RedisManager.cacheGetObject(
                    'model:user:profile',
                    'user123'
                );

                expect(result).toBe(null);
                expect(global.LogController.logError).toHaveBeenCalledWith(
                    null,
                    'redis-manager.cacheGetObject',
                    expect.stringContaining('Failed to parse')
                );
            });
        });
    });

    // ========================================================================
    // Counter Operations
    // ========================================================================

    describe('Counter Operations', () => {
        describe('cacheIncr()', () => {
            it('should increment counter', async () => {
                mockRedisClient.incr.mockResolvedValue(5);

                const result = await RedisManager.cacheIncr(
                    'view:analytics:pageviews',
                    '/about'
                );

                expect(result).toBe(5);
                expect(mockRedisClient.incr).toHaveBeenCalled();
            });

            it('should return null on error', async () => {
                mockRedisClient.incr.mockRejectedValue(new Error('Redis error'));

                const result = await RedisManager.cacheIncr(
                    'view:analytics:pageviews',
                    '/about'
                );

                expect(result).toBe(null);
            });
        });

        describe('cacheDecr()', () => {
            it('should decrement counter', async () => {
                mockRedisClient.decr.mockResolvedValue(3);

                const result = await RedisManager.cacheDecr(
                    'view:analytics:counter',
                    'visits'
                );

                expect(result).toBe(3);
            });
        });

        describe('cacheIncrBy()', () => {
            it('should increment by amount', async () => {
                mockRedisClient.incrby.mockResolvedValue(15);

                const result = await RedisManager.cacheIncrBy(
                    'view:analytics:points',
                    'user123',
                    5
                );

                expect(result).toBe(15);
                expect(mockRedisClient.incrby).toHaveBeenCalledWith(
                    expect.any(String),
                    5
                );
            });
        });
    });

    // ========================================================================
    // TTL Operations
    // ========================================================================

    describe('TTL Operations', () => {
        describe('cacheGetTTL()', () => {
            it('should return TTL for key', async () => {
                mockRedisClient.ttl.mockResolvedValue(3600);

                const result = await RedisManager.cacheGetTTL(
                    'controller:test:data',
                    'key1'
                );

                expect(result).toBe(3600);
            });

            it('should return -1 for keys without expiry', async () => {
                mockRedisClient.ttl.mockResolvedValue(-1);

                const result = await RedisManager.cacheGetTTL(
                    'controller:test:data',
                    'key1'
                );

                expect(result).toBe(-1);
            });

            it('should return -2 for non-existent keys', async () => {
                mockRedisClient.ttl.mockResolvedValue(-2);

                const result = await RedisManager.cacheGetTTL(
                    'controller:test:data',
                    'key1'
                );

                expect(result).toBe(-2);
            });
        });

        describe('cacheExpire()', () => {
            it('should set expiration for key', async () => {
                mockRedisClient.expire.mockResolvedValue(1);

                const result = await RedisManager.cacheExpire(
                    'controller:test:data',
                    'key1',
                    7200
                );

                expect(result).toBe(true);
                expect(mockRedisClient.expire).toHaveBeenCalledWith(
                    expect.any(String),
                    7200
                );
            });

            it('should return false if key does not exist', async () => {
                mockRedisClient.expire.mockResolvedValue(0);

                const result = await RedisManager.cacheExpire(
                    'controller:test:data',
                    'nonexistent',
                    3600
                );

                expect(result).toBe(false);
            });
        });
    });

    // ========================================================================
    // Pattern Methods
    // ========================================================================

    describe('Pattern Methods', () => {
        describe('Token Operations', () => {
            describe('cacheSetToken()', () => {
                it('should set token with auto-prefixed path', async () => {
                    mockRedisClient.setex.mockResolvedValue('OK');

                    const result = await RedisManager.cacheSetToken(
                        'controller:auth:dashboard',
                        'user123',
                        'hashed-token',
                        14400
                    );

                    expect(result).toBe(true);
                    expect(mockRedisClient.setex).toHaveBeenCalled();
                    const args = mockRedisClient.setex.mock.calls[0];
                    expect(args[0]).toContain('token'); // Should have 'token' in path
                    expect(args[1]).toBe(14400);
                    expect(args[2]).toBe('hashed-token');
                });

                it('should not double-prefix token path', async () => {
                    mockRedisClient.setex.mockResolvedValue('OK');

                    await RedisManager.cacheSetToken(
                        'controller:auth:token:dashboard',
                        'user123',
                        'hashed-token'
                    );

                    const args = mockRedisClient.setex.mock.calls[0];
                    // Should not have double 'token:token:'
                    expect(args[0]).not.toMatch(/token.*token/);
                });

                it('should use default TTL (3600s)', async () => {
                    mockRedisClient.setex.mockResolvedValue('OK');

                    await RedisManager.cacheSetToken(
                        'controller:auth:dashboard',
                        'user123',
                        'token'
                    );

                    const args = mockRedisClient.setex.mock.calls[0];
                    expect(args[1]).toBe(3600); // Default 1 hour
                });
            });

            describe('cacheGetToken()', () => {
                it('should get token', async () => {
                    mockRedisClient.get.mockResolvedValue('hashed-token');

                    const result = await RedisManager.cacheGetToken(
                        'controller:auth:dashboard',
                        'user123'
                    );

                    expect(result).toBe('hashed-token');
                });

                it('should return null for expired/missing token', async () => {
                    mockRedisClient.get.mockResolvedValue(null);

                    const result = await RedisManager.cacheGetToken(
                        'controller:auth:dashboard',
                        'user123'
                    );

                    expect(result).toBe(null);
                });
            });

            describe('cacheDelToken()', () => {
                it('should delete token', async () => {
                    mockRedisClient.del.mockResolvedValue(1);

                    const result = await RedisManager.cacheDelToken(
                        'controller:auth:dashboard',
                        'user123'
                    );

                    expect(result).toBe(true);
                });
            });

            describe('cacheValidateToken()', () => {
                it('should validate token with simple comparison', async () => {
                    mockRedisClient.get.mockResolvedValue('token123');

                    const result = await RedisManager.cacheValidateToken(
                        'controller:auth:dashboard',
                        'user123',
                        'token123'
                    );

                    expect(result).toBe(true);
                });

                it('should return false for non-matching token', async () => {
                    mockRedisClient.get.mockResolvedValue('token123');

                    const result = await RedisManager.cacheValidateToken(
                        'controller:auth:dashboard',
                        'user123',
                        'wrong-token'
                    );

                    expect(result).toBe(false);
                });

                it('should return false for missing token', async () => {
                    mockRedisClient.get.mockResolvedValue(null);

                    const result = await RedisManager.cacheValidateToken(
                        'controller:auth:dashboard',
                        'user123',
                        'any-token'
                    );

                    expect(result).toBe(false);
                });

                it('should use custom comparison function', async () => {
                    mockRedisClient.get.mockResolvedValue('hashed-token');

                    const compareFn = jest.fn((stored, provided) => {
                        return stored === 'hashed-token' && provided === 'plain-token';
                    });

                    const result = await RedisManager.cacheValidateToken(
                        'controller:auth:dashboard',
                        'user123',
                        'plain-token',
                        compareFn
                    );

                    expect(result).toBe(true);
                    expect(compareFn).toHaveBeenCalledWith('hashed-token', 'plain-token');
                });
            });
        });

        describe('Rate Limiting', () => {
            describe('cacheCheckRateLimit()', () => {
                it('should allow request within limit', async () => {
                    mockRedisClient.incr.mockResolvedValue(3); // 3rd request

                    const result = await RedisManager.cacheCheckRateLimit(
                        'controller:api:report:ip',
                        '192.168.1.1',
                        { limit: 10, windowSeconds: 3600 }
                    );

                    expect(result.allowed).toBe(true);
                    expect(result.count).toBe(3);
                    expect(result.retryAfter).toBe(0);
                });

                it('should deny request over limit', async () => {
                    mockRedisClient.incr.mockResolvedValue(11); // 11th request
                    mockRedisClient.ttl.mockResolvedValue(1800); // 30 min remaining

                    const result = await RedisManager.cacheCheckRateLimit(
                        'controller:api:report:ip',
                        '192.168.1.1',
                        { limit: 10, windowSeconds: 3600 }
                    );

                    expect(result.allowed).toBe(false);
                    expect(result.count).toBe(11);
                    expect(result.retryAfter).toBe(1800000); // milliseconds
                });

                it('should set expiration on first request', async () => {
                    mockRedisClient.incr.mockResolvedValue(1); // First request
                    mockRedisClient.expire.mockResolvedValue(1);

                    await RedisManager.cacheCheckRateLimit(
                        'controller:api:report:ip',
                        '192.168.1.1',
                        { limit: 10, windowSeconds: 3600 }
                    );

                    expect(mockRedisClient.expire).toHaveBeenCalledWith(
                        expect.any(String),
                        3600
                    );
                });

                it('should auto-prefix rateLimit in path', async () => {
                    mockRedisClient.incr.mockResolvedValue(1);

                    await RedisManager.cacheCheckRateLimit(
                        'controller:api:report:ip',
                        '192.168.1.1',
                        { limit: 10 }
                    );

                    const args = mockRedisClient.incr.mock.calls[0];
                    expect(args[0]).toContain('rateLimit');
                });

                it('should not double-prefix if rateLimit already in path', async () => {
                    mockRedisClient.incr.mockResolvedValue(1);

                    await RedisManager.cacheCheckRateLimit(
                        'controller:api:rateLimit:report:ip',
                        '192.168.1.1',
                        { limit: 10 }
                    );

                    const args = mockRedisClient.incr.mock.calls[0];
                    // Should not have 'rateLimit' twice
                    const matches = (args[0].match(/rateLimit/g) || []).length;
                    expect(matches).toBe(1);
                });

                it('should fail open (allow) when Redis unavailable', async () => {
                    RedisManager.connections.cache = null;

                    const result = await RedisManager.cacheCheckRateLimit(
                        'controller:api:report:ip',
                        '192.168.1.1',
                        { limit: 10 }
                    );

                    expect(result.allowed).toBe(true);
                    expect(result.count).toBe(0);
                    expect(global.LogController.logWarning).toHaveBeenCalled();
                });

                it('should fail open when limit option missing', async () => {
                    const result = await RedisManager.cacheCheckRateLimit(
                        'controller:api:report:ip',
                        '192.168.1.1',
                        {} // No limit specified
                    );

                    expect(result.allowed).toBe(true);
                    expect(global.LogController.logError).toHaveBeenCalled();
                });

                it('should use default window (3600s)', async () => {
                    mockRedisClient.incr.mockResolvedValue(1);
                    mockRedisClient.expire.mockResolvedValue(1);

                    await RedisManager.cacheCheckRateLimit(
                        'controller:api:report:ip',
                        '192.168.1.1',
                        { limit: 10 } // No windowSeconds
                    );

                    expect(mockRedisClient.expire).toHaveBeenCalledWith(
                        expect.any(String),
                        3600 // Default 1 hour
                    );
                });
            });
        });

        describe('Bulk Pattern Deletion', () => {
            describe('cacheDelPattern()', () => {
                it('should delete keys matching pattern', async () => {
                    // Mock SCAN to return some keys
                    mockRedisClient.scan
                        .mockResolvedValueOnce(['5', ['key1', 'key2']])
                        .mockResolvedValueOnce(['0', ['key3']]); // cursor 0 = done

                    mockRedisClient.del.mockResolvedValue(3);

                    const result = await RedisManager.cacheDelPattern(
                        'controller:auth:token:*',
                        'user123'
                    );

                    expect(result).toBe(3);
                    expect(mockRedisClient.scan).toHaveBeenCalledTimes(2);
                    expect(mockRedisClient.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
                });

                it('should return 0 when no keys match', async () => {
                    mockRedisClient.scan.mockResolvedValue(['0', []]);

                    const result = await RedisManager.cacheDelPattern(
                        'controller:auth:token:*',
                        'user123'
                    );

                    expect(result).toBe(0);
                    expect(mockRedisClient.del).not.toHaveBeenCalled();
                });

                it('should handle large result sets with SCAN', async () => {
                    // Simulate 3 SCAN iterations
                    mockRedisClient.scan
                        .mockResolvedValueOnce(['10', Array(100).fill('key')])
                        .mockResolvedValueOnce(['20', Array(100).fill('key')])
                        .mockResolvedValueOnce(['0', Array(50).fill('key')]);

                    mockRedisClient.del.mockResolvedValue(250);

                    const result = await RedisManager.cacheDelPattern(
                        'controller:auth:token:*',
                        '*'
                    );

                    expect(result).toBe(250);
                    expect(mockRedisClient.scan).toHaveBeenCalledTimes(3);
                });

                it('should pass wildcard patterns correctly', async () => {
                    mockRedisClient.scan.mockResolvedValue(['0', []]);

                    await RedisManager.cacheDelPattern(
                        'controller:auth:token:*',
                        '*'
                    );

                    const args = mockRedisClient.scan.mock.calls[0];
                    expect(args[0]).toBe('0'); // cursor
                    expect(args[1]).toBe('MATCH');
                    expect(args[2]).toContain('*'); // Should contain wildcard in pattern
                    expect(args[3]).toBe('COUNT');
                    expect(args[4]).toBe(100);
                });
            });
        });
    });

    // ========================================================================
    // Path Parsing & Validation
    // ========================================================================

    describe('Internal Helpers', () => {
        describe('_parseCachePath()', () => {
            it('should parse valid 3-part path', () => {
                const result = RedisManager._parseCachePath('controller:auth:token');

                expect(result).toEqual({
                    component: 'controller',
                    namespace: 'auth',
                    category: 'token'
                });
            });

            it('should parse 4-part path', () => {
                const result = RedisManager._parseCachePath('controller:auth:token:dashboard');

                expect(result).toEqual({
                    component: 'controller',
                    namespace: 'auth',
                    category: 'token:dashboard'
                });
            });

            it('should parse 5-part path', () => {
                const result = RedisManager._parseCachePath('view:user123:prefs:theme:mode');

                expect(result).toEqual({
                    component: 'view',
                    namespace: 'user123',
                    category: 'prefs:theme:mode'
                });
            });

            it('should return null for invalid path (too few parts)', () => {
                const result = RedisManager._parseCachePath('controller:auth');

                expect(result).toBe(null);
                expect(global.LogController.logError).toHaveBeenCalled();
            });

            it('should return null for empty path', () => {
                const result = RedisManager._parseCachePath('');

                expect(result).toBe(null);
            });

            it('should return null for non-string path', () => {
                const result = RedisManager._parseCachePath(null);

                expect(result).toBe(null);
            });
        });

        describe('_buildCacheKey()', () => {
            it('should build properly formatted cache key', () => {
                const key = RedisManager._buildCacheKey(
                    'controller',
                    'auth',
                    'token',
                    'user123'
                );

                expect(key).toContain('controller');
                expect(key).toContain('auth');
                expect(key).toContain('token');
                expect(key).toContain('user123');
            });

            it('should sanitize special characters', () => {
                const key = RedisManager._buildCacheKey(
                    'controller',
                    'auth:test',
                    'token[123]',
                    'user{abc}'
                );

                // Should not contain special chars (replaced with -)
                expect(key).not.toContain('[');
                expect(key).not.toContain(']');
                expect(key).not.toContain('{');
                expect(key).not.toContain('}');
            });

            it('should preserve wildcards for pattern matching', () => {
                const key = RedisManager._buildCacheKey(
                    'controller',
                    'auth',
                    'token',
                    '*'
                );

                expect(key).toContain('*');
            });
        });

        describe('_validateCacheParams()', () => {
            it('should accept valid components', () => {
                const validComponents = ['controller', 'model', 'view', 'util'];

                validComponents.forEach(component => {
                    const result = RedisManager._validateCacheParams(
                        component,
                        'test',
                        'data',
                        'key1'
                    );
                    expect(result).toBe(true);
                });
            });

            it('should reject invalid components', () => {
                const result = RedisManager._validateCacheParams(
                    'invalid',
                    'test',
                    'data',
                    'key1'
                );

                expect(result).toBe(false);
                expect(global.LogController.logError).toHaveBeenCalled();
            });

            it('should reject empty namespace', () => {
                const result = RedisManager._validateCacheParams(
                    'controller',
                    '',
                    'data',
                    'key1'
                );

                expect(result).toBe(false);
            });

            it('should reject empty category', () => {
                const result = RedisManager._validateCacheParams(
                    'controller',
                    'test',
                    '',
                    'key1'
                );

                expect(result).toBe(false);
            });

            it('should reject empty key', () => {
                const result = RedisManager._validateCacheParams(
                    'controller',
                    'test',
                    'data',
                    ''
                );

                expect(result).toBe(false);
            });

            it('should accept numeric keys', () => {
                const result = RedisManager._validateCacheParams(
                    'controller',
                    'test',
                    'data',
                    12345
                );

                expect(result).toBe(true);
            });

            it('should reject namespace > 50 chars', () => {
                const longNamespace = 'a'.repeat(51);

                const result = RedisManager._validateCacheParams(
                    'controller',
                    longNamespace,
                    'data',
                    'key1'
                );

                expect(result).toBe(false);
                expect(global.LogController.logError).toHaveBeenCalledWith(
                    null,
                    'redis-manager._validateCacheParams',
                    expect.stringContaining('namespace too long')
                );
            });

            it('should reject category > 100 chars', () => {
                const longCategory = 'b'.repeat(101);

                const result = RedisManager._validateCacheParams(
                    'controller',
                    'test',
                    longCategory,
                    'key1'
                );

                expect(result).toBe(false);
                expect(global.LogController.logError).toHaveBeenCalledWith(
                    null,
                    'redis-manager._validateCacheParams',
                    expect.stringContaining('category too long')
                );
            });

            it('should reject total key > 200 chars', () => {
                const result = RedisManager._validateCacheParams(
                    'controller',
                    'a'.repeat(50),
                    'b'.repeat(100),
                    'c'.repeat(50)
                );

                expect(result).toBe(false);
                expect(global.LogController.logError).toHaveBeenCalledWith(
                    null,
                    'redis-manager._validateCacheParams',
                    expect.stringContaining('key too long')
                );
            });

            it('should warn on special characters in namespace', () => {
                RedisManager._validateCacheParams(
                    'controller',
                    'test:namespace',
                    'data',
                    'key1'
                );

                expect(global.LogController.logWarning).toHaveBeenCalledWith(
                    null,
                    'redis-manager._validateCacheParams',
                    expect.stringContaining('special characters')
                );
            });
        });
    });

    // ========================================================================
    // Graceful Fallback
    // ========================================================================

    describe('Graceful Fallback', () => {
        it('should handle all operations when Redis unavailable', async () => {
            RedisManager.connections.cache = null;

            // All should return false/null gracefully
            expect(await RedisManager.cacheSet('controller:test:data', 'k', 'v')).toBe(false);
            expect(await RedisManager.cacheGet('controller:test:data', 'k')).toBe(null);
            expect(await RedisManager.cacheDel('controller:test:data', 'k')).toBe(false);
            expect(await RedisManager.cacheExists('controller:test:data', 'k')).toBe(false);
            expect(await RedisManager.cacheSetObject('controller:test:data', 'k', {})).toBe(false);
            expect(await RedisManager.cacheGetObject('controller:test:data', 'k')).toBe(null);
            expect(await RedisManager.cacheIncr('controller:test:data', 'k')).toBe(null);
            expect(await RedisManager.cacheSetToken('controller:auth:dash', 'k', 't')).toBe(false);
            expect(await RedisManager.cacheGetToken('controller:auth:dash', 'k')).toBe(null);
            expect(await RedisManager.cacheDelToken('controller:auth:dash', 'k')).toBe(false);
            expect(await RedisManager.cacheDelPattern('controller:test:*', '*')).toBe(0);

            // Rate limiting should fail open (allow)
            const rateLimitResult = await RedisManager.cacheCheckRateLimit(
                'controller:api:test',
                'key',
                { limit: 5 }
            );
            expect(rateLimitResult.allowed).toBe(true);
        });
    });

    // ========================================================================
    // Metrics Integration
    // ========================================================================

    describe('Cache Metrics', () => {
        it('should track cache operations in statistics', async () => {
            // Reset stats
            RedisManager._cacheStats = {
                hits: 0,
                misses: 0,
                sets: 0,
                gets: 0,
                deletes: 0
            };

            mockRedisClient.set.mockResolvedValue('OK');
            mockRedisClient.get
                .mockResolvedValueOnce('value')
                .mockResolvedValueOnce(null);
            mockRedisClient.del.mockResolvedValue(1);

            await RedisManager.cacheSet('controller:test:data', 'k1', 'v1');
            await RedisManager.cacheGet('controller:test:data', 'k1'); // hit
            await RedisManager.cacheGet('controller:test:data', 'k2'); // miss
            await RedisManager.cacheDel('controller:test:data', 'k1');

            expect(RedisManager._cacheStats.sets).toBe(1);
            expect(RedisManager._cacheStats.gets).toBe(2);
            expect(RedisManager._cacheStats.hits).toBe(1);
            expect(RedisManager._cacheStats.misses).toBe(1);
            expect(RedisManager._cacheStats.deletes).toBe(1);
        });

        it('should calculate hit rate correctly', async () => {
            RedisManager._cacheStats = {
                hits: 8,
                misses: 2,
                sets: 10,
                gets: 10,
                deletes: 0
            };

            const metrics = RedisManager.getMetrics();

            expect(metrics.stats.cache.hitRate).toBe(80); // 8/10 = 80%
        });

        it('should handle zero gets (no division by zero)', async () => {
            RedisManager._cacheStats = {
                hits: 0,
                misses: 0,
                sets: 5,
                gets: 0,
                deletes: 0
            };

            const metrics = RedisManager.getMetrics();

            expect(metrics.stats.cache.hitRate).toBe(0);
        });
    });

    // ========================================================================
    // Edge Cases
    // ========================================================================

    describe('Edge Cases', () => {
        it('should handle empty string values', async () => {
            mockRedisClient.set.mockResolvedValue('OK');

            const result = await RedisManager.cacheSet(
                'controller:test:data',
                'key1',
                ''
            );

            expect(result).toBe(true);
        });

        it('should handle Buffer values', async () => {
            mockRedisClient.set.mockResolvedValue('OK');
            const buffer = Buffer.from('test data');

            const result = await RedisManager.cacheSet(
                'controller:test:data',
                'key1',
                buffer
            );

            expect(result).toBe(true);
        });

        it('should handle Unicode characters in keys', async () => {
            mockRedisClient.set.mockResolvedValue('OK');

            const result = await RedisManager.cacheSet(
                'controller:test:data',
                'user-日本語-123',
                'value'
            );

            expect(result).toBe(true);
        });

        it('should handle concurrent operations', async () => {
            mockRedisClient.set.mockResolvedValue('OK');

            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(
                    RedisManager.cacheSet(
                        'controller:test:data',
                        `key${i}`,
                        `value${i}`
                    )
                );
            }

            const results = await Promise.all(promises);
            expect(results.every(r => r === true)).toBe(true);
        });
    });
});

// EOF webapp/tests/unit/utils/redis-cache.test.js
