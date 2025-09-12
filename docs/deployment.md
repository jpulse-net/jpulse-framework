# jPulse Framework / Docs / Production Deployment Guide v0.5.5

This guide covers deploying jPulse Framework applications to production environments, including nginx configuration, MongoDB setup, and security considerations.

## Prerequisites

### Server Requirements
- **Red Hat Enterprise Linux 8+, Rocky Linux 8+, Ubuntu 20.04+** (recommended)
- **Node.js 18+** with npm
- **MongoDB 4.4+** (standalone or replica set)
- **nginx 1.18+** (web server and reverse proxy)
- **SSL certificate** (such as Let's Encrypt)
- **Minimum 2GB RAM, 2 CPU cores**

### Security Requirements
- **Firewall configured** (iptables or ufw)
- **SSH key authentication** (disable password auth)
- **Regular security updates** automated
- **Backup strategy** implemented

## MongoDB Production Setup

### Single Instance (Development/Small Production)

**Red Hat/CentOS/Fedora:**
```bash
# Add MongoDB repository
sudo tee /etc/yum.repos.d/mongodb-org-4.4.repo << EOF
[mongodb-org-4.4]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/8/mongodb-org/4.4/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-4.4.asc
EOF

# Install MongoDB
sudo dnf install -y mongodb-org

# Configure MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Secure MongoDB
mongo --eval "db.createUser({user: 'admin', pwd: 'secure_password', roles: ['userAdminAnyDatabase']})"
```

**Ubuntu/Debian:**
```bash
# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list
sudo apt update
sudo apt install -y mongodb-org

# Configure MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Secure MongoDB
mongo --eval "db.createUser({user: 'admin', pwd: 'secure_password', roles: ['userAdminAnyDatabase']})"
```

### Replica Set (High Availability)
```bash
# Edit /etc/mongod.conf on each server
replication:
  replSetName: "jpulse-rs"

net:
  bindIp: 0.0.0.0
  port: 27017

security:
  authorization: enabled
  keyFile: /etc/mongodb-keyfile

# Create keyfile (same on all servers)
sudo openssl rand -base64 756 > /etc/mongodb-keyfile
sudo chmod 400 /etc/mongodb-keyfile
sudo chown mongodb:mongodb /etc/mongodb-keyfile
```

## Application Deployment

### Directory Structure
```bash
# Create application directory
sudo mkdir -p /opt/jpulse-app
sudo chown $USER:$USER /opt/jpulse-app
cd /opt/jpulse-app

# Clone your application
git clone https://github.com/yourorg/your-jpulse-app.git .

# Install dependencies
npm ci --production
```

### Production Configuration
Create `/opt/jpulse-app/webapp/app.conf`:

```javascript
{
    app: {
        environment: 'production',
        port: 8081,
        sessionSecret: process.env.SESSION_SECRET,

        // Security settings
        trustProxy: true,
        secureCookies: true,
        sessionTimeout: 3600
    },

    // Database configuration
    database: {
        enabled: true,
        host: 'localhost',
        port: 27017,
        name: 'jpulse_prod',
        username: process.env.DB_USER,
        password: process.env.DB_PASS
    },

    // Logging
    logging: {
        level: 'info',
        file: '/var/log/jpulse/app.log',
        maxSize: '100MB',
        maxFiles: 10
    }
}
```

## nginx Configuration

### Install nginx

**Red Hat/CentOS/Fedora:**
```bash
sudo dnf install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Site Configuration
Create `/etc/nginx/sites-available/jpulse-app`:

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Static files (served directly by nginx)
    location /static/ {
        alias /opt/jpulse-app/webapp/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # All other requests to Node.js
    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Process Management (PM2)

### Install PM2
```bash
npm install -g pm2
```

### PM2 Configuration
Create `/opt/jpulse-app/ecosystem.config.js`:

```javascript
module.exports = {
    apps: [{
        name: 'jpulse-app',
        script: 'webapp/app.js',
        cwd: '/opt/jpulse-app',
        instances: 'max',
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'production',
            PORT: 8081
        },
        error_file: '/var/log/jpulse/error.log',
        out_file: '/var/log/jpulse/out.log',
        max_memory_restart: '1G'
    }]
};
```

### Start Application
```bash
# Create log directory
sudo mkdir -p /var/log/jpulse
sudo chown $USER:$USER /var/log/jpulse

# Start with PM2
cd /opt/jpulse-app
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

## SSL Certificate (Let's Encrypt)

**Red Hat/CentOS/Fedora:**
```bash
# Install Certbot
sudo dnf install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

**Ubuntu/Debian:**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Security Hardening

### Firewall Configuration
```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny all other traffic
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

## Monitoring & Backup

### Database Backup
Create `/opt/scripts/backup-mongodb.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backup/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="jpulse_prod"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
mongodump --host localhost --port 27017 --db $DB_NAME --out $BACKUP_DIR/$DATE

# Compress backup
tar -czf $BACKUP_DIR/jpulse_backup_$DATE.tar.gz -C $BACKUP_DIR $DATE
rm -rf $BACKUP_DIR/$DATE

# Keep only last 7 days
find $BACKUP_DIR -name "jpulse_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: jpulse_backup_$DATE.tar.gz"
```

### Automated Backups
```bash
# Make script executable
chmod +x /opt/scripts/backup-mongodb.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /opt/scripts/backup-mongodb.sh
```

## Troubleshooting

### Common Issues

**Application won't start:**
```bash
# Check PM2 logs
pm2 logs jpulse-app

# Check system logs
sudo journalctl -u nginx
sudo tail -f /var/log/nginx/error.log
```

**Database connection issues:**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

**SSL certificate issues:**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates manually
sudo certbot renew
```

---

*This deployment guide provides a production-ready setup for jPulse Framework applications with security, monitoring, and backup considerations.*
