# jPulse Framework / Docs / Framework Overview

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

## Getting Started

1. **[Installation](installation.md)** - Set up jPulse in your environment
2. **[Getting Started](getting-started.md)** - Build your first jPulse site
3. **[Site Customization](site-customization.md)** - Learn the W-014 override system
4. **[Examples](examples.md)** - Real-world usage scenarios
5. **[API Reference](api-reference.md)** - Complete API documentation
6. **[Deployment](deployment.md)** - Production deployment guide

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

- **Documentation**: Complete guides in this `/docs/` directory
- **API Reference**: [api-reference.md](api-reference.md)
- **Developer Docs**: [dev/README.md](dev/README.md)
- **Change Log**: [CHANGELOG.md](CHANGELOG.md)

---

*jPulse Framework - Don't make me think, just build great applications.*
