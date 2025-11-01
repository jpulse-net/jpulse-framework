/**
 * @name            jPulse Framework / WebApp / Controller / Auth
 * @tagline         Authentication Controller for jPulse Framework WebApp
 * @description     This is the authentication controller for the jPulse Framework WebApp
 * @file            webapp/controller/auth.js
 * @version         1.0.0
 * @release         2025-11-01
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
 */

import UserModel from '../model/user.js';
// i18n will be available globally after bootstrap

/**
 * Auth Controller - handles authentication, authorization, and middleware
 */
class AuthController {

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    /**
     * Get user's preferred language from session with fallback to default
     * @param {object} req - Express request object
     * @param {string} defaultLang - Default language code (optional, defaults to utils.i18n.default)
     * @returns {string} Language code
     */
    static getUserLanguage(req, defaultLang = null) {
        let fallback = defaultLang || global.appConfig?.utils?.i18n?.default || 'en';
        return req.session?.user?.preferences?.language || fallback;
    }

    /**
     * Update user session data (called when user preferences change)
     * @param {object} req - Express request object
     * @param {object} userData - Updated user data from database
     */
    static updateUserSession(req, userData) {
        if (req.session?.user && userData) {
            // Update session with fresh data
            if (userData.profile) {
                if (userData.profile.firstName) req.session.user.firstName = userData.profile.firstName;
                if (userData.profile.lastName) req.session.user.lastName = userData.profile.lastName;
                if (userData.profile.nickName !== undefined) req.session.user.nickName = userData.profile.nickName;
                if (!userData.profile.nickName) req.session.user.nickName = userData.profile.firstName;
                // Update initials
                req.session.user.initials = (userData.profile.firstName?.charAt(0) || '?') + (userData.profile.lastName?.charAt(0) || '');
            }
            if (userData.preferences) {
                req.session.user.preferences = { ...req.session.user.preferences, ...userData.preferences };
            }
        }
    }

    // ============================================================================
    // MIDDLEWARE FUNCTIONS
    // ============================================================================

    /**
     * Middleware to require authentication
     * Uses CommonUtils.sendError for proper API/web error handling
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     * @param {function} next - Express next function
     */
    static requireAuthentication(req, res, next) {
        if (!AuthController.isAuthenticated(req)) {
            global.LogController.logError(req, 'auth.requireAuthentication', 'error: Authentication required - access denied');
            const message = global.i18n.translate(req, 'controller.auth.authenticationRequired');
            return global.CommonUtils.sendError(req, res, 401, message, 'UNAUTHORIZED');
        }
        next();
    }

    /**
     * Middleware factory to require specific roles
     * Uses CommonUtils.sendError for proper API/web error handling
     * @param {array} roles - Array of required roles (user must have at least one)
     * @returns {function} Express middleware function
     */
    static requireRole(roles) {
        return (req, res, next) => {
            if (!AuthController.isAuthenticated(req)) {
                global.LogController.logError(req, 'auth.requireRole', 'error: Authentication required for role check - access denied');
                const message = global.i18n.translate(req, 'controller.auth.authenticationRequired');
                return global.CommonUtils.sendError(req, res, 401, message, 'UNAUTHORIZED');
            }

            if (!AuthController.isAuthorized(req, roles)) {
                const roleList = Array.isArray(roles) ? roles.join(', ') : roles;
                global.LogController.logError(req, 'auth.requireRole', `error: Role required (${roleList}) - access denied for user ${req.session.user.username}`);
                const message = global.i18n.translate(req, 'controller.auth.roleRequired', { roles: roleList });
                return global.CommonUtils.sendError(req, res, 403, message, 'INSUFFICIENT_PRIVILEGES');
            }

            next();
        };
    }

    // ============================================================================
    // UTILITY FUNCTIONS (for use in controllers)
    // ============================================================================

    /**
     * Check if request has authenticated user (utility function)
     * @param {object} req - Express request object
     * @returns {boolean} True if user is authenticated
     */
    static isAuthenticated(req) {
        return !!(req.session?.user?.isAuthenticated);
    }

    /**
     * Check if authenticated user has required role(s) (utility function)
     * @param {object} req - Express request object
     * @param {array|string} roles - Required role(s) - user must have at least one,
     *                               or '_public' role if not authenticated
     * @returns {boolean} True if user has at least one of the required roles,
     *                    or is not authenticated and roles includes '_public' role
     */
    static isAuthorized(req, roles) {

        // Convert single role to array for consistent handling
        const requiredRoles = Array.isArray(roles) ? roles : [roles];

        if (!AuthController.isAuthenticated(req)) {
            // Authorized if not authenticated and roles includes '_public' role
            return requiredRoles.includes('_public');
        }

        if (!Array.isArray(req.session?.user?.roles)) {
            // Not authorized if authenticated and roles is not an array
            return false;
        }

        // Authorized if user has any of the required roles
        return req.session.user.roles.some(userRole => requiredRoles.includes(userRole));
    }

    // ============================================================================
    // AUTHENTICATION ENDPOINTS (moved from UserController)
    // ============================================================================

    /**
     * User login/authentication
     * POST /api/1/auth/login
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async login(req, res) {
        const startTime = Date.now();
        try {
            global.LogController.logRequest(req, 'auth.login', JSON.stringify({ identifier: req.body.identifier }));

             // Bail out if login is disabled
             if (global.appConfig.controller.auth.disableLogin) {
                LogController.logError(req, 'auth.login', 'error: login is disabled');
                const message = global.i18n.translate(req, 'controller.auth.loginDisabled');
                return global.CommonUtils.sendError(req, res, 403, message, 'LOGIN_DISABLED');
            }

            const { identifier, password } = req.body;

            if (!identifier || !password) {
                global.LogController.logError(req, 'auth.login', 'error: Both identifier (username or email) and password are required');
                const message = global.i18n.translate(req, 'controller.auth.idAndPasswordRequired');
                return res.status(400).json({
                    success: false,
                    error: message,
                    code: 'MISSING_CREDENTIALS'
                });
            }

            // Authenticate user
            const user = await UserModel.authenticate(identifier, password);

            if (!user) {
                global.LogController.logError(req, 'auth.login', `error: Login failed for identifier: ${identifier}`);
                const message = global.i18n.translate(req, 'controller.auth.invalidCredentials');
                return res.status(401).json({
                    success: false,
                    error: message,
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
                username: user.username,
                email: user.email,
                firstName: user.profile.firstName,
                lastName: user.profile.lastName,
                nickName: user.profile.nickName || user.profile.firstName,
                initials: (user.profile.firstName?.charAt(0) || '?') + (user.profile.lastName?.charAt(0) || ''),
                roles: user.roles,
                preferences: user.preferences,
                isAuthenticated: true
            };

            const elapsed = Date.now() - startTime;
            global.LogController.logInfo(req, 'auth.login', `success: User ${user.username} logged in, completed in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.auth.loginSuccessful');
            res.json({
                success: true,
                data: {
                    user: req.session.user
                },
                message: message,
                elapsed
            });

        } catch (error) {
            global.LogController.logError(req, 'auth.login', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.auth.loginInternalError', { error: error.message });
            res.status(500).json({
                success: false,
                error: message,
                code: 'INTERNAL_ERROR',
                details: error.message
            });
        }
    }

    /**
     * User logout
     * POST /api/1/auth/logout
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async logout(req, res) {
        const startTime = Date.now();
        try {
            const username = req.session.user ? req.session.user.username : '(unknown)';

            global.LogController.logRequest(req, 'auth.logout', username);

            // Destroy session
            req.session.destroy((err) => {
                if (err) {
                    global.LogController.logError(req, 'auth.logout', `error: ${err.message}`);
                    const message = global.i18n.translate(req, 'controller.auth.logoutFailed');
                    return res.status(500).json({
                        success: false,
                        error: message,
                        code: 'LOGOUT_ERROR'
                    });
                }

                const elapsed = Date.now() - startTime;
                global.LogController.logInfo(req, 'auth.logout', `success: User ${username} logged out, completed in ${elapsed}ms`);
                const message = global.i18n.translate(req, 'controller.auth.logoutSuccessful');
                res.json({
                    success: true,
                    message: message,
                    elapsed
                });
            });

        } catch (error) {
            global.LogController.logError(req, 'auth.logout', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.auth.logoutInternalError', { error: error.message });
            res.status(500).json({
                success: false,
                error: message,
                code: 'INTERNAL_ERROR',
                details: error.message
            });
        }
    }

    /**
     * Get available user roles
     * GET /api/1/auth/roles
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async getRoles(req, res) {
        const startTime = Date.now();
        try {
            global.LogController.logRequest(req, 'auth.getRoles', '');

            // Get roles from UserModel schema
            const roles = UserModel.schema.roles.enum || ['guest', 'user', 'admin', 'root'];

            const elapsed = Date.now() - startTime;
            global.LogController.logInfo(req, 'auth.getRoles', `success: roles: ${roles.join(', ')}, completed in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.auth.rolesRetrieved');
            res.json({
                success: true,
                data: roles,
                message: message,
                elapsed
            });

        } catch (error) {
            global.LogController.logError(req, 'auth.getRoles', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.auth.rolesInternalError');
            res.status(500).json({
                success: false,
                error: message,
                code: 'INTERNAL_ERROR'
            });
        }
    }

    /**
     * Get available languages
     * GET /api/1/auth/languages
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async getLanguages(req, res) {
        const startTime = Date.now();
        try {
            global.LogController.logRequest(req, 'auth.getLanguages', '');

            // Get available languages from i18n system
            const languages = global.i18n.getList(); // Returns [['en', 'English'], ['de', 'Deutsch']]

            const elapsed = Date.now() - startTime;
            global.LogController.logInfo(req, 'auth.getLanguages', `success: languages: ${JSON.stringify(languages)}, completed in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.auth.languagesRetrieved');
            res.json({
                success: true,
                data: languages,
                message: message,
                elapsed
            });

        } catch (error) {
            global.LogController.logError(req, 'auth.getLanguages', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.auth.languagesInternalError');
            res.status(500).json({
                success: false,
                error: message,
                code: 'INTERNAL_ERROR'
            });
        }
    }

    /**
     * Get available theme options
     * GET /api/1/auth/themes
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async getThemes(req, res) {
        const startTime = Date.now();
        try {
            global.LogController.logRequest(req, 'auth.getThemes', '');

            // Get themes from UserModel schema
            const themes = UserModel.schema.preferences.theme.enum || ['light', 'dark'];

            const elapsed = Date.now() - startTime;
            global.LogController.logInfo(req, 'auth.getThemes', `success: themes: ${themes.join(', ')}, completed in ${elapsed}ms`);

            const message = global.i18n.translate(req, 'controller.auth.themesRetrieved');
            res.json({
                success: true,
                data: themes,
                message: message,
                elapsed
            });
        } catch (error) {
            global.LogController.logError(req, 'auth.getThemes', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.auth.themesInternalError');
            res.status(500).json({
                success: false,
                error: message,
                code: 'INTERNAL_ERROR'
            });
        }
    }
}

export default AuthController;

// EOF webapp/controller/auth.js
