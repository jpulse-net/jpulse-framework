/**
 * @name            jPulse Framework / WebApp / Utils / Site Controller Registry
 * @tagline         Site Controller Registry and Auto-Discovery
 * @description     Discovers and registers site controller APIs at startup (W-014)
 * @file            webapp/utils/site-controller-registry.js
 * @version         1.2.5
 * @release         2025-11-25
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
            const siteControllerDir = path.join(global.appConfig.system.siteDir, 'controller');
            this.registry.scanPath = siteControllerDir;

            if (!fs.existsSync(siteControllerDir)) {
                LogController.logInfo(null, 'site-controller-registry', 'Site controller directory not found - no site overrides to register');
                return { controllers: 0, apis: 0, initialized: 0 };
            }

            await this._scanControllers();
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
     * Scan site controllers directory and analyze their API methods
     */
    static async _scanControllers() {
        const controllerDir = this.registry.scanPath;
        const files = fs.readdirSync(controllerDir)
            .filter(file => file.endsWith('.js'));

        for (const file of files) {
            const controllerName = path.basename(file, '.js');
            const controllerPath = path.join(controllerDir, file);

            try {
                const content = fs.readFileSync(controllerPath, 'utf8');
                const apiMethods = this._detectApiMethods(content);
                const hasInitialize = /\bstatic\s+(?:async\s+)?initialize\(/.test(content);

                this.registry.controllers.set(controllerName, {
                    name: controllerName,
                    path: controllerPath,
                    apiMethods,
                    hasInitialize,
                    relativePath: `controller/${file}`,
                    registeredAt: new Date().toISOString()
                });

            } catch (error) {
                LogController.logError(null, 'site-controller-registry', `Failed to analyze controller ${file}: ${error.message}`);
            }
        }

        this.registry.lastScan = new Date().toISOString();
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

        for (const [name, controller] of this.registry.controllers) {
            if (controller.apiMethods.length === 0) continue;

            const basePath = `/api/1/${name}`;

            // Sort API methods: specific routes (no :id) before parameterized routes
            // This ensures /search matches before /:id matches "search"
            const sortedMethods = [...controller.apiMethods].sort((a, b) => {
                const aHasParam = a.pathSuffix.includes(':');
                const bHasParam = b.pathSuffix.includes(':');
                // If one has params and the other doesn't, put the one without params first
                if (aHasParam && !bHasParam) return 1;
                if (!aHasParam && bHasParam) return -1;
                // If both have params or both don't, maintain original order
                return 0;
            });

            for (const apiMethod of sortedMethods) {
                const fullPath = basePath + apiMethod.pathSuffix;
                const httpMethod = apiMethod.method.toLowerCase();

                // Register the route
                router[httpMethod](fullPath, async (req, res) => {
                    try {
                        const ControllerClass = await this._loadController(name);
                        await ControllerClass[apiMethod.name](req, res);
                    } catch (error) {
                        LogController.logError(req, `site-api.${name}.${apiMethod.name}`, error.message);
                        const CommonUtils = global.CommonUtils;
                        if (CommonUtils?.sendError) {
                            return CommonUtils.sendError(req, res, 500, 'Site API error', 'SITE_API_ERROR', error.message);
                        }
                        return res.status(500).json({ success: false, error: 'Site API error' });
                    }
                });

                routeCount++;
                LogController.logInfo(null, 'site-controller-registry',
                    `Registered: ${httpMethod.toUpperCase()} ${fullPath} → ${name}.${apiMethod.name}`);
            }
        }

        return routeCount;
    }

    /**
     * Get registry statistics
     * @returns {Object} Registry stats
     */
    static getStats() {
        return {
            totalControllers: this.registry.controllers.size,
            apiControllers: this.getApiControllers().length,
            totalApiMethods: Array.from(this.registry.controllers.values())
                .reduce((sum, c) => sum + c.apiMethods.length, 0),
            lastScan: this.registry.lastScan,
            scanPath: this.registry.scanPath,
            controllers: this.getControllers().map(c => ({
                name: c.name,
                apiMethods: c.apiMethods.length,
                hasInitialize: c.hasInitialize,
                registeredAt: c.registeredAt
            }))
        };
    }
}

export default SiteControllerRegistry;

// EOF webapp/utils/site-controller-registry.js
