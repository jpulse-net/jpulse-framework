# jPulse Framework / Plugins / Hello-World / README v1.6.13

A reference implementation plugin for the jPulse Framework that demonstrates the plugin infrastructure.

## Overview

This plugin serves as a complete example showing how to create plugins for jPulse Framework.

### Features Demonstrated

- **Plugin Metadata**: `plugin.json` with configuration schema
- **API Controller**: Simple REST API endpoint
- **Data Model**: Basic plugin data model
- **View Template**: Server-side HTML page with client-side initialization
- **W-098 Append Mode**: CSS and JavaScript automatically appended to framework files
- **CSS Styling**: Proper naming conventions with `plg-hello-world-*` prefix
- **JavaScript Namespace**: Plugin code under `window.jPulse.plugins.helloWorld`
- **Navigation Integration**: Adds itself to site navigation using W-098 append mode
- **Configuration**: Admin-configurable settings via Plugin API

### File Structure

```
plugins/hello-world/
├── plugin.json              # Plugin metadata and config schema
├── README.md                # This file (developer docs)
├── docs/
│   └── README.md            # Site admin/user documentation
└── webapp/
    ├── controller/
    │   └── helloPlugin.js   # API controller
    ├── model/
    │   └── helloPlugin.js   # Data model
    ├── static/
    │   └── .gitkeep         # For standalone assets (if needed)
    └── view/
        ├── jpulse-common.css        # Plugin CSS (W-098 append mode)
        ├── jpulse-common.js         # Plugin JavaScript (W-098 append mode)
        ├── jpulse-navigation.js     # Navigation integration (W-098 append mode)
        ├── plugins/
        │   └── hello-world.shtml    # Dashboard card + detail page (extract pattern)
        └── hello-plugin/
            └── index.shtml          # Example plugin page
```

### W-098 Append Mode

This plugin demonstrates the **W-098 append mode** feature, where plugin files are automatically appended to framework files:

- `webapp/view/jpulse-common.css` → Appended to framework's CSS
- `webapp/view/jpulse-common.js` → Appended to framework's JavaScript
- `webapp/view/jpulse-navigation.js` → Appended to site navigation

**Benefits:**
- No need to manually include plugin assets in HTML
- Guaranteed load order (framework → site → plugins)
- Better for performance (fewer HTTP requests)
- Simpler for plugin developers

**Note:** Plugins can still use `webapp/static/` for standalone assets that shouldn't be appended.

### Plugin Dashboard & Detail Pages

This plugin demonstrates the **extract pattern** for plugin dashboard integration:

**Dashboard Card**: Shown on `/jpulse-plugins/` dashboard
- Extracted from `webapp/view/plugins/hello-world.shtml`
- Uses `<!-- extract: order=10 -->` markers
- Shows quick overview, status, and action buttons

**Detail Page**: Full configuration at `/plugins/hello-world.shtml`
- Same file as dashboard card (single source of truth)
- Conditional JavaScript based on current URL
- Shows detailed configuration, status, and links

**Optional Fragments**: If needed, create reusable template fragments
- Naming: `hello-world-{purpose}.tmpl` (e.g., `hello-world-config.tmpl`)
- Include: `{{file.include "plugins/hello-world-config.tmpl"}}`
- Use for complex plugins with multiple config sections

**Pattern Benefits:**
- ✅ Automatic discovery (no manual registration)
- ✅ Single source of truth (no duplication)
- ✅ Familiar pattern (same as `/admin/index.shtml`)
- ✅ Scales beautifully (3 plugins or 300)

### Plugin Resolution

The jPulse Framework resolves files in this priority order:
1. `site/webapp/` - Site overrides (highest priority)
2. `plugins/hello-world/webapp/` - Plugin files
3. `webapp/` - Framework files (fallback)

This means sites can override any plugin file by placing their version in the site directory.

### Plugin Naming Convention (Context-Aware)

**Local Directory**: NO `-plugin` suffix (context is clear)
- ✅ Directory: `plugins/hello-world/`
- ✅ plugin.json: `"name": "hello-world"`

**GitHub Repository**: WITH `plugin-` prefix (clarity in repository listing)
- ✅ GitHub: `@jpulse-net/plugin-hello-world` (on GitHub, via .npmrc)

**Rationale**:
- In `plugins/` directory, suffix is redundant
- In GitHub/package repository, prefix provides clear identification
- Best of both worlds: clean local structure + clear repository discovery

### Auto-Enable

This plugin has `autoEnable: true`, which means it will be automatically enabled when discovered.
Plugins that require configuration should set `autoEnable: false`.

### Configuration

The plugin defines a simple configuration schema in `plugin.json`:
- `message`: A customizable welcome message
- `enabled`: Toggle to show/hide the message

Configuration is stored in the `pluginConfigs` MongoDB collection and can be modified via the admin UI.

### Development

To modify this plugin:
1. Edit files in `plugins/hello-world/webapp/`
2. Restart the jPulse application to reload changes
3. View changes at `/hello-plugin/`

For more information, see the [Plugin Development Guide](https://jpulse.net/jpulse-docs/plugin-development).
