/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Config / App Config
 * @tagline         Unit tests for application configuration loading
 * @description     Tests for app.conf configuration loading functionality
 * @file            webapp/tests/unit/config/app-config.test.js
 * @version         0.4.10
 * @release         2025-09-06
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import { TestUtils } from '../../helpers/test-utils.js';

describe('App Configuration Loading', () => {
    let originalReadFileSync;
    let mockFiles;

    beforeEach(() => {
        // Set up file system mocks
        originalReadFileSync = fs.readFileSync;
        mockFiles = {};
    });

    afterEach(() => {
        // Restore file system
        fs.readFileSync = originalReadFileSync;

        // Clear module cache
        jest.resetModules();
    });

    describe('Configuration File Loading', () => {
        test('should load valid configuration file successfully', async () => {
            const validConfig = `{
                app: {
                    version: '1.0.0',
                    release: '2025-01-27'
                },
                deployment: {
                    mode: 'dev',
                    dev: {
                        name: 'development',
                        db: 'bubble_dev',
                        port: 8080
                    }
                },
                i18n: {
                    default: 'en'
                }
            }`;

            const config = await TestUtils.loadTestConfig(
                TestUtils.createTempFile(validConfig, '.conf')
            );

            expect(config).toBeDefined();
            expect(config.app.version).toBe('1.0.0');
            expect(config.deployment.mode).toBe('dev');
            expect(config.deployment.dev.port).toBe(8080);
            expect(config.i18n.default).toBe('en');
        });

        test('should handle configuration with comments', async () => {
            const configWithComments = `{
                // Application settings
                app: {
                    version: '1.0.0',
                    release: '2025-01-27'
                },
                /* Deployment configuration */
                deployment: {
                    mode: 'dev', // Development mode
                    dev: {
                        name: 'development',
                        port: 8080
                    }
                }
            }`;

            const config = await TestUtils.loadTestConfig(
                TestUtils.createTempFile(configWithComments, '.conf')
            );

            expect(config.app.version).toBe('1.0.0');
            expect(config.deployment.dev.port).toBe(8080);
        });

        test('should handle complex nested configuration', async () => {
            const complexConfig = `{
                database: {
                    mode: 'standalone',
                    standalone: {
                        url: 'mongodb://localhost:27017/%DB%',
                        options: {
                            serverSelectionTimeoutMS: 5000,
                            socketTimeoutMS: 45000,
                            connectTimeoutMS: 20000,
                            maxPoolSize: 10,
                            minPoolSize: 1,
                            maxIdleTimeMS: 30000
                        }
                    },
                    replicaSet: {
                        servers: [
                            'app-001.ca.example.com:20017',
                            'app-002.ca.example.com:20017',
                            'app-003.ca.example.com:20017'
                        ],
                        url: 'mongodb://%SERVERS%/%DB%?replicaSet=app-rs'
                    }
                },
                middleware: {
                    cors: {
                        origin: '*',
                        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE'
                    },
                    bodyParser: {
                        urlencoded: {
                            extended: true,
                            limit: '10mb'
                        },
                        json: {
                            limit: '10mb'
                        }
                    }
                }
            }`;

            const config = await TestUtils.loadTestConfig(
                TestUtils.createTempFile(complexConfig, '.conf')
            );

            expect(config.database.mode).toBe('standalone');
            expect(config.database.standalone.options.maxPoolSize).toBe(10);
            expect(config.database.replicaSet.servers).toHaveLength(3);
            expect(config.middleware.cors.origin).toBe('*');
            expect(config.middleware.bodyParser.json.limit).toBe('10mb');
        });

        test('should handle configuration with arrays and booleans', async () => {
            const configWithTypes = `{
                features: {
                    enabled: ['auth', 'i18n', 'logging'],
                    disabled: [],
                    flags: {
                        useCache: true,
                        debugMode: false,
                        strictMode: true
                    }
                },
                limits: {
                    maxUsers: 1000,
                    timeout: 30.5,
                    retries: 3
                }
            }`;

            const config = await TestUtils.loadTestConfig(
                TestUtils.createTempFile(configWithTypes, '.conf')
            );

            expect(Array.isArray(config.features.enabled)).toBe(true);
            expect(config.features.enabled).toContain('auth');
            expect(config.features.flags.useCache).toBe(true);
            expect(config.features.flags.debugMode).toBe(false);
            expect(config.limits.maxUsers).toBe(1000);
            expect(config.limits.timeout).toBe(30.5);
        });
    });

    describe('Configuration Error Handling', () => {
        test('should throw error for missing configuration file', async () => {
            await expect(
                TestUtils.loadTestConfig('./nonexistent-config.conf')
            ).rejects.toThrow('Failed to load test config');
        });

        test('should throw error for malformed JSON', async () => {
            const malformedConfig = `{
                app: {
                    version: '1.0.0'
                    // missing comma
                deployment: {
                    mode: 'dev'
                }
            }`;

            const tempFile = TestUtils.createTempFile(malformedConfig, '.conf');

            await expect(
                TestUtils.loadTestConfig(tempFile)
            ).rejects.toThrow('Failed to load test config');

            TestUtils.removeTempFile(tempFile);
        });

        test('should throw error for invalid JavaScript', async () => {
            const invalidConfig = `{
                app: {
                    version: '1.0.0',
                    invalid: function() { return 'not allowed'; }
                }
            }`;

            const tempFile = TestUtils.createTempFile(invalidConfig, '.conf');

            // This should work actually, as functions are valid JavaScript
            const config = await TestUtils.loadTestConfig(tempFile);
            expect(config.app.version).toBe('1.0.0');
            expect(typeof config.app.invalid).toBe('function');

            TestUtils.removeTempFile(tempFile);
        });

        test('should handle empty configuration file', async () => {
            const emptyConfig = '';
            const tempFile = TestUtils.createTempFile(emptyConfig, '.conf');

            await expect(
                TestUtils.loadTestConfig(tempFile)
            ).rejects.toThrow('Failed to load test config');

            TestUtils.removeTempFile(tempFile);
        });

        test('should handle configuration file with only comments', async () => {
            const commentsOnlyConfig = `
                // This is a comment
                /* This is a block comment */
                // No actual configuration
            `;

            const tempFile = TestUtils.createTempFile(commentsOnlyConfig, '.conf');

            await expect(
                TestUtils.loadTestConfig(tempFile)
            ).rejects.toThrow('Failed to load test config');

            TestUtils.removeTempFile(tempFile);
        });
    });

    describe('Configuration Validation', () => {
        test('should validate required configuration sections', async () => {
            const minimalConfig = `{
                app: {
                    version: '1.0.0',
                    release: '2025-01-27'
                },
                deployment: {
                    mode: 'dev',
                    dev: {
                        name: 'development',
                        db: 'test_db',
                        port: 8080
                    }
                },
                i18n: {
                    default: 'en'
                }
            }`;

            const config = await TestUtils.loadTestConfig(
                TestUtils.createTempFile(minimalConfig, '.conf')
            );

            // Validate required sections exist
            expect(config).toHaveProperty('app');
            expect(config).toHaveProperty('deployment');
            expect(config).toHaveProperty('i18n');

            // Validate required app properties
            expect(config.app).toHaveProperty('version');
            expect(config.app).toHaveProperty('release');

            // Validate deployment configuration
            expect(config.deployment).toHaveProperty('mode');
            expect(config.deployment).toHaveProperty(config.deployment.mode);

            // Validate i18n configuration
            expect(config.i18n).toHaveProperty('default');
        });

        test('should handle configuration with extra properties', async () => {
            const configWithExtras = `{
                app: {
                    version: '1.0.0',
                    release: '2025-01-27',
                    customProperty: 'custom value'
                },
                deployment: {
                    mode: 'dev',
                    dev: {
                        name: 'development',
                        port: 8080
                    }
                },
                customSection: {
                    customValue: 42,
                    customArray: [1, 2, 3]
                }
            }`;

            const config = await TestUtils.loadTestConfig(
                TestUtils.createTempFile(configWithExtras, '.conf')
            );

            expect(config.app.customProperty).toBe('custom value');
            expect(config.customSection.customValue).toBe(42);
            expect(config.customSection.customArray).toEqual([1, 2, 3]);
        });
    });

    describe('Configuration Types and Values', () => {
        test('should preserve data types correctly', async () => {
            const typedConfig = `{
                strings: {
                    simple: 'string value',
                    empty: '',
                    withSpaces: '  spaced  ',
                    withQuotes: 'Value with "quotes"'
                },
                numbers: {
                    integer: 42,
                    float: 3.14159,
                    negative: -10,
                    zero: 0
                },
                booleans: {
                    true: true,
                    false: false
                },
                arrays: {
                    empty: [],
                    numbers: [1, 2, 3],
                    strings: ['a', 'b', 'c'],
                    mixed: [1, 'two', true, null]
                },
                nulls: {
                    null: null,
                    undefined: undefined
                }
            }`;

            const config = await TestUtils.loadTestConfig(
                TestUtils.createTempFile(typedConfig, '.conf')
            );

            // Test strings
            expect(typeof config.strings.simple).toBe('string');
            expect(config.strings.simple).toBe('string value');
            expect(config.strings.empty).toBe('');
            expect(config.strings.withSpaces).toBe('  spaced  ');

            // Test numbers
            expect(typeof config.numbers.integer).toBe('number');
            expect(config.numbers.integer).toBe(42);
            expect(config.numbers.float).toBe(3.14159);
            expect(config.numbers.negative).toBe(-10);
            expect(config.numbers.zero).toBe(0);

            // Test booleans
            expect(typeof config.booleans.true).toBe('boolean');
            expect(config.booleans.true).toBe(true);
            expect(config.booleans.false).toBe(false);

            // Test arrays
            expect(Array.isArray(config.arrays.empty)).toBe(true);
            expect(config.arrays.empty).toHaveLength(0);
            expect(config.arrays.numbers).toEqual([1, 2, 3]);
            expect(config.arrays.strings).toEqual(['a', 'b', 'c']);
            expect(config.arrays.mixed).toEqual([1, 'two', true, null]);

            // Test null values
            expect(config.nulls.null).toBeNull();
            expect(config.nulls.undefined).toBeUndefined();
        });
    });

    describe('Real Configuration Tests', () => {
        test('should load actual test fixture configuration', async () => {
            const config = await TestUtils.loadTestConfig(
                TestUtils.getFixturePath('app-test.conf')
            );

            expect(config.app.version).toBe('0.1.0-test');
            expect(config.deployment.mode).toBe('test');
            expect(config.deployment.test.port).toBe(9999);
            expect(config.i18n.default).toBe('en');
        });

        test('should validate production-like configuration structure', async () => {
            const prodConfig = `{
                app: {
                    version: '1.0.0',
                    release: '2025-01-27'
                },
                deployment: {
                    mode: 'prod',
                    prod: {
                        name: 'production',
                        db: 'bubble_prod',
                        port: 8081
                    }
                },
                database: {
                    mode: 'replicaSet',
                    replicaSet: {
                        servers: [
                            'db1.example.com:27017',
                            'db2.example.com:27017',
                            'db3.example.com:27017'
                        ],
                        url: 'mongodb://%SERVERS%/%DB%?replicaSet=prod-rs',
                        options: {
                            authSource: '%DB%',
                            auth: {
                                username: 'produser',
                                password: 'securepassword'
                            },
                            serverSelectionTimeoutMS: 5000,
                            maxPoolSize: 20
                        }
                    }
                },
                session: {
                    secret: 'production-secret-key',
                    resave: false,
                    saveUninitialized: false,
                    cookie: {
                        secure: true,
                        maxAge: 3600000
                    }
                }
            }`;

            const config = await TestUtils.loadTestConfig(
                TestUtils.createTempFile(prodConfig, '.conf')
            );

            expect(config.deployment.mode).toBe('prod');
            expect(config.database.mode).toBe('replicaSet');
            expect(config.database.replicaSet.servers).toHaveLength(3);
            expect(config.session.cookie.secure).toBe(true);
        });
    });
});

// EOF webapp/tests/unit/config/app-config.test.js
