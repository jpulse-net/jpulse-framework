# jPulse Framework v1.3.17

jPulse Framework is a web application framework, designed to build scalable and secure applications for enterprise and government organizations. Developers can focus on the business logic, while jPulse handles foundational infrastructure, such as user management, authentication, logging, real-time communication, and scaling. Built on MVC architecture, jPulse uniquely supports both MPA and SPA patterns, giving developers flexibility to choose the right architecture for each part of their application. Our guiding philosophy is "don't make me think," creating intuitive development experiences that accelerate productivity, enhanced further by AI-assisted development (vibe coding).

## Why jPulse?

**📊 Considering jPulse?** See our [Framework Comparison Guide](docs/framework-comparison.md) comparing jPulse with NestJS, Django, Rails, Laravel, Next.js, and other alternatives.

### 🎯 **Enterprise-Focused**
Designed specifically for midsize to large organizations in government and private sectors, with built-in security, compliance, and scalability features.

### 🚀 **"Don't Make Me Think" Philosophy**
Clean APIs, zero-configuration auto-discovery, and intuitive development patterns that eliminate cognitive load and accelerate development.

### 🔄 **Seamless Updates**
A solid site override architecture enables framework updates without losing customizations - your site code stays safe in the `site/` directory.

### 🏗️ **Flexible Architecture**
**MVC at the core** with support for both **Multi-Page Applications (MPA)** and **Single Page Applications (SPA)**. Use traditional MPA for content-focused pages, enhanced MPA for interactive features, or full SPA for app-like experiences - all in the same application.

### 🎭 **MEVN Stack**
Full-stack JavaScript with **MongoDB** for data, **Express** for routing, **Vue.js** for SPAs, and **Node.js** as the runtime. Optional Vue.js usage means you can build traditional MPAs and/or modern SPAs based on your needs.

### 🤖 **AI-Assisted Development**
jPulse Framework is designed for **Gen-AI development** (aka "vibe coding") - leveraging AI assistants like Cursor, Cline, GitHub Copilot, or Windsurf to accelerate application development while maintaining framework best practices.

## Quick Start

### For Site Development (Recommended)

```bash
# Create a new jPulse site
mkdir my-jpulse-site && cd my-jpulse-site
npx jpulse-install
npx jpulse configure
npm install
npm start
# Visit http://localhost:8080
```

📖 **Complete Installation Guide**: See [Installation Documentation](docs/installation.md) for detailed setup instructions, production deployment, and troubleshooting.

### For Framework Development

```bash
# Clone and install
git clone https://github.com/jpulse-net/jpulse-framework.git
cd jpulse-framework
npm install

# Start development server
npm start
# Visit http://localhost:8080
```

## Key Features

- **MPA & SPA Support**: Choose the right architecture for each page - traditional MPA, enhanced MPA, or full SPA
- **MVC Architecture**: Clean Model-View-Controller pattern with flexible View placement (server or browser)
- **MEVN Stack**: MongoDB + Express + Vue.js + Node.js for full-stack JavaScript development
- **Real-Time Multi-User Communication**:
  - **Application Cluster Broadcasting** for state synchronization across servers (collaborative editing, notifications)
  - **WebSocket** for bi-directional real-time interactions (chat, live updates, gaming)
  - **Redis Clustering**: Multi-instance coordination for sessions, broadcasts, and WebSocket across servers
- **Site Override System**: Customize without fear of losing changes during updates
  - **File-Level Override**: `.shtml` templates replace framework versions
  - **Append Mode**: `.js` and `.css` files concatenate site + framework for easy extension
  - **Navigation Direct Mutation**: Add, modify, or delete navigation sections without full file duplication
- **Zero Configuration**: Auto-discovery of controllers, API routes, and SPA routing:
  - Create `controller/product.js` with `static async api()` → automatically registered at `GET /api/1/product`
  - Add `static async apiCreate()` → automatically registered at `POST /api/1/product`
  - Add `view/my-app/index.shtml` with Vue Router → automatically detects SPA, supports page reloads on all sub-routes
  - Just create files following naming conventions - framework handles discovery, registration, and routing!
- **Plugin Infrastructure**: Extend framework functionality with zero configuration
  - Drop plugins in `plugins/` directory → automatically discovered and integrated
  - Plugin-aware path resolution: site > plugins > framework priority
  - Admin UI for enabling/disabling plugins and managing configurations
  - Dynamic form generation from JSON schema for plugin settings
  - Complete MVC support: controllers, models, views, static assets, documentation
  - Ships with `hello-world` demo plugin showcasing all capabilities
- **Health Metrics**: Aggregated across instances on all app servers
- **Enterprise Security**: Built-in authentication, session management, security headers, and HTML sanitization
- **Internationalization**: Complete i18n support with dynamic translation loading
- **Testing Framework**: 1200+ tests with automated cleanup and isolation
- **Production Ready**: nginx integration, PM2 clustering, MongoDB replica sets

## Deployment Requirements

### System Dependencies
- **Node.js 18 LTS** (runtime)
- **MongoDB 6.0+** (database)
- **Redis 6.0+** (caching, sessions, pub/sub)
- **nginx** (reverse proxy, production)
- **PM2** (process manager, production)

### Single Instance (Development)
- ✅ **Redis Optional**: Sessions use memory/MongoDB fallback
- ✅ **WebSocket**: Local only (single instance)
- ✅ **App Cluster**: Local only (single instance)

### Multi-Instance (PM2 Cluster)
- ✅ **Redis Required**: For cross-instance communication
- ✅ **WebSocket**: Shared across all instances via Redis pub/sub
- ✅ **App Cluster**: Broadcasts across all instances via Redis pub/sub
- ✅ **Sessions**: Shared across all instances via Redis storage

### Multi-Server (Load Balanced)
- ✅ **Redis Required**: For cross-server communication
- ✅ **WebSocket**: Shared across all servers via Redis pub/sub
- ✅ **App Cluster**: Broadcasts across all servers via Redis pub/sub
- ✅ **Sessions**: Shared across all servers via Redis storage
- ✅ **Health Metrics**: Aggregated across all instances and servers

## Architecture Overview

### Update-Safe Three-Tier Stack

```
┌─────────────────────────────────┐
│                                 │
│            Site code            │   Location: my-jpulse-site/site/
│                                 │
└────────────────┬────────────────┘
                 │
┌────────────────┴────────────────┐
│                                 │   Install:
│          Plugins code           │     npm install @jpulse-net/plugin-[name]
│                                 │   Location: my-jpulse-site/plugins/
└────────────────┬────────────────┘
                 │
┌────────────────┴────────────────┐
│                                 │   Install:  npx jpulse-install
│      jPulse Framework code      │   Update:   npx jpulse update
│                                 │   Location: my-jpulse-site/webapp/
└─────────────────────────────────┘
```

### Site Structure (After `npx jpulse configure`)

```
my-jpulse-site/
├── site/                 # Your custom code (highest priority, update-safe)
│   └── webapp/           # Site MVC components (overrides)
│       ├── app.conf      # Site configuration
│       ├── controller/   # Custom controllers
│       ├── model/        # Custom models
│       ├── view/         # Custom views (pages and templates)
│       └── static/       # Custom assets
├── plugins/              # Installed plugins (middle priority, drop-in extensions)
│   └── [plugin-name]/    # Each plugin in its own directory
│       ├── plugin.json   # Plugin metadata and dependencies
│       ├── webapp/       # Plugin MVC components
│       └── docs/         # Plugin documentation
├── webapp/               # Framework files (lowest priority)
│   ├── controller/       # Base controllers
│   ├── model/            # Data models
│   ├── view/             # Base views (pages and templates)
│   └── static/           # Framework assets
├── logs -> /var/log/...  # Symbolic link to system log directory
└── package.json          # Dependencies (@jpulse-net/jpulse-framework)
```

**File Resolution Priority:**
1. `site/webapp/[path]` (your custom code, highest priority)
2. `plugins/[plugin-name]/webapp/[path]` (plugin files, in dependency order)
3. `webapp/[path]` (framework defaults, managed by jpulse update)

**Framework Updates:**
```bash
# Update to latest production version:
npx jpulse update

# Update to specific version (beta/RC):
npx jpulse update @jpulse-net/jpulse-framework@1.0.0-rc.1
```

## Documentation

### For Site Administrators & Site Developers
- **[Getting Started](docs/getting-started.md)** - Build your first jPulse site
- **[Installation Guide](docs/installation.md)** - Setup for all environments
- **[Framework Comparison](docs/framework-comparison.md)** - jPulse vs. alternatives (NestJS, Django, Rails, etc.)
- **[Site Customization](docs/site-customization.md)** - Master the override system
- **[API Reference](docs/api-reference.md)** - Complete framework API
- **[Examples](docs/examples.md)** - Real-world enterprise scenarios
- **[Deployment Guide](docs/deployment.md)** - Production deployment

### For jPulse Framework Developers
- **[Framework Development](docs/dev/README.md)** - Architecture and contribution guide

## Target Organizations

- **Government Agencies** - Federal, state, and local government applications
- **Healthcare Systems** - HIPAA-compliant patient portals and internal tools
- **Educational Institutions** - Student information systems and administrative tools
- **Financial Services** - Secure internal applications and customer portals
- **Professional Services** - Client portals and internal management systems

## Latest Release Highlights

- ✅ **Version 1.3.17 - Handlebars Plugin Interface for Custom Helpers**: Feature release enabling site developers and plugin developers to create custom Handlebars helpers using auto-discovery pattern. Methods starting with `handlebar*` in controllers are automatically registered during bootstrap (no manual registration needed). Unified interface: Regular helpers `(args, context)`, Block helpers `(args, blockContent, context)`. Both helper types receive parsed `args` object with pre-evaluated subexpressions. Framework utilities available via `context._handlebar.*` (req, depth, expandHandlebars, parseAndEvaluateArguments, getNestedProperty, setNestedProperty). Auto-documentation: JSDoc `@description` and `@example` tags automatically extracted and included in helper documentation. Dynamic documentation via `%DYNAMIC{handlebars-list-table}%` tokens. Helper priority: Site helpers override plugin helpers, which override built-in helpers. All existing built-in helpers refactored to use same `args` interface for consistency. Works for sites (`site/webapp/controller/*.js`) and plugins (`plugins/*/webapp/controller/*.js`). Comprehensive test coverage (27 tests: 22 unit + 5 integration). Complete documentation with examples. See [Handlebars Documentation](docs/handlebars.md#custom-handlebars-helpers-v1317) and [Creating Plugins Guide](docs/plugins/creating-plugins.md#step-35-add-handlebars-helpers-optional-w-116). No breaking changes.
- ✅ **Version 1.3.16 - Handlebars Config Context Enhancements & Security**: Refactoring release improving handlebars context clarity and security. Renamed `config` context to `siteConfig` for better distinction from `appConfig` (breaking change, no backward compatibility needed). Added `user.hasRole.*` context object for role testing: `{{#if user.hasRole.root}}`. Implemented sensitive field filtering for `siteConfig` using schema metadata with `_meta.contextFilter` (following appConfig pattern). Enhanced wildcard pattern matching to support property name patterns (`smtp*`, `*pass`). Filters sensitive fields like SMTP credentials based on authentication status. Added `includeSchema` query parameter to config API (like user controller). Updated all documentation and examples (22 occurrences). Added 4 unit tests for context filtering. See [Handlebars Documentation](docs/handlebars.md). Breaking change: `{{config.*}}` → `{{siteConfig.*}}`.
- ✅ **Version 1.3.15 - Handlebars Logical & Comparison Helpers with Subexpressions**: Feature release adding powerful logical and comparison helpers to Handlebars templating. New regular helpers: `{{and}}`, `{{or}}`, `{{not}}`, `{{eq}}`, `{{ne}}`, `{{gt}}`, `{{gte}}`, `{{lt}}`, `{{lte}}` returning "true"/"false" strings. New block helpers: `{{#and}}`, `{{#or}}`, `{{#not}}`, `{{#eq}}`, `{{#ne}}`, `{{#gt}}`, `{{#gte}}`, `{{#lt}}`, `{{#lte}}` with `{{else}}` support. Subexpression support in `{{#if}}` and `{{#unless}}` using Polish notation: `{{#if (and user.isAdmin (gt user.score 100))}}`. Enhanced `_parseAndEvaluateArguments()` with multi-phase parsing supporting quoted strings with parentheses (`"James (Jim)"`), nested subexpressions, and subexpressions in all helper arguments. Added `{{else}}` support to `{{#unless}}` blocks. Permissive type coercion (numeric strings → numbers, lexicographical string comparison). Comprehensive test coverage (63 unit tests). Complete documentation with interactive examples. See [Handlebars Documentation](docs/handlebars.md) and [Live Examples](/jpulse-examples/handlebars.shtml). No breaking changes.
- ✅ **Version 1.3.14 - Metrics Bug Fixes & Enhancements**: Bug fix release addressing critical issues discovered after W-112 deployment. Fixed sanitization in aggregated components (preserve meta structure, handle both per-instance and aggregated structures). Fixed admin sanitization (use isAdmin parameter, check admin status separately from authorization). Fixed memory percentage calculation (use total system memory instead of heap size, preventing 255% display). Fixed aggregation logic (collect component names from ALL instances, components appear as soon as one instance has them). Added user document metrics (docsCreated24h, docsUpdated24h, docsDeleted24h) to UserController.getMetrics() by querying log collection. Fixed component sorting (sort by display name `component.component || componentName` instead of key in aggregation, _buildServersArray(), and _getCurrentInstanceHealthData()). All fixes ensure accurate metrics display, proper security, and better user experience. No breaking changes.
- ✅ **Version 1.3.13 - Standardized Component Metrics System & Navigation Enhancement**: Comprehensive metrics collection framework with standardized `getMetrics()` interface for all framework components. Features cluster-wide aggregation across multiple instances, time-based counters for activity tracking (last hour, last 24h, total), field-level metadata for visualization/aggregation/sanitization, and enhanced admin dashboard with component health monitoring. New `TimeBasedCounter` utility for in-memory event tracking with automatic cleanup. Components report metrics via `MetricsRegistry` for dynamic discovery. Database-backed stats marked as `global: true` for accurate cluster-wide aggregation. Sensitive fields automatically sanitized for non-admin users. Enhanced `/admin/system-status.shtml` with color-coded status indicators and flattened component display. Added `hideInDropdown` flag to navigation items, allowing items to appear in breadcrumbs but not in dropdown/hamburger menu (useful for detail pages requiring URL parameters). Removed obsolete `getHealthStatus()` methods. No breaking changes for applications.
- ✅ **Version 1.3.12 - Plugin Installation Bug Fixes**: Fixed critical bug where `npx jpulse plugin install` failed due to incorrect jPulse version detection. `getFrameworkVersion()` was reading dependency requirement (`^1.1.0`) instead of actual installed version (`1.3.11`). Now reads from `node_modules/@jpulse-net/jpulse-framework/package.json`. Also fixed `bump-version.js` to work for plugin projects by detecting plugin context via `plugin.json` and using `webapp/bump-version.conf`. Documentation updated for plugin version management. No breaking changes.
- ✅ **Version 1.3.11 - Toast Queue for Page Redirects**: New `jPulse.url.redirect(url, options)` utility for redirecting with queued toast messages. Messages stored in `jpulse_toast_queue` sessionStorage and displayed after page load. Features `options.delay` for timed redirects, `options.toasts` array for message queue, and `jPulse.url.isInternal(url)` to detect external URLs (clears queue to prevent orphaned messages). Toast API enhanced with link support: `{ toastType, message, link?, linkText?, duration? }`. Error toasts now default to 8 seconds. Plugin-defined toast styling (plugins specify `toastType`, removing hard-coded plugin checks from core). Login page updated to use instant redirect with deferred success toast for faster UX. See [UI Widgets Examples](/jpulse-examples/ui-widgets.shtml). No breaking changes.
- ✅ **Version 1.3.10 - Multi-Step Authentication & Hook Simplification**: Flexible hook-based multi-step login flow supporting MFA, email verification, OAuth2, LDAP, and more. Single `POST /api/1/auth/login` endpoint with server-controlled step chain. **Phase 8 Hook Simplification**: Reduced 24 hooks to 12 with intuitive `onBucketAction` naming convention (`onAuthBeforeLogin`, `onUserAfterSave`). Auth hooks (7): `onAuthBeforeLogin`, `onAuthBeforeSession`, `onAuthAfterLogin`, `onAuthFailure`, `onAuthGetSteps`, `onAuthValidateStep`, `onAuthGetWarnings`. User hooks (5): `onUserBeforeSave`, `onUserAfterSave`, `onUserBeforeDelete`, `onUserAfterDelete`, `onUserSyncProfile`. MFA policy enforcement auto-redirects to setup page when required. Login warnings displayed via sessionStorage across page redirects. See [Plugin Hooks Guide](docs/plugins/plugin-hooks.md). 924 unit tests passing. No breaking changes for applications; plugin developers update hook names.
- ✅ **Version 1.3.9 - Data-Driven User Profile Extensions**: Enables plugins to extend admin and user profile pages with data-driven cards. Enhanced `UserModel.extendSchema()` accepts `_meta` with `adminCard`/`userCard` configuration for automatic card rendering. Features field-level display attributes (`visible`, `readOnly`, `displayAs`, `showIf`), declarative actions (`setFields` for local form updates, `navigate` for redirects, `handler` for custom logic), and `jPulse.schemaHandlers` for complex operations. New `?includeSchema=1` API parameter returns schema metadata for client-side rendering. Username fallback for `/api/1/user/:id` (not just ObjectId). Complete documentation in `docs/plugins/plugin-api-reference.md`. No breaking changes.
- ✅ **Version 1.3.8 - Plugin CLI Management**: Complete command-line interface for plugin management with `npx jpulse plugin` commands. Features `list`/`info` for inspecting plugins, `install`/`update`/`remove` for package management with npm integration, `enable`/`disable` for controlling plugin state, and `publish` for npm distribution with automatic version synchronization. Supports shorthand package names (`auth-mfa` → `@jpulse-net/plugin-auth-mfa`), two-step install process (npm fetch → plugins/ sync), and air-gapped/private registry support. Complements existing Admin UI at `/admin/plugins`. Comprehensive documentation in `docs/plugins/managing-plugins.md` and `docs/plugins/publishing-plugins.md`. No breaking changes.
- ✅ **Version 1.3.7 - Cursor-Based Pagination for Search APIs**: Implemented efficient cursor-based pagination as default for `/api/1/user/search` and `/api/1/log/search` endpoints, with offset-based pagination as opt-in. Features stateless Base64-encoded cursors containing query state, automatic `_id` tiebreaker for consistent ordering, total count caching (countDocuments only on first request), `limit+1` fetch for hasMore detection, and `nextCursor`/`prevCursor` for bidirectional navigation. Added `jPulse.UI.pagination` client-side helper for reusable pagination state management with `createState()`, `resetState()`, `updateState()`, `formatRange()`, `updateButtons()`, and `setupButtons()` methods. New `/api/1/user/stats` endpoint provides efficient MongoDB aggregation-based statistics (total, byStatus, byRole, admins, recentLogins) replacing expensive client-side calculation. Admin views (`users.shtml`, `logs.shtml`) updated with cursor navigation and "Results per page" selectors. API parameters standardized: `limit`, `offset`, `sort`, `cursor` (removed `skip`, `page`). Comprehensive test coverage with 37 unit tests. No breaking changes - cursor mode is default but offset mode works when `offset` param present.
- ✅ **Version 1.3.6 - Plugin Hooks for Authentication & User Management**: Introduced comprehensive plugin hook system enabling third-party authentication providers (OAuth2, LDAP, MFA) and user lifecycle extensions. Features HookManager utility with 24 hooks (13 auth + 11 user), auto-registration via static `hooks` object declaration, priority-based execution order (lower = earlier, default 100), context modification and cancellation support, and `%DYNAMIC{plugins-hooks-list-table}%` for auto-documentation. Hook naming uses camelCase with Hook suffix (`authBeforeLoginHook`, `userAfterCreateHook`). Simple declaration format: `static hooks = { hookName: { priority? } }` with method name matching hook name. Auth hooks cover login flow (beforeLogin, afterPasswordValidation, beforeSessionCreate, afterLoginSuccess, onLoginFailure), logout flow (beforeLogout, afterLogout), and MFA (requireMfa, validateMfa, onMfaSuccess, onMfaFailure). User hooks cover signup (beforeSignup, afterSignupValidation, beforeCreate, afterCreate, onSignupComplete) and persistence (beforeSave, afterSave, beforeDelete, afterDelete, mapExternalProfile, syncExternalProfile). Hello-world plugin updated with working hook examples. Comprehensive documentation in `docs/plugins/plugin-hooks.md`. 26 new unit tests. No breaking changes.
- ✅ **Version 1.3.5 - Dynamic Markdown Content**: Introduced `%DYNAMIC{generator-name key="value"}%` tokens for server-generated content in markdown documentation. Features secure generator registry (only whitelisted generators callable), automatic parameter parsing with type coercion (strings, numbers, booleans), backtick escaping for documenting tokens, and post-cache processing for fresh data. Ships with 4 generators: `plugins-list-table` (markdown table), `plugins-list` (bullet list), `plugins-count` (count with filtering), `dynamic-generator-list` (self-documenting). Added `jPulse.UI.docs` API for creating documentation viewers with SPA navigation, automatic namespace detection, and site nav integration. Features `init()`, `getViewer()`, `convertFilesToPages()` methods. Updated SPA detection to recognize docs viewers. Added `titleCaseFix` configuration for automatic title corrections (API, HTML, CSS, etc.) with site override support. Created comprehensive `docs/markdown-docs.md` documentation guide. 20 unit tests added for token parsing and processing.
- ✅ **Version 1.3.4 - Custom Template Variables**: Introduced safe custom variables with `{{let key="value"}}` for template-scoped variables, `{{#let key="value"}}...{{/let}}` for block-scoped variables with scope isolation, and `{{#with object}}` for context switching. All custom variables stored in protected `vars` namespace preventing system variable conflicts. Features nested property support (`{{let config.theme="dark"}}`), type support (strings, numbers, booleans), scope inheritance, and pollution prevention in loops. Comprehensive test coverage with 33/33 unit tests passing. Updated 4 documentation guides with live examples. Benefits: safety (cannot override system vars), clarity (self-documenting `{{vars.*}}`), flexibility (template-scoped or block-scoped), and maintainability (easy debugging with namespace separation). No breaking changes.
- ✅ **Version 1.3.3 - Unified Component System**: Replaced extract:start/end markers with intuitive `{{#component}}` syntax for reusable content blocks. New `{{file.includeComponents}}` helper silently registers components from multiple files for dashboard aggregation. Components now available as context variables (`{{components.namespace.name}}`), accessible like `{{user.*}}` or `{{siteConfig.*}}`. Features pattern filtering (`component="adminCards.*"`), flexible sorting (component-order, plugin-order, filename), circular reference detection, and `_inline` parameter for JavaScript embedding. Migrated all 16 framework dashboards (admin, examples, plugins) and 8 site/plugin views to new syntax. Removed ~210 lines of deprecated extract code. Enhanced component call handling with proper error messages, context propagation, and parameter expansion. Updated comprehensive documentation across 4 guides. All 919 tests passing (813 unit + 100 integration + CLI tools). Benefits: "don't make me think" syntax, clean Handlebars with proper highlighting, no more `<div style="display: none;">` wrappers, explicit sorting control.
- ✅ **Version 1.3.2 - Additional Plugin Infrastructure Bug Fixes**: Patch release fixing four critical bugs discovered during v1.3.1 production deployment. Fixed update script missing plugin sync (sites had stale plugins after framework update). Removed confusing "enabled" config field that didn't actually enable/disable plugins. Fixed wrong documentation symlink location with context-aware detection (framework repo uses `docs/`, site uses `webapp/static/assets/jpulse-docs/`). Fixed stale plugin state in admin UI after enable/disable (now updates immediately without restart). All 926 tests passing. Files modified: 4 code fixes, 4 documentation updates. Ensures plugin updates work correctly, eliminates UX confusion, and maintains consistency across framework development and site installations. No breaking changes.
- ✅ **Version 1.3.1 - Critical Bug Fixes for Plugin Infrastructure**: Patch release fixing three critical bugs discovered after v1.3.0 deployment. Fixed npm package missing `plugins/hello-world/` directory (added explicit `files` field to package.json). Fixed GitHub Actions CI test crashes when database unavailable (added `isTest` parameter to PluginModel.ensureIndexes()). Fixed JavaScript syntax errors when i18n strings contain apostrophes - converted 160+ instances to template literals (backticks) across 15 view files, established `%TOKEN%` pattern for dynamic error messages, added comprehensive "Using i18n in JavaScript Context" best practices section to documentation. All 926 tests passing. Ensures complete npm package, reliable CI/CD testing, and safe internationalization with natural language. No breaking changes.
- ✅ **Version 1.3.0 - Plugin Infrastructure with Auto-Discovery**: Comprehensive plugin system enabling third-party extensions with zero-configuration auto-discovery. Features complete MVC support (controllers, models, views, static assets, documentation), dynamic configuration management with JSON schema validation, admin UI for plugin management, plugin-aware path resolution (site > plugins > framework), automatic symlink management, and ships with `hello-world` demo plugin. Includes robust security (path traversal protection, HTML sanitization for plugin descriptions and email content, DB operation validation), complete i18n (English & German), request timing, and comprehensive testing (913 tests passing). Five comprehensive documentation guides for plugin development. Technical debt documented with 19 items for future enhancements. No breaking changes.
- ✅ **Version 1.2.6 - Bug Fixes for Site Installation and Navigation**: Critical bug fix release addressing issues discovered after v1.2.5 deployment. Fixed incomplete hello example copying during site installation (now copies all 5 controllers, 1 model, and recursive view directories with templates). Implemented robust navigation null handling with `_sanitizeNavStructure()` method to safely remove deletion markers at init time, preventing "Cannot read properties of null" errors. Removed obsolete `checkAdminAccess()` call. All 893 tests passing.
- ✅ **Version 1.2.5 - Site Navigation Override with Append Mode**: Introduced flexible navigation customization using append mode file concatenation and direct JavaScript mutation. Sites can selectively add, modify, or delete navigation sections without duplicating entire framework files. Features `.js` and `.css` append mode (concatenate framework + site), unified `window.jPulseNavigation` structure, direct mutation pattern (`window.jPulseNavigation.site.foo = {...}`), Handlebars comment support (`{{!-- --}}`), and file naming standardization (`site-common.*` → `jpulse-common.*`). Benefits: zero runtime overhead, automatic framework updates, idiomatic JavaScript, minimal customization code. Breaking change: navigation file migration required. Complete documentation in site-navigation.md guide.
- ✅ **Version 1.2.4 - Reusable Handlebars Components**: Introduced reusable component system to eliminate code duplication. Define components once with `{{#component "name" param="default"}}...{{/component}}`, use everywhere with `{{use.componentName param="value"}}`. Features automatic kebab-case to camelCase conversion, per-request component registry, circular reference detection, optional dot-notation namespaces (`jpIcons.configSvg`), and `_inline=true` parameter for JavaScript embedding. Created centralized `svg-icons.tmpl` library with 20+ parameterized SVG components. Migrated all framework icons to component system. Benefits: define once use everywhere, clean templates, maintainable icons, organized namespaces. No breaking changes - new opt-in feature with comprehensive documentation.
- ✅ **Version 1.2.3 - Professional SVG Icons**: Replaced Unicode emoji icons with professional SVG icons from lucide.dev across admin dashboard and hello demo pages. Improves visual consistency with enterprise-ready appearance and theme-flexible design using CSS `currentColor`. Added vertical alignment CSS (`h1-h6 svg { vertical-align: middle; }`) for proper icon positioning. Inline SVG implementation enables proper color inheritance from parent containers. Theme-ready icons respond to CSS color changes. No breaking changes - visual enhancement only.
- ✅ **Version 1.2.2 - Removed jsdom Dependency**: Replaced 15-20MB jsdom package (90+ sub-dependencies) with lightweight regex-based CSS selector extraction (~50 lines of code). Uses smart tag nesting level annotation (`:~0~`, `:~1~`) with backreference matching to handle nested tags correctly. Moved jsdom to devDependencies (still used for client-side JS tests). Significantly reduces production package size, faster installs, same functionality. CSS selector extraction (`.class`, `#id`) works identically with zero external dependencies.
- ✅ **Version 1.2.1 - File Listing & Extraction Helpers**: Generalized Handlebars helpers for automated content generation. Features `file.list` for glob pattern file discovery and `file.extract` for content extraction using three methods (comment markers, regex patterns, CSS selectors). Supports sorting by extracted order or filename, pattern parameter passing in loops, and site override via PathResolver. Security built-in with path traversal protection. Use cases include auto-populated dashboards, navigation menus, galleries, and documentation indexes. Added `PathResolver.listFiles()` method for centralized directory listing with site override support.
- ✅ **Version 1.2.0 - Admin User Management & API Consolidation**: Complete admin user management system with flexible user identification (ObjectId, username, session), comprehensive validation (last admin protection, role safeguards), schema extension architecture for plugin support, and unified API surface. Breaking changes: removed `/api/1/user/profile` endpoints, replaced with unified `/api/1/user` and `/api/1/user/:id`. New `/api/1/user/enums` endpoint for dynamic enum retrieval. Centralized admin roles configuration via `appConfig.user.adminRoles`. Runtime schema extension via `UserModel.extendSchema()` for future plugins.
- ✅ **Version 1.1.8 - Simplified Installation & Bug Fixes**: Added `jpulse-install` npm package for one-command installation. No more manual `.npmrc` creation - just run `npx jpulse-install` and you're ready to configure your site. Eliminates the "chicken and egg" problem of installing from GitHub Packages. Fixed log symlink creation (only for file logging), SSL paths in nginx config, PORT value preservation, and log directory defaults. Renamed `npx jpulse install` → `npx jpulse setup` for clarity. Manual installation method still available in docs.
- ✅ **Version 1.1.7 - Deployment Bug Fixes**: Fixed seven bugs affecting site deployment and configuration, improving the "don't make me think" installation experience. Simplified npm installation with `--registry` flag (no manual .npmrc creation). Fixed log directory symlinks, MongoDB setup auto-loads `.env` file, handles existing authentication for multi-site installs. Auto-configures Let's Encrypt SSL paths. Nginx uses site-specific upstream names enabling seamless multi-site installations on same server.
- ✅ **Version 1.1.6 - Configurable Navigation Delays**: Restructured `view.pageDecoration` configuration with nested structure for better site overrides. Made site navigation menu open/close delays fully configurable via `app.conf` (openDelay, closeDelay, submenuCloseDelay). Open delay cancels if mouse leaves before menu opens, preventing accidental triggers. Site administrators can now fine-tune menu timing for their specific UX needs.
- ✅ **Version 1.1.5 - Log IP addresses**: Fix bug where local IP address 127.0.0.1 was shown in the logs when jPulse is behind a reverse proxy.
- ✅ **Version 1.1.4 - Email Sending Strategy**: Implemented standardized email sending capability for jPulse Framework and site applications. EmailController provides server-side utility methods (sendEmail, sendEmailFromTemplate, sendAdminNotification) and client-side API endpoint (POST /api/1/email/send). MongoDB-based configuration enables per-instance SMTP settings with support for all major providers (Gmail, SendGrid, AWS SES, Office 365, Mailgun). Features test email functionality in admin UI, health monitoring integration, Handlebars template support, and graceful fallback when email not configured. Complete documentation and comprehensive test coverage.
- ✅ **Version 1.1.3 - Handlebars Processing Extraction**: Extracted Handlebars template processing to dedicated `HandlebarController` for better separation of concerns and reusable template processing API. Added `POST /api/1/handlebar/expand` endpoint for client-side Handlebars expansion with server context. Added `/api/1/config/_default` endpoint for default configuration management. Context filtering based on authentication status protects sensitive configuration data. Event-driven config refresh via Redis broadcast ensures multi-instance cache consistency. Enables future email template processing and "Try Your Own Handlebars" demo functionality.
- ✅ **Version 1.1.0 - Unified CLI tools with intuitive npx jpulse commands**: Unified command-line interface with single entry point, configuration-driven version bumping, and intuitive update workflow following "don't make me think" philosophy
- ✅ **Version 1.0.1 - Documentation & Developer Experience**: Framework comparison guide comparing jPulse with NestJS, Django, Rails, Laravel, Next.js, and alternatives. Automated `.npmrc` creation for GitHub Packages registry - no manual configuration needed. Enhanced developer experience following "don't make me think" philosophy.
- ✅ **Version 1.0.0 - Production Milestone**: Complete Redis infrastructure for scalable multi-instance and multi-server deployments with zero-configuration auto-discovery, Application Cluster Broadcasting, WebSocket real-time communication, aggregated health metrics, Redis-based session sharing, and enterprise-grade clustering. Includes BSL 1.1 licensing, repository migration to jpulse-net organization, comprehensive Gen-AI development guides, and production-ready deployment automation.
- ✅ **Zero-Configuration Auto-Discovery (v1.0.0-rc.2)** - Complete automatic controller registration, API endpoint discovery, and SPA routing detection
- ✅ **Production-Ready WebSocket and Redis Integration (v1.0.0-rc.1)** - Complete real-time communication capabilities for multi-user, multi-instance, and multi-server deployments
- ✅ **[MPA vs. SPA Architecture Guide](docs/mpa-vs-spa.md)** - Comprehensive comparison with diagrams showing when to use each pattern

## Community & Support

- **Documentation**: Complete guides in `/docs/` directory
- **GitHub**: Issues, discussions, and contributions welcome
- **License**: BSL 1.1 (with commercial licensing available)
- **Roadmap**: [Development roadmap](docs/dev/roadmap.md) with clear milestones

## Enterprise Advantages

- **Stability**: Backward-compatible updates with clear migration paths
- **Security**: Built-in security best practices and regular audits
- **Scalability**: Horizontal scaling with session clustering and database sharding
- **Maintainability**: Clean architecture with comprehensive documentation
- **Cost-Effective**: Open source with optional enterprise support

## Licensing

jPulse Framework uses **Business Source License 1.1 (BSL 1.1)**:

- **Free for**: Evaluation, development, testing, and learning
- **Source Code**: Fully accessible at [GitHub](https://github.com/jpulse-net/jpulse-framework)
- **Production Use**: Requires commercial license (contact [team@jpulse.net](mailto:team@jpulse.net))
- **Future**: Automatically converts to AGPL v3.0 on **2030-01-01**

**Quick Guide:**
- ✅ **Development/testing**: Free (BSL 1.1)
- ❌ **Production/SaaS**: Commercial license required

For detailed licensing information, see [License Documentation](docs/license.md).

---

**Ready to build enterprise-grade applications without the complexity?**

[Get Started](docs/getting-started.md) | [View Examples](docs/examples.md) | [Read Documentation](docs/README.md)

*jPulse Framework - Powerful simplicity for enterprise applications*
