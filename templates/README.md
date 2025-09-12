# My jPulse Site

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

### Updating Framework

```bash
npm run update
# or manually:
npm update @jpulse/framework
npx jpulse-sync
```

## Documentation

- [jPulse Framework Documentation](https://github.com/peterthoeny/jpulse-framework/tree/main/docs)
- [Site Customization Guide](https://github.com/peterthoeny/jpulse-framework/blob/main/docs/site-customization.md)

## Support

For framework issues, see: https://github.com/peterthoeny/jpulse-framework/issues
