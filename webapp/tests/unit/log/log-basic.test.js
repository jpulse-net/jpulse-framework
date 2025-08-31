/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Log / Basic
 * @tagline         Unit tests for log model and controller basic functionality
 * @description     This file contains unit tests for the log model and controller
 * @file            webapp/tests/unit/log/log-basic.test.js
 * @version         0.3.3
 * @release         2025-08-31
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import LogModel from '../../../model/log.js';
import CommonUtils from '../../../utils/common.js';
import LogController from '../../../controller/log.js';
import TestUtils from '../../helpers/test-utils.js';

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
            session: { username: 'testuser' },
            ip: '192.168.1.100'
        };

        const context = LogController.getContext(mockReq);

        expect(context.loginId).toBe('testuser');
        expect(context.ip).toBe('192.168.1.100');
        expect(context.vm).toBe(0); // Default when no hostname match
        expect(context.id).toBe(0); // Default when no pm2
    });

    test('should handle missing session', () => {
        const mockReq = { ip: '192.168.1.100' };

        const context = LogController.getContext(mockReq);

        expect(context.loginId).toBe('(guest)');
        expect(context.ip).toBe('192.168.1.100');
    });

    test('should handle missing request', () => {
        const context = LogController.getContext(null);

        expect(context.loginId).toBe('(guest)');
        expect(context.ip).toBe('0.0.0.0');
        expect(context.vm).toBe(0);
        expect(context.id).toBe(0);
    });

    test('should format console log correctly', () => {
        const mockReq = {
            session: { username: 'testuser' },
            ip: '192.168.1.100'
        };

        LogController.console(mockReq, 'Test message');

        expect(consoleLogs).toHaveLength(1);
        expect(consoleLogs[0]).toMatch(/^- \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}, msg, testuser, ip:192\.168\.1\.100, vm:0, id:0, Test message$/);
    });

    test('should format API log correctly', () => {
        const mockReq = {
            session: { username: 'testuser' },
            ip: '192.168.1.100'
        };

        LogController.consoleApi(mockReq, 'API call');

        expect(consoleLogs).toHaveLength(1);
        expect(consoleLogs[0]).toMatch(/^==\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}, ===, testuser, ip:192\.168\.1\.100, vm:0, id:0, === API call$/);
    });

    test('should format error log correctly', () => {
        const mockReq = {
            session: { username: 'testuser' },
            ip: '192.168.1.100'
        };

        LogController.error(mockReq, 'Error message');

        expect(consoleErrors).toHaveLength(1);
        expect(consoleErrors[0]).toMatch(/^- \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}, ERR, testuser, ip:192\.168\.1\.100, vm:0, id:0, Error message$/);
    });

    test('should format timestamp correctly', () => {
        const timestamp = LogController.formatTimestamp();
        expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
});

// EOF webapp/tests/unit/log/log-basic.test.js
