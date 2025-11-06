# W-085: npx Tools Strategy & Unified CLI Entry Point

**Status**: 🕑 PENDING  
**Type**: Feature  
**Objective**: Create intuitive, unified tools environment for site developers  
**Date**: 2025-11-05

## Overview

This work item establishes a unified command-line interface strategy for jPulse Framework tools, making utilities available to site developers through a single entry point (`npx jpulse`) while maintaining consistency and avoiding code duplication.

## Problem Statement

### Current State
- Multiple entry points: `npx jpulse-configure`, `npx jpulse-update`, `npx jpulse-framework <command>`
- Inconsistent command patterns
- `bump-version.js` script exists but is only available to framework developers
- Hard-coded configuration in scripts makes them non-reusable
- Root directory pollution risk when adding new tool configs

### Goals
1. **Single Entry Point**: All commands via `npx jpulse <command>`
2. **No Code Duplication**: Scripts work for both framework and site use
3. **Configuration-Driven**: No hard-coded configs, use `.conf` files
4. **Organized Configs**: Keep configs with related files, not in root
5. **Consistent Patterns**: Same approach for all tools
6. **Shorter Commands**: `npx jpulse configure` vs `npm run jpulse-configure`

## Design Decisions

### 1. Unified Command Structure

**Before:**
```bash
npx jpulse-configure
npx jpulse-update
npx jpulse-framework <command>
npm run jpulse-<command>
```

**After:**
```bash
npx jpulse configure
npx jpulse update
npx jpulse bump-version
npx jpulse install
npx jpulse mongodb-setup
npx jpulse validate
```

**Package.json Changes:**
```json
{
    "bin": {
        "jpulse": "./bin/jpulse-framework.js"  // Single entry point
    }
}
```

**Removed:**
- `"jpulse-configure": "./bin/configure.js"` bin entry
- `"jpulse-update": "./bin/jpulse-update.js"` bin entry
- All `jpulse-*` npm scripts from site package.json

### 2. Configuration File Strategy

#### Configuration File Locations

**Framework:**
- Path: `bin/bump-version.conf`
- Rationale: Consistent with `webapp/app.conf`, keeps config organized with its script

**Site:**
- Path: `site/webapp/bump-version.conf`
- Rationale: Consistent with `site/webapp/app.conf`, keeps configs organized with app config

**Benefits:**
- No root directory pollution
- Configs located with related files
- Easy to find and maintain
- Consistent naming pattern

#### Configuration File Format

Use `.conf` format (JavaScript object) consistent with `app.conf`:

```javascript
{
    // File patterns to include in version bump
    filePatterns: [
        'package.json',
        'site/webapp/app.conf',
        'site/webapp/controller/*.js',
        'README.md'
    ],

    // File update rules with regex patterns
    fileUpdateRules: [
        {
            pattern: 'package.json',
            replacements: [
                { 
                    from: /"version": "[\d.]+(-[a-z]+\.\d+)?"/,
                    to: (version) => `"version": "${version}"` 
                }
            ]
        },
        {
            pattern: 'site/webapp/app.conf',
            replacements: [
                { 
                    from: /(version: +['"])[\d.]+(-[a-z]+\.\d+)?/,
                    to: (version, match, p1) => `${p1}${version}`, 
                    scope: 'version' 
                },
                { 
                    from: /(release: +['"])[\d-]+/,
                    to: (release, match, p1) => `${p1}${release}`, 
                    scope: 'release' 
                }
            ]
        }
    ],

    // Header update patterns (optional - uses defaults if not specified)
    headerUpdatePatterns: {
        version: /([\*#] @version\s+)[\d.]+(-[a-z]+\.\d+)?/,
        release: /([\*#] @release\s+)[\d-]+/
    }
}
```

#### Configuration Loading Logic

```javascript
function findBumpConfig() {
    // Check if we're in a site (has site/webapp/app.conf)
    if (fs.existsSync('site/webapp/app.conf')) {
        const siteConfig = 'site/webapp/bump-version.conf';
        if (fs.existsSync(siteConfig)) {
            return siteConfig;
        }
        return null; // Show instructions
    }
    
    // Framework repo (has webapp/app.conf directly, not in node_modules)
    if (fs.existsSync('webapp/app.conf') && !process.cwd().includes('node_modules')) {
        const frameworkConfig = 'bin/bump-version.conf';  // Updated path
        if (fs.existsSync(frameworkConfig)) {
            return frameworkConfig;
        }
        return null; // Show instructions
    }
    
    return null;
}

function loadBumpConfig() {
    const configPath = findBumpConfig();
    
    if (!configPath) {
        showConfigInstructions();
        return null;
    }
    
    try {
        const content = fs.readFileSync(configPath, 'utf8');
        return new Function(`return (${content})`)();
    } catch (error) {
        console.error(`❌ Error loading ${configPath}: ${error.message}`);
        process.exit(1);
    }
}
```

### 3. No Hard-Coded Configuration

**Principle**: All scripts must be configuration-driven. No hard-coded defaults in scripts.

**Implementation:**
- Framework developers create `webapp/bump-version.conf`
- Site developers create `site/webapp/bump-version.conf`
- If config missing, show clear instructions on how to create it
- Scripts work identically for both contexts

### 4. Context Detection

Scripts automatically detect their execution context:

```javascript
function detectContext() {
    // Site: has site/webapp/app.conf and framework in node_modules
    if (fs.existsSync('site/webapp/app.conf') &&
        fs.existsSync('node_modules/@jpulse-net/jpulse-framework')) {
        return 'site';
    }
    
    // Framework repo: has webapp/app.conf directly (not in node_modules)
    if (fs.existsSync('webapp/app.conf') && 
        !process.cwd().includes('node_modules')) {
        return 'framework';
    }
    
    return 'unknown';
}

function showHelp(context) {
    console.log('jPulse Framework CLI');
    console.log('');
    
    if (context === 'framework') {
        console.log('Available commands (framework development):');
        console.log('  bump-version    - Bump version numbers across framework files');
        console.log('');
        console.log('Usage:');
        console.log('  npx jpulse bump-version <version> [date]');
        console.log('  node bin/bump-version.js <version> [date]');
    } else if (context === 'site') {
        console.log('Available commands:');
        console.log('  configure       - Configure jPulse site (setup/update configuration)');
        console.log('  update          - Update framework package and sync files');
        console.log('  bump-version    - Bump version numbers across site files');
        console.log('  install         - Install system dependencies (run as root)');
        console.log('  mongodb-setup   - Setup MongoDB database');
        console.log('  validate        - Validate deployment installation');
        console.log('');
        console.log('Usage:');
        console.log('  npx jpulse <command> [options]');
    } else {
        // Unknown context - show all commands
        console.log('Available commands:');
        console.log('  configure       - Configure jPulse site (setup/update configuration)');
        console.log('  update          - Update framework package and sync files');
        console.log('  bump-version    - Bump version numbers across files');
        console.log('  install         - Install system dependencies (run as root)');
        console.log('  mongodb-setup   - Setup MongoDB database');
        console.log('  validate        - Validate deployment installation');
        console.log('');
        console.log('Usage:');
        console.log('  npx jpulse <command> [options]');
    }
}
```

### 5. Dispatcher Architecture

**File**: `bin/jpulse-framework.js` (renamed to `bin/jpulse.js` or kept as-is)

**Command Map:**
```javascript
const commands = {
    'configure': './configure.js',
    'config': './configure.js',           // alias
    'update': './jpulse-update.js',
    'bump-version': './bump-version.js',
    'version-bump': './bump-version.js', // alias
    'install': './jpulse-install.sh',
    'validate': './jpulse-validate.sh',
    'mongodb-setup': './mongodb-setup.sh',
    'db-setup': './mongodb-setup.sh'     // alias
};
```

**Help Output:**
```javascript
if (!command || !commands[command]) {
    console.log('jPulse Framework CLI');
    console.log('');
    console.log('Available commands:');
    console.log('  configure      - Configure jPulse site (setup/update configuration)');
    console.log('  update         - Update framework package and sync files');
    console.log('  bump-version    - Bump version numbers across files');
    console.log('  install        - Install system dependencies (run as root)');
    console.log('  mongodb-setup  - Setup MongoDB database');
    console.log('  validate       - Validate deployment installation');
    console.log('');
    console.log('Usage:');
    console.log('  npx jpulse <command> [options]');
    console.log('');
    console.log('Examples:');
    console.log('  npx jpulse configure');
    console.log('  npx jpulse bump-version 1.2.0');
    console.log('  npx jpulse update');
    process.exit(1);
}
```

## Implementation Details

### 1. Bump Version Script Changes

**File**: `bin/bump-version.js`

**Changes:**
1. Remove all hard-coded `conf` object
2. Load config from `webapp/bump-version.conf` (framework) or `site/webapp/bump-version.conf` (site)
3. Show instructions if config missing
4. Context-aware instructions (framework vs site examples)

**Usage:**
```bash
# Framework
npx jpulse bump-version 1.0.5 [YYYY-MM-DD]

# Site
npx jpulse bump-version 0.2.0 [YYYY-MM-DD]
```

### 2. Site Package.json Simplification

**Before:**
```json
{
    "scripts": {
        "update": "npm update @jpulse-net/jpulse-framework && npm run jpulse-update",
        "jpulse-configure": "npx jpulse-framework jpulse-configure",
        "jpulse-install": "npx jpulse-framework jpulse-install",
        "jpulse-mongodb-setup": "bash -c 'source .env && npx jpulse-framework jpulse-mongodb-setup'",
        "jpulse-validate": "bash -c 'source .env && npx jpulse-framework jpulse-validate'",
        "jpulse-update": "npx jpulse-framework jpulse-update"
    }
}
```

**After:**
```json
{
    "scripts": {
        "start": "node webapp/app.js",
        "dev": "node webapp/app.js",
        "prod": "NODE_ENV=production node webapp/app.js"
        // No jpulse-* scripts - use npx jpulse directly
    }
}
```

**Rationale:**
- Simpler, cleaner package.json
- Direct command usage is more intuitive
- Consistent with modern tooling practices
- Breaking change acceptable (pre-announcement)

### 3. Update Command Enhancement

**Current**: `npm run update` does `npm update @jpulse-net/jpulse-framework && npm run jpulse-update`

**Implementation**: `npx jpulse update` automatically updates the framework package and syncs files in a single command.

**Usage**:
- Update to latest: `npx jpulse update`
- Update to specific version (beta/RC): `npx jpulse update @jpulse-net/jpulse-framework@1.0.0-rc.1`

**Implementation Details**:
- If no version argument provided: runs `npm update @jpulse-net/jpulse-framework`
- If version argument provided: runs `npm install @jpulse-net/jpulse-framework@version`
- Then syncs framework files from the installed package
- Single command for common case (update to latest)
- Follows familiar npm pattern for edge cases (specific versions)
```

### 4. Environment Variable Loading

**Current**: Some commands use `bash -c 'source .env && ...'` in npm scripts

**New**: Handle `.env` loading in scripts themselves:

```bash
# In mongodb-setup.sh or validate.sh
if [[ -f ".env" ]]; then
    source .env
fi

# Then validate required variables
if [[ -z "$DB_NAME" || -z "$DB_USER" ]]; then
    echo "❌ Environment not loaded. Ensure .env file exists and contains required variables."
    exit 1
fi
```

## Configuration File Examples

### Framework `webapp/bump-version.conf`

```javascript
{
    filePatterns: [
        'package.json',
        'package-lock.json',
        'README.md',
        'babel.config.cjs',
        'bin/*.js',
        'bin/*.sh',
        'docs/*.md',
        'docs/dev/*.md',
        'webapp/*.conf',
        'webapp/**/*.js',
        'webapp/**/*.css',
        'webapp/**/*.tmpl',
        'webapp/**/*.shtml',
        'templates/**/*'
    ],
    fileUpdateRules: [
        {
            pattern: 'package.json',
            replacements: [
                { 
                    from: /"version": "[\d.]+(-[a-z]+\.\d+)?"/,
                    to: (version) => `"version": "${version}"` 
                }
            ]
        },
        {
            pattern: 'package-lock.json',
            replacements: [
                { 
                    from: /("name": "\@jpulse-net\/jpulse-framework",\s+"version": ")[\d.]+(-[a-z]+\.\d+)?/g,
                    to: (version, match, p1) => `${p1}${version}`, 
                    scope: 'version' 
                }
            ]
        },
        {
            pattern: 'webapp/app.conf',
            replacements: [
                { 
                    from: /(version: +['"])[\d.]+(-[a-z]+\.\d+)?/,
                    to: (version, match, p1) => `${p1}${version}`, 
                    scope: 'version' 
                },
                { 
                    from: /(release: +['"])[\d-]+/,
                    to: (release, match, p1) => `${p1}${release}`, 
                    scope: 'release' 
                }
            ]
        },
        {
            pattern: 'README.md',
            replacements: [
                { 
                    from: /^(# jPulse Framework v)[\d.]+(-[a-z]+\.\d+)?/m,
                    to: (version, match, p1) => `${p1}${version}` 
                }
            ]
        },
        {
            pattern: 'docs/*.md',
            replacements: [
                { 
                    from: /^(# jPulse Framework.* v)[\d.]+(-[a-z]+\.\d+)?/m,
                    to: (version, match, p1) => `${p1}${version}` 
                }
            ]
        }
    ],
    headerUpdatePatterns: {
        version: /([\*#] @version\s+)[\d.]+(-[a-z]+\.\d+)?/,
        release: /([\*#] @release\s+)[\d-]+/
    }
}
```

### Site `site/webapp/bump-version.conf`

```javascript
{
    filePatterns: [
        'package.json',
        'site/webapp/app.conf',
        'site/webapp/controller/*.js',
        'README.md'
    ],
    fileUpdateRules: [
        {
            pattern: 'package.json',
            replacements: [
                { 
                    from: /"version": "[\d.]+(-[a-z]+\.\d+)?"/,
                    to: (version) => `"version": "${version}"` 
                }
            ]
        },
        {
            pattern: 'site/webapp/app.conf',
            replacements: [
                { 
                    from: /(version: +['"])[\d.]+(-[a-z]+\.\d+)?/,
                    to: (version, match, p1) => `${p1}${version}`, 
                    scope: 'version' 
                },
                { 
                    from: /(release: +['"])[\d-]+/,
                    to: (release, match, p1) => `${p1}${release}`, 
                    scope: 'release' 
                }
            ]
        }
    ],
    headerUpdatePatterns: {
        version: /([\*#] @version\s+)[\d.]+(-[a-z]+\.\d+)?/,
        release: /([\*#] @release\s+)[\d-]+/
    }
}
```

## Usage Examples

### Site Developers

```bash
# Initial configuration
npx jpulse configure

# Update framework to latest
npx jpulse update

# Update framework to specific version (beta/RC)
npx jpulse update @jpulse-net/jpulse-framework@1.0.0-rc.1

# Version bumping (first time - needs config)
npx jpulse bump-version 0.2.0
# Shows instructions to create site/webapp/bump-version.conf

# After creating config
npx jpulse bump-version 0.3.0 2025-01-27

# Database setup
npx jpulse mongodb-setup

# Validation
npx jpulse validate
```

### Framework Developers

```bash
# Version bumping (first time - needs config)
npx jpulse bump-version 1.0.5
# Shows instructions to create webapp/bump-version.conf

# After creating config
npx jpulse bump-version 1.0.6 2025-01-27
```

## Migration Notes

### Breaking Changes
1. **Removed bin entries**: `jpulse-configure`, `jpulse-update` no longer direct commands
2. **Removed npm scripts**: All `jpulse-*` scripts removed from site package.json
3. **Command syntax**: `npx jpulse-framework` → `npx jpulse`

### Backward Compatibility
- **Not required**: Product not yet announced, breaking changes acceptable
- **Documentation**: Update all docs/examples to use new command structure

### Migration Path for Existing Sites
1. Update to new framework version
2. Remove `jpulse-*` scripts from `package.json`
3. Use `npx jpulse <command>` directly
4. Create `site/webapp/bump-version.conf` if using version bumping

## Documentation Updates Required

1. **docs/installation.md**: Update all command examples
2. **docs/getting-started.md**: Update command references
3. **templates/README.md**: Update command examples
4. **templates/deploy/README.md**: Update deployment commands
5. **docs/dev/installation.md**: Update framework dev commands
6. **CHANGELOG.md**: Document breaking changes

## Benefits

1. **Consistency**: Single entry point, unified command pattern
2. **Clarity**: Shorter, more intuitive commands
3. **Organization**: Configs with related files, not in root
4. **Maintainability**: No code duplication, config-driven
5. **Extensibility**: Easy to add new tools following same pattern
6. **Developer Experience**: "Don't make me think" - clear, predictable

## Future Considerations

### Additional Tools
Following the same pattern, future tools could include:
- `npx jpulse new-controller <name>` - Scaffold controller + view
- `npx jpulse new-model <name>` - Scaffold model
- `npx jpulse db-backup` - Database backup utility
- `npx jpulse deploy-prep` - Pre-deployment checklist

All would follow the same principles:
- Configuration-driven (`.conf` files)
- Context-aware (framework vs site)
- Configs in appropriate locations
- No hard-coded defaults

## Implementation Checklist

- [ ] Update `package.json` bin entry (single `jpulse` entry)
- [ ] Update `bin/jpulse-framework.js` dispatcher with new command map
- [ ] Update `bin/jpulse-framework.js` help text
- [ ] Refactor `bin/bump-version.js` to load config from files
- [ ] Add context detection to `bin/bump-version.js`
- [ ] Add config instructions to `bin/bump-version.js`
- [ ] Update `bin/configure.js` to generate simplified site package.json
- [ ] Update `bin/jpulse-update.js` to include package update
- [ ] Create framework `webapp/bump-version.conf` template/example
- [ ] Update all documentation with new commands
- [ ] Update templates with new command examples
- [ ] Update CHANGELOG.md

## Related Work Items

- **W-085**: This work item
- **Future**: Additional utility scripts following this pattern

## Notes

- Configuration files use `.conf` format (JavaScript objects) for consistency with `app.conf`
- Framework version and site version are independent (site might start at 0.1.0)
- Both dev and prod contexts supported (same script, different directories)
- Only framework-provided tools exposed; site owners will create their own tool structure
