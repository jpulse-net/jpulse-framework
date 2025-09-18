/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Site Registry
 * @tagline         Unit tests for W-014 SiteRegistry auto-discovery utility
 * @description     Tests site controller auto-discovery and API registration functionality
 * @file            webapp/tests/unit/utils/site-registry.test.js
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

// Mock dependencies before importing modules that use them
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
    readFileSync: jest.fn()
}));

jest.mock('../../../controller/log.js', () => ({
    logInfo: jest.fn(),
    logError: jest.fn()
}));

describe('SiteRegistry (W-014)', () => {
    let SiteRegistry;
    let LogController;
    const mockProjectRoot = '/Users/test/jpulse-framework';

    beforeEach(async () => {
        // Clear all mocks
        jest.clearAllMocks();

        // Mock global.appConfig to provide dirName
        global.appConfig = {
            app: {
                dirName: path.join(mockProjectRoot, 'webapp')
            }
        };

        // Import the modules - they will use the mocked fs
        const { default: SiteRegistryModule } = await import('../../../utils/site-registry.js');
        SiteRegistry = SiteRegistryModule;
        LogController = await import('../../../controller/log.js');

        // Clear the registry to ensure clean state
        SiteRegistry.registry.controllers.clear();
        SiteRegistry.registry.scanPath = null;
        SiteRegistry.registry.lastScan = null;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Controller Discovery', () => {
        test('should discover controllers with API methods', async () => {
            const controllerDir = path.join(mockProjectRoot, 'site/webapp/controller');

            // Mock directory exists and contains files
            fs.existsSync.mockImplementation((dirPath) => {
                return dirPath === controllerDir;
            });

            fs.readdirSync.mockReturnValue(['hello.js', 'admin.js', 'readme.txt']);

            // Mock file content reading
            fs.readFileSync.mockImplementation((filePath) => {
                if (filePath.includes('hello.js')) {
                    return 'class HelloController { static async api(req, res) { return { message: "Hello" }; } }';
                }
                if (filePath.includes('admin.js')) {
                    return 'class AdminController { static index() { return "admin"; } }'; // No API method
                }
                return '';
            });

            // Mock controller files with API methods
            const mockHelloController = {
                api: jest.fn().mockReturnValue({ message: 'Hello from site' })
            };
            const mockAdminController = {
                index: jest.fn(), // No API method
                dashboard: jest.fn()
            };

            // Mock dynamic imports
            jest.doMock(path.join(controllerDir, 'hello.js'), () => ({
                default: mockHelloController
            }), { virtual: true });

            jest.doMock(path.join(controllerDir, 'admin.js'), () => ({
                default: mockAdminController
            }), { virtual: true });

            await SiteRegistry.initialize();

            expect(fs.existsSync).toHaveBeenCalledWith(controllerDir);
            expect(fs.readdirSync).toHaveBeenCalledWith(controllerDir);
            expect(LogController.logInfo).toHaveBeenCalledWith(
                null,
                'site-registry: Discovered 2 controllers, 1 with APIs'
            );
        });

        test('should handle missing site controller directory', async () => {
            const controllerDir = path.join(mockProjectRoot, 'site/webapp/controller');

            // Mock directory does not exist
            fs.existsSync.mockReturnValue(false);

            await SiteRegistry.initialize();

            expect(fs.existsSync).toHaveBeenCalledWith(controllerDir);
            expect(fs.readdirSync).not.toHaveBeenCalled();
            expect(LogController.logInfo).toHaveBeenCalledWith(
                null,
                'site-registry: Site controller directory not found - no site overrides to register'
            );
        });

        test('should filter out non-JS files', async () => {
            const controllerDir = path.join(mockProjectRoot, 'site/webapp/controller');

            fs.existsSync.mockReturnValue(true);
            fs.readdirSync.mockReturnValue([
                'hello.js',
                'admin.ts',      // TypeScript file - should be ignored
                'readme.txt',    // Text file - should be ignored
                'config.json',   // JSON file - should be ignored
                '.DS_Store',     // Hidden file - should be ignored
                'test.js'
            ]);

            // Mock file contents for API detection
            fs.readFileSync.mockImplementation((filePath) => {
                if (filePath.endsWith('hello.js')) {
                    return 'export default class HelloController { static async api(req, res) {} }';
                }
                if (filePath.endsWith('test.js')) {
                    return 'export default class TestController { static async api(req, res) {} }';
                }
                return '';
            });

            await SiteRegistry.initialize();

            expect(LogController.logInfo).toHaveBeenCalledWith(
                null,
                'site-registry: Discovered 2 controllers, 2 with APIs'
            );
        });

        test('should handle controller import errors gracefully', async () => {
            const controllerDir = path.join(mockProjectRoot, 'site/webapp/controller');

            fs.existsSync.mockReturnValue(true);
            fs.readdirSync.mockReturnValue(['broken.js', 'working.js']);

            // Mock file contents - broken.js should throw error, working.js should have API
            fs.readFileSync.mockImplementation((filePath) => {
                if (filePath.endsWith('broken.js')) {
                    throw new Error('ENOENT: no such file or directory');
                }
                if (filePath.endsWith('working.js')) {
                    return 'export default class WorkingController { static async api(req, res) {} }';
                }
                return '';
            });

            await SiteRegistry.initialize();

            expect(LogController.logError).toHaveBeenCalledWith(
                null,
                expect.stringContaining('site-registry: Failed to analyze controller broken.js')
            );
            expect(LogController.logInfo).toHaveBeenCalledWith(
                null,
                'site-registry: Discovered 1 controllers, 1 with APIs'
            );
        });
    });

    describe('API Route Registration', () => {
        test('should register API routes for discovered controllers', () => {
            const mockRouter = {
                get: jest.fn(),
                post: jest.fn(),
                put: jest.fn(),
                delete: jest.fn()
            };

            // Mock discovered controllers in the registry
            SiteRegistry.registry.controllers.set('hello', {
                name: 'hello',
                hasApi: true,
                path: '/mock/path/hello.js',
                relativePath: 'controller/hello.js'
            });
            SiteRegistry.registry.controllers.set('admin', {
                name: 'admin',
                hasApi: true,
                path: '/mock/path/admin.js',
                relativePath: 'controller/admin.js'
            });

            SiteRegistry.registerApiRoutes(mockRouter);

            expect(mockRouter.get).toHaveBeenCalledWith('/api/1/hello', expect.any(Function));
            expect(mockRouter.get).toHaveBeenCalledWith('/api/1/admin', expect.any(Function));
            expect(LogController.logInfo).toHaveBeenCalledWith(
                null,
                'site-registry: Registered API route /api/1/hello → hello'
            );
            expect(LogController.logInfo).toHaveBeenCalledWith(
                null,
                'site-registry: Registered API route /api/1/admin → admin'
            );
        });

        test('should handle API route execution', async () => {
            const mockRouter = {
                get: jest.fn()
            };
            const mockController = {
                api: jest.fn().mockImplementation((req, res) => {
                    res.json({ success: true, data: 'test' });
                })
            };

            // Mock discovered controller in the registry
            SiteRegistry.registry.controllers.set('hello', {
                name: 'hello',
                hasApi: true,
                path: '/mock/path/hello.js',
                relativePath: 'controller/hello.js'
            });

            // Mock loadController to return the mock controller
            jest.spyOn(SiteRegistry, 'loadController').mockResolvedValue(mockController);

            SiteRegistry.registerApiRoutes(mockRouter);

            // Get the registered route handler
            const routeHandler = mockRouter.get.mock.calls[0][1];

            // Mock Express req/res objects
            const mockReq = { method: 'GET', url: '/api/1/hello' };
            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            // Execute the route handler
            await routeHandler(mockReq, mockRes);

            expect(mockController.api).toHaveBeenCalledWith(mockReq, mockRes);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: 'test' });
        });

        test('should handle API route errors', async () => {
            const mockRouter = {
                get: jest.fn()
            };
            const mockController = {
                api: jest.fn().mockImplementation(() => {
                    throw new Error('Controller error');
                })
            };

            // Mock discovered controller in the registry
            SiteRegistry.registry.controllers.set('hello', {
                name: 'hello',
                hasApi: true,
                path: '/mock/path/hello.js',
                relativePath: 'controller/hello.js'
            });

            // Mock loadController to return the mock controller
            jest.spyOn(SiteRegistry, 'loadController').mockResolvedValue(mockController);

            // Don't mock CommonUtils so it falls back to direct res.status/res.json

            SiteRegistry.registerApiRoutes(mockRouter);

            const routeHandler = mockRouter.get.mock.calls[0][1];
            const mockReq = { method: 'GET', url: '/api/1/hello', originalUrl: '/api/1/hello' };
            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            await routeHandler(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Site API error',
                path: '/api/1/hello',
                success: false
            });
        });

        test('should not register routes for controllers without API methods', () => {
            const mockRouter = {
                get: jest.fn()
            };

            // Mock controllers - one with API, one without
            SiteRegistry.registry.controllers.set('hello', {
                name: 'hello',
                hasApi: true,
                path: '/mock/path/hello.js',
                relativePath: 'controller/hello.js'
            });
            SiteRegistry.registry.controllers.set('admin', {
                name: 'admin',
                hasApi: false, // No API method
                path: '/mock/path/admin.js',
                relativePath: 'controller/admin.js'
            });

            SiteRegistry.registerApiRoutes(mockRouter);

            expect(mockRouter.get).toHaveBeenCalledTimes(1);
            expect(mockRouter.get).toHaveBeenCalledWith('/api/1/hello', expect.any(Function));
        });
    });

    describe('Integration with W-014 Architecture', () => {
        test('should follow "don\'t make me think" principle', async () => {
            const controllerDir = path.join(mockProjectRoot, 'site/webapp/controller');

            fs.existsSync.mockReturnValue(true);
            fs.readdirSync.mockReturnValue(['hello.js']);

            // Mock file contents for API detection
            fs.readFileSync.mockImplementation((filePath) => {
                if (filePath.endsWith('hello.js')) {
                    return 'export default class HelloController { static async api(req, res) {} }';
                }
                return '';
            });

            await SiteRegistry.initialize();

            const mockRouter = { get: jest.fn() };
            SiteRegistry.registerApiRoutes(mockRouter);

            // Should auto-discover and register without manual configuration
            expect(mockRouter.get).toHaveBeenCalledWith('/api/1/hello', expect.any(Function));
            expect(LogController.logInfo).toHaveBeenCalledWith(
                null,
                'site-registry: Discovered 1 controllers, 1 with APIs'
            );
        });

        test('should support consistent API endpoint pattern', () => {
            const mockRouter = { get: jest.fn() };

            // Mock multiple controllers with APIs
            SiteRegistry.registry.controllers.set('hello', {
                name: 'hello',
                hasApi: true,
                path: '/mock/path/hello.js',
                relativePath: 'controller/hello.js'
            });
            SiteRegistry.registry.controllers.set('user-profile', {
                name: 'user-profile',
                hasApi: true,
                path: '/mock/path/user-profile.js',
                relativePath: 'controller/user-profile.js'
            });
            SiteRegistry.registry.controllers.set('admin-dashboard', {
                name: 'admin-dashboard',
                hasApi: true,
                path: '/mock/path/admin-dashboard.js',
                relativePath: 'controller/admin-dashboard.js'
            });

            SiteRegistry.registerApiRoutes(mockRouter);

            expect(mockRouter.get).toHaveBeenCalledWith('/api/1/hello', expect.any(Function));
            expect(mockRouter.get).toHaveBeenCalledWith('/api/1/user-profile', expect.any(Function));
            expect(mockRouter.get).toHaveBeenCalledWith('/api/1/admin-dashboard', expect.any(Function));
        });

        test('should maintain clean separation between framework and site code', async () => {
            const controllerDir = path.join(mockProjectRoot, 'site/webapp/controller');

            // Should only look in site directory, not framework directory
            fs.existsSync.mockImplementation((dirPath) => {
                return dirPath === controllerDir;
            });

            fs.readdirSync.mockReturnValue(['hello.js']);

            const mockController = { api: jest.fn() };
            jest.doMock(path.join(controllerDir, 'hello.js'), () => ({
                default: mockController
            }), { virtual: true });

            await SiteRegistry.initialize();

            expect(fs.existsSync).toHaveBeenCalledWith(controllerDir);
            expect(fs.existsSync).not.toHaveBeenCalledWith(
                path.join(mockProjectRoot, 'webapp/controller')
            );
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle empty controller directory', async () => {
            const controllerDir = path.join(mockProjectRoot, 'site/webapp/controller');

            fs.existsSync.mockReturnValue(true);
            fs.readdirSync.mockReturnValue([]);

            await SiteRegistry.initialize();

            expect(LogController.logInfo).toHaveBeenCalledWith(
                null,
                'site-registry: Discovered 0 controllers, 0 with APIs'
            );
        });

        test('should handle filesystem errors gracefully', async () => {
            const controllerDir = path.join(mockProjectRoot, 'site/webapp/controller');

            fs.existsSync.mockReturnValue(true);
            fs.readdirSync.mockImplementation(() => {
                throw new Error('Permission denied');
            });

            await SiteRegistry.initialize();

            expect(LogController.logError).toHaveBeenCalledWith(
                null,
                expect.stringContaining('site-registry: Site Registry initialization failed:')
            );
        });

        test('should handle controllers with malformed API methods', async () => {
            const controllerDir = path.join(mockProjectRoot, 'site/webapp/controller');

            fs.existsSync.mockReturnValue(true);
            fs.readdirSync.mockReturnValue(['malformed.js']);

            // Mock controller with non-function API property
            const mockController = { api: 'not a function' };
            jest.doMock(path.join(controllerDir, 'malformed.js'), () => ({
                default: mockController
            }), { virtual: true });

            await SiteRegistry.initialize();

            expect(LogController.logInfo).toHaveBeenCalledWith(
                null,
                'site-registry: Discovered 1 controllers, 0 with APIs'
            );
        });
    });
});

// EOF webapp/tests/unit/utils/site-registry.test.js
