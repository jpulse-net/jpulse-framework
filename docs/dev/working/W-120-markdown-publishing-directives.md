# W-120: markdown: publishing directives for sort order and page titles

## Status
✅ COMPLETED (2025-12-20)

## Objectives
More control over markdown docs publishing:
- Define custom sort order for important docs (partial list)
- Specify custom page titles
- Ignore files/directories (replaces `.jpulse-ignore`)
- Override title case fixes (replaces `app.conf` config)

## Current Status
- ✅ Custom sort order for important docs using `[publish-list]` in `.markdown` file
- ✅ Custom page titles supported in `[publish-list]` section
- ✅ Ignore patterns moved from `.jpulse-ignore` to `[ignore]` section in `.markdown`
- ✅ Title case fixes merged from `app.conf` defaults + `.markdown` overrides
- ✅ Sidebar now follows `[publish-list]` order (explicit files first, then alphabetical)
- ✅ Directories with only README.md display as regular files (not expandable directories)
- ✅ Virtual README generation for directories without physical README.md

## Specification

### File Format: `.markdown`

Single configuration file in the docs root directory (e.g., `docs/.markdown`). All sections are optional.

```ini
[publish-list]
# Partial list: Only files listed here are ordered explicitly
# Remaining files are published in alphabetical order (except [ignore] ones)
# Format: filepath [optional-title]
# - Paths relative to docs/ root
# - Subdirectories: explicitly list each file (e.g., plugins/README.md)
# - Subdirectory titles: auto-generated from directory name if omitted
# - Regular file titles: auto-generated from filename if omitted
# - Whitespace separator (spaces or tabs)

README.md           jPulse Docs
getting-started.md  Getting Started
installation.md     Installation

plugins/README.md   Plugins
plugins/creating-plugins.md
plugins/managing-plugins.md

[ignore]
# Ignore patterns (gitignore-like syntax)
# Takes precedence over [publish-list] - ignored files are excluded even if listed in [publish-list]
# Use "*" for whitelist mode (only [publish-list] files published)

dev/tmp.md
dev/working/
*.backup.md

[title-case-fix]
# Word substitutions for auto-generated titles
# Format: from-word    to-word
# MERGED with app.conf controller.markdown.titleCaseFix (framework defaults + site overrides)
# Applied when title is auto-generated (not when explicitly set in [publish-list])

Api             API
CHANGELOG       Version History
Css             CSS
Javascript      JavaScript
```

### Behavior Rules

#### 1. `[publish-list]` - Partial Ordering
- **Partial list**: Files explicitly listed appear first in specified order
- **Remaining files**: Published in alphabetical order (after listed ones)
- **Ignore interaction**: Files matching `[ignore]` are excluded **even if** explicitly listed in `[publish-list]` (ignore takes precedence)
- **Whitelist mode**: Use `*` in `[ignore]` to only publish files in `[publish-list]`

#### 2. Subdirectories
- **Explicit listing only**: No `plugins/` shorthand - must list individual files
- **Title generation**:
  - If title specified: use it
  - If omitted: auto-generate from directory name (e.g., `plugins/` → "Plugins")
- **Recursive handling**: Subdirectories are scanned and respect `[publish-list]`, `[ignore]`, and `[title-case-fix]` relative to their path
- **No subdirectory-level configs**: Only root `.markdown` file

#### 3. Title Generation Priority
1. **Explicit title in `[publish-list]`** → use as-is
2. **Auto-generated title**:
   - Start with `app.conf controller.markdown.titleCaseFix` (framework defaults)
   - Merge/overload with `[title-case-fix]` from `.markdown` (site overrides)
   - Apply merged fixes to auto-generated title

#### 4. Subdirectory Without README
When clicking a subdirectory in sidebar that has no `README.md`:
- **Current behavior**: Directory is not clickable (just a label)
- **New behavior**: Auto generated docs list

#### 5. Configuration Behavior
- If `.markdown` doesn't exist: use default (alphabetical, `app.conf` titleCaseFix if present)
- If `.markdown` has invalid format/unknown sections: ignore invalid sections, use valid ones
- **No warnings** on errors (fail gracefully)

### Parser Requirements
- Simple regex-based (no 3rd party lib)
- Content is small, simple parsing sufficient
- Identify sections: `^\[([\w-]+)\]$` (allows hyphens for `[publish-list]`, `[title-case-fix]`)
- Parse lines: split on whitespace, first token is path, rest is optional title

## Implementation Plan

### Phase 1: Parser Implementation

**File**: `webapp/controller/markdown.js`

1. **Add `_initializeDocsConfig()` method**
   - Read `.markdown` file from baseDir
   - Parse sections using regex: `^\[(\w+)\]$`
   - Parse each section's content:
     - `[publish-list]`: Split lines, extract path and optional title
     - `[ignore]`: Same as current `.jpulse-ignore` parsing
     - `[title-case-fix]`: Parse key-value pairs (whitespace-separated)
   - Start with `global.appConfig.controller?.markdown?.titleCaseFix` (framework defaults from app.conf)
     - Merge with `[title-case-fix]` from `.markdown` (site overrides)
   - Create `titleCaseFixRegex` from merged `titleCaseFix` object
   - Return/set config object: `{ publishList: [...], ignore: [...], titleCaseFix: {...}, titleCaseFixRegex: /.../ }`
     - Assigned to `docsConfig` static variable
     - `titleCaseFix` contains the full merged object (app.conf base + .markdown overrides)
   - Handle errors gracefully: if file doesn't exist or has errors, use defaults (empty arrays, app.conf titleCaseFix only)

2. **Remove `_loadIgnorePatterns()` method**
   - This method is replaced by `_initializeDocsConfig()`
   - All ignore pattern loading is now handled in `_initializeDocsConfig()`
   - Update all callers to use `docsConfig.ignore` instead

### Phase 2: Publish List Ordering

**File**: `webapp/controller/markdown.js`

1. **Add `_applyPublishListOrdering()` method**
   - Takes file list and publish-list config
   - Separates files into:
     - `explicitFiles`: Files in `docsConfig.publishList` (in listed order)
     - `remainingFiles`: Files not in `docsConfig.publishList`, and not excluded in `docsConfig.ignore` (alphabetical)
   - Returns combined array: `[...explicitFiles, ...remainingFiles]`

2. **Update `_scanMarkdownFiles()` method**
   - Load `.markdown` config at start (if exists)
   - Apply `docsConfig.publishList` ordering after collecting files
   - Apply custom titles from `docsConfig.publishList` when creating file objects
   - Handle subdirectories: check if path matches `docsConfig.publishList` entry

3. **Title assignment logic**
   - When creating file object:
     - Check if path is in `docsConfig.publishList` with explicit title → use it
     - Otherwise: use `_extractTitle()` (with merged title case fixes)

### Phase 3: Subdirectory Handling

**File**: `webapp/controller/markdown.js`

1. **Update subdirectory entry creation**
   - When creating directory entry (line ~386):
     - Check if `plugins/README.md` (or similar) is in `docsConfig.publishList`
     - If yes, use title from `docsConfig.publishList`
     - If no, use `_extractTitle(dirName)` (auto-generated)

2. **Handle subdirectory without README**
   - Current: `name` is empty string, not clickable
   - New: Auto-create virtual README with file list

### Phase 4: Cache Invalidation

**File**: `webapp/controller/markdown.js`

1. **Update cache key generation**
   - Include `.markdown` file modification time in cache key
   - Or: invalidate cache when `.markdown` changes

2. **Update `_getDirectoryListing()` method**
   - Check `.markdown` mtime when checking cache
   - Invalidate if changed

### Phase 5: Remove Legacy Config

**Files**: `webapp/controller/markdown.js`

1. **Keep `controller.markdown.titleCaseFix` in `app.conf`**
   - Keep as base, merged with `[title-case-fix]` from `.markdown`
   - This is the framework default that gets extended/overridden by site config

2. **Remove `.jpulse-ignore` support**
   - Remove `_loadIgnorePatterns()` method (replaced by `_initializeDocsConfig()`)
   - Remove all references to `.jpulse-ignore` file
   - Update `_shouldIgnore()` to use `docsConfig.ignore` patterns

### Phase 6: Testing

**Files**: `webapp/tests/unit/controller/markdown-*.test.js`

1. **Test parser**
   - Valid `.markdown` file
   - Invalid format (use defaults, ignore invalid sections)
   - Missing file (use defaults: empty arrays, app.conf titleCaseFix)
   - Unknown sections (ignore gracefully, use known sections)

2. **Test ordering**
   - Partial `[publish-list]` with remaining files
   - Full `[publish-list]` (whitelist mode with `*` in `[ignore]`)
   - Empty `[publish-list]` (alphabetical)

3. **Test title generation**
   - Explicit titles in `[publish-list]`
   - Auto-generated with framework defaults
   - Auto-generated with site overrides
   - Merged title case fixes

4. **Test subdirectories**
   - With README and explicit title
   - With README and auto-generated title
   - Without README (auto-generated docs list)

5. **Test ignore patterns**
   - Files in `[publish-list]` override `[ignore]`
   - Files not in `[publish-list]` respect `[ignore]`

## Migration Notes

### Backwards Compatibility
- **No backwards compatibility** (as per spec)
- Remove `.jpulse-ignore` support immediately
- No transition period - if something breaks, fix it

### Migration Steps
1. Create `.markdown` file in `docs/` directory
2. Copy ignore patterns from `.jpulse-ignore` to `[ignore]` section
3. Optionally add `[title-case-fix]` section (will merge with app.conf defaults)
4. Add `[publish-list]` section with desired order
5. Remove `.jpulse-ignore` file
6. Test and fix any issues

## Deliverables

- [x] Parser for `.markdown` file (regex-based, no 3rd party dependencies)
- [x] Title case fix merging (framework defaults + site overrides)
- [x] Partial ordering with `[publish-list]` (explicit files first, then alphabetical)
- [x] Custom title support (in `[publish-list]` section)
- [x] Ignore patterns from `.markdown` (`[ignore]` section)
- [x] Cache invalidation on config change (mtime-based)
- [x] Remove `.jpulse-ignore` support (replaced by unified `.markdown` config)
- [x] Unit tests (`markdown-ignore.test.js` updated, `markdown-publish-list.test.js` created)
- [x] Update documentation (comprehensive `.markdown` file with comments and examples)

## Implementation Summary

**Version**: 1.3.21 (2025-12-21)

**Files Modified**:
- `webapp/controller/markdown.js` - Core implementation
- `webapp/tests/unit/controller/markdown-ignore.test.js` - Updated tests
- `webapp/tests/unit/controller/markdown-publish-list.test.js` - New tests
- `docs/.markdown` - Configuration file created
- `docs/examples.md` → `docs/app-examples.md` - Renamed for clarity

**Key Features Implemented**:
1. `_initializeDocsConfig()` - Parses `.markdown` file, merges configs, caches per baseDir
2. `_applyPublishListOrdering()` - Implements partial ordering logic
3. Updated `_scanMarkdownFiles()` - Applies ordering, filtering, and custom titles
4. Updated `_extractTitle()` - Uses merged titleCaseFix
5. Updated `_getDirectoryListing()` - Cache invalidation with `.markdown` mtime
6. Updated `_getMarkdownFile()` - Virtual README generation

**Bugs Fixed**:
1. Section header regex fixed to allow hyphens: `/^\[([\w-]+)\]$/`
2. Fixed const/let variable assignment error in `_applyPublishListOrdering()`
3. Fixed sidebar ordering to follow `[publish-list]` instead of alphabetical
4. Fixed directories with only README.md to display as files (isDirectory: false)

**Testing**:
- Comprehensive unit tests added
- Extensive manual testing performed
- All features verified working correctly
