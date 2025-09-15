# jPulse Framework v0.7.2

A modern, lightweight web application framework designed for enterprise and government organizations. Built with Node.js, Express, and MongoDB, jPulse combines the simplicity of traditional server-side rendering with modern development practices.

## Why jPulse?

### 🎯 **Enterprise-Focused**
Designed specifically for midsize to large organizations in government and private sectors, with built-in security, compliance, and scalability features.

### 🚀 **"Don't Make Me Think" Philosophy**
Clean APIs, zero-configuration auto-discovery, and intuitive development patterns that eliminate cognitive load and accelerate development.

### 🔄 **Seamless Updates**
Revolutionary W-014 Site Override Architecture enables framework updates without losing customizations - your site code stays safe in the `site/` directory.

### 🏗️ **MVC Architecture**
Clean separation of concerns with automatic controller discovery, flexible templating, and standardized data access patterns.

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
npx jpulse-setup

# Install dependencies and start development
npm install
npm run dev
# Visit http://localhost:8080

# For production deployment, see the generated deploy/ directory
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

- **Site Override System**: Customize without fear of losing changes during updates
- **Zero Configuration**: Auto-discovery of controllers, routes, and APIs
- **Enterprise Security**: Built-in authentication, session management, and security headers
- **Internationalization**: Complete i18n support with dynamic translation loading
- **Testing Framework**: 400+ tests with automated cleanup and isolation
- **Production Ready**: nginx integration, PM2 clustering, MongoDB replica sets

## Architecture Overview

### Site Structure (After `npx jpulse-setup`)

```
my-jpulse-site/
├── webapp/               # Framework files (managed by jpulse-sync)
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
└── package.json          # Dependencies (@peterthoeny/jpulse-framework)
```

**File Resolution Priority:**
1. `site/webapp/[path]` (your customizations)
2. `webapp/[path]` (framework defaults)

**Framework Updates:**
```bash
npm run update  # Updates framework to latest version
# or manually:
npm update @peterthoeny/jpulse-framework && npx jpulse-sync
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

- ✅ **Package Distribution (v0.5.5)** - npm-based site creation with `npx jpulse-setup`
- ✅ **Enterprise UI Widgets (v0.5.2)** - Complete dialog system with draggable windows
- ✅ **Site Development Guidelines (v0.5.1)** - Comprehensive development framework
- ✅ **Site Override Architecture (v0.5.0)** - Seamless framework updates
- ✅ **Admin Configuration System (v0.4.10)** - Intuitive settings management

## Community & Support

- **Documentation**: Complete guides in `/docs/` directory
- **GitHub**: Issues, discussions, and contributions welcome
- **License**: AGPL v3 (with commercial licensing available)
- **Roadmap**: [Development roadmap](docs/dev/roadmap.md) with clear milestones

## Enterprise Advantages

- **Stability**: Backward-compatible updates with clear migration paths
- **Security**: Built-in security best practices and regular audits
- **Scalability**: Horizontal scaling with session clustering and database sharding
- **Maintainability**: Clean architecture with comprehensive documentation
- **Cost-Effective**: Open source with optional enterprise support

## Licensing

jPulse Framework uses **dual licensing** to balance open source community benefits with commercial sustainability:

### 🆓 **AGPL v3 (Open Source)**
- **Free for**: Open source projects, educational use, evaluation, and development
- **Requirements**: Applications using jPulse must provide source code to users (including web applications)
- **Perfect for**: Government agencies, educational institutions, non-profits, and open source projects
- **Community**: Full access to source code, contributions welcome, transparent development

### 💼 **Commercial License**
- **For**: Proprietary applications, SaaS products, and enterprise deployments
- **Benefits**: No source code disclosure requirements, commercial support, enterprise features
- **Pricing**: Flexible tiers from startup to enterprise (contact for pricing)
- **Includes**: Priority support, commercial plugins, indemnification, and custom development

### 🤔 **Which License Do I Need?**

**Use AGPL v3 if:**
- Building open source applications
- Educational or research projects
- Government/non-profit applications where source sharing is acceptable
- Evaluating jPulse for future commercial use

**Need Commercial License if:**
- Building proprietary web applications or SaaS products
- Cannot share source code due to business/regulatory requirements
- Need enterprise support, SLA, or indemnification
- Want access to commercial-only features and plugins

**Contact**: [licensing@jpulse.net](mailto:licensing@jpulse.net) for commercial licensing inquiries.

---

**Ready to build enterprise-grade applications without the complexity?**

[Get Started](docs/getting-started.md) | [View Examples](docs/examples.md) | [Read Documentation](docs/README.md)

*jPulse Framework - Powerful simplicity for enterprise applications*
