Requirements Doc of Bubble Framework
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
  - a way to allow bubble-framwork updates without affecting customization
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
    - user.js               # schema for users collection
  - controller/           # controller -- app API
    - bubble.js             # loads view files
    - config.js             # handles /api/1/config/...
    - user.js               # handles /api/1/user/...
    - login.js              # handles /api/1/login/...
  - view/                 # view -- browser files served by app
    - bubble-header.tmpl    # common header
    - bubble-footer.tmpl    # common footer
    - bubble.js             # common functions
    - home/
      - index.shtml
    - login/
      - index.shtml
      - logout.shtml
    - error/
      - index.shtml         # handles error messages with msg URL parameter
  - static/               # static content served by nginx
    - robots.txt            # robots file
    - favicon.ico           # app favicon
    - images/               # app images and icons
    - utils/                # 3rd party packages

# To-Do Work Items

- **W-001**: create hello world app
  - create logic in webapp/app.js
  - use appConfig.deployment[mode].port in webapp/app.conf
  - create package.json, package-lock.json

- **W-002**: create internationalization framework
  - all user facing text can be translated
  - translations: one file per language

- **W-003**: create test framework
  - create webapp/tests/
  - create test hierarchy using subdirectories
  - implement first tests for translations/i18n.js

- **W-004**: create site admin config model & controller
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

- **W-005**: create log infrastructure
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


- **W-006**: create site admin view
  - create webapp/view/admin/index.shtml -- admin home
  - create webapp/view/admin/config.shtml -- edit config

- **W-007**: create server sice include function
  - create webapp/controller/bubble.js
    - function load(req, res) loads a view file and expands {{handlebars}}:
      - {{app.version}}
      - {{app.release}}
      - {{file.include "./some.tmpl"}}
        - object: { file: { include: function("./some.tmpl") {} } }
      - {{file.timestamp "./some.tmpl"}}
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
      - {{url.param "foo"}} // 'bar'
      - {{i18n "" }}


# Roadmap (Future Enhancements)

- I18N
- nested config
