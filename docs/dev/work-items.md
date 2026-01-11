# jPulse Docs / Dev / Work Items v1.4.12

This is the doc to track jPulse Framework work items, arranged in three sections:

- ✅ DONE & ❌ CANCELED
- 🚧 IN_PROGRESS
- 🕑 PENDING


-------------------------------------------------------------------------
## ✅ DONE & ❌ CANCELED Work Items

### W-001, v0.1.0: create hello world app
- status: ✅ DONE
- type: Feature
- create logic in webapp/app.js
- use appConfig.deployment[mode].port in webapp/app.conf
- create package.json, package-lock.json

### W-002, v0.1.0: create internationalization framework
- status: ✅ DONE
- type: Feature
- all user facing text can be translated
- translations: one file per language

### W-003, v0.1.1: create test framework
- status: ✅ DONE
- type: Feature
- create webapp/tests/
- create test hierarchy using subdirectories
- implement first tests for translations/i18n.js

### W-004, v0.1.2: create site admin config model & controller
- status: ✅ DONE
- type: Feature
- create webapp/model/config.js -- model
- create webapp/controller/config.js -- controller
  - read & save functions for routes: /api/1/config/*
- prepare for hierarchy of config docs, for now just one doc with _id == 'global'
- schema: at this time just two data groups
  ```
  {
      _id:            String, // 'global'
      data: {
          email: {                // default:
              adminEmail: String, // ''
              adminName:  String, // ''
              smtpServer: String, // 'localhost'
              smtpUser:   String, // ''
              smtpPass:   String, // ''
              useTls:     Boolean // false
              // anything else?
          },
          messages: {
              broadcast:  String  // ''
          }
      },
      createdAt:      Date,   // default: new Date()
      updatedAt:      Date,   // auto-updated
      updatedBy:      String, // login user ID
      docVersion:     Number  // default: 1
  }
  ```
- create tests, and test

### W-005, v0.1.3: create log infrastructure
- status: ✅ DONE
- type: Feature
- create webapp/model/log.js -- model
  - called by other controllers (config, user, ...) on doc create, update, delete
- create webapp/controller/log.js -- controller
  - log.search function for route: /api/1/log/search
  - log.console function used by all other controllers to log in unified format:
    - regular log message:
      '- YYYY-MM-DD HH:MM:SS, msg, loginId, ip:1.2.3.4, vm:123, id:8, actual message text'
    - initial API or .shtml page log message:
      '==YYYY-MM-DD HH:MM:SS, ===, loginId, ip:1.2.3.4, vm:123, id:8, === log.search( createdAt: 2025-08 )'
  - log.error function used by all other controllers to log errors in unified format:
      '- YYYY-MM-DD HH:MM:SS, ERR, loginId, ip:1.2.3.4, vm:123, id:8, actual error message'
  - loginId is the user's login ID (such as "jsmith"), or "(guest)" if not logged in
  - vm:123 is the numerical part of the server, such as 123 for app-server-123.ca.example.com, or vm:0 if no number exists
  - id:8 is the pm2 instance ID, or id:0 when not using pm2
- schema:
  ```
  {
      data: {
          docId:      Object, // _id (ObjectId or String)
          docType:    String, // 'config', 'user', ...
          action:     String, // 'create', 'update', 'delete'
          changes:    String, // diff-type changes of doc
      },
      createdAt:      Date,   // default: new Date()
      createdBy:      String, // login user ID
      docVersion:     Number  // default: 1
  }
  ```
- create tests, and test

### W-006, v0.1.4: create server sice include function
- status: ✅ DONE
- type: Feature
- create webapp/controller/view.js
  - function load(req, res) loads a view file and expands {{handlebars}}:
    - {{app.version}}
    - {{app.release}}
    - {{file.include "jpulse-header.tmpl"}}
      - object: { file: { include: function("jpulse-header.tmpl") {} } }
    - {{file.timestamp "jpulse-header.tmpl"}}
    - {{user.id}}
    - {{user.firstName}}
    - {{user.nickName}}
    - {{user.lastName}}
    - {{user.email}}
    - {{config.email.adminEmail}}
    - {{#if user.isAuthenticated}} show {{else}} hide {{/if}}
    - {{url.domain}}      // 'https://www.example.com:8080'
    - {{url.protocol}}    // 'https'
    - {{url.hostname}}    // 'www.example.com'
    - {{url.port}}        // '8080'
    - {{url.pathname}}    // '/home/index.shtml'
    - {{url.search}}      // '?foo=bar'
    - {{url.param.foo}} // 'bar'
    - {{i18n.login.notAuthenticated}}

### W-007, v0.1.5: rename project from Bubble Framework to jPulse Framework
- status: ✅ DONE
- type: Feature
- rename git repo to /peterthoeny/jpulse-framework
- rename any text references to project name

### W-008, v0.2.0: strategy for view content and static content; HTML header & footer strategy
- status: ✅ DONE
- type: Feature
- objective: clean separation using routing precedence
- File Mapping:
  - `webapp/static/*` → URI `/` (e.g., `webapp/static/robots.txt` → `/robots.txt`)
  - `webapp/view/*` → URI `/` (e.g., `webapp/view/home/index.shtml` → `/home/index.shtml`)
- Express Routing Order (priority sequence):
  1. API routes: `/api/1/*`
  2. Static `/common` directory (protects 3rd party packages from dynamic processing)
  3. Dynamic content: `*.shtml`, `*.tmpl`, `/jpulse-*.js`, `/jpulse-*.css`
  4. Root static fallback: `/` (serves remaining static files including `/images`)
- nginx Configuration (production):
  - API routes → proxy to app
  - Static `/common/` directory → direct serve
  - Dynamic templates (`*.shtml`, `*.tmpl`, `/jpulse-*`) → proxy to app
  - Root fallback → static serve (includes `/images`, `/robots.txt`, etc.)
- Benefits: Protects 3rd party packages in `/common` that might contain `.shtml`/`.tmpl` files
- main app windows:
  - responsive design with maxWith defined in appConfig, and min margin on left and right
- add sticky header:
  - 30 pixels high
  - logo and app name on left
  - user icon on right with pulldown:
    - if not logged in:
      - sign in
      - sign up
    - if logged in:
      - profile
      - sign out
  - responsive design matching main app window
- add footer:
  - responsive design matching main app window

### W-009, v0.2.1: common utilities infrastructure; flexible shema-based query
- status: ✅ DONE
- type: Feature
- create a common utilities infrastructure
- add schemaBasedQuery() from logs so that it can be used by all controllers (see log.schemaBasedQuery)

### W-010, v0.2.2: doc improvements
- status: ✅ DONE
- type: Feature
- update README.md, developers.md based on requirements.md doc
- focus on COMPLETED to-do items W-001 to W-009
- in README.md, remove mention of W-nnn, just state the features
- create changes.md that lists W-nnn and version numbers based on git commit history and requirements.md
- create a API.md doc
- remove legacy {{i18n "app.name"}} notation, replaced by {{i18n.app.name}} dot notation

### W-011, v0.2.3: create user model & controller
- status: ✅ DONE
- type: Feature
- create webapp/model/user.js
- create webapp/controller/user.js
- plan for authentication based on appConfig.login.mode:
  - internal
  - ldap (implement later)
  - oath2 (implement later)
  - user choice, such as internal/oauth2 (implement later)
- implement internal auth with user ID and password
- persistent session handling in database
- create tests
- document in README, API, changes, developers

### W-012, v0.2.4: create user views
- status: ✅ DONE
- type: Feature
- create webapp/view/user/profile.shtml
  - two modes: view and edit
  - edit by owner and admin
- create webapp/view/user/index.shtml
  - show stats on users
  - search users, result depends on logged in user role (admin, ...)
- create login, logout, signup views under webapp/view/auth/
  - implement for internal user management
  - plan for ldap and oauth2
- proper 404 error handling:
  - for /api/... return a JSON with "success": false
  - else show formatted error page as in view/error/index.shtml

### W-016, v0.2.5: create auth controller
- status: ✅ DONE
- type: Feature
- handles login, logout
- handles auth.isAuthenticated and auth.isAuthorized for middleware
- use as needed in routing

### W-017, v0.2.6: i18n with variable content
- status: ✅ DONE
- type: Feature
- handlebar based, example:
  - signOut: 'Sign out {{user.id}}' // ==> 'Sign out jsmith'

### W-018, v0.2.7: create {{#if}} handlebar for simple nesting
- status: ✅ DONE
- type: Feature
- syntax: {{#if some.condition}} show this with {{other.handlebars}} {{/if}}
- syntax: {{#if some.condition}} show if true {{else}} show if false {{/if}}
- no nesting of #if, e.g. no support for {{#if 1}} {{#if 2}} blah {{/if}} {{/if}}
- remove existing {{if some.condition "text for true" "text for false"}} syntax
- replace all existing {{if}} with the new {{#if}} syntax

### W-020, v0.2.8: i18n with fallback
- status: ✅ DONE
- type: Feature
- audit language:
  - compare to default ('en')
  - report missing and extra fields
  - patch other language with missing fields from default language

### W-021, v0.3.0: fix user profile view to read from API
- status: ✅ DONE
- type: Bug Fix
- user profile view now loads fresh data from /api/1/user/profile API endpoint
- profile updates work correctly and increment saveCount properly
- UserModel.updateById() now increments saveCount like ConfigModel

### W-022, v0.3.0: user preferred language
- status: ✅ DONE
- type: Feature
- centralized language preference handling in AuthController
- AuthController.getUserLanguage() helper function with fallback support
- better separation of concerns between authentication and view logic

### W-023: view: migrate views to vue.js while preserving the MVC model
- status: ❌ CANCELED
- type: Feature
- objective: convert from .shtml/Handlebars to complete Vue.js solution while preserving MVC mental model, and upcoming framework/site separation
- reason to cancel SPA with vue.js, and go mack to MPS with .shtml with handlebars:
  - SPA is not a good fit for large deployments were multiple teams work on their own model/controller/view
  - SPA is fragile: if one "page" has a runtime error the whole site is down
  - SPA is heavy: if you have 100 "pages", all content is in browser memory

### W-026, v0.3.1: config: appConfig structure should match model, controller, and view structure
- status: ✅ DONE
- type: Feature
- restructure webapp/app.conf to match the file structure with controllers, views, etc.
- example: appConfig.controller.view.maxIncludeDepth

### W-027, v0.3.2: i18n: language files structure should match controller and view structure
- status: ✅ DONE
- type: Feature
- restructure the language files to match the file structure with controllers and views
  - example: i18n.view.auth.login.loginFailed
- prepare for controllers with i18n
  - example: i18n.controller.auth.unauthorizedByRole

### W-028, v0.3.3: view controller: cache template and include files
- status: ✅ DONE
- type: Feature
- remove async in view.processHandlebars()
- cache template files based on appConfig.controller.view.cacheTemplateFiles flag
- cache include files and file timestamps based on appConfig.controller.view.cacheIncludeFiles flag

### W-029, v0.3.4: i18n: internationalize user facing controller messages; add consistent controller logs
- status: ✅ DONE
- type: Feature
- rename i18n.translate() to i18n._translate()
- rename i18n.t() to i18n.translate()
- add optional context to i18n._translate(langCode, keyPath, context = {})
- add optional context to i18n.translate(keyPath, context = {}, langCode = this.default, fallbackLang = this.default)
- use consistent function names, such as ConfigController.get() instead of ConfigController.getConfig()
- internationalize user facing controller messages, e.g. no hard-coded messages
- add consitent log entries in controller APIs

### W-030, v0.3.5: rename LogController log methods for consistency
- status: ✅ DONE
- type: Feature
- LogController.consoleApi() ==> LogController.logRequest()
- LogController.console()    ==> LogController.logInfo()
- LogController.error()      ==> LogController.logError()

### W-031, v0.3.6: i18n: move i18n.js script to webapp/utils/ & rename translation files
- status: ✅ DONE
- type: Feature
- objective: clean dir structure where all MVC utilities reside in webapp/utils/
- move webapp/translations/i18n.js script to webapp/utils
- rename webapp/translations/lang-en.conf to just webapp/translations/en.conf
- rename webapp/translations/lang-de.conf to just webapp/translations/de.conf
- fix all references to i18n.js and language files

### W-032, v0.3.7: user: fix username vs userId vs loginId inconsistencies; add uuid field
- status: ✅ DONE
- type: Feature
- some code refers to username, some to userId, some to loginId:
  - username: user views, translations, sessions
  - userId: user view
  - loginId: user view, user controller, user model, MongoDB users collection
- fix all user ID reference, consolidate on username
- add uuid field, generated on intial doc creation, never changes
- add a CommonUtils.generateUuid() method - DONE
- add tests for CommonUtils.generateUuid()
- remove the unused CommonUtils.generateId() method, remove its tests
- fix user tests
- no need to patch existing docs in users collection

### W-033, v0.3.8: tests: fix ECMAScript Modules infrastructure; consolidate configuration
- status: ✅ DONE
- type: Feature
- issue with tests clean, it does not work
- issue with ECMAScript Modules loading
- issue with app config
- add jpulse/app.json with app.conf in JSON format
- add jpulse/config-sources.json with timestamp of app.conf for auto-update of app.json
- add webapp/utils/bootstrap.js - architecture to created centralized dependency initialization system for consistent module loading order

### W-034, v0.3.9: error reporting without redirect
- status: ✅ DONE
- type: Feature
- view controller: for 404 and other errors do not redirect to /error/index.shtml, but show error message with same style and content like webapp/view/error/index.shtml
- keep webapp/view/error/index.shtml for client side redirects that need a 404 page

### W-035, v0.4.0: view: script separation with enhanced jpulse-common.js utilities
- status: ✅ DONE
- type: Feature
- objective: avoid duplicate code in browser; spend less time to create a new view and to maintain existing views
- create a webapp/view/jpulse-common.js:
  - common data and functions available to all pages
  - it defines a jPulseCommon object, with properties like:
    - alert() -- dialog
    - confirm() -- dialog
    - getCookie()
    - setCookie()
    - showMessage() -- show non-blocking slide down/up info/error message (later: W-019)
    - entityEncode()
    - entityDecode()
    - detectOs()
    - detectBrowser()
    - isMobile()
    - isTouchDevice()
    - windowHasFocus()
- use library like bootstrap, or continue native?
  - at a later point offer vue.js as an option for more dynamic content per page (e.g. not SPA) (via plugin once plugin infrastructure is available?)

### W-025, v0.4.1: view: component-based styling with framework/site separation
- status: ✅ DONE
- type: Feature
- objective:
  - clean styles, clean hierarchy, less duplication, less style in pages (only custom ones)
  - spend less time to create a new view & maintain existing views
- move all shareable style to webapp/view/jpulse-common.css (or directly into webapp/view/jpulse-header.tmpl ?)
  - if only the former: include /view/jpulse-common.css in webapp/view/jpulse-header.tmpl
- phase 1: extract framework styles & create component Library
  - move 290+ lines from jpulse-header.tmpl to jpulse-common.css
  - create complete component library (buttons, cards, forms, stats, layout)
  - implement .jp-theme-* classes for future theme support
  - convert existing jpulse-* classes to jp-* prefix
- phase 2: proof-of-concept migration (2 pages)
   - migrate home/index.shtml (simple patterns)
   - migrate error/index.shtml (complex styling)
   - validate component system works in practice
   - document migration patterns
- phase 3: framework/site separation preparation
  - Organize CSS: Framework Core vs Site Customizable sections
  - Prepare override-friendly structure for W-014
  - Performance testing and cross-browser validation

### W-036, v0.4.2: view: migrate existing views to use jpulse-common.js and jpulse-common.css
- status: ✅ DONE
- type: Feature
- objective:
  - clean separation of common JavaScript utilities, and page specific functionality
  - clean separation of common styles, and page specific styles
  - easy onboarding of front-end developers
  - less time to create a new page
- dependency on completed work items:
  - W-035: view: script separation with enhanced jpulse-common.js utilities
  - W-025: view: component-based styling with framework/site separation
- consider future work items:
  - W-037: view: create themes
  - W-014: app: strategy for seamless update of site-specific jPulse deployments
- phase 1: auth/login.shtml
  - Replace showError/showSuccess (~25 lines saved)
- phase 2: user/profile.shtml
  - Replace showAlert/API calls (~35 lines saved)
- phase 3: auth/signup.shtml
  - Replace form handling (~40 lines saved)
- phase 4: user/index.shtml
  - Replace showError/API calls (~20 lines saved)
- phase 5: auth/logout.shtml
  - Minimal changes needed
- make sure to not use hard-coded user facing messages that could be translated
- make sure to update the two existing language files webapp/translations/en.conf and webapp/translations/de.conf

### W-037: view: create themes
- status: ❌ CANCELED
- type: Feature
- note: this work item is replaced by: W-129: view: create themes infrastructure
- jPulse framwork ships with two themes: light (default), dark
- user can set preferred theme

### W-019, v0.4.3: view: create non-blocking slide-down info/alert/warning/success message
- status: ✅ DONE
- type: Feature
- pupose: non-blocking error or info message, such after signin
- current behavior:
  - new div is temporarily inserted before the .jp-main div by default
    - or a target div e.g. element of choice (currently unused?)
  - the whole content shifts down, which is odd from a UX perspective
- change to a slide-down div:
  - slide down / show for duration / hide the slide-down div
  - appears from below page banner (or an element of choice)
  - coveres other content temporarily (existing content does not slide down)
  - center slide-down div horizontally on target div (or document)
  - show text left justified in the slide-down div
  - min width defined in appConfig.view.slideDownMessage.minWidth
  - max width defined in appConfig.view.slideDownMessage.minWidth
  - duration defined by type in appConfig.view.slideDownMessage.duration.*
  - keep current background colors based on type (defined in css)

### W-038, v0.4.4: view: cleaner separation of common code/style and page specific code/style

- status: ✅ DONE
- type: Feature
- objective: make current pages more maintainable, make code and style as short as possible
- my overall assessment of current state:
  - style: too much duplication across pages
  - html: looks solid
  - script: a bit too verbose, not using iPulseCommon.* functions enough, and not consistently
- action items for all pages:
  - replace URLSearchParams() with handlebar
    - from: const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
    - to:   const redirect = '{{url.param.redirect}}' || '';
  - use jPulseCommon functions instead of JS functions, such as:
    - from: document.addEventListener('DOMContentLoaded', function() {});
    - to:   jPulseCommon.dom.ready(() => {});
  - convert handleSubmission to this in webapp/view/auth/login.shtml? maybe I misunderstand?
    - from:
      loginForm.addEventListener('submit', async function(event) {
          event.preventDefault();
          const result = await jPulseCommon.form.handleSubmission(loginForm, '/api/1/auth/login', {
            //...
          });
      });
    - to:
      jPulseCommon.form.handleSubmission(loginForm, '/api/1/auth/login', {
        //...
      });
  - itendtify styles that are common, & move many styles to jpulse-common.css, such as:
    - page .jp-login-container ==> common .jp-container-400
    - page .jp-login-card ==> common .jp-card
      - if jp-login-card is needed:
        `<div class="jp-login-card"> ==> <div class="jp-card jp-login-card">`
      - else:
        `<div class="jp-login-card"> ==> <div class="jp-card">`
    - page .jp-login-header ==> common .jp-card-dialog-heading
    - page .jp-divider ==> common .jp-divider
  - webapp/view/auth/login.shtml and webapp/view/auth/signup.shtml:
    - they have different form validation and submit handling,
    - better to consolidate using one approach?

### W-013, v0.4.5: view: define standard for page assets, create site admin index page
- status: ✅ DONE
- type: Feature
- define standard for page assets:
  - `webapp/static/assets/<page-name>/*`
- define common dashboard grid and icon buttons
- create webapp/view/admin/index.shtml -- admin home
  - with square icon buttons linking to config.shtml, logs.shtml, users.shtml
- require root or admin role for /admin/ pages

### W-039, v0.4.6: view: create manage users page and user home page; create iPulseCommon.collapsible function
- status: ✅ DONE
- type: Feature
- move webapp/view/user/index.shtml to webapp/view/admin/users.shtml -- manage users
- replace webapp/view/user/index.shtml with a dashboard
  - square icon buttons
- add new iPulseCommon.collapsible function to toggle a section open and close

### W-042, v0.4.7: view: fix slide down message is not cleared bug
- status: ✅ DONE
- type: Bug Fix
- in the signup page, error messages in the slide down are never cleared
- this happens when you hit [submit] after a few seconds, rinds and repeat
- e.g. this is not stacking of multiple messages in rapid succession, which is spec
- split out jPulsCommon.handleSubmission() into jPulsCommon.bindSubmission()
  - use jPulsCommon.bindSubmission() for simple forms like login
  - use jPulsCommon.handleSubmission() for complex forms like signup

### W-043, v0.4.8: view: rename jPulseCommon object to jPulse
- status: ✅ DONE
- type: Feature
- objective: don't make me think, maintain brand, extensible

### W-044, v0.4.9: view: use jp-* prefix for common styles, local-* prefix for local styles
- status: ✅ DONE
- type: Feature
- objective: don't make me think
- `jp-*` prefix for common framework styles (always in `jpulse-common.css`)
- `local-*` prefix for page-specific styles (always in current page's `<style>` section)

### W-041, v0.4.10: view: create edit site config page for admins
- status: ✅ DONE
- type: Feature
- create webapp/view/admin/config.shtml -- edit site config
- DELIVERED: Complete site configuration management system with intuitive admin interface, email settings (SMTP server, port, credentials, TLS), site messages, password visibility toggle, smart default creation, comprehensive validation, full i18n support, and extensive test coverage

### W-014, v0.5.0: architecture: strategy for seamless update of site-specific jPulse deployments
- status: ✅ DONE
- type: Feature
- objective: clean separation of jpulse code/data, and site/deployment specific code/data
- author: site administrator/developer
- audience: site users
- working doc: docs/dev/W-014-W-045-mvc-site-plugins-architecture.md
- jPulse will be the base framework for multiple web apps
- define a clean structure of two sets:
  - jPulse framework directories and files
  - site specific directories and files
- automatic way to override/extend jPulse config, models, controllers, views with site-specific settings
- create a demo model/view/controller (possibly as plugin), ship with jpulse-framework
- IMPLEMENTATION COMPLETED:
  - ✅ Site override directory structure (`site/webapp/`)
  - ✅ File resolution priority system (PathResolver)
  - ✅ Auto-discovery of site controllers (SiteRegistry)
  - ✅ Configuration merging (framework + site configs)
  - ✅ Context extension system (ContextExtensions)
  - ✅ Demo implementation (`/hello/` endpoint with interactive API demo)
  - ✅ Comprehensive test coverage (28 new tests, 416 existing tests passing)
  - ✅ "Don't make me think" principle - zero manual configuration required

### W-047, v0.5.1: site: define gudelines for site specific coding and styles; document it
- status: ✅ DONE
- type: Feature
- objective: document how to get started with side specific coding, with guidelines; follow the don't nake me think principle
- common JavaScript code in site/webapp/view/site-common.js extends window.jPulse object (renamed to jpulse-common.js in W-098)
- common styles in site/webapp/view/site-common.css with site-* prefix for clear source identification (renamed to jpulse-common.css in W-098)
- documented in enhanced site/README.md with comprehensive development guidelines
- IMPLEMENTATION COMPLETED:
  - Created site-common.css.tmpl and site-common.js.tmpl template files (renamed to jpulse-common.css.tmpl and jpulse-common.js.tmpl in W-098)
  - Implemented site-* CSS prefix convention for clear source identification
  - JavaScript extension pattern extending jPulse.site namespace
  - Updated jpulse-header.tmpl to automatically load site-common files
  - Enhanced demo view with comprehensive site functionality showcase
  - Comprehensive site/README.md with development guidelines, best practices, and examples
  - "Don't make me think" principle - automatic file detection and loading
  - Complete CSS and JavaScript component systems with dialogs, tooltips, analytics
  - Responsive design patterns and framework integration guidelines

### W-048, v0.5.2: create jPulse.UI dialog widgets
- status: ✅ DONE
- type: Feature
- objective: offer common UI widgets used by front-end developers
- implementation: native JavaScript (dependency-free)
- widgets implemented:
  - jPulse.UI.alertDialog(message, options) - red header, always on top
  - jPulse.UI.infoDialog(message, options) - blue header, always on top
  - jPulse.UI.confirmDialog(options) - enterprise-grade with custom callbacks
  - jPulse.UI.accordion.register(elementId, options) - flexible decoration detection
  - jPulse.UI.collapsible (moved from root namespace)
- enterprise features:
  - Draggable dialogs by header with viewport bounds
  - Complex confirm dialogs with nested workflows and dontClose flag
  - Raw HTML support (no sanitization for site owner controlled content)
  - Dialog stacking with automatic z-index management
  - Conditional file includes with file.exists helper
  - Promise-based APIs with comprehensive callback support
- technical implementation:
  - 22 UI widget tests + 18 collapsible tests (100% passing)
  - Mobile-responsive design with touch support
  - i18n integration for default titles and buttons
  - Comprehensive demos on home page with complex examples

### W-046, v0.5.3: docs: restructure user facing and developer facing documentation
- status: ✅ DONE
- type: Feature
- working doc: docs/dev/W-046-dev-doc-structure.md
- changes:
  - implemented comprehensive documentation split separating user-facing (docs/) and developer-facing (docs/dev/) documentation
  - created focused API reference (794 lines) exclusively for /api/1/* REST endpoints with routing and middleware information for API consumers
  - built complete front-end development guide (741 lines) covering jPulse JavaScript framework, utilities, and client-side best practices
  - delivered comprehensive style reference (1,290 lines) documenting complete jp-* CSS framework with components, layouts, and responsive design
  - established template reference (776 lines) covering server-side Handlebars system with security features and integration patterns
- docs:
  - docs/README.md
  - docs/CHANGELOG.md
  - docs/api-reference.md
  - docs/deployment.md
  - docs/app-examples.md
  - docs/front-end-development.md
  - docs/getting-started.md
  - docs/installation.md
  - docs/site-customization.md
  - docs/style-reference.md
  - docs/template-reference.md
  - docs/dev/README.md
  - docs/dev/architecture.md
  - docs/dev/requirements.md
  - docs/dev/roadmap.md
  - docs/dev/work-items.md
  - docs/dev/working/W-014-W-045-mvc-site-plugins-architecture.md
  - docs/dev/working/W-023-view-migrate-views-to-vue.md
  - docs/dev/working/W-025-view-component-styling.md
  - docs/dev/working/W-046-dev-doc-structure.md
  - docs/dev/working/W-049-docs-marktown-strategy.md

### W-049, v0.5.4: docs: views render markdown docs for jPulse docs and site docs
- status: ✅ DONE
- type: Feature
- objective: standardize on .md format for website docs (jPulse internal docs and site specific docs)
- working doc: docs/dev/W-049-docs-marktown-strategy.md
- two sets of documents:
  - jpulse docs -- jPulse Framework docs
    - doc root: docs/
      - symlink docs/ to webapp/static/assets/jpulse/ (also in git)
    - view: webapp/view/jpulse/index.shtml
    - URI: /jpulse/
  - site docs -- site-specific docs
    - one or more doc sets, such as: docs, help, faq
    - example for "docs":
      - doc root: site/webapp/static/assets/docs/
      - view: site/webapp/view/docs/index.shtml
      - URI: /docs/
- page loads a .md doc
  - Q1: how to get the .md:
    - option 1: via new view controller API endpoint
    - option 2: via REST call directly to the assets directory
  - home doc in each directory is assumed to be README.md
  - Q2: how to get the complete list of docs?
- page renders markdown as HTML, and inserts it to the DOM
  - use marked to render markdown to HTML
    - fix relative links within doc tree
- provide clean, shareable URLs, such as:
  - `/jpulse/` → loads `README.md`
  - `/jpulse/api-reference` → loads `api-reference.md`
  - `/docs/about#team` → loads `about.md`, with #anchor link
- constraint:
  - store marked and other libraries in webapp/static/common
    - no external links to libraries (deployment might be air-gapped)

### W-052, v0.5.5: business: dual licensing with AGPL and commercial license
- status: ✅ DONE
- type: Business
- objective: nurture business and community goals
- see W-052-business-dual-licensing-agpl-and-commercial.md

### W-051, v0.6.6: infrastructure: framework package distribution
- status: ✅ DONE
- type: Infrastructure
- objective: enable framework distribution via private npm package, so that a site owner can maintain their own site-specific repository
- see working/W-051-W-015-W050-onboarding-with-repositories
- base for:
  - W-015: deployment: strategy for clean onboarding
  - W-050: deployment: strategy for separate repositories, one for jpulse, and one for site
- scope:
  - ✅ Restructure framework for npm publishing with KISS approach
  - ✅ Set up GitHub Packages for @peterthoeny/jpulse-framework
  - ✅ Create CLI tools (setup, sync) for simple site management
  - ✅ Create framework package.json and publishing workflow
  - ✅ Test private package installation and copy-based workflow
- deliverables:
  - ✅ @peterthoeny/jpulse-framework package ready for GitHub Packages
  - ✅ CLI tools for site setup and framework updates (jpulse-setup, jpulse-sync)
  - ✅ Package publishing workflow (.github/workflows/publish.yml)
  - ✅ Documentation for site teams (migration guide, updated README)
  - ✅ Air-gapped deployment support via committed webapp/ files

### W-050, v0.6.7: deployment: strategy for separate repositories for jpulse and site
- status: ✅ DONE
- type: Feature
- objective: clean separation of code and data, so that a site owner can maintain their own reporsitory for site/*
- question: what to do with the sample site files?
  site/webapp/controller/hello.js
  site/webapp/view/hello/site-demo.shtml
  site/webapp/view/hello/index.shtml
  site/webapp/app.conf.tmpl
  site/README.md

### W-015, v0.7.0: deployment: strategy for clean onboarding
- status: ✅ DONE
- type: Feature
- objective: clean out of box experience when deploying a jPulse based webserver for the first time
- sensible defaults
- easy onboarding for:
  - dev and prod deployments
  - basic single-server deployment automation
  - MongoDB installation with basic authentication (admin + app users)
- deliverables:
  - interactive deployment configuration wizard (enhanced setup.js)
  - production configuration file generation (app.conf templates)
  - automated server setup scripts (install-system.sh, mongodb-setup.sh)
  - mongoDB basic security setup with safety checks
  - complete deployment package with Red Hat Enterprise Linux focus
- benefits: foundation CLI tools for automated deployment with secure defaults

### W-053, v0.7.3: deployment: configuration templates and validation
- status: ✅ DONE
- type: Feature
- objective: production-ready configuration templates with validation and testing
- depends on: W-015 (deployment CLI foundation)
- deliverables:
  - ✅ production nginx configuration templates with security hardening (already in W-015)
  - ✅ PM2 ecosystem templates with clustering and monitoring (already in W-015)
  - ✅ SSL certificate automation with Let's Encrypt integration (already in W-015)
  - ✅ deployment configuration validation and testing (install-test.sh)
  - ✅ context-aware testing (respects dev vs prod deployment settings)
  - ✅ enhanced environment variable management with deployment context
  - ✅ comprehensive unit and integration tests for deployment validation
  - ✅ jpulse-update CLI tool with dry-run support (prevents data loss)
  - ✅ enhanced MongoDB error handling with password validation
  - ✅ PM2 configuration consistency improvements (dev/prod)
  - ✅ log directory ownership fixes for proper user permissions
  - ✅ comprehensive deployment troubleshooting documentation
- benefits: standardized, secure, tested configuration templates that eliminate manual setup errors and provide production-grade deployment validation

### W-054, v0.7.15: deployment: documentation simplification and troubleshooting
- status: ✅ DONE
- type: Documentation
- objective: streamline deployment documentation to focus on automated approach with comprehensive troubleshooting
- depends on:
  - W-015: deployment: strategy for clean onboarding
  - W-053: deployment: configuration templates and validation - v0.7.3
- deliverables:
  - simplified deployment.md focusing on CLI-driven workflow
  - comprehensive troubleshooting guide for common deployment issues
  - manual configuration reference moved to appendix
  - deployment best practices and security guidelines
  - production monitoring and maintenance procedures
- benefits: clear, actionable deployment documentation that matches the "don't make me think" site creation experience

### W-058, v0.7.16: controllers: consistently use global.CommonUtils.sendError, add test statistics framework
- status: ✅ DONE
- type: Feature
- objectives: clean & consistent code to reduce likelyhood of bugs
- deliverables: fix controllers with i18n
  - config
  - log
  - user
  - view controllers
- already done:
  - auth
  - markdown
- add test statistics at end of tests
  - for each test bucket:
    - 447 passed, 0 failed, 10 skipped, 457 total
  - show grand total:
    - 534 passed, 0 failed, 10 skipped, 544 total

### W-059, v0.7.17: docs: add exclude directory directive
- status: ✅ DONE
- type: Feature
- objectives: hide markdown docs not relevant to be published
- depends on: W-049: docs: views render markdown docs for jPulse docs and site docs
- example: dev/working/ should be excluded from official /jpulse/ docs
- exclude docs and directories defined in .jpulse-ignore file in docs root
- deliverables
  - ✅ docs/.jpulse-ignore:
    - syntax like .gitignore with gitignore-like patterns
    - supports exact files (temp.md), wildcards (*.backup.md), directories (dev/working/)
    - comment support with # prefix and empty line handling
  - ✅ webapp/controller/markdown.js:
    - _loadIgnorePatterns() method for parsing .jpulse-ignore files
    - _shouldIgnore() method with comprehensive pattern matching logic
    - _scanMarkdownFiles() modified to filter ignored files and directories
  - ✅ webapp/tests/unit/controller/markdown-ignore.test.js:
    - 12 comprehensive tests covering pattern parsing, ignore logic, and integration
    - verified exact matches, wildcards, directory patterns, and nested paths
  - ✅ docs/api-reference.md:
    - complete Markdown Documentation API section with ignore functionality
    - documented endpoints, namespace resolution, and ignore pattern syntax
  - ✅ docs/site-customization.md and docs/README.md:
    - updated to reference new content filtering capabilities

### W-060, v0.7.18: log controller: convert log to TSV, consistent login pattern
- status: ✅ DONE
- type: Feature
- objective: make it easy for analytics tools to parse log files
- completed: 2025-09-23
- deliverables:
  - ✅ Converted comma-space separator to tab separator (TSV format)
  - ✅ Added scope parameter to LogController methods (logRequest, logInfo, logError)
  - ✅ Updated CommonUtils.formatLogMessage with new parameter order
  - ✅ Standardized all API methods with consistent logging pattern
  - ✅ Added logRequest entries to all API endpoints for complete tracking
  - ✅ Fixed missing "success:" and "error:" prefixes in log messages
  - ✅ Added logging for unknown API endpoints (404 cases)
  - ✅ All 545 tests passing with enhanced logging functionality

### W-061, v0.7.19: view controller: create {{#each}} handlebar
- status: ✅ DONE
- type: Feature
- completion: 2025-09-23, v0.7.19
- syntax: {{#each array}} {{@index}}: {{this}} {{/each}}
  - @index: zero-based index
  - @first: boolean flag for first iteration
  - @last: boolean flag for last iteration
  - @key: property name for object iteration
  - this: array element value (string or object)
  - use key path in case the array elements are objects, such as:
    - {{#each users}} {{this.profile.firstName}} {{this.profile.lastName}} {{/each}}
    - stringify object if last item in key path is an object
- implementation:
  - Added handleBlockEach function in webapp/controller/view.js
  - Extended getNestedProperty to handle special @ properties
  - Updated evaluateBlockHandlebar switch statement
  - Comprehensive test coverage with 11 new test cases
  - Full documentation in docs/template-reference.md
  - Supports both array and object iteration
  - Robust error handling for non-iterable values

### W-062, v0.7.20: view controller: support nested {{#if}} and {{#each}} handlebars
- status: ✅ DONE
- type: Feature
- depends on:
  - W-061: view controller: create {{#each}} handlebar - v0.7.19
  - W-018: create {{#if}} handlebar for simple nesting - v0.2.7
- algorithm:
  - 3 phases approach based on https://twiki.org/cgi-bin/view/Blog/BlogEntry201109x3
  - phase 1: annotate nesting levels
  - phase 2: recursive expansion, starting at level 0
  - phase 3: clean up unbalanced block elements
  - limit recursion to 16 levels
- deliverables:
  - nested handlebars support with:
    - multi-line blocks
    - left-to-right processing
  - comprehensive test coverage for complex template scenarios

### W-064, v0.7.21: view: create jPulse.UI tab interface widget
- status: ✅ DONE
- type: Feature
- objective: offer a common tab interface within a page to show panels, and across pages for intuitive navigation
- two types of tabs:
  - 1. navigation tabs:
    - use same tab definition across pages:
      // options object, is typically included from a common template
      const tabOptions = {
          tabs: [
              { id: 'myTab1', label: 'My Tab 1', tooltip: '....', url: 'my-page-1.shtml' },
              { id: 'myTab2', label: 'My Tab 2', tooltip: '....', url: 'my-page-2.shtml',
                spacers: 2, tabClass: 'adminOnly' },
              { id: 'myTab3', label: 'My Tab 3', tooltip: '....', url: 'my-page-3.shtml' }
          ],
          linkActiveTab: false
      };
      // show tab on a page:
      jPulse.dom.ready(() => {
          jPulse.UI.navTab.register('myTabDiv', tabOptions, 'myTab2');
      });
    - one tab is active per tab row on a page, defined by second parameter of jPulse.UI.navTab()
    - tabs can be nested for visual navigation in a complex page setup, each with separate tabOptions
    - inspiration: jquery.simpletabs, https://github.com/peterthoeny/jquery.simpletabs
  - 2. multiple panels tabs:
    - single content area with multiple panels, each associated with a tab
    - similar to accordions, just horizontal instead of vertical
    - defined by `<ul>` list with href attributes pointing to panel ID
      - or by tabOptions as above (with optional panelWidth, panelHeight properties)
    - inspiration: jQuery UI Tabs, https://jqueryui.com/tabs
- questions:
  - two types of widgets, or combined?
    - combined: (preferred)
      // if options[].url is set => nav tabs, else => panel tabs
      jPulse.UI.tabs.register(tabsId, options, activeTabId = null);
    - separate:
      jPulse.UI.tabs.registerNavTabs(tabsId, options, activeTabId = null);
      jPulse.UI.tabs.registerPanelTabs(tabsId, options, activeTabId = null);
  - what if the tabs don't fit hirizontally on the page?
    - horizontal auto-scroll?
    - clip?
    - wrap?
- deliverables:
  - jPulse.UI.tabs
  - styles for jPulse.UI.tabs

### W-063, v0.8.0: view: add /jpulse-examples/ pages, rename /jpulse/ to /jpulse-docs/
- status: ✅ DONE
- type: Feature
- objectives: good onboarding, helpful docs and examples
- depends on:
  - W-015: deployment: strategy for clean onboarding - v0.7.0
  - W-064: view: create jPulse.UI tab interface widget - v0.7.21
- deliverables:
  - renamed /jpulse-docs/ from /docs/
  - new /jpulse-examples/ pages:
    - index.shtml         # Overview with navigation cards
    - handlebars.shtml    # Complete handlebars reference
    - ui-widgets.shtml    # UI components showcase
    - forms.shtml         # Form handling examples
    - layout.shtml        # Responsive layout examples
    - api.shtml           # API integration patterns
  - reduce /home/ to a short page with:
    - welcome note based on login status
    - "this page is meant to be overloaded by site/webapp/view/home/index.shtml"
    - links (or buttons like in /admin/) to /jpulse-docs/ and /jpulse-examples/
  - add a jPulse.UI.sourceCode.register()
    - syntax highlighting based on prims.js
    - show a copy button on hover to copy to clipboard
  - add a jPulse.clipboard with copy to clipboard functionality
  - create new docs/handlebars.md markdown doc
  - enhance panelHeight API with 3 options (undefined/auto/fixed)
  - content Boxes & Visual Elements section in ui-widgets
  - cross-linking between docs and examples

### W-065, v0.8.1: branding: create new jPulse logo with a pulse wave
- status: ✅ DONE
- type: Feature
- objective: a logo that is brandable and recognizable
- deliverable:
  - round logo, blue background, white pulse wave across round background

### W-066, v0.8.2: docs: improve site specific docs for better onboarding
- status: ✅ DONE
- type: Feature
- objective: better onboarding experience for site admins and site developers
- deliverables:
  - docs/deployment.md: add new "Version Control and Site Management" section
  - docs/template-reference.md: fix URL bug in .css and .js examples
  - docs/installation.md: document how to wipe MongoDB data for a clean re-install
  - api-reference.md and docs/deployment.md: fix incorrect links to jPulse docs from /jpulse/ to /jpulse-docs/
  - site/README.md: reference and link to "Version Control and Site Management" in docs/deployment.md
  - reverse sequence in HTML title in all .shtml pages to:
    `<title>Page title - {{app.shortName}}</title>`
  - webapp/static/: add updated favicons to static root
  - bin/test-all.js: add elapsed time to each test, and total in grand total

### W-067, v0.8.3: regression bug: site/ directory is missing in published package
- status: ✅ DONE
- type: Bug Fix
- note: this is a critical bug (Regression)
- Problem: New sites installing the jPulse Framework with "npx jpulse-configure" miss the critical site/ directory and all site templates
- Root Cause: package.json "files" array was missing "site/" entry, so site templates weren't published to npm
- Impact: Breaks W-014 site override system for all fresh installations
- Fix: Added "site/" to package.json files array (line 16)
- Evidence: User's jpulse.net server showed empty site/ directory after fresh install
- Files Changed: package.json
- SECURITY FIX: Also discovered and fixed that site/webapp/app.conf (containing session secrets) was being included in npm package
- Additional Fix: Removed brittle package.json files array, now uses .npmignore for maintainable exclusions

### W-071, v0.8.4: site: example /hello-todo/ MVC app with MongoDB collection
- status: ✅ DONE
- type: Feature
- objective: make it easy for site developers to create their own MVC trio with mongodb collection
- see docs/dev/working/W-071-W-072-W-073-site-strategy-hello-and-vue
- prerequisites:
  - site/webapp/view/hello/index.shtml      # simple hello world for site override
  - site/webapp/view/hello/site-demo.shtml  # more details
  - site/webapp/controller/hello.js         # simple demo of API
- deliverables:
  - site/webapp/view/hello-todo/index.shtml # todo MVC demo view with with educational content and app
  - site/webapp/controller/helloTodo.js     # todo MVC demo controller with API
  - site/webapp/model/helloTodo.js          # todo MVC demo model with helloTodos MongoDB collection
  - webapp/utils/site-registry.js           # Enhanced auto-registration for CRUD API method discovery
  - webapp/tests/unit/site/hello-todo-model.test.js # Comprehensive model test coverage
  - webapp/tests/unit/utils/site-registry.test.js   # Updated tests for enhanced registry functionality
  - webapp/view/home/index.shtml:
    - link hello examples as a dashboard buttons
    - show dashboard buttons conditionally with #if
- implementation notes:
  - Complete MVC pattern demonstration with MongoDB integration
  - Enhanced SiteRegistry for automatic API endpoint discovery (apiCreate, apiToggle, apiDelete, apiStats)
  - Educational info box explaining MVC pattern and how to clone for custom apps
  - User authentication context with guest mode support
  - Interactive UI with real-time statistics and confirmation dialogs
  - Framework integration: jPulse.UI.confirmDialog, jPulse.dom.ready, ISO date formatting
  - Comprehensive test coverage with model tests
  - All 536 tests passing, production-ready code
- release: v0.8.4, 2025-09-30

### W-072, v0.8.5: site: example /hello-vue/ SPA using vue.js
- status: ✅ DONE
- type: Feature
- objective: define a way to create SPA (single page application) using vue.js, with example for easy onboarding
- see docs/dev/working/W-071-W-072-W-073-site-strategy-hello-and-vue
- inspiration:
  - the /jpulse-docs/ is already a SPA with changing URI, not based on vue.js
- deliverables:
  - define standard for SPA using vue.js
  - demo app should change URI, so that a page reload brings back to same place (like Gmail)
  - site/webapp/controller/helloVue.js                  # Vue.js SPA demo controller with API
  - site/webapp/view/hello-vue/index.shtml              # Vue.js SPA view
  - site/webapp/view/hello-vue/templates/routing.tmpl   # app routing
  - site/webapp/view/hello-vue/templates/todo-demo.tmpl # To-do Demo page
  - site/webapp/view/hello-vue/templates/overview.tmpl  # Overview page
  - site/webapp/view/hello-vue/templates/about.tmpl     # About page
  - site/webapp/view/hello-vue/templates/code.tmpl      # Code Examples page
  - site/webapp/view/hello-vue/templates/features.tmpl  # Features page
- accomplished:
  - Vue.js SPA Demo - Complete Single Page Application with Vue.js 3 and Vue Router
  - Enhanced jPulse Utilities - jPulse.date namespace and jPulse.api.handleError()
  - Documentation Updates - README files highlighting MEVN stack and MPA/SPA flexibility
  - MPA vs. SPA Guide - Comprehensive comparison with diagrams and MVC perspective

### W-074, v0.8.6: view: consistent jPulse.* utilities, all in buckets
- status: ✅ DONE
- type: Feature
- objective: more consistent common utilities - all organized in logical namespaces
- approach:
  - no backwards compatibility concerns (pre 1.0.0 release)
- deliverables:
  - rename jPulse.apiCall() to jPulse.api.call()
    - rename/change function scope
    - fix all views and docs referencing jPulse.api.call() (14 usages, 4 files)
    - remove jPulse.api.call()
  - rename slide-down messages to jPulse.UI.toast.*
    - jPulse.showSlideDownMessage() → jPulse.UI.toast.show()
    - jPulse.showSlideDownError() → jPulse.UI.toast.error()
    - jPulse.showSlideDownSuccess() → jPulse.UI.toast.success()
    - jPulse.showSlideDownInfo() → jPulse.UI.toast.info()
    - jPulse.showSlideDownWarning() → jPulse.UI.toast.warning()
    - jPulse.clearSlideDownMessages() → jPulse.UI.toast.clearAll()
    - fix all views and docs (98 usages, 11 files)
    - remove old function names
  - update documentation (front-end-development.md, etc.)
  - update all example pages

### W-073, v0.9.0: site: create client & server websocket infrastructure
- status: ✅ DONE
- type: Feature
- objective: standard way where views can establish a persistent bi-directional communication with a controller, useful for single page apps, or concurrent edit of content
- see docs/dev/working/W-071-W-072-W-073-site-strategy-hello-and-vue
- deliverables:
  - server:
    - webapp/controller/websocket.js - WebSocket controller with namespace registration
    - webapp/app.js - WebSocket server initialization with session middleware
    - package.json - ws dependency added
    - webapp/app.conf - Redis pub/sub configuration for multi-instance coordination
    - webapp/view/admin/websocket-status.shtml - Real-time monitoring page
      - per namespace: status, name, clients, active users, messages/min, total messages
      - overall: uptime, total messages, color-coded activity log (light theme)
    - webapp/view/admin/websocket-test.shtml - Interactive test tool for developers
    - webapp/view/admin/index.shtml - Dashboard link to WebSocket status
  - browser view:
    - webapp/view/jpulse-common.js - jPulse.ws.* client utilities
    - Persistent client UUID (localStorage)
    - Username tracking in all messages
    - webapp/view/jpulse-common.css - Common styles for dashboard cards:
      - .jp-card > h2:first-child - Dialog-style card heading
      - .jp-card > h2:first-child .jp-subheading - Subheading with baseline alignment
  - assets & i18n:
    - webapp/static/assets/admin/icons/websocket.svg - WebSocket icon (electric outlet style)
    - webapp/translations/en.conf - English i18n keys for WebSocket UI
    - webapp/translations/de.conf - German i18n keys for WebSocket UI
  - docs:
    - docs/websockets.md - Complete WebSocket documentation
    - docs/front-end-development.md - WebSocket section with quick start
  - high availability:
    - Bidirectional ping/pong health checks (30s interval)
    - Progressive reconnection (5s to 30s max with exponential backoff)
    - Redis pub/sub preparation for horizontal scaling (W-076 required for testing)
  - authentication & authorization:
    - Consolidated auth using AuthController.isAuthenticated/isAuthorized
    - Manual session middleware invocation during WebSocket upgrade
    - Namespace-level authentication and role-based access control
  - testing:
    - webapp/tests/unit/controller/websocket.test.js - 26 server-side tests
    - webapp/tests/unit/utils/jpulse-websocket-simple.test.js - 39 client-side tests
    - webapp/tests/helpers/websocket-test-utils.js - Test utilities and mocks
    - 65 total tests with comprehensive coverage

### W-075, v0.9.1: site: create example /hello-websocket/ app
- status: ✅ DONE
- type: Feature
- objective: create a websocket client app to teach how to create an app with realtime communication
- see docs/dev/working/W-071-W-072-W-073-site-strategy-hello-and-vue
- prerequistes:
  - W-071: site: example /hello-todo/ MVC app with MongoDB collection - v0.8.4
  - W-072: site: example /hello-vue/ SPA using vue.js - v0.8.5
  - W-073: site: create client & server websocket infrastructure - 0.9.0
- deliverables:
  - WebSocket Demo Application (/hello-websocket/)
    - site/webapp/view/hello-websocket/index.shtml - main SPA page
    - site/webapp/view/hello-websocket/templates/routing.tmpl - navigation controller
    - site/webapp/view/hello-websocket/templates/overview.tmpl - overview component
    - site/webapp/view/hello-websocket/templates/emoji-demo.tmpl - emoji cursor tracking demo
    - site/webapp/view/hello-websocket/templates/todo-demo.tmpl - collaborative todo demo
    - site/webapp/view/hello-websocket/templates/code-examples.tmpl - implementation examples
    - site/webapp/view/hello-websocket/templates/architecture.tmpl - architecture explanation
    - site/webapp/controller/helloWebsocket.js - WebSocket namespace management
  - Enhanced Hello Examples Navigation
    - site/webapp/view/hello/index.shtml - new dashboard for all hello examples
    - site/webapp/view/hello/site-override.shtml - renamed from index.shtml
    - site/webapp/view/hello/site-development.shtml - renamed from site-demo.shtml
    - site/webapp/view/hello-todo/index.shtml - new overview page
    - site/webapp/view/hello-todo/todo-app.shtml - renamed from index.shtml
    - site/webapp/view/hello-todo/code-examples.shtml - new code examples page
    - site/webapp/view/hello-todo/architecture.shtml - new architecture page
    - site/webapp/view/hello-vue/templates/architecture.tmpl - new architecture page
    - site/webapp/view/hello-vue/templates/code-examples.tmpl - renamed from code.tmpl
  - Modal Dialog Bug Fix
    - webapp/view/jpulse-common.js - enhanced focus trap with keyboard event interception
  - CSS Improvements
    - webapp/view/jpulse-common.css - fixed dashboard card vertical alignment
  - Documentation
    - docs/websockets.md - added Ephemeral and Hybrid REST+WebSocket patterns
    - docs/README.md - updated to v0.9.1 with new release highlights
    - docs/CHANGELOG.md - comprehensive v0.9.1 release notes
  - Testing
    - webapp/tests/unit/site/hello-todo-structure.test.js - 14 comprehensive structure tests
    - webapp/tests/unit/utils/jpulse-common-enhanced.test.js - fixed for refactored hello-todo
    - webapp/tests/integration/w047-site-files.test.js - updated for renamed hello files
  - Integration
    - site/webapp/controller/helloTodo.js - added WebSocket broadcast calls
    - webapp/app.js - initialize HelloWebsocketController on startup
    - webapp/view/home/index.shtml - updated hello-websocket description

### W-069, v0.9.2: view: create site navigation pulldown and hamburger menu
- status: ✅ DONE
- type: Feature
- objective: configurable site navigaton for quick access that works on desktop and mobile, easy to overload by site owners
- spec discussions: docs/dev/working/W-068-W-069-W-070-view-create-responsive-nav
- define site menu in webapp/view/jpulse-navigation.tmpl
- on desktop:
  - on hover over site logo and site name,
  - show pulldown with nested pages
- on mobile:
  - show hamburger menu (where? to the left of app icon?)
- deliverables:
  - docs/dev/working/W-068-W-069-W-070-view-create-responsive-nav -- updated spec with template-based navigation architecture
  - webapp/view/jpulse-navigation.tmpl -- unified site navigation and tabs definition template, renamed from webapp/view/jpulse-nav-tabs.tmpl
  - webapp/controller/view.js:
    - optimize performance by caching the global config instead of reading the database each time
    - new initialize() method, called by bootstrap
    - handlebars automatically stringify objects and arrays if specified object path is not a string or number
  - webapp/translations/en.conf and webapp/translations/de.conf -- add navigation translations for admin and jpulseDocs sections
  - webapp/utils/bootstrap.js -- initialize view controller at startup
  - webapp/view/admin/websocket-status.shtml -- fix remaining deprecated jPulse.showSlideDownMessage()
  - webapp/view/admin/users.shtml -- removed page-specific CSS overrides that conflicted with framework responsive styles
  - webapp/view/jpulse-docs/index.shtml -- register doc pages dynamically with jPulse.UI.navigation.registerPages(), optimize markdown data fetching
  - webapp/view/jpulse-common.css:
    - add site navigation dropdown styles with nested submenus, hover effects, SVG icon blue backgrounds, overflow:visible for unlimited nesting, mobile support
    - add .jp-btn-nav-group component with arrow separators
    - consolidated 7 separate @media (max-width: 600px) blocks into one for better maintainability
    - fixed mobile search form layout (fields now stack vertically and size properly)
    - added flexbox-based desktop search form with proper wrapping and field sizing
    - reduced mobile padding and spacing for better space utilization
    - added .jp-tabs:empty { min-height: 55px; } to prevent content jump on MPA page loads
  - webapp/view/jpulse-common.js:
    - jPulse.UI.navigation module with init(), registerPages(), smart submenu positioning, hover delays, mobile hamburger, helpers.convertMarkdownFilesToPages()
    - per-submenu timeout system using Map for independent hover delays (fixes competing timeout bugs)
    - allow re-initialization when user roles change (fixes auth bug where admin menu doesn't appear after login)
    - jPulse.UI.tabs.register() -- enhanced with optional 3rd parameter and auto-detect active tab from URL (partial URL matching for SPAs)
  - webapp/view/jpulse-footer.tmpl -- initialize navigation on pages, set --jp-header-height CSS variable
  - webapp/view/jpulse-examples/*.shtml -- added class="jp-tabs" to tab placeholder divs to prevent content jump (6 files)
  - webapp/view/user/profile.shtml -- wrapped API calls in {{#if user.isAuthenticated}} to prevent toast messages when logged out
  - webapp/routes.js -- added custom middleware for site override of static files in development mode (mimics nginx try_files behavior)
  - webapp/tests/unit/utils/jpulse-ui-navigation.test.js -- comprehensive navigation tests for template-based architecture
  - webapp/tests/unit/utils/jpulse-ui-widgets.test.js -- added 6 new tab parameter handling tests, removed 6 JSDOM-limited tests
  - docs/handlebars.md -- updated template include examples to reflect jpulse-navigation.tmpl and parameter passing
  - docs/style-reference.md -- documentation for .jp-btn-nav-group

### W-070, v0.9.3: view: create hierarchical breadcrumb navigation
- status: ✅ DONE
- type: Feature
- objective: let users know where they are on a big site
- spec discussions: docs/dev/working/W-068-W-069-W-070-view-create-responsive-nav
- prerequisites:
  - W-069, v0.9.2: view: create site navigation pulldown and hamburger menu
- example:
  - Home > Admin > Site Configuration
- currently solved manually in /admin/ and /hello-*/ site demos
  - good user experience, but a manual process that can result in inconsistencies
  - remove once automated breadcrumbs are in place
- all parents should be links for quick access
- should parents have on hover pulldowns to show siblings for quick navigation?
  - bo, overkill because site nav pulldown exists (W-069)
- automatic breadcrumb based on navigation structure (in webapp/view/jpulse-navigation.tmpl) and current URL
- responsive design: desktop & mobile
- deliverables:
  - Hierarchical breadcrumb navigation system (W-070)
  - Bottom-up directory-level search algorithm for accurate URL matching
  - Clean initialization pattern consistent with site navigation
  - Server-side template integration with i18n support
  - SPA navigation compatibility with real-time updates
  - Comprehensive test coverage (22 breadcrumb tests, 56 total navigation tests)
  - Production-ready breadcrumb feature with responsive design
  - Updated test wrapper for accurate failure reporting

### W-077, v0.9.4: auth controller & view: disable user signup & login with app configuration
- status: ✅ DONE
- type: Feature
- objective: admin can disable user signup and/or login, mainly for public sites
- spec:
  - user signup:
    - new appConf.controller.auth.disableSignup flag
      - if true:
        - disable signup in controller
    - new appConf.view.auth.hideSignup flag
      - if true:
        - hide signup in site nav
        - hide signup in user menu
  - user login:
    - new appConf.controller.auth.disableLogin flag
      - if true:
        - keep login in controller (for secret login via known url, intended for public sites)
    - new appConf.view.auth.hideLogin flag
      - if true:
        - hide login in site nav
        - hide login in user menu
  - deliverables:
    - webapp/app.conf: new flags:
      - controller.user.disableSignup   // prevent signup
      - controller.auth.disableLogin    // prevent login
      - view.auth.hideSignup            // hide signup in navigation
      - view.auth.hideLogin             // hide login in navigation
    - docs/handlebars.md
      - document {{#unless}} ... {{/unless}}
    - webapp/controller/view.js:
      - new handlebar: {{#unless}} ... {{/unless}}
      - fix bug with nested {{#if}} ... {{else}} ... {{/if}}
    - webapp/controller/user.js:
      - disable signup based on controller.user.disableSignup flag
    - webapp/controller/auth.js:
      - disable login based on controller.auth.disableLogin flag
    - webapp/view/jpulse-navigation.tmpl:
      - add {{#if}} conditionals based on view.auth.hideSignup and view.auth.hideLogin
    - webapp/view/jpulse-footer.tmpl:
      - add {{#if}} conditionals based on view.auth.hideSignup and view.auth.hideLogin
    - webapp/view/auth/login.shtml: fix JavaScript bug when already logged in
    - webapp/tests/unit/controller/view.test.js:
      - add integration tests for {{#unless}} helper functionality
      - add integration tests for nested {{#if}} with {{else}} bug fix
      - replaced old reimplemented handlebars processor with actual view controller tests
    - pending:
      - fix responsive style issue with user icon position (released without fix!)

### W-040, v0.9.5: view: create view logs page for site admins
- status: ✅ DONE
- type: Feature
- objectives: admin can analyze usage
- create search logs page for admins
  - filter:
    - date: use text field, expected format YYYY-MM-DD (supports partial dates)
      - default: today
    - username: text field
    - action: select (hard-coded list ['create', 'update', 'delete'])
    - docType: select (dynamically populated from database with caching)
  - result in table:
    - sortable columns with three-click sorting (asc, desc, default)
    - rows: Date, Username, Action, Doc Type, Changes
    - expandable changes with smart body-attached dropdown
    - responsive design with mobile support
  - additional features implemented:
    - date presets: Today, Yesterday, This Month, Last Month, Whole Year
    - full i18n support (English/German)
    - scroll tracking for dropdown positioning
    - comprehensive error handling
    - pagination with configurable page size
- deliverables:
  - webapp/app.conf - Added docTypes array for global access
  - webapp/model/log.js - Enhanced logging with consistent format
  - webapp/controller/log.js - Added docTypes caching and improved search
  - webapp/controller/view.js - Added docTypes context for templates
  - webapp/controller/user.js - Added missing user update logging
  - webapp/controller/config.js - Standardized log message format
  - webapp/translations/en.conf - Added all log-related translations
  - webapp/translations/de.conf - Added German translations
  - webapp/utils/bootstrap.js - Added docTypes population during startup
  - webapp/view/jpulse-common.css - Added table sorting styles
  - webapp/view/admin/logs.shtml - Search logs interface
  - site/webapp/controller/helloTodo.js - Added comprehensive logging
  - site/webapp/model/helloTodo.js - Added missing findById method

### W-078, v0.9.6: app api: provide health and metrics endpoints
- status: ✅ DONE
- type: Feature
- objective: provide health and metrics endpoint for load-balancer and system monitoring
- apis:
  - /api/1/health/status
  - /api/1/health/metrics
- deliverables:
 - webapp/controller/health.js - health controller with API endpoints and helper methods
 - webapp/routes.js - added /api/1/health/status and /api/1/health/metrics routes
 - webapp/view/admin/system-status.shtml - comprehensive admin dashboard with auto-refresh
 - webapp/static/assets/admin/icons/system-status.svg - SVG icon for system status page
 - webapp/view/jpulse-common.css - moved status styling to framework (jp-* classes)
 - webapp/view/jpulse-common.js - added jPulse.UI.windowFocus for tab focus detection
 - webapp/view/admin/index.shtml - added system status dashboard card
 - webapp/view/jpulse-navigation.tmpl - added system status navigation entry
 - webapp/app.conf - restructured appConfig.app (jPulse vs site), added health config
 - webapp/translations/en.conf & de.conf - i18n for system status page
 - webapp/tests/unit/controller/health.test.js - unit tests for utility functions
 - webapp/tests/integration/health-api.test.js - integration tests for API structure
 - site/webapp/controller/hello.js - updated to use appConfig.app.jPulse.version
 - site/webapp/view/hello/site-override.shtml - updated framework version display

### W-079, v0.9.7: cache: strategy for cache invalidation in controllers & utilities
- status: ✅ DONE
- type: Feature
- objective:
  - ability to invalidate caches (.shtml, .tmpl, .css, .js, i18n .conf), so that the app does not need to be restarted
  - should work in multi node instances, and multi app server instances
- automated way across all node instances of the app
  - timer based, e.g. cache TTL?
  - file change detection?
  - on-demand via API?
- caches:
  - view controller caches:
    - file: webapp/controller/view.js
    - cache: local
    - target:
      - webapp/view/**/*css
      - webapp/view/**/*js
      - webapp/view/**/*tmpl
      - site/webapp/view/**/*css
      - site/webapp/view/**/*js
      - site/webapp/view/**/*tmpl
  - i18n utility caches:
    - file: webapp/utils/i18n.js
    - cache: local
    - target:
      - webapp/translations/*.conf
  - markdown controller caches:
    - file: webapp/controller/markdown.js
    - cache: local
    - markdown file contents with timestamp tracking
    - directory listings for API responses
    - target:
      - docs/**/*md
- deliverables:
  - webapp/utils/cache-manager.js - centralized cache management utility
  - webapp/controller/cache.js - cache API endpoints for manual refresh and statistics
  - webapp/controller/view.js - integrated with CacheManager for template and include caching
  - webapp/controller/markdown.js - integrated with CacheManager for markdown file caching
  - webapp/utils/i18n.js - integrated with CacheManager for translation file caching
  - webapp/app.js - graceful shutdown handling for cache timers
  - webapp/tests/setup/global-teardown.js - cache cleanup for test environment
  - webapp/tests/setup/env-setup.js - test environment configuration
  - webapp/tests/integration/cache-api.test.js - cache API integration tests
  - webapp/app.conf - cache configuration with periodic refresh intervals

### W-076, v1.0.0: framework: redis infrastrucure for a scaleable jPulse Framework
- status: ✅ DONE
- type: Feature
- objective: support multiple node instances (pm2 cluster) on an app server, support a pool of app servers in a load-balanced configuration
- architecture & spec discussion:
  - docs/dev/working/W-076-redis-caching-and-1o-release-prep.md
- prerequisites:
  - W-073, v0.9.0: site: create client & server websocket infrastructure - DONE
- requirement:
  - jPulse should work with full functionality in multi node instances, and multi app server instances
- implementation:
  - Redis-based clustering for multi-instance WebSocket communication
  - Redis-based health metrics aggregation across instances
  - Redis-based session sharing across instances
  - Simplified architecture: Redis required for multi-instance deployments
- technology:
  - use redis to share specific data on all running app instances (with pub/subscribe?)
- shared data across all app instances:
  - health/metrics data
    - the system status dashboard at /admin/system-status.shtml should show health data across all app instances
    - how?
      - each instance shares its own data in redis?
      - an instance can request data from all other instances?
      - central object in redis, each instance updates a subset with its own data?
  - websocket connection data
    - connections to a namespace (such as /api/1/ws/hello-emoji) should be able to share messages across all app instances
    - publish/subscribe
  - site config
    - updating the site config at /admin/config.shtml should update the cached globalConfig in view controllers in all app instances
    - or a simple "refresh cache from mongodb" message?
  - user sessions
    - updating the user profile at /user/profile.shtml should update the cached user sessions (req.session.user.*), used in view controllers in all app instances
    - switch session store from mongodb to redis?
    - or a simple "refresh user session from mongodb" message?
  - anything else?
- deliverables:
  - Core Redis Infrastructure (W-076):
    - webapp/app.conf -- comprehensive Redis configuration (single/cluster modes, connection prefixes/TTLs)
    - site/webapp/app.conf.tmpl -- Redis configuration overrides for site owners
    - webapp/utils/redis-manager.js -- centralized Redis connection management with graceful fallback
    - webapp/utils/bootstrap.js -- integrated Redis initialization and session store configuration
    - webapp/app.js -- simplified session middleware using bootstrap-provided session store
  - Session Management:
    - webapp/utils/redis-manager.js -- configureSessionStore() with Redis/Memory/MongoDB fallback hierarchy
    - Global RedisManager availability for all controllers
    - changed user.authenticated to user.isAuthenticated in session, and in handlebar context
  - Broadcasting System:
    - webapp/controller/broadcast.js -- REST API for cross-instance broadcasting with callback system
    - webapp/controller/view.js -- config refresh broadcasting and self-registered callbacks
    - webapp/controller/config.js -- integrated with view controller broadcast system
    - webapp/utils/redis-manager.js -- centralized broadcast message handling with specificity-based channel matching
    - webapp/utils/redis-manager.js -- omitSelf flag support for preventing self-message processing
    - webapp/utils/redis-manager.js -- channel schema validation (model:/view:/controller: prefixes required)
    - webapp/translations/en.conf + de.conf -- broadcast-specific i18n keys
  - WebSocket Infrastructure:
    - webapp/controller/appCluster.js -- NEW WebSocket-to-Redis bridge for real-time client sync
    - webapp/controller/websocket.js -- migrated endpoints from /ws/ to /api/1/ws/ for API consistency
    - webapp/controller/websocket.js -- Redis-based cross-instance WebSocket broadcasting (HTTP fallbacks removed)
    - webapp/view/admin/websocket-test.shtml -- updated for new endpoint structure
    - webapp/view/admin/websocket-status.shtml -- updated for new endpoint structure
    - site/webapp/controller/helloWebsocket.js -- updated namespace registration for new endpoints
  - Health Metrics Clustering:
    - webapp/controller/health.js
      - Redis-based health metrics aggregation across instances
      - automatic instance discovery with 30s broadcast + 90s TTL
      - graceful shutdown broadcasting (removes instances immediately from cluster metrics)
      - omitSelf: true prevents duplicate local instance entries in metrics
      - cache system data, shared among pm2 instances and redis
      - request/error tracking with 1-minute rolling window (trackRequest(), trackError())
      - enhanced instance data: version, release, environment, database status, CPU, memory%, requests/min, errors/min, error rate
    - Enhanced /api/1/health/metrics endpoint with cluster-wide statistics
    - webapp/controller/log.js -- integrated automatic request/error tracking for health metrics
    - webapp/utils/bootstrap.js -- registered HealthController globally for LogController access
    - webapp/view/admin/system-status.shtml -- enhanced Instance Details display with all new metrics
    - webapp/app.js -- graceful shutdown calls HealthController.shutdown() to broadcast removal
  - Client-Side Enhancements:
    - webapp/view/jpulse-common.js -- configurable WebSocket UUID storage (session/local/memory)
    - webapp/view/jpulse-common.js -- jPulse.appCluster API for instance info and broadcasting
    - webapp/view/jpulse-common.js -- jPulse.appCluster.fetch() wrapper for automatic UUID injection in API calls
    - site/webapp/view/hello-websocket/templates/code-examples.tmpl -- comprehensive WebSocket documentation with UUID storage
  - Example applications:
    - /hello-app-cluster/index.shtml -- overview
    - /hello-app-cluster/notifications.shtml -- app showcasing client-side broadcasting pattern
    - /hello-app-cluster/collaborative-todo.shtml -- to-do app showcasing server-side (full MVC) broadcasting pattern
    - site/webapp/controller/helloClusterTodo.js -- refactored to use HelloTodoModel, adhering to MVC
    - /hello-app-cluster/code-examples.shtml -- updated with accurate, final code examples for both patterns
    - /hello-app-cluster/architecture.shtml -- updated with accurate architecture diagrams and component roles
  - UI/UX Improvements:
    - webapp/view/admin/logs.shtml -- better i18n without concatenating i18n strings (Japanese language support)
    - site/webapp/view/hello-websocket/templates/code-examples.tmpl -- escaped HTML in pre blocks for proper rendering
    - site/webapp/view/hello-todo/todo-app.shtml -- replaced "loading..." message with spinner icon (eliminates page reload flicker)
    - site/webapp/view/hello-todo/code-examples.shtml -- escaped HTML in pre blocks for proper rendering
    - webapp/view/user/profile.shtml -- fixed async loading race condition for language/theme dropdowns
  - Package Dependencies:
    - package.json -- added connect-redis and ioredis for Redis session management
  - Architecture Simplification:
    - Removed complex HTTP fallback code from WebSocket controller
    - Simplified to Redis-only approach for multi-instance deployments
    - Updated documentation to clarify Redis requirements
  - Page title:
    - in `<title>` tag of all pages, fixed broken {{app.shortName}} to {{app.site.shortName}}
  - Common styles:
    - tweaked jp-* styles for more consistent look, and a bit more condensed look
  - System-wide metadata
    - created appConfig.system with metadata: rootDir, appDir, siteDir, port, hostname, serverName, serverId, pm2Id, pid, instanceName, instanceId, docTypes
    - objective: single source of truth for system metadata
  - App cluster broadcasting options:
    - { omitSelf: true }  // do not send message back to oneself (default for controller:*, model:*)
    - { omitSelf: false } // send message back to oneself (default for view:*)
  - Bug Fixes (Post-RC1):
    - webapp/controller/health.js -- fixed duplicate instance counting in PM2 cluster mode
      - _getCurrentInstanceHealthData() now returns only current instance data (totalInstances: 1)
      - removed aggregate PM2 process counting from individual broadcasts
      - aggregation now happens correctly at receiver (_buildClusterStatistics)
    - webapp/controller/health.js -- corrected broadcast channel naming to use instanceId (serverId:pm2Id:pid)
    - webapp/controller/health.js -- added MongoDB admin auth fallback for non-privileged deployments
    - webapp/app.js -- simplified system metadata initialization (removed unnecessary function wrapper)
  - Architecture Improvements:
    - Established global.appConfig.system.* as single source of truth for system metadata
    - Created permanent memory: "jPulse Framework: System Metadata Single Source of Truth"
    - All code now references appConfig.system directly without reconstruction or duplication
  - Deployment Configuration:
    - bin/configure.js -- clarified logging configuration options for PM2
    - Documented PM2 logging modes (internal /dev/null vs file-based)
  - Post-RC1 Bug Fixes & Architecture Improvements:
    - webapp/controller/health.js -- fixed duplicate instance counting in health metrics
      - _getCurrentInstanceHealthData() now returns only current instance data (totalInstances: 1)
      - each instance broadcasts its own data, aggregation happens at receiver
      - corrected broadcast channel naming to use global.appConfig.system.instanceId directly
      - added MongoDB admin auth fallback for deployments without clusterMonitor role
      - smart MongoDB status caching with Redis (5-minute TTL for adminStatus)
    - webapp/app.js -- fixed early return bug preventing system metadata initialization
      - removed early return after config generation (line 70)
      - ensures instanceId is always populated for PM2 instance 0
    - webapp/utils/redis-manager.js -- MongoDB connection status caching with isAvailable checks
    - bin/mongodb-setup.sh -- added clusterMonitor role for jpapp user (new installations)
    - Established global.appConfig.system.* as single source of truth for system metadata
    - All health metrics now accurate in PM2 cluster deployments
    - Added generic setHeader in app.conf and app.js to set Content-Security-Policy and other HTTP headers
  - Site Controller Registry & SPA Auto-Discovery:
    - webapp/utils/bootstrap.js -- integrated SiteControllerRegistry, ContextExtensions, viewRegistry, and WebSocketController initialization
      - Step 11: SiteControllerRegistry with automatic API discovery
      - Step 12: ContextExtensions for site-specific template data
      - Step 13: viewRegistry creation for routes.js compatibility
      - Step 14: WebSocketController class availability (server init deferred)
    - webapp/utils/site-controller-registry.js -- renamed from site-registry.js, major refactor
      - Dynamic API method detection using regex pattern matching
      - Automatic HTTP method inference (GET/POST/PUT/DELETE)
      - Controller initialize() method discovery and execution
      - Fixed path construction bug (duplicate 'webapp' removed)
      - All internal methods prefixed with underscore
    - webapp/controller/view.js -- converted to static class with SPA auto-detection
      - Moved _buildViewRegistry() from app.js
      - Added static isSPA(namespace) with caching for automatic SPA detection
      - Fixed siteViewPath construction to include site view directories
      - Updated viewRouteRE regex to match SPA sub-routes (/namespace/sub-path)
      - Removed redundant W-049 documentation fallback code
      - Uses PathResolver for site-first, framework-second resolution
    - webapp/routes.js -- fixed static method context binding
      - Wrapped ViewController.load in arrow functions to preserve `this` context
      - All route patterns updated (shtml/tmpl, jpulse-*, viewRouteRE, fallback)
    - webapp/app.js -- removed all hardcoded controller initialization
      - Removed HelloWebsocketController.initialize() call
      - Removed duplicate ViewController initialization
      - Simplified to call bootstrap() only
    - Architecture: Complete auto-discovery (no hardcoded routes, imports, or WebSocket initialization)
    - Bug fixes: Context loss in static methods, missing site view directories, SPA detection path resolution
  - Unified and simplified jp-card with headings and sub-headings
    - enhanced webapp/view/jpulse-common.css:
      - Created new .jp-card-dialog-heading class for explicit opt-in dialog-style headers
      - Created .jp-card-subheading class for subheadings positioned to the right of dialog headings
    - fixed all .html pages and .tmpl files
  - Public Demo Access Configuration:
    - webapp/controller/auth.js -- added _public virtual role support in isAuthorized()
      - _public role allows unauthenticated access when configured
      - empty requiredRoles array means open to all
      - supports mixed access (e.g., ['_public', 'admin'] for public OR admin)
    - webapp/controller/health.js -- role-based access control for health endpoints
      - appConfig.controller.health.requiredRoles.status: controls /api/1/health/status access
      - appConfig.controller.health.requiredRoles.metrics: controls /api/1/health/metrics access
      - default: admin/root required, empty array = public, _public = unauthenticated only
    - webapp/controller/health.js -- data sanitization for non-admin users
      - removes sensitive infrastructure data (hostnames, IPs, PIDs, database names)
      - sanitizes processInfo, database connection details, server identifiers
      - preserves demo functionality while protecting infrastructure details
    - site/webapp/view/jpulse-admin-demo/ -- public demo pages cloned from admin
      - system-status.shtml -- cluster-wide system monitoring (public access)
      - websocket-status.shtml -- WebSocket namespace monitoring (public access)
      - websocket-test.shtml -- WebSocket testing tool (public access)
  - Health Metrics Bug Fixes:
    - webapp/controller/health.js -- fixed PM2 uptime calculation bug
      - corrected _getPM2Status() to use pm2_env.pm_uptime correctly (milliseconds timestamp)
      - fixed _buildServersArray() to reuse calculated uptime instead of recalculating
      - uptime now correctly shows seconds since last restart, not 55 years
    - webapp/view/admin/logs.shtml -- fixed filter preset buttons
      - changed event listener selector from .jp-btn-secondary to [data-preset]
      - preset buttons (Today, Yesterday, etc.) now work correctly
      - setPresetActive() also updated to use [data-preset] selector
  - Template Configuration Structure Alignment:
    - site/webapp/view/site-common.js.tmpl -- fixed init() to use Handlebars {{app.site.name}} and {{app.site.version}} for server-side expansion (renamed to jpulse-common.js.tmpl in W-098)
      - Corrected misconception that window.appConfig is available in view templates (appConfig is server-side only)
      - Templates (.tmpl files) are processed by ViewController.load() which expands Handlebars before JavaScript reaches browser
    - templates/webapp/app.conf.dev.tmpl -- structure aligned with webapp/app.conf (app.site.name/shortName nested structure)
    - templates/webapp/app.conf.prod.tmpl -- structure aligned with webapp/app.conf (app.site.name/shortName nested structure)
      - Note: Template variables (%SITE_NAME%, etc.) remain unchanged - only structure was modified to match framework defaults
  - Documentation:
    - docs/application-cluster.md -- NEW comprehensive guide for App Cluster Broadcasting
      - Quick decision tree (WebSocket vs App Cluster)
      - Comparison table with examples
      - Client-side and server-side API reference
      - Common patterns (collaborative editing, notifications, real-time dashboards)
      - Migration guide and troubleshooting
    - docs/websockets.md -- added App Cluster reference blurb at top
    - docs/mpa-vs-spa.md -- NEW "Real-Time Multi-User Communication" section with decision table
    - docs/handlebars.md -- enhanced with special context variables table, nested blocks, error handling
    - docs/template-reference.md -- streamlined Handlebars section, added reference to handlebars.md
    - docs/README.md -- added high-level descriptions of App Cluster and WebSocket features
    - README.md -- added "Real-Time Multi-User Communication" to Key Features
    - README.md -- added Redis and Health Metrics to Deployment Requirements
    - docs/genai-development.md -- NEW comprehensive guide for site developers using Gen-AI assistants
      - Complete guide for "vibe coding" with jPulse Framework
      - Covers all major AI tools (Cursor, Cline, Copilot, Windsurf)
      - Initial setup and configuration guidance
      - Effective prompting strategies and architecture-aware development
      - Building common features with AI assistance
      - Testing, debugging, and code quality practices
      - Common pitfalls and solutions
      - Example AI development sessions with conversation flows
      - Checklists for AI-assisted development
    - docs/genai-instructions.md -- NEW machine-readable instructions for AI coding agents
      - Critical framework patterns and conventions (Site Override System, API-First, Client-Side Heavy, Auto-Discovery)
      - CSS and JavaScript conventions (jp-* vs site-* vs local-* prefixes)
      - Framework vs Site file distinctions
      - Reference implementations pointing to living code examples
      - Implementation guidance for controllers, views, models
      - Code quality checklist and security considerations
      - Response guidelines for AI assistants
      - Philosophy: document stays fresh, AI generates current code
    - docs/README.md -- added "AI-Assisted Development" section highlighting Gen-AI benefits
    - docs/getting-started.md -- added Gen-AI guide references in Prerequisites and Next Steps
    - docs/site-customization.md -- added Gen-AI guide reference in introduction
    - docs/front-end-development.md -- added Gen-AI guide reference after live examples
    - docs/api-reference.md -- added Gen-AI guide reference after live examples
  - License Migration to BSL 1.1:
    - Migrate from AGPL 3 to Business Source License 1.1
      - Change Date: 2030-01-01 (automatic conversion to AGPL v3.0)
      - Commercial licensing contact: team@jpulse.net
    - docs/license.md: Comprehensive licensing documentation
      - BSL 1.1 explanation and use cases
      - Free vs. commercial license guidance
      - FAQ section covering common scenarios
      - License conversion details and future dual licensing path
    - Source File Headers: Standardized license format across all source files
      - Format: "BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net"
      - Updated 182 files with new header format
    - package.json: Updated package metadata
      - Package name: @jpulse-net/jpulse-framework
      - Repository: github.com/jpulse-net/jpulse-framework
      - License: BSL-1.1
    - README.md: Streamlined licensing section
      - Quick reference for development vs. production use
      - Link to detailed docs/license.md documentation
  - Repository Migration:
    - Migrated from github.com/peterthoeny/jpulse-framework to github.com/jpulse-net/jpulse-framework
    - All branches pushed (main, vuejs-trial)
    - All 52 version tags migrated
    - Old repository archived
    - Updated all repository references in codebase (bin scripts, templates, tests)
    - Documentation:
      - docs/dev/working/W-052-business-dual-licensing-agpl-and-commercial.md: Added BSL 1.1 strategy section with rationale
      - Updated all documentation with new repository URLs

### W-076, v1.0.1, v1.0.2, v1.0.3: framework: comparison document
- status: ✅ DONE
- type: Feature
- patch release with deliverables:
  - bin/configure.js -- automated .npmrc creation for GitHub Packages
  - README.md -- updated to v1.0.3 with framework comparison reference
  - docs/README.md -- updated to v1.0.3, added framework-comparison.md to documentation guide
  - docs/framework-comparison.md -- NEW comprehensive comparison guide (562 lines)
  - docs/deployment.md -- updated troubleshooting section for new update process
  - docs/CHANGELOG.md -- complete v1.0.3 entry
  - tried and retracted failed attempt to simplify jPulse Framework upgrade

### W-082: jpulse.net: site content creation
- status: ❌ CANCELED
- type: Feature
- objectives: build trust, demonstrate value, drive commercial license inquiries
- audience:
  - primary: enterprise decision-makers (C-level executives, IT directors, project managers)
  - secondary: developers evaluating frameworks
- this is handled by work item T-001 in the jpulse.net project

### W-083, v1.0.4: minor v1.0 enhancements & bug fixes
- status: ✅ DONE
- type: Feature
- objectives: stabilize release
- deliverables:
  - bin/jpulse-update.js: Fixed .jpulse-ignore support - docs publishing now respects ignore patterns
  - jPulse.UI.successDialog(): Added new success dialog with green header styling
  - jPulse.UI.alertDialog() & infoDialog(): Enhanced to detect 2nd param type (string=title, object=options)
  - Dialog refactoring: Unified alertDialog/infoDialog/successDialog to use confirmDialog() internally
  - docs/jpulse-ui-reference.md: Complete jPulse.UI.* widget reference documentation
  - docs/front-end-development.md: Updated with abbreviated widget list and links to UI reference
  - docs/security-and-auth.md: Comprehensive security and authentication documentation
  - Security doc links: Added to README.md, getting-started.md, api-reference.md, deployment.md
  - W-084 work item: Created with security hardening to-dos
  - webapp/static/apple-touch-icon.png: Updated from webapp/static/images/jpulse-logo/apple-touch-icon.png
  - webapp/view/jpulse-examples/ui-widgets.shtml: Updated with new dialog signatures and successDialog examples
  - webapp/translations/en.conf & de.conf: Added successDialog i18n translations

### W-085, v1.1.0: tools: npx strategy; make bump-version.js script available to site developers
- status: ✅ DONE
- type: Feature
- objective: more intuitive tools env for site developers
- prerequisites:
  - docs/dev/working/W-085-npx-tools-strategy.md
- consolidated command for jpulse-framework development:
  - npx jpulse bump-version 1.1.0
- consolidated commands for site development:
  - npx jpulse configure       - configure jPulse site (setup/update configuration)
  - npx jpulse update          - update framework to latest and sync files (or specify version: @jpulse-net/jpulse-framework@version)
  - npx jpulse bump-version    - bump version numbers across site files
  - npx jpulse setup           - setup system dependencies (run as root)
  - npx jpulse mongodb-setup   - setup MongoDB database
  - npx jpulse validate        - validate deployment installation
- deliverables:
  - bin/bump-version.js -- modified to use .conf file, context-aware config discovery (framework vs site)
  - bin/bump-version.conf -- NEW configuration file for framework version bumping
  - bin/jpulse-update.js -- enhanced to accept optional version argument, automatically updates package before syncing
  - bin/jpulse-framework.js -- unified CLI dispatcher with context-aware help, argument passthrough
  - bin/configure.js -- updated to copy bump-version.conf.tmpl during site setup, updated command references
  - package.json -- updated bin entry to single "jpulse" command, removed separate jpulse-* entries
  - templates/webapp/bump-version.conf.tmpl -- NEW template for site-specific version bumping configuration
  - docs/installation.md -- updated with new single-command update workflow
  - docs/getting-started.md -- updated framework updates section with new command syntax
  - docs/deployment.md -- simplified troubleshooting with new update command
  - docs/dev/work-items.md -- updated command descriptions
  - docs/dev/working/W-085-npx-tools-strategy.md -- complete strategy documentation with implementation details
  - README.md -- updated all command references to `npx jpulse <command>`
  - docs/README.md -- updated Quick Start and command references
  - templates/README.md -- updated command references
  - templates/deploy/README.md -- updated command references
  - docs/genai-development.md -- updated command references
  - docs/dev/publishing.md -- updated command references
  - docs/dev/README.md -- updated CLI tools description

### W-086, v1.1.1: gen-ai: review developer facing doc and AI agent facing doc
- status: ✅ DONE
- type: Feature
- objective: more effective vibe coding
- prerequisites:
  - docs/genai-development.md
  - docs/genai-instructions.md
  - docs/dev/working/W-086-genai-docs-review.md
- to-do:
  - review and enhance both docs
- deliverables:
  - docs/genai-instructions.md -- Streamlined for AI consumption (reduced from 714 to 563 lines, ~21% reduction)
    - Removed redundant "Common Mistakes to Avoid" section (80 lines)
    - Streamlined Chain of Thought, No Guessing, and Gen-AI History Log directives
    - Clarified "Client-Side Heavy" applies to application pages, not content pages
    - Added "Creating Reusable Templates" section with .shtml vs .tmpl guidance
    - Added "When You DON'T Need Controllers/Models" decision framework
    - Enhanced "Creating a View Template" with template include patterns
    - Streamlined "Response Guidelines" (removed verbose examples)
    - Condensed "Framework Philosophy" section
  - docs/genai-development.md -- Added educational content for new users
    - Added "Best Practices for Effective AI Assistance" section
    - Explains Chain of Thought reasoning, avoiding hallucination, maintaining development logs
    - Provides context for new users while keeping AI-facing doc concise
  - docs/CHANGELOG.md -- v1.1.1 entry documenting improvements
  - Fixed markdown rendering issues (escaped HTML tags in documentation)

### W-088, v1.1.3: controller: extract Handlebars processing to dedicated controller
- status: ✅ DONE
- type: Feature
- objectives: better separation of concerns, reusable template processing API
- depends on: none
- to-do:
  - create webapp/controller/handlebar.js with dedicated Handlebars processing logic
  - extract all template processing from view.js to handlebar.js
  - provide clean API: HandlebarController.expandHandlebars(req, template, context, depth)
  - maintain backward compatibility with existing view controller behavior
  - add standalone processing method for non-view contexts
  - add POST /api/1/handlebar/expand endpoint for views
  - enable future "Try Your Own Handlebars" demo functionality
  - fix existing tests for new controller
  - context filtering based on authentication status
  - config change broadcast integration for cache invalidation
  - document HandlebarController usage (in code comments and W-087 doc)
- deliverables:
  - webapp/controller/handlebar.js -- NEW handlebar processing controller
  - webapp/controller/view.js -- remove handlebar processing code
  - webapp/routes.js -- add /api/1/handlebar/expand, add /api/1/config/_default
  - webapp/tests/unit/* -- update unit tests for handlebar controller
  - webapp/translations/*.conf -- add controller.handlebar translation
  - webapp/utils/bootstrap.js -- add ConfigController and HandlebarController initialize
	- webapp/utils/i18n.js -- rename processI18nHandlebars() to expandI18nHandlebars()
	- webapp/utils/redis-manager.js -- single-instance mode: call local callbacks directly
	- webapp/view/admin/config.shtml -- fix API endpoint to /api/1/config/_default

### W-087, v1.1.4: email: strategy for sending email from jPulse Framework
- status: ✅ DONE
- type: Feature
- objective: provide standardized email sending capability for jPulse Framework and site applications
- prerequisites:
  - docs/dev/working/W-087-send-email-strategy.md
  - W-088, v1.1.2: controller: extract Handlebars processing to dedicated controller
- deliverables:
  - webapp/controller/email.js -- EmailController with utility methods (sendEmail, sendEmailFromTemplate, sendAdminNotification) and API endpoint (apiSend)
  - webapp/routes.js -- added POST /api/1/email/send route with authentication middleware
  - webapp/utils/bootstrap.js -- EmailController initialization during app startup
  - webapp/controller/health.js -- email health status integration (instance-specific) and sanitization for non-admin users
  - webapp/model/config.js -- updated to preserve empty strings for smtpUser and smtpPass fields
  - webapp/view/admin/config.shtml -- test email button with form validation and dirty detection improvements
  - webapp/translations/en.conf -- i18n translations for email controller and admin UI
  - webapp/translations/de.conf -- German translations for email controller and admin UI
  - webapp/tests/unit/controller/email-controller.test.js -- unit tests for EmailController methods
  - webapp/tests/integration/email-api.test.js -- integration tests for email API structure
  - docs/sending-email.md -- document how to send email
  - docs/api-reference.md -- document new email endpoint

### W-089, v1.1.5: log: log proper external IP address when jPulse is behind a reverse proxy
- status: ✅ DONE
- type: Bug Fix
- objective: log proper IP address behind a reverse proxy
- deliverables:
  - webapp/utils/common.js -- IP address based on sequence: x-forwarded-for, x-real-ip, request ip

### W-090, v1.1.6: view: make site nav menu open/close delay configurable; restructure view.pageDecoration
- status: ✅ DONE
- type: Feature
- objective: better site overrides for site nav menu
- to-do:
  - restructure app.conf's view.pageDecoration (breaking change)
    - siteNavigation
    - breadcrumbs
    - sidebar (placeholder for now)
  - fix all code to reflect new structure
- deliverables:
  - webapp/app.conf -- modified view.pageDecoration structure with siteNavigation, breadcrumbs, sidebar
  - webapp/view/jpulse-footer.tmpl
    - updated to use siteNavigation.enabled and breadcrumbs.enabled
    - passes delay configs to navigation.init()
  - webapp/view/jpulse-common.js
    - updated navigation.init() to accept delay configs
    - implemented openDelay with cancel-on-mouse-leave
    - replaced all hardcoded delays with config values
  - webapp/tests/unit/utils/jpulse-ui-navigation.test.js -- updated test mocks to use new pageDecoration structure

### W-091, v1.1.7: deploy: bug fixes for site deployments
- status: ✅ DONE
- type: Bug Fix
- objective: better getting started experience
- issues:
  - Bug 1: updated docs to use `npm install --registry` flag (KISS solution)
  - Bug 2: fixed log directory symlink to use `config.LOG_DIR` during configure
  - Bug 3: MongoDB setup now auto-loads `.env` file
  - Bug 4: MongoDB setup handles authentication when already enabled
  - Bug 5: added `npx jpulse mongodb-setup` step to getting started docs
  - Bug 6: auto-set Let's Encrypt SSL certificate paths when selected
  - Bug 7: nginx config uses site-specific upstream name from `JPULSE_SITE_ID`
- deliverables:
  - `bin/configure.js` - log symlink fix, upstream name calculation
  - `bin/config-registry.js` - Let's Encrypt auto-configuration
  - `bin/mongodb-setup.sh` - auto-load .env, handle existing auth
  - `templates/deploy/nginx.prod.conf` - use %UPSTREAM_NAME% variable
  - `docs/installation.md` - updated npm install command
  - `docs/getting-started.md` - added mongodb-setup step, updated npm install
  - `docs/deployment.md` - updated npm install command
  - `README.md` - updated npm install command
  - `docs/README.md` - updated npm install command
  - `webapp/tests/unit/config/deployment-validation.test.js` - updated test patterns
  - `webapp/tests/integration/deployment-validation.test.js` - updated test patterns

### W-092, v1.1.8: deploy: add jpulse-install package for simplified installation
- status: ✅ DONE
- type: Feature
- objective: eliminate manual .npmrc creation with one-command installer
- prerequisites:
  - jpulse-install package at https://github.com/jpulse-net/jpulse-install
- deliverables:
  - created `jpulse-install` npm package (separate repo)
  - updated `docs/getting-started.md` - use `npx jpulse-install`
  - updated `docs/deployment.md` - use `npx jpulse-install`
  - updated `docs/installation.md` - show both methods (recommended + alternative)
  - updated `README.md` - use `npx jpulse-install` in quick start
  - updated `docs/README.md` - release highlights
  - updated `docs/CHANGELOG.md` - v1.1.8 entry
  - bug 2 Enhancement: Fixed log symlink to only create for file logging (not STDOUT)
  - bug 6: Fixed SSL paths computation in nginx config (generateDeploymentFiles)
  - bug 9: Fixed PORT value preservation in buildCompleteConfig
  - fix 8: Log directory default now uses site ID (`/var/log/${JPULSE_SITE_ID}`)
  - test fix: Updated test-cli.js to conditionally check for logs symlink
  - command rename: Renamed `npx jpulse install` → `npx jpulse setup` (breaking change for clarity)
  - updated all docs and code references from `install` to `setup`
  - fixed legacy content in publishing.md (removed "Once repository is public" note)

### W-093, v1.2.0: users: ability for admins to manage users
- status: ✅ DONE
- type: Feature
- objective: ability for admins to manage users
- fields to manage by admin and root roles only:
  - _id (read-only, MongoDB ObjectId)
  - uuid (read-only)
  - email
  - roles
  - status
  - profile fields (firstName, lastName, nickName)
  - preferences (language, theme)
- enhancements:
  - create separate webapp/view/admin/user-profile.shtml user profile page for admins with view/edit toggle
  - remove GET /api/1/user/profile and PUT /api/1/user/profile endpoints (breaking change)
  - add GET /api/1/user and GET /api/1/user/:id endpoints (renamed from getById to get)
  - add PUT /api/1/user and PUT /api/1/user/:id endpoints (renamed from updateById to update)
  - flexible user identification: supports ObjectId, username query param, or session user fallback
  - add validation to prevent removing last admin, self-removal of admin role, suspending last admin
  - add GET /api/1/user/enums endpoint for dynamic enum retrieval from schema
  - remove 'guest' from roles enum (not a real role, just a fallback label)
  - remove obsolete /api/1/auth/roles endpoint (replaced by enums API)
  - remove obsolete /api/1/auth/themes endpoint (replaced by enums API)
  - schema extension architecture for future plugin support (W-045)
- deliverables:
  - webapp/model/user.js -- added countAdmins() helper, schema extension infrastructure (baseSchema, extendSchema, getEnums, extractEnums), removed 'guest' from roles enum
  - webapp/controller/user.js -- added get() and update() methods with flexible user identification (ObjectId, username, session fallback), validation (last admin protection, self-removal prevention, suspend last admin protection), getEnums() for schema enums, updated to use appConfig.user.adminRoles
  - webapp/routes.js -- removed old /api/1/user/profile routes, added new /api/1/user and /api/1/user/:id routes, added /api/1/user/enums route, removed obsolete /api/1/auth/roles and /api/1/auth/themes routes, updated to use appConfig.user.adminRoles
  - webapp/view/admin/user-profile.shtml -- new user-profile page with User ID (_id) field, horizontal roles grid layout, dynamic status/roles/theme dropdowns from enums API, view/edit toggle mode
  - webapp/view/admin/users.shtml -- updated [Profile] button link to user-profile page using username parameter, dynamic role/status filters from enums API
  - webapp/view/user/profile.shtml -- updated to use new /api/1/user endpoint, dynamic theme dropdown from enums API
  - webapp/view/user/index.shtml -- updated to use new /api/1/user endpoint
  - webapp/translations/en.conf -- added i18n keys for admin user profile, simplified key names (removed "Successfully" suffix), removed obsolete auth.themes and auth.roles keys
  - webapp/translations/de.conf -- added same German translations, simplified key names, removed obsolete keys
  - webapp/utils/bootstrap.js -- added schema initialization step (Step 14)
  - webapp/controller/cache.js -- updated to use appConfig.user.adminRoles
  - webapp/controller/handlebar.js -- updated to use appConfig.user.adminRoles
  - webapp/controller/websocket.js -- updated to use appConfig.user.adminRoles
  - webapp/controller/health.js -- already using config with fallback
  - webapp/app.conf -- added user.adminRoles configuration, fixed typo in controller.health.requiredRoles.metrics
  - webapp/tests/unit/user/user-controller.test.js -- added minimal tests for getEnums(), get() with ObjectId/username/session fallback, update() validation (last admin, self-removal, suspend last admin)
  - docs/dev/working/W-014-W-045-mvc-site-plugins-architecture.md -- added schema extension architecture section

### W-094, v1.2.1: handlebars: list files, extract from files
- status: ✅ DONE
- type: Feature
- objective: generalize file operations in Handlebars to enable automated content generation (e.g., auto-populate card lists in index pages)
- working doc: docs/dev/working/W-094-handlebars-file-list-and-extract
- features:
  - `file.list` helper:
    - glob pattern matching (admin/*.shtml, multi-level patterns)
    - site override support via PathResolver.listFiles()
    - security (path traversal protection)
  - `file.extract` helper:
    - three extraction methods (HTML/block/line comment markers with order=N, regex patterns /pattern/flags
    - CSS selectors .class/#id with data-extract-order)
    - pattern parameter passing from file.list loops
  - sorting: sortBy="extract-order" and sortBy="filename" in #each blocks
  - PathResolver.listFiles(): centralized directory listing with site override logic (~50 lines)
  - HandlebarController: ~500 lines (_handleFileList, _handleFileExtract, extraction methods)
  - admin dashboard: automated card population using new helpers (webapp/view/admin/index.shtml)
  - extraction markers: added to 5 admin pages for testing (config, users, system-status, websocket-status, logs)
  - documentation: docs/handlebars.md (comprehensive syntax and examples), docs/template-reference.md (usage guide)
  - testing: 4 security tests (path traversal protection), manual verification on admin dashboard
  - technical debt: documented ViewController._buildViewRegistry() refactoring opportunity in W-014-W-045 architecture doc
- deliverables:
  - webapp/controller/handlebar.js -- file listing and extraction helpers
  - webapp/utils/path-resolver.js  -- listFiles method
  - webapp/view/admin/*.shtml -- extraction markers for testing
  - webapp/view/admin/index.shtml -- automated dashboard implementation
  - webapp/tests/unit/controller/file-list-extract.test.js -- security tests
  - docs/handlebars.md -- helper documentation
  - docs/template-reference.md -- usage examples
  - docs/dev/working/W-014-W-045-mvc-site-plugins-architecture.md -- technical debt notes
  - docs/dev/working/W-094-handlebars-file-list-and-extract.md -- deliverables section
  - docs/CHANGELOG.md -- v1.2.1 entry

### W-095, v1.2.2: handlebars: remove jsdom dependency
- status: ✅ DONE
- type: Feature
- objective: leaner project with less dependencies
- features:
  - CSS selector extraction now uses zero external dependencies (~50 lines of code vs 15MB jsdom package)
  - three-step approach: find opening tag, annotate HTML with nesting levels (:~0~, :~1~), match with backreference
  - handles nested tags correctly by tracking nesting depth
  - reduces production package size significantly (jsdom: ~15-20MB with 90+ sub-dependencies)
- deliverables:
  - webapp/controller/handlebar.js -- replaced jsdom with smart regex extraction using tag nesting level annotation
  - package.json -- moved jsdom from dependencies to devDependencies (only needed for client-side JS tests)

### W-096, v1.2.3: view: replace Unicode icons with svg images
- status: ✅ DONE
- type: Feature
- objective: more professional look
- deliverables:
  - webapp/view/jpulse-common.css
    - added vertical-align CSS for SVG icons in headings (h1-h6 svg)
    - define default white color for card icons (in preparation for dark & light themes)
  - webapp/view/admin/*.shtml
    - replaced <img> tags with inline SVG images
    - inline SVGs properly inherit color from .jp-icon-container (white on blue)
    - theme-ready: currentColor in SVGs responds to parent container color
  - site/webapp/view/hello*/*.shtml
    - replaced Unicode emoji icons with inline SVG images from lucide.dev
    - defined extract markers for use in dynamic Hello World Demos dashboard cards
    - SVG icons in page headers properly aligned using vertical-align CSS
  - site/webapp/view/hello/index.shtml
    - replaced hard-coded card grid with dynamic grid based on extract markers
  - webapp/tests/unit/site/hello-todo-structure.test.js
    - updated test to check for icon-agnostic page titles (works with emoji or SVG)
- technical notes:
  - SVG icons from lucide.dev
  - inline SVGs required for currentColor to work (external <img> SVGs don't inherit parent CSS color)
  - proper vertical alignment achieved with h1-h6 svg { vertical-align: middle; }
  - admin dashboard icons now theme-ready and professional looking

### W-097, v1.2.4: handebars: define and use reusable components
- status: ✅ DONE
- type: Feature
- objective: reusable components to reduce code duplication, such as with multiple inline SVG images
- working document:
  - docs/dev/working/W-097-handlebars-use-components.md
- deliverables:
  - webapp/controller/handlebar.js - Enhanced to support component definition and usage
    - Added `{{#component "name" param="default"}}...{{/component}}` syntax for definition
    - Added `{{components.componentName param="value"}}` syntax for usage
    - Implemented per-request transient component registry
    - Added circular reference detection with call stack tracking
    - Added `_convertComponentName()` for kebab-case to camelCase conversion
    - Implemented `_inline` framework parameter for JavaScript embedding
    - Added support for dot-notation namespaces (e.g., `jpIcons.configSvg`)
    - Enhanced `_parseHelperArgs()` to parse unquoted boolean values
  - webapp/view/components/svg-icons.tmpl - Created component library with 20+ SVG icons
    - Admin icons: config, logs, users, user, system-status, websocket
    - Example icons: layout, api, forms, handlebars, ui-widgets, override, traffic-cone, todo, refresh-dot, cable, placeholder
    - All using namespaced naming (e.g., `jpIcons.configSvg`)
    - Parameterized with fillColor, strokeColor, and size
  - webapp/view/jpulse-header.tmpl - Auto-includes svg-icons.tmpl for all pages
  - webapp/view/jpulse-navigation.tmpl - Migrated all icons to use `{{use.jpIcons.*}}` with `_inline=true`
  - webapp/view/jpulse-common.js - Enhanced `_renderIcon()` to handle inline SVG from components
  - webapp/view/jpulse-common.css - Added `.jp-breadcrumb-icon-svg` styling for breadcrumb icons
  - webapp/tests/unit/controller/handlebar-components.test.js - 20 comprehensive unit tests
    - Tests for component definition, usage, parameters, nesting, circular references
    - Tests for library imports, namespaces, `_inline` parameter, error handling
  - docs/handlebars.md - Complete documentation for reusable components
    - Component definition, usage, parameters, namespaces
    - Component libraries, nested components, error handling
    - `_inline` framework parameter documentation
  - docs/style-reference.md - Updated with component usage examples
  - docs/template-reference.md - Updated with component usage examples
  - Removed webapp/static/assets/admin/icons/*.svg - Migrated to components
  - Removed webapp/static/assets/jpulse-examples/icons/*.svg - Migrated to components
- technical notes:
  - Components use per-request transient registry for isolation
  - Maximum nesting depth: 16 levels (configurable)
  - Framework parameters (prefixed with `_`) filtered from component context
  - Circular reference detection prevents infinite loops
  - Error handling: server logs + HTML comments in dev, silent in production
  - Naming: kebab-case in definition, camelCase in usage (auto-converted)
  - Namespaces: Optional dot-notation for organization (e.g., `jpIcons.configSvg`)
  - `_inline=true` strips newlines for JavaScript string embedding

### W-098, v1.2.5: view: site navigation override with append mode and direct mutation
- status: ✅ DONE
- type: Feature
- objective: ability to override and use the jPulse Framework site navigation using append mode and direct mutation
- working document:
  - docs/dev/working/W-098-override-site-navigation.md
- deliverables:
  - webapp/controller/view.js -- implemented append mode for .js and .css files
    - collectAllFiles() to gather framework + site + (future) plugin files
    - concatenate with newline separator for .js and .css requests
    - removed .js.tmpl fallback (breaking change for cleaner pattern)
    - maintained .css.tmpl fallback for W-047 backward compatibility
  - webapp/utils/path-resolver.js -- added collectAllFiles() method
    - returns array of all matching files in load order (framework, site, plugins)
    - supports W-098 append mode strategy
  - webapp/view/jpulse-navigation.js -- renamed from .tmpl, restructured with unified format
    - `window.jPulseNavigation = { site: {...}, tabs: {...} }`
    - framework defines structure, sites extend via direct mutation
    - includes SVG icon components via `{{file.include}}`
  - webapp/view/jpulse-header.tmpl -- simplified navigation loading
    - single `<script>` tag for jpulse-navigation.js
    - removed separate site-common.js/css includes (now append mode)
    - includes svg-icons.tmpl for page content
  - webapp/view/jpulse-footer.tmpl -- simplified navigation initialization
    - removed deepMerge logic (no longer needed)
    - direct references to window.jPulseNavigation.site and .tabs
  - webapp/view/jpulse-common.js -- removed deepMerge utility
    - no longer needed with direct mutation pattern
  - webapp/view/components/svg-icons.tmpl -- converted to Handlebars comments
    - changed file header/footer from `<!-- -->` to `{{!-- --}}`
    - prevents JavaScript syntax errors when included in .js files
    - HTML comments inside SVG markup preserved
  - webapp/controller/handlebar.js -- implemented Handlebars comment stripping
    - removes `{{!-- --}}` comments at start of _expandHandlebars
    - supports single-line and multi-line comments
    - enables svg-icons.tmpl to work in both HTML and JS contexts
  - webapp/routes.js -- removed redundant site-common route
    - `/\/jpulse-.*\.(js|css)$/` pattern covers all append mode files
  - site/webapp/view/jpulse-navigation.js.tmpl -- direct mutation pattern example
    - shows how to add, modify, and delete navigation sections
    - uses `window.jPulseNavigation.site.foo = {...}` pattern
    - deletion marker: `window.jPulseNavigation.site.foo = null`
  - site/webapp/view/jpulse-common.js.tmpl -- append mode convention documented
    - updated header to explain append mode pattern
    - EOF comment updated to jpulse-common.js.tmpl
  - site/webapp/view/jpulse-common.css.tmpl -- append mode convention documented
    - updated header to explain append mode pattern
    - EOF comment updated to jpulse-common.css.tmpl
  - docs/site-navigation.md -- comprehensive guide for direct mutation pattern
    - explains append mode convention (.js/.css append, .shtml replace)
    - shows how to add, modify, delete navigation sections
    - includes examples and troubleshooting
    - removed .js.tmpl and i18n references
  - docs/template-reference.md -- updated navigation pattern documentation
    - site-navigation.js → jpulse-navigation.js
  - docs/genai-instructions.md -- updated all site-common references
    - site-common.css → jpulse-common.css with append mode notes
    - site-common.js → jpulse-common.js with append mode notes
  - docs/genai-development.md -- updated references
  - docs/getting-started.md -- updated references
  - docs/CHANGELOG.md -- updated with historical context
  - site/README.md -- updated all references
  - site/webapp/view/hello/site-development.shtml -- updated examples
  - bin/configure.js -- updated file paths for jpulse-common templates
  - webapp/tests/integration/w047-site-files.test.js -- updated for append mode
    - site-common.* → jpulse-common.* expectations
    - route pattern check updated to general `/\/jpulse-.*\.(js|css)$/`
    - test descriptions mention "W-098 append mode"
  - webapp/tests/integration/cache-api.test.js -- deleted empty stub

### W-099, v1.2.6: deploy: critical bug fixes for site installation and W-098 navigation
- status: ✅ DONE
- type: Bug Fix
- objective: fix critical bugs discovered after v1.2.5 deployment affecting site installation and navigation deletion markers
- issues:
  - bug 1: site/webapp/model/helloTodo.js missing in initial site install
  - bug 2: site/webapp/controller/*.js missing in initial site install
  - bug 3: some site/webapp/view/hello*/* missing in initial site install
  - bug 4: webapp/view/jpulse-common.js crashes in several places when a site navigation property is set to null (as documented)
  - bug 5: webapp/view/user/index.shtml has runtime JavScript error calling checkAdminAccess()
- deliverables:
  - bin/configure.js
    - enhanced copySiteTemplates() function with recursive directory copying
    - copy all site/webapp/controller/hello*.js files (5 files)
    - copy all site/webapp/model/hello*.js files (1 file)
    - recursively copy all site/webapp/view/hello*/ directories with subdirectories
    - added copyDirRecursive() helper function for deep directory copying
  - webapp/view/jpulse-common.js
    - added _sanitizeNavStructure() method to remove null deletion markers
    - navigation sanitization at init time instead of scattered null checks
    - prevents "Cannot read properties of null" errors throughout navigation code
    - cleaner, more maintainable approach (single point of sanitization)
  - webapp/view/user/index.shtml
    - removed obsolete checkAdminAccess() function call
    - fixed JavaScript console error on user dashboard page
  - webapp/tests/unit/utils/jpulse-ui-navigation.test.js
    - fixed "should refresh navigation" test after sanitization refactor
    - test now modifies _navConfig instead of appConfig

### W-045, v1.3.0: architecture: add plugin infrastructure with auto-discovery
- status: ✅ DONE
- type: Feature
- objective: extensible framework that is easy to understand & easy to maintain
- author: 3rd party developers & jPulse team
- audience: site administrator
- working doc: docs/dev/working/W-014-W-045-mvc-site-plugins-architecture.md
- strategy: drop a plugin in specific directory, with auto discovery
- provide infrastructure for plugins to:
  - add models, controllers, views
  - replace models, controllers, views
  - augment user model & controller
  - augment auth model & controller
  - add themes
- create a hello-world demo plugin, ship with jpulse-framework
- deliverables:
  - Core Plugin Infrastructure:
    * PluginManager for discovery, validation, dependency resolution, lifecycle management
    * Auto-discovery from plugins/ directory with plugin.json metadata
    * PathResolver integration for site > plugins > framework priority
    * Symlink management for static assets and documentation
    * Bootstrap sequence integration (Step 5)
  - Plugin Configuration Management:
    * PluginModel with JSON schema validation (MongoDB storage)
    * Dynamic form generation from schema in admin UI
    * Per-plugin config with types, validation, defaults, enums
    * Admin UI: /admin/plugins.shtml (list/enable/disable), /admin/plugin-config.shtml (configure)
  - Plugin Components:
    * Auto-discovery: controllers, models, views, static assets, documentation
    * SiteControllerRegistry integration for plugin API endpoints
    * ViewController integration for plugin views
    * Handlebars file.list/file.include helpers support plugins
    * W-098 append mode for jpulse-common.js/css, jpulse-navigation.js
  - hello-world Demo Plugin (ships with framework):
    * Demonstrates MVC pattern, configuration schema, navigation integration
    * Controller: /api/1/hello-plugin/* endpoints
    * Model: plugin data & statistics
    * Views: /hello-plugin/ (tutorial), /jpulse-plugins/hello-world.shtml (overview)
    * Documentation: auto-symlinked to /jpulse-docs/installed-plugins/hello-world/
    * Full example with all plugin features
  - Developer Documentation (docs/plugins/):
    * Plugin Architecture Overview (plugin-architecture.md)
    * Creating Plugins Guide (creating-plugins.md)
    * Managing Plugins Guide (managing-plugins.md)
    * Publishing Plugins Guide (publishing-plugins.md)
    * Plugin API Reference (plugin-api-reference.md)
    * Technical Debt Tracking (W-045-plugins-tech-debt.md - 19 items)

### W-100, v1.3.1: architecture: critical bug fixes for W-045 add plugin infrastructure
- status: ✅ DONE
- type: Bug Fix
- objective: fix critical bugs discovered after v1.3.0 deployment affecting npm package, CI/CD, and production sites
- issues:
  - bug 1: npm package missing plugins/hello-world/ directory - package incomplete
  - bug 2: GitHub Actions CI tests crash with "Database connection not available"
  - bug 3: JavaScript syntax errors in production when i18n strings contain apostrophes (Don't, can't, won't)
- deliverables:
  - package.json:
    - added explicit "files" field to properly include plugins/hello-world/, templates/, and other essential directories
  - webapp/model/plugin.js:
    - added isTest parameter to ensureIndexes() to gracefully handle missing database in test environments
  - webapp/utils/bootstrap.js:
    - pass isTest flag to PluginModel.ensureIndexes() for proper test handling
  - 15 view files (admin, user, jpulse-docs, jpulse-examples, jpulse-plugins):
    - converted 160+ instances of `{{i18n.*}}` to backticks for JavaScript safety
  - webapp/translations/en.conf:
    - reverted resetSuccess to natural English with apostrophe ("Don't" instead of "Do not")
    - established `%TOKEN%` pattern for dynamic error messages
  - docs/template-reference.md:
    - added comprehensive "Using i18n in JavaScript Context" section with best practices
- test results: 926 passed, 0 failed (942 total with 16 skipped)
- files modified: 19 files total

### W-101, v1.3.2: architecture: additional bug fixes for W-045 add plugin infrastructure
- status: ✅ DONE
- type: Bug Fix
- objective: fix four critical bugs discovered after v1.3.1 deployment affecting plugin updates, configuration UX, documentation access, and admin UI state
- issues:
  - bug 1: jpulse-update.js missing plugin sync - production sites had stale plugins after framework update
  - bug 2: confusing "enabled" config field - users expected it to enable/disable plugin but only saved to database
  - bug 3: wrong documentation symlink location - hardcoded to docs/ instead of context-aware (framework vs site)
  - bug 4: stale plugin state in admin UI - enable/disable didn't update UI until app restart
- deliverables:
  - bin/jpulse-update.js:
    - added plugin sync section to copy plugins/hello-world/ from framework package to site
  - plugins/hello-world/plugin.json:
    - removed confusing "enabled" config field that created false expectations
  - docs/plugins/creating-plugins.md:
    - removed "enabled" field from example config schema
  - webapp/utils/symlink-manager.js:
    - added detectContext() method to distinguish framework repo vs site installation
    - updated createPluginDocsSymlink() to use context-aware paths
    - updated removePluginDocsSymlink() to use context-aware paths
  - webapp/utils/plugin-manager.js:
    - fixed getAllPlugins() to merge registry state with discovered metadata (shows correct enabled/disabled status)
  - docs/plugins/plugin-architecture.md:
    - documented context-aware symlink behavior
  - docs/plugins/plugin-api-reference.md:
    - clarified framework vs site documentation paths
  - docs/plugins/managing-plugins.md:
    - updated troubleshooting with context-dependent paths
- test results: 926 passed, 0 failed (942 total with 16 skipped)
- files modified: 8 files (4 code, 4 documentation)

### W-102, v1.3.3: handlebars: replace extract:start & end with component handlebar
- status: ✅ DONE
- type: Feature
- objective: more intuitive framework
- background: the current way of declaring a card with extract:start and extract:end section, and auto-populating a dashboard with `{{file.extract this}}` works, but is not intuitive
- solution:
  - unified component system - components available as context variables (`{{components.*}}`)
  - new helper: `{{file.includeComponents "glob" component="namespace.*" sortBy="method"}}`
  - access pattern: `{{components.namespace.name}}` or `{{#each components.namespace}} {{this}} {{/each}}`
  - sorting: component-order (default), plugin-order (explicit), filename
  - pattern filtering: component="adminCards.*" to load specific namespace
- old syntax:
    ```
    <div style="display: none;">
        <!-- extract:start order=10 -->
        <a href="/admin/config.shtml" class="jp-card-dashboard jp-icon-btn">
            <div class="jp-icon-container">{{use.jpIcons.configSvg size="64"}}</div>
            <h3 class="jp-card-title">{{i18n.view.admin.index.siteConfig}}</h3>
            <p class="jp-card-description">{{i18n.view.admin.index.siteConfigDesc}}</p>
        </a>
        <!-- extract:end -->
    </div>
    {{#each file.list "admin/*.shtml" sortBy="extract-order"}}
        {{file.extract this}}
    {{/each}}
    ```
- new syntax:
    ```
    {{#component "adminCards.config" order=10}}
        {{!-- This card is automatically included in the admin dashboard --}}
        <a href="/admin/config.shtml" class="jp-card-dashboard jp-icon-btn">
            <div class="jp-icon-container">{{components.jpIcons.configSvg size="64"}}</div>
            <h3 class="jp-card-title">{{i18n.view.admin.index.siteConfig}}</h3>
            <p class="jp-card-description">{{i18n.view.admin.index.siteConfigDesc}}</p>
        </a>
    {{/component}}
    {{file.includeComponents "admin/*.shtml" component="adminCards.*"}}
    <div class="jp-dashboard-grid">
        {{#each components.adminCards}}
            {{this}}
        {{/each}}
    </div>
    ```
- benefits:
  - "don't make me think" - components accessed like `{{user.*}}` or `{{config.*}}`
  - no more `<div style="display: none;">` wrappers
  - clean Handlebars syntax with proper highlighting
  - pattern filtering for memory efficiency
  - explicit sorting control (plugin-order, component-order, filename)
- deliverables:
  - webapp/controller/handlebar.js:
    - added _handleFileIncludeComponents() function to register components from files
    - added _handleComponentCall() function with error handling, circular reference detection, _inline parameter
    - added helper functions: _parseComponentBlocks(), _matchesComponentPattern(), _sortComponents(), _extractPluginName(), _getPluginLoadOrder(), _setNestedProperty()
    - removed deprecated extract code: _handleFileExtract(), _extractOrderFromMarkers(), _extractFromRegex(), _extractFromCSSSelector() (~210 lines)
    - simplified _handleBlockEach() to remove extract-order sorting logic
    - fixed component expansion to always use _handleComponentCall() for `{{components.*}}`
    - added immediate context registration in _handleComponentDefinition()
  - webapp/view/admin/*.shtml (8 files):
    - migrated from extract:start/end to `{{#component}}` syntax
    - updated admin/index.shtml dashboard to use file.includeComponents
  - webapp/view/jpulse-examples/*.shtml (5 files):
    - migrated from extract:start/end to `{{#component}}` syntax
    - updated jpulse-examples/index.shtml dashboard to use file.includeComponents
  - webapp/view/jpulse-plugins/index.shtml:
    - updated to use file.includeComponents with sortBy="plugin-order"
  - site/webapp/view/hello/*.shtml (7 files):
    - migrated site hello demo views to `{{#component}}` syntax
    - updated site/webapp/view/hello/index.shtml dashboard
  - plugins/hello-world/webapp/view/hello-plugin/index.shtml:
    - migrated plugin view to `{{#component}}` syntax
  - docs/handlebars.md:
    - removed "File Extraction" section (~75 lines)
    - added "Include Components from Files" section with complete documentation
  - docs/template-reference.md:
    - replaced "File Listing and Extraction" with "File Listing and Component Inclusion"
    - updated caching section references
  - docs/plugins/creating-plugins.md:
    - updated plugin dashboard card example to use `{{#component}}` syntax
  - docs/genai-instructions.md:
    - added comprehensive plugin system documentation throughout
    - updated directory layout, file resolution priority, CSS/JS layers
    - added plugin development guidelines and reference implementations

### W-103, v1.3.4, 2025-12-02: handlebars: custom variables with `{{let}}`, `{{#let}}`, and `{{#with}}`
- status: ✅ DONE
- type: Feature
- objective: enable template authors to define custom variables safely without polluting the main context
- working document: docs/dev/working/W-103-handlebars-let-with-variables.md
- features:
  - define custom variables in `vars` namespace
  - inline: `{{let key="value"}}` persists in template scope
  - block-scoped: `{{#let key="value"}}...{{/let}}` for isolated scope
  - Access: `{{vars.key}}`
  - context switching: `{{#with object}}` for cleaner nested access
- examples:
  - variables in template scope:
    ```
    {{let key1="val1" key2=123 key3=true custom.namespace.key="custom"}}
    key1: {{vars.key1}}, key2: {{vars.key2}}, key3: {{vars.key3}}, custom.namespace.key: {{vars.custom.namespace.key}}
    ```
  - variables in block scope:
    ```
    {{!-- vars.greeting and vars.name not available here --}}
    {{#let greeting="Hello" name="World"}}
      <p>{{vars.greeting}}, {{vars.name}}!</p>
    {{/let}}
    {{!-- vars.greeting and vars.name not available here --}}
    ```
  - context switching in block scope:
    ```
    {{#with user}}
      <p>Hi {{firstName}} {{lastName}}!</p>
    {{/with}}
    ```
- deliverables:
  - webapp/controller/handlebar.js
    - `{{let}}` inline helper, `{{#let}}` block helper, `{{#with}}` context switching
  - webapp/tests/unit/controller/handlebar-variables.test.js
    - 33 comprehensive unit tests
  - webapp/view/jpulse-examples/handlebars.shtml
    - live examples with source code
  - docs/handlebars.md
    - complete custom variables documentation
  - docs/template-reference.md
    - custom variables section and examples
  - docs/front-end-development.md
    - client-side template expansion with custom variables

### W-104, v1.3.5, 2025-12-03: markdown: handle dynamic content tokens
- status: ✅ DONE
- type: Feature
- objective: ability to add dynamic content into markdown, such as a table of the installed plugins
- prerequisites:
  - docs/dev/working/W-045-plugins-tech-debt.md:
    - W-045-TD-13: Auto-Generate Installed Plugins Index
- statement of work:
  - the initial idea to recreate the docs/installed-plugins/README.md markdown document when a plugin is installed/removed is too complex
  - a token that handles content dynamically at page view time is much more flexible
  - for security, the list of functions that can be called is limited to registered generators
  - dynamic content is processed AFTER cache retrieval, ensuring fresh data while maintaining cache benefits
  - tokens enclosed in backticks are not expanded - this is done so that it is possible to document this feature in markdown!
- syntax:
  - `%DYNAMIC{ content-name key="value" }%`
  - content-name: kebab-case identifier, such as plugins-list-table
  - parameters: optional key="value" pairs
  - values: automatically coerced to number/boolean when possible
- examples:
  - `%DYNAMIC{plugins-list-table}%` -- return markdown table of installed plugins
  - `%DYNAMIC{plugins-list-table status="enabled" limit="10"}%` -- only enabled ones, max 10
  - `%DYNAMIC{plugins-count status="enabled"}%` -- count of enabled plugins
  - `%DYNAMIC{user-stats period="30d" type="active"}%` -- user stats over 30 days
  - `%DYNAMIC{logs-list-table columns="date, username, action, type" limit="50"}%` -- recent logs
- implementation approach:
  - add `_processDynamicContent()` method to MarkdownController
  - process tokens after cache retrieval (dynamic content always fresh)
  - parse token syntax into name and parameters
  - call registered generator functions with parsed params
  - handle errors gracefully (show error message in markdown)
- new methods:
  - MarkdownController._parseDynamicToken(token) - parse name and params
  - MarkdownController._processDynamicContent(content, req) - async token processor
  - MarkdownController.DYNAMIC_CONTENT_REGISTRY - registry object (security whitelist)
  - MarkdownController._generatePluginsTable(params) - markdown table generator
  - MarkdownController._generatePluginsList(params) - markdown list generator
  - MarkdownController._generateGeneratorList() - list all available generators
- generators implemented:
  - plugins-list-table: table format with columns: Plugin, Version, Status, Description
  - plugins-list: bullet list format with icons
  - plugins-count: simple count (supports status filter)
  - dynamic-generator-list: self-documenting list of all generators
- testing considerations:
  - verify token parsing with/without parameters
  - test unknown generator names (error handling)
  - test parameter type coercion (string, number, boolean)
  - verify cache still works (process after cache retrieval)
  - test error scenarios (syntax errors, generator exceptions)
  - unit tests added: 20 tests in markdown.test.js
- usage in docs:
  - update docs/installed-plugins/README.md to use `%DYNAMIC{plugins-list-table}%`
- deliverables:
  - webapp/controller/markdown.js
    - added DYNAMIC_CONTENT_REGISTRY with generator metadata
    - added _parseDynamicToken() method
    - added _processDynamicContent() async method
    - added _generatePluginsTable(), _generatePluginsList(), _generateGeneratorList()
    - modified _getMarkdownFile() to be async and call _processDynamicContent()
  - webapp/controller/view.js
    - added jPulse.UI.docs.init as SPA detection trigger
  - webapp/view/jpulse-common.js
    - added jPulse.UI.docs namespace with init(), getViewer(), convertFilesToPages()
    - moved convertMarkdownFilesToPages from jPulse.UI.navigation.helpers
  - webapp/view/jpulse-docs/index.shtml
    - refactored to use jPulse.UI.docs.init() API
  - webapp/tests/unit/utils/jpulse-ui-navigation.test.js
    - updated tests to use jPulse.UI.docs.convertFilesToPages()
  - webapp/tests/unit/controller/markdown.test.js
    - added 20 tests for dynamic content: token parsing, processing, registry
  - docs/installed-plugins/README.md
    - uses `%DYNAMIC{plugins-list-table}%`
  - docs/markdown-docs.md (NEW)
    - comprehensive documentation for markdown docs infrastructure
    - documents %DYNAMIC{}% tokens, syntax, generators
    - documents jPulse.UI.docs API for creating doc viewers
    - documents titleCaseFix configuration and overrides
    - documents symlink approach for accessible docs directories

### W-105, v1.3.6, 2025-12-03: plugins: add plugin hooks for authentication and user management
- status: ✅ DONE
- type: Feature
- objective: create the base infrastructure for auth plugins (OAuth2, LDAP, MFA)
- features:
  - HookManager utility for plugin hook registration and execution
  - Auto-registration: plugins declare hooks in static `hooks` object, PluginManager auto-registers
  - Hook naming: camelCase with Hook suffix (e.g., `authBeforeLoginHook`, `userAfterCreateHook`)
  - One format: `hookName: { handler?, priority? }` - all properties optional
  - Authentication hooks (13): authBeforeLoginHook, authGetProviderHook, authAfterPasswordValidationHook,
    authBeforeSessionCreateHook, authAfterLoginSuccessHook, authOnLoginFailureHook,
    authBeforeLogoutHook, authAfterLogoutHook, authRequireMfaHook, authOnMfaChallengeHook,
    authValidateMfaHook, authOnMfaSuccessHook, authOnMfaFailureHook
  - User lifecycle hooks (11): userBeforeSignupHook, userAfterSignupValidationHook, userBeforeCreateHook,
    userAfterCreateHook, userOnSignupCompleteHook, userBeforeSaveHook, userAfterSaveHook,
    userBeforeDeleteHook, userAfterDeleteHook, userMapExternalProfileHook, userSyncExternalProfileHook
  - Hook priority system for execution order control (lower = runs earlier, default 100)
  - Hook cancellation support (return false to cancel operation)
  - Dynamic content generators: plugins-hooks-list, plugins-hooks-list-table for auto-documentation
- deliverables:
  - webapp/utils/hook-manager.js (NEW, 405 lines):
    - Central hook registration and execution system
    - Methods: register, execute, executeWithCancel, executeFirst, unregister, hasHandlers
    - Methods: getRegisteredHooks, getAvailableHooks, getHooksByNamespace, isValidHook, getStats, clear
    - 24 hooks defined: 13 auth + 11 user lifecycle
  - webapp/utils/bootstrap.js:
    - Added HookManager initialization (Step 4.5, before PluginManager)
  - webapp/utils/plugin-manager.js:
    - Added registerPluginHooks() for auto-registration from Controller.hooks
    - Added _registerControllerHooks() for individual controller processing
    - Added unregisterPluginHooks() for plugin disable cleanup
  - webapp/controller/auth.js:
    - Added 8 hook calls: authBeforeLoginHook, authOnLoginFailureHook, authAfterPasswordValidationHook,
      authBeforeSessionCreateHook, authAfterLoginSuccessHook, authBeforeLogoutHook, authAfterLogoutHook
    - MFA challenge point ready for future MFA plugins
  - webapp/controller/user.js:
    - Added 5 hook calls: userBeforeSignupHook, userAfterSignupValidationHook, userBeforeCreateHook,
      userAfterCreateHook, userOnSignupCompleteHook (async fire-and-forget)
  - webapp/model/user.js:
    - Added 4 hook calls: userBeforeSaveHook, userAfterSaveHook (in create and updateById)
  - webapp/controller/markdown.js:
    - Added 3 dynamic content generators: plugins-hooks-list, plugins-hooks-list-table, plugins-hooks-count
  - webapp/translations/en.conf, de.conf:
    - Added mfaRequired translation key
  - webapp/tests/unit/utils/hook-manager.test.js (NEW, 313 lines):
    - 26 unit tests covering register, execute, executeWithCancel, executeFirst, unregister, etc.
  - webapp/tests/unit/controller/auth-controller.test.js:
    - Updated logout tests for async hooks, added HookManager.clear() in beforeEach
  - plugins/hello-world/webapp/controller/helloPlugin.js:
    - Added example hook usage: authAfterLoginSuccessHook, authBeforeSessionCreateHook
  - docs/plugins/plugin-hooks.md (NEW, 337 lines):
    - Comprehensive developer guide for using hooks
    - Quick start, declaration format, handler patterns
    - Common use cases: OAuth2, MFA, email confirmation, audit logging
  - docs/plugins/README.md, creating-plugins.md, plugin-api-reference.md, plugin-architecture.md:
    - Added links to plugin-hooks.md
  - docs/dev/working/W-105-plugins-add-hooks.md:
    - Working document with full implementation plan and analysis

### W-080, v1.3.7, 2025-12-04: controller: search API with cursor-based pagination
- status: ✅ DONE
- type: Feature
- objective: paged queries that do not miss or duplicate docs between calls
- reference: https://medium.com/swlh/mongodb-pagination-fast-consistent-ece2a97070f3
- working document: docs/dev/working/W-080-search-with-pagination-cursor.md
- enhancements:
  - cursor-based pagination as default (better performance, consistent results)
  - offset-based pagination as opt-in (when `offset` param present)
  - stateless cursor: Base64 encoded JSON with query, sort, limit, total, lastValues
  - sort always includes `_id` tiebreaker for unique ordering
  - total count cached in cursor (countDocuments only on first call)
  - `limit+1` fetch for hasMore detection
  - response includes `nextCursor` and `prevCursor` for navigation
  - parameters: `limit`, `offset`, `sort`, `cursor` (removed: `skip`, `page`)
  - `jPulse.UI.pagination` client-side helper for reusable pagination state/buttons
  - `/api/1/user/stats` endpoint for efficient aggregation-based user statistics
- deliverables:
  - webapp/utils/common.js (~200 lines added):
    - `paginatedSearch(collection, query, queryParams, options)` - PUBLIC main entry
    - `_paginatedOffsetSearch()` - private offset mode
    - `_paginatedCursorSearch()` - private cursor mode
    - `_encodePaginationCursor()` - private Base64 encode
    - `_decodePaginationCursor()` - private decode/validate
    - `_buildPaginationCursorRangeQuery()` - private $or range query with type conversion
    - `_normalizePaginationSort()` - private sort parser with _id tiebreaker
    - `_extractSortValues()` - private extract values for cursor
    - `_convertCursorValue()` - private Date/ObjectId type restoration
  - webapp/model/user.js:
    - updated `search()` to use `CommonUtils.paginatedSearch()`
    - `getMetrics()` - aggregation-based statistics (total, byStatus, byRole, admins, recentLogins)
  - webapp/model/log.js:
    - updated `search()` to use `CommonUtils.paginatedSearch()`
  - webapp/controller/user.js:
    - added `stats()` endpoint handler
  - webapp/routes.js:
    - added GET `/api/1/user/stats` route
  - webapp/view/jpulse-common.js:
    - added `jPulse.UI.pagination` helper (createState, resetState, updateState, formatRange, updateButtons, setupButtons)
  - webapp/view/admin/users.shtml:
    - cursor-based pagination with jPulse.UI.pagination helper
    - "Results per page" selector
    - efficient stats via /api/1/user/stats endpoint
  - webapp/view/admin/logs.shtml:
    - cursor-based pagination with jPulse.UI.pagination helper
    - "Results per page" selector
  - webapp/tests/unit/utils/common-pagination.test.js:
    - 37 unit tests for all pagination utilities
  - webapp/translations/en.conf, de.conf:
    - added pagination i18n strings (showingResults, resultsPerPage, etc.)
  - docs/api-reference.md:
    - documented cursor and offset pagination modes
    - documented user stats endpoint
  - docs/jpulse-ui-reference.md:
    - documented jPulse.UI.pagination helper

### W-106, v1.3.8, 2025-12-07: plugins: CLI management to install, enable, list plugins
- status: ✅ DONE
- type: Feature
- objective: Simple way to manage plugins via CLI
- working doc: docs/dev/working/W-106-plugin-cli-management.md
- features:
  - `npx jpulse plugin list/info` - List and inspect plugins
  - `npx jpulse plugin install <name>` - Install from npm (shorthand: auth-mfa → @jpulse-net/plugin-auth-mfa)
  - `npx jpulse plugin update [name]` - Update plugin(s)
  - `npx jpulse plugin enable/disable <name>` - Enable/disable plugins
  - `npx jpulse plugin remove <name>` - Remove plugins
  - `npx jpulse plugin publish <name>` - Publish to npm with version sync
  - Two-step install: npm fetch → sync to plugins/
  - Air-gapped/private registry support
  - Clone-within-clone development workflow
- deliverables:
  - bin/plugin-manager-cli.js:
    - NEW file (~1500 lines) implementing full CLI plugin management
    - Actions: list, info, install, update, remove, enable, disable, publish
    - Shorthand expansion: `auth-mfa` → `@jpulse-net/plugin-auth-mfa`
    - Two-step install process: npm fetch → sync to plugins/
    - Version sync between plugin.json and package.json on publish
    - Colored console output with tables for readable output
  - bin/jpulse-framework.js:
    - Added `plugin` command routing to plugin-manager-cli.js
  - docs/plugins/managing-plugins.md:
    - Updated with CLI command documentation
    - Added examples for all plugin actions
  - docs/plugins/publishing-plugins.md:
    - Updated with publish workflow and npm configuration
- estimated effort: ~34h (7 phases)

### W-107, v1.3.9, 2025-12-07: users: data-driven user profile extensions for plugins
- status: ✅ DONE
- type: Feature
- objective: enable plugins to extend user profile pages with data-driven cards
- working doc: docs/dev/working/W-107-user-profiles-data-driven.md
- features:
  - `UserModel.extendSchema()` accepts `_meta` with `adminCard`/`userCard` configuration
  - field-level display attributes: `visible`, `readOnly`, `displayAs`, `showIf`
  - action types: `setFields` (local form update), `navigate` (redirect), `handler` (custom)
  - `GET /api/1/user?includeSchema=1` returns schema extensions metadata
  - `GET /api/1/user/:id` falls back to username if not valid ObjectId
  - admin profile page renders plugin cards from `adminCard` config
  - user profile page renders plugin cards from `userCard` config
  - `jPulse.schemaHandlers` for custom action handlers
- deliverables:
  - webapp/model/user.js:
    - enhanced `extendSchema()` to store `_meta` with `adminCard`/`userCard`
    - added `getSchemaExtensionsMetadata()` method
  - webapp/controller/user.js:
    - added `?includeSchema=1` parameter to include schema metadata
    - added username fallback for `:id` parameter (not just ObjectId)
  - webapp/view/admin/user-profile.shtml:
    - added `renderPluginCards()` function for data-driven card rendering
    - action button handling with `setFields`, `navigate`, `handler` support
    - `showIf` condition evaluation
  - webapp/view/user/profile.shtml:
    - same plugin card rendering using `userCard` config
  - docs/api-reference.md:
    - documented `?includeSchema=1` and username fallback
  - docs/plugins/plugin-api-reference.md:
    - full schema extension format with `_meta`, actions, `showIf`

### W-109, v1.3.10, 2025-12-08: auth: multi-step login flow
- status: ✅ DONE
- type: Feature
- objective: Flexible, hook-based, multi-step authentication supporting MFA, email verification, OAuth2, LDAP, terms acceptance, and more
- working doc: docs/dev/working/W-109-auth-multi-step-login.md
- depends on: W-105 (plugin hooks), W-108 (auth-mfa)
- scenarios supported:
  - Simple login (no extra steps)
  - LDAP login (external identity)
  - OAuth2 login (redirect-based)
  - MFA required
  - Email verification (required or nag)
  - Password expired
  - Terms of service acceptance
  - Multi-tenant selection
  - Captcha + multiple steps combined
- features:
  - Single login endpoint: POST /api/1/auth/login with step-based flow
  - Server-controlled chain: completedSteps stored server-side only
  - Dynamic steps: plugins add steps via onAuthGetSteps hook
  - Non-blocking warnings: nag scenarios via onAuthGetWarnings hook
  - Phase 8 Hook Simplification: 24 hooks → 12 with onBucketAction naming
    - Auth hooks (7): onAuthBeforeLogin, onAuthBeforeSession, onAuthAfterLogin, onAuthFailure, onAuthGetSteps, onAuthValidateStep, onAuthGetWarnings
    - User hooks (5): onUserBeforeSave, onUserAfterSave, onUserBeforeDelete, onUserAfterDelete, onUserSyncProfile
  - MFA policy enforcement: auto-redirect to setup page when required
  - Login warnings display: sessionStorage-based cross-page warnings
- deliverables:
  - webapp/utils/hook-manager.js: 12 simplified hooks with onBucketAction naming
  - webapp/controller/auth.js: multi-step login flow with hook integration
  - webapp/controller/user.js: consolidated user hooks (6→2)
  - webapp/model/user.js: updated hook calls
  - webapp/view/auth/login.shtml: MFA policy redirect, warning storage
  - webapp/view/jpulse-common.js: login warning display
  - plugins/auth-mfa: updated to use new hook names
  - plugins/hello-world: updated to use new hook names
  - docs/plugins/plugin-hooks.md: complete rewrite with new hook names
  - docs/plugins/creating-plugins.md: added hooks section (Step 5)
  - docs/plugins/plugin-architecture.md: added hook registration in lifecycle
  - docs/api-reference.md: added plugin-added endpoints section
  - webapp/tests/unit/utils/hook-manager.test.js: updated for new hooks
  - 924 unit tests passing

### W-110, v1.3.11, 2025-12-08: view: jPulse.url.redirect with toast messages queue
- status: ✅ DONE
- type: Feature
- objective: generic mechanism for queuing toast messages to display after page redirect
- features:
  - `jPulse.url.redirect(url, options)` - redirect with optional delay and toast queue
    - options.delay: ms to wait before redirect (default: 0)
    - options.toasts: array of toast objects to show after redirect
  - `jPulse.url.isInternal(url)` - check if URL is same origin
  - `jpulse_toast_queue` sessionStorage key for cross-page toast messages
  - external URLs: clears toast queue (no orphaned messages)
  - toast API enhanced with link support: `{ toastType, message, link?, linkText?, duration? }`
  - error toasts default to 8 seconds (was 5 seconds)
  - plugin-defined toast styling (plugins specify toastType, not hard-coded in core)
- deliverables:
  - webapp/view/jpulse-common.js:
    - jPulse.url.redirect(url, options) method
    - jPulse.url.isInternal(url) method
    - jPulse.UI.toast.show() enhanced with link support
    - toast queue processing on page load
    - error toast default 8 seconds
  - webapp/view/auth/login.shtml:
    - uses jPulse.url.redirect() for login success
    - deferred success toast (no delay, shown on target page)
  - plugins/auth-mfa/webapp/controller/mfaAuth.js:
    - MFA warnings define toastType: 'error'
    - optional nag for "MFA optional" policy

### W-108, v1.0.0, 2025-12-08: plugins: auth-mfa plugin for MFA (multi-factor authentication)
- status: ✅ DONE
- type: Feature
- objective: enterprise security via multi-factor authentication
- repository: github.com/jpulse-net/plugin-auth-mfa (separate repo)
- npm package: @jpulse-net/plugin-auth-mfa@1.0.0 (GitHub Package Registry)
- depends on: W-109 (multi-step login), W-106 (plugin CLI)
- working doc: docs/dev/working/W-108-auth-mfa-plugin.md
- features:
  - TOTP-based MFA using authenticator apps (Google Authenticator, Authy, etc.)
  - backup codes for account recovery (10 codes, one-time use)
  - flexible policy: optional, required, or role-based enforcement
  - autoEnable: false (requires configuration)
  - integration with jPulse multi-step login flow (W-109 hooks)
  - user profile MFA management component
  - admin lockout/reset capabilities
  - bootstrap protection (root users exempt until MFA setup)
  - QR code generation for authenticator app setup
  - nag toast for optional MFA policy ("Secure your account...")
  - SMS is out of scope (external service dependency)
- npm dependency: otplib (~20KB)
- deliverables:
  - plugins/auth-mfa/plugin.json: plugin configuration and schema
  - plugins/auth-mfa/webapp/controller/mfaAuth.js: MFA API controller
  - plugins/auth-mfa/webapp/model/mfaAuth.js: MFA data model
  - plugins/auth-mfa/webapp/view/auth/mfa-setup.shtml: MFA enrollment page
  - plugins/auth-mfa/webapp/view/auth/mfa-verify.shtml: MFA verification page
  - plugins/auth-mfa/webapp/view/jpulse-plugins/auth-mfa.shtml: user profile component
  - plugins/auth-mfa/webapp/bump-version.conf: version management config
  - docs/plugins/creating-plugins.md: version management section
  - bin/bump-version.js: plugin context detection

### W-111, v1.3.12, 2025-12-08: deploy: bug fixes for plugin installations
- status: ✅ DONE
- type: Bug Fix
- objective: enable sites to install plugins from npm package
- issues:
  - bug 1: jPulse dependency check checks minimum required version, not actual version installed
  - bug 2: bin/bump-version.js script does not work for plugin projects
- deliverables:
  - bin/plugin-manager-cli.js:
    - fixed getFrameworkVersion() to read actual installed version from node_modules
    - was incorrectly reading dependency requirement (^1.1.0) from site package.json
    - now reads actual version from node_modules/@jpulse-net/jpulse-framework/package.json
  - bin/bump-version.js:
    - added plugin context detection (checks for plugin.json)
    - looks for webapp/bump-version.conf when in plugin directory
    - updated error messages and instructions for plugin context
  - docs/plugins/creating-plugins.md:
    - added "Version Management" section
    - documents bump-version.conf location for plugins
    - shows node ../../bin/bump-version.js usage (not npx)

### W-112, v1.3.13, 2025-12-13: metrics: strategy to report vital statistics of components
- status: ✅ DONE
- type: Feature
- objective: standard way for components to report vital statistics used by metrics
- working document: docs/dev/working/W-112-metrics-get-stats-strategy.md
- features:
  - standardized `getMetrics()` method with consistent return structure (component, status, initialized, stats, meta, timestamp)
  - field-level metadata system (visualize, global, sanitize, aggregate) with system defaults and opt-out model
  - statsRegistry utility for dynamic component registration and auto-discovery
  - cluster-wide aggregation of component stats with support for sum, avg, max, min, first, count, concat
  - global fields support for database-backed stats (same across instances, use 'first' aggregation)
  - component stats sanitization for non-admin users (field-level control)
  - plugin stats registration via `onGetInstanceStats` hook
  - integration with existing health metrics API and Redis broadcasting
  - support for nested fields in stats objects
  - historical stats windows (stats5m, stats1h) - Phase 2
- deliverables:
  - webapp/utils/metrics-registry.js:
    - MetricsRegistry class for component registration and discovery (renamed from StatsRegistry)
    - support for sync and async getMetrics() methods
    - dynamic component discovery via registration at initialization
  - updated components with getMetrics() method:
    - webapp/utils/plugin-manager.js (replaced getStatistics() with getMetrics(), removed getHealthStatus())
    - webapp/utils/hook-manager.js (updated to new structure, removed getHealthStatus())
    - webapp/utils/site-controller-registry.js (updated to new structure, removed getHealthStatus())
    - webapp/utils/context-extensions.js (updated to new structure)
    - webapp/utils/cache-manager.js (updated to new structure)
    - webapp/utils/redis-manager.js (new getMetrics() method)
    - webapp/controller/email.js (new getMetrics() with time-based counters)
    - webapp/controller/handlebar.js (new getMetrics(), removed getHealthStatus())
    - webapp/controller/view.js (new getMetrics() with time-based counters, removed getHealthStatus())
    - webapp/controller/log.js (new getMetrics() with database aggregation and time-based counters)
    - webapp/controller/user.js (new getMetrics() wrapping UserModel.getUserStats())
    - webapp/controller/websocket.js (updated getMetrics() to standardized format, removed getMetricsLegacy())
    - webapp/model/user.js (renamed getMetrics() to getUserStats() for clarity)
  - webapp/utils/time-based-counters.js (NEW):
    - timeBasedCounter class for in-memory event tracking with rolling time windows
    - counterManager for centralized counter management across components
    - supports last hour, last 24h, and total counts with automatic cleanup
  - webapp/model/log.js:
    - getLogStats() method using MongoDB aggregation for efficient database-backed stats
  - webapp/controller/health.js:
    - _collectComponentStats() method with dynamic discovery via MetricsRegistry
    - _aggregateComponentStats() method with field-level metadata support
    - _sanitizeComponentStats() method with field-level control
    - integration into _getCurrentInstanceHealthData() and _buildClusterStatistics()
    - component sorting for consistent display
    - elapsed time tracking for component metrics collection
    - 5-second delay for initial health broadcast to allow component initialization
  - webapp/utils/hook-manager.js:
    - onGetInstanceStats hook definition
    - add elapsed time tracking for plugin hook execution
  - plugins/auth-mfa:
    - stats registration via onGetInstanceStats hook (using static hooks = {} pattern)
  - webapp/view/admin/system-status.shtml:
    - Enhanced UI for aggregated and per-instance component metrics
    - Respects visualize flag from meta.fields
    - Uptime formatting for component metrics
    - Color-coded status indicators
    - Flattened component display structure
  - webapp/view/jpulse-common.js:
    - formatUptime() utility with maxLevels parameter
    - Enhanced date formatting functions (formatLocalDate, formatLocalDateAndTime, formatLocalTime)
  - webapp/utils/common.js:
    - formatUptime() server-side utility with maxLevels parameter
  - webapp/tests/unit/utils/time-based-counters.test.js (NEW):
    - Comprehensive unit tests for TimeBasedCounter and CounterManager
  - webapp/tests/unit/log/log-basic.test.js:
    - Unit tests for LogModel.getLogStats() and LogController.getMetrics()
  - webapp/tests/integration/health-api.test.js:
    - Integration tests for log component metrics
  - webapp/tests/setup/global-teardown.js:
    - CounterManager cleanup to prevent test hangs
  - removed getHealthStatus() methods from:
    - webapp/utils/plugin-manager.js
    - webapp/controller/email.js
    - webapp/controller/handlebar.js
    - webapp/controller/view.js
    - webapp/controller/plugin.js
  - webapp/app.conf:
    - removed health.componentProviders (replaced by MetricsRegistry)
  - documentation:
    - API reference for getMetrics() convention (W-112-metrics-get-stats-strategy.md)
    - plugin development guide with stats registration examples
    - metrics API documentation updates (api-reference.md)
  - site navigation enhancement:
    - hideInDropdown flag added to navigation items, documented in docs/site-navigation.md
    - allows items to appear in breadcrumbs but not in dropdown/hamburger menu
    - useful for detail pages that require URL parameters
    - implemented in webapp/view/jpulse-common.js with _hasVisiblePages() helper
    - framework navigation updated: pluginConfig and userProfile use hideInDropdown: true

### W-113, v1.3.14, 2025-12-13: metrics: bug fixes for reporting vital statistics of components
- status: ✅ DONE
- type: Bug Fix
- objective: fix bugs discovered after W-112, v1.3.13 release
- issues:
  - bug 1: Aggregated components showing unsanitized data (e.g., smtpServer) even when sanitize: true is set
  - bug 2: InstanceId showing sanitized data (999:0:99999) when logged in as admin
  - bug 3: Memory percentage showing 255% (incorrect calculation using heap size instead of total system memory)
  - bug 4: Aggregation waiting for all instances to have components before showing them in aggregated section
- enhancements:
  - in user controller, add docsCreated24h, docsUpdated24h, docsDeleted24h metrics
  - component sorting by display name (component.component || componentName) instead of key
- deliverables:
  - webapp/controller/health.js:
    - Fixed sanitization in aggregated components: preserve meta structure in aggregation, handle both per-instance and aggregated structures in _sanitizeComponentStats()
    - Fixed admin sanitization: use isAdmin parameter instead of hardcoded false, check admin status separately from authorization
    - Fixed memory percentage calculation: use total system memory (os.totalmem()) instead of heap size for percentage calculation
    - Fixed aggregation logic: collect component names from ALL instances, not just first, so components appear as soon as one instance has them
    - Fixed component sorting: sort by display name (component.component || componentName) in aggregation, _buildServersArray(), and _getCurrentInstanceHealthData()
  - webapp/controller/user.js:
    - Added user document metrics: docsCreated24h, docsUpdated24h, docsDeleted24h to UserController.getMetrics() by querying log collection
  - webapp/model/user.js:
    - Added aggregation for user document changes: MongoDB aggregation pipeline querying log collection for user document changes (docsCreated24h, docsUpdated24h, docsDeleted24h)

### W-114, v1.3.15, 2025-12-14: handlebars: add logical and comparison helpers with subexpressions and block helpers
- status: ✅ DONE
- type: Feature
- objective: more flexible handlebars
- note on syntax:
  - it follows the Polish notation, also called Łukasiewicz notation
  - normal notation: A and B
  - Polish notation: and, A, B
  - reverse Polish notation: A, B, and
- syntax with subexpressions (nested helpers):
  - block handlebars that expect a boolean parameter support nested regular helpers:
  - `{{#if}}` and `{{#unless}}` accept `(nested helpers)`:
    - `{{#if (<operator> <operand1> <operand2> <operand3>...)}} ... {{else}} ... {{/if}}`
    - `{{#unless (<operator> <operand1> <operand2> <operand3>...)}} ... {{/unless}}`
  - example without operator:
    - `{{#if some.condition}} true block {{else}} false block {{/if}}`
  - examples with operator and operands:
    - `{{#if (and some.condition other.condition)}} true block {{else}} false block {{/if}}`
    - `{{#if (or some.val other.val etc.val)}} true block {{else}} false block {{/if}}`
    - `{{#if (not user.isGuest)}} registered user {{else}} guest user {{/if}}`
    - `{{#if (eq some.string "DONE")}} true block {{else}} false block {{/if}}`
    - `{{#if (gt some.val 1)}} true block {{else}} false block {{/if}}`
    - `{{#if (and (gt some.val 1) (gt other.val 1))}} true block {{else}} false block {{/if}}`
- features:
    - new regular helpers: `{{and}}`, `{{or}}`, `{{not}}`, `{{gt}}`, `{{gte}}`, `{{lt}}`, `{{lte}}`, `{{eq}}`, `{{ne}}`
    - new block helpers: `{{#and}}`, `{{#or}}`, `{{#not}}`, `{{#gt}}`, `{{#gte}}`, `{{#lt}}`, `{{#lte}}`, `{{#eq}}`, `{{#ne}}`
    - evaluate handlebar subexpressions in `{{#if}}`, `{{#unless}}`, and all new handlebars
    - add `{{else}}` to `{{#unless}}` ... `{{/unless}}`
- deliverables:
  - webapp/controller/handlebar.js -- add logical and comparison helpers with subexpression support
    - enhanced `_parseArguments()` → `_parseAndEvaluateArguments()` (async) with multi-phase parsing:
      - Phase 1: Extract helper name and set `args._helper`
      - Phase 2: Escape quotes and parentheses inside quoted strings to preserve literals
      - Phase 3: Annotate parentheses with nesting levels for subexpression detection
      - Phase 4: Recursively evaluate subexpressions using `_resolveSubexpression()` helper
      - Phase 5: Clean up expression text (remove annotations, preserve encoded characters)
      - Phase 6: Parse all arguments (positional and key=value pairs) with type coercion and property resolution
      - Supports quoted strings with parentheses: `"James (Jim)"` preserved as literal
      - Supports subexpressions in all helper arguments: `{{#component (vars.name) order=(vars.order)}}`
    - implemented 3 logical helper functions:
      - `_handleAnd(parsedArgs, currentContext)` - returns "true" if all args truthy (1+ arguments)
      - `_handleOr(parsedArgs, currentContext)` - returns "true" if any arg truthy (1+ arguments)
      - `_handleNot(parsedArgs, currentContext)` - returns negation (exactly 1 argument)
      - All normalize string "true"/"false" to booleans for proper evaluation
    - implemented unified comparison helper:
      - `_handleComparison(parsedArgs, currentContext, operator)` - handles all 6 comparison operators
      - Supports: `eq`, `ne`, `gt`, `gte`, `lt`, `lte` (exactly 2 arguments each)
      - Uses function map for dynamic operator application
      - Permissive type coercion (numeric strings → numbers, lexicographical string comparison)
    - enhanced `_evaluateRegularHandlebar()` to support standalone helpers:
      - Added cases for `and`, `or`, `not` (logical helpers)
      - Added fall-through cases for `eq`, `ne`, `gt`, `gte`, `lt`, `lte` → `_handleComparison()`
      - Updated `REGULAR_HANDLEBARS` array to include all 9 new helpers
    - enhanced `_evaluateCondition()` (async) to support subexpressions:
      - Simplified evaluation logic (removed undocumented `!` negation)
      - Detects subexpressions using regex pattern `^\([^)]+\)$`
      - Recursively evaluates subexpressions via `await _evaluateRegularHandlebar(subExpr, currentContext)`
      - Checks for "true" result (consistent with block helpers)
    - enhanced `_handleBlockIf()` and `_handleBlockUnless()` (async):
      - Made async to await `_evaluateCondition()`
      - Added `{{else}}` support to `{{#unless}}` blocks (matching `{{#if}}` behavior)
    - implemented unified block helper handler:
      - `_handleLogicalBlockHelper(helperType, params, blockContent, currentContext)` (async)
      - Handles all 9 logical/comparison block helpers: `{{#and}}`, `{{#or}}`, `{{#not}}`, `{{#eq}}`, `{{#ne}}`, `{{#gt}}`, `{{#gte}}`, `{{#lt}}`, `{{#lte}}`
      - Parses params using `_parseAndEvaluateArguments()`
      - Evaluates condition using respective standalone helper functions
      - Supports `{{else}}` blocks using regex-based split
    - updated `_evaluateBlockHandlebar()`:
      - Added all 9 new helpers to `BLOCK_HANDLEBARS` array
      - Added fall-through cases for logical/comparison helpers → `_handleLogicalBlockHelper()`
    - comprehensive error handling:
      - Unbalanced parentheses detection in subexpression parsing
      - Arity validation (1+ for `and`/`or`, exactly 1 for `not`, exactly 2 for comparisons)
      - Unknown helper detection
  - webapp/tests/unit/controller/handlebar-logical-helpers.test.js -- comprehensive unit tests
    - 63 passing tests covering:
      - Standalone helpers: `{{and}}`, `{{or}}`, `{{not}}`, `{{eq}}`, `{{ne}}`, `{{gt}}`, `{{gte}}`, `{{lt}}`, `{{lte}}`
      - Subexpressions in `{{#if}}` and `{{#unless}}` conditions
      - Block helpers with `{{else}}` support
      - Type coercion (numeric strings, loose equality)
      - Quoted strings with parentheses: `"James (Jim)"`
      - Nested subexpressions
      - Edge cases (null, undefined, empty strings)
  - docs/handlebars.md -- updated documentation
    - Added "Logical and Comparison Helpers (v1.3.15+)" section with:
      - Standalone helper examples
      - Subexpressions in conditions examples
      - Block helper examples with `{{else}}`
      - Complete helper reference table
      - Type coercion documentation
    - Updated `{{#unless}}` section to note `{{else}}` support (v1.3.15+)
    - Updated "Nested Conditionals" section with subexpression examples
    - Updated "Best Practices" section with examples using new helpers
    - Added comprehensive summary tables for all regular and block handlebars
  - webapp/view/jpulse-examples/handlebars.shtml -- interactive examples
    - Added "Logical and Comparison Helpers" example card with:
      - Standalone helpers demo
      - Subexpressions in `{{#if}}` demo
      - Block helpers with `{{else}}` demo
      - Nested subexpressions demo
      - Complete source code examples
    - Added helper reference table to "Available Context Variables" section
    - Enhanced "Conditional Rendering" section with subexpression examples
  - docs/dev/working/W-114-handlebars-logical-subexpressions.md -- working document
    - Complete brainstorming, requirements, design decisions, and implementation plan

### W-115, v1.3.16, 2025-12-16: handlebars: config context enhancements & security, fixes for let and subexpressions
- status: ✅ DONE
- type: Refactoring
- objective: more intuitive handlebars; fix bugs discovered after W-114, v1.3.15 release
- features:
  - rename `config` context property to more descriptive `siteConfig`
    - there are two configuration structures:
      - `siteConfig`: system config from ConfigModel (database)
      - `appConfig`: webapp/app.conf configuration
    - this is a breaking change, but acceptable (no backward compatibility needed)
    - fix needed:
      - `webapp/controller/handlebar.js`
      - `docs/handlebars.md`
      - `webapp/view/jpulse-examples/handlebars.shtml`
      - any other documentation referencing `{{config.*}}`
  - exclude sensitive site config fields from the `siteConfig` context property
    - add metadata to the site config schema following appConfig pattern
    - appConfig: already has `contextFilter.withoutAuth` and `contextFilter.withAuth` in app.conf (no changes needed)
    - siteConfig: add `_meta.contextFilter` to ConfigModel schema with `withoutAuth` and `withAuth` arrays
    - supports wildcards: `['data.email.smtp*', 'data.email.*pass', 'data.email.smtpUser']`
    - example schema format:
      ```
      _meta: {
          contextFilter: {
              withoutAuth: ['data.email.smtp*', 'data.email.*pass'],
              withAuth: ['data.email.smtpPass']  // Even authenticated users shouldn't see password
          }
      }
      ```
  - new `user.hasRole.*` context to test for role, such as `{{#if user.hasRole.root}} ... {{/if}}`
    - implemented as object with role keys set to `true` for user's roles
    - example: `{{#if user.hasRole.admin}}`, `{{#if user.hasRole.root}}`
    - note for release: document in handlebars.md and examples page
- issues:
  - bug 1: not all handlers with key="value" work if value has embedded quotes
    - example: `{{let foo="value with \"quote\" does not work"}}`
  - bug 2: not all handlers with `key=(vars.some.value)` evaluate subexpressions
- deliverables:
  - `webapp/controller/handlebar.js`
    - renamed context property `config` to `siteConfig`
    - updated `_filterContext()` to filter `siteConfig` using schema `_meta.contextFilter`
    - enhanced `_removeWildcardPath()` to support property name patterns (`smtp*`, `*pass`)
    - updated `REGULAR_HANDLEBARS` array with comments
  - `webapp/model/config.js`
    - added `_meta.contextFilter` to schema with `withoutAuth` and `withAuth` arrays
    - defined sensitive field patterns: `data.email.smtp*`, `data.email.*pass`, `data.email.smtpPass`
  - `webapp/controller/config.js`
    - added `includeSchema` query parameter support (like user controller)
    - returns schema and contextFilter metadata when requested
  - `docs/handlebars.md`
    - updated all examples referencing `config` to `siteConfig` (9 occurrences)
  - `webapp/view/jpulse-examples/handlebars.shtml`
    - updated all examples referencing `config` to `siteConfig` (13 occurrences)
  - `webapp/tests/unit/controller/handlebar-variables.test.js`
    - fixed test to use `siteConfig` instead of `config`
  - `webapp/tests/unit/controller/handlebar-context-filter.test.js`
    - new test file with 4 unit tests for siteConfig filtering

### W-116, v1.3.17, 2025-12-17: handlebars: define plugin interface for custom helpers
- status: ✅ DONE
- type: Feature
- objective: enable site developers and plugin developers to define their own handlebar helpers using auto-discovery pattern
- features:
  - Auto-discovery: Methods starting with `handlebar*` in controllers are automatically registered
  - Unified interface: Regular helpers `(args, context)`, Block helpers `(args, blockContent, context)`
  - Consistent arguments: Both helper types receive parsed `args` object (subexpressions already expanded)
  - Internal utilities: Framework utilities available via `context._handlebar.*` (req, depth, expandHandlebars, etc.)
  - Function signature detection: Helper type determined by parameter count (2 = regular, 3 = block)
  - Works for sites: Add `site/webapp/controller/*.js` with `handlebar*` methods
  - Works for plugins: Add `handlebar*` methods to plugin controller
  - Refactored built-in helpers: All existing helpers use same `args` interface for consistency
  - Auto-documentation: JSDoc `@description` and `@example` tags automatically extracted and included in documentation
  - Dynamic documentation: Helper lists generated automatically via `%DYNAMIC{handlebars-list-table}%` tokens
  - Helper priority: Site helpers override plugin helpers, which override built-in helpers
  - Helper registry: Single Map storing handler, type, source, description, and example metadata
- implementation:
  - Refactor all existing regular helpers to use `args` instead of `expression` string
  - Refactor all existing block helpers to use `args` instead of `params` string
  - Add helper registry (`helperRegistry` Map) storing handler and metadata together
  - Add `registerHelper()` method to HandlebarController with validation
  - Add `initializeHandlebarHandlers()` method for auto-discovery from controllers
  - Add `PathResolver.collectControllerFiles()` for collecting controller files in load order
  - Auto-discover `handlebar*` methods from SiteControllerRegistry (site and plugins)
  - Extract JSDoc `@description` and `@example` tags via `_extractJSDoc()` method
  - Add `context._handlebar` namespace with internal utilities (req, depth, expandHandlebars, etc.)
  - Update `_evaluateRegularHandlebar()` to check registry first (plugin/site helpers override built-ins)
  - Update `_evaluateBlockHandlebar()` to check registry first and use parsed args
  - Filter out `_handlebar` from context in `_filterContext()` before template exposure
  - Replace `REGULAR_HANDLEBARS` and `BLOCK_HANDLEBARS` arrays with `HANDLEBARS_DESCRIPTIONS` array
  - Add dynamic content generators `handlebars-list-table` and `handlebars-list` in MarkdownController
  - Update `getMetrics()` to derive helper lists from `HANDLEBARS_DESCRIPTIONS`
- deliverables:
  - `webapp/controller/handlebar.js`:
    - Refactor all existing regular helpers to use `args` parameter instead of `expression` string
    - Refactor all existing block helpers to use `args` parameter instead of `params` string
    - Add helper registry (`helperRegistry`, `helperRegistryInfo` Maps) and `registerHelper()` method
    - Update `_evaluateRegularHandlebar()` to check registry first, then built-in helpers
    - Update `_evaluateBlockHandlebar()` to parse params and check registry first
    - Add `context._handlebar` namespace with internal utilities (req, depth, expandHandlebars, etc.)
    - Filter out `_handlebar` from context in `_filterContext()` before template exposure
  - `webapp/utils/bootstrap.js`:
    - Add helper auto-discovery after `SiteControllerRegistry.initialize()` and before `HandlebarController.initialize()`
    - Discover `handlebar*` methods from all registered controllers (framework, site, plugins)
  - `docs/dev/working/W-116-handlebars-plugin-interface.md`:
    - Complete implementation plan with all phases
    - API reference with helper signatures and args structure
    - Examples for plugin and site helpers
  - `docs/plugins/creating-plugins.md`:
    - Add "Step 9: Add Handlebars Helpers" section
    - Document auto-discovery pattern and naming convention
    - Show examples of regular and block helpers
    - Document `context._handlebar` utilities
  - `webapp/tests/unit/controller/handlebar.test.js`:
    - Test helper registration via `registerHelper()`
    - Test auto-discovery from controllers
    - Test regular helper invocation with `args` parameter
    - Test block helper invocation with `args` parameter
    - Test internal utilities access via `context._handlebar`
  - `webapp/tests/integration/plugin-handlebars-helpers.test.js`:
    - Test plugin helper registration and discovery
    - Test site helper registration and discovery
    - Test helper priority (framework → site → plugins)
    - Test helpers with subexpressions
  - `plugins/hello-world/webapp/controller/helloPlugin.js`:
    - Add example regular helper (`handlebarUppercase`)
    - Add example block helper (`handlebarRepeat`)
    - Demonstrate usage of `context._handlebar` utilities

### W-117, v1.3.18, 2025-12-18: refactoring: handlebar optimization, security unit tests
- status: ✅ DONE
- type: Refactoring
- objective: security hardening, more efficient handlebar processing, comprehensive unit test coverage
- features:
  - context caching optimization for improved performance with nested template expansions
  - security hardening with 206 new unit tests for XSS prevention and path traversal blocking
  - technical debt removal (16 skipped tests eliminated)
  - documentation enhancements for client-side Handlebars and site developer helpers
- implementation:
  - context caching: moved _buildInternalContext() to expandHandlebars() (depth 0 only), cached on req.baseContext
  - unit test analysis: identified 5 low-hanging fruit opportunities (sanitizeHtml, MetricsRegistry, _validatePluginName, ContextExtensions, validatePluginJson)
  - implemented 4 high-priority test suites with 206 comprehensive tests
  - test cleanup: removed 6 skipped tests from health.test.js, deleted admin-view.test.js (10 skipped tests)
  - documentation: Vue.js vs jPulse Handlebars clarification, site developer helper creation guide
- enhancements:
  - performance (Handlebar Context Caching):
    - moved _buildInternalContext() from _expandHandlebars() to expandHandlebars() (depth 0)
    - cached baseContext on req.baseContext for reuse across nested {{file.include}} calls
    - eliminated redundant context rebuilds, significantly improving performance for templates with many includes
  - security (XSS Prevention):
    - 55 tests for sanitizeHtml(): script/style removal, event handlers, javascript:/data: protocols, tag/attribute filtering
    - comprehensive coverage of attack vectors: nested attacks, SVG-based XSS, URL encoding, command injection patterns
  - security (Path Traversal Prevention):
    - 68 tests for _validatePluginName(): validates plugin names against path traversal attacks
    - blocks: ../, ./, absolute paths, special characters, uppercase, command injection, SQL injection patterns
  - infrastructure (Metrics Collection):
    - 47 tests for MetricsRegistry: registration, validation, sync/async providers, error handling
    - ensures health monitoring system reliability for component metrics collection
  - core Features (Context Extensions):
    - 36 tests for ContextExtensions (W-014): provider management, priority ordering, caching, async support
    - validates Handlebars context extension system used by site controllers and plugins
  - technical Debt Removal:
    - removed 16 skipped unit tests (health.test.js: 6 tests, admin-view.test.js: deleted entire file with 10 tests)
    - all functionality covered by integration tests (health-api.test.js, admin-routes.test.js)
    - test suite now shows 0 skipped tests (was 16)
  - documentation (Client-Side Handlebars):
    - template-reference.md: Distinguished jPulse Handlebars (server-side) vs Vue.js (client-side)
    - clarified syntax: {{variable}} (jPulse) vs {{ variable }} (Vue.js with spaces)
    - explained processing flow and when to use each approach
  - documentation (Site Developer Helpers):
    - site-customization.md: Added comprehensive guide for creating custom Handlebars helpers
    - included examples for regular and block helpers, args structure, context utilities
    - documented helper priority (site → plugin → core) and JSDoc auto-documentation
- deliverables:
  - webapp/controller/handlebar.js:
    - performance: Context built once per request at depth 0, cached on req.baseContext
    - _expandHandlebars() reuses cached context instead of rebuilding on every call
  - webapp/tests/unit/controller/handlebar-context-caching.test.js:
    - 7 tests: Validates context caching optimization works correctly
    - tests: single call per request, caching, reuse across nested calls, context isolation
  - webapp/tests/unit/utils/common-utils-sanitize.test.js:
    - 55 tests: XSS prevention via sanitizeHtml()
    - coverage: script/style removal, event handlers (15+ types), protocols, tags, attributes, attack vectors
  - webapp/tests/unit/utils/metrics-registry.test.js:
    - 47 tests: MetricsRegistry reliability
    - coverage: register/unregister, validation, sync/async providers, error handling
  - webapp/tests/unit/controller/plugin-controller-validation.test.js:
    - 68 tests: Path traversal prevention via _validatePluginName()
    - coverage: valid formats, path traversal attacks, special chars, URL encoding, real-world attacks
  - webapp/tests/unit/utils/context-extensions.test.js:
    - 36 tests: Context extension system (W-014)
    - coverage: provider registration, priority ordering, caching, async support, error handling
  - webapp/tests/unit/controller/health.test.js:
    - removed 6 skipped tests (health() and metrics() methods)
    - added comment noting integration test coverage in health-api.test.js
  - webapp/tests/unit/controller/admin-view.test.js:
    - deleted entire file (10 skipped tests in skipped describe block)
    - functionality covered by admin-routes.test.js integration tests
  - docs/template-reference.md:
    - added "Vue.js Templates (Client-Side Only)" subsection under "Client-Side Handlebars Expansion"
    - clarified syntax distinction and processing flow between jPulse and Vue.js Handlebars
  - docs/site-customization.md:
    - added "Creating Custom Handlebars Helpers" subsection under "Controller Customization"
    - Complete examples for regular and block helpers with JSDoc documentation
  - docs/handlebars.md:
    - added cross-reference link to site-customization.md for site developers
- total impact:
  - tests: +213 new unit tests (206 low-hanging fruit + 7 context caching), -16 skipped tests = +197 net
  - security: XSS prevention (55 tests), path traversal blocking (68 tests)
  - infrastructure: Metrics reliability (47 tests), context extensions (36 tests)
  - performance: Handlebar context caching optimization (7 tests)
  - quality: 0 skipped tests (eliminated technical debt)
  - documentation: Vue.js vs jPulse clarification, site developer helper guide
- status notes:
  - all 213 new tests passing (100% pass rate)
  - performance optimization validated and tested
  - security hardening complete for critical functions
  - documentation comprehensive and cross-referenced

### W-118, v1.3.19, 2025-12-19: view: headings with anchor links for copy & paste in browser URL bar
- status: ✅ DONE
- type: Feature
- objectives: ability to share content with anchor links, should work on any jpulse rendered page, not just markdown docs
- prerequisits: W-049: docs: views render markdown docs for jPulse docs and site docs
- features:
  - on hover on any page heading, show a `🔗` (U+1F517) on the left of the heading
  - click on `🔗`:
    - the URI has an #anchor-link appended/replaced
    - the clipboard is updated with anchor link
    - user can share deep link with anchor
  - behaviour is configurable in app config:
    ```
      view.headingAnchors: {
          enabled: true,
          levels: [1, 2, 3, 4, 5, 6],     // all heading levels
          icon: '🔗'                      // link icon on hover over heading
      }
    ```
  - anchor name based on heading name:
    - example: heading `## Framework Architecture` becomes anchor `#framework-architecture`
    - use GitHub Markdown standard:
      - lowercased conversion
      - spaces replaced by `-`
      - remove punctuation
      - non-English Unicode text is supported, such as `#日本語文章はOKです`
      - for duplicate headings append `-1`, `-2`, etc.
- example:
  - file `/docs/handlebars.md` has h3 header `### Logical and Comparison Helpers (v1.3.15+)`
  - DOM: `<h3 id="logical-and-comparison-helpers-v1315">Logical and Comparison Helpers (v1.3.15+)</h3>`
  - in rendered `/jpulse-docs/handlebars` page, click on `🔗` next to `Logical and Comparison Helpers (v1.3.15+)`
  - sharable link: http://localhost:8080/jpulse-docs/handlebars#logical-and-comparison-helpers-v1315
- deliverables:
  - webapp/view/jpulse-common.js (lines 4465-4625):
    - implemented jPulse.UI.headingAnchors object with GitHub-style slug generation
    - _slugify() function with Unicode support
    - _ensureHeadingIds() for automatic ID generation with conflict resolution
    - _addLinks() for anchor link creation with click handlers
    - init() method for configuration and initialization
    - integrated with jPulse.UI.docs._renderMarkdown for dynamic content
  - webapp/view/jpulse-common.css (lines 3750-3867):
    - .heading-anchor styling with hover effects and positioning
    - markdown-specific spacing adjustments
    - h1 icon vertical alignment fixes
    - icon-only hover highlight (jPulse button style)
    - target highlighting animation
  - webapp/view/jpulse-footer.tmpl (lines 185-220):
    - auto-initialization on page load and SPA navigation
    - configuration passed from app.conf
  - webapp/app.conf (lines 380-384):
    - default headingAnchors configuration (enabled, levels, icon)
  - webapp/translations/en.conf, de.conf (lines 291-295):
    - i18n strings for linkCopied, linkFailed, linkToSection, copyLinkTitle
  - webapp/tests/unit/utils/jpulse-ui-heading-anchors.test.js (NEW):
    - 33 comprehensive unit tests (slugify, ID generation, link creation, click behavior, configuration, edge cases)
  - docs/jpulse-ui-reference.md:
    - complete widget documentation with API reference, examples, configuration
  - docs/site-customization.md:
    - configuration guide for headingAnchors settings
  - docs/style-reference.md:
    - CSS documentation for heading anchor links
  - docs/front-end-development.md:
    - brief mention and link to detailed reference
  - docs/markdown-docs.md:
    - feature mention in overview
  - webapp/view/jpulse-examples/ui-widgets.shtml:
    - live interactive example with various heading levels and Unicode support
  - docs/images/anchor-link-on-hover-700.png:
    - screenshot for documentation

### W-119, v1.3.20, 2025-12-20: i18n: usage audit tests for translations, controllers, views
- status: ✅ DONE
- type: Testing
- objectives: more reliable translations
- tests:
  - webapp/tests/unit/i18n/i18n-usage-audit.test.js: Combined test suite for translation key comparison, view i18n usage, and controller i18n usage validation
- deliverables:
  - webapp/tests/unit/i18n/i18n-usage-audit.test.js:
    - Combined test file with three test suites: Translation Key Comparison, View i18n Usage Validation, Controller i18n Usage Validation
    - Validates translation key consistency across all language files (en.conf as reference)
    - Validates all {{i18n.*}} references in view files (.js, .css, .tmpl, .shtml)
    - Validates all global.i18n.translate() calls in controller files
    - Detects and reports dynamic keys (variables, string concatenation, template literals) as warnings
    - Performance: < 2 seconds for full audit
  - webapp/tests/unit/i18n/utils/translation-loader.js:
    - Utility to load, parse, and flatten translation files into sorted dot-notation key arrays
    - Handles nested objects recursively
    - Returns flattened structure: { en: ['controller.auth.loginDisabled', ...], de: [...] }
  - webapp/tests/unit/i18n/utils/key-validator.js:
    - Utility to validate keys against a reference set (en.conf)
    - Reports missing and extra keys
  - webapp/tests/unit/i18n/utils/key-extractor.js:
    - Utility to extract i18n keys from view and controller files using regex patterns
    - Detects static keys and dynamic keys (variables, string concatenation, template literals)
    - Returns structured references with file path, line number, and match context
  - webapp/tests/unit/i18n/find-dynamic-keys.js:
    - Standalone script to find dynamic i18n keys across the codebase
  - bin/test-all.js:
    - Enhanced to extract and aggregate warnings from all test suites (CLI Tools, Enhanced CLI, MongoDB, Unit Tests, Integration Tests)
    - Displays single aggregated warning summary at end of test run, just before "📊 TEST SUMMARY"
  - webapp/tests/setup/global-teardown.js:
    - Modified to skip warning summary when running from test-all.js (prevents duplicate summaries)
  - bin/configure.js, bin/config-registry.js, bin/plugin-manager-cli.js:
    - Converted all warnings to standardized "WARNING: ... [file-path]" format for consistent detection

###  W-120, v1.3.21, 2025-12-21: markdown: publishing directives for sort order and page titles
- status: ✅ DONE
- type: Feature
- objectives: more control over markdown docs publishing
- previous behavior:
  - possible to define pages to ignore in `.jpulse-ignore` -- good
  - doc titles are generated from file names using Title Case, such as `style-reference.md` → `Style Reference` form -- good
  - doc titles can be fixed with a substitution list, such as `Api` → `API` -- good
  - the docs listed in the sidebar are in alphabetical order, not in logical doc order -- missing feature
- new behavior:
  - custom sort order for important docs using `[publish-list]` in `.markdown` file
  - custom page titles supported in `[publish-list]` section
  - ignore patterns moved from `.jpulse-ignore` to `[ignore]` section in `.markdown`
  - title case fixes merged from `app.conf` defaults + `.markdown` overrides
  - sidebar now follows `[publish-list]` order (explicit files first, then alphabetical)
- features:
  - remove `.jpulse-ignore` in favor of new `.markdown` in the docs root
    - no backwards compatibility
  - `.markdown` defines 3 sections, all optional:
    - `[publish-list]` section:
      - what: define the list of markdown pages to publish, with doc title, shown in sidebar
    - `[ignore]` section:
      - what: define list of markdown files to ignore on publish
      - same syntax & behavior like the current `.jpulse-ignore`
    - `[title-case-fix]` section:
      - what: define list of word corrections when filename to Title Case conversion is used
      - example: Api  API
      - entries override `controller.markdown.titleCaseFix` list
- deliverables:
  - webapp/controller/markdown.js:
    - Added `_initializeDocsConfig()` method to parse `.markdown` file with [publish-list], [ignore], and [title-case-fix] sections
    - Added `_applyPublishListOrdering()` method for partial ordering (explicit files first, then alphabetical)
    - Updated `_scanMarkdownFiles()` to use docsConfig, apply ordering, filtering, and custom titles
    - Updated `_extractTitle()` to use merged titleCaseFix from docsConfig
    - Updated `_getDirectoryListing()` for cache invalidation with `.markdown` mtime
    - Updated `_getMarkdownFile()` for virtual README generation
    - Removed `_loadIgnorePatterns()` method (replaced by `_initializeDocsConfig()`)
    - Fixed code block rendering to preserve `.md` extensions in code blocks
  - webapp/tests/unit/controller/markdown-ignore.test.js:
    - Updated to use new `.markdown` file instead of `.jpulse-ignore`
    - Fixed deprecated `substr()` to `slice()` for string manipulation
  - webapp/tests/unit/controller/markdown-publish-list.test.js (NEW):
    - Comprehensive tests for [publish-list] ordering functionality
    - Tests for custom titles in [publish-list]
    - Tests for interaction between [publish-list] and [ignore] sections
    - Tests for partial ordering (explicit files first, then alphabetical)
  - docs/.markdown (NEW):
    - Configuration file with comprehensive comments and examples
    - Organized sections logically for site admins/developers
  - docs/markdown-docs.md:
    - Updated to reflect new `.markdown` configuration system
    - Added comprehensive documentation for [publish-list], [ignore], and [title-case-fix] sections
  - docs/api-reference.md:
    - Updated File Filtering section to reference `.markdown` instead of `.jpulse-ignore`
  - docs/site-customization.md:
    - Updated references to use `.markdown` configuration
  - bin/jpulse-update.js:
    - Updated to use `.markdown` configuration file instead of `.jpulse-ignore`
    - Added support for [publish-list] ordering (explicit files first, then alphabetical)
    - Matches markdown controller behavior for consistent publishing
  - webapp/view/jpulse-common.js:
    - Updated `_loadNavigation()` to flatten top-level directory structure and use directory title as sidebar heading
    - Added `_setInitialPageTitle()` to set initial page title from top-level directory title on SPA load
    - Added `_updatePageTitle()` to update page title dynamically from active sidebar link on navigation
    - Updated `_updateActiveNav()` to call `_updatePageTitle()` after setting active navigation state
  - webapp/view/jpulse-docs/index.shtml:
    - Updated sidebar heading to use dynamic `id="docs-nav-heading"` populated from API response

### W-121, v1.3.22, 2025-12-21: markdown: v1.3.21 bug fix for ignore files are accessible in jpulse-docs
- status: ✅ DONE
- type: Bug Fix
- objective: fix bug discovered after v1.3.21 release
- issue:
  - bug: files and directories specified in the `[ignore]` section of `docs/.markdown` are not excluded, and accessible:
    - docs/dev/roadmap.md
    - docs/dev/working
- deliverables:
  - .npmignore:
    - added `docs/dev/roadmap.md` and `docs/dev/working/` to exclude from npm package
    - files specified in `[ignore]` section of `docs/.markdown` are now excluded at build time
    - added comment noting sync requirement with `docs/.markdown` `[ignore]` section
  - bin/jpulse-update.js:
    - simplified to basic recursive copy (removed all filtering/ordering logic)
    - package already contains filtered docs (excluded files removed at build time via `.npmignore`)
    - no need to filter or reorder - just copy everything from package
    - updated comment to reflect `.npmignore` approach instead of prepack filtering

### W-068, v1.4.1, 2025-12-31: view: create left and right sidebars with components
- status: ✅ DONE
- type: Feature
- objective: define a flexible and extensible sidebar infrastructure
- brainstorming and design:
  - docs/dev/working/W-068-W-069-W-070-view-create-responsive-nav
  - docs/dev/working/W-068-sidebar-generalization.md
- design decisions:
  - sidebar components defined as components, not specific to left/right side
  - sidebar usage (which components, order) defined in `app.conf`
  - sidebar modes: off, always on, open/closed toggle
  - template override: site can add or replace templates via `site/webapp/view/components/site-sidebars.tmpl`
  - pages can set preferred open/closed state (markdown doc SPA wants open left sidebar)
  - user can resize sidebar width, persistenly stored in browser localStorage
  - intuitive indicators for sidebar resize
  - mobile support with different UX
  - fix /jpulse-docs/ markdown SPA to be based on new sidebar infrastructure
- deliverables:
  - webapp/app.conf:
    - Added complete sidebar configuration structure (left/right sidebars, components, mobile settings)
  - webapp/controller/handlebar.js:
    - Enhanced `{{components}}` helper to support dynamic component access: `{{components name=(this)}}`
    - Enables component iteration with `{{#each}}` loops
  - webapp/view/jpulse-header.tmpl:
    - Added sidebar component loading (jpulse-sidebars.tmpl, site-sidebars.tmpl)
  - webapp/view/jpulse-footer.tmpl:
    - Added sidebar HTML structure (left/right sidebars, separators, toggle buttons, backdrop)
    - Added sidebar initialization with configuration from app.conf
    - Added empty sidebar content detection
  - webapp/view/jpulse-common.js:
    - Implemented complete jPulse.UI.sidebars API (~2,500 lines)
    - Control methods: open(), close(), toggle(), getState()
    - Preferred state: setPreferredState() with localStorage preference control
    - Component init: initComponent() for dynamic page-specific content
    - Custom containers: attachLeftSidebarTo(), attachRightSidebarTo()
    - User preferences: getUserPreference(), setUserPreference(), getUserPreferences()
    - Desktop: drag-to-resize, double-click toggle, toggle buttons, reflow/overlay behaviors
    - Mobile: fixed overlay, swipe gestures, touch targets, automatic hamburger menu close
    - Created jPulse.events pub/sub system for client-side component communication
  - webapp/view/jpulse-common.css:
    - Added complete sidebar styling (~650 lines)
    - Desktop layout: absolute positioning, transitions, drag handles
    - Mobile layout: fixed overlay with transforms, backdrop, touch-optimized buttons
    - Component styles: TOC, siteNav, utility states (empty, error, loading)
    - Mode-specific styles: 'toggle' with controls, 'always' without controls
  - webapp/view/components/jpulse-sidebars.tmpl:
    - Created framework sidebar components (496 lines)
    - sidebar.siteNav: Site navigation from jPulse.UI.navigation with polling
    - sidebar.toc: Table of contents with configurable selectors, heading normalization, SPA updates
    - sidebar.pageComponentLeft/Right: Generic containers for page-specific content
  - webapp/view/jpulse-navigation.js:
    - Fixed URLs to include index.shtml for consistency (admin, user, examples sections)
  - webapp/view/jpulse-docs/index.shtml:
    - Migrated to new sidebar infrastructure
    - Replaced old .jp-docs-nav with sidebar.pageComponentLeft integration
    - Added setPreferredState('left', 'open') for better docs UX
    - Added attachLeftSidebarTo() for positioning below tab bar
  - webapp/translations/en.conf, de.conf:
    - Added i18n strings for sidebar components (empty state, TOC, siteNav)
  - site/webapp/view/hello/site-development.shtml:
    - Added setup card with detection for site CSS/JS files
    - Added JavaScript to hide setup card when both files are loaded
  - docs/sidebars.md:
    - Created comprehensive user guide (726 lines)
    - Configuration, modes, components, API, desktop/mobile UX, examples, troubleshooting
  - docs/sidebar-components.md:
    - Created developer guide for custom components (703 lines)
    - Component structure, creation guide, examples, best practices, advanced patterns
  - docs/README.md:
    - Added sidebars cross-links to Site Development section
  - docs/template-reference.md:
    - Added sidebar cross-link after Navigation Customization
  - docs/jpulse-ui-reference.md:
    - Added complete jPulse.UI.sidebars API reference section
  - docs/front-end-development.md:
    - Added Sidebars to UI Widgets list
  - docs/site-customization.md:
    - Added Sidebar Customization section with config and component examples
  - docs/.markdown:
    - Added sidebars.md and sidebar-components.md to publish list

### W-122, v1.4.2, 2026-01-01: markdown: v1.4.1 bug fix for ignore files still accessible in jpulse-docs
- status: ✅ DONE
- type: Bug Fix
- objective: fix regression bug discovered after v1.4.1 release that was supposed to be fixed in v1.3.22
- issue:
  - bug: files and directories specified in the `[ignore]` section of `docs/.markdown` are not excluded, and accessible:
    - docs/dev/roadmap.md
    - docs/dev/working
- deliverables:
  - bin/configure.js:
    - Added `loadMarkdownIgnorePatterns()` function to read and parse `.markdown` `[ignore]` section
    - Added `shouldIgnore()` function to check if files/directories should be excluded
    - Modified `copyDirectory()` to accept optional `shouldSkip` filter function
    - Added explicit docs copy section with filtering after webapp copy during fresh installs
    - Filters files based on `.markdown` `[ignore]` patterns to exclude `docs/dev/roadmap.md` and `docs/dev/working/` from site deployments
    - Fixed symlink handling: use `lstatSync()` instead of `existsSync()` to properly detect and remove symlinks before copying
    - Added `isFrameworkDevRepo()` safeguard to prevent accidental execution in framework development repository
  - bin/jpulse-update.js:
    - Added `loadMarkdownIgnorePatterns()` function to read and parse `.markdown` `[ignore]` section
    - Added `shouldIgnore()` function to check if files/directories should be excluded
    - Modified `syncDirectory()` to accept optional `shouldSkip` filter function
    - Updated docs copy section to use filtering based on `.markdown` `[ignore]` patterns
    - Filters files during upgrade to exclude `docs/dev/roadmap.md` and `docs/dev/working/` from site deployments
    - Fixed symlink handling: use `lstatSync()` instead of `existsSync()` to properly detect and remove symlinks before copying
    - Added `isFrameworkDevRepo()` safeguard to prevent accidental execution in framework development repository

### W-123, v1.4.3, 2026-01-03: view: sidebars with open on hover mode and auto-close
- status: ✅ DONE
- type: Feature
- objective: qick way to access and use the Table of Contents in the right sidebar
- prerequisites:
  - docs/dev/working/W-068-sidebar-generalization.md
- spec:
  - add desktop hover mode to sidebars, to allow instant access without toggle clicks
  - in hover / overlay behavior: use sticky viewport positioning so a long page can be read while TOC stays quickly accessible
  - add auto-close behavior (desktop + mobile) when clicking a link inside the sidebar and when clicking outside the sidebar
  - keep existing toggle and always modes behavior unchanged
  - keep mobile UX unchanged (mobile does not use hover mode)
- deliverables:
  - webapp/view/jpulse-common.js:
    - add hover mode (open on hover over hover zone; close on leave with delay)
    - add sticky layout for overlay / hover behavior (stable viewport margins)
    - add auto-close on link click and outside click when enabled
    - support separator drag-to-resize in hover mode (apply width on drag end)
  - webapp/view/jpulse-common.css:
    - add hover zone styles and hover indication
    - add sticky sidebar / separator styles (position fixed; JS controlled top/bottom)
    - ensure closed/open animations work with sticky positioning
    - add inner scroll wrapper styles and content fade behavior
  - webapp/view/jpulse-footer.tmpl:
    - add inner scroll wrapper container for sidebar content
  - webapp/app.conf:
    - enable right sidebar hover mode for docs use cases and configure auto close on click
  - docs/sidebars.md:
    - document hover mode, sticky behavior, and auto-close on click

### W-124, v1.4.4, 2026-01-04: view: auto-discovery of sidebar and icon components at plugin and site level
- status: ✅ DONE
- type: Feature
- objective: auto-discover and include all components at all levels (framework, plugins, site)
- bug fixes:
  - Fixed `{{#each file.list "pattern"}}` not detecting `file.list` helper (was checking `args._helper` instead of `args._target`)
  - Fixed `{{#each (file.list "pattern")}}` subexpression syntax not working (JSON string result not being parsed)
  - Fixed `file.include` not using plugin-aware path resolution (changed from `resolveModule` to `resolveModuleWithPlugins`)
- features:
  - Auto-discovery of component templates from framework, plugins, and site using `{{#each file.list "components/*.tmpl"}}`
  - Component template files with the same name are overridden at a higher level:
    ```
    webapp/view/components/*tmpl                 (jPulse Framework level)
      ↓
    plugins/[name]/webapp/view/components/*tmpl  (Plugin level)
      ↓
    site/webapp/view/components/*tmpl            (Site level)
    ```
  - Enhanced `{{#each}}` to support `file.list` helper directly: `{{#each file.list "pattern"}}`
  - Enhanced `{{#each}}` to support subexpression syntax: `{{#each (file.list "pattern")}}`
- deliverables:
  - webapp/controller/handlebar.js:
    - Fixed `_handleBlockEach()` to detect `file.list` in `args._target` instead of `args._helper`
    - Added JSON string parsing for subexpression results in `{{#each}}` (handles `{{#each (file.list "pattern")}}`)
    - Changed `_handleFileInclude()` to use `PathResolver.resolveModuleWithPlugins()` for plugin support
  - webapp/view/jpulse-header.tmpl:
    - Simplified component includes to auto-discovery loop: `{{#each file.list "components/*.tmpl"}} {{file.include this}} {{/each}}`
    - Removed individual `{{file.include}}` statements for `svg-icons.tmpl` and `jpulse-sidebars.tmpl`

### W-125, v1.4.5, 2026-01-05: docs: handlebar docs improvements, navigation improvements
- status: ✅ DONE
- type: Feature
- objective: more usable docs
- deliverables:
  - docs/handlebars.md:
    - Restructured for readability and TOC navigation: moved Context Variables up, reorganized helpers into Regular/Block Helpers sections with clearer headings and examples, and expanded best-practices guidance
  - webapp/view/jpulse-examples/api.shtml:
    - Converted sections to numbered, long-form layout for better scanning and navigation
  - webapp/view/jpulse-examples/forms.shtml:
    - Converted sections to numbered, long-form layout for better scanning and navigation
    - Marked heading-based demo section(s) to omit demo headings from the sidebar TOC (keeps anchor demo intact)
  - webapp/view/jpulse-examples/handlebars.shtml:
    - Converted sections to numbered, long-form layout; improved subexpression examples and overall learnability
  - webapp/view/jpulse-examples/layout.shtml:
    - Converted sections to numbered, long-form layout for better scanning and navigation
    - Marked typography demo heading samples to omit them from the sidebar TOC (keeps heading samples intact)
  - webapp/view/jpulse-examples/ui-widgets.shtml:
    - Converted sections to numbered, long-form layout; improved content hierarchy (h2/h3) for TOC friendliness
    - Marked heading anchor demo section to omit demo headings from the sidebar TOC (keeps anchor demo intact)
  - webapp/view/jpulse-common.js:
    - Site nav dropdown: added scroll support for flyout submenus when too tall to fit the viewport
    - Site nav dropdown: added portal overlay for deeper flyouts to avoid clipping when parent menu is scrollable
    - Docs pulldown: fixed key collisions in dynamic docs page registration so all docs submenus render (not only last one, e.g. Dev)
    - Mobile hamburger: fixed clipping for large/nested docs menus by computing submenu heights dynamically and allowing parent expansion when deeper levels open
  - webapp/view/jpulse-common.css:
    - Site nav dropdown: added styles for portal overlay flyout menus
    - Mobile hamburger: updated submenu expand behavior to avoid clipping tall lists
  - webapp/view/components/jpulse-sidebars.tmpl:
    - TOC: added "Back to top" link and behavior
    - TOC: added opt-out to omit headings inside `.jp-toc-ignore` / `data-toc-ignore="true"` containers
  - webapp/app.conf:
    - TOC: expanded default heading selector to include h4
  - webapp/view/jpulse-footer.tmpl:
    - Accessibility: i18n-backed aria-labels for hamburger and sidebar toggles; added keyboard shortcut for scroll-to-top
  - webapp/translations/en.conf, webapp/translations/de.conf:
    - Added i18n strings for sidebar/mobile navigation aria-labels and TOC "back to top"
  - docs/sending-email.md:
    - Removed outdated document version footer block

### W-126, v1.4.6, 2026-01-06: view: create tooltip on any element with jp-tooltip class
- status: ✅ DONE
- type: Feature
- objective: easy way to add nice looking tooltips to any element
- spec:
  - add class="jp-tooltip" to any element with data-tooltip=""
  - auto initialize and initialize on demand, such as when added dynamically in a dialog box
  - position: automatic based on viewport, configurable via data-tooltip-position and app.conf
- deliverables:
  - webapp/view/jpulse-common.css: Tooltip styles with bubble-like appearance
  - webapp/view/jpulse-common.js: Tooltip API with initAll() and init() methods, container support
  - webapp/view/jpulse-examples/ui-widgets.shtml: Tooltip examples section
  - docs/jpulse-ui-reference.md: Tooltip component documentation
  - docs/CHANGELOG.md: v1.4.6 release notes
  - webapp/app.conf: Tooltip configuration under view.jPulse.UI.tooltip

### W-127, v1.4.7, 2026-01-07: handlebars: add math helpers
- status: ✅ DONE
- type: Feature
- objective: perform simple math operations
- implementation: variadic helpers for consistency ("don't make me think" paradigm)
- helpers:
  - `{{add a b c ...}}` - sum all arguments (1+ args)
    - `{{add 2 4 6}}` → 12
    - `{{add 10 vars.bonus vars.extra}}` → sum of all
  - `{{subtract a b c ...}}` - first arg minus all subsequent args (1+ args)
    - `{{subtract 10}}` → 10
    - `{{subtract 10 3}}` → 7
    - `{{subtract 10 3 2}}` → 5 (10 - 3 - 2)
  - `{{multiply a b c ...}}` - multiply all arguments (1+ args)
    - `{{multiply 2 3 4}}` → 24
    - `{{multiply vars.price vars.quantity vars.tax}}` → product of all
  - `{{divide a b c ...}}` - first arg divided by all subsequent args (1+ args)
    - `{{divide 100}}` → 100
    - `{{divide 100 4}}` → 25
    - `{{divide 100 4 2}}` → 12.5 (100 / 4 / 2)
    - handle division by zero: return 0 with warning log
  - `{{mod a b}}` - modulo operation (exactly 2 args)
    - `{{mod 17 5}}` → 2
  - `{{round value}}` - round to nearest integer (exactly 1 arg)
    - `{{round 3.7}}` → 4
    - `{{round (divide 22 7)}}` → 3
  - `{{floor value}}` - round down to integer (exactly 1 arg)
    - `{{floor 3.7}}` → 3
    - `{{floor (divide 22 7)}}` → 3
  - `{{ceil value}}` - round up to integer (exactly 1 arg)
    - `{{ceil 3.2}}` → 4
    - `{{ceil (divide 22 7)}}` → 4
  - `{{min a b c ...}}` - minimum of all arguments (1+ args)
    - `{{min 5 3 8 2}}` → 2
    - `{{min vars.price1 vars.price2 vars.price3}}` → lowest price
  - `{{max a b c ...}}` - maximum of all arguments (1+ args)
    - `{{max 5 3 8 2}}` → 8
    - `{{max vars.score1 vars.score2 vars.score3}}` → highest score
- examples:
  - simple: `{{add 10 20}}` → 30
  - with variables: `{{add (file.timestamp "file.js") 1000}}`
  - nested: `{{add 2 (multiply 4 6) vars.sum}}`
  - complex: `{{divide (add 100 50) 3}}` → 50
  - in conditionals: `{{#if (gt (add user.score bonus) 100)}}High score!{{/if}}`
- return type: numbers (not strings) for math operations
- type coercion: convert strings to numbers when possible (e.g., "5" → 5)
- error handling:
  - division by zero: return 0 with warning log
  - invalid inputs: return 0 with warning log
  - single arg for variadic: return that arg (for subtract, divide, add, multiply)
- deliverables:
  - webapp/controller/handlebar.js:
    - implemented all 10 math helpers (add, subtract, multiply, divide, mod, round, floor, ceil, min, max)
    - grouped implementation: _handleMathUnary (round, floor, ceil), _handleMathBinary (mod), _handleMathVariadic (add, subtract, multiply, divide, min, max)
    - added all helper cases to switch statement in _evaluateRegularHandlebar()
    - added all 10 helper entries to HANDLEBARS_DESCRIPTIONS array for auto-documentation
  - docs/handlebars.md:
    - documented all 10 math helpers with syntax, descriptions, and examples
    - added Math Helpers section after Variable Helpers
    - documented type coercion and error handling behavior
  - webapp/view/jpulse-examples/handlebars.shtml:
    - added interactive examples section (section 7) with live demonstrations for all 10 helpers
    - reorganized sections: regular helpers (1-8) first, then block helpers (9-13)
    - moved Context Variables section to section 3 (after Basic Variables)
    - moved Nested Handlebars to section 13 (last, as advanced topic)
  - webapp/tests/unit/controller/handlebar-math-helpers.test.js:
    - created comprehensive unit tests with 50+ test cases covering all 10 helpers, variadic operations, error handling, nested expressions, type coercion

### W-128, v1.4.8, 2026-01-08: handlebars: add string.* helpers namespace, refactor math.* helpers
- status: ✅ DONE
- type: Feature
- objectives:
  - add string manipulation helpers organized under string.* namespace (consistent with file.*)
  - refactor existing math helpers to math.* namespace for consistency
- implementation: grouped helpers under string.* namespace for consistency and organization
- helpers (all under string.* namespace):
  - `{{string.concat "themes/" user.preferences.theme ".css"}}` - concatenate strings (variadic, 1+ args)
  - `{{string.default user.preferences.theme "light"}}` - return first non-empty value (variadic, 1+ args)
  - `{{string.replace "hello world" "world" "jPulse"}}` - replace substring (3 args: string, search, replace)
  - `{{string.substring "hello world" 0 5}}` - extract substring (3 args: string, start, length)
  - `{{string.padLeft "5" 3 "0"}}` - pad left with character (3 args: string, length, padChar) → "005"
  - `{{string.padRight "5" 3 "0"}}` - pad right with character (3 args: string, length, padChar) → "500"
  - `{{string.startsWith "hello" "he"}}` - check if string starts with (2 args) → "true"/"false"
  - `{{string.endsWith "hello" "lo"}}` - check if string ends with (2 args) → "true"/"false"
  - `{{string.contains "hello" "ell"}}` - check if string contains substring (2 args) → "true"/"false"
- use cases:
  - theme CSS path: `{{string.concat "themes/" (string.default user.preferences.theme "light") ".css"}}`
  - fallback values: `{{string.default user.preferences.language "en"}}`
  - conditional string building: `{{string.concat "prefix-" value "-suffix"}}`
  - string manipulation: `{{string.replace user.name " " "-"}}` (replace spaces with dashes)
  - padding: `{{string.padLeft user.id 6 "0"}}` (zero-pad ID to 6 digits)
  - string checks: `{{#if (eq (string.startsWith url.path "/admin") "true")}}Admin area{{/if}}`
- refactor 10 math helpers from individual helpers to math.* namespace:
  - `{{math.add a b c ...}}` - sum all arguments (1+ args)
  - `{{math.subtract a b c ...}}` - first arg minus all subsequent args (1+ args)
  - `{{math.multiply a b c ...}}` - multiply all arguments (1+ args)
  - `{{math.divide a b c ...}}` - first arg divided by all subsequent args (1+ args)
  - `{{math.mod a b}}` - modulo operation (exactly 2 args)
  - `{{math.round value}}` - round to nearest integer (exactly 1 arg)
  - `{{math.floor value}}` - round down to integer (exactly 1 arg)
  - `{{math.ceil value}}` - round up to integer (exactly 1 arg)
  - `{{math.min a b c ...}}` - minimum of all arguments (1+ args)
  - `{{math.max a b c ...}}` - maximum of all arguments (1+ args)
- implementation notes:
  - grouped implementation similar to math.* helpers
  - single handler function `_handleString()` that routes to specific operations based on helper name
  - extract operation from `string.concat` → `concat`
  - document grouped together in helper table (like file.*)
- additional string helpers to consider (out of scope):
  - `{{string.uppercase "text"}}` - convert to uppercase
  - `{{string.lowercase "text"}}` - convert to lowercase
  - `{{string.trim "  text  "}}` - remove leading/trailing whitespace
  - `{{string.capitalize "text"}}` - capitalize first letter (already exists in jpulse-common.js)
  - `{{string.slugify "Hello World"}}` - convert to URL-friendly slug (already exists in jpulse-common.js)
  - `{{string.escapeHtml "<script>"}}` - escape HTML entities (already exists in jpulse-common.js)
- deliverables:
  - webapp/controller/handlebar.js:
    - string helpers: implement _handleString() function with routing to specific operations
    - string helpers: add all string.* helper cases to switch statement
    - string helpers: add individual string.* entries to HANDLEBARS_DESCRIPTIONS (one per helper, sorted alphabetically)
    - math refactoring: change all math helper cases from standalone to math.* namespace (e.g., 'add' → 'math.add')
    - math refactoring: update handler functions to extract operation name from 'math.add' → 'add'
    - math refactoring: replace single grouped entry in HANDLEBARS_DESCRIPTIONS with 10 individual math.* entries (one per helper, sorted alphabetically)
  - docs/handlebars.md:
    - string helpers: document all string.* helpers with examples, list individually in helper table (sorted alphabetically)
    - math refactoring: update all math helper examples to use math.* namespace
    - math refactoring: update Math Helpers section examples to use math.* namespace
  - webapp/view/jpulse-examples/handlebars.shtml:
    - string helpers: add interactive examples for all string.* helpers
    - math refactoring: update all math helper examples to use math.* namespace
  - webapp/tests/unit/controller/handlebar-string-helpers.test.js:
    - add comprehensive unit tests for all string.* helpers (59 test cases)
  - webapp/tests/unit/controller/handlebar-math-helpers.test.js:
    - math refactoring: update all test cases to use math.* namespace

### W-129, v1.4.9, 2026-01-09: view: create themes infrastructure
- status: ✅ DONE
- type: Feature
- objectives: provide a framework where plugin and site delelopers can create and publish themes
- features:
  - framework ships with two built-in themes: light (default) and dark
  - users can select preferred theme in profile settings
  - theme preference persists across sessions
  - plugin developers can create custom themes with auto-discovery
  - site developers can create site-specific themes with highest priority
  - theme discovery follows priority: Framework → Plugins → Site (conflict resolution)
  - CSS variable standardization for consistent theming across all components
  - dynamic theme CSS loading (only selected theme loaded to browser)
  - theme metadata in separate JSON files (all fields required: name, label, description, author, version, source)
  - single preview image required: `{name}.png` (500x200)
  - dynamic themes documentation table (%DYNAMIC{themes-list-table}%) using a 2-column layout (Preview + Details) for mobile friendliness
  - theme discovery service with caching for performance
  - schema extension: discovered themes automatically added to user preferences enum
  - SVG icons automatically adapt to light/dark themes
  - theme fallback to light theme for unauthenticated users
- deliverables:
  - webapp/view/jpulse-common.css:
    - Standardized 49 CSS variables (`--jp-theme-*`) for consistent theming across all components
    - All components converted to use theme variables (no hardcoded colors)
    - Dark theme support with `[data-theme="dark"]` overrides
    - Prism.js syntax highlighting theme switching (light/dark CSS files)
    - Theme-friendly page author checklist added to style-reference.md
  - webapp/view/themes/light.css, light.json, light.png:
    - Default light theme (uses `:root` defaults, empty CSS file)
    - Theme metadata JSON with required fields (name, label, description, author, version, source)
    - 500x200 preview image
  - webapp/view/themes/dark.css, dark.json, dark.png:
    - Dark theme with full CSS variable overrides
    - Theme metadata JSON with required fields
    - 500x200 preview image
  - webapp/utils/theme-manager.js:
    - ThemeManager class with initialize(), discoverThemes(), extendUserModelSchema(), getThemeColorScheme() methods
    - Auto-discovery from framework, plugins, and site with priority resolution (site > plugins > framework)
    - Theme metadata validation (required fields: name, label, description, author, version, source)
    - Color scheme detection from CSS (`--jp-theme-color-scheme` or `color-scheme`)
    - Caching integration with cache-manager for performance
  - webapp/utils/bootstrap.js:
    - ThemeManager initialization (Step 16.1)
    - UserModel schema extension with discovered themes (Step 16.2)
    - Error handling for theme discovery failures
  - webapp/view/jpulse-header.tmpl:
    - Dynamic theme CSS loading using `string.default` and `string.concat` helpers
    - Prism CSS selection based on `appConfig.system.colorScheme` (prism-light.css / prism-dark.css)
    - Fallback to `appConfig.system.defaultTheme` for unauthenticated users
  - webapp/controller/handlebar.js:
    - Added `appConfig.system.defaultTheme` (from `appConfig.utils.theme.default`, validated)
    - Added `appConfig.system.htmlAttrs` (computed `lang=".." data-theme=".."` attributes)
    - Added `appConfig.system.colorScheme` (theme's color scheme: 'light' or 'dark')
    - Added `appConfig.system.themes` (safe list of discovered themes with metadata)
    - Enhanced `contextFilter.alwaysAllow` for secure exposure to unauthenticated users
    - Refactored `_filterContext()` to use `CommonUtils.getValueByPath/setValueByPath` (dot-notation utilities)
  - webapp/model/user.js:
    - Updated `baseSchema.preferences.theme.default` to use validated `global.appConfig.utils.theme.default` (config-driven)
    - Updated `applyDefaults()` to use config-driven default theme for new users
  - webapp/controller/user.js:
    - Updated `signup` payload to use `global.appConfig.utils.theme.default` for new user creation
  - webapp/controller/markdown.js:
    - Added `themes-list-table` generator (2-column Markdown table: Preview + Details)
    - Added `themes-list` generator (bullet list format)
    - Added `themes-count` generator (count with optional source filtering)
    - Added `themes-default` generator (returns default theme ID from app.conf)
    - Source filtering support (`source="framework"`, `source="plugin"`, `source="site"`)
    - Proper sorting by source priority (framework=0, plugin=1, site=2) then name
  - webapp/controller/view.js:
    - Static asset serving for `.png` and `.json` theme files (bypasses Handlebars processing)
    - Proper content-type headers for theme preview images and metadata
  - webapp/utils/common.js:
    - Added `getValueByPath(obj, keyPath)` for safe dot-notation object access
    - Added `setValueByPath(obj, keyPath, value)` for safe dot-notation object assignment
    - Added `deleteValueByPath(obj, keyPath)` for safe dot-notation object deletion
    - Used by handlebar.js and i18n.js for consistent path resolution
  - webapp/utils/i18n.js:
    - Refactored to use `CommonUtils.getValueByPath/setValueByPath` instead of local implementations
  - webapp/static/common/prism/prism-light.css:
    - Renamed from `prism.css` (default light theme)
  - webapp/static/common/prism/prism-dark.css:
    - New dark theme CSS (Prism Okaidia theme) for syntax highlighting in dark mode
  - webapp/view/user/profile.shtml:
    - Instant theme preview on dropdown change (updates `data-theme`, theme CSS, Prism CSS)
    - Theme persists after save without page reload
    - Dynamic theme color scheme detection for Prism CSS switching
  - webapp/view/jpulse-examples/themes.shtml:
    - New themes example page with live theme selector
    - Theme preview canvas (500x200) for consistent screenshot generation
    - Screenshot checklist and instructions for theme authors
    - Installed themes table with previews and metadata
    - Horizontal scroll support for mobile
  - webapp/view/components/svg-icons.tmpl:
    - Added `jpIcons.themesSvg` component (moon/sun icon)
  - webapp/view/jpulse-navigation.js:
    - Added themes.shtml entry to jPulseExamples.pages and jPulseExamplesSubTabs
  - All .shtml files (25+ files):
    - Updated `<html>` tag to use `{{appConfig.system.htmlAttrs}}` for centralized attributes
    - Supports future extension (e.g., `dir` attribute for RTL)
  - docs/themes.md:
    - Complete theme system documentation
    - Dynamic themes table using `%DYNAMIC{themes-list-table}%`
    - Theme preference explanation
    - Theme file locations and priority
    - Theme structure and metadata requirements
    - Creating themes guide with links
  - docs/plugins/creating-themes.md:
    - Plugin developer guide for creating themes
    - Theme file structure (CSS, JSON, PNG)
    - CSS variable reference
    - Preview screenshot instructions (500x200, using themes example page)
    - Theme naming conventions and metadata schema
    - Color scheme configuration (`--jp-theme-color-scheme`)
  - docs/style-reference.md:
    - Updated Theme System section with current implementation details
    - Theme-friendly page author checklist (do/don't guidance)
    - CSS variable documentation
    - Prism CSS selection explanation
    - Links to themes.md and creating-themes.md
  - docs/api-reference.md:
    - Updated `/api/1/user/enums` section to document theme IDs (not full metadata)
    - Clarified that full metadata is available via dynamic generators in docs
  - webapp/tests/unit/utils/common-utils.test.js:
    - Comprehensive unit tests for `getValueByPath`, `setValueByPath`, `deleteValueByPath` (dot-notation utilities)
  - webapp/tests/unit/controller/handlebar-appconfig-alwaysallow.test.js:
    - Unit tests for `contextFilter.alwaysAllow` logic (secure exposure to unauthenticated users)
  - webapp/tests/unit/controller/markdown-themes-dynamic.test.js:
    - Unit tests for theme-related dynamic content generators (themes-list-table, themes-list, themes-count, themes-default)
  - webapp/tests/unit/controller/view-static-assets.test.js:
    - Unit tests for static asset serving (.png, .json, .svg files)
  - webapp/tests/unit/user/user-signup.test.js:
    - Updated to use config-driven default theme
  - webapp/tests/unit/user/user-basic.test.js:
    - Updated to use config-driven default theme
  - webapp/app.conf:
    - Added `utils.theme.default` configuration (default: 'light')
    - Added `contextFilter.alwaysAllow` list for secure `appConfig.system.*` exposure
    - Updated cache configuration path to `utils.theme.cache`

### W-130, v1.4.10, 2026-01-10: docs: syntax highlighting for code blocks
- status: ✅ DONE
- type: Feature
- objective: better way to understand code through automatic syntax highlighting
- features:
  - jPulse.UI.docs: all triple backtick sections are initialized with Prism syntax highlighting based on specified language
  - ViewController: make raw extensions (those not handlebar-expanded) configurable in app.conf
- deliverables:
  - webapp/view/jpulse-common.js:
    - Added Prism.highlightAll() call after markdown rendering (marked.js already adds language-* classes automatically, no custom renderer needed)
  - webapp/view/jpulse-common.css:
    - Removed !important color override that was preventing Prism token colors from showing
  - webapp/controller/view.js:
    - Made raw extensions (binary/text) configurable via app.conf controller.view.rawExtensions
    - Made content types configurable via app.conf controller.view.contentTypes
  - webapp/app.conf:
    - Added controller.view.rawExtensions configuration (binary and text arrays)
    - Added controller.view.contentTypes configuration (mapping of extensions to MIME types)

### W-131, v1.4.11, 2026-01-11: view: broadcast message system, add handlebars date helpers
- status: ✅ DONE
- type: Feature
- objective: admin can broadcast message to all users, such as "scheduled downtime this Saturday 10am-12pm"
- enhancements:
  - show yellow broadcast message just below banner
  - broadcast message div has `－` / `＋` button on left to minimize message
    - reduced to `＋` button, when clicked restores the message div
    - minimize status is remembered across page loads (localStorage)
    - minimize status is reset after N hours site config setting (nag time, per-user)
  - broadcast message can be set in site config
    ```
    broadcast: {
        enable: { type: 'boolean', default: false },
        message: { type: 'string', default: '' },     // broadcast message (HTML supported)
        nagTime: { type: 'number', default: 4 },      // hours, 0 to disable
        disableTime: { type: 'number', default: 0 },  // hours, 0 for no auto-disable (server-side)
        enabledAt: { type: 'date', default: null }    // timestamp of when enabled
    }
    ```
  - auto-disable functionality (server-side, global timer)
  - context normalization for Date objects in Handlebars (normalizeForContext utility)
  - left-to-right animation (scaleX transform)
  - button always visible with minimal styling
  - proper z-index hierarchy (below site dropdown, above sidebar)
  - new handlebar date helpers:
    - `{{date.now}}` - current time as a Unix timestamp (milliseconds)
    - `{{date.format dateVar format="%DATE% %TIME%"}}` - format date value to string (UTC)
      - tokens: `%DATE%`, `%TIME%`, `%DATETIME%`, `%Y%`, `%M%`, `%D%`, `%H%`, `%MIN%`, `%SEC%`, `%MS%`, `%ISO%` (default)
    - `{{date.parse "2026-01-10T14:35:12"}}` - parse date value (Date object, ISO string, or timestamp) to Unix timestamp
- deliverables:
  - webapp/model/config.js:
    - Added broadcast schema with enable, message, nagTime, disableTime, enabledAt
    - Updated validation, defaults, and updateById logic for enabledAt timestamp
  - webapp/controller/config.js:
    - Removed hardcoded defaults (single source of truth in model)
  - webapp/controller/handlebar.js:
    - Added `{{date.now}}`, `{{date.format}}`, and `{{date.parse}}` helpers
    - Added normalizeForContext() usage for siteConfig
  - webapp/utils/common.js:
    - Added normalizeForContext() static method for Handlebars context normalization
  - webapp/view/admin/config.shtml:
    - Added broadcast message configuration UI (enable, message, nagTime, disableTime)
  - webapp/view/jpulse-footer.tmpl:
    - Added broadcast message HTML and JavaScript initialization
  - webapp/view/jpulse-common.css:
    - Added broadcast message styles with animation
  - webapp/translations/en.conf, de.conf:
    - Added i18n keys for broadcast configuration
  - docs/site-administration.md:
    - Complete documentation for broadcast message feature
  - webapp/tests/unit/controller/handlebar-date-helpers.test.js:
    - Unit tests for date.now, date.parse, and date.format helpers (19 tests total)
    - Renamed from handlebar-time-helpers.test.js
  - webapp/tests/unit/utils/common-utils-advanced.test.js:
    - Unit tests for normalizeForContext (10 tests)
  - webapp/tests/unit/config/config-model.test.js:
    - Unit tests for broadcast validation (6 tests)
  - webapp/tests/unit/config/config-basic.test.js:
    - Updated tests for broadcast schema structure









-------------------------------------------------------------------------
## 🚧 IN_PROGRESS Work Items

### W-132, v1.4.12, 2026-01-12: handlebars: add date.fromNow helper, add local timezone to date.format helper
- status: ✅ DONE
- type: Feature
- objectives:
  - ability to specify a count down broadcast message like "scheduled downtime this Saturday, starting in 4 days, 23 hours"
  - support local timezone formatting for local server time and local browser time
- features:
  - `date.fromNow` helper: format relative time from now (e.g., "in 6 days, 13 hours" or "2 hours ago")
    - format parameter: `long`/`short` with units (1-3), default: `long 2`
    - supports past and future dates with proper prefixes/suffixes
    - i18n support with translations for all time units and templates
    - handles very recent times (< 1 second) with moment translations
  - `date.format` timezone support: there are two local times:
    - server local time
    - browser local time
      - browser sets a cookie with the tz string, so that the server knows the tz of the user (auth or not)
  - add new timezone parameter to `date.format`:
    - `timezone="server"` -- local server timezone
    - `timezone="browser"` -- browser server timezone (or `"view"`, `"client"`, `"user"`?)
    - `timezone="America/Los_Angeles"` -- a specific tz database time zone
    - default: UTC
  - ISO format with timezone offset: when timezone is specified, ISO format shows offset (e.g., `-08:00`, `+09:00`) instead of `Z` suffix
- deliverables:
  - webapp/view/jpulse-common.js:
    - automatic timezone detection client-side in jpulse-common.js, stored in cookie (30-day TTL, auto-updates if timezone changes)
    - runs in jPulse.dom.ready() callback
  - webapp/controller/handlebar.js:
    - added date.fromNow helper: _handleDateFromNow() function with i18n support
    - added timezone support in _handleDateFormat()
    - added helper functions _getTimezoneOffset(), _getServerTimezone(), _parseCookie()
    - simplified offset calculation using sv-SE locale format and Date parsing
    - no caching of offset (calculated per call, handles DST correctly)
    - fallback: browser timezone falls back to server timezone if cookie not available
    - ISO format timezone offset handling (replaces Z with +/-HH:MM format)
  - webapp/translations/en.conf, de.conf:
    - added controller.handlebar.date.fromNow translation keys (pastRange, futureRange, pastMoment, futureMoment, long/short units, separator)
  - webapp/tests/unit/controller/handlebar-date-helpers.test.js:
    - added 18 tests for date.fromNow helper (all format options, past/future, edge cases)
    - added 12 tests for date.format timezone support (server, browser, specific timezone, ISO offset, aliases, error handling)
  - docs/handlebars.md:
    - updated date.format documentation with timezone examples and parameter table
    - added complete date.fromNow documentation section with format parameter table and use cases








to-do:



### Pending


old pending:
- fix responsive style issue with user icon right margin, needs to be symmetrical to site icon
- offer file.timestamp and file.exists also for static files (but not file.include)
- logLevel: 'warn' or 1, 2; or verboseLogging: true
- how to define the time of valid session?

### Potential next items:
- W-0: handlebars: add array access functions
- W-0: i18n: site specific and plugin specific translations & vue.js SPA support
- W-0: deployment: docker strategy
- W-0: auth controller: authentication with OAuth2 (see W-109 for flow design)
- W-0: auth controller: authentication with LDAP (see W-109 for flow design)
- W-0: auth controller: email verification plugin (see W-109 for flow design)

### Chat instructions

next work item: W-0...
- review task, ask questions if unclear
- suggest change of spec if any, goal is a good UX, good usability, good onboarding & learning experience for site admins and developers; use the "don't make me think" paradigm
- plan how to implement (wait for my go ahead)

release prep:
- run tests, and fix issues
- review git diff tt-diff.txt for accuracy and completness of work item
- assume release: W-132, v1.4.12
- update deliverables in W-132 work-items to document work done (don't change status, don't make any other changes to this file)
- update README.md (## latest release highlights), docs/README.md (## latest release highlights), docs/CHANGELOG.md, and any other doc in docs/ as needed (don't bump version, I'll do that with bump script)
- update commit-message.txt, following the same format (don't commit)
- update cursor_log.txt (append, don't replace)

### Misc

=== checkpoint commit ===
npm test
git add .
git commit -m 'Checkpoint commit 1 for: W-069, v0.9.2: view: create site navigation pulldown and hamburger menu'
git push

=== normal release & package build on github ===
npm test
git diff
git status
node bin/bump-version.js 1.4.12
git diff
git status
git add .
git commit -F commit-message.txt
git tag v1.4.12
git push origin main --tags

=== plugin release & package build on github ===
git diff
git status
node ../../bin/bump-version.js 1.0.0
git diff
git status
git add .
git commit -m "...."
git tag v1.0.0
git push origin main --tags
npm publish

=== on failed package build on github ===
git add .
git commit --amend --no-edit
git tag -d v1.3.0
git push origin :refs/tags/v1.3.0
git tag v1.3.0
git push origin main --force-with-lease
git push origin v1.3.0

=== amend commit message ===
git commit --amend -F commit-message.txt
git push --force-with-lease origin main

=== shof diff after git add ===
git diff --cached

=== Restart redis ===
brew services restart redis
redis-cli FLUSHDB
redis-cli MONITOR | grep "health:metrics" | head -20

=== Port 8080 in use ===
lsof -ti:8080

=== Tests how to ===
npm test -- --testPathPattern=jpulse-ui-navigation
npm test -- --verbose --passWithNoTests=false 2>&1 | grep "FAIL"




-------------------------------------------------------------------------
## 🕑 PENDING Work Items

### W-055: deployment: load balancer and multi-server setup
- status: 🕑 PENDING
- type: Feature
- objective: automated setup for load-balanced multi-server deployments
- prerequisits:
  - W-053, v0.7.3: deployment: configuration templates and validation - DONE
  - W-078: app api: provide health and metrics endpoints
- deliverables:
  - nginx load balancer configuration templates
  - multi-server deployment orchestration scripts
  - health check and failover configuration
  - session affinity and sticky session management
  - automated server provisioning and configuration sync
- benefits: enterprise-grade horizontal scaling automation

### W-056: deployment: MongoDB enterprise configurations
- status: 🕑 PENDING
- type: Feature
- objective: automated setup for enterprise MongoDB deployments
- depends on: W-053 (configuration templates)
- deliverables:
  - MongoDB replica set setup and configuration
  - database clustering and sharding configuration
  - backup and restore automation scripts
  - MongoDB monitoring and alerting setup
  - advanced user role management and database segmentation
- benefits: enterprise-grade database infrastructure automation

### W-057: deployment: production monitoring and alerting
- status: 🕑 PENDING
- type: Feature
- objective: comprehensive monitoring and alerting for production deployments
- depends on: W-053 (configuration templates)
- deliverables:
  - application performance monitoring setup
  - system resource monitoring (CPU, memory, disk)
  - log aggregation and analysis configuration
  - alerting rules for critical system events
  - dashboard configuration for operations teams
- benefits: proactive production system monitoring and issue detection

### W-084: security: harden security
- status: 🕑 PENDING
- type: Feature
- objective: meet and exceed expectations in enterprise
- prerequisites:
  - docs/security-and-auth.md: Security & Auth documentation (created in W-083)
- to-do:
  - CSRF Protection: Token-based CSRF protection for form submissions
  - Password Policy Enforcement: Configurable password complexity requirements (uppercase, lowercase, numbers, special chars)
  - Account Lockout: Automatic account lockout after N failed login attempts (configurable threshold)
  - Security Audit Logging: Enhanced logging for security events (failed logins, privilege escalations, etc.)
  - Session Management UI: User-facing session management (view active sessions, revoke sessions)
  - Security Headers Audit: Review and tighten CSP policy (reduce unsafe-inline, unsafe-eval)
  - Dependency Scanning: Automated vulnerability scanning for npm dependencies (npm audit integration)
  - Security Monitoring: Set up alerts for suspicious authentication patterns
  - MFA (Multi-Factor Authentication): SMS or authenticator app support (planned as plugin, see W-0 auth controller MFA)
  - OAuth2 Authentication: OAuth2 provider integration (planned as plugin, see W-0 auth controller OAuth2)
  - LDAP Authentication: LDAP/Active Directory integration (planned as plugin, see W-0 auth controller LDAP)

### W-081: tests: restructure for better maintainability
- status: 🕑 PENDING (post-1.0)
- type: Feature
- objective: better maintainability, less time on fixing tests
- problem: the current tests have fundamental design issues:
  - an additional test seems to always break unrelated tests
  - it takes a long time to create/fix tests
  - always issues with ES modules (import.meta, mocking)
  - always issues with appConfig (should be centralized in tests)
  - global state contamination between tests
  - more time and money spent on tests than actual code!
- solution:
  - centralize test configuration management
  - isolate global state between test suites
  - fix ES module mocking patterns
  - reduce test interdependencies
  - implement proper test teardown/cleanup
  - consider test architecture refactor (separate unit/integration more clearly)
- notes: deferred until after 1.0 release to focus on core functionality

### W-0: deployment: docker strategy
- status: 🕑 PENDING
- type: Feature
- new jpulse-docker project?

### W-0: redis: fix bugs when redis is disabled
- status: 🕑 PENDING
- type: Bug Fix
- prerequisite
  - W-076, v1.0.0: framework: redis infrastrucure for a scaleable jPulse Framework
- /hello-websocket/, /hello-app-cluster/ should work properly on its own page, that is no messaging to other tabs with same page open

### W-0: site config: extend config schema for site and plugin developers
- status: 🕑 PENDING
- type: Feature
- objective: offer a way to extend the schema for the site configuration in a data-driven way
- features:
  - the config can be extended in a similar way like the existing user schema extension feature
  - make it data driven, e.g. no need to modify webapp/view/admin/config.shtml when the schema is extended
- deliverables:
  - FIXME file:
    - FIXME summary

### W-0: handlebars: add array access functions
- status: 🕑 PENDING
- type: Feature
- objective: flexibility with array references
- syntax option 1: (idea)
  - `{{array.includes user.roles "admin"}}` -- test if user roles array includes "admin", returns true or false
  - `{{array.indexOf user.roles "admin"}}` -- get the index of "admin" in the user roles array, -1 if not found
  - `{{array.join user.roles ", "}}` -- join the user roles array items
  - `{{array.first user.roles}}` -- get the first item of the user roles array
- syntax option 2:
  - `{{user.roles.includes "admin"}}` -- test if user roles array includes "admin", returns true or false
  - `{{user.roles.indexOf "admin"}}` -- get the index of "admin" in the user roles array, -1 if not found
  - `{{user.roles.join ", "}}` -- join the user roles array items
  - `{{user.roles.first}}` -- get the first item of the user roles array
  - `{{user.roles.0}}` -- get the first item of the user roles array (alternative)
  - `{{user.roles.last}}` -- get the last item of the user roles array
  - `{{user.roles.-1}}` -- get the last item of the user roles array (alternative)
- implementation for option 2:
  - _getNestedProperty(obj, path, arg)
    - add third parameter arg
    - at any key of path, if value is undefined, value of previous key is of type array, and key is `includes`, `indexOf`, `first`, `last`, take special action to access array of previous key value
  - _evaluateRegularHandlebar()
    - in switch default, call _getNestedProperty(obj, path, parsedArgs._target)
  - _parseAndEvaluateArguments()
    - defer the positional argument trial to resolve as property to separate loop
      - call _getNestedProperty(currentContext, value, nextValue)
  - fix additional _getNestedProperty() calls accordingly
- deliverables:
  - FIXME file:
    - FIXME summary

### W-0: handlebars: block components with content slots
- status: 🕑 PENDING
- type: Feature
- objective: block-level components with inner content (Phase 2 of W-097, deferred after W-102)
- background: W-102 completed Phase 1 (inline components with parameters), but did not implement Phase 2 (block components with slots for wrapping arbitrary content)
- working document:
  - docs/dev/working/W-097-handlebars-use-components.md (see Phase 2 section)
- current limitation: components are inline-only ({{components.card title="Hello"}}), cannot wrap content
- proposed enhancement:
  - define:
    ```
    {{#component "card" title="Default"}}
      <div class="card-body">{{@content}}</div>
    {{/component}}
    ```
  - use:
    ```
    {{#components.card title="User Profile"}}
      <p>Welcome {{user.firstName}}!</p>
    {{/components.card}}
    ```
- benefits:
  - wrap arbitrary content in reusable containers
  - reduce duplication of wrapper HTML (cards, modals, panels)
  - similar to Vue.js slots or Web Components
- note: syntax updated from {{#use.*}} (removed in W-102) to {{#components.*}} (current standard)

### W-0: view: create jPulse.UI.progressbar
- status: 🕑 PENDING
- type: Feature
- objective: way to indicate the progress of a multi step process, such as multi-page forms
- deliverables:
  - ```
    jPulse.UI.progressbar('step-2', {
      steps: [
        { id: 'step-1', label: 'Step 1', url: '/signup/1' },
        { id: 'step-2', label: 'Step 2', url: '/signup/2' },
      ],
      disablePending: true,   // disable pending steps after current step
      width:          '100%'
    })
    ```
  - visual display:
    - ative step in blue background
    - done steps in light blue
    - pending steps in gray
  - example:
    | Step 1 | > | Step 2 | > | Step 3 |

### W-0: i18n: auto-discovery of changes with app update
- status: 🕑 PENDING
- type: Idea
- objective: avoid an app restart when translations are updated or added
- when a new language file is added to webapp/translations, the app sould pick it up dynamically, or by an admin requesting a web-based resources reload
- when a language file has been updated, the app should pick up the changes dynamically, or by an admin requesting a web-based resources reload

### W-0: i18n: site specific and plugin specific translations & vue.js SPA support
- status: 🕑 PENDING
- type: Feature
- objective: allow site admins/developers define site-specific and plugin specific translations for MPA and SPA
- how: deep merge of site/webapp/translations/* files into webapp/translations/

### W-0: config controller: nested site config
- status: 🕑 PENDING
- type: Idea
- objective: separate admin tasks for larger orgs, such as an admin for Sales, another for Engineering, or separate by divisions

### W-0: auth controller: signup with email confirmation
- status: 🕑 PENDING
- type: Feature
- possibly implement as plugin
- make it optional with a appConfig setting

### W-0: auth controller: authentication with OAuth2
- status: 🕑 PENDING
- type: Feature
- implement as plugin
- strategy to push OAuth fields into user doc

### W-0: auth controller: authentication with LDAP
- status: 🕑 PENDING
- type: Feature
- implement as plugin
- strategy to push/sync LDAP attributes into user doc

### W-0: i18n: utility app to manage translations
- status: 🕑 PENDING
- type: Idea
- objective: make it easy for translators to create & maintain language files
- web app:
  - select language
  - show hierarchy of translation
  - at each node, show default English text on top, selected language below
    - save on focus loss, or save button?
  - for view text (i18n.view.*) add link to jPulse app

### W-0:
- status: 🕑 PENDING
- type: Idea
- objective:


------------------------
status codes:
- status: 🕑 PENDING
- status: 🚧 IN_PROGRESS
- status: ✅ DONE
- status: ❌ CANCELED
------------------------

