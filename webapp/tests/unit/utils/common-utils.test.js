/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / CommonUtils
 * @tagline         Unit Tests for CommonUtils
 * @description     Tests for common utility functions
 * @file            webapp/tests/unit/utils/common-utils.test.js
 * @version         1.6.19
 * @release         2026-02-19
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.4, Claude Sonnet 4.5
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

        test('should create string query with exact match by default', () => {
            const params = { name: 'john' };
            const result = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(result.query.name).toBe('john'); // exact match now
            expect(result.useCollation).toBe(true);
        });

        test('should handle wildcard patterns in strings', () => {
            const params = { name: 'john*' };
            const result = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(result.query.name).toEqual({ $regex: /^john.*/i }); // anchored wildcard
            expect(result.useCollation).toBe(false);
        });

        test('should convert string numbers to actual numbers', () => {
            const params = { age: '25' };
            const result = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(result.query.age).toBe(25);
        });

        test('should convert string booleans to actual booleans', () => {
            const params = { active: 'true' };
            const result = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(result.query.active).toBe(true);

            const params2 = { active: 'false' };
            const result2 = CommonUtils.schemaBasedQuery(testSchema, params2);

            expect(result2.query.active).toBe(false);
        });

        test('should handle enum fields', () => {
            const params = { status: 'active' };
            const result = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(result.query.status).toBe('active');
        });

        test('should ignore invalid enum values', () => {
            const params = { status: 'invalid' };
            const result = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(result.query.status).toBeUndefined();
        });

        test('should handle nested schema paths', () => {
            const params = { 'data.email.adminEmail': 'admin@example.com' };
            const result = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(result.query['data.email.adminEmail']).toBe('admin@example.com'); // exact match now
        });

        test('should ignore empty values', () => {
            const params = { name: '', age: '25' };
            const result = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(result.query.name).toBeUndefined();
            expect(result.query.age).toBe(25);
        });

        test('should ignore specified fields', () => {
            const params = { name: 'john', age: '25' };
            const result = CommonUtils.schemaBasedQuery(testSchema, params, ['name']);

            expect(result.query.name).toBeUndefined();
            expect(result.query.age).toBe(25);
        });

        test('should handle date queries', () => {
            const params = { createdAt: '2025' };
            const result = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(result.query.createdAt).toEqual({
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

    describe('sanitizeObject', () => {
        test('should obfuscate exact path by default', () => {
            const obj = { data: { email: { smtpPass: 'secret' } } };
            const result = CommonUtils.sanitizeObject(obj, ['data.email.smtpPass']);
            expect(result.data.email.smtpPass).toBe('********');
            expect(obj.data.email.smtpPass).toBe('secret');
        });

        test('should obfuscate prefix wildcard (smtp*) and preserve type', () => {
            const obj = { data: { email: { smtpServer: 'smtp.x.com', smtpPort: 587, smtpUser: 'u', adminEmail: 'a@b.com' } } };
            const result = CommonUtils.sanitizeObject(obj, ['data.email.smtp*']);
            expect(result.data.email.smtpServer).toBe('********');
            expect(result.data.email.smtpPort).toBe(9999);
            expect(typeof result.data.email.smtpPort).toBe('number');
            expect(result.data.email.smtpUser).toBe('********');
            expect(result.data.email.adminEmail).toBe('a@b.com');
        });

        test('should obfuscate suffix wildcard (*pass)', () => {
            const obj = { data: { email: { smtpPass: 'p1', otherPass: 'p2', user: 'u' } } };
            const result = CommonUtils.sanitizeObject(obj, ['data.email.*pass']);
            expect(result.data.email.smtpPass).toBe('********');
            expect(result.data.email.otherPass).toBe('********');
            expect(result.data.email.user).toBe('u');
        });

        test('should support mode remove', () => {
            const obj = { data: { email: { smtpPass: 'secret' } } };
            const result = CommonUtils.sanitizeObject(obj, ['data.email.smtpPass'], { mode: 'remove' });
            expect(result.data.email.smtpPass).toBeUndefined();
            expect(obj.data.email.smtpPass).toBe('secret');
        });

        test('should not mutate original', () => {
            const obj = { a: { b: 'v' } };
            const result = CommonUtils.sanitizeObject(obj, ['a.b']);
            expect(result).not.toBe(obj);
            expect(obj.a.b).toBe('v');
        });

        test('should use custom stringPlaceholder and numberPlaceholder', () => {
            const obj = { data: { email: { smtpPass: 'secret', smtpPort: 587 } } };
            const result = CommonUtils.sanitizeObject(obj, ['data.email.smtp*'], {
                stringPlaceholder: '***',
                numberPlaceholder: 0
            });
            expect(result.data.email.smtpPass).toBe('***');
            expect(result.data.email.smtpPort).toBe(0);
        });
    });

    describe('dot path utilities', () => {
        describe('getValueByPath', () => {
            test('should return nested value', () => {
                const obj = { a: { b: { c: 123 } } };
                expect(CommonUtils.getValueByPath(obj, 'a.b.c')).toBe(123);
            });

            test('should return undefined for missing path', () => {
                const obj = { a: { b: {} } };
                expect(CommonUtils.getValueByPath(obj, 'a.b.c')).toBeUndefined();
            });

            test('should handle extra dots gracefully', () => {
                const obj = { a: { b: { c: 'ok' } } };
                expect(CommonUtils.getValueByPath(obj, '.a..b.c.')).toBe('ok');
            });

            test('should return undefined for invalid inputs', () => {
                expect(CommonUtils.getValueByPath(null, 'a.b')).toBeUndefined();
                expect(CommonUtils.getValueByPath({}, null)).toBeUndefined();
                expect(CommonUtils.getValueByPath({}, '')).toBeUndefined();
            });
        });

        describe('setValueByPath', () => {
            test('should set nested value and create intermediate objects', () => {
                const obj = {};
                CommonUtils.setValueByPath(obj, 'a.b.c', 456);
                expect(obj).toEqual({ a: { b: { c: 456 } } });
            });

            test('should overwrite non-object intermediate values', () => {
                const obj = { a: 'not-an-object' };
                CommonUtils.setValueByPath(obj, 'a.b', 'value');
                expect(obj).toEqual({ a: { b: 'value' } });
            });

            test('should set top-level value', () => {
                const obj = {};
                CommonUtils.setValueByPath(obj, 'root', true);
                expect(obj).toEqual({ root: true });
            });

            test('should no-op for invalid inputs', () => {
                const obj = { a: 1 };
                CommonUtils.setValueByPath(null, 'a.b', 1);
                CommonUtils.setValueByPath(obj, null, 2);
                CommonUtils.setValueByPath(obj, '', 3);
                expect(obj).toEqual({ a: 1 });
            });
        });

        describe('deleteValueByPath', () => {
            test('should delete nested leaf property', () => {
                const obj = { a: { b: { c: 1, d: 2 } } };
                CommonUtils.deleteValueByPath(obj, 'a.b.c');
                expect(obj).toEqual({ a: { b: { d: 2 } } });
            });

            test('should no-op if path does not exist', () => {
                const obj = { a: { b: { c: 1 } } };
                CommonUtils.deleteValueByPath(obj, 'a.b.missing');
                expect(obj).toEqual({ a: { b: { c: 1 } } });
            });

            test('should no-op for invalid inputs', () => {
                const obj = { a: { b: 1 } };
                CommonUtils.deleteValueByPath(null, 'a.b');
                CommonUtils.deleteValueByPath(obj, null);
                CommonUtils.deleteValueByPath(obj, '');
                expect(obj).toEqual({ a: { b: 1 } });
            });
        });
    });

    describe('sendError', () => {
        let mockReq, mockRes;

        beforeEach(() => {
            mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn().mockReturnThis(),
                redirect: jest.fn().mockReturnThis()
            };
        });

        describe('API requests (JSON responses)', () => {
            beforeEach(() => {
                mockReq = {
                    originalUrl: '/api/1/user/123'
                };
            });

            test('should return JSON response for API requests with basic parameters', () => {
                CommonUtils.sendError(mockReq, mockRes, 404, 'User not found', 'USER_NOT_FOUND');

                expect(mockRes.status).toHaveBeenCalledWith(404);
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: false,
                    error: 'User not found',
                    code: 'USER_NOT_FOUND',
                    path: '/api/1/user/123'
                });
            });

            test('should include details when provided', () => {
                CommonUtils.sendError(mockReq, mockRes, 500, 'Validation failed', 'VALIDATION_ERROR', 'Password must be at least 8 characters');

                expect(mockRes.status).toHaveBeenCalledWith(500);
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: false,
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: 'Password must be at least 8 characters',
                    path: '/api/1/user/123'
                });
            });

            test('should work without error code', () => {
                CommonUtils.sendError(mockReq, mockRes, 500, 'Internal server error');

                expect(mockRes.status).toHaveBeenCalledWith(500);
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: false,
                    error: 'Internal server error',
                    path: '/api/1/user/123'
                });
            });

            test('should work with null code and details', () => {
                CommonUtils.sendError(mockReq, mockRes, 400, 'Bad request', null, null);

                expect(mockRes.status).toHaveBeenCalledWith(400);
                expect(mockRes.json).toHaveBeenCalledWith({
                    success: false,
                    error: 'Bad request',
                    path: '/api/1/user/123'
                });
            });

            test('should handle different API paths', () => {
                mockReq.originalUrl = '/api/1/config/site';
                CommonUtils.sendError(mockReq, mockRes, 404, 'Config not found', 'CONFIG_NOT_FOUND');

                expect(mockRes.json).toHaveBeenCalledWith({
                    success: false,
                    error: 'Config not found',
                    code: 'CONFIG_NOT_FOUND',
                    path: '/api/1/config/site'
                });
            });
        });

        describe('Web requests (redirect responses)', () => {
            beforeEach(() => {
                mockReq = {
                    originalUrl: '/user/profile'
                };
            });

            test('should redirect to error page for web requests', () => {
                CommonUtils.sendError(mockReq, mockRes, 404, 'Page not found');

                expect(mockRes.redirect).toHaveBeenCalledWith('/error/index.shtml?msg=Page%20not%20found&code=404');
            });

            test('should encode special characters in error message', () => {
                CommonUtils.sendError(mockReq, mockRes, 500, 'Error with & special chars');

                expect(mockRes.redirect).toHaveBeenCalledWith('/error/index.shtml?msg=Error%20with%20%26%20special%20chars&code=500');
            });

            test('should ignore code and details parameters for web requests', () => {
                CommonUtils.sendError(mockReq, mockRes, 403, 'Access denied', 'FORBIDDEN', 'User lacks required role');

                expect(mockRes.redirect).toHaveBeenCalledWith('/error/index.shtml?msg=Access%20denied&code=403');
            });

            test('should handle different web paths', () => {
                mockReq.originalUrl = '/admin/config';
                CommonUtils.sendError(mockReq, mockRes, 401, 'Authentication required');

                expect(mockRes.redirect).toHaveBeenCalledWith('/error/index.shtml?msg=Authentication%20required&code=401');
            });
        });

        describe('Request type detection', () => {
            test('should detect API requests correctly', () => {
                const apiPaths = [
                    '/api/1/user',
                    '/api/1/config/site',
                    '/api/1/log/search',
                    '/api/1/markdown/jpulse/README.md'
                ];

                apiPaths.forEach(path => {
                    mockReq = { originalUrl: path };
                    mockRes.status.mockClear();
                    mockRes.json.mockClear();
                    mockRes.redirect.mockClear();

                    CommonUtils.sendError(mockReq, mockRes, 500, 'Test error');

                    expect(mockRes.status).toHaveBeenCalled();
                    expect(mockRes.json).toHaveBeenCalled();
                    expect(mockRes.redirect).not.toHaveBeenCalled();
                });
            });

            test('should detect web requests correctly', () => {
                const webPaths = [
                    '/user/profile',
                    '/admin/config',
                    '/home/index.shtml',
                    '/jpulse/deployment',
                    '/'
                ];

                webPaths.forEach(path => {
                    mockReq = { originalUrl: path };
                    mockRes.status.mockClear();
                    mockRes.json.mockClear();
                    mockRes.redirect.mockClear();

                    CommonUtils.sendError(mockReq, mockRes, 404, 'Test error');

                    expect(mockRes.redirect).toHaveBeenCalled();
                    expect(mockRes.status).not.toHaveBeenCalled();
                    expect(mockRes.json).not.toHaveBeenCalled();
                });
            });
        });

        describe('Error response consistency', () => {
            test('should maintain consistent JSON structure', () => {
                mockReq = { originalUrl: '/api/1/test' };

                CommonUtils.sendError(mockReq, mockRes, 400, 'Test message', 'TEST_CODE', 'Test details');

                const jsonCall = mockRes.json.mock.calls[0][0];
                expect(jsonCall).toHaveProperty('success', false);
                expect(jsonCall).toHaveProperty('error', 'Test message');
                expect(jsonCall).toHaveProperty('code', 'TEST_CODE');
                expect(jsonCall).toHaveProperty('details', 'Test details');
                expect(jsonCall).toHaveProperty('path', '/api/1/test');
            });

            test('should handle various HTTP status codes', () => {
                mockReq = { originalUrl: '/api/1/test' };
                const statusCodes = [400, 401, 403, 404, 409, 500];

                statusCodes.forEach(statusCode => {
                    mockRes.status.mockClear();
                    CommonUtils.sendError(mockReq, mockRes, statusCode, 'Test error');
                    expect(mockRes.status).toHaveBeenCalledWith(statusCode);
                });
            });
        });
    });

    describe('slugifyString', () => {
        test('should convert basic string to slug', () => {
            expect(CommonUtils.slugifyString('Hello World')).toBe('hello-world');
        });

        test('should handle punctuation as word separators', () => {
            expect(CommonUtils.slugifyString('Foo:Bar')).toBe('foo-bar');
            expect(CommonUtils.slugifyString('How to: Install')).toBe('how-to-install');
            expect(CommonUtils.slugifyString('First.Second,Third;Fourth')).toBe('first-second-third-fourth');
        });

        test('should handle accents and diacritics', () => {
            expect(CommonUtils.slugifyString('Café')).toBe('cafe');
            expect(CommonUtils.slugifyString('Zürich')).toBe('zurich');
            expect(CommonUtils.slugifyString('naïve')).toBe('naive');
            expect(CommonUtils.slugifyString('São Paulo')).toBe('sao-paulo');
        });

        test('should remove special characters', () => {
            expect(CommonUtils.slugifyString('My Site!')).toBe('my-site');
            expect(CommonUtils.slugifyString('Hello@World#Test')).toBe('hello-worldtest');  // # removed (not word separators)
            expect(CommonUtils.slugifyString('Test(123)')).toBe('test-123');
        });

        test('should collapse multiple hyphens', () => {
            expect(CommonUtils.slugifyString('hello  -  world')).toBe('hello-world');
            expect(CommonUtils.slugifyString('foo---bar')).toBe('foo-bar');
            expect(CommonUtils.slugifyString('test    spaces')).toBe('test-spaces');
        });

        test('should trim hyphens from ends', () => {
            expect(CommonUtils.slugifyString(' hello ')).toBe('hello');
            expect(CommonUtils.slugifyString('-start')).toBe('start');
            expect(CommonUtils.slugifyString('end-')).toBe('end');
            expect(CommonUtils.slugifyString('- both -')).toBe('both');
        });

        test('should handle empty and null values', () => {
            expect(CommonUtils.slugifyString('')).toBe('');
            expect(CommonUtils.slugifyString(null)).toBe('');
            expect(CommonUtils.slugifyString(undefined)).toBe('');
        });

        test('should handle non-string values', () => {
            expect(CommonUtils.slugifyString(123)).toBe('');
            expect(CommonUtils.slugifyString(true)).toBe('');
            expect(CommonUtils.slugifyString({})).toBe('');
        });

        test('should handle complex real-world examples', () => {
            expect(CommonUtils.slugifyString('BubbleMap')).toBe('bubblemap');
            expect(CommonUtils.slugifyString('jPulse Framework')).toBe('jpulse-framework');
            expect(CommonUtils.slugifyString('My Site: v2.0')).toBe('my-site-v2-0');
            expect(CommonUtils.slugifyString('User@Example.com')).toBe('user-example-com');  // Dot preserved as word separator
        });

        test('should preserve numbers', () => {
            expect(CommonUtils.slugifyString('Version 1.2.3')).toBe('version-1-2-3');
            expect(CommonUtils.slugifyString('Test123')).toBe('test123');
            expect(CommonUtils.slugifyString('2024-Report')).toBe('2024-report');
        });

        test('should handle mixed case', () => {
            expect(CommonUtils.slugifyString('CamelCase')).toBe('camelcase');
            expect(CommonUtils.slugifyString('PascalCase')).toBe('pascalcase');
            expect(CommonUtils.slugifyString('UPPERCASE')).toBe('uppercase');
            expect(CommonUtils.slugifyString('MixedCASE')).toBe('mixedcase');
        });

        test('should handle Unicode characters beyond basic Latin', () => {
            expect(CommonUtils.slugifyString('你好世界')).toBe('');  // Chinese characters removed
            expect(CommonUtils.slugifyString('Привет')).toBe('');   // Cyrillic removed
            expect(CommonUtils.slugifyString('Hello 世界')).toBe('hello');  // Mixed: keep ASCII only
        });
    });
});

// EOF webapp/tests/unit/utils/common-utils.test.js
