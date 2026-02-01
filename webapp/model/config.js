/**
 * @name            jPulse Framework / WebApp / Model / Config
 * @tagline         Config Model for jPulse Framework WebApp
 * @description     This is the config model for the jPulse Framework WebApp using native MongoDB driver
 * @file            webapp/model/config.js
 * @version         1.6.4
 * @release         2026-02-01
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 2.2, Claude Sonnet 4.5
 */

import database from '../database.js';
import CommonUtils from '../utils/common.js';

/**
 * Config Model - handles site admin configuration with native MongoDB driver
 * Supports flat hierarchy: global config with department overrides
 * W-147: Extendable schema (baseSchema + extendSchema), same pattern as UserModel
 */
class ConfigModel {
    /**
     * Base schema definition (framework)
     * W-147: Includes data.general (roles, adminRoles); extended by plugins/sites via extendSchema()
     */
    static baseSchema = {
        _id: { type: 'string', required: true },
        parent: { type: 'string', default: null },
        data: {
            general: {
                _meta: { order: 0 },   // W-147: tab order (data-driven config UI)
                roles: { type: 'array', default: ['user', 'admin', 'root'] },
                adminRoles: { type: 'array', default: ['admin', 'root'] }
            },
            email: {
                _meta: { order: 10 },
                adminEmail: { type: 'string', default: '', validate: 'email' },
                adminName: { type: 'string', default: '' },
                smtpServer: { type: 'string', default: 'localhost' },
                smtpPort: { type: 'number', default: 25 },
                smtpUser: { type: 'string', default: '' },
                smtpPass: { type: 'string', default: '' },
                useTls: { type: 'boolean', default: false }
            },
            broadcast: {
                _meta: { order: 20 },
                enable: { type: 'boolean', default: false },
                message: { type: 'string', default: '' },     // broadcast message
                nagTime: { type: 'number', default: 4 },      // hours, 0 to disable
                disableTime: { type: 'number', default: 0 },  // hours, 0 for no auto-disable
                enabledAt: { type: 'date', default: null }    // timestamp of when enabled
            },
            manifest: {
                _meta: { order: 30 },
                // W-137+: Site manifest, used for jpulse.net integration and services
                // On schema change, fix ensureManifestDefaults, applyDefaults, updateById functions
                // and /admin/config.shtml view.
                license: {
                    key: { type: 'string', default: '' },     // Commercial license key
                    tier: { type: 'string', default: 'bsl',
                        enum: ['bsl', 'commercial', 'enterprise'] }
                },
                compliance: {
                    siteUuid: { type: 'string', default: '',
                        pattern: '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' },
                    adminEmailOptIn: { type: 'boolean', default: false }
                }
            }
        },
        createdAt: { type: 'date', auto: true },
        updatedAt: { type: 'date', auto: true },
        updatedBy: { type: 'string', default: '' },
        docVersion: { type: 'number', default: 1 },
        saveCount: { type: 'number', default: 1, autoIncrement: true },
        _meta: {
            contextFilter: {
                withoutAuth: [
                    'data.email.smtp*',         // Remove all smtp fields for unauthenticated users
                    'data.email.*pass',         // Remove any password fields
                    'data.manifest.license.key' // W-137: Never expose license key
                ],
                withAuth: [
                    'data.email.smtpPass',      // Even authenticated users shouldn't see password
                    'data.manifest.license.key' // W-137: Never expose license key (even to admins)
                ]
            }
        }
    };

    /**
     * Extended schema (base + plugin/site extensions) - computed at init
     */
    static schema = null;

    /**
     * Schema extensions registry (applied in order)
     * Each extension is the raw object passed to extendSchema()
     */
    static schemaExtensions = [];

    /**
     * Initialize schema with plugin/site extensions
     * Called during bootstrap after plugins are loaded
     */
    static initializeSchema() {
        let schema = CommonUtils.deepMerge({}, this.baseSchema);
        for (const extension of this.schemaExtensions) {
            schema = this.applySchemaExtension(schema, extension);
        }
        this.schema = schema;
    }

    /**
     * Deep merge extension into schema (extension blocks go under schema.data)
     * @param {object} schema - Current schema
     * @param {object} extension - Extension to apply, e.g. { myBlock: { _meta: {}, field: {} } }
     * @returns {object} Merged schema
     */
    static applySchemaExtension(schema, extension) {
        if (!schema.data) schema.data = {};
        for (const [blockKey, blockDef] of Object.entries(extension)) {
            if (blockKey.startsWith('_') || typeof blockDef !== 'object' || blockDef === null) continue;
            schema.data[blockKey] = CommonUtils.deepMerge(schema.data[blockKey] || {}, blockDef);
        }
        return schema;
    }

    /**
     * Plugin/site API to extend config schema (tab-scope: each extension = new tab)
     * @param {object} extension - Schema extension, e.g. { myBlock: { _meta: { tabLabel, order }, field1: {...} } }
     */
    static extendSchema(extension) {
        this.schemaExtensions.push(extension);
        if (this.schema !== null) {
            this.initializeSchema();
        }
    }

    /**
     * Get current schema (extended)
     * @returns {object} Current schema (baseSchema if not yet initialized)
     */
    static getSchema() {
        return this.schema !== null ? this.schema : this.baseSchema;
    }

    /**
     * W-147: In-memory cache for effective roles (per-instance; multi-server: re-read from DB when cache empty or invalidated)
     */
    static _effectiveGeneralCache = { roles: ['user', 'admin', 'root'], adminRoles: ['admin', 'root'] };

    /**
     * W-147: Set effective general cache (called from HealthController.initialize and ConfigController after PUT)
     * @param {object} general - data.general object with roles and adminRoles arrays
     */
    static setEffectiveGeneralCache(general) {
        if (general && Array.isArray(general.roles) && Array.isArray(general.adminRoles)) {
            const sortRoles = (arr) => [...arr].sort((a, b) => String(a).localeCompare(String(b)));
            this._effectiveGeneralCache = { roles: sortRoles(general.roles), adminRoles: sortRoles(general.adminRoles) };
        }
    }

    /**
     * W-147: Clear effective general cache (e.g. after config update on another instance; next get will use fallback until refreshed)
     */
    static clearEffectiveGeneralCache() {
        this._effectiveGeneralCache = { roles: ['user', 'admin', 'root'], adminRoles: ['admin', 'root'] };
    }

    /**
     * W-147: Get effective admin roles (from cache; fallback to default when cache not populated)
     * @returns {string[]} Array of role codes that count as admin
     */
    static getEffectiveAdminRoles() {
        const arr = this._effectiveGeneralCache?.adminRoles ?? ['admin', 'root'];
        return [...arr].sort((a, b) => String(a).localeCompare(String(b)));
    }

    /**
     * W-147: Get effective roles (from cache; fallback to default when cache not populated)
     * @returns {string[]} Array of role codes assignable at this config level
     */
    static getEffectiveRoles() {
        const arr = this._effectiveGeneralCache?.roles ?? ['user', 'admin', 'root'];
        return [...arr].sort((a, b) => String(a).localeCompare(String(b)));
    }

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
     * W-137: Ensure manifest structure exists with schema defaults
     * Atomic operation that initializes missing manifest fields from schema
     * Safe for concurrent calls (race condition safe)
     *
     * @param {string} id - Config document ID (typically 'global')
     * @param {object} overrides - Optional field overrides (e.g., { 'compliance.siteUuid': 'abc-123' })
     * @returns {Promise<object>} Updated config document with complete manifest
     */
    static async ensureManifestDefaults(id, overrides = {}) {
        try {
            const collection = this.getCollection();

            // Read current document
            const current = await collection.findOne({ _id: id });
            if (!current) {
                throw new Error(`Config document not found: ${id}`);
            }

            // Extract manifest schema defaults from schema definition (W-147: getSchema() for extensible schema)
            const manifestSchema = this.getSchema().data.manifest;
            const existingManifest = current.data?.manifest || {};

            // Build complete manifest by merging: existing > overrides > schema defaults
            const completeManifest = {
                license: {},
                compliance: {}
            };

            // Process license fields from schema
            if (manifestSchema.license) {
                Object.keys(manifestSchema.license).forEach(key => {
                    const fieldSchema = manifestSchema.license[key];
                    completeManifest.license[key] =
                        existingManifest.license?.[key] ??           // Existing value
                        overrides[`license.${key}`] ??               // Override value
                        fieldSchema.default;                         // Schema default
                });
            }

            // Process compliance fields from schema
            if (manifestSchema.compliance) {
                Object.keys(manifestSchema.compliance).forEach(key => {
                    const fieldSchema = manifestSchema.compliance[key];
                    const existingValue = existingManifest.compliance?.[key];
                    const overrideValue = overrides[`compliance.${key}`];

                    // W-137: Treat empty string as "missing" for siteUuid initialization
                    // (schema default is '', but we want to allow callers to supply a generated UUID)
                    if (key === 'siteUuid' && (existingValue === undefined || existingValue === null || existingValue === '')) {
                        completeManifest.compliance[key] = overrideValue ?? fieldSchema.default;
                        return;
                    }

                    completeManifest.compliance[key] =
                        existingValue ??                             // Existing value
                        overrideValue ??                             // Override value
                        fieldSchema.default;                          // Schema default
                });
            }

            // Atomic update (first write wins in race condition)
            await collection.updateOne(
                { _id: id },
                {
                    $set: {
                        'data.manifest': completeManifest,
                        updatedAt: new Date()
                    },
                    $inc: { saveCount: 1 }
                }
            );

            // Return fresh document (gets actual written values in case of race)
            return await this.findById(id);

        } catch (error) {
            throw new Error(`Failed to ensure manifest defaults: ${error.message}`);
        }
    }

    /**
     * W-147: Ensure general structure exists with schema defaults
     * Atomic operation that initializes missing data.general from schema defaults (no app.conf read)
     * Safe for concurrent calls (race condition safe)
     *
     * @param {string} id - Config document ID (typically 'global')
     * @param {object} overrides - Optional field overrides (e.g., { 'adminRoles': ['admin', 'root', 'manager'] })
     * @returns {Promise<object>} Updated config document with complete data.general
     */
    static async ensureGeneralDefaults(id, overrides = {}) {
        try {
            const collection = this.getCollection();
            const current = await collection.findOne({ _id: id });
            if (!current) {
                throw new Error(`Config document not found: ${id}`);
            }
            const generalSchema = this.getSchema().data.general;
            const existingGeneral = current.data?.general || {};
            const sortRoles = (arr) => [...arr].sort((a, b) => String(a).localeCompare(String(b)));
            const completeGeneral = {
                roles: sortRoles(existingGeneral.roles ?? overrides.roles ?? (generalSchema?.roles?.default || ['user', 'admin', 'root'])),
                adminRoles: sortRoles(existingGeneral.adminRoles ?? overrides.adminRoles ?? (generalSchema?.adminRoles?.default || ['admin', 'root']))
            };
            await collection.updateOne(
                { _id: id },
                {
                    $set: {
                        'data.general': completeGeneral,
                        updatedAt: new Date()
                    },
                    $inc: { saveCount: 1 }
                }
            );
            return await this.findById(id);
        } catch (error) {
            throw new Error(`Failed to ensure general defaults: ${error.message}`);
        }
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
            // W-147: Validate general (roles, adminRoles; adminRoles must be subset of roles)
            if (data.data.general) {
                const general = data.data.general;
                if (general.roles !== undefined && !Array.isArray(general.roles)) {
                    errors.push('data.general.roles must be an array');
                }
                if (general.adminRoles !== undefined && !Array.isArray(general.adminRoles)) {
                    errors.push('data.general.adminRoles must be an array');
                }
                if (Array.isArray(general.roles) && Array.isArray(general.adminRoles)) {
                    const notSubset = general.adminRoles.filter(r => !general.roles.includes(r));
                    if (notSubset.length > 0) {
                        errors.push(`data.general.adminRoles must be a subset of data.general.roles (invalid: ${notSubset.join(', ')})`);
                    }
                }
            }
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
                if (email.smtpPort !== undefined && (typeof email.smtpPort !== 'number' || email.smtpPort < 1 || email.smtpPort > 65535)) {
                    errors.push('data.email.smtpPort must be a number between 1 and 65535');
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

            // Validate broadcast settings
            if (data.data.broadcast) {
                const broadcast = data.data.broadcast;
                if (broadcast.enable !== undefined && typeof broadcast.enable !== 'boolean') {
                    errors.push('data.broadcast.enable must be a boolean');
                }
                if (broadcast.message !== undefined && typeof broadcast.message !== 'string') {
                    errors.push('data.broadcast.message must be a string');
                }
                if (broadcast.nagTime !== undefined && (typeof broadcast.nagTime !== 'number' || broadcast.nagTime < 0)) {
                    errors.push('data.broadcast.nagTime must be a number >= 0');
                }
                if (broadcast.disableTime !== undefined && (typeof broadcast.disableTime !== 'number' || broadcast.disableTime < 0)) {
                    errors.push('data.broadcast.disableTime must be a number >= 0');
                }
                if (broadcast.enabledAt !== undefined && broadcast.enabledAt !== null && !(broadcast.enabledAt instanceof Date)) {
                    errors.push('data.broadcast.enabledAt must be a Date object or null');
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

        // W-147: Apply general defaults (roles, adminRoles)
        if (!result.data.general) result.data.general = {};
        if (result.data.general.roles === undefined) result.data.general.roles = ['user', 'admin', 'root'];
        if (result.data.general.adminRoles === undefined) result.data.general.adminRoles = ['admin', 'root'];

        // Apply email defaults
        if (!result.data.email) result.data.email = {};
        if (result.data.email.adminEmail === undefined) result.data.email.adminEmail = '';
        if (result.data.email.adminName === undefined) result.data.email.adminName = '';
        if (result.data.email.smtpServer === undefined) result.data.email.smtpServer = 'localhost';
        if (result.data.email.smtpPort === undefined) result.data.email.smtpPort = 25;
        if (result.data.email.smtpUser === undefined) result.data.email.smtpUser = '';
        if (result.data.email.smtpPass === undefined) result.data.email.smtpPass = '';
        if (result.data.email.useTls === undefined) result.data.email.useTls = false;

        // Apply broadcast defaults
        if (!result.data.broadcast) result.data.broadcast = {};
        if (result.data.broadcast.enable === undefined) result.data.broadcast.enable = false;
        if (result.data.broadcast.message === undefined) result.data.broadcast.message = '';
        if (result.data.broadcast.nagTime === undefined) result.data.broadcast.nagTime = 4;
        if (result.data.broadcast.disableTime === undefined) result.data.broadcast.disableTime = 0;
        if (result.data.broadcast.enabledAt === undefined) result.data.broadcast.enabledAt = null;

        // W-137: Apply manifest defaults
        if (!result.data.manifest) result.data.manifest = {};
        if (!result.data.manifest.license) result.data.manifest.license = {};
        if (result.data.manifest.license.key === undefined) result.data.manifest.license.key = '';
        if (result.data.manifest.license.tier === undefined) result.data.manifest.license.tier = 'bsl';
        if (!result.data.manifest.compliance) result.data.manifest.compliance = {};
        if (result.data.manifest.compliance.siteUuid === undefined) result.data.manifest.compliance.siteUuid = '';
        if (result.data.manifest.compliance.adminEmailOptIn === undefined) {
            result.data.manifest.compliance.adminEmailOptIn = false;
        }

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

        // Deep clone to preserve empty strings and null values
        // MongoDB $set will preserve empty strings, but we need to ensure nested objects are properly structured
        if (result.data) {
            result.data = JSON.parse(JSON.stringify(result.data));
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
            let doc = await collection.findOne({ _id: id });
            if (!doc) return null;
            // W-147: Sort roles and adminRoles on read (edit config and dropdowns show sorted; safe for legacy docs)
            if (doc.data && doc.data.general) {
                const g = doc.data.general;
                const sortArr = (arr) => Array.isArray(arr) ? [...arr].sort((a, b) => String(a).localeCompare(String(b))) : arr;
                doc = {
                    ...doc,
                    data: {
                        ...doc.data,
                        general: { ...g, roles: sortArr(g.roles), adminRoles: sortArr(g.adminRoles) }
                    }
                };
            }
            return doc;
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

            // Get the created document
            const createdDoc = await this.findById(configData._id);

            return createdDoc;
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

            // Get current document to increment saveCount and for logging
            const current = await this.findById(id);
            if (!current) {
                return null;
            }

            // Prepare update data - ensure empty strings are preserved
            let updateData = this.prepareSaveData(data, true);
            updateData.saveCount = (current.saveCount || 0) + 1;

            // W-147: Sort roles and adminRoles on write (edit config and dropdowns show sorted)
            if (updateData.data && updateData.data.general) {
                const g = updateData.data.general;
                if (Array.isArray(g.roles)) g.roles = [...g.roles].sort((a, b) => String(a).localeCompare(String(b)));
                if (Array.isArray(g.adminRoles)) g.adminRoles = [...g.adminRoles].sort((a, b) => String(a).localeCompare(String(b)));
            }

            // Ensure nested data structure preserves empty strings
            // MongoDB $set with nested objects needs explicit field paths to preserve empty strings
            const setOperation = { $set: {} };

            // Set top-level fields
            Object.keys(updateData).forEach(key => {
                if (key !== 'data') {
                    setOperation.$set[key] = updateData[key];
                }
            });

            // Set nested data fields explicitly to preserve empty strings
            if (updateData.data) {
                if (updateData.data.general) {
                    Object.keys(updateData.data.general).forEach(key => {
                        setOperation.$set[`data.general.${key}`] = updateData.data.general[key];
                    });
                }
                if (updateData.data.email) {
                    Object.keys(updateData.data.email).forEach(key => {
                        setOperation.$set[`data.email.${key}`] = updateData.data.email[key];
                    });
                }
                if (updateData.data.broadcast) {
                    // W-131: Handle enabledAt logic - set when enable=true, clear when enable=false
                    const broadcast = updateData.data.broadcast;
                    const currentBroadcast = current.data?.broadcast || {};

                    // If enable is being set to true and enabledAt is not already set, set it now
                    if (broadcast.enable === true && !currentBroadcast.enabledAt) {
                        broadcast.enabledAt = new Date();
                    }
                    // If enable is being set to false, clear enabledAt
                    if (broadcast.enable === false) {
                        broadcast.enabledAt = null;
                    }

                    Object.keys(broadcast).forEach(key => {
                        setOperation.$set[`data.broadcast.${key}`] = broadcast[key];
                    });
                }
                // W-137: Handle manifest fields (license and compliance)
                if (updateData.data.manifest) {
                    if (updateData.data.manifest.license) {
                        Object.keys(updateData.data.manifest.license).forEach(key => {
                            setOperation.$set[`data.manifest.license.${key}`] = updateData.data.manifest.license[key];
                        });
                    }
                    if (updateData.data.manifest.compliance) {
                        Object.keys(updateData.data.manifest.compliance).forEach(key => {
                            setOperation.$set[`data.manifest.compliance.${key}`] = updateData.data.manifest.compliance[key];
                        });
                    }
                }
                // W-147: Persist extension block data (schema-extended blocks)
                const frameworkBlocks = ['general', 'email', 'broadcast', 'manifest'];
                Object.keys(updateData.data).forEach(blockKey => {
                    if (frameworkBlocks.includes(blockKey)) return;
                    const blockData = updateData.data[blockKey];
                    if (typeof blockData !== 'object' || blockData === null) return;
                    Object.keys(blockData).forEach(key => {
                        if (key === '_meta') return;
                        setOperation.$set[`data.${blockKey}.${key}`] = blockData[key];
                    });
                });
            }

            // Update in database
            const collection = this.getCollection();
            const result = await collection.updateOne(
                { _id: id },
                setOperation
            );

            if (result.matchedCount === 0) {
                return null;
            }

            // Get updated document
            const updatedDoc = await this.findById(id);

            return updatedDoc;
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
            // Get current document for logging
            const current = await this.findById(id);
            if (!current) {
                return false;
            }

            const collection = this.getCollection();
            const result = await collection.deleteOne({ _id: id });

            const wasDeleted = result.deletedCount > 0;

            return wasDeleted;
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
                broadcast: {
                    ...parentConfig.data.broadcast,
                    ...config.data.broadcast
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

// EOF webapp/model/config.js
