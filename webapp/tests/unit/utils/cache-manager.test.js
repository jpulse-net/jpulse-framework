/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / CacheManager
 * @tagline         Unit tests for CacheManager utility
 * @description     Tests for centralized cache management with periodic refresh
 * @file            webapp/tests/unit/utils/cache-manager.test.js
 * @version         2.0.8
 * @release         2026-09-20
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import { readFileSync, statSync } from 'fs';
import path from 'path';
import TestUtils from '../../helpers/test-utils.js';

// Mock fs operations
jest.mock('fs/promises');
jest.mock('fs', () => ({
    readFileSync: jest.fn(),
    statSync: jest.fn()
}));

// Mock the LogController
jest.unstable_mockModule('../../../controller/log.js', () => ({
    default: {
        logInfo: jest.fn(),
        logDebug: jest.fn(),
        logError: jest.fn(),
        logWarning: jest.fn()
    }
}));

describe('CacheManager', () => {
    // TODO: Fix ES module mocking issues post-1.0 release (W-080) - FIXED
    let cache;
    let testDir;
    let testFile;
    let mockLogController;
    let cacheManager;
    let LogController;

    beforeEach(async () => {

        cacheManager = (await import('../../../utils/cache-manager.js')).default;
        LogController = (await import('../../../controller/log.js')).default;

        // Reset all mocks
        jest.clearAllMocks();

        // Get the mocked LogController - use the mock directly
        mockLogController = {
            logInfo: jest.fn(),
            logDebug: jest.fn(),
            logError: jest.fn(),
            logWarning: jest.fn()
        };

        // Setup test paths
        testDir = '/test/dir';
        testFile = path.join(testDir, 'test.txt');

        // Create cache instance using CacheManager
        cache = cacheManager.register({
            enabled: true,
            checkInterval: 0, // Disable periodic refresh in tests
            directoryTtl: 5000
        }, 'TestCache');

        // Setup mock file system responses
        readFileSync.mockReturnValue('test file content');
        statSync.mockReturnValue({ mtime: { valueOf: () => 1000000000 } });
    });

    afterEach(() => {
        // Clean up cache
        if (cache) {
            cache.clearAll();
        }
        // Shutdown cache manager to clean up any timers
        cacheManager.shutdown();
        jest.restoreAllMocks();
    });

    describe('Cache Registration', () => {
        it('should register a new cache with default config', () => {
            const newCache = cacheManager.register({ enabled: true }, 'NewTestCache');
            expect(newCache).toBeDefined();
            expect(typeof newCache.getFileSync).toBe('function');
            expect(typeof newCache.getStats).toBe('function');
        });

        it('should register a cache with custom config', () => {
            const config = {
                enabled: false,
                checkInterval: 2,
                directoryTtl: 15000
            };
            const newCache = cacheManager.register(config, 'CustomCache');

            const stats = newCache.getStats();
            expect(stats.config.enabled).toBe(false);
            expect(stats.config.checkInterval).toBe(2);
            expect(stats.config.directoryTtl).toBe(15000);
            expect(stats.name).toBe('CustomCache');
        });
    });

    describe('getFileSync() method', () => {
        it('should read and cache file content', () => {
            const result = cache.getFileSync(testFile);

            expect(result).toBe('test file content');
            expect(readFileSync).toHaveBeenCalledWith(testFile, 'utf8');
            expect(statSync).toHaveBeenCalledWith(testFile);
        });

        it('should return cached content on subsequent calls', () => {
            // First call
            const result1 = cache.getFileSync(testFile);
            // Second call
            const result2 = cache.getFileSync(testFile);

            expect(result1).toBe('test file content');
            expect(result2).toBe('test file content');
            expect(readFileSync).toHaveBeenCalledTimes(1); // Only called once
        });

        it('should handle file not found', () => {
            const nonExistentFile = '/path/to/nonexistent.txt';
            const error = new Error('File not found');
            error.code = 'ENOENT';

            readFileSync.mockImplementation((filePath) => {
                if (filePath === nonExistentFile) {
                    throw error;
                }
                return 'test content';
            });

            const result = cache.getFileSync(nonExistentFile);
            expect(result).toBeNull();
        });

        it('should cache "file not found" state', () => {
            const nonExistentFile = '/path/to/nonexistent.txt';
            const error = new Error('File not found');
            error.code = 'ENOENT';

            readFileSync.mockImplementation((filePath) => {
                if (filePath === nonExistentFile) {
                    throw error;
                }
                return 'test content';
            });

            // First call
            const result1 = cache.getFileSync(nonExistentFile);
            // Second call
            const result2 = cache.getFileSync(nonExistentFile);

            expect(result1).toBeNull();
            expect(result2).toBeNull();
            expect(readFileSync).toHaveBeenCalledTimes(1); // Only called once
        });

        it('should work when caching is disabled', () => {
            const disabledCache = cacheManager.register({ enabled: false }, 'DisabledCache');

            const result = disabledCache.getFileSync(testFile);

            expect(result).toBe('test file content');
            expect(readFileSync).toHaveBeenCalledWith(testFile, 'utf8');
        });
    });

    describe('getStats() method', () => {
        it('should return cache statistics', () => {
            // Load a file to populate cache
            cache.getFileSync(testFile);

            const stats = cache.getStats();

            expect(stats).toEqual({
                name: 'TestCache',
                fileCount: 1,
                directoryCount: 0,
                config: {
                    enabled: true,
                    checkInterval: 0,
                    directoryTtl: 5000
                }
            });
        });

        it('should return empty stats for new cache', () => {
            const stats = cache.getStats();

            expect(stats.fileCount).toBe(0);
            expect(stats.directoryCount).toBe(0);
            expect(stats.name).toBe('TestCache');
        });
    });

    describe('clearAll() method', () => {
        it('should clear all cached files', () => {
            // Load some files
            cache.getFileSync(testFile);
            cache.getFileSync('/another/file.txt');

            // Verify files are cached
            let stats = cache.getStats();
            expect(stats.fileCount).toBe(2);

            // Clear all
            cache.clearAll();

            // Verify cache is empty
            stats = cache.getStats();
            expect(stats.fileCount).toBe(0);
        });
    });

    describe('CacheManager global methods', () => {
        it('should return list of registered cache names', () => {
            const cacheNames = cacheManager.getRegisteredCacheNames();
            expect(cacheNames).toContain('TestCache');
        });

        it('should return global metrics', () => {
            const globalMetrics = cacheManager.getMetrics();
            expect(globalMetrics.stats.totalCaches).toBeGreaterThan(0);
            expect(globalMetrics.stats.caches.TestCache).toBeDefined();
        });

        it('should refresh cache manually', async () => {
            // Load a file first
            const originalContent = cache.getFileSync(testFile);
            expect(originalContent).toBe('test file content');

            // Mock file change
            statSync.mockReturnValue({ mtime: { valueOf: () => 2000000000 } });
            readFileSync.mockReturnValue('updated content');

            await cacheManager.refreshCache('TestCache');

            // Cache should be cleared, so next read should get updated content
            const updatedContent = cache.getFileSync(testFile);
            expect(updatedContent).toBe('updated content');
        });

        it('smart and periodic refresh completed is logDebug, failures stay logError', async () => {
            cache.getFileSync(testFile);
            if (typeof fs.stat.mockResolvedValue === 'function') {
                fs.stat.mockResolvedValue({ mtime: { valueOf: () => 1000000000 } });
            }

            const logDebugSpy = jest.spyOn(LogController, 'logDebug').mockImplementation(() => {});
            const logInfoSpy = jest.spyOn(LogController, 'logInfo').mockImplementation(() => {});
            const logErrorSpy = jest.spyOn(LogController, 'logError').mockImplementation(() => {});

            try {
                await cacheManager._refreshCache(cache);

                expect(logDebugSpy).toHaveBeenCalledWith(
                    null,
                    'cache-manager._refreshCache',
                    expect.stringContaining('Smart refresh completed')
                );
                expect(logInfoSpy.mock.calls.some((call) =>
                    call[1] === 'cache-manager._refreshCache'
                )).toBe(false);

                if (typeof fs.stat.mockRejectedValueOnce === 'function') {
                    const statError = new Error('permission denied');
                    statError.code = 'EACCES';
                    fs.stat.mockRejectedValueOnce(statError);
                    await cacheManager._refreshCache(cache);
                    expect(logErrorSpy).toHaveBeenCalledWith(
                        null,
                        'cache-manager._refreshCache',
                        expect.stringContaining('Error checking')
                    );
                }

                jest.useFakeTimers();
                cacheManager.register({
                    enabled: true,
                    checkInterval: 1
                }, 'PeriodicCache');
                logDebugSpy.mockClear();
                logInfoSpy.mockClear();
                logErrorSpy.mockClear();

                await jest.advanceTimersByTimeAsync(60000);

                expect(logDebugSpy).toHaveBeenCalledWith(
                    null,
                    'cache-manager.refresh',
                    expect.stringContaining('Periodic refresh completed')
                );
                expect(logInfoSpy.mock.calls.some((call) =>
                    call[1] === 'cache-manager.refresh'
                )).toBe(false);
            } finally {
                logDebugSpy.mockRestore();
                logInfoSpy.mockRestore();
                logErrorSpy.mockRestore();
                jest.useRealTimers();
                cacheManager.unregister('PeriodicCache');
            }
        });
    });
});

// EOF webapp/tests/unit/utils/cache-manager.test.js
