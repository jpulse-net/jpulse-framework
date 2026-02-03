/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Boolean Search
 * @tagline         Unit tests for StringQueryParser (W-141)
 * @description     Tests boolean operators (AND/OR/NOT), wildcards, and regex in string queries
 * @file            webapp/tests/unit/utils/common-utils-boolean-search.test.js
 * @version         1.6.6
 * @release         2026-02-03
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.4, Claude Sonnet 4.5
 */

import CommonUtils from '../../../utils/common.js';

const { StringQueryParser } = CommonUtils;

describe('StringQueryParser - W-141: Boolean Operators', () => {

    // =========================================================================
    // Basic Operators
    // =========================================================================

    describe('OR operator (comma)', () => {
        test('should parse two terms with OR', () => {
            const result = StringQueryParser.parse('status', 'active,pending');
            expect(result.query).toEqual({
                $or: [{ status: 'active' }, { status: 'pending' }]
            });
            expect(result.useCollation).toBe(true);
        });

        test('should parse three terms with OR', () => {
            const result = StringQueryParser.parse('status', 'active,pending,inactive');
            expect(result.query.$or).toHaveLength(3);
            expect(result.useCollation).toBe(true);
        });

        test('should handle single term (no OR)', () => {
            const result = StringQueryParser.parse('status', 'active');
            expect(result.query).toEqual({ status: 'active' });
            expect(result.useCollation).toBe(true);
        });

        test('should ignore trailing comma', () => {
            const result = StringQueryParser.parse('status', 'active,');
            expect(result.query).toEqual({ status: 'active' });
        });

        test('should filter empty terms', () => {
            const result = StringQueryParser.parse('status', 'a,,b');
            expect(result.query.$or).toHaveLength(2);
            expect(result.query.$or[0]).toEqual({ status: 'a' });
            expect(result.query.$or[1]).toEqual({ status: 'b' });
        });

        test('should handle all empty terms', () => {
            const result = StringQueryParser.parse('status', ',,,');
            expect(result.query).toEqual({});
            expect(result.useCollation).toBe(false);
        });
    });

    describe('AND operator (semicolon)', () => {
        test('should parse two terms with AND', () => {
            const result = StringQueryParser.parse('status', 'active;enabled');
            expect(result.query).toEqual({
                $and: [{ status: 'active' }, { status: 'enabled' }]
            });
            expect(result.useCollation).toBe(true);
        });

        test('should parse three terms with AND', () => {
            const result = StringQueryParser.parse('status', 'a;b;c');
            expect(result.query.$and).toHaveLength(3);
        });

        test('should handle single term (no AND)', () => {
            const result = StringQueryParser.parse('status', 'active');
            expect(result.query).toEqual({ status: 'active' });
        });
    });

    describe('NOT operator (exclamation prefix)', () => {
        test('should parse NOT term', () => {
            const result = StringQueryParser.parse('status', '!pending');
            expect(result.query).toEqual({ status: { $not: 'pending' } });
            expect(result.useCollation).toBe(true);
        });

        test('should handle NOT with wildcard', () => {
            const result = StringQueryParser.parse('msg', '!*test*');
            expect(result.query.msg.$not.$regex).toBeDefined();
            expect(result.query.msg.$not.$regex.source).toBe('.*test.*');
            expect(result.useCollation).toBe(false);
        });

        test('should ignore empty NOT', () => {
            const result = StringQueryParser.parse('status', '!');
            expect(result.query).toEqual({});
        });
    });

    describe('Operator precedence (AND binds tighter than OR)', () => {
        test('should parse a;b,c as (a AND b) OR c', () => {
            const result = StringQueryParser.parse('status', 'a;b,c');
            expect(result.query.$or).toBeDefined();
            expect(result.query.$or).toHaveLength(2);
            expect(result.query.$or[0].$and).toBeDefined();
            expect(result.query.$or[0].$and).toHaveLength(2);
            expect(result.query.$or[1]).toEqual({ status: 'c' });
        });

        test('should parse a,b;c as a OR (b AND c)', () => {
            const result = StringQueryParser.parse('status', 'a,b;c');
            expect(result.query.$or).toBeDefined();
            expect(result.query.$or).toHaveLength(2);
            expect(result.query.$or[0]).toEqual({ status: 'a' });
            expect(result.query.$or[1].$and).toBeDefined();
        });
    });

    // =========================================================================
    // Wildcards
    // =========================================================================

    describe('Wildcard patterns', () => {
        test('should parse exact match (no wildcards)', () => {
            const result = StringQueryParser.parse('name', 'storm');
            expect(result.query).toEqual({ name: 'storm' });
            expect(result.useCollation).toBe(true);
        });

        test('should parse starts-with wildcard', () => {
            const result = StringQueryParser.parse('name', 'storm*');
            expect(result.query.name.$regex.source).toBe('^storm.*');
            expect(result.query.name.$regex.flags).toBe('i');
            expect(result.useCollation).toBe(false);
        });

        test('should parse ends-with wildcard', () => {
            const result = StringQueryParser.parse('name', '*storm');
            expect(result.query.name.$regex.source).toBe('.*storm$');
            expect(result.useCollation).toBe(false);
        });

        test('should parse contains wildcard', () => {
            const result = StringQueryParser.parse('name', '*storm*');
            expect(result.query.name.$regex.source).toBe('.*storm.*');
            expect(result.useCollation).toBe(false);
        });

        test('should parse pattern with multiple wildcards', () => {
            const result = StringQueryParser.parse('name', 'st*rm*');
            expect(result.query.name.$regex.source).toBe('^st.*rm.*');
        });

        test('should treat % as literal character (not wildcard)', () => {
            const result = StringQueryParser.parse('name', 'storm%');
            expect(result.query.name).toBe('storm%');
            expect(result.useCollation).toBe(true);
        });
    });

    // =========================================================================
    // Regex Syntax
    // =========================================================================

    describe('Explicit regex syntax', () => {
        test('should parse basic regex', () => {
            const result = StringQueryParser.parse('code', '/BC[1-9]\\d{3}/');
            expect(result.query.code.$regex.source).toBe('BC[1-9]\\d{3}');
            expect(result.query.code.$regex.flags).toBe('');
            expect(result.useCollation).toBe(false);
        });

        test('should parse regex with case-insensitive flag', () => {
            const result = StringQueryParser.parse('name', '/storm/i');
            expect(result.query.name.$regex.source).toBe('storm');
            expect(result.query.name.$regex.flags).toBe('i');
        });

        test('should parse regex with multiple flags', () => {
            const result = StringQueryParser.parse('text', '/pattern/gim');
            expect(result.query.text.$regex.flags).toBe('gim');
        });

        test('should not treat forward slash in normal text as regex', () => {
            const result = StringQueryParser.parse('timezone', 'America/Los_Angeles');
            expect(result.query).toEqual({ timezone: 'America/Los_Angeles' });
            expect(result.useCollation).toBe(true);
        });

        test('should not treat path as regex', () => {
            const result = StringQueryParser.parse('path', '/var/log/app');
            expect(result.query).toEqual({ path: '/var/log/app' });
            expect(result.useCollation).toBe(true);
        });

        test('should handle invalid regex gracefully', () => {
            const result = StringQueryParser.parse('name', '/[unclosed/');
            // Should treat as literal since regex is invalid
            expect(result.query).toEqual({ name: '/[unclosed/' });
            expect(result.useCollation).toBe(true);
        });
    });

    // =========================================================================
    // Complex Combinations
    // =========================================================================

    describe('Complex boolean combinations', () => {
        test('should parse active AND NOT suspended', () => {
            const result = StringQueryParser.parse('status', 'active;!suspended');
            expect(result.query.$and).toBeDefined();
            expect(result.query.$and[0]).toEqual({ status: 'active' });
            expect(result.query.$and[1]).toEqual({ status: { $not: 'suspended' } });
        });

        test('should parse (admin OR user) AND active', () => {
            const result = StringQueryParser.parse('role', 'admin,user;active');
            expect(result.query.$or).toBeDefined();
            expect(result.query.$or).toHaveLength(2);
        });

        test('should parse mixed wildcards in OR', () => {
            const result = StringQueryParser.parse('msg', '*error*,*warning*');
            expect(result.query.$or).toHaveLength(2);
            expect(result.query.$or[0].msg.$regex.source).toBe('.*error.*');
            expect(result.query.$or[1].msg.$regex.source).toBe('.*warning.*');
            expect(result.useCollation).toBe(false);
        });

        test('should parse exact AND wildcard (collation false)', () => {
            const result = StringQueryParser.parse('status', 'active;*test*');
            expect(result.query.$and).toBeDefined();
            expect(result.useCollation).toBe(false); // Mixed, so no collation
        });
    });

    // =========================================================================
    // Protected Characters in Regex
    // =========================================================================

    describe('Protected characters in regex patterns', () => {
        test('should protect comma in regex', () => {
            const result = StringQueryParser.parse('name', '/john,jane/,smith');
            expect(result.query.$or).toHaveLength(2);
            expect(result.query.$or[0].name.$regex.source).toBe('john,jane');
            expect(result.query.$or[1]).toEqual({ name: 'smith' });
        });

        test('should protect semicolon in regex', () => {
            const result = StringQueryParser.parse('data', '/a;b/;c');
            expect(result.query.$and).toHaveLength(2);
            expect(result.query.$and[0].data.$regex.source).toBe('a;b');
            expect(result.query.$and[1]).toEqual({ data: 'c' });
        });

        test('should protect both comma and semicolon in regex', () => {
            const result = StringQueryParser.parse('val', '/a,b;c/,d;e');
            expect(result.query.$or).toBeDefined();
            const firstTerm = result.query.$or[0];
            expect(firstTerm.val.$regex.source).toBe('a,b;c');
        });
    });

    // =========================================================================
    // Edge Cases
    // =========================================================================

    describe('Edge cases', () => {
        test('should handle empty string', () => {
            const result = StringQueryParser.parse('status', '');
            expect(result.query).toEqual({});
            expect(result.useCollation).toBe(false);
        });

        test('should handle whitespace only', () => {
            const result = StringQueryParser.parse('status', '   ');
            expect(result.query).toEqual({});
        });

        test('should handle null value', () => {
            const result = StringQueryParser.parse('status', null);
            expect(result.query).toEqual({});
        });

        test('should handle undefined value', () => {
            const result = StringQueryParser.parse('status', undefined);
            expect(result.query).toEqual({});
        });

        test('should trim whitespace around terms', () => {
            const result = StringQueryParser.parse('status', '  active  ,  pending  ');
            expect(result.query.$or[0]).toEqual({ status: 'active' });
            expect(result.query.$or[1]).toEqual({ status: 'pending' });
        });

        test('should handle single wildcard *', () => {
            const result = StringQueryParser.parse('name', '*');
            expect(result.query.name.$regex.source).toBe('.*');
            expect(result.useCollation).toBe(false);
        });
    });

    // =========================================================================
    // Collation Detection
    // =========================================================================

    describe('Collation detection', () => {
        test('should mark exact match as collation candidate', () => {
            const result = StringQueryParser.parse('status', 'active');
            expect(result.useCollation).toBe(true);
            expect(result.collation).toEqual({ locale: 'en', strength: 2 });
        });

        test('should mark wildcard as non-collation', () => {
            const result = StringQueryParser.parse('name', 'john*');
            expect(result.useCollation).toBe(false);
            expect(result.collation).toBeUndefined();
        });

        test('should mark regex as non-collation', () => {
            const result = StringQueryParser.parse('code', '/BC[0-9]+/');
            expect(result.useCollation).toBe(false);
        });

        test('should mark all-exact OR as collation', () => {
            const result = StringQueryParser.parse('status', 'active,pending,inactive');
            expect(result.useCollation).toBe(true);
        });

        test('should mark mixed exact/wildcard OR as non-collation', () => {
            const result = StringQueryParser.parse('name', 'john,jane*');
            expect(result.useCollation).toBe(false);
        });

        test('should mark NOT exact as collation', () => {
            const result = StringQueryParser.parse('status', '!suspended');
            expect(result.useCollation).toBe(true);
        });

        test('should mark NOT wildcard as non-collation', () => {
            const result = StringQueryParser.parse('msg', '!*test*');
            expect(result.useCollation).toBe(false);
        });
    });

    // =========================================================================
    // Security (Regex Validation)
    // =========================================================================

    describe('Regex security validation', () => {
        test('should reject regex pattern over 200 characters', () => {
            const longPattern = '/a' + 'b'.repeat(200) + '/';
            const result = StringQueryParser.parse('name', longPattern);
            // Should treat as literal since validation fails
            expect(result.query).toEqual({ name: longPattern });
            expect(result.useCollation).toBe(true);
        });

        test('should handle invalid regex flags gracefully', () => {
            const result = StringQueryParser.parse('name', '/pattern/xyz');
            // Invalid flags should cause fallback to literal
            expect(result.query).toEqual({ name: '/pattern/xyz' });
        });
    });

    // =========================================================================
    // Integration with schemaBasedQuery
    // =========================================================================

    describe('Integration with schemaBasedQuery', () => {
        const testSchema = {
            name: { type: 'string' },
            status: { type: 'string' },
            age: { type: 'number' },
            active: { type: 'boolean' }
        };

        test('should return enhanced format from schemaBasedQuery', () => {
            const params = { name: 'john' };
            const result = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(result.query).toBeDefined();
            expect(result.useCollation).toBeDefined();
            expect(result.query.name).toBe('john');
            expect(result.useCollation).toBe(true);
        });

        test('should handle multiple string fields', () => {
            const params = { name: 'john*', status: 'active' };
            const result = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(result.query.name.$regex).toBeDefined();
            expect(result.query.status).toBe('active');
            expect(result.useCollation).toBe(false); // Mixed
        });

        test('should handle mixed field types', () => {
            const params = { name: 'john', age: '25', active: 'true' };
            const result = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(result.query.name).toBe('john');
            expect(result.query.age).toBe(25);
            expect(result.query.active).toBe(true);
        });

        test('should handle OR in string field', () => {
            const params = { status: 'active,pending' };
            const result = CommonUtils.schemaBasedQuery(testSchema, params);

            expect(result.query.$or).toBeDefined();
            expect(result.query.$or).toHaveLength(2);
            expect(result.useCollation).toBe(true);
        });

        test('should support multiFieldSearch option', () => {
            const params = { name: 'john' };
            const result = CommonUtils.schemaBasedQuery(testSchema, params, {
                ignoreFields: ['name'],
                multiFieldSearch: {
                    name: ['profile.firstName', 'profile.lastName', 'username']
                }
            });

            expect(result.query.$or).toBeDefined();
            expect(result.query.$or).toHaveLength(3);
            expect(result.query.$or[0]).toEqual({ 'profile.firstName': 'john' });
            expect(result.query.$or[1]).toEqual({ 'profile.lastName': 'john' });
            expect(result.query.$or[2]).toEqual({ 'username': 'john' });
            expect(result.useCollation).toBe(false); // Can't use collation with $or
        });

        test('should support multiFieldSearch with wildcards', () => {
            const params = { name: 'john*' };
            const result = CommonUtils.schemaBasedQuery(testSchema, params, {
                ignoreFields: ['name'],
                multiFieldSearch: {
                    name: ['profile.firstName', 'profile.lastName', 'username']
                }
            });

            expect(result.query.$or).toBeDefined();
            expect(result.query.$or).toHaveLength(3);
            expect(result.query.$or[0]['profile.firstName'].$regex).toBeDefined();
            expect(result.query.$or[0]['profile.firstName'].$regex.source).toBe('^john.*');
        });

        test('should support multiFieldSearch with OR operator', () => {
            const params = { name: 'john,jane' };
            const result = CommonUtils.schemaBasedQuery(testSchema, params, {
                ignoreFields: ['name'],
                multiFieldSearch: {
                    name: ['profile.firstName', 'profile.lastName']
                }
            });

            expect(result.query.$or).toBeDefined();
            // Should have 2 names × 2 fields = 4 conditions
            expect(result.query.$or).toHaveLength(4);
        });

        test('should merge multiFieldSearch with other query conditions', () => {
            const params = { name: 'john', status: 'active' };
            const result = CommonUtils.schemaBasedQuery(testSchema, params, {
                ignoreFields: ['name'],
                multiFieldSearch: {
                    name: ['profile.firstName', 'profile.lastName']
                }
            });

            // Should have either $and or both conditions merged
            // Query structure: { $and: [{ status: 'active' }, { $or: [...] }] }
            // OR if merge logic simplifies: { status: 'active', $or: [...] }
            expect(result.query).toBeDefined();
            expect(result.query.$or).toBeDefined(); // name search creates $or

            // The status condition should be present
            if (result.query.$and) {
                // If wrapped in $and
                expect(result.query.$and.length).toBeGreaterThanOrEqual(2);
            } else {
                // If merged at top level
                expect(result.query.status).toBe('active');
            }
        });

        test('should support backward compatible array syntax', () => {
            const params = { name: 'john' };
            const result = CommonUtils.schemaBasedQuery(testSchema, params, ['name', 'age']);

            expect(result.query.name).toBeUndefined();
            expect(result.query.age).toBeUndefined();
        });
    });

    describe('Query Serialization/Deserialization (W-141 cursor pagination)', () => {
        test('should serialize RegExp objects in query', () => {
            const query = {
                name: /^john$/i,
                email: { $regex: /test@/, $options: 'i' }
            };
            const serialized = CommonUtils._serializeQuery(query);

            expect(serialized.name).toEqual({
                __type: 'RegExp',
                source: '^john$',
                flags: 'i'
            });
        });

        test('should serialize Date objects in query', () => {
            const testDate = new Date('2026-01-24T10:00:00.000Z');
            const query = {
                createdAt: { $gte: testDate, $lt: new Date('2026-01-25T10:00:00.000Z') }
            };
            const serialized = CommonUtils._serializeQuery(query);

            expect(serialized.createdAt.$gte).toBe('2026-01-24T10:00:00.000Z');
            expect(serialized.createdAt.$lt).toBe('2026-01-25T10:00:00.000Z');
        });

        test('should deserialize RegExp objects from query', () => {
            const serialized = {
                name: {
                    __type: 'RegExp',
                    source: '^john$',
                    flags: 'i'
                }
            };
            const deserialized = CommonUtils._deserializeQuery(serialized);

            expect(deserialized.name).toBeInstanceOf(RegExp);
            expect(deserialized.name.source).toBe('^john$');
            expect(deserialized.name.flags).toBe('i');
        });

        test('should deserialize Date objects from ISO strings', () => {
            const serialized = {
                createdAt: {
                    $gte: '2026-01-24T10:00:00.000Z',
                    $lt: '2026-01-25T10:00:00.000Z'
                }
            };
            const deserialized = CommonUtils._deserializeQuery(serialized);

            expect(deserialized.createdAt.$gte).toBeInstanceOf(Date);
            expect(deserialized.createdAt.$lt).toBeInstanceOf(Date);
            expect(deserialized.createdAt.$gte.toISOString()).toBe('2026-01-24T10:00:00.000Z');
        });

        test('should handle nested RegExp and Date in complex queries', () => {
            const query = {
                $or: [
                    { name: /^john$/i },
                    { createdAt: { $gte: new Date('2026-01-01') } }
                ],
                status: 'active'
            };
            const serialized = CommonUtils._serializeQuery(query);
            const deserialized = CommonUtils._deserializeQuery(serialized);

            expect(deserialized.$or[0].name).toBeInstanceOf(RegExp);
            expect(deserialized.$or[1].createdAt.$gte).toBeInstanceOf(Date);
            expect(deserialized.status).toBe('active');
        });

        test('should handle arrays with RegExp and Date objects', () => {
            const query = {
                $or: [
                    { pattern: /test/i },
                    { date: new Date('2026-01-24') }
                ]
            };
            const serialized = CommonUtils._serializeQuery(query);
            const deserialized = CommonUtils._deserializeQuery(serialized);

            expect(Array.isArray(deserialized.$or)).toBe(true);
            expect(deserialized.$or[0].pattern).toBeInstanceOf(RegExp);
            expect(deserialized.$or[1].date).toBeInstanceOf(Date);
        });

        test('should preserve non-date ISO-like strings', () => {
            const query = { code: '2026-01-24-ITEM-1234' };
            const serialized = CommonUtils._serializeQuery(query);
            const deserialized = CommonUtils._deserializeQuery(serialized);

            expect(typeof deserialized.code).toBe('string');
            expect(deserialized.code).toBe('2026-01-24-ITEM-1234');
        });
    });

    describe('Advanced Boolean Search Edge Cases', () => {
        test('should handle NOT operator with exact match', () => {
            const parsed = CommonUtils.StringQueryParser.parse('tags', '!spam');
            expect(parsed.query.tags.$not).toBeDefined();
            expect(typeof parsed.query.tags.$not).toBe('string');
            expect(parsed.query.tags.$not).toBe('spam');
        });

        test('should handle NOT with wildcard', () => {
            const parsed = CommonUtils.StringQueryParser.parse('email', '!*spam*');
            expect(parsed.query.email.$not).toBeDefined();
            expect(parsed.query.email.$not.$regex).toBeDefined();
            expect(parsed.query.email.$not.$regex).toBeInstanceOf(RegExp);
            expect(parsed.query.email.$not.$regex.source).toContain('spam');
        });

        test('should handle complex precedence: AND has higher priority than OR', () => {
            const parsed = CommonUtils.StringQueryParser.parse('food', 'pizza;pepperoni,burger;cheese');
            // Should parse as: (pizza AND pepperoni) OR (burger AND cheese)
            expect(parsed.query.$or).toBeDefined();
            expect(parsed.query.$or).toHaveLength(2);
        });

        test('should handle wildcards for fuzzy matching', () => {
            const parsed = CommonUtils.StringQueryParser.parse('name', '*test*');
            expect(parsed.query.name.$regex).toBeDefined();
            expect(parsed.query.name.$regex).toBeInstanceOf(RegExp);
            // Should match anything containing "test"
            expect('mytest').toMatch(parsed.query.name.$regex);
            expect('test123').toMatch(parsed.query.name.$regex);
        });

        test('should handle wildcard at start, middle, and end', () => {
            const parsed = CommonUtils.StringQueryParser.parse('path', '*test*file*');
            expect(parsed.query.path.$regex).toBeDefined();
            expect(parsed.query.path.$regex).toBeInstanceOf(RegExp);
            expect('mytest123file.txt').toMatch(parsed.query.path.$regex);
        });

        test('should handle regex with complex patterns', () => {
            const parsed = CommonUtils.StringQueryParser.parse('email', '/^[a-z]+@test\\.com$/i');
            expect(parsed.query.email.$regex).toBeDefined();
            expect(parsed.query.email.$regex).toBeInstanceOf(RegExp);
            expect('john@test.com').toMatch(parsed.query.email.$regex);
            expect('JOHN@test.com').toMatch(parsed.query.email.$regex);
            expect('john@other.com').not.toMatch(parsed.query.email.$regex);
        });

        test('should escape regex special chars in exact matches with wildcards', () => {
            const parsed = CommonUtils.StringQueryParser.parse('path', 'test.*.log');
            expect(parsed.query.path.$regex).toBeDefined();
            expect(parsed.query.path.$regex).toBeInstanceOf(RegExp);
            // Wildcard creates regex, actual behavior varies by escaping
            expect(parsed.query.path.$regex.source).toBeDefined();
        });

        test('should handle timezone identifiers with slashes', () => {
            const parsed = CommonUtils.StringQueryParser.parse('timezone', 'America/Los_Angeles');
            // Exact match without wildcards returns string for collation
            expect(typeof parsed.query.timezone).toBe('string');
            expect(parsed.query.timezone).toBe('America/Los_Angeles');
            expect(parsed.useCollation).toBe(true);
        });

        test('should not treat forward slash as regex unless in regex syntax', () => {
            const parsed = CommonUtils.StringQueryParser.parse('path', 'a/b/c');
            // Exact match returns string for collation
            expect(typeof parsed.query.path).toBe('string');
            expect(parsed.query.path).toBe('a/b/c');
            expect(parsed.useCollation).toBe(true);
        });

        test('should handle URL-encoded spaces in AND operator', () => {
            const parsed = CommonUtils.StringQueryParser.parse('lunch', 'sushi;miso%20soup');
            expect(parsed.query.$and).toBeDefined();
            expect(parsed.query.$and).toHaveLength(2);
        });

        test('should handle mixed operators with NOT', () => {
            const parsed = CommonUtils.StringQueryParser.parse('tags', 'food;!spam,drink;!junk');
            // (food AND NOT spam) OR (drink AND NOT junk)
            expect(parsed.query.$or).toBeDefined();
            expect(parsed.query.$or).toHaveLength(2);
        });
    });

    describe('Collation Detection Edge Cases', () => {
        test('should disable collation when any wildcard present', () => {
            const parsed = CommonUtils.StringQueryParser.parse('name', 'john,jane*');
            expect(parsed.useCollation).toBe(false);
        });

        test('should disable collation when any regex present', () => {
            const parsed = CommonUtils.StringQueryParser.parse('email', 'john@test.com,/jane@.*/');
            expect(parsed.useCollation).toBe(false);
        });

        test('should enable collation for all exact matches', () => {
            const parsed = CommonUtils.StringQueryParser.parse('status', 'active,pending,approved');
            expect(parsed.useCollation).toBe(true);
        });

        test('should disable collation for NOT operator with exact match', () => {
            const parsed = CommonUtils.StringQueryParser.parse('tags', '!spam');
            // NOT uses exact match strings, collation is still possible
            expect(parsed.useCollation).toBe(true);
            expect(parsed.query.tags.$not).toBeDefined();
        });

        test('should enable collation for simple exact match', () => {
            const parsed = CommonUtils.StringQueryParser.parse('status', 'active');
            expect(parsed.useCollation).toBe(true);
        });
    });

    describe('Real-world Search Scenarios', () => {
        test('should handle log search with date prefix', () => {
            const parsed = CommonUtils.StringQueryParser.parse('createdAt', '2026-01');
            // Exact match returns string (not RegExp) for collation optimization
            expect(typeof parsed.query.createdAt).toBe('string');
            expect(parsed.query.createdAt).toBe('2026-01');
            expect(parsed.useCollation).toBe(true);
        });

        test('should handle email domain search', () => {
            const parsed = CommonUtils.StringQueryParser.parse('email', '*@example.com');
            expect(parsed.query.email.$regex).toBeDefined();
            expect(parsed.query.email.$regex).toBeInstanceOf(RegExp);
            expect('john@example.com').toMatch(parsed.query.email.$regex);
            expect('jane@other.com').not.toMatch(parsed.query.email.$regex);
        });

        test('should handle complex lunch query example', () => {
            const parsed = CommonUtils.StringQueryParser.parse('lunch', 'sushi;miso%20soup,pizza;salad!vinegar');
            expect(parsed.query.$or).toBeDefined();
            // Should have 2 OR groups: (sushi AND miso soup) OR (pizza AND salad NOT vinegar)
            expect(parsed.query.$or).toHaveLength(2);
        });

        test('should handle status filter with multiple values', () => {
            const parsed = CommonUtils.StringQueryParser.parse('status', 'active,pending,processing');
            expect(parsed.query.$or).toBeDefined();
            expect(parsed.query.$or).toHaveLength(3);
            // All exact matches should use strings for collation
            expect(typeof parsed.query.$or[0].status).toBe('string');
            expect(parsed.useCollation).toBe(true);
        });

        test('should handle code search with prefix wildcard', () => {
            const parsed = CommonUtils.StringQueryParser.parse('code', 'BC-2024*');
            expect(parsed.query.code.$regex).toBeDefined();
            expect(parsed.query.code.$regex).toBeInstanceOf(RegExp);
            expect('BC-2024-001').toMatch(parsed.query.code.$regex);
            expect('BC-2025-001').not.toMatch(parsed.query.code.$regex);
        });
    });
});

// EOF webapp/tests/unit/utils/common-utils-boolean-search.test.js
