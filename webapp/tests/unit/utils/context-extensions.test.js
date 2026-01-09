/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Context Extensions
 * @tagline         Unit tests for ContextExtensions (W-014)
 * @description     Tests Handlebars context extension system
 * @file            webapp/tests/unit/utils/context-extensions.test.js
 * @version         1.4.9
 * @release         2026-01-09
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.2, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import ContextExtensions from '../../../utils/context-extensions.js';

describe('ContextExtensions (W-014)', () => {

    beforeEach(() => {
        // Clear all providers and cache before each test
        ContextExtensions.extensions.providers.clear();
        ContextExtensions.extensions.cache.clear();
        ContextExtensions.extensions.lastUpdate = null;

        // Mock LogController
        if (!global.LogController) {
            global.LogController = {
                logInfo: jest.fn(),
                logError: jest.fn()
            };
        }
    });

    describe('registerProvider()', () => {
        test('should register a provider with default priority', () => {
            const provider = () => ({ custom: 'data' });

            ContextExtensions.registerProvider('test', provider);

            const registered = ContextExtensions.extensions.providers.get('test');
            expect(registered).toBeDefined();
            expect(registered.name).toBe('test');
            expect(registered.provider).toBe(provider);
            expect(registered.priority).toBe(100);
        });

        test('should register a provider with custom priority', () => {
            const provider = () => ({ custom: 'data' });

            ContextExtensions.registerProvider('test', provider, { priority: 50 });

            const registered = ContextExtensions.extensions.providers.get('test');
            expect(registered.priority).toBe(50);
        });

        test('should store cache option correctly', () => {
            const provider = () => ({ custom: 'data' });

            ContextExtensions.registerProvider('test', provider, { cache: false });

            const registered = ContextExtensions.extensions.providers.get('test');
            expect(registered.cache).toBe(false);
        });

        test('should default cache to true if not specified', () => {
            const provider = () => ({ custom: 'data' });

            ContextExtensions.registerProvider('test', provider);

            const registered = ContextExtensions.extensions.providers.get('test');
            expect(registered.cache).toBe(true);
        });

        test('should record registration timestamp', () => {
            const provider = () => ({ custom: 'data' });
            const beforeTime = new Date().toISOString();

            ContextExtensions.registerProvider('test', provider);

            const registered = ContextExtensions.extensions.providers.get('test');
            expect(registered.registeredAt).toBeDefined();
            expect(registered.registeredAt >= beforeTime).toBe(true);
        });

        test('should clear cache when registering new provider', () => {
            ContextExtensions.extensions.cache.set('key1', { data: 'cached' });
            expect(ContextExtensions.extensions.cache.size).toBe(1);

            const provider = () => ({ custom: 'data' });
            ContextExtensions.registerProvider('test', provider);

            expect(ContextExtensions.extensions.cache.size).toBe(0);
        });

        test('should update lastUpdate timestamp', () => {
            const provider = () => ({ custom: 'data' });
            const beforeTime = new Date().toISOString();

            ContextExtensions.registerProvider('test', provider);

            expect(ContextExtensions.extensions.lastUpdate).toBeDefined();
            expect(ContextExtensions.extensions.lastUpdate >= beforeTime).toBe(true);
        });

        test('should log registration to LogController', () => {
            const provider = () => ({ custom: 'data' });
            const logSpy = jest.spyOn(global.LogController, 'logInfo');

            ContextExtensions.registerProvider('test-provider', provider, { priority: 75 });

            expect(logSpy).toHaveBeenCalledWith(
                null,
                'context-extensions',
                expect.stringContaining('test-provider')
            );
            expect(logSpy).toHaveBeenCalledWith(
                null,
                'context-extensions',
                expect.stringContaining('75')
            );
        });

        test('should allow overwriting existing provider', () => {
            const provider1 = () => ({ value: 1 });
            const provider2 = () => ({ value: 2 });

            ContextExtensions.registerProvider('test', provider1);
            ContextExtensions.registerProvider('test', provider2);

            const registered = ContextExtensions.extensions.providers.get('test');
            expect(registered.provider).toBe(provider2);
        });
    });

    describe('getExtendedContext()', () => {
        test('should merge provider context with base context', async () => {
            const provider = () => ({ custom: 'value' });
            ContextExtensions.registerProvider('test', provider);

            const baseContext = { base: 'data' };
            const mockReq = { session: {}, path: '/test' };

            const result = await ContextExtensions.getExtendedContext(baseContext, mockReq);

            expect(result.base).toBe('data');
            expect(result.custom).toBe('value');
        });

        test('should execute providers in priority order (lower first)', async () => {
            const order = [];
            const provider1 = () => { order.push(1); return { val1: 1 }; };
            const provider2 = () => { order.push(2); return { val2: 2 }; };
            const provider3 = () => { order.push(3); return { val3: 3 }; };

            ContextExtensions.registerProvider('low', provider1, { priority: 10 });
            ContextExtensions.registerProvider('high', provider3, { priority: 100 });
            ContextExtensions.registerProvider('mid', provider2, { priority: 50 });

            const baseContext = {};
            const mockReq = { session: {}, path: '/test' };

            await ContextExtensions.getExtendedContext(baseContext, mockReq);

            expect(order).toEqual([1, 2, 3]);
        });

        test('should allow later providers to override earlier ones', async () => {
            const provider1 = () => ({ key: 'first' });
            const provider2 = () => ({ key: 'second' });

            ContextExtensions.registerProvider('first', provider1, { priority: 10 });
            ContextExtensions.registerProvider('second', provider2, { priority: 20 });

            const baseContext = {};
            const mockReq = { session: {}, path: '/test' };

            const result = await ContextExtensions.getExtendedContext(baseContext, mockReq);

            expect(result.key).toBe('second');
        });

        test('should cache extended context for same request', async () => {
            let callCount = 0;
            const provider = () => { callCount++; return { custom: 'value' }; };
            ContextExtensions.registerProvider('test', provider);

            const baseContext = { base: 'data' };
            const mockReq = { session: { user: { username: 'testuser' } }, path: '/test' };

            await ContextExtensions.getExtendedContext(baseContext, mockReq);
            await ContextExtensions.getExtendedContext(baseContext, mockReq);

            expect(callCount).toBe(1); // Should only call provider once
        });

        test('should not cache for different requests', async () => {
            let callCount = 0;
            const provider = () => { callCount++; return { custom: 'value' }; };
            ContextExtensions.registerProvider('test', provider);

            const baseContext = { base: 'data' };
            const mockReq1 = { session: { user: { username: 'user1' } }, path: '/test' };
            const mockReq2 = { session: { user: { username: 'user2' } }, path: '/test' };

            await ContextExtensions.getExtendedContext(baseContext, mockReq1);
            await ContextExtensions.getExtendedContext(baseContext, mockReq2);

            expect(callCount).toBe(2); // Should call provider for each unique request
        });

        test('should handle async providers', async () => {
            const provider = async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return { async: 'data' };
            };
            ContextExtensions.registerProvider('async', provider);

            const baseContext = {};
            const mockReq = { session: {}, path: '/test' };

            const result = await ContextExtensions.getExtendedContext(baseContext, mockReq);

            expect(result.async).toBe('data');
        });

        test('should handle provider that returns null', async () => {
            const provider = () => null;
            ContextExtensions.registerProvider('null-provider', provider);

            const baseContext = { base: 'data' };
            const mockReq = { session: {}, path: '/test' };

            const result = await ContextExtensions.getExtendedContext(baseContext, mockReq);

            expect(result.base).toBe('data');
            expect(Object.keys(result).length).toBe(1);
        });

        test('should handle provider that returns non-object', async () => {
            const provider = () => 'string';
            ContextExtensions.registerProvider('string-provider', provider);

            const baseContext = { base: 'data' };
            const mockReq = { session: {}, path: '/test' };

            const result = await ContextExtensions.getExtendedContext(baseContext, mockReq);

            expect(result.base).toBe('data');
            expect(Object.keys(result).length).toBe(1);
        });

        test('should log error when provider throws', async () => {
            const provider = () => { throw new Error('Provider failed'); };
            ContextExtensions.registerProvider('error-provider', provider);
            const logSpy = jest.spyOn(global.LogController, 'logError');

            const baseContext = { base: 'data' };
            const mockReq = { session: {}, path: '/test' };

            const result = await ContextExtensions.getExtendedContext(baseContext, mockReq);

            expect(logSpy).toHaveBeenCalledWith(
                null,
                'context-extensions.getExtendedContext',
                expect.stringContaining('error-provider')
            );
            expect(result.base).toBe('data'); // Should still return base context
        });

        test('should continue with other providers if one fails', async () => {
            const provider1 = () => ({ val1: 1 });
            const provider2 = () => { throw new Error('Failed'); };
            const provider3 = () => ({ val3: 3 });

            ContextExtensions.registerProvider('first', provider1, { priority: 10 });
            ContextExtensions.registerProvider('error', provider2, { priority: 20 });
            ContextExtensions.registerProvider('third', provider3, { priority: 30 });

            const baseContext = {};
            const mockReq = { session: {}, path: '/test' };

            const result = await ContextExtensions.getExtendedContext(baseContext, mockReq);

            expect(result.val1).toBe(1);
            expect(result.val3).toBe(3);
        });

        test('should fallback to base context if all providers fail', async () => {
            const provider = () => { throw new Error('Failed'); };
            ContextExtensions.registerProvider('error', provider);

            const baseContext = { base: 'data' };
            const mockReq = { session: {}, path: '/test' };

            const result = await ContextExtensions.getExtendedContext(baseContext, mockReq);

            expect(result).toEqual(baseContext);
        });
    });

    describe('getCacheKey()', () => {
        test('should generate key from username and path', () => {
            const req = {
                session: { user: { username: 'testuser' } },
                path: '/test'
            };

            const key = ContextExtensions.getCacheKey(req);

            expect(key).toBe('testuser:/test');
        });

        test('should use "guest" for unauthenticated users', () => {
            const req = {
                session: {},
                path: '/public'
            };

            const key = ContextExtensions.getCacheKey(req);

            expect(key).toBe('guest:/public');
        });

        test('should handle missing session', () => {
            const req = { path: '/test' };

            const key = ContextExtensions.getCacheKey(req);

            expect(key).toBe('guest:/test');
        });

        test('should handle missing path', () => {
            const req = {
                session: { user: { username: 'user' } }
            };

            const key = ContextExtensions.getCacheKey(req);

            expect(key).toBe('user:/');
        });

        test('should generate different keys for different users', () => {
            const req1 = { session: { user: { username: 'user1' } }, path: '/test' };
            const req2 = { session: { user: { username: 'user2' } }, path: '/test' };

            const key1 = ContextExtensions.getCacheKey(req1);
            const key2 = ContextExtensions.getCacheKey(req2);

            expect(key1).not.toBe(key2);
        });

        test('should generate different keys for different paths', () => {
            const req1 = { session: { user: { username: 'user' } }, path: '/page1' };
            const req2 = { session: { user: { username: 'user' } }, path: '/page2' };

            const key1 = ContextExtensions.getCacheKey(req1);
            const key2 = ContextExtensions.getCacheKey(req2);

            expect(key1).not.toBe(key2);
        });
    });

    describe('clearCache()', () => {
        beforeEach(() => {
            ContextExtensions.extensions.cache.set('user1:/page1', { data: 1 });
            ContextExtensions.extensions.cache.set('user1:/page2', { data: 2 });
            ContextExtensions.extensions.cache.set('user2:/page1', { data: 3 });
        });

        test('should clear all cache when no pattern provided', () => {
            expect(ContextExtensions.extensions.cache.size).toBe(3);

            ContextExtensions.clearCache();

            expect(ContextExtensions.extensions.cache.size).toBe(0);
        });

        test('should clear cache matching pattern', () => {
            ContextExtensions.clearCache('user1:');

            expect(ContextExtensions.extensions.cache.size).toBe(1);
            expect(ContextExtensions.extensions.cache.has('user2:/page1')).toBe(true);
        });

        test('should support regex patterns', () => {
            ContextExtensions.clearCache('/page1$');

            expect(ContextExtensions.extensions.cache.size).toBe(1);
            expect(ContextExtensions.extensions.cache.has('user1:/page2')).toBe(true);
        });

        test('should handle pattern with no matches', () => {
            ContextExtensions.clearCache('nonexistent');

            expect(ContextExtensions.extensions.cache.size).toBe(3);
        });
    });

    describe('getMetrics()', () => {
        test('should return metrics with correct structure', () => {
            const provider = () => ({ custom: 'data' });
            ContextExtensions.registerProvider('test', provider);

            const metrics = ContextExtensions.getMetrics();

            expect(metrics).toHaveProperty('component', 'ContextExtensions');
            expect(metrics).toHaveProperty('status', 'ok');
            expect(metrics).toHaveProperty('initialized', true);
            expect(metrics).toHaveProperty('stats');
            expect(metrics).toHaveProperty('meta');
            expect(metrics).toHaveProperty('timestamp');
        });

        test('should include provider count in stats', () => {
            const provider = () => ({ custom: 'data' });
            ContextExtensions.registerProvider('test1', provider);
            ContextExtensions.registerProvider('test2', provider);

            const metrics = ContextExtensions.getMetrics();

            expect(metrics.stats.providers).toBe(2);
        });

        test('should include cache size in stats', () => {
            ContextExtensions.extensions.cache.set('key1', { data: 1 });
            ContextExtensions.extensions.cache.set('key2', { data: 2 });

            const metrics = ContextExtensions.getMetrics();

            expect(metrics.stats.cacheSize).toBe(2);
        });

        test('should include provider list with details', () => {
            const provider = () => ({ custom: 'data' });
            ContextExtensions.registerProvider('test', provider, { priority: 50, cache: false });

            const metrics = ContextExtensions.getMetrics();

            expect(metrics.stats.providerList).toHaveLength(1);
            expect(metrics.stats.providerList[0]).toHaveProperty('name', 'test');
            expect(metrics.stats.providerList[0]).toHaveProperty('priority', 50);
            expect(metrics.stats.providerList[0]).toHaveProperty('cache', false);
            expect(metrics.stats.providerList[0]).toHaveProperty('registeredAt');
        });
    });

    describe('Integration Scenarios', () => {
        test('should handle multiple providers with different priorities', async () => {
            const provider1 = () => ({ val1: 'first', shared: 'first' });
            const provider2 = () => ({ val2: 'second', shared: 'second' });
            const provider3 = () => ({ val3: 'third', shared: 'third' });

            ContextExtensions.registerProvider('low', provider1, { priority: 10 });
            ContextExtensions.registerProvider('high', provider3, { priority: 100 });
            ContextExtensions.registerProvider('mid', provider2, { priority: 50 });

            const baseContext = {};
            const mockReq = { session: {}, path: '/test' };

            const result = await ContextExtensions.getExtendedContext(baseContext, mockReq);

            expect(result.val1).toBe('first');
            expect(result.val2).toBe('second');
            expect(result.val3).toBe('third');
            expect(result.shared).toBe('third'); // Highest priority wins
        });

        test('should handle complex context objects', async () => {
            const provider = () => ({
                custom: {
                    nested: {
                        data: 'value'
                    },
                    array: [1, 2, 3]
                },
                func: () => 'result'
            });
            ContextExtensions.registerProvider('complex', provider);

            const baseContext = {};
            const mockReq = { session: {}, path: '/test' };

            const result = await ContextExtensions.getExtendedContext(baseContext, mockReq);

            expect(result.custom.nested.data).toBe('value');
            expect(result.custom.array).toEqual([1, 2, 3]);
            expect(typeof result.func).toBe('function');
            expect(result.func()).toBe('result');
        });
    });
});

// EOF webapp/tests/unit/utils/context-extensions.test.js
