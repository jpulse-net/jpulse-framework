# jPulse Framework / Docs / Site Navigation Guide v1.2.5

Complete guide to customizing site navigation in the jPulse Framework using deep merge and override patterns.

---

## Overview

The jPulse Framework provides a flexible navigation system that separates framework-provided navigation from site-specific customizations. This allows sites to:

- ✅ Keep framework navigation updated automatically
- ✅ Add custom navigation sections
- ✅ Extend framework sections with site-specific pages
- ✅ Remove unwanted framework sections
- ✅ Override labels, icons, or URLs

## Navigation Structure

The jPulse navigation system uses two global JavaScript objects:

### Framework Navigation
```javascript
// Defined in: webapp/view/jpulse-navigation.js
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

### Site Navigation Override
```javascript
// Optional: site/webapp/view/site-navigation.js
window.siteNavigation = {
    site: {     // Your site-specific changes
        // additions, modifications, deletions
    },
    tabs: {     // Your custom tabs (optional)
        // custom tab structures
    }
};
```

### Merge Process

At runtime, the framework automatically merges both navigation structures:

```javascript
// In jpulse-footer.tmpl
const mergedNav = jPulse.utils.deepMerge(
    window.jPulseNavigation || {},
    window.siteNavigation || {}
);
```

---

## Deep Merge Behavior

The merge uses recursive object merging with these rules:

1. **Add**: New keys in `siteNavigation` are added
2. **Override**: Matching keys replace framework values
3. **Delete**: Set any key to `null` to remove it
4. **Nested**: Works recursively for nested objects
5. **Arrays**: Arrays are replaced, not merged

### Example: Deep Merge in Action

```javascript
// Framework navigation
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

// Site override
window.siteNavigation = {
    site: {
        admin: {
            // Keeps: label, config, users
            // Adds: contacts
            pages: {
                contacts: { label: 'Contacts', url: '/admin/contacts.shtml' }
            }
        },
        jpulseExamples: null,  // Remove this section
        marketing: { ... }      // Add new section
    }
};

// Result after merge
mergedNav = {
    site: {
        admin: {
            label: 'Admin',        // Kept from framework
            pages: {
                config: { ... },   // Kept from framework
                users: { ... },    // Kept from framework
                contacts: { ... }  // Added from site
            }
        },
        // jpulseExamples removed
        marketing: { ... }         // Added from site
    }
};
```

---

## Common Patterns

### Pattern 1: Remove Framework Sections

Remove sections you don't need in production:

```javascript
// site/webapp/view/site-navigation.js
window.siteNavigation = {
    site: {
        jpulseDocs: null,      // Remove documentation section
        jpulseExamples: null   // Remove examples section
    }
};
```

**Use Case:** Production sites don't need framework demo sections.

---

### Pattern 2: Add Custom Navigation Section

Add your own top-level navigation section:

```javascript
window.siteNavigation = {
    site: {
        marketing: {
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
        }
    }
};
```

**Use Case:** Marketing sites with custom sections.

---

### Pattern 3: Extend Framework Admin Section

Add site-specific pages to the framework admin section:

```javascript
window.siteNavigation = {
    site: {
        admin: {
            pages: {
                contacts: {
                    label: 'Contacts',
                    url: '/admin/contacts.shtml',
                    icon: '📧'
                },
                billing: {
                    label: 'Billing',
                    url: '/admin/billing.shtml',
                    icon: '💳'
                },
                reports: {
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
                }
            }
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
window.siteNavigation = {
    site: {
        auth: {
            label: 'Account',      // Override framework label
            icon: '👤'             // Override framework icon
            // url stays as framework default
        },
        admin: {
            icon: '🛠️'             // Override admin icon
            // label, url, pages stay as framework defaults
        }
    }
};
```

**Use Case:** Customize framework sections to match your site's branding.

---

### Pattern 5: Remove Nested Pages

Remove specific pages within a section:

```javascript
window.siteNavigation = {
    site: {
        admin: {
            pages: {
                websocket: null    // Remove websocket admin page
            }
        }
    }
};
```

**Use Case:** Hide specific admin features not relevant to your site.

---

### Pattern 6: Complete Real-World Example

Typical production site configuration:

```javascript
// site/webapp/view/site-navigation.js
window.siteNavigation = {
    site: {
        // Remove framework demo sections
        jpulseDocs: null,
        jpulseExamples: null,

        // Add site dashboard
        dashboard: {
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
        },

        // Add marketing section
        marketing: {
            label: 'Marketing',
            url: '/marketing/',
            pages: {
                features: { label: 'Features', url: '/features/' },
                pricing: { label: 'Pricing', url: '/pricing/' },
                about: { label: 'About', url: '/about/' }
            }
        },

        // Extend admin with site pages
        admin: {
            pages: {
                contacts: {
                    label: 'Contacts',
                    url: '/admin/contacts.shtml',
                    icon: '📧'
                },
                billing: {
                    label: 'Billing',
                    url: '/admin/billing.shtml',
                    icon: '💳'
                }
            }
        }
    }
};
```

---

## File Setup

### Step 1: Create Site Navigation File

Create one of these (choose based on whether you need i18n):

**Option A: Plain JavaScript** (no i18n needed)
```bash
site/webapp/view/site-navigation.js
```

**Option B: Handlebars Template** (with i18n support)
```bash
site/webapp/view/site-navigation.js.tmpl
```

### Step 2: Use the Template

Start with the provided template:

```bash
# Copy the example template
cp site/webapp/view/site-navigation.js.tmpl \
   site/webapp/view/site-navigation.js

# Edit to add your customizations
vi site/webapp/view/site-navigation.js
```

### Step 3: Test Your Changes

1. Restart your application
2. Check the site navigation pulldown menu
3. Check breadcrumbs navigation
4. Verify role-based visibility
5. Test on mobile (hamburger menu)

---

## Internationalization (i18n)

If you need translated labels, use `.js.tmpl` extension and Handlebars i18n syntax:

```javascript
// site/webapp/view/site-navigation.js.tmpl
window.siteNavigation = {
    site: {
        admin: {
            pages: {
                contacts: {
                    label: '{{i18n.view.navigation.admin.contacts}}',  // i18n reference
                    url: '/admin/contacts.shtml',
                    icon: '📧'
                }
            }
        }
    }
};
```

Then add translations:

```ini
# webapp/translations/en.conf
[view.navigation.admin]
contacts = "Contacts"

# webapp/translations/de.conf
[view.navigation.admin]
contacts = "Kontakte"
```

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

### Example with All Properties

```javascript
mySection: {
    label: 'My Section',                // Required
    url: '/my-section/',                // Optional
    icon: '🚀',                         // Optional
    role: 'user',                       // Optional (visible to role only)
    pages: {                            // Optional (nested pages)
        page1: {
            label: 'Page 1',
            url: '/my-section/page1.shtml'
        }
    }
}
```

---

## Icons

You can use emojis or SVG components for icons:

### Emoji Icons
```javascript
icon: '📊'    // Simple emoji
icon: '🔥'    // Unicode emoji
```

### SVG Component Icons
```javascript
// Framework SVG components (from webapp/view/components/svg-icons.tmpl)
icon: '{{use.jpIcons.configSvg size="24" _inline=true}}'
icon: '{{use.jpIcons.usersSvg size="24" _inline=true}}'
icon: '{{use.jpIcons.logsSvg size="24" _inline=true}}'

// Custom site SVG components
icon: '{{use.siteIcons.customIcon size="24" _inline=true}}'
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

## Tabs Navigation (Advanced)

Most sites don't need custom tabs navigation. The framework handles tabs automatically for its pages. Only override if you need custom tab structures:

```javascript
window.siteNavigation = {
    tabs: {
        myCustomTabs: {
            label: 'My Features',
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
        }
    }
};
```

Then use in your page:

```handlebars
{{#if jPulseNavigation.tabs.myCustomTabs}}
    {{ui.renderTabs jPulseNavigation.tabs.myCustomTabs}}
{{/if}}
```

---

## Troubleshooting

### Navigation Not Updating

**Problem:** Site navigation doesn't show your changes.

**Solutions:**
1. Check file location: `site/webapp/view/site-navigation.js`
2. Verify syntax: Valid JavaScript object
3. Restart application: `pm2 restart your-app`
4. Clear browser cache: Hard refresh (Ctrl+Shift+R)

### Merge Not Working

**Problem:** Site overrides not merging correctly.

**Check:**
1. Object structure matches framework structure
2. Using `null` for deletions (not `undefined`)
3. No syntax errors in your file
4. File is being included (check browser console)

### Icons Not Showing

**Problem:** Icons appear as text or broken.

**Check:**
1. Emoji icons: Use standard Unicode emojis
2. SVG icons: Use `_inline=true` parameter
3. Custom SVG components: Verify component exists
4. Check browser console for errors

### Role-Based Visibility Not Working

**Problem:** Users seeing navigation they shouldn't.

**Check:**
1. Role property set correctly: `role: 'admin'`
2. User has correct role assigned
3. Check `{{user.roles}}` in template
4. Verify authentication working

---

## Migration from Old Pattern

If you have an old site override file (`site/webapp/view/jpulse-navigation.tmpl`), migrate to the new pattern:

### Old Pattern (Before W-098)
```javascript
// site/webapp/view/jpulse-navigation.tmpl
// Complete replacement of framework navigation
window.jPulseSiteNavigation = {
    // Had to duplicate ALL framework sections
    admin: { ... },
    jpulseDocs: { ... },  // Even if not needed
    jpulseExamples: { ... },  // Even if not wanted
    // Plus custom sections
    mySection: { ... }
};
```

### New Pattern (W-098+)
```javascript
// site/webapp/view/site-navigation.js
// Only specify changes from framework
window.siteNavigation = {
    site: {
        jpulseDocs: null,        // Remove (wasn't needed)
        jpulseExamples: null,    // Remove (wasn't wanted)
        mySection: { ... }       // Add custom section
    }
};
```

### Migration Steps

1. **Backup old file**
   ```bash
   mv site/webapp/view/jpulse-navigation.tmpl \
      site/webapp/view/jpulse-navigation.tmpl.backup
   ```

2. **Create new override file**
   ```bash
   cp site/webapp/view/site-navigation.js.tmpl \
      site/webapp/view/site-navigation.js
   ```

3. **Extract site-specific sections**
   - Open backup file
   - Identify custom sections (not in framework)
   - Copy only custom sections to new file
   - Add `null` deletions for unwanted framework sections

4. **Test thoroughly**
   - Restart application
   - Verify all navigation items
   - Check role-based visibility
   - Test on mobile

---

## Best Practices

### 1. Minimize Overrides
Only override what you need to change. Let framework defaults work when possible.

**Good:**
```javascript
window.siteNavigation = {
    site: {
        marketing: { ... }  // Only add what's needed
    }
};
```

**Bad:**
```javascript
window.siteNavigation = {
    site: {
        admin: { ... },     // Unnecessary duplication
        auth: { ... },      // of framework sections
        marketing: { ... }
    }
};
```

### 2. Use i18n for Labels
Support internationalization from the start:

```javascript
// Good: i18n ready
label: '{{i18n.view.navigation.mySection}}'

// Bad: hardcoded
label: 'My Section'
```

### 3. Consistent Naming
Follow framework naming conventions:

```javascript
// Good: kebab-case or camelCase
myDashboard: { ... }
my-reports: { ... }

// Bad: mixed or unclear
My_Dashboard: { ... }
reports1: { ... }
```

### 4. Document Custom Sections
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
