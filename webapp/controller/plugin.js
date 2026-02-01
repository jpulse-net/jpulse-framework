/**
 * @name            jPulse Framework / WebApp / Controller / Plugin
 * @tagline         Plugin Controller for jPulse Framework WebApp
 * @description     Plugin management controller for the jPulse Framework WebApp
 * @file            webapp/controller/plugin.js
 * @version         1.6.4
 * @release         2026-02-01
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.0, Claude Sonnet 4.5
 */

import PluginManager from '../utils/plugin-manager.js';
import PluginModel from '../model/plugin.js';
import LogController from './log.js';
import CommonUtils from '../utils/common.js';

/**
 * Plugin Controller - handles /api/1/plugin/* REST API endpoints
 * Implements W-045 Plugin Management API
 */
class PluginController {

    /**
     * Validate plugin name to prevent path traversal attacks
     * @param {string} name - Plugin name from request parameters
     * @param {object} req - Express request object (for i18n)
     * @returns {string} Validated plugin name
     * @throws {Error} If plugin name is invalid
     * @private
     */
    static _validatePluginName(name, req) {
        if (!name || typeof name !== 'string') {
            const message = global.i18n.translate(req, 'controller.plugin.validation.nameRequired');
            throw new Error(message);
        }

        // Security: Only allow lowercase alphanumeric + hyphens, must start with alphanumeric
        // This prevents path traversal attacks like '../../../etc/passwd'
        if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
            const message = global.i18n.translate(req, 'controller.plugin.validation.nameInvalid', { name });
            throw new Error(message);
        }

        return name;
    }

    /**
     * List all plugins
     * GET /api/1/plugin/list
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async list(req, res) {
        const startTime = Date.now();
        LogController.logRequest(req, 'plugin.list', '');
        try {
            const plugins = PluginManager.getAllPlugins();
            const pluginList = [];

            for (const plugin of plugins) {
                const registryEntry = plugin.registryEntry;
                const dbConfig = await PluginModel.getByName(plugin.name);

                pluginList.push({
                    name: plugin.name,
                    version: plugin.metadata.version,
                    icon: plugin.metadata.icon,
                    summary: plugin.metadata.summary,
                    description: plugin.metadata.description,
                    author: plugin.metadata.author,
                    enabled: registryEntry.enabled,
                    autoEnable: registryEntry.autoEnable,
                    status: registryEntry.status,
                    errors: registryEntry.errors || [],
                    hasConfig: plugin.metadata.config && plugin.metadata.config.schema,
                    configStored: !!dbConfig,
                    discoveredAt: registryEntry.discoveredAt,
                    enabledAt: registryEntry.enabledAt
                });
            }

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'plugin.list', `success: ${pluginList.length} plugins listed, completed in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.plugin.list.success', { count: pluginList.length });
            res.json({
                success: true,
                data: pluginList,
                message: message,
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'plugin.list', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.plugin.list.failed');
            return CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Get public plugin info (no authentication required)
     * GET /api/1/plugin/:name/info
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async getInfo(req, res) {
        const startTime = Date.now();
        try {
            const name = PluginController._validatePluginName(req.params.name, req);
            LogController.logRequest(req, 'plugin.getInfo', name);
            const plugin = PluginManager.getPlugin(name);

            if (!plugin) {
                LogController.logError(req, 'plugin.getInfo', `error: plugin not found: ${name}`);
                const message = global.i18n.translate(req, 'controller.plugin.get.notFound', { name });
                return CommonUtils.sendError(req, res, 404, message, 'PLUGIN_NOT_FOUND');
            }

            // Return only public, safe information
            const response = {
                name: plugin.name,
                version: plugin.metadata.version,
                icon: plugin.metadata.icon,
                summary: plugin.metadata.summary,
                description: plugin.metadata.description,
                author: plugin.metadata.author,
                jpulseVersion: plugin.metadata.jpulseVersion,
                enabled: plugin.registryEntry.enabled,
                autoEnable: plugin.registryEntry.autoEnable,
                status: plugin.registryEntry.status
            };

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'plugin.getInfo', `success: public info retrieved for ${name}, completed in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.plugin.getInfo.success');
            res.json({
                success: true,
                data: response,
                message: message,
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'plugin.getInfo', `error: ${error.message}`);
            // Validation errors should return 400, not 500
            const isValidationError = error.message.includes('Invalid plugin name') || error.message.includes('required');
            if (isValidationError) {
                return CommonUtils.sendError(req, res, 400, error.message, 'INVALID_PLUGIN_NAME');
            }
            const message = global.i18n.translate(req, 'controller.plugin.getInfo.failed');
            return CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Get plugin details (admin only - includes sensitive data)
     * GET /api/1/plugin/:name
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async get(req, res) {
        const startTime = Date.now();
        try {
            const name = PluginController._validatePluginName(req.params.name, req);
            LogController.logRequest(req, 'plugin.get', name);
            const plugin = PluginManager.getPlugin(name);

            if (!plugin) {
                LogController.logError(req, 'plugin.get', `error: plugin not found: ${name}`);
                const message = global.i18n.translate(req, 'controller.plugin.get.notFound', { name });
                return CommonUtils.sendError(req, res, 404, message, 'PLUGIN_NOT_FOUND');
            }

            const dbConfig = await PluginModel.getByName(name);

            const response = {
                name: plugin.name,
                version: plugin.metadata.version,
                icon: plugin.metadata.icon,
                summary: plugin.metadata.summary,
                description: plugin.metadata.description,
                author: plugin.metadata.author,
                jpulseVersion: plugin.metadata.jpulseVersion,
                enabled: plugin.registryEntry.enabled,
                autoEnable: plugin.registryEntry.autoEnable,
                status: plugin.registryEntry.status,
                errors: plugin.registryEntry.errors || [],
                dependencies: plugin.metadata.dependencies || {},
                configSchema: plugin.metadata.config?.schema || [],
                configStored: !!dbConfig,
                discoveredAt: plugin.registryEntry.discoveredAt,
                enabledAt: plugin.registryEntry.enabledAt,
                path: plugin.path
            };

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'plugin.get', `success: plugin details retrieved for ${name}, completed in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.plugin.get.success');
            res.json({
                success: true,
                data: response,
                message: message,
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'plugin.get', `error: ${error.message}`);
            const isValidationError = error.message.includes('Invalid plugin name') || error.message.includes('required');
            if (isValidationError) {
                return CommonUtils.sendError(req, res, 400, error.message, 'INVALID_PLUGIN_NAME');
            }
            const message = global.i18n.translate(req, 'controller.plugin.get.failed');
            return CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Get plugin status
     * GET /api/1/plugin/:name/status
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async getStatus(req, res) {
        const startTime = Date.now();
        try {
            const name = PluginController._validatePluginName(req.params.name, req);
            LogController.logRequest(req, 'plugin.getStatus', name);
            const plugin = PluginManager.getPlugin(name);

            if (!plugin) {
                LogController.logError(req, 'plugin.getStatus', `error: plugin not found: ${name}`);
                const message = global.i18n.translate(req, 'controller.plugin.getStatus.notFound', { name });
                return CommonUtils.sendError(req, res, 404, message, 'PLUGIN_NOT_FOUND');
            }

            const status = {
                name: plugin.name,
                status: plugin.registryEntry.status,
                enabled: plugin.registryEntry.enabled,
                loaded: plugin.registryEntry.status === 'loaded',
                errors: plugin.registryEntry.errors || [],
                dependencies: plugin.metadata.dependencies || {}
            };

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'plugin.getStatus', `success: status retrieved for ${name}, completed in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.plugin.getStatus.success');
            res.json({
                success: true,
                data: status,
                message: message,
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'plugin.getStatus', `error: ${error.message}`);
            const isValidationError = error.message.includes('Invalid plugin name') || error.message.includes('required');
            if (isValidationError) {
                return CommonUtils.sendError(req, res, 400, error.message, 'INVALID_PLUGIN_NAME');
            }
            const message = global.i18n.translate(req, 'controller.plugin.getStatus.failed');
            return CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Enable plugin
     * POST /api/1/plugin/:name/enable
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async enable(req, res) {
        const startTime = Date.now();
        try {
            const name = PluginController._validatePluginName(req.params.name, req);
            LogController.logRequest(req, 'plugin.enable', name);
            const result = await PluginManager.enablePlugin(name);

            if (!result.success) {
                LogController.logError(req, 'plugin.enable', `error: ${result.message}`);
                const message = global.i18n.translate(req, 'controller.plugin.enable.failed', { message: result.message });
                return CommonUtils.sendError(req, res, 400, message, 'ENABLE_FAILED');
            }

            // Log the action
            const user = req.session?.user;
            const username = user ? (user.username || user.loginId || user.id) : 'system';
            await LogController.logChange(req, 'plugin', 'update', name, { enabled: false }, { enabled: true, by: username });

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'plugin.enable', `success: plugin enabled: ${name}, completed in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.plugin.enable.success', { name });
            res.json({
                success: true,
                message: message,
                restartRequired: true,
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'plugin.enable', `error: ${error.message}`);
            const isValidationError = error.message.includes('Invalid plugin name') || error.message.includes('required');
            if (isValidationError) {
                return CommonUtils.sendError(req, res, 400, error.message, 'INVALID_PLUGIN_NAME');
            }
            const message = global.i18n.translate(req, 'controller.plugin.enable.internalError');
            return CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Disable plugin
     * POST /api/1/plugin/:name/disable
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async disable(req, res) {
        const startTime = Date.now();
        try {
            const name = PluginController._validatePluginName(req.params.name, req);
            LogController.logRequest(req, 'plugin.disable', name);
            const result = await PluginManager.disablePlugin(name);

            if (!result.success) {
                LogController.logError(req, 'plugin.disable', `error: ${result.message}`);
                const message = global.i18n.translate(req, 'controller.plugin.disable.failed', { message: result.message });
                return CommonUtils.sendError(req, res, 400, message, 'DISABLE_FAILED');
            }

            // Log the action
            const user = req.session?.user;
            const username = user ? (user.username || user.loginId || user.id) : 'system';
            await LogController.logChange(req, 'plugin', 'update', name, { enabled: true }, { enabled: false, by: username });

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'plugin.disable', `success: plugin disabled: ${name}, completed in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.plugin.disable.success', { name });
            res.json({
                success: true,
                message: message,
                restartRequired: true,
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'plugin.disable', `error: ${error.message}`);
            const isValidationError = error.message.includes('Invalid plugin name') || error.message.includes('required');
            if (isValidationError) {
                return CommonUtils.sendError(req, res, 400, error.message, 'INVALID_PLUGIN_NAME');
            }
            const message = global.i18n.translate(req, 'controller.plugin.disable.internalError');
            return CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Get plugin configuration
     * GET /api/1/plugin/:name/config
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async getConfig(req, res) {
        const startTime = Date.now();
        try {
            const name = PluginController._validatePluginName(req.params.name, req);
            LogController.logRequest(req, 'plugin.getConfig', name);
            const plugin = PluginManager.getPlugin(name);

            if (!plugin) {
                LogController.logError(req, 'plugin.getConfig', `error: plugin not found: ${name}`);
                const message = global.i18n.translate(req, 'controller.plugin.getConfig.notFound', { name });
                return CommonUtils.sendError(req, res, 404, message, 'PLUGIN_NOT_FOUND');
            }

            const configSchema = plugin.metadata.config?.schema || [];
            const dbConfig = await PluginModel.getByName(name);
            const configValues = dbConfig?.config || {};

            const response = {
                schema: configSchema,
                values: configValues
            };

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'plugin.getConfig', `success: config retrieved for ${name}, completed in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.plugin.getConfig.success');
            res.json({
                success: true,
                data: response,
                message: message,
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'plugin.getConfig', `error: ${error.message}`);
            const isValidationError = error.message.includes('Invalid plugin name') || error.message.includes('required');
            if (isValidationError) {
                return CommonUtils.sendError(req, res, 400, error.message, 'INVALID_PLUGIN_NAME');
            }
            const message = global.i18n.translate(req, 'controller.plugin.getConfig.failed');
            return CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Update plugin configuration
     * PUT /api/1/plugin/:name/config
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async updateConfig(req, res) {
        const startTime = Date.now();
        try {
            const name = PluginController._validatePluginName(req.params.name, req);
            const configData = req.body.config || req.body;
            LogController.logRequest(req, 'plugin.updateConfig', name);
            const plugin = PluginManager.getPlugin(name);

            if (!plugin) {
                LogController.logError(req, 'plugin.updateConfig', `error: plugin not found: ${name}`);
                const message = global.i18n.translate(req, 'controller.plugin.updateConfig.notFound', { name });
                return CommonUtils.sendError(req, res, 404, message, 'PLUGIN_NOT_FOUND');
            }

            // Validate config against schema
            const configSchema = plugin.metadata.config?.schema;
            if (configSchema) {
                const validation = PluginModel.validateConfig(name, configData, configSchema);
                if (!validation.valid) {
                    LogController.logError(req, 'plugin.updateConfig', `error: validation failed: ${validation.errors.join(', ')}`);
                    const message = global.i18n.translate(req, 'controller.plugin.updateConfig.validationFailed', { errors: validation.errors.join(', ') });
                    return CommonUtils.sendError(req, res, 400, message, 'VALIDATION_ERROR');
                }
            }

            // Get current config for change logging
            const oldConfig = await PluginModel.getByName(name);

            // Save configuration
            const user = req.session?.user;
            const username = user ? (user.username || user.loginId || user.id) : 'system';
            const result = await PluginModel.upsert(name, configData, username);

            // Log the change
            await LogController.logChange(req, 'plugin', 'update', name, oldConfig?.config, configData);

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'plugin.updateConfig', `success: config updated for ${name}, completed in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.plugin.updateConfig.success');
            res.json({
                success: true,
                message: message,
                restartRequired: false,
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'plugin.updateConfig', `error: ${error.message}`);
            const isValidationError = error.message.includes('Invalid plugin name') || error.message.includes('required');
            if (isValidationError) {
                return CommonUtils.sendError(req, res, 400, error.message, 'INVALID_PLUGIN_NAME');
            }
            const message = global.i18n.translate(req, 'controller.plugin.updateConfig.failed');
            return CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Get dependency graph for all plugins
     * GET /api/1/plugin/dependencies
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async getDependencies(req, res) {
        const startTime = Date.now();
        LogController.logRequest(req, 'plugin.getDependencies', '');
        try {
            const plugins = PluginManager.getAllPlugins();
            const graph = {
                plugins: [],
                dependencies: []
            };

            for (const plugin of plugins) {
                graph.plugins.push({
                    name: plugin.name,
                    enabled: plugin.registryEntry.enabled
                });

                const dependencies = plugin.metadata.dependencies?.plugins || {};
                for (const depName of Object.keys(dependencies)) {
                    graph.dependencies.push({
                        from: plugin.name,
                        to: depName,
                        version: dependencies[depName]
                    });
                }
            }

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'plugin.getDependencies', `success: dependency graph generated, completed in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.plugin.getDependencies.success');
            res.json({
                success: true,
                data: graph,
                message: message,
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'plugin.getDependencies', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.plugin.getDependencies.failed');
            return CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Get dependencies for specific plugin
     * GET /api/1/plugin/:name/dependencies
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async getPluginDependencies(req, res) {
        const startTime = Date.now();
        try {
            const name = PluginController._validatePluginName(req.params.name, req);
            LogController.logRequest(req, 'plugin.getPluginDependencies', name);
            const plugin = PluginManager.getPlugin(name);

            if (!plugin) {
                LogController.logError(req, 'plugin.getPluginDependencies', `error: plugin not found: ${name}`);
                const message = global.i18n.translate(req, 'controller.plugin.getPluginDependencies.notFound', { name });
                return CommonUtils.sendError(req, res, 404, message, 'PLUGIN_NOT_FOUND');
            }

            const requires = plugin.metadata.dependencies?.plugins || {};
            const requiredBy = [];

            // Find plugins that depend on this one
            const allPlugins = PluginManager.getAllPlugins();
            for (const other of allPlugins) {
                if (other.name === name) continue;

                const otherDeps = other.metadata.dependencies?.plugins || {};
                if (otherDeps[name]) {
                    requiredBy.push({
                        name: other.name,
                        version: otherDeps[name]
                    });
                }
            }

            const response = {
                requires: Object.keys(requires).map(dep => ({
                    name: dep,
                    version: requires[dep]
                })),
                requiredBy: requiredBy
            };

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'plugin.getPluginDependencies', `success: dependencies retrieved for ${name}, completed in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.plugin.getPluginDependencies.success');
            res.json({
                success: true,
                data: response,
                message: message,
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'plugin.getPluginDependencies', `error: ${error.message}`);
            const isValidationError = error.message.includes('Invalid plugin name') || error.message.includes('required');
            if (isValidationError) {
                return CommonUtils.sendError(req, res, 400, error.message, 'INVALID_PLUGIN_NAME');
            }
            const message = global.i18n.translate(req, 'controller.plugin.getPluginDependencies.failed');
            return CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Scan for new plugins
     * POST /api/1/plugin/scan
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async scan(req, res) {
        const startTime = Date.now();
        LogController.logRequest(req, 'plugin.scan', '');
        try {
            const result = await PluginManager.rescan();

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'plugin.scan', `success: ${result.message}, completed in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.plugin.scan.success');
            res.json({
                success: true,
                data: result,
                message: message,
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'plugin.scan', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.plugin.scan.failed');
            return CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Install npm dependencies for a plugin
     * POST /api/1/plugin/:name/install-deps
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async installDependencies(req, res) {
        const startTime = Date.now();
        try {
            const name = PluginController._validatePluginName(req.params.name, req);
            LogController.logRequest(req, 'plugin.installDependencies', name);
            const plugin = PluginManager.getPlugin(name);

            if (!plugin) {
                LogController.logError(req, 'plugin.installDependencies', `error: plugin not found: ${name}`);
                const message = global.i18n.translate(req, 'controller.plugin.installDependencies.notFound', { name });
                return CommonUtils.sendError(req, res, 404, message, 'PLUGIN_NOT_FOUND');
            }

            // TODO: Implement npm install for plugin dependencies
            // This requires executing child process npm install in plugin directory
            // Deferred to future enhancement (W-045-TD-14)

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'plugin.installDependencies', `success: dependencies installation initiated for ${name}, completed in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.plugin.installDependencies.notImplemented');
            res.json({
                success: true,
                message: message,
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'plugin.installDependencies', `error: ${error.message}`);
            const isValidationError = error.message.includes('Invalid plugin name') || error.message.includes('required');
            if (isValidationError) {
                return CommonUtils.sendError(req, res, 400, error.message, 'INVALID_PLUGIN_NAME');
            }
            const message = global.i18n.translate(req, 'controller.plugin.installDependencies.failed');
            return CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

}

export default PluginController;

// EOF webapp/controller/plugin.js
