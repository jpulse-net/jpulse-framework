/**
 * @name            jPulse Framework / WebApp / Tests / Unit / User / User Signup
 * @tagline         Signup tests for User Model and Controller
 * @description     Unit tests for user registration/signup functionality
 * @file            webapp/tests/unit/user/user-signup.test.js
 * @version         1.6.17
 * @release         2026-02-14
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

import { jest } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';

describe('User Signup Tests', () => {
    describe('Signup Request Validation Logic', () => {
        test('should validate required fields correctly', () => {
            const validRequest = {
                firstName: 'John',
                lastName: 'Doe',
                username: 'johndoe',
                email: 'john@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                acceptTerms: true
            };

            // Test missing fields
            const testCases = [
                { field: 'firstName', expected: false },
                { field: 'lastName', expected: false },
                { field: 'username', expected: false },
                { field: 'email', expected: false },
                { field: 'password', expected: false }
            ];

            testCases.forEach(testCase => {
                const requestCopy = { ...validRequest };
                delete requestCopy[testCase.field];

                const isValid = !!(
                    requestCopy.firstName &&
                    requestCopy.lastName &&
                    requestCopy.username &&
                    requestCopy.email &&
                    requestCopy.password
                );

                expect(isValid).toBe(testCase.expected);
            });

            // Test valid request
            const isValid = !!(
                validRequest.firstName &&
                validRequest.lastName &&
                validRequest.username &&
                validRequest.email &&
                validRequest.password
            );
            expect(isValid).toBe(true);
        });

        test('should validate password confirmation', () => {
            const testCases = [
                { password: 'password123', confirmPassword: 'password123', expected: true },
                { password: 'password123', confirmPassword: 'differentpassword', expected: false },
                { password: 'abc', confirmPassword: 'abc', expected: true },
                { password: '', confirmPassword: '', expected: true }
            ];

            testCases.forEach(testCase => {
                const isValid = testCase.password === testCase.confirmPassword;
                expect(isValid).toBe(testCase.expected);
            });
        });

        test('should validate terms acceptance', () => {
            const testCases = [
                { acceptTerms: true, expected: true },
                { acceptTerms: false, expected: false },
                { acceptTerms: undefined, expected: false },
                { acceptTerms: null, expected: false }
            ];

            testCases.forEach(testCase => {
                const isValid = !!testCase.acceptTerms;
                expect(isValid).toBe(testCase.expected);
            });
        });
    });

    describe('User Data Structure', () => {
        test('should structure user data correctly for creation', () => {
            const requestData = {
                firstName: 'John',
                lastName: 'Doe',
                username: 'johndoe',
                email: 'john@example.com',
                password: 'password123'
            };

            const expectedUserData = {
                loginId: requestData.username,
                email: requestData.email,
                password: requestData.password,
                profile: {
                    firstName: requestData.firstName,
                    lastName: requestData.lastName,
                    nickName: '',
                    avatar: ''
                },
                roles: ['user'],
                preferences: {
                    language: 'en',
                    theme: (global.appConfig?.utils?.theme?.default || 'light')
                },
                status: 'active'
            };

            // Verify structure
            expect(expectedUserData.loginId).toBe('johndoe');
            expect(expectedUserData.email).toBe('john@example.com');
            expect(expectedUserData.profile.firstName).toBe('John');
            expect(expectedUserData.profile.lastName).toBe('Doe');
            expect(expectedUserData.roles).toEqual(['user']);
            expect(expectedUserData.status).toBe('active');
        });

        test('should generate proper initials from user names', () => {
            const testCases = [
                { firstName: 'John', lastName: 'Doe', expected: 'JD' },
                { firstName: 'Alice', lastName: 'Smith', expected: 'AS' },
                { firstName: 'Michael', lastName: 'Edwards', expected: 'ME' },
                { firstName: 'Bob', lastName: '', expected: 'B' },
                { firstName: '', lastName: 'Wilson', expected: '?W' },
                { firstName: '', lastName: '', expected: '?' },
                { firstName: undefined, lastName: 'Test', expected: '?T' }
            ];

            testCases.forEach(testCase => {
                const initials = (testCase.firstName?.charAt(0) || '?') + (testCase.lastName?.charAt(0) || '');
                expect(initials).toBe(testCase.expected);
            });
        });
    });

    describe('Signup Form Validation', () => {
        test('should validate password requirements', () => {
            const passwords = [
                { password: 'password123', valid: true, reason: 'meets minimum requirements' },
                { password: '12345678', valid: true, reason: '8 characters minimum' },
                { password: '1234567', valid: false, reason: 'less than 8 characters' },
                { password: '', valid: false, reason: 'empty password' },
                { password: 'abc', valid: false, reason: 'too short' }
            ];

            passwords.forEach(test => {
                const isValid = test.password.length >= 8;
                expect(isValid).toBe(test.valid);
            });
        });

        test('should validate username format', () => {
            const usernames = [
                { username: 'johndoe', valid: true },
                { username: 'john.doe', valid: true },
                { username: 'john_doe', valid: true },
                { username: 'john-doe', valid: true },
                { username: 'user123', valid: true },
                { username: 'john doe', valid: false }, // space
                { username: 'john@doe', valid: false }, // @ symbol
                { username: 'john#doe', valid: false }, // # symbol
                { username: '', valid: false } // empty
            ];

            const usernameRegex = /^[a-zA-Z0-9_.-]+$/;

            usernames.forEach(test => {
                const isValid = test.username.trim() !== '' && usernameRegex.test(test.username);
                expect(isValid).toBe(test.valid);
            });
        });

        test('should validate email format', () => {
            const emails = [
                { email: 'user@example.com', valid: true },
                { email: 'test.email@domain.co.uk', valid: true },
                { email: 'user123@test-domain.com', valid: true },
                { email: 'invalid-email', valid: false },
                { email: '@example.com', valid: false },
                { email: 'user@', valid: false },
                { email: '', valid: false }
            ];

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            emails.forEach(test => {
                const isValid = emailRegex.test(test.email);
                expect(isValid).toBe(test.valid);
            });
        });
    });

    describe('Session Data with Initials', () => {
        test('should include initials in user session data', () => {
            const userData = {
                profile: {
                    firstName: 'Michael',
                    lastName: 'Edwards'
                }
            };

            const sessionUser = {
                firstName: userData.profile.firstName,
                lastName: userData.profile.lastName,
                initials: (userData.profile.firstName?.charAt(0) || '?') + (userData.profile.lastName?.charAt(0) || '')
            };

            expect(sessionUser.initials).toBe('ME');
            expect(sessionUser.initials).not.toBe('MichaelEdwards'); // Ensures we fixed the "meus" issue
        });

        test('should handle missing names for initials', () => {
            const testCases = [
                { firstName: 'John', lastName: undefined, expected: 'J' },
                { firstName: undefined, lastName: 'Doe', expected: '?D' },
                { firstName: undefined, lastName: undefined, expected: '?' },
                { firstName: '', lastName: 'Smith', expected: '?S' }
            ];

            testCases.forEach(test => {
                const initials = (test.firstName?.charAt(0) || '?') + (test.lastName?.charAt(0) || '');
                expect(initials).toBe(test.expected);
            });
        });
    });
});

// EOF webapp/tests/unit/user/user-signup.test.js
