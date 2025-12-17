# jPulse Docs / Version History v1.3.17

This document tracks the evolution of the jPulse Framework through its work items (W-nnn) and version releases, providing a comprehensive changelog based on git commit history and requirements documentation.

________________________________________________
## v1.3.17, W-116, 2025-12-17

**Commit:** `W-116, v1.3.17: handlebars: define plugin interface for custom helpers`

**FEATURE RELEASE**: Enable site developers and plugin developers to define custom Handlebars helpers using auto-discovery pattern consistent with existing plugin architecture (API endpoints, hooks).

**Objective**: Enable site developers and plugin developers to define their own handlebar helpers using auto-discovery pattern, providing a unified interface for regular and block helpers with consistent argument structure and access to framework utilities.

**Key Features**:

**Auto-Discovery Pattern**:
- Methods starting with `handlebar*` in controllers are automatically registered during bootstrap
- Works for sites: `site/webapp/controller/*.js` with `handlebar*` methods
- Works for plugins: `plugins/*/webapp/controller/*.js` with `handlebar*` methods
- No manual registration needed - follows existing `api*` (endpoints) and `on*` (hooks) patterns
- Helper name derived from method name: `handlebarUppercase` → `{{uppercase}}`

**Unified Interface**:
- Regular helpers: `(args, context)` - 2 parameters
- Block helpers: `(args, blockContent, context)` - 3 parameters
- Helper type automatically detected from function signature (`function.length`)
- Both helper types receive parsed `args` object with pre-evaluated subexpressions

**Consistent Argument Structure**:
- `args._helper` - Helper name (e.g., "uppercase")
- `args._target` - First positional argument or property path value
- `args._args[]` - Array of all positional arguments
- `args.{key}` - Named arguments (e.g., `args.count` from `count=3`)
- Subexpressions are pre-evaluated (no need to parse manually)

**Internal Utilities Access**:
- Framework utilities available via `context._handlebar.*` namespace
- `context._handlebar.req` - Express request object
- `context._handlebar.depth` - Current recursion depth
- `context._handlebar.expandHandlebars(template, additionalContext)` - Expand nested Handlebars
- `context._handlebar.parseAndEvaluateArguments(expression, ctx)` - Parse helper arguments
- `context._handlebar.getNestedProperty(obj, path)` - Get nested property
- `context._handlebar.setNestedProperty(obj, path, value)` - Set nested property
- `context._handlebar` is filtered out before templates see the context (security)

**Auto-Documentation with JSDoc**:
- Helpers are automatically documented when JSDoc comments include `@description` and `@example` tags
- Framework extracts these tags during helper registration via `_extractJSDoc()` method
- Documentation is automatically included in helper lists via dynamic content generation
- Examples should show actual template syntax (e.g., `{{uppercase "text"}}`)

**Dynamic Documentation**:
- Helper lists generated automatically via `%DYNAMIC{handlebars-list-table}%` tokens
- Supports filtering by type (`type="regular"` or `type="block"`) and source (`source="jpulse"`, `source="site"`, or plugin name)
- Helper list format via `%DYNAMIC{handlebars-list}%` token
- All helpers tracked in `HANDLEBARS_DESCRIPTIONS` array with metadata (name, type, description, example, source)

**Helper Priority**:
- Site helpers override plugin helpers, which override built-in helpers
- Priority enforced by registration order: Site → Plugin 1 → Plugin 2 → Core
- Last registered helper wins (Map.set() behavior)

**Refactored Built-in Helpers**:
- All existing regular helpers refactored to use `args` parameter instead of `expression` string
- All existing block helpers refactored to use `args` parameter instead of `params` string
- Consistent interface across all helpers (built-in and custom)

**Code Changes**:

**webapp/controller/handlebar.js**:
- Added `helperRegistry` Map storing handler, type, source, description, example metadata
- Added `registerHelper(name, handler, options)` method with validation
- Added `initializeHandlebarHandlers()` method for auto-discovery from controllers
- Added `_registerHelpersFromFile(filePath, source, pathToFileURL)` for registering helpers from controller files
- Added `_extractJSDoc(fileContent, methodName)` for extracting `@description` and `@example` from JSDoc
- Replaced `REGULAR_HANDLEBARS` and `BLOCK_HANDLEBARS` arrays with `HANDLEBARS_DESCRIPTIONS` array
- Updated `_evaluateRegularHandlebar()` to check registry first (plugin/site helpers override built-ins)
- Updated `_evaluateBlockHandlebar()` to check registry first and use parsed args
- Refactored all existing regular helpers to use `args` parameter
- Refactored all existing block helpers to use `args` parameter
- Added `context._handlebar` namespace with internal utilities in `_buildInternalContext()`
- Filter out `_handlebar` from context in `_filterContext()` before template exposure
- Updated `getMetrics()` to derive helper lists from `HANDLEBARS_DESCRIPTIONS`

**webapp/utils/path-resolver.js**:
- Added `collectControllerFiles()` method for collecting controller files in load order (site → plugins)

**webapp/utils/bootstrap.js**:
- Call `HandlebarController.initializeHandlebarHandlers()` after `SiteControllerRegistry.initialize()`
- Helper auto-discovery moved to `HandlebarController` for better separation of concerns

**webapp/controller/markdown.js**:
- Added `handlebars-list-table` dynamic content generator with type and source filters
- Added `handlebars-list` dynamic content generator with type filter
- Generators import `HandlebarController` to access `HANDLEBARS_DESCRIPTIONS`

**plugins/hello-world/webapp/controller/helloPlugin.js**:
- Added example regular helper (`handlebarUppercase`) with JSDoc
- Added example block helper (`handlebarRepeat`) with JSDoc
- Demonstrate usage of `context._handlebar.expandHandlebars()` for nested expansion
- Include `@description` and `@example` tags for auto-documentation

**webapp/tests/unit/controller/handlebar-plugin-interface.test.js**:
- New test file with 22 unit tests:
  - Helper registration via `registerHelper()`
  - JSDoc extraction from source files
  - Auto-discovery from controllers
  - Regular helper invocation with `args` parameter
  - Block helper invocation with `args` parameter
  - Internal utilities access via `context._handlebar`
  - `HANDLEBARS_DESCRIPTIONS` integration
  - Helper override priority

**webapp/tests/integration/plugin-handlebars-helpers.test.js**:
- New test file with 5 integration tests:
  - Plugin helper registration and discovery
  - Helper invocation in real bootstrap flow
  - Helper priority (site > plugin > built-in)
  - Helpers with property access and subexpressions

**Files Modified**: 8
- `webapp/controller/handlebar.js`: Registry, auto-discovery, JSDoc extraction, helper refactoring, context utilities
- `webapp/utils/path-resolver.js`: Controller file collection utility
- `webapp/utils/bootstrap.js`: Helper auto-discovery integration
- `webapp/controller/markdown.js`: Dynamic content generators for helper documentation
- `plugins/hello-world/webapp/controller/helloPlugin.js`: Example helpers with JSDoc
- `docs/handlebars.md`: Custom helpers documentation section
- `docs/plugins/creating-plugins.md`: Step 3.5 with helper examples and JSDoc documentation
- `docs/dev/work-items.md`: Updated features, implementation, and deliverables

**Breaking Changes**: None

**Documentation**:
- Updated `docs/handlebars.md` with comprehensive custom helpers section
- Updated `docs/plugins/creating-plugins.md` with Step 3.5: Add Handlebars Helpers
- Updated `docs/dev/work-items.md` with W-116 features, implementation, and deliverables
- Updated `docs/dev/working/W-116-handlebars-plugin-interface.md` with implementation details and JSDoc extraction
- Updated `README.md` and `docs/README.md` latest release highlights

________________________________________________
## v1.3.16, W-115, 2025-12-15

**Commit:** `W-115, v1.3.16: handlebars: config context enhancements & security, fixes for let and subexpressions`

**REFACTORING RELEASE**: Improved handlebars context clarity and security with config context renaming and sensitive field filtering.

**Objective**: Make handlebars context more intuitive by renaming `config` to `siteConfig`, and enhance security by filtering sensitive configuration fields based on authentication status.

**Key Features**:

**Context Renaming**:
- Renamed `config` context property to `siteConfig` for better distinction
- Two configuration structures now clearly separated:
  - `siteConfig`: system config from ConfigModel (database)
  - `appConfig`: webapp/app.conf configuration
- Breaking change: `{{config.*}}` → `{{siteConfig.*}}` (no backward compatibility)

**Security Enhancement - Sensitive Field Filtering**:
- Added `_meta.contextFilter` to ConfigModel schema with `withoutAuth` and `withAuth` arrays
- Filters sensitive fields like SMTP credentials based on authentication status
- Supports wildcard patterns: `data.email.smtp*`, `data.email.*pass`
- Enhanced `_removeWildcardPath()` to support property name patterns:
  - Prefix patterns: `smtp*` matches `smtpServer`, `smtpPort`, `smtpUser`, `smtpPass`
  - Suffix patterns: `*pass` matches any property ending with `pass`
- Unauthenticated users: all SMTP fields filtered
- Authenticated users: password fields still filtered (security best practice)

**New Context Features**:
- Added `user.hasRole.*` context object for role testing
- Example: `{{#if user.hasRole.root}}`, `{{#if user.hasRole.admin}}`
- Implemented as object with role keys set to `true` for user's roles

**API Enhancements**:
- Added `includeSchema` query parameter to config controller (like user controller)
- Returns schema and contextFilter metadata when requested: `GET /api/1/config/:id?includeSchema=1`

**Code Changes**:

**webapp/controller/handlebar.js**:
- Renamed `config` context property to `siteConfig` in `_buildInternalContext()`
- Updated `_filterContext()` to filter `siteConfig` using schema `_meta.contextFilter`
- Enhanced `_removeWildcardPath()` to support property name patterns (`smtp*`, `*pass`)
- Updated `REGULAR_HANDLEBARS` array with descriptive comments
- Updated `BLOCK_HANDLEBARS` array with descriptive comments

**webapp/model/config.js**:
- Added `_meta.contextFilter` to schema with `withoutAuth` and `withAuth` arrays
- Defined sensitive field patterns: `data.email.smtp*`, `data.email.*pass`, `data.email.smtpPass`

**webapp/controller/config.js**:
- Added `includeSchema` query parameter support (matching user controller pattern)
- Returns schema and contextFilter metadata when requested

**webapp/tests/unit/controller/handlebar-context-filter.test.js**:
- New test file with 4 unit tests:
  - Filter `smtp*` fields for unauthenticated users
  - Filter `*pass` fields for unauthenticated users
  - Filter `smtpPass` for authenticated users
  - Preserve non-sensitive fields

**webapp/tests/unit/controller/handlebar-variables.test.js**:
- Fixed test to use `siteConfig` instead of `config`

**Files Modified**: 7
- `webapp/controller/handlebar.js`: Context renaming, filtering logic, wildcard pattern enhancement
- `webapp/model/config.js`: Schema metadata for context filtering
- `webapp/controller/config.js`: Schema API support
- `docs/handlebars.md`: Updated all examples (9 occurrences)
- `webapp/view/jpulse-examples/handlebars.shtml`: Updated all examples (13 occurrences)
- `webapp/tests/unit/controller/handlebar-variables.test.js`: Test fix
- `webapp/tests/unit/controller/handlebar-context-filter.test.js`: New test file

**Breaking Changes**:
- `{{config.*}}` → `{{siteConfig.*}}` (all templates must be updated)
- No backward compatibility provided

**Documentation**:
- Updated `docs/dev/work-items.md` with W-115 deliverables
- Updated `docs/handlebars.md` with `siteConfig` examples and `user.hasRole.*` documentation
- Updated `webapp/view/jpulse-examples/handlebars.shtml` with `siteConfig` examples
- Updated `README.md` and `docs/README.md` latest release highlights

________________________________________________
## v1.3.15, W-114, 2025-12-14

**Commit:** `W-114, v1.3.15: handlebars: add logical and comparison helpers with subexpressions and block helpers`

**FEATURE RELEASE**: Enhanced Handlebars templating with logical and comparison helpers supporting standalone usage, subexpressions in conditions, and block helpers with `{{else}}` support.

**Objective**: Provide more flexible and powerful conditional logic in templates using Polish notation (operator-first syntax), enabling complex conditions like `{{#if (and user.isAdmin (gt user.score 100))}}`.

**Key Features**:

**New Regular Helpers (9 total)**:
- Logical helpers: `{{and}}`, `{{or}}`, `{{not}}` - return `"true"` or `"false"` strings
- Comparison helpers: `{{eq}}`, `{{ne}}`, `{{gt}}`, `{{gte}}`, `{{lt}}`, `{{lte}}` - return `"true"` or `"false"` strings
- Arity: `and`/`or` (1+ arguments), `not` (exactly 1), comparisons (exactly 2)
- Permissive type coercion: `{{gt "10" 5}}` → `"true"` (string "10" coerced to number 10)
- Lexicographical string comparison: `{{gt "2025-12-14" "2025-12-13"}}` → `"true"`

**New Block Helpers (9 total)**:
- `{{#and}}`, `{{#or}}`, `{{#not}}`, `{{#eq}}`, `{{#ne}}`, `{{#gt}}`, `{{#gte}}`, `{{#lt}}`, `{{#lte}}`
- All support `{{else}}` blocks for cleaner conditional rendering
- Example: `{{#and user.isAdmin user.isActive}} admin {{else}} not admin {{/and}}`

**Subexpression Support**:
- Polish notation syntax: `{{#if (and user.isAdmin (gt user.score 100))}}`
- Works in `{{#if}}` and `{{#unless}}` conditions
- Supports nested subexpressions: `{{#if (and (gt score 100) (eq status "active"))}}`
- Quoted strings with parentheses preserved: `{{#if (and (eq user.firstName "James (Jim)") user.isActive)}}`
- Subexpressions in all helper arguments: `{{#component (vars.name) order=(vars.order)}}`

**Enhanced Argument Parsing**:
- Renamed `_parseArguments()` → `_parseAndEvaluateArguments()` (async)
- Multi-phase parsing algorithm:
  - Phase 1: Extract helper name
  - Phase 2: Escape quotes and parentheses inside quoted strings
  - Phase 3: Annotate parentheses with nesting levels
  - Phase 4: Recursively evaluate subexpressions
  - Phase 5: Clean up expression text
  - Phase 6: Parse all arguments (positional and key=value pairs) with type coercion
- Supports both double quotes `"..."` and single quotes `'...'`
- Supports escaped quotes: `"James \"Jim\""`

**Additional Enhancements**:
- Added `{{else}}` support to `{{#unless}}` blocks (matching `{{#if}}` behavior)
- Simplified `_evaluateCondition()` logic (removed undocumented `!` negation)
- Unified comparison helpers into single `_handleComparison()` function using function map
- Unified block helper handler `_handleLogicalBlockHelper()` for all 9 logical/comparison block helpers

**Code Changes**:

**webapp/controller/handlebar.js**:
- `_parseAndEvaluateArguments()`: Complete rewrite with multi-phase parsing, subexpression evaluation, quoted string handling
- `_handleAnd()`, `_handleOr()`, `_handleNot()`: Logical helper functions with string "true"/"false" normalization
- `_handleComparison()`: Unified comparison function for all 6 operators (eq, ne, gt, gte, lt, lte)
- `_handleLogicalBlockHelper()`: Unified block helper handler for all 9 logical/comparison helpers
- `_evaluateRegularHandlebar()`: Added cases for all 9 new regular helpers
- `_evaluateBlockHandlebar()`: Added cases for all 9 new block helpers
- `_evaluateCondition()`: Enhanced to detect and evaluate subexpressions recursively
- `_handleBlockIf()`, `_handleBlockUnless()`: Made async, added `{{else}}` to `{{#unless}}`
- `REGULAR_HANDLEBARS` array: Added `not`, `gt`, `gte`, `lt`, `lte`, `ne`
- `BLOCK_HANDLEBARS` array: Added all 9 new block helpers

**webapp/tests/unit/controller/handlebar-logical-helpers.test.js**:
- 63 comprehensive unit tests covering:
  - Standalone helpers (all 9 helpers)
  - Subexpressions in `{{#if}}` and `{{#unless}}`
  - Block helpers with `{{else}}` support
  - Type coercion (numeric strings, loose equality)
  - Quoted strings with parentheses
  - Nested subexpressions
  - Edge cases (null, undefined, empty strings)

**Files Modified**: 4
- `webapp/controller/handlebar.js`: Core implementation (subexpression parser, 9 helpers, block helpers)
- `webapp/tests/unit/controller/handlebar-logical-helpers.test.js`: Comprehensive test suite
- `docs/handlebars.md`: Complete documentation with examples
- `webapp/view/jpulse-examples/handlebars.shtml`: Interactive examples

**Breaking Changes**: None

**Documentation**:
- Updated `docs/dev/work-items.md` with W-114 deliverables
- Updated `docs/handlebars.md` with comprehensive "Logical and Comparison Helpers" section
- Updated `webapp/view/jpulse-examples/handlebars.shtml` with interactive examples
- Updated `docs/dev/working/W-114-handlebars-logical-subexpressions.md` with complete design decisions

________________________________________________
## v1.3.14, W-113, 2025-12-13

**Commit:** `W-113, v1.3.14: metrics: bug fixes for reporting vital statistics of components`

**BUG FIX RELEASE**: Fixes critical issues discovered after W-112 deployment affecting metrics display, security, and user experience.

**Objective**: Fix bugs in metrics aggregation, sanitization, and display discovered during W-112 production use.

**Bug Fixes**:

**Bug #1: Aggregated Components Showing Unsanitized Data**:
- **Problem**: Aggregated components (e.g., `smtpServer` in EmailController) showed unsanitized data even when `sanitize: true` was set in metadata
- **Symptom**: Sensitive data visible in aggregated section when logged out
- **Fix**: Preserve `meta` structure in `_aggregateComponentStats()` to allow `_sanitizeComponentStats()` to correctly identify fields marked for sanitization. Updated `_sanitizeComponentStats()` to handle both per-instance and aggregated component structures.

**Bug #2: Admin Users Seeing Sanitized Data**:
- **Problem**: InstanceId showing sanitized data (999:0:99999) when logged in as admin
- **Symptom**: Admin users saw obfuscated instance IDs in PM2 instances table
- **Fix**: Use separate `isAdmin` parameter (based on `['admin', 'root']` roles) instead of hardcoded `false`. Check admin status separately from authorization to ensure admins see full data.

**Bug #3: Memory Percentage Showing 255%**:
- **Problem**: Memory percentage calculation using heap size instead of total system memory
- **Symptom**: Memory percentage displayed as 255% or other unrealistic values
- **Fix**: Changed calculation in `_getPM2Status()` to use `os.totalmem()` (total system memory) instead of `heapTotal` for percentage calculation: `Math.round((thisProcess.memory / (os.totalmem() / 1024 / 1024)) * 100)`

**Bug #4: Aggregation Waiting for All Instances**:
- **Problem**: Components only appeared in aggregated section after all instances had them
- **Symptom**: Components missing from aggregation even when one instance had them
- **Fix**: Updated `_aggregateComponentStats()` to collect component names from ALL instances (using a `Set`) and find `componentData` from any instance that has them. Components now appear in aggregation as soon as at least one instance has them.

**Enhancements**:

**Enhancement #1: User Document Metrics**:
- Added `docsCreated24h`, `docsUpdated24h`, `docsDeleted24h` metrics to `UserController.getMetrics()`
- Metrics retrieved via MongoDB aggregation querying log collection for user document changes
- Uses same pattern as `LogController.getMetrics()` for consistency
- Marked as `global: true` and `aggregate: 'first'` (database-backed, same across instances)

**Enhancement #2: Component Sorting by Display Name**:
- Changed component sorting to use display name (`component.component || componentName`) instead of internal key
- Updated in three locations:
  - `_aggregateComponentStats()`: Sort aggregated components by display name from any instance
  - `_buildServersArray()`: Sort instance-level components by display name
  - `_getCurrentInstanceHealthData()`: Sort instance-level components by display name
- Components now appear in user-friendly alphabetical order (e.g., "EmailController", "HandlebarController") instead of internal keys (e.g., "email", "handlebars")

**Code Changes**:

**webapp/controller/health.js**:
- `_aggregateComponentStats()`: Preserve `meta` object in aggregated output, collect component names from all instances
- `_sanitizeComponentStats()`: Handle both per-instance and aggregated structures, accept `isAdmin` parameter
- `metrics()`: Use separate `isAdmin` check based on roles
- `_getPM2Status()`: Fix memory percentage calculation to use total system memory
- Component sorting: Sort by display name in aggregation, `_buildServersArray()`, and `_getCurrentInstanceHealthData()`

**webapp/controller/user.js**:
- `getMetrics()`: Added `docsCreated24h`, `docsUpdated24h`, `docsDeleted24h` fields
- Metadata: Added field definitions for new metrics with `global: true` and `aggregate: 'first'`

**webapp/model/user.js**:
- `getUserStats()`: Added MongoDB aggregation pipeline for user document changes from log collection
- Uses `$facet` for parallel aggregations (docsCreated24h, docsUpdated24h, docsDeleted24h)

**Files Modified**: 3
- `webapp/controller/health.js`: Sanitization fixes, aggregation fixes, memory calculation fix, component sorting
- `webapp/controller/user.js`: Added user document metrics
- `webapp/model/user.js`: Added aggregation for user document changes

**Breaking Changes**: None

**Documentation**:
- Updated `docs/dev/work-items.md` with W-113 bugs, enhancements, and deliverables
- Updated `README.md` and `docs/README.md` with latest release highlights
- Updated `docs/CHANGELOG.md` with v1.3.14 entry

________________________________________________
## v1.3.13, W-112, 2025-12-13

**Commit:** `W-112, v1.3.13: metrics: strategy to report vital statistics of components`

**FEATURE RELEASE**: Standardized metrics collection system for framework components with cluster-wide aggregation, time-based counters, and comprehensive admin dashboard integration.

**Objective**: Provide a standardized way for all framework components (utils, models, controllers) to report vital statistics, enabling centralized metrics collection, cluster-wide aggregation, and enhanced system monitoring.

**Key Features**:

**Standardized getMetrics() Method**:
- Consistent return structure: `{ component, status, initialized, stats, meta, timestamp }`
- Field-level metadata system (`visualize`, `global`, `sanitize`, `aggregate`) with system defaults
- Opt-out model: fields not explicitly listed inherit all defaults
- Support for nested fields and complex objects

**MetricsRegistry for Dynamic Discovery**:
- Centralized component registration and auto-discovery
- Support for sync and async `getMetrics()` methods
- Components register themselves at initialization time
- No hardcoded component lists required

**Cluster-Wide Aggregation**:
- Automatic aggregation of component stats across multiple instances
- Aggregation types: `sum`, `avg`, `max`, `min`, `first`, `count`, `concat`
- Global fields support for database-backed stats (same across instances)
- Field-level aggregation rules via metadata

**Time-Based Counters** (`webapp/utils/time-based-counters.js`):
- New utility for in-memory event tracking with rolling time windows
- Tracks: last hour, last 24h, and total counts
- Automatic cleanup of old timestamps to prevent memory growth
- Centralized `CounterManager` for cross-component counter management
- Used by EmailController, ViewController, LogController for activity tracking

**Component Metrics Implementations**:
- **PluginManager**: Plugin counts, load order, errors
- **HookManager**: Available hooks, registered handlers
- **SiteControllerRegistry**: Controller counts, scan info
- **ContextExtensions**: Provider counts, cache size
- **CacheManager**: Cache counts, file/directory stats
- **RedisManager**: Connection status, mode, activity
- **EmailController**: Configuration, sent/failed counters (last hour, last 24h, total)
- **HandlebarController**: Configuration, handlebar counts, cache stats
- **ViewController**: Configuration, pages served by extension (css/js/tmpl/shtml), cache stats
- **LogController**: Database-backed stats (entries, docs created/updated/deleted by action and docType)
- **UserController**: User counts by status and role, recent logins
- **WebSocketController**: Connections, messages, namespaces, uptime

**Plugin Integration**:
- `onGetInstanceStats` hook for plugin metrics registration
- Auth-MFA plugin example: user counts, TOTP status, recovery codes
- Static `hooks = {}` pattern for plugin hook registration

**Admin Dashboard Enhancements** (`webapp/view/admin/system-status.shtml`):
- Component Health section with aggregated metrics
- Per-instance component details with full metrics
- Respects `visualize: false` flag to hide internal metrics
- Color-coded status indicators (replacing text badges)
- Uptime formatting for component metrics
- Flattened component display structure for better readability
- Component sorting for consistent display

**Security & Sanitization**:
- Field-level sanitization control via `sanitize: true` metadata
- Non-admin users see sanitized stats (sensitive data obfuscated)
- Admin users see full detailed metrics

**Performance Optimizations**:
- Component-level caching based on `meta.ttl`
- Elapsed time tracking for component metrics collection
- 5-second delay for initial health broadcast to allow component initialization
- Efficient MongoDB aggregation for database-backed stats

**Code Quality**:
- Comprehensive unit tests for TimeBasedCounter and CounterManager
- Unit tests for LogModel.getLogStats() and LogController.getMetrics()
- Integration tests for health API with component metrics
- Removed obsolete `getHealthStatus()` methods (replaced by `getMetrics()`)
- Removed `getMetricsLegacy()` from WebSocketController

**Breaking Changes**:
- `getHealthStatus()` methods removed from all components (replaced by `getMetrics()`)
- `health.componentProviders` removed from `app.conf` (replaced by MetricsRegistry)
- `StatsRegistry` renamed to `MetricsRegistry`
- `UserModel.getMetrics()` renamed to `UserModel.getUserStats()` (W-112 format now in `UserController.getMetrics()`)

**Files Modified**: 30+
- New: `webapp/utils/metrics-registry.js`, `webapp/utils/time-based-counters.js`
- Updated: All component files with `getMetrics()` implementations
- Updated: `webapp/controller/health.js` with aggregation and sanitization
- Updated: `webapp/view/admin/system-status.shtml` with enhanced UI
- Tests: New unit and integration tests for metrics system

**Documentation**:
- `docs/dev/working/W-112-metrics-get-stats-strategy.md` - Complete strategy document
- API reference updates for metrics endpoint
- Plugin development guide with metrics registration examples

**Site Navigation Enhancement**:
- `hideInDropdown` flag added to navigation items (already documented in `docs/site-navigation.md`)
- Allows items to appear in breadcrumbs but not in dropdown/hamburger menu
- Useful for detail pages that require URL parameters

________________________________________________
## v1.3.12, W-111, 2025-12-08

**Commit:** `W-111, v1.3.12: deploy: bug fixes for plugin installations`

**BUG FIX RELEASE**: Fixes critical issues preventing plugin installation on site deployments.

**Objective**: Enable sites to successfully install plugins from npm packages.

**Bug #1: Incorrect jPulse Version Detection** (`bin/plugin-manager-cli.js`):
- **Problem**: `getFrameworkVersion()` was reading the dependency requirement (e.g., `^1.1.0`) from site's `package.json` instead of the actual installed version
- **Symptom**: `Error: Plugin requires jPulse >=1.3.8, current version is 1.1.0` even when 1.3.11 was installed
- **Fix**: Now reads actual version from `node_modules/@jpulse-net/jpulse-framework/package.json`

**Bug #2: bump-version.js Fails for Plugin Projects** (`bin/bump-version.js`):
- **Problem**: Script only looked for `site/webapp/bump-version.conf`, failing in plugin directories
- **Symptom**: `Error: Configuration file not found: site/webapp/bump-version.conf`
- **Fix**: Added plugin context detection (checks for `plugin.json`), uses `webapp/bump-version.conf` when in plugin directory
- Updated error messages and instructions for plugin context

**Documentation Updates** (`docs/plugins/creating-plugins.md`):
- Added "Version Management" section
- Documents `webapp/bump-version.conf` location for plugins
- Shows `node ../../bin/bump-version.js 1.0.0` usage (not `npx jpulse`)
- References `auth-mfa` plugin as working example

**Code Changes**:
- `bin/plugin-manager-cli.js`: Fixed `getFrameworkVersion()` to read from node_modules
- `bin/bump-version.js`: Added `detectContext()` plugin detection, updated `findBumpConfig()`
- `docs/plugins/creating-plugins.md`: Added version management documentation

**Files Modified**: 3
- 2 CLI scripts: plugin-manager-cli.js, bump-version.js
- 1 documentation: creating-plugins.md

**Breaking Changes**: None

________________________________________________
## v1.3.11, W-110, 2025-12-08

**Commit:** `W-110, v1.3.11: view: jPulse.url.redirect with toast messages queue`

**FEATURE RELEASE**: Generic mechanism for queuing toast messages to display after page redirect.

**Objective**: Provide a clean, reusable way to show toast messages after page navigation, with plugin-defined styling and no hard-coded plugin checks in core.

**Implementation**:

**jPulse.url.redirect(url, options)** (`webapp/view/jpulse-common.js`):
- `options.delay`: ms to wait before redirect (default: 0)
- `options.toasts`: array of toast objects to show after redirect
- Stores toasts in `jpulse_toast_queue` sessionStorage
- External URLs: clears toast queue (no orphaned messages)

**jPulse.url.isInternal(url)** (`webapp/view/jpulse-common.js`):
- Checks if URL is same origin
- Relative URLs (`/path`, `page.html`, `#anchor`) → internal
- Absolute URLs → compare origin with `window.location.origin`

**Toast API Enhanced** (`webapp/view/jpulse-common.js`):
- `jPulse.UI.toast.show()` accepts options object: `{ duration, link, linkText }`
- Link rendered as underlined, bold text within toast
- Error toasts default to 8 seconds (was 5 seconds)
- All shorthand methods (error, success, info, warning) accept options

**Toast Queue Processing** (`webapp/view/jpulse-common.js`):
- Reads `jpulse_toast_queue` from sessionStorage on page load
- Displays each toast with plugin-defined `toastType`
- No hard-coded plugin checks (plugins define styling via `toastType`)

**Login Page Updated** (`webapp/view/auth/login.shtml`):
- Uses `jPulse.url.redirect()` for login success
- Instant redirect (no 1 second delay)
- Success toast shown on target page (deferred)

**MFA Plugin Updated** (`plugins/auth-mfa/webapp/controller/mfaAuth.js`):
- MFA warnings define `toastType: 'error'`
- Optional nag for "MFA optional" policy

**Toast Object Format**:
```javascript
{
    toastType: 'error',     // error, warning, info, success
    message: 'Message',     // Required
    link: '/path',          // Optional
    linkText: 'Click here', // Optional (default: 'Learn more')
    duration: 10000         // Optional (uses defaults: error=8s, others=5s)
}
```

**Usage Example**:
```javascript
jPulse.url.redirect('/dashboard', {
    delay: 500,
    toasts: [
        { toastType: 'success', message: 'Changes saved!' },
        { toastType: 'error', message: 'Enable 2FA!', link: '/mfa', linkText: 'Set up' }
    ]
});
```

**Code Changes**:
- `webapp/view/jpulse-common.js`: redirect(), isInternal(), toast enhancements
- `webapp/view/auth/login.shtml`: Uses redirect() with deferred toast
- `plugins/auth-mfa/webapp/controller/mfaAuth.js`: toastType in warnings

**Bug Fix**:
- Fixed toast auto-hide not working when options object passed without duration
- Root cause: `undefined !== null` check failure
- Fix: `options.duration ?? null` to convert undefined to null

**Files Modified**: 3
- 1 framework view: jpulse-common.js
- 1 auth view: login.shtml
- 1 plugin: mfaAuth.js

**Breaking Changes**: None
- New opt-in utilities
- Existing toast API unchanged (backward compatible)

________________________________________________
## v1.3.10, W-109, 2025-12-08

**Commit:** `W-109, v1.3.10: auth: multi-step login flow with hook simplification`

**FEATURE RELEASE**: Flexible hook-based multi-step authentication framework supporting MFA, email verification, OAuth2, LDAP, and extensible plugins.

**Objective**: Create a server-controlled, plugin-extensible authentication flow that handles multi-step login (credentials + MFA + verification) with both blocking steps and non-blocking warnings.

**Implementation**:

**Phase 8: Hook Simplification** (24 hooks → 12):
- Consolidated redundant hooks into intuitive `onBucketAction` naming convention
- Auth hooks (7): `onAuthBeforeLogin`, `onAuthBeforeSession`, `onAuthAfterLogin`, `onAuthFailure`, `onAuthGetSteps`, `onAuthValidateStep`, `onAuthGetWarnings`
- User hooks (5): `onUserBeforeSave`, `onUserAfterSave`, `onUserBeforeDelete`, `onUserAfterDelete`, `onUserSyncProfile`
- Cleaner API that follows "don't make me think" philosophy

**Multi-Step Login Flow** (`webapp/controller/auth.js`):
- Single `POST /api/1/auth/login` endpoint handles all steps
- Server maintains `completedSteps` in pending auth session (never exposed to client)
- `onAuthGetSteps`: Plugins return blocking steps required for user
- `onAuthValidateStep`: Plugins validate step-specific data
- `onAuthGetWarnings`: Plugins return non-blocking warnings (nag messages)
- Response includes `nextStep` field when more steps required

**MFA Policy Enforcement** (`webapp/view/auth/login.shtml`):
- Detects `mfa-not-enabled` warning in login response
- Auto-redirects to MFA setup page when policy requires MFA
- Stores warnings in `sessionStorage` for cross-page display

**Login Warnings Display** (`webapp/view/jpulse-common.js`):
- Global handler reads `sessionStorage.jpulse_login_warnings`
- Displays toast notifications on any page after login redirect
- Extended duration (8s) for MFA-related warnings

**Code Changes**:

*Framework Core:*
- `webapp/utils/hook-manager.js`: 12 simplified hooks
- `webapp/controller/auth.js`: Multi-step login with new hooks
- `webapp/controller/user.js`: Consolidated user hooks
- `webapp/model/user.js`: Updated hook calls
- `webapp/view/auth/login.shtml`: MFA redirect, warning storage
- `webapp/view/jpulse-common.js`: Login warning display

*Plugins Updated:*
- `plugins/auth-mfa/webapp/controller/mfaAuth.js`: New hook names
- `plugins/hello-world/webapp/controller/helloPlugin.js`: New hook names

**Documentation**:
- `docs/plugins/plugin-hooks.md`: Complete rewrite with new hook names
- `docs/plugins/creating-plugins.md`: Added Step 5 for hooks
- `docs/plugins/plugin-architecture.md`: Added hook registration in lifecycle
- `docs/api-reference.md`: Added plugin-added endpoints section

**Test Coverage**:
- `webapp/tests/unit/utils/hook-manager.test.js`: Updated for new hooks
- 924 unit tests passing

**Files Modified**: 14
- 6 framework core: hook-manager.js, auth.js, user.js, model/user.js, login.shtml, jpulse-common.js
- 2 plugins: mfaAuth.js, helloPlugin.js
- 5 documentation: plugin-hooks.md, creating-plugins.md, plugin-architecture.md, api-reference.md, work-items.md
- 1 test: hook-manager.test.js

**Breaking Changes**: None for applications
- Plugin developers need to update hook names from old format to new `onBucketAction` naming

________________________________________________
## v1.3.9, W-107, 2025-12-07

**Commit:** `W-107, v1.3.9: users: data-driven user profile extensions for plugins`

**FEATURE RELEASE**: Enable plugins to extend admin and user profile pages with data-driven cards that display plugin-specific user data and actions.

**Objective**: Provide a standardized way for plugins to display their user data in profile pages without creating separate management pages.

**Implementation**:

**UserModel Schema Extensions** (`webapp/model/user.js`, +47 lines):
- Enhanced `extendSchema()` to accept `_meta` block with `adminCard`/`userCard` configuration
- Added `schemaExtensionsMetadata` storage for card rendering metadata
- Added `getSchemaExtensionsMetadata()` method for API access

**User Controller Enhancements** (`webapp/controller/user.js`, +46 lines):
- Added `?includeSchema=1` query parameter to return schema extensions metadata
- Added username fallback for `:id` parameter (falls back if not valid ObjectId)
- Response includes `schema` object when `includeSchema=1`

**Admin Profile View** (`webapp/view/admin/user-profile.shtml`, +404 lines):
- `renderPluginCards()` function for data-driven card rendering from `adminCard` config
- Card fields rendered based on `visible`, `readOnly`, `displayAs` attributes
- `showIf` condition evaluation (hasValue, equals, exists, gt, all)
- Action button handling: `setFields`, `navigate`, `handler` types
- Plugin config loading for `config:` showIf conditions

**User Profile View** (`webapp/view/user/profile.shtml`, +402 lines):
- Same plugin card rendering using `userCard` config
- User-appropriate actions and field visibility

**Schema Extension Format**:
```javascript
UserModel.extendSchema({
    mfa: {
        _meta: {
            plugin: 'auth-mfa',
            adminCard: { visible: true, label: 'MFA Settings', icon: '🔐', order: 100, actions: [...] },
            userCard: { visible: true, label: 'Two-Factor Auth', icon: '🔐', order: 10, actions: [...] }
        },
        enabled: { type: 'boolean', label: 'Status', displayAs: 'badge', adminCard: { visible: true } },
        enrolledAt: { type: 'date', label: 'Enrolled', displayAs: 'date', showIf: 'hasValue' }
    }
});
```

**Action Types**:
- `setFields`: Modify form data locally, user saves to persist
- `navigate`: Redirect to another page (with unsaved changes warning)
- `handler`: Call custom `jPulse.schemaHandlers['plugin.method']` function

**Code Changes**:
- `webapp/model/user.js`: Schema extension metadata storage
- `webapp/controller/user.js`: `?includeSchema=1`, username fallback
- `webapp/view/admin/user-profile.shtml`: Plugin card rendering
- `webapp/view/user/profile.shtml`: Plugin card rendering

**Documentation**:
- `docs/api-reference.md`: `?includeSchema=1` parameter, username fallback
- `docs/plugins/plugin-api-reference.md`: Full schema extension format

**Test Coverage**:
- 72 existing user tests pass

**Files Modified**: 6
- 2 model/controller: user.js (model), user.js (controller)
- 2 views: user-profile.shtml, profile.shtml
- 2 documentation: api-reference.md, plugin-api-reference.md

**Breaking Changes**: None
- New opt-in feature for plugins
- Existing schema extensions continue to work

________________________________________________
## v1.3.8, W-106, 2025-12-07

**Commit:** `W-106, v1.3.8: plugins: CLI management to install, enable, list plugins`

**FEATURE RELEASE**: Complete command-line interface for plugin management enabling developers and site administrators to install, remove, enable, disable, and list plugins from the command line.

**Objective**: Add plugin management commands to the jPulse CLI (`npx jpulse plugin ...`) establishing the foundation for plugin distribution via npm.

**Implementation**:

**Plugin Manager CLI** (`bin/plugin-manager-cli.js`, NEW, ~1500 lines):
- `list [--all] [--json]` - List installed plugins with status and version
- `info <name>` - Show detailed plugin information including config schema
- `install <source>` - Install plugin from npm, git, or local path
- `update [name]` - Update plugin(s) to latest version
- `remove <name>` - Remove an installed plugin
- `enable <name>` - Enable a disabled plugin
- `disable <name>` - Disable an enabled plugin
- `publish <name>` - Publish plugin to npm registry with version sync

**Key Features**:
- Shorthand package names: `auth-mfa` → `@jpulse-net/plugin-auth-mfa`
- Two-step install process: npm fetch to node_modules → sync to plugins/
- Version synchronization between plugin.json and package.json on publish
- Air-gapped/private registry support via npm configuration
- Colored console output with formatted tables
- Complements existing Admin UI at `/admin/plugins`

**Code Changes**:
- `bin/plugin-manager-cli.js`: NEW file with complete CLI implementation
- `bin/jpulse-framework.js`: Added `plugin` command routing
- `docs/plugins/managing-plugins.md`: Updated with CLI documentation
- `docs/plugins/publishing-plugins.md`: Updated with publish workflow

**Documentation**:
- `docs/plugins/managing-plugins.md`: Complete CLI command reference with examples
- `docs/plugins/publishing-plugins.md`: npm publish workflow and configuration
- `docs/dev/working/W-106-plugin-cli-management.md`: Working document with full specification

**Files Modified**: 4
- 2 bin files: jpulse-framework.js, plugin-manager-cli.js (new)
- 2 documentation: managing-plugins.md, publishing-plugins.md

**Breaking Changes**: None
- New opt-in CLI commands
- Admin UI continues to work as before

________________________________________________
## v1.3.7, W-080, 2025-12-04

**Commit:** `W-080, v1.3.7: controller: search API with cursor-based pagination`

**FEATURE RELEASE**: Efficient cursor-based pagination for search APIs with stateless cursors, client-side pagination helper, and optimized user statistics endpoint.

**Objective**: Implement paged queries that do not miss or duplicate documents between calls, with better performance for large datasets.

**Implementation**:

**Cursor-Based Pagination** (`webapp/utils/common.js`, ~200 lines added):
- `paginatedSearch()` - Public entry point supporting both cursor and offset modes
- Cursor mode (default): Stateless Base64-encoded JSON with query, sort, limit, total, lastValues
- Offset mode (opt-in): Traditional skip/limit when `offset` param present
- Sort always includes `_id` tiebreaker for unique, consistent ordering
- Total count cached in cursor (countDocuments only on first request)
- `limit+1` fetch pattern for efficient hasMore detection
- Response includes `nextCursor` and `prevCursor` for bidirectional navigation
- Type conversion for Date and ObjectId values in cursor restoration

**Private Helper Functions**:
- `_paginatedOffsetSearch()` - Offset-based pagination implementation
- `_paginatedCursorSearch()` - Cursor-based pagination implementation
- `_encodePaginationCursor()` - Base64 encode cursor state
- `_decodePaginationCursor()` - Decode and validate cursor
- `_buildPaginationCursorRangeQuery()` - Build $or range query for cursor position
- `_normalizePaginationSort()` - Parse sort string with _id tiebreaker
- `_extractSortValues()` - Extract values from last document for cursor
- `_convertCursorValue()` - Restore Date/ObjectId types from cursor strings

**Client-Side Pagination Helper** (`webapp/view/jpulse-common.js`):
- `jPulse.UI.pagination.createState()` - Create clean pagination state object
- `jPulse.UI.pagination.resetState()` - Reset state to initial values
- `jPulse.UI.pagination.updateState()` - Update state from API response
- `jPulse.UI.pagination.formatRange()` - Format "Showing X-Y of Z" string
- `jPulse.UI.pagination.updateButtons()` - Update prev/next button disabled states
- `jPulse.UI.pagination.setupButtons()` - Wire up button event listeners

**User Statistics Endpoint** (`/api/1/user/stats`):
- Efficient MongoDB aggregation using `$facet` for parallel pipelines
- Returns: total, byStatus, byRole, admins count, recentLogins (24h/7d/30d)
- Replaces expensive client-side calculation that fetched all users

**Code Changes**:
- `webapp/utils/common.js`: Added pagination utilities (~200 lines)
- `webapp/model/user.js`: Updated search() to use CommonUtils.paginatedSearch(), added getStats()
- `webapp/model/log.js`: Updated search() to use CommonUtils.paginatedSearch()
- `webapp/controller/user.js`: Added stats() endpoint handler
- `webapp/routes.js`: Added GET /api/1/user/stats route
- `webapp/view/jpulse-common.js`: Added jPulse.UI.pagination helper
- `webapp/view/admin/users.shtml`: Cursor pagination, results-per-page selector, stats endpoint
- `webapp/view/admin/logs.shtml`: Cursor pagination, results-per-page selector
- `webapp/translations/en.conf`, `de.conf`: Added pagination i18n strings

**Test Coverage**:
- `webapp/tests/unit/utils/common-pagination.test.js` (NEW, 441 lines):
  * 37 tests covering all pagination utilities
  * Tests for normalization, encoding/decoding, range queries, type conversion

**Documentation**:
- `docs/api-reference.md`: Documented cursor and offset pagination modes
- `docs/jpulse-ui-reference.md`: Documented jPulse.UI.pagination helper

**API Changes**:
- Parameters: `limit`, `offset`, `sort`, `cursor` (removed: `skip`, `page`)
- Response includes `pagination` object with `mode`, `total`, `limit`, `hasMore`, `nextCursor`, `prevCursor`

**Breaking Changes**: None
- Cursor mode is default but offset mode works when `offset` param present
- Existing API calls continue to work unchanged

________________________________________________
## v1.3.6, W-105, 2025-12-03

**Commit:** `W-105, v1.3.6: plugins: add plugin hooks for authentication and user management`

**FEATURE RELEASE**: Comprehensive plugin hook system enabling third-party authentication providers (OAuth2, LDAP, MFA) and user lifecycle extensions with auto-registration and priority-based execution.

**Objective**: Create the base infrastructure for authentication plugins by providing hook points throughout the login, logout, signup, and user persistence flows.

**Implementation**:

**HookManager Utility** (`webapp/utils/hook-manager.js`, NEW, 405 lines):
- Central registry for 24 hooks: 13 authentication + 11 user lifecycle
- Methods: `register()`, `execute()`, `executeWithCancel()`, `executeFirst()`
- Methods: `unregister()`, `hasHandlers()`, `getRegisteredHooks()`
- Methods: `getAvailableHooks()`, `getHooksByNamespace()`, `isValidHook()`, `getStats()`, `clear()`
- Priority-based execution order (lower = earlier, default 100)
- Context modification: handlers receive context, modify it, return it
- Cancellation support: return `false` to cancel operation
- Error isolation: handler errors logged but don't break flow

**Auto-Registration System**:
- Plugins declare hooks in static `hooks` object on controllers
- Format: `static hooks = { hookName: { handler?, priority? } }`
- Default: method name = hook name, priority = 100
- PluginManager scans controllers during bootstrap and registers hooks
- No manual registration required - "don't make me think" principle

**Hook Naming Convention**:
- CamelCase with Hook suffix: `authBeforeLoginHook`, `userAfterCreateHook`
- Namespace prefix: `auth*` for authentication, `user*` for user lifecycle
- Self-documenting: method names match hook names

**Authentication Hooks (13)**:
- Login flow: `authBeforeLoginHook` (external auth), `authGetProviderHook`, `authAfterPasswordValidationHook` (MFA check), `authBeforeSessionCreateHook` (session data), `authAfterLoginSuccessHook`, `authOnLoginFailureHook`
- Logout flow: `authBeforeLogoutHook`, `authAfterLogoutHook`
- MFA: `authRequireMfaHook`, `authOnMfaChallengeHook`, `authValidateMfaHook`, `authOnMfaSuccessHook`, `authOnMfaFailureHook`

**User Lifecycle Hooks (11)**:
- Signup flow: `userBeforeSignupHook`, `userAfterSignupValidationHook` (can cancel), `userBeforeCreateHook`, `userAfterCreateHook`, `userOnSignupCompleteHook` (async)
- Persistence: `userBeforeSaveHook`, `userAfterSaveHook`, `userBeforeDeleteHook` (can cancel), `userAfterDeleteHook`
- Profile sync: `userMapExternalProfileHook`, `userSyncExternalProfileHook`

**Dynamic Content Generators**:
- `plugins-hooks-list`: Bullet list of available hooks
- `plugins-hooks-list-table`: Markdown table with description, context, modify/cancel flags
- `plugins-hooks-count`: Count of hooks with optional namespace filter

**Code Changes**:
- `webapp/utils/hook-manager.js` (NEW): HookManager class with full hook registry
- `webapp/utils/bootstrap.js`: Added HookManager initialization (Step 4.5)
- `webapp/utils/plugin-manager.js`: Added `registerPluginHooks()`, `_registerControllerHooks()`, `unregisterPluginHooks()`
- `webapp/controller/auth.js`: Added 8 hook calls in login/logout flow
- `webapp/controller/user.js`: Added 5 hook calls in signup flow
- `webapp/model/user.js`: Added 4 hook calls in create/updateById
- `webapp/controller/markdown.js`: Added 3 dynamic content generators
- `webapp/translations/en.conf`, `de.conf`: Added `mfaRequired` translation
- `plugins/hello-world/webapp/controller/helloPlugin.js`: Added example hooks

**Test Coverage**:
- `webapp/tests/unit/utils/hook-manager.test.js` (NEW, 313 lines):
  * 26 tests covering registration, execution, cancellation, priority ordering
  * Tests for `executeFirst()`, `unregister()`, `getStats()`, namespace filtering
- `webapp/tests/unit/controller/auth-controller.test.js`:
  * Updated logout tests for async hook execution
  * Added `HookManager.clear()` in beforeEach for test isolation

**Documentation**:
- `docs/plugins/plugin-hooks.md` (NEW, 337 lines):
  * Comprehensive developer guide for using hooks
  * Quick start with declaration and handler examples
  * Common use cases: OAuth2, LDAP, MFA, email confirmation, audit logging
  * Debugging tips and best practices
- Updated `docs/plugins/README.md`: Added to Quick Start list and Key Features
- Updated `docs/plugins/creating-plugins.md`: Added to Next Steps
- Updated `docs/plugins/plugin-api-reference.md`: Added to See Also
- Updated `docs/plugins/plugin-architecture.md`: Added to System Overview and See Also

**Usage Examples**:

Plugin Hook Declaration:
```javascript
class MyAuthController {
    static hooks = {
        authBeforeLoginHook: { priority: 50 },
        authAfterLoginSuccessHook: {}
    };

    static async authBeforeLoginHook(context) {
        // External auth (LDAP, OAuth2)
        if (await this.isExternalUser(context.identifier)) {
            context.skipPasswordCheck = true;
            context.user = await this.authenticateExternal(context);
            context.authMethod = 'ldap';
        }
        return context;
    }
}
```

Dynamic Content in Markdown:
```markdown
## Available Hooks
%DYNAMIC{plugins-hooks-list-table namespace=auth}%
```

**Files Modified**: 15
- 1 new utility: hook-manager.js
- 4 controllers: auth.js, user.js, markdown.js + bootstrap.js
- 1 model: user.js
- 1 plugin-manager: plugin-manager.js
- 2 translations: en.conf, de.conf
- 1 plugin: hello-world/helloPlugin.js
- 2 tests: hook-manager.test.js (new), auth-controller.test.js
- 5 documentation: plugin-hooks.md (new), 4 updated

**Breaking Changes**: None
- New opt-in feature for plugin developers
- Existing plugins work unchanged
- Framework behavior unchanged unless plugins register hooks

________________________________________________
## v1.3.5, W-104, 2025-12-03

**Commit:** `W-104, v1.3.5: markdown: handle dynamic content tokens`

**FEATURE RELEASE**: Introduced dynamic content tokens for markdown documentation with secure generator registry, client-side docs viewer API, and comprehensive configuration options.

**Objective**: Enable server-generated content in markdown documentation using `%DYNAMIC{}%` tokens, providing flexible, secure, and cacheable dynamic content injection.

**Implementation**:

**Dynamic Content Token System**:
- **Syntax**: `%DYNAMIC{generator-name key="value" another="value"}%`
  * Generator names in kebab-case (plugins-list-table, plugins-count)
  * Optional key="value" parameters
  * Automatic type coercion: "50" → number, "true" → boolean
- **Security**: Whitelist-based generator registry
  * Only registered generators can be called from markdown
  * Unknown generators produce error message (not exception)
- **Caching**: Post-cache processing
  * Content loaded from file cache
  * Dynamic tokens processed after retrieval (always fresh)
- **Escaping**: Backtick prefix prevents processing
  * `` `%DYNAMIC{example}%` `` displays literally (for documentation)

**Built-in Generators**:
- `plugins-list-table`: Markdown table (icon, name, version, status, description)
- `plugins-list`: Bullet list format with icons
- `plugins-count`: Count with optional status filter
- `dynamic-generator-list`: Self-documenting list of all generators

**jPulse.UI.docs API**:
- `init(options)`: Initialize documentation viewer
  * `navElement`: Selector for navigation container (required)
  * `contentElement`: Selector for content container (required)
  * `namespace`: Auto-detected from URL if omitted
  * `registerWithSiteNav`: Add to site nav dropdown
  * `siteNavKey`: Key for site nav registration
  * `flattenTopLevel`: Remove root folder wrapper
- `getViewer()`: Get active viewer instance
- `convertFilesToPages(files)`: Convert markdown files to nav structure

**SPA Detection Enhancement**:
- Added `jPulse.UI.docs.init` as automatic SPA trigger
- Pages using docs API detected as SPAs for proper routing

**Title Case Fix Configuration**:
- `app.conf` → `controller.markdown.titleCaseFix`
- Default fixes: Api→API, Html→HTML, Css→CSS, Jpulse→jPulse, etc.
- Site override via deep merge (add/override individual entries)

**Code Changes**:
- `webapp/controller/markdown.js`:
  * Added `DYNAMIC_CONTENT_REGISTRY` with generator metadata
  * Added `_parseDynamicToken()` for parsing name and parameters
  * Added `_processDynamicContent()` async token processor
  * Added `_generatePluginsTable()`, `_generatePluginsList()`, `_generateGeneratorList()`
  * Modified `_getMarkdownFile()` to be async with dynamic processing
- `webapp/controller/view.js`:
  * Added `jPulse.UI.docs.init` to SPA detection triggers
- `webapp/view/jpulse-common.js`:
  * Added `jPulse.UI.docs` namespace (~300 lines)
  * Moved `convertMarkdownFilesToPages` from navigation.helpers
- `webapp/view/jpulse-docs/index.shtml`:
  * Refactored to use `jPulse.UI.docs.init()` API

**Test Coverage**:
- `webapp/tests/unit/controller/markdown.test.js`:
  * 20 new tests for dynamic content (all passing)
  * 10 tests for token parsing (name, params, type coercion)
  * 7 tests for content processing (escaping, errors, generators)
  * 3 tests for registry verification
- `webapp/tests/unit/utils/jpulse-ui-navigation.test.js`:
  * Updated 2 tests for new API location

**Documentation**:
- `docs/markdown-docs.md` (NEW - 580 lines):
  * Complete guide for markdown documentation infrastructure
  * Quick start for creating documentation namespaces
  * Dynamic content tokens with syntax and examples
  * jPulse.UI.docs API reference
  * Title case fix configuration and overrides
  * Symlink approach for accessible docs directories
  * Linking best practices (GitHub compatibility)
- Updated links in `docs/README.md`, `docs/site-customization.md`, `docs/plugins/creating-plugins.md`
- `docs/installed-plugins/README.md` now uses `%DYNAMIC{plugins-list-table}%`

**Usage Examples**:
```markdown
# Installed Plugins

`%DYNAMIC{plugins-list-table}%`

We have %DYNAMIC{plugins-count}% plugins installed.

## Available Generators

`%DYNAMIC{dynamic-generator-list}%`
```

**Benefits**:
1. **Flexibility**: Dynamic content without rebuilding docs
2. **Security**: Whitelist prevents arbitrary code execution
3. **Performance**: Cache-friendly with post-cache processing
4. **Maintainability**: Self-documenting generator list
5. **Developer Experience**: Simple API for docs viewers

**Files Modified**: 11 files
- 2 controllers: markdown.js, view.js
- 1 client library: jpulse-common.js
- 1 view: jpulse-docs/index.shtml
- 2 test files: markdown.test.js, jpulse-ui-navigation.test.js
- 5 documentation: markdown-docs.md (new), README.md, site-customization.md, creating-plugins.md, installed-plugins/README.md

**Breaking Changes**: None
- New opt-in features
- Existing markdown unchanged
- API additions only

________________________________________________
## v1.3.4, W-103, 2025-12-02

**Commit:** `W-103, v1.3.4: handlebars: custom variables with {{let}}, {{#let}}, and {{#with}}`

**FEATURE RELEASE**: Introduced custom template variables with safe `vars` namespace, block-scoped variables for scope isolation, and context switching for cleaner nested access.

**Objective**: Enable template authors to define custom variables safely without polluting the main context, providing flexible variable scoping and intuitive context switching.

**Implementation**:

**Custom Variables System**:
- **Inline variables**: `{{let key="value" count=10 active=true}}`
  * Defines template-scoped variables in `vars` namespace
  * Supports strings, numbers, booleans
  * Nested properties: `{{let config.theme="dark" api.v2.endpoint="/api/v2"}}`
  * Access: `{{vars.key}}`, `{{vars.config.theme}}`
- **Block-scoped variables**: `{{#let key="value"}}...{{/let}}`
  * Variables only exist within block (scope isolation)
  * Inherits parent scope vars
  * Prevents variable pollution in loops
  * Nested blocks with proper scope stacking
- **Context switching**: `{{#with object}}...{{/with}}`
  * Standard Handlebars context switching
  * Cleaner nested property access: `{{#with user}} {{firstName}} {{/with}}`
  * Can be combined with custom variables

**Code Changes**:
- `webapp/controller/handlebar.js`:
  * Added `vars: {}` to context initialization in `_buildInternalContext()`
  * Added `_handleLet()` for inline `{{let}}` helper (~20 lines)
  * Added `_handleLetBlock()` for block-scoped `{{#let}}` helper (~25 lines)
  * Added `_handleWithBlock()` for `{{#with}}` context switching (~20 lines)
  * Enhanced `_parseArguments()` to handle `{{let}}` syntax
  * Added `_setNestedProperty()` utility for nested property setting

**Test Coverage**:
- `webapp/tests/unit/controller/handlebar-variables.test.js` (362 lines, new file):
  * 33 comprehensive unit tests (all passing)
  * 10 tests for inline `{{let}}`
  * 5 tests for `{{#with}}` context switching
  * 7 tests for `{{#let}}` block scope
  * 4 tests for combined usage
  * 5 tests for edge cases
  * 2 tests for namespace isolation

**Documentation Updates (4 files)**:
- `docs/handlebars.md`:
  * Added "Custom Variables" section (~170 lines)
  * Documented `{{let}}`, `{{#let}}`, `{{#with}}` with examples
  * Explained `vars` namespace and safety benefits
  * Added best practices section
- `docs/template-reference.md`:
  * Added "Custom Variables" section (~40 lines)
  * Updated file hierarchy to show site/ first
  * Converted HTML comments to Handlebars comments throughout
- `docs/front-end-development.md`:
  * Added `vars` and `components` to available server context
  * Added "Dynamic Dashboard with Custom Variables" example
  * Updated key features list
- `webapp/view/jpulse-examples/handlebars.shtml`:
  * Added "Custom Variables with {{let}}" section with live examples
  * Added "Context Switching with {{#with}}" section
  * Added "Block-Scoped Variables with {{#let}}" section
  * All examples include source code display

**Usage Examples**:
```handlebars
{{!-- Template-scoped variables --}}
{{let pageTitle="Dashboard" maxItems=10 showFooter=true}}
<title>{{vars.pageTitle}}</title>

{{!-- Block-scoped variables (prevent pollution) --}}
{{#each items}}
    {{#let rowClass="active" index=@index}}
        <li class="{{vars.rowClass}}">Item {{vars.index}}: {{this}}</li>
    {{/let}}
{{/each}}

{{!-- Context switching --}}
{{#with user}}
    <p>Welcome, {{firstName}} {{lastName}}!</p>
{{/with}}

{{!-- Combined usage --}}
{{let greeting="Hello"}}
{{#with user}}
    <p>{{vars.greeting}}, {{firstName}}!</p>
{{/with}}
```

**Test Results**: 33/33 tests passing
- All inline variable tests passing
- All block scope tests passing
- All context switching tests passing
- All edge case tests passing
- No linter errors

**Benefits**:
- **Safety**: Cannot override system variables (user, app, config, etc.)
- **Clarity**: `{{vars.myVar}}` self-documents custom variables
- **Flexibility**: Choose template-scoped or block-scoped as needed
- **Clean Code**: Scope isolation prevents variable pollution in loops
- **Intuitive**: Standard Handlebars `{{#with}}` for context switching
- **Maintainability**: Easy to debug with clear namespace separation

**Tech Debt Deferred**:
- TD-002: Expression support (e.g., `{{let total=(price * quantity)}}`)
- TD-003: JSON string auto-parsing

________________________________________________
## v1.3.3, W-102, 2025-12-01

**Commit:** `W-102, v1.3.3: handlebars: unified component system for reusable content blocks`

**FEATURE RELEASE**: Replaced extract:start/end markers with intuitive `{{#component}}` syntax, unified component system with context variables, and comprehensive dashboard migration.

**Objective**: Replace unintuitive extract:start/end markers with clean Handlebars component syntax for better developer experience and framework consistency.

**Implementation**:

**New Component System**:
- **file.includeComponents helper**: `{{file.includeComponents "glob" component="namespace.*" sortBy="method"}}`
  * Silently registers components from multiple files
  * Pattern filtering: `component="adminCards.*"` loads specific namespace
  * Flexible sorting: component-order (default), plugin-order, filename, filesystem
  * Memory-efficient: only loads filtered components
- **Components as context variables**: `{{components.namespace.name}}`
  * Accessed like `{{user.*}}` or `{{siteConfig.*}}`
  * Follows "don't make me think" philosophy
  * Available in `{{#each components.namespace}}` loops
- **Enhanced component calls**: `{{components.jpIcons.configSvg size="64"}}`
  * Parameter expansion with default + provided values
  * Circular reference detection
  * Error messages: `<!-- Error: Component "name" not found -->`
  * `_inline` parameter for JavaScript embedding

**Code Changes**:
- `webapp/controller/handlebar.js`:
  * Added `_handleFileIncludeComponents()` function (90 lines)
  * Added `_handleComponentCall()` with error handling, circular detection, _inline support
  * Added helpers: `_parseComponentBlocks()`, `_matchesComponentPattern()`, `_sortComponents()`, `_extractPluginName()`, `_getPluginLoadOrder()`, `_setNestedProperty()`
  * Fixed component expansion to always use `_handleComponentCall()` for `{{components.*}}`
  * Added immediate context registration in `_handleComponentDefinition()`
  * Removed deprecated extract code (~210 lines): `_handleFileExtract()`, `_extractOrderFromMarkers()`, `_extractFromRegex()`, `_extractFromCSSSelector()`
  * Simplified `_handleBlockEach()` - removed extract-order sorting logic

**View Migrations (24 files)**:
- Framework admin dashboards (8 files): admin/index.shtml + 7 admin cards
- Framework example dashboards (5 files): jpulse-examples/index.shtml + 4 example cards
- Framework plugin dashboard (3 files): jpulse-plugins/index.shtml + 2 plugin files
- Site hello demos (7 files): site/webapp/view/hello/*.shtml
- Plugin views (1 file): plugins/hello-world/webapp/view/hello-plugin/index.shtml

**Migration Pattern**:
```handlebars
<!-- Old syntax -->
<div style="display: none;">
    <!-- extract:start order=10 -->
    <a href="/admin/config.shtml" class="jp-card-dashboard">
        <h3>Configuration</h3>
    </a>
    <!-- extract:end -->
</div>
{{#each file.list "admin/*.shtml" sortBy="extract-order"}}
    {{file.extract this}}
{{/each}}

<!-- New syntax -->
{{#component "adminCards.config" order=10}}
    {{!-- This card is automatically included in the admin dashboard --}}
    <a href="/admin/config.shtml" class="jp-card-dashboard">
        <h3>Configuration</h3>
    </a>
{{/component}}
{{file.includeComponents "admin/*.shtml" component="adminCards.*"}}
{{#each components.adminCards}}
    {{this}}
{{/each}}
```

**Documentation Updates (4 files)**:
- `docs/handlebars.md`:
  * Removed "File Extraction" section (~75 lines)
  * Added "Include Components from Files" section
  * Documented all parameters, sort methods, pattern filtering
- `docs/template-reference.md`:
  * Replaced "File Listing and Extraction" with "File Listing and Component Inclusion"
  * Updated caching section references
- `docs/plugins/creating-plugins.md`:
  * Updated plugin dashboard card example to use `{{#component}}` syntax
- `docs/genai-instructions.md`:
  * Added comprehensive plugin system documentation
  * Updated directory layout, file resolution priority
  * Added plugin development guidelines

**Test Results**: 919 passed, 0 failed, 16 skipped (942 total)
- 813 unit tests (including 7 component system tests)
- 100 integration tests
- CLI validation tests
- MongoDB cross-platform tests

**Benefits**:
- "Don't make me think" syntax matching framework patterns (`{{components.*}}` like `{{user.*}}`)
- Clean Handlebars with proper editor highlighting
- No more `<div style="display: none;">` wrappers
- Explicit sorting control (plugin-order, component-order, filename)
- Memory-efficient pattern filtering
- Better error messages and debugging
- Framework consistency across all component usage

**Files Modified**: 32 files (1 controller, 24 views, 4 documentation, 3 work items)

**Breaking Changes**: None - extract system fully removed after complete migration. New system is the only way forward.

________________________________________________
## v1.3.2, W-101, 2025-11-30

**Commit:** `W-101, v1.3.2: architecture: additional bug fixes for W-045 plugin infrastructure`

**PATCH RELEASE**: Four critical bug fixes discovered during v1.3.1 production deployment on bubblemap.net.

**Objective**: Fix plugin update synchronization, eliminate UX confusion, enable context-aware symlink management, and provide accurate real-time plugin state in admin UI.

**Implementation**:

**Bug #1: Update Script Missing Plugin Sync**:
- **Issue**: `npx jpulse update` synced `webapp/` and `docs/` but not `plugins/hello-world/`
- **Impact**: Production sites showed stale plugin versions after framework updates (v1.2.6 instead of v1.3.1)
- **Discovery**: bubblemap.net production site had outdated plugin after v1.3.1 update
- **Root Cause**: Update script forgot to sync plugin directory from framework package

**Solution**:
- Added plugin sync section to `bin/jpulse-update.js` after documentation sync (line 262)
- Ensures `plugins/` directory exists
- Removes existing `plugins/hello-world/` directory
- Copies fresh plugin from `node_modules/@jpulse-net/jpulse-framework/plugins/hello-world/`
- Logs success/warning messages

**Bug #2: Confusing "enabled" Config Field**:
- **Issue**: "Enable Plugin" checkbox in `/admin/plugin-config.shtml` didn't actually enable/disable plugin
- **Impact**: User confusion - two different "enable" mechanisms (framework-level vs config-level)
- **Root Cause**: hello-world plugin had redundant `enabled` config field that only saved to database

**Solution**:
- Removed confusing `enabled` field from `plugins/hello-world/plugin.json` (lines 22-28)
- Removed from documentation example in `docs/plugins/creating-plugins.md`
- Config now starts with "Welcome Message" (clearer purpose)
- Framework-level enable/disable is the single source of truth

**Bug #3: Wrong Documentation Symlink Location**:
- **Issue**: Symlinks created in `docs/installed-plugins/` instead of `webapp/static/assets/jpulse-docs/installed-plugins/`
- **Impact**: Plugin documentation not accessible on production sites
- **Discovery**: bubblemap.net showed `docs/installed-plugins/` directory (wrong) with symlink to plugin docs
- **Root Cause**: SymlinkManager hardcoded paths without detecting context (framework repo vs site installation)

**Solution**:
- Added `detectContext()` method to SymlinkManager:
  * Checks for `docs/plugins/` → returns 'framework'
  * Checks for `webapp/static/assets/jpulse-docs/plugins/` → returns 'site'
- Updated `createPluginDocsSymlink()` with context-aware paths:
  * Framework: `docs/installed-plugins/{name} → ../../plugins/{name}/docs`
  * Site: `webapp/static/assets/jpulse-docs/installed-plugins/{name} → ../../../../plugins/{name}/docs`
- Updated `removePluginDocsSymlink()` with context-aware paths
- Automatic detection - no manual configuration required

**Bug #4: Stale Plugin State After Enable/Disable**:
- **Issue**: Plugin enable/disable didn't update admin UI until app restart
- **Flow**: Disable plugin → Shows "DISABLED" → Reload page → Shows "ACTIVE" (wrong) → Restart app → Shows "DISABLED"
- **Root Cause**: `PluginManager.getAllPlugins()` returned stale data
  * `enablePlugin()`/`disablePlugin()` updated `this.registry.plugins[].enabled`
  * `getAllPlugins()` returned `this.discovered.values()` (never updated with enable/disable state)
  * Two separate data structures out of sync

**Solution**:
- Fixed `getAllPlugins()` in `webapp/utils/plugin-manager.js` to merge registry state with discovered metadata:
  ```javascript
  static getAllPlugins() {
      return this.registry.plugins.map(registryEntry => {
          const discovered = this.discovered.get(registryEntry.name);
          if (discovered) {
              return {
                  ...discovered,
                  registryEntry: registryEntry  // Includes enabled, status, enabledAt
              };
          }
          return null;
      }).filter(p => p !== null);
  }
  ```
- Admin UI now shows correct plugin state immediately after enable/disable

**Documentation Updates**:
- Updated `docs/plugins/plugin-architecture.md` with context-aware symlink explanation
- Updated `docs/plugins/plugin-api-reference.md` to clarify framework vs site paths
- Updated `docs/plugins/managing-plugins.md` troubleshooting with both context paths

**Files Modified**: 8 files
- 4 code fixes:
  * `bin/jpulse-update.js` (plugin sync)
  * `plugins/hello-world/plugin.json` (removed confusing field)
  * `webapp/utils/symlink-manager.js` (context-aware symlinks)
  * `webapp/utils/plugin-manager.js` (fixed stale state)
- 4 documentation updates:
  * `docs/plugins/creating-plugins.md` (removed confusing field from example)
  * `docs/plugins/plugin-architecture.md` (context-aware behavior)
  * `docs/plugins/plugin-api-reference.md` (framework vs site paths)
  * `docs/plugins/managing-plugins.md` (troubleshooting paths)

**Test Results**: 926 passed, 0 failed (942 total with 16 skipped)

**Impact**:
- Plugin updates now work correctly - sites receive updated plugins with `npx jpulse update`
- Eliminated UX confusion - single enable/disable mechanism
- Documentation accessible in both framework development and site installations
- Admin UI shows accurate real-time plugin state without restart

________________________________________________
## v1.3.1, W-100, 2025-11-30

**Commit:** `W-100, v1.3.1: architecture: critical bug fixes for W-045 plugin infrastructure`

**PATCH RELEASE**: Critical bug fixes discovered after v1.3.0 deployment affecting npm package distribution, CI/CD testing, and production JavaScript execution.

**Objective**: Fix three critical bugs preventing proper framework installation, automated testing, and production use with internationalized content.

**Implementation**:

**1. npm Package Missing plugins/ Directory (Bug Fix)**:
- **Issue**: `plugins/hello-world/` directory not included in published npm package
- **Root Cause**: `.gitignore` pattern `plugins/*` overrides npm defaults; negation pattern `!plugins/hello-world/` not working
- **Solution**: Added explicit `files` field to `package.json`:
  ```json
  "files": [
      "bin/", "docs/", "plugins/hello-world/", "site/", "templates/",
      "webapp/", "babel.config.cjs", "jest.config.cjs", "LICENSE", "README.md"
  ]
  ```
- **Impact**: hello-world reference plugin now ships with framework; npm installs are complete

**2. GitHub Actions Test Failure (Bug Fix)**:
- **Issue**: CI tests crash with "Database connection not available" error
- **Root Cause**: `PluginModel.ensureIndexes()` throws error when database unavailable in CI environment
- **Solution**: Added `isTest` parameter to gracefully skip index creation in test mode:
  * `webapp/model/plugin.js`: `ensureIndexes(isTest = false)` with conditional logic
  * `webapp/utils/bootstrap.js`: Pass `isTest` flag from test environment
- **Impact**: GitHub Actions CI now passes; production still fails fast on missing database (correct behavior)

**3. i18n JavaScript Syntax Errors (Bug Fix)**:
- **Issue**: JavaScript syntax errors when i18n strings contain apostrophes (Don't, can't, won't)
- **Root Cause**: Single-quoted strings in JavaScript break when Handlebars expands i18n with apostrophes
- **Discovery**: Worked locally (German browser) but failed in production (English browser) - language-dependent bug
- **Example**:
  ```javascript
  // Broken - apostrophe terminates string:
  jPulse.UI.toast.info('Don't forget to save!');
  //                         ^ Syntax Error

  // Fixed - template literals handle apostrophes:
  jPulse.UI.toast.info(`Don't forget to save!`);
  ```
- **Solution**:
  * Converted 160+ instances from `'{{i18n.*}}'` to backticks across 15 view files
  * Reverted translations to natural English with apostrophes
  * Established `%TOKEN%` pattern for dynamic error messages with `.replace()`
  * Added comprehensive "Using i18n in JavaScript Context" section to `docs/template-reference.md`
- **Impact**:
  * Translations can use natural language with apostrophes
  * Consistent pattern for dynamic error messages
  * Best practices documented for future development

**Files Modified**: 19 files (2 core utils, 1 model, 15 views, 1 translation, 1 documentation)
**Test Results**: 926 passed, 0 failed (942 total with 16 skipped)

________________________________________________
## v1.3.0, W-045, 2025-11-30

**Commit:** `W-045, v1.3.0: architecture: add plugin infrastructure with auto-discovery`

**MAJOR FEATURE**: Comprehensive plugin infrastructure enabling third-party extensions with zero-configuration auto-discovery, dynamic configuration management, and seamless integration into the framework's MVC architecture.

**Objective**: Enable developers to extend jPulse Framework functionality through plugins without modifying core framework code, maintaining the "don't make me think" philosophy with automatic discovery, registration, and integration.

**Implementation**:

**1. Core Plugin Infrastructure**:
- **PluginManager** (`webapp/utils/plugin-manager.js`):
  * Auto-discovery from `plugins/` directory
  * Plugin metadata validation from `plugin.json`
  * Dependency resolution and load order determination
  * Enable/disable lifecycle management
  * Registry persistence in `.jpulse/plugins.json`
  * Health status integration
- **PathResolver Enhancement** (`webapp/utils/path-resolver.js`):
  * Plugin-aware path resolution with priority: site > plugins > framework
  * Cache integration for performance
  * Support for controllers, models, views, static assets
- **SymlinkManager** (`webapp/utils/symlink-manager.js`):
  * Automatic symlink creation for plugin static assets
  * Documentation symlink management
  * Created at plugin enable time, removed at disable time
- **Bootstrap Integration** (`webapp/utils/bootstrap.js`):
  * Plugin discovery at Step 5 (after database, before views/controllers)
  * Ensures plugins load before components that depend on them

**2. Plugin Configuration Management**:
- **PluginModel** (`webapp/model/plugin.js`):
  * MongoDB storage for plugin configurations
  * JSON schema validation (types, required, min/max, enums, patterns)
  * Dynamic validation against plugin-defined schemas
  * DB operation result validation (TD-19)
  * Unique index on plugin name
- **PluginController** (`webapp/controller/plugin.js`):
  * RESTful API endpoints for plugin management
  * 11 endpoints: list, get, getInfo (public), getStatus, enable, disable, getConfig, updateConfig, getDependencies, getPluginDependencies, scan, installDependencies
  * Authentication/authorization on all admin endpoints
  * Path traversal validation (TD-18 security fix)
  * Request timing and standardized responses
  * Complete i18n (English & German)

**3. Admin User Interface**:
- **Plugin Management** (`webapp/view/admin/plugins.shtml`):
  * List all plugins with status (Active/Disabled)
  * Enable/disable plugins with restart notification
  * Plugin statistics (total, enabled, disabled)
  * Rescan for new plugins
  * Links to development guides and installed plugin docs
  * Complete i18n support
- **Plugin Configuration** (`webapp/view/admin/plugin-config.shtml`):
  * Dynamic form generation from plugin JSON schema
  * Support for text, number, boolean, select, textarea field types
  * Field validation (required, min/max, pattern, enum)
  * Reset to defaults functionality
  * Real-time configuration save with validation
  * Complete i18n support

**4. Plugin Component Auto-Discovery**:
- **Controllers**: Discovered by SiteControllerRegistry with `plugin:name` source
- **Models**: Loadable via PathResolver with plugin priority
- **Views**: Discovered by ViewController from `plugins/*/webapp/view/`
- **Static Assets**: Symlinked to `webapp/static/plugins/{name}/`
- **Documentation**: Symlinked to `docs/installed-plugins/{name}/`
- **Navigation**: Append mode for `jpulse-navigation.js` (W-098 integration)
- **Common Files**: Append mode for `jpulse-common.js` and `jpulse-common.css`

**5. hello-world Demo Plugin** (`plugins/hello-world/`):
- **Purpose**: Reference implementation demonstrating all plugin capabilities
- **Components**:
  * `plugin.json`: Metadata, dependencies, configuration schema
  * Controller (`helloPlugin.js`): REST API endpoints with proper logging/error handling
  * Model (`helloPlugin.js`): Data access with error handling
  * Views: Tutorial page (`/hello-plugin/`), overview page (`/jpulse-plugins/hello-world.shtml`)
  * Navigation: Adds "Hello Plugin" section to main navigation
  * Static assets: CSS and JavaScript examples
  * Documentation: Complete README with usage examples
- **Configuration Schema**: Demonstrates text, number, boolean, select, textarea field types
- **Ships with framework**: Always available as working example

**6. Developer Documentation** (`docs/plugins/`):
- **Plugin Architecture** (`plugin-architecture.md`): System design, auto-discovery, lifecycle
- **Creating Plugins** (`creating-plugins.md`): Step-by-step development guide
- **Managing Plugins** (`managing-plugins.md`): Installation, configuration, troubleshooting
- **Publishing Plugins** (`publishing-plugins.md`): Distribution, versioning, npm publishing
- **Plugin API Reference** (`plugin-api-reference.md`): Complete API documentation
- **Technical Debt** (`W-045-plugins-tech-debt.md`): 19 documented future enhancements

**7. Security Enhancements**:
- **Path Traversal Protection**: Plugin name validation with regex `^[a-z0-9][a-z0-9-]*$`
- **HTML Sanitization**:
  * Added `CommonUtils.sanitizeHtml()` with configurable allowed tags/attributes
  * Applied to plugin descriptions/summaries at discovery time
  * Applied to email HTML content in EmailController
  * Configurable via `app.conf: utils.common.sanitizeHtml`
- **Authentication**: All plugin admin endpoints require admin role
- **Authorization**: Role-based access control on all plugin operations
- **Input Validation**: Comprehensive schema validation for plugin configurations

**8. Quality & Testing**:
- **Unit Tests**: PluginController (11 tests), PluginModel validation (10 tests)
- **Integration Tests**: Plugin API authentication and authorization (12 tests)
- **Test Coverage**: All tests passing (813 unit + 100 integration = 913 total)
- **Code Review**: Aligned with UserController/UserModel patterns
- **Error Handling**: Proper error propagation, no console.error() in production code
- **Logging**: Request timing, comprehensive LogController integration

**Impact**:
- ✅ **Extensibility**: Third-party developers can extend framework without core modifications
- ✅ **Zero Configuration**: Drop plugin in directory, it auto-discovers and integrates
- ✅ **Admin-Friendly**: GUI for managing plugins and configurations
- ✅ **Developer-Friendly**: Complete documentation and working examples
- ✅ **Production-Ready**: Authentication, validation, error handling, HTML sanitization
- ✅ **Maintainable**: 19 technical debt items documented for future enhancements
- ✅ **Secure**: Path traversal protection, HTML sanitization, role-based access control

**Files Created/Modified**:
- **Core Infrastructure** (6 files):
  * `webapp/utils/plugin-manager.js` (new)
  * `webapp/utils/symlink-manager.js` (new)
  * `webapp/utils/path-resolver.js` (enhanced for plugins)
  * `webapp/utils/bootstrap.js` (added Step 5 for plugins)
  * `webapp/utils/site-controller-registry.js` (added plugin controller discovery)
  * `webapp/controller/view.js` (added plugin view discovery)
- **Plugin Management** (4 files):
  * `webapp/model/plugin.js` (new)
  * `webapp/controller/plugin.js` (new)
  * `webapp/view/admin/plugins.shtml` (new)
  * `webapp/view/admin/plugin-config.shtml` (new)
- **hello-world Plugin** (9 files):
  * `plugins/hello-world/plugin.json` (new)
  * `plugins/hello-world/README.md` (new)
  * `plugins/hello-world/docs/README.md` (new)
  * `plugins/hello-world/webapp/controller/helloPlugin.js` (new)
  * `plugins/hello-world/webapp/model/helloPlugin.js` (new)
  * `plugins/hello-world/webapp/view/hello-plugin/index.shtml` (new)
  * `plugins/hello-world/webapp/view/jpulse-plugins/hello-world.shtml` (new)
  * `plugins/hello-world/webapp/view/jpulse-navigation.js` (new)
  * `plugins/hello-world/webapp/static/.gitkeep` (new)
- **Documentation** (6 files):
  * `docs/plugins/plugin-architecture.md` (new)
  * `docs/plugins/creating-plugins.md` (new)
  * `docs/plugins/managing-plugins.md` (new)
  * `docs/plugins/publishing-plugins.md` (new)
  * `docs/plugins/plugin-api-reference.md` (new)
  * `docs/dev/working/W-045-plugins-tech-debt.md` (new)
- **Routes & Config** (4 files):
  * `webapp/routes.js` (added 12 plugin API routes)
  * `webapp/app.conf` (added utils.common.sanitizeHtml config)
  * `webapp/translations/en.conf` (added plugin i18n keys)
  * `webapp/translations/de.conf` (added German plugin i18n keys)
- **Security** (2 files):
  * `webapp/utils/common.js` (added sanitizeHtml function)
  * `webapp/controller/email.js` (added HTML sanitization)
- **Tests** (3 files):
  * `webapp/tests/unit/controller/plugin-controller.test.js` (new)
  * `webapp/tests/unit/model/plugin.test.js` (new)
  * `webapp/tests/integration/plugin-api.test.js` (new)
- **User-Facing Views** (2 files):
  * `webapp/view/jpulse-plugins/index.shtml` (new - plugin dashboard)
  * `docs/installed-plugins/README.md` (new - plugin docs index)
- **Gitignore** (1 file):
  * `.gitignore` (updated for plugin symlinks and registry)

**Technical Details**:
- Plugins discovered at bootstrap, before views/controllers load
- Path resolution priority ensures site can override plugin files
- Symlinks created/removed automatically on enable/disable
- Configuration schema supports complex validation rules
- All plugin operations logged with proper context
- Restart required for plugin enable/disable (hot-reload is TD-17)

**Work Item**: W-045
**Version**: v1.3.0
**Release Date**: 2025-11-30

________________________________________________
## v1.2.6, W-099, 2025-11-25

**Commit:** `W-099, v1.2.6: deploy: critical bug fixes for site installation and W-098 navigation`

**BUG FIX RELEASE**: Critical fixes for site installation and W-098 navigation deletion feature.

**Objective**: Fix critical bugs discovered after v1.2.5 deployment affecting site installation and navigation deletion markers.

**Issues Fixed**:
1. **Incomplete Hello Example Copying** - Only 1 of 5 hello controllers copied during site installation
2. **Missing Hello Model** - helloTodo.js not copied during site installation
3. **Missing Subdirectories** - templates/ subdirectories in hello-vue and hello-websocket not copied
4. **Null Navigation Crash** - Setting navigation section to `null` (documented deletion marker) caused JavaScript errors
5. **Obsolete Function Call** - checkAdminAccess() in user dashboard caused console errors
6. **Test Failure** - Navigation refresh test failed after sanitization refactor

**Implementation**:
- **Complete Hello Example Copying** (`bin/configure.js`):
  - Fixed `copySiteTemplates()` to copy ALL hello examples during initial site installation
  - Changed from single-file hardcoded paths to directory scanning with filtering
  - Controllers: Scans `site/webapp/controller/` and copies all `hello*.js` files (5 files: hello.js, helloTodo.js, helloVue.js, helloWebsocket.js, helloClusterTodo.js)
  - Models: Scans `site/webapp/model/` and copies all `hello*.js` files (1 file: helloTodo.js)
  - Views: Created `copyDirRecursive()` helper function for deep directory copying
  - Recursively copies all `hello*` directories including subdirectories (templates/ folders)
  - Processes all files with `expandAllVariables()` for template variable replacement
  - Total files now copied: 5 controllers + 1 model + all view directories with subdirectories

- **Robust Navigation Null Handling** (`webapp/view/jpulse-common.js`):
  - **Problem**: W-098 documented using `null` as deletion marker (`window.jPulseNavigation.site.auth = null`)
  - **Original Fix**: Added null checks throughout navigation code (6+ locations) - fragile approach
  - **Improved Solution**: Sanitize navigation structure once at init time
  - Created `_sanitizeNavStructure()` helper method:
    * Recursively walks navigation object
    * Removes all `null` and `undefined` properties (deletion markers)
    * Returns clean navigation structure
    * Handles nested objects (pages, submenus) automatically
  - Called during `init()` before any rendering: `_navConfig = _sanitizeNavStructure(navConfig)`
  - Benefits:
    * Single point of responsibility (one place to sanitize)
    * Safe by default (new code can't access null properties)
    * No fragility (nothing to forget)
    * Cleaner codebase (no scattered defensive checks)
    * Deletion markers still work (removed at init)

- **User Dashboard Cleanup** (`webapp/view/user/index.shtml`):
  - Removed obsolete `checkAdminAccess()` function call from page load
  - Function no longer defined, was causing JavaScript console error
  - Only `loadUserStats()` needed on user dashboard

- **Test Fix** (`webapp/tests/unit/utils/jpulse-ui-navigation.test.js`):
  - Fixed "should refresh navigation when requested" test
  - After W-098 sanitization, navigation uses clean copy in `_navConfig`
  - Test was modifying original `appConfig`, but refresh renders from `_navConfig`
  - Changed test to modify `_navConfig` directly for proper validation

**Impact**:
- ✅ **Educational Onboarding Fixed**: All hello examples now copy correctly on site installation
  - hello-todo (MPA example)
  - hello-vue (SPA example)
  - hello-websocket (Real-time example)
  - hello-app-cluster (Multi-server example)
  - hello (Basic example)
- ✅ **Navigation Deletion Works**: `null` deletion markers work reliably without crashes
- ✅ **Cleaner Codebase**: Sanitization approach is more maintainable than scattered checks
- ✅ **No Console Errors**: User dashboard loads cleanly
- ✅ **All Tests Pass**: 893 tests passing (776 unit, 88 integration, 29 CLI/MongoDB)

**Files Modified**:
- `bin/configure.js`: Enhanced hello example copying with recursive directory support
- `webapp/view/jpulse-common.js`: Navigation sanitization at init
- `webapp/view/user/index.shtml`: Removed obsolete function call
- `webapp/tests/unit/utils/jpulse-ui-navigation.test.js`: Test fix for sanitization

**Technical Details**:
- Recursive directory copying preserves full structure including subdirectories
- Sanitization happens once at navigation init, not on every access
- Deletion markers (`null`) cleanly removed before any rendering
- Template variable expansion still works on all copied files

**Work Item**: W-099
**Version**: v1.2.6
**Release Date**: 2025-11-24

________________________________________________
## v1.2.5, W-098, 2025-11-24

**Commit:** `W-098, v1.2.5: view: site navigation override with append mode and direct mutation`

**MAJOR FEATURE**: Introduced flexible site navigation override system using append mode file concatenation and direct JavaScript mutation, eliminating the need for complete file duplication while maintaining framework update compatibility.

**Objective**: Enable sites to selectively customize navigation (add, modify, delete sections) without duplicating entire framework navigation files, ensuring seamless framework updates.

**Implementation**:
- **Append Mode for `.js` and `.css` Files** (`webapp/controller/view.js`):
  - Implemented automatic file concatenation for `.js` and `.css` requests
  - Uses `PathResolver.collectAllFiles()` to gather framework + site + (future) plugin files
  - Concatenates all matching files with newline separator in load order
  - Removed `.js.tmpl` fallback (breaking change for cleaner pattern)
  - Maintained `.css.tmpl` fallback for W-047 backward compatibility
  - Logs append mode operations for debugging
- **PathResolver Enhancement** (`webapp/utils/path-resolver.js`):
  - Added `collectAllFiles(modulePath)` method for append mode support
  - Returns array of all matching files in load order: framework → site → plugins
  - Enables consistent append pattern across framework
- **Unified Navigation Structure** (`webapp/view/jpulse-navigation.js`):
  - Renamed from `.tmpl` to `.js` for active file convention
  - Restructured to unified format: `window.jPulseNavigation = { site: {...}, tabs: {...} }`
  - Framework defines structure first, sites extend via direct mutation second
  - Includes SVG icon components via `{{file.include "components/svg-icons.tmpl"}}`
  - Handlebars-processed for i18n support and component expansion
- **Direct Mutation Pattern**:
  - Sites mutate `window.jPulseNavigation` object directly in their `jpulse-navigation.js`
  - Add: `window.jPulseNavigation.site.newSection = {...}`
  - Modify: `window.jPulseNavigation.site.admin.icon = '⚙️'`
  - Delete: `window.jPulseNavigation.site.jpulseExamples = null`
  - Simple, explicit, idiomatic JavaScript - no special merge logic
  - Zero runtime overhead compared to deep merge approach
- **Handlebars Comment Support** (`webapp/controller/handlebar.js`):
  - Implemented `{{!-- --}}` Handlebars comment stripping
  - Removes comments at start of `_expandHandlebars()` before any processing
  - Supports single-line and multi-line comments
  - Critical for `svg-icons.tmpl` to work in both HTML and `.js` contexts
  - Prevents JavaScript syntax errors from HTML comments in template files
- **SVG Components in Navigation** (`webapp/view/components/svg-icons.tmpl`):
  - Converted file header/footer from HTML comments (`<!-- -->`) to Handlebars comments (`{{!-- --}}`)
  - Enables safe inclusion in JavaScript files without syntax errors
  - HTML comments inside SVG markup preserved (part of SVG string)
  - Auto-included in both page content (`jpulse-header.tmpl`) and navigation (`jpulse-navigation.js`)
- **Simplified Header** (`webapp/view/jpulse-header.tmpl`):
  - Single `<script src="/jpulse-navigation.js">` tag for navigation
  - Removed separate `site-common.js`/`site-common.css` includes (now append mode)
  - Includes `svg-icons.tmpl` for page content component availability
  - Cleaner structure with append mode handling concatenation
- **Simplified Footer** (`webapp/view/jpulse-footer.tmpl`):
  - Removed `deepMerge` logic (no longer needed with direct mutation)
  - Direct references to `window.jPulseNavigation.site` and `.tabs`
  - Simpler initialization code
- **File Naming Standardization**:
  - `site-common.css.tmpl` → `jpulse-common.css.tmpl`
  - `site-common.js.tmpl` → `jpulse-common.js.tmpl`
  - `site-navigation.js` → `jpulse-navigation.js` (with `.js.tmpl` as reference template)
  - Consistent `jpulse-*` naming across all framework files
  - EOF comments updated to reflect new names
- **Route Simplification** (`webapp/routes.js`):
  - Removed redundant `/site-common\.(js|css)$/` route
  - General `/jpulse-.*\.(js|css)$/` pattern covers all append mode files
- **Comprehensive Documentation**:
  - `docs/site-navigation.md`: Complete guide for direct mutation pattern
    - Explains append mode convention (`.js`/`.css` append, `.shtml` replace)
    - Common patterns: remove, add, extend, override, nested pages
    - Real-world examples with dashboard, marketing, admin extensions
    - Role-based visibility, icons (emoji and SVG components)
    - Tabs navigation for multi-page features
    - Best practices and troubleshooting
  - `docs/handlebars.md`: Added Handlebars comments (`{{!-- --}}`) documentation
  - `docs/template-reference.md`: Updated navigation pattern, added cross-links
  - `docs/jpulse-ui-reference.md`: Added navigation guide link in breadcrumbs section
  - `docs/genai-instructions.md`: Updated all site-common references to jpulse-common with append mode notes
  - `docs/genai-development.md`: Updated references
  - `docs/getting-started.md`: Updated references
  - `site/README.md`: Updated all file references and examples
  - `site/webapp/view/hello/site-development.shtml`: Updated examples with new naming
- **Template Updates**:
  - `site/webapp/view/jpulse-navigation.js.tmpl`: Example showing direct mutation pattern
  - `site/webapp/view/jpulse-common.js.tmpl`: Updated header with append mode explanation
  - `site/webapp/view/jpulse-common.css.tmpl`: Updated header with append mode explanation
  - EOF comments reflect new file names
- **Configuration Tool** (`bin/configure.js`):
  - Updated to use new `jpulse-common.css.tmpl` and `jpulse-common.js.tmpl` paths
  - Writes to correct file names during site setup
- **Integration Testing** (`webapp/tests/integration/w047-site-files.test.js`):
  - Updated expectations: `site-common.*` → `jpulse-common.*`
  - Updated route pattern check to general `/\/jpulse-.*\.(js|css)$/`
  - Test descriptions mention "W-098 append mode"
  - All tests passing with new naming convention
- **Cleanup**:
  - Deleted `webapp/tests/integration/cache-api.test.js` (empty stub)
  - Removed obsolete `site-common.*` references from 15+ files across codebase
  - Historical context preserved in CHANGELOG and work-items.md

**Benefits**:
- ✅ **Minimal Customization**: Sites only specify changes (additions, modifications, deletions)
- ✅ **Automatic Updates**: Framework navigation updates flow through automatically
- ✅ **Zero Runtime Overhead**: No deep merge, just direct JavaScript mutation
- ✅ **Clear Intent**: Explicit `window.jPulseNavigation.site.foo = bar` shows exactly what's changing
- ✅ **Idiomatic JavaScript**: Standard mutation pattern familiar to all developers
- ✅ **Consistent Pattern**: Align with `app.conf` deep merge and CSS append patterns
- ✅ **Future-Proof**: Append mode supports plugin architecture (framework → site → plugins)
- ✅ **Simple Debugging**: Easy to trace which file defines/modifies each navigation section
- ✅ **No Duplication**: Unlike file-level override, no need to copy entire navigation structure

**Breaking Changes**:
- **Navigation File Migration Required**:
  - Old: `site/webapp/view/jpulse-navigation.tmpl` (complete replacement)
  - New: `site/webapp/view/jpulse-navigation.js` (append + direct mutation)
  - Sites must convert full navigation object to selective mutations
- **Removed `.js.tmpl` Fallback**:
  - Old: `.js` files had `.js.tmpl` fallback in ViewController
  - New: Only `.js` files are active, `.js.tmpl` is reference template only
  - Cleaner pattern, but sites must copy `.js.tmpl` → `.js` for customization
- **File Naming**:
  - `site-common.*` → `jpulse-common.*` for consistency
  - Sites must rename existing files (or recreate from updated templates)

**Migration Path**:
1. Remove old `site/webapp/view/jpulse-navigation.tmpl` if it exists
2. Copy `site/webapp/view/jpulse-navigation.js.tmpl` to `.js`
3. Convert object definitions to direct mutations:
   - `window.siteNavigation = { site: { foo: {...} } }`
   - → `window.jPulseNavigation.site.foo = {...}`
4. Rename `site-common.*` → `jpulse-common.*` files if they exist
5. Test navigation, breadcrumbs, and tabs
6. Restart application

**Technical Details**:
- **Append Mode**: Concatenate framework + site + (future) plugin files in order
- **Direct Mutation**: `window.jPulseNavigation.site.foo = bar` (simple assignment)
- **Deletion Marker**: `window.jPulseNavigation.site.foo = null` (remove section)
- **Load Order**: Framework defines, site extends (both in single HTTP response)
- **Handlebars Processing**: Both framework and site files processed for i18n/components
- **Component Availability**: `svg-icons.tmpl` included in both page and navigation contexts
- **No Runtime Merge**: Zero overhead, maximum simplicity

**Files Modified/Created** (50+ files):
- Core: `webapp/controller/view.js`, `webapp/utils/path-resolver.js`, `webapp/controller/handlebar.js`
- Views: `webapp/view/jpulse-navigation.js`, `webapp/view/jpulse-header.tmpl`, `webapp/view/jpulse-footer.tmpl`
- Components: `webapp/view/components/svg-icons.tmpl`
- Templates: `site/webapp/view/jpulse-*.tmpl` (3 files)
- Routes: `webapp/routes.js`
- Config: `bin/configure.js`
- Tests: `webapp/tests/integration/w047-site-files.test.js`
- Docs: `docs/site-navigation.md` (new), `docs/handlebars.md`, `docs/template-reference.md`, `docs/jpulse-ui-reference.md`, `docs/genai-instructions.md`, `docs/genai-development.md`, `docs/getting-started.md`, `site/README.md`
- Examples: `site/webapp/view/hello/site-development.shtml`

**Work Item**: W-098
**Version**: v1.2.5
**Release Date**: 2025-11-24

________________________________________________
## v1.2.4, W-097, 2025-11-24

**Commit:** `W-097, v1.2.4: handlebars: define and use reusable components`

**MAJOR FEATURE**: Introduced reusable Handlebars components system to eliminate code duplication, particularly for SVG icons. Components can be defined once and reused throughout templates with parameterization, namespacing, and framework-level features like inline rendering for JavaScript embedding.

**Objective**: Enable developers to create reusable template components that reduce code duplication and improve maintainability, replacing verbose inline SVG markup with clean `{{use.componentName}}` syntax.

**Implementation**:
- **Component Definition & Usage** (`webapp/controller/handlebar.js`):
  - Added `{{#component "name" param="default"}}...{{/component}}` block syntax for defining components
  - Added `{{use.componentName param="value"}}` syntax for using components
  - Automatic kebab-case to camelCase conversion (`logs-svg` → `{{use.logsSvg}}`)
  - Per-request transient component registry for isolation
  - Circular reference detection with call stack tracking (max depth: 16)
  - Enhanced `_parseHelperArgs()` to parse unquoted boolean values (`_inline=true`)
- **Namespaced Components** (`webapp/controller/handlebar.js`):
  - Optional dot-notation namespaces for organization (e.g., `jpIcons.config-svg` → `{{use.jpIcons.configSvg}}`)
  - Prevents naming collisions as component library grows
  - Clear component categorization (icons, buttons, cards, etc.)
  - `_convertComponentName()` handles namespace conversion
- **Framework Parameters** (`webapp/controller/handlebar.js`):
  - `_inline=true` parameter strips newlines and collapses whitespace
  - Enables embedding SVG in JavaScript strings without line breaks
  - Framework parameters (prefixed with `_`) filtered from component context
  - Supports both quoted (`_inline="true"`) and unquoted (`_inline=true`) syntax
- **Component Library** (`webapp/view/components/svg-icons.tmpl`):
  - Created centralized library with 20+ SVG icon components
  - Admin icons: configSvg, logsSvg, usersSvg, userSvg, systemStatusSvg, websocketSvg
  - Example icons: layoutSvg, apiSvg, formsSvg, handlebarsSvg, uiWidgetsSvg, overrideSvg, trafficConeSvg, todoSvg, refreshDotSvg, cableSvg, placeholderSvg
  - All icons use namespaced naming (`jpIcons.configSvg`)
  - Parameterized with `fillColor`, `strokeColor`, and `size`
  - Auto-included in all pages via `jpulse-header.tmpl`
- **Navigation Integration** (`webapp/view/jpulse-navigation.tmpl`):
  - Migrated all navigation icons to component syntax
  - Uses `{{use.jpIcons.configSvg size="24" _inline=true}}` for inline rendering
  - Clean, maintainable icon definitions in JavaScript config
- **Client-Side Rendering** (`webapp/view/jpulse-common.js`):
  - Enhanced `_renderIcon()` to detect and handle inline SVG from components
  - Wraps SVG in `<span class="jp-nav-icon jp-nav-icon-svg">` for consistent styling
  - Removed redundant image file check (now component-based)
- **CSS Styling** (`webapp/view/jpulse-common.css`):
  - Added `.jp-breadcrumb-icon-svg` for inline SVG icons in breadcrumbs
  - Proper sizing (14px), vertical alignment, and opacity for visual consistency
- **Comprehensive Testing** (`webapp/tests/unit/controller/handlebar-components.test.js`):
  - 20 unit tests covering all component functionality
  - Tests: definition, usage, parameters, nesting, circular references
  - Tests: library imports, namespaces, `_inline` parameter, error handling
- **Documentation Updates**:
  - `docs/handlebars.md`: Complete component system documentation
    - Component definition, usage, parameters, namespaces
    - Component libraries, nested components, error handling
    - `_inline` framework parameter with examples
  - `docs/style-reference.md`: Updated with `{{use.jpIcons.*}}` examples
  - `docs/template-reference.md`: Updated with component usage patterns
- **Migration to Components**:
  - Removed `webapp/static/assets/admin/icons/*.svg` files
  - Removed `webapp/static/assets/jpulse-examples/icons/*.svg` files
  - All icon SVGs now live in `svg-icons.tmpl` as reusable components
- **Translation Fixes**:
  - Fixed `loginSuccessful` → `loginSuccess` key mismatch in German translations
  - Updated all references in controller, tests, and translation files

**Benefits**:
- ✅ **Code Reusability**: Define once, use everywhere with `{{use.componentName}}`
- ✅ **Parameterization**: Override defaults with `param="value"` syntax
- ✅ **Clean Templates**: Replace verbose SVG markup with concise component calls
- ✅ **Maintainability**: Update icon in one place, reflects everywhere
- ✅ **Organization**: Namespaces prevent collisions and categorize components
- ✅ **JavaScript Integration**: `_inline=true` for clean embedding in JS strings
- ✅ **Type Safety**: Circular reference detection prevents infinite loops
- ✅ **Developer Experience**: Intuitive syntax with auto-conversion (kebab → camel)

**Technical Details**:
- **Component Registry**: Per-request `Map` stored in `req.componentRegistry`
- **Call Stack**: Per-request array in `req.componentCallStack` for circular detection
- **Naming Convention**: Define in kebab-case, use in camelCase (auto-converted)
- **Error Handling**: Server logs + HTML comments in dev, silent in production
- **Framework Parameters**: Prefixed with `_`, not passed to component context
- **Max Nesting**: 16 levels deep (configurable via `appConfig.controller.handlebar.maxIncludeDepth`)

**Migration**:
- **Backward Compatible**: No breaking changes for existing templates
- **Component System**: New opt-in feature, existing code continues to work
- **Icon Migration**: All framework icons migrated to component system
- **Site Icons**: Sites can create own component libraries in `site/webapp/view/components/`

**Files Modified**:
- `webapp/controller/handlebar.js`: Core component implementation
- `webapp/view/components/svg-icons.tmpl`: Component library with 20+ icons
- `webapp/view/jpulse-header.tmpl`: Auto-includes svg-icons.tmpl
- `webapp/view/jpulse-navigation.tmpl`: Migrated to component syntax
- `webapp/view/jpulse-common.js`: Enhanced icon rendering
- `webapp/view/jpulse-common.css`: Added breadcrumb SVG icon styling
- `webapp/tests/unit/controller/handlebar-components.test.js`: 20 comprehensive tests
- `docs/handlebars.md`: Complete component documentation
- `docs/style-reference.md`: Updated with component examples
- `docs/template-reference.md`: Updated with component examples
- `webapp/translations/de.conf`: Fixed loginSuccess key
- `webapp/controller/auth.js`: Fixed translation key reference
- `webapp/tests/unit/controller/auth-controller.test.js`: Updated mock translations
- `webapp/tests/unit/translations/i18n-user-language.test.js`: Updated mock translations

**Release Date**: 2025-11-23

________________________________________________
## v1.2.3, W-096, 2025-11-23

**Commit:** `W-096, v1.2.3: view: replace Unicode icons with svg images`

**UI ENHANCEMENT**: Replaced Unicode emoji icons with professional SVG icons from lucide.dev across admin dashboard and hello demo pages. Improves visual consistency and provides theme-ready icons using CSS currentColor.

**Objective**: Replace emoji-based icons with professional SVG icons for a more polished, enterprise-ready appearance while maintaining theme flexibility.

**Implementation**:
- **CSS Enhancements** (`webapp/view/jpulse-common.css`):
  - Added vertical alignment for SVG icons in headings: `h1 svg, h2 svg, h3 svg { vertical-align: middle; }`
  - Removed redundant `color: currentColor` from `.jp-icon` (color inherits by default from parent)
  - SVG icons now properly align with text in page headers
- **Admin Dashboard Icons** (`webapp/view/admin/*.shtml`):
  - Replaced `<img src="*.svg">` tags with inline SVG markup
  - Icons: Site Config (⚙️ → settings icon), Users (👥 → users icon), System Status (💻 → monitor icon), WebSocket (🔌 → outlet icon), View Logs (📊 → bar chart icon)
  - Inline SVGs properly inherit `color: #ffffff` from `.jp-icon-container`
  - Theme-ready: Icons respond to CSS color changes
- **Hello Demo Pages** (`site/webapp/view/hello*/*.shtml`):
  - Replaced emoji icons (📋, 🌐, 📡, etc.) with lucide.dev SVG icons
  - Updated page headers and dashboard cards with inline SVG markup
  - Maintained extract markers for dynamic dashboard generation
- **Test Updates** (`webapp/tests/unit/site/hello-todo-structure.test.js`):
  - Updated navigation test to be icon-agnostic (checks for text, not emoji)
  - Test now works with any icon format (emoji, SVG, or future alternatives)

**Benefits**:
- ✅ **Professional Appearance**: SVG icons look crisp at all resolutions
- ✅ **Theme Ready**: Icons use `currentColor` and respond to parent container colors
- ✅ **Consistent Design**: Unified icon style across framework
- ✅ **Open Source Icons**: lucide.dev icons (ISC License, free to use)
- ✅ **Better Accessibility**: SVG icons with proper semantic markup

**Technical Details**:
- **Why Inline SVGs**: External SVG files loaded via `<img>` tags cannot access parent document CSS context, so `currentColor` doesn't work. Inlining SVGs allows proper color inheritance.
- **Vertical Alignment**: SVG elements default to `vertical-align: baseline`, which positions them too high. Using `vertical-align: middle` aligns icons properly with text.
- **Color Inheritance**: Removed redundant `color: currentColor` from `.jp-icon` since color is inherited by default. This allows SVG `currentColor` to properly resolve to parent's `color: #ffffff`.

**Files Modified**:
- `webapp/view/jpulse-common.css`: Added SVG vertical alignment styles
- `webapp/view/admin/*.shtml`: Replaced img tags with inline SVG icons
- `site/webapp/view/hello*/*.shtml`: Replaced emoji with inline SVG icons
- `webapp/tests/unit/site/hello-todo-structure.test.js`: Updated icon test

**Migration**: No breaking changes - visual enhancement only

**SVG Source**: Icons from [lucide.dev](https://lucide.dev/) - ISC License, Copyright (c) Lucide Contributors 2025

**Release Date**: 2025-11-23

________________________________________________
## v1.2.2, W-095, 2025-11-22

**Commit:** `W-095, v1.2.2: handlebars: remove jsdom dependency`

**DEPENDENCY REDUCTION**: Removed jsdom from production dependencies by replacing it with a lightweight regex-based CSS selector extraction implementation. Reduces production package size by ~15-20MB and eliminates 90+ sub-dependencies.

**Objective**: Create a leaner framework with fewer external dependencies while maintaining full CSS selector extraction functionality.

**Implementation**:
- **Smart Regex Extraction** (`webapp/controller/handlebar.js`): ~50 lines
  - Three-step approach for CSS selector extraction
  - Step 1: Find opening tag with class/id attribute and extract order
  - Step 2: Annotate HTML with nesting levels (`:~0~`, `:~1~`, etc.)
  - Step 3: Use backreference regex to match exact nesting level
  - Handles deeply nested tags correctly
  - No external dependencies
- **Package Optimization** (`package.json`):
  - Moved `jsdom` from `dependencies` → `devDependencies`
  - jsdom still used for client-side JavaScript tests (legitimate use case)
  - Production deployments no longer require jsdom

**Benefits**:
- ✅ **Smaller Package**: Reduced production install size by ~15-20MB
- ✅ **Fewer Dependencies**: Eliminated 90+ transitive dependencies from production
- ✅ **Faster Installs**: Significantly faster `npm install` for production deployments
- ✅ **Same Functionality**: CSS selector extraction (`.class`, `#id`) works identically
- ✅ **Better Performance**: Native regex operations faster than full DOM parsing

**Technical Details**:
- Annotation format: `<div:~0~>` for outer tags, `<div:~1~>` for nested tags
- Backreference pattern: `<div(:~\d+~) [^>]*>(.*?)<\/div\1>` ensures matching nesting
- Strips annotations from extracted content before returning
- Supports both class selectors (`.class-name`) and ID selectors (`#id-name`)
- Extracts `data-extract-order` attribute for sorting

**Files Modified**:
- `webapp/controller/handlebar.js`: Replaced jsdom-based `_extractFromCSSSelector()` with regex + annotation approach
- `package.json`: Moved jsdom to devDependencies

**Migration**: No breaking changes - CSS selector extraction API remains identical

**Release Date**: 2025-11-21

________________________________________________
## v1.2.1, W-094, 2025-11-21

**Commit:** `W-094, v1.2.1: handlebars: list files, extract from files`

**FILE LISTING & EXTRACTION HELPERS**: Generalized Handlebars helpers for automated content generation, enabling dynamic file-based content assembly such as auto-populated dashboard cards, navigation menus, galleries, and documentation indexes.

**Objective**: Enable automated content generation from files using flexible, opt-in Handlebars helpers that support glob patterns, content extraction, and sorting.

**Major Features**:
- **File Listing Helper** (`file.list`): Discover files using glob patterns
  - Syntax: `{{#each file.list "admin/*.shtml"}}...{{/each}}`
  - Supports multi-level patterns: `projects/*/*.shtml`
  - Site override support via `PathResolver.listFiles()`
  - Security: Path traversal protection (rejects `..` and absolute paths)
- **Content Extraction Helper** (`file.extract`): Extract content using three methods
  - Comment markers: `<!-- extract:start order=N -->...<!-- extract:end -->`
  - Regex patterns: `/pattern/flags` with capture groups
  - CSS selectors: `.class-name` and `#id-string` with `data-extract-order` attribute
  - Supports HTML, block (`/* */`), and line (`//`, `#`) comment styles
- **Sorting Support**: Order files by extracted metadata or filename
  - `sortBy="extract-order"`: Sort by order attribute (default: 99999)
  - `sortBy="filename"`: Alphabetical sorting
- **Pattern Parameter Passing**: Global pattern in `file.list` passed to `file.extract` in loops
  - Syntax: `{{#each file.list "docs/*.md" pattern="/regex/"}}{{file.extract this}}{{/each}}`
- **Error Handling**: Server-side logging only (graceful template degradation)

**Implementation**:
- **HandlebarController** (`webapp/controller/handlebar.js`): ~500 lines
  - `_handleFileList()`: Glob pattern matching with site override support
  - `_handleFileExtract()`: Multi-method content extraction
  - `_extractOrderFromMarkers()`: Comment marker parsing
  - `_extractFromRegex()`: Regex-based extraction with validation
  - `_extractFromCSSSelector()`: CSS selector-based extraction using jsdom
- **PathResolver Enhancement** (`webapp/utils/path-resolver.js`): ~50 lines
  - `listFiles()`: Centralized directory listing with site override logic
  - Foundation for W-045 (plugin infrastructure)

**Use Cases**:
- Auto-populate admin dashboard cards (`/admin/index.shtml`)
- Generate navigation menus from page metadata
- Create gallery pages from image directories
- Build documentation indexes from markdown files
- Generate sitemaps from view files

**Testing**:
- Unit tests: 4 security tests (path traversal protection)
- Manual testing: Verified on admin dashboard with markers and CSS selectors
- Production ready

**Technical Debt Identified**:
- `ViewController._buildViewRegistry()`: Hand-crafted site override logic (documented for future refactoring)

**Documentation**:
- `docs/handlebars.md`: Comprehensive helper documentation
- `docs/template-reference.md`: Updated file operations section
- `docs/dev/working/W-094-handlebars-file-list-and-extract.md`: Complete implementation details

**Files Modified**:
- `webapp/controller/handlebar.js`: Added file listing and extraction helpers
- `webapp/utils/path-resolver.js`: Added `listFiles()` method
- `webapp/view/admin/*.shtml`: Added extraction markers for testing
- `webapp/view/admin/index.shtml`: Implemented automated dashboard
- `webapp/tests/unit/controller/file-list-extract.test.js`: Security tests
- `docs/handlebars.md`: Helper documentation
- `docs/template-reference.md`: Usage examples
- `docs/dev/working/W-014-W-045-mvc-site-plugins-architecture.md`: Technical debt notes

**Release Date**: 2025-11-21

________________________________________________
## v1.2.0, W-093, 2025-11-21

**Commit:** `W-093, v1.2.0: users: ability for admins to manage users`

**ADMIN USER MANAGEMENT & API CONSOLIDATION**: Complete admin user management system with flexible user identification, comprehensive validation, schema extensibility, and API consolidation. Breaking changes: removed `/api/1/user/profile` endpoints, replaced with unified `/api/1/user` and `/api/1/user/:id` endpoints.

**Objective**: Enable administrators to manage all users with proper validation, flexible user identification, and extensible schema architecture for future plugin support.

**Major Features**:
- **Admin User Profile Management**: Dedicated admin user profile page (`/admin/user-profile.shtml`) with view/edit toggle
  - User ID (_id) and UUID fields (read-only)
  - Horizontal roles grid layout
  - Dynamic status, roles, and theme dropdowns populated from schema enums
  - Full profile field editing (firstName, lastName, nickName, language, theme)
  - Administrative field management (email, roles, status)
- **Flexible User Identification**: Unified API endpoints support multiple identification methods
  - ObjectId parameter: `/api/1/user/:id`
  - Username query: `/api/1/user?username=jsmith`
  - Session fallback: `/api/1/user` (current user)
- **Comprehensive Validation**: Prevents dangerous operations
  - Cannot remove last admin/root role
  - Cannot remove own admin role
  - Cannot suspend last admin
  - Email uniqueness validation
- **Schema Extension Architecture**: Foundation for plugin system (W-045)
  - Runtime schema extension via `UserModel.extendSchema()`
  - Dynamic enum retrieval via `/api/1/user/enums`
  - Deep merge of schema extensions
  - Plugin initialization order support
- **API Consolidation**: Simplified and unified API surface
  - Removed `/api/1/user/profile` endpoints (breaking change)
  - Unified `/api/1/user` and `/api/1/user/:id` endpoints
  - New `/api/1/user/enums` endpoint for dynamic enum retrieval
  - Removed obsolete `/api/1/auth/roles` and `/api/1/auth/themes` endpoints

**Configuration Enhancements**:
- **Admin Roles Configuration**: Centralized admin role definition in `appConfig.user.adminRoles`
  - Default: `['admin', 'root']`
  - Configurable via `webapp/app.conf` or `site/webapp/app.conf`
  - Used throughout codebase (controllers, routes, models)
  - Backward compatible with fallback to default

**Breaking Changes**:
- **Removed Endpoints**:
  - `GET /api/1/user/profile` → Use `GET /api/1/user` or `GET /api/1/user/:id`
  - `PUT /api/1/user/profile` → Use `PUT /api/1/user` or `PUT /api/1/user/:id`
  - `GET /api/1/auth/roles` → Use `GET /api/1/user/enums?fields=roles`
  - `GET /api/1/auth/themes` → Use `GET /api/1/user/enums?fields=preferences.theme`
- **User Model Changes**:
  - Removed 'guest' from roles enum (not a real role, just a fallback label)
- **Translation Key Changes**:
  - Simplified key names (removed "Successfully" suffix)
  - `accountCreatedSuccessfully` → `accountCreated`
  - `changedSuccessfully` → `changed`
  - `retrievedSuccessfully` → `retrieved`
  - `updatedSuccessfully` → `updated`

**Technical Improvements**:
- **User Model**: Added `countAdmins()` helper, schema extension infrastructure
  - `baseSchema`: Original schema definition
  - `schema`: Extended schema (merged at runtime)
  - `extendSchema(extension)`: Add schema extensions
  - `getEnums()`: Retrieve all enum values from current schema
  - `getEnum(fieldPath)`: Get enum for specific field path
- **User Controller**: Renamed methods for clarity
  - `getById()` → `get()` (with flexible identification)
  - `updateById()` → `update()` (with flexible identification)
  - Added `getEnums()` for schema enum retrieval
- **Route Ordering**: Fixed route conflict resolution
  - Specific routes (`/api/1/user/search`, `/api/1/user/enums`) before parameterized routes
  - SiteControllerRegistry route sorting for auto-discovered controllers
- **View Updates**: Dynamic enum population
  - Admin user profile page uses `/api/1/user/enums` for dropdowns
  - Admin users page uses enums API for filters
  - User profile page uses enums API for theme dropdown
- **Bootstrap Integration**: Schema initialization at startup
  - Step 14: `UserModel.initializeSchema()` ensures extended schema is ready

**Files Modified**:
- webapp/model/user.js (countAdmins, schema extension, getEnums, removed 'guest' from roles)
- webapp/controller/user.js (get, update, getEnums, validation, appConfig.user.adminRoles)
- webapp/routes.js (new routes, removed old routes, appConfig.user.adminRoles)
- webapp/view/admin/user-profile.shtml (new admin user profile page)
- webapp/view/admin/users.shtml (updated link, dynamic filters)
- webapp/view/user/profile.shtml (updated endpoint, dynamic theme)
- webapp/view/user/index.shtml (updated endpoint)
- webapp/translations/en.conf, de.conf (new keys, simplified names, removed obsolete)
- webapp/utils/bootstrap.js (schema initialization)
- webapp/controller/cache.js (appConfig.user.adminRoles)
- webapp/controller/handlebar.js (appConfig.user.adminRoles)
- webapp/controller/websocket.js (appConfig.user.adminRoles)
- webapp/app.conf (user.adminRoles, fixed typo)
- webapp/tests/unit/user/user-controller.test.js (new tests for getEnums, get, update validation)
- docs/dev/working/W-014-W-045-mvc-site-plugins-architecture.md (schema extension architecture)
- docs/api-reference.md (updated endpoints)
- docs/dev/work-items.md (completed W-093)

**Migration Guide**:
1. **Update API Calls**: Replace `/api/1/user/profile` with `/api/1/user` or `/api/1/user/:id`
2. **Update Enum Retrieval**: Replace `/api/1/auth/roles` and `/api/1/auth/themes` with `/api/1/user/enums?fields=roles,preferences.theme`
3. **Update Translation Keys**: Rename keys with "Successfully" suffix to simplified names
4. **Configure Admin Roles**: Optionally customize `appConfig.user.adminRoles` in `app.conf`

**Benefits**:
- Unified API surface with flexible user identification
- Comprehensive validation prevents dangerous operations
- Extensible schema architecture for future plugins
- Centralized admin role configuration
- Dynamic enum retrieval reduces hardcoded values
- Better separation of concerns (admin vs regular user endpoints)

**Developer Experience**:
- Before: Separate endpoints for profile management, hardcoded admin roles
- After: Unified endpoints with flexible identification, configurable admin roles
- Before: Hardcoded enum values in views
- After: Dynamic enum retrieval from schema
- Before: No validation for last admin protection
- After: Comprehensive validation with clear error messages
- Before: Schema not extensible
- After: Runtime schema extension ready for plugins

________________________________________________
## v1.1.8, W-092, 2025-11-18

**Commit:** `W-092, v1.1.8: install: add jpulse-install package for simplified installation`

**SIMPLIFIED INSTALLATION & BUG FIXES**: Added `jpulse-install` npm package that eliminates the "chicken and egg" problem of installing jPulse Framework from GitHub Packages. One-command installation with automatic `.npmrc` configuration. Also includes additional bug fixes discovered during testing and command rename for clarity.

**Objective**: Eliminate manual `.npmrc` creation with one-command installer following "don't make me think" philosophy, plus fix additional deployment bugs.

**New Installer Package**:
- **jpulse-install** (separate npm package): Lightweight installer published to public npm registry
  - Creates `.npmrc` file with scoped registry configuration (`@jpulse-net:registry=https://npm.pkg.github.com`)
  - Installs `@jpulse-net/jpulse-framework` from GitHub Packages
  - Provides clear next steps for users
  - No authentication needed for the installer itself (public npm registry)
  - Solves the chicken-and-egg problem: installer exists before framework is installed

**Usage**:
```bash
# Simple one-command installation
mkdir my-jpulse-site && cd my-jpulse-site
npx jpulse-install
npx jpulse configure
npm install
```

**Documentation Updates**:
- **docs/getting-started.md**: Updated to use `npx jpulse-install` (simple, beginner-friendly)
- **docs/deployment.md**: Updated quick start to use `npx jpulse-install`
- **docs/installation.md**: Shows both methods - recommended (`npx jpulse-install`) and alternative (manual `.npmrc` creation)
- **README.md**: Updated quick start section to use `npx jpulse-install`
- **docs/README.md**: Updated release highlights

**Manual Method Still Available**:
- For air-gapped systems or users who prefer manual configuration
- Documented in `docs/installation.md` as alternative method
- Uses: `echo "@jpulse-net:registry=https://npm.pkg.github.com" > .npmrc`

**Additional Bug Fixes**:
- **Bug 2 Enhancement**: Fixed log symlink creation - only creates symlink for file logging, not for STDOUT
  - **bin/configure.js**: Updated `createSiteStructure()` to check if `LOG_DIR` is set before creating symlink
  - Prevents unnecessary symlink when STDOUT logging is selected
- **Bug 6**: Fixed SSL certificate paths not being computed in nginx config
  - **bin/configure.js**: Updated `generateDeploymentFiles()` to use `buildCompleteConfig()` before expanding variables
  - Ensures `SSL_CERT_PATH` and `SSL_KEY_PATH` are computed when Let's Encrypt is selected
- **Bug 9**: Fixed PORT value being overwritten by computed default
  - **bin/config-registry.js**: Updated `buildCompleteConfig()` to preserve user-provided values for computed fields
  - User-entered PORT values (like 8089) are now preserved instead of being overwritten
- **Fix 8**: Log directory default now uses site ID
  - **bin/config-registry.js**: Updated LOG_DIR prompt to use `/var/log/${JPULSE_SITE_ID}` as default
  - More intuitive defaults for multi-site installations
- **Test Fix**: Updated test to conditionally check for logs symlink
  - **bin/test-cli.js**: Only expects logs symlink if `LOG_DIR` is set in `.env`
  - Test now passes for both STDOUT and file logging scenarios
- **Command Rename**: Renamed `npx jpulse install` → `npx jpulse setup` (breaking change)
  - **bin/jpulse-framework.js**: Changed command from `install` to `setup`
  - **bin/jpulse-install.sh** → **bin/jpulse-setup.sh**: File renamed
  - Updated all documentation and code references
  - Eliminates confusion with `npx jpulse-install` (framework installer)
  - Follows common patterns (Rails, Laravel, Symfony use `setup`)

**Technical Details**:
- Installer package is separate repository: `jpulse-install`
- Published to public npm registry (no authentication needed)
- Minimal dependencies - just Node.js built-ins
- Creates `.npmrc` with scoped registry configuration
- Runs `npm install @jpulse-net/jpulse-framework` after setup
- Provides helpful next steps output

**Files Modified**:
- bin/configure.js (log symlink fix, SSL paths fix, next steps update)
- bin/config-registry.js (PORT preservation, log directory default, buildCompleteConfig improvements)
- bin/jpulse-framework.js (command rename: install → setup)
- bin/jpulse-install.sh → bin/jpulse-setup.sh (file renamed)
- bin/test-cli.js (conditional logs symlink check)
- docs/getting-started.md (updated to use npx jpulse-install)
- docs/installation.md (added both recommended and alternative methods)
- docs/deployment.md (updated quick start, command rename)
- README.md (updated quick start and release highlights)
- docs/README.md (updated release highlights)
- templates/deploy/README.md (command rename)
- templates/README.md (command rename)
- docs/dev/publishing.md (updated legacy content, command rename)
- docs/dev/work-items.md (completed W-092)
- docs/CHANGELOG.md (v1.1.8 entry)

**Breaking Changes**:
- `npx jpulse install` → `npx jpulse setup` (command renamed for clarity)

**Benefits**:
- One-command installation - no manual steps
- Eliminates confusion about when to create `.npmrc`
- Works from clean directory - no prerequisites
- Follows common patterns (like `create-react-app`, `vue create`)
- Manual method still available for special cases
- True "don't make me think" experience
- Clear command separation: `jpulse-install` (framework) vs `jpulse setup` (system)
- All deployment bugs fixed and tested

**Developer Experience**:
- Before: Manual `.npmrc` creation required before first install
- After: Just run `npx jpulse-install` - everything handled automatically
- Before: Users had to understand scoped registries and GitHub Packages
- After: Installer handles all complexity transparently
- Before: Installation failed if `.npmrc` not created first
- After: Installation "just works" with one command
- Before: Confusing: `npx jpulse-install` vs `npx jpulse install`
- After: Clear: `npx jpulse-install` (framework) vs `npx jpulse setup` (system)
- Before: PORT values overwritten, SSL paths empty, log symlinks created incorrectly
- After: All values preserved correctly, SSL paths computed, symlinks only when needed

________________________________________________
## v1.1.7, W-091, 2025-11-18

**Commit:** `W-091, v1.1.7: deploy: bug fixes for site deployments`

**DEPLOYMENT BUG FIXES**: Fixed seven bugs affecting site deployment and configuration, improving the "don't make me think" installation experience for multi-site installations.

**Objective**: Better getting started experience with smoother installation and configuration process.

**Bug Fixes**:
- **Bug 1**: Updated documentation to use `npm install --registry` flag (KISS solution)
  - No manual `.npmrc` creation required
  - Simple one-liner: `npm install --registry=https://npm.pkg.github.com @jpulse-net/jpulse-framework`
  - Updated in: README.md, docs/README.md, docs/installation.md, docs/getting-started.md, docs/deployment.md
- **Bug 2**: Fixed log directory symlink to use `config.LOG_DIR` during configure
  - **bin/configure.js**: Modified `createSiteStructure()` to accept config object
  - Now correctly uses `config.LOG_DIR` instead of `process.env.LOG_DIR`
  - Symlink now points to correct site-specific log directory
- **Bug 3**: MongoDB setup now auto-loads `.env` file
  - **bin/mongodb-setup.sh**: Added automatic `.env` sourcing at script start
  - No need to manually run `source .env` before mongodb-setup
  - Follows "don't make me think" philosophy
- **Bug 4**: MongoDB setup handles authentication when already enabled
  - **bin/mongodb-setup.sh**: Detects if MongoDB auth is already enabled
  - Authenticates with provided admin credentials before checking/creating users
  - Provides clear error messages if authentication fails
  - Supports multi-site installations where MongoDB is already secured
- **Bug 5**: Added `npx jpulse mongodb-setup` step to getting started docs
  - **docs/getting-started.md**: Added mongodb-setup step in installation flow
  - Clarifies when and how to run database setup
- **Bug 6**: Auto-set Let's Encrypt SSL certificate paths when selected
  - **bin/config-registry.js**: Auto-configures `SSL_CERT_PATH` and `SSL_KEY_PATH`
  - Sets standard Let's Encrypt paths: `/etc/letsencrypt/live/{domain}/fullchain.pem`
  - Provides helpful message about running certbot after configuration
- **Bug 7**: nginx config uses site-specific upstream name from `JPULSE_SITE_ID`
  - **bin/configure.js**: Calculates `UPSTREAM_NAME` from `JPULSE_SITE_ID`
  - Replaces non-word characters with underscores for safe upstream names
  - **templates/deploy/nginx.prod.conf**: Uses `%UPSTREAM_NAME%` variable
  - Enables multi-site installations on same server without upstream conflicts
  - Updated test patterns in deployment-validation.test.js files

**Multi-Site Installation Support**:
- All fixes enable smooth multi-site installations on the same server
- Each site gets unique nginx upstream name based on site ID
- MongoDB setup works correctly when authentication already exists
- Log directories properly configured per site

**Files Modified**:
- bin/configure.js (log symlink fix, upstream name calculation)
- bin/config-registry.js (Let's Encrypt auto-configuration)
- bin/mongodb-setup.sh (auto-load .env, handle existing auth)
- templates/deploy/nginx.prod.conf (use %UPSTREAM_NAME% variable)
- docs/installation.md (updated npm install command)
- docs/getting-started.md (added mongodb-setup step, updated npm install)
- docs/deployment.md (updated npm install command)
- README.md (updated npm install command)
- docs/README.md (updated npm install command)
- webapp/tests/unit/config/deployment-validation.test.js (updated test patterns)
- webapp/tests/integration/deployment-validation.test.js (updated test patterns)
- docs/dev/work-items.md (completed W-091)

**Benefits**:
- Simpler installation process - no manual .npmrc creation
- Correct log directory symlinks for each site
- MongoDB setup "just works" without manual environment loading
- Multi-site installations work seamlessly on same server
- Let's Encrypt SSL configuration is automatic
- Better error messages guide users when issues occur
- All fixes follow "don't make me think" philosophy

**Developer Experience**:
- Before: Manual .npmrc creation required for GitHub Packages
- After: Simple `npm install --registry` flag
- Before: Log symlink pointed to wrong directory
- After: Correct site-specific log directory
- Before: Must manually source .env before mongodb-setup
- After: Script auto-loads .env file
- Before: MongoDB setup fails when auth already enabled
- After: Detects and handles existing authentication
- Before: Nginx upstream conflicts in multi-site installs
- After: Site-specific upstream names prevent conflicts
- Before: Let's Encrypt paths must be manually configured
- After: Auto-configured when Let's Encrypt selected

________________________________________________
## v1.1.6, W-090, 2025-11-13

**Commit:** `W-090, v1.1.6: view: make site nav menu open/close delay configurable; restructure view.pageDecoration`

**CONFIGURABLE NAVIGATION DELAYS & RESTRUCTURED PAGE DECORATION**: Restructured `view.pageDecoration` configuration with nested structure for better site overrides, and made site navigation menu open/close delays fully configurable via `app.conf`.

**Objective**: Better site overrides for site nav menu with configurable delays for improved UX customization.

**Configuration Restructure**:
- **webapp/app.conf**: Restructured `view.pageDecoration` (breaking change)
  - Removed `OLD_pageDecoration` structure
  - New nested structure: `siteNavigation`, `breadcrumbs`, `sidebar`
  - `siteNavigation` includes delay configuration: `openDelay`, `closeDelay`, `submenuCloseDelay`
  - All delays configurable in milliseconds with sensible defaults

**Site Navigation Delay Configuration**:
- **webapp/view/jpulse-footer.tmpl**: Updated to use new structure
  - Changed `showSiteNavigation` → `siteNavigation.enabled`
  - Changed `showBreadcrumbs` → `breadcrumbs.enabled`
  - Passes delay configs to `navigation.init()` with proper string-to-number conversion
- **webapp/view/jpulse-common.js**: Complete delay system implementation
  - `navigation.init()` accepts `openDelay`, `closeDelay`, `submenuCloseDelay` options
  - Handles Handlebars string-to-number conversion automatically
  - Implements `openDelay` with cancel-on-mouse-leave logic
  - Combined open delay for both logo and dropdown hover (single `openDelay` setting)
  - Replaced all hardcoded delays (500ms, 600ms) with config values
  - Proper timeout cleanup in `_destroy()` method

**Default Delay Values**:
- `openDelay`: 300ms (delay before opening menu on hover)
- `closeDelay`: 500ms (delay before closing menu)
- `submenuCloseDelay`: 600ms (delay before closing submenus)

**User Experience Improvements**:
- Open delay cancels if mouse leaves before menu opens (prevents accidental triggers)
- Smooth hover interactions with configurable timing
- Site administrators can fine-tune delays for their specific UX needs
- Follows "don't make me think" philosophy - simple configuration in `app.conf`

**Testing**:
- **webapp/tests/unit/utils/jpulse-ui-navigation.test.js**: Updated test mocks to use new `pageDecoration` structure

**Breaking Changes**:
- `appConfig.view.pageDecoration.showSiteNavigation` → `appConfig.view.pageDecoration.siteNavigation.enabled`
- `appConfig.view.pageDecoration.showBreadcrumbs` → `appConfig.view.pageDecoration.breadcrumbs.enabled`
- `OLD_pageDecoration` removed (no backward compatibility)

**Files Modified**:
- webapp/app.conf (removed OLD_pageDecoration, kept new structure)
- webapp/view/jpulse-footer.tmpl (updated conditionals and delay config passing)
- webapp/view/jpulse-common.js (delay system implementation)
- webapp/tests/unit/utils/jpulse-ui-navigation.test.js (updated test mocks)
- docs/dev/work-items.md (completed W-090)

**Benefits**:
- Site administrators can customize menu timing for their specific UX needs
- Better structure for future page decoration features (sidebar, etc.)
- Cleaner configuration with nested structure
- No hardcoded delays - all configurable
- Proper timeout cleanup prevents memory leaks

________________________________________________
## v1.1.5, W-089, 2025-11-12

**Commit:** `W-089, v1.1.5: log: log proper external IP address when jPulse is behind a reverse proxy`

Fix bug where local IP address 127.0.0.1 was shown in the logs when jPulse is behind a reverse proxy.

________________________________________________
## v1.1.4, W-087, 2025-11-11

**Commit:** `W-087, v1.1.4: email: strategy for sending email from jPulse Framework`

**EMAIL SENDING STRATEGY**: Implemented standardized email sending capability for jPulse Framework and site applications, providing both server-side utility methods and client-side API endpoints with MongoDB-based configuration.

**Objective**: Provide standardized email sending capability for jPulse Framework and site applications with graceful fallback when email not configured.

**EmailController Implementation**:
- **webapp/controller/email.js**: NEW email controller with utility methods and API endpoint
  - Server-side utility methods: `sendEmail()`, `sendEmailFromTemplate()`, `sendAdminNotification()`
  - Client-side API endpoint: `POST /api/1/email/send` (authenticated users only)
  - MongoDB-based configuration (not app.conf)
  - Support for ports 587 (STARTTLS) and 465 (Direct SSL)
  - Test email functionality with config override
  - Error handling with structured error codes
  - Audit logging for all email sends
  - Health status reporting (`getHealthStatus()`)

**Configuration**:
- **webapp/model/config.js**: Updated to preserve empty strings for `smtpUser` and `smtpPass`
  - Explicit MongoDB `$set` with dot notation for nested fields
  - Ensures empty strings are correctly saved and retrieved
- **MongoDB Config Document**: Email settings stored in config document (ID from `ConfigController.getDefaultDocName()`)
  - Schema: `adminEmail`, `adminName`, `smtpServer`, `smtpPort`, `smtpUser`, `smtpPass`, `useTls`
  - Supports all major SMTP providers (Gmail, SendGrid, AWS SES, Office 365, Mailgun)

**Routes**:
- **webapp/routes.js**: Added `POST /api/1/email/send` route with authentication middleware

**Bootstrap Integration**:
- **webapp/utils/bootstrap.js**: Added EmailController initialization
  - Step 15: Initialize EmailController (loads config from MongoDB)
  - Proper dependency order ensures ConfigController available before EmailController

**Health Endpoint Integration**:
- **webapp/controller/health.js**: Email health status integration
  - Instance-specific email status in `/api/1/health/metrics`
  - Component health status system (config-driven)
  - Sanitization for non-admin users (obfuscates `adminEmail`)
  - Normalized JSON structure (empty strings/objects instead of null)

**Admin UI**:
- **webapp/view/admin/config.shtml**: Test email button
  - "Send Test Email" button in email settings section
  - Uses current form values for testing
  - Validates SMTP connection before sending
  - Improved dirty detection for password fields (Firefox compatibility)
  - Form population handles empty strings correctly

**Internationalization**:
- **webapp/translations/en.conf**: Added email controller i18n keys
  - `controller.email.notConfigured`, `sendSuccess`, `sendFailed`, `missingFields`, `invalidRecipient`, `internalError`
  - `view.admin.config.testEmail`, `testEmailDesc`, `testEmailNoRecipient`, `testEmailSuccess`, `testEmailFailed`, `testEmailError`
- **webapp/translations/de.conf**: German translations for all email-related messages

**Testing**:
- **webapp/tests/unit/controller/email-controller.test.js**: Unit tests for EmailController
  - Tests for `isConfigured()`, `getHealthStatus()`, `_getI18nKey()`
  - Verifies boolean return values (not strings)
- **webapp/tests/integration/email-api.test.js**: Integration tests for email API
  - Structure validation, health status integration, error code mapping

**Documentation**:
- **docs/sending-email.md**: NEW comprehensive email sending guide
  - Configuration, server-side usage, client-side API, template processing
  - SMTP provider examples, troubleshooting, security considerations
- **docs/api-reference.md**: Added Email API section
  - Complete endpoint documentation with examples
- **docs/getting-started.md**: Added link to email documentation in Next Steps
- **docs/dev/work-items.md**: Updated deliverables list

**Dependencies**:
- `nodemailer` ^6.9.8 (npm package)

**Deferred to Future (v2)**:
- Rate limiting for API endpoint
- Content filtering for spam detection

________________________________________________
## v1.1.3, W-088, 2025-11-10

**Commit:** `W-088, v1.1.2: controller: extract Handlebars processing to dedicated controller`

**HANDLEBARS PROCESSING EXTRACTION**: Extracted Handlebars template processing from ViewController to dedicated HandlebarController, providing better separation of concerns, reusable template processing API, and enabling future email template processing and client-side Handlebars expansion.

**Objective**: Create dedicated HandlebarController for all Handlebars processing logic, enabling reusable template processing API and clean separation from ViewController.

**HandlebarController Implementation**:
- **webapp/controller/handlebar.js**: NEW dedicated controller for all Handlebars processing
  - Extracted all template processing logic from ViewController
  - Clean API: `HandlebarController.expandHandlebars(req, template, context, depth)`
  - Manages its own include cache separate from ViewController template cache
  - Builds internal context with app, user, config, appConfig, url, and i18n data
  - Context filtering based on authentication status (protects sensitive config paths)
  - Wildcard path filtering support (`appConfig.**.port`, `appConfig.**.password`)
  - Event-driven config refresh via Redis broadcast (`controller:config:data:changed`)
  - Graceful fallback when Redis unavailable (local callback processing)

**API Endpoints**:
- **POST /api/1/handlebar/expand**: Client-side Handlebars expansion endpoint
  - Expands Handlebars expressions with server-side context
  - Optional custom context augmentation
  - Context filtering based on authentication status
  - Supports long templates and complex nested objects (POST for JSON body)
- **GET /api/1/config/_default**: Default configuration endpoint (reserved `_default` ID)
- **PUT /api/1/config/_default**: Default configuration upsert endpoint

**ConfigController Enhancements**:
- **webapp/controller/config.js**: Enhanced with default document name management
  - Static `getDefaultDocName()` method for consistent access
  - Configurable default document ID via `appConfig.controller.config.defaultDocName`
  - `_default` reserved identifier resolution in get/upsert methods
  - Generic broadcast event publishing (`controller:config:data:changed`)
  - Clean separation of concerns (no direct HandlebarController dependency)

**ViewController Refactoring**:
- **webapp/controller/view.js**: Removed Handlebars processing logic
  - Deleted `processHandlebars()` method (now calls `HandlebarController.expandHandlebars()`)
  - Removed `includeCache` and `globalConfig` properties (moved to HandlebarController)
  - Removed `ContextExtensions` import (only needed in HandlebarController)
  - Clean cache separation: ViewController manages `templateCache`, HandlebarController manages `includeCache`
  - Updated `getCacheStats()` to return only template cache stats
  - Updated `isSPA()` to use `this.templateCache` instead of HandlebarController cache

**Redis Manager Enhancement**:
- **webapp/utils/redis-manager.js**: Graceful fallback for single-instance deployments
  - `publishBroadcast()` now processes local callbacks when Redis unavailable
  - Transparent broadcast mechanism (works in both single and multi-instance environments)
  - Ensures messages are always processed locally if Redis is not active

**Bootstrap Integration**:
- **webapp/utils/bootstrap.js**: Added HandlebarController and ConfigController initialization
  - Step 13: Initialize ConfigController (reads default document name from app.conf)
  - Step 14: Initialize HandlebarController (loads default config, registers broadcast callback)
  - Proper dependency order ensures ConfigController available before HandlebarController

**Internationalization**:
- **webapp/utils/i18n.js**: Renamed `processI18nHandlebars()` to `expandI18nHandlebars()`
  - Consistent naming with HandlebarController API
  - Updated all references in ViewController and tests

**Configuration**:
- **webapp/app.conf**: Added HandlebarController configuration
  - `controller.config.defaultDocName`: Configurable default config document ID
  - `controller.handlebar.contextFilter`: Authentication-based context filtering rules
  - `controller.handlebar.maxIncludeDepth`: Maximum template include depth
  - `controller.handlebar.cacheIncludes`: Include cache configuration

**Testing**:
- **webapp/tests/unit/controller/view.test.js**: Updated for HandlebarController
  - All `ViewController.processHandlebars()` calls replaced with `HandlebarController.expandHandlebars()`
  - Added ConfigController and HandlebarController initialization in `beforeAll`
  - Mocked RedisManager and config model for proper test isolation
- **webapp/tests/unit/controller/template-includes.test.js**: Updated with same initialization pattern
- **webapp/tests/unit/utils/redis-config.test.js**: Updated expectation for graceful fallback behavior
- **webapp/tests/unit/utils/broadcast-channels.test.js**: Updated channel name to `controller:config:data:changed`
- **webapp/tests/unit/translations/i18n-variable-content.test.js**: Updated method name to `expandI18nHandlebars`
- **webapp/tests/helpers/test-utils.js**: Added controller config sections to fallback appConfig

**Documentation**:
- **docs/api-reference.md**: Complete API documentation
  - Added "Handlebars Template Processing API" section with `POST /api/1/handlebar/expand`
  - Documented `/api/1/config/_default` endpoints
  - Explained why POST is used (URL length limits, complex data, common pattern)
  - Included request/response examples, use cases, and security notes
- **docs/handlebars.md**: Added client-side expansion section
  - Mentioned `/api/1/handlebar/expand` endpoint
  - Linked to `front-end-development.md` for complete documentation
- **docs/template-reference.md**: Added client-side expansion section
  - Explained when to use the API endpoint
  - Included example with custom context
  - Linked to `front-end-development.md`
- **docs/front-end-development.md**: Comprehensive Handlebars section
  - Explained server-side vs client-side expansion
  - Detailed "When to Use Client-Side Expansion" guidelines
  - Three real-world examples (Dynamic User Card, Email Template Preview, Notification Messages)
  - Documented available server context and security filtering
  - Error handling examples and performance considerations

**Files Modified**:
- webapp/controller/handlebar.js (NEW - dedicated Handlebars controller)
- webapp/controller/view.js (removed Handlebars processing, delegates to HandlebarController)
- webapp/controller/config.js (default document name management, generic broadcast events)
- webapp/routes.js (added `/api/1/handlebar/expand`, added `/api/1/config/_default` routes)
- webapp/utils/bootstrap.js (added ConfigController and HandlebarController initialization)
- webapp/utils/i18n.js (renamed `processI18nHandlebars` to `expandI18nHandlebars`)
- webapp/utils/redis-manager.js (graceful fallback for local callbacks)
- webapp/app.conf (added controller.config and controller.handlebar sections)
- webapp/view/admin/config.shtml (updated to use `/api/1/config/_default`)
- webapp/tests/unit/controller/view.test.js (updated for HandlebarController)
- webapp/tests/unit/controller/template-includes.test.js (updated initialization)
- webapp/tests/unit/utils/redis-config.test.js (updated graceful fallback expectation)
- webapp/tests/unit/utils/broadcast-channels.test.js (updated channel name)
- webapp/tests/unit/translations/i18n-variable-content.test.js (updated method name)
- webapp/tests/helpers/test-utils.js (added controller config to fallback)
- webapp/translations/en.conf (added controller.handlebar translations)
- webapp/translations/de.conf (added controller.handlebar translations)
- docs/api-reference.md (complete API documentation)
- docs/handlebars.md (client-side expansion section)
- docs/template-reference.md (client-side expansion section)
- docs/front-end-development.md (comprehensive Handlebars section)
- docs/CHANGELOG.md (v1.1.2 entry)
- docs/dev/work-items.md (W-088 deliverables)

**Benefits**:
- ✅ Better separation of concerns (ViewController vs HandlebarController)
- ✅ Reusable template processing API for controllers and views
- ✅ Client-side Handlebars expansion with server context
- ✅ Context filtering protects sensitive configuration data
- ✅ Event-driven config refresh ensures multi-instance consistency
- ✅ Graceful fallback for single-instance deployments
- ✅ Enables future email template processing (W-087)
- ✅ Clean API design following "don't make me think" philosophy

**Developer Experience**:
- Before: Handlebars processing mixed with view loading logic
- After: Dedicated HandlebarController with clean, reusable API
- Before: No client-side Handlebars expansion capability
- After: `POST /api/1/handlebar/expand` endpoint with full server context
- Before: Hard-coded default config document ID
- After: Configurable via `appConfig.controller.config.defaultDocName`
- Before: Direct coupling between ConfigController and HandlebarController
- After: Event-driven architecture with generic broadcast events
- Before: Cache pollution between ViewController and Handlebars processing
- After: Clean separation with dedicated caches per controller

________________________________________________
## v1.1.2, W-088, 2025-11-10

**⚠️ NOTE: v1.1.2 was published with test failures. Please use v1.1.3 instead.**

________________________________________________
## v1.1.1, W-086, 2025-11-06

**Commit:** `W-086, v1.1.1: gen-ai: review developer facing doc and AI agent facing doc`

**GEN-AI DOCUMENTATION IMPROVEMENTS**: Streamlined AI-facing documentation for better AI consumption and added educational content for new users, making Gen-AI development (vibe coding) more effective.

**Objective**: Create concise, complete, and AI-tailored genai-instructions.md while maintaining educational value for new users in genai-development.md.

**Streamlined AI-Facing Documentation**:
- **docs/genai-instructions.md**: Reduced from 714 to 563 lines (~21% reduction)
  - Removed redundant "Common Mistakes to Avoid" section (80 lines)
  - Streamlined Chain of Thought, No Guessing, and Gen-AI History Log directives
  - Clarified "Client-Side Heavy" applies to application pages, not content pages
  - Added "Creating Reusable Templates" section with `.shtml` vs `.tmpl` guidance
  - Added "When You DON'T Need Controllers/Models" decision framework
  - Enhanced "Creating a View Template" with template include patterns
  - Streamlined "Response Guidelines" (removed verbose examples)
  - Condensed "Framework Philosophy" section

**Enhanced User-Facing Documentation**:
- **docs/genai-development.md**: Added educational content for new users
  - Added "Best Practices for Effective AI Assistance" section
  - Explains Chain of Thought reasoning, avoiding hallucination, maintaining development logs
  - Provides context for new users while keeping AI-facing doc concise

**Documentation Fixes**:
- Fixed markdown rendering issues by escaping HTML tags (`<style>`, `<script>`) in documentation
- Ensures proper rendering in markdown viewers

**Files Modified**:
- docs/genai-instructions.md (streamlined, AI-focused)
- docs/genai-development.md (added educational section)
- docs/CHANGELOG.md (v1.1.1 entry)
- docs/dev/work-items.md (W-086 deliverables)

**Benefits**:
- ✅ More concise AI-facing documentation (easier for AI to process)
- ✅ Clearer guidance on when to use controllers/models vs template-only pages
- ✅ Better template development patterns documented
- ✅ Educational content for new Gen-AI users
- ✅ Fixed markdown rendering issues

**Developer Experience**:
- Before: 714-line AI instructions doc with redundant sections
- After: 563-line streamlined doc focused on AI consumption
- Before: Missing guidance on template development and when NOT to use MVC
- After: Complete patterns for templates and decision framework for MVC usage
- Before: No educational content for new Gen-AI users
- After: Best practices section explaining effective AI assistance

________________________________________________
## v1.1.0, W-085, 2025-11-05

**Commit:** `W-085, v1.1.0: unified CLI tools with intuitive npx jpulse commands`

**UNIFIED CLI TOOLS & DEVELOPER EXPERIENCE**: Complete unified command-line interface with single `npx jpulse` entry point, configuration-driven version bumping, and intuitive update workflow following "don't make me think" philosophy.

**Objective**: Create intuitive, unified tools environment for site developers with single entry point, zero configuration, and consistent command patterns.

**Unified CLI Entry Point**:
- **package.json**: Single `"jpulse": "./bin/jpulse-framework.js"` bin entry replaces multiple `jpulse-*` commands
  - Removed `jpulse-configure` and `jpulse-update` separate entries
  - All commands now accessible via `npx jpulse <command>`
- **bin/jpulse-framework.js**: Central command dispatcher with context-aware help
  - Auto-detects execution context (framework repo vs site)
  - Shows relevant commands based on context
  - Passes through all arguments to dispatched scripts
  - Framework context: shows only `bump-version` command
  - Site context: shows all site development commands

**Configuration-Driven Version Bumping**:
- **bin/bump-version.js**: Generalized for both framework and site use cases
  - Removed hard-coded configuration
  - Context-aware config discovery: `bin/bump-version.conf` (framework) or `site/webapp/bump-version.conf` (site)
  - Shows helpful instructions if config file missing
  - Supports both `npx jpulse bump-version` and direct `node bin/bump-version.js` usage
- **bin/bump-version.conf**: NEW framework configuration file (151 lines)
  - Defines file patterns, update rules, and header patterns for framework versioning
  - JavaScript object format (consistent with app.conf style)
- **templates/webapp/bump-version.conf.tmpl**: NEW site template (78 lines)
  - Automatically copied during `npx jpulse configure` initial setup
  - Site-specific versioning configuration with placeholders
  - Includes comprehensive file patterns for typical jPulse sites

**Intuitive Update Workflow**:
- **bin/jpulse-update.js**: Enhanced with automatic package update
  - Single command for common case: `npx jpulse update` (updates to latest + syncs)
  - Version argument support: `npx jpulse update @jpulse-net/jpulse-framework@version` (beta/RC)
  - Automatically runs `npm update` or `npm install` before syncing files
  - Follows familiar npm pattern for edge cases
  - Eliminates two-step process for better developer experience

**Site Setup Integration**:
- **bin/configure.js**: Enhanced to copy version bumping template
  - Automatically creates `site/webapp/bump-version.conf` during initial site setup
  - Updated all command references to `npx jpulse <command>` format
  - Simplified site package.json (removed all `jpulse-*` npm scripts)

**Comprehensive Documentation Updates**:
- **docs/installation.md**: Updated with single-command update workflow
- **docs/getting-started.md**: Updated framework updates section with new command syntax
- **docs/deployment.md**: Simplified troubleshooting with new update command
- **docs/dev/working/W-085-npx-tools-strategy.md**: Complete strategy documentation (621 lines)
  - Design decisions, command structure, configuration file strategy
  - Implementation details, usage examples, migration guide
- **README.md**: Updated all command references to unified `npx jpulse` format
- **docs/README.md**: Updated Quick Start and all command references
- **templates/README.md**: Updated command references for site developers
- **templates/deploy/README.md**: Updated deployment command references
- **docs/genai-development.md**: Updated command references
- **docs/dev/publishing.md**: Updated command references
- **docs/dev/README.md**: Updated CLI tools description

**Files Modified**:
- bin/jpulse-framework.js (unified dispatcher, context-aware help)
- bin/jpulse-update.js (automatic package update, version argument support)
- bin/bump-version.js (configuration-driven, context-aware)
- bin/bump-version.conf (NEW - framework versioning config)
- bin/configure.js (template copying, command reference updates)
- package.json (single bin entry)
- templates/webapp/bump-version.conf.tmpl (NEW - site versioning template)
- docs/installation.md (single-command update workflow)
- docs/getting-started.md (updated command syntax)
- docs/deployment.md (simplified troubleshooting)
- docs/dev/work-items.md (W-085 deliverables)
- docs/dev/working/W-085-npx-tools-strategy.md (complete strategy doc)
- README.md (unified command references)
- docs/README.md (updated command references)
- templates/README.md (updated command references)
- templates/deploy/README.md (updated command references)
- docs/genai-development.md (updated command references)
- docs/dev/publishing.md (updated command references)
- docs/dev/README.md (updated CLI description)
- docs/CHANGELOG.md (v1.1.0 entry)

**Benefits**:
- ✅ Single entry point (`npx jpulse`) for all framework tools
- ✅ Intuitive command structure following "don't make me think" principle
- ✅ Configuration-driven version bumping (no hard-coded configs)
- ✅ Automatic package update in single command (no two-step process)
- ✅ Context-aware help and command availability
- ✅ Consistent command patterns across all tools
- ✅ Zero configuration for common use cases
- ✅ Better developer experience with shorter, memorable commands

**Developer Experience**:
- **Before**: `npm run jpulse-update` or `npx jpulse-framework jpulse-update` (inconsistent, verbose)
- **After**: `npx jpulse update` (intuitive, consistent)
- **Before**: Two-step update process (npm update + npx jpulse update)
- **After**: Single command (`npx jpulse update`) handles everything
- **Before**: Hard-coded version bumping config (not reusable)
- **After**: Configuration files for both framework and sites (reusable, customizable)

**Migration Notes**:
- Existing sites: Update `package.json` to remove `jpulse-*` npm scripts (optional, commands still work)
- Framework developers: Can use either `npx jpulse bump-version` or `node bin/bump-version.js`
- Site developers: `site/webapp/bump-version.conf` created automatically on initial setup via `npx jpulse configure`

________________________________________________
## v1.0.4, W-083, 2025-11-04

**Commit:** `W-083, v1.0.4: minor v1.0 enhancements & bug fixes`

**MINOR RELEASE ENHANCEMENTS & BUG FIXES**: Documentation publishing improvements, enhanced UI dialog widgets, comprehensive UI reference documentation, and security documentation.

**Objective**: Stabilize v1.0 release with minor enhancements and bug fixes for improved developer experience and documentation completeness.

**Documentation Publishing Fix**:
- **bin/jpulse-update.js**: Fixed `.jpulse-ignore` support - docs publishing now respects ignore patterns
  - Added `loadIgnorePatterns()` and `shouldIgnore()` functions (duplicated from markdown controller)
  - Modified `syncDirectory()` to accept `baseDir` and `ignorePatterns` parameters
  - Files/directories matching `.jpulse-ignore` patterns are now skipped during docs publishing
  - Ensures consistent behavior between markdown documentation serving and framework update process

**UI Dialog Widget Enhancements**:
- **jPulse.UI.successDialog()**: Added new success dialog with green header styling (#28a745)
  - Consistent API with `alertDialog()` and `infoDialog()`
  - Supports both `(message, title)` and `(message, options)` signatures
  - Integrated with i18n system (en/de translations)
- **jPulse.UI.alertDialog() & infoDialog()**: Enhanced to detect 2nd parameter type
  - String → treated as title: `dialog(message, 'Title')`
  - Object → treated as options: `dialog(message, {title: 'Title', width: 400})`
  - Backward compatible with existing code
- **Dialog Refactoring**: Unified `alertDialog/infoDialog/successDialog` to use `confirmDialog()` internally
  - Reduced code duplication by centralizing dialog logic
  - All simple dialogs now use `confirmDialog()` with appropriate defaults and styling
  - Improved z-index management for different dialog types
  - Enhanced `confirmDialog()` to accept `type` option for styling (alert/info/success/confirm)

**Comprehensive UI Reference Documentation**:
- **docs/jpulse-ui-reference.md**: Complete `jPulse.UI.*` widget reference documentation (NEW, 531 lines)
  - Toast Notifications: Complete API with examples
  - Dialog Widgets: `alertDialog`, `infoDialog`, `successDialog`, `confirmDialog` with full API details
  - Collapsible Components: Usage patterns and configuration
  - Accordion Component: Grouped sections with mutual exclusion
  - Tab Interface: Navigation and panel tabs
  - Source Code Display: Syntax-highlighted code blocks
  - All sections include parameters, return values, and code examples
- **docs/front-end-development.md**: Updated with abbreviated widget list and links to UI reference
  - Replaced detailed widget sections with overview and links to comprehensive reference
  - Fixed bug: `jPulse.collapsible.register()` → `jPulse.UI.collapsible.register()`
  - Improved discoverability with clear navigation to detailed documentation

**Security Documentation**:
- **docs/security-and-auth.md**: Comprehensive security and authentication documentation (NEW, 505 lines)
  - Authentication: Session management, password hashing, roles, login/logout flows
  - Authorization: Role-based access control, middleware patterns
  - Security Features: Session security, password policy, nginx headers, rate limiting, SSL/TLS, input validation
  - Deployment Security: Production deployment considerations
  - Security Gaps: Documented known gaps (CSRF, MFA, OAuth2/LDAP, CSP tightening) for future work
- **Security Documentation Links**: Added to multiple documentation files
  - `docs/README.md`: Added Security section with link
  - `docs/getting-started.md`: Added to Next Steps section
  - `docs/api-reference.md`: Added note in Authentication & Authorization section
  - `docs/deployment.md`: Added note in Security Considerations section

**Work Item Management**:
- **W-084 work item**: Created with security hardening to-dos for future enhancements
  - CSRF Protection, Password Policy Enforcement, Account Lockout
  - Security Audit Logging, Session Management UI, Security Headers Audit
  - Dependency Scanning, Security Monitoring, MFA/OAuth2/LDAP (planned as plugins)

**Other Enhancements**:
- **webapp/static/apple-touch-icon.png**: Updated from webapp/static/images/jpulse-logo/apple-touch-icon.png
- **webapp/view/jpulse-examples/ui-widgets.shtml**: Updated with new dialog signatures and `successDialog` examples
- **webapp/translations/en.conf & de.conf**: Added `successDialog` i18n translations (title, message, oKButton)

**Files Modified**:
- bin/jpulse-update.js (added .jpulse-ignore support)
- webapp/view/jpulse-common.js (dialog enhancements, successDialog addition)
- webapp/view/jpulse-common.css (successDialog styling)
- webapp/translations/en.conf (successDialog i18n)
- webapp/translations/de.conf (successDialog i18n)
- webapp/view/jpulse-examples/ui-widgets.shtml (updated examples)
- webapp/static/apple-touch-icon.png (updated icon)
- docs/jpulse-ui-reference.md (NEW - complete UI widget reference)
- docs/front-end-development.md (updated widget list, fixed collapsible reference)
- docs/security-and-auth.md (NEW - comprehensive security documentation)
- docs/README.md (added security doc link)
- docs/getting-started.md (added security doc link)
- docs/api-reference.md (added security doc link)
- docs/deployment.md (added security doc link)
- docs/dev/work-items.md (W-083 deliverables, W-084 creation)
- docs/CHANGELOG.md (v1.0.4 entry)

**Benefits**:
- ✅ Documentation publishing now respects `.jpulse-ignore` patterns consistently
- ✅ Enhanced UI dialog API with flexible signatures and new success dialog
- ✅ Comprehensive UI widget reference documentation for developers
- ✅ Complete security documentation covering authentication, authorization, and best practices
- ✅ Improved developer experience with better documentation organization
- ✅ Clear identification of security gaps for future hardening (W-084)

**Developer Experience**:
- More intuitive dialog API: `infoDialog('Message', 'Title')` or `infoDialog('Message', {title: 'Title', width: 400})`
- Complete UI widget reference in one place for easy lookup
- Comprehensive security guide for implementing secure applications
- Better documentation organization with clear navigation paths

________________________________________________
## v1.0.3, W-076, 2025-11-02

**Commit:** `W-076, v1.0.3: Fix Framework Update Process - Replace Broken Lifecycle Hooks with Working Wrapper Script`

**BUGFIX**: Fixed broken automatic framework update feature from v1.0.2. Replaced non-functional npm lifecycle hooks with reliable wrapper script approach for seamless framework updates.

**Objective**: Restore working framework update process by replacing the broken lifecycle hook approach from v1.0.2 with a reliable wrapper script that combines package update and file synchronization.

**Framework Update Process Fix**:
- **bin/configure.js**: Replaced non-functional `postupdate` hook with working `"update"` script
  - `"update"` script: `"npm update @jpulse-net/jpulse-framework && npm run jpulse-update"`
  - Combines package update and file sync in single command
  - Works reliably unlike lifecycle hooks
  - Follows "don't make me think" philosophy - single command does everything
- **bin/check-and-sync.js**: REMOVED (non-functional lifecycle hook approach)
- **bin/update.js**: REMOVED (superseded by npm script)
- Documentation updated to use `npm run update` instead of `npm update @jpulse-net/jpulse-framework`

**Root Cause Resolution**:
- v1.0.2 attempted automatic sync via npm lifecycle hooks (`postupdate`/`postinstall`)
- npm hooks only run for workspace-level operations (`npm install`), not package-specific operations (`npm install/update <package>`)
- This caused automatic sync to never execute for the intended use case
- v1.0.3 resolves this by using explicit npm script wrapper approach

**Documentation Updates**:
- **docs/installation.md**: Updated to use `npm run update`, removed references to automatic hooks
- **docs/getting-started.md**: Updated framework update instructions
- **docs/deployment.md**: Updated troubleshooting section

**Files Modified**:
- bin/configure.js (removed postupdate, added update script)
- docs/installation.md (updated update instructions)
- docs/getting-started.md (updated update instructions)
- docs/deployment.md (updated troubleshooting)
- docs/CHANGELOG.md (v1.0.3 entry)

**Files Removed**:
- bin/check-and-sync.js (non-functional lifecycle hook approach)
- bin/update.js (superseded by npm script)

**Benefits**:
- ✅ Framework update process now works reliably
- ✅ Single command `npm run update` updates package and syncs files
- ✅ Clear separation: `npm run update` (recommended) vs `npm run jpulse-update` (manual sync only)
- ✅ "Don't make me think" developer experience restored

**Developer Experience**:
- Simple workflow: Run `npm run update` to update framework and sync files
- No confusion: Explicit wrapper script makes update process transparent
- Reliable: Wrapper approach works consistently across all npm versions

________________________________________________
## v1.0.2, W-076, 2025-11-02

**Commit:** `W-076, v1.0.2: Framework Comparison Documentation, Automated GitHub Packages Registry Configuration, and Simplified Update Process`

**NOTE**: This release attempted to simplify the framework update process using npm lifecycle hooks, but the automatic sync feature did not work as intended. Please see v1.0.3 for the fix.

**DOCUMENTATION & DEVELOPER EXPERIENCE ENHANCEMENTS**: Framework comparison documentation, automated GitHub Packages registry configuration, and attempt to simplify update process with automatic file synchronization.

**Objective**: Provide framework comparison documentation, automate GitHub Packages registry configuration, and simplify the framework update process to a single command with automatic file synchronization.

**Framework Comparison Documentation**:
- **docs/framework-comparison.md**: Comprehensive comparison guide (562 lines)
  - Quick comparison matrix comparing jPulse with 8 major frameworks
  - Detailed comparisons with NestJS, LoopBack, Sails.js, Next.js/Nuxt, Django, Rails, Laravel, Express
  - Low-code platform comparisons (OutSystems, Mendix)
  - Key jPulse differentiators highlighted
  - Decision framework for choosing jPulse vs alternatives
  - Migration considerations and cost comparisons
  - Comprehensive analysis for enterprise decision-makers

**Automated GitHub Packages Registry Configuration**:
- **bin/configure.js**: Automated `.npmrc` creation for GitHub Packages
  - `createNpmrc()` function automatically creates `.npmrc` with `@jpulse-net:registry=https://npm.pkg.github.com`
  - Handles existing `.npmrc` files gracefully (checks for existing config, appends if needed)
  - Creates `.npmrc` for both new sites and existing sites (even when exiting configuration)
  - Eliminates manual `npm config set @jpulse-net:registry` steps
  - Follows "don't make me think" philosophy - zero manual configuration needed

**Simplified Update Process (Attempted)**:
- **bin/configure.js**: Added `postupdate` hook integration (later found to be non-functional)
  - Attempted to automatically sync framework files after `npm update @jpulse-net/jpulse-framework`
  - **Issue**: npm lifecycle hooks (`postinstall`/`postupdate`) only run for workspace-level `npm install`, not for specific package updates
  - This caused automatic sync to never execute for the intended use case
  - Fixed in v1.0.3 with wrapper script approach
- **bin/check-and-sync.js**: Created to detect framework version changes and trigger `jpulse-update`
  - Removed in v1.0.3 as lifecycle hook approach proved unreliable

**Documentation Updates**:
- **README.md**: Updated to v1.0.2 with framework comparison reference
- **docs/README.md**: Updated to v1.0.2, added framework-comparison.md to documentation guide
- **docs/CHANGELOG.md**: Complete v1.0.2 entry

**Known Issues**:
- Automatic framework file synchronization did not work as intended
- Lifecycle hooks did not trigger for package-specific update operations
- Users needed to manually run `npm run jpulse-update` after package updates

**Resolution in v1.0.3**:
- Replaced lifecycle hook approach with explicit `npm run update` wrapper script
- Wrapper script reliably combines package update and file sync
- Clear separation between `npm run update` (recommended) and `npm run jpulse-update` (manual sync only)

**Files Modified**:
- bin/configure.js (added createNpmrc() function, attempted postupdate hook integration)
- bin/check-and-sync.js (NEW - automatic framework sync detection, removed in v1.0.3)
- docs/framework-comparison.md (NEW - 562 lines)
- docs/deployment.md (updated troubleshooting)
- README.md (version and highlights updated)
- docs/README.md (version, highlights, and documentation guide updated)
- docs/CHANGELOG.md (v1.0.2 entry added)

**Benefits**:
- ✅ Comprehensive framework evaluation guide for decision-makers
- ✅ Zero manual registry configuration required
- ⚠️ Simplified update process (intended) - required fix in v1.0.3

________________________________________________
## v1.0.1, W-076, 2025-11-01

**Commit:** `W-076, v1.0.1: Framework Comparison Documentation and Automated GitHub Packages Registry Configuration`

**DOCUMENTATION & DEVELOPER EXPERIENCE ENHANCEMENTS**: Comprehensive framework comparison guide and automated GitHub Packages registry configuration eliminating manual setup steps for seamless package installation.

**Objective**: Provide framework comparison documentation to help organizations evaluate jPulse against alternatives, and automate GitHub Packages registry configuration to eliminate manual setup friction.

**Framework Comparison Documentation**:
- **docs/framework-comparison.md**: NEW comprehensive comparison guide (562 lines)
  - Quick comparison matrix comparing jPulse with 8 major frameworks
  - Detailed comparisons with NestJS, LoopBack, Sails.js, Next.js/Nuxt, Django, Rails, Laravel, Express
  - Low-code platform comparisons (OutSystems, Mendix)
  - Key jPulse differentiators highlighted
  - Decision framework for choosing jPulse vs alternatives
  - Migration considerations and cost comparisons
  - Comprehensive analysis for enterprise decision-makers

**Automated GitHub Packages Registry Configuration**:
- **bin/configure.js**: Automated `.npmrc` creation for GitHub Packages
  - `createNpmrc()` function automatically creates `.npmrc` with `@jpulse-net:registry=https://npm.pkg.github.com`
  - Handles existing `.npmrc` files gracefully (checks for existing config, appends if needed)
  - Creates `.npmrc` for both new sites and existing sites (even when exiting configuration)
  - Eliminates manual `npm config set @jpulse-net:registry` steps
  - Follows "don't make me think" philosophy - zero manual configuration needed
- Automatic `.npmrc` creation integrated into site setup flow
- Works for new site creation and site reconfiguration

**Documentation Updates**:
- **README.md**: Updated to v1.0.1 with framework comparison reference
- **docs/README.md**: Updated to v1.0.1, added framework-comparison.md to documentation guide
- **docs/CHANGELOG.md**: Complete v1.0.1 entry

**Benefits**:
- ✅ Comprehensive framework evaluation guide for decision-makers
- ✅ Zero manual registry configuration required
- ✅ Seamless package installation experience
- ✅ Enhanced developer onboarding
- ✅ Clear framework comparison for organizational decision-making

**Files Modified**:
- bin/configure.js (added createNpmrc() function and integration)
- docs/framework-comparison.md (NEW - 562 lines)
- README.md (version and highlights updated)
- docs/README.md (version, highlights, and documentation guide updated)
- docs/CHANGELOG.md (v1.0.1 entry added)

**Next Steps**:
- Framework comparison guide available for jpulse.net and other sites
- Automated registry configuration working for all new sites
- Enhanced developer experience eliminates manual setup steps

________________________________________________
## v1.0.0, W-076, 2025-11-01

**Commit:** `W-076, v1.0.0: Redis Infrastructure for a Scalable jPulse Framework`

**PRODUCTION MILESTONE - REDIS INFRASTRUCTURE FOR SCALABLE MULTI-INSTANCE DEPLOYMENTS**: Complete implementation of production-ready Redis infrastructure enabling scalable multi-instance and multi-server deployments with zero-configuration auto-discovery, Application Cluster Broadcasting, WebSocket real-time communication, aggregated health metrics, Redis-based session sharing, and enterprise-grade clustering capabilities.

**Objective**: Enable jPulse Framework to work with full functionality across multiple Node.js instances (PM2 cluster) on a single app server and across multiple app servers in a load-balanced configuration, providing seamless scaling without sacrificing features or developer experience.

**Key Achievements**:
- ✅ **Zero-Configuration Architecture**: Complete auto-discovery eliminates all manual route registration and controller initialization
- ✅ **Production-Ready Redis Infrastructure**: Comprehensive Redis support for sessions, broadcasting, WebSocket coordination, and health metrics
- ✅ **Enterprise Clustering**: Multi-instance and multi-server deployments with seamless coordination
- ✅ **Real-Time Communication**: Application Cluster Broadcasting and WebSocket support for collaborative applications
- ✅ **Enterprise Licensing**: BSL 1.1 with commercial licensing options
- ✅ **AI-Assisted Development**: Comprehensive Gen-AI guides for modern development workflows

**Core Redis Infrastructure**:
- **webapp/app.conf**: Comprehensive Redis configuration (single/cluster modes, connection prefixes/TTLs)
- **site/webapp/app.conf.tmpl**: Redis configuration overrides for site owners
- **webapp/utils/redis-manager.js**: Centralized Redis connection management with graceful fallback
  - Redis/Memory/MongoDB session store hierarchy
  - Centralized broadcast message handling with pattern-based channel matching
  - Channel schema validation (model:/view:/controller: prefixes required)
  - omitSelf flag support for preventing echo messages
  - MongoDB connection status caching
- **webapp/utils/bootstrap.js**: Integrated Redis initialization and session store configuration
- **webapp/app.js**: Simplified session middleware using bootstrap-provided session store
- **System Metadata**: Created appConfig.system as single source of truth (hostname, serverName, serverId, pm2Id, pid, instanceName, instanceId, docTypes)

**Zero-Configuration Auto-Discovery Architecture**:
- **webapp/utils/site-controller-registry.js**: Auto-discovers site controllers and API methods using regex pattern matching
  - Scans `site/webapp/controller/` on startup
  - Detects all `static async api*()` methods automatically
  - Infers HTTP method (GET/POST/PUT/DELETE) from method name
  - Registers Express routes at `/api/1/{controllerName}`
  - Calls `static async initialize()` if present
  - All internal methods prefixed with `_` to separate public/private API
- **webapp/controller/view.js**: Converted to static class pattern with automatic SPA detection
  - `static isSPA(namespace)` with caching for automatic SPA detection
  - Scans for Vue Router, history.pushState + popstate patterns
  - Dynamic route creation matching all SPA sub-paths
- **webapp/utils/bootstrap.js**: Centralized initialization in proper dependency order
  - Step 11: SiteControllerRegistry initialization
  - Step 12: ContextExtensions initialization
  - Step 13: viewRegistry creation for routes.js compatibility
  - Step 14: WebSocketController class availability
- **webapp/routes.js**: Eliminated all hardcoded controller imports and route registrations
  - Fixed static method context binding with arrow functions
  - Dynamic API route registration via SiteControllerRegistry
  - Automatic SPA route pattern generation

**Session Management**:
- **webapp/utils/redis-manager.js**: `configureSessionStore()` with Redis/Memory/MongoDB fallback hierarchy
- Global RedisManager availability for all controllers
- Changed `user.authenticated` to `user.isAuthenticated` in session and Handlebars context

**Broadcasting System**:
- **webapp/controller/broadcast.js**: REST API for cross-instance broadcasting with callback system
- **webapp/controller/view.js**: Config refresh broadcasting and self-registered callbacks
- **webapp/controller/config.js**: Integrated with view controller broadcast system
- **webapp/utils/redis-manager.js**: Centralized broadcast message handling with specificity-based channel matching
- **Channel Schema**: Strict validation requiring `model:`, `view:`, `controller:` prefixes
- **omitSelf Support**: Default `true` for controller/model channels, `false` for view channels
- **webapp/translations/en.conf + de.conf**: Broadcast-specific i18n keys

**WebSocket Infrastructure**:
- **webapp/controller/appCluster.js**: NEW WebSocket-to-Redis bridge for real-time client sync
- **webapp/controller/websocket.js**: Migrated endpoints from `/ws/` to `/api/1/ws/` for API consistency
- **webapp/controller/websocket.js**: Redis-based cross-instance WebSocket broadcasting (HTTP fallbacks removed)
- **webapp/view/admin/websocket-test.shtml**: Updated for new endpoint structure
- **webapp/view/admin/websocket-status.shtml**: Updated for new endpoint structure
- **site/webapp/controller/helloWebsocket.js**: Updated namespace registration for new endpoints

**Health Metrics Clustering**:
- **webapp/controller/health.js**: Redis-based health metrics aggregation across instances
  - Automatic instance discovery with 30s broadcast + 90s TTL
  - Graceful shutdown broadcasting (removes instances immediately from cluster metrics)
  - omitSelf: true prevents duplicate local instance entries in metrics
  - Cache system data, shared among pm2 instances and redis
  - Request/error tracking with 1-minute rolling window (trackRequest(), trackError())
  - Enhanced instance data: version, release, environment, database status, CPU, memory%, requests/min, errors/min, error rate
- Enhanced `/api/1/health/metrics` endpoint with cluster-wide statistics
- **webapp/controller/log.js**: Integrated automatic request/error tracking for health metrics
- **webapp/utils/bootstrap.js**: Registered HealthController globally for LogController access
- **webapp/view/admin/system-status.shtml**: Enhanced Instance Details display with all new metrics
- **webapp/app.js**: Graceful shutdown calls HealthController.shutdown() to broadcast removal

**Client-Side Enhancements**:
- **webapp/view/jpulse-common.js**: Configurable WebSocket UUID storage (session/local/memory)
- **webapp/view/jpulse-common.js**: jPulse.appCluster API for instance info and broadcasting
- **webapp/view/jpulse-common.js**: jPulse.appCluster.fetch() wrapper for automatic UUID injection in API calls
- **site/webapp/view/hello-websocket/templates/code-examples.tmpl**: Comprehensive WebSocket documentation with UUID storage

**Example Applications**:
- `/hello-app-cluster/index.shtml` - Overview
- `/hello-app-cluster/notifications.shtml` - App showcasing client-side broadcasting pattern
- `/hello-app-cluster/collaborative-todo.shtml` - To-do app showcasing server-side (full MVC) broadcasting pattern
- **site/webapp/controller/helloClusterTodo.js**: Refactored to use HelloTodoModel, adhering to MVC
- `/hello-app-cluster/code-examples.shtml` - Updated with accurate, final code examples for both patterns
- `/hello-app-cluster/architecture.shtml` - Updated with accurate architecture diagrams and component roles

**UI/UX Improvements**:
- **webapp/view/admin/logs.shtml**: Better i18n without concatenating i18n strings (Japanese language support)
- **site/webapp/view/hello-websocket/templates/code-examples.tmpl**: Escaped HTML in pre blocks for proper rendering
- **site/webapp/view/hello-todo/todo-app.shtml**: Replaced "loading..." message with spinner icon (eliminates page reload flicker)
- **site/webapp/view/hello-todo/code-examples.shtml**: Escaped HTML in pre blocks for proper rendering
- **webapp/view/user/profile.shtml**: Fixed async loading race condition for language/theme dropdowns

**Public Demo Access Configuration**:
- **webapp/controller/auth.js**: Added `_public` virtual role support in `isAuthorized()`
  - `_public` role allows unauthenticated access when configured
  - Empty `requiredRoles` array means open to all
  - Supports mixed access (e.g., `['_public', 'admin']` for public OR admin)
- **webapp/controller/health.js**: Role-based access control for health endpoints
  - `appConfig.controller.health.requiredRoles.status`: Controls `/api/1/health/status` access
  - `appConfig.controller.health.requiredRoles.metrics`: Controls `/api/1/health/metrics` access
  - Default: admin/root required, empty array = public, `_public` = unauthenticated only
- **webapp/controller/health.js**: Data sanitization for non-admin users
  - Removes sensitive infrastructure data (hostnames, IPs, PIDs, database names)
  - Sanitizes processInfo, database connection details, server identifiers
  - Preserves demo functionality while protecting infrastructure details
- **site/webapp/view/jpulse-admin-demo/**: Public demo pages cloned from admin
  - `system-status.shtml` - Cluster-wide system monitoring (public access)
  - `websocket-status.shtml` - WebSocket namespace monitoring (public access)
  - `websocket-test.shtml` - WebSocket testing tool (public access)

**Bug Fixes**:
- **webapp/controller/health.js**: Fixed duplicate instance counting in PM2 cluster mode
  - `_getCurrentInstanceHealthData()` now returns only current instance data (totalInstances: 1)
  - Removed aggregate PM2 process counting from individual broadcasts
  - Aggregation now happens correctly at receiver (`_buildClusterStatistics`)
- **webapp/controller/health.js**: Corrected broadcast channel naming to use `instanceId` (serverId:pm2Id:pid)
- **webapp/controller/health.js**: Added MongoDB admin auth fallback for non-privileged deployments
- **webapp/app.js**: Simplified system metadata initialization (removed unnecessary function wrapper)
- **webapp/app.js**: Fixed early return bug preventing system metadata initialization
  - Removed early return after config generation (line 70)
  - Ensures instanceId is always populated for PM2 instance 0
- **webapp/controller/health.js**: Fixed PM2 uptime calculation bug
  - Corrected `_getPM2Status()` to use `pm2_env.pm_uptime` correctly (milliseconds timestamp)
  - Fixed `_buildServersArray()` to reuse calculated uptime instead of recalculating
  - Uptime now correctly shows seconds since last restart, not 55 years
- **webapp/view/admin/logs.shtml**: Fixed filter preset buttons
  - Changed event listener selector from `.jp-btn-secondary` to `[data-preset]`
  - Preset buttons (Today, Yesterday, etc.) now work correctly
  - `setPresetActive()` also updated to use `[data-preset]` selector

**Architecture Improvements**:
- Established `global.appConfig.system.*` as single source of truth for system metadata
- Created permanent memory: "jPulse Framework: System Metadata Single Source of Truth"
- All code now references `appConfig.system` directly without reconstruction or duplication
- All health metrics now accurate in PM2 cluster deployments
- Added generic `setHeader` in `app.conf` and `app.js` to set Content-Security-Policy and other HTTP headers
- **bin/configure.js**: Clarified logging configuration options for PM2
- Documented PM2 logging modes (internal `/dev/null` vs file-based)
- **bin/mongodb-setup.sh**: Added `clusterMonitor` role for jpapp user (new installations)

**Template Configuration Structure Alignment**:
- **site/webapp/view/jpulse-common.js.tmpl** (formerly site-common.js.tmpl): Fixed `init()` to use Handlebars `{{app.site.name}}` and `{{app.site.version}}` for server-side expansion
  - Corrected misconception that `window.appConfig` is available in view templates (appConfig is server-side only)
  - Templates (`.tmpl` files) are processed by `ViewController.load()` which expands Handlebars before JavaScript reaches browser
- **templates/webapp/app.conf.dev.tmpl**: Structure aligned with `webapp/app.conf` (app.site.name/shortName nested structure)
- **templates/webapp/app.conf.prod.tmpl**: Structure aligned with `webapp/app.conf` (app.site.name/shortName nested structure)
  - Note: Template variables (%SITE_NAME%, etc.) remain unchanged - only structure was modified to match framework defaults

**Page Title Fix**:
- Fixed broken `{{app.shortName}}` to `{{app.site.shortName}}` in `<title>` tag of all pages

**Common Styles**:
- Tweaked `jp-*` styles for more consistent look, and a bit more condensed look
- **webapp/view/jpulse-common.css**: Unified and simplified `jp-card` with headings and sub-headings
  - Created new `.jp-card-dialog-heading` class for explicit opt-in dialog-style headers
  - Created `.jp-card-subheading` class for subheadings positioned to the right of dialog headings
- Fixed all `.html` pages and `.tmpl` files

**Package Dependencies**:
- **package.json**: Added `connect-redis` and `ioredis` for Redis session management

**Architecture Simplification**:
- Removed complex HTTP fallback code from WebSocket controller
- Simplified to Redis-only approach for multi-instance deployments
- Updated documentation to clarify Redis requirements

**Documentation**:
- **docs/application-cluster.md**: NEW comprehensive guide for App Cluster Broadcasting
  - Quick decision tree (WebSocket vs App Cluster)
  - Comparison table with examples
  - Client-side and server-side API reference
  - Common patterns (collaborative editing, notifications, real-time dashboards)
  - Migration guide and troubleshooting
- **docs/websockets.md**: Added App Cluster reference blurb at top
- **docs/mpa-vs-spa.md**: NEW "Real-Time Multi-User Communication" section with decision table
- **docs/handlebars.md**: Enhanced with special context variables table, nested blocks, error handling
- **docs/template-reference.md**: Streamlined Handlebars section, added reference to `handlebars.md`
- **docs/README.md**: Added high-level descriptions of App Cluster and WebSocket features
- **README.md**: Added "Real-Time Multi-User Communication" to Key Features
- **README.md**: Added Redis and Health Metrics to Deployment Requirements
- **docs/genai-development.md**: NEW comprehensive guide for site developers using Gen-AI assistants
  - Complete guide for "vibe coding" with jPulse Framework
  - Covers all major AI tools (Cursor, Cline, Copilot, Windsurf)
  - Initial setup and configuration guidance
  - Effective prompting strategies and architecture-aware development
  - Building common features with AI assistance
  - Testing, debugging, and code quality practices
  - Common pitfalls and solutions
  - Example AI development sessions with conversation flows
  - Checklists for AI-assisted development
- **docs/genai-instructions.md**: NEW machine-readable instructions for AI coding agents
  - Critical framework patterns and conventions (Site Override System, API-First, Client-Side Heavy, Auto-Discovery)
  - CSS and JavaScript conventions (`jp-*` vs `site-*` vs `local-*` prefixes)
  - Framework vs Site file distinctions
  - Reference implementations pointing to living code examples
  - Implementation guidance for controllers, views, models
  - Code quality checklist and security considerations
  - Response guidelines for AI assistants
  - Philosophy: document stays fresh, AI generates current code
- **docs/README.md**: Added "AI-Assisted Development" section highlighting Gen-AI benefits
- **docs/getting-started.md**: Added Gen-AI guide references in Prerequisites and Next Steps
- **docs/site-customization.md**: Added Gen-AI guide reference in introduction
- **docs/front-end-development.md**: Added Gen-AI guide reference after live examples
- **docs/api-reference.md**: Added Gen-AI guide reference after live examples

**License Migration to BSL 1.1**:
- Migrate from AGPL 3 to Business Source License 1.1
  - Change Date: 2030-01-01 (automatic conversion to AGPL v3.0)
  - Commercial licensing contact: team@jpulse.net
- **docs/license.md**: Comprehensive licensing documentation
  - BSL 1.1 explanation and use cases
  - Free vs. commercial license guidance
  - FAQ section covering common scenarios
  - License conversion details and future dual licensing path
- **Source File Headers**: Standardized license format across all source files
  - Format: "BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net"
  - Updated 182 files with new header format
- **package.json**: Updated package metadata
  - Package name: `@jpulse-net/jpulse-framework`
  - Repository: github.com/jpulse-net/jpulse-framework
  - License: BSL-1.1
- **README.md**: Streamlined licensing section
  - Quick reference for development vs. production use
  - Link to detailed `docs/license.md` documentation

**Repository Migration**:
- Migrated from github.com/peterthoeny/jpulse-framework to github.com/jpulse-net/jpulse-framework
- All branches pushed (main, vuejs-trial)
- All 52 version tags migrated
- Old repository archived
- Updated all repository references in codebase (bin scripts, templates, tests)
- **Documentation**:
  - **docs/dev/working/W-052-business-dual-licensing-agpl-and-commercial.md**: Added BSL 1.1 strategy section with rationale
  - Updated all documentation with new repository URLs

**Files Modified**: Extensive changes across 100+ files including controllers, utilities, views, documentation, configuration templates, and package metadata.

**Test Coverage**: All existing tests updated and passing. Comprehensive test coverage maintained for all new features.

**Benefits**:
- ✅ Production-ready multi-instance and multi-server deployments
- ✅ Zero configuration for controllers and API routes
- ✅ Seamless Redis-based coordination across instances
- ✅ Real-time communication for collaborative applications
- ✅ Enterprise-grade licensing with commercial options
- ✅ Comprehensive AI-assisted development guidance
- ✅ Complete developer transparency via startup logs
- ✅ "Don't make me think" developer experience

**Next Steps**:
- Community feedback integration
- Performance optimization under high load
- Additional deployment automation enhancements

________________________________________________
## v1.0.0-rc.2, W-076, 2025-10-27

**Commit:** `W-076, v1.0.0-rc.2: Zero-Configuration Auto-Discovery Architecture`

**ZERO-CONFIGURATION AUTO-DISCOVERY ARCHITECTURE**: Complete implementation of automatic controller registration, API endpoint discovery, and SPA routing detection, eliminating all manual route configuration and controller initialization while maintaining full flexibility and control.

**Objective**: Achieve true "zero configuration" architecture where developers simply create files following naming conventions, and the framework automatically discovers, registers, and initializes all components with comprehensive logging for transparency.

**Architecture Improvements**:
- **SiteControllerRegistry**: Auto-discovers site controllers and API methods using regex pattern matching
  - Scans `site/webapp/controller/` on startup
  - Detects all `static async api*()` methods automatically
  - Infers HTTP method (GET/POST/PUT/DELETE) from method name
  - Registers Express routes at `/api/1/{controllerName}`
  - Calls `static async initialize()` if present
  - Prefixed internal methods with `_` to separate public/private API
- **ViewController Static Class**: Converted to static class pattern for consistency
  - Moved `_buildViewRegistry()` from app.js to ViewController
  - Added `static isSPA(namespace)` with caching for automatic SPA detection
  - Implemented SPA sub-route detection in `load()` method
  - Scans for Vue Router, history.pushState + popstate patterns
  - Dynamic route creation matching all SPA sub-paths
- **Bootstrap Integration**: Centralized initialization in proper dependency order
  - Step 11: SiteControllerRegistry initialization
  - Step 12: ContextExtensions initialization
  - Step 13: viewRegistry creation for routes.js compatibility
  - Step 14: WebSocketController class availability
- **Routes Simplification**: Eliminated all hardcoded controller imports and route registrations
  - Fixed static method context binding with arrow functions
  - Dynamic API route registration via SiteControllerRegistry
  - Automatic SPA route pattern generation

**Auto-Discovery Features**:
- **API Method Detection**: Regex `/\bstatic\s+(?:async\s+)?(api(?:[A-Z]\w*)?)\s*\(/g` finds all API methods
- **HTTP Method Inference**:
  - `api` → GET
  - `apiCreate` → POST
  - `apiUpdate` → PUT
  - `apiDelete` → DELETE
  - `apiToggle` → PUT with `:id/toggle`
  - `apiGet*` → GET with optional `:id`
  - Others → GET with path suffix
- **SPA Detection Patterns**:
  - `vue-router.min.js` or `vue-router.js` imports
  - `VueRouter.createRouter()` calls
  - `history.pushState()` + `popstate` event handlers
- **View Registry**:  Scans both `site/webapp/view/` and `webapp/view/`
  - Site views take precedence (checked first)
  - Regex pattern `/^/(namespace1|namespace2|...)(\/.*)?$/` matches all sub-routes
  - Cached detection results for performance

**Documentation Enhancements**:
- **docs/api-reference.md**: NEW "Automatic API Registration (W-014)" section
  - Complete auto-discovery explanation
  - Naming conventions with examples
  - HTTP method inference rules table
  - Full ProductController example with 6 endpoints
  - Verification logs and best practices
- **docs/getting-started.md**: Updated Step 4 with auto-discovery patterns
  - Static class controller examples
  - Auto-registered API endpoints
  - Server log verification examples
- **docs/mpa-vs-spa.md**: NEW "SPA Page Reload Support (W-014)" section
  - Auto-detection mechanism explained
  - Complete Vue Router SPA example
  - Manual detection patterns
  - Verification guide
- **README.md**: Enhanced "Zero Configuration" feature description

**Files Modified**:
- webapp/utils/bootstrap.js (integrated SiteControllerRegistry, ContextExtensions, viewRegistry, WebSocketController)
- webapp/utils/site-controller-registry.js (renamed from site-registry.js, major refactor)
  - Dynamic API method detection
  - Automatic HTTP method inference
  - Controller initialize() discovery and execution
  - All internal methods prefixed with `_`
- webapp/controller/view.js (converted to static class)
  - Moved _buildViewRegistry() from app.js
  - Added static isSPA(namespace) with caching
  - Fixed siteViewPath construction to include site views
  - Updated viewRouteRE regex from `(/|$)` to `(/.*)?$` for SPA sub-routes
  - Removed redundant W-049 documentation fallback code
- webapp/routes.js (fixed static method context binding)
  - Wrapped ViewController.load in arrow functions
  - All 5 route patterns updated for context preservation
- webapp/app.js (removed all hardcoded initialization)
  - Removed HelloWebsocketController.initialize() call
  - Removed duplicate ViewController initialization
  - Simplified to call bootstrap() only
- docs/api-reference.md (233 new lines documenting auto-registration)
- docs/getting-started.md (updated controller examples)
- docs/mpa-vs-spa.md (82 new lines on SPA auto-detection)
- README.md (enhanced zero-configuration description)

**Test Files**:
- webapp/tests/unit/utils/site-controller-registry.test.js (updated for new API structure)

**Benefits**:
- ✅ Zero route registration required
- ✅ Zero controller imports in routes.js
- ✅ Zero SPA configuration needed
- ✅ Automatic WebSocket initialization via controller.initialize()
- ✅ Complete transparency via startup logs
- ✅ Maintains full flexibility and control
- ✅ "Don't make me think" developer experience

**Developer Experience**:
```javascript
// Create site/webapp/controller/product.js
export default class ProductController {
    static async initialize() { /* setup */ }
    static async api(req, res) { /* GET /api/1/product */ }
    static async apiCreate(req, res) { /* POST /api/1/product */ }
    static async apiUpdate(req, res) { /* PUT /api/1/product/:id */ }
}
// That's it! Framework auto-discovers and registers everything.
```

**Startup Logs**:
```
- info  site-controller-registry  Initialized controller: product
- info  site-controller-registry  Discovered 1 controller(s), 1 initialized, 3 API method(s)
- info  site-controller-registry  Registered: GET /api/1/product → product.api
- info  site-controller-registry  Registered: POST /api/1/product → product.apiCreate
- info  site-controller-registry  Registered: PUT /api/1/product/:id → product.apiUpdate
- info  routes  Auto-registered 3 site API endpoints
```

**Next Steps for v1.0.0 Final**:
- Production testing with auto-discovered controllers
- Performance validation under load
- Final documentation polish

________________________________________________
## v1.0.0-rc.1, W-076, 2025-10-22

**Commit:** `W-076, v1.0.0-rc.1: Production-Ready WebSocket and Redis Integration`

**PRODUCTION-READY WEBSOCKET AND REDIS INTEGRATION**: Complete implementation of WebSocket real-time communication and Redis-backed application cluster broadcasting system with centralized message routing, health metrics monitoring, and comprehensive documentation.

**Objective**: Provide production-ready real-time communication capabilities for multi-user, multi-instance, and multi-server deployments with Redis pub/sub for cross-instance messaging, WebSocket for bi-directional communication, and Application Cluster Broadcasting for simplified state synchronization.

**Key Features**:
- **Application Cluster Broadcasting**: Simplified pub/sub system for state synchronization across users and servers
- **WebSocket Real-Time Communication**: Bi-directional communication with custom namespace support
- **Redis Pub/Sub Integration**: Cross-instance and cross-server message routing via Redis
- **Centralized Message Routing**: Single Redis listener with pattern-based message dispatching
- **Channel Schema Validation**: Strict `model:`, `view:`, `controller:` prefix enforcement
- **omitSelf Support**: Prevent clients from receiving their own broadcast messages
- **Health Metrics Monitoring**: Real-time instance health tracking with graceful shutdown
- **Request/Error Tracking**: 1-minute rolling window metrics per instance
- **Auto-UUID Injection**: Client-side UUID management via `jPulse.appCluster.fetch()`

**Application Cluster Broadcasting**:
- **Client API**: `jPulse.appCluster.publish()`, `subscribe()`, `unsubscribe()`, `fetch()`
- **Server API**: `RedisManager.broadcastMessage()`, `registerBroadcastCallback()`
- **Channel Naming**: `(model|view|controller):{component}:{domain}:{action}`
- **Pattern Matching**: Specificity-based routing (longest match wins)
- **omitSelf Defaults**: `true` for controller/model channels, `false` for view channels

**WebSocket Communication**:
- **Client API**: `jPulse.ws.connect()`, `send()`, `disconnect()`, `onMessage()`
- **Server API**: `WebSocketController.registerNamespace()`, `broadcast()`, `getConnections()`
- **Namespace Support**: Custom WebSocket namespaces per feature
- **Redis Distribution**: Cross-instance message routing for multi-server deployments

**Health Metrics System**:
- **Endpoint**: `/api/1/health/metrics` - Real-time instance health data
- **Instance Data**: CPU, memory, uptime, version, environment, database status
- **Request Metrics**: Requests/min, errors/min, error rate (1-minute window)
- **Graceful Shutdown**: Redis broadcast for immediate cluster cleanup
- **UI Dashboard**: `/admin/system-status` - Visual monitoring interface

**Redis Configuration**:
- **Single Mode**: One Redis server for development and single-server production
- **Cluster Mode**: Redis Cluster for high-availability production deployments
- **Template Configuration**: Redis settings in `app.conf.dev.tmpl` and `app.conf.prod.tmpl`
- **Interactive Setup**: Redis prompts in `bin/configure.js`
- **Auto-Installation**: Redis service installation in `bin/jpulse-install.sh`

**Broadcasting System Enhancements**:
- **Centralized Listener**: Single `bc:*` pattern subscriber in RedisManager
- **Callback Registry**: Map of channel patterns to callback functions
- **Specificity Matching**: Prioritizes longer, more specific channel patterns
- **omitSelf Filtering**: Server-side filtering based on `sourceInstanceId`
- **Direct DOM Updates**: Client-side race condition prevention

**LogController Integration**:
- **Automatic Tracking**: `HealthController.trackRequest()` and `trackError()` integrated into `LogController`
- **Scope Filtering**: Excludes `health.*` scopes from tracking to prevent recursion
- **Global Registration**: `HealthController` registered to `global` in bootstrap

**Documentation**:
- **docs/application-cluster.md**: Comprehensive App Cluster Broadcasting guide
- **docs/websockets.md**: WebSocket Real-Time Communication reference (enhanced)
- **docs/mpa-vs-spa.md**: Real-Time Multi-User Communication section (NEW)
- **docs/handlebars.md**: Enhanced with tables, nested blocks, error handling
- **docs/template-reference.md**: Streamlined with reference to handlebars.md
- **docs/README.md**: High-level overview of App Cluster & WebSocket features
- **README.md**: Real-Time Communication overview and Redis requirements

**Configuration Templates**:
- **templates/webapp/app.conf.dev.tmpl**: Redis single mode configuration
- **templates/webapp/app.conf.prod.tmpl**: Redis single/cluster mode configuration
- **bin/config-registry.js**: Interactive Redis configuration prompts
- **bin/jpulse-install.sh**: Redis service installation and startup

**Files Modified**:
- package.json (version bump to 1.0.0-rc.1)
- webapp/app.conf (version bump to 1.0.0-rc.1)
- webapp/utils/redis-manager.js (centralized routing, omitSelf support)
- webapp/controller/health.js (graceful shutdown, metrics tracking, omitSelf)
- webapp/controller/log.js (HealthController integration)
- webapp/utils/bootstrap.js (global HealthController registration)
- webapp/app.js (graceful shutdown integration)
- webapp/view/jpulse-common.js (jPulse.appCluster.fetch() wrapper)
- webapp/view/admin/system-status.shtml (enhanced instance details)
- templates/webapp/app.conf.dev.tmpl (Redis configuration)
- templates/webapp/app.conf.prod.tmpl (Redis configuration)
- bin/config-registry.js (Redis prompts)
- bin/jpulse-install.sh (Redis installation)
- docs/application-cluster.md (NEW comprehensive guide)
- docs/websockets.md (App Cluster reference)
- docs/mpa-vs-spa.md (Real-Time Communication section)
- docs/handlebars.md (enhanced)
- docs/template-reference.md (streamlined)
- docs/README.md (Real-Time features)
- README.md (Real-Time overview, Redis requirements)

**Test Files**:
- webapp/tests/unit/utils/redis-config.test.js (fixed instanceId tests)

**Bug Fixes**:
- Fixed duplicate message issues (5x messages per broadcast)
- Fixed inter-app communication (8080 ↔ 8086 messaging)
- Fixed client-side race conditions in collaborative apps
- Fixed localStorage UUID sharing across tabs (now per-WebSocket)
- Fixed health metrics showing duplicate local instance
- Fixed system-status.shtml showing "undefined" values
- Fixed CPU reporting (PM2 only, null for non-PM2)
- Fixed Requests/min tracking (global HealthController registration)

**Breaking Changes**:
- Redis is now required for multi-instance/multi-server deployments
- Channel naming must follow strict `model:`, `view:`, or `controller:` prefix schema
- `RedisManager.subscribeBroadcast()` removed (use `registerBroadcastCallback()`)
- `configureSelfMessageBehavior()` removed (use `omitSelf` option in callbacks)

**Migration Guide**:
- Update `site/webapp/app.conf` with Redis configuration
- Update broadcast channels to follow new naming schema
- Replace `subscribeBroadcast()` calls with `registerBroadcastCallback()`
- Use `omitSelf` option instead of `configureSelfMessageBehavior()`

**Deployment Requirements**:
- Redis 6.0+ (single or cluster mode)
- MongoDB 6.0+
- Node.js 18 LTS
- PM2 (for production)

**Next Steps for v1.0.0 Final**:
- RC testing in production-like environments
- Performance benchmarking under load
- Final documentation review and polish

________________________________________________
## v0.9.7, W-079, 2025-10-12

**Commit:** `W-079, v0.9.7: Centralized Cache Management with Smart Invalidation`

**CENTRALIZED CACHE MANAGEMENT WITH SMART INVALIDATION**: Complete cache invalidation strategy implementation with centralized CacheManager utility for file-based caching across view controller, i18n utility, and markdown controller, eliminating the need for app restarts when template, translation, or documentation files change.

**Objective**: Provide automated cache invalidation for .shtml, .tmpl, .css, .js, and i18n .conf files that works across multi-node and multi-app server instances, with configurable performance vs freshness priority and development-friendly API endpoints.

**Key Features**:
- **Centralized CacheManager**: Single utility managing all file-based caches with consistent API
- **Smart Periodic Refresh**: Configurable intervals (minutes) with timestamp-based change detection
- **Synchronous File Access**: Zero filesystem access on cache hits for optimal performance
- **"Does Not Exist" Caching**: Prevents repeated filesystem checks for missing files
- **Cache API Endpoints**: Manual refresh and statistics endpoints for development
- **Graceful Shutdown**: Proper timer cleanup for production and test environments
- **Test Environment Compatibility**: Automatic cache disabling in test mode to prevent hanging

**Cache Integration**:
- **View Controller**: Template and include file caching with site override support
- **i18n Utility**: Translation file caching with multi-language support
- **Markdown Controller**: Documentation file caching with timestamp tracking
- **Configuration**: Per-cache-type refresh intervals via app.conf

**API Endpoints**:
- **`/api/1/cache/refresh/all`**: Refresh all registered caches
- **`/api/1/cache/refresh/view`**: Refresh view controller caches
- **`/api/1/cache/refresh/i18n`**: Refresh translation caches
- **`/api/1/cache/refresh/markdown`**: Refresh markdown caches
- **`/api/1/cache/stats`**: Cache statistics and configuration

**Performance Benefits**:
- **Zero Filesystem Access**: Cache hits require no disk I/O operations
- **Smart Refresh**: Only re-reads files when timestamps change
- **Background Processing**: Periodic refresh runs independently of user requests
- **Configurable Intervals**: Balance between performance and freshness per cache type

**Implementation Details**:
- **webapp/utils/cache-manager.js**: Centralized cache management utility
- **webapp/controller/cache.js**: Cache API endpoints with role-based access
- **webapp/app.conf**: Cache configuration with 10-minute default refresh intervals
- **Graceful Shutdown**: Proper timer cleanup in webapp/app.js
- **Test Environment**: Automatic cache disabling and cleanup in test setup

**Files Modified**:
- webapp/utils/cache-manager.js (NEW)
- webapp/controller/cache.js (NEW)
- webapp/controller/view.js (cache integration)
- webapp/controller/markdown.js (cache integration)
- webapp/utils/i18n.js (cache integration)
- webapp/app.js (graceful shutdown)
- webapp/app.conf (cache configuration)
- webapp/tests/setup/global-teardown.js (cache cleanup)
- webapp/tests/setup/env-setup.js (test environment)
- webapp/tests/integration/cache-api.test.js (API tests)

________________________________________________
## v0.9.6, W-078, 2025-10-11

**Commit:** `W-078, v0.9.6: Health & Metrics API with System Status Dashboard`

**HEALTH & METRICS API WITH SYSTEM STATUS DASHBOARD**: Complete health monitoring infrastructure with REST API endpoints for load balancer integration, comprehensive admin dashboard with auto-refresh capabilities, and multi-instance metrics design for future Redis integration.

**Objective**: Provide production-ready health and metrics endpoints for load balancer health checks and system monitoring, with a human-readable admin dashboard for site administrators to monitor system status, PM2 processes, WebSocket activity, and system resources.

**Key Features**:
- **Health & Metrics API**: `/api/1/health/status` for load balancer health checks and `/api/1/health/metrics` for detailed system monitoring
- **Admin Status Dashboard**: Comprehensive `/admin/system-status.shtml` with auto-refresh and window focus detection
- **Role-Based Access**: Basic metrics for guests/regular users, detailed metrics for admin users
- **PM2 Integration**: Process monitoring with status, memory, CPU, and restart tracking
- **Multi-Instance Design**: API structure prepared for Redis-based metrics aggregation across multiple servers
- **Smart Refresh**: Configurable auto-refresh with background pause when window loses focus

**API Endpoints**:
- **`/api/1/health/status`**: Basic health status for load balancer health checks with configurable logging
- **`/api/1/health/metrics`**: Comprehensive system metrics with role-based access control
  - **Guest/Regular**: Basic status (version, uptime, memory, database connectivity)
  - **Admin**: Full metrics (CPU, load average, PM2 processes, WebSocket stats, system info)

**Admin Dashboard Features**:
- **Auto-Refresh**: Configurable refresh interval with smart pause when window loses focus
- **System Status**: jPulse version, release, environment, uptime tracking
- **System Resources**: Platform, CPU count, memory usage, load average, hostname
- **Database Status**: Connection status and database name
- **WebSocket Metrics**: Total connections, messages, namespaces with activity status
- **PM2 Process Monitoring**: Process status, memory, CPU, restarts with detailed table view
- **Smart UX**: Loading spinners, error handling, responsive design with colored status indicators

**Framework Enhancements**:
- **`jPulse.UI.windowFocus`**: New utility for detecting browser tab focus/blur events with callback registration
- **Enhanced CSS Framework**: Moved status-related styles from `local-*` to `jp-*` classes for reusability
- **Fixed Navigation**: Site navigation pulldown now uses `position: fixed` to remain visible on scroll
- **AppConfig Restructure**: Split `appConfig.app` into `appConfig.app.jPulse` (framework) and `appConfig.app.site` (site-specific)

**Multi-Instance Metrics Design**:
- **API Structure**: Prepared for Redis-based aggregation with `statistics`, `servers[]`, and `instances[]` hierarchy
- **Server-Level Data**: System info (CPU, memory, load) and MongoDB server status at server level
- **Instance-Level Data**: Application data (version, environment, database config, PM2 status) at instance level
- **WebSocket Data**: Split between cluster-wide statistics and instance-specific details
- **MongoDB Integration**: Placeholder for MongoDB server status monitoring

**Configuration & Logging**:
- **Health Logging Control**: `appConfig.controller.health.omitStatusLogs` to reduce log noise
- **Auto-Refresh Settings**: `appConfig.view.admin.systemStatus.refreshInterval` and `refreshInBackground`
- **Consistent Logging**: Always log `/api/1/health/metrics` requests, configurable for `/api/1/health/status`

**Testing & Quality**:
- **Unit Tests**: Comprehensive testing of utility functions (`_formatUptime`, `_extractServerIdFromHostname`, etc.)
- **Integration Tests**: API structure validation and configuration testing
- **All Tests Passing**: Maintained 100% test pass rate with enhanced coverage

**UI & UX Improvements**:
- **Professional Styling**: Consistent `jp-*` framework classes with colored status indicators
- **Responsive Design**: Mobile-friendly layout with proper spacing and typography
- **Error Handling**: Graceful degradation when PM2 or other services are unavailable
- **Loading States**: Clear feedback during data fetching with spinner animations

________________________________________________
## v0.9.5, W-040, 2025-10-10

**Commit:** `W-040, v0.9.5: Admin Logs Search & Analysis Interface`

**ADMIN LOGS SEARCH & ANALYSIS INTERFACE**: Complete admin logs page implementation for comprehensive system usage analysis with advanced filtering, sortable results, smart UX features, and educational code structure perfect for learning admin interface patterns.

**Objective**: Enable site administrators to efficiently analyze system usage through an intuitive logs search interface with advanced filtering capabilities, expandable change details, and responsive design that serves as an educational template for future admin interface development.

**Key Features**:
- **Advanced Search Interface**: Comprehensive filtering by date, username, action, and document type with quick preset buttons
- **Smart Results Display**: Sortable table with expandable change details using body-attached dropdown with intelligent positioning
- **Performance Optimizations**: DocTypes caching with 5-minute TTL, efficient MongoDB queries, and single reusable dropdown
- **Educational Code Structure**: Clean, well-documented implementation perfect for learning admin interface patterns
- **Comprehensive i18n**: Full internationalization support with dynamic language switching

**Advanced Search & Filtering**:
- **Date Filter**: Supports partial dates (YYYY-MM-DD, YYYY-MM, YYYY) with ISO format input
- **Quick Presets**: Today, Yesterday, This Month, Last Month, Whole Year buttons with i18n support
- **Username Filter**: Search by specific user with autocomplete-ready input
- **Action Filter**: Create, Update, Delete operations with dropdown selection
- **DocType Filter**: Dynamically populated from database with caching for performance
- **Clear Filters**: One-click filter reset with proper form state management

**Smart Results Display**:
- **Sortable Columns**: Three-click sorting (ascending, descending, default) with jp-sortable styling
- **Expandable Changes**: Body-attached dropdown with smart positioning to prevent screen clipping
- **Change Details**: Visual distinction using ❌/✅ symbols, filtered identical changes, proper indentation
- **Scroll Tracking**: Dropdown follows scroll position with resize event handling
- **Color-Coded Actions**: Visual distinction for create/update/delete operations
- **Responsive Design**: Horizontal scroll on mobile with proper table container styling

**Backend Integration & Enhancements**:
- **DocTypes Caching**: Global `app.docTypes` with 5-minute TTL cache and automatic refresh during log creation
- **Consistent Logging**: Standardized log message format across all controllers (user, config, helloTodo)
- **Enhanced Log Model**: Improved `createDocumentCreatedChanges()` and `createDocumentDeletedChanges()` methods
- **Missing Method Fix**: Added `HelloTodoModel.findById()` method for proper logging workflow
- **Bootstrap Integration**: Proper initialization order with `LogController.postInitialize()` after database connection

**UX & Performance Optimizations**:
- **Body-Attached Dropdown**: Single reusable dropdown vs per-row instances for better performance
- **Smart Positioning**: Dynamic horizontal/vertical positioning to prevent clipping at screen edges
- **Efficient Queries**: Optimized MongoDB queries with proper indexing and pagination
- **Loading States**: Clear feedback during search operations with proper error handling
- **Professional Styling**: Consistent jp-* framework classes throughout implementation

**Internationalization (i18n)**:
- **Complete Translation**: All UI text supports English/German with proper Handlebars integration
- **Dynamic Language**: Respects user language preferences for both server and client-side rendering
- **Server-Side i18n**: Proper integration with `global.i18n.translate()` for consistent messaging
- **Client-Side i18n**: JavaScript strings properly localized using Handlebars server-side rendering

**Code Quality & Educational Value**:
- **Educational Template**: Well-organized, commented code structure perfect for learning admin interface patterns
- **Reusable Patterns**: Easy to adapt for other admin search pages with consistent MVC architecture
- **Comprehensive Error Handling**: All API calls properly handle errors with user-friendly toast notifications
- **Data Integrity**: Input validation, MongoDB query building, HTML escaping, and CSRF protection

**Bug Fixes & Improvements**:
- **HelloTodo Integration**: Added missing `findById()` method and comprehensive logging for create/update/delete
- **User Profile Logging**: Added missing user profile update logging in `UserController.update()`
- **Toast Message Fixes**: Fixed duplicate error message display in hello-todo and hello-vue demos
- **Vue Demo Enhancement**: Added proper error handling with `response.success` checks and toast messages
- **Consistent Styling**: Standardized todo status box styling across all demo applications

**Framework Enhancements**:
- **Table Sorting CSS**: Added `jp-sortable`, `jp-sort-asc`, `jp-sort-desc` classes to `jpulse-common.css`
- **Date Formatting**: Consistent use of `jPulse.date.formatLocalDate()` for ISO date display
- **Global Configuration**: Added `app.docTypes` array to `app.conf` for application-wide access
- **Bootstrap Process**: Enhanced initialization with proper database-dependent operations

**Files Created**:
- `webapp/view/admin/logs.shtml` (970 lines) - Complete admin logs search interface
- `docs/dev/working/W-040-admin-logs-view.md` - Comprehensive implementation documentation

**Files Enhanced**:
- `webapp/model/log.js` - Enhanced logging format and consistency
- `webapp/controller/log.js` - Added docTypes caching and search improvements
- `webapp/controller/user.js` - Added user update logging
- `site/webapp/controller/helloTodo.js` - Added comprehensive logging
- `site/webapp/model/helloTodo.js` - Added missing findById method
- `webapp/translations/en.conf` + `de.conf` - Added log-related translations
- `webapp/view/jpulse-common.css` - Added table sorting styles

**Testing & Quality Assurance**:
- **Comprehensive Test Coverage**: All functionality thoroughly tested with proper error scenarios
- **Cross-Browser Compatibility**: Tested on desktop and mobile devices with responsive design
- **Performance Validation**: Efficient handling of large result sets with pagination
- **Accessibility**: Proper semantic HTML and keyboard navigation support
- **Code Review**: Educational code structure with comprehensive inline documentation

________________________________________________
## v0.9.4, W-077, 2025-10-09

**Commit:** `W-077, v0.9.4: Authentication Control & User Menu Enhancement`

**AUTHENTICATION CONTROL & USER MENU ENHANCEMENT**: Complete implementation of configurable authentication controls with granular app.conf flags, enhanced user menu with site navigation-consistent behavior, Handlebars template improvements, and comprehensive unit testing overhaul.

**Objective**: Provide site administrators with granular control over authentication features for public sites, enhance user menu consistency with site navigation behavior, improve Handlebars templating capabilities, and establish robust testing patterns for view controller functionality.

**Key Features**:
- **Authentication Configuration**: Four new app.conf flags for granular control over signup/login visibility and functionality
- **User Menu Enhancement**: Site navigation-consistent hover/tap behavior with device detection
- **Handlebars Improvements**: New `{{#unless}}` helper and nested `{{#if}}` bug fixes
- **Login Error Handling**: Proper toast messages for server errors (e.g., disabled login)
- **Testing Architecture**: Comprehensive unit tests for actual view controller implementation

**Authentication Control Flags**:
- **`controller.user.disableSignup`**: Server-side signup endpoint control (returns 403 when disabled)
- **`controller.auth.disableLogin`**: Server-side login endpoint control (returns 403 when disabled)
- **`view.auth.hideSignup`**: Client-side signup form/link visibility control
- **`view.auth.hideLogin`**: Client-side login form/link visibility control

**User Menu Enhancement**:
- **Desktop Behavior**: Hover to open with delay, hover leave to close with delay (consistent with site navigation)
- **Mobile Behavior**: Tap to toggle, tap outside to close, tap menu item to close
- **Device Detection**: Uses `jPulse.device.isMobile()` and `jPulse.device.isTouchDevice()` for proper behavior
- **Event Management**: Proper event handling with `stopPropagation` and cleanup

**Handlebars Template Improvements**:
- **`{{#unless}}` Helper**: Inverse conditional rendering (opposite of `{{#if}}`)
- **No `{{else}}` Support**: Documented limitation with equivalent `{{#if}}/{{else}}` examples
- **Nested `{{#if}}` Bug Fix**: Fixed complex nested conditionals with `{{else}}` blocks
- **Comprehensive Documentation**: Added to `docs/handlebars.md` with examples and usage patterns

**Login Error Handling**:
- **Toast Message Fix**: Added explicit `jPulse.UI.toast.error(error)` call in `handleLoginError`
- **Server Error Display**: Proper error message display for 403 responses (disabled login)
- **User Feedback**: Clear indication when authentication features are disabled

**Testing Architecture Overhaul**:
- **Public Method**: Made `processHandlebars()` public for proper unit testing
- **28 Comprehensive Tests**: Complete coverage of all handlebars functionality
- **Release-Agnostic**: Tests use template literals to avoid version-specific failures
- **Actual Implementation Testing**: Tests the real controller code, not reimplemented logic
- **W-077 Feature Coverage**: Specific tests for `{{#unless}}` and nested `{{#if}}` fixes

**Template Integration**:
- **Navigation Template**: Uses `{{#unless appConfig.view.auth.hideLogin}}` and `{{#unless appConfig.view.auth.hideSignup}}`
- **Conditional Rendering**: Clean template logic for showing/hiding authentication elements
- **Configuration-Driven**: All visibility controlled by centralized app.conf settings
- **Backward Compatibility**: Existing templates work unchanged

**User Experience Improvements**:
- **Consistent Navigation**: User menu behavior matches site navigation patterns
- **Clear Feedback**: Toast messages inform users of authentication status
- **Mobile Optimization**: Touch-friendly menu behavior with proper event handling
- **Accessibility**: Keyboard navigation and screen reader compatibility maintained

**Bug Fixes**:
- **Login Toast Messages**: Fixed missing error display on server authentication failures
- **Nested Handlebars**: Resolved complex `{{#if}}` with `{{else}}` nesting issues
- **User Menu JavaScript**: Moved from header to footer for proper `jPulse` availability
- **Event Handling**: Fixed mobile menu closing and desktop hover behavior
- **Test Architecture**: Replaced reimplemented handlebars logic with actual controller testing

**Files Modified (Major Changes)**:
- `webapp/app.conf`: Added four authentication control flags
- `webapp/controller/auth.js`: Added `disableLogin` configuration check with 403 response
- `webapp/controller/user.js`: Added `disableSignup` configuration check with 403 response
- `webapp/controller/view.js`: Made `processHandlebars()` public, enhanced handlebars processing
- `webapp/view/auth/login.shtml`: Fixed login error toast message handling
- `webapp/view/jpulse-navigation.tmpl`: Added `{{#unless}}` conditionals for auth links
- `webapp/view/jpulse-footer.tmpl`: Enhanced user menu with device-aware behavior
- `webapp/translations/en.conf` & `de.conf`: Added `controller.auth.loginDisabled` translation
- `docs/handlebars.md`: Added comprehensive `{{#unless}}` documentation
- `webapp/tests/unit/controller/view.test.js`: Complete rewrite with 28 comprehensive tests

**Quality Assurance**:
- **All 740 tests passing** (653 unit + 58 integration + 29 other)
- **Zero regressions** in existing authentication functionality
- **Manual testing** across desktop and mobile devices
- **Configuration validation** for all four authentication flags
- **Release-agnostic tests** prevent future CI/CD failures

**Developer Experience**:
- **Comprehensive Documentation**: Clear examples and usage patterns for all new features
- **Robust Testing**: Proper unit tests prevent future regressions
- **Clean Architecture**: Public method exposure enables testability without breaking encapsulation
- **Configuration Control**: Simple app.conf flags for complex authentication scenarios
- **Maintenance-Free**: Release-agnostic tests eliminate version-specific failures

**Technical Architecture**:
- **Server-Side Control**: Authentication endpoints respect configuration flags
- **Client-Side Visibility**: Template conditionals control UI element display
- **Device Detection**: Proper mobile/desktop behavior differentiation
- **Event Management**: Clean event handling with proper cleanup and propagation control
- **Test Coverage**: Comprehensive unit tests for all handlebars functionality

**Lines of Code Impact**:
- **Created**: ~500 lines (tests, documentation, user menu enhancements)
- **Modified**: ~150 lines (controllers, templates, translations)
- **Net Impact**: ~650 lines

**Use Cases Demonstrated**:
- **Public Site Control**: Disable signup/login for read-only public sites
- **Staged Rollout**: Hide UI elements while keeping backend functionality
- **Error Handling**: Proper user feedback for disabled authentication features
- **Template Logic**: Complex conditional rendering with `{{#unless}}` and nested `{{#if}}`
- **Mobile UX**: Touch-friendly menu behavior with proper event handling

**Migration Path**:
- **Zero Breaking Changes**: All existing functionality preserved
- **Backward Compatible**: Default configuration maintains current behavior
- **Optional Features**: New flags are opt-in, existing sites unaffected
- **Test Enhancement**: Improved test coverage without changing public APIs

________________________________________________
## v0.9.3, W-070, 2025-10-08

**Commit:** `W-070, v0.9.3: Hierarchical Breadcrumb Navigation System`

**HIERARCHICAL BREADCRUMB NAVIGATION**: Complete breadcrumb navigation implementation with bottom-up directory-level search algorithm for accurate URL matching, server-side template integration, and SPA compatibility.

**Objective**: Hierarchical breadcrumb navigation system that shows the path from home to current page, works with both MPA and SPA patterns, and provides intuitive navigation for users.

**Key Features**:
- **Bottom-Up Directory Search**: Advanced algorithm that searches from deepest to shallowest URL paths for most specific matches
- **Clean Architecture**: Consistent initialization pattern with site navigation using options object
- **Server-Side Integration**: Template-based initialization with Handlebars i18n support
- **SPA Compatibility**: Real-time updates via History API monitoring (pushState, replaceState, popstate)
- **Smart Page Extraction**: Automatic page name extraction for 404/unknown pages from URL
- **Responsive Design**: Overflow ellipsis handling and mobile-friendly styling
- **Independent Operation**: Works correctly when site navigation is disabled

**Breadcrumb Algorithm**:
- **Two-Pass Exact Match Priority**: First finds exact URL matches globally, then falls back to prefix matching
- **Bottom-Up Directory-Level Search**: Generates directory levels from deepest to shallowest for precise matching
- **Dynamic Page Integration**: Incorporates SPA-registered pages for comprehensive navigation coverage
- **Unknown Page Handling**: Extracts readable page names from URLs for pages not in navigation structure

**Template Integration**:
- **Handlebars i18n**: Uses `{{i18n.view.home.title}}` for localized "Home" label
- **Configuration-Driven**: Controlled by `appConfig.view.pageDecoration.showBreadcrumbs`
- **Clean Separation**: Server-side data passed via options object, no Handlebars in JavaScript
- **Consistent Pattern**: Follows same initialization approach as `jPulse.UI.navigation.init()`

**SPA Navigation Support**:
- **History API Monitoring**: Listens for `popstate`, `pushState`, and `replaceState` events
- **Dynamic Page Registration**: Integrates with `jPulse.UI.navigation.registerPages()` for SPA content
- **Real-Time Updates**: Breadcrumb refreshes automatically on URL changes without page reload
- **Timeout Handling**: Small delay ensures DOM updates complete before breadcrumb regeneration

**Responsive Design**:
- **Overflow Handling**: Ellipsis class when content exceeds container width
- **Mobile Optimization**: Appropriate padding and margins for different screen sizes
- **Visual Integration**: Matches site navigation styling with consistent icon rendering
- **Body Class Management**: Adds `jp-breadcrumbs-enabled` for conditional CSS styling

**Bug Fixes**:
- **Site Navigation Independence**: Fixed critical bug where breadcrumbs wouldn't show when site navigation was disabled
- **Test Wrapper Accuracy**: Fixed `bin/test-all.js` to correctly report failed test counts
- **Location Mocking Issues**: Resolved JSDOM window.location mocking problems in unit tests
- **Template Syntax Compatibility**: Proper handling of Handlebars syntax in test environments

**Test Coverage**:
- **22 Breadcrumb Tests**: Comprehensive coverage of initialization, trail generation, edge cases
- **56 Total Navigation Tests**: All navigation and breadcrumb tests passing
- **Architecture Testing**: Consistent initialization patterns and error handling
- **Edge Case Coverage**: Empty navigation, null structures, element removal scenarios

**Technical Implementation**:
- **Internal Variables**: Clean encapsulation with `_homeLabel`, `_navConfig`, `_breadcrumbElement`
- **Method Consistency**: No parameter passing between internal methods, uses stored state
- **Error Handling**: Graceful degradation when navigation structure missing or invalid
- **Performance**: Efficient URL matching with early termination on exact matches

________________________________________________
## v0.9.2, W-069, 2025-10-08

**Commit:** `W-069, v0.9.2: Responsive Navigation System with Template-Based Architecture`

**RESPONSIVE NAVIGATION SYSTEM**: Complete implementation of responsive site navigation with desktop pulldown menus and mobile hamburger support, migrated from app.conf to template-based architecture for full Handlebars power.

**Objective**: Configurable site navigation for quick access that works on desktop and mobile, easy to override by site owners, with authentication-aware menu rendering and enhanced tab navigation.

**Key Features**:
- **Template-Based Navigation**: Migrated from `app.conf` to `webapp/view/jpulse-navigation.tmpl` with full Handlebars support
- **Desktop Pulldown Menus**: Hover over logo for nested navigation with unlimited levels
- **Per-Submenu Timeouts**: Independent hover delays using Map for smooth interactions
- **Role-Based Visibility**: Auto-re-initialization when user authentication state changes
- **Enhanced Tab Navigation**: Auto-detect active tab from URL with partial matching for SPAs
- **Responsive CSS Fixes**: Mobile search forms, flexbox layouts, content jump prevention

**Template-Based Navigation Architecture**:
- **Full Handlebars Power**: Use `{{#if}}`, `{{#each}}`, `{{i18n.*}}` in navigation definitions
- **Unified Definition**: Site navigation and tab structures in single `jpulse-navigation.tmpl`
- **Auto-Initialization**: Loaded via `jpulse-footer.tmpl` on all pages
- **Role-Based Filtering**: Conditionals like `{{#if user.roles.admin}}` for menu visibility
- **Easy Override**: Site can override entire template or extend framework navigation

**Desktop Navigation**:
- **Pulldown on Hover**: Show nested navigation when hovering over logo and site name
- **Unlimited Nesting**: CSS `overflow:visible` allows L1, L2, L3+ submenus
- **Smart Positioning**: Submenus positioned to prevent viewport overflow
- **Hover Delays**: 800ms delays for smooth interaction without accidental triggers
- **Icon Support**: Blue circular backgrounds for SVG icons in navigation items

**Mobile Navigation**:
- **Hamburger Menu**: Responsive design for mobile viewports
- **Touch-Friendly**: Optimized spacing and sizing for mobile interactions
- **Vertical Stacking**: Mobile-first layout with proper field sizing

**Per-Submenu Timeout System**:
- **Independent Timeouts**: Map-based system for tracking each submenu's hide timeout
- **No Competing Delays**: Each submenu manages its own show/hide timing
- **Smooth Interactions**: Mouse enter clears pending hide timeout for that specific submenu
- **Bug Fix**: Resolved complex delay issues where submenus closed prematurely

**Authentication-Aware Navigation**:
- **Auto-Re-initialization**: Navigation updates when user logs in/out or roles change
- **Role-Based Menus**: Admin menu appears immediately after admin login
- **Seamless UX**: No page reload needed for navigation updates
- **Bug Fix**: Fixed issue where admin menu didn't appear after login until page reload

**Enhanced Tab Navigation** (`jPulse.UI.tabs.register()`):
- **Optional 3rd Parameter**: Active tab ID is now optional
- **Auto-Detection**: Automatically determines active tab from current URL
- **Partial URL Matching**: Matches `/jpulse-docs/api-reference` to `api-reference` tab
- **SPA Support**: Works seamlessly for both MPA and SPA architectures
- **Backward Compatible**: Existing code with explicit 3rd parameter still works

**Responsive CSS Improvements**:
- **Consolidated Media Queries**: Merged 7 separate `@media (max-width: 600px)` blocks into one
- **Mobile Search Forms**: Fixed unusable search form layout on mobile (fields now stack vertically)
- **Flexbox Desktop Forms**: Proper wrapping and field sizing with `flex: 1 1 180px`
- **Reduced Mobile Padding**: Better space utilization on small screens
- **Tab Content Jump Fix**: Added `.jp-tabs:empty { min-height: 55px; }` for MPA pages

**Bug Fixes**:
- **Auth Bug**: Navigation now updates immediately after login (no page reload needed)
- **Pulldown Delays**: Fixed competing timeouts with per-submenu Map system
- **Logo Hover**: Fixed L1 menu disappearing unexpectedly when leaving logo
- **Mobile Search**: Fixed unusable search form layout on mobile devices
- **Profile Page**: Fixed API calls and toast messages showing for logged-out users
- **Tab Jump**: Fixed content jumping down ~55px on MPA page loads

**Site Override Support**:
- **Static File Overrides**: Added custom middleware in `routes.js` for development mode
- **Mimics nginx**: Matches production `try_files` behavior for consistent dev/prod
- **Icon Overrides**: Site can override framework icons in `/assets/admin/icons/`

**CSS Components**:
- **`.jp-btn-nav-group`**: Navigation button rows with arrow separators
- **Responsive Flexbox**: Wraps buttons with proper spacing and alignment
- **Active Button Styling**: `.jp-btn-active` highlights current page
- **Arrow Separators**: Uses `<span class="jp-btn-nav-arrow">→</span>`

**Files Created**:
- webapp/view/jpulse-navigation.tmpl: Unified navigation and tabs definition (177 lines)

**Files Modified** (Major Changes):
- webapp/view/jpulse-common.js: Navigation module with per-submenu timeouts, tab auto-detect (~300 lines modified)
- webapp/view/jpulse-common.css: Responsive navigation styles, search form fixes, tab jump fix (~200 lines modified)
- webapp/view/jpulse-footer.tmpl: Navigation initialization
- webapp/controller/view.js: Removed obsolete navigation context processing
- webapp/utils/i18n.js: Removed obsolete processI18nHandlebarsObj() method
- webapp/routes.js: Added site override middleware for static files
- webapp/view/user/profile.shtml: Added `{{#if user.isAuthenticated}}` wrapper
- webapp/view/admin/users.shtml: Removed conflicting page-specific CSS
- webapp/view/jpulse-examples/*.shtml: Added `.jp-tabs` class to prevent jump (6 files)
- webapp/translations/en.conf & de.conf: Added navigation translations
- webapp/tests/unit/utils/jpulse-ui-navigation.test.js: Updated for template-based architecture
- webapp/tests/unit/utils/jpulse-ui-widgets.test.js: Added 6 tab parameter tests, removed 6 JSDOM-limited tests
- docs/handlebars.md: Updated template include examples
- docs/style-reference.md: Added `.jp-btn-nav-group` documentation
- docs/dev/working/W-068-W-069-W-070-view-create-responsive-nav: Updated spec

**Quality Assurance**:
- ✅ All 716 tests passing
- ✅ Zero regressions
- ✅ Manual testing across desktop and mobile viewports
- ✅ Authentication state changes tested
- ✅ Navigation hover interactions verified
- ✅ Search form layout tested on multiple screen sizes

**Developer Experience**:
- Clean separation of structure (template) from behavior (JavaScript)
- Full Handlebars templating power for navigation definition
- Easy to override at site level
- Comprehensive documentation and examples
- "Don't make me think" initialization (automatic)

**Technical Implementation**:
- Per-Submenu Map: `_hideTimeouts: new Map()` for independent timeout management
- Role Change Detection: Compares stringified user roles to detect authentication changes
- URL Matching: Iterates through tabs to find URL matches (exact or partial)
- Bootstrap Sequence: Proper module initialization order maintained
- Site Override Pattern: `try_files`-like behavior in Express middleware

**Lines of Code Impact**:
- Created: ~400 lines (jpulse-navigation.tmpl, new middleware, CSS)
- Modified: ~800 lines (navigation JS, CSS fixes, tests, docs)
- Removed: ~200 lines (obsolete methods, page-specific CSS, duplicate media queries)
- Net Impact: ~1,000 lines

**Use Cases Demonstrated**:
- Desktop hover navigation with nested menus
- Mobile-friendly hamburger menu
- Role-based navigation visibility
- Authentication-aware menu updates
- Auto-detecting active tabs from URLs
- Site-specific navigation overrides

**Migration Path**:
- Zero Breaking Changes: Existing navigation still works
- Backward Compatible: Tab navigation with explicit active tab still works
- Documentation: Complete guides for template-based navigation
- Examples: Framework navigation demonstrates all features

________________________________________________
## v0.9.1, W-075, 2025-10-05

**Commit:** `W-075, v0.9.1: WebSocket Real-Time Demo, Enhanced Navigation & UI Bug Fixes`

**WEBSOCKET EDUCATIONAL DEMO**: Complete `/hello-websocket/` demo application teaching real-time communication with emoji cursor tracking and collaborative to-do list. Includes enhanced navigation structure for all hello examples, comprehensive test suite additions, and critical modal dialog focus bug fix.

**Objective**: Provide comprehensive WebSocket learning experience with interactive demos, clear separation of concerns, enhanced navigation across all hello examples, and improved UI widget reliability.

**Key Features**:
- **WebSocket Demo App** (`/hello-websocket/`): Complete SPA with emoji cursor tracking and collaborative todos
- **Hello Examples Navigation**: Unified 4-section structure (Overview, Demo/App, Code Examples, Architecture) across all hello examples
- **Modal Dialog Fix**: Critical focus trap bug preventing keyboard events from reaching background buttons
- **Enhanced Testing**: +14 new tests for hello-todo structure validation

**WebSocket Demo Application** (`/hello-websocket/`):
- **Two Interactive Demos**: Emoji cursor tracking (ephemeral) and collaborative todo list (hybrid REST+WebSocket)
- **Educational Structure**: 5-page SPA (Overview, Emoji Demo, Todo Demo, Code Examples, Architecture)
- **Server-Side Controller** (`site/webapp/controller/helloWebsocket.js`): Manages two WebSocket namespaces
- **Self-Contained Components**: Clean separation of concerns with emoji and todo logic in their own components
- **Consistent Patterns**: Follows hello-vue educational approach with server-side template includes
- **Hash-Based Routing**: Simple client-side routing for educational purposes (vs. Vue Router in hello-vue)

**Emoji Cursor Demo**:
- **Real-Time Tracking**: Mouse movements broadcast to all connected users with emoji indicators
- **Throttled Updates**: 20 updates/second (50ms throttle) for smooth performance
- **User Presence**: Shows all connected users' cursors with usernames and emoji
- **No Persistence**: Purely ephemeral real-time communication (no database)
- **Clean Disconnection**: Graceful cleanup when users disconnect

**Collaborative Todo Demo**:
- **Hybrid Architecture**: REST API for actions + WebSocket for notifications
- **Live Updates**: Real-time synchronization across all connected clients
- **Existing MVC Integration**: Enhances hello-todo controller with WebSocket broadcasts
- **User Activity**: Shows which user created/toggled/deleted todos
- **Educational Pattern**: Teaches how to add real-time features to existing MVC apps

**Enhanced Navigation Structure**:
- **Unified 4-Section Pattern**: Overview, Interactive Demo/App, Code Examples, Architecture
- **Hello Dashboard** (`/hello/index.shtml`): New central hub for all hello examples
- **Renamed Files**: hello/index.shtml → hello/site-override.shtml, hello/site-demo.shtml → hello/site-development.shtml
- **Hello-Todo MPA**: Restructured into 4 pages (index, todo-app, code-examples, architecture)
- **Hello-Vue SPA**: Standardized to 4-route structure matching hello-todo pattern
- **Breadcrumb Navigation**: Consistent "Home ❯ Hello World Site Demos ❯ Example" across all pages
- **Bottom Navigation**: Unified "← To-Do MVC Demo" and "← Hello World Site Demos" buttons

**Modal Dialog Bug Fix**:
- **Issue**: Enter key reopening dialogs by triggering background buttons
- **Root Cause**: Focus trap not preventing keyboard events from reaching background elements
- **Solution**: Enhanced `_trapFocus()` with event capture phase interception
- **Focus Management**: Store and restore previous focus on dialog close
- **Tab Cycling**: Proper Tab/Shift+Tab cycling within dialog elements
- **Event Cleanup**: Keydown listeners properly removed on dialog close
- **Backward Compatible**: No breaking changes to existing dialog code

**Educational Content Improvements**:
- **MPA vs SPA Distinction**: Clear explanation of Traditional MPA vs jPulse Hybrid MPA approach
- **Documentation Links**: All hello-todo pages link to `/docs/mpa-vs-spa.html`
- **Syntax Highlighting**: Prism.js integration for code examples in hello-todo
- **Consistent Icons**: 📋 for todo MVC, 😊 for emoji demo, ✅ for todo app, 🌐 for WebSocket
- **Info Boxes**: Educational call-outs explaining architectural differences

**Enhanced Testing**:
- **New Test Suite** (`webapp/tests/unit/hello-todo-structure.test.js`): 14 comprehensive tests
  - File structure validation (4 tests)
  - Navigation consistency (4 tests)
  - Educational content verification (3 tests)
  - Consistent styling checks (2 tests)
  - Code structure validation (1 test)
- **Test Fixes**: Updated 2 tests for refactored hello-todo structure
- **Total Tests**: 716 passing (up from 702)

**Documentation Enhancements**:
- **WebSocket Patterns** (`docs/websockets.md`): Added Ephemeral Real-Time Tracking and Hybrid REST+WebSocket patterns
- **Hello-WebSocket Examples**: Detailed breakdown of emoji and todo demos in websockets.md
- **Code Examples**: Copy-paste ready implementation code for both patterns

**UI/UX Improvements**:
- **Dashboard Card Alignment**: Fixed `.jp-card-dashboard` to align content at top (not center)
- **Navigation Arrows**: Added → arrows between navigation buttons for visual flow
- **Active Button Styling**: `.jp-btn-active` highlights current page in navigation
- **Scroll to Top**: Hello-vue routes now scroll to top on navigation
- **Consistent Styling**: Unified button styles (primary, outline, active) across all hello examples

**Files Created**:
- site/webapp/view/hello-websocket/index.shtml: Main WebSocket demo page
- site/webapp/view/hello-websocket/templates/routing.tmpl: Navigation controller
- site/webapp/view/hello-websocket/templates/overview.tmpl: Overview component
- site/webapp/view/hello-websocket/templates/emoji-demo.tmpl: Emoji cursor demo component
- site/webapp/view/hello-websocket/templates/todo-demo.tmpl: Collaborative todo demo component
- site/webapp/view/hello-websocket/templates/code-examples.tmpl: Code examples component
- site/webapp/view/hello-websocket/templates/architecture.tmpl: Architecture explanation component
- site/webapp/controller/helloWebsocket.js: WebSocket namespace controller (266 lines)
- site/webapp/view/hello/index.shtml: New hello examples dashboard
- site/webapp/view/hello-todo/index.shtml: Todo MVC overview page
- site/webapp/view/hello-todo/code-examples.shtml: Todo code examples page
- site/webapp/view/hello-todo/architecture.shtml: Todo architecture page
- site/webapp/view/hello-vue/templates/architecture.tmpl: Vue architecture page
- webapp/tests/unit/site/hello-todo-structure.test.js: Comprehensive structure tests (155 lines)

**Files Renamed**:
- site/webapp/view/hello-todo/index.shtml → site/webapp/view/hello-todo/todo-app.shtml (actual app moved)
- site/webapp/view/hello/index.shtml → site/webapp/view/hello/site-override.shtml
- site/webapp/view/hello/site-demo.shtml → site/webapp/view/hello/site-development.shtml
- site/webapp/view/hello-vue/templates/code.tmpl → site/webapp/view/hello-vue/templates/code-examples.tmpl

**Files Modified**:
- site/webapp/controller/helloTodo.js: Added WebSocket broadcast calls (3 locations)
- webapp/app.js: Initialize HelloWebsocketController on startup
- webapp/view/jpulse-common.js: Enhanced modal dialog focus trap (+70 lines)
- webapp/view/jpulse-common.css: Fixed dashboard card vertical alignment
- webapp/view/home/index.shtml: Updated hello-websocket link description
- site/webapp/view/hello-vue/templates/routing.tmpl: Standardized to 4-route structure, scroll to top
- site/webapp/view/hello-vue/templates/overview.tmpl: Merged content from about.tmpl
- site/webapp/view/hello-vue/templates/code-examples.tmpl: Merged content from features.tmpl
- docs/websockets.md: Added Ephemeral and Hybrid patterns with hello-websocket examples
- webapp/tests/unit/utils/jpulse-common-enhanced.test.js: Fixed path for refactored hello-todo
- webapp/tests/integration/w047-site-files.test.js: Updated for renamed hello files

**Quality Assurance**:
- All 716 tests passing (14 new hello-todo structure tests + 2 fixed tests)
- Zero regressions introduced
- Manual testing: Modal dialog focus trap verified across browsers
- WebSocket demos tested: Multi-user emoji tracking and collaborative todos
- Navigation tested: All hello examples breadcrumbs and sub-navigation
- Educational value: Comprehensive learning path from MPA → SPA → WebSocket

**Developer Experience**:
- **Progressive Learning**: hello-todo (MPA) → hello-vue (SPA) → hello-websocket (Real-time SPA)
- **Consistent Navigation**: Same 4-section structure across all examples
- **Clear Architecture**: Separation of concerns demonstrated in all demos
- **Copy-Paste Code**: Ready-to-use examples for emoji tracking and collaborative features
- **Comprehensive Docs**: WebSocket patterns documented with real-world examples

**Use Cases Demonstrated**:
- **Ephemeral Tracking**: Mouse cursors, presence indicators, typing indicators
- **Collaborative Features**: Multi-user editing, shared state, activity feeds
- **Hybrid Architecture**: REST for actions + WebSocket for notifications
- **Educational Patterns**: How to structure SPAs with WebSocket integration

**Migration Path**:
- Zero Breaking Changes: New features, no existing code affected
- Backward Compatible: Modal dialog fix maintains existing API
- Documentation: Complete guides for WebSocket integration patterns
- Examples: Three progressive examples (MPA, SPA, Real-time SPA)

________________________________________________
## v0.9.0, W-073, 2025-10-04

**Commit:** `W-073, v0.9.0: Enterprise WebSocket Infrastructure with Real-Time Communication, Monitoring & Testing`

**REAL-TIME COMMUNICATION INFRASTRUCTURE**: Production-ready WebSocket infrastructure for bidirectional real-time communication between server and browser, with comprehensive monitoring, authentication, auto-reconnection, and horizontal scaling preparation.

**Objective**: Provide enterprise-grade WebSocket support for collaborative applications, live updates, and SPA real-time features with namespace isolation, authentication/authorization, persistent client identity, and "don't make me think" onboarding experience.

**Key Features**:
- **Enterprise WebSocket Server** (`webapp/controller/websocket.js`): Complete namespace management, session integration, authentication/authorization
- **Client Utilities** (`jPulse.ws.*`): Connect, send, receive, status tracking, auto-reconnection
- **Admin Monitoring** (`/admin/websocket-status`): Real-time dashboard with per-namespace stats and color-coded activity log
- **Developer Tools** (`/admin/websocket-test`): Interactive test interface for WebSocket development
- **Comprehensive Documentation** (`docs/websockets.md`): Complete guide with patterns and best practices

**WebSocket Server Infrastructure**:
- **Namespace Isolation**: `/ws/*` prefix with independent client pools per namespace
- **Authentication & Authorization**: Consolidated using `AuthController` with session middleware integration
- **Session Context**: Manual session middleware invocation during WebSocket upgrade
- **Client Identity**: Server tracks client UUID, username, and user context
- **Statistics Tracking**: Messages per minute, total messages, active users, last activity
- **Activity Logging**: Real-time activity log (last 5 minutes) with message truncation

**Client-Side Utilities** (`jPulse.ws.*`):
- **Connection Management**: `connect(path, options)` returns handle with methods
- **Persistent UUID**: Client-generated UUID v4 stored in localStorage
- **Username Tracking**: Automatic username inclusion in all messages
- **Auto-Reconnection**: Progressive backoff (5s → 30s max) with configurable retry limits
- **Health Checks**: Bidirectional ping/pong (30s interval)
- **Status Callbacks**: Real-time connection status updates (connecting/connected/reconnecting/disconnected/error)
- **Message API**: Standardized format with success/data/error wrapper

**Admin Monitoring Dashboard** (`/admin/websocket-status`):
- **Per-Namespace Stats**: Status indicator, clients, active users, messages/min, total messages, last activity
- **Overall Stats**: Server uptime, total messages across all namespaces
- **Real-Time Activity Log**: Color-coded messages (success=green, error=red, info=blue, warning=orange)
- **Message Truncation**: Smart truncation (75 chars ... 75 chars) for long messages
- **Live Updates**: WebSocket-powered real-time statistics updates
- **Breadcrumb Navigation**: Hierarchical navigation to admin dashboard

**Developer Test Tool** (`/admin/websocket-test`):
- **Interactive Testing**: Send custom messages and pre-configured test messages
- **Connection Controls**: Connect/disconnect with status display
- **Message Log**: Real-time message history with timestamps
- **Client Info**: Display client UUID, username, namespace
- **Toast Feedback**: Success/error notifications for user actions
- **Test Message Types**: Info, success, warning, error with color-coded display

**High Availability & Scaling**:
- **Redis Pub/Sub Preparation**: Configuration and architecture for multi-instance coordination
- **Horizontal Scaling**: Conditional Redis pub/sub for PM2 cluster mode (W-076 required for testing)
- **Progressive Reconnection**: Exponential backoff prevents server overload
- **Ping/Pong Health Checks**: Automatic connection health monitoring
- **Graceful Degradation**: "Fire and forget" messaging with application-level retry responsibility

**UI Enhancements**:
- **Dialog-Style Card Headers** (`.jp-card > h2:first-child`): Gray background heading for dashboard cards
- **Subheading Component** (`.jp-subheading`): Baseline-aligned helper text in card headers
- **WebSocket Icon**: Electric outlet style SVG for admin dashboard
- **Color-Coded Activity**: Visual distinction for message types in activity log

**Internationalization**:
- **English** (`webapp/translations/en.conf`): Complete i18n keys for WebSocket UI
- **German** (`webapp/translations/de.conf`): Complete i18n keys for WebSocket UI
- **Admin Dashboard**: Fully internationalized WebSocket status and test pages

**Documentation**:
- **Complete Guide** (`docs/websockets.md`): Server setup, client usage, patterns, examples
- **Front-End Guide** (`docs/front-end-development.md`): Quick start and integration examples
- **API Reference**: Complete `jPulse.ws.*` API documentation
- **Best Practices**: Security, scalability, error handling patterns

**Testing Infrastructure**:
- **Server Tests** (`webapp/tests/unit/controller/websocket.test.js`): 26 comprehensive tests
  - Authentication & authorization (7 tests)
  - Broadcasting (6 tests)
  - Namespace registration (5 tests)
  - Client connections (5 tests)
  - Session integration (3 tests)
- **Client Tests** (`webapp/tests/unit/utils/jpulse-websocket-simple.test.js`): 39 comprehensive tests
  - UUID generation & persistence (9 tests)
  - Configuration & API contract (8 tests)
  - Protocol selection & URL construction (8 tests)
  - WebSocket state constants (3 tests)
  - Configuration ranges (4 tests)
  - Edge cases (4 tests)
  - Performance tests (3 tests)
- **Test Utilities** (`webapp/tests/helpers/websocket-test-utils.js`): Mock classes and helpers
- **Total Coverage**: 65 tests with fast execution (<3 seconds combined)

**Technical Implementation**:
- **Dependencies**: Added `ws` npm package for WebSocket server
- **Configuration**: Redis pub/sub settings in `webapp/app.conf`
- **Server Initialization**: `webapp/app.js` initializes WebSocket with session middleware
- **Route Protection**: Admin routes require authentication and admin/root roles
- **Message Format**: Consistent with HTTP API format (success/data/error/code)
- **UUID v4 Generation**: Client-side UUID generation following RFC 4122
- **localStorage Persistence**: Client UUID persists across sessions/reconnections

**Files Created**:
- webapp/controller/websocket.js: WebSocket server controller (807 lines)
- webapp/view/admin/websocket-status.shtml: Admin monitoring dashboard (495 lines)
- webapp/view/admin/websocket-test.shtml: Interactive test tool (393 lines)
- webapp/static/assets/admin/icons/websocket.svg: WebSocket icon
- docs/websockets.md: Complete WebSocket documentation
- webapp/tests/unit/controller/websocket.test.js: Server tests (886 lines)
- webapp/tests/unit/utils/jpulse-websocket-simple.test.js: Client tests (400 lines)
- webapp/tests/helpers/websocket-test-utils.js: Test utilities (255 lines)

**Files Modified**:
- webapp/app.js: WebSocket server initialization
- webapp/app.conf: Redis configuration section
- webapp/view/jpulse-common.js: Added jPulse.ws.* client utilities
- webapp/view/jpulse-common.css: Dialog-style card headers and subheading
- webapp/view/admin/index.shtml: WebSocket status dashboard link
- webapp/translations/en.conf: WebSocket i18n keys
- webapp/translations/de.conf: WebSocket i18n keys
- docs/front-end-development.md: WebSocket quick start section
- docs/README.md: v0.9.0 highlights and WebSocket features
- package.json: ws dependency

**Quality Assurance**:
- All 702 tests passing (65 WebSocket + 637 existing)
- Fast test execution (no hanging async tests)
- Zero regressions introduced
- Comprehensive server and client coverage
- Manual testing with multiple browsers
- Production-ready deployment

**Developer Experience**:
- **Simple API**: `jPulse.ws.connect(path)` returns handle with intuitive methods
- **Auto-Reconnection**: Handles network issues automatically
- **Status Tracking**: Real-time connection status updates
- **Namespace Isolation**: Clean separation of concerns
- **Admin Monitoring**: Visual insight into WebSocket health
- **Interactive Testing**: Test tool for rapid development
- **Complete Documentation**: Step-by-step guides and examples

**Enterprise Features**:
- **Authentication**: Namespace-level auth and role-based access control
- **Session Integration**: Full Express session context in WebSocket handlers
- **Horizontal Scaling**: Redis pub/sub architecture for multi-instance deployments
- **Monitoring**: Real-time dashboards with activity logs
- **Security**: Authentication, authorization, and session validation
- **Reliability**: Auto-reconnection, health checks, graceful degradation

**Use Cases**:
- Collaborative editing and real-time document updates
- Live notifications and activity feeds
- Chat and messaging applications
- Dashboard real-time metrics and monitoring
- Multi-user interactive features
- SPA state synchronization across clients

**Migration Path**:
- **Zero Breaking Changes**: New feature, no existing code affected
- **Opt-In**: Applications choose to enable WebSocket namespaces
- **Documentation**: Complete guides for integration
- **Examples**: Test tool demonstrates usage patterns

________________________________________________
## v0.8.6, W-074, 2025-10-04

**Commit:** `W-074, v0.8.6: Consistent jPulse Utility Organization - All Utilities in Logical Namespaces`

**FRAMEWORK CONSISTENCY & DEVELOPER EXPERIENCE**: Complete refactoring of jPulse client-side utilities into consistent, logical namespaces for improved maintainability, discoverability, and developer experience.

**Objective**: Organize all jPulse utilities into clear, consistent namespaces (buckets) to eliminate confusion and improve API predictability. No more root-level functions mixed with namespaced utilities.

**Key Changes**:
- **API Consistency**: `jPulse.apiCall()` → `jPulse.api.call()` (now alongside get/post/put/delete)
- **Toast Notifications**: Slide-down messages → `jPulse.UI.toast.*` (industry-standard naming)
- **Complete Organization**: All utilities now in logical buckets (api, form, dom, date, string, url, device, cookies, UI, clipboard)

**API Call Standardization**:
- **Before**: `jPulse.apiCall(endpoint, options)` (inconsistent with api.get/post/put/delete)
- **After**: `jPulse.api.call(endpoint, options)` (consistent namespace)
- **Impact**: 36 call sites updated across entire codebase
- **Benefit**: Clear grouping with related HTTP methods

**Toast Notification Refactoring**:
- **Before**: `jPulse.showSlideDownMessage/Error/Success/Info/Warning/clearSlideDownMessages()`
- **After**: `jPulse.UI.toast.show/error/success/info/warning/clearAll()`
- **Impact**: 135 call sites updated across entire codebase
- **Benefit**: "Toast" conveys transient, non-blocking nature; grouped with other UI widgets

**Complete Namespace Organization**:
- **jPulse.api.***: call, get, post, put, delete, handleError
- **jPulse.form.***: bindSubmission, handleSubmission, serialize, setLoadingState, clearErrors, showFieldErrors, validate
- **jPulse.dom.***: ready, createElement, hide, show, toggle
- **jPulse.date.***: formatLocalDate, formatLocalDateAndTime
- **jPulse.string.***: escapeHtml, capitalize, slugify
- **jPulse.url.***: getParams, getParam
- **jPulse.device.***: isMobile, isTablet, isDesktop, isTouchDevice, getViewportSize, detectBrowser, detectOs
- **jPulse.cookies.***: get, set, delete
- **jPulse.UI.***: toast, collapsible, accordion, tabs, alertDialog, infoDialog, confirmDialog, sourceCode
- **jPulse.clipboard.***: copy, copyFromElement

**Technical Implementation**:
- **Core** (`webapp/view/jpulse-common.js`): Restructured to move functions into proper namespaces
- **Views**: Updated 11 view files (auth, admin, user, jpulse-examples)
- **Site Files**: Updated 12 site template files (hello, hello-todo, hello-vue + README)
- **Documentation**: Updated front-end-development.md, api-reference.md
- **Tests**: Updated 36 test files for new API
- **Total**: 87 files updated across entire codebase

**Developer Experience**:
- **Predictable API**: All related functions grouped together
- **Easy Discovery**: Clear namespaces make functions easy to find
- **Industry Standard**: Toast terminology is universally recognized
- **Clean Separation**: No more root-level utility functions
- **Maintainability**: Clear organization for future enhancements

**Migration Path**:
- **No Backward Compatibility**: Clean cutover (pre-1.0.0 allows breaking changes)
- **Simple Find/Replace**: Automated refactoring across entire codebase
- **Zero Ambiguity**: New names clearly indicate purpose and location

**Files Modified**:
- webapp/view/jpulse-common.js: Restructured utility organization
- webapp/view/auth/*.shtml: Updated API calls and toast notifications
- webapp/view/admin/*.shtml: Updated API calls and toast notifications
- webapp/view/user/*.shtml: Updated API calls and toast notifications
- webapp/view/jpulse-examples/*.shtml: Updated API calls and toast notifications
- site/webapp/view/**/*.shtml: Updated site template examples
- site/webapp/controller/helloVue.js: Updated comments and examples
- site/README.md: Updated documentation
- docs/front-end-development.md: Updated API documentation
- webapp/tests/unit/**/*.test.js: Updated 36 test files
- Total: 87 files updated

**Test Coverage**:
- All tests updated and passing
- Zero regressions introduced
- Comprehensive coverage maintained

**Quality Assurance**:
- All 637+ tests passing
- Manual browser testing verified
- No breaking changes to functionality
- Clean, consistent API throughout

**Documentation**:
- Complete API reference updates
- Front-end development guide revised
- All examples updated with new syntax
- Clear migration path documented

________________________________________________
## v0.8.5, W-072, 2025-10-03

**Commit:** `W-072, v0.8.5: Vue.js SPA Demo & Enhanced jPulse Utilities for Modern Web Development`

**EDUCATIONAL ENHANCEMENT & FRAMEWORK UTILITIES**: Complete Single Page Application demonstration with Vue.js 3, Vue Router, client-side routing, and enhanced jPulse common utilities for date formatting and error handling across the entire framework.

**Objective**: Provide comprehensive SPA learning example and standardize date formatting and error handling throughout the jPulse Framework ecosystem.

**Key Features**:
- **Complete Vue.js SPA**: Full single-page application with client-side routing and dynamic content
- **Enhanced jPulse Utilities**: New `jPulse.date` and enhanced `jPulse.api` namespaces
- **Educational Value**: Progressive learning path from overview to interactive demos
- **Real API Integration**: Demonstrates jPulse.api.call() with hello-todo backend
- **Browser History Support**: Back/forward buttons work seamlessly with Vue Router
- **Code Examples**: Comprehensive implementation patterns and best practices

**Vue.js SPA Implementation**:
- **5 Interactive Pages**: Overview, Todo Demo, Features, Code Examples, About
- **Vue Router Integration**: History mode with clean URLs (no hash)
- **Component Architecture**: Separate `.tmpl` files for each page component
- **Global Error Handler**: Catches all Vue errors with user feedback
- **Active State Management**: Reactive navigation with proper highlighting
- **Loading States**: Professional loading overlay with spinner
- **Responsive Design**: Mobile-first with 4-column grid layout

**Enhanced jPulse Utilities**:
- **jPulse.date.formatLocalDate(date)**: Returns YYYY-MM-DD format using local browser timezone
- **jPulse.date.formatLocalDateAndTime(date)**: Returns YYYY-MM-DD HH:MM format
- **jPulse.api.handleError(error, action, options)**: Unified error handling with console logging and slide-down messages

**Technical Implementation**:
- **View** (`site/webapp/view/hello-vue/index.shtml`): Main SPA shell with Vue.js and Vue Router
- **Routing** (`site/webapp/view/hello-vue/templates/routing.tmpl`): Router configuration and main app
- **Components** (`site/webapp/view/hello-vue/templates/*.tmpl`): Five page components registered to window.jpSpaRoutes
- **Controller** (`site/webapp/controller/helloVue.js`): Demo API endpoint for SPA data
- **Enhanced Utilities** (`webapp/view/jpulse-common.js`): New date namespace and enhanced API namespace
- **Documentation** (`docs/mpa-vs-spa.md`): Comprehensive MPA vs SPA comparison with ASCII diagrams

**User Experience**:
- **Progressive Learning**: Overview → Interactive Demo → Features → Code → About
- **Navigation Cards**: Visual dashboard with emoji icons and descriptions
- **Active Button Highlighting**: Clear indication of current page
- **Error Resilience**: Vue error handler prevents silent failures
- **Consistent Styling**: Uses jp-* framework classes throughout
- **Mobile Responsive**: Works perfectly on all device sizes

**Developer Experience**:
- **Template Separation**: Each page is a separate file for maintainability
- **Reusable Utilities**: Date formatting and error handling standardized
- **Simple Integration**: Just call `jPulse.date.formatLocalDate(date)`
- **Consistent Error Handling**: One-line `jPulse.api.handleError(error, 'action')`
- **Zero Duplication**: Eliminated duplicate error handling code
- **Clean Console**: Removed verbose logging, kept essential error messages

**Files Added/Modified**:
- `site/webapp/view/hello-vue/index.shtml`: Main SPA HTML shell with styles
- `site/webapp/view/hello-vue/templates/routing.tmpl`: Vue Router setup and main app
- `site/webapp/view/hello-vue/templates/overview.tmpl`: Overview page component
- `site/webapp/view/hello-vue/templates/todo-demo.tmpl`: Interactive todo demo component
- `site/webapp/view/hello-vue/templates/features.tmpl`: SPA features showcase component
- `site/webapp/view/hello-vue/templates/code.tmpl`: Code examples component
- `site/webapp/view/hello-vue/templates/about.tmpl`: About SPA component
- `site/webapp/controller/helloVue.js`: Vue SPA demo API controller
- `webapp/view/jpulse-common.js`: Enhanced with jPulse.date namespace and jPulse.api.handleError()
- `site/webapp/view/hello-todo/index.shtml`: Updated to use jPulse.date.formatLocalDate()
- `docs/mpa-vs-spa.md`: Complete rewrite with diagrams, use cases, and examples
- `docs/README.md`: Updated with v0.8.5 release information
- `docs/CHANGELOG.md`: This entry

**Test Coverage**:
- `webapp/tests/unit/site/hello-vue-controller.test.js`: Controller structure and integration tests (3 passing)
- `webapp/tests/unit/utils/jpulse-common-enhanced.test.js`: Utility verification tests (11 passing)
- **Total**: 637 tests passing, 0 failures, 10 skipped

**Educational Impact**:
- Perfect onboarding for developers learning SPA development
- Clear demonstration of Vue Router integration patterns
- Real API integration examples with jPulse backend
- Template separation patterns for large SPAs
- Framework utility enhancement examples

**Quality Assurance**:
- All 637 tests passing with comprehensive coverage
- Zero test failures or regressions
- Production-ready code with proper error handling
- Performance optimized with efficient rendering
- Follows all jPulse Framework best practices

**Documentation**:
- Enhanced MPA vs. SPA comparison with ASCII architecture diagrams
- Detailed feature comparison table with visual indicators
- Use case guidance for choosing the right architecture
- Code examples for all three patterns (MPA, jPulse MPA, SPA)
- Migration path and best practices

________________________________________________
## v0.8.4, W-071, 2025-09-30

**Commit:** `W-071, v0.8.4: Hello To-Do MVC Demo for Site Development Learning`

**EDUCATIONAL ENHANCEMENT**: Complete Model-View-Controller demonstration with MongoDB integration, REST API patterns, user authentication context, and interactive UI for site developer onboarding and learning.

**Objective**: Make it easy for site developers to create their own MVC trio with MongoDB collection by providing a comprehensive, working example that follows jPulse Framework best practices.

**Key Features**:
- **Complete MVC Pattern**: Full Model-View-Controller demonstration with clear separation of concerns
- **MongoDB Integration**: HelloTodoModel with schema validation, CRUD operations, and statistics
- **REST API Excellence**: HelloTodoController with comprehensive API endpoints (GET, POST, PUT, DELETE)
- **Interactive UI**: Single-page application with real-time updates and user context
- **Educational Value**: Extensive documentation and code comments for learning
- **Auto-Registration**: Enhanced SiteRegistry for automatic API endpoint discovery
- **User Context**: Authentication integration with user information display
- **Framework Integration**: Uses jPulse.UI.confirmDialog, jPulse.dom.ready, ISO date formatting

**Technical Implementation**:
- **Model** (`site/webapp/model/helloTodo.js`): MongoDB schema with validation, CRUD methods, statistics
- **Controller** (`site/webapp/controller/helloTodo.js`): REST API with proper logging, error handling, timing
- **View** (`site/webapp/view/hello-todo/index.shtml`): Interactive UI with educational info box
- **Enhanced SiteRegistry**: Auto-discovery of apiCreate, apiToggle, apiDelete, apiStats methods
- **Dashboard Integration**: Conditional display using `{{#if (file.exists "hello-todo/index.shtml")}}`

**User Experience**:
- **Educational Info Box**: Clear explanation of MVC pattern and how to clone for custom apps
- **User Context Display**: Shows authenticated user information and guest mode
- **Real-time Statistics**: Live counts of total, completed, and pending to-dos
- **Professional UI**: Uses jp-container-1000, jp-card, jp-btn framework styles
- **Mobile Responsive**: Works properly on all device sizes
- **Confirmation Dialogs**: Uses framework's jPulse.UI.confirmDialog for delete operations

**Developer Experience**:
- **"Don't Make Me Think"**: Clear file structure and naming conventions
- **Copy-Paste Ready**: Easy to clone for custom MVC implementations
- **Comprehensive Logging**: Request parameters, timing, and completion status
- **Error Handling**: Proper validation, 404 handling, and user-friendly messages
- **Test Coverage**: Complete model tests with proper mocking
- **Framework Patterns**: Demonstrates all jPulse Framework best practices

**Files Added/Modified**:
- `site/webapp/model/helloTodo.js`: Complete MongoDB model with validation and CRUD
- `site/webapp/controller/helloTodo.js`: REST API controller with comprehensive endpoints
- `site/webapp/view/hello-todo/index.shtml`: Interactive UI with educational content
- `webapp/utils/site-registry.js`: Enhanced auto-registration for CRUD API methods
- `webapp/tests/unit/site/hello-todo-model.test.js`: Comprehensive model test coverage
- `webapp/tests/unit/utils/site-registry.test.js`: Updated tests for enhanced registry
- `webapp/view/home/index.shtml`: Already contained conditional hello-todo dashboard link

**Educational Impact**:
- Perfect onboarding experience for site developers learning MVC patterns
- Clear demonstration of MongoDB integration and schema design
- REST API best practices with proper error handling and logging
- Framework integration patterns (UI components, authentication, styling)
- Ready-to-clone example for custom site development

**Quality Assurance**:
- All 536 tests passing with comprehensive coverage
- Production-ready code with proper error handling
- Security best practices with user authentication context
- Performance optimized with efficient database queries

________________________________________________
## v0.8.3, W-067, 2025-09-29

**Commit:** `W-067, v0.8.3: Critical regression fix - site templates missing from npm package`

**CRITICAL BUG FIX**: Fixed regression where site/ directory templates were completely missing from published npm packages, breaking the W-014 site override system for all fresh installations.

**SECURITY FIX**: Fixed security vulnerability where site/webapp/app.conf (containing session secrets) was being included in npm packages.

**Root Cause**: package.json "files" array was missing "site/" entry, so site templates weren't published to npm.

**Impact**:
- Broke W-014 site override system for all fresh installations
- Fresh sites had empty site/ directories with no hello examples or templates
- Exposed sensitive configuration data in published packages

**Fix Applied**:
- Removed brittle package.json files array approach
- Implemented maintainable .npmignore exclusion-based approach
- Site templates now properly included while sensitive files excluded
- Future-proof: new site files automatically included without manual package.json maintenance
- Added .gitkeep to empty site sub-directories for better onboarding
- jPulse documentation not working: Fixed by correcting jpulse-update.js destination path from webapp/static/assets/jpulse/ to webapp/static/assets/jpulse-docs/

**Files Changed/Added**:
- package.json: Removed files array, now uses .npmignore for exclusions
- .npmignore: Added comprehensive exclusions for sensitive files
- docs/deployment.md: Updated GitHub repository setup documentation
- bin/jpulse-update.js: Fixed documentation path in webapp/static/assets/
- site/webapp/model/.gitkeep: Added to empty sub-directory
- site/webapp/static/assets/.gitkeep: Added to empty sub-directory

**Verification**:
- npm pack confirms site templates included (site/README.md, site/webapp/app.conf.tmpl, controllers, views, etc.)
- Sensitive site/webapp/app.conf properly excluded
- Package size optimized (800.3 kB, 203 files)

________________________________________________
## v0.8.2, W-066, 2025-09-29

**Commit:** `W-066, v0.8.2: Improved site specific docs for better onboarding`

Objectives: Better onboarding experience for site admins and site developers

New "Version Control and Site Management" section in installation document:
- Explain benefits of using version control for jPulse sites
- Step-by-step repository setup instructions
- Complete .gitignore file tailored for jPulse sites
- Security considerations (never commit .env, secrets, etc.)
- Deployment workflow from git repository
- What to include/exclude with clear rationale

Files Modified:
- docs/deployment.md: add new "Version Control and Site Management" section
- docs/template-reference.md: fix URL bug in .css and .js examples
- docs/installation.md: document how to wipe MongoDB data for a clean re-install
- api-reference.md and docs/deployment.md: fix incorrect links to jPulse docs from /jpulse/ to /jpulse-docs/
- site/README.md: reference and link to "Version Control and Site Management" in docs/deployment.md
- reverse sequence in HTML title in all .shtml pages to:
  `<title>Page title - {{app.shortName}}</title>`
- webapp/static/: add updated favicons to static root to new blue jPulse logo:
  - favicon-16x16.png
  - favicon-32x32.png
  - favicon.ico
- bin/test-all.js: add elapsed time to each test, and total time in grand total

________________________________________________
## v0.8.1, W-065, 2025-09-28

**Commit:** `W-065, v0.8.1: Branding: New jPulse Framework logo in the shape of a single pulse wave`

Change the jPulse Framework logo from a "jP" text logo to a round logo with a horizontal white pulse wave on a blue background, which is better brandable and more memorable

Deliverables:
- New jPulse Framework logo in the shape of a single pulse wave
- Improved SVG icons in /jpulse-examples/

________________________________________________
## v0.8.0, W-063, 2025-09-27

**Commit:** `W-063, v0.8.0: Interactive examples system with comprehensive UI demonstrations, syntax-highlighted source code widgets, clipboard functionality, and enhanced onboarding experience`

Implementation of W-063 interactive examples and documentation hub providing comprehensive code demonstrations, syntax-highlighted source code widgets with copy functionality, enhanced UI component showcase, and streamlined onboarding experience with Apache-style home page design for improved developer experience and framework adoption.

Major Features:
- **Interactive Examples System (W-063)**: Complete `/jpulse-examples/` documentation hub with live demonstrations
  - Six comprehensive example pages: index, handlebars, ui-widgets, forms, layout, api integration
  - Interactive code demonstrations with working examples and source code display
  - Cross-linking between documentation and examples for seamless learning experience
  - Professional card-based navigation with clear categorization and descriptions
  - Responsive design with consistent styling and user experience patterns

- **Source Code Widget System**: Syntax-highlighted code blocks with copy functionality
  - `jPulse.UI.sourceCode.register()` and `jPulse.UI.sourceCode.initAll()` API
  - Prism.js integration for syntax highlighting (JavaScript, HTML, CSS, Python, etc.)
  - Copy-to-clipboard functionality with `jPulse.clipboard.copy()` utility
  - Language labels with customizable display (`data-show-lang="true"`)
  - Configurable copy button visibility (`data-show-copy="false"`)
  - Automatic initialization on DOM ready for seamless integration

- **Enhanced UI Widget Showcase**: Comprehensive demonstrations of all jPulse UI components
  - Content Navigation & Show/Hide: tabs, accordion, collapsible widgets
  - Buttons & Dialogs: button variants, modal dialogs, complex nested dialogs
  - Content: form validation, content boxes, source code display
  - Live examples with working JavaScript and proper source code accuracy
  - Enhanced panelHeight API with three options: undefined (natural), 'auto' (equalized), fixed values

- **Streamlined Home Page**: Apache-inspired onboarding experience
  - Clean, professional welcome page with installation confirmation
  - File location guidance and customization instructions
  - Direct navigation links to documentation and examples
  - Reduced from 710 to 168 lines (76% smaller) for faster loading
  - Teaching example using `.local-*` CSS prefix for page-specific styles

User Experience Enhancements:
- **Content Organization**: Logical grouping of widgets and examples by functionality
- **Cross-Linking**: Seamless navigation between documentation and live examples
- **Copy Functionality**: One-click code copying for rapid development workflow
- **Visual Consistency**: Unified styling and interaction patterns across all examples
- **Mobile Responsive**: All examples work properly on mobile devices and tablets

Developer Experience:
- **Complete Source Code**: All examples include accurate, copy-paste ready code
- **Teaching Tools**: Clear separation between framework (`.jp-*`) and local (`.local-*`) styles
- **Comprehensive Testing**: New test suite for source code widget and clipboard functionality
- **Documentation Hub**: Centralized access to all framework capabilities and examples
- **Onboarding Flow**: Clear path from installation confirmation to productive development

Technical Implementation:
- **Prism.js Integration**: Fixed dependency issues with clike.js for JavaScript highlighting
- **Clipboard API**: Modern clipboard integration with fallback support
- **CSS Organization**: Consolidated button and accordion styles for better maintainability
- **Performance**: Default natural panel heights for better performance, explicit opt-in for auto-adjustment
- **Accessibility**: Proper semantic HTML and keyboard navigation support

________________________________________________
## v0.7.21, W-064, 2025-09-25

**Commit:** `W-064, v0.7.21: Complete tab interface widget system with navigation tabs, panel tabs, nested hierarchies, programmatic control API, and professional styling with divider interruption effects`

Implementation of W-064 tab interface widget providing a comprehensive tabbed interface system for both page navigation and content switching within pages, featuring nested tab hierarchies, programmatic control API, professional styling with divider interruption effects, and comprehensive test coverage for enterprise-grade user interface development.

Major Features:
- **Tab Interface Widget System (W-064)**: Complete `jPulse.UI.tabs` implementation for modern tabbed interfaces
  - Unified API: `jPulse.UI.tabs.register(elementId, options, activeTabId)` with handle-based control
  - Automatic tab type detection (navigation vs panel) based on `url` or `panelId` properties
  - Handle object with methods: `activateTab()`, `getActiveTab()`, `refresh()`, `destroy()`
  - Professional CSS styling with `jp-tabs`, `jp-tab`, `jp-panel` class system
  - Responsive design with horizontal scrolling support for tab overflow

- **Navigation Tabs**: Page routing and navigation with URL-based tab definitions
  - Cross-page navigation with consistent tab state management
  - URL routing with `{ id: 'home', label: 'Home', url: '/home/' }` syntax
  - Tooltip support and conditional display with `tabClass` property
  - Spacer elements for flexible tab layout and visual grouping
  - Professional button-like styling with hover states and active indicators

- **Panel Tabs**: Content switching within pages with slide animation support
  - Panel content switching with `{ id: 'tab1', label: 'Tab 1', panelId: 'panel1' }` syntax
  - Slide animation system with CSS transitions and timing control
  - Automatic panel container management and DOM element organization
  - Active panel state management with `jp-panel-active` class system
  - Configurable animation timing and smooth content transitions

- **Nested Tab Hierarchies**: Multi-level tab systems for complex interfaces
  - Independent nested tab instances with proper visual containment
  - Department → Engineering → Dashboard/R&D/SCM/SVT/DevOps hierarchy example
  - Proper visual nesting with tabs contained within parent panels
  - Separate initialization and control for each nesting level
  - Clean visual hierarchy with appropriate heading levels (h4 → h5 → h6)

- **Professional Visual Design**: Enterprise-grade styling with divider interruption effects
  - Active tab connection to content panels with seamless visual flow
  - Divider interruption using pseudo-elements with white background coverage
  - Inactive tabs styled as non-intrusive buttons with rounded corners
  - Gradient backgrounds and proper z-index layering for visual depth
  - Responsive design with mobile-friendly touch targets and spacing

User Experience Enhancements:
- **Programmatic Control API**: Handle-based methods for external tab control
  - `handle.activateTab(tabId)` for programmatic tab switching
  - `handle.getActiveTab()` for current state inspection
  - Custom event dispatching with `jp-tab-changed` events
  - Callback system with `onTabChange(tabId, previousTabId, tabData)` support
  - Integration with external controls and automation systems

- **Configuration Flexibility**: Comprehensive options for diverse use cases
  - Active tab parameter precedence: `activeTabId` parameter overrides `options.activeTab`
  - Disabled tab support with `disabled: true` property
  - Icon support with `icon` property for visual enhancement
  - Conditional display with `tabClass` for role-based tab visibility
  - Responsive scrolling with `responsive: 'scroll'` option

- **Comprehensive Demo Implementation**: Production-ready examples in home page
  - Navigation tabs demo with page routing examples
  - Panel tabs demo with content switching and slide animations
  - Nested tabs demo with department → engineering → sub-department hierarchy
  - Programmatic control demo with step-by-step tab automation
  - Visual styling examples with clean, professional appearance

Technical Implementation:
- **Robust Architecture**: Clean separation of concerns with internal function organization
  - Internal functions prefixed with underscore (`_setup`, `_createTabStructure`, `_switchPanels`)
  - Proper DOM manipulation with element creation and class management
  - Event handling with click listeners and custom event dispatching
  - Configuration validation and error handling with console warnings
  - Memory management with proper cleanup in `destroy()` method

- **CSS Framework Integration**: Professional styling integrated with existing `jp-*` class system
  - `.jp-tabs`, `.jp-tabs-list`, `.jp-tab`, `.jp-tab-active` class hierarchy
  - `.jp-tabs-navigation`, `.jp-tabs-panel` type-specific styling
  - `.jp-panel`, `.jp-panel-active` content management classes
  - Responsive design with media queries for mobile optimization
  - Animation classes with `.jp-panel-sliding` for smooth transitions

- **Comprehensive Test Coverage**: Production-ready validation with 25+ new test cases
  - Tab registration and API testing with handle object validation
  - Tab type detection testing (navigation vs panel based on properties)
  - Tab structure creation testing with proper DOM element generation
  - Tab activation and switching testing with programmatic control
  - Configuration options testing (disabled tabs, icons, responsive scrolling)
  - Active tab parameter precedence testing with override behavior
  - Handle methods testing (refresh, destroy, getActiveTab)
  - Panel animation testing with slide transition validation

Developer Experience:
- **Intuitive API Design**: Clean, object-oriented interface following established patterns
  - Consistent with existing `jPulse.UI.accordion` and `jPulse.UI.collapsible` widgets
  - Handle-based methods avoiding string ID dependencies in application code
  - Clear separation between navigation and panel tab functionality
  - Comprehensive documentation with inline code examples
  - Error handling with descriptive console warnings for debugging

- **Update-Safe Implementation**: Framework enhancement without breaking changes
  - Added to existing `jPulse.UI` namespace without modifying existing widgets
  - CSS classes follow established `jp-*` naming convention
  - No conflicts with existing accordion or collapsible functionality
  - Backward compatible with existing UI widget implementations
  - Clean integration with site customization system

________________________________________________
## v0.7.20, W-062, 2025-09-24

**Commit:** `W-062, v0.7.20: Complete nested handlebars support with multi-line blocks, left-to-right processing, and comprehensive test coverage for complex template scenarios`

Implementation of W-062 nested handlebars support enabling complex template scenarios with nested {{#if}} and {{#each}} blocks, multi-line block support, efficient left-to-right processing algorithm, and comprehensive test coverage for production-ready template development capabilities.

Major Features:
- **Nested Handlebars Support (W-062)**: Complete implementation of nested block handlebars for complex template scenarios
  - Nested {{#if}} blocks within {{#each}} loops with proper context management
  - Nested {{#each}} loops for multi-dimensional data structures (books → chapters)
  - Multi-level nesting with 16-level recursion depth protection
  - Left-to-right processing algorithm ensuring correct evaluation order
  - Efficient regex-based 3-phase approach: annotation, resolution, cleanup

- **Multi-line Block Support**: Production-ready multi-line template processing
  - Multi-line {{#if}} blocks spanning multiple lines with proper whitespace handling
  - Multi-line {{#each}} blocks for complex HTML structure generation
  - Regex dotall modifier (s flag) for cross-line pattern matching
  - Preserved formatting and indentation in template output
  - Enhanced readability for complex template structures

- **Advanced Template Processing Engine**: Robust left-to-right evaluation system
  - Single regex pattern handling both block and regular handlebars simultaneously
  - Proper context management for nested {{#each}} iterations (@index, @key, this)
  - Encapsulated helper functions with underscore prefix for clean architecture
  - Efficient recursive processing without redundant annotation phases
  - Standardized error handling with descriptive HTML comments

- **Comprehensive Test Coverage**: Production-ready validation with 576+ tests
  - 14 new nested handlebars test cases covering all nesting scenarios
  - Array iteration with nested conditionals and proper context isolation
  - Object iteration with nested loops and multi-dimensional data structures
  - Multi-line block processing with complex HTML generation
  - Edge case handling for empty arrays, null values, and error conditions
  - Test consolidation into main view.test.js for improved maintainability

Template Development:
- **Enhanced Template Capabilities**: Powerful nested structures for complex applications
  - User management interfaces with nested user lists and conditional active badges
  - Product catalogs with nested categories and conditional availability displays
  - Navigation systems with nested menu items and dynamic styling
  - Data tables with nested row details and conditional formatting
  - Dashboard widgets with nested data visualization and interactive elements

- **Developer Experience Improvements**: Intuitive nested syntax with comprehensive error handling
  - Natural nesting syntax following Handlebars.js conventions
  - Clear error messages for debugging nested template issues
  - Multi-line support for readable template organization
  - Comprehensive documentation with practical nested examples
  - Enhanced test framework supporting complex template scenarios

Framework Architecture:
- **Clean Code Architecture**: Encapsulated helper functions with consistent naming
  - All handlebars helper functions moved inside processHandlebars with _ prefix
  - Consistent import usage eliminating global/local variable mixing
  - ES module export compatibility for modern JavaScript standards
  - Improved code organization with clear separation of concerns
  - Enhanced maintainability through function encapsulation

- **Performance Optimized Processing**: Efficient nested evaluation without redundant operations
  - Single-pass annotation phase for entire template content
  - Efficient recursive resolution with proper context passing
  - Minimal memory overhead for nested iteration contexts
  - Optimized regex patterns for fast pattern matching
  - Left-to-right processing ensuring correct evaluation order

Testing and Quality Assurance:
- **Comprehensive Test Suite**: 576+ tests with 100% pass rate including nested scenarios
  - All existing functionality preserved during nested implementation
  - New nested handlebars test cases covering complex template scenarios
  - Multi-line block processing validation with proper formatting
  - Error handling verification for edge cases and invalid inputs
  - Performance testing for nested loops with large datasets
  - Test file consolidation improving maintainability and organization

________________________________________________
## v0.7.19, W-061, 2025-09-23

**Commit:** `W-061, v0.7.19: Complete {{#each}} handlebars helper implementation with array and object iteration, special context variables, and comprehensive error handling`

Implementation of W-061 {{#each}} handlebars helper with comprehensive iteration support for arrays and objects, special context variables (@index, @first, @last, @key), nested property access, and robust error handling for enhanced template development capabilities.

Major Features:
- **{{#each}} Handlebars Helper (W-061)**: Complete iteration support for dynamic template content
  - Array iteration with {{#each array}}{{@index}}: {{this}}{{/each}} syntax
  - Object iteration with {{#each object}}{{@key}}: {{this}}{{/each}} syntax
  - Special context variables: @index (zero-based), @first/@last (boolean flags), @key (property names)
  - Nested property access with {{this.property.subproperty}} dot notation
  - Full recursive handlebars processing within iteration blocks

- **Enhanced Template Context System**: Rich iteration context with special variables
  - @index: Zero-based index for arrays, iteration count for objects
  - @first: Boolean flag indicating first iteration (useful for styling)
  - @last: Boolean flag indicating last iteration (useful for separators)
  - @key: Property name when iterating over object properties
  - this: Current array element or object property value with full dot notation support

- **Robust Error Handling**: Production-ready error management for iteration edge cases
  - Graceful handling of null/undefined values (returns empty string)
  - Clear error messages for non-iterable values (strings, numbers, functions)
  - HTML comment error output: <!-- Error: Cannot iterate over non-iterable value: string -->
  - Maintains template stability even with invalid data types

- **Performance Optimized Implementation**: Efficient iteration for production use
  - Optimized for large arrays and complex objects
  - Minimal memory overhead with efficient context creation
  - Recursive depth protection consistent with existing handlebars system
  - Type-flexible handling of mixed data types in objects

Template Development:
- **Enhanced Template Capabilities**: Powerful iteration for dynamic content generation
  - Navigation menu generation with {{#each navigationItems}}
  - Data table creation with {{#each tableData}}
  - Configuration display with {{#each settings}}
  - User interface lists with {{#each users}}
  - Complex nested object iteration for employee directories, product catalogs

- **Developer Experience Improvements**: Intuitive syntax following Handlebars.js conventions
  - Standard {{#each}} syntax familiar to developers
  - Rich context variables for flexible template logic
  - Comprehensive documentation with practical examples
  - Integration with existing {{#if}} conditionals for complex templates

Framework Quality:
- All 469 unit tests passing including 11 new comprehensive {{#each}} test cases
- Production-ready iteration system with complete error handling
- Enhanced template reference documentation with practical examples
- Seamless integration with existing handlebars infrastructure

________________________________________________
## v0.7.18, W-060, 2025-09-23

**Commit:** `W-060, v0.7.18: Complete TSV logging system conversion with scope-based organization, standardized API request tracking, and enhanced analytics capabilities`

Implementation of W-060 TSV logging system with comprehensive conversion from comma-space to tab-separated format, complete scope-based log organization, standardized API request tracking across all endpoints, and enhanced analytics capabilities for monitoring tools.

Major Features:
- **TSV Logging System Conversion (W-060)**: Complete migration to tab-separated values format
  - Converted all log output from comma-space separator to tab separator for easy parsing
  - Enhanced CommonUtils.formatLogMessage with intuitive parameter order (scope, message, level, req)
  - Implemented scope-based log organization with consistent API tracking patterns
  - Added enhanced message truncation (250 chars: 200 start + 50 end) for large payloads
  - Maintained backward compatibility while improving analytics capabilities

- **Standardized API Request Tracking**: Complete lifecycle logging for all API endpoints
  - Added logRequest entries to all API methods for comprehensive request tracking
  - Implemented consistent success/error logging pattern across all controllers
  - Enhanced timing information with "success: ... completed in Xms" format
  - Added logging for unknown API endpoints (404 cases) with proper error tracking
  - Standardized message prefixes: "success: ..." for successful operations, "error: ..." for failures

- **Scope-Based Log Organization**: Clean separation of concerns with structured logging
  - LogController methods now accept (req, scope, message) parameters for clear categorization
  - Implemented scope patterns: auth.login, config.get, user.search, markdown.api, etc.
  - Enhanced logRequest format with ==scope== for better human scanning of request events
  - Consistent scope usage across framework and site controllers for unified logging

- **Enhanced Analytics Capabilities**: Production-ready log format for monitoring tools
  - TSV format enables easy parsing by analytics tools and log processors
  - Structured scope-based organization for efficient filtering and analysis
  - Complete request lifecycle tracking from start (logRequest) to end (logInfo/logError)
  - Enhanced message truncation prevents log bloat while preserving essential information
  - Consistent timing information for performance monitoring and optimization

Framework Quality:
- All 545 tests passing including comprehensive logging functionality verification
- Production-ready TSV logging system with scope-based organization
- Enhanced API request tracking with complete lifecycle logging
- Improved analytics capabilities with structured log format for monitoring tools

________________________________________________
## v0.7.17, W-059, 2025-09-23

**Commit:** `W-059, v0.7.17: Complete markdown documentation filtering system with .jpulse-ignore functionality and enhanced test runner with color support`

Implementation of W-059 markdown documentation filtering system with comprehensive .jpulse-ignore functionality, complete API documentation, enhanced test runner with color support, and thorough testing coverage.

Major Features:
- **Markdown Documentation Filtering (W-059)**: Complete .jpulse-ignore implementation for content control
  - Added .jpulse-ignore file support in namespace roots (e.g., docs/.jpulse-ignore)
  - Implemented gitignore-like pattern matching with wildcard support (*, ?) and exact matches
  - Directory pattern support with trailing slash syntax (dev/working/) for excluding entire directories
  - File pattern support for excluding specific markdown files (*.backup.md, draft-*.md)
  - Comment support with # prefix and empty line handling for maintainable ignore files

- **Enhanced Markdown Controller**: Robust filtering integration with existing functionality
  - Added _loadIgnorePatterns() method for parsing .jpulse-ignore files with error handling
  - Implemented _shouldIgnore() method with comprehensive pattern matching logic
  - Modified _scanMarkdownFiles() to filter ignored files and directories at all hierarchy levels
  - Maintained backward compatibility with existing caching and directory listing functionality
  - Preserved hierarchical structure and README merging while respecting ignore patterns

- **Comprehensive Test Coverage**: 12 new tests ensuring reliable ignore functionality
  - Pattern parsing tests (4 tests): ignore file loading, comment handling, pattern compilation
  - Ignore logic tests (5 tests): exact matches, wildcards, directory patterns, nested paths
  - Integration tests (2 tests): full directory scanning with filtering, ignore file absence handling
  - Manual API testing confirmed dev/working/ directory exclusion and *.save* file filtering

- **Complete API Documentation**: Enhanced markdown API reference with ignore functionality
  - Added comprehensive Markdown Documentation API section to api-reference.md
  - Documented GET /api/1/markdown/:namespace/ and GET /api/1/markdown/:namespace/:path endpoints
  - Included namespace resolution, file filtering, caching behavior, and example requests
  - Added ignore pattern syntax documentation with practical examples and use cases

- **Enhanced Test Runner**: Improved visual feedback with color support
  - Added ANSI color codes for green PASSED and red FAILED status indicators
  - Enhanced readability across all test output with consistent color scheme
  - Maintained cross-platform compatibility with terminal color support
  - Improved user experience for quick visual scanning of test results

Framework Quality:
- All tests passing including 12 new markdown ignore functionality tests
- Production-ready .jpulse-ignore functionality with comprehensive pattern support
- Enhanced documentation system with content filtering capabilities for development workflows
- Improved developer experience with colored test output and clear visual feedback

________________________________________________
## v0.7.16, W-058, 2025-09-23

**Commit:** `W-058, v0.7.16: Standardized error handling across all controllers with enhanced sendError functionality and dynamic test statistics framework`

Complete implementation of W-058 standardized error handling with comprehensive sendError functionality, enhanced test framework with dynamic statistics parsing, and consistent output formatting across all test buckets.

Major Features:
- **Standardized Error Handling (W-058)**: Complete migration to global.CommonUtils.sendError across all controllers
  - Updated config.js, log.js, user.js, view.js controllers to use consistent sendError function
  - Enhanced site/webapp/controller/hello.js with standardized error handling (no i18n)
  - Maintained existing error codes while adding new ones following UPPER_CASE format
  - Added comprehensive i18n support for error messages in English and German translations

- **Enhanced sendError Functionality**: Robust error handling with debugging support
  - Added optional details parameter to preserve error.message for API debugging
  - Intelligent request type detection (API vs web) for appropriate response formatting
  - JSON responses for /api/ requests with structured error information
  - Redirect responses for web requests to user-friendly error pages
  - Consistent HTTP status codes and error code propagation

- **Comprehensive Test Coverage**: 13 new sendError tests ensuring reliability
  - API request testing with and without code/details parameters
  - Web request testing with URL encoding and redirect validation
  - Request type detection verification for various path patterns
  - Error response structure consistency and HTTP status code validation
  - Mocking framework integration for Express res object methods

- **Dynamic Test Statistics Framework**: Complete elimination of hardcoded test statistics
  - Enhanced all 5 test buckets (CLI Tools, Enhanced CLI, MongoDB, Unit Tests, Integration Tests) with dynamic parsing
  - Standardized output format "Total Tests: X, Passed: Y, Failed: Z" across non-Jest test buckets
  - Enhanced CLI Tools with 8 individual tracked tests (vs previous 1 assumed test)
  - Verified failure statistics parsing works correctly for all test bucket types
  - Improved test runner with comprehensive output parsing and error handling

- **CLI Tools Enhancement**: Detailed test tracking and standardized reporting
  - Converted monolithic CLI test into 8 individual tracked tests with async support
  - Added runTest() function for consistent test execution and result tracking
  - Enhanced validation coverage: package.json structure, template expansion, framework files, configuration syntax, PM2 ecosystem, environment variables, shell scripts, setup detection
  - Standardized output format matching Enhanced CLI and MongoDB test buckets

Framework Quality:
- All 544 tests passing (534 passed, 10 skipped) with accurate dynamic statistics
- Complete error handling consistency across all controllers and site overrides
- Enhanced debugging capabilities with preserved error details in API responses
- Verified test framework reliability with both success and failure scenarios
- Maintained backward compatibility while improving error handling standardization

________________________________________________
## v0.7.15, W-054, 2025-09-18

**Commit:** `W-054, v0.7.15: Deployment documentation simplification, troubleshooting enhancements, and comprehensive test framework`

Complete implementation of W-054 deployment documentation simplification and troubleshooting with enhanced testing framework, critical bug fixes, and "don't make me think" deployment experience.

Major Features:
- **Enhanced CLI Testing Framework (W-054)**: 17 new deployment validation tests
  - Template variable expansion validation preventing configuration failures
  - MongoDB setup validation with password hashing compatibility verification
  - Cross-platform compatibility testing for shell scripts and npm environments
  - Environment variable consistency testing ensuring .env matches template structure
  - Integrated into main test suite with individual test commands for targeted debugging

- **Critical Bug Fixes (13 total)**: Complete resolution of deployment-blocking issues
  - Fixed SESSION_SECRET auto-generation using proper crypto.randomBytes with ES modules
  - Resolved MongoDB authentication setup order preventing "Command createUser requires authentication" errors
  - Fixed MongoDB YAML configuration syntax ensuring proper security section formatting
  - Corrected MongoDB password hashing to match jPulse application bcrypt implementation
  - Fixed template variable expansion preventing %GENERATION_DATE%, %JPULSE_FRAMEWORK_VERSION% failures
  - Resolved PM2 startup configuration documentation with clear manual step instructions
  - Fixed shell script compatibility removing CommonJS require() statements in ES module context
  - Corrected environment variable sourcing in npm scripts for proper configuration loading

- **Symbolic Logs Directory**: Convenient developer access to system logs
  - Creates symbolic link from site root `logs/` to system log directory (e.g., `/var/log/jpulse.net/`)
  - Maintains proper system logging while providing convenient site-level access
  - Graceful fallback if symlink creation fails due to permissions

- **Unified Configuration Architecture**: Eliminated duplication and inconsistencies
  - Consolidated CONFIG_DEFINITIONS and VARIABLE_REGISTRY into unified CONFIG_REGISTRY
  - Implemented single expandAllVariables() function for consistent template processing
  - Enhanced MongoDB setup with robust user detection and authentication testing

Production Validation:
- Fresh install testing on jpulse.net production server with complete success
- MongoDB authentication setup working correctly with proper user creation
- PM2 clustering operational with 2 instances and proper logging
- All 519+ tests passing including new enhanced validation tests
- Zero deployment failures during fresh install process

________________________________________________
## v0.7.3, W-053, 2025-09-15

**Commit:** `W-053, v0.7.3: Enhanced deployment validation, fixed critical deployment bugs, and improved update mechanism`

Complete implementation of W-053 deployment configuration templates and validation with production-ready features.

Major Features:
- **Enhanced Deployment Validation (W-053)**: Comprehensive deployment testing suite
  - Production-grade deployment validation with `install-test.sh`
  - Enhanced update safety with dry-run support preventing data loss
  - Context-aware testing respecting dev vs prod deployment settings
  - Comprehensive unit and integration tests for deployment validation

- **Critical Deployment Bug Fixes**: Resolution of deployment-blocking issues
  - Enhanced MongoDB error handling with password validation
  - PM2 configuration consistency improvements (dev/prod)
  - Log directory ownership fixes for proper user permissions
  - Enhanced environment variable management with deployment context

Technical Improvements:
- Production nginx configuration templates with security hardening
- PM2 ecosystem templates with clustering and monitoring
- SSL certificate automation with Let's Encrypt integration
- jpulse-update CLI tool with dry-run support
- Comprehensive deployment troubleshooting documentation

________________________________________________
## v0.7.0, W-015, 2025-09-13

**Commit:** `W-015, v0.7.0: Deployment: Clean Onboarding Strategy with Complete Automation`

Complete implementation of W-015 clean deployment strategy with "don't make me think" automation.

Major Features:
- **Clean Deployment Strategy (W-015)**: Complete "don't make me think" deployment automation
  - Interactive setup with `npx jpulse-configure` for site creation
  - Automated system installation with `jpulse-install.sh`
  - MongoDB setup automation with `mongodb-setup.sh`
  - Production templates with nginx, PM2, and SSL configuration
  - Comprehensive validation with `install-test.sh`

- **Enhanced Package Distribution**: npm-based site creation workflow
  - Sites created independently using @jpulse/framework npm package
  - Clean separation between framework and site repositories
  - Automated dependency management and version control

Technical Improvements:
- Production-grade deployment scripts with enhanced error handling
- MongoDB security configuration with authentication setup
- PM2 clustering configuration for production scalability
- nginx integration with SSL certificate support
- Comprehensive system validation covering all deployment components

________________________________________________
## v0.6.7, W-050, 2025-09-13

**Commit:** `Checkpoint commit 5 for: W-015: deployment: strategy for clean onboarding`

Objective: clean separation of code and data, so that a site owner can maintain their own reporsitory for site/*

________________________________________________
## v0.6.6, W-051, 2025-09-12

**Commit:** `W-051, v0.6.6: Infrastructure: Framework Package Distribution`

Enhanced framework package distribution with improved site creation workflow and deployment automation foundation.

________________________________________________
## v0.6.0, W-051, 2025-09-11

**Commit:** `W-051, v0.6.0: Infrastructure: Framework Package Distribution`

Complete implementation of W-051 framework package distribution system.

Major Features:
- **Framework Package Distribution (W-051)**: npm-based distribution system
  - Sites created using `npx jpulse-configure` command
  - Clean separation between framework and site repositories
  - Automated framework file synchronization with `jpulse-update`
  - Version-controlled site customizations in `site/` directory

________________________________________________
## v0.5.5, W-052, 2025-09-11

**Commit:** `W-052, v0.5.5: Dual licensing implementation with AGPL v3 migration and commercial licensing foundation`

Complete implementation of W-052 dual licensing system with AGPL v3 migration.

Major Features:
- **Dual Licensing System (W-052)**: AGPL v3 open source with commercial licensing options
  - AGPL v3 license for open source projects, educational use, and government applications
  - Commercial licensing available for proprietary applications and SaaS products
  - Clear licensing guidelines and decision framework for users
  - Enterprise support and commercial features available with commercial license

________________________________________________
## v0.5.4, W-049, 2025-09-11

**Commit:** `W-049, v0.5.4: Complete markdown documentation system with API standardization, i18n support, comprehensive testing, and dependency cleanup`

Complete implementation of the W-049 markdown documentation system with production-ready features and comprehensive enhancements.

Major Features:
- **Markdown Documentation System (W-049)**: Full-featured documentation system
  - Created markdown.api controller with standardized success/error responses
  - Comprehensive i18n support for all user-facing messages
  - Consistent LogController.logError for all error cases
  - Standardized CommonUtils.sendError() usage across all API endpoints
  - Automatic title formatting with appConfig.controller.markdown.titleCaseFix

- **View System Improvements**: Clean hierarchical navigation
  - Created jpulse view with clean hierarchical navigation structure
  - Consistent jp-* and local-* CSS class prefixes
  - Enhanced jpulse-common.css with improved presentation styling
  - Proper nested HTML structure for documentation sidebar

- **Testing & Quality**: Comprehensive test coverage and dependency optimization
  - Complete unit test coverage for markdown controller (11/11 tests)
  - Updated w047-site-files integration tests
  - Removed problematic integration tests causing import.meta issues
  - Removed obsolete supertest dependency (17 packages eliminated)

- **Internationalization**: Full i18n support
  - Added controller.markdown translations for English and German
  - Added view.jpulse translations for English and German
  - Consistent i18n message patterns across system

- **Architecture Compliance**: Full W-014 site override support
  - Proper file resolution priority (site files first, framework fallback)
  - Clean separation between framework and site-specific code
  - Namespace-agnostic template system for any documentation namespace

________________________________________________
## v0.5.3, W-046, 2025-09-11

**Commit:** `W-046, v0.5.3: Complete documentation restructure with user/developer separation, focused reference guides, and enterprise-ready navigation system`

Complete implementation of W-046 documentation restructuring with comprehensive user/developer separation.

Major Features:
- **Documentation Restructuring (W-046)**: Complete separation of user-facing and developer-facing documentation
  - Focused API reference exclusively for /api/1/* REST endpoints with routing information
  - Complete front-end development guide covering jPulse JavaScript framework and utilities
  - Comprehensive style reference documenting complete jp-* CSS framework with components
  - Template reference covering server-side Handlebars system with security features

________________________________________________
## v0.5.2, W-048, 2025-09-11

**Commit:** `W-048, v0.5.2: Complete enterprise UI widget system with draggable dialogs, complex form interactions, accordion components, and comprehensive test coverage`

Complete implementation of W-048 enterprise UI widget system with native JavaScript widgets.

Major Features:
- **Enterprise UI Widget System (W-048)**: Complete native JavaScript widget library
  - jPulse.UI.alertDialog() and jPulse.UI.infoDialog() with draggable headers
  - jPulse.UI.confirmDialog() with enterprise-grade custom callbacks and nested workflows
  - jPulse.UI.accordion.register() with flexible decoration detection
  - Dialog stacking with automatic z-index management and viewport bounds
  - Promise-based APIs with comprehensive callback support and mobile-responsive design

________________________________________________
## v0.5.1, W-047, 2025-09-11

**Commit:** `W-047, v0.5.1: Complete site-specific coding and styling guidelines with comprehensive documentation, template system, and interactive demo implementation`

Complete implementation of W-047 site-specific development guidelines with comprehensive documentation.

Major Features:
- **Site Development Guidelines (W-047)**: Complete guidelines for site-specific coding and styling
  - jpulse-common.css.tmpl and jpulse-common.js.tmpl template files with site-* CSS prefix convention (renamed from site-common.* in W-098)
  - JavaScript extension pattern extending jPulse.site namespace for clear source identification
  - Automatic file detection and loading following "don't make me think" principle
  - Comprehensive site/README.md with development guidelines, best practices, and examples

________________________________________________
## v0.5.0, W-014, 2025-09-06

**Commit:** `W-014, v0.5.0: Complete site override architecture enabling seamless framework updates with comprehensive customization system`

Implemented comprehensive site customization system enabling seamless framework updates while preserving site-specific modifications.

Major Features:
- **Site Override Architecture (W-014)**: Complete framework/site separation system
  - Automatic file resolution priority: `site/webapp/` → `webapp/` (framework defaults)
  - Auto-discovery of site controllers and APIs with zero manual route registration
  - Configuration merging: framework defaults + site-specific overrides
  - Context extension system allowing sites to extend template data
  - Protected paths safe from framework updates (`site/`, `plugins/`, `.jpulse/site-*`)
  - "Don't make me think" principle - no manual configuration required

- **PathResolver System**: Intelligent module resolution with override priority
  - Resolves views, controllers, and static assets with site override support
  - Performance optimized - checks site path first, framework fallback
  - Comprehensive error handling and debugging support
  - Full test coverage with 14 passing tests

- **SiteRegistry System**: Automatic controller and API discovery
  - Scans `site/webapp/controller/` for controllers with `api()` methods
  - Dynamically registers API routes under `/api/1/[controller-name]`
  - Eliminates manual route registration - true auto-discovery
  - Consistent API endpoint patterns across framework and sites

- **Configuration Consolidation**: Enhanced multi-source config merging
  - Deep merging of `webapp/app.conf` (framework) + `site/webapp/app.conf` (site)
  - Timestamp-based cache invalidation for optimal performance
  - Source tracking in `.jpulse/config-sources.json` for debugging
  - Maintains backward compatibility with existing configurations

- **ContextExtensions System**: Template data extension framework
  - Provider-based system for extending Handlebars context
  - Site controllers can add custom variables and functions to templates
  - Priority-based provider system for conflict resolution
  - Performance optimized with module-level imports

- **Demo Implementation**: Working hello-world example
  - Site controller at `site/webapp/controller/hello.js` with API method
  - Site view at `site/webapp/view/hello/index.shtml` with interactive demo
  - API endpoint `/api/1/hello` demonstrating site override functionality
  - Interactive client-side demo using `jPulse.api.call()`

- **Comprehensive Testing**: Production-ready test coverage
  - 28 new tests covering all W-014 functionality
  - PathResolver: 14/14 tests passing (module resolution, performance, edge cases)
  - SiteRegistry: Comprehensive test suite (temporarily compatibility issues resolved)
  - Integration tests demonstrating "don't make me think" principle
  - All existing 416 tests continue passing - zero regressions

- **Developer Experience**: Clean, intuitive API design
  - Zero configuration required - works out of the box
  - Clear separation between framework and site code
  - Excellent error messages and debugging information
  - Follows established project patterns and conventions

________________________________________________
## v0.4.10, W-041, 2025-09-06

**Commit:** `W-041, v0.4.10: Complete site configuration management system with intuitive admin interface and comprehensive validation`

Implemented comprehensive site configuration management system for administrators.

Major Features:
- **Site Configuration Management (W-041)**: Complete admin configuration system
  - Intuitive admin interface at `/admin/config.shtml` for site configuration
  - Email settings management (SMTP server, port, user, password, TLS)
  - Site message management (broadcast messages)
  - Smart default "site" config creation with localhost-friendly defaults
  - Password visibility toggle with eye icon for better UX
  - Form dirty detection with save/cancel functionality
  - Comprehensive validation with admin email requirement
  - Full i18n support (English/German) following project patterns

- **Enhanced ConfigModel**: Added smtpPort field with proper validation (1-65535 range)
  - Updated schema, validation, and default values
  - Maintains backward compatibility with existing configs
  - Comprehensive email format validation

- **ConfigController Enhancements**: Smart default config handling
  - Auto-creates default "site" config when accessed
  - Clean API design using `/api/1/config/site` endpoint
  - Proper error handling and logging throughout

- **Comprehensive Testing**: Production-ready test coverage
  - 10 comprehensive config model tests covering validation logic
  - Schema validation, default values, and email validation tests
  - Clean test architecture without database dependencies
  - All 408 tests passing with seamless integration

- **Code Quality**: Clean, maintainable implementation
  - Removed unused configuration complexity
  - YAGNI principle applied for simpler codebase
  - Production-ready with excellent developer experience

________________________________________________
## v0.4.9, W-044, 2025-09-05

**Commit:** `W-044, v0.4.9: CSS prefix convention for clean "don't make me think" style organization with zero cognitive load`

Implemented clear CSS prefix convention eliminating cognitive load when working with styles.

Major Features:
- **CSS Prefix Convention (W-044)**: Perfect "don't make me think" CSS organization
  - `jp-*` prefix for common framework styles (always in `jpulse-common.css`)
  - `local-*` prefix for page-specific styles (always in current page's `<style>` section)
  - Zero cognitive load - prefix tells you exactly where to find any style
  - No naming conflicts - impossible to accidentally override common styles
  - Better searchability - `grep "jp-"` finds common, `grep "local-"` finds page-specific

- **Complete Style Refactoring**: All page-specific styles converted to `local-*` prefix
  - Auth pages (login, signup, logout) - All `jp-auth-*`, `jp-signup-*` styles converted
  - Admin pages - All `jp-users-*`, `jp-edit-btn` styles converted
  - User profile - All `jp-profile-*` styles converted
  - Proper scoping of page-specific overrides within `local-*` containers

- **Comprehensive Documentation**: Added detailed CSS prefix convention guide
  - Clear examples and migration patterns in `developers.md`
  - Benefits and usage documentation
  - Searchability improvements and maintenance guidelines

Technical Details:
- Maintained all common CSS classes with `jp-*` prefixes for framework consistency
- Preserved all existing functionality and styling - zero breaking changes
- All 398 tests continue to pass - no functionality impacted
- Perfect adherence to "don't make me think" design principles

________________________________________________
## v0.4.8, W-043, 2025-09-05

**Commit:** `W-043, v0.4.8: Global rename jPulseCommon to jPulse for improved developer productivity and framework extensibility`

Global rename from jPulseCommon to jPulse for improved developer productivity.

Major Features:
- **Global Object Rename (W-043)**: Renamed `jPulseCommon` to `jPulse` across entire framework
  - 33% reduction in typing (jPulse vs jPulseCommon)
  - Improved developer ergonomics and productivity
  - Cleaner, more concise API calls throughout codebase
  - Enhanced framework extensibility for future jPulseAdmin, jPulseAuth objects

- **Comprehensive Refactoring**: Updated all references across 15+ files
  - All view templates updated with new object name
  - JavaScript utilities and API calls converted
  - Documentation and examples updated
  - Maintained full backward compatibility during transition

- **Enhanced Developer Experience**: Streamlined API with shorter, cleaner syntax
  - `jPulse.form.handleSubmission()` instead of `jPulseCommon.form.handleSubmission()`
  - `jPulse.UI.toast.error()` instead of `jPulseCommon.showSlideDownError()`
  - Consistent naming across all framework utilities

Technical Details:
- All functionality preserved - zero breaking changes
- Comprehensive test coverage validates framework integrity
- Version updated to v0.4.8 across all affected files
- Ready for continued development with improved productivity

________________________________________________
## v0.4.7, W-042, 2025-09-05

**Commit:** `W-042, v0.4.7: Enhanced form submission system with critical bug fixes, improved developer experience, and comprehensive test coverage`

Enhanced form submission system with critical bug fixes and improved developer experience.

Major Features:
- **Critical Bug Fix (W-042)**: Fixed slide-down message accumulation bug
  - Resolved multiple event handler binding issue in signup form causing duplicate API calls
  - Changed `autoBind` default from `true` to `false` for safer API design
  - Eliminated error message stacking with proper event handler management
  - Single form submission now results in single API call and single error message

- **Enhanced Form Submission API**: New dual-function approach for different use cases
  - `jPulse.form.bindSubmission()` for simple forms with automatic event binding
  - `jPulse.form.handleSubmission()` for custom logic with manual event handling
  - Comprehensive configuration options supporting all form submission scenarios
  - "Don't make me think" API design with safe defaults and explicit opt-ins

- **Comprehensive Test Coverage**: Complete test suite for form submission logic
  - 7 comprehensive test cases covering both `bindSubmission` and `handleSubmission` functions
  - Proper mocking of `jPulse.apiCall` instead of direct `fetch` mocking
  - Test isolation improvements with `jest.clearAllMocks()` and proper cleanup
  - Fixed mock state leakage between tests ensuring reliable test execution

Technical Improvements:
- Enhanced API design following "safe by default" principle preventing common developer mistakes
- Improved test infrastructure with proper mocking at correct abstraction level
- Better error handling with automatic message clearing and smart error display logic
- Developer experience improvements with clear function separation and comprehensive documentation

Bug Fixes:
- Fixed slide-down message accumulation causing multiple identical error messages
- Resolved double event binding issue in form submission handlers
- Fixed test mock state leakage causing false test failures
- Corrected form validation logic to work properly in test environments

Development Impact:
- Safer form submission API prevents common bugs like double event binding
- Comprehensive test coverage ensures reliability of form handling logic
- Improved developer experience with clear API design and better documentation
- Enhanced framework stability with proper error message management

________________________________________________
## v0.4.6, W-039, 2025-09-05

**Commit:** `W-039, v0.4.6: Complete user management system with admin users page, user dashboard, enhanced profile page, and production-ready collapsible component with comprehensive test coverage`

Complete user management system implementation with admin users page, user dashboard, enhanced profile page, and production-ready collapsible component.

Major Features:
- **User Management System (W-039)**: Complete administrative user management interface
  - Admin users page moved from `user/index.shtml` to `admin/users.shtml` with proper role-based access
  - Advanced search functionality with name, email, and role filtering
  - User management actions with proper authentication and authorization
  - Clean separation between admin functionality and user-facing features

- **User Dashboard**: New user-centric dashboard with icon-based navigation
  - Activity statistics display with user engagement metrics
  - Icon-based navigation cards for Profile and conditional Site Administration access
  - Minimal, clean design focusing on user needs rather than administrative functions
  - Responsive layout with proper mobile support

- **Enhanced Profile Page**: Unified edit mode with improved UX
  - Single edit mode for all sections (profile, preferences, security)
  - Collapsible security section with password change functionality
  - Unified save operation for profile and password changes in single API call
  - Improved form validation and error handling with internationalized messages

- **Production-Ready Collapsible Component**: Clean, reusable client-side component
  - Handle-based API design: `const handle = jPulse.collapsible.register(id, config)`
  - Clean method calls: `handle.expand()`, `handle.collapse()`, `handle.toggle()`, `handle.isExpanded()`
  - Automatic arrow creation and positioning (▶ collapsed, ▼ expanded)
  - Callback support for `onOpen` and `onClose` events
  - CSS integration with `.jp-collapsible` component classes
  - Multiple independent instances support

- **Comprehensive Test Coverage**: 18 new tests for client-side utilities
  - Full JSDOM testing environment for DOM manipulation testing
  - Complete API coverage for collapsible component functionality
  - Test coverage for DOM utilities, API utilities, and component behavior
  - Fixed function naming conflicts and parameter type mismatches during testing

Technical Improvements:
- Enhanced CSS with `.jp-collapsible`, `.jp-view-mode-only`, `.jp-edit-mode-only` utility classes
- Mobile header improvements with proper user icon aspect ratio and text overflow handling
- Fixed responsive grid issues on admin users page with proper column alignment
- Added `user.svg` icon for single user representation vs `users.svg` for multiple users
- Improved internationalization with additional German and English translations
- Updated dropdown menu structure with proper conditional admin access

Work Items Completed:
- W-039: Complete user management system with admin pages, user dashboard, and enhanced profile UX

________________________________________________
## v0.4.5, W-013, 2025-09-04

**Commit:** `W-013, v0.4.5: Complete admin dashboard implementation with role-based authentication, user language-aware internationalization system, and comprehensive test coverage`

Complete admin dashboard implementation with role-based authentication, user language-aware internationalization system, and comprehensive test coverage.

Major Features:
- **Admin Dashboard (W-013)**: Complete administrative interface with role-based authentication
  - Dashboard grid layout with responsive design (280px minimum card width)
  - SVG icon system with 128x128px icons and dark blue containers (#007acc)
  - Asset organization standard: `webapp/static/assets/<page-name>/`
  - Three main admin sections: View Logs, Site Config, Users (placeholder links)
  - Route protection: All `/admin/*` routes require admin or root roles
  - User language-aware error messages and interface text

- **User-Aware Internationalization**: Enhanced i18n system supporting user session language preferences
  - New translate() method signature: `translate(req, keyPath, context = {}, fallbackLang = this.default)`
  - Automatic user language detection from `req.session.user.preferences.language`
  - Fallback to framework default when no user preference available
  - Fixed authentication error messages to respect user's preferred language
  - German users now see translated error messages instead of English

- **Comprehensive Test Coverage**: Complete test suite for admin dashboard functionality
  - 42 new tests across 3 test files with 100% pass rate
  - User-aware i18n testing patterns and mock implementations
  - Admin route authentication and authorization testing
  - Admin dashboard view rendering and template processing tests
  - Integration and unit test separation with proper mocking

Technical Improvements:
- Added CSS dashboard components: `.jp-dashboard-grid`, `.jp-card-dashboard`, `.jp-icon-btn`
- Enhanced CSS with gradient backgrounds and hover effects for better UX
- Implemented asset organization standard for page-specific resources
- Fixed error page layout (wider container, moved CSS inline for better separation)
- Updated all existing tests to support new i18n translate() method signature
- Added comprehensive admin dashboard translations in English and German

Work Items Completed:
- W-013: Admin dashboard implementation with role-based authentication and user-aware i18n

________________________________________________
## v0.4.4, W-038, 2025-09-04

**Commit:** `W-038, v0.4.4: Complete view consolidation with cleaner separation of common/page-specific code and style`

Complete separation of common and page-specific code/style with massive CSS consolidation and mature component library establishment.

Major Features:
- **View Consolidation (W-038)**: Cleaner separation of common/page-specific code and style
- **CSS Consolidation**: Eliminated 300+ lines of duplicate CSS across all pages
- **Component Library**: Added 15+ reusable components (.jp-user-*, .jp-btn-group, .jp-action-section)
- **User Components**: Complete user display system with avatars, names, and status indicators
- **Enhanced UX**: Fixed profile page layout, user ID consistency, and logout button behavior
- **Mature Foundation**: Established scalable component library for future development

Technical Improvements:
- Consolidated duplicate styles from user/profile.shtml, auth/logout.shtml, error/index.shtml
- Added .jp-user-info, .jp-user-avatar-large, .jp-user-name, .jp-user-login components
- Enhanced .jp-btn-group with responsive behavior and mobile stacking
- Fixed MongoDB _id → user.id mapping consistency across all pages
- Simplified logout UX with single slideDown message and clean redirect
- Eliminated button jitter by removing unnecessary state resets

Work Items Completed:
- W-038: View consolidation with cleaner separation of common/page-specific code/style

________________________________________________
## v0.4.3, W-019, 2025-09-03

**Commit:** `W-019, v0.4.3: Complete slide-down message system implementation with comprehensive API renaming and enhanced UX`

Implemented professional non-blocking slide-down message system with comprehensive API renaming for clarity and enhanced user experience.

Major Features:
- **Slide-Down Message System (W-019)**: Complete implementation of non-blocking user feedback
  - Non-blocking design: Messages overlay content without shifting page layout
  - Smooth 0.6s CSS animations sliding from behind header (z-index 999)
  - Dynamic height-based stacking with 5px gaps between multiple messages
  - Independent message lifecycles using configured durations (info: 3s, success: 3s, warning: 5s, error: 6s)
  - Responsive design using appConfig.view.slideDownMessage settings (minWidth: 200px, maxWidth: 800px, minMarginLeftRight: 20px)
  - Enhanced form integration with proper error clearing and queue management
  - Fixed container parameter issue by removing unused functionality for better UX consistency

Breaking Changes & API Renaming:
- **Comprehensive Function Renaming**: All message functions renamed for clarity and self-documentation
  - `showAlert()` → `showSlideDownMessage()`
  - `showError()` → `showSlideDownError()`
  - `showSuccess()` → `showSlideDownSuccess()`
  - `showInfo()` → `showSlideDownInfo()`
  - `showWarning()` → `showSlideDownWarning()`
  - `clearAlerts()` → `clearSlideDownMessages()`
- **CSS Class Renaming**: Updated all styling classes for consistency
  - `.jp-alert` → `.jp-slide-down` with corresponding state classes
  - `.jp-alert-info/error/success/warning` → `.jp-slide-down-info/error/success/warning`
- **Internal Method Updates**: Renamed private methods for clarity
  - `_processNewAlert` → `_processSlideDownMessage`
  - `_hideAlert` → `_hideSlideDownMessage`
  - `_alertQueue` → `_slideDownQueue`

Technical Improvements:
- **Dynamic Stacking Algorithm**: Calculates actual message heights for perfect spacing
- **Queue Management**: Prevents message interference with proper lifecycle management
- **Animation Performance**: CSS-based transitions for smooth 60fps animations
- **Configuration Integration**: Full integration with appConfig.view.slideDownMessage settings
- **Form Integration**: Enhanced clearErrors() function with proper message clearing

Files Updated:
- `webapp/view/jpulse-common.js`: Core implementation with new naming (615 lines)
- `webapp/view/jpulse-common.css`: Renamed CSS classes and improved animations (895 lines)
- `webapp/view/user/profile.shtml`: 12 function calls updated
- `webapp/view/user/index.shtml`: 6 function calls updated
- `webapp/view/auth/signup.shtml`: 3 function calls updated
- `webapp/view/auth/login.shtml`: 2 function calls updated

Testing & Quality:
- All existing tests pass with new API
- Comprehensive browser testing confirmed across all message types
- Responsive design verified on multiple screen sizes
- Animation performance validated for smooth user experience

UX Improvements:
- Professional slide-down animations provide polished user feedback
- Non-blocking design maintains user workflow without layout disruption
- Intelligent stacking handles multiple messages gracefully
- Consistent positioning creates predictable user experience
- Self-documenting API names improve developer experience

________________________________________________
## v0.4.2, W-036, 2025-09-02

**Commit:** `W-036, v0.4.2: Complete view migration to jpulse-common utilities with API response simplification and dynamic schema-aware frontend`

Completed comprehensive view migration with major architectural improvements and API simplification.

Major Features:
- **View Migration & API Simplification (W-036)**: Complete migration to jpulse-common utilities
  - Migrated all 5 view files to jpulse-common.js and jpulse-common.css
  - Fixed confusing double-wrapped API responses by making apiCall() return controller responses directly
  - Implemented dynamic dropdown population from backend APIs instead of hardcoded options
  - Added comprehensive search functionality across name, email, roles, status with proper pagination
  - Enhanced internationalization with proper i18n for all API messages
  - Added 3 new API endpoints: `/api/1/auth/roles`, `/api/1/auth/languages`, `/api/1/auth/themes`
  - Created schema-aware frontend that uses actual enum values from backend
  - Eliminated confusing `response.data.data` access patterns throughout application
  - Updated test suite to work with new i18n system and fixed all failing tests

Technical Improvements:
- **API Response Architecture**: Simplified response format eliminates frontend confusion
- **Dynamic Schema Synchronization**: Frontend automatically stays synchronized with backend schema
- **Enhanced Search & Pagination**: Comprehensive search with proper context maintenance
- **Internationalization Cleanup**: Removed hardcoded data translations, kept UI text translations
- **Error Handling**: Proper jPulse.showError integration with graceful API failure handling

Files Modified (11 total):
- `webapp/controller/auth.js` (new API endpoints, i18n messages)
- `webapp/model/user.js` (search parameter handling)
- `webapp/routes.js` (new API routes)
- `webapp/utils/common.js` (debug cleanup)
- `webapp/view/jpulse-common.js` (API response unwrapping)
- `webapp/view/auth/login.shtml`, `signup.shtml` (Phase 1 & 3 migration)
- `webapp/view/user/profile.shtml`, `index.shtml` (Phase 2 & 4 migration)
- `webapp/view/home/index.shtml` (i18n cleanup)
- `webapp/translations/en.conf`, `de.conf` (comprehensive i18n additions)

________________________________________________
## v0.4.1, W-025, 2025-09-02

**Commit:** `W-025, v0.4.1: Component-based styling with framework/site separation`

Implemented comprehensive CSS architecture with component library and framework/site separation preparation.

Major Features:
- **Component-Based Styling (W-025)**: Complete CSS architecture overhaul
  - Moved 290+ lines from `jpulse-header.tmpl` to external `jpulse-common.css`
  - Created comprehensive `jp-` component library (799 lines)
  - Standardized on `jp-` prefix for all framework components
  - Organized CSS into Framework Core vs Site Customizable sections

Technical Achievements:
- **Performance Optimization**: External CSS with cache-busting `{{file.timestamp}}`
- **Framework/Site Separation**: Prepared CSS structure for W-014 implementation
- **Theme System Foundation**: `.jp-theme-*-light/dark` classes ready for W-037
- **Responsive Design**: Maintained all breakpoints with `{{appConfig.view.*}}` integration
- **Component Library**: Buttons, cards, forms, alerts, stats, typography, utilities

Development Impact:
- **Clean Architecture**: Clear separation of framework vs customizable styles
- **Reduced Duplication**: Component-based approach eliminates style repetition
- **Maintainable Code**: External CSS with organized component structure
- **Future-Proof**: Ready for theme system and site-specific overrides

Proof-of-Concept Migrations:
- `home/index.shtml` - Removed 45 lines of custom CSS, replaced with `jp-` components
- `error/index.shtml` - Removed 143 lines of custom CSS, enhanced error layout
- Migration guide created for W-036 remaining view updates

Breaking Changes: Clean break from `jpulse-*` to `jp-*` naming convention

________________________________________________
## v0.4.0, W-035, 2025-09-02

**Commit:** `W-035, v0.4.0: Enhanced jpulse-common.js utilities - Complete script separation framework`

Implemented comprehensive client-side utility framework eliminating code duplication across all view files.

Major Features:
- **Enhanced JavaScript Utilities (W-035)**: Complete 5-phase utility system in `jpulse-common.js` (551 lines)
  - Phase 1: Core Alert & Messaging System with animations and auto-hide
  - Phase 2: API Call Standardization with consistent error handling
  - Phase 3: Form Handling & Validation with loading states
  - Phase 4: DOM Utilities & String manipulation helpers
  - Phase 5: Browser & Device Detection with cookie management

Technical Improvements:
- **Dynamic Content-Type Detection**: Enhanced `webapp/controller/view.js` to serve CSS files as `text/css` and JS files as `application/javascript`
- **Cache-Busting**: Implemented `{{file.timestamp}}` handlebars helper for jpulse-* dynamic assets
- **Component Styling**: Added `webapp/view/jpulse-common.css` (113 lines) with jp-prefixed classes
- **Namespace Protection**: jPulse object prevents global variable conflicts
- **Future-Proof Architecture**: Designed for themes and Vue.js integration compatibility

Development Impact:
- **300+ Lines Eliminated**: Removed duplicate code across login.shtml, profile.shtml, user/index.shtml
- **40-50% Faster Development**: Pre-built components accelerate new view creation
- **Consistent UX Patterns**: Standardized alerts, loading states, and error handling
- **Enhanced Maintainability**: Single source of truth for common functionality

Testing Coverage:
- All 5 phases verified across Chrome, Firefox, Safari
- Alert system with proper CSS styling and animations
- API calls with success/error handling integration
- Form utilities with validation and loading animations
- DOM manipulation and string processing functions
- Device detection and secure cookie management

Breaking Changes: None - Additive enhancement maintaining full backward compatibility

________________________________________________
## v0.3.9, W-034, 2025-09-01

**Commit:** `W-034, v0.3.9: Error Reporting Without Redirect for UI Pages`

Implemented direct rendering of 404 error pages via `viewController.load` for UI requests (e.g., `.shtml` files), eliminating the need for HTTP redirects.

Major Features:
- Direct Error Page Rendering (W-034): `viewController.load` now directly renders `webapp/view/error/index.shtml` for 404 errors on UI pages.

Technical Improvements:
- URL Preservation: The original requested URL is preserved when a 404 error occurs on a UI page.
- Contextual Error Messages: Error details (status code and message) are injected into the Handlebars context (e.g., `{{url.param.code}}`, `{{url.param.msg}}`) for direct display in the error template.
- Code Refinement: Changed `const fullPath` to `let fullPath` in `webapp/controller/view.js` to allow reassignment to the error template path.
- `CommonUtils.sendError` Scope: `CommonUtils.sendError` now exclusively handles API-related errors (returning JSON).

Documentation Updates:
- `README.md`: Updated release highlights and template system features.
- `API.md`: Updated API overview and authentication sections.
- `developers.md`: Added a detailed section explaining the architecture and implementation.
- `changes.md`: Added a detailed v0.3.9 release entry.
- `requirements.md`: Updated `W-034` status to `✅ DONE`.

Developer Experience Improvements:
- Enhanced Debugging: Errors for non-existent UI pages are immediately visible on the current URL.
- Consistent UI: Seamless user experience without abrupt redirects.
- Clearer Separation of Concerns: Explicitly defines how API and UI errors are handled.

________________________________________________
## v0.3.8, W-033, 2025-09-01

**Commit:** `W-033, v0.3.8: ESM Testing Infrastructure and Configuration Consolidation`

### Major Features
- **ESM Testing Infrastructure (W-033)**: Resolved ECMAScript Modules loading issues in Jest environment, enabling proper ES module support across the test suite.
- **Runtime Configuration Consolidation**: Implemented automatic .conf to .json conversion with timestamp-based caching for optimal performance.
- **Shared Bootstrap Architecture**: Created centralized dependency initialization system for consistent module loading order.

### Technical Improvements
- **Test Suite Optimization**:
  - Fixed `import.meta.url` compatibility issues in Jest environment
  - Implemented test isolation with `--runInBand` flag to prevent global state pollution
  - Achieved 100% test pass rate (331 passed tests across 18 test suites)
  - Updated test expectations to use pattern matching instead of hardcoded version numbers
- **Configuration Management**:
  - `.jpulse/app.json` generated automatically from `webapp/app.conf` with timestamp comparison
  - `appConfig.app.dirName` properly set during configuration consolidation
  - Configuration sources tracked in `.jpulse/config-sources.json`
- **Bootstrap System (`webapp/utils/bootstrap.js`)**:
  - Centralized initialization of `appConfig`, `LogController`, `i18n`, `Database`, and `CommonUtils`
  - Global dependency injection pattern for consistent module access
  - Proper dependency order management preventing initialization race conditions
- **Logging Architecture**:
  - Standardized log format across all modules with `CommonUtils.formatLogMessage`
  - Consistent timestamp and context formatting (timestamp, level, username, IP, VM, ID)
  - Moved logging utilities to `CommonUtils` for centralized access
- **Database Integration**:
  - Refactored database exports to single default export pattern
  - Explicit `initialize()` method for controlled database connection timing
  - Proper cleanup in test environment with connection management
- **I18n Module Refactoring**:
  - Converted from async to sync initialization removing top-level await issues
  - Explicit `initialize()` and `getInstance()` methods for controlled loading
  - Global dependency pattern for consistent access across controllers

### Developer Experience Improvements
- **Test Reliability**: Eliminated flaky tests caused by module loading order and global state issues
- **Configuration Simplicity**: Automatic config consolidation removes manual build steps
- **Consistent Dependencies**: Global pattern eliminates import/initialization complexity
- **Production Logging**: Enterprise-grade logging format suitable for production monitoring

________________________________________________
## v0.3.7, W-032, 2025-09-01

**Commit:** `W-032, v0.3.7: User: Consolidated user identifiers to 'username' and added 'uuid' field`

### Major Features
- **User ID Consolidation (W-032)**: Standardized user identification across the application to `username`, deprecating previous `loginId` and `userId` inconsistencies.
- **Unique User Identifier (UUID)**: Introduced a new `uuid` field, generated automatically upon user creation, providing an immutable and universally unique identifier for user documents.

### Technical Improvements
- **`UserModel` Refactoring**:
  - `loginId` field in schema renamed to `username`.
  - New `uuid` field added to the `UserModel` schema.
  - `UserModel.validate` method updated to validate `username`.
  - `UserModel.prepareSaveData` updated to generate `uuid` for new users.
  - `UserModel.findByLoginId` renamed to `UserModel.findByUsername`.
  - `UserModel.create` and `UserModel.authenticate` methods updated to use `findByUsername`.
- **`UserController` Updates**:
  - `signup` method updated to use `username` in `userData` object, log messages, and response data.
  - `get`, `update`, and `changePassword` methods updated to use `req.session.user.username` and `updatedBy` fields.
- **`AuthController` Adjustments**:
  - `login` method updated to construct `req.session.user` with `username` and update log messages.
  - `logout` method updated to use `username` in log messages.
  - Error messages in `login` method updated to refer to "username or email".
- **`LogController` Consistency**:
  - `getContext` method updated to extract `username` from session for log entries.

### Documentation Updates
- `README.md`: Updated to v0.3.7 and highlighted the user ID consolidation and UUID feature.
- `developers.md`: Updated to v0.3.7 and included a detailed entry for the user ID and UUID changes.
- `API.md`: Updated API documentation to reflect the change from `loginId` to `username` in relevant sections.
- `changes.md`: Added this detailed v0.3.7 release entry.
- `requirements.md`: Updated `W-032` status to `✅ DONE`.

### Developer Experience Improvements
- **Unified User ID**: A single, consistent identifier (`username`) simplifies user management and reduces potential for confusion.
- **Immutable User Reference**: The `uuid` provides a stable identifier for users, decoupled from potentially changing usernames or other fields.
- **Streamlined Codebase**: Removal of redundant `loginId` and `userId` references cleans up the codebase.

________________________________________________
## v0.3.6, W-031, 2025-08-31

**Commit:** `W-031, v0.3.6: i18n: i18n.js moved to webapp/utils/ and translation files renamed (e.g., lang-en.conf to en.conf)`

### Major Features
- **I18n Module Restructuring**: The `i18n.js` module has been moved from `webapp/translations/` to `webapp/utils/`, aligning it with other shared utility components and improving project organization.
- **Simplified Translation File Naming**: Translation files have been renamed to remove the `lang-` prefix (e.g., `lang-en.conf` is now `en.conf`), resulting in cleaner and more concise filenames.

### Technical Improvements
- **Import Path Updates**: All references to `i18n.js` in `webapp/app.js`, `webapp/controller/auth.js`, `webapp/controller/config.js`, `webapp/controller/user.js`, `webapp/controller/view.js`, and `webapp/tests/helpers/test-utils.js` have been updated to reflect its new location.
- **Dynamic Translation Loading Adaptation**: The `loadTranslations` function within `webapp/utils/i18n.js` has been updated to dynamically discover and load translation files based on the new naming convention (e.g., `*.conf` files).
- **Documentation Header Updates**: The JSDoc headers in `webapp/utils/i18n.js` and `webapp/tests/helpers/test-utils.js` have been updated to reflect the new version and file paths.

### Documentation Updates
- `README.md`: Updated to v0.3.6 and highlighted the i18n restructuring and file renaming.
- `developers.md`: Added a detailed section on "i18n Module Restructuring and File Renaming", outlining the architectural changes and benefits, and updated to v0.3.6.
- `changes.md`: Added this detailed v0.3.6 release entry.
- Project structure diagrams in `README.md` and `developers.md` updated to reflect the new location of `i18n.js` and the simplified translation file names.

### Developer Experience Improvements
- **Clearer Project Structure**: Grouping `i18n.js` with other utilities in `webapp/utils/` makes the `translations/` directory more focused on just the translation data.
- **Simplified File Management**: The shorter, more direct names for translation files reduce verbosity and improve readability.
- **Consistent Naming Conventions**: The updated file naming aligns with a more modern and streamlined approach to asset management.

________________________________________________
## v0.3.5, W-030, 2025-08-31

**Commit:** `W-030, v0.3.5: log: rename LogController log methods for consistency`

- LogController.consoleApi() ==> LogController.logRequest()
- LogController.console()    ==> LogController.logInfo()
- LogController.error()      ==> LogController.logError()

________________________________________________
## v0.3.4, W-029, 2025-08-31
**Commit:** `W-029, v0.3.4: I18n: Internationalized user-facing controller messages and added consistent controller logs`

 #### Major Features
- **Comprehensive I18n for User Messages**: All user-facing messages across `config.js`, `view.js`, `log.js`, `auth.js`, and `user.js` controllers are now internationalized using `i18n.translate()`, ensuring multi-language support.
- **Standardized Controller Logging**: Implemented a consistent logging format (`<controller>.<method>: <type>: <message>`) for all `LogController.console()` and `LogController.error()` calls, enhancing log readability and debuggability.

 #### Technical Improvements
- **Log-Message Pairing**: Every user-facing response (success or error) is now immediately preceded by a corresponding `LogController` entry, providing a clear audit trail.
- **Optimized Error Logging**: `catch` blocks now feature a single initial `LogController.error` entry to prevent redundant logging, with subsequent error responses in conditional blocks being message-only.
- **Refined `throw` Handling**: Eliminated `LogController.error` calls directly before `throw new Error` statements in internal functions to avoid double-logging, relying on outer `try...catch` blocks for single, comprehensive error capture.

 #### Documentation Updates
- `README.md`: Updated to v0.3.4 and highlighted the new i18n and logging consistency features.
- `developers.md`: Added a detailed section on "Consistency in Messaging and Logging", outlining the new architectural principles, benefits, and migration impact, and updated to v0.3.4.
- `changes.md`: Added this detailed v0.3.4 release entry.
- Translation files (`lang-en.conf`, `lang-de.conf`): Extended with new keys following the `controller.<controllerName>.<method>.<key>` or `controller.<controllerName>.<key>` pattern.

 #### Developer Experience Improvements
- Simplified Message Management: Centralized translation keys make it easier to add, modify, and audit user-facing text.
- Accelerated Debugging: Clearer and more consistent logs reduce the time spent understanding application flow and diagnosing issues.
- Enforced Code Quality: Standardized practices for messaging and logging promote uniformity and reduce potential for inconsistencies across the codebase.

________________________________________________
## v0.3.3, W-028, 2025-08-30

**Commit:** `W-028, v0.3.3: View controller enhanced with configurable template and include file caching for performance`

### Major Features
- **Configurable Template Caching (W-028)**: Main `.shtml` template files are now cached based on `appConfig.controller.view.cacheTemplateFiles` for improved rendering speed.
- **Configurable Include File Caching (W-028)**: Common include files and their timestamps are cached based on `appConfig.controller.view.cacheIncludeFiles` to reduce blocking I/O.
- **Synchronous Handlebars Processing**: The `processHandlebars` function and its recursive helpers (e.g., `evaluateHandlebar`, `handleFileInclude`) now operate synchronously for more straightforward control flow.
- **Asynchronous Pre-loading**: Essential include files (`jpulse-header.tmpl`, `jpulse-footer.tmpl`) and their timestamps are pre-loaded asynchronously at module initialization.

### Technical Improvements
- `processHandlebars` and related functions (`evaluateHandlebar`, `evaluateBlockHandlebar`, `handleFileInclude`, `handleFileTimestamp`, `handleBlockIf`) were refactored to remove `async/await` where possible.
- A module-level `cache` object was introduced with `cache.include`, `cache.fileTimestamp`, and `cache.templateFiles` properties to store file contents and timestamps.
- An Immediately Invoked Async Function (IIAF) handles the asynchronous pre-loading of known include files and their timestamps into `cache.include` and `cache.fileTimestamp` respectively.
- The `load` function now checks `cache.templateFiles` before reading a template. If not found and `appConfig.controller.view.cacheTemplateFiles` is true, it reads the file and populates the cache.
- The `handleFileInclude` function now checks `cache.include` before reading an include file. If not found and `appConfig.controller.view.cacheIncludeFiles` is true, it reads the file and populates the cache.
- All template file system reads within `load` were converted from `fs.readFileSync` to `await fsPromises.readFile`.
- File paths consistently use `path.join(global.appConfig.app.dirName, 'view', ...)` for improved consistency.

### Testing Results
- Existing view controller tests will need to be updated to reflect the synchronous nature of `processHandlebars` and the caching mechanisms.
- New unit and integration tests should be added to verify the caching logic and flag-based conditional behavior for both template and include files.

### Architectural Improvements
- Reduced Server Load: Caching frequently accessed templates and includes minimizes redundant file system reads during request processing.
- Improved Responsiveness: Synchronous `processHandlebars` reduces the overhead of `async/await` state management for template expansion, contributing to faster response times.
- Configurable Performance: The introduction of caching flags allows administrators to tailor caching behavior to specific deployment environments (e.g., development vs. production).
- Consistent I/O Pattern: Main template loading now leverages non-blocking `fsPromises` uniformly within the `load` function.

### Documentation Updates
- `README.md`: Updated to v0.3.3 and highlight the new caching features.
- `developers.md`: Added comprehensive details about the caching implementation, including configuration flags and how the `processHandlebars` function now operates.
- `changes.md`: Added a detailed v0.3.3 release entry with technical improvements and architectural benefits.
- `app.conf` and relevant configuration documentation: Updated to include the new `controller.view.cacheTemplateFiles` and `controller.view.cacheIncludeFiles` settings.

### Developer Experience Improvements
- Faster Development Cycle: When caching is enabled, local development with frequently reloaded pages will benefit from cached content, reducing wait times.
- Clearer Code Logic: The conversion of `processHandlebars` to synchronous simplifies the mental model for template expansion, as it no longer involves `await` chaining within its core logic.
- Flexible Configuration: Developers can easily enable or disable caching based on their specific needs and environment without code changes.

### Migration Impact
- Minimal impact on external code. The primary changes are confined to `webapp/controller/view.js`.
- Requires adding `controller.view.cacheTemplateFiles` and `controller.view.cacheIncludeFiles` flags to the application configuration (e.g., `app.conf`). Default values should be set to `true` to enable caching by default.

________________________________________________
## v0.3.2, W-027, 2025-08-30

**Commit:** `W-027, v0.3.2: I18n language files structure aligned with controller and view architecture`

### Major Features
- **I18n Structure Alignment (W-027)**: Language files restructured to match controller and view architecture for better maintainability
- **Improved Translation Organization**: Translation keys now organized hierarchically by controller/view structure
- **Enhanced Template Integration**: Streamlined handlebars variable processing with restructured language files
- **MVC-Consistent Translation Access**: Translation keys follow the same organizational pattern as the application structure

### Technical Improvements
- **Language File Restructuring**: Moved from flat structure to nested controller/view organization
- **Template Variable Updates**: Updated all view templates to use new translation key structure
- **Test Suite Fixes**: Updated i18n tests to match new language file structure and variable content
- **Handlebars Processing**: Enhanced template processing to work with restructured translation keys

### Translation Structure Changes
- **Controller Section**: `controller: {}` - Reserved for controller-specific translations
- **View Section**: `view: { pageDecoration: {}, auth: {}, error: {}, user: {} }` - Organized by view components
- **Hierarchical Keys**: Translation keys now follow dot notation matching view file structure
- **Backward Compatibility**: UNUSED section maintained temporarily for migration support

### Testing Results
- **337 Tests**: All tests passing with comprehensive coverage
- **I18n Integration Testing**: Verified translation key access and variable substitution
- **Template Processing**: Confirmed handlebars processing works with new structure
- **Regression Testing**: No existing functionality broken

________________________________________________
## v0.3.1, W-026, 2025-08-29

**Commit:** `W-026, v0.3.1: MVC-aligned configuration structure with enhanced maintainability and developer experience`

This release restructures the application configuration to match the framework's MVC architecture, improving organization, maintainability, and developer understanding of where settings belong.

### Major Features
- MVC-Aligned Configuration: Restructured webapp/app.conf to match model/controller/view directory structure
- Enhanced Organization: Settings grouped by component type rather than functional areas
- Better Maintainability: Developers can predict where configuration belongs based on MVC structure
- Consistent Mental Model: Configuration structure mirrors file system organization
- Zero Breaking Changes: Internal restructure with no API or user-facing changes

### Technical Implementation
- Configuration Restructure: Moved settings from functional groups to MVC-aligned structure
- Model Settings: User password policies moved to model.user.passwordPolicy
- Controller Settings: Authentication mode in controller.auth.mode, logging in controller.log
- View Settings: Layout configuration in view.maxWidth and view.minMarginLeftRight
- Template Settings: Include depth and defaults in controller.view section

### Architectual Improvements
- MVC Consistency: Configuration structure now matches webapp/ directory organization
- Logical Grouping: Related settings grouped by the component that uses them
- Predictable Location: Developers know where to find settings based on MVC principles
- Enhanced Clarity: Clear separation between model policies, controller behavior, and view presentation
- Future-Proof Design: Structure scales naturally as new components are added

________________________________________________
## v0.3.0, W-021/W-022, 2025-08-27

**Commit:** `W-021, W-022, v0.3.0: API-driven profile management with enhanced user language preferences and data consistency`

### Major Features
- **API-Driven Profile Management**: User profiles now load fresh data from REST API endpoints instead of session data
- **Enhanced Data Consistency**: Profile updates properly increment saveCount for version tracking
- **Centralized Language Preferences**: User language preference handling moved to AuthController for better separation
- **Real-time Profile Updates**: Dynamic form updates without page reloads
- **Comprehensive API Testing**: Full validation of profile API endpoints with automated testing

### Technical Improvements
- **UserModel.updateById() Enhancement**: Fixed saveCount increment logic to match ConfigModel pattern
- **AuthController Helper Functions**: Added getUserLanguage() and updateUserSession() for centralized user data management
- **Profile View Refactoring**: JavaScript loadProfileData() function for dynamic API-based data loading
- **Session Synchronization**: Proper session data updates when user preferences change
- **View Controller Integration**: Updated to use AuthController.getUserLanguage() for better architecture

### API Endpoints Enhanced
- `GET /api/1/user/profile` - Retrieve fresh user profile data from database
- `PUT /api/1/user/profile` - Update user profile with proper saveCount incrementing
- Enhanced error handling and data validation for profile operations

### Testing Results
- **337 Tests**: All tests passing with comprehensive coverage
- **API Integration Testing**: Verified profile load, update, and saveCount increment functionality
- **Regression Testing**: No existing functionality broken
- **Performance**: Test suite execution time optimized to ~3.5 seconds

________________________________________________
## v0.2.8, W-020, 2025-08-27

**Commit:** `W-020, v0.2.8: Enhanced i18n with dynamic discovery, translation auditing, and auto-fixing`

### Major Features
- **Dynamic Language Discovery**: Automatically detects all lang-*.conf files without manual configuration
- **Translation Auditing**: Comprehensive analysis comparing all languages against default language structure
- **Auto-fixing Missing Translations**: Automatically copies missing fields from default language
- **Enhanced i18n API**: New getLang(langCode) with fallback and getList() methods

### Technical Improvements
- **Smart Loading Order**: Default language loads first, followed by alphabetical ordering
- **Intelligent Grouping**: Reports missing/extra objects instead of individual fields
- **Deep Object Analysis**: getObjectPaths() extracts dot-notation paths for comprehensive comparison
- **ES Module Compatibility**: Fixed Node.js built-in module imports with 'node:' prefix

________________________________________________
## v0.2.7, W-018, 2025-08-26

**Commit:** `W-018, v0.2.7: {{#if}} block handlebars with single-pass processing`

### Major Features
- **{{#if}} Block Handlebars**: New block-level conditional syntax replacing old {{if}} helper
- **Single-Pass Processing**: Combined regex for both block and inline handlebars processing
- **Recursive Content Processing**: Handlebars within {{#if}} blocks are processed recursively
- **Legacy {{if}} Removal**: Complete migration from old syntax to new block syntax

### Technical Improvements
- **Enhanced Template System**: More powerful conditional rendering with nested content support
- **Migration Tools**: Regex converter for existing templates with automated conversion
- **Comprehensive Testing**: All tests updated for new {{#if}} syntax with full coverage
- **Performance Optimization**: Single-pass processing improves template rendering speed

________________________________________________
## v0.2.6, W-017, 2025-08-27

**Commit:** `W-017, v0.2.6: i18n variable content system with handlebars-style substitution, two-pass template processing`

This release implements handlebars-style variable substitution in i18n translations, enabling dynamic personalized content like 'Welcome back, {{user.firstName}}!' with seamless integration into the existing template system.

### Major Features
- i18n Variable Content: Handlebars-style {{variable}} substitution in translation strings
- Two-Pass Template Processing: First pass resolves i18n references, second pass resolves variables
- Full Context Access: All template context (user, config, url, app) available in translations
- Simplified Implementation: Clean two-pass processHandlebars() approach without additional functions
- Backward Compatibility: Static translations continue working unchanged

### Technical Implementation
- Enhanced ViewController.load() with dual handlebars processing passes
- Removed unused i18n.t() function and {0},{1} parameter substitution
- Added processI18nHandlebars logic (later simplified to dual processHandlebars calls)
- Updated translation files with variable content examples
- Performance optimized: Second pass only runs if handlebars expressions remain

________________________________________________
## v0.2.5, W-016, 2025-08-26

**Commit:** `W-016, v0.2.5: Centralized Auth Controller with middleware, utilities, comprehensive testing, and updated documentation`

### Centralized Auth Controller System
- Created webapp/controller/auth.js with middleware and utility functions
- Moved login/logout endpoints from UserController to AuthController
- requireAuthentication middleware for basic authentication protection
- requireRole middleware factory for role-based authorization
- isAuthenticated and isAuthorized utility functions for controller logic
- Smart error handling using CommonUtils.sendError for API vs web requests

### Route Protection Implementation:
- Updated webapp/routes.js with new /api/1/auth/* endpoints
- Applied requireAuthentication middleware to protected user endpoints
- Applied requireRole(['admin', 'root']) middleware to admin-only endpoints
- Refactored existing controllers to remove duplicate authentication checks
- Clean separation of concerns between authentication and business logic

### Frontend Integration Fixes
- Fixed broken signin form API endpoint (/api/1/user/login → /api/1/auth/login)
- Fixed broken logout form API endpoint (/api/1/user/logout → /api/1/auth/logout)
- Verified all other API endpoints remain correct and functional
- Authentication flows fully operational across all user interfaces

### Comprehensive Test Coverage
- Added 42 new tests for Auth Controller functionality
- Unit tests (30): middleware, utilities, login/logout endpoints with edge cases
- Integration tests (12): middleware chaining, real-world scenarios, error handling
- All Auth Controller tests passing (42/42)
- No regressions in existing functionality (331/332 tests passing)
- Comprehensive coverage of authentication, authorization, and error scenarios

### Documentation Updates
- README.md: Added Auth Controller to release highlights and features section
- developers.md: Replaced old auth examples with comprehensive Auth Controller patterns
- API.md: Updated login/logout endpoints and added Auth Controller system documentation
- Added middleware usage examples and smart error handling documentation
- Complete integration examples for route protection and utility functions

### Architecture Improvements
- DRY principle: eliminated duplicate authentication checks across controllers
- Centralized security: all authentication logic in single Auth Controller
- Middleware pattern: standard Express.js middleware for cross-cutting concerns
- Flexible authorization: support for single roles, role arrays, and custom logic
- Smart error responses: automatic API vs web request distinction

________________________________________________
## v0.2.4, W-012, 2025-08-26

**Commit:** `W-012, v0.2.4: Complete user views system with registration, authentication interface, and enhanced user experience`

### Complete User Registration System
- Full signup workflow with comprehensive validation (required fields, password confirmation, terms acceptance)
- Duplicate username/email detection with specific error responses and HTTP status codes
- Structured user creation with profile, roles, preferences, and status management
- Success redirect to login page with personalized welcome message
- API endpoint /api/1/user/signup with detailed error handling and logging
- Form validation with client-side and server-side password matching

### Enhanced Authentication Interface
- Complete login view with success message display for new signups
- Logout view with countdown redirect and proper session termination
- Signup view with comprehensive form validation and error display
- User profile and directory views with authentication state management
- Consistent UI patterns across all authentication flows
- Mobile-responsive design with clean, modern interface

### User Avatar & Identity System
- Fixed "meus" logo issue by implementing clean initials system (e.g., "JD" for John Doe)
- Server-side initials calculation with fallback handling for missing names
- Enhanced session user object with firstName, lastName, and initials
- Template context integration making user.initials available in all views
- Consistent avatar display across login, logout, signup, and profile pages

### Comprehensive Internationalization
- Extended i18n translations for all authentication flows (English and German)
- Signup form labels, error messages, and success notifications
- Login success messages with dynamic username replacement
- Logout confirmation and redirect messaging
- Error page translations for consistent user experience
- Support for variable content in i18n strings (e.g., "Your {username} account...")

### Robust Error Handling Strategy
- Centralized error handling distinguishing API vs view requests
- API requests receive JSON error responses with structured error codes
- View requests redirect to formatted error pages with user-friendly messages
- Specific error codes for validation, conflicts, and server errors
- Enhanced 404 handling with proper URL parameter display
- Consistent error logging format across all authentication endpoints

### User Experience Improvements
- Fixed broken navigation links and URL encoding issues
- Proper redirect flows after signup (to login) and logout (with countdown)
- Success message display with smooth user flow transitions
- Widened dropdown menu to prevent text wrapping in user navigation
- Enhanced form validation feedback with clear error messaging
- Conditional template rendering using CSS display properties instead of nested handlebars

### Template System Enhancements
- Refactored conditional rendering from nested handlebars to CSS display blocks
- Improved template maintainability and reduced complexity
- Enhanced template context with user authentication state and initials
- Consistent header/footer integration across all authentication pages
- Better separation of authenticated vs unauthenticated UI states

### Comprehensive Test Coverage
- Added 10 new signup validation tests covering all scenarios
- Request validation logic testing (required fields, password confirmation, terms acceptance)
- User data structure validation and initials generation testing
- Form validation testing for username, email, and password formats
- Session data testing with proper initials handling
- All 290 tests passing with no regressions in existing functionality

### Documentation Updates
- README.md: Updated latest release highlights and User Authentication section
- developers.md: Added comprehensive W-012 implementation section (200+ lines)
- API.md: Added user registration endpoint documentation with examples
- Complete code examples for signup implementation, avatar system, and error handling
- Architecture documentation for user views structure and i18n integration

### Security & Validation Features
- Enhanced form validation with client-side and server-side checks
- Secure password handling with confirmation validation
- Terms acceptance enforcement for legal compliance
- Input sanitization and validation for all user registration fields
- Proper session management with authentication state tracking
- CSRF protection and secure redirect handling

________________________________________________
## v0.2.3, W-011, 2025-08-25

**Commit:** `W-011, v0.2.3: User authentication and management system with MVC refactoring and comprehensive test coverage`

### Complete User Authentication System:
- Secure user authentication with bcrypt password hashing (12 salt rounds)
- Internal authentication supporting loginId or email identification
- Persistent MongoDB session management with connect-mongo and TTL expiration
- Role-based access control with simple role system (guest, user, admin, root)
- Login tracking with automatic lastLogin and loginCount updates
- Password policy enforcement with configurable minimum length requirements

### User Management Features:
- Complete user profile management (get/update profile, change password)
- Admin-only user search API with schema-based queries and pagination
- User search supports wildcards, sorting, filtering by status/roles/dates
- Comprehensive user schema with profile, preferences, roles, and metadata
- Security-first design with password hashes never returned in API responses
- Session user object creation with proper data sanitization

### MVC Architecture Refactoring:
- Clean separation of concerns between models and controllers
- Removed all LogController dependencies from models (UserModel, ConfigModel)
- Models now throw pure errors, controllers handle all logging and HTTP concerns
- Better request context logging with proper user/IP tracking
- Easier unit testing with models as pure functions
- Flexible error handling allowing controllers to transform model errors

### Comprehensive Test Coverage:
- Added 42 new W-011 tests across 3 new test files
- user-authentication.test.js: Password security, authentication logic, RBAC (15 tests)
- user-search.test.js: Search queries, pagination, authorization, wildcards (17 tests)
- user-controller.test.js: HTTP endpoints, error handling, logging (10 tests)
- All 280 tests passing with robust edge case and error scenario coverage
- Security testing with password hash exclusion and role-based access validation

### Performance and Monitoring:
- Elapsed time tracking for all search operations (user.search, log.search)
- Performance metrics included in JSON responses and console logs
- Consistent error logging format: `<type>.<function>` failed: across all controllers
- Enhanced LogController.error() calls for early authentication/authorization failures
- Request timing and completion logging for all API endpoints

### Documentation Updates:
- README.md: Added User Authentication & Management and enhanced Security Features
- developers.md: Complete W-011 implementation section with code examples (150+ lines)
- API.md: Comprehensive User Management API documentation (200+ lines)
- All authentication endpoints, profile management, and user search documented
- Security features, session management, and role-based access control detailed

### Static File Routing Fixes:
- Implemented proper W-008 hybrid content routing strategy
- Fixed static file serving (site.webmanifest, robots.txt) with correct middleware order
- Refined routes.js with specific regex patterns for dynamic vs static content
- Express middleware properly prioritizes API, protected static, dynamic, then static fallback
- All static files now serve correctly while maintaining template processing for dynamic content

________________________________________________
## v0.2.2, W-010, 2025-08-25

**Commit:** `W-010, v0.2.2: Documentation improvements with API externalization, legacy i18n removal, and comprehensive feature documentation`

### API Documentation Externalization:
- Created comprehensive API.md with 574+ lines of complete API reference
- Moved all API endpoints from README.md to dedicated documentation
- Configuration Management, Logging, Template Rendering, and Health Check APIs
- Request/response examples, authentication details, and error handling
- Updated README.md with concise API overview and link to API.md

### Legacy i18n Function Notation Removal:
- Completely removed {{i18n "key"}} legacy function syntax from all files
- Removed handleI18n() function and i18n case from view controller
- Updated all documentation to use only modern {{i18n.app.name}} dot notation
- Fixed test mock context structure for proper nested i18n objects
- Zero legacy notation remains anywhere in codebase

### Comprehensive Documentation Enhancements:
- README.md: Added detailed sections for all completed work items W-001 to W-009
- Enhanced with production-ready Express app, i18n system, testing framework details
- Added configuration management, logging infrastructure, template system sections
- developers.md: Added technical implementation details and architecture examples
- Updated changes.md with complete version history and work item tracking

### Documentation Structure Improvements:
- Professional organization with specialized docs for different audiences
- Cross-referenced documentation with consistent linking
- Enhanced support section with all documentation resources
- Better searchability and GitHub navigation with dedicated API file
- Clean separation of user-facing vs developer-focused content

### Code Quality and Testing:
- Fixed all space-only line violations (20+ lines cleaned)
- 227 tests passing with comprehensive coverage
- Updated view controller tests for dot notation syntax
- Verified no regressions from legacy i18n removal
- All documentation follows strict formatting rules

________________________________________________
## v0.2.1, W-009, 2025-08-25

**Commit:** `W-009, v0.2.1: CommonUtils framework with schema-based queries and automated test cleanup`

### Major Features
- **CommonUtils Framework**: Centralized utility functions with 8 core utilities
- **Schema-Based Query System**: Dynamic MongoDB query generation from URI parameters
- **Automated Test Cleanup**: Jest global setup/teardown system prevents test conflicts
- **Enhanced Testing**: 229+ tests with 100% pass rate and comprehensive coverage

### Technical Improvements
- Data processing, validation, email checking, and string sanitization utilities
- Circular reference protection in object merging
- Real-world integration testing with actual model schemas
- Performance optimizations for test execution

________________________________________________
## v0.2.0, W-008, 2025-08-24

**Commit:** `W-008, v0.2.0: Hybrid content strategy with comprehensive template system`

### Major Features
- **Hybrid Content Strategy**: Sophisticated routing separating static and dynamic content
- **Custom Handlebars System**: Server-side template processing with security features
- **Responsive Design System**: Configuration-driven layout with mobile-first approach
- **Enhanced i18n**: Dot notation syntax for natural translation access

### Technical Improvements
- nginx-friendly routing configuration for production deployment
- Path traversal protection and secure file inclusion
- Sticky header with authentication menu
- Template include caching and depth limiting

________________________________________________
## v0.1.5, W-007, 2025-08-24

**Commit:** `W-007: Rename project from Bubble Framework to jPulse Framework`

### Major Changes
- **Project Rebranding**: Complete rename from "Bubble Framework" to "jPulse Framework"
- **Repository Migration**: Updated GitHub repository to `/peterthoeny/jpulse-framework`
- **Documentation Updates**: All references updated across codebase and documentation

________________________________________________
## v0.1.4, W-006, 2025-08-24

**Commit:** `W-006: Server-side includes implementation`

### Major Features
- **Server-Side Includes**: Template system with handlebars processing
- **Context Integration**: Access to app configuration, user data, and i18n
- **Security Implementation**: Path traversal protection and include depth limits

### Technical Improvements
- Custom handlebars helper functions
- Secure file resolution within view directory
- Template processing optimization

________________________________________________
## v0.1.3, W-005, 2025-08-23

**Commit:** `Implement W-005: Complete log infrastructure with array-based changes and consistent logging`

### Major Features
- **Logging Infrastructure**: Comprehensive log model and controller
- **Unified Log Format**: Consistent logging across all controllers
- **Log Search API**: Schema-based query system for log retrieval
- **Change Tracking**: Array-based change logging for document modifications

### Technical Improvements
- MongoDB log schema with versioning
- Error logging with stack trace capture
- Performance optimizations for log queries

________________________________________________
## v0.1.2, W-004, 2025-08-23

**Commit:** `Implement W-004: Site admin config model & controller`

### Major Features
- **Configuration Management**: Site admin config model and controller
- **MongoDB Integration**: Config storage with schema validation
- **API Endpoints**: RESTful config management under `/api/1/config/`
- **Hierarchical Config**: Preparation for nested configuration documents

### Technical Improvements
- Document versioning and change tracking
- Email configuration schema
- Message broadcasting configuration

________________________________________________
## v0.1.1, W-003, 2025-08-23

**Commit:** `Implement W-003: Comprehensive Test Framework with Jest and Enhanced Build Tools`

### Major Features
- **Jest Testing Framework**: Comprehensive unit and integration testing
- **Test Organization**: Hierarchical test structure with fixtures and helpers
- **Build Tools**: Enhanced npm scripts and build processes
- **CI/CD Preparation**: Foundation for continuous integration

### Technical Improvements
- Test utilities and mock objects
- Configuration file testing
- Integration test patterns

________________________________________________
## v0.1.0, W-001/W-002, 2025-08-23

**Commit:** `Initial commit: Bubble Framework v0.1.0`

### Foundation Features
- **Express.js Application**: Basic web server with routing
- **MongoDB Integration**: Database connection and basic models
- **MVC Architecture**: Model-View-Controller pattern implementation
- **Internationalization**: Basic i18n framework with English and German
- **Configuration System**: App configuration with deployment modes

### Core Infrastructure
- Package management with npm
- Basic routing and middleware
- Static file serving
- Initial project structure

---

**jPulse Framework** - Complete version history and changelog. 🚀
