# W-262: plugins: auth-ldap plugin for LDAP and Active Directory login

## Status
🕑 PENDING — design and implementation plan. Depends on the framework work in W-261 (§F below).

## Objective

Create an `auth-ldap` plugin that lets users sign in to a jPulse site with their LDAP or Active
Directory (AD) username and password. The directory proves the password; jPulse keeps its own user
document for roles, preferences, MFA, and sessions.

v1.0.0 is authentication only. Group support (directory groups mapped to jPulse roles, and later to
jPulse groups once the framework has them) is technical debt, see `## Technical Debt`.

**Repository:** `github.com/jpulse-net/plugin-auth-ldap` (separate repo, independent versioning)
**npm package:** `@jpulse-net/plugin-auth-ldap`

**Design principle:** the directory is the authority for who may sign in. A user IT disables or
removes in the directory can no longer sign in to jPulse, even if a local password exists. Local
accounts that were never linked to the directory are not affected by it, so break-glass admins keep
working when the directory is down.

---

## Scope for v1.0.0

**In scope:**

| Feature | v1.0.0 |
|---|---|
| Username/password login on the existing login form (no redirect, no button) | ✅ |
| OpenLDAP and Active Directory presets, plus custom | ✅ |
| Service-account search, then bind as the found DN | ✅ |
| Anonymous search (blank bind DN) for directories that allow it | ✅ |
| LDAPS (`ldaps://`) and StartTLS, certificate verification on by default | ✅ |
| Several server URLs, tried in order (failover across domain controllers) | ✅ |
| Stable directory ID link (`entryUUID` / `objectGUID`) | ✅ |
| Linking strategies: link-existing (default), jit-create | ✅ |
| Profile sync on login (first name, last name, email) | ✅ |
| Directory-managed password: no local password for linked users (uses W-261) | ✅ |
| Offboarding: a linked user no longer in the directory is denied | ✅ |
| AD disabled-account check (`userAccountControl`) and AD bind sub-codes in the log | ✅ |
| Per-username failure throttle (protects AD lockout policy) | ✅ |
| Bind password encrypted at rest | ✅ |
| Admin "Test connection" with an optional test login | ✅ |
| W-107 admin and user cards for the `ldap` block (read-only) | ✅ |
| MFA composition (auth-mfa step runs after the directory login) | ✅ (framework, no plugin code) |
| Air-gapped install (no registry needed at install time) | ✅ |
| en and de translations | ✅ |

**Out of scope for v1.0.0** (see `## Technical Debt`):

| Feature | Reason |
|---|---|
| Group → role mapping, group sync | Separate design; jPulse has no group model yet |
| Several directories at once | One directory covers the common case; config is shaped so a list can follow |
| Background deprovisioning sync, session revocation | Needs a scheduled job and session lookup by user |
| Kerberos / SPNEGO (Windows integrated sign-in) | Needs a native `libldap`/GSSAPI addon, conflicts with air-gapped goal |
| Changing or resetting the directory password from jPulse | Directory write access, AD password policy handling |
| Admin "link to directory user" / "convert to local account" actions | v1 links automatically; manual tools follow |
| Direct bind with a DN template (no search) | Service-account or anonymous search covers v1 |
| SAML | Different protocol, separate `auth-saml` plugin |

---

## Related Work Items

- **W-261:** framework support for directory login plugins (prerequisite, see §F)
- **W-197:** auth-oauth plugin — reference for JIT creation, role sanitizing, plugin layout, secret encryption
- **W-195:** external auth framework primitives — `localAuthRestriction`, `?localFallback=1`, `hasLocalPassword`, `onAuthGetLoginProviders`
- **W-198 / W-205:** `emailVerified` and unique email/username — linking by email requires a verified local email
- **W-201:** account status gate in `login()` applies to external logins too
- **W-204:** IP rate limit on `POST /api/1/auth/login` (applies to LDAP logins unchanged)
- **W-206:** password reset — already refuses accounts with `hasLocalPassword: false`
- **W-222:** plugin translations (`webapp/translations/*.conf` in a plugin)
- **W-108:** auth-mfa plugin — composes with LDAP login through `onAuthGetSteps`
- **W-107:** data-driven user profile cards
- **W-105 / W-109:** auth hooks and multi-step login

---

## Decisions

Decisions taken during the brainstorm (2026-10-06), recorded here so the reasoning travels with the design.

| Topic | Decision | Why |
|---|---|---|
| Login path | Same username/password form, `onAuthBeforeLogin` hook | LDAP never leaves the form; `completeExternalAuth()` and login buttons are for redirect flows |
| Client library | `ldapts` 9.x (MIT, pure JavaScript) | `ldapjs` archived 2024-05; `ldapts` imports only `node:net`, `node:tls`, `node:crypto`, `node:util` |
| Shipping the library | Vendored into the plugin, no runtime npm dependency | Air-gapped sites install the tarball with no registry |
| Link key | Directory stable ID — AD `objectGUID` (16-byte binary), OpenLDAP `entryUUID` (string); DN kept as a hint | DN changes when IT moves a user between OUs; username can change on a name change. AD has no `entryUUID` |
| Linking strategies | `link-existing` (default) and `jit-create` | There is no admin "link" UI in v1, so pre-provisioning means creating the jPulse user with the normalized directory username (§5) |
| Username linking | `linkByUsername`: `when-signup-disabled` (default), `always`, `never` | Admin choice; the default avoids squatting on sites with open signup |
| jPulse username | Normalized login attribute (AD: `sAMAccountName`), never renamed afterwards | Users keep signing in with what they type in Windows; §5 lists where the two can differ |
| Default preset | `active-directory` | Most company deployments |
| `ACCOUNT_NOT_PROVISIONED` message | Helpful ("contact the site administrator") | Deployments are mostly controlled environments; only reachable with the right directory password |
| JIT | Offered, off by default | Directory membership is a real gate, unlike a public OAuth IdP; still admits everyone the filter matches |
| JIT email | `emailVerified: true` | The organization's directory vouches for the address (same as auth-oauth JIT) |
| Admin accounts | Never auto-linked unless `linkAdminAccounts` is on; never JIT-created as admin | Local admins stay the break-glass path when the directory is down |
| Local password of a linked user | Replaced by a random hash, `hasLocalPassword: false`, `passwordManagedBy: 'auth-ldap'` | Directory offboarding must not leave a working local password |
| Offboarding | Linked user not found / disabled in the directory → denied, no fallback to local auth | IT disabling the AD account is how a company removes access |
| Directory down | Linked users denied with "directory unavailable"; unlinked local users unaffected | Fail closed for directory users, keep break-glass |
| Groups | Not in v1 | Auth first; groups need their own design |
| Tests | Mocked `ldapts` unit tests; env-gated integration test; manual against public and local servers | No directory available to the maintainer; no third-party host in CI |

---

## Technical Design

### 1. Plugin Structure

Mirrors auth-oauth:

```
plugins/auth-ldap/
├── plugin.json
├── package.json                      # no runtime dependencies (ldapts is vendored)
├── README.md
├── bin/
│   └── copy-vendor-ldapts.js         # refresh webapp/vendor/ldapts from a pinned npm version
├── docs/
│   └── README.md                     # admin guide: presets, TLS, site modes, troubleshooting
└── webapp/
    ├── bump-version.conf
    ├── controller/
    │   └── ldapAuth.js               # hooks, admin test + roles API
    ├── model/
    │   └── ldapAuth.js               # user.ldap schema extension (W-107 cards), link helpers
    ├── utils/
    │   ├── directoryPresets.js       # openldap / active-directory / custom defaults
    │   ├── ldapClient.js             # thin wrapper over ldapts: connect, search, bind, error classes
    │   ├── loginDecision.js          # the outcome table in §4, pure function, fully unit-tested
    │   └── userResolver.js           # match, link, JIT create, profile sync
    ├── vendor/
    │   └── ldapts/
    │       ├── index.mjs             # copied from ldapts dist, pinned version
    │       ├── LICENSE               # MIT, kept with the code
    │       └── VERSION               # e.g. 9.0.0 + tarball sha
    ├── translations/
    │   ├── en.conf
    │   └── de.conf
    ├── view/
    │   └── jpulse-common.js          # admin "Test connection" button callback, role options loader
    └── tests/
        ├── unit/
        │   ├── utils/directory-presets.test.js
        │   ├── utils/ldap-client.test.js
        │   ├── utils/login-decision.test.js
        │   ├── utils/user-resolver.test.js
        │   └── controller/ldap-auth.test.js
        └── integration/
            └── ldap-server.test.js   # skipped unless LDAP_TEST_URL is set
```

`plugin.json` (identity part; config schema in §8):

```json
{
    "name": "auth-ldap",
    "npmPackage": "@jpulse-net/plugin-auth-ldap",
    "version": "1.0.0",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\" /><circle cx=\"12\" cy=\"12\" r=\"3\" /><path d=\"M16 19a4 4 0 0 0-8 0\" /></svg>",
    "summary": "LDAP and Active Directory login (OpenLDAP, Microsoft AD)",
    "description": "<p>Lets users sign in with their LDAP or Active Directory username and password on the normal jPulse login form.</p><ul><li><strong>OpenLDAP and Active Directory presets:</strong> search filter and attribute mapping filled in</li><li><strong>Secure by default:</strong> LDAPS or StartTLS with certificate verification</li><li><strong>Directory is the authority:</strong> users disabled or removed in the directory can no longer sign in</li><li><strong>Composes with MFA:</strong> auth-mfa's TOTP step runs after the directory login</li></ul>",
    "author": "jPulse Team <team@jpulse.net>",
    "jpulseVersion": ">=2.0.11",
    "autoEnable": false,
    "dependencies": {
        "npm": {},
        "plugins": {}
    }
}
```

The same SVG is the W-107 card icon in `webapp/model/ldapAuth.js` (auth-oauth keeps a copy the same way).

### 2. How LDAP Login Fits the Framework

```
Browser                         jPulse                                  Directory
   │ POST /api/1/auth/login        │                                        │
   │ { step: credentials,          │                                        │
   │   identifier, password } ───▶ │ login(): IP rate limit, disableLogin   │
   │                               │ onAuthBeforeLogin ─▶ auth-ldap         │
   │                               │   1. local lookup by identifier        │
   │                               │   2. per-username throttle             │
   │                               │   3. connect (TLS), service bind ─────▶│
   │                               │   4. search filter, sizeLimit 2 ──────▶│
   │                               │   5. bind as found DN + password ─────▶│
   │                               │   6. resolve / link / JIT jPulse user  │
   │                               │   → user + skipPasswordCheck           │
   │                               │     or deny (W-261)                    │
   │                               │     or step aside (internal auth)      │
   │                               │ status gate (W-201)                    │
   │                               │ onAuthGetSteps (MFA, email verify)     │
   │ ◀─── JSON (nextStep | done)   │ session, onAuthAfterLogin              │
```

The plugin returns one of three results from `onAuthBeforeLogin`:

- **user** — `skipPasswordCheck: true`, `user`, `authMethod: 'ldap'`. The framework runs the
  status gate, multi-step login, and session creation exactly as for a local login.
- **deny** — `context.deny = { code, status, messageKey }` (W-261). The framework fires
  `onAuthFailure` with `code` as the reason and returns the error. Internal auth does not run.
- **step aside** — the context is returned unchanged. Internal auth runs as if the plugin were not
  installed. Used only for jPulse accounts that are not linked to the directory.

`localAuthRestriction` applies only to `authMethod: 'internal'`, so directory users can sign in on a
site set to `'admins-only'` or `'disabled'`. W-261 keeps the password form visible on such a site
when a credentials-type provider (this plugin) is registered.

### 3. Directory Presets

Admins pick a preset; every attribute field left blank uses the preset default.

| Setting | OpenLDAP | Active Directory |
|---|---|---|
| Search filter | `(\|(uid={{username}})(mail={{username}}))` | `(&(objectCategory=person)(objectClass=user)(\|(sAMAccountName={{username}})(userPrincipalName={{username}})(mail={{username}})))` |
| Login attribute (jPulse username for JIT) | `uid` | `sAMAccountName` |
| Stable ID attribute | `entryUUID` (string) | `objectGUID` (16-byte binary; AD has no `entryUUID`) |
| ID format | `string` | `guid` |
| Email | `mail` | `mail` |
| First name | `givenName` | `givenName` |
| Last name | `sn` | `sn` |
| Display name (name fallback) | `cn` | `displayName` |
| Disabled-account check | none | `userAccountControl` bit `0x2` (ACCOUNTDISABLE) |
| Identifier normalization | trim | trim; strip a `DOMAIN\` prefix |
| Typical URL | `ldaps://ldap.example.com:636` | `ldaps://dc1.corp.example.com:636` (Global Catalog: `3269`) |

`custom` starts with the OpenLDAP values and expects the admin to fill in every field.

**Filter substitution.** `{{username}}` in the configured filter is replaced by the normalized
identifier, escaped with RFC 4515 escaping (ldapts `Filter.escape`, the routine its `escapeFilter`
tag uses). The filter template comes from admin config and is validated once at save time
(balanced parentheses, contains `{{username}}`); user input is never concatenated unescaped.

**Stable ID format.** AD has no `entryUUID`; its stable ID is `objectGUID`, a 16-byte binary value
(not a number, not a string). OpenLDAP has `entryUUID`, a string.

- `objectGUID` is requested with `explicitBufferAttributes: ['objectGUID']` and stored as the
  canonical GUID string (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`, first three groups byte-swapped
  from little-endian). That is the same text `Get-ADUser jsmith | Select ObjectGUID` shows, so an
  admin can compare `ldap.id` with the directory by eye.
- A binary attribute must never be read as text: invalid UTF-8 bytes decode to U+FFFD, so two
  different GUIDs can produce the same string and link the wrong person.
- `idAttributeFormat` (§8) states the format: `auto` (default: `objectGUID` → `guid`, anything
  else → `string`), `string`, `guid` (16-byte binary in GUID form), `hex` (any other binary as
  lowercase hex, e.g. eDirectory `GUID`). Non-`string` formats are always requested as buffers.
- An entry without the ID attribute cannot be linked: deny `ACCOUNT_NOT_PROVISIONED` with an error
  log naming the attribute.

**Admission control without groups.** The filter is the gate for who may sign in. On AD it can
require one group:
`(&(sAMAccountName={{username}})(memberOf=CN=jpulse-users,OU=Groups,DC=corp,DC=example,DC=com))`.
Nested groups need `memberOf:1.2.840.113556.1.4.1941:=` (LDAP_MATCHING_RULE_IN_CHAIN). OpenLDAP
supports `memberOf` only when the server has the `memberOf` overlay. The docs show both examples.

### 4. Login Sequence and Outcomes

`loginDecision.js` is a pure function over the facts gathered below, so every row is a unit test.

**Facts gathered, in order:**

1. `identifier` normalized per preset. An empty password is rejected before any directory call
   (an LDAP simple bind with a DN and an empty password is an anonymous bind and "succeeds" on many
   servers, RFC 4513 §5.1.2). The framework already rejects a missing password; the plugin checks
   again because the hook must never depend on the caller.
2. `local` — jPulse user found by username, then email (`UserModel.find`, which strips
   `passwordHash`). Classified as:
   - *linked*: `local.ldap.id` set (or `passwordManagedBy === 'auth-ldap'`)
   - *unlinked*: exists, not linked
   - *none*
3. Throttle state for the normalized identifier (§10).
4. Directory: connect, service bind, search (`sizeLimit: 2`), AD disabled bit, user bind.

**Outcome table** (first matching row wins):

| # | Situation | Result |
|---|---|---|
| 1 | `local` is *unlinked* and has an admin role, `linkAdminAccounts` off | step aside — directory not contacted |
| 2 | Throttle exceeded for this identifier | deny `RATE_LIMITED` (429, `retryAfter`) — directory not contacted |
| 3 | Connect / TLS / service bind / timeout error | *unlinked*: step aside. *linked* or *none*: deny `AUTH_PROVIDER_UNAVAILABLE` (503) |
| 4 | Search returns no entry | *linked*: deny `INVALID_CREDENTIALS` (offboarded, logged as such). *unlinked* / *none*: step aside |
| 5 | Search returns more than one entry | *unlinked*: step aside. Else deny `INVALID_CREDENTIALS`, error log "filter matched more than one entry" |
| 6 | AD entry disabled (`userAccountControl & 0x2`) | *unlinked*: step aside. Else deny `INVALID_CREDENTIALS`, log "disabled in directory" |
| 7 | User bind fails (invalid credentials) | count a failure. *unlinked*: step aside (the person may be typing their local password). Else deny `INVALID_CREDENTIALS` (or `DIRECTORY_PASSWORD_EXPIRED`, see §11) |
| 8 | Bind OK; a jPulse user has `ldap.id` equal to the entry's stable ID | that user (authoritative, even if `local` pointed at another account) |
| 9 | Bind OK; `local` is *linked* but its `ldap.id` differs from the entry's | deny `INVALID_CREDENTIALS`, security log "directory identity changed" (account deleted and re-created in the directory; an admin must decide) |
| 10 | Bind OK; no ID match | resolve per strategy (§5); on failure deny `ACCOUNT_NOT_PROVISIONED` (403) |
| 11 | Resolved | reset throttle, sync profile (§7), update `ldap.dn`/`ldap.lastLoginAt`, return user with `authMethod: 'ldap'` |

Rules that follow from the table:

- An *unlinked* local account is never blocked by the directory. It becomes *linked* only after a
  successful directory bind (row 10).
- A *linked* account never falls back to local auth. Its local password is unusable anyway (§6),
  and W-261 makes `UserModel.authenticate()` refuse it as well.
- Every error is caught inside the hook. `onAuthBeforeLogin` runs with `onError: 'continue'`, so a
  thrown error would silently fall through to internal auth; the plugin converts unexpected errors
  to row 3 behavior and logs them.

Hook skeleton:

```javascript
static hooks = {
    onAuthBeforeLogin: { priority: 50 },
    onAuthGetLoginProviders: { priority: 100 },
    onPluginConfigBeforeSave: { priority: 100 }
};

static async onAuthBeforeLogin(context) {
    const { req, identifier, password } = context;
    const config = await LdapAuthController._getConfig();
    if (!config.ready) {
        return context; // not configured yet: plugin is inert
    }
    try {
        const facts = await LdapAuthController._gatherFacts(req, config, identifier, password);
        const decision = decideLogin(facts, config);
        if (decision.result === 'user') {
            context.skipPasswordCheck = true;
            context.user = decision.user;
            context.authMethod = 'ldap';
        } else if (decision.result === 'deny') {
            context.deny = decision.deny;
        }
        LdapAuthController._logDecision(req, identifier, decision);
    } catch (error) {
        global.LogController.logError(req, 'ldapAuth.onAuthBeforeLogin', `error: ${error.message}`);
        context.deny = DENY.unavailable;
    }
    return context;
}
```

The `catch` branch denies only when the plugin was going to own the login. The real implementation
computes `local` before anything that can throw, and steps aside for an *unlinked* account.

### 5. Account Resolution (row 10)

Order:

1. **Username** — `normalizeUsername(login attribute)` (below) equals a jPulse username. Controlled
   by `linkByUsername`:
   - `when-signup-disabled` (default) — only while `controller.user.disableSignup` is `true`. With
     open signup, anyone could have registered that username first (squatting, the same class as
     the W-198 email pre-linking issue)
   - `always` — also with open signup. For sites where every existing jPulse username is known to
     belong to the same person in the directory (accounts created by admins before signup was
     opened). Saving this while signup is open logs a warning
   - `never` — only the stable ID and verified email link accounts
2. **Email** — the directory `mail` (trim, lowercase) matches exactly one jPulse user whose
   `emailVerified` is not `false`. Two matches → ambiguous.
3. If username and email point at different accounts → ambiguous.
4. Accounts with an admin role (`ConfigModel.getEffectiveAdminRoles()`) are skipped by 1 and 2
   unless `linkAdminAccounts` is on.
5. Accounts already linked to a different directory ID are never relinked.
6. No match: `jit-create` creates the user; `link-existing` fails with `ACCOUNT_NOT_PROVISIONED`.

**Linking an existing account** (match by 1 or 2):

- set the `ldap` block (§6), `passwordManagedBy: 'auth-ldap'`
- replace the password with a random 32-byte value, `hasLocalPassword: false`
- `UserModel.invalidatePasswordReset(userId)` — kills a reset link already in flight
- info log `success: linked <username> to directory entry <dn>`

**JIT creation** — the auth-oauth recipe (W-197 §7, §10), with directory attributes:

| Field | Value |
|---|---|
| `username` | `normalizeUsername(login attribute)`; `-2` … `-6` suffix on collision (warning logged) |
| `email` | `mail`, required — missing → `ACCOUNT_NOT_PROVISIONED` with an error log naming the attribute |
| `emailVerified` | `true` (`emailVerifiedAt` left `null`, same as auth-oauth) |
| `password` | random 32 bytes (hashed by `UserModel.create`), nobody knows it |
| `hasLocalPassword` | `false` |
| `passwordManagedBy` | `'auth-ldap'` |
| `profile.firstName` / `lastName` | `givenName` / `sn`; else split the display name; else the username — never empty |
| `roles` | `jitDefaultRoles`, admin-equivalent roles stripped (same `sanitizeJitRoles` as auth-oauth) |
| `status` | `jitDefaultStatus` (`active` or `pending`) |
| `ldap` | block from §6, `createdVia: 'jit'` |

A duplicate-email race (two first logins at once) retries as a lookup, as auth-oauth does.

**jPulse username vs. the name users type.** AD users sign in with `sAMAccountName` (`JSmith`),
their UPN (`jsmith@corp.example.com`), `CORP\JSmith`, or their email when it differs from the UPN
(`john.smith@example.com`). All of them find the same entry: the AD filter matches
`sAMAccountName`, `userPrincipalName`, or `mail`, and the `DOMAIN\` prefix is stripped. The jPulse
username is derived from `sAMAccountName` (OpenLDAP: `uid`) once, at link or JIT time, never from
what the user typed:

`normalizeUsername(value)`: Unicode NFKD, drop combining marks, lowercase, replace each run of
characters outside `[a-z0-9_.-]` with one `-`, trim leading and trailing `-`. jPulse usernames
are `^[a-z0-9_.-]+$`, lowercase.

| `sAMAccountName` | jPulse username |
|---|---|
| `JSmith` | `jsmith` |
| `j.smith` | `j.smith` |
| `José.García` | `jose.garcia` |
| `John Smith` | `john-smith` |
| `o'brien` | `o-brien` |

Where the two can differ, and how the design handles it:

1. **Case** (`JSmith` / `jsmith`) — no confusion at login: AD compares case-insensitively and jPulse
   usernames are lowercase. The user sees `jsmith` in jPulse.
2. **Changed characters** (spaces, apostrophes, accents) — the user types `John Smith` and signs in
   normally, because login goes through the directory and the stable ID. The username shown in
   jPulse is `john-smith`. An admin pre-creating the account must use the normalized form: Test
   connection (§12) shows it ("jPulse username: john-smith"), and username matching normalizes the
   directory value before comparing.
3. **Collision suffix** — when the normalized name is already taken by an account that cannot be
   linked (an admin account with `linkAdminAccounts` off, an account linked to another directory
   ID, or username linking off), JIT creates `jsmith-2`. Login still works with `jsmith` (the stable
   ID wins, §4 row 8); only the displayed username differs. Logged as a warning at creation.
4. **Local admin with the same name** — §4 row 1: an unlinked local admin `jsmith` (or with that
   email) takes the login before the directory is asked, so the directory user `jsmith` cannot sign
   in with that name. The admin guide says to give break-glass admins names and emails that are not
   directory identities (`admin`, `breakglass`). Test connection warns when the test username hits
   an unlinked local admin.
5. **Rename in the directory** — the user signs in with the new name (stable ID). The jPulse
   username is not renamed, because other records refer to it (`updatedBy`, logs). The `ldap`
   card shows the current directory name.
6. **Several domains in one forest** — v1 searches one base. A Global Catalog search can return
   `CORP\jsmith` and `EMEA\jsmith` as two entries (§4 row 5, denied as ambiguous); the stripped
   `DOMAIN\` prefix is not used to choose. Users in such forests sign in with their UPN, or the
   site uses one search base per domain once several directories are supported (TD-03).

### 6. User Data

**Schema extension** (`UserModel.extendSchema`, W-107):

```javascript
ldap: {
    _meta: {
        plugin: 'auth-ldap',
        adminCard: { visible: true, label: 'Directory Account', icon: AUTH_LDAP_ICON, order: 91 },
        userCard:  { visible: true, label: 'Company Directory', icon: AUTH_LDAP_ICON, order: 21 }
    },
    id:          { type: 'string' },   // objectGUID as GUID string, or entryUUID - the link key
    dn:          { type: 'string' },   // last seen DN (hint, refreshed every login)
    username:    { type: 'string' },   // directory login attribute as stored (e.g. JSmith), refreshed every login
    createdVia:  { type: 'string' },   // 'jit' | 'link'
    linkedAt:    { type: 'date' },
    lastLoginAt: { type: 'date' }
}
```

All fields are read-only on both cards. The user card says the password is managed by the
organization's directory.

**Invariant for every linked user:** `ldap.id` set, `passwordManagedBy: 'auth-ldap'`,
`hasLocalPassword: false`, random `passwordHash`. W-261 makes the framework enforce the rest:
no local login, no self-service or admin password change, no reset link.

### 7. Profile Sync on Login

With `syncProfileOnLogin` on (default), each successful directory login updates
`profile.firstName`, `profile.lastName`, and `email` when the directory value is non-empty and
differs. An email that belongs to another jPulse user is not applied; a warning is logged and the
old email stays. A changed email is written with `emailVerified: true`.

Users can still edit these fields in jPulse; the next login overwrites them. Making them read-only
in the settings page is technical debt (TD-07).

### 8. Configuration

Config page: `/admin/plugin-config.shtml?plugin=auth-ldap`. Flat fields only (no custom renderer).

**Directory tab**

| Field | Type | Default | Notes |
|---|---|---|---|
| (help) | help | | What the plugin does, link to docs |
| `preset` | select | `active-directory` | `openldap`, `active-directory`, `custom` |
| `urls` | text | | One or more URLs, comma-separated, tried in order on connection errors |
| `startTls` | boolean | `false` | Upgrade `ldap://` with StartTLS |
| `allowInsecure` | boolean | `false` | Allow `ldap://` without StartTLS (passwords cross the network in clear text). Dev/test only |
| `verifyCertificate` | boolean | `true` | Off only for testing with self-signed certs |
| `caCertificate` | textarea | | PEM; blank uses the system CA store |
| `bindDn` | text | | Service account DN; blank means anonymous search |
| `bindPassword` | password | | Encrypted at rest (§9) |
| `connectTimeoutMs` | number | `5000` | |
| `timeoutMs` | number | `5000` | Per operation |
| `testConnection` | button | | Callback `jPulse.plugins.authLdap.testConnection` (§12) |

**Users tab**

| Field | Type | Default | Notes |
|---|---|---|---|
| `searchBase` | text | | Required, e.g. `DC=corp,DC=example,DC=com` |
| `searchFilter` | text | preset | Must contain `{{username}}` |
| `loginAttribute`, `idAttribute`, `emailAttribute`, `firstNameAttribute`, `lastNameAttribute`, `displayNameAttribute` | text | preset | Blank = preset default; help text lists both presets' values |
| `idAttributeFormat` | select | `auto` | `auto`, `string`, `guid`, `hex` (§3 Stable ID format) |
| `loginLabel` | text | `Company account` | Shown under the password form on the login page |

**Accounts tab**

| Field | Type | Default | Notes |
|---|---|---|---|
| `linkingStrategy` | select | `link-existing` | `link-existing`, `jit-create` |
| `linkByUsername` | select | `when-signup-disabled` | `when-signup-disabled`, `always`, `never` (§5); `always` with open signup logs a warning on save |
| `jitDefaultRoles` | multiselect | `['user']` | `loadOptions: authLdap.loadRoleOptions`; admin roles never offered, and stripped server-side |
| `jitDefaultStatus` | select | `active` | `active`, `pending` |
| `syncProfileOnLogin` | boolean | `true` | §7 |
| `linkAdminAccounts` | boolean | `false` | Allow linking jPulse accounts that have an admin role |

**Security tab**

| Field | Type | Default | Notes |
|---|---|---|---|
| `maxFailedAttempts` | number | `5` | Per username, §10 |
| `failureWindowMinutes` | number | `15` | |
| (help) | help | | Break-glass: `localAuthRestriction: 'admins-only'`, `?localFallback=1`, keep one local admin |

**Save-time validation** (`onPluginConfigBeforeSave`, throw to abort with a readable message):
each URL parses and is `ldap://` or `ldaps://`; `ldap://` without `startTls` requires
`allowInsecure`; filter contains `{{username}}` and has balanced parentheses; `searchBase` set;
timeouts within 1000–60000 ms. The plugin is inert (`config.ready === false`) until `urls` and
`searchBase` are set, so enabling it before configuring changes nothing.

### 9. Connection, TLS, Secrets

- A new `Client` per login attempt; `unbind()` in `finally`. No shared authenticated connection,
  `autoRebind` off (it keeps credentials in memory). Pooling is TD-09.
- `ldaps://`: `tlsOptions = { minVersion: 'TLSv1.2', rejectUnauthorized: verifyCertificate, ca }`.
  `ldap://` + `startTls`: same options passed to `client.startTLS()` before any bind.
- Service bind and user bind each happen on their own client, so a failed user bind can never leave
  a connection authenticated as the service account in an unexpected state.
- Search: `scope: 'sub'`, `sizeLimit: 2`, explicit attribute list, `objectGUID` as buffer.
  Search references (AD referrals) are ignored, not chased.
- Failover: connection-class errors (connect refused, timeout, TLS handshake) move to the next URL.
  Credential errors do not.
- **Bind password at rest.** `type: "password"` gives masking in the config API. On save,
  `onPluginConfigBeforeSave` encrypts a new value with `encryptSecret(value, 'auth-ldap-bind')`
  (`webapp/utils/crypto-secrets.js`) and stores `enc:v1:<payload>`. An unchanged field arrives as
  the old stored value (the framework resolves the mask first), which already has the prefix and is
  left alone. Reads use `PluginModel.getSecret()` then `decryptSecret()`. The framework's audited
  "reveal" shows the encrypted form; the help text says so.

### 10. Brute Force and AD Lockout

The framework limits login attempts per IP (W-204). That does not protect directory accounts: an
attacker can lock real AD accounts by failing binds through jPulse from many IPs, because AD's
lockout policy counts every failed bind.

The plugin keeps a per-identifier counter with
`RedisManager.cacheCheckRateLimit('controller:auth-ldap:fail', normalizedIdentifier, { limit, windowSeconds })`.
The component is `controller` because `cacheDel` only accepts `controller`, `model`, `view`, or `util`,
and the success path has to delete the same key. The check reads the counter with `cacheGet` on
`controller:auth-ldap:rateLimit:fail` (the key `cacheCheckRateLimit` actually writes) so a successful
login is not counted as a failure. It is checked before contacting the directory (row 2), incremented
on a failed user bind (row 7), and reset on success. Set `maxFailedAttempts` below the AD lockout threshold so jPulse stops first.
Without Redis the counter fails open, like the framework limiter.

This also leaks nothing: the counter key is the typed identifier, whether or not it exists.

### 11. Errors and Logging

User-facing messages are generic; the log has the detail.

| Deny code | Status | Message (plugin translation) |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | framework `controller.auth.invalidCredentials` |
| `AUTH_PROVIDER_UNAVAILABLE` | 503 | "The company directory cannot be reached. Try again later." |
| `ACCOUNT_NOT_PROVISIONED` | 403 | "Your directory account is not set up for this site. Contact the site administrator." |
| `DIRECTORY_PASSWORD_EXPIRED` | 403 | "Your directory password has expired or must be changed. Change it, then sign in again." |
| `RATE_LIMITED` | 429 | framework `controller.auth.rateLimited` |

`ACCOUNT_NOT_PROVISIONED` and `DIRECTORY_PASSWORD_EXPIRED` are only returned after a successful
bind (or an AD sub-code that requires the right password), so they reveal nothing to someone without
the password.

**AD bind sub-codes.** AD puts a sub-code in the bind error's diagnostic message (`data 52e`, …).
The plugin parses it for the log:

| Sub-code | Meaning | User sees |
|---|---|---|
| `525` | user not found | invalid credentials |
| `52e` | wrong password | invalid credentials |
| `530` / `531` | logon time / workstation restriction | invalid credentials |
| `532` | password expired | password expired |
| `533` | account disabled | invalid credentials |
| `701` | account expired | invalid credentials |
| `773` | must reset password | password expired |
| `775` | account locked | invalid credentials |

Microsoft documents `532` and `773` as returned only for a correct password; confirm during AD
testing before relying on it. If not confirmed, map them to invalid credentials too.

**Log lines** (`[controller].[method]` convention): `ldapAuth.onAuthBeforeLogin` with the row
number, normalized identifier, DN when known, URL used, and elapsed ms. Never the password, never
the bind password.

### 12. Admin Test Connection

`POST /api/1/auth-ldap/admin/test` (admin), body `{ username?, password? }`. Uses the saved config
(the button is disabled until the config has been saved, as in auth-oauth). Returns steps, each
`{ step, ok, ms, detail }`:

1. connect — URL used, TLS mode, certificate subject/issuer, or the error
2. service bind — bind DN, or anonymous
3. search — filter as sent, entry count, DN, mapped values (login, ID with its format, email, names,
   disabled flag), and the jPulse username `normalizeUsername()` derives from the login attribute
   ("jPulse username: john-smith"), so an admin pre-creating accounts types the right name
4. user bind — only when a password is given; result and AD sub-code
5. resolution preview — which jPulse user this login would map to and by which rule (stable ID,
   username, email), or what JIT would create (including a `-2` suffix). Warns when the identifier
   hits an unlinked local admin (§4 row 1: the local account takes the login, the directory user
   cannot sign in with that name) and when username linking is skipped because of
   `linkByUsername`

The test never creates or links users and never returns a password. It is logged with
`LogController.logRequest`/`logInfo`.

UI: the button callback opens a `jPulse.UI` dialog with optional username/password fields, then
renders the steps as a list with ✓/✗ per step.

### 13. Login Page

`onAuthGetLoginProviders` returns `{ id: 'auth-ldap', type: 'credentials', label: config.loginLabel }`
(W-261). The framework does not render it as a button. It keeps the password form visible on
restricted sites and shows the label under the form ("Sign in with your Company account").
Registering this hook also satisfies the bootstrap check that downgrades
`localAuthRestriction: 'disabled'` when no external auth plugin is present.

### 14. Site Modes

| Site mode | `controller.user.disableSignup` | `localAuthRestriction` | `linkingStrategy` | Notes |
|---|---|---|---|---|
| Company directory only | `true` | `'admins-only'` | `jit-create` | One or two local admins for break-glass; AD group in the filter |
| Directory, admins pre-create accounts | `true` | `'admins-only'` | `link-existing` | Admin creates a jPulse user with the directory username; first login links it |
| Migration from local accounts | `true` | `'none'` → later `'admins-only'` | `link-existing` | Users sign in with the directory password; accounts link by username; turn on the restriction once linked |
| Public site, staff from directory | `false` | `'none'` | `link-existing` | Username linking is off with open signup; staff link by verified email |

`controller.user.disablePasswordReset` can hide "Forgot password?" on directory-only sites; LDAP
users who ask for a reset get the existing "you sign in with your provider" mail either way.

---

## F. Framework Prerequisites (W-261)

Gaps found in the framework code while designing this plugin:

1. **`onAuthBeforeLogin` cannot reject a login.** `auth.js` `login()` only checks
   `skipPasswordCheck && user`; anything else runs `UserModel.authenticate()`. A thrown error is
   logged and skipped (`onError: 'continue'`). So a plugin cannot stop a wrong directory password
   from being tried as a local password, cannot report "directory unavailable", and cannot deny an
   offboarded user who still has a local password.
2. **Nothing marks a password as directory-managed.** `UserController.changePassword()` fires no
   hook and, for `hasLocalPassword: false`, sets a password without the current one. The admin
   update path sets a password and flips `hasLocalPassword` back to `true`. `UserModel.authenticate()`
   never reads `hasLocalPassword`. Any of these gives an LDAP user a local password that survives
   directory offboarding.
3. **The login page hides the password form on restricted sites.** `login.shtml` shows the form
   only when `localAuthRestriction` is `'none'` or `?localFallback=1` is set. An LDAP-only site with
   `'admins-only'` would have no form for directory users.
4. **Password reset is already covered.** `_classifyPasswordReset()` refuses `hasLocalPassword: false`
   (W-206), and the plugin invalidates in-flight reset links when it links an account.

W-261 changes:

**(a) Deny outcome on `onAuthBeforeLogin`.**

```javascript
// set by a handler; checked by login() right after the hook
context.deny = {
    code: 'AUTH_PROVIDER_UNAVAILABLE',     // /^[A-Z][A-Z0-9_]*$/, becomes the error code and onAuthFailure reason
    status: 503,                           // optional, default 401
    messageKey: 'plugin.authLdap.error.unavailable', // optional i18n key, default controller.auth.invalidCredentials
    retryAfter: 60                         // optional seconds, passed through like RATE_LIMITED
};
```

`login()`: if `deny` is set, fire `onAuthFailure({ req, identifier, reason: code, authMethod })`,
`logError`, and respond with `sendError(req, res, status, translate(messageKey), code, extra)`.
Internal auth does not run. `deny` wins over `skipPasswordCheck`. Hook definition gains `deny` in
`contextKeys`. The `onError: 'continue'` policy stays; the docs tell auth plugins to catch and deny.

**(b) `passwordManagedBy` user field.** `baseSchema`:
`passwordManagedBy: { type: 'string', default: '' }` — empty for local passwords, otherwise the
plugin name that owns the password. Written only by server code (not accepted from the user or
admin update APIs). When set:

- `UserModel.authenticate()` returns `null`
- `changePassword()` responds 409 `PASSWORD_MANAGED_EXTERNALLY`
- admin update with a `password` responds 409 `PASSWORD_MANAGED_EXTERNALLY`
- `_classifyPasswordReset()` returns `ssoNotice` with reason `passwordManagedExternally`; the
  token-confirm path refuses with 409 `PASSWORD_MANAGED_EXTERNALLY` and consumes the link, so a
  valid token is required before that answer and the link cannot be reused later
- settings Security panel and admin user Security panel replace the password form with a note
  ("Your password is managed by your organization's directory"), and the admin "send reset link"
  button is disabled with that reason

Clearing it (convert to local) is TD-05; until then the break-glass runbook in `docs/deployment.md`
gains a database recipe.

**(c) Credentials-type login providers.** `onAuthGetLoginProviders` entries may set
`type: 'credentials'` (default `'redirect'`). `handlebar.js` splits them: `authProviders` keeps
redirect entries only (unchanged for auth-oauth), new `authCredentialProviders` holds the rest.
`login.shtml`: `showLocalForm` is also true when `authCredentialProviders` is non-empty; each label
renders HTML-escaped under the form; the "restricted" notice is not shown in that case. Server-side
enforcement is unchanged: a local non-admin on an `'admins-only'` site still gets
`LOCAL_AUTH_RESTRICTED`.

**(d) Docs:** `docs/hooks.md` (deny contract, credentials providers, "password login plugins"
section next to "External Login Providers"), `docs/security-and-auth.md` (`passwordManagedBy`,
new error code), `docs/api-reference.md` (error codes), `docs/deployment.md` (break-glass recipe).

---

## Security Requirements

| Area | Requirement |
|---|---|
| Transport | `ldaps://` or StartTLS required unless `allowInsecure`; TLS 1.2 minimum; certificate verified unless explicitly turned off |
| Empty password | Rejected before any bind (anonymous-bind bypass) |
| Filter injection | `{{username}}` value escaped per RFC 4515; template validated at save |
| DN source | User bind uses the DN from the search result, never a DN built from input |
| Secrets | Bind password encrypted at rest; never logged; never returned by any API |
| Messages | Generic to the user; detail only in the log; no directory error text in responses |
| Offboarding | Linked user missing or disabled in the directory → denied; no local fallback |
| Identity change | Linked user whose directory ID changed → denied and logged |
| Local passwords | Linked users have no usable local password (random hash + W-261 enforcement) |
| Admin accounts | Not auto-linked unless `linkAdminAccounts`; JIT never assigns admin-equivalent roles |
| Squatting | Username linking only with signup disabled; email linking only to verified local emails |
| Brute force | Per-identifier throttle below the AD lockout threshold, plus the framework IP limit |
| Timeouts | Connect and operation timeouts so a dead directory cannot hang logins |
| Hook errors | All errors caught in the hook; never fall through to local auth for a directory-owned login |
| Status & MFA | Framework status gate and `onAuthGetSteps` apply unchanged to LDAP logins |

---

## npm Dependency and Air-Gapped Install

`ldapts` 9.0.0 (checked 2026-10-06): MIT, `dist/index.mjs` and `dist/index.cjs` (~120 KB each),
imports only Node built-ins, no `.node` addon. Its one declared dependency,
`strict-event-emitter-types`, is TypeScript types and is not referenced by the bundle. Requires
Node `>=22` (framework is on Node 24).

**Vendored, not declared.** `webapp/vendor/ldapts/index.mjs` + `LICENSE` + `VERSION`.
`package.json` has no `dependencies`, so `jpulse plugin install ./plugin-auth-ldap-1.0.0.tgz`
needs no registry for the library. `bin/copy-vendor-ldapts.js` refreshes the copy from a pinned
version (download, verify the npm `dist.integrity`, copy, write `VERSION`); a security fix in
`ldapts` means a plugin patch release.

To verify in Phase 6: `installPluginRuntimeDependencies()` still runs `npm install --omit=dev`
inside the plugin because a `package.json` exists. With no dependencies this should not need the
network; confirm in a container with networking disabled. If npm still reaches out (for example
for audit), add `--no-audit --offline` handling to the CLI or document `npm config set audit false`.

---

## i18n

Plugin translations (`webapp/translations/en.conf`, `de.conf`, W-222), under `plugin.authLdap`:
deny messages (§11), login label default, card labels and the "managed by directory" card note,
config help texts, test-connection step labels and results. The framework strings for W-261 live in
the framework translation files.

---

## Testing

### Test directories

| Directory | Use | Notes |
|---|---|---|
| `ldap.forumsys.com` | Manual OpenLDAP smoke test | Public, read-only. `ldap://…:389` works; LDAPS on 636 only with certificate verification off; StartTLS fails. Service DN `cn=read-only-admin,dc=example,dc=com`, all passwords `password`. Users: `einstein`, `newton`, `tesla`, `galileo`, `euler`, `gauss`, `riemann`, `euclid`. Entries have `entryUUID`, `cn`, `sn`, `mail`; `einstein` has no `givenName`. No `memberOf` overlay. Not for CI |
| `rroemhild/test-openldap` (Docker) | TLS, `memberOf` filter, integration test | LDAP 10389, LDAPS 10636, sample users, `memberOf` overlay |
| Samba AD DC container or Windows Server evaluation VM | Active Directory preset | No public AD exists; needed once before release for the AD rows |

### Unit tests (mocked `ldapts`)

- `login-decision.test.js` — every row of §4, for *linked*, *unlinked*, *none*
- `ldap-client.test.js` — URL failover, StartTLS order, timeouts mapped to unavailable, AD sub-code parsing, `objectGUID` formatting (known GUID ↔ bytes, bytes that are invalid UTF-8), `idAttributeFormat` `auto`/`string`/`guid`/`hex`, filter escaping (`*`, `(`, `)`, `\`, NUL)
- `user-resolver.test.js` — `linkByUsername` `when-signup-disabled` (signup on and off), `always`, `never`; verified-email link, ambiguous, admin skip, JIT field mapping, `normalizeUsername` (§5 examples, empty result), suffixing, email race, profile sync with email collision
- `directory-presets.test.js` — defaults, blank-field fallback, identifier normalization
- `ldap-auth.test.js` — hook wiring, deny shapes, inert when unconfigured, config save validation, bind password encryption round trip, test endpoint never returns secrets

### Integration test

`ldap-server.test.js` runs only when `LDAP_TEST_URL` (plus `LDAP_TEST_BIND_DN`, `LDAP_TEST_BIND_PASSWORD`,
`LDAP_TEST_BASE`, `LDAP_TEST_USER`, `LDAP_TEST_PASSWORD`) is set: connect, search, user bind, wrong
password, unknown user. Works against forumsys or the Docker image.

### Manual test matrix (forumsys, `link-existing` unless noted)

Config: preset `openldap`, URL `ldap://ldap.forumsys.com:389`, `allowInsecure` on, bind DN
`cn=read-only-admin,dc=example,dc=com` / `password`, base `dc=example,dc=com`.

| # | Scenario | Expected |
|---|---|---|
| 1 | Test connection without user | connect, service bind, search config OK |
| 2 | Test connection with `einstein` / `password` | all steps ✓, preview "no jPulse user" (or the match) |
| 3 | `jit-create`: log in as `newton` / `password` | user `newton` created, `emailVerified: true`, `hasLocalPassword: false`, `passwordManagedBy: 'auth-ldap'` |
| 4 | Log in as `newton` again | same user, `ldap.lastLoginAt` updated, no duplicate |
| 5 | `newton` / wrong password | invalid credentials; failure counted |
| 6 | 5 wrong passwords, then the right one | `RATE_LIMITED` until the window passes |
| 7 | Signup disabled; local user `einstein` exists; log in with directory password | linked; local password no longer works |
| 8 | Linked `newton`: Settings → Security | note instead of password form; API `PUT /api/1/user/password` → 409 |
| 9 | Admin sets password for `newton` | 409 `PASSWORD_MANAGED_EXTERNALLY` |
| 10 | Change filter to `(&(uid={{username}})(!(uid=newton)))`, log in as `newton` | denied (offboarding) |
| 11 | Unreachable URL (`ldap://127.0.0.1:1`), linked user | `AUTH_PROVIDER_UNAVAILABLE` within the timeout |
| 12 | Unreachable URL, local unlinked admin | logs in with local password |
| 13 | `localAuthRestriction: 'admins-only'` | password form visible with label; LDAP user logs in; local non-admin → `LOCAL_AUTH_RESTRICTED` |
| 14 | auth-mfa enabled for a linked user | MFA step after directory login |
| 15 | JIT status `pending` | `ACCOUNT_PENDING_APPROVAL` until an admin activates |
| 16 | Identifier `NEWTON` / ` newton ` | same user (normalization) |
| 17 | LDAPS `ldaps://ldap.forumsys.com:636`, verify on | TLS error reported by Test connection; with verify off it connects |
| 18 | Log in with `newton`'s `mail` value | same user as row 3 |
| 19 | Signup enabled, `linkByUsername` `when-signup-disabled`; local user `euler` exists | not linked by username: `ACCOUNT_NOT_PROVISIONED` (or linked by verified email if it matches) |
| 20 | Same as 19 with `linkByUsername` `always` | linked; save logged a warning |
| 21 | Local admin `gauss` exists, `linkAdminAccounts` off; Test connection as `gauss` | preview warns that the local admin takes the login |

AD rows (Samba AD or Windows VM): preset defaults, `DOMAIN\user`, UPN, and `mail` login, disabled
account, expired password sub-code, `objectGUID` link (`ldap.id` equals `Get-ADUser … ObjectGUID`),
a `sAMAccountName` with a space or accent (jPulse username normalized, Test connection shows it),
`memberOf` filter, Global Catalog port.

---

## Implementation Plan

Each phase ends with `npm test` green in the repo it touches.

**Phase 0 — test setup (½ day)**
- Confirm forumsys still answers (`ldapsearch` bind as `einstein`).
- Optional: `docker run --rm -p 10389:10389 -p 10636:10636 rroemhild/test-openldap`.

**Phase 1 — framework, W-261 (1–1½ days)**
1. `auth.js`: `deny` handling after `onAuthBeforeLogin`; hook definition `contextKeys`.
2. `user.js` model: `passwordManagedBy` field; `authenticate()` refusal.
3. `user.js` controller: `changePassword()`, admin update, `_classifyPasswordReset()`, token confirm.
4. Settings and admin user Security panels; admin reset-link button title.
5. `handlebar.js` + `login.shtml`: credentials providers.
6. Translations en/de; unit tests for each item; docs.
7. Verify with a throwaway site plugin implementing `onAuthBeforeLogin` that denies a fixed username.

**Phase 2 — plugin skeleton (½ day)**
1. Repo, `plugin.json` (icon above), `package.json`, `bump-version.conf`, `.gitignore`, README stubs.
2. `bin/copy-vendor-ldapts.js`; vendor `ldapts` 9.0.0.
3. `directoryPresets.js` + tests.

**Phase 3 — directory client (1 day)**
1. `ldapClient.js`: connect with failover and TLS, service bind, search, user bind, error classes,
   AD sub-codes, `objectGUID`.
2. Unit tests with a mocked `Client`; integration test against forumsys.

**Phase 4 — login decision and accounts (1½ days)**
1. `loginDecision.js` (pure) + table tests.
2. `userResolver.js`: match, link, JIT, profile sync + tests.
3. `ldapAuth.js` model: schema extension and cards.
4. `ldapAuth.js` controller: `onAuthBeforeLogin`, `onAuthGetLoginProviders`, throttle.

**Phase 5 — admin config (1 day)**
1. `plugin.json` config schema (§8); `onPluginConfigBeforeSave` validation and encryption.
2. Test endpoint + `jpulse-common.js` dialog; role options endpoint/loader.
3. Translations en/de.

**Phase 6 — manual testing and docs (1–2 days)**
1. Manual matrix against forumsys and the Docker image; AD rows when an AD is available.
2. Offline install check (§ air-gapped).
3. `docs/README.md` admin guide: presets, TLS, AD group filter, site modes, troubleshooting with
   Test connection, break-glass.

**Phase 7 — release**
- Plugin release prep and publish; framework release for W-261 first (`jpulseVersion >=2.0.11`).

Estimated total: 6½–8½ working days, framework included.

---

## Deliverables

Framework (W-261): see the W-261 work item.

Plugin (W-262):

- [x] `plugin.json`, `package.json`, `README.md`, `docs/README.md`, `.gitignore`, `webapp/bump-version.conf`
- [x] `webapp/vendor/ldapts/` (`index.mjs`, `LICENSE`, `VERSION`), `bin/copy-vendor-ldapts.js`
- [x] `webapp/utils/directoryPresets.js`
- [x] `webapp/utils/ldapClient.js`
- [x] `webapp/utils/loginDecision.js`
- [x] `webapp/utils/userResolver.js`
- [x] `webapp/model/ldapAuth.js`
- [x] `webapp/controller/ldapAuth.js`
- [x] `webapp/view/jpulse-common.js`
- [x] `webapp/translations/en.conf`, `de.conf`
- [x] unit tests (5 files) and the env-gated integration test

---

## Technical Debt

Items deliberately left out of v1.0.0, roughly in the order they are likely to be wanted.

**TD-01 — Group → role mapping (v1.1).** jPulse already has roles (including site-defined roles), so
this does not need a jPulse group model. Config: a list of `{ groupDn, roles[] }`. On each login,
read the user's groups and set the mapped roles. Details to design:
- group lookup per directory: AD `memberOf` (plus nesting via `LDAP_MATCHING_RULE_IN_CHAIN`, plus
  the primary group, which is not in `memberOf`); OpenLDAP `memberOf` overlay, or a search of
  `groupOfNames` / `groupOfUniqueNames` / `posixGroup` by member
- which roles the plugin owns: only roles that appear in the mapping are added or removed, so roles
  an admin set by hand are kept
- admin-equivalent roles only when an explicit `allowAdminMapping` is on, logged on every grant
- what happens when the group lookup fails (keep previous roles, log)

**TD-02 — jPulse groups.** Once the framework has groups, sync directory group membership to them.
Depends on a framework group work item that does not exist yet.

**TD-03 — Several directories.** `directories: [...]` with routing by UPN suffix or a domain picker
on the login page; per-directory presets and IDs (`ldap.directoryId`).

**TD-04 — Deprovisioning sync and session revocation.** A scheduled job that checks linked users
against the directory and suspends missing or disabled ones, and ends their sessions. Today a
removed user is blocked at next login but keeps an existing session until it expires.

**TD-05 — Admin account tools.** "Link to directory user" (search the directory from the admin user
page), "Unlink" and "Convert to local account" (clears `passwordManagedBy`, requires the admin to set
a new password). Needs a framework API for clearing `passwordManagedBy`.

**TD-06 — Direct bind mode.** Bind with a DN template (`uid={{username}},ou=people,…`) or an AD UPN
without a service account, then read the user's own entry.

**TD-07 — Directory-owned profile fields.** Show synced fields read-only in settings so users do not
edit values the next login overwrites. Likely a framework hook or schema flag.

**TD-08 — Profile-complete step.** For entries without `mail` or names, a step like auth-oauth's
`oauth-profile-complete` instead of `ACCOUNT_NOT_PROVISIONED`.

**TD-09 — Connection reuse.** Keep one service-bound connection per process for searches; user binds
stay on their own connection.

**TD-10 — Kerberos / SPNEGO.** Windows integrated sign-in. Needs native GSSAPI (`ldap-native` or
an HTTP Negotiate front end); a separate plugin so `auth-ldap` stays pure JavaScript.

**TD-11 — Directory password change.** Let a user with an expired AD password change it from jPulse
(AD `unicodePwd` modify over LDAPS).

**TD-12 — Framework per-identifier login throttle.** Generalize §10 into the framework login so
local accounts get it too; the plugin then uses the framework's.

**TD-13 — Admin status view.** Last successful bind, recent failures by type, linked user count.

**TD-14 — `onUserSyncProfile`.** The framework hook is marked planned; adopt it for profile sync
when it ships.

**TD-15 — Fail-closed hook errors.** A framework option to make `onAuthBeforeLogin` errors deny
the login instead of continuing; v1 relies on the plugin catching everything.

**TD-16 — Test directory in CI.** Run the integration test against the Docker OpenLDAP image in the
plugin's CI; add a Samba AD job if one can be made reliable.

**TD-17 — Login label per language.** `loginLabel` is a single string; per-language labels when
plugin config supports translated values.

---

## Resolved Questions

Resolved in review (2026-10-06); the Decisions table carries the outcome.

1. Field name: `passwordManagedBy` (alternatives `credentialSource`, `externalPassword` not taken).
2. Default preset: `active-directory`.
3. Linking an existing account by username: admin choice via `linkByUsername` (§5), default
   `when-signup-disabled`. Asking for the old local password at first directory login was not
   taken (more friction; TD candidate if open-signup sites need it).
4. `ACCOUNT_NOT_PROVISIONED`: helpful message ("contact the site administrator"); deployments are
   mostly controlled environments, and the message is only reachable with the right directory
   password.
5. Stable ID on AD: `objectGUID` is 16-byte binary, `entryUUID` does not exist there. Handled by
   `idAttributeFormat` (§3).
6. jPulse username vs. what AD users type (`sAMAccountName`): see §5 "jPulse username vs. the name
   users type".
