/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Config / Config Model
 * @tagline         Unit tests for ConfigModel
 * @description     Tests for config model validation, CRUD operations, and inheritance
 * @file            webapp/tests/unit/config/config-model.test.js
 * @version         1.7.15
 * @release         2026-08-15
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.15, Grok 4.6
 */

import { jest } from '@jest/globals';
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

    describe('W-147 data.general validation', () => {
        test('should validate valid general (roles and adminRoles)', () => {
            const validData = {
                _id: 'test-general',
                data: {
                    general: {
                        roles: ['user', 'admin', 'root'],
                        adminRoles: ['admin', 'root']
                    }
                }
            };
            expect(() => ConfigModel.validate(validData)).not.toThrow();
        });

        test('should reject adminRoles not a subset of roles', () => {
            const invalidData = {
                _id: 'test-general',
                data: {
                    general: {
                        roles: ['user', 'admin'],
                        adminRoles: ['admin', 'root']
                    }
                }
            };
            expect(() => ConfigModel.validate(invalidData))
                .toThrow('data.general.adminRoles must be a subset of data.general.roles');
        });

        test('should reject data.general.roles when not an array', () => {
            const invalidData = {
                _id: 'test-general',
                data: {
                    general: {
                        roles: 'admin,root',
                        adminRoles: ['admin']
                    }
                }
            };
            expect(() => ConfigModel.validate(invalidData))
                .toThrow('data.general.roles must be an array');
        });

        test('should reject data.general.adminRoles when not an array', () => {
            const invalidData = {
                _id: 'test-general',
                data: {
                    general: {
                        roles: ['user', 'admin'],
                        adminRoles: 'admin'
                    }
                }
            };
            expect(() => ConfigModel.validate(invalidData))
                .toThrow('data.general.adminRoles must be an array');
        });
    });

    describe('Response sanitization (_sanitizeForResponse)', () => {
        test('should obfuscate contextFilter.withoutAuth paths', () => {
            const doc = {
                _id: 'global',
                data: {
                    email: {
                        adminEmail: 'admin@example.com',
                        smtpServer: 'smtp.example.com',
                        smtpPort: 587,
                        smtpUser: 'user',
                        smtpPass: 'secret'
                    },
                    manifest: {
                        license: { key: 'license-key-123', tier: 'bsl' }
                    }
                }
            };
            const out = ConfigModel._sanitizeForResponse(doc);

            expect(out.data.email.smtpServer).toBe('********');
            expect(out.data.email.smtpPort).toBe(9999);
            expect(typeof out.data.email.smtpPort).toBe('number');
            expect(out.data.email.smtpUser).toBe('********');
            expect(out.data.email.smtpPass).toBe('********');
            expect(out.data.manifest.license.key).toBe('********');
            expect(out.data.email.adminEmail).toBe('admin@example.com');
            expect(out.data.manifest.license.tier).toBe('bsl');
            expect(doc.data.email.smtpPass).toBe('secret');
        });
    });

    describe('W-210 sensitive fields', () => {
        test('normalizeSensitivePath accepts UI and document paths', () => {
            expect(ConfigModel.normalizeSensitivePath('email.smtpPass')).toBe('data.email.smtpPass');
            expect(ConfigModel.normalizeSensitivePath('data.email.smtpPass')).toBe('data.email.smtpPass');
            expect(ConfigModel.normalizeSensitivePath('  email.smtpPass  ')).toBe('data.email.smtpPass');
            expect(ConfigModel.normalizeSensitivePath('')).toBe('');
            expect(ConfigModel.toDisplayPath('data.email.smtpPass')).toBe('email.smtpPass');
            expect(ConfigModel.toDisplayPath('email.smtpPass')).toBe('email.smtpPass');
        });

        test('getSensitivePaths includes password fields from the base schema', () => {
            const paths = ConfigModel.getSensitivePaths();
            expect(paths).toContain('data.email.smtpPass');
            expect(paths).toContain('data.manifest.license.key');
            expect(paths).not.toContain('data.email.smtpServer');
            expect(paths).not.toContain('data.email.smtpUser');
        });

        test('isSensitiveField honors password, explicit flag, and the false escape hatch', () => {
            expect(ConfigModel.isSensitiveField({ inputType: 'password' })).toBe(true);
            expect(ConfigModel.isSensitiveField({ inputType: 'password', sensitive: false })).toBe(false);
            expect(ConfigModel.isSensitiveField({ type: 'string', sensitive: true })).toBe(true);
            expect(ConfigModel.isSensitiveField({ type: 'string' })).toBe(false);
        });

        test('maskSensitive replaces set secrets and leaves empty ones', () => {
            const doc = {
                _id: 'global',
                data: {
                    email: { smtpPass: 'secret', smtpServer: 'localhost' },
                    manifest: { license: { key: '', tier: 'bsl' } }
                }
            };
            const out = ConfigModel.maskSensitive(doc);
            expect(out.data.email.smtpPass).toBe(ConfigModel.SENSITIVE_MASK);
            expect(out.data.manifest.license.key).toBe('');
            expect(out.data.email.smtpServer).toBe('localhost');
            expect(out.data.manifest.license.tier).toBe('bsl');
            expect(doc.data.email.smtpPass).toBe('secret');
        });

        test('stripMaskEchoes drops a submitted mask and keeps a real value', () => {
            const data = {
                data: {
                    email: { smtpPass: ConfigModel.SENSITIVE_MASK, smtpServer: 'smtp.example.com' },
                    manifest: { license: { key: 'new-key' } }
                }
            };
            ConfigModel.stripMaskEchoes(data);
            expect(data.data.email.smtpPass).toBeUndefined();
            expect(data.data.email.smtpServer).toBe('smtp.example.com');
            expect(data.data.manifest.license.key).toBe('new-key');
        });

        test('initializeSchema picks up a sensitive field from extendSchema', () => {
            const savedExtensions = ConfigModel.schemaExtensions.slice();
            const savedSchema = ConfigModel.schema;
            const savedPaths = ConfigModel._sensitivePaths;
            try {
                ConfigModel.schemaExtensions.length = 0;
                ConfigModel.extendSchema({
                    ai: {
                        apiKey: { type: 'string', inputType: 'password', default: '' }
                    }
                });
                ConfigModel.initializeSchema();
                expect(ConfigModel.getSensitivePaths()).toContain('data.ai.apiKey');
                expect(ConfigModel.getSensitivePaths()).toContain('data.email.smtpPass');
            } finally {
                ConfigModel.schemaExtensions.length = 0;
                savedExtensions.forEach((ext) => ConfigModel.schemaExtensions.push(ext));
                ConfigModel.schema = savedSchema;
                ConfigModel._sensitivePaths = savedPaths;
            }
        });

        test('updateById does not $set a mask echo, so the stored secret is preserved', async () => {
            const findSpy = jest.spyOn(ConfigModel, 'findById').mockResolvedValue({
                _id: 'global',
                saveCount: 1,
                data: { email: { smtpPass: 'stored-secret' } }
            });
            const updateOne = jest.fn(async () => ({ matchedCount: 1 }));
            const collSpy = jest.spyOn(ConfigModel, 'getCollection').mockReturnValue({ updateOne });
            try {
                await ConfigModel.updateById('global', {
                    data: {
                        email: {
                            smtpPass: ConfigModel.SENSITIVE_MASK,
                            smtpServer: 'smtp.example.com'
                        }
                    }
                });

                const setOp = updateOne.mock.calls[0][1].$set;
                expect(setOp['data.email.smtpPass']).toBeUndefined();
                expect(setOp['data.email.smtpServer']).toBe('smtp.example.com');
            } finally {
                findSpy.mockRestore();
                collSpy.mockRestore();
            }
        });

        test('updateById $sets an empty smtpPass so a deliberate clear is stored', async () => {
            const findSpy = jest.spyOn(ConfigModel, 'findById').mockResolvedValue({
                _id: 'global',
                saveCount: 1,
                data: { email: { smtpPass: 'stored-secret' } }
            });
            const updateOne = jest.fn(async () => ({ matchedCount: 1 }));
            const collSpy = jest.spyOn(ConfigModel, 'getCollection').mockReturnValue({ updateOne });
            try {
                await ConfigModel.updateById('global', {
                    data: { email: { smtpPass: '' } }
                });

                expect(updateOne.mock.calls[0][1].$set['data.email.smtpPass']).toBe('');
            } finally {
                findSpy.mockRestore();
                collSpy.mockRestore();
            }
        });
    });

});

// EOF webapp/tests/unit/config/config-model.test.js
