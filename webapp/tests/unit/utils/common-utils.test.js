/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / CommonUtils
 * @tagline         Unit Tests for CommonUtils
 * @description     Tests for common utility functions
 * @file            webapp/tests/unit/utils/common-utils.test.js
 * @version         0.4.0
 * @release         2025-09-02
 * @repository      https://github.com/peterthoeny/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         GPL v3, see LICENSE file
 * @genai           99%, Cursor 1.2, Claude Sonnet 4
 */

import CommonUtils from '../../../utils/common.js';

describe('CommonUtils', () => {
    describe('schemaBasedQuery', () => {
        const testSchema = {
            name: { type: 'string' },
            age: { type: 'number' },
            active: { type: 'boolean' },
            createdAt: { type: 'date' },
            status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
            data: {
                email: {
                    adminEmail: { type: 'string', validate: 'email' }
                }
            }
        };

        test('should create string query with case-insensitive regex', () => {
            const params = { name: 'john' };
            const query = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(query.name).toEqual({ $regex: /john/i });
        });

        test('should handle wildcard patterns in strings', () => {
            const params = { name: 'john*' };
            const query = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(query.name).toEqual({ $regex: /john.*/i });
        });

        test('should convert string numbers to actual numbers', () => {
            const params = { age: '25' };
            const query = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(query.age).toBe(25);
        });

        test('should convert string booleans to actual booleans', () => {
            const params = { active: 'true' };
            const query = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(query.active).toBe(true);

            const params2 = { active: 'false' };
            const query2 = CommonUtils.schemaBasedQuery(testSchema, params2);

            expect(query2.active).toBe(false);
        });

        test('should handle enum fields', () => {
            const params = { status: 'active' };
            const query = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(query.status).toBe('active');
        });

        test('should ignore invalid enum values', () => {
            const params = { status: 'invalid' };
            const query = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(query.status).toBeUndefined();
        });

        test('should handle nested schema paths', () => {
            const params = { 'data.email.adminEmail': 'admin@example.com' };
            const query = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(query['data.email.adminEmail']).toEqual({ $regex: /admin@example.com/i });
        });

        test('should ignore empty values', () => {
            const params = { name: '', age: '25' };
            const query = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(query.name).toBeUndefined();
            expect(query.age).toBe(25);
        });

        test('should ignore specified fields', () => {
            const params = { name: 'john', age: '25' };
            const query = CommonUtils.schemaBasedQuery(testSchema, params, ['name']);

            expect(query.name).toBeUndefined();
            expect(query.age).toBe(25);
        });

        test('should handle date queries', () => {
            const params = { createdAt: '2025' };
            const query = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(query.createdAt).toEqual({
                $gte: new Date(2025, 0, 1),
                $lt: new Date(2026, 0, 1)
            });
        });
    });

    describe('getFieldSchema', () => {
        const testSchema = {
            name: { type: 'string' },
            data: {
                email: {
                    adminEmail: { type: 'string', validate: 'email' }
                }
            }
        };

        test('should find top-level field schema', () => {
            const schema = CommonUtils.getFieldSchema(testSchema, 'name');
            expect(schema).toEqual({ type: 'string' });
        });

        test('should find nested field schema', () => {
            const schema = CommonUtils.getFieldSchema(testSchema, 'data.email.adminEmail');
            expect(schema).toEqual({ type: 'string', validate: 'email' });
        });

        test('should return null for non-existent field', () => {
            const schema = CommonUtils.getFieldSchema(testSchema, 'nonexistent');
            expect(schema).toBeNull();
        });

        test('should return null for incomplete path', () => {
            const schema = CommonUtils.getFieldSchema(testSchema, 'data.email.nonexistent');
            expect(schema).toBeNull();
        });
    });

    describe('buildDateQuery', () => {
        test('should handle year format', () => {
            const query = CommonUtils.buildDateQuery('2025');
            expect(query).toEqual({
                $gte: new Date(2025, 0, 1),
                $lt: new Date(2026, 0, 1)
            });
        });

        test('should handle year-month format', () => {
            const query = CommonUtils.buildDateQuery('2025-08');
            expect(query).toEqual({
                $gte: new Date(2025, 7, 1),
                $lt: new Date(2025, 8, 1)
            });
        });

        test('should handle full date format', () => {
            const query = CommonUtils.buildDateQuery('2025-08-24');
            expect(query).toEqual({
                $gte: new Date('2025-08-24'),
                $lt: new Date('2025-08-25')
            });
        });

        test('should return null for invalid date', () => {
            const query = CommonUtils.buildDateQuery('invalid');
            expect(query).toBeNull();
        });
    });

    describe('deepMerge', () => {
        test('should merge simple objects', () => {
            const obj1 = { a: 1, b: 2 };
            const obj2 = { b: 3, c: 4 };
            const result = CommonUtils.deepMerge(obj1, obj2);

            expect(result).toEqual({ a: 1, b: 3, c: 4 });
        });

        test('should merge nested objects', () => {
            const obj1 = { a: 1, b: { x: 1, y: 2 } };
            const obj2 = { b: { y: 3, z: 4 }, c: 5 };
            const result = CommonUtils.deepMerge(obj1, obj2);

            expect(result).toEqual({ a: 1, b: { x: 1, y: 3, z: 4 }, c: 5 });
        });

        test('should replace arrays instead of merging', () => {
            const obj1 = { arr: [1, 2, 3] };
            const obj2 = { arr: [4, 5] };
            const result = CommonUtils.deepMerge(obj1, obj2);

            expect(result).toEqual({ arr: [4, 5] });
        });

        test('should handle empty objects', () => {
            const result = CommonUtils.deepMerge();
            expect(result).toEqual({});
        });
    });

    describe('formatValue', () => {
        test('should format objects as JSON', () => {
            const obj = { name: 'test', value: 123 };
            const result = CommonUtils.formatValue(obj);
            expect(result).toBe('{"name":"test","value":123}');
        });

        test('should format arrays as JSON', () => {
            const arr = [1, 2, 3];
            const result = CommonUtils.formatValue(arr);
            expect(result).toBe('[1,2,3]');
        });

        test('should handle null and undefined', () => {
            expect(CommonUtils.formatValue(null)).toBe('null');
            expect(CommonUtils.formatValue(undefined)).toBe('undefined');
        });

        test('should convert primitives to strings', () => {
            expect(CommonUtils.formatValue(123)).toBe('123');
            expect(CommonUtils.formatValue(true)).toBe('true');
            expect(CommonUtils.formatValue('test')).toBe('test');
        });
    });

    describe('generateUuid', () => {
        test('should generate unique UUIDs', () => {
            const uuid1 = CommonUtils.generateUuid();
            const uuid2 = CommonUtils.generateUuid();

            expect(uuid1).not.toBe(uuid2);
            expect(typeof uuid1).toBe('string');
            expect(typeof uuid2).toBe('string');
        });

        test('should generate UUIDs in the correct format (v4)', () => {
            const uuid = CommonUtils.generateUuid();
            // Regex for UUID v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
            // Where 'y' can be 8, 9, a, or b
            expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        });
    });

    describe('isValidEmail', () => {
        test('should validate correct email formats', () => {
            expect(CommonUtils.isValidEmail('test@example.com')).toBe(true);
            expect(CommonUtils.isValidEmail('user.name@domain.co.uk')).toBe(true);
            expect(CommonUtils.isValidEmail('user+tag@example.org')).toBe(true);
        });

        test('should reject invalid email formats', () => {
            expect(CommonUtils.isValidEmail('invalid-email')).toBe(false);
            expect(CommonUtils.isValidEmail('@example.com')).toBe(false);
            expect(CommonUtils.isValidEmail('test@')).toBe(false);
            expect(CommonUtils.isValidEmail('test@.com')).toBe(false);
        });
    });

    describe('sanitizeString', () => {
        test('should remove dangerous characters', () => {
            const input = '<script>alert("xss")</script>';
            const result = CommonUtils.sanitizeString(input);
            expect(result).toBe('scriptalert(xss)/script');
        });

        test('should remove command injection characters', () => {
            const input = 'test; rm -rf /';
            const result = CommonUtils.sanitizeString(input);
            expect(result).toBe('test rm -rf /');
        });

        test('should handle non-string input', () => {
            expect(CommonUtils.sanitizeString(123)).toBe('');
            expect(CommonUtils.sanitizeString(null)).toBe('');
            expect(CommonUtils.sanitizeString(undefined)).toBe('');
        });

        test('should trim whitespace', () => {
            const result = CommonUtils.sanitizeString('  test  ');
            expect(result).toBe('test');
        });
    });
});

// EOF webapp/tests/unit/utils/common-utils.test.js
