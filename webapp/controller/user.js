/**
 * @name            jPulse Framework / WebApp / Controller / User
 * @tagline         User Controller for jPulse Framework WebApp
 * @description     This is the user controller for the jPulse Framework WebApp
 * @file            webapp/controller/user.js
 * @version         0.2.4
 * @release         2025-08-26
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import UserModel from '../model/user.js';
import LogController from './log.js';

/**
 * User Controller - handles /api/1/user/* REST API endpoints and authentication
 */
class UserController {
    /**
     * User login/authentication
     * POST /api/1/user/login
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async login(req, res) {
        try {
            LogController.consoleApi(req, `user.login( ${JSON.stringify({ identifier: req.body.identifier })} )`);

            const { identifier, password } = req.body;

            if (!identifier || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Both identifier (loginId or email) and password are required',
                    code: 'MISSING_CREDENTIALS'
                });
            }

            // Authenticate user
            const user = await UserModel.authenticate(identifier, password);

            if (!user) {
                LogController.error(req, `Login failed for identifier: ${identifier}`);
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS'
                });
            }

            // Update login statistics
            await UserModel.updateById(user._id, {
                lastLogin: new Date(),
                loginCount: (user.loginCount || 0) + 1
            });

            // Store user in session
            req.session.user = {
                id: user._id.toString(),
                loginId: user.loginId,
                email: user.email,
                firstName: user.profile.firstName,
                lastName: user.profile.lastName,
                nickName: user.profile.nickName,
                initials: (user.profile.firstName?.charAt(0) || '?') + (user.profile.lastName?.charAt(0) || ''),
                roles: user.roles,
                preferences: user.preferences,
                authenticated: true
            };

            LogController.console(req, `User ${user.loginId} logged in successfully`);

            res.json({
                success: true,
                data: {
                    user: req.session.user
                },
                message: 'Login successful'
            });

        } catch (error) {
            LogController.error(req, `user.login failed: ${error.message}`);
            res.status(500).json({
                success: false,
                error: 'Internal server error during login',
                code: 'INTERNAL_ERROR',
                details: error.message
            });
        }
    }

    /**
     * User logout
     * POST /api/1/user/logout
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async logout(req, res) {
        try {
            const loginId = req.session.user ? req.session.user.loginId : '(unknown)';

            LogController.consoleApi(req, `user.logout( ${loginId} )`);

            // Destroy session
            req.session.destroy((err) => {
                if (err) {
                    LogController.error(req, `user.logout failed: ${err.message}`);
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to logout',
                        code: 'LOGOUT_ERROR'
                    });
                }

                LogController.console(req, `User ${loginId} logged out successfully`);

                res.json({
                    success: true,
                    message: 'Logout successful'
                });
            });

        } catch (error) {
            LogController.error(req, `user.logout failed: ${error.message}`);
            res.status(500).json({
                success: false,
                error: 'Internal server error during logout',
                code: 'INTERNAL_ERROR',
                details: error.message
            });
        }
    }

    /**
     * User signup/registration
     * POST /api/1/user/signup
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async signup(req, res) {
        try {
            LogController.consoleApi(req, `user.signup( ${JSON.stringify({ username: req.body.username, email: req.body.email })} )`);

            const { firstName, lastName, username, email, password, confirmPassword, acceptTerms } = req.body;

            // Validate required fields
            if (!firstName || !lastName || !username || !email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'All fields are required: firstName, lastName, username, email, password',
                    code: 'MISSING_FIELDS'
                });
            }

            // Validate password confirmation
            if (password !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'Passwords do not match',
                    code: 'PASSWORD_MISMATCH'
                });
            }

            // Validate terms acceptance
            if (!acceptTerms) {
                return res.status(400).json({
                    success: false,
                    error: 'You must accept the terms and conditions',
                    code: 'TERMS_NOT_ACCEPTED'
                });
            }

            // Prepare user data
            const userData = {
                loginId: username,
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

            LogController.console(req, `User ${newUser.loginId} created successfully`);

            res.status(201).json({
                success: true,
                data: {
                    user: {
                        id: newUser._id.toString(),
                        loginId: newUser.loginId,
                        email: newUser.email,
                        firstName: newUser.profile.firstName,
                        lastName: newUser.profile.lastName
                    }
                },
                message: 'User account created successfully'
            });

        } catch (error) {
            LogController.error(req, `user.signup failed: ${error.message}`);

            // Handle specific error types
            if (error.message.includes('Username already exists')) {
                return res.status(409).json({
                    success: false,
                    error: 'Username already exists. Please choose another.',
                    code: 'USERNAME_EXISTS'
                });
            }

            if (error.message.includes('Email address already registered')) {
                return res.status(409).json({
                    success: false,
                    error: 'Email address already registered. Please sign in instead.',
                    code: 'EMAIL_EXISTS'
                });
            }

            if (error.message.includes('Validation failed')) {
                return res.status(400).json({
                    success: false,
                    error: error.message,
                    code: 'VALIDATION_ERROR'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Internal server error during signup',
                code: 'INTERNAL_ERROR',
                details: error.message
            });
        }
    }

    /**
     * Get current user profile
     * GET /api/1/user/profile
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async getProfile(req, res) {
        try {
            LogController.consoleApi(req, `user.getProfile()`);

            if (!req.session.user || !req.session.user.authenticated) {
                LogController.error(req, 'user.getProfile failed: Authentication required');
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED'
                });
            }

            // Get fresh user data from database
            const user = await UserModel.findById(req.session.user.id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            // Remove sensitive data
            const { passwordHash, ...userProfile } = user;

            res.json({
                success: true,
                data: userProfile,
                message: 'Profile retrieved successfully'
            });

        } catch (error) {
            LogController.error(req, `user.getProfile failed: ${error.message}`);
            res.status(500).json({
                success: false,
                error: 'Internal server error while retrieving profile',
                code: 'INTERNAL_ERROR',
                details: error.message
            });
        }
    }

    /**
     * Update current user profile
     * PUT /api/1/user/profile
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async updateProfile(req, res) {
        try {
            LogController.consoleApi(req, `user.updateProfile( ${JSON.stringify(req.body)} )`);

            if (!req.session.user || !req.session.user.authenticated) {
                LogController.error(req, 'user.updateProfile failed: Authentication required');
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED'
                });
            }

            const updateData = { ...req.body };
            updateData.updatedBy = req.session.user.loginId;

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
                return res.status(400).json({
                    success: false,
                    error: 'No valid fields to update',
                    code: 'NO_UPDATE_DATA'
                });
            }

            const updatedUser = await UserModel.updateById(req.session.user.id, filteredData);

            if (!updatedUser) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            // Update session data
            if (filteredData.profile) {
                if (filteredData.profile.firstName) req.session.user.firstName = filteredData.profile.firstName;
                if (filteredData.profile.lastName) req.session.user.lastName = filteredData.profile.lastName;
                if (filteredData.profile.nickName !== undefined) req.session.user.nickName = filteredData.profile.nickName;
            }
            if (filteredData.preferences) {
                req.session.user.preferences = { ...req.session.user.preferences, ...filteredData.preferences };
            }

            // Remove sensitive data
            const { passwordHash, ...userProfile } = updatedUser;

            res.json({
                success: true,
                data: userProfile,
                message: 'Profile updated successfully'
            });

        } catch (error) {
            LogController.error(req, `user.updateProfile failed: ${error.message}`);
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
                error: 'Internal server error while updating profile',
                code: 'INTERNAL_ERROR',
                details: error.message
            });
        }
    }

    /**
     * Change user password
     * PUT /api/1/user/password
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async changePassword(req, res) {
        try {
            LogController.consoleApi(req, `user.changePassword()`);

            if (!req.session.user || !req.session.user.authenticated) {
                LogController.error(req, 'user.changePassword failed: Authentication required');
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED'
                });
            }

            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'Both current and new passwords are required',
                    code: 'MISSING_PASSWORDS'
                });
            }

            // Get current user
            const user = await UserModel.findById(req.session.user.id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            // Verify current password
            const isCurrentValid = await UserModel.verifyPassword(currentPassword, user.passwordHash);
            if (!isCurrentValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Current password is incorrect',
                    code: 'INVALID_CURRENT_PASSWORD'
                });
            }

            // Update password
            const updateData = {
                password: newPassword,
                updatedBy: req.session.user.loginId
            };

            await UserModel.updateById(req.session.user.id, updateData);

            LogController.console(req, `Password changed successfully for user ${req.session.user.loginId}`);

            res.json({
                success: true,
                message: 'Password changed successfully'
            });

        } catch (error) {
            LogController.error(req, `user.changePassword failed: ${error.message}`);
            if (error.message.includes('Password must be at least')) {
                return res.status(400).json({
                    success: false,
                    error: 'Password validation failed',
                    code: 'PASSWORD_POLICY_ERROR',
                    details: error.message
                });
            }
            res.status(500).json({
                success: false,
                error: 'Internal server error while changing password',
                code: 'INTERNAL_ERROR',
                details: error.message
            });
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
            LogController.consoleApi(req, `user.search( ${JSON.stringify(req.query)} )`);

            // Check authentication
            if (!req.session.user || !req.session.user.authenticated) {
                LogController.error(req, 'user.search failed: Authentication required');
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED'
                });
            }

            // Check if user has admin role for user search
            if (!UserModel.hasAnyRole(req.session.user, ['admin', 'root'])) {
                LogController.error(req, 'user.search failed: Admin role required for user search');
                return res.status(403).json({
                    success: false,
                    error: 'Admin role required for user search',
                    code: 'INSUFFICIENT_PRIVILEGES'
                });
            }

            const results = await UserModel.search(req.query);
            const elapsed = Date.now() - startTime;

            LogController.console(req, `user.search completed in ${elapsed}ms`);

            res.json({
                success: true,
                message: `Found ${results.data.length} users`,
                ...results,
                elapsed
            });

        } catch (error) {
            LogController.error(req, `user.search failed: ${error.message}`);
            res.status(500).json({
                success: false,
                error: 'Internal server error while searching users',
                code: 'SEARCH_ERROR',
                details: error.message
            });
        }
    }
}

export default UserController;

// EOF webapp/controller/user.js