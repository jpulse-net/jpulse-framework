/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Model / User Reserved Usernames
 * @tagline         Unit tests for W-134 reserved username validation
 * @description     Tests for reserved username validation in UserModel
 * @file            webapp/tests/unit/model/user-reserved-usernames.test.js
 * @version         1.6.10
 * @release         2026-02-07
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025-2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           90%, Cursor 2.3, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import { jest } from '@jest/globals';

// Mock database before importing UserModel
jest.mock('../../../database.js', () => ({
    default: {
        getDb: jest.fn(() => ({
            collection: jest.fn(() => ({
                findOne: jest.fn(),
                insertOne: jest.fn(),
                updateOne: jest.fn()
            }))
        }))
    }
}));

describe('W-134: UserModel Reserved Username Validation', () => {
    let UserModel;
    let originalConfig;

    beforeAll(async () => {
        // Set up minimal global config for the test
        if (!global.appConfig) {
            global.appConfig = {};
        }
        if (!global.appConfig.model) {
            global.appConfig.model = {};
        }
        if (!global.appConfig.model.user) {
            global.appConfig.model.user = {};
        }

        // Import UserModel after setting up config
        const { default: UserModelModule } = await import('../../../model/user.js');
        UserModel = UserModelModule;
    });

    beforeEach(() => {
        // Save original config
        originalConfig = global.appConfig?.model?.user?.reservedUsernames;

        // Set default reserved usernames
        global.appConfig.model.user.reservedUsernames = ['settings', 'me'];
    });

    afterEach(() => {
        // Restore original config
        if (originalConfig === undefined) {
            delete global.appConfig.model.user.reservedUsernames;
        } else {
            global.appConfig.model.user.reservedUsernames = originalConfig;
        }
    });

    describe('Reserved username validation on create', () => {
        test('should reject reserved username "settings"', () => {
            const data = {
                username: 'settings',
                email: 'test@example.com',
                passwordHash: 'hashedpassword'
            };

            expect(() => UserModel.validate(data, false)).toThrow();
            expect(() => UserModel.validate(data, false)).toThrow(/reserved/);
            expect(() => UserModel.validate(data, false)).toThrow(/settings/);
        });

        test('should reject reserved username "me"', () => {
            const data = {
                username: 'me',
                email: 'test@example.com',
                passwordHash: 'hashedpassword'
            };

            expect(() => UserModel.validate(data, false)).toThrow();
            expect(() => UserModel.validate(data, false)).toThrow(/reserved/);
            expect(() => UserModel.validate(data, false)).toThrow(/me/);
        });

        test('should reject reserved username case-insensitively (SETTINGS)', () => {
            const data = {
                username: 'SETTINGS',
                email: 'test@example.com',
                passwordHash: 'hashedpassword'
            };

            expect(() => UserModel.validate(data, false)).toThrow();
            expect(() => UserModel.validate(data, false)).toThrow(/reserved/);
            expect(() => UserModel.validate(data, false)).toThrow(/SETTINGS/);
        });

        test('should reject reserved username case-insensitively (Me)', () => {
            const data = {
                username: 'Me',
                email: 'test@example.com',
                passwordHash: 'hashedpassword'
            };

            expect(() => UserModel.validate(data, false)).toThrow();
            expect(() => UserModel.validate(data, false)).toThrow(/reserved/);
            expect(() => UserModel.validate(data, false)).toThrow(/Me/);
        });

        test('should reject reserved username case-insensitively (SeTtInGs)', () => {
            const data = {
                username: 'SeTtInGs',
                email: 'test@example.com',
                passwordHash: 'hashedpassword'
            };

            expect(() => UserModel.validate(data, false)).toThrow();
            expect(() => UserModel.validate(data, false)).toThrow(/reserved/);
            expect(() => UserModel.validate(data, false)).toThrow(/SeTtInGs/);
        });

        test('should allow non-reserved username', () => {
            const data = {
                username: 'johndoe',
                email: 'john@example.com',
                passwordHash: 'hashedpassword'
            };

            // Should not throw (validation passes)
            expect(() => UserModel.validate(data, false)).not.toThrow();
        });

        test('should allow username that contains reserved word but is not exact match', () => {
            const data = {
                username: 'settingsmanager',
                email: 'test@example.com',
                passwordHash: 'hashedpassword'
            };

            // Should not throw (validation passes, not exact match)
            expect(() => UserModel.validate(data, false)).not.toThrow();
        });

        test('should allow username that starts with reserved word', () => {
            const data = {
                username: 'megan',
                email: 'test@example.com',
                passwordHash: 'hashedpassword'
            };

            // Should not throw (validation passes, not exact match)
            expect(() => UserModel.validate(data, false)).not.toThrow();
        });
    });

    describe('Reserved username validation on update (grandfathered)', () => {
        test('should allow reserved username "settings" on update', () => {
            const data = {
                username: 'settings',
                email: 'test@example.com'
            };

            // Should not throw (grandfathered, isUpdate = true)
            expect(() => UserModel.validate(data, true)).not.toThrow();
        });

        test('should allow reserved username "me" on update', () => {
            const data = {
                username: 'me',
                email: 'test@example.com'
            };

            // Should not throw (grandfathered, isUpdate = true)
            expect(() => UserModel.validate(data, true)).not.toThrow();
        });

        test('should allow reserved username case variants on update', () => {
            const data = {
                username: 'SETTINGS',
                email: 'test@example.com'
            };

            // Should not throw (grandfathered, isUpdate = true)
            expect(() => UserModel.validate(data, true)).not.toThrow();
        });
    });

    describe('Custom reserved usernames configuration', () => {
        test('should use custom reserved usernames from config', () => {
            // Set custom reserved usernames
            global.appConfig.model.user.reservedUsernames = ['admin', 'root', 'system'];

            const data = {
                username: 'admin',
                email: 'test@example.com',
                passwordHash: 'hashedpassword'
            };

            expect(() => UserModel.validate(data, false)).toThrow();
            expect(() => UserModel.validate(data, false)).toThrow(/reserved/);
            expect(() => UserModel.validate(data, false)).toThrow(/admin/);
        });

        test('should allow previously reserved usernames if not in custom list', () => {
            // Set custom reserved usernames (not including 'settings' or 'me')
            global.appConfig.model.user.reservedUsernames = ['admin', 'root'];

            const data = {
                username: 'settings',
                email: 'test@example.com',
                passwordHash: 'hashedpassword'
            };

            // Should not throw (not in custom list)
            expect(() => UserModel.validate(data, false)).not.toThrow();
        });

        test('should handle empty reserved usernames array', () => {
            // Set empty reserved usernames array
            global.appConfig.model.user.reservedUsernames = [];

            const data = {
                username: 'settings',
                email: 'test@example.com',
                passwordHash: 'hashedpassword'
            };

            // Should not throw (empty list)
            expect(() => UserModel.validate(data, false)).not.toThrow();
        });

        test('should use default reserved usernames if config is undefined', () => {
            // Remove config
            delete global.appConfig.model.user.reservedUsernames;

            const data = {
                username: 'settings',
                email: 'test@example.com',
                passwordHash: 'hashedpassword'
            };

            // Should use default ['settings', 'me']
            expect(() => UserModel.validate(data, false)).toThrow();
            expect(() => UserModel.validate(data, false)).toThrow(/reserved/);
            expect(() => UserModel.validate(data, false)).toThrow(/settings/);
        });
    });

    describe('Reserved username validation with other validation errors', () => {
        test('should report reserved username error along with other errors', () => {
            const data = {
                username: 'settings',
                // email is missing (required field)
                passwordHash: 'hashedpassword'
            };

            // Should throw with both errors
            expect(() => UserModel.validate(data, false)).toThrow();
            expect(() => UserModel.validate(data, false)).toThrow(/reserved/);
            expect(() => UserModel.validate(data, false)).toThrow(/email/);
        });

        test('should report reserved username error even with invalid format', () => {
            const data = {
                username: 'me',
                email: 'invalid-email', // Invalid email format
                passwordHash: 'hashedpassword'
            };

            // Should throw with both errors
            expect(() => UserModel.validate(data, false)).toThrow();
            expect(() => UserModel.validate(data, false)).toThrow(/reserved/);
        });
    });

    describe('Error message format', () => {
        test('should include username in error message', () => {
            const data = {
                username: 'settings',
                email: 'test@example.com',
                passwordHash: 'hashedpassword'
            };

            expect(() => UserModel.validate(data, false)).toThrow(/settings/);
            expect(() => UserModel.validate(data, false)).toThrow(/reserved/);
            expect(() => UserModel.validate(data, false)).toThrow(/cannot be used/);
        });

        test('should preserve original case in error message', () => {
            const data = {
                username: 'SeTtInGs',
                email: 'test@example.com',
                passwordHash: 'hashedpassword'
            };

            expect(() => UserModel.validate(data, false)).toThrow(/SeTtInGs/); // Original case preserved
        });
    });
});

// EOF webapp/tests/unit/model/user-reserved-usernames.test.js
