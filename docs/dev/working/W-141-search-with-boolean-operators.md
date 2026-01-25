# W-141, v1.5.0: Enhanced Search Query with Boolean Operators and Regex

## Status
🚧 IN PROGRESS

## Type
Feature + Breaking Change

## Objective
Enhance schema-based query capabilities with:
- Boolean operators (AND, OR, NOT) for powerful search expressions
- Exact match as default (anchored search) with opt-in fuzzy search via wildcards
- Collation optimization for literal queries (improved performance)
- Regex support for power users
- Maintain backward compatibility where possible, document breaking changes

---

## Motivation

Current search behavior:
- Fuzzy/contains search by default: `storm` matches "brainstorming" (surprising)
- No logical operators: cannot combine conditions with AND/OR/NOT
- No case-sensitive option for exact matching
- Performance: all string searches use regex (cannot leverage collation indexes)

Proposed behavior:
- Exact match by default: `storm` matches only "storm" (predictable)
- Wildcards for fuzzy: `*storm*` matches "brainstorming" (explicit)
- Boolean operators: `active;!pending,suspended` = (active AND NOT pending) OR suspended
- Collation for literals: fast indexed queries for exact matches
- Regex syntax: `/pattern/flags` for power users

---

## Search Syntax Specification

### Basic String Search (Case-Insensitive)

| Syntax | Meaning | MongoDB Query | Example Matches |
|--------|---------|---------------|-----------------|
| `storm` | Exact match | `{ $regex: /^storm$/i }` or collation | "storm", "Storm", "STORM" |
| `storm*` | Starts with | `{ $regex: /^storm.*/i }` | "storm", "stormy", "stormtrooper" |
| `*storm` | Ends with | `{ $regex: /.*storm$/i }` | "storm", "brainstorm", "windstorm" |
| `*storm*` | Contains | `{ $regex: /.*storm.*/i }` | "storm", "brainstorming", "stormiest" |
| `st*rm` | Pattern | `{ $regex: /^st.*rm$/i }` | "storm", "stream", "stern" |

**Wildcard character:** Only `*` is supported

### Boolean Operators

| Operator | Symbol | Precedence | Example |
|----------|--------|------------|---------|
| OR | `,` | Lowest | `sushi,pizza` |
| AND | `;` | Higher | `sushi;soup` |
| NOT | `!` prefix | Highest | `!miso` |

**Precedence rules:** AND binds tighter than OR
- `a;b,c` = `(a AND b) OR c`
- `a,b;c` = `a OR (b AND c)`

**Note:** These operators work **within a single field**.
- Within field: `lunch=sushi;soup,pizza` = (sushi AND soup) OR pizza
- Between fields: `role=admin&status=active` = standard query string (AND by default)

### Complex Examples

| Query | Interpretation | Use Case |
|-------|----------------|----------|
| `active,pending` | status is "active" OR "pending" | Multiple values (within field) |
| `admin;active` | "admin" AND "active" (within field) | Intersection within field |
| `!suspended` | status is NOT "suspended" | Exclusion |
| `active;!pending` | active AND NOT pending | Filtered set (within field) |
| `admin,user;active` | (admin OR user) AND active | Complex filter (within field) |
| `*error*;!*test*` | contains "error" AND NOT contains "test" | Log filtering |

**Multi-field AND (no change):**
- Standard query string: `role=admin&status=active`
- Means: role is admin AND status is active
- This is how query strings always work - no new syntax needed

### Regex Syntax (Power Users)

| Syntax | Meaning | MongoDB Query |
|--------|---------|---------------|
| `/BC[1-9]\d{3}/` | Case-sensitive regex | `{ $regex: /BC[1-9]\d{3}/ }` |
| `/storm/i` | Case-insensitive regex | `{ $regex: /storm/i }` |
| `/^storm$/` | Exact (case-sensitive) | `{ $regex: /^storm$/ }` |

**Security:** Regex patterns validated and length-limited (~200 chars) to prevent ReDoS attacks.

### Query String Examples

**Within-field operators:**
```
GET /api/1/user/search?status=active,pending
GET /api/1/log/search?lunch=sushi;miso%20soup,pizza;salad;!vinegar
```

**Between-field AND (standard query string):**
```
GET /api/1/user/search?role=admin&status=active
GET /api/1/user/search?role=admin&status=active,pending&verified=true
```

The `&` separator is standard URL query string syntax and always meant AND between different fields.

### Edge Cases

| Input | Behavior | Result |
|-------|----------|--------|
| `a,` | Trailing comma ignored | Same as `a` |
| `a,,b` | Empty terms filtered | Same as `a,b` |
| `,,,` | All empty | No query for field |
| `*` | Match any | `{ $regex: /^.*$/i }` |
| `/pat,tern/` | Comma in regex protected | Literal comma in pattern |

---

## Architecture & Implementation

### Phase 1: String Query Parser (~150-200 lines)

Create new utility class: `CommonUtils.StringQueryParser`

#### Step 0: Protect Regex Patterns
```javascript
protectRegexPatterns(value) {
  // Temporarily replace , and ; inside /.../ with tokens
  // Pattern: /([^/]+)/([gimsuy]*)
  // Replace: , → \x01, ; → \x02
}
```

#### Step 1: Split by Comma (OR)
```javascript
parse(fieldName, value) {
  const protected = protectRegexPatterns(value);
  const orTerms = protected.split(',').map(trim).filter(nonEmpty);
  const orQueries = orTerms.map(term => parseAndExpression(fieldName, term));

  if (orQueries.length === 1) return orQueries[0];
  return {
    query: { $or: orQueries.map(q => q.query) },
    useCollation: orQueries.every(q => q.useCollation)
  };
}
```

#### Step 2: Split by Semicolon (AND)
```javascript
parseAndExpression(fieldName, term) {
  const andTerms = term.split(';').map(trim).filter(nonEmpty);
  const andQueries = andTerms.map(t => parseNotExpression(fieldName, t));

  if (andQueries.length === 1) return andQueries[0];
  return {
    query: { $and: andQueries.map(q => q.query) },
    useCollation: andQueries.every(q => q.useCollation)
  };
}
```

#### Step 3: Handle NOT Prefix
```javascript
parseNotExpression(fieldName, term) {
  if (term.startsWith('!')) {
    const innerTerm = term.substring(1).trim();
    const innerQuery = parseLiteral(fieldName, innerTerm);
    return {
      query: { [fieldName]: { $not: innerQuery.query[fieldName] } },
      useCollation: innerQuery.useCollation
    };
  }
  return parseLiteral(fieldName, term);
}
```

#### Step 4: Parse Literal/Pattern/Regex
```javascript
parseLiteral(fieldName, term) {
  const restored = restoreRegexPatterns(term);

  // Explicit regex: /pattern/flags
  // Pattern: /^\s*\/.*\/[gimsuy]*\s*$/
  const regexMatch = restored.trim().match(/^\/(.+)\/([gimsuy]*)$/);
  if (regexMatch) {
    validateRegex(regexMatch[1], regexMatch[2]); // Security check
    return {
      query: { [fieldName]: { $regex: new RegExp(regexMatch[1], regexMatch[2]) } },
      useCollation: false
    };
  }

  // Wildcard pattern
  if (restored.includes('*') || restored.includes('%')) {
    return {
      query: { [fieldName]: buildWildcardRegex(restored) },
      useCollation: false
    };
  }

  // Exact match - collation candidate
  return {
    query: { [fieldName]: restored },
    useCollation: true,
    collation: { locale: 'en', strength: 2 }
  };
}
```

#### Wildcard Regex Builder
```javascript
buildWildcardRegex(value) {
  let pattern = value.replace(/[*%]/g, '.*');

  // Anchor at boundaries (not wildcard)
  if (!value.startsWith('*') && !value.startsWith('%')) {
    pattern = '^' + pattern;
  }
  if (!value.endsWith('*') && !value.endsWith('%')) {
    pattern = pattern + '$';
  }

  return { $regex: new RegExp(pattern, 'i') };
}
```

### Phase 2: Integrate into schemaBasedQuery

#### Current Signature (Unchanged)
```javascript
static schemaBasedQuery(schema, queryParams, ignoreFields = [])
```

#### Enhanced Return Value
```javascript
// Old: returns plain query object
return { field1: value1, field2: { $regex: ... } };

// New: returns object with metadata
return {
  query: { field1: value1, field2: { $regex: ... } },
  useCollation: true/false,
  collation: { locale: 'en', strength: 2 } // if useCollation
};
```

#### String Field Handling (Updated)
```javascript
} else if (fieldSchema.type === 'string') {
  const stringValue = String(value);

  // Use new parser
  const parsed = CommonUtils.StringQueryParser.parse(key, stringValue);

  // Track collation eligibility
  fieldQueries.push(parsed);
}
```

#### Query Merging Strategy
```javascript
// Collect all field queries
const fieldQueries = []; // Each: { query, useCollation, collation? }

// After processing all fields:
const allQueriesSupportCollation = fieldQueries.every(q => q.useCollation);

if (allQueriesSupportCollation && fieldQueries.length > 0) {
  // All fields can use collation - optimize!
  return {
    query: mergeQueries(fieldQueries.map(q => q.query)),
    useCollation: true,
    collation: { locale: 'en', strength: 2 }
  };
} else {
  // Mixed or all regex - no collation
  return {
    query: mergeQueries(fieldQueries.map(q => q.query)),
    useCollation: false
  };
}
```

### Phase 3: Update Models (Backward Compatible)

#### Recommended Approach
```javascript
// webapp/model/user.js
static async search(queryParams, options = {}) {
  const ignoreFields = ['limit', 'offset', 'sort', 'cursor', 'password', 'passwordHash', 'name'];
  const queryResult = CommonUtils.schemaBasedQuery(UserModel.getSchema(), queryParams, ignoreFields);

  // Option 1: Explicit collation passing (recommended)
  const enhancedOptions = {
    ...options,
    collation: queryResult.useCollation ? queryResult.collation : undefined
  };

  const collection = UserModel.getCollection();
  return CommonUtils.paginatedSearch(collection, queryResult.query, queryParams, enhancedOptions);
}
```

#### Backward Compatible Approach (No Model Changes Required)
```javascript
// webapp/model/user.js - NO CHANGES NEEDED
static async search(queryParams, options = {}) {
  const ignoreFields = ['limit', 'offset', 'sort', 'cursor', 'password', 'passwordHash', 'name'];
  const query = CommonUtils.schemaBasedQuery(UserModel.getSchema(), queryParams, ignoreFields);

  const collection = UserModel.getCollection();
  return CommonUtils.paginatedSearch(collection, query, queryParams, options);
  // paginatedSearch auto-detects enhanced query format (see Phase 4)
}
```

**Note:** Both approaches work. Option 1 is explicit and recommended for new code. Option 2 provides automatic backward compatibility for existing models and plugin code.

### Phase 4: Update paginatedSearch with Auto-Detection

#### Entry Point - Auto-Detect Enhanced Query Format
```javascript
// webapp/utils/common.js - paginatedSearch
static async paginatedSearch(collection, query, queryParams = {}, options = {}) {
  // Auto-detect if query is enhanced object with metadata
  let actualQuery = query;
  let enhancedOptions = { ...options };

  if (query && typeof query === 'object' && query.query && query.useCollation !== undefined) {
    // Enhanced format detected: { query, useCollation, collation }
    actualQuery = query.query;
    if (query.useCollation && !enhancedOptions.collation) {
      // Apply collation if not already specified in options
      enhancedOptions.collation = query.collation;
    }
  }

  // Determine mode: offset if 'offset' param present, else cursor (default)
  const isOffsetMode = queryParams.offset !== undefined;

  // Parse common params
  const limit = Math.min(parseInt(queryParams.limit) || 50, 1000);
  const sort = CommonUtils._normalizePaginationSort(queryParams.sort);

  if (isOffsetMode) {
    return CommonUtils._paginatedOffsetSearch(collection, actualQuery, limit, sort, queryParams, enhancedOptions);
  } else {
    return CommonUtils._paginatedCursorSearch(collection, actualQuery, limit, sort, queryParams, enhancedOptions);
  }
}
```

#### Update Internal Methods - Add Collation Support
```javascript
// webapp/utils/common.js - _paginatedOffsetSearch
static async _paginatedOffsetSearch(collection, query, limit, sort, queryParams, options) {
  const offset = parseInt(queryParams.offset) || 0;

  // Build find options
  const findOptions = { ...options };
  if (options.projection) {
    findOptions.projection = options.projection;
  }
  // Add collation if provided
  if (options.collation) {
    findOptions.collation = options.collation;
  }

  // Execute query with skip/limit
  const results = await collection.find(query, findOptions)
    .sort(sort)
    .skip(offset)
    .limit(limit)
    .toArray();

  // Get total count (also needs collation)
  const countOptions = options.collation ? { collation: options.collation } : {};
  const total = await collection.countDocuments(query, countOptions);

  // ... rest unchanged
}
```

Similar changes in `_paginatedCursorSearch`.

**Benefits:**
- ✅ Zero breaking changes - existing code works unchanged
- ✅ Automatic optimization - collation applied when detected
- ✅ Explicit override - options.collation takes precedence
- ✅ Plugin-friendly - developers don't need to change existing code

---

## Breaking Changes

### 1. Default Search Behavior Change

**Before:**
```
status=active  →  matches "active", "inactive", "reactivate" (contains)
```

**After:**
```
status=active  →  matches only "active" (exact)
```

**Migration:** Add wildcards for fuzzy search: `status=*active*`

### 2. Comma Meaning Changed

**Before:**
```
roles=admin,user  →  treated as array field syntax
```

**After:**
```
roles=admin,user  →  OR query (admin OR user)
```

**Note:** Array fields still use comma for `$in` queries, but string fields now parse as boolean OR.

### 3. Special Characters

New special meanings:
- `,` = OR operator
- `;` = AND operator
- `!` = NOT operator
- `/pattern/` = regex syntax

To search for literal special characters, use regex escaping.

---

## Performance Considerations

### Collation Benefits

**Without collation (current):**
```javascript
// All string searches use regex
{ status: { $regex: /^active$/i } }
// Cannot use index efficiently
```

**With collation (optimized):**
```javascript
// Literal queries with collation
{ status: "active" }
// Can use case-insensitive index
// 10-100x faster on large collections
```

### Index Strategy

Create case-insensitive indexes:
```javascript
db.users.createIndex(
  { status: 1 },
  { collation: { locale: "en", strength: 2 } }
);
```

### Performance Matrix

| Query Type | Uses Collation? | Can Use Index? | Performance |
|------------|-----------------|----------------|-------------|
| Exact: `active` | ✅ Yes | ✅ Yes | ⚡⚡⚡ Fastest |
| Starts: `act*` | ❌ No (regex) | ⚡ Partial | ⚡⚡ Fast |
| Contains: `*tiv*` | ❌ No (regex) | ❌ No | ⚡ Slower |
| Regex: `/[aA]ct/` | ❌ No | ❌ No | ⚡ Slower |
| Mixed: exact AND pattern | ❌ No (fallback) | ⚠️ Partial | ⚡⚡ Mixed |

---

## Testing Strategy

### Unit Tests (webapp/tests/unit/utils/common-utils-boolean-search.test.js)

#### Basic Operators
```javascript
test('OR operator with comma', () => {
  const result = StringQueryParser.parse('status', 'active,pending');
  expect(result.query).toEqual({
    $or: [{ status: 'active' }, { status: 'pending' }]
  });
  expect(result.useCollation).toBe(true);
});

test('AND operator with semicolon', () => {
  const result = StringQueryParser.parse('status', 'active;!suspended');
  expect(result.query).toEqual({
    $and: [
      { status: 'active' },
      { status: { $not: 'suspended' } }
    ]
  });
  expect(result.useCollation).toBe(true);
});

test('NOT operator with exclamation', () => {
  const result = StringQueryParser.parse('status', '!pending');
  expect(result.query).toEqual({ status: { $not: 'pending' } });
  expect(result.useCollation).toBe(true);
});
```

#### Wildcards
```javascript
test('exact match (no wildcards)', () => {
  const result = StringQueryParser.parse('name', 'storm');
  expect(result.query).toEqual({ name: 'storm' });
  expect(result.useCollation).toBe(true);
});

test('starts with wildcard', () => {
  const result = StringQueryParser.parse('name', 'storm*');
  expect(result.query.name.$regex.source).toBe('^storm.*');
  expect(result.useCollation).toBe(false);
});

test('ends with wildcard', () => {
  const result = StringQueryParser.parse('name', '*storm');
  expect(result.query.name.$regex.source).toBe('.*storm$');
});

test('contains wildcard', () => {
  const result = StringQueryParser.parse('name', '*storm*');
  expect(result.query.name.$regex.source).toBe('.*storm.*');
});
```

#### Regex Syntax
```javascript
test('explicit regex with flags', () => {
  const result = StringQueryParser.parse('code', '/BC[1-9]\\d{3}/');
  expect(result.query.code.$regex.source).toBe('BC[1-9]\\d{3}');
  expect(result.query.code.$regex.flags).toBe('');
  expect(result.useCollation).toBe(false);
});

test('regex with case-insensitive flag', () => {
  const result = StringQueryParser.parse('name', '/storm/i');
  expect(result.query.name.$regex.flags).toBe('i');
});
```

#### Complex Combinations
```javascript
test('precedence: AND binds tighter than OR', () => {
  const result = StringQueryParser.parse('status', 'a;b,c');
  expect(result.query.$or).toBeDefined();
  expect(result.query.$or[0].$and).toBeDefined();
});

test('mixed wildcards in OR', () => {
  const result = StringQueryParser.parse('msg', '*error*,*warning*');
  expect(result.query.$or.length).toBe(2);
  expect(result.useCollation).toBe(false);
});

test('protected comma in regex', () => {
  const result = StringQueryParser.parse('name', '/john,jane/,smith');
  expect(result.query.$or.length).toBe(2);
  expect(result.query.$or[0].name.$regex.source).toBe('john,jane');
});
```

#### Edge Cases
```javascript
test('trailing comma ignored', () => {
  const result = StringQueryParser.parse('status', 'active,');
  expect(result.query).toEqual({ status: 'active' });
});

test('empty terms filtered', () => {
  const result = StringQueryParser.parse('status', 'a,,b');
  expect(result.query.$or.length).toBe(2);
});

test('all empty becomes no query', () => {
  const result = StringQueryParser.parse('status', ',,,');
  expect(result.query).toEqual({});
});
```

### Integration Tests (webapp/tests/integration/search-boolean-operators.test.js)

Test actual MongoDB queries with real data:
```javascript
test('search users with OR condition', async () => {
  const results = await UserModel.search({ status: 'active,pending' });
  // Verify results contain both active and pending users
});

test('search logs with AND NOT condition', async () => {
  const results = await LogModel.search({ 'data.action': 'update;!delete' });
  // Verify results contain updates but not deletes
});

test('collation optimization applies', async () => {
  // Create users: 'Active', 'ACTIVE', 'active'
  const results = await UserModel.search({ status: 'active' });
  expect(results.data.length).toBe(3); // All matched via collation
});
```

### Backward Compatibility Tests

```javascript
test('wildcard behavior unchanged', () => {
  // Old: name=john* matched starts-with
  // New: name=john* still matches starts-with (no break)
  const result = StringQueryParser.parse('name', 'john*');
  expect(result.query.name.$regex.source).toMatch(/^john/);
});

test('enum fields still use exact match', () => {
  // Enums handled before string parser
  const schema = { status: { type: 'string', enum: ['active', 'inactive'] } };
  const query = CommonUtils.schemaBasedQuery(schema, { status: 'active' });
  expect(query.query.status).toBe('active'); // Direct match
});
```

---

## Documentation Updates

### 1. API Reference (docs/api-reference.md)

Update "Wildcard Search" section:
```markdown
### Advanced Search Syntax

#### Exact Match (Default)
Search values match exactly (case-insensitive):
- `status=active` - Matches only "active" (also "Active", "ACTIVE")

#### Wildcard Search
Use `*` for fuzzy matching:
- `name=john*` - Starts with "john"
- `name=*smith` - Ends with "smith"
- `name=*john*` - Contains "john"

#### Boolean Operators
Combine conditions with logical operators:
- `status=active,pending` - OR: active OR pending
- `status=active;!suspended` - AND/NOT: active AND NOT suspended
- `role=admin;status=active,pending` - Complex: (admin AND active) OR pending

**Precedence:** AND (`;`) binds tighter than OR (`,`)

#### Regex (Power Users)
Use regex syntax for advanced patterns:
- `/BC[1-9]\d{3}/` - Case-sensitive pattern
- `/storm/i` - Case-insensitive pattern

**Security:** Regex patterns are validated and length-limited.
```

### 2. Site Administration (docs/site-administration.md)

Add search tips section for admin users.

### 3. Migration Guide (docs/MIGRATION.md or CHANGELOG.md)

Document breaking changes with examples.

---

## Implementation Checklist

### Phase 1: Parser Implementation
- [ ] Create `StringQueryParser` class in `webapp/utils/common.js`
- [ ] Implement `protectRegexPatterns()` and `restoreRegexPatterns()`
- [ ] Implement `parse()` - main entry point
- [ ] Implement `parseAndExpression()` - split by semicolon
- [ ] Implement `parseNotExpression()` - handle `!` prefix
- [ ] Implement `parseLiteral()` - handle exact/wildcard/regex
- [ ] Implement `buildWildcardRegex()` - anchor wildcards
- [ ] Implement `validateRegex()` - security check
- [ ] Unit tests for parser (50+ test cases)

### Phase 2: Integration
- [ ] Update `schemaBasedQuery()` return value to include metadata
- [ ] Update string field handling to use new parser
- [ ] Implement query merging with collation detection
- [ ] Update `paginatedSearch()` to auto-detect enhanced query format
- [ ] Update `_paginatedOffsetSearch()` to use collation from options
- [ ] Update `_paginatedCursorSearch()` to use collation from options
- [ ] (Optional) Update `webapp/model/user.js` for explicit collation passing
- [ ] (Optional) Update `webapp/model/log.js` for explicit collation passing
- [ ] Update existing tests to handle both old and new return formats

### Phase 3: Testing
- [ ] Unit tests for boolean operators (20+ tests)
- [ ] Unit tests for wildcards (10+ tests)
- [ ] Unit tests for regex syntax (10+ tests)
- [ ] Unit tests for edge cases (10+ tests)
- [ ] Integration tests with real MongoDB (10+ tests)
- [ ] Performance benchmarks (collation vs regex)
- [ ] Backward compatibility tests

### Phase 4: Documentation
- [ ] Update `docs/api-reference.md` - search syntax
- [ ] Update `docs/site-administration.md` - admin search tips
- [ ] Add migration notes to `docs/CHANGELOG.md`
- [ ] Update JSDoc comments in `common.js`
- [ ] Create examples in test files

### Phase 5: Optimization (Optional)
- [ ] Investigate index creation for common search fields
- [ ] Benchmark query performance with collation
- [ ] Consider query result caching for frequent searches
- [ ] Profile memory usage with complex boolean queries

---

## Risk Assessment

### High Risk
- **Breaking change in default behavior:** Users expecting fuzzy search will need to adapt
  - *Mitigation:* Clear documentation, migration guide, version bump

### Medium Risk
- **Complex query performance:** Deeply nested boolean queries may be slow
  - *Mitigation:* Test with realistic data, add query complexity limits if needed
- **Regex security:** User-provided regex could cause ReDoS
  - *Mitigation:* Validate patterns, length limits, timeout on query execution

### Low Risk
- **Collation compatibility:** Some MongoDB versions may not support collation
  - *Mitigation:* Graceful fallback to regex if collation fails
- **Special character conflicts:** User data containing `,;!` may need escaping
  - *Mitigation:* Document escape syntax, regex mode for literals

---

## Future Enhancements

### Post-V1 Features
- [ ] Query builder UI for complex searches (visual query editor)
- [ ] Save/share search queries (bookmarkable URLs)
- [ ] Search history and autocomplete
- [ ] Field-specific operator support (numeric ranges, date comparisons)
- [ ] Full-text search integration (MongoDB Atlas Search)

### Performance Optimization
- [ ] Query result caching layer
- [ ] Materialized views for common searches
- [ ] Aggregation pipeline for complex analytics

---

## Tech Debt & Future Improvements

### 1. Locale-Specific Collation (Priority: Medium)

**Current State:**
- Hardcoded English locale: `{ locale: 'en', strength: 2 }`
- Single index set per searchable field
- No per-user locale support

**Limitation:**
MongoDB collation indexes are locale-specific. A collation index created for English (`locale: 'en'`) will **not** be used for German (`locale: 'de'`) queries.

```javascript
// Current implementation
db.users.createIndex({ status: 1 }, { collation: { locale: "en", strength: 2 } });

// This query uses the index:
db.users.find({ status: "active" }, { collation: { locale: "en", strength: 2 } });

// This query CANNOT use the index:
db.users.find({ status: "active" }, { collation: { locale: "de", strength: 2 } });
```

**Future Enhancement (v1.6 or v2.0):**

#### Phase A: Derive Locale from User Session
```javascript
// In model's search method
static async search(queryParams, options = {}, req = null) {
  const userLocale = req?.session?.user?.preferences?.language || 'en';

  const queryResult = CommonUtils.schemaBasedQuery(
    schema,
    queryParams,
    ignoreFields,
    { locale: userLocale }  // Pass user's locale
  );

  const enhancedOptions = {
    ...options,
    collation: queryResult.useCollation
      ? { locale: userLocale, strength: 2 }
      : undefined
  };

  return paginatedSearch(collection, queryResult.query, queryParams, enhancedOptions);
}
```

#### Phase B: Multi-Locale Index Creation

**Option 1: Manual Setup** (Simple, recommended for v1.6)
```javascript
// One-time index creation for supported locales
const locales = ['en', 'de', 'fr', 'es', 'ja'];
const fields = ['username', 'email', 'status'];

for (const locale of locales) {
  for (const field of fields) {
    db.users.createIndex(
      { [field]: 1 },
      {
        name: `${field}_collation_${locale}`,
        collation: { locale, strength: 2 },
        background: true  // Non-blocking
      }
    );
  }
}
```

**Option 2: Auto-Creation on First Use** (Advanced, v2.0+)
```javascript
// Track created indexes
const collationIndexCache = new Map(); // locale -> Set<field>

async function ensureCollationIndex(collection, field, locale) {
  const cacheKey = `${collection.collectionName}:${field}:${locale}`;
  if (collationIndexCache.has(cacheKey)) {
    return; // Already created
  }

  // Check if index exists
  const indexes = await collection.listIndexes().toArray();
  const exists = indexes.some(idx =>
    idx.key[field] === 1 &&
    idx.collation?.locale === locale
  );

  if (!exists) {
    await collection.createIndex(
      { [field]: 1 },
      {
        name: `${field}_collation_${locale}`,
        collation: { locale, strength: 2 },
        background: true
      }
    );
  }

  collationIndexCache.add(cacheKey);
}
```

**Option 3: Fallback to English** (Pragmatic, minimal changes)
```javascript
// Always use 'en' locale regardless of user language
// Accept slight inaccuracy for non-English users
// Still get performance benefit vs regex
const collation = { locale: 'en', strength: 2 };
```

#### Phase C: Index Management Strategy

**Storage Cost:**
- Each index: ~10-50% of collection size
- 5 locales × 5 fields = 25 indexes per collection
- Estimate: 2-5x storage increase

**Recommendation:**
1. **v1.5:** Use English-only collation (Option 3) - ~1 week
2. **v1.6:** Add user locale detection (Phase A) - ~2-3 days
3. **v2.0:** Multi-locale indexes (Phase B, Option 1) - ~1-2 days
4. **v2.x:** Auto-index creation (Option 2) if needed - ~3-5 days

**Priority Justification:**
- Low impact for current deployments (English-only sites)
- High implementation cost for full multi-locale support
- Defer until internationalization becomes critical need
- Document as known limitation for now

---

### 2. Query Complexity Limits (Priority: Low)

**Concern:**
Deeply nested boolean queries could impact performance or memory.

**Example:**
```
field=(a;b;c;d;e),(f;g;h;i;j),(k;l;m;n;o),... (100+ terms)
```

**Future Enhancement:**
```javascript
// Add validation in StringQueryParser
static parse(fieldName, value, options = {}) {
  const maxOrTerms = options.maxOrTerms || 50;
  const maxAndTerms = options.maxAndTerms || 20;

  const orTerms = value.split(',').filter(nonEmpty);
  if (orTerms.length > maxOrTerms) {
    throw new Error(`Too many OR terms (max: ${maxOrTerms})`);
  }

  // Similar checks for AND depth
}
```

**Decision:** Monitor production usage first. Add limits only if abuse detected.

---

### 3. Special Character Escaping (Priority: Low)

**Concern:**
User data containing `,;!` in search values requires workarounds.

**Examples:**
```
title=Design, Development, and Deployment  →  Commas treated as OR
tag=front-end;back-end  →  Semicolon treated as AND
status=!important  →  Exclamation treated as NOT
```

**Note on Forward Slash:**
Forward slash `/` is NOT a special character in normal searches:
```
timezone=America/Los_Angeles  →  Works fine (exact match)
path=/var/log/app  →  Works fine
```

Only when matching the regex pattern is `/` special:
```
// Regex detection: /^\s*\/.*\/[gimsuy]*\s*$/
/pattern/flags  →  Treated as regex
```

**Current Workarounds:**
1. Use regex syntax for literal values with special chars:
   ```
   /john,doe/  →  Literal "john,doe"
   /test;case/  →  Literal "test;case"
   ```
2. URL-encode special characters (if via URL):
   ```
   name=john%2Cdoe  →  Comma encoded as %2C
   ```

**Future Enhancement:**
Add backslash escaping:
```
name=john\,doe   →   Searches for literal "john,doe"
name=test\;case  →   Searches for literal "test;case"
status=\!important  →  Searches for literal "!important"
```

**Decision:** Document regex workaround for now. Add escaping only if users report confusion or requests.

---

### 4. Case-Sensitive Search Mode (Priority: Low)

**Current State:**
All searches are case-insensitive by default.

**Future Enhancement:**
Add explicit case-sensitive mode:
```
// Option A: Double quotes
name="Storm"  →  Case-sensitive exact match

// Option B: Prefix
name:cs:Storm  →  Case-sensitive

// Option C: Regex only (current)
name=/^Storm$/  →  Case-sensitive regex
```

**Decision:** Regex syntax sufficient for power users. Defer simpler syntax until requested.

---

### 5. Field Transformation & Response Shaping (Priority: Medium)

**Concern:**
Need post-query field manipulation for API responses:
- Rename fields (e.g., `firstName` → `First Name`)
- Truncate values (e.g., `notes:Notes:tr-60`)
- Add virtual/placeholder fields
- Format dates, numbers, etc.

**Current Limitations:**
- MongoDB projection only does include/exclude
- No field renaming or value transformation
- Post-processing done ad-hoc in controllers

**Example Need:**
```javascript
// Query parameter:
returnFields=name:Full_Name,notes:Notes:tr-60,Comments

// Desired result:
{
  "Full Name": "John Doe",
  "Notes": "This is a long note that gets truncated to 60 ch...",
  "Comments": ""  // Virtual field (doesn't exist in DB)
}
```

**Proposed Solution:**
Create `CommonUtils.transformFields()` utility:

```javascript
static transformFields(data, spec, options = {}) {
  // Parse spec: "field:Display_Name:tr-60,virtual_field"
  // Return transformed data with:
  // - Renamed fields
  // - Truncated values
  // - Virtual fields added
}
```

**Usage Pattern:**
```javascript
// 1. Query with DB-level projection (performance)
const results = await paginatedSearch(collection, query, params, {
  projection: { password: 0, passwordHash: 0 }
});

// 2. Transform fields for response (application-level)
if (req.query.returnFields) {
  results.data = CommonUtils.transformFields(
    results.data,
    req.query.returnFields
  );
}
```

**Separation of Concerns:**
- **DB Projection**: Performance optimization (exclude sensitive fields)
- **Field Transform**: Response shaping (rename, format, add virtuals)
- Keep these separate - don't mix in `schemaBasedQuery`

**Implementation Phase:** Post-v1.5.0 (separate work item)

**Related:** Could integrate with user profile field filtering (W-134)

---

## References

- MongoDB Collation Docs: https://www.mongodb.com/docs/manual/reference/collation/
- MongoDB Regex Operator: https://www.mongodb.com/docs/manual/reference/operator/query/regex/
- Boolean Query Parsing: Standard recursive descent parser patterns
- jPulse Framework: Current `schemaBasedQuery` implementation in `webapp/utils/common.js`

---

## Notes

- Implementation time estimate: 3-5 days
- Breaking change: Version bump to v1.5.0
- Early deployment stage: Breaking changes acceptable (no public release yet)
- User impact: Improved search UX outweighs migration cost
- Performance benefit: Collation optimization for literal queries significant at scale
- Backward compatibility: Auto-detection in `paginatedSearch` ensures plugins work without changes
- Collation scope: Global per-query (MongoDB limitation, not per-field)
- Locale support: Hardcoded 'en' for v1.5, multi-locale deferred to v1.6+ (tech debt documented)

---

**Last Updated:** 2026-01-24
**Target Version:** 1.5.0
