# jPulse Docs / jPulse.UI Widget Reference v1.3.10

Complete reference documentation for all `jPulse.UI.*` widgets available in the jPulse Framework front-end JavaScript library.

**🎯 Live Examples:** See the [UI Widgets Examples](/jpulse-examples/ui-widgets.shtml) page for interactive demonstrations of all widgets with working code.

**💡 Quick Links:**
- [Toast Notifications](#toast-notifications) - Non-blocking slide-down messages
- [Dialog Widgets](#dialog-widgets) - Modal dialogs (alert, info, success, confirm)
- [Collapsible Components](#collapsible-components) - Expandable/collapsible sections
- [Accordion Component](#accordion-component) - Grouped sections with mutual exclusion
- [Tab Interface](#tab-interface) - Navigation and panel tabs
- [Source Code Display](#source-code-display) - Syntax-highlighted code blocks
- [Pagination Helper](#pagination-helper) - Cursor-based pagination state management

---

## Toast Notifications

Display non-blocking slide-down messages with smooth animations and intelligent stacking.

### Basic Usage

```javascript
// Success, error, info, and warning messages
jPulse.UI.toast.success('Operation completed successfully!'); // 3s duration
jPulse.UI.toast.error('Please check your input and try again.'); // 6s duration
jPulse.UI.toast.info('Your session will expire in 5 minutes.'); // 3s duration
jPulse.UI.toast.warning('This action cannot be undone.'); // 5s duration

// Custom duration (overrides config defaults)
jPulse.UI.toast.show('Custom message', 'info', 10000);

// Clear all toast notifications
jPulse.UI.toast.clearAll();
```

### API Reference

#### `jPulse.UI.toast.show(message, type, duration)`
Show a toast notification with custom type and duration.

**Parameters:**
- `message` (string): The message to display
- `type` (string): Message type: `'info'`, `'error'`, `'success'`, `'warning'` (default: `'info'`)
- `duration` (number): Auto-hide duration in ms (0 = no auto-hide, uses config if not specified)

**Returns:** `Element` - The created toast message element

#### `jPulse.UI.toast.success(message)`
Show success toast notification (green styling, 3s duration).

#### `jPulse.UI.toast.error(message)`
Show error toast notification (red styling, 6s duration).

#### `jPulse.UI.toast.info(message)`
Show info toast notification (blue styling, 3s duration).

#### `jPulse.UI.toast.warning(message)`
Show warning toast notification (yellow styling, 5s duration).

#### `jPulse.UI.toast.clearAll()`
Clear all currently displayed toast notifications.

### Features
- **Non-blocking**: Messages overlay content without shifting page layout
- **Smooth animations**: 0.6s slide transitions from behind header
- **Dynamic stacking**: Multiple messages stack intelligently with 5px gaps
- **Responsive design**: Adapts to screen size using `appConfig.view.toastMessage` settings
- **Independent timing**: Each message respects its configured duration without interference

---

## Dialog Widgets

Modal dialogs for user interactions with draggable headers, stacking support, and customizable styling.

### Alert Dialog

Show alert dialog with red header styling.

```javascript
// Simple usage
await jPulse.UI.alertDialog('This is an alert message!');

// With title as 2nd parameter (string)
await jPulse.UI.alertDialog('Warning: This action cannot be undone.', 'Warning');

// With options object
await jPulse.UI.alertDialog('Custom alert message', {
    title: 'Custom Alert',
    minWidth: 400,
    minHeight: 200
});
```

**API:** `jPulse.UI.alertDialog(message, titleOrOptions)`

**Parameters:**
- `message` (string): The message to display (supports simple HTML)
- `titleOrOptions` (string|Object): Title string or options object (if object, title is in `options.title`)

**Returns:** `Promise<void>` - Resolves when dialog is closed

### Info Dialog

Show info dialog with blue header styling.

```javascript
// Simple usage
await jPulse.UI.infoDialog('This is an informational message.');

// With title as 2nd parameter (string) - NEW in v1.0.4
await jPulse.UI.infoDialog('Operation details here.', 'Information');

// With options object
await jPulse.UI.infoDialog('<p>This dialog supports <b>HTML content</b>.</p>', {
    title: 'Custom Content',
    minWidth: 400,
    minHeight: 200
});
```

**API:** `jPulse.UI.infoDialog(message, titleOrOptions)`

**Parameters:** Same as `alertDialog()`

**Returns:** `Promise<void>` - Resolves when dialog is closed

### Success Dialog

Show success dialog with green header styling. **New in v1.0.4**

```javascript
// With title as 2nd parameter
await jPulse.UI.successDialog('Operation completed successfully!', 'Success');

// With options object
await jPulse.UI.successDialog('Data saved successfully.', {
    title: 'Success',
    minWidth: 350
});
```

**API:** `jPulse.UI.successDialog(message, titleOrOptions)`

**Parameters:** Same as `alertDialog()`

**Returns:** `Promise<void>` - Resolves when dialog is closed

### Confirm Dialog

Show confirm dialog with custom buttons and callbacks. Most flexible dialog option.

```javascript
// Simple confirmation with array of buttons
const result = await jPulse.UI.confirmDialog({
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    buttons: ['Cancel', 'Yes, Continue']
});

if (result.button === 'Yes, Continue') {
    // User confirmed
    console.log('Confirmed:', result.confirmed); // true
    console.log('Button index:', result.buttonIndex); // 1
}

// Advanced: Custom callbacks with button objects
const result = await jPulse.UI.confirmDialog({
    title: 'Delete Files',
    message: 'Select files to delete:',
    buttons: {
        'Cancel': () => false, // Close dialog
        'Delete Selected': async (dialog) => {
            // Custom logic - can prevent dialog from closing
            const checkboxes = dialog.querySelectorAll('input:checked');
            if (checkboxes.length === 0) {
                await jPulse.UI.alertDialog('Please select at least one file.');
                return { dontClose: true }; // Keep dialog open
            }
            return true; // Close dialog
        }
    },
    onOpen: (dialog) => {
        // Called when dialog opens
    },
    onClose: () => {
        // Called when dialog closes
    }
});
```

**API:** `jPulse.UI.confirmDialog(options)`

**Parameters:**
- `options` (Object): Configuration options
  - `title` (string): Dialog title (default: i18n `confirmDialog.title` or 'Confirm')
  - `message` (string): Dialog message (default: 'Are you sure?')
  - `buttons` (Array|Object): Button configuration
    - Array: `['Cancel', 'OK']` - Returns result with `button`, `confirmed`, `buttonIndex`
    - Object: `{ 'Cancel': () => {}, 'OK': () => {} }` - Custom callbacks
  - `type` (string): Dialog type for styling: `'alert'`, `'info'`, `'success'`, `'confirm'` (default: `'confirm'`)
  - `width` (number|string): Dialog width
  - `minWidth` (number): Minimum dialog width (default: 400)
  - `height` (number|string): Dialog height
  - `minHeight` (number): Minimum dialog height (default: 200)
  - `zIndex` (number): Custom z-index (default: auto-calculated)
  - `onOpen` (Function): Callback when dialog opens
  - `onClose` (Function): Callback when dialog closes

**Returns:** `Promise<Object>` - Resolves with user choice:
- `confirmed` (boolean): True if user clicked a non-cancel button
- `button` (string): The button text that was clicked
- `buttonIndex` (number): Index of clicked button (for array buttons)
- `cancelled` (boolean): True if dialog was closed with ESC key

### Dialog Features
- **Draggable headers**: All dialogs can be dragged by their header
- **Dialog stacking**: Multiple dialogs stack with automatic z-index management
- **HTML support**: Message content supports simple HTML (site owner controlled)
- **Keyboard support**: ESC key closes dialogs
- **Focus management**: Automatic focus trapping for accessibility
- **i18n support**: Default titles and buttons from translation system

---

## Collapsible Components

Expandable/collapsible sections with smooth animations and programmatic control.

### Basic Usage

```javascript
// Register a collapsible section and get handle
const securityCollapsible = jPulse.UI.collapsible.register('securitySection', {
    initOpen: false,
    onOpen: () => {
        // Show password fields when opened
        const passwordFields = document.getElementById('passwordFields');
        jPulse.dom.show(passwordFields);
    },
    onClose: () => {
        // Hide password fields when closed
        jPulse.dom.hide(document.getElementById('passwordFields'));
    }
});

// Use the handle for programmatic control
if (securityCollapsible.isExpanded()) {
    securityCollapsible.collapse();
}

securityCollapsible.expand();
securityCollapsible.toggle();
```

### HTML Structure

```html
<div id="securitySection" class="jp-collapsible">
    <h3>Security Settings</h3>
    <div class="jp-collapsible-content">
        <!-- Collapsible content here -->
    </div>
</div>
```

### API Reference

#### `jPulse.UI.collapsible.register(elementId, config)`

**Parameters:**
- `elementId` (string): The ID of the `.jp-collapsible` element
- `config` (Object): Configuration options
  - `initOpen` (boolean): Whether to start expanded (default: `false`)
  - `onOpen` (Function): Callback when opened
  - `onClose` (Function): Callback when closed

**Returns:** `Object` - Handle object with methods:
- `elementId`: The element ID
- `toggle()`: Toggle expanded/collapsed state
- `expand()`: Expand the section
- `collapse()`: Collapse the section
- `isExpanded()`: Returns `true` if currently expanded

### Features
- **Smooth animations**: CSS transitions for expand/collapse
- **Arrow indicators**: Automatic arrow rotation based on state
- **Event callbacks**: `onOpen` and `onClose` hooks
- **Programmatic control**: Full API for JavaScript control

---

## Accordion Component

Grouped sections with mutual exclusion (only one section open at a time).

### Basic Usage

```javascript
// Register an accordion with automatic decoration detection
const demoAccordion = jPulse.UI.accordion.register('demo-accordion', {
    exclusive: true,        // Only one section open at a time
    initOpen: 0,            // Index of section to open initially (null = none)
    onSectionChange: (openIndex, clickedIndex) => {
        console.log(`Section ${clickedIndex} clicked, ${openIndex} is now open`);
    }
});

// Programmatic control
demoAccordion.openSection(1);      // Open section at index 1
demoAccordion.closeAll();          // Close all sections
const openIndex = demoAccordion.getOpenSection(); // Get currently open section index
```

### HTML Structure

```html
<div id="demo-accordion" class="jp-accordion">
    <div class="jp-accordion-section">
        <h4>Getting Started</h4>
        <div class="jp-accordion-content">
            <p>Content for getting started section...</p>
        </div>
    </div>
    <div class="jp-accordion-section">
        <h4>Advanced Features</h4>
        <div class="jp-accordion-content">
            <p>Content for advanced features section...</p>
        </div>
    </div>
</div>
```

### API Reference

#### `jPulse.UI.accordion.register(elementId, options)`

**Parameters:**
- `elementId` (string): The ID of the `.jp-accordion` element
- `options` (Object): Configuration options
  - `exclusive` (boolean): Only one section open at a time (default: `true`)
  - `initOpen` (number|null): Index of section to open initially (default: `null`)
  - `onSectionChange` (Function): Callback when section changes
    - Parameters: `(openIndex, clickedIndex)`

**Returns:** `Object` - Handle object with methods:
- `elementId`: The element ID
- `openSection(index)`: Open section at specified index
- `closeAll()`: Close all sections
- `getOpenSection()`: Get currently open section index (returns `-1` if none)

### Features
- **Mutual exclusion**: Only one section open at a time (configurable)
- **Automatic decoration**: Detects accordion structure from HTML
- **Smooth animations**: CSS transitions for section expand/collapse
- **Event callbacks**: `onSectionChange` hook for section transitions

---

## Tab Interface

Navigation tabs (URL-based) and panel tabs (content switching) with automatic type detection.

### Basic Usage

#### Navigation Tabs (URL-based)

```javascript
// Register navigation tabs that link to different URLs
const navTabs = jPulse.UI.tabs.register('main-nav-tabs', {
    tabs: [
        { id: 'home', label: 'Home', url: '/' },
        { id: 'docs', label: 'Documentation', url: '/docs/' },
        { id: 'api', label: 'API', url: '/api/' }
    ],
    linkActiveTab: true,  // Make active tab clickable
    responsive: 'scroll'  // Scroll on mobile, wrap on desktop
});

// Programmatic control
navTabs.activateTab('docs');
const activeTab = navTabs.getActiveTab();
```

#### Panel Tabs (Content switching)

```javascript
// Register panel tabs that switch content panels
const panelTabs = jPulse.UI.tabs.register('content-tabs', {
    tabs: [
        { id: 'overview', label: 'Overview', panelId: 'overview-panel' },
        { id: 'details', label: 'Details', panelId: 'details-panel' },
        { id: 'settings', label: 'Settings', panelId: 'settings-panel' }
    ],
    activeTab: 'overview',
    slideAnimation: true
});
```

### HTML Structure

#### Navigation Tabs
```html
<div id="main-nav-tabs" class="jp-tabs"></div>
<!-- Tabs are automatically generated -->
```

#### Panel Tabs
```html
<div id="content-tabs" class="jp-tabs">
    <div class="jp-tabs-panels">
        <div id="overview-panel" class="jp-tabs-panel">
            Overview content here
        </div>
        <div id="details-panel" class="jp-tabs-panel">
            Details content here
        </div>
    </div>
</div>
```

### API Reference

#### `jPulse.UI.tabs.register(elementId, options, activeTabId)`

**Parameters:**
- `elementId` (string): The ID of the `.jp-tabs` element
- `options` (Object): Configuration options
  - `tabs` (Array): Array of tab objects:
    - Navigation tabs: `{ id, label, url, icon? }`
    - Panel tabs: `{ id, label, panelId, icon? }`
  - `activeTab` (string|null): Active tab ID (default: `null`, auto-detected from URL for nav tabs)
  - `linkActiveTab` (boolean): Make active tab clickable for nav tabs (default: `false`)
  - `responsive` (string): Responsive behavior: `'scroll'` or `'wrap'` (default: `'scroll'`)
  - `onTabChange` (Function): Callback when tab changes
  - `panelWidth` (number|string): Panel container width (panel tabs only)
  - `panelHeight` (number|string): Panel container height (panel tabs only)
  - `slideAnimation` (boolean): Enable slide animation for panel tabs (default: `true`)
- `activeTabId` (string|null): Override active tab (optional, overrides `options.activeTab`)

**Returns:** `Object` - Handle object with methods:
- `elementId`: The element ID
- `tabType`: `'navigation'` or `'panel'`
- `activateTab(tabId)`: Activate specified tab
- `getActiveTab()`: Get currently active tab ID
- `refresh()`: Refresh tab interface
- `destroy()`: Clean up tab interface

### Features
- **Automatic type detection**: Detects navigation vs panel tabs from configuration
- **URL-based activation**: Navigation tabs auto-activate based on current URL
- **Responsive design**: Scroll on mobile, wrap on desktop
- **Slide animations**: Smooth transitions for panel tabs
- **Icon support**: Optional icons for tab labels

---

## Source Code Display

Syntax-highlighted code blocks with copy-to-clipboard functionality.

### Basic Usage

```html
<!-- Automatic initialization on page load -->
<div class="jp-source-code" data-lang="javascript">
    function hello() {
        console.log('Hello, world!');
    }
</div>

<!-- With copy button -->
<div class="jp-source-code" data-lang="python" data-show-copy="true">
    def hello():
        print("Hello, world!")
</div>

<!-- Show language label -->
<div class="jp-source-code" data-lang="html" data-show-lang="true">
    <div>Hello, world!</div>
</div>
```

### JavaScript API

```javascript
// Initialize all source code blocks on page
jPulse.UI.sourceCode.initAll();

// Initialize a specific element
const codeElement = document.querySelector('.jp-source-code');
jPulse.UI.sourceCode.init(codeElement);
```

### HTML Attributes

- `data-lang`: Language for syntax highlighting (e.g., `'javascript'`, `'python'`, `'html'`, `'css'`)
- `data-show-copy`: Show copy-to-clipboard button (default: `true`, set to `'false'` to hide)
- `data-show-lang`: Show language label (default: `false`, set to `'true'` to show)

### Features
- **Syntax highlighting**: Automatic syntax highlighting based on language
- **Copy to clipboard**: One-click copy functionality
- **Language labels**: Optional language indicator
- **Auto-initialization**: Automatically initializes on page load

---

## Pagination Helper

Client-side pagination state management for cursor-based and offset-based pagination in admin views.

### Basic Usage

```javascript
// Create pagination state
let paginationState = jPulse.UI.pagination.createState();

// Update state from API response
jPulse.UI.pagination.updateState(paginationState, response.pagination);

// Update button disabled states
jPulse.UI.pagination.updateButtons(paginationState, 'prevBtn', 'nextBtn');

// Format range display: "Showing 1-50 of 238"
const rangeText = jPulse.UI.pagination.formatRange(
    paginationState,
    itemCount,
    'Showing %START%-%END% of %TOTAL%'
);
```

### API Reference

#### `jPulse.UI.pagination.createState()`
Create a new, clean pagination state object.

**Returns:** `object` - Initial state with `nextCursor`, `prevCursor`, `total`, `hasMore`, `currentStart`

#### `jPulse.UI.pagination.resetState(state)`
Reset pagination state to initial values.

**Parameters:**
- `state` (object): The pagination state object to reset

#### `jPulse.UI.pagination.updateState(state, paginationData)`
Update pagination state from an API response.

**Parameters:**
- `state` (object): The current pagination state object
- `paginationData` (object): The pagination object from API response

#### `jPulse.UI.pagination.formatRange(state, count, template)`
Format the pagination range string.

**Parameters:**
- `state` (object): The current pagination state object
- `count` (number): Number of items on the current page
- `template` (string): i18n template string (e.g., `'Showing %START%-%END% of %TOTAL%'`)

**Returns:** `string` - Formatted range string

#### `jPulse.UI.pagination.updateButtons(state, prevBtnId, nextBtnId)`
Update the disabled state of pagination buttons.

**Parameters:**
- `state` (object): The current pagination state object
- `prevBtnId` (string): ID of the previous button
- `nextBtnId` (string): ID of the next button

#### `jPulse.UI.pagination.setupButtons(config)`
Set up event listeners for pagination buttons.

**Parameters:**
- `config.state` (object): The pagination state object
- `config.prevBtn` (string): ID of the previous button
- `config.nextBtn` (string): ID of the next button
- `config.loadFn` (Function): Function to call for loading data
- `config.getFilters` (Function): Function to get current filters
- `config.getCount` (Function): Function to get current page item count
- `config.pageSize` (number): Number of items per page

### Complete Example

```javascript
// Initialize state
let paginationState = jPulse.UI.pagination.createState();
let pageSize = 50;

// Setup button listeners
jPulse.UI.pagination.setupButtons({
    state: paginationState,
    prevBtn: 'prevPage',
    nextBtn: 'nextPage',
    loadFn: loadData,
    getFilters: () => currentFilters,
    getCount: () => document.querySelectorAll('#tableBody tr').length,
    pageSize: pageSize
});

// After API call
async function loadData(filters, cursor) {
    const params = new URLSearchParams();
    params.append('limit', pageSize);
    if (cursor) params.append('cursor', cursor);

    const result = await jPulse.api.get('/api/1/data/search?' + params);
    if (result.success) {
        displayData(result.data);
        updatePagination(result.pagination);
    }
}

function updatePagination(pagination) {
    jPulse.UI.pagination.updateState(paginationState, pagination);
    jPulse.UI.pagination.updateButtons(paginationState, 'prevPage', 'nextPage');

    const count = document.querySelectorAll('#tableBody tr').length;
    document.getElementById('pageInfo').textContent =
        jPulse.UI.pagination.formatRange(paginationState, count, i18nShowingResults);
}
```

### Features
- **Stateless cursors**: All state encoded in cursor tokens from API
- **Bidirectional navigation**: Support for both next and previous page
- **Range display**: Formatted "Showing X-Y of Z" with i18n support
- **Button management**: Automatic disabled state based on cursor availability

---

## Additional UI Components

### Navigation System

Site navigation with dropdown menus, mobile hamburger menu, and role-based access control. See [Navigation Documentation](front-end-development.md#navigation-system) for details.

### Breadcrumbs

Automatic breadcrumb trail generation based on current URL and navigation structure. See [Breadcrumbs Documentation](front-end-development.md#breadcrumbs) for details.

**Navigation Customization:** See [Site Navigation Guide](site-navigation.md) for customizing the navigation structure used by breadcrumbs.

---

## Related Documentation

- **[Front-End Development Guide](front-end-development.md)** - Complete guide with examples and best practices
- **[Style Reference](style-reference.md)** - Complete `jp-*` CSS framework
- **[UI Widgets Examples](/jpulse-examples/ui-widgets.shtml)** - Interactive demonstrations

---

*For questions about UI widgets, create an issue with the "ui-widgets" label.*
