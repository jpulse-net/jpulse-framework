# W-102: Replace extract:start/end with Component Handlebar

**Work Item:** W-102
**Status:** 🕑 PENDING
**Type:** Feature Enhancement
**Objective:** Improve framework consistency and usability

## Background

The current `extract:start/end` marker system and the `{{#component}}` system fundamentally do the same thing - define reusable content blocks. This creates unnecessary cognitive overhead and inconsistent patterns.

**Current Issues:**
- Two different systems for similar functionality
- HTML comments hidden in `<div style="display: none;">` are awkward
- Non-obvious "magic" syntax with comment markers
- Doesn't leverage existing component infrastructure

## Proposal

Unify the two systems by using `{{#component}}` for dashboard card definitions and making components available as context variables, eliminating `extract:start/end` markers entirely.

### Current Syntax

**Dashboard card definition:**
```html
<div style="display: none;">
    <!-- extract:start order=10 -->
    <a href="/admin/config.shtml" class="jp-card-dashboard jp-icon-btn">
        <div class="jp-icon-container">{{use.jpIcons.configSvg size="64"}}</div>
        <h3 class="jp-card-title">{{i18n.view.admin.index.siteConfig}}</h3>
        <p class="jp-card-description">{{i18n.view.admin.index.siteConfigDesc}}</p>
    </a>
    <!-- extract:end -->
</div>
```

**Dashboard index:**
```handlebars
{{#each file.list "admin/*.shtml" sortBy="extract-order"}}
    {{file.extract this}}
{{/each}}
```

### Proposed Syntax

**Dashboard card definition:**
```handlebars
{{#component "adminCards.config" order=10}}
    {{!-- This card is automatically included in the admin dashboard --}}
    <a href="/admin/config.shtml" class="jp-card-dashboard jp-icon-btn">
        <div class="jp-icon-container">{{components.jpIcons.configSvg size="64"}}</div>
        <h3 class="jp-card-title">{{i18n.view.admin.index.siteConfig}}</h3>
        <p class="jp-card-description">{{i18n.view.admin.index.siteConfigDesc}}</p>
    </a>
{{/component}}
```

**Component registration (in jpulse-header.tmpl or dashboard page):**
```handlebars
{{file.includeComponents "admin/*.shtml" component="adminCards.*"}}
```

**Dashboard index:**
```handlebars
<div class="jp-dashboard-grid">
    {{#each components.adminCards}}
        {{this}}
    {{/each}}
</div>
```

### Complete Examples

**Admin Dashboard:**
```handlebars
<!-- In jpulse-header.tmpl or admin/index.shtml -->
{{file.includeComponents "admin/*.shtml" component="adminCards.*"}}

<div class="jp-dashboard-grid">
    {{#each components.adminCards}}
        {{this}}
    {{/each}}
</div>
```

**Plugin Dashboard:**
```handlebars
<!-- In jpulse-header.tmpl or jpulse-plugins/index.shtml -->
{{file.includeComponents "jpulse-plugins/*.shtml" component="pluginCards.*" sortBy="plugin-order"}}

<div class="jp-card-grid">
    {{#each components.pluginCards}}
        {{this}}
    {{/each}}
</div>
```

**Using Single Component:**
```handlebars
<!-- Components available anywhere after registration -->
<h1>{{components.jpIcons.configSvg size="32"}} Configuration</h1>
{{components.adminCards.config}}
```

## Benefits

1. **Conceptual Unification**: One system instead of two - less to learn and maintain
2. **"Don't Make Me Think"**: Components accessed like any other context variable (`{{components.*}}` like `{{user.*}}` or `{{config.*}}`)
3. **Better Developer Experience**: Proper Handlebars syntax with highlighting and validation
4. **Less "Magic"**: Explicit component definitions vs. hidden HTML comments
5. **More Flexible**: Leverage full component system (namespacing, parameters, error handling)
6. **Cleaner Code**: No awkward `<div style="display: none;">` wrappers
7. **Consistent Pattern**: `{{#each components.namespace}}` uses same pattern as `{{#each users}}`

## Implementation Details

### 1. Add `file.includeComponents` Helper

New helper for registering components from multiple files:

```javascript
// In webapp/controller/handlebar.js:

case 'file.includeComponents':
    return await _handleFileIncludeComponents(parsedArgs, currentContext);

async function _handleFileIncludeComponents(parsedArgs, currentContext) {
    const globPattern = parsedArgs._target;
    const componentFilter = parsedArgs.component; // e.g., "adminCards.*"
    const sortBy = parsedArgs.sortBy || 'component-order';

    // 1. Find matching files
    const files = await PathResolver.listFiles(globPattern);

    // 2. Parse each file for {{#component}} blocks
    const components = [];
    for (const file of files) {
        const content = await PathResolver.readFile(file);
        const matches = parseComponentBlocks(content);

        for (const match of matches) {
            // Filter by component pattern if specified
            if (componentFilter && !matchesPattern(match.name, componentFilter)) {
                continue;
            }

            // Expand component content
            const expanded = await _expandHandlebars(req, match.content, currentContext);

            components.push({
                name: match.name,
                content: expanded,
                order: match.order || 99999,
                file: file
            });
        }
    }

    // 3. Sort components
    sortComponents(components, sortBy);

    // 4. Register in component registry and context
    for (const comp of components) {
        registerComponentInContext(req, comp);
    }

    return ''; // No output, just registration
}
```

### 2. Components in Context

Build `context.components` as nested objects from component registry:

```javascript
// In context initialization:
function buildContext(req) {
    const context = {
        user: {...},
        config: {...},
        components: buildComponentsFromRegistry(req.componentRegistry)
    };
    return context;
}

function buildComponentsFromRegistry(registry) {
    const components = {};

    for (const [name, definition] of registry.entries()) {
        // name = "adminCards.config" -> components.adminCards.config = content
        setNestedProperty(components, name, definition.content);
    }

    return components;
}
```

### 3. Component Pattern Matching

Support wildcard and exact matching:

```javascript
function matchesPattern(componentName, pattern) {
    if (!pattern) return true;

    const patterns = pattern.split(',').map(p => p.trim());

    return patterns.some(pat => {
        if (pat.endsWith('.*')) {
            // Namespace match: "adminCards.*"
            const namespace = pat.slice(0, -2);
            return componentName.startsWith(namespace + '.');
        } else {
            // Exact match: "adminCards.config"
            return componentName === pat;
        }
    });
}
```

### 4. Sorting Methods

```javascript
function sortComponents(components, sortBy) {
    switch (sortBy) {
        case 'component-order':
            components.sort((a, b) => a.order - b.order);
            break;

        case 'plugin-order':
            components.sort((a, b) => {
                const pluginA = extractPluginName(a.file);
                const pluginB = extractPluginName(b.file);
                const orderA = getPluginLoadOrder(pluginA);
                const orderB = getPluginLoadOrder(pluginB);
                return orderA - orderB;
            });
            break;

        case 'filename':
            components.sort((a, b) => a.file.localeCompare(b.file));
            break;
    }
}

function getPluginLoadOrder(pluginName) {
    const loadOrder = PluginController.getLoadOrder();
    const index = loadOrder.indexOf(pluginName);
    return index >= 0 ? index : 99999;
}
```

### 5. Component Naming Convention

Use namespaced components for organization:
- Admin cards: `adminCards.config`, `adminCards.users`, `adminCards.plugins`
- Plugin cards: `pluginCards.helloWorld`, `pluginCards.analytics`
- Example cards: `exampleCards.api`, `exampleCards.handlebars`
- Icons: `jpIcons.configSvg`, `jpIcons.logsSvg` (already exists)

## Migration Path

**Files to Update (11+ files):**
- `webapp/view/admin/*.shtml` (6 files)
- `webapp/view/jpulse-examples/*.shtml` (5 files)
- `webapp/view/admin/index.shtml` (dashboard)
- `webapp/view/jpulse-plugins/index.shtml` (plugin dashboard)
- `webapp/view/jpulse-examples/index.shtml` (examples dashboard)
- Plugin files (if any use extract markers)

**Migration Steps:**
1. Implement `file.includeComponents` helper
2. Implement component pattern filtering
3. Implement sorting methods (component-order, plugin-order, filename)
4. Build `context.components` from component registry
5. Update all 11 framework files to use `{{#component}}` syntax
6. Update 3 dashboard files to use `{{file.includeComponents}}`
7. Update documentation
8. Test thoroughly
9. (Optional) Keep `extract:start/end` support for backward compatibility during transition

## Design Decisions

1. **Components as context variables:**
   - ✅ Components accessed via `{{components.*}}` like any other context variable
   - ✅ Consistent with `{{user.*}}`, `{{config.*}}` pattern
   - ✅ No special handlebar syntax needed

2. **Multiple components per file:**
   - ✅ Supported naturally with pattern filtering
   - ✅ `component="adminCards.*"` loads all matching components from files
   - ✅ Files can mix component types (cards, helpers, widgets)

3. **Context structure:**
   - ✅ Nested objects only: `context.components.adminCards.config`
   - ✅ Works naturally with `{{#each components.namespace}}`
   - ✅ Built from component registry at context initialization

4. **Sorting:**
   - ✅ Default: `component-order` (from `order` parameter)
   - ✅ Plugins: Explicit `sortBy="plugin-order"` (uses dependency resolution order)
   - ✅ No smart defaults based on path - always explicit

5. **Pattern filtering:**
   - ✅ `component="namespace.*"` for namespace filtering
   - ✅ Reduces memory usage and namespace pollution
   - ✅ Clear intent about what's being loaded

6. **Backward compatibility:**
   - Keep `extract:start/end` support during transition
   - Provide migration guide for plugin developers
   - Deprecation notice in logs when old syntax used

## Testing Requirements

- [ ] Unit tests for `file.includeComponents` with glob patterns
- [ ] Unit tests for component pattern filtering (`component="namespace.*"`)
- [ ] Unit tests for `order` parameter parsing and sorting
- [ ] Unit tests for plugin-order sorting with dependency resolution
- [ ] Integration tests for dashboard card auto-discovery
- [ ] Test multiple components per file scenario
- [ ] Test `context.components` structure and access
- [ ] Test `{{#each components.namespace}}` iteration
- [ ] Test component parameters: `{{components.jpIcons.configSvg size="48"}}`
- [ ] Test error handling (missing component, invalid order, plugin not found, etc.)
- [ ] Test memory usage with large component sets
- [ ] Test site overrides for component files

## Documentation Updates

- [ ] Update `docs/handlebars.md` with `file.includeComponents` helper
- [ ] Add examples showing dashboard card definition and registration
- [ ] Document `{{components.*}}` context access
- [ ] Document sorting methods and plugin-order behavior
- [ ] Document pattern filtering with examples
- [ ] Update `docs/jpulse-ui-reference.md` if needed
- [ ] Create migration guide for plugin developers
- [ ] Add examples to `/jpulse-examples/handlebars.shtml`

## Related Work Items

- W-094: Handlebars file.list and extract (original implementation)
- W-097: Reusable components (component system foundation)

## API Reference

### Component Definition

```handlebars
{{#component "namespace.componentName" order=N}}
    <!-- component content with Handlebars expressions -->
{{/component}}
```

**Parameters:**
- `namespace.componentName` (required) - Component name with namespace
- `order=N` (optional) - Sort order (default: 99999)

### Component Registration

```handlebars
{{file.includeComponents "glob-pattern" component="filter" sortBy="method"}}
```

**Parameters:**
- `glob-pattern` (required) - File pattern to scan (e.g., `"admin/*.shtml"`)
- `component="filter"` (optional) - Filter pattern (e.g., `"adminCards.*"`, `"adminCards.config"`)
- `sortBy="method"` (optional) - Sort method:
  - `component-order` (default) - Sort by component `order` parameter
  - `plugin-order` - Sort by plugin dependency resolution order
  - `filename` - Alphabetical by filename
  - `filesystem` - Natural filesystem order

### Component Usage

```handlebars
{{!-- Single component --}}
{{components.namespace.componentName}}

{{!-- With parameters --}}
{{components.namespace.componentName param="value"}}

{{!-- Iterate over namespace --}}
{{#each components.namespace}}
    {{this}}
{{/each}}
```

**Context Structure:**
```javascript
{
    components: {
        adminCards: {
            config: "<html>",
            users: "<html>",
            plugins: "<html>"
        },
        jpIcons: {
            configSvg: "<svg>",
            logsSvg: "<svg>"
        }
    }
}
```
