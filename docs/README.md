# jPulse Framework / Docs / Site Administrator & Developer Documentation v0.8.5

**For Site Administrators & Site Developers**

Welcome to the jPulse Framework documentation - your complete guide to building enterprise-grade web applications.

## What is jPulse?

![Logo](./images/jpulse-logo-16.png) jPulse is a **MEVN stack** (MongoDB, Express, Vue.js, Node.js) web application framework built on **MVC architecture**. It uniquely supports **both Multi-Page Applications (MPA) and Single Page Applications (SPA)**, letting you choose the right pattern for each part of your application - from traditional server-rendered pages to modern Vue.js SPAs.

## Latest Release Highlights

- ✅ **Vue.js SPA Demo & Enhanced jPulse Utilities (v0.8.5)**: Complete Single Page Application demonstration with Vue.js 3, Vue Router, client-side routing, and real-time interactivity. Enhanced jPulse common utilities with `jPulse.date` namespace (formatLocalDate, formatLocalDateAndTime) and `jPulse.api.handleError()` for consistent error handling. Comprehensive educational example perfect for learning modern SPA development with jPulse Framework backend integration.
- ✅ **Hello To-Do MVC Demo for Site Development Learning (v0.8.4)**: Complete Model-View-Controller demonstration with MongoDB integration, REST API patterns, user authentication context, and interactive UI. Perfect educational example for site developers learning jPulse Framework patterns with full CRUD operations, auto-registration, and "don't make me think" onboarding experience.
- ✅ **Critical regression fix - site templates missing from npm package (v0.8.3)**: Fixed critical bug where site/ directory templates were missing from published packages, breaking W-014 site override system. Also fixed security vulnerability exposing sensitive config files. Improved maintainability with .npmignore approach.
- ✅ **Improved site specific docs for better onboarding (v0.8.2)**: Improved docs for better onboarding of site administrators and site developers
- ✅ **New jPulse Framework logo (v0.8.1)**: The new jPulse Framework logo has the shape of a single pulse wave on a blue background, which is better brandable and more memorable
- ✅ **Interactive Examples & Documentation Hub (v0.8.0)**: Complete `/jpulse-examples/` system with interactive code demonstrations, syntax-highlighted source code widgets with copy functionality, comprehensive UI component showcase, and enhanced onboarding experience with Apache-style home page
- ✅ **Tab Interface Widget & UI Framework Enhancement (v0.7.21)**: Complete `jPulse.UI.tabs` widget system with navigation tabs (page routing), panel tabs (content switching), nested tab hierarchies, programmatic control API, and professional styling with divider interruption effects
- ✅ **Nested Handlebars Support & Multi-line Blocks (v0.7.20)**: Complete nested {{#if}} and {{#each}} handlebars implementation with multi-line block support, left-to-right processing, and comprehensive test coverage for complex template scenarios
- ✅ **{{#each}} Handlebars Helper & Template Iteration (v0.7.19)**: Complete {{#each}} implementation with array and object iteration, special context variables (@index, @first, @last, @key), nested property access, and comprehensive error handling
- ✅ **TSV Logging System & API Standardization (v0.7.18)**: Complete conversion to tab-separated values (TSV) logging format with scope-based organization, standardized API request tracking, and enhanced analytics capabilities
- ✅ **Markdown Documentation Filtering (v0.7.17)**: Complete .jpulse-ignore implementation for content control with gitignore-like syntax and enhanced test runner with color support
- ✅ **Standardized Error Handling & Testing (v0.7.16)**: Complete error handling standardization across all controllers, enhanced test framework with dynamic statistics, and comprehensive sendError functionality
- ✅ **Clean Deployment Strategy (v0.7.0)**: Complete "don't make me think" deployment automation with interactive setup, production templates, and MongoDB security
- ✅ **Package Distribution (v0.6.0+)**: Create new sites with `npx jpulse-configure` - clean repository separation
- ✅ **Dual Licensing (v0.5.5)**: AGPL v3 open source with commercial licensing options for enterprise use
- ✅ **Markdown Documentation System (v0.5.4+)**: Complete documentation system with API standardization, content filtering, and i18n support
- ✅ **Enterprise UI Widgets (v0.5.2)**: Complete UI widget system with draggable dialogs and form interactions

## Key Features

### 🏗️ **Flexible Architecture**
- **MVC at the Core**: Clean Model-View-Controller pattern with flexible View placement
- **MPA & SPA Support**: Traditional MPA, enhanced MPA (RESTful MVC), or full Vue.js SPA
- **MEVN Stack**: MongoDB + Express + Vue.js + Node.js for full-stack development
- **Choose Per Page**: Mix MPA and SPA patterns in the same application

### 🚀 **Enterprise-Ready Foundation**
- Multi-environment support (development/production)
- Advanced JavaScript-based configuration system
- MongoDB integration with replica set support
- Comprehensive session management

### 🎨 **Modern User Experience**
- Non-blocking slide-down message system
- Responsive design with mobile-first approach
- Professional UI components and widgets (dialogs, accordions, tabs)
- Vue.js integration for interactive SPAs
- Smooth animations and transitions

### 🌐 **Internationalization**
- Complete multi-language support
- Dynamic translation loading
- Natural `{{i18n.key}}` template syntax
- Variable substitution in translations

### 🔧 **Site Customization (W-014)**
- Seamless framework updates with site preservation
- Automatic file resolution priority (`site/webapp/` → `webapp/`)
- Zero-configuration site controller discovery
- Configuration merging system

### 🧪 **Testing & Quality**
- 637+ comprehensive tests with 100% pass rate
- Automated test cleanup and isolation
- CI/CD ready with Jest integration
- Coverage reporting and analysis

### 📊 **Analytics & Monitoring**
- TSV (Tab-Separated Values) logging format for easy parsing
- Scope-based log organization with consistent API tracking
- Complete request lifecycle logging (start → success/error)
- Enhanced message truncation for large payloads
- Analytics-ready log format for monitoring tools

## 📚 Documentation Guide

### 🚀 **Getting Started**
- **[Installation Guide](installation.md)** - Setup for development and production environments
- **[Getting Started Tutorial](getting-started.md)** - Build your first jPulse application
- **[Examples](examples.md)** - Real-world implementation patterns and use cases

### 👨‍💻 **Site Development**
- **[Site Customization](site-customization.md)** - Override system for update-safe customizations
- **[MPA vs. SPA Guide](mpa-vs-spa.md)** - Architecture comparison with diagrams and use cases
- **[Front-End Development](front-end-development.md)** - Complete jPulse JavaScript framework guide
- **[REST API Reference](api-reference.md)** - Complete `/api/1/*` endpoint documentation
- **[Template Reference](template-reference.md)** - Server-side Handlebars system
- **[Handlebars Templating](handlebars.md)** - Server-side Handlebars system
- **[Style Reference](style-reference.md)** - Complete `jp-*` CSS framework and components

### 🚀 **Deployment**
- **[Deployment Guide](deployment.md)** - Production deployment strategies and best practices

### 📋 **Reference**
- **[Version History](CHANGELOG.md)** - Complete changelog and release notes

---

### 🔧 **Framework Development**
> **Contributing to jPulse Framework itself?** See [Framework Development Guide](dev/README.md) and [Framework Installation](dev/installation.md)

## Quick Start

```bash
# Create a new jPulse site
npm install -g @peterthoeny/jpulse-framework
mkdir my-jpulse-site && cd my-jpulse-site
# Configure site
npx jpulse-configure
# Install dependencies
npm install
# Start the server app
npm start
# Visit http://localhost:8080
```

> **Framework Development**: See [Framework Development Guide](dev/README.md) for contributing to jPulse itself.

## Site Architecture

Your jPulse site follows a clean MVC pattern with update-safe customizations:

```
my-jpulse-site/
├── webapp/                 # Framework files (managed by jpulse-update)
│   ├── app.js              # Framework bootstrap
│   ├── app.conf            # Framework configuration defaults
│   ├── controller/         # Base controllers
│   ├── model/              # Data models
│   ├── view/               # Base pages and templates
│   └── static/             # Framework assets
├── site/webapp/            # Your customizations (update-safe)
│   ├── app.conf            # Site configuration
│   ├── controller/         # Site controllers
│   ├── model/              # Site data models
│   ├── view/               # Site pages and templates
│   └── static/             # Site-specific assets
├── logs -> /var/log/...    # Symbolic link to system log directory
├── package.json            # Dependencies (@peterthoeny/jpulse-framework)
└── .jpulse/                # Framework metadata
    ├── app.json            # Consolidated runtime configuration
    └── config-sources.json # Source file tracking
```

## Target Audience

jPulse is designed for:
- **Full-stack developers** who want MEVN stack with flexible MPA/SPA choices
- **Government agencies** requiring secure, maintainable web applications
- **Private sector organizations** needing scalable internal tools
- **Development teams** building enterprise-grade applications with mixed architectures
- **Site administrators** who prefer markdown-based documentation

## Support & Community

### Documentation Resources
- **[Front-End Development](front-end-development.md)** - Primary entry point for client-side developers
- **[REST API Reference](api-reference.md)** - Complete endpoint documentation
- **[Style Reference](style-reference.md)** - Complete CSS framework and components
- **[Template Reference](template-reference.md)** - Server-side integration guide
- **[MPA vs SPA Comparison](mpa-vs-spa.md)** - Architecture patterns and when to choose each

### Framework Development
- **[Framework Development Guide](dev/README.md)** - Architecture and contribution guide
- **[Version History](CHANGELOG.md)** - Complete changelog and release notes

---

*jPulse Framework - Don't make me think, just build great applications.*
