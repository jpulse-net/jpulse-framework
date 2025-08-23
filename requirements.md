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
- model uses mongoose library
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

- **W-004**: create site admin model & controller
  - create webapp/model/config.js -- model
    - use mongoose to enforce schema
  - create webapp/controller/config.js -- controller
  - prepare for hierarchy of config docs, for now just one doc with _id == 'global'
  - schema:
    {
        email: {
            adminEmail: String, // ''
            adminName:  String, // ''
            smtpServer: String, // 'localhost'
            smtpUser:   String, // ''
            smtpPass:   String, // ''
            useTls:     Boolean // false
        }
    }
  - create tests, and test

- **W-005**: create site admin view
  - create webapp/view/admin/index.shtml -- admin home
  - create webapp/view/admin/config.shtml -- admin home

- **W-006**: create server sice include function
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
