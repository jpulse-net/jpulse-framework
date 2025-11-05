/**
 * @name            jPulse Framework / WebApp / Utils / Cache Manager
 * @tagline         Cache manager for the jPulse Framework WebApp
 * @description     This is the cache manager for the jPulse Framework WebApp
 * @usage           Usage:
 *                  import cacheManager from '../utils/cache-manager.js';
 *                  const cache = cacheManager.register(config, 'TemplateCa che');
 *                  const content = cache.getFileSync(filePath);
 * @file            webapp/utils/cache-manager.js
 * @version         1.0.4
 * @release         2025-11-05
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import fs from 'fs/promises';
import { readFileSync, statSync } from 'fs';
import path from 'path';
import LogController from '../controller/log.js';

/**
 * Individual cache instance returned by CacheManager.register()
 */
class Cache {
    constructor(config, name, cacheManager) {
        this.fileCache = new Map();           // filePath -> { content, timestamp, overridden, path, cacheTime }
        this.directoryCache = new Map();      // dirPath -> {mtime, fileList, cacheTime}
        this.config = {
            enabled: true,
            checkInterval: 1000,              // ms between checks - from app.conf per cache type
            directoryTtl: 10000,              // 10 seconds TTL for directory cache (scheduled refresh only)
            ...config
        };
        this.name = name;
        this.cacheManager = cacheManager;

        LogController.logInfo(null, 'cache-manager.Cache', `Initialized ${this.name} with config: ${JSON.stringify(this.config)}`);
    }

    /**
     * Get file content synchronously - the main API
     * @param {string} filePath - Full path to file
     * @returns {string|null} File content or null if file doesn't exist
     */
    getFileSync(filePath) {
        if (!this.config.enabled) {
            // Caching disabled - always load fresh
            try {
                return readFileSync(filePath, 'utf8');
            } catch (error) {
                if (error.code === 'ENOENT') {
                    return null;
                }
                throw error;
            }
        }

        // Check cache first - instant return if found
        const fileEntry = this.fileCache.get(filePath);
        if (fileEntry !== undefined) {
            LogController.logInfo(null, 'cache-manager.getFileSync', `${this.name}: Cache hit: ${filePath}`);
            return fileEntry.content; // Could be null for "does not exist" files
        }

        // Cache miss - sync read of SINGLE file only (no directory operations)
        try {
            const content = readFileSync(filePath, 'utf8');
            const stats = statSync(filePath);

            // Cache file with all metadata
            this.fileCache.set(filePath, {
                content: content,
                timestamp: stats.mtime.valueOf(),
                overridden: filePath.includes('/site/webapp/'),
                path: filePath,
                cacheTime: Date.now()
            });

            LogController.logInfo(null, 'cache-manager.getFileSync', `${this.name}: Loaded and cached: ${filePath}`);
            return content;
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist - cache "does not exist"
                this.fileCache.set(filePath, {
                    content: null,
                    timestamp: 0,
                    overridden: false,
                    path: null,
                    cacheTime: Date.now()
                });
                LogController.logInfo(null, 'cache-manager.getFileSync', `${this.name}: File not found, cached as not found: ${filePath}`);
                return null;
            }
            LogController.logError(null, 'cache-manager.getFileSync', `${this.name}: Error loading ${filePath}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Clear all caches
     */
    clearAll() {
        const fileCount = this.fileCache.size;
        const dirCount = this.directoryCache.size;

        this.fileCache.clear();
        this.directoryCache.clear();

        LogController.logInfo(null, 'cache-manager.clearAll', `${this.name}: Cleared ${fileCount} files and ${dirCount} directories from cache`);
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            name: this.name,
            fileCount: this.fileCache.size,
            directoryCount: this.directoryCache.size,
            config: this.config
        };
    }
}

/**
 * Centralized Cache Manager - KISS approach
 */
class CacheManager {
    constructor() {
        this.registeredCaches = new Map(); // name -> { cache, interval, timer }
        LogController.logInfo(null, 'cache-manager.constructor', 'CacheManager initialized');
    }

    /**
     * Register a cache and return ready-to-use cache instance
     * @param {Object} config - Cache configuration
     * @param {string} name - Cache identifier (e.g., 'TemplateCache')
     * @returns {Cache} Ready-to-use cache instance with getFileSync() method
     */
    register(config, name) {
        // Create cache instance
        const cache = new Cache(config, name, this);

        // Convert minutes to milliseconds and enforce minimum of 1 minute
        const intervalMinutes = cache.config.checkInterval || 0;
        const intervalMs = Math.max(intervalMinutes * 60 * 1000, 60000); // Minimum 1 minute (60000ms)

        // Start periodic refresh if enabled and interval specified
        if (cache.config.enabled && intervalMinutes > 0) {
            const timer = setInterval(async () => {
                try {
                    await this._refreshCache(cache);
                    LogController.logInfo(null, 'cache-manager.refresh', 
                        `${name}: Periodic refresh completed`);
                } catch (error) {
                    LogController.logError(null, 'cache-manager.refresh', 
                        `${name}: Periodic refresh failed: ${error.message}`);
                }
            }, intervalMs);

            this.registeredCaches.set(name, { cache, interval: intervalMs, timer });
            
            LogController.logInfo(null, 'cache-manager.register', 
                `${name}: Registered for periodic refresh every ${Math.round(intervalMs/60000)} minutes (${intervalMs}ms)`);
        } else {
            this.registeredCaches.set(name, { cache, interval: 0, timer: null });
            LogController.logInfo(null, 'cache-manager.register', 
                `${name}: Registered without periodic refresh (disabled or invalid interval: ${intervalMinutes} min)`);
        }

        return cache;
    }

    /**
     * Unregister a cache (stops periodic refresh)
     * @param {string} name - Cache identifier
     */
    unregister(name) {
        const entry = this.registeredCaches.get(name);
        if (entry && entry.timer) {
            clearInterval(entry.timer);
        }
        if (entry) {
            this.registeredCaches.delete(name);
            LogController.logInfo(null, 'cache-manager.unregister', 
                `${name}: Unregistered and timer stopped`);
        }
    }

    /**
     * Smart refresh logic - only refresh files that actually changed
     * @param {Cache} cache - Cache instance
     */
    async _refreshCache(cache) {
        let refreshedCount = 0;
        let removedCount = 0;
        let unchangedCount = 0;

        // Go through each cached file and check if it needs refresh
        for (const [filePath, fileEntry] of cache.fileCache) {
            try {
                // Skip "does not exist" entries - they'll be checked on next access
                if (fileEntry.content === null) {
                    continue;
                }

                // Check if file still exists and get current timestamp
                const stats = await fs.stat(filePath);
                const currentTimestamp = stats.mtime.valueOf();

                if (currentTimestamp !== fileEntry.timestamp) {
                    // File changed - re-read it
                    const content = await fs.readFile(filePath, 'utf8');
                    cache.fileCache.set(filePath, {
                        content: content,
                        timestamp: currentTimestamp,
                        overridden: fileEntry.overridden,
                        path: filePath,
                        cacheTime: Date.now()
                    });
                    refreshedCount++;
                } else {
                    // File unchanged - just update cache time
                    fileEntry.cacheTime = Date.now();
                    unchangedCount++;
                }
            } catch (error) {
                if (error.code === 'ENOENT') {
                    // File was deleted - mark as "does not exist"
                    cache.fileCache.set(filePath, {
                        content: null,
                        timestamp: 0,
                        overridden: false,
                        path: null,
                        cacheTime: Date.now()
                    });
                    removedCount++;
                } else {
                    LogController.logError(null, 'cache-manager._refreshCache', 
                        `${cache.name}: Error checking ${filePath}: ${error.message}`);
                }
            }
        }

        LogController.logInfo(null, 'cache-manager._refreshCache', 
            `${cache.name}: Smart refresh completed - ${refreshedCount} updated, ${removedCount} removed, ${unchangedCount} unchanged`);
    }

    /**
     * Manual refresh for API endpoints
     * @param {string} name - Cache identifier
     * @param {string|null} filePath - Optional specific file to refresh, null for full refresh
     */
    refreshCache(name, filePath = null) {
        const entry = this.registeredCaches.get(name);
        if (!entry) {
            throw new Error(`Cache ${name} not registered`);
        }

        if (filePath) {
            // Refresh specific file by removing it from cache
            entry.cache.fileCache.delete(filePath);
            LogController.logInfo(null, 'cache-manager.refreshCache', 
                `${name}: Refreshed file: ${filePath}`);
        } else {
            // Clear all cache
            entry.cache.clearAll();
            LogController.logInfo(null, 'cache-manager.refreshCache', 
                `${name}: Cleared all cache`);
        }
    }

    /**
     * Get statistics for all registered caches
     */
    getStats() {
        const stats = {
            totalCaches: this.registeredCaches.size,
            caches: {}
        };

        for (const [name, entry] of this.registeredCaches) {
            stats.caches[name] = {
                enabled: entry.cache.config.enabled,
                interval: entry.interval,
                fileCount: entry.cache.fileCache.size,
                directoryCount: entry.cache.directoryCache.size,
                config: entry.cache.config
            };
        }

        return stats;
    }

    /**
     * Get list of registered cache names
     */
    getRegisteredCacheNames() {
        return Array.from(this.registeredCaches.keys());
    }

    /**
     * Graceful shutdown - stop all timers
     */
    shutdown() {
        LogController.logInfo(null, 'cache-manager.shutdown', 
            `Shutting down CacheManager with ${this.registeredCaches.size} registered caches`);
        
        for (const [name, entry] of this.registeredCaches) {
            if (entry.timer) {
                clearInterval(entry.timer);
            }
            LogController.logInfo(null, 'cache-manager.shutdown', 
                `${name}: Timer stopped`);
        }
        
        this.registeredCaches.clear();
        LogController.logInfo(null, 'cache-manager.shutdown', 'CacheManager shutdown complete');
    }
}

// Create singleton instance
const cacheManager = new CacheManager();

export default cacheManager;

// EOF webapp/utils/cache-manager.js
