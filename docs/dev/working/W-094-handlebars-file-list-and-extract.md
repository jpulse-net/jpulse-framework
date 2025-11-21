# W-094: Handlebars: List Files and Extract from Files

**Work Item:** W-094
**Status:** 🕑 PENDING
**Type:** Feature
**Version:** TBD

## Objective

Generalize file operations in Handlebars templates to enable automated content generation, such as auto-populating card lists in index pages. This provides a flexible, opt-in mechanism for any set of pages and use cases.

## Use Case

**Primary Use Case:** Auto-populate admin dashboard cards in `/admin/index.shtml` without manual maintenance.

**Generalized Use Cases:**
- Auto-generate navigation menus from page metadata
- Create gallery pages from image directories
- Build documentation indexes from markdown files
- Generate sitemaps from view files
- Any scenario requiring iteration over files and content extraction

## Requirements

### 1. File Listing Helper: `file.list`

**Syntax:**
```handlebars
{{#each (file.list "pattern")}}
    <!-- Process each file -->
{{/each}}
```

**Features:**
- Supports glob patterns: `"admin/*.shtml"`, `"**/*.shtml"`
- Respects site overrides (checks `site/webapp/view/` first, then `webapp/view/`)
- Returns array of relative file paths (e.g., `["admin/config.shtml", "admin/users.shtml"]`)
- Cached for performance (similar to `file.include` cache)
- Security: Path traversal protection, relative paths only

**Optional Parameters:**
- `exclude` - Pattern to exclude files (e.g., `exclude="index.shtml"`)
- `orderBy` - Sort by extract order, filename, or custom criteria

### 2. File Extraction Helper: `file.extract`

**Syntax:**
```handlebars
{{file.extract "path/to/file.shtml" extract="pattern"}}
```

**Extraction Methods:**

**A. Regex Pattern (Primary):**
```handlebars
{{file.extract "admin/foo.shtml" extract="<!-- extract:start -->(.*?)<!-- extract:end -->"}}
{{file.extract "admin/foo.shtml" extract="regex:(<!-- card -->.*?<!-- /card -->)"}}
```

**B. CSS Selector (Optional - Phase 2):**
```handlebars
{{file.extract "admin/foo.shtml" extract=".admin-card-meta"}}
{{file.extract "admin/foo.shtml" extract="#card-content"}}
```

**Features:**
- Regex extraction with capture groups: `(.*?)` extracts content
- Multiline support via regex flags (`/pattern/gs`)
- Returns extracted content as string
- Handles missing files gracefully (returns empty string or error comment)
- Uses existing `FileCache` for performance

### 3. Enhanced `file.include` with Extract

This is an alternative to **2. File Extraction Helper: `file.extract`** -- to be decided.

**Syntax:**
```handlebars
{{file.include "path/to/file.shtml" extract="pattern"}}
```

**Behavior:**
- If `extract` parameter is provided, extracts that section instead of full file
- Otherwise behaves as current `file.include` (includes full file)
- Maintains backward compatibility

### 4. Opt-in and Ordering Mechanism

**Option A: HTML Comment Markers (Recommended)**

**Format:**
```html
<!-- extract:start order=10 -->
<div class="admin-card-meta">
    <h3>Page Title</h3>
    <p>Page description</p>
</div>
<!-- extract:end -->
```

**Features:**
- Opt-in: Only files with markers are included
- Ordering: `order=N` attribute for sorting
- Flexible: Can extract any HTML section
- Visible in source: Easy to understand and maintain

**Option B: Metadata in Comments (Alternative)**

**Format:**
```html
<!--
 * @extract: true
 * @extractOrder: 10
 * @extractMarker: admin-card-meta
-->
<div class="admin-card-meta">
    ...
</div>
```

**Option C: Special Class/ID Pattern (Alternative)**

**Format:**
```html
<div class="extract-admin-card-meta" data-extract-order="10">
    ...
</div>
```

## Implementation Plan

### Phase 1: Core Functionality (MVP)

1. **`file.list(pattern)` Helper**
   - Implement glob pattern matching
   - Support site override path resolution
   - Return array of file paths
   - Add caching mechanism

2. **`file.extract(path, extract="regex:...")` Helper**
   - Regex-only extraction (no HTML parser dependency)
   - Support capture groups: `(.*?)`
   - Multiline regex support
   - Error handling for missing files/invalid patterns

3. **Opt-in via HTML Comment Markers**
   - Parse `<!-- extract:start order=N -->...<!-- extract:end -->`
   - Extract order number for sorting
   - Return empty string if no marker found

4. **Integration with Existing System**
   - Add helpers to `HandlebarController._evaluateHandlebar()`
   - Use existing `FileCache` for performance
   - Follow security patterns from `file.include`

### Phase 2: Enhanced Features (Optional)

1. **CSS Selector Support**
   - Add HTML parser dependency (e.g., `cheerio` or `jsdom`)
   - Support `.class` and `#id` selectors
   - Make it optional feature (lazy load parser)

2. **`file.listSorted` Helper**
   - Automatic ordering by extract markers
   - Support custom sort functions
   - Filter by extract presence

3. **Metadata-based Opt-in**
   - Parse `@extract` metadata from HTML comments
   - Alternative to marker-based approach

## Usage Examples

### Example 1: Admin Dashboard Auto-Population

**In each admin page (`admin/foo.shtml`):**
```html
<!-- extract:start order=10 -->
<a href="/admin/foo.shtml" class="jp-card-dashboard jp-icon-btn">
    <div class="jp-icon-container">
        <img src="/assets/admin/icons/foo.svg" class="jp-icon" alt="">
    </div>
    <h3 class="jp-card-title">Foo Management</h3>
    <p class="jp-card-description">Manage foo settings</p>
</a>
<!-- extract:end -->
```

**In `admin/index.shtml`:**
```handlebars
<div class="jp-dashboard-grid">
    {{#each (file.list "admin/*.shtml")}}
        {{#if (file.extract this extract="<!-- extract:start -->")}}
            {{file.extract this extract="regex:<!-- extract:start order=\\d+ -->(.*?)<!-- extract:end -->"}}
        {{/if}}
    {{/each}}
</div>
```

### Example 2: Documentation Index

**In each doc page:**
```html
<!-- extract:start order=5 -->
<li><a href="/docs/{{filename}}">{{title}}</a> - {{description}}</li>
<!-- extract:end -->
```

**In index page:**
```handlebars
<ul>
    {{#each (file.list "docs/*.md")}}
        {{file.extract this extract="regex:<!-- extract:start -->(.*?)<!-- extract:end -->"}}
    {{/each}}
</ul>
```

### Example 3: Gallery Generation

**In each image directory:**
```html
<!-- extract:start -->
<div class="gallery-item">
    <img src="{{imagePath}}" alt="{{caption}}">
    <p>{{caption}}</p>
</div>
<!-- extract:end -->
```

## Technical Considerations

### Security
- Path traversal protection (prohibit `../` and absolute paths)
- Restrict to `view/` directory only
- Validate glob patterns
- Sanitize extracted content (if needed)

### Performance
- Cache file listings (similar to `includeCache`)
- Cache extracted content
- Lazy evaluation where possible
- Configurable cache TTL

### Error Handling
- Missing files: Return empty string or error comment
- Invalid patterns: Log error, return empty string
- Malformed markers: Skip file, log warning
- Regex errors: Return error comment

### Compatibility
- Backward compatible with existing `file.include`, `file.timestamp`, `file.exists`
- No breaking changes to existing templates
- Opt-in only (doesn't affect existing pages)

## Design Principles

1. **Generalization First**: Not admin-specific, works for any use case
2. **Opt-in**: Only files with markers/metadata are processed
3. **Flexibility**: Support multiple extraction methods (regex, CSS selector)
4. **Server-side**: All processing happens server-side, no client JS needed
5. **Performance**: Leverage existing caching infrastructure
6. **Security**: Follow existing security patterns from `file.include`

## Dependencies

- **Phase 1**: None (uses existing `fs`, `path`, `FileCache`)
- **Phase 2**: Optional HTML parser (e.g., `cheerio` or `jsdom`)

## Testing Strategy

1. Unit tests for glob pattern matching
2. Unit tests for regex extraction
3. Integration tests with actual template files
4. Performance tests for caching
5. Security tests for path traversal protection
6. Edge case tests (missing files, malformed markers, etc.)

## Future Enhancements

- Support for extracting multiple sections from same file
- Nested extraction (extract from extracted content)
- Conditional extraction based on context variables
- Support for extracting metadata (title, description) separately
- Integration with i18n for extracted content

## Related Work Items

- **W-014**: Site override system (uses `PathResolver`)
- **W-088**: Handlebars template processing (foundation)

## Notes

- This is a "nice to have" feature, not critical path
- Implementation complexity: Medium (~300-500 lines)
- Can be implemented incrementally (Phase 1 first, Phase 2 later)
- Generalization makes it useful beyond original admin dashboard use case

