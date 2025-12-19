/**
 * @name            jPulse Framework / WebApp / Tests / Unit / Utils / Common Pagination
 * @tagline         Unit Tests for Pagination Utilities
 * @description     Tests for cursor-based and offset-based pagination in CommonUtils
 * @file            webapp/tests/unit/utils/common-pagination.test.js
 * @version         1.3.19
 * @release         2025-12-19
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 2.0, Claude Opus 4
 */

import CommonUtils from '../../../utils/common.js';
import { ObjectId } from 'mongodb';

describe('CommonUtils Pagination (W-080)', () => {

    // =========================================================================
    // _normalizePaginationSort Tests
    // =========================================================================
    describe('_normalizePaginationSort', () => {

        test('should default to { _id: 1 } when no sort specified', () => {
            const result = CommonUtils._normalizePaginationSort(undefined);
            expect(result).toEqual({ _id: 1 });
        });

        test('should default to { _id: 1 } when null', () => {
            const result = CommonUtils._normalizePaginationSort(null);
            expect(result).toEqual({ _id: 1 });
        });

        test('should default to { _id: 1 } when empty string', () => {
            const result = CommonUtils._normalizePaginationSort('');
            expect(result).toEqual({ _id: 1 });
        });

        test('should parse "field" as ascending', () => {
            const result = CommonUtils._normalizePaginationSort('createdAt');
            expect(result).toEqual({ createdAt: 1, _id: 1 });
        });

        test('should parse "-field" as descending', () => {
            const result = CommonUtils._normalizePaginationSort('-createdAt');
            expect(result).toEqual({ createdAt: -1, _id: -1 });
        });

        test('should parse "field:1" as ascending', () => {
            const result = CommonUtils._normalizePaginationSort('createdAt:1');
            expect(result).toEqual({ createdAt: 1, _id: 1 });
        });

        test('should parse "field:-1" as descending', () => {
            const result = CommonUtils._normalizePaginationSort('createdAt:-1');
            expect(result).toEqual({ createdAt: -1, _id: -1 });
        });

        test('should parse "field:desc" as descending', () => {
            const result = CommonUtils._normalizePaginationSort('createdAt:desc');
            expect(result).toEqual({ createdAt: -1, _id: -1 });
        });

        test('should accept object sort and add _id tiebreaker', () => {
            const result = CommonUtils._normalizePaginationSort({ username: 1 });
            expect(result).toEqual({ username: 1, _id: 1 });
        });

        test('should not duplicate _id if already present', () => {
            const result = CommonUtils._normalizePaginationSort({ createdAt: -1, _id: -1 });
            expect(result).toEqual({ createdAt: -1, _id: -1 });
        });

        test('should match _id direction with first sort field', () => {
            const result = CommonUtils._normalizePaginationSort({ username: -1 });
            expect(result).toEqual({ username: -1, _id: -1 });
        });
    });

    // =========================================================================
    // _encodePaginationCursor / _decodePaginationCursor Tests
    // =========================================================================
    describe('_encodePaginationCursor / _decodePaginationCursor', () => {

        test('should encode and decode cursor round-trip', () => {
            const original = {
                v: 1,
                q: { status: 'active' },
                s: { createdAt: -1, _id: -1 },
                l: 20,
                t: 100,
                lv: { createdAt: '2025-12-04T10:00:00Z', _id: 'abc123' },
                d: 1
            };

            const encoded = CommonUtils._encodePaginationCursor(original);
            expect(typeof encoded).toBe('string');
            expect(encoded.length).toBeGreaterThan(0);

            const decoded = CommonUtils._decodePaginationCursor(encoded);
            expect(decoded).toEqual(original);
        });

        test('should return null for null input', () => {
            expect(CommonUtils._encodePaginationCursor(null)).toBeNull();
            expect(CommonUtils._decodePaginationCursor(null)).toBeNull();
        });

        test('should return null for undefined input', () => {
            expect(CommonUtils._encodePaginationCursor(undefined)).toBeNull();
            expect(CommonUtils._decodePaginationCursor(undefined)).toBeNull();
        });

        test('should return null for non-object input', () => {
            expect(CommonUtils._encodePaginationCursor('string')).toBeNull();
            expect(CommonUtils._encodePaginationCursor(123)).toBeNull();
        });

        test('should return null for invalid Base64 string', () => {
            expect(CommonUtils._decodePaginationCursor('not-valid-base64!!!')).toBeNull();
        });

        test('should return null for valid Base64 but invalid JSON', () => {
            const invalidJson = Buffer.from('not json').toString('base64');
            expect(CommonUtils._decodePaginationCursor(invalidJson)).toBeNull();
        });

        test('should return null for cursor missing required fields', () => {
            const missingV = Buffer.from(JSON.stringify({ s: {}, l: 20 })).toString('base64');
            expect(CommonUtils._decodePaginationCursor(missingV)).toBeNull();

            const missingS = Buffer.from(JSON.stringify({ v: 1, l: 20 })).toString('base64');
            expect(CommonUtils._decodePaginationCursor(missingS)).toBeNull();

            const missingL = Buffer.from(JSON.stringify({ v: 1, s: {} })).toString('base64');
            expect(CommonUtils._decodePaginationCursor(missingL)).toBeNull();
        });
    });

    // =========================================================================
    // _buildPaginationCursorRangeQuery Tests
    // =========================================================================
    describe('_buildPaginationCursorRangeQuery', () => {

        test('should return empty object for empty sort', () => {
            const result = CommonUtils._buildPaginationCursorRangeQuery({}, { _id: 'abc' });
            expect(result).toEqual({});
        });

        test('should return empty object for null lastValues', () => {
            const result = CommonUtils._buildPaginationCursorRangeQuery({ _id: 1 }, null);
            expect(result).toEqual({});
        });

        test('should build $gt query for ascending sort (forward)', () => {
            const sort = { _id: 1 };
            const lastValues = { _id: 'abc123' };
            const result = CommonUtils._buildPaginationCursorRangeQuery(sort, lastValues, 1);

            expect(result).toEqual({
                $or: [
                    { _id: { $gt: 'abc123' } }
                ]
            });
        });

        test('should build $lt query for descending sort (forward)', () => {
            const sort = { createdAt: -1, _id: -1 };
            const lastValues = { createdAt: '2025-12-04T10:00:00Z', _id: '507f1f77bcf86cd799439011' };
            const result = CommonUtils._buildPaginationCursorRangeQuery(sort, lastValues, 1);

            // Type conversion: dates become Date objects, ObjectIds become ObjectId
            expect(result).toEqual({
                $or: [
                    { createdAt: { $lt: new Date('2025-12-04T10:00:00Z') } },
                    { createdAt: new Date('2025-12-04T10:00:00Z'), _id: { $lt: new ObjectId('507f1f77bcf86cd799439011') } }
                ]
            });
        });

        test('should build $gt query for descending sort (backward)', () => {
            const sort = { createdAt: -1, _id: -1 };
            const lastValues = { createdAt: '2025-12-04T10:00:00Z', _id: '507f1f77bcf86cd799439011' };
            const result = CommonUtils._buildPaginationCursorRangeQuery(sort, lastValues, -1);

            // Type conversion: dates become Date objects, ObjectIds become ObjectId
            expect(result).toEqual({
                $or: [
                    { createdAt: { $gt: new Date('2025-12-04T10:00:00Z') } },
                    { createdAt: new Date('2025-12-04T10:00:00Z'), _id: { $gt: new ObjectId('507f1f77bcf86cd799439011') } }
                ]
            });
        });

        test('should handle single field sort', () => {
            const sort = { createdAt: -1 };
            const lastValues = { createdAt: '2025-12-04T10:00:00Z' };
            const result = CommonUtils._buildPaginationCursorRangeQuery(sort, lastValues, 1);

            // Type conversion: date strings become Date objects
            expect(result).toEqual({
                $or: [
                    { createdAt: { $lt: new Date('2025-12-04T10:00:00Z') } }
                ]
            });
        });
    });

    // =========================================================================
    // _extractSortValues Tests
    // =========================================================================
    describe('_extractSortValues', () => {

        test('should extract values for sort keys', () => {
            const doc = {
                _id: 'abc123',
                createdAt: '2025-12-04T10:00:00Z',
                username: 'testuser',
                status: 'active'
            };
            const sort = { createdAt: -1, _id: -1 };

            const result = CommonUtils._extractSortValues(doc, sort);

            expect(result).toEqual({
                createdAt: '2025-12-04T10:00:00Z',
                _id: 'abc123'
            });
        });

        test('should handle single sort key', () => {
            const doc = { _id: 'xyz789', name: 'Test' };
            const sort = { _id: 1 };

            const result = CommonUtils._extractSortValues(doc, sort);

            expect(result).toEqual({ _id: 'xyz789' });
        });

        test('should handle undefined values in doc', () => {
            const doc = { _id: 'abc123' };
            const sort = { createdAt: -1, _id: -1 };

            const result = CommonUtils._extractSortValues(doc, sort);

            expect(result).toEqual({
                createdAt: undefined,
                _id: 'abc123'
            });
        });
    });

    // =========================================================================
    // paginatedSearch Tests (with mock collection)
    // =========================================================================
    describe('paginatedSearch', () => {

        // Create a mock MongoDB collection
        const createMockCollection = (docs) => {
            return {
                find: jest.fn().mockReturnValue({
                    sort: jest.fn().mockReturnValue({
                        skip: jest.fn().mockReturnValue({
                            limit: jest.fn().mockReturnValue({
                                toArray: jest.fn().mockResolvedValue(docs)
                            })
                        }),
                        limit: jest.fn().mockReturnValue({
                            toArray: jest.fn().mockResolvedValue(docs)
                        })
                    })
                }),
                countDocuments: jest.fn().mockResolvedValue(docs.length)
            };
        };

        test('should use cursor mode by default (no offset param)', async () => {
            const docs = [
                { _id: '1', name: 'Doc 1' },
                { _id: '2', name: 'Doc 2' }
            ];
            const mockCollection = createMockCollection(docs);

            const result = await CommonUtils.paginatedSearch(
                mockCollection,
                {},
                { limit: '10' }
            );

            expect(result.success).toBe(true);
            expect(result.pagination.mode).toBe('cursor');
            expect(result.data).toEqual(docs);
        });

        test('should use offset mode when offset param present', async () => {
            const docs = [
                { _id: '1', name: 'Doc 1' },
                { _id: '2', name: 'Doc 2' }
            ];
            const mockCollection = createMockCollection(docs);

            const result = await CommonUtils.paginatedSearch(
                mockCollection,
                {},
                { limit: '10', offset: '0' }
            );

            expect(result.success).toBe(true);
            expect(result.pagination.mode).toBe('offset');
            expect(result.pagination.offset).toBe(0);
        });

        test('should respect limit parameter', async () => {
            const docs = [{ _id: '1' }];
            const mockCollection = createMockCollection(docs);

            await CommonUtils.paginatedSearch(
                mockCollection,
                {},
                { limit: '25' }
            );

            // Check that limit+1 was used (for hasMore detection)
            const findCall = mockCollection.find.mock.results[0].value;
            const sortCall = findCall.sort.mock.results[0].value;
            expect(sortCall.limit).toHaveBeenCalledWith(26); // 25 + 1
        });

        test('should cap limit at 1000', async () => {
            const docs = [];
            const mockCollection = createMockCollection(docs);

            await CommonUtils.paginatedSearch(
                mockCollection,
                {},
                { limit: '5000' }
            );

            const findCall = mockCollection.find.mock.results[0].value;
            const sortCall = findCall.sort.mock.results[0].value;
            expect(sortCall.limit).toHaveBeenCalledWith(1001); // 1000 + 1
        });

        test('should default limit to 50', async () => {
            const docs = [];
            const mockCollection = createMockCollection(docs);

            await CommonUtils.paginatedSearch(
                mockCollection,
                {},
                {}
            );

            const findCall = mockCollection.find.mock.results[0].value;
            const sortCall = findCall.sort.mock.results[0].value;
            expect(sortCall.limit).toHaveBeenCalledWith(51); // 50 + 1
        });

        test('should include nextCursor when hasMore is true', async () => {
            // Return limit+1 docs to indicate hasMore
            const docs = Array.from({ length: 11 }, (_, i) => ({
                _id: `id${i}`,
                createdAt: `2025-12-0${i + 1}T10:00:00Z`
            }));
            const mockCollection = createMockCollection(docs);

            const result = await CommonUtils.paginatedSearch(
                mockCollection,
                {},
                { limit: '10' }
            );

            expect(result.pagination.hasMore).toBe(true);
            expect(result.pagination.nextCursor).not.toBeNull();
            expect(result.data.length).toBe(10); // Extra item removed
        });

        test('should not include nextCursor when hasMore is false', async () => {
            const docs = [{ _id: '1' }, { _id: '2' }];
            const mockCollection = createMockCollection(docs);

            const result = await CommonUtils.paginatedSearch(
                mockCollection,
                {},
                { limit: '10' }
            );

            expect(result.pagination.hasMore).toBe(false);
            expect(result.pagination.nextCursor).toBeNull();
        });

        test('should handle empty results', async () => {
            const mockCollection = createMockCollection([]);

            const result = await CommonUtils.paginatedSearch(
                mockCollection,
                {},
                {}
            );

            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
            expect(result.count).toBe(0);
            expect(result.pagination.total).toBe(0);
            expect(result.pagination.hasMore).toBe(false);
        });

        test('should apply sort correctly', async () => {
            const docs = [];
            const mockCollection = createMockCollection(docs);

            await CommonUtils.paginatedSearch(
                mockCollection,
                {},
                { sort: 'createdAt:-1' }
            );

            const findCall = mockCollection.find.mock.results[0].value;
            expect(findCall.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
        });

        test('offset mode should use skip', async () => {
            const docs = [];
            const mockCollection = createMockCollection(docs);

            await CommonUtils.paginatedSearch(
                mockCollection,
                {},
                { offset: '20', limit: '10' }
            );

            const findCall = mockCollection.find.mock.results[0].value;
            const sortCall = findCall.sort.mock.results[0].value;
            expect(sortCall.skip).toHaveBeenCalledWith(20);
        });
    });
});

// EOF webapp/tests/unit/utils/common-pagination.test.js
