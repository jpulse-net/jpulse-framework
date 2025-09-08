# jPulse Framework / Docs / Dev / Requirements Document

-------------------------------------------------------------------------
## Objectives

- generic web application framework using MongoDB, Node.js, Express
- used as a base to create scalable web apps
- to be used in docker, one image for MongoDB, one for the app
- use MVC (model, view, controller) paradigm
- the view is in browser JavaScript, pages with variables expanded on server
- the model enforces schema of data in nosql database
- the controller is the API that interfaces between model and view
- license: GPL v3

-------------------------------------------------------------------------
## Requirements

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
## Directory Structure

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
