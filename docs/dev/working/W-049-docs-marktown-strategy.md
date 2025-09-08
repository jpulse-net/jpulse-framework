# W-049: Docs: Browser Markdown Rendering Guide

A comprehensive reference for rendering Markdown to HTML in the browser using open-source MIT-licensed packages.

## jPulse Framework Markdown Strategy

### Overview
Browser-based Markdown rendering to HTML using open-source libraries, designed for the jPulse Framework's documentation system with two distinct buckets: jPulse docs and site docs.

### Documentation Architecture

#### Two Separate Documentation Systems
1. **jPulse Framework Docs** (`/jpulse/`)
   - Used by site admins/developers to help them create their own site based on jPulse
   - Can be updated cleanly with framework updates
   - Base URI: `/jpulse/` (framework documentation)
   - Controlled by jPulse development team

2. **Site-Specific Docs** (site-controlled)
   - Created by site admins/developers for their end users
   - Multiple base URIs as needed by site owner (e.g., `/docs/`, `/help/`, `/manual/`, `/guide/`)
   - Each with its own view namespace
   - Controlled by site owners/development teams

### Implementation Strategy (Simplified)

#### Static File Serving Approach
- **No dedicated controller**: Avoid `webapp/controller/jpulse.js`
- **Single viewer template**: Only an `index.shtml` that reads `.md` files from static assets
- **Symlink integration**: Make `/docs/` accessible via `webapp/static/assets/jpulse/`
- **Client-side rendering**: JavaScript loads and renders Markdown files in browser

#### File Structure

```
webapp/static/assets/jpulse/    # Symlinked to /docs/
├── index.shtml                 # Markdown viewer template
├── README.md                   # Framework overview
├── api-reference.md            # REST API documentation
├── front-end-development.md    # JavaScript framework guide
├── style-reference.md          # CSS framework reference
├── template-reference.md       # Handlebars template reference
└── ...                         # Other framework docs

site/webapp/view/help/          # Site-specific docs (example)
├── index.shtml                 # Site's help viewer
├── user-guide.md               # Site-specific user documentation
└── ...                         # Site-controlled content
```

### Technical Implementation

#### Markdown Rendering
- **Library**: Marked.js (lightweight, ~9KB) or Markdown-it (feature-rich, ~46KB)
- **Security**: DOMPurify for XSS protection when rendering user content
  - likely not needed, since assets can only be updated by site admins
- **Performance**: Debounced rendering for live preview, caching for static content
  - overkill, likely not needed

#### URL Strategy
- Clean, shareable URLs: `/docs/api-reference` → loads `api-reference.md`
- SEO-friendly structure with proper meta tags and navigation
- Framework docs: `/jpulse/[document-name]`
- Site docs: `/[site-namespace]/[document-name]` (site-controlled)

#### Asset Management
- Images and assets stored alongside Markdown files
- Relative linking within documentation
- Framework assets in `webapp/static/assets/jpulse/`
- Site assets in site-controlled directories

### Enterprise Features (Future)
- **Search**: Delegated to existing enterprise search systems (let docs get crawled)
- **Versioning**: Automatic in git for jPulse docs, site-controlled for site docs
- **Access Control**: Handled by existing enterprise authentication systems
- **PDF Export**: Can be added later via browser print-to-PDF or dedicated tools

### Benefits
- **KISS Principle**: Simple, don't make me think approach
- **Update Safety**: Framework docs update cleanly, site docs remain under site control
- **Flexibility**: Sites can have multiple documentation namespaces as needed
- **Performance**: Client-side rendering with caching, no server-side processing overhead
- **Maintainability**: Clear separation of concerns, easy to understand and modify

### Integration with W-014 Site Override Architecture
- Framework documentation updates automatically with framework updates
- Site documentation remains in site-controlled directories
- No conflicts between framework and site documentation systems
- Clean separation following the established override pattern

## Quick Start with Marked

The most popular and lightweight option for browser-based Markdown rendering.

### CDN Installation

```html
<!DOCTYPE html>
<html>
<head>
    <title>Markdown Renderer</title>
</head>
<body>
    <textarea id="markdown-input" rows="10" cols="80">
# Hello World
This is **bold** and *italic* text.
    </textarea>
    <div id="html-output"></div>

    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script>
        const input = document.getElementById('markdown-input');
        const output = document.getElementById('html-output');
        
        function renderMarkdown() {
            output.innerHTML = marked.parse(input.value);
        }
        
        input.addEventListener('input', renderMarkdown);
        renderMarkdown(); // Initial render
    </script>
</body>
</html>
```

### NPM Installation

```bash
npm install marked
```

```javascript
import { marked } from 'marked';

// Basic usage
const html = marked.parse('# Hello World\nThis is **bold** text.');
document.getElementById('output').innerHTML = html;

// With options
marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false
});
```

### Custom Renderer Example

```javascript
import { marked } from 'marked';

// Custom renderer for code blocks
const renderer = new marked.Renderer();
renderer.code = function(code, lang) {
    return `<pre><code class="language-${lang}">${code}</code></pre>`;
};

marked.setOptions({ renderer });
```

## Alternative: Markdown-it

Feature-rich option with extensive plugin ecosystem.

### CDN Setup

```html
<script src="https://cdn.jsdelivr.net/npm/markdown-it@13.0.1/dist/markdown-it.min.js"></script>
<script>
    const md = window.markdownit({
        html: true,
        linkify: true,
        typographer: true
    });
    
    const result = md.render('# Hello World');
    document.getElementById('content').innerHTML = result;
</script>
```

### NPM Setup with Plugins

```bash
npm install markdown-it markdown-it-anchor markdown-it-table-of-contents
```

```javascript
import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import toc from 'markdown-it-table-of-contents';

const md = new MarkdownIt()
    .use(anchor)
    .use(toc);

const html = md.render(markdownContent);
```

## Framework Integration Examples

### React Component

```jsx
import React, { useState, useEffect } from 'react';
import { marked } from 'marked';

function MarkdownRenderer({ markdown }) {
    const [html, setHtml] = useState('');
    
    useEffect(() => {
        setHtml(marked.parse(markdown));
    }, [markdown]);
    
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// Usage
<MarkdownRenderer markdown="# Hello\nThis is **bold**" />
```

### Vue Component

```vue
<template>
    <div v-html="renderedMarkdown"></div>
</template>

<script>
import { marked } from 'marked';

export default {
    props: ['markdown'],
    computed: {
        renderedMarkdown() {
            return marked.parse(this.markdown);
        }
    }
}
</script>
```

## Security Considerations

**Always sanitize HTML output when rendering user-generated content:**

```bash
npm install dompurify
```

```javascript
import { marked } from 'marked';
import DOMPurify from 'dompurify';

function safeMarkdownRender(markdown) {
    const rawHtml = marked.parse(markdown);
    return DOMPurify.sanitize(rawHtml);
}

// Usage
document.getElementById('content').innerHTML = safeMarkdownRender(userInput);
```

## Performance Optimization

### Debounced Live Preview

```javascript
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const debouncedRender = debounce((markdown) => {
    document.getElementById('output').innerHTML = marked.parse(markdown);
}, 300);

document.getElementById('input').addEventListener('input', (e) => {
    debouncedRender(e.target.value);
});
```

### Web Workers for Large Documents

```javascript
// worker.js
importScripts('https://cdn.jsdelivr.net/npm/marked/marked.min.js');

self.onmessage = function(e) {
    const html = marked.parse(e.data);
    self.postMessage(html);
};

// main.js
const worker = new Worker('worker.js');
worker.postMessage(largeMarkdownString);
worker.onmessage = function(e) {
    document.getElementById('output').innerHTML = e.data;
};
```

## Library Comparison

| Library | Size (min) | Features | Performance | Best For |
|---------|------------|----------|-------------|----------|
| marked | ~9KB | Basic + Extensions | Fastest | General use, speed priority |
| markdown-it | ~46KB | Rich + Plugins | Good | Feature-rich applications |
| snarkdown | ~1KB | Minimal | Very Fast | Minimal footprint needed |
| micromark | ~15KB | CommonMark spec | Good | Spec compliance |

## Common Configurations

### GitHub Flavored Markdown (GFM)

```javascript
marked.setOptions({
    gfm: true,
    breaks: true,
    pedantic: false,
    sanitize: false,
    smartLists: true,
    smartypants: false
});
```

### Syntax Highlighting Integration

```html
<!-- Include Prism.js for syntax highlighting -->
<link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/themes/prism.min.css" rel="stylesheet" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/components/prism-core.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/plugins/autoloader/prism-autoloader.min.js"></script>

<script>
    // Custom renderer for code blocks
    const renderer = new marked.Renderer();
    renderer.code = function(code, language) {
        const validLang = Prism.languages[language] ? language : 'plaintext';
        return `<pre><code class="language-${validLang}">${code}</code></pre>`;
    };
    
    marked.setOptions({ renderer });
    
    // Render markdown then highlight
    const html = marked.parse(markdown);
    document.getElementById('output').innerHTML = html;
    Prism.highlightAll();
</script>
```

## Troubleshooting

### Common Issues

1. **XSS vulnerabilities**: Always sanitize user input
2. **Memory leaks**: Clean up event listeners in SPAs
3. **Performance**: Use debouncing for live preview
4. **Styling conflicts**: Scope CSS to markdown container

### CSS Reset for Markdown Content

```css
.markdown-content {
    line-height: 1.6;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.markdown-content h1, .markdown-content h2, .markdown-content h3 {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
}

.markdown-content pre {
    background: #f6f8fa;
    padding: 1em;
    border-radius: 6px;
    overflow-x: auto;
}

.markdown-content code {
    background: #f6f8fa;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-size: 85%;
}
```

## Resources

- [marked Documentation](https://marked.js.org/)
- [markdown-it Documentation](https://markdown-it.github.io/)
- [CommonMark Spec](https://spec.commonmark.org/)
- [DOMPurify for XSS Protection](https://github.com/cure53/DOMPurify)

---

*Last updated: September 2025*
