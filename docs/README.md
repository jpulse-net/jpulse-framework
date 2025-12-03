# jPulse Docs / Site Administrator & Developer Documentation v1.3.6

**For Site Administrators & Site Developers**

Welcome to the jPulse Framework documentation - your complete guide to building enterprise-grade web applications.

## What is jPulse?

![Logo](./images/jpulse-logo-16.png) jPulse is a **MEVN stack** (MongoDB, Express, Vue.js, Node.js) web application framework built on **MVC architecture**. It uniquely supports **both Multi-Page Applications (MPA) and Single Page Applications (SPA)**, letting you mix and match the right pattern for each part of your application - from traditional server-rendered pages to modern Vue.js SPAs.

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
- Email sending with SMTP support (Gmail, SendGrid, AWS SES, Office 365, Mailgun)

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
- Automatic file resolution priority (`site/webapp/` → `plugins/` → `webapp/`)
- Zero-configuration site controller discovery
- Configuration merging system
- **Append Mode** for `.js` and `.css` files (concatenate site + framework)
- **Navigation Direct Mutation** for selective override without duplication

### 🔌 **Plugin Infrastructure**
- Drop plugins in `plugins/` directory - auto-discovery and integration
- Complete MVC support: controllers, models, views, static assets, documentation
- Dynamic configuration with JSON schema validation and admin UI
- Path resolution with proper priority (site > plugins > framework)
- Automatic symlink management for assets and docs
- Ships with `hello-world` demo plugin

### 🧪 **Testing & Quality**
- 1000+ comprehensive tests with 100% pass rate
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

## Site Architecture

Your jPulse site has a three-tier stack for update-safe custom site code:
```
┌─────────────────────────────────┐
│                                 │
│            Site code            │   Location: my-jpulse-site/site/
│                                 │
└────────────────┬────────────────┘
                 │
┌────────────────┴────────────────┐
│                                 │   Install:
│          Plugins code           │     npm install @jpulse-net/plugin-[name]
│                                 │   Location: my-jpulse-site/plugins/
└────────────────┬────────────────┘
                 │
┌────────────────┴────────────────┐
│                                 │   Install:  npx jpulse-install
│      jPulse Framework code      │   Update:   npx jpulse update
│                                 │   Location: my-jpulse-site/webapp/
└─────────────────────────────────┘
```

The framework follows a MVC pattern with clean separation of concerns:

```
my-jpulse-site/
├── site/                   # Your custom code (highest priority, update-safe)
│   └── webapp/             # Site MVC components (overrides)
│       ├── app.conf        # Site configuration
│       ├── controller/     # Custom controllers
│       ├── model/          # Custom models
│       ├── view/           # Custom views
│       └── static/         # Custom assets
├── plugins/                # Installed plugins (middle priority, drop-in extensions)
│   └── [plugin-name]/      # Each plugin in its own directory
│       ├── plugin.json     # Plugin metadata and dependencies
│       ├── webapp/         # Plugin MVC components
│       └── docs/           # Plugin documentation
├── webapp/                 # Framework MVC components (lowest priority)
│   ├── controller/         # Base controllers
│   ├── model/              # Data models
│   ├── view/               # Base views (pages and templates)
│   └── static/             # Framework assets
├── logs -> /var/log/...    # Symbolic link to system log directory
├── package.json            # Dependencies (@jpulse-net/jpulse-framework)
└── .jpulse/                # Framework metadata (automatically updated)
    ├── app.json            # Consolidated runtime configuration
    ├── config-sources.json # Source file tracking
    └── plugins.json        # Plugins runtime configuration
```

## 📚 Documentation Guide

### 🚀 **Getting Started**
- **[Installation Guide](installation.md)** - Setup for development and production environments
- **[Getting Started Tutorial](getting-started.md)** - Build your first jPulse application
- **[Framework Comparison](framework-comparison.md)** - jPulse vs. alternatives (NestJS, Django, Rails, Laravel, Next.js, etc.)
- **[Examples](examples.md)** - Real-world implementation patterns and use cases
- **[Gen-AI Development Guide](genai-development.md)** - AI-assisted development with vibe coding

### 👨‍💻 **Site Development**
- **[Site Customization](site-customization.md)** - Override system for update-safe customizations
- **[Markdown Documentation](markdown-docs.md)** - Create custom doc spaces (`/help/`, `/faq/`, etc.)
- **[Gen-AI Development Guide](genai-development.md)** - AI-assisted development ("vibe coding")
- **[MPA vs. SPA Guide](mpa-vs-spa.md)** - Architecture comparison with diagrams and use cases
- **[Front-End Development](front-end-development.md)** - Complete jPulse JavaScript framework guide
- **[Application Cluster Communication](application-cluster.md)** - Multi-server broadcasting for state synchronization
- **[WebSocket Real-Time Communication](websockets.md)** - Bi-directional real-time interactions
- **[REST API Reference](api-reference.md)** - Complete `/api/1/*` endpoint documentation
- **[Handlebars Reference](handlebars.md)** - Complete Handlebars syntax guide (variables, conditionals, loops)
- **[Template Reference](template-reference.md)** - Template development guide (file structure, security, patterns)
- **[Style Reference](style-reference.md)** - Complete `jp-*` CSS framework and components

### 🔌 **Plugin Development**
- **[Plugin Architecture](plugins/plugin-architecture.md)** - Plugin system overview and design principles
- **[Creating Plugins](plugins/creating-plugins.md)** - Step-by-step guide to building plugins
- **[Managing Plugins](plugins/managing-plugins.md)** - Installing, configuring, and maintaining plugins
- **[Publishing Plugins](plugins/publishing-plugins.md)** - Distribution and versioning best practices
- **[Plugin API Reference](plugins/plugin-api-reference.md)** - Complete plugin development API

### 🚀 **Deployment**
- **[Deployment Guide](deployment.md)** - Production deployment strategies and best practices

### 🔐 **Security**
- **[Security & Authentication](security-and-auth.md)** - Authentication, authorization, and security best practices

### 📋 **Reference**
- **[Version History](CHANGELOG.md)** - Complete changelog and release notes

---

### 🔧 **Framework Development**
> **Contributing to jPulse Framework itself?** See [Framework Development Guide](dev/README.md) and [Framework Installation](dev/installation.md)

## Quick Start

```bash
# Create a new jPulse site
mkdir my-jpulse-site && cd my-jpulse-site
npx jpulse-install
npx jpulse configure
npm install
npm start
# Visit http://localhost:8080
```

📖 **Complete Installation Guide**: See [Installation Documentation](installation.md) for detailed setup instructions, production deployment, and troubleshooting.

> **Framework Development**: See [Framework Development Guide](dev/README.md) for contributing to jPulse itself.

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

## Latest Release Highlights

- ✅ **Version 1.3.6 - Plugin Hooks for Authentication & User Management**: Introduced comprehensive plugin hook system enabling third-party authentication providers (OAuth2, LDAP, MFA) and user lifecycle extensions. Features HookManager utility with 24 hooks (13 auth + 11 user), auto-registration via static `hooks` object declaration, priority-based execution order (lower = earlier, default 100), context modification and cancellation support, and `%DYNAMIC{plugins-hooks-list-table}%` for auto-documentation. Hook naming uses camelCase with Hook suffix (`authBeforeLoginHook`, `userAfterCreateHook`). Simple declaration: `static hooks = { hookName: { priority? } }` with method name matching hook name. Auth hooks: login flow (beforeLogin, afterPasswordValidation, beforeSessionCreate, afterLoginSuccess, onLoginFailure), logout (beforeLogout, afterLogout), MFA (requireMfa, validateMfa, onMfaSuccess, onMfaFailure). User hooks: signup (beforeSignup, afterSignupValidation, beforeCreate, afterCreate, onSignupComplete), persistence (beforeSave, afterSave, beforeDelete, afterDelete), profile sync (mapExternalProfile, syncExternalProfile). Hello-world plugin updated with working examples. See [Plugin Hooks Guide](plugins/plugin-hooks.md). 26 new unit tests. No breaking changes.
- ✅ **Version 1.3.5 - Dynamic Markdown Content**: Introduced `%DYNAMIC{generator-name key="value"}%` tokens for injecting server-generated content into markdown documentation. Features secure generator registry (security whitelist - only registered generators callable from markdown), automatic parameter parsing with type coercion (strings, numbers, booleans), backtick escaping for documenting tokens within markdown, and post-cache processing ensuring dynamic content is always fresh while leveraging file caching. Ships with 4 built-in generators: `plugins-list-table` (markdown table of installed plugins with icon, version, status, description), `plugins-list` (bullet list format), `plugins-count` (count with status filtering), `dynamic-generator-list` (self-documenting list of all available generators). Added `jPulse.UI.docs` API in `jpulse-common.js` for creating documentation viewers with SPA navigation, automatic namespace detection from URL, and optional site nav dropdown integration. API includes `init(options)` for viewer initialization, `getViewer()` for programmatic control, and `convertFilesToPages(files)` for navigation structure. Updated SPA detection in `view.js` to automatically recognize `jPulse.UI.docs.init` as SPA trigger. Added `titleCaseFix` configuration in `app.conf` for automatic title corrections (Api→API, Html→HTML, Css→CSS, Jpulse→jPulse, etc.) with full site override/extend support via deep merge. Created comprehensive `docs/markdown-docs.md` documentation guide (580 lines) covering dynamic content, documentation setup, linking, symlinks for accessibility, and jPulse.UI.docs API. Comprehensive test coverage with 20 unit tests for token parsing, type coercion, error handling, and processing. No breaking changes.
- ✅ **Version 1.3.4 - Custom Template Variables**: Introduced safe custom variables with `{{let key="value"}}` for template-scoped variables, `{{#let key="value"}}...{{/let}}` for block-scoped variables with scope isolation, and `{{#with object}}` for context switching. All custom variables stored in protected `vars` namespace preventing system variable conflicts (user, app, config, i18n remain untouchable). Features nested property support (`{{let config.theme="dark"}}`), type support (strings, numbers, booleans), scope inheritance, and pollution prevention in loops. Comprehensive test coverage with 33/33 unit tests passing (10 inline, 5 context switching, 7 block scope, 4 combined, 5 edge cases, 2 isolation). Updated 4 documentation guides (handlebars.md, template-reference.md, front-end-development.md, handlebars.shtml examples) with live interactive examples and complete API reference. Benefits: safety (cannot override system vars), clarity (self-documenting `{{vars.*}}`), flexibility (choose template-scoped or block-scoped), and maintainability (easy debugging with namespace separation). No breaking changes - new opt-in feature.
- ✅ **Version 1.3.3 - Unified Component System**: Replaced extract:start/end markers with intuitive `{{#component}}` syntax for reusable content blocks. Introduced `{{file.includeComponents "glob" component="namespace.*" sortBy="method"}}` helper that silently registers components from multiple files for dashboard aggregation. Components now available as context variables (`{{components.namespace.name}}`), accessible like `{{user.*}}` or `{{config.*}}` following "don't make me think" philosophy. Features pattern filtering (`component="adminCards.*"` to load specific namespace), flexible sorting methods (component-order default, plugin-order for dependency-based sorting, filename alphabetical, filesystem natural), circular reference detection with error reporting, and `_inline` parameter for JavaScript embedding. Migrated all 16 framework dashboards (8 admin views, 5 example views, 3 plugin views) plus 8 site/plugin views to new syntax. Removed ~210 lines of deprecated extract code from handlebar.js (_handleFileExtract, _extractOrderFromMarkers, _extractFromRegex, _extractFromCSSSelector functions). Enhanced component call handling with proper error messages, immediate context registration, and parameter expansion. Updated comprehensive documentation across 4 guides (handlebars.md, template-reference.md, creating-plugins.md, genai-instructions.md). All 919 tests passing (813 unit + 100 integration + CLI tools). Benefits: "don't make me think" syntax matching framework patterns, clean Handlebars with proper editor highlighting, no more `<div style="display: none;">` wrappers, explicit sorting control, memory-efficient pattern filtering. Complete documentation of migration path and new patterns.
- ✅ **Version 1.3.2 - Additional Plugin Infrastructure Bug Fixes**: Patch release fixing four critical bugs discovered during v1.3.1 production deployment on bubblemap.net. Bug #1: Update script missing plugin sync - `npx jpulse update` didn't copy `plugins/hello-world/` to site, leaving production with v1.2.6 instead of v1.3.1. Fixed by adding plugin sync section to `bin/jpulse-update.js`. Bug #2: Confusing "enabled" config field - checkbox in plugin config page didn't actually enable/disable plugin (only saved to database), creating false expectations. Fixed by removing the redundant field from hello-world plugin and documentation. Bug #3: Wrong documentation symlink location - hardcoded to `docs/installed-plugins/` but production sites use `webapp/static/assets/jpulse-docs/installed-plugins/`. Fixed with context-aware `detectContext()` method in SymlinkManager that auto-detects framework repo vs site installation. Bug #4: Stale plugin state in admin UI - enable/disable buttons updated `.jpulse/plugins.json` on disk but `getAllPlugins()` returned stale in-memory data, showing wrong status until app restart. Fixed by merging registry state with discovered metadata. All 926 tests passing (942 total, 16 skipped). Files modified: 8 (4 code: update script, plugin config, symlink manager, plugin manager; 4 docs: plugin architecture, API reference, managing plugins, creating plugins). Ensures plugin updates work correctly, eliminates UX confusion, documentation accessible in both environments, and admin UI shows accurate real-time state. No breaking changes - production-ready bug fixes only.
- ✅ **Version 1.3.1 - Critical Bug Fixes for Plugin Infrastructure**: Patch release fixing three critical bugs discovered after v1.3.0 deployment affecting npm package distribution, CI/CD testing, and production JavaScript execution. Fixed npm package missing `plugins/hello-world/` directory - added explicit `files` field to package.json to properly include essential directories (bin, docs, plugins/hello-world, site, templates, webapp). Fixed GitHub Actions CI test crashes when database unavailable - added `isTest` parameter to `PluginModel.ensureIndexes()` for graceful handling in test environments while maintaining production fail-fast behavior. Fixed JavaScript syntax errors when i18n strings contain apostrophes (Don't, can't, won't) - converted 160+ instances from single quotes to template literals (backticks) across 15 view files, established `%TOKEN%` pattern for dynamic error messages with `.replace()`, reverted translations to natural English with apostrophes, added comprehensive "Using i18n in JavaScript Context" section to template-reference.md. Language-dependent bug discovered (worked in German, failed in English due to contractions). All 926 tests passing (942 total, 16 skipped). Files modified: 19 (2 core utils, 15 views, 1 translation, 1 documentation). Ensures complete npm package installation, reliable CI/CD pipeline, and safe internationalization with natural language. No breaking changes - production-ready bug fixes only.
- ✅ **Version 1.3.0 - Plugin Infrastructure with Auto-Discovery**: Comprehensive plugin system enabling third-party extensions with zero-configuration auto-discovery. Features complete MVC support (controllers, models, views, static assets, documentation), dynamic configuration management with JSON schema validation, admin UI for plugin management, plugin-aware path resolution (site > plugins > framework), automatic symlink management, and ships with `hello-world` demo plugin. Includes robust security (path traversal protection, HTML sanitization for plugin descriptions and email content, DB operation validation), complete i18n (English & German), request timing, and comprehensive testing (913 tests passing: 813 unit + 100 integration). Five comprehensive documentation guides for plugin development. Technical debt documented with 19 items for future enhancements. No breaking changes - new opt-in feature for extending framework functionality.
- ✅ **Version 1.2.6 - Bug Fixes for Site Installation and Navigation**: Critical bug fix release addressing issues discovered after v1.2.5 deployment. Fixed incomplete hello example copying during site installation - now copies all 5 controllers (`hello*.js`), 1 model (`helloTodo.js`), and recursively copies view directories including `templates/` subdirectories in `hello-vue` and `hello-websocket`. Implemented robust navigation null handling with `_sanitizeNavStructure()` method that recursively removes `null` deletion markers at init time, preventing "Cannot read properties of null" errors throughout navigation code. Removed obsolete `checkAdminAccess()` function call from user dashboard. Enhanced `bin/configure.js` with `copyDirRecursive()` helper for deep directory copying. Single point of sanitization makes navigation code cleaner and more maintainable. All 893 tests passing (776 unit, 88 integration, 29 CLI/MongoDB). No breaking changes.
- ✅ **Version 1.2.5 - Site Navigation Override with Append Mode**: Introduced flexible navigation customization using append mode file concatenation and direct JavaScript mutation. Sites can selectively add, modify, or delete navigation sections without duplicating entire framework files. Features `.js` and `.css` append mode (concatenate framework + site), unified `window.jPulseNavigation` structure, direct mutation pattern (`window.jPulseNavigation.site.foo = {...}`), Handlebars comment support (`{{!-- --}}`), and file naming standardization (`site-common.*` → `jpulse-common.*`). Benefits: zero runtime overhead, automatic framework updates, idiomatic JavaScript, minimal customization code. Breaking change: navigation file migration required. Complete documentation in site-navigation.md guide.
- ✅ **Version 1.2.4 - Reusable Handlebars Components**: Introduced reusable component system to eliminate code duplication. Define components once with `{{#component "name" param="default"}}...{{/component}}`, use everywhere with `{{components.componentName param="value"}}`. Features automatic kebab-case to camelCase conversion, per-request component registry, circular reference detection, optional dot-notation namespaces (`jpIcons.configSvg`), and `_inline=true` parameter for JavaScript embedding. Created centralized `svg-icons.tmpl` library with 20+ parameterized SVG components. Migrated all framework icons to component system. Benefits: define once use everywhere, clean templates, maintainable icons, organized namespaces. No breaking changes - new opt-in feature with comprehensive documentation.
- ✅ **Version 1.2.3 - Professional SVG Icons**: Replaced Unicode emoji icons with professional SVG icons from lucide.dev across admin dashboard and hello demo pages. Improves visual consistency with enterprise-ready appearance and theme-flexible design using CSS `currentColor`. Added vertical alignment CSS (`h1-h6 svg { vertical-align: middle; }`) for proper icon positioning. Inline SVG implementation enables proper color inheritance from parent containers. Theme-ready icons respond to CSS color changes. No breaking changes - visual enhancement only.
- ✅ **Version 1.2.2 - Removed jsdom Dependency**: Replaced 15-20MB jsdom package (90+ sub-dependencies) with lightweight regex-based CSS selector extraction (~50 lines of code). Uses smart tag nesting level annotation (`:~0~`, `:~1~`) with backreference matching to handle nested tags correctly. Moved jsdom to devDependencies (still used for client-side JS tests). Significantly reduces production package size, faster installs, same functionality. CSS selector extraction (`.class`, `#id`) works identically with zero external dependencies.
- ✅ **Version 1.2.1 - File Listing & Extraction Helpers**: Generalized Handlebars helpers for automated content generation. Features `file.list` for glob pattern file discovery and `file.extract` for content extraction using three methods (comment markers, regex patterns, CSS selectors). Supports sorting by extracted order or filename, pattern parameter passing in loops, and site override via PathResolver. Security built-in with path traversal protection. Use cases include auto-populated dashboards, navigation menus, galleries, and documentation indexes. Added `PathResolver.listFiles()` method for centralized directory listing with site override support.
- ✅ **Version 1.2.0 - Admin User Management & API Consolidation**: Complete admin user management system with flexible user identification (ObjectId, username, session), comprehensive validation (last admin protection, role safeguards), schema extension architecture for plugin support, and unified API surface. Breaking changes: removed `/api/1/user/profile` endpoints, replaced with unified `/api/1/user` and `/api/1/user/:id`. New `/api/1/user/enums` endpoint for dynamic enum retrieval. Centralized admin roles configuration via `appConfig.user.adminRoles`. Runtime schema extension via `UserModel.extendSchema()` for future plugins.
- ✅ **Version 1.1.8 - Simplified Installation & Bug Fixes**: Added `jpulse-install` npm package for one-command installation. No more manual `.npmrc` creation - just run `npx jpulse-install` and you're ready to configure your site. Eliminates the "chicken and egg" problem of installing from GitHub Packages. Fixed log symlink creation (only for file logging), SSL paths in nginx config, PORT value preservation, and log directory defaults. Renamed `npx jpulse install` → `npx jpulse setup` for clarity. Manual installation method still available in docs for air-gapped systems.
- ✅ **Version 1.1.7 - Deployment Bug Fixes**: Fixed seven bugs affecting site deployment and configuration, improving the "don't make me think" installation experience. Simplified npm installation with `--registry` flag (no manual .npmrc creation). Fixed log directory symlinks, MongoDB setup auto-loads `.env` file, handles existing authentication for multi-site installs. Auto-configures Let's Encrypt SSL paths. Nginx uses site-specific upstream names enabling seamless multi-site installations on same server.
- ✅ **Version 1.1.6 - Configurable Navigation Delays**: Restructured `view.pageDecoration` configuration with nested structure for better site overrides. Made site navigation menu open/close delays fully configurable via `app.conf` (openDelay, closeDelay, submenuCloseDelay). Open delay cancels if mouse leaves before menu opens, preventing accidental triggers. Site administrators can now fine-tune menu timing for their specific UX needs.
- ✅ **Version 1.1.5 - Log IP addresses**: Fix bug where local IP address 127.0.0.1 was shown in the logs when jPulse is behind a reverse proxy.
- ✅ **Version 1.1.4 - Email Sending Strategy**: Implemented standardized email sending capability for jPulse Framework and site applications. EmailController provides server-side utility methods (sendEmail, sendEmailFromTemplate, sendAdminNotification) and client-side API endpoint (POST /api/1/email/send). MongoDB-based configuration enables per-instance SMTP settings with support for all major providers (Gmail, SendGrid, AWS SES, Office 365, Mailgun). Features test email functionality in admin UI, health monitoring integration, Handlebars template support, and graceful fallback when email not configured. Complete documentation and comprehensive test coverage.
- ✅ **Version 1.1.3 - Handlebars Processing Extraction**: Extracted Handlebars template processing to dedicated `HandlebarController` for better separation of concerns and reusable template processing API. Added `POST /api/1/handlebar/expand` endpoint for client-side Handlebars expansion with server context. Added `/api/1/config/_default` endpoint for default configuration management. Context filtering based on authentication status protects sensitive configuration data. Event-driven config refresh via Redis broadcast ensures multi-instance cache consistency. Enables future email template processing and "Try Your Own Handlebars" demo functionality.
- ✅ **Version 1.1.0 - Unified CLI tools with intuitive npx jpulse commands**: Unified command-line interface with single entry point, configuration-driven version bumping, and intuitive update workflow following "don't make me think" philosophy
- ✅ **Version 1.1.0 - Unified CLI Tools & Developer Experience**: Complete unified command-line interface with single `npx jpulse` entry point for all framework tools. Configuration-driven version bumping with context-aware config discovery (framework vs site). Intuitive update workflow with automatic package update in single command - `npx jpulse update` updates to latest and syncs files, or specify version for beta/RC testing. Context-aware help shows relevant commands based on execution environment. Eliminates two-step update process and provides consistent command patterns following "don't make me think" philosophy.
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

---

*jPulse Framework - Don't make me think, just build great applications.*
