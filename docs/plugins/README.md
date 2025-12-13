# jPulse Docs / Plugins / Plugin Development Guide v1.3.14

Welcome to jPulse Framework's plugin development guide! This documentation will help you create, publish, and manage plugins for the jPulse Framework.

## Quick Start

1. **[Creating Plugins](creating-plugins.md)** - Step-by-step guide to building your first plugin
2. **[Plugin Architecture](plugin-architecture.md)** - Understanding how the plugin system works
3. **[Plugin Hooks](plugin-hooks.md)** - Extend framework behavior with hooks
4. **[API Reference](plugin-api-reference.md)** - Complete API documentation
5. **[Publishing Plugins](publishing-plugins.md)** - Package and publish your plugins
6. **[Managing Plugins](managing-plugins.md)** - Install, configure, and manage plugins

## Overview

The jPulse plugin system is designed to be simple yet powerful:

### Key Features

- **🔍 Auto-Discovery**: Drop a plugin in `plugins/` and it's automatically detected
- **🧩 MVC Integration**: Full support for Models, Views, and Controllers
- **🪝 Plugin Hooks**: Extend authentication, user management, and more
- **⚙️ Configuration**: Dynamic admin UI generated from JSON schema
- **💾 Database**: Extend existing models or create new collections
- **📡 API Endpoints**: Register REST endpoints with auto-discovery
- **🎨 Assets**: CSS and JavaScript automatically loaded with the framework
- **📚 Documentation**: Integrated into the site's documentation system
- **🔗 Navigation**: Add menu items to the site navigation

### Path Resolution Priority

When the framework looks for files, it checks in this order:
1. **Site** (`site/webapp/`)
2. **Plugins** (`plugins/*/webapp/`) - in dependency order
3. **Framework** (`webapp/`)

This allows sites to override plugin defaults, and plugins to override framework defaults.

## Hello World Example

The [Hello-World plugin](../installed-plugins/hello-world/README.md) is a complete reference implementation that demonstrates:

- MVC component structure
- Configuration schema with tabs
- API endpoint registration
- CSS/JavaScript integration
- Navigation menu integration
- User-facing pages (dashboard + tutorial)
- Documentation structure

**Live Demos of Hello-World Plugin:**
- [Plugin Dashboard](/jpulse-plugins/) - User-facing listing of installed plugins
- [Hello World Tutorial](/hello-plugin/) - Interactive demo
- [Plugin Overview](/jpulse-plugins/hello-world.shtml) - Plugin details
- [Admin Management](/admin/plugins.shtml) - Enable/disable plugins (for administrators only)
- [Admin Configuration](/admin/plugin-config.shtml?plugin=hello-world) - Configure settings (for administrators only)

## Naming Conventions

To prevent conflicts, plugins must follow these naming conventions:

- **CSS Classes**: `plg-{plugin-name}-*` (e.g., `.plg-auth-ldap-login-form`)
- **JavaScript**: `window.jPulse.plugins.{camelCaseName}` (e.g., `window.jPulse.plugins.authLdap`)
- **Controllers**: `{PluginName}Controller.js` (e.g., `AuthLdapController.js`)
- **Models**: `{PluginName}Model.js` (e.g., `AuthLdapModel.js`)
- **Views**: `{plugin-name}/` directory (e.g., `auth-ldap/index.shtml`)
- **Database Collections**: `{pluginName}_{collection}` (e.g., `authLdap_sessions`)

## Need Help?

- **Examples**: Browse the [installed plugins](/jpulse-plugins/) for working examples
- **API Reference**: Review the [complete API reference](plugin-api-reference.md) for all available methods
