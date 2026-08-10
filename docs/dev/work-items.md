# jPulse Docs / Dev / Work Items v1.7.10

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









-------------------------------------------------------------------------
## 🚧 IN_PROGRESS Work Items

### W-206, v1.7.10, 2026-08-09: user: reset password
- status: 🚧 IN_PROGRESS
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










### Pending

- site: add testing infra by default to site/webapp/tests/ (unit, integration, manual), copy once

old pending:
- fix responsive style issue with user icon right margin, needs to be symmetrical to site icon
- offer file.timestamp and file.exists also for static files (but not file.include)
- logLevel: 'warn' or 1, 2; or verboseLogging: true

### Potential next items:
- W-0: i18n: site specific and plugin specific translations & vue.js SPA support
- W-0: deployment: docker strategy
- W-0: auth controller: authentication with LDAP (see W-109 for flow design)

### Chat instructions

next work item: W-0...
- review task, ask questions if unclear
- suggest change of spec if any, goal is a good DX, good usability, good onboarding & learning experience for site admins and developers; use the "don't make me think" paradigm
- plan how to implement (wait for my go ahead)

release prep:
- run tests, and fix issues
- review tt-git-diff.txt for accuracy and completness of work item
- assume W-197, v1.0.3, 2026-08-01
- assume W-206, v1.7.10, 2026-08-09
- if needed, update features & deliverables in W-206 work-items to document work done (don't change status, don't make any other changes to this file)
- update README.md (## latest release highlights), docs/README.md (## latest release highlights), docs/CHANGELOG.md, and any other doc in docs/ as needed (don't bump version, I'll do that with bump script)
- update commit-message.txt, following the same format (don't commit)
- append to cursor_log.txt

### Misc

=== JPULSE release & package build on github ===
npm test
git diff
git status
node bin/bump-version.js 1.7.10 2026-08-09
git diff
git status
git add .
git commit -F commit-message.txt
git tag v1.7.10; git push origin main --tags

=== PLUGIN release & package build on github ===
git diff
git status
node ../../bin/bump-version.js 1.0.3 2026-08-02
git diff
git status
git add .
git commit -F commit-message.txt
git tag v1.0.3; git push origin main --tags
npm publish
(or this in jpulse prj root: npx jpulse plugin publish auth-mfa --registry=https://npm.pkg.github.com )

=== checkpoint commit ===
npm test
git add .
git commit -m 'Checkpoint commit 1 for: W-069, v0.9.2: view: create site navigation pulldown and hamburger menu'
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
- tests:            // optional
- tech-debt:        // optional

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

### W-0: i18n: site specific and plugin specific translations & vue.js SPA support
- status: 🕑 PENDING
- type: Feature
- objective: allow site admins/developers define site-specific and plugin specific translations for MPA and SPA
- how: deep merge of site/webapp/translations/* files into webapp/translations/

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

