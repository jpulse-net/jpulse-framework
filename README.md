# jPulse Framework v0.5.3

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

```
jpulse-framework/
├── webapp/               # Framework core (updatable)
│   ├── controller/       # Base controllers
│   ├── model/            # Data models
│   ├── view/             # Base templates
│   └── static/           # Framework assets
└── site/                 # Your customizations (update-safe)
    └── webapp/           # Site-specific overrides
```

**File Resolution Priority:**
1. `site/webapp/[path]` (your customizations)
2. `webapp/[path]` (framework defaults)

## Documentation

- **[Getting Started](docs/getting-started.md)** - Build your first jPulse site
- **[Installation Guide](docs/installation.md)** - Setup for all environments
- **[Site Customization](docs/site-customization.md)** - Master the W-014 override system
- **[API Reference](docs/api-reference.md)** - Complete framework API
- **[Examples](docs/examples.md)** - Real-world enterprise scenarios
- **[Deployment Guide](docs/deployment.md)** - Production deployment
- **[Developer Documentation](docs/dev/README.md)** - Architecture and development

## Target Organizations

- **Government Agencies** - Federal, state, and local government applications
- **Healthcare Systems** - HIPAA-compliant patient portals and internal tools
- **Educational Institutions** - Student information systems and administrative tools
- **Financial Services** - Secure internal applications and customer portals
- **Professional Services** - Client portals and internal management systems

## Latest Release Highlights

- ✅ **Enterprise UI Widgets (v0.5.2)** - Complete dialog system with draggable windows
- ✅ **Site Development Guidelines (v0.5.1)** - Comprehensive development framework
- ✅ **Site Override Architecture (v0.5.0)** - Seamless framework updates
- ✅ **Admin Configuration System (v0.4.10)** - Intuitive settings management
- ✅ **CSS Prefix Convention (v0.4.9)** - Clean style organization

## Community & Support

- **Documentation**: Complete guides in `/docs/` directory
- **GitHub**: Issues, discussions, and contributions welcome
- **License**: GPL v3
- **Roadmap**: [Development roadmap](docs/dev/roadmap.md) with clear milestones

## Enterprise Advantages

- **Stability**: Backward-compatible updates with clear migration paths
- **Security**: Built-in security best practices and regular audits
- **Scalability**: Horizontal scaling with session clustering and database sharding
- **Maintainability**: Clean architecture with comprehensive documentation
- **Cost-Effective**: Open source with optional enterprise support

---

**Ready to build enterprise-grade applications without the complexity?**

[Get Started](docs/getting-started.md) | [View Examples](docs/examples.md) | [Read Documentation](docs/README.md)

*jPulse Framework - Powerful simplicity for enterprise applications*
