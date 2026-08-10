/**
 * @name            jPulse Framework / WebApp / Controller / Auth
 * @tagline         Authentication Controller for jPulse Framework WebApp
 * @description     This is the authentication controller for the jPulse Framework WebApp
 * @file            webapp/controller/auth.js
 * @version         1.7.10
 * @release         2026-08-09
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 3.14, Claude Sonnet 5
 */

import UserModel from '../model/user.js';
import ConfigModel from '../model/config.js';
// i18n will be available globally after bootstrap

/**
 * Auth Controller - handles authentication, authorization, and middleware
 */
class AuthController {

    // W-109: default pendingAuth window; W-205 extends this to 30 min while 'email-verify' is
    // the current expected step (see _pendingAuthTimeoutMs() below) - long enough to receive
    // and act on mail, while a password-validated-but-not-yet-MFA-complete state still can't
    // linger indefinitely.
    static PENDING_AUTH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    /**
     * Which step is still outstanding for a pendingAuth - the first required step not yet
     * in completedSteps. Shared by login() and pendingStatus() (W-205) so both apply the
     * identical rule.
     * @param {object} pending - req.session.pendingAuth
     * @returns {string|undefined} The expected step name, or undefined if none remain
     */
    static _getExpectedStep(pending) {
        const remainingSteps = pending.requiredSteps.filter(
            s => !pending.completedSteps.includes(s)
        );
        return remainingSteps[0];
    }

    /**
     * W-205: 30-minute pendingAuth window while 'email-verify' is the current step (long
     * enough to receive and act on mail), PENDING_AUTH_TIMEOUT_MS (5 min) for every other
     * step - shared by login() and pendingStatus() so both apply the identical rule.
     * @param {string} expectedStep - Current expected step (see _getExpectedStep())
     * @returns {number} Timeout in milliseconds
     */
    static _pendingAuthTimeoutMs(expectedStep) {
        return expectedStep === 'email-verify' ? 30 * 60 * 1000 : AuthController.PENDING_AUTH_TIMEOUT_MS;
    }

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

    /**
     * W-147: Middleware that requires admin role from config (per-request cache read)
     * Use instead of requireRole(adminRoles) for admin routes so config changes take effect without restart.
     * @returns {function} Express middleware function
     */
    static requireAdminRole() {
        return (req, res, next) => {
            const adminRoles = ConfigModel.getEffectiveAdminRoles();
            return AuthController.requireRole(adminRoles)(req, res, next);
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
     * @param {array|string} roleOrRoles - Required role(s) - user must have at least one,
     *                    or '_public' if not authenticated; single string or array
     * @returns {boolean} True if user has at least one of the required roles,
     *                    or is not authenticated and roleOrRoles includes '_public'
     */
    static isAuthorized(req, roleOrRoles) {

        // Convert single role to array for consistent handling
        const requiredRoles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];

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

    /**
     * Check if authenticated user has admin role (utility function, request-based)
     * W-153: Simplified admin check using config-based admin roles
     * @param {object} req - Express request object
     * @returns {boolean} True if user has admin role
     */
    static isAdmin(req) {
        const adminRoles = ConfigModel.getEffectiveAdminRoles();
        return AuthController.isAuthorized(req, adminRoles);
    }

    /**
     * Check if user object has admin role (utility function, user-based)
     * W-153: Symmetrical with isAdmin(req); for use in models/utilities where request is not available
     * @param {object} user - User object with roles array
     * @returns {boolean} True if user has admin role
     */
    static userIsAdmin(user) {
        const adminRoles = ConfigModel.getEffectiveAdminRoles();
        return AuthController.userIsAuthorized(user, adminRoles);
    }

    /**
     * Check if user object has required role(s) (utility function, user-based)
     * W-153: Symmetrical with isAuthorized(req, roleOrRoles); for use in models/utilities
     * @param {object} user - User object with roles array
     * @param {array|string} roleOrRoles - Required role(s) - user must have at least one
     * @returns {boolean} True if user has at least one of the required roles
     */
    static userIsAuthorized(user, roleOrRoles) {
        // Convert single role to array for consistent handling
        const requiredRoles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];

        if (!Array.isArray(user?.roles)) {
            return false;
        }

        // Return true if user has any of the required roles
        return user.roles.some(userRole => requiredRoles.includes(userRole));
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

        // W-205: core step, pushed ahead of the hook so a plugin inspecting
        // context.requiredSteps in onAuthGetSteps already sees it (final ordering below is by
        // priority regardless - 50 puts it ahead of MFA's 100). Serves login() and
        // completeExternalAuth() alike since both call this one method, so SSO logins are
        // covered with no extra code. Only 'required' reaches this branch: 'nag' never blocks
        // login (it surfaces via the warning pushed in _completeLoginSession() instead), and
        // 'off' offers no verification path anywhere. getEmailVerificationPolicy() degrades
        // 'required' to 'nag' at runtime when EmailController.isConfigured() is false, so
        // unconfigured SMTP can't lock out signups (W-205 Phase 6).
        const emailVerifyPolicy = UserModel.getEmailVerificationPolicy();
        if (emailVerifyPolicy === 'required' && user.emailVerified === false) {
            context.requiredSteps.push({
                step: 'email-verify',
                priority: 50,
                page: '/auth/email-verify.shtml',
                data: { email: global.CommonUtils.maskEmail(user.email) }
            });

            // Issue on arrival, never speculatively: skip if a still-valid credential already
            // exists, so a login retry (page reload, wrong MFA code, etc.) doesn't resend on
            // every attempt while this step is pending.
            const hasValid = await UserModel.hasValidEmailVerification(user._id);
            if (!hasValid) {
                await UserModel.issueEmailVerification(req, user);
            }
        }

        const result = await global.HookManager.execute('onAuthGetSteps', context);

        // Sort by priority (lower = first), filter already completed
        return result.requiredSteps
            .filter(s => !completedSteps.includes(s.step))
            .sort((a, b) => (a.priority || 100) - (b.priority || 100));
    }

    /**
     * Create session, run post-login hooks - shared core of login completion
     * W-109: Extracted from _completeLogin so it can be reused without a `res.json(...)` response.
     * W-195: No `res` calls here - lets completeExternalAuth() finish with a 302 instead of JSON.
     * @param {object} req - Express request
     * @param {object} user - User object
     * @param {string} authMethod - Authentication method used
     * @param {number} startTime - Request start time for elapsed calculation
     * @returns {Promise<{warnings: array, elapsed: number}>}
     */
    static async _completeLoginSession(req, user, authMethod, startTime) {
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

        // W-205: 'nag' mode surfaces a toast every login until verified - no snooze/dismissal
        // state, so no new schema field. 'required' mode blocks earlier in _getRequiredSteps()
        // and never reaches here unverified; 'off' intentionally skips this branch even though
        // emailVerified may itself still be false (its schema default) - 'off' means no
        // verification path is offered anywhere, nag included. Uses translateForUser() (not
        // translate(req, ...)) because req.session.user isn't set yet at this point in the
        // flow - it would fall back to the site default language rather than this user's own.
        // getEmailVerificationPolicy() may itself report 'nag' here even though 'required' is
        // configured, if SMTP isn't set up (W-205 Phase 6) - same degrade as _getRequiredSteps().
        const emailVerifyPolicy = UserModel.getEmailVerificationPolicy();
        if (emailVerifyPolicy === 'nag' && user.emailVerified === false) {
            warningResult.warnings.push({
                type: 'email-verify-nag',
                toastType: 'error',
                message: global.i18n.translateForUser(user, 'controller.auth.emailVerifyNag'),
                link: '/auth/email-verify.shtml',
                linkText: global.i18n.translateForUser(user, 'controller.auth.emailVerifyNagLinkText')
            });
        }

        global.LogController.logInfo(req, 'auth._completeLoginSession',
            `Warnings hook result: ${warningResult.warnings?.length || 0} warning(s)`);

        // W-205: also stash on the session (self-cleaning - always overwritten/cleared here,
        // never accumulates across logins) so a DIFFERENT same-session tab's pendingStatus()
        // poll can still deliver these once it notices login already completed elsewhere -
        // that tab never sees this function's own return value, which only reaches whichever
        // request actually called it (the confirm-link click, not the waiting tab's poll).
        if (warningResult.warnings?.length > 0) {
            req.session.pendingWarnings = warningResult.warnings;
        } else {
            delete req.session.pendingWarnings;
        }

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

        return { warnings: warningResult.warnings, elapsed };
    }

    /**
     * Finish a login that did NOT start in login() - the supported entry point for it.
     * W-206: the caller has proved something about the user by some other means (a mailed
     * password-reset link, a mailed verification link) and now wants the rest of login()'s
     * post-credentials machinery: the remaining multi-step requirements, and session creation
     * once none are left. Centralizing that is the point - rebuilding `pendingAuth` by hand at
     * each call site is precisely how a mailed link turns into an MFA bypass, so
     * _getRequiredSteps() and _completeLoginSession() stay private behind this.
     *
     * Deliberately does NOT gate on user.status or localAuthRestriction - the same contract
     * completeExternalAuth() documents, and for the same reason: W-201 centralized status
     * enforcement in login(), and each non-login caller knows its own policy (an OAuth plugin
     * reports different reason codes than a reset endpoint). Callers must check before calling.
     *
     * Any pre-existing pendingAuth in this browser session is replaced, never merged - it
     * belongs to an earlier, abandoned attempt and possibly to a different account. The fresh
     * createdAt also restarts the step window, which matters when the caller is a mailed link:
     * the minutes (or hours) the mail round trip took should not be charged against the window
     * for whatever step comes next.
     *
     * @param {object} req - Express request object
     * @param {object} user - User document (full, as loaded from the model)
     * @param {string} authMethod - Authentication method that got us here (e.g. 'internal', 'oauth')
     * @param {object} [options] - Options
     * @param {array} [options.completedSteps=['credentials']] - What the caller has proved. The
     *   caller owns this: a reset confirm starts fresh, a verify-link click continues an
     *   existing pendingAuth's list.
     * @param {string} [options.redirect=null] - Intended post-login destination; validated here
     *   and echoed back in the result, so callers never have to re-validate.
     * @param {number} [options.startTime=Date.now()] - Request start, for the elapsed figure in
     *   the login log line.
     * @returns {Promise<object>} { nextStep, page, data, warnings, redirect } - nextStep/page/data
     *   set when a step remains (no session created); warnings set when the login completed.
     */
    static async beginAuthenticatedSession(req, user, authMethod, options = {}) {
        const {
            completedSteps = ['credentials'],
            redirect = null,
            startTime = Date.now()
        } = options;

        const safeRedirect = global.CommonUtils.isSafeRedirectUrl(req, redirect) ? redirect : null;

        const pending = {
            userId: user._id.toString(),
            username: user.username,
            authMethod,
            completedSteps: [...completedSteps],
            redirect: safeRedirect,
            createdAt: Date.now()
        };

        const requiredSteps = await AuthController._getRequiredSteps(req, user, pending.completedSteps);

        if (requiredSteps.length > 0) {
            const nextStep = requiredSteps[0];
            pending.requiredSteps = [...pending.completedSteps, ...requiredSteps.map(s => s.step)];
            req.session.pendingAuth = pending;

            global.LogController.logInfo(req, 'auth.beginAuthenticatedSession',
                `${user.username} authenticated via ${authMethod}, next step: ${nextStep.step}`);

            return {
                nextStep: nextStep.step,
                page: nextStep.page || null,
                data: nextStep.data || null,
                warnings: [],
                redirect: safeRedirect
            };
        }

        const { warnings } = await AuthController._completeLoginSession(req, user, authMethod, startTime);
        return { nextStep: null, page: null, data: null, warnings, redirect: safeRedirect };
    }

    /**
     * Complete login - create session, return user via JSON
     * W-109: Shared function for single-step and multi-step login completion (AJAX flow)
     * @param {object} req - Express request
     * @param {object} res - Express response
     * @param {object} user - User object
     * @param {string} authMethod - Authentication method used
     * @param {number} startTime - Request start time for elapsed calculation
     */
    static async _completeLogin(req, res, user, authMethod, startTime) {
        const { warnings, elapsed } = await AuthController._completeLoginSession(req, user, authMethod, startTime);

        const message = global.i18n.translate(req, 'controller.auth.loginSuccess');
        return res.json({
            success: true,
            nextStep: null,
            data: { user: req.session.user },
            warnings,
            message,
            elapsed
        });
    }

    /**
     * Complete a browser-redirect-based external login (OAuth, LDAP, SAML plugins)
     * W-195: 302-redirect-friendly counterpart to the AJAX login() flow. External-auth plugins
     * call this from their own callback controller after resolving/creating the local user -
     * the framework owns pendingAuth bookkeeping, multi-step continuation (e.g. MFA), and final
     * session creation, so plugins never touch req.session or _completeLoginSession directly.
     *
     * No implicit gate on user.status here - the plugin's callback handler must check it
     * (e.g. 'pending' approval) before calling this. localAuthRestriction is not enforced here
     * either - it's a policy for local username/password login only, not external auth.
     *
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     * @param {object} user - Resolved/created local user document
     * @param {string} authMethod - Authentication method used (e.g. 'oauth', 'ldap', 'saml')
     * @param {string} redirectUrl - Destination URL once login is fully complete
     */
    static async completeExternalAuth(req, res, user, authMethod, redirectUrl) {
        const startTime = Date.now();
        const finalRedirect = global.CommonUtils.isSafeRedirectUrl(req, redirectUrl) ? redirectUrl : '/';

        // W-205: stashed the same way as login()'s credentials step, so a mail-link click on
        // /api/1/user/email-verify/confirm (a plain GET, outside this browser-redirect chain)
        // can still land on the right destination once verification completes.
        const pending = {
            userId: user._id.toString(),
            username: user.username,
            authMethod,
            completedSteps: ['credentials'],
            redirect: finalRedirect,
            createdAt: Date.now()
        };

        const requiredSteps = await AuthController._getRequiredSteps(req, user, pending.completedSteps);

        if (requiredSteps.length > 0) {
            const nextStep = requiredSteps[0];
            pending.requiredSteps = ['credentials', ...requiredSteps.map(s => s.step)];
            req.session.pendingAuth = pending;

            global.LogController.logInfo(req, 'auth.completeExternalAuth',
                `credentials valid for ${user.username} via ${authMethod}, next step: ${nextStep.step}`);

            // W-195: step-provided `page` (see onAuthGetSteps) drives the redirect target;
            // a step without one can't be resolved for a browser-redirect flow - fall back
            // to the login page rather than guessing (misconfigured plugin, not a security gap).
            if (!nextStep.page) {
                global.LogController.logWarning(req, 'auth.completeExternalAuth',
                    `warning: step '${nextStep.step}' has no 'page' for browser-redirect flow, falling back to /auth/login.shtml`);
            }
            const nextPage = nextStep.page || '/auth/login.shtml';
            return res.redirect(`${nextPage}?redirect=${encodeURIComponent(finalRedirect)}`);
        }

        const { warnings } = await AuthController._completeLoginSession(req, user, authMethod, startTime);
        return res.redirect(global.CommonUtils.appendToastsToUrl(finalRedirect, warnings));
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

        try {
            // W-109: Parse step from request, default to 'credentials' for backward compatibility
            const { step = 'credentials', ...stepData } = req.body;

            global.LogController.logRequest(req, 'auth.login', JSON.stringify({
                step,
                identifier: stepData.identifier || stepData.username || '(n/a)'
            }));

            // W-204: IP-based rate limit on the whole endpoint (every step, not just
            // 'credentials' - the multi-step flow posts MFA/other step data here too),
            // defense-in-depth alongside nginx's 'login' zone (templates/deploy/nginx.prod.conf)
            // for deployments without that reference config in front of the app (local dev,
            // containers, a customized reverse proxy, etc.). Fails open (no RedisManager, or
            // Redis itself unreachable per cacheCheckRateLimit()) rather than blocking login.
            const loginRateLimit = global.appConfig?.controller?.auth?.loginRateLimit;
            if (loginRateLimit?.enabled !== false && global.RedisManager) {
                const clientIp = global.CommonUtils.getLogContext(req).ip;
                const rateLimit = await global.RedisManager.cacheCheckRateLimit(
                    'controller:auth:rateLimit:login', clientIp,
                    {
                        limit: loginRateLimit?.maxAttempts || 20,
                        windowSeconds: loginRateLimit?.windowSeconds || 300
                    });

                if (!rateLimit.allowed) {
                    await global.HookManager.execute('onAuthFailure', {
                        req,
                        identifier: stepData.identifier || stepData.username || null,
                        reason: 'RATE_LIMITED',
                        authMethod: 'internal'
                    });

                    global.LogController.logError(req, 'auth.login',
                        `error: rate limit exceeded for IP: ${clientIp}`);
                    const message = global.i18n.translate(req, 'controller.auth.rateLimited');
                    return global.CommonUtils.sendError(req, res, 429, message, 'RATE_LIMITED',
                        { retryAfter: Math.ceil(rateLimit.retryAfter / 1000) });
                }
            }

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

                // W-195: enforce site-wide local-auth restriction policy (internal auth only -
                // external auth methods already proved identity via their own hook/provider)
                if (beforeLoginContext.authMethod === 'internal') {
                    const localAuthRestriction = global.appConfig?.controller?.auth?.localAuthRestriction || 'none';
                    const isRestricted = localAuthRestriction === 'disabled' ||
                        (localAuthRestriction === 'admins-only' && !AuthController.userIsAdmin(user));

                    if (isRestricted) {
                        await global.HookManager.execute('onAuthFailure', {
                            req,
                            identifier,
                            reason: 'LOCAL_AUTH_RESTRICTED',
                            authMethod: 'internal'
                        });

                        global.LogController.logError(req, 'auth.login',
                            `error: local auth restricted (${localAuthRestriction}) for identifier: ${identifier}`);
                        const message = global.i18n.translate(req, 'controller.auth.localAuthRestricted');
                        return res.status(403).json({
                            success: false,
                            error: message,
                            code: 'LOCAL_AUTH_RESTRICTED'
                        });
                    }
                }

                // Check account status (W-201): the single place status is enforced for the whole
                // login() flow, for both the internal (UserModel.authenticate()) and external
                // (onAuthBeforeLogin skipPasswordCheck) paths above - UserModel.authenticate() only
                // verifies credentials, it never gates on status. Reason codes/order mirror
                // plugins/auth-oauth/webapp/controller/oauthAuth.js _handleLoginCallback(), so the
                // two systems behave identically from an admin/end-user perspective.
                if (user.status === 'pending') {
                    await global.HookManager.execute('onAuthFailure', {
                        req,
                        identifier,
                        reason: 'ACCOUNT_PENDING_APPROVAL',
                        authMethod: beforeLoginContext.authMethod
                    });

                    global.LogController.logError(req, 'auth.login',
                        `error: account pending approval for user: ${user.username}`);
                    return res.status(403).json({
                        success: false,
                        error: global.i18n.translate(req, 'controller.auth.accountPendingApproval'),
                        code: 'ACCOUNT_PENDING_APPROVAL'
                    });
                }

                if (user.status === 'suspended') {
                    await global.HookManager.execute('onAuthFailure', {
                        req,
                        identifier,
                        reason: 'ACCOUNT_SUSPENDED',
                        authMethod: beforeLoginContext.authMethod
                    });

                    global.LogController.logError(req, 'auth.login',
                        `error: account suspended for user: ${user.username}`);
                    return res.status(403).json({
                        success: false,
                        error: global.i18n.translate(req, 'controller.auth.accountSuspended'),
                        code: 'ACCOUNT_SUSPENDED'
                    });
                }

                if (user.status === 'terminated') {
                    await global.HookManager.execute('onAuthFailure', {
                        req,
                        identifier,
                        reason: 'ACCOUNT_TERMINATED',
                        authMethod: beforeLoginContext.authMethod
                    });

                    global.LogController.logError(req, 'auth.login',
                        `error: account terminated for user: ${user.username}`);
                    return res.status(403).json({
                        success: false,
                        error: global.i18n.translate(req, 'controller.auth.accountTerminated'),
                        code: 'ACCOUNT_TERMINATED'
                    });
                }

                if (user.status === 'inactive') {
                    await global.HookManager.execute('onAuthFailure', {
                        req,
                        identifier,
                        reason: 'ACCOUNT_INACTIVE',
                        authMethod: beforeLoginContext.authMethod
                    });

                    global.LogController.logError(req, 'auth.login',
                        `error: account inactive for user: ${user.username}`);
                    return res.status(403).json({
                        success: false,
                        error: global.i18n.translate(req, 'controller.auth.accountInactive'),
                        code: 'ACCOUNT_INACTIVE'
                    });
                }

                // W-109: Initialize pending auth
                // W-205: stash the client's intended post-login destination now, while it's
                // still known - the client-side redirect param (login.shtml's own ?redirect=)
                // never reaches the server again once the multi-step flow moves the user to a
                // different page (e.g. a mail-link click on /api/1/user/email-verify/confirm).
                // Validated once here (write time) - the value is trusted from then on wherever
                // pending.redirect is read.
                const safeRedirect = global.CommonUtils.isSafeRedirectUrl(req, stepData.redirect) ? stepData.redirect : null;
                pending = {
                    userId: user._id.toString(),
                    username: user.username,
                    authMethod: beforeLoginContext.authMethod,
                    completedSteps: ['credentials'],
                    redirect: safeRedirect,
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
                        page: nextStep.page,
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

            // Validate step is expected (computed before the timeout check below, since
            // W-205's extended email-verify window depends on which step is current)
            const expectedStep = AuthController._getExpectedStep(pending);
            const pendingAuthTimeoutMs = AuthController._pendingAuthTimeoutMs(expectedStep);

            // Check timeout
            if (Date.now() - pending.createdAt > pendingAuthTimeoutMs) {
                delete req.session.pendingAuth;
                global.LogController.logError(req, 'auth.login',
                    `error: Pending auth expired for user: ${pending.username}`);
                return res.status(400).json({
                    success: false,
                    error: global.i18n.translate(req, 'controller.auth.authExpired'),
                    code: 'AUTH_EXPIRED'
                });
            }

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

            // W-205: resend is not a step validation attempt - it never completes the step -
            // so it's handled as a self-contained early return, ahead of both the core
            // validation branch and the onAuthValidateStep hook below.
            if (step === 'email-verify' && stepData.resend) {
                const issueResult = await UserModel.issueEmailVerification(req, user);
                if (!issueResult.success) {
                    global.LogController.logError(req, 'auth.login',
                        `error: email-verify resend failed for ${pending.username}: ${issueResult.errorCode}`);
                    return res.status(429).json({
                        success: false,
                        error: global.i18n.translate(req, 'controller.auth.emailVerifyRateLimited'),
                        code: issueResult.errorCode,
                        retryAfter: issueResult.retryAfter
                    });
                }
                global.LogController.logInfo(req, 'auth.login',
                    `email-verify resend for ${pending.username}`);
                return res.json({
                    success: true,
                    nextStep: 'email-verify',
                    page: '/auth/email-verify.shtml',
                    email: global.CommonUtils.maskEmail(user.email)
                });
            }

            // W-205: cross-device "am I verified yet" poll moved off this endpoint entirely -
            // see AuthController.pendingStatus() / GET /api/1/auth/pending-status. Sharing this
            // URL meant a poll (which guesses no secret) consumed the same per-IP
            // credential-guessing budget above, AND fell inside nginx's stricter 'login' zone -
            // both scoped to real login attempts, not benign status checks.

            // W-205: core step - no plugin claims 'email-verify', so validate it here, ahead of
            // the onAuthValidateStep hook (mirrors the inline mfa-backup special-case above),
            // producing the same { valid, error } shape the hook would so the shared
            // completion logic below stays uniform for both hook- and core-validated steps.
            let result;
            if (step === 'email-verify') {
                // user is reloaded from DB below regardless of outcome, so verifyResult.user
                // (already reflects the flip) isn't needed here.
                const verifyResult = await UserModel.verifyEmailByCode(req, pending.userId, stepData.code);
                if (verifyResult.success) {
                    result = { valid: true, error: null };
                } else {
                    const messageKey = verifyResult.errorCode === 'EMAIL_VERIFY_RATE_LIMITED'
                        ? 'controller.auth.emailVerifyRateLimited'
                        : verifyResult.errorCode === 'EMAIL_VERIFY_EXPIRED'
                            ? 'controller.auth.emailVerifyExpired'
                            : 'controller.auth.emailVerifyInvalidCode';
                    result = {
                        valid: false,
                        error: global.i18n.translate(req, messageKey),
                        retryAfter: verifyResult.retryAfter
                    };
                }
            } else {
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
                result = await global.HookManager.execute('onAuthValidateStep', stepContext);
            }

            if (!result.valid) {
                global.LogController.logError(req, 'auth.login',
                    `error: Step '${step}' failed for user ${pending.username}: ${result.error}`);
                return res.status(400).json({
                    success: false,
                    error: result.error || global.i18n.translate(req, 'controller.auth.stepFailed'),
                    code: 'STEP_FAILED',
                    retryAfter: result.retryAfter
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
                    page: nextStep.page,
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
     * Poll a pendingAuth for "has the current step completed elsewhere" - e.g. an
     * email-verify link clicked on another device/tab while this one waits.
     * GET /api/1/auth/pending-status
     * W-205: split out of login()'s old `step: 'email-verify', poll: true` branch onto its
     * own GET endpoint/URL specifically so a poll - which guesses no secret - falls outside
     * both nginx's stricter 'login' rate-limit zone and the Node-level per-IP
     * credential-guessing limiter in login() above; neither budget belongs to a status check.
     * No app-level rate limiting by design here either - relies on nginx's generic 'api' zone.
     * Deliberately unauthenticated (mirrors getStatus()) since a mid-login session only has
     * req.session.pendingAuth, never req.session.user - except for the "already authenticated"
     * shortcut below, which by definition only fires once req.session.user exists. No logging
     * on the routine "still waiting" path either, matching getStatus() - only real transitions
     * and errors are logged, so 6-10s polling doesn't spam the log.
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async pendingStatus(req, res) {
        const startTime = Date.now();
        try {
            // Same-session completion via another tab/window (e.g. the confirm link opened
            // in a second window that shares this session's cookie) already finished the
            // login server-side - _completeLoginSession() sets session.user and deletes
            // pendingAuth together, so by the time this poll runs there is nothing left to
            // find there. Report success (not NO_PENDING_AUTH) so the waiting tab redirects
            // to its destination instead of showing a misleading "please sign in again".
            // Also drains session.pendingWarnings (e.g. the MFA nag) - this tab's own request
            // never ran _completeLoginSession() itself, so its return value never reached here;
            // the session stash is the only channel this tab has to learn about it at all.
            if (req.session.user?.isAuthenticated) {
                const warnings = req.session.pendingWarnings || [];
                delete req.session.pendingWarnings;
                return res.json({ success: true, nextStep: null, warnings });
            }

            const pending = req.session.pendingAuth;
            if (!pending) {
                return res.status(400).json({
                    success: false,
                    error: global.i18n.translate(req, 'controller.auth.noPendingAuth'),
                    code: 'NO_PENDING_AUTH'
                });
            }

            const expectedStep = AuthController._getExpectedStep(pending);
            const pendingAuthTimeoutMs = AuthController._pendingAuthTimeoutMs(expectedStep);

            if (Date.now() - pending.createdAt > pendingAuthTimeoutMs) {
                delete req.session.pendingAuth;
                global.LogController.logError(req, 'auth.pendingStatus',
                    `error: Pending auth expired for user: ${pending.username}`);
                return res.status(400).json({
                    success: false,
                    error: global.i18n.translate(req, 'controller.auth.authExpired'),
                    code: 'AUTH_EXPIRED'
                });
            }

            // Only 'email-verify' has a cross-device "verify elsewhere" story today (mfa etc.
            // are entered on the same device) - echo any other expected step back unchanged,
            // no side effects, no DB read.
            if (expectedStep !== 'email-verify') {
                return res.json({ success: true, nextStep: expectedStep, page: null });
            }

            const user = await UserModel.findById(pending.userId);
            if (!user) {
                delete req.session.pendingAuth;
                global.LogController.logError(req, 'auth.pendingStatus',
                    `error: User ${pending.userId} not found for pending auth`);
                return res.status(400).json({
                    success: false,
                    error: global.i18n.translate(req, 'controller.auth.noPendingAuth'),
                    code: 'NO_PENDING_AUTH'
                });
            }

            if (user.emailVerified === false) {
                return res.json({
                    success: true,
                    nextStep: 'email-verify',
                    page: '/auth/email-verify.shtml',
                    email: global.CommonUtils.maskEmail(user.email)
                });
            }

            pending.completedSteps.push('email-verify');
            const requiredSteps = await AuthController._getRequiredSteps(req, user, pending.completedSteps);

            if (requiredSteps.length > 0) {
                const nextStep = requiredSteps[0];
                pending.requiredSteps = [...pending.completedSteps, ...requiredSteps.map(s => s.step)];
                req.session.pendingAuth = pending;

                global.LogController.logInfo(req, 'auth.pendingStatus',
                    `email-verify completed via poll (verified elsewhere) for ${pending.username}, next step: ${nextStep.step}`);

                return res.json({
                    success: true,
                    nextStep: nextStep.step,
                    page: nextStep.page,
                    ...nextStep.data
                });
            }

            global.LogController.logInfo(req, 'auth.pendingStatus',
                `email-verify completed via poll (verified elsewhere) for ${pending.username}, login complete`);
            return await AuthController._completeLogin(req, res, user, pending.authMethod, startTime);

        } catch (error) {
            global.LogController.logError(req, 'auth.pendingStatus', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.auth.pendingStatusInternalError', { error: error.message });
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
     * Get authentication status — zero-DB-query session read
     * GET /api/1/auth/status
     * Returns 200 { authenticated: true, username, roles } when session is active,
     * or 401 { authenticated: false } when no valid session exists.
     * Designed as a lightweight polling endpoint that requires no DB access.
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async getStatus(req, res) {
        const isAuthenticated = req.session?.user?.isAuthenticated === true;
        if (isAuthenticated) {
            return res.json({
                success: true,
                data: {
                    authenticated: true,
                    username: req.session.user.username,
                    roles: req.session.user.roles || []
                }
            });
        }
        return res.json({
            success: true,
            data: { authenticated: false }
        });
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
