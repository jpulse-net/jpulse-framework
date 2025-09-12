# W-051, W-015, W-050: Deployment: Strategy for Clean Onboarding with Private Packages

## Executive Summary

Implement repository separation using private npm packages (GitHub Packages) to achieve clean team separation while maintaining the "don't make me think" developer experience. This strategy builds on W-051 (Framework Package Distribution) as the foundational infrastructure.

## Work Item Dependencies

- **W-051**: Framework Package Distribution (Infrastructure) - **PREREQUISITE**
- **W-050**: Repository separation strategy - **DEPENDS ON W-051**
- **W-015**: Deployment strategy for clean onboarding - **DEPENDS ON W-051**

## Strategic Approach

### Phase 1: Foundation Infrastructure (W-051)

**Framework Team Actions (W-051 deliverables):**
- Restructure jpulse-framework for npm publishing to @peterthoeny/jpulse-framework
- Set up GitHub Packages for private distribution
- Update PathResolver for node_modules resolution
- Create framework package.json and publishing workflow
- Test private package installation and usage

### Phase 2: Repository Separation Implementation (W-050)

**Site Team Benefits:**
- Work in completely separate repositories
- Standard npm dependency management: npm install @peterthoeny/jpulse-framework
- Read-only access prevents accidental framework modifications
- Pin to specific framework versions for stability

### Phase 3: Enhanced Deployment & Onboarding (W-015)

**Site Template Repository:**
- Create jpulse-site-starter template repository
- Include working examples (hello.js, site-demo.shtml, app.conf.tmpl)
- Provide clean starting point for new sites

**CLI Tooling (Future):**
- npx @jpulse/create-site my-site for automated setup
- Framework version management utilities
- Migration tools for existing sites

## Technical Implementation

### Repository Structure After W-050

**Framework Repository (jpulse-framework):**
```
jpulse-framework/
├── webapp/              # Core framework code
├── docs/               # Framework documentation
├── package.json        # For GitHub Packages publishing (W-051)
└── README.md           # Framework-specific docs
```

**Site Repository (separate repos):**
```
my-jpulse-site/
├── webapp/             # Site-specific overrides only
│   ├── controller/     # Only overridden controllers
│   ├── view/          # Only overridden views
│   └── app.conf       # Site configuration
├── package.json       # Includes @peterthoeny/jpulse-framework dependency
└── README.md          # Site-specific documentation
```

### Enhanced PathResolver (W-051 Implementation)

```javascript
// Updated for npm-installed framework
static resolveModule(modulePath) {
    // 1. Site override (highest priority)
    const siteWebappPath = path.join(process.cwd(), 'webapp', modulePath);
    if (fs.existsSync(siteWebappPath)) {
        return siteWebappPath;
    }
    
    // 2. Framework fallback (from node_modules)
    const frameworkPath = path.join(process.cwd(), 'node_modules/@peterthoeny/jpulse-framework/webapp', modulePath);
    if (fs.existsSync(frameworkPath)) {
        return frameworkPath;
    }
    
    throw new Error(`Module not found: ${modulePath}`);
}
```

## Documentation Strategy

### Current site/README.md Distribution:
1. **Framework docs**: Move core override system documentation to docs/site-development.md
2. **Site template**: Adapted quick-start guide in jpulse-site-starter/README.md
3. **Generated sites**: Minimal site-specific README with framework links

## Benefits

### Team Separation:
- ✅ Framework and site teams work independently
- ✅ No accidental framework modifications by site teams
- ✅ Clean version management and upgrade paths
- ✅ Standard npm tooling and workflows

### Developer Experience:
- ✅ Maintains "don't make me think" principle
- ✅ Familiar npm dependency management
- ✅ Clean site repository structure (overrides only)
- ✅ Breaking changes acceptable at this early stage

### Future Evolution:
- ✅ Natural migration path to Docker deployment
- ✅ Foundation for advanced deployment orchestration (W-015)
- ✅ Supports multiple site deployment patterns

## Implementation Timeline

**Phase 1 (W-051): Weeks 1-4**
- Framework restructuring and GitHub Packages setup
- PathResolver updates for npm resolution
- Package publishing workflow implementation
- Initial testing and validation

**Phase 2 (W-050): Weeks 5-8**
- Site template repository creation
- Documentation migration and updates
- Site team onboarding and migration tools

**Phase 3 (W-015): Weeks 9-12**
- Advanced deployment patterns
- CLI tooling development
- Production deployment strategies

## Success Metrics

### W-051 Success Criteria:
- @peterthoeny/jpulse-framework package successfully published to GitHub Packages
- PathResolver correctly resolves from node_modules
- Framework can be installed and used as npm dependency

### W-050 Success Criteria:
- Site teams can create new projects using template in <10 minutes
- Zero framework code in site repositories
- Clean separation enables independent team velocity

### W-015 Success Criteria:
- Framework updates don't break existing sites (version pinning)
- Comprehensive deployment documentation and tooling
- Multiple deployment patterns supported (dev, staging, production)

## Future Considerations

**Docker Integration (W-015 Advanced Phase):**
- Framework becomes base Docker image
- Site code layers on top via Docker multi-stage builds
- Private npm approach provides clean migration path

**Advanced Deployment Orchestration:**
- Multiple deployment patterns supported
- Load balancer and clustering configurations
- Production-ready orchestration templates
- Integration with CI/CD pipelines

## Risk Mitigation

**W-051 Dependencies:**
- GitHub Packages access and permissions
- npm package structure compatibility
- PathResolver backward compatibility

**Migration Strategy:**
- Gradual migration from monorepo to separate repositories
- Maintain current system during transition
- Comprehensive testing with existing sites
