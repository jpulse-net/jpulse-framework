# jPulse Docs / Markdown Documentation System v1.3.14

**For Site Developers**

This guide explains how to create markdown-based documentation for your jPulse site, such as `/help/`, `/faq/`, `/knowledge-base/`, or any custom documentation namespace.

## Overview

jPulse provides a complete markdown documentation infrastructure that:

- **Auto-generates navigation** from your directory structure
- **Supports dynamic content** with `%DYNAMIC{}%` tokens
- **Renders beautifully** with syntax highlighting and responsive design
- **Follows site override patterns** (site > plugins > framework)
- **Supports file exclusion** via `.jpulse-ignore`

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
<html lang="en">
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

### Navigation Generation

The sidebar navigation is auto-generated from your directory structure:

- **Files** become navigation items (sorted alphabetically)
- **Directories** become expandable sections
- **README.md** becomes the section's clickable header
- **Titles** are derived from filenames (`getting-started.md` → "Getting Started")

### Title Generation

Filenames are converted to human-readable titles:

| Filename | Generated Title |
|----------|-----------------|
| `README.md` | (Uses directory name) |
| `getting-started.md` | Getting Started |
| `api-reference.md` | API Reference |
| `mpa-vs-spa.md` | MPA vs. SPA |

**Tip**: Use descriptive filenames for automatic good titles.

### Title Case Fixes

The framework automatically fixes common acronyms and terms in generated titles. This is configured in `app.conf`:

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

Site configuration merges with framework defaults, so you only need to specify additions or overrides.

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

## Excluding Files

### The `.jpulse-ignore` File

Create `.jpulse-ignore` in your docs root to exclude files from navigation:

```
# .jpulse-ignore - files and directories to hide from navigation

# Exclude specific files
draft.md
internal-notes.md

# Exclude directories (trailing slash)
archive/
work-in-progress/

# Glob patterns
*.draft.md
temp-*
```

### Pattern Syntax

| Pattern | Matches |
|---------|---------|
| `filename.md` | Exact file match |
| `dirname/` | Directory and all contents |
| `*.draft.md` | Files ending in `.draft.md` |
| `temp-*` | Files starting with `temp-` |

**Note**: Ignored files are hidden from navigation but still accessible via direct URL.

## Linking Between Documents

### Relative Links

Use relative markdown links - they're automatically transformed:

```markdown
<!-- Same directory -->
See [Getting Started](./getting-started.md.md) for basics.

<!-- Parent directory -->
Return to [Overview](../README.md.md).

<!-- Subdirectory -->
Check [Advanced Topics](./advanced/deep-dive.md.md).
```

### Cross-Namespace Links

For links to other documentation namespaces, use absolute paths with `.md` extension (works on both jPulse and your repository, such as GitHub):

```markdown
See the [Plugin Guide](/jpulse-docs/plugins/README.md.md) for details.
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

1. **Use `.jpulse-ignore`** - Hide drafts and internal docs
2. **Review navigation** - Ensure logical structure
3. **Update cross-links** - After moving/renaming files
4. **Test dynamic content** - Verify `%DYNAMIC{}%` tokens work

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
├── .jpulse-ignore
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

- [Getting Started](./getting-started.md.md) - New user? Start here
- [FAQ](./faq.md.md) - Frequently asked questions
- [Troubleshooting](./troubleshooting.md.md) - Common issues and solutions

## Guides

- [User Guide](./user-guide/README.md.md) - Complete user documentation
- [Admin Guide](./admin-guide/README.md.md) - Administrator documentation

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
