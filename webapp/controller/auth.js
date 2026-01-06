/**
 * @name            jPulse Framework / WebApp / Controller / Auth
 * @tagline         Authentication Controller for jPulse Framework WebApp
 * @description     This is the authentication controller for the jPulse Framework WebApp
 * @file            webapp/controller/auth.js
 * @version         1.4.6
 * @release         2026-01-06
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 2.0, Claude Sonnet 4.5
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

    // ============================================================================
    // W-109: Multi-step authentication helper methods
    // ============================================================================

    /**
     * Get required authentication steps from plugins
     * W-109: Part of multi-step authentication flow
     * @param {object} req - Express request
     * @param {object} user - User object
     * @param {array} completedSteps - Steps already completed
     * @returns {array} Array of { step, priority, data }
     */
    static async _getRequiredSteps(req, user, completedSteps) {
        const context = {
            req,
            user,
            completedSteps,
            requiredSteps: []
        };
        const result = await global.HookManager.execute('onAuthGetSteps', context);

        // Sort by priority (lower = first), filter already completed
        return result.requiredSteps
            .filter(s => !completedSteps.includes(s.step))
            .sort((a, b) => (a.priority || 100) - (b.priority || 100));
    }

    /**
     * Complete login - create session, return user
     * W-109: Shared function for single-step and multi-step login completion
     * @param {object} req - Express request
     * @param {object} res - Express response
     * @param {object} user - User object
     * @param {string} authMethod - Authentication method used
     * @param {number} startTime - Request start time for elapsed calculation
     */
    static async _completeLogin(req, res, user, authMethod, startTime) {
        // Update login statistics
        await UserModel.updateById(user._id, {
            lastLogin: new Date(),
            loginCount: (user.loginCount || 0) + 1
        });

        // Build session data
        let sessionData = {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            firstName: user.profile?.firstName,
            lastName: user.profile?.lastName,
            nickName: user.profile?.nickName || user.profile?.firstName,
            initials: (user.profile?.firstName?.charAt(0) || '?') +
                      (user.profile?.lastName?.charAt(0) || ''),
            roles: user.roles,
            preferences: user.preferences,
            isAuthenticated: true
        };

        // Hook: modify session data
        let sessionContext = { req, user, sessionData };
        sessionContext = await global.HookManager.execute('onAuthBeforeSession', sessionContext);

        // Hook: get non-blocking warnings
        const warningContext = { req, user, warnings: [] };
        const warningResult = await global.HookManager.execute('onAuthGetWarnings', warningContext);
        global.LogController.logInfo(req, 'auth._completeLogin',
            `Warnings hook result: ${warningResult.warnings?.length || 0} warning(s)`);

        // Create session
        req.session.user = sessionContext.sessionData;
        delete req.session.pendingAuth;

        // Hook: post-login
        await global.HookManager.execute('onAuthAfterLogin', {
            req, user, session: req.session.user, authMethod
        });

        const elapsed = Date.now() - startTime;
        global.LogController.logInfo(req, 'auth.login',
            `success: ${user.username} logged in via ${authMethod}, completed in ${elapsed}ms`);

        const message = global.i18n.translate(req, 'controller.auth.loginSuccess');
        return res.json({
            success: true,
            nextStep: null,
            data: { user: req.session.user },
            warnings: warningResult.warnings,
            message,
            elapsed
        });
    }

    /**
     * User login/authentication - Multi-step flow
     * POST /api/1/auth/login
     * W-105: Enhanced with plugin hooks for external auth providers (OAuth2, LDAP, MFA)
     * W-109: Refactored for multi-step authentication flow
     *
     * Request body:
     *   First call:  { step: "credentials", identifier: "...", password: "..." }
     *   Next calls:  { step: "mfa", code: "123456" }
     *
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async login(req, res) {
        const startTime = Date.now();
        const PENDING_AUTH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

        try {
            // W-109: Parse step from request, default to 'credentials' for backward compatibility
            const { step = 'credentials', ...stepData } = req.body;

            global.LogController.logRequest(req, 'auth.login', JSON.stringify({
                step,
                identifier: stepData.identifier || stepData.username || '(n/a)'
            }));

            // Bail out if login is disabled
            if (global.appConfig.controller.auth.disableLogin) {
                global.LogController.logError(req, 'auth.login', 'error: login is disabled');
                const message = global.i18n.translate(req, 'controller.auth.loginDisabled');
                return global.CommonUtils.sendError(req, res, 403, message, 'LOGIN_DISABLED');
            }

            // Get or initialize pending auth state
            let pending = req.session.pendingAuth;

            // =========================================================================
            // STEP: credentials (always first)
            // =========================================================================
            if (step === 'credentials') {
                // Support both 'identifier' and 'username' for backward compatibility
                const identifier = stepData.identifier || stepData.username;
                const password = stepData.password;

                if (!identifier || !password) {
                    global.LogController.logError(req, 'auth.login',
                        'error: Both identifier (username or email) and password are required');
                    const message = global.i18n.translate(req, 'controller.auth.idAndPasswordRequired');
                    return res.status(400).json({
                        success: false,
                        error: message,
                        code: 'MISSING_CREDENTIALS'
                    });
                }

                // Hook: onAuthBeforeLogin - can skip password check for external auth
                let user = null;
                let beforeLoginContext = {
                    req,
                    identifier,
                    password,
                    skipPasswordCheck: false,
                    user: null,
                    authMethod: 'internal'
                };
                beforeLoginContext = await global.HookManager.execute('onAuthBeforeLogin', beforeLoginContext);

                if (beforeLoginContext.skipPasswordCheck && beforeLoginContext.user) {
                    // External auth provided the user (LDAP, OAuth2, etc.)
                    user = beforeLoginContext.user;
                } else {
                    // Internal authentication
                    user = await UserModel.authenticate(identifier, password);
                }

                if (!user) {
                    // Hook: login failure
                    await global.HookManager.execute('onAuthFailure', {
                        req,
                        identifier,
                        reason: 'INVALID_CREDENTIALS',
                        authMethod: beforeLoginContext.authMethod
                    });

                    global.LogController.logError(req, 'auth.login',
                        `error: Login failed for identifier: ${identifier}`);
                    const message = global.i18n.translate(req, 'controller.auth.invalidCredentials');
                    return res.status(401).json({
                        success: false,
                        error: message,
                        code: 'INVALID_CREDENTIALS'
                    });
                }

                // Check account status
                if (user.status === 'locked') {
                    global.LogController.logError(req, 'auth.login',
                        `error: Account locked for user: ${user.username}`);
                    return res.status(403).json({
                        success: false,
                        error: global.i18n.translate(req, 'controller.auth.accountLocked'),
                        code: 'ACCOUNT_LOCKED'
                    });
                }

                if (user.status === 'disabled') {
                    global.LogController.logError(req, 'auth.login',
                        `error: Account disabled for user: ${user.username}`);
                    return res.status(403).json({
                        success: false,
                        error: global.i18n.translate(req, 'controller.auth.accountDisabled'),
                        code: 'ACCOUNT_DISABLED'
                    });
                }

                // W-109: Initialize pending auth
                pending = {
                    userId: user._id.toString(),
                    username: user.username,
                    authMethod: beforeLoginContext.authMethod,
                    completedSteps: ['credentials'],
                    createdAt: Date.now()
                };

                // W-109: Get required steps from plugins
                const requiredSteps = await AuthController._getRequiredSteps(req, user, pending.completedSteps);

                if (requiredSteps.length > 0) {
                    const nextStep = requiredSteps[0];
                    pending.requiredSteps = ['credentials', ...requiredSteps.map(s => s.step)];
                    req.session.pendingAuth = pending;

                    global.LogController.logInfo(req, 'auth.login',
                        `credentials valid for ${user.username}, next step: ${nextStep.step}`);

                    return res.json({
                        success: true,
                        nextStep: nextStep.step,
                        ...nextStep.data
                    });
                }

                // No additional steps - complete login immediately
                return await AuthController._completeLogin(req, res, user, beforeLoginContext.authMethod, startTime);
            }

            // =========================================================================
            // SUBSEQUENT STEPS (mfa, email-verify, etc.)
            // =========================================================================

            // Validate pending auth exists
            if (!pending) {
                global.LogController.logError(req, 'auth.login',
                    `error: Step '${step}' submitted without pending auth`);
                return res.status(400).json({
                    success: false,
                    error: global.i18n.translate(req, 'controller.auth.noPendingAuth'),
                    code: 'NO_PENDING_AUTH'
                });
            }

            // Check timeout (5 minutes)
            if (Date.now() - pending.createdAt > PENDING_AUTH_TIMEOUT_MS) {
                delete req.session.pendingAuth;
                global.LogController.logError(req, 'auth.login',
                    `error: Pending auth expired for user: ${pending.username}`);
                return res.status(400).json({
                    success: false,
                    error: global.i18n.translate(req, 'controller.auth.authExpired'),
                    code: 'AUTH_EXPIRED'
                });
            }

            // Validate step is expected
            const remainingSteps = pending.requiredSteps.filter(
                s => !pending.completedSteps.includes(s)
            );
            const expectedStep = remainingSteps[0];
            // Allow alternative steps (e.g., 'mfa-backup' as alternative to 'mfa')
            const isValidStep = step === expectedStep ||
                (expectedStep === 'mfa' && step === 'mfa-backup');
            if (!isValidStep) {
                global.LogController.logError(req, 'auth.login',
                    `error: Unexpected step '${step}', expected '${expectedStep}'`);
                return res.status(400).json({
                    success: false,
                    error: global.i18n.translate(req, 'controller.auth.invalidStep', { step }),
                    code: 'INVALID_STEP'
                });
            }

            // Load user for hook context (plugins need full user object)
            let user = await UserModel.findById(pending.userId);

            // W-109: Execute step via hook
            const stepContext = {
                req,
                step,
                stepData,
                pending,
                user,       // Full user object for plugins
                valid: false,
                error: null
            };
            const result = await global.HookManager.execute('onAuthValidateStep', stepContext);

            if (!result.valid) {
                global.LogController.logError(req, 'auth.login',
                    `error: Step '${step}' failed for user ${pending.username}: ${result.error}`);
                return res.status(400).json({
                    success: false,
                    error: result.error || global.i18n.translate(req, 'controller.auth.stepFailed'),
                    code: 'STEP_FAILED'
                });
            }

            // Mark step complete (use expectedStep for alternatives like mfa-backup -> mfa)
            pending.completedSteps.push(expectedStep);

            // Reload user (may have been modified by step, e.g., MFA lockout cleared)
            user = await UserModel.findById(pending.userId);
            const requiredSteps = await AuthController._getRequiredSteps(req, user, pending.completedSteps);

            if (requiredSteps.length > 0) {
                const nextStep = requiredSteps[0];
                pending.requiredSteps = [...pending.completedSteps, ...requiredSteps.map(s => s.step)];
                req.session.pendingAuth = pending;

                global.LogController.logInfo(req, 'auth.login',
                    `step '${step}' complete for ${user.username}, next step: ${nextStep.step}`);

                return res.json({
                    success: true,
                    nextStep: nextStep.step,
                    ...nextStep.data
                });
            }

            // All steps complete - finish login
            return await AuthController._completeLogin(req, res, user, pending.authMethod, startTime);

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
     * W-105: Enhanced with plugin hooks for logout notifications
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async logout(req, res) {
        const startTime = Date.now();
        try {
            const username = req.session.user ? req.session.user.username : '(unknown)';
            const sessionData = req.session.user ? { ...req.session.user } : null;

            global.LogController.logRequest(req, 'auth.logout', username);

            // Note: Logout hooks removed in Phase 8 simplification
            // If needed, logout auditing can be done via authAfterLogin tracking

            // Destroy session
            req.session.destroy(async (err) => {
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

}

export default AuthController;

// EOF webapp/controller/auth.js
