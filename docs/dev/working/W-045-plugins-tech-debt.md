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

## W-045-TD-10: Hook System Enhancement

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

## W-045-TD-13: Auto-Generate Installed Plugins Index

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

## Summary

**Total Technical Debt Items**: 14

**Priority Breakdown**:
- **High** (2): TD-5 (SQL migrations), TD-7 (sandboxing)
- **Medium** (6): TD-1 (handlebars), TD-2 (i18n), TD-6 (testing), TD-10 (hooks), TD-12 (form transforms), TD-14 (npm install)
- **Low** (6): TD-3 (email), TD-4 (context), TD-8 (dev mode), TD-9 (marketplace), TD-11 (communication), TD-13 (docs)

**Blockers**:
- TD-9 (Marketplace) requires TD-7 (Sandboxing) first

**Immediate Next Steps** (if prioritized):
1. TD-12: Form transformation (relatively simple, high impact on DX)
2. TD-14: npm plugin installation (improves deployment UX)
3. TD-2: i18n support (enables international plugins)
4. TD-1: Handlebars helper discovery (enables advanced template functionality)

---

## Related Documents

- Main Architecture: [`W-014-W-045-mvc-site-plugins-architecture.md`](./W-014-W-045-mvc-site-plugins-architecture.md)
- Work Items List: [`../work-items.md`](../work-items.md)

---

**Last Updated**: 2025-11-26

