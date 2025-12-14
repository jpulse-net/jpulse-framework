# W-114: handlebars: add logical and comparison helpers with subexpressions and block helpers

## Status
🕑 PENDING

## Overview

Enhance handlebars with logical and comparison helpers that work in three contexts:
1. **Standalone helpers**: `{{and user.isAdmin user.isActive}}` → returns `"true"` or `"false"`
2. **Subexpressions**: `{{#if (and user.isAdmin user.isActive)}}` → works in conditions
3. **Block helpers**: `{{#and user.isAdmin user.isActive}}...{{/and}}` → cleaner block syntax

This provides more flexible and powerful conditional logic in templates, following Polish notation (operator-first syntax).

## Requirements

### Helpers to Implement

**Logical Helpers:**
- `{{and ...}}` - Logical AND (1+ arguments)
- `{{or ...}}` - Logical OR (1+ arguments)
- `{{not ...}}` - Logical NOT (1 argument)

**Comparison Helpers:**
- `{{gt a b}}` - Greater than (2 arguments)
- `{{gte a b}}` - Greater than or equal (2 arguments)
- `{{lt a b}}` - Less than (2 arguments)
- `{{lte a b}}` - Less than or equal (2 arguments)
- `{{eq a b}}` - Equality (2 arguments, permissive)
- `{{ne a b}}` - Not equal (2 arguments, permissive)

### Arity Requirements

- **Logical helpers** (`and`, `or`): 1 to many arguments
  - `{{and cond1}}` - valid (returns truthiness of cond1)
  - `{{and cond1 cond2 cond3}}` - valid (returns AND of all)
- **Logical NOT** (`not`): Exactly 1 argument required
  - `{{not user.isGuest}}` - valid (returns negation)
- **Comparison helpers** (`gt`, `lt`, `eq`, etc.): Exactly 2 arguments required

### Type Coercion

- **Permissive type coercion** for all helpers
- `{{gt "10" 5}}` → `true` (string "10" coerced to number 10)
- `{{eq 1 "1"}}` → `true` (loose equality for comparison helpers)
- `{{and 1 "yes" true}}` → `true` (all truthy)

### Null/Undefined Handling

- **Standard JavaScript truthy/falsy evaluation**
- `{{and undefined null false}}` → `false`
- `{{or undefined null false}}` → `false`
- `{{or undefined null "value"}}` → `true`
- `{{gt undefined 0}}` → `false` (undefined coerced, comparison fails)

### String Comparison

- **Strings compared lexicographically**
- `{{gt "2025-12-14" "2025-12-13"}}` → `true`
- `{{lt "apple" "banana"}}` → `true`
- `{{eq "hello" "hello"}}` → `true`

### Return Values

**Standalone helpers return:**
- `"true"` for truthy results
- `"false"` for falsy results

This matches the existing pattern used by `file.exists` helper and provides explicit, readable output.

### Subexpression Support

All logical helpers support subexpressions as arguments:
- `{{and (gt some.thing 1) (gt some.other 1)}}` - nested subexpressions
- `{{and (or cond1 cond2) (gt val 10)}}` - complex nesting
- `{{#if (and (gt score 100) (eq status "active"))}}` - in conditions

**Quoted String Handling:**
- Parentheses inside quoted strings are preserved as literal characters
- Example: `{{#if (and (eq user.firstName "James (Jim)") user.isActive)}}` - parentheses in `"James (Jim)"` are not parsed as subexpression delimiters
- Supports both double quotes `"..."` and single quotes `'...'`
- Supports escaped quotes: `"James \"Jim\""` and `'James \'Jim\''`

**Design Decision: No Subexpressions Inside Quoted Strings**

For clarity and consistency, subexpressions are **NOT** evaluated inside quoted strings:
- `"adminCards.users"` → literal string (no evaluation)
- `(vars.component.name)` → subexpression (evaluated)
- `"(vars.component.name)"` → literal string containing parentheses (NOT evaluated)

This maintains the clear mental model: **quotes = literal, no quotes = evaluated**.

**Subexpressions in Helper Arguments:**

Component names and other helper parameters can be subexpressions when not quoted:
- `{{#component (vars.component.name) order=5}}` ✅ Dynamic name (evaluated)
- `{{#component "adminCards.users" order=(vars.order)}}` ✅ Literal name, dynamic order
- `{{#component "(vars.component.name)" order=5}}` ❌ Literal string (confusing, not supported)
- `{{file.include (vars.template.path) title=(vars.page.title)}}` ✅ Dynamic path and title

## Syntax Examples

### Standalone Helpers

```handlebars
<!-- Logical helpers -->
{{and user.isAdmin user.isActive}}
{{or user.isGuest user.isTrial}}
{{not user.isGuest}}
{{and user.isAdmin user.isActive user.hasPermission}}

<!-- Comparison helpers -->
{{gt user.score 100}}
{{lt user.age 18}}
{{eq user.status "active"}}
{{ne user.role "guest"}}
```

### Subexpressions in Conditions

```handlebars
<!-- Simple subexpressions -->
{{#if (and user.isAdmin user.isActive)}}
    Admin is active!
{{/if}}

{{#if (gt user.score 100)}}
    High score!
{{/if}}

{{#if (eq user.status "active")}}
    User is active
{{/if}}

<!-- Nested subexpressions -->
{{#if (and (gt user.score 100) (eq user.status "active"))}}
    Active high scorer!
{{/if}}

{{#if (or (eq user.role "admin") (and (gt user.score 1000) user.isPremium))}}
    Special access!
{{/if}}

{{#unless (or (eq user.role "guest") (lt user.score 10))}}
    Regular user content
{{/unless}}

{{#if (not user.isGuest)}}
    Registered user
{{/if}}

<!-- Quoted strings with parentheses (parentheses inside quotes are preserved) -->
{{#if (and (eq user.firstName "James (Jim)") user.isActive)}}
    Active user with nickname in name
{{/if}}

{{#if (eq user.description 'Contains (parentheses)')}}
    Description has parentheses
{{/if}}
```

### Block Helpers

```handlebars
<!-- Logical block helpers -->
{{#and user.isAdmin user.isActive}}
    Active admin!
{{else}}
    Not an active admin
{{/and}}

{{#or user.isGuest user.isTrial}}
    Limited access user
{{else}}
    Full access user
{{/or}}

{{#not user.isGuest}}
    Registered user
{{else}}
    Guest user
{{/not}}

<!-- Comparison block helpers -->
{{#gt user.score 100}}
    High score: {{user.score}}
{{else}}
    Score too low
{{/gt}}

{{#eq user.status "active"}}
    User is active
{{else}}
    User is inactive
{{/eq}}

<!-- Nested subexpressions in block helpers -->
{{#and (gt user.score 100) (eq user.status "active")}}
    Active high scorer!
{{else}}
    Doesn't meet criteria
{{/and}}
```

## Design Decisions

### 1. Polish Notation (Operator-First)

Following the work item specification, we use Polish notation:
- Normal notation: `A and B`
- Polish notation: `and A B` → `(and A B)` in subexpressions

This provides:
- Clear operator identification
- Natural nesting: `(and (gt a 1) (lt b 10))`
- Consistent with functional programming patterns

### 2. Three Usage Contexts

**Standalone helpers:**
- Return explicit `"true"` or `"false"` strings
- Useful for debugging and explicit boolean output
- Can be used in other expressions

**Subexpressions:**
- Work within `{{#if}}` and `{{#unless}}` conditions
- Enable complex conditional logic
- Support unlimited nesting

**Block helpers:**
- Provide cleaner syntax than wrapping in `{{#if}}`
- All support `{{else}}` blocks
- Reduce nesting for complex conditions

### 3. Type Coercion Strategy

**Permissive coercion:**
- Numbers and numeric strings are compared numerically
- `"10" > 5` → `true` (string coerced to number)
- `1 == "1"` → `true` (loose equality for comparisons)
- Logical helpers use standard truthy/falsy evaluation

**Rationale:**
- More forgiving for template authors
- Matches common JavaScript behavior
- Reduces type conversion errors

### 4. String Comparison

**Lexicographic comparison:**
- Strings compared character-by-character
- Enables date string comparisons: `{{gt "2025-12-14" "2025-12-13"}}`
- Useful for sorting and ordering logic

### 5. Return Value Choice

**Return `"true"` / `"false"` strings:**
- Matches existing `file.exists` pattern
- Explicit and readable
- Works in conditions: `{{#if (eq (and a b) "true")}}`
- Easy to debug in templates

**Alternatives considered:**
- `"1"` / `"0"` - less clear, numeric bias
- `"1"` / `""` - inconsistent (truthy is "1", falsy is empty)

## Implementation Plan

### Phase 1: Subexpression Parser

**Goal:** Parse `(helper arg1 arg2 ...)` syntax with nested parentheses support, correctly handling quoted strings containing parentheses.

**Components:**
1. `_parseSubexpression(expr)` - Tokenize and parse subexpression
   - Handles nested parentheses: `(and (gt a 1) (lt b 10))`
   - **Critical:** Correctly handles quoted strings with parentheses: `(eq name "James (Jim)")`
   - Returns AST-like structure: `{ helper: 'and', args: [...] }`
   - Validates balanced parentheses
   - Preserves quoted strings (both `"..."` and `'...'`) with escaped quotes support

2. `_evaluateSubexpression(parsed, context)` - Recursively evaluate
   - Evaluates parsed subexpression tree
   - Calls appropriate helper function
   - Returns boolean value

**Implementation details:**
- Use recursive descent parser for parentheses
- Track nesting depth (max 16 levels, matching existing depth limit)
- **Critical:** Preserve quoted strings during parsing - parentheses inside quotes must be ignored
  - Example: `(and (eq user.firstName "James (Jim)") user.isActive)` - parentheses in `"James (Jim)"` must not be parsed as subexpression delimiters
  - Extract quoted strings first (both `"..."` and `'...'`), replace with placeholders, parse structure, then restore
- Handle whitespace normalization

### Phase 2: Helper Functions

**Goal:** Implement all 9 helper functions.

**Logical Helpers:**
- `_handleAnd(args, currentContext)` - Logical AND
  - Evaluates all args as booleans
  - Returns true if all are truthy
  - Supports 1+ arguments

- `_handleOr(args, currentContext)` - Logical OR
  - Evaluates all args as booleans
  - Returns true if any are truthy
  - Supports 1+ arguments

- `_handleNot(args, currentContext)` - Logical NOT
  - Evaluates single arg as boolean
  - Returns negation of arg
  - Requires exactly 1 argument

**Comparison Helpers:**
- `_handleGt(args, currentContext)` - Greater than
  - Coerces args to numbers/strings
  - Returns `arg1 > arg2`
  - Requires exactly 2 arguments

- `_handleGte(args, currentContext)` - Greater than or equal
  - Similar to `_handleGt`
  - Returns `arg1 >= arg2`

- `_handleLt(args, currentContext)` - Less than
  - Similar to `_handleGt`
  - Returns `arg1 < arg2`

- `_handleLte(args, currentContext)` - Less than or equal
  - Similar to `_handleGt`
  - Returns `arg1 <= arg2`

- `_handleEq(args, currentContext)` - Equality
  - Permissive equality (loose comparison)
  - Returns `arg1 == arg2` (with type coercion)

- `_handleNe(args, currentContext)` - Not equal
  - Permissive inequality
  - Returns `arg1 != arg2` (with type coercion)

**Common helper logic:**
- `_evaluateArgument(arg, context)` - Evaluate single argument
  - Handles property access: `user.isAdmin`
  - Handles subexpressions: `(gt a 1)`
  - Handles literals: `"string"`, `123`, `true`, `false`
  - Returns evaluated value

- `_coerceForComparison(a, b)` - Type coercion for comparisons
  - Attempts numeric coercion for both values
  - Falls back to string comparison if numeric fails
  - Handles null/undefined

### Phase 3: Integration Points

**Goal:** Integrate helpers into existing handlebars processing.

**0. Enhance Argument Parsing (Critical Foundation)**

**Rename and enhance `_parseArguments()` → `_parseAndEvaluateArguments()`:**

This is a foundational change that enables subexpressions in all helper arguments, not just logical helpers.

**Current behavior:**
- `_parseArguments()` parses structure only: `helper "target" key="value" key=123`
- Values are type-coerced but not evaluated as subexpressions

**New behavior:**
- `_parseAndEvaluateArguments()` parses structure AND evaluates subexpressions
- Detects subexpressions in values: `key=(subexpression)`
- Evaluates subexpressions using `_parseSubexpression()` and `_evaluateSubexpression()`
- Keeps quoted strings as literals (no evaluation inside quotes)
- Supports: `helper (subexpression) key=(subexpression) key="literal"`

**Impact - all helpers benefit:**
- Component with dynamic name: `{{#component (vars.component.name) order=(vars.order)}}`
- File include with dynamic path: `{{file.include (vars.template.path) title=(vars.page.title)}}`
- Mixed literal and dynamic: `{{components.icon size="64" name=(vars.icon.name)}}`
- Backward compatible: quoted strings remain literals

**Implementation notes:**
- Extract quoted strings first (preserve as literals)
- Detect subexpressions: values starting with `(`
- Parse and evaluate subexpressions recursively
- For unquoted non-subexpression values, evaluate as property access or literal

**1. Standalone Helper Integration**

Modify `_evaluateHandlebar()` in `webapp/controller/handlebar.js`:

```javascript
async function _evaluateHandlebar(expression, currentContext) {
    const parsedArgs = await _parseAndEvaluateArguments(expression, currentContext);
    const helper = parsedArgs._helper;

    // ... existing code ...

    switch (helper) {
        // ... existing cases ...
        case 'and':
        case 'or':
        case 'not':
        case 'gt':
        case 'gte':
        case 'lt':
        case 'lte':
        case 'eq':
        case 'ne':
            return _handleLogicalHelper(helper, parsedArgs, currentContext);
        // ... rest of cases ...
    }
}
```

**2. Subexpression Support in Conditions**

Modify `_evaluateCondition()` in `webapp/controller/handlebar.js`:

```javascript
function _evaluateCondition(params, currentContext) {
    const trimmed = params.trim();

    // Handle negation
    if (trimmed.startsWith('!')) {
        return !_evaluateCondition(trimmed.substring(1), currentContext);
    }

    // NEW: Check for subexpression syntax (helper ...)
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        const parsed = _parseSubexpression(trimmed);
        return _evaluateSubexpression(parsed, currentContext);
    }

    // ... existing logic for file.exists, property access ...
}
```

**3. Block Helper Integration**

Add to `BLOCK_HANDLEBARS` array:
```javascript
static BLOCK_HANDLEBARS = [
    'component',
    'each',
    'if',
    'let',
    'unless',
    'with',
    'and',    // NEW
    'or',     // NEW
    'not',    // NEW
    'gt',     // NEW
    'gte',    // NEW
    'lt',     // NEW
    'lte',    // NEW
    'eq',     // NEW
    'ne'      // NEW
];
```

Add cases to `_evaluateBlockHandlebar()`:
```javascript
async function _evaluateBlockHandlebar(blockType, params, blockContent, currentContext) {
    switch (blockType) {
        // ... existing cases ...
        case 'and':
        case 'or':
        case 'not':
        case 'gt':
        case 'gte':
        case 'lt':
        case 'lte':
        case 'eq':
        case 'ne':
            return _handleLogicalBlockHelper(blockType, params, blockContent, currentContext);
        // ... rest of cases ...
    }
}
```

Implement `_handleLogicalBlockHelper()`:
- Parse params as subexpression or simple arguments
- Evaluate condition using helper function
- Split block content at `{{else}}` (similar to `_handleBlockIf`)
- Return appropriate content block

### Phase 4: Error Handling

**Validation:**
- Unbalanced parentheses: `"Unbalanced parentheses in subexpression: (and (gt a 1)"`
- Invalid arity: `"Helper 'gt' requires exactly 2 arguments, got 3"`
- Invalid arity: `"Helper 'not' requires exactly 1 argument, got 2"`
- Missing arguments: `"Helper 'and' requires at least 1 argument"`
- Invalid helper name: `"Unknown helper in subexpression: 'invalid'"`

**Error messages:**
- Clear and actionable
- Include context (helper name, argument count)
- Log to `LogController` for debugging

### Phase 5: Testing

**Test categories:**

1. **Standalone helpers:**
   - Basic logical operations
   - Basic comparisons
   - Type coercion scenarios
   - Null/undefined handling
   - String comparisons

2. **Subexpressions:**
   - Simple subexpressions in `{{#if}}`
   - Nested subexpressions
   - Complex combinations
   - Edge cases (empty, single arg)
   - **Quoted strings with parentheses**: `(eq name "James (Jim)")` - parentheses in quotes must be preserved
   - **Escaped quotes**: `(eq name "James \"Jim\"")` - escaped quotes handled correctly

3. **Block helpers:**
   - Basic block helpers
   - Block helpers with `{{else}}`
   - Nested subexpressions in block helpers
   - Nested block helpers

4. **Error handling:**
   - Unbalanced parentheses
   - Invalid arity
   - Unknown helpers
   - Malformed expressions

5. **Integration:**
   - Works with existing `{{#if}}` and `{{#unless}}`
   - Works with `{{#each}}` loops
   - Works with `{{#with}}` context switching
   - Works with `{{let}}` variables

## File Changes

### Primary File
- `webapp/controller/handlebar.js`
  - Rename `_parseArguments()` → `_parseAndEvaluateArguments()` with subexpression evaluation
  - Add subexpression parser (`_parseSubexpression()`, `_evaluateSubexpression()`)
  - Add 9 helper functions (and, or, not, gt, gte, lt, lte, eq, ne)
  - Add block helper handlers
  - Enhance `_evaluateCondition()` for subexpressions
  - Enhance `_evaluateHandlebar()` for standalone helpers
  - Update `BLOCK_HANDLEBARS` array with 9 new block helpers

### Test Files
- `webapp/tests/unit/controller/handlebar.test.js` (or create new test file)
  - Comprehensive test suite for all helpers
  - Test all three usage contexts
  - Test error cases

### Documentation Files
- `docs/handlebars.md` - Add examples and documentation
- `webapp/view/jpulse-examples/handlebars.shtml` - Add live examples
- `docs/dev/work-items.md` - Update W-114 when complete

## Implementation Notes

### Subexpression Parsing Algorithm

1. **Pre-processing (Quoted String Extraction):**
   - **Critical:** Extract all quoted strings first (both `"..."` and `'...'`)
   - Scan for quoted strings, handle escaped quotes (`\"`, `\'`)
   - Replace quoted strings with placeholders (e.g., `__QUOTE_0__`, `__QUOTE_1__`)
   - Store original strings in a map for restoration
   - Example: `(eq name "James (Jim)")` → `(eq name __QUOTE_0__)` where `__QUOTE_0__ = "James (Jim)"`

2. **Tokenization:**
   - Identify opening `(`
   - Find matching closing `)`
   - Handle nested parentheses with bracket counting (now safe - no parentheses in strings)
   - Track nesting depth

3. **Parsing:**
   - Extract helper name (first token after `(`)
   - Extract arguments (remaining tokens, split by spaces)
   - Recursively parse nested subexpressions in arguments
   - Restore quoted strings from placeholders
   - Return structured tree

4. **Evaluation:**
   - Traverse parsed tree
   - Evaluate each argument (property access, subexpression, literal)
   - Call appropriate helper function
   - Return boolean result

### Argument Evaluation

Arguments can be:
- **Property paths**: `user.isAdmin` → resolved via `getNestedProperty()`
- **Subexpressions**: `(gt a 1)` → recursively parsed and evaluated
- **Literals**: `"string"`, `123`, `true`, `false` → parsed as-is
- **Quoted strings**: `"DONE"` → string value
- **Quoted strings with parentheses**: `"James (Jim)"` → string value (parentheses preserved, not parsed)

**Important:** Quoted strings are extracted before parsing, so parentheses inside quotes are preserved as literal characters, not parsed as subexpression delimiters.

### Type Coercion Details

**For comparison helpers (`gt`, `lt`, `eq`, etc.):**
1. Attempt numeric coercion for both operands
2. If both are numbers, compare numerically
3. If one is string and one is number, attempt numeric coercion of string
4. If numeric coercion fails, compare as strings (lexicographic)
5. Handle null/undefined as falsy values

**For logical helpers (`and`, `or`, `not`):**
- Use standard JavaScript truthy/falsy evaluation
- No type coercion needed
- `!!value` for boolean conversion
- `not` negates the truthiness of its single argument

## Open Questions

1. **Performance:** Should we cache parsed subexpressions? (Probably not needed initially)
2. **Extensibility:** Should helpers be pluggable/extensible? (Future consideration)
3. **Precedence:** With nested subexpressions, is explicit parentheses always required? (Yes, per design)

## References

- Work item: `docs/dev/work-items.md` line 2846-2886
- Existing implementation: `webapp/controller/handlebar.js`
- Related work: W-103 (let variables), W-102 (components), W-018 (if/else)

## Brainstorming Session Notes

**Date:** 2025-12-14

**Key Decisions:**
1. ✅ Option 2 (subexpressions) chosen over Option 1 (colon syntax)
2. ✅ Implement as actual helpers (`{{and ...}}`) not just hard-coded logic
3. ✅ Return `"true"` / `"false"` strings for standalone helpers
4. ✅ Implement block helpers (`{{#and}}`, `{{#or}}`, `{{#not}}`, etc.) with `{{else}}` support
5. ✅ Add `{{not}}` helper for logical negation (1 argument)
6. ✅ Permissive type coercion
7. ✅ Standard JS truthy/falsy for null/undefined
8. ✅ Lexicographic string comparison
9. ✅ No subexpressions inside quoted strings (quotes = literal only)
10. ✅ Rename `_parseArguments()` → `_parseAndEvaluateArguments()` to support subexpressions in all helper arguments
11. ✅ Handle parentheses in quoted strings correctly: `"James (Jim)"` preserves literal parentheses

**Discarded Options:**
- Colon syntax: `{{#if gt: val 1}}` - less flexible, harder to nest
- Hard-coded logic in `_evaluateCondition()` - less extensible
- Return `"1"` / `"0"` - less clear
- Return `"1"` / `""` - inconsistent

## Next Steps

1. ✅ Requirements documented
2. ✅ Implementation plan created
3. ⏳ Wait for implementation approval
4. ⏳ Implement Phase 1: Subexpression Parser
5. ⏳ Implement Phase 2: Helper Functions
6. ⏳ Implement Phase 3: Integration
7. ⏳ Implement Phase 4: Error Handling
8. ⏳ Implement Phase 5: Testing
9. ⏳ Update documentation
10. ⏳ Update work-items.md
