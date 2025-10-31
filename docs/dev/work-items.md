# jPulse Framework / Docs / Dev / Work Items v1.0.0-rc.2

This is the doc to track work items, arranged in three sections:

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
  ```{
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
  }```
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
  ```{
      data: {
          docId:      Object, // _id (ObjectId or String)
          docType:    String, // 'config', 'user', ...
          action:     String, // 'create', 'update', 'delete'
          changes:    String, // diff-type changes of doc
      },
      createdAt:      Date,   // default: new Date()
      createdBy:      String, // login user ID
      docVersion:     Number  // default: 1
  }```
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
- nginx Configuration** (production):
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
- type: Bug
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
        <div class="jp-login-card"> ==> <div class="jp-card jp-login-card">
      - else:
        <div class="jp-login-card"> ==> <div class="jp-card">
    - page .jp-login-header ==> common .jp-card-dialog-heading
    - page .jp-divider ==> common .jp-divider
  - webapp/view/auth/login.shtml and webapp/view/auth/signup.shtml:
    - they have different form validation and submit handling,
    - better to consolidate using one approach?

### W-013, v0.4.5: view: define standard for page assets, create site admin index page
- status: ✅ DONE
- type: Feature
- define standard for page assets:
  - webapp/static/assets/<page-name>/*
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
- type: Bug
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
- **DELIVERED**: Complete site configuration management system with intuitive admin interface, email settings (SMTP server, port, credentials, TLS), site messages, password visibility toggle, smart default creation, comprehensive validation, full i18n support, and extensive test coverage

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
- common JavaScript code in site/webapp/view/site-common.js extends window.jPulse object
- common styles in site/webapp/view/site-common.css with site-* prefix for clear source identification
- documented in enhanced site/README.md with comprehensive development guidelines
- IMPLEMENTATION COMPLETED:
  - Created site-common.css.tmpl and site-common.js.tmpl template files
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
  - docs/examples.md
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
    - defined by <ul> list with href attributes pointing to panel ID
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
    <title>Page title - {{app.shortName}}</title>
  - webapp/static/: add updated favicons to static root
  - bin/test-all.js: add elapsed time to each test, and total in grand total

### W-067, v0.8.3: regression bug: site/ directory is missing in published package
- status: ✅ DONE
- type: Bug
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
- status: DONE ✅
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













-------------------------------------------------------------------------
## 🚧 IN_PROGRESS Work Items

### W-076, v1.0.0: framework: redis infrastrucure for a scaleable jPulse Framework
- status: 🚧 IN_PROGRESS
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
    - in <title> tag of all pages, fixed broken {{app.shortName}} to {{app.site.shortName}}
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
      - All 5 route patterns updated (shtml/tmpl, jpulse-*, site-common, viewRouteRE, fallback)
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
    - site/webapp/view/site-common.js.tmpl -- fixed init() to use Handlebars {{app.site.name}} and {{app.site.version}} for server-side expansion
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





pending:
- migrate @peterthoeny/jpulse-framework to @jpulse-net/jpulse-framework
- license review


old pending:
- view controller: return unexpanded {{handlebars}} if not exist, instead of empty return
- install pm2, test
- navigation.tmpl: remove jPulse Tabs Navigation comment help, add to docs
- fix responsive style issue with user icon right margin, needs to be symmetrical to site icon
- offer file.timestamp and file.exists also for static files (but not file.include)
- logLevel: 'warn' or 1, 2; or verboseLogging: true
- add SiteControllerRegistry.getStats() to metrics api & system-status
- jp-card: more consistent card header: normal, dialog look with gray background jp-card-dialog



### Potential next items:
- W-045: architecture: create plugin infrastructure
- W-068: view: create responsive sidebar
- W-0: view: page headers with anchor links for copy & paste in browser URL bar
- W-0: i18n: site specific translations

### Chat instructions

next work item: W-0...
- review task, ask questions if unclear
- suggest change of spec if any, goal is a good UX, good usability, onboarding, and learning experience for site admins and developers; use the don't make me think paradigm
- plan how to implement (wait for my go ahead)
- current timestamp: 2025-10-04 17:55

finishing up work item: W-070:
- run tests, and fix issues
- show me cursor_log.txt update text I can copy & paste (current date: 2025-10-07 20:50)
- assume release: W-076, v1.0.0-rc.2
- update deliverables in W-079 to document work done (don't make any other changes to this file)
- update README.md, docs/README.md, docs/CHANGELOG.md, and any other doc in docs/ as needed (don't bump version, I'll do that with bump script)
- update commit-message.txt, following the same format (don't commit)

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
node bin/bump-version.js 1.0.0-rc.2
git diff
git status
git add .
git commit -F commit-message.txt
git tag v1.0.0-rc.2
git push origin main --tags

=== on failed package build on github ===
git tag -d v0.8.5
git push --delete origin v0.8.5
git add .
git commit --amend --no-edit
git tag -a v0.8.5 -m "W-072, v0.8.5: Vue.js SPA Demo & Enhanced jPulse Utilities for Modern Web Development"
git push origin main --force-with-lease
git push origin v0.8.5

=== amend commit message ===
git commit --amend -F commit-message.txt
git push --force-with-lease origin main

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

### W-080, v0.9.8: controller: change search to cursor based paging API with limit & cursor
- status: 🕑 PENDING
- type: Feature
- objective: paged queries that do not miss or duplicate docs between calls

### W-055: deployment: load balancer and multi-server setup
- status: 🕑 PENDING
- type: Feature
- objective: automated setup for load-balanced multi-server deployments
- prerequisits:
  - W-053, v0.7.3: deployment: configuration templates and validation - ✅ DONE
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

### W-045: architecture: create plugin infrastructure
- status: 🕑 PENDING
- type: Feature
- objective: extensible framework that is easy to understand & easy to maintain
- author: 3rd party developers
- audience: site administrator
- working doc: docs/dev/W-014-W-045-mvc-site-plugins-architecture.md
- strategy: drop a plugin in specific directory, with auto discovery
- plugins for:
  - additional models
  - additional controllers
  - additional views
  - wrapper for additional view packages
  - themes
- create a hello-world-plugin, ship with jpulse-framework

### W-037: view: create themes
- status: 🕑 PENDING
- type: Feature
- initially a dark and light theme, light is default
- user can set preferred theme
- way to define new themes
  - drop in a directory, with auto discovery

### W-068: view: create responsive sidebar
- status: 🕑 PENDING
- type: Feature
- objective: define common sidebar, make it useful on mobile and desktop
- brainstorming:
  docs/dev/working/W-068-W-069-W-070-view-create-responsive-nav
- only left sidebar?
  - also right sidebar?
- on desktop:
  - show options:
    - fixed (default)
    - toggle: ▶ / ◀ clickable buttons
    - auto-hide: show when mouse is on left page padding (open close with delay)
    - when open:
      - shift left border of main content to right (with content reflow), or
      - overlap main content
- on mobile:
  - closed by default
  - open on command (hamburger menu?)
- fix /jpulse-docs/ markdown SPA to be based on common sidebar

### W-0: view: page headers with anchor links for copy & paste in browser URL bar
- status: 🕑 PENDING
- type: Feature
- objectives: shared content with deep links, should work on any jpulse rendered page, not just markdown docs
- depends on: W-049: docs: views render markdown docs for jPulse docs and site docs
- feature:
  - on hover on any page heading, show a '#' on the left of the heading
  - click on '#':
    - the URI has an #anchor-link appended/replaced
    - the clipboard is updated with anchor link
    - user can share deep link with anchor
- anchor name based on heading name:
    - option 1:
      - lowercased heading name, special chars replaced by _, max length 36 chars
      - exmaple: #framework_architecture
    - option 2:
      - hash of heading name
      - exmaple: #e15a52f75b23c8c9
- open question:
  - support duplicate heading names, or pick first one?
    - example: each feature section in a page could have an "Objective" heading
    - could be #objective, #objective-2, #objective-3, ...
- example:
  - click on '#' of ## Troubleshooting header in /jpulse/dev/installation.md:
  - sharable link:
    - option 1: http://localhost:8080/jpulse/dev/installation#troublshooting
    - option 2: http://localhost:8080/jpulse/dev/installation#e15a52f75b23c8c9
- deliverables:
  - webapp/view/jpulse-common.js, webapp/view/jpulse-footer.tmpl:
    - add logic for hover, copy to clipboard, URI change with anchor

### W-0: view: broadcast message
- status: 🕑 PENDING
- type: Feature
- objective: admin can broadcast message to all users, such as "scheduled downtime this Saturday 10am-12pm"
- show yellow broadcast message just below banner
- brodcast message div has [-] button on left to minimize message
  - reduced to [+] button, when clicked restores the message div
  - minimize status is remembered across page loads
  - minimize status is reset after 4 hours site config setting (nag time)
- broadcast message can be set in site config
            messages: {
                enable: { type: 'boolean', default: false },
                broadcast: { type: 'string', default: '' },
                // show minimized message again after N hours:
                nagTimeHours: { type: 'number', default: 4 } // 0: disable
            }

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
- type: Bug
- prerequisite
  - W-076, v1.0.0: framework: redis infrastrucure for a scaleable jPulse Framework
- /hello-websocket/, /hello-app-cluster/ should work properly on its own page, that is no messaging to other tabs with same page open

### W-0: handlebars: enhance {{#if}} and {{#unless}} with and, or, gt, gte, lt, lte, eq, ne
- status: 🕑 PENDING
- type: Feature
- objective: more flexible handlebars
- syntax:
  - {{#if}} and {{#unless}} accept an optional operator identified by a trailing colon, followed by operands:
    - {{#if <operator>: <operand1> <operand2> <operand3>...}} ... {{else}} ... {{/if}}
    - {{#unless <operator>: <operand1> <operand2> <operand3>...}} ... {{/unless}}
  - example with existing syntax:
    - {{#if some.condition}} true block {{else}} false block {{/if}}
  - examples with operator and operands:
    - {{#if and: some.condition other.condition}} true block {{else}} false block {{/if}}
    - {{#if or: some.val other.val etc.val}} true block {{else}} false block {{/if}}
    - {{#if eq: some.string "DONE"}} true block {{else}} false block {{/if}}
    - {{#if gt: some.val 1}} true block {{else}} false block {{/if}}
- deliverables:
  - webapp/controller/view.js -- enhanced {{#if}} and {{#unless}} block handlebars

### W-0: handlebars: new {{#set}} block handlebar
- status: 🕑 PENDING
- type: Feature
- objective: more flexible handlebars
- syntax:
  - {{#set key1="val1" key2=123 key3=true}} key1: {{key1}}, key2: {{key2}}, key3: {{key3}} {{/set}}
- deliverables:
  - webapp/controller/view.js -- new {{#set}} block handlebar

### W-0: docs: syntax highlighting for preformatted sections
- status: 🕑 PENDING
- type: Feature
- objective: better way to understand code
- deliverables:
  - all tripple backtick sections are initialized with prism syntax highlighting based on specified language

### W-0: view: create tooltip on any element with jp-tooltip class
- status: 🕑 PENDING
- type: Feature
- objective: easy way to add nice looking tooltips to any element
- spec:
  - add class="jp-tooltip" to any element with tooltip=""
  - auto initialize and initialize on demand, such as when used in a dialog box
  - position: automatic based on viewport, possibly configurable

### W-0: view: create jPulse.UI.progressbar
- status: 🕑 PENDING
- type: Feature
- objective: way to indicate the progress of a multi step process, such as multi-page forms
- deliverables:
  - jPulse.UI.progressbar('step-2', {
      steps: [
        { id: 'step-1', label: 'Step 1', url: '/signup/1' },
        { id: 'step-2', label: 'Step 2', url: '/signup/2' },
      ],
      disablePending: true,   // disable to pending steps after current step
      width:          '100%'
    })
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

### W-0: i18n: site specific translations & vue.js SPA support
- status: 🕑 PENDING
- type: Feature
- objective: allow site admins/developers define site-specific translations for MPA and SPA
- how: deep merge of site/webapp/translations/* files into webapp/translations/

### W-0: controller: extract Handlebars processing to dedicated controller
- status: 🕑 PENDING
- type: Idea
- objectives: better separation of concerns, reusable template processing API
- depends on: none
- deliverables:
  - create webapp/controller/handlebars.js with dedicated Handlebars processing logic
  - extract all template processing from view.js to handlebars.js
  - provide clean API: HandlebarsController.process(template, context, options)
  - maintain backward compatibility with existing view controller behavior
  - add standalone processing method for non-view contexts
  - enable future "Try Your Own Handlebars" demo functionality
  - comprehensive test coverage for new controller
  - documentation for new API patterns

### W-0: config controller: nested site config
- status: 🕑 PENDING
- type: Idea
- objective: separate admin tasks for larger orgs, such as an admin for Sales, another for Engineering, or separate by divisions

### W-0: user controller & view: manage user: change status
- status: 🕑 PENDING
- type: Feature
- objective: admin can change the status of users

### W-0: auth controller: signup with email confirmation
- status: 🕑 PENDING
- type: Feature
- make it optional with a appConfig setting

### W-0: auth controller: authentication with OAuth2
- status: 🕑 PENDING
- type: Feature
- possiby as plugin once W-045 is implemented
- strategy to splice OAuth fields into user doc

### W-0: auth controller: authentication with LDAP
- status: 🕑 PENDING
- type: Feature
- possiby as plugin once W-045 is implemented
- strategy to splice LDAP attributes into user doc

### W-0: auth controller: MFA (multi-factor authentication)
- status: 🕑 PENDING
- type: Feature
- objective: offer increased security
- possiby as plugin once W-045 is implemented
- choice of SMS, authentication app

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

------------------------

Conversation with Grok on view strategy, e.g. build your own or use vue:
https://grok.com/share/c2hhcmQtNA%3D%3D_5c4f68c9-f2ae-46d2-aa33-3f6975601839

