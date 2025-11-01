/**
 * @name            jPulse Framework / WebApp / Utils / Path Resolver
 * @tagline         Site Override Path Resolution Utility
 * @description     Provides path resolution for site overrides (W-014)
 * @file            webapp/utils/path-resolver.js
 * @version         1.0.0-rc.2
 * @release         2025-10-27
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import fs from 'fs';
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
