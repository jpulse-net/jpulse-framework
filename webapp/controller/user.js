/**
 * @name            jPulse Framework / WebApp / Controller / User
 * @tagline         User Controller for jPulse Framework WebApp
 * @description     This is the user controller for the jPulse Framework WebApp
 * @file            webapp/controller/user.js
 * @version         1.7.9
 * @release         2026-08-07
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 3.14, Claude Sonnet 5
 */

import UserModel from '../model/user.js';
import ConfigModel from '../model/config.js';
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
     * W-105: Enhanced with plugin hooks for email confirmation, external validation
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async signup(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'user.signup', JSON.stringify({ username: req.body.username, email: req.body.email }));

            // Bail out if signup is disabled
            if (global.appConfig.controller.user.disableSignup) {
                LogController.logError(req, 'user.signup', 'error: signup is disabled');
                const message = global.i18n.translate(req, 'controller.user.signup.signupDisabled');
                return global.CommonUtils.sendError(req, res, 403, message, 'SIGNUP_DISABLED');
            }

            // Hook: onUserBeforeSave - can modify userData or add fields (isCreate=true, isSignup=true)
            let signupContext = { req, userData: { ...req.body }, isCreate: true, isSignup: true };
            signupContext = await global.HookManager.execute('onUserBeforeSave', signupContext);

            const { firstName, lastName, username: usernameRaw, email, password, confirmPassword, acceptTerms } = signupContext.userData;
            const username = (typeof usernameRaw === 'string' ? usernameRaw : '').toLowerCase().trim();

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

            // Note: Signup validation cancellation now handled by onUserBeforeSave returning false
            // The executeWithCancel pattern is deprecated in Phase 8

            // Prepare user data
            let userData = {
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
                    // W-205: was hardcoded to 'en' - on a non-English site this stamped every
                    // signup English, which then drove their verification email, nag toasts,
                    // and whole UI until they changed it by hand (theme, just below, already
                    // read from config correctly)
                    language: global.appConfig?.utils?.i18n?.default || 'en',
                    theme: (() => {
                        const raw = String(global.appConfig?.utils?.theme?.default || 'light');
                        return /^[a-zA-Z0-9_-]+$/.test(raw) ? raw : 'light';
                    })()
                },
                status: 'active'
            };

            // Note: onUserBeforeSave already called above with isCreate=true

            // Create user
            const newUser = await UserModel.create(userData);

            // Hook: onUserAfterSave - post-create actions (wasCreate=true, wasSignup=true)
            await global.HookManager.execute('onUserAfterSave', {
                req,
                user: newUser,
                wasCreate: true,
                wasSignup: true
            });

            // W-205: 'off' mode offers no verification path anywhere, signup included (see the
            // Policy Semantics table) - only 'nag' and 'required' send. On-demand, not
            // speculative (see issueEmailVerification()'s own doc comment): the user just acted
            // and is expecting mail, so on-demand and immediate coincide here. Never fails
            // signup: issueEmailVerification() already logs and swallows send errors internally,
            // and the verify step self-heals on next arrival if this attempt failed.
            const emailVerifyPolicy = UserModel.getEmailVerificationPolicy();
            if (emailVerifyPolicy !== 'off') {
                await UserModel.issueEmailVerification(req, newUser);
            }

            const message = global.i18n.translate(req, 'controller.user.signup.accountCreated');
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

            // Note: Async signup complete actions merged into onUserAfterSave in Phase 8

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

            // Get current user (needed up front - W-195: hasLocalPassword decides whether
            // currentPassword is required below)
            const user = await UserModel.findById(req.session.user.id);
            if (!user) {
                LogController.logError(req, 'user.changePassword', `error: user not found for session ID: ${req.session.user.id}`);
                const message = global.i18n.translate(req, 'controller.user.password.userNotFound');
                return global.CommonUtils.sendError(req, res, 404, message, 'USER_NOT_FOUND');
            }

            // W-195: users without a usable local password (e.g. JIT-created by an external-auth
            // plugin with a synthetic passwordHash) can never satisfy a currentPassword check by
            // construction - their session already proves identity, so skip it for them.
            const hasLocalPassword = user.hasLocalPassword !== false;

            if (!newPassword || (hasLocalPassword && !currentPassword)) {
                LogController.logError(req, 'user.changePassword', 'error: missing current or new password');
                const message = hasLocalPassword
                    ? global.i18n.translate(req, 'controller.user.password.missingPasswords')
                    : global.i18n.translate(req, 'controller.user.password.missingNewPassword');
                return global.CommonUtils.sendError(req, res, 400, message, 'MISSING_PASSWORDS');
            }

            if (hasLocalPassword) {
                // Verify current password
                const isCurrentValid = await UserModel.verifyPassword(currentPassword, user.passwordHash);
                if (!isCurrentValid) {
                    LogController.logError(req, 'user.changePassword', `error: invalid current password for user ${req.session.user.username}`);
                    const message = global.i18n.translate(req, 'controller.user.password.invalidCurrentPassword');
                    return global.CommonUtils.sendError(req, res, 400, message, 'INVALID_CURRENT_PASSWORD');
                }
            }

            // Update password - W-195: hasLocalPassword is set/reset to true, since the user
            // now knows a real, usable local password (whether they had one before or not)
            const updateData = {
                password: newPassword,
                updatedBy: req.session.user.username,
                hasLocalPassword: true
            };

            await UserModel.updateById(req.session.user.id, updateData);

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'user.changePassword', `success: Password changed for user ${req.session.user.username} in ${elapsed}ms`);

            const message = global.i18n.translate(req, 'controller.user.password.changed');
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
     * Confirm email verification via link token (no session required - W-205 call site 2)
     * GET /api/1/user/email-verify/confirm?token=...
     *
     * Always redirects, never returns JSON - a mail client/scanner following this link expects
     * a page, not an API response, and redirecting also lets us strip the single-use token from
     * the URL immediately (it must never survive into browser history/Referer beyond this hit).
     *
     * If this request's session carries a `pendingAuth` for the SAME user, mid-'email-verify'
     * step (i.e. this is the same browser that started the login), completes that step and
     * continues/finishes the login with a 302 straight to `pending.redirect` - one click, fully
     * logged in. Otherwise (another device, an already-authenticated session, or the link
     * arrived outside any active login attempt) just flips the flag and lands on the shared
     * verify page's status display - `pendingAuth`, if any, belongs to a *different* user in
     * that case and must not be touched.
     *
     * Any post-login warnings (e.g. the MFA nag) from _completeLoginSession() are carried
     * across this 302 via CommonUtils.appendToastsToUrl() - this is a plain redirect, not the
     * AJAX login() response the client normally reads warnings/toasts from.
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async confirmEmailVerify(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'user.confirmEmailVerify', '');

            const verifyResult = await UserModel.verifyEmailByToken(req, req.query.token);

            if (!verifyResult.success) {
                LogController.logError(req, 'user.confirmEmailVerify', `error: ${verifyResult.errorCode}`);
                const status = verifyResult.errorCode === 'EMAIL_VERIFY_EXPIRED' ? 'expired' : 'invalid';
                return res.redirect(`/auth/email-verify.shtml?status=${status}`);
            }

            const pending = req.session.pendingAuth;
            const verifiedUserId = verifyResult.user._id.toString();
            const remainingSteps = pending
                ? pending.requiredSteps?.filter(s => !pending.completedSteps.includes(s))
                : [];

            if (pending && pending.userId === verifiedUserId && remainingSteps[0] === 'email-verify') {
                pending.completedSteps.push('email-verify');

                const requiredSteps = await AuthController._getRequiredSteps(req, verifyResult.user, pending.completedSteps);
                if (requiredSteps.length > 0) {
                    const nextStep = requiredSteps[0];
                    pending.requiredSteps = [...pending.completedSteps, ...requiredSteps.map(s => s.step)];
                    req.session.pendingAuth = pending;

                    LogController.logInfo(req, 'user.confirmEmailVerify',
                        `success: email verified via link for ${pending.username}, next step: ${nextStep.step}`);

                    const nextPage = nextStep.page || '/auth/login.shtml';
                    const redirectParam = pending.redirect ? `?redirect=${encodeURIComponent(pending.redirect)}` : '';
                    return res.redirect(`${nextPage}${redirectParam}`);
                }

                // All steps complete - finish login and land on the original destination.
                // Re-validated defensively even though it was already validated once when
                // written into pending.redirect (login()'s credentials step) - cheap, and
                // pending is server-side session state an attacker cannot directly edit, but
                // there is no reason for this, the one place that actually issues the 302, to
                // rely solely on a check made a step earlier.
                const { warnings } = await AuthController._completeLoginSession(
                    req, verifyResult.user, pending.authMethod, startTime
                );
                const destination = global.CommonUtils.isSafeRedirectUrl(req, pending.redirect) ? pending.redirect : '/';

                LogController.logInfo(req, 'user.confirmEmailVerify',
                    `success: email verified via link, login completed for ${verifyResult.user.username}`);
                return res.redirect(global.CommonUtils.appendToastsToUrl(destination, warnings));
            }

            // No matching in-progress login in this browser - land on the shared verify page,
            // which shows a "you're verified, you can continue" state for this case
            LogController.logInfo(req, 'user.confirmEmailVerify',
                `success: email verified via link for ${verifyResult.user.username} (no matching pendingAuth)`);
            return res.redirect('/auth/email-verify.shtml?status=verified');

        } catch (error) {
            LogController.logError(req, 'user.confirmEmailVerify', `error: ${error.message}`);
            return res.redirect('/auth/email-verify.shtml?status=invalid');
        }
    }

    /**
     * Verify email via 6-digit code (authenticated self-service - W-205 call site 3)
     * POST /api/1/user/email-verify   { code }
     * For 'nag' mode (login already succeeded, unverified) or a session that outlived an
     * admin-driven reset - a logged-in user has no `pendingAuth` to ride, unlike the
     * blocking-step path in AuthController.login().
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async emailVerify(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'user.emailVerify', '');

            const { code } = req.body;
            if (!code) {
                LogController.logError(req, 'user.emailVerify', 'error: code is required');
                const message = global.i18n.translate(req, 'controller.user.emailVerify.codeRequired');
                return global.CommonUtils.sendError(req, res, 400, message, 'MISSING_CODE');
            }

            const verifyResult = await UserModel.verifyEmailByCode(req, req.session.user.id, code);
            if (!verifyResult.success) {
                LogController.logError(req, 'user.emailVerify', `error: ${verifyResult.errorCode}`);
                const messageKey = verifyResult.errorCode === 'EMAIL_VERIFY_RATE_LIMITED' ? 'controller.auth.emailVerifyRateLimited'
                    : verifyResult.errorCode === 'EMAIL_VERIFY_EXPIRED' ? 'controller.auth.emailVerifyExpired'
                        : 'controller.auth.emailVerifyInvalidCode';
                const status = verifyResult.errorCode === 'EMAIL_VERIFY_RATE_LIMITED' ? 429 : 400;
                return res.status(status).json({
                    success: false,
                    error: global.i18n.translate(req, messageKey),
                    code: verifyResult.errorCode,
                    retryAfter: verifyResult.retryAfter
                });
            }

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'user.emailVerify',
                `success: ${req.session.user.username}, completed in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.user.emailVerify.success');
            return res.json({ success: true, message, elapsed });

        } catch (error) {
            LogController.logError(req, 'user.emailVerify', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.user.emailVerify.internalError', { details: error.message });
            return global.CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Send/resend email verification (authenticated self-service - W-205 call site 3)
     * POST /api/1/user/email-verify/send
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async emailVerifySend(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'user.emailVerifySend', '');

            const user = await UserModel.findById(req.session.user.id);
            if (!user) {
                LogController.logError(req, 'user.emailVerifySend', `error: user not found for session ID: ${req.session.user.id}`);
                const message = global.i18n.translate(req, 'controller.user.password.userNotFound');
                return global.CommonUtils.sendError(req, res, 404, message, 'USER_NOT_FOUND');
            }

            // Nothing to do if a since-elsewhere verification (or an admin ticking the
            // checkbox) already resolved this - avoid sending mail that would only confuse
            if (user.emailVerified !== false) {
                LogController.logInfo(req, 'user.emailVerifySend', `success: ${user.username} already verified, no email sent`);
                const message = global.i18n.translate(req, 'controller.user.emailVerify.alreadyVerified');
                return res.json({ success: true, alreadyVerified: true, message });
            }

            const issueResult = await UserModel.issueEmailVerification(req, user);
            if (!issueResult.success) {
                LogController.logError(req, 'user.emailVerifySend', `error: ${issueResult.errorCode}`);
                return res.status(429).json({
                    success: false,
                    error: global.i18n.translate(req, 'controller.auth.emailVerifyRateLimited'),
                    code: issueResult.errorCode,
                    retryAfter: issueResult.retryAfter
                });
            }

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'user.emailVerifySend', `success: ${user.username}, completed in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.user.emailVerify.sendSuccess');
            return res.json({ success: true, message, email: global.CommonUtils.maskEmail(user.email), elapsed });

        } catch (error) {
            LogController.logError(req, 'user.emailVerifySend', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.user.emailVerify.internalError', { details: error.message });
            return global.CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Search users using schema-based query
     * GET /api/1/user/search
     * W-134: Updated to use profile access policy and field filtering
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async search(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'user.search', JSON.stringify(req.query));

            // W-134: Check public profile access policy (admins always allowed)
            if (!UserController._checkPublicProfilePolicy(req)) {
                const authState = AuthController.isAuthenticated(req) ? 'authenticated' : 'unauthenticated';
                LogController.logError(req, 'user.search', `error: Public profile access denied for ${authState} user`);
                const message = global.i18n.translate(req, 'controller.user.getPublicProfile.unauthorized');
                return global.CommonUtils.sendError(req, res, 403, message, 'PUBLIC_PROFILE_ACCESS_DENIED');
            }

            const adminRoles = ConfigModel.getEffectiveAdminRoles();
            const isAdmin = AuthController.isAuthenticated(req) && AuthController.isAuthorized(req, adminRoles);
            const results = await UserModel.search(req.query, { substringEmail: isAdmin });

            // W-134: Filter fields for each user in results
            if (results.data && Array.isArray(results.data)) {
                results.data = results.data.map(user => UserController._filterPublicProfileFields(user, req));
            }

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

    /**
     * Get user statistics (efficient aggregation-based)
     * GET /api/1/user/stats
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async stats(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'user.stats', '');

            const stats = await UserModel.getUserStats();
            const elapsed = Date.now() - startTime;

            LogController.logInfo(req, 'user.stats', `success: stats retrieved in ${elapsed}ms`);
            res.json({
                success: true,
                data: stats,
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'user.stats', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.user.stats.internalError', { details: error.message });
            return global.CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Initialize user controller (called during bootstrap)
     * Registers metrics provider for W-112 health metrics system
     */
    static async initialize() {
        // Register metrics provider (W-112)
        try {
            const MetricsRegistry = (await import('../utils/metrics-registry.js')).default;
            MetricsRegistry.register('users', () => UserController.getMetrics(), {
                async: true,  // getMetrics() is async
                category: 'model'
            });
        } catch (error) {
            // MetricsRegistry might not be available yet
            LogController.logWarning(null, 'user.initialize', `Failed to register metrics provider: ${error.message}`);
        }
    }

    /**
     * Get user metrics in W-112 standardized format (W-112)
     * @returns {Promise<Object>} Component metrics with standardized structure
     */
    static async getMetrics() {
        try {
            // Get raw stats from UserModel
            const userStats = await UserModel.getUserStats();

            return {
                component: 'UserModel',
                status: 'ok',
                initialized: true,
                stats: {
                    total: userStats.total,
                    admins: userStats.admins,
                    byStatus: userStats.byStatus,
                    byRole: userStats.byRole,
                    recentLogins: userStats.recentLogins,
                    docsCreated24h: userStats.docsCreated24h || 0,
                    docsUpdated24h: userStats.docsUpdated24h || 0,
                    docsDeleted24h: userStats.docsDeleted24h || 0
                },
                meta: {
                    ttl: 300000,                // 5 minutes - user stats don't change frequently
                    category: 'model',
                    fields: {
                        'total': {
                            global: true,       // Same across all instances (database is shared)
                            aggregate: 'first'
                        },
                        'admins': {
                            global: true,       // Same across all instances
                            aggregate: 'first'
                        },
                        'byStatus': {
                            global: true,       // Same across all instances
                            aggregate: false    // Complex object, don't aggregate
                        },
                        'byRole': {
                            global: true,       // Same across all instances
                            aggregate: false    // Complex object, don't aggregate
                        },
                        'recentLogins': {
                            global: true,       // Same across all instances
                            aggregate: false,   // Complex object, don't aggregate
                            fields: {
                                'last24h': {
                                    aggregate: 'first'
                                },
                                'last7d': {
                                    aggregate: 'first'
                                },
                                'last30d': {
                                    aggregate: 'first'
                                }
                            }
                        },
                        'docsCreated24h': {
                            global: true,       // Database-backed, same across instances
                            aggregate: 'first'   // Database-backed, same across instances
                        },
                        'docsUpdated24h': {
                            global: true,       // Database-backed, same across instances
                            aggregate: 'first'   // Database-backed, same across instances
                        },
                        'docsDeleted24h': {
                            global: true,       // Database-backed, same across instances
                            aggregate: 'first'   // Database-backed, same across instances
                        }
                    }
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            // Return error status if stats collection fails
            return {
                component: 'UserModel',
                status: 'error',
                initialized: true,
                stats: {},
                meta: {
                    ttl: 60000,
                    category: 'model'
                },
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }

    /**
     * Get user by ID, username, or current session user
     * GET /api/1/user/:id, GET /api/1/user?username=..., or GET /api/1/user (current user)
     *
     * W-107: Enhanced with:
     * - ?includeSchema=1 - Returns schema extensions metadata for data-driven profile cards
     * - :id parameter now falls back to username if not a valid ObjectId
     *
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async get(req, res) {
        const startTime = Date.now();
        try {
            // Fallback logic: :id param → username query → session user
            let user = null;
            let userId = null;
            let lookupMethod = '';

            // Priority 1: Check for :id parameter
            if (req.params.id && req.params.id.trim() !== '') {
                const idParam = req.params.id.trim();

                // W-107: Check if it looks like a MongoDB ObjectId (24 hex characters)
                const isObjectId = /^[a-fA-F0-9]{24}$/.test(idParam);

                if (isObjectId) {
                    userId = idParam;
                lookupMethod = 'id';
                user = await UserModel.findById(userId);
                } else {
                    // W-107: Fall back to username lookup
                    lookupMethod = 'username';
                    user = await UserModel.findByUsername(idParam);
                    if (user) {
                        userId = user._id.toString();
                    }
                }
            }
            // Priority 2: Check for username query parameter
            else if (req.query.username && req.query.username.trim() !== '') {
                const username = req.query.username.trim();
                lookupMethod = 'username';
                user = await UserModel.findByUsername(username);
                if (user) {
                    userId = user._id.toString();
                }
            }
            // Priority 3: Fall back to session user
            else {
                userId = req.session.user.id;
                lookupMethod = 'session';
                user = await UserModel.findById(userId);
            }

            LogController.logRequest(req, 'user.get', `${lookupMethod}: ${userId || req.query.username || 'session'}`);

            // Authentication is handled by AuthController.requireAuthentication middleware
            // Authorization check is done in method

            const adminRoles = ConfigModel.getEffectiveAdminRoles();
            const isAdmin = AuthController.isAuthorized(req, adminRoles);

            // Regular users can only get their own profile
            if (!isAdmin && userId !== req.session.user.id) {
                LogController.logError(req, 'user.get', `error: unauthorized access attempt for user ${userId}`);
                const message = global.i18n.translate(req, 'controller.user.get.unauthorized');
                return global.CommonUtils.sendError(req, res, 403, message, 'UNAUTHORIZED');
            }

            if (!user) {
                const identifier = lookupMethod === 'username' ? (req.query.username || req.params.id) : userId;
                LogController.logError(req, 'user.get', `error: user not found for ${lookupMethod}: ${identifier}`);
                const message = global.i18n.translate(req, 'controller.user.get.userNotFound');
                return global.CommonUtils.sendError(req, res, 404, message, 'USER_NOT_FOUND');
            }

            // Remove sensitive data
            const { passwordHash, ...restProfile } = user;
            let userProfile = UserModel.applyExtensionSchemaDefaults(restProfile);

            // For non-admin users, remove admin-only fields
            if (!isAdmin) {
                delete userProfile.uuid;
                // Note: email, roles, status are kept for regular users to see their own data
            }

            // W-107/W-175: Include schema extensions metadata + core display schema if requested
            const includeSchema = req.query.includeSchema === '1' || req.query.includeSchema === 'true';
            let schema = null;
            let coreSchema = null;
            if (includeSchema) {
                schema = global.i18n.expandI18nDeep(req, UserModel.getSchemaExtensionsMetadata());
                coreSchema = global.i18n.expandI18nDeep(req, UserModel.coreDisplaySchema);
            }

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'user.get', `success: user ${userId} retrieved in ${elapsed}ms${includeSchema ? ' (with schema)' : ''}`);
            const message = global.i18n.translate(req, 'controller.user.get.retrieved');

            const response = {
                success: true,
                data: userProfile,
                message: message,
                elapsed
            };

            // W-107/W-175: Add schema and coreSchema to response if requested
            if (includeSchema) {
                response.schema = schema;
                response.coreSchema = coreSchema;
            }

            res.json(response);

        } catch (error) {
            LogController.logError(req, 'user.get', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.user.get.internalError', { details: error.message });
            return global.CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Get public user profile by ID or username
     * GET /api/1/user/public/:id
     * W-134: Public profile endpoint with config-based access control and field filtering
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async getPublic(req, res) {
        const startTime = Date.now();
        try {
            // W-134: Check public profile access policy (admins always allowed)
            if (!UserController._checkPublicProfilePolicy(req)) {
                const authState = AuthController.isAuthenticated(req) ? 'authenticated' : 'unauthenticated';
                LogController.logError(req, 'user.getPublic', `error: Public profile access denied for ${authState} user`);
                const message = global.i18n.translate(req, 'controller.user.getPublicProfile.unauthorized');
                return global.CommonUtils.sendError(req, res, 403, message, 'PUBLIC_PROFILE_ACCESS_DENIED');
            }

            // User lookup (same logic as get())
            let user = null;
            let userId = null;
            let lookupMethod = '';

            if (req.params.id && req.params.id.trim() !== '') {
                const idParam = req.params.id.trim();
                const isObjectId = /^[a-fA-F0-9]{24}$/.test(idParam);

                if (isObjectId) {
                    userId = idParam;
                    lookupMethod = 'id';
                    user = await UserModel.findById(userId);
                } else {
                    // Fall back to username lookup
                    lookupMethod = 'username';
                    user = await UserModel.findByUsername(idParam);
                    if (user) {
                        userId = user._id.toString();
                    }
                }
            }

            LogController.logRequest(req, 'user.getPublic', `${lookupMethod}: ${req.params.id || 'unknown'}`);

            if (!user) {
                const identifier = req.params.id || 'unknown';
                LogController.logError(req, 'user.getPublic', `error: user not found for ${lookupMethod}: ${identifier}`);
                const message = global.i18n.translate(req, 'controller.user.get.userNotFound');
                return global.CommonUtils.sendError(req, res, 404, message, 'USER_NOT_FOUND');
            }

            // W-134: Filter fields based on config policy
            const filteredUser = UserController._filterPublicProfileFields(user, req);

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'user.getPublic', `success: user ${userId} retrieved in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.user.get.retrieved');

            res.json({
                success: true,
                data: filteredUser,
                message: message,
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'user.getPublic', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.user.get.internalError', { details: error.message });
            return global.CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Update user by ID, username, or current session user
     * PUT /api/1/user/:id, PUT /api/1/user?username=..., or PUT /api/1/user (current user)
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async update(req, res) {
        const startTime = Date.now();
        try {
            // Fallback logic: :id param → username query → session user
            let currentUser = null;
            let userId = null;
            let lookupMethod = '';

            // Priority 1: Check for :id parameter (ObjectId)
            if (req.params.id && req.params.id.trim() !== '') {
                userId = req.params.id;
                lookupMethod = 'id';
                currentUser = await UserModel.findById(userId);
            }
            // Priority 2: Check for username query parameter
            else if (req.query.username && req.query.username.trim() !== '') {
                const username = req.query.username.trim();
                lookupMethod = 'username';
                currentUser = await UserModel.findByUsername(username);
                if (currentUser) {
                    userId = currentUser._id.toString();
                }
            }
            // Priority 3: Fall back to session user
            else {
                userId = req.session.user.id;
                lookupMethod = 'session';
                currentUser = await UserModel.findById(userId);
            }

            LogController.logRequest(req, 'user.update', `${lookupMethod}: ${userId || req.query.username || 'session'}, data: ${JSON.stringify(req.body)}`);

            // Authentication is handled by AuthController.requireAuthentication middleware
            // Authorization check is done in method

            const adminRoles = ConfigModel.getEffectiveAdminRoles();
            const isAdmin = AuthController.isAuthorized(req, adminRoles);
            const isUpdatingSelf = userId === req.session.user.id;

            // Regular users can only update their own profile (non-admin fields)
            if (!isAdmin && !isUpdatingSelf) {
                LogController.logError(req, 'user.update', `error: unauthorized update attempt for user ${userId}`);
                const message = global.i18n.translate(req, 'controller.user.update.unauthorized');
                return global.CommonUtils.sendError(req, res, 403, message, 'UNAUTHORIZED');
            }

            if (!currentUser) {
                const identifier = lookupMethod === 'username' ? req.query.username : userId;
                LogController.logError(req, 'user.update', `error: user not found for ${lookupMethod}: ${identifier}`);
                const message = global.i18n.translate(req, 'controller.user.update.userNotFound');
                return global.CommonUtils.sendError(req, res, 404, message, 'USER_NOT_FOUND');
            }

            const updateData = { ...req.body };
            updateData.updatedBy = req.session.user.username;

            // Filter allowed fields based on user role
            const filteredData = {};
            const adminFields = ['email', 'roles', 'status', 'emailVerified'];
            const regularFields = ['profile', 'preferences'];

            if (isAdmin) {
                // Admins can update all fields
                if (updateData.profile) filteredData.profile = updateData.profile;
                if (updateData.preferences) filteredData.preferences = updateData.preferences;
                // W-198: normalize to lowercase before the duplicate check below and before
                // persisting (UserModel.updateById() also normalizes; kept explicit here too so
                // the comparison against currentUser.email is auditable at a glance)
                if (updateData.email !== undefined) {
                    filteredData.email = (typeof updateData.email === 'string' ? updateData.email : '').trim().toLowerCase();
                }
                if (updateData.roles !== undefined) filteredData.roles = updateData.roles;
                if (updateData.status !== undefined) filteredData.status = updateData.status;
                // W-198: manual override lever ahead of the future email-verification feature
                if (updateData.emailVerified !== undefined) filteredData.emailVerified = Boolean(updateData.emailVerified);
                // W-174: Admin can override another user's password (no current password required)
                if (updateData.password) filteredData.password = updateData.password;

                // W-107: Include plugin schema extension blocks (e.g., 'mfa')
                const schemaExtensions = UserModel.getSchemaExtensionsMetadata();
                for (const blockKey of Object.keys(schemaExtensions)) {
                    if (updateData[blockKey] !== undefined) {
                        filteredData[blockKey] = updateData[blockKey];
                    }
                }
            } else {
                // W-170: Regular users can update profile, preferences, and their own userCard-visible extension blocks
                if (updateData.profile) filteredData.profile = updateData.profile;
                if (updateData.preferences) filteredData.preferences = updateData.preferences;
                const schemaExtensions = UserModel.getSchemaExtensionsMetadata();
                for (const blockKey of Object.keys(schemaExtensions)) {
                    const meta = schemaExtensions[blockKey]?._meta;
                    if (meta?.userCard?.visible && updateData[blockKey] !== undefined) {
                        filteredData[blockKey] = updateData[blockKey];
                    }
                }
            }

            if (updateData.updatedBy) {
                filteredData.updatedBy = updateData.updatedBy;
            }

            if (Object.keys(filteredData).length === 0) {
                LogController.logError(req, 'user.updateById', 'error: no valid fields to update');
                const message = global.i18n.translate(req, 'controller.user.update.noValidFieldsToUpdate');
                return global.CommonUtils.sendError(req, res, 400, message, 'NO_UPDATE_DATA');
            }

            // W-205: set below when an admin's email change resets emailVerified, so the
            // post-update block knows to send the two notices (declared here, outside the
            // isAdmin block, since it's read again after UserModel.updateById() succeeds)
            let emailChangeReset = false;

            // Admin-only validations
            if (isAdmin) {
                // Check if email is being changed and validate uniqueness
                if (filteredData.email && filteredData.email !== currentUser.email) {
                    const existingUser = await UserModel.findByEmail(filteredData.email);
                    if (existingUser && existingUser._id.toString() !== userId) {
                        LogController.logError(req, 'user.update', `error: email already exists: ${filteredData.email}`);
                        const message = global.i18n.translate(req, 'controller.user.update.emailExists');
                        return global.CommonUtils.sendError(req, res, 409, message, 'EMAIL_EXISTS');
                    }

                    // W-205: an admin typing an address supplies a belief, never proof of inbox
                    // ownership - reset unless this same request explicitly asserts emailVerified
                    // === true. The admin user-profile page always submits the checkbox's current
                    // state (not just when touched), so gating on "!== true" - rather than
                    // "undefined" - covers both that UI (checkbox left/set checked = explicit
                    // override) and direct API callers that omit the field entirely (also resets,
                    // preserving prior behavior there). "Trust the admin" stays available, but as
                    // a conscious, logged act rather than an invisible default.
                    if (updateData.emailVerified !== true) {
                        filteredData.emailVerified = false;
                        filteredData.emailVerifiedAt = null;
                        emailChangeReset = true;
                    }
                }

                // Check if roles are being changed
                if (filteredData.roles !== undefined) {
                    const adminRoles = ConfigModel.getEffectiveAdminRoles();
                    const newRoles = Array.isArray(filteredData.roles) ? filteredData.roles : [filteredData.roles];
                    const oldRoles = currentUser.roles || [];
                    const hadAdminRole = adminRoles.some(role => oldRoles.includes(role));
                    const hasAdminRole = adminRoles.some(role => newRoles.includes(role));

                    // Prevent removing last admin/root
                    if (hadAdminRole && !hasAdminRole) {
                        const adminCount = await UserModel.countAdmins();
                        if (adminCount <= 1) {
                            LogController.logError(req, 'user.update', 'error: cannot remove last admin');
                            const message = global.i18n.translate(req, 'controller.user.update.lastAdminError');
                            return global.CommonUtils.sendError(req, res, 400, message, 'LAST_ADMIN_ERROR');
                        }
                    }

                    // Prevent user from removing their own admin/root role
                    if (isUpdatingSelf && hadAdminRole && !hasAdminRole) {
                        LogController.logError(req, 'user.update', 'error: cannot remove own admin role');
                        const message = global.i18n.translate(req, 'controller.user.update.selfRemovalError');
                        return global.CommonUtils.sendError(req, res, 400, message, 'SELF_REMOVAL_ERROR');
                    }
                }

                // Check if status is being changed to suspended/inactive
                if (filteredData.status !== undefined &&
                    (filteredData.status === 'suspended' || filteredData.status === 'inactive')) {
                    const adminRoles = ConfigModel.getEffectiveAdminRoles();
                    const oldRoles = currentUser.roles || [];
                    const hadAdminRole = adminRoles.some(role => oldRoles.includes(role));

                    if (hadAdminRole) {
                        const adminCount = await UserModel.countAdmins();
                        if (adminCount <= 1) {
                            LogController.logError(req, 'user.update', 'error: cannot suspend last admin');
                            const message = global.i18n.translate(req, 'controller.user.update.lastAdminStatusError');
                            return global.CommonUtils.sendError(req, res, 400, message, 'LAST_ADMIN_STATUS_ERROR');
                        }
                    }
                }
            }

            // Update user
            const updatedUser = await UserModel.updateById(userId, filteredData);

            if (!updatedUser) {
                LogController.logError(req, 'user.update', `error: user not found for ID: ${userId}`);
                const message = global.i18n.translate(req, 'controller.user.update.userNotFound');
                return global.CommonUtils.sendError(req, res, 404, message, 'USER_NOT_FOUND');
            }

            // Log the update
            await LogController.logChange(req, 'user', 'update', req.session.user.username, currentUser, updatedUser);

            // W-205: notify both addresses when this save reset emailVerified above - informative-
            // only to the new address (no credential; the real one is issued on demand at the
            // verify step), security alert to the old address so the legitimate owner has a
            // signal if the change was malicious rather than clerical. Skipped entirely when the
            // admin explicitly kept/set emailVerified in the same save (trusted, logged override).
            if (emailChangeReset) {
                await UserModel.sendEmailChangedNotice(req, updatedUser);
                await UserModel.sendEmailChangedAlert(req, updatedUser, currentUser.email);
                LogController.logInfo(req, 'user.update',
                    `email changed for ${updatedUser.username} by admin ${req.session.user.username}: emailVerified reset, notices sent to new and old address`);
            }

            // Update session data if updating self
            if (isUpdatingSelf) {
                AuthController.updateUserSession(req, updatedUser);
            }

            // Remove sensitive data
            const { passwordHash, ...userProfile } = updatedUser;

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'user.update', `success: user ${userId} updated in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.user.update.updated');
            res.json({
                success: true,
                data: userProfile,
                message: message,
                emailVerifiedReset: emailChangeReset, // W-205: lets the admin UI toast an explanation
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'user.update', `error: ${error.message}`);
            if (error.message.includes('Validation failed')) {
                const message = global.i18n.translate(req, 'controller.user.update.validationFailed', { details: error.message });
                return global.CommonUtils.sendError(req, res, 400, message, 'VALIDATION_ERROR', error.message);
            }
            const message = global.i18n.translate(req, 'controller.user.update.updateInternalError', { details: error.message });
            return global.CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Get enum fields from user schema
     * GET /api/1/model/user/enums?fields=status,roles
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     */
    static async getEnums(req, res) {
        const startTime = Date.now();
        try {
            LogController.logRequest(req, 'user.getEnums', `fields: ${req.query.fields || 'all'}`);

            // Get all enums from Model (not exposing Model directly)
            const allEnums = UserModel.getEnums();

            // Filter by query param if provided
            let enums = allEnums;
            if (req.query.fields) {
                const fields = req.query.fields.split(',').map(f => f.trim()).filter(f => f);
                enums = {};
                for (const field of fields) {
                    if (allEnums[field]) {
                        enums[field] = allEnums[field];
                    }
                }
            }

            // W-174: roles enum always from site config so newly defined roles appear in admin
            const requestedFields = req.query.fields ? req.query.fields.split(',').map(f => f.trim()) : [];
            if (requestedFields.includes('roles')) {
                enums.roles = ConfigModel.getEffectiveRoles();
            }

            const elapsed = Date.now() - startTime;
            LogController.logInfo(req, 'user.getEnums', `success: ${Object.keys(enums).length} enum fields, completed in ${elapsed}ms`);
            const message = global.i18n.translate(req, 'controller.user.getEnums.retrieved');
            res.json({
                success: true,
                data: enums,
                message: message,
                elapsed
            });

        } catch (error) {
            LogController.logError(req, 'user.getEnums', `error: ${error.message}`);
            const message = global.i18n.translate(req, 'controller.user.getEnums.internalError', { details: error.message });
            return global.CommonUtils.sendError(req, res, 500, message, 'INTERNAL_ERROR', error.message);
        }
    }

    // ============================================================================
    // W-134: PRIVATE HELPER METHODS FOR PUBLIC PROFILE ACCESS
    // ============================================================================

    /**
     * Check if public profile access is allowed based on config policy
     * Admins always have access (preserved)
     * W-134: Used by search() and getPublic() to avoid code duplication
     * @param {object} req - Express request object
     * @returns {boolean} True if access allowed, false if denied
     */
    static _checkPublicProfilePolicy(req) {
        const profileConfig = global.appConfig?.controller?.user?.profile || {};
        const adminRoles = ConfigModel.getEffectiveAdminRoles();
        const isAuthenticated = AuthController.isAuthenticated(req);

        // Admins always have access (preserve admin access)
        if (isAuthenticated && AuthController.isAuthorized(req, adminRoles)) {
            return true; // Admin access granted
        }

        // Determine which policy to check based on auth state
        const policyConfig = isAuthenticated
            ? profileConfig.withAuth
            : profileConfig.withoutAuth;

        // Check if access is allowed
        if (!policyConfig || !policyConfig.allowed) {
            return false; // Access denied
        }

        return true; // Access allowed
    }

    /**
     * Filter user object to include only public profile fields based on config
     * W-134: Shared field filtering logic for both search() and getPublic() methods
     * @param {object} user - User object from database
     * @param {object} req - Express request object (for auth state and admin check)
     * @returns {object} Filtered user object
     */
    static _filterPublicProfileFields(user, req) {
        const profileConfig = global.appConfig?.controller?.user?.profile || {};
        const adminRoles = ConfigModel.getEffectiveAdminRoles();
        const isAuthenticated = AuthController.isAuthenticated(req);
        const isAdmin = isAuthenticated && AuthController.isAuthorized(req, adminRoles);

        // Admins get all fields except sensitive ones. `initials` is a derived, session-only
        // value (never part of UserModel.baseSchema, never persisted) - compute it here the same
        // way the non-admin branch below does, otherwise every row is missing it (raw DB documents
        // never have an `initials` field), and the admin users list falls back to '?' for everyone.
        if (isAdmin) {
            const { passwordHash, ...adminFields } = user.toObject ? user.toObject() : user;
            adminFields.initials = ((user.profile?.firstName?.[0] || '') + (user.profile?.lastName?.[0] || '')).toUpperCase();
            return adminFields;
        }

        // Determine which fields config to use based on auth state
        const fieldsConfig = isAuthenticated
            ? (profileConfig.withAuth?.fields || [])
            : (profileConfig.withoutAuth?.fields || []);

        // Start with always-included fields
        const filtered = {
            username: user.username,
            profile: {
                firstName: user.profile?.firstName || '',
                lastName: user.profile?.lastName || ''
            },
            initials: ((user.profile?.firstName?.[0] || '') + (user.profile?.lastName?.[0] || '')).toUpperCase()
        };

        // Add configured additional fields (handle dot notation)
        fieldsConfig.forEach(fieldPath => {
            const value = global.CommonUtils.getValueByPath(user, fieldPath);
            if (value !== undefined) {
                global.CommonUtils.setValueByPath(filtered, fieldPath, value);
            }
        });

        // Always exclude sensitive fields
        // passwordHash, etc. are never included

        return filtered;
    }
}

export default UserController;

// EOF webapp/controller/user.js
