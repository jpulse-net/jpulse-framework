# jPulse Framework / Docs / Plugins / Plugin Development Guide v1.2.6

jPulse Framework provides a powerful and flexible plugin system that allows you to extend the framework's functionality.

## Quick Start

1. **[Creating Plugins](creating-plugins.md)** - Step-by-step guide to building your first plugin
2. **[Plugin Architecture](plugin-architecture.md)** - Understanding the plugin system architecture
3. **[API Reference](plugin-api-reference.md)** - Complete API documentation for plugin developers
4. **[Publishing Plugins](publishing-plugins.md)** - How to package and publish your plugins
5. **[Managing Plugins](managing-plugins.md)** - Installing, configuring, and managing plugins

## Overview

The jPulse plugin system follows a simple yet powerful architecture:

- **Auto-discovery**: Plugins are automatically discovered from the `plugins/` directory
- **MVC Integration**: Plugins can provide models, views, controllers, and static assets
- **Configuration Management**: Built-in support for plugin-specific configuration
- **Database Support**: Plugins can extend existing models or create new ones
- **API Endpoints**: Plugins can register their own REST API endpoints
- **Client-Side Code**: Support for JavaScript, CSS, and view templates
- **Documentation**: Plugin documentation is automatically integrated into the site

## Hello World Example

See the [Hello World plugin](../installed-plugins/hello-world/README.md) for a complete reference implementation that demonstrates all plugin capabilities.

## Need Help?

- Browse [installed plugins](../installed-plugins/README.md) for examples
- Check the [architecture documentation](../../dev/working/W-014-W-045-mvc-site-plugins-architecture.md) for technical details
- Review the [plugin API reference](plugin-api-reference.md) for complete API documentation
