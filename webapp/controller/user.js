/**
 * @name            jPulse Framework / WebApp / Controller / User
 * @tagline         User Controller for jPulse Framework WebApp
 * @description     This is the user controller for the jPulse Framework WebApp
 * @file            webapp/controller/user.js
 * @version         0.8.4
 * @release         2025-10-01
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           60%, Cursor 1.2, Claude Sonnet 4
 */

import UserModel from '../model/user.js';
import LogController from './log.js';
import AuthController from './auth.js';
// i18n will be available globally after bootstrap

/**
 * User Controller - handles /api/1/user/* REST API endpoints (excluding login/logout which moved to AuthController)
 */
class UserController {


    /**
     * User signup/registration
     * POST /api/1/user/signup
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async signup(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'user.signup', JSON.stringify({ username: req.body.username, email: req.body.email }));

            const { firstName, lastName, username, email, password, confirmPassword, acceptTerms } = req.body;

            // Validate required fields
            if (!firstName || !lastName || !username || !email || !password) {
                LogController.logError(req, 'user.signup', 'error: missing required fields');
                const message = global.i18n.translate(req, 'controller.user.signup.missingFields');
                return global.CommonUtils.sendError(req, res, 400, message, 'MISSING_FIELDS');
            }

            // Validate password confirmation
            if (password !== confirmPassword) {
                LogController.logError(req, 'user.signup', 'error: password mismatch');
                const message = global.i18n.translate(req, 'controller.user.signup.passwordMismatch');
                return global.CommonUtils.sendError(req, res, 400, message, 'PASSWORD_MISMATCH');
            }

            // Validate terms acceptance
            if (!acceptTerms) {
                LogController.logError(req, 'user.signup', 'error: terms not accepted');
                const message = global.i18n.translate(req, 'controller.user.signup.termsNotAccepted');
                return global.CommonUtils.sendError(req, res, 400, message, 'TERMS_NOT_ACCEPTED');
            }

            // Prepare user data
            const userData = {
                username: username,
                email: email,
                password: password,
                profile: {
                    firstName: firstName,
                    lastName: lastName,
                    nickName: '',
                    avatar: ''
                },
                roles: ['user'], // Default role for new users
                preferences: {
                    language: 'en',
                    theme: 'light'
                },
                status: 'active'
            };

            // Create user
            const newUser = await UserModel.create(userData);

            const message = global.i18n.translate(req, 'controller.user.signup.accountCreatedSuccessfully');
            res.status(201).json({
                success: true,
                data: {
                    user: {
                        id: newUser._id.toString(),
                        username: newUser.username,
                        email: newUser.email,
                        firstName: newUser.profile.firstName,
                        lastName: newUser.profile.lastName
                    }
                },
                message: message
            });
            const duration = Date.now() - startTime;
            LogController.logInfo(req, 'user.signup', `success: ${newUser.username} created successfully, completed in ${duration}ms`);

        } catch (error) {
            LogController.logError(req, 'user.signup', `error: ${error.message}`);

            // Handle specific error types
            if (error.message.includes('Username already exists')) {
                const message = global.i18n.translate(req, 'controller.user.signup.usernameExists');
                return global.CommonUtils.sendError(req, res, 409, message, 'USERNAME_EXISTS');
            }

            if (error.message.includes('Email address already registered')) {
                const message = global.i18n.translate(req, 'controller.user.signup.emailExists');
                return global.CommonUtils.sendError(req, res, 409, message, 'EMAIL_EXISTS');
            }

            if (error.message.includes('Validation failed')) {
                const message = global.i18n.translate(req, 'controller.user.signup.validationFailed', { details: error.message });
                return global.CommonUtils.sendError(req, res, 400, message, 'VALIDATION_ERROR', error.message);
            }

            const message = global.i18n.translate(req, 'controller.user.signup.internalError', { details: error.message });
            return global.CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Get current user profile
     * GET /api/1/user/profile
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async get(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'user.get', '');

            // Authentication is handled by AuthController.requireAuthentication middleware

            // Get fresh user data from database
            const user = await UserModel.findById(req.session.user.id);

            if (!user) {
                LogController.logError(req, 'user.get', `error: user not found for session ID: ${req.session.user.id}`);
                const message = global.i18n.translate(req, 'controller.user.profile.userNotFound');
                return global.CommonUtils.sendError(req, res, 404, message, 'USER_NOT_FOUND');
            }

            // Remove sensitive data
            const { passwordHash, ...userProfile } = user;

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'user.get', `success: profile retrieved for user ${req.session.user.username} in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.user.profile.retrievedSuccessfully');
            res.json({
                success: true,
                data: userProfile,
                message: message,
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'user.get', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.user.profile.internalError', { details: error.message });
            return global.CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Update current user profile
     * PUT /api/1/user/profile
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async update(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'user.update', JSON.stringify(req.body));

            // Authentication is handled by AuthController.requireAuthentication middleware

            const updateData = { ...req.body };
            updateData.updatedBy = req.session.user.username;

            // Users can only update their own profile (non-admin fields)
            const allowedFields = ['profile', 'preferences'];
            const filteredData = {};

            for (const field of allowedFields) {
                if (updateData[field]) {
                    filteredData[field] = updateData[field];
                }
            }

            if (updateData.updatedBy) {
                filteredData.updatedBy = updateData.updatedBy;
            }

            if (Object.keys(filteredData).length === 0) {
                LogController.logError(req, 'user.update', 'error: no valid fields to update');
                const message = global.i18n.translate(req, 'controller.user.profile.noValidFieldsToUpdate');
                return global.CommonUtils.sendError(req, res, 400, message, 'NO_UPDATE_DATA');
            }

            const updatedUser = await UserModel.updateById(req.session.user.id, filteredData);

            if (!updatedUser) {
                LogController.logError(req, 'user.update', `error: user not found for session ID: ${req.session.user.id}`);
                const message = global.i18n.translate(req, 'controller.user.profile.userNotFound');
                return global.CommonUtils.sendError(req, res, 404, message, 'USER_NOT_FOUND');
            }

            // Update session data using AuthController helper
            AuthController.updateUserSession(req, updatedUser);

            // Remove sensitive data
            const { passwordHash, ...userProfile } = updatedUser;

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'user.update', `success: profile updated for user ${req.session.user.username} in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.user.profile.updatedSuccessfully');
            res.json({
                success: true,
                data: userProfile,
                message: message,
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'user.update', `error: ${error.message}`);
            if (error.message.includes('Validation failed')) {
                const message = global.i18n.translate(req, 'controller.user.profile.validationFailed', { details: error.message });
                return global.CommonUtils.sendError(req, res, 400, message, 'VALIDATION_ERROR', error.message);
            }
            const message = global.i18n.translate(req, 'controller.user.profile.updateInternalError', { details: error.message });
            return global.CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Change user password
     * PUT /api/1/user/password
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async changePassword(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'user.changePassword', '');

            // Authentication is handled by AuthController.requireAuthentication middleware

            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                LogController.logError(req, 'user.changePassword', 'error: missing current or new password');
                const message = global.i18n.translate(req, 'controller.user.password.missingPasswords');
                return global.CommonUtils.sendError(req, res, 400, message, 'MISSING_PASSWORDS');
            }

            // Get current user
            const user = await UserModel.findById(req.session.user.id);
            if (!user) {
                LogController.logError(req, 'user.changePassword', `error: user not found for session ID: ${req.session.user.id}`);
                const message = global.i18n.translate(req, 'controller.user.password.userNotFound');
                return global.CommonUtils.sendError(req, res, 404, message, 'USER_NOT_FOUND');
            }

            // Verify current password
            const isCurrentValid = await UserModel.verifyPassword(currentPassword, user.passwordHash);
            if (!isCurrentValid) {
                LogController.logError(req, 'user.changePassword', `error: invalid current password for user ${req.session.user.username}`);
                const message = global.i18n.translate(req, 'controller.user.password.invalidCurrentPassword');
                return global.CommonUtils.sendError(req, res, 400, message, 'INVALID_CURRENT_PASSWORD');
            }

            // Update password
            const updateData = {
                password: newPassword,
                updatedBy: req.session.user.username
            };

            await UserModel.updateById(req.session.user.id, updateData);

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'user.changePassword', `success: Password changed for user ${req.session.user.username} in ${elapsed}ms`);

            const message = global.i18n.translate(req, 'controller.user.password.changedSuccessfully');
            res.json({
                success: true,
                message: message,
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'user.changePassword', `error: ${error.message}`);
            if (error.message.includes('Password must be at least')) {
                const message = global.i18n.translate(req, 'controller.user.password.policyError', { details: error.message });
                return global.CommonUtils.sendError(req, res, 400, message, 'PASSWORD_POLICY_ERROR', error.message);
            }
            const message = global.i18n.translate(req, 'controller.user.password.internalError', { details: error.message });
            return global.CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Search users using schema-based query
     * GET /api/1/user/search
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async search(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'user.search', JSON.stringify(req.query));

            // Authentication and authorization are handled by AuthController.requireRole(['admin', 'root']) middleware

            const results = await UserModel.search(req.query);
            const elapsed = Date.now() - startTime;

            LogController.logInfo(req, 'user.search', `success: search completed in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.user.search.success', { count: results.data.length });
            res.json({
                success: true,
                message: message,
                ...results,
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'user.search', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.user.search.internalError', { details: error.message });
            return global.CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }
}

export default UserController;

// EOF webapp/controller/user.js
