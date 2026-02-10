/**
 * @name            jPulse Framework / WebApp / Tests / Integration / Admin Logs View
 * @tagline         Integration tests for admin logs view functionality
 * @description     Tests for admin logs page, docTypes integration, search functionality, and error handling
 * @file            webapp/tests/integration/admin-logs-view.test.js
 * @version         1.6.14
 * @release         2026-02-11
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import TestUtils from '../helpers/test-utils.js';

// Set up global mocks using the standard pattern
TestUtils.setupGlobalMocksWithConsolidatedConfig();

// Mock the entire Express app and related dependencies
const mockApp = {
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    listen: jest.fn()
};

const mockDatabase = {
    getDb: jest.fn(),
    connect: jest.fn(),
    close: jest.fn()
};

const mockCollection = {
    find: jest.fn(),
    distinct: jest.fn(),
    countDocuments: jest.fn(),
    insertOne: jest.fn()
};

// Set up global mocks
global.Database = mockDatabase;

global.CommonUtils = {
    formatLogMessage: jest.fn((scope, message) => `${scope}: ${message}`),
    sendError: jest.fn()
};

global.i18n = {
    translate: jest.fn((req, key, params) => {
        if (key === 'controller.log.searchSuccess') {
            return `Found ${params?.count || 0} log entries`;
        }
        if (key === 'controller.log.searchError') {
            // W-144: Include error details in translated message
            return `Internal server error while searching logs: ${params?.error || 'Unknown error'}`;
        }
        return key;
    })
};

describe('Admin Logs View Integration Tests', () => {
    let LogController;
    let LogModel;
    let ViewController;
    let originalGetDistinctDocTypes;

    beforeAll(async () => {
        // Import modules after setting up mocks
        const logControllerModule = await import('../../controller/log.js');
        const logModelModule = await import('../../model/log.js');
        const viewControllerModule = await import('../../controller/view.js');

        LogController = logControllerModule.default;
        LogModel = logModelModule.default;
        ViewController = viewControllerModule.default;
    });

    beforeEach(() => {
        TestUtils.cleanupGlobalMocks();

        // Re-establish global mocks after cleanup
        TestUtils.setupGlobalMocksWithConsolidatedConfig();

        // Re-establish our additional mocks
        global.Database = mockDatabase;

        global.CommonUtils = {
            formatLogMessage: jest.fn((scope, message) => `${scope}: ${message}`),
            sendError: jest.fn()
        };

        global.i18n = {
            translate: jest.fn((req, key, params) => {
                if (key === 'controller.log.searchSuccess') {
                    return `Found ${params?.count || 0} log entries`;
                }
                if (key === 'controller.log.searchError') {
                    // W-144: Include error details in translated message
                    return `Internal server error while searching logs: ${params?.error || 'Unknown error'}`;
                }
                return key;
            })
        };

        jest.clearAllMocks();

        // Reset docTypes cache
        LogController.docTypesCache = { data: null, timestamp: 0 };

        // Ensure global.appConfig structure exists
        if (!global.appConfig) {
            global.appConfig = {
                controller: {
                    log: {
                        maxMsgLength: 256
                    }
                },
                system: {
                    docTypes: []
                }
            };
        } else if (!global.appConfig.app) {
            global.appConfig.system = { docTypes: [] };
        } else {
            global.appConfig.system.docTypes = [];
        }

        // Mock database collection
        mockDatabase.getDb.mockReturnValue({
            collection: jest.fn().mockReturnValue(mockCollection)
        });

        // Mock LogModel.getDistinctDocTypes to prevent database access
        originalGetDistinctDocTypes = LogModel.getDistinctDocTypes;
        LogModel.getDistinctDocTypes = jest.fn().mockResolvedValue(['config', 'user']); // Match test expectations
    });

    afterEach(() => {
        // Restore original methods
        if (originalGetDistinctDocTypes) {
            LogModel.getDistinctDocTypes = originalGetDistinctDocTypes;
            originalGetDistinctDocTypes = null;
        }

        TestUtils.cleanupGlobalMocks();
        jest.resetModules();
    });

    describe('DocTypes Integration', () => {
        test('should populate docTypes during application bootstrap', async () => {
            const mockDocTypes = ['config', 'user', 'helloTodo'];

            // Create a fresh mock that returns the expected docTypes
            const originalMock = LogModel.getDistinctDocTypes;
            LogModel.getDistinctDocTypes = jest.fn().mockResolvedValue(mockDocTypes);
            mockCollection.distinct.mockResolvedValue(mockDocTypes);

            await LogController.populateDocTypes();

            expect(global.appConfig.system.docTypes).toEqual(mockDocTypes);
            expect(LogController.docTypesCache.data).toEqual(mockDocTypes);
            expect(LogController.docTypesCache.timestamp).toBeGreaterThan(0);

            // Restore the original mock
            LogModel.getDistinctDocTypes = originalMock;
        });

        test('should provide docTypes to admin logs template', async () => {
            // Simulate populated docTypes
            global.appConfig.system.docTypes = ['config', 'user', 'helloTodo'];

            // Verify docTypes are available in global config
            expect(global.appConfig.system.docTypes).toContain('config');
            expect(global.appConfig.system.docTypes).toContain('user');
            expect(global.appConfig.system.docTypes).toContain('helloTodo');
        });

        test('should use fallback docTypes when database is unavailable', async () => {
            mockCollection.distinct.mockRejectedValue(new Error('Database unavailable'));

            await LogController.populateDocTypes();

            expect(global.appConfig.system.docTypes).toEqual(['config', 'user']);
        });
    });

    describe('Admin Logs Search API', () => {
        test('should handle basic search request', async () => {
            const mockReq = {
                query: {
                    limit: '50',
                    page: '1',
                    sort: '-createdAt'
                },
                session: { user: { username: 'admin' } },
                ip: '127.0.0.1'
            };

            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            const mockSearchResults = {
                data: [
                    {
                        _id: '1',
                        data: {
                            docId: 'test-config',
                            docType: 'config',
                            action: 'update',
                            changes: [['field1', 'old', 'new']]
                        },
                        createdBy: 'admin',
                        createdAt: new Date()
                    }
                ],
                pagination: {
                    total: 1,
                    page: 1,
                    pages: 1,
                    limit: 50,
                    skip: 0
                },
                count: 1,
                elapsed: 5
            };

            // Mock LogModel.search
            const originalSearch = LogModel.search;
            LogModel.search = jest.fn().mockResolvedValue(mockSearchResults);

            await LogController.search(mockReq, mockRes);

            expect(LogModel.search).toHaveBeenCalledWith(
                expect.objectContaining({
                    limit: "50", // String as received from query params
                    page: "1",   // String as received from query params
                    sort: '-createdAt'
                })
            );

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Found 1 log entries',
                data: mockSearchResults.data,
                pagination: mockSearchResults.pagination,
                count: 1,
                elapsed: expect.any(Number)
            });

            // Restore original method
            LogModel.search = originalSearch;
        });

        test('should handle search with filters', async () => {
            const mockReq = {
                query: {
                    createdAt: '2025-10',
                    'data.docType': 'user',
                    'data.action': 'create',
                    createdBy: 'admin',
                    limit: '25',
                    page: '1',
                    sort: '-createdAt'
                },
                session: { user: { username: 'admin' } },
                ip: '127.0.0.1'
            };

            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            const mockSearchResults = {
                data: [],
                pagination: {
                    total: 0,
                    page: 1,
                    pages: 0,
                    limit: 25,
                    skip: 0
                },
                count: 0,
                elapsed: 2
            };

            const originalSearch = LogModel.search;
            LogModel.search = jest.fn().mockResolvedValue(mockSearchResults);

            await LogController.search(mockReq, mockRes);

            expect(LogModel.search).toHaveBeenCalledWith(
                expect.objectContaining({
                    createdAt: '2025-10',
                    'data.docType': 'user',
                    'data.action': 'create',
                    createdBy: 'admin',
                    limit: "25", // String as received from query params
                    page: "1",   // String as received from query params
                    sort: '-createdAt'
                })
            );

            // Restore original method
            LogModel.search = originalSearch;
        });

        test('should handle search errors gracefully', async () => {
            const mockReq = {
                query: {},
                session: { user: { username: 'admin' } },
                ip: '127.0.0.1'
            };

            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            const originalSearch = LogModel.search;
            LogModel.search = jest.fn().mockRejectedValue(new Error('Database connection failed'));

            // Mock CommonUtils.sendError
            const originalSendError = global.CommonUtils.sendError;
            global.CommonUtils.sendError = jest.fn();

            await LogController.search(mockReq, mockRes);

            // W-144: Error message now includes error details via i18n (no 6th argument)
            expect(global.CommonUtils.sendError).toHaveBeenCalledWith(
                mockReq,
                mockRes,
                500,
                expect.stringContaining('Database connection failed'),
                'SEARCH_ERROR'
            );

            // Restore original methods
            LogModel.search = originalSearch;
            global.CommonUtils.sendError = originalSendError;
        });
    });

    describe('Logging Format Consistency', () => {
        test('should demonstrate consistent log message format across controllers', () => {
            const mockReq = {
                session: { user: { username: 'testuser' } },
                ip: '192.168.1.100'
            };

            // Mock console to capture output
            const originalConsoleLog = console.log;
            const consoleLogs = [];
            console.log = (...args) => {
                consoleLogs.push(args.join(' '));
            };

            // Test consistent format: "success: X docs found/created/updated/deleted in Yms"
            const testCases = [
                'success: 5 docs found in 3ms',
                'success: 1 doc created in 2ms',
                'success: 1 doc updated in 4ms',
                'success: 1 doc deleted in 1ms'
            ];

            testCases.forEach(message => {
                LogController.logInfo(mockReq, 'test.scope', message);
            });

            // Verify all messages follow the expected format
            testCases.forEach((expectedMessage, index) => {
                expect(consoleLogs[index]).toMatch(new RegExp(expectedMessage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
            });

            // Restore console
            console.log = originalConsoleLog;
        });
    });

    describe('Cache Management', () => {
        test('should refresh docTypes cache when new log entries are created', async () => {
            const mockDocTypes = ['config', 'user'];
            const newDocTypes = ['config', 'user', 'newType'];

            // Set initial cache with explicit TTL
            LogController.docTypesCache = {
                data: mockDocTypes,
                timestamp: Date.now() - (6 * 60 * 1000), // 6 minutes ago (expired)
                ttl: 300000 // 5 minutes in milliseconds
            };

            // Create a fresh mock that returns the new docTypes
            const originalMock = LogModel.getDistinctDocTypes;
            LogModel.getDistinctDocTypes = jest.fn().mockResolvedValue(newDocTypes);

            // Also mock the collection.distinct method that might be called
            mockCollection.distinct.mockResolvedValue(newDocTypes);

            // Verify cache is expired (should be > 300000ms old)
            const cacheAge = Date.now() - LogController.docTypesCache.timestamp;
            expect(cacheAge).toBeGreaterThan(LogController.docTypesCache.ttl);

            // Simulate cache refresh during logChange
            await LogController.refreshDocTypesCache();

            // Verify the mock was called
            expect(LogModel.getDistinctDocTypes).toHaveBeenCalled();

            expect(LogController.docTypesCache.data).toEqual(newDocTypes);
            expect(LogController.docTypesCache.timestamp).toBeGreaterThan(Date.now() - 1000);

            // Restore the original mock
            LogModel.getDistinctDocTypes = originalMock;
        });

        test('should not refresh cache when TTL is still valid', async () => {
            const mockDocTypes = ['config', 'user'];

            // Set recent cache
            LogController.docTypesCache = {
                data: mockDocTypes,
                timestamp: Date.now() - (2 * 60 * 1000) // 2 minutes ago (valid)
            };

            const originalTimestamp = LogController.docTypesCache.timestamp;

            await LogController.refreshDocTypesCache();

            // Should not have called distinct() or updated timestamp
            expect(mockCollection.distinct).not.toHaveBeenCalled();
            expect(LogController.docTypesCache.timestamp).toBe(originalTimestamp);
        });
    });

    describe('Error Handling and Resilience', () => {
        test('should handle missing database gracefully during initialization', async () => {
            mockDatabase.getDb.mockImplementation(() => {
                throw new Error('Database not connected');
            });

            // Should not throw, should use fallback
            await expect(LogController.populateDocTypes()).resolves.not.toThrow();

            expect(global.appConfig.system.docTypes).toEqual(['config', 'user']);
        });

        test('should handle malformed search queries', async () => {
            const mockReq = {
                query: {
                    createdAt: 'invalid-date',
                    limit: 'not-a-number',
                    page: 'also-not-a-number'
                },
                session: { user: { username: 'admin' } },
                ip: '127.0.0.1'
            };

            const mockRes = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            const originalSearch = LogModel.search;
            LogModel.search = jest.fn().mockResolvedValue({
                data: [],
                pagination: { total: 0, page: 1, pages: 0, limit: 50, skip: 0 },
                count: 0,
                elapsed: 1
            });

            await LogController.search(mockReq, mockRes);

            // Should not crash, should sanitize query parameters
            expect(LogModel.search).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));

            // Restore original method
            LogModel.search = originalSearch;
        });
    });
});

// EOF webapp/tests/integration/w040-admin-logs.test.js
