/**
 * @name            jPulse Framework / WebApp / Model / User
 * @tagline         User Model for jPulse Framework WebApp
 * @description     This is the user model for the jPulse Framework WebApp using native MongoDB driver
 * @file            webapp/model/user.js
 * @version         0.7.2
 * @release         2025-09-15
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
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
     * Schema definition for validation
     */
    static schema = {
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
        roles: { type: 'array', default: ['user'], enum: ['guest', 'user', 'admin', 'root'] },
        preferences: {
            language: { type: 'string', default: 'en' },
            theme: { type: 'string', default: 'light', enum: ['light', 'dark'] }
        },
        status: { type: 'string', default: 'active', enum: ['active', 'inactive', 'pending', 'suspended'] },
        lastLogin: { type: 'date', default: null },
        loginCount: { type: 'number', default: 0 },
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
        if (result.preferences.language === undefined) result.preferences.language = appConfig.i18n.default || 'en';
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
     * @param {object} queryParams - URI query parameters
     * @param {object} options - Query options
     * @returns {Promise<object>} Search results with metadata
     */
    static async search(queryParams, options = {}) {
        try {
            // Build MongoDB query from URI parameters
            const ignoreFields = ['limit', 'skip', 'sort', 'page', 'password', 'passwordHash', 'name'];
            const query = CommonUtils.schemaBasedQuery(UserModel.schema, queryParams, ignoreFields);

            // Handle special 'name' parameter to search both firstName and lastName
            if (queryParams.name && queryParams.name.trim()) {
                const nameValue = queryParams.name.trim();
                query.$or = [
                    { 'profile.firstName': { $regex: new RegExp(nameValue, 'i') } },
                    { 'profile.lastName': { $regex: new RegExp(nameValue, 'i') } },
                    { 'username': { $regex: new RegExp(nameValue, 'i') } }
                ];
            }

            // Handle pagination
            const limit = Math.min(parseInt(queryParams.limit) || 50, 1000);
            const skip = parseInt(queryParams.skip) || 0;
            const page = parseInt(queryParams.page) || 1;

            if (page > 1) {
                options.skip = (page - 1) * limit;
            } else if (skip > 0) {
                options.skip = skip;
            }
            options.limit = limit;

            // Handle sorting
            if (queryParams.sort) {
                const sortField = queryParams.sort.startsWith('-') ?
                    queryParams.sort.substring(1) : queryParams.sort;
                const sortOrder = queryParams.sort.startsWith('-') ? -1 : 1;
                options.sort = { [sortField]: sortOrder };
            }

            // Execute search
            const results = await UserModel.find(query, options);

            // Get total count for pagination
            const collection = UserModel.getCollection();
            const totalCount = await collection.countDocuments(query);

            return {
                success: true,
                data: results,
                pagination: {
                    total: totalCount,
                    limit,
                    skip: options.skip || 0,
                    page: Math.floor((options.skip || 0) / limit) + 1,
                    totalPages: Math.ceil(totalCount / limit)  // Add totalPages for frontend
                },
                query: query
            };
        } catch (error) {
            throw new Error(`Failed to search users: ${error.message}`);
        }
    }

    /**
     * Create new user
     * @param {object} data - User data
     * @returns {Promise<object>} Created user document
     */
    static async create(data) {
        try {
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
            return userWithoutPassword;
        } catch (error) {
            throw new Error(`Failed to create user: ${error.message}`);
        }
    }

    /**
     * Update user by ID
     * @param {string} id - User ID
     * @param {object} data - Update data
     * @returns {Promise<object|null>} Updated user document or null if not found
     */
    static async updateById(id, data) {
        try {
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
            return await this.findById(id);
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
