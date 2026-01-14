/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Config / Config Model
 * @tagline         Unit tests for ConfigModel
 * @description     Tests for config model validation, CRUD operations, and inheritance
 * @file            webapp/tests/unit/config/config-model.test.js
 * @version         1.4.14
 * @release         2026-01-14
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.3, Claude Sonnet 4.5
 */

import ConfigModel from '../../../model/config.js';

describe('ConfigModel', () => {

    describe('Schema Validation', () => {
        test('should validate valid config data', () => {
            const validData = {
                _id: 'test-valid',
                data: {
                    email: {
                        adminEmail: 'admin@test.com',
                        adminName: 'Test Admin',
                        smtpServer: 'localhost',
                        smtpPort: 25,
                        smtpUser: 'testuser',
                        smtpPass: 'testpass',
                        useTls: false
                    },
                    broadcast: {
                        enable: true,
                        message: 'Test message',
                        nagTime: 4,
                        disableTime: 0
                    }
                }
            };

            expect(() => ConfigModel.validate(validData)).not.toThrow();
        });

        test('should reject invalid email format', () => {
            const invalidData = {
                _id: 'test-invalid-email',
                data: {
                    email: {
                        adminEmail: 'invalid-email'
                    }
                }
            };

            expect(() => ConfigModel.validate(invalidData))
                .toThrow('data.email.adminEmail must be a valid email format');
        });

        test('should reject invalid SMTP port', () => {
            const invalidData = {
                _id: 'test-invalid-port',
                data: {
                    email: {
                        smtpPort: 70000
                    }
                }
            };

            expect(() => ConfigModel.validate(invalidData))
                .toThrow('data.email.smtpPort must be a number between 1 and 65535');
        });

        test('should reject missing _id for create', () => {
            const invalidData = {
                data: {
                    email: {
                        adminEmail: 'test@example.com'
                    }
                }
            };

            expect(() => ConfigModel.validate(invalidData, false))
                .toThrow('_id is required and must be a string');
        });

        test('should allow missing _id for update', () => {
            const updateData = {
                data: {
                    email: {
                        adminEmail: 'test@example.com'
                    }
                }
            };

            expect(() => ConfigModel.validate(updateData, true)).not.toThrow();
        });
    });

    describe('Default Values', () => {
        test('should apply correct default values', () => {
            const data = { _id: 'test-defaults' };
            const result = ConfigModel.applyDefaults(data);

            expect(result.data.email.adminEmail).toBe('');
            expect(result.data.email.adminName).toBe('');
            expect(result.data.email.smtpServer).toBe('localhost');
            expect(result.data.email.smtpPort).toBe(25);
            expect(result.data.email.smtpUser).toBe('');
            expect(result.data.email.smtpPass).toBe('');
            expect(result.data.email.useTls).toBe(false);
            expect(result.data.broadcast.enable).toBe(false);
            expect(result.data.broadcast.message).toBe('');
            expect(result.data.broadcast.nagTime).toBe(4);
            expect(result.data.broadcast.disableTime).toBe(0);
            expect(result.data.broadcast.enabledAt).toBeNull();
            expect(result.parent).toBeNull();
            expect(result.updatedBy).toBe('');
            expect(result.docVersion).toBe(1);
        });

        test('should preserve existing values when applying defaults', () => {
            const data = {
                _id: 'test-preserve',
                data: {
                    email: {
                        adminEmail: 'existing@test.com',
                        smtpPort: 587
                    }
                }
            };
            const result = ConfigModel.applyDefaults(data);

            expect(result.data.email.adminEmail).toBe('existing@test.com');
            expect(result.data.email.smtpPort).toBe(587);
            expect(result.data.email.smtpServer).toBe('localhost'); // default applied
        });
    });

    describe('Email Validation', () => {
        test('should validate correct email formats', () => {
            expect(ConfigModel.isValidEmail('test@example.com')).toBe(true);
            expect(ConfigModel.isValidEmail('user.name@domain.co.uk')).toBe(true);
            expect(ConfigModel.isValidEmail('admin@test.org')).toBe(true);
        });

        test('should reject invalid email formats', () => {
            expect(ConfigModel.isValidEmail('invalid-email')).toBe(false);
            expect(ConfigModel.isValidEmail('test@')).toBe(false);
            expect(ConfigModel.isValidEmail('@domain.com')).toBe(false);
            expect(ConfigModel.isValidEmail('admin+test@localhost')).toBe(false); // no TLD
        });

        test('should allow empty email', () => {
            expect(ConfigModel.isValidEmail('')).toBe(true);
            expect(ConfigModel.isValidEmail(null)).toBe(true);
            expect(ConfigModel.isValidEmail(undefined)).toBe(true);
        });
    });

    describe('Broadcast Validation', () => {
        test('should validate valid broadcast config', () => {
            const validData = {
                _id: 'test-broadcast',
                data: {
                    broadcast: {
                        enable: true,
                        message: 'Test message',
                        nagTime: 4,
                        disableTime: 24,
                        enabledAt: new Date()
                    }
                }
            };

            expect(() => ConfigModel.validate(validData)).not.toThrow();
        });

        test('should reject invalid broadcast.enable type', () => {
            const invalidData = {
                _id: 'test-invalid',
                data: {
                    broadcast: {
                        enable: 'true' // should be boolean
                    }
                }
            };

            expect(() => ConfigModel.validate(invalidData))
                .toThrow('data.broadcast.enable must be a boolean');
        });

        test('should reject invalid broadcast.message type', () => {
            const invalidData = {
                _id: 'test-invalid',
                data: {
                    broadcast: {
                        message: 123 // should be string
                    }
                }
            };

            expect(() => ConfigModel.validate(invalidData))
                .toThrow('data.broadcast.message must be a string');
        });

        test('should reject negative nagTime', () => {
            const invalidData = {
                _id: 'test-invalid',
                data: {
                    broadcast: {
                        nagTime: -1
                    }
                }
            };

            expect(() => ConfigModel.validate(invalidData))
                .toThrow('data.broadcast.nagTime must be a number >= 0');
        });

        test('should reject negative disableTime', () => {
            const invalidData = {
                _id: 'test-invalid',
                data: {
                    broadcast: {
                        disableTime: -1
                    }
                }
            };

            expect(() => ConfigModel.validate(invalidData))
                .toThrow('data.broadcast.disableTime must be a number >= 0');
        });

        test('should reject invalid enabledAt type', () => {
            const invalidData = {
                _id: 'test-invalid',
                data: {
                    broadcast: {
                        enabledAt: '2025-01-18' // should be Date or null
                    }
                }
            };

            expect(() => ConfigModel.validate(invalidData))
                .toThrow('data.broadcast.enabledAt must be a Date object or null');
        });
    });

});

// EOF webapp/tests/unit/config/config-model.test.js
