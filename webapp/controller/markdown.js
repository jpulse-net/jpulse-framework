/**
 * @name            jPulse Framework / WebApp / Controller / Markdown
 * @tagline         Markdown controller for the jPulse Framework
 * @description     Markdown document serving with caching support, part of jPulse Framework
 * @file            webapp/controller/markdown.js
 * @version         1.6.0
 * @release         2026-01-27
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 2.2, Claude Sonnet 4.5
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

// W-120: Docs config cache (per baseDir)
const docsConfigCache = {};

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
        // W-116: Handlebars helpers dynamic content generators
        'handlebars-list-table': {
            description: 'Markdown table of Handlebars helpers',
            params: '`type` (optional: "regular" or "block"), `source` (optional: "jpulse", "site", or plugin name)',
            generator: async (params) => MarkdownController._generateHandlebarsTable(params),
        },
        'handlebars-list': {
            description: 'Bullet list of Handlebars helpers',
            params: '`type` (optional: "regular" or "block"), `source` (optional: "jpulse", "site", or plugin name)',
            generator: async (params) => MarkdownController._generateHandlebarsList(params),
        },
        // W-129: Themes dynamic content generators
        'themes-list-table': {
            description: 'Markdown table of available themes',
            params: '`source` (optional: "framework", "plugin", "site")',
            generator: async (params) => MarkdownController._generateThemesTable(params),
        },
        'themes-list': {
            description: 'Bullet list of available themes',
            params: '`source` (optional: "framework", "plugin", "site")',
            generator: async (params) => MarkdownController._generateThemesList(params),
        },
        'themes-count': {
            description: 'Count of available themes',
            params: '`source` (optional: "framework", "plugin", "site")',
            generator: async (params) => {
                const themes = await MarkdownController._getThemes();
                const filtered = params.source
                    ? themes.filter(t => t.source === params.source)
                    : themes;
                return `${filtered.length}`;
            },
        },
        'themes-default': {
            description: 'Default theme id (from app.conf utils.theme.default)',
            params: '—',
            generator: async () => {
                const raw = String(global.appConfig?.utils?.theme?.default || 'light');
                const themeId = /^[a-zA-Z0-9_-]+$/.test(raw) ? raw : 'light';
                return themeId;
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

        // W-120: Check .markdown mtime for cache invalidation
        let configMtime = null;
        try {
            const configFile = path.join(baseDir, '.markdown');
            const stats = await fs.stat(configFile);
            configMtime = stats.mtime.getTime();
        } catch (error) {
            // No config file or error - use existing cache
        }

        // Check cache if enabled
        if (global.appConfig.controller?.markdown?.cache && cache.directoryListing[cacheKey]) {
            const cached = cache.directoryListing[cacheKey];
            // Invalidate if config file changed
            if (configMtime && cached.configMtime && configMtime !== cached.configMtime) {
                // Config file was modified
                delete cache.directoryListing[cacheKey];
                delete docsConfigCache[baseDir]; // Clear config cache too
            } else if (!configMtime && cached.configMtime) {
                // Config file was deleted
                delete cache.directoryListing[cacheKey];
                delete docsConfigCache[baseDir];
            } else if (configMtime && !cached.configMtime) {
                // Config file was created (wasn't there before)
                delete cache.directoryListing[cacheKey];
                delete docsConfigCache[baseDir];
            } else if (cached.files) {
                // Check if configMtime matches (both null or both same)
                const configMatches = (configMtime === null && cached.configMtime === null) ||
                                     (configMtime !== null && cached.configMtime === configMtime);
                if (configMatches) {
                    // No config file change - return cached files
                    return cached.files;
                }
                // Config changed, clear cache and continue
                delete cache.directoryListing[cacheKey];
                delete docsConfigCache[baseDir];
            }
        }

        // W-120: Initialize docs config
        const docsConfig = await MarkdownController._initializeDocsConfig(baseDir);
        const files = await MarkdownController._scanMarkdownFiles(baseDir, '', namespace, docsConfig);

        // Cache if enabled
        if (global.appConfig.controller?.markdown?.cache) {
            cache.directoryListing[cacheKey] = {
                files: files,
                configMtime: configMtime
            };
        }

        return files;
    }

    /**
     * Get markdown file content with caching
     * W-079: Enhanced with simplified CacheManager
     * W-104: Process dynamic content tokens after cache retrieval
     * W-120: Handle subdirectories without README (auto-generate docs list)
     */
    static async _getMarkdownFile(namespace, filePath, baseDir) {
        // Security: prevent path traversal
        if (filePath.includes('..') || filePath.startsWith('/')) {
            throw new Error('Invalid file path');
        }

        const fullPath = path.join(baseDir, filePath);

        // W-079: Use simplified cache with getFileSync
        let content = markdownCache.getFileSync(fullPath);

        // W-120: Handle subdirectory without README - generate virtual README
        if (content === null && filePath.endsWith('README.md')) {
            // Check if this is a directory (without README)
            const dirPath = path.dirname(fullPath);
            try {
                const dirStats = await fs.stat(dirPath);
                if (dirStats.isDirectory()) {
                    // This is a directory without README - generate virtual README
                    const docsConfig = await MarkdownController._initializeDocsConfig(baseDir);
                    const relativeDirPath = path.dirname(filePath);
                    const dirContents = await MarkdownController._scanMarkdownFiles(
                        dirPath,
                        relativeDirPath === '.' ? '' : relativeDirPath,
                        namespace,
                        docsConfig
                    );

                    if (dirContents.length > 0) {
                        // Generate markdown list of files
                        const dirName = path.basename(dirPath);
                        const title = MarkdownController._extractTitle(dirName, docsConfig);
                        let markdown = `# ${title}\n\n`;
                        markdown += `This section contains the following documents:\n\n`;

                        for (const file of dirContents) {
                            const fileName = file.path.replace('.md', '');
                            const fileTitle = file.title || fileName;
                            markdown += `- [${fileTitle}](/${namespace}/${fileName})\n`;
                        }

                        content = markdown;
                    }
                }
            } catch (error) {
                // Not a directory or error - fall through to file not found
            }
        }

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
        // Extract code blocks to preserve them (don't transform links inside code blocks)
        const codeBlockPlaceholder = '___CODE_BLOCK_PLACEHOLDER___';
        const codeBlocks = [];
        let processedContent = content;
        let codeBlockIndex = 0;

        // Match code blocks (```...```) - handles both with and without language tags
        const codeBlockRegex = /```[\s\S]*?```/g;
        processedContent = processedContent.replace(codeBlockRegex, (match) => {
            const placeholder = `${codeBlockPlaceholder}${codeBlockIndex}${codeBlockPlaceholder}`;
            codeBlocks[codeBlockIndex] = match;
            codeBlockIndex++;
            return placeholder;
        });

        // Transform relative image paths (only outside code blocks)
        processedContent = processedContent.replace(
            /!\[([^\]]*)\]\(\.\/images\/([^)]+)\)/g,
            `![$1](/assets/${namespace}/images/$2)`
        );

        // Transform ALL .md links (handles ./, ../, ../../, and plain paths)
        // Only transforms links outside code blocks
        processedContent = processedContent.replace(
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

        // Restore code blocks
        codeBlocks.forEach((codeBlock, index) => {
            const placeholder = `${codeBlockPlaceholder}${index}${codeBlockPlaceholder}`;
            processedContent = processedContent.replace(placeholder, codeBlock);
        });

        return processedContent;
    }

    /**
     * W-120: Apply publish list ordering to file list
     * @param {Array} files - Array of file objects
     * @param {Object} docsConfig - Docs config object
     * @returns {Array} Ordered file array
     */
    static _applyPublishListOrdering(files, docsConfig) {
        if (!docsConfig || !docsConfig.publishList || docsConfig.publishList.length === 0) {
            // No publish-list, return files as-is (will be sorted alphabetically elsewhere if needed)
            return files;
        }

        // Separate files into explicit and remaining
        const explicitFiles = [];
        const explicitPaths = new Set();
        const remainingFiles = [];

        // First, collect explicit files in order from publish-list
        for (const entry of docsConfig.publishList) {
            // Find file by exact path match (handles both files and directories)
            const file = files.find(f => f.path === entry.path);
            if (file) {
                // Apply custom title if specified
                if (entry.title) {
                    file.title = entry.title;
                }
                explicitFiles.push(file);
                explicitPaths.add(entry.path);
            }
        }

        // Then, collect remaining files (not in publish-list and not ignored)
        for (const file of files) {
            if (!explicitPaths.has(file.path)) {
                // Check if should be ignored (only for files not in publish-list)
                if (!MarkdownController._shouldIgnore(file.path, file.isDirectory, docsConfig.ignore)) {
                    remainingFiles.push(file);
                }
            }
        }

        // Sort remaining files alphabetically
        remainingFiles.sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) {
                return a.isDirectory ? 1 : -1;
            }
            return a.title.localeCompare(b.title);
        });

        return [...explicitFiles, ...remainingFiles];
    }

    /**
     * Recursively scan directory for .md files
     * @param {string} dir - Directory to scan
     * @param {string} relativePath - Relative path from base
     * @param {string} namespace - Namespace
     * @param {Object} docsConfig - Docs config object (W-120)
     */
    static async _scanMarkdownFiles(dir, relativePath = '', namespace = '', docsConfig = null) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        let allFiles = [];

        // Handle root README specially - it becomes the root container
        if (relativePath === '') {
            const rootReadme = entries.find(entry => entry.isFile() && entry.name === 'README.md');
            if (rootReadme) {
                // Get all other files and directories
                let otherFiles = [];

                // Process regular files (excluding root README)
                for (const entry of entries) {
                    if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
                        // W-120: Check if file should be ignored
                        if (docsConfig && MarkdownController._shouldIgnore(entry.name, false, docsConfig.ignore)) {
                            continue;
                        }

                        // W-120: Check if title is in publish-list
                        let title = null;
                        if (docsConfig && docsConfig.publishList) {
                            const publishEntry = docsConfig.publishList.find(e => e.path === entry.name);
                            if (publishEntry && publishEntry.title) {
                                title = publishEntry.title;
                            }
                        }
                        if (!title) {
                            title = MarkdownController._extractTitle(entry.name, docsConfig);
                        }

                        otherFiles.push({
                            path: entry.name,
                            name: entry.name,
                            title: title,
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
                    // W-120: Check if directory should be ignored
                    if (docsConfig && MarkdownController._shouldIgnore(dirName, true, docsConfig.ignore)) {
                        continue;
                    }

                    const fullPath = path.join(dir, dirName);
                    const relPath = dirName;
                    const dirContents = await MarkdownController._scanMarkdownFiles(fullPath, relPath, namespace, docsConfig);

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

                    // W-120: Get title from publish-list or auto-generate
                    let dirTitle = null;
                    const readmePathForTitle = readmePath || path.join(relPath, 'README.md');
                    if (docsConfig && docsConfig.publishList) {
                        const publishEntry = docsConfig.publishList.find(e => e.path === readmePathForTitle);
                        if (publishEntry && publishEntry.title) {
                            dirTitle = publishEntry.title;
                        }
                    }
                    if (!dirTitle) {
                        dirTitle = MarkdownController._extractTitle(dirName, docsConfig);
                    }

                    // W-120: Handle subdirectory without README - auto-generate docs list
                    let finalPath = readmePath || path.join(relPath, 'README.md');
                    let finalName = readmePath ? 'README.md' : '';
                    if (!readmePath && dirContents.length > 0) {
                        // Create virtual README with file list
                        finalName = 'README.md'; // Make it clickable
                    }

                    // W-120: If directory has only README (no other files), render as regular doc
                    if (dirContents.length === 0 && readmePath) {
                        // Directory with only README - render as regular file
                        otherFiles.push({
                            path: readmePath,
                            name: 'README.md',
                            title: dirTitle,
                            isDirectory: false
                        });
                    } else {
                        // Create directory entry with README merged up
                        otherFiles.push({
                            path: finalPath,
                            name: finalName,
                            title: dirTitle,
                            isDirectory: true,
                            files: dirContents // All contents of the directory (excluding README)
                        });
                    }
                }

                // W-120: Apply publish list ordering instead of simple sort
                otherFiles = MarkdownController._applyPublishListOrdering(otherFiles, docsConfig);

                // Return root README as container with all other files
                // W-120: Get root title from publish-list or auto-generate
                let rootTitle = null;
                if (docsConfig && docsConfig.publishList) {
                    const publishEntry = docsConfig.publishList.find(e => e.path === 'README.md');
                    if (publishEntry && publishEntry.title) {
                        rootTitle = publishEntry.title;
                    }
                }
                if (!rootTitle) {
                    rootTitle = MarkdownController._extractTitle(namespace, docsConfig);
                }

                return [{
                    path: 'README.md',
                    name: 'README.md',
                    title: rootTitle,
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
                // W-120: Check if file should be ignored
                if (docsConfig && MarkdownController._shouldIgnore(relPath, false, docsConfig.ignore)) {
                    continue;
                }

                // W-120: Check if title is in publish-list
                let title = null;
                if (docsConfig && docsConfig.publishList) {
                    const publishEntry = docsConfig.publishList.find(e => e.path === relPath);
                    if (publishEntry && publishEntry.title) {
                        title = publishEntry.title;
                    }
                }
                if (!title) {
                    title = MarkdownController._extractTitle(entry.name, docsConfig);
                }

                allFiles.push({
                    path: relPath,
                    name: entry.name,
                    title: title,
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

            // W-120: Check if directory should be ignored
            if (docsConfig && MarkdownController._shouldIgnore(relPath, true, docsConfig.ignore)) {
                continue;
            }

            const fullPath = path.join(dir, dirName);
            const dirContents = await MarkdownController._scanMarkdownFiles(fullPath, relPath, namespace, docsConfig);

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

            // W-120: Get title from publish-list or auto-generate
            let dirTitle = null;
            const readmePathForTitle = readmePath || path.join(relPath, 'README.md');
            if (docsConfig && docsConfig.publishList) {
                const publishEntry = docsConfig.publishList.find(e => e.path === readmePathForTitle);
                if (publishEntry && publishEntry.title) {
                    dirTitle = publishEntry.title;
                }
            }
            if (!dirTitle) {
                dirTitle = MarkdownController._extractTitle(dirName, docsConfig);
            }

            // W-120: Handle subdirectory without README - auto-generate docs list
            let finalPath = readmePath || path.join(relPath, 'README.md');
            let finalName = readmePath ? 'README.md' : '';
            if (!readmePath && dirContents.length > 0) {
                // Create virtual README with file list
                finalName = 'README.md'; // Make it clickable
            }

            // W-120: If directory has only README (no other files), render as regular doc
            if (dirContents.length === 0 && readmePath) {
                // Directory with only README - render as regular file
                allFiles.push({
                    path: readmePath,
                    name: 'README.md',
                    title: dirTitle,
                    isDirectory: false
                });
            } else {
                // Create directory entry with README merged up
                allFiles.push({
                    path: finalPath,
                    name: finalName,
                    title: dirTitle,
                    isDirectory: true,
                    files: dirContents // All contents of the directory (excluding README)
                });
            }
        }

        // W-120: Apply publish list ordering instead of simple sort
        allFiles = MarkdownController._applyPublishListOrdering(allFiles, docsConfig);

        return allFiles;
    }

    /**
     * W-120: Initialize and parse .markdown configuration file
     * @param {string} baseDir - Base directory for the namespace
     * @returns {Object} Config object with publishList, ignore, titleCaseFix, titleCaseFixRegex
     */
    static async _initializeDocsConfig(baseDir) {
        // Check cache first
        if (docsConfigCache[baseDir]) {
            return docsConfigCache[baseDir];
        }

        const configFile = path.join(baseDir, '.markdown');
        const config = {
            publishList: [], // Array of {path, title} objects
            ignore: [], // Array of ignore pattern objects
            titleCaseFix: {}, // Merged title case fix object
            titleCaseFixRegex: null // Regex for title case fixes
        };

        // Start with framework defaults from app.conf
        const frameworkDefaults = global.appConfig.controller?.markdown?.titleCaseFix || { 'Jpulse': 'jPulse' };
        config.titleCaseFix = { ...frameworkDefaults };

        try {
            const content = await fs.readFile(configFile, 'utf8');
            const lines = content.split('\n');
            let currentSection = null;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                // Skip empty lines and comments
                if (!line || line.startsWith('#')) {
                    continue;
                }

                // Check for section header (allow hyphens in section names)
                const sectionMatch = line.match(/^\[([\w-]+)\]$/);
                if (sectionMatch) {
                    currentSection = sectionMatch[1];
                    continue;
                }

                // Parse content based on current section
                if (currentSection === 'publish-list') {
                    // Format: filepath [optional-title]
                    // Split on whitespace (spaces or tabs), but preserve multiple spaces for title
                    // First, find where the path ends (first sequence of 2+ spaces or tab)
                    const tabIndex = line.indexOf('\t');
                    const doubleSpaceIndex = line.indexOf('  ');
                    let pathEnd = -1;
                    if (tabIndex !== -1 && doubleSpaceIndex !== -1) {
                        pathEnd = Math.min(tabIndex, doubleSpaceIndex);
                    } else if (tabIndex !== -1) {
                        pathEnd = tabIndex;
                    } else if (doubleSpaceIndex !== -1) {
                        pathEnd = doubleSpaceIndex;
                    }

                    if (pathEnd === -1) {
                        // No separator found, entire line is the path
                        const filePath = line.trim();
                        if (filePath) {
                            config.publishList.push({ path: filePath, title: null });
                        }
                    } else {
                        const filePath = line.substring(0, pathEnd).trim();
                        const title = line.substring(pathEnd).trim() || null;
                        if (filePath) {
                            config.publishList.push({ path: filePath, title: title });
                        }
                    }
                } else if (currentSection === 'ignore') {
                    // Parse ignore patterns (same syntax as old .jpulse-ignore)
                    const pattern = line;
                    // Convert glob pattern to regex
                    let regexPattern = pattern
                        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
                        .replace(/\*/g, '.*')
                        .replace(/\?/g, '.');

                    // Handle directory patterns (ending with /)
                    const isDirectory = pattern.endsWith('/');
                    if (isDirectory) {
                        regexPattern = regexPattern.slice(0, -1); // Remove trailing /
                    }

                    config.ignore.push({
                        pattern: pattern,
                        regex: new RegExp(`^${regexPattern}$`),
                        isDirectory: isDirectory
                    });
                } else if (currentSection === 'title-case-fix') {
                    // Format: from-word    to-word
                    const parts = line.split(/\s+/);
                    if (parts.length >= 2) {
                        const fromWord = parts[0];
                        const toWord = parts.slice(1).join(' ').trim();
                        config.titleCaseFix[fromWord] = toWord;
                    }
                }
                // Unknown sections are ignored gracefully
            }

            // Create regex from merged titleCaseFix
            const titleCaseKeys = Object.keys(config.titleCaseFix);
            if (titleCaseKeys.length > 0) {
                config.titleCaseFixRegex = new RegExp(`\\b(${titleCaseKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g');
            } else {
                config.titleCaseFixRegex = /(?!)/; // Never matches
            }

        } catch (error) {
            if (error.code === 'ENOENT') {
                // No config file - use defaults
                // titleCaseFix already has framework defaults
                const titleCaseKeys = Object.keys(config.titleCaseFix);
                if (titleCaseKeys.length > 0) {
                    config.titleCaseFixRegex = new RegExp(`\\b(${titleCaseKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g');
                } else {
                    config.titleCaseFixRegex = /(?!)/;
                }
            } else {
                // Error reading file - use defaults
                const titleCaseKeys = Object.keys(config.titleCaseFix);
                if (titleCaseKeys.length > 0) {
                    config.titleCaseFixRegex = new RegExp(`\\b(${titleCaseKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g');
                } else {
                    config.titleCaseFixRegex = /(?!)/;
                }
            }
        }

        // Cache the config
        docsConfigCache[baseDir] = config;
        return config;
    }

    /**
     * Check if a file or directory should be ignored
     * @param {string} relativePath - Relative path to check
     * @param {boolean} isDirectory - Whether this is a directory
     * @param {Array} ignorePatterns - Array of ignore pattern objects
     * @returns {boolean} True if should be ignored
     */
    static _shouldIgnore(relativePath, isDirectory, ignorePatterns) {
        if (!ignorePatterns || ignorePatterns.length === 0) {
            return false;
        }

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
     * @param {string} filename - Filename to extract title from
     * @param {Object} docsConfig - Docs config object (optional, for title case fixes)
     * @returns {string} Extracted title
     */
    static _extractTitle(filename, docsConfig = null) {
        let title = filename
            .replace(/\.md$/, '')
            .replace(/[-_]/g, ' ')
            .replace(/  +/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

        // Apply title case fixes if config provided
        if (docsConfig && docsConfig.titleCaseFixRegex && docsConfig.titleCaseFix) {
            title = title.replace(docsConfig.titleCaseFixRegex, (match) => docsConfig.titleCaseFix[match]);
        }

        return title.trim();
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

    /**
     * W-116: Generate markdown table of Handlebars helpers
     * Used for dynamic content: %DYNAMIC{handlebars-list-table}% (all) or %DYNAMIC{handlebars-list-table type="regular" source="jpulse"}%
     * @param {object} params - Optional parameters
     *   - type: filter by type "regular" or "block" (default: all types)
     *   - source: filter by source "jpulse", "site", or plugin name (default: all sources)
     * @returns {string} Markdown table
     * @private
     */
    static async _generateHandlebarsTable(params = {}) {
        const HandlebarController = (await import('./handlebar.js')).default;
        if (!HandlebarController || !HandlebarController.HANDLEBARS_DESCRIPTIONS) {
            return '_HandlebarController not initialized._';
        }

        let helpers = HandlebarController.HANDLEBARS_DESCRIPTIONS;

        // Filter by type if specified
        if (params.type) {
            helpers = helpers.filter(h => h.type === params.type);
        }

        // Filter by source if specified
        if (params.source) {
            helpers = helpers.filter(h => h.source === params.source);
        }

        // Sort by name
        helpers = helpers.sort((a, b) => a.name.localeCompare(b.name));

        if (helpers.length === 0) {
            return '_No helpers match the criteria._';
        }

        // Determine table title based on filters
        let tableTitle = 'Handlebars Helpers with Examples';
        if (params.type && !params.source) {
            tableTitle = params.type === 'block' ? 'Block Handlebars with Examples' : 'Regular Handlebars with Examples';
        } else if (params.source && !params.type) {
            const sourceLabel = params.source === 'jpulse' ? 'jPulse Framework' : params.source === 'site' ? 'Site' : `Plugin: ${params.source}`;
            tableTitle = `${sourceLabel} Handlebars Helpers with Examples`;
        } else if (params.type && params.source) {
            const sourceLabel = params.source === 'jpulse' ? 'jPulse Framework' : params.source === 'site' ? 'Site' : `Plugin: ${params.source}`;
            const typeLabel = params.type === 'block' ? 'Block' : 'Regular';
            tableTitle = `${sourceLabel} ${typeLabel} Handlebars Helpers with Examples`;
        }

        let md = `| ${tableTitle} | What it does |\n`;
        md += '|----------------------------------|--------------|\n';

        for (const helper of helpers) {
            const example = helper.example || `{{${helper.type === 'block' ? '#' : ''}${helper.name}}}`;
            md += `| \`${example}\` | ${helper.description} |\n`;
        }

        return md;
    }

    /**
     * W-116: Generate markdown list of Handlebars helpers
     * Used for dynamic content: %DYNAMIC{handlebars-list}% (all) or %DYNAMIC{handlebars-list type="regular" source="jpulse"}%
     * @param {object} params - Optional parameters
     *   - type: filter by type "regular" or "block" (default: all types)
     *   - source: filter by source "jpulse", "site", or plugin name (default: all sources)
     * @returns {string} Markdown list
     * @private
     */
    static async _generateHandlebarsList(params = {}) {
        const HandlebarController = (await import('./handlebar.js')).default;
        if (!HandlebarController || !HandlebarController.HANDLEBARS_DESCRIPTIONS) {
            return '_HandlebarController not initialized._';
        }

        let helpers = HandlebarController.HANDLEBARS_DESCRIPTIONS;

        // Filter by type if specified
        if (params.type) {
            helpers = helpers.filter(h => h.type === params.type);
        }

        // Filter by source if specified
        if (params.source) {
            helpers = helpers.filter(h => h.source === params.source);
        }

        // Sort by name
        helpers = helpers.sort((a, b) => a.name.localeCompare(b.name));

        if (helpers.length === 0) {
            return '_No helpers match the criteria._';
        }

        let md = '';
        for (const helper of helpers) {
            const example = helper.example || `{{${helper.type === 'block' ? '#' : ''}${helper.name}}}`;
            // Show helper syntax (e.g., {{and}} or {{#and}}) instead of just name
            const helperSyntax = `{{${helper.type === 'block' ? '#' : ''}${helper.name}}}`;
            md += `- **${helperSyntax}**: ${helper.description}, \`${example}\`\n`;
        }

        return md;
    }

    /**
     * W-129: Get themes via ThemeManager (global, or dynamic import fallback)
     * @returns {Promise<Array>} Array of theme objects
     * @private
     */
    static async _getThemes() {
        try {
            // Theme discovery requires PathResolver, which depends on appConfig.system.*.
            // If config is not ready (e.g., isolated unit tests or early bootstrap), return empty list.
            if (!global.appConfig?.system?.appDir || !global.appConfig?.system?.siteDir) {
                return [];
            }

            const ThemeManager = global.ThemeManager || (await import('../utils/theme-manager.js')).default;
            if (!ThemeManager || typeof ThemeManager.discoverThemes !== 'function') {
                return [];
            }

            // Ensure initialized (safe no-op if already initialized)
            if (!ThemeManager.themeCache && typeof ThemeManager.initialize === 'function') {
                ThemeManager.initialize({ isTest: process.env.NODE_ENV === 'test' || global.isTestEnvironment });
            }

            return ThemeManager.discoverThemes() || [];
        } catch (error) {
            LogController.logError(null, 'markdown._getThemes', `error: ${error.message}`);
            return [];
        }
    }

    /**
     * W-129: Generate markdown table of available themes
     * Used for dynamic content: %DYNAMIC{themes-list-table}%
     * @param {object} params - Optional parameters
     *   - source: filter by "framework", "plugin", or "site"
     * @returns {string} Markdown table
     * @private
     */
    static async _generateThemesTable(params = {}) {
        let themes = await MarkdownController._getThemes();

        if (params.source) {
            themes = themes.filter(t => t.source === params.source);
        }

        themes.sort((a, b) => {
            const sourceOrder = { framework: 0, plugin: 1, site: 2 };
            const sourceDiff = (sourceOrder[a.source] ?? 99) - (sourceOrder[b.source] ?? 99);
            if (sourceDiff !== 0) return sourceDiff;
            return a.name.localeCompare(b.name);
        });

        if (themes.length === 0) {
            return '_No themes match the criteria._';
        }

        let md = '| Preview | Details |\n';
        md += '|---------|---------|\n';

        for (const theme of themes) {
            const previewPath = `/themes/${theme.name}.png`;
            const preview = `[![${theme.label}](${previewPath})](${previewPath})`;

            const sourceLabel = theme.source === 'framework' ? 'Framework'
                : theme.source === 'plugin' ? `Plugin: \`${theme.pluginName || '—'}\``
                    : theme.source === 'site' ? 'Site'
                        : '—';

            const details = [
                `**\`${theme.name}\`** (${theme.label})`,
                `**Source:** ${sourceLabel}`,
                `**Author:** ${theme.author}`,
                ``,
                `${theme.description}`
            ].join('<br>');

            md += `| ${preview} | ${details} |\n`;
        }

        return md;
    }

    /**
     * W-129: Generate markdown list of available themes
     * Used for dynamic content: %DYNAMIC{themes-list}%
     * @param {object} params - Optional parameters
     *   - source: filter by "framework", "plugin", or "site"
     * @returns {string} Markdown list
     * @private
     */
    static async _generateThemesList(params = {}) {
        let themes = await MarkdownController._getThemes();

        if (params.source) {
            themes = themes.filter(t => t.source === params.source);
        }

        themes.sort((a, b) => {
            const sourceOrder = { framework: 0, plugin: 1, site: 2 };
            const sourceDiff = (sourceOrder[a.source] ?? 99) - (sourceOrder[b.source] ?? 99);
            if (sourceDiff !== 0) return sourceDiff;
            return a.name.localeCompare(b.name);
        });

        if (themes.length === 0) {
            return '_No themes match the criteria._';
        }

        let md = '';
        for (const theme of themes) {
            let source = theme.source || 'unknown';
            if(source === 'plugin') {
                source = `Plugin: ${theme.pluginName || 'unknown'}`;
            }
            const description = theme.description || '';

            md += `- **\`${theme.name}\`** (${theme.label}) : ${description} _(${source})_\n`;
        }

        return md;
    }
}

export default MarkdownController;

// EOF webapp/controller/markdown.js
