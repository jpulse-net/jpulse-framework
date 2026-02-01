# W-134: User View SPA - Public Profiles, Dashboard, and Settings

## Status
🕑 PENDING

## Type
Feature

## Objective
Create a Single Page Application (SPA) for user profiles, dashboard, and settings with config-driven behavior for better UX and discoverability.

## Problem Statement
- Users can't find the settings page easily to change preferences
- Current `/user/profile.shtml` mixes profile viewing with settings editing
- No public profile view for enterprise networking/collaboration features
- Navigation is cluttered with user menu items

## Solution
Create a config-driven SPA at `/user/` that handles:
- `/user/` - Dashboard/search (config-driven, public or authenticated)
- `/user/me` - My dashboard (authenticated, reserved route)
- `/user/settings` - Settings page (authenticated, reserved route)
- `/user/{username}` - Public profile view (config-driven visibility)

---

## Architecture

### SPA Pattern
- **Style**: HTML/JS based (like `/jpulse-docs/`), no Vue.js
- **Entry Point**: `webapp/view/user/index.shtml`
  - any other page can be an entry point too, such as `/user/jimmyneutron`
- **Templates**: All `.tmpl` files in `/user/` directory (no subdirectories)
- **Routing**: Client-side routing in `index.shtml` using `history.pushState()` / `popstate`
- **Scripts**: Embedded in `index.shtml` and `.tmpl` files (no separate scripts directory)

### File Structure
```
webapp/view/user/
├── index.shtml              → SPA entry point with routing logic
├── dashboard.tmpl           → /user/ (directory/search)
├── me.tmpl                  → /user/me (my dashboard)
├── profile.tmpl             → /user/{username} (public profile)
└── settings.tmpl            → /user/settings (settings page)
```

---

## Configuration

### app.conf Structure
```javascript
model: {
    user: {
        reservedUsernames: [ 'settings', 'me' ],  // Used in user page routing 
    }
},
controller: {
    user: {
        profile: {
            withoutAuth: {
                allowed:    false,  // false: /api/1/user/public/:id denied
                fields:     []      // additional fields beyond always-included
            },
            withAuth: {
                allowed:    true,   // true: /api/1/user/public/:id allowed
                fields:     [ 'email' ],    // use dot notation, e.g. 'preferences.theme'
            }
        }
    }
},
view: {
    user: {
        index: {
            withoutAuth: {
                enabled: true,        // false: show red error message
                statsCards: [],      // empty: no stats
                navCards: [ 'login', 'signup' ],
                queryFields: []      // empty: no query/search
            },
            withAuth: {
                enabled: true,
                statsCards: [ 'usersTotal', 'usersActive' ],
                navCards: [ 'me', 'settings', 'admin' ],
                queryFields: [ 'name', 'email' ]
            }
        }
    }
}
```

### Config Options

**index.statsCards** (available):
- `usersTotal` - Total user count
- `usersActive` - Active user count
- `usersAdmin` - Admin user count

**index.navCards** (available):
- `login` - Link to login page
- `signup` - Link to signup page
- `me` - Link to /user/me
- `settings` - Link to /user/settings
- `admin` - Link to /admin/ (admins only)

**index.queryFields** (available):
- `name` - Search by name (firstName/lastName/username)
- `email` - Search by email
- `roles` - Filter by role
- `status` - Filter by status

**controller.user.profile.fields**:
- **Always Included** (not configurable):
  - `username` - User's login ID
  - `profile.firstName` - First name
  - `profile.lastName` - Last name
  - `initials` - Computed from firstName/lastName (e.g., "JD" for John Doe)
- **Configurable Fields** (via `fields` array):
  - Additional fields specified in dot notation (e.g., `email`, `preferences.theme`, `status`)
  - Empty array `[]` means only always-included fields are shown
  - Example: `fields: [ 'email', 'preferences.theme' ]` shows username, name, initials, email, and theme preference

**Note**: The `fields` array specifies **additional** fields beyond the always-included ones. This keeps the config simple while ensuring basic profile information (username, name) is always available.

**Design Decision - Always-Included Fields**:
- **Always included**: `username`, `profile.firstName`, `profile.lastName`, `initials` (computed)
- **Rationale**: 
  - These fields are essential for identifying a user in any profile view
  - Keeps config simple (no need to list obvious fields)
  - Ensures consistent UX (every profile shows at least name/username)
  - `initials` is computed from firstName/lastName for avatar display
- **Configurable fields**: Everything else (email, preferences, status, etc.) must be explicitly listed in `fields`

---

## Implementation Plan

### Phase 1: Reserved Usernames Validation

**File**: `webapp/model/user.js`

**Changes**:
1. Add `reservedUsernames` check in `UserModel.validate()`
2. Read from `appConfig.model.user.reservedUsernames` (default: `['settings', 'me']`)
3. Case-insensitive comparison
4. Add error message: `"username \"{username}\" is reserved and cannot be used"`

**Code Location**: After line 282 (after username format validation)

```javascript
// Check reserved usernames (only for create)
if (!isUpdate && data.username) {
    const reserved = global.appConfig?.model?.user?.reservedUsernames || ['settings', 'me'];
    const usernameLower = data.username.toLowerCase();
    if (reserved.some(r => r.toLowerCase() === usernameLower)) {
        errors.push(`username "${data.username}" is reserved and cannot be used`);
    }
}
```

---

### Phase 2: API Authentication and Field Filtering

**File**: `webapp/controller/user.js`

**New Private Method**: `UserController._checkPublicProfilePolicy(req, res)`

**Purpose**: Check public profile access policy from config. Returns `true` if access allowed, `false` if denied (and sends error response). Used by both `search()` and `getPublic()` methods to avoid code duplication.

**Implementation**:
```javascript
/**
 * Check if public profile access is allowed based on config policy
 * Admins always have access (preserved)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @returns {boolean} True if access allowed, false if denied (error response sent)
 */
static _checkPublicProfilePolicy(req, res) {
    const profileConfig = global.appConfig?.controller?.user?.profile || {};
    const adminRoles = global.appConfig?.controller?.user?.adminRoles || ['admin', 'root'];
    const isAuthenticated = AuthController.isAuthenticated(req);
    
    // Admins always have access (preserve admin access)
    if (isAuthenticated && AuthController.isAuthorized(req, adminRoles)) {
        return true; // Admin access granted
    }
    
    // Determine which policy to check based on auth state
    const policyConfig = isAuthenticated 
        ? profileConfig.withAuth 
        : profileConfig.withoutAuth;
    
    // Check if access is allowed
    if (!policyConfig || !policyConfig.allowed) {
        const authState = isAuthenticated ? 'authenticated' : 'unauthenticated';
        LogController.logError(req, 'user._checkPublicProfilePolicy', 
            `error: Public profile access denied for ${authState} user`);
        const message = global.i18n.translate(req, 'controller.user.publicProfileAccessDenied');
        global.CommonUtils.sendError(req, res, 403, message, 'PUBLIC_PROFILE_ACCESS_DENIED');
        return false;
    }
    
    return true; // Access allowed
}
```

**New Helper Function**: `UserController._filterPublicProfileFields(user, req)`

**Purpose**: Shared field filtering logic for both `search()` and `getPublic()` methods.

**Implementation**:
```javascript
/**
 * Filter user object to include only public profile fields based on config
 * @param {object} user - User object from database
 * @param {object} req - Express request object (for auth state and admin check)
 * @returns {object} Filtered user object
 */
static _filterPublicProfileFields(user, req) {
    const profileConfig = global.appConfig?.controller?.user?.profile || {};
    const adminRoles = global.appConfig?.controller?.user?.adminRoles || ['admin', 'root'];
    const isAuthenticated = AuthController.isAuthenticated(req);
    const isAdmin = isAuthenticated && AuthController.isAuthorized(req, adminRoles);
    
    // Determine which fields config to use based on auth state
    const fieldsConfig = isAuthenticated 
        ? (profileConfig.withAuth?.fields || [])
        : (profileConfig.withoutAuth?.fields || []);
    
    // Start with always-included fields
    const filtered = {
        username: user.username,
        profile: {
            firstName: user.profile?.firstName || '',
            lastName: user.profile?.lastName || ''
        },
        initials: ((user.profile?.firstName?.[0] || '') + (user.profile?.lastName?.[0] || '')).toUpperCase()
    };
    
    // Add configured additional fields (handle dot notation)
    fieldsConfig.forEach(fieldPath => {
        const value = this._getNestedValue(user, fieldPath);
        if (value !== undefined) {
            this._setNestedValue(filtered, fieldPath, value);
        }
    });
    
    // Admins can see additional fields (e.g., uuid)
    if (isAdmin && user.uuid) {
        filtered.uuid = user.uuid;
    }
    
    // Always exclude sensitive fields
    // passwordHash, etc. are never included
    
    return filtered;
}

/**
 * Get nested value from object using dot notation
 * @param {object} obj - Source object
 * @param {string} path - Dot notation path (e.g., 'preferences.theme')
 * @returns {*} Value at path or undefined
 */
static _getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

/**
 * Set nested value in object using dot notation
 * @param {object} obj - Target object
 * @param {string} path - Dot notation path (e.g., 'preferences.theme')
 * @param {*} value - Value to set
 */
static _setNestedValue(obj, path, value) {
    const parts = path.split('.');
    const last = parts.pop();
    const target = parts.reduce((acc, part) => {
        if (acc[part] === undefined) acc[part] = {};
        return acc[part];
    }, obj);
    target[last] = value;
}
```

**File**: `webapp/routes.js`

**Updated Routes**:
```javascript
// User search - changed from admin-only to profile access policy
// Previously: AuthController.requireRole(adminRoles)
// Now: No middleware - access control handled in UserController.search()
router.get('/api/1/user/search', UserController.search);

// Public profile endpoint - supports both ObjectId and username, access based on config policy
// No middleware - access control handled in UserController.getPublic()
router.get('/api/1/user/public/:id', UserController.getPublic);
```

**Note**: Access control is now handled in controller methods using `_checkPublicProfilePolicy()` to avoid code duplication with field filtering logic.

**Note on User Search**:
- Previously required admin role (`AuthController.requireRole(adminRoles)`)
- Now uses profile access policy (checked in `UserController.search()` via `_checkPublicProfilePolicy()`)
- **Admin access preserved**: Admins always have access regardless of policy settings
- Allows configurable access: can be public, authenticated-only, or admin-only based on `controller.user.profile` config
- **Search results must respect field filtering**: Same as public profiles (always-included + configured fields)
- **No middleware**: Access control and field filtering are handled together in controller to avoid code duplication

**Current State** (unchanged):
- `GET /api/1/user/:id` requires `AuthController.requireAuthentication` (private endpoint, own profile or admin)
- Regular users can only access their own profile via `/api/1/user`
- Admins can access any profile via `/api/1/user/:id`

**Updated Controller Method**: `UserController.search(req, res)`

**Changes Needed**:
1. **Add access control check** at start of method:
   - Call `if (!this._checkPublicProfilePolicy(req, res)) return;`
   - This checks policy and sends 403 error if denied (method returns early)
   - Admins always pass this check
2. **Add field filtering** to search results:
   - After getting results from `UserModel.search()`, filter each user in `results.data` array
   - Use helper function: `results.data = results.data.map(user => this._filterPublicProfileFields(user, req))`
   - This ensures search results respect the same field filtering as public profiles
   - Admins see additional fields (e.g., `uuid`) as determined by `_filterPublicProfileFields()`

**New Controller Method**: `UserController.getPublic(req, res)`

**Implementation Details**:

1. **Access control check** at start of method:
   - Call `if (!this._checkPublicProfilePolicy(req, res)) return;`
   - This checks policy and sends 403 error if denied (method returns early)
   - Admins always pass this check (preserved admin access)
   - Checks `controller.user.profile.withoutAuth.allowed` for unauthenticated users
   - Checks `controller.user.profile.withAuth.allowed` for authenticated users

2. **User lookup** (same logic as `UserController.get`):
   - Check if `:id` is ObjectId (24 hex chars) → lookup by `_id`
   - Otherwise → lookup by `username`
   - Return 404 if user not found

3. **Field filtering**:
   - Use helper function: `const filteredUser = this._filterPublicProfileFields(user, req)`
   - Returns filtered user object with:
     - Always-included fields: `username`, `profile.firstName`, `profile.lastName`, `initials`
     - Additional fields from config based on auth state
     - Admin-visible fields (e.g., `uuid`) if requester is admin
     - Sensitive fields excluded: `passwordHash`, etc.

**Note**: Users can always access their own full profile via `/api/1/user` (authenticated endpoint, no policy check needed).

---

### Phase 3: SPA Entry Point

**File**: `webapp/view/user/index.shtml`

**Structure**:
1. HTML skeleton with content container
2. Client-side routing logic
3. Route handlers that load templates dynamically
4. Browser history support (`pushState` / `popstate`)

**Routes**:
- `/user/` → `dashboard.tmpl` (config-driven)
- `/user/me` → `me.tmpl` (authenticated)
- `/user/settings` → `settings.tmpl` (authenticated)
- `/user/{username}` → `profile.tmpl` (public, if enabled)

**Template Loading Pattern**:
- Templates are embedded in `index.shtml` using `{{file.include}}` at server render time
- Templates are stored as JavaScript template strings or HTML strings
- Client-side routing shows/hides or injects template content into content container

**Routing Logic**:
```javascript
// Templates embedded at server render time (like hello-vue pattern)
{{file.include "user/dashboard.tmpl"}}
{{file.include "user/me.tmpl"}}
{{file.include "user/profile.tmpl"}}
{{file.include "user/settings.tmpl"}}

// Extract route from URL
const path = window.location.pathname;
const match = path.match(/^\/user\/(.*)$/);
const route = match ? match[1] : '';

// Route handler
function handleRoute() {
    const contentEl = document.getElementById('user-content');
    
    if (route === 'settings') {
        // Check authentication (server-side check also needed)
        if (!user.isAuthenticated) {
            window.location.href = '/auth/login.shtml';
            return;
        }
        // Show settings template
        loadTemplate('settings', contentEl);
    } else if (route === 'me') {
        // Check authentication
        if (!user.isAuthenticated) {
            window.location.href = '/auth/login.shtml';
            return;
        }
        // Show me template
        loadTemplate('me', contentEl);
    } else if (route === '') {
        // Show dashboard template (public or authenticated based on config)
        loadTemplate('dashboard', contentEl);
    } else {
        // Check if profile access is allowed (via API call or config check)
        // Show profile template for username
        loadProfileTemplate(route, contentEl);
    }
}

// Handle browser back/forward
window.addEventListener('popstate', handleRoute);
handleRoute(); // Initial load
```

---

### Phase 4: Template Files

**Files**: `webapp/view/user/*.tmpl`

**dashboard.tmpl**:
- **Public or authenticated** based on `view.user.index.withoutAuth.enabled` / `withAuth.enabled`
- Config-driven stats cards (if `index.withAuth.statsCards` or `index.withoutAuth.statsCards`)
  - Load stats via `/api/1/user/stats` (if authenticated and statsCards configured)
- Config-driven nav cards
- Search form (if `index.withAuth.queryFields` not empty)
  - Only shown if authenticated (search requires authentication via policy)
- Search results table (if authenticated and queryFields configured)
  - Loads via `/api/1/user/search` with field filtering

**me.tmpl**:
- **Requires authentication**: Check `{{#if user.isAuthenticated}}` in template
- User stats (lastLogin, accountStatus, memberSince) - loaded via API
- User card (view-only preview) - shows current user info
- Nav cards (settings, admin if admin)

**profile.tmpl**:
- Public profile view (visibility controlled by `controller.user.profile.withoutAuth.allowed`)
- Loads user data via `/api/1/user/public/:username` API
- **Error handling**: 
  - 404 if user not found
  - 403 if profile access denied (redirect or show error message)
- Always shows: username, firstName, lastName, initials (computed)
- Config-driven additional fields:
  - If not authenticated: `controller.user.profile.withoutAuth.fields`
  - If authenticated: `controller.user.profile.withAuth.fields`
- Avatar (if available)
- Additional fields based on config

**settings.tmpl**:
- Move content from current `profile.shtml`
- Full settings UI (profile, preferences, security, plugin cards)
- **Requires authentication**: 
  - Server-side: Check `{{#if user.isAuthenticated}}` in template
  - Client-side: Redirect to login if not authenticated
  - API calls: All settings endpoints require authentication

---

### Phase 5: Navigation Updates

**File**: `webapp/view/jpulse-navigation.js`

**Changes**:
1. Remove `user.overview` and `user.profile` from dropdown
2. Add `user.settings` with `hideInDropdown: true` (breadcrumb only)
3. Keep `user` parent visible in dropdown (entry point)

**Updated Structure**:
```javascript
user: {
    label: `{{i18n.view.navigation.user._index}}`,
    url: '/user/',
    icon: '👤',
    pages: {
        settings: {
            label: `{{i18n.view.navigation.user.settings}}`,
            url: '/user/settings',
            hideInDropdown: true  // Breadcrumb only
        },
        auth: {
            label: `{{i18n.view.navigation.auth.logout}}`,
            url: '/auth/logout.shtml',
            icon: '🔑',
        },
    }
}
```

---

### Phase 6: Breadcrumb Behavior

**Breadcrumb Logic**:
- Pages missing from site nav are automatically shown as page name by URI path
- Examples:
  - `/user/me` → `User > Me`
  - `/user/settings` → `User > Settings`
  - `/user/jimmyneutron` → `User > jimmyneutron`

**Implementation**: Handled automatically by existing breadcrumb system (no changes needed)

---

### Phase 7: Rename Profile to Settings

**File**: `webapp/view/user/profile.shtml` → `webapp/view/user/settings.shtml`

**Changes**:
1. Rename file
2. Update all references:
   - Navigation links
   - i18n keys (if needed)
   - Internal links
3. Update title/description in file header

---

## API Endpoints

### Existing Endpoints (Updated)
- `GET /api/1/user` - Current user (authenticated, unchanged)
- `GET /api/1/user/:id` - User by ID/username (authenticated, admin or own profile, unchanged)
- `GET /api/1/user/search` - Search users
  - **Changed**: Previously admin-only (`AuthController.requireRole(adminRoles)`)
  - **Now**: Uses profile access policy (checked in `UserController.search()` via `_checkPublicProfilePolicy()`)
  - **No middleware**: Access control handled in controller method
  - **Admin access preserved**: Admins always have access regardless of policy
  - Access controlled by `controller.user.profile.withoutAuth.allowed` / `withAuth.allowed`
  - **Field filtering**: Each user in search results is filtered using `_filterPublicProfileFields()` helper
    - Always-included fields: `username`, `profile.firstName`, `profile.lastName`, `initials`
    - Additional fields from config: `controller.user.profile.withoutAuth.fields` / `withAuth.fields`
    - Sensitive fields excluded: `passwordHash`, `uuid` (unless admin), etc.

### New Endpoints
- `GET /api/1/user/public/:id` - Public user profile endpoint
  - **No middleware**: Access control handled in controller method via `_checkPublicProfilePolicy()`
  - **Admin access preserved**: Admins always have access regardless of policy
  - Policy: `controller.user.profile.withoutAuth.allowed` / `withAuth.allowed`
  - Returns always-included fields (username, firstName, lastName, initials) plus configured `fields`
  - Supports both ObjectId and username (same logic as `/api/1/user/:id`)
  - Field filtering via `UserController._filterPublicProfileFields()` helper

---

## Testing Checklist

### Phase 1: Reserved Usernames
- [ ] Reserved username validation blocks signup
- [ ] Reserved username validation allows updates (existing users)
- [ ] Case-insensitive reserved username check works

### Phase 2: API Access Control
- [ ] `UserController._checkPublicProfilePolicy(req, res)` private method works correctly
- [ ] Method preserves admin access (admins always allowed regardless of policy)
- [ ] Method returns false (and sends 403) when `withoutAuth.allowed = false` (unauthenticated, non-admin)
- [ ] Method returns false (and sends 403) when `withAuth.allowed = false` (authenticated, non-admin)
- [ ] Method returns true when policy allows access
- [ ] `/api/1/user/search` calls `_checkPublicProfilePolicy()` and respects result
- [ ] `/api/1/user/public/:id` calls `_checkPublicProfilePolicy()` and respects result
- [ ] `UserController._filterPublicProfileFields()` helper function works correctly
- [ ] Helper function includes always-included fields (username, firstName, lastName, initials)
- [ ] Helper function includes configured `fields` based on auth state
- [ ] Helper function handles dot notation paths (e.g., `preferences.theme`)
- [ ] Helper function excludes sensitive fields (passwordHash, etc.)
- [ ] Helper function includes admin-visible fields (e.g., uuid) when requester is admin
- [ ] Public profile API (`getPublic`) uses helper function correctly
- [ ] Search results (`search`) use helper function to filter each user in results.data
- [ ] Search results respect field filtering (always-included + configured fields)

### Phase 3-7: SPA and UI
- [ ] `/user/` shows correct content based on auth state and config
- [ ] `/user/me` requires authentication (server-side check + client redirect)
- [ ] `/user/settings` requires authentication (server-side check + client redirect)
- [ ] `/user/{username}` respects `controller.user.profile.withoutAuth.allowed`
- [ ] `/user/{username}` handles 404 (user not found) gracefully
- [ ] `/user/{username}` handles 403 (access denied) gracefully
- [ ] Templates load correctly via `{{file.include}}` pattern
- [ ] Client-side routing works (pushState / popstate)
- [ ] Config-driven stats cards render correctly
- [ ] Config-driven nav cards render correctly
- [ ] Search functionality works (if queryFields configured)
- [ ] Search results display with field filtering
- [ ] Breadcrumbs display correctly
- [ ] Navigation dropdown excludes user sub-items
- [ ] Settings page works (moved from profile.shtml)
- [ ] Reserved usernames (settings, me) cannot be accessed as profiles

---

## Migration Notes

1. **Existing Users**:
   - Users with reserved usernames (settings, me) are grandfathered
   - Validation only applies to new signups

2. **Config Migration**:
   - Default config values provided
   - Site overrides in `site/webapp/app.conf` take precedence

---

## Deliverables

1. ✅ Reserved username validation in `UserModel.validate()`
2. ✅ New private method: `UserController._checkPublicProfilePolicy(req, res)` (access control, preserves admin access)
3. ✅ New helper function: `UserController._filterPublicProfileFields(user, req)` (shared field filtering)
4. ✅ Updated route: `/api/1/user/search` (changed from admin-only to policy-based, no middleware)
5. ✅ New route: `/api/1/user/public/:id` (public profile endpoint, no middleware)
6. ✅ Updated controller method: `UserController.search()` (adds access check and field filtering)
7. ✅ New controller method: `UserController.getPublic()` (uses both helper methods)
8. ✅ SPA entry point (`index.shtml`)
9. ✅ Template files (dashboard, me, profile, settings)
10. ✅ Navigation updates
11. ✅ Settings page (renamed from profile.shtml)
12. ✅ Config documentation
13. ✅ Testing

---

## Design Decisions

### Option 2: Controller-Based Access Control

**Decision**: All access control and field filtering logic is in `UserController` using private methods.

**Rationale**:
- **Avoids code duplication**: Access control and field filtering are tightly coupled
- **Single responsibility**: All user profile logic stays in UserController
- **Easier maintenance**: Related code is in one place
- **No middleware needed**: Access control is specific to user profile operations

**Implementation**:
- `_checkPublicProfilePolicy(req, res)` - Private method for access control
- `_filterPublicProfileFields(user, req)` - Private method for field filtering
- Both `search()` and `getPublic()` use both methods
- No middleware duplication

**Alternative Considered**: Middleware factory `requirePublicProfilePolicy()` was considered but rejected due to code duplication with field filtering logic.

---

## References

- `/jpulse-docs/` - SPA pattern reference
- `webapp/view/jpulse-docs/index.shtml` - Routing implementation
- `webapp/app.conf` - Configuration structure
- `webapp/model/user.js` - Username validation
- `webapp/controller/user.js` - User controller (access control and field filtering)
- `webapp/routes.js` - API routes
