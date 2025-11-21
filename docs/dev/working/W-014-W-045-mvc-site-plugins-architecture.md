# W-014, W-045: Architecture: MVC architecture for Sites and Plugins

Work items:
- **W-014**: architecture: strategy for seamless update of site-specific jPulse deployments
- **W-045**: architecture: create plugin infrastructure

## Objectives

Extensible framework that is easy to understand, easy to maintain, with clean separation of:

- jPulse Framework code/data
- site/deployment specific code/data
- plugins code

## Strategic Approach: Sequential Implementation

**Decision**: Implement W-014 first, then W-045 as an extension

### Rationale for W-014 → W-045 Sequence:

1. **Common Foundation**: Both work items require the same core infrastructure:
   - Dynamic module resolution system
   - Directory-based override patterns
   - Update-safe file organization
   - Configuration merging strategies

2. **Risk Mitigation**: W-014 provides concrete, immediate value for site customizations while establishing the architectural patterns that W-045 will extend

3. **Incremental Validation**: The override system can be tested and refined with site customizations before adding plugin complexity

4. **Natural Evolution**: Site overrides → Plugin system represents a logical architectural progression

## Architectural Decision: Override Directory Pattern

**Selected Approach**: Option B - Override Directory Pattern with site/ separation

### Directory Structure:

```
jpulse-framework/               # Main project
├── webapp/                     # Framework core (updatable)
│   ├── app.js                  # Framework bootstrap
│   ├── app.conf                # Framework configuration defaults
│   ├── controller/             # Base controllers
│   ├── model/                  # Base models
│   ├── view/                   # Base templates
│   └── static/                 # Framework assets
├── site/                       # Site customizations (update-safe)
│   └── webapp/                 # Site-specific overrides
│       ├── app.conf            # Site configuration (copied from framework if missing)
│       ├── controller/         # Custom/extended controllers
│       ├── model/              # Custom/extended models
│       ├── view/               # Custom templates
│       └── static/             # Site-specific assets
├── plugins/                    # Plugin infrastructure (W-045)
│   ├── auth-ldap/
│   │   ├── plugin.json         # Plugin metadata
│   │   ├── config.conf         # Plugin config defaults
│   │   └── webapp/             # Plugin MVC components
│   │       ├── controller/     # Plugin controllers
│   │       ├── model/          # Plugin models
│   │       ├── view/           # Plugin templates
│   │       └── static/         # Plugin assets
│   ├── dashboard-analytics/
│   │   ├── plugin.json
│   │   ├── config.conf
│   │   └── webapp/
│   └── hello-world-plugin/     # Demo plugin (ships with framework)
│       ├── plugin.json
│       └── webapp/
└── .jpulse/                    # Framework metadata
    ├── app.json                # Consolidated runtime configuration
    ├── config-sources.json     # Source file tracking
    ├── plugins.json            # Plugin registry and status
    ├── framework-version.json  # Version tracking
    └── update-history.json     # Update log
```

### Key Principles:

1. **Unified File Resolution Priority** (W-014 foundation, W-045 extension):
   ```
   Priority Order for any module/file:
   1. site/webapp/[type]/[file]           # Site override (highest priority)
   2. plugins/[name]/webapp/[type]/[file] # Plugin override (W-045)
   3. webapp/[type]/[file]                # Framework default (fallback)
   4. Error if none found
   ```

2. **Protected Paths** (never overwritten by framework updates):
   - `site/` directory (all site customizations)
     - including `site/webapp/app.conf` (site configuration)
   - `plugins/` directory (all plugin code)
   - `.jpulse/site-*` and `.jpulse/plugins-*` (metadata)

3. **Dynamic Module Resolution**:
   ```javascript
   // W-014: Basic site override resolution
   function resolveModule(modulePath) {
       const sitePath = `./site/webapp/${modulePath}`;
       const frameworkPath = `./webapp/${modulePath}`;

       if (fs.existsSync(sitePath)) return sitePath;
       if (fs.existsSync(frameworkPath)) return frameworkPath;
       throw new Error(`Module not found: ${modulePath}`);
   }

   // W-045: Extended resolution with plugin support
   function resolveModuleWithPlugins(modulePath) {
       // 1. Check site override first
       const sitePath = `./site/webapp/${modulePath}`;
       if (fs.existsSync(sitePath)) return sitePath;

       // 2. Check active plugins (in load order)
       for (const plugin of getActivePlugins()) {
           const pluginPath = `./plugins/${plugin.name}/webapp/${modulePath}`;
           if (fs.existsSync(pluginPath)) return pluginPath;
       }

       // 3. Fall back to framework default
       const frameworkPath = `./webapp/${modulePath}`;
       if (fs.existsSync(frameworkPath)) return frameworkPath;

       throw new Error(`Module not found: ${modulePath}`);
   }
   ```

## Static Asset Serving Strategy

### Nginx Configuration with Override Chain:

Static assets follow the same resolution priority as code files, served directly by nginx for maximum performance.

### Asset Resolution Priority:

```
1. site/webapp/static/[file]            # Site assets (highest priority)
2. plugins/[name]/webapp/static/[file]  # Plugin assets (W-045)
3. webapp/static/[file]                 # Framework assets (fallback)
4. 404 if none found
```

### Nginx Configuration Example:

```
location /static/ {
    try_files /site/webapp/static$uri
              /webapp/static$uri
              =404;
}

# With plugins (W-045):
location /static/ {
    try_files /site/webapp/static$uri
              /plugins/$plugin_name/webapp/static$uri
              /webapp/static$uri
              =404;
}
```

URI Mapping Examples:

- `/favicon.ico` → `webapp/static/favicon.ico` (framework default)
- `/favicon.ico` → `site/webapp/static/favicon.ico` (site override)
- `/logo.png` → `site/webapp/static/logo.png` (site-specific asset)

## W-014 Implementation Strategy

### Phase 1: Foundation (W-014a) ✅ COMPLETED

- ✅ Create directory structure utilities (`webapp/utils/path-resolver.js`)
- ✅ Implement basic path resolution system (site/ → webapp/)
- ✅ Design configuration merging strategy (deep merge with cache invalidation)
- ✅ Create site/ directory structure (controller/, model/, view/, static/)

**Implementation Details:**
- **Path Resolution**: `PathResolver.resolveModule()` checks site/webapp/ first, falls back to webapp/
- **Configuration Merging**: Extended `app.js` with `deepMerge()` utility and site config support
- **Cache Invalidation**: Monitors both framework and site config timestamps
- **Source Tracking**: `.jpulse/config-sources.json` tracks all configuration sources

### Phase 2: Incremental Migration (W-014b)

- Apply to new components as they're developed
- Migrate existing components gradually
- Maintain backward compatibility
- Test with real site customizations

### Phase 3: Enhanced Features (W-014c)

- Prepare foundation for plugin infrastructure
- Advanced configuration merging
- Update tooling and migration utilities

## Configuration Management Strategy

### Framework Configuration Defaults:

- `webapp/app.conf` ships with framework (contains all default settings)
- Protected during framework updates (never overwritten)
- Serves as reference for available configuration options

### Site Configuration:

- site/webapp/app.conf contains site-specific overrides
- Created by W-015 (onboarding) by copying `webapp/app.conf` if it doesn't exist
- Site administrators modify this file for customizations
- Never touched by framework updates

### Configuration Resolution:

1. Load framework defaults from `webapp/app.conf`
2. Merge with site overrides from `site/webapp/app.conf` (if exists)
3. Result: complete configuration with site customizations applied

## W-045 Plugin Architecture (Extended Implementation)

### Phase 1: Plugin Infrastructure Foundation (W-045a)
**Extends W-014's resolution system to support plugins**

#### Plugin Discovery and Loading:
```javascript
// Plugin metadata structure (plugin.json)
{
    "name": "auth-ldap",
    "version": "1.0.0",
    "description": "LDAP authentication plugin",
    "author": "jPulse Team",
    "jpulseVersion": ">=0.5.0",
    "dependencies": {
        "ldapjs": "^2.3.0"
    },
    "provides": {
        "controllers": ["auth-ldap"],
        "models": ["ldap-user"],
        "views": ["auth/ldap-login"],
        "routes": ["/auth/ldap/*"]
    },
    "hooks": {
        "beforeAuth": "controllers/auth-ldap.beforeAuth",
        "afterLogin": "controllers/auth-ldap.afterLogin"
    },
    "config": {
        "ldap.server": "ldap://localhost:389",
        "ldap.baseDN": "dc=example,dc=com"
    }
}
```

#### Plugin Registry (.jpulse/plugins.json):
```javascript
{
    "plugins": [
        {
            "name": "auth-ldap",
            "version": "1.0.0",
            "enabled": true,
            "loadOrder": 1,
            "installedAt": "2025-01-15T10:30:00Z"
        },
        {
            "name": "dashboard-analytics",
            "version": "2.1.0",
            "enabled": true,
            "loadOrder": 2,
            "installedAt": "2025-01-15T10:35:00Z"
        }
    ],
    "loadOrder": ["auth-ldap", "dashboard-analytics"]
}
```

### Phase 2: Plugin Lifecycle Management (W-045b)

#### Plugin Manager API:
```javascript
class PluginManager {
    // Discovery and validation
    static async discoverPlugins() { /* scan plugins/ directory */ }
    static async validatePlugin(pluginPath) { /* validate plugin.json */ }

    // Lifecycle management
    static async enablePlugin(name) { /* add to registry, resolve dependencies */ }
    static async disablePlugin(name) { /* remove from registry, check dependents */ }
    static async reloadPlugin(name) { /* hot reload for development */ }

    // Runtime support
    static getActivePlugins() { /* return enabled plugins in load order */ }
    static resolvePluginModule(pluginName, modulePath) { /* resolve plugin files */ }
    static executeHook(hookName, context) { /* plugin hook system */ }
}
```

#### Hook System for Plugin Integration:
```javascript
// Framework hook points
const hooks = {
    // Authentication hooks
    'beforeAuth': [],      // Modify auth request
    'afterAuth': [],       // Post-auth processing
    'beforeLogin': [],     // Pre-login validation
    'afterLogin': [],      // Post-login actions

    // Request lifecycle hooks
    'beforeRoute': [],     // Route preprocessing
    'afterRoute': [],      // Route postprocessing
    'beforeRender': [],    // Template preprocessing
    'afterRender': [],     // Template postprocessing

    // Data hooks
    'beforeSave': [],      // Model save preprocessing
    'afterSave': [],       // Model save postprocessing
    'beforeDelete': [],    // Model delete preprocessing
    'afterDelete': []      // Model delete postprocessing
};
```

### Phase 3: Advanced Plugin Features (W-045c)

#### Plugin Types and Capabilities:

1. **MVC Plugins**: Full controller/model/view components
   - Custom routes and endpoints
   - Database models and schemas
   - Template overrides and extensions

2. **Middleware Plugins**: Request/response processing
   - Authentication providers (LDAP, OAuth, SAML)
   - Logging and monitoring
   - Security and validation

3. **Theme Plugins**: UI and styling
   - Complete theme packages
   - CSS framework integration
   - Component libraries

4. **Utility Plugins**: Helper functions and services
   - External API integrations
   - Data processing utilities
   - Background job processors

#### Plugin Communication and Dependencies:
```javascript
// Plugin-to-plugin communication
class PluginAPI {
    static registerService(name, service) { /* expose plugin services */ }
    static getService(name) { /* consume other plugin services */ }
    static emitEvent(event, data) { /* plugin event system */ }
    static onEvent(event, handler) { /* listen to plugin events */ }
}

// Dependency resolution
class PluginDependencies {
    static resolveDependencies(plugins) { /* topological sort */ }
    static checkCompatibility(plugin) { /* version compatibility */ }
    static installDependencies(plugin) { /* npm install for plugin deps */ }
}
```

## Hello World Plugin (Demo Implementation)

**Ships with framework as reference implementation:**

```
plugins/hello-world-plugin/
├── plugin.json              # Metadata and configuration
├── webapp/
│   ├── controller/
│   │   └── hello.js         # Simple controller
│   ├── view/
│   │   └── hello/
│   │       └── index.shtml  # Hello world template
│   └── static/
│       └── hello.css        # Plugin-specific styles
└── README.md                # Plugin documentation
```

## Benefits of Sequential Approach:

### W-014 Benefits (Immediate):
- ✅ Clean separation of framework vs. site-specific code
- ✅ Update-safe customizations
- ✅ Scalable for multiple site deployments
- ✅ Backward compatibility maintained
- ✅ Foundation for plugin architecture

### W-045 Benefits (Extended):
- ✅ Third-party extensibility
- ✅ Modular functionality
- ✅ Plugin ecosystem potential
- ✅ Hot-swappable components
- ✅ Community contribution framework

## Schema Extension Architecture (W-045)

### Design Principles

**Schema Storage**: Extended schemas are stored in the Model (single source of truth)
- Models own data structure definitions and validation rules
- Controllers read from Models and expose via API (MVC separation)
- Views never access Models directly

**Extension Mechanism**: Plugins extend schemas at initialization time
- Plugins call `Model.extendSchema()` during bootstrap
- Schema extensions are applied before models are finalized
- Runtime schema is computed once and cached in memory

### Schema Extension API

#### Model Schema Structure:
```javascript
class UserModel {
    // Base schema (framework definition)
    static baseSchema = {
        roles: { type: 'array', enum: ['user', 'admin', 'root'] },
        status: { type: 'string', enum: ['pending', 'active', 'inactive', 'suspended'] },
        // ... other fields
    };

    // Extended schema (base + plugin extensions) - computed at init
    static schema = null;

    // Schema extensions registry (applied in order)
    static schemaExtensions = [];

    // Initialize schema with plugin extensions
    static initializeSchema() {
        let schema = { ...this.baseSchema };

        // Apply plugin extensions in order
        for (const extension of this.schemaExtensions) {
            schema = this.applySchemaExtension(schema, extension);
        }

        this.schema = schema;
    }

    // Plugin API to extend schema
    static extendSchema(extension) {
        this.schemaExtensions.push(extension);
        // Recompute schema
        this.initializeSchema();
    }

    // Deep merge extension into schema
    static applySchemaExtension(schema, extension) {
        // Deep merge extension into schema
        return deepMerge(schema, extension);
    }

    // Get current schema (extended)
    static getSchema() {
        return this.schema || this.baseSchema;
    }

    // Get enum for specific field (supports dot notation)
    static getEnum(fieldPath) {
        const field = CommonUtils.getFieldSchema(this.getSchema(), fieldPath);
        return field?.enum || null;
    }

    // Get all enum fields from schema
    static getEnums() {
        return extractEnums(this.getSchema());
    }
}
```

#### Plugin Extension Examples:

**Adding new fields:**
```javascript
// Plugin extends user schema with address fields
UserModel.extendSchema({
    profile: {
        city: { type: 'string', default: '', required: false },
        address1: { type: 'string', default: '', required: false },
        address2: { type: 'string', default: '', required: false },
        zip: { type: 'string', default: '', required: false }
    }
});
```

**Modifying enum values:**
```javascript
// Plugin adds 'deleted' to status enum
UserModel.extendSchema({
    status: {
        enum: ['pending', 'active', 'inactive', 'suspended', 'terminated', 'deleted']
    }
});
```

**Adding nested enum fields:**
```javascript
// Plugin adds new enum field
UserModel.extendSchema({
    preferences: {
        timezone: {
            type: 'string',
            default: 'UTC',
            enum: ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo']
        }
    }
});
```

### Controller API Endpoint

**Endpoint**: `GET /api/1/model/user/enums?fields=status,roles` (optional query param)

**Implementation**:
```javascript
// UserController
static async getEnums(req, res) {
    // Get schema from Model (not exposing Model directly)
    const enums = UserModel.getEnums();

    // Filter by query param if provided
    const fields = req.query.fields?.split(',').map(f => f.trim());
    const filtered = fields ? pick(enums, fields) : enums;

    res.json({ success: true, data: filtered });
}
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "roles": ["user", "admin", "root"],
    "status": ["pending", "active", "inactive", "suspended", "terminated", "deleted"],
    "theme": ["light", "dark"]
  }
}
```

### Initialization Order (Bootstrap)

**Sequence**:
1. Load framework models (base schemas defined)
2. Load plugins (W-045)
3. Plugins extend schemas via `Model.extendSchema()` during plugin initialization
4. Models finalize schemas: `Model.initializeSchema()`
5. Controllers can now use extended schemas via `Model.getEnums()`

**Bootstrap Integration**:
```javascript
// In bootstrap.js
// Step 1: Load models
import UserModel from './model/user.js';

// Step 2: Load plugins (W-045)
await PluginManager.initialize();
// Plugins extend schemas during initialization

// Step 3: Finalize schemas
UserModel.initializeSchema();
// Other models finalize schemas...

// Step 4: Controllers can now use extended schemas
```

### Benefits

- **Single Source of Truth**: Schema lives in Model, Controller exposes it
- **MVC Separation**: Models own schema, Controllers expose via API, Views consume API
- **Future-Proof**: Plugins can add fields and modify enums without code changes
- **Automatic Discovery**: New enum fields automatically appear in API responses
- **Extensible**: Deep merge allows plugins to extend nested structures

## Deferred Decisions:
- **Configuration Merging**: Deep merge strategy details to be decided during W-014 implementation
- **Plugin Security**: Sandboxing and permission system deferred to W-045b
- **Plugin Marketplace**: Distribution and discovery system deferred to future work items
- **Update Tooling**: Framework update utilities deferred to W-015 (onboarding strategy)
- **Logical Override System**: Schema extensions and method hooks deferred to W-045c
- **Static Asset Plugin Resolution**: Dynamic plugin asset serving deferred to W-045b
