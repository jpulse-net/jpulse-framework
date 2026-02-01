# W-107: Data-Driven User Profile Plugin Extensions

## Status
✅ DONE (2025-12-06)

## Overview

Enable plugins to extend user profile pages (both admin and user-facing) with data-driven cards that display plugin-specific user data and actions.

## Problem Statement

Currently, plugins that extend the user schema (like auth-mfa adding `user.mfa.*` fields) have no standard way to display this data in profile pages. Each plugin would need to create its own pages, leading to:
- Fragmented UX (navigate to multiple pages)
- Duplicated code for user management
- Inconsistent UI patterns

## Solution

Enhance `UserModel.extendSchema()` to accept metadata that describes:
1. How to display the plugin's data block as a card (separately for admin and user views)
2. Which fields are visible/editable in each view
3. What actions are available (as declarative field updates)

Profile pages automatically render cards for all plugin schema extensions:
- `webapp/view/admin/user-profile.shtml` → renders `adminCard` config
- `webapp/view/user/profile.shtml` → renders `userCard` config

---

## Schema Extension Format

### Card-Level Metadata (`_meta`)

Each plugin block has separate configuration for admin and user views:

```javascript
UserModel.extendSchema({
    mfa: {
        _meta: {
            plugin: 'auth-mfa',           // Plugin name (required)
            adminCard: {
                visible: true,
                label: 'MFA Settings',
                icon: '🔐',
                description: 'Two-factor authentication status and management',
                backgroundColor: '#fef9e7',
                order: 100,
                actions: [
                    { id: 'reset', label: 'Reset MFA', style: 'warning', ... },
                    { id: 'unlock', label: 'Unlock', style: 'success', ... }
                ]
            },
            userCard: {
                visible: true,
                label: 'Two-Factor Authentication',
                icon: '🔐',
                description: 'Secure your account with an authenticator app',
                backgroundColor: '#e8f5e9',
                order: 10,
                actions: [
                    { id: 'disable', label: 'Disable 2FA', style: 'danger', ... },
                    { id: 'regenerate', label: 'New Backup Codes', style: 'secondary', ... }
                ]
            }
        },
        // ... field definitions
    }
});
```

### Field-Level Attributes

```javascript
{
    enabled: {
        type: 'boolean',
        default: false,
        label: 'Status',
        adminCard: { visible: true, readOnly: true },
        userCard: { visible: true, readOnly: true },
        displayAs: 'badge'
    },
    secret: {
        type: 'string',
        adminCard: { visible: false },   // Never show
        userCard: { visible: false }
    },
    backupCodes: {
        type: 'array',
        default: [],
        label: 'Backup Codes',
        adminCard: { visible: true, readOnly: true },
        userCard: { visible: true, readOnly: true },
        displayAs: 'count'
    },
    enrolledAt: {
        type: 'date',
        label: 'Enrolled',
        adminCard: { visible: true, readOnly: true },
        userCard: { visible: true, readOnly: true },
        displayAs: 'date',
        showIf: 'hasValue'
    },
    lockedUntil: {
        type: 'date',
        label: 'Locked Until',
        adminCard: { visible: true, readOnly: true },
        userCard: { visible: false },    // Don't show lock details to user
        displayAs: 'datetime',
        showIf: 'hasValue'
    },
    failedAttempts: {
        type: 'number',
        label: 'Failed Attempts',
        adminCard: { visible: true, readOnly: true },
        userCard: { visible: false },    // Don't show to user
        showIf: { field: 'failedAttempts', condition: 'gt', value: 0 }
    }
}
```

### Declarative Actions

Actions define buttons that modify form data locally. User then saves all changes:

```javascript
// Admin actions (in _meta.adminCard.actions)
actions: [
    {
        id: 'reset',
        label: 'Reset MFA',
        style: 'warning',
        icon: '🔄',
        confirm: 'Reset MFA for this user? They will need to set it up again.',
        toast: "The user's MFA has been reset. Don't forget to save the changes.",
        showIf: { field: 'mfa.enabled', equals: true },
        setFields: {
            'mfa.enabled': false,
            'mfa.secret': '',
            'mfa.backupCodes': [],
            'mfa.enrolledAt': null,
            'mfa.failedAttempts': 0,
            'mfa.lockedUntil': null
        }
    },
    {
        id: 'unlock',
        label: 'Unlock',
        style: 'success',
        icon: '🔓',
        confirm: 'Unlock this user?',
        toast: "The user has been unlocked. Don't forget to save the changes.",
        showIf: { field: 'mfa.lockedUntil', condition: 'exists' },
        setFields: {
            'mfa.failedAttempts': 0,
            'mfa.lockedUntil': null
        }
    }
]

// User actions (in _meta.userCard.actions)
actions: [
    {
        id: 'disable',
        label: 'Disable 2FA',
        style: 'danger',
        confirm: 'Disable two-factor authentication? Your account will be less secure.',
        toast: "Two-factor authentication disabled. Don't forget to save.",
        showIf: { field: 'mfa.enabled', equals: true },
        setFields: {
            'mfa.enabled': false,
            'mfa.secret': '',
            'mfa.backupCodes': []
        }
    },
    {
        id: 'regenerate',
        label: 'New Backup Codes',
        style: 'secondary',
        confirm: 'Generate new backup codes? Your old codes will stop working.',
        // Note: This action needs special handling - can't just setFields
        // May need endpoint or custom handler for backup code generation
        showIf: { field: 'mfa.enabled', equals: true },
        handler: 'regenerateBackupCodes'  // Custom handler for complex actions
    }
]
```

### ShowIf Conditions

```javascript
// Simple conditions
showIf: 'hasValue'                    // Field has a truthy value
showIf: 'always'                      // Always show (default)

// Complex conditions
showIf: { field: 'mfa.enabled', equals: true }
showIf: { field: 'mfa.enabled', equals: false }
showIf: { field: 'mfa.lockedUntil', condition: 'exists' }
showIf: { field: 'mfa.failedAttempts', condition: 'gt', value: 0 }
```

---

## Implementation Plan

### Phase 1: UserModel Enhancement (~1h)

**File:** `webapp/model/user.js`

1. **Enhance `extendSchema()` method:**
   - Accept and store `_meta` block with `adminCard`/`userCard`
   - Store field-level attributes including `adminCard`/`userCard`
   - Validate schema extension format

2. **Store schema extensions internally:**
   ```javascript
   static schemaExtensions = {};  // Populated by extendSchema()
   ```

### Phase 2: User API Enhancement (~45m)

**File:** `webapp/controller/user.js`

1. **Add `?includeSchema=1` parameter:**
   ```javascript
   GET /api/1/user/123?includeSchema=1

   Response:
   {
       success: true,
       data: { username: 'ptester10', mfa: { enabled: true, ... }, ... },
       schema: {
           mfa: {
               _meta: { plugin: 'auth-mfa', adminCard: {...}, userCard: {...} },
               enabled: { type: 'boolean', adminCard: {...}, userCard: {...}, ... }
           }
       }
   }
   ```

2. **Add username fallback for user lookup:**
   ```javascript
   GET /api/1/user/ptester10

   // If id is not ObjectId format → try as username
   ```

### Phase 3: Admin UI (~2h)

**File:** `webapp/view/admin/user-profile.shtml`

1. **Fetch user with schema:**
   ```javascript
   const result = await jPulse.api.get(`/api/1/user/${userId}?includeSchema=1`);
   ```

2. **Render plugin cards using `adminCard` config:**
   ```javascript
   function renderPluginCards(userData, schema) {
       Object.entries(schema).forEach(([blockKey, blockDef]) => {
           const cardConfig = blockDef._meta?.adminCard;
           if (cardConfig?.visible) {
               renderCard(blockKey, cardConfig, blockDef, userData[blockKey]);
           }
       });
   }
   ```

3. **Action buttons (edit-modify-save pattern):**
   - Show confirmation dialog
   - Apply `setFields` to local form data
   - Show toast message
   - User clicks "Save Changes" to persist

### Phase 4: User Profile UI (~1h)

**File:** `webapp/view/user/profile.shtml`

Same pattern as admin, but uses `userCard` config instead of `adminCard`.

### Phase 5: MFA Plugin Update (~30m)

**File:** `plugins/auth-mfa/webapp/model/mfaAuth.js`

Update schema extension with `adminCard`/`userCard` structure.

**Delete:** `plugins/auth-mfa/webapp/view/admin/mfa-management.shtml` (no longer needed)

### Phase 6: Testing (~30m)

- Test schema extension with adminCard/userCard
- Test ?includeSchema=1 parameter
- Test card rendering in both admin and user views
- Test action buttons and save flow

---

## MFA Plugin Schema (Full Example)

```javascript
static registerSchemaExtension() {
    UserModel.extendSchema({
        mfa: {
            _meta: {
                plugin: 'auth-mfa',
                adminCard: {
                    visible: true,
                    label: 'MFA Settings',
                    icon: '🔐',
                    description: 'Two-factor authentication status and management',
                    backgroundColor: '#fef9e7',
                    order: 100,
                    actions: [
                        {
                            id: 'reset',
                            label: 'Reset MFA',
                            style: 'warning',
                            icon: '🔄',
                            confirm: 'Reset MFA for this user? They will need to set it up again.',
                            toast: "The user's MFA has been reset. Don't forget to save the changes.",
                            showIf: { field: 'mfa.enabled', equals: true },
                            setFields: {
                                'mfa.enabled': false,
                                'mfa.secret': '',
                                'mfa.backupCodes': [],
                                'mfa.enrolledAt': null,
                                'mfa.failedAttempts': 0,
                                'mfa.lockedUntil': null
                            }
                        },
                        {
                            id: 'unlock',
                            label: 'Unlock',
                            style: 'success',
                            icon: '🔓',
                            confirm: 'Unlock this user?',
                            toast: "The user has been unlocked. Don't forget to save the changes.",
                            showIf: { field: 'mfa.lockedUntil', condition: 'exists' },
                            setFields: {
                                'mfa.failedAttempts': 0,
                                'mfa.lockedUntil': null
                            }
                        }
                    ]
                },
                userCard: {
                    visible: true,
                    label: 'Two-Factor Authentication',
                    icon: '🔐',
                    description: 'Secure your account with an authenticator app',
                    backgroundColor: '#e8f5e9',
                    order: 10,
                    actions: [
                        {
                            id: 'setup',
                            label: 'Enable 2FA',
                            style: 'primary',
                            showIf: { field: 'mfa.enabled', equals: false },
                            navigate: '/auth/mfa-setup'  // Navigate instead of setFields
                        },
                        {
                            id: 'disable',
                            label: 'Disable 2FA',
                            style: 'danger',
                            confirm: 'Disable two-factor authentication? Your account will be less secure.',
                            toast: "Two-factor authentication has been disabled.",
                            showIf: {
                                all: [
                                    { field: 'mfa.enabled', equals: true },
                                    { config: 'auth-mfa.allowUserDisable', equals: true }
                                ]
                            },
                            setFields: {
                                'mfa.enabled': false,
                                'mfa.secret': '',
                                'mfa.backupCodes': [],
                                'mfa.enrolledAt': null
                            }
                        },
                        {
                            id: 'regenerate',
                            label: 'New Backup Codes',
                            style: 'secondary',
                            showIf: { field: 'mfa.enabled', equals: true },
                            handler: 'mfa.regenerateBackupCodes'  // Defined in plugin's jpulse-common.js
                        }
                    ]
                }
            },
            enabled: {
                type: 'boolean',
                default: false,
                label: 'Status',
                adminCard: { visible: true, readOnly: true },
                userCard: { visible: true, readOnly: true },
                displayAs: 'badge'
            },
            method: {
                type: 'string',
                default: 'totp',
                adminCard: { visible: false },
                userCard: { visible: false }
            },
            secret: {
                type: 'string',
                default: '',
                adminCard: { visible: false },
                userCard: { visible: false }
            },
            backupCodes: {
                type: 'array',
                default: [],
                label: 'Backup Codes',
                adminCard: { visible: true, readOnly: true },
                userCard: { visible: true, readOnly: true },
                displayAs: 'count'
            },
            enrolledAt: {
                type: 'date',
                default: null,
                label: 'Enrolled',
                adminCard: { visible: true, readOnly: true },
                userCard: { visible: true, readOnly: true },
                displayAs: 'date',
                showIf: 'hasValue'
            },
            lastUsedAt: {
                type: 'date',
                default: null,
                label: 'Last Used',
                adminCard: { visible: true, readOnly: true },
                userCard: { visible: true, readOnly: true },
                displayAs: 'date',
                showIf: 'hasValue'
            },
            failedAttempts: {
                type: 'number',
                default: 0,
                label: 'Failed Attempts',
                adminCard: { visible: true, readOnly: true },
                userCard: { visible: false },
                showIf: { field: 'mfa.failedAttempts', condition: 'gt', value: 0 }
            },
            lockedUntil: {
                type: 'date',
                default: null,
                label: 'Locked Until',
                adminCard: { visible: true, readOnly: true },
                userCard: { visible: false },
                displayAs: 'datetime',
                showIf: 'hasValue'
            },
            gracePeriodUntil: {
                type: 'date',
                default: null,
                adminCard: { visible: false },
                userCard: { visible: false }
            }
        }
    });
}
```

---

## UI Mockups

### Admin User Profile

```
┌────────────────────────────────────────────────────────────────────────┐
│  👤 Manage User: @ptester10                                            │
│  ────────────────────────────────────────────────────────────────────  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Administrative Settings                         (existing card) │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Profile Information                             (existing card) │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ 🔐 MFA Settings                           [Unlock] [Reset MFA] │    │
│  │ ────────────────────────────────────────────────────────────── │    │
│  │ Status:          🔒 Locked                                     │    │
│  │ Enrolled:        2025-12-01                                    │    │
│  │ Last Used:       2025-12-04                                    │    │
│  │ Backup Codes:    5 remaining                                   │    │
│  │ Failed Attempts: 5                                             │    │
│  │ Locked Until:    2025-12-05 10:45                              │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                        │
│                                           [Save Changes] [Cancel]      │
└────────────────────────────────────────────────────────────────────────┘
```

### User Profile (Own)

```
┌────────────────────────────────────────────────────────────────────────┐
│  👤 My Profile                                                         │
│  ────────────────────────────────────────────────────────────────────  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Profile Information                             (existing card) │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ 🔐 Two-Factor Authentication       [New Backup Codes] [Disable]│    │
│  │ ────────────────────────────────────────────────────────────── │    │
│  │ Secure your account with an authenticator app                  │    │
│  │                                                                │    │
│  │ Status:          ✅ Enabled                                    │    │
│  │ Enrolled:        2025-12-01                                    │    │
│  │ Last Used:       2025-12-05                                    │    │
│  │ Backup Codes:    8 remaining                                   │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                        │
│                                           [Save Changes] [Cancel]      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Action Types

### 1. setFields (Simple)

Modifies form data locally. User must click "Save Changes" to persist:

```javascript
{
    id: 'reset',
    label: 'Reset MFA',
    style: 'warning',
    confirm: 'Reset MFA for this user?',
    toast: "MFA has been reset. Don't forget to save.",
    setFields: {
        'mfa.enabled': false,
        'mfa.secret': '',
        'mfa.backupCodes': []
    }
}
```

### 2. navigate (Redirect)

Navigates to another page. If form has unsaved changes, shows confirmation:

```javascript
{
    id: 'setup',
    label: 'Enable 2FA',
    navigate: '/auth/mfa-setup'
}
```

**Dirty form handling:** Before navigating, if the form has unsaved changes:
```javascript
// Automatic behavior - no extra config needed
if (formIsDirty()) {
    const result = await jPulse.UI.confirmDialog({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes.',
        buttons: ['Cancel', 'Save and Continue']
    });
    if (result.button === 'Cancel') return;
    await saveForm();
}
window.location.href = action.navigate;
```

### 3. handler (Custom)

Calls a registered handler function for complex operations that need API calls or multi-step flows.

```javascript
{
    id: 'regenerate',
    label: 'New Backup Codes',
    handler: 'mfa.regenerateBackupCodes'  // Namespaced handler name
}
```

**Where handler code is defined:** In the plugin's client-side JavaScript:

```
plugins/auth-mfa/webapp/view/jpulse-common.js
```

This file is appended to framework's `jpulse-common.js` (W-098 append mode):

```javascript
// plugins/auth-mfa/webapp/view/jpulse-common.js

window.jPulse = window.jPulse || {};
window.jPulse.schemaHandlers = window.jPulse.schemaHandlers || {};

window.jPulse.schemaHandlers['mfa.regenerateBackupCodes'] = async function(userData, formData) {
    // 1. Confirm action
    const confirm = await jPulse.UI.confirmDialog({
        title: 'Generate New Backup Codes',
        message: 'Your old backup codes will stop working. Continue?',
        buttons: ['Cancel', 'Generate']
    });
    if (confirm.button !== 'Generate') return { cancelled: true };

    // 2. Call API - server generates and stores hashed codes
    const result = await jPulse.api.post('/api/1/mfa/backup-codes');
    if (!result.success) {
        jPulse.UI.toast.error(result.error || 'Failed to generate codes');
        return { error: true };
    }

    // 3. Show codes to user (one-time display)
    await jPulse.UI.infoDialog({
        title: 'New Backup Codes',
        message: `
            <p>Save these codes in a safe place. Each can only be used once.</p>
            <pre style="background:#f5f5f5; padding:10px;">${result.data.codes.join('\n')}</pre>
        `
    });

    // 4. Tell UI to refresh the card (backup count changed)
    return { refresh: true };
};
```

**Why handler instead of setFields:**
- Server generates random codes (can't know values upfront)
- Need to display dialog with the generated codes
- Server does the actual database save (hashed codes)
- Multi-step async flow with user interaction

---

## Policy-Based Action Visibility

Actions can be shown/hidden based on plugin configuration stored in the database:

```javascript
{
    id: 'disable',
    label: 'Disable 2FA',
    showIf: {
        all: [
            { field: 'mfa.enabled', equals: true },
            { config: 'auth-mfa.allowUserDisable', equals: true }
        ]
    },
    setFields: { 'mfa.enabled': false, ... }
}
```

**How config values work:**
- `plugin.json` defines the config **schema** (what settings exist, defaults)
- **Database** stores the admin's actual values (via `/admin/plugin-config.shtml`)
- `config: 'auth-mfa.allowUserDisable'` reads from database, not plugin.json
- Plugin updates replace plugin.json but don't affect database config

---

## Testing Plan

### Unit Tests

1. **UserModel.extendSchema():**
   - Stores _meta with adminCard/userCard
   - Stores field-level adminCard/userCard

2. **User API ?includeSchema=1:**
   - Returns schema with all extensions

3. **Username fallback:**
   - ObjectId → find by _id
   - Non-ObjectId → find by username

### Manual Tests

1. **Admin view:**
   - View user with MFA enabled → shows Reset button
   - View locked user → shows Unlock + Reset buttons
   - Click Reset → confirm → toast → fields cleared
   - Click Save → changes persisted

2. **User view:**
   - Own profile shows MFA card with user-friendly text
   - Enable 2FA → navigates to setup page
   - Disable 2FA → confirm → toast → fields cleared
   - New Backup Codes → calls handler → shows codes

---

## Security Considerations

1. **Role-based visibility:** Admin sees `adminCard`, user sees `userCard`
2. **Sensitive fields:** Always `visible: false` in both cards
3. **Confirmation dialogs:** Required for destructive actions
4. **Toast reminders:** Remind to save changes
5. **Field validation:** Server validates all updates

---

## Related Work Items

- **W-106:** Plugin CLI Management (done)
- **W-108:** Auth MFA Plugin (uses this pattern)
- **TD-20:** Data-Driven Plugin Admin Cards (similar pattern for plugin config)

---

## Estimated Effort

| Phase | Task | Effort |
|-------|------|--------|
| 1 | UserModel enhancement | ~1h |
| 2 | User API: ?includeSchema + username fallback | ~45m |
| 3 | Admin UI: render plugin cards | ~2h |
| 4 | User profile UI: render plugin cards | ~1h |
| 5 | MFA plugin: update schema, delete mfa-management.shtml | ~30m |
| 6 | Testing | ~30m |
| **Total** | | **~5.5h** |

---

## Files Affected

**Framework (jpulse-framework repo):**
- `webapp/model/user.js` - Schema extension with adminCard/userCard
- `webapp/controller/user.js` - ?includeSchema param, username fallback
- `webapp/view/admin/user-profile.shtml` - Render adminCard
- `webapp/view/user/profile.shtml` - Render userCard

**Plugin (plugin-auth-mfa repo):**
- `webapp/model/mfaAuth.js` - Updated schema with adminCard/userCard
- `webapp/view/jpulse-common.js` - Register schema action handlers
- `webapp/view/admin/mfa-management.shtml` - **DELETE** (no longer needed)

---

**Last Updated:** 2025-12-05
