/**
 * @name            jPulse Framework / WebApp / Utils / Path Resolver
 * @tagline         Site Override Path Resolution Utility
 * @description     Provides path resolution for site overrides (W-014)
 * @file            webapp/utils/path-resolver.js
 * @version         1.2.6
 * @release         2025-11-25
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import fs from 'fs';
import { statSync } from 'fs';
import path from 'path';

/**
 * Path Resolver for Site Overrides (W-014)
 *
 * Implements the file resolution priority:
 * 1. site/webapp/[type]/[file] (Site override - highest priority)
 * 2. webapp/[type]/[file] (Framework default - fallback)
 * 3. Error if neither found
 */
class PathResolver {

    /**
     * Resolve a module path with site override support
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
     * Collect all matching files for append mode (W-098)
     * Used for .js and .css files that should be concatenated instead of replaced
     *
     * @param {string} modulePath - Relative path from webapp/ (e.g., 'view/jpulse-common.js')
     * @returns {string[]} - Array of absolute paths in load order (framework first, then site, then plugins)
     *
     * @example
     * collectAllFiles('view/jpulse-common.js')
     * // Returns: ['/path/to/webapp/view/jpulse-common.js', '/path/to/site/webapp/view/jpulse-common.js']
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

        // 3. Future: Plugin files (W-045)
        // for (const plugin of getActivePlugins()) {
        //     const pluginPath = path.join(pluginsDir, plugin.name, 'webapp', modulePath);
        //     if (fs.existsSync(pluginPath)) {
        //         files.push(pluginPath);
        //     }
        // }

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

        // Search in framework directory
        const frameworkBaseDir = path.join(appDir, baseDir);
        try {
            if (fs.existsSync(frameworkBaseDir) && fs.statSync(frameworkBaseDir).isDirectory()) {
                const frameworkFiles = readDirFunction(frameworkBaseDir, frameworkBaseDir, pattern);
                frameworkFiles.forEach(file => {
                    const relativePath = file.replace(/\\/g, '/');
                    // Only add if not already in set (site overrides take precedence) and is relative
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
