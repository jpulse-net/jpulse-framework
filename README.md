# jPulse Framework v0.2.1

A modern, lightweight web application framework built with Node.js, Express, and MongoDB. jPulse combines the simplicity of traditional server-side rendering with modern development practices, offering a clean separation between static and dynamic content.

**Latest Release Highlights (v0.2.1):**
- ✅ **CommonUtils Framework (W-009)**: Centralized utility functions with schema-based query system
- ✅ **Automated Test Cleanup**: Comprehensive test environment management
- ✅ **Enhanced Development Tools**: Improved version management and build processes

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

### 🎯 **Hybrid Content Strategy (W-008)**
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

### 🔒 **Security Features**
- Path traversal protection for template includes
- Secure file serving with proper MIME types
- Input validation and sanitization with CommonUtils
- CSRF protection ready
- Automated test cleanup prevents security vulnerabilities

### 🎨 **Modern UI Components**
- Sticky header with user authentication menu
- Responsive navigation system
- Clean, professional styling
- Favicon and branding integration

### 🛠️ **Developer Experience (NEW)**
- **CommonUtils Library**: 8 utility functions for data processing, validation, and formatting
- **Schema-Based Queries**: Dynamic MongoDB query generation from URI parameters
- **Automated Test Cleanup**: Jest global setup/teardown prevents test conflicts
- **Comprehensive Testing**: 229+ tests with 100% pass rate

## 📁 Project Structure

```
jpulse-framework/
├── webapp/                 # Main application directory
│   ├── app.js             # Express application entry point
│   ├── app.conf           # Application configuration
│   ├── controller/        # Business logic controllers
│   │   ├── config.js      # Configuration management
│   │   ├── log.js         # Logging functionality
│   │   ├── user.js        # User management
│   │   └── view.js        # Template rendering engine
│   ├── model/             # Data models
│   ├── utils/             # Common utilities (NEW)
│   │   └── common.js      # Schema-based queries, validation, formatting
│   ├── static/            # Static assets (CSS, JS, images)
│   │   ├── robots.txt     # Search engine directives
│   │   └── favicon.ico    # Site icon
│   ├── translations/      # Internationalization files
│   │   ├── i18n.js        # Translation engine
│   │   ├── lang-en.conf   # English translations
│   │   └── lang-de.conf   # German translations
│   ├── view/              # Template files
│   │   ├── jpulse-header.tmpl  # Shared header template
│   │   ├── jpulse-footer.tmpl  # Shared footer template
│   │   ├── home/          # Home page templates
│   │   └── error/         # Error page templates
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
```conf
app: {
    version:        0.1.5,
    release:        "2025-08-24"
},
window: {
    maxWidth:           1200,    # Maximum content width (px)
    minMarginLeftRight: 20       # Minimum side margins (px)
},
view: {
    defaultTemplate:    "index.shtml",
    maxIncludeDepth:    10
}
```

### Environment Variables
- `NODE_ENV`: Set to `production` for production deployment
- `PORT`: Server port (default: 8080)
- `MONGODB_URI`: MongoDB connection string (optional)

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

    # Dynamic templates → proxy to app
    location ~* \.(shtml|tmpl)$ {
        proxy_pass http://localhost:8080;
    }

    location ~ ^/jpulse-.*\.(js|css)$ {
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

### Handlebars Integration
jPulse uses a custom Handlebars implementation with powerful helpers:

```html
<!-- Template includes -->
{{file.include "jpulse-header.tmpl"}}

<!-- Internationalization -->
<h1>{{i18n.app.name}}</h1>
<p>{{i18n.welcome.message}}</p>

<!-- Configuration access -->
<div style="max-width: {{appConfig.window.maxWidth}}px;">

<!-- Conditional content -->
{{if user.authenticated "Welcome back!" "Please sign in"}}

<!-- User context -->
<span>Version {{app.version}}</span>
```

### Template Security
- Path traversal protection prevents `../../../etc/passwd` attacks
- Include depth limits prevent infinite recursion
- Secure file resolution within `webapp/view/` directory

## 🌍 Internationalization

### Adding New Languages
1. Create translation file: `webapp/translations/lang-[code].conf`
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
3. Update `webapp/translations/i18n.js` to load the new language

### Using Translations
```html
<!-- Dot notation (recommended) -->
{{i18n.app.name}}
{{i18n.header.signin}}

<!-- Function notation (legacy) -->
{{i18n "app.name"}}
{{i18n "header.signin"}}
```

## 🧪 Testing

The framework includes a comprehensive test suite with **229+ tests** and **automated cleanup**:

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
- ✅ **CommonUtils Tests**: 51 tests for schema queries, validation, formatting (NEW)
- ✅ **Security Tests**: Path traversal, input validation
- ✅ **i18n Tests**: Translation lookup, dot notation
- ✅ **Responsive Tests**: Layout calculations, breakpoints
- ✅ **Template Tests**: Include system, Handlebars processing
- ✅ **Automated Cleanup**: Jest global setup/teardown prevents test conflicts (NEW)

## 📊 Performance

### Benchmarks
- **Template Rendering**: ~15-20ms per page
- **Static File Serving**: Direct nginx (production)
- **Memory Usage**: ~50MB baseline
- **Concurrent Users**: 1000+ (with proper nginx setup)
- **Test Suite**: 229 tests in ~2.5s with automated cleanup

### Optimization Features
- Static/dynamic content separation
- Template include caching
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

- **Documentation**: See [developers.md](developers.md) for technical details
- **Issues**: [GitHub Issues](https://github.com/peterthoeny/jpulse-framework/issues)
- **Discussions**: [GitHub Discussions](https://github.com/peterthoeny/jpulse-framework/discussions)

## 🎯 Key Achievements

### ✅ **W-008: Hybrid Content Strategy**
- Implemented sophisticated routing that cleanly separates static and dynamic content
- nginx-friendly configuration for optimal production performance
- Automatic content type detection with intelligent fallbacks

### ✅ **W-009: CommonUtils Framework (NEW)**
- **Schema-Based Query System**: Dynamic MongoDB query generation from URI parameters
- **8 Utility Functions**: Data processing, validation, email checking, string sanitization
- **Centralized Architecture**: Reusable functions across models and controllers
- **51 Comprehensive Tests**: Edge cases, error handling, real-world scenarios
- **Named Exports**: Convenient import syntax for individual functions

### ✅ **Enhanced Testing Infrastructure**
- **229+ Tests** with 100% pass rate
- **Automated Test Cleanup**: Jest global setup/teardown prevents conflicts
- **Comprehensive Coverage**: CommonUtils, security, i18n, responsive design
- **Performance Optimized**: ~2.5s test execution time

### ✅ **Modern Template System**
- Secure file inclusion with path traversal protection
- Handlebars integration with custom helpers
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