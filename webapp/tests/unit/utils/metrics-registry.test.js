/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Metrics Registry
 * @tagline         Unit tests for MetricsRegistry (W-112)
 * @description     Tests metrics provider registration and management
 * @file            webapp/tests/unit/utils/metrics-registry.test.js
 * @version         1.6.18
 * @release         2026-02-18
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.2, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import MetricsRegistry from '../../../utils/metrics-registry.js';

describe('MetricsRegistry (W-112)', () => {

    beforeEach(() => {
        // Clear all providers before each test
        MetricsRegistry.providers.clear();

        // Mock LogController if not available
        if (!global.LogController) {
            global.LogController = {
                logInfo: jest.fn(),
                logError: jest.fn()
            };
        }
    });

    describe('register()', () => {
        test('should register a sync metrics provider', () => {
            const getMetrics = () => ({ component: 'test', status: 'ok' });

            MetricsRegistry.register('test-component', getMetrics, {
                async: false,
                category: 'util'
            });

            expect(MetricsRegistry.isRegistered('test-component')).toBe(true);
        });

        test('should register an async metrics provider', () => {
            const getMetrics = async () => ({ component: 'test', status: 'ok' });

            MetricsRegistry.register('async-component', getMetrics, {
                async: true,
                category: 'controller'
            });

            expect(MetricsRegistry.isRegistered('async-component')).toBe(true);

            const provider = MetricsRegistry.getProvider('async-component');
            expect(provider.async).toBe(true);
        });

        test('should store provider with correct structure', () => {
            const getMetrics = () => ({ status: 'ok' });

            MetricsRegistry.register('my-component', getMetrics, {
                async: false,
                category: 'model'
            });

            const provider = MetricsRegistry.getProvider('my-component');
            expect(provider).toHaveProperty('getMetrics');
            expect(provider).toHaveProperty('async', false);
            expect(provider).toHaveProperty('category', 'model');
            expect(typeof provider.getMetrics).toBe('function');
        });

        test('should default async to false if not specified', () => {
            const getMetrics = () => ({ status: 'ok' });

            MetricsRegistry.register('test', getMetrics, { category: 'util' });

            const provider = MetricsRegistry.getProvider('test');
            expect(provider.async).toBe(false);
        });

        test('should default category to "other" if not specified', () => {
            const getMetrics = () => ({ status: 'ok' });

            MetricsRegistry.register('test', getMetrics, { async: false });

            const provider = MetricsRegistry.getProvider('test');
            expect(provider.category).toBe('other');
        });

        test('should default both async and category if options empty', () => {
            const getMetrics = () => ({ status: 'ok' });

            MetricsRegistry.register('test', getMetrics, {});

            const provider = MetricsRegistry.getProvider('test');
            expect(provider.async).toBe(false);
            expect(provider.category).toBe('other');
        });

        test('should default both async and category if options not provided', () => {
            const getMetrics = () => ({ status: 'ok' });

            MetricsRegistry.register('test', getMetrics);

            const provider = MetricsRegistry.getProvider('test');
            expect(provider.async).toBe(false);
            expect(provider.category).toBe('other');
        });

        test('should throw error if name is not a string', () => {
            const getMetrics = () => ({ status: 'ok' });

            expect(() => {
                MetricsRegistry.register(123, getMetrics);
            }).toThrow('name must be a non-empty string');
        });

        test('should throw error if name is empty string', () => {
            const getMetrics = () => ({ status: 'ok' });

            expect(() => {
                MetricsRegistry.register('', getMetrics);
            }).toThrow('name must be a non-empty string');
        });

        test('should throw error if name is null', () => {
            const getMetrics = () => ({ status: 'ok' });

            expect(() => {
                MetricsRegistry.register(null, getMetrics);
            }).toThrow('name must be a non-empty string');
        });

        test('should throw error if name is undefined', () => {
            const getMetrics = () => ({ status: 'ok' });

            expect(() => {
                MetricsRegistry.register(undefined, getMetrics);
            }).toThrow('name must be a non-empty string');
        });

        test('should throw error if getMetricsFn is not a function', () => {
            expect(() => {
                MetricsRegistry.register('test', 'not-a-function');
            }).toThrow('getMetricsFn must be a function');
        });

        test('should throw error if getMetricsFn is null', () => {
            expect(() => {
                MetricsRegistry.register('test', null);
            }).toThrow('getMetricsFn must be a function');
        });

        test('should throw error if getMetricsFn is undefined', () => {
            expect(() => {
                MetricsRegistry.register('test', undefined);
            }).toThrow('getMetricsFn must be a function');
        });

        test('should throw error if getMetricsFn is an object', () => {
            expect(() => {
                MetricsRegistry.register('test', { status: 'ok' });
            }).toThrow('getMetricsFn must be a function');
        });

        test('should allow overwriting existing provider', () => {
            const getMetrics1 = () => ({ value: 1 });
            const getMetrics2 = () => ({ value: 2 });

            MetricsRegistry.register('test', getMetrics1);
            MetricsRegistry.register('test', getMetrics2);

            const provider = MetricsRegistry.getProvider('test');
            expect(provider.getMetrics()).toEqual({ value: 2 });
        });

        test('should log registration to LogController', () => {
            const getMetrics = () => ({ status: 'ok' });
            const logSpy = jest.spyOn(global.LogController, 'logInfo');

            MetricsRegistry.register('test-log', getMetrics, {
                async: false,
                category: 'util'
            });

            expect(logSpy).toHaveBeenCalledWith(
                null,
                'metrics-registry.register',
                expect.stringContaining('test-log')
            );
            expect(logSpy).toHaveBeenCalledWith(
                null,
                'metrics-registry.register',
                expect.stringContaining('sync')
            );
            expect(logSpy).toHaveBeenCalledWith(
                null,
                'metrics-registry.register',
                expect.stringContaining('util')
            );
        });
    });

    describe('unregister()', () => {
        test('should unregister an existing provider', () => {
            const getMetrics = () => ({ status: 'ok' });

            MetricsRegistry.register('test', getMetrics);
            expect(MetricsRegistry.isRegistered('test')).toBe(true);

            const result = MetricsRegistry.unregister('test');

            expect(result).toBe(true);
            expect(MetricsRegistry.isRegistered('test')).toBe(false);
        });

        test('should return false if provider does not exist', () => {
            const result = MetricsRegistry.unregister('non-existent');
            expect(result).toBe(false);
        });

        test('should log unregistration to LogController', () => {
            const getMetrics = () => ({ status: 'ok' });
            const logSpy = jest.spyOn(global.LogController, 'logInfo');

            MetricsRegistry.register('test-unregister', getMetrics);
            MetricsRegistry.unregister('test-unregister');

            expect(logSpy).toHaveBeenCalledWith(
                null,
                'metrics-registry.unregister',
                expect.stringContaining('test-unregister')
            );
        });

        test('should not log if provider does not exist', () => {
            const logSpy = jest.spyOn(global.LogController, 'logInfo');
            const callCountBefore = logSpy.mock.calls.length;

            MetricsRegistry.unregister('non-existent');

            expect(logSpy.mock.calls.length).toBe(callCountBefore);
        });

        test('should handle null name gracefully', () => {
            const result = MetricsRegistry.unregister(null);
            expect(result).toBe(false);
        });

        test('should handle undefined name gracefully', () => {
            const result = MetricsRegistry.unregister(undefined);
            expect(result).toBe(false);
        });
    });

    describe('getRegisteredNames()', () => {
        test('should return empty array when no providers registered', () => {
            const names = MetricsRegistry.getRegisteredNames();
            expect(names).toEqual([]);
        });

        test('should return array with single provider name', () => {
            const getMetrics = () => ({ status: 'ok' });
            MetricsRegistry.register('test', getMetrics);

            const names = MetricsRegistry.getRegisteredNames();
            expect(names).toEqual(['test']);
        });

        test('should return array with multiple provider names', () => {
            const getMetrics = () => ({ status: 'ok' });
            MetricsRegistry.register('provider1', getMetrics);
            MetricsRegistry.register('provider2', getMetrics);
            MetricsRegistry.register('provider3', getMetrics);

            const names = MetricsRegistry.getRegisteredNames();
            expect(names).toHaveLength(3);
            expect(names).toContain('provider1');
            expect(names).toContain('provider2');
            expect(names).toContain('provider3');
        });

        test('should return current names after unregistering', () => {
            const getMetrics = () => ({ status: 'ok' });
            MetricsRegistry.register('keep', getMetrics);
            MetricsRegistry.register('remove', getMetrics);

            MetricsRegistry.unregister('remove');

            const names = MetricsRegistry.getRegisteredNames();
            expect(names).toEqual(['keep']);
        });
    });

    describe('isRegistered()', () => {
        test('should return true for registered provider', () => {
            const getMetrics = () => ({ status: 'ok' });
            MetricsRegistry.register('test', getMetrics);

            expect(MetricsRegistry.isRegistered('test')).toBe(true);
        });

        test('should return false for non-registered provider', () => {
            expect(MetricsRegistry.isRegistered('non-existent')).toBe(false);
        });

        test('should return false after unregistering', () => {
            const getMetrics = () => ({ status: 'ok' });
            MetricsRegistry.register('test', getMetrics);
            MetricsRegistry.unregister('test');

            expect(MetricsRegistry.isRegistered('test')).toBe(false);
        });

        test('should return false for null name', () => {
            expect(MetricsRegistry.isRegistered(null)).toBe(false);
        });

        test('should return false for undefined name', () => {
            expect(MetricsRegistry.isRegistered(undefined)).toBe(false);
        });

        test('should return false for empty string', () => {
            expect(MetricsRegistry.isRegistered('')).toBe(false);
        });
    });

    describe('getProvider()', () => {
        test('should return provider for registered name', () => {
            const getMetrics = () => ({ status: 'ok' });
            MetricsRegistry.register('test', getMetrics, {
                async: true,
                category: 'controller'
            });

            const provider = MetricsRegistry.getProvider('test');
            expect(provider).not.toBeNull();
            expect(provider.getMetrics).toBe(getMetrics);
            expect(provider.async).toBe(true);
            expect(provider.category).toBe('controller');
        });

        test('should return null for non-registered provider', () => {
            const provider = MetricsRegistry.getProvider('non-existent');
            expect(provider).toBeNull();
        });

        test('should return null after unregistering', () => {
            const getMetrics = () => ({ status: 'ok' });
            MetricsRegistry.register('test', getMetrics);
            MetricsRegistry.unregister('test');

            const provider = MetricsRegistry.getProvider('test');
            expect(provider).toBeNull();
        });

        test('should return correct provider among multiple', () => {
            const getMetrics1 = () => ({ component: 'one' });
            const getMetrics2 = () => ({ component: 'two' });
            const getMetrics3 = () => ({ component: 'three' });

            MetricsRegistry.register('provider1', getMetrics1, { category: 'util' });
            MetricsRegistry.register('provider2', getMetrics2, { category: 'model' });
            MetricsRegistry.register('provider3', getMetrics3, { category: 'controller' });

            const provider = MetricsRegistry.getProvider('provider2');
            expect(provider.getMetrics()).toEqual({ component: 'two' });
            expect(provider.category).toBe('model');
        });

        test('should return null for null name', () => {
            const provider = MetricsRegistry.getProvider(null);
            expect(provider).toBeNull();
        });

        test('should return null for undefined name', () => {
            const provider = MetricsRegistry.getProvider(undefined);
            expect(provider).toBeNull();
        });
    });

    describe('Integration Scenarios', () => {
        test('should handle multiple providers with different categories', () => {
            const utilMetrics = () => ({ component: 'cache', type: 'util' });
            const modelMetrics = () => ({ component: 'user', type: 'model' });
            const controllerMetrics = () => ({ component: 'health', type: 'controller' });

            MetricsRegistry.register('cache', utilMetrics, { async: false, category: 'util' });
            MetricsRegistry.register('user', modelMetrics, { async: true, category: 'model' });
            MetricsRegistry.register('health', controllerMetrics, { async: false, category: 'controller' });

            expect(MetricsRegistry.getRegisteredNames()).toHaveLength(3);
            expect(MetricsRegistry.getProvider('cache').category).toBe('util');
            expect(MetricsRegistry.getProvider('user').async).toBe(true);
            expect(MetricsRegistry.getProvider('health').category).toBe('controller');
        });

        test('should allow register-unregister-register cycle', () => {
            const getMetrics1 = () => ({ value: 1 });
            const getMetrics2 = () => ({ value: 2 });

            MetricsRegistry.register('test', getMetrics1);
            expect(MetricsRegistry.getProvider('test').getMetrics()).toEqual({ value: 1 });

            MetricsRegistry.unregister('test');
            expect(MetricsRegistry.isRegistered('test')).toBe(false);

            MetricsRegistry.register('test', getMetrics2);
            expect(MetricsRegistry.getProvider('test').getMetrics()).toEqual({ value: 2 });
        });

        test('should handle provider with complex metrics function', () => {
            const complexMetrics = (param) => ({
                component: 'complex',
                status: 'ok',
                stats: {
                    count: 100,
                    average: 45.6
                },
                timestamp: new Date().toISOString()
            });

            MetricsRegistry.register('complex', complexMetrics, { async: false, category: 'util' });

            const provider = MetricsRegistry.getProvider('complex');
            const result = provider.getMetrics();
            expect(result).toHaveProperty('component', 'complex');
            expect(result).toHaveProperty('stats');
            expect(result.stats).toHaveProperty('count', 100);
        });

        test('should maintain separate state for different provider instances', () => {
            let counter1 = 0;
            let counter2 = 0;

            const getMetrics1 = () => ({ count: ++counter1 });
            const getMetrics2 = () => ({ count: ++counter2 });

            MetricsRegistry.register('counter1', getMetrics1);
            MetricsRegistry.register('counter2', getMetrics2);

            MetricsRegistry.getProvider('counter1').getMetrics();
            MetricsRegistry.getProvider('counter1').getMetrics();
            MetricsRegistry.getProvider('counter2').getMetrics();

            expect(counter1).toBe(2);
            expect(counter2).toBe(1);
        });
    });

    describe('Edge Cases', () => {
        test('should handle provider names with special characters', () => {
            const getMetrics = () => ({ status: 'ok' });

            MetricsRegistry.register('my-component', getMetrics);
            MetricsRegistry.register('my_component', getMetrics);
            MetricsRegistry.register('myComponent123', getMetrics);

            expect(MetricsRegistry.isRegistered('my-component')).toBe(true);
            expect(MetricsRegistry.isRegistered('my_component')).toBe(true);
            expect(MetricsRegistry.isRegistered('myComponent123')).toBe(true);
        });

        test('should handle very long provider names', () => {
            const getMetrics = () => ({ status: 'ok' });
            const longName = 'very-long-provider-name-with-many-characters-for-testing-purposes';

            MetricsRegistry.register(longName, getMetrics);
            expect(MetricsRegistry.isRegistered(longName)).toBe(true);
        });

        test('should handle provider function that throws error', () => {
            const errorMetrics = () => {
                throw new Error('Metrics calculation failed');
            };

            MetricsRegistry.register('error-provider', errorMetrics);

            const provider = MetricsRegistry.getProvider('error-provider');
            expect(() => provider.getMetrics()).toThrow('Metrics calculation failed');
        });

        test('should handle async provider function', async () => {
            const asyncMetrics = async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return { status: 'ok', async: true };
            };

            MetricsRegistry.register('async-test', asyncMetrics, { async: true });

            const provider = MetricsRegistry.getProvider('async-test');
            const result = await provider.getMetrics();
            expect(result).toHaveProperty('status', 'ok');
            expect(result).toHaveProperty('async', true);
        });
    });
});

// EOF webapp/tests/unit/utils/metrics-registry.test.js
