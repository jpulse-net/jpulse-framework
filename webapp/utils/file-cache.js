/**
 * @name            jPulse Framework / WebApp / Utils / File Cache
 * @tagline         Performance-optimized file caching with directory-level stats
 * @description     Provides file caching with automatic refresh based on file timestamps
 * @file            webapp/utils/file-cache.js
 * @version         0.9.7
 * @release         2025-10-11
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           70%, Cursor 1.2, Claude Sonnet 4
 */

import fs from 'fs/promises';
import path from 'path';
import LogController from '../controller/log.js';

/**
 * Performance-optimized file cache with directory-level stat optimization
 * Uses directory mtime caching to minimize individual file stat calls
 */
class FileCache {
    constructor(config = {}, name = 'FileCache') {
        this.fileCache = new Map();           // filePath -> content
        this.fileTimestamps = new Map();      // filePath -> mtime
        this.directoryCache = new Map();      // dirPath -> {mtime, fileList, cacheTime}
        this.config = {
            enabled: true,
            checkInterval: 1000,              // ms between checks (not used yet)
            directoryTtl: 10000,              // 10 seconds TTL for directory cache
            ...config
        };
        this.name = name;

        LogController.logInfo(null, 'file-cache.constructor', `Initialized ${this.name} with config: ${JSON.stringify(this.config)}`);
    }

    /**
     * Get file content from cache or load if changed/missing
     * @param {string} filePath - Full path to file
     * @param {Function} loaderCallback - Function to load file content: async (filePath) => content
     * @returns {Promise<any>} File content or null if file doesn't exist
     */
    async get(filePath, loaderCallback) {
        if (!this.config.enabled) {
            // Caching disabled - always load fresh
            try {
                return await loaderCallback(filePath);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    return null;
                }
                throw error;
            }
        }

        const dirPath = path.dirname(filePath);
        const fileName = path.basename(filePath);

        try {
            // Check directory stats first (with TTL)
            const needsDirectoryRefresh = await this._checkDirectoryChanged(dirPath);

            if (needsDirectoryRefresh) {
                await this._refreshDirectoryCache(dirPath);
            }

            // Check if file exists in current directory listing
            const dirCache = this.directoryCache.get(dirPath);
            if (!dirCache?.fileList.includes(fileName)) {
                // File deleted - remove from cache
                this._removeFileFromCache(filePath);
                LogController.logInfo(null, 'file-cache.get', `${this.name}: File deleted, removed from cache: ${filePath}`);
                return null;
            }

            // Check individual file timestamp only if needed
            if (!this.fileCache.has(filePath) || await this._fileNeedsRefresh(filePath)) {
                const content = await loaderCallback(filePath);
                this.fileCache.set(filePath, content);

                const stats = await fs.stat(filePath);
                this.fileTimestamps.set(filePath, stats.mtime.valueOf());

                LogController.logInfo(null, 'file-cache.get', `${this.name}: Loaded and cached: ${filePath}`);
                return content;
            }

            // Return cached content
            LogController.logInfo(null, 'file-cache.get', `${this.name}: Cache hit: ${filePath}`);
            return this.fileCache.get(filePath);

        } catch (error) {
            if (error.code === 'ENOENT') {
                // File or directory doesn't exist
                this._removeFileFromCache(filePath);
                return null;
            }
            LogController.logError(null, 'file-cache.get', `${this.name}: Error loading ${filePath}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Manually refresh a specific file (for API endpoints)
     * @param {string} filePath - Full path to file
     * @param {Function} loaderCallback - Function to load file content
     * @returns {Promise<any>} Refreshed file content
     */
    async refreshFile(filePath, loaderCallback) {
        this._removeFileFromCache(filePath);
        LogController.logInfo(null, 'file-cache.refreshFile', `${this.name}: Manual refresh: ${filePath}`);
        return await this.get(filePath, loaderCallback);
    }

    /**
     * Clear all caches
     */
    clearAll() {
        const fileCount = this.fileCache.size;
        const dirCount = this.directoryCache.size;

        this.fileCache.clear();
        this.fileTimestamps.clear();
        this.directoryCache.clear();

        LogController.logInfo(null, 'file-cache.clearAll', `${this.name}: Cleared ${fileCount} files and ${dirCount} directories from cache`);
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        return {
            name: this.name,
            fileCount: this.fileCache.size,
            directoryCount: this.directoryCache.size,
            config: this.config
        };
    }

    /**
     * Check if directory cache needs refresh (with TTL)
     * @private
     */
    async _checkDirectoryChanged(dirPath) {
        const dirCache = this.directoryCache.get(dirPath);

        if (!dirCache) {
            return true; // No cache exists
        }

        // Check TTL first
        const now = Date.now();
        if (now - dirCache.cacheTime > this.config.directoryTtl) {
            LogController.logInfo(null, 'file-cache._checkDirectoryChanged', `${this.name}: Directory cache TTL expired: ${dirPath}`);
            return true;
        }

        // TTL not expired, directory cache is still valid
        return false;
    }

    /**
     * Refresh directory cache with current file listing
     * @private
     */
    async _refreshDirectoryCache(dirPath) {
        try {
            const stats = await fs.stat(dirPath);
            const files = await fs.readdir(dirPath);

            this.directoryCache.set(dirPath, {
                mtime: stats.mtime.valueOf(),
                fileList: files,
                cacheTime: Date.now()
            });

            // Clean up cached files that no longer exist
            this._removeDeletedFiles(dirPath, files);

            LogController.logInfo(null, 'file-cache._refreshDirectoryCache', `${this.name}: Refreshed directory cache: ${dirPath} (${files.length} files)`);
        } catch (error) {
            LogController.logError(null, 'file-cache._refreshDirectoryCache', `${this.name}: Error refreshing directory cache ${dirPath}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check if individual file needs refresh
     * @private
     */
    async _fileNeedsRefresh(filePath) {
        if (!this.fileTimestamps.has(filePath)) {
            return true; // No timestamp cached
        }

        try {
            const stats = await fs.stat(filePath);
            const currentMtime = stats.mtime.valueOf();
            const cachedMtime = this.fileTimestamps.get(filePath);

            return currentMtime !== cachedMtime;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return true; // File deleted, needs "refresh" (will return null)
            }
            throw error;
        }
    }

    /**
     * Remove cached files that no longer exist in directory
     * @private
     */
    _removeDeletedFiles(dirPath, currentFileList) {
        const removedFiles = [];

        for (const [cachedPath] of this.fileCache) {
            if (path.dirname(cachedPath) === dirPath) {
                const fileName = path.basename(cachedPath);
                if (!currentFileList.includes(fileName)) {
                    this._removeFileFromCache(cachedPath);
                    removedFiles.push(fileName);
                }
            }
        }

        if (removedFiles.length > 0) {
            LogController.logInfo(null, 'file-cache._removeDeletedFiles', `${this.name}: Removed deleted files from cache: ${removedFiles.join(', ')}`);
        }
    }

    /**
     * Remove a single file from all caches
     * @private
     */
    _removeFileFromCache(filePath) {
        this.fileCache.delete(filePath);
        this.fileTimestamps.delete(filePath);
    }
}

export default FileCache;

// EOF webapp/utils/file-cache.js
