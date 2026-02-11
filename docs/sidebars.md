# jPulse Docs / Sidebars Guide v1.6.15

Complete guide to using and configuring sidebars in the jPulse Framework for desktop and mobile.

**🎯 Live Examples:** See the [jPulse Docs](/jpulse-docs/) and [jPulse Examples](/jpulse-examples/) pages to experience sidebars in action.

**💡 Quick Links:**
- [Configuration (app.conf)](#configuration-appconf)
- [Sidebar Modes](#sidebar-modes)
- [Built-in Components](#built-in-components)
- [JavaScript API](#javascript-api-jpulseuisidebars)
- [Desktop UX](#desktop-ux)
- [Mobile UX](#mobile-ux-768px)

---

## Overview

The jPulse Framework provides a flexible, responsive sidebar system that supports left and right sidebars with multiple display modes, component-based architecture, and seamless desktop/mobile experiences.

### Key Features

- **Left and Right Sidebars**: Support for both left and right sidebars with independent configuration
- **Multiple Display Modes**: 'toggle' (user controls), 'always' (always visible), and 'hover' (desktop hover-to-open)
- **Component-Based**: Mix and match reusable sidebar components (site nav, TOC, page content, custom)
- **Responsive Design**: Optimized layouts for desktop (reflow/overlay) and mobile (fixed overlay)
- **User Preferences**: Customizable widths and programmatic toggle control (stored in localStorage)
- **Page Preferred State**: Pages can request sidebars to open/close (respects user preferences)
- **Drag-to-Resize**: Desktop users can drag separator bars to resize sidebars
- **Touch-Friendly**: Mobile-optimized with swipe gestures and large touch targets

### Use Cases

**Documentation Sites:**
- Left sidebar: Navigation through doc sections
- Right sidebar: Table of contents for current page

**Dashboards:**
- Left sidebar: Always-on navigation (mode: 'always')
- Right sidebar: Contextual widgets or filters

**Email Clients:**
- Left sidebar: Folder list (toggle mode)
- Right sidebar: Message preview or calendar

**Content Management:**
- Left sidebar: Page-specific content tree
- Right sidebar: Properties panel or recent changes

---

## Configuration (app.conf)

Sidebars are configured in `webapp/app.conf` under `view.pageDecoration.sidebar`. Site-specific overrides can be placed in `site/webapp/app.conf`.

### Basic Configuration

```javascript
view: {
    pageDecoration: {
        sidebar: {
            left: {
                enabled: true,              // Enable left sidebar
                mode: 'toggle',             // 'toggle' | 'always' | 'hover'
                initState: 'closed',        // 'open' | 'closed' (for toggle mode)
                autoCloseOnClick: false,    // Close on link click/outside click (optional)
                width: 250,                 // Default width in pixels
                behavior: 'reflow',         // 'reflow' | 'overlay'
                components: [               // Component list in order
                    'sidebar.pageComponentLeft'
                ]
            },
            right: {
                enabled: true,              // Enable right sidebar
                mode: 'hover',
                initState: 'closed',
                autoCloseOnClick: true,
                width: 300,
                behavior: 'overlay',
                components: [
                    'sidebar.pageComponentRight',
                    'sidebar.toc'
                ]
            },
            components: {
                toc: {                      // TOC component settings
                    selector: '.jp-main h2, .jp-main h3',
                    excludeSelector: 'pre, code, .jp-source-code'
                }
            },
            mobile: {                       // Global mobile settings
                breakpoint: 768,            // Switch to mobile mode (px)
                width: '85%',               // Mobile width (default: 85%)
                swipeEnabled: true          // Enable swipe gestures
            }
        }
    }
}
```

### Configuration Options

#### Per-Sidebar Settings (left/right)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable/disable sidebar (if false, no HTML rendered) |
| `mode` | string | `'toggle'` | Display mode: `'toggle'` (user controls), `'always'` (always visible), or `'hover'` (desktop hover-to-open) |
| `initState` | string | `'closed'` | Initial state for toggle mode: `'open'` or `'closed'` |
| `autoCloseOnClick` | boolean | `false` | If true, close on sidebar link click and outside click (desktop and mobile) |
| `width` | number | `250` | Default width in pixels (desktop) |
| `behavior` | string | `'reflow'` | Layout behavior: `'reflow'` (content wraps) or `'overlay'` (content behind) |
| `components` | array | `[]` | List of component names to render in order |

#### Global Mobile Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `breakpoint` | number | `768` | Viewport width (px) to switch to mobile mode |
| `width` | string | `'85%'` | Mobile sidebar width (percentage or px) |
| `swipeEnabled` | boolean | `true` | Enable swipe-to-open/close gestures |

**Note**: On mobile, sidebars always use `overlay` behavior regardless of desktop `behavior` setting.

#### Component-Specific Settings

Component settings are defined under `sidebar.components.<componentName>`. See [Built-in Components](#built-in-components) for details.

---

## Sidebar Modes

### Toggle Mode (Default)

User controls sidebar visibility via toggle buttons. State persists in sessionStorage per tab.

**Features:**
- Toggle buttons on separator bars (`[◄]` and `[►]`)
- Double-click separator bar to toggle (desktop)
- Drag separator bar to resize (desktop)
- Swipe gestures (mobile, if enabled)
- State persists per browser tab

**Best for:** Navigation, documentation, optional content

**Configuration:**
```javascript
mode: 'toggle',
initState: 'closed'  // Start closed, user can open
```

### Always Mode

Sidebar always visible, no toggle button. User cannot close it.

**Features:**
- No toggle button or separator bar
- Always uses 'reflow' behavior (ignores `behavior` setting)
- Useful for essential navigation

**Best for:** Always-needed navigation, dashboards, admin panels

**Configuration:**
```javascript
mode: 'always',
behavior: 'reflow'  // Automatically set to reflow
```

### Hover Mode (Desktop)

Hover mode is a desktop-only UX optimized for quick, low-friction access (for example, a right-side Table of Contents while reading long documentation pages).

**Behavior:**
- Opens when you hover the hover zone at the edge of `.jp-main`
- Closes when you move the mouse away (with a small delay to avoid accidental close)
- Uses overlay behavior and sticky viewport positioning so the sidebar stays accessible while you scroll
- Toggle buttons are hidden in hover mode
- Separator drag-to-resize is supported; the final width is applied when you release the mouse

**Configuration:**

```javascript
right: {
    enabled: true,
    mode: 'hover',
    width: 300,
    behavior: 'overlay',        // Hover mode uses overlay behavior
    autoCloseOnClick: true,     // Recommended for docs/TOC use cases
    components: ['sidebar.pageComponentRight', 'sidebar.toc']
}
```

---

## Built-in Components

The framework provides four built-in sidebar components. Custom components can be created in `site/webapp/view/components/site-sidebars.tmpl`. See [Sidebar Components Guide](sidebar-components.md) for development details.

### sidebar.siteNav

Renders site navigation structure from `jPulse.UI.navigation`. Same navigation structure used in the header dropdown menu.

**Features:**
- Hierarchical navigation tree
- Active page highlighting
- Role-based filtering
- Automatically updates for dynamically registered pages

**Configuration:**
```javascript
components: ['sidebar.siteNav']
```

**Example Output:**
```
📘 jPulse Docs
   Getting Started
   Installation
   📁 Plugins
      Creating Plugins
      Managing Plugins
```

### sidebar.toc

Auto-generates table of contents from page headings with smooth scroll and active highlighting.

**Features:**
- Auto-scans page headings (default: h2, h3)
- Configurable heading selector
- Excludes headings in code blocks
- Smooth scroll to section on click
- Active section highlighting while scrolling
- Updates browser URL with anchor on click
- Automatically refreshes on SPA navigation

**Configuration:**
```javascript
sidebar: {
    components: {
        toc: {
            selector: '.jp-main h2, .jp-main h3',           // Which headings to include
            excludeSelector: 'pre, code, .jp-source-code'   // Exclude headings in code
        }
    }
}
```

**Example Output:**
```
Table of Contents
  Overview
  Configuration
    Basic Setup
    Advanced Options
  API Reference
```

### sidebar.pageComponentLeft & Right

Skeleton components that provide real estate for pages/SPAs to populate sidebar content dynamically.

**Features:**
- Generic placeholder for page-specific content
- Initialized via JavaScript API
- Supports dynamic content updates
- Ideal for SPA integration

**Configuration:**

In `view.pageDecoration.sidebar.left` and `view.pageDecoration.sidebar.right`:
```javascript
components: ['sidebar.pageComponentLeft', 'sidebar.anotherComponent']
components: ['sidebar.pageComponentRight', 'sidebar.someOtherComponent']
```

**JavaScript Initialization:**
```javascript
// In page JavaScript
const component = jPulse.UI.sidebars.initComponent('sidebar.pageComponentLeft', {
    content: '<ul><li>Page Item 1</li><li>Page Item 2</li></ul>',
    onLoad: (element) => {
        console.log('Component loaded:', element);
    }
});

// Later: Update content
component.setContent('<ul><li>Updated content</li></ul>');
component.refresh();
```

**Use Cases:**
- Markdown docs navigation (SPA tree structure)
  - Reference implementation at `webapp/view/jpulse-docs/index.shtml`
- Email folder list
- File browser
- Custom page navigation

---

## JavaScript API (jPulse.UI.sidebars)

Complete API reference for controlling sidebars programmatically.

### Initialization

Sidebars are automatically initialized in `jpulse-footer.tmpl`. Manual initialization is rarely needed.

```javascript
jPulse.UI.sidebars.init({
    left: {...},     // Left sidebar config from app.conf
    right: {...},    // Right sidebar config from app.conf
    mobile: {...}    // Global mobile config from app.conf
});
```

### Control Methods

#### `open(side)`
Open a sidebar.

```javascript
jPulse.UI.sidebars.open('left');   // Open left sidebar
jPulse.UI.sidebars.open('right');  // Open right sidebar
```

#### `close(side)`
Close a sidebar.

```javascript
jPulse.UI.sidebars.close('left');
jPulse.UI.sidebars.close('right');
```

#### `toggle(side)`
Toggle sidebar state (open ↔ closed).

```javascript
jPulse.UI.sidebars.toggle('left');
```

#### `getState(side)`
Get current sidebar state.

```javascript
const state = jPulse.UI.sidebars.getState('left');
// Returns: 'open' | 'closed'

if (state === 'open') {
    console.log('Left sidebar is open');
}
```

#### `layoutAll(options)`
Force recalculation of sidebar positions and dimensions.

```javascript
// Basic usage (clears cache by default for accurate recalculation)
jPulse.UI.sidebars.layoutAll();

// Performance optimization: reuse cached viewport offsets
jPulse.UI.sidebars.layoutAll({ useCache: true });
```

**Options:**
- `useCache` (boolean, default: **false**) - Reuse cached viewport offsets instead of recalculating. Set to `true` only as a performance optimization when you're certain viewport offsets haven't changed.

**Use Cases:**
- **SPA Route Changes**: When navigating between routes with different content heights
- **Dynamic Content**: After loading content that changes page height
- **Manual Override**: When automatic ResizeObserver doesn't detect changes

**Example: SPA Route Change**
```javascript
function loadRoute(path) {
    // Hide all routes
    document.querySelectorAll('.spa-route').forEach(el => el.classList.add('jp-hidden'));

    // Show selected route
    document.getElementById(routeId).classList.remove('jp-hidden');

    // Update sidebar positions for new content height
    requestAnimationFrame(() => {
        jPulse.UI.sidebars.layoutAll();  // Cache cleared by default
    });
}
```

**Note:** The sidebar system automatically observes `.jp-main` size changes via ResizeObserver. Manual `layoutAll()` calls are only needed when the container's min-height prevents natural resizing or when content changes don't trigger observation.

### Page Preferred State

Pages can request a preferred sidebar state (e.g., docs pages prefer left sidebar open). Users can disable programmatic toggle in localStorage.

#### `setPreferredState(side, state)`
Set page's preferred sidebar state. Applies on page load if user allows programmatic toggle.

```javascript
// In page JavaScript (e.g., docs page)
jPulse.UI.sidebars.setPreferredState('left', 'open');   // Request left sidebar open
jPulse.UI.sidebars.setPreferredState('left', 'closed'); // Request left sidebar closed
jPulse.UI.sidebars.setPreferredState('left', null);     // No preference (default)
```

**Behavior:**
- Applies on page load if `allowProgrammaticToggle` is `true` (default)
- User can manually toggle at any time (manual toggle always works)
- Once user manually toggles after preferred state applied, future preferred states blocked for that page
- Resets on new page load (full page reload)
- On mobile, preferred state is ignored (mobile UX takes precedence)

**Toast Notification:**
If page needs sidebar but user disabled programmatic toggle, a toast notification suggests enabling it.

### Component Initialization

#### `initComponent(name, config)`
Initialize a page-specific component with content and callbacks.

```javascript
const component = jPulse.UI.sidebars.initComponent('sidebar.pageComponentLeft', {
    content: '<div>...</div>',  // HTML content (optional)
    onLoad: (element) => {      // Callback after content set (optional)
        console.log('Loaded:', element);
    }
});

// Returns handle object:
// - getElement(): Get component DOM element
// - setContent(html): Update component content
// - getContent(): Get current content HTML
// - refresh(): Trigger refresh (calls onLoad if defined)
// Returns null if sidebar not enabled or component not found
```

**Example: Markdown Docs Navigation**
```javascript
jPulse.dom.ready(async () => {
    const sidebarComponent = jPulse.UI.sidebars.initComponent('sidebar.pageComponentLeft', {
        onLoad: async (navElement) => {
            // Fetch doc structure
            const response = await fetch('/api/jpulse-docs/structure');
            const data = await response.json();

            // Render navigation tree
            const html = renderDocTree(data.files);
            navElement.innerHTML = html;
        }
    });

    // Set preferred state
    jPulse.UI.sidebars.setPreferredState('left', 'open');
});
```

### Custom Sidebar Location

By default, sidebars appear at the beginning of `.jp-main`. For pages with tab bars or other elements, sidebars can be positioned after a specific element.

#### `attachLeftSidebarTo(selector)` / `attachRightSidebarTo(selector)`
Attach sidebar to a custom container (e.g., below tab bar).

```javascript
// Attach left sidebar to docs container (below tab bar)
jPulse.UI.sidebars.attachLeftSidebarTo('#jpulse-docs-container');

// Sidebar will be inserted as first child of specified container
// Reflow padding applies to the custom container instead of .jp-main
```

**Example: Docs Page with Tab Bar**
```javascript
jPulse.dom.ready(() => {
    // Attach sidebar below tab bar
    jPulse.UI.sidebars.attachLeftSidebarTo('#jpulse-docs-container');

    // Initialize component
    jPulse.UI.sidebars.initComponent('sidebar.pageComponentLeft', {...});
});
```

### User Preferences

User preferences are stored in localStorage (persist across sessions).

#### `getUserPreference(key)`
Get user preference value.

```javascript
const width = jPulse.UI.sidebars.getUserPreference('jpulse-sidebar-left-width');
const allowToggle = jPulse.UI.sidebars.getUserPreference('jpulse-allow-programmatic-toggle');
// Returns value or undefined if not set
```

#### `setUserPreference(key, value)`
Set user preference value.

```javascript
jPulse.UI.sidebars.setUserPreference('jpulse-sidebar-left-width', 300);
jPulse.UI.sidebars.setUserPreference('jpulse-allow-programmatic-toggle', false);
```

#### `getUserPreferences()`
Get all user preferences as object.

```javascript
const prefs = jPulse.UI.sidebars.getUserPreferences();
// Returns: { 'jpulse-sidebar-left-width': 300, ... }
```

**Available Preferences:**
- `jpulse-sidebar-left-width` - Custom left sidebar width (number)
- `jpulse-sidebar-right-width` - Custom right sidebar width (number)
- `jpulse-allow-programmatic-toggle` - Allow pages to set preferred state (boolean, default: `true`)

---

## Desktop UX

Desktop sidebars provide rich interaction patterns for power users.

### Visual Design

**Closed State:**
- Vertical separator bar at `.jp-main` padding edge (default: 30px from container edge)
- Toggle button at top of separator: `[►]` for left, `[◄]` for right
- Separator has rounded top/bottom corners matching `.jp-main`
- Sidebar hidden (off-screen)

**Open State:**
- Sidebar visible with light gray background (`#f8f8f8`)
- Slight border (`1px #e0e0e0`) and subtle shadow
- Separator bar flush to sidebar edge (inside)
- Toggle button at top of separator: `[◄]` for left, `[►]` for right
- Rounded corners (4-6px border-radius)

**Always Mode:**
- Sidebar always visible (no closed state)
- No separator bar or toggle button
- Forces 'reflow' behavior

### Interaction Patterns

**Toggle Sidebar:**
1. Click toggle button on separator bar
2. Double-click separator bar
3. Call `jPulse.UI.sidebars.toggle('left')`

**Hover Mode (Desktop):**
- Move the mouse to the hover zone at the edge of `.jp-main` to open the sidebar
- Move the mouse away to close (after a small delay)

**Resize Sidebar:**
1. Hover over separator bar (cursor changes to `col-resize`)
2. Click and drag left/right to resize
3. Width saves to localStorage automatically
4. Minimum width enforced (can't resize too small)

**Reflow Behavior:**
- Content area shrinks to make room for sidebar
- 15px gap between sidebar and content
- Useful for documentation, navigation

**Overlay Behavior:**
- Sidebar overlays content (content stays full width)
- White gradient fade from sidebar edge to content (20px fade)
- Useful for optional content, contextual panels

### Keyboard Accessibility

- Separator bar focusable via Tab key
- Enter/Space to toggle sidebar
- Esc key support not implemented (not needed)

---

## Mobile UX (<768px)

Mobile sidebars use a fixed overlay pattern optimized for touch devices.

### Visual Design

**Closed State:**
- **Separator Bar:** Vertically centered (20vh-80vh), 3px wide, semi-transparent, flush to viewport edge
- **Toggle Button:** At top of separator (20vh), 30×30px visual size (44×44px touch target), flush to edge
- **Icon:** `►` for left sidebar, `◄` for right sidebar

**Open State:**
- **Sidebar:** `position: fixed`, full height, 85% viewport width (configurable), flush to edge
- **Backdrop:** Semi-transparent black (`rgba(0,0,0,0.5)`), covers remaining 15%, tap to close
- **Close Button:** Inside sidebar, top corner, 36×36px visual size (48×48px touch target)
- **Icon:** `◄` for left sidebar, `►` for right sidebar
- **Shadow:** Significant drop shadow for visual lift

### Interaction Patterns

**Opening Sidebar:**
1. **Tap toggle button** at viewport edge (primary)
2. **Swipe from edge** (if `swipeEnabled: true`):
   - Left sidebar: Swipe right from left edge
   - Right sidebar: Swipe left from right edge
   - Touch area: Separator + ~40px into viewport

**Closing Sidebar:**
1. **Tap close button** inside sidebar (primary)
2. **Tap backdrop** outside sidebar
3. **Swipe towards edge** (if `swipeEnabled: true`):
   - Left sidebar: Swipe left
   - Right sidebar: Swipe right

**Hamburger Menu Integration:**
- Opening hamburger menu automatically closes open sidebar
- Opening sidebar automatically closes hamburger menu
- Ensures only one overlay open at a time

**Link Click:**
- Tapping any link in sidebar automatically closes sidebar (mobile only)

### Animations

**Open Animation:**
- Duration: 250ms
- Easing: `cubic-bezier(0.4, 0.0, 0.2, 1)` (Material standard)
- Sidebar slides in via `transform: translateX()`
- Backdrop fades in (`opacity: 0 → 0.5`)

**Close Animation:**
- Duration: 200ms (slightly faster)
- Easing: `cubic-bezier(0.4, 0.0, 0.2, 1)`
- Sidebar slides out via `transform: translateX()`
- Backdrop fades out (`opacity: 0.5 → 0`)

### Touch Targets

All touch targets meet WCAG 2.1 AA standards (minimum 44×44px):
- **Open button:** 30×30px visual, 44×44px effective (via CSS padding)
- **Close button:** 36×36px visual, 48×48px effective (via CSS padding)
- **Separator:** 3px wide, ~60vh tall, ~40px swipe area

### Mobile-Specific Behavior

- **Always overlay:** Ignores desktop `behavior` setting
- **One sidebar at a time:** Opening one closes the other
- **Preferred state ignored:** Mobile UX takes precedence over page preferences
- **Swipe gestures:** Configurable via `mobile.swipeEnabled`

---

## Examples

### Documentation Site (Left Nav + Right TOC)

```javascript
sidebar: {
    left: {
        enabled: true,
        mode: 'toggle',
        initState: 'closed',
        width: 250,
        behavior: 'reflow',
        components: ['sidebar.pageComponentLeft']
    },
    right: {
        enabled: true,
        mode: 'toggle',
        initState: 'closed',
        width: 300,
        behavior: 'overlay',
        components: ['sidebar.toc']
    }
}
```

**Page JavaScript:**
```javascript
jPulse.dom.ready(async () => {
    // Initialize left sidebar with doc tree
    jPulse.UI.sidebars.initComponent('sidebar.pageComponentLeft', {
        onLoad: async (el) => {
            const data = await fetch('/api/docs/structure').then(r => r.json());
            el.innerHTML = renderDocTree(data);
        }
    });

    // Request left sidebar open for better navigation
    jPulse.UI.sidebars.setPreferredState('left', 'open');
});
```

### Dashboard (Left Always-On Navigation)

```javascript
sidebar: {
    left: {
        enabled: true,
        mode: 'always',        // Always visible, no toggle
        width: 250,
        behavior: 'reflow',    // Forced to reflow
        components: ['sidebar.siteNav']
    },
    right: {
        enabled: false
    }
}
```

### Email Client (Left Folders, Right Preview)

```javascript
sidebar: {
    left: {
        enabled: true,
        mode: 'toggle',
        initState: 'open',     // Start open
        width: 200,
        behavior: 'reflow',
        components: ['sidebar.pageComponentLeft']
    },
    right: {
        enabled: true,
        mode: 'toggle',
        initState: 'closed',
        width: 350,
        behavior: 'overlay',
        components: ['sidebar.pageComponentRight']
    }
}
```

**Page JavaScript:**
```javascript
// Populate left sidebar with folders
jPulse.UI.sidebars.initComponent('sidebar.pageComponentLeft', {
    content: '<ul><li>Inbox</li><li>Sent</li><li>Drafts</li></ul>'
});

// Populate right sidebar with message preview
jPulse.UI.sidebars.initComponent('sidebar.pageComponentRight', {
    content: '<div class="message-preview">...</div>'
});
```

---

## Troubleshooting

### Sidebar Not Showing

**Check:**
1. Is `enabled: true` in app.conf?
2. Is sidebar in 'toggle' mode and closed? Try clicking toggle button.
3. Are components defined and registered? Check browser console for errors.
4. Is `.jp-main` container present on page?

### Toggle Button Not Working

**Check:**
1. Is mode set to 'toggle' (not 'always')?
2. Check browser console for JavaScript errors
3. Try `jPulse.UI.sidebars.toggle('left')` in console

### Resize Not Working (Desktop)

**Check:**
1. Is mode 'toggle' (resize disabled in 'always' mode)?
2. Ensure cursor is over separator bar (should show `col-resize` cursor)
3. Try dragging separator bar, not toggle button

### Hover Mode Notes

- Hover mode is desktop-only. On mobile, sidebars use the mobile overlay UX and do not use hover zones.
- In hover mode, toggle buttons are hidden by design.

### Preferred State Not Applying

**Check:**
1. User preference: `localStorage.getItem('jpulse-allow-programmatic-toggle')` should be `null` or `"true"`
2. Check if mobile (preferred state ignored on mobile)
3. Call `setPreferredState()` after `jPulse.dom.ready()`

### Mobile Sidebar Too Wide/Narrow

**Check:**
1. Configure `mobile.width` in app.conf (default: `'85%'`)
2. Valid values: percentage (`'85%'`) or pixels (`'300px'`)

### Swipe Gestures Not Working

**Check:**
1. Is `mobile.swipeEnabled: true` in app.conf?
2. Start swipe close to edge (~40px from edge)
3. Swipe horizontally (not vertically)

---

## See Also

- [Sidebar Components Guide](sidebar-components.md) - Creating custom sidebar components
- [Site Navigation Guide](site-navigation.md) - Configuring site navigation
- [Template Reference](template-reference.md) - Handlebars template system
- [jPulse.UI Reference](jpulse-ui-reference.md) - JavaScript widgets and utilities

