# Site Customizations Directory

This directory contains site-specific customizations that override the jPulse Framework defaults.

## W-014: Site Override System

The site override system allows you to customize the jPulse Framework without modifying the core framework files, ensuring your customizations survive framework updates.

### Directory Structure

```
site/
├── README.md                    # This file
└── webapp/                      # Site-specific overrides
    ├── app.conf                 # Site configuration (gitignored)
    ├── app.conf.tmpl            # Configuration template
    ├── controller/              # Site controller overrides
    │   └── hello.js             # Demo controller override
    ├── model/                   # Site model overrides
    ├── view/                    # Site template overrides
    │   ├── hello/
    │   │   └── index.shtml      # Demo view override
    │   ├── site-common.css      # Site-specific styles (W-047)
    │   ├── site-common.css.tmpl # Site CSS template (W-047)
    │   ├── site-common.js       # Site-specific JavaScript (W-047)
    │   └── site-common.js.tmpl  # Site JS template (W-047)
    └── static/                  # Site-specific assets
```

### How It Works

**File Resolution Priority:**
1. `site/webapp/[type]/[file]` (Site override - highest priority)
2. `webapp/[type]/[file]` (Framework default - fallback)
3. Error if neither found

**Configuration Merging:**
- Framework defaults: `webapp/app.conf`
- Site overrides: `site/webapp/app.conf`
- Result: Deep merged configuration with site values taking precedence

### Getting Started

1. **Copy the configuration template:**
   ```bash
   cp site/webapp/app.conf.tmpl site/webapp/app.conf
   ```

2. **Customize your configuration:**
   Edit `site/webapp/app.conf` with your site-specific settings.

3. **Create overrides as needed:**
   - Controllers: `site/webapp/controller/[name].js`
   - Models: `site/webapp/model/[name].js`
   - Views: `site/webapp/view/[path]/[name].shtml`
   - Assets: `site/webapp/static/[path]/[file]`

### Demo Override

The demo shows the "don't make me think" principle in action:

**View Override (Automatic):**
- Visit `/hello/` - automatically uses `site/webapp/view/hello/index.shtml`
- No route registration needed - works through existing dynamic routing

**API Override (Auto-Discovery):**
- Visit `/api/1/hello` - uses `site/webapp/controller/hello.js`
- **Zero manual configuration** - auto-discovered at app startup
- Follows the same `/api/1/` pattern as other APIs

**Configuration Override:**
- All values from `site/webapp/app.conf` are automatically available

**Interactive Demo:**
- Click "Test Site API" button to see `jPulse.apiCall()` in action
- Live demonstration of site override API functionality

### Protected Files

The following files are protected from framework updates:
- `site/` directory (all contents)
- `.jpulse/site-*` (site metadata)

### Best Practices

1. **Configuration**: Only override values you need to change
2. **Controllers**: Extend framework controllers when possible
3. **Views**: Copy and modify entire templates for consistency
4. **Assets**: Use site-specific paths to avoid conflicts
5. **Documentation**: Document your customizations
6. **Version Control**: Consider setting up a GitHub repository for your site

### Version Control Setup

For team collaboration and deployment automation, you can set up version control for your jPulse site. This provides:
- **Team Collaboration**: Multiple developers working on site customizations
- **Change Tracking**: Full history of site modifications
- **Deployment Automation**: Deploy from repository to multiple environments
- **Backup**: Additional backup layer for customizations

See the **[GitHub Repository Setup](/jpulse-docs/deployment)** section in the deployment guide for complete instructions on:
- Initial repository setup and .gitignore configuration
- What files to include/exclude for security
- Deployment workflow from git repository
- Security considerations for site repositories

---

## W-047: Site-Specific Coding & Styling Guidelines

This section provides comprehensive guidelines for site-specific development, following the "don't make me think" principle.

### Quick Start for Site Development

1. **Copy the style and script templates:**
   ```bash
   cp site/webapp/view/site-common.css.tmpl site/webapp/view/site-common.css
   cp site/webapp/view/site-common.js.tmpl site/webapp/view/site-common.js
   ```

2. **Customize your site styles and scripts:**
   - Edit `site/webapp/view/site-common.css` for site-specific styles
   - Edit `site/webapp/view/site-common.js` for site-specific JavaScript

3. **Files are automatically loaded:**
   - Framework automatically detects and loads site-common files
   - No manual configuration required - follows "don't make me think" principle

### CSS Guidelines

#### **Naming Convention: `site-*` Prefix**

**Why `site-*` prefix?**
- ✅ **Clear source identification**: When you see `site-header` in HTML, you immediately know to look in `site-common.css`
- ✅ **Maintainability**: Easy to debug and modify site-specific styles
- ✅ **No conflicts**: Completely separate from framework `jp-*` classes

**Examples:**
```css
/* Site-specific components */
.site-header { /* Custom site header */ }
.site-nav { /* Site navigation */ }
.site-card { /* Site-specific card style */ }
.site-btn-primary { /* Site-specific button */ }

/* Site utility classes */
.site-text-primary { color: var(--site-primary-color); }
.site-bg-accent { background: var(--site-accent-color); }
.site-shadow { box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
```

#### **CSS Organization Pattern**

```css
/* 1. CSS Variables for site theme */
:root {
    --site-primary-color: #2563eb;
    --site-secondary-color: #64748b;
    /* ... more variables */
}

/* 2. Site-specific layout components */
.site-header { /* ... */ }
.site-nav { /* ... */ }

/* 3. Site-specific content components */
.site-card { /* ... */ }
.site-feature-grid { /* ... */ }

/* 4. Site utility classes */
.site-text-primary { /* ... */ }
.site-bg-light { /* ... */ }

/* 5. Site-specific animations */
@keyframes site-fade-in { /* ... */ }

/* 6. Framework overrides (when needed) */
.jp-btn-primary {
    background: var(--site-primary-color);
}
```

#### **Responsive Design**

Use consistent breakpoints and mobile-first approach:

```css
/* Mobile first */
.site-nav {
    flex-direction: column;
}

/* Tablet and up */
@media (min-width: 768px) {
    .site-nav {
        flex-direction: row;
    }
}

/* Desktop and up */
@media (min-width: 1024px) {
    .site-feature-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}
```

### JavaScript Guidelines

#### **Extension Pattern: Extend `jPulse`**

Site JavaScript should extend the existing `jPulse` framework object:

```javascript
// Extend jPulse with site-specific namespace
window.jPulse = window.jPulse || {};

// Site-specific functionality
jPulse.site = {
    config: {
        name: 'My Custom Site',
        version: '1.0.0'
    },

    // Site-specific methods
    myCustomFunction: () => {
        // Site-specific logic
    }
};
```

#### **Common Extension Patterns**

**1. Site-Specific UI Components:**
```javascript
jPulse.site.dialog = {
    show: (message, type, options) => {
        // Custom dialog implementation
    },
    confirm: (message, onConfirm, onCancel) => {
        // Custom confirmation dialog
    }
};
```

**2. Site Utility Functions:**
```javascript
jPulse.site.utils = {
    formatCurrency: (amount, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    debounce: (func, wait) => {
        // Debounce implementation
    }
};
```

**3. Extending Existing jPulse Namespaces:**
```javascript
// Extend jPulse.form with site-specific validation
if (jPulse.form) {
    jPulse.form.site = {
        validate: {
            phoneNumber: (phone) => /^\(\d{3}\)\s\d{3}-\d{4}$/.test(phone)
        }
    };
}
```

#### **Auto-Initialization Pattern**

```javascript
jPulse.site = {
    init: () => {
        console.log('Initializing site functionality');
        jPulse.site._initEventListeners();
        jPulse.site._initComponents();
    },

    _initEventListeners: () => {
        // Site-specific event listeners
    },

    _initComponents: () => {
        // Auto-initialize components with data attributes
        document.querySelectorAll('[data-site-component]').forEach(element => {
            const componentType = element.dataset.siteComponent;
            // Initialize based on component type
        });
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', jPulse.site.init);
} else {
    jPulse.site.init();
}
```

### HTML Integration

#### **Using Site-Specific Classes**

```html
<!-- Site-specific styled components -->
<div class="site-feature-grid">
    <div class="site-feature-card">
        <div class="site-feature-icon">🎯</div>
        <h4 class="site-feature-title">Feature Title</h4>
        <p class="site-feature-description">Feature description</p>
    </div>
</div>

<!-- Site-specific buttons -->
<button class="site-btn site-btn-primary">Site Button</button>

<!-- Mix with framework classes when appropriate -->
<div class="jp-main">
    <div class="site-hero">
        <h1 class="site-hero-title">Welcome</h1>
    </div>
</div>
```

#### **Data Attributes for Site Components**

```html
<!-- Auto-initialized components -->
<div data-site-component="accordion">
    <div data-accordion-header>Click to expand</div>
    <div>Accordion content</div>
</div>

<!-- Analytics tracking -->
<button data-site-track="demo_click" class="site-btn">Track This Click</button>
```

### Best Practices

#### **CSS Best Practices**

1. **Use CSS Variables**: Define site colors and spacing in `:root`
2. **Component-Based**: Create reusable `.site-*` components
3. **Responsive First**: Design mobile-first with progressive enhancement
4. **Performance**: Use efficient selectors and minimize specificity conflicts
5. **Maintainability**: Group related styles and comment complex sections

#### **JavaScript Best Practices**

1. **Namespace Everything**: Keep all site code under `jPulse.site`
2. **Private Functions**: Use underscore prefix for internal functions (`_initComponents`)
3. **Error Handling**: Always include try-catch for async operations
4. **Performance**: Use event delegation and debouncing where appropriate
5. **Documentation**: Comment complex functionality and provide usage examples

#### **Integration Best Practices**

1. **Progressive Enhancement**: Site features should enhance, not replace framework functionality
2. **Graceful Degradation**: Site features should fail gracefully if not loaded
3. **Testing**: Test site customizations across different browsers and devices
4. **Documentation**: Document site-specific features and customizations
5. **Version Control**: Track site customizations separately from framework updates

### Common Patterns

#### **Site Theme System**

```css
:root {
    --site-primary: #2563eb;
    --site-secondary: #64748b;
    --site-success: #10b981;
    --site-warning: #f59e0b;
    --site-error: #ef4444;
}

.site-theme-primary { color: var(--site-primary); }
.site-theme-bg-primary { background: var(--site-primary); }
```

#### **Site Analytics Integration**

```javascript
jPulse.site.analytics = {
    track: (event, data) => {
        if (typeof gtag !== 'undefined') {
            gtag('event', event, data);
        }
        console.log('Analytics:', event, data);
    }
};
```

#### **Site Form Enhancements**

```javascript
jPulse.site.forms = {
    formatPhone: (input) => {
        let value = input.value.replace(/\D/g, '');
        if (value.length >= 6) {
            value = `(${value.slice(0,3)}) ${value.slice(3,6)}-${value.slice(6,10)}`;
        }
        input.value = value;
    }
};
```

### Demo and Examples

Visit `/hello/` to see a comprehensive demo of:
- Site-specific CSS classes in action
- JavaScript extensions and utilities
- Component auto-initialization
- Analytics tracking
- Custom dialogs and confirmations

### Troubleshooting

**Site styles not loading?**
- Check that `site-common.css` exists in `site/webapp/view/`
- Verify file permissions and syntax

**Site JavaScript not working?**
- Check browser console for errors
- Ensure `site-common.js` exists and has valid syntax
- Verify `jPulse.site` object is defined

**Framework conflicts?**
- Use `site-*` prefix consistently
- Check for CSS specificity issues
- Ensure JavaScript doesn't override framework functions

### Version Compatibility

- **W-014 Site Override System**: Compatible with jPulse Framework v0.4.10+
- **W-047 Site Guidelines**: Compatible with jPulse Framework v0.5.0+

For more information, see the main project documentation.
