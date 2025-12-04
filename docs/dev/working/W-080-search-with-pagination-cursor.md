# W-080: Search API with Cursor-Based Pagination

## Status
✅ DONE

## Type
Feature

## Objective
Implement cursor-based pagination for search APIs that provides:
- Consistent results (no duplicates or gaps when data changes between pages)
- Better performance at scale (avoids MongoDB `skip()` overhead)
- Stateless interface (cursor contains all query state)

## Reference
- https://medium.com/swlh/mongodb-pagination-fast-consistent-ece2a97070f3

---

## Design Decisions

### Default Mode: Cursor-Based
- **Cursor-based** is the default for all search APIs
- **Offset-based** is opt-in when `offset` parameter is present
- Rationale: Modern API pattern, better performance, consistent results

### Parameter Design

| Parameter | Description | Mode |
|-----------|-------------|------|
| `limit`  | Number of items per page (default: 50, max: 1000) | Both |
| `sort`   | Sort field and direction (e.g., `createdAt:-1`) | Both |
| `cursor` | Opaque pagination token | Cursor mode |
| `offset` | Skip N items (presence triggers offset mode) | Offset mode |

**Removed parameters**: `skip` (duplicate of offset), `page` (clients can compute)

### Detection Logic
```javascript
if (queryParams.offset !== undefined) {
    // Offset mode: presence of offset parameter
    return offsetBasedSearch(queryParams, options);
} else if (queryParams.cursor) {
    // Cursor mode: decode and continue pagination
    return cursorBasedSearch(queryParams, options);
} else {
    // Cursor mode: first page (default)
    return cursorBasedSearch(queryParams, options);
}
```

---

## Cursor Structure

Base64-encoded JSON blob containing query state:

```javascript
{
    "v": 1,                              // Cursor version for future compatibility
    "q": { "role": "user" },             // Original query
    "s": { "createdAt": -1, "_id": -1 }, // Sort object (with _id tiebreaker)
    "f": ["_id", "username", "email"],   // Return fields (projection)
    "l": 20,                             // Limit per page
    "t": 1547,                           // Total count (from first call)
    "lv": {                              // Last values for sort keys
        "createdAt": "2025-12-04T10:00:00.000Z",
        "_id": "674f5a8c..."
    },
    "d": 1                               // Direction: 1=forward, -1=backward
}
```

### Cursor Encoding
- Encode: `Buffer.from(JSON.stringify(cursorData)).toString('base64')`
- Decode: `JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'))`
- Optional: Add HMAC checksum for tamper detection

---

## API Request Examples

### Cursor-Based (Default)

```bash
# First page
GET /api/1/user/search?limit=20&sort=createdAt:-1&role=user

# Next page (using returned cursor)
GET /api/1/user/search?cursor=eyJ2IjoxLCJxIjp7InJvbGUiOiJ1c2VyIn0sLi4ufQ==

# Previous page (using returned prevCursor)
GET /api/1/user/search?cursor=eyJ2IjoxLCJkIjotMSwuLi59
```

### Offset-Based (Opt-In)

```bash
# Page 1
GET /api/1/user/search?limit=20&offset=0&sort=createdAt:-1&role=user

# Page 3
GET /api/1/user/search?limit=20&offset=20&sort=createdAt:-1&role=user
```

---

## API Response Structure

### Cursor-Based Response

```javascript
{
    "success": true,
    "data": [...],           // Array of documents
    "count": 20,             // Items returned this page
    "pagination": {
        "mode": "cursor",
        "total": 1547,       // From countDocuments() on first call, cached in cursor
        "limit": 20,
        "hasMore": true,
        "nextCursor": "eyJ2IjoxLC4uLn0",   // For next page
        "prevCursor": "eyJ2IjoxLC4uLn0"    // For previous page (null on first page)
    }
}
```

### Offset-Based Response

```javascript
{
    "success": true,
    "data": [...],
    "count": 20,
    "pagination": {
        "mode": "offset",
        "total": 1547,       // countDocuments() on every call
        "limit": 20,
        "offset": 40,
        "hasMore": true
    }
}
```

---

## Implementation Details

### Sort Key Requirements

1. **Always add `_id` as tiebreaker** to ensure unique ordering:
   ```javascript
   // User requests: sort=createdAt:-1
   // Internal sort: { createdAt: -1, _id: -1 }
   ```

2. **Default sort**: `{ _id: 1 }` when no sort specified

### Range Query for Next Page

For descending sort `{ createdAt: -1, _id: -1 }`:

```javascript
{
    $or: [
        { createdAt: { $lt: lastCreatedAt } },
        { createdAt: lastCreatedAt, _id: { $lt: lastId } }
    ]
}
```

For ascending sort `{ createdAt: 1, _id: 1 }`:

```javascript
{
    $or: [
        { createdAt: { $gt: lastCreatedAt } },
        { createdAt: lastCreatedAt, _id: { $gt: lastId } }
    ]
}
```

### Fetch limit + 1 for hasMore Detection

```javascript
const results = await collection.find(query)
    .sort(sort)
    .limit(limit + 1)  // Fetch one extra
    .toArray();

const hasMore = results.length > limit;
if (hasMore) {
    results.pop();  // Remove the extra item
}
```

### Total Count Optimization

- Run `countDocuments()` only on **first cursor request**
- Embed total in cursor for subsequent pages
- Note: Total becomes "stale" if data changes (acceptable for most UIs)

---

## Index Recommendations

Create compound indexes matching sort patterns:

```javascript
// For sort by createdAt descending
db.collection.createIndex({ createdAt: -1, _id: -1 })

// For sort by username ascending
db.collection.createIndex({ username: 1, _id: 1 })
```

---

## Affected Files

### New/Modified Utilities
- `webapp/utils/common.js` (NO model imports - models pass collection):

  **Public API (1 function):**
  - `paginatedSearch(collection, query, queryParams, options)` - Main entry point

  **Private helpers (7 functions - "_" prefix):**
  - `_paginatedOffsetSearch()` - Internal: offset-based search
  - `_paginatedCursorSearch()` - Internal: cursor-based search
  - `_extractSortValues()` - Internal: extract sort field values from doc
  - `_encodePaginationCursor()` - Internal: encode cursor to Base64
  - `_decodePaginationCursor()` - Internal: decode and validate cursor
  - `_buildPaginationCursorRangeQuery()` - Internal: build $or range query
  - `_normalizePaginationSort()` - Internal: parse sort, add _id tiebreaker

### Modified Models
- `webapp/model/user.js` - Update `search()` method
- `webapp/model/log.js` - Update `search()` method
- `webapp/model/config.js` - Update `search()` method (if applicable)
- `webapp/model/plugin.js` - Update `search()` method (if applicable)

### Modified Views (Admin UI)
- `webapp/view/admin/users.shtml` - Update pagination UI
  - Remove page number buttons
  - Use Prev/Next with cursor tokens
  - Display "Showing 1-20 of 1547"
- `webapp/view/admin/logs.shtml` - Update pagination UI
  - Already has Prev/Next only
  - Switch from page-based to cursor-based API calls

### Documentation
- `docs/api-reference.md` - Document new pagination parameters

---

## Migration Notes

- **Breaking change**: `skip` and `page` parameters removed
- **Breaking change**: Default pagination mode is now cursor-based
- Site developers using offset-based must add `offset` parameter
- Response structure adds `pagination.mode` field

---

## Testing Requirements

### Unit Tests
- [ ] Cursor encoding/decoding
- [ ] Range query building for ascending/descending sorts
- [ ] hasMore detection with limit+1
- [ ] Total count caching in cursor
- [ ] Mode detection (cursor vs offset)

### Integration Tests
- [ ] First page cursor request
- [ ] Next page with cursor
- [ ] Previous page with cursor
- [ ] Offset mode opt-in
- [ ] Data consistency across pages
- [ ] Large dataset performance

---

## Implementation Plan

### Phase 1: Core Cursor Utilities (webapp/utils/common.js)

**Goal**: Add cursor encoding/decoding and range query utilities

**Step 1.1**: Add `_encodePaginationCursor(cursorData)` (private)
```javascript
/**
 * Encode pagination cursor to Base64 string
 * @private
 * @param {object} cursorData - Cursor data object
 * @returns {string} Base64-encoded cursor string
 */
static _encodePaginationCursor(cursorData) {
    if (!cursorData || typeof cursorData !== 'object') {
        return null;
    }
    try {
        return Buffer.from(JSON.stringify(cursorData)).toString('base64');
    } catch (error) {
        return null;
    }
}
```

**Step 1.2**: Add `_decodePaginationCursor(cursorString)` (private)
```javascript
/**
 * Decode and validate pagination cursor from Base64 string
 * @private
 * @param {string} cursorString - Base64-encoded cursor string
 * @returns {object|null} Decoded cursor data or null if invalid
 */
static _decodePaginationCursor(cursorString) {
    if (!cursorString || typeof cursorString !== 'string') {
        return null;
    }
    try {
        const decoded = JSON.parse(Buffer.from(cursorString, 'base64').toString('utf8'));
        // Validate required fields
        if (!decoded.v || !decoded.s || !decoded.l) {
            return null;
        }
        return decoded;
    } catch (error) {
        return null;
    }
}
```

**Step 1.3**: Add `_buildPaginationCursorRangeQuery(sort, lastValues, direction)` (private)
```javascript
/**
 * Build MongoDB range query for cursor-based pagination
 * @private
 * @param {object} sort - Sort object (e.g., { createdAt: -1, _id: -1 })
 * @param {object} lastValues - Last document's values for sort keys
 * @param {number} direction - Pagination direction: 1=forward, -1=backward
 * @returns {object} MongoDB $or query for range
 */
static _buildPaginationCursorRangeQuery(sort, lastValues, direction = 1) {
    const sortKeys = Object.keys(sort);
    if (sortKeys.length === 0 || !lastValues) {
        return {};
    }

    const orConditions = [];

    for (let i = 0; i < sortKeys.length; i++) {
        const condition = {};

        // Add equality conditions for previous keys
        for (let j = 0; j < i; j++) {
            const key = sortKeys[j];
            condition[key] = lastValues[key];
        }

        // Add range condition for current key
        const currentKey = sortKeys[i];
        const sortDirection = sort[currentKey] * direction;
        const operator = sortDirection > 0 ? '$gt' : '$lt';
        condition[currentKey] = { [operator]: lastValues[currentKey] };

        orConditions.push(condition);
    }

    return orConditions.length > 0 ? { $or: orConditions } : {};
}
```

**Step 1.4**: Add `_normalizePaginationSort(sortParam)` (private)
```javascript
/**
 * Normalize sort parameter and ensure _id tiebreaker
 * @private
 * @param {string|object} sortParam - Sort parameter (e.g., "createdAt:-1" or { createdAt: -1 })
 * @returns {object} Normalized sort object with _id tiebreaker
 */
static _normalizePaginationSort(sortParam) {
    let sort = {};

    if (typeof sortParam === 'string') {
        // Parse "field:direction" or "-field" format
        if (sortParam.includes(':')) {
            const [field, dir] = sortParam.split(':');
            sort[field] = dir === '-1' || dir === 'desc' ? -1 : 1;
        } else if (sortParam.startsWith('-')) {
            sort[sortParam.substring(1)] = -1;
        } else {
            sort[sortParam] = 1;
        }
    } else if (typeof sortParam === 'object' && sortParam !== null) {
        sort = { ...sortParam };
    }

    // Default to _id if no sort specified
    if (Object.keys(sort).length === 0) {
        sort._id = 1;
    }

    // Add _id as tiebreaker if not already present
    if (!('_id' in sort)) {
        const firstSortDir = Object.values(sort)[0] || 1;
        sort._id = firstSortDir;
    }

    return sort;
}
```

**Step 1.5**: Add main `paginatedSearch(collection, query, queryParams, options)` function (PUBLIC)
```javascript
/**
 * Execute paginated search on a MongoDB collection
 * Supports both cursor-based (default) and offset-based pagination
 *
 * @param {Collection} collection - MongoDB collection (passed by model)
 * @param {object} query - MongoDB query object (already built by model)
 * @param {object} queryParams - Original URI parameters (for limit, sort, cursor, offset)
 * @param {object} options - Additional options (projection, etc.)
 * @returns {Promise<object>} Standardized search results with pagination metadata
 *
 * @example
 * // Called from model - model passes its own collection
 * const collection = UserModel.getCollection();
 * const query = { status: 'active' };
 * return CommonUtils.paginatedSearch(collection, query, req.query, { projection: { password: 0 } });
 */
static async paginatedSearch(collection, query, queryParams, options = {}) {
    // Determine mode: offset if 'offset' param present, else cursor (default)
    const isOffsetMode = queryParams.offset !== undefined;

    // Parse common params
    const limit = Math.min(parseInt(queryParams.limit) || 50, 1000);
    const sort = CommonUtils._normalizePaginationSort(queryParams.sort);

    if (isOffsetMode) {
        return CommonUtils._paginatedOffsetSearch(collection, query, limit, sort, queryParams, options);
    } else {
        return CommonUtils._paginatedCursorSearch(collection, query, limit, sort, queryParams, options);
    }
}
```

**Step 1.6**: Implement `_paginatedOffsetSearch()` (private)
```javascript
/**
 * Internal: Execute offset-based paginated search
 * @private
 */
static async _paginatedOffsetSearch(collection, query, limit, sort, queryParams, options) {
    const offset = parseInt(queryParams.offset) || 0;

    // Execute query with skip/limit
    const cursor = collection.find(query, options).sort(sort).skip(offset).limit(limit);
    const results = await cursor.toArray();

    // Get total count
    const total = await collection.countDocuments(query);

    return {
        success: true,
        data: results,
        count: results.length,
        pagination: {
            mode: 'offset',
            total,
            limit,
            offset,
            hasMore: offset + results.length < total
        }
    };
}
```

**Step 1.7**: Implement `_paginatedCursorSearch()` (private)
```javascript
/**
 * Internal: Execute cursor-based paginated search
 * @private
 */
static async _paginatedCursorSearch(collection, query, limit, sort, queryParams, options) {
    let cursorData = null;
    let total = null;
    let effectiveQuery = { ...query };

    // Decode cursor if provided
    if (queryParams.cursor && queryParams.cursor !== 'true') {
        cursorData = CommonUtils._decodePaginationCursor(queryParams.cursor);
        if (cursorData) {
            // Use cached total from cursor
            total = cursorData.t;
            // Build range query from lastValues
            const rangeQuery = CommonUtils._buildPaginationCursorRangeQuery(
                cursorData.s, cursorData.lv, cursorData.d || 1
            );
            effectiveQuery = { ...effectiveQuery, ...rangeQuery };
        }
    }

    // First page: run countDocuments
    if (total === null) {
        total = await collection.countDocuments(query);
    }

    // Fetch limit + 1 for hasMore detection
    const cursor = collection.find(effectiveQuery, options).sort(sort).limit(limit + 1);
    const results = await cursor.toArray();

    const hasMore = results.length > limit;
    if (hasMore) {
        results.pop(); // Remove extra item
    }

    // Build next/prev cursors
    let nextCursor = null;
    let prevCursor = null;

    if (hasMore && results.length > 0) {
        const lastDoc = results[results.length - 1];
        nextCursor = CommonUtils._encodePaginationCursor({
            v: 1,
            q: query,
            s: sort,
            l: limit,
            t: total,
            lv: CommonUtils._extractSortValues(lastDoc, sort),
            d: 1  // forward
        });
    }

    // prevCursor only if we came from a cursor (not first page)
    if (cursorData && results.length > 0) {
        const firstDoc = results[0];
        prevCursor = CommonUtils._encodePaginationCursor({
            v: 1,
            q: query,
            s: sort,
            l: limit,
            t: total,
            lv: CommonUtils._extractSortValues(firstDoc, sort),
            d: -1  // backward
        });
    }

    return {
        success: true,
        data: results,
        count: results.length,
        pagination: {
            mode: 'cursor',
            total,
            limit,
            hasMore,
            nextCursor,
            prevCursor
        }
    };
}
```

**Step 1.8**: Implement `_extractSortValues()` (private)
```javascript
/**
 * Extract sort field values from a document for cursor
 * @private
 */
static _extractSortValues(doc, sort) {
    const values = {};
    for (const key of Object.keys(sort)) {
        values[key] = doc[key];
    }
    return values;
}
```

**Step 1.9**: Write unit tests for all pagination utilities
- File: `webapp/tests/unit/utils/common-pagination.test.js`
- Test _encodePaginationCursor/_decodePaginationCursor round-trip
- Test _buildPaginationCursorRangeQuery for ascending/descending sorts
- Test _normalizePaginationSort with various inputs
- Test _extractSortValues
- Test paginatedSearch with mock collection
- Test offset mode
- Test cursor mode first page
- Test cursor mode subsequent pages
- Test edge cases (null, invalid input, empty results)
- File: `webapp/tests/unit/utils/common-pagination-cursor.test.js`
- Test encode/decode round-trip
- Test range query for ascending/descending sorts
- Test sort normalization with various inputs
- Test edge cases (null, invalid input, missing fields)

---

### Phase 2: Model Layer Updates (webapp/model/*.js)

**Goal**: Update model search methods to use `CommonUtils.paginatedSearch()`

**Design Note**: Models pass their collection to CommonUtils - no model imports in CommonUtils.
This keeps dependencies one-way: Models → CommonUtils (not circular).

**Step 2.1**: Update `UserModel.search()` to use `paginatedSearch()`
```javascript
static async search(queryParams, options = {}) {
    // Build model-specific query (unchanged)
    const ignoreFields = ['limit', 'offset', 'sort', 'cursor', 'password', 'passwordHash', 'name'];
    const query = CommonUtils.schemaBasedQuery(UserModel.getSchema(), queryParams, ignoreFields);

    // Handle model-specific 'name' parameter (unchanged)
    if (queryParams.name?.trim()) {
        query.$or = [
            { 'profile.firstName': { $regex: new RegExp(queryParams.name.trim(), 'i') } },
            { 'profile.lastName': { $regex: new RegExp(queryParams.name.trim(), 'i') } },
            { 'username': { $regex: new RegExp(queryParams.name.trim(), 'i') } }
        ];
    }

    // NEW: Delegate pagination to CommonUtils (pass OUR collection)
    const collection = UserModel.getCollection();
    return CommonUtils.paginatedSearch(collection, query, queryParams, options);
}
```

**Step 2.2**: Update `LogModel.search()` similarly

**Step 2.3**: Update `ConfigModel.search()` if applicable

**Step 2.4**: Update `PluginModel.search()` if applicable

**Step 2.5**: Write integration tests for model search methods
- File: `webapp/tests/integration/pagination-cursor.test.js`
- Test first page cursor request
- Test next/prev page navigation
- Test offset mode opt-in
- Test data consistency (insert between pages)

---

### Phase 3: Admin UI Updates (webapp/view/admin/*.shtml)

**Goal**: Update pagination UI to work with cursor-based API

**Step 3.1**: Update `users.shtml` pagination
- Remove page number buttons (lines 376-384)
- Store nextCursor/prevCursor in JS state
- Update Prev/Next button handlers to use cursors
- Display "Showing X-Y of Z" instead of page numbers
- Update `loadUsers()` to handle cursor response

**Step 3.2**: Update `logs.shtml` pagination
- Already has Prev/Next only
- Update to use cursor tokens instead of page numbers
- Update `loadLogs()` to handle cursor response
- Store cursor state in JS variables

**Step 3.3**: Manual browser testing
- Test pagination flow in both admin pages
- Verify Prev/Next work correctly
- Verify data consistency when navigating

---

### Phase 4: Documentation & Cleanup

**Step 4.1**: Update `docs/api-reference.md`
- Document cursor vs offset modes
- Document new pagination parameters
- Add examples for both modes

**Step 4.2**: Update work-items.md entry for W-080
- Mark as completed
- Add summary of changes

**Step 4.3**: Final review and cleanup
- Remove any deprecated code
- Ensure consistent error handling
- Verify all tests pass

---

## Estimated Effort

| Phase | Description | Effort |
|-------|-------------|--------|
| Phase 1 | Core Pagination System (all logic in CommonUtils) | 4-5 hours |
| Phase 2 | Model Layer Updates (thin wrappers only) | 1-2 hours |
| Phase 3 | Admin UI Updates | 2-3 hours |
| Phase 4 | Documentation & Cleanup | 1-2 hours |
| **Total** | | **8-12 hours** |

**Note**: By consolidating pagination logic into Phase 1, Phase 2 becomes minimal
(each model's search() becomes ~15 lines instead of ~40 lines of duplicated code).

---

## Deliverables

1. [ ] `webapp/utils/common.js` - Cursor utility functions
2. [ ] `webapp/model/*.js` - Updated search methods
3. [ ] `webapp/view/admin/users.shtml` - Updated pagination UI
4. [ ] `webapp/view/admin/logs.shtml` - Updated pagination UI
5. [ ] `docs/api-reference.md` - API documentation
6. [ ] Unit tests for cursor utilities
7. [ ] Integration tests for search pagination
