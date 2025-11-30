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

Unify the two systems by using `{{#component}}` for dashboard card extraction, eliminating `extract:start/end` markers.

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
{{#component "adminCards.config" _order=10}}
    {{!-- This card is automatically included in the admin dashboard --}}
    <a href="/admin/config.shtml" class="jp-card-dashboard jp-icon-btn">
        <div class="jp-icon-container">{{use.jpIcons.configSvg size="64"}}</div>
        <h3 class="jp-card-title">{{i18n.view.admin.index.siteConfig}}</h3>
        <p class="jp-card-description">{{i18n.view.admin.index.siteConfigDesc}}</p>
    </a>
{{/component}}
```

**Dashboard index:**
```handlebars
{{#each file.list "admin/*.shtml" sortBy="component-order"}}
    {{use this}}
{{/each}}
```

## Benefits

1. **Conceptual Unification**: One system instead of two - less to learn and maintain
2. **Consistency**: Developers already understand `{{#component}}` and `{{use.*}}`
3. **Better Developer Experience**: Proper Handlebars syntax with highlighting and validation
4. **Less "Magic"**: Explicit component definitions vs. hidden HTML comments
5. **More Flexible**: Leverage full component system (namespacing, parameters, error handling)
6. **Cleaner Code**: No awkward `<div style="display: none;">` wrappers

## Implementation Details

### 1. Add Dynamic Component Invocation

Extend the existing `use.*` handler to support `{{use this}}`:

```javascript
// In webapp/controller/handlebar.js, before existing use.* check:

if (helper === 'use') {
    // Dynamic component invocation: {{use this}} or {{use varName}}
    let componentName = parsedArgs._target;

    // Resolve "this" or variable from context
    if (componentName === 'this') {
        componentName = currentContext['this'];
    } else {
        componentName = currentContext[componentName];
    }

    if (!componentName || typeof componentName !== 'string') {
        LogController.logError(req, 'handlebar.use',
            `use requires a component name, got: ${typeof componentName}`);
        return '';
    }

    // Reconstruct params (excluding _target)
    const paramsString = Object.keys(parsedArgs)
        .filter(k => k !== '_helper' && k !== '_target')
        .map(k => `${k}="${parsedArgs[k]}"`)
        .join(' ');

    return await _handleComponentUse(componentName, paramsString, currentContext);
}
```

### 2. Support `_order` Parameter

Add support for `_order` parameter in component definition (similar to `_inline`):

```javascript
// In _handleComponentDefinition:
const order = parsedArgs._order || parsedArgs.order || 99999;

req.componentRegistry.set(usageName, {
    originalName: componentName,
    template: blockContent,
    defaults: defaultParams,
    order: order  // NEW: store order for sorting
});
```

### 3. Update `file.list` Sorting

Modify `file.list` with `sortBy="component-order"` to:
1. Read files and look for `{{#component}}` blocks
2. Extract component name and `_order` parameter
3. Sort by order (same logic as current `extract-order`)
4. Return sorted list of component names (not file paths)

**Key Insight:** The `#each` loop needs to iterate over component names, not file paths, since `{{use this}}` expects a component name.

### 4. Component Naming Convention

Use namespaced components for organization:
- Admin cards: `adminCards.config`, `adminCards.users`, `adminCards.plugins`
- Plugin cards: `pluginCards.helloWorld`, `pluginCards.analytics`
- Example cards: `exampleCards.api`, `exampleCards.handlebars`

## Migration Path

**Files to Update (11+ files):**
- `webapp/view/admin/*.shtml` (6 files)
- `webapp/view/jpulse-examples/*.shtml` (5 files)
- `webapp/view/admin/index.shtml` (dashboard)
- `webapp/view/jpulse-plugins/index.shtml` (plugin dashboard)
- Plugin files (if any use extract markers)

**Migration Steps:**
1. Implement `{{use this}}` support
2. Implement `_order` parameter support
3. Update `file.list` to support `sortBy="component-order"`
4. Update all framework files one by one
5. Update documentation
6. Test thoroughly
7. (Optional) Keep `extract:start/end` support for backward compatibility during transition

## Open Questions

1. **Component name in file.list return value:**
   - Should `file.list` return component names or still return file paths?
   - If file paths, how does `{{use this}}` know which component to render?
   - **Answer needed:** Need to store component-to-file mapping

2. **Multiple components per file:**
   - What if a file defines multiple components?
   - Current `extract:start/end` allows only one extraction per file
   - Should this limitation continue or allow multiple?

3. **Backward compatibility:**
   - Keep `extract:start/end` support for plugins during transition?
   - Or breaking change with clear migration guide?

## Testing Requirements

- [ ] Unit tests for `{{use this}}` with various contexts
- [ ] Unit tests for `_order` parameter
- [ ] Integration tests for dashboard card auto-discovery
- [ ] Test multiple components per file scenario
- [ ] Test plugin card integration
- [ ] Test error handling (missing component, invalid order, etc.)

## Documentation Updates

- [ ] Update `docs/handlebars.md` with new component usage patterns
- [ ] Add examples showing dashboard card definition
- [ ] Update `docs/jpulse-ui-reference.md` if needed
- [ ] Create migration guide for plugin developers

## Related Work Items

- W-094: Handlebars file.list and extract (original implementation)
- W-097: Reusable components (component system foundation)
