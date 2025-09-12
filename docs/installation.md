# jPulse Framework / Docs / Site Installation Guide v0.6.3

This guide covers creating and setting up jPulse sites for development and production environments.

> **Framework Development**: See [Framework Development Installation](dev/installation.md) for contributing to jPulse itself.

## Prerequisites

### Required
- **Node.js 18+** - JavaScript runtime
- **npm** - Package manager
- **MongoDB 4.4+** - Database (required for user management, configuration, and logging)

### Optional
- **nginx** - Web server (for production deployment)

## Site Installation

### 1. Create New Site
```bash
# Create a new jPulse site
mkdir my-jpulse-site && cd my-jpulse-site
npm install @jpulse/framework
npx jpulse-setup
```

### 2. Configure Site
```bash
# Copy and customize site configuration
cp site/webapp/app.conf.tmpl site/webapp/app.conf
# Edit site/webapp/app.conf with your settings
```

### 3. Start Development Server
```bash
# Start the development server
npm start
```

The application will be available at `http://localhost:8080`

### 4. Update Framework (When Needed)
```bash
# Update to latest framework version
npm run update

# Or manually:
npm update @jpulse/framework
npx jpulse-sync
```

## Database Setup (Required)

### MongoDB Installation

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

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Ubuntu/Debian:**
```bash
# Install MongoDB
sudo apt update
sudo apt install mongodb

# Start MongoDB service
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**macOS (using Homebrew):**
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb/brew/mongodb-community
```

**Windows:**
1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Run the installer with default settings
3. MongoDB will start automatically as a Windows service

### Database Configuration

Edit `site/webapp/app.conf` to configure database connection:

```javascript
{
    database: {
        enabled: true,
        host: 'localhost',
        port: 27017,
        name: 'jpulse_dev',
        // For replica sets:
        // replicaSet: 'rs0',
        // hosts: ['localhost:27017', 'localhost:27018', 'localhost:27019']
    }
}
```

## Environment Configuration

### Development Environment
Your site uses `site/webapp/app.conf` for development configuration:

```javascript
{
    app: {
        environment: 'development',
        port: 8080,
        sessionSecret: 'your-dev-secret-key'
    },
    database: {
        enabled: true,
        host: 'localhost',
        port: 27017,
        name: 'jpulse_dev'
    }
}
```

### Production Environment
For production, create environment-specific configuration:

```javascript
{
    app: {
        environment: 'production',
        port: 8081,
        sessionSecret: process.env.SESSION_SECRET
    },
    database: {
        enabled: true,
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 27017,
        name: process.env.DB_NAME || 'jpulse_prod'
    }
}
```

## Site Customization

Your site structure is automatically created by `npx jpulse-setup`. To customize your site:

### 1. Site Configuration
Edit `site/webapp/app.conf` for site-specific settings:

```javascript
{
    app: {
        name: 'My Organization',
        shortName: 'My Org',
        siteId: 'my-org-001'
    },
    // Override framework defaults as needed
}
```

### 2. Add Custom Content
- **Controllers**: Create `site/webapp/controller/[name].js`
- **Views**: Create `site/webapp/view/[path]/[name].shtml`
- **Models**: Create `site/webapp/model/[name].js`
- **Assets**: Place in `site/webapp/static/[path]/`

### 3. Verify Customizations
Restart the server and check that your customizations are loaded:

```bash
npm start
# Your site overrides will automatically take priority
```

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find process using port 8080
lsof -i :8080

# Kill the process or change port in app.conf
```

**MongoDB connection failed:**
- Verify MongoDB is running: `sudo systemctl status mongod`
- Check connection settings in `app.conf`
- Ensure database name doesn't contain invalid characters
- Check MongoDB logs: `sudo journalctl -u mongod`

**Permission errors:**
```bash
# Fix npm permissions (Unix/macOS)
sudo chown -R $(whoami) ~/.npm

# Or use npm's built-in fix
npm config set prefix ~/.npm-global
```

**Test failures:**
- Ensure no other jPulse instances are running
- Clear any test databases: `npm run test:cleanup`
- Check Node.js version: `node --version` (should be 18+)

### Getting Help

- Check the [troubleshooting guide](troubleshooting.md) for common issues
- Review [getting started tutorial](getting-started.md) for next steps
- See [deployment guide](deployment.md) for production setup

---

*Next: [Getting Started Guide](getting-started.md)*
