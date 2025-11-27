# jPulse Framework / Docs / Plugins / Plugin Architecture v1.2.6

Understanding how the jPulse plugin system works.

## Architecture Overview

*TODO: Add architecture diagrams and explanations*

## Plugin Lifecycle

1. **Discovery**: Plugins scanned from `plugins/` directory
2. **Validation**: `plugin.json` schema validation
3. **Dependency Resolution**: Check framework version, npm packages, other plugins
4. **Registration**: Register controllers, models, views, and hooks
5. **Initialization**: Run plugin initialization code
6. **Runtime**: Plugin components available to the framework

## Component Integration

### Controllers

*TODO: Explain controller auto-discovery and registration*

### Models

*TODO: Explain model registration and schema extension*

### Views

*TODO: Explain view path resolution and template inclusion*

### Static Assets

*TODO: Explain static asset serving via symlinks*

## Configuration System

*TODO: Explain plugin configuration storage and management*

## API Endpoints

*TODO: Explain plugin API routing*

---

**Note**: This documentation is under development. See the [technical architecture document](../../dev/working/W-014-W-045-mvc-site-plugins-architecture.md) for complete details.

