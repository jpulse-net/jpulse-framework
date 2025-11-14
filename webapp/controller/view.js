/**
 * @name            jPulse Framework / WebApp / View Controller
 * @tagline         Server-side template rendering controller
 * @description     Handles .shtml files with handlebars template expansion
 * @file            webapp/controller/view.js
 * @version         1.1.6
 * @release         2025-11-14
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';
import LogController from './log.js';
import CommonUtils from '../utils/common.js';
import PathResolver from '../utils/path-resolver.js';
import cacheManager from '../utils/cache-manager.js';

class ViewController {
    // Static properties for state (like HealthController, WebSocketController)
    static templateCache = null;        // initialized by initialize()
    static viewDirectories = null;      // built by _buildViewRegistry()
    static viewRouteRE = null;          // built by _buildViewRegistry()
    static spaCache = new Map();        // built by _buildViewRegistry()

    /**
     * Initialize view controller
     */
    static async initialize() {
        // Initialize template cache
        const templateCacheConfig = global.appConfig.controller.view.cacheTemplates || { enabled: true };

        // In test mode, disable caching to prevent hanging
        if (process.env.NODE_ENV === 'test' || global.isTestEnvironment) {
            templateCacheConfig.enabled = false; // Disable caching in tests
        }

        this.templateCache = cacheManager.register(templateCacheConfig, 'TemplateCache');

        // Build view registry
        this._buildViewRegistry();
        LogController.logInfo(null, 'view.initialize',
            `View registry: [${this.viewDirectories.join(', ')}], regex: ${this.viewRouteRE}`);
    }

    static getViewList() {
        return this.viewDirectories;
    }

    static getViewRouteRE() {
        return this.viewRouteRE;
    }

    static isSPA(namespace) {
        if (this.spaCache.has(namespace)) {
            return this.spaCache.get(namespace);
        }

        let result = false;
        try {
            const relativePath = `view/${namespace}/index.shtml`;
            const indexPath = PathResolver.resolveModule(relativePath);
            // Use ViewController's own templateCache
            const content = this.templateCache?.getFileSync(indexPath);

            if (content) {
                result = (
                    content.includes('/vue-router.min.js') ||
                    content.includes('/vue-router.js') ||
                    content.includes('VueRouter.createRouter') ||
                    (content.includes('history.pushState') && content.includes('popstate'))
                );
            }
        } catch {
            result = false;
        }

        this.spaCache.set(namespace, result);
        return result;
    }

    /**
     * Get health status (standardized format)
     * Returns hard-coded English message (like HealthController)
     * @returns {object} Health status object
     */
    static getHealthStatus() {
        const isConfigured = this.templateCache !== null && this.viewDirectories !== null;

        const cacheStats = {
            template: this.templateCache ? this.templateCache.getStats() : {
                name: 'TemplateCache',
                fileCount: 0,
                directoryCount: 0,
                config: { enabled: false }
            }
        };
        const templateCacheStats = cacheStats.template || {};

        return {
            status: isConfigured ? 'ok' : 'not_configured',
            configured: isConfigured,
            message: isConfigured ? '' : 'ViewController not initialized', // Hard-coded English
            details: isConfigured ? {
                viewDirectories: this.viewDirectories?.length || 0,
                viewDirectoriesList: this.viewDirectories || [],
                templateCache: {
                    enabled: templateCacheStats.config?.enabled || false,
                    fileCount: templateCacheStats.fileCount || 0,
                    directoryCount: templateCacheStats.directoryCount || 0
                }
            } : {} // Empty object instead of null for easier parsing
            // Note: timestamp is added by HealthController._addComponentHealthStatuses()
        };
    }

    /**
     * Refresh view directory registry (W-079 pattern)
     * Called via cache refresh API
     */
    static async refreshViewRegistry() {
        LogController.logInfo(null, 'view.refreshViewRegistry',
            'Refreshing view directory registry');

        this._buildViewRegistry();

        // Update global reference for routes.js
        global.viewRegistry = {
            viewList: this.viewDirectories,
            viewRouteRE: this.viewRouteRE
        };

        LogController.logInfo(null, 'view.refreshViewRegistry',
            `Updated registry: [${this.viewDirectories.join(', ')}]`);

        return {
            success: true,
            viewDirectories: this.viewDirectories,
            note: 'Express router still uses old regex - full benefit requires app restart'
        };
    }

    /**
     * Refresh SPA cache for a given namespace
     * @param {string} namespace - Namespace to refresh
     */
    static refreshSpaCache(namespace) {
        if (namespace) {
            this.spaCache.delete(namespace);
            LogController.logInfo(null, 'view.refreshSpaCache',
                `Cleared SPA cache for namespace: ${namespace}`);
        } else {
            this.spaCache.clear();
            LogController.logInfo(null, 'view.refreshSpaCache',
                'Cleared all SPA cache entries');
        }
    }

    /**
     * Load and render .shtml template files with handlebars expansion
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async load(req, res) {
        const startTime = Date.now();

        try {
            // Log the request
            LogController.logRequest(req, 'view.load', req.path);

            // Determine the file path
            let filePath = req.path;
            const defaultTemplate = global.appConfig?.controller?.view?.defaultTemplate || 'index.shtml';
            if (filePath === '/') {
                filePath = `/home/${defaultTemplate}`;
            } else if (filePath.endsWith('/')) {
                // Only append default template for directory requests (ending with /)
                filePath = filePath + defaultTemplate;
            }

            // SPA sub-route detection for namespace-based routing, such as:
            // - /jpulse-docs/api-reference    => /jpulse-docs/index.shtml
            // - /jpulse-docs/non-existing/doc => /jpulse-docs/index.shtml
            // - /hello-vue/todo-demo          => /hello-vue/index.shtml
            // - /hello-websocket/#emoji       => /hello-websocket/index.shtml
            const pathParts = filePath.split('/').filter(p => p);
            if (pathParts.length > 1 && !filePath.endsWith('.shtml')) {
                const namespace = pathParts[0];
                if (this.isSPA(namespace)) {
                    filePath = `/${namespace}/index.shtml`;
                    LogController.logInfo(req, 'view.load',
                        `SPA sub-route detected: ${req.path} → ${filePath}`);
                }
            }

            // W-014: Use PathResolver to support site overrides (now imported at module level)
            let fullPath;
            let isTemplateFile = false; // Track if we're serving a template file
            const originalFilePath = filePath; // Keep original for content type detection

            try {
                // Try to resolve with site override support
                const relativePath = `view${filePath}`;
                fullPath = PathResolver.resolveModule(relativePath);
            } catch (error) {
                // Try .tmpl fallback for CSS and JS files (W-047 site-common files)
                const fileExtension = path.extname(filePath).toLowerCase();
                if (fileExtension === '.css' || fileExtension === '.js') {
                    try {
                        const templatePath = `view${filePath}.tmpl`;
                        fullPath = PathResolver.resolveModule(templatePath);
                        isTemplateFile = true; // Mark as template file for content type handling
                    } catch (templateError) {
                        // Template fallback failed, continue with original error handling
                    }
                }

                if (!fullPath) {
                    // File not found in either site or framework
                    const originalPath = req.path;
                    res.statusCode = 404; // Set 404 status code
                    LogController.logError(req, 'view.load', `error: File not found: ${filePath}`);
                    const message = global.i18n.translate(req, 'controller.view.pageNotFoundError', { path: originalPath });

                    // Override filePath to error page and try to resolve it
                    filePath = '/error/index.shtml';
                    try {
                        fullPath = PathResolver.resolveModule(`view${filePath}`);
                    } catch (errorPageError) {
                        // Fallback to framework error page if site override doesn't exist
                        fullPath = path.join(global.appConfig.system.appDir, 'view', filePath.substring(1));
                    }
                    req.query = { // Create a new query object for the context
                        code: '404',
                        msg: message
                    };
                    // No 'return' here, let the rest of the function execute to render the error page
                }
            }

            // W-079: Read template file using simplified cache
            let content = this.templateCache.getFileSync(fullPath);

            // Preprocess i18n handlebars first (only {{i18n.}} expressions),
            // because it may return content with new handlebars
            content = global.i18n.expandI18nHandlebars(req, content);

            // W-088: Use HandlebarController to expand handlebars (context built internally)
            content = await global.HandlebarController.expandHandlebars(req, content, {}, 0);

            // Send response with appropriate content type
            // Use original file path for content type detection when serving template files
            const pathForContentType = isTemplateFile ? originalFilePath : filePath;
            const fileExtension = path.extname(pathForContentType).toLowerCase();
            let contentType = 'text/html';

            if (fileExtension === '.css') {
                contentType = 'text/css';
            } else if (fileExtension === '.js') {
                contentType = 'application/javascript';
            } else if (fileExtension === '.tmpl') {
                contentType = 'text/html';
            } // no other content types here, regular files are in webapp/static directory

            res.set('Content-Type', contentType);
            res.send(content);

            // Log completion time only on success
            const duration = Date.now() - startTime;
            let err = '';
            if (filePath.match(/^\/error\/.*\.shtml$/)) {
                err = `, ${req.query?.msg || ''}`;
            }
            LogController.logInfo(req, 'view.load', `${req.path}${err}, completed in ${duration}ms`);

        } catch (error) {
            LogController.logError(req, 'view.load', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.view.internalServerError', { error: error.message });
            return CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR');
        }
    }


    static _buildViewRegistry() {
        const frameworkViewPath = path.join(global.appConfig.system.appDir, 'view');
        const siteViewPath = path.join(global.appConfig.system.siteDir, 'view');

        const frameworkDirs = this._scanViewDir(frameworkViewPath);
        const siteDirs = this._scanViewDir(siteViewPath);

        const viewSet = new Set([...siteDirs, ...frameworkDirs]);
        this.viewDirectories = Array.from(viewSet).sort();
        this.viewRouteRE = new RegExp('^/(' + this.viewDirectories.join('|') + ')/'); // no $ at end
    }

    static _scanViewDir(dirPath) {
        try {
            return fs.readdirSync(dirPath, { withFileTypes: true })
                .filter(entry => entry.isDirectory())
                .map(entry => entry.name);
        } catch {
            return [];
        }
    }

}

export default ViewController;  // Export the CLASS (not instance)

// EOF webapp/controller/view.js
