# W-108: plugins: auth-mfa plugin for MFA (multi-factor authentication)

## Status
✅ COMPLETE (v1.0.0 released 2025-12-08)

## Release Info
- **Version:** 1.0.0
- **Release Date:** 2025-12-08
- **Repository:** github.com/jpulse-net/plugin-auth-mfa
- **npm Package:** @jpulse-net/plugin-auth-mfa@1.0.0 (GitHub Package Registry)
- **Install:** `npx jpulse plugin install auth-mfa`
- **Compatibility:** jPulse Framework v1.3.10+

## Objective

Create an `auth-mfa` plugin that adds TOTP-based multi-factor authentication (MFA) to jPulse Framework. This plugin will leverage the existing hook infrastructure from W-105 to intercept the login flow and require a second authentication factor using authenticator apps (Google Authenticator, Authy, Microsoft Authenticator, etc.).

**Scope:** Authenticator app (TOTP) only. SMS-based MFA is out of scope for this work item due to external service dependencies.

**Repository:** `github.com/jpulse-net/plugin-auth-mfa` (separate repo, independent versioning)

## Related Work Items

- **W-110**: URL redirect with toast queue (complete) - provides deferred toast messages after login
- **W-109**: Multi-step authentication (complete) - provides simplified hooks (onAuthGetSteps, onAuthValidateStep, onAuthGetWarnings)
- **W-107**: Data-Driven User Profile Extensions - provides adminCard/userCard schema for plugin data in user profiles
- **W-106**: Plugin CLI management (complete) - provides install/publish infrastructure
- **W-105**: Plugin hooks for authentication (complete) - provides the MFA hook infrastructure
- **W-045**: Plugin infrastructure (complete) - provides plugin system foundation
- **W-0**: auth with OAuth2 (pending)
- **W-0**: auth with LDAP (pending)

## Why MFA First?

MFA was chosen as the first auth plugin because:
1. **Infrastructure ready**: W-105 created 5 dedicated MFA hooks specifically for this use case
2. **Self-contained**: TOTP requires no external service dependencies
3. **Minimal npm addition**: `otplib` library (~20KB) handles all TOTP logic
4. **No redirect flows**: Unlike OAuth2 which requires callback URLs
5. **Testable locally**: No external providers needed for development

## Existing Hook Infrastructure (from W-105)

The auth controller already has MFA hooks wired in at `webapp/controller/auth.js:218-237`:

```javascript
// W-105: HOOK authAfterPasswordValidationHook - MFA check point
let mfaContext = {
    req,
    user,
    isValid: true,
    requireMfa: false,
    mfaMethod: null
};
mfaContext = await global.HookManager.execute('authAfterPasswordValidationHook', mfaContext);

// If MFA is required, return MFA challenge (don't create session yet)
if (mfaContext.requireMfa) {
    return res.json({
        success: true,
        requireMfa: true,
        mfaMethod: mfaContext.mfaMethod,
        message: global.i18n.translate(req, 'controller.auth.mfaRequired')
    });
}
```

### Hooks Used (W-109 Simplified Naming)

| Hook Name | Description | Context |
|-----------|-------------|---------|
| `onAuthGetSteps` | Return blocking authentication steps (MFA) | `{ req, user, completedSteps, requiredSteps }` |
| `onAuthValidateStep` | Execute and validate MFA step | `{ req, step, stepData, pending, user, valid, error }` |
| `onAuthGetWarnings` | Return non-blocking warnings (MFA nag) | `{ req, user, warnings }` |

---

## Technical Design

### 1. Plugin Structure

```
plugins/
└── auth-mfa/
    ├── plugin.json              # Plugin manifest (admin card auto-generated from this)
    ├── package.json             # npm package manifest
    ├── README.md                # Plugin documentation
    ├── docs/
    │   └── README.md            # Detailed usage guide
    └── webapp/
        ├── controller/
        │   └── mfaAuth.js       # MFA controller with hooks & API endpoints
        ├── model/
        │   └── mfaAuth.js       # MFA data model (user MFA state with adminCard/userCard)
        └── view/
            ├── auth/
            │   ├── mfa-setup.shtml   # MFA enrollment page
            │   └── mfa-verify.shtml  # MFA verification page
            ├── jpulse-common.js      # Schema action handlers (e.g., regenerateBackupCodes)
            └── jpulse-plugins/
                └── auth-mfa.shtml    # User MFA settings/status component
```

**View purposes:**
- `/admin/plugins/` - Auto-generated from plugin.json (config UI, enable/disable)
- `/admin/user-profile.shtml` - Admin manages user MFA via W-107 data-driven card (reset, unlock)
- `/auth/mfa-setup.shtml` - User enrolls in MFA (QR code, verification)
- `/auth/mfa-verify.shtml` - User enters TOTP code during login
- `/user/profile.shtml` - User's MFA settings via W-107 data-driven card (disable, backup codes)
- `/jpulse-plugins/auth-mfa.shtml` - User's detailed MFA settings page

### 2. User Schema Extension (W-107 Format)

The plugin extends the user schema with `adminCard`/`userCard` metadata for data-driven profile cards:

```javascript
// plugins/auth-mfa/webapp/model/mfaAuth.js
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
                        confirm: 'Reset MFA for this user? They will need to set it up again.',
                        toast: "The user's MFA has been reset. Don't forget to save.",
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
                        confirm: 'Unlock this user?',
                        toast: "The user has been unlocked. Don't forget to save.",
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
                        navigate: '/auth/mfa-setup'
                    },
                    {
                        id: 'disable',
                        label: 'Disable 2FA',
                        style: 'danger',
                        confirm: 'Disable two-factor authentication? Your account will be less secure.',
                        toast: 'Two-factor authentication has been disabled.',
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
                        handler: 'mfa.regenerateBackupCodes'
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
            enum: ['totp'],
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
```

### 3. API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | `/api/1/mfa/status` | User | Get user's MFA status |
| POST | `/api/1/mfa/setup` | User | Start MFA enrollment, returns QR code |
| POST | `/api/1/mfa/verify-setup` | User | Verify TOTP during enrollment |
| POST | `/api/1/mfa/verify` | None | Verify TOTP during login |
| POST | `/api/1/mfa/disable` | User | Disable MFA (requires password) |
| GET  | `/api/1/mfa/backup-codes` | User | Generate new backup codes |
| POST | `/api/1/mfa/verify-backup` | None | Verify backup code during login |

### 4. MFA Login Flow (W-109 Multi-Step)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ MFA Login Flow (W-109 Multi-Step Authentication)                             │
└──────────────────────────────────────────────────────────────────────────────┘

1. User submits username/password to POST /api/1/auth/login
2. Password validated by UserModel.authenticate()
3. onAuthGetSteps() → MFA plugin adds 'mfa' step if user.mfa.enabled
4. Auth controller returns: { success: true, nextStep: 'mfa', pending: token }
5. Frontend redirects to /auth/mfa-verify.shtml
6. User enters 6-digit TOTP code
7. User submits to POST /api/1/auth/login with { pending, step: 'mfa', code }
8. onAuthValidateStep() → MFA plugin validates code
   └─ If valid:
      • Record successful verification
      • Complete login, create session
   └─ If invalid:
      • Record failed attempt
      • Check lockout threshold
      • Return error
9. onAuthGetWarnings() → Check for optional MFA nag messages
```

### 5. MFA Enrollment Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ MFA Enrollment Flow                                                          │
└──────────────────────────────────────────────────────────────────────────────┘

1. User navigates to /mfa/setup (authenticated)
2. POST /api/1/mfa/setup
   └─ Generate TOTP secret using otplib
   └─ Return QR code URI and secret (for manual entry)
3. Frontend displays QR code
4. User scans with authenticator app
5. User enters 6-digit code to verify
6. POST /api/1/mfa/verify-setup with code
   └─ Validate code against generated secret
   └─ If valid:
      • Save encrypted secret to user.mfa.secret
      • Set user.mfa.enabled = true
      • Generate and return backup codes
   └─ If invalid:
      • Return error, allow retry
```

### 6. Backup Codes

- Generate 10 single-use backup codes during enrollment
- Each code: 8 alphanumeric characters (e.g., `ABCD-1234`)
- Stored as bcrypt hashes (cannot be recovered, only verified)
- Used codes are removed from the array
- User can regenerate codes (invalidates old ones)

---

## Plugin Configuration Schema

```json
// plugins/auth-mfa/plugin.json (config section)
{
    "config": {
        "schema": [
            {
                "type": "help",
                "content": "<strong>MFA Settings:</strong> Configure multi-factor authentication behavior.",
                "tab": "General"
            },
            {
                "id": "issuerName",
                "label": "Issuer Name",
                "type": "text",
                "default": "jPulse",
                "help": "Displayed in authenticator apps (e.g., 'jPulse' shows as 'jPulse:username')",
                "tab": "General"
            },
            {
                "id": "enforceForRoles",
                "label": "Enforce MFA for Roles",
                "type": "multiselect",
                "default": [],
                "options": [
                    { "value": "admin", "label": "Administrators" },
                    { "value": "root", "label": "Root Users" }
                ],
                "help": "Require MFA for users with these roles (they cannot disable it)",
                "tab": "Security"
            },
            {
                "id": "maxFailedAttempts",
                "label": "Max Failed Attempts",
                "type": "number",
                "default": 5,
                "min": 3,
                "max": 10,
                "help": "Lock account after this many failed MFA attempts",
                "tab": "Security"
            },
            {
                "id": "lockoutDuration",
                "label": "Lockout Duration (minutes)",
                "type": "number",
                "default": 15,
                "min": 5,
                "max": 60,
                "help": "How long to lock account after max failed attempts",
                "tab": "Security"
            },
            {
                "id": "backupCodeCount",
                "label": "Backup Codes Count",
                "type": "number",
                "default": 10,
                "min": 5,
                "max": 20,
                "help": "Number of backup codes to generate",
                "tab": "Advanced"
            },
            {
                "id": "codeValidityWindow",
                "label": "Code Validity Window",
                "type": "number",
                "default": 1,
                "min": 1,
                "max": 3,
                "help": "TOTP time steps to accept (1 = ±30 seconds)",
                "tab": "Advanced"
            }
        ]
    }
}
```

---

## NPM Dependency

**Package:** `otplib`
- **Size:** ~20KB (minimal)
- **Sub-dependencies:** Minimal
- **Purpose:** TOTP generation and validation
- **Why this package:** Well-maintained, standard RFC 6238 implementation, small footprint

```javascript
// Usage example
import { authenticator } from 'otplib';

// Generate secret
const secret = authenticator.generateSecret();

// Generate OTP auth URL (for QR code)
const otpauth = authenticator.keyuri(username, issuer, secret);

// Verify code
const isValid = authenticator.verify({ token: userCode, secret });
```

---

## Hook Implementations (Actual - W-109 Naming)

```javascript
// plugins/auth-mfa/webapp/controller/mfaAuth.js

class MfaAuthController {

    // Declare hooks for auto-registration (W-109 simplified naming)
    static hooks = {
        onAuthGetSteps: { priority: 100 },
        onAuthValidateStep: { priority: 100 },
        onAuthGetWarnings: { priority: 100 }
    };

    /**
     * Return MFA as required step if user has MFA enabled
     */
    static async onAuthGetSteps(context) {
        const { user, requiredSteps } = context;

        if (user?.mfa?.enabled) {
            requiredSteps.push({
                step: 'mfa',
                method: 'totp',
                plugin: 'auth-mfa'
            });
        }

        return context;
    }

    /**
     * Validate TOTP code during MFA step
     */
    static async onAuthValidateStep(context) {
        const { step, stepData, user } = context;

        if (step !== 'mfa') return context;

        // Check lockout
        if (user.mfa?.lockedUntil && new Date() < new Date(user.mfa.lockedUntil)) {
            context.valid = false;
            context.error = 'Account temporarily locked';
            return context;
        }

        // Validate TOTP or backup code
        const { code } = stepData;
        const isValid = await MfaAuthModel.verifyCode(user, code);

        context.valid = isValid;
        if (!isValid) {
            context.error = 'Invalid verification code';
            await MfaAuthModel.recordFailedAttempt(user._id);
        } else {
            await MfaAuthModel.recordSuccessfulVerification(user._id);
        }

        return context;
    }

    /**
     * Return MFA nag warning if policy is optional and MFA not enabled
     */
    static async onAuthGetWarnings(context) {
        const { user, warnings } = context;

        const mfaRequired = await MfaAuthModel.isMfaRequired(user);

        if (mfaRequired.required && !user?.mfa?.enabled) {
            // MFA enforced but not set up - blocking warning
            warnings.push({
                type: 'mfa-not-enabled',
                message: 'MFA is required but not set up',
                blocking: true
            });
        } else if (mfaRequired.reason === 'optional' && !user?.mfa?.enabled) {
            // MFA optional - soft nag with red toast
            warnings.push({
                type: 'mfa-recommended',
                toastType: 'error',
                message: 'Secure your account with two-factor authentication.',
                link: '/jpulse-plugins/auth-mfa.shtml',
                linkText: 'Enable 2FA'
            });
        }

        return context;
    }
}
```

---

## UI Components

### 1. MFA Setup Page (`/auth/mfa-setup.shtml`)

- Display QR code for authenticator app scanning
- Show manual entry secret as fallback
- Input field for verification code
- Display backup codes after successful setup
- "Download backup codes" button

### 2. MFA Verify Page (`/auth/mfa-verify.shtml`)

- Input field for 6-digit TOTP code
- "Use backup code instead" link
- Failed attempt counter
- Lockout message when applicable

### 3. User Profile MFA Card (via W-107)

Rendered automatically in `/user/profile.shtml` using `userCard` schema:
- MFA status badge (enabled/disabled)
- "Enable 2FA" button → navigates to setup page
- "Disable 2FA" button (if policy allows)
- "New Backup Codes" button → calls handler
- Enrolled date, last used date

### 4. Admin User Profile MFA Card (via W-107)

Rendered automatically in `/admin/user-profile.shtml` using `adminCard` schema:
- MFA status badge
- Failed attempts count (if > 0)
- Locked until timestamp (if locked)
- "Reset MFA" button → clears all MFA fields
- "Unlock" button → clears lock fields

### 5. Plugin Config Page (Auto-generated)

`/admin/plugin-config.shtml?plugin=auth-mfa` - Generated from plugin.json config schema

---

## Testing

### Manual Testing (Completed ✅)

1. **MFA Policy: Required for All**
   - ✅ Users must set up MFA before accessing system
   - ✅ Login redirects to MFA setup if not enrolled
   - ✅ Cannot bypass MFA requirement

2. **MFA Policy: Required for Admin & Root**
   - ✅ Admin/root users must have MFA
   - ✅ Regular users can login without MFA
   - ✅ Role-based enforcement works correctly

3. **MFA Policy: Optional**
   - ✅ Users can login without MFA
   - ✅ Nag toast shown: "Secure your account..." (red, 8 sec, with link)
   - ✅ Users can enable/disable MFA at will

4. **MFA Enrollment Flow**
   - ✅ QR code displays correctly
   - ✅ Manual secret entry works
   - ✅ Valid code enables MFA
   - ✅ Backup codes generated and displayed

5. **MFA Login Flow**
   - ✅ Multi-step login works (W-109)
   - ✅ TOTP verification successful
   - ✅ Backup code verification works
   - ✅ Failed attempts tracked

6. **Lockout & Recovery**
   - ✅ Lockout triggers after max failed attempts
   - ✅ Admin can unlock user
   - ✅ Admin can reset user MFA
   - ✅ Backup codes work for recovery

### Unit Tests (Deferred)

Future work: Add unit tests for TOTP generation, validation, backup codes, and lockout logic.

---

## Security Considerations

1. **Secret Storage**: TOTP secrets encrypted at rest using app encryption key
2. **Backup Codes**: Stored as bcrypt hashes, not recoverable
3. **Rate Limiting**: Built-in lockout after failed attempts
4. **Session Security**: MFA state uses short-lived tokens
5. **Timing Attacks**: Use constant-time comparison for codes
6. **Recovery**: Backup codes or admin reset as recovery options

---

## Deliverables

- [x] Plugin structure (`plugins/auth-mfa/`)
- [x] Plugin manifest (`plugin.json`) with config schema
- [x] Controller with hook implementations (`webapp/controller/mfaAuth.js`)
- [x] Model with W-107 schema extension (`webapp/model/mfaAuth.js`)
- [x] API routes for MFA operations
- [x] Setup view (`webapp/view/auth/mfa-setup.shtml`)
- [x] Verify view (`webapp/view/auth/mfa-verify.shtml`)
- [x] Schema action handlers (`webapp/view/jpulse-common.js`)
- [x] User MFA page (`webapp/view/jpulse-plugins/auth-mfa.shtml`)
- [x] Version management (`webapp/bump-version.conf`)
- [x] Documentation (`docs/README.md`)
- [x] Translations (en, de)
- [ ] Unit tests (deferred - manual testing complete)
- [ ] Integration tests (deferred - manual testing complete)

---

## Effort Summary

| Component | Estimated | Actual |
|-----------|-----------|--------|
| Plugin scaffold & config | 2h | 2h |
| Controller & hooks | 4h | 5h |
| Model with W-107 schema (adminCard/userCard) | 3h | 3h |
| API endpoints | 3h | 3h |
| UI views (setup, verify, jpulse-plugins) | 4h | 5h |
| Schema action handlers (jpulse-common.js) | 1h | 1h |
| W-109 hook integration | - | 3h |
| W-110 toast queue integration | - | 1h |
| Manual testing & bug fixes | - | 4h |
| Version management (bump-version.conf) | - | 1h |
| Documentation | 2h | 2h |
| **Total** | **~19h** | **~30h** |

**Notes:**
- Admin MFA management (reset, unlock) handled by W-107's data-driven cards
- Unit tests deferred - comprehensive manual testing completed
- Additional effort for W-109/W-110 integration not in original estimate

---

## Future Enhancements (Out of Scope)

- SMS-based MFA (requires Twilio or similar)
- WebAuthn/FIDO2 hardware keys
- Push notification MFA
- MFA for specific actions (not just login)

**Note:** Admin ability to reset/unlock user MFA is now IN SCOPE via W-107 data-driven cards.
