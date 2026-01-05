/**
 * @name            jPulse Framework / WebApp / Utils / Symlink Manager
 * @tagline         Symlink Management for Plugin Static Assets
 * @description     Manages symlinks for plugin static assets
 * @file            webapp/utils/symlink-manager.js
 * @version         1.4.5
 * @release         2026-01-05
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.0, Claude Sonnet 4.5
 */

import fs from 'fs';
import path from 'path';

/**
 * Symlink Manager - handles symlink creation/removal for plugin static assets
 * Implements W-045 Static Asset Strategy
 */
class SymlinkManager {

    /**
     * Detect if running in framework repo or site installation
     *
     * @returns {string} 'framework' or 'site'
     */
    static detectContext() {
        const projectRoot = global.appConfig.system.projectRoot;

        // Framework repo has docs/ at root level
        const frameworkDocsPath = path.join(projectRoot, 'docs', 'plugins');
        if (fs.existsSync(frameworkDocsPath)) {
            return 'framework';
        }

        // Site has docs copied to webapp/static/assets/jpulse-docs/
        const siteDocsPath = path.join(projectRoot, 'webapp', 'static', 'assets', 'jpulse-docs', 'plugins');
        if (fs.existsSync(siteDocsPath)) {
            return 'site';
        }

        // Default to framework if uncertain
        return 'framework';
    }

    /**
     * Create symlink for plugin static assets
     * Creates: webapp/static/plugins/{pluginName} → ../../../plugins/{pluginName}/webapp/static/
     *
     * @param {string} pluginName - Plugin name
     * @param {string} pluginPath - Absolute path to plugin directory
     * @returns {object} Result { success: boolean, message: string }
     */
    static createPluginSymlink(pluginName, pluginPath) {
        try {
            const projectRoot = global.appConfig.system.projectRoot;
            const staticPluginsDir = path.join(projectRoot, 'webapp', 'static', 'plugins');
            const symlinkPath = path.join(staticPluginsDir, pluginName);
            const targetPath = path.join(pluginPath, 'webapp', 'static');

            // Ensure webapp/static/plugins directory exists
            if (!fs.existsSync(staticPluginsDir)) {
                fs.mkdirSync(staticPluginsDir, { recursive: true });
            }

            // Check if symlink already exists
            if (fs.existsSync(symlinkPath)) {
                // Check if it's a valid symlink pointing to the right place
                try {
                    const currentTarget = fs.readlinkSync(symlinkPath);
                    const resolvedTarget = path.resolve(staticPluginsDir, currentTarget);
                    const expectedTarget = path.resolve(targetPath);

                    if (resolvedTarget === expectedTarget) {
                        return { success: true, message: 'Symlink already exists and is correct' };
                    }

                    // Symlink exists but points to wrong location, remove it
                    fs.unlinkSync(symlinkPath);
                } catch (error) {
                    // Not a symlink or error reading it, remove it
                    if (fs.lstatSync(symlinkPath).isDirectory()) {
                        // It's a directory, don't remove it
                        return { success: false, message: `Path exists as directory: ${symlinkPath}` };
                    }
                    fs.unlinkSync(symlinkPath);
                }
            }

            // Check if target directory exists
            if (!fs.existsSync(targetPath)) {
                return { success: false, message: `Plugin static directory not found: ${targetPath}` };
            }

            // Create relative symlink
            // From: webapp/static/plugins/{pluginName}
            // To:   ../../../plugins/{pluginName}/webapp/static
            const relativeTarget = path.relative(staticPluginsDir, targetPath);
            fs.symlinkSync(relativeTarget, symlinkPath, 'dir');

            return { success: true, message: `Symlink created: ${symlinkPath} → ${relativeTarget}` };

        } catch (error) {
            return { success: false, message: `Failed to create symlink: ${error.message}` };
        }
    }

    /**
     * Remove symlink for plugin static assets
     *
     * @param {string} pluginName - Plugin name
     * @returns {object} Result { success: boolean, message: string }
     */
    static removePluginSymlink(pluginName) {
        try {
            const projectRoot = global.appConfig.system.projectRoot;
            const symlinkPath = path.join(projectRoot, 'webapp', 'static', 'plugins', pluginName);

            // Check if symlink exists
            if (!fs.existsSync(symlinkPath)) {
                return { success: true, message: 'Symlink does not exist' };
            }

            // Check if it's a symlink (not a regular directory)
            const stats = fs.lstatSync(symlinkPath);
            if (!stats.isSymbolicLink()) {
                return { success: false, message: `Path is not a symlink: ${symlinkPath}` };
            }

            // Remove symlink
            fs.unlinkSync(symlinkPath);

            return { success: true, message: `Symlink removed: ${symlinkPath}` };

        } catch (error) {
            return { success: false, message: `Failed to remove symlink: ${error.message}` };
        }
    }

    /**
     * Create symlinks for all enabled plugins
     *
     * @param {Array} plugins - Array of plugin objects
     * @returns {object} Statistics { created: number, failed: number, skipped: number }
     */
    static createAllPluginSymlinks(plugins) {
        const stats = {
            created: 0,
            failed: 0,
            skipped: 0,
            errors: []
        };

        for (const plugin of plugins) {
            const result = this.createPluginSymlink(plugin.name, plugin.path);
            if (result.success) {
                if (result.message.includes('already exists')) {
                    stats.skipped++;
                } else {
                    stats.created++;
                }
            } else {
                stats.failed++;
                stats.errors.push(`${plugin.name}: ${result.message}`);
            }
        }

        return stats;
    }

    /**
     * Remove symlinks for all plugins
     *
     * @param {Array} pluginNames - Array of plugin names
     * @returns {object} Statistics { removed: number, failed: number, skipped: number }
     */
    static removeAllPluginSymlinks(pluginNames) {
        const stats = {
            removed: 0,
            failed: 0,
            skipped: 0,
            errors: []
        };

        for (const pluginName of pluginNames) {
            const result = this.removePluginSymlink(pluginName);
            if (result.success) {
                if (result.message.includes('does not exist')) {
                    stats.skipped++;
                } else {
                    stats.removed++;
                }
            } else {
                stats.failed++;
                stats.errors.push(`${pluginName}: ${result.message}`);
            }
        }

        return stats;
    }

    /**
     * Create symlink for plugin documentation
     * Framework: docs/installed-plugins/{pluginName} → ../../plugins/{pluginName}/docs
     * Site: webapp/static/assets/jpulse-docs/installed-plugins/{pluginName} → ../../../../plugins/{pluginName}/docs
     *
     * @param {string} pluginName - Plugin name
     * @param {string} pluginPath - Absolute path to plugin directory
     * @returns {object} Result { success: boolean, message: string }
     */
    static createPluginDocsSymlink(pluginName, pluginPath) {
        try {
            const projectRoot = global.appConfig.system.projectRoot;
            const context = this.detectContext();

            // Determine docs directory based on context
            let docsPluginsDir;
            if (context === 'site') {
                // Site installation: docs are in webapp/static/assets/jpulse-docs/
                docsPluginsDir = path.join(projectRoot, 'webapp', 'static', 'assets', 'jpulse-docs', 'installed-plugins');
            } else {
                // Framework repo: docs are in docs/
                docsPluginsDir = path.join(projectRoot, 'docs', 'installed-plugins');
            }

            const symlinkPath = path.join(docsPluginsDir, pluginName);
            const targetPath = path.join(pluginPath, 'docs');

            // Ensure installed-plugins directory exists
            if (!fs.existsSync(docsPluginsDir)) {
                fs.mkdirSync(docsPluginsDir, { recursive: true });
            }

            // Check if symlink already exists
            if (fs.existsSync(symlinkPath)) {
                // Check if it's a valid symlink pointing to the right place
                try {
                    const currentTarget = fs.readlinkSync(symlinkPath);
                    const resolvedTarget = path.resolve(docsPluginsDir, currentTarget);
                    const expectedTarget = path.resolve(targetPath);

                    if (resolvedTarget === expectedTarget) {
                        return { success: true, message: 'Docs symlink already exists and is correct' };
                    }

                    // Symlink exists but points to wrong location, remove it
                    fs.unlinkSync(symlinkPath);
                } catch (error) {
                    // Not a symlink or error reading it, remove it
                    if (fs.lstatSync(symlinkPath).isDirectory()) {
                        // It's a directory, don't remove it
                        return { success: false, message: `Docs path exists as directory: ${symlinkPath}` };
                    }
                    fs.unlinkSync(symlinkPath);
                }
            }

            // Check if target directory exists
            if (!fs.existsSync(targetPath)) {
                return { success: false, message: `Plugin docs directory not found: ${targetPath}` };
            }

            // Create relative symlink (context-dependent path)
            const relativeTarget = path.relative(docsPluginsDir, targetPath);
            fs.symlinkSync(relativeTarget, symlinkPath, 'dir');

            return { success: true, message: `Docs symlink created: ${symlinkPath} → ${relativeTarget}` };

        } catch (error) {
            return { success: false, message: `Failed to create docs symlink: ${error.message}` };
        }
    }

    /**
     * Remove symlink for plugin documentation
     *
     * @param {string} pluginName - Plugin name
     * @returns {object} Result { success: boolean, message: string }
     */
    static removePluginDocsSymlink(pluginName) {
        try {
            const projectRoot = global.appConfig.system.projectRoot;
            const context = this.detectContext();

            // Determine symlink path based on context
            let symlinkPath;
            if (context === 'site') {
                symlinkPath = path.join(projectRoot, 'webapp', 'static', 'assets', 'jpulse-docs', 'installed-plugins', pluginName);
            } else {
                symlinkPath = path.join(projectRoot, 'docs', 'installed-plugins', pluginName);
            }

            // Check if symlink exists
            if (!fs.existsSync(symlinkPath)) {
                return { success: true, message: 'Docs symlink does not exist' };
            }

            // Check if it's a symlink (not a regular directory)
            const stats = fs.lstatSync(symlinkPath);
            if (!stats.isSymbolicLink()) {
                return { success: false, message: `Docs path is not a symlink: ${symlinkPath}` };
            }

            // Remove symlink
            fs.unlinkSync(symlinkPath);

            return { success: true, message: `Docs symlink removed: ${symlinkPath}` };

        } catch (error) {
            return { success: false, message: `Failed to remove docs symlink: ${error.message}` };
        }
    }

    /**
     * Verify symlink integrity for a plugin
     *
     * @param {string} pluginName - Plugin name
     * @param {string} pluginPath - Absolute path to plugin directory
     * @returns {object} Status { valid: boolean, exists: boolean, target: string, message: string }
     */
    static verifyPluginSymlink(pluginName, pluginPath) {
        try {
            const projectRoot = global.appConfig.system.projectRoot;
            const symlinkPath = path.join(projectRoot, 'webapp', 'static', 'plugins', pluginName);

            if (!fs.existsSync(symlinkPath)) {
                return {
                    valid: false,
                    exists: false,
                    target: null,
                    message: 'Symlink does not exist'
                };
            }

            const stats = fs.lstatSync(symlinkPath);
            if (!stats.isSymbolicLink()) {
                return {
                    valid: false,
                    exists: true,
                    target: null,
                    message: 'Path exists but is not a symlink'
                };
            }

            const currentTarget = fs.readlinkSync(symlinkPath);
            const resolvedTarget = path.resolve(path.dirname(symlinkPath), currentTarget);
            const expectedTarget = path.join(pluginPath, 'webapp', 'static');

            if (resolvedTarget === path.resolve(expectedTarget)) {
                return {
                    valid: true,
                    exists: true,
                    target: currentTarget,
                    message: 'Symlink is valid'
                };
            }

            return {
                valid: false,
                exists: true,
                target: currentTarget,
                message: `Symlink points to wrong location: ${currentTarget}`
            };

        } catch (error) {
            return {
                valid: false,
                exists: false,
                target: null,
                message: `Error verifying symlink: ${error.message}`
            };
        }
    }
}

export default SymlinkManager;

// EOF webapp/utils/symlink-manager.js
