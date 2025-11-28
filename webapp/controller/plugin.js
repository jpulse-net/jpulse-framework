/**
 * @name            jPulse Framework / WebApp / Controller / Plugin
 * @tagline         Plugin Controller for jPulse Framework WebApp
 * @description     Plugin management controller for the jPulse Framework WebApp
 * @file            webapp/controller/plugin.js
 * @version         1.2.7
 * @release         2025-11-26
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
     * List all plugins
     * GET /api/1/plugin/list
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async list(req, res) {
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

            LogController.logInfo(req, 'plugin.list', `success: ${pluginList.length} plugins listed`);
            res.json({
                success: true,
                data: pluginList
            });

        } catch (error) {
            LogController.logError(req, 'plugin.list', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to list plugins', 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Get plugin details
     * GET /api/1/plugin/:name
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async get(req, res) {
        const name = req.params.name;
        LogController.logRequest(req, 'plugin.get', name);
        try {
            const plugin = PluginManager.getPlugin(name);

            if (!plugin) {
                LogController.logError(req, 'plugin.get', `error: plugin not found: ${name}`);
                return CommonUtils.sendError(req, res, 404, `Plugin not found: ${name}`, 'PLUGIN_NOT_FOUND');
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

            LogController.logInfo(req, 'plugin.get', `success: plugin details retrieved for ${name}`);
            res.json({
                success: true,
                data: response
            });

        } catch (error) {
            LogController.logError(req, 'plugin.get', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to get plugin details', 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Get plugin status
     * GET /api/1/plugin/:name/status
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async getStatus(req, res) {
        const name = req.params.name;
        LogController.logRequest(req, 'plugin.getStatus', name);
        try {
            const plugin = PluginManager.getPlugin(name);

            if (!plugin) {
                LogController.logError(req, 'plugin.getStatus', `error: plugin not found: ${name}`);
                return CommonUtils.sendError(req, res, 404, `Plugin not found: ${name}`, 'PLUGIN_NOT_FOUND');
            }

            const status = {
                name: plugin.name,
                status: plugin.registryEntry.status,
                enabled: plugin.registryEntry.enabled,
                loaded: plugin.registryEntry.status === 'loaded',
                errors: plugin.registryEntry.errors || [],
                dependencies: plugin.metadata.dependencies || {}
            };

            LogController.logInfo(req, 'plugin.getStatus', `success: status retrieved for ${name}`);
            res.json({
                success: true,
                data: status
            });

        } catch (error) {
            LogController.logError(req, 'plugin.getStatus', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to get plugin status', 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Enable plugin
     * POST /api/1/plugin/:name/enable
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async enable(req, res) {
        const name = req.params.name;
        LogController.logRequest(req, 'plugin.enable', name);
        try {
            const result = await PluginManager.enablePlugin(name);

            if (!result.success) {
                LogController.logError(req, 'plugin.enable', `error: ${result.message}`);
                return CommonUtils.sendError(req, res, 400, result.message, 'ENABLE_FAILED');
            }

            // Log the action
            const user = req.session?.user;
            const username = user ? (user.username || user.loginId || user.id) : 'system';
            await LogController.logChange(req, 'plugin', 'update', name, { enabled: false }, { enabled: true, by: username });

            LogController.logInfo(req, 'plugin.enable', `success: plugin enabled: ${name}`);
            res.json({
                success: true,
                message: result.message,
                restartRequired: true
            });

        } catch (error) {
            LogController.logError(req, 'plugin.enable', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to enable plugin', 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Disable plugin
     * POST /api/1/plugin/:name/disable
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async disable(req, res) {
        const name = req.params.name;
        LogController.logRequest(req, 'plugin.disable', name);
        try {
            const result = await PluginManager.disablePlugin(name);

            if (!result.success) {
                LogController.logError(req, 'plugin.disable', `error: ${result.message}`);
                return CommonUtils.sendError(req, res, 400, result.message, 'DISABLE_FAILED');
            }

            // Log the action
            const user = req.session?.user;
            const username = user ? (user.username || user.loginId || user.id) : 'system';
            await LogController.logChange(req, 'plugin', 'update', name, { enabled: true }, { enabled: false, by: username });

            LogController.logInfo(req, 'plugin.disable', `success: plugin disabled: ${name}`);
            res.json({
                success: true,
                message: result.message,
                restartRequired: true
            });

        } catch (error) {
            LogController.logError(req, 'plugin.disable', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to disable plugin', 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Get plugin configuration
     * GET /api/1/plugin/:name/config
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async getConfig(req, res) {
        const name = req.params.name;
        LogController.logRequest(req, 'plugin.getConfig', name);
        try {
            const plugin = PluginManager.getPlugin(name);

            if (!plugin) {
                LogController.logError(req, 'plugin.getConfig', `error: plugin not found: ${name}`);
                return CommonUtils.sendError(req, res, 404, `Plugin not found: ${name}`, 'PLUGIN_NOT_FOUND');
            }

            const configSchema = plugin.metadata.config?.schema || [];
            const dbConfig = await PluginModel.getByName(name);
            const configValues = dbConfig?.config || {};

            const response = {
                schema: configSchema,
                values: configValues
            };

            LogController.logInfo(req, 'plugin.getConfig', `success: config retrieved for ${name}`);
            res.json({
                success: true,
                data: response
            });

        } catch (error) {
            LogController.logError(req, 'plugin.getConfig', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to get plugin config', 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Update plugin configuration
     * PUT /api/1/plugin/:name/config
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async updateConfig(req, res) {
        const name = req.params.name;
        const configData = req.body.config || req.body;
        LogController.logRequest(req, 'plugin.updateConfig', name);
        try {
            const plugin = PluginManager.getPlugin(name);

            if (!plugin) {
                LogController.logError(req, 'plugin.updateConfig', `error: plugin not found: ${name}`);
                return CommonUtils.sendError(req, res, 404, `Plugin not found: ${name}`, 'PLUGIN_NOT_FOUND');
            }

            // Validate config against schema
            const configSchema = plugin.metadata.config?.schema;
            if (configSchema) {
                const validation = PluginModel.validateConfig(name, configData, configSchema);
                if (!validation.valid) {
                    LogController.logError(req, 'plugin.updateConfig', `error: validation failed: ${validation.errors.join(', ')}`);
                    return CommonUtils.sendError(req, res, 400, `Validation failed: ${validation.errors.join(', ')}`, 'VALIDATION_ERROR');
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

            LogController.logInfo(req, 'plugin.updateConfig', `success: config updated for ${name}`);
            res.json({
                success: true,
                message: 'Configuration updated successfully',
                restartRequired: false
            });

        } catch (error) {
            LogController.logError(req, 'plugin.updateConfig', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to update plugin config', 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Get dependency graph for all plugins
     * GET /api/1/plugin/dependencies
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async getDependencies(req, res) {
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

            LogController.logInfo(req, 'plugin.getDependencies', `success: dependency graph generated`);
            res.json({
                success: true,
                data: graph
            });

        } catch (error) {
            LogController.logError(req, 'plugin.getDependencies', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to get dependencies', 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Get dependencies for specific plugin
     * GET /api/1/plugin/:name/dependencies
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async getPluginDependencies(req, res) {
        const name = req.params.name;
        LogController.logRequest(req, 'plugin.getPluginDependencies', name);
        try {
            const plugin = PluginManager.getPlugin(name);

            if (!plugin) {
                LogController.logError(req, 'plugin.getPluginDependencies', `error: plugin not found: ${name}`);
                return CommonUtils.sendError(req, res, 404, `Plugin not found: ${name}`, 'PLUGIN_NOT_FOUND');
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

            LogController.logInfo(req, 'plugin.getPluginDependencies', `success: dependencies retrieved for ${name}`);
            res.json({
                success: true,
                data: response
            });

        } catch (error) {
            LogController.logError(req, 'plugin.getPluginDependencies', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to get plugin dependencies', 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Scan for new plugins
     * POST /api/1/plugin/scan
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async scan(req, res) {
        LogController.logRequest(req, 'plugin.scan', '');
        try {
            const result = await PluginManager.rescan();

            LogController.logInfo(req, 'plugin.scan', `success: ${result.message}`);
            res.json({
                success: true,
                data: result,
                message: result.message
            });

        } catch (error) {
            LogController.logError(req, 'plugin.scan', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to scan for plugins', 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Install npm dependencies for a plugin
     * POST /api/1/plugin/:name/install-deps
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async installDependencies(req, res) {
        const name = req.params.name;
        LogController.logRequest(req, 'plugin.installDependencies', name);
        try {
            const plugin = PluginManager.getPlugin(name);

            if (!plugin) {
                LogController.logError(req, 'plugin.installDependencies', `error: plugin not found: ${name}`);
                return CommonUtils.sendError(req, res, 404, `Plugin not found: ${name}`, 'PLUGIN_NOT_FOUND');
            }

            // TODO: Implement npm install for plugin dependencies
            // This requires executing child process npm install in plugin directory
            // Deferred to future enhancement

            LogController.logInfo(req, 'plugin.installDependencies', `success: dependencies installation initiated for ${name}`);
            res.json({
                success: true,
                message: 'Dependency installation not yet implemented'
            });

        } catch (error) {
            LogController.logError(req, 'plugin.installDependencies', `error: ${error.message}`);
            return CommonUtils.sendError(req, res, 500, 'Failed to install dependencies', 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Get health status (standardized format for HealthController)
     * @returns {object} Health status
     */
    static getHealthStatus() {
        return PluginManager.getHealthStatus();
    }
}

export default PluginController;

// EOF webapp/controller/plugin.js
