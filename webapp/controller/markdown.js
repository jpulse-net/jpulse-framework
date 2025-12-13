/**
 * @name            jPulse Framework / WebApp / Controller / Markdown
 * @tagline         Markdown controller for the jPulse Framework
 * @description     Markdown document serving with caching support, part of jPulse Framework
 * @file            webapp/controller/markdown.js
 * @version         1.3.13
 * @release         2025-12-13
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import fs from 'fs/promises';
import path from 'path';
import LogController from './log.js';
import CommonUtils from '../utils/common.js';
import cacheManager from '../utils/cache-manager.js';
import PathResolver from '../utils/path-resolver.js';
import PluginManager from '../utils/plugin-manager.js';

// W-079: File-based cache with automatic refresh
let markdownCache = null;

// Directory listings and ignore patterns (not file-based)
const cache = {
    directoryListing: {},
    ignorePatterns: {}
};

// _extractTitle() substitution
const titleCaseFix = global.appConfig.controller?.markdown?.titleCaseFix || { 'Jpulse': 'jPulse' };
const titleCaseFixRegex = new RegExp(`\\b(${Object.keys(titleCaseFix).join('|')})\\b`, 'g');

class MarkdownController {

    /**
     * W-104: Registry of dynamic content generators with metadata
     * Security: Only registered generators can be called from markdown
     * Each entry has: description, parameters, generator function
     * @type {Object.<string, {description: string, params: string, generator: function(Object): Promise<string>}>}
     */
    static DYNAMIC_CONTENT_REGISTRY = {
        'plugins-list-table': {
            description: 'Markdown table of installed plugins',
            params: '`status`, `limit`',
            generator: async (params) => MarkdownController._generatePluginsTable(params),
        },
        'plugins-list': {
            description: 'Bullet list of installed plugins',
            params: '`status`, `limit`',
            generator: async (params) => MarkdownController._generatePluginsList(params),
        },
        'plugins-count': {
            description: 'Count of installed plugins',
            params: '`status`',
            generator: async (params) => {
                const plugins = PluginManager.getAllPlugins();
                const filtered = params.status
                    ? plugins.filter(p => p.registryEntry.enabled === (params.status === 'enabled'))
                    : plugins;
                return `${filtered.length}`;
            },
        },
        'dynamic-generator-list': {
            description: 'List of all available dynamic content generators',
            params: '—',
            generator: async () => MarkdownController._generateGeneratorList(),
        },
        // W-105: Plugin hooks dynamic content generators
        'plugins-hooks-list': {
            description: 'Bullet list of available plugin hooks',
            params: '`namespace`',
            generator: async (params) => MarkdownController._generatePluginsHooksList(params),
        },
        'plugins-hooks-list-table': {
            description: 'Markdown table of available plugin hooks',
            params: '`namespace`',
            generator: async (params) => MarkdownController._generatePluginsHooksTable(params),
        },
        'plugins-hooks-count': {
            description: 'Count of available plugin hooks',
            params: '`namespace`',
            generator: async (params) => {
                if (!global.HookManager) return '0';
                const hooks = params.namespace
                    ? global.HookManager.getHooksByNamespace(params.namespace)
                    : global.HookManager.getAvailableHooks();
                return `${Object.keys(hooks).length}`;
            },
        },
    };

    /**
     * W-104: Compatibility wrapper - maps generator names to functions
     * @type {Object.<string, function(Object): Promise<string>>}
     */
    static get DYNAMIC_CONTENT_GENERATORS() {
        const generators = {};
        for (const [name, entry] of Object.entries(MarkdownController.DYNAMIC_CONTENT_REGISTRY)) {
            generators[name] = entry.generator;
        }
        return generators;
    }

    /**
     * W-079: Initialize markdown cache
     */
    static initialize() {
        if (!markdownCache) {
            let cacheConfig = global.appConfig.controller?.markdown?.cache || { enabled: true };

            // Ensure cacheConfig is an object, not just a boolean
            if (typeof cacheConfig === 'boolean') {
                cacheConfig = { enabled: cacheConfig };
            }

            // In test mode, disable caching to prevent hanging
            const isTestMode = process.env.NODE_ENV === 'test' || global.isTestEnvironment;
            if (isTestMode) {
                cacheConfig.enabled = false; // Disable caching in tests
            }

            markdownCache = cacheManager.register(cacheConfig, 'MarkdownCache');
            LogController.logInfo(null, 'markdown.initialize', 'Initialized markdown cache');
        }
    }

    /**
     * API endpoint: /api/1/markdown/namespace/path/to/file.md
     * Lists directory or serves specific markdown file
     */
    static async api(req, res) {
        // W-079: Ensure cache is initialized
        MarkdownController.initialize();

        const startTime = Date.now();
        // Parse path: /api/1/markdown/jpulse/dev/README.md
        const pathParts = req.path.replace('/api/1/markdown/', '').split('/');
        const namespace = pathParts[0];
        const filePath = pathParts.slice(1).join('/');

        // Log the API request
        global.LogController.logRequest(req, 'markdown.api', `${namespace}/${filePath}`);

        try {
            if (!namespace || namespace.trim() === '') {
                global.LogController.logError(req, 'markdown.api', 'error: Namespace required');
                const message = global.i18n.translate(req, 'controller.markdown.namespaceRequired');
                return CommonUtils.sendError(req, res, 400, message, 'NAMESPACE_REQUIRED');
            }

            // Determine base directory
            const baseDir = await MarkdownController._getNamespaceDirectory(namespace);
            if (!baseDir) {
                global.LogController.logError(req, 'markdown.api', `error: Namespace ${baseDir} not found`);
                const message = global.i18n.translate(req, 'controller.markdown.namespaceNotFound', { namespace: baseDir });
                return CommonUtils.sendError(req, res, 404, message, 'NAMESPACE_NOT_FOUND');
            }

            // List directory or serve file
            if (!filePath || filePath === '') {
                const listing = await MarkdownController._getDirectoryListing(namespace, baseDir);
                res.json({ success: true, files: listing });
            } else {
                // W-104: _getMarkdownFile is now async (dynamic content processing)
                const content = await MarkdownController._getMarkdownFile(namespace, filePath, baseDir);
                res.json({ success: true, content, path: filePath });
            }
            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'markdown.api', `success: ${namespace}/${filePath} completed in ${duration}ms`);

        } catch (error) {
            if(error.code === 'ENOENT') {
                global.LogController.logError(req, 'markdown.api', `error: ${error.message}`);
                const message = global.i18n.translate(req, 'controller.markdown.fileNotFound', { file: `${namespace}/${filePath}` });
                return CommonUtils.sendError(req, res, 404, message, 'FILE_NOT_FOUND');
            }
            global.LogController.logError(req, 'markdown.api', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.markdown.internalError', { details: error.message });
            return CommonUtils.sendError(req, res, 500, message, 'MARKDOWN_ERROR');
        }
    }

    /**
     * Get namespace directory following site override pattern
     * W-045: Extended to support plugin markdown directories
     */
    static async _getNamespaceDirectory(namespace) {
        // W-045: Use PathResolver for consistent priority (site > plugins > framework)
        const resolvedPath = PathResolver.resolveDirectory(`static/assets/${namespace}`);
        return resolvedPath; // Returns null if not found
    }

    /**
     * Get directory listing with caching
     */
    static async _getDirectoryListing(namespace, baseDir) {
        const cacheKey = `listing_${namespace}`;

        // Check cache if enabled
        if (global.appConfig.controller?.markdown?.cache && cache.directoryListing[cacheKey]) {
            return cache.directoryListing[cacheKey];
        }

        // Load ignore patterns for this namespace
        const ignorePatterns = await MarkdownController._loadIgnorePatterns(baseDir);

        const files = await MarkdownController._scanMarkdownFiles(baseDir, '', namespace, ignorePatterns);

        // Cache if enabled
        if (global.appConfig.controller?.markdown?.cache) {
            cache.directoryListing[cacheKey] = files;
        }

        return files;
    }

    /**
     * Get markdown file content with caching
     * W-079: Enhanced with simplified CacheManager
     * W-104: Process dynamic content tokens after cache retrieval
     */
    static async _getMarkdownFile(namespace, filePath, baseDir) {
        // Security: prevent path traversal
        if (filePath.includes('..') || filePath.startsWith('/')) {
            throw new Error('Invalid file path');
        }

        const fullPath = path.join(baseDir, filePath);

        // W-079: Use simplified cache with getFileSync
        const content = markdownCache.getFileSync(fullPath);

        if (content === null) {
            const error = new Error(`Markdown file not found: ${filePath}`);
            error.code = 'ENOENT';
            throw error;
        }

        // Transform markdown links and images for SPA navigation
        let transformed = MarkdownController._transformMarkdownLinks(content, namespace, filePath);

        // W-104: Process dynamic content tokens (after cache for fresh data)
        transformed = await MarkdownController._processDynamicContent(transformed);

        return transformed;
    }

    /**
     * Transform relative markdown links and images to absolute URLs
     * @param {string} content - Raw markdown content
     * @param {string} namespace - Documentation namespace (e.g., 'jpulse-docs')
     * @param {string} currentPath - Current file path relative to namespace root
     * @returns {string} Transformed markdown content
     */
    static _transformMarkdownLinks(content, namespace, currentPath) {
        let transformed = content;

        // Transform relative image paths
        transformed = transformed.replace(
            /!\[([^\]]*)\]\(\.\/images\/([^)]+)\)/g,
            `![$1](/assets/${namespace}/images/$2)`
        );

        // Transform ALL .md links (handles ./, ../, ../../, and plain paths)
        transformed = transformed.replace(
            /\[([^\]]+)\]\((?:\.\/)?((?:\.\.\/)*)([^)]+)\.md\)/g,
            (match, linkText, doubleDotSlashes, targetPath) => {
                // Skip absolute URLs and anchors
                if (targetPath.startsWith('http://') || targetPath.startsWith('https://') || targetPath.startsWith('#')) {
                    return match;
                }

                // Count how many "../" levels to go up
                const upLevels = doubleDotSlashes.length;

                let resolvedPath;
                if (upLevels > 0) {
                    // Need to go up directories
                    const currentPathParts = currentPath.split('/').slice(0, -1);
                    const resolvedParts = currentPathParts.slice(0, -upLevels);
                    resolvedPath = resolvedParts.length > 0
                        ? `${resolvedParts.join('/')}/${targetPath}`
                        : targetPath;
                } else {
                    // Plain path - assume relative to current directory
                    const currentDir = currentPath.split('/').slice(0, -1).join('/');
                    resolvedPath = currentDir ? `${currentDir}/${targetPath}` : targetPath;
                }

                return `[${linkText}](/${namespace}/${resolvedPath})`;
            }
        );

        return transformed;
    }

    /**
     * Recursively scan directory for .md files
     */
    static async _scanMarkdownFiles(dir, relativePath = '', namespace = '', ignorePatterns = null) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        let allFiles = [];

        // Handle root README specially - it becomes the root container
        if (relativePath === '') {
            const rootReadme = entries.find(entry => entry.isFile() && entry.name === 'README.md');
            if (rootReadme) {
                // Get all other files and directories
                const otherFiles = [];

                // Process regular files (excluding root README)
                for (const entry of entries) {
                    if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
                        // Check if file should be ignored
                        if (ignorePatterns && MarkdownController._shouldIgnore(entry.name, false, ignorePatterns)) {
                            continue;
                        }

                        otherFiles.push({
                            path: entry.name,
                            name: entry.name,
                            title: MarkdownController._extractTitle(entry.name),
                            isDirectory: false
                        });
                    }
                }

                // Process directories (including symlinks to directories - W-045)
                // Use await fs.stat() which automatically follows symlinks
                const dirEntries = [];
                for (const entry of entries) {
                    if (entry.isFile()) continue; // Skip files

                    try {
                        const fullPath = path.join(dir, entry.name);
                        const stats = await fs.stat(fullPath);
                        if (stats.isDirectory()) {
                            dirEntries.push(entry.name);
                        }
                    } catch (error) {
                        // Broken symlink or access error - skip
                    }
                }
                dirEntries.sort((a, b) => a.localeCompare(b));

                for (const dirName of dirEntries) {
                    // Check if directory should be ignored
                    if (ignorePatterns && MarkdownController._shouldIgnore(dirName, true, ignorePatterns)) {
                        continue;
                    }

                    const fullPath = path.join(dir, dirName);
                    const relPath = dirName;
                    const dirContents = await MarkdownController._scanMarkdownFiles(fullPath, relPath, namespace, ignorePatterns);

                    // Skip empty directories (no .md files)
                    if (dirContents.length === 0) {
                        continue;
                    }

                    // Find README in this directory's contents
                    const readmeIndex = dirContents.findIndex(f => f.name === 'README.md' && !f.isDirectory);
                    let readmePath = null;

                    if (readmeIndex !== -1) {
                        readmePath = dirContents[readmeIndex].path;
                        // Remove README from the directory contents since we're merging it up
                        dirContents.splice(readmeIndex, 1);
                    }

                    // Create directory entry with README merged up
                    otherFiles.push({
                        path: readmePath || path.join(relPath, 'README.md'),
                        name: readmePath ? 'README.md' : '',
                        title: MarkdownController._extractTitle(dirName),
                        isDirectory: true,
                        files: dirContents // All contents of the directory (excluding README)
                    });
                }

                // Sort other files: regular files first, then directories
                otherFiles.sort((a, b) => {
                    if (a.isDirectory !== b.isDirectory) {
                        return a.isDirectory ? 1 : -1;
                    }
                    return a.title.localeCompare(b.title);
                });

                // Return root README as container with all other files
                return [{
                    path: 'README.md',
                    name: 'README.md',
                    title: MarkdownController._extractTitle(namespace),
                    isDirectory: true,
                    files: otherFiles
                }];
            }
        }

        // Non-root directory processing (original logic)
        // Process regular files first
        for (const entry of entries) {
            const relPath = path.join(relativePath, entry.name);
            if (entry.isFile() && entry.name.endsWith('.md')) {
                // Check if file should be ignored
                if (ignorePatterns && MarkdownController._shouldIgnore(relPath, false, ignorePatterns)) {
                    continue;
                }

                allFiles.push({
                    path: relPath,
                    name: entry.name,
                    title: MarkdownController._extractTitle(entry.name),
                    isDirectory: false
                });
            }
        }

        // Process directories (including symlinks to directories - W-045)
        // Use await fs.stat() which automatically follows symlinks
        const dirEntries = [];
        for (const entry of entries) {
            if (entry.isFile()) continue; // Skip files

            try {
                const fullPath = path.join(dir, entry.name);
                const stats = await fs.stat(fullPath);
                if (stats.isDirectory()) {
                    dirEntries.push(entry.name);
                }
            } catch (error) {
                // Broken symlink or access error - skip
            }
        }
        dirEntries.sort((a, b) => a.localeCompare(b));

        for (const dirName of dirEntries) {
            const relPath = path.join(relativePath, dirName);

            // Check if directory should be ignored
            if (ignorePatterns && MarkdownController._shouldIgnore(relPath, true, ignorePatterns)) {
                continue;
            }

            const fullPath = path.join(dir, dirName);
            const dirContents = await MarkdownController._scanMarkdownFiles(fullPath, relPath, namespace, ignorePatterns);

            // Skip empty directories (no .md files)
            if (dirContents.length === 0) {
                continue;
            }

            // Find README in this directory's contents
            const readmeIndex = dirContents.findIndex(f => f.name === 'README.md' && !f.isDirectory);
            let readmePath = null;

            if (readmeIndex !== -1) {
                readmePath = dirContents[readmeIndex].path;
                // Remove README from the directory contents since we're merging it up
                dirContents.splice(readmeIndex, 1);
            }

            // Create directory entry with README merged up
            allFiles.push({
                path: readmePath || path.join(relPath, 'README.md'),
                name: readmePath ? 'README.md' : '',
                title: MarkdownController._extractTitle(dirName),
                isDirectory: true,
                files: dirContents // All contents of the directory (excluding README)
            });
        }

        // Sort: regular files first (isDirectory: false), then directories (isDirectory: true)
        allFiles.sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) {
                return a.isDirectory ? 1 : -1;
            }

            // Within same type, README first
            if (!a.isDirectory && !b.isDirectory) {
                if (a.name === 'README.md') return -1;
                if (b.name === 'README.md') return 1;
            }

            return a.title.localeCompare(b.title);
        });

        return allFiles;
    }

    /**
     * Load and parse .jpulse-ignore file for a namespace
     */
    static async _loadIgnorePatterns(baseDir) {
        const ignoreFile = path.join(baseDir, '.jpulse-ignore');

        try {
            const content = await fs.readFile(ignoreFile, 'utf8');
            const patterns = content
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'))
                .map(pattern => {
                    // Convert glob pattern to regex
                    // Escape special regex chars except * and ?
                    let regexPattern = pattern
                        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
                        .replace(/\*/g, '.*')
                        .replace(/\?/g, '.');

                    // Handle directory patterns (ending with /)
                    const isDirectory = pattern.endsWith('/');
                    if (isDirectory) {
                        regexPattern = regexPattern.slice(0, -1); // Remove trailing /
                    }

                    return {
                        pattern: pattern,
                        regex: new RegExp(`^${regexPattern}$`),
                        isDirectory: isDirectory
                    };
                });

            return patterns;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return []; // No ignore file, no patterns
            }
            throw error;
        }
    }

    /**
     * Check if a file or directory should be ignored
     */
    static _shouldIgnore(relativePath, isDirectory, ignorePatterns) {
        for (const pattern of ignorePatterns) {
            // For directory patterns (ending with /), check both exact match and subdirectory match
            if (pattern.isDirectory) {
                const dirPath = pattern.pattern.slice(0, -1); // Remove trailing /

                // Exact directory match
                if (isDirectory && relativePath === dirPath) {
                    return true;
                }

                // File or subdirectory inside ignored directory
                if (relativePath.startsWith(dirPath + '/')) {
                    return true;
                }
            } else {
                // File patterns - only match files
                if (!isDirectory && pattern.regex.test(relativePath)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Extract readable title from filename
     */
    static _extractTitle(filename) {
        return filename
            .replace(/\.md$/, '')
            .replace(/[-_]/g, ' ')
            .replace(/  +/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace(titleCaseFixRegex, (match) => titleCaseFix[match]).trim();
    }

    /**
     * W-079: Get markdown cache statistics
     * @returns {Object} Cache statistics
     */
    static getMarkdownCacheStats() {
        MarkdownController.initialize();
        return markdownCache ? markdownCache.getStats() : {
            name: 'MarkdownCache',
            fileCount: 0,
            directoryCount: 0,
            config: { enabled: false }
        };
    }

    // =========================================================================
    // W-104: Dynamic Content Processing
    // =========================================================================

    /**
     * W-104: Parse dynamic content token into name and parameters
     * @param {string} token - Content inside %DYNAMIC{...}%
     * @returns {object} { name, params }
     * @throws {Error} If token syntax is invalid
     * @private
     *
     * Examples:
     *   "plugins-list" -> { name: "plugins-list", params: {} }
     *   "logs-list limit="50"" -> { name: "logs-list", params: { limit: 50 } }
     *   "user-stats type="active" period="30d"" -> { name: "user-stats", params: { type: "active", period: "30d" } }
     */
    static _parseDynamicToken(token) {
        // Match: name followed by optional key="value" pairs
        const match = token.trim().match(/^([a-z0-9-]+)(?:\s+(.*))?$/);

        if (!match) {
            throw new Error(`Invalid dynamic content syntax: ${token}`);
        }

        const name = match[1];
        const paramsString = match[2] || '';
        const params = {};

        if (paramsString) {
            // Match all key="value" pairs
            const paramRegex = /([a-z0-9-]+)="([^"]+)"/g;
            let paramMatch;

            while ((paramMatch = paramRegex.exec(paramsString)) !== null) {
                const key = paramMatch[1];
                const value = paramMatch[2];

                // Type coercion: try to parse as number/boolean
                if (value === 'true') params[key] = true;
                else if (value === 'false') params[key] = false;
                else if (/^\d+$/.test(value)) params[key] = parseInt(value, 10);
                else if (/^\d+\.\d+$/.test(value)) params[key] = parseFloat(value);
                else params[key] = value; // Keep as string
            }
        }

        return { name, params };
    }

    /**
     * W-104: Process dynamic content tokens in markdown
     * Replaces %DYNAMIC{content-name key="value"}% with generated content
     * Tokens preceded by backtick are not processed (for documentation)
     * @param {string} content - Raw markdown content
     * @returns {Promise<string>} Processed markdown content
     * @private
     */
    static async _processDynamicContent(content) {
        // Match %DYNAMIC{...}% but NOT if preceded by a backtick (for escaping in docs)
        // Using negative lookbehind: (?<!`)
        const tokenRegex = /(?<!`)%DYNAMIC\{([^}]+)\}%/g;
        const matches = [...content.matchAll(tokenRegex)];

        if (matches.length === 0) {
            return content; // No dynamic content, return as-is
        }

        let processed = content;

        // Process each token (in sequence to maintain order)
        for (const match of matches) {
            const fullToken = match[0]; // e.g., "%DYNAMIC{plugins-list limit="10"}%"
            const tokenContent = match[1]; // e.g., "plugins-list limit="10""

            try {
                // Parse token into name and parameters
                const { name, params } = MarkdownController._parseDynamicToken(tokenContent);

                const generator = MarkdownController.DYNAMIC_CONTENT_GENERATORS[name];

                if (!generator) {
                    LogController.logError(null, 'markdown._processDynamicContent',
                        `error: Unknown dynamic content: ${name}`);
                    processed = processed.replace(fullToken,
                        `_Error: Unknown dynamic content: \`${name}\`_`);
                    continue;
                }

                // Call generator with parameters (async)
                const generatedContent = await generator(params);

                // Replace token with generated content
                processed = processed.replace(fullToken, generatedContent || '');

            } catch (error) {
                LogController.logError(null, 'markdown._processDynamicContent',
                    `error: Failed to process token "${tokenContent}": ${error.message}`);
                processed = processed.replace(fullToken,
                    `_Error: ${error.message}_`);
            }
        }

        return processed;
    }

    /**
     * W-104: Generate markdown table of installed plugins
     * Used for dynamic content: %DYNAMIC{plugins-list-table}%
     * @param {object} params - Optional parameters
     *   - status: filter by "enabled" or "disabled"
     *   - limit: max number of plugins to show
     * @returns {string} Markdown table
     * @private
     */
    static _generatePluginsTable(params = {}) {
        let plugins = PluginManager.getAllPlugins();

        // Filter by status if specified
        if (params.status) {
            const showEnabled = params.status === 'enabled';
            plugins = plugins.filter(p => p.registryEntry.enabled === showEnabled);
        }

        // Limit results if specified
        if (params.limit) {
            plugins = plugins.slice(0, params.limit);
        }

        if (plugins.length === 0) {
            return '_No plugins match the criteria._';
        }

        let md = '| Plugin | Version | Status | Description |\n';
        md += '|--------|---------|--------|-------------|\n';

        for (const plugin of plugins) {
            const icon = plugin.metadata.icon || '📦';
            const name = plugin.name;
            const version = plugin.metadata.version || '—';
            const status = plugin.registryEntry.enabled ? '✅ Enabled' : '⏸️ Disabled';
            const summary = plugin.metadata.summary || '';
            const link = `/jpulse-docs/installed-plugins/${name}/README`;

            md += `| ${icon} [${name}](${link}) | ${version} | ${status} | ${summary} |\n`;
        }

        return md;
    }

    /**
     * W-104: Generate markdown list of installed plugins
     * Used for dynamic content: %DYNAMIC{plugins-list}%
     * @param {object} params - Optional parameters
     *   - status: filter by "enabled" or "disabled"
     *   - limit: max number of plugins to show
     * @returns {string} Markdown list
     * @private
     */
    static _generatePluginsList(params = {}) {
        let plugins = PluginManager.getAllPlugins();

        // Filter by status if specified
        if (params.status) {
            const showEnabled = params.status === 'enabled';
            plugins = plugins.filter(p => p.registryEntry.enabled === showEnabled);
        }

        // Limit results if specified
        if (params.limit) {
            plugins = plugins.slice(0, params.limit);
        }

        if (plugins.length === 0) {
            return '_No plugins match the criteria._';
        }

        let md = '';
        for (const plugin of plugins) {
            const name = plugin.name;
            const summary = plugin.metadata.summary || 'No description';
            const link = `/jpulse-docs/installed-plugins/${name}/README`;
            const icon = plugin.metadata.icon || '📦';
            const status = plugin.registryEntry.enabled ? '' : ' _(disabled)_';

            md += `- ${icon} **[${name}](${link})**${status} - ${summary}\n`;
        }

        return md;
    }

    /**
     * W-104: Generate markdown table of available dynamic content generators
     * Used for dynamic content: %DYNAMIC{dynamic-generator-list}%
     * @returns {string} Markdown table
     * @private
     */
    static _generateGeneratorList() {
        const registry = MarkdownController.DYNAMIC_CONTENT_REGISTRY;
        const generators = Object.keys(registry).sort();

        if (generators.length === 0) {
            return '_No dynamic content generators available._';
        }

        let md = '| Generator | Description | Parameters |\n';
        md += '|-----------|-------------|------------|\n';

        for (const name of generators) {
            const entry = registry[name];
            md += `| \`${name}\` | ${entry.description} | ${entry.params} |\n`;
        }

        return md;
    }

    // ========================================================================
    // W-105: Plugin hooks dynamic content generators
    // ========================================================================

    /**
     * W-105: Generate markdown table of available plugin hooks
     * Used for dynamic content: %DYNAMIC{plugins-hooks-list-table}%
     * @param {object} params - Optional parameters
     *   - namespace: filter by namespace prefix (e.g., "auth", "user")
     * @returns {string} Markdown table
     * @private
     */
    static _generatePluginsHooksTable(params = {}) {
        if (!global.HookManager) {
            return '_HookManager not initialized._';
        }

        const hooks = params.namespace
            ? global.HookManager.getHooksByNamespace(params.namespace)
            : global.HookManager.getAvailableHooks();

        const hookNames = Object.keys(hooks).sort();

        if (hookNames.length === 0) {
            return '_No hooks match the criteria._';
        }

        let md = '| Hook | Description | Context | Modify | Cancel |\n';
        md += '|------|-------------|---------|--------|--------|\n';

        for (const name of hookNames) {
            const hook = hooks[name];
            const canModify = hook.canModify ? '✅' : '❌';
            const canCancel = hook.canCancel ? '✅' : '❌';
            md += `| \`${name}\` | ${hook.description} | \`${hook.context}\` | ${canModify} | ${canCancel} |\n`;
        }

        return md;
    }

    /**
     * W-105: Generate markdown list of available plugin hooks
     * Used for dynamic content: %DYNAMIC{plugins-hooks-list}%
     * @param {object} params - Optional parameters
     *   - namespace: filter by namespace prefix (e.g., "auth", "user")
     * @returns {string} Markdown list
     * @private
     */
    static _generatePluginsHooksList(params = {}) {
        if (!global.HookManager) {
            return '_HookManager not initialized._';
        }

        const hooks = params.namespace
            ? global.HookManager.getHooksByNamespace(params.namespace)
            : global.HookManager.getAvailableHooks();

        const hookNames = Object.keys(hooks).sort();

        if (hookNames.length === 0) {
            return '_No hooks match the criteria._';
        }

        let md = '';
        for (const name of hookNames) {
            const hook = hooks[name];
            const badges = [];
            if (hook.canModify) badges.push('modify');
            if (hook.canCancel) badges.push('cancel');
            const badgeStr = badges.length > 0 ? ` _(${badges.join(', ')})_` : '';
            md += `- **\`${name}\`**${badgeStr} - ${hook.description}\n`;
        }

        return md;
    }
}

export default MarkdownController;

// EOF webapp/controller/markdown.js
