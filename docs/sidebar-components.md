# jPulse Docs / Sidebar Components Guide v1.4.11

Guide to creating custom sidebar components for the jPulse Framework.

**💡 See Also:**
- [Sidebars Guide](sidebars.md) - Main sidebar documentation and configuration
- [Template Reference](template-reference.md) - Handlebars template system

---

## Overview

Sidebar components are reusable building blocks that can be added to left or right sidebars. Components are self-contained units with their own HTML structure, styling, and JavaScript logic.

### Component Philosophy

**Components are just components:**
- Not specific to left or right sidebars (reusable)
- Don't define their own sequence (order set in `app.conf`)
- Self-contained with HTML + JavaScript
- Follow single responsibility principle

**Component namespace:** All sidebar components use the `sidebar.*` namespace (e.g., `sidebar.toc`, `sidebar.siteNav`).

**Common class:** All components must include `jp-sidebar-component` class for common styling.

### Built-in Components

The framework provides four built-in components:
- `sidebar.siteNav` - Site navigation tree
- `sidebar.toc` - Table of contents
- `sidebar.pageComponentLeft` - Page-specific content (left)
- `sidebar.pageComponentRight` - Page-specific content (right)

See [Sidebars Guide - Built-in Components](sidebars.md#built-in-components) for usage details.

---

## Component Structure

### File Location

Sidebar components follow the standard jPulse Framework path resolution: **site → plugins → framework**.

**Framework components:**
```
webapp/view/components/jpulse-sidebars.tmpl
```

**Plugin components:**
```
plugins/my-plugin/webapp/view/components/my-plugin-sidebars.tmpl
```

**Site-specific components:**
```
site/webapp/view/components/site-sidebars.tmpl
```

**Template template (copy as starting point):**
```
site/webapp/view/components/site-sidebars.tmpl.tmpl
```

> 💡 **Plugin Support**: Plugins can define sidebar components in their `plugins/[plugin-name]/webapp/view/components/` directory. These components are automatically discovered and available for use in `app.conf`. The framework automatically includes all `components/*.tmpl` files from framework, plugins, and site in priority order (site → plugins → framework).

### Basic Template Structure

```handlebars
{{#component "sidebar.someName"}}
    <div class="jp-sidebar-component site-sidebar-some-name" id="site-sidebar-some-id">
        <!-- Component HTML structure -->
        <h3 class="jp-sidebar-component-title">Component Title</h3>
        <div class="jp-sidebar-custom-content">
            <!-- Content here -->
        </div>
    </div>

    <script>
    jPulse.dom.ready(() => {
        // Component JavaScript initialization
        console.log('Component initialized');
    });
    </script>
{{/component}}
```

### Required Elements

1. **Outer wrapper with `jp-sidebar-component` class**
   - Common styling applied to all components
   - Provides consistent spacing and layout

2. **Unique ID** (recommended)
   - Allows JavaScript to target specific component
   - Format: `site-sidebar-<component-name>`

3. **Self-contained JavaScript** (optional)
   - Wrapped in `jPulse.dom.ready()` for DOM availability
   - Executes only when component is rendered

### Component Lifecycle

1. **Registration** (`{{#component}}` in template):
   - Template content stored in component registry
   - JavaScript NOT executed yet (stored as text)

2. **Loading** (`{{file.include}}` in jpulse-header.tmpl):
   - All component definitions loaded
   - Components registered but not rendered

3. **Rendering** (`{{components name="sidebar.toc"}}` in jpulse-footer.tmpl):
   - Component template expanded with context
   - HTML output to page

4. **Execution** (browser loads page):
   - `<script>` tags in component execute
   - `jPulse.dom.ready()` callbacks fire after DOM ready

---

## Creating a Component

### Step 1: Create Component File

Create or edit `site/webapp/view/components/site-sidebars.tmpl`:

```handlebars
{{#component "sidebar.recentChanges"}}
    <div class="jp-sidebar-component site-sidebar-recent-changes" id="site-sidebar-recent-changes">
        <h3 class="jp-sidebar-component-title">Recent Changes</h3>
        <div class="site-sidebar-recent-changes-list">
            <!-- Populated by JavaScript -->
        </div>
    </div>

    <script>
    jPulse.dom.ready(async () => {
        const container = document.getElementById('site-sidebar-recent-changes');
        if (!container) return;

        const listEl = container.querySelector('.site-sidebar-recent-changes-list');

        try {
            // Fetch recent changes
            const response = await fetch('/api/changes/recent?limit=10');
            const data = await response.json();

            // Render list
            const html = data.changes.map(change => `
                <div class="site-sidebar-recent-change">
                    <a href="${change.url}">${change.title}</a>
                    <span class="site-sidebar-recent-change-time">${change.timeAgo}</span>
                </div>
            `).join('');

            listEl.innerHTML = html;
        } catch (err) {
            console.error('Failed to load recent changes:', err);
            listEl.innerHTML = '<p class="jp-sidebar-error">Failed to load</p>';
        }
    });
    </script>
{{/component}}
```

### Step 2: Configure in app.conf

Add component to sidebar configuration:

```javascript
sidebar: {
    left: {
        enabled: true,
        mode: 'toggle',
        components: [
            'sidebar.pageComponentLeft',
            'sidebar.recentChanges'  // Your custom component
        ]
    }
}
```

### Step 3: Add Styling (Optional)

Add component-specific styles in `site/webapp/view/jpulse-common.css`:

```css
.site-sidebar-recent-changes {
    /* Component-specific styles */
}

.site-sidebar-recent-change {
    padding: 0.5rem 0;
    border-bottom: 1px solid #e0e0e0;
}

.site-sidebar-recent-change a {
    color: #333;
    text-decoration: none;
}

.site-sidebar-recent-change a:hover {
    color: #1976d2;
}

.site-sidebar-recent-change-time {
    display: block;
    font-size: 0.85rem;
    color: #666;
    margin-top: 0.25rem;
}
```

---

## Component Patterns

### Static Component

Simple component with static HTML content.

```handlebars
{{#component "sidebar.help"}}
    <div class="jp-sidebar-component site-sidebar-help" id="site-sidebar-help">
        <h3 class="jp-sidebar-component-title">Need Help?</h3>
        <p>Contact our support team:</p>
        <ul>
            <li>Email: support@example.com</li>
            <li>Phone: 1-800-EXAMPLE</li>
        </ul>
        <a href="/help" class="jp-button">Help Center</a>
    </div>
{{/component}}
```

### Dynamic Component with API

Component that fetches data from API and renders dynamically.

```handlebars
{{#component "sidebar.stats"}}
    <div class="jp-sidebar-component site-sidebar-stats" id="site-sidebar-stats">
        <h3 class="jp-sidebar-component-title">Site Statistics</h3>
        <div class="site-sidebar-stats-loading">Loading...</div>
        <div class="site-sidebar-stats-content" style="display: none;"></div>
    </div>

    <script>
    jPulse.dom.ready(async () => {
        const container = document.getElementById('site-sidebar-stats');
        if (!container) return;

        const loadingEl = container.querySelector('.site-sidebar-stats-loading');
        const contentEl = container.querySelector('.site-sidebar-stats-content');

        try {
            const response = await fetch('/api/stats/summary');
            const stats = await response.json();

            contentEl.innerHTML = `
                <div class="site-sidebar-stat">
                    <span class="site-sidebar-stat-label">Total Users</span>
                    <span class="site-sidebar-stat-value">${stats.totalUsers}</span>
                </div>
                <div class="site-sidebar-stat">
                    <span class="site-sidebar-stat-label">Active Sessions</span>
                    <span class="site-sidebar-stat-value">${stats.activeSessions}</span>
                </div>
                <div class="site-sidebar-stat">
                    <span class="site-sidebar-stat-label">Total Pages</span>
                    <span class="site-sidebar-stat-value">${stats.totalPages}</span>
                </div>
            `;

            loadingEl.style.display = 'none';
            contentEl.style.display = 'block';
        } catch (err) {
            console.error('Failed to load stats:', err);
            loadingEl.textContent = 'Failed to load statistics';
        }
    });
    </script>
{{/component}}
```

### Component with Refresh Capability

Component that can be refreshed programmatically.

```handlebars
{{#component "sidebar.notifications"}}
    <div class="jp-sidebar-component site-sidebar-notifications" id="site-sidebar-notifications">
        <h3 class="jp-sidebar-component-title">
            Notifications
            <button class="site-sidebar-refresh-btn" aria-label="Refresh">🔄</button>
        </h3>
        <div class="site-sidebar-notifications-list"></div>
    </div>

    <script>
    jPulse.dom.ready(() => {
        const container = document.getElementById('site-sidebar-notifications');
        if (!container) return;

        const listEl = container.querySelector('.site-sidebar-notifications-list');
        const refreshBtn = container.querySelector('.site-sidebar-refresh-btn');

        // Load notifications
        async function loadNotifications() {
            listEl.innerHTML = '<p class="jp-sidebar-loading">Loading...</p>';

            try {
                const response = await fetch('/api/notifications?unread=true');
                const data = await response.json();

                if (data.notifications.length === 0) {
                    listEl.innerHTML = '<p class="jp-sidebar-empty">No new notifications</p>';
                    return;
                }

                const html = data.notifications.map(n => `
                    <div class="site-sidebar-notifications">
                        <a href="${n.url}">${n.message}</a>
                        <span class="site-sidebar-notification-time">${n.timeAgo}</span>
                    </div>
                `).join('');

                listEl.innerHTML = html;
            } catch (err) {
                console.error('Failed to load notifications:', err);
                listEl.innerHTML = '<p class="jp-sidebar-error">Failed to load</p>';
            }
        }

        // Initial load
        loadNotifications();

        // Refresh button
        refreshBtn.addEventListener('click', loadNotifications);

        // Auto-refresh every 5 minutes
        setInterval(loadNotifications, 5 * 60 * 1000);
    });
    </script>
{{/component}}
```

### Component with Configuration

Component that reads configuration from `app.conf`.

```handlebars
{{#component "sidebar.quickLinks"}}
    <div class="jp-sidebar-component site-sidebar-quick-links" id="site-sidebar-quick-links">
        <h3 class="jp-sidebar-component-title">Quick Links</h3>
        <div class="site-sidebar-quick-links-list"></div>
    </div>

    <script>
    jPulse.dom.ready(() => {
        const container = document.getElementById('site-sidebar-quick-links');
        if (!container) return;

        const listEl = container.querySelector('.site-sidebar-quick-links-list');

        // Read config from global jPulse config
        // (Passed from server via jpulse-footer.tmpl)
        const config = window.jPulseConfig?.sidebar?.components?.quickLinks || {};
        const links = config.links || [];

        if (links.length === 0) {
            listEl.innerHTML = '<p class="jp-sidebar-empty">No quick links configured</p>';
            return;
        }

        const html = links.map(link => `
            <a href="${link.url}" class="site-sidebar-quick-link">
                ${link.icon ? `<span class="site-sidebar-quick-link-icon">${link.icon}</span>` : ''}
                <span class="site-sidebar-quick-link-text">${link.label}</span>
            </a>
        `).join('');

        listEl.innerHTML = html;
    });
    </script>
{{/component}}
```

**Configuration in site/website/app.conf:**
```javascript
sidebar: {
    components: {
        quickLinks: {
            links: [
                { label: 'Dashboard', url: '/dashboard', icon: '📊' },
                { label: 'Reports', url: '/reports', icon: '📈' },
                { label: 'Settings', url: '/settings', icon: '⚙️' }
            ]
        }
    }
}
```

---

## Component API

### initComponent() - Dynamic Initialization

Use `jPulse.UI.sidebars.initComponent()` to dynamically populate page-specific components.

**Syntax:**
```javascript
const handle = jPulse.UI.sidebars.initComponent(componentName, config);
```

**Parameters:**
- `componentName` (string): Component name (e.g., `'sidebar.pageComponentLeft'`)
- `config` (object):
  - `content` (string): HTML content to set (optional)
  - `onLoad` (function): Callback after content is set, receives element (optional)

**Returns:**
- Handle object with methods: `getElement()`, `setContent(html)`, `getContent()`, `refresh()`
- `null` if sidebar not enabled or component not found

**Example:**
```javascript
jPulse.dom.ready(async () => {
    // Initialize page component with doc tree
    const docNav = jPulse.UI.sidebars.initComponent('sidebar.pageComponentLeft', {
        onLoad: async (navElement) => {
            // Fetch and render doc structure
            const response = await fetch('/api/docs/structure');
            const data = await response.json();

            const html = renderDocTree(data.files);
            navElement.innerHTML = html;

            // Set up navigation click handlers
            navElement.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    loadDocument(link.getAttribute('href'));
                });
            });
        }
    });

    // Later: Update content
    if (docNav) {
        docNav.setContent('<ul><li>Updated content</li></ul>');
        docNav.refresh();  // Triggers onLoad callback
    }
});
```

---

## Best Practices

### Self-Contained Design

**✅ Good:** Component contains all its logic
```handlebars
{{#component "sidebar.weather"}}
    <div class="jp-sidebar-component" id="site-sidebar-weather">
        <h3>Weather</h3>
        <div class="weather-content"></div>
    </div>

    <script>
    jPulse.dom.ready(async () => {
        const el = document.getElementById('site-sidebar-weather');
        const content = el.querySelector('.weather-content');

        const weather = await fetchWeather();
        content.innerHTML = renderWeather(weather);
    });
    </script>
{{/component}}
```

**❌ Bad:** Component relies on external initialization
```handlebars
{{#component "sidebar.weather"}}
    <div class="jp-sidebar-component" id="site-sidebar-weather">
        <h3>Weather</h3>
        <div class="site-weather-content"></div>
    </div>
    <!-- No script - expects external initialization -->
{{/component}}
```

### Error Handling

Always handle API errors gracefully:

```javascript
try {
    const response = await fetch('/api/data');
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    renderData(data);
} catch (err) {
    console.error('Component error:', err);
    el.innerHTML = '<p class="jp-sidebar-error">Failed to load</p>';
}
```

### Performance Considerations

**Lazy Loading:**
Load data only when needed (e.g., when sidebar opens):

```javascript
let dataLoaded = false;

jPulse.dom.ready(() => {
    // Listen for sidebar open event
    document.addEventListener('jpulse:sidebar-opened', async (e) => {
        if (e.detail.side === 'right' && !dataLoaded) {
            await loadData();
            dataLoaded = true;
        }
    });
});
```

**Debouncing:**
Debounce frequent updates (e.g., search):

```javascript
let debounceTimer;
searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        search(e.target.value);
    }, 300);
});
```

**Caching:**
Cache API responses to reduce network requests:

```javascript
const cache = new Map();

async function fetchData(url) {
    if (cache.has(url)) {
        return cache.get(url);
    }

    const response = await fetch(url);
    const data = await response.json();
    cache.set(url, data);
    return data;
}
```

### Accessibility

**ARIA Labels:**
```html
<button class="site-sidebar-refresh" aria-label="Refresh notifications">🔄</button>
```

**Keyboard Navigation:**
```javascript
button.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleAction();
    }
});
```

**Focus Management:**
Ensure focusable elements are keyboard accessible with visible focus styles.

### Mobile Responsiveness

Components inherit mobile behavior from sidebar system, but can adapt content:

```javascript
const isMobile = window.matchMedia('(max-width: 768px)').matches;

if (isMobile) {
    // Mobile-specific rendering (simpler, touch-friendly)
    renderMobile();
} else {
    // Desktop rendering (richer, more details)
    renderDesktop();
}
```

---

## Advanced Topics

### Component Communication

Use custom events for inter-component communication:

```javascript
// Component A: Emit event
document.dispatchEvent(new CustomEvent('data-updated', {
    detail: { type: 'user', id: 123 }
}));

// Component B: Listen for event
document.addEventListener('data-updated', (e) => {
    if (e.detail.type === 'user') {
        refreshUserData(e.detail.id);
    }
});
```

### State Management

Share state between components using a simple state manager:

```javascript
const ComponentState = {
    _state: {},
    _listeners: {},

    get(key) {
        return this._state[key];
    },

    set(key, value) {
        this._state[key] = value;
        this._notify(key, value);
    },

    on(key, callback) {
        if (!this._listeners[key]) {
            this._listeners[key] = [];
        }
        this._listeners[key].push(callback);
    },

    _notify(key, value) {
        if (this._listeners[key]) {
            this._listeners[key].forEach(cb => cb(value));
        }
    }
};

// Usage
ComponentState.on('selectedUser', (userId) => {
    loadUserDetails(userId);
});

ComponentState.set('selectedUser', 123);
```

### SPA Integration

Components can integrate with SPA routing:

```javascript
jPulse.dom.ready(() => {
    const component = document.getElementById('jp-sidebar-nav');

    // Listen for route changes
    window.addEventListener('popstate', () => {
        updateActiveNavItem();
    });

    // Intercept link clicks for SPA navigation
    component.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const url = link.getAttribute('href');

            // Update history
            history.pushState(null, '', url);

            // Load content
            loadPage(url);

            // Update active state
            updateActiveNavItem();
        });
    });
});
```

---

## See Also

- [Sidebars Guide](sidebars.md) - Main sidebar documentation
- [Template Reference](template-reference.md) - Handlebars template system
- [Site Customization](site-customization.md) - Customizing site templates
- [jPulse.UI Reference](jpulse-ui-reference.md) - JavaScript widgets

