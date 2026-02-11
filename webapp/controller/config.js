/**
 * @name            jPulse Framework / WebApp / Controller / Config
 * @tagline         Config Controller for jPulse Framework WebApp
 * @description     This is the config controller for the jPulse Framework WebApp
 * @file            webapp/controller/config.js
 * @version         1.6.15
 * @release         2026-02-11
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 2.4, Claude Sonnet 4.5
 */

import ConfigModel from '../model/config.js';
import LogController from './log.js';
import AuthController from './auth.js';
// i18n will be available globally after bootstrap

/**
 * Config Controller - handles /api/1/config/* REST API endpoints
 */
class ConfigController {
    /**
     * Initialize config controller
     * Validates that defaultDocName is configured
     */
    static initialize() {
        this.defaultDocName = global.appConfig?.controller?.config?.defaultDocName;
        if (!this.defaultDocName) {
            throw new Error('controller.config.defaultDocName must be set in app.conf');
        }
    }

    /**
     * Get the default config document name
     * @returns {string} Default config document ID
     */
    static getDefaultDocName() {
        return ConfigController.defaultDocName;
    }

    /**
     * Get config by ID
     * GET /api/1/config/_default (resolved to default) or GET /api/1/config/:id
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async get(req, res) {
        const startTime = Date.now();
        // Resolve _default to actual default doc name
        const defaultDocName = ConfigController.getDefaultDocName();
        let id = req.params.id && req.params.id.trim();
        if (id === '_default' || !id) {
            id = defaultDocName;
        }
        LogController.logRequest(req, 'config.get', id || '');
        try {

            const isAdmin = AuthController.isAdmin(req);
            let config = await ConfigModel.findById(id, isAdmin);

            // If config not found and this is the default config, create it
            // W-131: Let model's applyDefaults() handle defaults (single source of truth)
            if (!config && id === defaultDocName) {
                const defaultConfig = {
                    _id: defaultDocName,
                    parent: null,
                    data: {}
                };

                if (req.session && req.session.user) {
                    defaultConfig.updatedBy = req.session.user.id || req.session.user.loginId || '';
                }

                config = await ConfigModel.create(defaultConfig);
                LogController.logInfo(req, 'config.get', `success: created default config for id: ${defaultDocName}`);
            }

            if (!config) {
                LogController.logError(req, 'config.get', `error: config not found for id: ${id}`);
                const message = global.i18n.translate(req, 'controller.config.configNotFound', { id });
                return global.CommonUtils.sendError(req, res, 404, message, 'CONFIG_NOT_FOUND');
            }

            // W-147: Ensure effective general cache is set when default config is returned (first request before health init)
            if (id === defaultDocName && config.data?.general) {
                ConfigModel.setEffectiveGeneralCache(config.data.general);
            }

            // W-115 / W-147 / W-148: Include schema if requested (data-driven tabs and extension panels)
            const includeSchema = req.query.includeSchema === '1' || req.query.includeSchema === 'true';
            let schema = null;
            if (includeSchema) {
                const fullSchema = ConfigModel.getSchema();
                const resolvedSchema = global.i18n.expandI18nDeep(req, fullSchema);
                schema = {
                    schema: resolvedSchema,
                    contextFilter: fullSchema._meta?.contextFilter || null
                };
            }

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'config.get', `success: config retrieved for id: ${id}, completed in ${elapsed}ms${includeSchema ? ' (with schema)' : ''}`);
            const message = global.i18n.translate(req, 'controller.config.configGetDone', { id });
            const response = {
                success: true,
                data: config,
                message: message,
                elapsed
            };

            // W-115: Add schema to response if requested
            if (schema) {
                response.schema = schema;
                res.set('Cache-Control', 'no-store');
            }

            res.json(response);

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
            const isAdmin = AuthController.isAdmin(req);
            const config = await ConfigModel.getEffectiveConfig(id, isAdmin);
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
            const isAdmin = AuthController.isAdmin(req);
            const configs = await ConfigModel.find(filter, isAdmin);
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
        // Resolve _default to actual default doc name
        const defaultDocName = ConfigController.getDefaultDocName();
        let id = req.params.id && req.params.id.trim();
        if (id === '_default' || !id) {
            id = defaultDocName;
        }
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

            // Get old document for logging and self-lockout check (full doc needed for adminRoles)
            const oldConfig = await ConfigModel.findById(id, true);
            if (!oldConfig) {
                LogController.logError(req, 'config.update', `error: config not found for id: ${id}`);
                const message = global.i18n.translate(req, 'controller.config.configNotFound', { id });
                return global.CommonUtils.sendError(req, res, 404, message, 'CONFIG_NOT_FOUND');
            }

            // W-147: Self-lockout prevention – reject if update would remove current user's admin role(s)
            const incomingGeneral = updateData?.data?.general;
            if (incomingGeneral && Array.isArray(incomingGeneral.adminRoles)) {
                const currentAdminRoles = oldConfig.data?.general?.adminRoles ?? [];
                const userRoles = req.session?.user?.roles ?? [];
                const userCurrentAdminRoles = userRoles.filter(r => currentAdminRoles.includes(r));
                const userWouldKeepAdmin = userCurrentAdminRoles.some(r => incomingGeneral.adminRoles.includes(r));
                if (userCurrentAdminRoles.length > 0 && !userWouldKeepAdmin) {
                    LogController.logError(req, 'config.update', 'error: self-lockout attempt rejected');
                    const message = global.i18n.translate(req, 'controller.config.configGeneralSelfLockout');
                    return global.CommonUtils.sendError(req, res, 400, message, 'SELF_LOCKOUT');
                }
            }

            // Add updatedBy from session (when authentication is implemented)
            if (req.session && req.session.user) {
                updateData.updatedBy = req.session.user.id || req.session.user.loginId || '';
            }
            const config = await ConfigModel.updateById(id, updateData);

            // W-147: Update effective general cache when default config is updated
            if (id === defaultDocName && config?.data?.general) {
                ConfigModel.setEffectiveGeneralCache(config.data.general);
            }

            // W-088: Publish generic config change event (notification-only pattern)
            // Subscribers (e.g., HandlebarController) will fetch fresh data from DB
            // RedisManager handles fallback to local callbacks when Redis is unavailable
            try {
                await global.RedisManager.publishBroadcast('controller:config:data:changed', {
                    id: id,
                    action: 'update',
                    timestamp: Date.now()
                });
                LogController.logInfo(req, 'config.update', `Config change event published for id: ${id}`);
            } catch (error) {
                // Don't fail the update if event publish fails
                LogController.logError(req, 'config.update', `Config change event failed: ${error.message}`);
            }

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
     * PUT /api/1/config/_default (resolved to default) or PUT /api/1/config/:id/upsert
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async upsert(req, res) {
        // Resolve _default to actual default doc name
        const defaultDocName = ConfigController.getDefaultDocName();
        let id = req.params.id && req.params.id.trim();
        if (id === '_default' || !id) {
            id = defaultDocName;
        }
        const configData = req.body;
        LogController.logRequest(req, 'config.upsert', `${id || ''}, ${JSON.stringify(configData)}`);
        try {
            if (!configData || Object.keys(configData).length === 0) {
                LogController.logError(req, 'config.upsert', 'error: config data is required');
                const message = global.i18n.translate(req, 'controller.config.configDataRequired');
                return global.CommonUtils.sendError(req, res, 400, message, 'MISSING_DATA');
            }
            // Add updatedBy from session (when authentication is implemented)
            if (req.session && req.session.user) {
                configData.updatedBy = req.session.user.id || req.session.user.loginId || '';
            }

            // Check if config exists to determine if this is create or update (full doc for self-lockout check)
            const existingConfig = await ConfigModel.findById(id, true);
            const isUpdate = !!existingConfig;

            // W-147: Self-lockout prevention on upsert (when updating)
            const incomingGeneral = configData?.data?.general;
            if (isUpdate && incomingGeneral && Array.isArray(incomingGeneral.adminRoles)) {
                const currentAdminRoles = existingConfig.data?.general?.adminRoles ?? [];
                const userRoles = req.session?.user?.roles ?? [];
                const userCurrentAdminRoles = userRoles.filter(r => currentAdminRoles.includes(r));
                const userWouldKeepAdmin = userCurrentAdminRoles.some(r => incomingGeneral.adminRoles.includes(r));
                if (userCurrentAdminRoles.length > 0 && !userWouldKeepAdmin) {
                    LogController.logError(req, 'config.upsert', 'error: self-lockout attempt rejected');
                    const message = global.i18n.translate(req, 'controller.config.configGeneralSelfLockout');
                    return global.CommonUtils.sendError(req, res, 400, message, 'SELF_LOCKOUT');
                }
            }

            const config = await ConfigModel.upsert(id, configData);

            // W-147: Update effective general cache when default config is upserted
            if (id === defaultDocName && config?.data?.general) {
                ConfigModel.setEffectiveGeneralCache(config.data.general);
            }

            // W-088: Publish generic config change event (notification-only pattern)
            // Subscribers (e.g., HandlebarController) will fetch fresh data from DB
            try {
                const action = isUpdate ? 'update' : 'create';
                await global.RedisManager.publishBroadcast('controller:config:data:changed', {
                    id: id,
                    action: action,
                    timestamp: Date.now()
                });
                LogController.logInfo(req, 'config.upsert', `Config change event published for id: ${id}`);
            } catch (error) {
                // Don't fail the upsert if event publish fails
                LogController.logError(req, 'config.upsert', `Config change event failed: ${error.message}`);
            }

            // Log the change (create or update)
            const action = isUpdate ? 'update' : 'create';
            const oldConfig = isUpdate ? existingConfig : null;
            await LogController.logChange(req, 'config', action, id, oldConfig, config);

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
        // Resolve _default to actual default doc name
        const defaultDocName = ConfigController.getDefaultDocName();
        let id = req.params.id && req.params.id.trim();
        if (id === '_default' || !id) {
            id = defaultDocName;
        }
        LogController.logRequest(req, 'config.delete', id || '');
        try {
            if (!id) {
                LogController.logError(req, 'config.delete', 'error: id is required');
                const message = global.i18n.translate(req, 'controller.config.configIdRequired');
                return global.CommonUtils.sendError(req, res, 400, message, 'MISSING_ID');
            }

            // Get document before deletion for logging
            const oldConfig = await ConfigModel.findById(id, true);
            if (!oldConfig) {
                LogController.logError(req, 'config.delete', `error: config not found for id: ${id}`);
                const message = global.i18n.translate(req, 'controller.config.configNotFound', { id });
                return global.CommonUtils.sendError(req, res, 404, message, 'CONFIG_NOT_FOUND');
            }

            const deleted = await ConfigModel.deleteById(id);

            // W-088: Publish generic config change event (notification-only pattern)
            // Subscribers (e.g., HandlebarController) will fetch fresh data from DB
            try {
                await global.RedisManager.publishBroadcast('controller:config:data:changed', {
                    id: id,
                    action: 'delete',
                    timestamp: Date.now()
                });
                LogController.logInfo(req, 'config.delete', `Config change event published for id: ${id}`);
            } catch (error) {
                // Don't fail the delete if event publish fails
                LogController.logError(req, 'config.delete', `Config change event failed: ${error.message}`);
            }

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
