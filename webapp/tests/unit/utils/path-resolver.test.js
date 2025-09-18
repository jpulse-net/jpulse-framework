/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Path Resolver
 * @tagline         Unit tests for W-014 PathResolver utility
 * @description     Tests path resolution for site overrides functionality
 * @file            webapp/tests/unit/utils/path-resolver.test.js
 * @version         0.7.14
 * @release         2025-09-18
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         AGPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

// Mock fs module
jest.mock('fs');

describe('PathResolver (W-014)', () => {
    let PathResolver;
    const mockProjectRoot = '/Users/test/jpulse-framework';

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Mock global.appConfig to provide dirName
        global.appConfig = {
            app: {
                dirName: path.join(mockProjectRoot, 'webapp')
            }
        };

        // Import the module (now works without ES module issues)
        PathResolver = require('../../../utils/path-resolver.js').default;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Module Resolution Priority', () => {
        test('should prioritize site override over framework default', () => {
            const modulePath = 'controller/hello.js';
            const sitePath = path.join(mockProjectRoot, 'site/webapp', modulePath);
            const frameworkPath = path.join(mockProjectRoot, 'webapp', modulePath);

            // Mock: site file exists, framework file exists
            fs.existsSync.mockImplementation((filePath) => {
                return filePath === sitePath || filePath === frameworkPath;
            });

            const result = PathResolver.resolveModule(modulePath);

            expect(result).toBe(sitePath);
            expect(fs.existsSync).toHaveBeenCalledWith(sitePath);
            // Should not check framework path when site path exists (performance optimization)
            expect(fs.existsSync).not.toHaveBeenCalledWith(frameworkPath);
        });

        test('should fallback to framework default when site override does not exist', () => {
            const modulePath = 'controller/user.js';
            const sitePath = path.join(mockProjectRoot, 'site/webapp', modulePath);
            const frameworkPath = path.join(mockProjectRoot, 'webapp', modulePath);

            // Mock: site file does not exist, framework file exists
            fs.existsSync.mockImplementation((filePath) => {
                return filePath === frameworkPath;
            });

            const result = PathResolver.resolveModule(modulePath);

            expect(result).toBe(frameworkPath);
            expect(fs.existsSync).toHaveBeenCalledWith(sitePath);
            expect(fs.existsSync).toHaveBeenCalledWith(frameworkPath);
        });

        test('should throw error when neither site nor framework file exists', () => {
            const modulePath = 'controller/nonexistent.js';

            // Mock: neither file exists
            fs.existsSync.mockReturnValue(false);

            expect(() => {
                PathResolver.resolveModule(modulePath);
            }).toThrow('Module not found: controller/nonexistent.js');
        });
    });

    describe('Path Construction', () => {
        test('should construct correct site override path', () => {
            const modulePath = 'view/admin/index.shtml';
            const expectedSitePath = path.join(mockProjectRoot, 'site/webapp', modulePath);

            fs.existsSync.mockImplementation((filePath) => {
                return filePath === expectedSitePath;
            });

            const result = PathResolver.resolveModule(modulePath);

            expect(result).toBe(expectedSitePath);
            expect(fs.existsSync).toHaveBeenCalledWith(expectedSitePath);
        });

        test('should construct correct framework default path', () => {
            const modulePath = 'model/user.js';
            const sitePath = path.join(mockProjectRoot, 'site/webapp', modulePath);
            const expectedFrameworkPath = path.join(mockProjectRoot, 'webapp', modulePath);

            fs.existsSync.mockImplementation((filePath) => {
                return filePath === expectedFrameworkPath;
            });

            const result = PathResolver.resolveModule(modulePath);

            expect(result).toBe(expectedFrameworkPath);
            expect(fs.existsSync).toHaveBeenCalledWith(sitePath);
            expect(fs.existsSync).toHaveBeenCalledWith(expectedFrameworkPath);
        });

        test('should handle nested paths correctly', () => {
            const modulePath = 'view/admin/users/index.shtml';
            const expectedSitePath = path.join(mockProjectRoot, 'site/webapp/view/admin/users/index.shtml');

            fs.existsSync.mockImplementation((filePath) => {
                return filePath === expectedSitePath;
            });

            const result = PathResolver.resolveModule(modulePath);

            expect(result).toBe(expectedSitePath);
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty module path', () => {
            expect(() => {
                PathResolver.resolveModule('');
            }).toThrow('Module not found: ');
        });

        test('should handle module path with leading slash', () => {
            const modulePath = '/controller/hello.js';
            const sitePath = path.join(mockProjectRoot, 'site/webapp', modulePath);

            fs.existsSync.mockImplementation((filePath) => {
                return filePath === sitePath;
            });

            const result = PathResolver.resolveModule(modulePath);

            expect(result).toBe(sitePath);
        });

        test('should handle module path with backslashes on Windows', () => {
            const modulePath = 'controller\\hello.js';
            const sitePath = path.join(mockProjectRoot, 'site/webapp', modulePath);

            fs.existsSync.mockImplementation((filePath) => {
                return filePath === sitePath;
            });

            const result = PathResolver.resolveModule(modulePath);

            expect(result).toBe(sitePath);
        });
    });

    describe('Performance Considerations', () => {
        test('should check site path before framework path', () => {
            const modulePath = 'controller/test.js';
            const sitePath = path.join(mockProjectRoot, 'site/webapp', modulePath);
            const frameworkPath = path.join(mockProjectRoot, 'webapp', modulePath);

            // Mock: both files exist
            fs.existsSync.mockReturnValue(true);

            const result = PathResolver.resolveModule(modulePath);

            expect(result).toBe(sitePath);
            // Should only check site path since it exists
            expect(fs.existsSync).toHaveBeenCalledTimes(1);
            expect(fs.existsSync).toHaveBeenCalledWith(sitePath);
        });

        test('should minimize filesystem calls when site file exists', () => {
            const modulePath = 'view/home/index.shtml';
            const sitePath = path.join(mockProjectRoot, 'site/webapp', modulePath);

            fs.existsSync.mockImplementation((filePath) => {
                return filePath === sitePath;
            });

            PathResolver.resolveModule(modulePath);

            // Should only call existsSync once for site path
            expect(fs.existsSync).toHaveBeenCalledTimes(1);
        });
    });

    describe('Integration with W-014 Architecture', () => {
        test('should support view template resolution', () => {
            const templatePath = 'view/hello/index.shtml';
            const siteTemplatePath = path.join(mockProjectRoot, 'site/webapp', templatePath);

            fs.existsSync.mockImplementation((filePath) => {
                return filePath === siteTemplatePath;
            });

            const result = PathResolver.resolveModule(templatePath);

            expect(result).toBe(siteTemplatePath);
            expect(path.basename(result)).toBe('index.shtml');
        });

        test('should support controller resolution', () => {
            const controllerPath = 'controller/hello.js';
            const siteControllerPath = path.join(mockProjectRoot, 'site/webapp', controllerPath);

            fs.existsSync.mockImplementation((filePath) => {
                return filePath === siteControllerPath;
            });

            const result = PathResolver.resolveModule(controllerPath);

            expect(result).toBe(siteControllerPath);
            expect(path.basename(result)).toBe('hello.js');
        });

        test('should support static asset resolution', () => {
            const assetPath = 'static/images/logo.png';
            const frameworkAssetPath = path.join(mockProjectRoot, 'webapp', assetPath);

            fs.existsSync.mockImplementation((filePath) => {
                return filePath === frameworkAssetPath;
            });

            const result = PathResolver.resolveModule(assetPath);

            expect(result).toBe(frameworkAssetPath);
        });
    });
});

// EOF webapp/tests/unit/utils/path-resolver.test.js
