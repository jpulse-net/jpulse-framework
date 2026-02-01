# W-119: I18N: Usage Audit Tests for Translations, Controllers, Views

## Status
🚧 IN_PROGRESS

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

---

## Detailed Implementation Plan

### Step 1: Create Utility Functions

**Location**: `webapp/tests/unit/i18n/utils/`

#### 1.1 `translation-loader.js`
- **Purpose**: Load, parse, and flatten translation `.conf` files to sorted key arrays
- **Functions**:
  - `loadTranslationFile(filePath)`: Read and evaluate `.conf` file, extract language data, flatten to sorted key array
  - `loadAllTranslations(translationsDir)`: Load all `.conf` files from directory
  - `flattenKeys(obj, prefix = '')`: Recursively flatten nested object to dot-notation paths (internal helper)
- **Implementation**:
  - Use `fs.readFileSync` to read files
  - Use `new Function()` to safely evaluate JavaScript (same approach as `webapp/utils/i18n.js`)
  - Extract language data (remove top-level `en.`, `de.` wrapper)
  - Flatten nested structure recursively to dot-notation paths
  - Sort keys alphabetically for consistent comparison
  - Return flattened structure: `{ en: ['controller.auth.accountDisabled', 'controller.auth.accountLocked', ...], de: [...] }`
- **Key Flattening Logic**:
  - Handle nested objects recursively
  - Skip arrays (treat as leaf values)
  - Handle null/undefined values (treat as leaf)
  - Reuse logic from `webapp/utils/i18n.js::getObjectPaths()` or create test-specific version

#### 1.2 `key-validator.js`
- **Purpose**: Validate keys against reference translation file
- **Functions**:
  - `validateKeys(referenceKeys, targetKeys)`: Compare two key sets
  - Returns: `{ missing: [...], extra: [...] }`
- **Implementation**:
  - Compare arrays of dot-notation paths
  - Missing: keys in reference but not in target
  - Extra: keys in target but not in reference

#### 1.3 `key-extractor.js`
- **Purpose**: Extract i18n keys from various source formats
- **Functions**:
  - `extractViewKeys(content, filePath)`: Extract `{{i18n.*}}` patterns from view files
  - `extractControllerKeys(content, filePath)`: Extract `global.i18n.translate()` calls from controller files
- **Implementation**:
  - **View extraction**: Use regex `/\{\{@?i18n\.([^}]+)\}\}/g` (matches both `{{i18n.}}` and `{{@i18n.}}`)
    - Filter out commented code: `{{!-- ... --}}`
    - Filter out HTML-escaped: `&#123;&#123;i18n...&#125;&#125;`
    - Return: `[{ key: 'view.ui.title', line: 45, file: '...' }, ...]`
  - **Controller extraction**: Use regex `/global\.i18n\.translate\s*\(\s*[^,]+,\s*['"]([^'"]+)['"]/g`
    - Handle multiline with flag `m`
    - Skip dynamic keys (variables) - detect non-string literals
    - Return: `[{ key: 'controller.auth.loginSuccess', line: 120, file: '...' }, ...]`

### Step 2: Create Test File

**Location**: `webapp/tests/unit/i18n/i18n-usage-audit.test.js`

**Rationale**: All three test suites need the same translation keys, so combining them into a single file allows:
- Single `beforeAll` to load translations once
- Shared `enKeys` variable across all test suites
- Simpler structure, no need for file caching
- Jest's `beforeAll` runs even if only one test is executed

#### 2.1 Combined Test Structure
```javascript
describe('I18N Usage Audit', () => {
    let translations; // { en: [...], de: [...] } - flattened, sorted arrays
    let enKeys; // Reference keys from en.conf

    beforeAll(() => {
        // Load all translation files once (already flattened by translation-loader)
        translations = loadAllTranslations(translationsDir);
        enKeys = translations.en; // Reference keys (sorted array)
    });

    describe('Translation Key Comparison', () => {
        test('en.conf should be the reference language', () => {
            // Verify en.conf exists and is valid
            expect(enKeys).toBeDefined();
            expect(enKeys.length).toBeGreaterThan(0);
        });

        test.each(['de'])('should have matching keys with en.conf', (langCode) => {
            // Compare each language file with en.conf
            const targetKeys = translations[langCode];
            const { missing, extra } = validateKeys(enKeys, targetKeys);
            // Report missing and extra keys
            expect(missing).toEqual([]);
            expect(extra).toEqual([]);
        });
    });

    describe('View i18n Usage Validation', () => {
        test('should validate all {{i18n.*}} references', () => {
            // Discover all view files
            // Extract all i18n keys from view files
            // Validate against enKeys
            // Report broken references
        });

        test('should handle escaped handlebars correctly', () => {
            // Verify {{@i18n.*}} patterns are extracted
        });

        test('should ignore commented code', () => {
            // Verify {{!-- ... --}} patterns are ignored
        });
    });

    describe('Controller i18n Usage Validation', () => {
        test('should validate all global.i18n.translate() calls', () => {
            // Discover all controller files
            // Extract all translation keys from controller files
            // Validate against enKeys
            // Report broken references
        });

        test('should report dynamic keys separately', () => {
            // Identify and report keys that use variables (cannot validate)
        });

        test('should handle multiline function calls', () => {
            // Verify regex handles multiline patterns
        });
    });
});
```

**File Discovery**:
- **Views**: Scan `webapp/view/` recursively
  - Include: `.js`, `.shtml`, `.tmpl`, `.css` (if contains Handlebars)
- **Controllers**: Scan `webapp/controller/` recursively
  - Include: All `.js` files
  - Exclude: Test files (`*.test.js`)

**Output Format**:
- Console: Human-readable summary
- Test assertions: Fail if missing/extra keys found
- Detailed report: List all differences with file and line numbers

### Step 3: Implementation Details

#### 3.1 Translation File Loading
- **Approach**: Direct file reading (no app bootstrap required)
- **Parsing**: Use `new Function()` to evaluate JavaScript (same as production code)
- **Error Handling**: Catch syntax errors, report invalid files
- **Path Resolution**: Use `path.join(process.cwd(), 'webapp/translations')`

#### 3.2 Key Flattening (Integrated in translation-loader.js)
- **Location**: Flattening logic is part of `translation-loader.js`
- **Reuse**: Consider importing `getObjectPaths` from `webapp/utils/i18n.js` if possible
- **Alternative**: Create test-specific version to avoid dependencies
- **Edge Cases**:
  - Empty objects: return empty array
  - Null values: treat as leaf (include in paths)
  - Arrays: treat as leaf (don't recurse)
- **Sorting**: Keys are sorted alphabetically for consistent comparison and reporting

#### 3.3 View Key Extraction
- **Regex Pattern**: `/\{\{@?i18n\.([^}]+)\}\}/g`
- **Filtering**:
  - Skip `{{!-- ... --}}` comments (check if match is inside comment)
  - Skip HTML-escaped: `&#123;&#123;` and `&#125;&#125;`
  - Handle line numbers: track line breaks in content
- **Key Extraction**: Remove `i18n.` prefix, trim whitespace

#### 3.4 Controller Key Extraction
- **Regex Pattern**: `/global\.i18n\.translate\s*\(\s*[^,]+,\s*['"]([^'"]+)['"]/gm`
- **Multiline Support**: Use `m` flag for multiline matching
- **Dynamic Key Detection**: If second argument is not a string literal, skip with warning
- **Limitations**:
  - Won't catch string concatenation: `'controller.' + module + '.key'`
  - Won't catch template literals with variables: `` `controller.${module}.key` ``
  - Report these as "dynamic keys (cannot validate)"

### Step 4: Reporting

#### 4.1 Test Output Format
- **Console Output**: Human-readable summary
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
- **Test Assertions**:
  - Fail test if any missing/extra keys found
  - Provide detailed error messages with all issues

#### 4.2 Error Messages
- Include: File path, line number, key path, issue type
- Format: `file:line → key → issue`
- Group by file for readability

### Step 5: Testing Strategy

#### 5.1 Unit Tests for Utilities
- Test each utility function independently
- Mock file system operations where needed
- Test edge cases (empty files, invalid syntax, etc.)

#### 5.2 Integration Tests
- Run full audit tests against actual codebase
- Verify they catch real issues
- Ensure performance is acceptable (< 2 seconds for small scale)

#### 5.3 Test Data
- Use actual translation files from `webapp/translations/`
- Use actual view/controller files from codebase
- No need for mock data (real-world validation)

### Step 6: File Structure

```
webapp/tests/unit/i18n/
├── i18n-usage-audit.test.js     # Combined test file (3 test suites)
└── utils/
    ├── translation-loader.js    # Loads, parses, and flattens translation files
    ├── key-validator.js          # Validates keys against reference
    └── key-extractor.js          # Extracts keys from views/controllers
```

### Step 7: Dependencies

- **No new npm dependencies required** (following user preference)
- Use Node.js built-ins: `fs`, `path`
- Reuse existing utilities from `webapp/utils/i18n.js` where possible
- Use Jest built-in features for testing

### Step 8: Performance Considerations

- **In-Memory Storage**: Flattened key arrays are small and kept in memory during test execution
- **Sequential Processing**: Simple sequential file reading is sufficient (no parallel processing needed)
- **Early Exit**: Stop on first error if in strict mode (optional)
- **Expected Performance**: Complete audit should complete in < 2 seconds (small scale: 2 translation files, ~22 view files, ~10 controller files)

### Step 9: Error Handling

- **Invalid Translation Files**: Report syntax errors clearly
- **Missing Files**: Skip with warning (don't fail entire test suite)
- **Permission Errors**: Report and skip
- **Malformed Keys**: Report but continue processing

### Step 10: Future Enhancements (Out of Scope)

- `--fix` mode to automatically update translation files
- JSON output format for CI/CD integration
- Exclude patterns for specific files/directories
- AST-based controller parsing (if regex proves insufficient)

## Test Structure

### File Location
```
webapp/tests/unit/i18n/
  ├── i18n-usage-audit.test.js      # Combined test file with 3 test suites
  └── utils/
      ├── translation-loader.js     # Load and flatten .conf files
      ├── key-extractor.js          # Extract keys from various formats
      └── key-validator.js          # Validate keys against en.conf
```

**Note**: All three test suites are combined into a single file because they share the same translation keys. The `beforeAll` hook loads translations once and makes them available to all test suites. Jest will run `beforeAll` even if only one test is executed.

## Expected Deliverables

1. **One combined test file with three test suites**:
   - Translation key comparison test suite
   - View i18n usage validation test suite
   - Controller i18n usage validation test suite

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

- Tests should be fast enough to run in CI/CD (expected < 2 seconds)
- Flattened key arrays are small and kept in memory during test execution
- Report format should be machine-readable (JSON) and human-readable (text)
- Consider adding `--fix` mode to automatically update translation files (future enhancement)

## Related Work Items

- None currently

## References

- Translation files: `webapp/translations/*.conf`
- View files: `webapp/view/**/*.{js,css,tmpl,shtml}`
- Controller files: `webapp/controller/**/*.js`
