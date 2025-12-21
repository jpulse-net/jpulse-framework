# jPulse Docs / Production Deployment Guide v1.3.21

A comprehensive guide for deploying jPulse Framework sites to production environments. This documentation is accessible on all jPulse sites at `/jpulse-docs/deployment`.

## 🚀 Quick Start (5-Minute Deployment)

The fastest way to deploy a jPulse site to production:

```bash
# 1. Create site with deployment package
mkdir my-site && cd my-site
npx jpulse-install
npx jpulse configure
# Choose "production" when prompted

# 2. Install dependencies
npm install

# 3. System setup (run as root)
sudo npx jpulse setup

# 4. Configure environment
nano .env  # Review generated settings

# 5. Database setup (run as application user)
npx jpulse mongodb-setup

# 6. Validate installation
npx jpulse validate

# 7. Start production
pm2 start deploy/ecosystem.prod.config.cjs
pm2 save
```

**Expected Time**: 5-10 minutes for standard single-server deployment.

**Success Indicators**:
- ✅ All validation tests pass
- ✅ Site responds at configured domain
- ✅ Admin login works
- ✅ PM2 shows running processes

## 📋 Deployment Overview

### What jpulse-setup Creates

When you run `npx jpulse configure` with production deployment:

```
my-site/
├── deploy/                    # Complete deployment package
│   ├── README.md             # Framework deployment guide
│   ├── install-system.sh     # System dependencies installer
│   ├── install-test.sh       # Deployment validator
│   ├── mongodb-setup.sh      # Database setup script
│   ├── nginx.prod.conf       # Web server configuration
│   ├── ecosystem.prod.config.cjs  # Process manager config
│   └── env.tmpl              # Environment template
├── .env                      # Environment variables (generated)
├── site/webapp/app.conf      # Site configuration
└── README.md                 # Site-specific deployment guide
```

### Deployment Architecture

**Single-Server Setup** (current focus):
- **nginx**: Web server, SSL termination, static file serving
- **Node.js**: Application server (managed by PM2)
- **MongoDB**: Database (local instance)
- **PM2**: Process manager with auto-restart

**Multi-Server Setup**: Planned for future work items.

## 🔧 Prerequisites

### Server Requirements
- **OS**: Red Hat Enterprise Linux 8+, Rocky Linux 8+, Ubuntu 20.04+
- **Resources**: Minimum 2GB RAM, 2 CPU cores
- **Network**: Domain name with DNS configured
- **Access**: Root access for system installation

### Before You Start
1. **Domain Setup**: Ensure DNS points to your server
2. **SSL Planning**: Decide on Let's Encrypt vs custom certificates
3. **Security Review**: Firewall rules, SSH key authentication
4. **Backup Strategy**: Plan for database and application backups

## 🛠️ Manual Configuration (Special Cases)

For deployments requiring custom configuration (e.g., behind existing reverse proxies):

### Custom Web Server Setup

If you need to integrate with existing infrastructure (like httpd proxy):

1. **Skip nginx installation**:
```bash
   # The system install script will detect existing web servers
   # You can choose to skip nginx installation during setup
   sudo npx jpulse setup
   ```

2. **Configure your existing proxy**:
   ```apache
   # Example httpd configuration
   ProxyPass /static/ !
   ProxyPass / http://localhost:8081/
   ProxyPassReverse / http://localhost:8081/
   ```

3. **Update jPulse configuration**:
```javascript
   // site/webapp/app.conf
{
    app: {
           trustProxy: true,  // Important for proxy setups
           port: 8081
    }
}
```

### Custom Database Configuration

For external MongoDB or replica sets:

1. **Skip local MongoDB setup**:
```bash
   # Don't run npx jpulse mongodb-setup
   # Configure external database instead
```

2. **Configure external database**:
```bash
   # In .env file
   export DB_HOST=your-mongodb-server
   export DB_PORT=27017
   export DB_REPLICA_SET=your-replica-set
   ```

### Environment-Specific Customizations

Edit `.env` file for your specific requirements:
- Custom ports and domains
- External service integrations
- Logging configurations
- SSL certificate paths

## 🚨 Troubleshooting Guide

### Quick Diagnostics

**Health Check Command**:
```bash
# Run this to get deployment status overview
echo "🔍 jPulse Deployment Health Check"
echo "================================="
echo "Framework Version: $(grep '@version' webapp/app.js | head -1)"
echo "PM2 Status: $(pm2 list | grep jpulse || echo 'Not running')"
echo "nginx Status: $(sudo systemctl is-active nginx 2>/dev/null || echo 'Not installed/running')"
echo "MongoDB Status: $(sudo systemctl is-active mongod 2>/dev/null || echo 'Not installed/running')"
echo "Site Response: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:8081/ || echo 'No response')"
```

### Common jPulse Issues

#### 1. Application Won't Start

**Symptoms**: PM2 shows stopped/errored processes
```bash
# Diagnose
pm2 logs jpulse-app
pm2 describe jpulse-app

# Common causes and fixes:
# - Port already in use: Change PORT in .env
# - Database connection: Check DB_* variables in .env
# - Permission issues: Check file ownership and log directories
```

#### 2. Database Connection Failures

**Symptoms**: "MongoNetworkError" or "Authentication failed"
```bash
# Test MongoDB connectivity
mongosh --eval "db.runCommand('ping')"

# Check MongoDB service
sudo systemctl status mongod

# Verify credentials
source .env && echo "Connecting as: $DB_USER to $DB_NAME"

# Common fixes:
# - Restart MongoDB: sudo systemctl restart mongod
# - Check .env credentials match database users
# - Verify MongoDB is listening on correct port
```

#### 3. Framework Update Issues

**Symptoms**: Site breaks after framework update
```bash
# Safe update process
npx jpulse update  # Updates to latest and syncs files

# If update fails:
# 1. Check site/webapp/app.conf for compatibility
# 2. Review CHANGELOG.md for breaking changes
# 3. Test with npx jpulse validate
```

#### 4. SSL/HTTPS Issues

**Symptoms**: Certificate errors, mixed content warnings
```bash
# Check certificate status
sudo certbot certificates

# Test SSL configuration
sudo nginx -t

# Renew certificates
sudo certbot renew

# Common fixes:
# - Update nginx configuration for new certificates
# - Check firewall allows ports 80/443
# - Verify domain DNS points to server
```

#### 5. Static File Issues

**Symptoms**: CSS/JS not loading, 404 errors for assets
```bash
# Check nginx static file configuration
sudo nginx -t
sudo systemctl reload nginx

# Verify file permissions
ls -la webapp/static/
ls -la site/webapp/static/

# Common fixes:
# - Check nginx.prod.conf static file paths
# - Verify file ownership (should be readable by nginx)
# - Clear browser cache
```

### Validation and Recovery

**Run Full Validation**:
```bash
npx jpulse validate
# This will identify most configuration issues
```

**Recovery Procedures**:
1. **Configuration Reset**: Regenerate configs with `npx jpulse configure`
2. **Database Reset**: Re-run `npx jpulse mongodb-setup` (will preserve existing data)
3. **Process Reset**: `pm2 delete all && pm2 start deploy/ecosystem.prod.config.cjs`
4. **Full Reinstall**: Re-run `sudo npx jpulse setup`

### Getting Help

1. **Check site documentation**: Visit `/jpulse-docs/` on your running site
2. **Review deployment logs**: Check PM2 logs and system logs
3. **Validate configuration**: Run `npx jpulse validate`
4. **Framework documentation**: Available at `/jpulse-docs/docs/`

## 📚 Reference Documentation

### Generated Documentation
- **Site README.md**: Site-specific deployment information
- **deploy/README.md**: Framework deployment concepts and procedures
- **npx jpulse validate**: Comprehensive validation suite

### Framework Documentation
Available on all jPulse sites at `/jpulse-docs/`:
- **Installation Guide**: `/jpulse-docs/installation`
- **Getting Started**: `/jpulse-docs/getting-started`
- **API Reference**: `/jpulse-docs/api-reference`
- **Site Customization**: `/jpulse-docs/site-customization`

### Configuration Files

**Environment Variables** (`.env`):
- Generated from `deploy/env.tmpl`
- Contains all deployment-specific settings
- Source before running deployment scripts

**Application Configuration** (`site/webapp/app.conf`):
- jPulse application settings
- Generated by `jpulse-setup` based on deployment type
- Override framework defaults

**Process Management** (`deploy/ecosystem.prod.config.cjs`):
- PM2 configuration for production
- Cluster mode, auto-restart, logging
- Generated based on server specifications

## 🔒 Security Considerations

> **📖 Complete Security Guide**: See [Security & Authentication](security-and-auth.md) for comprehensive documentation on authentication, authorization, session management, security headers, and security best practices.

### Automated Security Setup
The deployment scripts handle:
- MongoDB authentication and user creation
- nginx security headers and SSL configuration
- PM2 process isolation and restart policies
- Firewall configuration (basic rules)

### Manual Security Review
After deployment, review:
- **SSH Configuration**: Disable password authentication
- **Firewall Rules**: Restrict access to necessary ports only
- **SSL Certificates**: Ensure auto-renewal is configured
- **Database Access**: Verify MongoDB is not publicly accessible
- **Application Logs**: Monitor for security events
- **Session Security**: Review session secret and cookie settings (see [Security Guide](security-and-auth.md#session-management))

### Security Updates
- **System Updates**: Configure automatic security updates
- **Framework Updates**: Monitor for jPulse security releases
- **Dependency Updates**: Regular `npm audit` and updates
- **Certificate Renewal**: Verify Let's Encrypt auto-renewal

## 📊 Monitoring and Maintenance

### Health Monitoring
```bash
# Daily health check
npx jpulse validate

# Process monitoring
pm2 monit

# Resource monitoring
htop
df -h
```

### Backup Procedures
```bash
# Database backup (automated via cron)
mongodump --host localhost --port 27017 --db your_db_name --out /backup/$(date +%Y%m%d)

# Application backup
tar -czf /backup/app-$(date +%Y%m%d).tar.gz /opt/jpulse/
```

### Log Management
- **Application Logs**: PM2 handles log rotation
- **System Logs**: Standard systemd journal
- **nginx Logs**: `/var/log/nginx/`
- **MongoDB Logs**: `/var/log/mongodb/`

## 🔄 Version Control and Site Management

### GitHub Repository Setup

For site owners who want to version control their jPulse site, setting up a GitHub repository provides several benefits:
- **Team Collaboration**: Multiple developers can work on site customizations
- **Change Tracking**: Full history of site modifications and customizations
- **Deployment Automation**: Deploy from git repository to multiple environments
- **Backup**: Additional backup layer for site customizations

#### Initial Repository Setup

**Step 1: Initialize Git Repository**
```bash
cd /path/to/your/jpulse/site
git init
git remote add origin git@github.com:username/your-site.git
```

**Step 2: Create .gitignore File**
```bash
cat > .gitignore << 'EOF'
# CRITICAL: Environment and secrets
.env
.env.*

# Site-specific configuration (each deployment customizes)
site/webapp/app.conf
# But keep template files for reference
!site/webapp/app.conf.tmpl

# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Logs (symbolic link to system logs)
logs
*.log

# Local work files
.jpulse/
commit-message*.txt
tt-*
*.save[0-9]
*.save[0-9][0-9]
*.bak

# Coverage and test files
coverage/
*.lcov
.nyc_output
webapp/tests/fixtures/temp-*.conf

# Optional npm cache directory
.npm
.eslintcache

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
EOF
```

**Step 3: Initial Commit**
```bash
git add .
git commit -m "Initial commit: jPulse site setup

- Complete jPulse site structure with framework files
- Site customization directory structure
- Package.json with @jpulse-net/jpulse-framework dependency
- Deployment configuration templates
- README and documentation files

Generated by: npx jpulse configure
Framework version: v0.8.1"

git branch -M main
git push -u origin main
```

#### What to Include/Exclude

**✅ INCLUDE in Git:**
- `webapp/` - Framework files (managed by jpulse-update)
- `site/` - Your customizations (update-safe)
- `package.json` - Dependencies and scripts
- `README.md` - Site documentation
- `deploy/` templates - Deployment configuration templates

**❌ EXCLUDE from Git:**
- `.env` - Contains secrets (DB passwords, session secrets, API keys)
- `site/webapp/app.conf` - Site-specific configuration with sensitive data
- `logs` - Symbolic link to system log directory
- `node_modules/` - Dependencies (installed via npm install)
- `.jpulse/` - Runtime framework metadata

#### Deployment from Repository

```bash
# Fresh deployment from repository
git clone git@github.com:username/your-site.git
cd your-site
npm install                    # Install framework
cp deploy/env.tmpl .env       # Create environment file
nano .env                     # Customize for environment
npx jpulse mongodb-setup  # Setup database
npx jpulse validate       # Validate deployment
pm2 start deploy/ecosystem.prod.config.cjs
```

#### Security Considerations

- **Never commit secrets**: .env files contain database passwords and session secrets
- **Template files only**: Keep .tmpl files for reference, exclude actual config files
- **Environment-specific configs**: Each deployment customizes app.conf
- **Review commits**: Ensure no sensitive data is accidentally committed

This approach ensures security while enabling team collaboration and deployment automation.

---

**Next Steps After Deployment**:
1. **Test Your Site**: Verify all functionality works
2. **Configure Monitoring**: Set up health checks and alerts
3. **Plan Backups**: Implement regular backup procedures
4. **Review Security**: Complete security hardening checklist
5. **Document Customizations**: Record any manual configuration changes

*This deployment guide focuses on single-server deployments. Multi-server deployment documentation is planned for future releases.*