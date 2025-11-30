/**
 * @name            jPulse Framework / WebApp / Controller / Markdown
 * @tagline         Markdown controller for the jPulse Framework
 * @description     Markdown document serving with caching support, part of jPulse Framework
 * @file            webapp/controller/markdown.js
 * @version         1.3.0
 * @release         2025-11-30
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
                const content = MarkdownController._getMarkdownFile(namespace, filePath, baseDir);
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
     */
    static _getMarkdownFile(namespace, filePath, baseDir) {
        const cacheKey = `${namespace}/${filePath}`;

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
        const transformed = MarkdownController._transformMarkdownLinks(content, namespace, filePath);

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
}

export default MarkdownController;

// EOF webapp/controller/markdown.js
