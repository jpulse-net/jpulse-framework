# jPulse Framework v1.2.0

jPulse Framework is a web application framework, designed to build scalable and secure applications for enterprise and government organizations. Developers can focus on the business logic, while jPulse handles foundational infrastructure, such as user management, authentication, logging, real-time communication, and scaling. Built on MVC architecture, jPulse uniquely supports both MPA and SPA patterns, giving developers flexibility to choose the right architecture for each part of their application. Our guiding philosophy is "don't make me think," creating intuitive development experiences that accelerate productivity, enhanced further by AI-assisted development (vibe coding).

**🎉 Version 1.0**: Production-ready Redis infrastructure for scalable multi-instance deployments, zero-configuration auto-discovery architecture, comprehensive real-time communication, and enterprise-grade clustering capabilities.

## Why jPulse?

**📊 Considering jPulse?** See our [Framework Comparison Guide](docs/framework-comparison.md) comparing jPulse with NestJS, Django, Rails, Laravel, Next.js, and other alternatives.

### 🎯 **Enterprise-Focused**
Designed specifically for midsize to large organizations in government and private sectors, with built-in security, compliance, and scalability features.

### 🚀 **"Don't Make Me Think" Philosophy**
Clean APIs, zero-configuration auto-discovery, and intuitive development patterns that eliminate cognitive load and accelerate development.

### 🔄 **Seamless Updates**
A solid site override architecture enables framework updates without losing customizations - your site code stays safe in the `site/` directory.

### 🏗️ **Flexible Architecture**
**MVC at the core** with support for both **Multi-Page Applications (MPA)** and **Single Page Applications (SPA)**. Use traditional MPA for content-focused pages, enhanced MPA for interactive features, or full SPA for app-like experiences - all in the same application.

### 🎭 **MEVN Stack**
Full-stack JavaScript with **MongoDB** for data, **Express** for routing, **Vue.js** for SPAs, and **Node.js** as the runtime. Optional Vue.js usage means you can build traditional MPAs and/or modern SPAs based on your needs.

### 🤖 **AI-Assisted Development**
jPulse Framework is designed for **Gen-AI development** (aka "vibe coding") - leveraging AI assistants like Cursor, Cline, GitHub Copilot, or Windsurf to accelerate application development while maintaining framework best practices.

## Quick Start

### For Site Development (Recommended)

```bash
# Create a new jPulse site
mkdir my-jpulse-site && cd my-jpulse-site
npx jpulse-install
npx jpulse configure
npm install
npm start
# Visit http://localhost:8080
```

📖 **Complete Installation Guide**: See [Installation Documentation](docs/installation.md) for detailed setup instructions, production deployment, and troubleshooting.

### For Framework Development

```bash
# Clone and install
git clone https://github.com/jpulse-net/jpulse-framework.git
cd jpulse-framework
npm install

# Start development server
npm start
# Visit http://localhost:8080
```

## Key Features

- **MPA & SPA Support**: Choose the right architecture for each page - traditional MPA, enhanced MPA, or full SPA
- **MVC Architecture**: Clean Model-View-Controller pattern with flexible View placement (server or browser)
- **MEVN Stack**: MongoDB + Express + Vue.js + Node.js for full-stack JavaScript development
- **Real-Time Multi-User Communication**:
  - **Application Cluster Broadcasting** for state synchronization across servers (collaborative editing, notifications)
  - **WebSocket** for bi-directional real-time interactions (chat, live updates, gaming)
  - **Redis Clustering**: Multi-instance coordination for sessions, broadcasts, and WebSocket across servers
- **Site Override System**: Customize without fear of losing changes during updates
- **Zero Configuration**: Auto-discovery of controllers, API routes, and SPA routing:
  - Create `controller/product.js` with `static async api()` → automatically registered at `GET /api/1/product`
  - Add `static async apiCreate()` → automatically registered at `POST /api/1/product`
  - Add `view/my-app/index.shtml` with Vue Router → automatically detects SPA, supports page reloads on all sub-routes
  - Just create files following naming conventions - framework handles discovery, registration, and routing!
- **Health Metrics**: Aggregated across instances on all app servers
- **Enterprise Security**: Built-in authentication, session management, and security headers
- **Internationalization**: Complete i18n support with dynamic translation loading
- **Testing Framework**: 800+ tests with automated cleanup and isolation
- **Production Ready**: nginx integration, PM2 clustering, MongoDB replica sets

## Deployment Requirements

### System Dependencies
- **Node.js 18 LTS** (runtime)
- **MongoDB 6.0+** (database)
- **Redis 6.0+** (caching, sessions, pub/sub)
- **nginx** (reverse proxy, production)
- **PM2** (process manager, production)

### Single Instance (Development)
- ✅ **Redis Optional**: Sessions use memory/MongoDB fallback
- ✅ **WebSocket**: Local only (single instance)
- ✅ **App Cluster**: Local only (single instance)

### Multi-Instance (PM2 Cluster)
- ✅ **Redis Required**: For cross-instance communication
- ✅ **WebSocket**: Shared across all instances via Redis pub/sub
- ✅ **App Cluster**: Broadcasts across all instances via Redis pub/sub
- ✅ **Sessions**: Shared across all instances via Redis storage

### Multi-Server (Load Balanced)
- ✅ **Redis Required**: For cross-server communication
- ✅ **WebSocket**: Shared across all servers via Redis pub/sub
- ✅ **App Cluster**: Broadcasts across all servers via Redis pub/sub
- ✅ **Sessions**: Shared across all servers via Redis storage
- ✅ **Health Metrics**: Aggregated across all instances and servers

## Architecture Overview

### Site Structure (After `npx jpulse configure`)

```
my-jpulse-site/
├── webapp/               # Framework files (managed by jpulse-update)
│   ├── controller/       # Base controllers
│   ├── model/            # Data models
│   ├── view/             # Base templates
│   └── static/           # Framework assets
├── site/webapp/          # Your customizations (update-safe)
│   ├── app.conf          # Site configuration
│   ├── controller/       # Custom controllers
│   ├── model/            # Custom models
│   ├── view/             # Custom views
│   └── static/           # Custom assets
├── logs -> /var/log/...  # Symbolic link to system log directory
└── package.json          # Dependencies (@jpulse-net/jpulse-framework)
```

**File Resolution Priority:**
1. `site/webapp/[path]` (your customizations)
2. `webapp/[path]` (framework defaults)

**Framework Updates:**
```bash
# Update to latest production version:
npx jpulse update

# Update to specific version (beta/RC):
npx jpulse update @jpulse-net/jpulse-framework@1.0.0-rc.1
```

## Documentation

### For Site Administrators & Site Developers
- **[Getting Started](docs/getting-started.md)** - Build your first jPulse site
- **[Installation Guide](docs/installation.md)** - Setup for all environments
- **[Framework Comparison](docs/framework-comparison.md)** - jPulse vs. alternatives (NestJS, Django, Rails, etc.)
- **[Site Customization](docs/site-customization.md)** - Master the override system
- **[API Reference](docs/api-reference.md)** - Complete framework API
- **[Examples](docs/examples.md)** - Real-world enterprise scenarios
- **[Deployment Guide](docs/deployment.md)** - Production deployment

### For jPulse Framework Developers
- **[Framework Development](docs/dev/README.md)** - Architecture and contribution guide

## Target Organizations

- **Government Agencies** - Federal, state, and local government applications
- **Healthcare Systems** - HIPAA-compliant patient portals and internal tools
- **Educational Institutions** - Student information systems and administrative tools
- **Financial Services** - Secure internal applications and customer portals
- **Professional Services** - Client portals and internal management systems

## Latest Release Highlights

- ✅ **Version 1.1.8 - Simplified Installation & Bug Fixes**: Added `jpulse-install` npm package for one-command installation. No more manual `.npmrc` creation - just run `npx jpulse-install` and you're ready to configure your site. Eliminates the "chicken and egg" problem of installing from GitHub Packages. Fixed log symlink creation (only for file logging), SSL paths in nginx config, PORT value preservation, and log directory defaults. Renamed `npx jpulse install` → `npx jpulse setup` for clarity. Manual installation method still available in docs.
- ✅ **Version 1.1.7 - Deployment Bug Fixes**: Fixed seven bugs affecting site deployment and configuration, improving the "don't make me think" installation experience. Simplified npm installation with `--registry` flag (no manual .npmrc creation). Fixed log directory symlinks, MongoDB setup auto-loads `.env` file, handles existing authentication for multi-site installs. Auto-configures Let's Encrypt SSL paths. Nginx uses site-specific upstream names enabling seamless multi-site installations on same server.
- ✅ **Version 1.1.6 - Configurable Navigation Delays**: Restructured `view.pageDecoration` configuration with nested structure for better site overrides. Made site navigation menu open/close delays fully configurable via `app.conf` (openDelay, closeDelay, submenuCloseDelay). Open delay cancels if mouse leaves before menu opens, preventing accidental triggers. Site administrators can now fine-tune menu timing for their specific UX needs.
- ✅ **Version 1.1.5 - Log IP addresses**: Fix bug where local IP address 127.0.0.1 was shown in the logs when jPulse is behind a reverse proxy.
- ✅ **Version 1.1.4 - Email Sending Strategy**: Implemented standardized email sending capability for jPulse Framework and site applications. EmailController provides server-side utility methods (sendEmail, sendEmailFromTemplate, sendAdminNotification) and client-side API endpoint (POST /api/1/email/send). MongoDB-based configuration enables per-instance SMTP settings with support for all major providers (Gmail, SendGrid, AWS SES, Office 365, Mailgun). Features test email functionality in admin UI, health monitoring integration, Handlebars template support, and graceful fallback when email not configured. Complete documentation and comprehensive test coverage.
- ✅ **Version 1.1.3 - Handlebars Processing Extraction**: Extracted Handlebars template processing to dedicated `HandlebarController` for better separation of concerns and reusable template processing API. Added `POST /api/1/handlebar/expand` endpoint for client-side Handlebars expansion with server context. Added `/api/1/config/_default` endpoint for default configuration management. Context filtering based on authentication status protects sensitive configuration data. Event-driven config refresh via Redis broadcast ensures multi-instance cache consistency. Enables future email template processing and "Try Your Own Handlebars" demo functionality.
- ✅ **Version 1.1.0 - Unified CLI tools with intuitive npx jpulse commands**: Unified command-line interface with single entry point, configuration-driven version bumping, and intuitive update workflow following "don't make me think" philosophy
- ✅ **Version 1.0.1 - Documentation & Developer Experience**: Framework comparison guide comparing jPulse with NestJS, Django, Rails, Laravel, Next.js, and alternatives. Automated `.npmrc` creation for GitHub Packages registry - no manual configuration needed. Enhanced developer experience following "don't make me think" philosophy.
- ✅ **Version 1.0.0 - Production Milestone**: Complete Redis infrastructure for scalable multi-instance and multi-server deployments with zero-configuration auto-discovery, Application Cluster Broadcasting, WebSocket real-time communication, aggregated health metrics, Redis-based session sharing, and enterprise-grade clustering. Includes BSL 1.1 licensing, repository migration to jpulse-net organization, comprehensive Gen-AI development guides, and production-ready deployment automation.
- ✅ **Zero-Configuration Auto-Discovery (v1.0.0-rc.2)** - Complete automatic controller registration, API endpoint discovery, and SPA routing detection
- ✅ **Production-Ready WebSocket and Redis Integration (v1.0.0-rc.1)** - Complete real-time communication capabilities for multi-user, multi-instance, and multi-server deployments
- ✅ **[MPA vs. SPA Architecture Guide](docs/mpa-vs-spa.md)** - Comprehensive comparison with diagrams showing when to use each pattern

## Community & Support

- **Documentation**: Complete guides in `/docs/` directory
- **GitHub**: Issues, discussions, and contributions welcome
- **License**: BSL 1.1 (with commercial licensing available)
- **Roadmap**: [Development roadmap](docs/dev/roadmap.md) with clear milestones

## Enterprise Advantages

- **Stability**: Backward-compatible updates with clear migration paths
- **Security**: Built-in security best practices and regular audits
- **Scalability**: Horizontal scaling with session clustering and database sharding
- **Maintainability**: Clean architecture with comprehensive documentation
- **Cost-Effective**: Open source with optional enterprise support

## Licensing

jPulse Framework uses **Business Source License 1.1 (BSL 1.1)**:

- **Free for**: Evaluation, development, testing, and learning
- **Source Code**: Fully accessible at [GitHub](https://github.com/jpulse-net/jpulse-framework)
- **Production Use**: Requires commercial license (contact [team@jpulse.net](mailto:team@jpulse.net))
- **Future**: Automatically converts to AGPL v3.0 on **2030-01-01**

**Quick Guide:**
- ✅ **Development/testing**: Free (BSL 1.1)
- ❌ **Production/SaaS**: Commercial license required

For detailed licensing information, see [License Documentation](docs/license.md).

---

**Ready to build enterprise-grade applications without the complexity?**

[Get Started](docs/getting-started.md) | [View Examples](docs/examples.md) | [Read Documentation](docs/README.md)

*jPulse Framework - Powerful simplicity for enterprise applications*
