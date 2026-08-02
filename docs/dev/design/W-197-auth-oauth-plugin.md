# W-197: plugins: auth-oauth plugin for OAuth 2.0 / OIDC single sign-on

## Status
✅ DONE — v1.0.0 published to `github.com/jpulse-net/plugin-auth-oauth`, manually tested end-to-end
against a live Google IdP (Internal Workspace audience): provider config → login button → Google
consent → callback → JIT account creation → linked-accounts page. See `## Deliverables` below for
the full completed checklist. Still open for a future version: i18n (no plugin-level i18n mechanism
exists in the framework yet), a second live-IdP test pass (unlink, a second concurrent provider,
MFA composition), and the framework follow-ups noted under `## Deliverables`.

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
- **W-195:** External auth framework helpers (prerequisite) — provides `AuthController.completeExternalAuth()`, `localAuthRestriction`, `onAuthGetLoginProviders` hook, `?localFallback=1` recovery mode, **and** (added during W-197 design review) the `hasLocalPassword` user-schema primitive + the corresponding `currentPassword`-optional path in `UserController.changePassword()` (see §11)

**Consumes but does not modify:** W-194, W-195. Nearly all framework plumbing needed for W-197 was already done in W-195 — this includes the small `hasLocalPassword` addition identified while designing §11 (Account Lifecycle), which belongs in the framework rather than this plugin because it's a general external-auth primitive (also useful to any future auth-ldap/auth-saml plugin). **One additional small framework file is introduced by W-197 itself** (found during spec review, not by reopening W-195): `webapp/utils/crypto-secrets.js`, a generic secret-encryption helper (see §8) — there was no shared encryption utility in the framework before this plugin needed one to store OAuth client secrets at rest. This is added as an ordinary new framework file alongside the plugin work, the same way any framework-level utility gets added; `auth-mfa`'s existing in-model TOTP encryption is left untouched (not retrofitted onto the new util).

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
        icon: '🇬',                              // Or inline SVG markup — admin can override
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
        // #7f8fa6 keeps >=3:1 contrast against both the light and dark theme's button background
        buttonColor: '#7f8fa6',
        // discoveryUrl is admin-supplied (e.g. https://myorg.okta.com/.well-known/openid-configuration)
        scopes: ['openid', 'email', 'profile'],
        requiresClientSecret: true,
        docs: 'https://openid.net/connect/'
    },
    oauth2: {
        type: 'oauth2',
        label: 'OAuth2 Provider',
        icon: '🔗',
        buttonColor: '#7f8fa6',
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

- `AuthController.completeExternalAuth(req, res, user, authMethod, redirectUrl)` — sets `pendingAuth`, runs `_getRequiredSteps`, either 302s to the next-step page or calls `_completeLogin` and 302s to `redirectUrl`. Owns the "browser-redirect finish" behavior so W-197 doesn't reach into private framework methods. **A step without a `page` field falls back to `/auth/login.shtml` (with a logged warning) here** — see the `page` note below.
- `onAuthGetLoginProviders` hook — plugin returns `[{ id, label, icon, buttonColor, initUrl, order }]` for each enabled provider; framework's login page renders the buttons via `{{#each authProviders}}` into `.local-auth-methods`/`.local-auth-method` markup (see "UI Components" §1) — only `label`/`icon`/`buttonColor`/`initUrl`/`order` are actually read by the template.
- **`page` on every `onAuthGetSteps` step this plugin returns** (`oauth-profile-complete`, and any future custom step) — `login.shtml`'s client-side `handleNextStep()` only has built-in routing for the framework's own `'mfa'`/`'mfa-setup'`/`'email-verify'` step names; any plugin-defined step name is unrouted in the AJAX flow too unless it carries its own `page`. Not just a `completeExternalAuth()`/browser-redirect concern — see §10 Stage B.
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
- **No base user-schema changes required.** `passwordHash`, `profile.firstName`, `profile.lastName` remain **required** on `webapp/model/user.js`'s `baseSchema` exactly as they are today — JIT creation always supplies schema-conformant values (see §10). **Corrected (W-198):** at the time this was written there was no base-schema `emailVerified` field, so this design only tracked a per-provider audit copy inside `oauth.{provider}`. W-198 later added a real base-schema `emailVerified` boolean (default `false` for new local signups; a **missing** field on pre-W-198 accounts is treated as grandfathered/verified), specifically so this plugin could close an account-takeover gap (see §7's `link-by-email` note and `docs/dev/work-items.md` W-198) — `authMethod` still lives only in the ephemeral session/`pendingAuth` state as originally designed, that part is unchanged.
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

**Routing note (found during W-197 spec review):** `webapp/utils/site-controller-registry.js`'s `api*`-method auto-discovery (used by `hello-world`) only produces fixed kebab-case paths, plus a hardcoded `:id` suffix for recognized CRUD verb names — it cannot generate a route with a custom path parameter like `/init/:provider` or `/callback/:provider`. All of this plugin's endpoints are therefore declared via an explicit `static routes = [{ method, path, handler, auth }, ...]` array — the same pattern `auth-mfa` already uses for its fixed-path endpoints — not `api*` auto-discovery. Handler method names (`apiInit`, `apiCallback`, etc.) are kept for readability/consistency even though auto-discovery doesn't apply to them; `auth` per route is `'none' | 'user' | 'admin'` matching the "Auth" column above.

**Note on the `link` flow:** the same init/callback endpoints handle both "login" and "link an additional provider to current user" flows. The distinction is a `mode` field in the pending OAuth state (`login` or `link`). In `link` mode, the callback attaches the resolved `sub` + profile to the currently-authenticated user rather than creating a session; it never creates a new user.

**Note on multi-step continuation:** additional login steps introduced by the plugin (e.g., `oauth-profile-complete` — see §10) are submitted through the framework's shared multi-step endpoint `POST /api/1/auth/login` with `{ step: "oauth-profile-complete", ... }`, not through a plugin-specific endpoint. This keeps the whole authentication chain uniform (credentials → mfa → oauth-profile-complete → mfa-setup → complete) and lets the framework's `_getRequiredSteps` orchestrator decide the order.

### 7. User Linking Strategies

Per-provider config (in the provider record, not global). Admin picks one of three strategies:

**`sub-only` — strictest**
- Lookup: `(await UserModel.find({ [`oauth.${provider}.sub`]: sub }, { limit: 1 }))[0]` (plugins have no raw collection handle — `UserModel.find()` is the existing generic query method; it already strips `passwordHash` from results)
- No match → login fails with `USER_NOT_PROVISIONED`
- Use case: high-security internal systems where admins pre-provision all users and users only link accounts through admin-initiated flow

**`link-by-email` — default recommended**
- Try `sub` lookup first (fast path for repeat users)
- If no match AND provider returned `email_verified: true` in ID token/userinfo:
  - Look up local user by `email` (lowercase-normalized — see W-198 note below)
  - **Added (W-198):** if the matched local account has `emailVerified === false` explicitly, fail
    closed with `LOCAL_EMAIL_NOT_VERIFIED` instead of linking — a **missing** field (pre-W-198
    accounts) is treated as grandfathered/verified. This closes the account-takeover chain W-198
    documents: without it, an attacker who signs up locally using the victim's real email (nothing
    in the framework verified ownership at signup) would have the victim's first legitimate SSO
    login silently attach to the attacker's account
  - If verified → attach `oauth.{provider}` block to that user (store `sub`) — subsequent logins use fast path
- If no match AND `email_verified: false` → login fails with `EMAIL_NOT_VERIFIED_AT_PROVIDER` (never trust unverified emails for linking; risk of account takeover)
- If no email match → falls through to JIT if enabled, else fails
- Use case: org-internal with existing users provisioned by admin, then employees link via SSO on first login
- **See §9 Migration Paths** for the full step-by-step scenario when migrating an existing internal-auth site to SSO

**`jit-create` — permissive, for public sites**
- Try `sub` lookup, then optional email-link fallback
- If still no match → create a new user via `onUserBeforeSave`/`onUserAfterSave`, writing **only fields that already exist in `UserModel.baseSchema`** — no framework schema changes needed (see §10 for the exact, schema-conformant recipe):
  - `username`: derived from email local-part or `preferred_username` claim (with uniqueness suffix if needed)
  - `email`: from provider (requires `email_verified: true` at the provider)
  - `emailVerified`: `true` — **added (W-198):** the IdP already vouched for this address, so the
    new base-schema `emailVerified` field is stamped `true` at creation time rather than left at
    its normal `false` default for local signups
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
- There is no implicit framework-side gate on `user.status` inside `_completeLogin` — the plugin's own callback handler must check it explicitly, **before** calling `AuthController.completeExternalAuth()` (W-195); OAuth login bypasses `auth.js`'s `login()`/`UserModel.authenticate()` entirely (it calls `completeExternalAuth()` directly), so this is the *only* status gate in the OAuth path, unlike local login
- Checked against `UserModel`'s actual status enum (`webapp/model/user.js`: `'pending' | 'active' | 'inactive' | 'suspended' | 'terminated'`), each redirecting to its own `/auth/oauth-error.shtml?reason=...` (`ACCOUNT_PENDING_APPROVAL` / `ACCOUNT_INACTIVE` / `ACCOUNT_SUSPENDED` / `ACCOUNT_TERMINATED`) instead of completing login - **not** the `'locked'`/`'disabled'` values used (as dead code) elsewhere in `auth.js`, which don't exist in the real enum and were mistakenly mirrored here in an earlier draft (caught during pre-release review, see `docs/dev/work-items.md`)
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
    // - icon (emoji or inline SVG markup — not an image URL; it renders raw/unescaped inside a
    //   <span> on the login page, so it's sanitized server-side, see _validateProviderInput())
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
    icon:            '🇬',                    // Or inline SVG markup (sanitized server-side, not an image URL)
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

**Required fields are advisory, never blocking (decided 2026-07-31):** a provider needs `clientId`, a client secret, and its preset's endpoint fields (`discoveryUrl` for `oidc`; `authorizeUrl`/`tokenUrl`/`userinfoUrl` for `oauth2` — `google` supplies its own discovery URL) before it can complete a single login. None of these may become a hard save-time validation error, because configuring an IdP is inherently a two-sided, interleaved process: the admin creates the client in the IdP console, comes back to paste the id, copies the generated redirect URI out of *this* form, and only then gets a secret to paste. Refusing to save a half-filled provider would break exactly that workflow (and the redirect URI the admin needs is derived from `id`, so the row has to exist first).

Instead, the config UI marks such a provider as having **pending issues** — a clear, per-provider indication of what's still missing, visible in the provider table and in the edit form, while the page's own Save Changes button continues to work. Hard, blocking validation stays limited to fields that are malformed rather than merely absent (id charset, unknown preset, `buttonColor` format, `label` characters, `allowedDomains` syntax — see `_validateProviderInput()`), since a malformed value can't be part of any legitimate in-progress state.

Consequence for the login path: an incomplete provider that is nonetheless `enabled` currently renders a live login button that dead-ends on the generic `INTERNAL_ERROR` page. That failure needs its own reason code so it reads as "this provider isn't finished being set up" rather than "the server broke".

**Decided (2026-07-31): an incomplete provider keeps its login button rather than being auto-suppressed** — `enabled` is the admin's explicit switch and the only thing that removes a button, so visibility never depends on a second, implicit rule the admin didn't set. The button should carry a visible marker that this provider's setup is unfinished, so the state is obvious from the page the admin is most likely to be looking at while configuring it, instead of only being discoverable by clicking through to an error.

Implementation constraint for that marker: the login page template is framework-owned (`webapp/view/auth/login.shtml`) and renders exactly the fields `onAuthGetLoginProviders` supplies — `{{this.icon}}`, `{{this.label}}`, and `buttonColor` as an inline `border-color`. A plugin can therefore only express the marker *through those fields* (e.g. prefixing the label, substituting a warning icon), unless W-195's hook contract is extended with something like an `incomplete`/`badge` field and the framework template is updated to render it. Choosing between "plugin-side, within the existing contract" and "extend the W-195 contract" is part of implementing this; the former ships without a framework change, the latter is cleaner and reusable by any future external-auth plugin.

**Redirect URI (computed, not stored):** each provider's redirect URI is derived, not entered by the admin — `{req.protocol}://{req.get('host')}/api/1/auth-oauth/callback/{provider.id}`, using the same `req.protocol` + `req.get('host')` pattern the framework already uses elsewhere (e.g., `handlebar.js`'s `url.domain`), which respects Express `trust proxy` / `X-Forwarded-Host` when configured. The `renderProviders` UI shows this computed value next to each provider row with a "Copy" button, so admins pasting it into the IdP's console never have to guess the exact hostname/path — "don't make me think."

**Client secret storage:**

The `clientSecretRef` in the providers array points to an encrypted secret stored in the `authOauth_providers` MongoDB collection. **Corrected during spec review:** there is no pre-existing "framework encryption utility" — `auth-mfa` encrypts its TOTP secret with AES-256-GCM + `scrypt(sessionSecret, salt)` duplicated inline inside its own model (`MfaAuthModel.encrypt`/`getEncryptionKey`), not via a shared helper. W-197 extracts that same pattern into a new, genuinely shared framework primitive so it isn't duplicated a second time:

```javascript
// webapp/utils/crypto-secrets.js (new framework file, added alongside this plugin)
import crypto from 'crypto';

export function encryptSecret(plaintext, salt) {
    const key = crypto.scryptSync(global.appConfig?.security?.sessionSecret || 'jpulse-default-secret-change-me', salt, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}

export function decryptSecret(ciphertext, salt) {
    const key = crypto.scryptSync(global.appConfig?.security?.sessionSecret || 'jpulse-default-secret-change-me', salt, 32);
    const buf = Buffer.from(ciphertext, 'base64');
    const iv = buf.subarray(0, 16), authTag = buf.subarray(16, 32), encrypted = buf.subarray(32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
```

`oauthProvider.js` calls `encryptSecret(clientSecret, 'oauth-provider-salt')` before writing to Mongo and `decryptSecret(...)` only at token-exchange time inside `apiCallback` — the decrypted value never appears in any API response. `auth-mfa`'s existing TOTP encryption is left as-is (not retrofitted onto this util) to avoid touching a shipped, independently-versioned plugin as a side effect of this work item; it can adopt `crypto-secrets.js` later if desired. The plaintext secret is never returned to the admin UI after initial entry — the UI shows `••••••••` and a "Change secret" button. This mirrors how AWS/GCP/Azure consoles handle SDK credentials.

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
| User attempts SSO login while local account is `suspended`, `terminated`, or `inactive` | Blocked with the matching `ACCOUNT_SUSPENDED` / `ACCOUNT_TERMINATED` / `ACCOUNT_INACTIVE` reason — SSO does not bypass account status gating |
| Admin wants to preview which users will migrate cleanly | Not in v1.0 — nice-to-have admin ops page (deferred to v1.1) |
| Attacker pre-registers a local account using the victim's email *before* the victim ever tries SSO, then Path A auto-links the attacker's account to the victim's IdP identity | Residual risk whenever public local signup and Path A coexist. Not automatically blocked in v1.0 — no local-signup email-verification feature exists in the framework yet to gate on (tracked as a separate future work item). Mitigate operationally: don't enable public local signup alongside Path A on the same site, or restrict Path A to accounts older than a short grace window. Documented as an admin responsibility in the plugin README. |
| Same IdP `sub` shows up under a *different* verified email (IdP-side account recycling), or an already-linked provider suddenly reports a different `sub` for the same email | Treated as a mismatch, not a silent re-link: rejected with `PROVIDER_IDENTITY_MISMATCH`, logged for admin review. Silently re-linking on IdP-side identity churn is a security smell (could mask account takeover), so v1.0 always fails closed here — no configurable override. |
| Two JIT-eligible logins for a brand-new email arrive concurrently (double-click, retried request, etc.) | **Corrected (W-198):** at the time this was written, `email`/`username` uniqueness was assumed to be DB-enforced via `baseSchema`'s `unique: true` — it was not; that flag was declarative-only, with no real MongoDB index behind it, and the resulting race was confirmed live (an actual duplicate-`username` pair found in a dev database), not just theoretical. W-198 adds real DB-level unique indexes on both `users.email` and `users.username` (with a startup pre-check that skips index creation and warns instead of crashing if pre-existing duplicates are found). Once that index exists, the second `create()` fails with a duplicate-key error; `_createJitUser()` already caught that specific error and retried as a `sub`/email lookup instead of surfacing a 500 (self-healing, no user-visible race) — this retry path was implemented from v1.0, it just didn't have a real unique index backing it to trigger against until W-198 shipped. |
| An attacker signs up for a local account using the victim's real email address before the victim ever tries SSO (nothing at local signup verifies inbox ownership) | **Added (W-198):** `link-by-email`/`jit-create`'s email-match branch now requires the matched local account's `emailVerified` to not be explicitly `false` before linking (`LOCAL_EMAIL_NOT_VERIFIED` otherwise) — a brand-new local signup defaults to `emailVerified: false` (per W-198), so this squatting attack now fails closed at the victim's first SSO login instead of silently attaching to the attacker's account. Pre-W-198 accounts with no `emailVerified` field at all are grandfathered as verified. |

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
        // 'page' is REQUIRED here, not just a browser-redirect nicety (contrast with the
        // built-in 'mfa'/'mfa-setup' steps): login.shtml's client-side handleNextStep() only
        // knows how to route those two hardcoded step names without a 'page' — any plugin-defined
        // step like this one falls through unhandled unless it supplies its own 'page'.
        page: '/auth/oauth-profile-complete.shtml',
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

**Design decision (confirmed):** the profile-complete step fires **only** for JIT-created users with unresolved placeholder fields, gated by `oauth._jit.placeholderFields`/`profileCompletedAt`. Existing users linked via Path A or B never have an `oauth._jit` block at all, so they never see the prompt — they manage their profile through `/user/me` like any other user. This keeps the SSO flow simple and predictable ("only new users with genuinely missing data get onboarding").

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
     - auth-oauth returns [{ step: 'oauth-profile-complete', priority: 20, page: '/auth/oauth-profile-complete.shtml', ...}]
     - auth-mfa   returns [{ step: 'mfa-setup',              priority: 100, page: '/auth/mfa-setup.shtml', ...}]
9. Server response: { success: true, nextStep: 'oauth-profile-complete', page: '/auth/oauth-profile-complete.shtml', missingFields, prefill }
10. Browser → /auth/oauth-profile-complete.shtml (form with pre-fills) — client-side handleNextStep()
    follows result.page, since 'oauth-profile-complete' has no built-in case of its own
11. User fills First Name = "Jane", Last Name = "Doe"
12. → POST /api/1/auth/login { step: 'oauth-profile-complete', firstName: 'Jane', lastName: 'Doe' }
13. onAuthValidateStep saves fields, sets oauth._jit.placeholderFields = [], oauth._jit.profileCompletedAt = now
14. _getRequiredSteps loops back → returns [{ step: 'mfa-setup', page: '/auth/mfa-setup.shtml' }]
15. Server response: { success: true, nextStep: 'mfa-setup', page: '/auth/mfa-setup.shtml' }
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
| `profileRequiredFields` | Which fields trigger Stage B when Stage A could only produce a placeholder for them (per `oauth._jit.placeholderFields`). Default `['firstName', 'lastName']`. Set `[]` to skip the completion step entirely (placeholder values are kept as-is; user can edit later via `/user/me`). |
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

> "This is your only way to sign in. Set a local password or link another provider before removing this one." → **Set a Password** (`/user/settings` — Security panel)

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

### 13. Provider Config Caching (found during W-197 spec review)

`onAuthGetLoginProviders` runs on every unauthenticated render of `/auth/login.shtml` — the single highest-traffic unauthenticated route on the site. The naive approach (a `PluginModel.getByName('auth-oauth')` call per render — see §6/Hook Implementations correction above) is one uncached MongoDB round-trip per page view.

The framework has no `onPluginConfigSave`-style hook to invalidate a cache the instant an admin edits provider config, so this plugin uses a short-TTL cache rather than event-based invalidation:

```javascript
// plugins/auth-oauth/webapp/model/oauthAuth.js (excerpt)
const CONFIG_CACHE_TTL_SECONDS = 20;

static async getCachedConfig() {
    const cached = await RedisManager.cacheGetObject('plugin:auth-oauth', 'config');
    if (cached) return cached;

    const pluginDoc = await PluginModel.getByName('auth-oauth');
    const config = pluginDoc?.config || {};
    await RedisManager.cacheSetObject('plugin:auth-oauth', 'config', config, { ttlSeconds: CONFIG_CACHE_TTL_SECONDS });
    return config;
}
```

`RedisManager.cacheGetObject`/`cacheSetObject` already fail open (no-op / return `null`) when Redis is unavailable, so this degrades automatically to the original uncached-Mongo-read behavior — no separate in-memory fallback needed. A ~20-second staleness window on provider *metadata* (label/icon/enabled/order — never secrets) is an acceptable trade for admins toggling a provider on the config page; there's no correctness risk, since the actual token exchange in `apiCallback` always reads provider config fresh (uncached) — that path is far lower-traffic and correctness there matters more than a few seconds of caching.

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
| Rate limiting | Per-IP throttle on `/init/:provider` and `/callback/:provider` (60/min default, admin-configurable). **Corrected during spec review:** there is no route-level rate-limit *middleware* in the framework — implemented by calling the existing `RedisManager.cacheCheckRateLimit(path, key, { limit, windowSeconds })` helper manually at the top of `apiInit`/`apiCallback`; fails open (no throttling) if Redis is unavailable. |
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
     *
     * Note (corrected during spec review): PluginModel.getConfig() doesn't exist — the real
     * method is PluginModel.getByName(name), returning the whole plugin doc (config lives at
     * .config). See _getCachedConfig() below and §13 "Provider Config Caching" — this hook
     * fires on every unauthenticated /auth/login.shtml render, so an uncached Mongo read here
     * would be a real, easy-to-miss perf cost.
     */
    static async onAuthGetLoginProviders(context) {
        const { req, providers } = context;
        const config = await OauthAuthController._getCachedConfig();
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
     *
     * Note (found during spec review, kept intentionally): grep of webapp/ confirms
     * onUserSyncProfile has zero call sites anywhere in the framework today — nothing
     * currently fires this hook. It's registered here anyway, ahead of any real caller,
     * as a deliberate future-proofing decision: if a future framework feature (e.g. an
     * admin "resync profile from IdP" action) is added, this handler is already wired up.
     * Until then this method is dormant; the actual profile merge into user.oauth.{provider}
     * during the live OAuth callback happens as a plain function call from apiCallback (§7),
     * not through this hook.
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

    // API endpoints — declared via static routes (see §6 "Routing note"; auto-discovery
    // cannot express the `:provider` path parameter these endpoints need):
    static routes = [
        { method: 'GET',    path: '/api/1/auth-oauth/providers',              handler: 'apiProviders',       auth: 'none'  },
        { method: 'GET',    path: '/api/1/auth-oauth/init/:provider',         handler: 'apiInit',            auth: 'none'  },
        { method: 'GET',    path: '/api/1/auth-oauth/callback/:provider',     handler: 'apiCallback',        auth: 'none'  },
        { method: 'GET',    path: '/api/1/auth-oauth/user/providers',         handler: 'apiUserProviders',   auth: 'user'  },
        { method: 'POST',   path: '/api/1/auth-oauth/link/:provider',        handler: 'apiLink',             auth: 'user'  },
        { method: 'DELETE', path: '/api/1/auth-oauth/link/:provider',        handler: 'apiUnlink',           auth: 'user'  },
        { method: 'GET',    path: '/api/1/auth-oauth/admin/providers',        handler: 'apiAdminProviders',      auth: 'admin' },
        { method: 'POST',   path: '/api/1/auth-oauth/admin/providers',        handler: 'apiAdminProvidersCreate', auth: 'admin' },
        { method: 'PUT',    path: '/api/1/auth-oauth/admin/providers/:id',    handler: 'apiAdminProvidersUpdate', auth: 'admin' },
        { method: 'DELETE', path: '/api/1/auth-oauth/admin/providers/:id',    handler: 'apiAdminProvidersDelete', auth: 'admin' },
        { method: 'POST',   path: '/api/1/auth-oauth/admin/providers/:id/test', handler: 'apiAdminProvidersTest', auth: 'admin' }
    ];

    static async apiProviders(req, res)             { /* GET /api/1/auth-oauth/providers */ }
    static async apiInit(req, res)                  { /* GET /api/1/auth-oauth/init/:provider */ }
    static async apiCallback(req, res)               { /* GET /api/1/auth-oauth/callback/:provider */ }
    static async apiUserProviders(req, res)          { /* GET /api/1/auth-oauth/user/providers */ }
    static async apiLink(req, res)                   { /* POST /api/1/auth-oauth/link/:provider */ }
    static async apiUnlink(req, res)                 { /* DELETE /api/1/auth-oauth/link/:provider */ }
    // ... admin endpoints (apiAdminProviders*)

    /**
     * §13: short-TTL Redis cache in front of PluginModel.getByName('auth-oauth'),
     * so the login page doesn't do an uncached Mongo read per render.
     */
    static async _getCachedConfig() { /* see §13 "Provider Config Caching" */ }
}
```

---

## UI Components

### 1. Login Page Buttons (rendered by framework via W-195 hook)

The framework's `/auth/login.shtml` (updated in W-195) iterates the `authProviders` array (populated via the `onAuthGetLoginProviders` hook, see §4) and renders one anchor per provider — this is actual framework markup, not something the plugin renders itself:

```html
<!-- webapp/view/auth/login.shtml — {{#each authProviders}} -->
<div class="local-auth-methods" id="authMethods">
    <a href="/api/1/auth-oauth/init/google-corp?redirect=..." class="local-auth-method" style="border-color: #4285F4;">
        <span>🇬</span>
        <span>Sign in with Google</span>
    </a>
    <a href="/api/1/auth-oauth/init/okta-prod?redirect=..." class="local-auth-method" style="border-color: #007dc1;">
        <span>🔐</span>
        <span>Sign in with Okta</span>
    </a>
</div>
<div class="jp-divider"><span>or sign in with</span></div>
<!-- Local form below (or above, if localAuthRestriction hides/restricts it - see W-195) -->
```

Each provider object supplies `label`/`icon`/`buttonColor`/`initUrl` (§7 "Hook Implementations" below) — the framework only cares about those four fields plus `order`. Provider button *styling beyond the inline `border-color`* (hover states, icon sizing, etc.) lives in the plugin's `webapp/view/jpulse-common.css`, scoped to `.local-auth-method`. The plugin does not own the wrapping markup or class names — those are framework-controlled (`local-auth-methods`/`local-auth-method`, `webapp/view/auth/login.shtml`), so a plugin should not assume it can restructure this HTML.

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

**Persistence model (corrected, W-200):** every field in the Add/Edit form writes straight into the
renderer's in-memory `providers` array on every keystroke/change and reports it via `ctx.onChange()`
- there is no per-row commit step at all (no Save/Apply button, nothing to Cancel). Add and Delete
are local array operations too (a never-saved row's Delete skips the confirm dialog; a previously
saved provider's Delete still confirms, since removing it has a real effect on existing linked
users once the page is actually saved). The page's single generic Save button is the only thing
that talks to the server; the framework's `onPluginConfigBeforeSave` hook (W-200) validates,
sanitizes, and encrypts a submitted client secret server-side right before that save is written,
and cleans up the encrypted secret for any provider deleted locally in the same save. Test
Connection is the one exception - it needs a real, already-encrypted secret on the server to test
against, so it stays a dedicated immediate endpoint call and is disabled in the UI for a provider
that only exists locally (added this session, not yet saved). Two earlier implementations existed
before landing here: the original had the Add/Edit form call dedicated admin endpoints directly
with its own separate Save button (a documented "gotcha" - a provider edit was silently discarded
if only the page's Save button was clicked); an intermediate one kept a single explicit "Apply"
button per row, which turned out to just relocate the same "two actions needed" complaint rather
than remove it.

**Blank means "inherit the preset default".** `label`, `icon`, and `buttonColor` all have per-preset
defaults in `utils/providerRegistry.js`. The renderer surfaces those as the form's placeholders (and
as the color input's initial value), stores *no key at all* when the admin leaves the field blank,
and shows the inherited value muted in the table. `_buildProviderButtons()` applies the same
fallback server-side, so an entry that predates this - or one hand-edited in the database - still
renders a labelled button rather than an empty one. Switching preset drops a color that still
matches the outgoing preset's default (it was never deliberately chosen) and drops any endpoint
field the incoming preset doesn't use, so a leftover `discoveryUrl` can't silently override the new
preset's own.

**Attribute escaping.** The renderer builds its markup as strings, and `jPulse.string.escapeHtml()`
serializes a *text node* - which per the HTML spec leaves `"` untouched. That's correct for element
content but wrong inside `value="..."`: an inline SVG icon (`<svg viewBox="0 0 24 24">`) terminates
the attribute at its own first quote and reads back truncated, and a crafted label could inject an
event-handler attribute into the admin page. The renderer therefore uses a local `attrEscape()` for
every attribute interpolation and keeps `escapeHtml()` for element content only.

**Icon preview.** The table's third column is "Icon & Label" and previews the icon as the admin
types. The renderer only ever holds the *unsaved* value - `sanitizeIcon()` hasn't run on it yet - so
a markup icon is previewed through an `<img>` data URL (`data:image/svg+xml`, with `xmlns` injected
when the paste omits it, since SVG behind an `<img>` needs it) rather than being inserted into the
admin page as live DOM. An `<img>`-loaded SVG can neither run script nor fetch anything, which
avoids duplicating the server's allow-list in the browser where it could drift out of sync. Emoji
icons - the common case - render as plain escaped text.

**The panel's button is labelled "Close Editor", not "Done"** - it only collapses the per-provider
panel; every edit is already applied and nothing there commits or discards.

**The Google preset's default icon is Google's own 4-color "G" mark**, not an emoji placeholder -
defined once in `utils/providerRegistry.js` (`GOOGLE_LOGO_SVG`, server-side source of truth for the
login page) and mirrored in the renderer (`JPULSE_AUTH_OAUTH_GOOGLE_LOGO_SVG`, a plain browser
script with no import mechanism to share the constant). Neither copy declares `width`/`height`/
`x`/`y` - every surface that shows it (login button, admin table preview, Connected Accounts) sizes
it purely via CSS, so there's one shape with no baked-in size to fight. Since it's framework-authored
and never admin-editable, it's never run through `sanitizeIcon()` (that only guards
admin-submitted values). A raw SVG string is unreadable as a text input's `placeholder` attribute,
so the Icon field describes it instead (`(Google logo)`) rather than showing the markup itself.

**Three SVG icon layout bugs.** The first two are a variant of the same cause; the third is unrelated
and specific to the admin table's preview mechanism.
- Login button (`webapp/view/auth/login.shtml`): an inline `<svg>` is a *replaced element*; the
  surrounding text's `vertical-align: baseline` default leaves room below it for a descender that a
  graphic doesn't have, visually pushing it up relative to a plain text glyph (an emoji) in the same
  spot - flex `align-items: center` on the outer container does not fix this, because the gap exists
  inside the icon's own inline box, one level down. Fixed with `vertical-align: middle` on
  `.local-auth-method svg`.
- Admin table ("Icon & Label" column), alignment: fixed by wrapping the icon + label in a
  `.plg-oauth-label-cell` flex row instead of relying on a magic `vertical-align: -4px` offset (that
  number only happened to work for one icon size); this also let the preview grow from a barely
  visible 18px to 22px without needing yet another manually tuned offset.
- Admin table ("Icon & Label" column), size, for an *admin-supplied* SVG only (the Google preset's
  own icon was never affected - see below): `CommonUtils.sanitizeHtml()` lowercases every attribute
  name it re-serializes, so a provider's icon comes back from `sanitizeIcon()` with `viewbox`, not
  `viewBox`. That's invisible when the markup is parsed as HTML - the login button above, and the
  Connected Accounts page's `innerHTML` assignment, both go through the HTML parser's own SVG
  "foreign content" step, which silently restores a fixed list of attribute names to their correct
  case, `viewbox` -> `viewBox` among them. The admin table's preview doesn't get that fix-up for
  free: `iconPreviewHtml()` deliberately renders an admin-supplied icon through an `<img>` data URL
  rather than as live HTML, specifically so a not-yet-saved, not-yet-sanitized draft can never become
  real DOM in the admin's own page (see the XSS note above) - and SVG behind an `<img>` is parsed as
  a standalone XML document, where casing is significant and there is no fix-up. Losing the viewBox
  makes the browser fall back to the CSS-default replaced-element intrinsic size (300x150, a 2:1
  non-square box) instead of deriving a square aspect ratio from the viewBox; combined with
  `object-fit: contain` on `.plg-oauth-icon-preview`, that wrong, non-square intrinsic ratio is what
  visually renders as "tiny and pushed toward the top-left" inside the icon's square 22px box - two
  separate, compounding effects (browser bug per se) confirmed with a real Chromium render before
  fixing. Fixed by restoring the one mixed-case attribute our allow-list actually uses
  (`restoreSvgAttributeCase()` in `jpulse-common.js`, `viewbox` -> `viewBox`) before building the
  preview's data URL - preview-only, so the editable form field still round-trips the exact stored
  value untouched.

**Test coverage:** `webapp/tests/unit/view/provider-renderer.test.js` drives the renderer in a
hand-constructed JSDOM document with a stubbed `jPulse` global (`testEnvironment: jsdom` isn't
installed; the `jsdom` package alone is), covering live binding, preset switching, blank-means-
inherit, attribute escaping, local add/delete, and read-only mode.

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
| 10 | `profileRequiredFields: []` — new user, missing name claims | Step skipped; user logs in with placeholder firstName/lastName still in place (e.g. email local-part / `'-'`), editable later via `/user/me` |
| 11 | Provider returns `email_verified: false` | Path A refused (`EMAIL_NOT_VERIFIED_AT_PROVIDER`); JIT refused with same reason |
| 12 | State mismatch (open callback URL directly) | Redirects to /auth/oauth-error.shtml?reason=STATE_MISMATCH |
| 13 | Provider returns error param on callback | Redirects to /auth/oauth-error.shtml?reason=PROVIDER_ERROR |
| 14 | JIT user (`hasLocalPassword: false`) tries to unlink their only linked provider | Blocked with `LAST_AUTH_METHOD`; message links to Set Password page (§11) |
| 15 | Same user as #14 runs "Set Password" from `/user/settings` (Security panel), then retries unlink | `changePassword()` skips `currentPassword` check (W-195), sets `hasLocalPassword: true`; unlink now succeeds |
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

- [x] `webapp/utils/crypto-secrets.js` (new framework file, found during spec review — see §8): shared `encryptSecret()`/`decryptSecret()` primitive, since none existed before this plugin needed one
- [x] Plugin structure (`plugins/auth-oauth/`)
- [x] Plugin manifest (`plugin.json`) with W-194 custom renderer field and `profileRequiredFields` option
- [x] Controller with hooks + API endpoints (`webapp/controller/oauthAuth.js`)
- [x] Model with W-107 schema extension (`webapp/model/oauthAuth.js`)
- [x] Provider config model + secret encryption (`webapp/model/oauthProvider.js`)
- [x] Provider registry with Google + OIDC + OAuth2 presets (`webapp/utils/providerRegistry.js`)
- [x] openid-client wrapper (`webapp/utils/oauthClient.js`)
- [x] Profile field extractor with fallbacks (`webapp/utils/profileExtractor.js`) — §10 Stage A
- [x] Custom renderer for providers list (`webapp/view/jpulse-common.js`)
- [x] Provider button styles (`webapp/view/jpulse-common.css`)
- [x] User linked-accounts page (`webapp/view/jpulse-plugins/auth-oauth.shtml`)
- [x] OAuth profile complete page (`webapp/view/auth/oauth-profile-complete.shtml`) — §10 Stage B
- [x] OAuth error page (`webapp/view/auth/oauth-error.shtml`)
- [x] Version management (`webapp/bump-version.conf`) — including test-file patterns, a gap found during a pre-release review
- [x] Unlink-last-method guard consuming the W-195 `hasLocalPassword` flag (§11) — `DELETE /api/1/auth-oauth/link/:provider`
- [x] Account-status check in the callback handler, before calling `AuthController.completeExternalAuth()` (§7) — checks `UserModel`'s real status enum (`pending`/`suspended`/`terminated`/`inactive`), corrected during pre-release review after an earlier draft mistakenly mirrored `auth.js`'s stale `locked`/`disabled` dead code
- [x] Computed, copyable redirect URI shown per provider in the custom renderer (§8)
- [x] `static routes` declaration for all API endpoints (§6 — required for `:provider`/`:id` path params; auto-discovery does not apply)
- [x] Provider config caching (`getCachedConfig()`, §13) — short-TTL Redis cache in front of `PluginModel.getByName('auth-oauth')`, consumed by `onAuthGetLoginProviders`
- [x] `allowedDomains` per-provider allowlist, enforced in `_resolveUser()` ahead of every strategy branch (§8) — found unimplemented during pre-release review despite existing in the admin UI/docs
- [x] `emailVerified` fail-closed check + lowercase email normalization in `_resolveUser()`/`_createJitUser()`, consuming the framework's W-198 release (§7, §"Design notes")
- [x] `onPluginConfigBeforeSave` hook implementation, consuming the framework's W-200 release — collapses the provider table's Add/Edit flow onto the plugin config page's single generic Save button (§"UI Components" §3); the dedicated `admin/providers` create/update endpoints and their validation/encryption logic are refactored into a shared `_prepareProviderEntry()` helper used by both paths, so there's exactly one place secrets get encrypted
- [x] User docs (`docs/README.md`) — includes provider setup guides (Google, Okta, Keycloak, Azure Entra), migration walkthrough (Paths A/B/C), and the site-mode config table (§12: `disableSignup`/`hideSignup`/`localAuthRestriction` combinations)
- [x] Developer docs (`README.md`)
- [ ] i18n (en, de) — **deferred:** no plugin-level i18n mechanism exists in the framework yet (`webapp/translations/*.conf` only loads framework/site strings); all plugin-facing strings are English-only until that framework gap is addressed
- [x] Manual test pass against a live Google IdP (Internal Workspace audience) — provider config, login button, consent screen, callback, JIT account creation, linked-accounts page all verified end-to-end
- [ ] Manual test pass on the remaining scenarios (unlink, a second concurrent provider/migration Path B, MFA composition) — unit-tested only so far, not yet exercised against a live IdP
- [x] Renderer correctness pass after the W-200 migration, with the first browser-side test suite for the plugin (`webapp/tests/unit/view/provider-renderer.test.js`, JSDOM) — fixed three defects the migration had left behind or predated it: the Preset dropdown snapped back on change (`syncFormToEntry()` never read the preset field, so the form re-rendered from the old value and the preset was effectively unchangeable); attribute interpolation used the text-node escaper, truncating any inline SVG icon at its first `"` and leaving an attribute-injection vector on a crafted label; and blank `label`/`icon` were stored as `""`, overriding the preset defaults with nothing instead of inheriting them
- [x] Unit tests for provider registry, linking strategies, profile extractor (name-split heuristics + placeholder tracking), secret encryption, `allowedDomains`, account-status enum, `emailVerified` fail-closed check, and the config renderer (187 tests total, all dependencies mocked, no live IdP calls)
- [x] Published to `github.com/jpulse-net/plugin-auth-oauth` as v1.0.0

---

## Effort Summary

| Component | Estimate |
|---|---|
| `webapp/utils/crypto-secrets.js` framework primitive (§8, new — found during spec review) | 2h |
| Provider config caching (§13, new — found during spec review) | 1h |
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
| **Total** | **~67h** |

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
- **v1.1.0** — Microsoft Entra ID `xms_edov` (Email Domain Owner Verification) optional-claim support, so `link-by-email`/`jit-create` work for Microsoft the same as every other OIDC preset (see Gap 5 above); until then, Microsoft providers are documented as `sub-only`-only
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

**Last Updated:** 2026-08-01 (settings completeness audit, pre-1.0.0 release; Gap 3 role controls fixed same day; Microsoft Entra ID preset added same day; Gap 5 — Microsoft `email_verified` limitation — documented same day, fix deferred to v1.1.0; Microsoft test-tenant setup guidance corrected twice same day, now pointing at Azure free account; Gap 6 — stale `jpulseVersion` — fixed same day during pre-release checklist pass; Gap 2 — broken Nickname option — fixed same day, same pass, by dropping the option — see change notes below; Gap 7 — missing `jpulse-navigation.js` found post-v1.0.0-publish, fixed same day as v1.0.1; Gap 8 — JIT fields shown unconditionally regardless of Linking Strategy, found live during bubblemap.net production setup, fixed as v1.0.2; Gap 9 — `req.protocol` unreliable behind a reverse proxy, broke the very first live Google login on bubblemap.net, fixed as v1.0.3)

---

## Review Note (2026-07-24, spec review pass #2, pre-implementation)

Before starting implementation, the doc was checked against real framework code for five more drift points (beyond the W-195 API surface, which checked out clean — see the review note below). All five were real corrections, not just doc typos — each would have surfaced mid-implementation otherwise:

1. **API routing must use `static routes`, not `api*` auto-discovery.** `site-controller-registry.js`'s auto-discovery can't express a custom path parameter like `/init/:provider`. Added a routing note to §6, and rewrote the `static hooks`/endpoint block in "Hook Implementations" to show an explicit `static routes` array (the same pattern `auth-mfa` already uses), matching how `auth-mfa` really registers its endpoints.
2. **No shared framework encryption utility existed.** The doc previously implied one; `auth-mfa` actually duplicates AES-256-GCM+scrypt logic inline in its own model. Decision (confirmed): extract a small new shared primitive, `webapp/utils/crypto-secrets.js`, as part of this work item (§8) — `auth-mfa` is left unchanged.
3. **"Framework rate-limiting middleware" doesn't exist** — only a callable helper, `RedisManager.cacheCheckRateLimit()`. Corrected the Security Requirements table row to describe calling it manually inside `apiInit`/`apiCallback`.
4. **`PluginModel.getConfig()` doesn't exist** (`PluginModel.getByName(name)` is the real API), and it's uncached — a real concern since `onAuthGetLoginProviders` fires on every unauthenticated `/auth/login.shtml` render. Added §13 "Provider Config Caching" (short-TTL Redis cache, fails open if Redis is down) and fixed the Hook Implementations code sample.
5. **`onUserSyncProfile` has zero call sites anywhere in the framework today.** Decision (confirmed): keep it registered anyway as a deliberate future-proofing placeholder (documented inline as dormant), rather than removing it — the actual profile merge during a live callback happens as a plain function call, not through this hook.

Also fixed: §7's `sub-only` lookup pseudocode now uses the real `UserModel.find()` API instead of a raw `db.users.findOne(...)` (plugins have no raw collection handle).

---

## Review Note (2026-07-24, post-W-195 implementation)

W-195 shipped and this doc was checked against the real code for drift. Everything else lined up exactly as designed (`completeExternalAuth()` signature, `onAuthGetLoginProviders` context shape `{ req, providers }` and field names `label`/`icon`/`buttonColor`/`initUrl`/`order`, `?localFallback=1`, `controller.auth.localAuthRestriction` values, `hasLocalPassword` default/behavior, `changePassword()` skip logic). Three things were corrected above:

1. **`page` field is mandatory for custom plugin steps, not just browser-redirect flows.** `login.shtml`'s `handleNextStep()` only has hardcoded routing for the framework's own `'mfa'`/`'mfa-setup'`/`'email-verify'` step names — a plugin-defined step like `oauth-profile-complete` needs its own `page` even in the pure-AJAX `login()` flow, or the client has nowhere to redirect to. Added `page: '/auth/oauth-profile-complete.shtml'` to the §10 Stage B example and the composed-flow walkthrough.
2. **Login page markup uses `.local-auth-methods`/`.local-auth-method`, not `.jp-auth-providers`/`.jp-auth-provider-btn`.** Updated the "UI Components" §1 example to match the real `webapp/view/auth/login.shtml` template.
3. **`/user/profile.shtml` doesn't exist.** The real routes are `/user/me` (profile fields) and `/user/settings` (Security panel, `panel-security`) — there's also no `#security` hash deep-link support today. Updated all five references.

---

## Review Note (2026-07-31, settings completeness audit, pre-1.0.0 release)

Every setting the plugin exposes — `plugin.json`'s `config.schema` (General/Providers/Security tabs) plus the per-provider fields in the W-194 custom renderer — was traced to the code that actually reads it, and cross-checked against the live dev deployment's stored `pluginConfigs.config`. **No code was changed as a result of this pass; the findings are recorded here first.**

**Confirmed implemented end to end:** `defaultLinkingStrategy` (`_resolveUser()`); `jitDefaultStatus` and the per-provider `jitStatus` override (passed to `UserModel.create()`, gated in `_handleLoginCallback()` before `completeExternalAuth()`, with a matching `ACCOUNT_PENDING_APPROVAL` message on the error page, and covered by a unit test); `linkingStrategy` per-provider override; `allowedDomains` (validated on save, enforced ahead of every strategy branch); `scopes` (blank correctly inherits the preset default — `resolveProviderConfig()` tests `length > 0`, not mere truthiness, so a stored `[]` from the renderer still falls back); and all presentation fields (`label`/`icon`/`buttonColor`/`order`/`enabled`, blank-means-inherit via `_presentation()`). Every reason code `oauthAuth.js` can emit has a message on `oauth-error.shtml`.

**Gap 1 — a provider can be saved, enabled, and shown on the login page while missing everything it needs to work.** `_validateProviderInput()` covers `id`, `preset`, `buttonColor`, `label`, and `allowedDomains`, but never `clientId`, the client secret, or the preset's endpoint fields. Observed on the dev deployment: one provider stored with `clientId: ""` and no `clientSecretRef`, another (`oidc` preset) with `discoveryUrl: ""` — both `enabled: true`, both rendering as login buttons, and both dead-ending at `/auth/oauth-error.shtml?reason=INTERNAL_ERROR`, which is indistinguishable from a genuine server fault. Every preset already declares `requiresClientSecret: true`; nothing reads it. Fix direction is recorded in §8 above ("Required fields are advisory, never blocking"): surface pending issues per provider without blocking Save, and give the login-time failure its own reason code. The button-visibility question raised here is now decided — the button stays, marked as incomplete, with `enabled` remaining the only thing that removes it; see §8 for the decision and for the constraint that the marker has to ride on the existing `onAuthGetLoginProviders` fields unless the W-195 hook contract is extended.

**Gap 2 — FIXED (2026-07-31, pre-release checklist pass) — `profileRequiredFields`' "Nickname" option could never do anything, and was actively contradictory when combined with the others.** Stage B fires on `oauth._jit.placeholderFields`, and `extractProfile()` only ever records `firstName`/`lastName` there — never `nickName`, even when it resolves to `null` (verified against the real function across four claim shapes, including "no name claims at all", which yields `placeholderFields: ["firstName","lastName"]`, `nickName: null`). So selecting Nickname alone meant the completion step never appeared — a silently inert configuration. Selecting it *alongside* firstName/lastName was worse and genuinely user-facing: `onAuthGetSteps()` still computed `missingFields` without it (so the step's own data never mentioned it), while `onAuthValidateStep()` rejected the submission unless `stepData.nickName` was non-empty — against a field the Stage B page labels "Nickname (optional)", with a generic "Please fill in all required fields" error that didn't say which field was at fault. A JIT user could get stuck unable to complete signup with no way to tell why, if an admin ever picked this combination.

Two fixes were possible: make nickName trackable as a real placeholder field (the fuller fix), or drop the option since nothing could act on it correctly today. Decided: dropped — `plugin.json`'s `profileRequiredFields` options now list only `firstName`/`lastName`. The Nickname field itself is untouched and still shown as a normal optional field on the Stage B page (`oauth-profile-complete.shtml` always displays it regardless of `missingFields`, per its own `field === 'nickName'` check) — only the ability to force it "required" through this broken mechanism is gone. Revisit as the fuller fix if a real need for a mandatory-nickname JIT flow ever comes up.

*This is entirely plugin-side; no framework change is involved.* All four moving parts belong to this plugin: `profileExtractor.js` decides what lands in `placeholderFields`, `oauthAuth.js`'s `onAuthGetSteps()`/`onAuthValidateStep()` decide what counts as missing and what is rejected, and `oauth-profile-complete.shtml` is a plugin view that owns the "(optional)" label and the generic error text. The framework's role is limited to calling the hooks and rendering whatever step data the plugin returns. The multiselect option list also comes from the plugin's own `plugin.json`, so dropping the option is a one-line change there.

**Gap 3 — FIXED (2026-07-31) — the role controls offered a hardcoded option list that ignored site-defined roles.** *(Revised after review: the original finding called both controls "decorative and removable". That was wrong about the cause. They were inert, but the fix was to make the list dynamic, not to drop the selectors — implemented below.)*

`jitDefaultRoles` hardcodes a single option (`{ value: "user" }`) in `plugin.json`, and an empty selection falls back to `['user']` in `sanitizeJitRoles()` — so today no selection the admin can make changes the outcome. But roles are *not* a fixed set: W-147 made them site-configurable via `data.general.roles` (Admin UI → General tab), exposed server-side as `ConfigModel.getEffectiveRoles()` and over the wire as `GET /api/1/user/enums?fields=roles`, which is exactly how `webapp/view/admin/users.shtml` populates its own role dropdown. A site that defines, say, `editor` has a genuinely useful JIT choice to make, and the plugin currently cannot offer it. Keep the selector; source its options at render time.

Feasibility of that fix was verified against the framework rather than assumed, and it needs no framework change:

- `plugin.json` field defs reach the renderer through `_normalizePluginFieldDef()`, which starts from `Object.assign({}, field)` — unrecognized keys such as `loadOptions` pass straight through to the field def the form consumes.
- `loadOptions` is honored only when `fieldEl.tagName === 'SELECT'`. A `multiselect` is rewritten by `_resolveInputType()` to `jpSelect` + `multiple`, and jpSelect enhances a real `<select multiple>` element, so the guard passes.
- `PluginModel.validateConfig()` has cases for `text`/`password`/`number`/`boolean`/`select`/`custom` but **none for `multiselect`** — so dynamically loaded values are not checked against the static `options` array in `plugin.json` and won't be rejected on save. (The `select` case *does* validate against `options`, so the same trick on a single-select field would need the server side revisited.)
- The handler is resolved by registry name, the same mechanism the W-194 provider renderer already registers through, so the plugin has a place to put it.

Related and more consequential than the UI itself: **`sanitizeJitRoles()` strips the literal strings `admin` and `root`, not whatever the site actually treats as privileged.** Since W-147 a site can define a custom role and add it to `data.general.adminRoles`; such a role would survive the filter and could be auto-assigned to a JIT-provisioned user. The check should consult `ConfigModel.getEffectiveAdminRoles()` instead of hardcoding two names. Nothing exploitable on the current deployments (both use the default `['admin','root']`), but the invariant §8 claims — "never auto-provision an administrator" — is only literally true for the default configuration.

Note this is *not* the same as `auth-mfa`'s role multiselect, which legitimately offers the three defaults because it is selecting who MFA applies to, not who gets provisioned — though it inherits the same staleness against site-defined roles (out of scope here; not touched).

The per-provider "JIT: Override Roles → Users only (instead of the global default)" checkbox was a separate, smaller problem: it wrote `['user']`, identical to the only value the global default could hold, so it was a no-op regardless of how the global list was sourced. Decided (2026-07-31): upgrade it to a real per-provider role selector rather than remove it, for the same reason the global one is worth keeping — a per-provider JIT role choice is genuinely useful once the option list is real.

**Implementation, both parts, no framework change:**

- `plugin.json`'s `jitDefaultRoles` field gained `"loadOptions": "authOauth.loadRoleOptions"` (static `options: [{ value: "user", label: "user" }]` kept only as the pre-load/on-error fallback the framework's `_applyLoadedOptions()` replaces once the handler resolves). `webapp/view/jpulse-common.js` registers that handler once at script load — `jPulse.schemaForm.register('authOauth.loadRoleOptions', () => window.jPulse.plugins.authOauth._fetchSiteRoles())` — where `_fetchSiteRoles()` calls the same `GET /api/1/user/enums?fields=roles` endpoint `admin/users.shtml` already uses, memoized per script load (a promise cached on the namespace object), and falls back to `[{ value: 'user', label: 'user' }]` on any failure.
- The W-194 provider-config custom renderer is hand-rolled HTML (not routed through the framework's schema-form pipeline that `loadOptions` targets), so the per-provider "JIT: Override Roles" checkbox couldn't reuse that mechanism directly. It now calls the same `_fetchSiteRoles()` once per field mount, starts with the one-role fallback so the very first synchronous render has something to show, and re-renders the open form (if any) once the real list arrives — the checkbox was replaced by a `<select multiple>` populated from that list; selecting nothing stores `jitRoles: null` (inherit the global default, same semantics as before), selecting one or more stores exactly those role names. It picks up the framework's existing generic "every input/select/textarea syncs into `entry` on change" wiring for free — no bespoke event handling needed.
- `sanitizeJitRoles()` (`controller/oauthAuth.js`) now filters against `ConfigModel.getEffectiveAdminRoles()` instead of the literal strings `'admin'`/`'root'`, closing the site-defined-admin-role gap described above. This is the one and only place JIT roles are actually enforced (`_createJitUser()`); nothing upstream of it (the config schema, the custom renderer, `validateConfig()`) gates what can be *stored* — consistent with §8's "advisory, never blocking" position elsewhere in this doc, and matching the existing "UI narrows, security boundary is server-side" pattern this same function already established for the literal-two-names version.
- Tests: `oauth-auth.test.js` gained a `ConfigModel` mock and a case asserting a site-defined admin-equivalent role is stripped from JIT roles, not just the literal `admin`/`root`. `provider-renderer.test.js` gained a `jPulse.api.get`/`jPulse.schemaForm.register` stub (the renderer now calls both at mount) and a "JIT role override" suite covering: the selector renders this site's actual roles (not a hardcoded list), it falls back to a plain `user` option if the fetch fails, selecting nothing reports `jitRoles: null`, and selecting specific roles reports exactly those.

**Follow-up (2026-07-31, same day) — don't show a role that would be silently rejected anyway.** The first pass above sourced the selectors from `GET /api/1/user/enums?fields=roles`, which returns every configured role including admin-equivalent ones (it's the same endpoint `admin/users.shtml` uses for its own, unrelated purpose of filtering the user list by role - a context where showing `admin` is exactly right). Screenshot review during manual testing showed the JIT selectors listing `admin`/`root` right alongside `user`/`geek`/`gofer` - checkable, but silently stripped by `sanitizeJitRoles()` the moment a JIT user actually gets created. That's the same "showable but rejected" shape as Gap 1's incomplete providers, and the fix follows the same principle: don't offer a choice the server always overrides.

Since the plugin doesn't have a good way to filter admin-equivalent roles out of the generic user enums response *client-side* without duplicating `ConfigModel.getEffectiveAdminRoles()` in browser JS, the plugin gained its own endpoint instead:

- New `GET /api/1/auth-oauth/admin/assignable-roles` (`auth: 'admin'`, added to `oauthAuth.js`'s `static routes`) returns `ConfigModel.getEffectiveRoles()` with `ConfigModel.getEffectiveAdminRoles()` already subtracted server-side - the exact set `sanitizeJitRoles()` would ever let through, computed the same way.
- `_fetchSiteRoles()` now calls this endpoint instead of the generic user-enums one; no client-side filtering needed since the server response is already the assignable set.
- Help text on both selectors changed from "administrators are never auto-provisioned" (true, but leaves an unexplained admin option sitting in the list) to explicitly saying admin-equivalent roles aren't shown here.
- Tests: two new `apiAdminAssignableRoles` cases (plain admin/root subtraction, and a site-defined admin-equivalent role) plus a `getEffectiveRoles` addition to the existing `ConfigModel` mock; the renderer suite's fixtures were updated to reflect that the endpoint's response never contains an admin role in the first place (previously the test fixtures included `admin`/`root` in the option list, which no longer matches the real contract).

**Second follow-up (2026-07-31, same day) — visual consistency between the two role selectors.** Screenshot comparison showed the General tab's "JIT: Default Roles" (routed through the framework's schema-form `multiselect` → jpSelect pipeline) rendering as the framework's own dropdown-with-checkboxes widget, while the Providers tab's "JIT: Override Roles" (hand-rolled by the W-194 custom renderer, which sits outside that pipeline) rendered as a bare native `<select multiple>` - functionally equivalent, visually inconsistent shift-click listbox next to the rest of the config page's styled controls.

Fixed by having the custom renderer call the same underlying widget the framework's pipeline calls for it: `jPulse.UI.input.jpSelect.init(select)` on the `.plg-f-jitRoles` element, right after the generic per-field listener wiring (jpSelect relocates the existing `<select>` node into a wrapper rather than cloning it, so the listener keeps firing on every selection change - no separate wiring needed). The one complication: `jpSelect.init()` appends its dropdown to `document.body` as a portal, not as a descendant of the field it enhances, which is fine for the framework's own forms (rendered once) but not for this renderer, which rebuilds its form's HTML on nearly every open/close/row-switch/preset-change. Left alone, each such rebuild would abandon the previous dropdown `<div>` in `<body>` rather than removing it (`formEl.innerHTML = ...` only touches descendants of `formEl`, and the portal isn't one). Addressed with an explicit `destroyJitRolesWidget()` that the renderer calls at the top of both `render()` and `renderForm()` - i.e. every code path that's about to discard the current form's DOM - using a closure variable that captures the specific dropdown element the last `jpSelect.init()` call created (via `select.closest('[data-jpselect-wrapper]')._jpSelectDropdown`), not a broad `document.body` query. Tests: a case confirming `jPulse.UI.input.jpSelect.init` was actually called against `.plg-f-jitRoles` (proving the real widget is in use, not just present-looking markup) and one that opens/switches/closes several forms in sequence and asserts zero leftover dropdown portals in `<body>` afterward.

**Gap 4 — `promptForConsent` is specified but never implemented.** It appears in the `google` preset here and in the registry code, but is never passed through `buildAuthorizationUrl()`, so no `prompt` parameter is ever sent to the IdP. This is the direct cause of the behavior observed during live Google testing: after a first successful sign-in, subsequent logins complete silently with no visible Google screen, leaving the admin unsure whether the redirect happened at all — and no way to force account selection when testing with multiple accounts. If implemented, it belongs as a per-provider setting (`prompt=select_account` being the useful value for multi-account testing and shared machines) rather than a preset-only constant.

**Gap 5 — the new Microsoft preset's `link-by-email`/`jit-create` strategies are unusable: Microsoft Entra ID never emits `email_verified`.** Found by code review, not live testing (recorded here instead of only in the preset-addition note below, since it's a functional defect against the `_resolveUser()` linking logic, not a preset-configuration detail). `_resolveIdentity()` computes `emailVerified: claims.email_verified === true`; `_resolveUser()` then hard-rejects with `EMAIL_NOT_VERIFIED_AT_PROVIDER` whenever that's falsy, before any DB lookup, for both `link-by-email` and `jit-create`. Confirmed against Microsoft's own documentation and a direct statement from Microsoft's Lead PM for their auth libraries (Microsoft Q&A, `learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference`): Entra ID's ID tokens do not include a standard `email_verified` claim at all — by design, since the underlying `email` claim is admin-settable per user and Microsoft explicitly recommends never using it for authorization decisions. Microsoft's actual verification signal is a separate, non-default optional claim (`xms_edov`, "Email Domain Owner Verification") that requires explicit Token configuration in the app registration (`email` + `xms_pdl` optional claims, then `xms_edov`) — this plugin requests none of that today.

Practical effect: every Microsoft Entra ID login computes `identity.emailVerified === false`, unconditionally. `sub-only` is unaffected (never reads this field). `link-by-email` and `jit-create` are both broken for Microsoft specifically — every login rejects with `EMAIL_NOT_VERIFIED_AT_PROVIDER`, including one that would otherwise match an existing local account by email, or would otherwise be eligible for JIT provisioning. This fails closed (no incorrect linking/provisioning happens), so it isn't a security hole, but it does mean the preset's advertised SSO capability silently doesn't work end-to-end except in `sub-only` mode. Decided (2026-07-31): document as a known v1.0.0 limitation (see `docs/README.md` Security notes and the Microsoft Entra ID setup guide) recommending `sub-only` for Microsoft providers, rather than fix now — supporting `xms_edov` needs its own optional-claim request/consent flow through `oauthClient.js` and setup-doc steps, real engineering rather than a registry tweak. Tracked in Future Enhancements below for v1.1.0.

**Gap 6 — FIXED (2026-07-31) — `plugin.json`'s `jpulseVersion` understated the plugin's real minimum framework version.** Found during a pre-release checklist pass against `docs/plugins/publishing-plugins.md`'s "plugin.json is complete" item, not by live testing. It still read `>=1.7.1` (set early, before either dependency below existed), while the plugin has since grown two hard runtime dependencies on later framework versions: `static hooks.onPluginConfigBeforeSave` (W-200, shipped v1.7.4 — the entire single-Save-button provider flow depends on the framework actually calling this hook; on an older framework it silently wouldn't exist) and the `emailVerified` field plus DB-level unique email/username indexes (W-198, shipped v1.7.6 — the security guarantee behind `link-by-email`/`jit-create`'s fail-closed checks). Installing on a framework between 1.7.1 and 1.7.5 would silently break provider config saves; installing before 1.7.6 would silently reopen the exact pre-linking account-takeover W-198 was built to close, since the DB-level uniqueness/verification guarantees this plugin's linking logic assumes wouldn't exist yet. Fixed by bumping to `>=1.7.6` (also the version this plugin has actually been developed and tested against throughout this session). Also fixed in the same pass: the General tab's help text still named "Azure Entra" instead of "Microsoft Entra ID", inconsistent with the dedicated preset added earlier the same day.

**Gap 7 — FIXED (v1.0.1, 2026-07-31) — the linked-accounts page had no navigation entry anywhere, since v1.0.0.** Found post-release, not during the pre-release audit above: after `v1.0.0` was tagged, pushed, and published to `npm`, a review of the published tarball's file list showed `webapp/view/jpulse-navigation.js` was missing — a standard file both sibling plugins (`auth-mfa`, `hello-world`) ship to append their own page(s) to the framework's user-menu navigation (`window.jPulseNavigation.site.jPulsePlugins.pages`). It had been listed as a deliverable in `docs/dev/work-items.md` ("link to `/jpulse-plugins/auth-oauth.shtml` from user menu") but was never actually created. A repo-wide search of `webapp/` confirmed nothing else linked to the page either — the entire linked-accounts management page (connect/disconnect SSO providers) was genuinely unreachable from the UI for the whole `v1.0.0` release; a user would have had to know the URL by heart. Fixed by adding `webapp/view/jpulse-navigation.js`, matching the sibling plugins' exact pattern, adding a "Connected Accounts" (🔑) entry. Shipped as `v1.0.1` rather than amending the already-published `v1.0.0` tag/npm package, since `npm` doesn't support republishing over an existing version.

**Gap 8 — FIXED (v1.0.2, 2026-08-01) — "JIT: Override Roles"/"JIT: Status" rendered unconditionally, even for a provider whose effective linking strategy isn't jit-create.** Found live, during actual bubblemap.net production configuration (not a lab audit): the admin set a Google provider's Linking Strategy to `link-by-email`, then, immediately below it, still saw a fully interactive "JIT: Override Roles" checklist and asked, reasonably, why roles need selecting again when users already have roles from their existing accounts. Checked the renderer (`view/jpulse-common.js`'s `renderForm()`): both fields were included in every provider's edit form unconditionally, with no connection at all to that same form's own Linking Strategy dropdown a few rows above. Neither field has any effect unless the provider's *effective* strategy - its own override, or the inherited global `defaultLinkingStrategy` if left blank - is `jit-create`; `sanitizeJitRoles()`/`_createJitUser()` (`controller/oauthAuth.js`) are never even reached for `sub-only`/`link-by-email` logins. Same defect shape as Gap 1 (a provider stays a clickable, active-looking login button while missing what it needs to function) and Gap 2 (a form field with no connection between how it's labeled/positioned and what the code underneath it actually does) - a control that's fully interactive and visually identical to every other setting on the page, yet silently does nothing.

Fixed by making the two fields' visibility track the effective strategy live: `effectiveLinkingStrategy(entry)` (new helper, mirrors `oauthClient.js`'s `resolveProviderConfig()` server-side fallback order - `entry.linkingStrategy || config.defaultLinkingStrategy || 'link-by-email'`) gates whether `renderForm()` includes the two `fieldRow(...)` calls for "JIT: Override Roles"/"JIT: Status" at all, rather than rendering-then-hiding them via CSS. The Linking Strategy `<select>` needed its own dedicated `change` listener (it was previously handled by the generic "every field writes into `entry`" loop, which never re-renders the form) that calls `syncFormToEntry()` then `renderForm()` again - the same two-step the existing preset-switch handler already does - so switching strategy hides/reveals the JIT fields immediately, without waiting for the row to be re-opened. `syncFormToEntry()`'s reads of the two fields are now guarded (`if (jitRolesEl) {...}`) since they may legitimately not exist in the DOM; a value chosen while the fields were visible is deliberately left untouched (not cleared) if the admin switches away and back, rather than being silently discarded, since it's genuinely inert either way and clearing it would be a second surprise on top of the first. Linking Strategy's own help text now says outright that the JIT fields below only appear - and only apply - when the effective strategy is JIT create.

Tests: a new "JIT-only fields are gated on the effective linking strategy" suite (5 cases) covering: hidden for an explicit non-jit-create override; hidden when inheriting a non-jit-create global default; shown when inheriting a jit-create global default; appearing/disappearing live as Linking Strategy is switched in either direction; and a chosen role selection surviving a hide-then-show-again round trip. The five pre-existing "JIT role override" tests, written when the fields were still unconditional, were updated to explicitly set `linkingStrategy: 'jit-create'` (or the equivalent `config.defaultLinkingStrategy`) on their fixtures rather than relying on default visibility. Full plugin suite: 7 suites / 218 tests passing.

**Gap 9 — FIXED (v1.0.3, 2026-08-01) — `computeRedirectUri()` and `apiCallback()`'s `currentUrl` both used `req.protocol` directly, which is unreliable behind a TLS-terminating reverse proxy - broke live on `bubblemap.net`'s first real Google login attempt.** Found live, not by code review: the very first production Google sign-in attempt on `bubblemap.net` (behind nginx per `templates/deploy/nginx.prod.conf`) failed at Google's own consent screen with `Error 400: redirect_uri_mismatch`, even though the admin UI's displayed Redirect URI (computed client-side via `window.location.origin`, always correct) had already been pasted into Google Cloud Console verbatim. Root-caused by tracing `computeRedirectUri()`: it builds the `redirect_uri` sent to the IdP from Express's `req.protocol`, which by default ignores the `X-Forwarded-Proto` header nginx sets on every request (confirmed present in the reference nginx config) unless the app explicitly calls `app.set('trust proxy', ...)` - which a full search of `webapp/app.js` confirmed the framework never does. `docs/deployment.md` and `templates/deploy/README.md` both instruct admins to set `trustProxy: true` in `app.conf`, but nothing anywhere in the framework reads that key or acts on it - a documented setting with zero implementation behind it, a framework-level gap in its own right, now tracked as its own work item (`W-203`, `docs/dev/work-items.md`) rather than fixed here, since it requires touching `webapp/`, which this plugin's session doesn't touch. Net effect on an nginx-fronted deployment: `req.protocol` resolves to `http` on every request, so the `redirect_uri` actually sent to Google is `http://bubblemap.net/...` against a `https://bubblemap.net/...` registered at Google - an exact-string-match requirement, hence the mismatch.

A second, not-yet-triggered instance of the identical defect was found by tracing the flow one step further before shipping a partial fix: `apiCallback()` independently reconstructs `currentUrl` from `req.protocol + '://' + req.get('host') + req.originalUrl` to hand to `openid-client`'s `authorizationCodeGrant()` - and `openid-client` derives its *own* `redirect_uri` for the token-exchange request from that same URL (`redirectUri = stripParams(currentUrl)`, confirmed by reading its installed source). Fixing only `computeRedirectUri()` would have let the initial `/authorize` redirect succeed, then failed the *code exchange* step immediately after with a different `redirect_uri_mismatch` from Google's token endpoint - a second outage disguised as a fix. Both call sites shared the exact same root cause and needed the exact same correction.

Fixed by adding one `getRequestProtocol(req)` helper - `req.headers['x-forwarded-proto']`'s first hop, falling back to `req.protocol` - mirroring the priority order `getClientIp()` (two lines above in the same file) already uses for the identical class of problem with IP addresses; the plugin's own code already demonstrated awareness that `req.ip`/`trust proxy` can't be trusted here, this just extends the same defense to protocol. Both `computeRedirectUri()` and `apiCallback()`'s `currentUrl` construction now go through it.

Tests: two new `apiInit` cases (X-Forwarded-Proto overriding req.protocol; falling back to req.protocol when the header is absent, covering a direct non-proxied deployment) and one new `apiCallback` case asserting the `currentUrl` handed to `exchangeCodeForTokens()` reflects the forwarded protocol. `makeReq()`'s test helper gained optional `protocol`/`headers` parameters (previously hardcoded to `'https'`/`{}`) to make the reverse-proxy scenario constructible at all. Full plugin suite: 7 suites / 221 tests passing.

**Minor / no action needed:** `requiresClientSecret` and `docs` are declared on every preset and read by nothing — `requiresClientSecret` is precisely the flag Gap 1's advisory validation would consume, and `docs` would be a natural "setup guide" link in the provider edit form. `linkingStrategy` and `jitStatus` are not format-validated by `_validateProviderInput()`; an unrecognized value fails closed (falls through to `USER_NOT_PROVISIONED`) or is rejected by `UserModel`'s status enum, so this is a silence problem, not a safety one. The Security tab contains only a help block (break-glass guidance) and no settings — intentional, but worth knowing before someone goes looking for a setting there.

**Resolved by code review — the framework's `multiselect` control does persist an empty selection**, which §8's spec relies on for `profileRequiredFields: []` ("skip the completion step entirely"). Traced end to end instead of test-saving over the live dev config:

1. `getAllValues()` reads a multi-select as `Array.from(el.selectedOptions).map(o => o.value)`. With nothing selected, `selectedOptions` is empty, so the value is `[]` — not `undefined`, not an omitted key, which is where a control of this kind usually loses the distinction between "empty" and "untouched".
2. `getFormData()` coerces only `number` and `boolean` and re-defaults only those; an array value passes through untouched. The `default` in the field def is applied in `pluginSchemaToBlocks()` at *render* time (when the key is absent from the stored config), never at read time, so an explicit `[]` is not silently replaced by `["firstName","lastName"]` on the way out.
3. `PluginModel.validateConfig()` has no `multiselect` case at all — `[]` is neither rejected as "required" nor rewritten.
4. Plugin side, `pluginDoc?.config?.profileRequiredFields ?? [...]` uses `??`, so a stored `[]` is preserved rather than treated as falsy and re-defaulted.

The one caveat worth recording is the mirror image of point 3: because there is no `multiselect` validation case, a hand-crafted request can put arbitrary strings into any multiselect-backed config value. For `jitDefaultRoles` that is contained by `sanitizeJitRoles()` — which is the defense-in-depth §8 describes, and is exactly why that function's correctness (see Gap 3) matters more than the UI in front of it.

---

## Provider Preset Addition (2026-07-31, same day) — Microsoft Entra ID

Considered adding presets beyond Google: Microsoft Entra ID, LinkedIn, Apple, GitHub. Apple and GitHub stay deferred to v1.1.0 as already scoped above (Apple's JWT-signed client-secret model and `form_post` callback, GitHub's non-OIDC manual-endpoints + userinfo mapping are each real feature work, not registry entries). LinkedIn was investigated and also deferred, for a reason specific to it (recorded here so it isn't re-investigated from scratch later): LinkedIn's `.well-known/openid-configuration` document is real and at a fixed global URL, but is spec-non-compliant — it reports `"issuer": "https://www.linkedin.com"` while being served from `https://www.linkedin.com/oauth/.well-known/openid-configuration`, i.e. the issuer doesn't match the path it's discovered from (a [known, still-open LinkedIn bug](https://stackoverflow.com/questions/76859957/oidc-discovery-url-does-not-match-issuer)). Checked directly against the installed `openid-client@6.8.4` (`node_modules/openid-client/build/index.js`): it has built-in per-host workarounds for exactly this class of problem (`handleEntraId()` for `login.microsoftonline.com`, `handleB2Clogin()` for `*.b2clogin.com`), but none for LinkedIn — so a naive LinkedIn preset using this plugin's existing `client.discovery()` call (`utils/oauthClient.js`) would fail every login with `discovered metadata issuer does not match the expected issuer`. Making it work would need a LinkedIn-specific override inside `oauthClient.js` mirroring `openid-client`'s own internal pattern — real, if small, engineering, not a registry-only addition like Microsoft below. Left for a future session if LinkedIn is actually needed.

**Microsoft Entra ID was added as a full preset** (`microsoft` key, `webapp/utils/providerRegistry.js` and its client-side mirror in `webapp/view/jpulse-common.js`'s `_PRESETS`) — confirmed to need zero new engineering beyond the registry entry itself:

- Entra ID's discovery document has the same kind of issuer-template quirk as the LinkedIn case above (the resolved tenant ID in the returned `issuer` doesn't literally match a `common`/`organizations`/domain-name request URL), but `openid-client`'s `handleEntraId()` already special-cases exactly this for any issuer whose origin is `https://login.microsoftonline.com` — confirmed by reading that function in the installed library, not assumed. This plugin's `oauthClient.js` calls `client.discovery()` in the way that triggers it, so it "just works".
- Unlike Google, there's no single global discovery URL to hardcode — it's tenant-specific (`https://login.microsoftonline.com/<tenant-id>/v2.0/.well-known/openid-configuration`, `<tenant-id>` being a GUID, verified domain, or `common`/`organizations`/`consumers`). The admin supplies it, same as the generic `oidc` preset — the only difference from `oidc` is branding (Microsoft's own icon/color) and a tenant-shaped placeholder string in the Discovery URL field (`_PRESETS.microsoft.discoveryUrlPlaceholder`, client-only — it has no server-side runtime meaning) instead of the generic `oidc` preset's placeholder, so the admin sees the right shape to paste in without needing this doc.
- `type: 'oidc'`, `scopes: ['openid', 'email', 'profile']`, `requiresClientSecret: true` — identical defaults to the generic `oidc` preset. `docs` points at Microsoft's own v2.0 OIDC protocol reference.
- Icon: the classic Microsoft four-square mark (user-supplied SVG asset), following the same "no baked-in `width`/`height`/`x`/`y`, sized only via CSS" convention as the Google preset's icon, for the same reason (one shape, no size to fight with across the login button/admin table/Connected Accounts). `buttonColor: '#03a9f4'` reuses one of the mark's own four colors — the same design choice Google's preset already makes (`#4285F4` is one of the "G"'s own colors).
- `docs/README.md` gained a "Microsoft Entra ID" setup guide (renamed from the "Azure Entra ID" section that previously pointed admins at the generic **OIDC Provider** preset) pointing at the new dedicated preset instead; `README.md` and `plugin.json`'s description/summary were updated to list Microsoft Entra ID alongside Google as a named preset rather than folding it into "generic OIDC (Okta, Auth0, Azure Entra, Keycloak, ADFS)".
- Tests: `provider-registry.test.js` gained preset-shape and `resolveProviderConfig()` merge cases (mirroring the existing Google ones), plus an updated "registry exposes exactly N presets" count; `provider-renderer.test.js` gained a case confirming the Discovery URL field shows the tenant-specific placeholder when the `microsoft` preset is selected.
- Deliberately not carried over from Google: `promptForConsent` — per Gap 4 above it's dead code today (nothing reads it), so adding it to a second preset would just double the number of places a future implementation has to update for no present benefit.
- **Known limitation, found the same day by code review (see Gap 5 above):** `link-by-email`/`jit-create` do not work for this preset — Entra ID's ID tokens never carry `email_verified`, so `_resolveUser()` rejects every Microsoft login with `EMAIL_NOT_VERIFIED_AT_PROVIDER` under those two strategies. Documented as a v1.0.0 limitation (`docs/README.md`); `sub-only` is the only linking strategy that works for Microsoft until v1.1.0 adds `xms_edov` support.

**Follow-up (2026-07-31, same day) — testing without an organizational Microsoft account.** First pass claimed a personal Microsoft account alone (no Azure subscription, no directory) is enough to register an app, based on older documentation describing pre-2024 behavior. **That claim was wrong and was corrected the same day after the user hit it live**: Microsoft deprecated "register an app outside any directory" for personal accounts in June 2024 (confirmed against `learn.microsoft.com/en-us/entra/identity-platform/reference-breaking-changes`, not assumed) — a fresh personal account with no directory now hits a hard stop in the Entra admin center's App registrations page ("The ability to create applications outside of a directory has been deprecated"), exactly what the user's screenshot showed.

The corrected, verified free path (first version of this note): join the [Microsoft 365 Developer Program](https://developer.microsoft.com/microsoft-365/dev-program) and provision an **Instant sandbox**, which creates a real `<name>.onmicrosoft.com` directory with its own admin account in under a minute. **This too turned out to be wrong and was corrected again the same day, immediately after the user hit it live a second time**: the user's Developer Program dashboard showed no "Instant sandbox" option at all, only a "Register an application with the Microsoft identity platform" screen. Re-researched against `learn.microsoft.com/en-us/office/developer-program/microsoft-365-developer-program` and multiple Microsoft Q&A threads describing the identical symptom (not assumed): Microsoft now gates the free E5 developer sandbox behind one of three qualifications — an active Visual Studio Professional/Enterprise subscription (monthly VS plans don't count), membership in the ISV Success Program or an eligible Microsoft AI Cloud Partner Program tier, or a Premier/Unified Support contract. A plain new Microsoft account with none of those no longer qualifies, which is exactly the dead end the user hit; this is apparently a more recent restriction than what the original (pre-2024-breaking-change) research surfaced, and evidently changed again after the first correction above was written.

The verified working alternative, requiring no special program membership: an **Azure free account** ([azure.microsoft.com/free](https://azure.microsoft.com/free)) provisions a Microsoft Entra ID Free tenant automatically as part of signup — confirmed against `learn.microsoft.com/en-us/azure/cost-management-billing/manage/microsoft-entra-id-free` ("When you create a free account, there's no other action required... Microsoft Entra ID Free is automatically added to your billing account"). It requires a phone number and a credit or debit card for identity-verification purposes only (a temporary ~$1 authorization hold, automatically reversed; Microsoft's own FAQ is explicit that the free tier itself is never charged) — a real friction point compared to the Developer Program's phone-only verification, but the Developer Program path is no longer available to fall back on for an unqualified account, so this is the actually-reliable option today. From there, app registration proceeds exactly like the organizational path (`Single tenant only` is fine, since it's now a real tenant the user owns). `docs/README.md`'s Microsoft Entra ID guide was rewritten a second time to lead with the Azure free account path, with the Developer Program mentioned only as a valid alternative for accounts that already qualify. The redirect-URI chicken-and-egg fix (leave it blank at registration, add it after the Client ID/Secret are in hand) from the first pass still stands and wasn't affected by either correction.
