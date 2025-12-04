# jPulse Docs / Plugins / Managing Plugins v1.3.7

Guide for site administrators to install, configure, and manage jPulse plugins.

## Admin Dashboard

Access plugin management at: [/admin/plugins.shtml](/admin/plugins.shtml) (for administrators only)

### Features:
- **View all plugins** - List installed plugins with status
- **Enable/Disable** - Toggle plugins on/off
- **Configure** - Manage plugin settings
- **View details** - See metadata, version, dependencies

## Installing Plugins

### Method 1: Manual Installation (Development)

1. **Copy plugin directory** to `plugins/`
   ```bash
   cp -r /path/to/plugin plugins/your-plugin
   ```

2. **Restart the server** - Plugin is auto-discovered

3. **Check admin dashboard** - Plugin should appear in list

4. **Enable if needed** - Click "Enable" button (if `autoEnable: false`)

### Method 2: npm Installation (Future)

**Note**: Automated npm installation is not yet implemented. For now, use Method 1 (Manual Installation).

**Planned workflow:**
```bash
# Future: Install plugin from npm registry
npm install @jpulse-net/plugin-your-plugin

# Plugin automatically copied to plugins/ directory
# Restart server to activate
npm restart
```

**Planned behavior:**
- Plugin package copied from `node_modules/` to `plugins/` directory
- Plugin auto-discovered on server restart
- Auto-enabled if plugin author set `autoEnable: true`
- Plugin npm dependencies automatically installed

## Configuring Plugins

### Using the Admin UI

1. **Navigate to**: `/admin/plugins.shtml`
2. **Click "Configure"** on the plugin you want to configure
3. **Fill in settings** - Form is generated from plugin's configuration schema
4. **Save changes** - Configuration is stored in MongoDB
5. **Restart if needed** - Some plugins may require restart

**Direct link**: `/admin/plugin-config.shtml?plugin=your-plugin`

### Using the API

```javascript
// Get current configuration
const config = await jPulse.api.get('/api/1/plugin/your-plugin/config');

// Update configuration
await jPulse.api.put('/api/1/plugin/your-plugin/config', {
    setting1: 'value1',
    setting2: true
});
```

## Enabling/Disabling Plugins

### Via Admin UI

1. Visit `/admin/plugins.shtml`
2. Click "Enable" or "Disable" button
3. Plugin status saved to `.jpulse/plugins.json`
4. Restart server to apply changes

### Via API

```javascript
// Enable plugin
await jPulse.api.post('/api/1/plugin/your-plugin/enable');

// Disable plugin
await jPulse.api.post('/api/1/plugin/your-plugin/disable');
```

### What Happens:

**On Enable (via API/UI):**
- Plugin marked as enabled in registry (`.jpulse/plugins.json`)
- Returns `restartRequired: true`

**On Server Restart:**
- Enabled plugins are loaded
- Symlinks automatically created for static assets and documentation
- Plugin configuration loaded from database
- Plugin becomes active

**On Disable (via API/UI):**
- Plugin marked as disabled in registry
- Returns `restartRequired: true`

**On Server Restart:**
- Disabled plugins are skipped
- Symlinks automatically removed
- Plugin code not loaded
- Configuration preserved in database

## Updating Plugins

1. **Backup configuration** (optional - stored in database)
2. **Replace plugin directory** with new version
3. **Restart server** - New version loaded
4. **Check admin dashboard** - Verify version updated
5. **Test functionality** - Ensure plugin works correctly

**Version conflicts**: If `jpulseVersion` requirement isn't met, plugin shows in error state.

## Removing Plugins

1. **Disable plugin** via admin UI or API
2. **Verify no dependencies** - Check if other plugins depend on it
3. **Delete directory**:
   ```bash
   rm -rf plugins/your-plugin
   ```
4. **Restart server** - Plugin disappears from list

**Note**: Configuration data remains in MongoDB. To remove:
```javascript
// Use MongoDB directly or create cleanup endpoint
db.pluginConfigs.deleteOne({ pluginName: 'your-plugin' });
```

## Plugin Dependencies

Plugins can depend on:
- **Framework version**: `jpulseVersion: ">=1.3.0"`
- **npm packages**: Auto-installed when plugin is enabled
- **Other plugins**: Must be enabled first

**Dependency conflicts** are shown in the admin UI with error messages.

## Troubleshooting

### Plugin Not Appearing

- Check `plugins/` directory contains plugin
- Verify `plugin.json` is valid JSON
- Check server logs for validation errors
- Restart server to trigger discovery

### Plugin Shows "Error" Status

- Check `jpulseVersion` requirement matches framework
- Verify all required dependencies are installed
- Check server logs for specific error messages
- Review plugin configuration for validation errors

### Configuration Won't Save

- Verify configuration values match schema requirements
- Check for validation errors in UI
- Ensure required fields are filled
- Check server logs for detailed error messages

### Plugin Pages Not Loading

- Verify plugin is enabled
- Check symlinks exist (location depends on environment):
  ```bash
  # Static assets (same for framework and site)
  ls -la webapp/static/plugins/your-plugin

  # Documentation (context-dependent)
  # Framework repo:
  ls -la docs/installed-plugins/your-plugin
  # Site installation:
  ls -la webapp/static/assets/jpulse-docs/installed-plugins/your-plugin
  ```
- Restart server after enabling plugin
- Check browser console for JavaScript errors

### API Endpoints Not Working

- Verify controller file exists in `webapp/controller/`
- Check method name starts with `api` (e.g., `apiGet`)
- Restart server to register new endpoints
- Check server logs for registration messages

## Best Practices

- **Always test in development** before production deployment
- **Document configuration** clearly in plugin docs
- **Use semantic versioning** for plugin updates
- **Declare all dependencies** in plugin.json
- **Provide default values** for configuration fields
- **Test enable/disable** to ensure clean activation/deactivation
- **Keep plugin.json valid** - Invalid JSON breaks discovery

## See Also

- [Creating Plugins](creating-plugins.md) - Developer guide
- [Plugin API Reference](plugin-api-reference.md) - Complete API documentation
- [Hello World Plugin](../installed-plugins/hello-world/README.md) - Working example
