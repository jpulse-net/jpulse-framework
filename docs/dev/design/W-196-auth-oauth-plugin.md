# W-196: plugins: auth-oauth plugin for OAuth 2.0 / OIDC single sign-on

## Status
🕑 PENDING

## Objective

Create an `auth-oauth` plugin that adds OAuth 2.0 / OpenID Connect (OIDC) based single sign-on (SSO) to the jPulse Framework. The plugin supports two primary deployment scenarios:

1. **Public sites** — let end users sign in with consumer identity providers (Google, and later Apple, GitHub, etc.)
2. **Org-internal sites** — let employees sign in with the organization's identity provider (Okta, Auth0, Azure Entra / Azure AD, Keycloak, ADFS, generic OIDC IdP)

The plugin leverages the existing multi-step authentication flow (W-109), so any user with MFA (auth-mfa plugin) will still complete their TOTP step after successful OAuth identity resolution — SSO and 2FA compose cleanly.

**Repository:** `github.com/jpulse-net/plugin-auth-oauth` (separate repo, independent versioning)

**Design principle:** be strict on security defaults (mandatory PKCE, state, nonce, `email_verified` check for linking), be flexible on provisioning (admin picks linking + JIT behavior per site), be forgiving on operations (framework-level break-glass path from W-195).

---

## Scope for v1.0.0

**In scope:**

| Feature | v1.0.0 |
|---|---|
| Google preset (public sites) | ✅ |
| Generic OIDC (Okta, Auth0, Entra, Keycloak, ADFS) | ✅ |
| Custom OAuth2 (manual URLs) | ✅ |
| Multiple providers active simultaneously | ✅ |
| Authorization Code flow with PKCE (S256) | ✅ |
| State (CSRF) + nonce (OIDC) validation | ✅ |
| ID token signature verification via JWKS | ✅ |
| User linking: sub-only / link-by-email / jit-create | ✅ |
| W-107 data-driven user card (link/unlink) | ✅ |
| Client secret encryption at rest | ✅ |
| MFA composition (post-OAuth MFA step) | ✅ |
| Custom branding per provider (label, icon, button color) | ✅ |
| Break-glass documentation (uses W-195 localAuthRestriction) | ✅ |

**Explicitly out of scope for v1.0.0** (deferred to follow-up releases):

| Feature | Reason |
|---|---|
| Apple Sign-In preset | Uses `form_post` response mode + returns `email` only on first consent — non-trivial |
| GitHub preset | OAuth2-only, no OIDC — needs dedicated preset with GitHub-specific user attribute mapping |
| Persistent token storage | Not needed for SSO; increases blast radius |
| Backchannel logout (RP-Initiated Logout, SLO) | Requires per-provider handling and reliable session lookup by `sid` |
| SAML | Different protocol; separate `auth-saml` plugin |
| WebAuthn / Passkeys via OIDC extension | Wait for stable browser support |
| OAuth device flow (TV/CLI) | Framework has no TV/CLI use case |
| Admin operations page (test connection, usage stats) | Nice-to-have, deferrable to v1.1 |

---

## Related Work Items

- **W-105:** Plugin hooks for auth (complete) — provides base hook infrastructure
- **W-107:** Data-Driven User Profile Extensions (complete) — provides adminCard/userCard for linked accounts UI
- **W-108:** auth-mfa plugin (complete) — reference implementation to model after
- **W-109:** Multi-step authentication (complete) — provides `onAuthGetSteps`, `onAuthValidateStep`, `onAuthGetWarnings`
- **W-194:** Plugin config custom renderer (prerequisite) — used for provider list config UI
- **W-195:** External auth framework helpers (prerequisite) — provides `AuthController.completeExternalAuth()`, `localAuthRestriction`, `onAuthGetLoginProviders` hook, `?localFallback=1` recovery mode, **and** (added during W-196 design review) the `hasLocalPassword` user-schema primitive + the corresponding `currentPassword`-optional path in `UserController.changePassword()` (see §11)

**Consumes but does not modify:** W-194, W-195. All framework changes needed for W-196 are done in W-195 — this includes the small `hasLocalPassword` addition identified while designing §11 (Account Lifecycle), which belongs in the framework rather than this plugin because it's a general external-auth primitive (also useful to any future auth-ldap/auth-saml plugin).

---

## Technical Design

### 1. Plugin Structure

Mirrors the auth-mfa (W-108) reference layout:

```
plugins/auth-oauth/
├── plugin.json                    # Plugin manifest + config schema (uses W-194 type: "custom")
├── package.json                   # openid-client dependency
├── README.md                      # Developer documentation
├── docs/
│   └── README.md                  # User + admin documentation
└── webapp/
    ├── bump-version.conf
    ├── controller/
    │   └── oauthAuth.js           # Hooks + API endpoints
    ├── model/
    │   ├── oauthAuth.js           # user.oauth schema extension (W-107 cards)
    │   └── oauthProvider.js       # authOauth_providers collection CRUD + secret encryption
    ├── utils/
    │   ├── providerRegistry.js    # Preset definitions (Google, generic OIDC, custom OAuth2)
    │   ├── oauthClient.js         # openid-client wrapper (discovery cache, JWKS, PKCE)
    │   └── profileExtractor.js    # Stage A best-effort claim extraction (§10)
    └── view/
        ├── auth/
        │   ├── oauth-error.shtml            # Error landing page (state mismatch, callback error, etc.)
        │   └── oauth-profile-complete.shtml # Stage B form for missing profile fields (§10)
        ├── jpulse-plugins/
        │   └── auth-oauth.shtml   # User's linked-accounts management page
        ├── jpulse-common.js       # W-194 custom renderer for the providers list
        ├── jpulse-common.css      # Login button styles, provider branding
        └── jpulse-navigation.js   # Navigation entries (linked accounts under user menu)
```

### 2. Provider Registry & Presets

The plugin ships with a small registry of provider "presets" in `webapp/utils/providerRegistry.js`. Admins pick a preset (or "custom") in the config UI; the preset provides sensible defaults and, for OIDC providers, a discovery URL that resolves the rest at runtime.

```javascript
// plugins/auth-oauth/webapp/utils/providerRegistry.js

export const PROVIDER_PRESETS = {
    google: {
        type: 'oidc',
        label: 'Google',
        icon: '🇬',                              // Or SVG string / URL — admin can override
        buttonColor: '#4285F4',
        discoveryUrl: 'https://accounts.google.com/.well-known/openid-configuration',
        scopes: ['openid', 'email', 'profile'],
        promptForConsent: false,
        requiresClientSecret: true,
        docs: 'https://developers.google.com/identity/protocols/oauth2/openid-connect'
    },
    oidc: {
        type: 'oidc',
        label: 'OIDC Provider',
        icon: '🔐',
        buttonColor: '#4a5568',
        // discoveryUrl is admin-supplied (e.g. https://myorg.okta.com/.well-known/openid-configuration)
        scopes: ['openid', 'email', 'profile'],
        requiresClientSecret: true,
        docs: 'https://openid.net/connect/'
    },
    oauth2: {
        type: 'oauth2',
        label: 'OAuth2 Provider',
        icon: '🔗',
        buttonColor: '#4a5568',
        // Admin supplies authorizeUrl, tokenUrl, userinfoUrl, and userinfo → user field mapping
        scopes: [],
        requiresClientSecret: true
    }
};
```

**How OIDC discovery is used:** on first successful load (or on-demand), the plugin fetches `{discoveryUrl}` to obtain `authorization_endpoint`, `token_endpoint`, `userinfo_endpoint`, `jwks_uri`, and supported `id_token_signing_alg_values_supported`. openid-client caches this internally, refetching only when a key rotation error occurs. Admins get a "Test connection" button in the provider editor that force-refreshes discovery.

**Custom OAuth2 (no OIDC):** admin manually supplies authorize/token/userinfo URLs plus a field mapping (`{ sub: 'id', email: 'primary_email', name: 'display_name' }`). No ID token, no nonce — plugin fetches profile from the userinfo endpoint using the access token and computes a synthetic `sub` from the mapped field.

### 3. OAuth 2.0 / OIDC Flow

The plugin uses the standard Authorization Code flow with mandatory PKCE. The flow spans two HTTP requests (init + callback) with browser redirects, plus optional additional steps (MFA) via the W-109 multi-step engine.

```
┌────────────────────────────────────────────────────────────────────────┐
│  OAuth 2.0 / OIDC Login Flow                                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Browser              jPulse App              Identity Provider        │
│    │                     │                          │                  │
│    │ 1. GET /auth/login  │                          │                  │
│    │──────────────────────▶                         │                  │
│    │ (login page renders │                          │                  │
│    │  provider buttons   │                          │                  │
│    │  via W-195 hook)    │                          │                  │
│    │                     │                          │                  │
│    │ 2. Click "Sign in with Google"                 │                  │
│    │─ GET /api/1/auth-oauth/init/google?redirect=/dest                 │
│    │──────────────────────▶                         │                  │
│    │                     │ Generate:                │                  │
│    │                     │  • state (opaque random) │                  │
│    │                     │  • nonce (for OIDC)      │                  │
│    │                     │  • PKCE code_verifier +  │                  │
│    │                     │    code_challenge (S256) │                  │
│    │                     │ Store in req.session.oauthPending           │
│    │                     │                          │                  │
│    │ 3. 302 to https://accounts.google.com/authorize?...               │
│    │◀──────────────────────                         │                  │
│    │                     │                          │                  │
│    │ 4. GET authorize?client_id=...&state=...&code_challenge=...       │
│    │───────────────────────────────────────────────▶                   │
│    │                     │                          │                  │
│    │ 5. User authenticates and consents at Google   |                  │
│    │                     │                          │                  │
│    │ 6. 302 to https://app/api/1/auth-oauth/callback/google?code=X&state=Y |
│    │◀───────────────────────────────────────────────|                  │
│    │                     │                          │                  │
│    │ 7. GET /api/1/auth-oauth/callback/google?code=X&state=Y           │
│    │────────────────────▶|                          │                  │
│    │                     │ • Validate state matches oauthPending       │
│    │                     │ • Verify timeout (<5 min)                   │
│    │                     │ 8. POST /token (code + code_verifier)       │
│    │                     │─────────────────────────▶|                  │
│    │                     │◀─── access_token, id_token, expires_in ───  │
│    │                     │ 9. Fetch JWKS if not cached, verify id_token│
│    │                     │    signature, nonce, iss, aud, exp          │
│    │                     │ 10. (optional) GET userinfo with token      │
│    │                     │─────────────────────────▶|                  │
│    │                     │◀─── userinfo JSON ───────|                  │
│    │                     │ 11. Resolve local user (sub-lookup, then    │
│    │                     │     email-link if configured, then JIT      │
│    │                     │     create if configured)                   │
│    │                     │ 12. Update user.oauth.{provider} with       │
│    │                     │     sub, email, name, picture, linkedAt,    │
│    │                     │     lastLoginAt, iss                        │
│    │                     │ 13. Fire onUserSyncProfile hook             │
│    │                     │ 14. Call AuthController.completeExternalAuth│
│    │                     │     (from W-195):                           │
│    │                     │     • Set pendingAuth = {                   │
│    │                     │         userId, authMethod: 'oauth',        │
│    │                     │         completedSteps: ['credentials'],    │
│    │                     │         createdAt: now                      │
│    │                     │       }                                     │
│    │                     │     • Run _getRequiredSteps() → may return  │
│    │                     │       [{ step: 'mfa' }] if MFA enabled      │
│    │                     │                                             │
│    │ 15a. If MFA needed: 302 to /auth/mfa-verify.shtml?redirect=/dest  │
│    │◀──────────────────────                         │                  │
│    │                     │                          │                  │
│    │ 15b. If no more steps: _completeLogin() creates session,          │
│    │      302 to /dest with success toast queued (W-110)               │
│    │◀──────────────────────                         │                  │
│    │                     │                          │                  │
└────────────────────────────────────────────────────────────────────────┘
```

**Key security invariants throughout the flow:**

- `state` is one-time-use and expires with `oauthPending` (5 minute window)
- `nonce` is compared against the value in the verified ID token; mismatch = reject
- `code_verifier` is stored server-side and never sent to the browser
- ID token `aud` claim must equal our `client_id`; `iss` must match the discovery document
- Failure at any step → redirect to `/auth/oauth-error.shtml?reason=CODE` (never leak provider-side errors verbatim)

**Logout behavior:** logging out of jPulse only destroys the local session (existing `POST /api/1/auth/logout`). It does **not** log the user out of the IdP — the user's Google/Okta/etc. session remains active in their browser. This is expected OAuth/OIDC behavior in v1.0.0 (no backchannel/RP-initiated logout — see Future Enhancements). Document this explicitly in the plugin README so admins don't mistake it for a bug ("I logged out but I'm still signed into Google — is that broken?" — no, that's normal).

### 4. Framework Integration Points (from W-195)

The plugin **consumes** these framework APIs (all delivered in W-195):

- `AuthController.completeExternalAuth(req, res, user, authMethod, redirectUrl)` — sets `pendingAuth`, runs `_getRequiredSteps`, either 302s to the next-step page or calls `_completeLogin` and 302s to `redirectUrl`. Owns the "browser-redirect finish" behavior so W-196 doesn't reach into private framework methods.
- `onAuthGetLoginProviders` hook — plugin returns `[{ id, label, icon, buttonColor, initUrl, order }]` for each enabled provider; framework's login page renders the buttons.
- `?localFallback=1` on `/auth/login.shtml` — plugin doesn't touch this; it's the framework's break-glass path.
- `controller.auth.localAuthRestriction` config — plugin doesn't enforce this; documentation only.

The plugin **does not** modify `webapp/controller/auth.js` directly. All coupling is through hooks and the `completeExternalAuth` helper.

### 5. User Schema Extension (W-107 Data-Driven Cards)

```javascript
// plugins/auth-oauth/webapp/model/oauthAuth.js

UserModel.extendSchema({
    oauth: {
        _meta: {
            plugin: 'auth-oauth',
            adminCard: {
                visible: true,
                label: 'Linked SSO Accounts',
                icon: '🔗',
                description: 'External identity providers linked to this account',
                backgroundColor: '#e8f0fe',
                order: 110,
                actions: [
                    {
                        id: 'unlink-all',
                        label: 'Unlink All Providers',
                        style: 'warning',
                        confirm: 'Unlink this user from all SSO providers? They will need to re-link on next SSO login.',
                        toast: 'All SSO providers unlinked.',
                        showIf: 'hasValue',
                        handler: 'authOauth.unlinkAll'
                    }
                ]
            },
            userCard: {
                visible: true,
                label: 'Connected Accounts',
                icon: '🔗',
                description: 'Sign-in providers connected to your account',
                backgroundColor: '#e8f0fe',
                order: 20,
                actions: [
                    // Per-provider link/unlink buttons rendered dynamically by
                    // custom handler based on configured & enabled providers
                    {
                        id: 'manage',
                        label: 'Manage Connections',
                        style: 'primary',
                        navigate: '/jpulse-plugins/auth-oauth.shtml'
                    }
                ]
            }
        },
        // Reserved sentinel key (sibling to provider blocks, NOT nested inside one) —
        // marks a user as JIT-created and tracks whether they've completed the
        // oauth-profile-complete step (§10). Absent entirely for non-JIT users
        // (existing users linked via Migration Path A/B never get this key).
        // _jit: {
        //     createdAt:          Date,
        //     viaProvider:        'google',   // which provider triggered JIT creation
        //     profileCompletedAt: null        // set once Stage B step is validated (or
        //                                     // left null forever if Stage A already had
        //                                     // everything and Stage B never fired)
        // }

        // Per-provider blocks (dynamic — added only when user actually links a provider)
        // Example shape (Google):
        // google: {
        //     sub:             'google-subject-id',
        //     email:           'user@gmail.com',
        //     emailVerified:   true,           // audit field, scoped to this provider block only
        //                                      // (there is no base-schema emailVerified field)
        //     name:            'Jane Doe',
        //     picture:         'https://lh3.googleusercontent.com/...',
        //     preferredUsername: null,
        //     iss:             'https://accounts.google.com',
        //     linkedAt:        Date,
        //     lastLoginAt:     Date
        // }
    }
});
```

**Design notes:**

- **No `_type: 'array'` for provider blocks** — each provider gets its own named sub-key so lookups by provider are O(1) and MongoDB queries can use dotted paths (`user.oauth.google.sub`).
- **No tokens stored.** If a future integration needs API access, that's a separate opt-in.
- **Detailed provider view** lives in `/jpulse-plugins/auth-oauth.shtml`. Card just shows "Manage Connections" button — the card UI is too cramped for a per-provider table.
- **No base user-schema changes required.** `passwordHash`, `profile.firstName`, `profile.lastName` remain **required** on `webapp/model/user.js`'s `baseSchema` exactly as they are today — JIT creation always supplies schema-conformant values (see §10). There is no `emailVerified` or `authMethod` field on the base user document anywhere in this design; those concepts live inside `oauth.{provider}` (audit-only, per provider) and the ephemeral session/`pendingAuth` state (already how the framework tracks `authMethod` today), respectively.
- **`hasLocalPassword` flag** — a small framework primitive proposed in W-195 (not built by this plugin), set to `false` at JIT-creation time. Drives the unlink-last-method guard and the "Set Password" vs "Change Password" UX described in §11.
- **`_jit` sentinel lives at `user.oauth._jit`**, a sibling of provider blocks like `user.oauth.google` — not nested inside any single provider's block. This matters because a user can be JIT-created via one provider and later link a second provider; "was this user JIT-created" is a property of the user, not of any one provider link.

### 6. API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/1/auth-oauth/providers` | Public | List enabled providers for login button rendering (called by W-195 hook, also usable by client) |
| GET | `/api/1/auth-oauth/init/:provider` | Public | Start OAuth flow, redirect to provider's authorize endpoint |
| GET | `/api/1/auth-oauth/callback/:provider` | Public | Handle provider callback, complete or continue auth |
| GET | `/api/1/auth-oauth/user/providers` | User | List providers linked to the authenticated user |
| POST | `/api/1/auth-oauth/link/:provider` | User | Start link flow (init with `mode=link` in session) |
| DELETE | `/api/1/auth-oauth/link/:provider` | User | Unlink a provider from the authenticated user |
| GET | `/api/1/auth-oauth/admin/providers` | Admin | List all configured providers (raw config, no client_secret) |
| POST | `/api/1/auth-oauth/admin/providers` | Admin | Create a new provider config |
| PUT | `/api/1/auth-oauth/admin/providers/:id` | Admin | Update provider config |
| DELETE | `/api/1/auth-oauth/admin/providers/:id` | Admin | Delete provider config |
| POST | `/api/1/auth-oauth/admin/providers/:id/test` | Admin | Force OIDC discovery refresh, return endpoints |

**Note on the `link` flow:** the same init/callback endpoints handle both "login" and "link an additional provider to current user" flows. The distinction is a `mode` field in the pending OAuth state (`login` or `link`). In `link` mode, the callback attaches the resolved `sub` + profile to the currently-authenticated user rather than creating a session; it never creates a new user.

**Note on multi-step continuation:** additional login steps introduced by the plugin (e.g., `oauth-profile-complete` — see §10) are submitted through the framework's shared multi-step endpoint `POST /api/1/auth/login` with `{ step: "oauth-profile-complete", ... }`, not through a plugin-specific endpoint. This keeps the whole authentication chain uniform (credentials → mfa → oauth-profile-complete → mfa-setup → complete) and lets the framework's `_getRequiredSteps` orchestrator decide the order.

### 7. User Linking Strategies

Per-provider config (in the provider record, not global). Admin picks one of three strategies:

**`sub-only` — strictest**
- Lookup: `db.users.findOne({ [`oauth.${provider}.sub`]: sub })`
- No match → login fails with `USER_NOT_PROVISIONED`
- Use case: high-security internal systems where admins pre-provision all users and users only link accounts through admin-initiated flow

**`link-by-email` — default recommended**
- Try `sub` lookup first (fast path for repeat users)
- If no match AND provider returned `email_verified: true` in ID token/userinfo:
  - Look up local user by `email`
  - If found → attach `oauth.{provider}` block to that user (store `sub`) — subsequent logins use fast path
- If no match AND `email_verified: false` → login fails with `EMAIL_NOT_VERIFIED_AT_PROVIDER` (never trust unverified emails for linking; risk of account takeover)
- If no email match → falls through to JIT if enabled, else fails
- Use case: org-internal with existing users provisioned by admin, then employees link via SSO on first login
- **See §9 Migration Paths** for the full step-by-step scenario when migrating an existing internal-auth site to SSO

**`jit-create` — permissive, for public sites**
- Try `sub` lookup, then optional email-link fallback
- If still no match → create a new user via `onUserBeforeSave`/`onUserAfterSave`, writing **only fields that already exist in `UserModel.baseSchema`** — no framework schema changes needed (see §10 for the exact, schema-conformant recipe):
  - `username`: derived from email local-part or `preferred_username` claim (with uniqueness suffix if needed)
  - `email`: from provider (requires `email_verified: true` at the provider)
  - `passwordHash`: bcrypt hash of a cryptographically random 32-byte value — nobody, including the plugin, retains the plaintext, so local login is impossible until the user explicitly sets a real password (never an empty string; a blank/empty password value is a known auth anti-pattern regardless of whether validation happens to permit it)
  - `hasLocalPassword`: `false` (framework primitive proposed in W-195 — signals "no user-known local password exists"; drives the unlink guard and Set-Password UX in §11)
  - `profile.firstName`, `profile.lastName`: from provider claims via best-effort extraction, with a fallback chain that is **always non-empty** (see §10 Stage A) — the required-field constraint is satisfied at creation time and refined moments later by Stage B if the extracted values were only placeholders
  - `profile.picture`: from provider claims (optional, no fallback needed)
  - `roles`: per-provider `defaultRoles` config (typically `['user']`; `admin`/`root` are never auto-provisioned — see §8)
  - `status`: `'active'` or `'pending'` (per-provider `defaultStatus` config; `'pending'` is the framework's existing `UserModel` status value)
  - `oauth.{provider}`: `{ sub, email, emailVerified: true, name, picture, iss, linkedAt, lastLoginAt }` — `emailVerified` here is an audit field scoped to this provider block only, not a base-schema user field
  - `oauth._jit`: `{ createdAt: now, viaProvider: provider.id, profileCompletedAt: null }` — sentinel marking this user as JIT-created (§5, §10)
- If required profile fields are still missing after Stage A extraction, an `oauth-profile-complete` step is inserted into the multi-step flow so the user confirms/fills them in before their placeholder values are ever shown anywhere (see §10 Profile Field Extraction & JIT Completion)
- Use case: public sites where signup = "just sign in with Google"

**Interaction with `status: 'pending'` (JIT + `jitDefaultStatus: 'pending'`):**
- There is no implicit framework-side gate on `user.status` inside `_completeLogin` — the plugin's own callback handler must check it explicitly, **before** calling `AuthController.completeExternalAuth()` (W-195)
- If `status !== 'active'`, the callback redirects to `/auth/oauth-error.shtml?reason=ACCOUNT_PENDING_APPROVAL` instead of completing login (mirrors the same explicit-check pattern used for the framework's `'locked'`/`'disabled'` status conventions elsewhere in `auth.js`)
- Admin approves via `/admin/users.shtml`, flipping `status` to `'active'` (existing framework admin UI — no plugin-specific approval page needed)
- Optional email to admin (via a future notification plugin) — not in v1.0 scope

### 8. Configuration

The plugin config has two parts, both accessed at `/admin/plugin-config.shtml?plugin=auth-oauth`:

**Globals** (standard schema fields in `plugin.json`):

```json
{
    "config": {
        "schema": [
            {
                "type": "help",
                "content": "<strong>OAuth / OIDC SSO</strong> — Configure identity providers below. See <a href=\"/jpulse-docs/installed-plugins/auth-oauth/README\">docs</a> for provider setup guides.",
                "tab": "General"
            },
            {
                "id": "defaultLinkingStrategy",
                "label": "Default Linking Strategy",
                "type": "select",
                "default": "link-by-email",
                "options": [
                    { "value": "sub-only", "label": "Sub only — strict, admin must pre-provision" },
                    { "value": "link-by-email", "label": "Link by verified email — recommended" },
                    { "value": "jit-create", "label": "JIT create — for public sites" }
                ],
                "help": "Fallback linking strategy for providers that don't override this",
                "tab": "General"
            },
            {
                "id": "jitDefaultRoles",
                "label": "JIT: Default Roles",
                "type": "multiselect",
                "default": ["user"],
                "options": [
                    { "value": "user", "label": "Users" }
                ],
                "help": "Roles assigned to users created via JIT provisioning. Administrators are never auto-provisioned — admin/root must always be granted manually by an existing admin, regardless of this setting.",
                "tab": "General"
            },
            {
                "id": "jitDefaultStatus",
                "label": "JIT: Default Status",
                "type": "select",
                "default": "active",
                "options": [
                    { "value": "active", "label": "Active — immediate login" },
                    { "value": "pending", "label": "Pending approval — admin must approve" }
                ],
                "tab": "General"
            },
            {
                "id": "profileRequiredFields",
                "label": "JIT: Required Profile Fields",
                "type": "multiselect",
                "default": ["firstName", "lastName"],
                "options": [
                    { "value": "firstName", "label": "First name" },
                    { "value": "lastName",  "label": "Last name" },
                    { "value": "nickName",  "label": "Nickname" }
                ],
                "help": "For JIT-created users only. If the IdP doesn't provide these claims, the user is prompted to fill them in at first login (see §10). Existing users are never re-prompted.",
                "tab": "General"
            },
            {
                "id": "providers",
                "label": "Identity Providers",
                "type": "custom",
                "renderer": "authOauth.renderProviders",
                "default": [],
                "help": "OAuth 2.0 / OIDC identity providers users can sign in with",
                "tab": "Providers"
            },
            {
                "type": "help",
                "content": "<strong>Break-Glass:</strong> If you set framework config <code>controller.auth.localAuthRestriction</code> to <code>admins-only</code>, non-admin users must use SSO. Local admins can still sign in with username/password (recovery via <code>?localFallback=1</code>).",
                "tab": "Security"
            }
        ]
    }
}
```

**Defense in depth:** the JIT-provisioning code itself strips `admin`/`root` from `jitRoles`/`jitDefaultRoles` even if one somehow ended up in stored config (e.g., a hand-edited document, a future config-import feature, or a bug). The UI only offering `user` in the dropdown is a UX nicety, not the actual security boundary.

**Provider list** (managed via the W-194 custom renderer):

The `providers` field uses `type: "custom"` — the renderer function `authOauth.renderProviders` renders a full CRUD table with per-provider settings. Values persist as a JSON array in `pluginConfigs.config.providers`.

```javascript
// plugins/auth-oauth/webapp/view/jpulse-common.js (excerpt)

window.jPulse.plugins.authOauth = window.jPulse.plugins.authOauth || {};

window.jPulse.plugins.authOauth.renderProviders = function(ctx) {
    // ctx = { container, value, onChange, schema, config, disabled }
    // Render a table of providers with:
    // - id (unique key like "google-corp", "okta-prod")
    // - preset (dropdown: google | oidc | oauth2)
    // - label (display name on button)
    // - icon (emoji or URL)
    // - buttonColor (color picker)
    // - enabled (checkbox)
    // - Preset-specific fields (see below)
    // - "Test" button that calls POST /api/1/auth-oauth/admin/providers/:id/test
    // - Row-level "Delete" button
    // - Table-level "Add Provider" button

    // On any change, call onChange(newProvidersArray)
};
```

**Per-provider stored fields:**

```javascript
// One entry in the providers array (stored in pluginConfigs.config.providers)
{
    id:              'google-corp',          // Unique key (admin-chosen, becomes URL segment: /api/1/auth-oauth/init/google-corp)
    preset:          'google',               // 'google' | 'oidc' | 'oauth2'
    label:           'Sign in with Google',  // Button label
    icon:            '🇬',                    // Or SVG string / URL
    buttonColor:     '#4285F4',
    enabled:         true,
    order:           10,                     // Button order on login page

    // Preset-specific:
    clientId:        'xxx.apps.googleusercontent.com',
    clientSecretRef: 'ref:authOauth_providers/653a1b.../clientSecret',  // Points to encrypted secret in providers collection
    scopes:          ['openid', 'email', 'profile'],  // Override preset defaults if desired

    // For preset='oidc':
    discoveryUrl:    'https://myorg.okta.com/.well-known/openid-configuration',

    // For preset='oauth2':
    authorizeUrl:    'https://provider.example/authorize',
    tokenUrl:        'https://provider.example/token',
    userinfoUrl:     'https://provider.example/userinfo',
    userinfoMapping: { sub: 'id', email: 'primary_email', name: 'display_name' },

    // Linking / provisioning overrides (fall back to globals if unset):
    linkingStrategy: 'link-by-email',        // Or null to inherit global default
    allowedDomains:  ['corp.example.com'],   // Only allow login for emails in these domains (optional)
    jitRoles:        null,                   // Or ['user'] to override global (admin/root always stripped — see above)
    jitStatus:       null                    // Or 'active' | 'pending'
}
```

**Redirect URI (computed, not stored):** each provider's redirect URI is derived, not entered by the admin — `{req.protocol}://{req.get('host')}/api/1/auth-oauth/callback/{provider.id}`, using the same `req.protocol` + `req.get('host')` pattern the framework already uses elsewhere (e.g., `handlebar.js`'s `url.domain`), which respects Express `trust proxy` / `X-Forwarded-Host` when configured. The `renderProviders` UI shows this computed value next to each provider row with a "Copy" button, so admins pasting it into the IdP's console never have to guess the exact hostname/path — "don't make me think."

**Client secret storage:**

The `clientSecretRef` in the providers array points to an encrypted secret stored in the `authOauth_providers` MongoDB collection. Encryption uses the framework's encryption utility (same one auth-mfa uses for TOTP secrets). The plaintext secret is never returned to the admin UI after initial entry — the UI shows `••••••••` and a "Change secret" button. This mirrors how AWS/GCP/Azure consoles handle SDK credentials.

**Why not just store the encrypted secret in the providers array?**  The `pluginConfigs` collection is heavily read on every request (config values are accessed frequently). Keeping secrets in a separate collection lets us apply MongoDB-level field encryption or additional access controls to just the sensitive collection.

### 9. Migration Paths (Internal Auth → OAuth SSO)

When an admin migrates a site from internal (username/password) auth to OAuth SSO, existing users need a way to link their local account to a provider identity. The plugin supports three paths, from most-automatic to most-explicit:

#### Path A — Automatic email-link on first SSO login (zero admin work)

Default behavior when the provider's linking strategy is `link-by-email`:

```
1. Admin installs auth-oauth plugin, configures Google provider (or Okta, etc.)
2. Existing user jane@corp.com clicks "Sign in with Google" on the login page
3. OAuth callback returns { sub: 'goog-12345', email: 'jane@corp.com', email_verified: true }
4. Plugin sub-lookup → no match (never linked before)
5. Plugin email-link → finds existing local user by email
6. Attaches user.oauth.google = { sub, ... } to the existing user record
7. User logs in with their EXISTING roles, profile, preferences intact
8. Subsequent logins hit the fast sub-lookup path
```

**Prerequisites for Path A:** local `user.email` matches IdP `email`, and IdP reports `email_verified: true`. This works out of the box for Workspace / Entra deployments where corporate email = SSO email.

**Path A does NOT trigger the profile-complete step (§10):** the existing user already has firstName/lastName from their original signup. Profile completion is JIT-only.

#### Path B — Self-service link (when Path A doesn't apply)

Example: personal Gmail (`jane.doe@gmail.com`) doesn't match corporate local email (`jane.smith@corp.com`). Path A fails silently. User can still link explicitly:

```
1. User logs in normally with their local username/password
2. Navigates to /jpulse-plugins/auth-oauth.shtml (linked-accounts page)
3. Clicks "Connect Google"
4. Runs OAuth flow in mode: link (init/callback endpoints already support this per §6)
5. Callback validates and attaches oauth.google to the currently-authenticated user
   (never creates a new user; never resolves via email — this is an authenticated action)
6. User can now log in with either local password OR Google going forward
```

This is the escape hatch when Path A fails, and it also works for admins during the initial migration to link their own accounts before restricting local auth.

#### Path C — Admin bulk link (deferred to v1.1)

For very large migrations. Admin uploads a CSV of `local_email, provider, provider_sub` and the plugin attaches the mapping in bulk. Not required for v1.0.0 — Path B covers this manually.

#### Admin's migration completion sequence

Once enough users have linked their SSO accounts (via A or B):

```
1. Admin sets framework config controller.auth.localAuthRestriction: 'admins-only'  (from W-195)
2. Regular users can no longer use local password — must use SSO going forward
3. Admin accounts still work with either method (break-glass safety)
4. /auth/login.shtml?localFallback=1 remains available for ops emergencies
```

#### Migration edge cases

| Situation | Behavior |
|---|---|
| Local `email` doesn't match IdP `email` | Path A fails silently, Path B available |
| IdP returns `email_verified: false` | Path A refused (account-takeover risk); Path B still works from an authenticated session |
| Two local users somehow share the same email | Path A refuses with `AMBIGUOUS_EMAIL_MATCH`, logged for admin investigation |
| User attempts SSO login while local account is `locked` or `disabled` | Same status checks as local auth apply (`ACCOUNT_LOCKED` / `ACCOUNT_DISABLED`) — SSO does not bypass account gating |
| Admin wants to preview which users will migrate cleanly | Not in v1.0 — nice-to-have admin ops page (deferred to v1.1) |
| Attacker pre-registers a local account using the victim's email *before* the victim ever tries SSO, then Path A auto-links the attacker's account to the victim's IdP identity | Residual risk whenever public local signup and Path A coexist. Not automatically blocked in v1.0 — no local-signup email-verification feature exists in the framework yet to gate on (tracked as a separate future work item). Mitigate operationally: don't enable public local signup alongside Path A on the same site, or restrict Path A to accounts older than a short grace window. Documented as an admin responsibility in the plugin README. |
| Same IdP `sub` shows up under a *different* verified email (IdP-side account recycling), or an already-linked provider suddenly reports a different `sub` for the same email | Treated as a mismatch, not a silent re-link: rejected with `PROVIDER_IDENTITY_MISMATCH`, logged for admin review. Silently re-linking on IdP-side identity churn is a security smell (could mask account takeover), so v1.0 always fails closed here — no configurable override. |
| Two JIT-eligible logins for a brand-new email arrive concurrently (double-click, retried request, etc.) | The unique index on `email`/`username` (existing `baseSchema` constraint) makes the second `create()` fail with a duplicate-key error; the plugin catches that specific error and retries as a `sub`/email lookup instead of surfacing a 500 — self-healing, no user-visible race. |

### 10. Profile Field Extraction & JIT Completion

When a user signs in with SSO for the first time and no matching local user exists, the plugin JIT-creates one. But IdP claims are inconsistent across providers — some don't return `given_name` / `family_name`, some don't return `name` at all. The plugin handles this with a two-stage strategy: best-effort extraction, followed by an interactive completion step only when critical fields are still missing.

#### What OIDC providers actually provide

| Provider | `sub` | `email` | `email_verified` | `name` | `given_name` | `family_name` | `preferred_username` | `picture` |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Google | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Microsoft / Entra | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | — |
| Okta | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Auth0 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Keycloak (default) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| GitHub (OAuth2) | ✓ | ✓ | — | ✓ | — | — | ✓ (`login`) | ✓ |
| Apple | ✓ | ✓ | ✓ | first-consent-only | first-consent-only | first-consent-only | — | — |

So `sub` + `email` are reliable. `given_name` / `family_name` are usually present for OIDC, sometimes missing (GitHub, badly-configured Keycloak, Apple after first consent). Full `name` is often there and can be split as a fallback.

#### Stage A — Best-effort extraction (silent, no user interaction)

`webapp/utils/profileExtractor.js` normalizes IdP claims into jPulse user fields with fallbacks. This is where "no framework schema changes needed" gets honored in practice: `profile.firstName`/`profile.lastName` are **required** on `UserModel.baseSchema`, so the extractor's fallback chain must *always* resolve to a non-empty string — but it also tracks, separately, **which** fields it had to fall back to a placeholder for, so Stage B knows what to ask about (checking "is the DB value empty" would never work, since it's never empty):

```javascript
// Pseudo-code — try each real-claim source in order; only fall back to a
// guaranteed-non-empty placeholder as the last resort, and record that fact.
function extractProfile(claims) {
    const placeholderFields = [];
    let firstName, lastName;

    if (claims.given_name) {
        firstName = claims.given_name;
    } else if (claims.name?.trim().split(' ').length > 1) {
        firstName = claims.name.trim().split(' ').slice(0, -1).join(' ');   // "Jane Marie Doe" → "Jane Marie"
    } else if (claims.preferred_username?.includes('.')) {
        firstName = claims.preferred_username.split('.')[0];                // "jane.doe" → "jane"
    } else {
        firstName = claims.name?.trim() || claims.preferred_username || claims.email?.split('@')[0] || claims.sub;
        placeholderFields.push('firstName');                                // real value unknown — Stage B will ask
    }

    if (claims.family_name) {
        lastName = claims.family_name;
    } else if (claims.name?.trim().split(' ').length > 1) {
        lastName = claims.name.trim().split(' ').slice(-1)[0];              // "Jane Marie Doe" → "Doe"
    } else if (claims.preferred_username?.includes('.')) {
        lastName = claims.preferred_username.split('.').slice(1).join(' ');
    } else {
        lastName = '-';                                                     // schema-valid placeholder; Stage B
        placeholderFields.push('lastName');                                 // overwrites it before it's ever displayed
    }

    return {
        firstName, lastName, placeholderFields,
        username:
            claims.preferred_username ||
            claims.email?.split('@')[0] ||
            claims.sub,                                          // Ugly last resort — collision-free by definition
        nickName:
            claims.nickname ||
            claims.given_name ||
            claims.preferred_username ||
            null,
        picture:
            claims.picture ||
            null
    };
}
```

`placeholderFields` (e.g. `['lastName']`, or `[]` if extraction went cleanly) is written into `oauth._jit.placeholderFields` at creation time and is exactly what §10's Stage B logic below reads to decide whether — and about what — to prompt the user. Username uniqueness is enforced by appending `-2`, `-3`, ... on collision. For Google / Okta / Entra / Auth0 / Keycloak with default config, extraction yields all fields cleanly (`placeholderFields: []`) and Stage B is skipped entirely.

#### Stage B — Interactive completion step (only if required fields still missing)

If Stage A had to fall back to a placeholder for any field in `profileRequiredFields` (plugin config, default `['firstName', 'lastName']`), the plugin injects an `oauth-profile-complete` step into the W-109 multi-step flow via `onAuthGetSteps`. The check is driven entirely by the `oauth._jit` sentinel written at creation time (§5, §7) — never by re-inspecting `profile.firstName`/`profile.lastName` for emptiness, since those are never empty (schema-required, always populated with either a real or placeholder value):

```javascript
// plugins/auth-oauth/webapp/controller/oauthAuth.js (excerpt)

static async onAuthGetSteps(context) {
    const { user, requiredSteps } = context;

    // Only fires for JIT-created OAuth users with unresolved placeholder fields.
    // Presence of oauth._jit is itself the "was this user JIT-created" signal —
    // no separate authMethod field exists (or is needed) on the user document.
    const jit = user.oauth?._jit;
    if (!jit) return context;                                   // not JIT-created — Path A/B users skip this entirely
    if (jit.profileCompletedAt) return context;                 // already completed
    const missing = jit.placeholderFields?.filter(f => (context.config.profileRequiredFields || []).includes(f)) || [];
    if (missing.length === 0) return context;

    requiredSteps.push({
        step:     'oauth-profile-complete',
        priority: 20,                          // Before mfa-setup (100), after tenant-select (5)
        data: {
            missingFields: missing,            // e.g. ['lastName'] — only the fields that need a real answer
            prefill: {
                firstName: user.profile?.firstName || '',   // may already be a decent guess (e.g. email local-part)
                lastName:  user.profile?.lastName  || '',   // '-' placeholder is never shown as a prefill value
                nickName:  user.profile?.nickName  || ''
            }
        }
    });
    return context;
}

static async onAuthValidateStep(context) {
    const { step, stepData, user } = context;
    if (step !== 'oauth-profile-complete') return context;

    const missingRequired = (context.config.profileRequiredFields || []).filter(f => !stepData[f]?.trim());
    if (missingRequired.length > 0) {
        context.valid = false;
        context.error = 'Please fill in all required fields';
        return context;
    }

    // Save the fields the user submitted and clear the placeholder sentinel
    const updates = {};
    if (stepData.firstName?.trim()) updates['profile.firstName'] = stepData.firstName.trim();
    if (stepData.lastName?.trim())  updates['profile.lastName']  = stepData.lastName.trim();
    if (stepData.nickName?.trim())  updates['profile.nickName']  = stepData.nickName.trim();
    updates['oauth._jit.placeholderFields'] = [];
    updates['oauth._jit.profileCompletedAt'] = new Date();

    await global.UserModel.updateById(user._id, updates);
    context.valid = true;
    return context;
}
```

**Design decision (confirmed):** the profile-complete step fires **only** for JIT-created users with unresolved placeholder fields, gated by `oauth._jit.placeholderFields`/`profileCompletedAt`. Existing users linked via Path A or B never have an `oauth._jit` block at all, so they never see the prompt — they manage their profile through `/user/profile.shtml` like any other user. This keeps the SSO flow simple and predictable ("only new users with genuinely missing data get onboarding").

#### The composed flow — SSO signup + profile completion + MFA setup

```
1. User clicks "Sign in with Google" (site has MFA policy = required)
2. → GET /api/1/auth-oauth/init/google → redirect to Google
3. User consents at Google
4. → GET /api/1/auth-oauth/callback/google?code=…
5. Callback exchanges code, obtains claims (sub, email, but NO given_name/family_name)
6. JIT-create user with (all fields schema-conformant — see §7):
     email:             claims.email
     username:          'jane' (from email local-part, uniqueness suffix if needed)
     passwordHash:       bcrypt(random 32 bytes)   ← unusable, sets hasLocalPassword: false
     profile.firstName: 'jane' (placeholder — email local-part, since given_name/name missing)
     profile.lastName:  '-'    (placeholder — nothing usable in claims)
     status:            'active'
     oauth.google:      { sub, email, emailVerified: true, ... }   (no sentinel nested in here)
     oauth._jit:        { createdAt: now, viaProvider: 'google', placeholderFields: ['firstName', 'lastName'], profileCompletedAt: null }
7. AuthController.completeExternalAuth() (W-195) sets pendingAuth, calls _getRequiredSteps
8. Hooks contribute steps:
     - auth-oauth returns [{ step: 'oauth-profile-complete', priority: 20, ...}]
     - auth-mfa   returns [{ step: 'mfa-setup',              priority: 100, ...}]
9. Server response: { success: true, nextStep: 'oauth-profile-complete', missingFields, prefill }
10. Browser → /auth/oauth-profile-complete.shtml (form with pre-fills)
11. User fills First Name = "Jane", Last Name = "Doe"
12. → POST /api/1/auth/login { step: 'oauth-profile-complete', firstName: 'Jane', lastName: 'Doe' }
13. onAuthValidateStep saves fields, sets oauth._jit.placeholderFields = [], oauth._jit.profileCompletedAt = now
14. _getRequiredSteps loops back → returns [{ step: 'mfa-setup' }]
15. Server response: { success: true, nextStep: 'mfa-setup' }
16. Browser → /auth/mfa-setup.shtml (auth-mfa's page)
17. User scans QR, submits code
18. auth-mfa validates; _getRequiredSteps returns []
19. _completeLogin creates session, redirects to /
```

Each plugin owns its step; the framework orchestrates. All composition happens through W-109 hooks — no cross-plugin knowledge required.

#### Apple Sign-In caveat (relevant for v1.1 when Apple preset ships)

Apple returns `name` **only on first consent** and only if the user chose to share it. Subsequent sign-ins never see the name again — so the plugin **must** capture and persist the name during the very first callback. Our design already does this: Stage A extraction runs on the very first callback, and Stage B prompts the user if the name is missing. Apple users who click "Hide My Email" or decline name sharing will simply see the profile-complete form at first login — no data loss.

#### Configuration knobs (§8 config schema)

| Config field | Purpose |
|---|---|
| `profileRequiredFields` | Which fields trigger Stage B when Stage A could only produce a placeholder for them (per `oauth._jit.placeholderFields`). Default `['firstName', 'lastName']`. Set `[]` to skip the completion step entirely (placeholder values are kept as-is; user can edit later via `/user/profile.shtml`). |
| `jitDefaultRoles` | Roles assigned to JIT-created users (`admin`/`root` always stripped, defense in depth — see §8). |
| `jitDefaultStatus` | `'active'` (login immediately) or `'pending'` (blocked until admin approves — see §7). |

---

### 11. Account Lifecycle: Local Password Interplay

SSO doesn't remove the concept of a local password from the framework — it changes who knows it. This section defines exactly how `auth-oauth` interacts with local password login, so users are never locked out and admins never have to guess.

#### The `hasLocalPassword` framework primitive (proposed in W-195)

A single boolean field, added to `UserModel.baseSchema` in **W-195** — not this plugin. It's a general external-auth primitive useful to `auth-oauth` today and to any future external-auth plugin (LDAP, SAML) tomorrow, so it belongs in the framework, not duplicated per plugin:

```javascript
// webapp/model/user.js — baseSchema addition (W-195)
hasLocalPassword: { type: 'boolean', default: true }
```

- **Default `true`** — existing local-signup users are unaffected; the field is simply absent on their documents and read as `true` (no migration/backfill script needed).
- **Plugins set it to `false`** at JIT-creation time, whenever they write a synthetic random `passwordHash` the user themselves doesn't know (see §7).
- **Framework resets it to `true`** the instant a user successfully calls `PUT /api/1/user/password` (existing `UserController.changePassword` endpoint) — the moment they know a working local password, this flag reflects reality again.

#### "Set Password" vs "Change Password" (W-195 framework UX — not built by this plugin)

`webapp/controller/user.js`'s `changePassword()` currently always requires `currentPassword` to verify identity before allowing a change. For a user with `hasLocalPassword: false`, that's impossible to satisfy by construction (nobody, including the plugin, knows the random value) and would permanently lock them out of ever setting a local password.

**W-195 adds:** when `hasLocalPassword === false`, `changePassword()` skips the `currentPassword` check — the user is already identity-proven by their authenticated session — and only requires `newPassword` + policy validation. On success it sets `hasLocalPassword: true`.

The existing Security panel in `webapp/view/user/settings.tmpl` (`panel-security`, fields `currentPassword`/`newPassword`/`confirmPassword`) conditionally hides `currentPassword` and relabels the section "Set Password" instead of "Change Password" when `hasLocalPassword === false`. **This plugin builds no new password UI** — it only sets the flag correctly at JIT time and links to this existing page from its own linked-accounts page and error messages.

There is no separate "forgot password" (email-reset) flow in the framework today, and none is needed here: an SSO-authenticated user who wants a local-login backup uses "Set Password" from their already-authenticated session — there's nothing to forget and nothing to email.

#### Unlink-last-method guard (this plugin, v1.0.0)

Before deleting a provider link (`DELETE /api/1/auth-oauth/link/:provider`), the plugin checks whether this is the user's last way to sign in:

```javascript
const remainingProviders = Object.keys(user.oauth || {}).filter(k => k !== '_jit' && k !== provider);
if (remainingProviders.length === 0 && user.hasLocalPassword === false) {
    return CommonUtils.sendError(req, res, 400,
        global.i18n.translate(req, 'plugin.authOauth.error.lastMethodBlocked'),
        'LAST_AUTH_METHOD');
}
```

**Decision: block, don't force an inline flow.** Rather than building a custom "set a password before you can unlink" wizard inside the linked-accounts page, the error message links directly to the existing Security panel:

> "This is your only way to sign in. Set a local password or link another provider before removing this one." → **Set a Password** (`/user/profile.shtml#security`)

This reuses the framework's existing password UI instead of duplicating it inside the plugin, and keeps the unlink action a simple, predictable guard rather than a multi-step forced flow.

#### Summary table

| User state | Can unlink last provider? | Local login works? |
|---|---|---|
| JIT-created, never set a password (`hasLocalPassword: false`) | ❌ Blocked — must set a password or keep ≥1 provider linked | ❌ No (random, unusable password) |
| JIT-created, later set a password (`hasLocalPassword: true`) | ✅ Allowed | ✅ Yes |
| Migrated via Path A/B, already had a real local password | ✅ Allowed | ✅ Yes (unaffected — `hasLocalPassword` was already `true`) |

### 12. Signup & Login Visibility for SSO-First Sites

No new configuration flags are needed here — the framework **already has** everything required to hide local signup/login when a site goes SSO-first. This section documents the existing framework config (`webapp/app.conf`) and how to combine it per deployment mode; `auth-oauth`'s README links here. No plugin-specific "hide signup" setting is introduced, and no framework changes are requested beyond the `localAuthRestriction` primitive already scoped in W-195.

| Framework config | Effect |
|---|---|
| `controller.user.disableSignup` | Blocks `POST /api/1/user/signup` (server-side enforcement) — already exists today |
| `view.auth.hideSignup` | Hides the signup link/page in the UI (cosmetic, pairs with the above) — already exists today |
| `controller.auth.disableLogin` | Blocks *all* local login (server-side) — already exists today, but too broad for SSO-first sites that still want an admin break-glass path |
| `controller.auth.localAuthRestriction` (W-195) | `'none' \| 'admins-only' \| 'disabled'` — the right lever for SSO-first sites: preserves admin break-glass access even at `'disabled'` (bootstrap safety check) and supports `?localFallback=1` recovery |

#### Recommended settings per site mode

| Site mode | `disableSignup` | `hideSignup` | `localAuthRestriction` | Linking strategy |
|---|---|---|---|---|
| **Company SSO** (internal IdP, no public signup at all) | `true` | `true` | `'admins-only'` | `sub-only` or `link-by-email`; JIT disabled |
| **Public signup via SSO** (SSO *is* the signup flow) | `true` | `true` | `'none'` | `jit-create` |
| **Migration** (transitional — both local and SSO login work while users link accounts, see §9) | `false` | `false` | `'none'` → later `'admins-only'` once migrated | `link-by-email` |
| **SSO as a convenience, local signup still open** (public site where "Sign in with Google" is optional, not required) | `false` | `false` | `'none'` | `jit-create` or `link-by-email` |

None of these settings live in the `auth-oauth` plugin config — they're all framework-level. The plugin's README documents this table so admins configure the right combination without piecing it together from three different docs ("don't make me think").

---

## Security Requirements

**Non-negotiable for v1.0.0:**

| Requirement | Implementation |
|---|---|
| CSRF via `state` | Opaque server-generated random (32 bytes base64url), one-time-use, expires with `oauthPending` (5 min) |
| OIDC `nonce` | Fresh random per flow, verified in ID token claims |
| PKCE (S256) | Mandatory for all providers, even confidential clients; `code_verifier` never leaves server |
| ID token verification | Signature via JWKS, `iss` matches discovery, `aud` matches `client_id`, `exp` not expired, `iat` reasonable, `nonce` matches |
| Redirect URI whitelist | Provider config must declare exact `redirect_uri`; framework validates on callback |
| Client secret at rest | Encrypted using framework encryption key (same as auth-mfa TOTP secret pattern) |
| Client secret in transit | Never sent to browser; UI shows `••••••••` after initial entry |
| Session rotation | Framework's `_completeLogin` already rotates session ID post-authentication |
| Email verification | `email_verified: true` required for `link-by-email` and JIT provisioning; unverified emails treated as opaque strings |
| Rate limiting | Per-IP throttle on `/init/:provider` and `/callback/:provider` (60/min default, admin-configurable). Applied at plugin level; framework already has rate-limiting middleware. |
| Timing-safe compare | Use `crypto.timingSafeEqual` for `state` and `nonce` comparisons |
| Logging | All init/callback attempts logged via `LogController` with provider, outcome, and (on success) `sub` — never log tokens, codes, or secrets |
| Provider allowlist | `allowedDomains` per-provider option prevents Google-signup users from a rival org from getting `user` role at your public site |
| Content Security Policy | External redirects to well-known IdP domains are allowed by default; admin can extend CSP for custom providers |
| No implicit flow | Only authorization code + PKCE. Implicit flow and Resource Owner Password Credentials flow are not supported. |
| Synthetic local password | JIT-created users get a bcrypt hash of a cryptographically random 32-byte value (`crypto.randomBytes(32)`), never an empty string. Nobody, including the plugin, retains the plaintext — local login is provably impossible until the user runs "Set Password" (§11). |
| JIT role ceiling | `admin`/`root` are stripped from `jitRoles`/`jitDefaultRoles` in code, not just excluded from the config UI dropdown (§8) — a tampered or hand-edited config value can't grant admin via auto-provisioning |

**Threat model considered:**

- **Attacker owns victim's email at OAuth provider** — mitigated by requiring `email_verified: true` for linking; JIT-created accounts get default role only (never admin)
- **Attacker replays a captured `code`** — provider enforces one-time-use codes; our PKCE `code_verifier` binds the code to the session
- **Attacker steals `state` via XSS** — `state` is server-side only, browser never sees it (stored in session cookie, HttpOnly)
- **Attacker triggers callback with forged params** — state mismatch → 400 error, session state cleared
- **Attacker registers a look-alike provider** — admin explicitly configures each provider by ID; no auto-discovery of "new" providers
- **Admin accidentally exposes client_secret** — encrypted at rest, never returned to UI, framework log lines redact any known secret prefixes
- **Refresh token theft** — not applicable, we don't store refresh tokens

---

## NPM Dependency

**Package:** `openid-client` (~500KB installed with transitive deps)

**Why:**
- Battle-tested, maintained by the OIDC certified reference implementer (Panva)
- Handles OIDC discovery, JWKS caching, PKCE, nonce validation, ID token verification, token endpoint auth methods (client_secret_basic / client_secret_post / private_key_jwt)
- Zero native dependencies, no bindings
- Supports "static" configuration mode when discovery URL is not available (edge case)
- Air-gapped compatible — talks only to whatever IdP the app can reach

**Sub-dependencies:**
- `jose` — JWT operations
- `oauth4webapi` — low-level OAuth2 primitives
- All from the same maintainer, well-audited

**What we don't get from openid-client (and why that's fine):**
- SAML support — we don't need it in this plugin
- Provider-specific quirks (Apple's `form_post`, GitHub's non-OIDC-only mode) — handled in our provider preset layer for v1.1+
- UI/CLI helpers — we build our own admin UI (W-194 custom renderer)

---

## Hook Implementations

The plugin registers five hooks (all auto-registered via `static hooks = {...}`):

```javascript
// plugins/auth-oauth/webapp/controller/oauthAuth.js (excerpt)

class OauthAuthController {

    static hooks = {
        onAuthGetLoginProviders: { priority: 100 },  // W-195 — provide login page buttons
        onAuthGetSteps:          { priority: 100 },  // W-109 — inject oauth-profile-complete step for JIT users (§10)
        onAuthValidateStep:      { priority: 100 },  // W-109 — validate oauth-profile-complete submission (§10)
        onUserSyncProfile:       { priority: 100 },  // W-105 — merge provider profile into user
        onAuthAfterLogin:        { priority: 200 }   // W-105 — update oauth.{provider}.lastLoginAt
    };

    /**
     * W-195: Provide OAuth provider buttons for the login page
     */
    static async onAuthGetLoginProviders(context) {
        const { req, providers } = context;
        const config = await PluginModel.getConfig('auth-oauth');
        const providerList = (config?.providers || []).filter(p => p.enabled);

        for (const p of providerList) {
            providers.push({
                id:          `oauth-${p.id}`,
                label:       p.label,
                icon:        p.icon,
                buttonColor: p.buttonColor,
                initUrl:     `/api/1/auth-oauth/init/${encodeURIComponent(p.id)}`,
                order:       p.order || 100
            });
        }
        return context;
    }

    /**
     * W-105: Merge OAuth profile data into user record
     * Called during callback flow after user resolution
     */
    static async onUserSyncProfile(context) {
        const { user, externalProfile, provider } = context;
        if (!provider?.startsWith('oauth:')) return context;

        // Update user.oauth.{providerId} block (see model for shape)
        // ...
        return context;
    }

    /**
     * W-105: Update oauth.{provider}.lastLoginAt after successful OAuth login
     */
    static async onAuthAfterLogin(context) {
        const { user, authMethod } = context;
        if (authMethod !== 'oauth') return context;
        // Update lastLoginAt in the resolved provider block
        // ...
        return context;
    }

    // API endpoints (auto-discovered by controller registry):
    static async apiGetProviders(req, res)      { /* GET /api/1/auth-oauth/providers */ }
    static async apiGetInit(req, res)           { /* GET /api/1/auth-oauth/init/:provider */ }
    static async apiGetCallback(req, res)       { /* GET /api/1/auth-oauth/callback/:provider */ }
    static async apiGetUserProviders(req, res)  { /* GET /api/1/auth-oauth/user/providers */ }
    static async apiPostLink(req, res)          { /* POST /api/1/auth-oauth/link/:provider */ }
    static async apiDeleteLink(req, res)        { /* DELETE /api/1/auth-oauth/link/:provider */ }
    // ... admin endpoints
}
```

---

## UI Components

### 1. Login Page Buttons (rendered by framework via W-195 hook)

The framework's `/auth/login.shtml` (updated in W-195) renders provider buttons above the local username/password form. Each button is a styled anchor:

```html
<div class="jp-auth-providers">
    <a href="/api/1/auth-oauth/init/google-corp?redirect=..." class="jp-auth-provider-btn" style="--btn-color: #4285F4">
        <span class="jp-auth-provider-icon">🇬</span>
        <span>Sign in with Google</span>
    </a>
    <a href="/api/1/auth-oauth/init/okta-prod?redirect=..." class="jp-auth-provider-btn" style="--btn-color: #007dc1">
        <span class="jp-auth-provider-icon">🔐</span>
        <span>Sign in with Okta</span>
    </a>
</div>
<div class="jp-divider"><span>or</span></div>
<!-- Local form below -->
```

Provider button styles live in the plugin's `webapp/view/jpulse-common.css`. The framework provides the div structure; the plugin owns the buttons' appearance.

### 2. Linked Accounts Page (`/jpulse-plugins/auth-oauth.shtml`)

User-facing page for managing linked SSO accounts. Table of providers with:
- Currently linked (with `sub`, email, linked date, last login date)
- Available to link (button "Connect Google", etc.)
- Unlink action per linked provider (with confirm)

Reached from the userCard "Manage Connections" button.

### 3. Provider Config Renderer (W-194 custom renderer inside `/admin/plugin-config.shtml`)

Rendered inside the standard plugin config UI's "Providers" tab. Table of configured providers with:
- Preset dropdown (Google / OIDC / OAuth2)
- Basic fields (id, label, icon, button color, enabled, order)
- Preset-specific fields (client id, client secret with "Change" button, scopes, discovery URL / manual URLs)
- Linking overrides (strategy, allowed domains, JIT roles/status)
- Row actions: Test Connection, Delete
- Table action: Add Provider

### 4. OAuth Profile Complete Page (`/auth/oauth-profile-complete.shtml`)

Rendered when the multi-step flow's next step is `oauth-profile-complete` (see §10). This only happens for JIT-created users whose IdP didn't provide all required profile fields.

Contents:
- Small "Welcome, one more thing" header with provider brand color
- Form fields for each entry in `missingFields` (typically `firstName`, `lastName`, optionally `nickName`)
- Pre-filled with best-effort extracted values (from the `prefill` object in the step response) so the user usually just confirms
- Explanation text: "We couldn't get all your profile info from {provider}. Please confirm your name so we can display it correctly."
- Submit button submits to `POST /api/1/auth/login { step: 'oauth-profile-complete', firstName, lastName, nickName }`
- Response handling identical to other multi-step pages (login.shtml, mfa-verify.shtml): if `nextStep` present, redirect there; if `nextStep: null`, redirect to original `redirect` URL

If validation fails (empty required field), server returns `STEP_FAILED` and the page shows the error inline.

### 5. OAuth Error Page (`/auth/oauth-error.shtml`)

Shown when OAuth flow fails (state mismatch, provider returned error, callback timeout, etc.). Never shows the raw error to the user — displays a friendly message and a "Return to login" button. Details are logged server-side.

Error reasons (mapped to i18n keys):
- `STATE_MISMATCH` → "The login session expired. Please try again."
- `PROVIDER_ERROR` → "The identity provider reported an error. Please try again or contact support."
- `USER_NOT_PROVISIONED` → "Your account is not yet provisioned for this application. Contact your administrator."
- `EMAIL_NOT_VERIFIED_AT_PROVIDER` → "Your email is not verified with the identity provider. Please verify it and try again."
- `AMBIGUOUS_EMAIL_MATCH` → "Multiple accounts match your email. Please contact your administrator."
- `DOMAIN_NOT_ALLOWED` → "This account cannot be used to sign in here."
- `ACCOUNT_PENDING_APPROVAL` → "Your account is awaiting administrator approval."
- `PROVIDER_IDENTITY_MISMATCH` → "This provider account no longer matches our records. Please contact your administrator." (§9 edge cases)
- `LAST_AUTH_METHOD` → "This is your only way to sign in. Set a local password or link another provider first." (§11 — shown inline on the linked-accounts page, not this error page, but same i18n key is reused)
- `INTERNAL_ERROR` → "An unexpected error occurred. Please try again."

---

## i18n

New i18n namespace `plugin.authOauth.*`:

- Login button labels (per-preset defaults, overridden by provider config)
- Error page messages (see above)
- Linked accounts page strings
- Provider config UI strings (custom renderer)
- Admin card / user card labels

Ships with `en` and `de` at minimum, mirroring auth-mfa.

---

## Testing

### Manual Test Matrix (v1.0.0)

| # | Scenario | Expected |
|---|---|---|
| 1 | Fresh install, no providers configured | Login page unchanged; local form only |
| 2 | Add Google provider, click "Sign in with Google" | Redirects to Google, back to callback, session created |
| 3 | Same as #2 but user has MFA enabled | After Google callback, redirected to /auth/mfa-verify.shtml |
| 4 | Migration Path A — `link-by-email` and existing local user (same verified email) | Attaches oauth.google to existing user, logs them in; roles/profile preserved |
| 5 | Migration Path B — user logs in locally, then clicks "Connect Google" on linked-accounts page | Attaches oauth.google to current user; can log in either way afterward |
| 6 | JIT — new user, IdP provides given_name + family_name | User created, logs in directly; no profile-complete step |
| 7 | JIT — new user, IdP provides only full `name` claim | Name split heuristically ("Jane Doe" → firstName="Jane", lastName="Doe"); no profile-complete step |
| 8 | JIT — new user, IdP provides no name claims at all | User created with schema-conformant placeholder firstName/lastName (`oauth._jit.placeholderFields: ['firstName','lastName']`); passwordHash is a random unusable hash, `hasLocalPassword: false`; profile-complete step fires; user fills form; placeholders overwritten, `oauth._jit.profileCompletedAt` set; login continues |
| 9 | JIT + MFA required — new user, missing name claims | Two-step onboarding: profile-complete → mfa-setup → complete |
| 10 | `profileRequiredFields: []` — new user, missing name claims | Step skipped; user logs in with placeholder firstName/lastName still in place (e.g. email local-part / `'-'`), editable later via `/user/profile.shtml` |
| 11 | Provider returns `email_verified: false` | Path A refused (`EMAIL_NOT_VERIFIED_AT_PROVIDER`); JIT refused with same reason |
| 12 | State mismatch (open callback URL directly) | Redirects to /auth/oauth-error.shtml?reason=STATE_MISMATCH |
| 13 | Provider returns error param on callback | Redirects to /auth/oauth-error.shtml?reason=PROVIDER_ERROR |
| 14 | JIT user (`hasLocalPassword: false`) tries to unlink their only linked provider | Blocked with `LAST_AUTH_METHOD`; message links to Set Password page (§11) |
| 15 | Same user as #14 runs "Set Password" from `/user/profile.shtml`, then retries unlink | `changePassword()` skips `currentPassword` check (W-195), sets `hasLocalPassword: true`; unlink now succeeds |
| 16 | Migrated user (`hasLocalPassword: true` from the start) unlinks their only provider | Allowed — local password already usable |
| 17 | `jitDefaultStatus: 'pending'` — brand-new JIT user | Plugin's callback handler checks `status` before calling `completeExternalAuth()`; redirects to `/auth/oauth-error.shtml?reason=ACCOUNT_PENDING_APPROVAL` instead of logging in; admin flips status to `active` via `/admin/users.shtml`; user retries and logs in normally |
| 18 | User re-authenticates via a provider where the stored `sub` no longer matches the `sub` returned for the same verified email | Rejected with `PROVIDER_IDENTITY_MISMATCH`, logged for admin review — no silent re-link |
| 19 | Admin edits provider config, hits "Test Connection" | Fresh discovery fetched, endpoints displayed |
| 20 | Admin config UI shows computed redirect URI with "Copy" button | Value matches `{protocol}://{host}/api/1/auth-oauth/callback/{provider.id}` exactly |
| 21 | `localAuthRestriction: 'admins-only'` (W-195) — regular user tries local login | Rejected with 403 |
| 22 | Same as #21 — admin visits `?localFallback=1` | Local form shown, admin can log in |
| 23 | `allowedDomains: ['corp.com']` — Google user from `@gmail.com` tries to sign in | Rejected with `DOMAIN_NOT_ALLOWED` |
| 24 | Two providers configured, both enabled | Both buttons rendered on login page in `order` field order |
| 25 | Air-gapped deployment against internal Keycloak | Works — no external network needed |
| 26 | Callback happens > 5 min after init | `STATE_MISMATCH` (session pending expired) |
| 27 | Existing local user (Path A completed) with a genuinely blank profile logs in via SSO | Logs in normally; profile-complete step does NOT fire (no `oauth._jit` block exists — only JIT-created users get one) |
| 28 | Two JIT-eligible logins for the same brand-new email arrive concurrently | Second `create()` hits the unique-index duplicate-key error; plugin retries as a lookup and resolves to the same user — no 500, no duplicate account |

### Unit Tests (v1.0.0 target)

- `providerRegistry.js` — preset resolution
- `oauthClient.js` — mocked discovery + token exchange + JWKS
- User linking strategies (all three) — mocked callbacks with various user states
- Provider config CRUD + client_secret encryption round-trip

### Integration Tests (deferred to v1.1)

- Full flow against a self-hosted Keycloak in Docker (used in CI as test IdP)

---

## Deliverables

- [ ] Plugin structure (`plugins/auth-oauth/`)
- [ ] Plugin manifest (`plugin.json`) with W-194 custom renderer field and `profileRequiredFields` option
- [ ] Controller with hooks + API endpoints (`webapp/controller/oauthAuth.js`)
- [ ] Model with W-107 schema extension (`webapp/model/oauthAuth.js`)
- [ ] Provider config model + secret encryption (`webapp/model/oauthProvider.js`)
- [ ] Provider registry with Google + OIDC + OAuth2 presets (`webapp/utils/providerRegistry.js`)
- [ ] openid-client wrapper (`webapp/utils/oauthClient.js`)
- [ ] Profile field extractor with fallbacks (`webapp/utils/profileExtractor.js`) — §10 Stage A
- [ ] Custom renderer for providers list (`webapp/view/jpulse-common.js`)
- [ ] Provider button styles (`webapp/view/jpulse-common.css`)
- [ ] User linked-accounts page (`webapp/view/jpulse-plugins/auth-oauth.shtml`)
- [ ] OAuth profile complete page (`webapp/view/auth/oauth-profile-complete.shtml`) — §10 Stage B
- [ ] OAuth error page (`webapp/view/auth/oauth-error.shtml`)
- [ ] Version management (`webapp/bump-version.conf`)
- [ ] Unlink-last-method guard consuming the W-195 `hasLocalPassword` flag (§11) — `DELETE /api/1/auth-oauth/link/:provider`
- [ ] `status: 'pending'` check in the callback handler, before calling `AuthController.completeExternalAuth()` (§7)
- [ ] Computed, copyable redirect URI shown per provider in the custom renderer (§8)
- [ ] User docs (`docs/README.md`) — includes provider setup guides (Google, Okta, Keycloak, Azure Entra), migration walkthrough (Paths A/B/C), and the site-mode config table (§12: `disableSignup`/`hideSignup`/`localAuthRestriction` combinations)
- [ ] Developer docs (`README.md`)
- [ ] i18n (en, de) — including plugin.authOauth.profileComplete.*, plugin.authOauth.error.lastMethodBlocked strings
- [ ] Manual test pass on all 28 scenarios above
- [ ] Unit tests for provider registry, linking strategies, profile extractor (name-split heuristics + placeholder tracking), secret encryption
- [ ] Published to `github.com/jpulse-net/plugin-auth-oauth` as v1.0.0

---

## Effort Summary

| Component | Estimate |
|---|---|
| Plugin scaffold & manifest | 2h |
| Provider registry + presets (Google, OIDC, OAuth2) | 3h |
| openid-client wrapper + discovery cache | 3h |
| Init endpoint (state/nonce/PKCE generation, redirect) | 2h |
| Callback endpoint (token exchange, ID token verification, user resolution) | 5h |
| Three linking strategies (sub-only, link-by-email, jit-create) | 4h |
| Profile field extractor with fallbacks (§10 Stage A) | 2h |
| oauth-profile-complete step hooks + view (§10 Stage B) | 3h |
| Provider config CRUD + client_secret encryption | 3h |
| Custom renderer for providers list (consumes W-194) | 4h |
| User linked-accounts page (link, unlink, view) | 3h |
| Login button rendering via onAuthGetLoginProviders hook | 2h |
| User schema extension with W-107 cards | 2h |
| Unlink-last-method guard + `hasLocalPassword` consumption + `status: 'pending'` check (§7, §11) | 2h |
| Computed redirect URI display in provider renderer (§8) | 1h |
| Error page + i18n + logging | 2h |
| MFA composition testing (with auth-mfa plugin) | 2h |
| Migration path testing (A: email-link, B: self-service link) | 2h |
| Unit tests | 3h |
| Documentation (README, provider setup guides, migration walkthrough, §12 site-mode table) | 4h |
| Manual testing across 28 scenarios | 5h |
| Publishing (repo setup, npm package, install docs) | 2h |
| Buffer | 2h |
| **Total** | **~64h** |

Higher than the initial "25-35h" and revised "48h" estimates because:
- Provider setup guides (Google, Okta, Keycloak, Entra) each need their own console-UI walkthrough
- Profile extraction + completion step (§10) adds ~5h of new code + tests + docs
- Migration path scenarios (Paths A/B/C) add ~2h dedicated testing
- Account-lifecycle edge cases surfaced in design review (§11 unlink guard, §7 pending-status check) add ~3h — cheap to build now vs. expensive to retrofit after users start hitting lockouts
- Documentation grew to include the migration walkthrough

---

## Future Enhancements (Out of Scope for v1.0.0)

- **v1.1.0** — Apple Sign-In preset (`form_post` response mode, one-time email quirk)
- **v1.1.0** — GitHub preset (OAuth2-only, GitHub-specific userinfo mapping)
- **v1.2.0** — Admin operations page (`/admin/plugins/auth-oauth-ops.shtml`) with usage stats, recent login audit, bulk unlink
- **v1.3.0** — RP-Initiated Logout (backchannel logout via SLO)
- **v1.4.0** — Optional token persistence (per-provider opt-in, encrypted at rest) for integrations that need to call provider APIs
- **v2.0.0** — SAML support (as `auth-saml` sibling plugin, sharing framework hooks from W-195)
- **v2.0.0+** — Admin bulk-link CSV import (Migration Path C, deferred from v1.0.0 — see §9)

---

## Notes on Air-Gapped Deployments

The plugin works in air-gapped enterprise environments where the app server has no internet access, provided:
- The internal IdP (Keycloak, ADFS, self-hosted Okta / Auth0, etc.) is reachable on the internal network
- OIDC discovery URL points to the internal IdP (e.g. `https://keycloak.corp.internal/realms/main/.well-known/openid-configuration`)
- JWKS URL from discovery is on the same internal domain

Consumer providers (Google, Apple, GitHub) obviously cannot work air-gapped since they live on the public internet. This is expected.

---

**Last Updated:** 2026-07-23
