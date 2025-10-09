/**
 * @name            jPulse Framework / WebApp / Utils / Site Registry
 * @tagline         Site Override Registry and Auto-Discovery
 * @description     Discovers and registers site controllers/APIs at startup (W-014)
 * @file            webapp/utils/site-registry.js
 * @version         0.9.4
 * @release         2025-10-09
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           60%, Cursor 1.2, Claude Sonnet 4
 */

import fs from 'fs';
import path from 'path';
import LogController from '../controller/log.js';

/**
 * Site Registry for Auto-Discovery (W-014)
 *
 * Discovers site controllers at startup and creates API routes automatically.
 * No manual route registration needed - "don't make me think" principle.
 */
class SiteRegistry {

    static registry = {
        controllers: new Map(),
        lastScan: null,
        scanPath: null
    };

    /**
     * Initialize the site registry at app startup
     * @returns {Object} Registry information
     */
    static async initialize() {
        try {
            // Use appConfig.app.dirName as the base directory (follows established pattern)
            const webappDir = global.appConfig?.app?.dirName || path.join(process.cwd(), 'webapp');
            const projectRoot = path.dirname(webappDir);
            const siteControllerDir = path.join(projectRoot, 'site/webapp/controller');
            this.registry.scanPath = siteControllerDir;

            if (!fs.existsSync(siteControllerDir)) {
                LogController.logInfo(null, 'site-registry', 'Site controller directory not found - no site overrides to register');
                return { controllers: 0, apis: 0 };
            }

            await this.scanControllers();

            const controllerCount = this.registry.controllers.size;
            const apiCount = Array.from(this.registry.controllers.values())
                .filter(controller => controller.hasApi).length;

            LogController.logInfo(null, 'site-registry', `Discovered ${controllerCount} controllers, ${apiCount} with APIs`);

            return { controllers: controllerCount, apis: apiCount };

        } catch (error) {
            LogController.logError(null, 'site-registry', `error: Site Registry initialization failed: ${error.message}`);
            return { controllers: 0, apis: 0, error: error.message };
        }
    }

    /**
     * Scan site controllers directory and register them
     */
    static async scanControllers() {
        const controllerDir = this.registry.scanPath;
        const files = fs.readdirSync(controllerDir);

        for (const file of files) {
            if (file.endsWith('.js')) {
                const controllerName = path.basename(file, '.js');
                const controllerPath = path.join(controllerDir, file);

                try {
                    // Check if controller has API methods by reading the file
                    const content = fs.readFileSync(controllerPath, 'utf8');
                    const hasApi = content.includes('static async api(') || content.includes('static api(');
                    
                    // Detect additional CRUD API methods
                    const apiMethods = {
                        api: hasApi,
                        apiCreate: content.includes('static async apiCreate(') || content.includes('static apiCreate('),
                        apiToggle: content.includes('static async apiToggle(') || content.includes('static apiToggle('),
                        apiDelete: content.includes('static async apiDelete(') || content.includes('static apiDelete('),
                        apiStats: content.includes('static async apiStats(') || content.includes('static apiStats(')
                    };

                    this.registry.controllers.set(controllerName, {
                        name: controllerName,
                        path: controllerPath,
                        hasApi,
                        apiMethods,
                        relativePath: `controller/${file}`,
                        registeredAt: new Date().toISOString()
                    });

                } catch (error) {
                    LogController.logError(null, 'site-registry', `error: Failed to analyze controller ${file}: ${error.message}`);
                }
            }
        }

        this.registry.lastScan = new Date().toISOString();
    }

    /**
     * Get all registered site controllers
     * @returns {Array} Array of controller information
     */
    static getControllers() {
        return Array.from(this.registry.controllers.values());
    }

    /**
     * Get controllers that have API methods
     * @returns {Array} Array of controllers with APIs
     */
    static getApiControllers() {
        return this.getControllers().filter(controller => controller.hasApi);
    }

    /**
     * Check if a controller is registered
     * @param {string} name - Controller name
     * @returns {boolean} True if controller exists
     */
    static hasController(name) {
        return this.registry.controllers.has(name);
    }

    /**
     * Get controller information
     * @param {string} name - Controller name
     * @returns {Object|null} Controller info or null
     */
    static getController(name) {
        return this.registry.controllers.get(name) || null;
    }

    /**
     * Load a site controller dynamically
     * @param {string} name - Controller name
     * @returns {Object} Controller class
     */
    static async loadController(name) {
        const controller = this.getController(name);
        if (!controller) {
            throw new Error(`Site controller not found: ${name}`);
        }

        // Use PathResolver for consistent loading
        const PathResolver = (await import('./path-resolver.js')).default;
        const controllerPath = PathResolver.resolveModule(controller.relativePath);

        return (await import(controllerPath)).default;
    }

    /**
     * Get registry statistics
     * @returns {Object} Registry stats
     */
    static getStats() {
        return {
            totalControllers: this.registry.controllers.size,
            apiControllers: this.getApiControllers().length,
            lastScan: this.registry.lastScan,
            scanPath: this.registry.scanPath,
            controllers: this.getControllers().map(c => ({
                name: c.name,
                hasApi: c.hasApi,
                registeredAt: c.registeredAt
            }))
        };
    }

    /**
     * Register dynamic API routes for discovered controllers
     * @param {Object} router - Express router instance
     */
    static registerApiRoutes(router) {
        const apiControllers = this.getApiControllers();
        let routeCount = 0;

        for (const controller of apiControllers) {
            const apiPath = `/api/1/${controller.name}`;
            const kebabName = controller.name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');

            // Register GET route for api() method
            if (controller.apiMethods?.api) {
                router.get(apiPath, async (req, res) => {
                    try {
                        const ControllerClass = await this.loadController(controller.name);
                        await ControllerClass.api(req, res);
                    } catch (error) {
                        LogController.logError(null, `site-api.${controller.name}`, `error: ${error.message}`);
                        const CommonUtils = global.CommonUtils;
                        if (CommonUtils && CommonUtils.sendError && req.originalUrl) {
                            return CommonUtils.sendError(req, res, 500, 'Site API error');
                        } else {
                            return res.status(500).json({ error: 'Site API error' });
                        }
                    }
                });
                routeCount++;
                LogController.logInfo(null, 'site-registry', `Registered API route GET ${apiPath} → ${controller.name}.api`);
            }

            // Register POST route for apiCreate() method
            if (controller.apiMethods?.apiCreate) {
                router.post(apiPath, async (req, res) => {
                    try {
                        const ControllerClass = await this.loadController(controller.name);
                        await ControllerClass.apiCreate(req, res);
                    } catch (error) {
                        LogController.logError(null, `site-api.${controller.name}`, `error: ${error.message}`);
                        const CommonUtils = global.CommonUtils;
                        if (CommonUtils && CommonUtils.sendError && req.originalUrl) {
                            return CommonUtils.sendError(req, res, 500, 'Site API error');
                        } else {
                            return res.status(500).json({ error: 'Site API error' });
                        }
                    }
                });
                routeCount++;
                LogController.logInfo(null, 'site-registry', `Registered API route POST ${apiPath} → ${controller.name}.apiCreate`);
            }

            // Register PUT route for apiToggle() method
            if (controller.apiMethods?.apiToggle) {
                router.put(`${apiPath}/:id/toggle`, async (req, res) => {
                    try {
                        const ControllerClass = await this.loadController(controller.name);
                        await ControllerClass.apiToggle(req, res);
                    } catch (error) {
                        LogController.logError(null, `site-api.${controller.name}`, `error: ${error.message}`);
                        const CommonUtils = global.CommonUtils;
                        if (CommonUtils && CommonUtils.sendError && req.originalUrl) {
                            return CommonUtils.sendError(req, res, 500, 'Site API error');
                        } else {
                            return res.status(500).json({ error: 'Site API error' });
                        }
                    }
                });
                routeCount++;
                LogController.logInfo(null, 'site-registry', `Registered API route PUT ${apiPath}/:id/toggle → ${controller.name}.apiToggle`);
            }

            // Register DELETE route for apiDelete() method
            if (controller.apiMethods?.apiDelete) {
                router.delete(`${apiPath}/:id`, async (req, res) => {
                    try {
                        const ControllerClass = await this.loadController(controller.name);
                        await ControllerClass.apiDelete(req, res);
                    } catch (error) {
                        LogController.logError(null, `site-api.${controller.name}`, `error: ${error.message}`);
                        const CommonUtils = global.CommonUtils;
                        if (CommonUtils && CommonUtils.sendError && req.originalUrl) {
                            return CommonUtils.sendError(req, res, 500, 'Site API error');
                        } else {
                            return res.status(500).json({ error: 'Site API error' });
                        }
                    }
                });
                routeCount++;
                LogController.logInfo(null, 'site-registry', `Registered API route DELETE ${apiPath}/:id → ${controller.name}.apiDelete`);
            }

            // Register GET route for apiStats() method
            if (controller.apiMethods?.apiStats) {
                router.get(`${apiPath}/stats`, async (req, res) => {
                    try {
                        const ControllerClass = await this.loadController(controller.name);
                        await ControllerClass.apiStats(req, res);
                    } catch (error) {
                        LogController.logError(null, `site-api.${controller.name}`, `error: ${error.message}`);
                        const CommonUtils = global.CommonUtils;
                        if (CommonUtils && CommonUtils.sendError && req.originalUrl) {
                            return CommonUtils.sendError(req, res, 500, 'Site API error');
                        } else {
                            return res.status(500).json({ error: 'Site API error' });
                        }
                    }
                });
                routeCount++;
                LogController.logInfo(null, 'site-registry', `Registered API route GET ${apiPath}/stats → ${controller.name}.apiStats`);
            }
        }

        return routeCount;
    }
}

export default SiteRegistry;

// EOF webapp/utils/site-registry.js
