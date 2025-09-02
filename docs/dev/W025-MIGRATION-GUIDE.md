# W-025 Migration Guide: Component-Based Styling

## Overview
This guide documents the migration from inline styles to the `jp-` component system, providing patterns for W-036 view migrations.

## Component Library Reference

### Layout Components
- `.jp-container` - Responsive container with max-width
- `.jp-main` - Main content area with white background
- `.jp-card` - Reusable card component with shadow
- `.jp-card-header` - Card header with bottom border
- `.jp-card-body` - Card content area
- `.jp-card-footer` - Card footer with top border

### UI Components
- `.jp-btn` + `.jp-btn-primary/secondary/success/danger/outline`
- `.jp-alert` + `.jp-alert-info/error/success/warning`
- `.jp-info-box/warning-box/error-box` - Message containers
- `.jp-stats-grid` + `.jp-stat-card` - Statistics display
- `.jp-error-container` + `.jp-error-details` - Error page layout

### Form Components
- `.jp-form-group` - Form field container
- `.jp-form-label` - Form field labels
- `.jp-form-input/select/textarea` - Form inputs
- `.jp-form-grid` - Responsive form layout
- `.jp-search-section` + `.jp-search-form` - Search interfaces
- `.jp-field-error` - Error state styling

### Typography
- `.jp-title` - Page titles with bottom border
- `.jp-subtitle` - Section headings
- `.jp-text-muted/small/center` - Text utilities

### Utilities
- `.jp-hidden` - Hide elements
- `.jp-flex/flex-between/flex-center/flex-wrap` - Flexbox utilities
- `.jp-gap-10/15/20` - Gap spacing
- `.jp-mb-10/15/20/30` - Margin bottom utilities

## Migration Patterns

### Pattern 1: Replace Custom Containers
**Before:**
```css
.container {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    padding: 40px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
```

**After:**
```html
<div class="jp-card">
    <!-- content -->
</div>
```

### Pattern 2: Replace Info Boxes
**Before:**
```css
.info {
    background: #e7f3ff;
    padding: 15px;
    border-radius: 5px;
    margin: 20px 0;
}
```

**After:**
```html
<div class="jp-info-box">
    <!-- content -->
</div>
```

### Pattern 3: Replace Form Styling
**Before:**
```css
.form-group {
    margin-bottom: 15px;
}
.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
}
```

**After:**
```html
<div class="jp-form-group">
    <label class="jp-form-label">Label</label>
    <input class="jp-form-input" type="text">
</div>
```

### Pattern 4: Replace Button Styling
**Before:**
```css
.btn {
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    background: #007acc;
    color: white;
}
```

**After:**
```html
<button class="jp-btn jp-btn-primary">Button</button>
```

## Remaining View Migrations for W-036
1. `auth/login.shtml` - Forms and error handling
2. `user/profile.shtml` - Complex forms and validation
3. `auth/signup.shtml` - Form handling and validation
4. `user/index.shtml` - Stats grids and search forms
5. `auth/logout.shtml` - Minimal changes needed

Each migration should follow the patterns documented above.

## Framework/Site Separation Ready

### CSS Organization
- **Framework Core**: Layout system, utilities (never overridden)
- **Site Customizable**: Colors, component styling (can be overridden)
- **Theme System**: `.jp-theme-*` classes ready for W-037 implementation

### Future Site Override Structure (W-014)
