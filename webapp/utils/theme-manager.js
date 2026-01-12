/**
 * @name            jPulse Framework / WebApp / Utils / Theme Manager
 * @tagline         Theme discovery and schema extension utility
 * @description     Discovers themes from framework, plugins, and site; extends UserModel theme enum
 * @file            webapp/utils/theme-manager.js
 * @version         1.4.13
 * @release         2026-01-13
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 2.2, GPT-5.2
 */

import fs from 'fs';
import path from 'path';
import cacheManager from './cache-manager.js';
import PathResolver from './path-resolver.js';
import LogController from '../controller/log.js';

class ThemeManager {
    static themeCache = null;
    static colorSchemeCache = new Map(); // themeName -> { scheme: 'light'|'dark', timestamp: number }

    static initialize(options = {}) {
        const { isTest = false } = options;

        try {
            const cacheConfig = global.appConfig?.utils?.theme?.cache || {
                enabled: true,
                checkInterval: 5
            };

            // In test mode, disable caching to avoid state bleed across tests
            if (isTest || process.env.NODE_ENV === 'test' || global.isTestEnvironment) {
                cacheConfig.enabled = false;
            }

            this.themeCache = cacheManager.register(cacheConfig, 'ThemeCache');
            LogController.logInfo(null, 'theme-manager.initialize', 'ThemeManager initialized');
        } catch (error) {
            LogController.logError(null, 'theme-manager.initialize', `error: ${error.message}`);
            this.themeCache = null;
        }
    }

    static discoverThemes() {
        const results = [];

        const readDirFunction = (dirPath, basePath, pattern) => {
            // Supported patterns (current needs):
            // - themes/*.json
            const parts = String(pattern || '').split('/');
            const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
            const filePattern = parts.length > 0 ? parts[parts.length - 1] : '';

            const ext = filePattern.startsWith('*.') ? filePattern.substring(1) : '';
            if (!ext) {
                return [];
            }

            const searchDir = dir ? path.join(dirPath, dir) : dirPath;
            if (!fs.existsSync(searchDir) || !fs.statSync(searchDir).isDirectory()) {
                return [];
            }

            const matches = [];
            const entries = fs.readdirSync(searchDir, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isFile()) continue;
                if (!entry.name.endsWith(ext)) continue;
                const relative = dir ? `${dir}/${entry.name}` : entry.name;
                matches.push(relative);
            }

            return matches;
        };

        const relativeFiles = PathResolver.listFiles('view/themes/*.json', null, readDirFunction);
        for (const relativeFile of relativeFiles) {
            const metaAbsPath = this._resolveViewFile(relativeFile);
            if (!metaAbsPath) continue;

            const jsonContent = this._getFileSync(metaAbsPath);
            if (!jsonContent) {
                LogController.logError(null, 'theme-manager.discoverThemes', `error: Empty metadata file: ${relativeFile}`);
                continue;
            }

            let meta;
            try {
                meta = JSON.parse(jsonContent);
            } catch (error) {
                LogController.logError(null, 'theme-manager.discoverThemes', `error: Invalid JSON in ${relativeFile}: ${error.message}`);
                continue;
            }

            if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
                LogController.logError(null, 'theme-manager.discoverThemes', `error: Invalid theme metadata object in ${relativeFile}`);
                continue;
            }

            const requiredFields = ['name', 'label', 'description', 'author', 'version', 'source'];
            const missing = requiredFields.filter(f => !meta[f] || typeof meta[f] !== 'string' || meta[f].trim() === '');
            if (missing.length > 0) {
                LogController.logError(null, 'theme-manager.discoverThemes', `error: Missing required fields in ${relativeFile}: ${missing.join(', ')}`);
                continue;
            }

            const name = meta.name.trim();
            if (!name.match(/^[a-zA-Z0-9_-]+$/)) {
                LogController.logError(null, 'theme-manager.discoverThemes', `error: Invalid theme name '${name}' in ${relativeFile}`);
                continue;
            }

            const fileBase = path.basename(relativeFile, '.json');
            if (fileBase !== name) {
                LogController.logError(null, 'theme-manager.discoverThemes', `error: Theme name mismatch: ${relativeFile} declares name='${name}'`);
                continue;
            }

            const source = meta.source.trim();
            if (!['framework', 'plugin', 'site'].includes(source)) {
                LogController.logError(null, 'theme-manager.discoverThemes', `error: Invalid source '${source}' in ${relativeFile}`);
                continue;
            }

            const cssAbsPath = this._resolveViewFile(`themes/${name}.css`);
            const pngAbsPath = this._resolveViewFile(`themes/${name}.png`);
            if (!cssAbsPath) {
                LogController.logError(null, 'theme-manager.discoverThemes', `error: Missing theme CSS file for '${name}' (themes/${name}.css)`);
                continue;
            }
            if (!pngAbsPath) {
                LogController.logError(null, 'theme-manager.discoverThemes', `error: Missing theme preview image for '${name}' (themes/${name}.png)`);
                continue;
            }

            results.push({
                name: name,
                label: meta.label.trim(),
                description: meta.description.trim(),
                author: meta.author.trim(),
                version: meta.version.trim(),
                source: source,
                pluginName: typeof meta.pluginName === 'string' ? meta.pluginName.trim() : undefined
            });
        }

        return results;
    }

    /**
     * W-129: Determine whether a theme is light or dark by inspecting its CSS file.
     * The result is cached using the CSS file timestamp (mtime) to avoid re-parsing on every request.
     *
     * Rules:
     * - Prefer explicit theme variable: --jp-theme-color-scheme: light|dark;
     * - Fallback to CSS property: color-scheme: light|dark;
     * - Default to 'light' if unknown / missing.
     *
     * @param {string} themeName - Theme id (e.g., 'dark', 'light', 'moonshine')
     * @param {string} fallback - Fallback scheme ('light' by default)
     * @returns {string} 'light' or 'dark'
     */
    static getThemeColorScheme(themeName, fallback = 'light') {
        try {
            const name = String(themeName || '').trim();
            if (!name.match(/^[a-zA-Z0-9_-]+$/)) {
                return fallback;
            }

            const cssAbsPath = this._resolveViewFile(`themes/${name}.css`);
            if (!cssAbsPath) {
                return fallback;
            }

            // Try to reuse timestamp from CacheManager if available; otherwise stat file
            let timestamp = 0;
            if (this.themeCache && this.themeCache.fileCache) {
                const fileEntry = this.themeCache.fileCache.get(cssAbsPath);
                if (fileEntry && typeof fileEntry.timestamp === 'number') {
                    timestamp = fileEntry.timestamp;
                }
            }
            if (!timestamp) {
                try {
                    timestamp = fs.statSync(cssAbsPath).mtime.valueOf();
                } catch (e) {
                    timestamp = 0;
                }
            }

            const cached = this.colorSchemeCache.get(name);
            if (cached && cached.timestamp === timestamp && (cached.scheme === 'light' || cached.scheme === 'dark')) {
                return cached.scheme;
            }

            // Ensure content is loaded (via cache if enabled)
            const css = this._getFileSync(cssAbsPath) || '';

            // Prefer explicit theme var
            const varMatch = css.match(/--jp-theme-color-scheme\s*:\s*(dark|light)\s*;/i);
            if (varMatch && varMatch[1]) {
                const scheme = varMatch[1].toLowerCase();
                this.colorSchemeCache.set(name, { scheme, timestamp });
                return scheme;
            }

            // Fallback to CSS property (e.g., color-scheme: dark;)
            const propMatch = css.match(/(^|[\s{;])color-scheme\s*:\s*(dark|light)\s*;/i);
            if (propMatch && propMatch[2]) {
                const scheme = propMatch[2].toLowerCase();
                this.colorSchemeCache.set(name, { scheme, timestamp });
                return scheme;
            }

            this.colorSchemeCache.set(name, { scheme: fallback, timestamp });
            return fallback;
        } catch (error) {
            return fallback;
        }
    }

    static extendUserModelSchema(UserModel) {
        try {
            if (!UserModel || typeof UserModel.extendSchema !== 'function') {
                LogController.logError(null, 'theme-manager.extendUserModelSchema', 'error: UserModel not provided or invalid');
                return [];
            }

            const themes = this.discoverThemes();
            const discoveredNames = Array.from(new Set(themes.map(t => t.name))).sort();

            // Always ensure core themes exist, and keep a stable, user-friendly order.
            // Preferred order: light, dark, then all other themes alphabetically.
            const enumSet = new Set();
            enumSet.add('light');
            enumSet.add('dark');
            for (const name of discoveredNames) {
                if (name === 'light' || name === 'dark') continue;
                enumSet.add(name);
            }
            const orderedEnum = Array.from(enumSet);

            // Fallback if discovery fails
            const enumValues = orderedEnum.length > 0
                ? orderedEnum
                : (UserModel.getEnum?.('preferences.theme') || ['light', 'dark']);

            UserModel.extendSchema({
                preferences: {
                    theme: {
                        enum: enumValues
                    }
                }
            });

            LogController.logInfo(null, 'theme-manager.extendUserModelSchema', `Extended UserModel.preferences.theme enum: ${enumValues.join(', ')}`);
            return enumValues;
        } catch (error) {
            LogController.logError(null, 'theme-manager.extendUserModelSchema', `error: ${error.message}`);
            return [];
        }
    }

    static _getFileSync(filePath) {
        if (this.themeCache && typeof this.themeCache.getFileSync === 'function') {
            return this.themeCache.getFileSync(filePath);
        }
        try {
            return fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }

    static _resolveViewFile(relativePathFromView) {
        try {
            return PathResolver.resolveModuleWithPlugins(`view/${relativePathFromView}`);
        } catch (error) {
            return null;
        }
    }
}

export default ThemeManager;

// EOF webapp/utils/theme-manager.js
