# jPulse Framework / Docs / Installed Plugins / Hello World Plugin v1.2.6

Welcome to the Hello World plugin! This is a demonstration plugin that showcases the jPulse Framework's plugin architecture.

## What This Plugin Does

The Hello World plugin provides:

- **Demo Application Page**: Visit [/hello-plugin/](/hello-plugin/) to see the plugin in action
- **Configuration Options**: Customize the welcome message and enable/disable features
- **Plugin Statistics**: View plugin name, version, and status information
- **Example Features**: Demonstrates auto-discovery, configuration management, API endpoints, and more

## Getting Started

### Viewing the Plugin

1. Navigate to [/hello-plugin/](/hello-plugin/) to see the plugin page
2. Check the [Plugins Dashboard](/jpulse-plugins/) to see all installed plugins
3. Visit the [Hello-World Plugin Configuration](/jpulse-plugins/hello-world.shtml) page to customize settings

### Configuring the Plugin

1. Go to [/jpulse-plugins/hello-world.shtml](/jpulse-plugins/hello-world.shtml)
2. Modify the welcome message
3. Toggle the "Show Welcome Message" option
4. Click "Save Configuration"
5. Visit [/hello-plugin/](/hello-plugin/) to see your changes

## Features

### Auto-Discovery
This plugin is automatically discovered and enabled when the jPulse application starts (`autoEnable: true`). No manual configuration needed!

Plugins that require initial configuration should set `autoEnable: false` and must be manually enabled after configuration.

### Configuration Management
The plugin stores its configuration in the `pluginConfigs` MongoDB collection:

- **Welcome Message**: Customize the message shown on the plugin page
- **Enable/Disable**: Toggle whether the custom message is displayed

Configuration can be modified via:
- The admin UI at [/jpulse-plugins/hello-world.shtml](/jpulse-plugins/hello-world.shtml)
- The Plugin REST API endpoints programmatically

### API Integration
The plugin provides its own REST API endpoints that can be accessed programmatically:
- GET `/api/1/helloPlugin` - Get plugin data and current configuration
- GET `/api/1/plugin/hello-world/config` - Get plugin configuration
- PUT `/api/1/plugin/hello-world/config` - Update plugin configuration

### Client-Side Components
- **Custom CSS**: Styling with proper namespacing (`plg-hello-world-*` prefix)
- **JavaScript Utilities**: Available under `window.jPulse.plugins.helloWorld`
- **Navigation Integration**: Automatically adds itself to the site navigation menu

### Plugin Resolution Priority

The jPulse Framework resolves files in this priority order:
1. **Site overrides** (`site/webapp/`) - Highest priority
2. **Plugin files** (`plugins/hello-world/webapp/`) - Middle priority
3. **Framework files** (`webapp/`) - Fallback

This means site administrators can override any plugin file by placing their custom version in the site directory

## Plugin File Structure

For those interested in how the plugin is organized:

```
plugins/hello-world/
├── plugin.json              # Plugin metadata and config schema
├── README.md                # Developer documentation
├── docs/
│   └── README.md            # This file (user documentation)
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
        │   └── hello-world.shtml    # Dashboard card + detail page
        └── hello-plugin/
            └── index.shtml          # Plugin application page
```

### W-098 Append Mode

This plugin uses the **W-098 append mode** feature, where specific files are automatically appended to the framework's files:

- `jpulse-common.css` → Appended to framework CSS
- `jpulse-common.js` → Appended to framework JavaScript
- `jpulse-navigation.js` → Appended to site navigation

**Benefits**: No manual asset inclusion needed, guaranteed load order, better performance.

## Technical Details

For developers who want to understand how this plugin works or use it as a template for creating their own plugins:

- **Developer Documentation**: See the [plugin's developer README](../README.md) for technical implementation details
- **Plugin Development Guide**: Learn how to create plugins in the [Plugin Development Guide](/jpulse-docs/plugins/README)
- **Source Code**: Browse the [plugin source code](https://github.com/jpulse-net/jpulse-framework/tree/main/plugins/hello-world)

## Support

If you encounter any issues or have questions:

1. Check the [Plugin Development Guide](/jpulse-docs/plugins/README) for common solutions
2. Review the [Plugins Dashboard](/jpulse-plugins/) to verify the plugin is active
3. Contact your system administrator for site-specific support

---

**Plugin Information:**
- **Name**: hello-world
- **Version**: 1.0.0
- **Status**: Active
- **Auto-Enable**: Yes
- **npm Package**: `@jpulse-net/plugin-hello-world` (on GitHub, via .npmrc)
