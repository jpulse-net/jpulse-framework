/**
 * @name            jPulse Framework / WebApp / Model / User
 * @tagline         User Model for jPulse Framework WebApp
 * @description     This is the user model for the jPulse Framework WebApp using native MongoDB driver
 * @file            webapp/model/user.js
 * @version         1.7.17
 * @release         2026-08-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 3.14, Claude Sonnet 5
 */

import database from '../database.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
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
                     default: (() => {
                         const raw = String(global.appConfig?.utils?.theme?.default || 'light');
                         return /^[a-zA-Z0-9_-]+$/.test(raw) ? raw : 'light';
                     })(),
                     enum: [ 'light', 'dark' ] }
        },
        status: { type: 'string',
                  default: 'active',
                  enum: [ 'pending', 'active', 'inactive', 'suspended', 'terminated' ] },
        // W-195: does this user know a real, usable local password? External-auth plugins
        // (OAuth, LDAP, SAML) set this to false at JIT-creation time when they write a
        // synthetic/unknown passwordHash; changePassword() resets it to true on success.
        // Default true + absent-reads-as-true means no migration/backfill is needed.
        hasLocalPassword: { type: 'boolean', default: true },
        // W-198/W-205: has this user's email address actually been verified? false for every
        // brand-new signup going forward (stamped by applyDefaults() below). Accounts that
        // predate this field are backfilled once, at startup, from absent to true (see
        // ensureIndexes()) rather than left absent - emailVerifiedAt (below) is what
        // distinguishes that grandfathered true from a genuinely proven one.
        emailVerified: { type: 'boolean', default: false },
        // W-205: when emailVerified was actually PROVEN true, vs. merely defaulted/backfilled
        // to true. null for every account that has never completed issueEmailVerification()'s
        // verify step - including grandfathered accounts backfilled by ensureIndexes() below.
        // Stamped only by _completeEmailVerification() on real proof of inbox ownership, so
        // `emailVerified: true, emailVerifiedAt: null` unambiguously means grandfathered.
        emailVerifiedAt: { type: 'date', default: null },
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
     * W-175: Core display schema for user settings and admin user profile.
     * Defines UI rendering blocks (profile, preferences) with per-context metadata.
     * Labels use {{i18n.*}} format; resolved server-side via expandI18nDeep.
     * - profile: firstName, lastName, nickName; plus username/email (user-only, readOnly)
     * - preferences: language, theme (select; options populated post-render by view)
     * dataPath overrides the default blockKey.fieldKey path for top-level fields.
     */
    static coreDisplaySchema = {
        profile: {
            _meta: {
                adminCard: {
                    visible: true,
                    label: '{{i18n.view.admin.userProfile.profileSection}}',
                    order: 10,
                    maxColumns: 2
                },
                userCard: {
                    visible: true,
                    label: '{{i18n.view.user.settings.personalInfo}}',
                    order: 10,
                    maxColumns: 2
                }
            },
            username: {
                type: 'string',
                label: '{{i18n.view.user.settings.username}}',
                dataPath: 'username',
                userCard: { visible: true, readOnly: true },
                adminCard: { visible: false }
            },
            email: {
                type: 'string',
                label: '{{i18n.view.user.settings.email}}',
                dataPath: 'email',
                userCard: { visible: true, readOnly: true },
                adminCard: { visible: false }
            },
            firstName: {
                type: 'string',
                label: '{{i18n.view.user.settings.firstName}}',
                userCard: { visible: true },
                adminCard: { visible: true }
            },
            lastName: {
                type: 'string',
                label: '{{i18n.view.user.settings.lastName}}',
                userCard: { visible: true },
                adminCard: { visible: true }
            },
            nickName: {
                type: 'string',
                label: '{{i18n.view.user.settings.nickName}}',
                fullWidth: true,
                userCard: { visible: true },
                adminCard: { visible: true }
            }
        },
        preferences: {
            _meta: {
                adminCard: {
                    visible: true,
                    label: '{{i18n.view.admin.userProfile.preferencesSection}}',
                    order: 20,
                    maxColumns: 2
                },
                userCard: {
                    visible: true,
                    label: '{{i18n.view.user.settings.preferences}}',
                    order: 20,
                    maxColumns: 2
                }
            },
            language: {
                type: 'string',
                inputType: 'select',
                label: '{{i18n.view.user.settings.language}}',
                userCard: { visible: true },
                adminCard: { visible: true }
            },
            theme: {
                type: 'string',
                inputType: 'select',
                label: '{{i18n.view.user.settings.theme}}',
                userCard: { visible: true },
                adminCard: { visible: true }
            }
        }
    };

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
        // Optional-chain: CI/test fallback appConfig has no model section, and a misconfigured
        // site must still fall back to the documented default of 8 rather than throw TypeError
        // (which resetPasswordByToken() would otherwise swallow as PASSWORD_POLICY_ERROR).
        const minLength = global.appConfig?.model?.user?.passwordPolicy?.minLength || 8;

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
            const usernameNorm = data.username.trim().toLowerCase();
            if (!/^[a-z0-9_.-]+$/.test(usernameNorm)) {
                errors.push('username can only contain lowercase letters, numbers, dots, dashes, and underscores');
            }
            // W-134: Check reserved usernames (only for create)
            if (!isUpdate) {
                const reserved = global.appConfig?.model?.user?.reservedUsernames || ['settings', 'me'];
                if (reserved.some(r => r.toLowerCase() === usernameNorm)) {
                    errors.push(`username "${data.username}" is reserved and cannot be used`);
                }
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
        if (result.preferences.theme === undefined) {
            const defaultThemeRaw = String(appConfig?.utils?.theme?.default || 'light');
            const defaultTheme = /^[a-zA-Z0-9_-]+$/.test(defaultThemeRaw) ? defaultThemeRaw : 'light';
            result.preferences.theme = defaultTheme;
        }

        // Apply status and metadata defaults
        if (result.status === undefined) result.status = 'active';
        if (result.lastLogin === undefined) result.lastLogin = null;
        if (result.loginCount === undefined) result.loginCount = 0;
        if (result.updatedBy === undefined) result.updatedBy = '';
        if (result.docVersion === undefined) result.docVersion = 1;

        // W-198: applyDefaults() is only called from create() (new documents), so this
        // explicitly stamps every brand-new signup with emailVerified: false - pre-existing
        // documents predating this field are left untouched here; they're backfilled once,
        // at startup, to emailVerified: true/emailVerifiedAt: null instead (see ensureIndexes(),
        // W-205)
        if (result.emailVerified === undefined) result.emailVerified = false;

        return result;
    }

    /**
     * Build a plain object of default values from a schema subtree (plugin/site extension block).
     * Skips `_meta`; recurses into nested objects; leaf fields must have `type` and `default`.
     *
     * @param {object} schemaNode - Block or nested definition from merged UserModel.schema
     * @returns {object|undefined} Defaults object, or undefined if nothing to apply
     */
    static _defaultsTreeFromSchema(schemaNode) {
        if (!schemaNode || typeof schemaNode !== 'object') return undefined;
        if (schemaNode.type !== undefined) {
            if (schemaNode.default === undefined) return undefined;
            const d = schemaNode.default;
            return typeof d === 'function' ? d() : d;
        }
        const out = {};
        let has = false;
        for (const [k, v] of Object.entries(schemaNode)) {
            if (k === '_meta') continue;
            if (!v || typeof v !== 'object') continue;
            const sub = this._defaultsTreeFromSchema(v);
            if (sub !== undefined) {
                out[k] = sub;
                has = true;
            }
        }
        return has ? out : undefined;
    }

    /**
     * Merge defaults from extended user schema into API-facing user data for keys not in baseSchema.
     * Ensures GET responses include plugin/site extension sections (e.g. bubblemap) with schema defaults
     * when those sections are absent in the stored document.
     *
     * @param {object} data - User document (no passwordHash)
     * @returns {object} Data with extension defaults merged (stored values win)
     */
    static applyExtensionSchemaDefaults(data) {
        if (!data || typeof data !== 'object') return data;
        if (!this.schema) this.initializeSchema();
        const baseKeys = new Set(Object.keys(this.baseSchema));
        const result = { ...data };
        for (const key of Object.keys(this.schema)) {
            if (baseKeys.has(key)) continue;
            const blockSchema = this.schema[key];
            if (!blockSchema || typeof blockSchema !== 'object') continue;
            const defaultsTree = this._defaultsTreeFromSchema(blockSchema);
            if (defaultsTree === undefined) continue;
            const existing = result[key];
            const baseObj = existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {};
            result[key] = CommonUtils.deepMerge({}, defaultsTree, baseObj);
        }
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
     * W-198: normalizes to lowercase before querying (mirrors findByUsername()), closing the
     * case-sensitivity gap where e.g. 'peter@thoeny.org' and 'Peter@Thoeny.org' were treated as
     * distinct addresses
     * @param {string} email - User email
     * @returns {Promise<object|null>} User document or null if not found
     */
    static async findByEmail(email) {
        try {
            const collection = this.getCollection();
            const normalized = (typeof email === 'string' ? email : '').trim().toLowerCase();
            const result = await collection.findOne({ email: normalized });
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
            const normalized = (typeof username === 'string' ? username : '').toLowerCase().trim();
            const result = await collection.findOne({ username: normalized });
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
    static async search(queryParams, modelOptions = {}) {
        try {
            const qp = { ...(queryParams || {}) };
            const substringEmail = !!modelOptions.substringEmail;

            // Admin: substring match on email (escaped regex). Non-admin: exact match via schemaBasedQuery.
            let emailFragment = null;
            if (substringEmail && qp.email && typeof qp.email === 'string' && qp.email.trim()) {
                const raw = qp.email.trim();
                const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                emailFragment = { email: { $regex: escaped, $options: 'i' } };
                delete qp.email;
            }

            // W-141: Use multiFieldSearch option for name parameter
            const queryBuildOptions = {
                ignoreFields: ['limit', 'offset', 'sort', 'cursor', 'password', 'passwordHash', 'name'],
                multiFieldSearch: {
                    name: ['profile.firstName', 'profile.lastName', 'username']
                }
            };
            let queryResult = CommonUtils.schemaBasedQuery(UserModel.getSchema(), qp, queryBuildOptions);

            if (emailFragment) {
                queryResult = UserModel._mergeUserSearchQueryFragment(queryResult, emailFragment);
            }

            const collection = UserModel.getCollection();
            return CommonUtils.paginatedSearch(collection, queryResult, queryParams, {});
        } catch (error) {
            throw new Error(`Failed to search users: ${error.message}`);
        }
    }

    /**
     * Merge an extra filter into schemaBasedQuery enhanced result ({ query, useCollation, collation }).
     * @param {{ query?: object, useCollation?: boolean, collation?: object }} queryResult
     * @param {object} fragment - e.g. { email: { $regex, $options } }
     * @returns {{ query: object, useCollation: boolean, collation?: object }}
     * @private
     */
    static _mergeUserSearchQueryFragment(queryResult, fragment) {
        const base = queryResult?.query;
        if (!base || Object.keys(base).length === 0) {
            return { query: { ...fragment }, useCollation: false };
        }
        return {
            query: { $and: [base, fragment] },
            useCollation: false
        };
    }

    /**
     * Count users with admin roles (from config)
     * @returns {Promise<number>} Count of admin users
     */
    static async countAdmins() {
        try {
            const adminRoles = ConfigModel.getEffectiveAdminRoles();
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
            const adminRoles = ConfigModel.getEffectiveAdminRoles();

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

            // Normalize username to lowercase (enforced at signup and create)
            if (data.username !== undefined && typeof data.username === 'string') {
                data.username = data.username.trim().toLowerCase();
            }

            // W-198: normalize email to lowercase (mirrors username above), closing the
            // case-sensitivity gap - findByEmail() also normalizes, so lookups stay consistent
            if (data.email !== undefined && typeof data.email === 'string') {
                data.email = data.email.trim().toLowerCase();
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
            let result;
            try {
                result = await collection.insertOne(userData);
            } catch (insertError) {
                // W-198: DB-level backstop against the check-then-insert race above (confirmed
                // as a real, live race, not just theoretical) - translate a unique index
                // violation into the same friendly errors the app-level pre-checks already throw
                if (insertError.code === 11000) {
                    if (insertError.keyPattern?.username) {
                        throw new Error('Username already exists');
                    }
                    if (insertError.keyPattern?.email) {
                        throw new Error('Email address already registered');
                    }
                }
                throw insertError;
            }

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
            if (error.hookName) {
                throw error;
            }
            throw new Error(`Failed to create user: ${error.message}`);
        }
    }

    /**
     * Ensure indexes exist on the users collection (W-198)
     * - one-time backfill: lowercase any already-stored mixed-case `email` values, since
     *   findByEmail() now normalizes its query to lowercase and would otherwise silently stop
     *   matching pre-existing mixed-case documents (e.g. login-by-email, admin duplicate
     *   checks). `username` needs no backfill - create() has always normalized it to lowercase.
     * - creates unique indexes on `email` and `username` as a DB-level backstop against the
     *   check-then-insert race in create() - confirmed as a real, live race (not just
     *   theoretical), see W-198. If pre-existing duplicate values are found for a field
     *   (including new case-only collisions surfaced by the email backfill above), index
     *   creation for that field is skipped with a loud warning instead of crashing startup,
     *   following checkLocalAuthRestrictionSafety() (W-195)'s non-throwing pattern - an admin
     *   must resolve the duplicates, then a later restart will pick up the index.
     * @param {boolean} isTest - Whether this is a test environment (allows graceful skip if DB unavailable)
     */
    static async ensureIndexes(isTest = false) {
        try {
            const db = database.getDb();
            if (!db) {
                if (isTest) {
                    // In test mode, gracefully skip if database is not available
                    return;
                }
                // In production, database is required
                throw new Error('Database connection not available');
            }

            const collection = db.collection('users');

            // One-time backfill: lowercase any pre-existing mixed-case email values
            const mixedCase = await collection.find(
                { email: { $regex: '[A-Z]' } },
                { projection: { email: 1 } }
            ).toArray();
            for (const doc of mixedCase) {
                await collection.updateOne({ _id: doc._id }, { $set: { email: doc.email.toLowerCase() } });
            }
            if (mixedCase.length > 0) {
                global.LogController?.logInfo(null, 'user.ensureIndexes',
                    `info: backfilled ${mixedCase.length} user document(s) with mixed-case email to lowercase (W-198)`);
            }

            // W-205: one-time, one-directional backfill - normalize the "absent" emailVerified
            // state (which meant verified/grandfathered per W-198's convention) into an explicit
            // true, with emailVerifiedAt: null preserving that this was grandfathered rather
            // than actually proven. Safe on every startup: matches only documents where the
            // field does not exist at all, so after the first pass nothing matches and
            // re-running is a no-op. The opposite direction (explicit false -> true/absent) is
            // deliberately never done here - see W-205 design doc for why that would be unsafe.
            const emailVerifiedBackfill = await collection.updateMany(
                { emailVerified: { $exists: false } },
                { $set: { emailVerified: true, emailVerifiedAt: null } }
            );
            if (emailVerifiedBackfill.modifiedCount > 0) {
                global.LogController?.logInfo(null, 'user.ensureIndexes',
                    `info: backfilled ${emailVerifiedBackfill.modifiedCount} user document(s) with absent emailVerified to true/grandfathered (W-205)`);
            }

            // Create unique indexes on email and username, skipping (not crashing) when
            // pre-existing duplicates are found
            for (const field of ['email', 'username']) {
                const duplicates = await collection.aggregate([
                    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
                    { $match: { count: { $gt: 1 } } },
                    { $limit: 5 }
                ]).toArray();

                if (duplicates.length > 0) {
                    const sample = duplicates.map(d => d._id).join(', ');
                    global.LogController?.logWarning(null, 'user.ensureIndexes',
                        `warning: found duplicate users.${field} value(s) (e.g. ${sample}) - ` +
                        `skipping unique index on users.${field} until an admin resolves the ` +
                        `duplicates (see W-198)`);
                    continue;
                }

                await collection.createIndex({ [field]: 1 }, { unique: true });
            }
        } catch (error) {
            throw new Error(`Failed to create user indexes: ${error.message}`);
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

            // W-198: normalize email to lowercase (mirrors create()/findByEmail()) so an
            // admin-driven email change stays consistent with the unique index
            if (data.email !== undefined && typeof data.email === 'string') {
                data.email = data.email.trim().toLowerCase();
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
            if (error.hookName) {
                throw error;
            }
            throw new Error(`Failed to update user: ${error.message}`);
        }
    }

    // ---------------------------------------------------------------------------------------
    // W-205: Email verification primitives. One place that knows how the link token and the
    // 6-digit code work; the auth controller (blocking login step) and the user controller
    // (link click, authenticated self-service, signup) all call these rather than duplicating
    // token/code handling. See docs/dev/design/W-205-auth-email-confirmation.md.
    // ---------------------------------------------------------------------------------------

    // Verification secrets are hashed for storage-convention consistency (not for brute-force
    // resistance - that comes from the rate limiters below), so a lower cost than password
    // hashing (12) is fine and keeps interactive verify-code checks fast.
    static EMAIL_VERIFY_BCRYPT_ROUNDS = 10;

    /**
     * The effective controller.user.emailVerification policy - live-degraded from 'required' to
     * 'nag' whenever EmailController isn't actually able to send mail, so a site can never lock
     * every new signup out of their own account just because 'required' was configured before
     * SMTP was set up (or SMTP later breaks). Evaluated fresh on every call, not frozen at
     * bootstrap, so fixing SMTP resumes 'required' enforcement immediately, with no restart -
     * see the loud (but non-mutating) startup warning this pairs with,
     * checkEmailVerificationSafety() in webapp/utils/bootstrap.js. All three call sites that
     * gate on this policy (webapp/controller/auth.js x2, webapp/controller/user.js's signup) use
     * this instead of reading global.appConfig directly, so there is exactly one place the
     * degrade rule lives.
     * @returns {'off'|'nag'|'required'} The effective policy
     */
    static getEmailVerificationPolicy() {
        const configured = global.appConfig?.controller?.user?.emailVerification || 'required';
        if (configured === 'required' && !global.EmailController?.isConfigured()) {
            return 'nag';
        }
        return configured;
    }

    /**
     * Whether a currently-valid (unexpired) verification credential - link token or code -
     * already exists for this user. Callers deciding whether to auto-issue on arrival at the
     * verify step (rather than on an explicit signup/resend) should check this first, so a user
     * who merely reloads or polls the verify page doesn't get a fresh email on every visit.
     * @param {string|ObjectId} userId - User ID
     * @returns {Promise<boolean>} True if a link and/or code is still valid
     */
    static async hasValidEmailVerification(userId) {
        const id = userId.toString();
        const [linkHash, codeHash] = await Promise.all([
            global.RedisManager.cacheGetToken('controller:user:emailVerifyLink', id),
            global.RedisManager.cacheGetToken('controller:user:emailVerifyCode', id)
        ]);
        return !!(linkHash || codeHash);
    }

    /**
     * Issue a fresh verification link token + 6-digit code, store both (bcrypt-hashed) in
     * Redis with their respective TTLs, and email them to the user. Always issues and sends,
     * subject only to the send rate limit - callers wanting the "only if none is currently
     * valid" behavior (auto-issue on arrival at the verify step) must check
     * hasValidEmailVerification() themselves before calling this.
     *
     * The link token embeds the user ID (`<userId>.<secret>`) because the confirm route
     * (`GET /api/1/user/email-verify/confirm?token=`) has no session and no other way to know
     * which account a bare secret belongs to; only the secret half is ever hashed/stored.
     *
     * A send failure (no SMTP, transport error) is logged but does NOT throw - the stored
     * credential is still valid and the user can retry via resend, or the send self-heals the
     * next time issueEmailVerification() runs for this account.
     *
     * @param {object} req - Express request object (for building the verify URL, and for
     *   template/i18n expansion context)
     * @param {object} user - User document (must include _id, email; profile/preferences used
     *   for personalization and recipient-language selection)
     * @returns {Promise<object>} { success, errorCode, retryAfter } - errorCode/retryAfter set only on failure
     */
    static async issueEmailVerification(req, user) {
        const userId = user._id.toString();

        // Sends (signup, resend, auto-issue): 3 per 10 minutes per account
        const rateLimit = await global.RedisManager.cacheCheckRateLimit(
            'controller:user:emailVerifySend', userId, { limit: 3, windowSeconds: 600 }
        );
        if (!rateLimit.allowed) {
            return { success: false, errorCode: 'EMAIL_VERIFY_RATE_LIMITED', retryAfter: rateLimit.retryAfter };
        }

        // Link: 32 random bytes, base64url, 24h TTL. Code: 6 digits, 30m TTL. Either satisfies
        // verification; the first successful use invalidates both (_completeEmailVerification()).
        const secret = crypto.randomBytes(32).toString('base64url');
        const linkToken = `${userId}.${secret}`;
        const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');

        const [secretHash, codeHash] = await Promise.all([
            bcrypt.hash(secret, this.EMAIL_VERIFY_BCRYPT_ROUNDS),
            bcrypt.hash(code, this.EMAIL_VERIFY_BCRYPT_ROUNDS)
        ]);
        await Promise.all([
            global.RedisManager.cacheSetToken('controller:user:emailVerifyLink', userId, secretHash, 86400),
            global.RedisManager.cacheSetToken('controller:user:emailVerifyCode', userId, codeHash, 1800)
        ]);

        try {
            const verifyUrl = `${req.protocol}://${req.get('host')}/api/1/user/email-verify/confirm` +
                `?token=${encodeURIComponent(linkToken)}`;

            // Dynamic import avoids a static circular import: email.js -> handlebar.js ->
            // auth.js -> this file. By the time this method runs (well after bootstrap), all
            // modules are already loaded, so this resolves immediately.
            const { default: EmailController } = await import('../controller/email.js');
            const sendResult = await EmailController.sendEmailFromTranslation(req, {
                user,
                key: 'model.user.emailVerify',
                context: { firstName: user.profile?.firstName || '', verifyUrl, code }
            });

            if (!sendResult.success) {
                global.LogController?.logError(req, 'user.issueEmailVerification',
                    `error: failed to send verification email to ${CommonUtils.maskEmail(user.email)}: ${sendResult.error}`);
            }
        } catch (error) {
            global.LogController?.logError(req, 'user.issueEmailVerification',
                `error: failed to send verification email: ${error.message}`);
        }

        return { success: true, errorCode: null };
    }

    /**
     * W-205: Informative-only notice to the NEW address after an admin's email change reset
     * emailVerified (see UserController.update()). Carries no credential and nothing that can
     * expire - the real verification credential is issued on demand the next time this account
     * reaches the verify step (see issueEmailVerification()'s doc comment on "issue on demand").
     * A send failure is logged but never throws - this is a courtesy notice, not a blocking
     * security control, unlike the verification email itself.
     * @param {object} req - Express request object (for i18n/template expansion context)
     * @param {object} user - User document with the NEW email already saved
     * @returns {Promise<void>}
     */
    static async sendEmailChangedNotice(req, user) {
        try {
            const { default: EmailController } = await import('../controller/email.js');
            const sendResult = await EmailController.sendEmailFromTranslation(req, {
                user,
                key: 'model.user.emailChangedNotice',
                context: { firstName: user.profile?.firstName || '' }
            });

            if (!sendResult.success) {
                global.LogController?.logError(req, 'user.sendEmailChangedNotice',
                    `error: failed to send to ${CommonUtils.maskEmail(user.email)}: ${sendResult.error}`);
            }
        } catch (error) {
            global.LogController?.logError(req, 'user.sendEmailChangedNotice', `error: ${error.message}`);
        }
    }

    /**
     * W-205: Security alert to the OLD address after an admin changes a user's email - the only
     * channel that reaches the legitimate owner if the change was malicious rather than clerical
     * (a typo onto an unrelated real mailbox is harmless: that stranger gets only this heads-up,
     * and can't verify an address they don't control). Carries no credential. Never throws.
     * @param {object} req - Express request object
     * @param {object} user - User document with the NEW email already saved (masked for the alert)
     * @param {string} oldEmail - The address being notified (no longer on the user document)
     * @returns {Promise<void>}
     */
    static async sendEmailChangedAlert(req, user, oldEmail) {
        try {
            const { default: EmailController } = await import('../controller/email.js');
            const sendResult = await EmailController.sendEmailFromTranslation(req, {
                user,
                to: oldEmail, // W-205: recipient is the OLD address, but language still follows the account
                key: 'model.user.emailChangedAlert',
                context: {
                    firstName: user.profile?.firstName || '',
                    maskedNewEmail: CommonUtils.maskEmail(user.email)
                }
            });

            if (!sendResult.success) {
                global.LogController?.logError(req, 'user.sendEmailChangedAlert',
                    `error: failed to send to ${CommonUtils.maskEmail(oldEmail)}: ${sendResult.error}`);
            }
        } catch (error) {
            global.LogController?.logError(req, 'user.sendEmailChangedAlert', `error: ${error.message}`);
        }
    }

    /**
     * Verify by link token (no session required - the click may happen on any device).
     * @param {object} req - Express request object (for logging)
     * @param {string} token - Token from the confirm link, format `<userId>.<secret>`
     * @returns {Promise<object>} { success, errorCode, user } - user (without passwordHash) set only on success
     */
    static async verifyEmailByToken(req, token) {
        if (typeof token !== 'string' || !token.includes('.')) {
            return { success: false, errorCode: 'EMAIL_VERIFY_INVALID_TOKEN', user: null };
        }

        const dotIndex = token.indexOf('.');
        const userId = token.slice(0, dotIndex);
        const secret = token.slice(dotIndex + 1);

        if (!ObjectId.isValid(userId) || !secret) {
            return { success: false, errorCode: 'EMAIL_VERIFY_INVALID_TOKEN', user: null };
        }

        const storedHash = await global.RedisManager.cacheGetToken('controller:user:emailVerifyLink', userId);
        if (!storedHash) {
            return { success: false, errorCode: 'EMAIL_VERIFY_EXPIRED', user: null };
        }

        const isValid = await bcrypt.compare(secret, storedHash);
        if (!isValid) {
            return { success: false, errorCode: 'EMAIL_VERIFY_INVALID_TOKEN', user: null };
        }

        return await this._completeEmailVerification(req, userId);
    }

    /**
     * Verify by 6-digit code (authenticated self-service, or the waiting tab mid-login).
     * @param {object} req - Express request object (for logging)
     * @param {string|ObjectId} userId - User ID the code was issued to
     * @param {string} code - 6-digit code as entered by the user
     * @returns {Promise<object>} { success, errorCode, retryAfter, user } - user (without passwordHash) set only on success
     */
    static async verifyEmailByCode(req, userId, code) {
        const id = userId.toString();

        // Wrong-code attempts: 5 per 15 minutes per account. Checked (and incremented) before
        // the comparison, so it bounds guesses regardless of outcome - brute-force resistance
        // comes from this limiter, not from the code's 10^6 keyspace or the bcrypt hash.
        const rateLimit = await global.RedisManager.cacheCheckRateLimit(
            'controller:user:emailVerifyAttempt', id, { limit: 5, windowSeconds: 900 }
        );
        if (!rateLimit.allowed) {
            return { success: false, errorCode: 'EMAIL_VERIFY_RATE_LIMITED', retryAfter: rateLimit.retryAfter, user: null };
        }

        const storedHash = await global.RedisManager.cacheGetToken('controller:user:emailVerifyCode', id);
        if (!storedHash) {
            return { success: false, errorCode: 'EMAIL_VERIFY_EXPIRED', user: null };
        }

        const isValid = await bcrypt.compare(String(code), storedHash);
        if (!isValid) {
            return { success: false, errorCode: 'EMAIL_VERIFY_INVALID_CODE', user: null };
        }

        return await this._completeEmailVerification(req, id);
    }

    /**
     * Shared completion for both verify paths: flip emailVerified, stamp emailVerifiedAt with
     * proof (never grandfathered-null once this runs), and invalidate both secrets so neither
     * a leaked code nor a leaked link stays usable after either one succeeds.
     * @param {object} req - Express request object (for logging)
     * @param {string|ObjectId} userId - User ID
     * @returns {Promise<object>} { success, errorCode, user }
     * @private
     */
    static async _completeEmailVerification(req, userId) {
        const user = await this.findById(userId);
        if (!user) {
            return { success: false, errorCode: 'EMAIL_VERIFY_INVALID_TOKEN', user: null };
        }

        const updatedUser = await this.updateById(userId, { emailVerified: true, emailVerifiedAt: new Date() });
        await this._invalidateEmailVerification(userId);

        global.LogController?.logInfo(req, 'user._completeEmailVerification',
            `success: email verified for user ${user.username}`);

        const { passwordHash, ...userWithoutPassword } = updatedUser;
        return { success: true, errorCode: null, user: userWithoutPassword };
    }

    /**
     * Delete both verification secrets (link + code) for a user - called on successful
     * verification, so neither the just-used credential nor the other, unused one remains
     * valid. Not called on expiry; TTLs handle that on their own.
     * @param {string|ObjectId} userId - User ID
     * @returns {Promise<void>}
     * @private
     */
    static async _invalidateEmailVerification(userId) {
        const id = userId.toString();
        await Promise.all([
            global.RedisManager.cacheDelToken('controller:user:emailVerifyLink', id),
            global.RedisManager.cacheDelToken('controller:user:emailVerifyCode', id)
        ]);
    }

    // ---------------------------------------------------------------------------------------
    // W-206: Password reset primitives. Mechanism only - these know how the reset token is
    // made, stored, checked and consumed, and hold no opinion on whether this particular
    // account is allowed to reset. Status, hasLocalPassword, localAuthRestriction and
    // disableLogin are read in exactly one place, UserController._classifyPasswordReset(), for
    // the same reason authenticate() below refuses to gate on status: policy is a
    // controller-layer concern (W-201). See docs/dev/design/W-206-user-password-reset.md.
    // ---------------------------------------------------------------------------------------

    // Same rationale as EMAIL_VERIFY_BCRYPT_ROUNDS above - the stored hash is a storage
    // convention, not the brute-force defense (that is 32 bytes of entropy plus the attempt
    // limiter), so a lower cost than password hashing (12) is right here.
    static PASSWORD_RESET_BCRYPT_ROUNDS = 10;

    // 1 hour, deliberately far shorter than the email-verification link's 24: this token grants
    // account takeover to whoever holds it, so its value to someone who gains mailbox access
    // later - a stale mailbox on a shared computer, a forwarded thread, a breached mail backup -
    // is exactly what a short window cuts off. A real "I forgot my password" round trip takes
    // minutes, and re-requesting is one click on a page the user is already looking at.
    static PASSWORD_RESET_TTL_SECONDS = 3600;

    /**
     * Issue a fresh password reset link token, store it (bcrypt-hashed) in Redis with a 1h TTL,
     * and mail it. The caller must already have decided this account is eligible - see
     * UserController._classifyPasswordReset().
     *
     * The token embeds the user ID (`<userId>.<secret>`) because the confirm request carries no
     * session and a bare secret would be unattributable; only the secret half is hashed/stored.
     *
     * The mail is sent DETACHED: this resolves as soon as the token is stored. Awaiting SMTP
     * would make an existing account answer measurably slower than a nonexistent one, undoing
     * the enumeration protection the request endpoint's uniformly generic response exists to
     * provide. _sendPasswordResetMail() swallows and logs its own errors, so the detached
     * promise can never reject unhandled.
     *
     * @param {object} req - Express request object (for the reset URL host, i18n context, logging)
     * @param {object} user - User document (must include _id, email; profile/preferences used
     *   for personalization and recipient-language selection)
     * @param {object} [options] - Options
     * @param {boolean} [options.enforceSendLimit=true] - Apply the per-account 3/10min send
     *   budget. The admin-send endpoint passes false: that budget exists to stop a stranger
     *   mail-bombing a user, and would otherwise block an admin helping in real time with a
     *   budget the user may already have spent trying on their own - which is exactly the
     *   situation that sends them to an admin.
     * @param {boolean} [options.awaitSend=false] - Wait for SMTP and surface a send failure.
     *   The public request endpoint must leave this false (enumeration: an existing account
     *   must not answer measurably slower than a nonexistent one). The admin-send endpoint
     *   passes true: an admin already knows the account exists, and "link sent" when SMTP
     *   refused the connection is a lie.
     * @returns {Promise<object>} { success, errorCode, retryAfter, error } - error fields set only on failure
     */
    static async issuePasswordReset(req, user, { enforceSendLimit = true, awaitSend = false } = {}) {
        const userId = user._id.toString();

        if (enforceSendLimit) {
            const rateLimit = await global.RedisManager.cacheCheckRateLimit(
                'controller:user:passwordResetSend', userId, { limit: 3, windowSeconds: 600 }
            );
            if (!rateLimit.allowed) {
                return { success: false, errorCode: 'PASSWORD_RESET_RATE_LIMITED', retryAfter: rateLimit.retryAfter };
            }
        }

        const secret = crypto.randomBytes(32).toString('base64url');
        const resetToken = `${userId}.${secret}`;
        const secretHash = await bcrypt.hash(secret, this.PASSWORD_RESET_BCRYPT_ROUNDS);
        await global.RedisManager.cacheSetToken(
            'controller:user:passwordResetLink', userId, secretHash, this.PASSWORD_RESET_TTL_SECONDS
        );

        // The link lands on a page, not an API route (unlike W-205's confirm link): a mail
        // scanner prefetching it must not be able to burn a single-use token before the human
        // ever sees the form, so only the POST carrying a new password consumes it.
        const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password.shtml` +
            `?token=${encodeURIComponent(resetToken)}`;

        if (!awaitSend) {
            this._sendPasswordResetMail(req, user, resetUrl); // detached on purpose - see doc comment
            return { success: true, errorCode: null };
        }

        const sendResult = await this._sendPasswordResetMail(req, user, resetUrl);
        if (!sendResult.success) {
            // Nobody received the link - do not leave a live credential sitting in Redis for an
            // hour after telling the admin the send failed.
            await this.invalidatePasswordReset(userId);
            return {
                success: false,
                errorCode: 'EMAIL_SEND_FAILED',
                error: sendResult.error || 'email send failed'
            };
        }

        return { success: true, errorCode: null };
    }

    /**
     * Mail the reset link. Never throws and never rejects - issuePasswordReset() may fire it
     * without awaiting, so an unhandled rejection here would crash the process.
     * @param {object} req - Express request object (for i18n/template expansion context)
     * @param {object} user - User document
     * @param {string} resetUrl - Fully-qualified reset page URL carrying the token
     * @returns {Promise<object>} { success, error }
     * @private
     */
    static async _sendPasswordResetMail(req, user, resetUrl) {
        try {
            // Dynamic import for the same reason as issueEmailVerification() above: it avoids a
            // static circular import (email.js -> handlebar.js -> auth.js -> this file), and
            // resolves immediately since everything is loaded long before this runs.
            const { default: EmailController } = await import('../controller/email.js');
            const sendResult = await EmailController.sendEmailFromTranslation(req, {
                user,
                key: 'model.user.passwordReset',
                context: {
                    firstName: user.profile?.firstName || '',
                    siteName: global.appConfig?.app?.site?.name || '',
                    resetUrl
                }
            });

            if (!sendResult.success) {
                global.LogController?.logError(req, 'user.issuePasswordReset',
                    `error: failed to send password reset email to ${CommonUtils.maskEmail(user.email)}: ${sendResult.error}`);
                return { success: false, error: sendResult.error || 'email send failed' };
            }
            return { success: true, error: null };
        } catch (error) {
            global.LogController?.logError(req, 'user.issuePasswordReset',
                `error: failed to send password reset email: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * W-206: The "you sign in with an external provider" explainer, sent instead of a reset
     * link to an account that has no usable local password (SSO-provisioned, or covered by a
     * localAuthRestriction policy). Carries no credential and nothing that can expire - a local
     * password they could never log in with is not worth resetting, so the mail tells them how
     * they actually sign in. Deliberately does not name the provider: the provider list is
     * assembled per-request for the login page only (HandlebarController._buildInternalContext()),
     * and the login page answers that question with buttons anyway.
     *
     * Never throws, so callers can fire it detached alongside issuePasswordReset()'s own send.
     * @param {object} req - Express request object (for i18n/template expansion context)
     * @param {object} user - User document
     * @returns {Promise<void>}
     */
    static async sendPasswordResetSsoNotice(req, user) {
        try {
            const { default: EmailController } = await import('../controller/email.js');
            const sendResult = await EmailController.sendEmailFromTranslation(req, {
                user,
                key: 'model.user.passwordResetSso',
                context: {
                    firstName: user.profile?.firstName || '',
                    siteName: global.appConfig?.app?.site?.name || '',
                    loginUrl: `${req.protocol}://${req.get('host')}/auth/login.shtml`
                }
            });

            if (!sendResult.success) {
                global.LogController?.logError(req, 'user.sendPasswordResetSsoNotice',
                    `error: failed to send to ${CommonUtils.maskEmail(user.email)}: ${sendResult.error}`);
            }
        } catch (error) {
            global.LogController?.logError(req, 'user.sendPasswordResetSsoNotice', `error: ${error.message}`);
        }
    }

    /**
     * W-206: After-the-fact security notice that the account's password was reset. Carries no
     * credential. This is what makes a compromised-inbox takeover noisy rather than silent -
     * the only defense available while other active sessions cannot be revoked - so it is sent
     * detached and never blocks or fails the reset itself. Never throws.
     * @param {object} req - Express request object (for i18n/template expansion context)
     * @param {object} user - User document (password already updated)
     * @returns {Promise<void>}
     */
    static async sendPasswordChangedNotice(req, user) {
        try {
            const { default: EmailController } = await import('../controller/email.js');
            const sendResult = await EmailController.sendEmailFromTranslation(req, {
                user,
                key: 'model.user.passwordChanged',
                context: {
                    firstName: user.profile?.firstName || '',
                    siteName: global.appConfig?.app?.site?.name || ''
                }
            });

            if (!sendResult.success) {
                global.LogController?.logError(req, 'user.sendPasswordChangedNotice',
                    `error: failed to send to ${CommonUtils.maskEmail(user.email)}: ${sendResult.error}`);
            }
        } catch (error) {
            global.LogController?.logError(req, 'user.sendPasswordChangedNotice', `error: ${error.message}`);
        }
    }

    /**
     * Split `<userId>.<secret>` and sanity-check both halves, without touching Redis - so the
     * confirm path can key its attempt limiter on the user ID before spending a bcrypt compare.
     * @param {string} token - Raw token from the reset link
     * @returns {object|null} { userId, secret }, or null if the token is not well-formed
     * @private
     */
    static _parsePasswordResetToken(token) {
        if (typeof token !== 'string' || !token.includes('.')) {
            return null;
        }

        const dotIndex = token.indexOf('.');
        const userId = token.slice(0, dotIndex);
        const secret = token.slice(dotIndex + 1);

        if (!ObjectId.isValid(userId) || !secret) {
            return null;
        }

        return { userId, secret };
    }

    /**
     * Compare a parsed token against the stored hash. Read-only - never consumes.
     * @param {string} userId - User ID from the token
     * @param {string} secret - Secret half of the token
     * @returns {Promise<object>} { valid, errorCode }
     * @private
     */
    static async _matchPasswordResetToken(userId, secret) {
        const storedHash = await global.RedisManager.cacheGetToken('controller:user:passwordResetLink', userId);
        if (!storedHash) {
            return { valid: false, errorCode: 'PASSWORD_RESET_EXPIRED' };
        }

        const isValid = await bcrypt.compare(secret, storedHash);
        if (!isValid) {
            return { valid: false, errorCode: 'PASSWORD_RESET_INVALID_TOKEN' };
        }

        return { valid: true, errorCode: null };
    }

    /**
     * Read-only validity probe for a reset token - safe to repeat, and deliberately does NOT
     * consume. The reset page calls this on load to decide between showing the new-password
     * form and the "this link has expired" state; consuming here would mean a mail scanner's
     * prefetch, or a simple page reload, destroyed the user's only way in.
     * @param {object} req - Express request object (unused today, kept for parity/logging)
     * @param {string} token - Raw token from the reset link
     * @returns {Promise<object>} { valid, errorCode }
     */
    static async verifyPasswordResetToken(req, token) {
        const parsed = this._parsePasswordResetToken(token);
        if (!parsed) {
            return { valid: false, errorCode: 'PASSWORD_RESET_INVALID_TOKEN' };
        }

        return await this._matchPasswordResetToken(parsed.userId, parsed.secret);
    }

    /**
     * Validate the token, set the new password, and consume the token. Mechanism only: it does
     * NOT decide whether this account may then be given a session - the caller re-checks status
     * and localAuthRestriction before completing any login (see UserController.passwordResetConfirm()).
     *
     * Also flips emailVerified: the user just opened a secret mailed to the address on the
     * account, which is precisely the proof that flag asserts, collected by precisely the
     * mechanism W-205 uses to collect it. Without this, a 'required' site would push an
     * email-verify step and mail a *second* credential seconds later, asking the user to prove
     * again what they proved ten seconds ago.
     *
     * @param {object} req - Express request object (for logging)
     * @param {string} token - Raw token from the reset link
     * @param {string} newPassword - New plain-text password (validated against passwordPolicy)
     * @returns {Promise<object>} { success, errorCode, error, retryAfter, user } - user (without
     *   passwordHash) set only on success
     */
    static async resetPasswordByToken(req, token, newPassword) {
        const parsed = this._parsePasswordResetToken(token);
        if (!parsed) {
            return { success: false, errorCode: 'PASSWORD_RESET_INVALID_TOKEN', user: null };
        }

        // Checked (and incremented) before the comparison, like verifyEmailByCode() above, so it
        // bounds guesses regardless of outcome - brute-force resistance comes from this limiter
        // as much as from the secret's 32 bytes of entropy.
        const rateLimit = await global.RedisManager.cacheCheckRateLimit(
            'controller:user:passwordResetAttempt', parsed.userId, { limit: 5, windowSeconds: 900 }
        );
        if (!rateLimit.allowed) {
            return {
                success: false,
                errorCode: 'PASSWORD_RESET_RATE_LIMITED',
                retryAfter: rateLimit.retryAfter,
                user: null
            };
        }

        const match = await this._matchPasswordResetToken(parsed.userId, parsed.secret);
        if (!match.valid) {
            return { success: false, errorCode: match.errorCode, user: null };
        }

        // Password policy is checked before anything is written and before the token is
        // consumed, so a user who typed too short a password can simply try again with the
        // same link rather than being locked out by their own typo.
        try {
            this.validatePassword(newPassword);
        } catch (error) {
            return { success: false, errorCode: 'PASSWORD_POLICY_ERROR', error: error.message, user: null };
        }

        const user = await this.findById(parsed.userId);
        if (!user) {
            return { success: false, errorCode: 'PASSWORD_RESET_INVALID_TOKEN', user: null };
        }

        const updatedUser = await this.updateById(parsed.userId, {
            password: newPassword,
            // W-195: they now know a real, usable local password, whether or not they had one
            hasLocalPassword: true,
            emailVerified: true,
            emailVerifiedAt: new Date(),
            updatedBy: user.username
        });

        await this.invalidatePasswordReset(parsed.userId);

        global.LogController?.logInfo(req, 'user.resetPasswordByToken',
            `success: password reset for user ${user.username}`);

        const { passwordHash, ...userWithoutPassword } = updatedUser;
        return { success: true, errorCode: null, user: userWithoutPassword };
    }

    /**
     * Drop any outstanding reset token for a user. Called on a successful reset, and by every
     * other path that writes a password (self-service change, admin set) - an outstanding reset
     * link is a live credential for an account whose password just changed for some other
     * reason, and the person who made that change has every reason to expect the older
     * credential to be dead. Public, unlike _invalidateEmailVerification() above, precisely
     * because those cross-module callers exist.
     * @param {string|ObjectId} userId - User ID
     * @returns {Promise<void>}
     */
    static async invalidatePasswordReset(userId) {
        await global.RedisManager.cacheDelToken('controller:user:passwordResetLink', userId.toString());
    }

    /**
     * Authenticate user with loginId/email and password. Credentials-only - does NOT gate on
     * account status (e.g. 'pending'/'suspended'/'terminated'/'inactive'). W-201: status
     * enforcement is a controller-layer concern, centralized in auth.js's login() so the exact
     * same status check applies uniformly to both this internal-password path and external-auth
     * (skipPasswordCheck) logins - see the "Check account status" block there. Verifying the
     * password before status is ever inspected (by not inspecting it here at all) also avoids
     * leaking a non-active account's existence/status to a caller who doesn't know its password.
     * @param {string} identifier - LoginId or email
     * @param {string} password - Plain text password
     * @returns {Promise<object|null>} User document (any status) if credentials are valid, null otherwise
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
