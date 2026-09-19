# jPulse Docs / Dev / Work Items v2.0.5

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
- type: Bugfix
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
- type: Bugfix
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
  - docs/dev/design/W-014-W-045-mvc-site-plugins-architecture.md
  - docs/dev/design/W-023-view-migrate-views-to-vue.md
  - docs/dev/design/W-025-view-component-styling.md
  - docs/dev/design/W-046-dev-doc-structure.md
  - docs/dev/design/W-049-docs-marktown-strategy.md

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
- example: dev/design/ should be excluded from official /jpulse/ docs
- exclude docs and directories defined in .jpulse-ignore file in docs root
- deliverables
  - ✅ docs/.jpulse-ignore:
    - syntax like .gitignore with gitignore-like patterns
    - supports exact files (temp.md), wildcards (*.backup.md), directories (dev/design/)
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
- type: Bugfix
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
- see docs/dev/design/W-071-W-072-W-073-site-strategy-hello-and-vue
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
- see docs/dev/design/W-071-W-072-W-073-site-strategy-hello-and-vue
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
- see docs/dev/design/W-071-W-072-W-073-site-strategy-hello-and-vue
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
- see docs/dev/design/W-071-W-072-W-073-site-strategy-hello-and-vue
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
- spec discussions: docs/dev/design/W-068-W-069-W-070-view-create-responsive-nav
- define site menu in webapp/view/jpulse-navigation.tmpl
- on desktop:
  - on hover over site logo and site name,
  - show pulldown with nested pages
- on mobile:
  - show hamburger menu (where? to the left of app icon?)
- deliverables:
  - docs/dev/design/W-068-W-069-W-070-view-create-responsive-nav -- updated spec with template-based navigation architecture
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
- spec discussions: docs/dev/design/W-068-W-069-W-070-view-create-responsive-nav
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
  - docs/dev/design/W-076-redis-caching-and-1o-release-prep.md
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
      - docs/dev/design/W-052-business-dual-licensing-agpl-and-commercial.md: Added BSL 1.1 strategy section with rationale
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
  - docs/dev/design/W-085-npx-tools-strategy.md
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
  - docs/dev/design/W-085-npx-tools-strategy.md -- complete strategy documentation with implementation details
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
  - docs/dev/design/W-086-genai-docs-review.md
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
  - docs/dev/design/W-087-send-email-strategy.md
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
- type: Bugfix
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
- type: Bugfix
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
  - docs/dev/design/W-014-W-045-mvc-site-plugins-architecture.md -- added schema extension architecture section

### W-094, v1.2.1: handlebars: list files, extract from files
- status: ✅ DONE
- type: Feature
- objective: generalize file operations in Handlebars to enable automated content generation (e.g., auto-populate card lists in index pages)
- working doc: docs/dev/design/W-094-handlebars-file-list-and-extract
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
  - docs/dev/design/W-014-W-045-mvc-site-plugins-architecture.md -- technical debt notes
  - docs/dev/design/W-094-handlebars-file-list-and-extract.md -- deliverables section
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
  - docs/dev/design/W-097-handlebars-use-components.md
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
  - docs/dev/design/W-098-override-site-navigation.md
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
- type: Bugfix
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
- working doc: docs/dev/design/W-014-W-045-mvc-site-plugins-architecture.md
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
- type: Bugfix
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
- type: Bugfix
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
- working document: docs/dev/design/W-103-handlebars-let-with-variables.md
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
  - docs/dev/design/W-045-plugins-tech-debt.md:
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
  - docs/dev/design/W-105-plugins-add-hooks.md:
    - Working document with full implementation plan and analysis

### W-080, v1.3.7, 2025-12-04: controller: search API with cursor-based pagination
- status: ✅ DONE
- type: Feature
- objective: paged queries that do not miss or duplicate docs between calls
- reference: https://medium.com/swlh/mongodb-pagination-fast-consistent-ece2a97070f3
- working document: docs/dev/design/W-080-search-with-pagination-cursor.md
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
- working doc: docs/dev/design/W-106-plugin-cli-management.md
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
- working doc: docs/dev/design/W-107-user-profiles-data-driven.md
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
- working doc: docs/dev/design/W-109-auth-multi-step-login.md
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
- working doc: docs/dev/design/W-108-auth-mfa-plugin.md
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
- type: Bugfix
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
- working document: docs/dev/design/W-112-metrics-get-stats-strategy.md
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
- type: Bugfix
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
  - docs/dev/design/W-114-handlebars-logical-subexpressions.md -- working document
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
  - `docs/dev/design/W-116-handlebars-plugin-interface.md`:
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
- type: Bugfix
- objective: fix bug discovered after v1.3.21 release
- issue:
  - bug: files and directories specified in the `[ignore]` section of `docs/.markdown` are not excluded, and accessible:
    - docs/dev/roadmap.md
    - docs/dev/design
- deliverables:
  - .npmignore:
    - added `docs/dev/roadmap.md` and `docs/dev/design/` to exclude from npm package
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
  - docs/dev/design/W-068-W-069-W-070-view-create-responsive-nav
  - docs/dev/design/W-068-sidebar-generalization.md
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
- type: Bugfix
- objective: fix regression bug discovered after v1.4.1 release that was supposed to be fixed in v1.3.22
- issue:
  - bug: files and directories specified in the `[ignore]` section of `docs/.markdown` are not excluded, and accessible:
    - docs/dev/roadmap.md
    - docs/dev/design
- deliverables:
  - bin/configure.js:
    - Added `loadMarkdownIgnorePatterns()` function to read and parse `.markdown` `[ignore]` section
    - Added `shouldIgnore()` function to check if files/directories should be excluded
    - Modified `copyDirectory()` to accept optional `shouldSkip` filter function
    - Added explicit docs copy section with filtering after webapp copy during fresh installs
    - Filters files based on `.markdown` `[ignore]` patterns to exclude `docs/dev/roadmap.md` and `docs/dev/design/` from site deployments
    - Fixed symlink handling: use `lstatSync()` instead of `existsSync()` to properly detect and remove symlinks before copying
    - Added `isFrameworkDevRepo()` safeguard to prevent accidental execution in framework development repository
  - bin/jpulse-update.js:
    - Added `loadMarkdownIgnorePatterns()` function to read and parse `.markdown` `[ignore]` section
    - Added `shouldIgnore()` function to check if files/directories should be excluded
    - Modified `syncDirectory()` to accept optional `shouldSkip` filter function
    - Updated docs copy section to use filtering based on `.markdown` `[ignore]` patterns
    - Filters files during upgrade to exclude `docs/dev/roadmap.md` and `docs/dev/design/` from site deployments
    - Fixed symlink handling: use `lstatSync()` instead of `existsSync()` to properly detect and remove symlinks before copying
    - Added `isFrameworkDevRepo()` safeguard to prevent accidental execution in framework development repository

### W-123, v1.4.3, 2026-01-03: view: sidebars with open on hover mode and auto-close
- status: ✅ DONE
- type: Feature
- objective: qick way to access and use the Table of Contents in the right sidebar
- prerequisites:
  - docs/dev/design/W-068-sidebar-generalization.md
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

### W-133, v1.4.13, 2026-01-13: handlebars: add date.add, date.diff helpers, add user.timezone context, expand handlebars in broadcast messages
- status: ✅ DONE
- type: Feature
- objectives: ability for site admins to set a broadcast message like "Scheduled downtime in 3 days, 18 hours"
- spec & features:
  - broadcast messages containing Handlebars expressions (e.g., `{{date.fromNow}}`, `{{date.format}}`) are properly server-side, including proper browser local timezone handling
  - expanded message stored in `appConfig.system.broadcastMessage` for template use
  - conditional expansion: only expand if message contains `{{` (performance optimization)
  - caching: reuse expanded message if already computed (prevents re-expansion on recursive calls)
  - error handling: fallback to raw message if expansion fails
  - browser timezone support: `timezone="browser"` works via cookie (already supported)
  - added `{{date.add}}` helper: add/subtract time units from a date (symmetrical API with `value` and `unit` parameters)
  - added `{{date.diff}}` helper: calculate difference between two dates in specified unit
- deliverables:
  - webapp/controller/handlebar.js:
    - expand broadcast message in `_buildInternalContext()` after context extensions
    - check if already expanded (no-op optimization)
    - expand using `_expandHandlebars()` with current context
    - store result in `appConfig.system.broadcastMessage`
    - add `{{user.timezone}}` to show the browser timezone of the user, such as: `America/Los_Angeles`
    - change `{{date.format format="%TIME%"}}` and `{{date.format format="%DATETIME%"}}` to show only `hours:minutes` instead of `hours:minutes:seconds`
    - added `_handleDateAdd()` function: supports years, months, weeks, days, hours, minutes, seconds, milliseconds (singular and plural unit names)
    - added `_handleDateDiff()` function: calculates difference in years, months, weeks, days, hours, minutes, seconds, milliseconds (default: milliseconds)
    - refactored date parsing into shared `_parseDateValue()` helper for code reuse
  - webapp/view/jpulse-footer.tmpl:
    - change from `{{siteConfig.broadcast.message}}` to `{{appConfig.system.broadcastMessage}}`
  - webapp/app.conf:
    - add 'appConfig.system.broadcastMessage' to controller.handlebar.contextFilter.alwaysAllow
  - webapp/tests/unit/controller/handlebar-date-helpers.test.js:
    - added 17 unit tests for `{{date.add}}` helper (all time units, positive/negative values, edge cases, error handling)
    - added 16 unit tests for `{{date.diff}}` helper (all time units, negative differences, current time fallback, error handling)
    - updated existing tests for `%TIME%` and `%DATETIME%` format changes (removed seconds)
    - updated timezone conversion tests to verify correct conversion (not showing UTC when browser timezone is set)

### W-134, v1.4.14, 2026-01-14: user view: create SPA for public profiles, user dashboard and user settings
- status: ✅ DONE
- type: Feature
- objective: more intuitive UX for viewing profile pages, and setting user preferences
- problem: users can't find the settings page easily to change preferences; no public profile view for collaboration features
- spec & features:
  - created Single Page Application (SPA) at /user/ with client-side routing (no Vue.js, pure HTML/JavaScript with Handlebars)
  - SPA routes:
    - /user/ - dashboard/directory (config-driven, public or authenticated)
    - /user/me - my dashboard (authenticated, reserved route)
    - /user/settings - settings page (authenticated, renamed from profile.shtml)
    - /user/{username} - public profile view (config-driven visibility)
  - reserved username validation (blocks 'settings', 'me' on signup)
  - config-driven public profile access control with field filtering
  - new API endpoint: GET /api/1/user/public/:id (supports ObjectId or username)
  - updated API endpoint: GET /api/1/user/search (changed from admin-only to policy-based access with field filtering)
  - dynamic user dropdown menu (data-driven from jpulse-navigation.js, desktop hover + mobile tap)
  - dashboard with config-driven stats cards and nav cards
  - full i18n support for all user-facing text
  - i18n audit test enhancements with // i18n-audit-ignore directive for dynamic keys
- deliverables:
  - webapp/model/user.js:
    - added reserved username validation in validate() method
  - webapp/controller/user.js:
    - added _checkPublicProfilePolicy() and _filterPublicProfileFields() private helper methods
  - webapp/controller/user.js:
    - added getPublic() method for new public profile endpoint
    - updated search() method with access control and field filtering
  - webapp/routes.js:
    - removed admin middleware from /user/search, added /api/1/user/public/:id route
  - webapp/view/user/index.shtml:
    - created SPA entry point with client-side routing
  - webapp/view/user/dashboard.tmpl:
    - created dashboard template with config-driven cards and search (limit 50 results)
  - webapp/view/user/me.tmpl:
    - created authenticated user dashboard template
  - webapp/view/user/profile.tmpl:
    - created public profile view template
  - webapp/view/user/settings.tmpl:
    - created settings template (moved from profile.shtml)
  - webapp/view/user/profile.shtml:
    - deleted (replaced by SPA templates)
  - webapp/view/jpulse-common.js:
    - enhanced navigation.init() with userDropdown parameter and implementation
  - webapp/view/jpulse-footer.tmpl:
    - updated to dynamically render user dropdown from navigation data
  - webapp/view/jpulse-navigation.js:
    - restructured user menu for dropdown and breadcrumb support
  - webapp/app.conf:
    - added model.user.reservedUsernames, controller.user.profile, view.user.index configurations
    - fixed contextFilter paths (removed redundant appConfig. prefix)
  - webapp/controller/handlebar.js:
    - added // i18n-audit-ignore comments for dynamic i18n keys, i.e. to avoid warning in tests
  - webapp/translations/en.conf:
    - added 18 new i18n keys for user SPA (view.user.index.*, view.user.settings.*)
  - webapp/translations/de.conf:
    - added 18 new i18n keys with German translations
  - webapp/tests/unit/model/user-reserved-usernames.test.js:
    - added 18 unit tests for reserved username validation
  - webapp/tests/unit/i18n/utils/key-extractor.js:
    - added support for // i18n-audit-ignore directive
  - webapp/tests/unit/utils/jpulse-ui-navigation.test.js:
    - updated 49 test calls to use siteNavigation parameter
  - webapp/tests/unit/controller/handlebar-appconfig-alwaysallow.test.js:
    - fixed contextFilter paths in test
  - docs/api-reference.md:
    - added GET /api/1/user/public/:id documentation, updated GET /api/1/user/search docs
  - docs/mpa-vs-spa.md:
    - added comprehensive SPA implementation reference using /user/ as example
  - docs/CHANGELOG.md:
    - updated layoutAll() documentation with useCache parameter
  - docs/handlebars.md:
    - updated with contextFilter path correction documentation
  - docs/jpulse-ui-reference.md:
    - updated layoutAll() reference
  - docs/sidebars.md:
    - updated layoutAll() documentation
  - docs/template-reference.md:
    - updated layoutAll() reference

### W-135, v1.4.15, 2026-01-15: handlebars: add string manipulation helpers
- status: ✅ DONE
- type: Feature
- objective: more flexibility with string manipulation
- new helpers (all variadic, 1+ args):
  - `{{string.length user.firstName}}` → `"4"` (returns string number)
  - `{{string.lowercase user.firstName}}` → `"john"`
  - `{{string.lowercase user.firstName " " user.lastName}}` → `"john doe"`
  - `{{string.uppercase user.firstName}}` → `"JOHN"`
  - `{{string.titlecase "the lord of the rings"}}` → `"The Lord of the Rings"` (smart English title case)
  - `{{string.slugify "Hello World!"}}` → `"hello-world"` (URL-friendly, removes diacritics)
  - `{{string.urlEncode "hello world"}}` → `"hello%20world"`
  - `{{string.urlDecode "hello%20world"}}` → `"hello world"`
  - `{{string.htmlEscape vars.someHtml}}` → safe HTML, for security & to prevent XSS
  - `{{string.htmlToText vars.someHtml}}` → convert HTML to plain text (smart tag removal, entity decoding)
  - `{{string.htmlToMd vars.someHtml}}` → convert HTML to markdown (headings, lists, links, formatting)
- deliverables:
  - webapp/controller/handlebar.js:
    - Added 10 helper descriptions to HANDLEBARS_DESCRIPTIONS
    - Added case labels for new helpers in switch statement
    - Implemented all 10 helper functions with variadic support (250+ lines)
    - Bug fix: HTML attribute parsing (class="foo" no longer treated as named arg)
    - Enhancement: titlecase preserves punctuation (periods, colons, quotes, etc.)
    - Enhancement: slugify handles punctuation gracefully (converts to hyphens)
  - webapp/tests/unit/controller/handlebar-string-manipulation.test.js:
    - New test file with 80+ comprehensive tests
    - Tests for all helpers with variadic support, edge cases, integration
    - All tests passing
  - docs/handlebars.md:
    - Added "Shared Behavior" section explaining variadic support
    - Documented all 10 helpers in alphabetical order with examples
    - Added comprehensive use cases and feature descriptions
    - Documented htmlToMd limitations and supported conversions
- notes:
  - All helpers support variadic arguments (concatenate first, then apply operation)
  - Smart titlecase uses English grammar rules (doesn't capitalize articles/prepositions)
  - Slugify removes diacritics and handles punctuation naturally
  - htmlToMd handles HTML attributes gracefully (class, style, etc.)
  - No breaking changes - fully backward compatible

### W-136, v1.4.16, 2026-01-16: handlebars: add array helpers, json.parse helper, logical block helpers, native type system
- status: ✅ DONE
- type: Feature
- objective: flexibility with array references and manipulation
- syntax: `{{array.<func> <array> <args>}}`
  - `<func>`: array access or manipulation function
  - `<array>`: array to operate on, can be a:
    - context array, such as `user.roles`
    - native array from helpers, such as `(file.list "*.js")`
    - parsed JSON array, such as `(json.parse '["a","b"]')`
  - `<args>`: arguments, depends on function
- phase 1: array access functions:
  - `{{array.at user.roles 0}}` - get element at index (0-based, positive only)
  - `{{array.first user.roles}}` - get first element
  - `{{array.last user.roles}}` - get last element
  - `{{array.includes user.roles "admin"}}` - check if array contains value (returns native boolean)
  - `{{array.isEmpty user.roles}}` - check if array/object is empty (returns native boolean)
  - `{{array.join user.roles ", "}}` - join array elements with separator
  - `{{array.length user.roles}}` - get array/object length (returns string)
- phase 2: array manipulation functions:
  - `{{array.concat arr1 arr2 arr3}}` - concatenate multiple arrays (returns native array)
  - `{{array.reverse arr1}}` - reverse array order (non-mutating, returns native array)
  - `{{array.sort arr1}}` - sort array with smart features:
    - auto-detect type (number vs string)
    - object sorting: `sortBy="property.path"` with nested path support
    - type override: `sortAs="number"` or `sortAs="string"`
    - reverse order: `reverse=true`
    - locale-aware string sorting
    - null-safe (null/undefined sort to end)
    - uses `global.CommonUtils.getValueByPath()` for nested properties
- supporting Features:
  - `{{json.parse '["a","b"]'}}` - parse JSON strings to native arrays/objects
  - native type system:
    - boolean helpers return native `true`/`false`
    - array/object helpers return native arrays/objects
    - numbers remain numbers
    - final stringification only at render time
  - value store mechanism:
    - prevents repeated JSON.stringify/parse cycles
    - native values stored with `__VALUE_N__` placeholders
    - single stringification at end of processing
    - performance optimized for nested operations
  - block logical/comparison helpers:
    - `{{#and}}`, `{{#or}}`, `{{#not}}` - logical blocks
    - `{{#eq}}`, `{{#ne}}`, `{{#gt}}`, `{{#gte}}`, `{{#lt}}`, `{{#lte}}` - comparison blocks
  - zero breaking changes
- deliverables:
  - webapp/controller/handlebar.js:
    - added 10 array helpers (at, first, last, includes, isEmpty, join, length, concat, reverse, sort)
    - added json.parse helper
    - implemented native type system with value store
    - added block logical/comparison helpers (`_handleBlockLogical()`, `_handleBlockComparison()`)
    - performance optimization: single stringify per value
    - updated all boolean helpers to return native boolean
    - fixed file.list to return native array
    - updated `{{#each}}` to handle native arrays
    - removed auto-parsing logic
  - webapp/tests/unit/controller/handlebar-array-helpers.test.js:
    - new test file with 100 comprehensive tests
    - tests for all array helpers
    - tests for primitive and object sorting
    - tests for nested property paths
    - tests for edge cases (null, undefined, invalid input)
    - test results: 499/499 handlebar tests passing (100%)
  - docs/handlebars.md:
    - added "Type System" section explaining native types
    - added "Array Helpers" section (10 helpers documented)
    - added "JSON Helpers" section (json.parse)
    - updated all examples to use json.parse for JSON strings

### W-137, v1.4.17, 2026-01-23: deployment: send license compliance report to jpulse.net
- status: ✅ DONE
- type: Feature
- objectives:
  - send anonymous usage stats to jpulse.net to monitor for BSL 1.1 compliance
- spec & features:
  - configure script:
    - generates JPULSE_SITE_UUID (auto-generated UUID v4, stored in .env)
    - prompts for mandatory license acceptance (BSL 1.1 with Additional Terms)
    - prompts for optional admin email opt-in (for deployment dashboard access)
    - displays compliance notice with opt-in/opt-out status and monitor URL (if opted-in)
  - MongoDB ConfigModel:
    - manifest section stores license/compliance settings (cluster-safe, single source of truth)
    - manifest.compliance.siteUuid (auto-generated on first startup if missing, uses .env UUID if available)
    - manifest.compliance.adminEmailOptIn (boolean flag, editable via Admin UI)
    - manifest.license.key and manifest.license.tier (commercial license settings)
    - ConfigModel.ensureManifestDefaults() provides schema-driven, atomic, race-safe initialization
  - health controller:
    - sends anonymous system metrics to jpulse.net/api/1/site-monitor/report (daily compliance reporting)
      - randomized schedule: current hour + random minute (0-59), stored in Redis, consistent per site
      - 30-minute window for flexibility (±30 min around scheduled time)
      - scheduled sends independent of manual sends (separate timestamp tracking)
      - payload includes: uuid, jpulseVersion, siteVersion, users (total/admins/active24h), deployment (servers/instances/environment), activity (docsUpdated24h/pagesServed24h/wsConnections), plugins (total/enabled/names), adminEmail (if opt-in), timestamp, reportType
      - exponential backoff for failures: 1min → 5min → 30min → 1hr → 6hr → 24hr (max)
      - graceful failure handling (network issues not treated as violations)
    - compliance data exposed via GET /api/1/health/metrics (admin-only)
    - manual send API: POST /api/1/health/compliance/send-report (admin-only, bypasses timing)
  - admin UI:
    - system-status.shtml: client-side rendered compliance section with status, timing, transparency widget
    - config.shtml: tabbed interface with Manifest tab for license/compliance settings
    - shows compliance status (compliant/warning/exempt-dev/violation), scheduled time (local HH:MM), last/next report timestamps, monitor URL (if opted-in), collapsible Request/Response transparency widget
  - bootstrap integration:
    - compliance scheduler initialized after HealthController.initialize() (Step 11.1)
    - checks every 15 minutes with random delay (0-14 min) to spread load
    - initial check after 5 minutes with random delay
- deliverables:
  - webapp/model/config.js: manifest schema with ensureManifestDefaults() method
  - webapp/controller/health.js: compliance reporting implementation (scheduling, payload, API)
  - webapp/view/admin/system-status.shtml: compliance UI section
  - webapp/view/admin/config.shtml: manifest configuration tab
  - bin/config-registry.js: UUID generation, license acceptance, email opt-in prompts
  - bin/configure.js: compliance notice display
  - webapp/utils/bootstrap.js: compliance scheduler initialization
  - webapp/routes.js: manual send API endpoint
  - webapp/tests/unit/controller/health-compliance.test.js: unit tests for compliance logic
  - webapp/tests/unit/config/config-manifest.test.js: unit tests for manifest defaults
  - LICENSE: Section 11 Additional Terms (pending legal review)
  - docs/license.md: site monitoring section
  - docs/site-administration.md: manifest and compliance sections
  - docs/installation.md, docs/getting-started.md, docs/deployment.md: compliance documentation

### W-138, v1.0.4, 2026-01-23: auth-mfa plugin: remove otplib dependency
- status: ✅ DONE
- type: Feature
- objectives: less npm dependency, same UI
- enhancement:
  - remove `otplib` dependency and replace with a small built-in RFC6238 TOTP implementation using Node.js `crypto`
  - keep existing UI flow and QR code enrollment (no UX changes)
  - improve developer experience by avoiding Node/WebCrypto engine constraints from upstream libraries
- deliverables:
  - plugins/auth-mfa/webapp/utils/totp.js:
    - add Base32 + TOTP (RFC6238) + `otpauth://` URI helper (RFC4648), no external deps
  - plugins/auth-mfa/webapp/controller/mfaAuth.js:
    - switch enrollment and verification from `otplib` to internal TOTP helper, keep QR code setup
  - plugins/auth-mfa/package.json, plugins/auth-mfa/plugin.json, plugins/auth-mfa/package-lock.json:
    - remove `otplib` from npm dependencies and update lockfile

### W-139, v1.0.5, 2026-01-24: auth-mfa plugin: remove custom background color to be theme-safe
- status: ✅ DONE
- type: Feature
- objectives: theme-safe colors in settings
- deliverables:
  - webapp/model/mfaAuth.js:
    - remove `backgroundColor` settings to use default card styling in light/dark themes
  - webapp/view/user/settings.tmpl:
    - remove inline backgroundColor styling support for plugin cards (no hard-coded colors)
    - use `jPulse.date.formatLocalDate()` / `jPulse.date.formatLocalDateAndTime()` for date fields (no duplicated code)
    - remove hard-coded muted placeholder inline styles (use `jp-text-muted`)

### W-140, v1.4.18, 2026-01-24: plugins: make plugin installs self-contained (install deps in plugin dir)
- status: ✅ DONE
- type: Feature
- objectives:
  - prevent plugins from breaking after `npm install` / `npm prune` in the site root
  - reduce dependency surprises for site admins
- enhancements:
  - plugin CLI installs runtime deps into `plugins/<name>/node_modules` (site context) on install/update
  - admin config: block password-manager autofill on sensitive fields; stabilize dirty tracking
  - settings UI: remove inline plugin-card styling to be theme-safe; use `jPulse.date.formatLocalDate*()` for date fields
- deliverables:
  - bin/plugin-manager-cli.js:
    - install plugin deps in plugin folder (site context) on install/update
  - webapp/view/admin/config.shtml:
    - autofill protections for `smtpPass` / `licenseKey`; dirty snapshot tracking
  - webapp/view/user/settings.tmpl:
    - remove plugin card inline styling and hard-coded colors; use `jPulse.date.*` formatters
  - package.json, package-lock.json:
    - remove `otplib` dependency from framework root

### W-141, v1.5.0, 2026-01-25: search: boolean operators (AND/OR/NOT) with exact match (breaking change)
- status: ✅ DONE
- type: Feature + Breaking Change
- objectives: powerful search with boolean logic, exact match default, collation optimization
- breaking changes:
  - exact match by default (was: fuzzy contains)
    - before: `status=active` matched "active", "inactive", "reactivate"
    - after: `status=active` matches only "active" (case-insensitive)
    - migration: use `status=*active*` for fuzzy/contains search
- enhancement:
  - boolean operators **within same field**:
    - OR: `,` → `lunch=sushi,pizza` = sushi OR pizza
    - AND: `;` → `lunch=sushi;soup` = sushi AND soup
    - NOT: `!` prefix → `lunch=sushi;!miso` = sushi AND NOT miso
    - combination: `lunch=sushi;miso%20soup,pizza;salad!vinegar` = (sushi AND miso soup) OR (pizza AND salad AND NOT vinegar)
    - precedence: AND binds tighter than OR
    - note: AND between **different fields** uses standard query syntax: `role=admin&status=active`
  - exact match by default (anchored at both ends):
    - `storm` → `/^storm$/i` matches only "storm" (case-insensitive)
    - `brain*` → `/^brain.*/i` starts with "brain"
    - `*storm` → `/.*storm$/i` ends with "storm"
    - `*storm*` → `/.*storm.*/i` contains "storm" (fuzzy)
  - regex support for power users:
    - `/pattern/flags` → explicit regex with flags
    - example: `/BC[1-9]\d{3}/` case-sensitive, `/storm/i` case-insensitive
    - security: validated, length-limited (~200 chars)
  - collation optimization:
    - exact matches use collation (10-100x faster on large collections)
    - pattern/regex searches use regex (no collation)
    - auto-detection in paginatedSearch (backward compatible)
  - wildcard character: `*` only
- example queries:
  - single field AND/OR: `lunch=sushi;miso soup,pizza;salad;!vinegar`
    - meaning: (sushi AND miso soup) OR (pizza AND salad AND NOT vinegar)
  - multi-field AND (no change): `role=admin&status=active`
    - meaning: role is admin AND status is active (standard query string)
- deliverables:
  - docs/dev/design/W-141-search-with-boolean-operators.md:
    - complete specification and implementation plan (991 lines)
  - webapp/utils/common.js:
    - StringQueryParser class (~250 lines)
    - enhanced schemaBasedQuery return format (with metadata)
    - auto-detection in paginatedSearch (backward compatible)
    - collation support in _paginatedOffsetSearch and _paginatedCursorSearch
  - webapp/tests/manual-string-query-parser-test.js:
    - 18 manual tests - all passing
  - webapp/tests/unit/utils/common-utils-boolean-search.test.js:
    - 60+ comprehensive unit tests - all passing (2009 total tests)
  - docs/api-reference.md:
    - updated search syntax documentation with cross-references
    - comprehensive Advanced Search Syntax section
    - boolean operators, wildcards, regex, performance tips
    - migration guide from v1.4.x
  - docs/CHANGELOG.md:
    - pending: breaking change notes with migration guide

### W-142, v1.5.1, 2026-01-25: deployment: copy LICENSE file to site installations
- status: ✅ DONE
- type: Bugfix
- objectives: ensure LICENSE file is available in site installations
- issue:
  - LICENSE file exists in framework root and is included in npm package
  - LICENSE is referenced in admin-facing documentation (docs/license.md, docs/README.md)
  - LICENSE was not being copied to site installations during `npx jpulse configure` or `npx jpulse update`
- deliverables:
  - bin/configure.js:
    - copy LICENSE file from framework package to site root (verbatim, no template processing)
  - bin/jpulse-update.js:
    - copy LICENSE file during framework updates
  - bin/test-cli.js:
    - add LICENSE to expectedFiles validation array

### W-143, v1.6.0, 2026-01-27: framework: redis based cache infrastructure for application data
- status: ✅ DONE
- type: Feature (Infrastructure Enhancement)
- objectives: add Redis cache wrapper to RedisManager with enforced naming conventions, common cache patterns, and client-side API
- features:
  - colon-separated cache paths (consistent with pub/sub: `controller:namespace:category`)
  - core operations: `cacheSet()`, `cacheGet()`, `cacheDel()`, `cacheExists()`
  - JSON operations: `cacheSetObject()`, `cacheGetObject()` (auto-serialization)
  - counter operations: `cacheIncr()`, `cacheDecr()`, `cacheIncrBy()`
  - pattern methods: `cacheSetToken()`, `cacheGetToken()`, `cacheDelToken()`, `cacheValidateToken()`, `cacheCheckRateLimit()`
  - bulk operations: `cacheDelPattern()` (uses SCAN, production-safe)
  - client-side API: `jPulse.appCluster.cache.set/get/del()` (browser/view access)
  - backend cache API: `/api/1/cache/set`, `/api/1/cache/get`, `/api/1/cache/delete`
  - cache metrics integration in `RedisManager.getMetrics()`
  - TTL conventions: 0 = indefinite, pattern methods have sensible defaults (1 hour)
  - graceful fallback when Redis unavailable
  - component types: `controller`, `model`, `view`, `util`
- deliverables:
  - `webapp/utils/redis-manager.js`:
    - add cache methods: `cacheSet()`, `cacheGet()`, `cacheDel()`, `cacheExists()`
    - add JSON methods: `cacheSetObject()`, `cacheGetObject()`
    - add counter methods: `cacheIncr()`, `cacheDecr()`, `cacheIncrBy()`
    - add pattern methods: `cacheSetToken()`, `cacheGetToken()`, `cacheDelToken()`, `cacheValidateToken()`, `cacheCheckRateLimit()`
    - add bulk method: `cacheDelPattern()`
    - add helpers: `_parseCachePath()`, `_buildCacheKey()`, `_validateCacheParams()`
    - Extend `getMetrics()` with cache statistics (hits, misses, hit rate, operations)
  - `webapp/view/jpulse-common.js`:
    - add `jPulse.appCluster.cache.set()` (POST to `/api/1/cache/set`)
    - add `jPulse.appCluster.cache.get()` (GET to `/api/1/cache/get`)
    - add `jPulse.appCluster.cache.del()` (POST to `/api/1/cache/delete`)
  - `webapp/controller/cache.js` (new file):
    - add `apiSetCache()` (POST `/api/1/cache/set`)
    - add `apiGetCache()` (GET `/api/1/cache/get`)
    - add `apiDeleteCache()` (POST `/api/1/cache/delete`)
    - User-scoped: automatically uses `view:{userId}:category:key`
  - `webapp/view/admin/system-status.shtml`:
    - add Redis cache statistics section (hit rate, total keys, operations)
  - `webapp/static/assets/jpulse-docs/cache-infrastructure.md` (new file):
    - document two cache layers: file-level (CacheManager) vs Redis-based (RedisManager)
    - usage examples for all cache operations
    - best practices and security guidelines
    - client-side vs server-side cache APIs
  - `webapp/static/assets/jpulse-docs/application-cluster.md`:
    - add "Cache vs. Broadcast" comparison section
    - add combined cache + broadcast examples
    - cross-link to cache-infrastructure.md
  - `webapp/static/assets/jpulse-docs/genai-instructions.md`:
    - add cache wrapper patterns and examples
    - document colon-separated path convention
    - add `jPulse.appCluster.cache.*` client API
  - `webapp/static/assets/jpulse-docs/api-reference.md`:
    - document all `RedisManager.cache*()` methods
    - document `jPulse.appCluster.cache.*` methods
    - document `/api/1/cache/*` endpoints
  - `webapp/tests/unit/redis-manager.test.js`:
    - add cache operation tests (set/get/del/exists)
    - add JSON operation tests (serialize/deserialize)
    - add pattern method tests (tokens, rate limiting)
    - add bulk deletion tests (pattern matching)
    - add error handling tests (Redis unavailable)
    - add key building and validation tests

### W-144, v1.6.1, 2026-01-28: framework: redis based cache infrastructure follow-up
- status: ✅ DONE
- type: Enhancement
- objective: fine-tune Redis cache infrastructure post-W-143 implementation
- benefits:
  - consistency: global variable naming matches framework convention (PascalCase for singletons)
  - i18n compliance: all user-facing error messages now properly internationalized
  - better UX: error messages include specific error details, longer display for important errors
  - reduced noise: debug logs removed from production, cleaner log files
  - code quality: error handling patterns consistent across API and UI layers
- deliverables:
  - webapp/controller/appCluster.js:
    - global variable naming consistency (redisManager → RedisManager):
    - fixed case sensitivity: Changed `global.redisManager` to `global.RedisManager`
  - webapp/controller/health.js:
    - controller error message i18n:
    - migrated 5 hard-coded English error messages to i18n system
    - added controller.health translations: complianceReportSent, complianceReportFailed, healthCheckFailed, metricsCollectionFailed, adminAccessRequired
    - updated apiSendComplianceReport: better error handling with error details in response
    - updated _sendComplianceReport: return error object instead of null for better error reporting
    - removed 13 verbose DEBUG log statements from cluster statistics aggregation
    - reduced log noise in production while maintaining error visibility
  - webapp/controller/log.js:
    - controller error message i18n
    - updated searchError translation to include {{error}} placeholder
    - changed from passing error as 4th argument to including in i18n message
  - webapp/controller/view.js:
    - fixed error property access: result.message → result.error (consistent with API)
    - updated toast call: jPulse.ui.showToast → jPulse.UI.toast.error (consistent with framework)
  - webapp/view/admin/system-status.shtml:
    - error handling improvements
    - compliance report: use server's i18n message (includes error details)
    - extended error display duration to 10 seconds for better visibility
    - better fallback chain: result.error || result.message || default
    - consistent toast API: jPulse.UI.toast.success/error
  - webapp/translations/en.conf, de.conf:
    - translation consolidation
    - moved reportSent/reportFailed from view.admin.systemStatus.licenseCompliance to controller.health
    - centralized error messages in controller namespace for reuse
    - English: 5 new controller.health translations
    - German: 5 new controller.health translations (proper German localization)

### W-146, v1.6.2, 2026-01-30: redis: site-specific namespacing for multi-site deployments
- status: ✅ DONE
- type: Feature
- objective: add Redis namespace isolation using `${siteId}:${mode}:` prefix to prevent cross-contamination when multiple jPulse installations share same Redis instance
- problem: multiple jPulse sites (e.g., bubblemap.net + jpulse.net) on same server/Redis db mix data (sessions, cache, broadcasts, metrics), causing config changes to affect wrong site and metrics to aggregate incorrectly
- solution: auto-prepend `${siteId}:${mode}:` to all Redis keys, using `app.siteId` from config (or slugified `app.site.shortName`) + `deployment.mode` for complete isolation
- breaking change: invalidates all existing Redis keys on upgrade (sessions cleared, cache rebuilt, metrics reset) - acceptable for proper multi-site support
- deliverables:
  - `webapp/utils/common.js`:
    - add `static slugifyString(str)` method (extract from HandlebarController, make reusable)
    - implement two-step algorithm: preserve punctuation as word separators (`.,:;`), then convert to hyphens
    - handle Unicode/accents, normalize NFD, remove diacritics
    - return lowercase alphanumeric + hyphens only (e.g., "My Site!" → "my-site", "Foo:Bar" → "foo-bar")
    - add JSDoc with examples
    - export in module.exports
  - `webapp/controller/handlebar.js`:
    - refactor `string.slugify` helper (line 2563) to use `CommonUtils.slugify()`
    - keep variadic arg concatenation logic
    - ensure backward compatibility (all existing tests pass)
  - `webapp/utils/redis-manager.js`:
    - modify `static getKey(connection, key)` to prepend namespace
    - compute `siteId` from `appConfig.app.siteId` (first choice) or `CommonUtils.slugifyString(appConfig.app.site.shortName)` (fallback)
    - compute `mode` from `appConfig.deployment.mode` (default 'dev')
    - return `${siteId}:${mode}:${prefix}${key}`
    - example keys: `bubblemap-net:prod:sess:abc123`, `jpulse-net:prod:bc:controller:config:data:changed`
    - add comments explaining namespace structure
  - `site/webapp/app.conf`:
    - add `app.siteId: 'jpulse-framework'` to framework's default site config (for dev/test environments)
    - document that production sites get `siteId` from `.env` via `JPULSE_SITE_ID` (already in templates)
  - `webapp/controller/health.js`:
    - update metrics aggregation to filter by same `siteId:mode` namespace
    - ensure `/api/1/health/metrics` only shows instances from current site+environment
    - BUG FIX: replace raw Redis operations with `RedisManager.cacheGetObject()` / `cacheSetObject()` (4 occurrences):
      - `health:database:lastGoodStatus` (2 occurrences) - now uses cache wrapper with automatic JSON handling
      - `health:cache:${instanceId}` (2 occurrences) - now uses cache wrapper with automatic JSON handling
    - benefit: cleaner code, automatic JSON serialization/deserialization, consistent namespace handling
  - `webapp/utils/redis-manager.js`:
    - BUG FIX: use `RedisManager.getKey()` for `instances` set key (2 occurrences)
  - tests:
    - unit tests for `CommonUtils.slugifyString()`:
      - basic: "Hello World" → "hello-world"
      - punctuation as separator: "Foo:Bar" → "foo-bar", "How to: Install" → "how-to-install"
      - accents: "Café" → "cafe"
      - special chars: "My Site!" → "my-site"
      - collapse hyphens: "hello  -  world" → "hello-world"
      - trim ends: " hello " → "hello"
      - empty/null: returns ""
    - integration tests for Redis namespace:
      - multiple sites on same Redis → isolated sessions/cache/broadcasts
      - verify dev vs prod isolation (same siteId, different mode)
      - health metrics show only matching namespace instances
  - documentation:
    - `docs/cache-infrastructure.md`: add "Multi-Site Isolation" section explaining namespace structure
    - `docs/installation.md`: document `JPULSE_SITE_ID` env var requirement for production
    - `docs/deployment.md`: add migration notes (Redis keys invalidated on upgrade)
    - `docs/api-reference.md`: update RedisManager.getKey() documentation with namespace examples

### W-145, v1.6.3, 2026-01-31: handlebars: load components from templates
- status: ✅ DONE
- type: Feature
- objective: make it easy to load components from templates in assets
- feature:
  - add `HandlebarController.loadComponents()` method to load and extract registered components from template files without rendering, enabling templates to define reusable structured content (email subject/body, multi-language strings, configuration sections) that can be programmatically accessed
- benefits:
  - single source of truth, reuses existing component syntax, generic & flexible, backward compatible
- use cases:
  - email templates - single file defines subject/text/html instead of 3 separate files + config
  - multi-language email templates (one file per language), multi-part UI content, report sections, configuration templates
- deliverables:
  - `webapp/controller/handlebar.js`:
    - add `static async loadComponents(req, assetPath, context = {})` and `_structureComponents(req, componentRegistry, context)` helper
    - load template via PathResolver.resolveAsset() (site overrides), expand to register components, return nested object (e.g. "email.subject" → { email: { subject: "..." } }), API-style (never throws)
  - `webapp/tests/unit/controller/handlebar-load-components.test.js`:
    - fixture under webapp/tests/fixtures/, PathResolver mocked in test only; basic loading, nested dot notation, context expansion, error handling
    - integration tests (email template, multi-language) deferred
  - `webapp/tests/fixtures/test-load-components.tmpl`:
    - W-145 unit test fixture (email.subject, email.text, email.html)
  - `docs/api-reference.md`:
    - full HandlebarController.loadComponents() API (single source of truth)
  - `docs/template-reference.md`:
    - short blurb + link to api-reference
  - `docs/sending-email.md`:
    - short blurb + link for single-file email templates
  - `docs/genai-instructions.md`:
    - add pattern for email templates (blurb + link)
  - `webapp/view/jpulse-examples/handlebars.shtml`:
    - skipped (page is view-side; loadComponents is controller-side)

### W-147, v1.6.4, 2026-02-01: config model: make config schema extensible for site and plugin developers
- status: ✅ DONE
- type: Feature
- design doc: docs/dev/design/W-147-make-config-schema-extensible.md
- objective:
  - extend the site config schema in a data-driven way (ConfigModel baseSchema + extendSchema, mirror UserModel)
  - move roles and adminRoles into config model (General tab) so site admins can change them via Admin UI without editing app.conf
- features:
  - ConfigModel: baseSchema, schemaExtensions, extendSchema(), initializeSchema(), getSchema(); extensions = new config tabs
  - general tab first with roles + adminRoles; bootstrap from schema defaults when data.general missing (no app.conf read)
  - all roles/adminRoles consumers read only from config (ConfigModel cache); app.conf controller.user.adminRoles removed in this release (once code stable)
  - admin config UI: data-driven tabs and panel content from schema (same as user config); validation adminRoles ⊆ roles; self-lockout prevention
- decisions (reflected in design doc):
  - effective assignable roles = site roles (config data.general.roles) + additional plugin/site extended roles
  - app.conf: remove adminRoles in this release (once code stable)
  - config tab panels: all data-driven from schema (same as existing user config)
  - cache: implementation must work in multi-server multi-instance deployment (specific approach flexible)
- deliverables:
  - `webapp/model/config.js`:
    - baseSchema, schemaExtensions, extendSchema(), initializeSchema(), getSchema(); data.general (roles, adminRoles)
    - ensureGeneralDefaults(id); applyDefaults, validate, updateById for general; cache (location flexible); setEffectiveGeneralCache, getEffectiveAdminRoles(), getEffectiveRoles() — cache must work multi-server multi-instance
  - `webapp/controller/health.js`:
    - call ensureGeneralDefaults when data.general missing; set cache from globalConfig.data.general
  - `webapp/controller/config.js`:
    - invalidate/update cache on PUT default doc; self-lockout validation (admin cannot remove own admin role)
  - `webapp/view/admin/config.shtml`:
    - data-driven tabs and extension panels implemented
    - tab list built from ConfigModel.getSchema().data (_meta.order), same as existing user config
    - extension blocks get generic panel (string, number, boolean, array)-
    - getFormData/populateForm and updateById persist extension block data
    - general tab first
  - `webapp/routes.js`, `webapp/controller/auth.js`, `webapp/controller/user.js`, `webapp/controller/cache.js`, `webapp/controller/health.js`, `webapp/controller/handlebar.js`, `webapp/controller/websocket.js`, `webapp/model/user.js`, `webapp/utils/site-controller-registry.js`:
    - read adminRoles/roles from ConfigModel.getEffectiveAdminRoles(), ConfigModel.getEffectiveRoles() (no app.conf)
  - `webapp/utils/bootstrap.js`:
    - ConfigModel.initializeSchema() after UserModel.initializeSchema()
  - `webapp/app.conf`:
    - remove controller.user.adminRoles in this release (once code stable); no framework read
  - `webapp/translations/en.conf`, `webapp/translations/de.conf`:
    - general tab and field labels (view.admin.config.general.*)
  - `webapp/tests/unit/config/config-model.test.js`:
    - W-147 data.general validation
  - `webapp/tests/unit/config/config-general.test.js`:
    - schema, effective cache, sort on read/write, ensureGeneralDefaults, findById/updateById
  - `webapp/tests/unit/config/config-manifest.test.js`:
    - beforeAll ensure schema init
  - `webapp/tests/integration/config-admin-roles.test.js`:
    - admin edit roles, consumer behavior (getEffectiveAdminRoles → requireAdminRole)
  - `docs/api-reference.md`:
    - config model subsection: extendSchema, getEffectiveAdminRoles, getEffectiveRoles; admin roles from config note; Configuration Schema data.general + extensible

### W-148, v1.6.5, 2026-02-02: jPulse UI: schema-driven config forms and tagInput widget
- status: ✅ DONE
- type: Feature
- objectives: easier way to enter list items, such as roles
- design doc: docs/dev/design/W-148-jPulse-UI-input-tagInput-widget.md
- features:
  - tagInput: type word + Enter → tag with "x" to remove; comma-space in one `<input>`; init(selectorOrElement); parseValue/formatValue
  - setFormData/getFormData(form, data|form, schema): one-line populate and get with schema defaults/coerce/normalize
  - renderTabsAndPanelsFromSchema(tabContainer, panelContainer, schema, data): tabs + panels from schema; flow layout (maxColumns, startNewRow, fullWidth); virtual buttons (type: 'button', action)
- design:
  - name: `jPulse.UI.input.tagInput`; namespace `jPulse.UI.input.*` for future widgets (e.g. multiSelect)
  - single-element: one `<input>` is source of truth; schema-driven config forms: one schema for tabs, panels, set/get
- initial use: site config editor General => roles, adminRoles; Admin config => unified schema-driven tabs/panels
- deliverables:
  - `webapp/view/jpulse-common.js`:
    - add `jPulse.UI.input` functions to enhance input fields with:
      - `.tagInput`, `.setAllValues`, `.getAllValues`, `.setFormData`, `.getFormData`
    - add `jPulse.UI.tabs.renderTabsAndPanelsFromSchema()` function to auto-populate tab panels based on schema
  - `webapp/view/admin/config.shtml`:
    - reduced to minimal style and HTML due to data-driven approach
    - auto-configured panel container
    - one-line setFormData and getFormData
  - `webapp/view/model/config.js`:
    - define baseSchema with _meta (order, tabLabel, maxColumns), field defs (startNewRow, fullWidth, help), virtual button in schema
  - `docs/front-end-development.md`, `docs/genai-instructions.md`, `docs/.md`, `docs/.md`, `docs/plugins/plugin-api-reference.md`:
    - document schema-driven config forms
    - blurb and links in relevant docs
  - `webapp/tests/unit/translations/i18n-variable-content.test.js`, `webapp/tests/unit/utils/jpulse-ui-input-taginput.test.js`, `webapp/tests/unit/utils/jpulse-ui-tabs-schema.test.js`:
  - enhance and add new unit tests

### W-149, v1.6.6, 2026-02-03: websocket: demonstrate and document CRUD operations
- status: ✅ DONE
- type: Feature
- design doc: docs/dev/design/W-149-websocket-crud-ops.md
- objectives: teach that websockets can be use in two ways:
  - websocket for notification, and CRUD over REST (current doc and hello-websocket demo)
  - websocket for CRUD operations (new doc & demo)
- features:
  - document two WebSocket usage patterns in `docs/websockets.md`:
    - pattern A: REST for CRUD, WebSocket for notifications (sync all views); keep/refine existing todo example and "Hybrid REST + WebSocket" section.
    - pattern B: WebSocket for CRUD (e.g. collaborative canvas); mutations sent over WS, server persists and broadcasts; add new section with comparison table and "when to use which."
  - WebSocket framework: support async `onMessage` in `webapp/controller/websocket.js` — await handler when it returns a Promise; on rejection, send error to client (same format as sync throws) so CRUD-over-WS handlers can use async models without try/catch IIFE.
  - new hello-websocket demo: add one page/tab (e.g. "Sticky notes" or "Canvas CRUD") that demonstrates WS-for-CRUD — client sends create/update/delete over WS; server `onMessage` calls model or in-memory store, then broadcasts outcome; all clients see changes in real time.
  - persistence for WS-CRUD demo: in-memory store or simple MongoDB model called from namespace `onMessage`; document hand-off (controller → model/store → broadcast) in docs and code examples.
  - update hello-websocket overview, architecture, and code-examples to describe both patterns and link to the new WS-CRUD demo.
- deliverables:
  - `docs/websockets.md`:
    - two-pattern structure: "REST for CRUD + WS for sync" vs "WS for CRUD"; comparison table; when-to-use; async onMessage note if implemented.
  - `webapp/controller/websocket.js`:
    - await onMessage when it returns a Promise; on rejection, send error to client (same as sync throw).
  - `site/webapp/controller/helloWebsocket.js` (or new controller), `site/webapp/view/hello-websocket/` (new tab + template):
    - new namespace (e.g. `/api/1/ws/hello-notes`) and WS-CRUD demo (e.g. sticky notes or dots); onMessage branches on type, calls store/model, broadcasts.
  - `site/webapp/model/` (optional) or in-memory in controller:
    - store for WS-CRUD demo (create/update/delete); minimal schema.
  - `docs/websockets.md`, `site/webapp/view/hello-websocket/templates/` (overview, code-examples, architecture):
    - describe both patterns; add/update code samples for WS-for-CRUD and async handler.

### W-150, v1.6.7, 2026-02-04: build: exclude hello examples from bump-version on site install
- status: ✅ DONE
- type: Feature
- objectives: when a site deployment uses the `npx jpulse bump-version 1.2.3` utility, it should exclude framework supplied hello examples
- features:
  - enhance bin/bump-version.js to exclude hello example files when running on a site install (not when running on framework or plugin)
- deliverables:
  - `bin/bump-version.js`:
    - hardcoded SITE_SKIP_PATTERNS list (site/webapp/controller/hello*.js, site/webapp/model/hello*.js, site/webapp/view/hello**, site/webapp/view/jpulse-common.js.tmpl, site/webapp/view/jpulse-common.css.tmpl, site/webapp/view/jpulse-navigation.js.tmpl, site/webapp/app.conf.tmpl)
    - isSiteSkipPath(filePath) using existing matchesPattern()
    - discoverFiles() uses findBumpConfig() to detect site context (configPath === 'site/webapp/bump-version.conf'); skip paths matching SITE_SKIP_PATTERNS only when isSiteContext; framework/plugin context unchanged

### W-151, v1.6.8, 2026-02-05: jPulse UI: jPulse.UI.input.jpSelect widget - enhanced select with search, select all
- status: ✅ DONE
- type: Feature
- objectives:
  - better UX for single and multi-select: search, select all / clear all, checkboxes for multi
  - keep standard `<select>` and `<select multiple>` as source of truth; enhance with widget only
  - work with jPulse UI form pipeline: setFormData, getFormData, setAllValues, getAllValues
- design:
  - name: `jPulse.UI.input.jpSelect`
  - source of truth:
    - native `<select>` element
    - widget enhances presentation and interaction; value read/written from select
  - value contract:
    - single select → value = string (el.value)
    - multi select → value = array of option values (setAllValues sets selected on options
    - getAllValues returns Array.from(el.selectedOptions).map(o => o.value))
    - core setAllValues/getAllValues support multi-select so setFormData/getFormData work without view-level hacks
  - init: `jPulse.UI.input.jpSelect.init(selectorOrElement, options)`
    - single vs multi inferred from `<select multiple>`
  - init options (all optional; defaults below):
    - search: Boolean — add search filter in dropdown (default: false)
    - searchPlaceholder: String — default from i18n `view.ui.input.jpSelect.searchPlaceholder`
      - user can pass hard-coded string or `{{i18n...}}` handlebar (no special i18n handling in widget)
    - selectAll: Boolean — (multi only) show one control:
      - if all selected → "Clear all",
      - else → "Select all"; text from i18n (default: false)
    - placeholder: String | null — when no selection
      - default from `placeholder` attribute or i18n (default: '' or attribute)
    - captionFormatSome: String — (multi) when not all selected, e.g. '%NUM% selected'
      - default from i18n
    - captionFormatAll: String — (multi) when all selected, e.g. 'All selected'
      - default from i18n
  - i18n path: `view.ui.input.jpSelect.*`
    - searchPlaceholder, selectAll, clearAll, placeholder, captionFormatSome, captionFormatAll
  - long option list: dropdown has auto-scrollbar (max-height + overflow)
- features:
  - progressive enhancement of `<select>` and `<select multiple>`
  - optional search filter in dropdown
  - checkboxes per option for multi
  - optional Select all / Clear all for multi
  - accessible (keyboard, ARIA) and themeable via CSS (--jp-theme-*)
- deliverables:
  - `webapp/view/jpulse-common.js`:
    - jPulse.UI.input.jpSelect (init with options: search, searchPlaceholder, selectAll, placeholder, captionFormatSome, captionFormatAll, separator)
    - setAllValues/getAllValues support multi-select (SELECT multiple: value = array; sets selected on options / returns selectedOptions); setAllValues calls _jpSelectUpdateCaption for caption refresh
    - initAll wires [data-jpselect] to jpSelect.init
    - multi-select trigger caption: when selected labels fit (measured off-screen), shows comma list with opts.separator; else captionFormatSome / captionFormatAll
  - `webapp/view/jpulse-common.css`:
    - jp-jpselect-wrap, jp-jpselect-trigger (with arrow, nowrap/ellipsis), jp-jpselect-dropdown, jp-jpselect-search, jp-jpselect-select-all, jp-jpselect-list (scrollable), jp-jpselect-option (with checkbox for multi)
    - .jp-tabs:has(.jp-jpselect-dropdown.jp-jpselect-open) z-index for dropdown above content; h1–h6 z-index: 0 for overlay stacking; panel overflow: visible for dropdown
  - `webapp/translations/en.conf`, `de.conf`:
    - view.ui.input.jpSelect.* keys (searchPlaceholder, selectAll, clearAll, placeholder, captionFormatSome, captionFormatAll, separator)
  - `webapp/tests/unit/utils/jpulse-ui-input-jpselect.test.js`:
    - init tests (no-op, enhances select, no double-init); init with search: true adds .jp-jpselect-search; init multi with selectAll: true adds .jp-jpselect-select-all; init multi with custom separator uses it in trigger caption
    - getAllValues / setAllValues multi-select (array read/write); setAllValues on jpSelect-enhanced form refreshes trigger caption
  - `docs/jpulse-ui-reference.md`:
    - input utilities: jpSelect widget subsection (init, options including separator, multi caption behavior, value contract, example)
    - setAllValues/getAllValues updated to describe SELECT multiple and jpSelect caption refresh
  - `webapp/view/jpulse-examples/ui-widgets.shtml`: Input Widgets & Form Data section (3.2) with tagInput + jpSelect demo (single search, multi search+selectAll), set sample / get values, source tab; tabs renumbered 3.2→3.6
  - `webapp/view/jpulse-examples/forms.shtml`: paragraph linking to UI Widgets → Input Widgets & Form Data (tagInput, jpSelect, setAllValues/getAllValues, setFormData/getFormData)
  - `docs/front-end-development.md`: jPulse.UI.input API link updated to input widgets, set/get form data (tagInput, jpSelect, helpers)

### W-152, v1.6.9, 2026-02-06: log: fix database name in startup log
- status: ✅ DONE
- type: Bugfix
- objectives:
  - Make the "Database: ..." startup log show the actual DB name (from deployment config), not a wrong fallback.
- features:
  - Use `appConfig.deployment[mode].db` for the DB name in the server listen callback; remove use of `appConfig.database[dbMode].name` (never set in config).
- deliverables:
  - `webapp/app.js`:
    - In the server listen callback, set dbName as `appConfig.deployment?.[mode]?.db || 'jp-dev'` so the log line "Database: ${dbName} (${dbMode} mode)" matches the DB used by the database module (which already uses deployment[mode].db).

### W-153, v1.6.10, 2026-02-07: auth: utility functions for common role checks
- status: ✅ DONE
- type: Feature
- objectives: provide symmetrical utility methods in AuthController for common role-checking patterns used throughout controllers and models
- features:
  - request-based utilities `isAdmin(req)` and `isAuthorized(req, roleOrRoles)` for controllers
  - user-object-based utilities `userIsAdmin(user)` and `userIsAuthorized(user, roleOrRoles)` for models/utilities (symmetrical naming)
  - single method handles both single role string and array of roles
  - hides `ConfigModel.getEffectiveAdminRoles()` implementation detail
- deliverables:
  - `webapp/controller/auth.js`:
    - add `isAdmin(req)` - check if authenticated user has admin role (request-based)
    - add `userIsAdmin(user)` - check if user object has admin role (user-based, symmetrical with isAdmin)
    - add `userIsAuthorized(user, roleOrRoles)` - check if user object has required role(s), handles single string or array (user-based, symmetrical with isAuthorized)
    - place in "UTILITY FUNCTIONS" section after `isAuthorized()`

### W-154, v1.6.11, 2026-02-08: websocket: connection object for handlers; ctx in ws & pub/sub; logging with req or ctx
- status: ✅ DONE
- type: Feature
- objectives:
  - (1) LogController accepts Express req or context object; WebSocket captures username and IP per client for logging
  - (2) WebSocket API: namespace as object (createNamespace), handlers receive single conn param; config at creation; optional chaining
  - (3) Payload { type, data, ctx } with ctx mandatory at top level; broadcast(data, ctx); Redis and logging use payload.ctx
- features:
  - phase 1:
    - "req or context" for logging;
    - client.ctx on each WebSocket client (ctx = { username?, ip? });
    - framework uses it in all client-scoped log calls
  - phase 2:
    - createNamespace(path, options?) returns WebSocketNamespace instance
    - handlers onConnect(conn), onMessage(conn), onDisconnect(conn)
    - conn = { clientId, user, ctx } (onMessage also has message)
    - config (requireAuth, requireRoles) at creation
    - .onConnect/.onMessage/.onDisconnect return this for optional chaining
  - phase 3:
    - app payload { type, data, ctx }; ctx mandatory at top level only; default ctx { username: '', ip: '0.0.0.0' }
    - broadcast(data, ctx), sendToClient(clientId, data, ctx); handlers pass conn.ctx
    - Redis: same payload (with ctx) published and received; _localBroadcast uses payload.ctx for logging
    - jPulse.appCluster.broadcast.*: no public API change; relay wire format { type, data, ctx }
  - docs to update:
    - docs/websockets.md, docs/api-reference.md, docs/README.md, docs/front-end-development.md
    - webapp/static/assets/jpulse-docs/websockets.md, genai-instructions.md, api-reference.md, front-end-development.md
    - site/webapp/view/hello-websocket/templates/code-examples.tmpl, overview.tmpl, architecture.tmpl
  - health controller:
    - uses WebSocketController.getMetrics() only
    - no migration
    - verify getMetrics() remains on controller
- deliverables:
  - phase 1 — Log context and WebSocket ctx:
    - `webapp/utils/common.js`: getLogContext(reqOrContext) — if Express shape (session/headers) keep current; else plain { username?, ip? } as context; formatLogMessage(..., reqOrContext) unchanged
    - `webapp/controller/log.js`: logChange and others already pass first arg; ensure logChange uses getLogContext(reqOrContext).username
    - `webapp/controller/websocket.js`: _completeUpgrade extract IP (getLogContext(request).ip), pass to _onConnection; _onConnection set client.ctx = { username, ip }; all client-scoped LogController calls use client.ctx
    - Tests: getLogContext/formatLogMessage with context object; existing req tests pass
  - Phase 2 — namespace as object, conn param:
    - `webapp/controller/websocket.js`:
     - add WebSocketNamespace class (same file)
     - createNamespace(path, options?) creates instance, registers in namespaces map, returns it
     - instance: path, requireAuth, requireRoles (from options), clients, stats, onConnect(fn), onMessage(fn), onDisconnect(fn) (setters return this), broadcast(), sendToClient(), getStats()
     - remove registerNamespace
     - build conn = { clientId, user, ctx } or { clientId, message, user, ctx }; call handler(conn)
     - internal namespaces (_registerAdminStatsNamespace, _registerTestNamespace) use createNamespace + .onConnect(...).onMessage(...).onDisconnect(...)
    - `webapp/controller/appCluster.js`:
      - createNamespace(path), set handlers to (conn)
      - handleConnect/handleMessage/handleDisconnect(conn)
      - use conn.clientId, conn.user, conn.ctx, conn.message
      - LogController.logInfo(conn.ctx, ...)
    - `site/webapp/controller/helloWebsocket.js`:
      - three namespaces to createNamespace + .onConnect(...).onMessage(...).onDisconnect(...)
      - handlers (conn)
      - use conn.clientId, conn.user, conn.ctx, conn.message
      - LogController.logInfo(conn.ctx, ...)
    - tests: websocket.test.js — createNamespace, conn shape assertions; _onConnection/_onMessage/_onDisconnect pass conn
    - docs: update all listed docs for createNamespace, conn param, and (where relevant) req or context for logging
  - Phase 3 — payload ctx mandatory, broadcast(data, ctx), Redis aligned:
    - `webapp/controller/websocket.js`: payload shape { type, data, ctx }; ctx mandatory (default { username: '', ip: '0.0.0.0' }); broadcast(data, ctx), sendToClient(clientId, data, ctx); build payload as { ...data, ctx }; publish same payload to Redis; _localBroadcast(namespacePath, payload) uses payload.ctx for LogController.logInfo
    - all call sites (helloWebsocket, appCluster, internal namespaces): pass conn.ctx (or default) to broadcast/sendToClient
    - `webapp/controller/appCluster.js`: relay message format { type, data, ctx }; ctx mandatory (default when from REST/Redis); no change to jPulse.appCluster.broadcast.subscribe/publish or callback(data) signature
    - client/templates: msg.data.ctx available; demos and docs updated for payload shape
    - docs: payload { type, data, ctx }, default ctx, broadcast(data, ctx)
    - Redis caching: out of scope — cache key/value unchanged; optional convention: store { data, ctx? } when attaching context to a cached object

### W-155, v1.6.12, 2026-02-09: websocket: dynamic namespace with path pattern, one namespace per resource/room
- status: 🚧 IN_PROGRESS
- type: Feature
- design:
  - docs/dev/design/W-154-websocket-namespace-as-object.md -- use case: Bubblemap, Option 2
  - docs/dev/design/W-155-websocket-dynamic-namespace.md
- objectives:
  - enable CRUD over WebSocket scoped per resource (e.g. per mapId) with one namespace per resource
  - natural broadcast scoping (only clients on that resource get updates)
  - no client→resourceId tracking in app code
  - scale to tens/hundreds of active resources (e.g. maps with ~500 nodes each)
  - clean WebSocket conn API:
    - conn = { clientId, ctx } only (no conn.user)
    - ctx = { username, ip, roles, firstName, lastName, initials } for identity and logging (no id; user ops by username; initials for convenience)
- features:
  - conn refactor (included in W-155):
    - build ctx once at upgrade (username, ip, roles, firstName, lastName, initials from session)
    - conn = { clientId, ctx } / { clientId, message, ctx }
    - no conn.user
    - update websocket.js, appCluster, helloWebsocket, admin/test namespaces, tests, docs
  - option 2a (pre-create):
    - ensure namespace exists when user opens resource (e.g. map view load or REST get map)
    - client connects to /api/1/ws/bubblemap/:mapId
    - no framework change
  - option 2b (optional):
    - framework path-pattern or get-or-create at upgrade so namespace is created on first connect (lazy)
    - requires upgrade handler change to match pattern and resolve resourceId
  - shared handler logic for all dynamic namespaces (e.g. one onConnect/onMessage/onDisconnect factory that receives namespace path or mapId)
  - authorization at connect (user can access this map)
  - optional per-message validation
  - optional: namespace teardown when resource deleted and no clients (or leave namespaces until restart)
- deliverables:
  - `webapp/controller/websocket.js`:
    - conn refactor: build ctx at _completeUpgrade (username, ip, roles, firstName, lastName, initials, params); client = { ws, ctx, ... }; conn = { clientId, ctx } / { clientId, message, ctx }; no conn.user. Pattern namespaces: path with :param → patternNamespaces; _handleUpgrade pattern match, extract params, get-or-create namespace, onCreate(req, ctx); removeNamespace(path, { removeIfEmpty }), namespace.removeIfEmpty(). _onDisconnect removes client from namespace.clients before app handler so user-left count correct
  - `webapp/controller/appCluster.js`:
    - conn = { clientId, ctx } / { clientId, message, ctx }; comments updated, no conn.user
  - `site/webapp/controller/helloWebsocket.js`:
    - all handlers use conn.ctx only (no user). Dynamic Rooms: createNamespace('/api/1/ws/hello-rooms/:roomName', { onCreate }); room chat; Redis cacheIncr/cacheDecr for room count; room-stats and user-left broadcasts; fallback to getStats().clientCount when Redis unavailable
  - `site/webapp/view/hello-websocket/index.shtml`:
    - Dynamic Rooms tab; styles under #wsApp .local-dynamic-rooms
  - `site/webapp/view/hello-websocket/templates/routing.tmpl`:
    - Dynamic Rooms route/tab
  - `site/webapp/view/hello-websocket/templates/dynamic-rooms.tmpl`:
    - Dynamic Rooms UI: room select (Amsterdam, Berlin, Cairo), chat input, message list, room-stats
  - `docs/websockets.md`:
    - v1.6.12; conn/ctx only, full ctx shape and params; Dynamic Namespaces (Per-Resource Rooms) section (pattern, onCreate, removeNamespace, lifecycle, app-layer responsibilities); Handling Reconnect and Missed Updates; Multi-instance behavior; Key Features, examples, API Summary ctx-only
  - `docs/api-reference.md`:
    - WebSocket Controller API blurb: dynamic namespaces, conn shape, reconnect
  - `docs/front-end-development.md`:
    - WebSocket guide blurb: dynamic namespaces, conn/ctx, reconnects
  - `docs/dev/design/W-154-websocket-namespace-as-object.md`:
    - Note that ctx-only follow-up is W-155
  - `docs/dev/design/W-155-websocket-dynamic-namespace.md`:
    - Status Done; Reference link to websockets.md; full implementation plan, ctx structure, onCreate, removeNamespace, lifecycle, tech debt (reconnect/replay), reference app Dynamic Rooms, implementation phases
  - `webapp/tests/unit/controller/websocket.test.js`:
    - beforeEach clear patternNamespaces; describe "W-155 Dynamic Namespaces": pattern registration, param extraction (single/multiple), removeNamespace (not found, removeIfEmpty with/without clients), removeIfEmpty instance method

### W-156, v1.6.13, 2026-02-10: config: sanitize sensitive fields for non-administrators
- status: ✅ DONE
- type: Feature
- objectives:
  - do not expose sensitive config data, such as SMTP credentials
  - provide a common sanitize object function for general use, including site developers
- features:
  - config API getters return sanitized data when caller is not admin (findById, getEffectiveConfig, find use isAdmin; default sanitized).
  - authz: create/update/upsert/delete require admin role (routes.js).
  - change log and console never store or print raw config secrets (LogModel sanitizes before diff).
- deliverables:
  - `webapp/utils/common.js`:
    - CommonUtils.sanitizeObject(obj, pathPatterns, options): deep-clone and apply path patterns (obfuscate or remove); dot notation with last-segment wildcards (prefix*, *suffix); case-insensitive; named export.
  - `webapp/model/config.js`:
    - _sanitizeForResponse(doc) using schema _meta.contextFilter.withoutAuth and sanitizeObject (obfuscate); findById(id, isAdmin), getEffectiveConfig(id, isAdmin), find(filter, isAdmin) return sanitized when !isAdmin; internal callers use findById(id, true) for full doc.
  - `webapp/model/log.js`:
    - logChange: when docType === 'config', sanitize oldDoc/newDoc via ConfigModel.getSchema().contextFilter.withoutAuth and sanitizeObject before createFieldDiff so stored log and console never contain raw secrets.
  - `webapp/controller/config.js`:
    - get/update/upsert/delete use findById(id, true) for old/existing config where full doc needed (self-lockout); response data comes from model (already sanitized for get when !isAdmin).
  - `webapp/routes.js`:
    - Config create/update/upsert/delete routes use AuthController.requireAdminRole().
  - `webapp/tests/unit/utils/common-utils.test.js`:
    - describe sanitizeObject: exact path obfuscate, smtp* prefix, *pass suffix, mode remove, no mutation.
  - `webapp/tests/unit/config/config-model.test.js`:
    - describe Response sanitization: _sanitizeForResponse obfuscates withoutAuth paths, preserves others, does not mutate original.
  - `webapp/tests/unit/log/log-basic.test.js`:
    - describe logChange config sanitization: stored log entry must not contain raw config secrets (smtpPass, license.key).

### W-157, v1.6.14, 2026-02-11: config bugfix: type-preserving sanitization and server-side config load
- status: ✅ DONE
- type: Bugfix
- objectives:
  - preserve field types when obfuscating (e.g. smtpPort stays number, not string)
  - ensure server-side code that needs real config (email, handlebar, health) loads full doc
- bugfix:
  - (1) type-preserving sanitization: sanitized config was replacing all values with string `'********'`, so numeric fields (e.g. smtpPort) became strings and broke clients / email transporter verification (getaddrinfo ENOTFOUND ********). Fixed by obfuscating by type: string → stringPlaceholder, number → numberPlaceholder (default 9999), boolean → false, null → null, object → {}, array → []
  - (2) server-side config load: email initialize, handlebar globalConfig, and health globalConfig were calling findById/defaultDocName or getEffectiveConfig without the admin flag, so they received sanitized config and used placeholders as real values. Fixed by passing true where full doc is required for server-side use (email SMTP, handlebar context before _filterContext, health compliance/cache)
  - (3) plugin pattern: hello-world plugin uses isAdmin(req) and findById(defaultDocName, isAdmin) for educational consistency
- deliverables:
  - `webapp/utils/common.js`:
    - sanitizeObject: options.stringPlaceholder and options.numberPlaceholder (defaults '********', 9999); _sanitizeObjectPlaceholderForValue(value, placeholders) for type-preserving obfuscation; _sanitizeObjectApplyPath uses placeholders object
  - `webapp/model/config.js`:
    - _sanitizeForResponse calls sanitizeObject with { mode: 'obfuscate' } only (use util defaults)
  - `webapp/model/log.js`:
    - logChange config sanitization uses opts = { mode: 'obfuscate' } only (use util defaults)
  - `webapp/tests/unit/utils/common-utils.test.js`:
    - sanitizeObject: smtpPort expects 9999 and typeof number; test custom stringPlaceholder/numberPlaceholder
  - `webapp/tests/unit/config/config-model.test.js`:
    - Response sanitization: smtpPort expects 9999 and typeof number
  - `docs/api-reference.md`:
    - Config Sanitization note: type preserved (strings→********, numbers→9999); CommonUtils.sanitizeObject subsection: stringPlaceholder, numberPlaceholder, type-preserving behavior, example with smtpPort
  - `webapp/controller/email.js`:
    - getEffectiveConfig(defaultDocName, true) so SMTP transporter gets real host/port/auth
  - `webapp/controller/handlebar.js`:
    - initialize and refreshGlobalConfig: configModel.findById(defaultDocName, true) so _filterContext can sanitize per-request
  - `webapp/controller/health.js`:
    - initialize and refreshGlobalConfig: ConfigModel.findById(defaultDocName, true) for compliance and setEffectiveGeneralCache
  - `plugins/hello-world/webapp/controller/helloPlugin.js`:
    - AuthController import; isAdmin = AuthController.isAdmin(req); findById(defaultDocName, isAdmin) (educational pattern)

### W-158, v1.6.15, 2026-02-11: websocket: rate limit messages; whitelist status for non-administrators
- status: ✅ DONE
- type: Feature
- objectives:
  - ensure WebSocket namespaces do not leak data from non-whitelisted namespaces to unauthenticated or non-admin clients
  - support safe demo or read-only exposure when enabled by config (whitelist filter only; no field-level sanitization)
  - mitigate DoS: message size cap and per-client rate limit
- design:
  - config: `controller.websocket.publicAccess.enabled` (false = admin/auth only; true = allow public to connect to whitelisted namespaces). `publicAccess.whitelisted`: array of path patterns (e.g. `['hello-*', 'jpulse-ws-status', 'jpulse-ws-test']`). Entries matched against namespace path (suffix or prefix pattern)
  - no sanitization: for non-admin clients, filter stats by whitelist only — namespaces array and activityLog include only entries whose namespace path matches whitelist; all fields (path, lastActivity, activeUsers, etc.) kept as-is for whitelisted namespaces
  - DoS: `controller.websocket.messageLimits` — maxSize (64 KB), interval (ms), maxMessages per interval per client. Enforce in _onMessage (size before parse; rate limit per clientId; on exceed drop message only)
- features:
  - when publicAccess.enabled and connection path is whitelisted: allow unauthenticated/non-admin to connect; set ctx.isPublic. When disabled or path not whitelisted: existing requireAuth/requireRoles apply
  - jpulse-ws-status: for isPublic clients, send stats with namespaces and activityLog filtered to whitelisted namespaces only
  - messageLimits: reject oversized frames; rate limit messages per client per interval (drop message when exceeded)
- deliverables:
  - `webapp/app.conf`:
    - add `controller.websocket.publicAccess` (`enabled`, `whitelisted`) and `messageLimits` (`maxSize`, `interval`, `maxMessages`)
  - `webapp/controller/websocket.js`:
    - _isPathWhitelisted(path): match path against publicAccess.whitelisted (exact/suffix and prefix pattern e.g. hello-*)
    - _completeUpgrade: if publicAccess.enabled and _isPathWhitelisted(pathname), allow connection even if !requireAuth/!requireRoles; set ctx.isPublic = true
    - _filterStatsByWhitelist(metrics): return metrics with namespaces and activityLog filtered to whitelisted paths only
    - _registerAdminStatsNamespace: when sending stats, if conn.ctx.isPublic use _filterStatsByWhitelist(metrics) before sendToClient
    - _onMessage: enforce maxSize (data.length) before JSON.parse; enforce per-client rate limit (messageLimits); on violation drop message (do not process)
  - `docs/websockets.md`, `docs/api-reference.md`:
    - document publicAccess (enabled, whitelisted) and messageLimits; what non-admin sees (whitelisted namespaces and activity only)

### W-159, v1.6.16, 2026-02-12: view: disable sidebars per page via body data attribute
- status: ✅ DONE
- type: Feature
- objective: allow individual pages to disable left/right sidebars so they are not initialized (and ideally not rendered).
- approach: declarative data attribute on `<body>`; no new globals; CSP-friendly.
- pros:
  - no new globals
  - declarative
  - easy to see in HTML which page disables sidebars
  - works well with CSP
- behavior:
  - view sets `<body data-jp-disable-sidebars="true">` on pages that do not need sidebars.
  - in `jPulse.dom.ready()` (in jpulse-footer.tmpl), before sidebar init and before moving sidebar elements into `.jp-main`, check `document.body.getAttribute('data-jp-disable-sidebars') === 'true'` and skip:
    - moving sidebar DOM into `.jp-main`
    - `jPulse.UI.sidebars.init(...)`
    - empty-sidebar checks and related sidebar logic for that page
  - if the template can know "this page disables sidebars" (e.g. view model flag such as `page.disableSidebars` set by controller or by view context), wrap the sidebar markup blocks in jpulse-footer.tmpl in a conditional (e.g. `{{#unless pageDisableSidebars}}`) so sidebar HTML is not emitted at all when sidebars are disabled for that page
- deliverables:
  - `webapp/view/jpulse-footer.tmpl`:
    - in the ready() block, guard sidebar move + init + empty checks with a check for `data-jp-disable-sidebars` (implemented)
    - CSS added to hide .jp-sidebar, .jp-sidebar-separator, .jp-sidebar-backdrop when body has the attribute (implemented)
    - omit markup: implemented via view load scan; footer uses `{{#unless pageDisableSidebars}}`
  - `webapp/controller/view.js`: at view load (before Handlebars expand), scan view content for `<body ... data-jp-disable-sidebars="true" ... >`, set `req.pageDisableSidebars` (implemented); add `_detectBodyDisableSidebars(content)` helper (implemented)
  - `webapp/controller/handlebar.js`: add `pageDisableSidebars: !!req.pageDisableSidebars` to baseContext (implemented)
  - `docs/sidebars.md` docs:
    - new section "Disable sidebars per page" with usage and example (implemented)
  - `webapp/tests/unit/controller/view.test.js` tests:
    - W-159 _detectBodyDisableSidebars tests implemented

### W-160, v1.6.17, 2026-02-14: redis: get cache object by key pattern
- status: ✅ DONE
- type: Feature
- objectives:
  - allow listing cache entries by key pattern via the Redis wrapper only (no raw Redis in site/plugins)
  - support use cases like “all occupants for a map” (e.g. presence) that need "get all values for keys matching pattern"
- features:
  - new cache API: get-by-pattern (e.g. **cacheGetByPattern**(path, keyPattern) or **cacheGetObjectsByPattern**(path, keyPattern))
  - same path convention as existing cache (component:namespace:category); keyPattern supports wildcard (e.g. `mapId + ':*'`)
  - implementation uses SCAN + GET (or MGET) internally; only wrapper API is public
  - behavior when Redis is unavailable: return empty array or equivalent, consistent with existing cache behavior
- deliverables:
  - `webapp/utils/redis-manager.js`:
    - add cacheGetByPattern (below cacheGet), cacheGetObjectsByPattern (below cacheGetObject); JSDoc; SCAN + MGET, keys sorted, _cacheStats gets/hits/misses; return [] when Redis unavailable or invalid path/keyPattern. cacheGetObjectsByPattern skips invalid JSON, logs error
  - `webapp/static/assets/jpulse-docs/cache-infrastructure.md`:
    - document the new method(s), path/keyPattern rules, and example (e.g. presence list for mapId)
  - `webapp/static/assets/jpulse-docs/api-reference.md`:
    - add doc snippet
  - `webapp/static/assets/jpulse-docs/genai-instructions.md`:
    - add one-liner
  - `webapp/tests/unit/utils/redis-cache.test.js`:
    - mock mget; describe "Get by pattern (W-160)" (cacheGetByPattern + cacheGetObjectsByPattern tests)
    - graceful fallback assertions

### W-161, v1.6.18, 2026-02-18: user view: user settings with single edit mode
- status: ✅ DONE
- type: Feature
- objective: settings page has only one mode — always edit, no more view/edit toggle
- features:
  - remove the view/edit toggle; align with profile (/user/me) vs settings (/user/settings) split so settings is the place to change things
  - [← Back] link to /user/me; [Discard] = revert in place and stay on /user/settings; [Save Changes] = save and stay on page (no redirect)
  - Discard and Save Changes buttons disabled when form not dirty; enabled on input/change
  - in-SPA navigation from settings: when user confirms Discard Changes in jPulse dialog, `revertChanges({ skipConfirm: true })` runs to clear dirty state, then navigate (reload on profile no longer prompts)
  - browser Back from another page (e.g. docs): pageshow(persisted) clears dirty via `revertChanges({ skipConfirm: true })` so reload does not prompt
  - beforeunload only when pathname === '/user/settings' (avoids prompt on reload of profile after in-SPA navigate)
  - breadcrumb on /user/settings shows "… User > Me > Settings" by nesting settings under me in site nav (jpulse-navigation.js)
  - user SPA route titles (document.title) per route; view.user.me i18n section; settings/me/dashboard translation cleanup
- deliverables:
  - `webapp/view/user/settings.tmpl`:
    - view mode removed (no Edit button, no toggleEditMode); fields always editable; Security collapsible only; originalValues set after load; revertChanges() and hasFormChanges(); beforeunload (pathname check); pageshow(persisted) to clear dirty on Back; updateSettingsActionButtons() so Discard/Save Changes disabled when not dirty; revertChanges({ skipConfirm }) for SPA discard and pageshow; plugin actions without toggleEditMode
  - `webapp/view/jpulse-navigation.js`:
    - nest `settings` under `me` (user.pages.me.pages.settings) so breadcrumb is User > Me > Settings; url/labels/hideInDropdown kept
  - `webapp/view/user/index.shtml`:
    - getSettingsDirty() used on in-SPA link click; confirm dialog (Keep Editing / Discard Changes); on Discard Changes call revertChanges({ skipConfirm: true }) then navigateTo(); route titles (USER_SPA_ROUTE_TITLES, document.title in loadRoute)
  - `webapp/view/user/dashboard.tmpl`, `webapp/translations/en.conf`, `webapp/translations/de.conf`:
    - dashboard cards use view.user.me.*; view.user.me section (title, titleDesc, settings, settingsDesc, adminDashboard, adminDashboardDesc, lastLogin, accountStatus, memberSince, never, unknown); obsolete keys removed from view.user.index
  - optional: test in `webapp/tests/unit/utils/jpulse-ui-navigation.test.js` for breadcrumb trail on /user/settings including Me (not done)

### W-162, v1.6.19, 2026-02-19: jPulse.UI: programmatically dismiss jPulse tooltips
- status: ✅ DONE
- type: Feature
- objectives:
  - provide a supported way for applications to programmatically dismiss the active tooltip (desktop + mobile), without synthesizing keyboard events
  - prevent app-level side effects caused by workarounds that dispatch synthetic `Escape` key events to close tooltips
- features:
  - public tooltip dismissal API: `jPulse.UI.tooltip.closeActive()`
  - works regardless of trigger type (hover, focus, touch tap)
  - no dependency on keyboard event synthesis
- deliverables:
  - `webapp/view/jpulse-common.js`:
    - added `jPulse.UI.tooltip.closeActive()` as a public API; immediately hides active tooltip, cancels pending show/hide timers, resets `_activeTooltip`/`_activeTrigger` state; delegates to existing `_hideTooltipImmediate()`
  - `docs/jpulse-ui-reference.md`:
    - documented `jPulse.UI.tooltip.closeActive()`, parameters (none), and examples (canvas pan, sidebar open)
  - `webapp/tests/unit/utils/jpulse-ui-widgets.test.js`:
    - added jPulse.UI Tooltip Widget (W-162) describe block with 6 tests (no-op, hide visible tooltip, clear `_activeTooltip`/`_activeTrigger`, cancel pending show timer, no show after close)

### W-163, v1.6.20, 2026-02-20: auth: add status endpoint; WS: add session-expiry signal; jPulse.UI: confirmDialog onClose fix
- status: ✅ DONE
- type: Feature + Bugfix
- discovered while: T-009 site app feedback — diagnosing keyboard shortcut regression and
  implementing WS connection-status indicator
- objectives:
  - ability to query login status without DB queries
  - ability to detect expired session in a websocket client connection
  - fix a missing confirmDialog({ onClose }) callback
- features:
  - add lightweight `GET /api/1/auth/status` REST endpoint for session-state polling (zero DB queries)
    - always 200; returns `{ authenticated:true, username, roles }` or `{ authenticated:false }`
  - add server-side session-expiry signal to WebSocket: server detects expired session on heartbeat and closes socket with code 4401 so client can surface `'auth-required'` and redirect to login
    — heartbeat auth check: on every ping cycle the server re-validates the session for each client on a `requireAuth` namespace
    - on expiry sends `{ success:false, code:'SESSION_EXPIRED' }` then closes with WS close code 4401
    - client maps 4401 → `'auth-required'` status and suppresses auto-reconnect
  - fix `confirmDialog` `onClose` callback silently ignored on all close paths (bug)
    - callback now fires on all close paths — button click, ESC key, and programmatic close
    - stored on `overlay._onCloseCallback` and invoked in `_closeDialog`
- deliverables:
  - `webapp/controller/auth.js`:
    - added `static async getStatus(req, res)` — reads `req.session.user.isAuthenticated`
    - returns `{ authenticated:true, username, roles }` or `{ authenticated:false }`; no logging
  - `webapp/routes.js`:
    - registered `GET /api/1/auth/status` → `AuthController.getStatus`
  - `webapp/controller/websocket.js`:
    - `_onConnection` accepts optional `req` param; stores on client object for session re-use
    - `_completeUpgrade` passes `req` to `_onConnection`
    - `_startHealthChecks` re-validates session per ping cycle for `requireAuth` namespaces
    - sends `SESSION_EXPIRED` + `ws.close(4401)` on expiry
  - `webapp/view/jpulse-common.js`:
    - `onclose` handler receives `event`, detects code 4401, surfaces `'auth-required'`,
      suppresses reconnect
    - `onmessage` silently returns on `SESSION_EXPIRED` code
    - `getStatus()` JSDoc updated to include `'auth-required'`
    - `confirmDialog` stores `config.onClose` as `overlay._onCloseCallback` after overlay creation
    - `_closeDialog` invokes and clears `overlay._onCloseCallback` before animate-out
  - `docs/api-reference.md`, `docs/websockets.md`, `docs/security-and-auth.md`,
    `docs/jpulse-ui-reference.md`: updated to document all three changes
  - `webapp/tests/unit/controller/auth-controller.test.js`:
    - added `getStatus (W-163)` describe block with 6 tests (authenticated, unauthenticated
      variants, missing session, empty roles, always HTTP 200)
    - fixed pre-existing `HookManager.clear()` guard using optional chaining
  - `webapp/tests/unit/utils/jpulse-ui-widgets.test.js`:
    - added `confirmDialog - onClose callback (W-163)` describe block with 4 tests
      (button click, ESC key, dontClose suppresses onClose, no error without onClose option)

### W-164, v1.6.21, 2026-02-21: websocket: fix _startHealthChecks crash due to incomplete fakeReq/fakeRes
- status: ✅ DONE
- type: Bugfix
- objectives:
  - Fix Node.js process crash introduced by W-163 `_startHealthChecks` session re-validation
- features:
  - `webapp/controller/websocket.js` — `_startHealthChecks` no longer crashes when `express-session` calls `parseUrl.original(req)` or attempts to write a refreshed session cookie
- deliverables:
  - `webapp/controller/websocket.js`:
    - `fakeReq` now includes `url: '/'` and `originalUrl: '/'` required by `express-session` internal `parseUrl.original(req)` call (previously `undefined.pathname` → crash)
    - `fakeRes` now stubs `setHeader()`, `getHeader()`, and `end()` to satisfy `express-session` when it attempts to refresh the session cookie over the fake response

### W-165, v1.6.22, 2026-02-22: jPulse.UI dialog: keyboard nav with default behavior
- status: ✅ DONE
- type: Feature
- objective: make dialog boxes fully keyboard-navigable: default button, key shortcuts per button, enhanced focus styling, arrow nav in button row; applies to all dialog types
- design notes:
  - **`defaultButton`**: `0 | 1 | 'OK' | 'Cancel'` (index or button label)
    - selects which button is the "default action"
    - when not specified: last button in the row (typically OK)
    - effect 1 — at-rest visual: default button has a subtle extra outline/border even when not focused, so user knows "Enter will do this"
    - effect 2 — focus visual: all buttons get a more prominent focus ring (thicker border + stronger shadow) compared to current barely-noticeable style
    - effect 3 — Enter key: pressing Enter anywhere in the dialog (except `<textarea>`) activates the default button
  - **button key shortcuts**:
    - auto-assigned: first letter of button label (case-insensitive)
    - active when focus is NOT in an `<input>`, `<textarea>`, or `<select>` (avoids conflict with typing)
    - conflict rule: if two buttons share the same first letter, the first button in the row gets the shortcut; the others get none
    - visibility: the shortcut letter is underlined in the button label (standard UX convention)
    - object-style buttons (`{ 'Cancel': fn, 'OK': fn }`): key shortcut triggers the same fn as clicking — no conflict between fn callbacks and keyboard nav
  - **initial focus** (auto-detected, no option needed):
    - if the dialog contains `<input>` or `<select>` elements: focus the first one
    - else: focus the default button
  - **Tab / Shift+Tab**:
    - cycles all focusable elements (inputs + buttons) in DOM order
    - wraps around (first ↔ last)
    - standard and accessible; no "inputs only" mode
  - **Left / Right arrow keys**:
    - when focus is on a button in `.jp-dialog-buttons`, Left/Right moves focus between buttons (wraps around)
    - excluded from `<input>` and `<textarea>` fields (arrow keys move the cursor there as normal)
  - **ESC key**: unchanged — closes dialog with `confirmed: false, cancelled: true`
  - **`<textarea>` exclusion**: Enter inside a `<textarea>` inserts a newline as normal; does NOT activate the default button
  - **scope**: applies to all dialog types — `confirmDialog`, `alert`, `info`, `success`
- deliverables:
  - `webapp/view/jpulse-common.js`:
    - `confirmDialog`: added `defaultButton` option (index or label; default = last button); collects `buttonEls`; resolves and marks `defaultButtonEl` with `jp-dialog-btn-default`; assigns letter shortcuts (first letter of label, underlined, first-button-wins on conflict); passes `defaultButtonEl, buttonEls, shortcuts` to `_trapFocus`
    - `_trapFocus`: new signature with `defaultButtonEl, buttonEls, shortcuts`; initial focus = first `<input>`/`<select>` or default button (immediate — no delay — since overlay no longer uses `visibility:hidden`); top-of-stack guard so only the topmost dialog handles keyboard events; `e.stopPropagation()` after guard so no page-level bubble-phase handlers can intercept keys while a modal is open; Enter (not in `<textarea>`, not on button) activates default button; ArrowUp/Down blocked to prevent page scroll; Left/Right cycle focus among buttons; letter-key shortcuts (not in input/textarea/select, no modifier keys); Tab/Shift+Tab wraps at dialog boundaries
  - `webapp/view/jpulse-common.css`:
    - overlay: `visibility:hidden` → `pointer-events:none` so dialog elements are focusable immediately at DOM-insertion time (critical fix — `visibility:hidden` was silently blocking all `focus()` calls)
    - enhanced focus ring for `.jp-dialog-btn:focus` (white inner ring + primary outer ring)
    - at-rest default indicator for `.jp-dialog-btn-default` (subtle outer ring)
    - stronger combined ring for `.jp-dialog-btn-default:focus`
    - underline style for `.jp-dialog-btn u` (shortcut letter)
  - `docs/jpulse-ui-reference.md`:
    - `confirmDialog` API: added `defaultButton` option with description
    - "Dialog Features": expanded keyboard navigation section with full reference

### W-166, v1.6.23, 2026-02-27: site: configurable logo; admin user profile UX; plugin card editable fields
- status: ✅ DONE
- type: Feature
- objectives:
  - make site logo configurable via app.conf (no hard-coded path)
  - align admin user profile UX with /user/settings (always-edit, Back/Discard/Save)
  - support editable input fields in plugin cards when schema sets readOnly: false
- features:
  - **Configurable logo**: app.site.logoUrl and app.site.logoAlt in app.conf; default `/images/jpulse-logo/jpulse-logo-reverse.svg`, `jPulse`; sites override in site/webapp/app.conf; expected size 22×22 px documented
  - **Admin user profile UX**: removed view/edit toggle; always-edit mode; Back (→ /admin/users.shtml), Discard, Save Changes; Discard/Save disabled when not dirty; revertChanges with confirm; beforeunload and pageshow (bfcache) handling
  - **Plugin card editable fields**: when adminCard.readOnly or userCard.readOnly is not true (missing or false = editable), render inputs (text, textarea, number, checkbox, select) instead of display-only; sync to currentUserData on input/change; data-plugin-block/data-plugin-field attributes
- deliverables:
  - `webapp/app.conf`, `site/webapp/app.conf.tmpl`:
    - added app.site.logoUrl, app.site.logoAlt defaults
  - `webapp/view/jpulse-footer.tmpl`:
    - img src/alt use {{app.site.logoUrl}}, {{app.site.logoAlt}}
  - `docs/handlebars.md`, `docs/site-customization.md`:
    - documented logoUrl, logoAlt, 22×22 expected size; "Site Identity and Branding" section
  - `webapp/view/admin/user-profile.shtml`:
    - replaced Edit/Save/Cancel with Back, Discard, Save; fields editable on load; revertChanges(); updateAdminActionButtons(); syncPluginFieldFromElement for plugin inputs; renderPluginFieldInput when adminCard.readOnly !== true
  - `webapp/view/user/settings.tmpl`:
    - renderSettingsPluginFieldInput when userCard.readOnly !== true; syncSettingsPluginFieldFromElement
  - `webapp/translations/en.conf`, `webapp/translations/de.conf`:
    - admin.userProfile: added back, discard; removed edit, cancel
  - `docs/plugins/plugin-api-reference.md`:
    - documented editable fields (readOnly not true = editable), supported inputType (text, textarea, number, checkbox, select)

### W-167, v1.6.24, 2026-03-06: jPulse.UI jpSelect: optional onOptionPreview hook & keyboard navigation
- status: ✅ DONE
- type: Feature
- objectives: allow consumers to show a live preview (e.g. icon) while the user browses options in the dropdown, without changing the selected value
- features:
  - optional `onOptionPreview(value, label)` in `jpSelect.init(sel, options)`
  - when provided, call it on `mouseover` of a `.jp-jpselect-option` with that option’s `data-value` and label; call with `(null, null)` on `mouseleave` of the list, on option click (before selection), and when dropdown closes
  - implement via delegation on the list DOM so it works with search filtering and re-built lists
  - keyboard navigation: ArrowUp/ArrowDown move highlight; Home/End jump; Enter/Space select; Escape closes; Tab from search moves focus to list
- deliverables:
  - `webapp/view/jpulse-common.js`:
    - onOptionPreview (mouseover/mouseleave, click, closeDropdown)
    - keyboard (highlightedIndex, listEl tabindex, ArrowUp/Down/Home/End/Enter/Space/Escape/Tab, search ArrowDown/Up)
  - `webapp/view/jpulse-common.css`:
    - .jp-jpselect-option-highlighted
  - `docs/jpulse-ui-reference.md`:
    - onOptionPreview + Keyboard subsection
  - `webapp/view/jpulse-examples/ui-widgets.shtml`:
    - country demo with onOptionPreview, label row with preview span
  - `webapp/tests/unit/utils/jpulse-ui-input-jpselect.test.js`:
    - tests for hover/leave and empty value

### W-168, v1.6.25, 2026-03-06: jPulse UI: new jPulse.UI.input.slider widget
- status: ✅ DONE
- type: Feature
- objectives:
  - horizontal slider for a single integer value with min/max/step/default
  - value always shown in thumb (pill/rounded rect that grows for e.g. "100"); no separate value box
  - default value distinct from initial value; optional small vertical tick on track at default position (only when default is set)
  - keyboard: focus on slider, Left/Right move by step; integrate with setAllValues/getAllValues and other jPulse.UI.input.* widgets
- features:
  - widget: `jPulse.UI.input.slider.init(selectorOrElement, options?)`. Options: min, max, step (default 1), default (optional; for reset + tick), showValue (default true).
  - element: regular `<input type="number">` with `data-slider`; optional `data-slider-min`, `data-slider-max`, `data-slider-step`, `data-slider-default`. Value = input.value; no data-slider-value.
  - visual: wrap + hide input (like tagInput/jpSelect); track, filled segment (primary), thumb (pill/rounded rect with value inside, box-shadow). If default is set: small vertical line on track at default position; if default not set: no tick. Thumb positioned in pixels so it stays flush at min/max; edge dead zones (cutoff from thumb width) so first/last value-steps don’t move thumb. Wrap has margin 6px + padding 3px vertical.
  - events: fire `input` on every change; fire `change` on commit (mouseup/touchend, keyup after arrow).
  - initAll: init all `input[data-slider]` in container; setAllValues updates input and calls `_jpSliderSetValue` so thumb/tick/fill update. Click on track focuses track so arrow keys work without tabbing.
  - schema: `inputType: 'slider'` in _renderSchemaBlockFields renders slider input with data-slider and data-slider-min/max/step/default from field def; doc lists slider in Schema inputTypes and Schema-driven forms.
  - step default 1 when attribute missing or parsed as 0/NaN (avoids NaN in value).
- deliverables:
  - `webapp/view/jpulse-common.js`:
    - jPulse.UI.input.slider.init(selectorOrElement, options); track, fill, thumb (value in thumb), optional default tick; pixel-based positioning (flush min/max, cutoff); track.focus() on pointer down; step default 1 when 0/NaN; _jpSliderSetValue; initAll and setAllValues slider handling
    - _renderSchemaBlockFields: inputType === 'slider' branch (min, max, step, default from fieldDef)
  - `webapp/view/jpulse-common.css`:
    - .jp-slider-wrap (margin 6px 0, padding 3px 0), .jp-slider-track, .jp-slider-fill, .jp-slider-default-tick, .jp-slider-thumb (box-shadow), .jp-slider-value (theme variables)
  - `docs/jpulse-ui-reference.md`:
    - jPulse.UI.input.slider API, options, data attributes, default tick, keyboard, form integration; Schema-driven forms and inputType 'slider'; setAllValues/getAllValues/Convention slider; Schema inputTypes paragraph
  - `webapp/view/jpulse-examples/ui-widgets.shtml`:
    - Volume slider demo (0–100, step 5, default 50, value in thumb); init and setAllValues with sliderValue: 75; source snippet
  - `webapp/tests/unit/utils/jpulse-ui-input-slider.test.js`:
    - unit tests: init (no-op bad selector/non-input, wrap/track/fill/thumb/default tick, no double-init), _jpSliderSetValue, getAllValues, initAll

### W-169, v1.6.26, 2026-03-07: toast: dismiss early; jPulse.UI.input.slider: add data-slider-suffix="..."
- status: ✅ DONE
- type: Feature
- objectives:
  - let users dismiss any toast immediately so error toasts do not obstruct the UI
  - allow slider thumb label to show a suffix (e.g. %, " ms") for readability; stored value stays numeric
- features:
  - toast dismiss button:
    - every toast has a small [×] button in the upper-right
    - click dismisses that toast immediately (same animation as auto-hide)
    - aria-label "Dismiss"; keyboard-focusable
    - error toasts no longer block access to elements for their full duration
  - Slider suffix:
    - optional `data-slider-suffix` (and `options.suffix`) appends a string to the value shown in the thumb only (e.g. `"%"` → "120%", `" ms"` → "500 ms")
    - schema: field def `suffix` renders as `data-slider-suffix` for schema-driven slider fields
- deliverables:
  - `webapp/view/jpulse-common.js`:
    - toast: content wrapped in .jp-toast-content; add .jp-toast-close button (×, aria-label Dismiss), click → _hideToast
    - slider: suffix from data-slider-suffix or options.suffix; setLabel uses value + suffix; schema slider branch adds data-slider-suffix from fieldDef.suffix
  - `webapp/view/jpulse-common.css`:
    - .jp-toast padding-right 36px for button; .jp-toast-close (absolute top-right, 24×24, transparent bg, opacity on hover, focus ring)
  - `docs/jpulse-ui-reference.md`:
    - slider element and options document data-slider-suffix and suffix; schema slider field may include suffix
    - toast: features bullet for dismiss button

### W-170, v1.6.27, 2026-03-07: user settings: support jPulse.UI.input.* widgets; site config sliders
- status: ✅ DONE
- type: Feature
- objectives:
  - allow regular users to save schema-extension blocks they own (userCard.visible: true) via PUT /api/1/user
  - support jPulse.UI.input.* widgets (slider, tagInput) in user settings plugin/schema-extension cards
  - convert site config broadcast.nagTime and broadcast.disableTime from select dropdowns to sliders
- features:
  - PUT /api/1/user: regular user self-update now also passes through schema-extension blocks where userCard.visible: true (previously silently dropped; only admins could persist extension blocks)
  - settings page: inputType: 'slider' renders a data-slider number input (min, max, step, default reference tick, suffix from fieldDef); jPulse.UI.input.slider.init() initializes it after card DOM insertion
  - settings page: inputType: 'tagInput' renders a data-taginput text input pre-formatted via tagInput.formatValue(); jPulse.UI.input.tagInput.init() initializes it after card DOM insertion
  - settings page: syncSettingsPluginFieldFromElement() correctly reads tagInput value via tagInput.parseValue(el.value) returning string[]
  - settings page: renderPluginCards() calls jPulse.UI.input.initAll(container) after all card HTML is inserted, covering all current and future jPulse.UI.input.* widget types (slider, tagInput, jpSelect)
  - site config: broadcast.nagTime converted from select (fixed options) to slider (0–8 h, step 1); broadcast.disableTime converted from select to slider (0–48 h, step 3); no rendering code change needed — _renderSchemaBlockFields and initAll already support inputType: 'slider'
  - tabs: slider thumb/fill positioning was wrong when a tab panel was hidden (display:none) during initAll() because getBoundingClientRect() returns zero on hidden elements; fixed in activateTab() by calling _jpSliderSetValue(el.value) on all input[data-slider] in the newly activated panel after adding jp-panel-active class (both animated and instant paths)
  - slider: default tick position stabilized using cached initial thumb width (defaultTickRefThumbW) on first updateUI() call with trackW > 0; prevents tick drift on repeated re-layouts (e.g. tab switch); deferred layout calls (setTimeout 100/250/450 ms via runWhenConnected) ensure correct thumb position in dialogs and late-layout containers
  - slider: default tick CSS height increased (margin-top/margin-bottom -5px → -7px) for improved visibility
- deliverables:
  - `webapp/controller/user.js`:
    - update(): in regular-user (non-admin) self-update path, also pass through schema-extension blocks where _meta.userCard.visible is true, mirroring admin logic
  - `webapp/view/user/settings.tmpl`:
    - renderSettingsPluginFieldInput(): add inputType: 'slider' branch (type=number, data-slider + data-slider-min/max/step/default/suffix from fieldDef, name attribute); add inputType: 'tagInput' branch (type=text, data-taginput, initial value via tagInput.formatValue, name attribute)
    - syncSettingsPluginFieldFromElement(): add data-taginput branch using tagInput.parseValue(el.value) to return string[]
    - renderPluginCards(): call jPulse.UI.input.initAll(container) after forEach to initialize all inserted widgets
  - `docs/plugins/plugin-api-reference.md`:
    - document slider and tagInput inputType values; slider schema field attributes (min, max, step, default, suffix)
  - `webapp/model/config.js`:
    - broadcast.nagTime: inputType select → slider (min: 0, max: 8, step: 1, default: 4, suffix: 'h')
    - broadcast.disableTime: inputType select → slider (min: 0, max: 48, step: 3, default: 0, suffix: 'h')
  - `webapp/view/jpulse-common.js`:
    - activateTab(): re-layout all input[data-slider] in newly activated panel via _jpSliderSetValue(el.value) — both animated (inside setTimeout) and instant paths; fixes thumb/fill position = 0 when slider was initialized in a hidden tab panel
    - slider.init(): cache initial thumb width (defaultTickRefThumbW) on first updateUI() call with trackW > 0; use cached width for all default tick position calculations to prevent drift on re-layouts; add three deferred updateUI calls (100/250/450 ms via runWhenConnected) for correct layout in dialogs and late-layout containers
  - `webapp/view/jpulse-common.css`:
    - .jp-slider-default-tick: margin-top/margin-bottom extended from -5px to -7px for improved tick visibility
  - `webapp/tests/unit/user/user-update-schema-extension.test.js`:
    - 10 tests: passes visible extension block, blocks non-visible, blocks absent _meta.userCard, skips absent blocks, always passes profile/preferences, handles multiple blocks, passes falsy values, skips undefined, handles empty schema
  - `webapp/tests/unit/user/settings-plugin-fields.test.js`:
    - 22 tests: renderSettingsPluginFieldInput slider (type=number, data-slider attrs, name/id/data-plugin, value, null/undefined, omit absent attr, HTML-escape suffix, initAll initializes); tagInput (type=text, data-taginput, formatValue array/string/undefined/empty, name/id/data-plugin, initAll initializes); syncSettingsPluginFieldFromElement tagInput branch (parseValue → string[], blank → [], number path unaffected, skip missing attrs); renderPluginCards initAll (slider in card initialized, safe on empty)

### W-171, v1.6.28, 2026-03-08: user settings: tabs interface instead of stacked cards
- status: ✅ DONE
- type: Feature
- objectives:
  - replace the vertical card stack on the user settings page with a slick tab interface matching site config style
  - redesign page header to match site config style (compact jp-page-header with user info on the right)
  - fix i18n conflict: German 'Einstellungen' used for both page title and the Preferences tab
- features:
  - page header redesigned: jp-page-header with icon + title on left; user initials badge + full name + status badge on right (replaces large avatar card); avatar section removed
  - username added as read-only input to Personal Info section; email (read-only) moved next to username in same grid row; firstName/lastName in their own grid row; nickName standalone below
  - all settings sections become tabs: Personal Info | Preferences | Security | [one tab per schema-extension plugin block with emoji icon + label]
  - tabs built from static HTML (built-in sections) + dynamic JS (plugin blocks after schema load); tabs.register() called once after all panels are in DOM; settingsTabsHandle module variable stores handle; re-navigation reuses existing tabs (isFirstInit guard skips rebuild)
  - slider re-layout on tab activation: activateTab() in jpulse-common.js (done in W-170) automatically triggers _jpSliderSetValue(el.value) on all input[data-slider] in newly activated panel — fixes offsetWidth === 0 on hidden panels
  - initAll() called once on the whole tabs container after all panels are built, matching config.shtml pattern
  - Security tab: password fields always visible in panel (no collapsible, no jp-collapsible.register()); securityCollapsible variable removed; revertChanges() clears the password fields directly; Security panel uses jp-info-box (not jp-alert which is the toast component)
  - password dirty tracking: currentPassword/newPassword/confirmPassword added to getCurrentFormValues() so typing in any password field enables Save Changes; setTimeout(150) autofill-protection re-baselines originalValues after clearing so browser autofill does not leave spuriously dirty state
  - password change detection: isChangingPassword = !!(newPassword || confirmPassword) — ignores browser-pre-filled currentPassword to avoid false positives
  - password fields NOT cleared on tab switch — controller validates and reports mismatch on save
  - Save/Discard buttons remain below the tab panels, operating across all tabs
  - dirty tracking: getCurrentFormValues() reads built-in fields (including passwords) by getElementById and plugin fields from in-memory currentUserData
  - plugin card checkbox layout: boolean/checkbox fields rendered as span-both-columns jp-checkbox-group div ([✓] Label inline) instead of 2-column label/value split; uses local-plugin-field-checkbox CSS class
  - SPA querySelector bug fix: settings header elements use unique IDs (settingsAvatarHeader, settingsNameHeader, settingsStatusHeader) and getElementById to prevent querySelector('.local-header-status') finding sibling SPA template elements
  - My Dashboard (/user/me): user initials badge + full name + status badge added to jp-page-header right side; loadMeUserData() refreshes header elements from API
  - i18n: settings.title in de.conf changed from 'Benutzereinstellungen' to 'Einstellungen'; settings.preferences in de.conf changed from 'Einstellungen' to 'Darstellung' (Appearance — covers language + theme); settings.securityNote updated in both locales to remove "expand this section" wording; new settings.username key added (en: 'Username', de: 'Benutzername')
- deliverables:
  - `webapp/view/user/settings.tmpl` (v1.6.28):
    - HTML: replace jp-user-avatar-large header block with jp-page-header (icon+title left, user initials+name+status right, unique element IDs); replace jp-card / jp-collapsible structure with jp-tabs markup; static panels for Personal Info (username+email grid, firstName+lastName grid, nickName standalone), Preferences, Security (jp-info-box note, password fields always visible); dynamic plugin panels in staging div; settingsTabs container; Save/Discard/Back buttons below tabs
    - JS: settingsTabsHandle module variable; initSettings() uses isFirstInit to build tabs once and reuse on re-navigation; buildSettingsTabs() constructs tabs array (built-in + plugin blocks) and calls jPulse.UI.tabs.register(); renderPluginCards(buildPanels) — build mode for first init, repopulate mode for re-nav/revert; initAll(tabsContainer) after all panels inserted; securityCollapsible removed; revertChanges() clears password fields directly; getCurrentFormValues() includes password fields; setTimeout(150) re-baselines originalValues after autofill-clear; isChangingPassword uses newPassword||confirmPassword; checkbox fields rendered as jp-checkbox-group spanning both grid columns; header elements use getElementById (unique IDs)
  - `webapp/view/user/index.shtml` (v1.6.28):
    - CSS: local-settings-header-info (flex, align-items center, gap 10px) and local-header-name for settings/me page headers
    - CSS: local-plugin-field-checkbox (grid-column: 1 / -1; muted color; font-weight 500) for inline checkbox layout
  - `webapp/view/user/me.tmpl` (v1.6.28):
    - HTML: local-settings-header-info block (meAvatarHeader, meNameHeader, meStatusHeader) added to jp-page-header
    - JS: loadMeUserData() updated to refresh header elements (initials, fullName, status) from API response
  - `webapp/translations/en.conf`:
    - settings.username: 'Username'
    - settings.securityNote: 'To change your password, use the fields below.'
  - `webapp/translations/de.conf`:
    - settings.title: 'Einstellungen' (was 'Benutzereinstellungen')
    - settings.username: 'Benutzername'
    - settings.preferences: 'Darstellung' (was 'Einstellungen' — conflict with page title resolved)
    - settings.securityNote: 'Um Ihr Passwort zu ändern, verwenden Sie die Felder unten.'

### W-172, v1.6.29, 2026-03-09: configuration: separate app.conf and app-secret.conf
- status: ✅ DONE
- type: Feature
- objectives: split site configuration into a committed `app.conf` (non-secret, shared via git) and a gitignored `app-secret.conf` (secrets + deployment mode per environment), so devs can `npm start` with zero manual setup and prod secrets are never committed
- features:
  - three-layer config merge chain: `webapp/app.conf` → `site/webapp/app.conf` → `site/webapp/app-secret.conf`
  - `site/webapp/app.conf`: committed; contains site name, domain, both dev/prod deployment sections, Redis topology, and a dev-safe session secret placeholder; `deployment.mode: 'dev'` as safe default so `npm start` works without any `app-secret.conf`
  - `site/webapp/app-secret.conf`: gitignored; per-environment file containing `deployment.mode`, real session secret, DB auth credentials, Redis passwords, and cookie security flag
  - `configure.js` generates both files: unified `app.conf.tmpl` (prod values prompted, dev defaults hardcoded) and `app-secret.conf.prod.tmpl` (secrets + `mode: 'prod'`)
  - dev flow: clone repo → `npm start` (zero extra steps; framework default `mode: 'dev'` + dev-safe session secret in committed `app.conf`)
  - prod flow: `npx jpulse configure` generates committed `app.conf` + gitignored `app-secret.conf` + `.env`
  - `shouldRegenerateConfig()` and `generateConsolidatedConfig()` updated to include `app-secret.conf` in the merge chain and cache-invalidation
  - bug fix: `date.add` Handlebars helper — all date arithmetic in `_handleDateAdd` replaced local-time `get*`/`set*` calls with UTC equivalents (`getUTC*`/`setUTC*`) to prevent 1-hour DST offset errors when server timezone differs from UTC
  - bundled slider fix: `jpulse-common.js` — move `track.focus()` before `e.preventDefault()` in `onPointerDown` (modal dialogs block same-cycle focus after preventDefault); add early-return in modal keydown handler when target is inside `.jp-slider-wrap` or is INPUT/TEXTAREA
- deliverables:
  - `.gitignore`:
    - remove `site/webapp/app.conf` (now committed)
    - add `site/webapp/app-secret.conf` (gitignored)
  - `site/webapp/app.conf.tmpl`:
    - replace `secret: 'CHANGE-THIS-SECRET-IN-PRODUCTION'` with `secret: 'dev-only-insecure-do-not-use-in-production'`
    - remove Redis passwords, deployment mode override
    - add comment pointing to `app-secret.conf.tmpl` for per-environment secrets
  - `site/webapp/app-secret.conf.tmpl` (new):
    - reference template for hand-editing; contains `deployment.mode`, `middleware.session.secret`, DB auth, Redis passwords, cookie security
    - header comment explains this file is gitignored and must never be committed
  - `bin/config-registry.js`:
    - `DB_NAME` prompt: default changed to `${JPULSE_SITE_ID}-prod` (was `jp-prod`)
    - `DB_NAME_DEV` (new): prompted after `DB_NAME`; default `${JPULSE_SITE_ID}-dev`; used in unified `app.conf.tmpl` for `deployment.dev.db`
  - `templates/webapp/app.conf.tmpl` (new, replaces `app.conf.dev.tmpl` + `app.conf.prod.tmpl`):
    - unified template for `configure.js`; both `deployment.dev` and `deployment.prod` sections; dev DB from `%DB_NAME_DEV%`; dev port hardcoded 8080; prod values from `%PORT%`, `%DB_NAME%`; `mode: 'dev'` as safe default; dev-safe session secret placeholder; no passwords
  - `templates/webapp/app.conf.dev.tmpl`:
    - deleted (replaced by unified template; configure.js not used for dev)
  - `templates/webapp/app.conf.prod.tmpl`:
    - deleted (replaced by unified template)
  - `templates/webapp/app-secret.conf.dev.tmpl` (new):
    - `deployment.mode: 'dev'`, dev session secret, Redis password; reference template for developers who need explicit dev secrets
  - `templates/webapp/app-secret.conf.prod.tmpl` (new):
    - `deployment.mode: 'prod'`, `%SESSION_SECRET%`, DB auth (`%DB_USER%`, `%DB_PASS%`, `%DB_NAME%`), Redis passwords (`%REDIS_PASSWORD%`), `cookie.secure: true`
  - `bin/configure.js`:
    - `createSiteConfiguration()`: use unified `app.conf.tmpl`; also generate `site/webapp/app-secret.conf` from `app-secret.conf.prod.tmpl`
    - `checkRootOwnership()`: add `site/webapp/app-secret.conf` to files-to-check list
  - `webapp/app.js`:
    - `shouldRegenerateConfig()`: add timestamp check for `site/webapp/app-secret.conf`
    - `generateConsolidatedConfig()`: add Step 4 — load and deep-merge `site/webapp/app-secret.conf` after site config; append to `_sources` for cache invalidation
  - `site/README.md`:
    - update directory structure tree: `app.conf` (committed), `app-secret.conf` (gitignored, new)
    - update Configuration Merging section: document three-layer chain
    - update Getting Started: remove `cp app.conf.tmpl app.conf` step (app.conf arrives from git); add note about `app-secret.conf` for prod
  - `templates/deploy/README.md`:
    - update Configuration Files table: add `site/webapp/app-secret.conf` row
  - `site/webapp/app.conf` (new committed example file for framework repo):
    - non-secret, dev-ready config enabling `npm start` immediately after cloning
  - `webapp/controller/handlebar.js`:
    - `_handleDateAdd()`: replace all local-time `get*`/`set*` calls with UTC equivalents (`getUTCFullYear`/`setUTCFullYear`, `getUTCMonth`/`setUTCMonth`, `getUTCDate`/`setUTCDate`, `getUTCHours`/`setUTCHours`, etc.)
  - `webapp/tests/unit/controller/handlebar-date-helpers.test.js`:
    - "should add months to a date" test: replace local-time `setMonth()` expected calculation with UTC literal `new Date('2025-03-18T14:53:20Z').getTime()`
  - `webapp/view/jpulse-common.js` (bundled slider fix):
    - `onPointerDown`: move `track.focus()` before `e.preventDefault()` so modal dialogs don't block focus in the same event cycle
    - modal keydown handler: add early-return when `e.target.closest('.jp-slider-wrap')` (slider key events pass through) and when `e.target.tagName` is INPUT or TEXTAREA

### W-173, v1.6.30, 2026-03-10: jPulse.UI.confirmDialog with onOpen; jPulse.UI.input.jpSelect in modals
- status: ✅ DONE
- type: Feature
- objectives:
  - make jPulse SVG logo work with dark and light theme
  - add an `onOpen` callback to confirmDialog
  - make jpSelect dropdown work inside modal dialogs
- features:
  - A: jPulse SVG Logo:
    - single theme-aware `jpulse-logo.svg`:
      - mask for transparent outside circle; light mode = primary circle + white wave; dark mode = reverse (light circle + darker blue wave via `--jp-theme-color-primary-dark`)
      - uses theme CSS variables when inlined; `prefers-color-scheme` when used as img/favicon
    - `favicon.svg` reverted to simple static format (circle + path, no mask/theme) for favicon generators and browser tab
    - `docs/images/jpulse-logo-20.svg`: copy with intrinsic size `width="20" height="20"` for docs; `docs/README.md` uses `![Logo](./images/jpulse-logo-20.svg)` so it works on GitHub and in app (markdown transform rewrites to `/assets/jpulse-docs/images/...`)
  - B: confirmDialog — add `onOpen` callback:
    - new option `onOpen(dialogElement)`, symmetric with existing `onClose`
    - when it fires: synchronously after the dialog element is appended to the DOM, before any open animation starts (i.e. call `onOpen(dialog)` immediately after `document.body.appendChild(overlay)`, before the `setTimeout` that adds `jp-dialog-show`)
    - why: required to call `jPulse.UI.input.initAll(dialog)` (or individual widget inits) on content that was dynamically injected as the `message` HTML
      - without it, widgets like `jpSelect` cannot be initialized inside a confirm dialog
    - Example:
      ```javascript
      jPulse.UI.confirmDialog({
          title: 'Edit Map',
          message: formHtml,
          onOpen: function(dialog) {
              jPulse.UI.input.initAll(dialog);
          },
          buttons: { ... }
      });
      ```
    - note: `onOpen` already exists in defaultOptions and is invoked in jpulse-common.js but currently after animation and focus setup; move the call to immediately after append, before animation
  - C: jpSelect — ensure dropdown works inside modal dialogs:
    - the jpSelect dropdown panel must appear above the dialog overlay and must not be clipped by any `overflow: hidden` on the dialog container
    - options:
      - append the dropdown panel to `document.body` (positioned absolutely via `getBoundingClientRect()` and updated on open/resize/scroll as needed) rather than as a child of the `<select>`'s wrapper — avoids clipping and z-index issues
      - or expose an `appendTo` option: `jpSelect.init(el, { appendTo: document.body })` so callers (e.g. dialogs) can pass body when needed
    - also: dropdown should flip to open upward when there is insufficient space below the trigger (viewport-aware positioning — check available space before rendering and set class or style so the list opens upward)
  - D: jpSelect close on focus/mousedown: dropdown closes on focus loss (focusout on wrap and dropdown; if focus leaves both, close) and on mousedown outside wrap/dropdown so that dragging the dialog title (or clicking outside) closes the dropdown.
  - E: Modal focus trap: Tab can no longer move focus to the underlying page; focus is trapped inside the dialog and any open jpSelect dropdown. Extended focusable list includes dialog focusables plus focusables from open jpSelect dropdowns; Tab/Shift+Tab always preventDefault and move within that list; INPUT/TEXTAREA no longer skip Tab so the jpSelect search box is included; jpSelect wrap stores `_jpSelectDropdown` so the trap can find open dropdowns.
- deliverables:
  - A: logo:
    - `webapp/static/images/jpulse-logo/jpulse-logo.svg`:
      - theme-aware (mask, light/dark via CSS variables and prefers-color-scheme)
    - `webapp/static/images/jpulse-logo/favicon.svg`:
      - simple static (circle + path) for favicon generators
    - `webapp/static/images/jpulse-logo/readme.txt`:
      - doc favicon vs logo
    - `docs/images/jpulse-logo-20.svg`:
      - intrinsic size 20x20 for docs; `docs/README.md` uses `![Logo](./images/jpulse-logo-20.svg)` and "What is … jPulse?" heading
  - B: confirmDialog onOpen:
    - `webapp/view/jpulse-common.js`:
      - call `config.onOpen(dialog)` immediately after `document.body.appendChild(overlay)`, before the setTimeout that adds `jp-dialog-show`
    - `webapp/tests/unit/utils/jpulse-ui-widgets.test.js`:
      - confirmDialog test that onOpen is called once, synchronously, before overlay has `jp-dialog-show`
  - C: jpSelect in modals:
    - `webapp/view/jpulse-common.js`:
      - jpSelect — append dropdown to `document.body` with class `jp-jpselect-dropdown-portal`
      - set `wrap._jpSelectDropdown = dropdown`
      - openDropdown: position fixed, left/width/top or bottom from getBoundingClientRect(), z-index above dialogs
      - viewport flip (open upward when space below insufficient); closeDropdown removes `jp-jpselect-dropdown-open-up`
      - document click closes only when outside both wrap and dropdown
    - `webapp/view/jpulse-common.css`:
      - `.jp-jpselect-dropdown-portal` for fixed positioning (left/width/top/bottom set by JS)
    - `webapp/tests/unit/utils/jpulse-ui-input-jpselect.test.js`:
      - init test updated for dropdown in body with `jp-jpselect-dropdown-portal`; tests use `document.querySelector('.jp-jpselect-dropdown')`; new tests: dropdown in document.body when open, dropdown gets `jp-jpselect-dropdown-open-up` when trigger near bottom of viewport
  - D: jpSelect close:
    - `webapp/view/jpulse-common.js`:
      - focusout on wrap and dropdown with shared closeOnFocusLoss
      - document mousedown closes dropdown when target outside wrap and dropdown
  - E: modal focus trap:
    - `webapp/view/jpulse-common.js`:
      - _trapFocus — Tab branch builds extended focusable list (dialog + open jpSelect dropdown focusables via `wrap._jpSelectDropdown`)
      - always preventDefault on Tab; move focus next/prev in extended list, wrap at ends
      - if activeElement not in list, focus first or last
      - early return for INPUT/TEXTAREA changed to skip only when `e.key !== 'Tab'`
  - docs and examples:
    - `docs/jpulse-ui-reference.md`:
      - confirmDialog onOpen (synchronous, before animation; use for initAll); jpSelect dropdown placement (body, fixed, modals, viewport flip)
    - `docs/genai-instructions.md`:
      - confirmDialog example with `onOpen`, `onClose`
    - `webapp/view/jpulse-examples/ui-widgets.shtml`:
      - dialog with onOpen (jpSelect) button and demo

### W-174, v1.6.31, 2026-03-20: user admin: tab interface; roles from config; security tab; admin search fix
- status: ✅ DONE
- type: Feature
- objectives:
  - align user admin (Manage User) page with user settings UX: tab interface, compact header, same visual patterns
  - roles list for admin always from site config (data.general.roles) so newly defined roles appear
  - replace roles checkboxes with jp-select multi (search, select all) for better usability
  - show all plugin settings in admin via tabs (adminCard.visible blocks)
- features:
  - tab order: Administrative (first) | Personal Information | Preferences | one tab per schema-extension block with adminCard.visible (same order as user settings for built-in, then plugin tabs)
  - roles source: always site config based; GET /api/1/user/enums?fields=roles returns ConfigModel.getEffectiveRoles() (or equivalent) so admin roles picker and validation use the same list as site config
  - roles picker: single <select multiple data-jpselect> with options from config-based roles list; initAll after populate; setAllValues/getAllValues for form sync; remove roles checkbox grid and updateRolesCheckboxes/getSelectedRoles
  - plugin tabs on Admin: only blocks with adminCard.visible (admin-specific); each block becomes a tab panel; reuse existing schemaMetadata and render logic, reflow into tabs instead of stacked cards
  - page header: jp-page-header with icon + title left, user avatar + name + status badge right (match user settings style)
  - one content card per tab panel; Back / Discard / Save below tabs (unchanged behavior, same as user settings)
  - Security tab: admin password override (newPassword + confirmPassword, "Set Password" button inside panel); note explains override and session caveat; min length from appConfig.model.user.passwordPolicy.minLength (alwaysAllow in app.conf); PUT /api/1/user accepts password when admin; setAdminPassword() validates and calls API; no current password required
  - admin user search fix: name and email search work (name → client wraps with *term* for substring; admin search uses UserModel.search with substringEmail so email uses escaped $regex substring); roles/status unchanged; users.shtml serialize from getElementById('searchForm')
- deliverables:
  - `webapp/app.conf`:
    - alwaysAllow: add 'model.user.passwordPolicy.minLength' so Security tab can show min length in template
  - `webapp/controller/user.js`:
    - getEnums: when requested field is 'roles', return roles from site config (ConfigModel.getEffectiveRoles()) instead of user schema enum so newly defined roles appear in admin and elsewhere
    - update (admin): when isAdmin and updateData.password present, filteredData.password = updateData.password (model hashes it)
    - search: pass { substringEmail: isAdmin } to UserModel.search so admin gets substring email match
  - `webapp/model/user.js`:
    - search(queryParams, modelOptions): clone qp; when modelOptions.substringEmail and qp.email, build emailFragment { email: { $regex: escaped, $options: 'i' } }, delete qp.email; use queryBuildOptions (fix shadowing); schemaBasedQuery then _mergeUserSearchQueryFragment if emailFragment; paginatedSearch(..., {}); add _mergeUserSearchQueryFragment()
  - `webapp/view/admin/users.shtml`:
    - searchUsers: serialize from document.getElementById('searchForm'); for name key when value has no *;, wrap as *val* for substring match
  - `webapp/view/admin/user-profile.shtml`:
    - HTML: replace stacked sections with jp-tabs markup; first tab = Administrative (userId, uuid, email, roles, status), then Personal Information (profile), Preferences (language, theme), Security (admin password override panel), then staging div for plugin panels; roles container becomes single <select id="roles" name="roles" multiple data-path="roles"> with options populated from enums API; header changed to jp-page-header (icon+title left, avatar+name+status right); Security panel: jp-info-box note, newPassword/confirmPassword inputs, passwordError box, "Set Password" button
    - JS: buildAdminTabs() with tab-security; register tabs once; renderPluginCards(buildPanels); populate roles select in loadRoles(); jpSelect.init(rolesSelect, { search: true, selectAll: true }) after initAll; getRolesFromSelect(); setAdminPassword() validates min length (from appConfig), match, required; PUT /api/1/user with { password }; remove updateRolesCheckboxes, getSelectedRoles
    - CSS: local-admin-header-info; remove local-roles-grid / local-role-checkbox
  - `webapp/translations/en.conf`, `webapp/translations/de.conf`:
    - view.admin.userProfile: securitySection, securityNote, securityMinHint, newPassword, confirmPassword, setPassword, passwordRequired, passwordMismatch, passwordTooShort, passwordSetSuccess, passwordSetFailed

### W-175, v1.6.32, 2026-03-21: user admin: UX improvement; data-driven core settings; enforce lowercase usernames
- status: ✅ DONE
- type: Feature
- objectives:
  - enforce lowercase usernames at signup and on create; preserve consistent lookups (login/case-insensitive)
  - align Manage User plugin tab panels with User Settings (white card background; no duplicate label in panel)
  - make core user profile fields (profile, preferences) data-driven via schema (same architecture as admin config); consistent checkbox UX across all tabs
- features:
  - lowercase usernames:
    - signup and user create normalize username to lowercase and trim
    - validation allows only `[a-z0-9_.-]`
    - findByUsername normalizes input so login is case-insensitive
    - signup form shows and submits lowercase (text-transform + oninput)
  - user admin UX:
    - plugin cards in tab panels use jp-card primary background (no gray)
    - card header (icon + label + actions) removed in admin profile so the tab label is the only title (no duplication)
  - plugin checkbox UX (user settings + admin Manage User):
    - boolean/checkbox fields use one row: checkbox first, label next (jp-checkbox-group), full grid width — not label column | checkbox column
    - `isPluginCardCheckboxField`: treat `type: 'boolean'` as checkbox even when schema sets redundant `inputType: 'boolean'` (previously fell through to two-column layout)
  - data-driven core settings (user settings + admin Manage User):
    - `UserModel.coreDisplaySchema` defines profile and preferences blocks with per-context `adminCard`/`userCard` metadata (label, order, maxColumns, visible, readOnly)
    - field labels use `{{i18n.*}}` format, resolved server-side via `expandI18nDeep`; consistent with config schema architecture
    - `profile` block: username (user-only readonly, dataPath), email (user-only readonly, dataPath), firstName, lastName, nickName (fullWidth)
    - `preferences` block: language (select), theme (select)
    - user controller `includeSchema=1` now returns both `schema` (plugin extensions) and `coreSchema` (core blocks) after i18n expansion
    - `renderCoreSchemaBlock(blockKey, blockDef, blockData, context, rootData)` renders schema block into panel element; handles grid layout, fullWidth fields, readOnly, select placeholders
    - tab labels for profile/preferences blocks driven by `_meta.userCard.label` / `_meta.adminCard.label` from coreSchema
    - form data collected/restored via `jPulse.UI.input.getAllValues()` / `setAllValues()` using `data-path` attributes
    - language/theme selects found by `querySelector('[data-path="preferences.*"]')` instead of `getElementById`
    - user settings theme preview: after schema-driven preferences, instant light/dark preview uses delegated `change` on `.local-user-profile` when `data-path === 'preferences.theme'` (avoids stale one-off listener on replaced select); discard/revert reads theme via `[data-path="preferences.theme"]` (not removed `id="theme"`)
- deliverables:
  - `webapp/controller/user.js`:
    - signup: destructure username as usernameRaw; set username = (usernameRaw || '').toLowerCase().trim() before validation and userData
    - GET user: `includeSchema=1` now also returns `coreSchema` (expandI18nDeep of UserModel.coreDisplaySchema)
  - `webapp/model/user.js`:
    - validate: usernameNorm = data.username.trim().toLowerCase(); regex ^[a-z0-9_.-]+$ and reserved check use usernameNorm
    - create: normalize data.username to trim().toLowerCase() before validate and findByUsername check
    - findByUsername: normalize argument to toLowerCase().trim() before findOne (case-insensitive lookup)
    - added `UserModel.coreDisplaySchema` static property: profile and preferences blocks with adminCard/userCard metadata and i18n labels
  - `webapp/view/admin/user-profile.shtml`:
    - .local-plugin-card: remove background (use jp-card primary; match user settings)
    - renderPluginCard: omit header (icon, label, actions); card body = description + field grid only
    - isPluginCardCheckboxField(); renderCardFields checkbox branch (jp-checkbox-group, label after input); CSS grid-column 1 / -1 for checkbox row
    - panel-personal-info renamed to panel-profile; panel-preferences both emptied (content rendered by JS)
    - added `renderCoreSchemaBlock()` function; `buildAdminTabs()` reads core tab labels from coreSchema
    - `displayUser()`: calls `renderCoreSchemaBlock` on first init; uses `setAllValues` on reload
    - `getCurrentFormValues()`: uses `getAllValues` for profile/preferences; manual for email/status/roles
    - `revertChanges()`: uses `setAllValues` for profile/preferences; manual for admin fields
    - `saveUser()`: uses `getAllValues` for profile/preferences
    - `loadLanguages()` / `loadThemes()`: use `querySelector('[data-path="..."]')` selectors
    - dom.ready: `loadUser()` moved before `loadLanguages()` / `loadThemes()` (panels must exist first)
  - `webapp/view/user/settings.tmpl`:
    - isPluginCardCheckboxField(); renderCardFields + renderSettingsPluginFieldInput use it (fix boolean + inputType boolean)
    - panel-personal-info renamed to panel-profile; panel-preferences both emptied (content rendered by JS)
    - added `renderCoreSchemaBlock()` function; `buildSettingsTabs()` reads core tab labels from coreSchema
    - `loadSettingsProfile()`: stores coreSchema; calls `renderCoreSchemaBlock` on first init; uses `setAllValues` on reload
    - `getCurrentFormValues()`: uses `getAllValues` for profile/preferences
    - `revertChanges()`: uses `setAllValues` for profile/preferences
    - `saveProfile()`: uses `getAllValues` for profile/preferences
    - `loadSettingsLanguages()` / `loadSettingsThemes()`: use `querySelector('[data-path="..."]')` selectors
    - `initSettings()`: theme preview via delegated change (`preferences.theme`); `revertChanges()`: theme revert via `querySelector('[data-path="preferences.theme"]')`
  - `webapp/tests/unit/user/settings-plugin-fields.test.js`:
    - mirror isPluginCardCheckboxField in test helper
  - `webapp/view/auth/signup.shtml`:
    - username input: style="text-transform: lowercase;" and oninput="this.value = this.value.toLowerCase();"

### W-176, v1.6.33, 2026-03-22: WebSocket: public session re-validation helper for write handlers
- status: ✅ DONE
- type: Feature
- objectives:
  - close the "stale ctx after logout" window for WebSocket-driven mutations (write messages)
  - provide a canonical, DRY re-validation helper in the framework instead of each app duplicating `fakeReq`/`sessionMiddleware` wiring
- background:
  - for `requireAuth: true` namespaces, `ctx` is built once at WebSocket upgrade; express-session is not re-read per message
  - if the user logs out in another tab (or session is destroyed server-side), the connection stays open until the next health-check cycle (default ~30s `pingInterval`)
  - during that window, `onMessage` handlers that trust `ctx.username` / roles can still accept write messages even though the session is no longer valid
  - the framework already re-validates sessions in `_startHealthChecks` and sends `SESSION_EXPIRED` / closes with 4401 on expiry; that logic is private and not reusable by application code
- features:
  - new public static helper `WebSocketController.revalidateClientSession(namespacePath, clientId)`:
    - resolves `namespace` from `this.namespaces.get(namespacePath)` and `client` from `namespace.clients.get(clientId)`
    - fails closed: resolves `false` if `!client?.req` or `!this.sessionMiddleware`
    - otherwise runs the same pattern as the existing health check: builds `fakeReq` / `fakeRes` from `client.req.headers.cookie`, calls `sessionMiddleware`, resolves `true` iff `fakeReq.session?.user?.isAuthenticated`
    - returns `Promise<boolean>`
  - opt-in by application code — the framework cannot distinguish "write" from "read" message types; it is the app's responsibility to call this helper before mutating state in `onMessage` handlers
  - logging:
    - on failure (session expired): `LogController.logInfo` matching the health-check log style; caller should also return an error response to the client
    - on success: no log (avoid noise for active collaborative apps with many write messages per minute)
  - non-goals:
    - does not change default `onMessage` behavior for any namespace (pure opt-in)
    - does not add automatic per-message session checks (read-only / notification traffic continues to use existing `ctx`)
    - no breaking changes — purely additive API
- deliverables:
  - `webapp/controller/websocket.js`:
    - add `static revalidateClientSession(namespacePath, clientId): Promise<boolean>` public method after `_onDisconnect`, before `_startHealthChecks`
    - log info only on session-expired path
  - `docs/websockets.md`:
    - add "Session security (server-side)" section documenting `revalidateClientSession`, when to use it (write paths that need immediate session consistency), and a usage example
  - `docs/api-reference.md`:
    - WebSocket Controller API: link to session security; bullet for `revalidateClientSession` (W-176)
  - `docs/security-and-auth.md`:
    - WebSocket Security: paragraph on stale `ctx`, health-check 4401, opt-in `revalidateClientSession`, link to `websockets.md#session-security-server-side`
  - `webapp/tests/unit/controller/websocket.test.js`:
    - unit tests for revalidateClientSession (missing ns/client, no middleware, ok/fail + log)

### W-177, v1.6.34, 2026-03-23: jPulse.UI.tabs: support SVG in tab icons, for My Settings & admin user profile
- status: ✅ DONE
- type: Feature
- objectives:
  - allow tab icons from server-side schema (`userCard.icon` / `adminCard.icon`) to render inline SVG and other trusted markup — previously `jPulse.UI.tabs` HTML-escaped `tab.icon`, which broke SVG
  - keep a single tab field `tab.icon` (trusted HTML), with `tab.label` always escaped — same mental model as nav icons
  - wire My Settings and Admin → User profile tab registration so core and plugin blocks pass `tab.icon` from `_meta` instead of concatenating icon text into the label
- background:
  - `buildSettingsTabs()` / `buildAdminTabs()` already had access to `meta.icon`; plugin tabs incorrectly prepended raw icon strings to `label` for display
  - framework tab rendering used `escapeHtml(tab.icon)`, so `<svg>…</svg>` appeared as text
- features:
  - `jPulse.UI.tabs` (`_createTabStructure`): if `tab.icon` is set, output `<span class="jp-tab-icon jp-tab-icon-html">` with unescaped `tab.icon`; `jp-tab-label` still uses `escapeHtml(tab.label)`
  - CSS: `.jp-tab-icon.jp-tab-icon-html` uses inline-flex alignment; nested `svg` `display: block` / `flex-shrink: 0` for consistent alignment with labels
  - My Settings (`buildSettingsTabs`): for each visible `userCard` block (core `coreSchema` + plugin `schemaMetadata`), set `tab.icon` to trimmed `meta.icon` when non-empty
  - Admin user profile (`buildAdminTabs`): same for `adminCard` core + plugin tabs; plugin tab `label` is only `meta.label` (icon no longer mixed into label string)
- deliverables:
  - `webapp/view/jpulse-common.js`:
    - tab row HTML: trusted `tab.icon` inside `.jp-tab-icon.jp-tab-icon-html`; comment documents trust boundary
  - `webapp/view/jpulse-common.css`:
    - rules for `.jp-tab-icon.jp-tab-icon-html` and `.jp-tab-icon.jp-tab-icon-html svg` (inline SVG alignment)
  - `webapp/view/user/settings.tmpl`:
    - `buildSettingsTabs()`: core + plugin tab objects include optional `tab.icon` from `userCard` metadata
  - `webapp/view/admin/user-profile.shtml`:
    - `buildAdminTabs()`: core + plugin tab objects include optional `tab.icon` from `adminCard` metadata; plugin labels no longer prefix icon text
  - `docs/jpulse-ui-reference.md`:
    - Tab API: optional `icon` documented as trusted HTML; Features bullet expanded (label escaped, icon markup)

### W-178, v1.6.35, 2026-03-24: jPulse.UI.input.tagInput: add tag suggestions dropdown; keyboard support in modal dialogs
- status: ✅ DONE
- type: Feature
- objective: allow site code to provide a string array of suggestions that appear in a filtered dropdown as the user types, selectable by mouse or keyboard; no site-level synthetic-Enter hacks needed
- features:
  - new method: jPulse.UI.input.tagInput.setSuggestions(selectorOrElement, suggestions)
    - accepts same selector/element as init(); suggestions is string[] or null to clear
    - must be called AFTER init() (el.dataset.taginputInited must be set)
    - idempotent: re-calling replaces the suggestion pool without duplicating DOM
    - exposes addTag internally via el._tagInputAddTag (extracted from init keydown handler)
  - dropdown DOM (body portal, same z-index strategy as jpSelect):
    - .jp-taginput-suggest-dropdown (position:fixed, body child)
    - .jp-taginput-suggest-open toggle class
    - .jp-taginput-suggest-item per item
    - .jp-taginput-suggest-item-highlighted for keyboard-focused item
    - data-suggest-open="1" on wrap when dropdown is open (for site-level dialog patches)
  - show trigger:
    - input event: show when typingInput.value.length >= data-suggest-min (default 2),
      after filtering out already-added tags and case-insensitive substring matching
    - ArrowDown on typingInput: show full list (minus already-added) regardless of min-chars
  - keyboard on typingInput while open:
    - ArrowDown/Up: move highlight, stopImmediatePropagation, preventDefault
    - Enter: if highlighted item → addTag + clear input + close, stopImmediatePropagation
    - Escape: close dropdown, stopImmediatePropagation
  - mousedown on item: addTag(text) + clear typingInput + close (fires before blur)
  - blur on typingInput: setTimeout 150ms → close if still blurred
  - clear on tag-add: typing input clears and dropdown closes
- deliverables:
  - `webapp/view/jpulse-common.js`:
    - extract addTag() from init() keydown handler; expose as el._tagInputAddTag
    - add tagInput.setSuggestions(selectorOrElement, suggestions)
    - modal keyboard (same release, v1.6.35): `_trapFocus` — early return before `document` capture `stopPropagation` when focus is in `<input>` / `<textarea>` (except Tab) so tagInput suggestions and native typing receive keys; `preventDefault` on Arrow/Page keys only to stop scroll of page behind overlay
    - modal + jpSelect (same release): `_trapFocus` — early return when focus is in `.jp-jpselect-wrap` or in an open portaled `.jp-jpselect-dropdown` tied to a wrap in the dialog (`wrap._jpSelectDropdown`), so Enter/Space/arrows reach jpSelect (fixes Enter activating dialog default button from trigger); jpSelect trigger ArrowDown / ArrowUp open dropdown or focus search/list
  - `webapp/view/jpulse-common.css`:
    - .jp-taginput-suggest-dropdown, .jp-taginput-suggest-item, -highlighted variants
    - all colors via --jp-theme-* variables
  - `webapp/tests/unit/utils/jpulse-ui-input-taginput.test.js`:
    - setSuggestions: dropdown created; filters by typed text; excludes added tags
    - keyboard: ArrowDown highlights first item; Enter selects; Escape closes
    - mousedown: calls addTag and closes
    - re-call replaces suggestion pool without duplicating DOM
  - `docs/jpulse-ui-reference.md`:
    - tagInput.setSuggestions API; optional attributes; modal note for `_trapFocus`
    - Dialog Features keyboard bullets (text fields + jpSelect); jpSelect trigger keyboard + modal note
- site-level integration (stays outside framework):
  - compute suggestion array from site data (e.g. self.bubbles tag union)
  - call jPulse.UI.input.tagInput.setSuggestions(tagsEl, allMapTags) in onOpen after initAll()
  - custom per-site dialog `keydown` patches should not be required for tagInput or jpSelect inside `confirmDialog` in v1.6.35+ (framework `_trapFocus` defers those keys)

### W-179, v1.6.36, 2026-03-25: user API: return data with extend schema defaults; jPulse.UI: modal scroll lock, fix textarea keys, UI widgets dialog demo
- status: ✅ DONE
- type: Feature
- objectives:
  - when a site or plugin extends the user document with `UserModel.extendSchema({ myBlock: { ... field: { type, default } } })`, `GET /api/1/user` should return `data.myBlock` with missing keys filled from schema defaults (Mongo may omit the whole block or individual fields until first save)
  - complete modal UX from W-178 follow-up: textarea caret/line keys must not be swallowed; page behind modal must not scroll with wheel/trackpad; examples page should demonstrate a real form inside `confirmDialog`
- features:
  - `UserModel._defaultsTreeFromSchema(schemaNode)` — walks an extension block (skips `_meta`); leaf fields with `type` + `default` (function defaults supported)
  - `UserModel.applyExtensionSchemaDefaults(data)` — for each top-level key in merged `UserModel.schema` that is not in `baseSchema`, `CommonUtils.deepMerge({}, defaultsTree, existing)` so stored values win
  - `UserController.get` — after stripping `passwordHash`, sets `userProfile` from `applyExtensionSchemaDefaults(restProfile)`; applies with or without `?includeSchema=1`.
  - `jPulse.UI` modals: `_applyDialogBodyScrollLock` / `_releaseDialogBodyScrollLock` on first open / last close; `_trapFocus` separate branch for `<textarea>` (no `preventDefault` on Arrow/Page) vs `<input>` (scroll keys except number/range)
  - limitation: top-level extension keys only (not nested merges under `profile` / other base keys)
- deliverables:
  - `webapp/model/user.js`:
    - `_defaultsTreeFromSchema`, `applyExtensionSchemaDefaults`; `@version` 1.6.36
  - `webapp/controller/user.js`:
    - `get`: `let userProfile = UserModel.applyExtensionSchemaDefaults(restProfile)`; `@version` 1.6.36
  - `webapp/tests/unit/user/user-extension-schema-defaults.test.js`:
    - missing block filled from defaults; stored values override; partial object merged with nested defaults
  - `webapp/view/jpulse-common.js`:
    - `_dialogBodyScrollLockSnapshot`; lock on first modal, unlock when stack empty; `_trapFocus` textarea early-return vs input scroll-key `preventDefault`
  - `webapp/view/jpulse-examples/ui-widgets.shtml`:
    - Custom Dialog: `confirmDialog` with text, textarea (3 rows), checkbox, jpSelect+search; `onOpen` jpSelect.init then `initAll`; toast on OK; `.local-custom-dialog-form` CSS; intro + source panel
  - `docs/jpulse-ui-reference.md`:
    - Dialog Features: background scroll lock; keyboard bullets (textarea vs input; jpSelect)
  - `docs/api-reference.md`:
    - Get User Profile: note that `data` includes extension blocks merged with schema defaults
  - `docs/plugins/plugin-api-reference.md`:
    - short note: GET user returns extension defaults in `data` (v1.6.36+)

### W-180, v1.6.37, 2026-04-12: mobile: dialog viewport sizing; plugin settings field grid on narrow screens

- status: ✅ DONE
- type: Feature
- objectives:
  - dialogs must not overflow narrow or short viewports: inline `minWidth` / `minHeight` from `jPulse.UI.confirmDialog` / `_createDialogElement` must not defeat stylesheet `max-width` / media queries (CSS: when `min-width` > `max-width`, min wins)
  - extension-schema plugin cards (user settings SPA and admin user profile) must keep sliders and text inputs usable on phones; fixed two-column label grid (`180px` + `1fr`) leaves too little width for controls on small screens
- features:
  - `_createDialogElement`: when `window.innerWidth < 600`, cap effective `minWidth` to `max(280, vw - 16)` and set matching inline `maxWidth` / `width`; when `window.innerHeight < 800`, cap effective `minHeight` to `max(200, vh - 80)` and set inline `maxHeight`; explicit `config.width` / `config.height` still applied after capping
  - `.jp-dialog` mobile rules: `@media (max-width: 600px)` — `width` / `max-width` `calc(100vw - 16px)` (8px margin each side), `min-width: 0`, `margin: 8px`, header / content / buttons horizontal padding 16px (replaces prior 768px / 95vw / 10px margin block)
  - `.local-plugin-field-grid`: `@media (max-width: 500px)` single-column stack (label row, then control row full width); `gap: 4px 0`; `.local-plugin-field-value` `padding-bottom: 10px` between field pairs
- deliverables:
  - `webapp/view/jpulse-common.js`:
    - `_createDialogElement`: viewport-aware min width/height capping and inline max dimensions as above
  - `webapp/view/jpulse-common.css`:
    - `.jp-dialog` mobile responsive block (600px breakpoint, 16px total horizontal inset)
  - `webapp/view/user/index.shtml`:
    - inline `<style>`: `.local-plugin-field-grid` narrow-screen stacking for user SPA plugin cards
  - `webapp/view/admin/user-profile.shtml`:
    - same `.local-plugin-field-grid` media query for admin user profile plugin cards
  - `README.md`, `docs/README.md`:
    - Latest Release Highlights — v1.6.37 / W-180 bullet
  - `docs/CHANGELOG.md`:
    - v1.6.37 / W-180 section
  - `docs/jpulse-ui-reference.md`:
    - Dialog Features — **Mobile viewport (v1.6.37+)** bullet (`_createDialogElement` caps, `.jp-dialog` media query)
- site-level (optional, after framework deploy):
  - remove redundant dialog `onOpen` width workarounds; simplify fixed `minWidth` where a precomputed width existed only for viewport safety

### W-181, v1.6.38, 2026-04-12: redis: support distributed locks for multi-instance jobs
- status: ✅ DONE
- type: Feature
- objectives:
  - give site apps a safe, atomic distributed lock backed by Redis, without requiring framework-level workarounds
  - required by BubbleMap site work item T-063 Phase A for background snapshot task multi-instance safety (§10 of T-063 design doc)
- features:
  - `RedisManager.cacheLockAcquire(path, key, instanceId, ttlSeconds)` — atomic `SET key value NX EX ttl`; returns `true` if lock was acquired, `false` if another instance holds it; lock auto-expires after `ttlSeconds` if holder crashes (same `path` + `key` convention as other cache APIs)
  - `RedisManager.cacheLockRelease(path, key, instanceId)` — atomic Lua-script check-and-delete: `if GET(key) == instanceId then DEL(key)`; returns `true` if released by this instance, `false` if lock was not owned by this instance (protects against accidental cross-instance release)
  - `instanceId` can be `String(process.pid)` or a UUID generated at server startup; caller's choice
  - graceful degradation: if Redis is unavailable, `cacheLockAcquire` returns `true` (single-instance fallback — caller proceeds without a lock, which is safe on a single-instance deploy); `cacheLockRelease` returns `true` (no-op success) when Redis unavailable
  - metrics: `getMetrics()` exposes `stats.cache.locks` (acquire/release counters: ok, denied, noop, fallback, errors) with cluster aggregation like other cache operation counts; `meta.fields` includes lock field definitions for cluster dashboards
  - admin **System Status**: component health splits **Redis Cache** vs **Redis Lock** summary cards; lock card shows six lock counters (omits fallback counts from the summary); per-instance Redis component details list all eight lock counters (including `acquireFallback` / `releaseFallback`)
  - document in `docs/cache-infrastructure.md` (source doc; framework sync supplies `webapp/static/assets/jpulse-docs` — do not manually duplicate)
  - unit tests: `webapp/tests/unit/utils/redis-cache.test.js` — acquire/release behavior, Lua `eval` path, metrics counters, and `_cacheStats` reset coverage for lock fields
- tech debt / deferred:
  - **Lock TTL extend / refresh** — optional `cacheLockExtend` (Lua: if owner matches, `EXPIRE`) for work that may exceed initial TTL; not required for short background ticks
- deliverables:
  - `webapp/utils/redis-manager.js` (framework):
    - `cacheLockAcquire(path, key, instanceId, ttlSeconds)` and `cacheLockRelease(path, key, instanceId)` with Lua release script
    - lock counters on `RedisManager` metrics provider (`stats.cache.locks` / `cache.locks.*` aggregation)
  - `webapp/view/admin/system-status.shtml`:
    - Redis Cache vs Redis Lock cards on component status; lock metrics on summary (six) and instance details (eight); `formatFieldName` / `formatField` labels for lock fields
  - `webapp/tests/unit/utils/redis-cache.test.js`:
    - distributed lock tests (including `eval` mock for Lua release)
  - `docs/cache-infrastructure.md`:
    - "Distributed locks" subsection with usage, graceful degradation, metrics table (all eight fields), System Status summary vs instance behavior, contention note
  - `docs/api-reference.md`:
    - Server-side Redis section: pointer to distributed locks (`cacheLockAcquire` / `cacheLockRelease`) linking to `cache-infrastructure.md`

### W-182, v1.6.39, 2026-04-12: jPulse.UI: fix nested dialog z-index issue with mixed types
- status: ✅ DONE
- type: Bugfix
- objectives:
  - nested `jPulse.UI.confirmDialog` modals must stack in open order (each new overlay above the previous), regardless of `type`
  - mixed `type` sequences (e.g. `info` then `confirm`) must not place the child under the parent — previously z-index was derived from `type` (`_alertZIndex` vs `_baseZIndex`), so a confirm (~1000 band) could sit under an info (~2000 band)
- features:
  - first dialog (empty `_dialogStack`): unchanged — `alert` / `info` / `success` use `_alertZIndex` + offset; `confirm` uses `_baseZIndex` + offset
  - nested dialogs (`_dialogStack.length > 0`): `zIndex = parseInt(top overlay z-index) + 10` (fallback to `_baseZIndex` if not finite)
  - explicit `options.zIndex`: applied when `!= null` (including `0`); replaces old `config.zIndex ||` which treated `0` as missing
- deliverables:
  - `webapp/view/jpulse-common.js`:
    - `confirmDialog`: z-index assignment block (nested stacking + explicit z-index handling) and comments
  - `README.md`, `docs/README.md`:
    - Latest Release Highlights — v1.6.39 / W-182 bullet
  - `docs/CHANGELOG.md`:
    - v1.6.39 / W-182 section
  - `docs/jpulse-ui-reference.md`:
    - Dialog Features — stacking and `zIndex` (v1.6.39+); parameters `zIndex` bullet

### W-183, v1.6.40, 2026-04-12: utility: add concat to CommonUtils.deepMerge for layered app.conf
- status: ✅ DONE
- type: Feature
- objectives:
  - let site (and future plugin) config append to framework arrays without replacing the entire array (avoids copy-paste drift when framework defaults change)
  - use one deep-merge implementation for consolidated config (`webapp/app.js`) instead of a duplicate local helper
  - document server (`CommonUtils.deepMerge`) and client (`jPulse.utils.deepMerge`) behavior, including `$concat`
- features:
  - `{ $concat: [...] }` merge directive: value must be exactly one key `$concat` with an array; appends to existing array or starts from `[]` if absent; throws if existing value is non-array or `$concat` payload is not an array
  - `webapp/app.js` `generateConsolidatedConfig`: site and site-secret layers use `CommonUtils.deepMerge` (removed inline `deepMerge`)
  - `jPulse.utils.deepMerge`: same `$concat` semantics as server; existing `null` delete-marker behavior unchanged on client
  - `site/webapp/app.conf.tmpl`: example `view.teamCalendar` block + optional `controller.handlebar.contextFilter.alwaysAllow` `$concat` sample with pointer to docs
- deliverables:
  - `webapp/utils/common.js`:
    - `_isConcatDirective`; `_deepMergeRecursive` handles `$concat` before nested-object merge; JSDoc examples on `deepMerge`
  - `webapp/app.js`: removed local `deepMerge`; `CommonUtils.deepMerge` for site and `app-secret` merges
  - `webapp/view/jpulse-common.js`: `$concat` in `jPulse.utils.deepMerge`; `@genai` Cursor version bump
  - `webapp/tests/unit/utils/common-utils.test.js`: four tests for `$concat` (append, missing key, non-array target, invalid payload); `@genai` bump
  - `docs/site-customization.md`: subsection *Appending to Framework Arrays with `{ $concat: [...] }`* under Configuration Merging (incl. `alwaysAllow` example)
  - `docs/api-reference.md`: *CommonUtils.deepMerge* section (replace vs `$concat`, deep object merge, rules, link to site-customization)
  - `docs/front-end-development.md`: *Object Utilities* / `jPulse.utils.deepMerge` (`$concat`, `null` delete, practical example)
  - `site/webapp/app.conf.tmpl`: template aligned with docs (comma-safe structure; `view` + optional Handlebars allowlist append)
  - `README.md`, `docs/README.md`:
    - Latest Release Highlights — v1.6.40 / W-183 bullet
  - `docs/CHANGELOG.md`:
    - v1.6.40 / W-183 section

### W-184, v1.6.41, 2026-04-20: WebSocket client: suppress reconnect loop on a WebSocket close 4403 (access denied)
- status: ✅ DONE
- type: Feature
- objectives:
  - stop pointless reconnect/backoff when the server closes the socket with 4403 (access denied): retry with the same identity cannot succeed without re-auth (same rationale as 4401 session expired)
  - surface terminal auth decisions as connection status `auth-required` so UIs can show login / re-auth instead of an endless `[reconnect]` cycle
  - keep transport/transient close codes on the existing backoff path (`_scheduleReconnect`: 5s steps capped at 30s, max attempts unchanged)
- features:
  - `connection.ws.onclose`: if `event.code === 4401 || event.code === 4403`, set `shouldReconnect = false`, `jPulse.ws._connections.delete(connection.path)`, `_updateStatus(connection, 'auth-required')`, then `return` (no `_scheduleReconnect`)
  - single warn log: `Auth-terminal close (${event.code}) on ${connection.path}` (covers both 4401 and 4403)
  - inline comments document “auth-terminal” (4401 session expired, 4403 access denied) vs fall-through reconnect for e.g. 1000, 1001, 1006, 1011, unknown
- deliverables:
  - `webapp/view/jpulse-common.js`:
    - `_createWebSocket` → `onclose` handler: extended guard and comments (~lines 9458–9470)
  - `README.md`, `docs/README.md`:
    - Latest Release Highlights — v1.6.41 / W-184 bullet
  - `docs/CHANGELOG.md`:
    - v1.6.41 / W-184 section
  - `docs/websockets.md`:
    - `onStatusChange` — `'auth-required'` lists 4401 and 4403; session expiry / access-denied narrative; “How it works” note for 4403
  - related (not this work item): site bubblemap `bubbleWebsocket.js` server-side `announcedClients` / ghost `user-entered`–`user-left` fix addresses peer toast UX; W-184 is the framework client belt-and-suspenders (stops reconnect storm at source)
- test / verify (manual):
  - 4401: session expiry mid-connection still yields `auth-required`, no reconnect loop (regression)
  - 4403: after rejected connection (e.g. expired admin session reconnecting as guest to non-public resource), first close → `auth-required`, not 5s/10s/… backoff
  - 1006 / 1001 / normal server restart: still reconnects with backoff

### W-185, v1.6.42, 2026-04-21: view: add jPulse.date.formatFromNow(); handlebars: improve {{date.fromNow}} helper
- status: ✅ DONE
- type: Feature
- objectives:
  - add a client-side `jPulse.date.formatFromNow(date, nowDate | options | null)` that produces the same relative-time output as the server `{{date.fromNow}}` Handlebars helper, driven by the same i18n keys — no duplicated per-language strings
  - primary use case: chat / activity UIs that label items with ages live (e.g. `alice · 2m ago` with short format, `bob · just now` with long format for sub-second deltas) without a round-trip
  - migrate `controller.handlebar.date.fromNow.*` placeholders from `{{value}}` / `{{range}}` → `%VALUE%` / `%RANGE%` so the subtree can be embedded into a `.js` view via `{{i18n.controller.handlebar.date.fromNow}}` without the second Handlebars pass blanking remaining `{{…}}` tokens
  - align `i18n._expandI18nExpression()` behavior with other parts of the Handlebars pipeline that already `JSON.stringify` non-string results
  - keep backward compatibility with existing leaf-string `{{i18n.x.y}}` usage (including `{{name}}` context substitution on string leaves)
- features:
  - `jPulse.date.formatFromNow(date, arg2)`:
    - arg1 `date` — `Date` | ISO string | timestamp (number or numeric string)
    - arg2 — one of:
      - `Date` | string | number — reference "now" (default: `Date.now()`)
      - object — options: `{ now, format, style, units }`
      - `null` / `undefined` — default behavior
    - `format`: `'long 2'` | `'short 1'` | etc. (same syntax as server helper); `style` / `units` override `format`
    - parity with server:
      - short always: `short.*` units + `pastRange` / `futureRange` (sub-second → `short.second` @ `%VALUE%=0` + range, e.g. `"0s ago"` / `"in 0s"`)
      - long by band: `|Δ| ≤ 1s` → `thisMoment`; `1s < |Δ| ≤ 5s` → `pastMoment` / `futureMoment`; `|Δ| > 5s` → `long.*` units + `separator` + `pastRange` / `futureRange`
      - no `wrap` / `momentInShort` flags (dropped earlier in W-185)
    - reuses the serve-time-bound `jPulse.date._i18nFromNow = {{i18n.controller.handlebar.date.fromNow}}` — one declaration per module load, no per-call i18n lookup
  - translation file migration (`en.conf`, `de.conf`):
    - `controller.handlebar.date.fromNow.pastRange`: `'{{range}} ago'` → `'%RANGE% ago'`
    - `controller.handlebar.date.fromNow.futureRange`: `'in {{range}}'` → `'in %RANGE%'`
    - `controller.handlebar.date.fromNow.long.*`: `'{{value}} year[s]'` → `'%VALUE% year[s]'` (all 14 keys: year[s], month[s], week[s], day[s], hour[s], minute[s], second[s])
    - `controller.handlebar.date.fromNow.short.*`: `'{{value}}y'` → `'%VALUE%y'` (all 7 keys)
    - `pastMoment`, `thisMoment`, `futureMoment`, `separator`: string leaves (no `%` placeholders)
  - `controller/handlebar.js` `_handleDateFromNow()`:
    - shared `translateFromNowUnit` / `applyPastFutureRange`; sub-second long uses three moment keys; sub-second short uses `short.second` + `pastRange`/`futureRange` (no hardcoded `in 0s`/`0s ago`)
    - stop passing `{ value }` / `{ range }` as `translate()` context for unit/range templates; use `%VALUE%`/`%RANGE%` `.replace` after translate
  - `i18n._expandI18nExpression()` (already in place): when `translate()` returns a non-string, emits `JSON.stringify(result)` — mirrors the JSON-stringify behavior already used by other Handlebars helpers for non-string values; unblocks subtree embedding via `{{i18n.path.to.subtree}}`
- deliverables:
  - `webapp/view/jpulse-common.js`:
    - top-level (jPulse closure scope): `const i18nFromNow = {{i18n.controller.handlebar.date.fromNow}};` bound once at module load
    - `jPulse.date.formatFromNow`: same algorithm as `_handleDateFromNow` (no `wrap`/`momentInShort`); JSDoc examples updated
  - `webapp/translations/en.conf`, `webapp/translations/de.conf`:
    - change `{{value}}` / `{{range}}` → `%VALUE%` / `%RANGE%` in the `date.fromNow` block (long × 14, short × 7, pastRange, futureRange)
  - `webapp/controller/handlebar.js`:
    - `_handleDateFromNow()`: remove `{ value }` / `{ range }` from `translate()` calls; substitute `%VALUE%` / `%RANGE%` on the returned string; fallback branches updated
  - `webapp/utils/i18n.js`:
    - `_translate()`: `typeof result === 'string'` guard before `{{name}}` context replace (subtree results pass through)
    - `_expandI18nExpression()`: `JSON.stringify(result)` when non-string — aligns with JSON-stringify treatment elsewhere in the Handlebars pipeline
  - `webapp/tests/unit/translations/i18n-variable-content.test.js`:
    - 7 Subtree embedding tests covering subtree return, leaf regression, context regression, missing-key regression, JSON literal round-trip, leaf expansion regression, deep-expand in string values
  - `webapp/tests/unit/controller/handlebar-date-helpers.test.js`:
    - `{{date.fromNow <past>}}` renders `'N unit[s] ago'` / `'in N unit[s]'` (regression using migrated keys)
    - long format moment bands: `±1s` → `'just now'` (past and future); `(1s, 5s]` → `'moments ago'` (past) / `'in a moment'` (future)
    - short format sub-second: past → `'0s ago'`; future → `'in 0s'`
    - mixed units (`format="long 2"`) → `'N unit, M unit[s] ago'`
  - `webapp/tests/unit/utils/jpulse-common.test.js` (extended with `jPulse.date.formatFromNow (W-185)` describe block):
    - `formatFromNow` with `Date`, ISO string (including ISO 8601 date-only and trimmed date-time), numeric string, number
    - arg2 = `Date` / number / `null` / options (`{ now, format, style, units }`)
    - unit decomposition and `units` truncation
    - long format moment bands: `±1s` → `'just now'`; `(1s, 5s]` → `'moments ago'` / `'in a moment'`; `>5s` → real units
    - short format sub-second: `'0s ago'` / `'in 0s'`    - invalid date → `''`
  - `docs/handlebars.md`:
    - `{{i18n.*}}` Internationalization section: new subsection *Subtree Embedding (v1.6.42+)* with example binding `const i18nFromNow = {{i18n.controller.handlebar.date.fromNow}};` and a note on the `%TOKEN%` convention for client-consumed values
    - `{{date.fromNow}}` section: note placeholder migration (`{{value}}` / `{{range}}` → `%VALUE%` / `%RANGE%`, v1.6.42+); output unchanged for helper consumers
  - `docs/template-reference.md`:
    - Internationalization (i18n) section: *Embedding a Translation Subtree (v1.6.42+)* example + `%VALUE%` / `%RANGE%` placeholder convention rationale (two-pass expansion in `view.js`)
  - `docs/api-reference.md`:
    - `/api/1/handlebar/expand` context list — `i18n` bullet notes subtree embedding (string leaf vs. JSON literal) with cross-link to handlebars reference
  - `docs/front-end-development.md`:
    - Date utilities / `jPulse.date`: *formatFromNow (v1.6.42+)* — options table, chat examples, parity with `{{date.fromNow}}` (i18n-only outer phrases)
  - `README.md`, `docs/README.md`:
    - Latest Release Highlights — v1.6.42 / W-185 bullet (client-side `formatFromNow` + shared i18n)
  - `docs/CHANGELOG.md`:
    - v1.6.42 / W-185 section (new client helper, key migration, subtree embedding alignment)
- test / verify (manual):
  - chat widget: `jPulse.date.formatFromNow(ts, { format: 'short 1' })` renders `'2m ago'`, `'in 3h'`; sub-second with `format: 'long 1'` renders `'just now'` (±1s) or `'moments ago'` / `'in a moment'` (1–5s); sub-second with `format: 'short 1'` renders `'0s ago'` / `'in 0s'` per locale
  - `{{date.fromNow}}` regression across a sample template: same output as before the key migration (strings are equivalent; only placeholder syntax changed)
  - language switch (`preferences.language = 'de'`): both server helper output and client `formatFromNow` output use German translations from the same shared subtree
  - `.js` view containing `const strings = {{i18n.view.ui.input.jpSelect}};` serves a valid JS object literal; `{{i18n.view.ui.input.jpSelect.placeholder}}` still resolves to its string leaf (regression)

### W-186, v1.6.43, 2026-04-22: WebSocket: fix health-check terminate vs on('close') race, ctx lost in _onDisconnect
- status: ✅ DONE
- type: Bugfix
- objectives:
  - in `_startHealthChecks`, when an unresponsive client is terminated (`client.ws.terminate()`), do not remove the client from `namespace.clients` before the socket `close` event runs. `close` is asynchronous; the only removal of the entry from the map should continue to happen in `_onDisconnect` after the client (and `ctx`) is read from the map
  - prevent application `onDisconnect` handlers (e.g. site bubble / presence) from seeing `ctx === null` for health-check terminations, which could yield `username: 'guest'`, empty `mapId`, `LogController` with null ctx (`ip: 0.0.0.0`), and incorrect `user-left` / announce-key behavior when presence state was keyed on real `ctx.params.mapId` at connect time
- features:
  - unresponsive client path: `terminate()` only; single removal point remains `_onDisconnect` (same as normal disconnect) so `const client = namespace.clients.get(clientId)` and `ctx` are available before `namespace._onDisconnect(conn)` runs
- deliverables:
  - `webapp/controller/websocket.js`:
    - in `_startHealthChecks` unresponsive branch: remove `namespace.clients.delete(clientId)` immediately after `client.ws.terminate()`; add a short comment documenting the async-`close` / `_onDisconnect` ordering
    - no change to `_onDisconnect` contract — it still deletes the client from the map after reading `ctx` and invoking `namespace._onDisconnect` if present
  - `README.md`, `docs/README.md` — Latest Release Highlights — v1.6.43 / W-186
  - `docs/CHANGELOG.md` — v1.6.43 / W-186 section
  - `docs/websockets.md` — *Connection health*: implementation note (v1.6.43+ / W-186) on `terminate()` vs map removal
- test / verify (manual):
  - simulate a stuck client (no pong) until the health check terminates the socket; confirm `onDisconnect` receives the real `ctx` (username / params such as `mapId`) and presence / `user-left` matches the user who was connected, not `guest` / empty context

### W-187, v1.6.44, 2026-04-23: jPulse.UI: new input.jpCombo combo-box widget to select and/or edit a value
- status: ✅ DONE
- type: Feature
- objectives:
  - add a new `jPulse.UI.input.jpCombo` widget to `jpulse-common.js` that enhances a native `<select>` element with combo-box behavior: the user can pick from the dropdown suggestion list, pick and then modify the value, or type a value from scratch
  - follow the existing jpulse 1:1 enhancement pattern: one widget per native element, native `<select>` stays in the DOM and remains the value source of truth
  - share internal dropdown helpers (portal, list builder, keyboard nav, search filter) with `jpSelect` to avoid code duplication
  - extra-option state machine: when the current value is not in the original `<option>` list, a `[data-jpcombo-extra]` option is added and selected; when the user picks an original option, the extra option is removed — two states, two transitions, no ambiguity
  - `setAllValues` / `getAllValues` work for list values without any changes; `setAllValues` uses a `_jpComboSetValue` hook on the element for custom values not in the original option list, mirroring the existing `_jpSelectUpdateCaption` hook pattern
  - `initAll` discovers jpCombo widgets via `select[data-jpcombo]`, consistent with `select[data-jpselect]` and `input[data-slider]`
- features:
  - trigger: the jpSelect button trigger is replaced by an `<input type="text">` + a dropdown arrow `<button>`, visually composited as a single field; `placeholder` is read from the native `<select placeholder="...">` attribute and forwarded to the text input
  - dropdown: same portal, viewport-aware flip, keyboard nav (ArrowDown/Up, Enter, Escape, Tab) as jpSelect; fires standard `change` event on the native `<select>` on every value commit
  - extra-option management: `_jpComboSetValue(value)` checks `Array.from(sel.options).some(o => o.value === value && !o.hasAttribute('data-jpcombo-extra'))`; if in list → remove extra option, set `sel.value`; if not in list → add/update `[data-jpcombo-extra]` option, set it selected
  - `search` (boolean, default: false) — show search filter input in dropdown
  - `searchPlaceholder` (string) — placeholder for search input; default from i18n `view.ui.input.jpSelect.searchPlaceholder`
  - `onOptionPreview` (function) — callback `(value, label)` fired on hover / keyboard-navigate over an option; called with `(null, null)` on leave or close; in jpCombo also fills the text input with the previewed value and reverts on `(null, null)`
  - `allowCustom` (boolean, default: true) — when `false`, only values matching an original list option are accepted; typing a non-list value is blocked and the input reverts on blur
  - `onCustomValue` (function) — callback `(value)` fired when user commits a value not present in the original option list; useful for validation or auto-formatting
- deliverables:
  - `webapp/view/jpulse-common.js`:
    - extract shared dropdown helpers from `jpSelect` into closure-scoped internal functions (`_buildJpDropdown`, `_positionJpDropdown`, etc.) reused by both `jpSelect` and `jpCombo`
    - new `jPulse.UI.input.jpCombo` object with `init(selectorOrElement, options?)` method, placed directly after the `jpSelect` block
    - `initAll`: add `root.querySelectorAll('select[data-jpcombo]').forEach(...)` discovery block after the `jpSelect` discovery block
    - `setAllValues`: in the `el.tagName === 'SELECT'` branch, check `typeof el._jpComboSetValue === 'function'` before the plain `el.value = ...` assignment; call `el._jpComboSetValue(String(value))` when present
  - `webapp/view/jpulse-common.css`:
    - `.jp-jpcombo-wrap`, `.jp-jpcombo-input`, `.jp-jpcombo-arrow`, `.jp-jpcombo-dropdown` styles; `.jp-jpcombo-dropdown` and its children reuse `.jp-jpselect-dropdown` styles where possible
  - `webapp/tests/unit/controller/jpcombo.test.js` (new):
    - `init`: enhances `<select>`, skips non-select elements, skips double-init
    - trigger renders as text input + arrow button inside `.jp-jpcombo-wrap`
    - picking a list option sets `el.value`, fires `change`, removes extra option if present
    - typing a non-list value adds `[data-jpcombo-extra]` option, sets it selected, fires `change`
    - `setAllValues` with list value: sets `el.value` via `_jpComboSetValue`, no extra option
    - `setAllValues` with non-list value: adds extra option, sets it selected, `getAllValues` returns the custom value
    - `allowCustom: false`: non-list input reverts to last list value on blur; `onCustomValue` not called
    - `onCustomValue` callback fires only for confirmed non-list values
    - `onOptionPreview`: fills input on hover, reverts on `(null, null)`
    - `search: true`: search input filters option list
  - `docs/jpulse-ui-reference.md`:
    - new `### jpCombo widget` section immediately after the `### jpSelect widget` section, with the same structure: description, dropdown placement note, keyboard note, `init()` parameters table, options, example HTML + JS, value contract, `initAll` note
    - update `setAllValues` description: add jpCombo bullet noting `_jpComboSetValue` hook adds extra option for non-list values
    - update `initAll` description: mention `select[data-jpcombo]` → `jpCombo.init`
  - `README.md`, `docs/README.md` — Latest Release Highlights — v1.6.44 / W-187 bullet
  - `docs/CHANGELOG.md` — v1.6.44 / W-187 section

### W-188, v1.6.45, 2026-04-23: jPulse.UI: fix input.jpCombo blur vs save issue
- status: ✅ DONE
- type: Bugfix
- objectives:
  - eliminate a timing race: jpCombo defers `commitInputValue` by 150ms in the text input `blur` handler so a dropdown list item `click` can register first; a dialog Save (or any external) button that reads the native `<select>`.value in its `click` handler could see the pre-commit value
  - commit the combo value synchronously on the correct event: `mousedown` on `document` outside the widget fires before `blur` and before the external button’s `click`, so `sel.value` is up to date by the time Save runs — no site-side workarounds (e.g. reading the text input directly) required
- features:
  - in `jPulse.UI.input.jpCombo.init`, add `document.addEventListener('mousedown', ...)`: if target is not inside the combo `wrap` or the portaled `dropdown`, and `document.activeElement === textInput`, call `commitInputValue()` immediately; if dropdown was open, `closeDropdown()` (same as existing outside-click `click` path)
  - the existing 150ms `blur` + `setTimeout` path remains; after mousedown commit it becomes a no-op (value already matches) — no duplicate `change` when `commitInputValue` bails on `if (value === sel.value) return`
- deliverables:
  - `webapp/view/jpulse-common.js`:
    - jpCombo: mousedown outside-widget listener as above
  - `webapp/tests/unit/controller/jpcombo.test.js`:
    - test that mousedown synchronous-commit is present in source (document mousedown + `activeElement === textInput` + `commitInputValue`)
  - `docs/jpulse-ui-reference.md` (optional, small):
    - jpCombo widget: one sentence under **Keyboard (text input)** or **Value contract** noting that mousedown outside commits before external buttons’ click handlers, so `sel.value` / getAllValues is safe on Save
  - `README.md`, `docs/README.md` — Latest Release Highlights — v1.6.45 / W-188
  - `docs/CHANGELOG.md` — v1.6.45 / W-188 section

### W-189, v1.6.46, 2026-05-04: jPulse.UI: schema-form generator, async loadOptions, onInit lifecycle hook, showWhen conditional visibility, jpSelect/jpCombo input types; plugin-config consolidation
- status: ✅ DONE
- type: Feature
- objectives:
  - expose the existing `jpSelect` and `jpCombo` widgets to the schema-form generator via new `inputType` values, so site / plugin developers can pick the right select widget declaratively: `inputType: 'select'` → plain native `<select>` (small static enums), `inputType: 'jpSelect'` → searchable single / multi-select, `inputType: 'jpCombo'` → pick-or-type combo with free-entry; the *widget choice* is the affordance — no `allowFreeEntry` boolean
  - add a declarative async option source `loadOptions` for select-type fields (`select` / `jpSelect` / `jpCombo`); the framework owns the per-field loading state, the `<option>` swap on resolve, the current-value re-apply (via `_jpComboSetValue` for `jpCombo` so a previously-saved free-text value survives), and the per-field `initAll` after options land — so the 90% async-options use case is one line in the schema
  - add a declarative `showWhen` field attribute for conditional visibility — common form-design need (e.g. show `viewportWidth` only when `fit` is `scale-fit` or `scale-fill`); framework owns the listener wiring, evaluation, validation skip, value preservation; supports same-block-relative (`field: 'fit'`) and fully-qualified (`field: 'general.mode'`) paths; `equals` / `notEquals` operators; `all` / `any` compound conditions; representable in JSON (`plugin.json`) with no string indirection; hidden fields skip validation but preserve value (consistent and predictable)
  - add a generic `onInit(ctx)` field-lifecycle escape hatch for everything declarative attributes don't cover (cross-field reactivity beyond `showWhen`, default-from-server, decoration, advanced widget callbacks); runs once per field after `loadOptions` settles and before the framework initializes the widget — so `onInit` can mutate `ctx.widgetOptions` to inject rare advanced widget options (`onOptionPreview`, `onCustomValue`, etc.); rejections are caught and logged so one bad `onInit` doesn't break the form
  - same property name, polymorphic by type — both `loadOptions` and `onInit` accept either a function (JS schemas) or a registry-name string (JSON schemas, e.g. `plugin.json`); follows the existing `field.callback` / `field.action` precedent that already does this for `type: 'button'`
  - introduce a small `jPulse.schemaForm` namespace with `register(name, fn)` / `unregister(name)` / `resolve(name)` so plugins and site code can register named handlers without polluting `window`; resolution order is registry → `window[name]` (back-compat with existing `data-callback`) → null with a `console.warn`
  - consolidate the duplicate plugin-config schema renderer (`webapp/view/admin/plugin-config.shtml::renderField` switch, lines 407-587) onto the unified `jPulse.UI.tabs._renderSchemaBlockFields`, eliminating the parallel codepath; back-fill the field types currently only available in plugin-config (`radio`, `checkbox-group`, `multiselect`, `help`, `separator`, and the `email` / `url` / `tel` text variants) into the unified renderer so feature parity is maintained for existing plugins
- features:
  - new `inputType` values in `_renderSchemaBlockFields`:
    - `inputType: 'jpSelect'` — emits `<select data-jpselect>` with the same `options` / `enum` rendering as `select`; honors `fieldDef.multiple` to add the `multiple` attribute (multi-select trigger caption is then driven by jpSelect's i18n); existing `initAll` discovery (`select[data-jpselect]`) wires `jPulse.UI.input.jpSelect.init`
    - `inputType: 'jpCombo'` — emits `<select data-jpcombo>` with same option rendering; existing `initAll` discovery (`select[data-jpcombo]`) wires `jPulse.UI.input.jpCombo.init`; placeholder forwarded via the native `<select placeholder="...">` attribute (jpCombo already reads it); widget hardened for dialogs (text input click opens list; focus stays in text input when open; modal `_trapFocus` bypass + Tab extension for portaled list; option commit on `mousedown`; `focusout` tolerates `relatedTarget === null` for portaled options; arrow `mousedown` avoids ARIA-hidden focus warnings)
    - `inputType: 'select'` — current plain `<select>` behavior preserved unchanged (no data-* attributes added) — back-compat for any schema that doesn't opt in
  - widget tuning via flat top-level field keys (matches existing `slider` precedent — no nested `widgetOptions` wrapper, "don't make me think" DX):
    - `multiple` (boolean, jpSelect) — emits `multiple` on the `<select>`
    - `search` (boolean, jpSelect / jpCombo) — show search filter input in dropdown
    - `selectAll` (boolean, jpSelect multi only) — show "Select all" / "Clear all"
    - `allowCustom` (boolean, jpCombo only, default `true`) — when `false`, free-entry is blocked (jpCombo becomes a searchable-select)
    - `searchPlaceholder` (string, jpSelect / jpCombo) — override the i18n default
    - `placeholder` (string, all) — already top-level today; forwarded to `<select placeholder="…">`
    - rare advanced widget options (`onOptionPreview`, `onCustomValue`, `separator`, `captionFormatSome` / `captionFormatAll`) are intentionally not exposed as flat keys to keep the schema surface small; reach them via `onInit(ctx)` mutating `ctx.widgetOptions` (documented escape hatch — see below)
  - `options` is the canonical key for static option lists; `enum` continues to work as a back-compat alias (shorthand: `enum: ['a', 'b']` ≡ `options: [{value:'a',label:'a'}, ...]`); docs and examples use `options` only
  - `loadOptions` (function | string, optional) — the source of options for select-type fields:
    - function form: `async (ctx) => [{ value, label }, ...]`
    - string form: `'myplugin.loadRegions'` — resolved via `jPulse.schemaForm.resolve(name)`
    - `ctx` shape: `{ field, fieldDef, value, formEl, blockKey, path, schema }` — `field` is the wrapped `<select>` DOM element, `value` is the resolved current value (data | default) before options load
    - resolution order: function → `jPulse.schemaForm.resolve(name)` → `window[name]` → null + `console.warn('jPulse.schemaForm: handler not found: ' + name)`; missing handler does not throw
    - lifecycle: runs once after the field is rendered into the DOM, before the framework wraps it as `jpSelect` / `jpCombo`; framework adds `jp-form-input-loading` class to the `.jp-schema-field` wrapper, sets `disabled` on the `<select>`; on resolve, replaces `<option>`s with the returned list and removes the loading state — widget init is then handled by the post-`onInit` step (see `onInit` lifecycle below); for `jpCombo`, the post-init pass re-applies the current value via `_jpComboSetValue` so a saved free-text value not in the resolved list adds the `[data-jpcombo-extra]` option
    - failure mode: on rejection, render the error message inline via `.jp-schema-field-error` on the wrapper; fall back to static `options` / `enum` if defined on the same `fieldDef`, otherwise empty list; for `jpCombo`, the field stays editable (free-entry still works); for `select` / `jpSelect` it stays disabled with a retry note in the help row
    - cache policy: per form mount, no cache by default — the same `loadOptions` reference re-runs on each `renderTabsAndPanelsFromSchema` call; callers that need cross-form caching wrap their handler themselves
    - isolation: all field `loadOptions` for a given form mount run in parallel via `Promise.allSettled`; one rejection does not block sibling fields
  - `showWhen` (object, optional) — declarative conditional visibility for a field:
    - simple form: `showWhen: { field: 'fit', equals: ['scale-fit', 'scale-fill'] }` — show this field only when the watched field's value matches; `equals` accepts a scalar (strict-equal-after-string-coerce) or an array (membership test)
    - inverse: `notEquals: <scalar | array>` — show only when watched value does NOT match
    - compound: `showWhen: { all: [<cond1>, <cond2>, ...] }` — AND; `showWhen: { any: [<cond1>, <cond2>, ...] }` — OR; conditions inside `all` / `any` are the same `{field, equals|notEquals}` shape; can nest one level (no recursive nesting in v1)
    - field path resolution: bare name (`field: 'fit'`) → same block as the current field; dotted path (`field: 'general.mode'`) → fully-qualified, relative to `schema.data`; missing field → condition evaluates false (hidden) and `console.warn` once per missing path
    - lifecycle: after all fields render and `loadOptions` settles for the form, framework evaluates each field's `showWhen` once and toggles the `.jp-schema-field-hidden` class on the wrapper; collects all referenced field paths and registers a single delegated `change` + `input` listener at the form level, which re-evaluates affected fields when watched values change (no per-field listener proliferation)
    - hidden field behavior: `display: none` on the wrapper via `.jp-schema-field-hidden` class; widget instance and value preserved (no teardown); `loadOptions` and `onInit` still run for hidden fields on initial render so the field is ready when it becomes visible
    - validation: `getFormData` skips validation for fields inside `.jp-schema-field-hidden` (e.g. `required: true` does not fire on a hidden field); but the field's value is still serialized into the form data (predictable, matches HTML form behavior; site code can ignore stale values, or use them when the watched field flips back)
    - JSON form: `showWhen` is a plain object literal — fully representable in `plugin.json` with no string indirection; same shape works in JS schemas and JSON schemas
    - operators deferred to follow-up: `truthy` / `falsy`, `contains` (for `tagInput` / array-valued fields), function-form `showWhen: (ctx) => boolean`; for v1 use `onInit` as the escape hatch for these cases
  - `onInit` (function | string, optional) — generic field-lifecycle hook:
    - function form: `async (ctx) => void`
    - string form: same registry / `window[name]` resolution as `loadOptions`
    - lifecycle: runs after `loadOptions` settles (resolved or rejected) and before the framework wraps the field as `jpSelect` / `jpCombo` — so `onInit` can mutate `ctx.widgetOptions` to inject advanced widget callbacks (`onOptionPreview`, `onCustomValue`, `separator`, etc.) right before init
    - `ctx` shape: same keys as `loadOptions`'s ctx (`field, fieldDef, value, formEl, blockKey, path, schema`) plus a mutable `widgetOptions` object initially populated from the field's flat-key tuning (`search`, `selectAll`, `allowCustom`, `searchPlaceholder`, etc.); `onInit` may add or overwrite keys; whatever's in `ctx.widgetOptions` after `onInit` returns is passed verbatim as the second argument to `jpSelect.init(el, ...)` / `jpCombo.init(el, ...)`; for plain `select` (no widget), `ctx.widgetOptions` is present but unused
    - failure mode: thrown / rejected `onInit` is caught at the framework level, surfaced via `console.warn('jPulse.schemaForm.onInit failed: ' + path, error)`, never blocks form rendering or other fields; the field still gets wrapped as `jpSelect` / `jpCombo` using whatever `ctx.widgetOptions` state existed at the moment of throw
  - `jPulse.schemaForm` namespace — new public surface placed near `jPulse.UI.input`:
    - `register(name, fn)` — register a named handler; throws if `name` already registered (use `unregister` first to override)
    - `unregister(name)` — remove a registered handler; idempotent
    - `resolve(name)` — return the registered fn, or `window[name]` if it's a function, or null
    - `_handlers` — internal `Map` (test-only access)
  - `renderTabsAndPanelsFromSchema` return shape extension:
    - existing tabs instance return value preserved
    - additional `ready: Promise<void>` property — resolves when all `loadOptions` for the form have settled and all `onInit` callbacks have run; callers that need to focus a field, validate, or trigger logic after the form is fully populated can `await result.ready`
    - back-compat: the previous return value (tabs instance) still works as today; `ready` is an extra property on the same object
  - plugin-config consolidation:
    - `webapp/view/admin/plugin-config.shtml` — replace the inline `renderField` / `renderTextInput` / `renderSelect` / `renderRadio` / `renderCheckboxGroup` / `renderMultiselect` / `renderTextarea` / `renderCheckbox` / `renderNumberInput` / `renderFieldTable` / `renderWithTabs` / `renderSimpleForm` switch with a single call to `jPulse.UI.tabs.renderTabsAndPanelsFromSchema`
    - schema shape adapter (`_pluginSchemaToBlocks`): plugin.json's flat array `[{id, type, label, tab, ...}]` is converted once on load into the unified nested block shape (`schema.data[tabKey][fieldId] = { type, inputType, label, ... }` with `_meta: { tabLabel: tab, order: index }`); untabbed fields → default `general` block; conversion happens in one place, has its own unit test
    - `type` / `inputType` normalization (in the adapter): the unified renderer treats `type` and `inputType` as orthogonal (HTML5-style) — `type` is the data type used by `getFormData` for value coercion (`'string'` / `'number'` / `'boolean'` / `'array'`), `inputType` is the widget choice used by `_renderSchemaBlockFields` for DOM emission; plugin.json's legacy single `type` key conflates these, so the adapter expands it: `'text'` / `'password'` / `'email'` / `'url'` / `'tel'` → `{ type: 'string', inputType: <same> }`; `'textarea'` → `{ type: 'string', inputType: 'textarea' }`; `'number'` → `{ type: 'number' }` (renderer infers `inputType: 'number'`); `'boolean'` / `'checkbox'` → `{ type: 'boolean' }` (renderer infers `inputType: 'checkbox'`); `'select'` / `'radio'` / `'jpSelect'` / `'jpCombo'` → `{ type: 'string', inputType: <same> }`; `'multiselect'` / `'checkbox-group'` → `{ type: 'array', inputType: 'multiselect' / 'checkboxGroup' }`; `'tagInput'` → `{ type: 'array', inputType: 'tagInput' }`; `'help'` / `'separator'` → `{ inputType: <same> }` (no data type — non-field); plugin.json schemas that already use the explicit `inputType` form pass through unchanged
    - read / write: `currentConfig` populates via `jPulse.UI.input.setFormData(form, configValues, schema)`; `collectFormValues` becomes `jPulse.UI.input.getFormData(form, schema).data`
    - page wrapper preserved: Save / Reset Defaults buttons, plugin description card, status badge subtitle stay in plugin-config.shtml — only the field rendering moves to the unified renderer; final file shrinks ~250 → ~80 lines
  - back-fill missing types into `_renderSchemaBlockFields`:
    - `inputType: 'radio'` — vertical radio group from `options` (default) or horizontal via `fieldDef.layout: 'horizontal'`; reuses `.jp-form-radio-group` styles
    - `inputType: 'checkboxGroup'` — multi-checkbox group from `options`; value is array; data-path stores comma-joined or, with `fieldDef.type: 'array'`, the array form
    - `inputType: 'multiselect'` — back-compat alias only; rewritten internally to `inputType: 'jpSelect'` with `multiple: true` before render; not documented as a primary type (canonical form is `jpSelect` + `multiple: true`)
    - `inputType: 'help'` — info block (no input, no label column), rendered as `<div class="jp-schema-help">` (inline info — not toast `.jp-alert`); `fieldDef.content` is the body (HTML allowed, sanitized via `jPulse.string.sanitizeHtml`)
    - `inputType: 'separator'` — full-width divider with optional label; rendered as `<div class="jp-divider"><span>{{label}}</span></div>`
    - text branch: honor `inputType: 'email' | 'url' | 'tel'` as plain `<input type=...>` passthrough; existing `inputType: 'password'` already supported
- deliverables:
  - `webapp/view/jpulse-common.js`:
    - new `jPulse.schemaForm` namespace with `register` / `unregister` / `resolve` / `_handlers` Map; placed directly after `jPulse.UI.input`
    - `jPulse.UI.tabs._renderSchemaBlockFields`:
      - extend the existing `inputType: 'select'` branch — split into a shared option-rendering helper that takes `widgetAttr: '' | 'data-jpselect' | 'data-jpcombo'` and `multiple: boolean`; `select` / `jpSelect` / `jpCombo` cases all call it
      - new `inputType` cases: `jpSelect`, `jpCombo`, `radio`, `checkboxGroup`, `help`, `separator`
      - `inputType: 'multiselect'` accepted as a back-compat alias only (rewritten in the inputType-resolution step to `jpSelect` + `multiple: true`); no separate render branch
      - text branch: extend `typeAttr` computation to include `email` / `url` / `tel`
      - flat widget tuning keys (`search`, `selectAll`, `allowCustom`, `searchPlaceholder`, `multiple`) are emitted as data attributes on the `<select>` (`data-jp-search`, `data-jp-selectall`, `data-jp-allowcustom`, `data-jp-search-placeholder`, plus the standard `multiple` attribute) so the post-render pass can read them when constructing `ctx.widgetOptions`
      - emit `data-jp-defer-init="1"` on the `<select>` when `fieldDef.loadOptions` or `fieldDef.onInit` is defined (so `initAll` skips it — the post-render pass owns its widget init); emit `jp-form-input-loading` initial class on the `.jp-schema-field` wrapper for fields with `loadOptions`
      - emit `data-jp-show-when="<JSON>"` on the `.jp-schema-field` wrapper when `fieldDef.showWhen` is defined (JSON serialized with HTML-safe escaping for attribute); the `showWhen` pass reads this attribute to evaluate and to collect dependency paths for the delegated listener
    - `jPulse.UI.tabs.renderTabsAndPanelsFromSchema`:
      - after `panelEl` is populated and tabs registered, run post-render against the tab root (`rootEl` / `tabEl`) so fields remain discoverable after `register()` moves panels into `.jp-tabs-panels`; walk `schema.data` once to collect `(path, fieldDef, fieldEl)` triples for fields with `loadOptions` and / or `onInit`
      - kick off `loadOptions` for all such fields in parallel via `Promise.allSettled`; for each settled promise: (1) call `_applyLoadedOptions` (success) or `_setFieldError` (rejection), (2) build `ctx` including a mutable `ctx.widgetOptions` seeded from the flat-key data attributes on the `<select>`, (3) call `onInit(ctx)` wrapped in try / catch (may mutate `ctx.widgetOptions`), (4) call the per-field widget init (`jpSelect.init(el, ctx.widgetOptions)` / `jpCombo.init(el, ctx.widgetOptions)`), (5) remove the `data-jp-defer-init` marker
      - for fields without `loadOptions` and without `onInit` (no `data-jp-defer-init`), the existing `initAll` discovery handles widget init in the usual way (data attributes already drive `ctx.widgetOptions`-equivalent options via a small adapter)
      - `_runSchemaPostRender` begins with `await Promise.resolve()` so synchronous `setFormData` / `initAll` finish, then runs an early `setupShowWhen(formEl)` before awaiting `loadOptions` (avoids flash of initially hidden fields); after the `loadOptions` / `onInit` / widget-init sweep completes, `setupShowWhen` runs again to pick up widget-driven value changes — the delegated pass collects `[data-jp-show-when]` wrappers, evaluates each, toggles `.jp-schema-field-hidden`, and attaches a single `change` + `input` listener at `formEl` (idempotent re-call refreshes wiring)
      - return value: existing tabs instance with an extra `ready: Promise<void>` property
    - internal helpers added: `_applyLoadedOptions(fieldEl, fieldDef, options, currentValue)`, `_resolveSchemaHandler(refOrName)`, `_setFieldLoading(wrapEl, on)`, `_setFieldError(wrapEl, message)`, `_buildSelectOptionsHtml(optionsArr, currentValue)`, `_widgetOptionsFromDataAttrs(selectEl)` — reads `data-jp-*` attributes into a plain options object
    - `showWhen` helpers: `_evalShowWhen(condition, formEl, currentBlockKey)` — returns boolean; recursive for `all` / `any`; resolves bare field names against `currentBlockKey`, dotted paths against `schema.data`; `_collectShowWhenDeps(condition, currentBlockKey)` — returns flat array of fully-qualified `data-path` strings referenced; `_setupShowWhen(formEl)` / public `jPulse.schemaForm.setupShowWhen` — installs the delegated listener and runs the initial visibility pass; invoked from `_runSchemaPostRender` (early + after deferred pipeline)
    - `getFormData` / `setFormData` (in `jPulse.UI.input`): skip validation logic for fields whose closest `.jp-schema-field` wrapper has `.jp-schema-field-hidden`; skip display-only schema rows (`inputType` `help`, `separator`, `button`) in the data walk so they do not appear as `undefined` keys; hidden fields' values are still returned when present
    - `jPulse.UI.input.initAll`: existing `select[data-jpselect]` / `select[data-jpcombo]` discovery selectors extended with `:not([data-jp-defer-init])` so schema-form fields owning their own init are not double-inited; `initAll` also reads any `data-jp-*` widget tuning attributes and forwards them as the init options (so non-deferred schema-form fields and ad-hoc widget HTML get the same flat-key behavior)
  - `webapp/view/jpulse-common.css`:
    - `.jp-form-input-loading` — disabled-look + spinner overlay on the field wrapper; reuses existing `.jp-spinner` if available, else inline keyframes
    - `.jp-schema-field-error` (new, or extend `.jp-field-error`) — applied to the wrapper to render an inline error message under the field
    - `.jp-schema-field-hidden` (new) — `display: none;` (greppable / themeable; alternative to inline `style.display`)
    - `.jp-schema-help` for `inputType: 'help'` (inline info — not toast `.jp-alert`); `separator` reuses `jp-divider`; radio / checkbox-group reuse plugin-config's existing patterns
  - `webapp/view/admin/plugin-config.shtml`:
    - replace the inline renderer functions with a `_pluginSchemaToBlocks(configSchema)` adapter + `jPulse.UI.tabs.renderTabsAndPanelsFromSchema` call
    - `loadCurrentConfig` → unchanged; `populateForm` becomes `jPulse.UI.input.setFormData(form, currentConfig, schema)`
    - `collectFormValues` → `jPulse.UI.input.getFormData(form, schema).data`
    - Save path: call `form.reportValidity()` before `getFormData` so HTML5 `required` blocks save
    - keep Save / Reset / description card / page header logic
  - `webapp/tests/unit/utils/jpulse-ui-tabs-schema.test.js`:
    - new tests:
      - `inputType: 'jpSelect'` → emits `<select data-jpselect>` with options
      - `inputType: 'jpCombo'` → emits `<select data-jpcombo>` with options and placeholder forwarded
      - `inputType: 'jpSelect'` + `multiple: true` → emits `multiple` attribute
      - `loadOptions` (function) — populates `<option>`s after the promise resolves; `ready` resolves
      - `loadOptions` (string) — registry path: `jPulse.schemaForm.register('foo.bar', fn)` then schema with `loadOptions: 'foo.bar'` resolves through registry
      - `loadOptions` (string) — fallback path: only `window.fooBar` defined; resolves through `window[name]`
      - `loadOptions` (string) — missing handler: warns to console, field falls back to static options
      - `loadOptions` rejection — wrapper gets `.jp-schema-field-error`, `<select>` stays in fallback state; sibling field with successful `loadOptions` is unaffected (Promise.allSettled isolation)
      - `loadOptions` for `jpCombo` with current value not in resolved list — `[data-jpcombo-extra]` option present, value preserved
      - `onInit` runs after `loadOptions` and before widget init; receives correct `ctx` (field, value, path, blockKey, formEl, schema, fieldDef, widgetOptions); mutating `ctx.widgetOptions.search = true` causes the subsequent `jpSelect.init` / `jpCombo.init` call to receive `{search: true}`
      - `onInit` rejection — caught and warned, does not block other fields
      - flat widget keys forwarded: `search: true` on a `jpSelect` field → dropdown with search input; `allowCustom: false` on a `jpCombo` field → free-entry blocked, reverts to last list value on blur; `selectAll: true` on multi `jpSelect` → "Select all" / "Clear all" rendered
      - escape hatch: `onInit` mutating `ctx.widgetOptions.onCustomValue = (v) => v.trim().toLowerCase()` on a `jpCombo` field causes the normalizer to fire on commit
      - `inputType: 'radio'`, `'checkboxGroup'`, `'help'`, `'separator'` — DOM-shape assertions
      - `inputType: 'multiselect'` (back-compat alias) — rewritten to `jpSelect` + `multiple: true`; emits `<select data-jpselect multiple>` and renders identically to the canonical form
      - `enum` alias: schema with `enum: ['a', 'b']` and no `options` renders the same `<option>`s as the canonical `options: [{value:'a',label:'a'}, ...]`
      - `inputType: 'email' / 'url' / 'tel'` — `<input type=...>` emitted
      - `showWhen` simple: field with `showWhen: { field: 'fit', equals: 'scale-fit' }` is hidden when `fit` is `cover`, visible when `fit` is `scale-fit`; toggling `fit` via `change` event toggles visibility
      - `showWhen` array equals: `equals: ['scale-fit', 'scale-fill']` matches both values
      - `showWhen` notEquals: hides when matching, shows when not matching
      - `showWhen` compound `all`: both conditions must be true to show
      - `showWhen` compound `any`: any condition true shows
      - `showWhen` cross-block: `field: 'general.mode'` resolves correctly when watched field is in a different tab / block
      - `showWhen` missing field: warns once, treats condition as false (hidden)
      - `showWhen` validation skip: hidden field with `required: true` does not block save; hidden field's value still appears in `getFormData` output
      - `showWhen` listener efficiency: only one delegated `change` + `input` listener attached at `formEl` regardless of number of `showWhen` fields
      - `renderTabsAndPanelsFromSchema(...)` returns object with `ready` Promise; awaiting `ready` resolves after all `loadOptions` settle
  - `webapp/tests/unit/utils/jpulse-schema-form-pipeline.test.js` (new):
    - JSDOM integration tests for `_runSchemaPostRender`: `loadOptions` function + string/registry forms, rejection isolation, `onInit` order and `widgetOptions`, `ready` Promise, `showWhen` after pipeline, tab-root post-render after panel move (regression), display-only fields excluded from `getFormData`, `enum` / `options` object-item parity
  - `webapp/tests/unit/utils/plugin-config-renderer.test.js` (new):
    - `_pluginSchemaToBlocks` converts flat `[{id, type, tab, ...}]` array → `{ data: { [tabKey]: { _meta: {tabLabel, order}, [fieldId]: {...} } } }`
    - untabbed fields go to `general` block with `_meta.tabLabel: 'General'`
    - field order preserved within each tab (via `_meta.order`)
    - `type` / `inputType` normalization table: each row of the legacy → unified mapping is exercised — e.g. `{type: 'select'}` → `{type: 'string', inputType: 'select'}`; `{type: 'number'}` → `{type: 'number'}` (no inputType added; renderer infers); `{type: 'tagInput'}` → `{type: 'array', inputType: 'tagInput'}`; `{type: 'help'}` → `{inputType: 'help'}` (no data type)
    - explicit `inputType` form passes through unchanged: `{type: 'string', inputType: 'jpCombo'}` stays as-is
    - end-to-end: render→setFormData→getFormData→flatten round-trip smoke
  - `webapp/tests/unit/view/plugin-config-view.test.js` (new):
    - `saveConfiguration` calls `form.reportValidity()` before `getFormData`; early return when validation fails
  - `webapp/tests/unit/controller/jpcombo.test.js`, `webapp/tests/unit/utils/jpulse-ui-input-jpselect.test.js`:
    - `jpcombo.test.js`: defer-init filter, `mousedown`-based option commit, `focusout` `relatedTarget === null` guard, structural assertions for dialog-related behavior as applicable
    - if any test relies on schema-form rendering producing a plain `<select>` (no data-jpselect / data-jpcombo), update for the new `inputType` mapping; otherwise no changes
  - `webapp/view/jpulse-examples/ui-widgets.shtml`:
    - custom dialog example rewritten as schema-driven W-189 demo (`loadOptions`, `showWhen`, `help`, multi `jpSelect`, `reportValidity`, `flattenBlockValues`)
  - `docs/jpulse-ui-reference.md`:
    - new `### Schema-form: async option loading` section under the existing schema-form area, covering: `loadOptions`, `onInit`, the flat widget tuning keys (`search`, `selectAll`, `allowCustom`, `searchPlaceholder`, `multiple`), the `ctx` shape (including the mutable `ctx.widgetOptions` escape hatch for advanced widget callbacks), function vs string form, the `jPulse.schemaForm.register` registry, lifecycle order, loading-state contract, failure-mode contract, cache note
    - new `### Schema-form: conditional visibility (showWhen)` section under the schema-form area, covering: simple `{field, equals|notEquals}` shape, `all` / `any` compound, same-block-relative vs fully-qualified field paths, hidden-field behavior (value preserved, validation skipped), JSON-form note, deferred operators (`truthy` / `contains` / function-form) with `onInit` as escape hatch
    - update `### jpSelect widget` and `### jpCombo widget` sections: short note that schema-form exposes them via `inputType: 'jpSelect'` / `'jpCombo'` with flat top-level keys for common tuning (`search`, `selectAll`, `allowCustom`, `searchPlaceholder`); advanced callbacks via `onInit(ctx)` mutating `ctx.widgetOptions`
    - update the `inputType` values list in the field-types reference (if present): add `jpSelect`, `jpCombo`, `radio`, `checkboxGroup`, `help`, `separator`, `email`, `url`, `tel` (canonical); document `multiselect` only as a back-compat alias for `jpSelect` + `multiple: true`; document `options` as canonical, `enum` as back-compat shorthand
    - new short subsection or callout: `type` vs `inputType` — `type` is the data type (`'string'` / `'number'` / `'boolean'` / `'array'`) consumed by `getFormData` for value coercion; `inputType` is the widget choice consumed by the renderer; they're orthogonal (HTML5-style); set `inputType` only when you want a non-default widget (the framework infers a default `inputType` from `type` and from `options`/`enum` presence); legacy plugin.json `type: 'select'`-style schemas are normalized by the `_pluginSchemaToBlocks` adapter
    - new `### jPulse.schemaForm` short reference (one paragraph + register / resolve example)
  - `docs/front-end-development.md`:
    - update *Schema-driven config forms* section: new subsection on async option loading; example showing region-loading from API (1) for a `plugin.json` schema (string-name form, registry registration in plugin's `site/webapp/view/<plugin>/<plugin>.js`), and (2) for a site `.js` schema (function form, inline)
    - new subsection on conditional visibility (`showWhen`): simple example (`viewportWidth` shown when `fit` is `scale-fit` or `scale-fill`); compound example with `all`; cross-block example with dotted path; brief note that hidden fields keep their value but skip validation
  - `docs/genai-instructions.md` (and mirrored `webapp/static/assets/jpulse-docs/genai-instructions.md` when synced):
    - add the new `inputType` values and the `loadOptions` / `onInit` / `showWhen` keys plus the flat widget tuning keys (`search`, `selectAll`, `allowCustom`, `searchPlaceholder`, `multiple`) to the schema-form patterns reference; one-paragraph "when to pick which select widget" guidance; one-paragraph `showWhen` example showing declarative conditional visibility (the canonical pattern; `onInit` for cases beyond `equals` / `notEquals`); note that advanced widget callbacks live behind `onInit(ctx)` mutating `ctx.widgetOptions`; note `options` (canonical) vs `enum` (back-compat alias)
  - `docs/api-reference.md` — if present and documents `jPulse.UI.input` / `jPulse.UI.tabs`, add `jPulse.schemaForm` namespace
  - `README.md`, `docs/README.md` — Latest Release Highlights — v1.6.46 / W-189 bullet (schema-form async `loadOptions` + declarative `showWhen` conditional visibility + `onInit` lifecycle hook + `jpSelect` / `jpCombo` input types + plugin-config consolidation)
  - `docs/CHANGELOG.md` — v1.6.46 / W-189 section
- test / verify (manual):
  - `admin/config.shtml` still loads, save / cancel / dirty-tracking unchanged (regression check on the unified renderer)
  - `admin/plugin-config.shtml` renders an existing plugin's config visually identical to before the consolidation; save / reset still work; tab navigation still works
  - a plugin schema with `loadOptions` (string ref) shows the loading state, populates options after resolve, preserves a previously-saved free-text value in `jpCombo` (extra-option survives)
  - a plugin schema with `loadOptions` rejection shows `.jp-schema-field-error` and falls back to static options gracefully; sibling fields unaffected
  - `onInit` is observed (e.g. via console log) to fire after `loadOptions` and before widget init; mutating `ctx.widgetOptions` in `onInit` is reflected in the resulting jpSelect / jpCombo widget; throwing inside `onInit` does not break the form
  - registry: `jPulse.schemaForm.register('foo', fn)` → schema with `loadOptions: 'foo'` resolves; `unregister('foo')` → falls back to `window.foo` if defined, else warns
  - flat widget keys: `search: true` on a `jpSelect` schema field renders the search input in the dropdown; `allowCustom: false` on a `jpCombo` field blocks free-entry; `multiple: true` on `jpSelect` renders multi-select with caption
  - escape hatch: `onInit(ctx)` mutating `ctx.widgetOptions.onCustomValue = (v) => v.trim()` on a `jpCombo` field causes the normalizer to apply on commit (verify by typing a value with leading / trailing spaces and observing trim on `getFormData`)
  - `enum` alias: a schema field using `enum: ['a','b']` instead of `options` renders identically
  - `showWhen` simple: a numeric field with `showWhen: { field: 'fit', equals: ['scale-fit', 'scale-fill'] }` is hidden when `fit` is set to `cover` and visible when set to `scale-fit`; toggling `fit` immediately shows / hides the field
  - `showWhen` compound: a field with `showWhen: { all: [{field: 'mode', equals: 'advanced'}, {field: 'enabled', equals: true}] }` only appears when both conditions hold
  - `showWhen` cross-block: a field with `showWhen: { field: 'general.mode', equals: 'expert' }` watches a field in a different tab (verify by switching tabs after toggling)
  - `showWhen` save behavior: a hidden field with `required: true` does NOT block save; the hidden field's value is still serialized in `getFormData` output (matches HTML form convention; site code may ignore stale values)

### W-190, v1.6.47, 2026-05-06: deployment: nginx sample — dedicated /assets/ rate-limit zone & docs (avoid 429 / MIME pitfalls)
- status: ✅ DONE
- type: Deployment
- objectives:
  - stop legitimate bursty parallel `GET /assets/...` (e.g. many SVG icons) from tripping the same nginx limit as `location /` (`general` was 30 r/s), which surfaces as HTTP 429 and broken loads (“script MIME type text/html” when HTML error pages replace asset responses)
  - document nginx pitfalls for this prefix: `proxy_pass` must not use a trailing URI on the upstream side for `/assets/`, or the `/assets/` prefix is stripped and the app sees wrong paths (404 + MIME confusion)
  - document split / multi-vhost setups: `limit_req_zone` must be defined once (e.g. shared `http`-level include); site snippets only reference zones via `limit_req` in `location` blocks — no duplicate zone definitions
- features:
  - new `limit_req_zone ... zone=assets:10m rate=150r/s` (materially higher than `general` 30 r/s)
  - new `location ^~ /assets/` before `location /`, with `limit_req zone=assets burst=200 nodelay`, `limit_req_status 429`, and `proxy_pass http://%UPSTREAM_NAME%;` (no path after upstream name — preserves full `/assets/...` URI), matching proxy headers and timeouts used by `location /` (Upgrade, Connection, Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto, cache bypass; connect 30s, send/read 60s)
  - comments in the template for shared-include / duplicate-zone guidance and for the trailing-slash `proxy_pass` mistake
  - security / deployment docs cross-links: rate-limit snippet extended with `assets` zone + location; pointer that canonical numbers live in `templates/deploy/nginx.prod.conf`; production checklist notes `/assets/` may need a separate limit class; deployment troubleshooting adds 429-on-`/assets/` hint
- deliverables:
  - `templates/deploy/nginx.prod.conf`:
    - `limit_req_zone` for `assets`; multi-vhost comment above zone definitions
    - `location ^~ /assets/` block as above (including trailing-slash warning comment)
  - `docs/security-and-auth.md`:
    - Rate Limiting example: `assets` zone, abbreviated `location ^~ /assets/` snippet, sentence pointing to canonical `templates/deploy/nginx.prod.conf`
    - Production best practices: `/assets/` proxied to Node may need higher limit than general traffic
  - `docs/deployment.md`:
    - Static File Issues troubleshooting: bullet on 429 + configuring assets rate limit zone

### W-191, v1.6.48, 2026-05-23: schema form: `fieldGrid` input type — dynamic typed-column grid
- status: ✅ DONE
- type: Feature
- objectives:
  - allow schema authors to define a structured grid of typed input columns (text, number, select, checkbox) as a single schema field, stored as a JSON array of row objects
  - the grid grows and shrinks organically as the admin types — no add/delete buttons needed; trailing empty rows are maintained automatically (good DX: "don't make me think")
  - empty/ghost rows are never persisted; only rows with at least one non-empty text/number cell are serialized into the saved config
  - the hidden proxy-input pattern keeps the grid compatible with all existing schema-form machinery (`setFormData`, `getFormData`, `getAllValues`, `initAll`) with zero changes to those internals (except Changes 3 and 4 below)
- features:
  - new `inputType: 'fieldGrid'` schema field type rendered by `_renderSchemaBlockFields`
  - schema field contract:
    - `columns[]` — array of column defs: `{ id, label, inputType ('text'|'number'|'select'|'checkbox'), width (default 'auto'), placeholder, options[], default }`
    - `emptyRows` — number of empty trailing rows to maintain (default 2)
    - `maxRows` — maximum total rows allowed (default 16); growth stops when reached
    - `help` — optional help text, same as other field types
  - HTML output: full-width block with a `<table class="jp-field-grid">` inside `.jp-field-grid-wrap`; one `<input type="hidden" class="jp-edit-field">` proxy per field (no other `jp-edit-field` in table cells)
  - column definitions stored as `data-columns` JSON on the `<table>` so `initAll` can create new rows in JS without access to the original schema object
  - `emptyRows` stored as `data-empty-rows` on `.jp-field-grid-wrap`; `maxRows` stored as `data-max-rows`
  - `initAll` handler (`input[data-field-grid]:not([data-field-grid-inited])`):
    - init phase: parse hidden-field JSON → grow tbody to `data.length + emptyRows` (capped at `maxRows`) → populate cell inputs from data
    - ongoing phase: after any `input`/`change` in the wrapper, call `adjustRows()` then `serializeRows()`
    - `adjustRows()`: counts trailing empty rows; adds or removes rows from the bottom to maintain exactly `emptyRows` empty trailing rows, never exceeding `maxRows` total
    - `serializeRows()`: collects non-empty rows (skips rows where all text/number cells are `''`), JSON.stringifies, writes to hidden field, dispatches bubbling `change` event
    - "empty row" definition: all `input[type=text]` and `input[type=number]` cells in the row have `value === ''` (select and checkbox columns are excluded from this check — they always carry a value)
    - re-entry guard: `change` listener skips if `e.target === hiddenEl`
  - `setFormData`: pre-converts array value to JSON string for `fieldGrid` fields before `setAllValues` runs (prevents `[object Object]` stringification)
  - `getFormData`: JSON-parses the hidden field's string value back to an array for `fieldGrid` fields; falls back to `[]` on parse
- deliverables:
  - `webapp/view/jpulse-common.css`:
    - new `.jp-field-grid-wrap`, `.jp-field-grid`, `.jp-field-grid th`, `.jp-field-grid td`, `.jp-field-grid td input[type="text"]`, `.jp-field-grid td input[type="number"]`, `.jp-field-grid td select`, `.jp-field-grid td input[type="checkbox"]` rules for layout and sizing
  - `webapp/view/jpulse-common.js`:
    - `_renderSchemaBlockFields`: `fieldGrid` case inserted after `separator` block; generates `.jp-field-grid-wrap` with `data-empty-rows` / `data-max-rows`; `<table class="jp-field-grid">` with `data-columns` (JSON, `"` escaped as `&quot;` to keep HTML attribute valid); `<thead>` from `columns[].label` + `columns[].width` (default `'auto'`); `<tbody>` with `emptyRows` initial empty `<tr data-row-idx>` rows; per-column `<td>` with native `<input type="text|number|checkbox">` or `<select>` (with `col.default` pre-selected); one hidden `<input class="jp-edit-field" data-field-grid>` proxy; always adds `jp-schema-field-new-row` and `jp-schema-field-full` to wrapper class
    - `initAll`: `input[data-field-grid]:not([data-field-grid-inited])` handler added after `input[data-slider]` block; inner helpers `isRowEmpty` (text/number only), `buildRow` (DOM-based, uses `data-columns`), `reindexRows`, `adjustRows` (trims/grows trailing empty rows to `emptyRows`, capped at `maxRows`), `serializeRows` (filters empty rows, JSON-stringifies, dispatches bubbling `change`); init phase populates cells from hidden-field JSON; ongoing phase wires `input`+`change` on wrapper with `e.target === hiddenEl` re-entry guard
    - `setFormData`: `fieldGrid` array→JSON-string pre-conversion (with `maxRows` slice) before `setAllValues`
    - `getFormData`: `fieldGrid` JSON-string→array post-conversion (with `[]` fallback) before `setByPath`
  - `webapp/tests/unit/utils/jpulse-ui-input-fieldgrid.test.js` (new):
    - 41 tests across 5 groups: `_renderSchemaBlockFields HTML` (15 tests — table structure, column types, defaults, proxy input, wrapper classes, help text); `initAll init phase` (7 tests — cell population from JSON, row growth, maxRows cap, checkbox, invalid JSON, idempotent re-init); `initAll adjustRows` (5 tests — trailing row added when first row filled, trimmed when cleared, maxRows prevents growth, contiguous indices, select-only change leaves count stable); `initAll serializeRows` (6 tests — empty rows excluded, all column types serialized, checkbox as boolean, valid JSON, no re-entry loop, multi-row ordering); `setFormData / getFormData` (8 tests — array→JSON-string, no object-stringification, empty array, maxRows slice, JSON-string→array, malformed-JSON fallback, non-array fallback, full round-trip)
  - `docs/jpulse-ui-reference.md`:
    - new `### fieldGrid — structured typed-column grid (v1.6.48+)` section under Schema-Driven Form Generator (schema example, field keys, column inputTypes, behavior); `fieldGrid` row in Supported `inputType` values table; updated Schema inputTypes lists and setFormData/getFormData notes
  - `docs/front-end-development.md`:
    - `fieldGrid` added to schema field list in "Build tabs and panels from schema"; new `### fieldGrid — structured column grid` subsection with example and cross-link
  - `docs/genai-instructions.md`:
    - `fieldGrid` added to schema-form `inputType` list; one-line usage note for `columns[]`, `emptyRows`, `maxRows`
  - `README.md`, `docs/README.md`:
    - Latest Release Highlights — v1.6.48 / W-191
  - `docs/CHANGELOG.md`:
    - v1.6.48 / W-191 section
- test / verify (manual):
  - schema with `inputType: 'fieldGrid'` renders a full-width table with column headers and `emptyRows` trailing blank rows
  - typing in a row adds another empty row at the bottom; clearing all text/number cells in a row removes excess trailing rows
  - `maxRows` prevents adding rows beyond the cap
  - save/load round-trip: `setFormData` → edit → `getFormData` returns array of row objects (not a JSON string)
  - empty rows are not present in saved config JSON
  - `npm test` — `jpulse-ui-input-fieldgrid.test.js` (41 tests) and full suite pass

### W-192, v1.6.49, 2026-06-28: fieldGrid: auto-appended rows show column default in select cells instead of blank
- status: ✅ DONE
- type: Bugfix
- objectives:
  - make auto-appended `fieldGrid` rows visually consistent with the server-rendered empty rows: an otherwise-empty trailing row's `select` cell must start blank, not pre-filled with the column `default`
  - prevent a column `default` from leaking into the grid as apparent data on rows the user never touched
- root cause:
  - empty `fieldGrid` rows are created by two code paths that disagreed on how `select` cells start out:
    - initial / server-rendered empty rows are blanked by the `initAll` init pass (`cell.value = ''` per empty cell), which forces a `<select>` to `selectedIndex = -1` (blank) — the intended behavior
    - auto-appended rows (created when the user types and the grid grows by `emptyRows`) are built by the client-side `buildRow()` helper, which pre-selected the column's `default` option and was never run through that blanking pass
  - visible symptom: in a `fieldGrid` with `emptyRows: 2`, after entering data in the first row, the first trailing empty row (server-rendered) showed a blank dropdown while the second trailing empty row (auto-appended) showed the column default (e.g. "Point to point", "BSMA", "replace") — inconsistent
- features:
  - `buildRow()`'s `select` branch now starts blank, matching the init/server-rendered empty rows: dropped the per-option `default` `selected` flag and explicitly blank the control (`cell.value = ''`) after appending options
  - single change covering all `fieldGrid` consumers (gridPivot, gridSmooth, gridModify, gridToTable, etc.)
  - low-risk: empty rows are skipped by `serializeRows()`, so a blank trailing `select` is never serialized into the data — identical to how the initial empty rows already behave; columns whose options include a `{ value: '' }` entry are unaffected (they already resolve to that blank option)
  - server-rendered HTML output is unchanged — `_renderSchemaBlockFields` still pre-selects `col.default` on the initial rows; only client-side auto-appended rows now start blank
- deliverables:
  - `webapp/view/jpulse-common.js`:
    - `initAll` → `buildRow()` `select` branch: removed `if (col.default !== undefined && String(ov) === String(col.default)) o.selected = true;` from the options loop; added `cell.value = '';` after the loop with an explanatory comment
  - `webapp/tests/unit/utils/jpulse-ui-input-fieldgrid.test.js`:
    - new test in the `initAll — adjustRows` group: "auto-appended row select starts blank (no column default leaks in)" — types into row 0 of an `emptyRows: 2` grid (grows to 3 rows) and asserts the appended row's `select` has `selectedIndex === -1` and `value === ''`
- test / verify:
  - `npm test` — `jpulse-ui-input-fieldgrid.test.js` (42 tests: 41 existing + 1 new) and full suite pass; no linter errors
  - browser-verified via a standalone harness loading the real `jpulse-common.js`: both server-rendered empty rows and the auto-appended row show blank `select` cells (`selectedIndex === -1`) after typing into the first row

### W-193, v1.6.50, 2026-07-07: deployment: pm2 reload unnecessarily slow due to missing process.send('ready')
- status: ✅ DONE
- type: Bugfix
- objectives:
  - make `pm2 reload` cut over to a new cluster worker within milliseconds of it actually being ready, instead of stalling for the full `listen_timeout` fallback
  - make the generated `ecosystem.prod.config.cjs`'s `wait_ready: true` setting behave as documented
- root cause:
  - the generated production PM2 config (`templates/deploy/ecosystem.prod.config.cjs`) sets `wait_ready: true`, which tells PM2 to disable its automatic "port is listening" readiness detection (available in `cluster` exec mode) and instead wait for the app to explicitly call `process.send('ready')` over the PM2 IPC channel
  - `webapp/app.js` never sent that signal — it only called `app.listen()` and initialized the WebSocket server
  - with no `ready` message ever arriving, PM2 had no way to know a worker was actually ready, so it fell back to a blind wait bounded by `listen_timeout` before killing the old worker during a rolling reload
  - observed impact (production access.log, bubblemap.net, 2026-07-07): each replaced instance was demonstrably ready (HTTP server bound, `🎉 App initialization complete!` logged) in about 1 second, but PM2 didn't kill the corresponding old worker until roughly 58 seconds later — the same gap repeated once per cluster instance, so a 3-instance `pm2 reload` wasted well over a minute of pure, avoidable waiting (and the stall compounds if a second `reload` is issued before the first finishes)
- features:
  - `webapp/app.js` now sends `process.send('ready')` once startup is fully complete (HTTP server bound *and* WebSocket server initialized), guarded with `typeof process.send === 'function'` so it's a no-op when not running under PM2 / no IPC channel is present (local `npm start`, `npm run dev`, tests)
  - this makes `wait_ready: true` in `templates/deploy/ecosystem.prod.config.cjs` work as intended: PM2 cuts over to the new worker almost immediately instead of waiting out `listen_timeout`
  - no template change needed — `wait_ready: true` is kept since the framework now actually sends the signal it depends on
- deliverables:
  - `webapp/app.js`:
    - after `await WebSocketController.initialize(server, sessionMiddleware);` in `startApp()`, added a guarded `process.send('ready')` call
  - `docs/deployment.md`:
    - Process Management: note on fast rolling-reload cutover via `process.send('ready')`
  - `README.md`, `docs/README.md`:
    - Latest Release Highlights — v1.6.50 / W-193
  - `docs/CHANGELOG.md`:
    - v1.6.50 / W-193 section
- test / verify (manual):
  - `npm start` / `npm run dev` locally: app boots normally, no error from the guarded `process.send` check (no IPC channel present outside PM2)
  - `pm2 start deploy/ecosystem.prod.config.cjs` then `pm2 reload <name>` on a multi-instance cluster: old workers are killed within a second or two of the new workers logging readiness, instead of after the ~58s `listen_timeout`-bounded stall

### W-194, v1.7.0, 2026-07-08: plugins: add custom renderer field type in plugin.json config schema
- status: ✅ DONE
- type: Feature
- objective: universal escape hatch for plugins whose config doesn't fit the flat schema (lists, nested objects, custom widgets)
- rationale: multiple future plugins hit the same wall (auth-oauth provider list, auth-ldap attribute mappings, theme color pickers, notification recipient rules); solve it once at the framework level rather than each plugin building its own admin page
- depends on: — (self-contained)
- features:
  - new field type `type: "custom"` in plugin config schema
  - plugin declares `renderer: "namespace.functionName"` pointing to a function in `window.jPulse.plugins.*`
  - schema-driven config form resolves and invokes renderer with `{ container, value, onChange, schema, config, disabled }` context
  - renderer owns validation and UI; framework treats value as opaque JSON
  - values persist through the standard `PUT /api/1/plugin/:name/config` endpoint, stored in `pluginConfigs.config.{fieldId}` — no per-plugin schema, no separate collection
  - hello-world plugin gets a small demo custom renderer (mini list editor of label/URL pairs) as reference implementation
- bug fixes found during manual testing:
  - renderer resolution: the custom-field renderer resolution path (`_resolveHandler`, shared with `onInit`/`loadOptions`) only resolved dotted `renderer` names against bare `window.*`, but the documented contract (and the hello-world demo's `renderer: "helloWorld.renderLinkList"`) requires resolution against `window.jPulse.plugins.*`. Field label/container/help text still rendered in this state, but the widget itself stayed empty with a console warning. Fixed by adding a dedicated `jPulse.schemaForm._resolveCustomRenderer()` that tries `jPulse.plugins.<name>` first, then falls back to the existing registry/bare-window `resolve()`.
  - dropped help/separator fields (pre-existing, unrelated to W-194 but found while testing it): `jPulse.schemaForm.pluginSchemaToBlocks()` skipped any field with no `id` (`return` before adding it to the block), so every `type: "help"`/`type: "separator"` field declared in a multi-tab plugin.json — including both of hello-world's — was silently dropped and never rendered, even though the schema API correctly returned them. Fixed by assigning a synthetic key (`__field<N>`) to id-less fields so they still reach the block; `_walkSchemaFields` already excludes `help`/`separator`/`button` inputTypes from its `'data'`-context walk, so this only affects rendering, never `getFormData`/`setFormData`/save.
- deliverables:
  - webapp/view/jpulse-common.js:
    - `jPulse.schemaForm._normalizePluginFieldDef`: normalize `type: "custom"` → `{ type: 'custom', inputType: 'custom' }`
    - `jPulse.UI.tabs._renderSchemaBlockFields`: render a mount-point container + hidden JSON proxy input for `inputType === 'custom'`
    - `jPulse.UI.input.setFormData` / `getFormData`: JSON stringify/parse the opaque value through the hidden proxy field
    - `jPulse.UI.tabs._runSchemaPostRender`: resolve and invoke the renderer with `{ container, value, onChange, schema, config, disabled }`, once the field's container exists in the DOM
    - `jPulse.schemaForm._resolveCustomRenderer`: resolve `renderer` strings against `jPulse.plugins.*` first, falling back to the registry/bare-window `resolve()`
    - `jPulse.schemaForm.pluginSchemaToBlocks`: assign synthetic keys to id-less (help/separator) fields so they aren't dropped
  - webapp/utils/plugin-manager.js:
    - `validatePluginJson`: require a `renderer` string for `type: "custom"` fields
  - webapp/model/plugin.js:
    - `validateConfig`: skip type/pattern validation for `type: "custom"` fields (framework treats value as opaque JSON)
  - plugins/hello-world/plugin.json:
    - `quickLinks` demo field (`type: "custom"`, `renderer: "helloWorld.renderLinkList"`)
  - plugins/hello-world/webapp/view/jpulse-common.js:
    - `helloWorld.renderLinkList` demo renderer: mini list editor (label + URL pairs, add/remove)
  - plugins/hello-world/webapp/view/jpulse-common.css:
    - styles for the demo list editor (`.plg-link-*`)
  - docs/plugins/creating-plugins.md:
    - new "Custom Field Renderers" section documenting the `renderer` contract and context object
  - docs/plugins/plugin-api-reference.md:
    - document `type: "custom"` and the renderer context contract
  - webapp/tests/unit/utils/plugin-config-renderer.test.js, webapp/tests/unit/utils/jpulse-schema-form-pipeline.test.js, webapp/tests/unit/model/plugin.test.js:
    - normalization, render/save round-trip, post-render renderer invocation (context contract, registry + `jPulse.plugins.*` resolution, missing/throwing renderer isolation), help/separator field survival in multi-tab blocks, backend validation coverage
- test / verify (manual):
  - `npm start`; Admin → Plugins → hello-world → Configure → Advanced tab: "Quick Links" list editor renders with demo entries (TWiki, jPulse.net), add/remove works, changes persist through "Save Changes" and survive a full page reload; both `help` blocks (Advanced Settings intro, Custom Field Renderer intro) render in place
  - `GET /api/1/plugin/hello-world/config`: `schema` includes both `help` entries and the `quickLinks` custom field exactly as declared in `plugin.json`; `values.quickLinks` reflects the saved TWiki/jPulse.net entries
  - full unit suite: 87 suites / 2414 tests pass

### W-195, v1.7.1, 2026-07-26: auth: jPulse enhancements for external auth plugins (OAuth, LDAP, SAML)
- status: ✅ DONE
- type: Feature
- objective: provide the framework-level hooks and helpers external auth plugins need — browser-redirect login completion, login page button injection, local-auth policy, and a break-glass path for SSO outages
- rationale: OAuth/LDAP/SAML plugins all need the same three things (finish login after browser redirect, inject provider buttons onto the login page, honor a site-wide local-auth restriction); solving these once in the framework keeps each auth plugin small and prevents divergence
- depends on: W-105 (plugin hooks), W-109 (multi-step auth)
- features:
  - `AuthController.completeExternalAuth(req, res, user, authMethod, redirectUrl)` helper: browser-redirect-friendly login completion; sets `pendingAuth`, runs `_getRequiredSteps`, either 302s to the next-step page (e.g., MFA verify) or completes the session and 302s to `redirectUrl`
    - implementation note (found during readiness review): current `_completeLogin(req, res, user, authMethod, startTime)` ends with `res.json(...)`, built for the AJAX `POST /api/1/auth/login` flow — cannot be called as-is before a 302. Refactor: extract `_completeLoginSession(req, user, authMethod, startTime)` (session creation + hooks, returns `{ warnings, elapsed }`, no `res` calls); `login()` keeps sending JSON from it, `completeExternalAuth()` sends a 302 from it. No behavior change for the existing multi-step JSON flow.
  - `onAuthGetLoginProviders` hook: plugins return `[{ id, label, icon, buttonColor, initUrl, order }]`; framework login page renders configured buttons
  - `controller.auth.localAuthRestriction` config: `'none' | 'admins-only' | 'disabled'`
    - `'none'` (default): username/password works for everyone (current behavior)
    - `'admins-only'`: username/password only works for users with admin role; regular users must use an external provider
    - `'disabled'`: no local auth at all
    - enforced in `AuthController.login()` credentials step, after `UserModel.authenticate()`, before pending init
  - bootstrap safety check in `webapp/utils/bootstrap.js` (found during implementation: this is where the actual bootstrap sequencing lives, not `webapp/app.js`): if `localAuthRestriction === 'disabled'` AND no external auth plugin is enabled, forcibly downgrade to `'admins-only'` and log a warning (prevents self-lockout); extracted as a standalone exported `checkLocalAuthRestrictionSafety()` function so it's unit-testable without running the full bootstrap sequence
  - `?localFallback=1` URL param on `/auth/login.shtml`: reveals local login form with a "Recovery mode" banner even in restricted modes (server still enforces the role check — this is a UI convenience for ops teams when SSO is broken)
  - new i18n strings for restriction messages and recovery mode banner
  - `hasLocalPassword` user-schema primitive (identified during W-197 design review): `{ type: 'boolean', default: true }` — general marker for "does this user know a real, usable local password", useful to any external-auth plugin (OAuth, LDAP, SAML), not just auth-oauth
    - external-auth plugins set it to `false` when they write a synthetic/unknown `passwordHash` at JIT-creation time
    - `UserController.changePassword()` skips the `currentPassword` check when `hasLocalPassword === false` (impossible to satisfy by construction — the user's session already proves identity); sets it back to `true` on success
    - `webapp/view/user/settings.tmpl` Security panel conditionally hides `currentPassword` and relabels the section "Set Password" vs "Change Password" based on this flag
    - no migration/backfill needed — absent field reads as `true` (default), matching existing local-signup users
  - `CommonUtils.sanitizeHtml()` (server) / `jPulse.string.sanitizeHtml()` (client) bug fixes (found while building the W-197 auth-oauth plugin's provider-icon rendering, but independent of and useful beyond OAuth):
    - server: attribute-extraction regex used `\w+` (no hyphen support), so hyphenated attribute names (`stroke-width`, `fill-rule`, `aria-*`, `data-*`) were mis-parsed and silently dropped even when explicitly allow-listed; fixed to `[\w-]+`
    - client: **security fix** — foreign-namespace elements (SVG, MathML) report `tagName` in authored case, not uppercased like HTML elements; without normalizing case, `<svg><script>...</script></svg>` bypassed the dangerous-tag/strict-allowlist checks entirely; fixed by uppercasing `node.tagName` before comparison in both non-strict and strict code paths
- deliverables:
  - webapp/controller/auth.js:
    - `completeExternalAuth()` static helper for browser-based auth flows
    - `localAuthRestriction` enforcement in `login()` credentials step
    - `_completeLoginSession()` extracted from `_completeLogin()` (session creation + hooks, no `res` calls, shared by both flows)
    - `onAuthGetSteps` step objects gain an optional `page` field, used by `completeExternalAuth()` for the next-step redirect (falls back to `/auth/login.shtml` + warning log if omitted)
  - webapp/utils/bootstrap.js:
    - `checkLocalAuthRestrictionSafety()` (Step 7.5) — bootstrap safety check for `localAuthRestriction: 'disabled'` (see note above; not in `webapp/app.js`)
  - webapp/view/auth/login.shtml:
    - fetch enabled providers via `onAuthGetLoginProviders` (server-side render, `authProviders` context array)
    - hide local form when `localAuthRestriction !== 'none'` unless `?localFallback=1`
    - "Recovery mode" banner in fallback mode; "Restricted" notice when no providers and local form hidden
  - webapp/controller/handlebar.js:
    - `_buildInternalContext()`: collect `authProviders` from `onAuthGetLoginProviders`, guarded by path (`/auth/login.shtml` only) + `HookManager.hasHandlers()` so other sites pay zero cost
  - webapp/utils/hook-manager.js:
    - register `onAuthGetLoginProviders` hook definition
  - webapp/model/user.js:
    - add `hasLocalPassword: { type: 'boolean', default: true }` to `baseSchema`
  - webapp/controller/user.js:
    - `changePassword()`: skip `currentPassword` verification when `hasLocalPassword === false`; set `hasLocalPassword: true` on successful save
  - webapp/view/user/settings.tmpl:
    - conditionally hide `currentPassword` field and relabel "Set Password" vs "Change Password" based on `hasLocalPassword`
  - webapp/app.conf:
    - add `controller.auth.localAuthRestriction: 'none'` (default)
  - webapp/translations/en.conf, webapp/translations/de.conf (found during implementation: not `webapp/i18n/*.js`):
    - new strings: `controller.auth.localAuthRestricted`, `controller.user.password.missingNewPassword`, `view.auth.login.orSignInWithLocal`, `view.auth.login.recoveryModeBanner`, `view.auth.login.restrictedNotice`, `view.user.settings.changePasswordTitle`, `view.user.settings.setPasswordTitle`, `view.user.settings.securityNoteSetPassword`, `view.user.settings.newPasswordFieldsRequired`
  - webapp/tests/unit/controller/auth-controller.test.js, webapp/tests/unit/utils/hook-manager.test.js, webapp/tests/unit/utils/bootstrap.test.js (new), webapp/tests/unit/controller/handlebar-auth-providers.test.js (new), webapp/tests/unit/user/user-change-password.test.js (new), webapp/tests/unit/user/user-has-local-password-schema.test.js (new):
    - unit test coverage for all of the above
  - webapp/utils/common.js:
    - `sanitizeHtml()` attribute-extraction regex now supports hyphenated attribute names (`[\w-]+` instead of `\w+`)
  - webapp/view/jpulse-common.js:
    - `jPulse.string.sanitizeHtml()`: normalize `node.tagName` to uppercase before dangerous-tag/allowlist comparison (security fix for SVG/MathML foreign-namespace elements, e.g. `<svg><script>`)
  - webapp/tests/unit/utils/common-utils-sanitize.test.js, webapp/tests/unit/utils/jpulse-common.test.js:
    - regression tests for both sanitizer fixes (hyphenated attributes; `<script>`/`<iframe>`/`<style>` nested in `<svg>`, non-strict and strict modes, `on*` attributes on SVG elements)
  - docs/plugins/plugin-hooks.md:
    - document `onAuthGetLoginProviders` context/return shape/example, `completeExternalAuth()` usage from a plugin callback, `onAuthGetSteps`'s `page` field, `localAuthRestriction`/`hasLocalPassword`
  - docs/deployment.md:
    - new "Break-Glass Account Runbook" section (scenario, built-in safety net, recovery steps incl. a DB-level password reset recipe, preventive practices incl. MFA-protecting the break-glass account)
  - docs/security-and-auth.md:
    - Login error codes (`LOCAL_AUTH_RESTRICTED`), new "Restricting Local (Username/Password) Login" subsection, `hasLocalPassword` in the User schema example, sanitizer security-fix note, "Planned Features" cross-reference to the now-shipped framework primitives
  - docs/api-reference.md:
    - Login error codes, `completeExternalAuth()` pointer, Change Password `hasLocalPassword` behavior, `hasLocalPassword` in User Schema
  - docs/plugins/creating-plugins.md:
    - Auth hook count/list corrected to include `onAuthGetLoginProviders` (7 → 8)
  - docs/site-administration.md, docs/site-customization.md:
    - `controller.auth.localAuthRestriction` config examples
  - docs/handlebars.md, docs/template-reference.md:
    - `{{authProviders}}` context variable documented
  - docs/genai-instructions.md:
    - Auth controller bullet + Plugin Documentation section reference the new primitives and `plugin-hooks.md`
  - docs/front-end-development.md, docs/plugins/plugin-api-reference.md:
    - `sanitizeHtml()` usage notes call out the SVG/MathML `tagName` security fix
  - docs/dev/requirements.md:
    - "Authentication & Authorization" bullet references the new framework primitives
  - docs/CHANGELOG.md, README.md, docs/README.md: release notes / highlights

### W-196, v1.7.2, 2026-07-27: infrastructure: Node.js 24 upgrade; fix startup secret leakage & Redis session race condition
- status: ✅ DONE
- type: Infrastructure + Bugfix
- objectives:
  - eliminate GitHub Actions' "Node.js 20 is deprecated" warning by moving CI to Node 24
  - upgrade the framework's supported Node.js runtime to v24 (Active LTS), including the Jest 30 upgrade this requires
  - fix bugs discovered while upgrading and reviewing a fresh `npm start` startup log: a CLI docs-copy regression, cleartext secrets in the startup log, and a Redis session-store fallback race condition
- discovered while: GitHub Actions build failure ("Node.js 20 is deprecated ... actions/checkout@v4, actions/setup-node@v4"), followed by a routine post-upgrade `npm start` log review
- features:
  - CI: `.github/workflows/publish.yml` — `actions/checkout@v4→v7`, `actions/setup-node@v4→v7`, build/publish Node version `'18'→'24'` (fixes the GitHub Actions deprecation warning)
  - runtime upgrade: `package.json` `engines.node` `>=16.0.0→>=24.0.0`; `jest`/`babel-jest`/`@jest/globals` `^29.7.0→^30.4.0` (Jest 30 is required — Jest 29's `globalSetup`/`globalTeardown` loader can't handle ESM files under Node 24 with `"type": "module"` in `package.json`); new `.nvmrc` pinned to `24`; Node.js requirement updated to v24+ across `docs/deployment.md`, `docs/installation.md`, `docs/getting-started.md`, `docs/dev/installation.md`, `docs/dev/requirements.md`, `docs/dev/README.md`, `docs/dev/roadmap.md`, `README.md`
  - Jest ESM fix: renamed `webapp/tests/setup/global-setup.js`/`global-teardown.js` to `.mjs` (forces Jest's `requireOrImportModule` to use native `import()` instead of CJS `require()`, fixing `ReferenceError: exports is not defined in ES module scope` under Jest 30 + Node 24)
  - CLI bug fix (found via `npm run test:cli` after the upgrade): `bin/configure.js`/`bin/jpulse-update.js` docs-copy step failed with `ENOENT: no such file or directory, mkdir 'webapp/static/assets/jpulse-docs'` — root cause: `fs.rmSync(dest, { recursive: true, force: true })` stats a symlink's *target* to decide whether to recurse, so a dangling dev-only symlink (`jpulse-docs -> ../../../docs`, whose relative target doesn't resolve once copied into a new site) fails that stat with ENOENT and `force: true` silently treats it as "already gone" without unlinking it, leaving a stale symlink that then blocks the subsequent `mkdirSync`; fixed by detecting symlinks via `fs.lstatSync().isSymbolicLink()` and removing them with `fs.unlinkSync()` (which operates on the link entry itself, regardless of the target)
  - security fix: the startup log printed the fully-resolved `appConfig` in cleartext at INFO level, including `middleware.session.secret`, `redis.single.password`, `redis.cluster.password`, `controller.auth.ldap.bindPass`, and `controller.auth.oauth2.clientSecret`
    - `webapp/utils/common.js`: extended `CommonUtils.sanitizeObject()` with `**.`-prefixed deep-wildcard path support — matches a leaf pattern (`prefix*`, `*suffix`, `*contains*`, or exact) at *any* nesting depth in the object tree, not just a specific path; also added new `*contains*` matching (previously `*x*` patterns silently matched nothing); leaf-matching logic factored into shared `_sanitizeObjectApplyLeafPattern()` / `_sanitizeObjectApplyLeafPatternDeep()` helpers, existing exact-path behavior unchanged (verified: 6/6 pre-existing tests still pass)
    - `webapp/app.js`: redact `appConfig` before logging via a hardcoded `APP_CONFIG_LOG_SECRET_PATTERNS` array (`**.*secret`, `**.*password`, `**.*pass`, `**.*key`, `**.*token`, `**.*credential`) — deliberately suffix-matched (not substring) after live testing showed a `*password*` substring pattern would have false-positively redacted `model.user.passwordPolicy`; suffix matching also leaves `redis.*.keyPrefix` and `controller.auth.oauth2.clientID` correctly visible
  - Redis session-store race condition fix: sessions silently fell back to in-memory storage on every fresh startup even when Redis was fully reachable
    - root cause: `RedisManager._createConnections()` fired `_testConnection()`'s `ping()` (the call that actually sets `isAvailable = true`, needed because `lazyConnect: true` doesn't trigger `connect` events until first use) without awaiting it; `bootstrap.js` immediately called `configureSessionStore()` right after `await RedisManager.initialize(...)` returned, before that ping had resolved, so `getClient('session')` always returned `null` on the very first boot and the store fell back to `MemoryStore`
    - `webapp/utils/redis-manager.js`: `initialize()` and `_createConnections()` made properly `async` and now `await RedisManager._testConnection()` before resolving, so `isAvailable` reflects reality by the time `configureSessionStore()` runs; the singleton guard (`RedisManager.instance = RedisManager`) was moved to before the `await` so it's still set synchronously for any caller that doesn't await `initialize()` (some unit tests call it fire-and-forget)
  - CI fix: the GitHub Actions "Run tests" step failed on a fresh checkout (masked locally by a cached `.jpulse/app.json`) — `webapp/tests/helpers/config-loader.js`'s fallback `appConfig` stub (used whenever `.jpulse/app.json` doesn't exist) had no `controller.auth` section or `contextFilter.alwaysAllow` array, so two W-195 regression tests (`handlebar-auth-providers.test.js`, `login-page-render.test.js`) that read/write `controller.auth.localAuthRestriction` threw `TypeError`s; fixed by adding both to the fallback stub, mirroring `webapp/app.conf`
- deliverables:
  - `.github/workflows/publish.yml`:
    - CI Node 20→24, `actions/checkout`/`actions/setup-node` v4→v7
  - `package.json`, `package-lock.json`, `.nvmrc` (new):
    - `engines.node` →`>=24.0.0`; Jest/babel-jest/@jest/globals →`^30.4.0`; `jest.globalSetup`/`globalTeardown` paths →`.mjs`; `.nvmrc` pinned to `24`
  - `docs/deployment.md`, `docs/installation.md`, `docs/getting-started.md`, `docs/dev/installation.md`, `docs/dev/requirements.md`, `docs/dev/README.md`, `docs/dev/roadmap.md`, `README.md` (Deployment Requirements):
    - Node.js version requirement updated to v24+
  - `webapp/tests/setup/global-setup.mjs`, `webapp/tests/setup/global-teardown.mjs`:
    - renamed from `.js` (content unchanged besides the `@file`/`EOF` comment and internal `TEST_FILE` constant)
  - `bin/configure.js`, `bin/jpulse-update.js`:
    - docs-copy step now detects and `unlinkSync()`s dangling symlinks instead of relying on `fs.rmSync({ force: true })`
  - `webapp/utils/common.js`:
    - `sanitizeObject()` / `_sanitizeObjectApplyPath()`: `**.` deep-wildcard support, new `*contains*` matching, `_sanitizeObjectApplyLeafPattern()` / `_sanitizeObjectApplyLeafPatternDeep()` helpers
  - `webapp/app.js`:
    - redact `appConfig` via `CommonUtils.sanitizeObject()` + `APP_CONFIG_LOG_SECRET_PATTERNS` before the `App configuration:` startup log line
  - `webapp/utils/redis-manager.js`:
    - `initialize()` / `_createConnections()` now `async`, await the connection test before resolving; singleton guard set before the `await`
  - `webapp/tests/helpers/config-loader.js`:
    - fallback `appConfig` stub gains `controller.auth: { localAuthRestriction: 'none' }` and `controller.handlebar.contextFilter.alwaysAllow: [ 'controller.auth.localAuthRestriction' ]`, mirroring `webapp/app.conf`
- test / verify (manual):
  - `npm start`: startup log confirms `middleware.session.secret`, `redis.single.password`, `redis.cluster.password`, `controller.auth.ldap.bindPass`, `controller.auth.oauth2.clientSecret` all show as `********`, while `controller.auth.oauth2.clientID`, `model.user.passwordPolicy`, and all `redis.connections.*.keyPrefix` values remain fully visible; `RedisManager: Initialized ... Available: true` and `Session store: Redis (cluster-ready)` on first boot (previously `Available: false` / `Session store: Memory (fallback mode)`, self-corrected only after session-store selection had already happened)
  - `npm run test:cli` passes after the symlink fix (previously failed with `ENOENT ... mkdir 'webapp/static/assets/jpulse-docs'`)
  - full suite: 105 suites / 2757 unit tests + 11 suites / 108 integration tests pass (2894 total, 0 failures), confirmed both with the dev machine's cached `.jpulse/app.json` and from a genuinely clean checkout (`.jpulse/` removed) matching GitHub Actions' environment — the original release commit only tested the former, which is what let the CI-only fallback-config bug ship

### W-199, v1.7.3, 2026-07-30: infrastructure: fix startup race conditions in .jpulse/*.json caches and Redis connection-availability tracking
- status: ✅ DONE
- type: Bugfix
- objective: eliminate startup race conditions that write/sample shared state on every process boot with no locking or per-connection accuracy, under PM2 cluster mode's N-independent-processes model
- discovered while: post Node.js 24 upgrade (W-196) rollout — `auth-mfa` was found disabled, unexplained, in three separate environments within 24 hours (dev Mac, jpulse.net prod, bubblemap.net prod); a broader audit (grep for `fs.writeFileSync`/`fs.writeFile` across `webapp/`, plus a full re-read of `redis-manager.js`'s connection lifecycle) then found two more related instances in `webapp/app.js` and `webapp/utils/redis-manager.js`
- shared architectural root cause: PM2 `exec_mode: 'cluster'` runs N fully independent OS processes (no leader election, no shared memory — confirmed no `cluster.isPrimary` guard anywhere in `bootstrap.js`); any module that reads a `.jpulse/*.json` file, regenerates its content, and unconditionally re-persists it via a bare `fs.writeFileSync()` (no file lock, no atomic temp+rename) on every single process boot is exposed to concurrent read/write races when multiple instances restart close together (e.g. every `npx jpulse update` + `pm2 start`/`reload` cycle)
- instance (a) — `webapp/utils/plugin-manager.js` (`.jpulse/plugins.json`) — HIGH severity, silent state corruption:
  - `PluginManager.registry` is a per-process, in-memory singleton; `saveRegistry()` is a bare `fs.writeFileSync()`; `initialize()` unconditionally calls it on every boot
  - two distinct triggers converge on the same silent-reset behavior:
    - missing/unreadable registry file: if `.jpulse/plugins.json` doesn't exist, or a read hits invalid/truncated JSON, the `catch` block resets the in-memory registry to fully empty; `discoverPlugins()` then treats every plugin as brand-new and re-defaults each one to its own `autoEnable` value (`false` for `auth-mfa`/`auth-oauth`), then persists that reset state — reproduced in dev when an agent-run `rm -rf .jpulse` (during CI debugging) wasn't restored before the next boot
    - concurrent multi-process access with zero locking: each of the N instances holds its own in-memory registry copy loaded once at boot; if one instance's registry is updated (admin GUI enable, or CLI `jpulse plugin enable`) while a peer instance still holds an older in-memory snapshot, that peer's next `saveRegistry()` call (its own restart, or any other plugin action routed to it) silently clobbers the correct state with its stale copy — `enablePlugin()`'s own return message ("Restart required to take effect.") implicitly acknowledges this gap without actually guarding against it; a `fs.writeFileSync` "torn read" during concurrent access can also trigger the missing/unreadable-file path on just one of the N processes, with the same end result — reproduced independently on both jpulse.net and bubblemap.net (3-instance PM2 clusters) during the rapid, overlapping `pm2 update`/`start`/`reload` cycles of the W-196 VM rollout
  - confirmed to NOT be a case of `.jpulse/app.json` deletion (which only affects app config, not `plugins.json`) — this is strictly a `PluginManager` design gap
- instance (b) — `webapp/app.js` (`loadAppConfig()`, `.jpulse/app.json` + `.jpulse/config-sources.json`) — LOWER severity, self-healing crash instead of silent corruption:
  - same shape: `shouldRegenerateConfig()` triggers on `app.conf`/site `app.conf`/`app-secret.conf` mtime (i.e. right after every `npx jpulse update` or live config edit — exactly when all N instances restart together); regeneration path does two unguarded `fs.writeFileSync()` calls with no lock, no atomic write; runs at module-load time in every one of the N processes, before `bootstrap()` even starts
  - unlike plugins.json, the regenerated content is a pure, deterministic function of the source `.conf` files (no separate "toggled state" to lose), so a race here can't silently corrupt security-relevant state — but if one instance's cached-load branch (`JSON.parse(fs.readFileSync(jsonPath, 'utf8'))`) catches another instance mid-write, `JSON.parse` throws, and the enclosing `catch` calls `process.exit(1)`, crashing that instance outright; PM2 auto-respawns it and the retry succeeds once the write has finished, so it's self-healing but causes a startup crash/flap on any deploy where multiple instances restart together — a plausible, quieter cousin of the W-196 VM incident that wasn't specifically confirmed in this round's logs
- instance (c) — `webapp/utils/redis-manager.js` (shared `isAvailable` flag, not a file race) — MEDIUM severity, low probability but non-self-correcting for the process's lifetime:
  - confirmed NOT affected by the file-race class: all cross-instance coordination goes through genuinely atomic Redis primitives (`SET NX EX` for locks, Lua script for owner-safe lock release, per-instance-unique keys for instance registration) — no local shared file is read-modify-written
  - but a *different* startup race exists: `RedisManager.isAvailable` is a single shared static boolean, mutated by the `connect`/`error`/`close` event handlers (`_addConnectionHandlers()`) of all 7 independently-lifecycled connections (`session`, `websocket.publisher/subscriber`, `broadcast.publisher/subscriber`, `metrics`, `cache`); `getClient(service)` only checks this one shared flag plus non-null — it never checks the specific client's own `.status` (ioredis exposes e.g. `'ready'`/`'connecting'`/`'close'`)
  - with `lazyConnect: true`, most of the 7 connections stay fully dormant during boot (no command issued yet), but two others *do* actively connect in the same narrow boot window as `session`'s awaited `ping()` in `_testConnection()`: `broadcast.subscriber` (via the synchronous `psubscribe()` call in `_createConnections()`, fired just before the ping) and `metrics` (via `_registerInstance()`'s `setex`/`sadd`, called right after the ping succeeds) — if either of those two hits any transient connection blip (auth handshake delay, brief network hiccup, Redis momentarily busy) during that window, their `error`/`close` handler flips the *shared* `isAvailable` to `false`, even though the `session` connection itself is perfectly healthy
  - severity is amplified because `configureSessionStore()` (bootstrap Step 9.1) calls `RedisManager.getClient('session')` exactly once, at boot, and whatever it gets back (real `RedisStore` vs. `MemoryStore`/Mongo fallback) is used for that process's *entire lifetime* — there's no later re-check, so an unlucky, purely transient hiccup on `metrics` or the broadcast subscriber could silently doom session persistence for that one PM2 instance until its next restart, architecturally the same class of fragility as the W-196 session-store-selection bug already fixed, just with a different trigger
  - everything else in `bootstrap.js` (LogController, i18n, HookManager, ViewController, SiteControllerRegistry, ThemeManager, HandlebarController, MongoDB index creation via `ensureIndexes()`) either keeps no cross-process persisted local state, or relies on MongoDB's own atomic index-creation guarantees under concurrent calls — no further issues found there
- minor/optional secondary finding (not blocking, no action needed unless revisited): `HealthController.initializeComplianceScheduler()` (bootstrap Step 11.1) also runs independently in every PM2 instance and decides whether to send a license-compliance report via a plain Redis `GET` then later `SET` of `lastScheduledTimestamp` (`_shouldSendReport()`) rather than an atomic compare-and-swap/lock; if two instances' randomized 0-14-minute send delays land within the same window, there's a narrow theoretical chance of a duplicate report send — already mitigated by design (random spreading + 30-minute dedup window), impact is just a duplicate outbound report, not corrupted app state
- features:
  - shared helper `CommonUtils.writeFileAtomic()` (temp file in the same directory + `fs.renameSync()`) eliminates torn reads for all three files (`plugins.json`, `app.json`, `config-sources.json`); used by both `plugin-manager.js` and `app.js` instead of duplicating the pattern
  - `plugin-manager.js`: `saveRegistry()` now atomic; `initialize()`'s corrupt/missing-registry `catch` now logs a loud `LogController.logError` before resetting, instead of silently `console.error`-ing and moving on; new `_reloadRegistryFromDisk()` re-reads the on-disk registry fresh (re-pointing `discovered`'s cached `registryEntry` references to the freshly-loaded objects) immediately before `enablePlugin()`/`disablePlugin()`/`rescan()` merge their change and save - closes the cross-instance clobbering hole without a lockfile or leader-instance election, since each mutating action now starts from the latest on-disk state instead of a potentially-stale full in-memory snapshot
  - `app.js`: both `.jpulse/app.json` and `.jpulse/config-sources.json` writes now atomic; the cached-load branch's `JSON.parse` is wrapped in its own try/catch that falls back to regenerating from the source `.conf` files (same as a `needsRegeneration` boot) instead of letting the outer catch's `process.exit(1)` crash the process - a peer instance's mid-write (or a genuinely corrupt cache) now self-heals within the same boot instead of crash-looping until the write finishes
  - `redis-manager.js`: `getClient(service, type)` now checks the specific resolved client's own ioredis `.status` first - `'ready'` is authoritative (returned even if the shared `isAvailable` is currently false), `'end'` is authoritative (null even if `isAvailable` is currently true), any other status (including a still-dormant `lazyConnect` `'wait'`) falls back to the shared flag as before; scoped narrowly to `getClient()` only - the ~15 other direct `RedisManager.isAvailable` reads elsewhere in the file (`publishBroadcast`, `healthCheck`, `getMetrics`, etc.) are unchanged
  - explicitly out of scope (decided during planning, not oversights): no advisory lockfile, no leader-PM2-instance election - `_reloadRegistryFromDisk()`'s re-read-before-merge was judged sufficient for the admin-action clobbering scenario without the added complexity/failure modes a lock or leader election would introduce; `HealthController.initializeComplianceScheduler()`'s duplicate-report race left untouched, as originally flagged "not blocking"
  - complementary process guardrail (not a code fix, but directly motivated by the same incident): `.jpulse/*.json` files are generated/read-only cache, derived from real source config - the original dev-environment `auth-mfa`/`auth-oauth` disablement was ultimately traced to an agent directly editing/deleting `.jpulse/` state rather than the concurrency race itself; added a `.cursor/rules/` rule forbidding any agent from running `rm`/`mv`/edits against `.jpulse/` directly, matching the existing "never touch version headers" / "never run bump-version" guardrail pattern
- deliverables:
  - `webapp/utils/common.js`:
    - new `writeFileAtomic(filePath, data)` - temp file + `fs.renameSync()`, with best-effort temp-file cleanup on error; added to both the default export and the named-export destructure list
  - `webapp/utils/plugin-manager.js`:
    - `saveRegistry()`: atomic write via `CommonUtils.writeFileAtomic()`
    - `initialize()`: corrupt/missing-registry `catch` now logs via `LogController.logError` before resetting to an empty registry
    - new `_reloadRegistryFromDisk()`: re-reads `plugins.json` fresh, re-points `discovered` entries' `registryEntry` references; on read/parse failure, logs a warning and keeps the current in-memory registry (no silent reset)
    - `enablePlugin()`, `disablePlugin()`, `rescan()`: now call `_reloadRegistryFromDisk()` before merging their change and saving
  - `webapp/app.js`:
    - `loadAppConfig()`: extracted `regenerateConfig()` helper (atomic writes for `app.json`/`config-sources.json`, shared by both the `needsRegeneration` path and the new fallback path); cached-load branch's `JSON.parse` wrapped in its own try/catch that calls `regenerateConfig()` instead of falling through to the outer catch's `process.exit(1)`
  - `webapp/utils/redis-manager.js`:
    - `getClient(service, type)`: checks the resolved client's own `.status` (`'ready'`/`'end'` authoritative, otherwise falls back to the shared `isAvailable` flag)
  - `webapp/tests/unit/utils/plugin-manager.test.js` (new, 6 tests):
    - atomic `saveRegistry()` leaves no leftover temp file; corrupt-registry `catch` logs via `LogController.logError`; `enablePlugin()`/`disablePlugin()` preserve a simulated peer instance's concurrent change to a different plugin instead of clobbering it; `_reloadRegistryFromDisk()` resiliency (corrupt file, missing file)
  - `webapp/tests/unit/utils/common-utils-file.test.js` (new, 6 tests):
    - `writeFileAtomic()` create/overwrite/no-leftover-temp-file/large-payload/missing-target-dir-cleanup/distinct-temp-filenames
  - `webapp/tests/unit/utils/redis-get-client.test.js` (new, 11 tests):
    - regression coverage for the exact reported race - `getClient()` returns the requested client when its own status is `'ready'` even though the shared `isAvailable` is false, returns `null` when its own status is `'end'` even though `isAvailable` is true, and falls back to the shared flag for ambiguous statuses (`'wait'`/`'connecting'`/`'connect'`/`'close'`/`'reconnecting'`/undefined)
  - note: `app.js`'s `loadAppConfig()` itself has no direct unit test (new or pre-existing) - importing `app.js` runs `startApp()` at module load (binds a real port), so it isn't safely importable in a unit test without a refactor beyond this fix's scope; verified instead via the manual boot check below
  - `.cursor/rules/jpulse-core-standards.mdc`:
    - new "NEVER MOVE, DELETE, OR EDIT FILES IN .jpulse/" rule section (agent-facing guardrail, see complementary finding above)
- test / verify:
  - full suite: 108 suites / 2787 unit tests + 11 suites / 108 integration tests pass (2895 total, 0 failures), including the 23 new tests above
  - manual `npm start`: fresh boot log confirms `Using cached configuration from .jpulse/app.json`, `PluginManager: Discovered 3 plugins (3 enabled, 0 disabled)` with `auth-mfa`/`auth-oauth` both still `enabled: true` (the exact state that was previously found silently reverted), and `RedisManager: ... Available: true` / `Session store: Redis (cluster-ready)`; confirmed no leftover `.tmp.*` files in `.jpulse/` after boot
- benefits: prevents silent, unattended reversion of security-relevant plugin state (e.g. `auth-mfa` disabling itself), eliminates a self-healing-but-avoidable crash/flap on config-file changes, and closes a non-self-correcting session-store-fallback edge case caused by an unrelated Redis connection's transient hiccup — in both single-instance and PM2 cluster deployments

### W-200, v1.7.4, 2026-07-30: plugins: add onPluginConfigBeforeSave hook so plugin config saves can transform/encrypt values before persistence
- status: ✅ DONE
- type: Feature
- objective: let a plugin's `type: "custom"` config field (W-194) participate in the page's single
  generic "Save Changes" action for anything that needs server-side processing before persistence
  (most importantly: encrypting a secret), instead of being forced into its own fully separate
  save path/button as the only safe option today
- depends on: W-105 (plugin hooks), W-194 (custom renderer field type)
- discovered while: building W-197's auth-oauth plugin - its "Identity Providers" custom-rendered
  field (a CRUD table of OAuth provider configs, each with a Client Secret) hit this gap directly
  and shipped a real usability bug because of it (see docs/dev/design/W-197-auth-oauth-plugin.md
  and plugins/auth-oauth/docs/README.md "Known gotcha: two independent Save buttons")
- current contract/gap:
  - `type: "custom"` fields are documented (`docs/plugins/plugin-api-reference.md` "`type: "custom"`
    — plugin-supplied renderer") to expose exactly `{ container, value, onChange, schema, config,
    disabled }` to the renderer - `onChange(v)` is the *only* channel back to the framework, and
    "framework persists it as JSON" verbatim, with no field-specific processing of any kind
  - the page's own generic "Save Changes" button hits a fully plugin-agnostic endpoint
    (`PluginController.updateConfig()`, `webapp/controller/plugin.js`) that only does schema-shape
    validation (`PluginModel.validateConfig()`) before one whole-document `PluginModel.upsert()` -
    it has no hook for "transform/encrypt this one field's value before it touches storage"
  - net effect: any custom renderer whose value contains something that must never be written to
    `pluginConfigs` as-is (e.g. a plaintext secret) *cannot* safely rely on the generic Save button
    at all - it must instead own a fully separate, plugin-specific write path (its own dedicated
    API endpoint(s) + its own explicit Save button in the UI) to get a chance to intercept and
    transform the value server-side first (see `plugins/auth-oauth/webapp/controller/oauthAuth.js`
    `apiAdminProvidersCreate`/`apiAdminProvidersUpdate` + `OauthProviderModel.setClientSecret()`)
  - this forces a confusing two-Save-buttons-on-one-page UX onto any plugin author who needs it:
    the field's own dedicated Save persists immediately and correctly, but the page's generic Save
    only knows about the field's value as of the *last* `ctx.onChange()` call - if an admin edits
    the custom field's form and clicks only the page-level Save (the more prominent/expected one),
    their edit is silently discarded, even though the page reports a "success" message (which is
    accurate for every *other* field, just not this one) - auth-oauth's v1.0.0 shipped a stopgap
    fix (a warning banner inside the provider form, `plugins/auth-oauth/webapp/view/
    jpulse-common.js`), not a structural fix
- design decision (locked in): new `onPluginConfigBeforeSave` hook, fitting the framework's
  existing plugin hook system (W-105) rather than bolting a new concept onto the `type: "custom"`
  client contract - the alternative (extending `ctx.onChange`'s client contract with an optional
  async `beforeSave`) was rejected: it's less symmetrical with how every other cross-cutting
  concern in the framework is implemented, and would still need its own new server-side endpoint
  per plugin to do the actual encryption, which is most of what a dedicated endpoint already
  provides today - no benefit over a hook, for more surface area
  - why this needs a *new* `HookManager` method, not the existing `execute()`/`executeWithCancel()`/
    `executeFirst()` (checked all three, `webapp/utils/hook-manager.js`): all three (a) broadcast to
    *every* plugin registered for the hook name, and (b) `try`/`catch` around each handler and
    swallow any thrown error (log-and-continue) - confirmed by example: `onUserBeforeSave` is
    documented `canCancel: true` in `getAvailableHooks()`, but `UserModel.create()`/`update()`
    actually invoke it via plain `execute()` (`webapp/model/user.js` lines 833, 901), so a throwing
    handler there is silently ignored and the save proceeds anyway - i.e. `canCancel: true` is
    aspirational/inaccurate for that hook today, not an actual guarantee. That swallow-and-continue
    behavior is fine for "nice-to-have" hooks but is exactly wrong for this use case: if a plugin's
    transform handler throws (e.g. encryption fails) and the error gets swallowed, `configData`
    still contains the raw secret and `PluginModel.upsert()` would happily persist it in the clear -
    the failure mode has to be "abort the save," not "silently save the un-transformed value anyway"
  - **`oldConfig` in context is not optional/cosmetic - it's required for the hook's primary use
    case to actually work.** The established convention for secret fields (already used by
    auth-oauth's own dedicated endpoints, `apiAdminProvidersUpdate`) is "leave the field blank/
    unchanged in the submitted form to keep the existing encrypted value" - a handler migrated onto
    this hook can't replicate that without seeing what's currently persisted (it otherwise can't
    tell "admin left this blank, keep the old encrypted ref" apart from "admin wants to clear it").
    `updateConfig()` already unconditionally fetches this via `PluginModel.getByName(name)` (current
    line 439, for change-logging) - just pass that existing result into the hook context, no new
    query needed
- features:
  - `HookManager.executeForPlugin(hookName, pluginName, context)` - filters registered handlers
    down to just the ones registered by `pluginName` (not a broadcast to every plugin), and does
    **not** catch handler errors - they propagate straight to the caller, which is the abort
    mechanism (see rationale above)
  - `onPluginConfigBeforeSave` registered in `getAvailableHooks()`: `context: '{ req, pluginName,
    configData, oldConfig }'`, `canModify: true`, `canCancel: true` - its description explicitly
    calls out that "cancel" here means "handler throws," not "handler returns `false`" (unlike
    every other `canCancel: true` hook in the registry), since it's a new, different convention
  - `PluginController.updateConfig()` calls the hook after the existing `oldConfig =
    PluginModel.getByName(name)` fetch and before `PluginModel.upsert()`; a thrown error aborts the
    whole save with `CommonUtils.sendError(req, res, 400, hookError.message, 'CONFIG_SAVE_REJECTED')`
    - whole-save-aborts-on-throw (not per-field partial success) - simplest semantics, matches how
      schema validation failure already aborts the entire save today, and avoids ever landing on a
      half-transformed `configData` in storage
    - `configData` (current line 417) is a plain object/array structure, declared `const` -
      handlers mutate its contents in place (e.g. `context.configData.providers[i].clientSecret =
      ...`), not reassign the `configData` binding itself; `PluginModel.upsert(name, configData,
      username)` on the next line sees the same, now-mutated object, so no reassignment is needed
    - the thrown error's `.message` is shown to the admin verbatim in the UI - plugin authors must
      throw a user-facing, non-sensitive message (e.g. "Failed to encrypt client secret"), never a
      raw crypto/library error that could leak internals
- auth-oauth migration: explicitly out of scope for this work item. `plugins/auth-oauth`'s
  existing dedicated-endpoint pattern (`apiAdminProvidersCreate`/`apiAdminProvidersUpdate` +
  `OauthProviderModel.setClientSecret()`) is already correct and secure - it just doesn't get the
  benefit of a single unified Save button. Migrating it onto the new hook once it exists (to retire
  the W-197 stopgap warning banner and collapse the two Save buttons into one) is worth doing later,
  but is a separate, optional follow-up, not a prerequisite for this work item to be complete.
  **✅ DONE, follow-up session:** `plugins/auth-oauth/webapp/controller/oauthAuth.js` (separate
  repo) now registers `onPluginConfigBeforeSave`, which validates/sanitizes/encrypts every
  provider in the submitted list the same way the dedicated endpoints do (both now share a new
  `_prepareProviderEntry()` helper, so there's exactly one place secrets get encrypted), and cleans
  up the encrypted secret for any provider deleted locally in the same save. An initial pass kept a
  per-row "Apply" button, which the user correctly called out as just relocating the same
  "two actions needed" complaint rather than removing it - the W-194 custom renderer
  (`webapp/view/jpulse-common.js`) was redone once more so every field write, Add, and Delete are
  all local `providers`-array edits with zero commit step (no Save/Apply, nothing to Cancel);
  Delete on a never-saved row skips the confirm dialog, Delete on a previously-saved provider still
  confirms. Test Connection is the one exception - it needs a real, already-encrypted server-side
  secret, so it's still an immediate dedicated-endpoint call and is disabled in the UI until a
  provider has actually been saved. The W-197 stopgap warning banner is removed; docs and design
  doc updated to match. Full plugin suite re-run clean (161/161).
- deliverables:
  - `webapp/utils/hook-manager.js`:
    - added `executeForPlugin(hookName, pluginName, context)` (single-plugin scope, propagates
      errors instead of swallowing them - see rationale above)
    - registered `onPluginConfigBeforeSave` in `getAvailableHooks()`
    - bumped the stale "Phase 8: ... (13 hooks total)" docblock comment (already stale at 14
      since W-195 added `onAuthGetLoginProviders`) to 15
  - `webapp/controller/plugin.js`:
    - `updateConfig()` now invokes the hook right after the existing `oldConfig` fetch and before
      `PluginModel.upsert()`, per the locked-in design above; a thrown error maps to a 400
      `CONFIG_SAVE_REJECTED` response
  - `docs/plugins/plugin-hooks.md`:
    - new "Plugin Config Hooks" section using the same `%DYNAMIC{plugins-hooks-list-table
      namespace="onPluginConfig"}%` mechanism as the existing Auth/User sections, for consistency
      and future-proofing (auto-updates if more `onPluginConfig*` hooks are added later)
    - new "Encrypting a Plugin Config Secret" worked example in "Common Use Cases" (matching the
      existing OAuth2/MFA/audit-log style): a plugin's `onPluginConfigBeforeSave` handler that
      encrypts a submitted plaintext secret and falls back to `oldConfig` when the field is left
      blank - explicitly flags the "throw to abort" contract as different from every other hook's
      catch-and-continue behavior
  - `docs/plugins/plugin-api-reference.md`:
    - cross-referenced the new hook from the `type: "custom"` section, since that's the field
      type this hook exists to unblock
  - `docs/plugins/creating-plugins.md`:
    - "Available Hooks" bullet list gains `**Plugin Config (1):** onPluginConfigBeforeSave`
      (same pattern W-195 used to add `onAuthGetLoginProviders`)
  - `plugins/auth-oauth/webapp/controller/oauthAuth.js`, `plugins/auth-oauth/webapp/view/
    jpulse-common.js`, `plugins/auth-oauth/docs/README.md`:
    - NOT done (optional follow-up, not part of this work item's completion criteria): consider
      migrating the provider CRUD table onto the new hook to collapse its two Save buttons into
      one, retiring the W-197 stopgap banner and README gotcha note
  - `webapp/tests/unit/utils/hook-manager.test.js`:
    - added tests for `executeForPlugin()` - single-plugin scoping (a handler registered by a
      different plugin does not run), error propagation (a throwing handler rejects the call,
      not swallowed/logged-and-continued), stop-at-throwing-handler, the no-handlers-registered
      no-op case, and the hook's `getAvailableHooks()` registration shape
  - `webapp/tests/unit/controller/plugin-controller.test.js`:
    - added tests for `updateConfig()`'s new hook call - correct `{ req, pluginName, configData,
      oldConfig }` context passed, happy path (handler-mutated `configData` is what's passed to
      `PluginModel.upsert()`, not the raw submitted value), rejection path (handler throws -> 400
      `CONFIG_SAVE_REJECTED`, `PluginModel.upsert()` never called), and the hook still firing even
      when the plugin declares no config schema
- test / verify:
  - full unit suite passes: 119 suites / 2905 tests (`npx jest --runInBand`), including the 6 new
    `hook-manager.test.js` tests and 4 new `plugin-controller.test.js` tests above
  - manually verified live via `npm start` + Admin → Plugins, using a throwaway plugin
    (`plugins/w200-hook-test/`, deleted after verification - not part of this work item's
    deliverables) registering an `onPluginConfigBeforeSave` handler that throws on input `"throw"`
    and otherwise mutates the value with a `MUTATED:` prefix:
    - rejection path: typed `throw` → "Save Changes" surfaced the thrown message, logged as
      `ERROR ... plugin.updateConfig error: ...` with no `log.change` entry, config NOT persisted
    - mutation path: typed `hello` → save succeeded, reloading the config page showed the
      persisted value as `MUTATED:hello` (the handler-mutated value), not the raw submitted `hello`
- benefits: removes a real, already-shipped usability footgun (silently discarded config edits with
  a misleading "success" message) for any current or future plugin whose custom-rendered config
  field needs server-side processing before persistence, and gives plugin authors a documented,
  supported way to do that instead of each one having to invent its own fully separate save path

### W-201, v1.7.5, 2026-07-30: auth: fix auth login controller checking account status against non-existing enum locked/disabled
- status: ✅ DONE
- type: Bugfix
- objective: replace `webapp/controller/auth.js`'s dead `user.status === 'locked'` / `'disabled'`
  checks with a single controller-layer status gate against `UserModel`'s actual status enum,
  shared by both the internal (username/password) and external (`skipPasswordCheck`) login paths -
  and move status enforcement out of `UserModel.authenticate()` entirely, since leaving it there is
  what currently preempts the controller-layer check for local login and produces a 500 Internal
  Server Error instead of a clean, actionable, per-status response
- discovered while: fixing the identical (but live/exploitable, not dead) bug in the auth-oauth
  plugin (W-197) - its own account-status gate literally commented "mirrors the existing
  locked/disabled convention used elsewhere in auth.js", which is exactly where the stale enum
  values were copied from
- current gap (two separate, compounding bugs, not one):
  - dead code: `UserModel`'s real, enforced status enum is `'pending' | 'active' | 'inactive' |
    'suspended' | 'terminated'` (`webapp/model/user.js` line 54) - there is no `'locked'` or
    `'disabled'` value. `auth.js`'s `login()` method checks for exactly those two nonexistent
    values (`webapp/controller/auth.js` lines 486, 496), each with its own translated error
    message (`controller.auth.accountLocked` / `accountDisabled` in `webapp/translations/en.conf`
    lines 34-35, and the `de.conf` equivalents) - none of this can ever fire for any account
    created through the current schema
  - wrong-status-code UX bug (not previously called out, found during this session's review):
    even once the enum values above are fixed, the checks still can't fire for *local password
    login*, because `UserModel.authenticate()` (called just above, `webapp/model/user.js` lines
    966-969) already throws a generic `Error('User account is ${status}')` for any
    `status !== 'active'` *before* execution ever reaches the controller-layer checks - that throw
    is caught by `login()`'s outer catch-all (`webapp/controller/auth.js` lines 634-643) and
    surfaced to the end user as a 500 `INTERNAL_ERROR` with a message like "Internal server error
    during login: User account is suspended," not a 403 with a specific, translated, actionable
    message. A real user with a `pending`/`inactive`/`suspended`/`terminated` account who enters
    the *correct* password today sees what looks like a system failure, not a clear explanation
    of why they were rejected
  - risk (both bugs share this root cause): any *future* external-auth integration that hooks into
    `onAuthBeforeLogin` with `skipPasswordCheck: true` (bypassing `UserModel.authenticate()`, the
    same way auth-oauth's own separate `completeExternalAuth()` call does) inherits whichever of
    these two bugs applies to it - the dead code is a trap for the next integration, not just
    harmless cruft, and fixing only the enum values (without also fixing the second bug) would
    leave local password login's 500-error behavior in place indefinitely
- design decision (locked in): centralize ALL account-status enforcement in `auth.js`'s `login()`,
  not `UserModel.authenticate()` - matches the precedent W-195 already established for
  `completeExternalAuth()` ("no implicit framework-side gate on `user.status`... the caller must
  check it explicitly") and is the only way for internal and external login to share one status
  gate with one set of outcomes:
  - `UserModel.authenticate(identifier, password)` becomes credentials-only: verify
    username/email + password, return the full user document (whatever its status) or `null` - it
    no longer inspects/throws on `status` at all. (Single call site in the whole codebase -
    `webapp/controller/auth.js` line 437, confirmed via repo-wide search - so this is a safe,
    self-contained contract change with no other consumers to update.)
  - side effect of verifying the password before status is ever inspected: closes a minor
    account-status-enumeration timing/response-shape side channel that exists today (a caller who
    doesn't know the password can currently learn that a given username/email belongs to an
    account and its exact non-active status, without the request ever reaching the password
    check) - not the primary motivation, but a genuine hardening bonus of this design, not a
    separate work item
  - `auth.js`'s existing "Check account status" block (already correctly positioned *after* both
    the internal and external branches converge on a single `user` variable) gets 4 sequential
    `if` checks against the real enum - `'pending'`, `'suspended'`, `'terminated'`, `'inactive'`,
    in that order - mirroring `plugins/auth-oauth/webapp/controller/oauthAuth.js`
    `_handleLoginCallback()`'s existing style/order exactly (same reason codes:
    `ACCOUNT_PENDING_APPROVAL` / `ACCOUNT_SUSPENDED` / `ACCOUNT_TERMINATED` / `ACCOUNT_INACTIVE`),
    so the two systems behave identically from an admin/end-user perspective - one mental model
    for "why was my login rejected," everywhere in the framework
- features:
  - local password login and any current/future external-auth plugin using
    `onAuthBeforeLogin`/`skipPasswordCheck` now get identical, correct 403 responses for every
    non-active status - a specific translated message + machine-readable code, never a 500
  - `docs/plugins/plugin-hooks.md`'s `onAuthBeforeLogin`/`skipPasswordCheck` example gets a short
    note clarifying that (unlike `completeExternalAuth()`, already documented as NOT gating on
    status) `context.user`'s status IS enforced automatically by the framework for this
    integration path - closing the exact ambiguity that led auth-oauth's author to copy the wrong
    convention in the first place
- deliverables:
  - `webapp/model/user.js`:
    - `authenticate()`: removed the `status !== 'active'` throw; now purely verifies
      username/email + password and returns the user (any status) or `null`
  - `webapp/controller/auth.js`:
    - `login()`: replaced the `'locked'`/`'disabled'` checks (lines ~486-504) with 4
      sequential checks against `'pending'`/`'suspended'`/`'terminated'`/`'inactive'`, each with
      its own translated message + code (see design decision above); each branch also fires
      `onAuthFailure` (reason matching the code) before returning, matching the existing
      `INVALID_CREDENTIALS`/`LOCAL_AUTH_RESTRICTED` branches above it in the same method - found
      during implementation, not explicitly planned, but needed for consistency (and gives W-202's
      future lockout counter the same hook signal every other rejection path already provides)
  - `webapp/translations/en.conf`, `webapp/translations/de.conf`:
    - replaced `controller.auth.accountLocked` / `accountDisabled` with
      `accountPendingApproval` / `accountSuspended` / `accountTerminated` / `accountInactive`
  - `docs/plugins/plugin-hooks.md`:
    - added the status-enforcement clarification note to the `skipPasswordCheck` section
      (see features above)
  - `webapp/tests/unit/controller/auth-controller.test.js`:
    - new `W-201: account status enforcement` block - `describe.each` over all 4 statuses,
      covering both the internal (`UserModel.authenticate` mocked to return a non-active user) and
      external (`skipPasswordCheck` hook) paths, plus a `status: 'active'` regression guard -
      9 new tests, correct 403/code/message and confirms `req.session.user` is never set
  - `webapp/tests/unit/user/user-*.test.js`:
    - confirmed none of the existing status-related tests call the real
      `UserModel.authenticate()` (they use local mock functions) - no changes needed
  - `plugins/auth-oauth/webapp/controller/oauthAuth.js`:
    - already corrected in prior session to check
      `'suspended'`/`'terminated'`/`'inactive'`/`'pending'` directly against the real enum, with its
      own `ACCOUNT_SUSPENDED`/`ACCOUNT_TERMINATED`/`ACCOUNT_INACTIVE`/`ACCOUNT_PENDING_APPROVAL`
      reason codes - this work item's design decision adopts that same convention, so this work
      item is about the framework catching up to the plugin, not the other way around
  - `webapp/controller/user.js` (unrelated bug, found while preparing test accounts for the manual
    verification below - bundled into this same release):
    - `_filterPublicProfileFields()`'s admin branch never computed `initials` (a derived,
      session-only value, never part of `UserModel.baseSchema`/never persisted) - raw DB documents
      have no `initials` field, so the admin users list (`admin/users.shtml`) fell back to `?` for
      every row's avatar; fixed by computing it the same way the non-admin branch already does
  - `webapp/tests/unit/user/user-controller-profile-fields.test.js` (new, 4 tests):
    - regression coverage for the `initials` fix above - admin viewer gets computed `initials`
      matching the non-admin branch's formula, still gets every other raw field minus
      `passwordHash`, and the empty-name-part fallback behavior
- test / verify:
  - full unit suite passes: 120 suites / 2918 tests (`npx jest --runInBand`), including the 9 new
    `auth-controller.test.js` tests and the 4 new `user-controller-profile-fields.test.js` tests
    above (2905 baseline from W-200 + 9 + 4)
  - manually verified live via `npm start` + `/auth/login.shtml`, using 4 real accounts with a
    real password each - confirms the fix end-to-end (browser → API → i18n → rendered message),
    not just the controller-layer JSON asserted by the unit tests above:
    - `pending` (`@ptester6`): "Your account is pending approval. Please check back later, or
      contact your administrator."
    - `inactive` (`@ptester7`): "Your account is inactive. Please contact your administrator to
      reactivate it."
    - `suspended` (`@ptester8`): "Your account has been suspended. Please contact your
      administrator for more information."
    - `terminated` (`@ptester9`): "Your account has been terminated. Please contact your
      administrator if you believe this is a mistake."
    - all 4 correctly rejected with the intended per-status message (previously would have been a
      generic 500 "Internal server error during login: User account is {status}" for all 4, or
      silently ignored the status entirely for any external-auth `skipPasswordCheck` path)
- benefits: removes a source of copy-paste bugs for future external-auth plugins/hooks; makes the
  controller layer's status handling match the schema it's actually reading from; and fixes a
  real, currently-shipping UX bug where a legitimate user with a non-active account and the
  *correct* password sees a generic 500 Internal Server Error instead of a clear, actionable
  explanation

### W-198, v1.7.6, 2026-07-31: users: email/username uniqueness is not DB-enforced (email also case-sensitive and unverified) - enables duplicate accounts and an OAuth pre-linking account-takeover
- status: ✅ DONE
- type: Bugfix (security)
- objectives:
  - close two related gaps in `UserModel`'s uniqueness/email handling - (a) neither `email` nor
    `username` uniqueness is enforced at the database level (only a non-atomic app-level
    check-then-insert), which is a real, empirically-confirmed race, not just theoretical, plus
    email has an additional, independent case-sensitivity gap on top of that shared race, and (b)
    neither signup nor profile email-change verifies actual ownership of the address, which
    combined with the auth-oauth plugin's (W-197) `link-by-email`/`jit-create` strategies enables a
    pre-authentication account-takeover attack
  - root cause (a) - uniqueness is not DB-enforced for EITHER field, confirmed as a real, live race
    (not just email):
    - `UserModel.create()` (`webapp/model/user.js`) does a plain, non-atomic check-then-insert for
      both fields - `findByUsername()`, then `findByEmail()`, then `insertOne()` - with no MongoDB
      transaction and no unique index backing either one
    - no MongoDB unique index exists on `users.email` OR `users.username` at all - confirmed no
      `createIndex()` call anywhere for the `users` collection (contrast `plugins.name`, which does
      get one) - the schema's `unique: true` is declarative only, enforced solely by the app-level
      pre-checks above
    - `findByEmail()` additionally does an exact case-sensitive match (`{ email: email }`) with no
      `.toLowerCase()` normalization, unlike `findByUsername()`, which normalizes to lowercase both
      client-side (signup form's `oninput` handler) and server-side - so email has both the shared
      race gap AND this second, independent case-sensitivity gap; username only has the first
    - **empirical confirmation (this session, W-201 manual testing):** found two live `users`
      documents with identical `username: 'ptester8'` AND identical `email` in a dev database -
      `createdAt` timestamps exactly 1ms apart (`2025-09-04T06:38:46.974Z` /
      `...975Z`), confirming two near-simultaneous `create()` calls both passed the "not found"
      check before either `insertOne()` landed - not a manual double-entry, a real race; the two
      resulting documents also picked up different schema-extension state (one has the auth-mfa
      plugin's `mfa` block, the other doesn't), consistent with two independent code paths through
      `applyDefaults()`/`prepareSaveData()` at the same instant
    - net effect: `peter@thoeny.org` and `Peter@Thoeny.org` can coexist as two separate accounts
      (email-only, case gap); and - now confirmed live, not just theoretical - a race can create
      two accounts with the identical `username` and/or identical `email` string (both fields,
      shared gap)
  - root cause (b) - email is never verified, at signup or on change - the more serious one:
    - grepped the entire `webapp/` tree for `emailVerified`/`verifyEmail`/`confirmEmail` - the only
      hit is a single comment in `webapp/controller/user.js` ("W-105: Enhanced with plugin hooks
      for email confirmation...") describing a hook extension *point*, not an actual
      implementation; no verification email is ever sent, no confirmation token/flow exists
      anywhere
    - `UserModel.create()` (signup) only checks "does any other account already hold this exact
      email string" - it never checks or requires any proof that the requester actually controls
      that inbox
    - **correction (found during this session's effort-scoping, before the exploit chain below was
      corrected):** the exploit chain originally described here had the attacker "change their own
      account's email via the standard profile-update endpoint" - that step doesn't actually work
      as written. `webapp/controller/user.js`'s `update()` puts `email` in its admin-only field
      list (`adminFields`, ~line 674) - a non-admin's own update request never has
      `filteredData.email` populated at all (the `else` branch only allows
      `profile`/`preferences`/userCard-visible extension blocks). So a regular attacker cannot
      self-service change their own email today. The exploit chain below is corrected to the
      actually-exploitable path, which needs no profile-update step and no elevated access at all
    - exploit chain against W-197's auth-oauth plugin (corrected):
      1. attacker signs up (`UserModel.create()`, an ordinary, unauthenticated, self-service
         action) for a new local jPulse account using the victim's real email address directly as
         their own signup email (e.g. `victim@thoeny.org`) - this succeeds as long as no other
         local account currently holds that exact string, which is the common case for a victim
         who has never signed up locally; no proof of inbox ownership is required at signup
      2. when the real victim later does their first Google/OIDC SSO login (`link-by-email` or
         `jit-create` strategy), `OauthAuthController._resolveUser()`'s email lookup
         (`UserModel.find({ email: identity.email }, { limit: 2 })`) finds exactly one match - the
         attacker's account - and links the victim's verified IdP identity to it (the
         `emailMatches.length === 1` branch, `plugins/auth-oauth/webapp/controller/oauthAuth.js`
         ~line 823)
      3. the victim is transparently logged into the attacker-controlled account for that flow,
         and every future SSO login from the victim's real Google identity lands on the same
         attacker-controlled account, which the attacker can still also access via their own known
         local password
      4. `AMBIGUOUS_EMAIL_MATCH` (W-197's existing safeguard) does **not** catch this case, because
         there's only ever one account holding that email string - the safeguard only fires on a
         pre-existing exact duplicate, not on a single squatted email
    - separate, lower-likelihood variant of the same root gap: since `email` IS admin-editable, an
      admin (malicious, compromised, or simply mistaken) reassigning a user's email to someone
      else's real address would hit the exact same unverified-linking exposure on that account's
      next SSO login - not the primary attack scenario, but the same underlying "no ownership
      check on email" gap, just via a different, privileged actor
    - secondary, lower-severity abuse of the same gap (no OAuth involved): email squatting as
      denial-of-service - anyone can pre-claim an arbitrary real email address on a dummy local
      account at signup, permanently blocking the real owner of that inbox from ever signing up
      locally, via `UserModel.create()`'s "Email address already registered" check
    - root cause is framework-wide (a general `UserModel.create()`/signup gap, not specific to the
      auth-oauth plugin), but the auth-oauth plugin's `link-by-email`/`jit-create` strategies are
      what turn it from a data-hygiene nitpick into an account-takeover primitive, since they
      implicitly trust "this local account's stored email == this IdP-verified email" as
      sufficient proof of identity
- rationale: discovered while manually testing W-197's auth-oauth plugin end-to-end against a live
  Google IdP, then investigating whether duplicate-email accounts are possible in the framework at
  all; broadened (this session) after manually testing W-201 surfaced a live duplicate-`username`
  account in a dev database, empirically confirming the race described in root cause (a) actually
  happens, not just theoretical
- features:
  - this work item ships only the DB-integrity fix (root cause a, fully closed) plus the minimal
    `emailVerified` schema primitive needed for a future auth-oauth fix to fail closed - root cause
    (b)'s account-takeover is closed by the mere existence of a default-`false` field, no email
    ever needs to be sent from this item; the full verification *experience* (send a code, verify
    it, resend, rate-limit, nag-vs-block login UX) is deferred to a new future work item - see
    tech-debt below
  - existing accounts: a **missing** `emailVerified` field is treated as implicitly
    verified/grandfathered; only an **explicit** `false` (set by `applyDefaults()` for brand-new
    signups going forward) means "not yet verified" - avoids a disruptive migration and avoids
    breaking any site's already-working OAuth `link-by-email` linking for existing users
  - email case normalization: lowercase-and-store `email` everywhere (mirrors the existing
    `username` pattern) rather than a MongoDB collation-based index - simpler to reason about in
    all future code touching `email`, at the cost of a one-time backfill of already-stored
    mixed-case values (bundle with the pre-existing-duplicate detection below, since normalizing
    old data may reveal new case-only collisions)
  - add real MongoDB unique indexes on BOTH `users.email` (lowercased value) AND `users.username`,
    as a backstop against the check-then-insert race for both fields, not just an app-level
    pre-check - the empirically-confirmed duplicate found this session was a `username` collision,
    so fixing only the `email` index would leave the exact same race open on the other field
  - pre-existing-duplicate handling before adding the new unique indexes: follow the existing
    `checkLocalAuthRestrictionSafety()` (W-195, `webapp/utils/bootstrap.js`) precedent - log a
    loud, actionable warning and skip creating the index until an admin resolves the duplicates,
    don't crash server startup
  - admin manual override: add `emailVerified` to the existing admin-editable field list
    (`webapp/controller/user.js` `adminFields`, ~line 674) now, so admins have an immediate lever
    even before the future verification feature exists
  - explicit repo boundary: the `plugins/auth-oauth/webapp/controller/oauthAuth.js` /
    `oauth-error.shtml` deliverables below live in the separate
    `github.com/jpulse-net/plugin-auth-oauth` repo (not present in this `jpulse-framework`
    workspace); that fix only needs the `emailVerified` field to exist (this item) - it can ship
    as soon as W-198 lands, independent of whether the full verification UX (tech-debt below) has
    been built yet, since a permanently-`false` field already fails closed
- deliverables:
  - `webapp/model/user.js`:
    - add `emailVerified` boolean field (default `false`) to `baseSchema`; only affects new
      documents via `applyDefaults()` - existing documents intentionally left untouched (a missing
      field means grandfathered/verified, see features above, no migration needed)
    - lowercase-normalize email in `findByEmail()`, `create()`, and `updateById()` (mirrors the
      existing `username` normalization)
    - add `UserModel.ensureIndexes()` (mirrors `PluginModel.ensureIndexes()`,
      `webapp/model/plugin.js`): one-time backfill lowercasing any already-stored mixed-case
      `email` values (`username` needs none - `create()` has always normalized it), then creates
      unique indexes on `email` and `username`; pre-check for existing duplicates (including new
      case-only collisions surfaced by the backfill) and warn-and-skip (not crash) if found,
      following `checkLocalAuthRestrictionSafety()` (W-195)'s non-throwing pattern
    - catch MongoDB duplicate-key errors (E11000) in `create()` as the authoritative backstop
      against the check-then-insert race, translated to the existing friendly `'Username already
      exists'`/`'Email address already registered'` errors
  - `webapp/utils/bootstrap.js`:
    - call `UserModel.ensureIndexes()` at startup (mirrors the existing `PluginModel.ensureIndexes()`
      call, ~line 128)
  - `webapp/controller/user.js`:
    - lowercase-normalize email in the admin-only email-change duplicate check in `update()`
    - add `emailVerified` to the admin-editable field list (`adminFields`, ~line 674) so admins
      have a manual override lever ahead of the future verification feature
  - `webapp/app.conf`:
    - add `controller.user.emailVerification: 'required'` config flag scaffold
      (`'off' | 'nag' | 'required'`) - reserves the setting and its default; not yet wired to an
      actual verification flow (that's the deferred future work item)
  - `plugins/auth-oauth/webapp/controller/oauthAuth.js` (separate repo - ✅ DONE, follow-up
    session after v1.7.6 shipped):
    - added a `normalizeEmail()` helper (trim+lowercase) and applied it to every direct
      `UserModel.find({ email: ... })` query in `_resolveUser()` and `_createJitUser()`'s
      race-retry path - these bypass `UserModel.findByEmail()` (need the array/`limit` shape for
      ambiguous-match detection) and so don't get its normalization for free; without this fix, an
      IdP-returned non-lowercase email could fail to match an already-normalized local account
    - `_resolveUser()`'s email-match branch now rejects with the planned `LOCAL_EMAIL_NOT_VERIFIED`
      reason code when the matched local account has `emailVerified === false` explicitly (a
      **missing** field is treated as grandfathered/verified, matching `UserModel`'s own
      convention for pre-W-198 accounts) - this is the actual account-takeover fix root cause (b)
      was tracking
    - `_createJitUser()` now explicitly stamps `emailVerified: true` on the new local account (the
      caller already confirmed `identity.emailVerified === true` at the IdP before ever reaching
      this method) - without this, `UserModel.applyDefaults()` would otherwise default every
      brand-new document to `emailVerified: false`, which is correct for local signup but wrong
      for an IdP-verified JIT account
  - `plugins/auth-oauth/webapp/view/auth/oauth-error.shtml` (separate repo - ✅ DONE, same
    follow-up session):
    - added the friendly message for `LOCAL_EMAIL_NOT_VERIFIED`
  - `plugins/auth-oauth/webapp/tests/unit/controller/oauth-auth.test.js` (separate repo - ✅ DONE,
    same follow-up session):
    - added coverage for mixed-case email normalization before the local lookup, the new
      `LOCAL_EMAIL_NOT_VERIFIED` rejection, the pre-W-198 grandfathered (missing-field) pass-through,
      and `emailVerified: true` on the `UserModel.create()` call in `jit-create` - full plugin
      suite re-run clean (151/151)
  - `docs/dev/design/W-197-auth-oauth-plugin.md`:
    - correct the mistaken claim (~line 642) that a unique index on email/username already exists
      and heals concurrent JIT races
  - `docs/security-and-auth.md`:
    - correct the "Unique constraint checking" claim (~362-377) to reflect real DB-level
      enforcement (once implemented)
- tech-debt (scope deferred to a future work item, replacing the vague backlog placeholder
  "W-0: auth controller: email verification plugin" - use this as the starting point for that
  item's design-doc pass, before implementation):
  - build as **core** framework functionality, not a separate installable plugin - unlike
    MFA/OAuth, "the signup email isn't fake/squatted" is a baseline correctness property of local
    signup (itself core), not an optional enterprise integration; a plugin would default OFF for
    most installs (opt-in package), leaving root cause (b)'s DoS/squatting variant open by default
    for any site that doesn't install it
  - gate behind a 3-way policy flag (not a boolean), e.g. `controller.user.emailVerification:
    'off' | 'nag' | 'required'`, default `'required'` (secure by default; combined with the
    grandfathering rule above, this only affects new signups going forward, no disruption to
    already-live accounts)
  - build on infrastructure that already exists rather than inventing new mechanisms:
    - token/code storage+TTL: `RedisManager.cacheSetToken()`/`cacheGetToken()`
      (`webapp/utils/redis-manager.js`), following the `crypto.randomBytes()` + bcrypt-hash pattern
      already documented in `docs/dev/design/W-143-redis-based-cache-infrastructure.md` (~216-227)
    - sending: `EmailController.sendEmailFromTemplate()` (`webapp/controller/email.js`)
    - resend throttling: `RedisManager.cacheCheckRateLimit()`
    - login integration: the multi-step login hooks already built for exactly this scenario in
      W-109 (`onAuthGetSteps`, `onAuthValidateStep`, `onAuthGetWarnings`,
      `webapp/controller/auth.js`) - Scenario 5 (blocking) and Scenario 6 (nag) in
      `docs/dev/design/W-109-auth-multi-step-login.md` (~290-333) already spec the code-based (not
      link-based) `{ step: "email-verify", code: "ABC123" }` shape to reuse
    - client-side landing page: `webapp/view/auth/login.shtml` (~515-519) already has a `case
      'email-verify':` stub pointing at `/auth/email-verify.shtml`, which doesn't exist yet -
      create it there, not under a plugin's view tree
  - still-open design questions for that future design doc to resolve (not yet decided):
    - code format (numeric code vs token) and its length/TTL
    - resend endpoint's exact rate-limit numbers
    - whether an admin-driven email change (admin-only, see root cause (b) correction above)
      should also reset `emailVerified` to `false` and re-trigger sending
    - `'nag'` mode's exact dismissal behavior (once per login vs once per session vs until
      verified)

### W-197, v1.0.3, 2026-08-02: auth-oauth plugin: single sign-on with auth servers like Okta, Google, Apple
- status: ✅ DONE
- type: Feature
- objective: SSO plugin supporting two deployment scenarios — (1) public sites with consumer providers (Google, and later Apple/GitHub), (2) org-internal sites with enterprise providers (Okta, Auth0, Azure Entra, Keycloak, ADFS via generic OIDC)
- repository: github.com/jpulse-net/plugin-auth-oauth (separate repo, independent versioning)
- npm package: @jpulse-net/plugin-auth-oauth@1.0.0 (planned, GitHub Package Registry)
- depends on: W-105 (plugin hooks), W-107 (data-driven user cards), W-109 (multi-step login), W-194 (custom renderer), W-195 (external auth helpers)
- working doc: docs/dev/design/W-197-auth-oauth-plugin.md
- scope v1.0.0:
  - Google preset (public sites)
  - generic OIDC preset (Okta, Auth0, Entra, Keycloak, ADFS via discovery URL)
  - custom OAuth2 preset (manual URLs, non-OIDC providers)
  - multiple providers active simultaneously; provider list stored via W-194 custom renderer
  - out of scope for v1.0.0: Apple SSO (form_post + first-consent-only email), GitHub preset, token persistence, backchannel logout, SAML — deferred to v1.1+
- features:
  - Authorization Code flow with mandatory PKCE (S256), state (CSRF), nonce (OIDC)
  - ID token signature verification via provider JWKS (cached by openid-client)
  - three user linking strategies, per-provider configurable:
    - `sub-only`: strict — admin must pre-provision users
    - `link-by-email` (default): match existing local user by verified email, then use sub for subsequent logins
    - `jit-create`: create new users on first login with default role and status; writes only fields already present in `UserModel.baseSchema` — no framework schema changes needed (synthetic random `passwordHash`, `hasLocalPassword: false`, guaranteed non-empty `profile.firstName`/`lastName` via fallback chain; see design doc §7, §10)
  - `email_verified: true` (an IdP-provided claim, not a persisted user field) required for `link-by-email` and JIT (prevents account takeover via unverified email at IdP); stored for audit only inside `oauth.{provider}.emailVerified`, never on the base user document
  - migration paths for existing internal-auth sites (see design doc §9):
    - Path A: automatic email-link on first SSO login (zero admin work when local email = IdP email)
    - Path B: self-service link from linked-accounts page (user logs in locally first, then connects SSO provider)
    - Path C: admin bulk CSV import — deferred to v2.0
  - profile field extraction & JIT completion (see design doc §10):
    - Stage A: best-effort claim extraction with fallbacks (given_name / family_name / name-split heuristics / preferred_username / email local-part), always resolving to a non-empty value since `profile.firstName`/`lastName` are schema-required; tracks which fields only got a placeholder via `oauth._jit.placeholderFields`
    - Stage B: interactive `oauth-profile-complete` step injected into the W-109 multi-step flow when Stage A only produced placeholders for a field in `profileRequiredFields` — JIT-created users only (gated by presence of `oauth._jit`), existing users never re-prompted
    - `profileRequiredFields` config option (default `['firstName', 'lastName']`) controls which fields trigger Stage B
    - `oauth._jit` sentinel (`{ createdAt, viaProvider, placeholderFields, profileCompletedAt }`) lives as a sibling of provider blocks under `user.oauth`, not nested inside any one provider's block — it's a property of the user, not of a specific provider link
  - `status: 'pending'` (existing `UserModel` enum value, not a new one) supported for JIT: the plugin's callback handler checks it explicitly before calling `AuthController.completeExternalAuth()` — there is no implicit framework-side gate for this
  - account lifecycle / local-password interplay (see design doc §11): unlink-last-method guard blocks removing a user's only sign-in method when `hasLocalPassword === false` (W-195 primitive), pointing them to the existing "Set Password" flow instead of building new password UI
  - `allowedDomains` per-provider option for domain-restricted signup
  - `jitDefaultRoles`/`jitRoles` never offer or accept `admin`/`root` — stripped in code as defense in depth, not just excluded from the config UI
  - user schema extension: `user.oauth.{provider}` block with W-107 adminCard/userCard for link/unlink management
  - no IdP session or token persistence — only `sub`, `email`, `emailVerified`, `name`, `picture`, `preferredUsername`, `iss`, `linkedAt`, `lastLoginAt`
  - client_secret encrypted at rest in `authOauth_providers` collection using framework encryption utility (same pattern as auth-mfa TOTP secret)
  - login page buttons injected via `onAuthGetLoginProviders` (from W-195), per-provider `icon` / `buttonColor` / `label` for branding
  - computed, copyable redirect URI shown per provider in the config renderer (derived from `req.protocol`/`req.get('host')`, same pattern as `handlebar.js`'s `url.domain`) — admin never has to guess the callback URL to paste into the IdP console
  - composes with auth-mfa: MFA step runs after successful OAuth identity resolution via existing W-109 flow
  - user linked-accounts management page (`/jpulse-plugins/auth-oauth.shtml`) for connecting/disconnecting providers
  - error page (`/auth/oauth-error.shtml`) with a client-side reason-code → friendly-message map (never leaks raw provider errors; no framework i18n yet, see below)
  - rate limiting on init/callback endpoints
  - documents existing `controller.user.disableSignup`/`view.auth.hideSignup` + `localAuthRestriction` (W-195) combinations per site mode in README (see design doc §12) — no new signup/login-visibility flags needed, framework already has what's required
  - found during implementation, added beyond original spec:
    - Microsoft Entra ID branded OIDC preset alongside Google (admin supplies the tenant-specific
      discovery URL; `openid-client`'s built-in Entra issuer-template handling reused as-is); known
      limitation documented (design doc Gap 5): Entra ID never emits `email_verified`, so only
      `sub-only` linking works for this preset until a future release adds `xms_edov` support —
      LinkedIn preset deferred to that same follow-up
    - `allowedDomains` per-provider restriction actually enforced server-side (was config-only
      through most of implementation)
    - JIT role selectors (`jitDefaultRoles` global + per-provider `jitRoles` override) exclude this
      site's admin-equivalent roles dynamically via `ConfigModel.getEffectiveAdminRoles()` (W-147),
      not a hardcoded `admin`/`root` list, backed by a new admin-only `assignable-roles` endpoint so
      the option is never shown-then-silently-stripped; both selectors render as the same `jpSelect`
      checkbox widget (previously the per-provider one was a bare native shift-click multiselect)
    - config save consolidated onto the framework's single page-level "Save Changes" button via the
      `onPluginConfigBeforeSave` hook (W-200), which also encrypts a newly-entered Client Secret —
      the custom provider-table renderer was rewritten for fully live, local add/edit/delete/reorder
      with inline validation, eliminating a "two Save buttons" usability gap found during manual
      testing (also fixed several renderer bugs found along the way: preset switching, stale
      endpoint fields surviving a preset switch, blank label/icon overriding preset defaults,
      `order: 0` coerced to `100`, stale index on delete, shallow-copied config object, inaccurate
      live-update hint text)
    - provider branding `icon` field accepts sanitized inline SVG in addition to a unicode/emoji
      glyph, consistently sized across the login page, admin provider table, and the user's
      Connected Accounts page
    - account-status checks aligned with `UserModel`'s real enum (`pending`/`suspended`/
      `terminated`/`inactive`), matching the centralized check added in W-201
    - `emailVerified` integration (W-198, released mid-implementation): `link-by-email` rejects a
      matched local account with `emailVerified: false`; every `jit-create`d account is stamped
      `emailVerified: true` since the IdP already vouched for it; email lookups normalized to
      lowercase to match `UserModel`'s new case-insensitive uniqueness
    - `jpulseVersion` corrected to `>=1.7.6` (design doc Gap 6) to reflect the actual hard
      dependency on the `onPluginConfigBeforeSave` hook (W-200) and `emailVerified`/unique-index
      primitives (W-198); `profileRequiredFields`'s "Nickname" option removed (design doc Gap 2 —
      selecting it produced an unresolvable validation error, since the profile-completion form
      never treated it as required)
- npm dependency: openid-client (~500KB with jose + oauth4webapi)
- security posture:
  - mandatory PKCE for all providers, even confidential clients
  - state one-time-use, 5-minute expiry
  - ID token: signature via JWKS, iss matches discovery, aud matches client_id, exp check, nonce match
  - only authorization code flow — no implicit, no resource owner password credentials
  - timing-safe compare for state/nonce
  - never log tokens, codes, or secrets
- deliverables:
  - webapp/utils/crypto-secrets.js (new framework file, found during spec review - see design doc §8):
    - generic secret-encryption helper (AES-256-GCM + `scrypt`), extracted from `auth-mfa`'s inline TOTP-encryption pattern so it's a genuinely shared primitive rather than duplicated a second time; `auth-mfa` itself left untouched (not retrofitted)
  - plugins/auth-oauth/plugin.json:
    - plugin manifest with globals (defaultLinkingStrategy, jitDefaultRoles, jitDefaultStatus)
    - `type: "custom"` field for `providers` with renderer `authOauth.renderProviders` (uses W-194)
  - plugins/auth-oauth/package.json:
    - openid-client dependency
  - plugins/auth-oauth/README.md, plugins/auth-oauth/docs/README.md:
    - dev + user docs, includes provider setup guides for Google, Okta, Keycloak, Azure Entra
  - plugins/auth-oauth/webapp/controller/oauthAuth.js:
    - hooks: onAuthGetLoginProviders, onAuthGetSteps, onAuthValidateStep (found during implementation: the JIT profile-completion step integrates with W-109's multi-step login flow via these two hooks, not a bespoke onUserSyncProfile/onAuthAfterLogin pair as originally sketched - see design doc §10)
    - api endpoints: providers, init, callback, user/providers, link, unlink, profile-draft, admin CRUD, test-connection
  - plugins/auth-oauth/webapp/model/oauthAuth.js:
    - `user.oauth` schema extension with W-107 adminCard/userCard metadata
  - plugins/auth-oauth/webapp/model/oauthProvider.js:
    - `authOauth_providers` collection CRUD
    - client_secret encryption at rest
  - plugins/auth-oauth/webapp/utils/providerRegistry.js:
    - preset definitions (google, microsoft, oidc, oauth2) with discovery URLs, default scopes
  - plugins/auth-oauth/webapp/utils/oauthClient.js:
    - openid-client wrapper: discovery caching, PKCE, JWKS
  - plugins/auth-oauth/webapp/utils/profileExtractor.js:
    - Stage A best-effort claim → user field mapping with fallbacks (given_name → name-split → preferred_username → email local-part)
  - plugins/auth-oauth/webapp/view/auth/oauth-profile-complete.shtml:
    - Stage B form for filling in missing firstName / lastName / nickName after JIT signup
  - plugins/auth-oauth/webapp/view/auth/oauth-error.shtml:
    - error landing page with a client-side reason-code → friendly-message map (no framework i18n yet)
  - plugins/auth-oauth/webapp/view/jpulse-plugins/auth-oauth.shtml:
    - user linked-accounts management (connect, disconnect, view)
  - plugins/auth-oauth/webapp/view/jpulse-common.js:
    - `authOauth.renderProviders` custom renderer (provider CRUD table for W-194); rewritten during
      implementation for fully live, local editing (add/edit/delete/reorder, inline validation)
      deferring all persistence to the page's single Save Changes button; added the `microsoft`
      preset entry, `jpSelect` widget integration for the per-provider role selector, an
      `attrEscape()` helper for safe HTML-attribute interpolation, and a `restoreSvgAttributeCase()`
      helper working around `sanitizeHtml()` lowercasing `viewBox`
  - plugins/auth-oauth/webapp/view/jpulse-common.css:
    - provider button styles, branding classes; SVG icon sizing/alignment across the login page,
      admin provider table, and Connected Accounts page; warning-box styling
  - plugins/auth-oauth/webapp/view/jpulse-navigation.js:
    - link to /jpulse-plugins/auth-oauth.shtml from user menu
  - plugins/auth-oauth/webapp/bump-version.conf:
    - version management config
  - plugins/auth-oauth/webapp/tests/unit/{controller,model,utils,view}/*.test.js:
    - covers the controller (incl. JIT creation, Stage A/B profile completion, admin CRUD, status
      enum, `allowedDomains`, `emailVerified` enforcement), both models, all utils modules
      (including the new `microsoft` preset), and the rewritten custom renderer (`view/`, new) - all
      framework/DB dependencies mocked, no live IdP calls
  - new API endpoint: `GET /api/1/auth-oauth/admin/assignable-roles` - this site's roles with
    admin-equivalent roles excluded, backs the JIT role selectors
  - i18n: deferred (found during implementation: no plugin-level i18n mechanism exists in the framework yet - `webapp/translations/*.conf` only loads framework/site strings, see design doc §"UI Components"); all plugin-facing strings are English-only for v1.0.0
  - published to github.com/jpulse-net/plugin-auth-oauth as v1.0.0
  - v1.0.1, 2026-07-31 (found post-publish, see design doc Gap 7): `webapp/view/jpulse-navigation.js`
    was never actually created despite being listed above - the linked-accounts page had no
    navigation entry anywhere in the UI for the entire v1.0.0 release; fixed by adding it, matching
    the `auth-mfa`/`hello-world` pattern (append a "Connected Accounts" entry to the user menu's
    jPulse Plugins section)
  - v1.0.2, 2026-08-01 (found live during bubblemap.net production config, see design doc Gap 8):
    the provider config form's "JIT: Override Roles"/"JIT: Status" fields rendered unconditionally,
    with no effect unless that provider's effective Linking Strategy is `jit-create` - fixed by
    gating both fields' visibility on the effective strategy, live as Linking Strategy is switched;
    5 new renderer tests, 5 pre-existing ones updated for the new gating
  - v1.0.3, 2026-08-01 (found live on bubblemap.net's first real Google login attempt, see design
    doc Gap 9): `computeRedirectUri()` and `apiCallback()`'s `currentUrl` both used `req.protocol`
    directly, which the framework never makes reliable behind a reverse proxy (`app.set('trust
    proxy', ...)` is never called, despite `trustProxy: true` being documented in
    `docs/deployment.md`/`templates/deploy/README.md` - a framework-level gap in its own right,
    filed separately as `W-203`, not fixed here) - caused a live `redirect_uri_mismatch` at
    Google's consent screen. Fixed by adding a `getRequestProtocol()` helper (X-Forwarded-Proto
    first, falling back to req.protocol, mirroring the existing `getClientIp()` pattern) used at
    both call sites; 3 new controller tests

### W-203, v1.7.7, 2026-08-02: infrastructure: trustProxy is a documented app.conf setting with zero implementation - req.protocol/req.ip/req.secure are all unreliable behind a reverse proxy
- status: ✅ DONE
- type: Bugfix
- objective: make Express's `trust proxy` setting actually work - `webapp/app.js` now calls
  `app.set('trust proxy', ...)` from a real config value - closing the gap between what the docs
  promised and what the code did
- discovered while: fixing W-197 Gap 9 (`plugins/auth-oauth`'s `computeRedirectUri()` sent Google
  an `http://` redirect_uri on `bubblemap.net`'s first live login attempt, a `req.protocol`
  behind-reverse-proxy bug) - traced one level further per this session's "root cause before
  fixes" debugging rule, since the plugin's own bug looked like it might be a symptom of a
  framework-level gap rather than a plugin-only mistake, which it was
- current gap (confirmed by repo-wide search, not assumption):
  - `docs/deployment.md` (line 135) and `templates/deploy/README.md` (line 89) both instructed
    site admins to set `trustProxy: true` in `site/webapp/app.conf` for reverse-proxy deployments,
    using an `app.trustProxy`/`app.port` example that didn't even match `app.conf`'s real structure
    (`port` actually lives under `system.port`, computed by `app.js`, not hand-set under `app`)
  - `webapp/app.js` never called `app.set('trust proxy', ...)` anywhere - confirmed via
    `rg -ni "proxy" webapp/app.js` returning zero matches
  - `trustProxy` wasn't defined in any config schema either (`bin/config-registry.js`,
    `webapp/model/config.js`) - not validated, not surfaced in the admin Config UI, and setting it
    in `app.conf` did precisely nothing
  - net effect on any deployment behind a TLS-terminating reverse proxy (the framework's own
    reference `templates/deploy/nginx.prod.conf`, which does correctly set `X-Forwarded-Proto` on
    every location block, and is the *standard* `npx jpulse setup` path, not a rare one): Express's
    `req.protocol` always resolved to `http`, `req.secure` was always `false`, and `req.ip` returned
    the proxy's own address rather than the real client's - all silently, with no error or warning
    anywhere
  - `webapp/utils/common.js` (lines ~1424-1433) already works around the `req.ip` half of this by
    reading `X-Forwarded-For`/`X-Real-IP` directly instead of trusting `req.ip` - so the framework
    has an established, working pattern for IP, just never extended it (or real `trust proxy`
    support) to protocol/secure. `plugins/auth-oauth`'s `getClientIp()` independently mirrors that
    same `common.js` IP pattern; its sibling `getRequestProtocol()` (new in W-197 v1.0.3) is the
    same idea applied to protocol, but scoped to that one plugin's two call sites, not
    framework-wide
  - no other `req.protocol`/`req.secure` usage exists anywhere in `webapp/` core today (confirmed
    via search) - this hadn't visibly broken anything in the framework itself yet, only in
    auth-oauth's new code, precisely because nothing in core currently computes an absolute URL or
    makes a security decision from request-derived scheme; the risk was latent, for the next
    feature that does either
- design decisions (locked in):
  - config key is `middleware.trustProxy`, not the previously-documented `app.trustProxy` - `app`
    is reserved for jPulse/site branding metadata (see its own "DO NOT CHANGE" comments in
    `webapp/app.conf`); `middleware` already holds every other Express-level setting (`cors`,
    `session`, `bodyParser`, `setHeaders`), so this is the architecturally consistent home. Nothing
    could have relied on the old `app.trustProxy` location's behavior, since it never did anything.
  - value is passed straight through to `app.set('trust proxy', ...)` unmodified, so it supports
    every value type Express itself accepts (boolean, hop count, trusted IP/CIDR string or array) -
    not just a boolean - for admins who need to trust only their own edge proxy rather than any
    `X-Forwarded-*` header blindly - a bare header-reading helper (the plugin's stopgap) can't offer
    that same protection
  - default value is split by layer, decided with the user: `webapp/app.conf` (framework core
    default, ships with every install) stays `false` - matching Express's own default and the
    previous de facto behavior, since the framework itself doesn't know how a given site will be
    deployed and must not silently start trusting client-supplied headers on a directly-exposed
    server. `templates/webapp/app.conf.tmpl` (used by `npx jpulse configure` for every new site) and
    `site/webapp/app.conf.tmpl` (the manual-copy starter template) both default to `true` instead,
    since the framework's standard, documented deployment path always terminates TLS at nginx
    (`docs/deployment.md`'s "Deployment Architecture") - so every newly configured site gets a
    correct, working default with zero extra steps, while the framework package itself remains
    safe-by-default for the unknown case
  - `plugins/auth-oauth`'s own `getRequestProtocol()` (W-197 v1.0.3) is deliberately left in place
    rather than simplified to bare `req.protocol` - the plugin's `jpulseVersion` floor (`>=1.7.6`)
    predates this fix, so older-but-still-compatible framework installs (or any site admin who
    hasn't set `middleware.trustProxy`) still need the plugin's own header-reading fallback;
    complementary defense-in-depth, not redundant - a follow-up cleanup once this is broadly
    deployed is possible but not bundled into this item
- deliverables:
  - `webapp/app.conf`: added `middleware.trustProxy: false` (framework default) with an inline
    comment explaining the setting and its accepted value types
  - `webapp/app.js`: `app.set('trust proxy', appConfig.middleware.trustProxy)`, called immediately
    after `express()` creation, before any middleware/route that might read those properties
  - `templates/webapp/app.conf.tmpl`, `site/webapp/app.conf.tmpl`, `site/webapp/app.conf` (this
    repo's own dogfooding site, which also runs `jpulse-net-prod` behind nginx): all three set
    `middleware.trustProxy: true` with an explanatory comment
  - `docs/deployment.md`: fixed the broken `app.trustProxy`/`app.port` example in "Custom Web
    Server Setup" to the correct `middleware.trustProxy: true`; added a callout in "Deployment
    Architecture" explaining why the standard nginx path needs this and that
    `npx jpulse configure` sets it by default
  - `templates/deploy/README.md`: corrected the config key/path in "Custom Deployment Scenarios"
- test / verify:
  - all 4 edited config files verified to parse correctly (`node -e` with `new Function(...)`,
    matching the framework's own config-loading mechanism), confirming
    `webapp/app.conf`→`middleware.trustProxy === false` and the 3 site-facing
    templates/config→`middleware.trustProxy === true`
  - full unit/integration suite passes: 123 suites / 3009 tests via `npx jest --runInBand` (a
    plain parallel `npx jest` run shows spurious cross-test failures unrelated to this change - a
    pre-existing test-isolation artifact of this repo's suite, not a regression); user independently
    confirmed via `bin/test-all.js`: 3038 passed, 0 failed, 0 skipped across CLI/unit/integration
  - no dedicated unit test added for the `app.set('trust proxy', ...)` call itself - `webapp/app.js`
    is a top-level script with no existing test harness that boots it end-to-end (confirmed no test
    anywhere imports it directly), and the 1-line change delegates entirely to Express's own,
    already-well-tested API with no custom logic of ours to exercise
- benefits: closes a documented-but-nonfunctional config option; removes a latent trap for any
  future framework feature that computes an absolute URL, does IP-based rate limiting/logging, or
  makes an HTTPS-only security decision from the request object, on any reverse-proxied deployment
  (i.e. most production deployments, per the framework's own nginx templates); fixed the real
  `redirect_uri_mismatch` bug class at its root, one layer below the auth-oauth plugin's own W-197
  v1.0.3 stopgap fix

### W-204, v1.7.8, 2026-08-02: auth: rate limit login endpoint (DoS/brute-force protection)
- status: ✅ DONE
- type: Bugfix
- objectives:
  - give `/api/1/auth/login` real, working rate limiting - both a per-IP app-level control (new)
    and a fix to the reference nginx config's existing, but silently non-functional, stricter zone
    for this exact endpoint - closing a real DoS/credential-stuffing/brute-force gap ahead of
    W-202 (per-account `locked` status), which needs IP-based limiting as a complementary control
    anyway
- prerequisites:
  - Redis cache infrastructure (`RedisManager.cacheCheckRateLimit()`) - already shipped
  - W-203 (`middleware.trustProxy`) - recommended so IP-keyed limiting sees the real client IP
    behind a reverse proxy; not a hard dependency (fails open / still works on direct-exposed
    servers)
- rationale:
  - discovered while scoping W-202: `auth.js`'s `login()` had zero rate limiting at the app layer
    (unlike the auth-oauth plugin's `apiInit`/`apiCallback`, which already use
    `RedisManager.cacheCheckRateLimit()`)
  - second, independent gap: the reference nginx `login` zone's
    `location ~ ^/(login|signup|auth)/` never matched `/api/1/auth/login` or `/api/1/user/signup`
    (credential-submission POSTs fell through to the ~100x looser generic `/api/` zone), and the
    `login|signup` alternatives never matched anything real either (framework pages live only under
    `/auth/*`)
  - design decisions (locked in):
    - IP-keyed (endpoint/DoS protection), not identifier-keyed (account lockout is W-202)
    - applies to the whole `login()` method (all W-109 multi-step posts), not just `'credentials'`
    - reuses `RedisManager.cacheCheckRateLimit()` / path `controller:auth:rateLimit:login`
    - fails open if Redis/RedisManager unavailable - never lock every user out on a broken cache
    - configurable via `appConfig.controller.auth.loginRateLimit` (default `true`/20/300)
    - nginx: single regex location covering `/auth/` pages + the two API paths (no third
      duplicated `proxy_pass` block; dropped the dead `login|signup` alternatives)
  - benefits: closes a previously-undetected gap on both the app layer and the documented
    reference deployment; complementary to (not a substitute for) W-202's future per-account
    `locked` status; directly relevant to jPulse's enterprise/gated-community focus
- features:
  - `POST /api/1/auth/login` returns `429` with a translated message, `RATE_LIMITED` code, and
    `retryAfter` (seconds) once a single IP exceeds 20 requests / 5 minutes across the whole login
    flow; fires `onAuthFailure` (`reason: 'RATE_LIMITED'`)
  - reference nginx `login` zone (5 req/min, burst 5) now actually applies to real login/signup
    credential submissions, not just page loads
  - site-admin docs give a clear two-layer picture (nginx zones vs. app-level Redis limiters) of
    what is and isn't protected
- deliverables:
  - `webapp/controller/auth.js`:
    - `login()`: rate-limit check right after `logRequest()`, before the `disableLogin` check
  - `webapp/app.conf`:
    - new `controller.auth.loginRateLimit` (`enabled: true`, `maxAttempts: 20`,
      `windowSeconds: 300`)
  - `webapp/translations/en.conf`, `webapp/translations/de.conf`:
    - new `controller.auth.rateLimited` string
  - `templates/deploy/nginx.prod.conf`:
    - `login` zone location regex:
      `^(/auth/|/api/1/auth/login$|/api/1/user/signup$)` (covers auth pages + credential API
      posts; dropped dead `login|signup` top-level alternatives)
  - `docs/security-and-auth.md`:
    - rewritten Rate Limiting section (two-layer framing, nginx zones table, app-level table);
      fixed Login error-code list (pre-W-201 `ACCOUNT_LOCKED`/`ACCOUNT_DISABLED` → real
      per-status codes + `429`/`RATE_LIMITED`)
  - `docs/api-reference.md`:
    - login endpoint error list: same W-201 correction + new `429`/`RATE_LIMITED`
  - `docs/deployment.md`:
    - new troubleshooting entry for rate-limiting / 429s (both layers)
  - `webapp/tests/unit/controller/auth-controller.test.js`:
    - `W-204: login rate limiting` block (4 tests: under-limit, over-limit + `onAuthFailure`,
      `enabled: false` skip, fail-open when `RedisManager` absent)
- tests:
  - full unit suite passes: 123 suites / 3013 tests (`npx jest --runInBand`)
  - manually verified live via `npm start` + real Redis: 25 rapid `POST /api/1/auth/login`
    requests from the same IP → first 20 return `401 INVALID_CREDENTIALS`, requests 21-25 return
    `429 RATE_LIMITED` with `retryAfter: 299`; confirmed Redis key TTL/counter and that a fresh
    request succeeds again after clearing it
- tech-debt:
  - `/api/1/user/signup` is covered by the nginx `login` zone but still has no app-level
    `cacheCheckRateLimit()` backstop (unlike login) - candidate for a small follow-up
  - no generic app-level `/api/*` rate-limit middleware yet - most other endpoints rely solely on
    nginx's `api` zone when deployed behind the reference config

### W-205, v1.7.9, 2026-08-07: auth: signup with email confirmation
- status: ✅ DONE
- type: Feature
- objectives:
  - confirm valid email address, needed to prevent account takover with auth-oauth SSO
  - make it optional with an appConfig setting
- prerequisits:
  - W-109, v1.3.10, 2025-12-08: auth: multi-step login flow - onAuthGetWarnings hook
  - W-195, v1.7.1, 2026-07-26: auth: jPulse enhancements for external auth plugins - introduced completeExternalAuth()/_completeLoginSession() split
  - W-197, v1.0.3, 2026-08-02: auth-oauth plugin: single sign-on with auth servers like Okta, Google, Apple
- working doc: docs/dev/design/W-205-auth-email-confirmation.md
- features:
  - `appConfig.controller.user.emailVerification`: `'off'` | `'nag'` | `'required'` (default). Read
    live on every request via `UserModel.getEmailVerificationPolicy()`, never cached/baked in at
    startup, so a config change (or the SMTP safety valve below) takes effect immediately, no
    restart
  - `'required'` injects `email-verify` as a blocking step into the existing W-109 multi-step login
    flow (`AuthController._getRequiredSteps()`) - a fresh signup is auto-sent a verification email
    and must complete it (code entry or the mailed link) before the session completes; `'nag'`
    lets login complete and shows a dismissible toast with a resend link instead
  - dual verification path, one shared token pair per pending verification: a 6-digit code (typed
    in-flow) and a mailed link (`GET /api/1/user/email-verify/confirm?token=...`, no auth
    required, redirect-only). The link can finish a login started in a different browser/device -
    the originating tab detects this via `GET /api/1/auth/pending-status` polling (own endpoint,
    deliberately outside both the login rate limiter and nginx's `login` zone, since a poll
    guesses no secret), which shares the exact `nextStep`/`page` contract as a code submission
  - resend with app-level rate limiting (Redis-backed, fail-open): 3 sends / 10 min and 5 verify
    attempts / 15 min, per account - independent of the nginx `login` zone
  - `emailVerified` (boolean) + `emailVerifiedAt` (date, nullable) on the base user schema.
    `emailVerifiedAt: null` alongside `emailVerified: true` unambiguously means grandfathered
    (backfilled) rather than actually proven - only `_completeEmailVerification()` stamps a real
    date, on genuine proof of inbox ownership
  - one-time, idempotent startup backfill (`UserModel.ensureIndexes()`): any pre-existing account
    with an absent `emailVerified` is set to `true`/`emailVerifiedAt: null`, replacing W-198's
    original "absent reads as verified" convention with an explicit, queryable state
  - SMTP safety valve: `'required'` transparently degrades to `'nag'` at runtime whenever
    `EmailController.isConfigured()` is false, so a not-yet-configured mail server can never lock
    signups out; a loud one-time warning is still logged at startup
    (`checkEmailVerificationSafety()`, `webapp/utils/bootstrap.js`) so the gap isn't silent;
    resumes full enforcement immediately once SMTP is configured
  - admin controls: verified/unverified badge in `admin/users.shtml`'s email cell; `emailVerified`
    checkbox + read-only "verified on" line in `admin/user-profile.shtml`; both hidden entirely
    when the policy is `'off'`. Admin changing a user's `email` resets `emailVerified`/
    `emailVerifiedAt` by default (an admin-typed address is a belief, not proof) unless the same
    request explicitly asserts `emailVerified: true` - sends an informational email (with a verify
    link) to the new address and a security alert to the old one; response includes
    `emailVerifiedReset` so the admin UI can explain a checkbox that came back unchecked
  - user-facing: verification status line in Settings (hidden when policy is `'off'`); new shared
    `/auth/email-verify.shtml` page serving three contexts with one URL - mid-login (`pendingAuth`),
    authenticated self-service (`'nag'` mode), and the confirm link's own
    `?status=verified|expired|invalid` landing
  - found during implementation, folded in beyond original spec:
    - fixed the hardcoded `preferences.language: 'en'` at signup (unrelated pre-existing bug found
      while wiring recipient-language email delivery) - signup now honors the browser-negotiated
      language like every other new-session default
    - new `EmailController.sendEmailFromTranslation(req, { user, key, context, to, cc, bcc,
      replyTo, from })`: the whole email (envelope headers + body) lives in one translation key,
      unix-mail style (`Subject: ...` header line(s), blank line, body) - sent in the recipient's
      language via `i18n.translateForUser()`. Superseded an earlier, file-based
      `webapp/static/assets/email/*.tmpl` approach (Phase 5) that turned out broken twice over:
      `webapp/static/` is served raw by nginx in production with no `.tmpl` filtering (framework
      template files would have been readable in prod), and the `templatePath` values passed to
      `PathResolver.resolveAsset()` were missing the required `assets/` prefix, so all three sends
      were silently failing (`TEMPLATE_ERROR`)
    - `EmailController.ALLOWED_EMAIL_HEADERS` broadened from `Subject`-only to the common envelope
      headers (`Subject`/`To`/`Cc`/`Bcc`/`Reply-To`/`From`, case-insensitive), each individually
      overridable via a matching `sendEmailFromTranslation()` option - a translation-supplied
      header is always just a default; none of this item's three emails need more than `Subject:`
      today, added for future flexibility. Header values are still substituted then stripped of
      `\r`/`\n` before use, so a `{{token}}` context value can never inject a fake header
    - removed `EmailController`'s auto-derived-HTML branch (escape → linkify → `<br/>`) entirely,
      at both call sites (`sendEmail()`/`apiSend()`) - emails are text-only unless explicit HTML is
      supplied, simpler and more predictable than auto-derived HTML
    - fixed a latent `i18n.js` bug: `_translate()`'s substitution fell back to the literal
      `{{token}}` placeholder for legitimately falsy values (e.g. an empty `firstName`); extracted
      a new `i18n.substitute()` helper with the corrected `p1 in context ? context[p1] : match`
      logic, reused by `sendEmailFromTranslation()`
    - new `CommonUtils.isSafeRedirectUrl(req, url)` (server-side counterpart to
      `jPulse.url.isInternal()`, which never had one since no server code previously acted on a
      redirect value) and `CommonUtils.maskEmail(email)` (`jane@example.com` →
      `ja***@example.com`) for the toast/resend UI
    - the mailed confirm link carries no `redirect` param at all - the eventual destination rides
      `session.pendingAuth.redirect`, captured once (and validated with `isSafeRedirectUrl()`) at
      the credentials step or SSO callback, re-validated again immediately before the confirm
      route's redirect
    - found during manual testing: the original cross-device poll shared `POST /api/1/auth/login`
      with real credential submissions, so it silently inherited both the Node-level per-IP
      `loginRateLimit` and (in production) nginx's 5-req/min `login` zone - a few minutes of a
      waiting tab's background polling was enough to trip `RATE_LIMITED`, with no client-side
      handling of that error (indefinite silent re-polling). Fixed by moving the poll to its own
      `GET /api/1/auth/pending-status` endpoint (no app-level rate limit; relies on nginx's
      generic `api` zone only, since a status poll guesses no secret) and adding client-side
      backoff (stop auto-polling after 3 consecutive failures, fall back to the manual button)
    - found during manual testing: a same-session second tab/window (e.g. two tabs of the same
      incognito profile) that completed login via the confirm link left the first tab's poll
      seeing no `pendingAuth` (already consumed) and reporting a misleading `NO_PENDING_AUTH`
      "please sign in again", even though that browser's shared session was already
      authenticated. Fixed: `pendingStatus()` now checks `req.session.user?.isAuthenticated`
      first and reports login-complete immediately if so
    - found during manual testing: the MFA-not-enabled nag (and any other `onAuthGetWarnings`
      toast) never reached the user when login completed via a plain server redirect -
      `confirmEmailVerify()` and the pre-existing `completeExternalAuth()` (OAuth/LDAP/SAML)
      both discarded `_completeLoginSession()`'s `warnings`, and the client's only toast queue
      (`jPulse.url.redirect(url, {toasts})`) is `sessionStorage`-based, unreachable from a
      server-issued `302`. Fixed generically with new `CommonUtils.appendToastsToUrl(url,
      warnings)` (base64-encoded `toasts` query param, no-op when empty), consumed by
      `jpulse-common.js`'s `dom.ready()` bootstrap alongside the existing `sessionStorage` queue
      and stripped from the address bar via `history.replaceState` right after showing
    - found during manual testing: the fix above still didn't surface the nag in either window -
      two more bugs, one per prior fix: (a) `confirmEmailVerify()`'s destination often defaults
      to `/`, and `webapp/routes.js`'s `GET /` handler issues its own hard-coded
      `res.redirect('/home/')`, discarding the `toasts` query string along with everything else;
      now forwards its incoming query string onto `/home/`. (b) the *waiting* tab's
      `pendingStatus()` poll is a separate HTTP request from the confirm-link tab's
      `_completeLoginSession()` call, so it never saw that call's `warnings` return value at all;
      `_completeLoginSession()` now also stashes non-empty warnings onto
      `req.session.pendingWarnings` (self-cleaning - set or deleted on every call, never
      accumulates), which the already-authenticated shortcut in `pendingStatus()` drains and
      returns as `warnings` in its JSON response
- deliverables:
  - `webapp/model/user.js`:
    - `emailVerified`/`emailVerifiedAt` schema fields; `issueEmailVerification()`,
      `verifyEmailByToken()`, `verifyEmailByCode()`, `_completeEmailVerification()`,
      `sendEmailChangedNotice()`/`sendEmailChangedAlert()`, `getEmailVerificationPolicy()`;
      `ensureIndexes()` absent-field backfill
  - `webapp/controller/auth.js`:
    - `_getRequiredSteps()` email-verify step injection (priority-ordered); `login()` handling for
      `{ step: 'email-verify', code }` and `{ resend: true }`; nag toast in
      `_completeLoginSession()` (also stashes non-empty warnings onto
      `req.session.pendingWarnings`, self-cleaning); `pendingStatus()` (cross-device poll, its own
      endpoint - split out of `login()` after the shared endpoint was found to hit the login rate
      limiter/nginx zone during manual testing; checks `req.session.user?.isAuthenticated` first
      for a same-session second tab that already completed login elsewhere, draining
      `session.pendingWarnings` into the response in that case) plus shared
      `_getExpectedStep()`/`_pendingAuthTimeoutMs()` helpers; `completeExternalAuth()` now routes
      its final redirect through `CommonUtils.appendToastsToUrl()`
  - `webapp/controller/user.js`:
    - `confirmEmailVerify()` (now also routes its final redirect through
      `CommonUtils.appendToastsToUrl()`), `emailVerify()`, `emailVerifySend()`; `signup()`
      auto-send; `update()` admin email-change reset (+ `emailVerifiedReset` response flag)
  - `webapp/controller/email.js`:
    - `sendEmailFromTranslation()`, broadened `ALLOWED_EMAIL_HEADERS`, `_parseEmailMessage()`
      header parsing, header-injection guard; derived-HTML branch removed
  - `webapp/controller/markdown.js`:
    - unrelated pre-existing bug surfaced by the `i18n.substitute()` fix (was passing `baseDir`
      instead of the actual `namespace` variable into its own error message) - corrected while
      updating the now-accurately-substituted test expectation
  - `webapp/utils/bootstrap.js`:
    - `checkEmailVerificationSafety()` (non-mutating startup warning)
  - `webapp/utils/common.js`:
    - `isSafeRedirectUrl()`, `maskEmail()`, `appendToastsToUrl()` (post-login warnings carried
      across a plain server redirect - `sessionStorage`-based toast queue is unreachable from Node)
  - `webapp/utils/i18n.js`:
    - `substitute()` (extracted, falsy-value bug fixed); `translateForUser()` used for
      recipient-language email delivery
  - `webapp/routes.js`:
    - `GET /api/1/user/email-verify/confirm` (public), `POST /api/1/user/email-verify` and
      `POST /api/1/user/email-verify/send` (authenticated), `GET /api/1/auth/pending-status`
      (public); `GET /`'s hard-coded `res.redirect('/home/')` now forwards its incoming query
      string, so a `CommonUtils.appendToastsToUrl()` `toasts` param survives this second redirect
  - `webapp/app.conf`:
    - `controller.user.emailVerification` (default `'required'`);
      `controller.user.emailVerification` added to `handlebar.contextFilter.alwaysAllow`
  - `webapp/translations/en.conf`, `webapp/translations/de.conf`:
    - `model.user.emailVerify`/`emailChangedNotice`/`emailChangedAlert` (full unix-mail-style
      messages); `controller.auth.emailVerify*`/`controller.user.emailVerify.*` UI/error strings
  - `webapp/view/auth/email-verify.shtml` (new):
    - shared page for mid-login, self-service nag, and confirm-link landings; cross-device polling
      (8s interval against `GET /api/1/auth/pending-status`, stops after 3 consecutive failures
      and falls back to the manual "Check now" button)
  - `webapp/view/auth/login.shtml`:
    - `nextStep === 'email-verify'` redirect case
  - `webapp/view/jpulse-common.js`:
    - `dom.ready()` bootstrap now also decodes/shows/strips a `toasts` URL query param (the
      `CommonUtils.appendToastsToUrl()` counterpart to the existing `sessionStorage` toast queue),
      via a shared `showQueuedToasts()` helper used by both delivery mechanisms
  - `webapp/view/user/settings.tmpl`, `webapp/view/user/index.shtml`:
    - verification status line + styles (hidden when policy is `'off'`)
  - `webapp/view/admin/users.shtml`:
    - verified/unverified badge in the email cell
  - `webapp/view/admin/user-profile.shtml`:
    - `emailVerified` checkbox + read-only "verified on" line
  - `webapp/tests/unit/model/user-email-verification.test.js`,
    `webapp/tests/unit/model/user-email-verification-policy.test.js`,
    `webapp/tests/unit/controller/email-from-translation.test.js`,
    `webapp/tests/unit/controller/user-email-verify-endpoints.test.js` (all new), plus extended
    `auth-controller.test.js`, `email-controller.test.js`, `bootstrap.test.js`,
    `user-uniqueness-db.test.js`, `markdown.test.js`, `email-api.test.js`,
    `common-utils.test.js`:
    - full unit coverage for the above (rate limiting, TTLs, policy degradation, backfill
      idempotency, admin reset flow, header parsing/overrides, cross-device polling, same-session
      poll shortcut + `pendingWarnings` stash/drain, `appendToastsToUrl()` round-trip incl.
      non-ASCII text); manual end-to-end send/verify/resend/expiry, and the `GET /` query-string
      passthrough, left to manual testing
  - `docs/security-and-auth.md`, `docs/api-reference.md`:
    - "Email Verification" sections (policy modes, SMTP safety valve, grandfathering, admin
      email-change reset, endpoints, rate limits)

### W-206, v1.7.10, 2026-08-09: user: reset password
- status: ✅ DONE
- type: Feature
- objectives:
  - ability for user to reset password by email in case forgotten
- prerequisits:
  - W-205, v1.7.9, 2026-08-07: auth: signup with email confirmation - every primitive reused here
    (Redis-stored bcrypt-hashed token, `sendEmailFromTranslation()`, per-account limiter shape); its
    "Out of Scope" section named password reset as the intended next consumer
  - W-109, v1.3.10, 2025-12-08: auth: multi-step login flow - the `nextStep`/`page` contract the
    reset page speaks, and the step injection that keeps MFA in front of the post-reset auto-login
  - W-201, v1.7.5, 2026-07-30: auth: account-status enforcement centralized in `login()` - the
    reason the confirm endpoint has to re-check status itself before any session is created
  - W-195, v1.7.1, 2026-07-26: auth: jPulse enhancements for external auth plugins -
    `hasLocalPassword`, `localAuthRestriction`, `completeExternalAuth()`/`_completeLoginSession()`
- working doc: docs/dev/design/W-206-user-password-reset.md
- features:
  - turns the login page's placeholder "Forgot password?" into a real flow - request, mailed link,
    new-password form, signed in - ending the framework's last "contact your administrator" dead end
    in the local-auth story. New `/auth/reset-password.shtml`, one page with six states (`request`,
    `sent`, `setPassword`, `expired`, `done`, plus server-rendered `unavailable` when the feature is
    off or SMTP is unconfigured) following `email-verify.shtml`'s `showState()` structure, so there
    is one page to build, translate, and learn - bookmarks and stale mailed links land somewhere
    sensible instead of a half-broken form
  - four endpoints on `UserController` under the `/api/1/user/password-reset*` namespace: request
    (uniformly generic response), a read-only verify probe that never consumes, confirm (the token
    *is* the credential), and an admin send
  - three deliberate differences from W-205's email verification, each for a specific reason: (a) the
    mailed URL points at a *page*, not an API route, so a mail-scanner prefetch (Outlook Safe Links
    and friends) cannot burn a single-use token before the human sees the form - GET stays safe and
    idempotent, the token is consumed only by the POST carrying a new password; (b) link only, no
    6-digit code - a reset needs a form either way, so a code would just be a second route to the
    same page; (c) 1-hour TTL instead of 24, since this link grants account takeover, not a flag flip
  - auto-login after a successful reset (the "don't make me think" call), but routed through the
    W-109 machinery rather than around it: the confirm endpoint rebuilds `pendingAuth` and runs
    `_getRequiredSteps()`, so MFA and any plugin step still gate the session, and only
    `status: 'active'` gets a session at all. Inbox access is not a second factor
  - a successful reset proves inbox ownership, so it sets `emailVerified`/`emailVerifiedAt` -
    otherwise W-205's `'required'` mode would immediately mail a second credential asking for proof
    just collected
  - policy in the controller, mechanism in the model, per W-201's rule as stated in
    `UserModel.authenticate()`'s own doc comment: `localAuthRestriction`, `hasLocalPassword` and
    `status` are read in exactly one place, `UserController._classifyPasswordReset()` →
    `{ verdict, reason }` with verdict `'issue'` | `'ssoNotice'` | `'silent'` (`reason` names the
    refusal for the admin path; site-wide `disableLogin` is checked in the endpoints before lookup,
    matching `login()`). Both the public and the admin path call the classifier and differ only in
    how they *report* its verdict, which is what keeps the two from drifting apart
  - who can reset: SSO-provisioned accounts (`hasLocalPassword: false`) and accounts a
    `localAuthRestriction` policy covers get an explainer email naming how they actually sign in,
    never a link (consistent with W-197's in-session Set Password position); `suspended`/`terminated`
    get nothing at all; `pending`/`inactive` can reset but get no session and are told exactly why
    they still can't sign in
  - enumeration protection on the public path: one generic response for every outcome including "no
    such account", a detached send so response timing doesn't leak existence, and a "check your mail"
    screen that echoes the identifier the user typed rather than any stored address
  - rate limits, Redis-backed and fail-open: 3 sends / 10 min and 5 confirm attempts / 15 min per
    account, plus a config-driven 10 requests / 5 min per IP - the only limiter that can bound
    enumeration of accounts that don't exist, since there is no userId to key a per-account limit on.
    `retryAfter` is normalized to seconds at the boundary (W-204's convention); the IP-limit toast
    uses `controller.user.passwordReset.rateLimited`, not the login string
  - `appConfig.controller.user.disablePasswordReset` - one flag plus a `contextFilter.alwaysAllow`
    entry, following W-195/W-205 rather than the older `disableX`/`hideX` pair that lets the UI and
    the server disagree - and a live `UserController.isPasswordResetAvailable()` that also refuses
    when SMTP is unconfigured (the default state of a fresh install). Empty `smtpServer` is *not*
    configured (no silent `localhost` fallback; both `smtpServer` and `adminEmail` required), and
    `EmailController.reinitialize()` on config save makes clear/set take effect on the next call with
    no restart. The login page hides the link, the reset page shows `unavailable`, and the admin
    Security send button is disabled whenever the feature is unavailable
  - every other password-write path invalidates an outstanding reset token: self-service
    `changePassword()` and admin `update()`; admin Set Password also stamps `hasLocalPassword: true`,
    so an SSO-JIT account given a real password is no longer misclassified as "no local password"
  - admin-initiated send: `📧 Email password reset link` joins `🔑 Set Password` in
    `admin/user-profile.shtml`'s Security panel, complementing W-174's override rather than replacing
    it (the mailed link for a user who can read their mail, Set Password for an urgent lockout or an
    unreachable mailbox). Honest responses, not the generic one - the masked recipient address, the
    specific refusal reason, or a real SMTP failure (`awaitSend: true`, `503 EMAIL_SEND_FAILED`,
    token discarded on failure); per-account send limiter bypassed; every send logged with the acting
    admin's username; the button pre-disabled with an explanatory title for a user the classifier
    would refuse *or* when the feature itself is unavailable, so the verdict shows before the click
    rather than after
  - folded in from a review of W-205's *implementation*, since this item would otherwise inherit or
    copy both:
    - `AuthController.beginAuthenticatedSession()` - a public entry point for finishing a login
      started outside `login()`, with `_getRequiredSteps()`/`_completeLoginSession()` staying private
      behind it. W-205 reasonably declined a wrapper at two callers; this item makes three, and the
      pendingAuth-reconstruction rule it centralizes is precisely the MFA-bypass risk.
      `UserController.confirmEmailVerify()` migrates onto it, removing a second module's reach for
      underscore-prefixed methods; `login()`/`completeExternalAuth()` (same module) are untouched.
      Also takes `startTime` and returns `data`, and stamps a fresh `pendingAuth.createdAt` so a mail
      round-trip is no longer charged against the next step's window
    - W-119's i18n usage audit extended to `webapp/model` and taught the `key:` form used by
      `sendEmailFromTranslation()` plus `translateForUser()` - it previously scanned views and
      controllers only and matched `global.i18n.translate(` calls, so every email body in the
      framework was unchecked. Verified low-risk before adopting: `webapp/model/**` has no
      `global.i18n.translate()` calls and its namespace-rooted `key:` references are present in
      `en.conf`
  - companion fix in the separate `auth-mfa` plugin (not part of this framework commit):
    `onAuthGetSteps` now sets `page: '/auth/mfa-verify.shtml'` so OAuth/`completeExternalAuth()`
    (and password-reset confirm) show the MFA UI instead of falling back to login with no MFA page
- deliverables:
  - `webapp/model/user.js`:
    - `issuePasswordReset()`, `verifyPasswordResetToken()`, `resetPasswordByToken()`,
      `sendPasswordResetSsoNotice()`, `sendPasswordChangedNotice()`, `invalidatePasswordReset()`,
      both per-account limiters - mechanism only, no status/restriction/`hasLocalPassword`/
      availability checks; placed beside the W-205 email-verification block whose shape they follow;
      `issuePasswordReset()` supports `awaitSend` for the admin path
  - `webapp/controller/user.js`:
    - `_classifyPasswordReset()` → `{ verdict, reason }`, `isPasswordResetAvailable()`, and the four
      endpoints; `invalidatePasswordReset()` calls added to `changePassword()` and `update()`;
      admin Set Password / password writes stamp `hasLocalPassword: true`;
      `confirmEmailVerify()` migrated onto `AuthController.beginAuthenticatedSession()`
  - `webapp/controller/auth.js`:
    - `beginAuthenticatedSession()` (public; `_getRequiredSteps()`/`_completeLoginSession()` become
      private implementation behind it, no status gate of its own - same contract
      `completeExternalAuth()` already documents)
  - `webapp/controller/email.js`:
    - empty `smtpServer` no longer falls back to `localhost`; `isConfigured()` requires both
      `smtpServer` and `adminEmail`; `reinitialize()` + `controller:config:data:changed` subscription
      so Admin → Site Configuration clear/set takes effect live
  - `webapp/controller/handlebar.js`:
    - `passwordResetAvailable` context value in `_buildInternalContext()` for
      `/auth/login.shtml`, `/auth/reset-password.shtml`, and `/admin/user-profile.shtml`, so those
      pages hide or disable the affordance without duplicating the server's availability logic
  - `webapp/routes.js`:
    - `POST /api/1/user/password-reset`, `GET /api/1/user/password-reset/verify`,
      `POST /api/1/user/password-reset/confirm` (all public),
      `POST /api/1/user/password-reset/send` (admin) - all registered ahead of `/api/1/user/:id`
  - `webapp/app.conf`:
    - `controller.user.disablePasswordReset` (default `false`), `controller.user.passwordResetRateLimit`
      (mirroring W-204's block), plus `controller.user.disablePasswordReset` on
      `handlebar.contextFilter.alwaysAllow`
  - `webapp/translations/en.conf`, `webapp/translations/de.conf`:
    - `model.user.passwordReset`/`passwordResetSso`/`passwordChanged` (full unix-mail-style
      messages); one `controller.user.passwordReset.*` object for all four endpoints' strings
      (including `unavailable` and `rateLimited`); `view.auth.resetPassword.*` (incl. unavailable
      state); `view.admin.userProfile.*` button/guidance strings. Status and restriction refusals
      reuse the existing `controller.auth.*` wording rather than being re-authored, so one situation
      reads the same whichever page the user is on. Removes `view.auth.login.forgotPasswordMessage`
      (the placeholder toast)
  - `webapp/view/auth/reset-password.shtml` (new):
    - the six-state page; success-with-session never renders a state, it redirects
  - `webapp/view/auth/login.shtml`:
    - `showForgotPassword()` placeholder and its toast replaced by a real link, wrapped in
      `{{#if passwordResetAvailable}}`
  - `webapp/view/admin/user-profile.shtml`:
    - Security-panel button (disabled when the feature is unavailable or the classifier would
      refuse), the guidance line explaining when to use it versus Set Password, a confirmation step
      (it mails a real person), and outcome-specific toasts including SMTP failure
  - `webapp/tests/unit/model/user-password-reset.test.js`,
    `webapp/tests/unit/controller/user-password-reset-endpoints.test.js`,
    `webapp/tests/unit/controller/auth-begin-session.test.js` (all new), plus extended
    `webapp/tests/unit/controller/email-controller.test.js`,
    `webapp/tests/unit/controller/user-email-verify-endpoints.test.js` (mocks retargeted onto
    `beginAuthenticatedSession()` - behavior preserved, assertions updated for the facade),
    `webapp/tests/unit/i18n/i18n-usage-audit.test.js` + `utils/key-extractor.js`:
    - classifier, availability, enumeration, MFA-still-required, suspended-gets-no-session, admin
      honesty/`awaitSend`/`EMAIL_SEND_FAILED`, empty-smtp/`reinitialize`, and the facade itself.
      Deliverability/rendering in real mail clients, a Safe-Links-style prefetch followed by a real
      click, and the cross-device round trip left to manual testing
  - `docs/security-and-auth.md`, `docs/api-reference.md`, `docs/sending-email.md`:
    - "Password Reset" section (flow, eligibility matrix, token TTL, availability rules), three rows
      in the rate-limiting table, the four endpoints (incl. admin `503 EMAIL_SEND_FAILED`), and the
      empty-`smtpServer` / live-reinitialize SMTP rules
  - `docs/dev/design/W-206-user-password-reset.md` (new):
    - full design doc, including As Built deviations and manual-testing findings

### W-207, v1.7.11, 2026-08-11: bootstrap: site-level init hook
- status: ✅ DONE
- type: Feature
- objectives:
  - make the startup hook site code already has (`static async initialize()` on a discovered controller) deterministic, observable, and findable in the docs
  - give `ConfigModel.extendSchema()` and `UserModel.extendSchema()` from site code one obvious place to live, the way the hello-world plugin already does it
- context:
  - the call site already exists: `SiteControllerRegistry._initializeControllers()` (from `initialize()`, bootstrap step 14) detects `static initialize(` by regex during the scan and awaits it on every discovered controller, site and plugin alike, inside a per-controller try/catch — the original premise of this item ("never calls a lifecycle method") was wrong
  - `plugins/hello-world/webapp/controller/helloPlugin.js` uses exactly this to add its config tab, and `docs/getting-started.md` + `docs/api-reference.md` already teach `static async initialize()` — so no new hook name is warranted; a second one (`init()`) would split the mental model and orphan every existing example
  - timing is already correct: `global.UserModel` and `global.ConfigModel` are published at steps 12–13, and `UserModel.initializeSchema()` (16) / `ConfigModel.initializeSchema()` (17) run after step 14, so an `extendSchema()` call from `initialize()` lands before either schema is computed
  - what is actually missing: order across controllers is `Map` insertion order (readdir order, site dir then plugin dirs), the bootstrap banner reports controllers and APIs but not the `initialized` count the registry already returns, a failing initializer is only visible in the log, and `docs/site-customization.md` never mentions the hook at all
  - step 14 is skipped when `isTest`; no new public entry point is needed, since the test suite already seeds `registry.controllers` and spies `_loadController`, so it can drive `_initializeControllers()` directly
- features:
  - keep `static async initialize()` — no new hook name, no migration, existing site/plugin controllers and docs stay correct
  - deterministic order: optional `static initializePriority = <number>` (lower runs earlier, default 100, same convention as `HookManager` priorities), then alphabetical by controller name, then registry key as tie-breaker
  - two sort keys only — site and plugin initializers share one ordered list rather than being grouped by source; a site controller that must run after a plugin sets `initializePriority` above 100, which is the documented escape hatch
  - priority is read from the loaded class, not by regex: load every controller that has an `initialize`, sort, then call, so a class-level constant stays authoritative and the existing `hasInitialize` regex is the only source-text scan
  - per-controller try/catch around both the load and the call — a failing initializer logs an error and bootstrap continues, matching how `HookManager.execute()` isolates a bad handler
  - failures are visible in the startup banner, not just the log
  - documented use cases: config and user schema extensions, custom Redis broadcast channels, in-process registries, cache warmup — plus what does not belong there (request handling, long blocking work)
- deliverables:
  - `webapp/utils/site-controller-registry.js`:
    - `_initializeControllers()` becomes load-then-sort-then-call; `initializePriority` support with a finite-number guard (so `0` is honored rather than falling back to the default); load errors isolated like call errors; return `{ initialized, failed }` and surface both in `initialize()` stats and `getMetrics()`
  - `webapp/utils/bootstrap.js`:
    - step 14 banner reports the initialized count, plus a warning line naming failed initializers; placement between step 14 and step 16 (`UserModel.initializeSchema()`) confirmed unchanged
  - `webapp/tests/unit/utils/site-controller-registry.test.js`:
    - initialize called once per controller, priority and alphabetical ordering, a throwing initializer does not abort the rest, a failing load is isolated, controllers without an initialize are skipped, counts reported
  - `docs/site-customization.md`, `docs/api-reference.md`:
    - new startup-hook section: when it runs, what belongs in it, an `extendSchema()` example, and the `initializePriority` escape hatch; `api-reference.md` config-extension text points at `initialize()` instead of the vague "or site bootstrap"
- notes:
  - prerequisite for the BubbleMap AI Agent work (T-092), which needs a call site for its "AI Agent" config tab extension and its tool registry — that call site is `static async initialize()`; T-092's open question is answered by the docs deliverable here rather than by new machinery
  - existing behavior is the compatibility gate: every controller that defines `initialize()` today still runs, only the order between them becomes defined

### W-208, v1.7.12, 2026-08-12: websocket: per-namespace message limits; error reporting; request helper
- status: ✅ DONE
- type: Feature
- objectives:
  - let a namespace raise the inbound message size cap without raising it globally
  - stop silently dropping messages: a client must learn that its message was rejected
  - support request/response over WebSocket in both directions, so either side can send a message and await its reply
- context:
  - `WebSocketController._onMessage()` reads limits only from `global.appConfig.controller.websocket.messageLimits` (`maxSize ?? 65536`, `interval ?? 1000`, `maxMessages ?? 50`), while `createNamespace(path, options)` accepts only `{ requireAuth, requireRoles, onCreate }` — there is no per-namespace override
  - both pre-handler rejections are silent: oversized and rate-limited messages `logInfo` and `return` with nothing sent back. By contrast a handler *throw* replies with `_formatMessage(false, null, error.message, 500)` and malformed JSON replies with a 400, so the error envelope already exists and only the drop paths bypass it
  - the rate limit is tracked per client (`client.messageTimestamps`), so each namespace connection has its own budget; `maxSize` is the limit that actually needs to be adjustable
  - `jPulse.ws` connection handles expose `send`, `onMessage`, `onStatusChange`, `getStatus`, `disconnect` with auto-reconnect and backoff — all fire-and-forget, with no correlation id anywhere in the envelope
  - pattern namespaces copy `_onConnect` / `_onMessage` / `_onDisconnect` from the template when a literal namespace is created on first connect, so any new per-namespace option has to be copied there too
  - size check runs before `JSON.parse`, so an oversized message cannot be correlated by `requestId` unless the client knows the limit up front; `WSServer` also has no `maxPayload` (ws default 100 MB), so frames are fully buffered before the app-level check
  - `jPulse.api.call()` always resolves with `{ success, data?, error?, code? }` and never rejects — `ws.request()` must match that convention
  - T-092 dispatches tool calls *to the browser* and awaits results that can exceed 64 KB, so server→client request is required, not only client→server
- features:
  - `createNamespace(path, { messageLimits: { maxSize, interval, maxMessages } })` — same name as the config key; stored on the `WebSocketNamespace` instance, falling back per-field to the global config; `_onMessage()` consults the namespace first; code-only (no admin per-namespace override)
  - pattern-namespace inheritance: `messageLimits` carried from the template to the literal namespace alongside the handlers
  - effective limits advertised in the `connected` welcome message; client size pre-check so `send()`/`request()` fail fast with `MESSAGE_TOO_LARGE` instead of hanging on an uncorrelated rejection
  - socket-level `maxPayload` from `controller.websocket.messageLimits.maxPayload` (global ceiling); client maps close code 1009
  - rejection replies instead of silent drops — string codes `MESSAGE_TOO_LARGE`, `RATE_LIMIT_EXCEEDED` (leave existing numeric `400`/`500` alone); optional `details` on the envelope (`{ size, limit }` / `{ maxMessages, interval, retryAfterMs }`); one unsolicited rate-limit notice per window per client, always reply when the message carried a `requestId`
  - `_onMessage` order: size → parse → rate limit → handler, so rate-limit rejections can echo `requestId`
  - dropped-message counters `{ oversize, rateLimit, invalid }` in namespace stats, surfaced on the admin WebSocket status page next to the effective limits; rejections appear in the activity log with direction `rejected`
  - bidirectional request/response via top-level `requestId` on the envelope (optional — messages without one behave exactly as today):
    - client: `ws.request(data, { timeoutMs })` always resolves with `{ success, data?, error?, code?, details? }` (`REQUEST_TIMEOUT`, `NOT_CONNECTED`, `CONNECTION_LOST`, `MESSAGE_TOO_LARGE`); pending map with timeout timers; cleanup on close, reconnect, `disconnect()`; correlated replies consumed by the promise and not re-delivered to `onMessage`; `ws.reply(message, data)` / `ws.replyError(message, error, code)` for answering server-initiated requests; `ws.getLimits()` returns welcome limits
    - server: `conn.reply(data)` / `conn.replyError(message, code)` on the handler `conn`; `WebSocketController.request(clientId, path, data, { timeoutMs })` for server→client; auto `NO_REPLY` when a handler finishes without answering a correlated message; handler-throw replies echo `requestId`
- deliverables:
  - `webapp/controller/websocket.js`:
    - `WebSocketNamespace` accepts and stores `options.messageLimits`; `getEffectiveLimits()`; `_onMessage()` resolves limits per namespace with global fallback; oversize/rate-limit/invalid paths send formatted rejections with `details`; `_completeUpgrade()` copies `messageLimits` from a pattern template; drop counters in `stats`; `conn.reply` / `conn.replyError`; `WebSocketController.request()`; `maxPayload` on `WSServer`; limits in `connected` welcome; `totalDropped` in metrics
  - `webapp/view/jpulse-common.js`:
    - connection handle gains `request()`, `reply()`, `replyError()`, `getLimits()`; pending-request map with timeout timers; size pre-check from welcome limits; resolution by `requestId` in `onmessage`; resolve-with-error (never reject) and cleanup on close, reconnect, `disconnect()`; close code 1009 mapped
  - `webapp/app.conf`:
    - document per-namespace `messageLimits`; add `maxPayload` ceiling under `controller.websocket.messageLimits`
  - `webapp/view/admin/websocket-status.shtml` + `webapp/translations/en.conf`, `de.conf`:
    - show effective limits and dropped-message counts per namespace (oversize / rate limit / invalid)
  - `webapp/tests/unit/controller/websocket.test.js`:
    - per-namespace limits override and fall back correctly, pattern-template inheritance, oversize and rate-limit replies carry the right code and details, drop counters increment, notice suppressed within a window, `requestId` echoed, `WebSocketController.request()` resolves on client reply
  - `webapp/tests/unit/utils/jpulse-websocket-request.test.js` (new; loads real `jpulse-common.js` via JSDOM+vm — do not extend the stub `jpulse-websocket-simple.test.js`):
    - `request()` resolves on a matching reply, resolves with error on timeout / closed socket / reconnect, cleans up on disconnect, ignores unknown ids, size pre-check, `reply()` echoes `requestId`, `getLimits()` from welcome
  - `site/webapp/` hello-websocket demo:
    - `/api/1/ws/hello-request` namespace (`messageLimits.maxSize: 1024`); Request / Response tab (`#request-response`) with echo, ask-browser (server→client), and send-oversized buttons
  - `docs/websockets.md`, `docs/api-reference.md`, `docs/security-and-auth.md`:
    - per-namespace limits, rejection-code table, both request directions; rewrite Pattern 6; correct "Fire and Forget" and rate-limiting best-practice sections; security doc points at the limits section (not silent drops)
- notes:
  - prerequisite for the BubbleMap AI Agent work (T-092): tool calls are dispatched to the browser over WebSocket and their results can exceed 64 KB, and a silently dropped reply would hang a turn until its timeout instead of failing loudly — hence both directions and rejection replies
  - the three features are independent enough to land as separate commits (limits + discoverability; rejection replies + counters + admin; request/response + docs + demo) but share the same envelope, hence one work item

### W-209, v1.7.13, 2026-08-13: plugins: extensibe hook registry
- status: ✅ DONE
- type: Feature
- design doc: docs/dev/design/W-209-extensible-hooks.md
- objectives:
  - let plugins and site code define their own hooks, so the framework never carries a domain-specific hook vocabulary
  - make the hook catalog machine-readable and queryable by name and property, instead of a hard-coded literal
  - make the catalog *honest*: today it advertises cancellation that does not work and hooks that never fire
- context:
  - `HookManager.getAvailableHooks()` is a fixed object literal holding the 15 hooks the framework fires, in four buckets — authentication (8), user lifecycle (5), plugin config (1, `onPluginConfigBeforeSave`), system/metrics (1, `onGetInstanceStats`) — with each entry carrying a description, a prose `context` string, `canModify`, and `canCancel`
  - `isValidHook()` only *warns* on an unknown name and registers the handler anyway, so a third-party hook works today but is undocumented, unqueryable, and indistinguishable from a typo
  - **almost no new execution machinery is needed**, and one mode is *removed*: `execute()`, `executeFirst()` (first non-null wins) and `executeForPlugin()` (targeted, errors propagate to abort the caller, W-200) cover the known cases, and `hasHandlers()` / `unregister()` / `getRegisteredHooks()` already exist. What is missing is only the definition and introspection layer
  - the design conflates two roles: the *producer* that owns a hook's contract and fires it, and the *consumer* that registers a handler. The framework being the only producer is exactly why the catalog can be a literal
  - review findings that corrected the first draft of the design (see design doc §4.2 for the full list):
    - hook documentation is **already generated** — `docs/plugins/plugin-hooks.md` renders the catalog through W-105's `%DYNAMIC{plugins-hooks-list-table}%` generators in `webapp/controller/markdown.js`; `docs/api-reference.md` has no hook table at all, only a prose link. So `context` and `canModify` are load-bearing fields that a "declaration" replacing them with `contextKeys` / `returns` would render as `undefined`
    - framework definitions cannot be scattered across the modules that fire them: the hook-manager test suite imports `HookManager` with no bootstrap and expects a populated catalog, so they need one eagerly-loaded seed module
    - the return-`false` cancellation contract **does not work**: `onUserBeforeSave` is documented `canCancel: true` but every fire site uses `execute()`, which assigns the `false` into the context — `webapp/model/user.js` then reads `.userData` off `false` and the save crashes obscurely instead of cancelling. W-200 already recorded this as "aspirational/inaccurate"; `webapp/controller/user.js` even carries a comment documenting the broken contract
    - `executeFirst()` has **no production caller** anywhere — only its own unit tests and design docs; kept regardless as the natural dispatch mode T-092 wants
    - `executeWithCancel()` has **exactly one production caller, and it is a security gate**: BubbleMap's site-defined `onBubbleWidgetConfigBeforeSave`, guarding whether a user may add or change a Custom Script stage. An earlier draft claimed it had none — that came from searching the framework repo alone, where `.gitignore` excludes `plugins/*` apart from `hello-world`, so even the locally installed plugins were invisible; the real inventory (design doc §12.1) was taken with `--no-ignore` plus a scan of both site checkouts
    - that one consumer independently hand-built **both** halves of this item's replacement (design doc §10.4): the producer passes a `message` field into the context so a vetoing handler has somewhere to put its reason (a hand-rolled channel for what a thrown `Error` carries natively), and the handler wraps itself in a `try`/`catch` whose comment states that `executeWithCancel` "would otherwise swallow a thrown error and fail OPEN ... which is the wrong default for a security gate". Both are deleted rather than ported
    - `onUserBeforeDelete`, `onUserAfterDelete`, `onUserSyncProfile` are **never fired**; there is no `UserModel.delete()` in the framework, so a plugin can register a handler and wait forever with no indication
    - `execute()` contains a hook-specific special case (`hookName === 'onGetInstanceStats'`) to attach per-handler elapsed timing — a domain name hard-coded inside the generic executor
    - only `PluginManager` reads `static hooks`, so site code cannot auto-register a handler at all and must hand-write `HookManager.register(...)` in `initialize()` — a site is a second-class consumer even though this item makes it a first-class producer
    - unrelated bug found while checking route conventions: `/api/1/plugin/dependencies` is registered *after* `/api/1/plugin/:name` in `webapp/routes.js`, so `PluginController.getDependencies()` is unreachable (the request 404s as an unknown plugin named "dependencies"); nothing calls it, which is why it went unnoticed
  - `onGetInstanceStats` is the only hook breaking the `onBucketAction` convention
- features:
  - `defineHook(name, spec)` and `defineHooks(map, owner)` — producer-side definition from anywhere
  - vocabulary decision: **define** (producer) / **register** and **handle** (consumer) / **fire** and **execute** (runtime). "Declare" already means the consumer side in the existing docs (`plugin-hooks.md` §"Declare Hooks in Your Controller" is about `static hooks`), so a producer API named `declareHook()` would make one word mean both roles; those headings are re-worded by this item
  - definition fields: `description` (the **only** required one), `owner` (stamped from `defineHooks()` or the defining class), `mode`, `contextKeys` + optional `contextNote`, `onError`, `canModify`, `returns`, `stability`, `since`, `deprecatedBy` — everything but `description` defaults or derives from `mode`, because defining is voluntary (registration never fails on an undefined name) and every required field is a tax on the behavior this item wants to encourage; an incomplete definition is an info-level audit nudge, not a gate
  - `static hookDefinitions = { … }` on a plugin *or site* controller, auto-defined by `PluginManager` / `SiteControllerRegistry`; `static hooks` (consumer side) keeps its name and syntax unchanged — `providesHooks` reads as a near-synonym of `hooks`, and T-092 §10.1 already specifies `static hooks` for its provider plugins
  - site controllers also gain **auto-registration of `static hooks`**, closing the asymmetry where a site could define a hook in one line but needed a manual `HookManager.register()` call to handle one; the registration loop moves out of `PluginManager._registerControllerHooks()` into `HookManager.registerFromClass(owner, Controller)` and both registries call it
  - the framework's own hooks migrate to definitions in one eagerly-loaded seed module (`webapp/utils/hook-definitions.js`) so the built-in catalog is seed data rather than a permanent special case; `getAvailableHooks()` becomes a view that keeps rendering `description` / `context` / `canModify` / `canCancel`, with the prose `context` string synthesized from `contextKeys` so the W-105 doc generators keep working untouched
  - naming decision: keep `onBucketAction` camelCase for every owner (no namespaced alternative, no migration), with `owner` for collision detection — identical re-definition idempotent, conflicting re-definition keeps the first and records both, defining never throws
  - `onGetInstanceStats` → `onSystemGetStats`: the last convention exception is removed rather than preserved, since keeping it inside the item that makes the convention machine-checkable is the wrong trade (one fire site, one catalog entry)
  - **cancellation unified on throw-to-abort** — the one deliberately breaking change:
    - `executeWithCancel()` and the "handler returns `false` to cancel" convention are deleted (one production caller, which migrates; the convention is what corrupts the context today)
    - `execute()` stops assigning a non-object return into the context, removing the corruption path
    - cancelling is always "throw an `Error` whose message is safe to show the user" — the only mechanism that carries a *reason*, which the framework already surfaces where cancellation works today (`CONFIG_SAVE_REJECTED`, a 400 with the handler's message)
    - whether a throw aborts the producer is the declared `onError: 'continue' | 'abort'`, defaulting per mode to exactly today's behavior (`execute` / `executeFirst` → continue, `executeForPlugin` → abort), so an undefined hook and an unmigrated caller both keep working; documented rule of thumb: "Before hooks may veto, After hooks may not"
    - `onUserBeforeSave` is defined `onError: 'abort'`, becoming the veto point it has always claimed to be; `onPluginConfigBeforeSave` is unchanged in behavior and stops being an exception, so its five-line "cancel here means throw" paragraph disappears from the catalog and the docs
    - T-092 is the case proving per-hook policy beats per-method: `onAiProviderRegister` must not let one broken provider plugin kill the provider list (continue), while `onAiComplete` must fail the turn on a provider error (abort) — same owner, same release, opposite policies. It also gives defining a hook its first payoff beyond documentation
  - validation decision: registration never fails on an undefined name, since a consumer may load before its producer — and per the boot order always does when a plugin consumes a site-defined hook (plugins register at step 7.4, site definitions land at step 14). Unmatched registrations are recorded, a late definition retro-validates them, and a single post-boot audit reports what remains
  - audit findings: unmatched handler **with an edit-distance did-you-mean suggestion** (warning), handler on a disabled producer's hook (warning), deprecated-hook handler (warning), `planned`-hook handler (warning), definition conflict (error), incomplete definition (info), advisory prefix mismatch (info); computed in `getAudit()` and merely logged by bootstrap after step 14, so `HealthController` can re-run it
  - catalog honesty: `onUserBeforeDelete` / `onUserAfterDelete` / `onUserSyncProfile` are marked `stability: 'planned'` rather than removed — they are the seam T-092's username-keyed collections and `auth-oauth` profile sync will want — plus a **scan test** asserting every non-`planned` framework definition has a matching `execute*('<name>'` call site, so a future defined-but-unwired hook fails CI
  - query API: `getHook(name)` merging definition with live handlers (also T-092's provider-availability probe), `findHooks({ owner, namePattern, stability, hasHandlers })`, `getAudit()`; `getHooksByNamespace()` retained over `findHooks()`
  - visibility: `GET /api/1/hook` and `GET /api/1/hook/:name` for admins — top-level and singular per every existing route, deliberately *not* nested under `/api/1/plugin` (a lie for framework- and site-owned hooks, and shadowed by `/api/1/plugin/:name`) — a hooks panel on the admin plugins page, and an `owner` filter plus Owner / Mode columns on the existing doc generators
  - lifecycle: definitions by a disabled plugin marked inactive rather than deleted, so consumer registrations still produce a useful audit message; deprecation via `stability` + `deprecatedBy`
  - folded in: the one-line `webapp/routes.js` reorder that makes `/api/1/plugin/dependencies` reachable again, since the hook routes land in the same block
  - admin hooks panel reloads after enable/disable/rescan; a disabled plugin's definitions stay listed with an Inactive badge
  - plugin enable/disable toasts use `%NAME%` so Handlebars in the page script cannot eat `{{name}}`; audit did-you-mean uses `%SUGGESTION%`
  - docs sidebar lists Hooks after API Reference (`docs/.markdown`); markdown tables wrap cell text and scroll only if they still overflow
- deliverables:
  - see the design doc §17 for the full table; primary files are a new `webapp/utils/hook-definitions.js` (framework catalog as seed data), `webapp/utils/hook-manager.js`, `webapp/utils/plugin-manager.js`, `webapp/utils/site-controller-registry.js`, `webapp/utils/bootstrap.js` (audit), `webapp/model/user.js` + `webapp/controller/user.js` (the `onUserBeforeSave` abort path), `webapp/controller/health.js` (hook rename), a new `webapp/controller/hook.js` + `webapp/routes.js`, `webapp/controller/markdown.js` (generator columns/filter), `webapp/view/admin/plugins.shtml` + translations, `plugins/hello-world/webapp/controller/helloPlugin.js` (reference example), the hook-manager / plugin-manager / site-controller-registry test suites plus a new `hook-definitions.test.js`, and the docs: `docs/plugins/plugin-hooks.md` **moves to `docs/hooks.md`** and is re-framed around the three producer roles (framework / site / plugin), with nav and cross-links repointed (`docs/plugins/README.md`, `docs/.markdown` publish-list, `creating-plugins.md`, `plugin-api-reference.md`), plus `docs/site-customization.md` and `docs/api-reference.md`
  - five commits (design doc §16): registry core and seed; one cancellation model; query + audit + retro-validation; producer and consumer surfaces; visibility and docs
  - pre-implementation decisions settled 2026-08-12: hook guide moves to `docs/hooks.md`; `owner` stays the flat plugin-name / `site` / `framework` vocabulary for both definitions and handler registrations; `contextKeys` stays flat top-level keys with an optional `{ key, type, description }` object form; new files carry the current `@version`/`@release` and are rewritten by the release bump; the bubblemap-app and `auth-mfa` migrations are applied by their owner in those repositories after the framework change lands, not by this item's commits
  - extra tests: `hook-controller.test.js`, `user-before-save-abort.test.js` (model + controller)
  - extra docs cross-links: `docs/deployment.md`, `docs/handlebars.md`, `docs/genai-instructions.md`, `docs/security-and-auth.md`, `docs/plugins/plugin-architecture.md`
  - manual-test polish: `plugins.shtml` reloads the hooks table on toggle/rescan and shows inactive; translations `%NAME%` / `inactive` / `%SUGGESTION%`; `jpulse-common.js` wraps markdown tables; `jpulse-common.css` wrap-then-scroll (`min-width: 36rem`)
- notes:
  - prerequisite for the BubbleMap AI Agent work (T-092), where each LLM backend is a plugin (`ai-anthropic` first, plus `ai-mock` for tests). With this item, `ai-core` defines `onAiProviderRegister` / `onAiComplete` itself and the framework never learns the word "AI" — see design doc §13 for the worked example
  - depends on W-207: site code is a first-class producer in this design and needs a call site to define from
  - **long-term maintainability is preferred over backward compatibility here** (both existing site deployments are under the same ownership and can be updated alongside), so unlike most items this one has a breaking-change list — design doc §12:
    - `executeWithCancel()` removed — one production caller migrates (below)
    - return-`false` cancellation removed — a handler returning `false` is now ignored instead of corrupting the context, so this direction is strictly safer
    - `onUserBeforeSave` becomes `onError: 'abort'` — a handler that *throws* now aborts the user save with a 400 carrying its message, where it was previously logged and ignored; **no consumer registers this hook anywhere today**, so the real-world risk is nil
    - `onGetInstanceStats` → `onSystemGetStats` — a plugin still registering the old name silently never fires, and the audit reports it with a did-you-mean
    - `HookManager.clear()` narrowed to handlers only; `clearDefinitions()` added for tests
  - ecosystem migration (scanned 2026-08-12 across the framework, its installed plugins, and both deployed sites; full tables in design doc §12.1–§12.2) — about fifteen lines, net negative once the two workarounds are removed:
    - bubblemap-app `site/webapp/controller/bubble.js`: `executeWithCancel` → `execute` in a try/catch mapping `error.message` onto the existing 403 `WIDGET_CONFIG_SAVE_DENIED`, drop the `message` context field, add `static hookDefinitions` for `onBubbleWidgetConfigBeforeSave` with `onError: 'abort'`
    - bubblemap-app `plugins/widget-chart-core/webapp/controller/widgetChartCore.js`: two `return false` sites become `throw new Error(...)`; the fail-closed catch workaround is deleted
    - bubblemap-app `site/webapp/tests/unit/controller/bubble.test.js`: five assertions on the `{ cancelled, cancelledBy }` envelope move to the thrown-error path
    - `auth-mfa` in all three deployments: `onGetInstanceStats` → `onSystemGetStats` in `static hooks` and the handler method name, plus one README line
    - complete handler inventory, for the record: `auth-oauth` (`onAuthGetLoginProviders`, `onAuthGetSteps`, `onAuthValidateStep`, `onPluginConfigBeforeSave`), `auth-mfa` (`onAuthGetSteps`, `onAuthValidateStep`, `onAuthGetWarnings`, `onGetInstanceStats`), `hello-world` (`onAuthAfterLogin`, `onAuthBeforeSession`), `widget-chart-core` (`onBubbleWidgetConfigBeforeSave`). Nothing registers the three `planned` hooks
  - everything else is preserved: the remaining hook names, the `static hooks` consumer syntax, and the catalog entry shape the W-105 doc generators depend on. The existing hook-manager test suite is the compatibility gate through commit 1; commit 2 deliberately rewrites its `executeWithCancel` block and `canCancel` assertions
  - framework user deletion (a `UserModel.delete()` and its cascade) is a separate work item — T-092's username-keyed `aiAgentThreads` / `aiAgentTurns` / `aiAgentUsage` collections will want it, and `onUserBeforeDelete` / `onUserAfterDelete` are the seam it plugs into

### W-211, v1.0.6, 2026-08-13: auth-mfa plugin: hook rename for jPulse Framework v1.7.13+
- status: ✅ DONE
- type: Feature
- objectives:
  - keep MFA stats on System Status after W-209 renamed the framework stats hook
  - clear the boot-audit warning for an undefined `onGetInstanceStats` handler
- prerequisites:
  - W-209, v1.7.13, 2026-08-13: plugins: extensibe hook registry
- context:
  - W-209 renamed `onGetInstanceStats` → `onSystemGetStats` so the last `onBucketAction` exception is gone; `HealthController` fires only the new name
  - a plugin still registering the old name is still registered, but the handler never runs, and the post-boot audit reports `UNDEFINED_HOOK` (`no definition for hook 'onGetInstanceStats' (registered by auth-mfa)`)
  - edit-distance did-you-mean does not suggest `onSystemGetStats` for this rename (distance 9, threshold 6), so the log line is the warning only
  - `auth-mfa` is the only in-tree consumer of the old name; it lives in its own repo (`@jpulse-net/plugin-auth-mfa`) and is gitignored from the framework except as an installed plugin — this item is that plugin's migration, not a framework commit
  - same one-line rename is needed in every deployment that vendors the plugin (framework dogfood, jpulse.net, bubblemap)
- features:
  - `static hooks` key and handler method `onGetInstanceStats` → `onSystemGetStats` (method name must match the hook name; `handler:` override not used)
  - log tag `auth-mfa.onSystemGetStats` so a stats-collection failure is searchable under the new name
  - README release note; historical 1.0.2 W-112 entry that introduced the old name stays as written
  - folded in (W-206 companion, not a framework file): `onAuthGetSteps` MFA step sets `page: '/auth/mfa-verify.shtml'` so OAuth `completeExternalAuth()` and password-reset `beginAuthenticatedSession()` show the MFA UI instead of falling back to `/auth/login.shtml`
  - `webapp/bump-version.conf` includes `webapp/tests/**` so the bump script rewrites test-file headers
- deliverables:
  - `plugins/auth-mfa/webapp/controller/mfaAuth.js`:
    - `static hooks.onSystemGetStats`; `static async onSystemGetStats(context)`; error log `'auth-mfa.onSystemGetStats'`
    - `onAuthGetSteps` MFA step `page: '/auth/mfa-verify.shtml'`
  - `plugins/auth-mfa/README.md`:
    - release note for the rename, the MFA `page` field, and the v1.7.13+ framework requirement
    - Requirements `>= 1.7.13`; Hooks Used table uses current `onAuth*` / `onSystemGetStats` names
  - `plugins/auth-mfa/plugin.json`: `jpulseVersion` `>=1.7.13` (plugin `version` left for the bump script)
  - `plugins/auth-mfa/webapp/bump-version.conf`: `webapp/tests/**` globs
  - apply the same controller rename in the jpulse.net and bubblemap `auth-mfa` copies
  - verify: restart, boot audit has no `onGetInstanceStats` warning; Admin → System Status still shows Auth-MFA stats; Admin → Plugins hooks panel lists `onSystemGetStats` with handler `auth-mfa`
- notes:
  - the dogfood copy under `plugins/auth-mfa/` already has the controller rename and README note; plugin `version` in `plugin.json` is still 1.0.5 until the plugin release bump
  - no framework files; no work-item status change on W-209

### W-210, v1.7.14, 2026-08-14: config: sensitive fields, masked reads with audited reveal
- status: ✅ DONE
- type: Feature
- objectives:
  - no secret in any bulk config read, page context, application log, or change-log diff — for admins too, not just non-admins
  - one schema flag meaning "this is a secret", implied by password inputs, so a site or plugin author cannot leak by forgetting a second declaration
  - admins keep read-back, through one deliberate single-field endpoint that records who asked
  - the same guarantees on the plugin config path, where third-party API keys actually live
- context:
  - rescoped from the original "config: write-only field" spec after a threat-model pass; see notes for why write-only is not the mechanism
  - `ConfigModel._sanitizeForResponse()` obfuscates the paths listed in schema `_meta.contextFilter.withoutAuth` only when `!isAdmin`; internal callers use `findById(id, true)` for the full document. So an admin `GET /api/1/config` returns `data.email.smtpPass` and `data.manifest.license.key` in clear — and so do the `create`/`update`/`upsert` responses, which echo the full document
  - `findById(id, true)` is also how server code gets a real secret in order to use it: `EmailController.initialize()` reads `data.email.smtpPass` to build the SMTP transporter. Stripping secrets from that read (as the original spec's first deliverable said) would break authenticated SMTP — masking belongs in the response layer, not the model read
  - `sensitive: true` already exists on `data.email.smtpPass` and nothing in the framework reads it; the only other mention is the W-148 design doc, which promises "value is not logged and may be masked in API responses". `data.manifest.license.key` does not even carry the flag, only hand-maintained `contextFilter` globs. Making the flag load-bearing is this item
  - `_meta.contextFilter.withAuth` is used only by `HandlebarController._filterContext()` for `siteConfig`, keyed off `isAuthenticated`. A secret added through `ConfigModel.extendSchema()` is in neither hand-maintained list, so it renders into any page for any authenticated user
  - `ConfigController.create/update/upsert` log the whole request body (`JSON.stringify(updateData)`), and `sanitizeMessage()` keeps the first three quarters of 256 chars, so a submitted secret routinely reaches the app log in clear
  - `LogModel.logChange()` sanitizes `docType === 'config'` only, so a plugin API key submitted through a `type: 'password'` field lands in the change-log diff in clear; `auth-oauth` escapes this only because it encrypts client secrets in `onPluginConfigBeforeSave` before the diff sees them
  - `CommonUtils.sanitizeObject()` obfuscate mode replaces any string including `''`, so masking must skip empty values — then the mask itself is the presence marker, and no `configured` marker or new payload shape is needed
  - site config and plugin config render through one renderer (`jPulse.schemaForm`, plugin fields via `pluginSchemaToBlocks()`), so the widget is written once and serves both
  - change-log `action` is a hard enum `['create', 'update', 'delete']` in `LogModel.schema` and `validate()`, mirrored in `webapp/view/admin/logs.shtml` (filter options, badge CSS, `displayChanges()` branches), so an admin-visible reveal entry needs a fourth value
  - no other in-tree `plugin.json` used `type: 'password'` when this item started; hello-world ships with the framework, so it gains a teaching `type: 'password'` field in this item (auth-mfa / auth-oauth do not need a change)
- features:
  - `sensitive: true` schema attribute, implied by `inputType: 'password'` (config schema) and `type: 'password'` (plugin.json); explicit `sensitive: false` as the escape hatch
  - read contract, every caller including admins, config and plugin alike: `''` when unset, the mask (`********`) when set; the real value never appears in a bulk read
  - write contract: a field absent from the payload is unchanged; a submitted mask is treated as absent, so a form round-trip or an echoed read cannot overwrite a secret with the mask; anything else is stored verbatim, and empty string clears
  - reveal: one admin-only endpoint per field, path validated against the sensitive-path list so it cannot become a read-anything hole, writing a change-log entry under a new `read` action so Admin → Logs shows who revealed which secret when
  - template context: sensitive paths stripped from `siteConfig` in both auth states, derived from the schema rather than from `contextFilter`
  - logs: request bodies sanitized before `logRequest()`; change-log diffs sanitized for both the `config` and `plugin` doc types
  - `contextFilter` keeps its job as the audience filter for non-secret fields (`smtpServer`, `smtpPort`); its two secret entries stay as belt-and-braces, with a comment naming `sensitive` as the mechanism
  - admin UI: a password field renders as configured / not configured with a reveal button that fetches the single value instead of unmasking the DOM; untouched sensitive fields are omitted from the save payload
  - Test Email uses the stored `smtpPass` when the form posts the mask or omits the field; `apiSend` calls `_resolveTestSmtpPass` on the class because Express invokes the handler unbound
  - change-log updates diff the raw documents, then mask secret values in the tuples, so a password change is recorded as `********` ==> `********` instead of disappearing
  - documented as the mechanism for secrets, with `writeOnly` (no reveal, plus an explicit clear) described as the escalation available if a deployment ever needs non-retrievability
  - hello-world (shipped with the framework) demonstrates the plugin-author contract: `type: 'password'`, a Verify button that uses `PluginModel.getSecret`, and no secret in the plugin's own public API
- deliverables:
  - phase 1 — server contract:
    - `webapp/model/config.js`: sensitive-path list derived in `initializeSchema()` (explicit `sensitive: true`, implied by `inputType: 'password'`); mask constant; `maskSensitive(doc)` obfuscating non-empty values only; mask-echo guard in `updateById()`/`create()` (drop from the `$set` instead of storing the mask); `data.manifest.license.key` marked sensitive; `findById(id, isAdmin)` behavior unchanged, with its doc comment stating that the raw result must never reach a client
    - `webapp/controller/config.js`: `maskSensitive()` applied to all six response payloads (`get`, `getEffective`, `list`, `create`, `update`, `upsert`); request body sanitized before `logRequest()`; validation errors carry paths, never values
    - `webapp/controller/handlebar.js`: `_filterContext()` strips schema-derived sensitive paths from `siteConfig` in both auth states
    - `webapp/controller/email.js`: `_resolveTestSmtpPass` falls back to in-memory / stored `smtpPass` when the submitted value is empty or the mask; `apiSend` calls it on the class (Express invokes the handler unbound)
    - `webapp/model/log.js`: config change-log sanitization driven by the sensitive-path list; updates run `createFieldDiff` on the raw docs, then `_maskSensitiveChangeValues` (mask-before-diff dropped real password changes)
  - phase 2 — reveal endpoint and audit action:
    - `webapp/controller/config.js`, `webapp/routes.js`: `GET /api/1/config/:id/secret?path=email.smtpPass` behind `requireAdminRole()`, rejecting any path not marked sensitive, returning the single value and never logging it
    - `webapp/model/log.js`: `action` enum and `validate()` accept `read`
    - `webapp/controller/log.js`: helper writing a reveal audit entry (docType, docId, field path; no value)
    - `webapp/view/admin/logs.shtml`: `read` filter option, `.local-action-read` badge, `displayChanges()` branch for an entry that carries no field changes; keep mask-to-mask rows so a secret change stays visible
    - `webapp/translations/en.conf`, `webapp/translations/de.conf`: action label and reveal strings
  - phase 3 — admin UI:
    - `webapp/view/jpulse-common.js`: password field renders from the masked value (configured / not configured); reveal button fetches one value; a programmatic reveal does not mark the field dirty; `getFormData()` omits untouched sensitive fields
    - `webapp/view/jpulse-common.css`: password field is a flex row so reveal sits beside the input
    - `webapp/view/admin/config.shtml`: reveal wiring; `localGetDirtySnapshot()` must not treat a reveal as a change (exclude sensitive fields, or re-baseline after reveal), otherwise Save enables spuriously
    - `webapp/view/admin/plugin-config.shtml`: reveal URL template; fields already render through the shared renderer; `data-callback` / `data-action` so plugin Test buttons run
  - phase 4 — plugin parity and log sanitization:
    - `webapp/controller/plugin.js`: `getConfig()` masks sensitive values; `updateConfig()` applies absent/mask/clear before `onPluginConfigBeforeSave` so the hook sees the effective value; `GET /api/1/plugin/:name/config/secret?field=apiKey`
    - `webapp/model/plugin.js`: derive sensitive field ids from a plugin schema (`type: 'password'` or `sensitive: true`); accessor for a plugin to read its own secret server-side
    - `webapp/model/log.js`: `docType === 'plugin'` branch, reaching the schema through `global.PluginManager.getPlugin(name).metadata.config.schema`
  - phase 5 — tests:
    - new: `config-masked-reads.test.js`, `config-secret.test.js`, `jpulse-ui-input-sensitive.test.js` — masked admin and non-admin reads, unset versus set, mask-echo ignored, empty clears, reveal authorization / path validation / audit, no secret in the request log
    - update: `config-model.test.js`, `config-manifest.test.js`, `config-basic.test.js`, `log-basic.test.js` (masked smtpPass/apiKey diffs kept), `handlebar-context-filter.test.js`, `plugin-controller.test.js`, `plugin.test.js`, `email-controller.test.js` (unbound `apiSend`); `template-includes.test.js` and `view.test.js` mock `getSensitivePaths`
  - phase 6 — docs:
    - `docs/api-reference.md`: masked read contract, write rules, reveal endpoint
    - `docs/security-and-auth.md`: secrets in configuration — what is guaranteed (no secret in bulk reads, page context, logs, diffs) and what is not (an admin can reveal, and it is recorded); `contextFilter` as the audience filter; internal reads through `findById(id, true)`; the `writeOnly` escalation
    - `docs/jpulse-ui-reference.md`: password field behavior, reveal fetches the value
    - `docs/plugins/plugin-api-reference.md`, `docs/plugins/creating-plugins.md`: `type: 'password'` implies sensitive; reading your own secret server-side; a Test button as the recommended companion for any secret
    - `docs/site-customization.md`: `extendSchema()` example with a secret
    - `docs/site-administration.md`: correct the "license key is filtered from server responses" claim, which is false for admin callers today; describe configured / reveal / audit
  - phase 7 — hello-world teaching example (shipped with the framework):
    - `plugins/hello-world/plugin.json`: `demoApiKey` (`type: 'password'`) and a Verify button
    - `plugins/hello-world/webapp/controller/helloPlugin.js`: `GET /api/1/helloPlugin` masks secrets; `GET /api/1/helloPlugin/verify-demo-api-key` reads via `PluginModel.getSecret` and never returns the value
    - `plugins/hello-world/webapp/view/jpulse-common.js`: Verify callback
    - `webapp/view/admin/plugin-config.shtml`: wire `data-callback` / `data-action` so plugin Test buttons run (same gap the hello-world button would otherwise hit)
    - hello-world README / docs: describe the demo key without a work-item number
  - verify: reveal a secret and confirm the log entry names you; save the config without touching the password and confirm it survives; clear it deliberately; Test Email against an authenticating relay; admin config GET in devtools carries only the mask; grep the app log after a save; on hello-world, set the demo key, confirm GET `/api/1/helloPlugin` and GET plugin config show the mask, Verify succeeds, Reveal writes a `read` log entry
- notes:
  - why not write-only: it blocks bulk exfiltration through a hijacked admin session, but not the admin as a person — in a typical deployment that person has shell and Mongo access anyway — and it costs a four-state field widget plus a per-field verify action, forever, inherited by every plugin author (`auth-oauth` needed Test Connection, `smtpPass` needs Test Email). This design targets the same leak surface (bulk reads, screenshots, devtools, proxy logs, bug reports, app logs, change diffs) while keeping read-back, so clearing is ordinary text editing and verifying is reading the value back
  - the plumbing here is a strict subset of write-only: if a deployment ever needs non-retrievability (hosted sites where support staff hold admin, or a shared platform key), `writeOnly: true` adds "no reveal for this path" plus a Clear affordance, and nothing built here is wasted
  - folded in, same bug class, both pre-existing: request-body logging in `ConfigController.create/update/upsert`, and unsanitized plugin change-log diffs
  - deliberate non-goals: no step-up (password or MFA re-prompt) on reveal, since no such mechanism exists in the framework and it deserves its own item; no at-rest encryption, though `webapp/utils/crypto-secrets.js` exists and `auth-oauth` uses it for client secrets — an envelope plus lazy migration plus a sessionSecret-rotation warning is a separate item; a config value literally equal to the mask becomes unstorable in a sensitive field, documented rather than engineered around
  - T-092 (BubbleMap AI Agent) assumed provider LLM keys are unreadable even by admins; that is not what the framework will do, so correct that design doc to "masked in reads, revealable by an admin with an audit record" — or raise a `writeOnly` item if the hosted case demands it
  - `data.manifest.license.key` becomes sensitive in this pass; nothing in `webapp/` reads it yet, so there is no internal consumer to migrate

### W-212, v1.7.15, 2026-08-15: jPulse.UI: toast and keep confirmDialog open on button-callback throw; fix tooltip arrow position
- status: ✅ DONE
- type: Bug
- objectives:
  - when a confirmDialog object-style button callback throws, show an error toast and leave the dialog open
  - do not fail silently (console-only) and do not close as if the action succeeded
  - tooltip caret must point at the trigger after the box is shifted to stay on screen
- context:
  - `jPulse.UI.confirmDialog` in `webapp/view/jpulse-common.js` awaits object-style button callbacks
  - the `catch` only does `console.error('- jPulse.UI.confirmDialog: Dialog callback error:', error)`
  - `shouldClose` stays `true`, so the dialog closes after the throw
  - found in BubbleMap Map Settings: Save threw (`jPulse.api.patch` is not a function); dialog closed; no toast; no request
  - tooltip `_positionTooltip` clamps the box to the viewport, but the caret was CSS-fixed at 50% of the box, so it pointed at the gap between nearby buttons
- features:
  - on callback throw (sync or rejected promise): keep `console.error`
  - toast `error.message`; if the throw is a non-empty string, toast that string; otherwise `Unexpected error`
  - set `shouldClose = false` (same as `{ dontClose: true }`); `onClose` is not called; the confirm promise stays pending until a later close or ESC
  - array-style `buttons: ['Cancel', 'OK']` unchanged (those handlers do not run app callbacks)
  - tooltip arrow: after viewport clamp, set `--jp-tooltip-arrow-x` / `--jp-tooltip-arrow-y` so the caret tracks the trigger center; inset 16px from rounded corners; no new attribute
- deliverables:
  - `webapp/view/jpulse-common.js`:
    - `confirmDialog` object-button `catch` as above (guard `jPulse.UI.toast.error`)
    - `_positionTooltip` sets arrow CSS variables after clamp
  - `webapp/view/jpulse-common.css`:
    - caret `left`/`top` from `--jp-tooltip-arrow-x` / `--jp-tooltip-arrow-y` (fallback 50%)
  - `docs/jpulse-ui-reference.md`:
    - confirmDialog: callback throw keeps dialog open and toasts
    - tooltip Smart Positioning: arrow tracks trigger after clamp
  - `webapp/tests/unit/utils/jpulse-ui-widgets.test.js`:
    - thrown callback → toast.error called, dialog still in the document, `onClose` not called
    - rejected promise, missing `error.message`, and string throw covered
    - tooltip arrow: center, left/right edge, vertical clamp, extreme inset
- notes:
  - `Unexpected error` is a literal (same as other hardcoded toasts in `jpulse-common.js`); no new i18n key
  - string throws toast the string so `throw 'save failed'` is visible; empty `error.message` uses the fallback

### W-213, v1.7.16, 2026-08-22: utils: URL fetch
- status: ✅ DONE
- type: Feature
- objectives:
  - one framework-owned way to fetch a URL that a user, a saved configuration, or any other untrusted input chose
  - SSRF defenses, size caps, redirect re-validation, and timeouts written once and audited once
  - call shape a site developer can use without thinking: `const res = await UrlFetch.fetch(url)` — resolves, never rejects
- rationale:
  - needed twice already (chart-widget proxy in the map site, AI URL ingest in T-098); the existing copy is plugin-local, has no size cap, follows redirects without re-checking the target, and allowlists by hostname string so a public name pointing at a private address sails through
  - this is a pure security primitive with no site vocabulary; it belongs in the framework
  - T-083 (`widgetChartCore.apiFetch`) is not in this repo — W-213 ships the primitive; the migration (and the deliberate "redirect to a private address now fails" change) is a downstream item
- features:
  - `UrlFetch.fetch(url, options)` and `UrlFetch.getEffectiveOptions(callerOptions)` on `global` after bootstrap; kebab-case file / PascalCase global like RedisManager
  - caller options only narrow the site ceiling, never widen it; `getEffectiveOptions` is the same idea as W-208 `getEffectiveLimits()`
  - GET or POST only (anything else is an error, not a silent downgrade); methods are not a site config key; `as: 'text' | 'json' | 'buffer'`
  - two-stage address guard: URL pre-flight (http/https, no embedded credentials, IDN → punycode before allowlist compare, reject localhost / `*.localhost` / `*.local` / `*.internal`), then resolve DNS, reject if **any** address is non-public, connect to the address that was checked via a pinned `lookup` (node:http / node:https — no new dependency)
  - pinned `lookup` answers both the classic `(err, address, family)` form and Node 20+ Happy Eyeballs `{ all: true }` → `[{ address, family }]`
  - IPv6 URL literals: strip Node's hostname brackets (`[::1]`) before `net.isIP` so loopback is `PRIVATE_ADDRESS`, not `DNS_FAILED`
  - `finalUrl` and `redirects` redact userinfo (credentials never echoed in the result)
  - rejected ranges as specified (IPv4 private/loopback/link-local/CGNAT/multicast/reserved; IPv6 unspecified/loopback/ULA/link-local/NAT64/multicast); IPv4-mapped IPv6 unwrapped and re-checked
  - redirects: manual loop, full guard on every Location, relative resolution, `maxRedirects: 0` means do not follow, 301/302/303 → GET and drop body, 307/308 preserve method and body, strip Authorization / Cookie / Proxy-Authorization on a cross-origin hop
  - size cap on Content-Length (when present), on encoded bytes, and on decoded bytes (gzip/br bombs); stall timer plus total deadline
  - empty `acceptContentTypes` accepts anything; callers narrow; empty caller `allowedHosts` means no caller restriction (site `blockedHosts` still apply)
  - host lists: case-insensitive, punycode-normalized, exact host or `*.host` (subdomains, not apex), string or array input; blocked always beats allowed; site blockedHosts unioned with the caller
  - non-2xx still returns status, headers, and the capped body (`success: false`, `UPSTREAM_ERROR`) so callers can read the upstream error message and cache validators
  - error codes in the W-208 style with `details` and a message that names the limit and the `utils.urlFetch.*` key that changes it
  - optional `rateLimitKey` via `RedisManager.cacheCheckRateLimit()` (fail-open); `req`/`ctx` so the log line says who; caller `AbortSignal`
  - config at `utils.urlFetch` (mirrors `webapp/utils/url-fetch.js`); generous ceilings because the config value is both default and max
  - startup warning when `allowPrivateAddresses` is true in production
  - per-code counters + MetricsRegistry provider
  - demo at `/hello-fetch/` (admin-only + rate-limited endpoint — not an open proxy)
- deliverables:
  - `webapp/utils/url-fetch.js`:
    - `getEffectiveOptions()`, `fetch()`, address classifier, host matching, pinned http(s) transport, redirect loop, streaming byte caps, gzip/deflate/br decode, stall + total timeouts
    - `_deps` injection (`lookup`, `httpRequest`, `httpsRequest`) so tests stay offline
    - Happy Eyeballs `{ all: true }` pin; IPv6 unbracket; redact userinfo on finish
  - `webapp/utils/bootstrap.js`:
    - `global.UrlFetch` after LogController; `checkUrlFetchSafety()`
  - `webapp/app.conf`:
    - `utils.urlFetch` — maxBytes 10 MB, timeoutMs 30 s, stallTimeoutMs 10 s, maxRedirects 5, allowedSchemes, blockedHosts, userAgent, allowPrivateAddresses false, rateLimit
  - `webapp/tests/unit/utils/url-fetch.test.js`:
    - option narrowing both directions; every rejected address range; IPv4-mapped IPv6; punycode homograph vs ASCII allowlist; wildcard host matching; string-form lists; IPv6 bracket literals; `CREDENTIALS_IN_URL` redacts `finalUrl`
  - `webapp/tests/unit/utils/url-fetch-transport.test.js`:
    - Content-Length over cap vs lying Content-Length with oversized body; gzip bomb vs decoded cap; second-hop-resolves-private redirect; redirect limit; 303 downgrade with body dropped; Authorization stripped cross-origin; stall vs total timeout; content-type rejection; `as: 'json'` success and parse failure; non-2xx body still returned; pinned lookup `{ all: true }` shape
  - `webapp/tests/unit/utils/bootstrap.test.js`:
    - production warning when allowPrivateAddresses is true; silent otherwise
  - `docs/url-fetch.md`:
    - call, result, every code, config keys and ceiling semantics, localhost/dev switch, no-egress-proxy limitation
  - `docs/README.md`, `docs/security-and-auth.md`, `docs/genai-instructions.md`, `docs/app-examples.md`, `docs/api-reference.md`, `docs/.markdown`:
    - links / SSRF cross-reference / hello-fetch mention / sidebar listing (no work-item numbers)
  - `site/webapp/view/hello-fetch/index.shtml` + `site/webapp/controller/helloFetch.js`:
    - URL field, method/`as`, effective-limits panel, preset buttons that trip the interesting rejections, extras note + clear extras on URL edit, raw result; API `auth: 'admin'` + rateLimitKey
  - `webapp/view/jpulse-navigation.js`, `webapp/view/home/index.shtml`:
    - conditional hello-fetch entry / home card
  - `webapp/tests/unit/site/hello-fetch-structure.test.js`:
    - page, admin auth, card component, nav entry
- notes:
  - T-083 `widgetChartCore.apiFetch` is in the map site/plugin repo, not here; this item does not migrate it
  - `webapp/controller/health.js` compliance POST stays on raw `fetch()` — it is a fixed jPulse-owned host, not untrusted input
  - no forward/egress-proxy support in v1 (a proxy would move DNS out of the guard); document the limitation
  - `onUrlFetch` plugin hook deferred (tech debt) — logging + metrics cover the audit trail for now
  - caching stays out: caller policy, not a security primitive

### W-214, v1.7.17, 2026-08-22: api: per-route body size limit
- status: ✅ DONE
- type: Feature
- objectives:
  - let one upload endpoint accept a larger JSON/urlencoded body without raising the global parser limit for login and every write API
  - keep the limit next to the route it protects: `{ method, path, handler, auth, bodyLimit: '25mb' }`
- rationale:
  - `middleware.bodyParser.json.limit` is a single global (10mb) mounted before any route; a site that needs 25mb for `POST /api/1/ai/fetch-source` (T-098) would otherwise widen the app's DoS surface
  - a second config key (`maxLimit`) is unnecessary: the site already overrides `app.conf`, and a pre-mounted per-route parser runs first so body-parser skips the global pass (`req._body`)
- features:
  - `bodyLimit` on `static routes` only (`api*` auto-discovery stays on the global default); field order does not matter because discovery reads the live `ControllerClass.routes` array
  - `bodyLimit` is authoritative in both directions (raise or lower) and applies to JSON and urlencoded
  - global `json.limit` / `urlencoded.limit` stay the default (10mb) for undeclared routes, including every framework route in `routes.js`
  - invalid `bodyLimit` is skipped with a startup warning (route keeps the global default); above 25mb also warns (1 GB PM2 worker heap) but is not clamped
  - oversize `/api/*` bodies return HTTP 413 `{ success: false, code: 'PAYLOAD_TOO_LARGE', details: { limit, length } }` instead of Express's HTML default
  - nginx `client_max_body_size` default `27M` — outer gate only, enough for `bodyLimit: '25mb'` plus headroom; Express default remains 10mb
- deliverables:
  - `webapp/utils/body-limit.js`:
    - `parseBodyLimit()`, `mountRouteBodyLimitParsers()`, `handleBodyParserError()`, `BODY_LIMIT_WARN_BYTES` (25mb)
  - `webapp/utils/site-controller-registry.js`:
    - live `ControllerClass.routes` via `_loadLiveStaticRoutes` / `_normalizeStaticRoutes`; regex fallback; `getBodyLimitRoutes()`
  - `webapp/app.js`:
    - pre-mount per-route parsers before the global body-parser; 413 error handler after the router
  - `webapp/app.conf`:
    - comment on `bodyParser.json.limit` / `urlencoded.limit` (default unchanged)
  - `templates/deploy/nginx.prod.conf`:
    - `client_max_body_size 27M` with comment that Express still defaults to 10mb
  - `docs/api-reference.md`:
    - Custom Routes (`static routes`) — `bodyLimit`, 25mb warning, 0.72× base64 rule of thumb, `PAYLOAD_TOO_LARGE`, nginx 27M
  - `docs/genai-instructions.md`:
    - use `static routes` + `bodyLimit` instead of raising the global limit
  - `docs/deployment.md`:
    - nginx outer-gate note; troubleshooting 413
  - `docs/security-and-auth.md`:
    - production checklist: bodyLimit vs global raise; 413 PAYLOAD_TOO_LARGE
  - `webapp/tests/unit/utils/body-limit.test.js`:
    - parse sizes; mount json+urlencoded; no warn at 25mb; warn at 50mb; skip invalid; 413 envelope vs pass-through
  - `webapp/tests/unit/utils/site-controller-registry.test.js`:
    - normalize any field order; skip incomplete objects; `getBodyLimitRoutes` only returns declared limits
- notes:
  - no hello-* demo — this is a primitive; hello-todo POST is `auth: 'none'` and was used for a manual 11mb → 413 check
  - existing `deploy/nginx.prod.conf` copies are not rewritten by configure; sites already deployed need a one-line edit + reload
  - no clamp and no `maxLimit` config key; 25mb is a warning threshold, not a ceiling
  - `api*` methods cannot set `bodyLimit` — use `static routes`

### W-215, v1.7.18, 2026-08-25: plugins: generated static/docs links leak into site git; fix leftover /static/ URL
- status: ✅ DONE
- type: Bugfix
- objectives:
  - site repos must not track generated plugin static or docs links (the actual leak: a new site that follows the docs commits the next non-widget plugin's docs link)
  - docs and comments must describe those links as runtime-only, created on start, wiped by update, recreated on next start
  - the only public plugin-asset URL is `/plugins/{name}/file.png` (`webapp/static` is the HTTP document root); `/static/plugins/...` must not exist
- rationale:
  - `npx jpulse configure` never writes a site `.gitignore`; the only template is the heredoc in `docs/deployment.md` Step 2, which still ignores `site/webapp/app.conf` (wrong since W-172) and says nothing about generated plugin links; the later EXCLUDE list omits them too; `getting-started.md` then says `git add .`
  - framework `.gitignore` already ignores `webapp/static/plugins/*` and `docs/installed-plugins/*`; site installs never get those rules
  - PluginManager creates the links on the startup scan for enabled plugins; `jpulse-update` / configure wipe `webapp/` and recopy `jpulse-docs` (only `.gitkeep` and `installed-plugins/README.md` ship); that is correct if untracked, and looks like "deleted plugin docs" if they were committed
  - `enablePlugin()` / `disablePlugin()` only update `.jpulse/plugins.json` and say restart required; `removePluginSymlink` / `removePluginDocsSymlink` have no callers, so a disabled plugin's assets/docs can still be served after restart
  - site docs-link comments say four `../` levels; from `webapp/static/assets/jpulse-docs/installed-plugins/` the root is five; code uses `path.relative()` so behavior is fine
  - `creating-plugins.md`, `plugin-api-reference.md`, and hello-world `.gitkeep` document `/static/plugins/...`; `plugin-architecture.md` already has `/plugins/{name}/file.png`; no runtime code and neither live site app uses the `/static/plugins/` URL
  - nginx `location /static/` is the same leftover URL model (hard-coded `/opt/jpulse/webapp/static/`, bypasses site overrides); real assets (`/images/`, `/assets/`, `/plugins/`, `/favicon.ico`) never hit it
- features:
  - canonical `templates/site.gitignore` written by configure when `.gitignore` is missing
  - configure and jpulse-update append the plugin-runtime ignore block when a site `.gitignore` exists but lacks it; never overwrite a customized file
  - on startup, create links for enabled plugins and remove leftover static/docs links for disabled or missing plugins
  - public plugin-asset URL documented as `/plugins/{name}/file.png` only
  - nginx template drops `location /static/`; `/plugins/` stays on the catch-all proxy (same as `/images/` and `/favicon.ico`)
- deliverables:
  - `templates/site.gitignore`:
    - full site ignore file: `.env`, `site/webapp/app-secret.conf`, plugin-runtime links, `.jpulse/`, `node_modules/`, logs, editor/OS junk; `app.conf` is committed
  - `bin/site-gitignore.js`:
    - `ensureSiteGitignore(siteRoot, { templatePath })` — write full template if missing (`templatePath` required to create); append the plugin-runtime block if present but missing those patterns; idempotent
    - `hasPluginRuntimeBlock(content)`
  - `bin/configure.js`, `bin/jpulse-update.js`:
    - call the helper; jpulse-update already prints restart — add that plugin static/docs links are recreated on start
  - `webapp/utils/plugin-manager.js` / `webapp/utils/symlink-manager.js`:
    - on scan, create links for enabled plugins; `removeStalePluginSymlinks(enabledNames)` / `_removeStaleInDir` unlink leftovers (keep `.gitkeep` and `README.md`; never delete a real directory)
    - site docs-link comment: five `../` levels (`../../../../../plugins/{name}/docs`)
  - `templates/deploy/nginx.prod.conf`:
    - delete `location /static/ { ... }`
  - `docs/deployment.md`:
    - Step 2 sample and EXCLUDE list match the template (`app.conf` committed, `app-secret.conf` ignored, plugin-runtime links ignored)
    - existing-site note: if a plugin link was already committed, `git rm --cached` those entries, keep `.gitkeep` and `installed-plugins/README.md`, restart
    - drop Apache `ProxyPass /static/ !`
    - restart-after-update note for plugin links
  - `docs/getting-started.md`:
    - ignore file in place before `git add .` (configure writes it)
  - `docs/plugins/plugin-architecture.md`, `docs/plugins/plugin-api-reference.md`, `docs/site-customization.md`:
    - runtime, do not commit; created on start; wiped by update; only `.gitkeep` and `installed-plugins/README.md` are shipped
    - site docs-link path: five `../` levels
    - plugin-asset URL: `/plugins/{name}/file.png` only
  - `docs/plugins/creating-plugins.md`, `plugins/hello-world/webapp/static/.gitkeep`:
    - replace `/static/plugins/...` with `/plugins/{name}/...`
  - tests:
    - `webapp/tests/unit/bin/site-gitignore.test.js`: write-if-missing; append-if-missing; second run is a no-op
    - `webapp/tests/unit/utils/symlink-manager.test.js`: stale-link removal for a disabled plugin; does not delete a real directory
- notes:
  - install / enable / update scripts do not create or commit the links; PluginManager already does that on start
  - do not preserve generated links across jpulse-update; they must stay untracked
  - do not overwrite an existing customized `.gitignore`
  - do not rewrite historical CHANGELOG path comments; mention the five-level correction in this release note
  - existing `deploy/nginx.prod.conf` copies are not rewritten by configure; live sites keep the dead `/static/` block until a one-line delete + nginx reload (harmless if left)
  - out of scope (later item): serve plugin static and docs without writing into framework-managed `webapp/` (virtual `/plugins/{name}` and `/jpulse-docs/installed-plugins/{name}`)

### W-216, v1.7.19, 2026-08-28: markdown: HTML anchors for in-page deep links
- status: ✅ DONE
- type: Feature
- objectives:
  - authors can deep-link to a non-heading target in markdown (table cell, glossary term, figure caption) with a named HTML anchor and `[text](#id)`
  - the target must look like surrounding text, not a dead primary-colored link
  - `.heading-anchor` (W-118) stays styled — those have `href`
- rationale:
  - headings already get GitHub-style ids (W-118); table cells and inline terms do not
  - marked.js already passes raw HTML, so `<a id="public-map">public map</a>` plus `[public map](#public-map)` already jumps in `jPulse.UI.docs`
  - `.jp-markdown-content a` styled every `<a>`, including named targets with no `href`; the jump worked, the target looked clickable and did nothing
  - BubbleMap already ships this as a site override; put it in the framework so sites do not need the override
- features:
  - markdown link CSS applies only to `a[href]` (including `:visited` / `:hover`)
  - `a:not([href])` inherits color, decoration, and cursor from surrounding text
  - document the authoring pattern: raw HTML named anchor + markdown fragment link; unique `id`; works in tables
- deliverables:
  - `webapp/view/jpulse-common.css`:
    - `.jp-markdown-content a[href]`, `a[href]:visited`, `a[href]:hover` (existing theme-primary link rules)
    - `.jp-markdown-content a:not([href])` — `color: inherit; text-decoration: none; cursor: inherit`
  - `docs/markdown-docs.md`:
    - Overview bullet; URL Routing → In-page named anchors (source example + live table); `[text](#id)` stays the link; target is not styled as a link
    - no work-item number in user-facing docs
- notes:
  - no renderer change — `marked.parse()` already keeps the HTML; `_loadDocument` already scrolls to `location.hash`
  - do not add `id` to `utils.common.sanitizeHtml` allowedAttributes — markdown docs do not go through that sanitizer; widening it is a separate security item
  - do not invent a `{#id}` markdown extension; raw HTML is enough and works on GitHub too
  - no new unit tests (CSS-only); verify on any `jPulse.UI.docs` page: target matches cell text, `#id` link stays primary, heading 🔗 still styled
  - sites can drop the BubbleMap-style override in `site/webapp/view/jpulse-common.css` once they take this release

### W-217, v1.8.0, 2026-09-08: controllers: declare routes with streaming request bodies (bodyMode: 'stream')
- status: ✅ DONE
- type: Feature
- objectives:
  - a controller can declare a route whose request body is consumed as a stream, so a large upload never buffers in memory or on disk
  - the absence of a body parser on such a route is guaranteed at boot rather than left to content-type coincidence
  - one byte-cap implementation and one `413` error shape for every consumer
- rationale:
  - a streaming upload route works today only by accident: the global and per-route parsers are content-type matched, so `application/pdf` passes through unread — a future release that sets `type: '*/*'` on the JSON parser would break every streaming upload in production with no test failing
  - base64-in-JSON is the only upload shape the framework offers; it inflates payloads by a third and is bounded by `bodyLimit`, so a 40 MB file is roughly 53 MB of base64 and exceeds the 10mb default, the 25mb comfort ceiling from W-214, and typical nginx limits
  - streaming a request body is a general capability, not a site code one; a site-local helper would repeat the `UrlFetch` mistake that T-100 §11.4 warns about in BubbleMap site
- features:
  - `static routes` entries accept `bodyMode: 'stream'`; `bodyLimit` is the size cap in every mode (`{ bodyMode: 'stream', bodyLimit: '50mb' }`)
  - `bodyMode: 'stream'` without `bodyLimit`, with an unparseable `bodyLimit`, on `GET`/`HEAD`, or with any other `bodyMode` value is a startup throw
  - a skip guard is mounted on the stream route's method+path before the global parsers; it sets `req._body` so body-parser skips without reading a byte (safe even if a later release sets `type: '*/*'`)
  - `mountRouteBodyLimitParsers` skips stream routes; `getBodyLimitRoutes()` omits them
  - boot assertion: every stream route has the skip guard, and no route-scoped body-parser (`json` / `urlencoded` / `raw` / `text`) is mounted on that method+path — global parsers are expected and must skip via `_body`
  - `StreamBody.pipe(req, res, dest)` takes the cap from the route (`req.jpulseStreamMaxBytes`); optional `{ maxBytes }` override; success returns the byte count; over-cap destroys `req` and `dest`, sends the existing `PAYLOAD_TOO_LARGE` envelope, returns `null`
  - `req` reaches the handler unread and still readable, including for `application/json` and urlencoded
  - the 25mb heap warning does not apply to stream routes (bytes go to `dest`, not a buffered JSON object)
- deliverables:
  - `webapp/utils/body-limit.js`:
    - `assertRouteBodyOptions`, `mountStreamBodyGuards`, `assertStreamRouteGuards`; skip stream routes in `mountRouteBodyLimitParsers`
    - export the new symbols beside the existing `parseBodyLimit`, `mountRouteBodyLimitParsers`, `handleBodyParserError`
  - `webapp/utils/stream-body.js` (new):
    - `StreamBody.pipe(req, res, dest, options?)`, counting bytes and reusing the `handleBodyParserError` `PAYLOAD_TOO_LARGE` envelope
  - `webapp/utils/site-controller-registry.js`:
    - normalize `bodyMode`; `getBodyModeRoutes()` / `getStreamBodyRoutes()`; `getBodyLimitRoutes()` excludes stream routes
  - `webapp/app.js`:
    - mount skip guards, then per-route parsers, then global parsers, then the boot assertion
  - `webapp/utils/bootstrap.js`:
    - `global.StreamBody`
  - `docs/api-reference.md`:
    - Streaming Routes subsection next to `### Custom Routes (`static routes`)` — declaration, three-line handler, 413 envelope, raw body not multipart, caller unlinks a partial `dest` after 413, nginx still buffers until a streaming location is applied
  - `docs/genai-instructions.md`:
    - stream uploads use `bodyMode: 'stream'` + `bodyLimit`, never raise the global parser
  - `docs/security-and-auth.md`:
    - production checklist: large raw file uses `bodyMode: 'stream'` + `bodyLimit`
  - `docs/deployment.md`:
    - 413 troubleshooting: a stream route's `bodyLimit` is also a cap
  - tests:
    - `webapp/tests/unit/utils/body-limit.test.js`: skip guard; boot assertion; `req` readable for `application/pdf`, `application/json`, and urlencoded
    - `webapp/tests/unit/utils/stream-body.test.js`: pipe byte count; over-cap `413` / `PAYLOAD_TOO_LARGE`; `Content-Length` over cap rejected before write
    - `webapp/tests/unit/utils/site-controller-registry.test.js`: normalize `bodyMode`; `getStreamBodyRoutes`; `getBodyLimitRoutes` omits stream routes
    - startup throws: stream without `bodyLimit`; invalid `bodyLimit`; unknown `bodyMode`; `GET`/`HEAD` + stream
- notes:
  - `bodyLimit` on a stream route accepts the same size strings as the parser path; `parseBodyLimit` and `SIZE_UNITS` in `body-limit.js` already handle `b` / `kb` / `mb` / `gb`
  - on 413, `pipe` destroys `dest` but does not unlink a partial file — the caller must
  - required by BubbleMap T-117 Phase 1 (file attachments); `package.json` declares this as the framework floor
  - this item alone does not deliver end-to-end streaming — nginx buffers the request body by default until W-219's location block is applied

### W-218, v1.8.1, 2026-09-09: controllers: CommonUtils.sendStream response with range requests and RFC 5987 filenames
- status: ✅ DONE
- type: Feature
- objectives:
  - one helper streams a file-like response with correct headers, range support, conditional requests, and a filename that survives non-ASCII characters
  - a client disconnect tears down the upstream stream instead of leaking it
  - the careless call is the safe call: an unknown byte stream never renders in the site's origin by default
- rationale:
  - `webapp/utils/common.js` exports `sendError` but has no streaming response helper, so every controller that serves bytes reinvents the headers
  - two details are easy to get wrong once per controller and right once in the framework: a disconnect must destroy the upstream stream, and a non-ASCII `Content-Disposition` filename needs RFC 5987 `filename*=UTF-8''…` beside the ASCII fallback or a German or Japanese document downloads with a mangled name
  - range requests are what make a large stored PDF seekable in a browser viewer instead of a full re-download on every jump
  - a `Range` cannot be answered from an already-open full-length stream without reading and discarding bytes, so the helper has to be handed something it can open *after* it has parsed the header - that is why the third argument is a factory rather than a stream
  - without a validator, a resource that changes between two range requests silently assembles into a corrupt file on the client; `If-Range` is the only thing that turns that into a clean full re-fetch
  - `inline` on caller-supplied bytes is a stored-XSS vector - an uploaded `.svg` or `.html` runs script in the site's own origin with the visitor's cookies - and Express sets no `X-Content-Type-Options`, only the nginx config does, so `npm start` and any non-nginx deployment sniff
  - `res.sendFile` already covers on-disk paths with ranges and validators; this helper is for bytes that have no path (GridFS, S3, a DB blob, decrypt-on-read, generated output) and has to say so or it ships as a weaker `sendFile`
- features:
  - `CommonUtils.sendStream(req, res, source, options)` returning `Promise<{ status, aborted }>`
  - `source` is one of three shapes, and only the seekable ones advertise ranges:
    - `({ start, end }) => Readable` - factory, `end` inclusive (same convention as `fs.createReadStream`); ranges served when `size` is known
    - `Buffer` - `size` inferred, ranges served by slicing
    - `Readable` - sent as-is, `Range` ignored, no `Accept-Ranges`
  - `options`: `mimeType`, `size`, `filename`, `disposition`, `cacheControl`, `etag`, `lastModified`
  - `Content-Type` from `mimeType`, else inferred from the `filename` extension via `utils.sendStream.contentTypes`, else `application/octet-stream`
  - `Content-Disposition` omitted when there is no `filename`; with a `filename` it defaults to `attachment` and carries both the ASCII fallback and the RFC 5987 `filename*=UTF-8''...` form; `inline` is opt-in per call
  - `X-Content-Type-Options: nosniff` on every `sendStream` response, and framework-wide through `middleware.setHeaders` so it is not only the byte routes that stop sniffing
  - a selectable CSP variant carrying `frame-ancestors 'self'`, so a site can embed an `inline` PDF in its own page without hand-copying the whole CSP string
  - `Accept-Ranges: bytes` only when a range could actually be served
  - `Content-Length` from `size`, `Cache-Control` only when the caller passes one
  - conditional requests, evaluated in RFC 7232 precedence order:
    - `If-None-Match` against `etag` gives `304` with no body
    - `If-Modified-Since` against `lastModified`, only when there is no `If-None-Match`, gives `304`; compared at whole-second granularity so a timestamp carrying milliseconds does not spuriously `200`
    - `If-Range` mismatch drops the `Range` and sends the full `200`; a weak `etag` (`W/"..."`) never matches
  - `etag` is quoted for the caller when it is not already; `lastModified` accepts a `Date`, epoch ms, or a parseable string and is emitted as an HTTP-date
  - range handling, single range only:
    - `bytes=0-499`, `bytes=500-`, `bytes=-500` give `206` with `Content-Range` and a `Content-Length` of the slice
    - an `end` past the last byte clamps to `size - 1` and still answers `206` - it is satisfiable, not an error
    - a `start` at or beyond `size`, and any range against `size: 0`, gives `416` with `Content-Range: bytes */size` and an empty body, as a plain HTTP response and not a `sendError` JSON envelope
    - a malformed or multi-range header is ignored and answered `200`
  - `HEAD`, `304`, and `416` send headers with no body and never invoke the factory; a `Readable` handed in and left unused is destroyed
  - the response is piped with `stream/promises.pipeline`, so a dead client destroys the source; teardown is observed on the `res` `close` event, not the `req` `aborted` event that Node 24 deprecates
  - a client disconnect resolves with `aborted: true` rather than rejecting - a visitor closing a tab is not an error every caller has to catch
  - a `source` error before headers rejects so the caller can log it; after headers it destroys the response, since no error envelope is possible any more
  - calling with headers already sent throws a programmer error instead of corrupting the response
  - no logging inside the helper, matching `sendError`
- deliverables:
  - `webapp/utils/send-stream.js` (new):
    - `sendStream`, plus the internal range parser, conditional-request evaluator, and `Content-Disposition` builder
  - `webapp/utils/common.js`:
    - `static sendStream()` delegating to `send-stream.js`, and in the named export list next to `sendError`
  - `webapp/app.conf`:
    - `utils.sendStream.contentTypes` - extension to MIME map covering office and workplace formats (`.xlsx`, `.docx`, `.pptx`, `.vsdx`, legacy `.xls` / `.doc` / `.ppt` / `.vsd`, OpenDocument `.odt` / `.ods` / `.odp`), documents and text (`.pdf`, `.rtf`, `.csv`, `.txt`, `.md`, `.xml`), archives (`.zip`, `.7z`, `.gz`, `.tar`), audio and video (`.mp4`, `.webm`, `.mp3`, `.wav`), images (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`, `.heic`, `.svg`), and mail (`.eml`)
    - self-contained rather than shared with `controller.view.contentTypes`: a util must not read a controller's config namespace, and `.vsdx` has no business in a view-asset map
    - `middleware.setHeaders.availableHeaders` gains `X-Content-Type-Options: nosniff`, and `middleware.setHeaders.headers` lists it by default
    - `middleware.setHeaders.availableHeaders` gains a `Content-Security-Policy-Frameable` alias, the shipped CSP with `frame-ancestors 'self'` in place of `'none'`
  - `webapp/app.js`:
    - the `setHeaders` middleware accepts an `availableHeaders` entry as either a plain value (current shape, key is the header name) or `{ header, value }`, so an alias key can select a variant of a header it does not share a name with - without this, an alias key is emitted verbatim as a bogus header name
  - `docs/security-and-auth.md`:
    - `nosniff` now on by default; the `Content-Security-Policy-Frameable` alias and when a site wants it
  - `docs/api-reference.md`:
    - `sendStream` subsection next to Streaming Routes, where `StreamBody.pipe` is already documented - the three `source` shapes, the option table, the decision rule against `res.sendFile`, and the `inline` caveat for caller-supplied bytes
  - `docs/genai-instructions.md`:
    - serve bytes with `CommonUtils.sendStream` instead of hand-rolling the headers; `res.sendFile` stays the answer for a plain on-disk path
  - tests:
    - `webapp/tests/unit/utils/send-stream.test.js`: no-range `200`; `bytes=0-499` / `bytes=500-` / `bytes=-500` giving `206` with correct `Content-Range` and `Content-Length`; a clamped `end` still `206`; `start` past `size` and any range on `size: 0` giving `416`; malformed and multi-range answered `200`; `HEAD` with no body and the factory never called; `If-None-Match` giving `304`; `If-Modified-Since` at second granularity; `If-Range` mismatch giving the full `200`; a weak `etag` never matching `If-Range`; disconnect destroying the source and resolving `aborted: true`; `Bericht München.pdf` carrying both `filename` and `filename*=`; `mimeType` inferred from the extension; default disposition `attachment`; `nosniff` present; a plain `Readable` ignoring `Range` and omitting `Accept-Ranges`; headers-already-sent throwing
    - `webapp/tests/integration/send-stream.test.js`: the range, `304`, and `416` paths over real HTTP with `supertest`, where Node enforces `Content-Length` and suppresses a `304` body - the things a mocked `res` cannot catch
    - `webapp/tests/unit/utils/set-headers.test.js`: an `availableHeaders` alias entry emits its mapped header name, a plain entry still emits the key
- notes:
  - decision rule for the docs: a plain file at a path the app controls goes to `res.sendFile` (Express `send` already does ranges, `ETag`, `Last-Modified`, `If-Range`, `304`); bytes with no path go to `sendStream`
  - `size` must be the exact byte length - `Content-Length` is set from it, and a source that under-delivers hangs the request
  - `etag` is the caller's to compute: a content hash for content-addressed storage, or something like `"<id>-<mtime>-<size>"` for a mutable document; the helper cannot hash a stream it has not read
  - `inline` stays available for every type rather than deny-listed for `.svg` / `.html`: `attachment` by default plus `nosniff` already covers the careless caller, and a deny-list would block a caller with a legitimate SVG for no gain - the risk is documented instead
  - the CSP alias is what makes the `inline` PDF rationale actually reachable: the header middleware is a global `app.use` with no path filter, so a byte response carries the shipped `frame-ancestors 'none'` and the browser refuses to frame it even same-origin; worth confirming in a real browser once implemented, since a PDF.js viewer that fetches and paints to canvas is unaffected and only the `<iframe>` / `<embed>` path needs the alias
  - out of scope: `multipart/byteranges` for multi-range requests, and `ETag` generation
  - no new global needed - `CommonUtils` is already on `global`, unlike W-217's `global.StreamBody`
  - adoption is site-side; the framework has no byte-serving route of its own to migrate, so there is no in-repo before/after to diff
  - needed by BubbleMap T-118 (large and resumable uploads, range reads); T-117 ships without ranges, so this does not block it
  - W-219 stays a later, separate release: this item ships against nginx defaults; `proxy_request_buffering` / `proxy_buffering` / the upload rate-limit zone are not in scope here

### W-219, v1.8.2, 2026-09-09: deploy: nginx streaming location and a dedicated upload rate-limit zone
- status: ✅ DONE
- type: Chore
- objectives:
  - a jPulse site that streams an upload gets a working nginx location from the scaffold instead of discovering the problem in production
  - the deployment guide explains why `proxy_request_buffering off` matters and how the rate-limit zones interact with chunked uploads
- rationale:
  - nginx defaults `proxy_request_buffering` to `on`, so it buffers the entire request body before forwarding — which silently defeats W-217 and reintroduces a size ceiling; the failure mode is invisible, in that everything works and nothing streams
  - the scaffolded `deploy/nginx.prod.conf` carries no `proxy_request_buffering` directive at all, so every site is currently on the buffering default
  - the part count is not what trips the shipped `/api/` zone (`rate=10r/s burst=20 nodelay`): `limit_req` is a leaky bucket that refills at `rate`, so any one-second window allows roughly `burst + rate` requests, and a chunked upload spreads its parts out regardless — 13 parts of 8 MB over a ~9 second upload is about 1.4 r/s against a 10 r/s budget
  - what justifies a dedicated zone is isolation: uploads otherwise draw on the same per-IP bucket as the page's status polls and saves, so one large upload degrades the rest of the session, and a NAT'd office with several concurrent uploaders is a realistic `429`; the zone costs one line, since the separate `location` is required for buffering and timeouts either way
  - sustained throughput per IP is `rate × part size` — 10 r/s at 8 MB parts is 80 MB/s, above any real uplink, while 10 r/s at 1 MB parts is 10 MB/s and throttles a gigabit client — which is the rule that tells a site which knob to turn: `rate` for small parts, `burst` only to absorb clumps from parallel parts and retries
  - this is not a BubbleMap insight; any jPulse site that streams an upload needs it
- features:
  - a commented, disabled-by-default `location ^~ /api/1/your-upload-prefix/` in the scaffolded nginx config with `proxy_request_buffering off`, `proxy_buffering off`, `client_max_body_size 100M`, `proxy_http_version 1.1`, and `proxy_send_timeout` / `proxy_read_timeout` `300s` — no `Upgrade` / `Connection` pair
  - a live `limit_req_zone` for uploads (`rate=10r/s`) applied with `burst=50 nodelay` and `limit_req_status 429` inside that location, with the isolation / `rate × part size` reasoning spelled out in a comment so it is not tuned away
  - a four-step uncomment checklist above the block (path must be a longer prefix than `/api/`; `^~` stops a later regex from pulling the path back onto buffered `/api/`)
  - deployment guide prose beside the existing `client_max_body_size` guidance, a pointer from the existing `429` and `413` troubleshooting sections, and a one-sentence `limit_conn` note
- deliverables:
  - `templates/deploy/nginx.prod.conf`:
    - live `uploads` zone; commented streaming location before `location /api/`
  - `docs/deployment.md`:
    - streaming uploads and downloads subsection near the existing `client_max_body_size` paragraph; notes in the `429` and `413` troubleshooting sections
  - `docs/security-and-auth.md`:
    - zones table updated from four zones to five (`uploads` defined in the scaffold, applied only by the optional location)
  - `docs/api-reference.md`:
    - pointer from the existing "nginx still buffers" sentence, and a matching `proxy_buffering` / timeout note on `sendStream`
- notes:
  - the scaffold `client_max_body_size` stays `27M` (W-214's 25mb comfort max plus headroom); BubbleMap's `35M` is a site raise, not a stale framework default — docs now say "the current scaffold's default" and that `configure` never rewrites a live `deploy/nginx.prod.conf`
  - no code dependency: a site can apply the location block by hand before taking the release, which is why this is not a floor for any BubbleMap phase
  - stays a later, separate release from W-218 (one work item per version); W-218 ships first against nginx defaults
  - scaffold path confirmed: `templates/deploy/nginx.prod.conf`, and `templates/` is in `package.json` `files`
  - the download direction belongs here too: `proxy_buffering off` on the same commented location, plus a note that `/api/`'s `proxy_read_timeout 30s` is tight for a slow first byte from GridFS or S3; a site copies the block onto its own byte-serving paths (the framework has none)
  - `limit_conn` is named in the deployment subsection only — nothing shipped

### W-220, v2.0.0, 2026-09-14: jPulse.UI: new floatPanel widget - draggable, resizable, persisted floating panels
- status: ✅ DONE
- type: Feature
- objectives:
  - add `jPulse.UI.floatPanel` to `jpulse-common.js`: a non-modal panel the user can drag, resize, and leave open while working the page underneath, which remembers its geometry and open state per browser, takes its place in a managed z-order stack with other panels, and animates to and from a launcher button
  - one widget that works unchanged in a jPulse MPA page and in a Vue SPA component, so a site does not fork the implementation per architecture: pass an element and the widget owns its position styles, omit it and the widget owns nothing and hands back a rect
  - absorb the entire panel lifecycle - load, clamp, persist, raise, stack, animate, drag, resize, mobile fallback - not only the geometry math, so a consumer writes one `create()` call instead of re-implementing a lifecycle
  - replace a two-panel z-order special case with an N-panel stack, so adding a third panel to a page needs no new code
- rationale:
  - the framework has no floating panel primitive. Every widget today is in-flow (`tabs`, `accordion`, `collapsible`), modal (`dialog`), or transient (`toast`). A panel that is none of those - movable, resizable, non-modal, and persistent across page loads - is a real gap, and the kind of UI that is invariably built badly once per site
  - BubbleMap has already built it twice: `site/webapp/view/map/map-canvas-ai.tmpl` lines 18-340 and `site/webapp/view/map/map-canvas-chat.tmpl` lines 14-298 are two ~290-line blocks that differ only in method prefix (`ai` vs `chat`), `localStorage` key, `$refs` names, and CSS class names - the same double-`requestAnimationFrame` ghost animation with the same `transitionend`-plus-timeout safety net, the same 300ms debounced persist, the same drag and resize wiring. Its shared `map-canvas-panel.tmpl` (204 lines) already factors out the geometry; the lifecycle stacked on top of it is what is still written twice
  - stack order there is a hardcoded pair: `_panelIsFront('ai' | 'chat')` compares two `lastActiveAt` values against a fixed `Z_BACK` / `Z_FRONT` / `Z_GHOST` triple. Order belongs in a registry keyed by last-active time, which costs the same to write and does not cap the panel count at two
  - BubbleMap unit-tests its browser-side panel logic by reading the `.tmpl`, stripping Handlebars with a regex, and evaluating the result in a Node `vm` context with a stubbed `window`. Moving the code into `jpulse-common.js` does not make that harness go away - `webapp/tests/unit/utils/jpulse-ui-widgets.test.js` does the same thing, reading `jpulse-common.js` with `fs.readFileSync`, regex-replacing its `{{i18n.view.ui.*}}` literals, and evaluating it in a JSDOM window. What the move does buy is one harness for one panel instead of one per site per panel, tested against the framework's own JSDOM setup rather than a hand-stubbed `window`, and geometry and stack logic that is unit-testable without a template at all
  - the panel is also the floor for the planned AI agent framework, whose chat UI is a floating panel. Shipping the panel on its own first proves the MPA/SPA contract against something far simpler than a streaming chat surface, and leaves a widget that is independently useful to any site
- features:
  - `create(options)` returns a handle; the widget is state-first, computing a rect and a z-index and only optionally applying them:
    - uncontrolled (MPA): pass `el` (element or selector) and the widget writes `left` / `top` / `width` / `height` / `z-index` and toggles state classes
    - controlled (SPA): omit `el` and pass `onChange(rect, meta)`; the widget touches no DOM and the component binds `:style="panel.style()"`
    - the widget never adds or removes child nodes in the panel body, and never stashes state on the element - deliberately unlike `jPulse.UI.accordion`, which injects an arrow `<span>` into headers and sets `element._jpAccordionConfig`; both fight a virtual DOM, and both are why a naive port of that pattern would not survive inside a Vue component. The one exception is `resizeHandles.mode: 'inject'` (MPA only), which appends handle nodes to `el`
  - options: `id`, `el`, `launcher`, `storageKey` (default `jp:floatPanel:<id>`), `group` (default `'default'`), `defaults` (`{ x, y, w, h, open }`), `minWidth` / `minHeight`, `margin`, `topOffset` (CSS variable name or number, default `--jp-header-height`), `cascade`, `dragHandle`, `dragIgnore`, `resizeHandles` (`{ mode: 'inject' | 'manual', dirs }`), `mobile` (`{ breakpoint, mode, heightRatio, exclusive }`), `animate` (`{ durationMs }`), `persistDebounceMs`, `autoResize`, `storage` (adapter), `nextTick`, and the `onChange` / `onOpen` / `onClose` / `onRaise` callbacks
  - handle: `open()` and `close()` returning promises that settle after the animation, `toggle()`, `raise()`, `hardClose()`, `isOpen()`, `isFront()`, `getRect()`, `setRect()`, `reclamp()`, `startDrag(evt)`, `startResize(evt, dir)`, `style()`, a readable `state`, and `destroy()`
  - module level: `get(id)`, `list()` (open panels, front-most first), `front()`, `closeFront()` for an Escape handler, and `reclampAll()`
  - launcher ghost animation is built in and driven by the `launcher` option: a ghost `<div>` appended to `document.body` transitions between the launcher's bounding rect and the panel's, with the double-`requestAnimationFrame` commit that makes the transition actually fire, a `transitionend` listener plus a timeout safety net, and an automatic bypass under `prefers-reduced-motion`. Appending to `document.body` puts the ghost outside any component-managed subtree, which is what makes it safe in both modes. With no launcher, or a launcher reference that has gone away, it falls back to a center-scale animation
  - the launcher button itself stays the consumer's to render, style, and label - the widget only reads its rect for the animation and returns focus to it on close. The framework still ships `jp-float-panel-launcher` CSS and an unread-dot convention so a consumer does not have to invent one
  - `cascade: true` offsets a panel that would otherwise open exactly on top of one already at the default position, replacing BubbleMap's hardcoded `{ offsetX: -48, offsetY: -48 }`
  - mobile: below `mobile.breakpoint` the panel becomes a bottom sheet at `mobile.heightRatio` of the viewport with a **4px side inset** (enough to see the page as background, not a gutter) and drag and resize suppressed, and `mobile.exclusive` closes the other open panels **in the same `group`** when one opens - group-scoped rather than global, so a page with an inspector and two chat panels can have two independent policies
  - z-order comes from a documented band assigned by `lastActiveAt`: panels 940-979 and the ghost at 985. Verified free - nothing in `jpulse-common.css` occupies 907-998. The band sits above the sidebar (895-897) and the `jp-tabs` elevation (900-906), and below toast messages (999), the site header (1000), the `jpSelect` dropdown (1200), and dialogs (2000+). Toasts deliberately paint over a panel; panels clamp below the header anyway via `topOffset`, so they never need to paint over it; and a dialog opened from a panel always covers it
  - accessibility: non-modal, so no focus trap; `role="dialog"` with a consumer-supplied label, Escape closes the front panel, focus returns to the launcher on close. Programmatic focus goes to the panel element (`tabindex="-1"`, no visible `:focus` / `:focus-visible` ring) on open and on a click of the header or body, so arrow keys can nudge it; interactive children (close, links, inputs, resize handles) keep their own focus. Headings inside `.jp-float-panel` and `.jp-dialog` are skipped by `headingAnchors._addLinks()` / `_ensureHeadingIds()` so a panel title does not grow a 🔗 icon
  - `reclamp()` on a viewport resize preserves distance from the nearer edge, then clamps, so panels do not walk toward the top-left over repeated shrinking
  - `open()` / `close()` during an in-flight animation queue; last action wins. Resolving immediately would drop a launcher click that races the close animation
  - Escape yields to an open dialog, and this needs its own handler rather than ordering. The framework has no central Escape registry: `jPulse.UI.showDialog()` adds a per-dialog `document` keydown listener when the dialog opens and removes it on close, and `jPulse.UI.navigation` adds a permanent one for the mobile menu; none calls `stopPropagation()`. Same-target listeners fire in registration order, so a panel listener registered at `create()` time fires *before* a dialog opened later - ordering cannot express "dialogs win". So the panel's own listener returns early when `document.querySelector('.jp-dialog-show')` matches, the class `showDialog()` sets on both overlay and dialog. One listener is shared by all panels and calls `closeFront()`
  - MPA markup contract - the widget decorates existing markup rather than generating it: `.jp-float-panel` with `.jp-float-panel-header[data-jp-panel-drag]`, `.jp-float-panel-title`, `.jp-float-panel-header-btn[data-jp-panel-close]`, and `.jp-float-panel-body`; state classes `--mobile`, `--dragging`, `--resizing`, `--front`
- deliverables:
  - `webapp/view/jpulse-common.js`:
    - new `jPulse.UI.floatPanel` object placed after collapsible and before accordion, structured in two layers: a closure-scoped headless engine (load, save, clamp, cascade, drag, resize, ghost) with no DOM-framework dependency, and the `create()` / handle surface over it. `_engine` is exposed (underscore-prefixed) so unit tests call the headless layer directly
    - `headingAnchors._addLinks()` and `_ensureHeadingIds()` skip headings inside `.jp-float-panel` and `.jp-dialog`
    - module-level panel registry with the stack functions and a single shared `window` resize listener rather than one per panel
    - one shared document Escape listener calling `closeFront()`, which returns early while `.jp-dialog-show` is present so an open dialog wins
  - `webapp/view/jpulse-common.css`:
    - `.jp-float-panel` and its header / title / body / resize-handle / ghost / launcher classes and state modifiers, all colors from `--jp-theme-*`
    - `--jp-float-panel-anim-ms` (default 300ms) as the animation duration, themeable and overridable per panel by `animate.durationMs`
  - `webapp/translations/en.conf`, `webapp/translations/de.conf`:
    - `view.ui.floatPanel.*` strings for the close button, the resize handles, and the drag-handle keyboard hint
  - `webapp/view/jpulse-examples/ui-widgets.shtml`:
    - new `2.4 Floating Panel Widget` demo under "Buttons, Dialogs, and Notifications" - two panels with launchers, showing stacking, cascade, persistence across reload, and the mobile sheet at a narrow viewport. The two `<aside>`s are hoisted to `document.body` because the example tab panel's `transform` traps `position: fixed`. Reset positions clears the two `localStorage` keys, destroys the instances, and reloads (panels stay closed because `defaults.open` is `false`)
  - `docs/jpulse-ui-reference.md`:
    - new `## Floating Panel Widget` section after `## Dialog Widgets`, matching the existing structure: basic usage, HTML structure, `create()` option table, handle and module API reference, the MPA versus SPA contract with a Vue example, the z-index band, and features
  - `webapp/tests/unit/utils/jpulse-ui-float-panel.test.js` (new) - sibling of `jpulse-ui-widgets.test.js`, reusing its JSDOM-plus-regex harness; `tests/unit/controller/` is for server controllers, not client widgets:
    - `loadState` defaults when storage is empty, malformed, or throws; `saveState` round-trips `x` / `y` / `w` / `h` / `open` / `lastActiveAt`; the legacy `openedAt` key still reads as `lastActiveAt`
    - `clamp` honors `minWidth` / `minHeight`, the `margin` on all four sides, and `topOffset` from the CSS variable; a null `x` / `y` places the panel bottom-right; a viewport smaller than the minimum still yields a usable rect
    - `cascade` offsets only when another panel already occupies the default position
    - drag moves by pointer delta and re-clamps; `dragIgnore` suppresses a drag started on a header button; a non-primary button does not drag; mobile suppresses both drag and resize
    - resize in all eight directions, with `nw` / `n` / `w` moving the origin as the size shrinks and stopping at the minimum
    - stack: `list()` orders by `lastActiveAt`, `raise()` re-orders, `front()` and `closeFront()` pick the front-most, z-indices stay inside the documented band
    - `mobile.exclusive` closes only same-group panels
    - Escape closes the front panel, and is a no-op while a `.jp-dialog-show` element is in the document
    - controlled mode: `onChange` fires with the rect and the element is never touched; uncontrolled mode writes the styles
    - `open()` and `close()` resolve after the animation, resolve immediately under `prefers-reduced-motion`, and `hardClose()` removes an in-flight ghost
    - `destroy()` removes listeners and the registry entry
    - mobile sheet uses a 4px side inset; programmatic focus lands on the panel (not the header); clicking header or body refocuses the panel; clicking close does not steal focus
  - `webapp/tests/unit/utils/jpulse-ui-heading-anchors.test.js`:
    - headings inside `.jp-float-panel` and `.jp-dialog` get neither a 🔗 nor an auto-generated id
  - `README.md`, `docs/README.md` — Latest Release Highlights — v2.0.0 / W-220 bullet
  - `docs/CHANGELOG.md` — v2.0.0 / W-220 section
- notes:
  - scope decisions settled during design: the ghost animation is built into the widget rather than left to the consumer, because it is the single largest duplicated block in BubbleMap today (~80 identical lines per panel); the launcher is reference-only; and the mobile sheet with a group-scoped `exclusive` flag is in scope, because both BubbleMap panels already need it
  - open state persists across page loads and the panel reopens on init, matching BubbleMap's current behavior. This is the surprising default, so the docs call it out and `defaults.open` plus a `false` in storage are both honored
  - persistence is `localStorage` only - panel geometry is device-specific, and syncing it to a server-side user preference would be wrong more often than right. The `storage` adapter option covers a site that disagrees
  - i18n in `jpulse-common.js` is inline Handlebars - 23 `{{i18n.…}}` expressions today, no runtime `window.i18n` lookups - and the unit-test harness regex-replaces each one before evaluating the file. So every `view.ui.floatPanel.*` string added to the widget needs a matching replacement line in the test. Keep the widget's string count small for that reason: the close button, the eight resize-handle labels as one parameterized string, and the drag-handle keyboard hint
  - two details left to settle while implementing: whether `reclamp()` on a viewport resize should preserve the panel's distance from its nearest edge instead of clamping absolutely (BubbleMap clamps absolutely, which walks panels toward the top-left over repeated shrinking), and whether `open()` called during an in-flight animation should queue or resolve immediately
  - out of scope: docking and snap-to-edge, maximize and restore, panel tabbing or grouping into one frame, multi-monitor or popped-out windows, and a server-side geometry preference
  - the framework has no in-repo consumer to migrate; the demo page on `/jpulse-examples/ui-widgets.shtml` is the reference implementation, the same role it plays for the other widgets
  - prerequisite for the planned AI agent framework: its chat panel is a floating panel, and this item is the floor for that work. BubbleMap adopts the widget in its own repository after the framework release lands, collapsing `map-canvas-panel.tmpl` and roughly 580 lines of duplicated lifecycle into two `create()` calls, and retiring the `vm`-sandbox panel test

### W-221, v2.0.1, 2026-09-15: plugins: bundle build and installation
- status: ✅ DONE
- type: Feature
- objectives:
  - let one npm package expand into several `plugins/<name>/` directories on install, so a site can install a related set of plugins in one command without the installer assuming one `plugin.json` per package
  - let `dependencies.plugins` resolve to an installable npm package name, so installing a plugin that needs another plugin can fetch it (or tell the admin which package to install) instead of only refusing at enable time with `Missing required dependency: <name>`
- rationale:
  - plugin install (`bin/plugin-manager-cli.js`) is one package → one `plugin.json` → one `plugins/<name>/` copy. That matches `auth-mfa` / `auth-oauth`. It does not match a bundle whose members are useless or undemonstrable alone (the AI design's `@jpulse-net/plugin-ai-core` ships `ai-core` + `ai-mock` in one package; `hello-ai` is a view inside `ai-core`, not a third plugin)
  - `dependencies.plugins` is already used by `resolveLoadOrder()`, `enablePlugin()`, and `disablePlugin()`. It is never used to *fetch*. A site that installs only the dependent plugin gets a correct enable refusal and no package name. `plugin.json` already has `npmPackage` for the plugin itself; a dependency that lives *inside a bundle* is not that plugin's own package (e.g. `ai-core` is installed by installing `@jpulse-net/plugin-ai-core`)
  - bootstrap is not the gap. Load order, enable/disable integrity, and site-controller-before-plugin hook registration are already handled (W-223 design §5.1.1). This item does not change those paths
  - plugin and site translation merge is W-222 (v2.0.2), not this item. A bundle can ship `webapp/translations/` files in v2.0.1; they are inert until W-222
  - none of this is AI-specific. W-223 needs it to *ship* a bundle, not to develop one. The fixture that proves the installer is a pair of dummy plugins, not `ai-core`
- features:
  - install shape, detected from the fetched or local source root after today's `plugin.json` validation:
    - **single plugin (unchanged):** a root `plugin.json` and no `plugins/*/plugin.json` - copy to `plugins/<name>/` as today
    - **bundle:** one or more `plugins/<name>/plugin.json`, and **no** root `plugin.json` - copy each member to `plugins/<name>/`, register each, honor each member's `autoEnable`
    - **both shapes in one package:** install fails with a message that says pick one. Silent "prefer bundle" would hide a misplaced `plugin.json`
  - `npx jpulse plugin install <source>` walks the shape. Local-path install of a bundle directory works the same as npm. `--force` overwrites each member. A bundle that is already half-installed (one member present) still installs the rest unless `--force` is needed for a conflict
  - `npx jpulse plugin update` of a bundle package (identified by `npmPackage` on any installed member, or by the package name the user passed) re-fetches and re-expands every member. Updating a single member by plugin name updates only that directory when its `npmPackage` is itself (today's `auth-*` case)
  - `npx jpulse plugin remove` stays per plugin name. Members of a former bundle are independent once installed; removing one does not remove the others
  - bundle *build* is declared, not passed as flags. One member is the **primary**: it names the companions in its own `plugin.json`, and publishing it publishes the bundle. Members stay ordinary sibling directories in `plugins/` during development - there is no separate source layout to maintain, and no build step for a single plugin:
    ```
    plugins/demo-primary/plugin.json    name: demo-primary
                                        npmPackage: @jpulse-net/plugin-demo-primary
                                        version: 1.0.0
                                        bundle: { members: ["demo-secondary"] }
    plugins/demo-secondary/plugin.json  name: demo-secondary
                                        npmPackage: @jpulse-net/plugin-demo-primary
    ```
  - `npx jpulse plugin publish demo-primary` sees `bundle.members`, so instead of publishing that one directory it assembles a temp tree - `package.json` at the root (the primary's, or generated from its `plugin.json` when absent), plus `plugins/demo-primary/` and `plugins/demo-secondary/`, and **no root `plugin.json`** - then runs `npm publish --ignore-scripts` from it. `--ignore-scripts` is required: the primary's `package.json` is the package root of that temp tree, so without the flag its `prepack` would fire again in a directory where the relative CLI path does not exist. `publish demo-secondary` is refused with a message naming the primary
  - a companion carries **no** `package.json` into the published package. During development it may keep a `private` `package.json` whose only job is a `prepublishOnly` script that refuses and names the primary (npm runs that script even when `private` is true, so the message appears instead of a bare `EPRIVATE`). Staging strips that file from the packaged copy, because `installPluginRuntimeDependencies()` runs `npm install` in any installed plugin directory that has a `package.json`
  - **plain `npm publish` from the primary directory must ship the same bundle shape.** npm builds its tarball file list after `prepack` runs, so a bundle primary's `package.json` is wired with `"files": ["plugins"]` plus `prepack` / `postpack` scripts that call `jpulse plugin stage-bundle` / `unstage-bundle`. `prepack` copies the primary and every companion into a temporary `plugins/` directory inside the plugin (skipping that staging directory so the copy cannot recurse, and deleting any stale `plugins/` first). `postpack` removes it, but only when the children match this bundle - a plugin that legitimately ships a `plugins/` directory is never destroyed. `"files": ["plugins"]` keeps the primary's root `plugin.json` out of the tarball; a package containing both shapes is refused at install time. Without this wiring, `npm publish` silently ships the primary alone. `npx jpulse plugin publish` warns when it sees an unwired bundle primary, and does not depend on the scripts itself
  - in a site, `jpulse` resolves from `node_modules/.bin` because npm puts every ancestor `node_modules/.bin` on `PATH`. Inside the framework repo there is no such link, so the primary uses the same relative form the plugin docs already use for bump-version: `node ../../bin/jpulse-framework.js plugin stage-bundle`. Verify with `npm pack` (and `npm publish --dry-run`) before a real publish - both run `prepack` and both work with `"private": true`
  - `npx jpulse plugin publish <name> --dry-run` assembles and prints the tree without publishing, and `--pack-to <dir>` writes it so it can be round-tripped through `npx jpulse plugin install <dir>` before it ever reaches a registry. Without this the assembled layout is invisible until someone publishes it, which is the one irreversible step in the flow
  - **one package, one version.** The writer is the bump script; publish's member-version sync is a safety net for `plugin.json` only. `update` compares `npm view <npmPackage> version` against the installed plugin's own `plugin.json` version, so a companion at `1.2.0` inside a `1.0.0` package reports "already up to date" or re-fetches forever. Diverging member versions would silently break update for every site
  - bump file list lives **only on the primary**. A companion has no `webapp/bump-version.conf`. Today's plugin bump (`cd plugins/<name>` then `node ../../bin/bump-version.js <ver>`) detects plugin context from a cwd `plugin.json` and walks `.` against that plugin's `webapp/bump-version.conf`. Patterns and rules are already plugin-relative (`plugin.json`, `webapp/**/*.js`, `README.md`) - they do not name a plugin. So a primary with `bundle.members` applies that same conf to each member by treating the member directory as the scan root, matching patterns and `fileUpdateRules` against paths *relative to that member*, then writing the resolved files. Prefixing `../demo-secondary/**` in the primary's conf would hard-code companion names in two places (`plugin.json` and the bump list) and would fail anyway: `updateFileContent` matches `rule.pattern` against the path as discovered, and `plugin.json` does not match `../demo-secondary/plugin.json`
  - `cd plugins/demo-primary && node ../../bin/bump-version.js 1.2.0` therefore updates `plugin.json`, `@version` / `@release` headers, and any matching README/docs in **both** `demo-primary` and `demo-secondary`. A listed member directory that is missing is an error. A glob that matches only a companion (tests only the secondary has) belongs on the primary's conf; no match in the primary is fine
  - `cd plugins/demo-secondary && node ../../bin/bump-version.js …` is refused. The companion has no conf, and inventing one would reintroduce two sources of truth. Find the primary by scanning sibling `../*/plugin.json` for `bundle.members` containing this plugin's name, and name that primary in the error. `auth-oauth` has no `bundle.members` and no sibling that lists it, so its bump stays one directory
  - framework-root bump (`bin/bump-version.conf`) is unchanged. It lists `plugins/hello-world/**` because that plugin ships *inside* the framework package and shares the framework version. A bundle has its own version; it is bumped from the primary's directory, not from the framework root
  - `dependencies.plugins` values: keep the current string form (`"ai-core": ">=1.0.0"`) for load-order and enable/disable. Add an object form so install can fetch:
    ```
    "dependencies": {
        "plugins": {
            "other-plugin": ">=1.0.0",
            "ai-core": { "version": ">=1.0.0", "npmPackage": "@jpulse-net/plugin-ai-core" }
        }
    }
    ```
    Version-only remains valid. Enable/disable keep using the plugin *name* and the version range. `npmPackage` is install-only
  - on install, after the primary package is expanded, walk each newly installed member's `dependencies.plugins`. A missing dependency with `npmPackage` is installed (the fetched package may itself be a bundle). `--no-deps` skips the walk. Recursion is cycle-guarded by package name already in-flight
  - a missing dependency *without* `npmPackage` is an error, not a guess. The message names the plugin, and - because `resolvePluginSource()` already maps a bare name to `@jpulse-net/plugin-<name>` - suggests `npx jpulse plugin install <name>` as the likely fix alongside "or add `npmPackage` to the dependency". The CLI does not silently fetch that guessed name: the convention is right for a standalone plugin and wrong for every bundle member, and auto-installing an inferred package name off a registry is how a typosquat gets pulled in
  - bundle install prints one summary rather than repeating the single-plugin block per member: the package, each member with its version and resulting enabled/disabled state, and any dependency packages pulled in. An admin who typed one command should not have to infer from scrollback how many plugins they now have
  - `enablePlugin()` missing-dependency message includes `npmPackage` when the disabled/absent plugin's `plugin.json` has one, or when the dependent declared it - so an admin who installed from the UI still sees which package to fetch
- deliverables:
  - `webapp/utils/plugin-package.js` (shared by the CLI and tests):
    - `detectPluginPackageShape()`, `normalizePluginDependency()`, `validatePluginJson()` / `validateBundleMembers()`, `findBundlePrimaryForCompanion()`, `planPluginDependencyInstalls()`, `assembleBundlePackage()`, `copyDirRecursive()` with `skipPaths` so a dest inside src cannot recurse
    - `stageBundleForPack(primaryDir, pluginsDir)`: no-op for a single plugin and for an already-assembled tree (no root `plugin.json`); deletes stale staging first; strips a companion `package.json`; syncs member versions into the staged copies only, never the source
    - `unstageBundleAfterPack(primaryDir)`: removes staging only when its children match this bundle
  - `bin/plugin-manager-cli.js`:
    - detect single vs bundle vs invalid-both; expand each member; dependency walk with `--no-deps`; missing-dep error naming the plugin and the conventional install command
    - `publish` bundle mode driven by `bundle.members` on the primary, with member version sync, generated root `package.json` when the primary has none, `--dry-run`, `--pack-to <dir>`, `--ignore-scripts` on the assembled publish, and a warning when the primary's `package.json` lacks `"files": ["plugins"]` plus a `prepack` script
    - `stage-bundle` / `unstage-bundle` actions (npm `prepack` / `postpack` hooks; cwd is the plugin directory)
    - `update` re-expands a bundle package
    - bundle install summary output
    - `validatePluginJson()`: validate `bundle.members` (array of plugin-name strings, no self-reference) and object-form `dependencies.plugins` entries (`version` required, `npmPackage` optional string). Validation is warning/error based, not an unknown-field allowlist, so both need explicit checks
    - `showHelp()`: `--no-deps`, `--dry-run`, `--pack-to`, `stage-bundle` / `unstage-bundle`, a line that install may add more than one plugin, and a line that a wired primary also ships via a plain `npm publish`
  - `bin/bump-version.js`:
    - in plugin context, if cwd `plugin.json` has `bundle.members`, apply the primary's `webapp/bump-version.conf` to each member directory (match patterns/rules relative to that member, write the resolved path)
    - in plugin context, if a sibling primary lists this plugin in `bundle.members`, refuse and name the primary
    - missing listed member directory is an error
    - framework and site context, and a plugin with no `bundle.members`, are unchanged
  - `webapp/utils/plugin-manager.js`:
    - accept object-form `dependencies.plugins`; validate `version` + optional `npmPackage`; enable-time error text includes the package name when known
  - `docs/plugins/creating-plugins.md`, `docs/plugins/publishing-plugins.md`, `docs/plugins/plugin-architecture.md` (and `docs/plugins/plugin-api-reference.md` if the dependency schema is documented there):
    - bundle layout, both publish paths (`npx jpulse plugin publish` and a wired `npm publish` from the primary directory), companion guard `package.json`, object-form `dependencies.plugins`, bump from the primary only
  - `docs/installation.md` or the plugin-install section of the user docs: `npx jpulse plugin install @scope/pkg` may install more than one plugin
  - tests (new and/or extensions of the existing plugin-cli suites):
    - single-plugin install still copies one directory (regression)
    - fixture bundle with two members expands to two `plugins/<name>/` and two registry entries; `autoEnable` honored per member
    - root `plugin.json` plus `plugins/*/plugin.json` is an error
    - dependent with `{ version, npmPackage }` fetches the declared package; `--no-deps` does not
    - dependent with a version string only and no installed provider fails with a message that names the plugin, and does not install a guessed `@jpulse-net/plugin-<name>`
    - circular `npmPackage` walk is refused
    - publish of a primary with `bundle.members` assembles root `package.json` + `plugins/<member>/` and no root `plugin.json`; `--dry-run` publishes nothing; `--pack-to <dir>` output installs cleanly via a local-path install (the round trip is the real regression test for both halves)
    - publish syncs a companion's version to the primary's; publish of a companion is refused
    - `stageBundleForPack` stages both members without recursing into the staging directory, strips the companion guard `package.json`, syncs the companion version in the staged copy only, replaces a stale staging directory, and is a no-op for a single plugin and for an assembled tree
    - `unstageBundleAfterPack` removes a matching staging directory and leaves an unrelated `plugins/` directory
    - a missing listed member directory is an error on stage
    - `npm pack` of a primary wired with `"files": ["plugins"]` plus `prepack` / `postpack` produces a tarball with `package.json` + `plugins/<member>/` and no root `plugin.json` / no root `webapp/`; after pack the source has no leftover `plugins/` subdirectory
    - bump from a primary with `bundle.members` updates `plugin.json` and a `@version` header in every member; bump from a companion is refused and names the primary; a plugin with no `bundle.members` still updates only cwd (the `auth-oauth` regression)
    - `update` of a bundle member, the primary, or the package name all re-expand every member
    - `validatePluginJson()` rejects a `bundle.members` self-reference and a dependency object missing `version`
  - `README.md`, `docs/README.md` — Latest Release Highlights — v2.0.1 / W-221 bullet
  - `docs/CHANGELOG.md` — v2.0.1 / W-221 section
- notes:
  - design source: `docs/dev/design/W-223-ai-agent.md` §5.1, §5.1.1, §21. Plugin translation merge (§22.2) is W-222. This item does not create `plugins/ai-core/` or publish `@jpulse-net/plugin-ai-core`
  - `hello-ai` is a view inside `ai-core`, not a third bundle member. The AI bundle is two plugin directories. Local e2e fixtures are `plugins/test-primary/` (wired for `npm pack`) and `plugins/test-secondary/` (companion guard `package.json`); they are gitignored with the rest of `plugins/*` except `hello-world` and are not shipped in the framework package
  - a single plugin such as `auth-oauth` is untouched end to end: it has a root `plugin.json` and no `bundle.members`, so publish, install, and update all take today's path. Every change here is additive and keyed off a field that existing plugins do not set. The single-plugin regression tests exist to keep it that way
  - the primary is whichever member owns the published `npmPackage` and the package version. For the AI bundle that is `ai-core`, with `ai-mock` as the companion. Declaring membership on the primary rather than passing `--bundle a,b --package @scope/pkg` keeps the package composition in version control next to the code, so publishing is reproducible and does not depend on someone remembering the right flags
  - bump-version today: context from cwd (`bin/jpulse-framework.js` → framework, `plugin.json` → plugin, else site); `discoverFiles('.')` never leaves that tree. Plugin docs already say `cd plugins/<name>` then `node ../../bin/bump-version.js` (`npx jpulse bump-version` is framework/site). The bundle change is plugin-context only. Do not run the bump script against this repo while implementing - fixtures only
  - out of scope: plugin/site translation merge (W-222); Vue SPA translation loading (W-0); an admin-UI "install missing dependency" button (the enable error string is enough); changing load-order or enable/disable graph logic; shipping any AI plugin
  - v2.0.1 commit is a **partial file commit**: include the bundle files above; **exclude** `webapp/utils/i18n.js`, `webapp/utils/bootstrap.js`, `webapp/tests/unit/translations/i18n-merge.test.js`, and the Plugin translations paragraph in `docs/plugins/creating-plugins.md` (those are W-222 / v2.0.2). If `creating-plugins.md` already has both sections in the working tree, commit only the bundle hunks, or leave the translations paragraph for the W-222 commit
  - do not edit `.jpulse/` in tests against the live working tree; use an isolated temp project or the existing plugin-cli test harness
  - `"files": ["plugins"]` is load-bearing for the plain `npm publish` path. Forgetting it (or the lifecycle scripts) silently ships a single-plugin package missing the companion. The CLI warn is the guard; `validatePluginJson()` does not inspect `package.json`
  - member-version sync on the `npm pack` / `prepack` path writes only into staging, never the source. The bump script remains the version writer; CLI `publish` (not `--dry-run`) still syncs companion `plugin.json` versions in the source as the safety net for a missed bump

### W-222, v2.0.2, 2026-09-16: i18n: site specific and plugin specific translations
- status: ✅ DONE
- type: Feature
- objectives:
  - collect and deep-merge translation `*.conf` files from the framework, active plugins, and the site, so a plugin can ship `view.ui.*` strings and a site can override them - `loadTranslations()` today reads only `webapp/translations/` and assigns each language wholesale
  - keep the existing MPA `{{i18n.*}}` runtime; no new i18n API
- rationale:
  - `webapp/utils/i18n.js` `loadTranslations()` joins `config.system.appDir` + `translations`, exits if the directory is missing, and sets `i18n.langs[lang] = obj[lang]` - a replace, not a merge. No plugin in the repo has a `translations/` directory; `hello-world` hardcodes English. A plugin with real UI text cannot ship strings, and a site cannot override a framework or plugin string without editing `webapp/translations/` (framework-managed)
  - this is the MPA site+plugin half of the old standing W-0 i18n item. Vue SPA loading of the same merged set stays W-0. Live reload without restart is a separate W-0
  - W-221 can ship a bundle that *contains* `webapp/translations/` files; they stay inert (raw `view.ui.*` keys) until this item. The `jpulse.net` e2e of the unpublished bundle showed that gap
  - W-223 design §22.2 needs plugin strings for `hello-ai`; this item is the framework prerequisite, not the AI plugin
- features:
  - `loadTranslations()` still requires the framework `webapp/translations/` directory (same `process.exit(1)` if it is gone). It then deep-merges, per language, in this order so a later source wins a leaf: **framework, then each active plugin in `loadOrder`, then `site/webapp/translations/` if present**. A plugin or site with no `translations/` directory is skipped, not an error. Merge is deep at objects; a site key replaces a plugin key of the same path and does not wipe sibling framework keys
  - bootstrap initializes i18n **after** `PluginManager` so plugin translation directories exist and `loadOrder` is known
  - `auditAndFixTranslations()` runs **once after every source is merged**, against a cloned snapshot of the default language. The old "sort default language first" loop existed because backfill ran *inside* the file-read loop and needed `en.conf` already loaded. That sort is gone: plugin keys added only to the default language must be in the snapshot before `de` is backfilled, and running the audit after the merge is what makes file order irrelevant
  - a plugin ships `plugins/<name>/webapp/translations/en.conf` (and `de.conf` when it has German), same `view.ui.*` tree shape as the framework files
  - a plugin may ship only the default language. The post-merge audit backfills missing keys from the default language, so an English-only plugin appears in a German UI with English strings rather than blank or a crash - a plugin author is never forced to translate before shipping
- deliverables:
  - `webapp/utils/i18n.js`:
    - collect framework + active-plugin + site `*.conf`; deep-merge per language; do not `process.exit` when a plugin or site dir is missing
    - run `auditAndFixTranslations()` once after all sources are merged, against a cloned default-language snapshot (no default-language-first file sort)
  - `webapp/utils/bootstrap.js`:
    - initialize i18n after PluginManager (framework, then plugins in `loadOrder`, then site)
  - `docs/plugins/creating-plugins.md`:
    - Plugin translations paragraph: file location, merge order, English-only backfill
  - `docs/site-customization.md`:
    - `site/webapp/translations/` in the site tree; merge order (framework, then active plugins, then site); later source wins a leaf
  - `docs/handlebars.md`:
    - `{{i18n.*}}` consults the merged set, not only `webapp/translations/`
  - tests:
    - `webapp/tests/unit/translations/i18n-merge.test.js`
    - framework-only still loads (regression); a plugin `en.conf` adds a key; a site `en.conf` overrides that key and leaves sibling framework keys; a plugin without `translations/` does not fail; a plugin shipping only `en.conf` backfills into `de` even when the plugin file is not loaded first; assigning a whole language object is gone - merge is deep
  - `README.md`, `docs/README.md` — Latest Release Highlights — v2.0.2 / W-222 bullet
  - `docs/CHANGELOG.md` — v2.0.2 / W-222 section
- notes:
  - ships the day after W-221 (v2.0.1 bundle, v2.0.2 i18n). Second commit of the pair; do not fold these files into the W-221 commit
  - site translation path is `site/webapp/translations/`, matching file-resolution priority (site > plugins > framework). Do not invent a second site location
  - out of scope: Vue SPA translation loading (W-0); live reload / admin "reload translations" without restart (W-0); bundle install/publish (W-221)
  - no new i18n runtime API and no change to `{{i18n.*}}` handlebars
  - local e2e fixtures (`test-primary` / `test-secondary`) are not committed; unit tests use isolated temp trees

### W-223, v1.0.0, 2026-09-17: ai: ai-core plugin for agent server core, ai-mock plugin as provider
- status: ✅ DONE
- type: Feature
- objectives:
  - stand up the server half of the AI agent as a plugin bundle: a site registers scope and tools through hooks and runs complete turns against a mock provider over plain HTTP - tool authorization, per-turn budgets, quota, thread and turn persistence, live streaming, admin config, and a usage page
  - draw the tools/agent layer boundary in code and enforce it in CI, so the tools layer runs with no thread, no turn, no provider, and no browser - that surface is what an MCP server binds to later
  - ship without touching framework source: all code lives in `plugins/ai-core/` and `plugins/ai-mock/`, published together as `@jpulse-net/plugin-ai-core`
  - hand-over item: written to be implemented from this entry plus `docs/dev/design/W-223-ai-agent.md`, which is the authority wherever this entry is thinner
- prerequisites:
  - W-221, v2.0.1: plugin bundle build and installation - one npm package expands into `ai-core` + `ai-mock`, and `dependencies.plugins` can name the package supplying a dependency
  - W-222, v2.0.2: plugin and site translation merge - `plugins/ai-core/webapp/translations/` is live and a site can override any string
  - W-209, v1.7.13: `static hookDefinitions` so the plugin owns its hooks and `HookManager` never learns an AI name; `static hooks` auto-registration; registration against a not-yet-defined hook recorded and retro-validated, which is what lets a site controller load before the plugin
  - W-147 / W-207: `ConfigModel.extendSchema()` for the admin config tab, called from `static async initialize()`
  - not needed by this item: W-220 floatPanel (W-225), `UrlFetch` (W-228)
- rationale:
  - the reference site (bubblemap) runs a working agent in ~17,000 lines of site code, and the hard architecture there is already generic - the provider contract is domain-free, persistence is already keyed `(scopeType, scopeId, createdBy)`, and every tool already declares `host: 'server' | 'client'`. Nothing is packaged, so a second site re-derives turn loops, quota, tool authorization, and streaming
  - what is fused and must come apart here: the tool layer is welded to the turn loop (`executeTool(name, args, turnCtx)` reads `turnCtx.settings.docsTopics`, `turnCtx.supportsVision`, `turnCtx.selectionId`, `turnCtx.linkedMapNewFetchSpent`), authorization takes an Express `req` that two call sites already fabricate, three per-turn budgets are hardcoded with an `isSourceTextRead()` predicate deciding which calls count, and quota is hardcoded to the requesting user
  - two provider-contract defects are corrected now because both are breaking to retrofit once a third-party provider exists: only the first tool call per round is emitted (both Anthropic and OpenAI emit parallel calls), and `emit` pushes into an array the loop drains *after* the completion resolves, so tokens reach the client one burst per round
  - `ai-mock` ships inside the same package as `ai-core` rather than separately: a core with no provider cannot be demonstrated or tested, and the mock is how the bundle is testable at all - no API key, no spend, deterministic in CI
  - HTTP/SSE lands in this item rather than with the rest of the transport layer. It is what makes the server core demonstrable on its own (a turn over `curl`), and it is the entire transport story for a controller-centric site. WebSocket and client-host execution wait for W-226, because nothing needs them until a client-host tool actually runs
- features:
  - **phase 1 - tools layer.** Usable with no thread, no turn, no provider, no browser:
    - directory layout `plugins/ai-core/webapp/utils/{tools,agent,transport}/` (jPulse plugin `webapp/utils/` convention); imports point **downward only** (`tools` imports neither `agent` nor `transport`; `agent` does not import `transport`), enforced by a scan test in the same spirit as W-209's fire-site scan. Without the test the boundary erodes in the first bug fix
    - actor context replaces the fabricated request: `{ username, roles, onBehalfOf, origin: 'web'|'ws'|'mcp'|'api', scopeType, scopeId, req }`. `req` stays available for the minority of tools that want request state; no framework path requires one. Every gate takes the actor, never a `req`
    - tool descriptor, defaults for everything but `name` / `description` / `schema`: `host` (`'server'`), `module` (`null`, W-226), `dataScope` (`'call'`, W-226), `requires` (capability name or `null`), `mutates` (`false`), `timeoutMs` (`5000`), `group`, `budget` (`null`), `dedupeArgs` (`false`), `exposeToMcp` (`true`, ignored for `host: 'client'`), `owner` (stamped from the registering plugin or site, never supplied). `schema` is plain JSON Schema, passed through untranslated
    - four gates, in order, all server-side, all before execution: **existence** (`AI_UNKNOWN_TOOL`), **capability** (the tool's `requires` against the actor's capabilities for this scope from `onAiScopeResolve`), **admin policy** (the tool is in the enabled list), **turn budget**
    - capabilities are **named**, not a boolean pair. `canRead` / `canWrite` from an `onAiScopeResolve` handler are sugar for `scope:read` / `scope:write`; a site needing a finer per-scope rule declares its own name and grants it in its own handler. Do not add a per-scope tool list - that is deliberately deferred (design TD-12)
    - the offered tool list is computed by **one** exported function taking an actor, called by the turn loop **every round** (permissions change mid-conversation) and by the capability probe, and by MCP `tools/list` later. One function is the whole reason TD-12 stays cheap; three copies of "which tools does this actor get" is the failure mode to avoid
    - admin policy seeding is union-with-reviewed-names, carried over from the reference site: a tool added after the admin last saved is enabled by default, but one they explicitly unchecked stays off. Without it every new tool is silently hidden on every existing deployment
    - declarative per-turn budgets replace the three hardcoded counters: `budget: { key, max: '<settingsKey>', countWhen: (args) => …, overMessage, overHint }` plus `dedupeArgs`. The loop enforces budgets and argument-identical dedupe generically
    - result envelope, unchanged from the reference site: `{ ok, data, summary, error, code, hint, ms, media, stall }`. `hint` is load-bearing - a failed tool that tells the model what to do instead recovers inside the turn. `media` is stripped from the turn record and **never** accepted from a client. `stall` means the connection is gone: end the turn, do not retry
    - hardcoded result size cap, no pagination and no cursor (design TD-01): oversize returns `AI_RESULT_TOO_LARGE` with a `hint` telling the model to narrow its request
    - `global.AiCore` published from `static async initialize()`, same idiom as `LogController` / `CommonUtils` / `HookManager`: `registerTools()`, `resolveTools(actor)`, `executeTool()`, `runTurn()`, `listProviders()`. Site code must never import from `plugins/`
    - `static hookDefinitions` for the full catalog, all owned by `ai-core`: `onAiProviderRegister` (execute / continue - one broken provider is not no providers), `onAiComplete` (executeForPlugin / abort), `onAiToolRegister` (execute / continue), `onAiToolExecute` (executeForPlugin / abort), `onAiToolData` (executeFirst / abort, W-226), `onAiScopeResolve` (executeFirst / abort), `onAiPromptFragment` (execute / continue), `onAiQuotaCheck` (executeFirst / abort), `onAiQuotaSettle` (execute / continue), `onAiTurnBefore` (execute / abort), `onAiTurnAfter` (execute / continue)
  - **phase 2 - persistence and quota:**
    - three collections, plugin-owned: `aiThreads` keyed `(scopeType, scopeId, createdBy)` with a **partial** unique index on `status: 'active'`; `aiTurns` keyed `threadId` + `seq`; `aiUsage` keyed `<subject>:<period>` unique
    - one active thread per scope per user, any number of archived ones. Find-or-create lives in **exactly one** model method, and every route and (later) namespace is keyed by `threadId`, never by `(scope, user)`. Relaxing this to several live threads is deferred (design TD-13) and stays cheap only if nothing else keys on the pair
    - reserve-then-settle usage counters, writing both a daily (`YYYY-MM-DD`) and a monthly (`YYYY-MM`) document on every settle, as the reference site already does
    - caps are a list of `{ dimension, period, limit }` over named counters - `requests`, `tokens` (in + out), `cost`, `toolCalls` - with `day` and `month` periods produced by a named function so adding `week` is additive (TD-09). Shipped default is one `requests`/`day` and one `tokens`/`day` cap
    - **one subject per turn, defaulting to the username.** The usage key is `<subject>:<period>`, not `<username>:<period>`, and `onAiQuotaCheck` *returns* `{ subject, caps }` rather than the framework assuming it. `ai-core` registers the shipped period policy on its own `onAiQuotaCheck` / `onAiQuotaSettle`, so there is one code path and a site replacing it is not on a special branch. No multi-subject charging, no grants, no pools (TD-03)
    - `costUnknown`: an unknown model records `null` cost, never zero, and the usage page flags it - a cost cap cannot be honestly enforced against a partly unknown total
    - enforcement is **turn-start only and permissive** (TD-02): a turn that starts under its caps runs to completion even if it ends over. No mid-turn abort. The overrun is bounded by `maxRoundsPerTurn` and the provider's `maxTokens`, and is recorded truthfully rather than clamped. This differs from the reference site, which checks from round two onward - do not port that behavior
    - retention purges turns by age
  - **phase 3 - agent layer:**
    - turn loop, adopted from `aiTurnLoop.js` with the domain knowledge removed: reserve quota, acquire the lease, create the turn record, then loop rounds until the model returns text with no tool call, up to `maxRoundsPerTurn`, checking cancellation and timeout each round, retrying retryable provider errors with backoff, finalizing with usage, cost, and status. Statuses stay `completed` / `failed` / `canceled` / `stalled`
    - what does **not** go in the loop, and is not in this item at all: the `propose_` name prefix, proposal counting, `claimsApplyWithoutProposal()`, and the two system notes about undone and falsely-claimed proposals. Those belong to W-227 and subscribe to `onAiTurnAfter` rather than living in the loop
    - single-flight lease keyed by thread, plus cancellation as both a `cancelRequested` flag and a broadcast so any process can stop a turn running in another. Use `RedisManager.publishBroadcast()` / `registerBroadcastCallback()` for the cancel channel
    - **the lease is plugin code.** `RedisManager` has no lease primitive, and `cacheSet()` is not one: its `nx` option is only honored on the `ttl: 0` path (the `ttl > 0` path calls `setex`, which ignores it) and it returns `true` for "command sent", not "I won the race". Use `RedisManager.getClient('cache')` and a real `set(key, val, 'PX', ms, 'NX')`, checking the reply. Define and test the `isRedisAvailable() === false` path too - single process, no cross-instance cancel
    - provider contract adopted as-is except the three changes: `emit({ type: 'tool_use', calls: [ { id, name, args }, … ] })` is an **array** from day one (serial execution is fine - TD-06 - but widening the contract later breaks every provider plugin); `emit` **forwards immediately** to the sink instead of batching per round, with the loop still accumulating for the turn record; and the descriptor carries `capabilities: { vision }` as a **map**, not sibling `supportsVision` booleans, so unknown keys read false and a provider built against an older core keeps working
    - event vocabulary unchanged: `text_delta`, `tool_use`, `tool_use_truncated`, `usage`, `done` (with `stopReason` normalized to `tool` / `length` / `end`), `error` (with `code`, `message`, and a `retryable` flag driving the 429/529 retry). Four-way token accounting - input, output, cache write, cache read - and the per-model price table live in the descriptor, not the loop
    - calls in a round run in emitted order, budgets charge in that order, and the first `stall` ends the turn with the remaining calls unexecuted and reported as such to the model
    - prompt assembly is framework-owned, the words are the site's: framework safety and tool discipline, then site `onAiPromptFragment` fragments, then admin site instructions from config, then framework blocks for this turn's tool availability and what was withheld, scope/context/target, and (later) attachments. The framework's own fragments stay thin - content is data and never instruction, do not invent identifiers, use this turn's tool list rather than what an earlier reply said, and text inside markers is a quotation rather than a request. Block formatters are parameterized by the labels `onAiScopeResolve` supplies, so no domain noun is baked in
    - `ai-mock` provider: deterministic and scripted so CI can drive the loop without a network. It must be able to produce a text-only completion, a round with **more than one** tool call in the array, a truncated tool-argument event, a retryable error followed by success, a fatal error, and a slow stream for cancel and timeout tests
  - **phase 4 - HTTP transport, admin, packaging:**
    - `POST /api/1/ai/thread/:id/turn` responding as SSE, plus thread create/list/rename/archive and turn history routes. Auto-registered by `SiteControllerRegistry` from `api*` methods - no manual route table
    - **no SSE helper exists in the framework** (nothing in the repo sets `text/event-stream`); the plugin writes the response handling itself, including heartbeats and correct behavior behind a proxy. Cancel is `POST /api/1/ai/thread/:id/cancel` — HTTP close is not treated as disconnect (Node 24 POST+SSE fires close when the JSON body is consumed)
    - capability probe endpoint the client calls before opening a panel: which transport to use, the allowed provider/model list filtered by reality, quota state, and the resolved tool list. `ai-core` picks the path automatically - if the resolved tool list for the turn contains no `host: 'client'` tool, HTTP is sufficient. A §1.1 site never learns a WebSocket exists
    - admin config tab via `ConfigModel.extendSchema()`: master switch, allowed roles, allowed provider/model list and its default, quota caps, loop limits (rounds, timeouts, context size), tool policy, retention, auto-titling. `app.conf` keeps provider/model defaults and prompt fragment overrides. Debug dumps live on the plugin config page (not the AI tab, where they are easy to leave on); `loadSettings` reads `PluginModel` directly because `global.PluginModel` is never set. The plugin-config help lists Site Configuration → AI, AI usage, and the guide
    - admin usage page reporting per-subject requests, tokens, and cost by period, with over-quota and `costUnknown` flags - the reference site's page generalized, subject column replacing its username column
    - logging on every user-facing action, `LogController.logRequest` / `logInfo` / `logError` tagged `[controller].[method]`, and **`onBehalfOf` included unconditionally in every AI log line when set** rather than left to each call site
    - bundle packaging per W-221: `ai-core` is the primary (`bundle.members: ["ai-mock"]`, `npmPackage: "@jpulse-net/plugin-ai-core"`, `"files": ["plugins"]` plus the `prepack` / `postpack` staging scripts); `ai-mock` is the companion carrying the guard `package.json`. Verify with `npm pack` and a local-path round-trip install before any publish
- deliverables:
  - `plugins/ai-core/plugin.json`, `package.json`:
    - manifest, `autoEnable`, config schema, `bundle.members: ["ai-mock"]`, `npmPackage: "@jpulse-net/plugin-ai-core"`, `jpulseVersion: ">=2.0.2"` (the translation merge is a hard requirement), and the W-221 publish wiring: `"files": ["plugins"]` plus `prepack` / `postpack` calling `node ../../bin/jpulse-framework.js plugin stage-bundle` / `unstage-bundle`
  - `plugins/ai-core/webapp/bump-version.conf`:
    - the bundle's only bump file list, applied by the primary to **both** member directories; patterns stay member-relative (`plugin.json`, `webapp/**/*.js`, `README.md`, `docs/**`, `webapp/tests/**`), never `../ai-mock/**`
  - `plugins/ai-core/webapp/utils/tools/`:
    - registry and descriptor normalization with defaults and `owner` stamping; actor context; the four gates; `resolveTools(actor)`; budget and dedupe enforcement; result envelope and the size cap; tool execution dispatch for `host: 'server'` via `onAiToolExecute`
  - `plugins/ai-core/webapp/utils/agent/`:
    - turn loop; thread lease and cancel broadcast; provider registry and the normalized event contract; prompt assembly and the framework fragments; quota policy registered on `onAiQuotaCheck` / `onAiQuotaSettle`
  - `plugins/ai-core/webapp/utils/transport/`:
    - SSE response handling, heartbeat, and the sink the loop's `emit` forwards to. Cancel is the POST route, not HTTP close
  - `plugins/ai-core/webapp/controller/aiCore.js`:
    - `static hookDefinitions` for all eleven hooks; `static async initialize()` publishing `global.AiCore` and calling `ConfigModel.extendSchema()`; `api*` methods for turn, threads, turn history, capability probe, and admin usage
  - `plugins/ai-core/webapp/model/aiThread.js`, `aiTurn.js`, `aiUsage.js`:
    - collections and indexes (partial unique on the active thread); the single find-or-create; reserve/settle with daily and monthly documents (`$setOnInsert` identity only — never the same field as `$inc`); `costUnknown` as `null`; retention purge
  - `plugins/ai-core/webapp/view/admin/ai-usage.shtml`, `plugins/ai-core/webapp/view/jpulse-navigation.js`:
    - usage page and its admin nav entry
  - `plugins/ai-core/webapp/translations/en.conf`, `de.conf`:
    - `view.ui.*` strings for the admin tab, usage page, and the error and quota messages the server emits
  - `plugins/ai-mock/plugin.json`, `webapp/controller/aiMock.js`:
    - `onAiProviderRegister` descriptor with a zero price table and `capabilities: { vision: false }`; `onAiComplete` driving every scripted case in phase 3; companion guard `package.json`; `dependencies.plugins` on `ai-core`
  - `plugins/ai-core/webapp/tests/unit/`:
    - tools layer with a plain actor object and no Express request: unknown tool, capability denial, admin-policy denial, budget exhaustion, argument dedupe, oversize result hinting
    - the layer-boundary scan test (no `tools` import of `agent` or `transport`, no `agent` import of `transport`)
    - turn loop: rounds to completion; a tool round trip with **more than one** call in the array; retryable vs fatal provider errors; cancel by flag and by broadcast; timeout; lease refusal rolling back the reservation; empty completion; truncated tool arguments
    - streaming: a text delta is observable at the sink **before** the provider hook resolves - this is the regression test for the batching defect and the one that will actually catch a reversion
    - quota: each dimension and period; a reservation rolled back when the turn fails to start; turn-start-only enforcement letting a turn overrun; `costUnknown` never recorded as zero; a site handler returning a subject other than the username; a site handler replacing the shipped policy entirely
    - actor: `onBehalfOf` present in every AI log line when set, and thread ownership following it
    - threads: the partial unique index rejects a second active thread for the same `(scope, user)` and permits archived ones
    - MCP readiness: the tools layer exercised through a synthetic `origin: 'mcp'` actor with no request, asserting `host: 'client'` tools are filtered out and server-host tools execute
  - `plugins/ai-core/docs/README.md`:
    - the guide, server half, surfaced at runtime under `docs/installed-plugins/ai-core/` the same way `auth-mfa` is. Open with the simple case from design §1.1 - the one site controller and what it buys - then the tool descriptor, the four gates and named capabilities, quota and the subject, the hook catalog, and the admin settings. Panel, shared tool modules, propose/apply, and attachments sections arrive with their own items
  - `plugins/ai-core/README.md`, `plugins/ai-mock/README.md`:
    - install, enable, configure, hooks used, requirements (`>=2.0.2`), and the 1.0.0 release note. `ai-mock`'s README says plainly that it answers with no network and no spend, because it doubles as the smoke test that an install succeeded
  - framework-repo docs are **not** part of this item's commits — see notes
- notes:
  - design source: `docs/dev/design/W-223-ai-agent.md`. Read §1.1 first (it is the yardstick - everything a simple site writes), then §5.2, §6, §7, §9, §10, §11.1, §16, §17. §21.3 is this item's phase list. TD-01, TD-02, TD-03, TD-06, TD-09, TD-12, and TD-13 are the deliberate omissions - each records why, so do not "fix" them
  - **repo layout: each plugin is its own git repo and its own commit**, sitting as sibling directories under `plugins/` (gitignored by the framework repo except `hello-world`), exactly as `plugins/auth-mfa/` does today. Two commits, in two repos, for this one item. Nothing in the framework repo is committed as part of it
  - **`ai-core` is the primary and `ai-mock` the companion.** The primary declares `bundle.members`, owns the published `npmPackage` and the package version, carries the only `webapp/bump-version.conf`, and is the sole directory that `publish`, `stage-bundle`, and `bump-version` are run from. The companion has no bump conf and keeps a `private` guard `package.json` whose `prepublishOnly` refuses and names the primary; W-221 staging strips that file from the packaged copy
  - the header `v1.0.0` is the **bundle** version, `@jpulse-net/plugin-ai-core` — same convention as W-211, whose `v1.0.6` is the `auth-mfa` plugin, not a framework release. Bump with `cd plugins/ai-core && node ../../bin/bump-version.js 1.0.0`, which per W-221 rewrites `plugin.json` and the `@version` / `@release` headers in **both** member directories; a bump run from `plugins/ai-mock/` is refused and names `ai-core`. One package, one version — a companion whose version drifts makes `update` report "already up to date" forever for every site
  - the guide lives in `plugins/ai-core/docs/`, not in the framework's `docs/`. `docs/plugins/` holds only the how-to guides (creating, managing, publishing, architecture, API reference) and has no per-plugin page for `auth-mfa` or `auth-oauth`; a plugin's own `docs/` surfaces at runtime under the gitignored `docs/installed-plugins/<name>/`. Design §22.3 was corrected to match
  - framework-repo docs are a **separate pass under a framework release**, never part of a plugin commit: Latest Release Highlights, a `docs/CHANGELOG.md` entry, a `docs/hooks.md` note that a plugin now owns the `onAi*` hooks, and any `docs/genai-instructions.md` / `docs/security-and-auth.md` cross-links
  - out of scope, each with its own item: the Anthropic provider and the model-selection surface (W-224); the WebSocket namespace, client-host execution, shared tool modules, `jPulse.ai.panel`, and `hello-ai` (W-226); propose and apply (W-227); attachments, URL ingest, document conversion, and vision (W-228); `ai-mcp-server` and `ai-openai` (standalone); the reference site's migration, which is that site's repository
  - phase 1 accepts and filters `host: 'client'` descriptors but executes none - a site registering one before W-226 gets it withheld from the model with the same "withheld" sentence as any other, not an error
  - **no framework files at all** — not source, not docs, not tests. If an implementation appears to need a framework source change, that is a design finding worth raising rather than a patch: §22.2 lists the eight mechanisms already verified sufficient
  - do not run the bump-version script against this repo while implementing, and do not edit `.jpulse/` in tests - use an isolated temp project or the plugin-cli test harness
  - collections are plugin-owned from the start. The reference site's existing `aiThreads` / `aiTurns` / `aiUsage` data is that site's migration problem (design §18); a one-time rename or a drop-and-recreate are both acceptable there, and neither is framework machinery

### W-224, v1.0.0, 2026-09-17: ai: ai-anthropic plugin for Claude models
- status: ✅ DONE
- type: Feature
- objectives:
  - stand up `@jpulse-net/plugin-ai-anthropic` against the published W-223 provider contract so the same HTTP turns that run on `ai-mock` run on Claude
  - finish the model-selection surface W-223 started: the capability-probe menu filtered by plugin availability **and** key presence, the chosen pair persisted on the thread, a write that does not start a turn, and vision gating for the picker
  - prove the contract is public: a provider in its own package, written against `onAiProviderRegister` / `onAiComplete`, with no import from `plugins/ai-core/`
  - hand-over item: this entry plus `docs/dev/design/W-223-ai-agent.md` §9.2–§9.5, §17, §21.4. Port from `tmp-bubblemap-app/plugins/ai-anthropic`; the contract diffs in §21.4 are load-bearing
- prerequisites:
  - W-223, `@jpulse-net/plugin-ai-core` 1.0.0: the turn loop, the array `tool_use` contract, four-way `computeCost` in $/MTok, `filterAllowedModels` / `pickDefaultModel`, `AiThreadModel.setProviderModel`, the AI tab allowed-list fields, and `GET /api/1/ai/capability`
  - W-210, v1.7.14: `type: 'password'` + `PluginModel.getSecret` / `isSensitiveMask` — Verify uses the unsaved field the same way `EmailController` resolves a test SMTP password
  - W-221, v2.0.1: `dependencies.plugins` may name `npmPackage: '@jpulse-net/plugin-ai-core'` so installing the provider alone pulls the bundle
  - W-222, v2.0.2: only if this plugin ships `webapp/translations/`; the BubbleMap source does not
- rationale:
  - the reference site already streams Claude into a turn loop (`tmp-bubblemap-app/plugins/ai-anthropic`, BubbleMap 1.6.6). The wire work — SSE, Messages API, prompt cache, four-way tokens, stop-reason map, key redaction, unsaved Verify, price override — is done. What is not done is speaking the contract W-223 published. A literal copy would register, stream text, and **never execute tools**: the loop only honors `event.calls`, and BubbleMap emits the first tool as `{ type: 'tool_use', id, name, args }`
  - two more silent cost bugs in the same file: usage fields are `cacheWriteTokens` / `cacheReadTokens` (`addUsage` does not alias them, so cache tokens settle at $0) and `priceTable` is pre-divided per-token (`computeCost` divides by 1e6 again, under-charging by a million). Both are why a provider written against the published contract is the honest test that the contract is public (design §5.1)
  - a commercial provider is its own package because it churns, it carries a credential and a price table a site may not want, and bundling it with `ai-core` would make every mock-only install carry Anthropic. `ai-openai` stays TD-11
  - W-223 already shipped the admin allowed list and the probe menu. Phase 2 is what that menu still cannot do until a second provider exists: hide a plugin that has no key, remember a mid-thread switch on the thread (today only the turn records it; `setProviderModel` is unused), and grey out non-vision models when the thread has images
- features:
  - **phase 1 - the provider** (`@jpulse-net/plugin-ai-anthropic` 1.0.0). Port `tmp-bubblemap-app/plugins/ai-anthropic`, then apply the §21.4 diffs:
    - `onAiProviderRegister` descriptor: `{ plugin: 'ai-anthropic', label, models, capabilities: { vision: true }, priceTable, maxTokens, configured }`. `configured` is true when `PluginModel.getSecret('ai-anthropic', 'apiKey')` returns a non-empty, non-mask value; a failed `getSecret` registers unconfigured instead of throwing. Models and built-in $/MTok prices (verified 2026-09-15): Sonnet 5, Haiku 4.5, Opus 5, Fable 5.1 — no dated Haiku snapshot
    - `onAiComplete` streams `POST {endpoint}/v1/messages`. Keep `consumeSse` (split and malformed chunks), `toAnthropicMessages` / `toAnthropicTools` (ephemeral cache on the system prompt and the last tool), `mapStopReason` (`tool_use` → `tool`, `max_tokens` → `length`, else `end`), `sanitizeError` (`sk-ant-…`). `abortSignal` returns silently (the loop treats a provider error as failed before cancel); the plugin timer emits `AI_TIMEOUT`. `anthropic-version: 2023-06-01`. 429/529 → `AI_RATE_LIMIT` `retryable: true`. Tool calls emit only after `content_block_stop`
    - **emit the published events.** Collect every completed `tool_use` block and emit **one** `{ type: 'tool_use', calls: [ { id, name, args }, … ] }`. A block whose JSON never parses is `{ type: 'tool_use_truncated', id, name, jsonLen }` — do not drop the valid siblings. Usage is `{ type: 'usage', tokensIn, tokensOut, cacheWrite, cacheRead }` (not `cacheWriteTokens`). `done.stopReason` is the normalized trio
    - **price table in $/MTok**, same four keys `computeCost` reads. Plugin-config `priceTableOverride` merges on top; a row is kept only when all four rates are finite numbers; invalid JSON keeps the built-in table. An unknown model leaves cost `null`, never zero
    - plugin config (W-210): `apiKey` password, Verify button (`jPulse.plugins.aiAnthropic.verifyApiKey`) that POSTs the **form** key and endpoint so unsaved works, `model` / `endpoint` / `timeoutMs` / `maxTokens`, Pricing tab override. Completions use `getSecret`. Verify and errors never return the key. `global.PluginModel` is never assigned — import `webapp/model/plugin.js` the way `ai-core` `loadSettings` does
    - `dependencies.plugins: { 'ai-core': { version: '>=1.0.0', npmPackage: '@jpulse-net/plugin-ai-core' } }`, `jpulseVersion: '>=2.0.2'`, `autoEnable: true` (the site chose to install it). Single-plugin package like `auth-mfa`, not a bundle
  - **phase 2 - selection surface** (`@jpulse-net/plugin-ai-core` 1.0.1 — leftover §9.5, now that the menu has two entries):
    - `filterAllowedModels` drops a registered row whose provider has `configured === false`. `ai-mock` stays `configured: true`. Missing/disabled plugins already disappear because they never register
    - `runTurn` calls `setProviderModel` when the chosen pair differs from the thread, so a mid-thread switch survives the next find-or-create. Accept `provider` / `model` on the existing `PUT /api/1/ai/thread/:id` (alongside `label`) so the panel can change the pair without starting a turn; a pair not on the live menu is 400 `AI_MODEL_NOT_ALLOWED`
    - `gateModelsForVision(menu, { hasImages })` marks non-vision rows `{ available: false, reason: 'vision' }` when `hasImages` is true. The probe takes `?hasImages=1`. Attachments are W-228; this is the seam the picker uses
    - `pickDefaultModel`: exact admin pair if both match a live row; else first live row of `defaultProvider`; else `menu[0]`. Empty allowed list keeps every configured provider (including mock)
    - `/jpulse-plugins/ai-core.shtml` loads the capability probe (stats, models, quota, tools) and links to `/api/1/ai/capability`. The AI tab and plugin-config help link to that page, usage, plugin-local configuration, the guide, and plugin management
    - no per-role allowed lists (TD-08). No `ai-openai`
- deliverables:
  - `plugins/ai-anthropic/plugin.json`, `package.json`:
    - `name: 'ai-anthropic'`, `npmPackage: '@jpulse-net/plugin-ai-anthropic'`, `version: '1.0.0'`, `jpulseVersion: '>=2.0.2'`, `autoEnable: true`, the plugin dependency on `ai-core`, Provider + Pricing schema ported from the BubbleMap `plugin.json` (help text without map / T-092 vocabulary), SVG icon (not an emoji, not the retired Gemini-like star)
  - `plugins/ai-anthropic/webapp/controller/aiAnthropic.js`:
    - exported helpers the tests import: `consumeSse`, `mapUsage`, `mapStopReason`, `sanitizeError`, `toAnthropicTools`, `toAnthropicMessages`, `mergePriceTable`, `resolveVerifyApiKey`, `completeAnthropic`, `pingModels`. Hooks + `POST /api/1/aiAnthropic/verify-api-key` (`auth: 'admin'`)
  - `plugins/ai-anthropic/webapp/view/jpulse-common.js`:
    - `jPulse.plugins.aiAnthropic.verifyApiKey` — form values, toast, never logs the key
  - `plugins/ai-anthropic/webapp/tests/unit/`:
    - SSE parser against a split chunk and a malformed `data:` line (rest stays in the buffer; bad JSON is skipped)
    - `mapUsage` four-way mapping; `mapStopReason` for `tool_use` / `max_tokens` / other
    - `sanitizeError` redacts `sk-ant-…` and never echoes the key from an HTTP error body
    - `completeAnthropic` with a fake `fetch`: a text-only stream; a round with **two** `tool_use` blocks emitted as one `calls` array; a truncated tool JSON; 429 retryable; missing key → `AI_NO_API_KEY`; `abortSignal` cancels the in-flight request and returns without a provider error
    - `priceTable` stays in $/MTok through register; an override JSON merges; invalid JSON is ignored; unknown model → `null` rates
    - `resolveVerifyApiKey`: unsaved non-mask wins; mask/empty falls back to `getSecret`; empty both → not configured
    - descriptor: `plugin`, `capabilities.vision === true`, `configured` follows the stored key
  - `plugins/ai-anthropic/docs/README.md`, `README.md`:
    - install `npx jpulse plugin install @jpulse-net/plugin-ai-anthropic` (pulls `ai-core`), enable, paste key, Verify then Save, set Site Configuration → AI default / allowed list, `jpulseVersion`, hooks used, 1.0.0 note. Guide URL `/jpulse-docs/installed-plugins/ai-anthropic/README` (trailing slash 404s)
  - `plugins/ai-anthropic/webapp/bump-version.conf`, `jest.config.cjs`:
    - single-plugin list (`plugin.json`, `package.json`, `jest.config.cjs`, `webapp/**/*.js`, `README.md`, `docs/**`, `webapp/tests/**`). `npm test` from this directory chdirs to the framework checkout
  - `plugins/ai-core/` (1.0.1, published `@jpulse-net/plugin-ai-core`; companion `ai-mock` 1.0.1 in its own repo, same package):
    - `filterAllowedModels` honors `configured === false`; `runTurn` persists the pair; `PUT /api/1/ai/thread/:id` accepts `provider` / `model`; `gateModelsForVision` + probe `hasImages`; `pickDefaultModel` provider-only fallback; capability overview page; tests in `providers.test.js` / threads / turn-loop. `ai-mock` descriptor gains `configured: true`. Same `jest.config.cjs` + `npm test` wiring; bump list includes the Jest config
  - framework-repo docs are **not** part of this item's plugin commits — see notes
- notes:
  - design source: `docs/dev/design/W-223-ai-agent.md` §21.4 (this item), §9.2–§9.5 (contract and selection), §17 (config split as built), As Built items 5–12. TD-08 and TD-11 stay deferred
  - **port source, not a submodule:** `tmp-bubblemap-app/plugins/ai-anthropic` — `plugin.json`, `webapp/controller/aiAnthropic.js`, `webapp/view/jpulse-common.js`, `docs/README.md`. That tree is a BubbleMap site plugin (proprietary license, `jpulseVersion: '>=1.7.14'`, empty plugin deps, emoji icon, map-agent copy). Rewrite headers, license (BSL 1.1 like `ai-core`), author/repo, and user-facing words. Do not copy T-092, "map AI Agent", or "Allow AI Agent to read this map"
  - **repo layout: `ai-anthropic` is its own git repo and its own commit**, sibling under `plugins/` (gitignored by the framework except `hello-world`), same as `auth-mfa`. Phase 2 is a second commit in the **ai-core** repo plus the `configured: true` commit in **ai-mock**. Two publishes, one work item: `@jpulse-net/plugin-ai-anthropic` 1.0.0 and `@jpulse-net/plugin-ai-core` 1.0.1 (GitHub Packages, 2026-09-17). The header `v1.0.0` is the Anthropic package; the bundle header is `v1.0.1`
  - `global.AiCore` is for site code. This plugin must not import from `plugins/ai-core/`. Completions go through the hooks; cost is computed by the loop from the descriptor's `priceTable` plus the `usage` event
  - `PluginModel.getSecret` / `isSensitiveMask` — `global.PluginModel` is never assigned; import `webapp/model/plugin.js`. Same pattern as `ai-core` `loadSettings`
  - out of scope: the chat panel and `hello-ai` (W-226); propose/apply (W-227); attachments and actually sending images (W-228 — phase 2 only gates the menu); `ai-openai` (TD-11); the reference site's migration of its own `ai-anthropic` copy
  - **no framework source.** Framework-repo work for this item is the design + this work-item text. Latest Release Highlights / `docs/CHANGELOG.md` / hook-catalog mention wait for the framework release that accompanies the plugin publish
  - do not run the bump-version script against this repo while implementing, and do not edit `.jpulse/` in tests
  - Verify never receives the stored-only value from the button callback — only the form field (mask or newly typed). That is the W-210 rule; do not "fix" it by reading `getSecret` in the browser
  - no `LICENSE` file on either package (same as `ai-core` 1.0.0)

### W-225, v2.0.3, 2026-09-17: websocket: await onCreate so a namespace can authorize a connection asynchronously
- status: ✅ DONE
- type: Bugfix
- objectives:
  - `await` the `onCreate` result in the WebSocket upgrade path so a dynamic namespace can authorize a connection against the database - or a cache, an HTTP call, or anything else asynchronous - **before** the handshake completes
  - close a silent-failure trap: an `async onCreate` today has its returned Promise installed as the connection `ctx`, so its authorization decision is discarded and the connection is **accepted**
  - keep every existing synchronous handler byte-for-byte compatible, and bound how long an un-upgraded socket may be held by a slow or hung handler
  - make the code match `docs/websockets.md`, which already documents the hook with `onCreate: async (req, ctx) => …`
- prerequisites:
  - W-155, v1.6.12: dynamic namespaces, the `onCreate` hook, pattern matching with `:param`, and `removeNamespace` / `removeIfEmpty` - this item changes only how the hook's result is consumed
  - nothing else. No new dependency, no config migration, no client-side change
- rationale:
  - `_completeUpgrade` calls `const onCreateResult = namespace.onCreate(req, ctx)` and then dispatches on the result's type: `null` rejects, a number rejects with a close code, and **any object** is taken as the amended `ctx`. A Promise is an object. So an `async` handler is not merely unsupported - it fails in the worst available direction: the framework installs the pending Promise as the connection context and completes the handshake, which means the handler's `return null` never rejects anything, and `ctx.username` and friends are `undefined` for the life of the connection
  - this is a defect in a documented contract rather than a missing feature, which is why it is worth its own item. `docs/websockets.md` shows `onCreate: async (req, ctx) => { … return ctx; }` in the Dynamic Namespaces section, and the sibling handler is already documented as "**Async onMessage:** the handler may be async... if it returns a Promise, the framework awaits it". `onCreate` is the odd one out, and it is the one hook whose whole purpose is authorization
  - the W-155 design specified the signature as `onCreate(req, ctx) => ctx | null`, synchronous, and the shipped demo (`site/webapp/controller/helloWebsocket.js`, `hello-rooms`) is synchronous, so nothing in the repo currently trips over it. It was found by designing an actual async consumer, not by a test
  - **the consumer that found it:** W-226's per-thread AI namespace `/api/1/ws/ai/:threadId`. Thread ownership is `createdBy` on the thread document, so deciding whether this session may listen to this conversation is a database read. Nothing else about the AI panel needs a framework change, and this is not a change the plugin can work around: authorizing after the upgrade is not equivalent, because `broadcast()` reaches every client in the namespace and a client joins at handshake - so a check that finishes after the upgrade has already let the socket receive another user's conversation
  - the alternatives considered for the plugin, and why they lose to fixing this: an HMAC ticket verified synchronously in `onCreate` works but adds an endpoint, an expiry, and a second authorization concept a site has to understand; putting the owner in the namespace path makes the socket's identity depend on a routing convention; and memoizing `threadId → owner` in process for a synchronous lookup breaks the moment the site runs more than one instance, because the HTTP call that populates the memo and the upgrade can land on different ones
  - the fix is small and additive: `await` on a non-Promise is a no-op, so a handler returning `ctx`, `null`, or a number behaves exactly as before. What is not free is that this is a security-critical path and it now has a suspension point in it, which is why the timeout and the socket-already-gone check below are part of the item rather than a follow-up
- features:
  - **`_completeUpgrade` becomes async and its one caller handles rejection.** `_handleUpgrade` invokes it from inside the `sessionMiddleware` callback, which ignores return values, so the call gets an explicit `.catch()` that logs and destroys the socket. An unhandled rejection in the upgrade path must never leave a half-open socket
  - **`onCreate` is awaited**, and the existing result dispatch is unchanged: `null` rejects, a number rejects with that close code, an object amends `ctx`, `undefined` accepts with the framework's `ctx`. A rejected Promise or a thrown error is treated exactly as today's `catch` treats a synchronous throw - log and destroy, fail closed
  - **a timeout bounds the suspension.** A hung `onCreate` must not pin an un-upgraded socket indefinitely, and an authorization handler that talks to a database is exactly the handler that can hang. New `controller.websocket.onCreateTimeoutMs`, default 5000, applied per connection; on expiry log and destroy. Documented in `app.conf` alongside the other `controller.websocket` keys. Implemented as `_awaitWithTimeout` (`Promise.race`; timeout rejects with `ONCREATE_TIMEOUT`). The value is `appConfig.controller.websocket.onCreateTimeoutMs` when finite, else `websocketConf.onCreateTimeoutMs` (initialize sets `??= 5000`); `<= 0` disables the race
  - **the socket may be gone by the time the handler resolves.** After the await, bail out if the socket is already destroyed or no longer writable rather than calling `wss.handleUpgrade` on it. A client that gave up during an authorization round trip is normal, not an error. Implemented as `_socketAcceptsUpgrade` (missing / `destroyed` / `writable === false`)
  - **the literal namespace is still created before `onCreate` runs**, as today, so a rejected first connection leaves an empty namespace behind. That is pre-existing behavior and `removeIfEmpty()` already covers it; do not change creation order in this item, because doing so changes what `ctx.params` is available to
  - **no signature change and no new option.** `onCreate` keeps `(req, ctx)`; the only difference is that returning a Promise now works instead of silently misbehaving. A site that never writes `async` sees no change at all
  - out of scope: making `onConnect` / `onDisconnect` awaitable (nothing needs it, and `onDisconnect` in particular runs during socket teardown where awaiting is a different problem); rate-limiting connection attempts; any change to `requireAuth` / `requireRoles`, which already run before `onCreate` and stay there
- deliverables:
  - `webapp/controller/websocket.js`:
    - `static async _completeUpgrade(...)`; `await` of `onCreate` via `_awaitWithTimeout`; post-await `_socketAcceptsUpgrade`; `.catch()` on the call site in `_handleUpgrade`; `websocketConf.onCreateTimeoutMs ??= 5000` in initialize; JSDoc on `createNamespace` stating that `onCreate` may be async and is awaited, and what the timeout does
  - `webapp/app.conf`:
    - `controller.websocket.onCreateTimeoutMs: 5000` with a comment saying it bounds an asynchronous `onCreate`, and that a handler exceeding it is treated as a rejection
  - `webapp/tests/unit/controller/websocket.test.js`:
    - the seven existing `_completeUpgrade` call sites become `await`ed - they pass today only because the function is synchronous
    - an async `onCreate` resolving to `ctx` completes the upgrade, and `ctx` is the resolved object rather than a Promise (the regression test for this bug - assert `ctx.username`, not just that the socket survived)
    - an async `onCreate` resolving `null` destroys the socket and never calls `handleUpgrade`
    - an async `onCreate` resolving a number destroys the socket
    - a rejected Promise and a thrown error both destroy the socket
    - a handler that never settles is destroyed after `onCreateTimeoutMs` with fake timers, and `handleUpgrade` is not called
    - a socket destroyed while `onCreate` is pending does not reach `handleUpgrade`
    - a synchronous handler returning each of `ctx` / `null` / a number / `undefined` behaves as before - the backward-compatibility guard
    - live smoke (hello-rooms): `paris` rejected before handshake (browser 1006); `amsterdam` accepted as `siteadmin` with `_onConnection` / `onConnect` / broadcast
  - `docs/websockets.md`:
    - state plainly in the Dynamic Namespaces section that `onCreate` may be sync or async and is awaited, that a rejection or a throw closes the connection, and that `onCreateTimeoutMs` bounds it. The section's example is already `async`, so this is the sentence that makes the example true
    - one line in the authorization guidance: connect-time authorization belongs in `onCreate` because it gates the handshake, and a check performed after the upgrade does not - a namespace client can already receive broadcasts
  - `docs/dev/design/W-155-websocket-dynamic-namespace.md`:
    - a short amendment noting the signature is now `onCreate(req, ctx) => ctx | null | number | Promise<…>`; the original design specified synchronous and that is what shipped
  - `docs/CHANGELOG.md`, `README.md` / `docs/README.md` Latest Release Highlights:
    - v2.0.3 entry, described as the bugfix it is: an async `onCreate` was accepting connections it meant to reject
- notes:
  - design source: `docs/dev/design/W-223-ai-agent.md` §11.2 (why the AI panel needs it) and §21.1 (how §22.2's "no framework source change" finding missed it - the check asked whether the mechanism existed, and `onCreate` does exist). The W-155 design doc is the original contract
  - **this is a framework item, not part of the AI bundle.** It ships as v2.0.3 in the framework repo and nothing in `plugins/` is touched. W-226 then declares `jpulseVersion: '>=2.0.3'`
  - the failure mode is worth stating once more because it is counter-intuitive and a reviewer should look for it: the bug does not make an async handler fail, it makes an async handler **succeed at accepting**. Any site that followed the documented example has a namespace that admits every connection its `requireAuth` / `requireRoles` options do not already stop
  - do not "fix" this by rejecting a Promise return with an error. The documented contract is async; honor it
  - no client-side change. `jPulse.ws` never sees this - the connection either upgrades or it does not, and a rejected upgrade already surfaces as a failed connect with the existing reconnect behavior

### W-226, v1.0.2, 2026-09-17: ai: ai-core plugin with chat panel, client-host tools, hello-ai
- status: ✅ DONE
- type: Feature
- objectives:
  - build the client half of the agent: `jPulse.ai.panel` on `jPulse.UI.floatPanel`, the site adapter contract, and the WebSocket bridge that lets the model call a tool inside the user's tab
  - make a tool **one shared pure module** that both hosts run - ordinary `import` on the server, content-hashed dynamic `import()` in the browser - retiring the `.tmpl` and `vm`-sandbox workarounds the reference site needs today
  - ship `hello-ai` **inside the plugin**, running on `ai-mock`, so an install can be evaluated and smoke-tested with no API key and no site-template regeneration
  - keep the §1.1 site unaware that any of this exists: with no client-host tool offered, the transport stays HTTP and the panel behaves identically. This is a property `hello-ai` can break and therefore has to be tested rather than assumed: `onAiToolRegister` fires for every scope on the site, so the demo registers its tools **only** when `actor.scopeType === 'hello-ai'` - an unconditional push would make `chooseTransport()` answer `ws` for every page of every site that installed the bundle
  - hand-over item: written to be implemented from this entry plus `docs/dev/design/W-223-ai-agent.md`, which is the authority wherever this entry is thinner
- prerequisites:
  - W-223, `@jpulse-net/plugin-ai-core` 1.0.0: the tools layer with `host: 'client'` already accepted, filtered, and withheld at execute; `module` and `dataScope` already on the normalized descriptor; `chooseTransport()` already answering `ws` when a client tool is offered; `runTurn` already driving an injected `sink`; the capability probe already the one place a client asks what it may do
  - W-224, `@jpulse-net/plugin-ai-core` 1.0.1: the live model menu, `pickDefaultModel`, and `PUT /api/1/ai/thread/:id` accepting `provider` / `model` - which is what `/model` writes to
  - **W-225, v2.0.3: awaitable `onCreate`.** Phase 1 cannot authorize the per-thread namespace without it, and authorizing after the upgrade is not equivalent. `jpulseVersion` becomes `>=2.0.3`
  - W-220, v2.0.0: `jPulse.UI.floatPanel` - drag, resize, persistence, stacking, mobile sheet, ghost animation, and the shared Escape rule are all already done and must not be re-implemented
  - W-208, v1.7.12: `WebSocketController.request()` server→client with its `NOT_CONNECTED` / `CONNECTION_LOST` / `REQUEST_TIMEOUT` envelope, client `conn.reply` / `replyError`, and per-namespace `messageLimits`
  - W-155, v1.6.12: pattern namespaces with `:param` and `removeIfEmpty()`
  - W-098 append mode: a plugin's `view/jpulse-common.js` and `.css` concatenate onto the framework's, which is how `jPulse.ai` and `plg-ai-*` ship without a framework edit
  - already vendored, no new dependency: `marked` at `/common/marked/` and `Prism` at `/common/prism/`, the same pair `jPulse.UI.docs` renders markdown with
- rationale:
  - W-223 and W-224 built a complete server-side agent that no browser uses. Every turn so far has been driven by `curl`. The panel is what turns an API into a feature, and it is the largest single piece of what a site would otherwise write itself - the reference site's panel, conversation list, streaming, markdown, reconnect, and error surfaces are thousands of lines that have nothing to do with its domain
  - **client-host tools are the whole reason a WebSocket exists here.** A tool whose data lives only in the browser - the current selection, unsaved edits, a computed view the server cannot reproduce - cannot be executed server-side at any price. The turn therefore has to be able to call back into the originating tab, which means the process holding that socket must be the one running the turn. Sites without such a tool pay none of this: `chooseTransport()` already answers `http` and the probe already tells the client which to use
  - **shared tool modules are where the measurable win is.** The reference site writes several tools twice - an 882-line server-side proposal validator beside a 1,000-line browser mirror, plus parallel projection and source implementations - roughly 2,000 lines kept in sync by hand, and three `vm`-sandbox harnesses to test the browser copies. One module imported two ways deletes all of it and makes the tests ordinary Node tests
  - the mechanism is deliberately not general (design TD-07). "One module, two runtimes" is not AI-specific and will be promoted to the framework if a second consumer appears; designing that API now, with one imagined user, is how it gets the wrong shape
  - **`hello-ai` lives inside the plugin, not the site template.** The feature is large enough that onboarding needs something that runs; inside the plugin it installs into an existing site for evaluation, arrives and updates with the code it demonstrates, and needs no site-template regeneration. It runs on `ai-mock`, which also makes it the fastest check that an install actually worked. `hello-world` is the precedent - it already ships a view, its own navigation, and its own CSS from inside a plugin
  - **the adapter is validated against `hello-ai`, deliberately not against the reference site.** An adapter contract proven only against the application it was extracted from is not a contract; it is that application's method list with a new name
  - three limits are accepted rather than engineered around, and each is cheaper than its alternative. A reloaded tab cannot replay partial text, because deltas are unicast and persisting them would put a database write on the hot path of every token - it reconnects, says a turn is running, and renders the reply on completion. An oversized client reply is the tab's problem to report, because the framework's `send()` returns false rather than throwing and a silently dropped reply reads to the server as a timeout. A turn waiting on a tool in a tab that went away ends `stalled`, which is the designed behavior and not a special case
- features:
  - **phase 1 - WebSocket and the client bridge:**
    - per-thread namespace `/api/1/ws/ai/:threadId`, `requireAuth: true`. `onCreate` is **async** (W-225): load settings and the thread, then reject when AI is disabled, the actor's role is not allowed, the thread is unknown, or `createdBy` is not the session's owner. It gates the handshake because `broadcast()` reaches every client in a namespace and a client joins at handshake - a check that lands after the upgrade has already leaked
    - **the role check is read inside `onCreate`, not frozen into `requireRoles`.** `createNamespace` runs once from `initialize()`, so a role list captured there goes stale the moment an admin edits the AI tab, and it would diverge from the HTTP path, which calls `roleAllowed()` per request. One rule, evaluated per connection, identical in both transports
    - `removeIfEmpty()` on the last disconnect. A namespace created from a pattern is never reclaimed automatically, so without this the registry grows by one entry per conversation ever opened
    - **the turn starts over the socket**, not over `POST .../turn`: the process holding the origin tab has to be the one that calls back into it, and an HTTP request can land on another instance. `{ type: 'turn', data: { text, provider, model, context, target, script } }`, with `conn.clientId` recorded as the origin. `script` is on the socket message because `POST .../turn` already accepts it and the two transports have to stay at parity - a site or `curl` can drive a named tool without a user typing a mock prefix. **Cancel stays the HTTP route** for both transports - it has to work from a tab that is not the origin, and it is already proven
    - token deltas `sendToClient` to the origin tab; turn-level events (`turn_start`, `tool_result`, `completed` / `canceled` / `stalled`, `error`) `broadcast` so the user's other tabs stay in sync, and so they cross instances via Redis, which unicast does not. **Both calls use the instance path** (`/api/1/ws/ai/<threadId>`), not the pattern-namespace template whose `.path` is `/api/1/ws/ai/:threadId` - a lookup on the template logs `Namespace not found` and the origin tab never sees `completed`
    - client execution in the transport layer: `WebSocketController.request(originClientId, nsPath, { type: 'tool_call', data: { id, name, args, moduleHash } }, { timeoutMs: tool.timeoutMs })`. Transport codes map onto the existing envelope - `NOT_CONNECTED` and `CONNECTION_LOST` set `stall`, `REQUEST_TIMEOUT` and the oversize codes get a narrowing `hint`. `stall` is set for a lost connection **only**; a timeout is retryable advice, not a dead turn
    - `executeTool` grows the client path it currently refuses. Today `host: 'client'` returns `AI_CLIENT_HOST` unconditionally; now it dispatches when the caller supplied a client executor and still returns `AI_CLIENT_HOST` when it did not - which is exactly the HTTP transport, so a client tool reached over SSE keeps today's honest refusal instead of hanging
    - **two client shapes, one message.** `tool_call` carries `moduleHash` when the descriptor names a module and omits it when it does not; the tab runs the pinned module in the first case and calls `adapter.executeTool(name, args)` in the second. A descriptor naming no module on a site whose adapter has no `executeTool` is answered with a plain failed envelope naming the missing method - never left to time out, because a missing site method is a programming error a developer should read in one line, not a stall the model has to recover from
    - **the four gates still run server-side, before the tab is asked.** A client-host tool is authorized, budgeted, and deduped on the server; the tab is asked only to compute. Anything coming back is `stripMedia`'d and size-capped, both of which `executeTool` already does behind its `fromClient` flag
    - per-namespace `messageLimits` set explicitly so the 256 KB result cap is a stated property of this namespace rather than whatever the global default happens to be
  - **phase 2 - shared tool modules:**
    - conventional path `site/webapp/utils/ai-tools/` for a site and `webapp/utils/ai-tools/` inside a plugin, plain ES modules exporting `run(data, args)`. That is the existing `utils/` tree, not a new top-level `webapp/ai-tools/`. The purity root is the catalog directory so a module cannot import the rest of `utils/`. Resolution is the framework's usual order, site first then each active plugin in load order, and it is **replace, not append** - a module is one function and concatenating two is meaningless
    - content hash per module (sha256, truncated), served by `GET /api/1/ai/tool-module/:hash/:name.js` as `auth: 'user'`, `Content-Type: text/javascript`, `Cache-Control: public, max-age=31536000, immutable`. The hash is in the path, so the URL is safely cacheable forever, and a **request for a hash the server no longer has is a 409, never a different body** - a stale tab must be told, not quietly upgraded. The route is authenticated like every other `/api/1/ai/*` route: these modules are site logic, and the anonymous readability of a `/static/` asset is not something to hand out by accident
    - the capability probe returns `{ name, hash, url }` per module. The `url` so the client never assembles a route and the route can change without a client change
    - the probe also grows `retentionDays`, which the panel's retention notice needs and which is otherwise a second settings round trip from a client that just asked the server what it may do
    - **purity is enforced, not merely tested.** Allowlist is the smallest useful one: relative imports of siblings inside `utils/ai-tools/`, no bare specifiers at all, so `fs` is unreachable and so is a helper that transitively reaches it. A violation is refused at server `import` and at serve, logged, and surfaced as a withheld tool with a reason - not a broken page. `AiCore.scanToolModules()` is exported so a site asserts over its own directory in one line, because a scan test living in `ai-core` cannot cover `site/webapp/utils/ai-tools/`, which is precisely what gets shipped to a browser
    - server-side data comes from `onAiToolData` (already in the hook catalog, unused until now); browser-side from `adapter.toolData(name)`. `dataScope: 'call'` rebuilds per call and is the default because it is always correct; `'turn'` builds once and reuses, cached per turn beside the budget state
    - a `module` named on a `host: 'server'` tool bypasses `onAiToolExecute` entirely - the descriptor already carries the field, nothing needed to change to allow it
  - **phase 3 - the panel:**
    - `jPulse.ai.panel.create({ scopeType, scopeId, adapter })`, adapter optional - a site with no client-host tool omits it, which is the §1.1 case. `toolData` plus the three `describe*` methods are all a read-only agent needs; `executeTool` stays an escape hatch for a client tool not worth making a module, not the interface
    - panel defaults that keep the one-liner honest: `id` is `ai-panel-<scopeType>-<scopeId>`, so two scopes on one site are two panels with two persisted positions; the default size is larger than W-220's 360x280, which is a tooltip-sized box for a conversation; the last thread id persists under its own key rather than inside the panel geometry, so clearing a stuck layout does not also throw away which conversation was open
    - **the namespace is `jPulse.ai`, not `jPulse.plugins.aiCore`.** Deliberate: this is the site-facing client API, the mirror of `global.AiCore` on the server, and site code should no more write `jPulse.plugins.aiCore.panel` than it writes `global.plugins.aiCore.runTurn`. Note it in the guide so the deviation from the plugin convention reads as a decision
    - **both transports behind one client API.** `jPulse.ai.transport` reads the probe, opens SSE or the socket, and emits one event stream; the panel never branches on transport. A panel that did would grow two of everything and keep only one of them tested
    - conversation select on the thread row with rename and new-conversation; the list is the last 20 threads for the scope, newest first, with no archive/resume chrome. Compose box with a slash-command picker and keyboard handling; send and cancel. `/model` views and sets the pair in the transcript (not a header picker), writing through `PUT /api/1/ai/thread/:id`
    - **the slash catalog is five commands, every one resolved locally in the panel and none of them sent to the model:** `/help` lists the catalog and any `examples` passed to `panel.create`; `/tools` lists this turn's offered tools with host and description, plus the withheld ones and the reason each was withheld; `/model` prints the current pair and the allowed list, and `/model <provider>/<model>` sets the pair when it is on the live menu and surfaces `AI_MODEL_NOT_ALLOWED` when it is not; `/new` starts a conversation (`forceNew`); `/cancel` stops the running turn. A leading `//` escapes, so `//help` sends the literal text. `/tools` is the one that earns its place beyond convenience - "why did it not use my tool" is the first question a site developer asks, and the probe already answers it with a reason per withheld tool, so the panel is only surfacing what the server computed
    - streaming with scroll-to-bottom and the stuck-turn prompt; jumping dots in the transcript while a turn waits for the first token; the outgoing user prompt stays visible (`pendingUser`); slash/local replies carry a timestamp and merge with server turns by `createdAt`. Reconnect and turn reconciliation, which for a reloaded tab means "a turn is running" and then the finalized text on the completion event - partial text is not recoverable and the panel says so rather than pretending. Switching threads disconnects the old socket; that is not a reconnect and must not show the reconnecting notice
    - W-220's `launcher` is ghost geometry and focus-return only; the panel binds the element's `click` to `handle.toggle()`
    - markdown by the vendored `marked` + `Prism`, copy buttons pinned to code blocks so they survive re-render during streaming; quota and error surfaces; the retention notice from the probe's `retentionDays`
    - **`marked` is loaded on demand by the panel.** `jpulse-header.tmpl` includes Prism but *not* `marked.min.js` - `jPulse.UI.docs` is the only other consumer and its own page carries the script tag. So the panel injects `/common/marked/marked.min.js` once when `window.marked` is absent, and falls back to escaped plain text if that load fails. Asking the site to add a script tag would break the §1.1 one-liner, and adding it to the framework header would be a framework edit this item does not make
    - `plg-ai-*` classes over W-220's `jp-float-panel-*`, in the plugin's `view/jpulse-common.css`. **Not `jp-ai-*`** as design §22.1 originally said: `jp-*` is framework-owned and read-only to everything else, and the documented plugin convention is `plg-<name>-*` (`auth-oauth` ships `plg-oauth-*`). Reuse `jp-*` classes freely, create none. Colors from `--jp-theme-*` only
    - all UI text through `webapp/translations/`, `en.conf` and `de.conf`. A chat panel is heavy on strings and W-222 is what makes a plugin able to ship and a site able to override them
    - **not in this item, and the panel is built with the gaps left open:** attachment chips and staged images, and the URL-intercept card, are W-228; the Apply card and the false-claim guard are W-227. Design §12.1 lists them in the panel's eventual surface, which is why they are named here as absent rather than forgotten
  - **phase 4 - `hello-ai`, the mock script, and docs:**
    - **the demo is a scratch pad**: a textarea whose contents never reach the server, which is the honest version of "state only the browser has" - unsaved edits and the current selection, exactly the §7.2 case. `scopeType` is `hello-ai` and the demo's `onAiScopeResolve` returns `canRead: true` and `canWrite: true` for it
    - **three tools, one per shape a site can write**, which is what makes the demo a reference rather than a screenshot:
      - `read_draft` - `host: 'client'`, `module: 'readDraft'`, `requires: 'scope:read'`. The pure-module path: `run({ text, selection }, args)` returns length, word and line counts, the selection, `data.text` (32 KB cap, `truncated` when clipped), and a 160-character `data.excerpt`. This is the descriptor a real site copies
      - `append_draft` - `host: 'client'`, **no module**, `requires: 'scope:write'`, `mutates: true`, `budget: { key: 'writes', max: 3 }`. The escape-hatch path through `adapter.executeTool`, and it has to be one: appending to a textarea is a DOM write and a tool module is pure by definition, so this is not a module and could not be made one. It returns `{ appended, totalChars }` and a one-line summary
      - `get_hello_clock` - `host: 'server'`, ordinary `onAiToolExecute`, so the common case sits beside the exotic one and the panel shows both crossing the same event stream
    - **the demo turn is "summarize the draft and append the summary"**, which is a read then a write - two client-host calls across two rounds, and therefore the first thing in the bundle that exercises a multi-round client-host turn rather than a single call. It is also what shows a budget doing its job: a fourth `append_draft` in one turn is refused by the declarative counter with the tool's own `overMessage`, and the model reads that refusal and stops
    - **a direct write is not propose/apply.** `append_draft` writes immediately, records no proposal, and shows no Apply card; the user's undo is that the text is sitting in a textarea in front of them. W-227 is the pattern where the agent proposes and the user applies, and nothing here pre-empts or half-implements it - `mutates: true` has been on the descriptor since 1.0.0 and this is simply the first tool to set it
    - the "one module, two hosts" claim of design §8.3 is proven by a plugin test running `readDraft.js` in Node against fixture data - which is also the claim being made, that these modules are testable as plain functions. Registering one module twice under two tool names would show it in the UI at the cost of a registration no real site would write
    - **`ai-mock` gains a targeted tool script**, `[mock:tool:<name>:<jsonArgs>]`, calling a named tool with given arguments and summarizing the result in a second round. `[mock:tools]` calls whichever tools happen to be first and second on the offered list with empty arguments - enough to drive the loop, not enough to demonstrate a tool. Same package, same version
    - **the targeted script also takes a sequence, which is a deliberate extension of design §21.5.** §21.5 specifies one call and then a summary, and the demo above cannot be expressed that way: summarizing a draft and appending the summary is a read followed by a write. So the structured form is `script: { type: 'tool', steps: [ { name, args }, … ] }` - one `tool_use` per round in order, then a final text round. A step argument whose value is `$prior.<dotted.path>` resolves against the previous round's first tool result, which is how the appended text comes from what the read returned. `ai-mock` stays domain-free: it resolves a path against a result it was handed, and knows nothing about drafts
    - **`hello-ai` has no scripted buttons.** They only duplicated the `/help` examples. `panel.create({ examples })` lists those prompts in `/help`; the user types them. `runTurn` still accepts `params.script` and `ai-mock`'s `parseScript` still prefers an object over the bracket text, so a site or `curl` can drive a named tool without the model choosing it. The bracket form stays for `curl` and carries one limitation worth documenting rather than fixing: the `[mock:…]` regex stops at the first `]`, so a JSON argument containing `]` (an array) cannot be written in text - objects and scalars are fine, and the structured field has no such limit
    - user-facing copy uses "scratch pad" only (tool ids stay `read_draft` / `append_draft`). The pad is page-local `.local-*`, `resize: both`, stacked as a block under its label so a narrower width does not jump right; the default layout is full width
    - guide sections for the panel, the adapter, and tool modules, plus the `hello-ai` walkthrough
- deliverables:
  - `plugins/ai-core/plugin.json`, `package.json`:
    - `jpulseVersion: '>=2.0.3'` (W-225 is a hard requirement for the namespace), version 1.0.2 for both bundle members
  - `plugins/ai-core/webapp/utils/transport/ws.js`, `index.js`:
    - namespace registration with the async `onCreate` ownership check and `removeIfEmpty()`; origin-tab tracking; the turn message; delta unicast and turn-event broadcast; `executeClientTool` mapping `WebSocketController.request()` codes onto the envelope with `stall` only for a lost connection. `chooseTransport` unchanged
  - `plugins/ai-core/webapp/utils/tools/execute.js`, `modules.js`:
    - `executeTool` dispatches `host: 'client'` through an injected executor and keeps `AI_CLIENT_HOST` when there is none; `modules.js` owns discovery, resolution order, hashing, the purity scan, the refusal, `run()` invocation, and the `dataScope` cache. Tools layer imports neither agent nor transport - the boundary test already enforces it
  - `plugins/ai-core/webapp/controller/aiCore.js`:
    - `GET /api/1/ai/tool-module/:hash/:name.js` as `auth: 'user'`, with immutable caching and a 409 on a hash the server no longer has; the module manifest and `retentionDays` on the capability probe; namespace registration from `initialize()`; `scanToolModules` on `global.AiCore`; `POST /api/1/ai/thread` with `forceNew: true` calls `startNew`; list accepts `limit`
  - `plugins/ai-core/webapp/model/aiThread.js`:
    - `startNew` archives every active row for the scope/user and then `findOrCreateActive`; `listForOwner` honors `limit` (capped at 100)
  - `plugins/ai-core/webapp/utils/agent/turnLoop.js`:
    - the client executor threaded through to `executeTool`, and per-turn module data cached for `dataScope: 'turn'`. After tools, the history gets the assistant `toolCalls` row and one `role: 'tool'` per result (Anthropic requires `tool_result` immediately after `tool_use`)
  - `plugins/ai-core/webapp/utils/agent/prompt.js`:
    - `historyToMessages` skips turns with no `agentText` so a failed or empty turn does not poison the next request
  - `plugins/ai-core/webapp/view/jpulse-common.js`:
    - the `jPulse.ai` namespace: `panel`, `transport` (SSE and WebSocket behind one event stream), the tool-module loader with hash pinning and the reload prompt, and the client bridge that answers `tool_call` - including the size pre-check that replies `AI_RESULT_TOO_LARGE` rather than letting `send()` return false and the request time out
  - `plugins/ai-core/webapp/view/jpulse-common.css`:
    - `plg-ai-*` chat classes over `jp-float-panel-*`; `--jp-theme-*` variables only, no literal colors
  - `plugins/ai-core/webapp/view/hello-ai/index.shtml`, `plugins/ai-core/webapp/utils/ai-tools/readDraft.js`, `plugins/ai-core/webapp/controller/helloAi.js`:
    - the demo view with a launcher, the scratch pad (page-local `.local-*`, resizable both ways), the panel, its adapter (`toolData`, `executeTool` for the append, and the three `describe*` methods), and `examples` for `/help`; `readDraft.js` as the one pure module; and a **separate demo controller** owning the demo's `onAiScopeResolve` / `onAiToolRegister` / `onAiToolExecute` / `onAiToolData` / `onAiPromptFragment` handlers, every registration gated on `scopeType === 'hello-ai'`. Demo hooks do not go into `aiCore.js`: the plugin's product code and its worked example are not the same file, and a developer looking for how a site registers tools should find it in something shaped like a site controller. No scripted send buttons
  - `plugins/ai-core/webapp/view/jpulse-navigation.js`:
    - the `hello-ai` entry alongside the existing AI usage and AI Core entries
  - `plugins/ai-core/webapp/translations/en.conf`, `de.conf`:
    - panel strings: conversation list, compose, the five slash commands with their one-line help and the `/tools` listing labels (host, withheld, reason), `/model`, streaming and stuck-turn, thinking, reconnect, quota, retention, and every error surface. No archive/resume strings — there is no archive chrome
  - `plugins/ai-mock/webapp/controller/aiMock.js`:
    - the `[mock:tool:<name>:<jsonArgs>]` script - one `tool_use` naming that tool with those arguments, then a text round summarizing the result it gets back; plus the structured `steps` sequence with `$prior.<path>` argument resolution, which is what drives the demo's read-then-append turn
  - `plugins/ai-core/webapp/tests/unit/`:
    - namespace authorization: a non-owner refused **before** the upgrade; an unknown thread refused; AI disabled refused; the owner accepted with a resolved `ctx`
    - the bridge: a client tool executed through a fake `request()`; `NOT_CONNECTED` and `CONNECTION_LOST` setting `stall`; `REQUEST_TIMEOUT` not setting it; an oversized reply reported as `AI_RESULT_TOO_LARGE`; media stripped and the size cap applied to anything from a client; gates denying a client tool with no round trip at all
    - modules: hashing stable across reads; site overriding a plugin module by name; an impure fixture refused at import **and** at serve, not merely reported; the exported scanner over the plugin's own directory; a stale hash refused with a reload prompt; `dataScope: 'turn'` building once and `'call'` building per call; the same module run in Node against fixture data while a client-host descriptor names it, which is the two-host claim
    - transport selection: `http` with no client tool offered, `ws` with one, and a client tool over the HTTP path still answering `AI_CLIENT_HOST`
    - the write path: `append_draft` denied with no round trip when the scope grants no `scope:write`; its `writes` budget refusing the fourth call in one turn with the tool's own `overMessage`; a client descriptor with a `module` dispatched to the loader and one without dispatched to `adapter.executeTool`; a missing `adapter.executeTool` answered with a failed envelope naming the method rather than timing out
    - `hello-ai` isolation: the demo's `onAiToolRegister` contributes nothing for a scope that is not `hello-ai`, so `chooseTransport()` still answers `http` for a §1.1 site that has the bundle installed - the regression test for the objective above
    - the mock sequence: a two-step script issues one `tool_use` per round and then a text round; `$prior.<path>` resolves from the previous round's result; an unresolvable path is left as a literal rather than throwing
    - threads: `startNew` archives the active slot and inserts instead of reopening it; `listForOwner` is newest first and honors `limit`
    - the slash catalog: each of the five commands resolves locally and starts no turn, and `//help` sends literal text
    - the panel's adapter contract against a stub adapter, and a scan asserting no panel code reaches into site state
  - `plugins/ai-core/docs/README.md`, `plugins/ai-core/README.md`, `plugins/ai-mock/README.md`:
    - panel and adapter sections including the slash catalog, the tool-module section with the purity rule and the one-line site test, the three tool shapes side by side (server hook, client module, client escape hatch) and why an impure client tool cannot be a module, the `hello-ai` walkthrough, the `jPulse.ai` naming decision, the note that a direct `mutates: true` write is not propose/apply, and what is still absent (attachments, apply cards). `ai-mock`'s README documents the targeted script and the step sequence. The guide's opening can finally be the §1.1 one-liner, because the panel now exists
  - framework-repo docs are **not** part of this item's commits — see notes
- notes:
  - design source: `docs/dev/design/W-223-ai-agent.md`. Read §21.5 for this item's phases, then §8 (shared modules), §11.2 (the socket and its authorization), §12.1 (the adapter), §22.1 (plugin files). Rev 7 records the five decisions this entry implements, Rev 10 the as-built, and TD-07, TD-10, TD-12, and TD-13 are the deliberate omissions - do not "fix" them
  - **repo layout: each plugin is its own git repo and its own commit**, sibling under `plugins/` (gitignored by the framework except `hello-world`), as `auth-mfa` already is. Two commits in two repos, one publish: `@jpulse-net/plugin-ai-core` 1.0.2 carrying `ai-mock` 1.0.2. The header `v1.0.2` is the bundle version, not a framework release
  - `ai-core` is the primary: it owns `bundle.members`, the published package name and version, and the only `webapp/bump-version.conf`, and is the only directory publish and bump are run from. A bump from `plugins/ai-mock/` is refused and names `ai-core`
  - **no framework source files in this item.** W-225 is the framework change and it is a separate item and release. If anything else here appears to need one, that is a design finding worth raising rather than a patch - §22.2 lists what was verified sufficient, and it was wrong once already about `onCreate`, so a second finding is credible and should be written up rather than worked around
  - the panel must not re-implement any of W-220. Drag, resize, clamping, persistence, stacking, the mobile sheet, the ghost animation, and the Escape rule are the widget's, and the item is only the chat content inside it
  - out of scope, each with its own item: propose and apply (W-227); attachments, URL ingest, document conversion, and vision (W-228); `ai-mcp-server` and `ai-openai` (standalone); the reference site's migration, which is that site's repository and is what design §18 step 3 sequences against this item
  - do not run the bump-version script against this repo while implementing, and do not touch `.jpulse/` in tests - use an isolated temp project or the plugin-cli harness
  - **findings from designing this item against the shipped code, none of which needs a framework change** - §22.2's list held up this time: `marked.min.js` is not in `jpulse-header.tmpl` (only Prism is), so the panel loads it on demand; CSP is `script-src 'self'`, so a same-origin dynamic `import()` of a tool module needs no header change; `capabilitiesFromScope` already maps `canWrite` to `scope:write`, so the demo's write tool needs no new gate; `budget.overMessage` already substitutes `%MAX%`; and `runTurn` already forwards `params.script` to the provider, which is what a structured `script` on a turn rides on
  - **findings from implementing against the live panel**, also no framework change: W-220's launcher is not a click binding; pattern-namespace `broadcast` must use the instance path; `[+]` that only archived the open (already archived) row then `findOrCreateActive`'d the leftover active thread, so `forceNew` / `startNew` is the new-conversation path; a `disconnected` from a thread switch is not a reconnect; Anthropic needs `role: 'tool'` immediately after `tool_use`; empty-agent turns must be dropped from history; `read_draft`'s 160-character excerpt is a preview, not the pad (`data.text` is)
  - **why the write is in this item and not deferred to W-227** - considered and rejected, because the question will be asked again: the adapter's `executeTool` escape hatch cannot be demonstrated by any read. A client-host read takes its data from `adapter.toolData()` and its logic from a pure module, and that is the designed path for *every* pure computation over browser state, including reading a selection - so a non-module read tool invites the question "why is this not a module?" and has no good answer. `executeTool` exists because some client tools have **side effects**, and a write is the plainest one. A read-only `hello-ai` would leave this item defining an adapter member it cannot honestly show, in the item whose stated job is validating the adapter contract against `hello-ai`. The coherent read-only alternative would be to defer `executeTool` *together* with the write, leaving the W-226 adapter as `toolData` plus the three `describe*` methods and giving W-227 side-effecting client tools as one lesson - rejected because it deviates from design §12.1's adapter sketch and ships a demo with no write for a release. Merging W-227 in was also rejected: its Apply card chrome targets a panel that does not exist until phase 3 here, it carries a site-configured phrase policy, it has no work-item entry to merge, and design §21.2 groups items so each ends usable and testable
  - the multi-round argument is **not** a reason for the write: `read_draft` then `get_hello_clock` is also two rounds. The mock's step sequence earns its place independently of which tools it names
  - **one deliberate spec extension**, recorded in phase 4: the mock's step sequence. Design §21.5 specifies a single targeted call plus a summary, and "summarize the draft and append the summary" is inherently two calls. Everything else in this entry is a clarification of §21.5, §8.2, §11.2, §12.1, and §22.1 rather than a departure from them. Design Rev 8 carries the same amendment; Rev 10 is as-built after implementation

### W-227, v1.0.3, 2026-09-17: ai: ai-core plugin with propose and apply
- status: ✅ DONE
- type: Feature
- objectives:
  - ship "the agent proposes, the user applies" as framework machinery: proposal records on the turn, the apply and undo endpoints, the Apply card chrome, the false-claim guard, and the history notes that tell the model what became of its cards
  - keep all of it **out of the turn loop** (design §9.1). The loop stays the provider-neutral skeleton it is today: the propose/apply layer subscribes to `onAiTurnAfter`, derives its records from what the turn already stored, and annotates history on the way back into the next prompt. No `propose_` name prefix, no proposal counter, and no `claimsApplyWithoutProposal()` anywhere near a round
  - draw the ownership line where design §12.1 and §13 draw it: the framework owns records, endpoints, card chrome, the guard, and the notes; the site owns preview rendering, validation against its own schema, and the apply and undo execution, through `adapter.renderProposalPreview` / `applyProposal` / `undoProposal`
  - **opt-in throughout:** a read-only agent registers no proposing tool, and then no record, no card, no guard note, and no history note ever exists. That is a property to test rather than assume, the same way W-226 tested that `hello-ai` does not flip every site to the WebSocket transport
  - validate the three new adapter methods against `hello-ai`, for the reason W-226 gave about `executeTool`: an adapter member the bundle defines but cannot demonstrate is not a validated contract, and card chrome is not developable without something that renders in it
  - hand-over item: written to be implemented from this entry plus `docs/dev/design/W-223-ai-agent.md`, which is the authority wherever this entry is thinner
- prerequisites:
  - W-226, `@jpulse-net/plugin-ai-core` 1.0.2: the panel and its transcript render, the adapter, the client-host bridge, and the tool-module loader. The Apply card is chrome inside a panel that already exists, and the panel already re-reads `GET /api/1/ai/thread/:id/turns` on `completed`, which is what makes a server-rendered card list the natural source
  - W-223, 1.0.0, **declarative budgets and argument dedupe already in the tools layer.** `checkBudgetAndDedupe()` plus `budget: { key, max, overMessage }` and `dedupeArgs: true` are exactly what the reference loop's proposal counter and its "already carded" refusal were, so this item adds no counter and no `maxProposalsPerTurn` setting
  - W-223, 1.0.0, `onAiTurnAfter`: defined in the hook catalog and deliberately unused since 1.0.0. This item is its first consumer, which is also the check that a lifecycle hook with no consumer was worth defining
  - W-223, 1.0.0, the turn record: `toolCalls` already stores `{ id, name, args, result }` per call, which is what makes a proposal derivable from a finished turn instead of needing a second write path inside the round
  - W-223, 1.0.0, the four gates: `requires: 'scope:write'` already withdraws a proposing tool from a scope the actor may not write, so nothing new gates the propose side
  - no framework source change (design §22.2). W-225 (v2.0.3) stays the floor and `jpulseVersion` remains `>=2.0.3`
- rationale:
  - a direct write is right when the user is looking at the thing that changed and can undo it by hand - `hello-ai`'s `append_draft` is that case and stays that case. Anything with consequences needs consent *before* the write, and every write-capable agent worth trusting arrives at the same pattern, which is why it belongs in the framework and not in each site
  - the reference site's version of this is spread across its turn loop, its turn model, its controller, and its panel, and the domain-free part outnumbers the bubble-specific part. Records, endpoints, cards, multi-card layout, guard, and notes are generic; only the preview, the schema check, and the write itself are not
  - **the guard exists because models claim things.** With a proposing tool on the list, a reply that says "I've proposed the change - click Apply" when no card was created is worse than a wrong answer: the user waits for a card that never arrives, and on the next turn the model reads its own claim as history and doubles down. The reference site answered it with a hardcoded regex list of English phrases about Apply cards, which is the right behavior and the wrong home - a framework has to take the phrases from the site
  - **deriving the records rather than writing them mid-round is what keeps the loop clean, and it also removes a race.** `onAiTurnAfter` runs in the loop's `finally`, after the `completed` event has already reached the tab - and the panel's reaction to `completed` is to re-fetch the turn list. A subscriber that were the only writer would be racing the very request that renders its cards, and an Apply click could land on a turn whose `proposals` array did not exist yet. One pure derivation function used by the read path, the endpoints, and the subscriber has no ordering assumption to get wrong
  - **`hello-ai` grows exactly one proposing tool**, and it is the pedagogical answer to the risk W-226 recorded when it shipped a direct write first. Two tools on one scratch pad, side by side, say the thing a paragraph of guide prose cannot: `append_draft` writes because the user can see and undo it, `propose_draft_rewrite` proposes because replacing someone's text is not a change to make on their behalf. The propose tool is also a *pure module*, which makes the second point - proposing is read-plus-validate, and the write only happens in `adapter.applyProposal`
  - W-228 (attachments) does not block this and is not blocked by it, per design §21.2
- features:
  - **phase 1 - server:**
    - **`proposes: true` on the tool descriptor**, normalized beside `mutates` and exposed by `publicTool`, so it reaches the capability probe and `/tools`. Deliberately *not* a name prefix: design §9.1 removes the `propose_` check, and a prefix is a naming convention pretending to be a contract - the same argument §9.2 makes against flat capability booleans. `mutates` stays false on a proposing tool, because the tool call itself changes nothing; that contrast is a documented teaching point rather than an accident
    - **the envelope carries the record.** A successful result from a proposing tool sets `data.proposal = { kind, payload, preview?, targetId? }`. `kind` is the site's own label, `payload` is whatever the site needs at apply time and is never interpreted by the framework, and `preview` is optional structured data for the card when the site would rather not render a node itself
    - **the framework mints the id**, deterministically, from the turn id and the provider's tool-call id. The site writes no id code, and re-derivation is stable, which is what lets derivation and persistence be the same list rather than two lists that have to agree
    - **`proposalsFromTurn(turn)` is the single source of truth:** a persisted `turn.proposals` wins, and otherwise the list is derived from `toolCalls` - ok-results carrying `data.proposal`, in call order. The read path (`apiListTurns`), both endpoints, and the history notes all call it, which is the §7.5 "one function answers this question" rule applied to cards
    - **the `onAiTurnAfter` subscription** persists that list once per turn, idempotently, and writes nothing at all for a turn that produced no proposals **except** `proposingOffered: true` when a proposing tool was offered and the reply matched a claim phrase (so the next prompt and the panel guard can see it without rewriting `agentText`). A read-only agent's turns stay byte-identical to today's
    - **`POST /api/1/ai/turn/:id/applied` and `/undone`**, `auth: 'user'`, ownership checked against `turn.createdBy` the way the WebSocket `onCreate` checks thread ownership, unknown turn or unknown proposal answered 404, and both idempotent. They take `proposalId` and nothing else
    - **the endpoints are bookkeeping, not enforcement**, and that is stated in the guide rather than left to be discovered: the real write goes through the site's own authenticated API from `adapter.applyProposal`, which is the only party that can authorize it. The framework cannot authorize a write it does not understand, and pretending otherwise would put a security decision in the layer with the least information. A site needing an idempotency token for its write puts it on its own call, where it matters - the framework endpoint has no use for the reference site's `clientOpId`
    - **the history notes are computed on read, from the records**, inside `historyToMessages`: one note per proposal turn listing its cards as applied / not applied / undone, one note when the latest proposal's latest card was undone, and one note when the last claiming turn produced no card. Only the *latest* proposal's undo matters - an older undo must not read as if a later Apply had been rolled back
    - **stored `agentText` is never rewritten.** The reference appended its missing-card note into the stored text; post-turn that is both too late for the tab and destructive to the record, and it freezes today's phrase list into history. Computing on read means a phrase-list change takes effect on the next prompt and no migration exists
    - **the false-claim phrases are site configuration:** a multi-line field on the AI admin tab, each line a plain phrase or `/regex/flags`, shipped with a short domain-neutral English default list so the guard works before an admin thinks about it. The phrase check only runs for a turn where a proposing tool was actually offered
    - **one framework prompt sentence**, added to §9.6's tool-availability block when any offered tool declares `proposes: true`: a proposing tool creates a card the user must apply; several proposing calls in one turn each get a card and every pending card stays applyable; never claim a change was made unless a proposing tool succeeded. That is framework wording about framework machinery, which is exactly what §9.6 says the framework's own fragments are for
    - **the cap and the duplicate refusal are declarations on the site's tool**, not framework code: `budget: { key: 'proposals', max: N, overMessage }` refuses the N+1st propose in one turn with the tool's own words, and `dedupeArgs: true` refuses a second card for identical arguments. Both already work; this item only documents the convention
    - **the turn loop is not edited**, and a test asserts it: `turnLoop.js` source contains no proposal vocabulary at all. That turns the §9.1 rule into something CI enforces instead of something a reviewer has to remember
  - **phase 2 - panel:**
    - Apply cards render from the `proposals` the server returns with each turn, so a live turn and a reloaded tab take the identical path and there is no client-side derivation to keep in sync
    - **several cards per turn** render in call order, each with its kind label, the site's preview, and its own state - pending, applied, undone, or failed. Two or more pending cards add "Apply all", which applies in order and stops on the first failure rather than plowing on
    - **the adapter is called first and the endpoint second.** Apply awaits `adapter.applyProposal(proposal)` and posts `/applied` only on success, so a failed site write never records an applied card; Undo mirrors it. A rejected promise or a falsy result surfaces on the card, not in a toast that outlives the transcript
    - a card is not applyable while a turn is running on that thread (the model may still be proposing), and renders read-only with a reason when the scope no longer grants `scope:write`
    - `renderProposalPreview` may return a DOM node, or a string, which is escaped as text - a site wanting markup returns a node, so no adapter can inject markup by accident
    - **the guard note** is panel chrome under a completed reply that matched a configured phrase, created no card, and ran in a turn where a proposing tool was offered. The reply itself is left exactly as the model wrote it
    - `plg-ai-card-*` classes in the plugin's `view/jpulse-common.css`, `--jp-theme-*` colors only, no new `jp-*`; every string through `webapp/translations/`
    - the transcript **pins to the bottom** on render, after layout, and on float-panel open, so a reload or a conversation switch lands on the latest cards
    - **user prompts are right-aligned pills** (`plg-ai-user`) with a primary inset bar, so they read as "me" the way the reference panel does
    - **`/tools` names render as `<code>`** after HTML escape — local slash replies go through `renderPlain`, not markdown, so backticks would otherwise stay literal
  - **phase 3 - `hello-ai` and docs:**
    - **`propose_draft_rewrite`** - `host: 'client'`, `module: 'proposeRewrite'`, `requires: 'scope:write'`, `proposes: true`, `dedupeArgs: true`, `budget: { key: 'proposals', max: 3 }`. A **pure module**: it reads the pad through `toolData`, validates the proposed text against the same 32 KB cap `read_draft` uses, and returns a proposal whose payload is the replacement text plus the length it expected to replace. It writes nothing, which is the point
    - the demo adapter gains the trio: `renderProposalPreview` shows what replaces what, `applyProposal` stashes the previous pad text under the proposal id and sets the new text, `undoProposal` restores it. Undo of a textarea is small enough to read in one screen and complete enough to demonstrate the pattern, including two cards in one turn
    - `examples` and the demo prompt fragment grow the propose case, and the fragment names the difference between the two write shapes so the model does not offer to "append" a rewrite
    - **`ai-mock` needs no product change:** the structured `script.steps` with `$prior.<path>` from 1.0.2 already drives "read the pad, then propose a rewrite of what you read". Its 1.0.3 bump is version lockstep with the bundle; do not publish that directory
    - guide sections for propose/apply: the descriptor flag and the envelope, the adapter trio, framework-versus-site ownership, the bookkeeping-not-enforcement note, the phrase policy, and when to choose a direct write over a proposal - which is the guide paragraph W-226 deferred to this item
- deliverables:
  - `plugins/ai-core/webapp/utils/proposals/index.js`:
    - the whole layer, and the only new directory: `proposalsFromTurn()` derivation and id minting, `annotateHistory()` with the cards / undone / false-claim notes, `claimsWithoutCard()` and phrase compilation accepting plain text and `/regex/flags`, `persistTurnProposals()` for `onAiTurnAfter`, `applyProposalRecord` / `undoProposalRecord` (idempotent flags on each record), and `applyThenRecord` / `undoThenRecord` / `canApplyCard` / `pendingCards` so the panel and the tests share the same apply-then-record order. Imports no transport and no provider
  - `plugins/ai-core/webapp/model/aiTurn.js`:
    - `proposals: []` on create, plus `setProposals` and `markProposingOffered`. Applied / undone flags are written through `setProposals` by the proposals helpers rather than as model methods named `markApplied` / `markUndone`. The reference site's flat `proposalId` / `proposalKind` / `proposalPreview` / `proposalTargetId` mirror and its turn-level `applied` / `undone` are **not** ported - they were its own back-compat, and this collection has no history to be compatible with. No new index: every lookup is by `_id`
  - `plugins/ai-core/webapp/controller/aiCore.js`:
    - `POST /api/1/ai/turn/:id/applied` and `POST /api/1/ai/turn/:id/undone` with the ownership check, the derive-if-missing self-heal, idempotent marking, and the logging trio; `onAiTurnAfter` registered in `static hooks`; `proposals` on the `apiListTurns` payload; the phrase list and `proposes` per tool on the capability probe; the `proposalClaimPhrases` field on the AI config tab
  - `plugins/ai-core/webapp/utils/tools/descriptor.js`:
    - `proposes` normalized and carried by `publicTool`
  - `plugins/ai-core/webapp/utils/agent/prompt.js`:
    - the propose sentence in the availability block when a proposing tool is offered, and the `annotateHistory` step inside `historyToMessages`
  - `plugins/ai-core/webapp/utils/agent/settings.js`:
    - `proposalClaimPhrases` merged and normalized, with the shipped default list
  - `plugins/ai-core/webapp/view/jpulse-common.js`:
    - card chrome in the transcript render, several cards per turn, "Apply all", the apply-then-record ordering, per-card states and failure surface, the running-turn and read-only-scope rules, the guard note, local `/tools` names as `<code>`, and `pinMessages` (render + double rAF + `floatPanel.onOpen`)
  - `plugins/ai-core/webapp/view/jpulse-common.css`:
    - `plg-ai-card-*` over the existing chat classes; right-aligned `plg-ai-user` pills; `.plg-ai-plain code`; `--jp-theme-*` only
  - `plugins/ai-core/webapp/translations/en.conf`, `de.conf`:
    - card strings: apply, undo, apply all, applied, undone, apply failed, the no-card guard note, the running-turn and read-only reasons
  - `plugins/ai-core/webapp/utils/ai-tools/proposeRewrite.js`, `plugins/ai-core/webapp/controller/helloAi.js`, `plugins/ai-core/webapp/view/hello-ai/index.shtml`:
    - the pure propose module; the descriptor registered beside the existing three and still gated on `scopeType === 'hello-ai'`; the adapter trio, the new example, and the updated prompt fragment
  - `plugins/ai-core/webapp/tests/unit/proposals.test.js` (plus additions to the existing suites):
    - derivation: proposals from `toolCalls` in call order, ids stable across re-derivation, a persisted array winning, non-ok results and results without `data.proposal` ignored
    - endpoints: a non-owner refused; an unknown turn and an unknown proposal id refused; apply idempotent; undo after apply; the derive-if-missing path when `onAiTurnAfter` has not run yet
    - notes: the cards note wording for applied / not applied / undone; only the latest proposal's undo producing the undone note; the false-claim note when a phrase matches and no card exists; **no note of any kind for a turn where no proposing tool was offered**; a configured phrase list replacing the default, including a `/regex/` entry
    - budgets: the N+1st propose refused with the tool's own `overMessage`, and a second propose with identical arguments deduped - asserting the existing machinery covers what the reference loop counted by hand
    - loop purity: `turnLoop.js` contains no proposal vocabulary
    - panel: `applyThenRecord` calls the adapter before it records, an adapter failure records nothing, two pending cards and apply-all stop on first failure, running / read-only reasons via `canApplyCard`, and a read-only phrase match produces no guard note. Card chrome itself is in `jpulse-common.js` and is not driven through a jsdom suite
    - `hello-ai`: `proposeRewrite.js` run in Node against fixture data (the two-host claim again), and the apply/undo round trip against a stub pad
  - `plugins/ai-core/docs/README.md`, `plugins/ai-core/README.md`:
    - the propose/apply guide section, the adapter trio, the ownership split, the bookkeeping-not-enforcement note, the phrase policy, the direct-write-versus-proposal guidance, and the `hello-ai` walkthrough for the second write shape. Version numbers, never work-item numbers
  - framework-repo docs are **not** part of this item's commits - see notes
- notes:
  - design source: `docs/dev/design/W-223-ai-agent.md`. Read §13 for the layer, §9.1 for what must stay out of the loop, §21.6 for the phases, and §12.1 for the adapter. Rev 12 records this item's decisions
  - **repo layout: `plugins/ai-core` is its own git repo and its own commit**, gitignored by the framework repo. `ai-mock` has no product change; its tree still gets the 1.0.3 header bump as a bundle member. Publish only from `plugins/ai-core`. Add the untracked `webapp/utils/proposals/`, `webapp/utils/ai-tools/proposeRewrite.js`, and `webapp/tests/unit/proposals.test.js` — they are the layer and are not in a `git diff` of tracked files
  - **five spec decisions taken before implementation**, each with the alternative that was rejected:
    - *detection*: `proposes: true` on the descriptor **and** `data.proposal` in the envelope. Envelope-only was rejected because the prompt sentence, `/tools`, and the guard all need to know a proposing tool was *offered*, which a result cannot tell them; descriptor-only was rejected because the payload has to come from somewhere
    - *ids*: framework-minted from turn id plus tool-call id. Site-supplied ids were the reference site's way and would make every site write id code for something the framework can derive deterministically
    - *phrases*: an admin field with a shipped English default. An empty default was rejected because a guard nobody configures is a guard that never fires, and a code-only hook was rejected because phrases are the kind of thing an admin should be able to tune after reading one bad transcript
    - *guard placement*: a history note to the model plus a panel note to the user, with the stored reply untouched. Porting the reference's `agentText` rewrite was rejected for the reasons in features/phase 1
    - *the demo*: one proposing tool in `hello-ai` as a pure module. Tests-and-chrome-only was rejected because it ships three adapter members proven against nothing, which is a weaker standard than the one W-226 set for itself
  - **as-built:** implementation is in `plugins/ai-core` 1.0.3. Applied/undone flags live on each record via `applyProposalRecord` / `undoProposalRecord` and `setProposals`, not as `AiTurnModel.markApplied` / `markUndone`. Persist still writes nothing on a read-only turn; the one extra write is `proposingOffered: true` on a claiming turn with no card. Panel tests cover the shared helpers rather than a jsdom render of `jpulse-common.js`. `turnLoop.js` is header-only in the 1.0.3 diff. Manual hello-ai: propose → Apply → Undo; two and three cards plus Apply all; budget refuses the 4th propose in one turn; identical args dedupe to one card; reload keeps pending cards. `/tools` names render as `<code>`. Prompt/tool copy says several proposing calls in one turn all stay applyable. Panel pins the transcript to the bottom on render, after layout, and on float-panel open. User prompts are right-aligned pills with a primary accent bar. False-claim guard was not forced in the browser (needs a reply that claims a card and creates none)
  - **equivalent functionality to the reference site**, feature by feature, since design §18 step 4 migrates that site onto this: proposal records → derived and persisted per turn; `maxProposalsPerTurn` → `budget: { key: 'proposals' }`; the propose-args dedupe → `dedupeArgs: true`; `claimsApplyWithoutProposal()`'s regex list → configured phrases; its undone and false-proposal system notes → the same two notes computed at history assembly; the missing-card note appended to `agentText` → the panel's guard note; "Apply all" for two or more pending cards → framework chrome; its six proposal kinds and their validators and previews → the site's own modules behind `renderProposalPreview` and its propose tools, since the framework passes `kind` through as a label and never interprets it. Nothing the reference site does is lost; what changes is which side of the line each piece sits on
  - **compatibility is deliberately unconstrained.** The AI plugins are new in this release train, so the spec was changed where it improved DX rather than preserved: `proposes` beside `mutates`, framework-minted ids, no flat proposal mirror, no `maxProposalsPerTurn` setting, and notes computed on read. Design §18 already states that the reference site has no supported upgrade path to preserve
  - out of scope, each with its own item or number: attachments, URL ingest, document conversion, and vision (W-228); `ai-mcp-server` and `ai-openai` (standalone); a hook letting a site contribute its own history notes (design TD-14); re-applying an undone card, which the model is told to propose again instead; the reference site's migration, which is that site's repository
  - do not run the bump-version script while implementing, and do not touch `.jpulse/` in tests - use an isolated temp project or the plugin-cli harness

### W-228, v1.0.4, 2026-09-17: ai: ai-core plugin with attachments, URL ingest, document conversion, and vision
- status: ✅ DONE
- type: Feature
- objectives:
  - let a file, a pasted block of text, a URL, and an image join a conversation, as framework machinery: the source strip and its chips, the prompt manifest, the read tool, URL ingest on the framework's own `UrlFetch`, the document-conversion call path, and image staging that actually reaches a vision model
  - **read through a tool, never injected.** Source text stays out of the prompt and out of the turn record; the prompt carries a metadata manifest and the model asks for an outline, a section, or a character window. That is what makes a 200-page document usable at all, and it is also what keeps untrusted text inside `<<<SOURCE …>>>` markers where the framework's own safety fragment already calls it a quotation rather than a request
  - **keep it out of the turn loop** (design §9.1, §14). Sources, ingest, and conversion never touch `turnLoop.js`; images touch it once, as tolerance for an array `content` where a string used to be pushed. Everything about staging, MIME, caps, and base64 lives in `webapp/utils/attachments/`, the same way propose/apply lives in `webapp/utils/proposals/` - and the same loop-purity test asserts it
  - **text sources live in the tab**, behind a client-host pure module (design §8.2, §14.1). No collection, no upload, no retention policy, and no quota surface for data that one drop or one paste re-creates. What survives a reload is the evidence rather than the text: `sourceRefs` on the turn plus a badge on the transcript
  - **document conversion is not an AI feature.** The two hooks are framework-owned and AI-free (W-229), `ai-core` only calls them, and no converter ships here. A PDF drop on a bare install is a clean refusal naming what to install
  - **bytes stream.** The convert upload and the image upload are `bodyMode: 'stream'` routes with a byte cap, not base64 inside a JSON envelope - which is what `docs/genai-instructions.md` already tells every site to do, and W-228 is the first consumer of W-217 / W-219 anywhere in the tree
  - **opt-in throughout:** a site that never enables sources gets no chips, no manifest, no tool, and no endpoint traffic; a site whose models have no vision gets no image affordance. Both are properties to test rather than assume, the same way W-227 tested that a read-only agent never meets a proposal
  - leave the door open for the site features that start where this item stops: the panel keeps the user's original `File` reachable, and source ids stay opaque, so "attach the document you just read onto my own object" and "a source that outlives the tab" are additive later (design TD-16) instead of a reshaping
  - hand-over item: written to be implemented from this entry plus `docs/dev/design/W-223-ai-agent.md`, which is the authority wherever this entry is thinner
- prerequisites:
  - W-226, `@jpulse-net/plugin-ai-core` 1.0.2: the panel, the site adapter, the client-host bridge, and the tool-module loader with its content-hashed module route. Chips are chrome inside a panel that exists, and the source tool is a module the loader already knows how to run in the tab
  - W-223, 1.0.0, **declarative budgets already in the tools layer.** `budget: { max: 'maxSourceReadsPerTurn', countWhen }` is exactly the reference site's hardcoded read counter plus its `isSourceTextRead()` predicate - an outline listing is free, a text window counts. `settings.maxSourceReadsPerTurn` already normalizes. No counter is written in this item
  - W-223, 1.0.0, the result envelope and `onAiPromptFragment`: `data.media` is a normalizer change on an envelope that already normalizes fields, and the manifest is a framework fragment in a slot design §9.6 reserved for it
  - W-224, 1.0.1: `gateModelsForVision(menu, { hasImages })` and `GET /api/1/ai/capability?hasImages=1`. This item wires `hasImages` to real staged images instead of the query flag, and adds nothing to the menu
  - W-224, `@jpulse-net/plugin-ai-anthropic` 1.0.0: already maps `{ type: 'image', mimeType, data }` content parts onto Anthropic's base64 image blocks, so **no provider release is needed** for vision. Design §9.2 now states the part shape as contract rather than leaving it an accident of the port
  - v2.0.3 `UrlFetch` (`docs/url-fetch.md`): private-address guard, per-redirect re-validation, encoded and decoded byte caps, stall and total timeouts, rate-limit key, and the code vocabulary the panel messages map from. Callers narrow and cannot widen
  - v1.8.0 W-217 `bodyMode: 'stream'` + `StreamBody.pipe`, and v1.8.2 W-219's nginx streaming location and `uploads` rate-limit zone. `SiteControllerRegistry` collects `bodyMode` / `bodyLimit` from plugin controllers the same way it does for site controllers, and `StreamBody` is on `global`
  - Redis, for image staging only. Threads, turns, and sources work without it; images do not, and the capability probe says so rather than failing at paste time
  - W-229 (framework document-conversion hook definitions) is **not** a blocker in either direction: an undefined hook still executes under its mode's default error policy, so phase 3 works before W-229 ships and W-229 needs no consumer to ship (design §16, §21.1)
  - `jpulseVersion` stays `>=2.0.3`. No framework source change in this item
- rationale:
  - the reference site runs all four features and the domain-free part outnumbers the domain part again: the source module, the manifest formatters, the ingest mapping, the convert call path, the staging mailbox, and the chip strip are generic; the propose-onto-a-bubble steering, the extract rule, and the bubble metadata copy are not. Roughly 80% of its source and image *prompt* text is domain steering, which belongs to sites through `onAiPromptFragment` and must not be ported
  - **the shape of phase 1 came from reading the reference site rather than from design §14's bullets.** There, `get_source` is `host: 'client'`, ids are tab-scoped, and the outline / section / window / caps / delimiter logic is already a pure module loaded both in the browser and under Jest. That is `ai-core`'s shared-module shape exactly, so the framework's share is a module, a manifest, chips, and a reserved data path - not a storage subsystem
  - **panel-owned tool data is the difference between attachments that work and attachments that look like they work.** Every other client-host tool gets its data from `adapter.toolData(name)`; a source tool that did the same would silently return nothing on a site with no adapter, which is the one-liner case the whole design is built around. So the bridge consults a panel-internal provider first, and `ai-core`'s own client tool names are reserved
  - **design §14 was wrong about the convert hooks and the correction is worth the item.** `onDocumentConvertRegister` / `onDocumentConvert` are defined by the *reference site's* AI controller and consumed by two of its plugins; the framework has never heard of them. Defining them inside `ai-core` would work identically and say the wrong thing - a PDF-to-markdown converter would depend on an AI package, and document conversion has obvious non-AI consumers (preview, export, search indexing). Two `HookManager` facts make the framework option cheap: an undefined hook executes under its mode default, and an identical second definition is a deliberate no-op, so definer and caller are decoupled and the releases are unordered
  - **base64-in-JSON was the reference site's only option and is no longer ours.** W-217 / W-219 shipped streaming request bodies and the nginx location for them, and nothing in the tree uses either; the framework's own gen-AI instructions say not to buffer a file as base64 JSON. A 4 MB image costs ~5.5 MB of buffered string on the old path. Using the new one also gives that capability its first real exercise
  - **images are the only part that reaches a provider message, and that reach is deliberately one line.** The reference loop pushes staged image content as extra user messages and pushes a tool-returned image the same way; both are content-part tolerance rather than attachment logic, so the module builds the parts and the loop only accepts an array. `data.media` is the mirror of `data.proposal` - lifted out of `data` by the envelope normalizer so the tool-result message the model reads stays text and the bytes are not sent twice
  - **`ai-mock` needs a real product change this time**, unlike W-227's version-lockstep bump: it declares `capabilities: { vision: false }` and its content flattener drops non-text parts, so with only the bundle installed the vision path cannot be exercised at all - no row is ever greyed and no test can assert an image arrived. A second model row that advertises vision and names the images it was handed fixes both and makes `hello-ai`'s gate demonstrable
  - **gating at send rather than at attach** is a correction, not a port: the reference refuses an image when the *site default* provider lacks vision, which blocks a user who has explicitly picked a vision model on that thread. The thread carries its own pair since 1.0.1, and the menu already greys the rows that cannot see
  - the reference site's own reasoning for memory-only sources holds here and is worth restating rather than re-deciding: a mirror in `sessionStorage` writes source text to the user's disk, survives logout on a shared machine, needs a user-and-thread stamp checked on every read, and buys one re-add gesture - while the part users actually need across a reload is the record that external text entered a past turn, which is durable
- features:
  - **phase 1 - sources:**
    - **one pure module** (`webapp/utils/ai-tools/sources.js`) with the whole read surface: outline extraction with headings and sizes, a section read, a character window with `offset` / `limit`, per-source and total character caps, name derivation for a paste, and the `<<<SOURCE …>>>` / `<<<END SOURCE>>>` wrap. Runs in the tab through the module loader and in Jest against fixture data, which is the two-host claim W-226 made and this item re-tests
    - **`get_source` and `list_sources` registered by `ai-core` itself**, `host: 'client'`, `module: 'sources'`, `requires: 'scope:read'`, offered only when sources are enabled and the thread has at least one. `list_sources` returns ids, names, origins, types, sizes, and section counts and never text; `get_source` on a bare id returns the outline, and text only with a section or a window
    - **panel-owned tool data.** The client bridge consults a panel-internal provider before `adapter.toolData`, so a site with no adapter still gets working sources. `ai-core`'s own client tool names are reserved and documented as such
    - **the read budget is a declaration:** `budget: { key: 'sourceReads', max: 'maxSourceReadsPerTurn', countWhen }`, where an outline listing does not count and a text read does. `dedupeArgs` is not set - re-reading the same window is legitimate paging behavior
    - **the prompt manifest** goes in the slot design §9.6 reserved: one line per source with id, name, type, size, section count, and the URL when it has one, plus the sentence naming the read tool. Metadata only. The formatter takes its labels from `onAiScopeResolve` so nothing domain-shaped is baked in
    - **chips in the panel:** add by drop on the panel, by file picker, by paste, or by URL (phase 2); each chip shows a type icon (file / URL / image), name, and a hover tooltip, and click opens a compact details card (copy for name and URL). The strip states its own lifetime - sources end with this tab and this conversation - so a reload does not teach it by surprise. `/new` and a conversation switch clear it, as they already clear cards and the stream buffer. **(+)** wraps on the same row as the last chip. Refuse a type the panel cannot read (PDF with no converter) by a red drop hover; a toast names the reason when useful
    - **`sourceRefs` on the turn record** (id, name, origin, type per source or image present when the turn ran) plus a small badge after the prompt in the transcript listing them. That is the durable half of memory-only: it survives a reload and appears in the user's other tabs even though the sources do not
    - **ids are opaque.** No prefix is validated anywhere in the framework, so a site-resolved source can later join the same manifest and the same tool (design TD-16)
    - **the original bytes stay reachable:** the panel retains the `File` or pasted `Blob` behind a chip and exposes `handle.sources()` and `handle.sourceFile(id)`; `adapter.sourceAttachable(source)` is optional and decides which sources the site would accept on one of its own objects, defaulting to file-origin only. This is what a site needs to attach a document the agent just read onto its own object, and it costs nothing to a site that does not
    - **caps and the enable switch on the AI admin tab:** `sourcesEnabled`, `sourceMimeTypes`, `maxSourcesPerConversation`, `maxSourceChars`, `maxTotalSourceChars`, `maxSourceReadChars`, `maxSourceReadsPerTurn`
    - **no loop edit**, asserted by the same style of test W-227 used: `turnLoop.js` contains no source vocabulary
  - **phase 2 - URL ingest:**
    - **`POST /api/1/ai/source/fetch`** on `UrlFetch`, narrowing rather than widening: an accept list of `text/plain`, `text/markdown`, `text/csv`, `text/html` (extended by registered converter types once phase 3 lands), a byte cap under the site ceiling, a rate-limit key, and `req` passed so an SSRF attempt names who tried it
    - **a small HTML extractor** - readability-lite, no DOM library, no headless browser: main-content heuristic falling back to `<body>`, headings and lists to markdown, `<script>` / `<style>` contents never emitted, entity decoding, a `<title>` with the site-name suffix trimmed for the source name, and text that itself contains `<<<SOURCE` left harmless. Fixtures are small and hand-written so they do not rot
    - **an empty-shell verdict** for a client-rendered page: below a text-to-bytes threshold the answer is the paste instruction, not a shell of navigation text
    - **provenance** on the source: requested URL, final URL, fetch time, content type, decoded byte count, digest, and redirect count, shown on the chip and carried in `sourceRefs`
    - **one user-facing message per `UrlFetch` code**, each naming what to do - which host to allow, which type is supported, that the page is over the cap, that only http and https are accepted
    - **the URL-intercept card**: a URL in the compose box offers to fetch it before the turn starts. Accept ingests and sends; cancel puts the prompt back and spends no turn; send-as-is skips the fetch. Hidden when the prompt is a question *about* the link rather than a request to read it (`what` / `describe` / `is this the link`, plus the German question words), and never an agent-callable fetch - that would reintroduce the outbound channel exfiltration mitigation relies on not existing. Add-URL uses `jPulse.UI.confirmDialog` (Enter and the default button close on a real URL; `true` from an object-style button is `dontClose`)
    - admin keys: `urlIngestEnabled`, `urlMaxBytes`, `urlTimeoutMs`, `urlAllowedHosts`, `urlBlockedHosts`
  - **phase 3 - document conversion:**
    - **`POST /api/1/ai/source/convert`** as a **streaming route**: `bodyMode: 'stream'`, `bodyLimit` as the byte cap, raw bytes with the metadata in headers or query, `StreamBody.pipe` into a capped buffer, and a 413 in the framework's own envelope when it overflows. The converted markdown comes back as an ordinary in-tab source chip, so phase 1's memory-only rule holds for a converted document too
    - **`listConverters()` over `onDocumentConvertRegister`**, and conversion over `onDocumentConvert` - both called without being defined here (W-229 owns the definitions). Per-MIME registration; a descriptor may declare its own page ceiling, a unit label (`page` / `sheet` / `slide`) that drives truncation copy, and formats it explicitly refuses
    - **ordered retry across converters claiming one type:** `executeForPlugin` dispatches to a single plugin, so `ai-core` tries the registered claimants in order until one returns text. That is what makes "extract first, OCR when the text comes back empty" a plugin install rather than a code change
    - **caps are the caller's:** the site page limit merged with the converter's, the source character cap, and a convert timeout. Truncation is reported in the converter's own unit
    - **an empty extract is a refusal that names the reason** - a scanned PDF has no text layer, so its message must not offer the paste workaround; an encrypted or image-only file says that instead
    - the panel's accept list and its chip type labels follow the live descriptor list, so a disabled or absent converter never offers a type it cannot read
    - **no converter ships.** A PDF drop on a bare install is a clean refusal naming what to install. Whether the reference site's PDF and Office converters become published framework plugins is a separate item on the same hooks, and needs no change here
  - **phase 4 - images and vision:**
    - **`POST /api/1/ai/image/stage`**, a streaming route like convert: raw bytes, MIME allowlist (`image/png`, `image/jpeg`, `image/webp`, `image/gif`, with `image/jpg` normalized), a byte cap, and a client-side resize to a maximum edge before upload. Bytes are parked in Redis under a key scoped to user, thread, and image id with a short TTL. **Redis only** - no fallback to process memory, Mongo, or disk, because an image that outlives its turn is a copy of a user's file somewhere nobody manages
    - **park-on-send / read-once / delete:** the turn reads each key once and deletes it; chip removal, `/new`, and a conversation switch delete it too
    - **gating at send, against the thread's pair.** Staging is always allowed; the send either carries the images or says why it cannot. `gateModelsForVision` already greys the rows that cannot see, and `hasImages` on the capability probe now comes from real staged images rather than only the query flag
    - **the capability probe reports images unavailable when Redis is absent**, and the panel hides the affordance rather than failing at paste time
    - **content parts:** the attachments module builds `[ { type: 'text', … }, { type: 'image', mimeType, data } ]` and the loop tolerates an array `content` where it used to push a string. The images manifest lists id, name, pixel size, and format; the turn record and the persisted tool call keep metadata only
    - **`data.media` for a tool that returns an image:** the envelope normalizer lifts it out of `data` at execute time so the tool-result message stays text, and the parts become a follow-up user message. How many images one turn may pull in is an ordinary `budget` on the site's tool, not a loop counter. This is what a site needs to hand the model a picture stored on its own object
    - **`ai-mock` gains a vision model row** that advertises `capabilities.vision` and names the images it was handed, so the gate is demonstrable in `hello-ai` and the whole path is assertable in CI with no API key and no spend
    - admin keys: `imagesEnabled`, `imageMimeTypes`, `maxImageBytes`, `maxImageEdge`, `imageStageTtlSec`
    - **`hello-ai` grows the paste case:** drop or paste an image on the panel, ask what it says, and watch the model pick a vision row - with the mock's non-vision row greyed beside it. Plus one source dropped and read end to end, which is the phase 1 demo
- deliverables:
  - `plugins/ai-core/webapp/utils/attachments/` (`index.js`, `ingest.js`, `html.js`, `convert.js`, `images.js`, `stream.js`, `tools.js`):
    - the layer: manifest formatters for sources and images (plus the empty-sources policy block), `UrlFetch` ingest mapping and per-code messages, the HTML extractor and its empty-shell verdict, provenance, the converter registry call path with cap merge and ordered retry, the Redis image mailbox (stage, take-once, delete), the content-part builder, and the `list_sources` / `get_source` descriptors. Imports no transport and no provider
  - `plugins/ai-core/webapp/utils/ai-tools/sources.js`:
    - the pure read module: outline, section, window, caps, delimiter wrap, paste naming
  - `plugins/ai-core/webapp/utils/agent/inputs.js`:
    - the thin loop-facing wrapper: `openUserContent`, `refsForTurn`, `turnExtras`, `followFromResult`. Keeps MIME, Redis, and staging vocabulary out of `turnLoop.js`
  - `plugins/ai-core/webapp/controller/aiCore.js`:
    - `POST /api/1/ai/source/fetch`; `POST /api/1/ai/source/convert` and `POST /api/1/ai/image/stage` as `bodyMode: 'stream'` entries in `static routes`; `list_sources` / `get_source` registration; `sourceRefs` on the turn payload; real `hasImages` on the capability probe plus an images-available flag; the new admin fields; the logging trio on every endpoint
  - `plugins/ai-core/webapp/utils/tools/execute.js`:
    - `data.media` lifted out of `data` at normalize time (`liftMedia`); `stripMedia` leaves the stored tool-result text-only
  - `plugins/ai-core/webapp/utils/agent/prompt.js`:
    - the sources and images manifest fragments in §9.6's slot, parameterized by `onAiScopeResolve` labels; the empty-sources policy when those tools are withheld as `no-sources`
  - `plugins/ai-core/webapp/utils/agent/turnLoop.js`:
    - user `content` may be an array of parts; `sourceRefs` written on create; `followFromResult` extras become follow-up user messages. No staging, MIME, or base64 vocabulary — those stay in `inputs.js` / `attachments/`
  - `plugins/ai-core/webapp/utils/agent/settings.js`:
    - the source, URL, convert, and image keys merged and normalized with defaults
  - `plugins/ai-core/webapp/model/aiTurn.js`:
    - `sourceRefs: []` on create, written once per turn. No new index
  - `plugins/ai-core/webapp/view/jpulse-common.js`:
    - the chip strip and its add paths (drop, picker, paste, URL), chip tooltip and click-details pop, compact compose (Send beside the prompt), drop hover, toasts, the intercept card, staged-image chips, the panel-internal tool-data provider, `handle.sources()` / `handle.sourceFile(id)`, the `sourceRefs` badge in the transcript, and the images-unavailable and vision-gated surfaces (gate clears `pendingUser` so the dots stop)
  - `plugins/ai-core/webapp/view/jpulse-common.css`:
    - `plg-ai-chip-*` (including pop and icon), `plg-ai-strip-*` (`display: contents` on the chip wrap so **(+)** stays with the last chip), `plg-ai-intercept-*`, `plg-ai-compose-row`, drop hover; `--jp-theme-*` colors only, no new `jp-*`
  - `plugins/ai-core/webapp/translations/en.conf`, `de.conf`:
    - chip, strip, outline, intercept-card, refusal, and cap strings, plus the every-`UrlFetch`-code message set and the lifetime notice
  - `plugins/ai-core/webapp/view/hello-ai/index.shtml`, `plugins/ai-core/webapp/controller/helloAi.js`:
    - the source and image demo, the vision-gate walkthrough, and the prompt fragment that forbids "I have no web/file access" as a capability. Nav: Hello AI under site hello demos only (breadcrumb matches `/hello-plugin/`)
  - `plugins/ai-mock/webapp/controller/aiMock.js`:
    - a second model row advertising `capabilities.vision`. Default vision reply is `I can see <file>.` (not the flattened safety caption). The **only** product change to the mock
  - `plugins/ai-core/webapp/tests/unit/attachments.test.js` (plus additions to the existing suites):
    - module: outline from headings, section read, window paging, caps and truncation flags, delimiter wrap, a source whose text contains `<<<SOURCE`, CJK at maximum size
    - manifest: metadata only and never text; labels from scope resolution; empty sources add no block
    - budget: an outline listing free, the N+1st text read refused with the tool's own message
    - ingest: each `UrlFetch` code mapped to its message; HTML to markdown on hand-written fixtures; the empty-shell verdict; provenance fields; a converter type widening the accept list only when a converter is registered
    - convert: cap merge between site and descriptor, ordered retry when the first claimant returns empty, empty-extract refusal wording, oversize body 413, and the hooks executing while undefined
    - images: MIME normalization and rejection, byte cap, TTL, take-once deletes the key, Redis absent reports unavailable rather than throwing at send, send-time gating against the thread's model rather than the site default, content parts assembled in order
    - `data.media`: lifted out of `data`, the tool-result message left text-only, the follow-up user message carrying the parts, and the budget refusing the N+1st media call
    - loop purity: `turnLoop.js` contains no attachment vocabulary
    - opt-in: sources disabled means no tool offered, no manifest block, and no endpoint route taken; no vision means no image affordance and no image parts
  - `plugins/ai-core/docs/README.md`, `plugins/ai-core/README.md`:
    - the attachments guide: the source lifetime and why it is what it is, the read tool and its windows, the manifest, what a site adds through `onAiPromptFragment` versus what the framework says, URL ingest and its caps, installing a converter, the vision path and its Redis requirement, `data.media`, and the `handle.sources()` / `sourceAttachable` pair for attaching a source onto a site object. Version numbers, never work-item numbers
  - framework-repo docs are **not** part of this item's commits - see notes
- notes:
  - design source: `docs/dev/design/W-223-ai-agent.md`. Read §14 for the layer, §21.7 for the phases, §9.2 for the content-part contract, §9.6 for the manifest slot, §12.1 for the panel and adapter surface, and §16 for the two hooks `ai-core` executes but does not own. Rev 14 records this item's decisions; TD-15 and TD-16 are the deliberate omissions
  - **repo layout: `plugins/ai-core` and `plugins/ai-mock` are their own git repos and their own commits**, gitignored by the framework repo. Two commits, one publish, from `plugins/ai-core` only. `ai-mock` has a real product change this time (the vision row), so its commit is not a header-only bump
  - **W-229 is a separate framework item and a separate release**, and neither item blocks the other (design §21.1). Do not fold the hook definitions into this item, and do not define those names inside `ai-core`
  - **six spec decisions taken before implementation**, each with the alternative that was rejected:
    - *where source text lives*: the tab, behind a client-host pure module. A server-side source store was rejected because it adds a collection, retention, and a quota surface for text one gesture re-creates, and a `sessionStorage` mirror was rejected for the reasons the reference site recorded - disk copy, shared-machine survival, and a stamp check on every read, in exchange for one re-add
    - *who owns the convert hooks*: the framework, AI-free (W-229). Defining them in `ai-core` was rejected because it makes a PDF converter a dependent of an AI package; leaving them undefined entirely was rejected because a published converter needs one canonical contract to be written against, not one per site
    - *byte transport*: raw bytes on `bodyMode: 'stream'` routes. Base64 in a JSON body was the reference site's only option and is rejected here - the framework's own guidance says not to, and it buffers ~1.37× the file as a string
    - *vision gate placement*: at send, against the thread's pair. Refusing at attach against the site default was rejected because it blocks a user who has picked a vision model
    - *tool-returned images*: `data.media`, lifted out of `data` by the envelope normalizer. A sibling of `data` was considered and rejected as blunter; leaving tool-returned media out entirely was rejected because reading a picture stored on a site's own object is the obvious second case after pasting one, and the loop tolerance is the same line either way
    - *the original `File`*: retained by the panel and exposed on the handle, with an optional `adapter.sourceAttachable` predicate. Handing the site only the panel's resized or clipped copy was rejected as a quiet dishonesty - a user who drops a 4000px image and gets a 2048px one on their object was never told
  - **as-built:** implementation is in `plugins/ai-core` 1.0.4 and `plugins/ai-mock` 1.0.4. Chip chrome is a `jp-tooltip` plus a click details card, not an outline expander. Compose is one row (prompt + Send). Drop hover is green/red; refusals toast. Add-URL is `confirmDialog` (object-button `true` means dontClose). Intercept hides on question-about-link wording. `formatSourcesEmptyBlock` plus the hello-ai fragment stop "I have no web access" when a URL is already attached, and after reload they ask the user to re-attach rather than claiming a missing capability. `sourceAttachable` is documented and the panel never calls it (no attach-to-object chrome). `data.media` is lifted in `execute.js`, not `envelope.js`. `turnLoop.js` grew `inputs.js` imports, `sourceRefs` on create, and `stripMedia` / `followFromResult` — still no MIME, Redis, or base64 in that file. Hello AI lives only under `siteHelloExamples` so the breadcrumb is Hello World Site Demos. Manual: drop txt / image; PDF refuse; URL fetch + chip; intercept on `fetch https://…` and hidden on `what is https://…`; describe URL proposes a pad rewrite and does not write the pad; Mock Echo + image toasts the gate and stops the dots; Mock Vision replies `I can see <file>.`; reload clears chips and keeps the Used badge; Apply / Undo on a rewrite card
  - **equivalent functionality to the reference site**, feature by feature, since design §18 step 4 migrates that site onto this: its tab-local source module → the framework's pure module and panel state; its manifest formatters → framework formatters parameterized by scope labels; its hardcoded read counter and `isSourceTextRead()` → one `budget` declaration; its URL ingest → the same mapping over framework `UrlFetch` with the code messages preserved; its convert endpoint and converter registry → the framework call path with ordered retry added; its Redis image mailbox → the same mailbox, minus the default-provider refusal; its `get_image` on a stored object → `data.media` on a site tool; its `attachable` manifest flag and retained `File` → `adapter.sourceAttachable` plus `handle.sourceFile`. What that site keeps is everything domain-shaped: the bubble-placement steering, the extract rule, the metadata copy, and its own propose tools
  - **two ownership shifts to expect in that migration**, neither a defect: cross-card ordering for a dependent proposal chain is now a change in the framework's "Apply all" walk rather than in site code, and mobile panel layout is now plugin CSS interacting with `floatPanel` geometry rather than site CSS
  - **compatibility is deliberately unconstrained.** The AI plugins are new in this release train, so the spec was changed where it improved DX rather than preserved: streaming byte routes, send-time vision gating, panel-owned tool data, opaque source ids, and `data.media` are all departures from the reference implementation
  - out of scope, each with its own item or number: the PDF and Office converters as published framework plugins (a separate item on W-229's hooks); OCR (a further converter, no design change); citations and page anchors; an agent-callable URL fetch; server-resolved or cross-tab sources (design TD-16); a conversation-scoped tool cache (design TD-15); image generation; `ai-mcp-server` and `ai-openai`; the reference site's migration, which is that site's repository
  - do not run the bump-version script while implementing, and do not touch `.jpulse/` in tests - use an isolated temp project or the plugin-cli harness
  - the nginx streaming location is **optional**: without it production nginx buffers the whole body and the routes still work, with `client_max_body_size` as the outer gate. Say so in the guide rather than making a plugin install depend on an nginx edit

### W-229, v2.0.4, 2026-09-17: hooks: jPulse-owned document conversion and preview hooks
- status: ✅ DONE
- type: Feature
- objectives:
  - define **four** hooks in the framework hook catalog as **generic, AI-free** contracts - `onDocumentConvertRegister` / `onDocumentConvert` ("turn these bytes into text") and `onDocumentPreviewRegister` / `onDocumentPreview` ("turn these bytes into a thumbnail") - so a PDF, Office, or preview plugin is a framework plugin rather than a dependent of an AI plugin
  - ship the definitions, the catalog entries, and the documentation - **no converter, no previewer, and no caller**. The framework converts nothing, renders nothing, and calls none of the four; the first convert caller is `ai-core` (W-228), and converters and previewers are separate items
  - keep the contract the reference implementation proved, and **correct the three places it is wrong** rather than canonizing them: a convert definition that omits its own output keys, a preview definition that omits an input its previewers read, and a preview output field named `jpegBase64` that carries a PNG
  - **good DX beats migration cost.** These names are new to the framework and their only current users live in one site's repository, so this is the last cheap moment to name the fields correctly. A downstream rename is documented, not avoided
- prerequisites:
  - W-209, v1.7.13: `HookManager.defineHooks()`, per-hook `onError` / `contextKeys` / `stability`, and the introspection surface these definitions appear in
- rationale:
  - **the names exist in the wild, defined in the wrong places.** In the reference site (bubblemap) the convert pair is declared by its AI controller (`site/webapp/controller/aiAgent.js`) and the preview pair by its file-attachment controller (`site/webapp/controller/bubbleFile.js`), with three plugins registering against them: `doc-convert-pdf`, `doc-convert-office`, and `doc-preview-text`. That works for one site and cannot work for a published plugin - the contract is invisible outside that repository, and every other site wanting a PDF reader would write its own slightly different definition
  - **document handling is not an AI feature, and the reference site demonstrates it rather than arguing it.** The preview pair's only caller is a file-attachment controller with no AI anywhere near it. Hooks named and owned by an AI plugin would force document preview, export, and search indexing to install an AI package for a contract that has nothing to do with models
  - **one plugin spans both families, which is why they land together.** `doc-convert-pdf` registers all four hooks. Defining only the convert pair would leave the first plugin anyone ports with half its hooks in the catalog and half as `unverified` rows - the exact "why is only half of this here?" moment the catalog exists to prevent
  - **the definition is not permission to call, which is what makes this cheap and unordered.** `HookManager` executes an undefined hook under the mode's historical default (`continue` for `execute`, `abort` for `executeForPlugin`), so `ai-core` calls the convert pair before this item ships and this item ships with nothing calling any of the four. What a definition adds is the catalog row, the documented context keys, the explicit error policy, and one canonical wording - not the ability to work
  - **a conflicting second definition is harmless, and the "identical is a no-op" escape hatch does not apply to anyone outside the framework.** `_isSameDefinition()` compares `owner`, so a site or plugin re-defining these names always conflicts, even with word-for-word identical wording - which the reference site's register description already is. The framework's definition wins (it is seeded at module load, ahead of plugins and site controllers) and the loser is recorded with a logged error. Nothing breaks; the log line is the migration reminder
  - the framework already defines hooks ahead of any implementation - `onUserBeforeDelete`, `onUserAfterDelete`, and `onUserSyncProfile` are `stability: 'planned'` - so this is an established pattern rather than a new one
- features:
  - **four definitions in `webapp/utils/hook-definitions.js`**, in one new `Document conversion and preview hooks (4)` section. All four `canModify: true`, `stability: 'planned'`, `since: '2.0.4'`:
    - `onDocumentConvertRegister` - `description: 'Contribute a document converter descriptor'`, `contextKeys: ['converters']`, `onError: 'continue'` (one broken converter must not remove the others)
    - `onDocumentConvert` - `description: 'Convert document bytes to text or markdown'`, `mode: 'executeForPlugin'`, `contextKeys: ['bytes', 'mimeType', 'maxChars', 'maxPages', 'timeoutMs', 'text', 'markdown', 'pages', 'meta']`, `onError: 'abort'` (a failed conversion is the caller's error to report, not something to swallow)
    - `onDocumentPreviewRegister` - `description: 'Contribute a document preview descriptor'`, `contextKeys: ['previewers']`, `onError: 'continue'`
    - `onDocumentPreview` - `description: 'Render a preview image from document bytes'`, `mode: 'executeForPlugin'`, `contextKeys: ['bytes', 'mimeType', 'originalName', 'maxEdge', 'timeoutMs', 'imageBase64', 'previewMime', 'width', 'height']`, `onError: 'abort'`
    - `stability: 'planned'` is not optional here: the catalog-honesty test (`hook-definitions.test.js`) fails any non-planned framework definition with no `execute*` call site under `webapp/`. The trigger for `stable` is a framework-side consumer, not a plugin-side one
  - **the three corrections to the reference contract**, each one a field an author would otherwise have to read someone else's source to discover:
    - **output keys are part of the contract.** The reference definitions list inputs only, so nothing tells a converter author that `text`, `markdown`, `pages`, and `meta` are where the answer goes, or that a caller reads `markdown || text` in that order
    - **`originalName` is an input.** The reference preview definition omits it, yet its caller passes it and `doc-preview-text` selects on its extension
    - **`jpegBase64` becomes `imageBase64`, and the description drops "first-page JPEG".** `doc-preview-text` returns a PNG in that field and adds `previewMime` to say so, so the reference name is already inaccurate in its own tree, and neither previewer is limited to a first page. `previewMime` is documented as the authoritative format, defaulting to `image/jpeg` when a previewer omits it
  - **the descriptor shapes are documented, not enforced:**
    - converter: `plugin` (the join key `executeForPlugin` dispatches on - the plugin's own name, the same one that registers `onDocumentConvert`), `mimeTypes`, `extensions`, `label`, `maxPages`, `unitLabel` (`page` / `sheet` / `slide`, which drives truncation copy), and `rejects` as `{ extensions, reason, suggest }` rows so a `.doc` drop can answer "legacy Word format. Save as .docx."
    - previewer: `plugin`, `mimeTypes`, `extensions`, `label`
    - unknown fields pass through untouched - both reference converters carry an `engine` id this way - so a plugin keeps its own diagnostics on the descriptor without a framework change
    - one descriptor per **format**, not per plugin: a plugin claiming three OOXML types pushes three rows, because the page ceiling and the unit label differ per format. Aliases of one format may share a row
  - **the result shapes are documented:** convert returns `markdown` or `text` (markdown preferred; `text` is what both reference converters actually write), optional `pages` for structured output, and `meta` carrying truncation state in the converter's own unit plus an empty-extract reason. Preview returns `imageBase64`, `previewMime`, `width`, and `height`
  - **an empty extract and a thrown error are different signals, and the difference is documented because it is easy to get backwards:** an empty result plus `meta.empty` / `meta.emptyCode` means "I claimed this type and found nothing, try the next claimant"; a throw aborts the call under `onError: 'abort'` and ends the caller's attempt. `meta.emptyCode: 'no-text-layer'` is the pinned value for a scanned page, because that is the one refusal whose message must not promise a copy-and-paste workaround - there is no text to select
  - **selection is the caller's job, and the two families differ**, so the docs state each rather than letting an author assume symmetry: convert matches a MIME type exactly and the caller retries every claimant in registration order until one returns text (which is what makes "extract first, OCR on empty" a plugin install); preview accepts wildcard claims (`text/*`, `*`) where an exact type or extension match wins over a wildcard regardless of array order, and picks one previewer with no retry
  - **`docs/hooks.md`** gains `onDocument*` in the naming table, a catalog section for the four, and a responsibilities section: a copy-paste converter skeleton, a copy-paste previewer skeleton, the descriptor / result / `meta` tables, what a caller owes (caps, timeout, selection order, and the user-facing refusal), and the note that all four are defined ahead of any framework consumer
  - **tests** in the existing hook-manager suite: all four definitions present and normalized; a register hook surviving one throwing handler; both `executeForPlugin` hooks aborting with `hookName` and `pluginName` stamped; an identical framework-owner re-definition being a no-op; a differing or non-framework definition keeping the framework's and recording the conflict; and all four executing cleanly with no handler registered. The existing exact-list assertion on `findHooks({ stability: 'planned' })` grows from three names to seven
  - **design Rev 16** in `docs/dev/design/W-223-ai-agent.md`: header, §14.3, §16, §21.1, and §22.2 now say four hooks; §22.2's "roughly a dozen lines" becomes four definitions plus a `docs/hooks.md` section
  - **orientation pages** (same release, not converters): `docs/ai-agent.md` (install, configure, one-controller case) and `docs/internationalization.md` (translation files, merge order, views, controllers), with pointers from README, `.markdown`, genai-instructions, genai-development, site-customization, creating-plugins, handlebars, template-reference, hooks See Also, and the AI Core plugin README
- deliverables:
  - `webapp/utils/hook-definitions.js`:
    - the four definitions in one new section
  - `docs/hooks.md`:
    - the naming-table row, the four catalog rows, and the converter / previewer / caller responsibilities section. Version numbers, never work-item numbers
  - `webapp/tests/unit/utils/hook-manager.test.js` (or the hook-definitions suite):
    - the cases above, including the widened `planned` list
  - `docs/dev/design/W-223-ai-agent.md`:
    - Rev 16: four hooks, not two
  - `docs/ai-agent.md` (new):
    - site-facing agent orientation
  - `docs/internationalization.md` (new):
    - translation files, merge, views, controllers
  - pointers: `docs/.markdown`, `docs/README.md`, `docs/genai-development.md`, `docs/genai-instructions.md`, `docs/site-customization.md`, `docs/plugins/creating-plugins.md`, `docs/handlebars.md`, `docs/template-reference.md`, `plugins/ai-core/docs/README.md`
- notes:
  - design source: `docs/dev/design/W-223-ai-agent.md` §14.3 (the contract and why the framework owns it), §16 (hooks `ai-core` executes but does not own), §21.1 (why this is a prerequisite in name only), §22.2 (the third framework source file, and why ownership rather than capability made it an item). Rev 14 records the original decision
  - **the design doc describes two hooks and needs a revision to match:** §14.3, §16, §21.1, and §22.2 all say two, and §22.2 estimates "roughly a dozen lines". The preview pair turning out to be an already-shipped sibling family with a non-AI caller is that section's own argument demonstrated, and is worth recording as such
  - **this item ships no converter and no previewer.** The reference site's PDF converter needs `poppler-utils` on the host with an `unpdf` fallback, its Office converter parses OOXML in process, and its text previewer paints a card; publishing any of them as a framework plugin is a separate item with its own host-prerequisite documentation
  - **W-228 does not wait for this and this does not wait for W-228** - see the rationale. If W-228 ships first, the convert hooks run with `unverified` rows in the catalog until this lands
  - **the reference site's migration is documented here, not scheduled here, and blocks nothing.** For whenever that site adopts the framework contract: delete the two definitions in `aiAgent.js` and the two in `bubbleFile.js`; rename the `jpegBase64` context field to `imageBase64` where it is written (`doc-convert-pdf`, `doc-preview-text`) and where it is seeded and read (`site/webapp/utils/documentPreview.js`). That util's own return shape and `emptyPreview()`'s `previewThumb` are site-internal names rather than part of the hook contract, so they may stay as they are. Until the definitions are deleted, the framework's win and the site's loss are logged as conflicts - noisy, not broken
  - do not add any `onDocument*` name to the AI hook family or the `onAi*` prefix. The whole point of the item is that these four are not AI hooks

### W-230, v1.0.5, 2026-09-17: ai: generalize the panel interface - site-owned regions and slash commands
- status: ✅ DONE
- type: Feature
- objectives:
  - stop `ai-core` deciding the whole panel UI. A site contributes its own stacked **regions** at framework-named anchors, and owns the **complete slash-command list** - keeping framework implementations available by name so opting in costs one word and overriding costs one function
  - **the framework owns order and placement, the site owns content.** That is not a new pattern in this plugin: `assemblePrompt` already fixes the fragment order and lets the site fill the slots through `onAiPromptFragment`. The panel gets the same split, so panel layout stays the framework's to change and no two plugins fight over a position
  - **presence-gated, like the rest of the adapter.** Every adapter member is called behind `typeof adapter.X === 'function'`; a site that wants no context row, no extra command, and no region implements none of it and sees none of it. No seam a site has to author is on by default. The framework's own additions to the command catalog are the exception, and they are gated on data the panel already holds rather than on site code
  - **the context row is the first real consumer**, gated on `adapter.contextOptions()`. Context and target are already framework concepts - the panel sends `context` / `target` on every turn and the prompt names them in the scope block - so the chrome for them belongs to the framework, and the labels belong to the site
  - **a command that reports framework state is a framework command.** Quota, the attached-source list, transport and thread status, and the conversation list are already in the panel's own state or in the capability probe, so shipping them as gated defaults costs ten lines each in one place instead of ten lines in every site. That, more than the seam alone, is what shrinks the reference site's nine-command catalog
  - retire the dead ends this exposes: the closed five-name `SLASH_COMMANDS` list is gone, and `adapter.describeScope()` is removed from the contract - it was documented, implemented in `hello-ai`, never called, and wiring it would need a new turn field this item rules out. `options.examples` is **kept**, as the content slot of `/help` rather than a second way to write it, and gains clickable `[[label]]` rows. The catalog algorithm lives in `slash.js` (Jest); the panel IIFE ports the same functions because it cannot import ESM
  - do this **before** the reference site's migration and before more sites adopt `panel.create`. It changes that function's contract, which is cheap now (design §18 preserves no upgrade path) and expensive once several sites depend on it
- prerequisites:
  - W-226, `@jpulse-net/plugin-ai-core` 1.0.2: the panel, `jPulse.ai.panel.create`, the adapter contract, the five-command slash picker, and the local-reply rows that a site command will post into
  - W-227, 1.0.3: Apply cards and `renderProposalPreview`, which already proved the node-or-escaped-text return this item reuses for region content
  - W-228, 1.0.4: the attachment strip, chip pop, and URL-intercept card - the rows a new anchor has to sit beside without disturbing them, and the pin-to-bottom behavior a region render must not break
  - W-220, v2.0.0 `jPulse.UI.floatPanel`: panel geometry. A region changes the transcript's available height, so the existing pin pass is the seam this item leans on rather than replaces
  - `jpulseVersion` stays `>=2.0.3`. **No framework source change**, and no server change: regions and commands are panel-side, and `context` / `target` already travel on the turn
- rationale:
  - **the slash catalog is closed, and the reference site proves the cost.** `SLASH_COMMANDS = ['help', 'tools', 'model', 'new', 'cancel']` is a constant in the panel; `parseSlashCommand` returns `null` for anything else, so typing `/context` is answered locally with "Unknown command. Try /help." The panel reserves the entire `/name` namespace and then refuses to share it. That site's catalog is nine commands with aliases (`quota`, `conversations`/`resume`, `status`, `context`, `sources`, plus `clear`), and four of them have nowhere to go
  - **four of those nine are framework state, not site data.** `GET /api/1/ai/capability` already returns `quota` as `{ subject, rows: [{ dimension, period, limit, used, costUnknown }] }`, and the panel stores it and renders it nowhere - `I18N.quota` is a loaded string with no call site. The panel likewise owns `state.sources` / `state.images` with every cap, `state.threads` (the last 20, newest first), and the transport, thread, pair, and running state. Leaving `/quota`, `/sources`, `/status`, and `/conversations` to each site would mean publishing three more handle getters and then duplicating the formatting behind them per site
  - **the same list exists twice** - inline in `webapp/view/jpulse-common.js` and again in `webapp/utils/panel/slash.js`, which is the copy the unit tests exercise. The parser under test is not the parser that runs
  - **the adapter is already the right shape and should be the model for the rest.** Duck-typed, optional, one presence check per call site. Chrome, by contrast, is gated only by the server capability probe (`sourcesEnabled`, `imagesEnabled`, `urlIngestEnabled`), so a *page* with nothing attachable still shows the strip unless an admin disables the feature site-wide. Site-level opt-out is the gap
  - **anchors rather than a free stack.** If a site chooses absolute positions, the framework can never reorder its own rows again and two plugins collide on one page. Framework-declared anchor *names* describing intent - not today's DOM - keep both sides free: the site's region stays put while the framework moves the internals
  - **content is a DOM node or plain text, never an HTML string.** `renderProposalPreview` already made this decision for the same reason: a site wanting markup returns a node, so no site injects markup by accident and no site quietly couples to plugin CSS internals
  - **context must not become a site region.** The turn payload and the prompt already carry it; asking every site to hand-roll a `<select>` for a field the framework already sends, and already describes to the model, is the wrong split. Regions are for what the framework has no concept of
  - **chrome without a caller rots, which is the argument for shipping the seam and one consumer together.** `adapter.describeScope()` is documented and implemented in `hello-ai` and the panel never calls it; `adapter.sourceAttachable` is documented and never called. Two dead contract members in three releases is the pattern this item must not repeat
- features:
  - **named regions:**
    - **framework-declared anchors, fixed order, intent-named:** `header` (below the conversation row), `transcriptTop`, `transcriptBottom`, `composeAbove` (where the intercept card and the strip already live), `composeBelow`. Anchor names are the stable contract; the DOM under them is not
    - **a region is `{ name, anchor, priority, render, on }`.** `name` is a stable id used for the CSS hook and for refresh; `priority` orders site regions inside an anchor and defaults to 100; `render(ctx)` returns a DOM node, a string the panel escapes as text, or `null` to hide the region entirely
    - **framework rows are siblings in fixed slots, not participants in that ordering**, so a site never competes with the strip, the intercept card, or the context row and no reserved-band table has to be published or learned
    - **the framework wraps each region** in `<div class="plg-ai-region" data-region="<name>">` and owns that frame - block layout, small padding, theme variables, and deliberately no border or card styling, because a one-line statistics row must not read as an alert - so the site styles only the inside and a region cannot break panel layout
    - **re-render on declared events plus on demand.** `on: ['thread', 'turn', 'capability', 'sources']` re-renders from framework state changes and defaults to none, manual only; `handle.regions.refresh(name)` covers what the framework cannot observe, which is the common case - the reference site's context row changes when the user clicks a bubble on its canvas. `refresh()` with no name re-renders every region
    - **the transcript is re-pinned after any region render**, because a region above the compose box changes the available height. Reuse the existing pin pass rather than adding a second one
    - a region may not suppress framework chrome. A site that wants no attachment strip uses the panel flag or the admin capability, not a region
  - **site-owned slash commands:**
    - **the defaults are generic and gated, and `commands` omitted keeps every applicable one.** A plain chatbot with no adapter gets a useful catalog without writing a line, which is the opposite of the 1.0.4 position where four obvious commands were impossible and none of the useful framework state was reachable
    - the framework catalog is ten: `/help` (carrying the site's examples), `/tools`, `/model`, `/new` (alias `clear`), `/cancel`, `/conversations` (alias `resume`; `/conversations <n>` opens one), `/quota`, `/sources`, `/status`, and `/context`. Every one reports framework state or performs a framework action; nothing in it names a site concept
    - **`/model` and `/status` are always listed.** A site with one allowed model still shows `/model`, because "what is available" is the question the command answers and a user who cannot ask cannot learn that the answer is one. `/status` leads with conversation count and turns in the current chat, then transport, thread, pair, and idle or running
    - **`when(ctx)` gates the three that depend on data rather than on taste:** `/quota` when the probe returns caps, `/sources` when sources or images are enabled, `/context` when `adapter.contextOptions` is a function. A gated-off command is absent from the picker *and* from the parser - it does not exist on that panel. `/cancel` is deliberately **not** gated: it stays listed and replies "no turn is running" when idle, because answering a real command with "Unknown command" is the worse reply
    - **`commands` on `panel.create` is the complete list.** A bare string names a framework implementation; an object adds or overrides; **the last entry with a given name wins**, so an override is one object after the spread rather than a filter over the defaults. Omitting a name hides that command - a kiosk that must not let the user start a conversation drops `/new`
    - **an entry is `{ name, aliases, hint, when, hidden, run }`:** `aliases` resolve in the parser and match in the picker without adding a second row, `hint` feeds the picker and `/help`, `when(ctx)` is availability, `hidden` is runnable-but-unlisted, and `run(ctx)` returns a string, a node, or `null` when the command drew its own UI. `run` may be async
    - **`ctx` is small and named:** `{ name, arg, framework(), thread, capability, adapter, handle }`. `ctx.framework()` runs the framework implementation of that name when one exists, so `/tools` becomes "framework list plus my note" and `/help` becomes "framework help plus my heading" without reimplementing either. Override-only would have made every site copy code to add one line
    - **`jPulse.ai.commands.defaults` is exported** so a site spreads rather than retypes, and so a framework command added later is one array entry away
    - **one catalog drives everything** - the picker, the parser, alias resolution, `/help`, and the unknown-command reply. `webapp/utils/panel/slash.js` is the testable source. The panel IIFE ports the same functions and exports `jPulse.ai.commands` (`defaults`, `normalizeCatalog`, `parseSlashCommand`, `filterSlashCommands`, `parseExampleRow`); it does not `import` the ESM file
    - **the picker scrolls.** Ten commands do not fit a 420px panel at once, so the list gets a max height and keeps the arrow-key highlight in view
    - unchanged invariants: commands are **local and never sent to the model**, `//` escapes to literal text, Enter runs the highlighted command and posts it into the transcript, and Esc dismisses the picker without closing the panel
  - **`/help` examples, site-configurable per row:**
    - **`options.examples` stays** and is the content slot inside `/help`: the framework owns the layout and the translated `Examples` heading, the site owns the words. That is §9.6's split applied to one command rather than a second way to write `/help` - a site wanting different *behavior* still overrides `help` and delegates through `ctx.framework()`
    - **a row is clickable where it contains `[[label]]`**, anywhere in the line. Click inserts that label. Text after the brackets is a note, not a second syntax: `[[Translate this text into "Yoda-speak"]] (for Star Wars fans)` and `[[Shorten it]] — propose a shorter rewrite`. A whole-row prompt with no brackets stays plain. A single `[docs]` stays plain. There is no `[[label]](other prompt)` form
    - **the same linker is used for `/help` command names** (`[[/status]] — hint`), **`/model` pairs** (`[[/model provider/model]] — Label`), and **`/conversations` rows** (`[[/conversations 3]] Title — date`)
    - **clicking fills the compose box and focuses it; it never sends.** The user edits before spending a turn, and a mis-clicked example costs nothing
    - this is the first consumer of the node return from `run`, which is why the two ship together rather than one waiting for the other
  - **the context row, gated on `adapter.contextOptions()`:**
    - a framework row above the compose box: a label and a select built from `contextOptions()`, which returns `[{ value, label, unavailable? }]`. Absent adapter method means no row, no persistence, and no command
    - **selection is thread-scoped and stable until the user changes it**, and is not the send-time target. The framework owns the selected *value* and remembers it per thread in `localStorage`; `describeContext(value)` turns it into the sentence the model sees and `describeTarget()` keeps its current meaning. A `describeContext()` that ignores the new argument still works, so `hello-ai` and any shipped site need no edit
    - **`handle.context` is the site's half: `{ get, set, refresh }`.** The row is framework chrome but the gesture that changes context is site code - a click on the reference site's canvas - so without a setter the select and the page drift apart. `refresh()` re-reads `contextOptions()` when the option list itself changed
    - **`/context` ships with the row and is gated the same way**, the way `/model` mirrors the thread pair: it prints the current context, the target, and the option list
    - an option may declare itself `unavailable` so a site can name a context whose object is gone - the reference site's "Bubble (unavailable) + children" - without the framework knowing what a bubble is. An `unavailable` option stays selectable and is never auto-selected
    - **`adapter.describeScope()` is removed** from the contract, from `hello-ai`, and from the guide. Server-side scope labels already come from `onAiScopeResolve`, and wiring the adapter member would mean a new turn field this item rules out
  - **`hello-ai` demonstrates every seam once:** a site region (pad statistics, refreshed on typing through `handle.regions.refresh`, copy `Scratch pad has N characters, M selected`), clickable `/help` examples through `options.examples`, a site command with no framework twin (`/pad`, same sentence), and a `hidden` one (`/padreset`, restoring the demo text - useful to have, not something to put in the picker). No `contextOptions`, so no context row and no `/context`: the demo is the proof that a site without context gets neither. `describeScope` comes out
  - **tests** in a new panel-extension suite, following W-227's pattern of testing the shared helpers rather than a jsdom render of the panel: anchor ordering and priority, with framework slots unaffected by a site priority; a region returning a node, a string (escaped), and `null` (hidden); refresh by name and refresh-all; an unknown anchor refused with a message naming the valid ones; catalog merge with strings, objects, last-wins override, aliases, `when()`, and `hidden`; `commands` omitted equalling the applicable defaults; `/quota`, `/sources`, and `/context` absent when their data is, and absent from the parser as well as the picker; `/cancel` and `/model` present regardless; `/conversations <n>` resolving to a thread; a site override reaching `ctx.framework()`; a site command with no framework twin; the examples parser over `[[label]]` anywhere, suffix notes, `[[/conversations n]]` / `[[/status]]` help-row shapes, and a single-bracket sentence left plain; `//` still literal; unknown command still answered locally; the picker and the parser reading one catalog; and the row's option list rendering an `unavailable` entry
- deliverables:
  - `plugins/ai-core/webapp/utils/panel/regions.js`:
    - the anchor list, merge and priority ordering, and content normalization (node passes through, string is escaped, `null` hides). No DOM ownership beyond the wrapper contract
  - `plugins/ai-core/webapp/utils/panel/slash.js`:
    - the catalog: the ten defaults with their `when` gates and aliases, normalize strings and objects with last-wins, resolve aliases, evaluate `when()`, filter for the picker, parse against the merged list, and parse an examples row into `[[label]]` parts. This file is the Jest source. The panel IIFE ports the same functions and exposes them on `jPulse.ai.commands`
  - `plugins/ai-core/webapp/view/jpulse-common.js`:
    - anchor containers in the panel DOM; region render, refresh, and the re-pin after render; command dispatch through the merged catalog with `ctx.framework()`; the formatters behind `/quota` (cost-unknown only on the cost dimension), `/sources`, `/status` (chats and turns first), and `/conversations` over state the panel already holds; clickable `/help` command names and example rows that fill the compose box; `/model` and `/conversations` lists as the same links; named `%MODEL%` / `%DAYS%` / `%LABEL%` view tokens; the context row, `/context`, and `handle.context` gated on `adapter.contextOptions()`; `handle.regions`; `jPulse.ai.commands.defaults`; the closed five-name `SLASH_COMMANDS` list and the `describeScope` call site removed
  - `plugins/ai-core/webapp/view/jpulse-common.css`:
    - `plg-ai-region*` quiet slot, `plg-ai-context-*` row, the picker max height, and the clickable example row; `--jp-theme-*` colors only, no new `jp-*`
  - `plugins/ai-core/webapp/translations/en.conf`, `de.conf`:
    - hints and labels for the five new commands, the context row label, the idle `/cancel` reply, and the row labels the quota, sources, and status replies print; `modelSet` / `retention` / `conversationsOpened` use `%MODEL%` / `%DAYS%` / `%LABEL%` (not `{{pair}}`, which the JS view compiler eats); the unknown-command, picker, and `Examples` strings kept in one place. Site regions and site commands carry their own strings
  - `plugins/ai-core/webapp/view/hello-ai/index.shtml`:
    - the one region, `/pad` and footer copy `Scratch pad has N characters, M selected`, the hidden `/padreset`, and `examples` as `[[label]]` rows; `describeScope` removed
  - `plugins/ai-core/webapp/tests/unit/panel-extension.test.js` (plus edits where existing suites assert the old five-command list or the adapter key set):
    - the cases above
  - `plugins/ai-core/docs/README.md`, `plugins/ai-core/README.md`:
    - the extension surface: anchors and what each is for, the region contract and why content is a node or text, the ten defaults with their gates, the command catalog with delegation and last-wins override, the examples row syntax, the context row with `handle.context` and its adapter gate, and the migration line for a site that implemented `describeScope`. Version numbers, never work-item numbers
  - `docs/dev/design/W-223-ai-agent.md`:
    - §12.1 rewritten from "the framework owns everything that is not about the site's data" to the region and command contract, with the ten defaults and their gates replacing the five-command sentence, `contextOptions()` moved from a sketched adapter member to shipped chrome beside `handle.context`, and `describeScope()` struck from the adapter sketch; §12.2 gains the site's side. A new Rev entry records the eight decisions, including why `examples` was kept after Rev 12's style of preferring one way to say a thing. **Framework-repo change, not part of this item's `ai-core` commit**
- notes:
  - design source: `docs/dev/design/W-223-ai-agent.md` §12.1 (panel surface and the adapter, including the unbuilt `contextOptions()`), §12.2 (what stays site code), and §9.6 (the prompt-fragment slots this item copies for the panel)
  - **repo layout: `plugins/ai-core` is its own git repo and its own commit**, gitignored by the framework repo. `ai-mock` has no product change and takes the version lockstep bump as a bundle member. `hello-ai` is still a view inside `ai-core` at this point - W-231 extracts it afterwards, on purpose, so the extracted demo carries the final public API instead of needing a follow-up release to use it
  - **eight spec decisions taken before implementation**, each with the alternative that was rejected:
    - *placement*: framework-named anchors with framework-owned order. A site-ordered stack was rejected because it freezes panel layout forever and gives two plugins on one page no way to coexist
    - *content*: a DOM node, or a string the panel escapes. An HTML string was rejected for the reason `renderProposalPreview` already rejected it - accidental markup injection and an unversioned coupling to plugin CSS
    - *commands*: the site declares the complete list, framework implementations stay addressable by name, last-wins resolves a collision, and `ctx.framework()` allows delegation. Override-only was rejected because adding one example to `/help` would mean reimplementing it; framework-list-plus-extras was rejected because a site must be able to *remove* a command it cannot honor, such as `/new` on a kiosk
    - *defaults*: ten generic commands, gated, and `commands` omitted keeps every applicable one. Leaving `/quota`, `/sources`, `/status`, and `/conversations` to each site was rejected because the panel already holds every field they print, so the alternative is three more published handle getters plus the same formatting written once per site
    - *discovery*: `/model` and `/status` are always listed. Auto-hiding `/model` on a one-model site was rejected because the command answers "what is available", and a user who cannot ask cannot find out that the answer is one
    - *context*: framework chrome gated on `adapter.contextOptions()`, with `handle.context` for the site's own gesture. A pure site region was rejected because the turn payload and the prompt already carry context and target; an always-on row was rejected because not every site has a context to choose; a read-only row was rejected because the selection changes from the page, not only from the select
    - *existing chrome*: the notice, strip, chip pop, intercept card, and Apply cards stay framework features and are **not** reimplemented as regions. Doing so is a rewrite with no user-visible gain and would put framework state behind a site-shaped contract
    - *`examples`*: kept as the content slot of `/help`, with per-row `[[label]]` links (suffix text is a note; no `[[label]](other prompt)` form). Retiring it for `/help` delegation was rejected because the common case - three example prompts - would cost four lines of ceremony and would hardcode an `Examples` heading the site then cannot translate; a content slot beside a behavior override is the same split `hint` and `run` already have, not two ways to say one thing
  - **as built (1.0.5):** `slash.js` and the panel IIFE both carry the catalog algorithm (IIFE cannot import ESM). Clickable `[[label]]` is shared by `/help` commands, examples, `/model` pairs, and `/conversations` rows. `/quota` annotates cost-unknown only on `dimension === 'cost'`. View interpolation uses `%TOKEN%`, not `{{name}}` inside `jpulse-common.js`
  - **the reference site is the acceptance test on paper:** after this item `/quota`, `/status`, `/sources`, and `/conversations` are framework defaults that site deletes rather than ports, `clear` and `resume` are shipped aliases, its context row is `contextOptions()` plus `handle.context`, and every bubble-shaped label stays in its own code. What remains for it to author is genuinely site-shaped; if any of that cannot be expressed, the seam is wrong and it is cheaper to learn it here than after the migration
  - **do not add a server route.** The selected context lives in the tab - `localStorage`, keyed by thread - and a site that needs it durable writes its own endpoint from `handle.context.set`. The reference site's `POST /api/1/ai/thread/:id/context` is not being ported into the framework in this item
  - do not run the bump-version script while implementing, and do not touch `.jpulse/` in tests - use an isolated temp project or the plugin-cli harness
  - out of scope, each its own polish item or already deferred: the quota footer (the `/quota` command ships; persistent footer chrome does not), the empty-transcript hint, multi-tab "another tab is running" state and the launcher unread dot, `/new` confirmation when chips are attached, a richer source badge popover in the transcript, wiring `adapter.sourceAttachable` and the attach-to-object chip menu (W-228 surface), site-authored history notes (TD-14), a conversation-scoped tool cache (TD-15), server-resolved or cross-tab sources (TD-16), document converters (W-229 hooks), an agent-callable URL fetch, and citations

### W-231, v1.0.6, 2026-09-17: ai: extract hello-ai into a bundled companion plugin
- status: ✅ DONE
- type: Refactoring
- objectives:
  - split the scratch-pad sample out of `ai-core` into its own plugin, `hello-ai`, so a site author opening `plugins/ai-core` sees only what a site needs (hooks, panel, attachments, propose/apply) and opening `plugins/hello-ai` sees the worked example
  - keep one install and one publish: `@jpulse-net/plugin-ai-core` expands to `ai-core` + `ai-mock` + `hello-ai`. `autoEnable: true` so first-run is still "install, open `/hello-ai/`". The win over today's gated view is that an admin can disable the demo without disabling AI
  - **no framework source change.** `jpulseVersion` stays `>=2.0.3`. W-221 already walks N bundle members; views, controllers, nav, and i18n are existing plugin seams; `ai-core`'s module scanner already lists every active plugin's `webapp/utils/ai-tools/`
  - do not rewrite the scratch-pad page. This item is the extract, the bundle membership, and the doc cut
- prerequisites:
  - W-221, v2.0.1: bundle install, publish, stage, and bump already treat `bundle.members` as a list. Adding a third name is plugin.json only
  - W-222, v2.0.2: plugin translation merge, so `hello-ai` can carry its own `webapp/translations/`
  - W-226, `@jpulse-net/plugin-ai-core` 1.0.2: `/hello-ai/` as a view inside `ai-core`, the demo hooks, `readDraft`, and the nav/card entries this item relocates
  - W-227, 1.0.3: `proposeRewrite` and the proposing tool on the demo, still gated on `scopeType === 'hello-ai'`
  - W-228, 1.0.4: attachments landed on that same demo (source drop, vision paste, prompt fragment). Extract the post-attachments tree, not a mid-flight one. W-229 is not a prerequisite and does not wait for this
- rationale:
  - **`ai-core` currently conflates two products.** `helloAi.js` sits next to `aiCore.js`, `readDraft.js` / `proposeRewrite.js` sit next to `sources.js`, and the installed-plugin guide says both "one controller, one `panel.create` line" and "open `/hello-ai/`". A site author cannot tell which files they must write and which are the sample
  - **design §5.1 and W-221 said `hello-ai` is a view inside `ai-core`, not a third plugin.** That was right when the goal was "do not invent a third package to stand up a demo." The bundle machinery now exists and already ships a companion (`ai-mock`). A third *member of the same package* is cheap, and it is a different kind of companion: `ai-mock` is a no-key provider; `hello-ai` is a worked site. Different reasons to disable
  - **a gated view cannot be turned off.** Today the only way to hide `/hello-ai/` is to edit or disable `ai-core`. After this item, plugin admin disables `hello-ai` and the page, its nav entries, its dashboard card, and its two tool modules disappear, while turns, quota, and the panel stay
  - **the loader already expected this.** `defaultRoots()` in `plugins/ai-core/webapp/utils/tools/modules.js` walks `site/webapp/utils/ai-tools/` and then every active plugin's `webapp/utils/ai-tools/`. Moving `readDraft` and `proposeRewrite` is using that seam, not adding one
- features:
  - **new plugin `plugins/hello-ai/`** as a bundle companion, same shape as `ai-mock`:
    - `plugin.json`: `name: hello-ai`, `npmPackage: "@jpulse-net/plugin-ai-core"`, version lockstep with the primary, `autoEnable: true`, `jpulseVersion: ">=2.0.3"`, `dependencies.plugins.ai-core` with `version: ">=1.0.5"` and the same `npmPackage` (in-package, no extra fetch)
    - companion guard `package.json` (`private`, `prepublishOnly` refuses and names `ai-core`), stripped at stage the same way `ai-mock`'s is
    - no `webapp/bump-version.conf` — bump stays on the primary
  - **`ai-core` `bundle.members` becomes `["ai-mock", "hello-ai"]`.** Publish, stage, pack, and bump from `plugins/ai-core` visit three trees. An existing site that updates the package gets the new member on expand; `autoEnable: true` enables it unless the admin already disabled it after a previous expand
  - **what moves** (and nothing else):
    - `webapp/controller/helloAi.js` — demo hooks only, still gated on `scopeType === 'hello-ai'`
    - `webapp/view/hello-ai/index.shtml` — scratch pad, launcher, dashboard card
    - `webapp/utils/ai-tools/readDraft.js` and `proposeRewrite.js`
    - hello-ai nav entries and the site-examples card (leave the AI Core / AI usage entries on `ai-core`)
    - hello-ai strings in `en.conf` / `de.conf` that exist only for that page — none existed, so no translation files were created
    - demo / `readDraft` / `proposeRewrite` cases into `plugins/hello-ai/webapp/tests/unit/hello-ai.test.js`; write path, slash catalog, mock sequence, and vision stay in `plugins/ai-core/webapp/tests/unit/hello-ai.test.js`
  - **what stays in `ai-core`:** `aiCore.js`, the panel, attachments, `sources.js`, the propose/apply layer, admin AI tab, usage, capability page, and the site-facing docs that teach the one-liner
  - **docs cut, version numbers never work-item numbers:**
    - `plugins/ai-core/README.md` and `plugins/ai-core/docs/README.md` describe core only and point at the Hello AI plugin for the sample
    - `plugins/hello-ai/README.md` and `plugins/hello-ai/docs/README.md` say this is the sample, how to disable it, and that a site copies the pattern rather than depending on these tools
    - `ai-core` `plugin.json` help may still link to `/hello-ai/`; `hello-ai` `plugin.json` help owns the demo walkthrough
  - **design note in the framework repo:** `docs/dev/design/W-223-ai-agent.md` §5.1 / §22.1 said `hello-ai` is a view inside `ai-core`. Record the reversal (third bundle member, same package) so the next item does not re-litigate it
  - **tests:** install/pack still expands every member; `hello-ai` disabled ⇒ `/hello-ai/` gone and `readDraft` / `proposeRewrite` absent from the module catalog; `ai-core` still serves the panel and `sources`; bump from `hello-ai/` is refused and names `ai-core`
- deliverables:
  - `plugins/hello-ai/plugin.json`, `package.json` (companion guard), `jest.config.cjs`, `README.md`, `docs/README.md`:
    - the member manifest, `autoEnable: true`, in-package `ai-core` dependency `>=1.0.5`, and the sample-not-product wording
  - `plugins/hello-ai/webapp/controller/helloAi.js`, `webapp/view/hello-ai/index.shtml`, `webapp/utils/ai-tools/readDraft.js`, `webapp/utils/ai-tools/proposeRewrite.js`, `webapp/view/jpulse-navigation.js`:
    - the relocated demo, behavior unchanged. No `webapp/translations/` — no page-only keys existed
  - `plugins/hello-ai/webapp/tests/unit/hello-ai.test.js`:
    - the relocated hello / readDraft / proposeRewrite cases, paths relative to this plugin
  - `plugins/ai-core/plugin.json`:
    - `bundle.members: ["ai-mock", "hello-ai"]`; help text that names Hello AI as a bundled plugin rather than as a view of ai-core
  - `plugins/ai-core/README.md`, `plugins/ai-core/docs/README.md`, `plugins/ai-core/webapp/view/jpulse-navigation.js`, and `plugins/ai-core/webapp/tests/unit/hello-ai.test.js`:
    - sample files removed; write / slash / mock / vision cases stay; core docs no longer teach `/hello-ai/` as if it were ai-core
  - `docs/dev/design/W-223-ai-agent.md`:
    - Rev 19 / §5.1 / §21.9 / §22.1 (and the package table): `hello-ai` is a third bundle member, not a view inside `ai-core`; 1.0.6 published
  - `docs/ai-agent.md`, `docs/genai-instructions.md`:
    - first-run one-liners name Hello AI as a bundled plugin that can be disabled without turning off AI
- notes:
  - design source: `docs/dev/design/W-223-ai-agent.md` §5.1 (was two members, hello-ai a view), §21.5 / §22.1 (demo files inside `ai-core`). This item revises that on purpose; attachments, convert hooks, and the panel do not move. Rev 19 records the reversal and 1.0.6 as published
  - **repo layout:** `plugins/ai-core` is its own git repo and the publish root. `hello-ai` is a new sibling directory and its own git repo (`plugin-hello-ai`), gitignored by the framework repo the same way `ai-core` and `ai-mock` are. Three commits, one publish, from `plugins/ai-core` only. The design-doc hunk is a framework-repo change
  - **`autoEnable: true`** is a product decision, not a default to revisit in implementation: first-run keeps `/hello-ai/`; production disables the `hello-ai` plugin in admin
  - **do not change `hello-ai` product behavior** (tools, pad, examples, attachment demo copy) except where a path or plugin name must change
  - **do not add framework files, do not bump `jpulseVersion`, do not run bump-version, do not touch `.jpulse/`**
  - **as-built:** published as `@jpulse-net/plugin-ai-core` 1.0.6 (prepack staged `ai-core`, `ai-mock`, `hello-ai`). Extracted the shipped 1.0.5 tree including `/pad` and the W-230 region / slash demo. Dependency is `ai-core >=1.0.5` (spec said `>=1.0.4`). No translation files. Tests split as above; 170 passed. Disable path verified: `/hello-ai/` 404s, capability lists only `sources`, tools empty; re-enable restores the four demo tools. Installed-plugin links stay site-root `/jpulse-docs/installed-plugins/<name>/README`
  - out of scope: rewriting the scratch-pad page; a fourth bundle member; making `hello-ai` a separate npm package; W-229 hook definitions; shipping a converter

### W-232, v1.0.7, 2026-09-18: ai: upload caps from settings, AiCore.deleteByScope, and three cutover guards
- status: ✅ DONE
- type: Feature
- objectives:
  - make the two streaming upload routes obey **Site Configuration → AI** instead of a hardcoded route limit and a character cap that describes something else, so a 25 MB PDF converts on a bare install and an admin who wants a smaller site changes one number
  - give a site one supported way to erase an agent's data for an object it just deleted - `AiCore.deleteByScope({ scopeType, scopeId })` - so site code never imports a plugin model and never names `aiThreads` / `aiTurns` by string
  - close the three silent traps a second site hit while porting: a 5 s tool timeout with no site-wide default, a reserved tool name that loses to a site registration without a word, and an attachment list split in two with no family marker
  - **DX over one-time migration pain.** No thread, turn, or chat in the field is protected. Where the shipped shape is wrong, change it and document the rename rather than shipping both and asking a site author which one to use
  - keep the §1.1 one-liner untouched: a site that attaches nothing, deletes nothing, and writes one tool sees no change at all
- prerequisites:
  - W-228, `@jpulse-net/plugin-ai-core` 1.0.4: the two `bodyMode: 'stream'` routes and `collectStreamBody`, the Redis image mailbox with its per-thread index key, `handle.sources()` / `handle.images()` / `handle.sourceFile()`, `PANEL_TOOL_NAMES`, and the source / URL / image caps on the AI tab. This item re-points all of them at settings
  - W-214, v1.7.17 and W-217, v1.8.0: `bodyLimit` is authoritative in both directions, `25mb` is the comfort max that logs **no** startup warning, and nginx `client_max_body_size` is already `27M`. That is exactly why the route becomes a fixed ceiling and the admin field becomes the cap under it - no nginx edit, no deployment note
  - W-223, 1.0.0: `global.AiCore` as the one site-facing server surface (design §5.3), the CI-enforced layer rule (`tools/` imports neither `agent/` nor `transport/`), and `resolveTools()` as the **single** offered-list function. The timeout default and the reserved-name refusal both have to land inside those constraints, which is what makes them less obvious than they look
  - W-231, 1.0.6: the three-member bundle. `ai-mock` and `hello-ai` are version lockstep here unless a test needs otherwise
  - nothing framework-side. `jpulseVersion` stays `>=2.0.3`, no framework source file is touched
- rationale:
  - **the source of this item is a second site porting onto the bundle.** Every entry is a place where the framework kept a decision the site should own, and none of them is a missing capability - which is why the whole item is settings, one published method, and three refusals
  - **convert is capped at 3.8 MB today, not 8 MB and not 25 MB.** `static routes` says `bodyLimit: '8mb'`, then `apiConvertSource` caps again at `min(8 MB, maxSourceChars * 4)`; with the shipped `maxSourceChars` of 1,000,000 that is 4,000,000 bytes. Meanwhile `MAX_CONVERT_BYTES` (18 MiB) sits unused in `convert.js`. Three numbers, none of them an admin field, and the effective one is derived from a **character** cap that describes the markdown *after* conversion. An admin who wants bigger PDFs has no field to change and no reason to suspect the character cap
  - **`maxSourceChars` and the upload size are different questions and must stop sharing an answer.** One is "how much text may a source contribute to a conversation", the other is "how big a file may the server accept". Deriving the second from the first is why raising the text budget silently raises the upload ceiling and vice versa
  - **the image route has the same shape without the bug.** `apiStageImage` already enforces `maxImageBytes`, but the route is a static `5mb`, so an admin can lower the setting and cannot raise it past a number that is not on any page. Both routes should tell one story
  - **map delete already cascades everything except the agent.** `global.AiCore` exposes `registerTools`, `resolveTools`, `scanToolModules`, `runTurn`, `listProviders`, and `loadSettings` - no wipe - and `AiThreadModel` has no delete method at all. Design §5.3 forbids a site importing from `plugins/`, so without this member the only paths open to a site are the two the design rules out: import the plugin's model, or reach into the database by collection name. A deleted object leaving readable conversations behind is also a privacy answer a site cannot give today
  - **quota must survive the wipe.** `aiUsage` is keyed `<subject>:<period>`, not by scope. Deleting an object must not hand a user their daily request cap back, so the wipe deliberately stops at threads, turns, and staged images
  - **a 5 s default is tight for anything that touches a database.** It is a descriptor default with no setting behind it, so the porting site repeats `timeoutMs` on every tool - 10 s on most, 35 s on the slow one. A site-wide default makes the common case silent and leaves the exception explicit, which is the right way round
  - **the registry is last-wins, so a reserved name loses quietly.** `collectTools` merges by name and a later owner replaces an earlier one. A site that still registers `list_sources` or `get_source` after the cutover takes over the panel's own tools; the panel's client bridge still answers them from panel state, so the failure is a working-looking agent reading the wrong thing. Silence is the defect here, not the collision
  - **the attachment split is already proven confusing.** The request that asked for a `kind` marker described `handle.sources()` as already carrying `origin: 'file' / 'url' / 'paste' / 'image'` - it does not; images are a second method, `handle.images()`. A reader who has the docs in front of them got the model wrong, and `handle.sourceFile(id)` compounds it by resolving image ids too, because the panel stores both families' original `File` in one map. One list with a family marker is the fix; documenting the split harder is not
  - **`adapter.sourceAttachable` is documented and never called** (W-228 as-built item 27). A predicate a site implements and the framework never asks is worse than no predicate: it reads as a supported extension point and does nothing. With one list and a `kind` field the site writes `.filter()` and owns the answer
- features:
  - **1. upload caps come from Site Configuration → AI.** One rule, stated once in the guide: *the route is a ceiling, the setting is the cap, nginx is an outer gate - and an admin only ever thinks about the middle one*
    - new admin field **`maxConvertBytes`**, default `26214400` (25 MB), sitting with `maxConvertPages` and `convertTimeoutMs`. Raw bytes, like its neighbour `urlMaxBytes` - do not introduce an MB field beside byte fields
    - both streaming routes become `bodyLimit: '25mb'` - the W-214 comfort max, which logs no startup warning and needs no nginx change. `apiConvertSource` passes `maxConvertBytesOf(settings)` to `collectStreamBody`; `apiStageImage` keeps passing `maxImageBytesOf(settings)`, which can now actually exceed the old `5mb` route
    - both helpers **clamp to the route ceiling** (`ROUTE_MAX_BYTES = 26214400`). A setting above it does not accept more bytes, and the field help says so rather than letting an admin believe a number the route will refuse
    - delete the `min(8 MB, maxSourceChars * 4)` formula and the unused `MAX_CONVERT_BYTES`. `maxSourceChars` keeps its one real job: the character cap `convertLimits` applies to converted text, unchanged
    - the **413 names the real cap**, because `StreamBody` reports the `maxBytes` it was given - so an over-cap upload says 25 MB (or whatever the admin set), not the route's ceiling
    - the capability probe returns `maxConvertBytes` beside the existing `maxImageBytes`, and the panel **refuses an oversize file before uploading it** - same red drop hover and toast as a refused type, naming the cap. The server 413 stays the backstop, not the first line
    - **default 25 MB is the product decision:** a bare install matches what the porting site already does today, and an admin who wants a smaller site lowers one field. A cautious 8 MB default would ship the regression this item exists to prevent
  - **2. `AiCore.deleteByScope({ scopeType, scopeId })`.** The site's object-delete handler is one optional-chained line, so a disabled plugin is a no-op rather than a boot-time crash: `await global.AiCore?.deleteByScope?.({ scopeType: 'map', scopeId })`
    - **what it erases, for every user:** the `aiThreads` rows for that scope, the `aiTurns` rows for those threads (proposal records live on the turn, so they go with it), and any staged images still parked in Redis under those threads. A deleted object is gone for everyone who talked about it, not only for the caller
    - **what it never touches: `aiUsage`.** Quota is per subject and per period; deleting an object is not a quota refund
    - **order is cancel, turns, threads, images.** `broadcastCancel` first so an in-flight turn stops writing; turns before threads so a failure half-way leaves rows the retention purge already collects by age rather than a thread with no history; images last and best-effort, since the stage TTL would expire them anyway
    - **both arguments are required.** A missing or empty `scopeType` / `scopeId` throws an `AI_BAD_ARGS` error rather than matching broadly - a typo must not look like a successful wipe. An unknown scope returns zeros, and a second call is a no-op
    - returns `{ threads, turns, images }` so the site logs one line, and `scope.js` logs `aiCore.deleteByScope` success or error with the same counts. Called outside a request, so those lines take a null `req` (no `logRequest` — there is no request)
    - **no HTTP route, no `deleteByThread`, no `createdBy` narrowing.** This is a server-side cascade the site calls *after* it has authorized and performed its own delete; exposing it as an endpoint would put a second authorization decision on the framework. User-account deletion stays the separate framework item on `onUserBeforeDelete` / `onUserAfterDelete`
  - **3. a site-wide default tool timeout.** New admin field **`defaultToolTimeoutMs`**, default `10000`, with the loop limits
    - `normalizeDescriptor` records `timeoutMs: null` when a descriptor omits it - "unset", not "5000" - and `resolveTools()` stamps the effective value from `options.settings.defaultToolTimeoutMs` on the offered tool. An explicit `timeoutMs` always wins, whether it is shorter or longer
    - **`resolveTools` is where it lands because of the layer rule.** `tools/descriptor.js` may not import `agent/settings.js`, and `resolveTools` is already the single function that sees both the settings and every tool, every round. Do not thread settings into the registry, and do not add a second default on the `onAiToolRegister` context - two places to look is the thing this item is removing
    - the last-resort constant in `execute.js`'s `withTimeout` moves from 5000 to 10000 for the path that runs an unstamped registry tool
    - raising the shipped default is a deliberate behavior change in the safe direction: a longer timeout can only turn a failing tool into a working one
  - **4. reserved tool names are refused, loudly.** `list_sources` and `get_source` belong to the panel
    - a registration of either name from any owner other than `ai-core` is **not accepted** - the panel's own descriptors stay in place - in both `AiCore.registerTools()` and the `onAiToolRegister` collection path
    - the refusal is **visible in three places**: one `logWarning` per name and owner per process (`refused reserved tool name "list_sources" from owner "site"; the AI panel owns this name`), a `withheld` row with `reason: 'reserved'` on the capability probe and in `/tools`, and the debug dump when dumps are on
    - **it does not throw.** A leftover site handler must not stop a site from booting; it must be impossible to miss in the log and on `/tools`
    - the reserved list moves to the tools layer (`tools/descriptor.js`) so the registry can consult it without importing `attachments/`; `attachments/tools.js` imports it from there. Last-wins behavior is unchanged for every non-reserved name
  - **5. one attachment list with a family marker.** `kind` answers "which family", `origin` answers "how it arrived", and they stop overlapping
    - **`handle.attachments()`** is the one list a site walks: text sources first, then images, every row carrying `kind: 'source' | 'image'`, `origin`, `id`, `name`, `mimeType`, and its family's own fields (`chars` / `sections` / `url`, or `width` / `height`)
    - **`handle.attachmentFile(id)`** returns the original `File` or `Blob` for a row of either family, or `null` once the chip is gone. The noun matches the list; today's `sourceFile` already resolves image ids, which is the wart this removes
    - **`handle.sources()`, `handle.images()`, and `handle.sourceFile()` are removed.** Keeping them beside `attachments()` would leave three methods and a choice to make; `attachments().filter((row) => row.kind === 'image')` is explicit, needs no doc lookup, and is what an attach tool wants anyway
    - **`origin` becomes honest for images too:** `file` when dropped or picked, `paste` when pasted, instead of today's hardcoded `'image'`. `kind` carries the family, so `origin` is free to mean one thing in both families
    - **`adapter.sourceAttachable` is dropped**, not renamed. It has never been called; a site that wants to offer only some attachments on its own object filters `attachments()` itself
    - **`kind` does not go into the `list_sources` tool result.** That list is text-only by construction, so the field would be a constant - prompt tokens for no information. `kind` is a panel-handle concept and the guide says so
  - **out of scope, deliberately:** the embed panel mode (`create({ el, chrome: 'none' })`) is design TD-17 - the requesting site will pass `launcher` and keep the plugin chrome, and a second panel lifecycle written before a consumer exists gets the seam wrong. No `onAiConvert*` hook of any kind: W-229's framework-owned `onDocumentConvertRegister` / `onDocumentConvert` is that seam and stays it, and no converter ships here either
- deliverables:
  - `plugins/ai-core/webapp/utils/agent/settings.js`:
    - `maxConvertBytes` (26214400) and `defaultToolTimeoutMs` (10000) in `AI_CONFIG_DEFAULTS` and in `mergeSettings`, normalized the same way as their numeric neighbours
  - `plugins/ai-core/webapp/utils/attachments/convert.js`:
    - `ROUTE_MAX_BYTES` and `maxConvertBytesOf(settings)` with the clamp; `MAX_CONVERT_BYTES` deleted. `convertLimits` is unchanged - `maxSourceChars` still caps the converted text
  - `plugins/ai-core/webapp/utils/attachments/images.js`:
    - `maxImageBytesOf` clamped to `ROUTE_MAX_BYTES`; `deleteStagedThread(username, threadId)` reading the per-thread index, deleting each staged key, then the index
  - `plugins/ai-core/webapp/controller/aiCore.js`:
    - both stream routes to `bodyLimit: '25mb'`; `apiConvertSource` passing `maxConvertBytesOf(settings)` and dropping the `maxSourceChars * 4` formula; clamped `maxConvertBytes` and `maxImageBytes` on the capability probe; `maxConvertBytes` and `defaultToolTimeoutMs` in `ConfigModel.extendSchema()`; `deleteByScope` published on `global.AiCore` (logging lives in `scope.js`)
  - `plugins/ai-core/webapp/model/aiThread.js`, `aiTurn.js`:
    - `AiThreadModel.listByScope({ scopeType, scopeId })` and `deleteByScope`; `AiTurnModel.deleteByThreadIds(ids)`. No index change - `aiThreads_active_scope_user` already leads with `scopeType` / `scopeId`
  - `plugins/ai-core/webapp/utils/agent/scope.js` (new), `index.js`:
    - the `deleteByScope` assembly (cancel, turns, threads, staged images) in `scope.js`; `index.js` re-exports it so the controller stays a thin route layer
  - `plugins/ai-core/webapp/utils/tools/descriptor.js`:
    - `RESERVED_TOOL_NAMES`, `RESERVED_TOOL_OWNER`, `DEFAULT_TOOL_TIMEOUT_MS` (10000), `isReservedToolName`, and `effectiveTimeoutMs`; `timeoutMs: null` when omitted
  - `plugins/ai-core/webapp/utils/tools/registry.js`:
    - reserved-name refusal in `registerTools` and `collectTools`, the warn-once record, and the refusal list `resolveTools` reads
  - `plugins/ai-core/webapp/utils/tools/resolve.js`:
    - the effective-timeout stamp from `options.settings.defaultToolTimeoutMs`; `withheld` rows with `reason: 'reserved'`
  - `plugins/ai-core/webapp/utils/tools/execute.js`:
    - call sites use `effectiveTimeoutMs(tool, settings)`; `withTimeout`'s last resort is that helper (10000), not a hardcoded 5000
  - `plugins/ai-core/webapp/utils/attachments/tools.js`:
    - `PANEL_TOOL_NAMES` re-exported from the tools layer instead of defined here
  - `plugins/ai-core/webapp/view/jpulse-common.js`:
    - `handle.attachments()` and `handle.attachmentFile(id)` replacing `sources` / `images` / `sourceFile`; `kind` on both families and an honest `origin` on images; the pre-upload size check against `maxConvertBytes` and `maxImageBytes` with the existing refuse hover and toast; `openThread` re-fetches the thread list so a completed turn (and a chat switch) re-sorts newest first
  - `plugins/ai-core/webapp/translations/en.conf`, `de.conf`:
    - `maxConvertBytes` and `defaultToolTimeoutMs` labels and help; help on `maxSourceChars` naming what it is *not* (the upload size) and on `maxImageBytes` naming the route ceiling; a withheld-reason label for `reserved`; the oversize-file toast
  - `plugins/ai-core/webapp/tests/unit/`:
    - caps: a 25 MB convert accepted with the shipped `maxSourceChars` (**the regression test** - it fails today at 4,000,000 bytes); a lowered `maxConvertBytes` refused with a 413 naming that number; a setting above the ceiling clamped; `maxImageBytes` honored above the old `5mb`; `maxSourceChars` still truncating converted text and no longer influencing the upload
    - wipe: threads and turns of a scope removed for **every** user; `aiUsage` untouched; staged images deleted; unknown scope returns zeros; a second call is a no-op; missing `scopeType` or `scopeId` throws `AI_BAD_ARGS`; another scope's threads survive
    - timeout: an omitted `timeoutMs` follows the setting; an explicit one wins in both directions; the unstamped registry path uses 10000; **the layer-boundary scan test still passes** (no `agent/` import under `tools/`)
    - reserved: a site registration of `get_source` leaves the panel descriptor in place, appears as `withheld: reserved`, and logs once; `ai-core` itself may register both; a non-reserved name still follows last-wins
    - attachments: `kind` on both families; ordering sources before images; `attachmentFile` resolving either family and returning null after removal (panel scan); pasted images reporting `origin: 'paste'`; `list_sources` output carrying **no** `kind`
    - `scope.test.js` (new): the wipe cases above
    - `threads.test.js`: `touch` moves a thread to the front of `listForOwner`; panel scan that `openThread` calls `refreshThreads`
  - `plugins/ai-core/docs/README.md`, `plugins/ai-core/README.md`:
    - the caps table (route ceiling vs admin cap vs character cap) with the sentence that conversion buffers the whole file in memory, so a busy site lowers the cap rather than raising the heap; `AiCore.deleteByScope` with the one-line call and what it does not erase; the reserved names and what a collision looks like; `defaultToolTimeoutMs`; `handle.attachments()` / `handle.attachmentFile()` and the `kind` / `origin` split, with the removed members named once so a reader porting from 1.0.6 finds them. Version numbers, never work-item numbers
  - `docs/dev/design/W-223-ai-agent.md` (framework repo, this item's only framework-repo change):
    - Rev 20 specifies; Rev 21 / header / §21.10 record 1.0.7 as published; §21.11 renumber, the §21.2 row, and TD-17
  - framework-repo user docs are **not** part of this item's plugin commits - see notes
- notes:
  - design source: `docs/dev/design/W-223-ai-agent.md` Rev 20 and §21.10. Read §5.3 (why a site may not import from `plugins/`), §7.1 and §7.5 (descriptor defaults and the single resolve function), §12.1 (the handle surface), §14.3 / §14.4 (the byte paths), and §17 (the admin split). TD-17 is this item's deliberate omission and must not be "fixed" here
  - **repo layout:** `plugins/ai-core` is its own git repo and the publish root; `ai-mock` and `hello-ai` are siblings, each its own repo, gitignored by the framework. One publish of `@jpulse-net/plugin-ai-core` 1.0.7 from `plugins/ai-core` only; the companions are header / version lockstep unless a test needs more. The design-doc hunk is the one framework-repo change
  - **five decisions taken before implementation**, each with the alternative rejected:
    - *the convert cap's home*: a settings field under a fixed `25mb` route ceiling. A bigger `bodyLimit` was rejected because W-214 warns above 25mb and nginx would need a matching edit; deriving it from `maxSourceChars` is the current bug, not a design
    - *the default `maxConvertBytes`*: 25 MB, so a bare install matches what the porting site does today. A cautious 8 MB default was rejected as shipping the regression the item exists to prevent
    - *what `deleteByScope` erases*: threads, turns, and staged images, for all users. Erasing `aiUsage` too was rejected - a per-subject quota counter is not scope data, and refunding a daily cap by deleting an object is a hole
    - *where the timeout default is applied*: `resolveTools`, which already holds settings and every tool. `normalizeDescriptor` was rejected because the tools layer may not import the agent layer, and a second default on the hook context was rejected as a second place to look
    - *the attachment API*: one `handle.attachments()` with `kind`, replacing three members. Adding `kind` to the existing two lists and keeping a third convenience method was rejected - it leaves the split intact plus one more thing to read
  - **migration is unconstrained on purpose.** These plugins are new in this release train and the reference site has not cut over yet, so nothing preserves `handle.sources()`, `handle.images()`, `handle.sourceFile()`, or `adapter.sourceAttachable`. Name the replacements in the guide and move on; do not ship aliases
  - **the reserved-name refusal must not throw.** A leftover `onAiToolRegister` handler from a pre-cutover site has to boot, warn, and show up on `/tools` - failing the site's startup over a demo registration is the wrong trade
  - the convert path buffers the whole upload in memory (`collectStreamBody` into `Buffer.concat`), so 25 MB is a real per-request cost against a 1 GB worker heap. Say it in the guide next to the field rather than discovering it in production
  - do not run the bump-version script while implementing, and do not touch `.jpulse/` in tests - use an isolated temp project or the plugin-cli harness
  - **as-built:** published as `@jpulse-net/plugin-ai-core` 1.0.7 (prepack staged `ai-core`, `ai-mock`, `hello-ai`; companions lockstep; tarball includes `scope.js` and `scope.test.js`). Assembly is `agent/scope.js` (not inlined in `index.js`); wipe logs `logInfo` / `logError` with a null `req` and no `logRequest` because there is no request. The controller wrapper does not pass `redisManager` — `deleteStagedThread` uses `global.RedisManager`. `executeTool` honors settings via `effectiveTimeoutMs` rather than only bumping a constant. The capability probe returns the clamped `maxImageBytes` as well as `maxConvertBytes`. Image `origin` is honest on the wire (`sanitizeImageMeta` / `sourceRefsFrom` default to `file`). Smoke-test fix: the conversation picker was stale after a send because the panel never re-fetched the list; `openThread` now calls `refreshThreads()`. Unit tests: 20 suites, 182 passed
  - out of scope, each with its own item or number: the embed panel mode (design TD-17); any `onAiConvert*` hook (W-229 is the seam); a PDF or Office converter plugin; an HTTP route for `deleteByScope`; framework user-account deletion and its cascade; per-scope tool policy (TD-12); the reference site's migration, which is that site's repository

### W-233, v1.0.8, 2026-09-19: ai: create chat options; fix clipped add menu
- status: ✅ DONE
- type: Bugfix
- objectives:
  - make the (+) attach menu readable on the first chip - it is a left-edge control today, and `right: 0` plus `.jp-float-panel { overflow: hidden }` clips "Add file" / "Add URL"
  - let a site name the toolbar - `create({ title: 'AI Agent' })` - so a page with two chats is not two windows both labelled "AI chat"
  - forward the three floatPanel shell options a second panel on the same page needs - `storageKey`, `cascade`, `group` - so the map keeps `aiAgent:window` geometry and cascades with Map Chat
  - keep the §1.1 one-liner untouched: a site that omits all three still gets "AI chat", `jp:floatPanel:<id>`, no cascade, group `default`
  - let a site tear the panel down - `create()` returns `destroy()` that removes the body node `create()` always appends and closes the per-thread WebSocket, so switching maps or scopes does not leak a second chat or leave `/api/1/ws/ai/:threadId` until the tab dies
  - keep compose `text/plain` paste in the textarea - only clipboard files and images become chips; paste-as-source is drop / (+) menu
  - put this turn's source/image list on the user message and treat earlier filenames as stale, so a prior reply cannot invert the live chip list
- prerequisites:
  - W-226, `@jpulse-net/plugin-ai-core` 1.0.2: `jPulse.ai.panel.create()` builds its own root and hands it to `jPulse.UI.floatPanel.create()`. Title is baked from i18n. Shell options other than `id`, `launcher`, and `open` are dropped
  - W-220, v2.0.0: `storageKey` / `cascade` / `group` already work on `floatPanel.create()`. This item only stops swallowing them
  - W-228, 1.0.4: the (+) menu (`.plg-ai-add-menu`) and the chip strip. As Built 25 put (+) after the last chip via `display: contents`
  - W-232, 1.0.7: published. No contract change here - this is the next list from the same porting site, all panel chrome
  - nothing framework-side. Do not change `.jp-float-panel { overflow: hidden }`. `jpulseVersion` stays `>=2.0.3`
- rationale:
  - **the source of this item is the same second site, now with the panel open.** W-232 closed the server-side cutover traps. The screenshot, the `create()` call, and then a scope change that leaked the old body node are what this item still cannot say without these changes
  - **the menu clip is a one-line CSS bug, not a shell bug.** `.plg-ai-add-menu` is `position: absolute; right: 0; bottom: calc(100% + 4px)` on `.plg-ai-strip-add`. The strip is `display: flex` with chips first (`display: contents`) and (+) last, so (+) sits just after the last chip - on the left of a 420 px panel when there is one file. `right: 0` grows the 10 em menu to the left, past the panel edge. `.jp-float-panel { overflow: hidden }` is doing its job (rounded clip, resize handles). The screenshot is "d file" / "d URL"
  - **portal is the wrong fix.** A body-level menu needs a second positioner, a raise/z-index rule against other float panels, and a scroll listener, for two buttons that already have a parent. A fixed `left: 0` only moved the clip to the right-edge (+) after chips fill the row. Flip from which half the (+) sits in; do not measure the menu box
  - **the toolbar label is not a floatPanel option.** `floatPanel` never sets a title - the site's markup does. The AI panel owns `.plg-ai-title` and today stamps `I18N.title` ("AI chat") at create. A per-panel string is a create option, not an i18n override and not a live setter
  - **the shell options already exist and are dropped.** `createPanel` forwards `id`, `el`, `defaults` (420x560), `minWidth`, `minHeight`, `launcher`, `onOpen`. `storageKey`, `cascade`, and `group` are ignored, so every AI panel persists as `jp:floatPanel:ai-panel-<scopeType>-<scopeId>`, never cascades, and shares group `default`. The map already has `aiAgent:window` and a Map Chat panel that cascades. Without the three names, the port resets geometry and stacks on top of Map Chat
  - **do not spread `options` into floatPanel.** `adapter`, `regions`, `commands`, `scopeType` are not shell keys. Forward the three by name. An unknown floatPanel option stays unforwarded until a site asks - that is cheaper than a silent bag
- features:
  - **1. the add menu stays inside the panel.** CSS default is `left: 0` (and drops `right: 0`). On open, `positionAddMenu()` looks at the (+) midpoint against the panel midpoint: left half keeps `left: 0`, right half sets `right: 0`. That is the (+) position, not a measure of the still-hidden menu. No portal, no `overflow` change on `.jp-float-panel`. The chip pop stays in-flow and is not this bug
  - **4. Enter on the rename field stops.** Same as Escape: `preventDefault` and `stopPropagation` before `saveRename()`. After save the input is hidden and focus leaves; without stop, the same keydown reaches document and a site that treats Enter as a page command (map Edit Details) runs it
  - **5. `create()` returns `destroy()`.** `create()` always appends a root to `document.body` and `floatPanel.destroy()` only drops listeners and the registry entry, so a map that recreates the chat on scope change would leave the old node. `destroy()` is idempotent: it calls `transport.disconnect()` (the same `_aiIgnoreStatus` + `wsConn.disconnect()` path thread switch already uses, a no-op on HTTP), unbinds the panel's document and launcher listeners, calls the floatPanel destroy (so the old `x` / `y` leaves cascade occupancy), and `removeChild`s the root. The same function is on the returned object and on `handle.destroy`. A site only calls `destroy()` - it does not close the AI socket itself. It does not cancel an in-flight turn or clear `localStorage`
  - **2. `create({ title })` is the toolbar label.** A non-empty string replaces `I18N.title` on `.plg-ai-title` and on the thread-select `aria-label` (that select already uses the same string). Omitted, `null`, or `''` keeps the i18n default. Create-time only - no `handle.setTitle`, no i18n key for "AI Agent". `hello-ai` does not pass `title`
  - **3. `create()` forwards `storageKey`, `cascade`, `group` to `floatPanel.create()`.** Same names, same types as W-220 (`cascade` is `true` or `{ offsetX, offsetY }`). Omitted means floatPanel's own defaults. Cascade still only runs when storage is empty (`!loaded.fromStorage`), so a restored `aiAgent:window` is not shoved aside on every load - that is the existing floatPanel contract, not a new one. Occupancy is every **registered** panel's `x` / `y`, not open-only and not same-group: Map Chat is created on map load even while closed, and a closed chat at the default corner still occupies it. `group` is only `mobile.exclusive`; forwarding `group: 'map'` does nothing until exclusive is on. Do not forward `mobile` in this item - a site that wants exclusive turns it on at floatPanel, which this bag does not reach
  - **6. compose paste of `text/plain` stays in the textarea.** The handler used to `preventDefault` and `addTextSource` any paste longer than 400 characters that was not a lone URL, which minted an Untitled paste chip. A long paste that happens to contain a URL already stayed as text (`extractPromptUrl`). Clipboard files and images still become chips (`origin: 'paste'`). Paste-as-source is drop / (+) menu, not compose paste. The send-time URL intercept is unchanged
  - **7. this turn's source/image list is on the user message.** `formatSourcesBlock` / `formatImagesBlock` / the empty-sources policy used to land only in the system prompt. History still has earlier assistant replies that name files (`Copyright.txt`), so the model recited those and called the live chip (`test.txt`) stale. `/sources` and the Used badge already read the tab list; `onAiPromptFragment` never sees chip names. `openUserContent` now appends this turn's metadata list (or the empty-tab policy). Safety says earlier filenames are stale. Stored `userText` is unchanged. Do not rewrite history. Do not change the site
  - **out of scope, deliberately:** TD-17 embed chrome (`chrome: 'none'`); forwarding `defaults` / `mobile` / `minWidth` / `minHeight` (the panel keeps 420x560 and 320x360); changing `.jp-float-panel` overflow; a live title setter; cancelling an in-flight turn on destroy; rewriting prior assistant text
- deliverables:
  - `plugins/ai-core/webapp/view/jpulse-common.css`:
    - `.plg-ai-add-menu` uses `left: 0`; `right: 0` is gone. `positionAddMenu()` flips `left` / `right` from which half the (+) sits in
  - `plugins/ai-core/webapp/view/jpulse-common.js`:
    - resolve `title` once (`options.title` if it is a non-empty string, else `I18N.title`) and stamp it on `.plg-ai-title` and the thread-select `aria-label`
    - `floatPanel.create({ ... })` gains `storageKey: options.storageKey`, `cascade: options.cascade`, `group: options.group`
    - `create()` returns `destroy()` that unregisters the float panel, disconnects the per-thread WebSocket, and removes the body node
    - compose `paste` only `preventDefault`s when `clipboardData.files` is non-empty; `text/plain` is not turned into a source
  - `plugins/ai-core/webapp/utils/agent/prompt.js`, `inputs.js`, `utils/attachments/index.js`:
    - `assemblePrompt` no longer embeds the source/image manifest; `openUserContent` appends `formatTurnAttachmentManifest` to this turn's user message; safety says earlier filenames are stale
  - `plugins/ai-core/webapp/tests/unit/hello-ai.test.js` (panel scan, same file as the `openThread` / `refreshThreads` scan):
    - CSS: `.plg-ai-add-menu` block contains `left: 0` and does not contain `right: 0`
    - JS: `positionAddMenu` compares the (+) midpoint to the panel midpoint and sets `right: 0` on the right half
    - JS: rename Enter calls `stopPropagation` before `saveRename`
    - JS: `floatPanel.create` is passed `storageKey`, `cascade`, and `group` from `options`
    - JS: the title stamp reads `options.title` (not only `I18N.title`)
    - JS: `destroy()` exists, `removeChild`s `root`, and calls `transport.disconnect()` (`disconnectWs`)
    - JS: compose paste has no `text.length > 400` / `addTextSource` branch; files still become chips
  - `plugins/ai-core/webapp/tests/unit/attachments.test.js`:
    - live list is on `openUserContent`; `assemblePrompt` system does not contain the source name; earlier-replies-are-stale is in safety
  - `plugins/ai-core/docs/README.md`, `plugins/ai-core/README.md`:
    - the three create options next to `launcher` / `id`, with the map-shaped example (`title: 'AI Agent'`, `storageKey: 'aiAgent:window'`, `cascade: true`). `group` is documented as `mobile.exclusive` only, not as what makes cascade see Map Chat. `destroy()` is documented as the teardown that removes the body node and closes the socket. Compose paste of text stays in the box. This turn's source/image list is on the user message. Version numbers, never work-item numbers
  - `docs/dev/design/W-223-ai-agent.md` (framework repo, this item's only framework-repo change):
    - Rev 22 specifies; Rev 23 is as-built after 1.0.8; §12.1 names the three shell options and `title`; new §21.12; standalone follow-ons become §21.13; a §21.2 table row
  - framework-repo user docs are **not** part of this item's plugin commits
- notes:
  - design source: `docs/dev/design/W-223-ai-agent.md` Rev 22, Rev 23, and §21.12. Read §12.1 (panel create and the floatPanel shell) and W-220's `docs/jpulse-ui-reference.md` Floating Panel Widget (`storageKey`, `cascade`, `group`). TD-17 is still the deliberate omission - this item keeps the float shell
  - **repo layout:** `plugins/ai-core` is its own git repo and the publish root; `ai-mock` and `hello-ai` are siblings, lockstep only (no product change). One publish of `@jpulse-net/plugin-ai-core` 1.0.8 from `plugins/ai-core` only. The design-doc hunk is the one framework-repo change
  - **decisions taken before implementation**, each with the alternative rejected:
    - *the menu:* flip from which half the (+) sits in. Measuring the menu box was rejected - it can run before the menu has a width (or against a clipped box) and leave `left: 0` on a right-edge (+). Portaling was rejected. Changing `.jp-float-panel { overflow: hidden }` was rejected
    - *the title:* a create-time string on `.plg-ai-title`. An i18n override was rejected because two panels on one page need two labels, not one translated default. A handle setter was rejected - the map knows the name at `create()`
    - *the shell bag:* forward the three named options, not `...options`. Spreading would leak `adapter` / `regions` / `commands` into floatPanel and would look like every W-220 key works when `defaults` and `mobile` still do not
    - *teardown:* `destroy()` on the object `create()` returns, also assigned to `handle.destroy`. Calling only `floatPanel.destroy()` was rejected - that leaves the body node. A site closing `/api/1/ws/ai/:threadId` itself was rejected - that socket is plugin-owned. `destroy()` disconnects it (thread switch already did). Cancelling an in-flight turn or wiping `localStorage` is not this call
    - *compose paste:* `text/plain` stays in the box. The 400-character Untitled-paste heuristic was rejected - paste-as-source is drop / (+) menu. A lower threshold or a confirm dialog was rejected for the same reason
    - *source manifest:* on this turn's user message, not only the system prompt. Rewriting history or asking the site to mention chip names was rejected — the inversion is the plugin's
  - **cascade occupancy is every registered panel's `x` / `y`.** Not open-only, not same-group. Map Chat is created on map load even while closed, so a closed chat at the default corner still occupies it - that is why `cascade: true` on a first visit offsets. `group` is only `mobile.exclusive`; forwarding `group: 'map'` does nothing until exclusive is on
  - **any parseable JSON at the key sets `fromStorage: true` and skips cascade.** A leftover custom-panel blob without `x` / `y` / `w` / `h` / `open` still counts. Clear it once or rewrite it in that shape. A missing or empty key is the only first-visit path
  - `hello-ai` stays on the i18n title and the default storage key - the demo is not a second panel on a map
  - do not run the bump-version script while implementing, and do not touch `.jpulse/` in tests
  - out of scope: TD-17 embed mode; forwarding `defaults` / `mobile` / min size; a live title setter; any `onAiConvert*` hook; a converter plugin
  - **as-built:** published as `@jpulse-net/plugin-ai-core` 1.0.8 (prepack staged `ai-core`, `ai-mock`, `hello-ai`; companions lockstep; commit `087ba89`; annotated tag `v1.0.8`). Menu CSS is `left: 0`; `positionAddMenu()` flips by (+) midpoint vs panel midpoint. Title is create-time only. Shell bag is the three named keys. `destroy()` is idempotent: `transport.disconnect()` (`disconnectWs`, same `_aiIgnoreStatus` path as thread switch), unbind document/launcher, `floatPanel.destroy()`, `removeChild(root)`. Compose paste is files-only. Manifest helpers are `formatTurnAttachmentManifest` / `appendManifestToUserContent` in `attachments/index.js`; `openUserContent` appends; `assemblePrompt` does not. Empty-tab policy is on every user message when `sourcesEnabled !== false`, not only when tools are withheld as `no-sources`. Image metadata only when `includeImages` (vision + enabled + has images). Stored `userText` unchanged. `extras.prompt` is still passed into `assemblePrompt` and unused for the list. Design Rev 23 records this.

### W-234, v1.0.9, 2026-09-19: ai: image chips stay on Send
- status: ✅ DONE
- type: Bugfix
- objectives:
  - keep image chips on Send, the same way text and URL chips already stay
  - clear images only in `clearAttachments` (`/new`, thread switch) and on ✕
  - peek the Redis mailbox on send; delete mailbox bytes only when the chip is cleared
  - so a mid-turn site adapter (`handle.attachments()` / `propose_image`) still sees the picture
  - so a follow-up prompt can see the picture if the chip is still there (images are not replayed from history)
- prerequisites:
  - W-228, 1.0.4: Redis image mailbox, `takeStagedImages` used to delete on send, panel `state.images = []` after `startTurn`
  - W-233, 1.0.8: published. This is the next list from the same porting site
  - nothing framework-side. `jpulseVersion` stays `>=2.0.3`
- features:
  - **1. send does not consume chips.** `sendText` leaves `state.images` and `state.sources` after `transport.startTurn`
  - **2. mailbox peeks.** `takeStagedImage` / `takeStagedImages` read and refresh TTL; they do not `cacheDel`
  - **3. delete with the chip.** ✕ is `DELETE /api/1/ai/thread/:id/image/:imageId`. `/new` and thread switch call `clearAttachments`, which is `DELETE /api/1/ai/thread/:id/images`
  - **out of scope:** re-staging from `panelStore.files` on each send; cancelling an in-flight turn; rewriting history to replay images
- deliverables:
  - `plugins/ai-core/webapp/view/jpulse-common.js`: no `state.images = []` after send; `clearAttachments` and image ✕ delete the mailbox
  - `plugins/ai-core/webapp/utils/attachments/images.js`: peek + TTL refresh
  - `plugins/ai-core/webapp/controller/aiCore.js`: the two DELETE routes
  - `plugins/ai-core/webapp/tests/unit/attachments.test.js`, `hello-ai.test.js`, `panel-strip.test.js`, `regressions.test.js`, `helpers-contracts.test.js`
  - `plugins/ai-core/docs/README.md`, `docs/dev/design/W-223-ai-agent.md` Rev 24 / §14.4 / §21.13
- notes:
  - design source: `docs/dev/design/W-223-ai-agent.md` Rev 24, §14.4, §21.13
  - **repo layout:** plugin-only. `ai-mock` and `hello-ai` lockstep when published
  - do not run the bump-version script while implementing, and do not touch `.jpulse/` in tests
  - **as-built:** published as `@jpulse-net/plugin-ai-core` 1.0.9 (prepack staged `ai-core`, `ai-mock`, `hello-ai`; companions lockstep; commit `619d36f`; tag `v1.0.9`). `sendText` does not clear chips. `takeStagedImages` peeks and refreshes TTL. ✕ is `DELETE .../image/:id`; `/new` and thread switch are `DELETE .../images`. Hello AI has no `propose_image`; `regressions.test.js` walks `handle.attachments()` after peek. Unit tests: 23 suites, 240 passed. Design Rev 25 records this.







-------------------------------------------------------------------------
## 🚧 IN_PROGRESS Work Items

### W-235, v2.0.5, 2026-09-19: websocket: queue a send until the socket is open
- status: 🚧 IN_PROGRESS
- type: Feature
- objectives:
  - stop dropping the first message when a caller sends before the socket reaches `OPEN` - today that is a console warning and a silently lost payload
  - retire the "wait until connected" guard every caller has had to hand-roll
  - keep the current behavior for a socket that is genuinely gone (`disconnected`, `auth-required`): still refuse, still return `false`
  - document how Vue and `floatPanel` coexist (documentation only, no widget code) — the real T-124 failure is injected resize-handle DOM, not a proxied handle object
- prerequisites:
  - W-208, v1.x: `request()` / `reply()` / `replyError()`, the `pendingRequests` map, `settlePending`, and the welcome-message `limits` - the queue reuses all of it
  - W-163: heartbeat and the auth-terminal close codes (4401 / 4403), which must not be queued through
  - nothing plugin-side. This is a framework release; `ai-core` adopts it in W-237
- rationale:
  - **three independent callers have already written the same guard**, which is the signal to move it into the framework rather than document it a fourth time:
    - `plugins/ai-core/webapp/view/jpulse-common.js` `waitForWs()` - ~30 lines, resolves on the `connected` status, rejects after 15 s, and leaks one `onStatusChange` callback per call because there is no unsubscribe
    - the reference site's Map Chat - a `wsConnected` boolean checked before all three `wsConnection.send()` call sites
    - the same site's map socket - `join` is sent from inside the `connected` branch of `onStatusChange` because sending it next to `connect()` would be dropped
  - **the failure is silent to the user and loud in the console.** `send()` warns `Cannot send, connection not open` and returns `false`. Most callers ignore the return value, so the message is gone with no retry and no surface
  - **`request()` is worse**, because it resolves `NOT_CONNECTED` instantly during a reconnect the framework is already managing. The caller sees a hard failure while the transport is mid-backoff and about to succeed
  - **a queue needs an age cap, not just a buffer.** Reconnect backs off to 30 s and up to `maxReconnectAttempts`. Replaying a two-minute-old chat message on recovery is worse than losing it, so a queued entry expires
  - **Vue is a doc problem, and the real failure is injected DOM, not a proxied handle.** `resizeHandles.mode` defaults to `'inject'`, which `appendChild`s eight `.jp-float-panel-resize` nodes onto `el`. When `el` is a Vue `Teleport` tree (Map Chat), the next Vue patch rebuilds from VNodes and drops those grips because they are not in the VNode tree. Symptom: corners work right after bind, then vanish after a reactive update (open, unread, a new message); the panel stops resizing. That is why Map Chat uses `resizeHandles: { mode: 'manual' }` and keeps the eight `data-jp-panel-resize` divs in the Vue template. The table already says inject is "MPA only"; this item names the failure mode. A panel whose root is `appendChild`'d onto `document.body` outside Vue (the AI plugin panel) is fine on inject. Storing `_chatPanelHandle` / `_aiPanelHandle` / `_aiPluginPanel` / `wsConnection` on `data()` without `markRaw` was never seen to break `toggle` / `destroy` — `floatPanel` compares by `id` — but "a handle is not reactive state; destroy on unmount" is still good guidance, a different issue
- features:
  - **1. `send()` queues while the socket is coming up.** When `readyState !== OPEN`, the status is `connecting` or `reconnecting`, and `shouldReconnect` is set, the payload is appended to `connection.outbox` and `send()` returns `true`. Status `disconnected` or `auth-required` keeps today's warn-and-`false`
  - **2. the outbox is bounded two ways.** `maxQueueLength` (default 32) and `maxQueueAgeMs` (default 10000) on the connect options. Over length drops the oldest and warns once; over age is dropped at flush and warned once. The existing `maxSize` byte pre-check runs at enqueue when `limits` are known (they are `null` before the first welcome, which is already true today)
  - **3. flush happens in `onopen`, before the status callbacks.** In enqueue order, so a handler that sends from the `connected` branch cannot jump ahead of a message queued earlier
  - **4. the outbox is cleared where pending requests are already settled.** `disconnect()` and the auth-terminal closes (4401 / 4403) drop it; an ordinary close keeps it for the reconnect
  - **5. `request()` queues on the same rule, and its timeout clock starts at enqueue.** The caller asked for a total budget, not a post-connect one. A queued request dropped by age or length resolves `NOT_CONNECTED`. Teardown (`disconnect()`, 4401 / 4403) of a queued request resolves `CONNECTION_LOST`, same as an in-flight request
  - **6. one contract change, documented:** `send()` returning `true` now means *accepted*, not *written to the wire*. `getStatus()` and `isConnected()` are unchanged and stay the way to ask what the socket is actually doing
  - **7. Vue guidance (documentation only, two paragraphs).**
    - *resize handles:* when `el` is a Vue-owned tree (`Teleport` or any VNode root), use `resizeHandles: { mode: 'manual' }` and put the eight `data-jp-panel-resize` nodes in the template. `'inject'` (the default) appends grips that the next Vue patch removes. A panel appended to `document.body` outside Vue can keep inject
    - *handles on `data()`:* a widget handle or a socket handle is not reactive state — keep it out of `data()` / `reactive()`, or wrap it in `markRaw()`. Destroy on unmount when a component re-mounts. Never seen as a hard failure; still good guidance
    - no framework code change for this item
  - **out of scope:** an offline/durable queue that survives a reload; per-message priority or deduplication; changing reconnect backoff or `maxReconnectAttempts`; the server side of the namespace; anything in `ai-core` (that is W-237)
- deliverables:
  - `webapp/view/jpulse-common.js` (`jPulse.ws`):
    - `connection.outbox`, the two caps on the connect options, enqueue in `send()` and `request()`, flush via `connection._flushOutbox()` from `_createWebSocket.onopen` (that method cannot close over a local `flushOutbox`) ahead of `_updateStatus('connected')`, clear in `disconnect()` and on 4401 / 4403
  - `webapp/tests/unit/utils/jpulse-websocket-simple.test.js`, `jpulse-websocket-request.test.js`:
    - behavioral cases live in the request suite (queue-then-flush in order, flush before `onStatusChange('connected')`, `disconnected` / `auth-required` refuse, `disconnect()` and 4401 / 4403 drop the queue, length and age drop, `request()` timeout starts at enqueue, teardown of a queued request is `CONNECTION_LOST`)
    - the simple suite covers the config defaults and a source-contract scan
    - 2 suites, 56 passed
  - `docs/websockets.md`:
    - the queue, the two caps, and the `send()` contract change. The Vue SPA example no longer puts the connection on `data()`. The `webapp/static/assets/jpulse-docs/` copy is generated by `configure` / `jpulse-update` and is not edited by hand
  - `docs/jpulse-ui-reference.md` (Floating Panel Widget) and `docs/front-end-development.md` (Vue.js integration):
    - the inject-vs-manual failure mode (Vue patch drops injected grips; use `mode: 'manual'` and template nodes). The existing "MPA only" table cell is not enough
    - a shorter second paragraph: a handle is not reactive state (`markRaw` or keep it off `data()`); destroy on unmount. Not the T-124 symptom
  - `README.md` and `docs/README.md` Latest Release Highlights, `docs/CHANGELOG.md`
- notes:
  - **repo layout:** framework-only. No plugin change in this item. `ai-core` adopts the queue in W-237 and raises `jpulseVersion` to `>=2.0.5`
  - **decisions taken before implementation**, each with the alternative rejected:
    - *queue rather than a promise:* `send()` stays synchronous and keeps returning a boolean. Making it return a promise was rejected - it is called from event handlers all over the reference site and would silently become a floating promise
    - *age cap:* 10 s default. An unbounded queue was rejected because the reconnect ladder reaches 30 s and `maxReconnectAttempts` can be 60 - a message would resurface half an hour later
    - *queue only while `connecting` / `reconnecting`:* a socket the framework has given up on stays a hard `false`, so a caller that never checks status still cannot pile up messages forever
    - *Vue as documentation:* name the inject failure and keep `markRaw` as a second paragraph. Changing the inject default, auto-detecting Vue, or unwrapping `__v_raw` inside the framework were rejected — the widget does not depend on Vue, and a body-appended panel (the AI plugin) is already correct on inject
  - the `onStatusChange` callback list has no unsubscribe, which is why `ai-core`'s per-turn `waitForWs()` accumulates handlers. Not fixed here; noted because adopting the queue in W-237 makes that call path go away
  - do not run the bump-version script while implementing, and do not touch `.jpulse/`

### W-236, v1.0.1, 2026-09-19: ai-anthropic: a transient network failure is retryable
- status: 🕑 PENDING
- type: Bugfix
- objectives:
  - let a reset socket or a refused connect use the retry ladder the turn loop already has, instead of ending the turn
  - put the real reason in the message and in the log, so `fetch failed` stops being the whole story
  - keep a wrong endpoint or a bad certificate fatal - retrying those only delays an accurate error
- prerequisites:
  - W-224, `@jpulse-net/plugin-ai-anthropic` 1.0.0: `completeAnthropic` and its emitted error shape
  - `ai-core` 1.0.x: `turnLoop` already backs off on `retryable` (`RETRYABLE_WAIT_MS = [500, 1500, 3500]`) and throws "retry exhausted" after the third attempt. No `ai-core` change, no framework change
  - independent of W-235 and W-237; can ship in any order
- rationale:
  - **the mechanism exists and one hardcoded flag bypasses it.** Every non-`AbortError` throw emits `retryable: false`, so undici's `TypeError: fetch failed` reaches the loop as fatal and the backoff never runs. A blip that would have cleared in 500 ms ends the user's turn
  - **the diagnosis is thrown away.** `sanitizeError(error.message)` yields the bare string `fetch failed`. The code that explains it - `ECONNRESET`, `ECONNREFUSED`, `EAI_AGAIN` - is on `error.cause` and is never read or logged, so an admin has nothing to act on
  - **not everything that throws is transient.** `ENOTFOUND` on a mistyped endpoint and a TLS chain failure do not heal in 3.5 s. Retrying them costs 5.5 s per turn and still fails, so they stay fatal and simply get a better message
- features:
  - **1. the catch classifies `error.cause.code`.** Retryable: `ECONNRESET`, `ECONNREFUSED`, `ETIMEDOUT`, `EPIPE`, `EAI_AGAIN`, `UND_ERR_SOCKET`, `UND_ERR_CONNECT_TIMEOUT`. Everything else, including `ENOTFOUND` and any TLS / certificate failure, stays `retryable: false`
  - **2. the cause rides the message.** `fetch failed (ECONNRESET)` through the existing `sanitizeError`, so the API-key redaction still applies, and the same line is logged
  - **3. nothing else moves.** `AbortError` is still `AI_TIMEOUT`. 429 / 529 are still `AI_RATE_LIMIT` with `retryable: true`. The family here stays `AI_PROVIDER_ERROR` - `turnLoop` reads the flag, not a new code
- deliverables:
  - `plugins/ai-anthropic/webapp/controller/aiAnthropic.js`:
    - a small `causeCode()` / retryable-set helper and the classified emit in the non-`AbortError` catch
  - `plugins/ai-anthropic/webapp/tests/unit/complete-anthropic.test.js`:
    - `fetch failed` with `cause.code = 'ECONNRESET'` is `retryable: true` and names the code in the message
    - `ENOTFOUND` and a TLS failure stay `retryable: false`
    - an `AbortError` is still `AI_TIMEOUT`; 429 is still `AI_RATE_LIMIT`; the key is still redacted
  - `plugins/ai-anthropic/README.md`: a 1.0.1 release bullet
  - `plugins/ai-anthropic/commit-message.txt`
- notes:
  - **repo layout:** `plugins/ai-anthropic` is its own git repo and its own package, with no bundle members. One publish of `@jpulse-net/plugin-ai-anthropic` 1.0.1. No framework-repo change beyond this work item and a design-doc line if W-237's revision is being written anyway
  - **decisions taken before implementation:**
    - *classify the cause, do not retry everything:* a blanket retryable was rejected - a misconfigured endpoint would then cost 5.5 s per turn and still report the same unhelpful text
    - *no new error code:* `AI_PROVIDER_ERROR` plus `retryable` is the contract `turnLoop` already reads. A new code would need a matching branch there
  - do not run the bump-version script while implementing, and do not touch `.jpulse/`

### W-237, v1.0.10, 2026-09-19: ai: chip attach, mobile shell, destroy cancel
- status: 🕑 PENDING
- type: Feature
- objectives:
  - close the remaining BubbleMap / core-migration panel gaps so a site can drop `hardClose` and wire chip → object without a site fork
  - sites that omit the new options stay on today's chrome (the §1.1 one-liner)
  - do not revive unused `adapter.sourceAttachable` (no caller since W-232)
  - not MCP, not OpenAI, not embed chrome (TD-17)
- prerequisites:
  - W-233, 1.0.8: `title`, `storageKey` / `cascade` / `group`, `destroy()` node + WS. `defaults` / `mobile` / min size and a live title setter were deliberately not forwarded. `destroy()` does not cancel a turn
  - W-234, 1.0.9: published (`619d36f`, tag `v1.0.9`). Image chips stay on Send; mailbox peeks; DELETE with the chip. `/new` and thread switch already `clearAttachments`
  - W-220, v2.0.0: `floatPanel.create()` already accepts `mobile`, `defaults`, `minWidth`, `minHeight`. This item only stops swallowing them
  - W-235, v2.0.5: `jPulse.ws` queues a send until the socket is open. Feature 9 adopts it. `jpulseVersion` becomes `>=2.0.5` for every `ai-core` user (bundle members lockstep)
  - W-236 is independent; this item does not wait for it
- rationale:
  - **the source of this item is the same porting site, now on 1.0.9.** Chip attach is the one 100% gap: the old site's chip ⋯ **Attach to bubble** wrote the file or picture onto the selected bubble with no prompt and no Apply card. Plugin chips have ✕ and a details pop only. User docs still describe the menu
  - **`sourceAttachable` was the wrong name for this.** W-232 dropped it because the panel never called it. This item adds `adapter.attach` / `adapter.canAttach` and ships the ⋯ only when `attach` exists. A predicate with no writer is how the unused name happened
  - **`group: 'map'` is inert until exclusive is on.** `create()` still hardcodes `defaults: { w: 420, h: 560 }` and does not pass `mobile`. Map Chat + AI still need a site `hardClose`. Forward the four names the same way `storageKey` / `cascade` / `group` already are. Do not spread the create bag
  - **a phone sheet puts Send under the home indicator.** Pad compose with `env(safe-area-inset-bottom)`
  - **`destroy()` leaves the turn running** after ← Maps. The Cancel route already exists. Call it when a turn is running, then disconnect. Still idempotent. Still does not clear `localStorage`
  - **user docs: confirm `/new` only if sources are attached** — those are dropped. Plugin `/new` and the (+) new button do not confirm. The same lifetime rule applies to a thread switch that would `clearAttachments`
  - **the porting site's current workarounds are the checklist.** Read against the live map: `create()` is called with `title` / `storageKey` / `cascade` / `group: 'map'` but no `mobile` and no `defaults`, so a double-click handler calls `setRect({ x: null, y: null, w: 360, h: 480 })` to get the size back, and a manual `isFront()` + `hardClose()` pair in the canvas stands in for `mobile.exclusive`. Both disappear once the four keys are forwarded
- features:
  - **1. chip ⋯ Attach, only when the adapter implements it.**
    ```
    adapter.canAttach?.(row) → { ok: true } | { ok: false, reason }
    adapter.attach(row, file) → Promise   // truthy = success
    ```
    - no `attach` → no ⋯ (hello-ai stays clean)
    - `canAttach` omitted → treat as `{ ok: true }`
    - `canAttach` false → item visible, disabled, `reason` in the pop
    - click calls `attach(row, handle.attachmentFile(row.id))`. Site does the write (same path as a canvas drop). Not a proposal. Does not consult `toolsWrite`. Does not open an Apply card. Does not remove the chip
    - site decides file-origin vs paste/URL, home/widget/portal refusals, store-ready. Plugin does not guess
    - label is i18n `chipAttach` ("Attach"). A map site overrides the string to "Attach to bubble". No `adapter.attachLabel`
    - chip click still opens the details pop; ⋯ is a separate control and does not toggle details. Flip the menu to stay inside the panel (same half-rule as the (+) menu)
  - **2. `create()` forwards `mobile`, `defaults`, `minWidth`, `minHeight`.** Named keys, not a spread. Omitted keeps today's plugin defaults (`defaults: { w: 420, h: 560, open: !!options.open }`, `minWidth: 320`, `minHeight: 360`, floatPanel's own mobile bag with `exclusive: false`). Passed `defaults` merge on top of that 420×560/`open` so a site can send `{ w: 360, h: 480 }` without restating `open`. `mobile: { exclusive: true, breakpoint: 768 }` is what makes `group: 'map'` mean anything
  - **3. compose `safe-area-inset-bottom`.** Pad `.plg-ai-compose` (or the compose row) with `env(safe-area-inset-bottom, 0px)` so Send clears the home indicator on a phone sheet. Desktop inset is 0
  - **4. `destroy()` cancels an in-flight turn.** When `state.running` and there is a `threadId`, fire `POST /api/1/ai/thread/:id/cancel` (same route as the Cancel button), then disconnect. Do not wait for the POST before tearing down — cancel is HTTP, so closing the socket does not drop it. Still idempotent. Still does not clear `localStorage`. Still does not require the site to close `/api/1/ws/ai/:threadId`
  - **5. `/new` (and +) confirm when chips are attached.** `attachments().length > 0` → `confirmDialog`, then `createNew` / `clearAttachments` (already DELETEs staged images). Cancel leaves the chips. Empty strip does not confirm. The conversation-select path uses the same gate when a switch would drop chips (`openThread` already `clearAttachments` on `!sameThread`). `createNew` → `openThread` after a clear does not confirm a second time
  - **6. WS actor includes `session.user` (same shape as HTTP).** `authorizeAiSocket` already has the handshake `req`. Stash that user object on `ctx`. The turn path builds `actorFromRequest({ user, session: { user } }, { origin: 'ws', … })` instead of `{ user: { username, roles } }` only. Scope/tool hooks that read `req.session.user` then work on WS without a site `reqFromActor` synth. Username/roles fallback stays for older ctx
  - **7. `handle.setTitle(str)`.** Create-time `title` stays. A non-empty string stamps `.plg-ai-title` and the thread-select `aria-label`. `''` / `null` restores the i18n default. Optional for the map; cheap because the stamp already exists
  - **8. `sendText` stops treating a false `send()` as a turn error.** Today `startTurn` emits a generic error when `wsConn.send()` returns false. Still correct once the queue accepts a send that has not hit the wire yet
  - **9. adopt the W-235 queue.** `startTurn` connects and sends without the per-turn `await waitForWs()`, because the framework holds the payload until the socket opens. `waitForWs` itself stays for the reconnect notice, but is no longer called once per turn, which also ends the `onStatusChange` handler it accumulates per call. `jpulseVersion` is `>=2.0.5`
  - **out of scope:** TD-17 `chrome: 'none'`; quota footer; unread-dot; reviving `sourceAttachable`; the `jPulse.ws` queue itself and the Vue doc note (W-235); the Anthropic retry classification (W-236); site wiring of `adapter.attach` and its user-doc sentences (that site's repo)
- deliverables:
  - `plugins/ai-core/webapp/view/jpulse-common.js`:
    - chip ⋯ + `adapter.attach` / `canAttach` as specified; hello-ai does not pass them
    - `floatPanel.create({ … })` gains `mobile: options.mobile`, merged `defaults`, `minWidth` / `minHeight` from options with the 320×360 fallback
    - `destroy()` fires cancel when a turn is running, then disconnects
    - `/new`, the (+) new button, and a chip-dropping thread switch share one confirm
    - `handle.setTitle`
    - `startTurn` no longer awaits `waitForWs()` per turn; a false `send()` is not a turn error
  - `plugins/ai-core/webapp/view/jpulse-common.css`:
    - compose (or compose-row) padding includes `env(safe-area-inset-bottom, 0px)`
    - ⋯ menu stays inside the panel (half-flip, no portal, no `.jp-float-panel` overflow change)
  - `plugins/ai-core/webapp/utils/transport/ws.js`:
    - handshake user on `ctx`; turn actor `req.user` and `req.session.user` are that object
  - `plugins/ai-core/webapp/translations/en.conf`, `de.conf`:
    - `chipAttach`, disabled-reason surface, `/new` confirm title/body
  - `plugins/ai-core/webapp/tests/unit/panel-strip.test.js`, `hello-ai.test.js`, `regressions.test.js`:
    - invert the 1.0.8 "no `mobile` / no `defaults`" scans; assert the four names are forwarded and the bag is still not spread
    - no ⋯ / no `attach(` in the hello-ai adapter
    - ⋯ present only when `adapter.attach` is a function; disabled when `canAttach` is `{ ok: false }`; click calls `attach(row, file)`
    - `destroy()` body contains the cancel POST before `transport.disconnect()`
    - `/new` / thread-switch confirm reads `attachments().length` (or `state.sources` / `state.images`)
    - `handle.setTitle` exists
    - CSS contains `safe-area-inset-bottom`
    - `startTurn` does not `await waitForWs()`; a false `send()` is not emitted as a turn error
  - `plugins/ai-core/webapp/tests/unit/helpers-contracts.test.js` (or the WS suite):
    - turn actor after authorize exposes `req.session.user` with the handshake user, not only `{ username, roles }`
  - `plugins/ai-core/docs/README.md`, `plugins/ai-core/README.md`:
    - `attach` / `canAttach` next to the other adapter methods; ⋯ only when `attach` exists; not a proposal
    - `mobile` / `defaults` / min size next to `storageKey` / `cascade` / `group`, with the map-shaped example (`mobile: { exclusive: true, breakpoint: 768 }`, `defaults: { w: 360, h: 480 }`)
    - `destroy()` cancels a running turn
    - `/new` confirms when chips are attached
    - `handle.setTitle`
    - send queues until the socket is open; requires jPulse `>=2.0.5`
    - version numbers, never work-item numbers
  - `plugins/ai-core/plugin.json` (and the two lockstep companions): `jpulseVersion` `>=2.0.5`
  - `hello-ai`: lockstep only. No `attach`. No `mobile`. No title setter
  - `docs/dev/design/W-223-ai-agent.md` (framework repo, this item's only framework-repo change besides this work item):
    - Rev 26 specifies; Rev 27 is as-built after 1.0.10; §12.1 names attach chrome, the four shell keys, destroy-cancel, `/new` confirm, `setTitle`; WS actor `session.user`; new §21.15; a §21.2 table row. W-236's provider classification is a line in the same revision if it has landed by then
  - framework-repo user docs are **not** part of this item's plugin commits
- notes:
  - design source: `docs/dev/design/W-223-ai-agent.md` Rev 25, §12.1, §14.4, §21.13. Read W-220's `docs/jpulse-ui-reference.md` Floating Panel Widget (`mobile`, `defaults`, min size, `exclusive`). TD-17 stays deferred
  - **repo layout:** plugin-only. `plugins/ai-core` is the publish root; `ai-mock` and `hello-ai` lockstep only. One publish of `@jpulse-net/plugin-ai-core` 1.0.10 from `plugins/ai-core` only. The design-doc hunk is the one framework-repo change besides this work item
  - **decisions taken before implementation**, each with the alternative rejected:
    - *attach chrome:* a ⋯ on the chip, only when `adapter.attach` exists. Putting Attach in the details pop was rejected — user docs describe a menu, and a details pop on every site would show a dead action on hello-ai. Reviving `sourceAttachable` was rejected — that name had no writer
    - *attach label:* i18n "Attach", site-overridable. An `adapter.attachLabel` method was rejected — one more adapter seam for a string the translation merge already covers
    - *attach is a write, not a proposal:* no Apply card, no `toolsWrite`. The old site wrote on click. A propose/apply hop was rejected — the user already confirmed by picking the menu item
    - *shell bag:* four more named keys, still not `...options`. Spreading would leak `adapter` / `regions` / `commands` and would look like every W-220 key works
    - *defaults merge:* plugin 420×560/`open` plus `options.defaults`. Replacing the whole object was rejected — a site that passes only `{ w: 360, h: 480 }` should not lose `open`
    - *destroy cancel:* fire the existing POST, then disconnect. Making `destroy()` an awaited handshake was rejected — cancel is HTTP. Wiping `localStorage` is still not this call
    - *`/new` confirm:* chip count, not "did the site implement attach". A paste chip is dropped too. Confirming every `/new` was rejected — empty strip is cheap
    - *W-235 adoption:* `jpulseVersion` `>=2.0.5` is accepted. `waitForWs()` stays for the reconnect notice only; it is no longer the send gate
  - **already shipped (do not redo):** `title`, `storageKey` / `cascade` / `group`, `destroy()` node + WS, text paste stays in the box, user-message source/image manifest, image chips stay on Send, peek mailbox, (+) menu inward
  - **after 1.0.10 the site can** pass `mobile: { exclusive: true }` and drop both the manual `isFront()` + `hardClose()` gate and the `setRect({ w: 360, h: 480 })` reset handler; wire `adapter.attach` to its direct-drop helpers; and override the `chipAttach` string to "Attach to bubble", which keeps its existing user-doc sentences and its `/Attach to bubble/` doc test true with no edit. Quota footer, unread-dot, and embed `chrome: 'none'` stay out
  - do not run the bump-version script while implementing, and do not touch `.jpulse/` in tests






### Pending

- site: add testing infra by default to site/webapp/tests/ (unit, integration, manual), copy once
- user registration: admin option to get notified by email

old pending:
- fix responsive style issue with user icon right margin, needs to be symmetrical to site icon
- offer file.timestamp and file.exists also for static files (but not file.include)
- logLevel: 'warn' or 1, 2; or verboseLogging: true
- version history: label is not shown in history table

### Potential next items:
- W-0: i18n: vue.js SPA support
- W-0: deployment: docker strategy
- W-0: auth controller: authentication with LDAP (see W-109 for flow design)

### Chat instructions

next work item: W-0...
- review work item
- ask questions if unclear
- suggest change of spec if any, goal is a good DX, good usability, good onboarding & learning experience for site admins and developers; use the "don't make me think" paradigm
- plan how to implement (wait for my go ahead)

release prep:
- run tests, and fix issues
- review tt-git-diff.txt for accuracy and completness of work item
- assume W-235, v2.0.5, 2026-09-19
- if needed, update features & deliverables in work item to document work done (don't change status, don't make any other changes to this file)
- update README.md (## latest release highlights), docs/README.md (## latest release highlights), docs/CHANGELOG.md, and any other doc in docs/ as needed (don't bump version, I'll do that with bump script)
- update commit-message.txt, following the same format (don't commit)
- append to cursor_log.txt

### Misc

=== JPULSE release & package build on github ===
npm test
git diff
git status
node bin/bump-version.js 2.0.5 2026-09-19
git diff
git status
git add .
git commit -F commit-message.txt
git tag v2.0.5; git push origin main --tags

=== PLUGIN release & package build on github ===
cd plugins/auth-mfa
git diff
git status
node ../../bin/bump-version.js 1.0.9 2026-09-19
git diff
git status
git add .
git commit -F commit-message.txt
git tag v1.0.9; git push origin main --tags
npm publish
(or this in jpulse prj root: npx jpulse plugin publish auth-mfa --registry=https://npm.pkg.github.com )

=== checkpoint commit ===
npm test
git add .
git commit -m 'Checkpoint commit 1 for: W-209, v1.7.13, 2026-08-13: plugins: extensibe hook registry -- design doc update'
git push

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
npm run test:integration
npm test -- --testPathPattern=jpulse-ui-navigation
npm test -- --verbose --passWithNoTests=false 2>&1 | grep "FAIL"
npx jest webapp/tests/unit/controller/handlebar-logical-helpers.test.js

-------------------------------------------------------------------------
## 🕑 PENDING Work Items

template:
### W-1, v1.7., 2026-08-:
- status: 🕑 PENDING
- type: Feature     // Idea, Feature, Bugfix, Refactoring, Testing, Infrastructure, Documentation, Deployment
- objectives:
- prerequisits:     // optional
- rationale:        // optional
- features:
- deliverables:
  - FIXME `path/file`:
    - FIXME summary
- notes:

### W-202, v1.7.6, 2026-08-xx: auth: add locked status
- status: 🕑 PENDING
- type: Feature
- depends on: W-201 (centralized, per-status account-status check in `auth.js`'s `login()` - this
  work item adds a 5th branch to that same block rather than introducing a second check location)
- objective: give jPulse a `locked` status that is conceptually distinct from `suspended`/
  `terminated` - `locked` protects *the account* against someone else (e.g. brute-force login
  attempts, suspicious activity), while `suspended`/`terminated` are admin/moderator actions that
  protect *the community* from the account - paired with the actual detection/auto-clear mechanism
  that sets and clears it, so this doesn't become another status value nothing ever sets (the exact
  trap W-201 exists to fix)
- discovered while: reviewing W-201's revised spec - raised the idea of adding a `locked` status;
  agreed it's a distinct, valuable concept, but out of scope for W-201 (a narrowly-scoped bugfix)
  since there is currently no failed-login-attempt tracking, lockout threshold, or auto-unlock
  mechanism anywhere in the framework (confirmed via repo-wide search - the only trace is the
  aspirational `hook-manager.js` `onAuthFailure` doc string "On login failure - rate limiting,
  lockout", never implemented) - adding the enum value alone, with nothing to ever set it, would
  just recreate W-201's bug in a new shape
- related backlog item: `W-084` ("security: harden security") already lists "Account Lockout:
  Automatic account lockout after N failed login attempts (configurable threshold)" as an
  undetailed to-do bullet with no design behind it - this work item formalizes/supersedes that
  bullet with a concrete design (W-084 itself intentionally left untouched - not moved, not marked
  done, per this session's file-editing constraints)
- why not fold this into `suspended` via a reason sub-field instead: considered (e.g.
  `status: 'suspended', statusReason: 'security' | 'policy'`) as a smaller-schema-footprint
  alternative, but rejected for now - splitting "why is this account blocked" across two fields
  is more for a developer/admin to hold in their head than one clear top-level `status` value, and
  `locked`'s lifecycle (system-set, often auto-clearing) is different enough from `suspended`'s
  (admin-set, admin-cleared) that conflating their storage shape would likely leak into the admin
  UI/search/query layer anyway
- design considerations (none locked in yet - to be resolved when this item is scheduled):
  - tracking storage: a failed-attempt counter + `lockedUntil` timestamp, either on the user
    document (simplest, no new infra) or in Redis via `global.RedisManager.cacheCheckRateLimit()`
    (already the established pattern for per-IP rate limiting, e.g.
    `plugins/auth-oauth/webapp/controller/oauthAuth.js` `apiInit`/`apiCallback` - better suited to
    multi-server deployments, see W-055 load-balancer work item)
  - keyed by identifier, by IP, or both - identifier-only tracking lets an attacker weaponize the
    lockout itself as a denial-of-service against a known victim's account (repeatedly submit
    wrong passwords for someone else's username) - likely needs IP-based rate limiting as a
    complementary control, not a replacement, mirroring the `onAuthFailure` hook's existing
    "rate limiting, lockout" framing as two related but separate concerns
  - configurable threshold/duration (e.g. `appConfig.controller.auth.lockout.maxAttempts`,
    `.lockoutDurationMinutes`), auto-clear on timeout, and/or early clear on successful password
    reset
  - admin manual-unlock action in the user-management UI, for support cases before the timeout
    elapses
  - whether the counter should be driven through the existing `onAuthFailure` hook (already fired
    on every login failure today) rather than new bespoke tracking code in `auth.js`, so plugins
    get the same signal for their own auditing/alerting
  - distinct, non-punitive user-facing copy (e.g. "Too many failed attempts. Try again in
    {{minutes}} minutes, or reset your password.") vs. `suspended`/`terminated`'s
    "contact your administrator" framing - the whole point of separating these statuses is that
    the message a locked-out legitimate user sees should not sound like an accusation
  - slots into `auth.js`'s `login()` status-check block (W-201) as a 5th sequential check
    (`'locked'` → `ACCOUNT_LOCKED`), no restructuring of that block needed
- features: not yet scoped - see design considerations above; to be finalized when this item is
  picked up
- deliverables: not yet scoped - to be broken out (schema enum + optional lockout fields, tracking
  mechanism, `appConfig` options, `login()` branch, admin unlock UI, translations, tests) once this
  item is picked up
- benefits: gives legitimate users a clear, actionable, non-accusatory explanation when an
  automated security measure (not an admin decision) blocks their login, and gives the framework
  real brute-force protection on `/api/1/auth/login`, which has none today

### W-0: auth-oauth plugin: support Apple IdP
- status: 🕑 PENDING
- type: Feature
- objectives: ability to authenticate with any Apple account
- prerequisits:
  - W-197, v1.0.3, 2026-08-02: auth-oauth plugin: single sign-on with auth servers like Okta, Google, Apple

### W-0: auth-oauth plugin: support GitHub IdP
- status: 🕑 PENDING
- type: Feature
- objectives: ability to authenticate with a GitHub account
- prerequisits:
  - W-197, v1.0.3, 2026-08-02: auth-oauth plugin: single sign-on with auth servers like Okta, Google, Apple

### W-0: plugins: list available plugins in github.com/jpulse-net/plugin-* packages
- status: 🕑 PENDING
- type: Feature
- objectives:
  - the existing `npx jpulse plugin list` shows installed plugins
  - we need an equivalent to list plugins available in the github repository

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
- type: Bugfix
- prerequisite
  - W-076, v1.0.0: framework: redis infrastrucure for a scaleable jPulse Framework
- /hello-websocket/, /hello-app-cluster/ should work properly on its own page, that is no messaging to other tabs with same page open
- or, better: always require redis, i.e. fix docs and code accordingly

### W-0: handlebars: block components with content slots
- status: 🕑 PENDING
- type: Feature
- objective: block-level components with inner content (Phase 2 of W-097, deferred after W-102)
- background: W-102 completed Phase 1 (inline components with parameters), but did not implement Phase 2 (block components with slots for wrapping arbitrary content)
- working document:
  - docs/dev/design/W-097-handlebars-use-components.md (see Phase 2 section)
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

### W-0: i18n: vue.js SPA support
- status: 🕑 PENDING
- type: Feature
- objective: let Vue SPAs use the same merged translation set as MPA (framework, then active plugins, then `site/webapp/translations/`)
- MPA merge is W-222. This item is only the client-side loader / Vue i18n wiring so SPA strings are not a second copy
- do not invent a second site or plugin translation path
- out of scope: live reload without restart (separate W-0)

### W-0: config controller: nested site config
- status: 🕑 PENDING
- type: Idea
- objective: separate admin tasks for larger orgs, such as an admin for Sales, another for Engineering, or separate by divisions

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
