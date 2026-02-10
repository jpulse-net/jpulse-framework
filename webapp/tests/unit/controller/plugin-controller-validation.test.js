/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Plugin Validation
 * @tagline         Unit tests for PluginController._validatePluginName() security function
 * @description     Tests plugin name validation to prevent path traversal attacks
 * @file            webapp/tests/unit/controller/plugin-controller-validation.test.js
 * @version         1.6.12
 * @release         2026-02-09
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.2, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeAll, jest } from '@jest/globals';

// Import the controller
let PluginController;

describe('PluginController._validatePluginName() - Path Traversal Prevention', () => {

    beforeAll(async () => {
        // Mock global.i18n for translation support
        global.i18n = {
            translate: jest.fn((req, key, context = {}) => {
                const translations = {
                    'controller.plugin.validation.nameRequired': 'Plugin name is required',
                    'controller.plugin.validation.nameInvalid': `Invalid plugin name: ${context.name || 'unknown'}`
                };
                return translations[key] || key;
            })
        };

        // Import controller after mocking
        PluginController = (await import('../../../controller/plugin.js')).default;
    });

    // Mock request object for i18n
    const mockReq = {};

    describe('Valid Plugin Names', () => {
        test('should accept simple lowercase name', () => {
            const result = PluginController._validatePluginName('myplugin', mockReq);
            expect(result).toBe('myplugin');
        });

        test('should accept name with hyphens', () => {
            const result = PluginController._validatePluginName('my-plugin', mockReq);
            expect(result).toBe('my-plugin');
        });

        test('should accept name with multiple hyphens', () => {
            const result = PluginController._validatePluginName('my-awesome-plugin', mockReq);
            expect(result).toBe('my-awesome-plugin');
        });

        test('should accept name with numbers', () => {
            const result = PluginController._validatePluginName('plugin123', mockReq);
            expect(result).toBe('plugin123');
        });

        test('should accept name starting with letter followed by numbers', () => {
            const result = PluginController._validatePluginName('plugin2024', mockReq);
            expect(result).toBe('plugin2024');
        });

        test('should accept name with letters, numbers and hyphens', () => {
            const result = PluginController._validatePluginName('my-plugin-v2', mockReq);
            expect(result).toBe('my-plugin-v2');
        });

        test('should accept single character name', () => {
            const result = PluginController._validatePluginName('a', mockReq);
            expect(result).toBe('a');
        });

        test('should accept very long valid name', () => {
            const longName = 'very-long-plugin-name-with-many-words-and-hyphens-123';
            const result = PluginController._validatePluginName(longName, mockReq);
            expect(result).toBe(longName);
        });

        test('should accept real-world plugin names', () => {
            expect(PluginController._validatePluginName('hello-world', mockReq)).toBe('hello-world');
            expect(PluginController._validatePluginName('auth-mfa', mockReq)).toBe('auth-mfa');
            expect(PluginController._validatePluginName('analytics', mockReq)).toBe('analytics');
            expect(PluginController._validatePluginName('payment-gateway', mockReq)).toBe('payment-gateway');
        });
    });

    describe('Path Traversal Attack Prevention', () => {
        test('should reject path with parent directory reference', () => {
            expect(() => {
                PluginController._validatePluginName('../etc/passwd', mockReq);
            }).toThrow();
        });

        test('should reject double parent directory reference', () => {
            expect(() => {
                PluginController._validatePluginName('../../secret', mockReq);
            }).toThrow();
        });

        test('should reject path with multiple parent references', () => {
            expect(() => {
                PluginController._validatePluginName('../../../root', mockReq);
            }).toThrow();
        });

        test('should reject path with parent reference in middle', () => {
            expect(() => {
                PluginController._validatePluginName('plugin/../config', mockReq);
            }).toThrow();
        });

        test('should reject absolute path', () => {
            expect(() => {
                PluginController._validatePluginName('/etc/passwd', mockReq);
            }).toThrow();
        });

        test('should reject path with forward slashes', () => {
            expect(() => {
                PluginController._validatePluginName('plugin/subdir', mockReq);
            }).toThrow();
        });

        test('should reject path with backslashes', () => {
            expect(() => {
                PluginController._validatePluginName('plugin\\subdir', mockReq);
            }).toThrow();
        });

        test('should reject current directory reference', () => {
            expect(() => {
                PluginController._validatePluginName('./plugin', mockReq);
            }).toThrow();
        });

        test('should reject hidden file reference', () => {
            expect(() => {
                PluginController._validatePluginName('.hidden', mockReq);
            }).toThrow();
        });

        test('should reject name starting with dot', () => {
            expect(() => {
                PluginController._validatePluginName('.config', mockReq);
            }).toThrow();
        });
    });

    describe('Invalid Characters', () => {
        test('should reject uppercase letters', () => {
            expect(() => {
                PluginController._validatePluginName('MyPlugin', mockReq);
            }).toThrow();
        });

        test('should reject mixed case', () => {
            expect(() => {
                PluginController._validatePluginName('myPlugin', mockReq);
            }).toThrow();
        });

        test('should reject underscores', () => {
            expect(() => {
                PluginController._validatePluginName('my_plugin', mockReq);
            }).toThrow();
        });

        test('should reject spaces', () => {
            expect(() => {
                PluginController._validatePluginName('my plugin', mockReq);
            }).toThrow();
        });

        test('should reject special characters (@)', () => {
            expect(() => {
                PluginController._validatePluginName('plugin@name', mockReq);
            }).toThrow();
        });

        test('should reject special characters (#)', () => {
            expect(() => {
                PluginController._validatePluginName('plugin#name', mockReq);
            }).toThrow();
        });

        test('should reject special characters ($)', () => {
            expect(() => {
                PluginController._validatePluginName('plugin$name', mockReq);
            }).toThrow();
        });

        test('should reject special characters (%)', () => {
            expect(() => {
                PluginController._validatePluginName('plugin%name', mockReq);
            }).toThrow();
        });

        test('should reject special characters (&)', () => {
            expect(() => {
                PluginController._validatePluginName('plugin&name', mockReq);
            }).toThrow();
        });

        test('should reject special characters (*)', () => {
            expect(() => {
                PluginController._validatePluginName('plugin*', mockReq);
            }).toThrow();
        });

        test('should reject special characters (+)', () => {
            expect(() => {
                PluginController._validatePluginName('plugin+name', mockReq);
            }).toThrow();
        });

        test('should reject special characters (=)', () => {
            expect(() => {
                PluginController._validatePluginName('plugin=name', mockReq);
            }).toThrow();
        });

        test('should reject brackets', () => {
            expect(() => {
                PluginController._validatePluginName('plugin[name]', mockReq);
            }).toThrow();
        });

        test('should reject braces', () => {
            expect(() => {
                PluginController._validatePluginName('plugin{name}', mockReq);
            }).toThrow();
        });

        test('should reject parentheses', () => {
            expect(() => {
                PluginController._validatePluginName('plugin(name)', mockReq);
            }).toThrow();
        });

        test('should reject pipe character', () => {
            expect(() => {
                PluginController._validatePluginName('plugin|name', mockReq);
            }).toThrow();
        });

        test('should reject semicolon', () => {
            expect(() => {
                PluginController._validatePluginName('plugin;name', mockReq);
            }).toThrow();
        });

        test('should reject colon', () => {
            expect(() => {
                PluginController._validatePluginName('plugin:name', mockReq);
            }).toThrow();
        });

        test('should reject quotes', () => {
            expect(() => {
                PluginController._validatePluginName('plugin"name', mockReq);
            }).toThrow();
        });

        test('should reject single quotes', () => {
            expect(() => {
                PluginController._validatePluginName("plugin'name", mockReq);
            }).toThrow();
        });

        test('should reject backticks', () => {
            expect(() => {
                PluginController._validatePluginName('plugin`name', mockReq);
            }).toThrow();
        });

        test('should reject angle brackets', () => {
            expect(() => {
                PluginController._validatePluginName('plugin<name>', mockReq);
            }).toThrow();
        });

        test('should reject question mark', () => {
            expect(() => {
                PluginController._validatePluginName('plugin?', mockReq);
            }).toThrow();
        });

        test('should reject comma', () => {
            expect(() => {
                PluginController._validatePluginName('plugin,name', mockReq);
            }).toThrow();
        });
    });

    describe('Invalid Name Formats', () => {
        test('should reject name starting with hyphen', () => {
            expect(() => {
                PluginController._validatePluginName('-plugin', mockReq);
            }).toThrow();
        });

        test('should accept name starting with number', () => {
            // Note: The regex ^[a-z0-9][a-z0-9-]*$ ALLOWS starting with number
            const result = PluginController._validatePluginName('123plugin', mockReq);
            expect(result).toBe('123plugin');
        });

        test('should reject empty string', () => {
            expect(() => {
                PluginController._validatePluginName('', mockReq);
            }).toThrow('Plugin name is required');
        });

        test('should reject null', () => {
            expect(() => {
                PluginController._validatePluginName(null, mockReq);
            }).toThrow('Plugin name is required');
        });

        test('should reject undefined', () => {
            expect(() => {
                PluginController._validatePluginName(undefined, mockReq);
            }).toThrow('Plugin name is required');
        });

        test('should reject number', () => {
            expect(() => {
                PluginController._validatePluginName(123, mockReq);
            }).toThrow('Plugin name is required');
        });

        test('should reject object', () => {
            expect(() => {
                PluginController._validatePluginName({ name: 'plugin' }, mockReq);
            }).toThrow('Plugin name is required');
        });

        test('should reject array', () => {
            expect(() => {
                PluginController._validatePluginName(['plugin'], mockReq);
            }).toThrow('Plugin name is required');
        });

        test('should reject boolean', () => {
            expect(() => {
                PluginController._validatePluginName(true, mockReq);
            }).toThrow('Plugin name is required');
        });
    });

    describe('URL Encoding Attack Prevention', () => {
        test('should reject URL encoded dots', () => {
            expect(() => {
                PluginController._validatePluginName('%2e%2e%2fpasswd', mockReq);
            }).toThrow();
        });

        test('should reject URL encoded slashes', () => {
            expect(() => {
                PluginController._validatePluginName('plugin%2fname', mockReq);
            }).toThrow();
        });

        test('should reject double URL encoding', () => {
            expect(() => {
                PluginController._validatePluginName('%252e%252e%252f', mockReq);
            }).toThrow();
        });
    });

    describe('Edge Cases', () => {
        test('should reject whitespace only', () => {
            expect(() => {
                PluginController._validatePluginName('   ', mockReq);
            }).toThrow();
        });

        test('should reject tab characters', () => {
            expect(() => {
                PluginController._validatePluginName('plugin\tname', mockReq);
            }).toThrow();
        });

        test('should reject newline characters', () => {
            expect(() => {
                PluginController._validatePluginName('plugin\nname', mockReq);
            }).toThrow();
        });

        test('should reject carriage return', () => {
            expect(() => {
                PluginController._validatePluginName('plugin\rname', mockReq);
            }).toThrow();
        });

        test('should reject null byte', () => {
            expect(() => {
                PluginController._validatePluginName('plugin\x00name', mockReq);
            }).toThrow();
        });

        test('should reject unicode characters', () => {
            expect(() => {
                PluginController._validatePluginName('plügïn', mockReq);
            }).toThrow();
        });

        test('should reject emoji', () => {
            expect(() => {
                PluginController._validatePluginName('plugin😀', mockReq);
            }).toThrow();
        });

        test('should reject chinese characters', () => {
            expect(() => {
                PluginController._validatePluginName('插件', mockReq);
            }).toThrow();
        });
    });

    describe('Real-World Attack Scenarios', () => {
        test('should reject common path traversal patterns', () => {
            const attacks = [
                '../../../../../etc/passwd',
                '..\\..\\..\\windows\\system32',
                './../config',
                'plugin/../../secret',
                '/var/www/config',
                'c:\\windows\\system32',
                '../../.ssh/id_rsa',
                '../.env',
                '~/.bashrc',
                '/etc/hosts'
            ];

            attacks.forEach(attack => {
                expect(() => {
                    PluginController._validatePluginName(attack, mockReq);
                }).toThrow();
            });
        });

        test('should reject command injection attempts', () => {
            const attacks = [
                'plugin;rm -rf /',
                'plugin|cat /etc/passwd',
                'plugin&whoami',
                'plugin$(whoami)',
                'plugin`whoami`'
            ];

            attacks.forEach(attack => {
                expect(() => {
                    PluginController._validatePluginName(attack, mockReq);
                }).toThrow();
            });
        });

        test('should reject SQL injection patterns', () => {
            const attacks = [
                "plugin' OR '1'='1",
                'plugin"; DROP TABLE users--',
                "plugin' UNION SELECT * FROM passwords--"
            ];

            attacks.forEach(attack => {
                expect(() => {
                    PluginController._validatePluginName(attack, mockReq);
                }).toThrow();
            });
        });
    });

    describe('Error Messages', () => {
        test('should provide appropriate error message for invalid name', () => {
            try {
                PluginController._validatePluginName('../etc/passwd', mockReq);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('Invalid plugin name');
                expect(error.message).toContain('../etc/passwd');
            }
        });

        test('should provide appropriate error message for missing name', () => {
            try {
                PluginController._validatePluginName(null, mockReq);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('required');
            }
        });
    });
});

// EOF webapp/tests/unit/controller/plugin-controller-validation.test.js
