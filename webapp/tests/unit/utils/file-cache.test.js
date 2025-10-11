/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / FileCache
 * @tagline         Unit tests for FileCache utility
 * @description     Tests for file-based caching with directory-level optimization
 * @file            webapp/tests/unit/utils/file-cache.test.js
 * @version         0.9.7
 * @release         2025-10-11
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           80%, Cursor 1.2, Claude Sonnet 4
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import TestUtils from '../../helpers/test-utils.js';

// Mock fs operations
jest.mock('fs/promises');

// Mock the LogController
jest.mock('../../../controller/log.js', () => ({
    default: {
        logInfo: jest.fn(),
        logError: jest.fn()
    }
}));

// Import after mocks are set up
import FileCache from '../../../utils/file-cache.js';

describe.skip('FileCache', () => {
    let fileCache;
    let testDir;
    let testFile;
    let mockLogController;

    beforeEach(async () => {
        // Reset all mocks
        jest.clearAllMocks();

        // Get the mocked LogController
        mockLogController = (await import('../../../controller/log.js')).default;

        // Setup test paths
        testDir = '/test/dir';
        testFile = path.join(testDir, 'test.txt');

        // Create FileCache instance
        fileCache = new FileCache({
            enabled: true,
            checkInterval: 1000,
            directoryTtl: 5000
        }, 'TestCache');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Constructor', () => {
        it('should initialize with default config', () => {
            const cache = new FileCache();
            expect(cache.config.enabled).toBe(true);
            expect(cache.config.checkInterval).toBe(1000);
            expect(cache.config.directoryTtl).toBe(10000);
            expect(cache.name).toBe('FileCache');
        });

        it('should initialize with custom config', () => {
            const config = {
                enabled: false,
                checkInterval: 2000,
                directoryTtl: 15000
            };
            const cache = new FileCache(config, 'CustomCache');

            expect(cache.config.enabled).toBe(false);
            expect(cache.config.checkInterval).toBe(2000);
            expect(cache.config.directoryTtl).toBe(15000);
            expect(cache.name).toBe('CustomCache');
        });

        it('should log initialization', () => {
            expect(mockLogController.logInfo).toHaveBeenCalledWith(
                null,
                'file-cache.constructor',
                expect.stringContaining('Initialized TestCache with config')
            );
        });
    });

    describe('get() method', () => {
        const mockContent = 'test file content';
        const mockLoader = jest.fn().mockResolvedValue(mockContent);

        beforeEach(() => {
            // Mock directory operations
            fs.stat.mockImplementation((filePath) => {
                if (filePath === testDir) {
                    return Promise.resolve({
                        mtime: { valueOf: () => 1000000000 }
                    });
                } else if (filePath === testFile) {
                    return Promise.resolve({
                        mtime: { valueOf: () => 1000000001 }
                    });
                }
                throw new Error('File not found');
            });

            fs.readdir.mockResolvedValue(['test.txt']);
        });

        it('should load file when cache is disabled', async () => {
            const disabledCache = new FileCache({ enabled: false });
            const result = await disabledCache.get(testFile, mockLoader);

            expect(result).toBe(mockContent);
            expect(mockLoader).toHaveBeenCalledWith(testFile);
            expect(mockLogController.logInfo).toHaveBeenCalledWith(
                null,
                'file-cache.get',
                expect.stringContaining('Caching disabled, loading directly')
            );
        });

        it('should load and cache file on first access', async () => {
            const result = await fileCache.get(testFile, mockLoader);

            expect(result).toBe(mockContent);
            expect(mockLoader).toHaveBeenCalledWith(testFile);
            expect(fs.stat).toHaveBeenCalledWith(testDir);
            expect(fs.readdir).toHaveBeenCalledWith(testDir);
            expect(fs.stat).toHaveBeenCalledWith(testFile);

            expect(mockLogController.logInfo).toHaveBeenCalledWith(
                null,
                'file-cache.get',
                expect.stringContaining('Loaded and cached')
            );
        });

        it('should return cached content on second access', async () => {
            // First access
            await fileCache.get(testFile, mockLoader);
            jest.clearAllMocks();

            // Second access
            const result = await fileCache.get(testFile, mockLoader);

            expect(result).toBe(mockContent);
            expect(mockLoader).not.toHaveBeenCalled();
            expect(mockLogController.logInfo).toHaveBeenCalledWith(
                null,
                'file-cache.get',
                expect.stringContaining('Cache hit')
            );
        });

        it('should refresh file when timestamp changes', async () => {
            // First access
            await fileCache.get(testFile, mockLoader);

            // Change file timestamp
            fs.stat.mockImplementation((filePath) => {
                if (filePath === testDir) {
                    return Promise.resolve({
                        mtime: { valueOf: () => 1000000000 }
                    });
                } else if (filePath === testFile) {
                    return Promise.resolve({
                        mtime: { valueOf: () => 1000000002 } // Changed timestamp
                    });
                }
                throw new Error('File not found');
            });

            jest.clearAllMocks();
            const newContent = 'updated content';
            mockLoader.mockResolvedValue(newContent);

            // Second access with changed timestamp
            const result = await fileCache.get(testFile, mockLoader);

            expect(result).toBe(newContent);
            expect(mockLoader).toHaveBeenCalledWith(testFile);
        });

        it('should handle deleted files', async () => {
            // First access
            await fileCache.get(testFile, mockLoader);

            // File is deleted from directory
            fs.readdir.mockResolvedValue([]);
            jest.clearAllMocks();

            // Second access
            const result = await fileCache.get(testFile, mockLoader);

            expect(result).toBeNull();
            expect(mockLoader).not.toHaveBeenCalled();
            expect(mockLogController.logInfo).toHaveBeenCalledWith(
                null,
                'file-cache.get',
                expect.stringContaining('File deleted, removed from cache')
            );
        });

        it('should handle directory TTL expiration', async () => {
            // First access
            await fileCache.get(testFile, mockLoader);

            // Mock time progression beyond TTL
            const originalDateNow = Date.now;
            Date.now = jest.fn(() => originalDateNow() + 10000); // 10 seconds later

            jest.clearAllMocks();

            // Second access after TTL expiration
            await fileCache.get(testFile, mockLoader);

            expect(fs.stat).toHaveBeenCalledWith(testDir); // Directory refresh
            expect(mockLogController.logInfo).toHaveBeenCalledWith(
                null,
                'file-cache._checkDirectoryChanged',
                expect.stringContaining('Directory cache TTL expired')
            );

            // Restore Date.now
            Date.now = originalDateNow;
        });

        it('should handle file system errors gracefully', async () => {
            fs.stat.mockRejectedValue(new Error('Permission denied'));

            const result = await fileCache.get(testFile, mockLoader);

            expect(result).toBe(mockContent);
            expect(mockLoader).toHaveBeenCalledWith(testFile);
            expect(mockLogController.logError).toHaveBeenCalled();
        });
    });

    describe('refreshFile() method', () => {
        const mockContent = 'test content';
        const mockLoader = jest.fn().mockResolvedValue(mockContent);

        beforeEach(() => {
            fs.stat.mockImplementation((filePath) => {
                if (filePath === testDir) {
                    return Promise.resolve({
                        mtime: { valueOf: () => 1000000000 }
                    });
                } else if (filePath === testFile) {
                    return Promise.resolve({
                        mtime: { valueOf: () => 1000000001 }
                    });
                }
                throw new Error('File not found');
            });
            fs.readdir.mockResolvedValue(['test.txt']);
        });

        it('should force refresh cached file', async () => {
            // First load
            await fileCache.get(testFile, mockLoader);
            jest.clearAllMocks();

            const newContent = 'refreshed content';
            mockLoader.mockResolvedValue(newContent);

            // Force refresh
            const result = await fileCache.refreshFile(testFile, mockLoader);

            expect(result).toBe(newContent);
            expect(mockLoader).toHaveBeenCalledWith(testFile);
            expect(mockLogController.logInfo).toHaveBeenCalledWith(
                null,
                'file-cache.refreshFile',
                expect.stringContaining('Manually refreshed')
            );
        });

        it('should handle refresh when cache is disabled', async () => {
            const disabledCache = new FileCache({ enabled: false });
            const result = await disabledCache.refreshFile(testFile, mockLoader);

            expect(result).toBe(mockContent);
            expect(mockLoader).toHaveBeenCalledWith(testFile);
        });
    });

    describe('clearAll() method', () => {
        it('should clear all caches', async () => {
            const mockLoader = jest.fn().mockResolvedValue('content');

            // Setup mocks
            fs.stat.mockResolvedValue({ mtime: { valueOf: () => 1000000000 } });
            fs.readdir.mockResolvedValue(['test.txt']);

            // Load some files
            await fileCache.get(testFile, mockLoader);

            // Clear all
            fileCache.clearAll();

            // Verify caches are empty
            const stats = fileCache.getStats();
            expect(stats.fileCount).toBe(0);
            expect(stats.directoryCount).toBe(0);

            expect(mockLogController.logInfo).toHaveBeenCalledWith(
                null,
                'file-cache.clearAll',
                expect.stringContaining('Cleared')
            );
        });
    });

    describe('getStats() method', () => {
        it('should return cache statistics', async () => {
            const mockLoader = jest.fn().mockResolvedValue('content');

            // Setup mocks
            fs.stat.mockResolvedValue({ mtime: { valueOf: () => 1000000000 } });
            fs.readdir.mockResolvedValue(['test.txt']);

            // Load a file
            await fileCache.get(testFile, mockLoader);

            const stats = fileCache.getStats();

            expect(stats).toEqual({
                name: 'TestCache',
                fileCount: 1,
                directoryCount: 1,
                config: {
                    enabled: true,
                    checkInterval: 1000,
                    directoryTtl: 5000
                }
            });
        });
    });

    describe('Error handling', () => {
        it('should handle ENOENT errors for directories', async () => {
            fs.stat.mockImplementation((filePath) => {
                if (filePath === testDir) {
                    const error = new Error('Directory not found');
                    error.code = 'ENOENT';
                    throw error;
                }
                return Promise.resolve({ mtime: { valueOf: () => 1000000000 } });
            });

            const mockLoader = jest.fn().mockResolvedValue('content');
            const result = await fileCache.get(testFile, mockLoader);

            expect(result).toBe('content');
            expect(mockLogController.logInfo).toHaveBeenCalledWith(
                null,
                'file-cache._checkDirectoryChanged',
                expect.stringContaining('Directory not found, clearing cache')
            );
        });

        it('should handle ENOENT errors for files', async () => {
            // Setup directory to exist but file to not exist
            fs.stat.mockImplementation((filePath) => {
                if (filePath === testDir) {
                    return Promise.resolve({ mtime: { valueOf: () => 1000000000 } });
                } else if (filePath === testFile) {
                    const error = new Error('File not found');
                    error.code = 'ENOENT';
                    throw error;
                }
                throw new Error('Unexpected path');
            });

            fs.readdir.mockResolvedValue(['test.txt']);

            const mockLoader = jest.fn().mockResolvedValue('content');

            // First load to cache the file
            await fileCache.get(testFile, mockLoader);

            // Now make the file not exist for timestamp check
            jest.clearAllMocks();

            // This should handle the ENOENT gracefully
            const result = await fileCache.get(testFile, mockLoader);

            expect(mockLogController.logInfo).toHaveBeenCalledWith(
                null,
                'file-cache._fileNeedsRefresh',
                expect.stringContaining('File not found, removing from cache')
            );
        });
    });
});

// EOF webapp/tests/unit/utils/file-cache.test.js
