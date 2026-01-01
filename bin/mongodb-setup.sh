#!/bin/bash
##
 # @name            jPulse Framework / Bin / MongoDB Setup
 # @tagline         MongoDB setup for jPulse site
 # @description     This script will setup MongoDB for jPulse site
 #                  - Run with environment: source .env && ./bin/mongodb-setup.sh
 #                  - For Red Hat Enterprise Linux ecosystem
 # @file            bin/mongodb-setup.sh
 # @version         1.4.2
 # @release         2026-01-01
 # @repository      https://github.com/jpulse-net/jpulse-framework
 # @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 # @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 # @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 # @genai           60%, Cursor 1.7, Claude Sonnet 4
##

set -e

# Load environment variables if .env exists
if [[ -f ".env" ]]; then
    echo "ℹ️  Loading environment from .env..."
    source .env
    echo "✅ Environment loaded"
else
    echo "⚠️  No .env file found - environment variables must be set manually"
fi

# Require environment variables to be loaded
if [[ -z "$DB_NAME" || -z "$DB_USER" || -z "$JPULSE_SITE_ID" ]]; then
    echo "❌ Environment not loaded. Run: npx jpulse mongodb-setup"
    echo "💡 Or with environment: source .env && npx jpulse mongodb-setup"
    exit 1
fi

# Security check - must NOT run as root
if [ "$EUID" -eq 0 ]; then
    echo "❌ SECURITY ERROR: Do not run this script as root!"
    echo "💡 Run as application user: npx jpulse mongodb-setup"
    exit 1
fi

# Platform check - Red Hat ecosystem only
if ! command -v dnf >/dev/null 2>&1 && ! command -v yum >/dev/null 2>&1; then
    echo "❌ PLATFORM ERROR: This script is for Red Hat Enterprise Linux ecosystem"
    echo "💡 Supported: RHEL, Rocky Linux, CentOS, Fedora"
    exit 1
fi

echo "🗄️  jPulse MongoDB Setup (Red Hat Enterprise Linux)"
echo "=================================================="
echo ""
echo "Site: ${JPULSE_SITE_ID}"
echo "Domain: ${JPULSE_DOMAIN_NAME}"
echo "Platform: $(cat /etc/redhat-release 2>/dev/null || echo 'Red Hat Compatible')"
echo "User: $(whoami)"
echo ""
echo "This script will:"
echo "  1. Create MongoDB admin user (if not exists)"
echo "  2. Create application database: ${DB_NAME}"
echo "  3. Create application user: ${DB_USER}"
echo ""

# Check if MongoDB is running
if ! systemctl is-active --quiet mongod; then
    echo "❌ MongoDB is not running."
    echo "💡 Start MongoDB first: sudo systemctl start mongod"
    exit 1
fi

# Environment variables check
if [ -z "$DB_ADMIN_PASS" ] || [ -z "$DB_PASS" ]; then
    echo "❌ Required environment variables not set:"
    echo ""
    echo "   export DB_ADMIN_PASS='<your-admin-password>'"
    echo "   export DB_USER='<your-db-user>'"
    echo "   export DB_PASS='<your-app-password>'"
    echo "   export DB_NAME='<your-db-name>'"
    echo ""
    echo "💡 Copy from .env file: source .env"
    echo "💡 Or set variables: export DB_ADMIN_PASS='your-password'"
    exit 1
fi

# Check if MongoDB authentication is enabled
MONGODB_AUTH_ENABLED=false
if grep -q "authorization: enabled" /etc/mongod.conf 2>/dev/null; then
    MONGODB_AUTH_ENABLED=true
fi

# Check if admin user already exists
echo "🔍 Checking existing MongoDB configuration..."
if [ "$MONGODB_AUTH_ENABLED" = true ]; then
    # MongoDB auth is enabled - try to authenticate with provided credentials
    if mongosh admin -u "${DB_ADMIN_USER:-admin}" -p "$DB_ADMIN_PASS" --authenticationDatabase admin --eval "db.runCommand({connectionStatus: 1})" --quiet 2>/dev/null | grep -q "authenticatedUsers"; then
        # Authentication successful - admin user exists and credentials work
        echo "✅ Admin user already exists and credentials are valid"
        SKIP_ADMIN=true
    else
        # Auth enabled but can't authenticate - this means wrong credentials
        # (If auth is enabled, admin user MUST exist, so can't create it)
        echo "❌ MongoDB authentication is enabled but cannot authenticate"
        echo "💡 This means the admin credentials in .env are incorrect"
        echo "💡 Verify DB_ADMIN_USER and DB_ADMIN_PASS in .env match the existing MongoDB admin user"
        echo "💡 If you're setting up a second site, use the same admin credentials as the first site"
        exit 1
    fi
else
    # No auth enabled - check without authentication
    if mongosh admin --eval "db.getUser('${DB_ADMIN_USER:-admin}')" --quiet 2>/dev/null | grep -q "${DB_ADMIN_USER:-admin}"; then
        echo "✅ Admin user already exists"
        SKIP_ADMIN=true
    else
        echo "📝 Admin user needs to be created"
        SKIP_ADMIN=false
    fi
fi

# Check if app user already exists
if [ "$MONGODB_AUTH_ENABLED" = true ]; then
    # Auth enabled - authenticate first
    if mongosh "$DB_NAME" -u "${DB_ADMIN_USER:-admin}" -p "$DB_ADMIN_PASS" --authenticationDatabase admin --eval "db.getUser('$DB_USER')" --quiet 2>/dev/null | grep -q "$DB_USER"; then
        echo "✅ App user '$DB_USER' already exists"
        SKIP_APP=true
    else
        echo "📝 App user '$DB_USER' needs to be created"
        SKIP_APP=false
    fi
else
    # No auth - check without authentication
    if mongosh "${DB_NAME:-jp-prod}" --eval "db.getUser('$DB_USER')" --quiet 2>/dev/null | grep -q "$DB_USER"; then
        echo "✅ App user '$DB_USER' already exists"
        SKIP_APP=true
    else
        echo "📝 App user '$DB_USER' needs to be created"
        SKIP_APP=false
    fi
fi

if [ "$SKIP_ADMIN" = true ] && [ "$SKIP_APP" = true ]; then
    echo ""
    echo "✅ MongoDB already configured for jPulse"
    echo "🚀 Ready to start application!"
    exit 0
fi

echo ""
read -p "🤔 Proceed with MongoDB setup? (y/N): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Setup cancelled"
    exit 1
fi

# Setup admin user (if needed)
if [ "$SKIP_ADMIN" = false ]; then
    echo "👤 Creating MongoDB admin user..."
    if [ "$MONGODB_AUTH_ENABLED" = true ]; then
        echo "❌ Cannot create admin user: MongoDB authentication is already enabled"
        echo "💡 The admin user should already exist from a previous setup."
        echo "💡 If you're setting up a second site, use the same admin credentials."
        echo "💡 Verify DB_ADMIN_USER and DB_ADMIN_PASS in .env match existing admin user."
        echo ""
        echo "💡 If admin user truly doesn't exist, you need to:"
        echo "   1. Temporarily disable MongoDB authentication in /etc/mongod.conf"
        echo "   2. Restart MongoDB: sudo systemctl restart mongod"
        echo "   3. Run this script again to create admin user"
        echo "   4. Re-enable authentication and restart MongoDB"
        exit 1
    else
        mongosh admin --eval "
            db.createUser({
                user: '${DB_ADMIN_USER:-admin}',
                pwd: '$DB_ADMIN_PASS',
                roles: ['userAdminAnyDatabase', 'dbAdminAnyDatabase']
            })
        "
        echo "✅ Admin user created"
    fi
fi

# Enable MongoDB authentication BEFORE creating app user
echo "🔐 Enabling MongoDB authentication..."
if grep -q "^#.*authorization: .*" /etc/mongod.conf 2>/dev/null; then
    # Uncomment both security section and authorization line
    sudo sed -i 's/^#security:/security:/' /etc/mongod.conf
    sudo sed -i 's/^#.*authorization: .*/  authorization: enabled/' /etc/mongod.conf
    echo "✅ MongoDB authentication enabled in configuration"
elif grep -q "authorization: enabled" /etc/mongod.conf 2>/dev/null; then
    echo "✅ MongoDB authentication already enabled"
else
    # Add security section if it doesn't exist
    if ! grep -q "^security:" /etc/mongod.conf 2>/dev/null; then
        echo "" | sudo tee -a /etc/mongod.conf
        echo "security:" | sudo tee -a /etc/mongod.conf
        echo "  authorization: enabled" | sudo tee -a /etc/mongod.conf
        echo "✅ MongoDB authentication enabled in configuration"
    else
        # Add authorization under existing security section
        sudo sed -i '/^security:/a\  authorization: enabled' /etc/mongod.conf
        echo "✅ MongoDB authentication enabled in configuration"
    fi
fi

# Restart MongoDB to apply authentication
echo "🔄 Restarting MongoDB to apply authentication..."
sudo systemctl restart mongod

# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB to restart..."
sleep 3

# Setup app user and database (now with authentication enabled)
echo "🗄️  Creating application database '$DB_NAME' and user '$DB_USER'..."

# Create app user (single command per --eval)
mongosh "$DB_NAME" -u "$DB_ADMIN_USER" -p "$DB_ADMIN_PASS" --authenticationDatabase admin --eval "
    db.createUser({
        user: '$DB_USER',
        pwd: '$DB_PASS',
        roles: [
            {role: 'readWrite', db: '$DB_NAME'},
            {role: 'dbAdmin', db: '$DB_NAME'},
            {role: 'clusterMonitor', db: 'admin'}
        ]
    })
"

echo "✅ App user '$DB_USER' created successfully"

# Create initial collection (separate command)
mongosh "$DB_NAME" -u "$DB_USER" -p "$DB_PASS" --eval "
    db.system_info.insertOne({
        created: new Date(),
        version: '1.0.0',
        framework: 'jPulse',
        site: '${SITE_NAME:-jPulse Site}'
    })
"

echo "✅ Initial database collection created"

echo ""
# Create initial admin user for jPulse application
echo ""
echo "👤 Creating initial admin user for jPulse application..."
echo ""

# Prompt for admin user details
read -p "? Admin username ($(whoami)): " ADMIN_USERNAME
ADMIN_USERNAME=${ADMIN_USERNAME:-$(whoami)}

read -p "? Admin first name: " ADMIN_FIRST_NAME
while [ -z "$ADMIN_FIRST_NAME" ]; do
    read -p "? Admin first name (required): " ADMIN_FIRST_NAME
done

read -p "? Admin last name: " ADMIN_LAST_NAME
while [ -z "$ADMIN_LAST_NAME" ]; do
    read -p "? Admin last name (required): " ADMIN_LAST_NAME
done

read -p "? Admin email ($ADMIN_USERNAME@${JPULSE_DOMAIN_NAME:-localhost}): " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-$ADMIN_USERNAME@${JPULSE_DOMAIN_NAME:-localhost}}

# Prompt for admin password
echo ""
read -s -p "? Admin password: " ADMIN_PASSWORD
echo ""
while [ -z "$ADMIN_PASSWORD" ]; do
    read -s -p "? Admin password (required): " ADMIN_PASSWORD
    echo ""
done

read -s -p "? Confirm admin password: " ADMIN_PASSWORD_CONFIRM
echo ""
while [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; do
    echo "❌ Passwords do not match"
    read -s -p "? Admin password: " ADMIN_PASSWORD
    echo ""
    read -s -p "? Confirm admin password: " ADMIN_PASSWORD_CONFIRM
    echo ""
done

# Generate UUID for the user (simple timestamp-based)
ADMIN_UUID="admin-$(date +%s)-$(whoami)"

# Validate password strength
if [[ ${#ADMIN_PASSWORD} -lt 8 ]]; then
    echo "❌ Password must be at least 8 characters long"
    exit 1
fi

# Escape special characters in password for safe JavaScript usage
# Replace single quotes with escaped single quotes and wrap in single quotes
ADMIN_PASSWORD_ESCAPED=$(printf '%s\n' "$ADMIN_PASSWORD" | sed "s/'/'\\\\''/g")

# Create the admin user document with enhanced error handling - FIXED: Reliable detection and single commands
echo "🔐 Creating admin user in database..."

# Step 1: Check if user exists (single command, reliable detection)
echo "🔍 Checking if jPulse admin user exists..."
USER_CHECK_RESULT=$(mongosh "$DB_NAME" -u "$DB_USER" -p "$DB_PASS" --authenticationDatabase "$DB_NAME" --eval "
try {
    const user = db.users.findOne({username: '$ADMIN_USERNAME'});
    if (user) {
        print('USER_EXISTS:' + user.username);
    } else {
        print('USER_NOT_FOUND');
    }
} catch (error) {
    print('ERROR:' + error.message);
}
" --quiet 2>&1)

# Parse user check result
if echo "$USER_CHECK_RESULT" | grep -q "^USER_EXISTS:"; then
    EXISTING_USER=$(echo "$USER_CHECK_RESULT" | grep "^USER_EXISTS:" | cut -d: -f2)
    echo "⚠️  jPulse admin user already exists: $EXISTING_USER"
    USER_CREATION_NEEDED=false
elif echo "$USER_CHECK_RESULT" | grep -q "^USER_NOT_FOUND"; then
    echo "📝 jPulse admin user needs to be created: $ADMIN_USERNAME"
    USER_CREATION_NEEDED=true
elif echo "$USER_CHECK_RESULT" | grep -q "^ERROR:"; then
    ERROR_MSG=$(echo "$USER_CHECK_RESULT" | grep "^ERROR:" | cut -d: -f2-)
    echo "❌ Failed to check for existing user: $ERROR_MSG"
    exit 1
else
    echo "❌ Unexpected response from user check:"
    echo "$USER_CHECK_RESULT"
    exit 1
fi

# Step 2: Create user only if needed (single command)
if [ "$USER_CREATION_NEEDED" = true ]; then
    echo "👤 Creating jPulse admin user: $ADMIN_USERNAME"
    # Use single eval with bcrypt - matches jPulse app hashing (12 salt rounds)
    ADMIN_RESULT=$(mongosh "$DB_NAME" -u "$DB_USER" -p "$DB_PASS" --authenticationDatabase "$DB_NAME" --eval "
    try {
        const bcrypt = require('bcrypt');
        const adminPassword = '$ADMIN_PASSWORD_ESCAPED';
        const saltRounds = 12;
        const passwordHash = bcrypt.hashSync(adminPassword, saltRounds);
        const adminUser = {
            username: '$ADMIN_USERNAME',
            uuid: '$ADMIN_UUID',
            email: '$ADMIN_EMAIL',
            passwordHash: passwordHash,
            profile: {
                firstName: '$ADMIN_FIRST_NAME',
                lastName: '$ADMIN_LAST_NAME',
                nickName: '',
                avatar: ''
            },
            roles: ['admin', 'user'],
            preferences: {
                language: 'en',
                theme: 'light'
            },
            status: 'active',
            lastLogin: null,
            loginCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            updatedBy: 'mongodb-setup',
            docVersion: 1,
            saveCount: 1
        };
        const result = db.users.insertOne(adminUser);
        if (result.acknowledged) {
            print('SUCCESS:$ADMIN_USERNAME');
        } else {
            print('FAILED:Insert failed');
        }
    } catch(error) {
        print('ERROR:' + error.message);
    }
    " --quiet 2>&1)
else
    # User exists, set success result
    ADMIN_RESULT="EXISTS:$ADMIN_USERNAME"
fi

# Parse the result and provide appropriate feedback
if echo "$ADMIN_RESULT" | grep -q "SUCCESS:"; then
    echo "✅ Admin user created: $ADMIN_USERNAME"
elif echo "$ADMIN_RESULT" | grep -q "EXISTS:"; then
    echo "⚠️  Admin user already exists: $ADMIN_USERNAME"
elif echo "$ADMIN_RESULT" | grep -q "ERROR:"; then
    ERROR_MSG=$(echo "$ADMIN_RESULT" | grep "ERROR:" | sed 's/ERROR://')
    echo "❌ Failed to create admin user: $ERROR_MSG"
    exit 1
elif echo "$ADMIN_RESULT" | grep -q "FAILED:"; then
    echo "❌ Failed to create admin user: Database insert operation failed"
    exit 1
else
    echo "❌ Unexpected error during admin user creation"
    echo "Debug output: $ADMIN_RESULT"
    exit 1
fi


# Verify authentication is working
echo "🧪 Testing MongoDB authentication..."
if mongosh admin -u "${DB_ADMIN_USER:-admin}" -p "$DB_ADMIN_PASS" --eval "db.runCommand({connectionStatus: 1})" --quiet >/dev/null 2>&1; then
    echo "✅ Admin user authentication working"

    # Test app user authentication
    if mongosh "$DB_NAME" -u "$DB_USER" -p "$DB_PASS" --eval "db.runCommand({connectionStatus: 1})" --quiet >/dev/null 2>&1; then
        echo "✅ App user authentication working"
        echo "✅ MongoDB authentication is working correctly"
    else
        echo "⚠️  Warning: App user authentication test failed"
        echo "💡 You may need to manually verify app user setup"
    fi
else
    echo "⚠️  Warning: Admin user authentication test failed"
    echo "💡 You may need to manually verify the setup"
fi

echo "✅ MongoDB setup complete!"
echo ""
echo "📋 Configuration Summary:"
echo "   Database: $DB_NAME"
echo "   App User: $DB_USER"
echo "   Admin User: ${DB_ADMIN_USER:-admin}"
echo "   jPulse Admin: $ADMIN_USERNAME ($ADMIN_EMAIL)"
echo ""
echo "💡 Next steps:"
echo "   1. Verify .env file contains correct credentials"
echo "   2. Start jPulse application: npm start"
echo "   3. Login with admin user: $ADMIN_USERNAME"
echo "   4. Check application logs for database connection"

# EOF bin/mongodb-setup.sh
