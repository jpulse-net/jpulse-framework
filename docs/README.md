# jPulse Framework / Docs / Site Administrator & Developer Documentation v1.0.1

**For Site Administrators & Site Developers**

Welcome to the jPulse Framework documentation - your complete guide to building enterprise-grade web applications.

**🎉 Version 1.0**: Production-ready Redis infrastructure for scalable multi-instance deployments, zero-configuration auto-discovery architecture, comprehensive real-time communication, and enterprise-grade clustering capabilities.

## What is jPulse?

![Logo](./images/jpulse-logo-16.png) jPulse is a **MEVN stack** (MongoDB, Express, Vue.js, Node.js) web application framework built on **MVC architecture**. It uniquely supports **both Multi-Page Applications (MPA) and Single Page Applications (SPA)**, letting you mox and match the right pattern for each part of your application - from traditional server-rendered pages to modern Vue.js SPAs.

## Latest Release Highlights

- ✅ **Version 1.0.1 - Documentation & Developer Experience**: Comprehensive framework comparison guide comparing jPulse with major alternatives (NestJS, Django, Rails, Laravel, Next.js, Express, and low-code platforms). Automated `.npmrc` creation for GitHub Packages registry - eliminates manual registry configuration. Enhanced developer onboarding following "don't make me think" philosophy.
- ✅ **Version 1.0.0 - Production Milestone**: Complete Redis infrastructure for scalable multi-instance and multi-server deployments. Features zero-configuration auto-discovery architecture with automatic controller registration and API endpoint detection. Application Cluster Broadcasting for state synchronization across servers. WebSocket real-time communication with Redis pub/sub for cross-instance messaging. Aggregated health metrics across all instances and servers. Redis-based session sharing for seamless load balancing. Comprehensive Gen-AI development guides for AI-assisted coding. BSL 1.1 licensing with commercial options. Repository migration to jpulse-net organization. Production-ready deployment automation with PM2 clustering and Redis integration.
- ✅ **Zero-Configuration Auto-Discovery Architecture (v1.0.0-rc.2)**: Complete implementation of automatic controller registration, API endpoint discovery, and SPA routing detection. Features SiteControllerRegistry that auto-discovers all site controllers on startup, detects all `static async api*()` methods automatically, infers HTTP method (GET/POST/PUT/DELETE) from method name, and registers Express routes at `/api/1/{controllerName}` with zero configuration. ViewController converted to static class pattern with automatic SPA detection via cached `isSPA(namespace)` method that scans for Vue Router or History API patterns. Bootstrap integration provides centralized initialization in proper dependency order. Routes simplification eliminates all hardcoded controller imports and route registrations. Comprehensive startup logging provides full transparency of auto-discovered controllers, API methods, and SPA routes. Enhanced documentation in `docs/api-reference.md`, `docs/getting-started.md`, and `docs/mpa-vs-spa.md` with complete examples and verification guides. Perfect "don't make me think" developer experience - just create a controller file, framework handles the rest.
- ✅ **Production-Ready WebSocket and Redis Integration (v1.0.0-rc.1)**: Complete implementation of real-time communication capabilities for multi-user, multi-instance, and multi-server deployments. Features Application Cluster Broadcasting for simplified state synchronization across users and servers, WebSocket for bi-directional real-time communication, centralized Redis pub/sub message routing with pattern-based dispatching, channel schema validation with strict `model:`, `view:`, `controller:` prefixes, and `omitSelf` support to prevent echo messages. Enhanced Health Metrics System with real-time instance tracking, graceful shutdown broadcasting, request/error tracking with 1-minute rolling windows, and visual monitoring dashboard at `/admin/system-status`. Comprehensive documentation including new `docs/application-cluster.md` guide, enhanced `docs/websockets.md` and `docs/mpa-vs-spa.md`, and improved `docs/handlebars.md`. Redis configuration templates for single and cluster modes, interactive setup via `bin/configure.js`, and automated installation with `bin/jpulse-install.sh`. Breaking changes include Redis requirement for multi-instance/multi-server deployments and strict channel naming enforcement. Perfect for collaborative applications, real-time dashboards, and distributed systems with production-ready Redis clustering support.
- ✅ **Centralized Cache Management with Smart Invalidation (v0.9.7)**: Complete cache invalidation strategy implementation with centralized CacheManager utility for file-based caching across view controller, i18n utility, and markdown controller. Features periodic smart refresh with configurable intervals (minutes), synchronous file access with "does not exist" caching, cache API endpoints for manual refresh and statistics, and graceful shutdown handling. Eliminates need for app restarts when template, translation, or documentation files change. Includes comprehensive test environment compatibility and production-ready implementation with zero filesystem access on cache hits for optimal performance.
- ✅ **Health & Metrics API with System Status Dashboard (v0.9.6)**: Complete health monitoring infrastructure with `/api/1/health/status` and `/api/1/health/metrics` endpoints for load balancer integration and system monitoring. Features comprehensive admin dashboard at `/admin/system-status.shtml` with auto-refresh, window focus detection, and multi-instance metrics design for future Redis integration. Includes PM2 process monitoring, WebSocket statistics, system resource tracking, and role-based access control. Enhanced with `jPulse.UI.windowFocus` utility, restructured `appConfig.app` for framework/site separation, and comprehensive test coverage. Perfect for production monitoring with configurable logging and smart refresh behavior.
- ✅ **Admin Logs Search & Analysis Interface (v0.9.5)**: Complete admin logs page for system usage analysis with advanced filtering by date, username, action, and document type. Features sortable results table with expandable change details, smart dropdown positioning with scroll tracking, comprehensive i18n support, and responsive design. Enhanced logging consistency across all controllers with docTypes caching, improved error handling in demo applications, and educational code structure perfect for learning admin interface patterns. Includes performance optimizations with 5-minute TTL cache, body-attached dropdown for efficiency, and professional jp-* framework styling integration.
- ✅ **Authentication Control & User Menu Enhancement (v0.9.4)**: Complete implementation of configurable authentication controls with four new app.conf flags: `controller.user.disableSignup`, `controller.auth.disableLogin`, `view.auth.hideSignup`, and `view.auth.hideLogin` for granular control over public sites. Enhanced user menu with site navigation-consistent hover behavior (desktop) and tap-to-toggle (mobile) using device detection. Added `{{#unless}}` Handlebars helper with comprehensive documentation and examples. Fixed nested `{{#if}}` with `{{else}}` bug that affected complex template logic. Improved login error handling with proper toast messages for server errors. Enhanced view controller testing with 28 comprehensive unit tests covering all handlebars functionality, made release-agnostic for maintenance-free CI/CD.
- ✅ **Hierarchical Breadcrumb Navigation System (v0.9.3)**: Complete breadcrumb navigation implementation with bottom-up directory-level search algorithm for accurate URL matching. Features clean initialization pattern consistent with site navigation, server-side template integration with i18n support, SPA compatibility with real-time updates via History API monitoring, responsive design with overflow ellipsis handling, and comprehensive test coverage (22 breadcrumb tests). Includes critical bug fix for breadcrumb visibility when site navigation is disabled, enhanced test wrapper for accurate failure reporting, and production-ready implementation with smart page name extraction for 404/unknown pages.
- ✅ **Responsive Navigation System with Template-Based Architecture (v0.9.2)**: Complete implementation of responsive site navigation with desktop pulldown menus and mobile hamburger support. Migrated navigation definition from `app.conf` to `webapp/view/jpulse-navigation.tmpl` for full Handlebars power with conditionals, loops, and i18n. Features per-submenu timeout system for smooth hover interactions, role-based menu visibility with auto-re-initialization on login, enhanced tab navigation with URL auto-detection, and comprehensive responsive CSS fixes. Includes bug fixes for mobile search forms, authentication-aware menu updates, and MPA tab content jumping. All 716 tests passing with enhanced navigation and tab parameter testing.
- ✅ **WebSocket Real-Time Demo with Enhanced Navigation (v0.9.1)**: Complete `/hello-websocket/` educational demo teaching real-time communication with emoji cursor tracking (ephemeral) and collaborative todo list (hybrid REST+WebSocket). Includes unified 4-section navigation structure across all hello examples (Overview, Demo/App, Code Examples, Architecture), enhanced WebSocket documentation with implementation patterns, critical modal dialog focus trap bug fix, and 14 new hello-todo structure tests. Perfect progressive learning path: hello-todo (MPA) → hello-vue (SPA) → hello-websocket (Real-time SPA).
- ✅ **Enterprise WebSocket Infrastructure (v0.9.0)**: Production-ready WebSocket support for real-time bidirectional communication with namespace isolation, authentication/authorization, auto-reconnection with exponential backoff, persistent client UUIDs, username tracking, admin monitoring dashboard with color-coded activity logs, interactive test tool, and comprehensive documentation. Includes `jPulse.ws.*` client utilities for MPA/SPA integration, Redis pub/sub preparation for horizontal scaling, and 65 comprehensive tests. Perfect for collaborative applications, live updates, and SPA real-time features with "don't make me think" onboarding.
- ✅ **Consistent jPulse Utility Organization (v0.8.6)**: Complete refactoring of jPulse client-side utilities into consistent, logical namespaces. Moved `jPulse.apiCall()` to `jPulse.api.call()` for consistency with get/post/put/delete methods. Renamed slide-down messages to industry-standard `jPulse.UI.toast.*` (show/error/success/info/warning/clearAll) that better conveys their transient, non-blocking nature. All utilities now organized in clear buckets (api, form, dom, date, string, url, device, cookies, UI, clipboard) for improved developer experience and maintainability.
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
- **Real-Time Multi-User Communication**:
  - Application Cluster Broadcasting for state sync across servers (collaborative editing, notifications)
  - WebSocket for bi-directional interactions (chat, live updates, gaming)
  - Both scale across multiple server instances with Redis coordination
- Non-blocking toast notification system
- Responsive design with mobile-first approach
- Professional UI components and widgets (dialogs, accordions, tabs)
- Vue.js integration for interactive SPAs
- Smooth animations and transitions

### 🌐 **Internationalization**
- Complete multi-language support
- Dynamic translation loading
- Natural `{{i18n.key}}` template syntax
- Variable substitution in translations

### 🔧 **Site Customization**
- Seamless framework updates with site preservation
- Automatic file resolution priority (`site/webapp/` → `webapp/`)
- Zero-configuration site controller discovery
- Configuration merging system

### 🧪 **Testing & Quality**
- 740 comprehensive tests with 100% pass rate
- Automated test cleanup and isolation
- CI/CD ready with Jest integration
- Coverage reporting and analysis

### 📊 **Analytics & Monitoring**
- TSV (Tab-Separated Values) logging format for easy parsing
- Scope-based log organization with consistent API tracking
- Complete request lifecycle logging (start → success/error)
- Enhanced message truncation for large payloads
- Analytics-ready log format for monitoring tools

## 🤖 **AI-Assisted Development**

jPulse Framework is designed for **Gen-AI development** (aka "vibe coding") - leveraging AI assistants like Cursor, Cline, GitHub Copilot, or Windsurf to accelerate development while maintaining framework best practices.

**Why jPulse works great with AI**:
- 🎯 **Clear Patterns**: Consistent MVC architecture that AI can learn and replicate
- 📚 **Rich Documentation**: Comprehensive guides AI can reference for accurate code generation
- 🔍 **Reference Implementations**: Complete working examples (hello-todo, hello-vue) AI can study
- 🛡️ **Safe Defaults**: Framework conventions prevent common mistakes even in AI-generated code
- 🚀 **Zero Configuration**: Auto-discovery means less boilerplate for AI to remember

**Get Started with AI Development**:
- **[Gen-AI Development Guide](genai-development.md)** - Complete guide for developers using AI assistants
- **[Gen-AI Instructions](genai-instructions.md)** - Machine-readable instructions for AI coding agents

Whether you code manually or with AI assistance, jPulse's "don't make me think" philosophy ensures productive, maintainable development.

## 📚 Documentation Guide

### 🚀 **Getting Started**
- **[Installation Guide](installation.md)** - Setup for development and production environments
- **[Getting Started Tutorial](getting-started.md)** - Build your first jPulse application
- **[Framework Comparison](framework-comparison.md)** - jPulse vs. alternatives (NestJS, Django, Rails, Laravel, Next.js, etc.)
- **[Examples](examples.md)** - Real-world implementation patterns and use cases
- **[Gen-AI Development Guide](genai-development.md)** - AI-assisted development with vibe coding

### 👨‍💻 **Site Development**
- **[Site Customization](site-customization.md)** - Override system for update-safe customizations
- **[Gen-AI Development Guide](genai-development.md)** - AI-assisted development ("vibe coding")
- **[MPA vs. SPA Guide](mpa-vs-spa.md)** - Architecture comparison with diagrams and use cases
- **[Front-End Development](front-end-development.md)** - Complete jPulse JavaScript framework guide
- **[Application Cluster Communication](application-cluster.md)** - Multi-server broadcasting for state synchronization
- **[WebSocket Real-Time Communication](websockets.md)** - Bi-directional real-time interactions
- **[REST API Reference](api-reference.md)** - Complete `/api/1/*` endpoint documentation
- **[Handlebars Reference](handlebars.md)** - Complete Handlebars syntax guide (variables, conditionals, loops)
- **[Template Reference](template-reference.md)** - Template development guide (file structure, security, patterns)
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
mkdir my-jpulse-site && cd my-jpulse-site
npm install @jpulse-net/jpulse-framework
npx jpulse-configure
npm install
npm start
# Visit http://localhost:8080
```

📖 **Complete Installation Guide**: See [Installation Documentation](installation.md) for detailed setup instructions, production deployment, and troubleshooting.

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
├── package.json            # Dependencies (@jpulse-net/jpulse-framework)
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
