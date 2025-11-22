# %SITE_NAME% - Site based on jPulse Framework v1.2.2

A production-ready jPulse Framework site created with `npx jpulse configure`.

___________________________________________________________
## 📝 About This README

**This README is for documenting YOUR site.** Please customize it to describe:
- What your site does
- How to configure it for your organization
- Any custom features you've added
- Site-specific deployment notes

**Commit your entire site to a repository** - including this README, your customizations in `site/`, and deployment configurations in `deploy/`.

___________________________________________________________
## 🏗️ %SITE_NAME% Customization Notes

*Document your site-specific customizations here:*

### Objectives

*Document the purpose of your site here:*

### User Documentation

*Add links to end user documentation here:*

### Custom Features
- [ ] Add description of custom controllers
- [ ] Add description of custom views
- [ ] Add description of custom styling
- [ ] Add description of integrations

### Configuration Notes
- [ ] Document environment variables specific to your site
- [ ] Document any manual configuration steps
- [ ] Document backup procedures
- [ ] Document monitoring setup

### Deployment Notes
- [ ] Document production server details
- [ ] Document SSL certificate setup
- [ ] Document database configuration
- [ ] Document any custom deployment steps

___________________________________________________________
## 🚀 Quick Start - First Deployment of this Site

### Development Deployment
```bash
npm install          # Install dependencies
npm run dev          # Start development server
open http://localhost:8080/
```

### Production Deployment
```bash
sudo npx jpulse setup           # System setup (as root)
nano .env                       # Configure environment
npx jpulse mongodb-setup        # Database setup
npx jpulse validate             # Validate installation
pm2 start deploy/ecosystem.prod.config.cjs && pm2 save  # Start production
```

**Expected Time**: 5-10 minutes for standard deployment.

## 📁 Site Information

- **Site ID**: %JPULSE_SITE_ID%
- **Generated**: %GENERATION_DATE%
- **Deployment**: %DEPLOYMENT_TYPE%
- **Domain**: %DOMAIN_NAME%

## 📚 Documentation & Help

### Framework Documentation (On Your Site)
- **Main Docs**: https://%DOMAIN_NAME%/jpulse/
- **Deployment Guide**: https://%DOMAIN_NAME%/jpulse/deployment
- **Site Customization**: https://%DOMAIN_NAME%/jpulse/site-customization

### Deployment Guides
- **Site Integration**: `deploy/README.md` (comprehensive deployment procedures)
- **Quick Troubleshooting**: Run `npx jpulse validate` for diagnostics

### Framework Support
- [GitHub Repository](https://github.com/jpulse-net/jpulse-framework)
- [Issue Tracker](https://github.com/jpulse-net/jpulse-framework/issues)

---

<!--
 * @name            jPulse Framework / Site README
 * @tagline         Site-specific README for sites based on jPulse Framework
 * @description     Generated README for sites created with npx jpulse configure
 * @site            %SITE_NAME%
 * @generated       %GENERATION_DATE%
 * @file            templates/README.md
 * @release         2025-11-22
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
-->
