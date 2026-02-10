# jPulse Docs / Dev / Requirements Document v1.6.14

Strategic requirements and specifications for the jPulse Framework, targeting enterprise and government organizations with focus on security, scalability, and maintainability.

-------------------------------------------------------------------------
## Strategic Objectives

### Primary Goals
- **Enterprise-Grade Framework**: Generic web application framework using MongoDB, Node.js, Express for midsize to large organizations
- **Scalable Architecture**: Base for creating scalable web applications with horizontal scaling capabilities
- **Containerized Deployment**: Docker-ready with separate containers for MongoDB and application layers
- **Clean MVC Pattern**: Model-View-Controller architecture with clear separation of concerns
- **Client-Side Heavy Views**: Primary view logic in browser JavaScript with API calls, minimal server-side Handlebars
- **Schema-Enforced Models**: NoSQL database with enforced data schemas and validation
- **RESTful Controllers**: API-first design interfacing between models and views
- **Source Available**: BSL 1.1 license with commercial licensing for government and enterprise adoption

### Target Audience
- **Government Agencies**: Federal, state, and local government applications
- **Healthcare Systems**: HIPAA-compliant patient portals and internal tools
- **Educational Institutions**: Student information systems and administrative tools
- **Financial Services**: Secure internal applications and customer portals
- **Professional Services**: Client portals and internal management systems

### Core Principles
- **"Don't Make Me Think"**: Zero-configuration auto-discovery and intuitive development patterns
- **Security First**: Built-in security best practices, path traversal protection, input validation
- **Update Safety**: Site Override Architecture enables framework updates without losing customizations
- **Developer Experience**: Natural syntax, comprehensive testing, clear error messages
- **Enterprise Compliance**: Security auditing, role-based access, comprehensive logging

-------------------------------------------------------------------------
## Functional Requirements

### Core Framework Features
- **Modular Configuration**: JavaScript-based `.conf` files with dynamic evaluation and environment-specific overrides
- **RESTful API System**: All `/api/1/*` endpoints with standardized JSON responses and error handling
- **Comprehensive Testing**: Unit and integration tests with automated cleanup and isolation
- **Zero-Configuration Bootstrap**: Initial startup wizard for sysadmin account creation and role assignment
- **Client-Side Framework**: Complete `jPulse` utility library with API calls, form handling, and UI components

### Authentication & Authorization
- **Multi-Auth Support**: Internal (default), LDAP, OAuth2 authentication methods
- **Role-Based Access**: `guest`, `user`, `admin`, `root` roles with method-level authorization
- **Session Management**: MongoDB-backed persistent sessions with configurable TTL
- **Security Features**: bcrypt password hashing, CSRF protection, input validation, audit logging

### Site Override Architecture
- **Update-Safe Customizations**: `site/webapp/` directory for all site-specific code
- **Auto-Discovery**: Controllers, views, and assets automatically discovered and registered
- **File Resolution Priority**: Site overrides take precedence over framework defaults
- **Configuration Merging**: Framework and site configurations merged with site priority
- **Zero Configuration**: No manual route registration or configuration required

### Out-of-Box Components

#### Models & Controllers
- **User Management**: Complete CRUD operations, profile management, password changes
- **Configuration System**: Site-wide settings with admin interface and validation
- **Logging System**: Comprehensive audit trail with search and filtering capabilities
- **Authentication Controller**: Login/logout, session management, role verification

#### Views & UI Components
- **Standard Pages**: Home, about, login/logout (adaptive to auth method)
- **Admin Dashboard**: Role-based administrative interface with user management
- **Component Library**: Complete `jp-*` CSS framework with responsive design
- **Client-Side Utilities**: Form handling, API calls, slide-down messages, collapsible sections

### Internationalization & Theming
- **User Preferences**: Language (en default, de, extensible) and theme (light default, dark)
- **Dynamic Translation**: User session-aware i18n with handlebars variable support
- **Template Integration**: Seamless translation access in all views and components
- **Extensible Language System**: Easy addition of new languages via `.conf` files

### Scalability & Performance
- **Horizontal Scaling**: Multiple Node.js instances via PM2 process management
- **Multi-Server Support**: Load balancing with nginx reverse proxy configuration
- **Database Clustering**: MongoDB replica sets and sharding support
- **Caching Strategy**: Template and include file caching with configurable TTL
- **Session Clustering**: MongoDB session store eliminates server affinity requirements

### Configuration & Data Management
- **Site Configuration**: MongoDB storage with admin interface for email, messages, features
- **Persistent Sessions**: MongoDB-backed sessions with automatic cleanup
- **Audit Logging**: All configuration changes and user actions logged with context
- **Data Validation**: Schema-based validation for all models with comprehensive error handling

### Development & Deployment
- **Docker Support**: Multi-container deployment with MongoDB and application separation
- **Environment Management**: Development, staging, production configurations
- **Asset Pipeline**: Organized static file serving with nginx integration
- **Testing Framework**: Jest-based testing with global setup/teardown and parallel execution

-------------------------------------------------------------------------
## Architecture Requirements

### MVC Pattern Implementation
- **Models**: Data access layer with MongoDB schema enforcement and validation
- **Views**: Client-side heavy architecture (80% JavaScript + API calls, 20% server-side Handlebars)
- **Controllers**: RESTful API endpoints with automatic discovery and registration
- **Utils**: Shared utilities and services across the application

### Site Override Architecture
- **Framework Core**: `webapp/` directory contains updatable framework code
- **Site Customizations**: `site/webapp/` directory for update-safe site-specific code
- **File Resolution**: Site files take priority over framework defaults
- **Auto-Discovery**: Controllers, views, and assets automatically discovered

### Security Requirements
- **Path Traversal Protection**: All file operations secured against `../` attacks
- **Input Validation**: Schema-based validation for all user inputs
- **Authentication**: Session-based with MongoDB persistence and role-based access
- **CSRF Protection**: Built-in protection for all form submissions
- **Audit Logging**: Comprehensive logging of all user actions and system changes

### Performance Requirements
- **Template Caching**: Configurable caching for frequently accessed templates
- **Session Clustering**: MongoDB session store for horizontal scaling
- **Asset Optimization**: nginx-friendly static file serving
- **Database Optimization**: Connection pooling and query optimization

-------------------------------------------------------------------------
## Directory Structure

### Framework Core (`webapp/`)
```
webapp/
├── app.conf              # Application configuration
├── app.js                # Main Express application
├── route.js              # URI routing and middleware
├── database.js           # MongoDB connection and utilities
├── model/                # Data models with schema enforcement
│   ├── config.js         # Site configuration schema
│   ├── log.js            # Audit logging schema
│   └── user.js           # User management schema
├── controller/           # RESTful API controllers
│   ├── auth.js           # Authentication and authorization
│   ├── config.js         # Configuration management (/api/1/config/*)
│   ├── log.js            # Logging and audit trail (/api/1/log/*)
│   ├── user.js           # User management (/api/1/user/*)
│   └── view.js           # Template rendering with handlebars
├── view/                 # Server-side templates and client-side assets
│   ├── jpulse-header.tmpl # Common header template
│   ├── jpulse-footer.tmpl # Common footer template
│   ├── home/
│   │   └── index.shtml   # Home page template
│   ├── auth/
│   │   ├── login.shtml   # Login page
│   │   └── logout.shtml  # Logout page
│   ├── admin/
│   │   ├── index.shtml   # Admin dashboard
│   │   ├── users.shtml   # User management
│   │   └── config.shtml  # Site configuration
│   └── error/
│       └── index.shtml   # Error page template
├── utils/                # Shared utilities and services
│   ├── common.js         # Common utility functions
│   └── i18n.js           # Internationalization system
├── translations/         # Multi-language support
│   ├── en.conf           # English translations
│   └── de.conf           # German translations
└── static/               # Static assets (served by nginx)
    ├── assets/
    │   ├── jpulse/       # Framework assets
    │   │   ├── jpulse-common.css
    │   │   └── jpulse-common.js
    │   └── admin/        # Admin-specific assets
    ├── robots.txt
    ├── favicon.ico
    └── images/
```

### Site Customizations (`site/webapp/`)
```
site/webapp/              # Update-safe site customizations
├── app.conf              # Site-specific configuration overrides
├── controller/           # Site-specific controllers (auto-discovered)
├── view/                 # Site-specific view overrides
├── static/               # Site-specific static assets
└── translations/         # Site-specific translation overrides
```

### Documentation Structure (`docs/`)
```
docs/
├── README.md             # User-facing documentation overview
├── installation.md       # Installation and setup guide
├── getting-started.md    # Quick start tutorial
├── site-customization.md # Site override system guide
├── app-examples.md       # Code examples and use cases
├── deployment.md         # Production deployment guide
├── api-reference.md      # REST API documentation
├── CHANGELOG.md          # Version history
└── dev/                  # Developer documentation
    ├── README.md         # Developer overview
    ├── architecture.md   # System architecture details
    ├── requirements.md   # This document
    ├── roadmap.md        # Development roadmap
    └── work-items.md     # Work item tracking
```

-------------------------------------------------------------------------
## Technical Specifications

### Technology Stack
- **Runtime**: Node.js 18+ with ES modules support
- **Web Framework**: Express.js 4.x with middleware architecture
- **Database**: MongoDB 4.4+ (required for enterprise features)
- **Session Store**: MongoDB with TTL expiration
- **Template Engine**: Custom Handlebars implementation with security features
- **Testing**: Jest with automated cleanup and parallel execution
- **Process Management**: PM2 for production clustering
- **Reverse Proxy**: nginx for static file serving and load balancing

### Browser Compatibility
- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **JavaScript**: ES6+ features with graceful degradation
- **CSS**: CSS Grid and Flexbox with responsive design
- **Progressive Enhancement**: Core functionality works without JavaScript

### Security Standards
- **Password Security**: bcrypt with 12 salt rounds
- **Session Security**: Secure cookies, HttpOnly flags, configurable TTL
- **Input Validation**: Schema-based validation with sanitization
- **Path Security**: Jail all file operations within designated directories
- **Audit Trail**: Comprehensive logging of all security-relevant actions

### Performance Targets
- **Page Load**: < 2 seconds for initial page load
- **API Response**: < 500ms for standard CRUD operations
- **Database Queries**: < 100ms for indexed queries
- **Template Rendering**: < 50ms for cached templates
- **Concurrent Users**: 1000+ concurrent sessions per server instance
