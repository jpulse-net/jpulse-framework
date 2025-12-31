# W-068: Generalized Sidebar System - Brainstorming

## Overview

Generalize the existing markdown docs sidebar into a flexible, "don't make me think" sidebar system that supports:
- Left and right sidebars
- Two display modes (always on, toggle)
- Component-based architecture (site nav, page nav, TOC, etc.)
- Desktop and mobile responsive
- Site-level template overrides

## Current State

### Existing Implementation
- **Location**: `webapp/view/jpulse-docs/index.shtml` has a hardcoded sidebar for markdown docs
- **Structure**: Uses `jp-docs-container` with grid layout (250px sidebar + 1fr content)
- **Navigation**: Rendered via `jPulse.UI.docs.init()` which populates `#docs-navigation`
- **Mobile**: Sidebar moves below content on mobile (<768px)
- **CSS**: Defined in `jpulse-common.css` (`.jp-docs-container`, `.jp-docs-nav`, etc.)

### Limitations
- Hardcoded to markdown docs only
- No toggle/collapse functionality
- No component system (can't mix different sidebar content types)
- No right sidebar support
- No per-page or per-route configuration
- No site-level template override pattern

## Design Goals

### "Don't Make Me Think" Principles
1. **Components Are Just Components**: Sidebar components defined as components, not specific to left/right, don't define sequence
2. **Simple Configuration**: Sidebar usage (which components, order) defined in `app.conf` or template
3. **Sensible Defaults**: Left sidebar toggle mode (initially closed), right sidebar toggle mode (initially closed) for TOC
4. **Template Override**: Site can replace templates via `site/webapp/view/components/site-sidebars.tmpl`
5. **Page Preferred State**: Pages can set preferred sidebar state (user can disable programmatic toggle)
6. **User Preferences**: Width customization and programmatic toggle control via localStorage

## Architecture Proposal

### Core Principle: Components Are Just Components

**Sidebar components are ONLY defined as components** - they are not specific to left/right sidebars, and they do not define sequence. Components are reusable building blocks.

### 1. Component Definition

**Key Principle**: Sidebar components are **always loaded** (unless sidebar is disabled). Framework first includes all jpulse and site-specific sidebar components, then builds sidebars conditionally via app.conf component list. This simplifies rendering - no need for complex conditional includes.

**Component Namespace**: All sidebar components use `sidebar.*` namespace (e.g., `sidebar.pageComponentLeft`, `sidebar.toc`)

**Common Class**: All components must have `jp-sidebar-component` class for common styling.

#### Component Location Options

**Location**: In existing components directory
- `webapp/view/components/jpulse-sidebars.tmpl` - Framework sidebar components
- `site/webapp/view/components/site-sidebars.tmpl` - Site-specific sidebar components

**Reason**: Follows existing pattern, all components in one place, easier to discover.

#### Framework Components
**Location**: `webapp/view/components/jpulse-sidebars.tmpl`

```handlebars
{{#component "sidebar.siteNav"}}
    <nav class="jp-sidebar-component jp-sidebar-nav" id="jp-sidebar-site-nav">
        <!-- Site navigation structure -->
    </nav>
    <script>
    jPulse.dom.ready(() => {
        // Component-specific JavaScript initialization
        // Renders site navigation from jPulse.UI.navigation
    });
    </script>
{{/component}}

{{#component "sidebar.toc"}}
    <div class="jp-sidebar-component jp-sidebar-toc" id="jp-sidebar-toc">
        <!-- Table of contents -->
    </div>
    <script>
    jPulse.dom.ready(() => {
        // Component-specific JavaScript initialization
        // Auto-generates TOC from page headings
    });
    </script>
{{/component}}

{{#component "sidebar.pageComponentLeft"}}
    <div class="jp-sidebar-component jp-sidebar-page-component jp-sidebar-page-component-left" data-sidebar-component="pageComponent" id="jp-sidebar-page-component-left">
        <!-- Skeleton - provides real estate for page/SPA to populate the left sidebar -->
        <!-- Can be initialized via jPulse.UI.sidebars.initComponent() -->
    </div>
{{/component}}

{{#component "sidebar.pageComponentRight"}}
    <div class="jp-sidebar-component jp-sidebar-page-component jp-sidebar-page-component-right" data-sidebar-component="pageComponent" id="jp-sidebar-page-component-right">
        <!-- Skeleton - provides real estate for page/SPA to populate the right sidebar -->
        <!-- Can be initialized via jPulse.UI.sidebars.initComponent() -->
    </div>
{{/component}}
```

**Note**: Self-contained components can include their own JavaScript code within the component definition, initiated in `jPulse.dom.ready()`. This keeps components self-contained with their own HTML, CSS (if needed), and JavaScript logic.

**JavaScript Execution Behavior**:
- **During Registration** (`{{#component}}`): Component `blockContent` (including `<script>` tags) is stored as raw template string in the component registry. **No JavaScript executes** - it's just stored as text.
- **During Rendering** (`{{components.name}}`): The stored template is expanded via `_expandHandlebars()`, which outputs HTML including `<script>` tags. JavaScript then executes when the browser loads the page (via `jPulse.dom.ready()`).
- **Verification**: Code analysis confirms `_handleComponentDefinition()` stores `blockContent` without expansion (line 1492), and `_handleComponentCall()` expands it only when component is used (line 1562).

**Note**: Components renamed to `sidebar.pageComponentLeft` and `sidebar.pageComponentRight` (more generic, not just navigation).

#### Site-Specific Components
**Location**: `site/webapp/view/components/site-sidebars.tmpl`

```handlebars
{{#component "sidebar.customWidget"}}
    <div class="jp-sidebar-component site-sidebar-custom-widget">
        <!-- Custom sidebar widget -->
    </div>
{{/component}}
```

#### Component Loading
**In `jpulse-header.tmpl` after SVG icon components include**:
```handlebars
{{!-- Load all sidebar components (framework + site) --}}
{{file.include "components/jpulse-sidebars.tmpl"}}
{{#if (file.exists "components/site-sidebars.tmpl")}}
    {{file.include "components/site-sidebars.tmpl"}}
{{/if}}
```

Components are registered but not rendered until sidebar configuration selects them.

**Note**: `site-sidebars.tmpl.tmpl` could be a template template (convention, though `.tmpl.tmpl` is a bit odd) that can be copied as a starting point.

### 2. Sidebar Configuration (Where to Define Usage?)

**Per sidebar (left & right) metadata**:
- `enabled` - Enable/disable sidebar (if false, sidebar is completely disabled, no HTML rendered)
- `mode` - 'always' | 'toggle' (only applies when enabled=true)
- `initState` - Initial state: 'open' | 'closed' (default: 'closed', only applies to toggle mode)
  - Framework default: 'closed' (both sidebars start closed)
  - Site admin can override: e.g., left sidebar initially open for navigation
- `width` - Default width (px)
- `mobileWidth` - Mobile width (px or '100%')
- `behavior` - 'reflow' | 'overlay' | 'auto'
- `components` - Selection of sidebar components by name, with logical sequence

**Defined in `app.conf` (and `site/app.conf`)**
```javascript
view: {
    pageDecoration: {
        sidebarLeft: {
            enabled: true,
            mode: 'toggle',
            initState: 'closed',    // Initial state: 'open' | 'closed' (default: 'closed')
            width: 250,
            mobileWidth: '100%',
            behavior: 'reflow',
            components: ['sidebar.siteNav', 'sidebar.pageComponentLeft']  // Component names in sequence
        },
        sidebarRight: {
            enabled: true,          // Enable right sidebar for TOC
            mode: 'toggle',
            initState: 'closed',
            width: 300,
            mobileWidth: '100%',
            behavior: 'overlay',
            components: ['sidebar.toc']
        }
    }
}
```

### 3. Page-Specific Component

Some pages, such as the markdown-based doc SPA pages need their own space in a sidebar. Page-specific components supply that space.

**Fixed name components**: `sidebar.pageComponentLeft` and `sidebar.pageComponentRight`

- Provides skeleton/real estate in sidebar
- Page/SPA can initialize via JavaScript

**Generic API (could override any component)**
```javascript
// In page JavaScript
const componentHandle = jPulse.UI.sidebars.initComponent('sidebar.pageComponentLeft', {
    content: '<ul>...</ul>',    // optional
    onLoad: (element) => {},     // optional, called after content is set
    refresh: (element) => {}     // optional, callback to refresh component content
});

// Returns handle object with methods: getElement(), refresh(), setContent(), getContent()
// Returns null if sidebar not enabled or component not found

// Could also override other components
jPulse.UI.sidebars.initComponent('sidebar.customWidget', {
    content: '<div>Custom content</div>'
});
```

### 3a. Page-Specific Sidebar Location

Some pages need the sidebar to appear after a specific element (e.g., after a tab bar) rather than at the beginning of `.jp-main`.

**API**:
```javascript
// Set sidebar to appear after specified element
jPulse.UI.sidebars.setLeftSidebarAfter('#jpulse-docs-examples-tabs');
jPulse.UI.sidebars.setRightSidebarAfter('#some-element');
```

**Behavior**:
- Sidebar is moved to appear after the specified element in the DOM
- Top position is calculated from the element's bottom (same for open and closed states)
- If element doesn't exist when called, will retry after a short delay
- Can be called before or after `init()` - if called before, `init()` will apply it

### 4. Sidebar Modes

**Note**: To completely disable a sidebar, set `enabled: false` in the configuration. This prevents any HTML from being rendered and avoids JavaScript overhead.

#### Mode: `always`
- Sidebar always visible, no toggle button
- Content reflows around sidebar (or overlays if configured)
- Use case: Documentation sites that always show navigation

#### Mode: `toggle` (Default for left sidebar)
- Sidebar can be opened/closed via toggle button
- State persists in localStorage (per sidebar)
- Toggle button visible in header or sidebar itself
- Use case: Most common - gives users control

### 5. Page Preferred State (Programmatic Toggle)

**Toggle sidebar by page, not by routing**:
- Each page can set its "preferred state" for sidebars
- Default is null (no preference)
- Preferred opened/closed state can be set by a component/page JavaScript
- User can disable programmatic toggle (default: enabled)

**State Transition & Restoration**:
- When a page sets a preferred state, the current sidebar state is saved to sessionStorage
- When navigating to a page without a preferred state, the saved state is restored
- This ensures sidebars don't "stick" in an unwanted state when leaving pages with preferences
- State tracking is per-tab (sessionStorage) to support multiple open tabs independently

**Behavior**:
- **Preferred state applies on page load**: When `setPreferredState()` is called, it applies immediately if programmatic toggle is enabled
- **Manual toggles always work**: Users can manually toggle sidebars at any time, regardless of preferred state
- **Manual toggle blocks future preferred states**: Once a user manually toggles after a preferred state was applied, subsequent preferred state changes on that page are ignored (respects user's choice)
- **Resets on new page load**: When navigating to a new page (full page load), all flags reset and preferred states can apply again
- **SPA navigation**: Preferred states can be applied during SPA navigation (route changes), unless user has manually toggled

**What if user disabled programmatic toggle, but app needs sidebar?**
- Example: Markdown doc page needs sidebar for navigation and "where am I" context
- Show toast notification: "This page works best with [left/right] sidebar [open/closed] for better navigation. Enable programmatic sidebar control in your localStorage so that the page can [open/close] the sidebar."
- Toast shown once per page load

**API**:
```javascript
// In page JavaScript or component
jPulse.UI.sidebars.setPreferredState('left', 'open');   // Preferred: open
jPulse.UI.sidebars.setPreferredState('left', 'closed'); // Preferred: closed
jPulse.UI.sidebars.setPreferredState('left', null);     // No preference (default)

// User preference helpers
jPulse.UI.sidebars.getUserPreference('jpulse-allow-programmatic-toggle'); // Returns true/false
jPulse.UI.sidebars.setUserPreference('jpulse-allow-programmatic-toggle', true);
jPulse.UI.sidebars.getUserPreferences(); // Returns all preferences object
```

**User Preference**:
- Flag: `jpulse-allow-programmatic-toggle` (stored in localStorage)
- Default: `true` (programmatic toggle allowed if flag is missing or explicitly true)
- No GUI provided at this time (users can set via browser dev tools if needed)

**Example Use Cases**:
- **Markdown doc page**: Sets preferred state to 'open' when page loads
  - User can manually close if they want full width
  - If user closes, sidebar stays closed during SPA navigation (user's choice respected)
  - When navigating to home page (no preference), sidebar restores to its state before the docs page
- **Email SPA**: Can set preferred state to 'open' for folder list, 'closed' for reading email
  - Preferred state applies on route changes unless user manually toggled
- **Dashboard SPA**: Can set preferred state based on route (open on overview, closed on detail views)

### 6. Component Examples

#### Framework Components (in `jpulse-sidebars.tmpl`)

**`sidebar.siteNav`** - Site navigation:
```handlebars
{{#component "sidebar.siteNav"}}
    <nav class="jp-sidebar-component jp-sidebar-nav" id="jp-sidebar-site-nav" data-context="{{context}}">
        <!-- Renders site navigation from jpulse-navigation.js -->
        <!-- Context can be passed via component parameters or config -->
    </nav>
    <script>
    jPulse.dom.ready(() => {
        // Initialize site navigation component
        // Uses jPulse.UI.navigation to render navigation structure
    });
    </script>
{{/component}}
```

**`sidebar.toc`** - Table of contents:
```handlebars
{{#component "sidebar.toc"}}
    <div class="jp-sidebar-component jp-sidebar-toc" id="jp-sidebar-toc" data-selector="main h2, main h3">
        <!-- Auto-generates TOC from page headings -->
    </div>
    <script>
    jPulse.dom.ready(() => {
        // Initialize TOC component
        // Scans page headings and generates table of contents
    });
    </script>
{{/component}}
```

**`sidebar.pageComponentLeft`** - Page/SPA component skeleton:
```handlebars
{{#component "sidebar.pageComponentLeft"}}
    <div class="jp-sidebar-component jp-sidebar-page-component jp-sidebar-page-component-left" data-sidebar-component="pageComponent">
        <!-- Skeleton - provides real estate for page/SPA to populate in left sidebar -->
        <!-- Initialized via jPulse.UI.sidebars.initComponent() -->
    </div>
{{/component}}
```

**`sidebar.pageComponentRight`** - Page/SPA component skeleton:
```handlebars
{{#component "sidebar.pageComponentRight"}}
    <div class="jp-sidebar-component jp-sidebar-page-component jp-sidebar-page-component-right" data-sidebar-component="pageComponent">
        <!-- Skeleton - provides real estate for page/SPA to populate in right sidebar -->
        <!-- Initialized via jPulse.UI.sidebars.initComponent() -->
    </div>
{{/component}}
```

#### Site Components (in `site-sidebars.tmpl`)

```handlebars
{{#component "sidebar.customWidget" order=15}}
    <div class="jp-sidebar-component site-sidebar-custom-widget">
        <!-- Custom sidebar widget -->
    </div>
{{/component}}
```

**Key Points**:
- Components are **not** specific to left/right sidebars
- Components do **not** define sequence (order is in component definition, but usage sequence is in config)
- Components are reusable - same component can be used in left or right sidebar
- Component selection and sequence is defined in sidebar configuration (app.conf or template)

### 7. Template Structure

#### Component Definition Templates
- `webapp/view/components/jpulse-sidebars.tmpl` - Framework sidebar components (recommended location)
- `site/webapp/view/components/site-sidebars.tmpl` - Site-specific sidebar components
- `site/webapp/view/components/site-sidebars.tmpl.tmpl` - Template template (convention, can be copied)

#### Sidebar Container Templates

**Include in Existing Templates**
- Put sidebar HTML directly in `jpulse-footer.tmpl`
- Note: page banner already resides there, so that's a logical place

**Note**: Unlike `.js` and `.css` (append mode), HTML templates are **replace mode** - site templates completely replace framework templates.

### 8. HTML Structure & UX

#### Sidebar Container Structure

**Problem**: Handlebars doesn't support dynamic component access like `{{components.[this]}}` or `{{components.{{this}}}}`.

**Solution: Enhance Components Helper** (Recommended)

Enhance the `{{components}}` helper to support dynamic component names via `name` parameter:

```handlebars
{{#if view.pageDecoration.sidebarLeft.enabled}}
<aside id="jp-sidebar-left" class="jp-sidebar jp-sidebar-left jp-sidebar-{{view.pageDecoration.sidebarLeft.mode}} jp-sidebar-{{view.pageDecoration.sidebarLeft.behavior}}" data-sidebar="left">
    <div class="jp-sidebar-content">
        {{#each view.pageDecoration.sidebarLeft.components}}
            {{components name=(this)}}  <!-- Enhanced helper: name parameter for dynamic component access -->
        {{/each}}
    </div>
</aside>
<div class="jp-sidebar-separator jp-sidebar-separator-left" data-sidebar="left"></div>
{{/if}}
```

**Enhanced Components Helper Syntax**:
All of these are equivalent:
```handlebars
{{components.sidebar.customWidget}}         <!-- Static (existing) -->
{{components name="sidebar.customWidget"}}  <!-- Dynamic with string literal (new) -->
{{components name=sidebar.customWidget}}    <!-- Dynamic with variable (new) -->
{{components name=(vars.someName)}}         <!-- Dynamic with vars (new, preceded by {{let someName="sidebar.customWidget"}}) -->
{{components name=(this)}}                  <!-- Dynamic in #each loop (new, {{this}} assigned to context.this) -->
```

**Benefits**:
- No new helper needed - extends existing `components` helper
- Consistent with existing component syntax
- Supports all dynamic access patterns
- Works with variables, let statements, and #each loops

#### Visual States & UX

**Architecture Decision: Sidebars within `.jp-main` Container**

Sidebars are positioned **within `.jp-main`** (not fixed to viewport) to avoid z-index, height, and background issues:
- `.jp-main` becomes `position: relative` (containing block)
- Sidebars are `position: absolute` within `.jp-main`
- Sidebars start at padding edge (30px from `.jp-main` edge) - aligns with content area
- Separator bar positioned at padding edge (30px) when closed
- Separator bar rounded top/bottom like `.jp-main` (border-radius: 8px)
- No viewport calculations needed - simpler CSS
- No z-index issues - sidebars are within same stacking context
- No height issues - sidebars fill `.jp-main` height naturally

**Desktop - Sidebar On**:
- Sidebar has slight gray background (like current markdown sidebar)
- Vertical separator bar: narrow gray bar, flush to sidebar
- Content reflows around sidebar (or overlays if configured)
- Sidebar positioned at `.jp-main` padding edge (30px from container edge)

**Desktop - Sidebar Off**:
- Vertical separator bar visible at `.jp-main` padding edge (30px from left edge)
- Separator bar rounded top/bottom like `.jp-main`
- Sidebar hidden (transformed off-screen)

**Toggle Mechanism** (Desktop):
- support two actions:
- Double-click on vertical separator bar
- Visual `[<]` and `[>]` buttons at top of vertical separator bar

**Resize Mechanism** (Desktop):
- Drag vertical separator bar to reposition/resize sidebar
- Width persists in user preferences (localStorage)

**Mobile UX** (<768px):
- Sidebars switch to `position: fixed`, full viewport overlay
- Follows existing mobile menu pattern (W-069) for consistency
- Hamburger menu button in header to toggle
- Backdrop overlay when sidebar open (semi-transparent, like mobile menu)
- Slide-in animation from left/right
- Swipe to close (optional enhancement)

**Visual Clues for Required Sidebar**:
- If app needs sidebar but user has programmatic toggle disabled:
  - Show toast notification suggesting to enable programmatic toggle

### 9. JavaScript API

#### Initialization (`jpulse-footer.tmpl`)
```javascript
jPulse.dom.ready(() => {
    jPulse.UI.sidebars.init({
        left: {{json view.pageDecoration.sidebarLeft}},
        right: {{json view.pageDecoration.sidebarRight}},
        currentUrl: '{{url.pathname}}',
        userRoles: {{json user.roles}}
    });
});
```

#### API Methods (`jPulse.UI.sidebars`)
```javascript
// Initialize sidebars
jPulse.UI.sidebars.init(config)

// Toggle sidebar
jPulse.UI.sidebars.toggle(sidebar)  // 'left' | 'right'

// Open sidebar
jPulse.UI.sidebars.open(sidebar)

// Close sidebar
jPulse.UI.sidebars.close(sidebar)

// Get sidebar state
jPulse.UI.sidebars.getState(sidebar)  // Returns: 'open' | 'closed'

// Set page preferred state (programmatic toggle)
jPulse.UI.sidebars.setPreferredState(sidebar, state)  // 'open' | 'closed' | null

// Initialize page specific component
jPulse.UI.sidebars.initComponent(componentName, config)  // 'sidebar.pageComponentLeft', { content, onLoad, refresh }

// Set sidebar insertion point (page-specific, e.g., after tab bar)
jPulse.UI.sidebars.setLeftSidebarAfter(selector)   // '#jpulse-docs-examples-tabs'
jPulse.UI.sidebars.setRightSidebarAfter(selector)  // '#some-element'
```

### 10. User Preferences (localStorage)

**Per-user preferences stored in browser localStorage** (not session storage, persists across sessions):

```javascript
{
    sidebarLeftWidth: 250,              // Custom width (overrides default)
    sidebarRightWidth: 300,             // Custom width (overrides default)
    allowProgrammaticToggle: true       // Allow pages to set preferred state (default: true)
}
```

**API**:
```javascript
// Get user preference
jPulse.UI.sidebars.getUserPreference(key)  // 'sidebarLeftWidth', 'sidebarRightWidth', 'allowProgrammaticToggle'

// Set user preference
jPulse.UI.sidebars.setUserPreference(key, value)

// Get all preferences
jPulse.UI.sidebars.getUserPreferences()
```

**GUI for Preferences**:
- **Question**: Is this feature worth the effort?
  - User preferences would be easy to implement (localStorage)
  - But GUI requires significant effort (settings page, menu integration, etc.)
  - **Recommendation**: Drop GUI feature for now, keep localStorage API for future
  - Users can still customize via browser dev tools if needed
  - Can add GUI later if there's demand

### 11. CSS Classes

#### Layout Classes
- `.jp-sidebar` - Base sidebar class
- `.jp-sidebar-left` - Left sidebar
- `.jp-sidebar-right` - Right sidebar
- `.jp-sidebar-open` - Sidebar is open
- `.jp-sidebar-closed` - Sidebar is closed
- `.jp-sidebar-reflow` - Content reflows around sidebar
- `.jp-sidebar-overlay` - Sidebar overlays content
- `.jp-sidebar-auto` - Auto behavior (overlay on mobile, reflow on desktop)

#### Component Classes
- `.jp-sidebar-component` - Base component wrapper
- `.jp-sidebar-component-site-nav` - Site navigation component
- `.jp-sidebar-component-page-nav` - Page navigation component
- `.jp-sidebar-component-toc` - Table of contents component
- `.jp-sidebar-component-custom` - Custom component

#### Toggle Classes
- `.jp-sidebar-toggle` - Toggle button
- `.jp-sidebar-toggle-left` - Left sidebar toggle (in header)
- `.jp-sidebar-toggle-right` - Right sidebar toggle (in header)
- `.jp-sidebar-toggle-open` - Open state toggle button
- `.jp-sidebar-toggle-close` - Close state toggle button

### 12. Mobile Behavior

#### Default Mobile Behavior
- Sidebars become full-width overlays on mobile (<768px)
- Toggle buttons visible in header (hamburger-style)
- Backdrop overlay when sidebar open
- Swipe gestures to close (optional enhancement)

#### Mobile-Specific Configuration
```javascript
left: {
    enabled: true,
    mode: 'toggle',
    mobile: {
        behavior: 'overlay',        // Always overlay on mobile
        position: 'left',           // Slide in from left
        backdrop: true,             // Show backdrop overlay
        swipeToClose: true          // Swipe left to close
    }
}
```

### 13. Integration with Existing Systems

#### Site Navigation Integration
- Sidebar can render same navigation structure as dropdown menu
- Uses `jPulse.UI.navigation` for consistency
- Role-based filtering applies to sidebar nav too

#### SPA Integration
- `jPulse.UI.docs.init()` can register with sidebar system
- Auto-opens sidebar when visiting SPA doc routes
- Sidebar navigation updates as SPA navigates

#### Breadcrumb Integration
- Breadcrumbs can reference sidebar navigation
- Active sidebar item matches breadcrumb trail

### 14. Migration Path

#### For Existing Markdown Docs Pages
1. Update `app.conf` to define left sidebar with `sidebar.pageComponentLeft` component
2. Replace hardcoded sidebar HTML with sidebar container in `jpulse-footer.tmpl`
3. Update page JavaScript to use `jPulse.UI.sidebars.initComponent('sidebar.pageComponentLeft', {...})`
4. Remove custom CSS (use framework sidebar classes)
5. Test toggle modes

#### For Sites Wanting Always-On Sidebar
1. Set `mode: 'always'` in `app.conf`
2. Sidebar automatically included in `jpulse-footer.tmpl`
3. Configure components as needed

### 15. Mobile Design (<768px)

#### Overview
Mobile sidebars use `position: fixed` full-height overlay pattern, consistent with existing mobile menu (W-069).

#### Visual Design

**Closed State:**
- **Separator Bar:**
  - Position: Vertically centered, ~50-60% of viewport height (20vh to 80vh)
  - Location: Flush to viewport edge (left: 0px for left sidebar, right: 0px for right sidebar)
  - Width: 3px
  - Color: Semi-transparent theme color (rgba)
  - Visual: Subtle, doesn't obstruct content
  - Touch target: Extends ~20px into viewport for swipe gesture

- **Toggle Button:**
  - Position: Top of separator bar (e.g., top: 20vh)
  - Location: Flush to viewport edge with separator
  - Visual size: 30x30px (compact, doesn't obstruct content)
  - Touch target: 44x44px (meets accessibility standards via CSS padding)
  - Icon: `►` for left sidebar, `◄` for right sidebar
  - Style: Rounded, semi-transparent background, subtle shadow
  - Z-index: Above content, below overlay backdrop

**Open State:**
- **Sidebar:**
  - Position: `position: fixed`, full viewport height
  - Width: Configurable (default 85% of viewport width, remaining shows backdrop)
  - Location: Flush to edge (left: 0 for left, right: 0 for right)
  - Background: Solid (same as desktop sidebar)
  - Shadow: Significant drop shadow on open edge (lifts visually)
  - Z-index: Above backdrop, below header

- **Backdrop:**
  - Position: `position: fixed`, covers viewport behind sidebar
  - Background: Semi-transparent black (rgba(0,0,0,0.5))
  - Dismissible: Tap to close sidebar
  - Z-index: Above content, below sidebar

- **Close Button:**
  - Position: Inside sidebar, top corner (opposite to opening edge)
    - Left sidebar: top-right corner of sidebar
    - Right sidebar: top-left corner of sidebar
  - Visual size: 36x36px (larger than open button, room inside sidebar)
  - Touch target: 48x48px (via CSS padding)
  - Icon: `◄` for left sidebar, `►` for right sidebar
  - Style: Similar to desktop close button

#### Interaction Patterns

**Opening Sidebar:**
1. **Primary**: Tap toggle button at viewport edge
   - Visual: 30x30px button
   - Touch: 44x44px effective area
   - Action: Sidebar slides in from edge
2. **Secondary**: Swipe from edge (power user, configurable)
   - Touch area: Separator + ~20px into viewport
   - Swipe right on left edge (for left sidebar)
   - Swipe left on right edge (for right sidebar)
   - Animation: Follows finger during swipe

**Closing Sidebar:**
1. **Primary**: Tap close button inside sidebar
2. **Secondary**: Tap backdrop (outside sidebar)
3. **Tertiary**: Swipe sidebar towards edge (if swipe enabled)
   - Swipe left (for left sidebar)
   - Swipe right (for right sidebar)

#### Animations

**Open Animation:**
- Duration: 250ms
- Easing: cubic-bezier(0.4, 0.0, 0.2, 1) (Material standard)
- Sidebar: Slides in from edge (transform: translateX)
- Backdrop: Fades in (opacity: 0 → 0.5)
- Simultaneous: Both animate together

**Close Animation:**
- Duration: 200ms (slightly faster)
- Easing: cubic-bezier(0.4, 0.0, 0.6, 1)
- Sidebar: Slides out to edge (transform: translateX)
- Backdrop: Fades out (opacity: 0.5 → 0)
- Simultaneous: Both animate together

#### Configuration

**Configurable Settings (app.conf):**
```javascript
sidebar: {
    left: {
        // ... desktop settings ...
        mobile: {
            width: '85%',          // Sidebar width (default: 85%, range: 75-95%)
        }
    },
    right: {
        // ... desktop settings ...
        mobile: {
            width: '85%',
        }
    },
    mobile: {
        breakpoint: 768,           // px - switch to mobile mode (default: 768)
        swipeEnabled: true,        // Enable swipe gestures (default: true)
    }
}
```

**Hardcoded (not configurable):**
- Behavior: Always 'overlay' on mobile (ignores desktop `behavior` setting)
- Toggle button sizes: 30x30px visual, 44x44px touch (accessibility)
- Separator: 3px wide, 60vh height, centered
- Backdrop opacity: rgba(0,0,0,0.5)
- Animation timing: 250ms open, 200ms close
- Only one sidebar open at a time

#### Consistency with Desktop

**Visual Continuity:**
- Separator at same relative position (centered vertically)
- Toggle button at top of separator (same visual hierarchy)
- Close button in same position (top of sidebar)
- Users see familiar elements in same locations

**Behavioral Differences (mobile-specific):**
- Sidebar always overlay (never reflow on mobile)
- Separator/button at viewport edge (not `.jp-main` padding edge)
- Swipe gestures enabled (configurable)
- Backdrop dismissal
- Only one sidebar open at a time

#### Accessibility

**Touch Targets:**
- Open button: 44x44px effective area (30x30px visual via CSS padding/margin trick)
- Close button: 48x48px effective area (36x36px visual)
- Separator: Full 60vh height × ~20px width for swipe

**ARIA:**
- `aria-expanded="false"` on closed sidebar
- `aria-expanded="true"` on open sidebar
- `aria-label="Open left sidebar"` on open button
- `aria-label="Close left sidebar"` on close button

**Focus Management:**
- When sidebar opens: Focus moves to first interactive element
- When sidebar closes: Focus returns to toggle button
- Backdrop is focusable (keyboard dismissal)

#### Edge Cases

**Very Small Screens (<375px):**
- Sidebar width: 90% (more backdrop visible)
- Toggle button: Keep at 30x30px visual (doesn't scale down)

**Landscape Orientation:**
- Keep same design (works well in landscape)
- Backdrop more visible (helps user orientation)

**Multiple Sidebars:**
- Only one sidebar can be open at a time on mobile
- Opening one closes the other automatically
- Both toggle buttons always visible when closed

**Content Protection:**
- Toggle button at viewport edge doesn't obstruct content
- `.jp-main` padding (30px) keeps content away from edges
- Separator in "dead zone" (padding area)

## Implementation Phases

### Phase 1: Core Infrastructure & Helper Enhancement

**Goal**: Enable dynamic component rendering and basic sidebar structure

**Tasks**:
1. **Enhance `{{components}}` helper** (`webapp/controller/handlebar.js`)
   - Add support for `name` parameter: `{{components name="sidebar.toc"}}` or `{{components name=(this)}}`
   - Handle dynamic component lookup from component registry
   - Support all syntax variants: string literal, variable, vars, and `(this)` in `#each` loops
   - Note: `#each` just needs to set the `this` context variable; nested handling will expand context variables automatically
   - Error handling: Same as existing `components.namespace.name` handling (no special handling needed)
   - Update helper documentation in `HANDLEBARS_DESCRIPTIONS`

2. **Create sidebar component definitions** (`webapp/view/components/jpulse-sidebars.tmpl`)
   - Define `sidebar.siteNav` component (skeleton, populated by JS)
   - Define `sidebar.toc` component (skeleton, populated by JS)
   - Define `sidebar.pageComponentLeft` component (skeleton)
   - Define `sidebar.pageComponentRight` component (skeleton)
   - All components must include `jp-sidebar-component` class
   - Self-contained components can/should include JavaScript code, initiated in `jPulse.dom.ready()`
   - Components are self-contained units with their own HTML, CSS (if needed), and JavaScript
   - **Important**: JavaScript in component definitions does NOT execute during registration
     - Component `blockContent` is stored as raw template string (not expanded) during `{{#component}}` registration
     - JavaScript only executes when component is rendered via `{{components.name}}` and script tags are output to HTML
     - Verified: `_handleComponentDefinition()` stores `blockContent` directly without expansion (line 1492)
     - Verified: `_handleComponentCall()` expands template via `_expandHandlebars()` only when component is used (line 1562)

3. **Load sidebar components** (`webapp/view/jpulse-header.tmpl`)
   - Include `components/jpulse-sidebars.tmpl` after SVG icons
   - Conditionally include `components/site-sidebars.tmpl` if exists
   - Components registered but not rendered until selected

4. **Add sidebar HTML structure** (`webapp/view/jpulse-footer.tmpl`)
   - Add left sidebar container with conditional rendering based on `view.pageDecoration.sidebarLeft.enabled`
   - Add right sidebar container with conditional rendering based on `view.pageDecoration.sidebarRight.enabled`
   - Use `{{components name=(this)}}` to render components from config array
   - Add separator bars for both sidebars
   - Add toggle buttons (`[◄]` and `[►]`) on separator bars

5. **Add app.conf configuration** (`webapp/app.conf`)
   - Add `view.pageDecoration.sidebarLeft` configuration
   - Add `view.pageDecoration.sidebarRight` configuration
   - Default: left enabled (toggle, closed), right enabled (toggle, closed) for TOC

6. **Basic CSS** (`webapp/view/jpulse-common.css`)
   - Base sidebar classes: `.jp-sidebar`, `.jp-sidebar-left`, `.jp-sidebar-right`
   - State classes: `.jp-sidebar-open`, `.jp-sidebar-closed`
   - Behavior classes: `.jp-sidebar-reflow`, `.jp-sidebar-overlay`, `.jp-sidebar-auto`
   - Component class: `.jp-sidebar-component` (common styling)
   - Separator bar styling: `.jp-sidebar-separator`
   - Toggle button styling: `.jp-sidebar-toggle`, `[◄]` and `[►]` buttons

7. **Basic JavaScript API** (`webapp/view/jpulse-common.js`)
   - Create `jPulse.UI.sidebars` namespace
   - Implement `init()` method (reads config, initializes sidebars)
   - Implement `toggle()`, `open()`, `close()` methods
   - Implement `getState()` method
   - Basic localStorage persistence for sidebar state
   - Initialize in `jpulse-footer.tmpl` with config from server

**Deliverables**:
- Enhanced `{{components}}` helper with `name` parameter support
- Sidebar component definitions file
- Sidebar HTML structure in footer template
- Basic CSS for sidebar layout
- Basic JavaScript API for sidebar control
- Configuration in app.conf

**Testing**:
- Unit tests for enhanced `{{components}}` helper
- Unit tests for `jPulse.UI.sidebars` API methods
- Manual test: Sidebars render with correct components
- Manual test: Toggle buttons work
- Manual test: State persists in localStorage

**Estimated Time**: 8-12 hours

---

### Phase 2: Component Implementation

**Goal**: Implement functional sidebar components

**Tasks**:
1. **Implement `sidebar.siteNav` component** (`webapp/view/components/jpulse-sidebars.tmpl`)
   - Render navigation structure from `jPulse.UI.navigation`
   - Support context parameter (which nav section to show)
   - Role-based filtering
   - Active state highlighting based on current URL
   - JavaScript initialization code within component (self-contained)
   - Use `jPulse.dom.ready()` for initialization

2. **Implement `sidebar.toc` component** (`webapp/view/components/jpulse-sidebars.tmpl`)
   - Auto-generate TOC from page headings (h2, h3)
   - Configurable selector via data attribute
   - Scroll-to functionality with offset
   - Active section highlighting while scrolling
   - JavaScript initialization code within component (self-contained)
   - Use `jPulse.dom.ready()` for initialization

3. **Implement `sidebar.pageComponentLeft/Right` components** (`webapp/view/components/jpulse-sidebars.tmpl`)
   - Skeleton structure (already defined in Phase 1)
   - JavaScript API: `jPulse.UI.sidebars.initComponent(componentName, config)`
   - Support `content`, `onLoad`, `refresh` callbacks
   - Integration with existing `jPulse.UI.docs` for markdown pages

4. **Component rendering pipeline**
   - Ensure components render in order specified in app.conf
   - Handle missing components gracefully (log error, skip)
   - Support site component overrides

5. **Update existing markdown docs page** (`webapp/view/jpulse-docs/index.shtml`)
   - Remove hardcoded sidebar HTML
   - Use `sidebar.pageComponentLeft` component
   - Update JavaScript to use `jPulse.UI.sidebars.initComponent()`
   - Remove custom CSS (use framework classes)

**Deliverables**:
- Functional `sidebar.siteNav` component
- Functional `sidebar.toc` component
- Functional `sidebar.pageComponentLeft/Right` components
- `initComponent()` API implementation
- Updated markdown docs page using new sidebar system

**Testing**:
- Unit tests for each component's JavaScript logic
- Integration test: Site nav renders correctly
- Integration test: TOC generates from page headings
- Integration test: Markdown docs page uses new sidebar
- Manual test: All components work together

**Estimated Time**: 10-14 hours

---

### Phase 3: Page Preferred State & User Preferences

**Goal**: Allow pages to set preferred sidebar state and user customization

**Tasks**:
1. **Implement page preferred state system** (`webapp/view/jpulse-common.js`)
   - `setPreferredState(sidebar, state)` API
   - Respect user preference to disable programmatic toggle
   - Apply preferred state on page load (if allowed)
   - Store in temporary state (not localStorage, per-page)

2. **User preferences (localStorage)** (`webapp/view/jpulse-common.js`)
   - `getUserPreference(key)`, `setUserPreference(key, value)`, `getUserPreferences()` APIs
   - Store `sidebarLeftWidth`, `sidebarRightWidth` (custom widths)
   - Store `allowProgrammaticToggle` flag (default: true)
   - Apply custom widths on sidebar initialization

3. **Integrate with existing systems**
   - Update `jPulse.UI.docs.init()` to set preferred state to 'open' for doc pages
   - Toast notification when app needs sidebar but user disabled programmatic toggle
   - Respect user's manual toggle overrides

4. **State persistence**
   - Sidebar open/closed state persists in localStorage (per sidebar)
   - User custom widths persist in localStorage
   - Preferred state is temporary (per page load)

**Deliverables**:
- `setPreferredState()` API
- User preferences API (localStorage)
- Integration with markdown docs
- Toast notification system
- State persistence

**Testing**:
- Unit tests for preferred state system
- Unit tests for user preferences API
- Integration test: Doc pages set preferred state
- Manual test: User can disable programmatic toggle
- Manual test: Custom widths persist

**Estimated Time**: 6-8 hours

---

### Phase 4: Desktop UX & Interactions

**Goal**: Complete desktop sidebar experience with drag-to-resize and smooth interactions

**Tasks**:
1. **Separator bar interactions** (`webapp/view/jpulse-common.js`, `jpulse-common.css`)
   - Double-click to toggle sidebar
   - Visual `[◄]` and `[►]` buttons at top of separator bar
   - Hover states for separator bar
   - Drag-to-resize functionality
   - Width constraints (min/max)
     - drag beyond min width sets state to closed (no update of width in localStorage)
   - Update localStorage on resize

2. **Visual states**
   - Sidebar on: gray background, separator flush to sidebar
   - Sidebar off: separator flush to page container edge
   - Smooth transitions for open/close
   - Reflow vs overlay behavior

3. **Content layout**
   - Main content reflows around sidebar (reflow mode)
   - Main content stays full width (overlay mode)
   - Auto mode: overlay on mobile, reflow on desktop

4. **Toggle button styling**
   - Position `[◄]` and `[►]` buttons at top of separator bar
   - Visual feedback on hover/click
   - Accessibility: ARIA labels, keyboard support

**Deliverables**:
- Drag-to-resize functionality
- Double-click toggle
- Visual toggle buttons
- Smooth transitions
- Proper content layout

**Testing**:
- Manual test: Drag separator bar to resize
- Manual test: Double-click toggles sidebar
- Manual test: Toggle buttons work
- Manual test: Content reflows correctly
- Manual test: Width constraints enforced

**Estimated Time**: 6-8 hours

---

### Phase 5: Mobile Responsive & Polish

**Goal**: Complete mobile experience and final polish

**Tasks**:
1. **Mobile responsive CSS** (`webapp/view/jpulse-common.css`)
   - Media query @media (max-width: 768px)
   - Fixed positioning for sidebars
   - Separator + button positioning at viewport edge
   - Backdrop overlay styling
   - Touch-friendly sizes with extended hit areas
   - Slide animations (transform: translateX)

2. **Mobile-specific JavaScript** (`webapp/view/jpulse-common.js`)
   - Detect mobile breakpoint with `window.matchMedia`
   - Apply mobile-specific layout calculations
   - Handle backdrop click to close
   - Swipe gesture detection (if enabled in config)
   - Auto-close other sidebar when one opens

3. **Animations and transitions**
   - Smooth slide-in/out animations
   - Fade backdrop overlay
   - Performance optimization (use transform/opacity, GPU acceleration)

4. **Final polish**
   - Consistent spacing and typography
   - Loading states
   - Error states (missing components)
   - Browser compatibility testing (iOS Safari, Android Chrome)

**Deliverables**:
- Mobile responsive layout with fixed overlay
- Toggle buttons at viewport edges
- Backdrop overlay
- Smooth animations
- Touch gestures (configurable)
- Auto-close on second sidebar open

**Testing**:
- Manual test: Mobile layout works (<768px)
- Manual test: Toggle buttons work
- Manual test: Backdrop closes sidebar
- Manual test: Animations are smooth
- Manual test: Swipe gestures work (if enabled)
- Manual test: Only one sidebar open at a time
- Cross-browser testing (iOS Safari, Android Chrome)
- Accessibility testing (VoiceOver, TalkBack)

**Estimated Time**: 8-10 hours

---

### Phase 6: Documentation & Migration

**Goal**: Document the system and provide migration guides

**Tasks**:
1. **Component development guide**
   - How to create custom sidebar components
   - Component structure and requirements
   - JavaScript initialization patterns
   - Examples

2. **Site configuration guide**
   - app.conf sidebar configuration reference
   - Component selection and ordering
   - Override patterns (site-sidebars.tmpl)
   - Common configurations

3. **Migration guide**
   - Migrating from hardcoded sidebars
   - Updating markdown docs pages
   - Converting custom sidebars to components
   - Breaking changes and compatibility

4. **API documentation**
   - `jPulse.UI.sidebars` API reference
   - Component initialization patterns
   - User preferences API
   - Examples and use cases

5. **Update framework documentation**
   - Add sidebar system to main docs
   - Update navigation documentation
   - Add to examples page

**Deliverables**:
- Component development guide
- Site configuration guide
- Migration guide
- API documentation
- Updated framework docs

**Estimated Time**: 4-6 hours

---

## Implementation Summary

**Total Estimated Time**: 40-56 hours

**Dependencies**:
- Phase 1 must complete before Phase 2 (components need helper)
- Phase 2 must complete before Phase 3 (components need to exist)
- Phase 3 can run parallel with Phase 4 (different concerns)
- Phase 5 depends on Phase 4 (mobile needs desktop working)
- Phase 6 can start after Phase 2 (documentation can begin early)

**Critical Path**:
1. Phase 1: Core Infrastructure (blocks everything)
2. Phase 2: Component Implementation (blocks Phase 3)
3. Phase 3 & 4: Can run in parallel
4. Phase 5: Mobile (depends on Phase 4)
5. Phase 6: Documentation (can start early, finish last)

## Open Questions

1. **Component Rendering**: Enhanced components helper implementation
   - Extend `{{components}}` helper to support `name` parameter for dynamic access
   - `{{#each}}` already sets `this` context variable; nested handling will expand context variables automatically
   - Implementation needed in `webapp/controller/handlebar.js`
   - Syntax: `{{components name=(this)}}` in `{{#each}}` loop
   - Error handling: Same as existing `components.namespace.name` handling (no special handling needed)

2. **User Preferences GUI**: Drop feature?
   - localStorage API is easy to implement
   - GUI requires significant effort
   - Recommendation: Drop GUI for now, keep API for future
     - A: drop for now (but still use localStorage to store customize sidebars widths)

3. **Right Sidebar Use Cases**:
   - What are common right sidebar use cases?
   - Should TOC be left or right by default?
     - **Decision**: Right side (TOC typically on right in documentation)
   - **Decision**: Enable right sidebar by default for TOC, toggle mode, initially closed

4. **Accessibility**:
   - Focus trap when sidebar open?
     - A: not needed
   - Escape key to close?
     - A: not needed
   - Screen reader announcements?
     - A: not needed
   - Keyboard navigation for separator bar drag?
     - A: not needed

## Next Steps

1. Review and refine this brainstorming document
2. Decide on open questions
3. Create detailed implementation plan
4. Start Phase 1 implementation

---

## Tech Debt

### 1. New 'hover' mode
- if enabled:
- similar to mode 'toggle'
- close pos: separator looks the same, but no toggle button
  - or keep toggle button to lock open pos?
- open pos: same sidebar look, but without separator and toggle button
- actions:
  - hover over & near separator to temporarily open sidebar (with animation)
  - sidebar remains open until mouse moves outside sidebar (with some delay)
  - select item (click on link) to take action

### 2. Sticky sidebar option
- if enabled:
- when scrolling down, sidebar scrolls until it touches the banner, then sticks at that pos
- in case sidebar content is taller than viewport, sidebar content can be scrolled (mouse wheel or scrollbar)
- useful for TOC component

### 3. Use actual sidebar height option
- if enabled:
- use up actual vertical space needed by content, i.e. not to bottom of page
- useful when 'overflow' mode is active

### 4. Convoluted sidebar code
- webapp/view/jpulse-common.js needs to be refactored so that humans can mainatin it
- code is fragile and took more than a week to stabilize

