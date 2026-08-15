/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Auth Controller
 * @tagline         Unit tests for Auth Controller
 * @description     Tests for authentication controller middleware and utility functions
 * @file            webapp/tests/unit/controller/auth-controller.test.js
 * @version         1.7.15
 * @release         2026-08-15
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.14, Claude Sonnet 5
 */

// Import Jest globals and test utilities first
import { describe, test, expect, beforeEach, beforeAll, afterEach, jest } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';

// Set up global appConfig BEFORE any dynamic imports
TestUtils.setupGlobalMocksWithConsolidatedConfig();

// Declare variables for dynamically imported modules
let AuthController, CommonUtils, LogController, UserModel;

// Mock dependencies (must be before beforeAll)
jest.mock('../../../model/user.js');
jest.mock('../../../controller/log.js');
jest.mock('../../../utils/common.js');

describe('AuthController', () => {
    // Dynamic imports after appConfig is set up
    beforeAll(async () => {
        const ConfigModel = (await import('../../../model/config.js')).default;
        ConfigModel.setEffectiveGeneralCache({ roles: ['user', 'admin', 'root'], adminRoles: ['admin', 'root'] });

        AuthController = (await import('../../../controller/auth.js')).default;
        CommonUtils = (await import('../../../utils/common.js')).default;
        LogController = (await import('../../../controller/log.js')).default;
        UserModel = (await import('../../../model/user.js')).default;
    });

    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        // Mock request object
        mockReq = {
            session: {},
            body: {},
            originalUrl: '/api/1/test',
            headers: {
                'x-forwarded-for': '127.0.0.1'
            },
            connection: {
                remoteAddress: '127.0.0.1'
            },
            ip: '127.0.0.1'
        };

        // Mock response object
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            redirect: jest.fn()
        };

        // Mock next function
        mockNext = jest.fn();

        // W-105: Clear HookManager hooks to isolate tests
        global.HookManager?.clear?.();

        // Mock i18n translate function with new signature: translate(req, key, context)
        global.i18n = {
            default: 'en', // Add default property for getUserLanguage tests
            translate: jest.fn((req, key, context = {}) => {
                // Return predictable test values based on the key
                const translations = {
                    'controller.auth.roleRequired': `Insufficient privileges. Required role(s): ${context.roles}`,
                    'controller.auth.authenticationRequired': 'Authentication required',
                    'controller.auth.invalidCredentials': 'Invalid username/email or password',
                    'controller.auth.loginSuccess': 'Login successful',
                    'controller.auth.loginInternalError': `Internal server error during login: ${context.error}`,
                    'controller.auth.logoutSuccessful': 'Logout successful',
                    'controller.auth.logoutFailed': 'Failed to log out'
                };
                return translations[key] || key;
            })
        };

        // Set up spies on global modules (since auth controller uses global.*)
        jest.spyOn(global.CommonUtils, 'sendError').mockImplementation(() => {});
        jest.spyOn(global.LogController, 'logError').mockImplementation(() => {});
        jest.spyOn(global.LogController, 'logInfo').mockImplementation(() => {});
        jest.spyOn(global.LogController, 'logWarning').mockImplementation(() => {});

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('Authentication Helper Functions', () => {
        describe('isAuthenticated', () => {
            test('should return true for authenticated user', () => {
                mockReq.session.user = { isAuthenticated: true };

                const result = AuthController.isAuthenticated(mockReq);

                expect(result).toBe(true);
            });

            test('should return false for unauthenticated user', () => {
                mockReq.session.user = { isAuthenticated: false };

                const result = AuthController.isAuthenticated(mockReq);

                expect(result).toBe(false);
            });

            test('should return false for missing user session', () => {
                mockReq.session = {};

                const result = AuthController.isAuthenticated(mockReq);

                expect(result).toBe(false);
            });

            test('should return false for missing session', () => {
                delete mockReq.session;

                const result = AuthController.isAuthenticated(mockReq);

                expect(result).toBe(false);
            });
        });

        describe('isAuthorized', () => {
            test('should return true when user has required role', () => {
                mockReq.session.user = {
                    isAuthenticated: true,
                    roles: ['admin', 'user']
                };

                const result = AuthController.isAuthorized(mockReq, ['admin']);

                expect(result).toBe(true);
            });

            test('should return true when user has any of the required roles', () => {
                mockReq.session.user = {
                    isAuthenticated: true,
                    roles: ['user', 'editor']
                };

                const result = AuthController.isAuthorized(mockReq, ['admin', 'editor']);

                expect(result).toBe(true);
            });

            test('should return false when user lacks required role', () => {
                mockReq.session.user = {
                    isAuthenticated: true,
                    roles: ['user']
                };

                const result = AuthController.isAuthorized(mockReq, ['admin']);

                expect(result).toBe(false);
            });

            test('should return false for unauthenticated user', () => {
                mockReq.session.user = { isAuthenticated: false };

                const result = AuthController.isAuthorized(mockReq, ['admin']);

                expect(result).toBe(false);
            });

            test('should return false for missing user session', () => {
                mockReq.session = {};

                const result = AuthController.isAuthorized(mockReq, ['admin']);

                expect(result).toBe(false);
            });

            test('should accept single string roleOrRoles (array support)', () => {
                mockReq.session.user = {
                    isAuthenticated: true,
                    roles: ['editor']
                };

                const result = AuthController.isAuthorized(mockReq, 'editor');

                expect(result).toBe(true);
            });

            test('should return true for unauthenticated when roleOrRoles includes _public', () => {
                mockReq.session = {};

                const result = AuthController.isAuthorized(mockReq, ['_public', 'admin']);

                expect(result).toBe(true);
            });
        });

        describe('isAdmin (W-153)', () => {
            test('should return true when user has admin role', () => {
                mockReq.session.user = {
                    isAuthenticated: true,
                    roles: ['admin', 'user']
                };

                const result = AuthController.isAdmin(mockReq);

                expect(result).toBe(true);
            });

            test('should return false when user lacks admin role', () => {
                mockReq.session.user = {
                    isAuthenticated: true,
                    roles: ['user']
                };

                const result = AuthController.isAdmin(mockReq);

                expect(result).toBe(false);
            });
        });

        describe('userIsAdmin (W-153)', () => {
            test('should return true when user has admin role', () => {
                const user = { roles: ['admin', 'user'] };

                const result = AuthController.userIsAdmin(user);

                expect(result).toBe(true);
            });

            test('should return false when user lacks admin role', () => {
                const user = { roles: ['user', 'editor'] };

                const result = AuthController.userIsAdmin(user);

                expect(result).toBe(false);
            });

            test('should return false when user has no roles array', () => {
                const result = AuthController.userIsAdmin({});

                expect(result).toBe(false);
            });
        });

        describe('userIsAuthorized (W-153)', () => {
            test('should return true when user has required role (single string)', () => {
                const user = { roles: ['editor'] };

                const result = AuthController.userIsAuthorized(user, 'editor');

                expect(result).toBe(true);
            });

            test('should return true when user has any of required roles (array)', () => {
                const user = { roles: ['editor'] };

                const result = AuthController.userIsAuthorized(user, ['admin', 'editor']);

                expect(result).toBe(true);
            });

            test('should return false when user lacks required role', () => {
                const user = { roles: ['user'] };

                const result = AuthController.userIsAuthorized(user, ['admin', 'editor']);

                expect(result).toBe(false);
            });

            test('should return false when user has no roles array', () => {
                const result = AuthController.userIsAuthorized({}, ['admin']);

                expect(result).toBe(false);
            });
        });

        describe('getUserLanguage', () => {
            test('should return user preferred language', () => {
                mockReq.session.user = {
                    preferences: { language: 'de' }
                };

                const result = AuthController.getUserLanguage(mockReq);

                expect(result).toBe('de');
            });

            test('should return default language when no user preference', () => {
                mockReq.session.user = {};

                const result = AuthController.getUserLanguage(mockReq);

                expect(result).toBe('en'); // Default from our test i18n setup
            });

            test('should return default language for missing session', () => {
                mockReq.session = {};

                const result = AuthController.getUserLanguage(mockReq);

                expect(result).toBe('en');
            });
        });
    });

    describe('Middleware Functions', () => {
        describe('requireAuthentication', () => {
            test('should call next() for authenticated user', () => {
                mockReq.session.user = { isAuthenticated: true };

                AuthController.requireAuthentication(mockReq, mockRes, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(global.CommonUtils.sendError).not.toHaveBeenCalled();
            });

            test('should send error for unauthenticated user', () => {
                mockReq.session.user = { isAuthenticated: false };

                AuthController.requireAuthentication(mockReq, mockRes, mockNext);

                expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
                    mockReq, mockRes, 401, 'Authentication required', 'UNAUTHORIZED'
                );
                expect(mockNext).not.toHaveBeenCalled();
                expect(global.LogController.logError).toHaveBeenCalledWith(
                    mockReq, 'auth.requireAuthentication', 'error: Authentication required - access denied'
                );
            });

            test('should send error for missing user session', () => {
                mockReq.session = {};

                AuthController.requireAuthentication(mockReq, mockRes, mockNext);

                expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
                    mockReq, mockRes, 401, 'Authentication required', 'UNAUTHORIZED'
                );
                expect(mockNext).not.toHaveBeenCalled();
                expect(global.LogController.logError).toHaveBeenCalledWith(
                    mockReq, 'auth.requireAuthentication', 'error: Authentication required - access denied'
                );
            });
        });

        describe('requireRole', () => {
            test('should call next() for user with required role', () => {
                mockReq.session.user = {
                    isAuthenticated: true,
                    roles: ['admin'],
                    username: 'testuser'
                };

                const middleware = AuthController.requireRole(['admin']);
                middleware(mockReq, mockRes, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(global.CommonUtils.sendError).not.toHaveBeenCalled();
            });

            test('should send error for user without required role', () => {
                mockReq.session.user = {
                    isAuthenticated: true,
                    roles: ['user'],
                    username: 'testuser'
                };

                const middleware = AuthController.requireRole(['admin', 'root']);
                middleware(mockReq, mockRes, mockNext);

                // Update the expected message to match the i18n translation
                expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
                    mockReq, mockRes, 403, 'Insufficient privileges. Required role(s): admin, root', 'INSUFFICIENT_PRIVILEGES'
                );
                expect(mockNext).not.toHaveBeenCalled();
                expect(global.LogController.logError).toHaveBeenCalledWith(
                    mockReq, 'auth.requireRole', 'error: Role required (admin, root) - access denied for user testuser'
                );
            });

            test('should send error for unauthenticated user', () => {
                mockReq.session.user = { isAuthenticated: false };

                const middleware = AuthController.requireRole(['admin']);
                middleware(mockReq, mockRes, mockNext);

                expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
                    mockReq, mockRes, 401, 'Authentication required', 'UNAUTHORIZED'
                );
                expect(mockNext).not.toHaveBeenCalled();
                expect(global.LogController.logError).toHaveBeenCalledWith(
                    mockReq, 'auth.requireRole', 'error: Authentication required for role check - access denied'
                );
            });
        });
    });

    describe('Login/Logout Functions', () => {
        describe('login', () => {
            test('should authenticate user with valid credentials', async () => {
                const mockUser = {
                    _id: 'user123',
                    username: 'testuser',
                    email: 'testuser@example.com',  // Add valid email
                    profile: {
                        firstName: 'Test',
                        lastName: 'User',
                        nickName: 'Test'
                    },
                    roles: ['user'],
                    preferences: undefined,
                    loginCount: 0
                };

                UserModel.authenticate.mockResolvedValue(mockUser);

                mockReq.body = {
                    identifier: 'testuser',
                    password: 'validpassword'
                };

                await AuthController.login(mockReq, mockRes);

                expect(mockReq.session.user).toEqual({
                    isAuthenticated: true,
                    id: 'user123',
                    username: 'testuser',
                    email: 'testuser@example.com',  // Should have valid email
                    firstName: 'Test',
                    lastName: 'User',
                    nickName: 'Test',
                    initials: 'TU',
                    preferences: undefined,
                    roles: ['user']
                });
                // W-109: Login response includes nextStep and warnings
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: true,
                    nextStep: null,  // W-109: null when login complete
                    data: {
                        user: {
                            isAuthenticated: true,
                            id: 'user123',
                            username: 'testuser',
                            email: 'testuser@example.com',
                            firstName: 'Test',
                            lastName: 'User',
                            nickName: 'Test',
                            initials: 'TU',
                            preferences: undefined,
                            roles: ['user']
                        }
                    },
                    warnings: [],  // W-109: empty when no warnings
                    message: 'Login successful',
                    elapsed: expect.any(Number)
                });
            });

            test('should reject invalid credentials', async () => {
                UserModel.authenticate.mockResolvedValue(null); // Return null for invalid credentials

                mockReq.body = {
                    identifier: 'testuser',
                    password: 'wrongpassword'
                };

                await AuthController.login(mockReq, mockRes);

                expect(mockReq.session.user).toBeUndefined();

                // AuthController uses direct res.status().json(), not CommonUtils.sendError
                expect(mockRes.status).toHaveBeenCalledWith(401);
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: false,
                    error: 'Invalid username/email or password',  // Updated to match i18n
                    code: 'INVALID_CREDENTIALS'
                });

                // Should NOT call CommonUtils.sendError
                expect(global.CommonUtils.sendError).not.toHaveBeenCalled();
            });

            test('should handle authentication errors', async () => {
                UserModel.authenticate.mockRejectedValue(new Error('Database connection failed'));

                mockReq.body = {
                    identifier: 'testuser',
                    password: 'password'
                };

                await AuthController.login(mockReq, mockRes);

                // AuthController uses direct res.status().json(), not CommonUtils.sendError
                expect(mockRes.status).toHaveBeenCalledWith(500);
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: false,
                    error: 'Internal server error during login: Database connection failed',  // Updated to match i18n with context
                    code: 'INTERNAL_ERROR',
                    details: 'Database connection failed'
                });

                expect(global.LogController.logError).toHaveBeenCalledWith(
                    mockReq, 'auth.login', 'error: Database connection failed'
                );

                // Should NOT call CommonUtils.sendError
                expect(global.CommonUtils.sendError).not.toHaveBeenCalled();
            });
        });

        describe('logout', () => {
            // W-105: Tests updated to handle async logout with hook calls
            test('should logout authenticated user', async () => {
                mockReq.session = {
                    user: { isAuthenticated: true, username: 'testuser' },
                    destroy: jest.fn(callback => callback())
                };

                await AuthController.logout(mockReq, mockRes);

                // Wait for async callback to complete
                await new Promise(resolve => setImmediate(resolve));

                expect(mockReq.session.destroy).toHaveBeenCalled();
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: true,
                    message: 'Logout successful',
                    elapsed: expect.any(Number)
                });
            });

            test('should handle logout for unauthenticated user', async () => {
                mockReq.session = {
                    destroy: jest.fn(callback => callback(null)) // Mock successful destroy
                };

                await AuthController.logout(mockReq, mockRes);

                // Wait for async callback to complete
                await new Promise(resolve => setImmediate(resolve));

                expect(mockReq.session.destroy).toHaveBeenCalled();
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: true,
                    message: 'Logout successful',
                    elapsed: expect.any(Number)
                });
            });

            test('should handle session destruction errors', async () => {
                const error = new Error('Session destruction failed');
                mockReq.session = {
                    user: { isAuthenticated: true, username: 'testuser' },
                    destroy: jest.fn(callback => callback(error))
                };

                await AuthController.logout(mockReq, mockRes);

                // Wait for async callback to complete
                await new Promise(resolve => setImmediate(resolve));

                // AuthController uses direct res.status().json(), not CommonUtils.sendError
                expect(mockRes.status).toHaveBeenCalledWith(500);
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: false,
                    error: 'Failed to log out',  // Updated to match i18n (corrected spelling)
                    code: 'LOGOUT_ERROR'
                });

                expect(global.LogController.logError).toHaveBeenCalledWith(
                    mockReq, 'auth.logout', 'error: Session destruction failed'
                );

                // Should NOT call CommonUtils.sendError
                expect(global.CommonUtils.sendError).not.toHaveBeenCalled();
            });
        });
    });

    describe('Session Management', () => {
        describe('updateUserSession', () => {
            test('should update user session with new data', () => {
                mockReq.session = {
                    user: {
                        isAuthenticated: true,
                        username: 'testuser',
                        firstName: 'Old',           // Flattened structure, not profile.firstName
                        lastName: 'Name',           // Flattened structure, not profile.lastName
                        preferences: {}
                    }
                };

                const updatedData = {
                    profile: { firstName: 'New', lastName: 'Name' },
                    preferences: { language: 'de' }
                };

                AuthController.updateUserSession(mockReq, updatedData);

                // updateUserSession updates the flattened session structure
                expect(mockReq.session.user.firstName).toBe('New');  // Direct property, not profile.firstName
                expect(mockReq.session.user.lastName).toBe('Name');   // Direct property, not profile.lastName
                expect(mockReq.session.user.initials).toBe('NN');     // Should be calculated from New Name
                expect(mockReq.session.user.preferences).toEqual({ language: 'de' });
                expect(mockReq.session.user.username).toBe('testuser'); // Preserved
                expect(mockReq.session.user.isAuthenticated).toBe(true); // Preserved
            });

            test('should handle missing session gracefully', () => {
                mockReq.session = {};

                const updatedData = { profile: { firstName: 'Test' } };

                // Should not throw error
                expect(() => {
                    AuthController.updateUserSession(mockReq, updatedData);
                }).not.toThrow();
            });
        });
    });

    // W-195: External-auth framework enhancements (placed before "W-109: Multi-step login
    // helpers" below, which permanently replaces global.HookManager with a bare { execute }
    // stub that has no register() - tests needing the real HookManager must run before it)
    describe('W-195: completeExternalAuth', () => {
        const mockUser = {
            _id: 'ext-user-1',
            username: 'extuser',
            email: 'extuser@example.com',
            profile: { firstName: 'Ext', lastName: 'User' },
            roles: ['user'],
            loginCount: 2
        };

        beforeEach(() => {
            UserModel.updateById = jest.fn().mockResolvedValue({});
            global.HookManager?.clear?.();
        });

        test('should create session and redirect to redirectUrl when no further steps are required', async () => {
            await AuthController.completeExternalAuth(mockReq, mockRes, mockUser, 'oauth', '/dashboard');

            expect(mockReq.session.user).toMatchObject({
                username: 'extuser',
                isAuthenticated: true
            });
            expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
            expect(mockRes.json).not.toHaveBeenCalled();
        });

        test('should default redirectUrl to / when not provided', async () => {
            await AuthController.completeExternalAuth(mockReq, mockRes, mockUser, 'oauth', undefined);

            expect(mockRes.redirect).toHaveBeenCalledWith('/');
        });

        test('should redirect to the next step\'s page when onAuthGetSteps reports one pending', async () => {
            global.HookManager.register('onAuthGetSteps', 'test-plugin', (context) => {
                context.requiredSteps.push({ step: 'mfa', priority: 100, page: '/auth/mfa-verify.shtml' });
                return context;
            });

            await AuthController.completeExternalAuth(mockReq, mockRes, mockUser, 'oauth', '/dashboard');

            expect(mockRes.redirect).toHaveBeenCalledWith(
                `/auth/mfa-verify.shtml?redirect=${encodeURIComponent('/dashboard')}`
            );
            expect(mockReq.session.pendingAuth).toMatchObject({
                username: 'extuser',
                authMethod: 'oauth',
                requiredSteps: ['credentials', 'mfa']
            });
            // Session should not be finalized yet - still mid multi-step flow
            expect(mockReq.session.user).toBeUndefined();
        });

        test('should fall back to /auth/login.shtml and log a warning when the next step has no page', async () => {
            global.HookManager.register('onAuthGetSteps', 'test-plugin', (context) => {
                context.requiredSteps.push({ step: 'mfa', priority: 100 });
                return context;
            });

            await AuthController.completeExternalAuth(mockReq, mockRes, mockUser, 'oauth', '/dashboard');

            expect(mockRes.redirect).toHaveBeenCalledWith(
                `/auth/login.shtml?redirect=${encodeURIComponent('/dashboard')}`
            );
            expect(global.LogController.logWarning).toHaveBeenCalledWith(
                mockReq, 'auth.completeExternalAuth',
                expect.stringContaining("step 'mfa' has no 'page'")
            );
        });

        test('carries onAuthGetWarnings warnings across the final redirect (no AJAX response to read them from)', async () => {
            global.HookManager.register('onAuthGetWarnings', 'test-plugin', (context) => {
                context.warnings.push({ type: 'mfa-not-enabled', toastType: 'info', message: 'Consider enabling MFA' });
                return context;
            });

            await AuthController.completeExternalAuth(mockReq, mockRes, mockUser, 'oauth', '/dashboard');

            expect(mockRes.redirect).toHaveBeenCalledTimes(1);
            const redirectedUrl = mockRes.redirect.mock.calls[0][0];
            expect(redirectedUrl).toMatch(/^\/dashboard\?toasts=/);

            const encoded = new URL(redirectedUrl, 'https://example.com').searchParams.get('toasts');
            const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
            expect(decoded).toEqual([
                { type: 'mfa-not-enabled', toastType: 'info', message: 'Consider enabling MFA' }
            ]);
        });
    });

    // W-195: localAuthRestriction enforcement in the credentials step
    describe('W-195: localAuthRestriction enforcement', () => {
        const mockUser = {
            _id: 'user123',
            username: 'testuser',
            email: 'testuser@example.com',
            profile: { firstName: 'Test', lastName: 'User' },
            roles: ['user'],
            loginCount: 0
        };
        const mockAdminUser = { ...mockUser, username: 'adminuser', roles: ['admin'] };

        // Snapshot the real controller.auth config so it can be restored after each test -
        // login() reads other fields off it too (e.g. disableLogin), so it must never be left
        // fully deleted for later tests/describes in this file.
        const originalAuthConfig = { ...global.appConfig.controller.auth };

        beforeEach(() => {
            mockReq.body = { identifier: 'testuser', password: 'validpassword' };
            global.i18n.translate = jest.fn((req, key) => {
                if (key === 'controller.auth.localAuthRestricted') return 'Local sign-in is restricted';
                return key;
            });
            global.HookManager?.clear?.();
        });

        afterEach(() => {
            global.appConfig.controller.auth = { ...originalAuthConfig };
        });

        test("should block non-admin users when localAuthRestriction is 'admins-only'", async () => {
            global.appConfig.controller.auth = { localAuthRestriction: 'admins-only' };
            UserModel.authenticate.mockResolvedValue(mockUser);

            await AuthController.login(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Local sign-in is restricted',
                code: 'LOCAL_AUTH_RESTRICTED'
            });
            expect(mockReq.session.user).toBeUndefined();
        });

        test("should allow admin users when localAuthRestriction is 'admins-only'", async () => {
            global.appConfig.controller.auth = { localAuthRestriction: 'admins-only' };
            UserModel.authenticate.mockResolvedValue(mockAdminUser);

            await AuthController.login(mockReq, mockRes);

            expect(mockRes.status).not.toHaveBeenCalledWith(403);
            expect(mockReq.session.user).toMatchObject({ username: 'adminuser', isAuthenticated: true });
        });

        test("should block all local sign-ins when localAuthRestriction is 'disabled'", async () => {
            global.appConfig.controller.auth = { localAuthRestriction: 'disabled' };
            UserModel.authenticate.mockResolvedValue(mockAdminUser);

            await AuthController.login(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, code: 'LOCAL_AUTH_RESTRICTED' })
            );
        });

        test("should allow local sign-in when localAuthRestriction is 'none' (default)", async () => {
            global.appConfig.controller.auth = { localAuthRestriction: 'none' };
            UserModel.authenticate.mockResolvedValue(mockUser);

            await AuthController.login(mockReq, mockRes);

            expect(mockRes.status).not.toHaveBeenCalledWith(403);
            expect(mockReq.session.user).toMatchObject({ username: 'testuser', isAuthenticated: true });
        });

        test('should allow local sign-in when localAuthRestriction is absent (pre-W-195 site config)', async () => {
            delete global.appConfig.controller.auth.localAuthRestriction;
            UserModel.authenticate.mockResolvedValue(mockUser);

            await AuthController.login(mockReq, mockRes);

            expect(mockRes.status).not.toHaveBeenCalledWith(403);
            expect(mockReq.session.user).toMatchObject({ username: 'testuser', isAuthenticated: true });
        });

        test('should not apply localAuthRestriction to external auth (skipPasswordCheck) methods', async () => {
            global.appConfig.controller.auth = { localAuthRestriction: 'disabled' };
            global.HookManager.register('onAuthBeforeLogin', 'ext-plugin', (context) => {
                context.skipPasswordCheck = true;
                context.user = mockUser;
                context.authMethod = 'ldap';
                return context;
            });

            await AuthController.login(mockReq, mockRes);

            expect(mockRes.status).not.toHaveBeenCalledWith(403);
            expect(mockReq.session.user).toMatchObject({ username: 'testuser', isAuthenticated: true });
        });
    });

    describe('W-201: account status enforcement', () => {
        const baseUser = {
            _id: 'user123',
            username: 'testuser',
            email: 'testuser@example.com',
            profile: { firstName: 'Test', lastName: 'User' },
            roles: ['user'],
            loginCount: 0
        };

        beforeEach(() => {
            mockReq.body = { identifier: 'testuser', password: 'validpassword' };
            global.i18n.translate = jest.fn((req, key) => {
                const translations = {
                    'controller.auth.accountPendingApproval': 'Your account is pending approval.',
                    'controller.auth.accountSuspended': 'Your account has been suspended.',
                    'controller.auth.accountTerminated': 'Your account has been terminated.',
                    'controller.auth.accountInactive': 'Your account is inactive.'
                };
                return translations[key] || key;
            });
            global.HookManager?.clear?.();
        });

        describe.each([
            ['pending', 'ACCOUNT_PENDING_APPROVAL', 'Your account is pending approval.'],
            ['suspended', 'ACCOUNT_SUSPENDED', 'Your account has been suspended.'],
            ['terminated', 'ACCOUNT_TERMINATED', 'Your account has been terminated.'],
            ['inactive', 'ACCOUNT_INACTIVE', 'Your account is inactive.']
        ])("status '%s'", (status, code, message) => {
            test('blocks internal (username/password) login', async () => {
                UserModel.authenticate.mockResolvedValue({ ...baseUser, status });

                await AuthController.login(mockReq, mockRes);

                expect(mockRes.status).toHaveBeenCalledWith(403);
                expect(mockRes.json).toHaveBeenCalledWith({ success: false, error: message, code });
                expect(mockReq.session.user).toBeUndefined();
            });

            test('blocks external (skipPasswordCheck) login - no longer relies on UserModel.authenticate()', async () => {
                global.HookManager.register('onAuthBeforeLogin', 'ext-plugin', (context) => {
                    context.skipPasswordCheck = true;
                    context.user = { ...baseUser, status };
                    context.authMethod = 'ldap';
                    return context;
                });

                await AuthController.login(mockReq, mockRes);

                expect(UserModel.authenticate).not.toHaveBeenCalled();
                expect(mockRes.status).toHaveBeenCalledWith(403);
                expect(mockRes.json).toHaveBeenCalledWith({ success: false, error: message, code });
                expect(mockReq.session.user).toBeUndefined();
            });
        });

        test("allows login for status 'active' (regression guard)", async () => {
            UserModel.authenticate.mockResolvedValue({ ...baseUser, status: 'active' });

            await AuthController.login(mockReq, mockRes);

            expect(mockRes.status).not.toHaveBeenCalledWith(403);
            expect(mockReq.session.user).toMatchObject({ username: 'testuser', isAuthenticated: true });
        });
    });

    // W-109: Multi-step login helpers
    describe('W-109: Multi-step login helpers', () => {
        test('AuthController should have _getRequiredSteps static method', () => {
            expect(typeof AuthController._getRequiredSteps).toBe('function');
        });

        test('AuthController should have _completeLogin static method', () => {
            expect(typeof AuthController._completeLogin).toBe('function');
        });

        test('login should accept step parameter in request body', async () => {
            // Setup mock for login with step parameter
            mockReq.body = {
                step: 'credentials',
                username: 'testuser',
                password: 'testpass'
            };
            mockReq.session = {};

            // Mock UserModel.authenticate to return null (invalid credentials)
            // to test the basic flow without needing full integration
            const UserModelMock = (await import('../../../model/user.js')).default;
            UserModelMock.authenticate = jest.fn().mockResolvedValue(null);

            // Mock HookManager
            global.HookManager = {
                execute: jest.fn().mockImplementation((hookName, context) => Promise.resolve(context))
            };

            await AuthController.login(mockReq, mockRes);

            // Should call authenticate with username/password
            expect(UserModelMock.authenticate).toHaveBeenCalledWith('testuser', 'testpass');
        });
    });

    // Minimal self-contained HookManager fake for the two W-205 describes below - an earlier
    // test in this file ("login should accept step parameter...") replaces global.HookManager
    // with a stub lacking register()/clear() and never restores it, so these describes must not
    // depend on whatever global.HookManager happens to be left over from prior tests/file order.
    function createFakeHookManager() {
        const handlers = {};
        return {
            register: (hookName, pluginName, handler) => {
                (handlers[hookName] = handlers[hookName] || []).push(handler);
            },
            execute: async (hookName, context) => {
                let ctx = context;
                for (const handler of (handlers[hookName] || [])) {
                    ctx = (await handler(ctx)) || ctx;
                }
                return ctx;
            },
            clear: () => {
                for (const key of Object.keys(handlers)) {
                    delete handlers[key];
                }
            }
        };
    }

    // W-205: email verification step, across all three controller.user.emailVerification policies
    describe('W-205: email verification step (_getRequiredSteps)', () => {
        const mockUser = {
            _id: 'user-ev-1',
            username: 'evuser',
            email: 'evuser@example.com',
            profile: { firstName: 'Ev' },
            emailVerified: false
        };

        beforeEach(() => {
            global.HookManager = createFakeHookManager();
            UserModel.hasValidEmailVerification.mockResolvedValue(false);
            UserModel.issueEmailVerification.mockResolvedValue({ success: true, errorCode: null });
        });

        test("pushes the email-verify step (priority 50) when policy is 'required' and the user is unverified", async () => {
            UserModel.getEmailVerificationPolicy.mockReturnValue('required');

            const steps = await AuthController._getRequiredSteps(mockReq, mockUser, []);

            expect(steps).toEqual([
                expect.objectContaining({ step: 'email-verify', priority: 50, page: '/auth/email-verify.shtml' })
            ]);
        });

        test('auto-issues a fresh credential when none is currently valid', async () => {
            UserModel.getEmailVerificationPolicy.mockReturnValue('required');
            UserModel.hasValidEmailVerification.mockResolvedValue(false);

            await AuthController._getRequiredSteps(mockReq, mockUser, []);

            expect(UserModel.issueEmailVerification).toHaveBeenCalledWith(mockReq, mockUser);
        });

        test('does not re-issue when a valid credential already exists (repeated arrivals do not re-send)', async () => {
            UserModel.getEmailVerificationPolicy.mockReturnValue('required');
            UserModel.hasValidEmailVerification.mockResolvedValue(true);

            await AuthController._getRequiredSteps(mockReq, mockUser, []);

            expect(UserModel.issueEmailVerification).not.toHaveBeenCalled();
        });

        test("does not push a step when policy is 'required' but the user is already verified", async () => {
            UserModel.getEmailVerificationPolicy.mockReturnValue('required');

            const steps = await AuthController._getRequiredSteps(mockReq, { ...mockUser, emailVerified: true }, []);

            expect(steps).toEqual([]);
            expect(UserModel.issueEmailVerification).not.toHaveBeenCalled();
        });

        test("does not push a blocking step when policy is 'nag' (surfaces later as a warning instead)", async () => {
            UserModel.getEmailVerificationPolicy.mockReturnValue('nag');

            const steps = await AuthController._getRequiredSteps(mockReq, mockUser, []);

            expect(steps).toEqual([]);
            expect(UserModel.issueEmailVerification).not.toHaveBeenCalled();
        });

        test("does not push a step when policy is 'off'", async () => {
            UserModel.getEmailVerificationPolicy.mockReturnValue('off');

            const steps = await AuthController._getRequiredSteps(mockReq, mockUser, []);

            expect(steps).toEqual([]);
        });

        test('email-verify (priority 50) sorts ahead of a plugin mfa step (priority 100)', async () => {
            UserModel.getEmailVerificationPolicy.mockReturnValue('required');
            global.HookManager.register('onAuthGetSteps', 'test-mfa-plugin', (context) => {
                context.requiredSteps.push({ step: 'mfa', priority: 100, page: '/auth/mfa-verify.shtml' });
                return context;
            });

            const steps = await AuthController._getRequiredSteps(mockReq, mockUser, []);

            expect(steps.map((s) => s.step)).toEqual(['email-verify', 'mfa']);
        });

        test("masks the email address in the step's data (never the raw address)", async () => {
            UserModel.getEmailVerificationPolicy.mockReturnValue('required');

            const steps = await AuthController._getRequiredSteps(mockReq, mockUser, []);

            expect(steps[0].data.email).toBe(global.CommonUtils.maskEmail(mockUser.email));
            expect(steps[0].data.email).not.toBe(mockUser.email);
        });
    });

    // W-205: the 'nag' toast is pushed here (not as a blocking step), only when unverified and 'nag'
    describe('W-205: email verification nag warning (_completeLoginSession)', () => {
        const mockUser = {
            _id: 'user-nag-1',
            username: 'naguser',
            email: 'naguser@example.com',
            profile: { firstName: 'Nag' },
            roles: ['user'],
            loginCount: 0,
            emailVerified: false
        };

        beforeEach(() => {
            UserModel.updateById.mockResolvedValue({});
            global.HookManager = createFakeHookManager();
            global.i18n.translateForUser = jest.fn((user, key) => key);
        });

        test("pushes an email-verify-nag warning when policy is 'nag' and the user is unverified", async () => {
            UserModel.getEmailVerificationPolicy.mockReturnValue('nag');

            const { warnings } = await AuthController._completeLoginSession(mockReq, mockUser, 'password', Date.now());

            expect(warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    type: 'email-verify-nag',
                    toastType: 'error',
                    link: '/auth/email-verify.shtml'
                })
            ]));
        });

        test("does not warn when policy is 'nag' but the user is already verified", async () => {
            UserModel.getEmailVerificationPolicy.mockReturnValue('nag');

            const { warnings } = await AuthController._completeLoginSession(
                mockReq, { ...mockUser, emailVerified: true }, 'password', Date.now()
            );

            expect(warnings.find((w) => w.type === 'email-verify-nag')).toBeUndefined();
        });

        test("does not warn when policy is 'off', even though emailVerified is still false", async () => {
            UserModel.getEmailVerificationPolicy.mockReturnValue('off');

            const { warnings } = await AuthController._completeLoginSession(mockReq, mockUser, 'password', Date.now());

            expect(warnings.find((w) => w.type === 'email-verify-nag')).toBeUndefined();
        });

        test("does not warn when policy is 'required' (blocked earlier in _getRequiredSteps, never reaches here unverified)", async () => {
            UserModel.getEmailVerificationPolicy.mockReturnValue('required');

            const { warnings } = await AuthController._completeLoginSession(mockReq, mockUser, 'password', Date.now());

            expect(warnings.find((w) => w.type === 'email-verify-nag')).toBeUndefined();
        });

        test('stashes non-empty warnings on session.pendingWarnings so a same-session pendingStatus() poll can still deliver them', async () => {
            UserModel.getEmailVerificationPolicy.mockReturnValue('nag');

            await AuthController._completeLoginSession(mockReq, mockUser, 'password', Date.now());

            expect(mockReq.session.pendingWarnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ type: 'email-verify-nag' })
            ]));
        });

        test('clears a stale session.pendingWarnings when this login produces no warnings (self-cleaning, never accumulates)', async () => {
            mockReq.session.pendingWarnings = [{ type: 'stale-from-a-previous-login', toastType: 'info', message: 'old' }];
            UserModel.getEmailVerificationPolicy.mockReturnValue('off');

            await AuthController._completeLoginSession(mockReq, mockUser, 'password', Date.now());

            expect(mockReq.session.pendingWarnings).toBeUndefined();
        });
    });

    // W-205: cross-device "am I verified yet" poll - its own endpoint, split out of login()
    // after the shared endpoint was found (in manual testing) to inherit login()'s per-IP rate
    // limiter / nginx's stricter 'login' zone, neither of which a status poll should share.
    describe('W-205: pendingStatus (GET /api/1/auth/pending-status)', () => {
        const mockUser = {
            _id: 'user-poll-1',
            username: 'polluser',
            email: 'polluser@example.com',
            profile: { firstName: 'Poll' },
            roles: ['user'],
            loginCount: 0,
            emailVerified: false
        };

        function makePending(overrides = {}) {
            return {
                userId: 'user-poll-1',
                username: 'polluser',
                authMethod: 'internal',
                requiredSteps: ['credentials', 'email-verify'],
                completedSteps: ['credentials'],
                redirect: '/',
                createdAt: Date.now(),
                ...overrides
            };
        }

        beforeEach(() => {
            global.HookManager = createFakeHookManager();
            UserModel.updateById.mockResolvedValue({});
            UserModel.findById.mockResolvedValue(mockUser);
        });

        test('reports login complete (not NO_PENDING_AUTH) when another tab/window already completed this same session', async () => {
            // e.g. the confirm link opened in a second window sharing this session's cookie -
            // _completeLoginSession() already set session.user and deleted pendingAuth together
            mockReq.session.user = { isAuthenticated: true, username: 'polluser' };
            mockReq.session.pendingAuth = undefined;

            await AuthController.pendingStatus(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({ success: true, nextStep: null, warnings: [] });
            expect(mockRes.status).not.toHaveBeenCalled();
            expect(UserModel.findById).not.toHaveBeenCalled();
        });

        test('drains session.pendingWarnings (e.g. the MFA nag) stashed by the OTHER tab\'s _completeLoginSession() call', async () => {
            const stashedWarnings = [{ type: 'mfa-not-enabled', toastType: 'info', message: 'Consider enabling MFA' }];
            mockReq.session.user = { isAuthenticated: true, username: 'polluser' };
            mockReq.session.pendingAuth = undefined;
            mockReq.session.pendingWarnings = stashedWarnings;

            await AuthController.pendingStatus(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({ success: true, nextStep: null, warnings: stashedWarnings });
            expect(mockReq.session.pendingWarnings).toBeUndefined();
        });

        test('returns NO_PENDING_AUTH (400) when there is no pending auth in this session', async () => {
            mockReq.session.pendingAuth = undefined;

            await AuthController.pendingStatus(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                code: 'NO_PENDING_AUTH'
            }));
            expect(UserModel.findById).not.toHaveBeenCalled();
        });

        test('returns AUTH_EXPIRED (400) once the extended 30-minute email-verify window has passed', async () => {
            mockReq.session.pendingAuth = makePending({ createdAt: Date.now() - (31 * 60 * 1000) });

            await AuthController.pendingStatus(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                code: 'AUTH_EXPIRED'
            }));
            expect(mockReq.session.pendingAuth).toBeUndefined();
        });

        test("does not expire a fresh pending auth still within the 30-minute email-verify window", async () => {
            mockReq.session.pendingAuth = makePending({ createdAt: Date.now() - (10 * 60 * 1000) });

            await AuthController.pendingStatus(mockReq, mockRes);

            expect(mockRes.json).not.toHaveBeenCalledWith(expect.objectContaining({ code: 'AUTH_EXPIRED' }));
        });

        test("applies the shorter 5-minute default window (not 30) when the expected step isn't email-verify", async () => {
            mockReq.session.pendingAuth = makePending({
                requiredSteps: ['credentials', 'mfa'],
                createdAt: Date.now() - (6 * 60 * 1000)
            });

            await AuthController.pendingStatus(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'AUTH_EXPIRED' }));
        });

        test('echoes a non-email-verify expected step back unchanged, with no DB read (no cross-device story for it)', async () => {
            mockReq.session.pendingAuth = makePending({ requiredSteps: ['credentials', 'mfa'] });

            await AuthController.pendingStatus(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({ success: true, nextStep: 'mfa', page: null });
            expect(UserModel.findById).not.toHaveBeenCalled();
        });

        test('reports nextStep: email-verify (with masked email) while the user is still unverified', async () => {
            mockReq.session.pendingAuth = makePending();

            await AuthController.pendingStatus(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                nextStep: 'email-verify',
                page: '/auth/email-verify.shtml',
                email: global.CommonUtils.maskEmail(mockUser.email)
            });
            expect(mockReq.session.pendingAuth.completedSteps).toEqual(['credentials']);
        });

        test('advances to the next step and updates session pendingAuth once verified elsewhere, when another step follows', async () => {
            mockReq.session.pendingAuth = makePending();
            UserModel.findById.mockResolvedValue({ ...mockUser, emailVerified: true });
            global.HookManager.register('onAuthGetSteps', 'test-mfa-plugin', (context) => {
                context.requiredSteps.push({ step: 'mfa', priority: 100, page: '/auth/mfa-verify.shtml' });
                return context;
            });

            await AuthController.pendingStatus(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                nextStep: 'mfa',
                page: '/auth/mfa-verify.shtml'
            }));
            expect(mockReq.session.pendingAuth).toMatchObject({
                completedSteps: ['credentials', 'email-verify'],
                requiredSteps: ['credentials', 'email-verify', 'mfa']
            });
            expect(global.LogController.logInfo).toHaveBeenCalledWith(
                mockReq, 'auth.pendingStatus', expect.stringContaining('verified elsewhere')
            );
        });

        test('completes the login when verified elsewhere and no further steps remain', async () => {
            mockReq.session.pendingAuth = makePending();
            UserModel.findById.mockResolvedValue({ ...mockUser, emailVerified: true });

            await AuthController.pendingStatus(mockReq, mockRes);

            expect(mockReq.session.user).toMatchObject({ isAuthenticated: true, username: 'polluser' });
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                nextStep: null
            }));
        });

        test('returns NO_PENDING_AUTH (400) and clears the session when the user no longer exists', async () => {
            mockReq.session.pendingAuth = makePending();
            UserModel.findById.mockResolvedValue(null);

            await AuthController.pendingStatus(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                code: 'NO_PENDING_AUTH'
            }));
            expect(mockReq.session.pendingAuth).toBeUndefined();
        });

        test('returns INTERNAL_ERROR (500) when an unexpected error is thrown', async () => {
            mockReq.session.pendingAuth = makePending();
            UserModel.findById.mockRejectedValue(new Error('DB unavailable'));

            await AuthController.pendingStatus(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                code: 'INTERNAL_ERROR'
            }));
        });

        test('never resends a verification email or consumes an attempt while merely polling', async () => {
            mockReq.session.pendingAuth = makePending();

            await AuthController.pendingStatus(mockReq, mockRes);

            expect(UserModel.issueEmailVerification).not.toHaveBeenCalled();
            expect(UserModel.verifyEmailByCode).not.toHaveBeenCalled();
        });
    });

    describe('getStatus (W-163)', () => {
        test('should return authenticated:true with username and roles when session is active', async () => {
            mockReq.session.user = {
                isAuthenticated: true,
                username: 'jsmith',
                roles: ['user', 'editor']
            };

            await AuthController.getStatus(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    authenticated: true,
                    username: 'jsmith',
                    roles: ['user', 'editor']
                }
            });
        });

        test('should return authenticated:false when session has no user', async () => {
            mockReq.session = {};

            await AuthController.getStatus(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: { authenticated: false }
            });
        });

        test('should return authenticated:false when isAuthenticated is false', async () => {
            mockReq.session.user = { isAuthenticated: false, username: 'jsmith' };

            await AuthController.getStatus(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: { authenticated: false }
            });
        });

        test('should return authenticated:false when session is missing', async () => {
            delete mockReq.session;

            await AuthController.getStatus(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: { authenticated: false }
            });
        });

        test('should return empty roles array when user has no roles', async () => {
            mockReq.session.user = {
                isAuthenticated: true,
                username: 'jsmith'
                // no roles property
            };

            await AuthController.getStatus(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    authenticated: true,
                    username: 'jsmith',
                    roles: []
                }
            });
        });

        test('should always return HTTP 200 regardless of auth state', async () => {
            mockReq.session = {};

            await AuthController.getStatus(mockReq, mockRes);

            expect(mockRes.status).not.toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: true })
            );
        });
    });

    describe('W-204: login rate limiting', () => {
        const activeUser = {
            _id: 'user123',
            username: 'testuser',
            email: 'testuser@example.com',
            profile: { firstName: 'Test', lastName: 'User' },
            roles: ['user'],
            status: 'active',
            loginCount: 0
        };

        beforeEach(() => {
            mockReq.body = { identifier: 'testuser', password: 'validpassword' };
            mockReq.ip = '127.0.0.1';
            global.i18n.translate = jest.fn((req, key) => {
                if (key === 'controller.auth.rateLimited') return 'Too many login attempts.';
                return key;
            });
            // By the time this describe runs, the 'W-109: Multi-step login helpers' block above
            // has permanently replaced global.HookManager with a bare { execute } stub with no
            // register()/clear() - reset it to a self-contained fresh stub for these tests.
            global.HookManager = { execute: jest.fn().mockImplementation((name, ctx) => Promise.resolve(ctx)) };
            global.RedisManager = {
                cacheCheckRateLimit: jest.fn().mockResolvedValue({ allowed: true, count: 1, retryAfter: 0 })
            };
        });

        afterEach(() => {
            delete global.RedisManager;
            delete global.appConfig.controller.auth.loginRateLimit;
        });

        test('allows login and checks the rate limit by client IP when under the limit', async () => {
            UserModel.authenticate.mockResolvedValue(activeUser);

            await AuthController.login(mockReq, mockRes);

            expect(global.RedisManager.cacheCheckRateLimit).toHaveBeenCalledWith(
                'controller:auth:rateLimit:login', '127.0.0.1',
                expect.objectContaining({ limit: expect.any(Number), windowSeconds: expect.any(Number) })
            );
            expect(mockReq.session.user).toMatchObject({ username: 'testuser', isAuthenticated: true });
        });

        test('blocks login with 429, fires onAuthFailure, and never calls UserModel.authenticate() when rate limit exceeded', async () => {
            global.RedisManager.cacheCheckRateLimit.mockResolvedValue({ allowed: false, count: 21, retryAfter: 45000 });

            await AuthController.login(mockReq, mockRes);

            expect(UserModel.authenticate).not.toHaveBeenCalled();
            expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
                mockReq, mockRes, 429, 'Too many login attempts.', 'RATE_LIMITED', { retryAfter: 45 }
            );
            expect(global.HookManager.execute).toHaveBeenCalledWith('onAuthFailure',
                expect.objectContaining({ reason: 'RATE_LIMITED', identifier: 'testuser' }));
            expect(mockReq.session.user).toBeUndefined();
        });

        test('skips the rate limit check entirely when loginRateLimit.enabled is false', async () => {
            global.appConfig.controller.auth.loginRateLimit = { enabled: false };
            UserModel.authenticate.mockResolvedValue(activeUser);

            await AuthController.login(mockReq, mockRes);

            expect(global.RedisManager.cacheCheckRateLimit).not.toHaveBeenCalled();
            expect(mockReq.session.user).toMatchObject({ username: 'testuser', isAuthenticated: true });
        });

        test('fails open (does not block login) when global.RedisManager is not initialized', async () => {
            delete global.RedisManager;
            UserModel.authenticate.mockResolvedValue(activeUser);

            await AuthController.login(mockReq, mockRes);

            expect(global.CommonUtils.sendError).not.toHaveBeenCalledWith(
                expect.anything(), expect.anything(), 429, expect.anything(), 'RATE_LIMITED', expect.anything());
            expect(mockReq.session.user).toMatchObject({ username: 'testuser', isAuthenticated: true });
        });
    });
});

// EOF webapp/tests/unit/controller/auth-controller.test.js
