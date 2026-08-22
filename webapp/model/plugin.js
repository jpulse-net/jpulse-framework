/**
 * @name            jPulse Framework / WebApp / Model / Plugin
 * @tagline         Plugin Model for jPulse Framework WebApp
 * @description     Plugin configuration model for the jPulse Framework WebApp using native MongoDB driver
 * @file            webapp/model/plugin.js
 * @version         1.7.16
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.15, Grok 4.6
 */

import database from '../database.js';
import CommonUtils from '../utils/common.js';

/**
 * Plugin Model - handles plugin configurations with native MongoDB driver
 * Stores site-specific plugin configuration in pluginConfigs collection
 */
class PluginModel {
    /**
     * Schema definition for validation
     */
    static schema = {
        _id: { type: 'objectId', auto: true },
        name: { type: 'string', required: true, unique: true },
        enabled: { type: 'boolean', default: true },
        config: { type: 'object', default: {} },
        installedAt: { type: 'date', auto: true },
        lastModified: { type: 'date', auto: true },
        modifiedBy: { type: 'string', default: '' },
        version: { type: 'string', default: '' },
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
        return db.collection('pluginConfigs');
    }

    /**
     * Validate plugin config against plugin.json schema
     * @param {string} pluginName - Plugin name
     * @param {object} config - Configuration to validate
     * @param {object} schema - Config schema from plugin.json
     * @returns {object} Validation result { valid: boolean, errors: array }
     */
    static validateConfig(pluginName, config, schema) {
        const errors = [];

        if (!schema || !Array.isArray(schema)) {
            return { valid: true, errors: [] }; // No schema to validate against
        }

        for (const field of schema) {
            const value = config[field.id];

            // Check required fields
            if (field.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field.label} is required`);
                continue;
            }

            // Skip validation if value is undefined/null and not required
            if (value === undefined || value === null) {
                continue;
            }

            // Type validation
            switch (field.type) {
                case 'text':
                case 'password':
                    if (typeof value !== 'string') {
                        errors.push(`${field.label} must be a string`);
                    }
                    break;

                case 'number':
                    if (typeof value !== 'number') {
                        errors.push(`${field.label} must be a number`);
                    }
                    break;

                case 'boolean':
                    if (typeof value !== 'boolean') {
                        errors.push(`${field.label} must be a boolean`);
                    }
                    break;

                case 'select':
                    if (field.options) {
                        const validValues = field.options.map(opt => typeof opt === 'string' ? opt : opt.value);
                        if (!validValues.includes(value)) {
                            const labels = field.options.map(opt => typeof opt === 'string' ? opt : opt.label || opt.value);
                            errors.push(`${field.label} must be one of: ${labels.join(', ')}`);
                        }
                    }
                    break;

                case 'custom':
                    // W-194: escape hatch — value is opaque JSON owned by the plugin's renderer.
                    // The framework does not know its shape, so no type check applies here;
                    // the renderer is responsible for its own client-side validation.
                    break;
            }

            // Pattern validation (skipped for 'custom' — its value isn't necessarily a string,
            // and any validation regex would be meaningless against opaque plugin-owned JSON)
            if (field.type !== 'custom' && field.validation && typeof value === 'string') {
                try {
                    const regex = new RegExp(field.validation);
                    if (!regex.test(value)) {
                        errors.push(`${field.label} format is invalid`);
                    }
                } catch (e) {
                    // Invalid regex in plugin.json - skip validation but don't fail
                    errors.push(`${field.label} has invalid validation pattern in plugin configuration`);
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Get plugin config by name
     * @param {string} name - Plugin name
     * @returns {object|null} Plugin config or null
     */
    static async getByName(name) {
        try {
            const collection = this.getCollection();
            const doc = await collection.findOne({ name: name });
            return doc;
        } catch (error) {
            throw new Error(`Failed to get plugin config for ${name}: ${error.message}`);
        }
    }

    /**
     * Get all plugin configs
     * @returns {array} Array of plugin configs
     */
    static async getAll() {
        try {
            const collection = this.getCollection();
            const docs = await collection.find({}).toArray();
            return docs;
        } catch (error) {
            throw new Error(`Failed to get all plugin configs: ${error.message}`);
        }
    }

    /**
     * Create or update plugin config
     * @param {string} name - Plugin name
     * @param {object} configData - Configuration data
     * @param {string} modifiedBy - User who modified the config
     * @returns {object} Result with _id
     */
    static async upsert(name, configData, modifiedBy = '') {
        try {
            const collection = this.getCollection();
            const now = new Date();

            // Check if config exists
            const existing = await collection.findOne({ name: name });

            if (existing) {
                // Update existing config
                const updateDoc = {
                    $set: {
                        config: configData,
                        lastModified: now,
                        modifiedBy: modifiedBy
                    },
                    $inc: {
                        saveCount: 1,
                        docVersion: 1
                    }
                };

                const result = await collection.updateOne(
                    { name: name },
                    updateDoc
                );

                // W-045-TD-19: Validate database operation result
                if (!result.acknowledged) {
                    throw new Error(`Database operation not acknowledged for plugin '${name}'`);
                }

                if (result.matchedCount === 0) {
                    throw new Error(`Plugin config '${name}' not found for update`);
                }

                return {
                    _id: existing._id,
                    name: name,
                    modified: result.modifiedCount > 0
                };
            } else {
                // Create new config
                const newDoc = {
                    name: name,
                    enabled: true,
                    config: configData,
                    installedAt: now,
                    lastModified: now,
                    modifiedBy: modifiedBy,
                    version: '',
                    docVersion: 1,
                    saveCount: 1
                };

                const result = await collection.insertOne(newDoc);

                // W-045-TD-19: Validate database operation result
                if (!result.acknowledged) {
                    throw new Error(`Database operation not acknowledged for plugin '${name}'`);
                }

                if (!result.insertedId) {
                    throw new Error(`Failed to insert plugin config for '${name}' - no insertedId returned`);
                }

                return {
                    _id: result.insertedId,
                    name: name,
                    modified: true
                };
            }
        } catch (error) {
            throw new Error(`Failed to upsert plugin config for ${name}: ${error.message}`);
        }
    }

    /**
     * Update enabled status
     * @param {string} name - Plugin name
     * @param {boolean} enabled - Enabled status
     * @returns {boolean} True if updated
     */
    static async setEnabled(name, enabled) {
        try {
            const collection = this.getCollection();
            const result = await collection.updateOne(
                { name: name },
                {
                    $set: {
                        enabled: enabled,
                        lastModified: new Date()
                    }
                }
            );

            return result.modifiedCount > 0;
        } catch (error) {
            throw new Error(`Failed to set enabled status for ${name}: ${error.message}`);
        }
    }

    /**
     * Delete plugin config
     * @param {string} name - Plugin name
     * @returns {boolean} True if deleted
     */
    static async delete(name) {
        try {
            const collection = this.getCollection();
            const result = await collection.deleteOne({ name: name });

            // W-045-TD-19: Validate database operation result
            if (!result.acknowledged) {
                throw new Error(`Database operation not acknowledged for plugin '${name}'`);
            }

            if (result.deletedCount === 0) {
                throw new Error(`Plugin config '${name}' not found for deletion`);
            }

            return result.deletedCount > 0;
        } catch (error) {
            throw new Error(`Failed to delete plugin config for ${name}: ${error.message}`);
        }
    }

    /**
     * Ensure indexes exist on the pluginConfigs collection
     * Create unique index on name field
     * Called during application initialization
     * @param {boolean} isTest - Whether this is a test environment (allows graceful skip if DB unavailable)
     */
    static async ensureIndexes(isTest = false) {
        try {
            // Check if database is available
            const db = database.getDb();
            if (!db) {
                if (isTest) {
                    // In test mode, gracefully skip if database is not available
                    return;
                }
                // In production, database is required
                throw new Error('Database connection not available');
            }

            const collection = db.collection('pluginConfigs');
            await collection.createIndex({ name: 1 }, { unique: true });
        } catch (error) {
            throw new Error(`Failed to create plugin config indexes: ${error.message}`);
        }
    }

    /**
     * Placeholder returned in place of a set sensitive value. Empty string means unset.
     * Must match ConfigModel.SENSITIVE_MASK.
     */
    static SENSITIVE_MASK = '********';

    /**
     * Whether a plugin.json field definition is a secret.
     * `sensitive: true` or `type`/`inputType` `'password'`; `sensitive: false` is the escape hatch.
     * @param {object} fieldDef - Flat plugin schema field
     * @returns {boolean}
     */
    static isSensitiveField(fieldDef) {
        if (!fieldDef || typeof fieldDef !== 'object') return false;
        if (fieldDef.sensitive === false) return false;
        return fieldDef.sensitive === true
            || fieldDef.type === 'password'
            || fieldDef.inputType === 'password';
    }

    /**
     * Field ids marked sensitive on a plugin.json config schema.
     * @param {Array<object>} schema - Flat plugin.json schema array
     * @returns {string[]}
     */
    static getSensitiveFieldIds(schema) {
        if (!Array.isArray(schema)) return [];
        return schema
            .filter((field) => field && field.id && this.isSensitiveField(field))
            .map((field) => field.id);
    }

    /**
     * True when value is the sensitive-field mask (echoed read, must not be stored).
     * @param {*} value
     * @returns {boolean}
     */
    static isSensitiveMask(value) {
        return value === this.SENSITIVE_MASK;
    }

    /**
     * Clone a flat plugin config map and replace every non-empty sensitive string
     * with SENSITIVE_MASK. Empty / missing values stay as they are.
     * @param {object} values - Flat key/value config
     * @param {Array<object>} schema - Plugin.json config schema
     * @returns {object} Masked clone
     */
    static maskSensitive(values, schema) {
        if (values == null || typeof values !== 'object') return values;
        const clone = JSON.parse(JSON.stringify(values));
        const mask = this.SENSITIVE_MASK;
        for (const id of this.getSensitiveFieldIds(schema)) {
            const value = clone[id];
            if (typeof value === 'string' && value !== '') {
                clone[id] = mask;
            }
        }
        return clone;
    }

    /**
     * Resolve absent / mask / clear / set on sensitive fields before validate and
     * onPluginConfigBeforeSave. Mutates `submitted` in place.
     * Absent or mask → keep stored value; empty string → clear; anything else → store.
     * @param {object} submitted - Incoming flat config (the PUT body)
     * @param {object} oldValues - Currently stored flat config
     * @param {Array<object>} schema - Plugin.json config schema
     * @returns {object} The same submitted object
     */
    static applySensitiveWrites(submitted, oldValues, schema) {
        if (submitted == null || typeof submitted !== 'object') return submitted;
        const old = (oldValues && typeof oldValues === 'object') ? oldValues : {};
        for (const id of this.getSensitiveFieldIds(schema)) {
            if (!Object.prototype.hasOwnProperty.call(submitted, id)
                || this.isSensitiveMask(submitted[id])) {
                if (Object.prototype.hasOwnProperty.call(old, id)) {
                    submitted[id] = old[id];
                } else {
                    delete submitted[id];
                }
            }
        }
        return submitted;
    }

    /**
     * Read one stored secret for a plugin. Server-side accessor — the HTTP reveal
     * path validates the field id first. Returns '' when unset.
     * @param {string} name - Plugin name
     * @param {string} fieldId - Schema field id
     * @returns {Promise<*>} Stored value, or ''
     */
    static async getSecret(name, fieldId) {
        const doc = await this.getByName(name);
        const value = doc?.config?.[fieldId];
        return (value === undefined || value === null) ? '' : value;
    }
}

export default PluginModel;

// EOF webapp/model/plugin.js
