/**
 * @name            jPulse Framework / WebApp / Controller / Markdown
 * @tagline         Markdown controller for the jPulse Framework
 * @description     Markdown document serving with caching support, part of jPulse Framework
 * @file            webapp/controller/markdown.js
 * @version         0.5.3
 * @release         2025-09-08
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import fs from 'fs/promises';
import path from 'path';
import LogController from './log.js';
import CommonUtils from '../utils/common.js';

// Module-level cache (similar to view controller)
const cache = {
    markdownFiles: {},
    fileTimestamp: {},
    directoryListing: {}
};

class MarkdownController {

    /**
     * API endpoint: /api/1/markdown/namespace/path/to/file.md
     * Lists directory or serves specific markdown file
     */
    static async api(req, res) {
        const startTime = Date.now();

        try {
            // Parse path: /api/1/markdown/jpulse/dev/README.md
            const pathParts = req.path.replace('/api/1/markdown/', '').split('/');
            const namespace = pathParts[0];
            const filePath = pathParts.slice(1).join('/');

            if (!namespace) {
                return CommonUtils.sendError(req, res, 400, 'Namespace required');
            }

            // Determine base directory
            const baseDir = await MarkdownController._getNamespaceDirectory(namespace);
            if (!baseDir) {
                return CommonUtils.sendError(req, res, 404, 'Namespace not found');
            }

            // List directory or serve file
            if (!filePath || filePath === '') {
                const listing = await MarkdownController._getDirectoryListing(namespace, baseDir);
                return res.json({ files: listing });
            } else {
                const content = await MarkdownController._getMarkdownFile(namespace, filePath, baseDir);
                return res.json({ content, path: filePath });
            }

        } catch (error) {
            LogController.logError(req, `markdown.api: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Markdown service error');
        } finally {
            const duration = Date.now() - startTime;
            LogController.logInfo(req, `markdown.api: Completed in ${duration}ms`);
        }
    }

    /**
     * Get namespace directory with jpulse special handling
     */
    static async _getNamespaceDirectory(namespace) {
        if (namespace === 'jpulse') {
            // Special case: jpulse maps to webapp/static/assets/jpulse/
            return path.join(global.appConfig.app.dirName, 'static/assets/jpulse');
        } else {
            // Site namespaces: site/webapp/static/assets/{namespace}/
            const webappDir = global.appConfig.app.dirName;
            const projectRoot = path.dirname(webappDir);
            const siteDir = path.join(projectRoot, 'site/webapp/static/assets', namespace);

            // Verify directory exists
            try {
                await fs.access(siteDir);
                return siteDir;
            } catch {
                return null;
            }
        }
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

        const files = await MarkdownController._scanMarkdownFiles(baseDir);

        // Cache if enabled
        if (global.appConfig.controller?.markdown?.cache) {
            cache.directoryListing[cacheKey] = files;
        }

        return files;
    }

    /**
     * Get markdown file content with caching
     */
    static async _getMarkdownFile(namespace, filePath, baseDir) {
        const cacheKey = `${namespace}/${filePath}`;

        // Security: prevent path traversal
        if (filePath.includes('..') || filePath.startsWith('/')) {
            throw new Error('Invalid file path');
        }

        const fullPath = path.join(baseDir, filePath);

        // Check cache if enabled
        if (global.appConfig.controller?.markdown?.cache && cache.markdownFiles[cacheKey]) {
            return cache.markdownFiles[cacheKey];
        }

        // Read file
        const content = await fs.readFile(fullPath, 'utf8');

        // Cache if enabled
        if (global.appConfig.controller?.markdown?.cache) {
            cache.markdownFiles[cacheKey] = content;

            // Cache timestamp for potential invalidation
            const stats = await fs.stat(fullPath);
            cache.fileTimestamp[cacheKey] = stats.mtime.valueOf();
        }

        return content;
    }

    /**
     * Recursively scan directory for .md files
     */
    static async _scanMarkdownFiles(dir, relativePath = '') {
        const files = [];
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relPath = path.join(relativePath, entry.name);

            if (entry.isDirectory()) {
                const subFiles = await MarkdownController._scanMarkdownFiles(fullPath, relPath);
                files.push(...subFiles);
            } else if (entry.name.endsWith('.md')) {
                files.push({
                    path: relPath,
                    name: entry.name,
                    title: MarkdownController._extractTitle(entry.name)
                });
            }
        }

        return files.sort((a, b) => a.path.localeCompare(b.path));
    }

    /**
     * Extract readable title from filename
     */
    static _extractTitle(filename) {
        return filename
            .replace(/\.md$/, '')
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }
}

export default MarkdownController;

// EOF webapp/controller/markdown.js
