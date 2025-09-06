# jPulse Framework v0.4.9

A modern, lightweight, and extensible web application framework using the MVC (model, view, controller) pattern. jPulse is built with Node.js, Express, and MongoDB, and combines the simplicity of traditional server-side rendering with modern development practices, offering a clean separation between static and dynamic content. It is extensible, where multiple teams can work independently to build large and scalable applications targeting midsize to large organizations in the government and private sector.

**Latest Releases Highlights:**

- ✅ **CSS Prefix Convention (W-044, v0.4.9)**: Implemented clear CSS prefix convention eliminating cognitive load - `jp-*` for common framework styles, `local-*` for page-specific styles. Perfect "don't make me think" CSS organization with zero naming conflicts and immediate style location identification.
- ✅ **Global rename jPulseCommon to jPulse (W-043, v0.4.8)**: Renamed for improved developer productivity and framework extensibility
- ✅ **Enhanced Form Submission & Bug Fixes (W-042, v0.4.8)**: Fixed critical slide-down message accumulation bug and enhanced jPulse form submission system. Features include improved form handling with `bindSubmission` and `handleSubmission` functions, automatic error message clearing, comprehensive test coverage, and better developer experience with "don't make me think" API design.
- ✅ **User Management & Dashboard Pages (W-039)**: Complete user management system with admin users page, user dashboard, and enhanced profile page. Features include collapsible security sections, unified edit mode, icon-based navigation, and comprehensive test coverage for client-side utilities. Includes production-ready collapsible component with clean API design.
- ✅ **Admin Dashboard & User-Aware I18n (W-013)**: Complete admin dashboard implementation with role-based authentication, user language-aware internationalization system, and comprehensive test coverage. Features include dashboard grid layout, SVG icon system, asset organization standards, and enhanced translate() method supporting user session language preferences.
- ✅ **View Consolidation & Common Components (W-038)**: Complete separation of common/page-specific code and style with 300+ lines of duplicate CSS eliminated, 15+ reusable components added (.jp-user-*, .jp-btn-group, .jp-action-section), and mature component library established for scalable development.
- ✅ **Complete slide-down message system implementation (W-019)**: Implemented a non-blocking slide-down message system with comprehensive API renaming for clarity and enhanced user experience.
- ✅ **View Migration & API Simplification (W-036)**: Complete migration of all 5 view files to jpulse-common utilities with API response simplification and dynamic schema-aware frontend. Eliminated confusing double-wrapped responses and implemented dynamic dropdown population from backend APIs.
- ✅ **Component-Based Styling (W-025)**: Complete CSS architecture with `jp-` component library, framework/site separation preparation, and theme system foundation. Moved 290+ lines from templates to external CSS with responsive design and performance optimization.
- ✅ **Enhanced JavaScript Utilities (W-035)**: Complete `jpulse-common.js` framework with 5-phase utility system - alert management, API standardization, form handling, DOM utilities, and device detection. Eliminates 300+ lines of duplicate code across views with 40-50% faster development.
- ✅ **Improved Error Handling (W-034)**: Direct rendering of 404 error pages via `viewController` without redirects, preserving URLs and enhancing user experience
- ✅ **ESM Testing Infrastructure (W-033)**: Fixed ECMAScript Modules loading issues, implemented runtime configuration consolidation, and created shared bootstrap architecture for consistent dependency management
- ✅ **Production-Ready Logging**: Standardized logging format across all modules with consistent timestamp and context formatting
- ✅ **Test Suite Optimization**: Achieved 100% test pass rate with improved test isolation and parallel execution support
- ✅ **Configuration Consolidation**: Runtime .conf to .json conversion with timestamp-based caching for optimal performance
- ✅ **User ID Consolidation and UUID (W-032)**: Unified user identification to 'username', deprecated 'loginId'/'userId', and introduced a unique 'uuid' field for immutable user references.
- ✅ **I18n Module Restructuring (W-031)**: `i18n.js` moved to `webapp/utils/` and translation files renamed (e.g., `lang-en.conf` to `en.conf`), improving project organization and simplifying file management.
- ✅ **I18n and Logging Consistency (W-029)**: User-facing messages internationalized and controller logs standardized for clarity and consistency.
- ✅ **View Controller Caching (W-028)**: Configurable caching for template and include files to boost performance
- ✅ **I18n Structure Alignment (W-027)**: Language files restructured to match controller and view architecture
- ✅ **Improved Translation Organization**: Translation keys now organized by controller/view structure for better maintainability
- ✅ **Enhanced Template Integration**: Streamlined handlebars variable processing with restructured language files
- ✅ **MVC-Aligned Configuration**: Restructured app.conf to match model/controller/view architecture
- ✅ **Enhanced Configuration Organization**: Settings organized by component type for better maintainability
- ✅ **API-Driven Profile Management**: User profiles now load fresh data from REST API instead of session data

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (optional - framework runs without database)
- npm or yarn package manager

### Installation & Setup
```bash
# Clone the repository
git clone https://github.com/peterthoeny/jpulse-framework.git
cd jpulse-framework

# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test
```

The application will be available at `http://localhost:8080`

## ✨ Key Features

### 🚀 **Production-Ready Express Application**
Built on a solid foundation with enterprise-grade configuration management:

- **Multi-Environment Support**: Seamless development/production deployment modes
- **Advanced Configuration**: JavaScript-based `.conf` files with dynamic evaluation
- **Port Management**: Configurable ports per environment (dev: 8080, prod: 8081)
- **Database Flexibility**: MongoDB standalone or replica set configurations
- **Session Management**: Express sessions with configurable security settings
- **Middleware Stack**: CORS, body parsing, and session handling pre-configured

### 🎨 **Non-Blocking Slide-Down Message System**
Professional user feedback with smooth animations:

- **Non-Blocking Design**: Messages overlay content without shifting page layout
- **Smooth Animations**: 0.6s CSS transitions sliding from behind header
- **Dynamic Stacking**: Intelligent height-based message stacking with 5px gaps
- **Configurable Durations**: Type-specific display times (info: 3s, warning: 5s, error: 6s)
- **Responsive Design**: Adapts to all screen sizes with configurable width constraints
- **Independent Lifecycles**: Multiple messages manage their own timing without interference

### 🌐 **Advanced Internationalization System**
Complete multi-language support with natural syntax:

- **Dynamic Translation Loading**: Automatic `.conf` file parsing for translations
- **Dot Notation Access**: Natural `{{i18n.app.name}}` syntax in templates
- **Variable Content**: Support for handlebars-style `{{variable}}` substitution in translation files with full context access
- **Fallback Handling**: Graceful degradation when translations are missing
- **Multi-Language Ready**: English and German included, easy to extend

### 🧪 **Comprehensive Testing Framework**
Enterprise-grade testing with Jest and automated cleanup:

- **337 Tests**: Unit and integration tests with 100% pass rate
- **Automated Test Cleanup**: Global setup/teardown prevents conflicts
- **Test Organization**: Hierarchical structure with fixtures and helpers
- **Mock Utilities**: Comprehensive test utilities for all components
- **CI/CD Ready**: Jest configuration optimized for continuous integration
- **Coverage Reporting**: Detailed test coverage analysis

### 🔧 **Site Administration System**
Complete configuration management with RESTful APIs:

- **MongoDB Configuration Storage**: Persistent config with versioning
- **RESTful Config API**: Full CRUD operations via `/api/1/config/`
- **Email Configuration**: SMTP settings with TLS support
- **Message Broadcasting**: Site-wide message management
- **Change Tracking**: Automatic logging of configuration changes
- **Schema Validation**: Robust data validation and error handling

### 📊 **Advanced Logging Infrastructure**
Unified logging system with search capabilities:

- **Structured Logging**: Consistent format across all controllers
- **MongoDB Log Storage**: Persistent log storage with schema validation
- **Search API**: Powerful log search via `/api/1/log/search`
- **Change Tracking**: Automatic logging of document modifications
- **Error Handling**: Stack trace capture and structured error logging
- **Performance Metrics**: Request timing and performance monitoring

### 🎨 **Server-Side Template System**
Powerful template rendering with security-first design:

- **Handlebars Integration**: Custom implementation with security features
- **Block Conditionals**: `{{#if condition}}content{{else}}alternative{{/if}}` syntax
- **Template Includes**: Secure file inclusion with path traversal protection and configurable caching
- **Context Integration**: Access to app config, user data, and translations
- **Recursive Processing**: Handlebars within conditional blocks are processed
- **File Operations**: `{{file.include}}` and `{{file.timestamp}}` helpers
- **Depth Limiting**: Prevents infinite recursion in includes
- **Error Handling**: Direct rendering of 404 error pages without redirects, preserving URLs.

### 🎯 **Hybrid Content Strategy**
jPulse implements a sophisticated routing strategy that cleanly separates static and dynamic content:

- **Static Content**: Images, CSS, JS, third-party libraries served directly by nginx in production
- **Dynamic Content**: `.shtml` templates with server-side rendering and Handlebars processing
- **API Routes**: RESTful endpoints under `/api/1/` prefix
- **Smart Routing**: Automatic content type detection with fallback handling

### 🌐 **Internationalization (i18n)**
- Multi-language support with easy translation management
- Natural dot notation syntax: `{{i18n.app.name}}`
- Fallback handling for missing translations
- Support for parameterized messages

### 📱 **Responsive Design System**
- Configuration-driven responsive layout
- Automatic breakpoint management
- Mobile-first design approach
- Consistent spacing and typography

### 🔒 **User Authentication & Management**
Complete user system with secure authentication and role-based access control:

- **Auth Controller**: Centralized authentication with middleware and utility functions
- **Middleware Protection**: `requireAuthentication` and `requireRole` middleware for routes
- **Utility Functions**: `isAuthenticated` and `isAuthorized` for controller logic
- **User Registration**: Complete signup system with validation and error handling
- **Internal Authentication**: Secure login with bcrypt password hashing
- **Session Management**: Persistent MongoDB sessions with connect-mongo
- **Role-Based Access Control**: Simple role system (guest, user, admin, root)
- **User Interface Views**: Login, logout, signup, profile, and user directory pages
- **API-Driven Profile Management**: User profiles load fresh data from REST API endpoints
- **Real-time Profile Updates**: Dynamic form updates without page reloads
- **Data Version Tracking**: Profile updates increment saveCount for consistency
- **Language Preference Handling**: Centralized user language preferences in AuthController
- **User Search API**: Admin-only user search with schema-based queries
- **Password Policy**: Configurable minimum length requirements
- **Multi-language Support**: Comprehensive i18n for all authentication flows
- **Smart Error Handling**: Automatic API vs view error responses with CommonUtils.sendError
- **Security Features**: Automatic password hash exclusion, secure session handling

### 🔐 **Security Features**
- **Password Security**: bcrypt hashing with 12 salt rounds
- **Session Security**: Persistent MongoDB sessions with TTL expiration
- **Path Traversal Protection**: Template includes secured against directory traversal
- **Input Validation**: Comprehensive validation with CommonUtils
- **Role-Based Authorization**: Method-level access control
- **Error Logging**: Consistent `<type>.<function> failed:` format across all controllers
- **Performance Monitoring**: Elapsed time tracking for all search operations

### 🎨 **Modern UI Components**
- Sticky header with user authentication menu
- Responsive navigation system
- Clean, professional styling
- Favicon and branding integration

### 🛠️ **Developer Experience (NEW)**
- **CommonUtils Library**: 8 utility functions for data processing, validation, and formatting
- **Schema-Based Queries**: Dynamic MongoDB query generation from URI parameters
- **Automated Test Cleanup**: Jest global setup/teardown prevents test conflicts
- **Comprehensive Testing**: 337 tests with 100% pass rate

## 📁 Project Structure

```
jpulse-framework/
├── webapp/                # Main application directory
│   ├── app.js             # Express application entry point
│   ├── app.conf           # Application configuration
│   ├── controller/        # Business logic controllers
│   │   ├── config.js      # Site configuration
│   │   ├── log.js         # Logging functionality
│   │   ├── user.js        # User management
│   │   └── view.js        # Template rendering engine
│   ├── model/             # Data models
│   │   ├── config.js      # Site configuration
│   │   ├── log.js         # Logging of create, udpate, delete actions
│   │   └── user.js        # User management
│   ├── utils/             # Common utilities (NEW)
│   │   ├── common.js      # Schema-based queries, validation, formatting
│   │   └── i18n.js        # Translation engine
│   ├── static/            # Static assets (CSS, JS, images)
│   │   ├── robots.txt     # Search engine directives
│   │   └── favicon.ico    # Site icon
│   ├── translations/      # Internationalization files
│   │   ├── en.conf        # English translations
│   │   └── de.conf        # German translations
│   ├── view/              # Template files
│   │   ├── jpulse-header.tmpl  # Shared header template
│   │   ├── jpulse-footer.tmpl  # Shared footer template
│   │   ├── auth/          # User authentication pages
│   │   ├── home/          # Home page
│   │   ├── error/         # Error page
│   │   └── user/          # User pages
│   └── tests/             # Comprehensive test suite
│       ├── setup/         # Test environment setup (NEW)
│       │   ├── global-setup.js    # Pre-test cleanup
│       │   └── global-teardown.js # Post-test cleanup
│       ├── unit/          # Unit tests
│       │   └── utils/     # CommonUtils tests (NEW)
│       └── integration/   # Integration tests
└── package.json           # Node.js dependencies and scripts
```

## 🔧 Configuration

### Application Configuration (`webapp/app.conf`)
jPulse uses JavaScript-based configuration files for maximum flexibility:

```javascript
{
    app: {
        version:        '0.3.1',
        release:        '2025-08-29'
    },
    deployment: {
        mode:           'dev',      // 'dev' or 'prod'
        dev: {
            name:       'development',
            db:         'dev',
            port:       8080
        },
        prod: {
            name:       'production',
            db:         'prod',
            port:       8081
        }
    },
    database: {
        mode:           'standalone',  // 'standalone' or 'replicaSet'
        standalone: {
            url:        'mongodb://localhost:27017/%DB%',
            options: {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS:        45000,
                connectTimeoutMS:       20000,
                maxPoolSize:            10,
                minPoolSize:            1,
                maxIdleTimeMS:          30000
            }
        }
    },
    middleware: {
        cors: {
            origin:         '*',
            methods:        'GET,HEAD,PUT,PATCH,POST,DELETE'
        },
        bodyParser: {
            urlencoded: { extended: true, limit: '10mb' },
            json: { limit: '10mb' }
        }
    },
    session: {
        secret:             'fixme',
        resave:             false,
        saveUninitialized:  false,
        cookie: { secure: false, maxAge: 3600000 }
    },
    i18n: {
        default:            'en'
    },
    model: {
        user: {
            passwordPolicy: {
                minLength:      8
            }
        }
    },
    controller: {
        auth: {
            mode:               'internal',  // 'internal', 'ldap', 'oauth2'
            internal: {},
            ldap: {
                url:            'ldap://localhost:389',
                baseDN:         'dc=example,dc=com'
            },
            oauth2: {
                clientID:       'fixme',
                clientSecret:   'fixme'
            }
        },
        log: {
            maxMsgLength:       256
        },
        view: {
            defaultTemplate:    'index.shtml',
            maxIncludeDepth:    10
        }
    },
    view: {
        maxWidth:               1200,   // Maximum content width (px)
        minMarginLeftRight:     20      // Minimum side margins (px)
    }
}
```

### Configuration Features
- **MVC-Aligned Structure**: Configuration organized by component type (model, controller, view)
- **Multi-Environment**: Separate dev/prod configurations
- **Database Flexibility**: MongoDB standalone or replica set support
- **Authentication Options**: Internal, LDAP, or OAuth2 authentication modes (controller.auth.mode)
- **Security Settings**: Configurable session management and CORS policies
- **Template Control**: Include depth and default template settings (controller.view)
- **Responsive Layout**: Configurable content width and margins (view.maxWidth, view.minMarginLeftRight)
- **User Management**: Password policies and validation rules (model.user.passwordPolicy)

### Environment Variables
- `NODE_ENV`: Set to `production` for production deployment
- `PORT`: Server port (default: 8080)
- `MONGODB_URI`: MongoDB connection string (optional)

## 🔌 API Overview

jPulse provides a comprehensive RESTful API under the `/api/1/` prefix with the following capabilities:

### Core API Features
- **🔧 Configuration Management**: Complete CRUD operations for site configuration
- **📊 Advanced Logging**: Powerful log search with flexible query parameters and elapsed time tracking
- **👤 User Management**: Complete authentication, profile management, and user search
- **🎨 Template Rendering**: Server-side handlebars processing with security features
- **🏥 Health Monitoring**: System status and health check endpoints
- **🔐 Session Authentication**: Secure user authentication with role-based authorization
- **📝 Structured Responses**: Consistent JSON response format with error handling and performance metrics
- **🔗 Error Reporting (W-026)**: Direct rendering of 404 error pages via `viewController` without redirects, preserving URLs.

### Quick API Examples
```bash
# User Authentication & Management
POST /api/1/user/signup
POST /api/1/auth/login
POST /api/1/auth/logout
GET /api/1/user/profile
PUT /api/1/user/profile
PUT /api/1/user/password
GET /api/1/user/search?status=active&roles=admin

# Configuration Management
GET /api/1/config/global
PUT /api/1/config/global

# Log Search with Filters (includes elapsed time)
GET /api/1/log/search?level=error&message=database*

# Template Rendering
GET /home/index.shtml
GET /admin/config.shtml

# Health Check
GET /api/1/health
```

### 📚 Complete API Documentation
For comprehensive API documentation including:
- Detailed endpoint specifications
- Request/response examples
- Authentication requirements
- Error handling
- Template variables and helpers
- Query parameter options

**👉 See [API.md](API.md) for complete API reference documentation.**

## 🚀 Deployment

### Development Mode
```bash
npm start
```
Application runs with hot-reloading and detailed logging.

### Production Deployment with nginx

#### nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/jpulse-framework/webapp/static;

    # API routes → proxy to app
    location /api/1/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Protected static directory → direct serve
    location /common/ {
        try_files $uri =404;
    }

    location = / {
        return 301 /home/;
    }

    # Dynamic templates with {{handlebars}} → proxy to app
    location ~* \.(shtml|tmpl)$ {
        proxy_pass http://localhost:8080;
    }

    # Directory /home/ → will render as /home/index.shtml
    location ~ ^/[\w\-]+/$ {
        proxy_pass http://localhost:8080;
    }

    # Dynamic files with {{handlebars}}
    location ~ ^/jpulse-.*\.(js|css|tmpl)$ {
        proxy_pass http://localhost:8080;
    }

    # Static files → direct serve
    location / {
        try_files $uri @app;
    }

    location @app {
        proxy_pass http://localhost:8080;
    }
}
```

#### Process Management
```bash
# Using PM2
npm install -g pm2
pm2 start webapp/app.js --name jpulse-app
pm2 startup
pm2 save
```

## 🎨 Templating System

### Advanced Handlebars Integration
jPulse features a custom Handlebars implementation with enterprise security and powerful helpers:

#### Template Variables and Context
```html
<!-- Application Information -->
<span>{{app.version}}</span>        <!-- 0.2.1 -->
<span>{{app.release}}</span>        <!-- 2025-08-25 -->

<!-- Internationalization -->
<h1>{{i18n.app.name}}</h1>          <!-- jPulse Framework -->
<p>{{i18n.header.signin}}</p>       <!-- Sign In -->
<p>{{i18n.welcome.message}}</p>     <!-- Welcome to jPulse -->

<!-- Configuration Access -->
<div style="max-width: {{appConfig.window.maxWidth}}px;">
<div class="margin-{{appConfig.window.minMarginLeftRight}}">
<input maxlength="{{appConfig.log.maxMsgLength}}">

<!-- User Context -->
<span>{{user.id}}</span>            <!-- user123 -->
<span>{{user.firstName}}</span>     <!-- John -->
<span>{{user.lastName}}</span>      <!-- Doe -->
<span>{{user.email}}</span>         <!-- john@example.com -->

<!-- Site Configuration -->
<a href="mailto:{{config.email.adminEmail}}">Admin</a>
<div>{{config.messages.broadcast}}</div>

<!-- URL Information -->
<span>{{url.domain}}</span>         <!-- https://example.com:8080 -->
<span>{{url.hostname}}</span>       <!-- example.com -->
<span>{{url.port}}</span>           <!-- 8080 -->
<span>{{url.pathname}}</span>       <!-- /home/index.shtml -->
<span>{{url.param.foo}}</span>      <!-- bar (from ?foo=bar) -->
```

#### Template Helpers and Functions
```html
<!-- Secure File Includes -->
{{file.include "jpulse-header.tmpl"}}
{{file.include "components/navigation.tmpl"}}
{{file.include "jpulse-footer.tmpl"}}

<!-- File Timestamps -->
<span>Last modified: {{file.timestamp "jpulse-header.tmpl"}}</span>

<!-- Block Conditional Rendering -->
{{#if user.authenticated}}
  <p>Welcome back, {{user.firstName}}!</p>
  <div class="user-panel">{{user.email}}</div>
{{else}}
  <p>Please sign in to continue</p>
  <div class="guest-panel">Guest user</div>
{{/if}}

<!-- Simple Block Conditionals -->
{{#if config.messages.broadcast}}
  <div class="broadcast">{{config.messages.broadcast}}</div>
{{/if}}
```

#### Security Features
- **Path Traversal Protection**: Prevents `../../../etc/passwd` attacks
- **Include Depth Limiting**: Maximum 10 levels prevents infinite recursion
- **View Root Jail**: All includes resolved within `webapp/view/` directory
- **Input Sanitization**: All template variables properly escaped

## 🌍 Internationalization

### Adding New Languages
1. Create translation file: `webapp/translations/[code].conf` (e.g., `en.conf`)
2. Add translations in key-value format:
   ```conf
   app: {
       name: "jPulse Framework",
       title: "jPulse Framework WebApp"
   },
   header: {
       signin: "Sign In",
       signup: "Sign Up"
   }
   ```
3. The `webapp/utils/i18n.js` engine will dynamically load the new language.

### Using Translations
```html
{{i18n.app.name}}
{{i18n.header.signin}}
```

## 🧪 Testing

The framework includes a comprehensive test suite with **337 tests** and **automated cleanup**:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPattern="i18n"
npm test -- --testPathPattern="responsive"
npm test -- --testPathPattern="template"
```

### Test Coverage

- ✅ **Integration Tests**: Application startup, routing
- ✅ **Unit Tests**: Controllers, models, utilities
- ✅ **CommonUtils Tests**: 51 tests for schema queries, validation, formatting
- ✅ **Security Tests**: Path traversal, input validation
- ✅ **i18n Tests**: Translation lookup, dot notation
- ✅ **Responsive Tests**: Layout calculations, breakpoints
- ✅ **Template Tests**: Include system, {{#if}} block processing
- ✅ **Automated Cleanup**: Jest global setup/teardown prevents test conflicts

## 📊 Performance

### Benchmarks

- **Template Rendering**: ~5-10ms per page (with caching enabled)
- **Static File Serving**: Direct nginx (production)
- **Memory Usage**: ~50MB baseline
- **Concurrent Users**: 1000+ (with proper nginx setup)
- **Test Suite**: 337 tests in ~3.5s with automated cleanup

### Optimization Features

- Static/dynamic content separation
- Configurable template and include file caching
- Gzip compression ready
- CDN-friendly asset structure

## 🔍 Monitoring & Logging

### Application Logs
```bash
# View logs in development
tail -f webapp/logs/app.log

# Production logging with PM2
pm2 logs jpulse-app
```

### Health Check Endpoint
```bash
curl http://localhost:8080/api/1/health
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure all tests pass: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📝 License

This project is licensed under the GPL v3 License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **API Reference**: [API.md](API.md) - Complete API documentation
- **Technical Details**: [developers.md](developers.md) - Implementation details and architecture
- **Version History**: [changes.md](changes.md) - Changelog and work item tracking
- **Issues**: [GitHub Issues](https://github.com/peterthoeny/jpulse-framework/issues)
- **Discussions**: [GitHub Discussions](https://github.com/peterthoeny/jpulse-framework/discussions)

## 🎯 Key Achievements

### ✅ **Hybrid Content Strategy**
- Implemented sophisticated routing that cleanly separates static and dynamic content
- nginx-friendly configuration for optimal production performance
- Automatic content type detection with intelligent fallbacks

### ✅ **CommonUtils Framework**
- **Schema-Based Query System**: Dynamic MongoDB query generation from URI parameters
- **8 Utility Functions**: Data processing, validation, email checking, string sanitization
- **Centralized Architecture**: Reusable functions across models and controllers
- **51 Comprehensive Tests**: Edge cases, error handling, real-world scenarios
- **Named Exports**: Convenient import syntax for individual functions

### ✅ **Enhanced Testing Infrastructure**
- **337 Tests** with 100% pass rate
- **Automated Test Cleanup**: Jest global setup/teardown prevents conflicts
- **Comprehensive Coverage**: CommonUtils, security, i18n, responsive design, {{#if}} blocks
- **Performance Optimized**: ~3.5s test execution time

### ✅ **Modern Template System**
- Secure file inclusion with path traversal protection
- {{#if}} block conditionals with {{else}} support
- Handlebars integration with custom helpers
- Recursive content processing within conditional blocks
- Responsive layout system with configuration-driven breakpoints

### ✅ **Enhanced i18n System**
- Natural dot notation syntax for translations
- Backward compatibility with function notation
- Comprehensive language support infrastructure

### ✅ **Professional UI/UX**
- Sticky header with authentication menu
- Responsive design with mobile-first approach
- Clean, modern styling with proper branding

---

**jPulse Framework** - Building modern web applications with simplicity and power. 🚀