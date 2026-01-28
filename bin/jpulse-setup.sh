#!/bin/bash
##
 # @name            jPulse Framework / Bin / System Setup
 # @tagline         Setup system dependencies for jPulse site
 # @description     This script will install system dependencies for jPulse site
 #                  - Run as root: sudo npx jpulse setup
 #                  - For Red Hat Enterprise Linux ecosystem
 # @file            bin/jpulse-setup.sh
 # @version         1.6.1
 # @release         2026-01-28
 # @repository      https://github.com/jpulse-net/jpulse-framework
 # @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 # @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 # @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 # @genai           60%, Cursor 1.7, Claude Sonnet 4
##

set -e

# Security check - must run as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ SECURITY ERROR: This script must run as root"
    echo "💡 Run with: sudo npx jpulse setup"
    exit 1
fi

# Platform check
if ! command -v dnf >/dev/null 2>&1 && ! command -v yum >/dev/null 2>&1; then
    echo "❌ PLATFORM ERROR: Red Hat Enterprise Linux required"
    echo "💡 Supported: RHEL, Rocky Linux, CentOS, Fedora"
    exit 1
fi

# Load environment variables if .env exists
if [[ -f ".env" ]]; then
    echo "ℹ️  Loading environment from .env..."
    set -a  # automatically export all variables
    source .env
    set +a  # stop automatically exporting
    echo "✅ Environment loaded"
else
    echo "⚠️  No .env file found - using defaults"
fi

echo "🔧 jPulse System Installation (Red Hat Enterprise Linux)"
echo "======================================================"
echo ""
echo "Site: ${JPULSE_SITE_ID:-jPulse-Site}"
echo "Platform: $(cat /etc/redhat-release)"
echo "User: root"
echo ""
echo "This script will install: (unless installed already)"
echo "  1. Node.js 18 LTS"
echo "  2. MongoDB 6.0"
echo "  3. Redis"
echo "  4. nginx"
echo "  5. PM2 process manager"
echo "  6. Configure firewall"
echo "  7. Create application user"
echo ""

read -p "🤔 Proceed with system installation? (y/N): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Installation cancelled"
    exit 1
fi

# Install Node.js (NodeSource repository)
echo "📦 Installing Node.js 18 LTS..."
if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    dnf install -y nodejs
    echo "✅ Node.js installed: $(node --version)"
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Install MongoDB
echo "📦 Installing MongoDB..."
if ! command -v mongosh >/dev/null 2>&1; then
    cat > /etc/yum.repos.d/mongodb-org-6.0.repo << EOF
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/8/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
EOF

    dnf install -y mongodb-org
    echo "✅ MongoDB installed"
else
    echo "✅ MongoDB already installed"
fi

# Install Redis
echo "📦 Installing Redis..."
if ! command -v redis-cli >/dev/null 2>&1; then
    dnf install -y redis
    echo "✅ Redis installed"
else
    echo "✅ Redis already installed"
fi

# Install nginx
echo "📦 Installing nginx..."
if ! command -v nginx >/dev/null 2>&1; then
    dnf install -y nginx
    echo "✅ nginx installed"
else
    echo "✅ nginx already installed"
fi

# Install PM2 globally
echo "📦 Installing PM2..."
if ! command -v pm2 >/dev/null 2>&1; then
    npm install -g pm2
    echo "✅ PM2 installed: $(pm2 --version)"
else
    echo "✅ PM2 already installed: $(pm2 --version)"
fi

# Application user setup
echo "👤 Application User Setup:"
echo ""
# Get the real user who ran sudo
REAL_USER=${SUDO_USER:-$(whoami)}

echo "Choose how to run the jPulse application:"
echo "  1) Use current user '$REAL_USER' (recommended for existing servers)"
echo "  2) Create dedicated 'jpulse' system user (recommended for new servers)"
echo ""
echo "Most users choose option 1 (current user) for simplicity."
echo ""
read -p "? Choose option (1-2): " USER_CHOICE
USER_CHOICE=${USER_CHOICE:-1}

if [[ "$USER_CHOICE" == "2" ]]; then
    if ! id "jpulse" &>/dev/null; then
        useradd -r -s /bin/bash -d /opt/jpulse -m jpulse
        echo "✅ Application user 'jpulse' created"
        APP_USER="jpulse"
    else
        echo "✅ Application user 'jpulse' already exists"
        APP_USER="jpulse"
    fi
else
    echo "ℹ️  Using existing user for application deployment"
    echo "💡 Ensure your user has access to:"
    echo "   - /opt/ directory (for application files)"
    echo "   - Log directory (for log files): ${LOG_DIR:-STDOUT}"
    echo "   - PM2 and MongoDB commands"
    APP_USER=$REAL_USER
    echo "✅ Will use user '$REAL_USER' for deployment guidance"
fi

# Create log directory and PID directory
echo "📁 Creating log and runtime directories..."

# Create PID directory (always needed)
mkdir -p /var/run/jpulse
chmod 755 /var/run/jpulse

# Create log directory only if LOG_DIR is set and not empty
if [[ -n "$LOG_DIR" && "$LOG_DIR" != "" ]]; then
    echo "📁 Creating log directory: $LOG_DIR"
    mkdir -p "$LOG_DIR"

    if [[ "$APP_USER" == "jpulse" ]]; then
        chown jpulse:jpulse "$LOG_DIR"
        chmod 755 "$LOG_DIR"
        chown jpulse:jpulse /var/run/jpulse
    else
        # For existing users, make logs and PID directory owned by the user
        USER_GROUP=$(id -gn $APP_USER)
        chown $APP_USER:$USER_GROUP "$LOG_DIR"
        chmod 755 "$LOG_DIR"
        chown $APP_USER:$USER_GROUP /var/run/jpulse
    fi
    echo "✅ Log directory created: $LOG_DIR"
else
    echo "ℹ️  LOG_DIR not set - using STDOUT logging"
    if [[ "$APP_USER" == "jpulse" ]]; then
        chown jpulse:jpulse /var/run/jpulse
    else
        USER_GROUP=$(id -gn $APP_USER)
        chown $APP_USER:$USER_GROUP /var/run/jpulse
    fi
fi
echo "✅ PID directory created: /var/run/jpulse"

# Configure firewall
echo "🔥 Configuring firewall..."
if systemctl is-active --quiet firewalld; then
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https

    # Add application port if PORT is set
    if [[ -n "$PORT" && "$PORT" != "" ]]; then
        firewall-cmd --permanent --add-port=$PORT/tcp
        echo "✅ Firewall configured (HTTP, HTTPS, port $PORT)"
    else
        echo "✅ Firewall configured (HTTP, HTTPS)"
        echo "⚠️  PORT not set - application port not configured in firewall"
    fi

    firewall-cmd --reload
else
    echo "⚠️  Firewall not active - manual configuration required"
fi

# Configure PM2 startup
echo "🔧 Configuring PM2 startup..."
if [[ "$APP_USER" == "jpulse" ]]; then
    # Generate PM2 startup command for jpulse user
    echo "📋 PM2 startup configuration for user: jpulse"
    echo "⚠️  REQUIRED MANUAL STEP: Run the following command to get the startup script:"
    echo ""
    echo "    sudo -u jpulse pm2 startup systemd -u jpulse --hp /home/jpulse"
    echo ""
    echo "💡 Then copy and run the command that PM2 generates"
    echo "💡 After deploying your app, run: sudo -u jpulse pm2 save"
else
    # Generate PM2 startup command for current user
    echo "📋 PM2 startup configuration for user: $APP_USER"
    echo "⚠️  REQUIRED MANUAL STEP: Run the following command to get the startup script:"
    echo ""
    echo "    sudo -u $APP_USER pm2 startup systemd -u $APP_USER --hp $(eval echo ~$APP_USER)"
    echo ""
    echo "💡 Then copy and run the command that PM2 generates"
    echo "💡 After deploying your app, run: sudo -u $APP_USER pm2 save"
fi

# Start and enable services
echo "🚀 Starting services..."
systemctl enable --now mongod
systemctl enable --now redis
systemctl enable --now nginx

# Post-installation validation
echo ""
echo "🧪 Post-installation validation available..."
echo "💡 Run validation after deployment: npx jpulse validate"

echo ""
echo "✅ System installation complete!"
echo ""
echo "📋 Installation Summary:"
echo "   Node.js: $(node --version)"
echo "   MongoDB: Installed and running"
echo "   Redis: Installed and running"
echo "   nginx: Installed and running"
echo "   PM2: $(pm2 --version)"
echo "   Application user: $APP_USER"
echo "   Log directory: ${LOG_DIR:-STDOUT}"
echo ""
echo "💡 Next steps:"
if [[ "$APP_USER" == "jpulse" ]]; then
    echo "   1. Switch to application user: sudo -u jpulse -i"
    echo "   2. Navigate to your jPulse site directory"
    echo "   3. Setup database: npx jpulse mongodb-setup"
    echo "   4. Validate installation: npx jpulse validate"
    echo "   5. Start application: pm2 start deploy/ecosystem.prod.config.cjs"
    echo "   6. Save PM2 configuration: pm2 save"
else
    echo "   1. Navigate to your jPulse site directory"
    echo "   2. Setup database: npx jpulse mongodb-setup"
    echo "   3. Validate installation: npx jpulse validate"
    echo "   4. Start application: pm2 start deploy/ecosystem.prod.config.cjs"
    echo "   5. Save PM2 configuration: pm2 save"
fi

# EOF bin/jpulse-setup.sh
