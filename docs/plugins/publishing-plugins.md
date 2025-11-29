# jPulse Framework / Docs / Plugins / Publishing Plugins v1.2.6

Guide to packaging and publishing jPulse plugins for distribution.

## Pre-Publication Checklist

Before publishing your plugin, ensure:

✅ **plugin.json is complete** - All required fields filled
✅ **Documentation is written** - README.md and docs/README.md
✅ **Code is tested** - Enable/disable, configuration works
✅ **Naming conventions followed** - CSS classes, JavaScript namespaces
✅ **Dependencies declared** - All npm packages and plugin dependencies
✅ **Version number set** - Semantic versioning (e.g., 1.0.0)
✅ **Example configuration provided** - Sample values in docs
✅ **No hardcoded paths** - Use PathResolver for all file access

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

### 1. Create package.json

```json
{
    "name": "@your-org/plugin-your-plugin",
    "version": "1.0.0",
    "description": "jPulse Framework plugin for...",
    "main": "plugin.json",
    "keywords": ["jpulse", "plugin", "your-keywords"],
    "author": "Your Name <you@example.com>",
    "license": "MIT",
    "repository": {
        "type": "git",
        "url": "https://github.com/your-org/plugin-your-plugin"
    },
    "bugs": {
        "url": "https://github.com/your-org/plugin-your-plugin/issues"
    },
    "homepage": "https://github.com/your-org/plugin-your-plugin#readme",
    "peerDependencies": {
        "jpulse-framework": ">=1.2.6"
    },
    "dependencies": {
        // Your plugin's npm dependencies
    },
    "files": [
        "plugin.json",
        "README.md",
        "docs/",
        "webapp/"
    ]
}
```

### 2. Configure npm Registry

If using a private npm registry:

```bash
# Configure .npmrc
echo "@your-org:registry=https://your-registry.com/" > .npmrc
```

### 3. Publish to npm

```bash
# Login (if needed)
npm login

# Test package contents
npm pack
tar -xzf *.tgz
ls package/

# Publish
npm publish --access public
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

Specify minimum framework version:

```json
{
    "jpulseVersion": ">=1.2.6",  // Minimum version
    "jpulseVersion": "^1.2.0",   // Compatible with 1.x
    "jpulseVersion": "~1.2.6"    // Compatible with 1.2.x
}
```

## Testing Before Publishing

### Manual Testing

1. **Install in test environment**
   ```bash
   cp -r /path/to/plugin plugins/your-plugin
   ```

2. **Test plugin lifecycle**
   - Discovery: Shows in admin UI
   - Enable: Activates successfully
   - Configure: All fields work
   - Disable: Deactivates cleanly

3. **Test functionality**
   - API endpoints respond correctly
   - Views render properly
   - CSS/JavaScript loads
   - Documentation accessible

4. **Test edge cases**
   - Invalid configuration values
   - Missing dependencies
   - Framework version mismatch

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

### 1. GitHub Releases

Create releases with changelog:

```bash
# Tag the version
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

On GitHub:
- Create release from tag
- Add changelog
- Attach binaries (if needed)

### 2. npm Registry

Publish to public or private npm registry:

```bash
npm publish
```

### 3. Plugin Marketplace (Future)

A centralized jPulse plugin marketplace is planned for future releases.

## Installation Instructions for Users

Provide clear installation instructions:

### From npm

```bash
# Install plugin
npm install @your-org/plugin-your-plugin

# Create symlink
cd plugins
ln -s ../node_modules/@your-org/plugin-your-plugin your-plugin

# Restart server
```

### From GitHub

```bash
# Clone repository
cd plugins
git clone https://github.com/your-org/plugin-your-plugin.git your-plugin

# Install dependencies
cd your-plugin
npm install

# Restart server
```

### Manual Installation

```bash
# Download and extract
cd plugins
wget https://github.com/your-org/plugin-your-plugin/archive/v1.0.0.tar.gz
tar -xzf v1.0.0.tar.gz
mv plugin-your-plugin-1.0.0 your-plugin

# Restart server
```

## Updating Published Plugins

1. **Make changes** to code
2. **Update version** in plugin.json and package.json
3. **Update CHANGELOG.md** with changes
4. **Test thoroughly** in development
5. **Commit and tag**
   ```bash
   git commit -am "Release v1.1.0"
   git tag v1.1.0
   git push origin main --tags
   ```
6. **Publish to npm**
   ```bash
   npm publish
   ```
7. **Create GitHub release** with changelog

## Best Practices

✅ **Use semantic versioning** consistently
✅ **Maintain a CHANGELOG.md** for all releases
✅ **Test before publishing** every release
✅ **Document breaking changes** clearly
✅ **Provide migration guides** for major versions
✅ **Keep dependencies minimal** and up-to-date
✅ **Follow naming conventions** strictly
✅ **Include examples** in documentation
✅ **Respond to issues** and pull requests
✅ **Keep README up-to-date** with latest features

## See Also

- [Creating Plugins](creating-plugins.md) - Development guide
- [Plugin API Reference](plugin-api-reference.md) - Complete API
- [Managing Plugins](managing-plugins.md) - Installation and management
- [Hello World Plugin](../installed-plugins/hello-world/README.md) - Reference implementation
