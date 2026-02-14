# jPulse Docs / Markdown Documentation System v1.6.17

**For Site Developers**

This guide explains how to create markdown-based documentation for your jPulse site, such as `/help/`, `/faq/`, `/knowledge-base/`, or any custom documentation namespace.

## Overview

jPulse provides a complete markdown documentation infrastructure that:

- **Auto-generates navigation** from your directory structure
- **Custom ordering and titles** via `.markdown` configuration file
- **Supports dynamic content** with `%DYNAMIC{}%` tokens
- **Renders beautifully** with syntax highlighting and responsive design
- **Follows site override patterns** (site > plugins > framework)
- **Supports file exclusion** via `.markdown` `[ignore]` section
- **Automatic anchor links** - All headings (h1-h6) automatically get GitHub-style anchor links for deep linking and easy content sharing

## Quick Start

### 1. Create Your Documentation Directory

You have two options for where to place your documentation:

#### Option A: Top-Level Directory with Symlink (Recommended)

Keep docs visible and easy to access at the project root, with a symlink for the framework:

```bash
# Create docs at project root (easy to find and edit)
mkdir -p docs/my-help

# Create symlink so framework can serve them
mkdir -p site/webapp/static/assets
ln -s ../../../../docs/my-help site/webapp/static/assets/my-help
```

Your project structure:

```
my-jpulse-site/
├── docs/
│   └── my-help/                # Easy to find! Edit docs here
│       ├── README.md
│       ├── getting-started.md
│       └── guides/
│           └── README.md
├── site/
│   └── webapp/
│       └── static/
│           └── assets/
│               └── my-help -> ../../../../docs/my-help  # Symlink
└── webapp/
```

**Benefits**: Documentation is visible at project root, version control friendly, easy to edit.

#### Option B: Direct Path (Hidden)

Place docs directly in the assets directory:

```
site/webapp/static/assets/
└── my-help/                    # Your namespace (becomes /my-help/ route)
    ├── README.md               # Index page (required)
    ├── getting-started.md      # Top-level pages
    ├── faq.md
    └── guides/                 # Subdirectories become sections (optional)
        ├── README.md           # Section index (required)
        ├── installation.md
        └── configuration.md
```

**Note**: This path is less visible but works without symlinks.

### 2. Create a View Page

Create `site/webapp/view/my-help/index.shtml`:

```html
<!DOCTYPE html>
<html {{appConfig.system.htmlAttrs}}>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Help Center - {{app.jPulse.shortName}}</title>
    {{file.include "jpulse-header.tmpl"}}
</head>
<body>
    <div class="jp-main">
        <div class="jp-docs-container">
            <nav class="jp-docs-nav local-docs-nav">
                <h3>Help Center</h3>
                <div class="jp-docs-nav-wrapper">
                    <ul id="docs-navigation"></ul>
                </div>
            </nav>
            <main class="jp-docs-content">
                <div id="markdown-content" class="jp-markdown-content">
                    <div class="jp-loading">Loading...</div>
                </div>
            </main>
        </div>
    </div>

    <script src="/common/marked/marked.min.js"></script>
    <script>
        jPulse.dom.ready(async () => {
            await jPulse.UI.docs.init({
                navElement: '#docs-navigation',
                contentElement: '#markdown-content'
            });
        });
    </script>

    {{file.include "jpulse-footer.tmpl"}}
</body>
</html>
```

The namespace is auto-detected from the URL path (e.g., `/my-help/` → namespace `my-help`).

**Note**: The framework's `webapp/view/jpulse-docs/index.shtml` includes additional tabs (Docs/Examples/Plugins). Site documentation pages typically don't need tabs - use the minimal example above.

### 3. Access Your Documentation

Your docs are now available at:
- **SPA Route**: `/my-help/` (client-side navigation)
- **API**: `/api/1/markdown/my-help/` (directory listing)
- **API**: `/api/1/markdown/my-help/faq` (specific file)

## Directory Structure

### README.md Files

`README.md` files serve as index pages for directories:

```
my-help/
├── README.md           # Shows when visiting /my-help/
├── topic-a.md
└── advanced/
    ├── README.md       # Shows when visiting /my-help/advanced/
    └── deep-dive.md
```

**Best Practice**: Every directory should have a `README.md` for proper navigation.

**Special Cases**:
- **Directories with only README.md**: Displayed as regular document links (not expandable directories) for better visual clarity
- **Directories without README.md**: Auto-generate a virtual README with a file listing when accessed directly

### Navigation Generation

The sidebar navigation is auto-generated from your directory structure:

- **Files** become navigation items
- **Ordering**: Files listed in `.markdown` `[publish-list]` appear first (in specified order), followed by remaining files alphabetically
- **Directories** become expandable sections (unless they contain only `README.md`, then shown as regular files)
- **README.md** becomes the section's clickable header
- **Titles** can be custom (via `[publish-list]`) or auto-generated from filenames (`getting-started.md` → "Getting Started")

### Title Generation

Titles can be specified explicitly in `.markdown` `[publish-list]` or auto-generated from filenames:

| Filename | Generated Title | Custom Title Example |
|----------|-----------------|---------------------|
| `README.md` | (Uses directory name) | `README.md Welcome` → "Welcome" |
| `getting-started.md` | Getting Started | `getting-started.md Getting Started Guide` → "Getting Started Guide" |
| `api-reference.md` | API Reference | (auto-generated) |
| `mpa-vs-spa.md` | MPA vs. SPA | (auto-generated) |

**Priority**: Custom title in `[publish-list]` > Auto-generated with title case fixes > Auto-generated (no fixes)

**Tip**: Use descriptive filenames for automatic good titles, or specify custom titles in `.markdown` for important pages.

### Title Case Fixes

The framework automatically fixes common acronyms and terms in auto-generated titles. Title case fixes are merged from multiple sources:

1. **Framework defaults** (in `app.conf`):
```javascript
controller: {
    markdown: {
        titleCaseFix: {
            Api:        'API',
            Css:        'CSS',
            Faq:        'FAQ',
            Html:       'HTML',
            Javascript: 'JavaScript',
            Jpulse:     'jPulse',
            Mvc:        'MVC',
            Mpa:        'MPA',
            Spa:        'SPA',
            Sql:        'SQL',
            Ui:         'UI',
            Vs:         'vs.'
        }
    }
}
```

**To override or extend in your site**, add to `site/webapp/app.conf`:

2. **Site overrides** (in `site/webapp/app.conf`):
```javascript
controller: {
    markdown: {
        titleCaseFix: {
            // Add your own fixes
            Crm:        'CRM',
            Erp:        'ERP',
            // Override framework defaults
            Faq:        'Frequently Asked Questions'
        }
    }
}
```

3. **Per-namespace overrides** (in `.markdown` `[title-case-fix]` section):
```ini
[title-case-fix]
Api             API
CHANGELOG       Version History
Css             CSS
Javascript      JavaScript
```

**Merging**: Framework defaults → Site config → `.markdown` config (each level extends/overrides the previous)

**Note**: Title case fixes only apply to auto-generated titles, not custom titles specified in `[publish-list]`.

## Dynamic Content

### The `%DYNAMIC{}%` Token

Inject dynamic server-generated content into your markdown:

```markdown
# Available Plugins

`%DYNAMIC{plugins-list-table}%`

We currently have `%DYNAMIC{plugins-count}%` plugins installed.
```

### Syntax

`%DYNAMIC{generator-name key="value" another="value"}%`

- **generator-name**: Registered generator function (kebab-case)
- **parameters**: Optional key="value" pairs
- **Type coercion**: Numbers and booleans are auto-converted

### Available Generators

%DYNAMIC{dynamic-generator-list}%

### Parameter Examples

```markdown
<!-- All plugins as a table -->
`%DYNAMIC{plugins-list-table}%`

<!-- Only enabled plugins, max 5 -->
`%DYNAMIC{plugins-list-table status="enabled" limit="5"}%`

<!-- Count of disabled plugins -->
`%DYNAMIC{plugins-count status="disabled"}%`

<!-- Bullet list format -->
`%DYNAMIC{plugins-list}%`
```

### Escaping for Documentation

To show `%DYNAMIC{}%` tokens literally (for documentation), prefix with a backtick:

```markdown
Use the `%DYNAMIC{plugins-list-table}%` token to show plugins.
```

The backtick-prefixed token will not be processed and displays literally.

## Configuration File: `.markdown`

The `.markdown` file in your docs root directory provides complete control over publishing, ordering, and titles. All sections are optional.

### File Location

Create `.markdown` in your docs root directory:

```
docs/my-help/
├── .markdown          # Configuration file
├── README.md
└── getting-started.md
```

### Sections

The `.markdown` file supports three optional sections:

1. **`[publish-list]`** - Custom ordering and titles
2. **`[ignore]`** - Exclude files/directories
3. **`[title-case-fix]`** - Fix auto-generated titles

### `[publish-list]` Section

Define custom order for important docs and specify custom titles:

```ini
[publish-list]
# Format: filepath [optional-title]
# Files listed here appear first in the sidebar, in the order specified
# Remaining files are published alphabetically after these

README.md           Welcome to Help Center
getting-started.md  Getting Started Guide
faq.md              Frequently Asked Questions
troubleshooting.md  # Title auto-generated: "Troubleshooting"

# Subdirectories: list each file explicitly
guides/README.md    User Guides
guides/installation.md
guides/configuration.md
```

**Behavior**:
- **Partial list**: Only listed files are ordered explicitly
- **Remaining files**: Published alphabetically after listed ones
- **Custom titles**: Optional, if omitted title is auto-generated
- **Subdirectories**: Must list each file explicitly (no `guides/` shorthand)

### `[ignore]` Section

Exclude files and directories from publishing:

```ini
[ignore]
# Ignore patterns (gitignore-like syntax)
# Takes precedence over [publish-list] - ignored files are excluded even if listed

# Exclude specific files
draft.md
internal-notes.md

# Exclude directories (trailing slash)
archive/
work-in-progress/

# Glob patterns
*.draft.md
temp-*

# Whitelist mode: only publish files in [publish-list]
*
```

**Pattern Syntax**:

| Pattern | Matches |
|---------|---------|
| `filename.md` | Exact file match |
| `dirname/` | Directory and all contents |
| `*.draft.md` | Files ending in `.draft.md` |
| `temp-*` | Files starting with `temp-` |
| `*` | Everything (whitelist mode) |

**Precedence**: `[ignore]` takes precedence over `[publish-list]` - ignored files are excluded even if explicitly listed.

**Note**: Ignored files are hidden from navigation but still accessible via direct URL.

### `[title-case-fix]` Section

Fix auto-generated titles (merges with framework defaults):

```ini
[title-case-fix]
# Format: from-word    to-word
# Only applies to auto-generated titles (not custom titles in [publish-list])

Api             API
CHANGELOG       Version History
Css             CSS
Javascript      JavaScript
```

**Merging**: Framework defaults → Site `app.conf` → `.markdown` `[title-case-fix]` (each extends/overrides previous)

### Complete Example

```ini
# docs/my-help/.markdown

[publish-list]
README.md           Help Center
getting-started.md  Getting Started
faq.md
troubleshooting.md

guides/README.md    User Guides
guides/installation.md
guides/configuration.md

[ignore]
draft.md
archive/
*.backup.md

[title-case-fix]
Api             API
CHANGELOG       Version History
```

## Linking Between Documents

### Relative Links

Use relative markdown links - they're automatically transformed:

```markdown
<!-- Same directory -->
See [Getting Started](./getting-started.md) for basics.

<!-- Parent directory -->
Return to [Overview](../README.md).

<!-- Subdirectory -->
Check [Advanced Topics](./advanced/deep-dive.md).
```

### Cross-Namespace Links

For links to other documentation namespaces, use absolute paths with `.md` extension (works on both jPulse and your repository, such as GitHub):

```markdown
See the [Plugin Guide](/jpulse-docs/plugins/README.md) for details.
```

### Image Links

Place images in an `images/` subdirectory:

```
my-help/
├── README.md
├── images/
│   ├── screenshot.png
│   └── diagram.svg
└── guide.md
```

Reference in markdown:

```markdown
![Screenshot](./images/screenshot.png)
```

## API Reference

### List Directory

```
GET /api/1/markdown/{namespace}/
```

Returns the navigation tree structure.

### Get File Content

```
GET /api/1/markdown/{namespace}/{path}
```

Returns processed markdown content with:
- Transformed relative links
- Processed `%DYNAMIC{}%` tokens
- Ready for client-side rendering

### Response Format

```json
{
    "success": true,
    "content": "# Page Title\n\nMarkdown content...",
    "path": "guides/installation.md"
}
```

## Client-Side Integration

### jPulse.UI.docs API

The framework provides `jPulse.UI.docs` for documentation viewing:

```javascript
// Initialize documentation viewer
const viewer = await jPulse.UI.docs.init({
    // Required
    navElement: '#docs-navigation',      // Navigation sidebar selector
    contentElement: '#markdown-content', // Content area selector

    // Optional - auto-detected from URL if omitted
    namespace: 'my-help',

    // Optional
    defaultPath: 'README.md',            // Initial page
    onNavigate: (path, content) => {},   // Navigation callback
    onError: (error) => {},              // Error callback

    // Site nav integration (optional)
    registerWithSiteNav: true,           // Add to site nav dropdown
    siteNavKey: 'myHelp',                // Key for registration
    flattenTopLevel: true                // Remove root folder wrapper
});

// Programmatic navigation
await viewer.navigateTo('guides/installation.md');

// Get current path
const path = viewer.getCurrentPath();

// Refresh current document
await viewer.refresh();

// Get cached file structure
const files = viewer.getFiles();
```

**Key features:**
- **Auto-detects namespace** from URL path
- **SPA navigation** with browser history support
- **Caches directory structure** for sidebar
- **Uses marked.js** for markdown rendering
- **Site nav integration** for dropdown menus

### URL Routing

Documentation pages support deep linking:

- `/my-help/README` → Loads `README.md`
- `/my-help/getting-started` → Loads `getting-started.md`
- `/my-help/guides/installation` → Loads `guides/installation.md`

**Note**: Directory paths like `/my-help/` return the navigation listing, not content. Always link to `README.md` explicitly for index pages (e.g., `/my-help/README.md`).

The `.md` extension is optional in browser URLs, but **always include `.md` in your markdown source links** for GitHub compatibility.

## Styling

### Built-in Styles

jPulse provides professional documentation styling:

- **Responsive layout** with collapsible sidebar on mobile
- **Syntax highlighting** for code blocks
- **Table styling** with alternating rows
- **Typography** optimized for readability

### CSS Classes

| Class | Purpose |
|-------|---------|
| `.jp-docs-layout` | Two-column documentation layout |
| `.jp-docs-sidebar` | Navigation sidebar container |
| `.jp-docs-content` | Main content area |
| `.jp-markdown-content` | Markdown rendering container |

### Custom Styling

Override styles in your site's CSS:

```css
/* site/webapp/static/css/jpulse-common.css */

.jp-markdown-content h1 {
    color: var(--your-brand-color);
}

.jp-docs-sidebar {
    background: var(--your-sidebar-bg);
}
```

## Best Practices

### Content Organization

1. **Use descriptive filenames** - They become navigation titles
2. **Create README.md for every directory** - Provides section context
3. **Keep nesting shallow** - 2-3 levels maximum for usability
4. **Group related topics** - Use subdirectories logically

### Writing Style

1. **Start with a clear title** - Use `# Title` as first line
2. **Add a brief intro** - Explain what the page covers
3. **Use headings hierarchically** - `##`, `###`, `####`
4. **Include code examples** - Use fenced code blocks with language
5. **Link liberally** - Connect related documentation

### Maintenance

1. **Use `.markdown` `[ignore]`** - Hide drafts and internal docs
2. **Use `.markdown` `[publish-list]`** - Control ordering of important pages
3. **Review navigation** - Ensure logical structure
4. **Update cross-links** - After moving/renaming files
5. **Test dynamic content** - Verify `%DYNAMIC{}%` tokens work

## Example: Creating a Help Center

### Setup with Symlink

```bash
# Create help docs at project root
mkdir -p docs/help

# Create symlink for framework
ln -s ../../../../docs/help site/webapp/static/assets/help
```

### Directory Structure

```
docs/help/                      # Edit your docs here (visible at project root)
├── .markdown                   # Configuration file
├── README.md
├── getting-started.md
├── faq.md
├── troubleshooting.md
├── images/
│   └── logo.png
├── user-guide/
│   ├── README.md
│   ├── account-setup.md
│   ├── profile-settings.md
│   └── notifications.md
└── admin-guide/
    ├── README.md
    ├── user-management.md
    └── system-settings.md
```

### README.md Content

```markdown
# Help Center

Welcome to the Help Center! Find answers to common questions and learn how to use our platform.

## Quick Links

- [Getting Started](./getting-started.md) - New user? Start here
- [FAQ](./faq.md) - Frequently asked questions
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions

## Guides

- [User Guide](./user-guide/README.md) - Complete user documentation
- [Admin Guide](./admin-guide/README.md) - Administrator documentation

## Need More Help?

Contact support at support@example.com
```

**Note**: Always link to `README.md` explicitly for subdirectory index pages (not just the directory path).

### View Page

Create `site/webapp/view/help/index.shtml` using the template from [Quick Start](#2-create-a-view-page).

Key customizations:
- Update `<title>` to "📚 Help Center"
- Update `<h3>` heading to "📚 Help Center"
- Optionally add site nav integration:

```javascript
await jPulse.UI.docs.init({
    navElement: '#docs-navigation',
    contentElement: '#markdown-content',
    registerWithSiteNav: true,  // Add to site nav dropdown
    siteNavKey: 'help'
});
```

The namespace is auto-detected from the URL (`/help/` → namespace `help`), which loads docs from `docs/help/` (via the symlink).

## Related Documentation

- [Site Customization](./site-customization.md) - Override system and site structure
- [Handlebars Reference](./handlebars.md) - Template syntax guide
- [Style Reference](./style-reference.md) - CSS framework documentation
- [Plugin Documentation](./plugins/README.md) - Creating plugin documentation

---

*jPulse Framework - Documentation that just works.*
