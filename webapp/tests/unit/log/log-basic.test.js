/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Log / Basic
 * @tagline         Unit tests for log model and controller basic functionality
 * @description     This file contains unit tests for the log model and controller
 * @file            webapp/tests/unit/log/log-basic.test.js
 * @version         1.4.6
 * @release         2026-01-06
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 1.7, Claude Sonnet 4
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, jest } from '@jest/globals';
import LogModel from '../../../model/log.js';
import CommonUtils from '../../../utils/common.js';
import LogController from '../../../controller/log.js';
import TestUtils from '../../helpers/test-utils.js';
import CounterManager from '../../../utils/time-based-counters.js';

// Set up global appConfig for tests
global.appConfig = {
    controller: {
        log: {
            maxMsgLength: 256
        }
    }
};

describe('Log Model Basic Functionality', () => {
    let mockCollection;
    let originalGetDb;

    beforeEach(() => {
        // Clean up any existing global mocks
        TestUtils.cleanupGlobalMocks();

        // Mock database collection
        mockCollection = {
            insertOne: jest.fn(),
            find: jest.fn(),
            countDocuments: jest.fn(),
            toArray: jest.fn()
        };

        // Mock database connection
        originalGetDb = LogModel.getCollection;
        LogModel.getCollection = jest.fn(() => mockCollection);
    });

    afterEach(() => {
        // Restore original methods
        if (originalGetDb) {
            LogModel.getCollection = originalGetDb;
        }
        TestUtils.cleanupGlobalMocks();
        jest.resetModules();
    });

    describe('Schema Validation', () => {
        test('should validate required fields', () => {
            const validDoc = {
                data: {
                    docId: 'test-id',
                    docType: 'config',
                    action: 'create'
                }
            };

            const result = LogModel.validate(validDoc);
            expect(result.success).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should reject missing data field', () => {
            const invalidDoc = {};

            const result = LogModel.validate(invalidDoc);
            expect(result.success).toBe(false);
            expect(result.errors).toContain('data field is required');
        });

        test('should reject missing docId', () => {
            const invalidDoc = {
                data: {
                    docType: 'config',
                    action: 'create'
                }
            };

            const result = LogModel.validate(invalidDoc);
            expect(result.success).toBe(false);
            expect(result.errors).toContain('data.docId is required');
        });

        test('should reject invalid action', () => {
            const invalidDoc = {
                data: {
                    docId: 'test-id',
                    docType: 'config',
                    action: 'invalid'
                }
            };

            const result = LogModel.validate(invalidDoc);
            expect(result.success).toBe(false);
            expect(result.errors).toContain('data.action must be one of: create, update, delete');
        });
    });

    describe('Default Values', () => {
        test('should apply default values correctly', () => {
            const doc = {
                data: {
                    docId: 'test-id',
                    docType: 'config',
                    action: 'create'
                }
            };

            const result = LogModel.applyDefaults(doc);

            expect(result.data.changes).toEqual([]);
            expect(result.createdBy).toBe('');
            expect(result.docVersion).toBe(1);
            expect(result.createdAt).toBeInstanceOf(Date);
        });

        test('should preserve existing values', () => {
            const existingDate = new Date('2025-01-01');
            const doc = {
                data: {
                    docId: 'test-id',
                    docType: 'config',
                    action: 'create',
                    changes: [['field', 'old', 'new']]
                },
                createdAt: existingDate,
                createdBy: 'testuser',
                docVersion: 2
            };

            const result = LogModel.applyDefaults(doc);

            expect(result.data.changes).toEqual([['field', 'old', 'new']]);
            expect(result.createdBy).toBe('testuser');
            expect(result.docVersion).toBe(2);
            expect(result.createdAt).toBe(existingDate);
        });
    });

    describe('Field Diff Creation', () => {
        test('should create diff for simple field changes', () => {
            const oldDoc = { name: 'John', age: 30 };
            const newDoc = { name: 'Jane', age: 30 };

            const diff = LogModel.createFieldDiff(oldDoc, newDoc);
            expect(diff).toEqual([['name', 'John', 'Jane']]);
        });

        test('should create diff for nested field changes', () => {
            const oldDoc = {
                data: {
                    email: { adminEmail: 'old@example.com' }
                }
            };
            const newDoc = {
                data: {
                    email: { adminEmail: 'new@example.com' }
                }
            };

            const diff = LogModel.createFieldDiff(oldDoc, newDoc);
            expect(diff).toEqual([['data.email.adminEmail', 'old@example.com', 'new@example.com']]);
        });

        test('should handle multiple field changes', () => {
            const oldDoc = { name: 'John', age: 30, city: 'NYC' };
            const newDoc = { name: 'Jane', age: 31, city: 'NYC' };

            const diff = LogModel.createFieldDiff(oldDoc, newDoc);
            expect(diff).toContainEqual(['name', 'John', 'Jane']);
            expect(diff).toContainEqual(['age', 30, 31]);
            expect(diff).not.toContainEqual(['city', 'NYC', 'NYC']);
        });

        test('should skip metadata fields', () => {
            const oldDoc = { name: 'John', createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-01-01') };
            const newDoc = { name: 'Jane', createdAt: new Date('2025-01-02'), updatedAt: new Date('2025-01-02') };

            const diff = LogModel.createFieldDiff(oldDoc, newDoc);
            expect(diff).toEqual([['name', 'John', 'Jane']]);
        });

        test('should handle empty values correctly', () => {
            const oldDoc = { message: '' };
            const newDoc = { message: 'Hello World' };

            const diff = LogModel.createFieldDiff(oldDoc, newDoc);
            expect(diff).toEqual([['message', '', 'Hello World']]);
        });

        test('should skip undefined values in partial updates', () => {
            const oldDoc = { name: 'John', email: 'john@example.com', age: 30 };
            const newDoc = { name: 'Jane' }; // partial update

            const diff = LogModel.createFieldDiff(oldDoc, newDoc);
            expect(diff).toEqual([['name', 'John', 'Jane']]);
            // Should not include email and age becoming undefined
        });
    });

    describe('Value Formatting', () => {
        test('should format different value types', () => {
            expect(LogModel.formatValue(null)).toBe('null');
            expect(LogModel.formatValue(undefined)).toBe('undefined');
            expect(LogModel.formatValue('')).toBe('""');
            expect(LogModel.formatValue('hello')).toBe('"hello"');
            expect(LogModel.formatValue(42)).toBe('42');
            expect(LogModel.formatValue(true)).toBe('true');
            expect(LogModel.formatValue({ key: 'value' })).toBe('{"key":"value"}');
        });

        test('should format dates as ISO strings', () => {
            const date = new Date('2025-08-24T12:00:00.000Z');
            expect(LogModel.formatValue(date)).toBe('2025-08-24T12:00:00.000Z');
        });
    });
});

describe('Schema-Based Query Builder', () => {
    const testSchema = {
        createdAt: { type: 'date' },
        docType: { type: 'string' },
        action: { type: 'string', enum: ['create', 'update', 'delete'] },
        count: { type: 'number' },
        active: { type: 'boolean' }
    };

    test('should build date range queries', () => {
        const queryParams = { createdAt: '2025-08' };
        const query = CommonUtils.schemaBasedQuery(testSchema, queryParams);

        expect(query.createdAt).toHaveProperty('$gte');
        expect(query.createdAt).toHaveProperty('$lt');
        expect(query.createdAt.$gte).toEqual(new Date(2025, 7, 1)); // August 1st
        expect(query.createdAt.$lt).toEqual(new Date(2025, 8, 1)); // September 1st
    });

    test('should build string regex queries', () => {
        const queryParams = { docType: 'config' };
        const query = CommonUtils.schemaBasedQuery(testSchema, queryParams);

        expect(query.docType).toHaveProperty('$regex');
        expect(query.docType.$regex.source).toBe('config');
        expect(query.docType.$regex.flags).toBe('i');
    });

    test('should handle enum validation', () => {
        const queryParams = { action: 'create' };
        const query = CommonUtils.schemaBasedQuery(testSchema, queryParams);

        expect(query.action).toBe('create');
    });

    test('should ignore invalid enum values', () => {
        const queryParams = { action: 'invalid' };
        const query = CommonUtils.schemaBasedQuery(testSchema, queryParams);

        expect(query.action).toBeUndefined();
    });

    test('should handle number queries', () => {
        const queryParams = { count: '42' };
        const query = CommonUtils.schemaBasedQuery(testSchema, queryParams);

        expect(query.count).toBe(42);
    });

    test('should handle boolean queries', () => {
        const queryParams = { active: 'true' };
        const query = CommonUtils.schemaBasedQuery(testSchema, queryParams);

        expect(query.active).toBe(true);
    });

    test('should ignore fields not in schema', () => {
        const queryParams = { unknownField: 'value' };
        const query = CommonUtils.schemaBasedQuery(testSchema, queryParams);

        expect(query.unknownField).toBeUndefined();
    });

    test('should ignore specified fields', () => {
        const queryParams = { docType: 'config', limit: '10' };
        const ignoreFields = ['limit'];
        const query = CommonUtils.schemaBasedQuery(testSchema, queryParams, ignoreFields);

        expect(query.docType).toBeDefined();
        expect(query.limit).toBeUndefined();
    });
});

    describe('getLogStats()', () => {
        test('should return stats with correct structure', async () => {
            const mockCollection = {
                aggregate: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([{
                        total: [{ count: 100 }],
                        last24h: [{ count: 25 }],
                        byAction: [
                            { _id: 'create', count: 40 },
                            { _id: 'update', count: 50 },
                            { _id: 'delete', count: 10 }
                        ],
                        byActionLast24h: [
                            { _id: 'create', count: 10 },
                            { _id: 'update', count: 12 },
                            { _id: 'delete', count: 3 }
                        ],
                        byDocType: [
                            { _id: 'config', count: 30 },
                            { _id: 'user', count: 70 }
                        ],
                        byDocTypeLast24h: [
                            { _id: 'config', count: 8 },
                            { _id: 'user', count: 17 }
                        ]
                    }])
                })
            };

            const originalGetCollection = LogModel.getCollection;
            LogModel.getCollection = jest.fn(() => mockCollection);

            try {
                const stats = await LogModel.getLogStats();

                expect(stats.total).toBe(100);
                expect(stats.last24h).toBe(25);
                expect(stats.byAction.create).toBe(40);
                expect(stats.byAction.update).toBe(50);
                expect(stats.byAction.delete).toBe(10);
                expect(stats.byActionLast24h.create).toBe(10);
                expect(stats.byActionLast24h.update).toBe(12);
                expect(stats.byActionLast24h.delete).toBe(3);
                expect(stats.byDocType.config).toBe(30);
                expect(stats.byDocType.user).toBe(70);
                expect(stats.byDocTypeLast24h.config).toBe(8);
                expect(stats.byDocTypeLast24h.user).toBe(17);
            } finally {
                LogModel.getCollection = originalGetCollection;
            }
        });

        test('should handle empty results', async () => {
            const mockCollection = {
                aggregate: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([{
                        total: [],
                        last24h: [],
                        byAction: [],
                        byActionLast24h: [],
                        byDocType: [],
                        byDocTypeLast24h: []
                    }])
                })
            };

            const originalGetCollection = LogModel.getCollection;
            LogModel.getCollection = jest.fn(() => mockCollection);

            try {
                const stats = await LogModel.getLogStats();

                expect(stats.total).toBe(0);
                expect(stats.last24h).toBe(0);
                expect(stats.byAction).toEqual({});
                expect(stats.byActionLast24h).toEqual({});
                expect(stats.byDocType).toEqual({});
                expect(stats.byDocTypeLast24h).toEqual({});
            } finally {
                LogModel.getCollection = originalGetCollection;
            }
        });

        test('should handle database errors', async () => {
            const mockCollection = {
                aggregate: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockRejectedValue(new Error('Database connection failed'))
                })
            };

            const originalGetCollection = LogModel.getCollection;
            LogModel.getCollection = jest.fn(() => mockCollection);

            try {
                await expect(LogModel.getLogStats()).rejects.toThrow('Failed to get log stats');
            } finally {
                LogModel.getCollection = originalGetCollection;
            }
        });
    });

    describe('Date Query Building', () => {
    test('should handle year-only queries', () => {
        const query = CommonUtils.buildDateQuery('2025');
        expect(query.$gte).toEqual(new Date(2025, 0, 1));
        expect(query.$lt).toEqual(new Date(2026, 0, 1));
    });

    test('should handle year-month queries', () => {
        const query = CommonUtils.buildDateQuery('2025-08');
        expect(query.$gte).toEqual(new Date(2025, 7, 1));
        expect(query.$lt).toEqual(new Date(2025, 8, 1));
    });

    test('should handle full date queries', () => {
        const query = CommonUtils.buildDateQuery('2025-08-24');
        expect(query.$gte).toEqual(new Date('2025-08-24'));
        expect(query.$lt).toEqual(new Date('2025-08-25'));
    });

    test('should handle invalid date formats', () => {
        const query = CommonUtils.buildDateQuery('invalid-date');
        expect(query).toBeNull();
    });
});

describe('Log Controller Context Extraction', () => {
    let originalConsoleLog;
    let originalConsoleError;
    let consoleLogs;
    let consoleErrors;

    beforeEach(() => {
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
        // Restore console
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
    });

    test('should extract context from request', () => {
        const mockReq = {
            session: { user: { username: 'testuser' } },
            ip: '192.168.1.100'
        };

        const context = CommonUtils.getLogContext(mockReq);

        expect(context.username).toBe('testuser');
        expect(context.ip).toBe('192.168.1.100');
        expect(context.vm).toBe(0); // Default when no hostname match
        expect(context.id).toBe(0); // Default when no pm2
    });

    test('should handle missing session', () => {
        const mockReq = { ip: '192.168.1.100' };

        const context = CommonUtils.getLogContext(mockReq);

        expect(context.username).toBe('(guest)');
        expect(context.ip).toBe('192.168.1.100');
    });

    test('should handle missing request', () => {
        const context = CommonUtils.getLogContext(null);

        expect(context.username).toBe('(guest)');
        expect(context.ip).toBe('0.0.0.0');
        expect(context.vm).toBe(0);
        expect(context.id).toBe(0);
    });

    test('should format logInfo log correctly', () => {
        const mockReq = {
            session: { user: { username: 'testuser' } },
            ip: '192.168.1.100'
        };

        LogController.logInfo(mockReq, 'test.scope', 'Test message');

        expect(consoleLogs).toHaveLength(1);
        expect(consoleLogs[0]).toMatch(/^-\t\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\tinfo\ttestuser\tip:192\.168\.1\.100\tvm:0\tid:0\ttest\.scope\tTest message$/);
    });

    test('should format logRequest log correctly', () => {
        const mockReq = {
            session: { user: { username: 'testuser' } },
            ip: '192.168.1.100'
        };

        LogController.logRequest(mockReq, 'test.scope', 'API call');

        expect(consoleLogs).toHaveLength(1);
        expect(consoleLogs[0]).toMatch(/^====\t\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\t====\ttestuser\tip:192\.168\.1\.100\tvm:0\tid:0\t===test\.scope===\tAPI call$/);
    });

    test('should format logError log correctly', () => {
        const mockReq = {
            session: { user: { username: 'testuser' } },
            ip: '192.168.1.100'
        };

        LogController.logError(mockReq, 'test.scope', 'error: Error message');

        expect(consoleLogs).toHaveLength(1);
        expect(consoleLogs[0]).toMatch(/^-\t\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\tERROR\ttestuser\tip:192\.168\.1\.100\tvm:0\tid:0\ttest\.scope\terror: Error message$/);
    });

    test('should format timestamp correctly', () => {
        const timestamp = CommonUtils.formatTimestamp();
        expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    describe('getMetrics()', () => {
        let getLogStatsSpy, getGroupStatsSpy;
        let mockCollection;
        let originalGetCollection;

        beforeEach(() => {
            // Mock database collection for getLogStats (in case spies don't work)
            mockCollection = {
                aggregate: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([{
                        total: [{ count: 0 }],
                        last24h: [{ count: 0 }],
                        byAction: [],
                        byActionLast24h: [],
                        byDocType: [],
                        byDocTypeLast24h: []
                    }])
                })
            };
            originalGetCollection = LogModel.getCollection;
            LogModel.getCollection = jest.fn(() => mockCollection);
        });

        afterEach(() => {
            // Restore spies
            if (getLogStatsSpy) {
                getLogStatsSpy.mockRestore();
                getLogStatsSpy = null;
            }
            if (getGroupStatsSpy) {
                getGroupStatsSpy.mockRestore();
                getGroupStatsSpy = null;
            }
            // Restore getCollection
            if (originalGetCollection) {
                LogModel.getCollection = originalGetCollection;
            }
        });

        test('should return metrics in W-112 format', async () => {
            // Ensure methods exist before spying
            expect(typeof LogModel.getLogStats).toBe('function');
            expect(typeof CounterManager.getGroupStats).toBe('function');

            // Spy on LogModel.getLogStats - use the same instance that LogController uses
            getLogStatsSpy = jest.spyOn(LogModel, 'getLogStats').mockResolvedValue({
                total: 100,
                last24h: 25,
                byAction: {
                    create: 40,
                    update: 50,
                    delete: 10
                },
                byActionLast24h: {
                    create: 10,
                    update: 12,
                    delete: 3
                },
                byDocType: {
                    config: 30,
                    user: 70
                },
                byDocTypeLast24h: {
                    config: 8,
                    user: 17
                }
            });

            // Spy on CounterManager.getGroupStats - use the same instance that LogController uses
            getGroupStatsSpy = jest.spyOn(CounterManager, 'getGroupStats').mockReturnValue({
                entries: {
                    lastHour: 5,
                    last24h: 20,
                    total: 80
                }
            });

            const metrics = await LogController.getMetrics();

            // Verify spies were called
            expect(getLogStatsSpy).toHaveBeenCalled();
            expect(getGroupStatsSpy).toHaveBeenCalledWith('log');

            expect(metrics).toHaveProperty('component', 'LogController');
            expect(metrics).toHaveProperty('status', 'ok');
            expect(metrics).toHaveProperty('initialized', true);
            expect(metrics).toHaveProperty('stats');
            expect(metrics).toHaveProperty('meta');
            expect(metrics).toHaveProperty('timestamp');
        });

        test('should include correct stats from database', async () => {
            // Spy on LogModel.getLogStats
            getLogStatsSpy = jest.spyOn(LogModel, 'getLogStats').mockResolvedValue({
                total: 100,
                last24h: 25,
                byAction: {
                    create: 40,
                    update: 50,
                    delete: 10
                },
                byActionLast24h: {
                    create: 10,
                    update: 12,
                    delete: 3
                },
                byDocType: {
                    config: 30,
                    user: 70
                },
                byDocTypeLast24h: {
                    config: 8,
                    user: 17
                }
            });

            // Spy on CounterManager.getGroupStats
            getGroupStatsSpy = jest.spyOn(CounterManager, 'getGroupStats').mockReturnValue({
                entries: {
                    lastHour: 5,
                    last24h: 20,
                    total: 80
                }
            });

            const metrics = await LogController.getMetrics();

            expect(metrics.stats.entriesLast24h).toBe(25);
            expect(metrics.stats.entriesTotal).toBe(100);
            expect(metrics.stats.docsCreated24h).toBe(10);
            expect(metrics.stats.docsUpdated24h).toBe(12);
            expect(metrics.stats.docsDeleted24h).toBe(3);
            expect(metrics.stats.docsCreatedTotal).toBe(40);
            expect(metrics.stats.docsUpdatedTotal).toBe(50);
            expect(metrics.stats.docsDeletedTotal).toBe(10);
        });

        test('should include counter stats', async () => {
            // Spy on LogModel.getLogStats
            getLogStatsSpy = jest.spyOn(LogModel, 'getLogStats').mockResolvedValue({
                total: 100,
                last24h: 25,
                byAction: {},
                byActionLast24h: {},
                byDocType: {},
                byDocTypeLast24h: {}
            });

            // Spy on CounterManager.getGroupStats
            getGroupStatsSpy = jest.spyOn(CounterManager, 'getGroupStats').mockReturnValue({
                entries: {
                    lastHour: 5,
                    last24h: 20,
                    total: 80
                }
            });

            const metrics = await LogController.getMetrics();

            expect(metrics.stats.entriesLastHour).toBe(5);
        });

        test('should include byDocType stats', async () => {
            // Spy on LogModel.getLogStats
            getLogStatsSpy = jest.spyOn(LogModel, 'getLogStats').mockResolvedValue({
                total: 100,
                last24h: 25,
                byAction: {},
                byActionLast24h: {},
                byDocType: {
                    config: 30,
                    user: 70
                },
                byDocTypeLast24h: {
                    config: 8,
                    user: 17
                }
            });

            // Spy on CounterManager.getGroupStats
            getGroupStatsSpy = jest.spyOn(CounterManager, 'getGroupStats').mockReturnValue({
                entries: {
                    lastHour: 0,
                    last24h: 0,
                    total: 0
                }
            });

            const metrics = await LogController.getMetrics();

            expect(metrics.stats.byDocType).toEqual({
                config: 8,
                user: 17
            });
        });

        test('should have correct meta structure', async () => {
            // Spy on LogModel.getLogStats
            getLogStatsSpy = jest.spyOn(LogModel, 'getLogStats').mockResolvedValue({
                total: 100,
                last24h: 25,
                byAction: {},
                byActionLast24h: {},
                byDocType: {},
                byDocTypeLast24h: {}
            });

            // Spy on CounterManager.getGroupStats
            getGroupStatsSpy = jest.spyOn(CounterManager, 'getGroupStats').mockReturnValue({
                entries: {
                    lastHour: 0,
                    last24h: 0,
                    total: 0
                }
            });

            const metrics = await LogController.getMetrics();

            expect(metrics.meta.ttl).toBe(60000);
            expect(metrics.meta.category).toBe('controller');
            expect(metrics.meta.fields).toBeDefined();
            expect(metrics.meta.fields.entriesLast24h).toEqual({
                global: true,
                aggregate: 'first'
            });
        });

        test('should handle database errors gracefully', async () => {
            // Spy on LogModel.getLogStats to fail
            getLogStatsSpy = jest.spyOn(LogModel, 'getLogStats').mockRejectedValue(new Error('Database error'));

            // Spy on CounterManager.getGroupStats
            getGroupStatsSpy = jest.spyOn(CounterManager, 'getGroupStats').mockReturnValue({
                entries: {
                    lastHour: 5,
                    last24h: 20,
                    total: 80
                }
            });

            const metrics = await LogController.getMetrics();

            expect(metrics.status).toBe('error');
            expect(metrics.stats.entriesLastHour).toBe(5); // Counter still works
        });
    });
});

// EOF webapp/tests/unit/log/log-basic.test.js
