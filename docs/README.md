# jPulse Framework / Docs / Framework Overview v0.5.3

Welcome to the jPulse Framework - a modern, lightweight web application framework designed for midsize to large organizations in government and private sectors.

## What is jPulse?

jPulse is a Node.js web application framework that combines the simplicity of traditional server-side rendering with modern development practices. Built on Express and MongoDB, it offers clean MVC architecture with extensible site customization capabilities.

## Latest Release Highlights

- ✅ **Enterprise UI Widgets & Dialog System (v0.5.2)**: Complete UI widget system with draggable dialogs, complex form interactions, and accordion components
- ✅ **Site-Specific Coding & Styling Guidelines (v0.5.1)**: Complete site development framework with comprehensive documentation and template system
- ✅ **Site Override Architecture (v0.5.0)**: Complete site customization system enabling seamless framework updates while preserving site modifications
- ✅ **Site Configuration Management (v0.4.10)**: Complete admin configuration system with intuitive interface for email settings and site messages
- ✅ **CSS Prefix Convention (v0.4.9)**: Clear CSS organization with `jp-*` framework styles and `local-*` page-specific styles

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

### 👨‍💻 **For Developers**
- **[Front-End Development](front-end-development.md)** - Complete jPulse JavaScript framework guide
- **[REST API Reference](api-reference.md)** - Complete `/api/1/*` endpoint documentation
- **[Template Reference](template-reference.md)** - Server-side Handlebars system
- **[Style Reference](style-reference.md)** - Complete `jp-*` CSS framework and components

### 🏗️ **Site Building**
- **[Site Customization](site-customization.md)** - W-014 override system for update-safe customizations
- **[Deployment Guide](deployment.md)** - Production deployment strategies and best practices

### 📋 **Reference**
- **[Version History](CHANGELOG.md)** - Complete changelog and release notes
- **[Developer Documentation](dev/README.md)** - Framework architecture and development
- **[Requirements](dev/requirements.md)** - Technical specifications and objectives

## Quick Installation

```bash
# Clone the repository
git clone https://github.com/peterthoeny/jpulse-framework.git
cd jpulse-framework

# Install dependencies
npm install

# Start development server
npm start
# Visit http://localhost:8080
```

## Architecture Overview

jPulse follows a clean MVC pattern with extensible site customization:

```
jpulse-framework/
├── webapp/                 # Framework core (updatable)
│   ├── app.js              # Framework bootstrap
│   ├── app.conf            # Framework configuration defaults
│   ├── controller/         # Base controllers
│   ├── model/              # Data models
│   ├── view/               # Base pages and templates
│   └── static/             # Framework assets
├── site/                   # Site customizations (update-safe)
│   └── webapp/             # Site-specific overrides
│      ├── app.conf         # Site configuration
│      ├── controller/      # Site controllers
│      ├── model/           # Site data models
│      ├── view/            # Site pages and templates
│      └── static/          # Site-specific assets
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

### Framework Resources  
- **[Developer Documentation](dev/README.md)** - Framework architecture and development
- **[Version History](CHANGELOG.md)** - Complete changelog and release notes
- **[Technical Requirements](dev/requirements.md)** - Specifications and objectives

---

*jPulse Framework - Don't make me think, just build great applications.*
