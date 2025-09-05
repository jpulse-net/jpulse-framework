Requirements Doc of jPulse Framework
====================================

-------------------------------------------------------------------------
# Objectives

- generic web application framework using MongoDB, Node.js, Express
- used as a base to create scalable web apps
- to be used in docker, one image for MongoDB, one for the app
- use MVC (model, view, controller) paradigm
- the view is in browser JavaScript, pages with variables expanded on server
- the model enforces schema of data in nosql database
- the controller is the API that interfaces between model and view
- license: GPL v3

-------------------------------------------------------------------------
# Requirements

- modular app configuration
- controller handles all /api/1/* REST APIs
- comprehensive unit and integration tests
- bootstrap on initial startup:
  - invite sysadmin to configure app first
  - create sysadmin account with users' login name
  - assign root role
- out of box models * controllers:
  - authentication based on configuration: internal (default), ldap, oauth2
  - user managment: create user, login/logout, roles
- out of box views:
  - home
  - about
  - login/logout (depending on active auth method)
- sysadmin can add their own models, controllers, views
  - a way to allow jpulse-framework updates without affecting customization
- i18n as user preference: en (default), de, ...
- theme as user preference: dark, light (default)
- support multiple node instances on same server, managed by pm2
- support multiple app servers
- site admin config:
  - stored in mongo
  - cached in each app instance using redis
- session management:
  - stored persistently in mongo
  - maybe: cached in each app instance using redis

-------------------------------------------------------------------------
# Directory Structure

- webapp/
  - app.conf              # app config
  - app.js                # main app
  - route.js              # URI routing
  - database.js           # MongoDB database interface
  - model/                # model -- database interface
    - config.js             # schema for configs collection
    - log.js                # schema for logs collection
    - user.js               # schema for users collection
  - controller/           # controller -- app API
    - config.js             # handles /api/1/config/...
    - log.js                # handles /api/1/log/...
    - login.js              # handles /api/1/login/...
    - user.js               # handles /api/1/user/...
    - view.js               # loads view files, expands {{handlebars}}
  - view/                 # view -- browser files served by app
    - jpulse-header.tmpl    # common header
    - jpulse-footer.tmpl    # common footer
    - jpulse.js             # common functions
    - home/
      - index.shtml
    - login/
      - index.shtml
      - logout.shtml
    - error/
      - index.shtml         # handles error messages with msg URL parameter
  - utils/                # utilties
    - common.js             # common functions used by modeld and controllers
    - i18n.js               # handles internationalization
  - translations/         # translations - multiple languages
    - en.conf               # English translation
    - de.conf               # Genram translation
  - static/               # static content served by nginx
    - robots.txt            # robots file
    - favicon.ico           # app favicon
    - images/               # app images and icons
    - common/               # 3rd party packages

-------------------------------------------------------------------------
# ✅ COMPLETED & ❌ CANCELED Work Items

## **W-001**: create hello world app
- status: ✅ COMPLETED
- type: Feature
- create logic in webapp/app.js
- use appConfig.deployment[mode].port in webapp/app.conf
- create package.json, package-lock.json

## **W-002**: create internationalization framework
- status: ✅ COMPLETED
- type: Feature
- all user facing text can be translated
- translations: one file per language

## **W-003**: create test framework
- status: ✅ COMPLETED
- type: Feature
- create webapp/tests/
- create test hierarchy using subdirectories
- implement first tests for translations/i18n.js

## **W-004**: create site admin config model & controller
- status: ✅ COMPLETED
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

## **W-005**: create log infrastructure
- status: ✅ COMPLETED
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

## **W-006**: create server sice include function
- status: ✅ COMPLETED
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
    - {{if user.authenticated "show" "hide"}}
      - object: { if: function(user.authenticated, "show", "hide") }
    - {{url.domain}}      // 'https://www.example.com:8080'
    - {{url.protocol}}    // 'https'
    - {{url.hostname}}    // 'www.example.com'
    - {{url.port}}        // '8080'
    - {{url.pathname}}    // '/home/index.shtml'
    - {{url.search}}      // '?foo=bar'
    - {{url.param.foo}} // 'bar'
    - {{i18n.login.notAuthenticated}}

## **W-007**: rename project from Bubble Framework to jPulse Framework
- status: ✅ COMPLETED
- type: Feature
- rename git repo to /peterthoeny/jpulse-framework
- rename any text references to project name

## **W-008**: strategy for view content and static content; HTML header & footer strategy
- status: ✅ COMPLETED
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

## **W-009**: common utilities infrastructure; flexible shema-based query
- status: ✅ COMPLETED
- type: Feature
- create a common utilities infrastructure
- add schemaBasedQuery() from logs so that it can be used by all controllers (see log.schemaBasedQuery)

## **W-010**: doc improvements
- status: ✅ COMPLETED
- type: Feature
- update README.md, developers.md based on requirements.md doc
- focus on COMPLETED to-do items W-001 to W-009
- in README.md, remove mention of W-nnn, just state the features
- create changes.md that lists W-nnn and version numbers based on git commit history and requirements.md
- create a API.md doc
- remove legacy {{i18n "app.name"}} notation, replaced by {{i18n.app.name}} dot notation

## **W-011**: create user model & controller
- status: ✅ COMPLETED
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

## **W-012**: create user views
- status: ✅ COMPLETED
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

## **W-016**: create auth controller
- status: ✅ COMPLETED
- type: Feature
- handles login, logout
- handles auth.isAuthenticated and auth.isAuthorized for middleware
- use as needed in routing

## **W-017**: i18n with variable content
- status: ✅ COMPLETED
- type: Feature
- handlebar based, example:
  - signOut: 'Sign out {{user.id}}' // ==> 'Sign out jsmith'

## **W-018**: create {{#if}} handlebar for simple nesting
- status: ✅ COMPLETED
- type: Feature
- syntax: {{#if some.condition}} show this with {{other.handlebars}} {{/if}}
- syntax: {{#if some.condition}} show if true {{else}} show if false {{/if}}
- no nesting of #if, e.g. no support for {{#if 1}} {{#if 2}} blah {{/if}} {{/if}}
- remove existing {{if some.condition "text for true" "text for false"}} syntax
- replace all existing {{if}} with the new {{#if}} syntax

## **W-020**: i18n with fallback
- status: ✅ COMPLETED
- type: Feature
- audit language:
  - compare to default ('en')
  - report missing and extra fields
  - patch other language with missing fields from default language

## **W-021**: fix user profile view to read from API
- status: ✅ COMPLETED
- type: Bug
- user profile view now loads fresh data from /api/1/user/profile API endpoint
- profile updates work correctly and increment saveCount properly
- UserModel.updateById() now increments saveCount like ConfigModel

## **W-022**: user preferred language
- status: ✅ COMPLETED
- type: Feature
- centralized language preference handling in AuthController
- AuthController.getUserLanguage() helper function with fallback support
- better separation of concerns between authentication and view logic

## **W-023**: view: migrate views to vue.js while preserving the MVC model
- status: ❌ CANCELED
- type: Feature
- objective: convert from .shtml/Handlebars to complete Vue.js solution while preserving MVC mental model, and upcoming framework/site separation
- reason to cancel SPA with vue.js, and go mack to MPS with .shtml with handlebars:
  - SPA is not a good fit for large deployments were multiple teams work on their own model/controller/view
  - SPA is fragile: if one "page" has a runtime error the whole site is down
  - SPA is heavy: if you have 100 "pages", all content is in browser memory

## **W-026**: config: appConfig structure should match model, controller, and view structure
- status: ✅ COMPLETED
- type: Feature
- restructure webapp/app.conf to match the file structure with controllers, views, etc.
- example: appConfig.controller.view.maxIncludeDepth

## **W-027**: i18n: language files structure should match controller and view structure
- status: ✅ COMPLETED
- type: Feature
- restructure the language files to match the file structure with controllers and views
  - example: i18n.view.auth.login.loginFailed
- prepare for controllers with i18n
  - example: i18n.controller.auth.unauthorizedByRole

## **W-028**: view controller: cache template and include files
- status: ✅ COMPLETED
- type: Feature
- remove async in view.processHandlebars()
- cache template files based on appConfig.controller.view.cacheTemplateFiles flag
- cache include files and file timestamps based on appConfig.controller.view.cacheIncludeFiles flag

## **W-029**: i18n: internationalize user facing controller messages; add consistent controller logs
- status: ✅ COMPLETED
- type: Feature
- rename i18n.translate() to i18n._translate()
- rename i18n.t() to i18n.translate()
- add optional context to i18n._translate(langCode, keyPath, context = {})
- add optional context to i18n.translate(keyPath, context = {}, langCode = this.default, fallbackLang = this.default)
- use consistent function names, such as ConfigController.get() instead of ConfigController.getConfig()
- internationalize user facing controller messages, e.g. no hard-coded messages
- add consitent log entries in controller APIs

## **W-030**: rename LogController log methods for consistency
- status: ✅ COMPLETED
- type: Feature
- LogController.consoleApi() ==> LogController.logRequest()
- LogController.console()    ==> LogController.logInfo()
- LogController.error()      ==> LogController.logError()

## **W-031**: i18n: move i18n.js script to webapp/utils/ & rename translation files
- status: ✅ COMPLETED
- type: Feature
- objective: clean dir structure where all MVC utilities reside in webapp/utils/
- move webapp/translations/i18n.js script to webapp/utils
- rename webapp/translations/lang-en.conf to just webapp/translations/en.conf
- rename webapp/translations/lang-de.conf to just webapp/translations/de.conf
- fix all references to i18n.js and language files

## **W-032**: user: fix username vs userId vs loginId inconsistencies; add uuid field
- status: ✅ COMPLETED
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

## **W-033**: tests: fix ECMAScript Modules infrastructure; consolidate configuration
- status: ✅ COMPLETED
- type: Feature
- issue with tests clean, it does not work
- issue with ECMAScript Modules loading
- issue with app config
- add jpulse/app.json with app.conf in JSON format
- add jpulse/config-sources.json with timestamp of app.conf for auto-update of app.json
- add webapp/utils/bootstrap.js - architecture to created centralized dependency initialization system for consistent module loading order

## **W-034**: error reporting without redirect
- status: ✅ COMPLETED
- type: Feature
- view controller: for 404 and other errors do not redirect to /error/index.shtml, but show error message with same style and content like webapp/view/error/index.shtml
- keep webapp/view/error/index.shtml for client side redirects that need a 404 page

## **W-035**: view: script separation with enhanced jpulse-common.js utilities
- status: ✅ COMPLETED
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

## **W-025**: view: component-based styling with framework/site separation
- status: ✅ COMPLETED
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

## **W-036**: view: migrate existing views to use jpulse-common.js and jpulse-common.css
- status: ✅ COMPLETED
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

## **W-019**: view: create non-blocking slide-down info/alert/warning/success message
- status: ✅ COMPLETED
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

## **W-038**: view: cleaner separation of common code/style and page specific code/style

- status: ✅ COMPLETED
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
    - page .jp-login-header ==> common .jp-card-header
    - page .jp-divider ==> common .jp-divider
  - webapp/view/auth/login.shtml and webapp/view/auth/signup.shtml:
    - they have different form validation and submit handling,
    - better to consolidate using one approach?

## **W-013**: view: define standard for page assets, create site admin index page
- status: ✅ COMPLETED
- type: Feature
- define standard for page assets:
  - webapp/static/assets/<page-name>/*
- define common dashboard grid and icon buttons
- create webapp/view/admin/index.shtml -- admin home
  - with square icon buttons linking to config.shtml, logs.shtml, users.shtml
- require root or admin role for /admin/ pages










-------------------------------------------------------------------------
# 🚧 IN_PROGRESS Work Items

## **W-039**: view: create manage users page for site admins; create user home page
- status: 🚧 IN_PROGRESS
- type: Feature
- move webapp/view/user/index.shtml to webapp/view/admin/users.shtml -- manage users
- replace webapp/view/user/index.shtml with what?
  - square icon buttons







## Potential next items:
**W-013**: view: create site admin views
**W-015**: deployment: strategy for clean onboarding
**W-037**: view: create themes
**W-014**: app: strategy for seamless update of site-specific jPulse deployments

## Chat instructions

next work item: **W-036**: view: migrate existing views to use jpulse-common.js and jpulse-common.css
- review task, ask questions
- suggest change of spec if it helps with usability (for users and developers)
- plan how to implement
- wait for my go ahead to implement

I finished **W-0xx**: .....
- run tests, and fix issues
- update docs: README.md, API.md, developers.md, changes.md in project root
- show me cursor_log.txt update text I can copy & paste
  - current date: 2025-09-04 02:12
- update commit-message.txt, following the same format, specify: W-030138, v0.4.5
  - don't commit




- enhance === view.load( /error/index.shtml ) log to show additional details on what is wrong, likely in followup log entry
- ptester8 -- duplicate username






Misc:
- status: 🚧 IN_PROGRESS
git add .
git commit -F commit-message.txt
git push

git commit --amend -F commit-message.txt
git push --force-with-lease origin main

## Tests how to

npm test -- --verbose --passWithNoTests=false 2>&1 | grep "FAIL"





-------------------------------------------------------------------------
# TO-DO Work Items

## **W-040**: view: create view logs page for site admins
- status: 🕑 PENDING
- type: Feature
- create webapp/view/admin/logs.shtml -- search logs

## **W-041**: view: create edit site config page for admins
- status: 🕑 PENDING
- type: Feature
- create webapp/view/admin/config.shtml -- edit site config

## **W-037**: view: create themes
- status: 🕑 PENDING
- type: Feature
- initially a dark and light theme, light is default
- user can set preferred theme
- way to define new themes
  - drop in a directory, with auto discovery

## **W-014**: app: strategy for seamless update of site-specific jPulse deployments
- status: 🕑 PENDING
- type: Feature
- jPulse will be the base framework for multiple web apps
- define a clean structure of two sets:
  - jPulse framework directories and files
  - site specific directories and files
- automatic way to override/extend jPulse config, models, controllers, views with site-specific settings

## **W-015**: deployment: strategy for clean onboarding
- status: 🕑 PENDING
- type: Feature
- define an clean out of box experience when deploying a jPulse based webserver for the first time
- sensible defaults
- handholding for:
  - dev and prod deployments
  - nginx setup
  - single app server, or multiple app servers with load balancer setup
  - pm2 setup with single jPulse instance (fork), or multiple instances (cluster)
  - mongddb deployment with standalone, or replicaset config
  - mongodb setup with sysdba admin, dev data user, prod data user

## **W-0**: docs: restructure user facing and developer facing documentation
- status: 🕑 PENDING
- type: Feature
- recommendation in tt-dev-doc-structure.md (to be reviewed)

## **W-0**: controller.view: create {{#each}} handlebar
- status: 🕑 PENDING
- type: Feature
- syntax: {{#each array}} {{@index}}: {{this}} {{/each}}
  - @index: zero-based index
  - this: array element value
- use kay path in case the array elements are objects, such as:
  - {{#each users}} {{this.firstName}} {{this.lastName}} {{/each}}

## **W-0**: broadcast message
- status: 🕑 PENDING
- type: Feature
- objective: admin can broadcast message, such as "scheduled downtime this Saturday 10am-12pm"
- show yellow broadcast message just below banner
- brodcast message div has [-] button on left to minimize message
  - reduced to [+] button, when clicked restore the message div
  - minimize status is remembered across page loads
  - minimize status is reset after 4 hours (appConfig setting)
- broadcast message can be set in site config

## **W-0**: docker strategy
- status: 🕑 PENDING
- type: Idea
- new jpulse-docker project?

## **W-0**: create plugin infrastructure
- status: 🕑 PENDING
- type: Feature
- objective: extensible framework that is easy to understand & easy to maintain
- strategy: drop a plugin in specific directory, with auto discovery
- plugins for:
  - themes
  - additional models, controllers, views
- create a hello-world-plugin, ship with jpulse-framework

## **W-0**: create a jpulse-ui-plugin
- status: 🕑 PENDING
- type: Feature
- objective: offer common UI widgets used by front-end developers
- inspired by jQuery UI
  - base on jQuery UI?
- widgets:
  - jPulse.UI.alertDialog(msg, title = 'Alert', width, height)
  - jPulse.UI.confirmDialog(options)
    - options: title, message, buttons, onOpen, onClose, width, minWidth, maxWidth, height, minHeight, maxHeight, zIndex (with defaults)

## **W-0**: view controller: strategy for cache invalidation
- status: 🕑 PENDING
- type: Feature
- objective:
  - ability to invalidate template load cache (.shtml, .tmpl, .css, .js) so that the app does not need to be restarted
  - should work in multi node instances, and multi app server instances
- automated way across all node instances of the app with a timer, file change detection, or on-demand via API?

## **W-0**: create redis caching infrastrucure
- status: 🕑 PENDING
- type: Feature
- redis to cache site config (what else? sessions?)
- should work in multi node instances, and multi app server instances

## **W-0**: i18n with auto-discovery and app update
- status: 🕑 PENDING
- type: Idea
- objective: this feature avoids an app restart when translations are updated or added
- when a new language file is added to webapp/translations, the app sould pick it up dynamically, or by an admin requesting a web-based resources reload
- when a language file has been updated, the app should pick up the changes dynamically, or by an admin requesting a web-based resources reload

## **W-0**: change paging API using limit & skip to cursor based paging
- status: 🕑 PENDING
- type: Feature
- objective: paged queries that do not miss or duplicate docs between calls

## **W-0**: nested site config
- status: 🕑 PENDING
- type: Idea
- objective: separate admin tasks for larger orgs, such as an admin for Sales, another for Engineering, or separate by divisions

## **W-0**: signup with email confirmation
- status: 🕑 PENDING
- type: Feature
- make it optional with a appConfig setting

## **W-0**: authentication with OAuth2
- status: 🕑 PENDING
- type: Feature

## **W-0**: authentication with LDAP
- status: 🕑 PENDING
- type: Feature

## **W-0**: websocket strategy
- status: 🕑 PENDING
- type: Idea
- objective: standard way where views can establish a persistent bi-directional communication with a controller, useful for single page apps, or concurrent edit of content
- high availability with ping pong initiated on both sides
- a way for a controller to register a websocket server
- a way for a view to register a websocket client

## **W-0**: i18n: utility app to manage translations
- status: 🕑 PENDING
- type: Idea
- objective: make it easy for translators to create & maintain language files
- web app:
  - select language
  - show hierarchy of translation
  - at each node, show default English text on top, selected language below
    - save on focus loss, or save button?
  - for view text (i18n.view.*) add link to jPulse app

## **W-0**:
- status: 🕑 PENDING
- type: Idea
- objective:

## **W-0**:
- status: 🕑 PENDING
- type: Idea
- objective:

## **W-0**:
- status: 🕑 PENDING
- type: Idea
- objective:


------------------------
status codes:
- status: 🕑 PENDING
- status: 🚧 IN_PROGRESS
- status: ✅ COMPLETED
- status: ❌ CANCELED
------------------------

------------------------

# Detail on **W-014**: app: Strategy for Seamless Update of Custom jPulse Deployments

## Architectural Decision: Override Directory Pattern

**Selected Approach**: Option B - Override Directory Pattern with site/ separation

### Directory Structure:
```
jpulse-framework/               # Main project
├── webapp/                     # Framework core (updatable)
│   ├── app.js                  # Framework bootstrap
│   ├── controller/             # Base controllers
│   ├── model/                  # Base models
│   └── view/                   # Base templates
├── site/                       # Site customizations (update-safe)
│   ├── webapp/                 # Site-specific overrides
│   │   ├── controller/         # Custom/extended controllers
│   │   ├── model/              # Custom/extended models
│   │   ├── view/               # Custom templates
│   │   └── static/             # Site-specific assets
│   ├── app.conf                # Site configuration
│   └── site.json               # Site metadata
├── plugins/                    # Plugin infrastructure
│   ├── auth-ldap/
│   │   ├── plugin.json         # Plugin metadata
│   │   ├── config.conf         # Plugin config defaults
│   │   └── webapp/             # Plugin MVC components
│   └── dashboard-analytics/
└── .jpulse/                    # Framework metadata
    ├── app.json                # Consolidated runtime configuration
    ├── config-sources.json     # Source file tracking
    ├── plugins.json            # Plugin registry and status
    ├── framework-version.json  # Version tracking
    └── update-history.json     # Update log
```

### Key Principles:
1. **File Resolution Priority**:
   - `site/webapp/[type]/[file]` (Site override - highest priority)
   - `webapp/[type]/[file]` (Framework default - fallback)
   - Error if neither found

2. **Protected Paths** (never overwritten by framework updates):
   - `site/` directory (all site customizations)
   - `app.conf` (site configuration)
   - `.jpulse/site-*` (site metadata)

3. **Dynamic Module Resolution**:
   ```javascript
   // Try site override first, fall back to framework
   const sitePath = `./site/webapp/${modulePath}`;
   const frameworkPath = `./webapp/${modulePath}`;
   ```

## Implementation Strategy

### Phase 1: Foundation (W-013a)
- Create directory structure utilities
- Implement path resolution system
- Design configuration merging strategy (details deferred)

### Phase 2: Incremental Migration (W-013b)
- Apply to new components (W-009, W-010, W-011, W-012)
- Migrate existing components gradually
- Maintain backward compatibility

### Phase 3: Enhanced Features (W-013c)
- Foundation for plugin infrastructure (W-016)
- Theme system support (W-037)
- Advanced customization tools

### Deferred Decisions:
- **Configuration Merging**: Deep merge strategy details to be decided during implementation
- **Update Tooling**: Framework update utilities deferred to W-015 (onboarding strategy)

### Benefits:
- ✅ Clean separation of framework vs. site-specific code
- ✅ Update-safe customizations
- ✅ Foundation for plugin architecture (W-016)
- ✅ Scalable for multiple site deployments
- ✅ Backward compatibility maintained

-----------

Conversation with Grok on view strategy, e.g. buld your own or use vue:
https://grok.com/share/c2hhcmQtNA%3D%3D_5c4f68c9-f2ae-46d2-aa33-3f6975601839

