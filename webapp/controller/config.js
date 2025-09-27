/**
 * @name            jPulse Framework / WebApp / Controller / Config
 * @tagline         Config Controller for jPulse Framework WebApp
 * @description     This is the config controller for the jPulse Framework WebApp
 * @file            webapp/controller/config.js
 * @version         0.8.0
 * @release         2025-09-27
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           60%, Cursor 1.2, Claude Sonnet 4
 */

import ConfigModel from '../model/config.js';
import LogController from './log.js';
// i18n will be available globally after bootstrap

/**
 * Config Controller - handles /api/1/config/* REST API endpoints
 */
class ConfigController {
    /**
     * Get config by ID
     * GET /api/1/config/:id
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async get(req, res) {
        const startTime = Date.now();
        const id = req.params.id;
        LogController.logRequest(req, 'config.get', id || '');
        try {
            if (!id) {
                LogController.logError(req, 'config.get', 'error: id is required');
                const message = global.i18n.translate(req, 'controller.config.configIdRequired');
                return global.CommonUtils.sendError(req, res, 400, message, 'MISSING_ID');
            }

            let config = await ConfigModel.findById(id);

            // If config not found and this is the default site config, create it
            const defaultId = 'site';
            if (!config && id === defaultId) {
                const defaultConfig = {
                    _id: defaultId,
                    parent: null,
                    data: {
                        email: {
                            adminEmail: '',
                            adminName: '',
                            smtpServer: 'localhost',
                            smtpPort: 25,
                            smtpUser: '',
                            smtpPass: '',
                            useTls: false
                        },
                        messages: {
                            broadcast: ''
                        }
                    }
                };

                if (req.session && req.session.user) {
                    defaultConfig.updatedBy = req.session.user.id || req.session.user.loginId || '';
                }

                config = await ConfigModel.create(defaultConfig);
                LogController.logInfo(req, 'config.get', `success: created default config for id: ${defaultId}`);
            }

            if (!config) {
                LogController.logError(req, 'config.get', `error: config not found for id: ${id}`);
                const message = global.i18n.translate(req, 'controller.config.configNotFound', { id });
                return global.CommonUtils.sendError(req, res, 404, message, 'CONFIG_NOT_FOUND');
            }

            const message = global.i18n.translate(req, 'controller.config.configGetDone', { id });
            res.json({
                success: true,
                data: config,
                message: message
            });
            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'config.get', `success: config retrieved for id: ${id}, completed in ${duration}ms`);

        } catch (error) {
            LogController.logError(req, 'config.get', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.config.configGetFailed', { id });
            return global.CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Get effective config by ID (with inheritance resolved)
     * GET /api/1/config/:id/effective
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async getEffective(req, res) {
        const id = req.params.id;
        LogController.logRequest(req, 'config.getEffective', id || '');
        try {
            if (!id) {
                LogController.logError(req, 'config.getEffective', 'error: id is required');
                const message = global.i18n.translate(req, 'controller.config.configIdRequired');
                return global.CommonUtils.sendError(req, res, 400, message, 'MISSING_ID');
            }
            const config = await ConfigModel.getEffectiveConfig(id);
            if (!config) {
                LogController.logError(req, 'config.getEffective', `error: config not found for id: ${id}`);
                const message = global.i18n.translate(req, 'controller.config.configNotFound', { id });
                return global.CommonUtils.sendError(req, res, 404, message, 'CONFIG_NOT_FOUND');
            }
            LogController.logInfo(req, 'config.getEffective', `success: config retrieved for id: ${id}`);
            const message = global.i18n.translate(req, 'controller.config.configGetEffectiveDone', { id });
            res.json({
                success: true,
                data: config,
                message: message
            });

        } catch (error) {
            LogController.logError(req, 'config.getEffective', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.config.configGetEffectiveFailed', { id });
            return global.CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * List all configs
     * GET /api/1/config
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async list(req, res) {
        const parent = req.query.parent;
        LogController.logRequest(req, 'config.list', parent || '');
        try {
            const filter = {};

            // Filter by parent if specified
            if (parent !== undefined) {
                filter.parent = parent === 'null' ? null : parent;
            }
            const configs = await ConfigModel.find(filter);
            LogController.logInfo(req, 'config.list', `success: configs retrieved, count: ${configs.length}`);
            const message = global.i18n.translate(req, 'controller.config.configListRetrieved', { count: configs.length });
            res.json({
                success: true,
                data: configs,
                count: configs.length,
                message: message
            });

        } catch (error) {
            LogController.logError(req, 'config.list', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.config.configListFailed');
            return global.CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Create new config
     * POST /api/1/config
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async create(req, res) {
        const configData = req.body;
        LogController.logRequest(req, 'config.create', JSON.stringify(configData));
        try {
            if (!configData || Object.keys(configData).length === 0) {
                LogController.logError(req, 'config.create', 'error: config data is required');
                const message = global.i18n.translate(req, 'controller.config.configDataRequired');
                return global.CommonUtils.sendError(req, res, 400, message, 'MISSING_DATA');
            }
            // Add updatedBy from session (when authentication is implemented)
            if (req.session && req.session.user) {
                configData.updatedBy = req.session.user.id || req.session.user.loginId || '';
            }
            const config = await ConfigModel.create(configData);

            // Log the creation
            await LogController.logChange(req, 'config', 'create', config._id, null, config);
            LogController.logInfo(req, 'config.create', `success: config created for id: ${config._id}`);
            const message = global.i18n.translate(req, 'controller.config.configCreated', { id: config._id });
            res.status(201).json({
                success: true,
                data: config,
                message: message
            });

        } catch (error) {
            LogController.logError(req, 'config.create', `error: ${error.message}`);
            if (error.message.includes('Validation failed')) {
                const message = global.i18n.translate(req, 'controller.config.configValidationFailed');
                return global.CommonUtils.sendError(req, res, 400, message, 'VALIDATION_ERROR', error.message);
            }
            if (error.message.includes('duplicate key') || error.code === 11000) {
                const message = global.i18n.translate(req, 'controller.config.configDuplicateId', { id: configData.id });
                return global.CommonUtils.sendError(req, res, 409, message, 'DUPLICATE_ID', error.message);
            }
            const message = global.i18n.translate(req, 'controller.config.configCreateFailed');
            return global.CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Update config by ID
     * PUT /api/1/config/:id
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async update(req, res) {
        const id = req.params.id;
        const updateData = req.body;
        LogController.logRequest(req, 'config.update', `${id || ''}, ${JSON.stringify(updateData)}`);
        try {
            if (!id) {
                LogController.logError(req, 'config.update', 'error: id is required');
                const message = global.i18n.translate(req, 'controller.config.configIdRequired');
                return global.CommonUtils.sendError(req, res, 400, message, 'MISSING_ID');
            }
            if (!updateData || Object.keys(updateData).length === 0) {
                LogController.logError(req, 'config.update', 'error: update data is required');
                const message = global.i18n.translate(req, 'controller.config.configDataRequired');
                return global.CommonUtils.sendError(req, res, 400, message, 'MISSING_DATA');
            }

            // Get old document for logging
            const oldConfig = await ConfigModel.findById(id);
            if (!oldConfig) {
                LogController.logError(req, 'config.update', `error: config not found for id: ${id}`);
                const message = global.i18n.translate(req, 'controller.config.configNotFound', { id });
                return global.CommonUtils.sendError(req, res, 404, message, 'CONFIG_NOT_FOUND');
            }

            // Add updatedBy from session (when authentication is implemented)
            if (req.session && req.session.user) {
                updateData.updatedBy = req.session.user.id || req.session.user.loginId || '';
            }
            const config = await ConfigModel.updateById(id, updateData);

            // Log the update
            await LogController.logChange(req, 'config', 'update', id, oldConfig, config);
            LogController.logInfo(req, 'config.update', `success: config updated for id: ${id}`);
            const message = global.i18n.translate(req, 'controller.config.configUpdated', { id });
            res.json({
                success: true,
                data: config,
                message: message
            });

        } catch (error) {
            LogController.logError(req, 'config.update', `error: ${error.message}`);
            if (error.message.includes('Validation failed')) {
                const message = global.i18n.translate(req, 'controller.config.configValidationFailed');
                return global.CommonUtils.sendError(req, res, 400, message, 'VALIDATION_ERROR', error.message);
            }
            const message = global.i18n.translate(req, 'controller.config.configUpdateFailed');
            return global.CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Create or update config (upsert)
     * PUT /api/1/config/:id/upsert
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async upsert(req, res) {
        const id = req.params.id;
        const configData = req.body;
        LogController.logRequest(req, 'config.upsert', `${id || ''}, ${JSON.stringify(configData)}`);
        try {
            if (!id) {
                LogController.logError(req, 'config.upsert', 'error: id is required');
                const message = global.i18n.translate(req, 'controller.config.configIdRequired');
                return global.CommonUtils.sendError(req, res, 400, message, 'MISSING_ID');
            }
            if (!configData || Object.keys(configData).length === 0) {
                LogController.logError(req, 'config.upsert', 'error: config data is required');
                const message = global.i18n.translate(req, 'controller.config.configDataRequired');
                return global.CommonUtils.sendError(req, res, 400, message, 'MISSING_DATA');
            }
            // Add updatedBy from session (when authentication is implemented)
            if (req.session && req.session.user) {
                configData.updatedBy = req.session.user.id || req.session.user.loginId || '';
            }
            const config = await ConfigModel.upsert(id, configData);
            LogController.logInfo(req, 'config.upsert', `success: config upserted for id: ${id}`);
            const message = global.i18n.translate(req, 'controller.config.configSaved', { id });
            res.json({
                success: true,
                data: config,
                message: message
            });

        } catch (error) {
            LogController.logError(req, 'config.upsert', `error: ${error.message}`);
            if (error.message.includes('Validation failed')) {
                const message = global.i18n.translate(req, 'controller.config.configValidationFailed');
                return global.CommonUtils.sendError(req, res, 400, message, 'VALIDATION_ERROR', error.message);
            }
            const message = global.i18n.translate(req, 'controller.config.configSaveFailed');
            return global.CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Delete config by ID
     * DELETE /api/1/config/:id
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async delete(req, res) {
        const id = req.params.id;
        LogController.logRequest(req, 'config.delete', id || '');
        try {
            if (!id) {
                LogController.logError(req, 'config.delete', 'error: id is required');
                const message = global.i18n.translate(req, 'controller.config.configIdRequired');
                return global.CommonUtils.sendError(req, res, 400, message, 'MISSING_ID');
            }

            // Get document before deletion for logging
            const oldConfig = await ConfigModel.findById(id);
            if (!oldConfig) {
                LogController.logError(req, 'config.delete', `error: config not found for id: ${id}`);
                const message = global.i18n.translate(req, 'controller.config.configNotFound', { id });
                return global.CommonUtils.sendError(req, res, 404, message, 'CONFIG_NOT_FOUND');
            }

            const deleted = await ConfigModel.deleteById(id);

            // Log the deletion
            await LogController.logChange(req, 'config', 'delete', id, oldConfig, null);
            LogController.logInfo(req, 'config.delete', `success: config deleted for id: ${id}`);
            const message = global.i18n.translate(req, 'controller.config.configDeleted', { id });
            res.json({
                success: true,
                message: message
            });

        } catch (error) {
            LogController.logError(req, 'config.delete', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.config.configDeleteFailed');
            return global.CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }
}

export default ConfigController;

// EOF webapp/controller/config.js
