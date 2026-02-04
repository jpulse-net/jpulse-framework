/**
 * @name            jPulse Framework / WebApp / View Controller
 * @tagline         Server-side template rendering controller
 * @description     Handles .shtml files with handlebars template expansion
 * @file            webapp/controller/view.js
 * @version         1.6.7
 * @release         2026-02-04
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
import CounterManager from '../utils/time-based-counters.js';

class ViewController {
    // Static properties for state (like HealthController, WebSocketController)
    static templateCache = null;        // initialized by initialize()
    static viewDirectories = null;      // built by _buildViewRegistry()
    static viewRouteRE = null;          // built by _buildViewRegistry()
    static spaCache = new Map();        // built by _buildViewRegistry()

    // Time-based counters for metrics by file extension (W-112)
    static cssCounter = CounterManager.getCounter('view', 'css');
    static jsCounter = CounterManager.getCounter('view', 'js');
    static tmplCounter = CounterManager.getCounter('view', 'tmpl');
    static shtmlCounter = CounterManager.getCounter('view', 'shtml');

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

        // Register metrics provider (W-112)
        try {
            const MetricsRegistry = (await import('../utils/metrics-registry.js')).default;
            MetricsRegistry.register('view', () => ViewController.getMetrics(), {
                async: false,
                category: 'controller'
            });
        } catch (error) {
            // MetricsRegistry might not be available yet
            LogController.logWarning(null, 'view.initialize', `Failed to register metrics provider: ${error.message}`);
        }
    }

    static getViewList() {
        return this.viewDirectories;
    }

    static getViewRouteRE() {
        return this.viewRouteRE;
    }

    /**
     * Get view controller metrics (W-112)
     * @returns {Object} Component metrics with standardized structure
     */
    static getMetrics() {
        const isConfigured = this.templateCache !== null && this.viewDirectories !== null;
        const templateCacheStats = this.templateCache ? this.templateCache.getStats() : {
            name: 'TemplateCache',
            fileCount: 0,
            directoryCount: 0,
            config: { enabled: false }
        };
        const viewStats = CounterManager.getGroupStats('view');

        return {
            component: 'ViewController',
            status: isConfigured ? 'ok' : 'error',
            initialized: isConfigured,
            stats: {
                configured: isConfigured,
                viewDirectories: this.viewDirectories?.length || 0,
                viewDirectoriesList: this.viewDirectories || [],
                cachedFiles: templateCacheStats.fileCount || 0,
                servedLast24h:
                    (viewStats.css?.last24h || 0) +
                    (viewStats.js?.last24h || 0) +
                    (viewStats.tmpl?.last24h || 0) +
                    (viewStats.shtml?.last24h || 0),
                templateCache: {
                    enabled: templateCacheStats.config?.enabled || false,
                    fileCount: templateCacheStats.fileCount || 0,
                    directoryCount: templateCacheStats.directoryCount || 0
                },
                pagesServedLastHour: {
                    css: viewStats.css?.lastHour || 0,
                    js: viewStats.js?.lastHour || 0,
                    tmpl: viewStats.tmpl?.lastHour || 0,
                    shtml: viewStats.shtml?.lastHour || 0
                },
                pagesServedLast24h: {
                    css: viewStats.css?.last24h || 0,
                    js: viewStats.js?.last24h || 0,
                    tmpl: viewStats.tmpl?.last24h || 0,
                    shtml: viewStats.shtml?.last24h || 0
                },
                pagesServedTotal: {
                    css: viewStats.css?.total || 0,
                    js: viewStats.js?.total || 0,
                    tmpl: viewStats.tmpl?.total || 0,
                    shtml: viewStats.shtml?.total || 0
                }
            },
            meta: {
                ttl: 60000,  // 1 minute - view registry doesn't change often
                category: 'controller',
                fields: {
                    'configured': {
                        aggregate: 'first'  // Same across instances
                    },
                    'viewDirectories': {
                        aggregate: 'first'  // Same across instances
                    },
                    'viewDirectoriesList': {
                        aggregate: false,   // Complex array, don't aggregate
                        visualize: false   // Hide from UI (too verbose)
                    },
                    'cachedFiles': {
                        aggregate: 'sum'  // Sum across instances
                    },
                    'servedLast24h': {
                        aggregate: 'sum'  // Sum across instances
                    },
                    'templateCache': {
                        aggregate: false,   // Complex object, don't aggregate
                        fields: {
                            'enabled': {
                                aggregate: 'first'
                            },
                            'fileCount': {
                                aggregate: 'sum'  // Sum across instances
                            },
                            'directoryCount': {
                                aggregate: 'sum'  // Sum across instances
                            }
                        }
                    },
                    'pagesServedLastHour': {
                        aggregate: false,   // Complex object, don't aggregate
                        fields: {
                            'css': { aggregate: 'sum' },
                            'js': { aggregate: 'sum' },
                            'tmpl': { aggregate: 'sum' },
                            'shtml': { aggregate: 'sum' }
                        }
                    },
                    'pagesServedLast24h': {
                        aggregate: false,   // Complex object, don't aggregate
                        fields: {
                            'css': { aggregate: 'sum' },
                            'js': { aggregate: 'sum' },
                            'tmpl': { aggregate: 'sum' },
                            'shtml': { aggregate: 'sum' }
                        }
                    },
                    'pagesServedTotal': {
                        aggregate: false,   // Complex object, don't aggregate
                        fields: {
                            'css': { aggregate: 'sum' },
                            'js': { aggregate: 'sum' },
                            'tmpl': { aggregate: 'sum' },
                            'shtml': { aggregate: 'sum' }
                        }
                    }
                }
            },
            timestamp: new Date().toISOString()
        };
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
                    content.includes('jPulse.UI.docs.init') || // W-104: Docs viewer uses SPA routing
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
        const viewConfig = global.appConfig?.controller?.view || {};

        try {
            // Log the request
            LogController.logRequest(req, 'view.load', req.path);

            // Determine the file path
            let filePath = req.path;
            const defaultTemplate = viewConfig.defaultTemplate || 'index.shtml';
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
            let content;

            try {
                const relativePath = `view${filePath}`;
                const fileExtension = path.extname(filePath).toLowerCase();

                // W-098: Append mode for .js and .css files
                if (fileExtension === '.js' || fileExtension === '.css') {
                    const allFiles = PathResolver.collectAllFiles(relativePath);

                    if (allFiles.length > 0) {
                        // Concatenate all matching files (framework + site + plugins)
                        const contents = allFiles.map(file => this.templateCache.getFileSync(file));
                        content = contents.join('\n');
                        fullPath = allFiles[0]; // Use first file for logging
                        LogController.logInfo(req, 'view.load',
                            `Append mode: concatenated ${allFiles.length} file(s) for ${filePath}`);
                    }
                    // Note: No .tmpl fallback for .js or .css files (W-098)
                    // Use .js.tmpl and .css.tmpl only as reference templates to copy
                } else {
                    // Regular file resolution (replace mode)
                    // W-045: Use plugin-aware resolver (site > plugins > framework)
                    fullPath = PathResolver.resolveModuleWithPlugins(relativePath);
                }

                if (!fullPath && !content) {
                    // File not found in either site or framework
                    const originalPath = req.path;
                    res.statusCode = 404; // Set 404 status code
                    LogController.logError(req, 'view.load', `error: File not found: ${filePath}`);
                    const message = global.i18n.translate(req, 'controller.view.pageNotFoundError', { path: originalPath });

                    // Override filePath to error page and resolve with plugin support
                    filePath = '/error/index.shtml';
                    try {
                        // W-045: Use plugin-aware resolver (site > plugins > framework)
                        fullPath = PathResolver.resolveModuleWithPlugins(`view${filePath}`);
                    } catch (errorPageError) {
                        // This should never fail as framework provides error page
                        fullPath = path.join(global.appConfig.system.appDir, 'view', filePath.substring(1));
                    }
                    req.query = { // Create a new query object for the context
                        code: '404',
                        msg: message
                    };
                    // No 'return' here, let the rest of the function execute to render the error page
                }
            } catch (error) {
                // Handle unexpected errors
                const originalPath = req.path;
                res.statusCode = 404;
                LogController.logError(req, 'view.load', `error: File not found: ${filePath}`);
                const message = global.i18n.translate(req, 'controller.view.pageNotFoundError', { path: originalPath });

                filePath = '/error/index.shtml';
                try {
                    // W-045: Use plugin-aware resolver (site > plugins > framework)
                    fullPath = PathResolver.resolveModuleWithPlugins(`view${filePath}`);
                } catch (errorPageError) {
                    // This should never fail as framework provides error page
                    fullPath = path.join(global.appConfig.system.appDir, 'view', filePath.substring(1));
                }
                req.query = {
                    code: '404',
                    msg: message
                };
            }

            // W-079: Read template file using simplified cache (if not already read in append mode)
            // For binary/static assets (e.g., theme previews), do NOT run i18n/Handlebars expansion
            // and do NOT read via template cache (it reads UTF-8 and would corrupt binary files).
            const rawFileExtension = path.extname(filePath).toLowerCase();
            const binaryExtensions = new Set(viewConfig.rawExtensions?.binary ||
                                             [ '.gif', '.ico', '.jpg', '.jpeg', '.png', '.webp' ]);
            // JSON should be served raw (no Handlebars expansion) to avoid accidental variable expansion/leaks.
            // SVG is treated like other text assets (similar to .css/.js): it can be processed if desired.
            const rawTextExtensions = new Set(viewConfig.rawExtensions?.text ||  [ '.json' ]);

            if (fullPath && (binaryExtensions.has(rawFileExtension) || rawTextExtensions.has(rawFileExtension))) {
                let rawContentType = viewConfig.contentTypes?.[rawFileExtension] ||  'application/octet-stream';
                res.set('Content-Type', rawContentType);

                // Send raw bytes for binary assets; send UTF-8 text for JSON/SVG.
                if (binaryExtensions.has(rawFileExtension)) {
                    const buffer = fs.readFileSync(fullPath);
                    res.send(buffer);
                } else {
                    const text = fs.readFileSync(fullPath, 'utf8');
                    res.send(text);
                }

                // Log completion time only on success
                const duration = Date.now() - startTime;
                LogController.logInfo(req, 'view.load', `${req.path}, completed in ${duration}ms`);
                return;
            }

            if (!content) {
                content = this.templateCache.getFileSync(fullPath);
            }

            // Preprocess i18n handlebars first (only {{i18n.}} expressions),
            // because it may return content with new handlebars
            content = global.i18n.expandI18nHandlebars(req, content);

            // W-088: Use HandlebarController to expand handlebars (context built internally)
            content = await global.HandlebarController.expandHandlebars(req, content, {}, 0);

            // Send response with appropriate content type
            // Use original file path for content type detection when serving template files
            const pathForContentType = isTemplateFile ? originalFilePath : filePath;
            const fileExtension = path.extname(pathForContentType).toLowerCase();
            // Set content type and increment counter by file extension (W-112)
            switch (fileExtension) {
                case '.css':
                    this.cssCounter.increment();
                    break;
                case '.js':
                    this.jsCounter.increment();
                    break;
                case '.tmpl':
                    this.tmplCounter.increment();
                    break;
                case '.shtml':
                    this.shtmlCounter.increment();
                    break;
            }
            let contentType = viewConfig.contentTypes?.[fileExtension] ||  'text/html';
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
        // W-045: Use PathResolver for all directory discovery (separation of concerns)
        this.viewDirectories = PathResolver.getAllViewDirectories();
        this.viewRouteRE = new RegExp('^/(' + this.viewDirectories.join('|') + ')/'); // no $ at end
    }

}

export default ViewController;  // Export the CLASS (not instance)

// EOF webapp/controller/view.js
