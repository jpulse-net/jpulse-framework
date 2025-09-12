# jPulse Framework / Docs / Site Administrator & Developer Documentation v0.5.5

**For Site Administrators & Site Developers**

Welcome to the ![Logo](./images/favicon-16x16.png) jPulse Framework documentation - your complete guide to building enterprise-grade web applications.

## What is jPulse?

jPulse is a Node.js web application framework that combines the simplicity of traditional server-side rendering with modern development practices. Built on Express and MongoDB, it offers clean MVC architecture with extensible site customization capabilities.

## Latest Release Highlights

- ✅ **Package Distribution (v0.5.5)**: Create new sites with `npx jpulse-setup` - clean repository separation
- ✅ **Markdown Documentation System (v0.5.4)**: Complete documentation system with API standardization and i18n support
- ✅ **Enterprise UI Widgets (v0.5.2)**: Complete UI widget system with draggable dialogs and form interactions
- ✅ **Site Override Architecture (v0.5.0)**: Seamless framework updates while preserving site modifications
- ✅ **Admin Configuration System (v0.4.10)**: Intuitive interface for email settings and site messages

## Key Features

### 🚀 **Enterprise-Ready Foundation**
- Multi-environment support (development/production)
- Advanced JavaScript-based configuration system
- MongoDB integration with replica set support
- Comprehensive session management

### 🎨 **Modern User Experience**
- Non-blocking slide-down message system
- Responsive design with mobile-first approach
- Professional UI components and widgets
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
- 337+ comprehensive tests with 100% pass rate
- Automated test cleanup and isolation
- CI/CD ready with Jest integration
- Coverage reporting and analysis

## 📚 Documentation Guide

### 🚀 **Getting Started**
- **[Installation Guide](installation.md)** - Setup for development and production environments
- **[Getting Started Tutorial](getting-started.md)** - Build your first jPulse application
- **[Examples](examples.md)** - Real-world implementation patterns and use cases

### 👨‍💻 **Site Development**
- **[Site Customization](site-customization.md)** - Override system for update-safe customizations
- **[Front-End Development](front-end-development.md)** - Complete jPulse JavaScript framework guide
- **[REST API Reference](api-reference.md)** - Complete `/api/1/*` endpoint documentation
- **[Template Reference](template-reference.md)** - Server-side Handlebars system
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
npm install @jpulse/framework
npx jpulse-setup

# Configure and start
cp site/webapp/app.conf.tmpl site/webapp/app.conf
npm start
# Visit http://localhost:8080
```

> **Framework Development**: See [Framework Development Guide](dev/README.md) for contributing to jPulse itself.

## Site Architecture

Your jPulse site follows a clean MVC pattern with update-safe customizations:

```
my-jpulse-site/
├── webapp/                 # Framework files (managed by jpulse-sync)
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
├── package.json            # Dependencies (@jpulse/framework)
└── .jpulse/                # Framework metadata
    ├── app.json            # Consolidated runtime configuration
    └── config-sources.json # Source file tracking
```

## Target Audience

jPulse is designed for:
- **Government agencies** requiring secure, maintainable web applications
- **Private sector organizations** needing scalable internal tools
- **Development teams** building enterprise-grade applications
- **Site administrators** who prefer markdown-based documentation

## Support & Community

### Documentation Resources
- **[Front-End Development](front-end-development.md)** - Primary entry point for client-side developers
- **[REST API Reference](api-reference.md)** - Complete endpoint documentation
- **[Style Reference](style-reference.md)** - Complete CSS framework and components
- **[Template Reference](template-reference.md)** - Server-side integration guide

### Framework Development
- **[Framework Development Guide](dev/README.md)** - Architecture and contribution guide
- **[Version History](CHANGELOG.md)** - Complete changelog and release notes

---

*jPulse Framework - Don't make me think, just build great applications.*
