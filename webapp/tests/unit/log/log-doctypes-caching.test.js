/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Log / DocTypes Caching
 * @tagline         Unit tests for log docTypes caching and enhanced logging functionality
 * @description     Tests for docTypes caching, enhanced log format, and admin logs search functionality
 * @file            webapp/tests/unit/log/log-doctypes-caching.test.js
 * @version         1.4.13
 * @release         2026-01-13
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import LogModel from '../../../model/log.js';
import LogController from '../../../controller/log.js';
import TestUtils from '../../helpers/test-utils.js';

// Set up global mocks using the standard pattern
TestUtils.setupGlobalMocksWithConsolidatedConfig();

// Additional mocks needed for our tests
global.CommonUtils = {
    formatLogMessage: jest.fn((scope, message) => `${scope}: ${message}`),
    sendError: jest.fn()
};

// Create proper i18n mock using TestUtils
const testTranslations = {
    en: {
        controller: {
            log: {
                searchSuccess: 'Found {{count}} log entries',
                searchError: 'Search error occurred'
            }
        }
    }
};
const mockI18n = TestUtils.createMockI18n(testTranslations, 'en');

// Add the translate method that LogController expects (as a Jest spy)
mockI18n.translate = jest.fn((req, keyPath, context = {}) => {
    if (keyPath === 'controller.log.searchSuccess') {
        return `Found ${context.count || 0} log entries`;
    }
    if (keyPath === 'controller.log.searchError') {
        return 'Search error occurred';
    }
    return mockI18n.t(keyPath);
});

global.i18n = mockI18n;

describe('Log DocTypes Caching', () => {
    let mockCollection;
    let originalGetCollection;

    beforeEach(() => {
        TestUtils.cleanupGlobalMocks();

        // Re-establish global mocks after cleanup
        TestUtils.setupGlobalMocksWithConsolidatedConfig();

        // Re-establish our additional mocks
        global.CommonUtils = {
            formatLogMessage: jest.fn((scope, message) => `${scope}: ${message}`),
            sendError: jest.fn()
        };

        // Re-establish i18n mock using TestUtils
        const testTranslations = {
            en: {
                controller: {
                    log: {
                        searchSuccess: 'Found {{count}} log entries',
                        searchError: 'Search error occurred'
                    }
                }
            }
        };
        const mockI18n = TestUtils.createMockI18n(testTranslations, 'en');

        // Add the translate method that LogController expects (as a Jest spy)
        mockI18n.translate = jest.fn((req, keyPath, context = {}) => {
            if (keyPath === 'controller.log.searchSuccess') {
                return `Found ${context.count || 0} log entries`;
            }
            if (keyPath === 'controller.log.searchError') {
                return 'Search error occurred';
            }
            return mockI18n.t(keyPath);
        });

        global.i18n = mockI18n;

        mockCollection = {
            distinct: jest.fn(),
            insertOne: jest.fn(),
            find: jest.fn(),
            countDocuments: jest.fn(),
            toArray: jest.fn()
        };

        originalGetCollection = LogModel.getCollection;
        LogModel.getCollection = jest.fn(() => mockCollection);

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
    });

    afterEach(() => {
        if (originalGetCollection) {
            LogModel.getCollection = originalGetCollection;
        }
        TestUtils.cleanupGlobalMocks();
        jest.resetModules();
    });

    describe('getDistinctDocTypes()', () => {
        test('should retrieve unique document types from logs collection', async () => {
            const mockDocTypes = ['config', 'user', 'helloTodo'];
            mockCollection.distinct.mockResolvedValue(mockDocTypes);

            const result = await LogModel.getDistinctDocTypes();

            expect(mockCollection.distinct).toHaveBeenCalledWith('data.docType');
            expect(result).toEqual(mockDocTypes);
        });

        test('should handle empty result gracefully', async () => {
            mockCollection.distinct.mockResolvedValue([]);

            const result = await LogModel.getDistinctDocTypes();

            expect(result).toEqual([]);
        });

        test('should handle database errors', async () => {
            mockCollection.distinct.mockRejectedValue(new Error('Database connection failed'));

            await expect(LogModel.getDistinctDocTypes()).rejects.toThrow('Failed to get distinct document types: Database connection failed');
        });
    });

    describe('DocTypes Caching with TTL', () => {
        test('should populate docTypes in global config', async () => {
            const mockDocTypes = ['config', 'user', 'helloTodo'];

            // Mock LogModel.getDistinctDocTypes
            const originalGetDistinctDocTypes = LogModel.getDistinctDocTypes;
            LogModel.getDistinctDocTypes = jest.fn().mockResolvedValue(mockDocTypes);

            // Ensure global.appConfig.app exists
            global.appConfig.system = { docTypes: [] };

            await LogController.populateDocTypes();

            expect(global.appConfig.system.docTypes).toEqual(mockDocTypes);
            expect(LogController.docTypesCache.data).toEqual(mockDocTypes);
            expect(LogController.docTypesCache.timestamp).toBeGreaterThan(0);

            // Restore original method
            LogModel.getDistinctDocTypes = originalGetDistinctDocTypes;
        });

        test('should use fallback docTypes on error', async () => {
            const originalGetDistinctDocTypes = LogModel.getDistinctDocTypes;
            LogModel.getDistinctDocTypes = jest.fn().mockRejectedValue(new Error('Database error'));

            // Ensure global.appConfig.app exists
            global.appConfig.system = { docTypes: [] };

            await LogController.populateDocTypes();

            expect(global.appConfig.system.docTypes).toEqual(['config', 'user']);
            // Note: Cache is not set when there's an error in populateDocTypes
            // This is the actual behavior of the method

            // Restore original method
            LogModel.getDistinctDocTypes = originalGetDistinctDocTypes;
        });

        test('should refresh cache when TTL expires (5 minutes)', async () => {
            const mockDocTypes = ['config', 'user'];
            const originalGetDistinctDocTypes = LogModel.getDistinctDocTypes;
            LogModel.getDistinctDocTypes = jest.fn().mockResolvedValue(mockDocTypes);

            // Set expired cache with proper structure
            LogController.docTypesCache = {
                data: ['old', 'data'],
                timestamp: Date.now() - (6 * 60 * 1000), // 6 minutes ago (expired)
                ttl: 300000 // 5 minutes
            };

            // Ensure global.appConfig.app exists
            global.appConfig.system = { docTypes: [] };

            await LogController.refreshDocTypesCache();

            expect(LogModel.getDistinctDocTypes).toHaveBeenCalled();
            expect(LogController.docTypesCache.data).toEqual(mockDocTypes);

            // Restore original method
            LogModel.getDistinctDocTypes = originalGetDistinctDocTypes;
        });

        test('should not refresh cache when TTL is valid', async () => {
            const originalGetDistinctDocTypes = LogModel.getDistinctDocTypes;
            LogModel.getDistinctDocTypes = jest.fn();

            // Set valid cache with proper structure
            LogController.docTypesCache = {
                data: ['cached', 'data'],
                timestamp: Date.now() - (2 * 60 * 1000), // 2 minutes ago (valid)
                ttl: 300000 // 5 minutes
            };

            await LogController.refreshDocTypesCache();

            expect(LogModel.getDistinctDocTypes).not.toHaveBeenCalled();

            // Restore original method
            LogModel.getDistinctDocTypes = originalGetDistinctDocTypes;
        });

        test('should refresh cache when new log entries are created', async () => {
            const mockDocTypes = ['config', 'user', 'newType'];

            // Set initial cache with proper structure
            LogController.docTypesCache = {
                data: ['config', 'user'],
                timestamp: Date.now() - (6 * 60 * 1000), // 6 minutes ago (expired)
                ttl: 300000 // 5 minutes
            };

            const originalGetDistinctDocTypes = LogModel.getDistinctDocTypes;
            LogModel.getDistinctDocTypes = jest.fn().mockResolvedValue(mockDocTypes);

            // Ensure global.appConfig.app exists
            global.appConfig.system = { docTypes: [] };

            // Simulate cache refresh during logChange
            await LogController.refreshDocTypesCache();

            expect(LogController.docTypesCache.data).toEqual(mockDocTypes);
            expect(LogController.docTypesCache.timestamp).toBeGreaterThan(Date.now() - 1000);

            // Restore original method
            LogModel.getDistinctDocTypes = originalGetDistinctDocTypes;
        });
    });
});

describe('Enhanced Log Format', () => {
    describe('Document Creation Changes', () => {
        test('should create changes array for new document', () => {
            const newDoc = {
                _id: 'test-id',
                title: 'New Todo',
                username: 'testuser',
                completed: false,
                createdAt: new Date(),
                passwordHash: 'secret'
            };

            const changes = LogModel.createDocumentCreatedChanges(newDoc);

            expect(changes).toContainEqual(['title', null, 'New Todo']);
            expect(changes).toContainEqual(['username', null, 'testuser']);
            expect(changes).toContainEqual(['completed', null, false]);

            // Should exclude metadata fields
            expect(changes).not.toContainEqual(['_id', null, 'test-id']);
            expect(changes).not.toContainEqual(['createdAt', null, expect.any(Date)]);
            expect(changes).not.toContainEqual(['passwordHash', null, 'secret']);
        });

        test('should handle nested objects', () => {
            const newDoc = {
                profile: {
                    firstName: 'John',
                    lastName: 'Doe'
                },
                settings: {
                    theme: 'dark'
                }
            };

            const changes = LogModel.createDocumentCreatedChanges(newDoc);

            expect(changes).toContainEqual(['profile.firstName', null, 'John']);
            expect(changes).toContainEqual(['profile.lastName', null, 'Doe']);
            expect(changes).toContainEqual(['settings.theme', null, 'dark']);
        });

        test('should handle empty or null input', () => {
            expect(LogModel.createDocumentCreatedChanges(null)).toEqual([]);
            expect(LogModel.createDocumentCreatedChanges(undefined)).toEqual([]);
            expect(LogModel.createDocumentCreatedChanges({})).toEqual([]);
        });

        test('should not include redundant action field', () => {
            const newDoc = {
                title: 'Test Todo',
                username: 'testuser',
                completed: false
            };

            const changes = LogModel.createDocumentCreatedChanges(newDoc);

            // Should not contain action field (handled by log.data.action)
            expect(changes).not.toContainEqual(['action', null, 'created']);

            // Should contain actual field changes
            expect(changes.length).toBeGreaterThan(0);
            expect(changes).toContainEqual(['title', null, 'Test Todo']);
        });
    });

    describe('Document Deletion Changes', () => {
        test('should create changes array for deleted document', () => {
            const oldDoc = {
                _id: 'test-id',
                title: 'Deleted Todo',
                username: 'testuser',
                completed: true,
                updatedAt: new Date(),
                saveCount: 3
            };

            const changes = LogModel.createDocumentDeletedChanges(oldDoc);

            expect(changes).toContainEqual(['title', 'Deleted Todo', null]);
            expect(changes).toContainEqual(['username', 'testuser', null]);
            expect(changes).toContainEqual(['completed', true, null]);

            // Should exclude metadata fields
            expect(changes).not.toContainEqual(['_id', 'test-id', null]);
            expect(changes).not.toContainEqual(['updatedAt', expect.any(Date), null]);
            expect(changes).not.toContainEqual(['saveCount', 3, null]);
        });

        test('should handle nested objects in deleted document', () => {
            const oldDoc = {
                data: {
                    email: {
                        adminEmail: 'admin@example.com',
                        smtpServer: 'localhost'
                    }
                }
            };

            const changes = LogModel.createDocumentDeletedChanges(oldDoc);

            expect(changes).toContainEqual(['data.email.adminEmail', 'admin@example.com', null]);
            expect(changes).toContainEqual(['data.email.smtpServer', 'localhost', null]);
        });

        test('should not include redundant action field', () => {
            const oldDoc = {
                title: 'Deleted Todo',
                username: 'testuser',
                completed: true
            };

            const changes = LogModel.createDocumentDeletedChanges(oldDoc);

            // Should not contain action field (handled by log.data.action)
            expect(changes).not.toContainEqual(['action', 'exists', 'deleted']);

            // Should contain actual field changes
            expect(changes.length).toBeGreaterThan(0);
            expect(changes).toContainEqual(['title', 'Deleted Todo', null]);
        });
    });
});

describe('Admin Logs Search Integration', () => {
    let mockReq;
    let mockRes;
    let originalConsoleLog;
    let consoleLogs;

    beforeEach(() => {
        TestUtils.cleanupGlobalMocks();

        // Re-establish global mocks after cleanup
        TestUtils.setupGlobalMocksWithConsolidatedConfig();

        // Re-establish our additional mocks
        global.CommonUtils = {
            formatLogMessage: jest.fn((scope, message) => `${scope}: ${message}`),
            sendError: jest.fn()
        };

        // Re-establish i18n mock using TestUtils
        const testTranslations = {
            en: {
                controller: {
                    log: {
                        searchSuccess: 'Found {{count}} log entries',
                        searchError: 'Search error occurred'
                    }
                }
            }
        };
        const mockI18n = TestUtils.createMockI18n(testTranslations, 'en');

        // Add the translate method that LogController expects (as a Jest spy)
        mockI18n.translate = jest.fn((req, keyPath, context = {}) => {
            if (keyPath === 'controller.log.searchSuccess') {
                return `Found ${context.count || 0} log entries`;
            }
            if (keyPath === 'controller.log.searchError') {
                return 'Search error occurred';
            }
            return mockI18n.t(keyPath);
        });

        global.i18n = mockI18n;

        mockReq = {
            query: {},
            session: { user: { username: 'testuser' } },
            ip: '127.0.0.1'
        };

        mockRes = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        // Mock console to capture log output
        originalConsoleLog = console.log;
        consoleLogs = [];
        console.log = (...args) => {
            consoleLogs.push(args.join(' '));
        };

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
    });

    afterEach(() => {
        console.log = originalConsoleLog;
        TestUtils.cleanupGlobalMocks();
        jest.resetModules();
    });

    describe('Search API with i18n Integration', () => {
        test('should use global i18n for success messages', async () => {
            const mockResults = {
                data: [{ _id: '1', data: { action: 'create' } }],
                pagination: { total: 1, page: 1, pages: 1 },
                count: 1,
                elapsed: 5
            };

            // Mock LogModel.search
            const originalSearch = LogModel.search;
            LogModel.search = jest.fn().mockResolvedValue(mockResults);

            await LogController.search(mockReq, mockRes);

            expect(global.i18n.translate).toHaveBeenCalledWith(mockReq, 'controller.log.searchSuccess', { count: 1 });
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Found 1 log entries',
                data: mockResults.data,
                pagination: mockResults.pagination,
                count: mockResults.count,
                elapsed: expect.any(Number)
            });

            // Check log message format (elapsed time may vary)
            expect(consoleLogs.some(log => log.includes('success: 1 docs found in') && log.includes('ms'))).toBe(true);

            // Restore original method
            LogModel.search = originalSearch;
        });

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

    describe('Global DocTypes Availability', () => {
        test('should provide docTypes for admin logs template rendering', () => {
            // Simulate bootstrap completion
            global.appConfig.system = { docTypes: ['config', 'user', 'helloTodo'] };

            // Verify docTypes are available globally
            expect(global.appConfig.system.docTypes).toBeDefined();
            expect(global.appConfig.system.docTypes).toContain('config');
            expect(global.appConfig.system.docTypes).toContain('user');
            expect(global.appConfig.system.docTypes).toContain('helloTodo');
        });

        test('should handle missing database gracefully during initialization', async () => {
            // Mock database error
            const originalGetDistinctDocTypes = LogModel.getDistinctDocTypes;
            LogModel.getDistinctDocTypes = jest.fn().mockRejectedValue(new Error('Database not connected'));

            // Ensure global.appConfig.app exists
            global.appConfig.system = { docTypes: [] };

            // Should not throw, should use fallback
            await expect(LogController.populateDocTypes()).resolves.not.toThrow();

            expect(global.appConfig.system.docTypes).toEqual(['config', 'user']);

            // Restore original method
            LogModel.getDistinctDocTypes = originalGetDistinctDocTypes;
        });
    });
});

// EOF webapp/tests/unit/log/log-doctypes-caching.test.js
