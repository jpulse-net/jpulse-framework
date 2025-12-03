# W-045: Plugin Infrastructure - Technical Debt

This document tracks technical debt and future enhancements for the jPulse Framework plugin system (W-045).

For the main architectural specification, see: [`W-014-W-045-mvc-site-plugins-architecture.md`](./W-014-W-045-mvc-site-plugins-architecture.md)

---

## W-045-TD-1: Handlebar Helper Discovery

- **Description**: Auto-discover handlebars helpers from plugins
- **Implementation**: Scan `plugins/*/webapp/utils/handlebars-helpers.js`
- **Naming**: Helpers namespaced as `{{plg-{pluginname}-{helperName}}}`
- **Priority**: Medium - extends template functionality

---

## W-045-TD-2: i18n Plugin Translation Support

- **Description**: Load plugin translations automatically
- **Implementation**: Scan `plugins/*/webapp/i18n/{lang}.json`
- **Merging**: Plugin translations merged with framework translations
- **Naming**: Keys namespaced as `plugin.{pluginname}.{key}`
- **Priority**: Medium - essential for international plugins

---

## W-045-TD-3: Email Template Plugin Support

- **Description**: Allow plugins to provide email templates
- **Implementation**: Extend EmailController to check `plugins/*/webapp/view/email/`
- **Priority**: Low - optional plugin feature

---

## W-045-TD-4: Context Extension Plugin Support

- **Description**: Allow plugins to register template context providers
- **Implementation**: Plugins call `ContextExtensions.registerProvider()`
- **Priority**: Low - advanced template customization

---

## W-045-TD-5: SQL Database Migration Support

- **Description**: Schema migration framework for SQL databases
- **Implementation**: Plugin migration scripts in `plugins/*/migrations/`
- **Tracking**: Per-plugin migration status in database
- **Priority**: High - essential if framework adds SQL support
- **Note**: Currently MongoDB (schemaless), migrations not needed

---

## W-045-TD-6: Plugin Testing Auto-Include

- **Description**: Automatically run plugin tests with framework tests
- **Implementation**: Discover tests from `plugins/*/tests/`, include in `npm test`
- **Coverage**: Include plugin code in coverage reports
- **Priority**: Medium - improves plugin quality

---

## W-045-TD-7: Plugin Sandboxing & Security

- **Description**: Restrict plugin capabilities for security
- **Features**:
  - Filesystem access restrictions
  - Database access permissions (per-collection)
  - Network request restrictions
  - Plugin isolation (prevent cross-plugin interference)
  - Security audit framework
- **Priority**: High - essential before plugin marketplace
- **Note**: Lower priority while plugins come from jPulse team only

---

## W-045-TD-8: Advanced Development Mode

- **Description**: Enhanced debugging for plugin development
- **Features**:
  - Debug flag for "DEBUG" log type
  - Plugin hot reload (no restart needed)
  - Detailed plugin load sequence logging
  - Plugin dependency graph visualization
  - Performance profiling per plugin
- **Priority**: Low - developer convenience feature

---

## W-045-TD-9: Plugin Marketplace

- **Description**: Plugin discovery and distribution platform
- **Features**:
  - Plugin repository/marketplace
  - Plugin ratings and reviews
  - Automated plugin updates
  - Security scanning and vetting process
  - Plugin signing/verification
  - Version management
- **Priority**: Low - future business opportunity
- **Note**: Requires W-045-TD-7 (sandboxing) first

---

## W-045-TD-10: Hook System Enhancement -- ✅ DONE

Status: ✅ DONE
Work item: W-105, v1.3.6, 2025-12-03: plugins: add plugin hooks for authentication and user management

- **Description**: Formal hook registration and execution system
- **Implementation**: Explicit hook points in framework code
- **Auto-discovery**: Hooks discovered by method naming conventions
- **Priority**: Medium - enables advanced plugin integration
- **Examples**: `beforeAuth()`, `afterSave()`, `beforeRender()`

---

## W-045-TD-11: Plugin Communication API

- **Description**: Inter-plugin communication mechanisms
- **Features**:
  - Service registration and discovery
  - Event system for plugin-to-plugin messaging
  - Shared data stores
  - Plugin dependency injection
- **Priority**: Low - advanced plugin architecture

---

## W-045-TD-12: Form Submission Data Transformation

- **Description**: Enhance `jPulse.form.bindSubmission()` to support payload transformation
- **Issue**: The `beforeSubmit` callback return value is ignored; it only checks for cancellation (`false`)
- **Current Behavior**: Always sends `jPulse.form.serialize(formElement)` data, regardless of `beforeSubmit` return value
- **Impact**: Cannot transform data types (e.g., HTML checkbox string "on" → boolean true) before submission
- **Workaround**: Use manual form.addEventListener('submit') with direct `jPulse.api.call()` instead
- **Proposed Solution**: Add new `transformData` option that transforms serialized data before API call:
  ```javascript
  jPulse.form.bindSubmission(form, '/api/endpoint', {
      transformData: (formData) => {
          return {
              config: {
                  ...formData,
                  enabled: Boolean(formData.enabled) // Transform types
              }
          };
      }
  });
  ```
- **Priority**: Medium - improves DX for plugin config forms with strict type validation
- **Files Affected**: `webapp/view/jpulse-common.js` (jPulse.form.handleSubmission)
- **Discovered During**: W-045 plugin configuration form implementation

---

## W-045-TD-13: Auto-Generate Installed Plugins Index -- ✅ DONE

Status: ✅ DONE
Work item: W-104, v1.3.5, 2025-12-03: markdown: handle dynamic content tokens

- **Description**: Automatically regenerate `docs/installed-plugins/README.md` when plugins are installed/uninstalled
- **Complexity**: Medium - deployment location varies
- **Challenges**:
  - Framework dev install: `docs/installed-plugins/README.md`
  - Site install: `webapp/static/assets/jpulse-docs/installed-plugins/README.md`
  - Triggers: Plugin enable/disable, install/uninstall, app startup
  - Customization: If auto-generated, site admins lose ability to customize intro text
- **Current Solution**: Manual README.md with generic intro text
- **Proposed Enhancement**:
  - Generate plugin list dynamically from active plugins
  - Keep intro text customizable (preserve manually edited content)
  - Add "last generated" timestamp
  - Include plugin descriptions from `plugin.json`
- **Alternative**: Remove README.md entirely and let sidebar show raw plugin list
- **Note**: `docs/plugins/` contains plugin development guides (separate from installed plugin docs)
- **Priority**: Low - current manual approach is simple and works
- **Discovered During**: W-045 plugin documentation integration

---

## W-045-TD-14: Automated npm Plugin Installation

- **Description**: Implement automated plugin installation from npm packages
- **Current Limitation**: Plugins must be manually copied to `plugins/` directory
- **Proposed Implementation**:
  1. **Installation Command**: `npm install @org/plugin-name` or custom `jpulse plugin install`
  2. **Copy Process**: Copy package from `node_modules/` to `plugins/{plugin-name}/`
  3. **Auto-Discovery**: Plugin automatically discovered on next restart
  4. **Auto-Enable**: Enabled automatically if `plugin.json` has `autoEnable: true`
  5. **Dependencies**: Plugin's npm dependencies auto-installed
- **Implementation Details**:
  - **Static Assets**: Symlink `webapp/static/plugins/{name}` → `plugins/{name}/webapp/static/`
  - **Documentation**: Framework dev: symlink `docs/installed-plugins/{name}` → `plugins/{name}/docs/`
  - **Documentation**: Site install: copy or symlink to `webapp/static/assets/jpulse-docs/installed-plugins/{name}/`
  - **Registry**: Update `.jpulse/plugins.json` registry
  - **npm Dependencies**: Run `npm install` in plugin directory if `package.json` exists
- **CLI Integration** (optional):
  ```bash
  jpulse plugin install @org/plugin-name
  jpulse plugin uninstall plugin-name
  jpulse plugin list
  jpulse plugin enable plugin-name
  jpulse plugin disable plugin-name
  ```
- **Benefits**:
  - Simplified installation process for site admins
  - Consistent plugin deployment
  - Easier to distribute and update plugins
  - Preparation for future plugin marketplace
- **Priority**: Medium - improves UX but manual installation works
- **Blockers**: None - can be implemented incrementally
- **Discovered During**: W-045 Phase 1 documentation review

---

## W-045-TD-15: Dependency Graph Visualization

- **Description**: Client-side visualization of plugin dependency graph
- **Current Implementation**: API endpoints exist (`GET /api/1/plugin/dependencies`, `GET /api/1/plugin/:name/dependencies`)
- **Missing**: UI visualization component
- **Proposed Implementation**:
  - Client-side D3.js or similar graph rendering library
  - Display on `/admin/plugins.shtml` or separate detail view
  - Visual features:
    - Nodes for each plugin (color-coded by status: enabled/disabled/error)
    - Edges showing dependencies (directional arrows)
    - Highlight circular dependencies (if any)
    - Interactive: click plugin to see details
    - Zoom and pan controls
  - Integration options:
    - Tab on plugins page
    - Collapsible section
    - Modal overlay
    - Separate route `/admin/plugin-dependencies.shtml`
- **Benefits**:
  - Visual understanding of plugin relationships
  - Easy identification of dependency chains
  - Helps troubleshoot plugin loading issues
  - Educational for plugin developers
- **Priority**: Medium - useful for complex plugin ecosystems, not critical for simple setups
- **Complexity**: Medium (2-3 hours for basic implementation with existing library)
- **Discovered During**: W-045c completion assessment

---

## W-045-TD-16: Performance Review and Optimization

- **Description**: Analyze and optimize plugin system performance
- **Current Status**: No specific performance testing or optimization done
- **Proposed Review Areas**:
  1. **Plugin Discovery**: Measure startup time with 0, 1, 5, 10+ plugins
  2. **PathResolver Caching**: Verify cache hit rates for plugin paths
  3. **Database Queries**: Review plugin config queries (use indexes, avoid N+1)
  4. **Static Asset Serving**: Verify symlinks work efficiently with Nginx
  5. **Controller Discovery**: Profile SiteControllerRegistry with plugin controllers
  6. **Memory Usage**: Track memory footprint of loaded plugins
  7. **View Registry**: Measure impact of plugin views on registry build time
- **Optimization Opportunities**:
  - Lazy-load plugin metadata (don't parse all plugin.json files on every request)
  - Cache plugin config schema (already done in PluginManager)
  - Optimize file system checks (batch operations where possible)
  - Consider async/parallel plugin initialization where safe
- **Deliverables**:
  - Performance benchmark script for testing
  - Document baseline performance metrics
  - Identify and implement top 3 optimizations (if needed)
  - Add performance notes to plugin developer guide
- **Priority**: Low-Medium - important for production, but likely not a bottleneck with <10 plugins
- **Complexity**: Medium (1-2 hours for review, variable for optimizations)
- **Discovered During**: W-045c completion assessment

---

## W-045-TD-17: Plugin Hot-Reload (Runtime Enable/Disable)

- **Description**: Enable/disable plugins at runtime without server restart
- **Current Limitation**: Enabling or disabling a plugin only updates the registry flag; actual loading happens at server startup
- **Current Behavior**:
  - `PluginManager.enablePlugin()` / `disablePlugin()` update `.jpulse/plugins.json`
  - Changes take effect only after server restart
  - Message: "Plugin enabled. Restart required to take effect."
- **What Needs Dynamic Loading/Unloading**:
  1. **Controllers**: Register/unregister with `SiteControllerRegistry`
  2. **Routes**: Add/remove API routes from Express router
  3. **Views**: Update `ViewController` registry
  4. **Models**: Load/unload model classes
  5. **Static Assets**: Create/remove symlinks dynamically
  6. **Hooks**: Register/unregister plugin hooks
  7. **Module Cache**: Clear Node.js require cache for plugin modules
  8. **Dependencies**: Ensure plugin dependencies are met before enabling
- **Implementation Complexity**:
  - **Controller Hot-Reload**: Medium - requires `SiteControllerRegistry.unregisterController()`
  - **View Hot-Reload**: Low-Medium - update `ViewController.registry`
  - **Route Hot-Reload**: High - Express doesn't support dynamic route removal easily
  - **Module Cache**: Low - simple `delete require.cache[path]`
  - **Symlinks**: Low - already have `SymlinkManager` utilities
  - **Testing**: High - need to ensure no memory leaks or stale references
- **Challenges**:
  - Express router doesn't support removing routes (may need router middleware wrapper)
  - Ensuring all plugin references are garbage collected when disabled
  - Handling active requests to plugin endpoints when disabling
  - Database connections or timers created by plugins
  - Plugin dependencies - disable dependent plugins first, or block?
- **Benefits**:
  - Better UX - no server restart needed
  - Faster development iteration for plugin developers
  - Easier A/B testing of plugin features
  - Reduced downtime for plugin configuration changes
- **Priority**: Medium - nice to have, but restart is acceptable for now
- **Complexity**: High (6-10 hours for full implementation + testing)
- **Workaround**: Current restart requirement is acceptable for production use
- **Discovered During**: Phase 2 testing - user noticed "restart required" message
- **Note**: Consider implementing as part of TD-8 (Advanced Development Mode) for dev-only hot-reload first

---

## W-045-TD-18: HTML Sanitization for Plugin Descriptions -- ✅ DONE

Status: ✅ DONE
Work item: W-045, v1.3.0, 2025-11-30: architecture: add plugin infrastructure with auto-discovery

- **Description**: Sanitize HTML content in plugin descriptions to prevent XSS attacks
- **Current Limitation**: Plugin descriptions from `plugin.json` are displayed directly in admin UI without sanitization
- **Security Risk**: Medium - malicious plugin could inject JavaScript via description field
- **Affected Areas**:
  - Plugin list page (`/admin/plugins.shtml`) - displays `plugin.description` or `plugin.summary`
  - Plugin config page (`/admin/plugin-config.shtml`) - displays rich HTML in description card
  - Plugin detail page (`/jpulse-plugins/hello-world.shtml`) - displays full description
  - Public plugin info endpoint (`/api/1/plugin/:name/info`) - returns description
- **Proposed Solution**:
  - Use a HTML sanitization library (e.g., DOMPurify, sanitize-html)
  - Sanitize in PluginManager during plugin discovery/loading
  - Allow safe HTML tags: `<p>`, `<br>`, `<strong>`, `<em>`, `<ul>`, `<ol>`, `<li>`, `<a href>`, `<code>`
  - Strip dangerous tags: `<script>`, `<iframe>`, `<object>`, `<embed>`, event handlers
  - Apply to both `description` and `summary` fields
- **Alternative**: Convert to plain text only (simpler but less flexible)
- **Implementation**:
  ```javascript
  // In PluginManager._loadPlugin()
  if (metadata.description) {
      metadata.description = sanitizeHtml(metadata.description, {
          allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'code', 'pre'],
          allowedAttributes: { 'a': ['href', 'title'] }
      });
  }
  ```
- **Priority**: Medium - important for security if accepting third-party plugins
- **Complexity**: Low (~30 minutes - add dependency, apply sanitization)
- **Dependency**: `sanitize-html` npm package (~50KB) or custom regex-based solution
- **Discovered During**: W-045 security review
- **Note**: Less critical if plugins are only from trusted sources (internal team)

---

## W-045-TD-19: Database Operation Result Checks in PluginModel

- **Description**: Add result validation for MongoDB operations in PluginModel
- **Current Limitation**: Database operations don't check for failed updates or unexpected results
- **Affected Methods**:
  - `PluginModel.save()` - no check if `insertedId` or `modifiedCount` is valid
  - `PluginModel.delete()` - no check if `deletedCount` is 0 (already deleted)
  - No detection of partial failures or silent errors
- **Current Code**:
  ```javascript
  static async save(name, config) {
      // ... validation ...
      const result = await collection.updateOne(
          { name },
          { $set: { name, config, updatedAt: new Date() } },
          { upsert: true }
      );
      return { name, config };  // ❌ No result validation
  }
  ```
- **Proposed Enhancement**:
  ```javascript
  static async save(name, config) {
      // ... validation ...
      const result = await collection.updateOne(
          { name },
          { $set: { name, config, updatedAt: new Date() } },
          { upsert: true }
      );

      // ✅ Validate result
      if (!result.acknowledged) {
          throw new Error(`Database operation not acknowledged for plugin '${name}'`);
      }

      if (result.matchedCount === 0 && result.upsertedCount === 0 && result.modifiedCount === 0) {
          throw new Error(`Failed to save configuration for plugin '${name}'`);
      }

      return { name, config };
  }
  ```
- **Benefits**:
  - Earlier detection of database issues
  - Better error messages for troubleshooting
  - Prevents silent failures
  - Aligns with `UserModel` error handling patterns
- **Priority**: Medium - improves reliability and debugging
- **Complexity**: Low (~30 minutes - add checks to 3 methods)
- **Discovered During**: W-045 code review comparing PluginModel vs UserModel
- **Note**: UserModel has comprehensive DB result checks; PluginModel should match

---

## Summary

**Total Technical Debt Items**: 19

**Priority Breakdown**:
- **High** (2): TD-5 (SQL migrations), TD-7 (sandboxing)
- **Medium** (11): TD-1 (handlebars), TD-2 (i18n), TD-6 (testing), TD-10 (hooks), TD-12 (form transforms), TD-14 (npm install), TD-15 (dependency viz), TD-16 (performance), TD-17 (hot-reload), TD-18 (HTML sanitization), TD-19 (DB result checks)
- **Low** (6): TD-3 (email), TD-4 (context), TD-8 (dev mode), TD-9 (marketplace), TD-11 (communication), TD-13 (docs)

**Blockers**:
- TD-9 (Marketplace) requires TD-7 (Sandboxing) first
- TD-17 (Hot-reload) benefits from TD-8 (Dev mode) for initial dev-only implementation

**Immediate Next Steps** (if prioritized):
1. TD-18: HTML sanitization (quick security win, ~30 min)
2. TD-19: DB result checks (quick reliability improvement, ~30 min)
3. TD-12: Form transformation (relatively simple, high impact on DX)
4. TD-14: npm plugin installation (improves deployment UX)
5. TD-15: Dependency graph visualization (useful UI, medium complexity)
6. TD-16: Performance review (good practice before v1.3.0 release)
7. TD-2: i18n support (enables international plugins)
8. TD-1: Handlebars helper discovery (enables advanced template functionality)
9. TD-17: Hot-reload (nice to have, but significant complexity)

---

## Related Documents

- Main Architecture: [`W-014-W-045-mvc-site-plugins-architecture.md`](./W-014-W-045-mvc-site-plugins-architecture.md)
- Work Items List: [`../work-items.md`](../work-items.md)

---

**Last Updated**: 2025-11-29

