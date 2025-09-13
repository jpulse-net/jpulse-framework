# %SITE_NAME%, based on jPulse Framework v0.6.7

This is a jPulse Framework site created with `npx jpulse-setup`.

## Quick Start

1. **Configure your site:**
   ```bash
   cp site/webapp/app.conf.tmpl site/webapp/app.conf
   # Edit site/webapp/app.conf with your settings
   ```

2. **Start development:**
   ```bash
   npm start
   ```

3. **Visit your site:**
   - Main site: http://localhost:8080/
   - Admin: http://localhost:8080/admin/

## Site Customization

### Directory Structure

```
my-site/
├── webapp/                # Framework files (managed by jpulse-sync)
├── site/webapp/           # Your customizations
│   ├── app.conf           # Site configuration
│   ├── controller/        # Custom controllers
│   ├── model/             # Custom models
│   ├── view/              # Custom views
│   └── static/            # Custom assets
├── package.json           # Dependencies
└── README.md              # This file
```

### Creating Overrides

**Controllers:** Create `site/webapp/controller/[name].js`
**Views:** Create `site/webapp/view/[path]/[name].shtml`
**Assets:** Place in `site/webapp/static/[path]/`

## Updating Framework

```bash
# Current (private repo)
npm update @peterthoeny/jpulse-framework
npx jpulse-sync

# Once public: npm update @peterthoeny/jpulse-framework && npx jpulse-sync
```

> **Note**: Authentication setup is only required during initial installation while the repository is private.

## Documentation

- [jPulse Framework Documentation](https://github.com/peterthoeny/jpulse-framework/tree/main/docs)
- [Site Customization Guide](https://github.com/peterthoeny/jpulse-framework/blob/main/docs/site-customization.md)

## Support

For framework issues, see: https://github.com/peterthoeny/jpulse-framework/issues

<!--
 @name            jPulse Framework / Site README
 @tagline         Site-specific README for sites based on jPulse Framework
 @description     Generated README for sites created with jpulse-setup
 @site            %SITE_NAME%
 @generated       %GENERATION_DATE%
 @file            templates/README.md
 @version         0.6.7
 @release         2025-09-13
 @repository      https://github.com/peterthoeny/jpulse-framework
 @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 @copyright       2025 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 @license         AGPL v3, see LICENSE file
 @genai           99%, Cursor 1.2, Claude Sonnet 4
-->
