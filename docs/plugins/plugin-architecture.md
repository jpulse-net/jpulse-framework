# jPulse Docs / Plugins / Plugin Architecture v1.6.5

Understanding how the jPulse plugin system works under the hood.

## System Overview

The jPulse plugin system extends the framework's MVC architecture with:
- **Auto-discovery** of plugin components
- **Priority-based path resolution** (Site → Plugins → Framework)
- **Plugin hooks** for extending framework behavior (auth, user management)
- **Dependency management** with topological sorting
- **Configuration storage** in MongoDB
- **Symlink-based asset serving** for static files
- **API-first design** for all management operations

## Plugin Lifecycle

### 1. Discovery Phase (Server Startup)

```
Server Starts
    ↓
PluginManager.discoverPlugins()
    ↓
Scan plugins/ directory
    ↓
Read plugin.json from each subdirectory
    ↓
Validate metadata schema
    ↓
Check jpulseVersion compatibility
    ↓
Store in .jpulse/plugins.json registry
```

### 2. Dependency Resolution

```
For each discovered plugin:
    ↓
Check jpulseVersion requirement
    ↓
Check plugin dependencies (other plugins)
    ↓
Topological sort for load order
    ↓
Validate no circular dependencies
```

### 3. Initialization Phase

```
For each enabled plugin (in dependency order):
    ↓
Load plugin configuration from MongoDB
    ↓
Create symlinks (static assets + docs)
    ↓
Register controllers (auto-discover api* methods)
    ↓
Register hooks (static hooks = {...} declarations)
    ↓
Register models (extend schemas if needed)
    ↓
Register view paths
    ↓
Append CSS/JavaScript files
    ↓
Plugin ready for use
```

### 4. Runtime Operations

- Controllers handle API requests
- Views render using plugin templates
- Configuration accessed via PluginModel
- Static assets served via symlinks

## Component Integration

### Controllers

**Auto-Discovery Pattern:**

```javascript
// File: plugins/your-plugin/webapp/controller/yourPlugin.js
export default class YourPluginController {
    // Method name pattern: static async api{Method}{OptionalPath}
    static async apiGet(req, res) { }       // → GET /api/1/yourPlugin
    static async apiPost(req, res) { }      // → POST /api/1/yourPlugin
    static async apiGetStats(req, res) { }  // → GET /api/1/yourPlugin/stats
}
```

**Registration Process:**
1. Framework scans `plugins/*/webapp/controller/*.js`
2. Imports each controller class
3. Discovers `static async api*` methods
4. Registers routes based on method names
5. Available at `/api/1/{controllerName}/{path}`

### Models

**Auto-Discovery Pattern:**

```javascript
// File: plugins/your-plugin/webapp/model/yourPlugin.js
import BaseModel from '../../model/base.js';

export default class YourPluginModel extends BaseModel {
    static collectionName = 'yourPlugin_data';
    static schema = { /* fields */ };
}
```

**Schema Extension:**

```javascript
// Extend existing models
import UserModel from '../../model/user.js';

UserModel.extendSchema({
    customField: { type: String },
    pluginData: { type: Object }
});
```

### Views

**Path Resolution (Priority Order):**

```
Request: /your-plugin/index.shtml
    ↓
1. Check: site/webapp/view/your-plugin/index.shtml
2. Check: plugins/*/webapp/view/your-plugin/index.shtml (in dependency order)
3. Check: webapp/view/your-plugin/index.shtml
    ↓
First match wins
```

**Auto-Loaded Files (Concatenated):**

```
jpulse-common.css:
    webapp/view/jpulse-common.css           (framework)
  + site/webapp/view/jpulse-common.css      (site override)
  + plugins/*/webapp/view/jpulse-common.css (each enabled plugin)

jpulse-common.js:
    webapp/view/jpulse-common.js            (framework)
  + site/webapp/view/jpulse-common.js       (site override)
  + plugins/*/webapp/view/jpulse-common.js  (each enabled plugin)

jpulse-navigation.js:
    webapp/view/jpulse-navigation.js            (framework)
  + site/webapp/view/jpulse-navigation.js       (site override)
  + plugins/*/webapp/view/jpulse-navigation.js  (each enabled plugin)
```

### Static Assets

**Symlink Strategy (Context-Aware):**

```
Plugin enabled:
    ↓
Create: webapp/static/plugins/{name} → ../../../plugins/{name}/webapp/static

Documentation symlink (context-dependent):
  Framework repo: docs/installed-plugins/{name} → ../../plugins/{name}/docs
  Site install:   webapp/static/assets/jpulse-docs/installed-plugins/{name} → ../../../../plugins/{name}/docs
    ↓
Assets accessible at:
    /plugins/{name}/file.png
    /jpulse-docs/installed-plugins/{name}/README
```

**Context Detection:** SymlinkManager automatically detects if running in framework repository (has `docs/plugins/`) or site installation (has `webapp/static/assets/jpulse-docs/plugins/`).

**Symlink removal** happens automatically when plugin is disabled.

**Troubleshooting (framework dev repo):** If `docs/installed-plugins/{name}` exists as a real directory (often empty), symlink creation is skipped for safety. Remove/rename the directory and restart the app so PluginManager can create the symlink (e.g., `rm -rf docs/installed-plugins/auth-mfa`).

## Configuration System

### Storage

```
Plugin configuration schema:
    plugin.json (defines fields)
        ↓
Admin UI (generates form)
        ↓
User fills form
        ↓
Validation against schema
        ↓
MongoDB: pluginConfigs collection
        {
            pluginName: 'your-plugin',
            config: { field1: value1, ... },
            updatedAt: Date
        }
```

### Access in Plugin Code

```javascript
// In controllers
import PluginModel from '../../model/plugin.js';

const config = await PluginModel.getByName('your-plugin');
const value = config?.config?.yourField || 'default';

// In client-side JavaScript
const response = await jPulse.api.get('/api/1/plugin/your-plugin/config');
const config = response.data.values;
```

## API Routing

### Framework Routes

Defined in `webapp/routes.js`:

```javascript
router.get('/api/1/plugin/list', PluginController.list);
router.get('/api/1/plugin/:name', PluginController.get);
router.get('/api/1/plugin/:name/config', PluginController.getConfig);
router.put('/api/1/plugin/:name/config', PluginController.updateConfig);
router.post('/api/1/plugin/:name/enable', PluginController.enable);
router.post('/api/1/plugin/:name/disable', PluginController.disable);
router.get('/api/1/plugin/:name/dependencies', PluginController.getDependencies);
```

### Plugin Routes

Auto-discovered from controller methods:
- Controller name determines base URL
- Method name determines HTTP method and path
- Registered at framework startup

## File Loading Order

### Bootstrap Sequence

```
1. Initialize framework core
2. Load framework configuration
3. Load site configuration
4. Discover plugins (PluginManager.discoverPlugins)
5. Validate plugins and resolve dependencies
6. Load enabled plugins in dependency order
7. Register plugin controllers
8. Register plugin models
9. Finalize model schemas (including extensions)
10. Register view paths
11. Create symlinks
12. Framework ready
```

### Request Handling

```
HTTP Request
    ↓
Express routes
    ↓
Controller method (framework or plugin)
    ↓
Model operations (if needed)
    ↓
Response (JSON or view render)
```

## Security Considerations

- **Plugin isolation**: Plugins run in the same process (trusted code only)
- **Configuration validation**: All config values validated against schema
- **Path resolution**: Prevents directory traversal
- **Symlink safety**: Symlinks created/removed by framework only
- **Admin-only operations**: Enable/disable requires admin privileges

## Performance

- **Plugin registry cached**: `.jpulse/plugins.json` for fast lookup
- **Path resolution cached**: Resolved paths cached in memory
- **Asset concatenation**: CSS/JS loaded as single file
- **Lazy loading**: Plugin code only loaded when needed

## Technical Details

For in-depth technical information, see:
- Hello World Plugin Source: `plugins/hello-world/`
- PluginManager Source: `webapp/utils/plugin-manager.js`
- HookManager Source: `webapp/utils/hook-manager.js`

## See Also

- [Creating Plugins](creating-plugins.md) - Step-by-step guide
- [Plugin Hooks](plugin-hooks.md) - Extend framework behavior with hooks
- [API Reference](plugin-api-reference.md) - Complete API documentation
- [Hello World Plugin](../installed-plugins/hello-world/README.md) - Complete example
