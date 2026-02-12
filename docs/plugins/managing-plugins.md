# jPulse Docs / Plugins / Managing Plugins via CLI v1.6.16

jPulse Framework provides a command-line interface for managing plugins. This guide covers installation, updates, and publishing.

## Quick Start

```bash
# List installed plugins
npx jpulse plugin list

# Install a plugin
npx jpulse plugin install auth-mfa

# Enable/disable a plugin
npx jpulse plugin enable auth-mfa
npx jpulse plugin disable auth-mfa

# Get detailed info
npx jpulse plugin info auth-mfa
```

---

## Commands Reference

### `plugin list`

List installed plugins.

```bash
npx jpulse plugin list           # List enabled plugins
npx jpulse plugin list --all     # Include disabled plugins
npx jpulse plugin list --json    # Output as JSON
```

**Example output:**

```
jPulse Plugins

  Name              Version   Status    Source
  ────────────────────────────────────────────
  hello-world       1.3.7     enabled   @jpulse-net/plugin-hello-world
  auth-mfa          1.0.0     disabled  @jpulse-net/plugin-auth-mfa

Total: 2 plugin(s) (1 enabled, 1 disabled)
```

---

### `plugin info`

Show detailed information about a plugin.

```bash
npx jpulse plugin info <name>
npx jpulse plugin info auth-mfa
```

**Example output:**

```
Plugin: auth-mfa

  Name:           auth-mfa
  Version:        0.5.0
  Status:         disabled
  Auto-Enable:    no
  Source:         @jpulse-net/plugin-auth-mfa

  Summary:        Multi-factor authentication using TOTP authenticator apps
  Author:         jPulse Team <team@jpulse.net>
  jPulse Version: >=1.3.8

  Dependencies:
    npm:          (none)
    plugins:      (none)

  Configuration:
    Tabs:         Policy, Security, Advanced
    Fields:       8

  Location:       /path/to/plugins/auth-mfa
```

---

### `plugin install`

Install a plugin from various sources.

```bash
# By short name (assumes @jpulse-net/plugin-{name})
npx jpulse plugin install auth-mfa
npx jpulse plugin install auth-mfa@1.0.0

# By full npm package name
npx jpulse plugin install @jpulse-net/plugin-auth-mfa

# From GitHub Packages (requires authentication)
npx jpulse plugin install auth-mfa --registry=https://npm.pkg.github.com

# From local path (development)
npx jpulse plugin install ./my-local-plugin
npx jpulse plugin install /absolute/path/to/plugin

# With options
npx jpulse plugin install auth-mfa --enable     # Enable after install
npx jpulse plugin install auth-mfa --no-enable  # Keep disabled
npx jpulse plugin install auth-mfa --force      # Overwrite existing
```

**Name Resolution:**

| Input | Resolves To |
|-------|-------------|
| `auth-mfa` | `@jpulse-net/plugin-auth-mfa` |
| `auth-mfa@1.0.0` | `@jpulse-net/plugin-auth-mfa@1.0.0` |
| `@custom/my-plugin` | `@custom/my-plugin` (used as-is) |
| `./local-plugin` | Local path (copied to plugins/) |

**Example output:**

```
Installing plugin from npm: @jpulse-net/plugin-auth-mfa

  → Fetching @jpulse-net/plugin-auth-mfa...
  ✓ Downloaded via npm
  ✓ Validated plugin.json
  ✓ Checked version compatibility (>=1.3.8)
  ✓ Syncing to plugins/auth-mfa/
  ✓ Registered in database

Plugin 'auth-mfa' installed successfully!

  Version:     0.5.0
  Status:      disabled (autoEnable: no)
  Location:    plugins/auth-mfa/

  To enable:
    npx jpulse plugin enable auth-mfa
```

---

### `plugin update`

Update installed plugins to latest version.

```bash
npx jpulse plugin update              # Update all plugins
npx jpulse plugin update auth-mfa     # Update specific plugin

# With custom registry
npx jpulse plugin update --registry=https://npm.pkg.github.com
```

**Example output:**

```
Checking 2 plugin(s) for updates...

  auth-mfa (0.5.0):
    → Updating 0.5.0 → 1.0.0
    ✓ Updated to 1.0.0
  hello-world (1.3.7):
    ✓ Already up to date (1.3.7)

Update complete: 1 updated, 0 failed, 1 unchanged

  ⚠ Note: App restart may be required for updates to take effect.
```

---

### `plugin enable`

Enable a disabled plugin.

```bash
npx jpulse plugin enable <name>
npx jpulse plugin enable auth-mfa
```

**Example output:**

```
Plugin 'auth-mfa' enabled.

  ⚠ Note: App restart may be required for the plugin to load.
```

---

### `plugin disable`

Disable an enabled plugin.

```bash
npx jpulse plugin disable <name>
npx jpulse plugin disable auth-mfa
```

**Example output:**

```
Plugin 'auth-mfa' disabled.

  Note: Plugin files remain in plugins/ directory.
  Use `npx jpulse plugin remove` to fully remove.
```

---

### `plugin remove`

Remove an installed plugin.

```bash
npx jpulse plugin remove <name>
npx jpulse plugin remove auth-mfa --force  # Skip confirmation
```

**Example output:**

```
About to remove plugin: auth-mfa
  Version:  0.5.0
  Location: /path/to/plugins/auth-mfa

Use --force to skip this confirmation.
```

With `--force`:

```
Removing plugin: auth-mfa

  ✓ Removed plugins/auth-mfa/
  ✓ Removed from database

Plugin 'auth-mfa' removed successfully.
```

---

### `plugin publish`

Publish a plugin to npm registry (for plugin developers).

```bash
npx jpulse plugin publish <name>
npx jpulse plugin publish auth-mfa
npx jpulse plugin publish auth-mfa --registry=https://npm.pkg.github.com
npx jpulse plugin publish auth-mfa --tag beta
```

**Publish process:**

1. Validates plugin has `plugin.json` and `package.json`
2. Syncs version from `plugin.json` → `package.json`
3. Runs `npm publish` from plugin directory

**Example output:**

```
Publishing plugin: auth-mfa

  Version: 1.0.0
  Package: @jpulse-net/plugin-auth-mfa

  → Running: npm publish --registry=https://npm.pkg.github.com

  ✓ Published @jpulse-net/plugin-auth-mfa@1.0.0

  To create a git tag:
    cd plugins/auth-mfa
    git tag -a v1.0.0 -m "Release v1.0.0"
    git push origin v1.0.0
```

---

## Using Private/GitHub Package Registry

For plugins published to GitHub Packages, you need to authenticate:

### 1. Create a Personal Access Token

Go to GitHub → Settings → Developer settings → Personal access tokens → Generate new token with `read:packages` scope.

### 2. Configure npm

```bash
# Login to GitHub Packages
npm login --registry=https://npm.pkg.github.com
# Username: your-github-username
# Password: your-personal-access-token
# Email: your-email

# Or add to ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_TOKEN" >> ~/.npmrc
```

### 3. Install from GitHub Packages

```bash
npx jpulse plugin install auth-mfa --registry=https://npm.pkg.github.com
```

---

## Error Handling

The CLI provides helpful error messages with suggestions:

```
❌ Error: Plugin 'nonexistent' not found in plugins/ directory.

Suggestions:
  • Run 'npx jpulse plugin list --all' to see installed plugins
  • Run 'npx jpulse plugin install nonexistent' to install it

Error code: PLUGIN_NOT_FOUND
```

Common error codes:
- `PLUGIN_NOT_FOUND` - Plugin doesn't exist
- `VERSION_MISMATCH` - jPulse version incompatibility
- `ALREADY_EXISTS` - Plugin already installed
- `NETWORK_ERROR` - Cannot reach registry
- `PERMISSION_ERROR` - Authentication required

---

## Plugin Development Workflow

### Clone-within-Clone Setup

Develop plugins by cloning into the framework's `plugins/` directory:

```bash
# 1. Clone framework
cd ~/Dev
git clone git@github.com:jpulse-net/jpulse-framework.git
cd jpulse-framework

# 2. Clone plugin into plugins/
cd plugins
git clone git@github.com:jpulse-net/plugin-auth-mfa.git auth-mfa

# 3. Work on plugin
cd auth-mfa
# Make changes...
git commit -m "Add feature"
git push  # Pushes to plugin repo only

# 4. Publish
cd ~/Dev/jpulse-framework
npx jpulse plugin publish auth-mfa --registry=https://npm.pkg.github.com
```

The framework's `.gitignore` ignores `plugins/*` (except `hello-world`), so your plugin clone won't interfere with the framework repo.

---

## Admin UI Alternative

Plugins can also be managed via the Admin UI at `/admin/plugins`:

- View installed plugins
- Enable/disable plugins
- Configure plugin settings
- View plugin hooks and status

The CLI is recommended for:
- Scripted deployments
- CI/CD pipelines
- Air-gapped installations
- Plugin development and publishing
