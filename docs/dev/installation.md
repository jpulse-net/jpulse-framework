# jPulse Framework / Docs / Dev / Framework Development Installation v0.7.4

This guide covers setting up the jPulse Framework for core development and contributions.

> **Site Development**: See [Site Installation Guide](../installation.md) for building sites with jPulse.

## Prerequisites

### Required
- **Node.js 18+** - JavaScript runtime
- **npm** - Package manager
- **Git** - Version control
- **MongoDB 4.4+** - Database (required for testing and development)

### Recommended
- **IDE/Editor** with ES module support (VS Code, WebStorm, etc.)
- **MongoDB Compass** - Database GUI for development
- **Postman/Insomnia** - API testing

## Framework Development Setup

### 1. Clone Repository
```bash
# Clone the jPulse Framework repository
git clone https://github.com/peterthoeny/jpulse-framework.git
cd jpulse-framework
```

### 2. Install Dependencies
```bash
# Install Node.js dependencies
npm install
```

### 3. Verify Installation
```bash
# Run the complete test suite
npm test

# Check for 455+ tests passing
# Should see: "Tests: X passed, Y total"
```

### 4. Start Development Server
```bash
# Start the development server
npm start
```

The framework will be available at `http://localhost:8080` with the demo site/ overrides active.

## Development Workflow

### Running Tests
```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch
```

### CLI Tools Testing
```bash
# Test the CLI tools
npm run test:cli

# This validates jpulse-setup and jpulse-sync functionality
```

### Code Quality
```bash
# The project uses Jest for testing
# Follow existing patterns in webapp/tests/

# Ensure all tests pass before submitting PRs
npm test
```

## Database Setup for Development

### MongoDB Configuration
The framework uses `webapp/app.conf` for development database settings:

```javascript
{
    database: {
        enabled: true,
        host: 'localhost',
        port: 27017,
        name: 'jpulse_dev',
        // For replica set testing:
        // replicaSet: 'rs0',
        // hosts: ['localhost:27017', 'localhost:27018', 'localhost:27019']
    }
}
```

### Test Database
Tests use isolated databases that are automatically cleaned up:
- Test databases are created with unique names
- Automatic cleanup after test completion
- No manual database management needed

## Framework Architecture

### Directory Structure
```
jpulse-framework/
├── webapp/                 # Framework core
│   ├── app.js              # Main application
│   ├── controller/         # Base controllers
│   ├── model/              # Data models
│   ├── view/               # Base templates
│   ├── utils/              # Framework utilities
│   └── tests/              # Test suites
├── site/                   # Demo site (for testing overrides)
├── bin/                    # CLI tools
├── templates/              # Site templates
├── .github/                # GitHub workflows
└── docs/                   # Documentation
```

### Key Components
- **PathResolver**: Site override system (W-014)
- **CommonUtils**: Data processing and schema queries
- **SiteRegistry**: Auto-discovery of site controllers
- **Bootstrap**: Application initialization
- **Database**: MongoDB integration layer

## Package Distribution (W-051)

### CLI Tools Development
The framework includes CLI tools for site creation:

```bash
# Test CLI tools locally
node bin/setup.js    # (in a test directory)
node bin/sync.js     # (in a site directory)
node bin/test-cli.js # Automated testing
```

### Publishing Workflow
```bash
# Publishing is handled by GitHub Actions
# Triggered by version tags or manual workflow dispatch

# To prepare a release:
npm version patch|minor|major
git push origin main --tags
```

> **Complete Publishing Guide**: See [Package Publishing Guide](publishing.md) for detailed release process.

## Contributing

### Development Guidelines
1. **Follow existing patterns** in code structure and naming
2. **Write tests** for all new functionality
3. **Update documentation** for user-facing changes
4. **Use ES modules** throughout (no CommonJS)
5. **Follow "don't make me think"** principle in APIs

### Pull Request Process
1. **Fork** the repository
2. **Create feature branch** from main
3. **Write tests** for your changes
4. **Ensure all tests pass**: `npm test`
5. **Update documentation** if needed
6. **Submit pull request** with clear description

### Code Style
- **ES modules**: Use `import/export` syntax
- **Async/await**: Prefer over promises/callbacks
- **JSDoc comments**: Document public APIs
- **Error handling**: Comprehensive try/catch blocks
- **Logging**: Use LogController for all logging

## Troubleshooting

### Common Development Issues

**Tests failing:**
```bash
# Ensure no other jPulse instances are running
pkill -f "node.*app.js"

# Clear test artifacts
rm -rf webapp/tests/fixtures/temp-*.conf

# Run tests again
npm test
```

**MongoDB connection issues:**
- Verify MongoDB is running: `brew services list | grep mongodb`
- Check connection in `webapp/app.conf`
- Ensure test database permissions

**CLI tools not working:**
```bash
# Make scripts executable
chmod +x bin/*.js

# Test CLI tools
npm run test:cli
```

### Getting Help

- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check [main documentation](../README.md) for site development
- **Architecture**: Review [architecture documentation](README.md)

---

*Next: [Framework Architecture Guide](README.md)*
