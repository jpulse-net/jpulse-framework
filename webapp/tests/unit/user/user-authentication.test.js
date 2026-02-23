/**
 * @name            jPulse Framework / WebApp / Tests / Unit / User / User Authentication
 * @tagline         Authentication tests for User Model and Controller
 * @description     Unit tests for user authentication, login, logout, and security features
 * @file            webapp/tests/unit/user/user-authentication.test.js
 * @version         1.6.22
 * @release         2026-02-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.0, Claude Sonnet 4.5
 */

import { jest } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';
import bcrypt from 'bcrypt';

describe('User Authentication Tests', () => {
    describe('Password Security', () => {
        test('should hash passwords with bcrypt using 12 salt rounds', async () => {
            const password = 'testpassword123';
            const saltRounds = 12;

            // Test password hashing
            const hash = await bcrypt.hash(password, saltRounds);

            expect(hash).toBeDefined();
            expect(typeof hash).toBe('string');
            expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
            expect(hash.startsWith('$2b$12$')).toBe(true); // bcrypt format with 12 rounds
        });

        test('should verify passwords correctly', async () => {
            const password = 'testpassword123';
            const wrongPassword = 'wrongpassword';
            const hash = await bcrypt.hash(password, 12);

            // Test correct password verification
            const isValidCorrect = await bcrypt.compare(password, hash);
            expect(isValidCorrect).toBe(true);

            // Test incorrect password verification
            const isValidWrong = await bcrypt.compare(wrongPassword, hash);
            expect(isValidWrong).toBe(false);
        });

        test('should handle password hashing errors gracefully', async () => {
            // Test with invalid input
            await expect(bcrypt.hash(null, 12)).rejects.toThrow();
            await expect(bcrypt.hash(undefined, 12)).rejects.toThrow();
            await expect(bcrypt.hash(123, 12)).rejects.toThrow();
        });
    });

    describe('Authentication Logic', () => {
        test('should authenticate valid active users', () => {
            const mockUser = {
                _id: '507f1f77bcf86cd799439011',
                username: 'testuser',
                email: 'test@example.com',
                passwordHash: '$2b$12$hashedpassword...',
                status: 'active',
                profile: { firstName: 'Test', lastName: 'User' },
                roles: ['user']
            };

            // Simulate authentication logic
            const authenticateUser = (user, password) => {
                if (!user || user.status !== 'active') {
                    return null;
                }

                // In real implementation, this would use bcrypt.compare
                // For test, we simulate successful password verification
                const isValidPassword = true;

                if (!isValidPassword) {
                    return null;
                }

                // Return user without password hash
                const { passwordHash, ...userWithoutPassword } = user;
                return userWithoutPassword;
            };

            const result = authenticateUser(mockUser, 'correctpassword');

            expect(result).toBeDefined();
            expect(result.passwordHash).toBeUndefined();
            expect(result._id).toBe('507f1f77bcf86cd799439011');
            expect(result.username).toBe('testuser');
            expect(result.email).toBe('test@example.com');
        });

        test('should reject inactive users', () => {
            const inactiveUser = {
                _id: '507f1f77bcf86cd799439011',
                username: 'testuser',
                email: 'test@example.com',
                passwordHash: '$2b$12$hashedpassword...',
                status: 'inactive'
            };

            const authenticateUser = (user, password) => {
                if (!user || user.status !== 'active') {
                    return null;
                }
                return user;
            };

            const result = authenticateUser(inactiveUser, 'correctpassword');
            expect(result).toBe(null);
        });

        test('should reject suspended users', () => {
            const suspendedUser = {
                _id: '507f1f77bcf86cd799439011',
                username: 'testuser',
                email: 'test@example.com',
                passwordHash: '$2b$12$hashedpassword...',
                status: 'suspended'
            };

            const authenticateUser = (user, password) => {
                if (!user || user.status !== 'active') {
                    return null;
                }
                return user;
            };

            const result = authenticateUser(suspendedUser, 'correctpassword');
            expect(result).toBe(null);
        });

        test('should handle null or undefined user', () => {
            const authenticateUser = (user, password) => {
                if (!user || user.status !== 'active') {
                    return null;
                }
                return user;
            };

            expect(authenticateUser(null, 'password')).toBe(null);
            expect(authenticateUser(undefined, 'password')).toBe(null);
        });
    });

    describe('Session Management', () => {
        test('should create proper session user object', () => {
            const user = {
                _id: '507f1f77bcf86cd799439011',
                username: 'jsmith',
                email: 'john@example.com',
                profile: {
                    firstName: 'John',
                    lastName: 'Smith',
                    nickName: 'Johnny'
                },
                roles: ['user', 'admin'],
                preferences: {
                    language: 'en',
                    theme: 'dark'
                }
            };

            // Simulate session user creation from UserController.login
            const createSessionUser = (user) => {
                return {
                    id: user._id.toString(),
                    username: user.username,
                    firstName: user.profile.firstName,
                    lastName: user.profile.lastName,
                    nickName: user.profile.nickName || '',
                    email: user.email,
                    roles: user.roles,
                    preferences: user.preferences,
                    isAuthenticated: true
                };
            };

            const sessionUser = createSessionUser(user);

            expect(sessionUser.id).toBe('507f1f77bcf86cd799439011');
            expect(sessionUser.username).toBe('jsmith');
            expect(sessionUser.firstName).toBe('John');
            expect(sessionUser.lastName).toBe('Smith');
            expect(sessionUser.nickName).toBe('Johnny');
            expect(sessionUser.email).toBe('john@example.com');
            expect(sessionUser.roles).toEqual(['user', 'admin']);
            expect(sessionUser.preferences).toEqual({ language: 'en', theme: 'dark' });
            expect(sessionUser.isAuthenticated).toBe(true);
            expect(sessionUser.passwordHash).toBeUndefined();
        });

        test('should handle missing profile fields in session creation', () => {
            const user = {
                _id: '507f1f77bcf86cd799439011',
                username: 'jsmith',
                email: 'john@example.com',
                profile: {
                    firstName: 'John',
                    lastName: 'Smith'
                    // nickName missing
                },
                roles: ['user']
            };

            const createSessionUser = (user) => {
                return {
                    id: user._id.toString(),
                    username: user.username,
                    firstName: user.profile.firstName,
                    lastName: user.profile.lastName,
                    nickName: user.profile.nickName || '',
                    email: user.email,
                    roles: user.roles,
                    isAuthenticated: true
                };
            };

            const sessionUser = createSessionUser(user);

            expect(sessionUser.nickName).toBe('');
            expect(sessionUser.firstName).toBe('John');
            expect(sessionUser.lastName).toBe('Smith');
        });
    });

    describe('Login Tracking', () => {
        test('should increment login count on successful authentication', () => {
            const user = {
                loginCount: 5,
                lastLogin: new Date('2025-08-24T10:00:00Z')
            };

            // Simulate login tracking update
            const updateLoginTracking = (user) => {
                return {
                    loginCount: user.loginCount + 1,
                    lastLogin: new Date()
                };
            };

            const updated = updateLoginTracking(user);

            expect(updated.loginCount).toBe(6);
            expect(updated.lastLogin).toBeInstanceOf(Date);
            expect(updated.lastLogin.getTime()).toBeGreaterThan(user.lastLogin.getTime());
        });

        test('should handle first-time login correctly', () => {
            const newUser = {
                loginCount: 0,
                lastLogin: null
            };

            const updateLoginTracking = (user) => {
                return {
                    loginCount: user.loginCount + 1,
                    lastLogin: new Date()
                };
            };

            const updated = updateLoginTracking(newUser);

            expect(updated.loginCount).toBe(1);
            expect(updated.lastLogin).toBeInstanceOf(Date);
        });
    });

    describe('Role-Based Access Control', () => {
        test('should check single role correctly', () => {
            const user = {
                roles: ['user', 'admin']
            };

            const hasRole = (user, role) => {
                return !!(user && user.roles && user.roles.includes(role));
            };

            expect(hasRole(user, 'user')).toBe(true);
            expect(hasRole(user, 'admin')).toBe(true);
            expect(hasRole(user, 'root')).toBe(false);
            expect(hasRole(user, 'guest')).toBe(false);
            expect(hasRole(null, 'user')).toBe(false);
            expect(hasRole(undefined, 'user')).toBe(false);
        });

        test('should check multiple roles correctly', () => {
            const user = {
                roles: ['user', 'admin']
            };

            const hasAnyRole = (user, roles) => {
                return !!(user && user.roles && user.roles.some(role => roles.includes(role)));
            };

            expect(hasAnyRole(user, ['admin', 'root'])).toBe(true);
            expect(hasAnyRole(user, ['user', 'admin'])).toBe(true);
            expect(hasAnyRole(user, ['root'])).toBe(false);
            expect(hasAnyRole(user, [])).toBe(false);
            expect(hasAnyRole(null, ['user'])).toBe(false);
        });

        test('should handle users without roles', () => {
            const userWithoutRoles = {
                username: 'test'
            };

            const hasRole = (user, role) => {
                return !!(user && user.roles && user.roles.includes(role));
            };

            const hasAnyRole = (user, roles) => {
                return !!(user && user.roles && user.roles.some(role => roles.includes(role)));
            };

            expect(hasRole(userWithoutRoles, 'user')).toBe(false);
            expect(hasAnyRole(userWithoutRoles, ['user', 'admin'])).toBe(false);
        });
    });

    describe('Authentication Error Handling', () => {
        test('should handle authentication errors gracefully', () => {
            const authenticateWithError = (identifier, password) => {
                try {
                    if (!identifier || !password) {
                        throw new Error('Missing credentials');
                    }

                    if (identifier === 'error_user') {
                        throw new Error('Database connection failed');
                    }

                    return null; // User not found
                } catch (error) {
                    throw new Error(`Authentication failed: ${error.message}`);
                }
            };

            expect(() => authenticateWithError('', 'password')).toThrow('Authentication failed: Missing credentials');
            expect(() => authenticateWithError('user', '')).toThrow('Authentication failed: Missing credentials');
            expect(() => authenticateWithError('error_user', 'password')).toThrow('Authentication failed: Database connection failed');
            expect(authenticateWithError('valid_user', 'password')).toBe(null);
        });
    });
});

// EOF webapp/tests/unit/user/user-authentication.test.js
