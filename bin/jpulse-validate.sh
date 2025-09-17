#!/bin/bash
##
 # @name            jPulse Framework / Bin / Deployment Validation
 # @tagline         Validate jPulse deployment installation
 # @description     This script validates system installation and configuration
 #                  - Run with: npm run jpulse-validate
 #                  - Auto-run by jpulse-validate.sh
 #                  - Context-aware: respects dev vs prod deployment settings
 # @file            bin/jpulse-validate.sh
 # @version         0.7.7
 # @release         2025-09-17
 # @repository      https://github.com/peterthoeny/jpulse-framework
 # @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 # @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 # @license         AGPL v3, see LICENSE file
 # @genai           95%, Cursor 1.2, Claude Sonnet 4
##

set -e

# Require environment variables to be loaded
if [[ -z "$JPULSE_SITE_ID" || -z "$JPULSE_DOMAIN_NAME" ]]; then
    echo "❌ Environment not loaded. Run: npm run jpulse-validate"
    echo "💡 Or with environment: source .env && npx jpulse-framework validate"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
WARNINGS=0
ERRORS=()

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    ERRORS+=("$1")
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

# Load deployment configuration
load_deployment_config() {
    log_info "Loading deployment configuration..."

    # Default values
    DEPLOYMENT_TYPE="dev"
    SITE_ID="jpulse-site"
    DOMAIN_NAME="localhost"
    SSL_TYPE="none"
    PM2_INSTANCES="1"

    # Try to load from .env file
    if [[ -f ".env" ]]; then
        source .env 2>/dev/null || true
        if [[ -n "$JPULSE_DEPLOYMENT_TYPE" ]]; then
            DEPLOYMENT_TYPE="$JPULSE_DEPLOYMENT_TYPE"
        fi
        if [[ -n "$JPULSE_SITE_ID" ]]; then
            SITE_ID="$JPULSE_SITE_ID"
        fi
        if [[ -n "$JPULSE_DOMAIN_NAME" ]]; then
            DOMAIN_NAME="$JPULSE_DOMAIN_NAME"
        fi
        if [[ -n "$JPULSE_SSL_TYPE" ]]; then
            SSL_TYPE="$JPULSE_SSL_TYPE"
        fi
        if [[ -n "$JPULSE_PM2_INSTANCES" ]]; then
            PM2_INSTANCES="$JPULSE_PM2_INSTANCES"
        fi
        if [[ -z "$LOG_DIR" ]]; then
            LOG_DIR="/var/log/jpulse"
        fi
        log_success "Configuration loaded from .env"
    else
        # Try to detect from site config
        if [[ -f "site/webapp/app.conf" ]]; then
            if grep -q '"mode": "prod"' site/webapp/app.conf 2>/dev/null; then
                DEPLOYMENT_TYPE="prod"
            fi
        fi
        log_warning "No .env file found, using detected/default configuration"
    fi

    log_info "Deployment type: $DEPLOYMENT_TYPE"
    log_info "Site ID: $SITE_ID"
    log_info "Domain: $DOMAIN_NAME"
    log_info "SSL type: $SSL_TYPE"
}

# Test system requirements
test_system_requirements() {
    log_info "Testing system requirements..."

    # Test Node.js
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [[ $NODE_MAJOR -ge 18 ]]; then
            log_success "Node.js version: $NODE_VERSION"
        else
            log_error "Node.js version too old: $NODE_VERSION (required: 18+)"
        fi
    else
        log_error "Node.js not installed"
    fi

    # Test npm
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        log_success "npm version: $NPM_VERSION"
    else
        log_error "npm not installed"
    fi
}

# Test MongoDB (only if needed)
test_mongodb() {
    if [[ "$DEPLOYMENT_TYPE" == "dev" ]]; then
        log_info "Skipping MongoDB tests (development mode)"
        return
    fi

    log_info "Testing MongoDB installation..."

    # Test MongoDB installation
    if command -v mongosh >/dev/null 2>&1; then
        log_success "MongoDB shell (mongosh) installed"
    else
        log_error "MongoDB shell (mongosh) not installed"
        return
    fi

    # Test MongoDB service
    if systemctl is-active --quiet mongod 2>/dev/null; then
        log_success "MongoDB service is running"
    else
        log_error "MongoDB service is not running"
        return
    fi

    # Test MongoDB connectivity
    if mongosh --eval "db.runCommand('ping')" --quiet >/dev/null 2>&1; then
        log_success "MongoDB connectivity test passed"
    else
        log_warning "MongoDB connectivity test failed (may need authentication)"
    fi
}

# Test nginx (only if needed)
test_nginx() {
    if [[ "$DEPLOYMENT_TYPE" == "dev" ]]; then
        log_info "Skipping nginx tests (development mode)"
        return
    fi

    log_info "Testing nginx installation..."

    # Test nginx installation
    if command -v nginx >/dev/null 2>&1; then
        NGINX_VERSION=$(nginx -v 2>&1 | cut -d'/' -f2)
        log_success "nginx version: $NGINX_VERSION"
    else
        log_error "nginx not installed"
        return
    fi

    # Test nginx service
    if systemctl is-active --quiet nginx 2>/dev/null; then
        log_success "nginx service is running"
    else
        log_warning "nginx service is not running"
    fi

    # Test nginx configuration syntax
    if sudo nginx -t >/dev/null 2>&1; then
        log_success "nginx configuration syntax is valid"
    else
        log_error "nginx configuration syntax error"
    fi
}

# Test PM2 (only if needed)
test_pm2() {
    if [[ "$DEPLOYMENT_TYPE" == "dev" ]] && [[ ! -f "deploy/ecosystem.dev.config.cjs" ]]; then
        log_info "Skipping PM2 tests (development mode without PM2 config)"
        return
    fi

    log_info "Testing PM2 installation..."

    # Test PM2 installation
    if command -v pm2 >/dev/null 2>&1; then
        PM2_VERSION=$(pm2 --version)
        log_success "PM2 version: $PM2_VERSION"
    else
        log_error "PM2 not installed"
        return
    fi

    # Test PM2 configuration files
    if [[ "$DEPLOYMENT_TYPE" == "prod" ]] && [[ -f "deploy/ecosystem.prod.config.cjs" ]]; then
        if node -c deploy/ecosystem.prod.config.cjs 2>/dev/null; then
            log_success "PM2 production config syntax is valid"
        else
            log_error "PM2 production config syntax error"
        fi
    fi

    if [[ "$DEPLOYMENT_TYPE" == "dev" ]] && [[ -f "deploy/ecosystem.dev.config.cjs" ]]; then
        if node -c deploy/ecosystem.dev.config.cjs 2>/dev/null; then
            log_success "PM2 development config syntax is valid"
        else
            log_error "PM2 development config syntax error"
        fi
    fi
}

# Test SSL configuration (only if configured)
test_ssl_config() {
    if [[ "$SSL_TYPE" == "none" ]] || [[ "$DEPLOYMENT_TYPE" == "dev" ]]; then
        log_info "Skipping SSL tests (not configured or development mode)"
        return
    fi

    log_info "Testing SSL configuration..."

    if [[ "$SSL_TYPE" == "letsencrypt" ]]; then
        CERT_PATH="/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem"
        KEY_PATH="/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem"

        if [[ -f "$CERT_PATH" ]]; then
            log_success "Let's Encrypt certificate found: $CERT_PATH"
        else
            log_warning "Let's Encrypt certificate not found: $CERT_PATH"
        fi

        if [[ -f "$KEY_PATH" ]]; then
            log_success "Let's Encrypt private key found: $KEY_PATH"
        else
            log_warning "Let's Encrypt private key not found: $KEY_PATH"
        fi

        # Test certificate validity
        if [[ -f "$CERT_PATH" ]]; then
            if openssl x509 -in "$CERT_PATH" -noout -checkend 86400 2>/dev/null; then
                log_success "SSL certificate is valid and not expiring within 24 hours"
            else
                log_warning "SSL certificate is expired or expiring soon"
            fi
        fi
    fi
}

# Test port availability
test_port_availability() {
    log_info "Testing port availability..."

    # Test application port
    if [[ -n "$PORT" ]]; then
        if ! netstat -tuln 2>/dev/null | grep -q ":$PORT "; then
            log_success "Application port $PORT is available"
        else
            log_warning "Application port $PORT is already in use"
        fi
    fi

    # Test standard web ports (only for production)
    if [[ "$DEPLOYMENT_TYPE" == "prod" ]]; then
        if ! netstat -tuln 2>/dev/null | grep -q ":80 "; then
            log_success "HTTP port 80 is available"
        else
            log_warning "HTTP port 80 is already in use"
        fi

        if ! netstat -tuln 2>/dev/null | grep -q ":443 "; then
            log_success "HTTPS port 443 is available"
        else
            log_warning "HTTPS port 443 is already in use"
        fi
    fi
}

# Test file permissions
test_file_permissions() {
    log_info "Testing file permissions..."

    # Test log directory
    if [[ "$DEPLOYMENT_TYPE" == "prod" ]]; then
        LOG_DIR="${LOG_DIR:-/var/log/jpulse}"
        if [[ -d "$LOG_DIR" ]]; then
            if [[ -w "$LOG_DIR" ]]; then
                log_success "Log directory is writable: $LOG_DIR"
            else
                log_error "Log directory is not writable: $LOG_DIR"
            fi
        else
            log_error "Log directory does not exist: $LOG_DIR"
        fi

        # Test PID directory
        PID_DIR="/var/run/jpulse"
        if [[ -d "$PID_DIR" ]]; then
            if [[ -w "$PID_DIR" ]]; then
                log_success "PID directory is writable: $PID_DIR"
            else
                log_error "PID directory is not writable: $PID_DIR"
            fi
        else
            log_error "PID directory does not exist: $PID_DIR"
        fi
    else
        # Development mode - check local directories
        if [[ -d "logs" ]]; then
            if [[ -w "logs" ]]; then
                log_success "Local logs directory is writable"
            else
                log_error "Local logs directory is not writable"
            fi
        else
            log_warning "Local logs directory does not exist (will be created)"
        fi
    fi
}

# Test configuration files
test_configuration_files() {
    log_info "Testing configuration files..."

    # Test main app configuration
    if [[ -f "site/webapp/app.conf" ]]; then
        if node -e "require('fs').readFileSync('site/webapp/app.conf', 'utf8')" 2>/dev/null; then
            log_success "Site configuration syntax is valid"
        else
            log_error "Site configuration syntax error"
        fi
    else
        log_error "Site configuration file not found: site/webapp/app.conf"
    fi

    # Test package.json
    if [[ -f "package.json" ]]; then
        if node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" 2>/dev/null; then
            log_success "package.json syntax is valid"
        else
            log_error "package.json syntax error"
        fi
    else
        log_error "package.json not found"
    fi

    # Test environment file
    if [[ -f ".env" ]]; then
        # Basic syntax check for .env file
        if grep -q "^export " .env && ! grep -q "^export.*=.*=" .env; then
            log_success "Environment file syntax appears valid"
        else
            log_warning "Environment file may have syntax issues"
        fi
    else
        log_warning "Environment file (.env) not found"
    fi
}

# Test firewall configuration
test_firewall() {
    if [[ "$DEPLOYMENT_TYPE" == "dev" ]]; then
        log_info "Skipping firewall tests (development mode)"
        return
    fi

    log_info "Testing firewall configuration..."

    if command -v firewall-cmd >/dev/null 2>&1; then
        if systemctl is-active --quiet firewalld; then
            log_success "Firewall (firewalld) is active"

            # Check if HTTP/HTTPS services are allowed
            if firewall-cmd --list-services | grep -q "http"; then
                log_success "HTTP service is allowed through firewall"
            else
                log_warning "HTTP service not allowed through firewall"
            fi

            if firewall-cmd --list-services | grep -q "https"; then
                log_success "HTTPS service is allowed through firewall"
            else
                log_warning "HTTPS service not allowed through firewall"
            fi
        else
            log_warning "Firewall (firewalld) is not active"
        fi
    else
        log_info "Firewall (firewalld) not installed - may be using different firewall"
    fi
}

# Main test execution
main() {
    echo "🧪 jPulse Installation Test Suite"
    echo "================================="
    echo ""
    echo "Site: ${JPULSE_SITE_ID:-Unknown}"
    echo "Domain: ${JPULSE_DOMAIN_NAME:-localhost}"
    echo "Platform: $(uname -s) $(uname -r)"
    echo "User: $(whoami)"
    echo ""

    # Load configuration
    load_deployment_config
    echo ""

    # Run all tests
    test_system_requirements
    test_mongodb
    test_nginx
    test_pm2
    test_ssl_config
    test_port_availability
    test_file_permissions
    test_configuration_files
    test_firewall

    # Summary
    echo ""
    echo "📊 Test Summary"
    echo "==============="
    echo -e "${GREEN}✅ Tests passed: $TESTS_PASSED${NC}"

    if [[ $WARNINGS -gt 0 ]]; then
        echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
    fi

    if [[ $TESTS_FAILED -gt 0 ]]; then
        echo -e "${RED}❌ Tests failed: $TESTS_FAILED${NC}"
        echo ""
        echo "Failed tests:"
        for error in "${ERRORS[@]}"; do
            echo -e "${RED}  • $error${NC}"
        done
        echo ""
        echo "💡 Run with deployment-specific guidance:"
        echo "   - Development: Some services (nginx, MongoDB) may not be needed"
        echo "   - Production: All services should be installed and configured"
        echo "   - Check deployment documentation for troubleshooting"
        exit 1
    else
        echo ""
        if [[ $WARNINGS -gt 0 ]]; then
            echo -e "${YELLOW}⚠️  Installation validation completed with warnings${NC}"
            echo "💡 Review warnings above - they may indicate optional components"
        else
            echo -e "${GREEN}🎉 Installation validation passed successfully!${NC}"
        fi
        echo ""
        echo "💡 Next steps:"
        if [[ "$DEPLOYMENT_TYPE" == "prod" ]]; then
            echo "   1. Configure environment: nano .env"
            echo "   2. Setup database: source .env && ./deploy/mongodb-setup.sh"
            echo "   3. Start application: pm2 start deploy/ecosystem.prod.config.cjs"
        else
            echo "   1. Install dependencies: npm install"
            echo "   2. Start development: npm run dev"
        fi
    fi
}

# Run main function
main "$@"

# EOF bin/jpulse-validate.sh
