# jPulse Framework v1.0.0-rc.2

A modern **MEVN stack** (MongoDB, Express, Vue.js, Node.js) web application framework designed for enterprise and government organizations. Built on **MVC architecture**, jPulse uniquely supports **both MPA and SPA patterns**, giving you the flexibility to choose the right architecture for each part of your application.

**🎉 Release Candidate 2**: Zero-configuration auto-discovery architecture with automatic controller registration, API endpoint detection, and SPA routing.

## Why jPulse?

### 🎯 **Enterprise-Focused**
Designed specifically for midsize to large organizations in government and private sectors, with built-in security, compliance, and scalability features.

### 🚀 **"Don't Make Me Think" Philosophy**
Clean APIs, zero-configuration auto-discovery, and intuitive development patterns that eliminate cognitive load and accelerate development.

### 🔄 **Seamless Updates**
Revolutionary site override architecture enables framework updates without losing customizations - your site code stays safe in the `site/` directory.

### 🏗️ **Flexible Architecture**
**MVC at the core** with support for both **Multi-Page Applications (MPA)** and **Single Page Applications (SPA)**. Use traditional MPA for content-focused pages, enhanced MPA for interactive features, or full SPA for app-like experiences - all in the same application.

### 🎭 **MEVN Stack**
Full-stack JavaScript with **MongoDB** for data, **Express** for routing, **Vue.js** for SPAs, and **Node.js** as the runtime. Optional Vue.js usage means you can build traditional MPAs and/or modern SPAs based on your needs.

### 🤖 **AI-Assisted Development**
jPulse Framework is designed for **Gen-AI development** (aka "vibe coding") - leveraging AI assistants like Cursor, Cline, GitHub Copilot, or Windsurf to accelerate application development while maintaining framework best practices.

## Quick Start

### For Site Development (Recommended)

```bash
# Install jpulse-framework (currently a private repo - requires GitHub token)
# (once public, omit export and ~/.npmrc creation)
export GITHUB_TOKEN=your_github_token
echo "@peterthoeny:registry=https://npm.pkg.github.com" >> ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> ~/.npmrc
# For production servers, use sudo:
sudo npm install -g @peterthoeny/jpulse-framework
# else for service account/sysadmin user account:
#    npm install -g @peterthoeny/jpulse-framework

# Create a new jPulse site
mkdir my-jpulse-site && cd my-jpulse-site
npx jpulse-configure

# Install dependencies and start development
npm install
npm run dev
# Visit http://localhost:8080

# Production deployment commands (generated automatically)
sudo npm run jpulse-install       # Install system dependencies
npm run jpulse-mongodb-setup      # Setup database
npm run jpulse-validate           # Validate installation
npm run jpulse-update             # Update framework files
```

### For Framework Development

```bash
# Clone and install
git clone https://github.com/peterthoeny/jpulse-framework.git
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

### Site Structure (After `npx jpulse-configure`)

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
└── package.json          # Dependencies (@peterthoeny/jpulse-framework)
```

**File Resolution Priority:**
1. `site/webapp/[path]` (your customizations)
2. `webapp/[path]` (framework defaults)

**Framework Updates:**
```bash
npm run update  # Updates framework to latest version
# or manually:
npm update @peterthoeny/jpulse-framework && npm run jpulse-update
```

## Documentation

### For Site Administrators & Site Developers
- **[Getting Started](docs/getting-started.md)** - Build your first jPulse site
- **[Installation Guide](docs/installation.md)** - Setup for all environments
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

- ✅ **Vue.js SPA Demo & Enhanced Utilities (v0.8.5)** - Complete Single Page Application with Vue.js 3, Vue Router, and enhanced jPulse utilities for date formatting and error handling
- ✅ **Hello To-Do MVC Demo (v0.8.4)** - Complete Model-View-Controller demonstration with MongoDB integration and REST API patterns
- ✅ **[MPA vs. SPA Architecture Guide](docs/mpa-vs-spa.md)** - Comprehensive comparison with diagrams showing when to use each pattern
- ✅ **Package Distribution (v0.6.0+)** - npm-based site creation with `npx jpulse-configure`

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
