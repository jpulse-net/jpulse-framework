# W-098: Site Navigation Override with Deep Merge

**Status:** Design Phase  
**Version:** v1.2.5 (Breaking Change)  
**Type:** Enhancement  
**Priority:** High

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

## Proposed Solution

### Architecture: Separate Framework + Site Navigation

Follow existing patterns:
- `jpulse-common.js` + `site-common.js`
- `jpulse-common.css` + `site-common.css`
- **New:** `jpulse-navigation.js` + `site-navigation.js`

### Key Design Decisions

#### 1. File Structure
```
webapp/view/
  jpulse-navigation.js.tmpl    ← Framework navigation (Handlebars processed)
  
site/webapp/view/
  site-navigation.js           ← Site overrides (optional, plain JS)
  site-navigation.js.tmpl      ← OR with Handlebars if i18n needed
```

**Why `.js.tmpl` → `.js`?**
- Framework already supports `.js.tmpl` fallback (W-047)
- Handlebars processing for i18n: `{{i18n.view.navigation.admin.config}}`
- Component support: `{{use.jpIcons.configSvg size="24" _inline=true}}`
- Cleaner than `<script>` embedded in `.tmpl` file

#### 2. Global Variable Names
```javascript
// Framework
window.jPulseNavigation = { ... };      // Renamed from jPulseSiteNavigation

// Site (new)
window.siteNavigation = { ... };        // Natural, intuitive name
```

**Why rename?**
- `jPulseSiteNavigation` is confusing (framework or site?)
- `jPulseNavigation` = framework-provided navigation
- `siteNavigation` = site-specific overrides
- Clear ownership and intent

#### 3. Deep Merge with Deletion Support

**Client-Side Deep Merge Implementation**
Add to `webapp/view/jpulse-common.js`:

```javascript
jPulse.utils.deepMerge = (...objects) => {
    // Recursively merge objects
    // null acts as deletion marker
    // Arrays are replaced, not merged
};
```

**Why client-side?**
- No API call overhead
- Works offline
- Simple, self-contained (~30 lines)
- Server-side `CommonUtils.deepMerge()` not accessible from browser

**Deletion Marker: `null`**
```javascript
window.siteNavigation = {
    jpulseExamples: null,  // ← Delete this section
    jpulseDocs: null       // ← Delete this section
};
```

**Why `null`?**
- Standard JavaScript/JSON convention
- Explicit and clear intent
- Minimal syntax
- Works recursively (can delete nested pages too)

#### 4. Include Pattern: Inline

**In `jpulse-header.tmpl`:**
```html
<!-- Framework navigation -->
<script>
{{file.include "jpulse-navigation.js"}}
</script>

<!-- Site navigation (if exists) -->
{{#if file.exists "site-navigation.js"}}
<script>
{{file.include "site-navigation.js"}}
</script>
{{/if}}
```

**Why inline vs `<script src>`?**
- ✅ No extra HTTP request
- ✅ No cache-busting parameter needed
- ✅ Already Handlebars-processed when included
- ✅ Simpler syntax

#### 5. Merge in Footer

**In `jpulse-footer.tmpl`:**
```javascript
jPulse.dom.ready(() => {
    // Deep merge framework + site navigation
    const mergedNav = jPulse.utils.deepMerge(
        window.jPulseNavigation || {},
        window.siteNavigation || {}
    );
    
    jPulse.UI.navigation.init({
        navigation: mergedNav,
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

### Example 1: Remove Framework Sections
```javascript
// site/webapp/view/site-navigation.js
window.siteNavigation = {
    // Remove demo sections not needed in production
    jpulseExamples: null,
    jpulseDocs: null
};
```

### Example 2: Add Custom Section
```javascript
window.siteNavigation = {
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
};
```

### Example 3: Extend Admin Section
```javascript
window.siteNavigation = {
    // Keep all framework admin pages, add site-specific page
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
};
```

### Example 4: Complete Real-World Site
```javascript
// site/webapp/view/site-navigation.js
window.siteNavigation = {
    // Remove framework demo sections
    jpulseExamples: null,
    jpulseDocs: null,
    
    // Add marketing section
    marketing: {
        label: 'Marketing',
        url: '/marketing/',
        pages: {
            features: { label: 'Features', url: '/features/' },
            pricing: { label: 'Pricing', url: '/pricing/' }
        }
    },
    
    // Add dashboard section
    dashboard: {
        label: 'Dashboard',
        url: '/dashboard/',
        role: 'user',  // Visible to all authenticated users
        icon: '📊',
        pages: {
            overview: { label: 'Overview', url: '/dashboard/' },
            reports: { label: 'Reports', url: '/dashboard/reports.shtml' },
            analytics: { label: 'Analytics', url: '/dashboard/analytics.shtml' }
        }
    },
    
    // Extend admin with site-specific pages
    admin: {
        pages: {
            contacts: {
                label: 'Contacts',
                url: '/admin/contacts.shtml',
                icon: '📧'
            }
        }
    }
};
```

---

## Breaking Changes

### For Framework
1. **Global Variable Renamed**
   - Old: `window.jPulseSiteNavigation`
   - New: `window.jPulseNavigation`

2. **File Renamed**
   - Old: `webapp/view/jpulse-navigation.tmpl`
   - New: `webapp/view/jpulse-navigation.js.tmpl`

3. **Footer Init Changed**
   - Old: Direct reference to `window.jPulseSiteNavigation`
   - New: Deep merge of framework + site navigation

### For Sites
1. **Must Create New File for Overrides**
   - Old: Override entire `site/webapp/view/jpulse-navigation.tmpl`
   - New: Create `site/webapp/view/site-navigation.js` with overrides only

2. **Different Structure**
   - Old: Full navigation tree with all framework sections
   - New: Only specify additions, changes, and deletions

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
- ✅ Clear separation of framework vs site concerns
- ✅ Easier to add new framework navigation sections

### For Site Developers
- ✅ Only specify what changes from framework defaults
- ✅ Explicit deletion of unwanted sections
- ✅ Automatic framework navigation updates
- ✅ Consistent with app.conf and CSS patterns
- ✅ Less code to maintain
- ✅ Clear intent (additions, changes, deletions)

### Real-World Impact
**Before (jpulse.net):**
- 16KB override file with full navigation tree
- Manual merge required on every framework update
- Missed updates led to stale navigation

**After:**
- ~2KB override file with only site-specific sections
- Automatic framework updates
- No manual merging needed

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

