# jPulse Docs / Plugins / Publishing Plugins v2.0.5

Guide to packaging and publishing jPulse plugins for distribution.

## Quick Start

```bash
# From framework root, publish plugin to GitHub Packages
npx jpulse plugin publish auth-mfa --registry=https://npm.pkg.github.com
```

## Pre-Publication Checklist

Before publishing your plugin, ensure:

- **plugin.json is complete** - All required fields filled (name, version, summary, author, jpulseVersion)
- **package.json exists** - npm package manifest with correct name (`@jpulse-net/plugin-{name}`)
- **Documentation is written** - README.md and docs/README.md
- **Code is tested** - Enable/disable, configuration works
- **Naming conventions followed** - CSS classes, JavaScript namespaces
- **Dependencies declared** - All npm packages and plugin dependencies
- **Version number set** - Semantic versioning (e.g., 1.0.0)
- **Example configuration provided** - Sample values in docs
- **No hardcoded paths** - Use PathResolver for all file access

## GitHub Repository Setup

### Recommended Structure

```
plugins/your-plugin/
├── .gitignore
├── LICENSE
├── README.md                      # Developer docs
├── package.json                   # npm metadata
├── plugin.json                    # jPulse plugin metadata
├── docs/
│   └── README.md                  # User/admin docs
└── webapp/
    ├── controller/
    ├── model/
    ├── view/
    └── static/
```

### .gitignore

```
node_modules/
.DS_Store
*.log
.jpulse/
```

### LICENSE

Choose an appropriate open-source license (MIT, Apache 2.0, etc.).

### README.md (Developer-Focused)

```markdown
# Plugin Name

Short description of what the plugin does.

## Installation

Instructions for installing the plugin.

## Configuration

Configuration options and how to set them.

## Development

How to contribute to the plugin.

## API Reference

Public API provided by the plugin.

## License

License information.
```

## npm Package Publishing

### Using the jPulse CLI (Recommended)

The easiest way to publish is using the jPulse CLI:

```bash
# Publish to GitHub Packages (default for @jpulse-net plugins)
npx jpulse plugin publish my-plugin --registry=https://npm.pkg.github.com

# Publish to npmjs.org
npx jpulse plugin publish my-plugin

# Publish with a tag (e.g., beta)
npx jpulse plugin publish my-plugin --tag beta
```

The CLI automatically:
1. Validates `plugin.json` and `package.json`
2. Syncs version from `plugin.json` → `package.json`
3. Runs `npm publish` from the plugin directory

A single plugin is unchanged: publish from `plugins/<name>/` which has its own `package.json`.

### Publishing a bundle

If the primary's `plugin.json` has `bundle.members`, `npx jpulse plugin publish <primary>` assembles a package with a root `package.json` and `plugins/<member>/` for the primary and each companion — and **no** root `plugin.json`. Member `plugin.json` versions are synced to the primary's version. Companions do not need their own `package.json`.

```bash
npx jpulse plugin publish demo-primary --dry-run
npx jpulse plugin publish demo-primary --pack-to ./dist/bundle
npx jpulse plugin install ./dist/bundle          # local round trip before the registry
npx jpulse plugin publish demo-primary --registry=https://npm.pkg.github.com
```

Publishing a companion is refused; publish the primary instead.

### Publishing a bundle with plain `npm publish`

A bundle primary can also be published with `npm publish` from its own directory, the same way a
single plugin is. Add two npm lifecycle scripts and a `files` field to the primary's
`package.json`:

```json
{
    "name": "@jpulse-net/plugin-demo-primary",
    "version": "1.4.0",
    "files": ["plugins"],
    "scripts": {
        "prepack": "jpulse plugin stage-bundle",
        "postpack": "jpulse plugin unstage-bundle"
    }
}
```

`prepack` copies the primary and every companion into a temporary `plugins/` directory inside the plugin, and `postpack` removes it. npm builds its file list after `prepack` runs, so the staged members are packed; `"files": ["plugins"]` keeps the primary's root `plugin.json` out of the tarball, which matters because a package containing both shapes is refused at install time.

Verify the result before publishing for real — `npm pack` runs the same scripts:

```bash
cd plugins/demo-primary
npm pack
tar -tzf jpulse-net-plugin-demo-primary-1.4.0.tgz
```

You should see `package/package.json` plus `package/plugins/demo-primary/` and
`package/plugins/demo-secondary/`, and no `package/plugin.json`.

In a site, `jpulse` resolves from `node_modules/.bin` because npm puts every ancestor `node_modules/.bin` on `PATH`. Inside the framework repo there is no such link, so use the relative form there:

```json
"prepack": "node ../../bin/jpulse-framework.js plugin stage-bundle",
"postpack": "node ../../bin/jpulse-framework.js plugin unstage-bundle"
```

Without this wiring, `npm publish` from a bundle primary silently ships the primary alone, with a root `plugin.json` and no companions. `npx jpulse plugin publish` warns when it sees a bundle primary that is not wired, and it does not depend on the scripts itself — it assembles the package and publishes with `--ignore-scripts`.

Companions have no `package.json` of their own in the published package. During development a companion may carry a small `private` `package.json` whose only job is a `prepublishOnly` script that refuses and names the primary; staging strips it from the packaged copy.

### 1. Create package.json

```json
{
    "name": "@jpulse-net/plugin-your-plugin",
    "version": "1.0.0",
    "description": "jPulse Framework plugin for...",
    "main": "webapp/controller/yourPlugin.js",
    "keywords": ["jpulse", "jpulse-plugin", "your-keywords"],
    "author": "Your Name <you@example.com>",
    "license": "BSL-1.1",
    "repository": {
        "type": "git",
        "url": "https://github.com/jpulse-net/plugin-your-plugin.git"
    },
    "publishConfig": {
        "registry": "https://npm.pkg.github.com"
    },
    "peerDependencies": {
        "@jpulse-net/jpulse-framework": ">=1.3.8"
    },
    "dependencies": {
    },
    "files": [
        "plugin.json",
        "README.md",
        "docs/",
        "webapp/"
    ]
}
```

### 2. Configure GitHub Packages Authentication

For GitHub Packages, you need to authenticate:

```bash
# Create Personal Access Token at:
# GitHub → Settings → Developer settings → Personal access tokens
# Scopes needed: read:packages, write:packages

# Login to GitHub Packages
npm login --registry=https://npm.pkg.github.com
# Username: your-github-username
# Password: your-personal-access-token
# Email: your-email

# Or add to ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_TOKEN" >> ~/.npmrc
```

### 3. Publish

**Using jPulse CLI:**
```bash
npx jpulse plugin publish my-plugin --registry=https://npm.pkg.github.com
```

**Or manually:**
```bash
cd plugins/my-plugin

# Test package contents first
npm pack
tar -tzf *.tgz

# Publish
npm publish --registry=https://npm.pkg.github.com
```

## Semantic Versioning

Follow [Semantic Versioning 2.0.0](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features, backwards-compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backwards-compatible

### Version Bumping

```bash
# Patch release (bug fixes)
npm version patch

# Minor release (new features)
npm version minor

# Major release (breaking changes)
npm version major
```

### jpulseVersion Requirement

Specify minimum framework version in plugin.json:

```json
{
    "jpulseVersion": ">=1.3.8"   // Minimum version (recommended)
}
```

The CLI validates version compatibility during install and shows helpful errors:

```
❌ Error: Plugin requires jPulse >=1.3.8, current version is 1.3.7

Suggestions:
  • Update jPulse framework to >=1.3.8 or later
  • Or install an older version of this plugin compatible with 1.3.7
```

## Testing Before Publishing

### Manual Testing

1. **Install in test environment**
   ```bash
   # Install from local development path
   npx jpulse plugin install ./plugins/your-plugin

   # Or if developing in plugins/ directory, just list to verify
   npx jpulse plugin list --all
   npx jpulse plugin info your-plugin
   ```

2. **Test plugin lifecycle**
   ```bash
   # Enable
   npx jpulse plugin enable your-plugin

   # Check status
   npx jpulse plugin info your-plugin

   # Disable
   npx jpulse plugin disable your-plugin
   ```

3. **Test functionality**
   - API endpoints respond correctly
   - Views render properly
   - CSS/JavaScript loads
   - Configuration works in Admin UI at `/admin/plugins/your-plugin`
   - Documentation accessible

4. **Test edge cases**
   - Invalid configuration values
   - Missing dependencies
   - Framework version mismatch (change jpulseVersion temporarily)

### Automated Testing

Create test scripts:

```bash
#!/bin/bash
# test-plugin.sh

echo "Testing plugin discovery..."
# Check if plugin appears in admin UI

echo "Testing configuration..."
# Test configuration API endpoints

echo "Testing API endpoints..."
# Call plugin endpoints and verify responses

echo "Tests complete!"
```

## Documentation Requirements

### Required Files

1. **README.md** (root) - Developer documentation
2. **docs/README.md** - User/admin documentation
3. **plugin.json** - Complete metadata with all fields

### Documentation Content

**README.md should include:**
- Overview and features
- Installation instructions
- Configuration guide
- API reference
- Development setup
- Contributing guidelines
- License

**docs/README.md should include:**
- User-facing overview
- Configuration options explained
- Usage examples
- Troubleshooting guide
- FAQ

## Distribution Channels

### 1. GitHub Packages (Recommended for @jpulse-net)

Official jPulse plugins use GitHub Packages:

```bash
# Publish using CLI
npx jpulse plugin publish your-plugin --registry=https://npm.pkg.github.com

# Users install with
npx jpulse plugin install your-plugin --registry=https://npm.pkg.github.com
```

### 2. npm Registry (Public)

For publicly available plugins:

```bash
# Publish to npmjs.org
npx jpulse plugin publish your-plugin

# Users install with
npx jpulse plugin install @your-org/plugin-your-plugin
```

### 3. GitHub Releases

Create releases with changelog for versioning:

```bash
# Tag the version
cd plugins/your-plugin
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

On GitHub:
- Create release from tag
- Add changelog
- Attach binaries (if needed)

### 4. Private Registry (Enterprise)

For air-gapped or enterprise environments:

```bash
# Publish to private Verdaccio/Nexus
npm publish --registry=http://npm.internal.corp:4873

# Users install with
npx jpulse plugin install your-plugin --registry=http://npm.internal.corp:4873
```

## Installation Instructions for Users

Provide clear installation instructions in your README:

### Using jPulse CLI (Recommended)

```bash
# Install from GitHub Packages
npx jpulse plugin install your-plugin --registry=https://npm.pkg.github.com

# Install specific version
npx jpulse plugin install your-plugin@1.0.0 --registry=https://npm.pkg.github.com

# Enable after install
npx jpulse plugin enable your-plugin

# Restart app for changes to take effect
```

### From Local Path (Development)

```bash
# Install from local directory
npx jpulse plugin install ./path/to/your-plugin

# Or clone directly into plugins/
cd plugins
git clone https://github.com/jpulse-net/plugin-your-plugin.git your-plugin
```

### Air-Gapped / Private Registry

```bash
# Using private npm registry
npx jpulse plugin install your-plugin --registry=http://npm.internal.corp:4873

# Using local tarball
npx jpulse plugin install ./plugin-your-plugin-1.0.0.tgz
```

## Updating Published Plugins

1. **Make changes** to code
2. **Update version** in plugin.json (package.json will be auto-synced)
3. **Update CHANGELOG.md** with changes
4. **Test thoroughly** in development
5. **Commit and tag**
   ```bash
   cd plugins/your-plugin
   git commit -am "Release v1.1.0"
   git push origin main
   ```
6. **Publish using jPulse CLI**
   ```bash
   cd /path/to/jpulse-framework
   npx jpulse plugin publish your-plugin --registry=https://npm.pkg.github.com
   ```
7. **Create git tag** (CLI suggests commands after publish)
   ```bash
   cd plugins/your-plugin
   git tag -a v1.1.0 -m "Release v1.1.0"
   git push origin v1.1.0
   ```
8. **Create GitHub release** with changelog

## Best Practices

- **Use semantic versioning** consistently
- **Maintain a CHANGELOG.md** for all releases
- **Test before publishing** every release
- **Document breaking changes** clearly
- **Provide migration guides** for major versions
- **Keep dependencies minimal** and up-to-date
- **Follow naming conventions** strictly
- **Include examples** in documentation
- **Respond to issues** and pull requests
- **Keep README up-to-date** with latest features

## See Also

- [Creating Plugins](creating-plugins.md) - Development guide
- [Plugin API Reference](plugin-api-reference.md) - Complete API
- [Managing Plugins](managing-plugins.md) - Installation and management
- [Hello World Plugin](../installed-plugins/hello-world/README.md) - Reference implementation
