# W-097: handlebars: define and use reusable components

**Objectives**: Reusable components to reduce code duplication (e.g., inline SVG images)

## Feature Overview

**Phase 1 - Core Functionality:**
- Define a library of components (e.g., SVG images, UI widgets)
- Component definitions reside in `.tmpl` files anywhere in the view space
- Component definitions produce no output unless explicitly used
- Components can be used in the same file or imported via `{{file.include}}`
- Site overrides supported via PathResolver

**Phase 2 - Advanced Features (Future):**
- Block components with `{{@content}}` slots
- Dynamic parameter passing
- Component composition patterns

## Component Definition Syntax

**Basic component:**
```handlebars
{{#component "logs-svg" fillColor="currentColor" size="64"}}
    <svg width="{{size}}" height="{{size}}" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="85" width="10" height="22" fill="{{fillColor}}"/>
        <rect x="36" y="64" width="10" height="43" fill="{{fillColor}}"/>
        <rect x="52" y="75" width="10" height="32" fill="{{fillColor}}"/>
        <rect x="68" y="43" width="10" height="64" fill="{{fillColor}}"/>
        <rect x="84" y="53" width="10" height="54" fill="{{fillColor}}"/>
        <rect x="100" y="32" width="10" height="75" fill="{{fillColor}}"/>
    </svg>
{{/component}}
```

**Key points:**
- Use `{{#component "name" param="default"}}...{{/component}}`
- First parameter is component name (string)
- Following parameters define defaults
- Parameters available as `{{paramName}}` within component body

## Component Naming Rules

**Flexible naming with conversion:**
- Pattern: `/^[a-z][\w\-]*[a-z0-9]$/i`
- Valid examples: `logs-svg`, `LogsSvg`, `Logs_svg`, `ab`, `my-icon-123`
- Conversion for usage: Hyphenated names converted to camelCase
  - `logs-svg` → `{{use.logsSvg}}`
  - `user-card` → `{{use.userCard}}`
  - `my-icon` → `{{use.myIcon}}`
- Names without hyphens used as-is:
  - `LogsSvg` → `{{use.LogsSvg}}`
  - `ab` → `{{use.ab}}`

**Naming requirements:**
- Must start with a letter (a-z, case insensitive)
- Can contain letters, numbers, underscores, hyphens
- Must end with a letter or number
- No spaces or special characters

## Component Usage Syntax

**Selected syntax: `{{use.componentName}}`**

```handlebars
{{use.logsSvg fillColor="currentColor" size="64"}}
{{use.userCard userName="John" role="admin"}}
```

**Why `use.`:**
- Natural verb: "use this component"
- Short and efficient (3 chars + dot)
- Action-oriented and intuitive
- Clear namespace (no collision with context variables)
- Consistent with jPulse patterns (`user.firstName`, `file.include`, `i18n.key`)

## Component Library Example

**File: `webapp/view/components/svg-icons.tmpl`**
```handlebars
{{!-- SVG Icon Component Library --}}

{{#component "logs-svg" fillColor="currentColor" size="64"}}
    <svg width="{{size}}" height="{{size}}" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="85" width="10" height="22" fill="{{fillColor}}"/>
        <rect x="36" y="64" width="10" height="43" fill="{{fillColor}}"/>
        <rect x="52" y="75" width="10" height="32" fill="{{fillColor}}"/>
        <rect x="68" y="43" width="10" height="64" fill="{{fillColor}}"/>
        <rect x="84" y="53" width="10" height="54" fill="{{fillColor}}"/>
        <rect x="100" y="32" width="10" height="75" fill="{{fillColor}}"/>
    </svg>
{{/component}}

{{#component "users-svg" fillColor="currentColor" size="64"}}
    <svg width="{{size}}" height="{{size}}" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="48" cy="42" r="16" fill="{{fillColor}}"/>
        <circle cx="80" cy="42" r="16" fill="{{fillColor}}"/>
        <path d="M16 101C16 85 32 75 48 75C64 75 80 85 80 101V107H16V101Z" fill="{{fillColor}}"/>
    </svg>
{{/component}}

{{#component "config-svg" fillColor="currentColor" size="64"}}
    <svg width="{{size}}" height="{{size}}" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- gear icon paths -->
    </svg>
{{/component}}
```

## Component Import and Usage

**File: `webapp/view/admin/logs.shtml`**
```html
<!DOCTYPE html>
<html>
<head>
    {{file.include "jpulse-header.tmpl"}}
</head>
<body>
    {{!-- Import component library (no output, just registers components) --}}
    {{file.include "components/svg-icons.tmpl"}}

    <div class="jp-main">
        <div class="jp-card-dashboard">
            <div class="jp-icon-container">
                {{use.logsSvg fillColor="currentColor" size="64"}}
            </div>
            <h3>View Logs</h3>
        </div>

        <div class="jp-card-dashboard">
            <div class="jp-icon-container">
                {{use.usersSvg fillColor="white" size="64"}}
            </div>
            <h3>User Management</h3>
        </div>

        <div class="jp-card-dashboard">
            <div class="jp-icon-container">
                {{use.configSvg fillColor="currentColor" size="32"}}
            </div>
            <h3>Configuration</h3>
        </div>
    </div>
</body>
</html>
```

**Key pattern:**
1. `{{file.include "components/library.tmpl"}}` → Import component definitions (no output)
2. `{{use.componentName param="value"}}` → Use component (produces output)

## Nested Components

**Supported:** Components can call other components directly

```handlebars
{{#component "dashboard-card" title="" iconName="logs-svg"}}
    <div class="jp-card-dashboard">
        <div class="jp-icon-container">
            {{use.logsSvg fillColor="currentColor" size="64"}}
        </div>
        <h3>{{title}}</h3>
    </div>
{{/component}}

{{#component "logs-svg" fillColor="currentColor" size="64"}}
    <svg width="{{size}}" height="{{size}}" ...>...</svg>
{{/component}}
```

**Usage:**
```handlebars
{{use.dashboardCard title="View Logs"}}
```

**Limitation (Phase 1):**
- Component parameters are NOT passed to nested component calls
- Each `{{use.componentName}}` must specify its own parameters
- Document this as expected behavior

**Protection:**
- Circular reference detection (max nesting depth: 16)
- Call stack tracking prevents infinite loops
- Error logged with full call chain

## Error Handling

**Aligns with current HandlebarController behavior:**

**Component registration errors:**
- Invalid component name → Log error, skip registration
- Duplicate component name → Log warning, use latest definition
- Parse errors → Log error, skip component

**Component usage errors:**
- Component not found → Log error, return empty string (production) or HTML comment (development)
- Circular reference → Log error with call stack, return error comment
- Render errors → Log error, return empty string (production) or error comment (development)
- Missing required parameters → Use default or empty string

**Error comment format (development mode):**
```html
<!-- ERROR: Component "logs-svg" not found. Did you forget to include the component library? -->
<!-- ERROR: Circular component reference: dashboard-card → icon-card → dashboard-card -->
```

**Production mode:** Silent failure (empty string), errors only in server logs

## Phase 2 - Block Components with Slots (Future)

**Definition with `{{@content}}` slot:**
```handlebars
{{#component "card" title="" class=""}}
    <div class="jp-card {{class}}">
        {{#if title}}<h2>{{title}}</h2>{{/if}}
        <div class="jp-card-content">
            {{@content}}  {{!-- Slot for caller's nested content --}}
        </div>
    </div>
{{/component}}
```

**Usage with block syntax:**
```handlebars
{{#use.card title="User Profile" class="highlight"}}
    <p>Welcome back, {{user.firstName}}!</p>
    <button>Edit Profile</button>
{{/use.card}}
```

**Why `{{@content}}`:**
- Consistent with Handlebars convention (`{{@index}}`, `{{@key}}` in `{{#each}}`)
- Clear intent: special slot variable
- Distinct from regular parameters

**Note:** Block components deferred to Phase 2 for simplicity

## Implementation Notes

**Component Registry Lifecycle (Per-Page, Transient):**
- Component registry is **per-request**, not global
- Created at start of page rendering
- Populated during `{{#component}}` block processing
- Used during `{{use.componentName}}` processing
- Discarded after page rendering completes
- No caching of component registry (templates themselves are cached via IncludeCache)

**Why per-page registry:**
- ✅ Simple and clean architecture
- ✅ No memory leaks or stale component definitions
- ✅ Natural part of Handlebars expansion process
- ✅ Template files already cached (IncludeCache handles this)
- ✅ Components automatically "refresh" when template changes (no cache invalidation needed)
- ✅ Thread-safe (each request has its own registry)

**HandlebarController enhancements:**
1. New `_handleComponentDefinition()` method to parse `{{#component}}`
   - Registers component in per-request registry: `Map<string, {template, params}>`
   - Name conversion: Hyphenated names → camelCase for `{{use.}}`
   - Validates component name format
   - No output produced (silent registration)
2. New `_handleComponentUse()` method to render `{{use.componentName}}`
   - Looks up component in current request's registry
   - Merges provided params with component defaults
   - Expands component template with params
   - Returns rendered output
3. Circular reference protection via call stack tracking
   - Per-request call stack: `componentCallStack = []`
   - Max depth: 16 (matches include depth limit)
   - Detects circular references
4. Error handling aligned with existing Handlebar error patterns
   - Log to server, return HTML comment (dev) or empty string (prod)

**Request lifecycle:**
```javascript
async function expandHandlebars(req, template, additionalContext = {}, depth = 0) {
    // Initialize per-request component registry (if not exists)
    if (!req.componentRegistry) {
        req.componentRegistry = new Map();
        req.componentCallStack = [];
    }

    // Process template (including {{#component}} and {{use.}} handlers)
    const result = await _resolveHandlebars(template, context);

    // Registry automatically garbage collected when request completes
    return result;
}
```

**PathResolver integration:**
- Components in `.tmpl` files anywhere in view space
- Site override: Check `site/webapp/view/` before `webapp/view/`
- Security: Path traversal protection
- Template caching via IncludeCache (existing infrastructure)

**Performance:**
- Template files cached via IncludeCache (no re-reading from disk)
- Component registration happens during template expansion (minimal overhead)
- Call stack limited to max depth 16 (matches include depth limit)
- Per-request registry is lightweight (Map of template strings)
