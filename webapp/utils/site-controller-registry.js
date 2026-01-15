/**
 * @name            jPulse Framework / WebApp / Utils / Site Controller Registry
 * @tagline         Site Controller Registry and Auto-Discovery
 * @description     Discovers and registers site controller APIs at startup (W-014)
 * @file            webapp/utils/site-controller-registry.js
 * @version         1.4.15
 * @release         2026-01-15
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import LogController from '../controller/log.js';
import AuthController from '../controller/auth.js';
import UserModel from '../model/user.js';

/**
 * Site Controller Registry for Auto-Discovery (W-014)
 *
 * Discovers controllers at startup and creates API routes automatically.
 * No manual route registration needed - "don't make me think" principle.
 */
class SiteControllerRegistry {

    static registry = {
        controllers: new Map(),
        lastScan: null,
        scanPath: null
    };

    /**
     * Initialize the site controller registry at app startup
     * Scans controllers, calls initialize() methods, and returns stats
     * @returns {Object} Registry information
     */
    static async initialize() {
        try {
            // Scan site controllers (W-014)
            const siteControllerDir = path.join(global.appConfig.system.siteDir, 'controller');
            this.registry.scanPath = siteControllerDir;

            if (fs.existsSync(siteControllerDir)) {
                await this._scanControllers(siteControllerDir, 'site');
            } else {
                LogController.logInfo(null, 'site-controller-registry', 'Site controller directory not found - no site overrides to register');
            }

            // Register metrics provider (W-112)
            const MetricsRegistry = (await import('./metrics-registry.js')).default;
            MetricsRegistry.register('controllers', () => SiteControllerRegistry.getMetrics(), {
                async: false,
                category: 'util'
            });

            // W-045: Scan plugin controllers (if PluginManager is available)
            if (global.PluginManager && global.PluginManager.initialized) {
                const activePlugins = global.PluginManager.getActivePlugins();
                for (const plugin of activePlugins) {
                    const pluginControllerDir = path.join(plugin.path, 'webapp', 'controller');
                    if (fs.existsSync(pluginControllerDir)) {
                        await this._scanControllers(pluginControllerDir, `plugin:${plugin.name}`);
                    }
                }
            }

            // Initialize all discovered controllers
            const initializedCount = await this._initializeControllers();

            const controllerCount = this.registry.controllers.size;
            const apiCount = Array.from(this.registry.controllers.values())
                .reduce((sum, c) => sum + c.apiMethods.length, 0);

            LogController.logInfo(null, 'site-controller-registry',
                `Discovered ${controllerCount} controller(s), ${initializedCount} initialized, ${apiCount} API method(s)`);

            return {
                controllers: controllerCount,
                apis: apiCount,
                initialized: initializedCount
            };

        } catch (error) {
            LogController.logError(null, 'site-controller-registry', `Site controller registry initialization failed: ${error.message}`);
            return { controllers: 0, apis: 0, initialized: 0, error: error.message };
        }
    }

    /**
     * Scan a single controller file and analyze its API methods
     * @param {string} controllerPath - Full path to controller file
     * @param {string} controllerName - Name of the controller
     * @param {string} source - Source identifier (e.g., 'framework', 'site', 'plugin:hello-world')
     */
    static async _scanController(controllerPath, controllerName, source = 'site') {
        try {
            const content = fs.readFileSync(controllerPath, 'utf8');

            // W-108: Check for static routes first (takes precedence over api* discovery)
            const staticRoutes = this._detectStaticRoutes(content);
            let apiMethods;

            if (staticRoutes.length > 0) {
                // Use static routes - these define custom paths and HTTP methods
                apiMethods = staticRoutes;
                LogController.logInfo(null, 'site-controller-registry',
                    `${source} controller ${controllerName}: using ${staticRoutes.length} static route(s)`);
            } else {
                // Fall back to api* method discovery
                apiMethods = this._detectApiMethods(content);
            }

            const hasInitialize = /\bstatic\s+(?:async\s+)?initialize\(/.test(content);

            // W-045: Use unique key for plugins to avoid collisions, but keep framework/site controllers simple
            const registryKey = source.startsWith('plugin:')
                ? `${source.split(':')[1]}:${controllerName}`
                : controllerName;

            this.registry.controllers.set(registryKey, {
                name: controllerName,
                path: controllerPath,
                apiMethods,
                hasStaticRoutes: staticRoutes.length > 0,  // W-108: Track if using static routes
                hasInitialize,
                relativePath: `controller/${path.basename(controllerPath)}`,
                source,  // W-045: Track source (framework, site, or plugin)
                registeredAt: new Date().toISOString()
            });

            if (source !== 'site') {
                LogController.logInfo(null, 'site-controller-registry',
                    `Registered ${source} controller: ${controllerName} with ${apiMethods.length} API methods`);
            }

        } catch (error) {
            LogController.logError(null, 'site-controller-registry', `Failed to analyze controller ${controllerName} from ${source}: ${error.message}`);
        }
    }

    /**
     * Scan controllers directory and analyze their API methods
     * @param {string} controllerDir - Path to controller directory
     * @param {string} source - Source identifier (e.g., 'site', 'plugin:hello-world')
     */
    static async _scanControllers(controllerDir, source = 'site') {
        const files = fs.readdirSync(controllerDir)
            .filter(file => file.endsWith('.js'));

        for (const file of files) {
            const controllerName = path.basename(file, '.js');
            const controllerPath = path.join(controllerDir, file);
            await this._scanController(controllerPath, controllerName, source);
        }

        this.registry.lastScan = new Date().toISOString();
    }

    /**
     * Detect static routes array in controller source code (W-108)
     * Format: static routes = [ { method: 'GET', path: '/api/1/...', handler: 'methodName' }, ... ]
     * @param {string} content - Controller file content
     * @returns {Array} Array of { name, method, fullPath } objects, or empty if not found
     */
    static _detectStaticRoutes(content) {
        const routes = [];

        // Match: static routes = [ ... ];
        const routesMatch = content.match(/\bstatic\s+routes\s*=\s*\[([\s\S]*?)\];/);
        if (!routesMatch) {
            return routes;
        }

        const routesContent = routesMatch[1];

        // Parse each route object: { method: '...', path: '...', handler: '...' }
        const routeRegex = /\{\s*method\s*:\s*['"](\w+)['"]\s*,\s*path\s*:\s*['"]([^'"]+)['"]\s*,\s*handler\s*:\s*['"](\w+)['"](?:\s*,\s*auth\s*:\s*['"](\w+)['"])?\s*\}/g;
        let match;

        while ((match = routeRegex.exec(routesContent)) !== null) {
            const httpMethod = match[1].toLowerCase();
            const fullPath = match[2];
            const handlerName = match[3];
            const authLevel = match[4] || 'user';  // Default to 'user' if not specified

            routes.push({
                name: handlerName,
                method: httpMethod,
                fullPath: fullPath,  // Full custom path (not pathSuffix)
                authLevel: authLevel
            });
        }

        return routes;
    }

    /**
     * Detect API methods in controller source code
     * @param {string} content - Controller file content
     * @returns {Array} Array of { name, method, path } objects
     */
    static _detectApiMethods(content) {
        const apiMethods = [];

        // Regex to match: static async apiMethodName( or static apiMethodName(
        const methodRegex = /\bstatic\s+(?:async\s+)?(api(?:[A-Z]\w*)?)\s*\(/g;
        let match;

        while ((match = methodRegex.exec(content)) !== null) {
            const methodName = match[1];

            // Determine HTTP method and path from method name
            const { httpMethod, pathSuffix } = this._inferHttpMethodAndPath(methodName);

            apiMethods.push({
                name: methodName,
                method: httpMethod,
                pathSuffix: pathSuffix
            });
        }

        return apiMethods;
    }

    /**
     * Infer HTTP method and path suffix from API method name
     * @param {string} methodName - API method name (e.g., 'api', 'apiCreate', 'apiGetById')
     * @returns {Object} { httpMethod, pathSuffix }
     */
    static _inferHttpMethodAndPath(methodName) {
        // Base 'api' method -> GET /api/1/controllerName
        if (methodName === 'api') {
            return { httpMethod: 'get', pathSuffix: '' };
        }

        // Remove 'api' prefix
        const action = methodName.replace(/^api/, '');

        // Common CRUD patterns
        const patterns = [
            { regex: /^Create$/i, method: 'post', suffix: '' },
            { regex: /^Update$/i, method: 'put', suffix: '/:id' },
            { regex: /^Delete$/i, method: 'delete', suffix: '/:id' },
            { regex: /^Get$/i, method: 'get', suffix: '/:id' },
            { regex: /^GetById$/i, method: 'get', suffix: '/:id' },
            { regex: /^List$/i, method: 'get', suffix: '' },
            { regex: /^Search$/i, method: 'get', suffix: '/search' },
            { regex: /^Stats$/i, method: 'get', suffix: '/stats' },
            { regex: /^Toggle$/i, method: 'put', suffix: '/:id/toggle' },
            { regex: /^Activate$/i, method: 'put', suffix: '/:id/activate' },
            { regex: /^Deactivate$/i, method: 'put', suffix: '/:id/deactivate' }
        ];

        // Check patterns
        for (const pattern of patterns) {
            if (pattern.regex.test(action)) {
                return { httpMethod: pattern.method, pathSuffix: pattern.suffix };
            }
        }

        // Default: convert camelCase to kebab-case path, POST method
        const kebabPath = '/' + action
            .replace(/([A-Z])/g, '-$1')
            .toLowerCase()
            .replace(/^-/, '');

        return { httpMethod: 'get', pathSuffix: kebabPath };
    }

    /**
     * Initialize controllers that have initialize() method
     * @returns {number} Count of initialized controllers
     */
    static async _initializeControllers() {
        let count = 0;

        for (const [name, controller] of this.registry.controllers) {
            if (controller.hasInitialize) {
                try {
                    const ControllerClass = await this._loadController(name);
                    if (typeof ControllerClass.initialize === 'function') {
                        await ControllerClass.initialize();
                        count++;
                        LogController.logInfo(null, 'site-controller-registry', `Initialized controller: ${name}`);
                    }
                } catch (error) {
                    LogController.logError(null, 'site-controller-registry', `Failed to initialize ${name}: ${error.message}`);
                }
            }
        }

        return count;
    }

    /**
     * Middleware to load full user object for authenticated requests
     * Sets req.user with full user data from database
     * @param {object} req - Express request
     * @param {object} res - Express response
     * @param {function} next - Next middleware
     */
    static async _loadFullUserMiddleware(req, res, next) {
        try {
            const userId = req.session?.user?.id;
            if (userId) {
                req.user = await UserModel.findById(userId);
            }
            next();
        } catch (error) {
            LogController.logError(req, 'site-controller-registry._loadFullUserMiddleware',
                `Error loading user: ${error.message}`);
            next(); // Continue even if user load fails - handler can check req.user
        }
    }

    /**
     * Load a site controller dynamically
     * @param {string} name - Controller name
     * @returns {Object} Controller class
     */
    static async _loadController(name) {
        const controller = this.registry.controllers.get(name);
        if (!controller) {
            throw new Error(`Site controller not found: ${name}`);
        }

        const fileUrl = pathToFileURL(controller.path).href;
        return (await import(fileUrl)).default;
    }

    /**
     * Register dynamic API routes for discovered controllers
     * @param {Object} router - Express router instance
     * @returns {number} Number of routes registered
     */
    static registerApiRoutes(router) {
        let routeCount = 0;

        for (const [registryKey, controller] of this.registry.controllers) {
            if (controller.apiMethods.length === 0) continue;

            // W-045: Use actual controller name for URL, not the registry key
            // Registry key might be 'hello-world:helloPlugin', but URL should be '/api/1/helloPlugin'
            const basePath = `/api/1/${controller.name}`;

            // W-108: Determine path based on whether using static routes or auto-discovered
            const getRoutePath = (apiMethod) => {
                // Static routes have fullPath, auto-discovered have pathSuffix
                return apiMethod.fullPath || (basePath + apiMethod.pathSuffix);
            };

            // Sort API methods: specific routes (no :id) before parameterized routes
            // This ensures /search matches before /:id matches "search"
            const sortedMethods = [...controller.apiMethods].sort((a, b) => {
                const aPath = getRoutePath(a);
                const bPath = getRoutePath(b);
                const aHasParam = aPath.includes(':');
                const bHasParam = bPath.includes(':');
                // If one has params and the other doesn't, put the one without params first
                if (aHasParam && !bHasParam) return 1;
                if (!aHasParam && bHasParam) return -1;
                // If both have params or both don't, maintain original order
                return 0;
            });

            for (const apiMethod of sortedMethods) {
                const fullPath = getRoutePath(apiMethod);
                const httpMethod = apiMethod.method.toLowerCase();
                const authLevel = apiMethod.authLevel || 'user'; // Default to 'user'

                // Build middleware chain based on authLevel
                const middlewares = [];

                if (authLevel === 'user') {
                    // Require authentication
                    middlewares.push(AuthController.requireAuthentication);
                    // Load full user for plugin access
                    middlewares.push(this._loadFullUserMiddleware);
                } else if (authLevel === 'admin') {
                    // Require authentication + admin role
                    middlewares.push(AuthController.requireAuthentication);
                    middlewares.push(this._loadFullUserMiddleware);
                    const adminRoles = global.appConfig?.controller?.user?.adminRoles || ['admin', 'root'];
                    middlewares.push(AuthController.requireRole(adminRoles));
                }
                // authLevel === 'none' - no middleware

                // Final handler
                const handler = async (req, res) => {
                    try {
                        const ControllerClass = await this._loadController(registryKey);
                        await ControllerClass[apiMethod.name](req, res);
                    } catch (error) {
                        LogController.logError(req, `site-api.${controller.name}.${apiMethod.name}`, error.message);
                        const CommonUtils = global.CommonUtils;
                        if (CommonUtils?.sendError) {
                            return CommonUtils.sendError(req, res, 500, 'Site API error', 'SITE_API_ERROR', error.message);
                        }
                        return res.status(500).json({ success: false, error: 'Site API error' });
                    }
                };

                // Register route with middleware chain
                router[httpMethod](fullPath, ...middlewares, handler);

                routeCount++;
                LogController.logInfo(null, 'site-controller-registry',
                    `Registered: ${httpMethod.toUpperCase()} ${fullPath} → ${controller.source}:${controller.name}.${apiMethod.name}`);
            }
        }

        return routeCount;
    }

    /**
     * Get all controllers with API methods
     * @returns {Array} Array of controller objects with API methods
     */
    static getApiControllers() {
        return Array.from(this.registry.controllers.values())
            .filter(c => c.apiMethods && c.apiMethods.length > 0);
    }

    /**
     * Get all registered controllers
     * @returns {Array} Array of all controller objects
     */
    static getControllers() {
        return Array.from(this.registry.controllers.values());
    }

    /**
     * Get registry metrics (standardized getMetrics() format)
     * @returns {Object} Component metrics with standardized structure
     */
    static getMetrics() {
        const totalControllers = this.registry.controllers.size;
        const apiControllers = this.getApiControllers().length;
        const totalApiMethods = Array.from(this.registry.controllers.values())
            .reduce((sum, c) => sum + c.apiMethods.length, 0);

        return {
            component: 'SiteControllerRegistry',
            status: 'ok',
            initialized: true,
            stats: {
                totalControllers,
                apiControllers,
                totalApiMethods,
                lastScan: this.registry.lastScan,
                scanPath: this.registry.scanPath,
                controllers: this.getControllers().map(c => ({
                    name: c.name,
                    apiMethods: c.apiMethods.length,
                    hasInitialize: c.hasInitialize,
                    registeredAt: c.registeredAt
                }))
            },
            meta: {
                ttl: 0,  // Fast, no caching needed
                category: 'util',
                fields: {
                    'totalControllers': {
                        aggregate: 'first'  // Same everywhere
                    },
                    'apiControllers': {
                        aggregate: 'first'
                    },
                    'totalApiMethods': {
                        aggregate: 'first'
                    },
                    'lastScan': {
                        aggregate: 'first'  // Timestamp, use first value
                    },
                    'scanPath': {
                        aggregate: 'first',  // Path, use first value
                        visualize: false    // Hide from UI
                    },
                    'controllers': {
                        aggregate: false,   // Complex object, don't aggregate
                        visualize: false    // Don't visualize in UI
                    }
                }
            },
            timestamp: new Date().toISOString()
        };
    }
}

export default SiteControllerRegistry;

// EOF webapp/utils/site-controller-registry.js
