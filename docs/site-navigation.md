# jPulse Docs / Site Navigation Guide v1.4.4

Complete guide to customizing site navigation in the jPulse Framework using direct mutation and append mode.

---

## Overview

The jPulse Framework provides a flexible navigation system that separates framework-provided navigation from site-specific customizations. This allows sites to:

- ✅ Keep framework navigation updated automatically
- ✅ Add custom navigation sections
- ✅ Extend framework sections with site-specific pages
- ✅ Remove unwanted framework sections (set to `null`)
- ✅ Override labels, icons, or URLs

## Navigation Structure

### Framework Navigation
```javascript
// Defined in: webapp/view/jpulse-navigation.js (loaded first)
window.jPulseNavigation = {
    site: {     // Site-wide navigation (pulldown menu, breadcrumbs)
        admin: { ... },
        jpulseDocs: { ... },
        jpulseExamples: { ... },
        auth: { ... }
    },
    tabs: {     // Page-specific tab navigation
        jPulseDocsExamplesTabs: { ... },
        jPulseExamplesSubTabs: { ... }
    }
};
```

### Site Navigation Customization (Optional)
```javascript
// Optional: site/webapp/view/jpulse-navigation.js (appended, loaded second)
// Directly modify window.jPulseNavigation - it already exists!

// Example: Remove framework sections
window.jPulseNavigation.site.jpulseDocs = null;
window.jPulseNavigation.site.jpulseExamples = null;

// Example: Add new section
window.jPulseNavigation.site.marketing = {
    label: 'Marketing',
    url: '/marketing/',
    pages: { ... }
};

// Example: Add page to existing section
window.jPulseNavigation.site.admin.pages.contacts = {
    label: 'Contacts',
    url: '/admin/contacts.shtml'
};
```

### Append Mode (W-098)

The framework uses **append mode** for `.js` files:
1. Framework `jpulse-navigation.js` is loaded first (defines `window.jPulseNavigation`)
2. Site `jpulse-navigation.js` is automatically appended (modifies `window.jPulseNavigation`)
3. Both files are concatenated into a single response

This pattern is:
- **Simple**: Direct JavaScript mutation
- **Explicit**: Clear what's being changed
- **Efficient**: No runtime merge overhead
- **Idiomatic**: Standard JavaScript pattern

---

## Direct Mutation Pattern

Site customization uses **direct mutation** of the `window.jPulseNavigation` object:

1. **Add**: Assign new properties directly
2. **Modify**: Reassign existing properties
3. **Delete**: Set any property to `null`
4. **Simple**: Standard JavaScript, no special merge logic

### Example: Direct Mutation in Action

```javascript
// Framework defines (loaded first from webapp/view/jpulse-navigation.js)
window.jPulseNavigation = {
    site: {
        admin: {
            label: 'Admin',
            pages: {
                config: { ... },
                users: { ... }
            }
        },
        jpulseExamples: { ... }
    }
};

// Site customizes (loaded second from site/webapp/view/jpulse-navigation.js)
// Directly modify the existing window.jPulseNavigation object:

// Remove unwanted section
window.jPulseNavigation.site.jpulseExamples = null;

// Add new page to existing section
window.jPulseNavigation.site.admin.pages.contacts = {
    label: 'Contacts',
    url: '/admin/contacts.shtml',
    icon: '📧'
};

// Add completely new section
window.jPulseNavigation.site.marketing = {
    label: 'Marketing',
    url: '/marketing/',
    pages: { ... }
};

// Result: window.jPulseNavigation is now customized with your changes
```

---

## Common Patterns

### Pattern 1: Remove Framework Sections

Remove sections you don't need in production:

```javascript
// site/webapp/view/jpulse-navigation.js
window.jPulseNavigation.site.jpulseDocs = null;      // Remove documentation section
window.jPulseNavigation.site.jpulseExamples = null;   // Remove examples section
```

**Use Case:** Production sites don't need framework demo sections.

---

### Pattern 2: Add Custom Navigation Section

Add your own top-level navigation section:

```javascript
window.jPulseNavigation.site.marketing = {
    label: 'Marketing',
    url: '/marketing/',
    icon: '📢',
    pages: {
        features: {
            label: 'Features',
            url: '/features/',
            icon: '✨'
        },
        pricing: {
            label: 'Pricing',
            url: '/pricing/',
            icon: '💰'
        },
        blog: {
            label: 'Blog',
            url: '/blog/',
            icon: '📝'
        }
    }
};
```

**Use Case:** Marketing sites with custom sections.

---

### Pattern 3: Extend Framework Admin Section

Add site-specific pages to the framework admin section:

```javascript
// Add individual pages to existing admin section
window.jPulseNavigation.site.admin.pages.contacts = {
    label: 'Contacts',
    url: '/admin/contacts.shtml',
    icon: '📧'
};

window.jPulseNavigation.site.admin.pages.billing = {
    label: 'Billing',
    url: '/admin/billing.shtml',
    icon: '💳'
};

window.jPulseNavigation.site.admin.pages.reports = {
    label: 'Reports',
    url: '/admin/reports.shtml',
    icon: '📊',
    pages: {  // Nested pages
        sales: {
            label: 'Sales Reports',
            url: '/admin/reports/sales.shtml'
        },
        analytics: {
            label: 'Analytics',
            url: '/admin/reports/analytics.shtml'
        }
    }
};
```

**Use Case:** Site-specific admin pages alongside framework admin tools.

**Result:** Framework admin pages (config, users, logs, etc.) are kept, your pages are added.

---

### Pattern 4: Override Framework Properties

Change labels, icons, or URLs of framework sections:

```javascript
// Override individual properties
window.jPulseNavigation.site.auth.label = 'Account';      // Override label
window.jPulseNavigation.site.auth.icon = '👤';             // Override icon
// url remains as framework default

window.jPulseNavigation.site.admin.icon = '🛠️';           // Override admin icon
// label, url, pages remain as framework defaults
```

**Use Case:** Customize framework sections to match your site's branding.

---

### Pattern 5: Remove Nested Pages

Remove specific pages within a section:

```javascript
// Remove specific admin page
window.jPulseNavigation.site.admin.pages.websocket = null;
```

**Use Case:** Hide specific admin features not relevant to your site.

---

### Pattern 6: Breadcrumb-Only Pages (hideInDropdown)

Some pages require URL parameters and shouldn't appear in navigation menus, but should still show in breadcrumbs for the "where am I?" context:

```javascript
// Page requires URL parameters (e.g., /admin/user-profile.shtml?userId=123)
// Hide from dropdown menu but show in breadcrumbs
window.jPulseNavigation.site.admin.pages.users.pages.userProfile = {
    label: 'User Profile',
    url: '/admin/user-profile.shtml',
    icon: '👤',
    hideInDropdown: true  // Won't appear in menus, only in breadcrumbs
};
```

**Use Case:** Detail pages that require parameters from a parent page (user profile, order details, etc.). Users navigate to these pages via links in parent pages, not through menu navigation.

**Behavior:**
- ✅ Appears in breadcrumbs: `Home > Admin > Users > User Profile`
- ❌ Hidden from desktop dropdown menu
- ❌ Hidden from mobile hamburger menu

---

### Pattern 7: Complete Real-World Example

Typical production site configuration:

```javascript
// site/webapp/view/jpulse-navigation.js

// Remove framework demo sections
window.jPulseNavigation.site.jpulseDocs = null;
window.jPulseNavigation.site.jpulseExamples = null;

// Add site dashboard
window.jPulseNavigation.site.dashboard = {
    label: 'Dashboard',
    url: '/dashboard/',
    role: 'user',  // Visible to authenticated users
    icon: '📊',
    pages: {
        overview: {
            label: 'Overview',
            url: '/dashboard/'
        },
        reports: {
            label: 'Reports',
            url: '/dashboard/reports.shtml',
            icon: '📈'
        },
        analytics: {
            label: 'Analytics',
            url: '/dashboard/analytics.shtml',
            icon: '📉'
        }
    }
};

// Add marketing section
window.jPulseNavigation.site.marketing = {
    label: 'Marketing',
    url: '/marketing/',
    pages: {
        features: { label: 'Features', url: '/features/' },
        pricing: { label: 'Pricing', url: '/pricing/' },
        about: { label: 'About', url: '/about/' }
    }
};

// Extend admin with site pages
window.jPulseNavigation.site.admin.pages.contacts = {
    label: 'Contacts',
    url: '/admin/contacts.shtml',
    icon: '📧'
};

window.jPulseNavigation.site.admin.pages.billing = {
    label: 'Billing',
    url: '/admin/billing.shtml',
    icon: '💳'
};
```

---

## File Setup

### Step 1: Create Site Navigation File

Start with the provided template:

```bash
# Copy the example template
cp site/webapp/view/jpulse-navigation.js.tmpl \
   site/webapp/view/jpulse-navigation.js

# Edit to add your customizations
vi site/webapp/view/jpulse-navigation.js
```

**Note:** The framework uses **append mode** - your file is automatically concatenated after the framework's `jpulse-navigation.js`. You don't need to include or merge anything.


### Step 2: Test Your Changes

1. Restart your application
2. Check the site navigation pulldown menu
3. Check breadcrumbs navigation
4. Verify role-based visibility
5. Test on mobile (hamburger menu)

---

## Navigation Properties

Each navigation item supports these properties:

### Required Properties
- `label` (string) - Display text for the navigation item

### Optional Properties
- `url` (string) - Link URL for the navigation item
- `icon` (string) - Icon (emoji or SVG component)
- `role` (string) - Required user role for visibility (e.g., 'admin', 'user')
- `pages` (object) - Nested child pages
- `hideInDropdown` (boolean) - Hide from dropdown/hamburger menu but show in breadcrumbs, default false

### Example with All Properties

```javascript
mySection: {
    label: 'My Section',                // Required
    url: '/my-section/',                // Optional
    icon: '🚀',                         // Optional
    role: 'user',                       // Optional (visible to role only)
    hideInDropdown: false,              // Optional (do not hide in dropdown, default)
    pages: {                            // Optional (nested pages)
        page1: {
            label: 'Page 1',
            url: '/my-section/page1.shtml'
        },
        detailPage: {
            label: 'Detail Page',
            url: '/my-section/detail.shtml',
            hideInDropdown: true        // Requires URL params, hence show in breadcrumbs only
        }
    }
}
```

---

## Icons

You can use emojis or SVG components for icons:

### Emoji Icons
```javascript
icon: '📊',    // Simple emoji
icon: '🔥',    // Unicode emoji
```

### SVG Component Icons
```javascript
// Framework SVG components (from webapp/view/components/svg-icons.tmpl)
icon: `{{components.jpIcons.configSvg size="24" _inline=true}}`,
icon: `{{components.jpIcons.usersSvg size="24" _inline=true}}`,
icon: `{{components.jpIcons.logsSvg size="24" _inline=true}}`,

// Custom site SVG components
icon: `{{components.siteIcons.customIcon size="24" _inline=true}}`,
icon: '<svg width="24" height="24" viewBox="0 0 64 64" > ... </svg>',
```

**Note:** Use `_inline=true` parameter for icons in navigation to ensure proper rendering in JavaScript structures.

---

## Role-Based Visibility

Control who can see navigation items based on user roles:

```javascript
// Visible to everyone
dashboard: {
    label: 'Dashboard',
    url: '/dashboard/'
    // No role property
},

// Visible only to authenticated users
myAccount: {
    label: 'My Account',
    url: '/account/',
    role: 'user'  // Any authenticated user
},

// Visible only to admins
admin: {
    label: 'Admin',
    url: '/admin/',
    role: 'admin'  // Admin users only
}
```

---

## Tabs Navigation

Navigation tabs are commonly used for organizing related pages within a section. The framework provides tab navigation for its pages (e.g., documentation, examples), and sites can add their own.

**Pattern:** Sites add their own tabs, they don't override framework tabs.

### Adding Custom Tabs

```javascript
// site/webapp/view/jpulse-navigation.js
window.jPulseNavigation.tabs.myFeatureTabs = {
    label: 'My Feature',
    tabs: {
        overview: {
            label: 'Overview',
            url: '/my-feature/',
            icon: '📊'
        },
        details: {
            label: 'Details',
            url: '/my-feature/details.shtml',
            icon: '📋'
        },
        settings: {
            label: 'Settings',
            url: '/my-feature/settings.shtml',
            icon: '⚙️'
        }
    }
};
```

Then use in your pages:

```handlebars
{{#if jPulseNavigation.tabs.myFeatureTabs}}
    {{ui.renderTabs jPulseNavigation.tabs.myFeatureTabs}}
{{/if}}
```

**Use Case:** Multi-page features benefit from tabs for easy navigation between related pages (dashboard, reports, analytics, settings, etc.).

---

## Troubleshooting

### Navigation Not Updating

1. Check file location: `site/webapp/view/jpulse-navigation.js`
2. Verify JavaScript syntax (check browser console for errors)
3. Restart application: `pm2 restart your-app`
4. Hard refresh browser: Ctrl+Shift+R (Cmd+Shift+R on Mac)

### Icons Not Showing

1. Emoji icons: Use standard Unicode emojis `icon: '📧'`
2. SVG icons: Use `_inline=true` parameter
3. Check browser console for component errors

---

## Best Practices

### 1. Minimize Customizations
Only modify what you need to change. Let framework defaults work when possible.

**Good:**
```javascript
// Only add what's needed
window.jPulseNavigation.site.marketing = { ... };
```

**Bad:**
```javascript
// Unnecessary duplication of framework sections
window.jPulseNavigation.site.admin = { ... };  // Framework already defines this
window.jPulseNavigation.site.auth = { ... };   // Framework already defines this
window.jPulseNavigation.site.marketing = { ... };
```

### 2. Consistent Naming
Follow framework naming conventions:

```javascript
// Good: kebab-case or camelCase
myDashboard: { ... }
my-reports: { ... }

// Bad: mixed or unclear
My_Dashboard: { ... }
reports1: { ... }
```

### 3. Document Custom Sections
Add comments explaining site-specific navigation:

```javascript
// Site-specific billing section
// Requires: billing role
// Pages: invoices, payment-methods, subscription
billing: {
    label: 'Billing',
    role: 'billing',
    pages: { ... }
}
```

---

## See Also

- [Handlebars Reference](handlebars.md) - Handlebars syntax and features
- [Template Reference](template-reference.md) - Template system overview
- [Style Reference](style-reference.md) - CSS styling for navigation

---

## Support

For questions or issues:
- Documentation: https://docs.jpulse.net
- GitHub Issues: https://github.com/jpulse-net/jpulse-framework/issues
- Email: team@jpulse.net
