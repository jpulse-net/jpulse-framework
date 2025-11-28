# W-014, W-045: Architecture: MVC architecture for Sites and Plugins

Work items:
- **W-014**: architecture: strategy for seamless update of site-specific jPulse deployments
- **W-045**: architecture: create plugin infrastructure

## Objectives

Extensible framework that is easy to understand, easy to maintain, with clean separation of:

- jPulse Framework code/data
- plugins code
- site/deployment specific code/data

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
│   └── hello-world/            # Demo plugin (ships with framework)
│       ├── plugin.json
│       ├── README.md           # Developer documentation
│       ├── docs/
│       │   └── README.md       # Site admin/user documentation
│       └── webapp/
│           ├── controller/
│           ├── model/
│           └── view/
│               ├── jpulse-common.css        # W-098 append mode
│               ├── jpulse-common.js         # W-098 append mode
│               ├── jpulse-navigation.js     # W-098 append mode
│               └── hello-plugin/
│                   └── index.shtml
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
    "author": "jPulse Team <team@jpulse.net>",
    "jpulseVersion": ">=1.2.6",
    "autoEnable": false,                    // Default: true. Set false if requires configuration
    "dependencies": {
        "npm": {
        "ldapjs": "^2.3.0"
    },
        "plugins": {
            "user-profile": "^1.0.0"        // Other jPulse plugins
        }
    },
    "config": {
        "schema": [
            {
                "id": "server",
                "label": "LDAP Server URL",
                "type": "text",
                "default": "ldap://localhost:389",
                "placeholder": "ldap://company.local:389",
                "required": true,
                "validation": "^ldaps?://.*$",
                "help": "LDAP server URL (ldap:// or ldaps://)"
            },
            {
                "id": "baseDN",
                "label": "Base DN",
                "type": "text",
                "default": "",
                "placeholder": "dc=example,dc=com",
                "required": true
            },
            {
                "id": "autoEnableUsers",
                "label": "Auto-enable new users",
                "type": "boolean",
                "default": false,
                "help": "Automatically activate new users on first LDAP login"
            }
        ]
    }
}
```

**Note**: Controllers, models, views, and routes are auto-discovered based on file structure. Hooks are auto-discovered by method naming conventions.

#### Plugin Registry (.jpulse/plugins.json):
```javascript
{
    "plugins": [
        {
            "name": "auth-ldap",
            "version": "1.0.0",
            "enabled": true,
            "autoEnable": false,
            "discoveredAt": "2025-11-25T10:00:00Z",
            "enabledAt": "2025-11-25T10:30:00Z",
            "status": "loaded",             // discovered, loaded, error, disabled
            "errors": [],
            "path": "/path/to/plugins/auth-ldap"
        },
        {
            "name": "dashboard-analytics",
            "version": "2.1.0",
            "enabled": true,
            "autoEnable": true,
            "discoveredAt": "2025-11-25T10:00:00Z",
            "enabledAt": "2025-11-25T10:00:00Z",
            "status": "loaded",
            "errors": []
        }
    ],
    "loadOrder": ["auth-ldap", "dashboard-analytics"],
    "lastScan": "2025-11-25T10:00:00Z"
}
```

#### Plugin Configuration Storage (Database):
```javascript
// Collection: pluginConfigs
// One document per plugin

{
    _id: ObjectId("..."),               // MongoDB default ID
    name: "auth-ldap",                  // Plugin identifier (unique index)
    enabled: true,                      // Enable/disable flag
    config: {                           // Site-specific config values
        server: "ldap://company.local:389",
        baseDN: "dc=company,dc=local",
        bindUser: "cn=admin,dc=company,dc=local",
        bindPassword: "encrypted_password",
        autoEnableUsers: false
    },
    installedAt: "2025-11-25T10:30:00Z",
    lastModified: "2025-11-26T14:45:00Z",
    modifiedBy: "admin@example.com",
    version: "1.0.0"                    // Plugin version when config was set
}
```

#### Plugin Directory Structure:
```
plugins/auth-ldap/
├── plugin.json                     # Plugin metadata (required)
├── README.md                       # Developer documentation
├── docs/                           # Site admin/user docs
│   ├── README.md                   # Main documentation (copied to docs/plugins/auth-ldap/)
│   ├── installation.md             # Installation guide (optional)
│   └── configuration.md            # Configuration guide (optional)
├── webapp/                         # MVC components
│   ├── controller/
│   │   └── ldapAuth.js
│   ├── model/
│   │   └── ldapUser.js
│   ├── view/
│   │   ├── jpulse-navigation.js    # Add plugin to site navigation (W-098 append mode)
│   │   └── auth/
│   │       └── ldap-login.shtml
│   └── static/
│       ├── css/
│       │   └── ldap-auth.css       # CSS classes: plg-auth-ldap-*
│       └── js/
│           └── ldap-auth.js        # JS namespace: window.JPulse.plugins.authLdap
└── package.json                    # npm dependencies (optional)
```

**Static Asset Strategy**: Symlinks created at plugin install time
- Create: `webapp/static/plugins/auth-ldap` → `../../plugins/auth-ldap/webapp/static/`
- Nginx serves: `/static/plugins/auth-ldap/css/ldap-auth.css`
- Remove symlink at plugin uninstall

**Documentation Strategy**: Plugin docs automatically included in jpulse-docs
- Plugin provides: `plugins/auth-ldap/docs/README.md` (and other .md files)
- **Framework dev install**: Symlink `docs/installed-plugins/` → plugin docs directories
- **Site install**: Physically copy to `webapp/static/assets/jpulse-docs/installed-plugins/auth-ldap/`
- Accessible to site admins and end users in unified documentation viewer
- **Plugin development docs**: `docs/plugins/` contains guides for creating/managing plugins

### Phase 2: Plugin Lifecycle Management (W-045b)

#### Plugin Manager API:
```javascript
// webapp/utils/plugin-manager.js

class PluginManager {
    // Discovery and validation
    static async discoverPlugins() { /* scan plugins/ directory */ }
    static async validatePlugin(pluginPath) { /* validate plugin.json schema */ }
    static async validateDependencies(plugin) { /* check jpulse version, npm packages, other plugins */ }

    // Lifecycle management
    static async enablePlugin(name) { /* validate dependencies, update registry, install npm deps */ }
    static async disablePlugin(name) { /* check dependents, update registry */ }
    static async installNpmDependencies(pluginPath) { /* run npm install for plugin */ }

    // Runtime support
    static getActivePlugins() { /* return enabled plugins in load order */ }
    static getLoadOrder() { /* topological sort based on dependencies */ }
    static resolvePluginModule(pluginName, modulePath) { /* resolve plugin files */ }

    // Health and monitoring (standardized format like other controllers)
    static getHealthStatus() { /* return overall plugin system health status */ }
    // Individual plugin health accessed via API: GET /api/1/plugin/:name/status
}
```

#### Plugin Controller API:
```javascript
// webapp/controller/plugin.js

class PluginController {

    // === Discovery & Status ===

    // GET /api/1/plugin/list
    static async list(req, res) {
        // Returns all discovered plugins with status
        // Response: { success: true, data: [{ name, version, enabled, autoEnable, status, ... }] }
    }

    // GET /api/1/plugin/:name
    static async get(req, res) {
        // Returns detailed plugin info
        // Response: { success: true, data: { name, version, description, author, config schema, ... } }
    }

    // GET /api/1/plugin/:name/status
    static async getStatus(req, res) {
        // Returns runtime status (loaded, error, dependencies)
        // Response: { success: true, data: { status, loaded, errors, dependencies } }
    }

    // === Enable/Disable ===

    // POST /api/1/plugin/:name/enable
    static async enable(req, res) {
        // Enable plugin, check dependencies, install npm deps if needed
        // Requires app restart to take effect
        // Response: { success: true, message: "Plugin enabled, restart required", restartRequired: true }
    }

    // POST /api/1/plugin/:name/disable
    static async disable(req, res) {
        // Disable plugin, check dependents
        // Requires app restart to take effect
        // Response: { success: true, message: "Plugin disabled, restart required", restartRequired: true }
    }

    // === Configuration ===

    // GET /api/1/plugin/:name/config
    static async getConfig(req, res) {
        // Returns plugin config schema + current values
        // Response: { success: true, data: { schema: [...], values: {...} } }
    }

    // PUT /api/1/plugin/:name/config
    static async updateConfig(req, res) {
        // Update plugin configuration
        // Validates against schema, saves to DB
        // Response: { success: true, message: "Configuration updated", restartRequired: true/false }
    }

    // === Dependencies ===

    // GET /api/1/plugin/dependencies
    static async getDependencyGraph(req, res) {
        // Returns dependency tree for all plugins
        // Response: { success: true, data: { plugins: [...], dependencies: [...] } }
    }

    // GET /api/1/plugin/:name/dependencies
    static async getPluginDependencies(req, res) {
        // Returns dependencies for specific plugin
        // Response: { success: true, data: { requires: [...], requiredBy: [...] } }
    }

    // === Admin Actions ===

    // POST /api/1/plugin/scan
    static async scan(req, res) {
        // Rescan plugins directory for new plugins
        // Response: { success: true, data: { discovered: 5, new: 2 } }
    }

    // POST /api/1/plugin/:name/install-deps
    static async installDependencies(req, res) {
        // Manually trigger npm install for plugin dependencies
        // Response: { success: true, message: "Dependencies installed" }
    }

    // === Health Monitoring ===

    static getHealthStatus() {
        // Returns overall plugin system health status (standardized format)
        // Called by HealthController during health checks
        // Response: { status: 'ok'|'warning'|'error', pluginCount: 5, enabled: 3, errors: [...] }
    }
}

**Note**: Plugin admin views (`/admin/plugins-*.shtml`) use only API calls to retrieve data. The V in MVC resides in the browser - views are rendered client-side with JavaScript consuming the API endpoints above.
```

#### Hook System for Plugin Integration:
**Deferred to W-045c - Hooks auto-discovered by method naming conventions**

Example hook method names:
- `beforeAuth()`, `afterAuth()` - Authentication hooks
- `beforeSave()`, `afterSave()` - Model save hooks
- `beforeRender()`, `afterRender()` - Template rendering hooks

Plugins define these methods in their controllers, framework calls them automatically.

### Phase 3: Admin UI & Advanced Features (W-045c)

#### Admin Plugin Management UI

**View**: `/admin/plugins` (or `/admin/system/plugins`)

**Features**:
- List installed plugins with status badges (enabled, disabled, error, not configured)
- Enable/disable toggle switches
- View plugin details (metadata, version, author, description)
- Configure plugin settings (dynamic form based on config schema)
- Dependency visualization (tree or graph showing plugin dependencies)
- Load order display (with manual override option for advanced users)
- Plugin health status (loaded successfully, errors, warnings)
- Scan for new plugins button
- Install npm dependencies button (per plugin)

**Plugin Configuration Forms**:
- Generated dynamically from plugin.json config.schema
- Support field types: text, password, number, boolean, select
- Validation based on schema rules
- Help text and placeholders
- Save to pluginConfigs database collection

#### Plugin Types and Capabilities:

1. **MVC Plugins**: Full controller/model/view components
   - Custom routes and endpoints (auto-discovered from controller methods)
   - Database models and schemas (can extend framework models)
   - Template overrides and extensions

2. **Middleware Plugins**: Request/response processing
   - Authentication providers (LDAP, OAuth, SAML)
   - Logging and monitoring extensions
   - Security and validation layers

3. **Theme Plugins**: UI and styling
   - Complete theme packages
   - CSS framework integration
   - Component libraries

4. **Utility Plugins**: Helper functions and services
   - External API integrations
   - Data processing utilities
   - Asset libraries (icons, fonts)

#### Plugin Communication and Dependencies:

**Dependency Resolution** (Automatic):
```javascript
// In PluginManager
static getLoadOrder() {
    // Topological sort based on plugin.json dependencies
    // Returns ordered array of plugin names
    // Throws error if circular dependency detected
}
```

**Inter-Plugin Communication** (Deferred to future work item):
- Service registration and discovery
- Event system for plugin-to-plugin messaging
- Shared data stores

## Hello World Plugin (Demo Implementation)

**Ships with framework as reference implementation:**

```
plugins/hello-world/
├── plugin.json              # Metadata and configuration
├── README.md                # Developer documentation
├── docs/
│   └── README.md            # Site admin/user documentation
├── webapp/
│   ├── controller/
│   │   └── helloPlugin.js   # Simple controller with API methods
│   ├── model/
│   │   └── helloPlugin.js   # Optional model (consistent naming)
│   └── view/
│       ├── jpulse-common.css        # Plugin CSS (W-098 append mode)
│       ├── jpulse-common.js         # Plugin JS (W-098 append mode)
│       ├── jpulse-navigation.js     # Site navigation integration (W-098 append mode)
│       ├── plugins/
│       │   └── hello-world.shtml    # Dashboard card + detail page
│       └── hello-plugin/
│           └── index.shtml          # Example plugin page
└── package.json             # npm dependencies (if needed)
```

**Key Patterns:**
- **W-098 Append Mode**: CSS/JS in `view/` are automatically appended
- **Plugin Dashboard**: `view/plugins/{name}.shtml` contains extract + detail page
- **Extract Pattern**: Same as admin pages - single source of truth
- **Namespace**: Framework provides `window.jPulse.plugins = {}`
- **Naming**: Directory `hello-world/` matches plugin.json `name: "hello-world"`
- **npm Package**: `@jpulse-net/plugin-hello-world` (prefix for npm clarity)

## Naming Conventions

### Plugin Directory & Package Names (Context-Aware)
- **Local Directory**: `plugins/{name}/` (NO suffix - context is clear)
  - Examples: `plugins/hello-world/`, `plugins/ldap-auth/`
  - Rationale: In `plugins/` directory, suffix is redundant
- **npm Package**: `@jpulse-net/plugin-{name}` (WITH prefix - clarity in registry)
  - Examples: `@jpulse-net/plugin-hello-world`, `@jpulse-net/plugin-ldap-auth`
  - Rationale: Industry standard (Babel, ESLint), clear in npm searches
- **plugin.json name**: `{name}` (matches directory name)
  - Examples: `"hello-world"`, `"ldap-auth"`
- **Optional npm field**: `"npmPackage": "@jpulse-net/plugin-{name}"`

**Summary:**
```
Directory:        plugins/hello-world/                 ✅ (no suffix)
npm Package:      @jpulse-net/plugin-hello-world       ✅ (prefix for clarity)
plugin.json:      "name": "hello-world"                ✅ (simple)
Internal refs:    hello-world                          ✅ (simple)
```

### CSS Classes
- **Prefix**: `plg-{pluginname}-*`
- **Example**: `plg-auth-ldap-form`, `plg-dashboard-widget`, `plg-hello-world-button`
- **Rationale**: Short prefix, clear ownership, avoids conflicts with framework classes
- **Scope**: Plugin stylesheets should prefix ALL custom classes
- **W-098 Append Mode**: Use `webapp/view/jpulse-common.css` for auto-appended styles

### JavaScript
- **Namespace**: `window.jPulse.plugins.{pluginName}` (camelCase)
- **Example**: `window.jPulse.plugins.authLdap`, `window.jPulse.plugins.helloWorld`
- **Framework provides**: `window.jPulse.plugins = {}` in jpulse-common.js
- **Global variables**: Discouraged; use plugin namespace instead
- **Events**: Prefix with plugin name: `jpulse:plugin:{pluginName}:{event}`
  - Example: `jpulse:plugin:authLdap:loginSuccess`
- **W-098 Append Mode**: Use `webapp/view/jpulse-common.js` for auto-appended code

### View Paths
- **Structure**: `plugins/{plugin-name}/webapp/view/{path}/*.shtml`
- **Examples**:
  - `plugins/auth-ldap/webapp/view/auth/ldap-login.shtml`
  - `plugins/hello-world/webapp/view/admin/plugins-list.shtml`
- **URL mapping**: Follows standard view routing patterns
  - **New view space**: `/ldap/login.shtml` → plugin introduces page in a new view section
  - **Add to existing**: `/auth/ldap-login.shtml` → plugin adds page to admin section
  - **Replace existing**: `/auth/login.shtml` → plugin replaces framework view
- **Override**: Site can override with `site/webapp/view/auth/ldap-login.shtml` (highest priority)

### Controller Names
- **Convention**:
  - Descriptive names recommended
  - For model and controller pair, it is recommended to use the same name, such as `ContactModel` and `ContactController`
- **Examples**: `LdapAuthController`, `DashboardAnalyticsController`, `HelloPluginController`
- **Replacement**: Plugins CAN replace framework controllers (e.g., `UserController`, `AuthController`)
  - Not recommended for most cases, but possible and sometimes desirable
  - Plugin's controller takes precedence in path resolution order
- **File naming**: `ldapAuth.js`, `dashboardAnalytics.js`, `helloPlugin.js` (camelCase)

### Model Names
- **Convention**:
  - Descriptive names recommended
  - For model and controller pair, it is recommended to use the same name, such as `ContactModel` and `ContactController`
- **Examples**: `LdapUser`, `DashboardWidget`, `HelloPluginData`
- **Replacement**: Plugins CAN replace framework models (e.g., `User`, `Config`)
  - Not recommended for most cases, but possible and sometimes desirable
  - Plugin's model takes precedence in path resolution order
- **File naming**: `ldapUser.js`, `dashboardWidget.js`, `helloPlugin.js` (camelCase)

### Configuration Keys
- **In plugin.json**: Flat structure within config.schema
  - Example: `server`, `baseDN`, `autoEnableUsers`
- **In global config**: Namespaced if needed
  - Example: `plugins.authLdap.enabled`

### Database Collections/Tables
- **Convention**: Descriptive names, prefix optional
- **Examples**: `ldap_users`, `dashboard_widgets`, `hello_data`
- **Alternative**: No prefix if ownership is clear
- **Rationale**: MongoDB collection names should be self-documenting

### Static Assets URLs
- **URL Pattern**: `/static/plugins/{pluginname}/{asset}`
- **Example**: `/static/plugins/auth-ldap/css/ldap-auth.css`
- **Implementation**: Symlink from `webapp/static/plugins/{name}` → `../../plugins/{name}/webapp/static/`
- **Created**: At plugin install/enable time
- **Removed**: At plugin uninstall/disable time

### Documentation Paths
- **Plugin development docs**: `docs/plugins/` (how to create, publish, manage plugins)
  - `README.md` - Overview and quick start
  - `creating-plugins.md` - Step-by-step plugin creation guide
  - `plugin-architecture.md` - Technical architecture details
  - `plugin-api-reference.md` - Complete API reference
  - `publishing-plugins.md` - Publishing and packaging
  - `managing-plugins.md` - Installing and managing plugins
- **Plugin root**: `plugins/{plugin-name}/README.md` (developer-focused)
- **User docs**: `plugins/{plugin-name}/docs/*.md` (site admin/user-focused)
- **Symlinked to**: `docs/installed-plugins/{plugin-name}/` → `../../plugins/{plugin-name}/docs/`
- **Integration**: Automatically included in jpulse-docs generation

### Plugins Dashboard & Detail Pages
- **Pattern**: Chrome extension model with extract pattern (same as `/admin/index.shtml`)
- **Dashboard URL**: `/plugins/` (auto-includes all plugin card extracts)
- **Detail Page URL**: `/plugins/{plugin-name}.shtml` (flat structure, no subdirs)

#### File Structure
```
plugins/hello-world/
└── webapp/view/plugins/
    └── hello-world.shtml              # Detail page + dashboard card extract
```

**Note:** If a plugin needs reusable template fragments (e.g., for complex configuration forms), follow this naming convention:
- `{plugin-name}-config.tmpl` - Configuration form fragment
- `{plugin-name}-monitoring.tmpl` - Monitoring widgets
- `{plugin-name}-advanced.tmpl` - Advanced settings

These fragments can be included in the main `.shtml` file via `{{file.include "plugins/{fragment-name}.tmpl"}}`

#### Dashboard (`/plugins/index.shtml`)
```html
<div class="jp-dashboard-grid">
    <!-- Auto-includes all plugin cards -->
    {{#each file.list "plugins/*.shtml" sortBy="extract-order"}}
        {{file.extract this}}
    {{/each}}
</div>
```

#### Plugin Detail Page Pattern
- **Single source of truth**: One `.shtml` file contains both extract and detail page
- **Extract markers**: `<!-- extract: order=10 -->` ... `<!-- /extract -->`
- **Dashboard card**: Shown on `/plugins/` via extraction
- **Detail page**: Full content shown on `/plugins/hello-world.shtml`
- **Conditional JS**: Detect context via `window.location.pathname`

#### Optional Fragment Files
- **Naming**: `{plugin-name}-{purpose}.tmpl` (e.g., `hello-world-config.tmpl`)
- **Usage**: Reusable fragments for complex plugins
- **Include**: `{{file.include "plugins/hello-world-config.tmpl"}}`
- **Convention**: Document in README, but don't ship example files

#### Benefits
- ✅ Automatic discovery (no manual registration)
- ✅ Single source of truth (no duplication)
- ✅ Familiar pattern (same as admin pages)
- ✅ Scales beautifully (3 plugins or 300)

### Site Navigation Integration
- **File**: `plugins/{plugin-name}/webapp/view/jpulse-navigation.js` (optional)
- **Purpose**: Add plugin pages to site navigation (app icon dropdown, hamburger menu, breadcrumbs)
- **Mechanism**: W-098 append mode (same as jpulse-common.js/css)
- **Load Order**:
  1. `webapp/view/jpulse-navigation.js` (framework navigation)
  2. `site/webapp/view/jpulse-navigation.js` (site navigation, if exists)
  3. `plugins/*/webapp/view/jpulse-navigation.js` (plugin navigation, for enabled plugins)
- **Example**: Add "LDAP Settings" to admin navigation
  ```javascript
  // plugins/auth-ldap/webapp/view/jpulse-navigation.js
  // Append to framework navigation structure
  if (!window.jPulseNavigation.site.admin.pages.ldapSettings) {
      window.jPulseNavigation.site.admin.pages.ldapSettings = {
          label: 'LDAP Settings',
          url: '/admin/ldap-settings.shtml',
          icon: '🔐',
          role: 'admin'
      };
  }
  ```
- **Override Example**: Hide framework navigation item
  ```javascript
  // Set to null to remove item from navigation
  window.jPulseNavigation.site.examples = null;
  ```
- **Benefits**: Plugins seamlessly integrate into site navigation without manual configuration

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

## W-045 Implementation Plan

### Phase W-045a: Core Plugin Infrastructure (Week 1-2)

**Goal**: Enable basic plugin discovery, loading, and configuration

**Tasks**:
1. **Create PluginManager Utility** (`webapp/utils/plugin-manager.js`)
   - Plugin discovery from `plugins/` directory
   - plugin.json validation
   - Dependency resolution (topological sort)
   - `.jpulse/plugins.json` registry management
   - Health status reporting

2. **Create Plugin Model** (`webapp/model/plugin.js`)
   - Database schema for plugin configurations (pluginConfigs collection)
   - CRUD operations
   - Validation against plugin.json schemas

3. **Create PluginController** (`webapp/controller/plugin.js`)
   - Implement core API endpoints: list, get, enable, disable
   - Config endpoints: getConfig, updateConfig
   - Admin actions: scan, installDependencies
   - Health status: getHealthStatus() (standardized format)
   - **Note**: No view rendering methods - views use API calls (V in MVC is in browser)

4. **Extend PathResolver** (`webapp/utils/path-resolver.js`)
   - Add `resolveModuleWithPlugins(modulePath)` method
   - Modify resolution order: site → plugins (load order) → framework
   - Update `collectAllFiles()` for plugin append mode

5. **Extend Configuration Management** (`webapp/app.js`)
   - Add plugin config layer to merge chain
   - Check plugin config timestamps for cache invalidation

6. **Integrate into Bootstrap** (`webapp/utils/bootstrap.js`)
   - Step 12a: Load PluginManager
   - Step 12b: Discover and validate plugins
   - Step 12c: Resolve dependencies and determine load order
   - Step 12d: Initialize enabled plugins
   - Step 12e: Allow plugins to register schema extensions
   - Before Step 13: Ensure models can finalize extended schemas

7. **Create Symlink Manager** (`webapp/utils/symlink-manager.js`)
   - Create symlinks at plugin enable: `webapp/static/plugins/{name}` → `../../plugins/{name}/webapp/static/`
   - Remove symlinks at plugin disable
   - Validate symlink integrity

8. **Create Hello World Plugin** (`plugins/hello-world/`)
   - Minimal working plugin demonstrating structure
   - Simple controller with API endpoints
   - Basic view template with client-side initialization
   - CSS with proper naming (plg-hello-world-*) using W-098 append mode
   - JavaScript using W-098 append mode (`window.jPulse.plugins.helloWorld`)
   - Navigation integration using W-098 append mode
   - Documentation (README.md + docs/README.md)

**Deliverables**:
- ✅ Plugin discovery and validation working
- ✅ Enable/disable plugins via API
- ✅ Plugin configurations stored in database
- ✅ PathResolver includes plugin paths
- ✅ Bootstrap sequence loads plugins
- ✅ Hello World Plugin functional

---

### Phase W-045b: MVC Integration (Week 3-4)

**Goal**: Full MVC support for plugins (controllers, models, views, routes)

**Tasks**:
1. **Extend View Controller** (`webapp/controller/view.js`)
   - Refactor `_buildViewRegistry()` to use PathResolver
   - Include plugin view directories in registry
   - Test plugin template resolution

2. **Extend Controller Registry** (`webapp/utils/site-controller-registry.js`)
   - Rename to `extended-controller-registry.js`
   - Add plugin controller discovery
   - Auto-discover API routes from plugin controller methods
   - Register plugin routes

3. **Update Routes** (`webapp/routes.js`)
   - Add plugin route registration
   - Call extended controller registry

4. **Test Model Schema Extensions**
   - Validate plugin schema extension API
   - Test plugin extending User model
   - Test enum extension for plugins

5. **Validate Static Asset Serving**
   - Test symlink creation/removal
   - Verify nginx serves plugin assets correctly
   - Test plugin CSS/JS loading in browser

6. **Enhance Hello World Plugin**
   - Add model with schema extension example
   - Add multiple views
   - Add API endpoints (auto-discovered routes)
   - Demonstrate static asset loading

**Deliverables**:
- ✅ Plugin controllers registered and callable
- ✅ Plugin views rendered correctly
- ✅ Plugin models work with schema extensions
- ✅ Plugin routes auto-discovered
- ✅ Plugin static assets served via nginx

---

### Phase W-045c: Admin UI & Polish (Week 5-6)

**Goal**: Admin interface for plugin management, documentation, production-ready

**Tasks**:
1. **Build Admin Plugin Views** (client-side rendered)
   - `/admin/plugins-list.shtml` - Display all plugins with status badges, enable/disable toggles
   - `/admin/plugins-config.shtml` - Plugin configuration form (dynamic based on config.schema)
   - `/admin/plugins-detail.shtml` - Plugin metadata, dependencies, health status
   - **Implementation**: Views use JavaScript to call PluginController API endpoints
   - **V in MVC**: Views reside in browser, consume API data

2. **Add Admin Dashboard Integration and Navigation**
   - Auto-discovery for `/admin/index.shtml` dashboard via {{component}} handlebar
   - Add plugin management link to admin navigation using append feature
   - **Navigation Append**: Plugins can add navigation items via `plugins/{name}/webapp/view/jpulse-navigation.js`
     - Uses W-098 append mode (same as jpulse-common.js/css)
     - Framework loads `webapp/view/jpulse-navigation.js` first
     - Then appends `site/webapp/view/jpulse-navigation.js` (if exists)
     - Then appends `plugins/*/webapp/view/jpulse-navigation.js` (for enabled plugins)
     - Plugins can add new navigation sections or override existing ones
     - Example: Add "Plugins" section to admin navigation
   - Plugin health status widget on admin dashboard

3. **Documentation Integration**
   - **Framework dev install**: Create symlinks `docs/plugins/` → plugin docs directories
   - **Site install**: Copy `plugins/[name]/docs/` → `webapp/static/assets/jpulse-docs/plugins/[name]/`
   - Include in jpulse-docs generation
   - Test documentation accessibility for both install types

4. **Dependency Management**
   - Implement `GET /api/1/plugin/dependencies` endpoint
   - Implement `GET /api/1/plugin/:name/dependencies` endpoint
   - Build dependency graph visualization (client-side rendering)

5. **Comprehensive Testing**
   - Unit tests for PluginManager
   - Unit tests for PluginController
   - Unit tests for Plugin Model
   - Integration tests for plugin loading
   - Test with multiple plugins
   - Test dependency resolution
   - Test enable/disable workflows

6. **Documentation**
   - **Site Admin Guide**: How to install, configure, enable/disable plugins
   - **Developer Guide**: How to create plugins, API reference, conventions
   - Update working document with implementation notes
   - Add plugin examples to documentation

7. **Production Readiness**
   - Error handling and recovery
   - Logging and monitoring
   - Performance optimization
   - Security review (basic validation, defer sandboxing)

**Deliverables**:
- ✅ Admin UI fully functional
- ✅ Plugin configuration via web interface
- ✅ Documentation complete (site admin + developer)
- ✅ All tests passing
- ✅ Production-ready plugin system

---

### Success Criteria

**W-045a Complete When**:
- Plugin can be dropped into `plugins/` directory
- Plugin auto-discovered on restart
- Plugin can be enabled/disabled via API
- Plugin configuration stored in database
- Hello World Plugin works end-to-end

**W-045b Complete When**:
- Plugin controllers serve API endpoints
- Plugin views render correctly
- Plugin models extend framework schemas
- Plugin static assets load in browser
- Routes auto-discovered from plugin controllers

**W-045c Complete When**:
- Admin can manage plugins via web UI
- Admin can configure plugins via forms
- Documentation accessible to site admins
- Developer guide enables plugin creation
- System production-ready and tested

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

## Technical Debt and Future Refactoring

### Controllers with Hand-Crafted Site Override Logic

The following controllers have hand-crafted site override logic that should be refactored to use `PathResolver` utilities for consistency and maintainability:

**ViewController** (`webapp/controller/view.js`):
- **Location**: `_buildViewRegistry()` method (lines 287-297)
- **Current Implementation**: Manually scans both `siteDir/view` and `appDir/view` directories
- **Issue**: Duplicates site override logic instead of using `PathResolver`
- **Proposed Fix**: Refactor to use `PathResolver.listFiles()` or create a new `PathResolver.listDirectories()` method
- **Priority**: Medium - works correctly but inconsistent with W-094 patterns
- **Notes**: This is used for building the view route registry, so performance is critical (only runs once at startup)

**HandlebarController** (`webapp/controller/handlebar.js`):
- **Status**: ✅ Already refactored in W-094 to use `PathResolver.listFiles()` for file listing
- **Implementation**: Uses centralized `PathResolver` for site override support in `file.list` helper

### Refactoring Recommendations

1. **Create `PathResolver.listDirectories()`**: Similar to `listFiles()` but returns directories
2. **Refactor ViewController**: Update `_buildViewRegistry()` to use the new method
3. **Audit Other Controllers**: Search for patterns like:
   - `siteDir.*view` or `site/webapp/view`
   - Manual `fs.existsSync()` checks for site overrides
   - Duplicate directory scanning logic

**Timeline**: Address in future work item (post W-094 release)

### Plugin Infrastructure Technical Debt (Out of Scope for W-045)

**Note**: Technical debt items have been moved to a dedicated document for better organization.

See: [`W-045-plugins-tech-debt.md`](./W-045-plugins-tech-debt.md) for the complete list of 13 technical debt items including:
- Handlebar helper discovery
- i18n plugin translation support
- Email template plugin support
- Context extension plugin support
- SQL database migration support
- Plugin testing auto-include
- Plugin sandboxing & security
- Advanced development mode
- Plugin marketplace
- Hook system enhancement
- Plugin communication API
- Form submission data transformation
- Auto-generate plugin documentation index

## Core Code Enhancements Required for W-045

### High Priority (Must-Have for W-045a)

**A. Path Resolution System** (`webapp/utils/path-resolver.js`)
- Add `resolveModuleWithPlugins(modulePath)` method
- Extend `collectAllFiles()` to include plugin paths (for append mode)
- Add plugin path checking: site → plugins (in load order) → framework
- **Complexity**: Medium - extends existing pattern

**B. Bootstrap Sequence** (`webapp/utils/bootstrap.js`)
- Insert Step 12a: Load PluginManager
- Insert Step 12b: Discover and validate plugins
- Insert Step 12c: Resolve plugin dependencies
- Insert Step 12d: Initialize enabled plugins
- Insert Step 12e: Allow plugins to extend schemas
- Ensure plugins loaded before Step 13 (model schema initialization)
- **Complexity**: Medium - adds new steps to existing sequence

**C. Configuration Management** (`webapp/app.js`)
- Extend `generateConsolidatedConfig()` to merge plugin configs
- Add plugin config timestamp checking for cache invalidation
- Support plugin config layer in merge chain
- **Complexity**: Low - extends existing merge pattern

**D. Model Base Classes** (`webapp/model/*.js`)
- Ensure all models implement `initializeSchema()` (already designed)
- Verify `extendSchema()` and `getSchema()` methods work as specified
- Test schema extension with plugin examples
- **Complexity**: Low - mostly validation of existing design

**E. PluginManager Utility** (`webapp/utils/plugin-manager.js`) **[NEW FILE]**
- Create plugin discovery and validation system
- Implement dependency resolution (topological sort)
- Manage .jpulse/plugins.json registry
- Provide `getActivePlugins()` for PathResolver
- Health monitoring
- **Complexity**: High - new utility, core plugin infrastructure

**F. PluginController** (`webapp/controller/plugin.js`) **[NEW FILE]**
- Implement all API endpoints (list, get, enable, disable, config, etc.)
- Database operations on pluginConfigs collection
- Integration with PluginManager
- Health status reporting
- **Complexity**: High - new controller, admin functionality

**G. Plugin Model** (`webapp/model/plugin.js`) **[NEW FILE]**
- Database schema for plugin configurations (pluginConfigs collection)
- CRUD operations for plugin config
- Validation against plugin.json schemas
- **Complexity**: Medium - standard model pattern
- **Naming**: Matches PluginController convention

### Medium Priority (Must-Have for W-045b)

**H. View Controller** (`webapp/controller/view.js`)
- Extend `_buildViewRegistry()` to include plugin view directories
- Use `PathResolver` methods (addresses existing technical debt)
- **Complexity**: Medium - refactoring existing code

**I. Site Controller Registry** (`webapp/utils/site-controller-registry.js`)
- Rename to `extended-controller-registry.js` (handles site + plugins)
- Discover controllers from plugin directories
- Register plugin controller routes (auto-discovery from method names)
- **Complexity**: Medium - extends existing discovery pattern

**J. Routes Configuration** (`webapp/routes.js`)
- Add plugin route registration
- Call extended controller registry for plugin routes
- **Complexity**: Low - minimal changes to existing routes

**K. Symlink Management Utility** (`webapp/utils/symlink-manager.js`) **[NEW FILE]**
- Create symlinks for plugin static assets at enable time
- Remove symlinks at disable time
- Validate symlink integrity
- **Complexity**: Low - simple file system operations

### Low Priority (Nice-to-Have for W-045c)

**L. Admin UI Views** (`webapp/view/admin/plugins-*.shtml`) **[NEW FILES]**
- `/admin/plugins-list.shtml` - Plugin list with status indicators (dynamic content)
- `/admin/plugins-config.shtml` - Plugin configuration with dynamic forms
- `/admin/plugins-detail.shtml` - Plugin detail with dependency visualization
- **Implementation**: Client-side rendered views consuming PluginController API
- **Complexity**: Medium - frontend development
- **Integration**: Auto-discovery for `/admin/index.shtml` dashboard

**M. Documentation Integration** (build/docs tooling)
- Copy plugin docs from `plugins/*/docs/` to `docs/plugins/*/`
- Include in jpulse-docs generation
- **Complexity**: Low - build script modification

## Deferred Decisions (Resolved or Postponed):

### ✅ Resolved in W-045 Planning:
- **Configuration Merging**: Deep merge strategy (implemented in W-014)
- **Plugin Configuration Storage**: Per-plugin documents in pluginConfigs collection
- **Plugin Auto-Enable**: Developer-controlled via autoEnable flag (default: true)
- **Static Asset Plugin Resolution**: Symlink strategy at install time
- **Plugin Discovery**: Auto-discovery from plugins/ directory
- **Naming Conventions**: Comprehensive standards defined (CSS: plg-*, JS: window.JPulse.plugins.*)
- **Documentation Location**: Plugin docs/ copied to docs/plugins/ (lowercase)

### ⏳ Deferred to Future Work Items:

**See**: [`W-045-plugins-tech-debt.md`](./W-045-plugins-tech-debt.md) for complete list of technical debt items.

**Summary** (13 items total):
- **High Priority** (2): SQL migrations, Sandboxing & security
- **Medium Priority** (5): Handlebars, i18n, Testing, Hooks, Form transforms
- **Low Priority** (6): Email templates, Context extensions, Dev mode, Marketplace, Inter-plugin communication, Auto-generate docs
