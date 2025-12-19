# W-118 Documentation Update Plan

## Overview
This document outlines all documentation pages that need to be updated for the W-118 Heading Anchor Links feature (v1.3.19).

## Documentation Pages to Update

### 1. User-Facing Documentation (docs/)

#### 1.1 `docs/jpulse-ui-reference.md` ⭐ **HIGH PRIORITY**
**Purpose**: Add heading anchors widget to the UI widget reference
**Location**: Add new section after "Source Code Display" or "Pagination Helper"
**Content**:
- Heading Anchors section with:
  - Overview of the feature
  - Automatic behavior (works on all pages)
  - Configuration options
  - Examples with code
  - Accessibility features
  - Unicode support note

**Quick Links Update**: Add to the quick links at the top:
```markdown
- [Heading Anchor Links](#heading-anchor-links) - GitHub-style anchor links for deep linking
```

#### 1.2 `docs/style-reference.md` ⭐ **HIGH PRIORITY**
**Purpose**: Document CSS classes and styling for heading anchors
**Location**: Add new section in appropriate place (maybe after "Typography" or in "UI Components")
**Content**:
- `.heading-anchor` class documentation
- CSS customization options
- Markdown-specific spacing adjustments
- Hover states and transitions
- Target highlighting animation

#### 1.3 `docs/site-customization.md` ⭐ **HIGH PRIORITY**
**Purpose**: Document how to configure/disable heading anchors
**Location**: Add to "Configuration" section or create new "View Configuration" subsection
**Content**:
- `view.headingAnchors` configuration options
- How to disable the feature
- How to customize heading levels
- How to change the icon
- Example site override configuration

**Example location**: After line ~200 (in configuration section)

#### 1.4 `docs/front-end-development.md` ⭐ **MEDIUM PRIORITY**
**Purpose**: Mention heading anchors in the UI components overview
**Location**: In the "UI Components" section or "Key Features" list
**Content**:
- Brief mention in overview
- Link to jpulse-ui-reference.md for details
- Note about automatic initialization

#### 1.5 `docs/CHANGELOG.md` ⭐ **HIGH PRIORITY**
**Purpose**: Add v1.3.19 release entry
**Location**: At the top, after v1.3.18
**Content**:
- Feature description
- Key capabilities (GitHub-style, Unicode support, configurable)
- Configuration options
- Examples
- Breaking changes (none)
- Related work item (W-118)

**Format**: Follow the same structure as v1.3.18 entry

#### 1.6 `docs/markdown-docs.md` ⭐ **LOW PRIORITY** (Optional)
**Purpose**: Mention that markdown docs automatically get anchor links
**Location**: In a "Features" or "Navigation" section
**Content**:
- Brief note that headings automatically get anchor links
- Link to jpulse-ui-reference.md for details

### 2. Developer Documentation (docs/dev/)

#### 2.1 `docs/dev/work-items.md` ⭐ **HIGH PRIORITY**
**Purpose**: Update W-118 status from IN_PROGRESS to DONE
**Location**: Find W-118 entry (around line 3170)
**Content**:
- Change status from `🚧 IN_PROGRESS` to `✅ DONE`
- Add completion date
- Add summary of deliverables
- Link to working doc

#### 2.2 `docs/dev/working/W-118-view-anchor-link-headings.md` ⭐ **HIGH PRIORITY**
**Purpose**: Update with final implementation details
**Location**: Update throughout
**Content**:
- Update status to DONE
- Add final implementation notes
- Document actual file locations
- Add testing summary (33 unit tests)
- Update timeline with completion date
- Mark all open questions as resolved
- Add notes about i18n location (view.ui.headingAnchor)
- Document final CSS refinements

### 3. Examples & Demos

#### 3.1 `webapp/view/jpulse-examples/ui-widgets.shtml` ⭐ **MEDIUM PRIORITY**
**Purpose**: Add interactive example of heading anchors
**Location**: Add new section or tab
**Content**:
- Live demo with multiple heading levels
- Show hover behavior
- Demonstrate click behavior (URL update, clipboard)
- Show configuration options
- Display generated IDs
- Unicode example (Japanese heading)

**Note**: This was mentioned in the W-118 working doc notes section

### 4. Screenshots & Visuals (Optional)

#### 4.1 Screenshot for Documentation
**Purpose**: Show hover state visually
**Location**: Add to jpulse-ui-reference.md or style-reference.md
**Content**:
- Screenshot showing:
  - Heading with anchor icon visible on hover
  - Tooltip "Copy link to clipboard"
  - Different heading levels (h1, h2, h3)
  - Markdown page example
  - Regular .shtml page example

## Implementation Priority

### Phase 1: Critical Documentation (Must Have)
1. ✅ `docs/dev/work-items.md` - Mark W-118 as DONE
2. ✅ `docs/dev/working/W-118-view-anchor-link-headings.md` - Finalize working doc
3. ✅ `docs/CHANGELOG.md` - Add v1.3.19 entry
4. ✅ `docs/jpulse-ui-reference.md` - Add widget documentation
5. ✅ `docs/site-customization.md` - Add configuration guide

### Phase 2: Supporting Documentation (Should Have)
6. `docs/style-reference.md` - CSS documentation
7. `docs/front-end-development.md` - Brief mention and link

### Phase 3: Nice to Have (Optional)
8. `webapp/view/jpulse-examples/ui-widgets.shtml` - Live example
9. `docs/markdown-docs.md` - Brief mention
10. Screenshots for visual documentation

## Documentation Structure Template

### For jpulse-ui-reference.md:

```markdown
## Heading Anchor Links

GitHub-style anchor links automatically added to all headings (h1-h6) across all jPulse pages, enabling deep linking and easy content sharing.

### Features
- **Automatic**: Works on all pages (Markdown docs, Handlebars templates, dynamic content)
- **GitHub-Compatible**: Follows GitHub's heading anchor algorithm
- **Unicode Support**: Preserves non-English characters (Japanese, Chinese, etc.)
- **Configurable**: Enable/disable, customize heading levels, change icon
- **Accessible**: ARIA labels, keyboard navigable, screen reader friendly

### Basic Usage

The feature is **automatic** - no code required! Just use headings in your content:

```html
<h2>My Section Title</h2>
```

Users will see a 🔗 icon on hover that:
- Updates the URL with the anchor link
- Copies the full URL to clipboard
- Shows a success toast notification

### Configuration

Configure in `webapp/app.conf` or `site/webapp/app.conf`:

```javascript
view: {
    headingAnchors: {
        enabled: true,                  // Enable/disable feature
        levels: [1, 2, 3, 4, 5, 6],     // Which heading levels (all by default)
        icon: '🔗'                      // Link icon (default: 🔗)
    }
}
```

### Examples

**English Heading:**
- Heading: `## Framework Architecture`
- Anchor: `#framework-architecture`

**Unicode Heading:**
- Heading: `## 日本語のドキュメント`
- Anchor: `#日本語のドキュメント`

**Duplicate Headings:**
- First: `#overview`
- Second: `#overview-1`
- Third: `#overview-2`

### API Reference

#### `jPulse.UI.headingAnchors.init(options)`

Manually initialize heading anchors (usually automatic).

**Parameters:**
- `options` (object): Configuration options
  - `enabled` (boolean): Enable/disable feature (default: `true`)
  - `levels` (number[]): Heading levels to process (default: `[1,2,3,4,5,6]`)
  - `icon` (string): Icon to display (default: `'🔗'`)

**Example:**
```javascript
// Disable for specific page
jPulse.UI.headingAnchors.init({ enabled: false });

// Only process h1 and h2
jPulse.UI.headingAnchors.init({ levels: [1, 2] });
```

### Accessibility

- **ARIA Labels**: Descriptive labels for screen readers
- **Keyboard Navigation**: Anchor links are focusable
- **Visual Feedback**: Hover states and target highlighting
- **Screen Reader Friendly**: Semantic HTML structure

### Browser Support

- Modern browsers with Clipboard API support
- Graceful degradation for older browsers
- Unicode URL support (all modern browsers)

### Related Documentation
- [Style Reference](style-reference.md#heading-anchor-links) - CSS customization
- [Site Customization](site-customization.md#view-configuration) - Configuration guide
```

### For site-customization.md:

```markdown
### View Configuration

#### Heading Anchor Links

Configure heading anchor links (GitHub-style deep linking) in `view.headingAnchors`:

```javascript
// webapp/app.conf or site/webapp/app.conf
view: {
    headingAnchors: {
        enabled: true,                  // Enable/disable feature
        levels: [1, 2, 3, 4, 5, 6],     // Which heading levels
        icon: '🔗'                      // Link icon
    }
}
```

**Disable Feature:**
```javascript
view: {
    headingAnchors: {
        enabled: false
    }
}
```

**Only Process h1-h3:**
```javascript
view: {
    headingAnchors: {
        levels: [1, 2, 3]
    }
}
```

**Custom Icon:**
```javascript
view: {
    headingAnchors: {
        icon: '#'  // Use # instead of 🔗
    }
}
```

See [jPulse.UI Widget Reference](jpulse-ui-reference.md#heading-anchor-links) for complete documentation.
```

## Notes

- All documentation should use consistent terminology: "Heading Anchor Links" or "heading anchors"
- Include examples with both English and Unicode (Japanese) headings
- Emphasize that the feature is automatic and works universally
- Link between related documentation pages
- Update version numbers to v1.3.19 where appropriate
- Follow existing documentation style and formatting

