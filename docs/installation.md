# jPulse Framework / Docs / Installation Guide v0.5.4

This guide covers installing and setting up the jPulse Framework for development and production environments.

## Prerequisites

### Required
- **Node.js 18+** - JavaScript runtime
- **npm or yarn** - Package manager
- **Git** - Version control (for cloning repository)
- **MongoDB 4.4+** - Database (required for user management, configuration, and logging)

### Optional
- **nginx** - Web server (for production deployment)

## Development Installation

### 1. Clone Repository
```bash
# Clone the jPulse Framework
git clone https://github.com/peterthoeny/jpulse-framework.git
cd jpulse-framework
```

### 2. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Or using yarn
yarn install
```

### 3. Start Development Server
```bash
# Start the development server
npm start

# Or using yarn
yarn start
```

The application will be available at `http://localhost:8080`

### 4. Verify Installation
```bash
# Run the test suite
npm test

# Check for 337+ tests passing
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

Edit `webapp/app.conf` to configure database connection:

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
The framework uses `webapp/app.conf` for development configuration:

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

## Site Customization Setup

To create a custom site using the W-014 override system:

### 1. Create Site Structure
```bash
# Create site directory structure
mkdir -p site/webapp/{controller,model,view,static}
```

### 2. Site Configuration
Create `site/webapp/app.conf` for site-specific settings:

```javascript
{
    app: {
        siteName: 'My Organization',
        siteDescription: 'Internal web application'
    },
    // Override framework defaults as needed
}
```

### 3. Verify Site Override
Restart the server and check that site customizations are loaded:

```bash
npm start
# Check console for "Site overrides detected" message
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
