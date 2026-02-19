# jPulse Docs / Site Installation Guide v1.6.19

This guide covers creating and setting up jPulse sites for development and production environments.

**Framework Development**: See [Framework Development Installation](dev/installation.md) for contributing to jPulse itself.

## Prerequisites

### Required
- **Node.js 18+** - JavaScript runtime
- **npm** - Package manager
- **MongoDB 4.4+** - Database (required for user management, configuration, and logging)

### Optional
- **nginx** - Web server (for production deployment)

## System Setup

### Node.js Installation (Red Hat Ecosystem)

For Red Hat Enterprise Linux, CentOS Stream, Rocky Linux, and Fedora systems:

```bash
# Install curl if not already installed
sudo dnf install -y curl

# Add NodeSource repository for Node.js 20.x LTS
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -

# Install Node.js and npm
sudo dnf install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x or higher
```

> **Why NodeSource?** The NodeSource repository provides the latest LTS versions with security updates and integrates well with Red Hat package management for production environments.

### MongoDB Installation (Red Hat Ecosystem)

MongoDB is required for user management, configuration, and logging:

```bash
# Create MongoDB repository file
sudo cat > /etc/yum.repos.d/mongodb-org-7.0.repo << 'EOF'
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/9/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF

# Install MongoDB
sudo dnf install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
```

> **Note**: For production deployments, the `jpulse-configure` process will generate automated MongoDB setup scripts that create the necessary users and databases.

## Site Installation

### 1. Create New Site and Configure Site

```bash
# 1.1 Create your site directory first
mkdir my-jpulse-site && cd my-jpulse-site

# 1.2 Install framework (creates .npmrc and installs from GitHub Packages)
npx jpulse-install

# 1.3 Configure your site
npx jpulse configure

# 1.4 Install dependencies
npm install
```

**jPulse Configure Functionality**: The `npx jpulse configure` command sets up your site by generating configuration files, creating the site directory structure, and prompting for essential settings including site name, admin email, database configuration, and deployment type.

- You must accept the Business Source License 1.1 with Additional Terms (required to continue). jPulse deployments send daily anonymous usage reports to jpulse.net for license compliance monitoring. See the [License Guide](license.md) for details.
- You can opt-in to share your admin email address to access a deployment dashboard at jpulse.net showing compliance status, health insights, and usage history. This can be changed later via Admin Dashboard → Site Configuration → Manifest.

**Alternative Method (Manual Setup):**
Replace step 1.2 with:
```bash
# 1.2.a Create .npmrc for GitHub Packages registry (scoped to @jpulse-net only)
echo "@jpulse-net:registry=https://npm.pkg.github.com" > .npmrc

# 1.2.b Install framework from GitHub Packages registry
npm install @jpulse-net/jpulse-framework
```

### 2. Start Development Server
```bash
# Start the development server
npm start
```

The application will be available at `http://localhost:8080`

### 3. Update jPulse Framework (When Needed)
```bash
# Update to latest production version:
npx jpulse update

# Update to a pre-release (beta, RC):
npx jpulse update @jpulse-net/jpulse-framework@1.0.0-rc.1
```

**How it works**: `npx jpulse update` automatically updates the framework package to the latest version and syncs files. To test a specific version (beta/RC), provide the version argument: `npx jpulse update @jpulse-net/jpulse-framework@version`.

**Version Management**:

- **Bump site version** - Use `npx jpulse bump-version <version>` to update version numbers across site files
- **Configuration file** - `site/webapp/bump-version.conf` controls which files are updated (created automatically on initial setup)

### 4. Validate Installation (Optional)
```bash
# Run comprehensive deployment validation
npx jpulse validate

# This will test:
# - System requirements (Node.js, npm)
# - Database connectivity (if production)
# - Web server configuration (if production)
# - Process manager setup
# - File permissions and SSL certificates
# - Configuration file syntax
```

**New in v0.7.3**: Comprehensive deployment validation suite that automatically detects your deployment type (development vs production) and runs appropriate tests.

## Database Setup

### Development (Local)
For development, MongoDB is required. See the [MongoDB Installation](#mongodb-installation-red-hat-ecosystem) section above for detailed installation instructions for your operating system.

### Production (Automated)
For production deployment, use the automated setup generated by `jpulse-configure`:

#### Step 1: Configure Environment
```bash
# Environment file (.env) is generated automatically by npx jpulse configure
# Edit .env with your actual passwords and settings if needed
nano .env
```

#### Step 2: Setup Database
```bash
# Setup MongoDB (automatically sources .env)
npx jpulse mongodb-setup
```

The MongoDB setup script automatically:
- Creates MongoDB admin user (if not exists)
- Creates application database and user
- Sets up proper authentication and permissions
- Validates existing setup to avoid conflicts
- Provides safety checks and clear error messages

#### Step 3: Verify Database Setup
```bash
# Test database connection
mongosh $DB_NAME -u $DB_USER -p --eval "db.runCommand('ping')"
```

> **Important**: The database setup script must be run BEFORE starting the application in production mode.

> **See**: `deploy/README.md` for complete production deployment guide

### Complete Wipe of MongoDB Data - ⚠️ DANGER ZONE!

Here are the instructions how to completely wipe the MongoDB data. Use this in case you have a configuration issue, and want to start from scratch. Make sure no data from other apps reside on the same MongoDB server.

```bash
# Step 1: Stop MongoDB
sudo systemctl stop mongod

#Step 2: Remove All MongoDB Data
sudo rm -rf /var/lib/mongo/*
sudo rm -rf /var/log/mongodb/*

#Step 3: Reset MongoDB Configuration
sudo cp /etc/mongod.conf /etc/mongod.conf.backup
sudo sed -i 's/^security:/#security:/' /etc/mongod.conf
sudo sed -i 's/^  authorization: enabled/#  authorization: enabled/' /etc/mongod.conf

#Step 4: Start MongoDB Fresh
sudo systemctl start mongod

#Step 5: Verify Clean State
mongosh --eval "show dbs"
#Should only show: admin, config, local (system databases)

#Step 6: Run Fresh Setup
cd /path/to/your/jpulse/site
source .env
npx jpulse mongodb-setup
```

### Manual Production Setup
For custom MongoDB configurations, see [Deployment Guide](deployment.md) for detailed manual setup instructions.

## Process Management

### Development Server Options

**Option 1: Simple Node.js (Recommended for beginners)**
```bash
npm start
```

**Option 2: PM2 with file watching (Recommended for active development)**
```bash
# Start with PM2 development configuration
pm2 start deploy/ecosystem.dev.config.cjs

# View logs
pm2 logs

# Stop when done
pm2 stop all
```

The PM2 development configuration includes:
- Automatic file watching and restart
- Debug mode support (`--inspect`)
- Local log files accessible via `./logs/` (symbolic link to system log directory)
- Single instance (no clustering)

### Production Process Management

For production deployment, use the PM2 production configuration:

```bash
# After setting up environment and database
pm2 start deploy/ecosystem.prod.config.cjs

# Save PM2 configuration for auto-restart
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

The PM2 production configuration includes:
- Cluster mode with configurable instances
- System-level logging (`/var/log/jpulse/`) with convenient `./logs/` symlink access
- Memory monitoring and restart policies
- Health checks and graceful shutdown

> **Application User**: The deployment scripts support both creating a new dedicated `jpulse` user or using an existing admin/service account user. The system install script will prompt you to choose.

> **Note**: The number of PM2 instances is configured during `jpulse-configure` and can be adjusted in `deploy/ecosystem.prod.config.cjs`

## Web Server Configuration

For production deployments, jPulse uses nginx as a reverse proxy. The `jpulse-configure` command automatically generates nginx configuration files for your deployment.

## Site Configuration

### Configuration Structure
jPulse uses a layered configuration system:

1. **Framework defaults**: `webapp/app.conf` (managed by framework)
2. **Site overrides**: `site/webapp/app.conf` (your customizations)

The `jpulse-configure` command automatically generates `site/webapp/app.conf` based on your deployment type.

### Development Configuration
For development deployment, `site/webapp/app.conf` contains minimal overrides:

```javascript
{
    app: {
        name: 'My Site Name',
        shortName: 'My Site'
    },

    deployment: {
        mode: 'dev'  // Uses framework defaults for dev
    },

    middleware: {
        session: {
            secret: 'your-session-secret'
        }
    }
    // Framework provides: port 8080, database jp-dev, etc.
}
```

### Production Configuration
For production deployment, `site/webapp/app.conf` includes environment variable references:

```javascript
{
    app: {
        name: 'My Site Name',
        shortName: 'My Site',
        siteId: 'my-site-id'
    },

    deployment: {
        mode: 'prod'  // Uses framework defaults for prod
    },

    middleware: {
        session: {
            secret: '%SESSION_SECRET%',
            cookie: {
                secure: true,
                maxAge: 3600000
            }
        }
    },

    database: {
        mode: 'standalone',
        standalone: {
            options: {
                authSource: '%DB_NAME%',
                auth: {
                    username: '%DB_USER%',
                    password: '%DB_PASS%'
                }
            }
        }
    }
}
```

### Environment Variables (Production)

For production deployments, create a `.env` file in your site root with required configuration:

```bash
# Site identification (required for Redis namespace isolation)
JPULSE_SITE_ID=my-site-id

# Deployment mode
DEPLOYMENT_MODE=prod

# Session security
SESSION_SECRET=your-random-secret-key-here

# Database credentials
DB_NAME=your-database-name
DB_USER=your-db-user
DB_PASS=your-db-password
DB_ADMIN_USER=admin
DB_ADMIN_PASS=admin-password

# Optional: Log directory
LOG_DIR=/var/log/my-site-id
```

**Important Environment Variables:**

- **`JPULSE_SITE_ID`** (required for multi-site deployments):
  - Unique identifier for this jPulse installation
  - Used for Redis namespace isolation (`siteId:mode:key`)
  - Format: lowercase alphanumeric + hyphens (e.g., `my-site-prod`, `bubblemap-net`)
  - Prevents data mixing when multiple sites share same Redis instance
  - See [Cache Infrastructure - Multi-Site Isolation](cache-infrastructure.md#multi-site-isolation)

- **`DEPLOYMENT_MODE`**: Sets the deployment mode (`dev`, `prod`, `test`)
  - Used for environment-specific configuration and Redis namespace

- **`SESSION_SECRET`**: Random string for session encryption (minimum 32 characters)
  - Generate with: `openssl rand -base64 32`

- **`DB_*`**: MongoDB connection credentials
  - `DB_NAME`: Database name (used for auth source)
  - `DB_USER` / `DB_PASS`: Application database credentials
  - `DB_ADMIN_USER` / `DB_ADMIN_PASS`: MongoDB admin credentials

**Multi-Site Deployments:**

When running multiple jPulse sites on the same server, each site MUST have a unique `JPULSE_SITE_ID`:

```bash
# Site 1: jpulse.net
JPULSE_SITE_ID=jpulse-net
DEPLOYMENT_MODE=prod

# Site 2: bubblemap.net
JPULSE_SITE_ID=bubblemap-net
DEPLOYMENT_MODE=prod
```

This ensures:
- Redis keys are isolated between sites (no data mixing)
- Health metrics show only instances for that site
- Sessions are separate per site
- Configuration changes don't broadcast to wrong site

> **Key Concept**: Site configuration only needs to override framework defaults. The framework provides sensible defaults for ports, database names, and other settings based on `deployment.mode`.

## Site Customization

Your site structure is automatically created by `jpulse-configure`. To add custom functionality:
- **Controllers**: Create `site/webapp/controller/[name].js`
- **Views**: Create `site/webapp/view/[path]/[name].shtml`
- **Models**: Create `site/webapp/model/[name].js`
- **Assets**: Place in `site/webapp/static/[path]/`

### Verify Customizations
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
- Check connection settings in `site/webapp/app.conf`
- Ensure database name doesn't contain invalid characters
- Check MongoDB logs: `sudo journalctl -u mongod`

**Database setup script issues:**
```bash
# If MongoDB setup fails, check environment variables
echo "DB_NAME: $DB_NAME"
echo "DB_USER: $DB_USER"
echo "DB_ADMIN_USER: $DB_ADMIN_USER"

# Verify MongoDB is accessible
mongosh admin --eval "db.runCommand('ping')"

# Check if users already exist
mongosh admin --eval "db.getUsers()"
```

**PM2 process issues:**
```bash
# Check PM2 status
pm2 status

# View application logs
pm2 logs

# Restart application
pm2 restart all

# If PM2 config fails, check file paths
ls -la deploy/ecosystem.*.config.cjs
```

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

- Review [getting started tutorial](getting-started.md) for next steps
- See [deployment guide](deployment.md) for production setup

---

*Next: [Getting Started Guide](getting-started.md)*
