# jPulse Docs / Installed Plugins / Hello World Plugin v1.3.11

Welcome to the Hello World plugin! This is a demonstration plugin that showcases the jPulse Framework's plugin architecture.

## What This Plugin Does

The Hello World plugin provides:

- **Demo Application Page**: Visit [/hello-plugin/](/hello-plugin/) to see the plugin in action
- **Configuration Options**: Customize the welcome message and enable/disable features
- **Plugin Statistics**: View plugin name, version, and status information
- **Example Features**: Demonstrates auto-discovery, configuration management, API endpoints, and more

## Getting Started

### Viewing the Plugin

1. Visit the [Hello-World Plugin](/jpulse-plugins/hello-world.shtml) page for a plugin overview
2. Navigate to [/hello-plugin/](/hello-plugin/) to see the plugin page
3. Check the [Plugins Dashboard](/jpulse-plugins/) to see all installed plugins

### Configuring the Plugin

1. Go to [/admin/plugin-config.shtml?plugin=hello-world](/admin/plugin-config.shtml?plugin=hello-world) (for adinistrators only)
2. Modify the Welcome Message
3. Toggle the "Show Statistics" option
4. Click "Save Configuration"
5. Visit [/hello-plugin/](/hello-plugin/) to see the configuration changes

## Features

### Auto-Discovery
This plugin is automatically discovered and enabled when the jPulse application starts (`autoEnable: true`). No manual configuration needed!

Plugins that require initial configuration should set `autoEnable: false` and must be manually enabled after configuration.

### Configuration Management
The plugin stores its configuration in the `pluginConfigs` MongoDB collection:

- **Welcome Message**: Customize the message shown on the plugin page
- **Enable/Disable**: Toggle whether the custom message is displayed

Configuration can be modified via:
- The admin UI at [/admin/plugin-config.shtml?plugin=hello-world](/admin/plugin-config.shtml?plugin=hello-world) (for adinistrators only)
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
        ├── jpulse-common.css        # Plugin CSS (automatically loaded)
        ├── jpulse-common.js         # Plugin JavaScript (automatically loaded)
        ├── jpulse-navigation.js     # Navigation integration (automatically loaded)
        ├── plugins/
        │   └── hello-world.shtml    # Dashboard card + detail page
        └── hello-plugin/
            └── index.shtml          # Plugin application page
```

### Automatic Asset Loading

This plugin's CSS and JavaScript are automatically loaded with the framework - no manual configuration needed!

The plugin integrates seamlessly by providing:
- Custom CSS styles (automatically appended to framework CSS)
- JavaScript utilities (automatically appended to framework JavaScript)
- Navigation menu entries (automatically added to site navigation)

**Benefits**: Works out of the box, no manual setup required.

## Technical Details

For developers who want to understand how this plugin works or use it as a template for creating their own plugins:

- Learn how to create plugins in the [Plugin Development Guide](../plugins/README.md)
- Browse the [plugin source code](https://github.com/jpulse-net/jpulse-framework/tree/main/plugins/hello-world)

## Support

If you encounter any issues or have questions:

1. Check the [Plugin Development Guide](../plugins/README.md) for common solutions
2. Review the [Plugins Dashboard](/jpulse-plugins/) to verify the plugin is active
3. Contact your system administrator for site-specific support

---

**Plugin Information:**
- **Name**: hello-world
- **Version**: 1.3.0
- **Status**: Active
- **Auto-Enable**: Yes
- **npm Package**: `@jpulse-net/plugin-hello-world` (on GitHub, via .npmrc)
