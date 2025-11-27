# jPulse Framework / Docs / Plugins / Creating Plugins v1.2.6

A step-by-step guide to creating your first jPulse plugin.

## Plugin Structure

```
plugins/your-plugin/
├── plugin.json                    # Plugin metadata
├── README.md                      # Developer documentation
├── docs/
│   └── README.md                  # User/admin documentation
└── webapp/
    ├── controller/
    │   └── yourPlugin.js          # API endpoints
    ├── model/
    │   └── yourPlugin.js          # Data models
    ├── view/
    │   ├── plugins/
    │   │   └── your-plugin.shtml  # Dashboard card + detail page
    │   ├── your-plugin/
    │   │   └── index.shtml        # Application page
    │   ├── jpulse-common.js       # Shared JavaScript
    │   ├── jpulse-common.css      # Shared CSS
    │   └── jpulse-navigation.js   # Navigation extension
    └── static/
        ├── images/
        └── assets/
```

## Step 1: Create plugin.json

*TODO: Add detailed guide with examples*

## Step 2: Implement Controllers

*TODO: Add controller implementation guide*

## Step 3: Create Models

*TODO: Add model implementation guide*

## Step 4: Build Views

*TODO: Add view development guide*

## Step 5: Add Documentation

*TODO: Add documentation guide*

---

**Note**: This documentation is under development. See the [Hello World plugin](../installed-plugins/hello-world/README.md) for a complete working example.

