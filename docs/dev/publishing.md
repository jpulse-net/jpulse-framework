# jPulse Docs / Dev / Package Publishing Guide v1.6.10

This guide covers publishing the jPulse Framework to GitHub Packages for framework maintainers and core developers.

> **Site Development**: For using published packages to create sites, see [Site Installation Guide](../installation.md).

## Prerequisites

### Required
- **Maintainer access** to the jpulse-framework repository
- **GitHub Personal Access Token** with packages scope
- **npm CLI** configured for GitHub Packages
- **Git** with push access to main branch

### Permissions Needed
- **write:packages** - Publish packages to GitHub Packages
- **read:packages** - Read packages from GitHub Packages
- **repo** - Access to repository for automated workflows

## GitHub Packages Setup

### 1. Create Personal Access Token
```bash
# Visit: https://github.com/settings/tokens
# Click "Generate new token (classic)"
# Add note: jPulse Framework package management
# Select scopes:
#   - repo (Full control of private repositories)
#   - write:packages (Upload packages to GitHub Package Registry)
#   - read:packages (Download packages from GitHub Package Registry)
#   - delete:packages (Delete packages from GitHub Package Registry)

# Copy the token - you'll need it for authentication
```

### 2. Configure npm for GitHub Packages
```bash
# Login to GitHub Packages registry
npm login --registry=https://npm.pkg.github.com

# When prompted:
# Username: your-github-username
# Password: your-personal-access-token (NOT your GitHub password!)
# You should see: Logged in on https://npm.pkg.github.com/.

# IMPORTANT: The "Password" field requires your Personal Access Token,
# not your GitHub account password, even if you use passwordless login
```

**Alternative Method (if login fails):**
```bash
# Create/edit ~/.npmrc file directly
echo "//npm.pkg.github.com/:_authToken=YOUR_PERSONAL_ACCESS_TOKEN" >> ~/.npmrc
echo "@peterthoeny:registry=https://npm.pkg.github.com" >> ~/.npmrc
```

### 3. Verify Authentication
```bash
# Test authentication
npm whoami --registry=https://npm.pkg.github.com

# Should return your GitHub username
```

## Publishing Workflow

### Pre-Publishing Checks
Before publishing, always run these validation steps:

```bash
# 1. Run complete test suite
npm test

# 2. Verify package contents
npm pack --dry-run

# 3. Check package size
npm pack
ls -la *.tgz
```

### Method 1: Automated Publishing (Recommended)

The framework includes GitHub Actions for automated publishing:

```bash
# 1. Bump version across all files:
node bin/bump-version.js 0.6.0
# 2. Verify if correct:
git status
git diff
# 3. Add and commit if OK:
git add .
git commit -m "W-051, v0.6.0: Feature: ..."
git tag v0.6.0
git push origin main --tags

# 4. GitHub Actions will automatically:
#    - Run all tests
#    - Publish to GitHub Packages
#    - Create GitHub release
```

**GitHub Actions Workflow:**
- Triggered by version tags (`v*`)
- Runs complete test suite
- Publishes to `@jpulse-net/jpulse-framework`
- Creates GitHub release with installation instructions

#### Build Failure Troubleshooting

If the automated build fails, follow these steps:

**Step 1: Identify the Issue**
```bash
# Check GitHub Actions logs at:
# https://github.com/jpulse-net/jpulse-framework/actions

# Common failure types:
# - npm ci dependency sync issues
# - Test failures (especially cross-platform compatibility)
# - Authentication/permission issues
```

**Step 2: Fix Common Issues**

*npm ci Dependency Sync Failure:*
```bash
# Update package-lock.json to sync with package.json
npm install

# Commit the updated lock file
git add package-lock.json
git commit -m "Fix: Update package-lock.json to sync with package.json dependencies for vX.X.X build"
```

*Test Failures (e.g., shellcheck not available):*
```bash
# Run tests locally to identify the issue
npm test

# Fix the failing tests (e.g., improve cross-platform compatibility)
# Commit the fixes
git add .
git commit -m "Fix: Improve cross-platform compatibility for CI environment"
```

*Authentication/Permission Issues:*
```bash
# Verify GitHub token has required permissions:
# - repo (Full control of private repositories)
# - write:packages (Upload packages)
# - read:packages (Download packages)
```

**Step 3: Update the Tag**
```bash
# Delete the failed tag (local and remote)
git tag -d vX.X.X
git push origin --delete vX.X.X

# Push your fixes
git push origin main

# Re-create and push the tag
git tag vX.X.X
git push origin vX.X.X
```

**Step 4: Monitor the Rebuild**
```bash
# GitHub Actions will automatically trigger on the new tag
# Monitor at: https://github.com/jpulse-net/jpulse-framework/actions
```

### Method 2: Manual Publishing

For manual control or testing:

```bash
# 1. Ensure tests pass
npm test

# 2. Update version
npm version patch  # or minor/major

# 3. Publish to GitHub Packages
npm publish --registry=https://npm.pkg.github.com

# 4. Push version tag
git push origin main --tags
```

### Method 3: Manual Workflow Dispatch

Trigger automated publishing without creating a tag:

```bash
# 1. Go to GitHub Actions tab in repository
# 2. Select "Publish to GitHub Packages" workflow
# 3. Click "Run workflow"
# 4. Select version bump type (patch/minor/major)
# 5. Click "Run workflow"
```

## Version Management

### Semantic Versioning
Follow semantic versioning (semver) for releases:

- **Patch** (0.5.5 → 0.5.6): Bug fixes, documentation updates
- **Minor** (0.5.5 → 0.6.0): New features, non-breaking changes
- **Major** (0.5.5 → 1.0.0): Breaking changes, API changes

### Version Commands
```bash
# Use the project's bump script to update all ~100 files consistently
node bin/bump-version.js 0.6.1    # Patch version (bug fixes)
node bin/bump-version.js 0.7.0    # Minor version (new features)
node bin/bump-version.js 1.0.0    # Major version (breaking changes)

# Always follow with git operations:
git add .
git commit -m "W-051, v0.6.1: Description of changes"
git tag v0.6.1
git push origin main --tags
```

## Package Validation

### Post-Publishing Validation

```bash
# 1. Verify package is available
npm view @jpulse-net/jpulse-framework --registry=https://npm.pkg.github.com

# 2. Test installation in clean directory (requires GitHub Packages auth)
mkdir test-install && cd test-install
npx jpulse-install
npx jpulse configure

# 3. Install dependencies and verify CLI tools work
npm install
npm start
```

## Package Configuration

### Files Included in Package
The `package.json` `files` array controls what gets published:

```json
{
  "files": [
    "webapp/",
    "bin/",
    "templates/",
    "docs/",
    "README.md",
    "LICENSE"
  ]
}
```

### Files Excluded from Package
Automatically excluded (via `.gitignore` and npm defaults):
- `site/` - Framework's test site
- `coverage/` - Test coverage reports
- `node_modules/` - Dependencies
- `.git/` - Git repository data
- `cursor_log.txt` - Development logs
- `*.save*` - Backup files

## Troubleshooting

### Authentication Issues
```bash
# Clear npm cache
npm cache clean --force

# Re-login to GitHub Packages
npm logout --registry=https://npm.pkg.github.com
npm login --registry=https://npm.pkg.github.com

# Verify .npmrc configuration
cat ~/.npmrc
# Should contain: //npm.pkg.github.com/:_authToken=YOUR_TOKEN
```

### Publishing Failures
```bash
# Check package name and scope
npm view @jpulse-net/jpulse-framework --registry=https://npm.pkg.github.com

# Verify version doesn't already exist
npm view @jpulse-net/jpulse-framework versions --json --registry=https://npm.pkg.github.com

# Check GitHub Packages permissions
# Visit: https://github.com/jpulse-net/jpulse-framework/packages
```

### GitHub Actions Issues
```bash
# Check workflow status
# Visit: https://github.com/jpulse-net/jpulse-framework/actions

# Common issues:
# - GITHUB_TOKEN permissions
# - Test failures blocking publish
# - Version tag format (must be v*.*.*)
```

## Security Considerations

### Token Management
- **Never commit** personal access tokens to repository
- **Use repository secrets** for GitHub Actions
- **Rotate tokens** regularly (every 6-12 months)
- **Limit token scope** to minimum required permissions

### Package Security
- **Review dependencies** before publishing
- **Run security audit**: `npm audit`
- **Check for vulnerabilities**: `npm audit fix`
- **Verify package contents**: `npm pack --dry-run`

## Release Process

### Complete Release Checklist
1. ✅ **Update documentation** for new features
2. ✅ **Run full test suite**: `npm test`
3. ✅ **Test CLI tools**: `npm run test:cli`
4. ✅ **Update version**: `npm version patch|minor|major`
5. ✅ **Push changes**: `git push origin main --tags`
6. ✅ **Verify GitHub Actions** complete successfully
7. ✅ **Test published package** in clean environment
8. ✅ **Update release notes** on GitHub
9. ✅ **Announce release** to users/team

### Post-Release Tasks
- Monitor for issues with new release
- Update documentation if needed
- Respond to user feedback
- Plan next release cycle

---

## Related Documentation

- **[Framework Development Installation](installation.md)** - Development environment setup
- **[Framework Architecture](README.md)** - Technical architecture guide
- **[Site Installation Guide](../installation.md)** - Using published packages

---

*For questions about publishing, create an issue with the "publishing" label.*
