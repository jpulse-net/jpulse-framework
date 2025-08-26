/**
 * @name            jPulse Framework / WebApp / Tests / Integration / App Startup
 * @tagline         Integration tests for application startup flow
 * @description     Tests for the complete application initialization process
 * @file            webapp/tests/integration/app-startup.test.js
 * @version         0.2.5
 * @release         2025-08-26
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import { TestUtils } from '../helpers/test-utils.js';

describe('Application Startup Integration', () => {
    let originalReadFileSync;
    let mockFiles;
    let originalConsoleLog;
    let originalConsoleError;
    let consoleLogs;
    let consoleErrors;

    beforeEach(() => {
        // Clean up any existing global mocks
        TestUtils.cleanupGlobalMocks();

        // Set up file system mocks
        originalReadFileSync = fs.readFileSync;
        mockFiles = {};

        // Mock console to capture output
        originalConsoleLog = console.log;
        originalConsoleError = console.error;
        consoleLogs = [];
        consoleErrors = [];

        console.log = (...args) => {
            consoleLogs.push(args.join(' '));
        };

        console.error = (...args) => {
            consoleErrors.push(args.join(' '));
        };
    });

    afterEach(() => {
        // Restore file system
        fs.readFileSync = originalReadFileSync;

        // Restore console
        console.log = originalConsoleLog;
        console.error = originalConsoleError;

        // Clean up global mocks
        TestUtils.cleanupGlobalMocks();

        // Clear module cache
        jest.resetModules();
    });

    describe('Configuration Loading Phase', () => {
        test('should load app configuration successfully', async () => {
            const appConfig = `{
                app: {
                    version: '1.0.0',
                    release: '2025-01-27'
                },
                deployment: {
                    mode: 'test',
                    test: {
                        name: 'testing',
                        db: 'bubble_test',
                        port: 9999
                    }
                },
                i18n: {
                    default: 'en'
                }
            }`;

            mockFiles['./webapp/app.conf'] = appConfig;
            TestUtils.mockFileSystem(mockFiles);

            // Test configuration loading function directly
            const config = await TestUtils.loadTestConfig('./webapp/app.conf');

            expect(config).toBeDefined();
            expect(config.app.version).toBe('1.0.0');
            expect(config.deployment.mode).toBe('test');
            expect(config.i18n.default).toBe('en');
        });

        test('should handle configuration loading errors gracefully', async () => {
            // Mock file system to throw error
            const mockReadFileSync = jest.fn(() => {
                throw new Error('ENOENT: no such file or directory');
            });
            fs.readFileSync = mockReadFileSync;

            await expect(
                TestUtils.loadTestConfig('./webapp/nonexistent.conf')
            ).rejects.toThrow('Failed to load test config');
        });
    });

    describe('Translation Loading Phase', () => {
        test('should load translations after configuration', async () => {
            const appConfig = `{
                app: {
                    version: '1.0.0',
                    release: '2025-01-27'
                },
                i18n: {
                    default: 'en'
                }
            }`;

            const enTranslations = `{
                en: {
                    lang: 'English',
                    app: {
                        title: 'Test App'
                    }
                }
            }`;

            const deTranslations = `{
                de: {
                    lang: 'Deutsch',
                    app: {
                        title: 'Test App'
                    }
                }
            }`;

            mockFiles['./webapp/app.conf'] = appConfig;
            mockFiles['./webapp/translations/lang-en.conf'] = enTranslations;
            mockFiles['./webapp/translations/lang-de.conf'] = deTranslations;

            TestUtils.mockFileSystem(mockFiles);

            // Load configuration first
            const config = await TestUtils.loadTestConfig('./webapp/app.conf');
            global.appConfig = config;

            // Load translations
            const translations = await TestUtils.loadTestTranslations([
                './webapp/translations/lang-en.conf',
                './webapp/translations/lang-de.conf'
            ]);

            expect(translations.langs.en).toBeDefined();
            expect(translations.langs.de).toBeDefined();
            expect(translations.langs.en.lang).toBe('English');
            expect(translations.langs.de.lang).toBe('Deutsch');
        });

        test('should validate default language from configuration', async () => {
            const appConfig = `{
                i18n: {
                    default: 'en'
                }
            }`;

            const translations = {
                en: { lang: 'English' },
                de: { lang: 'Deutsch' }
            };

            const config = await TestUtils.loadTestConfig(
                TestUtils.createTempFile(appConfig, '.conf')
            );

            const i18n = TestUtils.createMockI18n(translations, config.i18n.default);

            expect(i18n.default).toBe('en');
            expect(i18n.t('lang')).toBe('English');
        });

        test('should handle missing default language', async () => {
            const appConfig = `{
                i18n: {
                    default: 'fr'
                }
            }`;

            const translations = {
                en: { lang: 'English' },
                de: { lang: 'Deutsch' }
            };

            const config = await TestUtils.loadTestConfig(
                TestUtils.createTempFile(appConfig, '.conf')
            );

            // This should fail because 'fr' is not available
            expect(translations.fr).toBeUndefined();
            expect(config.i18n.default).toBe('fr');
        });
    });

    describe('Module Dependencies', () => {
        test('should handle proper module loading order', async () => {
            const appConfig = `{
                app: {
                    version: '1.0.0'
                },
                deployment: {
                    mode: 'test',
                    test: {
                        port: 9999
                    }
                },
                i18n: {
                    default: 'en'
                }
            }`;

            const enTranslations = `{
                en: {
                    lang: 'English'
                }
            }`;

            const deTranslations = `{
                de: {
                    lang: 'Deutsch'
                }
            }`;

            mockFiles['./webapp/app.conf'] = appConfig;
            mockFiles['./webapp/translations/lang-en.conf'] = enTranslations;
            mockFiles['./webapp/translations/lang-de.conf'] = deTranslations;

            TestUtils.mockFileSystem(mockFiles);

            // Simulate proper loading order
            // 1. Load configuration
            const config = await TestUtils.loadTestConfig('./webapp/app.conf');
            expect(config).toBeDefined();

            // 2. Make config globally available
            global.appConfig = config;

            // 3. Load translations (requires global.appConfig)
            const translations = await TestUtils.loadTestTranslations([
                './webapp/translations/lang-en.conf',
                './webapp/translations/lang-de.conf'
            ]);

            expect(translations).toBeDefined();
            expect(translations.langs.en).toBeDefined();

            // 4. Create i18n with translation function
            const i18n = TestUtils.createMockI18n(translations.langs, config.i18n.default);

            expect(i18n.t('lang')).toBe('English');
        });

        test('should handle global variable dependencies', () => {
            const config = {
                app: { version: '1.0.0' },
                i18n: { default: 'en' }
            };

            const i18n = TestUtils.createMockI18n({
                en: { test: 'Test message' }
            });

            // Set up globals
            TestUtils.setupGlobalMocks(config, i18n);

            expect(global.appConfig).toBeDefined();
            expect(global.i18n).toBeDefined();
            expect(global.appConfig.app.version).toBe('1.0.0');
            expect(global.i18n.t('test')).toBe('Test message');
        });
    });

    describe('Error Recovery and Resilience', () => {
        test('should handle partial initialization gracefully', async () => {
            // Test with valid config but missing translations
            const appConfig = `{
                app: { version: '1.0.0' },
                i18n: { default: 'en' }
            }`;

            mockFiles['./webapp/app.conf'] = appConfig;

            // Mock translations to fail
            const mockReadFileSync = jest.fn((filePath, encoding) => {
                if (filePath === './webapp/app.conf') {
                    return mockFiles[filePath];
                }
                throw new Error('Translation file not found');
            });
            fs.readFileSync = mockReadFileSync;

            // Configuration should load successfully
            const config = await TestUtils.loadTestConfig('./webapp/app.conf');
            expect(config).toBeDefined();

            // But translations should fail
            await expect(
                TestUtils.loadTestTranslations(['./webapp/translations/lang-en.conf'])
            ).rejects.toThrow('Failed to load test translations');
        });

        test('should validate critical configuration sections', async () => {
            const incompleteConfig = `{
                app: {
                    version: '1.0.0'
                }
                // Missing deployment and i18n sections
            }`;

            const config = await TestUtils.loadTestConfig(
                TestUtils.createTempFile(incompleteConfig, '.conf')
            );

            expect(config.app).toBeDefined();
            expect(config.deployment).toBeUndefined();
            expect(config.i18n).toBeUndefined();

            // This would cause issues in real application
            expect(config.i18n?.default).toBeUndefined();
        });
    });

    describe('Configuration Validation', () => {
        test('should validate required configuration structure', async () => {
            const validConfig = `{
                app: {
                    version: '1.0.0',
                    release: '2025-01-27'
                },
                deployment: {
                    mode: 'test',
                    test: {
                        name: 'testing',
                        db: 'test_db',
                        port: 9999
                    }
                },
                database: {
                    mode: 'standalone',
                    standalone: {
                        url: 'mongodb://localhost:27017/%DB%'
                    }
                },
                i18n: {
                    default: 'en'
                }
            }`;

            const config = await TestUtils.loadTestConfig(
                TestUtils.createTempFile(validConfig, '.conf')
            );

            // Validate all required sections
            expect(config).toHaveProperty('app');
            expect(config).toHaveProperty('deployment');
            expect(config).toHaveProperty('database');
            expect(config).toHaveProperty('i18n');

            // Validate app section
            expect(config.app).toHaveProperty('version');
            expect(config.app).toHaveProperty('release');

            // Validate deployment section
            expect(config.deployment).toHaveProperty('mode');
            expect(config.deployment).toHaveProperty(config.deployment.mode);

            const deploymentMode = config.deployment[config.deployment.mode];
            expect(deploymentMode).toHaveProperty('name');
            expect(deploymentMode).toHaveProperty('db');
            expect(deploymentMode).toHaveProperty('port');

            // Validate database section
            expect(config.database).toHaveProperty('mode');
            expect(config.database).toHaveProperty(config.database.mode);

            // Validate i18n section
            expect(config.i18n).toHaveProperty('default');
        });

        test('should handle environment-specific configuration', async () => {
            const envConfig = `{
                deployment: {
                    mode: 'prod',
                    dev: {
                        name: 'development',
                        db: 'bubble_dev',
                        port: 8080
                    },
                    test: {
                        name: 'testing',
                        db: 'bubble_test',
                        port: 9999
                    },
                    prod: {
                        name: 'production',
                        db: 'bubble_prod',
                        port: 8081
                    }
                }
            }`;

            const config = await TestUtils.loadTestConfig(
                TestUtils.createTempFile(envConfig, '.conf')
            );

            expect(config.deployment.mode).toBe('prod');

            // Should have all environment configurations
            expect(config.deployment.dev).toBeDefined();
            expect(config.deployment.test).toBeDefined();
            expect(config.deployment.prod).toBeDefined();

            // Current mode should be accessible
            const currentEnv = config.deployment[config.deployment.mode];
            expect(currentEnv.name).toBe('production');
            expect(currentEnv.port).toBe(8081);
        });
    });

    describe('Integration with Real Fixtures', () => {
        test('should work with test fixture files', async () => {
            // Use actual test fixtures
            const config = await TestUtils.loadTestConfig(
                TestUtils.getFixturePath('app-test.conf')
            );

            const translations = await TestUtils.loadTestTranslations([
                TestUtils.getFixturePath('lang-test-en.conf'),
                TestUtils.getFixturePath('lang-test-de.conf')
            ]);

            expect(config.app.version).toBe('0.1.0-test');
            expect(config.deployment.mode).toBe('test');
            expect(translations.langs.en.lang).toBe('English');
            expect(translations.langs.de.lang).toBe('Deutsch');

            // Create working i18n
            const i18n = TestUtils.createMockI18n(translations.langs, config.i18n.default);

            expect(i18n.t('test.simple')).toBe('Simple test message');
            expect(i18n.t('test.withParam', 'World')).toBe('Hello World!');
        });
    });
});

// EOF webapp/tests/integration/app-startup.test.js
