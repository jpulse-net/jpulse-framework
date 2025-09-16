# jPulse Framework / Production Deployment Guide v0.7.3

A comprehensive guide for deploying jPulse Framework sites to production environments. This documentation is accessible on all jPulse sites at `/jpulse/deployment`.

## 🚀 Quick Start (5-Minute Deployment)

The fastest way to deploy a jPulse site to production:

```bash
# 1. Create site with deployment package
mkdir my-site && cd my-site
npx jpulse-setup
# Choose "production" when prompted

# 2. Install dependencies
npm install

# 3. System setup (run as root)
sudo ./deploy/install-system.sh

# 4. Configure environment
nano .env  # Review generated settings

# 5. Database setup (run as application user)
source .env && ./deploy/mongodb-setup.sh

# 6. Validate installation
./deploy/install-test.sh

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

When you run `npx jpulse-setup` with production deployment:

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
   # Edit deploy/install-system.sh to comment out nginx installation
   # Or install nginx but don't enable it
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
   # Don't run ./deploy/mongodb-setup.sh
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

**Symptoms**: Site breaks after `npm update` or `jpulse-sync`
```bash
# Safe update process
npm run update --dry-run  # Preview changes
npm update @peterthoeny/jpulse-framework
npx jpulse-sync  # Sync framework files

# If update fails:
# 1. Check site/webapp/app.conf for compatibility
# 2. Review CHANGELOG.md for breaking changes
# 3. Test with ./deploy/install-test.sh
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
./deploy/install-test.sh
# This will identify most configuration issues
```

**Recovery Procedures**:
1. **Configuration Reset**: Regenerate configs with `npx jpulse-setup --deploy`
2. **Database Reset**: Re-run `./deploy/mongodb-setup.sh` (will preserve existing data)
3. **Process Reset**: `pm2 delete all && pm2 start deploy/ecosystem.prod.config.cjs`
4. **Full Reinstall**: Re-run `sudo ./deploy/install-system.sh`

### Getting Help

1. **Check site documentation**: Visit `/jpulse/` on your running site
2. **Review deployment logs**: Check PM2 logs and system logs
3. **Validate configuration**: Run `./deploy/install-test.sh`
4. **Framework documentation**: Available at `/jpulse/docs/`

## 📚 Reference Documentation

### Generated Documentation
- **Site README.md**: Site-specific deployment information
- **deploy/README.md**: Framework deployment concepts and procedures
- **deploy/install-test.sh**: Comprehensive validation suite

### Framework Documentation
Available on all jPulse sites at `/jpulse/`:
- **Installation Guide**: `/jpulse/installation`
- **Getting Started**: `/jpulse/getting-started`
- **API Reference**: `/jpulse/api-reference`
- **Site Customization**: `/jpulse/site-customization`

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

### Security Updates
- **System Updates**: Configure automatic security updates
- **Framework Updates**: Monitor for jPulse security releases
- **Dependency Updates**: Regular `npm audit` and updates
- **Certificate Renewal**: Verify Let's Encrypt auto-renewal

## 📊 Monitoring and Maintenance

### Health Monitoring
```bash
# Daily health check
./deploy/install-test.sh

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

---

**Next Steps After Deployment**:
1. **Test Your Site**: Verify all functionality works
2. **Configure Monitoring**: Set up health checks and alerts
3. **Plan Backups**: Implement regular backup procedures
4. **Review Security**: Complete security hardening checklist
5. **Document Customizations**: Record any manual configuration changes

*This deployment guide focuses on single-server deployments. Multi-server deployment documentation is planned for future releases.*