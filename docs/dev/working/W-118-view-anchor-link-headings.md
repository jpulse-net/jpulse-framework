# W-118: View: Headings With Anchor Links

## Status
✅ DONE

## Overview

Add GitHub-style anchor links to all headings (h1-h6) across all jPulse pages. This enables users to:
- Share deep links to specific sections
- Copy direct links to headings via clipboard
- Navigate to specific content via URL fragments (#anchors)

## Design Decisions

### 1. Universal Implementation (Not Markdown-Only)
- **Works on ALL pages**: `.shtml` templates, markdown docs, dynamically rendered content
- **Single JavaScript solution**: One unified approach handles ID generation and link behavior
- **No npm dependencies**: Custom implementation avoids dependencies like `marked-gfm-heading-id`

**Rationale**: The requirement states "should work on any jpulse rendered page, not just markdown docs"

### 2. GitHub-Compatible Slugification Standard
Follow GitHub's heading anchor algorithm:
1. Convert to lowercase
2. Replace spaces with hyphens (`-`)
3. Remove punctuation (but keep Unicode)
4. Handle duplicates with `-1`, `-2`, etc.

**Examples**:
- `"Framework Architecture"` → `"framework-architecture"`
- `"What's New?"` → `"whats-new"`
- `"日本語"` → `"日本語"` (Unicode preserved)

**Rationale**: GitHub's approach is the de facto standard that users expect and understand.

### 3. Unicode Support
- Keep non-English Unicode characters intact
- Don't encode to hex (e.g., `%E6%97%A5%E6%9C%AC%E8%AA%9E`)
- Modern browsers handle Unicode in URLs correctly

**Example**: `"日本語文章はOKです"` → `#日本語文章はokです`

### 4. No Length Limit
- Don't truncate anchor slugs (GitHub doesn't)
- Long descriptive headings → long anchors (this is acceptable)
- Truncation could cause duplicate slug collisions

### 5. Configurable via app.conf
```javascript
view: {
    headingAnchors: {
        enabled: true,                  // Enable/disable feature
        levels: [1, 2, 3, 4, 5, 6],     // Which heading levels (all by default)
        icon: '🔗'                      // Link icon (🔗 matches GitHub's current icon)
    }
}
```

**Rationale**: Site developers might want to disable to avoid ID conflicts with existing IDs on elements other than headings.

### 6. Internationalized Feedback
- Copy-to-clipboard success message must be i18n compatible
- Use `i18n.view.headingAnchor.linkCopied` translation key
- Display via jPulse toast notification system

## Implementation Plan

### Phase 1: Client-Side JavaScript (jpulse-common.js)

#### 1.1 Slugify Function
```javascript
jPulse.UI.headingAnchors = {
    /**
     * GitHub-style slug generation with Unicode support
     */
    slugify: (text) => {
        return text
            .toLowerCase()
            .trim()
            // Keep Unicode letters, ASCII alphanumeric, spaces, hyphens
            .replace(/[^\w\s\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF-]/g, '')
            .replace(/\s+/g, '-')       // Spaces to hyphens
            .replace(/-+/g, '-')        // Collapse multiple hyphens
            .replace(/^-+|-+$/g, '');   // Trim leading/trailing hyphens
    }
};
```

#### 1.2 ID Generation
- Scan all configured heading levels (`h1-h6` by default)
- Generate GitHub-style IDs for headings without existing IDs
- **Guard against ALL ID conflicts** (not just heading duplicates):
  1. First, build a Set of all existing IDs in the DOM
  2. When generating heading slug, check against this Set
  3. If conflict exists (heading or non-heading element), append `-1`, `-2`, etc.
  4. Add generated ID to the Set (for subsequent duplicate checks)
- Skip headings that already have IDs (avoid overwriting existing IDs)

**Implementation example**:
```javascript
ensureHeadingIds: () => {
    const config = jPulse.config?.view?.headingAnchors || {
        enabled: true,
        levels: [1, 2, 3, 4, 5, 6]
    };

    if (!config.enabled) return;

    // Build Set of ALL existing IDs in the DOM (headings and non-headings)
    const existingIds = new Set(
        Array.from(document.querySelectorAll('[id]'))
            .map(el => el.id)
    );

    const selector = config.levels.map(n => `h${n}`).join(', ');

    document.querySelectorAll(selector).forEach(heading => {
        // Skip if already has ID
        if (heading.id) return;

        let slug = jPulse.UI.headingAnchors.slugify(heading.textContent);
        if (!slug) return; // Skip empty slugs

        // Handle conflicts with ANY existing ID
        let finalSlug = slug;
        let counter = 0;
        while (existingIds.has(finalSlug)) {
            counter++;
            finalSlug = `${slug}-${counter}`;
        }

        heading.id = finalSlug;
        existingIds.add(finalSlug); // Track for next heading
    });
}
```

#### 1.3 Anchor Link UI
- Insert clickable `🔗` icon before heading text
- Hidden by default (opacity: 0)
- Revealed on heading hover
- Click behavior:
  1. Update URL hash (`window.location.hash = id`)
  2. Copy full URL to clipboard
  3. Show i18n toast: "Link copied to clipboard"

#### 1.4 Accessibility
- `aria-label="Link to {heading text}"`
- `title="Copy link to clipboard"`
- Keyboard navigable (anchor is focusable link)
- Screen reader friendly

### Phase 2: CSS Styling (jpulse-common.css)

```css
/* Heading Anchor Links - W-118 */
.heading-anchor {
    float: left;
    margin-left: -1.5em;
    padding-right: 0.5em;
    text-decoration: none;
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
    font-size: 0.9em;
    line-height: inherit;
    color: var(--jp-link-color, #0066cc);
}

/* Show on hover */
h1:hover .heading-anchor,
h2:hover .heading-anchor,
h3:hover .heading-anchor,
h4:hover .heading-anchor,
h5:hover .heading-anchor,
h6:hover .heading-anchor,
.heading-anchor:hover,
.heading-anchor:focus {
    opacity: 1;
}

/* Highlight targeted heading */
h1:target,
h2:target,
h3:target,
h4:target,
h5:target,
h6:target {
    scroll-margin-top: 80px; /* Account for fixed header */
    animation: highlight-heading 2s ease-in-out;
}

@keyframes highlight-heading {
    0%, 100% { background-color: transparent; }
    50% { background-color: rgba(255, 255, 0, 0.2); }
}

/* Mobile: slightly more visible */
@media (max-width: 768px) {
    .heading-anchor {
        opacity: 0.3;
    }
}
```

### Phase 3: Internationalization (en.conf, de.conf)

Add translation keys:

**en.conf**:
```javascript
view: {
    headingAnchor: {
        linkCopied: 'Link copied to clipboard',
        linkFailed: 'Failed to copy link',
        linkToSection: 'Link to {{section}}'
    }
}
```

**de.conf**:
```javascript
view: {
    headingAnchor: {
        linkCopied: 'Link in Zwischenablage kopiert',
        linkFailed: 'Link konnte nicht kopiert werden',
        linkToSection: 'Link zu {{section}}'
    }
}
```

### Phase 4: Configuration (app.conf)

**Framework default** (`webapp/app.conf`):
```javascript
view: {
    headingAnchors: {
        enabled: true,
        levels: [1, 2, 3, 4, 5, 6],     // all heading levels
        icon: '🔗'                      // link icon on hover over heading
    }
}
```

**Site override** (`site/webapp/app.conf`):
```javascript
view: {
    headingAnchors: {
        enabled: false  // Disable if site has ID conflicts
        // OR
        levels: [2, 3]  // Only h2 and h3
    }
}
```

### Phase 5: Auto-initialization (jpulse-footer.tmpl)

```html
<script>
// W-118: Initialize heading anchors on page load
document.addEventListener('DOMContentLoaded', () => {
    if (jPulse.UI?.headingAnchors) {
        jPulse.UI.headingAnchors.init();
    }
});

// Re-initialize after SPA navigation (markdown docs)
window.addEventListener('popstate', () => {
    if (jPulse.UI?.headingAnchors) {
        setTimeout(() => jPulse.UI.headingAnchors.init(), 100);
    }
});
</script>
```

## Testing Strategy

### Unit Tests
- Slugify function with various inputs:
  - English text
  - Unicode text (Japanese, Chinese, German umlauts)
  - Punctuation and special characters
  - Very long headings
  - Duplicate headings

### Integration Tests
1. Markdown docs pages
2. `.shtml` Handlebars pages
3. Dynamic content (SPA navigation)
4. Mobile viewport
5. Keyboard navigation
6. Screen reader compatibility

### Browser Testing
- Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Android Chrome)
- Clipboard API support (fallback for older browsers)

## Example Usage

### Example 1: Markdown Doc
**File**: `docs/handlebars.md`
```markdown
### Logical and Comparison Helpers (v1.3.15+)

The jPulse Framework provides...
```

**Rendered DOM**:
```html
<h3 id="logical-and-comparison-helpers-v1315">
    <a class="heading-anchor" href="#logical-and-comparison-helpers-v1315"
       aria-label="Link to Logical and Comparison Helpers (v1.3.15+)"
       title="Copy link to clipboard">🔗</a>
    Logical and Comparison Helpers (v1.3.15+)
</h3>
```

**URL after click**: `http://localhost:8080/jpulse-docs/handlebars#logical-and-comparison-helpers-v1315`

### Example 2: Handlebars Template
**File**: `webapp/view/admin/config.shtml`
```html
<h2>Configuration Settings</h2>
```

**Rendered DOM**:
```html
<h2 id="configuration-settings">
    <a class="heading-anchor" href="#configuration-settings"
       aria-label="Link to Configuration Settings"
       title="Copy link to clipboard">🔗</a>
    Configuration Settings
</h2>
```

**URL after click**: `http://localhost:8080/admin/config#configuration-settings`

### Example 3: Duplicate Headings
**Input**:
```html
<h3>Overview</h3>
...
<h3>Overview</h3>
...
<h3>Overview</h3>
```

**Rendered IDs**:
- First: `id="overview"`
- Second: `id="overview-1"`
- Third: `id="overview-2"`

### Example 4: Unicode Heading
**Input**:
```markdown
## 日本語のドキュメント
```

**Rendered**:
```html
<h2 id="日本語のドキュメント">
    <a class="heading-anchor" href="#日本語のドキュメント">🔗</a>
    日本語のドキュメント
</h2>
```

## Edge Cases & Considerations

### 1. Existing IDs on Headings
- **Behavior**: Skip ID generation, only add anchor link
- **Rationale**: Respect existing IDs (might be set for specific reasons)

### 2. ID Conflicts with Non-Heading Elements
- **Scenario**: `<div id="settings">` exists, heading "Settings" would generate `id="settings"`
- **Behavior**: Append `-1` suffix → `<h2 id="settings-1">Settings</h2>`
- **Implementation**: Check ALL existing IDs in DOM before assigning heading IDs
- **Example**:
  ```html
  <!-- Existing element -->
  <div id="overview">Page overview</div>

  <!-- Heading generates conflict-free ID -->
  <h2 id="overview-1">Overview</h2>
  ```
- **Rationale**:
  - Maintains feature integrity (all headings linkable)
  - Ensures HTML validity (no duplicate IDs)
  - Consistent with duplicate heading behavior

### 3. Empty or Special-Character-Only Headings
- **Behavior**: Skip (don't generate empty IDs)
- **Example**: `<h2>***</h2>` → slug is empty → skip

### 4. Very Long Headings
- **Behavior**: No truncation (allow full slug)
- **Rationale**: GitHub doesn't truncate, truncation risks duplicate collisions

### 5. Disabling Feature Due to Systematic ID Conflicts
- **Behavior**: Site can disable via config
- **Example**: Site has systematic ID naming that conflicts with many headings
- **Solution**: Set `view.headingAnchors.enabled: false` in site config
- **Note**: Individual ID conflicts are handled automatically via `-1` suffix

### 6. Clipboard API Not Available
- **Behavior**: Graceful degradation
- **Fallback**: Update URL hash but show message "Link updated" instead of "copied"

### 7. Fixed Headers
- **Behavior**: Use `scroll-margin-top` in CSS
- **Default**: 80px offset
- **Rationale**: Prevent heading from hiding behind fixed header

## Performance Considerations

### 1. DOM Scanning
- Runs once per page load
- Modern browsers handle `querySelectorAll('h1,h2,h3,h4,h5,h6')` efficiently
- Typical page: ~50-100 headings → negligible performance impact

### 2. Event Listeners
- Single click event per anchor (not document-level delegation)
- Clean up on SPA navigation (re-run init)

### 3. CSS Animations
- Minimal: opacity transition, highlight animation
- Hardware-accelerated (transform-capable properties)

## Security Considerations

### 1. XSS Prevention
- IDs are generated from existing heading text (not user input)
- Slugify function strips dangerous characters
- No innerHTML injection (use textContent)

### 2. Clipboard API
- User-initiated (click event required)
- No silent clipboard access
- Fallback for denied permissions

## Accessibility Checklist

- ✅ Keyboard navigable (anchor is focusable)
- ✅ Screen reader friendly (aria-label descriptive)
- ✅ Visual hover indication
- ✅ Focus visible (keyboard navigation)
- ✅ Semantic HTML (anchor tag, proper heading structure)
- ✅ No motion for users with reduced motion preference

## Deliverables

### Code Files
1. `webapp/view/jpulse-common.js` - JavaScript implementation
2. `webapp/view/jpulse-common.css` - CSS styles
3. `webapp/view/jpulse-footer.tmpl` - Auto-initialization script
4. `webapp/app.conf` - Default configuration
5. `webapp/translations/en.conf` - English i18n strings
6. `webapp/translations/de.conf` - German i18n strings

### Documentation
1. User documentation (how to use anchor links)
2. Site developer documentation (how to configure/disable)
3. This work item document

### Tests
1. Unit tests for slugify function
2. Integration tests for various page types
3. Accessibility tests
4. Cross-browser tests

## References

### GitHub Standards
- [GitHub Markdown Formatting](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)
- GitHub now uses 🔗 icon on hover (updated from # symbol)
- Slugification: lowercase, spaces→hyphens, remove punctuation, duplicates→suffix

### Related jPulse Features
- W-049: Markdown docs rendering (prerequisite)
- Toast notification system (for clipboard feedback)
- i18n system (for translated messages)
- App config system (for configuration)

### Web Standards
- HTML5 `id` attribute (not deprecated `<a name="">`)
- Clipboard API (`navigator.clipboard.writeText()`)
- CSS `:target` pseudo-class
- ARIA accessibility attributes

## Open Questions

### Resolved
1. ~~Use marked-gfm-heading-id or build our own?~~
   - **Decision**: Build our own (works universally, not just markdown)

2. ~~Config in app.conf or MongoDB?~~
   - **Decision**: app.conf (site-overrideable configuration)

3. ~~All 6 heading levels or just h1-h3?~~
   - **Decision**: All 6 by default (configurable), matches GitHub

4. ~~Clipboard copy feedback?~~
   - **Decision**: Yes, via i18n toast notification

5. ~~Unicode support?~~
   - **Decision**: Yes, keep Unicode intact (don't encode)

6. ~~Max anchor length?~~
   - **Decision**: No limit (GitHub has none)

### Pending
None

## Timeline

- **Start**: 2025-12-19
- **Completion**: 2025-12-19
- **Release**: v1.3.19

## Implementation Summary

### Completed Deliverables

**Code Files:**
1. ✅ `webapp/view/jpulse-common.js` - JavaScript implementation (lines 4465-4625)
2. ✅ `webapp/view/jpulse-common.css` - CSS styles (lines 3750-3867)
3. ✅ `webapp/view/jpulse-footer.tmpl` - Auto-initialization script (lines 185-220)
4. ✅ `webapp/app.conf` - Default configuration (lines 380-384)
5. ✅ `webapp/translations/en.conf` - English i18n strings (lines 291-295)
6. ✅ `webapp/translations/de.conf` - German i18n strings (lines 291-295)

**Tests:**
1. ✅ `webapp/tests/unit/utils/jpulse-ui-heading-anchors.test.js` - 33 comprehensive unit tests
   - 11 tests for `_slugify` function (Unicode, punctuation, edge cases)
   - 6 tests for ID generation (duplicates, conflicts, configuration)
   - 6 tests for anchor link creation (attributes, icons, duplicates)
   - 4 tests for click behavior (URL update, clipboard, toast messages)
   - 3 tests for configuration (enabled/disabled, defaults, partial config)
   - 3 tests for edge cases (long headings, whitespace, Unicode)

**Documentation:**
1. ✅ `docs/jpulse-ui-reference.md` - Complete widget documentation
2. ✅ `docs/site-customization.md` - Configuration guide
3. ✅ `docs/style-reference.md` - CSS documentation
4. ✅ `docs/front-end-development.md` - Brief mention and link
5. ✅ `docs/markdown-docs.md` - Feature mention
6. ✅ `docs/dev/working/W-118-view-anchor-link-headings.md` - This working document

**Key Implementation Details:**
- i18n location: `view.ui.headingAnchor` (not `view.headingAnchor`)
- Token expansion: Uses `%SECTION%` pattern (not `{{section}}`)
- CSS refinements: Markdown-specific spacing, h1 icon alignment, icon-only hover highlight
- All 33 unit tests passing
- Works on all page types (Markdown, Handlebars, dynamic content)

## Notes

- ✅ Example added to `/jpulse-examples/ui-widgets` page
- ✅ Documented in site customization guide
- ⏳ Add to CHANGELOG.md with examples (pending - user requested to wait)
- ✅ Screenshot added to documentation (`docs/images/anchor-link-on-hover-700.png`)
