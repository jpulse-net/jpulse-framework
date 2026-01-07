/**
 * @name            jPulse Framework / WebApp / Model / User
 * @tagline         User Model for jPulse Framework WebApp
 * @description     This is the user model for the jPulse Framework WebApp using native MongoDB driver
 * @file            webapp/model/user.js
 * @version         1.4.8
 * @release         2026-01-08
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 2.0, Claude Sonnet 4.5
 */

import database from '../database.js';
import bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import CommonUtils from '../utils/common.js';

/**
 * User Model - handles user authentication and management with native MongoDB driver
 * Supports internal authentication with role-based access control
 */
class UserModel {
    /**
     * Base schema definition (framework)
     */
    static baseSchema = {
        _id: { type: 'objectId', auto: true },
        username: { type: 'string', required: true, unique: true },
        uuid: { type: 'string', required: true, unique: true, auto: true },
        email: { type: 'string', required: true, unique: true, validate: 'email' },
        passwordHash: { type: 'string', required: true },
        profile: {
            firstName: { type: 'string', required: true },
            lastName: { type: 'string', required: true },
            nickName: { type: 'string', default: '' },
            avatar: { type: 'string', default: '' }
        },
        roles: { type: 'array',
                 default: [ 'user' ],
                 enum: [ 'user', 'admin', 'root' ] },
        preferences: {
            language: { type: 'string', default: 'en' },
            theme: { type: 'string',
                     default: 'light',
                     enum: [ 'light', 'dark' ] }
        },
        status: { type: 'string',
                  default: 'active',
                  enum: [ 'pending', 'active', 'inactive', 'suspended', 'terminated' ] },
        lastLogin: { type: 'date', default: null },
        loginCount: { type: 'number', default: 0 },
        createdAt: { type: 'date', auto: true },
        updatedAt: { type: 'date', auto: true },
        updatedBy: { type: 'string', default: '' },
        docVersion: { type: 'number', default: 1 },
        saveCount: { type: 'number', default: 1, autoIncrement: true }
    };

    /**
     * Extended schema (base + plugin extensions) - computed at init
     */
    static schema = null;

    /**
     * Schema extensions registry (applied in order)
     * Each extension is the raw object passed to extendSchema()
     */
    static schemaExtensions = [];

    /**
     * Schema extensions with metadata (for W-107 data-driven profile cards)
     * Keyed by block name (e.g., 'mfa'), contains _meta, fields with adminCard/userCard
     */
    static schemaExtensionsMetadata = {};

    /**
     * Initialize schema with plugin extensions
     * Called during bootstrap after plugins are loaded
     */
    static initializeSchema() {
        let schema = CommonUtils.deepMerge({}, this.baseSchema);

        // Apply plugin extensions in order
        for (const extension of this.schemaExtensions) {
            schema = this.applySchemaExtension(schema, extension);
        }

        this.schema = schema;
    }

    /**
     * Deep merge extension into schema
     * @param {object} schema - Current schema
     * @param {object} extension - Extension to apply
     * @returns {object} Merged schema
     */
    static applySchemaExtension(schema, extension) {
        return CommonUtils.deepMerge(schema, extension);
    }

    /**
     * Plugin API to extend schema
     * W-107: Enhanced to support _meta with adminCard/userCard for data-driven profile cards
     *
     * @param {object} extension - Schema extension object, e.g.:
     *   {
     *       mfa: {
     *           _meta: {
     *               plugin: 'auth-mfa',
     *               adminCard: { visible: true, label: 'MFA Settings', ... },
     *               userCard: { visible: true, label: 'Two-Factor Auth', ... }
     *           },
     *           enabled: { type: 'boolean', adminCard: { visible: true }, ... },
     *           secret: { type: 'string', adminCard: { visible: false }, ... }
     *       }
     *   }
     */
    static extendSchema(extension) {
        this.schemaExtensions.push(extension);

        // W-107: Store metadata for each block with _meta
        for (const [blockKey, blockDef] of Object.entries(extension)) {
            if (blockDef && typeof blockDef === 'object' && blockDef._meta) {
                this.schemaExtensionsMetadata[blockKey] = blockDef;
            }
        }

        // Recompute schema if already initialized
        if (this.schema !== null) {
            this.initializeSchema();
        }
    }

    /**
     * W-107: Get schema extensions metadata for data-driven profile cards
     * Returns all blocks that have _meta with adminCard or userCard
     *
     * @returns {object} Schema extensions keyed by block name
     *   {
     *       mfa: {
     *           _meta: { plugin: 'auth-mfa', adminCard: {...}, userCard: {...} },
     *           enabled: { type: 'boolean', adminCard: {...}, userCard: {...} },
     *           ...
     *       }
     *   }
     */
    static getSchemaExtensionsMetadata() {
        return this.schemaExtensionsMetadata;
    }

    /**
     * Get current schema (extended)
     * Auto-initializes if not already initialized
     * @returns {object} Current schema
     */
    static getSchema() {
        if (this.schema === null) {
            this.initializeSchema();
        }
        return this.schema || this.baseSchema;
    }

    /**
     * Get enum for specific field (supports dot notation)
     * @param {string} fieldPath - Field path (e.g., 'status', 'preferences.theme')
     * @returns {array|null} Enum array or null if not found
     */
    static getEnum(fieldPath) {
        const field = CommonUtils.getFieldSchema(this.getSchema(), fieldPath);
        return field?.enum || null;
    }

    /**
     * Extract all enum fields from schema recursively
     * @param {object} schema - Schema to extract enums from
     * @param {string} prefix - Field path prefix (for nested fields)
     * @returns {object} Object with field paths as keys and enum arrays as values
     */
    static extractEnums(schema, prefix = '') {
        const enums = {};

        for (const [key, value] of Object.entries(schema)) {
            const fieldPath = prefix ? `${prefix}.${key}` : key;

            if (value && typeof value === 'object' && !Array.isArray(value)) {
                // If it's a field definition with enum
                if (value.type && value.enum) {
                    enums[fieldPath] = value.enum;
                } else if (!value.type) {
                    // Nested object, recurse
                    const nestedEnums = this.extractEnums(value, fieldPath);
                    Object.assign(enums, nestedEnums);
                }
            }
        }

        return enums;
    }

    /**
     * Get all enum fields from current schema
     * @returns {object} Object with field paths as keys and enum arrays as values
     */
    static getEnums() {
        return this.extractEnums(this.getSchema());
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
        return db.collection('users');
    }

    /**
     * Hash password using bcrypt
     * @param {string} password - Plain text password
     * @returns {Promise<string>} Hashed password
     */
    static async hashPassword(password) {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }

    /**
     * Verify password against hash
     * @param {string} password - Plain text password
     * @param {string} hash - Stored password hash
     * @returns {Promise<boolean>} True if password matches
     */
    static async verifyPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    /**
     * Validate password meets policy requirements
     * @param {string} password - Plain text password
     * @throws {Error} Validation error with details
     */
    static validatePassword(password) {
        const minLength = appConfig.model.user.passwordPolicy.minLength || 8;

        if (!password || typeof password !== 'string') {
            throw new Error('Password is required and must be a string');
        }

        if (password.length < minLength) {
            throw new Error(`Password must be at least ${minLength} characters long`);
        }
    }

    /**
     * Validate user data against schema
     * @param {object} data - User data to validate
     * @param {boolean} isUpdate - Whether this is an update operation
     * @param {boolean} skipPassword - Whether to skip password validation (for updates)
     * @throws {Error} Validation error with details
     */
    static validate(data, isUpdate = false, skipPassword = false) {
        const errors = [];

        // Validate username (required for create, optional for update)
        if (!isUpdate && (!data.username || typeof data.username !== 'string')) {
            errors.push('username is required and must be a string');
        }
        if (data.username !== undefined) {
            if (typeof data.username !== 'string' || data.username.trim() === '') {
                errors.push('username must be a non-empty string');
            }
            if (!/^[a-zA-Z0-9_.-]+$/.test(data.username)) {
                errors.push('username can only contain letters, numbers, dots, dashes, and underscores');
            }
        }

        // Validate email (required for create, optional for update)
        if (!isUpdate && (!data.email || typeof data.email !== 'string')) {
            errors.push('email is required and must be a string');
        }
        if (data.email !== undefined) {
            if (typeof data.email !== 'string' || !CommonUtils.isValidEmail(data.email)) {
                errors.push('email must be a valid email format');
            }
        }

        // Validate password (only for create or when explicitly provided)
        if (!skipPassword && ((!isUpdate && !data.passwordHash) || data.password)) {
            if (data.password) {
                try {
                    this.validatePassword(data.password);
                } catch (error) {
                    errors.push(error.message);
                }
            } else if (!isUpdate) {
                errors.push('password is required for new users');
            }
        }

        if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
        }
    }

    /**
     * Apply default values to user data
     * @param {object} data - User data
     * @returns {object} Data with defaults applied
     */
    static applyDefaults(data) {
        const result = { ...data };

        // Apply profile defaults
        if (!result.profile) result.profile = {};
        if (result.profile.nickName === undefined) result.profile.nickName = '';
        if (result.profile.avatar === undefined) result.profile.avatar = '';

        // Apply role defaults
        if (!result.roles || result.roles.length === 0) result.roles = ['user'];

        // Apply preferences defaults
        if (!result.preferences) result.preferences = {};
        if (result.preferences.language === undefined) result.preferences.language = appConfig.utils?.i18n?.default || 'en';
        if (result.preferences.theme === undefined) result.preferences.theme = 'light';

        // Apply status and metadata defaults
        if (result.status === undefined) result.status = 'active';
        if (result.lastLogin === undefined) result.lastLogin = null;
        if (result.loginCount === undefined) result.loginCount = 0;
        if (result.updatedBy === undefined) result.updatedBy = '';
        if (result.docVersion === undefined) result.docVersion = 1;

        return result;
    }

    /**
     * Prepare data for save operation (add timestamps, hash password, increment saveCount)
     * @param {object} data - User data
     * @param {boolean} isUpdate - Whether this is an update operation
     * @returns {Promise<object>} Data prepared for save
     */
    static async prepareSaveData(data, isUpdate = false) {
        const result = { ...data };
        const now = new Date();
        result.updatedAt = now;

        if (!isUpdate) {
            result.createdAt = now;
            result.uuid = CommonUtils.generateUuid();
            result.saveCount = 1;
        }

        // Hash password if provided
        if (result.password) {
            result.passwordHash = await this.hashPassword(result.password);
            delete result.password; // Remove plain text password
        }

        return result;
    }

    /**
     * Find user by ID
     * @param {string|ObjectId} id - User ID
     * @returns {Promise<object|null>} User document or null if not found
     */
    static async findById(id) {
        try {
            const collection = this.getCollection();
            const objectId = typeof id === 'string' ? new ObjectId(id) : id;
            const result = await collection.findOne({ _id: objectId });
            return result;
        } catch (error) {
            throw new Error(`Failed to find user by ID: ${error.message}`);
        }
    }

    /**
     * Find user by email
     * @param {string} email - User email
     * @returns {Promise<object|null>} User document or null if not found
     */
    static async findByEmail(email) {
        try {
            const collection = this.getCollection();
            const result = await collection.findOne({ email: email });
            return result;
        } catch (error) {
            throw new Error(`Failed to find user by email: ${error.message}`);
        }
    }

    /**
     * Find user by username
     * @param {string} username - User login ID
     * @returns {Promise<object|null>} User document or null if not found
     */
    static async findByUsername(username) {
        try {
            const collection = this.getCollection();
            const result = await collection.findOne({ username: username });
            return result;
        } catch (error) {
            throw new Error(`Failed to find user by username: ${error.message}`);
        }
    }

    /**
     * Find all users with optional filtering
     * @param {object} filter - MongoDB filter object
     * @param {object} options - Query options (limit, skip, sort)
     * @returns {Promise<Array>} Array of user documents
     */
    static async find(filter = {}, options = {}) {
        try {
            const collection = this.getCollection();
            let query = collection.find(filter);

            // Default sort by updatedAt descending (most recently updated first)
            const defaultOptions = {
                sort: { updatedAt: -1 },
                limit: 100,
                ...options
            };

            if (defaultOptions.sort) query = query.sort(defaultOptions.sort);
            if (defaultOptions.skip) query = query.skip(defaultOptions.skip);
            if (defaultOptions.limit) query = query.limit(defaultOptions.limit);

            const result = await query.toArray();

            // Remove password hashes from all results
            return result.map(user => {
                const { passwordHash, ...userWithoutPassword } = user;
                return userWithoutPassword;
            });
        } catch (error) {
            throw new Error(`Failed to find users: ${error.message}`);
        }
    }

    /**
     * Search users using schema-based query building
     * W-080: Now uses CommonUtils.paginatedSearch() for cursor/offset pagination
     * @param {object} queryParams - URI query parameters
     * @param {object} options - Query options
     * @returns {Promise<object>} Search results with metadata
     */
    static async search(queryParams, options = {}) {
        try {
            // Build MongoDB query from URI parameters
            const ignoreFields = ['limit', 'offset', 'sort', 'cursor', 'password', 'passwordHash', 'name'];
            const query = CommonUtils.schemaBasedQuery(UserModel.getSchema(), queryParams, ignoreFields);

            // Handle special 'name' parameter to search both firstName and lastName
            if (queryParams.name && queryParams.name.trim()) {
                const nameValue = queryParams.name.trim();
                query.$or = [
                    { 'profile.firstName': { $regex: new RegExp(nameValue, 'i') } },
                    { 'profile.lastName': { $regex: new RegExp(nameValue, 'i') } },
                    { 'username': { $regex: new RegExp(nameValue, 'i') } }
                ];
            }

            // Delegate to CommonUtils.paginatedSearch() for pagination handling
            const collection = UserModel.getCollection();
            return CommonUtils.paginatedSearch(collection, query, queryParams, options);
        } catch (error) {
            throw new Error(`Failed to search users: ${error.message}`);
        }
    }

    /**
     * Count users with admin roles (from config)
     * @returns {Promise<number>} Count of admin users
     */
    static async countAdmins() {
        try {
            const adminRoles = global.appConfig?.user?.adminRoles || ['admin', 'root'];
            const collection = this.getCollection();
            const count = await collection.countDocuments({
                roles: { $in: adminRoles }
            });
            return count;
        } catch (error) {
            throw new Error(`Failed to count admins: ${error.message}`);
        }
    }

    /**
     * Get user statistics using MongoDB aggregation
     * Efficient single-query approach for dashboard stats
     * Note: This method returns raw stats (not W-112 format)
     * For W-112 metrics format, use UserController.getMetrics()
     * @returns {Promise<object>} User statistics
     */
    static async getUserStats() {
        try {
            const collection = this.getCollection();
            const adminRoles = global.appConfig?.user?.adminRoles || ['admin', 'root'];

            // Calculate date thresholds for recent logins
            const now = new Date();
            const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            // Single aggregation with $facet for parallel pipelines
            const result = await collection.aggregate([
                {
                    $facet: {
                        total: [{ $count: 'count' }],
                        byStatus: [
                            { $group: { _id: '$status', count: { $sum: 1 } } }
                        ],
                        byRole: [
                            { $unwind: { path: '$roles', preserveNullAndEmptyArrays: false } },
                            { $group: { _id: '$roles', count: { $sum: 1 } } }
                        ],
                        admins: [
                            { $match: { roles: { $in: adminRoles } } },
                            { $count: 'count' }
                        ],
                        recentLogins24h: [
                            { $match: { lastLogin: { $gte: last24h } } },
                            { $count: 'count' }
                        ],
                        recentLogins7d: [
                            { $match: { lastLogin: { $gte: last7d } } },
                            { $count: 'count' }
                        ],
                        recentLogins30d: [
                            { $match: { lastLogin: { $gte: last30d } } },
                            { $count: 'count' }
                        ]
                    }
                }
            ]).toArray();

            const data = result[0];

            // Transform aggregation result into clean stats object
            const stats = {
                total: data.total[0]?.count || 0,
                byStatus: {},
                byRole: {},
                admins: data.admins[0]?.count || 0,
                recentLogins: {
                    last24h: data.recentLogins24h[0]?.count || 0,
                    last7d: data.recentLogins7d[0]?.count || 0,
                    last30d: data.recentLogins30d[0]?.count || 0
                }
            };

            // Convert byStatus array to object
            data.byStatus.forEach(item => {
                if (item._id) {
                    stats.byStatus[item._id] = item.count;
                }
            });

            // Convert byRole array to object
            data.byRole.forEach(item => {
                if (item._id) {
                    stats.byRole[item._id] = item.count;
                }
            });

            // Get user-related log entries (create/update/delete) from last 24h
            try {
                const db = global.Database?.getDb();
                if (db) {
                    const logCollection = db.collection('logs');
                    const logStats = await logCollection.aggregate([
                        {
                            $match: {
                                'data.docType': 'user',
                                'data.action': { $in: ['create', 'update', 'delete'] },
                                createdAt: { $gte: last24h }
                            }
                        },
                        {
                            $group: {
                                _id: '$data.action',
                                count: { $sum: 1 }
                            }
                        }
                    ]).toArray();

                    // Initialize counts
                    stats.docsCreated24h = 0;
                    stats.docsUpdated24h = 0;
                    stats.docsDeleted24h = 0;

                    // Populate counts from aggregation
                    logStats.forEach(item => {
                        if (item._id === 'create') {
                            stats.docsCreated24h = item.count;
                        } else if (item._id === 'update') {
                            stats.docsUpdated24h = item.count;
                        } else if (item._id === 'delete') {
                            stats.docsDeleted24h = item.count;
                        }
                    });
                } else {
                    // Database not available, set defaults
                    stats.docsCreated24h = 0;
                    stats.docsUpdated24h = 0;
                    stats.docsDeleted24h = 0;
                }
            } catch (logError) {
                // Log collection query failed, set defaults
                stats.docsCreated24h = 0;
                stats.docsUpdated24h = 0;
                stats.docsDeleted24h = 0;
            }

            return stats;
        } catch (error) {
            throw new Error(`Failed to get user stats: ${error.message}`);
        }
    }

    /**
     * Create new user
     * W-105: Enhanced with plugin hooks for data transformation
     * @param {object} data - User data
     * @returns {Promise<object>} Created user document
     */
    static async create(data) {
        try {
            // Hook: onUserBeforeSave - can modify data before save
            let saveContext = { req: null, userData: { ...data }, isCreate: true, isSignup: false };
            if (global.HookManager) {
                saveContext = await global.HookManager.execute('onUserBeforeSave', saveContext);
                data = saveContext.userData;
            }

            // Validate data
            this.validate(data, false);

            // Check if username already exists
            const existingUser = await this.findByUsername(data.username);
            if (existingUser) {
                throw new Error('Username already exists');
            }

            // Check if email already exists
            const existingEmail = await this.findByEmail(data.email);
            if (existingEmail) {
                throw new Error('Email address already registered');
            }

            // Apply defaults and prepare for save
            let userData = this.applyDefaults(data);
            userData = await this.prepareSaveData(userData, false);

            // Insert into database
            const collection = this.getCollection();
            const result = await collection.insertOne(userData);

            if (!result.acknowledged) {
                throw new Error('Failed to insert user document');
            }

            // Return the created document without password hash
            const createdUser = await this.findById(userData._id);
            const { passwordHash, ...userWithoutPassword } = createdUser;

            // Hook: onUserAfterSave - post-save actions
            if (global.HookManager) {
                await global.HookManager.execute('onUserAfterSave', {
                    req: null,
                    user: userWithoutPassword,
                    wasCreate: true,
                    wasSignup: false
                });
            }

            return userWithoutPassword;
        } catch (error) {
            throw new Error(`Failed to create user: ${error.message}`);
        }
    }

    /**
     * Update user by ID
     * W-105: Enhanced with plugin hooks for data transformation
     * @param {string} id - User ID
     * @param {object} data - Update data
     * @returns {Promise<object|null>} Updated user document or null if not found
     */
    static async updateById(id, data) {
        try {
            // Hook: onUserBeforeSave - can modify data before save
            let saveContext = { req: null, userData: { ...data }, isCreate: false, isSignup: false };
            if (global.HookManager) {
                saveContext = await global.HookManager.execute('onUserBeforeSave', saveContext);
                data = saveContext.userData;
            }

            // Validate data for update
            this.validate(data, true);

            // Get current document to increment saveCount
            const current = await this.findById(id);
            if (!current) {
                return null;
            }

            // Prepare data for save
            const updateData = await this.prepareSaveData(data, true);
            updateData.saveCount = (current.saveCount || 0) + 1;

            // Update in database
            const collection = this.getCollection();
            const result = await collection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return null;
            }

            // Return updated document
            const updatedUser = await this.findById(id);

            // Hook: onUserAfterSave - post-save actions
            if (global.HookManager) {
                await global.HookManager.execute('onUserAfterSave', {
                    req: null,
                    user: updatedUser,
                    wasCreate: false,
                    wasSignup: false
                });
            }

            return updatedUser;
        } catch (error) {
            throw new Error(`Failed to update user: ${error.message}`);
        }
    }

    /**
     * Authenticate user with loginId/email and password
     * @param {string} identifier - LoginId or email
     * @param {string} password - Plain text password
     * @returns {Promise<object|null>} User document if authenticated, null otherwise
     */
    static async authenticate(identifier, password) {
        try {
            // Find user by username or email
            let user = await this.findByUsername(identifier);
            if (!user) {
                user = await this.findByEmail(identifier);
            }

            if (!user) {
                return null;
            }

            // Check if user is active
            if (user.status !== 'active') {
                throw new Error(`User account is ${user.status}`);
            }

            // Verify password
            const isValid = await this.verifyPassword(password, user.passwordHash);
            if (!isValid) {
                return null;
            }

            // Return user without password hash
            const { passwordHash, ...userWithoutPassword } = user;
            return userWithoutPassword;
        } catch (error) {
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    /**
     * Check if user has specific role
     * @param {object} user - User document
     * @param {string} role - Role to check
     * @returns {boolean} True if user has role
     */
    static hasRole(user, role) {
        return user && user.roles && user.roles.includes(role);
    }

    /**
     * Check if user has any of the specified roles
     * @param {object} user - User document
     * @param {string[]} roles - Roles to check
     * @returns {boolean} True if user has any of the roles
     */
    static hasAnyRole(user, roles) {
        return user && user.roles && user.roles.some(role => roles.includes(role));
    }
}

export default UserModel;

// EOF webapp/model/user.js
