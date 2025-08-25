/**
 * @name            jPulse Framework / WebApp / Model / Config
 * @tagline         Config Model for jPulse Framework WebApp
 * @description     This is the config model for the jPulse Framework WebApp using native MongoDB driver
 * @file            webapp/model/config.js
 * @version         0.2.0
 * @release         2025-08-25
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import database from '../database.js';

/**
 * Config Model - handles site admin configuration with native MongoDB driver
 * Supports flat hierarchy: global config with department overrides
 */
class ConfigModel {
    /**
     * Schema definition for validation
     */
    static schema = {
        _id: { type: 'string', required: true },
        parent: { type: 'string', default: null },
        data: {
            email: {
                adminEmail: { type: 'string', default: '', validate: 'email' },
                adminName: { type: 'string', default: '' },
                smtpServer: { type: 'string', default: 'localhost' },
                smtpUser: { type: 'string', default: '' },
                smtpPass: { type: 'string', default: '' },
                useTls: { type: 'boolean', default: false }
            },
            messages: {
                broadcast: { type: 'string', default: '' }
            }
        },
        createdAt: { type: 'date', auto: true },
        updatedAt: { type: 'date', auto: true },
        updatedBy: { type: 'string', default: '' },
        docVersion: { type: 'number', default: 1 },
        saveCount: { type: 'number', default: 1, autoIncrement: true }
    };

    /**
     * Get MongoDB collection
     * @returns {Collection} MongoDB collection instance
     */
    static getCollection() {
        const db = database.getDb();
        if (!db) {
            throw new Error('Database connection not available');
        }
        return db.collection('configs');
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid email format
     */
    static isValidEmail(email) {
        if (!email || email === '') return true; // Empty email is allowed
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate config data against schema
     * @param {object} data - Config data to validate
     * @param {boolean} isUpdate - Whether this is an update operation
     * @throws {Error} Validation error with details
     */
    static validate(data, isUpdate = false) {
        const errors = [];

        // Validate _id (required for create, optional for update)
        if (!isUpdate && (!data._id || typeof data._id !== 'string')) {
            errors.push('_id is required and must be a string');
        }

        // Validate parent (optional, but must be string if provided)
        if (data.parent !== undefined && data.parent !== null && typeof data.parent !== 'string') {
            errors.push('parent must be a string or null');
        }

        // Validate data structure
        if (data.data) {
            // Validate email settings
            if (data.data.email) {
                const email = data.data.email;
                if (email.adminEmail !== undefined && typeof email.adminEmail !== 'string') {
                    errors.push('data.email.adminEmail must be a string');
                }
                if (email.adminEmail && !this.isValidEmail(email.adminEmail)) {
                    errors.push('data.email.adminEmail must be a valid email format');
                }
                if (email.adminName !== undefined && typeof email.adminName !== 'string') {
                    errors.push('data.email.adminName must be a string');
                }
                if (email.smtpServer !== undefined && typeof email.smtpServer !== 'string') {
                    errors.push('data.email.smtpServer must be a string');
                }
                if (email.smtpUser !== undefined && typeof email.smtpUser !== 'string') {
                    errors.push('data.email.smtpUser must be a string');
                }
                if (email.smtpPass !== undefined && typeof email.smtpPass !== 'string') {
                    errors.push('data.email.smtpPass must be a string');
                }
                if (email.useTls !== undefined && typeof email.useTls !== 'boolean') {
                    errors.push('data.email.useTls must be a boolean');
                }
            }

            // Validate messages settings
            if (data.data.messages) {
                const messages = data.data.messages;
                if (messages.broadcast !== undefined && typeof messages.broadcast !== 'string') {
                    errors.push('data.messages.broadcast must be a string');
                }
            }
        }

        // Validate metadata fields
        if (data.updatedBy !== undefined && typeof data.updatedBy !== 'string') {
            errors.push('updatedBy must be a string');
        }
        if (data.docVersion !== undefined && (typeof data.docVersion !== 'number' || data.docVersion < 1)) {
            errors.push('docVersion must be a number >= 1');
        }
        if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
        }
    }

    /**
     * Apply default values to config data
     * @param {object} data - Config data
     * @returns {object} Data with defaults applied
     */
    static applyDefaults(data) {
        const result = { ...data };

        // Apply data structure defaults
        if (!result.data) result.data = {};

        // Apply email defaults
        if (!result.data.email) result.data.email = {};
        if (result.data.email.adminEmail === undefined) result.data.email.adminEmail = '';
        if (result.data.email.adminName === undefined) result.data.email.adminName = '';
        if (result.data.email.smtpServer === undefined) result.data.email.smtpServer = 'localhost';
        if (result.data.email.smtpUser === undefined) result.data.email.smtpUser = '';
        if (result.data.email.smtpPass === undefined) result.data.email.smtpPass = '';
        if (result.data.email.useTls === undefined) result.data.email.useTls = false;

        // Apply messages defaults
        if (!result.data.messages) result.data.messages = {};
        if (result.data.messages.broadcast === undefined) result.data.messages.broadcast = '';

        // Apply metadata defaults
        if (result.parent === undefined) result.parent = null;
        if (result.updatedBy === undefined) result.updatedBy = '';
        if (result.docVersion === undefined) result.docVersion = 1;

        return result;
    }

    /**
     * Prepare data for save operation (add timestamps, increment saveCount)
     * @param {object} data - Config data
     * @param {boolean} isUpdate - Whether this is an update operation
     * @returns {object} Data prepared for save
     */
    static prepareSaveData(data, isUpdate = false) {
        const result = { ...data };
        const now = new Date();
        result.updatedAt = now;
        if (!isUpdate) {
            result.createdAt = now;
            result.saveCount = 1;
        }
        return result;
    }

    /**
     * Find config by ID
     * @param {string} id - Config ID
     * @returns {Promise<object|null>} Config document or null if not found
     */
    static async findById(id) {
        try {
            const collection = this.getCollection();
            const result = await collection.findOne({ _id: id });
            return result;
        } catch (error) {
            throw new Error(`Failed to find config by ID: ${error.message}`);
        }
    }

    /**
     * Find all configs
     * @param {object} filter - MongoDB filter object
     * @returns {Promise<Array>} Array of config documents
     */
    static async find(filter = {}) {
        try {
            const collection = this.getCollection();
            const result = await collection.find(filter).toArray();
            return result;
        } catch (error) {
            throw new Error(`Failed to find configs: ${error.message}`);
        }
    }

    /**
     * Create new config
     * @param {object} data - Config data
     * @returns {Promise<object>} Created config document
     */
    static async create(data) {
        try {
            // Validate data
            this.validate(data, false);

            // Apply defaults and prepare for save
            let configData = this.applyDefaults(data);
            configData = this.prepareSaveData(configData, false);

            // Insert into database
            const collection = this.getCollection();
            const result = await collection.insertOne(configData);

            if (!result.acknowledged) {
                throw new Error('Failed to insert config document');
            }

            // Return the created document
            return await this.findById(configData._id);
        } catch (error) {
            throw new Error(`Failed to create config: ${error.message}`);
        }
    }

    /**
     * Update config by ID
     * @param {string} id - Config ID
     * @param {object} data - Update data
     * @returns {Promise<object|null>} Updated config document or null if not found
     */
    static async updateById(id, data) {
        try {
            // Validate update data
            this.validate(data, true);

            // Get current document to increment saveCount
            const current = await this.findById(id);
            if (!current) {
                return null;
            }

            // Prepare update data
            let updateData = this.prepareSaveData(data, true);
            updateData.saveCount = (current.saveCount || 0) + 1;

            // Update in database
            const collection = this.getCollection();
            const result = await collection.updateOne(
                { _id: id },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return null;
            }

            // Return updated document
            return await this.findById(id);
        } catch (error) {
            throw new Error(`Failed to update config: ${error.message}`);
        }
    }

    /**
     * Delete config by ID
     * @param {string} id - Config ID
     * @returns {Promise<boolean>} True if deleted, false if not found
     */
    static async deleteById(id) {
        try {
            const collection = this.getCollection();
            const result = await collection.deleteOne({ _id: id });
            return result.deletedCount > 0;
        } catch (error) {
            throw new Error(`Failed to delete config: ${error.message}`);
        }
    }

    /**
     * Get effective config by resolving inheritance chain
     * @param {string} id - Config ID
     * @returns {Promise<object|null>} Merged config with inheritance resolved
     */
    static async getEffectiveConfig(id) {
        try {
            const config = await this.findById(id);
            if (!config) {
                return null;
            }

            // If no parent, return as-is
            if (!config.parent) {
                return config;
            }

            // Get parent config recursively
            const parentConfig = await this.getEffectiveConfig(config.parent);
            if (!parentConfig) {
                // Parent not found, return current config
                return config;
            }

            // Merge parent and current config (current overrides parent)
            const mergedData = {
                email: {
                    ...parentConfig.data.email,
                    ...config.data.email
                },
                messages: {
                    ...parentConfig.data.messages,
                    ...config.data.messages
                }
            };

            // Return merged config with current metadata
            return {
                ...config,
                data: mergedData,
                _effectiveParent: parentConfig._id
            };
        } catch (error) {
            throw new Error(`Failed to get effective config: ${error.message}`);
        }
    }

    /**
     * Create or update config (upsert operation)
     * @param {string} id - Config ID
     * @param {object} data - Config data
     * @returns {Promise<object>} Created or updated config document
     */
    static async upsert(id, data) {
        try {
            const existing = await this.findById(id);

            if (existing) {
                return await this.updateById(id, data);
            } else {
                return await this.create({ ...data, _id: id });
            }
        } catch (error) {
            throw new Error(`Failed to upsert config: ${error.message}`);
        }
    }
}

export default ConfigModel;

// EOF config.js
