# jPulse Search Syntax Quick Reference

**Version:** 1.5.0
**Feature:** W-141 Boolean Search Operators

---

## Basic Syntax

**Within a single field:**

| Example | Meaning | Description |
|---------|---------|-------------|
| `active` | Exact match | Matches only "active" (case-insensitive) |
| `active,pending` | OR | Matches "active" OR "pending" |
| `admin;active` | AND | Matches "admin" AND "active" |
| `!suspended` | NOT | NOT "suspended" |

**Between different fields (standard query string):**

```
role=admin&status=active  → role is admin AND status is active
```

The `&` separator in URLs always meant AND between fields - no change to standard behavior.

---

## Wildcards

| Example | Meaning | Matches |
|---------|---------|---------|
| `john*` | Starts with | "john", "johnny", "johnson" |
| `*smith` | Ends with | "smith", "blacksmith" |
| `*admin*` | Contains | "admin", "administrator", "sysadmin" |
| `st*rm` | Pattern | "storm", "stream" |

**Wildcard Character:** Only `*` is supported

---

## Regex (Advanced)

| Example | Description |
|---------|-------------|
| `/BC[1-9]\d{3}/` | Case-sensitive pattern |
| `/storm/i` | Case-insensitive pattern |
| `/^exact$/` | Anchored match |

**Security:** Patterns limited to 200 characters, validated for safety

---

## Operator Precedence

**Rule:** AND (`;`) binds tighter than OR (`,`)

| Query | Interpretation |
|-------|----------------|
| `a;b,c` | `(a AND b) OR c` |
| `a,b;c` | `a OR (b AND c)` |
| `a;b;c,d;e;f` | `(a AND b AND c) OR (d AND e AND f)` |

---

## Complex Examples

### User Search
```
status=active,pending              → Active OR pending users (within field)
role=admin&status=active           → Admin role AND active status (between fields)
username=john*,jane*               → Usernames starting with john or jane
status=active;!suspended           → Active but not suspended (within field)
```

### Restaurant Order Search
```
lunch=sushi;miso soup,pizza;salad;!vinegar
→ (sushi AND miso soup) OR (pizza AND salad AND NOT vinegar)
```

### Log Search
```
level=error,warning                → Error or warning logs
msg=*database*;!*test*             → Database messages, exclude test
action=create,update;status=success → Successful creates or updates
```

### Configuration Search
```
name=*email*;!*test*               → Config keys with "email" but not "test"
value=/\d{4}/;type=number          → Numeric values with 4 digits
```

---

## Special Cases

### Forward Slashes (NOT Regex)
```
timezone=America/Los_Angeles  → Literal timezone (exact match)
path=/var/log/app             → Literal path (exact match)
```

**Note:** Only `/pattern/` with trailing slash is treated as regex

### Protected Characters in Regex
```
/john,jane/,smith  → Comma inside regex is literal
/a;b/;c            → Semicolon inside regex is literal
```

---

## Edge Cases

| Input | Result |
|-------|--------|
| `active,` | Same as `active` (trailing comma ignored) |
| `a,,b` | Same as `a,b` (empty terms filtered) |
| `,,,` | No query (all empty) |
| `*` | Matches any non-empty value |
| ` active ` | Whitespace trimmed → `active` |

---

## Migration Guide

### Old Fuzzy Search (Pre-1.5.0)
```
status=active  → Matched "active", "inactive", "reactivate"
```

### New Exact Search (1.5.0+)
```
status=active   → Matches only "active"
status=*active* → Fuzzy search (contains "active")
```

**To migrate:** Add `*...*` wildcards where fuzzy search is needed

---

## Performance Tips

### Use Exact Matches When Possible
```
✅ FAST:   status=active,pending,inactive
❌ SLOWER: status=*act*,*pend*,*inact*
```

**Why:** Exact matches use collation indexes (10-100x faster)

### Prefer Starts-With Over Contains
```
✅ FAST:   username=john*
❌ SLOWER: username=*john*
```

**Why:** Starts-with patterns can use indexes partially

### Avoid Leading Wildcards
```
✅ FAST:   path=/var/log/*
❌ SLOWER: path=*/error.log
```

**Why:** Leading wildcards cannot use indexes

---

## Common Patterns

### Active Users by Role
```
role=admin,user;status=active
```

### Recent Errors Excluding Tests
```
level=error;msg=!*test*
```

### Multiple Exact Values (Fast)
```
status=active,pending,processing
```

### Complex Filtering
```
(admin AND active) OR (user AND verified):
role=admin;status=active,role=user;verified=true
```

---

## API Usage

### REST API
```
GET /api/1/user/search?status=active,pending&role=admin
GET /api/1/log/search?level=error,warning&msg=*database*
```

### JavaScript (Client-Side)
```javascript
const params = new URLSearchParams({
  status: 'active,pending',
  role: 'admin'
});
fetch(`/api/1/user/search?${params}`);
```

### JavaScript (Server-Side)
```javascript
const result = await UserModel.search({
  status: 'active,pending',
  role: 'admin'
});
```

---

## Troubleshooting

### No Results Found
- Check for typos in exact matches
- Try adding wildcards: `*value*`
- Verify case (all searches are case-insensitive)

### Too Many Results
- Add more specific AND conditions: `field1;field2`
- Use exact match instead of wildcards
- Add NOT to exclude: `!unwanted`

### Query Not Working
- Check operator precedence (`;` before `,`)
- Verify special characters are not treated as operators
- Use regex syntax for literal special chars: `/value,with,commas/`

---

## Quick Tips

1. **Default is exact** - Use `*` for fuzzy
2. **AND binds first** - Use parentheses logic mentally
3. **Regex last resort** - Use wildcards when possible
4. **Exact is fastest** - Avoid wildcards when not needed
5. **Case doesn't matter** - All searches case-insensitive (unless regex)

---

**Documentation:** docs/dev/design/W-141-search-with-boolean-operators.md
**API Reference:** docs/api-reference.md (to be updated)
**Implementation:** webapp/utils/common.js (StringQueryParser)
