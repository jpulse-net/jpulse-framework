/**
 * @name            Bubble Framework / WebApp / Controller / Config
 * @tagline         Config Controller for Bubble Framework WebApp
 * @description     This is the config controller for the Bubble Framework WebApp
 * @file            webapp/controller/config.js
 * @version         0.1.4
 * @release         2025-08-24
 * @repository      https://github.com/peterthoeny/bubble-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import ConfigModel from '../model/config.js';
import LogController from './log.js';

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
    static async getConfig(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'Config ID is required',
                    code: 'MISSING_ID'
                });
            }
            const config = await ConfigModel.findById(id);
            if (!config) {
                return res.status(404).json({
                    success: false,
                    error: `Config with ID '${id}' not found`,
                    code: 'CONFIG_NOT_FOUND'
                });
            }
            res.json({
                success: true,
                data: config,
                message: `Config '${id}' retrieved successfully`
            });

        } catch (error) {
            console.error('Error getting config:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while retrieving config',
                code: 'INTERNAL_ERROR',
                details: error.message
            });
        }
    }

    /**
     * Get effective config by ID (with inheritance resolved)
     * GET /api/1/config/:id/effective
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async getEffectiveConfig(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'Config ID is required',
                    code: 'MISSING_ID'
                });
            }
            const config = await ConfigModel.getEffectiveConfig(id);
            if (!config) {
                return res.status(404).json({
                    success: false,
                    error: `Config with ID '${id}' not found`,
                    code: 'CONFIG_NOT_FOUND'
                });
            }
            res.json({
                success: true,
                data: config,
                message: `Effective config '${id}' retrieved successfully`
            });

        } catch (error) {
            console.error('Error getting effective config:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while retrieving effective config',
                code: 'INTERNAL_ERROR',
                details: error.message
            });
        }
    }

    /**
     * List all configs
     * GET /api/1/config
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async listConfigs(req, res) {
        try {
            const { parent } = req.query;
            const filter = {};

            // Filter by parent if specified
            if (parent !== undefined) {
                filter.parent = parent === 'null' ? null : parent;
            }
            const configs = await ConfigModel.find(filter);
            res.json({
                success: true,
                data: configs,
                count: configs.length,
                message: `Retrieved ${configs.length} config(s)`
            });

        } catch (error) {
            console.error('Error listing configs:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while listing configs',
                code: 'INTERNAL_ERROR',
                details: error.message
            });
        }
    }

    /**
     * Create new config
     * POST /api/1/config
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async createConfig(req, res) {
        try {
            LogController.consoleApi(req, `config.create( ${JSON.stringify(req.body)} )`);

            const configData = req.body;
            if (!configData || Object.keys(configData).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Config data is required',
                    code: 'MISSING_DATA'
                });
            }
            // Add updatedBy from session (when authentication is implemented)
            if (req.session && req.session.user) {
                configData.updatedBy = req.session.user.id || req.session.user.loginId || '';
            }
            const config = await ConfigModel.create(configData);

            // Log the creation
            await LogController.logChange(req, 'config', 'create', config._id, null, config);

            res.status(201).json({
                success: true,
                data: config,
                message: `Config '${config._id}' created successfully`
            });

        } catch (error) {
            LogController.error(req, `Config creation failed: ${error.message}`);
            if (error.message.includes('Validation failed')) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: error.message
                });
            }
            if (error.message.includes('duplicate key') || error.code === 11000) {
                return res.status(409).json({
                    success: false,
                    error: 'Config with this ID already exists',
                    code: 'DUPLICATE_ID'
                });
            }
            res.status(500).json({
                success: false,
                error: 'Internal server error while creating config',
                code: 'INTERNAL_ERROR',
                details: error.message
            });
        }
    }

    /**
     * Update config by ID
     * PUT /api/1/config/:id
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async updateConfig(req, res) {
        try {
            LogController.consoleApi(req, `config.update( ${req.params.id}, ${JSON.stringify(req.body)} )`);

            const { id } = req.params;
            const updateData = req.body;
            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'Config ID is required',
                    code: 'MISSING_ID'
                });
            }
            if (!updateData || Object.keys(updateData).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Update data is required',
                    code: 'MISSING_DATA'
                });
            }

            // Get old document for logging
            const oldConfig = await ConfigModel.findById(id);
            if (!oldConfig) {
                return res.status(404).json({
                    success: false,
                    error: `Config with ID '${id}' not found`,
                    code: 'CONFIG_NOT_FOUND'
                });
            }

            // Add updatedBy from session (when authentication is implemented)
            if (req.session && req.session.user) {
                updateData.updatedBy = req.session.user.id || req.session.user.loginId || '';
            }
            const config = await ConfigModel.updateById(id, updateData);

            // Log the update
            await LogController.logChange(req, 'config', 'update', id, oldConfig, config);

            res.json({
                success: true,
                data: config,
                message: `Config '${id}' updated successfully`
            });

        } catch (error) {
            LogController.error(req, `Config update failed: ${error.message}`);
            if (error.message.includes('Validation failed')) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: error.message
                });
            }
            res.status(500).json({
                success: false,
                error: 'Internal server error while updating config',
                code: 'INTERNAL_ERROR',
                details: error.message
            });
        }
    }

    /**
     * Create or update config (upsert)
     * PUT /api/1/config/:id/upsert
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async upsertConfig(req, res) {
        try {
            const { id } = req.params;
            const configData = req.body;
            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'Config ID is required',
                    code: 'MISSING_ID'
                });
            }
            if (!configData || Object.keys(configData).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Config data is required',
                    code: 'MISSING_DATA'
                });
            }
            // Add updatedBy from session (when authentication is implemented)
            if (req.session && req.session.user) {
                configData.updatedBy = req.session.user.id || req.session.user.loginId || '';
            }
            const config = await ConfigModel.upsert(id, configData);
            res.json({
                success: true,
                data: config,
                message: `Config '${id}' saved successfully`
            });

        } catch (error) {
            console.error('Error upserting config:', error);
            if (error.message.includes('Validation failed')) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: error.message
                });
            }
            res.status(500).json({
                success: false,
                error: 'Internal server error while saving config',
                code: 'INTERNAL_ERROR',
                details: error.message
            });
        }
    }

    /**
     * Delete config by ID
     * DELETE /api/1/config/:id
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async deleteConfig(req, res) {
        try {
            LogController.consoleApi(req, `config.delete( ${req.params.id} )`);

            const { id } = req.params;
            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'Config ID is required',
                    code: 'MISSING_ID'
                });
            }

            // Get document before deletion for logging
            const oldConfig = await ConfigModel.findById(id);
            if (!oldConfig) {
                return res.status(404).json({
                    success: false,
                    error: `Config with ID '${id}' not found`,
                    code: 'CONFIG_NOT_FOUND'
                });
            }

            const deleted = await ConfigModel.deleteById(id);

            // Log the deletion
            await LogController.logChange(req, 'config', 'delete', id, oldConfig, null);

            res.json({
                success: true,
                message: `Config '${id}' deleted successfully`
            });

        } catch (error) {
            LogController.error(req, `Config deletion failed: ${error.message}`);
            res.status(500).json({
                success: false,
                error: 'Internal server error while deleting config',
                code: 'INTERNAL_ERROR',
                details: error.message
            });
        }
    }
}

export default ConfigController;

// EOF config.js
