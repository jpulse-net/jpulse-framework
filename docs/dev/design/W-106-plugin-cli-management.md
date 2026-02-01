# W-106, v1.3.8: plugins: CLI management to install, enable, list plugins

## Status
✅ DONE (Phase 1-7 implemented 2025-12-04)

## Objective

Add plugin management commands to the jPulse CLI (`npx jpulse plugin ...`) enabling developers and site administrators to install, remove, enable, disable, and list plugins from the command line. This establishes the foundation for plugin distribution via npm.

## Related Work Items

- **W-045**: Plugin infrastructure (completed) - provides plugin system foundation
- **W-105**: Plugin hooks for authentication (completed) - first complex plugin use case
- **W-107**: auth-mfa plugin (pending) - first distributed plugin, depends on this

## Bootstrap Plan

W-106 and W-107 bootstrap each other. Implementation sequence:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Bootstrap W-106 & W-107                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 1: Manual Bootstrap                                                  │
│  ─────────────────────────                                                  │
│  1. Create github.com/jpulse-net/plugin-auth-mfa repo                       │
│  2. Add scaffold: plugin.json, package.json, config schema only             │
│  3. Manual: npm publish @jpulse-net/plugin-auth-mfa@0.5.0                   │
│                                                                             │
│  Phase 2: Implement W-106 (CLI)                                             │
│  ──────────────────────────────                                             │
│  4. Implement npx jpulse plugin install/update/list/enable/disable          │
│  5. Test with auth-mfa@0.5.0 as guinea pig                                  │
│  6. Implement npx jpulse plugin publish (with version sync)                 │
│                                                                             │
│  Phase 3: Implement W-107 (MFA functionality)                               │
│  ────────────────────────────────────────────                               │
│  7. Add MFA hooks, controller, model, views                                 │
│  8. npx jpulse plugin publish auth-mfa  → 1.0.0                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Current State

The CLI (`bin/jpulse-framework.js`) currently supports:
- `configure` - Configure jPulse site
- `update` - Update framework
- `bump-version` - Version management
- `setup` / `mongodb-setup` / `validate` - Deployment tools

**No plugin commands exist yet.**

Plugins are currently:
1. Manually placed in `plugins/` directory
2. Auto-discovered on server startup
3. Enabled/disabled via Admin UI (`/admin/plugins`)

---

## CLI Command Specification

### Command Structure

```bash
npx jpulse plugin <action> [name] [options]
```

### Help Output

Running `npx jpulse plugin` without an action shows help:

```
jPulse Plugin Manager

Usage: npx jpulse plugin <action> [name] [options]

Actions:
  list [--all] [--json]     List installed plugins
  info <name>               Show detailed plugin information
  install <source>          Install plugin from npm, git, or local path
  update [name]             Update plugin(s) to latest version
  remove <name>             Remove an installed plugin
  enable <name>             Enable a disabled plugin
  disable <name>            Disable an enabled plugin
  publish <name>            Publish plugin to npm registry

Options:
  --help, -h                Show this help message
  --version, -v             Show CLI version

Examples:
  npx jpulse plugin list
  npx jpulse plugin install auth-mfa
  npx jpulse plugin enable auth-mfa
  npx jpulse plugin publish auth-mfa

Note: Plugins can also be managed via Admin UI at /admin/plugins
```

### Actions

| Action | Syntax | Description |
|--------|--------|-------------|
| `list` | `npx jpulse plugin list [--all]` | List plugins |
| `info` | `npx jpulse plugin info <name>` | Show plugin details |
| `install` | `npx jpulse plugin install <source>` | Install plugin |
| `update` | `npx jpulse plugin update [name]` | Update plugin(s) |
| `remove` | `npx jpulse plugin remove <name>` | Remove plugin |
| `enable` | `npx jpulse plugin enable <name>` | Enable plugin |
| `disable` | `npx jpulse plugin disable <name>` | Disable plugin |
| `publish` | `npx jpulse plugin publish <name>` | Publish plugin to npm |

---

## Detailed Command Specifications

### 1. `plugin list`

List installed plugins with their status.

```bash
npx jpulse plugin list           # List enabled plugins
npx jpulse plugin list --all     # List all plugins (including disabled)
npx jpulse plugin list --json    # Output as JSON
```

**Example Output:**

```
jPulse Plugins

  Name              Version   Status    Source
  ─────────────────────────────────────────────────────
  hello-world       1.3.7     enabled   local
  auth-mfa          1.0.0     enabled   @jpulse-net/plugin-auth-mfa

Total: 2 plugins (2 enabled, 0 disabled)
```

**With `--all`:**

```
jPulse Plugins

  Name              Version   Status     Source
  ─────────────────────────────────────────────────────
  hello-world       1.3.7     enabled    local
  auth-mfa          1.0.0     enabled    @jpulse-net/plugin-auth-mfa
  auth-ldap         1.0.0     disabled   @jpulse-net/plugin-auth-ldap

Total: 3 plugins (2 enabled, 1 disabled)
```

---

### 2. `plugin info`

Show detailed information about a plugin.

```bash
npx jpulse plugin info <name>
npx jpulse plugin info auth-mfa
```

**Example Output:**

```
Plugin: auth-mfa

  Name:           auth-mfa
  Version:        1.0.0
  Status:         enabled
  Auto-Enable:    false
  Source:         @jpulse-net/plugin-auth-mfa

  Summary:        Multi-factor authentication using TOTP
  Author:         jPulse Team <team@jpulse.net>
  jPulse Version: >=1.3.8

  Dependencies:
    npm:          otplib@^12.0.0
    plugins:      (none)

  Hooks Registered:
    - authAfterPasswordValidationHook (priority: 100)
    - authValidateMfaHook (priority: 100)
    - authOnMfaSuccessHook (priority: 100)
    - authOnMfaFailureHook (priority: 100)

  Location:       node_modules/@jpulse-net/plugin-auth-mfa
  Installed:      2025-12-04T10:30:00Z
  Enabled:        2025-12-04T10:35:00Z
```

---

### 3. `plugin install`

Install a plugin from various sources.

```bash
# By name (shorthand - assumes @jpulse-net/plugin-{name})
npx jpulse plugin install auth-mfa
npx jpulse plugin install auth-mfa@1.0.0

# By full npm package name
npx jpulse plugin install @jpulse-net/plugin-auth-mfa
npx jpulse plugin install @jpulse-net/plugin-auth-mfa@1.0.0

# From GitHub (same repo as npm, for development/preview)
npx jpulse plugin install github:jpulse-net/plugin-auth-mfa
npx jpulse plugin install git+https://github.com/jpulse-net/plugin-auth-mfa.git

# From local path (development)
npx jpulse plugin install ./my-local-plugin
npx jpulse plugin install /absolute/path/to/plugin

# From local/private npm registry (air-gapped environments)
npx jpulse plugin install auth-mfa --registry=http://localhost:4873
npx jpulse plugin install @myorg/plugin-auth-mfa --registry=http://npm.internal.corp

# With auto-enable override
npx jpulse plugin install auth-mfa --enable
npx jpulse plugin install auth-mfa --no-enable
```

**Name Resolution:**

When a simple name is provided (e.g., `auth-mfa`), it is expanded to `@jpulse-net/plugin-auth-mfa`.

```
auth-mfa           → @jpulse-net/plugin-auth-mfa
auth-mfa@1.0.0     → @jpulse-net/plugin-auth-mfa@1.0.0
@custom/my-plugin  → @custom/my-plugin (used as-is)
./local-plugin     → local path (copied to plugins/)
```

**Installation Process:**

1. Resolve plugin name to full package name
2. Validate source is a valid jPulse plugin (has `plugin.json`)
3. Check jPulse version compatibility (`jpulseVersion` field)
4. Install via npm (respects `.npmrc` for private registries)
5. Register plugin in database
6. Enable if `autoEnable: true` (or `--enable` flag)

**Example Output:**

```
Installing plugin @jpulse-net/plugin-auth-mfa...

  ✓ Downloaded @jpulse-net/plugin-auth-mfa@1.0.0
  ✓ Verified plugin.json
  ✓ Checked jPulse version compatibility (>=1.3.8)
  ✓ Installed npm dependencies (otplib@12.0.1)
  ✓ Registered plugin in database

Plugin 'auth-mfa' installed successfully!

  Status: disabled (autoEnable: false)

  To enable:
    npx jpulse plugin enable auth-mfa

  Or configure first at:
    /admin/plugins/auth-mfa
```

---

### 4. `plugin update`

Update installed plugin(s) to latest version.

```bash
npx jpulse plugin update              # Update all npm-installed plugins
npx jpulse plugin update auth-mfa     # Update specific plugin
npx jpulse plugin update auth-mfa@2.0.0  # Update to specific version
```

**Update Process:**

1. Fetch latest version from npm (or specified version)
2. Check jPulse version compatibility
3. Sync files to `plugins/` directory
4. Skip files listed in `preserveOnUpdate` (if any)
5. Preserve plugin configuration in database

**Example Output:**

```
Updating plugin 'auth-mfa'...

  Current version: 1.0.0
  Latest version:  1.1.0

  ✓ Downloaded @jpulse-net/plugin-auth-mfa@1.1.0
  ✓ Verified jPulse version compatibility
  ✓ Synced plugin files to plugins/auth-mfa/
  ✓ Configuration preserved

Plugin 'auth-mfa' updated to 1.1.0

  ⚠ Note: Server restart required for changes to take effect.

  Review changes with: git diff plugins/auth-mfa/
```

---

### 5. `plugin remove`

Remove an installed plugin.

```bash
npx jpulse plugin remove <name>
npx jpulse plugin remove auth-mfa
npx jpulse plugin remove auth-mfa --force  # Skip confirmation
```

**Removal Process:**

1. Check if plugin is enabled (warn user)
2. Confirm removal (unless `--force`)
3. Disable plugin if enabled
4. Unregister hooks
5. Remove plugin files
6. Remove from database
7. Note: Does NOT remove npm dependencies (they may be shared)

**Example Output:**

```
Removing plugin 'auth-mfa'...

  ⚠ Warning: This plugin is currently enabled.

  Removing will:
    - Disable the plugin
    - Remove plugin files
    - Remove plugin configuration from database

  Note: npm dependencies are not removed (run 'npm prune' if needed)

  Continue? [y/N] y

  ✓ Disabled plugin
  ✓ Unregistered hooks
  ✓ Removed plugin files
  ✓ Removed from database

Plugin 'auth-mfa' removed successfully!
```

---

### 6. `plugin enable`

Enable a disabled plugin.

```bash
npx jpulse plugin enable <name>
npx jpulse plugin enable auth-mfa
npx jpulse plugin enable auth-mfa --force  # Skip configuration check
```

**Enable Process:**

1. Check if plugin exists and is disabled
2. **Configuration check** (for plugins with `autoEnable: false`):
   - If plugin has required config fields that are not set, bail out with error
   - Suggest user to configure first via Admin UI
   - Use `--force` to skip this check
3. Enable plugin in database
4. Register hooks

**Example Output (success):**

```
Enabling plugin 'auth-mfa'...

  ✓ Configuration verified
  ✓ Plugin enabled
  ✓ Hooks registered (4 hooks)

Plugin 'auth-mfa' is now enabled.

  ⚠ Note: Server restart may be required for full effect.
```

**Example Output (not configured):**

```
Enabling plugin 'auth-mfa'...

  ✗ Error: Plugin requires configuration before enabling.

  This plugin has autoEnable: false, indicating it needs configuration.

  Required settings not configured:
    - mfaPolicy (MFA Policy)

  Please configure the plugin first:
    /admin/plugins/auth-mfa

  Or use --force to enable without configuration check:
    npx jpulse plugin enable auth-mfa --force
```

---

### 7. `plugin disable`

Disable an enabled plugin.

```bash
npx jpulse plugin disable <name>
npx jpulse plugin disable auth-mfa
```

**Example Output:**

```
Disabling plugin 'auth-mfa'...

  ✓ Hooks unregistered (4 hooks)
  ✓ Plugin disabled

Plugin 'auth-mfa' is now disabled.

  Note: Server restart may be required for full effect.
```

---

### 8. `plugin publish`

Publish a plugin to npm registry.

```bash
npx jpulse plugin publish <name>
npx jpulse plugin publish auth-mfa
npx jpulse plugin publish auth-mfa --tag beta
```

**Publish Process:**

1. Validate `plugin.json` exists and is valid
2. Sync version: `plugin.json` → `package.json` (ensures consistency)
3. Validate `package.json` has correct `@jpulse-net/plugin-*` name
4. Run `npm publish` from plugin directory
5. Optionally create git tag

**Example Output:**

```
Publishing plugin 'auth-mfa'...

  Plugin directory: plugins/auth-mfa
  Package name:     @jpulse-net/plugin-auth-mfa
  Version:          1.0.0

  ✓ Validated plugin.json
  ✓ Synced version to package.json
  ✓ npm publish completed

Plugin '@jpulse-net/plugin-auth-mfa@1.0.0' published successfully!

  View at: https://github.com/jpulse-net/plugin-auth-mfa/packages
```

---

## Plugin Development Workflow

### Repository Structure

Each plugin has its **own GitHub repository**:

```
github.com/jpulse-net/plugin-auth-mfa    ← plugin repo
github.com/jpulse-net/plugin-auth-ldap   ← plugin repo
github.com/jpulse-net/jpulse-framework   ← framework repo
```

### Clone-Within-Clone Development

Plugins are developed by cloning into the framework's `plugins/` directory:

```bash
# 1. Clone framework
cd ~/Dev
git clone git@github.com:jpulse-net/jpulse-framework.git
cd jpulse-framework

# 2. Clone plugin into plugins/ (nested clone)
cd plugins
git clone git@github.com:jpulse-net/plugin-auth-mfa.git auth-mfa

# Result:
jpulse-framework/           ← framework repo
├── .git/                   ← framework's git
├── plugins/
│   ├── auth-mfa/           ← plugin repo (git-ignored by framework)
│   │   ├── .git/           ← plugin's own git
│   │   ├── plugin.json
│   │   ├── package.json
│   │   └── webapp/
│   └── hello-world/        ← ships with framework (NOT git-ignored)
└── webapp/
```

**Why this works:**
- Framework's `.gitignore` has `plugins/*` → ignores all plugins
- Exception: `!plugins/hello-world/` → hello-world tracked by framework
- Each plugin clone has its own `.git/` → independent repo
- Git naturally ignores nested `.git/` directories

### Development Workflow

```bash
# Work on framework
cd ~/Dev/jpulse-framework
git status                    # Shows framework changes only
git commit -m "framework update"
git push                      # Pushes to framework repo

# Work on plugin
cd plugins/auth-mfa
git status                    # Shows plugin changes only
git commit -m "add MFA hooks"
git push                      # Pushes to plugin repo

# Publish plugin
npx jpulse plugin publish auth-mfa
```

### Clean Separation

| Location | Git Status Shows | Git Push Goes To |
|----------|------------------|------------------|
| `~/Dev/jpulse-framework/` | Framework changes | Framework repo |
| `~/Dev/jpulse-framework/plugins/auth-mfa/` | Plugin changes | Plugin repo |

---

## Plugin Sources & Locations

### Source Types

| Source Type | Example | Transport |
|-------------|---------|-----------|
| Name (shorthand) | `auth-mfa` | npm (→ `@jpulse-net/plugin-auth-mfa`) |
| npm package | `@jpulse-net/plugin-auth-mfa` | npm |
| GitHub | `github:jpulse-net/plugin-auth-mfa` | npm/git |
| Git URL | `git+https://...` | npm/git |
| Local tarball | `./plugin-1.0.0.tgz` | npm |
| Private registry | `auth-mfa --registry=...` | npm |
| Local path | `./my-plugin` | direct copy |

### Two-Step Installation Process

Following the same pattern as `npx jpulse update`:

**Step 1: Fetch** - Get package from source
```
npm install @jpulse-net/plugin-auth-mfa
    → node_modules/@jpulse-net/plugin-auth-mfa/
```

**Step 2: Sync** - Copy files to `plugins/` directory
```
plugins/auth-mfa/
├── plugin.json
├── README.md
└── webapp/
    ├── controller/
    ├── model/
    ├── view/
    └── static/
```

**Key points:**
- `node_modules/` is the transport/cache location (managed by npm)
- `plugins/` is the runtime location (where framework discovers plugins)
- This mirrors how framework files go from `node_modules/@jpulse-net/jpulse-framework/` → `webapp/`

### Initial Install vs Update

**Default behavior:** All plugin files are overwritten on update.

| File Type | On Install | On Update |
|-----------|------------|-----------|
| All plugin files | ✓ Copy | ✓ Overwrite |
| User config in DB | N/A | ✓ Preserve |

**Optional:** If a plugin needs certain files to only be copied on initial install (not overwritten), it can specify this in `plugin.json`:

```json
{
    "name": "my-plugin",
    "preserveOnUpdate": [
        "webapp/view/custom-template.shtml",
        "webapp/static/config.js"
    ]
}
```

Files listed in `preserveOnUpdate` are:
- Copied on initial install
- Skipped on update (preserving user modifications)

### Plugin Discovery (Runtime)

At server startup, the plugin manager discovers plugins from `plugins/` directory.

**No change to discovery:** W-106 does NOT change plugin discovery. All plugins are discovered from `plugins/` only.

**What W-106 changes:** Adds CLI commands to fetch plugins from npm and sync them to `plugins/`.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Plugin Installation Flow                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Source                    Transport              Runtime Location         │
│   ──────                    ─────────              ────────────────         │
│                                                                             │
│   npm registry         ──►  node_modules/    ──►   plugins/auth-mfa/        │
│   GitHub repo          ──►  node_modules/    ──►   plugins/auth-mfa/        │
│   Private registry     ──►  node_modules/    ──►   plugins/auth-mfa/        │
│   Local tarball        ──►  node_modules/    ──►   plugins/auth-mfa/        │
│   Local path           ────────────────────────►   plugins/my-plugin/       │
│                                                                             │
│   Framework discovers plugins from: plugins/                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Air-Gapped / Private Registry Support

For environments without public internet access:

```bash
# Use local Verdaccio or Nexus registry
npx jpulse plugin install auth-mfa --registry=http://npm.internal.corp:4873

# Registry can also be set in .npmrc
# .npmrc:
# @jpulse-net:registry=http://npm.internal.corp:4873

# Install from local tarball
npx jpulse plugin install ./plugin-auth-mfa-1.0.0.tgz
```

### Framework Update Shows Plugin Updates

When running `npx jpulse update`, the framework update also shows available plugin updates:

```bash
$ npx jpulse update

📦 Updating @jpulse-net/jpulse-framework to latest...
✅ Framework updated to 1.3.9

💡 Plugin updates available:
   auth-mfa: 1.0.0 → 1.1.0

   Run: npx jpulse plugin update
```

**Note:** Framework and plugin updates are separate commands for:
- Clear separation of concerns
- Explicit control over what gets updated
- Easier debugging if something breaks

### npm Package Naming Convention

```
@jpulse-net/plugin-{name}
```

Examples:
- `@jpulse-net/plugin-auth-mfa`
- `@jpulse-net/plugin-auth-ldap`
- `@jpulse-net/plugin-auth-oauth2`
- `@jpulse-net/plugin-analytics`

---

## Plugin Package Structure

### Required and Optional Files

```
plugin-auth-mfa/
├── package.json                # npm package manifest
├── plugin.json                 # jPulse plugin manifest (required)
├── README.md                   # Plugin documentation (required)
└── webapp/                     # Plugin code
    ├── controller/             # API controllers
    │   └── mfaAuth.js          # Declare hooks (required if hooks are used)
    ├── model/                  # Data models
    ├── view/                   # Templates
    │   └── jpulse-plugins/
    │       └── auth-mfa.shtml  # User facing plugin page (required)
    └── static/                 # Static assets
```

### package.json Template

```json
{
    "name": "@jpulse-net/plugin-auth-mfa",
    "version": "1.0.0",
    "description": "MFA plugin for jPulse Framework",
    "keywords": ["jpulse", "jpulse-plugin", "mfa", "authentication"],
    "author": "jPulse Team <team@jpulse.net>",
    "license": "BSL-1.1",
    "repository": {
        "type": "git",
        "url": "https://github.com/jpulse-net/plugin-auth-mfa.git"
    },
    "publishConfig": {
        "registry": "https://npm.pkg.github.com"
    },
    "main": "webapp/controller/mfaAuth.js",
    "files": [
        "plugin.json",
        "webapp/",
        "docs/",
        "README.md"
    ],
    "peerDependencies": {
        "@jpulse-net/jpulse-framework": ">=1.3.8"
    },
    "dependencies": {
        "otplib": "^12.0.0"
    }
}
```

### plugin.json Template

```json
{
    "name": "auth-mfa",
    "npmPackage": "@jpulse-net/plugin-auth-mfa",
    "version": "1.0.0",
    "icon": "🔐",
    "summary": "Multi-factor authentication using TOTP",
    "description": "<p>Adds TOTP-based MFA to jPulse...</p>",
    "author": "jPulse Team <team@jpulse.net>",
    "jpulseVersion": ">=1.3.8",
    "autoEnable": false,
    "dependencies": {
        "npm": {
            "otplib": "^12.0.0"
        },
        "plugins": {}
    },
    "config": {
        "schema": [...]
    }
}
```

---

## Technical Implementation

### New File: `bin/plugin-manager-cli.js`

Handles all `npx jpulse plugin` commands.

```javascript
// bin/plugin-manager-cli.js

/**
 * Plugin CLI Manager
 * Handles: list, info, install, remove, enable, disable
 */

import { PluginManager } from '../webapp/utils/plugin-manager.js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

class PluginCLI {

    static async run(args) {
        const action = args[0];
        const target = args[1];
        const options = this.parseOptions(args.slice(2));

        switch (action) {
            case 'list':
                return this.list(options);
            case 'info':
                return this.info(target);
            case 'install':
                return this.install(target, options);
            case 'remove':
            case 'uninstall':
                return this.remove(target, options);
            case 'enable':
                return this.enable(target);
            case 'disable':
                return this.disable(target);
            default:
                this.showHelp();
        }
    }

    static async list(options) {
        // Load plugin registry
        // Display formatted table
    }

    static async install(source, options) {
        // 1. Determine source type (npm, git, local)
        // 2. Download/copy plugin
        // 3. Validate plugin.json
        // 4. Check version compatibility
        // 5. Install npm dependencies
        // 6. Register in database
        // 7. Enable if autoEnable or --enable flag
    }

    // ... other methods
}
```

### Update: `bin/jpulse-framework.js`

Add plugin command routing:

```javascript
const commands = {
    'configure': './configure.js',
    'config': './configure.js',
    'update': './jpulse-update.js',
    'bump-version': './bump-version.js',
    'version-bump': './bump-version.js',
    'setup': './jpulse-setup.sh',
    'mongodb-setup': './mongodb-setup.sh',
    'db-setup': './mongodb-setup.sh',
    'validate': './jpulse-validate.sh',
    'plugin': './plugin-manager-cli.js'  // NEW
};
```

### Update: `webapp/utils/plugin-manager.js`

Add CLI-accessible methods:

```javascript
class PluginManager {
    // Existing methods...

    /**
     * Install plugin from source (CLI use)
     * @param {string} source - npm package, git URL, or local path
     * @param {object} options - Installation options
     */
    static async installFromSource(source, options = {}) {
        // Implementation
    }

    /**
     * Remove plugin (CLI use)
     * @param {string} name - Plugin name
     */
    static async removePlugin(name) {
        // Implementation
    }

    /**
     * Get plugin list with metadata (CLI use)
     * @param {boolean} includeDisabled - Include disabled plugins
     */
    static async getPluginList(includeDisabled = false) {
        // Implementation
    }
}
```

---

## Database Schema Updates

### Plugin Registry Entry (existing, enhanced)

```javascript
{
    _id: 'auth-mfa',
    name: 'auth-mfa',
    npmPackage: '@jpulse-net/plugin-auth-mfa',  // NEW
    version: '1.0.0',
    enabled: true,
    autoEnable: false,
    source: 'npm',                              // NEW: 'npm', 'git', 'local'
    installedAt: ISODate('2025-12-04...'),      // NEW
    installedBy: 'cli',                         // NEW: 'cli', 'auto', 'admin'
    enabledAt: ISODate('2025-12-04...'),
    config: {...}
}
```

---

## Error Handling

### Common Errors

| Error | Message | Resolution |
|-------|---------|------------|
| Plugin not found | `Plugin 'xyz' not found` | Check plugin name |
| Already installed | `Plugin 'xyz' is already installed` | Use `--force` to reinstall |
| Version mismatch | `Plugin requires jPulse >=1.4.0, current: 1.3.8` | Update jPulse or use compatible plugin version |
| Invalid plugin | `Invalid plugin: missing plugin.json` | Check plugin package |
| Dependency failed | `Failed to install npm dependencies` | Check npm registry access |

---

## Testing Plan

### Unit Tests

1. **Command parsing**: Options and arguments parsed correctly
2. **Source detection**: npm vs git vs local path detection
3. **Version compatibility**: jPulseVersion checking logic
4. **Plugin validation**: plugin.json validation

### Integration Tests

1. **Install from npm**: Full install flow from registry
2. **Install from local**: Development workflow
3. **Enable/disable cycle**: State management
4. **Remove plugin**: Clean removal
5. **List plugins**: Accurate display

### Manual Testing

1. Install auth-mfa plugin from npm
2. Configure via admin UI
3. Enable plugin
4. Verify MFA works
5. Disable and remove plugin

---

## Implementation Plan

### Phase 0: Bootstrap (Manual)

**Objective:** Create auth-mfa@0.5.0 scaffold as guinea pig for CLI development.

| Step | Task | Output |
|------|------|--------|
| 0.1 | Create GitHub repo `jpulse-net/plugin-auth-mfa` | Empty repo |
| 0.2 | Add plugin scaffold (plugin.json, package.json, README) | Basic structure |
| 0.3 | Add config schema only (no functionality) | Configurable plugin |
| 0.4 | Manual `npm publish` to GitHub Packages | `@jpulse-net/plugin-auth-mfa@0.5.0` |

**Files created:**
```
plugin-auth-mfa/
├── package.json        # @jpulse-net/plugin-auth-mfa
├── plugin.json         # name, version, config schema
├── README.md
└── webapp/
    └── controller/
        └── mfaAuth.js  # Empty controller with hooks declaration
```

---

### Phase 1: CLI Foundation

**Objective:** Basic CLI structure and routing.

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 1.1 | Create `bin/plugin-manager-cli.js` scaffold | bin/plugin-manager-cli.js | 1h |
| 1.2 | Add `plugin` command routing to dispatcher | bin/jpulse-framework.js | 0.5h |
| 1.3 | Implement help output (no action) | bin/plugin-manager-cli.js | 0.5h |
| 1.4 | Add argument/option parsing | bin/plugin-manager-cli.js | 1h |
| | **Phase 1 Total** | | **3h** |

**Deliverable:** `npx jpulse plugin` shows help, dispatches to subcommands.

---

### Phase 2: Read-Only Commands

**Objective:** Commands that don't modify state.

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 2.1 | Implement `plugin list` | bin/plugin-manager-cli.js | 1.5h |
| 2.2 | Implement `plugin list --all` and `--json` | bin/plugin-manager-cli.js | 0.5h |
| 2.3 | Implement `plugin info <name>` | bin/plugin-manager-cli.js | 1.5h |
| 2.4 | Add PluginManager.getPluginList() method | webapp/utils/plugin-manager.js | 1h |
| 2.5 | Unit tests for list/info | webapp/tests/unit/ | 1h |
| | **Phase 2 Total** | | **5.5h** |

**Deliverable:** Can list and inspect plugins from CLI.

---

### Phase 3: Install Command

**Objective:** Install plugins from npm.

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 3.1 | Implement name resolution (auth-mfa → @jpulse-net/plugin-auth-mfa) | bin/plugin-manager-cli.js | 0.5h |
| 3.2 | Implement npm install wrapper | bin/plugin-manager-cli.js | 1h |
| 3.3 | Implement sync from node_modules/ to plugins/ | bin/plugin-manager-cli.js | 1.5h |
| 3.4 | Validate plugin.json after install | bin/plugin-manager-cli.js | 0.5h |
| 3.5 | Check jPulse version compatibility | bin/plugin-manager-cli.js | 0.5h |
| 3.6 | Register plugin in database | webapp/utils/plugin-manager.js | 1h |
| 3.7 | Handle --enable/--no-enable flags | bin/plugin-manager-cli.js | 0.5h |
| 3.8 | **Test:** Install auth-mfa@0.5.0 guinea pig | Manual test | 0.5h |
| 3.9 | Unit/integration tests for install | webapp/tests/ | 1.5h |
| | **Phase 3 Total** | | **7.5h** |

**Deliverable:** `npx jpulse plugin install auth-mfa` works end-to-end.

---

### Phase 4: Update Command

**Objective:** Update installed plugins.

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 4.1 | Implement version check (current vs latest) | bin/plugin-manager-cli.js | 1h |
| 4.2 | Implement npm update wrapper | bin/plugin-manager-cli.js | 0.5h |
| 4.3 | Implement sync with preserveOnUpdate support | bin/plugin-manager-cli.js | 1h |
| 4.4 | Preserve database config on update | bin/plugin-manager-cli.js | 0.5h |
| 4.5 | Implement `plugin update` (all plugins) | bin/plugin-manager-cli.js | 0.5h |
| 4.6 | Add "plugin updates available" to `npx jpulse update` | bin/jpulse-update.js | 1h |
| 4.7 | Unit/integration tests for update | webapp/tests/ | 1h |
| | **Phase 4 Total** | | **5.5h** |

**Deliverable:** `npx jpulse plugin update auth-mfa` works.

---

### Phase 5: Enable/Disable/Remove Commands

**Objective:** Plugin state management.

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 5.1 | Implement `plugin enable <name>` | bin/plugin-manager-cli.js | 1h |
| 5.2 | Add configuration check for autoEnable:false plugins | bin/plugin-manager-cli.js | 0.5h |
| 5.3 | Implement `plugin disable <name>` | bin/plugin-manager-cli.js | 0.5h |
| 5.4 | Implement `plugin remove <name>` | bin/plugin-manager-cli.js | 1h |
| 5.5 | Add confirmation prompt for remove | bin/plugin-manager-cli.js | 0.5h |
| 5.6 | Unit/integration tests | webapp/tests/ | 1h |
| | **Phase 5 Total** | | **4.5h** |

**Deliverable:** Full plugin lifecycle management via CLI.

---

### Phase 6: Publish Command

**Objective:** Publish plugins to npm.

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 6.1 | Implement `plugin publish <name>` | bin/plugin-manager-cli.js | 1h |
| 6.2 | Implement version sync (plugin.json → package.json) | bin/plugin-manager-cli.js | 1h |
| 6.3 | Validate plugin structure before publish | bin/plugin-manager-cli.js | 0.5h |
| 6.4 | Run npm publish from plugin directory | bin/plugin-manager-cli.js | 0.5h |
| 6.5 | **Test:** Publish auth-mfa@0.6.0 | Manual test | 0.5h |
| 6.6 | Unit tests for publish | webapp/tests/ | 0.5h |
| | **Phase 6 Total** | | **4h** |

**Deliverable:** `npx jpulse plugin publish auth-mfa` works.

---

### Phase 7: Documentation & Polish

**Objective:** Complete documentation and error handling.

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 7.1 | Comprehensive error messages | bin/plugin-manager-cli.js | 1h |
| 7.2 | Update docs/plugins/managing-plugins.md | docs/plugins/ | 1.5h |
| 7.3 | Add CLI examples to README | docs/ | 0.5h |
| 7.4 | Final integration testing | Manual | 1h |
| | **Phase 7 Total** | | **4h** |

**Deliverable:** Production-ready CLI with documentation.

---

### Implementation Summary

| Phase | Description | Effort |
|-------|-------------|--------|
| 0 | Bootstrap (auth-mfa@0.5.0 scaffold) | Manual |
| 1 | CLI Foundation | 3h |
| 2 | Read-Only Commands (list, info) | 5.5h |
| 3 | Install Command | 7.5h |
| 4 | Update Command | 5.5h |
| 5 | Enable/Disable/Remove | 4.5h |
| 6 | Publish Command | 4h |
| 7 | Documentation & Polish | 4h |
| | **Total** | **~34h** |

---

## Deliverables

- [x] `bin/plugin-manager-cli.js` - CLI command handler (~1500 lines)
- [x] Update `bin/jpulse-framework.js` - Add plugin command routing
- [ ] Update `bin/jpulse-update.js` - Show available plugin updates (future)
- [ ] Update `webapp/utils/plugin-manager.js` - Add CLI methods (standalone impl)
- [x] Publish command with version sync
- [ ] Unit tests for CLI commands (manual testing done)
- [ ] Integration tests for install/update/remove/publish flow (manual testing done)
- [x] Update CLI help text
- [x] Documentation in `docs/plugins/managing-plugins.md`

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1: CLI Foundation | 3h |
| Phase 2: Read-Only Commands | 5.5h |
| Phase 3: Install Command | 7.5h |
| Phase 4: Update Command | 5.5h |
| Phase 5: Enable/Disable/Remove | 4.5h |
| Phase 6: Publish Command | 4h |
| Phase 7: Documentation & Polish | 4h |
| **Total** | **~34h** |

---

## Future Enhancements (Out of Scope)

- Plugin search (`npx jpulse plugin search <query>`)
- Plugin create scaffold (`npx jpulse plugin create <name>`)
- Plugin registry UI (beyond npm)
- Plugin dependency resolution between plugins
- Automatic git tagging on publish
