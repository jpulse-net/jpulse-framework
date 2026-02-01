# W-098: Site Navigation Override with Append Mode

**Status:** Implementation Phase
**Version:** v1.2.5 (Breaking Change)
**Type:** Enhancement
**Priority:** High

**Design Evolution:** Option 7 - Append Mode + Direct Mutation (No deepMerge)

---

## Problem Statement

Current navigation override requires sites to completely replace `jpulse-navigation.tmpl`, which:
- Forces duplication of entire framework navigation structure
- Makes framework updates difficult (manual merge required)
- No way to selectively add/remove/extend navigation sections
- Doesn't follow the established deep-merge pattern used in `app.conf` and CSS

### Real-World Use Case (jpulse.net)
jpulse.net encountered this problem:
- Site override: 16KB `site/webapp/view/jpulse-navigation.tmpl` (Nov 21)
- Framework update: 13KB `webapp/view/jpulse-navigation.tmpl` (Nov 23)
- **Result:** Site still showed old navigation after deployment + pm2 restart
- **Root cause:** Site override completely replaced framework file

### Typical Site Needs
- ✅ Keep framework admin section (`/admin/*`)
- ✅ Add site-specific admin pages (e.g., `/admin/contacts.shtml`)
- ✅ Add custom sections (e.g., marketing, dashboard)
- ❌ Remove framework demo sections (`jpulseDocs`, `jpulseExamples`)
- ❌ No way to do this without full file override currently

---

## Design Evolution

### Original Approach (Rejected)
**Problem:** Two namespaces (`jPulseNavigation` + `siteNavigation`) + explicit merge
**Issue:** Inconsistent with existing CSS/JS patterns, added complexity

### Final Solution: Option 7 - Append Mode + Direct Mutation

**Key Insight:** Follow the established pattern for CSS and JS files:
- `jpulse-common.css` + `jpulse-common.css` (site) → Concatenated/appended
- `jpulse-common.js` + `jpulse-common.js` (site) → Concatenated/appended
- **Same for navigation:** `jpulse-navigation.js` + `jpulse-navigation.js` (site) → Concatenated/appended

### Core Principles

1. **Same Filenames Everywhere**
   - Framework: `jpulse-navigation.js`
   - Site: `jpulse-navigation.js` (appended)
   - Plugins: `jpulse-navigation.js` (appended) - future W-045

2. **Same Namespace**
   - Always `window.jPulseSiteNavigation`
   - Always `window.jPulseTabsNavigation`
   - No merge, no second namespace

3. **Append by Convention**
   - `.js` files → Append (concatenate)
   - `.css` files → Append (concatenate)
   - `.shtml` files → Replace (override)
   - Convention over configuration

4. **Direct Mutation Pattern**
   - Framework defines base object
   - Site directly mutates/augments object
   - Natural JavaScript pattern

---

## Proposed Solution

### Architecture: Append Mode for JS/CSS Files

#### 1. File Structure
```
webapp/view/
  jpulse-common.css.tmpl       ← Framework styles
  jpulse-common.js.tmpl        ← Framework JavaScript
  jpulse-navigation.js.tmpl    ← Framework navigation

site/webapp/view/
  jpulse-common.css.tmpl       ← Site styles (APPENDED)
  jpulse-common.js.tmpl        ← Site JavaScript (APPENDED)
  jpulse-navigation.js.tmpl    ← Site navigation (APPENDED)
```

**Same filenames = clean, consistent, plugin-ready**

#### 2. Append Mode Resolution

**PathResolver Enhancement:**
```javascript
// For .js and .css files: collect ALL matching files
static collectAllFiles(modulePath) {
    const files = [];

    // 1. Framework (always first)
    const frameworkPath = path.join(appDir, modulePath);
    if (fs.existsSync(frameworkPath)) files.push(frameworkPath);

    // 2. Site override (appended if exists)
    const sitePath = path.join(siteDir, modulePath);
    if (fs.existsSync(sitePath)) files.push(sitePath);

    // 3. Future: Plugin files (W-045)
    // for (const plugin of activePlugins) { ... }

    return files;
}
```

**ViewController Integration:**
```javascript
const fileExt = path.extname(filePath).toLowerCase();

if (['.js', '.css'].includes(fileExt)) {
    // Append mode: concatenate all matching files
    const files = PathResolver.collectAllFiles(relativePath);
    let combined = '';
    for (const file of files) {
        combined += await fs.readFile(file, 'utf8') + '\n';
    }
    // Handlebars process the combined content
    res.send(await HandlebarController.expandHandlebars(req, combined));
} else {
    // Replace mode: single file resolution
    const resolved = PathResolver.resolveModule(relativePath);
    res.sendFile(resolved);
}
```

#### 3. Direct Mutation Pattern

**Framework** (`webapp/view/jpulse-navigation.js.tmpl`):
```javascript
// Define base navigation structure
window.jPulseSiteNavigation = {
    admin: {
        label: 'Admin',
        pages: {
            config: { label: 'Config', url: '/admin/config.shtml' },
            users: { label: 'Users', url: '/admin/users.shtml' },
            logs: { label: 'Logs', url: '/admin/logs.shtml' }
        }
    },
    jpulseDocs: { label: 'Documentation', url: '/jpulse-docs/' },
    jpulseExamples: { label: 'Examples', url: '/jpulse-examples/' }
};

window.jPulseTabsNavigation = {
    // Tabs definitions...
};
```

**Site** (`site/webapp/view/jpulse-navigation.js.tmpl` - appended):
```javascript
// File is APPENDED to framework file
// Direct mutation of existing object - explicit and clear

// Add new admin page
window.jPulseSiteNavigation.admin.pages.contacts = {
    label: 'Contacts',
    url: '/admin/contacts.shtml',
    icon: '📧'
};

// Add new section
window.jPulseSiteNavigation.marketing = {
    label: 'Marketing',
    url: '/marketing/',
    pages: {
        features: { label: 'Features', url: '/features/' },
        pricing: { label: 'Pricing', url: '/pricing/' }
    }
};

// Remove unwanted sections (null marker)
window.jPulseSiteNavigation.jpulseDocs = null;
window.jPulseSiteNavigation.jpulseExamples = null;
```

**Navigation Renderer** (handles null):
```javascript
// In jpulse-common.js navigation renderer
for (const [key, item] of Object.entries(navStructure)) {
    if (item === null) continue;  // Skip null sections
    // Render item...
}
```

#### 4. Include Pattern

**In `jpulse-header.tmpl`:**
```html
<!-- Single script tag, PathResolver handles append mode -->
<script>
{{file.include "jpulse-navigation.js"}}
</script>
```

**That's it!** PathResolver automatically:
1. Finds framework `jpulse-navigation.js.tmpl`
2. Finds site `jpulse-navigation.js.tmpl` (if exists)
3. Concatenates both
4. Handlebars processes combined content
5. Returns to browser

#### 5. No Merge Needed

**In `jpulse-footer.tmpl`:**
```javascript
jPulse.dom.ready(() => {
    // Use navigation directly - already augmented by site code
    jPulse.UI.navigation.init({
        navigation: window.jPulseSiteNavigation,  // Already complete!
        // ... rest
    });
});
```

---

## Implementation Details

### File Changes

**Create:**
1. `webapp/view/jpulse-navigation.js.tmpl`
   - Rename from `jpulse-navigation.tmpl`
   - Change `window.jPulseSiteNavigation` → `window.jPulseNavigation`
   - Keep all existing i18n and component references

2. `webapp/view/jpulse-common.js`
   - Add `jPulse.utils.deepMerge()` function

3. `docs/navigation-override-guide.md`
   - How-to guide for sites
   - Examples of common patterns

4. `docs/site-navigation-template.js`
   - Starter template with examples

**Modify:**
1. `webapp/view/jpulse-header.tmpl`
   - Add inline script includes (replace old `<script src>` if exists)

2. `webapp/view/jpulse-footer.tmpl`
   - Change from `window.jPulseSiteNavigation` to merge pattern

**Delete:**
1. `webapp/view/jpulse-navigation.tmpl` (renamed to `.js.tmpl`)

### Deep Merge Implementation

```javascript
/**
 * Deep merge objects (client-side implementation)
 * Recursively merges objects, with null acting as deletion marker
 * Arrays are replaced, not merged
 *
 * @param {...object} objects - Objects to merge
 * @returns {object} Merged object
 */
jPulse.utils.deepMerge = (...objects) => {
    if (objects.length === 0) return {};
    if (objects.length === 1) return objects[0];

    const _deepMergeRecursive = (target, objects, seen) => {
        for (const obj of objects) {
            if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                if (seen.has(obj)) continue;
                seen.add(obj);

                for (const [key, value] of Object.entries(obj)) {
                    // null acts as deletion marker
                    if (value === null) {
                        delete target[key];
                        continue;
                    }

                    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                        // Recursively merge nested objects
                        target[key] = _deepMergeRecursive(target[key] || {}, [value], seen);
                    } else {
                        // Replace primitive values, arrays, and Date objects
                        target[key] = value;
                    }
                }

                seen.delete(obj);
            }
        }
        return target;
    };

    return _deepMergeRecursive({}, objects, new WeakSet());
};
```

---

## Usage Examples

All examples show **site** file (`site/webapp/view/jpulse-navigation.js.tmpl`), which is **appended** to the framework file.

### Example 1: Remove Framework Sections
```javascript
// File: site/webapp/view/jpulse-navigation.js.tmpl (appended to framework)
// Direct mutation - explicit and clear

// Remove demo sections not needed in production
window.jPulseSiteNavigation.jpulseExamples = null;
window.jPulseSiteNavigation.jpulseDocs = null;
```

### Example 2: Add Custom Section
```javascript
// File: site/webapp/view/jpulse-navigation.js.tmpl (appended to framework)

// Add new top-level section
window.jPulseSiteNavigation.marketing = {
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

### Example 3: Extend Admin Section
```javascript
// File: site/webapp/view/jpulse-navigation.js.tmpl (appended to framework)

// Add pages to existing admin section (framework pages are kept)
window.jPulseSiteNavigation.admin.pages.contacts = {
    label: 'Contacts',
    url: '/admin/contacts.shtml',
    icon: '📧'
};

window.jPulseSiteNavigation.admin.pages.billing = {
    label: 'Billing',
    url: '/admin/billing.shtml',
    icon: '💳'
};
```

### Example 4: Complete Real-World Site
```javascript
// File: site/webapp/view/jpulse-navigation.js.tmpl (appended to framework)
// Everything is explicit - you can see exactly what changes

// Remove framework demo sections
window.jPulseSiteNavigation.jpulseExamples = null;
window.jPulseSiteNavigation.jpulseDocs = null;

// Add marketing section
window.jPulseSiteNavigation.marketing = {
    label: 'Marketing',
    url: '/marketing/',
    pages: {
        features: { label: 'Features', url: '/features/' },
        pricing: { label: 'Pricing', url: '/pricing/' }
    }
};

// Add dashboard section
window.jPulseSiteNavigation.dashboard = {
    label: 'Dashboard',
    url: '/dashboard/',
    role: 'user',  // Visible to all authenticated users
    icon: '📊',
    pages: {
        overview: { label: 'Overview', url: '/dashboard/' },
        reports: { label: 'Reports', url: '/dashboard/reports.shtml' },
        analytics: { label: 'Analytics', url: '/dashboard/analytics.shtml' }
    }
};

// Extend admin with site-specific pages
window.jPulseSiteNavigation.admin.pages.contacts = {
    label: 'Contacts',
    url: '/admin/contacts.shtml',
    icon: '📧'
};

// Override admin label (optional)
window.jPulseSiteNavigation.admin.label = 'Administration';
```

### Example 5: Using delete Operator
```javascript
// Alternative to null: actually remove the property
delete window.jPulseSiteNavigation.jpulseExamples;
delete window.jPulseSiteNavigation.jpulseDocs;

// Both null and delete work - navigation renderer checks for null
```

---

## Breaking Changes

### For Framework
1. **File Renamed**
   - Old: `webapp/view/jpulse-navigation.tmpl`
   - New: `webapp/view/jpulse-navigation.js.tmpl`

2. **Global Variables** (NO CHANGE)
   - Still: `window.jPulseSiteNavigation`
   - Still: `window.jPulseTabsNavigation`

3. **Footer Init** (NO CHANGE)
   - Still: Direct reference to `window.jPulseSiteNavigation`
   - No merge needed!

### For Sites
1. **File Naming Change**
   - Old: `site/webapp/view/jpulse-navigation.tmpl` (override entire file)
   - New: `site/webapp/view/jpulse-navigation.js.tmpl` (appended to framework)

2. **Pattern Change** (Simpler!)
   - Old: Duplicate entire navigation structure
   - New: Direct mutation of framework object

**Example Migration:**
```javascript
// OLD: site/webapp/view/jpulse-navigation.tmpl (complete override)
window.jPulseSiteNavigation = {
    admin: { ...duplicate framework... },
    mySection: { ...site-specific... }
};

// NEW: site/webapp/view/jpulse-navigation.js.tmpl (appended, direct mutation)
window.jPulseSiteNavigation.mySection = { ...site-specific... };
window.jPulseSiteNavigation.jpulseExamples = null; // Remove
```

---

## Migration Path

### Pre-Customers: Clean Break (v1.2.5)
Since no paying customers yet, do a clean breaking change:

1. **Framework Update** (Done in one release)
   - Rename `jpulse-navigation.tmpl` → `jpulse-navigation.js.tmpl`
   - Change global var `jPulseSiteNavigation` → `jPulseNavigation`
   - Add `jPulse.utils.deepMerge()` to `jpulse-common.js`
   - Update header/footer includes and merge logic

2. **Site Migration** (Per site)
   ```bash
   # Backup old override
   mv site/webapp/view/jpulse-navigation.tmpl \
      site/webapp/view/jpulse-navigation.tmpl.backup

   # Create new site-navigation.js with only overrides
   # Extract site-specific sections from backup
   vi site/webapp/view/site-navigation.js
   ```

3. **Test & Validate**
   - Verify navigation renders correctly
   - Check framework sections visible
   - Confirm site sections added
   - Verify deleted sections removed

### Migration for jpulse.net
jpulse.net has complex override with:
- Framework sections (admin, docs, examples)
- Custom sections (marketing pages)

**Extract site-specific parts:**
```javascript
// site/webapp/view/site-navigation.js
window.siteNavigation = {
    // jpulse.net keeps all framework sections (docs, examples)
    // Just add marketing section
    marketing: {
        // ... jpulse.net specific marketing pages
    }
};
```

---

## Documentation Updates

### New Documentation
1. **`docs/navigation-override-guide.md`**
   - Complete guide to customizing site navigation
   - Common patterns and examples
   - Deep merge behavior explanation
   - Deletion marker usage
   - Troubleshooting

2. **`docs/site-navigation-template.js`**
   - Commented starter template
   - Copy-paste ready examples

### Updated Documentation
1. **`docs/template-reference.md`**
   - Update navigation override section
   - New file structure and pattern
   - Migration notes

2. **`docs/CHANGELOG.md`**
   - Breaking change announcement
   - Migration instructions
   - Benefits of new approach

3. **`README.md`**
   - Update navigation customization mention

---

## Benefits

### For Framework Maintainers
- ✅ Sites no longer block navigation updates
- ✅ Consistent with CSS/JS override pattern
- ✅ Plugin-ready architecture (W-045)
- ✅ Simple, understandable pattern

### For Site Developers
- ✅ **Same filenames** everywhere (jpulse-navigation.js)
- ✅ **Direct mutation** - explicit, JavaScript-idiomatic
- ✅ **No hidden complexity** - no merge function
- ✅ **Automatic framework updates** - append mode
- ✅ **Clear intent** - see exactly what changes
- ✅ **Less code** - only specify changes

### Real-World Impact
**Before (jpulse.net):**
- 16KB override file (complete navigation tree)
- Different filename (site override)
- Manual merge on every framework update
- Missed updates led to stale navigation

**After:**
- ~2KB file (only site changes)
- Same filename (jpulse-navigation.js)
- Automatic framework updates via append
- Direct mutation - clear and explicit

### Consistency Across Framework
**Before W-098:**
- CSS: `jpulse-common.css` + `site-common.css` ← Different names
- JS: `jpulse-common.js` + `site-common.js` ← Different names
- Nav: `jpulse-navigation.tmpl` + override entire file ← Inconsistent!

**After W-098:**
- CSS: `jpulse-common.css` + `jpulse-common.css` (site) ← Same name, appended
- JS: `jpulse-common.js` + `jpulse-common.js` (site) ← Same name, appended
- Nav: `jpulse-navigation.js` + `jpulse-navigation.js` (site) ← **Same name, appended!**

### Plugin Architecture Ready (W-045)
```
Framework:  webapp/view/jpulse-common.js
Site:       site/webapp/view/jpulse-common.js (appended)
Plugin 1:   plugins/oauth2/webapp/view/jpulse-common.js (appended)
Plugin 2:   plugins/analytics/webapp/view/jpulse-common.js (appended)

Result: All concatenated in order
```
**No namespace collisions!** Each file uses same global objects.

---

## Testing Plan

### Unit Tests
1. `jPulse.utils.deepMerge()` function
   - Basic merge (add, override)
   - Deletion with `null`
   - Nested object merge
   - Array replacement
   - Circular reference protection

2. Navigation rendering
   - Framework-only navigation
   - Site override additions
   - Site override deletions
   - Mixed operations

### Integration Tests
1. Site navigation loads correctly
2. Framework sections render
3. Site sections render
4. Deleted sections don't render
5. Role-based visibility still works
6. i18n translations work in both files

### Manual Testing
1. Fresh install (no site override)
2. Site with additions only
3. Site with deletions only
4. Site with complex mixed operations
5. jpulse.net migration

---

## Open Questions

1. ~~Should we support `.js` vs `.js.tmpl` for sites?~~
   - **Decision:** Support both. Sites choose based on i18n needs.

2. ~~Should deletion marker be `null` or `{ _enabled: false }`?~~
   - **Decision:** `null` (standard JavaScript convention)

3. ~~Inline include or `<script src>`?~~
   - **Decision:** Inline with `{{file.include}}` (fewer HTTP requests)

4. ~~Breaking change in v1.2.5 or wait for v1.3.0?~~
   - **Decision:** v1.2.5 (pre-customers, clean slate)

---

## Implementation Checklist

### Phase 1: Core Implementation
- [ ] Create `jpulse-navigation.js.tmpl` (rename from `.tmpl`)
- [ ] Add `jPulse.utils.deepMerge()` to `jpulse-common.js`
- [ ] Update `jpulse-header.tmpl` (inline includes)
- [ ] Update `jpulse-footer.tmpl` (merge logic)
- [ ] Delete old `jpulse-navigation.tmpl`

### Phase 2: Documentation
- [ ] Create `docs/navigation-override-guide.md`
- [ ] Create `docs/site-navigation-template.js`
- [ ] Update `docs/template-reference.md`
- [ ] Update `docs/CHANGELOG.md`
- [ ] Update `README.md`

### Phase 3: Testing
- [ ] Unit tests for `deepMerge()`
- [ ] Integration tests for navigation rendering
- [ ] Manual testing with various override patterns

### Phase 4: Migration
- [ ] Migrate jpulse.net
- [ ] Migrate bubblemap.net
- [ ] Verify all sites working

### Phase 5: Release
- [ ] Update `docs/dev/work-items.md`
- [ ] Create commit message
- [ ] Update cursor_log.txt
- [ ] Tag release v1.2.5

---

## Estimated Effort

- **Implementation:** 4-6 hours
- **Documentation:** 2-3 hours
- **Testing:** 2-3 hours
- **Migration:** 1-2 hours per site
- **Total:** ~10-15 hours

---

## Related Work Items

- W-047: Site override support for CSS/JS files
- W-014: Site override path resolution
- W-069: Site navigation implementation
- W-097: Handlebars reusable components (used in navigation icons)

---

## Notes

- Pre-customer phase allows clean breaking change
- Follows established patterns (app.conf, CSS)
- Client-side deep merge avoids API overhead
- Inline includes reduce HTTP requests
- Clear naming improves developer experience
- Real-world problem solved (jpulse.net case)
