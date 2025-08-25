Requirements Doc of jPulse Framework
====================================

# Objectives

- generic web application framework using MongoDB, Node.js, Express
- used as a base to create scalable web apps
- to be used in docker, one image for MongoDB, one for the app
- use MVC (model, view, controller) paradigm
- the view is in browser JavaScript, pages with variables expanded on server
- the model enforces schema of data in nosql database
- the controller is the API that interfaces between model and view
- license: GPL v3

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

# Directories

- webapp/
  - app.conf              # app config
  - app.js                # main app
  - route.js              # URI routing
  - database.js           # database interface
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
  - translations/           # translations - multiple languages
    - i18n.js               # handles internationalization
    - lang-en.conf          # English translation
    - lang-de.conf          # Genram translation
  - static/               # static content served by nginx
    - robots.txt            # robots file
    - favicon.ico           # app favicon
    - images/               # app images and icons
    - utils/                # 3rd party packages

# To-Do Work Items

## **W-001**: create hello world app
- create logic in webapp/app.js
- use appConfig.deployment[mode].port in webapp/app.conf
- create package.json, package-lock.json

## **W-002**: create internationalization framework
- all user facing text can be translated
- translations: one file per language

## **W-003**: create test framework
- create webapp/tests/
- create test hierarchy using subdirectories
- implement first tests for translations/i18n.js

## **W-004**: create site admin config model & controller
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
- rename git repo to /peterthoeny/jpulse-framework
- rename any text references to project name

## **W-008**: strategy for view content and static content; HTML header & footer strategy
- goal: clean separation using routing precedence
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
- create a common utilities infrastructure
- add schemaBasedQuery() from logs so that it can be used by all controllers (see log.schemaBasedQuery)

## **W-010**: create user model, controller
- create webapp/model/user.js
- create webapp/controller/user.js

## **W-011**: create user model, view, controller
- create webapp/view/user/profile.shtml
  - two modes: view and edit
- create webapp/view/user/index.shtml
  - search users, result depends on logged in user role (admin, ...)

## **W-012**: create site admin view
- create webapp/view/admin/index.shtml -- admin home
- create webapp/view/admin/config.shtml -- edit config

## **W-013**: strategy for seamless update of custom jPulse deployments
- jPulse will be the base framework for multiple web apps
- define a clean structure of two sets:
  - jPulse framework directories and files
  - site specific directories and files

## **W-014**: clean onboarding strategy
- define an clean out of box experience when deploying a jPulse based webserver for the first time
- sensible defaults
- handholding for:
  - dev and prod deployments
  - nginx setup
  - single app server, or multiple app servers with load balancer setup
  - pm2 setup with single jPulse instance (fork), or multiple instances (cluster)
  - mongddb deployment with standalone, or replicaset config
  - mongodb setup with sysdba admin, dev data user, prod data user

## **W-015**: docker strategy
- new jpulse-docker project?

## **W-016**: create plugin infrastructure
- strategy: drop in specific directory, with auto discovery
- plugins for:
  - themes
  - additional models, controllers, views

## **W-017**: create themes
- initially a dark and light theme, light is default
- user can set preferred theme
- way to define new themes
  - drop in a directory, with auto discovery

## **W-0**: create caching infrastrucure
- redis to cache config, what else?
- should work in multi node instances, and multi app server instances

## **W-0**: i18n with auto-discovery and app update
- when a new language file is added to webapp/translations, the app sould pick it up dynamically, or by an admin requesting a web-based resources reload
- when a language file has been updated, the app should pick up the changes dynamically, or by an admin requesting a web-based resources reload

## **W-0**: nested config


## **W-0**: nested handlebars


# **W-013**: Strategy for Seamless Update of Custom jPulse Deployments

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
│   ├── app.conf               # Site configuration
│   └── site.json              # Site metadata
└── .jpulse/                    # Framework metadata
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
- Theme system support (W-017)
- Advanced customization tools

### Deferred Decisions:
- **Configuration Merging**: Deep merge strategy details to be decided during implementation
- **Update Tooling**: Framework update utilities deferred to W-014 (onboarding strategy)

### Benefits:
- ✅ Clean separation of framework vs. site-specific code
- ✅ Update-safe customizations
- ✅ Foundation for plugin architecture (W-016)
- ✅ Scalable for multiple site deployments
- ✅ Backward compatibility maintained

