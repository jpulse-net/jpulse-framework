# W-119: I18N: Usage Audit Tests for Translations, Controllers, Views

## Status
🕑 PENDING

## Overview

Create automated tests to audit i18n translation usage across the jPulse framework. These tests will:
- Ensure translation key consistency across all language files
- Validate that all i18n references in views and controllers use valid translation keys
- Prevent runtime errors from missing or broken translation references
- Provide clear reporting of issues for easy debugging

## Objectives

1. **Translation Key Comparison**: Verify all translation files have matching key structures
2. **View i18n Usage Validation**: Check all `{{i18n.*}}` references in view files are valid
3. **Controller i18n Usage Validation**: Check all `global.i18n.translate()` calls use valid keys

## Test Types

### 1. Translation Key Comparison Test

**Complexity**: Medium
**Estimated Effort**: 2-3 hours

**Purpose**: Ensure all translation files have consistent key structures, with `en.conf` as the reference.

**Approach**:
- Load all `.conf` files in `webapp/translations/` as JavaScript objects
- Recursively flatten nested structure to get dot-notation paths (e.g., `controller.auth.loginDisabled` (exclude top level `en.`, `de.`...))
- Compare key sets between `en.conf` and other language files
- Report missing keys (in other languages but not in `en.conf`)
- Report extra keys (in `en.conf` but not in other languages)

**Implementation Details**:
- Handle nested objects recursively
- Handle edge cases (empty objects, null values)
- Report relative to `en.conf`:
  - Missing keys: `controller.auth.missingKey` in `de` (exists in `en.conf` but not in `de.conf`)
  - Extra keys: `controller.auth.extraKey` in `de` (exists in `de.conf` but not in `en.conf`)

**Example Output**:
```
Translation Key Comparison Results:
==================================
de.conf vs en.conf:
  Missing keys (2):
    - controller.auth.newKey
    - view.ui.newFeature.title
  Extra keys (1):
    - controller.auth.deprecatedKey
```

**Challenges**:
- Recursive object traversal
- Handling nested structures
- Clear reporting format

---

### 2. View i18n Usage Test

**Complexity**: Medium
**Estimated Effort**: 3-4 hours

**Purpose**: Validate all `{{i18n.*}}` references in view files use valid translation keys.

**Scope**: All files in `webapp/view/`:
- `.js` files (e.g., `jpulse-common.js`)
- `.css` files (if they contain Handlebars)
- `.tmpl` files (Handlebars templates)
- `.shtml` files (server-side templates)

**Approach**:
- Read all relevant files in `webapp/view/`
- Use regex to find `{{i18n.*}}` patterns: `/\{\{i18n\.([^}]+)\}\}/g`
- Extract key paths (e.g., `view.ui.alertDialog.title`)
- Validate against flattened `en.conf` keys
- Report broken references with file and line number

**Implementation Details**:
- Regex pattern: `/\{\{i18n\.([^}]+)\}\}/g`
- Handle edge cases:
  - Nested braces: `{{i18n.view.ui.alertDialog.title}}`
  - Comments: `{{!-- {{i18n.view.ui.alertDialog.title}} --}}`
  - Escaped: `&#123;&#123;i18n.view.ui.alertDialog.title&#125;&#125;` (should be ignored)
- Filter out false positives (commented code, examples)
- Report file path, line number, and broken key

**Example Output**:
```
View i18n Usage Validation Results:
===================================
Broken references (3):
  webapp/view/jpulse-common.js:880
    {{i18n.view.ui.confirmDialog.title}} → Key not found: view.ui.confirmDialog.title

  webapp/view/admin/config.shtml:45
    {{i18n.view.admin.missingKey}} → Key not found: view.admin.missingKey

  webapp/view/user/profile.shtml:120
    {{i18n.view.user.oldKey}} → Key not found: view.user.oldKey
```

**Challenges**:
- Regex refinement for edge cases
- Different file types may have different escaping rules
- Filtering false positives (commented code, examples)

---

### 3. Controller i18n Usage Test

**Complexity**: Medium-Hard
**Estimated Effort**: 4-6 hours (regex) or 6-8 hours (AST)

**Purpose**: Validate all `global.i18n.translate()` calls in controller files use valid translation keys.

**Scope**: All `.js` files in `webapp/controller/`

**Approach**:
- Read all `.js` files in `webapp/controller/`
- Find `global.i18n.translate()` calls
- Extract key arguments (first string parameter after `req`)
- Validate against flattened `en.conf` keys
- Report broken references

**Implementation Details**:

**Option A: Regex Approach** (Simpler, faster, less accurate)
- Pattern: `/global\.i18n\.translate\s*\(\s*[^,]+,\s*['"]([^'"]+)['"]/g`
- Pros: Simple, fast, no dependencies
- Cons: Fragile with multiline, string concatenation, variables

**Option B: AST Approach** (More accurate, heavier)
- Use `@babel/parser` or `esprima` to parse JavaScript
- Traverse AST to find `CallExpression` nodes
- Extract string literals from arguments
- Pros: Handles all edge cases, accurate
- Cons: Requires npm dependency, more complex

**Handle Variations**:
```javascript
// Simple case
global.i18n.translate(req, 'controller.auth.loginSuccess')

// With options
global.i18n.translate(req, 'controller.auth.loginSuccess', { user: name })

// Variable (can't validate statically)
const key = 'controller.auth.loginSuccess';
global.i18n.translate(req, key) // Skip or warn
```

**Example Output**:
```
Controller i18n Usage Validation Results:
=========================================
Broken references (2):
  webapp/controller/auth.js:45
    global.i18n.translate(req, 'controller.auth.missingKey') → Key not found: controller.auth.missingKey

  webapp/controller/user.js:120
    global.i18n.translate(req, 'controller.user.oldKey') → Key not found: controller.user.oldKey

  webapp/controller/config.js:89
    global.i18n.translate(req, keyVar) → Dynamic key (cannot validate)
```

**Challenges**:
- JavaScript parsing complexity
- Dynamic keys (variables) can't be statically validated
- String concatenation: `'controller.' + module + '.key'`
- Multiline function calls

**Recommendation**: Start with regex approach, upgrade to AST if needed for accuracy.

---

## Implementation Plan

### Phase 1: Translation Key Comparison (Priority: High)
- Most straightforward
- Immediate value (catches missing translations)
- Foundation for other tests

### Phase 2: View i18n Usage (Priority: High)
- Catches template issues early
- Prevents runtime errors in views
- Medium complexity

### Phase 3: Controller i18n Usage (Priority: Medium)
- Most complex
- Important for controller validation
- Can start with regex, upgrade to AST if needed

## Test Structure

### File Location
```
webapp/tests/unit/i18n/
  ├── translation-keys.test.js      # Test 1: Key comparison
  ├── view-usage.test.js            # Test 2: View i18n validation
  └── controller-usage.test.js      # Test 3: Controller i18n validation
```

### Test Utilities
```
webapp/tests/unit/i18n/
  └── utils/
      ├── translation-loader.js     # Load and flatten .conf files
      ├── key-extractor.js          # Extract keys from various formats
      └── key-validator.js          # Validate keys against en.conf
```

## Expected Deliverables

1. **Three test suites**:
   - Translation key comparison test
   - View i18n usage validation test
   - Controller i18n usage validation test

2. **Utility functions**:
   - Translation file loader
   - Key path flattener
   - Regex/parser for extracting i18n references

3. **Clear reporting**:
   - Missing keys with full paths
   - Extra keys with full paths
   - Broken references with file and line numbers
   - Summary statistics

4. **Documentation**:
   - How to run tests
   - How to interpret results
   - How to fix common issues

## Current Statistics

- **Translation files**: 2 (`en.conf`, `de.conf`)
- **View i18n references**: ~512 across 22 files
- **Controller i18n references**: ~160 across 10 files

## Notes

- Tests should be fast enough to run in CI/CD
- Consider caching flattened key structures for performance
- Report format should be machine-readable (JSON) and human-readable (text)
- Consider adding `--fix` mode to automatically update translation files (future enhancement)

## Related Work Items

- None currently

## References

- Translation files: `webapp/translations/*.conf`
- View files: `webapp/view/**/*.{js,css,tmpl,shtml}`
- Controller files: `webapp/controller/**/*.js`
