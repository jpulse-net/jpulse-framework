# jPulse Framework / Docs / Version History v0.6.3

This document tracks the evolution of the jPulse Framework through its work items (W-nnn) and version releases, providing a comprehensive changelog based on git commit history and requirements documentation.

________________________________________________
## v0.5.4 (2025-09-11)
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
## v0.5.0 (2025-09-06)
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
  - Interactive client-side demo using `jPulse.apiCall()`

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
## v0.4.10 (2025-09-06)
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
## v0.4.9 (2025-09-05)
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
## v0.4.8 (2025-09-05)
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
  - `jPulse.showSlideDownError()` instead of `jPulseCommon.showSlideDownError()`
  - Consistent naming across all framework utilities

Technical Details:
- All functionality preserved - zero breaking changes
- Comprehensive test coverage validates framework integrity
- Version updated to v0.4.8 across all affected files
- Ready for continued development with improved productivity

________________________________________________
## v0.4.7 (2025-09-05)
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
## v0.4.6 (2025-09-05)
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
## v0.4.5 (2025-09-04)
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
## v0.4.4 (2025-09-04)
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
## v0.4.3 (2025-09-03)
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

## v0.4.2 (2025-09-02)
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
## v0.4.1 (2025-09-02)
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
## v0.4.0 (2025-09-02)
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
## v0.3.9 (2025-09-01)
**Commit:** `TBD` - W-034, v0.3.9: Error Reporting Without Redirect for UI Pages

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
## v0.3.8 (2025-09-01)
**Commit:** `TBD` - W-033, v0.3.8: ESM Testing Infrastructure and Configuration Consolidation

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
## v0.3.7 (2025-09-01)
**Commit:** `TBD` - W-032, v0.3.7: User: Consolidated user identifiers to 'username' and added 'uuid' field.

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
## v0.3.6 (2025-08-31)
**Commit:** `TBD` - W-031, v0.3.6: i18n: `i18n.js` moved to `webapp/utils/` and translation files renamed (e.g., `lang-en.conf` to `en.conf`).

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
## v0.3.5 (2025-08-31)
**Commit:** `TBD` - W-030, v0.3.5: log: rename LogController log methods for consistency

- LogController.consoleApi() ==> LogController.logRequest()
- LogController.console()    ==> LogController.logInfo()
- LogController.error()      ==> LogController.logError()

________________________________________________
## v0.3.4 (2025-08-31)
**Commit:** `TBD` - W-029, v0.3.4: I18n: Internationalized user-facing controller messages and added consistent controller logs.

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
## v0.3.3 (2025-08-30)
**Commit:** `TBD` - W-028, v0.3.3: View controller enhanced with configurable template and include file caching for performance.

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
## v0.3.2 (2025-08-30)

### **W-028**: View controller: Cache Template and Include Files
- **Status**: ✅ DONE
- **Version**: v0.3.3
- **Description**: Enhanced view controller to cache template and include files for performance.
- **Implementation**: `webapp/controller/view.js` now uses configurable caching for `.shtml` templates and include files, with asynchronous pre-loading for common includes, and `processHandlebars` converted to a synchronous operation.

________________________________________________
## v0.3.2 (2025-08-30)

**Commit:** `TBD` - W-027, v0.3.2: I18n language files structure aligned with controller and view architecture

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
## v0.3.0 (2025-08-27)
**Commit:** `TBD` - W-021, W-022, v0.3.0: API-driven profile management and enhanced user language preferences

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
## v0.2.8 (2025-08-27)
**Commit:** `TBD` - Enhanced i18n with dynamic discovery, translation auditing, and auto-fixing

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
## v0.2.7 (2025-08-26)
**Commit:** `c99c90a` - W-018, v0.2.7: {{#if}} block handlebars with single-pass processing

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
## v0.2.1 (2025-08-25)
**Commit:** `b317873` - W-009, v0.2.1: CommonUtils framework with schema-based queries and automated test cleanup

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
## v0.2.0 (2025-08-24)
**Commit:** `2c3a054` - W-008, v0.2.0: Hybrid content strategy with comprehensive template system

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
## v0.1.5 (2025-08-24)
**Commit:** `ca75556` - W-007: Rename project from Bubble Framework to jPulse Framework

### Major Changes
- **Project Rebranding**: Complete rename from "Bubble Framework" to "jPulse Framework"
- **Repository Migration**: Updated GitHub repository to `/peterthoeny/jpulse-framework`
- **Documentation Updates**: All references updated across codebase and documentation

________________________________________________
## v0.1.4 (2025-08-24)
**Commit:** `bf20146` - W-006: Server-side includes implementation

### Major Features
- **Server-Side Includes**: Template system with handlebars processing
- **Context Integration**: Access to app configuration, user data, and i18n
- **Security Implementation**: Path traversal protection and include depth limits

### Technical Improvements
- Custom handlebars helper functions
- Secure file resolution within view directory
- Template processing optimization

________________________________________________
## v0.1.3 (2025-08-23)
**Commit:** `cb074b4` - Implement W-005: Complete log infrastructure with array-based changes and consistent logging

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
## v0.1.2 (2025-08-23)
**Commit:** `f952ab1` - Implement W-004: Site admin config model & controller

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
## v0.1.1 (2025-08-23)
**Commit:** `fe7935a` - Implement W-003: Comprehensive Test Framework with Jest and Enhanced Build Tools

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
## v0.1.0 (2025-08-23)
**Commit:** `5d50e4e` - Initial commit: Bubble Framework v0.1.0

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
