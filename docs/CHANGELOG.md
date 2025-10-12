# jPulse Framework / Docs / Version History v0.9.7

This document tracks the evolution of the jPulse Framework through its work items (W-nnn) and version releases, providing a comprehensive changelog based on git commit history and requirements documentation.

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
- **Health & Metrics API**: `/api/1/health` for load balancer health checks and `/api/1/metrics` for detailed system monitoring
- **Admin Status Dashboard**: Comprehensive `/admin/system-status.shtml` with auto-refresh and window focus detection
- **Role-Based Access**: Basic metrics for guests/regular users, detailed metrics for admin users
- **PM2 Integration**: Process monitoring with status, memory, CPU, and restart tracking
- **Multi-Instance Design**: API structure prepared for Redis-based metrics aggregation across multiple servers
- **Smart Refresh**: Configurable auto-refresh with background pause when window loses focus

**API Endpoints**:
- **`/api/1/health`**: Basic health status for load balancer health checks with configurable logging
- **`/api/1/metrics`**: Comprehensive system metrics with role-based access control
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
- **Health Logging Control**: `appConfig.controller.health.omitHealthLogs` to reduce log noise
- **Auto-Refresh Settings**: `appConfig.view.admin.systemStatus.refreshInterval` and `refreshInBackground`
- **Consistent Logging**: Always log `/api/1/metrics` requests, configurable for `/api/1/health`

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
- `docs/dev/working/W-040-deliverables-summary.md` - Comprehensive implementation documentation

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
- webapp/view/user/profile.shtml: Added `{{#if user.authenticated}}` wrapper
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
  <title>Page title - {{app.shortName}}</title>
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
  - Site-common.css.tmpl and site-common.js.tmpl template files with site-* CSS prefix convention
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
- Consistent error logging format: <type>.<function> failed: across all controllers
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
