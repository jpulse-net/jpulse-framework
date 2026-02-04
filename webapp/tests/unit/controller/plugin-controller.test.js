/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Controller / Plugin Controller
 * @tagline         Unit tests for W-045 PluginController
 * @description     Tests plugin API endpoints including new public getInfo()
 * @file            webapp/tests/unit/controller/plugin-controller.test.js
 * @version         1.6.7
 * @release         2026-02-04
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           90%, Cursor 2.0, Claude Sonnet 4.5
 */

import { describe, test, expect, beforeEach, beforeAll, jest } from '@jest/globals';
import TestUtils from '../../helpers/test-utils.js';

// Set up global appConfig BEFORE any dynamic imports
TestUtils.setupGlobalMocksWithConsolidatedConfig();

// Mock modules BEFORE importing
jest.mock('../../../utils/plugin-manager.js');
jest.mock('../../../model/plugin.js');
jest.mock('../../../controller/log.js');
jest.mock('../../../utils/common.js');

// Declare variables for dynamically imported modules
let PluginController, PluginManager, PluginModel, LogController, CommonUtils;

describe('PluginController (W-045)', () => {
    beforeAll(async () => {
        // Import mocked modules
        PluginManager = (await import('../../../utils/plugin-manager.js')).default;
        PluginModel = (await import('../../../model/plugin.js')).default;
        LogController = (await import('../../../controller/log.js')).default;
        CommonUtils = (await import('../../../utils/common.js')).default;

        // Set up global references (used by controller)
        global.PluginManager = PluginManager;
        global.PluginModel = PluginModel;
        global.LogController = LogController;
        global.CommonUtils = CommonUtils;

        // Mock i18n
        global.i18n = {
            translate: jest.fn((req, key, context = {}) => {
                const translations = {
                    'controller.plugin.get.notFound': `Plugin not found: ${context.name}`,
                    'controller.plugin.get.success': 'Plugin details retrieved successfully',
                    'controller.plugin.get.failed': 'Failed to get plugin details',
                    'controller.plugin.getInfo.success': 'Plugin information retrieved successfully',
                    'controller.plugin.getInfo.failed': 'Failed to get plugin information',
                    'controller.plugin.list.success': `${context.count} plugins listed successfully`,
                    'controller.plugin.enable.success': `Plugin ${context.name} enabled successfully. Server restart required.`,
                    'controller.plugin.enable.failed': `Failed to enable plugin: ${context.message}`,
                    'controller.plugin.disable.success': `Plugin ${context.name} disabled successfully. Server restart required.`,
                    'controller.plugin.updateConfig.success': 'Plugin configuration updated successfully',
                    'controller.plugin.updateConfig.validationFailed': `Configuration validation failed: ${context.errors}`
                };
                return translations[key] || key;
            })
        };

        // Import controller AFTER setting up mocks
        PluginController = (await import('../../../controller/plugin.js')).default;
    });

    let mockReq, mockRes;

    beforeEach(() => {
        // Mock request object
        mockReq = {
            params: {},
            body: {},
            session: {
                user: { id: 'test-user', username: 'testuser' }
            }
        };

        // Mock response object
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn()
        };

        // Set up mock implementations
        PluginManager.getAllPlugins.mockReturnValue([]);
        PluginManager.getPlugin.mockReturnValue(null);
        PluginManager.enablePlugin.mockResolvedValue({ success: true, message: 'Enabled' });
        PluginManager.disablePlugin.mockResolvedValue({ success: true, message: 'Disabled' });

        PluginModel.getByName.mockResolvedValue(null);
        PluginModel.validateConfig.mockReturnValue({ valid: true, errors: [] });
        PluginModel.upsert.mockResolvedValue({ modified: true });

        LogController.logRequest.mockImplementation(() => {});
        LogController.logInfo.mockImplementation(() => {});
        LogController.logError.mockImplementation(() => {});
        LogController.logChange.mockImplementation(() => {});

        CommonUtils.sendError.mockImplementation(() => {});

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('getInfo (Public Endpoint)', () => {
        test('should return public plugin information', async () => {
            const mockPlugin = {
                name: 'test-plugin',
                metadata: {
                    version: '1.0.0',
                    icon: '🔌',
                    summary: 'Test plugin summary',
                    description: '<p>Test plugin description</p>',
                    author: 'Test Author <test@test.com>',
                    jpulseVersion: '>=1.3.0'
                },
                registryEntry: {
                    enabled: true,
                    autoEnable: true,
                    status: 'loaded'
                }
            };

            PluginManager.getPlugin.mockReturnValue(mockPlugin);
            mockReq.params.name = 'test-plugin';

            await PluginController.getInfo(mockReq, mockRes);

            expect(PluginManager.getPlugin).toHaveBeenCalledWith('test-plugin');
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        name: 'test-plugin',
                        version: '1.0.0',
                        icon: '🔌',
                        summary: 'Test plugin summary',
                        description: '<p>Test plugin description</p>',
                        author: 'Test Author <test@test.com>',
                        jpulseVersion: '>=1.3.0',
                        enabled: true,
                        autoEnable: true,
                        status: 'loaded'
                    }),
                    message: expect.any(String),
                    elapsed: expect.any(Number)
                })
            );

            // Verify sensitive data is NOT included
            const responseData = mockRes.json.mock.calls[0][0].data;
            expect(responseData).not.toHaveProperty('configSchema');
            expect(responseData).not.toHaveProperty('dependencies');
            expect(responseData).not.toHaveProperty('path');
            expect(responseData).not.toHaveProperty('errors');
        });

        test('should return 404 for non-existent plugin', async () => {
            PluginManager.getPlugin.mockReturnValue(null);
            mockReq.params.name = 'non-existent';

            await PluginController.getInfo(mockReq, mockRes);

            expect(CommonUtils.sendError).toHaveBeenCalledWith(
                mockReq,
                mockRes,
                404,
                expect.stringContaining('non-existent'),
                'PLUGIN_NOT_FOUND'
            );
        });

        test('should handle errors gracefully', async () => {
            PluginManager.getPlugin.mockImplementation(() => {
                throw new Error('Test error');
            });
            mockReq.params.name = 'test-plugin';

            await PluginController.getInfo(mockReq, mockRes);

            expect(LogController.logError).toHaveBeenCalled();
            expect(CommonUtils.sendError).toHaveBeenCalledWith(
                mockReq,
                mockRes,
                500,
                expect.any(String),
                'INTERNAL_ERROR',
                'Test error'
            );
        });
    });

    describe('list', () => {
        test('should list all plugins with metadata', async () => {
            const mockPlugins = [
                {
                    name: 'plugin1',
                    metadata: {
                        version: '1.0.0',
                        icon: '🔌',
                        summary: 'Plugin 1',
                        description: 'Description 1',
                        author: 'Author 1',
                        config: { schema: [] }
                    },
                    registryEntry: {
                        enabled: true,
                        autoEnable: true,
                        status: 'loaded',
                        errors: [],
                        discoveredAt: '2025-01-01T00:00:00Z',
                        enabledAt: '2025-01-01T00:00:00Z'
                    }
                }
            ];

            PluginManager.getAllPlugins.mockReturnValue(mockPlugins);
            PluginModel.getByName.mockResolvedValue({ config: {} });

            await PluginController.list(mockReq, mockRes);

            expect(PluginManager.getAllPlugins).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            name: 'plugin1',
                            version: '1.0.0',
                            hasConfig: expect.any(Array),
                            configStored: true
                        })
                    ]),
                    message: expect.stringContaining('1 plugins'),
                    elapsed: expect.any(Number)
                })
            );
        });

        test('should return empty array when no plugins', async () => {
            PluginManager.getAllPlugins.mockReturnValue([]);

            await PluginController.list(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: [],
                    message: expect.stringContaining('0 plugins')
                })
            );
        });
    });

    describe('enable', () => {
        test('should enable plugin successfully', async () => {
            PluginManager.enablePlugin.mockResolvedValue({
                success: true,
                message: 'Plugin enabled'
            });
            mockReq.params.name = 'test-plugin';

            await PluginController.enable(mockReq, mockRes);

            expect(PluginManager.enablePlugin).toHaveBeenCalledWith('test-plugin');
            expect(LogController.logChange).toHaveBeenCalledWith(
                mockReq,
                'plugin',
                'update',
                'test-plugin',
                { enabled: false },
                expect.objectContaining({ enabled: true })
            );
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    restartRequired: true,
                    elapsed: expect.any(Number)
                })
            );
        });

        test('should return error if enable fails', async () => {
            PluginManager.enablePlugin.mockResolvedValue({
                success: false,
                message: 'Dependency not met'
            });
            mockReq.params.name = 'test-plugin';

            await PluginController.enable(mockReq, mockRes);

            expect(CommonUtils.sendError).toHaveBeenCalledWith(
                mockReq,
                mockRes,
                400,
                expect.stringContaining('Dependency not met'),
                'ENABLE_FAILED'
            );
        });
    });

    describe('disable', () => {
        test('should disable plugin successfully', async () => {
            PluginManager.disablePlugin.mockResolvedValue({
                success: true,
                message: 'Plugin disabled'
            });
            mockReq.params.name = 'test-plugin';

            await PluginController.disable(mockReq, mockRes);

            expect(PluginManager.disablePlugin).toHaveBeenCalledWith('test-plugin');
            expect(LogController.logChange).toHaveBeenCalledWith(
                mockReq,
                'plugin',
                'update',
                'test-plugin',
                { enabled: true },
                expect.objectContaining({ enabled: false })
            );
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    restartRequired: true,
                    elapsed: expect.any(Number)
                })
            );
        });
    });

    describe('updateConfig', () => {
        test('should update plugin configuration with valid data', async () => {
            const mockPlugin = {
                name: 'test-plugin',
                metadata: {
                    config: {
                        schema: [
                            { id: 'message', label: 'Message', type: 'text' }
                        ]
                    }
                }
            };

            const configData = { message: 'Hello World' };

            PluginManager.getPlugin.mockReturnValue(mockPlugin);
            PluginModel.validateConfig.mockReturnValue({
                valid: true,
                errors: []
            });
            PluginModel.getByName.mockResolvedValue({ config: { message: 'Old message' } });
            PluginModel.upsert.mockResolvedValue({ modified: true });

            mockReq.params.name = 'test-plugin';
            mockReq.body = { config: configData };

            await PluginController.updateConfig(mockReq, mockRes);

            expect(PluginModel.validateConfig).toHaveBeenCalledWith(
                'test-plugin',
                configData,
                mockPlugin.metadata.config.schema
            );
            expect(PluginModel.upsert).toHaveBeenCalledWith(
                'test-plugin',
                configData,
                'testuser'
            );
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    restartRequired: false,
                    elapsed: expect.any(Number)
                })
            );
        });

        test('should reject invalid configuration', async () => {
            const mockPlugin = {
                name: 'test-plugin',
                metadata: {
                    config: {
                        schema: [
                            { id: 'port', label: 'Port', type: 'number', required: true }
                        ]
                    }
                }
            };

            PluginManager.getPlugin.mockReturnValue(mockPlugin);
            PluginModel.validateConfig.mockReturnValue({
                valid: false,
                errors: ['Port is required']
            });

            mockReq.params.name = 'test-plugin';
            mockReq.body = { config: {} };

            await PluginController.updateConfig(mockReq, mockRes);

            expect(CommonUtils.sendError).toHaveBeenCalledWith(
                mockReq,
                mockRes,
                400,
                expect.stringContaining('Port is required'),
                'VALIDATION_ERROR'
            );
        });

        test('should return 404 for non-existent plugin', async () => {
            PluginManager.getPlugin.mockReturnValue(null);
            mockReq.params.name = 'non-existent';
            mockReq.body = { config: {} };

            await PluginController.updateConfig(mockReq, mockRes);

            expect(CommonUtils.sendError).toHaveBeenCalledWith(
                mockReq,
                mockRes,
                404,
                expect.any(String),
                'PLUGIN_NOT_FOUND'
            );
        });
    });
});

// EOF webapp/tests/unit/controller/plugin-controller.test.js
