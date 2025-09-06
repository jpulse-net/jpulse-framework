# Site Customizations Directory

This directory contains site-specific customizations that override the jPulse Framework defaults.

## W-014: Site Override System

The site override system allows you to customize the jPulse Framework without modifying the core framework files, ensuring your customizations survive framework updates.

### Directory Structure

```
site/
├── README.md                    # This file
└── webapp/                      # Site-specific overrides
    ├── app.conf                 # Site configuration (gitignored)
    ├── app.conf.example         # Configuration template
    ├── controller/              # Site controller overrides
    │   └── hello.js             # Demo controller override
    ├── model/                   # Site model overrides
    ├── view/                    # Site template overrides
    │   └── hello/
    │       └── index.shtml      # Demo view override
    └── static/                  # Site-specific assets
```

### How It Works

**File Resolution Priority:**
1. `site/webapp/[type]/[file]` (Site override - highest priority)
2. `webapp/[type]/[file]` (Framework default - fallback)
3. Error if neither found

**Configuration Merging:**
- Framework defaults: `webapp/app.conf`
- Site overrides: `site/webapp/app.conf`
- Result: Deep merged configuration with site values taking precedence

### Getting Started

1. **Copy the configuration template:**
   ```bash
   cp site/webapp/app.conf.example site/webapp/app.conf
   ```

2. **Customize your configuration:**
   Edit `site/webapp/app.conf` with your site-specific settings.

3. **Create overrides as needed:**
   - Controllers: `site/webapp/controller/[name].js`
   - Models: `site/webapp/model/[name].js`
   - Views: `site/webapp/view/[path]/[name].shtml`
   - Assets: `site/webapp/static/[path]/[file]`

### Demo Override

The demo shows the "don't make me think" principle in action:

**View Override (Automatic):**
- Visit `/hello/` - automatically uses `site/webapp/view/hello/index.shtml`
- No route registration needed - works through existing dynamic routing

**API Override (Auto-Discovery):**
- Visit `/api/1/hello` - uses `site/webapp/controller/hello.js`
- **Zero manual configuration** - auto-discovered at app startup
- Follows the same `/api/1/` pattern as other APIs

**Configuration Override:**
- All values from `site/webapp/app.conf` are automatically available

**Interactive Demo:**
- Click "Test Site API" button to see `jPulse.apiCall()` in action
- Live demonstration of site override API functionality

### Protected Files

The following files are protected from framework updates:
- `site/` directory (all contents)
- `.jpulse/site-*` (site metadata)

### Best Practices

1. **Configuration**: Only override values you need to change
2. **Controllers**: Extend framework controllers when possible
3. **Views**: Copy and modify entire templates for consistency
4. **Assets**: Use site-specific paths to avoid conflicts
5. **Documentation**: Document your customizations

### Version Compatibility

This site override system is part of W-014 Phase 1 and is compatible with jPulse Framework v0.4.10+.

For more information, see the main project documentation and `tt-w-014-w-045-mvc-site-plugins-architecture.md`.
