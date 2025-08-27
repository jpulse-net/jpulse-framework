/**
 * @name            jPulse Framework / WebApp / Controller / Auth
 * @tagline         Authentication Controller for jPulse Framework WebApp
 * @description     This is the authentication controller for the jPulse Framework WebApp
 * @file            webapp/controller/auth.js
 * @version         0.2.7
 * @release         2025-08-27
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import UserModel from '../model/user.js';
import LogController from './log.js';
import CommonUtils from '../utils/common.js';

/**
 * Auth Controller - handles authentication, authorization, and middleware
 */
class AuthController {
    
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
            LogController.error(req, 'Authentication required - access denied');
            return CommonUtils.sendError(req, res, 401, 'Authentication required', 'UNAUTHORIZED');
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
                LogController.error(req, 'Authentication required for role check - access denied');
                return CommonUtils.sendError(req, res, 401, 'Authentication required', 'UNAUTHORIZED');
            }
            
            if (!AuthController.isAuthorized(req, roles)) {
                const roleList = Array.isArray(roles) ? roles.join(', ') : roles;
                LogController.error(req, `Role required (${roleList}) - access denied for user ${req.session.user.loginId}`);
                return CommonUtils.sendError(req, res, 403, `Required role: ${roleList}`, 'INSUFFICIENT_PRIVILEGES');
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
        return !!(req.session && req.session.user && req.session.user.authenticated);
    }
    
    /**
     * Check if authenticated user has required role(s) (utility function)
     * @param {object} req - Express request object
     * @param {array|string} roles - Required role(s) - user must have at least one
     * @returns {boolean} True if user has at least one of the required roles
     */
    static isAuthorized(req, roles) {
        if (!AuthController.isAuthenticated(req)) {
            return false;
        }
        
        const user = req.session.user;
        if (!user.roles || !Array.isArray(user.roles)) {
            return false;
        }
        
        // Convert single role to array for consistent handling
        const requiredRoles = Array.isArray(roles) ? roles : [roles];
        
        // Check if user has any of the required roles
        return user.roles.some(userRole => requiredRoles.includes(userRole));
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
        try {
            LogController.consoleApi(req, `auth.login( ${JSON.stringify({ identifier: req.body.identifier })} )`);

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
            LogController.error(req, `auth.login failed: ${error.message}`);
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
     * POST /api/1/auth/logout
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async logout(req, res) {
        try {
            const loginId = req.session.user ? req.session.user.loginId : '(unknown)';

            LogController.consoleApi(req, `auth.logout( ${loginId} )`);

            // Destroy session
            req.session.destroy((err) => {
                if (err) {
                    LogController.error(req, `auth.logout failed: ${err.message}`);
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
            LogController.error(req, `auth.logout failed: ${error.message}`);
            res.status(500).json({
                success: false,
                error: 'Internal server error during logout',
                code: 'INTERNAL_ERROR',
                details: error.message
            });
        }
    }
}

export default AuthController;

// EOF webapp/controller/auth.js
