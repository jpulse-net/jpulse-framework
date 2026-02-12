# W-103: Handlebars `{{let}}` and `{{#with}}` for Custom Variables

## Status
✅ **COMPLETED** (2025-12-01)

Phase 1: ✅ Inline `{{let}}` + `{{#with}}` context switching
TD-001: ✅ Block-scoped `{{#let}}` helper
Tests: 33/33 passing ✅

## Type
Feature Enhancement

## Objective
Enable template authors to define custom variables safely without polluting the main context.

## Background

### Original Proposal (W-0)
- Introduce `{{set}}` and `{{#set}}` helpers to define custom context variables
- Support both global and block scope
- Allow nested property setting: `custom.namespace.key="value"`

### Key Concerns Identified
1. **Context pollution** - Setting variables directly in context could override system variables (`user`, `config`, `appConfig`, `url`)
2. **Debugging difficulty** - Global mutation makes it hard to track where variables are defined
3. **Name collision** - Risk of accidentally overriding existing properties
4. **Scope confusion** - Unclear semantics for block scope persistence

### Solution: `vars` Namespace
All user-defined variables live in a dedicated `vars.*` namespace:
- **Safe** - Cannot collide with system context (`user`, `config`, etc.)
- **Clear** - `{{vars.myVar}}` is self-documenting
- **Predictable** - Isolated from framework internals

### Design Philosophy: Start Simple
Following YAGNI principle ("You Aren't Gonna Need It"):
- Implement minimal useful feature set first
- Add complexity only when proven necessary
- Prefer clarity over features

## Feature Design (Phase 1 - Simplified)

### Syntax Overview

#### 1. Inline Variable Assignment: `{{let}}`
```handlebars
{{let key1="val1" key2=123 key3=true custom.namespace.key="nested"}}
```
- Sets variables in `vars.*` namespace
- Persists within current template scope
- No output produced
- Supports nested properties via dot notation

#### 2. Context Switching: `{{#with}}` (Standard Handlebars Only)
```handlebars
{{#with user}}
  <p>{{firstName}} {{lastName}}</p>
{{/with}}
```
- Traditional Handlebars behavior ONLY
- Changes context root to specified object
- Properties accessed directly (no `vars.*` prefix)
- Does NOT support variable assignment mode (simplified)

### Access Pattern
```handlebars
{{let myVar="test"}}
<p>{{vars.myVar}}</p>
```
- Define with `{{let}}`
- Access via `{{vars.*}}`
- Supports nested properties: `{{vars.custom.deep.key}}`

### What's NOT Included (Phase 1)
- ❌ Block-scoped variables (`{{#with key="value"}}`)
- ❌ Dual-mode `{{#with}}` detection
- ❌ Expression evaluation
- ❌ Object/Array literals (use dot notation instead)

## Use Cases

### Use Case 1: Template Configuration
```handlebars
{{let pageTitle="Admin Dashboard" maxItems=10 theme.color="blue"}}

<title>{{vars.pageTitle}}</title>
<div class="theme-{{vars.theme.color}}">
  {{#each items}}
    {{#if @index < vars.maxItems}}
      <li>{{this}}</li>
    {{/if}}
  {{/each}}
</div>
```

### Use Case 2: Computed Display Values
```handlebars
{{let fullName="{{user.firstName}} {{user.lastName}}"}}
{{let greeting="Welcome, {{vars.fullName}}!"}}

<h1>{{vars.greeting}}</h1>
<p>Profile for {{vars.fullName}}</p>
```

### Use Case 3: Conditional Context Building
```handlebars
{{#if user.isAdmin}}
  {{let pageTitle="Admin Dashboard" showTools=true}}
{{else}}
  {{let pageTitle="User Dashboard" showTools=false}}
{{/if}}

<title>{{vars.pageTitle}}</title>
{{#if vars.showTools}}
  <div class="toolbar">...</div>
{{/if}}
```

### Use Case 4: Standard Context Switching
```handlebars
{{#with user}}
  <h1>{{firstName}}'s Dashboard</h1>
  <p>Email: {{email}}</p>
{{/with}}

{{#with config.database}}
  <p>Host: {{host}}, Port: {{port}}</p>
{{/with}}
```

### Use Case 5: Nested Properties
```handlebars
{{let api.endpoint="/api/v2/items" api.timeout=5000}}
{{let ui.theme="dark" ui.compact=true}}

<div data-endpoint="{{vars.api.endpoint}}"
     data-timeout="{{vars.api.timeout}}"
     class="theme-{{vars.ui.theme}} {{#if vars.ui.compact}}compact{{/if}}">
</div>
```

## Implementation Details

### Location
`webapp/controller/handlebar.js`

### Code Changes

#### 1. Add `{{let}}` to `_evaluateHandlebar()` (~line 410)
```javascript
case 'let':
    return _handleLet(parsedArgs, currentContext);
```

#### 2. Add `{{#with}}` to `_evaluateBlockHandlebar()` (~line 382)
```javascript
case 'with':
    return await _handleWithBlock(params, blockContent, currentContext);
```

#### 3. Initialize `vars` namespace in `_buildInternalContext()` (~line 101)
```javascript
const baseContext = {
    app: appConfig.app,
    user: { /*...*/ },
    config: this.globalConfig?.data || {},
    appConfig: appConfig,
    appCluster: { /*...*/ },
    url: { /*...*/ },
    i18n: global.i18n.getLang(AuthController.getUserLanguage(req)),
    components: {},
    vars: {}  // ← Add this line
};
```

#### 4. Implement `_handleLet()` helper
```javascript
/**
 * Handle {{let}} inline variable assignment
 * Sets variables in vars namespace (template-scoped)
 */
function _handleLet(parsedArgs, currentContext) {
    // Ensure vars namespace exists
    if (!currentContext.vars) {
        currentContext.vars = {};
    }

    // Set all key=value pairs in vars namespace
    for (const [key, value] of Object.entries(parsedArgs)) {
        if (key !== '_helper' && key !== '_target') {
            _setNestedProperty(currentContext.vars, key, value);
        }
    }

    LogController.logInfo(req, 'handlebar.let',
        `Variables set: ${Object.keys(parsedArgs).filter(k => k !== '_helper' && k !== '_target').join(', ')}`);

    return ''; // No output
}
```

#### 5. Implement `_handleWithBlock()` helper (context switching only)
```javascript
/**
 * Handle {{#with}} block (context switching only - standard Handlebars)
 * Switches context root to specified object
 */
async function _handleWithBlock(params, blockContent, currentContext) {
    const trimmedParams = params.trim();

    // Get the context object
    const contextValue = getNestedProperty(currentContext, trimmedParams);

    if (!contextValue || typeof contextValue !== 'object') {
        LogController.logInfo(req, 'handlebar.with',
            `Context not found or invalid: ${trimmedParams}`);
        return ''; // Empty output if context not found
    }

    // Switch context root to this object
    const blockContext = {
        ...currentContext,
        ...contextValue
    };

    LogController.logInfo(req, 'handlebar.with',
        `Context switched to: ${trimmedParams}`);

    return await _resolveHandlebars(blockContent, blockContext);
}
```

### Leverages Existing Infrastructure
- ✅ `_parseArguments()` - Already handles type conversion (string, number, boolean)
- ✅ `_setNestedProperty()` - Already creates nested objects (lines 1141-1154)
- ✅ `getNestedProperty()` - Already handles dot notation access
- ✅ Block handler pattern - Established in existing code

## Scope Behavior

### `{{let}}` - Template Scope
```handlebars
{{let var1="value1"}}
<!-- var1 persists throughout template -->
{{file.include "partial.shtml"}}
<!-- var1 NOT available in included file (each has own vars) -->
```

### `{{#with}}` - Context Switching
```handlebars
{{#with user}}
  {{firstName}}  <!-- Direct access to user.firstName -->
{{/with}}
{{firstName}}  <!-- Not available (context restored) -->
```

### Nested Usage
```handlebars
{{let greeting="Hello"}}
{{#with user}}
  <p>{{vars.greeting}}, {{firstName}}!</p>  <!-- Both work: vars.* and context -->
{{/with}}
```

## Effort Estimate
**3-4 hours total** (reduced from 5-7 hours due to simplification)

### Breakdown
1. **Core Implementation** (1.5-2 hours)
   - Add case handlers for `let` and `with`
   - Implement `_handleLet()` function
   - Implement `_handleWithBlock()` (simple context switching only)
   - Initialize `vars: {}` in `_buildInternalContext()`

2. **Testing** (1-1.5 hours)
   - Unit tests for `{{let}}` inline assignment
   - Unit tests for `{{#with}}` context switching
   - Test nested property setting
   - Test type handling (string, number, boolean)
   - Integration tests with existing handlebars

3. **Documentation** (0.5-1 hour)
   - Update handlebar docs with examples
   - Add to template authoring guide
   - Document `vars.*` namespace pattern

## Deliverables
- [x] `webapp/controller/handlebar.js` - Implement `{{let}}` inline helper
- [x] `webapp/controller/handlebar.js` - Implement `{{#let}}` block helper (TD-001)
- [x] `webapp/controller/handlebar.js` - Implement `{{#with}}` context switching
- [x] `webapp/controller/handlebar.js` - Initialize `vars: {}` in `_buildInternalContext()`
- [x] `webapp/tests/unit/controller/handlebar-variables.test.js` - 33 comprehensive unit tests
- [x] `webapp/view/jpulse-examples/handlebars.shtml` - Live examples with source code

## Benefits
1. **Safety** - No risk of overriding system context variables
2. **Clarity** - Self-documenting code (`{{vars.myVar}}`)
3. **Simplicity** - Easy to understand and teach (one helper, one purpose)
4. **Familiarity** - `{{#with}}` is standard Handlebars pattern
5. **Maintainability** - Easy to debug (all custom vars in one namespace)
6. **Low Complexity** - Minimal code, leverages existing infrastructure
7. **Fast to Ship** - Can deliver in 3-4 hours vs 5-7 hours

## Edge Cases & Validation

### Protected Behavior
```handlebars
{{!-- These are safe - can't override system vars --}}
{{let user="myvalue"}}  <!-- Creates vars.user, not context.user -->
{{vars.user}}  <!-- "myvalue" -->
{{user.firstName}}  <!-- Still accesses system user object -->
```

### Empty Parameters
```handlebars
{{let}}  <!-- No-op, no error -->
{{#with}}content{{/with}}  <!-- Returns content as-is or error -->
```

### Template Composition (instead of expressions)
```handlebars
{{!-- Use handlebars expansion for computed values --}}
{{let fullName="{{user.firstName}} {{user.lastName}}"}}
{{let timestamp="{{url.param.date}}"}}
```

## Open Questions & Answers

### Q: Support common Handlebar syntax?
```handlebars
{{#with person}} {{firstname}} {{lastname}} {{/with}}
```
**A: ✅ YES** - Context switching mode fully supported

### Q: Support object declaration?
```handlebars
{{let complex={a: 1, b: "ok"} array=[1, 2, "three"]}}
```
**A: 🔶 PHASE 2** - Use dot notation in Phase 1:
```handlebars
{{let complex.a=1 complex.b="ok" array.0=1 array.1=2}}
```

### Q: Support evaluations (security risk)?
```handlebars
{{let result="eval(vars.a + vars.b)"}}
```
**A: ❌ NO** - Big security risk. Use template composition instead:
```handlebars
{{let result="{{vars.a}} + {{vars.b}}"}}
```

## Tech Debt / Future Enhancements

### TD-001: Block-Scoped Variables with `{{#let}}` ✅ COMPLETED

**Status:** ✅ **IMPLEMENTED** (2025-12-01)

**Problem:** Template-scoped variables may pollute in loops
```handlebars
{{#each items}}
  {{let itemClass="active"}}  <!-- Pollutes, persists after loop -->
  <li class="{{vars.itemClass}}">{{name}}</li>
{{/each}}
```

**Implemented Solution:** `{{#let}}` block helper for scope isolation
```handlebars
{{#each items}}
  {{#let itemClass="active"}}
    <li class="{{vars.itemClass}}">{{name}}</li>
  {{/let}}
  <!-- vars.itemClass discarded here -->
{{/each}}
```

**Features Implemented:**
- ✅ Block-scoped variables with `{{#let key="value"}}...{{/let}}`
- ✅ Scope isolation - variables don't persist after block
- ✅ Scope inheritance - can access parent scope vars
- ✅ No leakage - modifications to parent vars stay in block
- ✅ Nested blocks - proper scope stacking
- ✅ Works in loops - each iteration isolated

**Implementation Details:**
- Location: `webapp/controller/handlebar.js`
- Added case to `_evaluateBlockHandlebar()` (line ~395)
- Implemented `_handleLetBlock()` function (~50 lines)
- Uses same regex parsing as inline `{{let}}`
- Clones parent `vars` object for isolation
- 7 comprehensive unit tests added

**Tests:** 33/33 passing (7 new tests for block scope)

**Examples Added:**
- `webapp/view/jpulse-examples/handlebars.shtml`
- Basic block scope example
- Loop pollution prevention
- Nested block scopes

**Actual Effort:** ~1 hour (including tests and examples)

**Decision:** ✅ Implemented immediately after Phase 1 completion

### TD-002: Expression Support (Not in Phase 1)

**Current:** Only literal values
```handlebars
{{let total=100}}  <!-- ✅ Works -->
{{let total=(price * quantity)}}  <!-- ❌ Not supported -->
```

**Proposed:** Safe expression parser (whitelist only, NO eval)
```handlebars
{{let total=(vars.price * vars.quantity)}}
{{let display=(vars.nickname || vars.firstName)}}
{{let isEven=(vars.index % 2 === 0)}}
```

**Requirements:**
- Custom expression parser (AST-based)
- Whitelist operators: `+`, `-`, `*`, `/`, `%`, `||`, `&&`, `===`, etc.
- Only access `vars.*` namespace
- No function calls, no arbitrary code

**Effort if needed:** +4-6 hours

**Decision:** Wait for user demand. Template composition may be sufficient.

### TD-003: JSON String Auto-Parsing (Not in Phase 1)

**Proposed:** Auto-detect and parse JSON strings
```handlebars
{{let config='{"theme":"dark","timeout":5000}'}}
{{vars.config.theme}}  <!-- Auto-parsed to object -->
```

**Effort if needed:** +1 hour

## Alternatives Considered

### Alternative 1: `{{set}}` / `{{#set}}`
- ❌ Rejected: Generic name, unclear purpose
- ❌ Risk of confusion with "setting" context properties

### Alternative 2: `{{var}}` / `{{#var}}`
- ❌ Rejected: `var` is discouraged in modern JavaScript
- ❌ Singular form sounds odd for multiple assignments

### Alternative 3: Direct context modification
- ❌ Rejected: Too risky, hard to debug
- ❌ Could override system variables

### Alternative 4: Dual-mode `{{#with}}` (with `=` detection)
- ⚠️ Considered but deferred to Phase 2 (Tech Debt TD-001)
- Adds complexity and potential confusion
- Not needed for 80% of use cases

## Decision Rationale

**Chosen: `{{let}}` inline + `{{#with}}` context switching (simplified)**

**Why simplified approach:**
- ✅ **YAGNI** - Start with what's needed, add complexity only when proven necessary
- ✅ **Easier to teach** - One helper = one purpose
- ✅ **Faster to implement** - 3-4 hours vs 5-7 hours
- ✅ **Easier to maintain** - Less code, fewer edge cases
- ✅ **Easy to extend** - Can add `{{#let}}` block helper in Phase 2 if needed

**Why `{{let}}`:**
- Familiar from JavaScript (let declares variables)
- Clear intent: "let me define variables"
- Short and readable

**Why `{{#with}}` context switching only:**
- Standard Handlebars behavior (familiar)
- No dual-mode confusion
- Clear semantics

**Why `vars.*` namespace:**
- Prevents any possibility of context pollution
- Self-documenting in templates
- Easy to protect and validate
- Clear separation from system context

---

**Created:** 2025-12-01
**Updated:** 2025-12-01 (simplified to Phase 1 implementation)
**Status:** Ready for implementation
**Complexity:** Low (simplified from Low-Medium)
**Effort:** 3-4 hours (reduced from 5-7 hours)
```

---

**Key Changes Made:**
1. ✅ Removed dual-mode `{{#with}}` complexity
2. ✅ Simplified to just context switching for `{{#with}}`
3. ✅ Added Tech Debt section with TD-001 for `{{#let}}` block helper
4. ✅ Reduced effort estimate to 3-4 hours
5. ✅ Added Tech Debt items for expressions (TD-002) and JSON parsing (TD-003)
6. ✅ Updated decision rationale to explain simplification
7. ✅ Removed use cases requiring block scope
8. ✅ Clarified what's NOT included in Phase 1

This gives you a clean, simple implementation path with clear options for future enhancement if needed!

---

## ✅ IMPLEMENTATION COMPLETED - 2025-12-01

### What Was Implemented

**Phase 1 (Core Features):**
1. ✅ `{{let key="value"}}` - Inline variable assignment in `vars.*` namespace
2. ✅ `{{#with object}}` - Context switching (standard Handlebars)
3. ✅ `{{vars.*}}` - Safe namespace for user-defined variables
4. ✅ Nested properties - `{{let config.theme="dark"}}`
5. ✅ Type support - strings, numbers, booleans
6. ✅ 26 comprehensive unit tests

**TD-001 (Block Scope):**
1. ✅ `{{#let key="value"}}...{{/let}}` - Block-scoped variables
2. ✅ Scope isolation - variables don't leak to parent
3. ✅ Scope inheritance - can access parent vars
4. ✅ Nested blocks - proper scope stacking
5. ✅ Loop safety - prevents variable pollution
6. ✅ 7 additional unit tests (33 total)

**Documentation & Examples:**
1. ✅ Live examples in `webapp/view/jpulse-examples/handlebars.shtml`
2. ✅ Source code samples for all features
3. ✅ Working document with design rationale

### Test Results
- **33/33 tests passing** ✅
- Coverage: inline assignment, block scope, context switching, nesting, edge cases
- No linter errors

### Files Modified
1. `webapp/controller/handlebar.js` (~200 lines added)
   - Added `vars: {}` to context initialization
   - Implemented `_handleLet()` inline helper
   - Implemented `_handleLetBlock()` block helper
   - Implemented `_handleWithBlock()` context switcher

2. `webapp/tests/unit/controller/handlebar-variables.test.js` (362 lines, new file)
   - 33 comprehensive tests covering all features

3. `webapp/view/jpulse-examples/handlebars.shtml` (~100 lines added)
   - 3 new interactive example sections
   - Live demos with source code

### Actual Time
- **Phase 1:** ~3 hours (as estimated)
- **TD-001:** ~1 hour (faster than estimated 1-2 hours)
- **Total:** ~4 hours

### Remaining Tech Debt (Optional Future Enhancements)
- TD-002: Expression Support (safe parser, no eval)
- TD-003: JSON String Auto-Parsing

### Usage Examples

**Inline Variables:**
```handlebars
{{let pageTitle="Dashboard" theme="dark" maxItems=10}}
<title>{{vars.pageTitle}}</title>
```

**Block Scope:**
```handlebars
{{#each items}}
  {{#let rowClass="active"}}
    <li class="{{vars.rowClass}}">{{this}}</li>
  {{/let}}
{{/each}}
```

**Context Switching:**
```handlebars
{{#with user}}
  <p>{{firstName}} {{lastName}}</p>
{{/with}}
```

---

**Implementation Date:** 2025-12-01
**Final Status:** ✅ FULLY COMPLETED
**Quality:** Production ready with comprehensive test coverage
