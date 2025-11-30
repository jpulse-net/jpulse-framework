# jPulse Framework v1.3.0 Deployment Guide for %SITE_NAME%

**Site Generated**: %GENERATION_DATE%
**Deployment Type**: %DEPLOYMENT_TYPE%

This guide serves two audiences:
- **Site Administrators** who deploy and manage the site
- **Developers** who customize and extend it

___________________________________________________________
## 🔧 For Site Administrators

*How to deploy, configure, and maintain this jPulse site in production.*

### Quick Production Deployment

**Prerequisites**: RHEL 8+/Ubuntu 20.04+, root access, domain configured

```bash
## 1. System Installation (as root)
sudo npx jpulse setup
## Installs: nginx, MongoDB, PM2, creates jpulse user, configures firewall

## 2. Environment Configuration (as application user)
cp deploy/env.tmpl .env
nano .env  ## Customize for your environment

## 3. Database Setup (as application user)
npx jpulse mongodb-setup
## Creates database, users, applies security settings

## 4. Deployment Validation (as application user)
npx jpulse validate
## Validates system installation and configuration

## 5. Application Start (as application user)
pm2 start deploy/ecosystem.prod.config.cjs
pm2 save
```

### Site Architecture

#### Single-Server Production Stack
```
┌─────────────────┐
│     nginx       │  ← Web server, SSL termination, static files
│   (Port 80/443) │
└─────────┬───────┘
          │
┌─────────▼───────┐
│   Node.js App   │  ← jPulse application server
│   (Port %PORT%)   │     (PM2 cluster mode)
└─────────┬───────┘
          │
┌─────────▼───────┐
│    MongoDB      │  ← Database server
│   (Port 27017)  │     (Local instance)
└─────────────────┘
```

### Configuration Management

#### Environment Variables (`.env`)
Key settings for your deployment:

```bash
## Application
NODE_ENV=%NODE_ENV%
PORT=%PORT%

## Database
DB_NAME=%DB_NAME%
DB_USER=%DB_USER%
DB_PASS='%DB_PASS%'

## Security
SESSION_SECRET=%SESSION_SECRET%

## Site Metadata
JPULSE_SITE_ID=%JPULSE_SITE_ID%
JPULSE_DOMAIN_NAME=%DOMAIN_NAME%
```

#### Custom Deployment Scenarios

**Existing Reverse Proxy (e.g., Apache httpd)**:
1. Skip nginx installation during `sudo npx jpulse setup`
2. Configure your proxy to forward to `http://localhost:%PORT%/`
3. Set `trustProxy: true` in `site/webapp/app.conf`

**External Database**:
1. Skip `npx jpulse mongodb-setup`
2. Configure `DB_HOST`, `DB_PORT`, `DB_REPLICA_SET` in `.env`

### Monitoring & Maintenance

#### Health Monitoring
```bash
## Validate deployment
npx jpulse validate

## Check application status
pm2 status
pm2 logs %JPULSE_SITE_ID%-prod

## Test site response
curl -I http://localhost:%PORT%/
```

#### Backup Procedures
```bash
## Database backup (setup via cron)
mongodump --host localhost --db %DB_NAME% --out /backup/$(date +%Y%m%d)

## Application backup
tar -czf /backup/site-$(date +%Y%m%d).tar.gz /opt/jpulse/
```

#### Framework Updates
```bash
## Safe update process
npx jpulse update  ## Updates package and syncs files, preserves site customizations
npx jpulse validate  ## Validate after update
```

### Troubleshooting

#### Common Issues
- **Site won't start**: Check PM2 logs and database connection
- **SSL problems**: Run `sudo certbot certificates`
- **Database issues**: Test with `mongosh --eval "db.runCommand('ping')"`

#### Getting Help
1. **Run diagnostics**: `npx jpulse validate`
2. **Framework docs**: Visit https://%DOMAIN_NAME%/jpulse/deployment
3. **Support**: https://github.com/jpulse-net/jpulse-framework/issues

___________________________________________________________
## 💻 For Developers

*How to customize and extend this jPulse site with business logic.*

### Development Quick Start

```bash
npm install          ## Install dependencies
npm run dev          ## Start development server
open http://localhost:8080/
```

**Development URLs**:
- **Main Site**: http://localhost:8080/
- **Admin Panel**: http://localhost:8080/admin/
- **Framework Docs**: http://localhost:8080/jpulse/

### jPulse Site Override Architecture

jPulse uses a **Site Override Architecture** where your customizations in `site/webapp/` override framework defaults:

```
my-site/
├── webapp/                ## Framework files (managed by npx jpulse update)
├── site/webapp/           ## Your customizations (safe from updates)
│   ├── app.conf           ## Site configuration
│   ├── controller/        ## Custom controllers
│   ├── model/             ## Custom models
│   ├── view/              ## Custom views
│   └── static/            ## Custom assets
└── deploy/                ## Production deployment package
```

**Key Principle**: Framework updates preserve all `site/` customizations.

### Adding Business Logic

#### Custom Controllers
```bash
## Create custom controller
site/webapp/controller/my-feature.js

## Example controller structure:
export default {
    async index(req, res) {
        // Your business logic here
        res.render('my-feature/index', { data: yourData });
    }
};
```

#### Custom Views
```bash
## Create custom view
site/webapp/view/my-feature/index.shtml

## Views use Handlebars templating with jPulse extensions
```

#### Custom Models
```bash
## Create custom model
site/webapp/model/my-data.js

## Models use MongoDB with jPulse database utilities
```

#### Custom Assets
```bash
## Add custom CSS/JS
site/webapp/static/css/custom.css
site/webapp/static/js/custom.js
```

### Development Resources

#### Framework Documentation
All available on your running site:

- **[Getting Started](https://%DOMAIN_NAME%/jpulse/getting-started)**: Development fundamentals
- **[Site Customization](https://%DOMAIN_NAME%/jpulse/site-customization)**: Override patterns and best practices
- **[API Reference](https://%DOMAIN_NAME%/jpulse/api-reference)**: Framework APIs and utilities
- **[Template Reference](https://%DOMAIN_NAME%/jpulse/template-reference)**: View templating guide
- **[Front-end Development](https://%DOMAIN_NAME%/jpulse/front-end-development)**: Client-side development

#### Key Development Concepts

**MVC Architecture**: Controllers handle requests, Models manage data, Views render responses

**Auto-Discovery**: Controllers are automatically discovered and routed

**Database Integration**: Built-in MongoDB utilities and connection management

**Authentication**: Built-in user management and role-based access control

**Templating**: Handlebars with jPulse extensions for common patterns

### Development Workflow

1. **Create Features**: Add controllers, models, views in `site/webapp/`
2. **Test Locally**: Use `npm run dev` for development (or `npm start`)
3. **Deploy**: Use deployment scripts for production
4. **Update Framework**: `npx jpulse update` preserves customizations

### Configuration for Development

#### Application Configuration (`site/webapp/app.conf`)
```javascript
{
    app: {
        environment: '%NODE_ENV%',
        port: %PORT%,
        // Your custom app settings here
    },
    database: {
        enabled: true,
        name: process.env.DB_NAME,
        // Your custom database settings here
    }
    // Add your custom configuration sections here
}
```

#### Development vs Production
- **Development**: Uses `ecosystem.dev.config.cjs`, single instance, file watching
- **Production**: Uses `ecosystem.prod.config.cjs`, cluster mode, optimized settings

---

### Reference Tables

#### Deployment Scripts
| Script | Purpose | Run As | When |
|--------|---------|--------|------|
| `npx jpulse setup` | System dependencies | root | Initial setup |
| `npx jpulse mongodb-setup` | Database configuration | app user | After system setup |
| `npx jpulse validate` | Deployment validation | app user | After each change |

#### Configuration Files
| File | Purpose | Generated By | Customizable |
|------|---------|--------------|--------------|
| `.env` | Environment variables | npx jpulse configure | Yes |
| `site/webapp/app.conf` | Application config | npx jpulse configure | Yes |
| `deploy/nginx.prod.conf` | Web server config | npx jpulse configure | Yes |
| `deploy/ecosystem.*.cjs` | Process management | npx jpulse configure | Yes |

---

**Framework Support**: https://github.com/jpulse-net/jpulse-framework/issues

<!--
 * @name            jPulse Framework / Deploy / README
 * @tagline         Framework deployment guide for jPulse sites
 * @description     Comprehensive deployment procedures and framework concepts
 * @site            %SITE_NAME%
 * @generated       %GENERATION_DATE%
 * @file            templates/deploy/README.md
 * @release         2025-11-30
 * @repository      https://github.com/jpulse-net/jpulse-framework
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           60%, Cursor 1.7, Claude Sonnet 4
-->