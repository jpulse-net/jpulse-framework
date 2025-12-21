/**
 * @name            jPulse Framework / WebApp / Utils / Path Resolver
 * @tagline         Site Override and Plugin Path Resolution Utility
 * @description     Provides path resolution for site overrides (W-014) and plugins (W-045)
 * @file            webapp/utils/path-resolver.js
 * @version         1.3.22
 * @release         2025-12-21
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           70%, Cursor 2.0, Claude Sonnet 4.5
 */

import fs from 'fs';
import { statSync } from 'fs';
import path from 'path';

/**
 * Path Resolver for Site Overrides (W-014) and Plugins (W-045)
 *
 * Implements the file resolution priority:
 * 1. site/webapp/[type]/[file] (Site override - highest priority)
 * 2. plugins/[name]/webapp/[type]/[file] (Plugin override - W-045)
 * 3. webapp/[type]/[file] (Framework default - fallback)
 * 4. Error if none found
 */
class PathResolver {

    /**
     * Plugin Manager reference (lazy loaded)
     */
    static pluginManagerRef = null;

    /**
     * Path resolution cache (W-045 performance optimization)
     * Simple Map for fast lookups, integrated with framework monitoring
     *
     * Cache characteristics:
     * - Maps modulePath → resolved absolute path
     * - Max size: 1000 entries (FIFO eviction)
     * - Auto-invalidated on app restart (required for plugin changes)
     * - Includes both file and directory resolutions
     * - Visible in health monitoring via getCacheStats()
     */
    static pathCache = new Map();
    static cacheMaxSize = 1000; // ~50KB memory footprint
    static cacheHits = 0;
    static cacheMisses = 0;

    /**
     * Clear the path resolution cache and reset stats
     * Integrated with framework cache management pattern
     */
    static clearCache() {
        const size = this.pathCache.size;
        this.pathCache.clear();
        this.cacheHits = 0;
        this.cacheMisses = 0;

        if (global.LogController) {
            global.LogController.logInfo(null, 'path-resolver.clearCache',
                `PathCache: Cleared ${size} entries, reset stats`);
        }
    }

    /**
     * Get cache statistics for monitoring/health checks
     * Integrated with framework cache management pattern
     * @returns {object} Cache statistics
     */
    static getCacheStats() {
        const hitRate = this.cacheHits + this.cacheMisses > 0
            ? (this.cacheHits / (this.cacheHits + this.cacheMisses) * 100).toFixed(2)
            : 0;

        return {
            name: 'PathCache',
            enabled: true,
            size: this.pathCache.size,
            maxSize: this.cacheMaxSize,
            hits: this.cacheHits,
            misses: this.cacheMisses,
            hitRate: `${hitRate}%`,
            memoryEstimate: `~${Math.round(this.pathCache.size * 0.05)}KB`
        };
    }

    /**
     * Get active plugins (lazy loaded from PluginManager)
     * @returns {Array} Array of active plugin objects
     */
    static getActivePlugins() {
        if (!this.pluginManagerRef) {
            try {
                // Lazy load PluginManager to avoid circular dependencies
                const PluginManagerModule = globalThis.PluginManager;
                if (PluginManagerModule) {
                    this.pluginManagerRef = PluginManagerModule;
                }
            } catch (error) {
                // PluginManager not yet loaded, return empty array
                return [];
            }
        }

        if (!this.pluginManagerRef || !this.pluginManagerRef.initialized) {
            return [];
        }

        return this.pluginManagerRef.getActivePlugins();
    }

    /**
     * Resolve a module path with site override support (W-014)
     * @param {string} modulePath - Relative path from webapp/ (e.g., 'controller/user.js')
     * @returns {string} - Absolute path to the resolved file
     * @throws {Error} - If module not found in either location
     */
    static resolveModule(modulePath) {
        // 1. Check site override first (highest priority)
        const sitePath = path.join(global.appConfig.system.siteDir, modulePath);
        if (fs.existsSync(sitePath)) {
            return sitePath;
        }

        // 2. Fall back to framework default
        const frameworkPath = path.join(global.appConfig.system.appDir, modulePath);
        if (fs.existsSync(frameworkPath)) {
            return frameworkPath;
        }

        // 3. Error if neither found
        throw new Error(`Module not found: ${modulePath} (checked site override and framework paths)`);
    }

    /**
     * Resolve a module path with plugin support (W-045)
     * Resolution priority: site → plugins (in load order) → framework
     * Cached for performance (static files hit this path heavily)
     *
     * @param {string} modulePath - Relative path from webapp/ (e.g., 'controller/user.js')
     * @returns {string} - Absolute path to the resolved file
     * @throws {Error} - If module not found in any location
     */
    static resolveModuleWithPlugins(modulePath) {
        // Check cache first (performance optimization for static files)
        if (this.pathCache.has(modulePath)) {
            this.cacheHits++;
            return this.pathCache.get(modulePath);
        }

        this.cacheMisses++;
        let resolvedPath = null;

        // 1. Check site override first (highest priority)
        const sitePath = path.join(global.appConfig.system.siteDir, modulePath);
        if (fs.existsSync(sitePath)) {
            resolvedPath = sitePath;
        }

        // 2. Check plugins (in load order)
        if (!resolvedPath) {
            const activePlugins = this.getActivePlugins();
            for (const plugin of activePlugins) {
                const pluginPath = path.join(plugin.path, 'webapp', modulePath);
                if (fs.existsSync(pluginPath)) {
                    resolvedPath = pluginPath;
                    break;
                }
            }
        }

        // 3. Fall back to framework default
        if (!resolvedPath) {
            const frameworkPath = path.join(global.appConfig.system.appDir, modulePath);
            if (fs.existsSync(frameworkPath)) {
                resolvedPath = frameworkPath;
            }
        }

        // 4. Error if none found
        if (!resolvedPath) {
            throw new Error(`Module not found: ${modulePath} (checked site, plugins, and framework paths)`);
        }

        // Cache the result (with LRU eviction)
        if (this.pathCache.size >= this.cacheMaxSize) {
            // Simple FIFO eviction: delete first entry
            const firstKey = this.pathCache.keys().next().value;
            this.pathCache.delete(firstKey);
        }
        this.pathCache.set(modulePath, resolvedPath);

        return resolvedPath;
    }

    /**
     * Collect all matching files for append mode (W-098, W-045)
     * Used for .js and .css files that should be concatenated instead of replaced
     *
     * @param {string} modulePath - Relative path from webapp/ (e.g., 'view/jpulse-common.js')
     * @returns {string[]} - Array of absolute paths in load order (framework → site → plugins)
     *
     * @example
     * collectAllFiles('view/jpulse-common.js')
     * // Returns: ['/path/to/webapp/view/jpulse-common.js',
     * //           '/path/to/site/webapp/view/jpulse-common.js',
     * //           '/path/to/plugins/plugin-name/webapp/view/jpulse-common.js']
     */
    static collectAllFiles(modulePath) {
        const files = [];
        const appDir = global.appConfig.system.appDir;
        const siteDir = global.appConfig.system.siteDir;

        // 1. Framework file (always first if exists)
        const frameworkPath = path.join(appDir, modulePath);
        if (fs.existsSync(frameworkPath)) {
            files.push(frameworkPath);
        }

        // 2. Site override (appended if exists)
        if (siteDir) {
            const sitePath = path.join(siteDir, modulePath);
            if (fs.existsSync(sitePath)) {
                files.push(sitePath);
            }
        }

        // 3. Plugin files (W-045) - appended in load order
        const activePlugins = this.getActivePlugins();
        for (const plugin of activePlugins) {
            const pluginPath = path.join(plugin.path, 'webapp', modulePath);
            if (fs.existsSync(pluginPath)) {
                files.push(pluginPath);
            }
        }

        return files;
    }

    /**
     * W-116: Collect all controller files from site and plugins
     * Returns array of { filePath, source } objects in load order
     * @returns {Array<{filePath: string, source: string}>} Array of controller file info
     */
    static collectControllerFiles() {
        const files = [];
        const appDir = global.appConfig.system.appDir;
        const siteDir = global.appConfig.system.siteDir;

        // 1. Site controllers (highest priority)
        if (siteDir) {
            const siteControllerDir = path.join(siteDir, 'webapp', 'controller');
            if (fs.existsSync(siteControllerDir)) {
                const siteFiles = fs.readdirSync(siteControllerDir)
                    .filter(file => file.endsWith('.js'))
                    .map(file => ({
                        filePath: path.join(siteControllerDir, file),
                        source: 'site'
                    }));
                files.push(...siteFiles);
            }
        }

        // 2. Plugin controllers (in load order)
        if (global.PluginManager && global.PluginManager.initialized) {
            const activePlugins = this.getActivePlugins();
            for (const plugin of activePlugins) {
                const pluginControllerDir = path.join(plugin.path, 'webapp', 'controller');
                if (fs.existsSync(pluginControllerDir)) {
                    const pluginFiles = fs.readdirSync(pluginControllerDir)
                        .filter(file => file.endsWith('.js'))
                        .map(file => ({
                            filePath: path.join(pluginControllerDir, file),
                            source: `plugin:${plugin.name}`
                        }));
                    files.push(...pluginFiles);
                }
            }
        }

        return files;
    }

    /**
     * Check if a site override exists for a given module
     * @param {string} modulePath - Relative path from webapp/
     * @returns {boolean} - True if site override exists
     */
    static hasSiteOverride(modulePath) {
        const sitePath = path.join(global.appConfig.system.siteDir, modulePath);
        return fs.existsSync(sitePath);
    }

    /**
     * Get all possible paths for a module (for debugging/logging)
     * @param {string} modulePath - Relative path from webapp/
     * @returns {object} - Object with site and framework paths
     */
    static getModulePaths(modulePath) {
        return {
            site: path.join(global.appConfig.system.siteDir, modulePath),
            framework: path.join(global.appConfig.system.appDir, modulePath),
            resolved: null // Will be set by resolveModule
        };
    }

    /**
     * Resolve a static asset path with site override support
     * @param {string} assetPath - Relative path from static/ (e.g., 'favicon.ico')
     * @returns {string} - Absolute path to the resolved asset
     * @throws {Error} - If asset not found in either location
     */
    static resolveAsset(assetPath) {
        return this.resolveModule(`static/${assetPath}`);
    }

    /**
     * List files matching a glob pattern with site override support
     * Searches site override directory first, then framework directory
     * @param {string} modulePath - Relative path from webapp/ with glob pattern (e.g., 'view/admin/*.shtml')
     * @param {Function} matchFunction - Function to match files: (filePath, pattern) => boolean
     * @param {Function} readDirFunction - Function to recursively read directory: (dirPath, basePath, pattern) => string[]
     * @returns {string[]} - Array of relative file paths (site overrides take precedence, duplicates removed)
     */
    static listFiles(modulePath, matchFunction, readDirFunction) {
        const fileSet = new Set();
        const appDir = global.appConfig.system.appDir;
        const siteDir = global.appConfig.system.siteDir;

        // Extract base directory and pattern from modulePath
        // e.g., 'view/admin/*.shtml' -> baseDir: 'view', pattern: 'admin/*.shtml'
        const pathParts = modulePath.split('/');
        const baseDir = pathParts[0]; // 'view'
        const pattern = pathParts.slice(1).join('/'); // 'admin/*.shtml'

        // Search in site override directory first (if exists)
        if (siteDir) {
            const siteBaseDir = path.join(siteDir, baseDir);
            try {
                if (fs.existsSync(siteBaseDir) && fs.statSync(siteBaseDir).isDirectory()) {
                    const siteFiles = readDirFunction(siteBaseDir, siteBaseDir, pattern);
                    siteFiles.forEach(file => {
                        const relativePath = file.replace(/\\/g, '/');
                        if (!relativePath.includes('../') && !path.isAbsolute(relativePath) && relativePath) {
                            fileSet.add(relativePath);
                        }
                    });
                }
            } catch (siteError) {
                // Site directory might not exist, continue
            }
        }

        // W-045: Search in plugin directories (if PluginManager is available)
        if (global.PluginManager) {
            try {
                const activePlugins = global.PluginManager.getActivePlugins();
                for (const plugin of activePlugins) {
                    const pluginBaseDir = path.join(plugin.path, 'webapp', baseDir);
                    try {
                        if (fs.existsSync(pluginBaseDir) && fs.statSync(pluginBaseDir).isDirectory()) {
                            const pluginFiles = readDirFunction(pluginBaseDir, pluginBaseDir, pattern);
                            pluginFiles.forEach(file => {
                                const relativePath = file.replace(/\\/g, '/');
                                // Only add if not already in set (site overrides take precedence)
                                if (!relativePath.includes('../') && !path.isAbsolute(relativePath) && relativePath && !fileSet.has(relativePath)) {
                                    fileSet.add(relativePath);
                                }
                            });
                        }
                    } catch (pluginError) {
                        // Plugin directory might not have this base dir, continue
                    }
                }
            } catch (error) {
                // PluginManager might not be ready, continue
            }
        }

        // Search in framework directory
        const frameworkBaseDir = path.join(appDir, baseDir);
        try {
            if (fs.existsSync(frameworkBaseDir) && fs.statSync(frameworkBaseDir).isDirectory()) {
                const frameworkFiles = readDirFunction(frameworkBaseDir, frameworkBaseDir, pattern);
                frameworkFiles.forEach(file => {
                    const relativePath = file.replace(/\\/g, '/');
                    // Only add if not already in set (site/plugin overrides take precedence) and is relative
                    if (!relativePath.includes('../') && !path.isAbsolute(relativePath) && relativePath && !fileSet.has(relativePath)) {
                        fileSet.add(relativePath);
                    }
                });
            }
        } catch (frameworkError) {
            // Framework directory might not exist
        }

        return Array.from(fileSet).sort();
    }

    /**
     * Resolve a directory path with plugin support (W-045)
     * Similar to resolveModuleWithPlugins, but for directories instead of files
     * Resolution priority: site → plugins (in load order) → framework
     * Cached for performance
     *
     * @param {string} modulePath - Relative path from webapp/ (e.g., 'static/assets/jpulse-docs')
     * @returns {string|null} - Absolute path to the resolved directory, or null if not found
     */
    static resolveDirectory(modulePath) {
        // Check cache first (performance optimization)
        const cacheKey = `dir:${modulePath}`; // Prefix to distinguish from file paths
        if (this.pathCache.has(cacheKey)) {
            this.cacheHits++;
            return this.pathCache.get(cacheKey);
        }

        this.cacheMisses++;
        let resolvedPath = null;

        // 1. Check site override first (highest priority)
        const sitePath = path.join(global.appConfig.system.siteDir, modulePath);
        if (fs.existsSync(sitePath) && statSync(sitePath).isDirectory()) {
            resolvedPath = sitePath;
        }

        // 2. Check plugins (in load order)
        if (!resolvedPath) {
            const activePlugins = this.getActivePlugins();
            for (const plugin of activePlugins) {
                const pluginPath = path.join(plugin.path, 'webapp', modulePath);
                if (fs.existsSync(pluginPath) && statSync(pluginPath).isDirectory()) {
                    resolvedPath = pluginPath;
                    break;
                }
            }
        }

        // 3. Fall back to framework default
        if (!resolvedPath) {
            const frameworkPath = path.join(global.appConfig.system.appDir, modulePath);
            if (fs.existsSync(frameworkPath) && statSync(frameworkPath).isDirectory()) {
                resolvedPath = frameworkPath;
            }
        }

        // Cache the result (including null for "not found")
        if (this.pathCache.size >= this.cacheMaxSize) {
            // Simple FIFO eviction: delete first entry
            const firstKey = this.pathCache.keys().next().value;
            this.pathCache.delete(firstKey);
        }
        this.pathCache.set(cacheKey, resolvedPath);

        return resolvedPath;
    }

    /**
     * Get all view directories from framework, site, and plugins (W-045)
     * Used by ViewController to build view registry
     * Implements priority: site > plugins > framework (Set deduplication)
     * @returns {string[]} - Sorted array of unique view directory names
     */
    static getAllViewDirectories() {
        const appDir = global.appConfig.system.appDir;
        const siteDir = global.appConfig.system.siteDir;

        const frameworkViewPath = path.join(appDir, 'view');
        const siteViewPath = path.join(siteDir, 'view');

        // Scan framework directories
        const frameworkDirs = this._scanDirectory(frameworkViewPath);

        // Scan site directories
        const siteDirs = this._scanDirectory(siteViewPath);

        // Scan plugin directories (W-045)
        const pluginDirs = [];
        const activePlugins = this.getActivePlugins();
        for (const plugin of activePlugins) {
            const pluginViewPath = path.join(plugin.path, 'webapp', 'view');
            const dirs = this._scanDirectory(pluginViewPath);
            pluginDirs.push(...dirs);
        }

        // Priority: site > plugins > framework (Set handles deduplication)
        const viewSet = new Set([...siteDirs, ...pluginDirs, ...frameworkDirs]);
        return Array.from(viewSet).sort();
    }

    /**
     * Scan a directory and return subdirectory names (helper for view registry)
     * @param {string} dirPath - Directory to scan
     * @returns {string[]} - Array of subdirectory names
     * @private
     */
    static _scanDirectory(dirPath) {
        try {
            return fs.readdirSync(dirPath, { withFileTypes: true })
                .filter(entry => entry.isDirectory())
                .map(entry => entry.name);
        } catch (error) {
            return []; // Directory doesn't exist or not accessible
        }
    }

    /**
     * Ensure site directory structure exists
     * @param {string[]} subdirs - Additional site subdirectories to create (optional)
     */
    static ensureSiteStructure(subdirs = []) {
        const dirs = global.appConfig.system;
        const requiredDirs = [
            path.join(dirs.projectRoot, 'site'),
            dirs.siteDir,
            path.join(dirs.siteDir, 'controller'),
            path.join(dirs.siteDir, 'model'),
            path.join(dirs.siteDir, 'view'),
            path.join(dirs.siteDir, 'static')
        ];

        // Add any additional subdirectories
        subdirs.forEach(subdir => {
            requiredDirs.push(path.join(dirs.siteDir, subdir));
        });

        requiredDirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
}

export default PathResolver;

// EOF webapp/utils/path-resolver.js
