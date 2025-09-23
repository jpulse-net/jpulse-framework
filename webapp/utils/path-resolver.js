/**
 * @name            jPulse Framework / WebApp / Utils / Path Resolver
 * @tagline         Site Override Path Resolution Utility
 * @description     Provides path resolution for site overrides (W-014)
 * @file            webapp/utils/path-resolver.js
 * @version         0.7.15
 * @release         2025-09-22
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           60%, Cursor 1.2, Claude Sonnet 4
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
        // Use appConfig.app.dirName as the base directory (follows established pattern)
        const webappDir = global.appConfig?.app?.dirName || path.join(process.cwd(), 'webapp');
        const projectRoot = path.dirname(webappDir);

        // 1. Check site override first (highest priority)
        const sitePath = path.join(projectRoot, 'site/webapp', modulePath);
        if (fs.existsSync(sitePath)) {
            return sitePath;
        }

        // 2. Fall back to framework default
        const frameworkPath = path.join(webappDir, modulePath);
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
        const webappDir = global.appConfig?.app?.dirName || path.join(process.cwd(), 'webapp');
        const projectRoot = path.dirname(webappDir);
        const sitePath = path.join(projectRoot, 'site/webapp', modulePath);
        return fs.existsSync(sitePath);
    }

    /**
     * Get all possible paths for a module (for debugging/logging)
     * @param {string} modulePath - Relative path from webapp/
     * @returns {object} - Object with site and framework paths
     */
    static getModulePaths(modulePath) {
        const webappDir = global.appConfig?.app?.dirName || path.join(process.cwd(), 'webapp');
        const projectRoot = path.dirname(webappDir);
        return {
            site: path.join(projectRoot, 'site/webapp', modulePath),
            framework: path.join(webappDir, modulePath),
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
     * Get directory paths for the framework
     * @returns {object} - Object with key directory paths
     */
    static getDirectories() {
        const webappDir = global.appConfig?.app?.dirName || path.join(process.cwd(), 'webapp');
        const projectRoot = path.dirname(webappDir);
        return {
            projectRoot,
            webappDir,
            siteDir: path.join(projectRoot, 'site'),
            siteWebappDir: path.join(projectRoot, 'site/webapp')
        };
    }

    /**
     * Ensure site directory structure exists
     * @param {string[]} subdirs - Additional subdirectories to create (optional)
     */
    static ensureSiteStructure(subdirs = []) {
        const dirs = this.getDirectories();
        const requiredDirs = [
            dirs.siteDir,
            dirs.siteWebappDir,
            path.join(dirs.siteWebappDir, 'controller'),
            path.join(dirs.siteWebappDir, 'model'),
            path.join(dirs.siteWebappDir, 'view'),
            path.join(dirs.siteWebappDir, 'static')
        ];

        // Add any additional subdirectories
        subdirs.forEach(subdir => {
            requiredDirs.push(path.join(dirs.siteWebappDir, subdir));
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
