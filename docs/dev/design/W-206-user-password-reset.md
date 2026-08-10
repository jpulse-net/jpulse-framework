# W-206: user: reset password

## Status

🚧 IN_PROGRESS — spec drafted 2026-08-08, implemented 2026-08-09. Six product decisions were settled
with the work item owner before the first draft (see `## Resolved Design Questions`); the rest of
this document was reviewed twice (below) and then built essentially as written, with the five small
deviations noted under `### As Built`. What remains is manual testing — real mail clients, a
Safe-Links-style prefetch followed by a real click, and the cross-device round trip, all of which
were scoped to manual from the start.

- ✅ Phase 1 (model primitives)
- ✅ Phase 2 (endpoints, routes, config)
- ✅ Phase 3 (login completion + cross-path token invalidation)
- ✅ Phase 4 (views, emails, i18n)
- ✅ Phase 5 (tests + docs)

**Review pass 1 (2026-08-09)** changed three things in the draft:

1. **Layering corrected.** The first draft had `UserModel.issuePasswordReset()` deciding eligibility
   (status, `localAuthRestriction`, `hasLocalPassword`). That contradicts W-201's rule, stated in
   `UserModel.authenticate()`'s own doc comment: the model handles credentials, the controller owns
   policy. Policy moved to a single `UserController._classifyPasswordReset()`; the model primitives
   are now mechanism-only. See `### Layering`.
2. **Config interactions specified** — which existing flags matter, one new setting instead of the
   older `disableX`/`hideX` pair, and the SMTP-not-configured case, which is the *default* state of
   a fresh install. See `## Config Interactions`.
3. **Admin-initiated reset link promoted** from "Out of Scope / Future Work" into this item, as a
   fourth endpoint and a second button in the admin Security panel. See Flow 5.
4. **Translation keys re-checked against the corrected layering.** The three email keys stay under
   `model.user.*` (the classifier returns a verdict, not a message), all API strings collapse into
   one `controller.user.passwordReset.*` object rather than copying W-205's historical two-namespace
   split, the status/restriction refusals reuse the existing `controller.auth.*` wording instead of
   re-authoring it, and the admin refusal reasons move from the view to the server. See `### i18n`.

**Review pass 2 (2026-08-09)** folded two findings from a review of W-205's *implementation* (as
opposed to its design) into this item, since both are things W-206 would otherwise inherit or copy:

5. **The i18n usage audit gets extended to `webapp/model`** and taught the `key:` form used by
   `EmailController.sendEmailFromTranslation()`. Today the audit scans views and controllers only,
   and matches `global.i18n.translate(` — so W-205's three `model.user.*` email keys, and the three
   this item adds, are the only user-visible strings in the framework nobody checks. Part of
   Phase 5. See `### i18n Audit Coverage`.
6. **The "finish a login outside `login()`" tail becomes a real method**,
   `AuthController.beginAuthenticatedSession()`, with `_getRequiredSteps()`/`_completeLoginSession()`
   staying private behind it. This closes W-205's loose end of a second module reaching for
   underscore-prefixed methods, and does it at the moment a third caller appears rather than
   after. Part of Phase 3, where the shape is confirmed against both call sites. See the
   `### Layering` note on steps 7-9.

### As Built

Five things ended up slightly different from the spec below. None changes a decision; each is the
shape the code wanted once it existed.

1. **`_classifyPasswordReset()` returns `{ verdict, reason }`, not a bare verdict.** The public
   endpoint only ever needs the verdict, but the admin send has to name *which* refusal it hit —
   without a reason it would have to re-derive the answer from the user document and could reach a
   different one. `reason` is `null` for `'issue'`.
2. **Site-wide `disableLogin` is checked in the endpoints, not in the classifier.** It needs no user
   and must refuse before any lookup happens, which is exactly where `login()` checks it too. The
   classifier is now purely per-account, which is what makes it callable from both paths without
   either passing a request in.
3. **`_invalidatePasswordReset()` lost its underscore.** It is called from `UserController` (from
   `changePassword()` and `update()`), so marking it private would repeat the very thing finding 6
   above set out to fix.
4. **`beginAuthenticatedSession()` also takes `startTime` and returns `data`.** `startTime` feeds the
   elapsed figure in the login log line, which the two callers measure from their own request start;
   `data` carries a step's payload (the MFA step's, for instance) through to the caller. It also
   stamps a fresh `pendingAuth.createdAt`, which incidentally fixes a latent problem in the
   email-verify path: the minutes a mail round trip takes were previously charged against the window
   for whatever step came next.
5. **The reset page has a sixth state.** The five below are the flow's states; the page also renders
   an "unavailable" state, server-side, when password reset is off or SMTP is unconfigured — someone
   who has the URL bookmarked, or who follows a link from an old email, has to land somewhere.

The i18n audit extension additionally learned `translateForUser()` (the recipient-language variant),
which was invisible to it for the same reason the `key:` form was.

**Found in manual testing (kept):**

6. **Empty `smtpServer` is not configured** — no silent `localhost` fallback; both `smtpServer` and
   `adminEmail` required. `EmailController.reinitialize()` on config save makes clear/set live.
7. **Admin send awaits SMTP** (`awaitSend: true`) and returns `503 EMAIL_SEND_FAILED` on failure,
   discarding the just-stored token. Public request stays detached (enumeration).
8. **Admin Set Password stamps `hasLocalPassword: true`** — otherwise an SSO-JIT account given a
   real password still got the SSO explainer on reset.
9. **Admin Security button disables** when the feature is unavailable (same
   `passwordResetAvailable` context as login), not only for account-level refusals.
10. **IP rate-limit toast** uses `controller.user.passwordReset.rateLimited`, not the login
    "Too many login attempts" string.
11. **`auth-mfa` `onAuthGetSteps` sets `page: '/auth/mfa-verify.shtml'`** — without it, OAuth
    `completeExternalAuth()` fell back to login with no MFA UI (password login already hardcoded
    that path in `login.shtml`).

---

## Objectives

- Let a user who forgot their password regain access on their own, by proving control of the email
  address on their account — the last remaining "contact your administrator" dead end in the
  framework's local-auth story, and the one W-205 explicitly handed off as the next item to reuse
  its primitives.
- Do it without weakening any control that already stands between an inbox and a session:
  account status, MFA, and the site's local-auth policy all still apply after a reset.
- Do it with no new user-schema fields, no new infrastructure, and no new concepts for a site admin
  to learn — this is the third feature in a row (W-198, W-205, W-206) built out of the same Redis
  token + translated email + rate limiter pieces.

**Design principle:** the same one W-205 states — secure by default, frictionless for the user. The
"don't make me think" bar for this flow specifically: a user who clicks the mailed link should type
one new password and be *in*, with no second sign-in, no second verification email, and no unexplained
dead ends when their account happens to be in a state that can't sign in at all.

---

## What Already Exists (built by prerequisites)

W-205 built essentially all of the machinery. This item is a fourth caller of it plus one new page.

| Piece | Where | State |
|---|---|---|
| Redis token store + TTL | `RedisManager.cacheSetToken()` / `cacheGetToken()` / `cacheDelToken()` | ✅ |
| Rate limiting (fails open) | `RedisManager.cacheCheckRateLimit()` | ✅ |
| Translated, unix-mail-style email | `EmailController.sendEmailFromTranslation(req, { user, key, context })` | ✅ three callers today |
| `<userId>.<secret>` token shape | `UserModel.issueEmailVerification()` / `verifyEmailByToken()` | ✅ the pattern to copy |
| Password hashing + policy | `UserModel.hashPassword()` (bcrypt, 12 rounds), `prepareSaveData()` → `passwordPolicy.minLength` | ✅ |
| Password write path | `UserModel.updateById({ password, hasLocalPassword: true })` | ✅ used by `changePassword()` |
| Multi-step login continuation | `AuthController._getRequiredSteps()` / `_completeLoginSession()` | ✅ already driven by a second controller (`UserController.confirmEmailVerify()`); gains a public front door here — see `### Layering` |
| Toasts across a server redirect | `CommonUtils.appendToastsToUrl()` | ✅ |
| Masking for logs/UI | `CommonUtils.maskEmail()` | ✅ |
| Per-IP limiter precedent + config shape | `controller.auth.loginRateLimit` (W-204) | ✅ copy the shape |
| "Forgot password?" affordance | `webapp/view/auth/login.shtml` ~line 348 | ⚠️ link exists, fires a placeholder toast |
| Admin Security panel + Set Password override | `webapp/view/admin/user-profile.shtml` ~line 272 (hardcoded), `AuthController.requireAdminRole()` | ✅ the admin-send button joins it |
| Page-scoped view context precedent | `authProviders` in `HandlebarController._buildInternalContext()` ~line 739 | ✅ the shape `passwordResetAvailable` copies |

**Not existing, must be created:** `/auth/reset-password.shtml`, seven `UserModel` methods, four
`UserController` endpoints plus the eligibility classifier, three email translations, two `app.conf`
settings, and one admin-panel button.

---

## Architecture

### Core, not a plugin

Same reasoning as W-205: local password login is core, so the recovery path for a local password is
core too. A plugin would default OFF, leaving every site without it stuck on "contact your
administrator" — which is exactly the state this item exists to end. The login page it hangs off is
a framework view.

### Layering: mechanism in the model, policy in the controller

`UserModel.authenticate()` states the rule this feature has to follow, in its own doc comment:
credentials only, *no* status gating, because "W-201: status enforcement is a controller-layer
concern, centralized in `auth.js`'s `login()`". The model knows how a secret is made, stored, and
checked; it holds no opinion about whether this particular account is allowed to do the thing.

So none of `disableLogin`, `localAuthRestriction`, `hasLocalPassword`, or `status` is read in the
model here. They are read in exactly one place — `UserController._classifyPasswordReset(user)` — and
the model primitives do as they are told:

```
UserModel — mechanism only, no policy
    issuePasswordReset(req, user, { enforceSendLimit }) → issue + store token, mail it
    verifyPasswordResetToken(req, token)              → read-only validity probe, does NOT consume
    resetPasswordByToken(req, token, newPassword)     → validate, set password, consume token
    sendPasswordResetSsoNotice(req, user)             → the "you sign in via SSO" mail
    sendPasswordChangedNotice(req, user)              → after-the-fact security notice
    invalidatePasswordReset(userId)                   → public, unlike W-205's underscore twin:
                                                        every other password-write path calls it

UserController — policy, HTTP shape, logging, i18n
    _classifyPasswordReset(user)  → 'issue' | 'ssoNotice' | 'silent'
        the ONE place disableLogin / localAuthRestriction / hasLocalPassword / status are consulted
```

This split is what makes the admin flow below a five-line variation rather than a second
implementation: same model primitives, a different policy decision on top (an admin gets told what
happened; an anonymous requester never does).

### Four endpoints, all on `UserController`

Not `AuthController`, for the reason W-205 settled when it made the same call: endpoints live on the
controller matching their route namespace, and `/api/1/user/*` is a user-account namespace.
`signup()` (also pre-login and also unauthenticated) and `changePassword()` are already there, and a
password reset is a password write before it is anything else. The login-completion tail of the
confirm endpoint still belongs to `AuthController` and is called there — see the next section.

```
1 — REQUEST   (public, uniformly generic response)
    POST /api/1/user/password-reset          { identifier }

2 — PROBE     (public, read-only, safe to repeat)
    GET  /api/1/user/password-reset/verify?token=...

3 — CONFIRM   (public; the token IS the credential)
    POST /api/1/user/password-reset/confirm  { token, newPassword }

4 — ADMIN SEND (admin role; honest responses, not the generic one)
    POST /api/1/user/password-reset/send     { id | username }
```

### Three deliberate differences from W-205's email verification

These are the decisions that make this flow *not* a copy-paste of the verification flow, and each
exists for a specific reason:

**1. The mailed link is not a route — it lands on the page.** W-205's link is
`GET /api/1/user/email-verify/confirm?token=`, a server route that performs the action and redirects.
That works there because flipping a flag *is* the whole action. Here the action needs input (the new
password), and a GET that consumed the token would be destroyed by the very thing W-205 accepted as
harmless: mail-scanner link prefetching (Outlook Safe Links and friends). W-205 could shrug that off —
a prefetch just verifies the address slightly early. Here a prefetch would burn the single-use token
before the human ever saw the form, and the user would be locked out by their own corporate mail
filter. So the mailed URL is `/auth/reset-password.shtml?token=...`, a plain page, and the token is
consumed only by the POST that carries a new password. GET stays safe and idempotent, as it should be.

**2. Link only, no 6-digit code.** W-205 issues both because a code is the only way for a user reading
mail on a phone to advance the *login tab already open on their desktop*. This flow has no waiting tab
to advance: wherever the user ends up, they still have to fill in a new-password form, so a code would
just be a second route to the same page — extra UI, a second secret to store and rate-limit, and no
friction removed.

**3. The reset does not hand out a session by itself.** See the next section — this is the security
core of the item.

### Completing a login after a reset, without bypassing anything

Auto-login after reset (the "don't make me think" decision) is where this feature could quietly become
an authentication bypass, so it is specified precisely.

`AuthController._completeLoginSession()` creates a session and nothing else. Every gate that stands
between valid credentials and a session lives *outside* it, in `login()`: the account-status checks
(W-201 centralized them there deliberately), the `localAuthRestriction` policy (W-195), the
`disableLogin` switch, and the multi-step requirements returned by `_getRequiredSteps()` — which is
where the auth-mfa plugin injects its `mfa` step. A reset endpoint that called
`_completeLoginSession()` directly would therefore hand a session to a suspended account, and — far
worse — would let anyone with inbox access walk straight past MFA. Inbox access is not a second
factor; it is barely a first one.

So the confirm endpoint reproduces `login()`'s post-credentials sequence, in order:

```
1. token valid?  (rate-limited)                     → else 400/429, no state change
2. set the new password  (policy enforced)          → hasLocalPassword: true, token consumed
3. emailVerified = true, emailVerifiedAt = now      → the click proved inbox control (see below)
4. mail the "your password was changed" notice      → detached, never blocks
5. status gate  (active only)                       → else: success, but NO session
6. localAuthRestriction gate  (same expression login() uses)
7. AuthController.beginAuthenticatedSession(req, user, 'local', { redirect })
     → fresh pendingAuth { completedSteps: ['credentials'] }, stale one discarded
8.   steps = _getRequiredSteps(...)                 → MFA and any plugin step still run
9.   steps remain ? { nextStep, page }  :  _completeLoginSession() and { warnings }
```

Steps 7-9 are exactly what `UserController.confirmEmailVerify()` already does for a mid-login link
click, and the JSON contract (`{ success, nextStep, page, warnings }`) is the one `login.shtml` and
`email-verify.shtml` already speak — so the reset page's client code is a third consumer of an
existing contract rather than a new one.

**Steps 7-9 become a named `AuthController` method.** W-205 deliberately did *not* add a "continue
pending step" wrapper, judging that `confirmEmailVerify()`'s branching was bespoke enough that a
shared helper wouldn't simplify it — a fair call at two callers (`confirmEmailVerify()`,
`completeExternalAuth()`). This item makes it three, and unlike the other two, this one also needs
the status gate that `completeExternalAuth()` explicitly pushes onto its caller ("No implicit gate
on `user.status` here"). Settled: extract it, because getting the pendingAuth reconstruction wrong
*is* the MFA-bypass risk above, and one place to get it right is worth more than one fewer method.

```javascript
// AuthController — public; the only supported way to finish a login started outside login()
static async beginAuthenticatedSession(req, user, authMethod, {
    completedSteps = ['credentials'],   // caller states what has been proven
    redirect = null
} = {})
    → { nextStep, page, warnings, redirect }   // JSON-shaped, no res
```

The caller decides *whether* to call it and what counts as completed; the method owns writing
`req.session.pendingAuth` when steps remain and calling `_completeLoginSession()` when none do.
`passwordResetConfirm()` takes the defaults; `confirmEmailVerify()` passes
`[...pending.completedSteps, 'email-verify']` and the pending redirect, which is the migration that
removes the cross-module underscore call. It deliberately does **not** gate on `user.status` —
same contract `completeExternalAuth()` documents, and the reason step 5 above sits in the caller;
adding a gate here would silently change the email-verify path, whose status was already checked by
`login()`.

`_getRequiredSteps()` and `_completeLoginSession()` stay private behind it. `login()` and
`completeExternalAuth()` live in the same module and keep calling them directly — moving those onto
the new method is *not* part of this item. The signature above is confirmed against both call sites
in Phase 3; if `confirmEmailVerify()` turns out not to fit it, the fallback is dropping the
underscore from the two methods instead, and that decision is made with the code in front of us.

**Why the reset also sets `emailVerified`.** The user just opened a secret mailed to the address on
the account: that is precisely the proof `emailVerified` asserts, collected by precisely the mechanism
W-205 uses to collect it. Without the flip, step 8 in `'required'` mode would immediately push an
`email-verify` step and mail a *second* credential seconds after the first — asking the user to prove
again, with a second email, what they proved ten seconds ago. `emailVerifiedAt` is stamped for the
same reason W-205 stamps it: a real date means real proof.

**Any pre-existing `pendingAuth` in the browser session is discarded, not merged,** before step 7 —
it belongs to an earlier, abandoned login attempt and possibly to a different account.

---

## Who Can Reset

The request endpoint's *response* is identical in every row below. Only the outbound email differs,
and only the person holding the inbox ever sees that.

| Account situation | Token issued? | Email sent | Rationale |
|---|---|---|---|
| No such username/email | no | none | Enumeration protection: silence, not a "no such user" |
| `hasLocalPassword === false` (SSO-provisioned) | no | "you sign in with your provider" explainer | Matches W-197: an SSO user's path to a local password is the in-session Set Password, not a mailed link |
| `localAuthRestriction` makes local login unusable for this account (`disabled`, or `admins-only` and not an admin) | no | same SSO explainer | A password they could never log in with is not worth resetting; the mail tells them how they *do* sign in |
| `status: 'suspended'` or `'terminated'` | no | none | The admin owns that conversation; the framework should not mail a disabled account a way back in |
| `status: 'pending'` or `'inactive'` | yes | reset link | They may be waiting on approval and still deserve to fix their credentials — but see below: no session results |
| `status: 'active'`, local password | yes | reset link | The main path |
| Site-wide `controller.auth.disableLogin` | n/a | none | 403 `LOGIN_DISABLED` before any lookup, exactly as `login()` does — public site policy, leaks nothing |
| `controller.user.disablePasswordReset`, or SMTP not configured | n/a | none | 403 `PASSWORD_RESET_UNAVAILABLE`, and the login page hides the link entirely — see `## Config Interactions` |

**`pending`/`inactive` finish the reset but get no session.** Their new password is saved (step 2-4
above), then step 5 stops short of a session — because `login()` would refuse them anyway, and this
endpoint must not become the one door that skips the status check. The confirm response carries the
specific status code, so the page can say "Your password has been updated. Your account is still
pending approval, so you can't sign in yet" instead of dumping the user at a login form that will
reject them for reasons they can't see. Telling them costs nothing: they hold a token mailed to the
account's own address, so they are the owner.

**The `admins-only` recovery case is preserved.** `login.shtml` shows the local form (and therefore
the "Forgot password?" link) under `?localFallback=1` when SSO is broken; an admin on an
`admins-only` site is *not* restricted by the expression above, so break-glass password recovery
keeps working exactly when it is most needed.

---

## Config Interactions

### Existing settings

| Setting | Effect here |
|---|---|
| `controller.auth.disableLogin` | Reset endpoints return 403 `LOGIN_DISABLED` before any lookup, exactly as `login()` does |
| `controller.auth.localAuthRestriction` | Feeds `_classifyPasswordReset()`; also already hides the "Forgot password?" link, since it sits inside `{{#if vars.showLocalForm}}` |
| `controller.user.emailVerification` | No special handling needed — a completed reset sets `emailVerified`, so a `'required'` site doesn't re-challenge the user it just verified |
| `model.user.passwordPolicy.minLength` | Enforced on the new password; already on `contextFilter.alwaysAllow`, so the reset page can show the hint with no config change |
| `controller.user.disableSignup` / `view.auth.hideSignup` | Unrelated — resetting is not signing up |
| `view.auth.hideLogin` | **Deliberately no effect.** It is cosmetic: `jpulse-navigation.js`, `jpulse-footer.tmpl` and `dashboard.tmpl` drop the nav entries, but the login page stays reachable by direct URL — that is the documented point of the flag ("secret login via known url, intended for public sites"). A site using it still wants the people who know the URL to be able to recover their password |

### One new setting, not a pair

The older idiom in this framework is two flags per auth surface — `controller.auth.disableLogin` +
`view.auth.hideLogin`, `controller.user.disableSignup` + `view.auth.hideSignup`. This item
deliberately does not copy it. The pair's failure mode is drift: `hideLogin` without `disableLogin`
leaves a fully working endpoint behind a hidden link, and the two values have to be kept in sync by
the admin, by hand, forever. The newer precedent is one value read by both layers — W-195's
`controller.auth.localAuthRestriction` and W-205's `controller.user.emailVerification` are each a
single `controller.*` setting that the unauthenticated login page reads directly, made visible by
adding it to `controller.handlebar.contextFilter.alwaysAllow` (`appConfig.controller.*` is otherwise
stripped for unauthenticated requests).

```javascript
// webapp/app.conf, controller.user, directly beside disableSignup
disablePasswordReset:   false,  // see also controller.auth.disableLogin
```

plus one entry, `'controller.user.disablePasswordReset'`, in `contextFilter.alwaysAllow`. The login
page hides the link and the endpoints refuse, from the same value.

### The SMTP dead end — the default state of a fresh install

A brand-new jPulse install has no SMTP configured. Without a check, its login page offers "Forgot
password?", the page accepts an address, says "we've emailed you a link", and nothing ever arrives —
worse than having no link at all, and the *default* experience rather than an edge case.

`UserController.isPasswordResetAvailable()` behaves like W-205's `getEmailVerificationPolicy()`:
false when `disablePasswordReset` is true **or** `EmailController.isConfigured()` is false, evaluated
live on every call and never frozen at boot, so an admin who configures SMTP gets the feature without
a restart. Server-side it is authoritative (`PASSWORD_RESET_UNAVAILABLE`).

It lives on the **controller**, not the model — deliberately unlike its W-205 counterpart, which sits
on `UserModel` despite having no model-internal caller. It reads `appConfig.controller.*` and decides
whether a feature is offered: policy, by the same rule that moved eligibility out of the model above.

The view needs the same answer, and config alone cannot express "SMTP is configured". The precedent
to follow is `authProviders` in `HandlebarController._buildInternalContext()` (~line 739): a
page-scoped computed value behind a path check, so every other page in the site pays nothing for it.
Extend that guard from `/auth/login.shtml` to also cover `/auth/reset-password.shtml`, and add a
`passwordResetAvailable` boolean beside it.

**No startup warning**, unlike W-205's `checkEmailVerificationSafety()`. That warning exists because
`'required'` + no SMTP would lock users out; here the consequence is only that an optional
convenience is unavailable, so warning on every fresh install would be noise. The admin already sees
SMTP's state on the Config → Email page.

---

## Reset Secret

One secret per request, single-use, and shorter-lived than anything W-205 issues.

| | Reset link token |
|---|---|
| Format | `<userId>.<secret>`, secret = 32 random bytes, base64url |
| TTL | **1 hour** |
| Storage | bcrypt hash of the secret half only (10 rounds), Redis |
| Single-use | yes — consumed by a successful confirm |
| Also invalidated by | any other password write for that user (self-service change, admin set) |

**Why the userId is in the token.** Same reason as W-205: the confirm request carries no session, so
a bare secret would be unattributable. Only the secret half is ever hashed or stored.

**Why 1 hour and not W-205's 24.** A verification link is often clicked hours later and grants only a
flag flip. A reset link grants account takeover to whoever holds it, so its value to an attacker who
gains inbox access later — a stale mailbox on a shared computer, a forwarded thread, a breached
mail backup — is exactly what a short TTL cuts off. One hour is comfortably longer than the minutes a
real "I forgot my password" round trip takes, and re-requesting is one click on a page the user is
already looking at.

| Limiter | Budget | Key | Path |
|---|---|---|---|
| Reset requests (per account) | 3 / 10 min | userId | `controller:user:passwordResetSend` |
| Confirm attempts (bad tokens) | 5 / 15 min | userId | `controller:user:passwordResetAttempt` |
| Reset requests (per IP) | 10 / 5 min, configurable | client IP | `controller:user:rateLimit:passwordReset` |

The first two mirror W-205's per-account budgets exactly. The third is new and copies W-204's
`loginRateLimit` shape (`{ enabled, maxAttempts, windowSeconds }` in `app.conf`, fail-open, keyed by
`CommonUtils.getLogContext(req).ip`) — it is the only limiter that can bound an attacker enumerating
*nonexistent* accounts, since a nonexistent account has no userId to key the per-account limiter on.

The send limiter is a mechanism the model enforces, but *whether* to enforce it is the caller's
decision: `issuePasswordReset(req, user, { enforceSendLimit })` defaults to `true` and is called with
`false` by the admin-send endpoint only (see Flow 5). The confirm-attempt limiter has no such
opt-out.

**`retryAfter` is normalized to seconds at the endpoint boundary** (`Math.ceil(ms / 1000)`), the way
W-204's login limiter does it. Worth stating explicitly because `cacheCheckRateLimit()` returns
milliseconds and W-205's `emailVerifySend`/`emailVerify` pass that straight through to a client that
renders it as seconds — see `## Out of Scope` for that adjacent bug.

---

## Flows

### 1. Request

```
/auth/login.shtml → "Forgot password?" → /auth/reset-password.shtml
    → POST /api/1/user/password-reset { identifier: 'jane' | 'jane@example.com' }
    → per-IP limit → disableLogin check → resolve account (findByUsername, then findByEmail)
    → classify (see "Who Can Reset"), issue + store token if eligible, hand the send off detached
    → 200 { success: true, message: "If an account matches, we've emailed a reset link." }
→ page shows the "check your mail" state, with the address the user typed echoed back verbatim
  (never the account's stored address - that would confirm the account exists)
```

**The response does not wait for SMTP.** Awaiting the send would make an existing account measurably
slower to answer than a nonexistent one — an SMTP round trip is hundreds of milliseconds, trivially
observable, and would undo the enumeration protection the generic message exists to provide. So the
endpoint awaits only the Redis write and lets the send run detached, with the same swallow-and-log
error handling W-205's mail helpers already use. This is a deliberate departure from
`UserController.signup()`, which awaits `issueEmailVerification()` for consistency with its own
sequential style; there is no such argument here, and there is a concrete reason not to. The remaining
timing difference (one bcrypt hash, ~10-60ms) is not addressed — the goal is removing the large,
reliable signal, not achieving constant time, which is not attainable in this stack anyway.

### 2. Set the new password

```
Mail → /auth/reset-password.shtml?token=<userId>.<secret>
    → page reads the token, then immediately strips it from the address bar (history.replaceState)
    → GET /api/1/user/password-reset/verify?token=...   (read-only, does not consume)
        → valid   → show the new-password form (+ confirm field, + the policy hint)
        → expired → "this link has expired" + a one-click "send me a new one" back to state 1
    → POST /api/1/user/password-reset/confirm { token, newPassword }
        → the 9-step sequence in "Completing a login after a reset" above
        → { success, nextStep, page }   → client redirects to that step (e.g. MFA)
        → { success, warnings }         → fully logged in; jPulse.url.redirect('/', { toasts })
        → { success, accountStatus }    → "password updated, but ..." (pending/inactive)
```

### 3. SSO-only or restricted account

Identical request response, but the mail says the account signs in with an external provider and
points at `/auth/login.shtml`. It deliberately does not name the provider: the provider list is
assembled by the `onAuthGetLoginProviders` hook only for `/auth/login.shtml`
(`webapp/controller/handlebar.js` ~line 739), and plumbing it into a model-layer email would be real
coupling for a sentence the login page itself already answers with buttons.

### 4. Password changed by any other path

`UserController.changePassword()` (self-service) and `UserController.update()` (admin sets a password)
both call `UserModel.invalidatePasswordReset(userId)` after a successful write. An outstanding reset
link is a live credential for an account whose password just changed for some other reason; the user
who just changed theirs, or the admin who just reset it, has every reason to expect that older
credential to be dead.

### 5. Admin sends a user a reset link

```
Admin → /admin/user-profile.shtml → Security tab → "Email password reset link"
    → POST /api/1/user/password-reset/send { id }        (AuthController.requireAdminRole())
    → same UserModel.issuePasswordReset(), same 1h token, same mail the user would have requested
    → honest response: what happened, and if nothing, why
```

This complements the existing "Set Password" override (W-174) rather than replacing it, and for most
support cases it is the better of the two: **an admin-set password is a password the admin knows.**
It has to be communicated over some channel (chat, phone, a sticky note), it is valid until the user
changes it, and nothing forces them to. A mailed reset link is never seen by the admin, expires in an
hour, and can only be used by whoever holds the mailbox. The Set Password button stays for the cases
that genuinely need it — no SMTP, an unreachable mailbox, an urgent lockout.

Four deliberate differences from the public request endpoint:

| | Public request | Admin send |
|---|---|---|
| Response | always generic | honest — "sent", or the specific reason nothing was sent |
| Per-IP limiter | yes | no (an authenticated admin, already logged by name) |
| Per-account send limiter (3 / 10 min) | enforced | **bypassed** |
| Ineligible account (SSO, restricted, suspended/terminated) | explainer mail or silence | refused, with the reason shown to the admin — no mail |

**Why the honest response.** The enumeration protection exists to stop an anonymous stranger learning
whether an account exists. An admin looking at that user's profile page already knows; silently
swallowing "this account signs in via SSO, a reset link won't help them" would just leave the admin
waiting for a mail that was never going to arrive, and then trying again.

**Why bypass the per-account send limiter.** The user's own budget (3 / 10 min) is meant to stop a
stranger mail-bombing them. An admin helping someone in real time — "did it arrive? no? let me send
it again" — would otherwise be blocked by a budget the *user* may have already spent trying on their
own, which is exactly the situation that sends them to an admin. The risk this trades away is small:
an admin who wanted to abuse a user's mailbox has better tools one button to the left, and every send
is logged with the acting admin's username.

**Same 1-hour TTL**, deliberately not extended for admin sends even though W-205 argued the opposite
for its admin-driven case (a verification link "often clicked hours later"). Two TTLs would mean two
security stories, two expiry messages, and a token whose lifetime depends on invisible provenance. If
an admin-sent link expires, the user hits the expired state and self-serves a fresh one in one click,
which needs no admin at all.

**Ineligible accounts are refused, not worked around.** For `suspended`/`terminated` the correct fix
is to change the status first, and the error says so; for SSO/restricted accounts a local password
is useless, and the error says that instead. The admin is told which situation they are in.

---

## Security Considerations

| Concern | Mitigation |
|---|---|
| A mailed link becoming a way around MFA | The confirm endpoint never creates a session itself; it hands off to `beginAuthenticatedSession()`, which rebuilds `pendingAuth` and runs `_getRequiredSteps()`, so MFA (priority 100) and any plugin step still gate the session. Explicitly covered by a test. |
| A mailed link becoming a way around account status | Status is re-checked in the confirm endpoint before any session is created — neither `beginAuthenticatedSession()` nor `_completeLoginSession()` has a status gate of its own (W-201 put status enforcement in `login()`). Suspended/terminated never even get mail. |
| A mailed link becoming a way around `localAuthRestriction`/`disableLogin` | Both re-checked with the same expressions `login()` uses; a restricted account gets the SSO explainer instead of a token. |
| User enumeration via the response | One generic message and one status code for every outcome, including "no such account". |
| User enumeration via response *timing* | The SMTP send is detached, so an existing account does not answer measurably later than a nonexistent one. |
| User enumeration via the "check your mail" screen | The page echoes the identifier the user typed, never the account's stored address. |
| Token brute force | 32 bytes of entropy, plus 5 confirm attempts / 15 min per account. |
| Mail bombing an address | 3 requests / 10 min per account, plus 10 / 5 min per IP for accounts that don't exist. |
| Mail scanners prefetching the link | The link is a page, not an action; only the POST consumes the token, so a prefetch cannot burn it. This is the main structural difference from W-205's confirm route. |
| Token leaking via browser history or `Referer` | Stripped from the URL with `history.replaceState` as soon as the page reads it; 1h TTL; single use. |
| A stale reset link outliving the reason it was issued | Consumed on use, expired after 1h, and invalidated by any other password write for that account. |
| Reset used as a way to *set* a first password on an SSO account | Refused (explainer mail, no token) — W-197's position is that SSO users add a local password from an authenticated session, where the SSO login itself is the proof. |
| Redis unavailable | Limiters fail open (documented `cacheCheckRateLimit()` behavior); the reset itself fails closed, since with no stored hash no token can validate. A site with Redis down cannot reset passwords, which is the safe direction. |
| SMTP unavailable | Nothing is mailed, so nothing can be reset. Unlike W-205's `'required'` policy there is no lockout to avoid here (the normal password login still works), so no degrade path is needed — but the request endpoint logs a distinct error so the admin sees it in Admin → Logs. |
| Eligibility rules drifting apart between the public and admin paths | `UserController._classifyPasswordReset()` is the only place `disableLogin`, `localAuthRestriction`, `hasLocalPassword` and `status` are read; both endpoints call it and differ only in how they *report* its verdict. |
| A compromised admin session mail-bombing a user (admin send skips the per-account limit) | Every send is logged with the acting admin's username, and that same session can already overwrite the password outright via the W-174 Set Password control — the bypass grants an attacker nothing they don't already have. |
| Other active sessions surviving a reset | **Not addressed** — see `## Out of Scope`. |

---

## API Surface

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/1/user/password-reset` | none | request a link; uniformly generic response |
| GET | `/api/1/user/password-reset/verify?token=` | none | read-only validity probe; never consumes |
| POST | `/api/1/user/password-reset/confirm` | none (token is the credential) | set the password, consume the token, possibly complete a login |
| POST | `/api/1/user/password-reset/send` | `AuthController.requireAdminRole()` | admin mails a user a reset link; honest response |

Registered explicitly in `webapp/routes.js` next to the W-205 email-verify routes (framework
controllers are not auto-discovered). All four must be registered **before** `/api/1/user/:id`, per
that file's standing note that specific routes have to precede parameterized ones.

### Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `PASSWORD_RESET_INVALID_TOKEN` | 400 | malformed, unknown, or already-used token |
| `PASSWORD_RESET_EXPIRED` | 400 | token existed but its TTL elapsed |
| `PASSWORD_RESET_RATE_LIMITED` | 429 | request or attempt budget exhausted; includes `retryAfter` (seconds) |
| `PASSWORD_POLICY_ERROR` | 400 | new password fails `passwordPolicy` — reused verbatim from `changePassword()` |
| `MISSING_PASSWORD` | 400 | confirm called without `newPassword` |
| `LOGIN_DISABLED` | 403 | site-wide switch, same code `login()` returns |
| `PASSWORD_RESET_UNAVAILABLE` | 403 | `disablePasswordReset`, or SMTP not configured |
| `RATE_LIMITED` | 429 | per-IP limit on the request endpoint, same code `login()` returns |
| `PASSWORD_RESET_NOT_ELIGIBLE` | 409 | **admin send only** — SSO/restricted/suspended/terminated account; carries a `reason` so the admin page can say which |
| `USER_NOT_FOUND` | 404 | **admin send only** — reuses the code `changePassword()` already returns |

The public request endpoint can only ever return `LOGIN_DISABLED`, `PASSWORD_RESET_UNAVAILABLE`,
`RATE_LIMITED`, or a generic success — never anything that varies with the account.

---

## Data & State

**No new user-schema fields.** The reset writes only fields that already exist: `passwordHash` (via
`updateById({ password })`), `hasLocalPassword`, `emailVerified`, `emailVerifiedAt`.

Redis, via the existing wrappers:

```
controller:user:token:passwordResetLink:<userId>          bcrypt hash of the secret, TTL 3600
rateLimit:controller:user:passwordResetSend:<userId>      3 / 600s
rateLimit:controller:user:passwordResetAttempt:<userId>   5 / 900s
rateLimit:controller:user:passwordReset:<ip>              10 / 300s (config-driven)
```

New in `webapp/app.conf`, under `controller.user`, the second mirroring W-204's block:

```javascript
// W-206: see docs/security-and-auth.md#password-reset. Also refused when SMTP is unconfigured.
disablePasswordReset:   false,  // see also controller.auth.disableLogin

// W-206: IP-based rate limit on POST /api/1/user/password-reset - the only limiter that can
// bound enumeration of accounts that don't exist (no userId to key a per-account limit on).
// Uses RedisManager.cacheCheckRateLimit(); fails open if Redis is unavailable.
passwordResetRateLimit: {
    enabled:        true,
    maxAttempts:    10,     // per IP, per window
    windowSeconds:  300     // 5 minutes
}
```

plus `'controller.user.disablePasswordReset'` on `controller.handlebar.contextFilter.alwaysAllow`.

---

## UI

### `/auth/reset-password.shtml` (new)

One page, five states, following `email-verify.shtml`'s `showState()` structure so there is one page
to build, translate, and learn:

| State | Shown when | Contents |
|---|---|---|
| `request` | no `?token` | one identifier field (username *or* email, same wording as the login form), submit |
| `sent` | after a successful request | "If an account matches *what-you-typed*, we've emailed a reset link", plus a rate-limit-aware "send again" |
| `setPassword` | `?token` present and the probe says valid | new password + confirm password, both `autocomplete="new-password"`, with the policy hint visible *before* the first submit |
| `expired` | probe says expired/invalid | plain explanation + one button back to `request` |
| `done` | confirm succeeded but no session (pending/inactive) | the specific status message + a link to the login page |

The success-with-session cases never render a state: they redirect (to the next step's page, or to the
destination with the login toast queued), so the user's last click lands them where they were going.

Nothing on this page reveals whether an account exists, and the "check your mail" copy echoes the
user's own input rather than any stored address.

### `webapp/view/auth/login.shtml`

Replace the `onclick="showForgotPassword()"` placeholder (~line 348) and its toast function
(~line 550) with a plain link to `/auth/reset-password.shtml`, wrapped in `{{#if
passwordResetAvailable}}` (the page-scoped context value from `## Config Interactions`). No layout
change otherwise: the link already sits inside `{{#if vars.showLocalForm}}`, so a site with local
auth restricted already hides it and keeps showing it in `?localFallback=1` recovery mode — exactly
the behavior this feature wants.

### `webapp/view/admin/user-profile.shtml` — Security panel

The Security panel is hardcoded (the file says so at ~line 535: "Administrative and Security stay
hardcoded"), so this is a direct edit, not a schema change. A second button joins `🔑 Set Password`
in the existing `jp-btn-group` (~line 291):

```
📧 Email password reset link      → POST /api/1/user/password-reset/send { id }
```

Details that make it usable rather than merely present:

- an info line above the pair saying which to reach for — the mailed link for a user who can read
  their mail, Set Password for an urgent lockout or an unreachable mailbox;
- a confirmation step, since it mails a real person;
- the outcome as a toast, using the endpoint's honest response — "Sent to ja\*\*\*@example.com", or
  the specific reason (`PASSWORD_RESET_NOT_ELIGIBLE`'s `reason`, `EMAIL_NOT_CONFIGURED`,
  `USER_NOT_FOUND`), never a generic failure;
- the button disabled with an explanatory title when the loaded user is one the classifier would
  refuse (SSO-provisioned, suspended, terminated) — the same verdict the server will reach, shown
  before the click rather than after.

### Emails — three translation keys, no template files

Same mechanism as W-205: the translation *is* the message (unix-mail envelope, `{{token}}`
substitution, recipient's language via `sendEmailFromTranslation()`), and there is no `.tmpl` file.

| Key | Trigger | Contains |
|---|---|---|
| `model.user.passwordReset` | eligible account requested a reset | the reset URL, the 1-hour expiry, and "if this wasn't you, ignore this" |
| `model.user.passwordResetSso` | SSO-provisioned or locally-restricted account | how they actually sign in; no link, nothing that can expire |
| `model.user.passwordChanged` | any successful reset | after-the-fact security notice; no credential |

Draft English copy for the first one:

```javascript
passwordReset: `Subject: Reset your password

Hi {{firstName}},

Someone asked to reset the password for your {{siteName}} account. If it was you, open
this link within the next hour:

{{resetUrl}}

If it wasn't you, you can ignore this message - your password has not changed.`,
```

The third one is the piece that makes a compromised-inbox takeover *noisy* rather than silent, which
is the only defense available given that other sessions can't be revoked (see `## Out of Scope`). It
is sent detached and never blocks or fails the reset, exactly like W-205's `sendEmailChangedAlert()`.

### i18n

The namespace mirrors `webapp/{model,controller,view}/`, and a key belongs to the module that
*defines and calls* it — W-205's corrected rule. Moving policy out of the model (see `### Layering`)
does not move any key with it: the classifier returns a verdict (`'issue'`/`'ssoNotice'`/`'silent'`),
never a message, and the three emails are still authored and sent by `model/user.js`.

**New keys**, in `en.conf` and `de.conf` in the same pass (the files are line-parallel):

- `model.user.passwordReset`, `model.user.passwordResetSso`, `model.user.passwordChanged` — the three
  emails, beside the existing `model.user.emailVerify` / `emailChanged{Notice,Alert}`.
- `controller.user.passwordReset.*` — every API response string for all four endpoints, in **one**
  sub-namespace beside the existing `signup`/`password`/`emailVerify` objects. Note this deliberately
  does *not* copy W-205's split, where the email-verify API strings live partly under
  `controller.auth.emailVerify*` (Phase 2, for the blocking login step) and partly under
  `controller.user.emailVerify.*` (Phase 3, for the endpoints). That split is historical, not a
  pattern: W-206 has no `AuthController` call site of its own, so one namespace covers it.
- `view.auth.resetPassword.*` — the page, mirroring `view.auth.emailVerify.*`'s layout. Its
  resend-cooldown string uses the `%SECONDS%` client-side-substitution form, matching
  `view.auth.emailVerify.resendCooldown`, not the server-side `{{token}}` form.
- `view.admin.userProfile.*` — **only** what the page itself owns: the button label, its confirmation
  prompt, the guidance line explaining when to use it versus Set Password, and a network-error
  fallback. Not the refusal reasons — see below.

**Reused, never duplicated.** Three groups of strings this feature needs already exist, authored by
the policy that produces them. `UserController` calling a `controller.auth.*` string is not a
layering break: the auth layer owns account-status and local-auth policy, and this is a second
consumer of its wording. Duplicating them would give one user two different sentences for the
identical situation depending on which page they happened to be on — the same argument W-205's Phase
3 made when it reused these rather than re-authoring them under `controller.user.*`.

| Situation | Reuse |
|---|---|
| Reset completed, but the account can't sign in | `controller.auth.accountPendingApproval` / `accountSuspended` / `accountTerminated` / `accountInactive` |
| Local sign-in restricted for this account | `controller.auth.localAuthRestricted` |
| Site-wide `disableLogin` | `controller.auth.loginDisabled` |
| Per-IP request limit hit | `controller.auth.rateLimited` |
| Admin send for an unknown id | `controller.user.password.userNotFound` — already reused this way by `emailVerifySend()` |

**The admin refusal reasons are server-side strings, not view strings.** `PASSWORD_RESET_NOT_ELIGIBLE`
returns a translated message the admin page displays via the established
`toast.error(result.error || fallback)` pattern, so the wording lives once, under
`controller.user.passwordReset.notEligible*`, and the view holds no parallel copy of it.

**Removed:** `view.auth.login.forgotPasswordMessage`, the placeholder toast's text.
(`view.auth.login.forgotPassword`, the link label, stays.)

### i18n Audit Coverage

W-119's `webapp/tests/unit/i18n/i18n-usage-audit.test.js` catches a key that exists in code but not
in `en.conf`, which is exactly the failure mode a six-key addition invites. It has two gaps that
together leave every email body in the framework unchecked:

- it scans `webapp/view` and `webapp/controller`, not `webapp/model`
- `extractControllerKeys()` matches `global.i18n.translate(` calls only, and email keys are never
  passed that way — they travel as a `key:` property of the `sendEmailFromTranslation()` argument
  object, resolved inside `EmailController`

So this item closes both, as a Phase 5 deliverable:

1. **Scan `webapp/model` too**, through the same extractor and the same `isValidKey()` check.
2. **Match the `key:` form**, anchored on a namespace root rather than on the bare property name —
   `/key:\s*['"]((?:model|controller|view|utils)\.[^'"]+)['"]/` — so an unrelated `key: 'someId'`
   in a cache or map literal can't be mistaken for a translation reference. The existing
   `// i18n-audit-ignore` directive remains the escape hatch if one ever is.

Verified low-risk before committing to it: `webapp/model/**` contains **no** `global.i18n.translate()`
calls at all, and exactly three namespace-rooted `key:` references — `model.user.emailVerify`,
`.emailChangedNotice`, `.emailChangedAlert`, all three present in `en.conf` today. So the widened
audit goes green on first run against current code (the test fails hard on broken references, which
is the only way this could have bitten), and then covers this item's three new email keys as
Phase 4 adds them. A rename of `extractControllerKeys()` to something server-side-neutral is
optional cosmetics, not part of the change.

---

## Resolved Design Questions

| Question | Resolution |
|---|---|
| Link, code, or both? | Link only — a code would be a second path to the same form, since a reset needs a form either way |
| Link TTL | 1 hour, vs W-205's 24 — this link grants account takeover, not just a flag flip |
| Auto-login after a successful reset? | Yes — but through `_getRequiredSteps()`, so MFA and every other step still run, and only for `status: 'active'` |
| SSO-provisioned accounts (`hasLocalPassword === false`) | No token; an explainer email pointing at their provider. Consistent with W-197's in-session Set Password |
| Non-active accounts | `suspended`/`terminated`: nothing at all. `pending`/`inactive`: reset works, no session, and the page says exactly why they still can't sign in |
| Site with `localAuthRestriction` | Treated like the SSO case for accounts the policy restricts; unaffected for admins on an `admins-only` site, preserving the `?localFallback=1` break-glass path |
| Enumeration | One generic response for every outcome, a detached send so timing doesn't leak, and the "check your mail" screen echoes the user's input rather than a stored address |
| Does a reset prove the email address? | Yes — `emailVerified`/`emailVerifiedAt` are set, otherwise `'required'` mode would immediately mail a second credential asking for proof we just collected |
| Where the reset link points | A page (`/auth/reset-password.shtml?token=`), not an API route, so mail-scanner prefetch cannot consume a single-use token |
| Should other password writes kill an outstanding reset token? | Yes — `changePassword()` and admin `update()` both invalidate it |
| New schema fields? | None |
| Which controller owns the endpoints? | `UserController`, all four — route namespace `/api/1/user/*`, and `signup()`/`changePassword()` (equally pre-login, equally user-account operations) are already there. The login-completion tail stays `AuthController`'s and is called there, exactly as `confirmEmailVerify()` does |
| Where do the policy checks live? | The controller, never the model — W-201's rule, stated in `UserModel.authenticate()`'s own doc comment. One classifier function, two callers |
| A shared `AuthController` helper for the "finish a login outside `login()`" tail? | Yes — `beginAuthenticatedSession()`, public, with `_getRequiredSteps()`/`_completeLoginSession()` private behind it. W-205 rejected a wrapper at two callers; this makes three, and the pendingAuth rule it centralizes is the MFA-bypass risk. `confirmEmailVerify()` migrates onto it (removing the cross-module underscore call); `login()`/`completeExternalAuth()` are untouched. Exact signature confirmed in Phase 3 against both call sites |
| Should the audit gap that leaves email keys unchecked be fixed here? | Yes — W-119's audit extended to `webapp/model` and to the `sendEmailFromTranslation()` `key:` form, in Phase 5. This item adds three more keys to the set nobody checks; the fix is ~10 lines and goes green against current code |
| One config flag or the usual `disableX` + `hideX` pair? | One — `controller.user.disablePasswordReset` plus an `alwaysAllow` entry, following W-195/W-205 rather than the older pair, which lets the UI and the server disagree |
| SMTP not configured | Live `isPasswordResetAvailable()` check (endpoints refuse, login page hides the link), no startup warning — nobody is locked out, so warning on every fresh install would be noise |
| Which translation namespace owns which string? | The module that defines *and* calls it: emails `model.user.*`, all API strings one `controller.user.passwordReset.*` object, page strings `view.auth.resetPassword.*`. Status/restriction/rate-limit refusals reuse the existing `controller.auth.*` strings rather than being re-authored — one wording per situation, whichever page the user is on |
| Admin-initiated reset link | Included in this item (originally deferred): `POST /api/1/user/password-reset/send`, admin-only, honest responses, per-account send limit bypassed, same 1h TTL. Complements W-174's Set Password rather than replacing it |
| Should a reset revoke other active sessions? | Out of scope — no session-store-by-user capability exists today (see below); the "password changed" email is the compensating control |

---

## Implementation Plan

Estimated ~14.5h including tests and docs.

**Phase 1 — Model primitives (~2.5h).** `webapp/model/user.js`: `issuePasswordReset()`,
`verifyPasswordResetToken()`, `resetPasswordByToken()`, `sendPasswordResetSsoNotice()`,
`sendPasswordChangedNotice()`, `invalidatePasswordReset()`, both per-account limiters. Mechanism
only — no status, restriction, `hasLocalPassword`, or feature-availability checks here.
Placed next to the W-205 email-verification block, whose shape they follow.

**Phase 2 — Endpoints, routes, config (~2.5h).** `UserController._classifyPasswordReset()`,
`UserController.isPasswordResetAvailable()`, and the four endpoints; route registration in `webapp/routes.js` (ahead of `/api/1/user/:id`); the
`passwordResetRateLimit` and `disablePasswordReset` entries in `webapp/app.conf` plus the
`contextFilter.alwaysAllow` addition; the `passwordResetAvailable` context value in
`HandlebarController._buildInternalContext()`; the new error codes; `retryAfter` normalized to
seconds at the boundary.

**Phase 3 — Login completion and cross-path invalidation (~1.5h).** The 9-step confirm sequence:
status/restriction gates, then `AuthController.beginAuthenticatedSession()` — written here, with
both call sites in hand, and `UserController.confirmEmailVerify()` migrated onto it in the same
pass so the two paths can't drift. Plus the `invalidatePasswordReset()` calls in `changePassword()`
and `update()`. The W-205 email-verify tests must stay green untouched; that is the signal the
migration was behavior-preserving.

**Phase 4 — Views, emails, i18n (~4h).** `/auth/reset-password.shtml` (five states), the
`login.shtml` link swap, the admin Security-panel button and its outcome handling, and all new
strings in `en.conf` + `de.conf` including the three email bodies.

**Phase 5 — Tests and docs (~3.5h).** `webapp/tests/unit/model/user-password-reset.test.js` and
`webapp/tests/unit/controller/user-password-reset-endpoints.test.js` (the classifier gets its own
describe block — it is the single point both request paths depend on); the i18n audit extension
described under `### i18n Audit Coverage`, which is where this item's own new keys get their
safety net; then
`docs/security-and-auth.md` (a "Password Reset" subsection + three rows in the rate-limiting table),
`docs/api-reference.md` (the four endpoints), this doc's status, and W-206's
`features`/`deliverables` in `docs/dev/work-items.md`.

### Highest-risk items

1. **The confirm endpoint's gate sequence.** Getting steps 5-9 wrong turns a recovery feature into an
   MFA/status bypass, and it is the kind of bug that tests pass over if they only assert the happy
   path. The tests for "MFA still required after reset" and "suspended account gets no session" are
   the two that matter most in this item.
2. **Detached sends.** A promise nobody awaits must never be able to reject unhandled. Both mail
   helpers swallow and log their own errors (the W-205 methods already do), and the tests assert the
   endpoint resolves before the send settles.
3. **The five-state page.** Most of the UX risk lives here — particularly the expired-link state,
   which is the one a real user hits most often and the one most likely to become a dead end if the
   "send me a new one" path isn't wired back to the request state.

---

## Test Plan

| # | Case | Expected |
|---|---|---|
| 1 | Request for an active local account | token stored (TTL 3600), reset mail queued, generic 200 |
| 2 | Request for an unknown identifier | no token, no mail, byte-identical response to #1 |
| 3 | Request by username vs by email | both resolve to the same account; mail goes to the stored address either way |
| 4 | Request for an SSO account (`hasLocalPassword: false`) | no token; `passwordResetSso` mail; generic 200 |
| 5 | Request under `localAuthRestriction: 'admins-only'`, non-admin vs admin | explainer mail vs real reset link |
| 6 | Request for `suspended`/`terminated` | no token, no mail at all, generic 200 |
| 7 | Request with `disableLogin: true` | 403 `LOGIN_DISABLED`, no lookup performed |
| 8 | 4 requests in 10 min for one account | 4th returns the generic message but issues nothing (per-account limiter) |
| 9 | 11 requests in 5 min from one IP | 11th returns 429 `RATE_LIMITED` with `retryAfter` in **seconds** |
| 10 | Request endpoint response time, existing vs nonexistent account | no SMTP-scale difference — the send is not awaited |
| 11 | Probe with a valid token | `{ valid: true }`, token still usable afterwards |
| 12 | Probe twice, then confirm | confirm still succeeds — the probe never consumes |
| 13 | Probe/confirm with a malformed, unknown, or foreign-userId token | `PASSWORD_RESET_INVALID_TOKEN` |
| 14 | Confirm after the TTL elapsed | `PASSWORD_RESET_EXPIRED` |
| 15 | Confirm twice with the same token | second attempt `PASSWORD_RESET_INVALID_TOKEN` |
| 16 | 6 bad confirms in 15 min | 6th returns 429 `PASSWORD_RESET_RATE_LIMITED` |
| 17 | Confirm with a password below `passwordPolicy.minLength` | `PASSWORD_POLICY_ERROR`, token **not** consumed |
| 18 | Successful confirm, active account, no MFA | password updated, `hasLocalPassword: true`, session created, token gone |
| 19 | Successful confirm, active account, **MFA enabled** | `{ nextStep: 'mfa', page }`, **no session** until MFA completes |
| 20 | Successful confirm, `pending`/`inactive` account | password updated, no session, response names the status |
| 21 | Successful confirm for an unverified account | `emailVerified: true` + `emailVerifiedAt` stamped; no verification mail is sent afterwards |
| 22 | Successful confirm in `'required'` email-verification mode | no `email-verify` step is pushed (#21 is why) |
| 23 | Successful confirm | `passwordChanged` notice mailed; failure to send does not fail the reset |
| 24 | Confirm while the session holds a stale `pendingAuth` for another user | discarded, not merged |
| 25 | Self-service `changePassword()` / admin password set with a reset token outstanding | token invalidated |
| 26 | Redis unavailable | requests fail open on limiting but issue nothing usable; confirm fails closed |
| 27 | Login page under each `localAuthRestriction` mode | "Forgot password?" hidden with the local form, shown in `?localFallback=1` |
| 28 | `de.conf` parity | every new key present; audit logs no missing-key warning |
| 29 | `disablePasswordReset: true` | all four endpoints 403 `PASSWORD_RESET_UNAVAILABLE`; login page renders no link |
| 30 | SMTP unconfigured, then configured, no restart | same refusal as #29 while unconfigured; works on the very next call once configured — `isPasswordResetAvailable()` never caches |
| 31 | `_classifyPasswordReset()` across every account shape | one verdict per row of the "Who Can Reset" table — the single test that pins both request paths at once |
| 32 | Admin send for an eligible user | mail sent, 200 naming the masked address, logged with the acting admin's username |
| 33 | Admin send for an SSO / restricted / suspended / terminated user | 409 `PASSWORD_RESET_NOT_ELIGIBLE` carrying the specific `reason`; no mail |
| 34 | Admin send 4 times inside 10 minutes | all four send — the per-account limiter is bypassed for admins |
| 35 | Admin send from a non-admin session | refused by `requireAdminRole()` before the controller runs |
| 36 | Admin send for an unknown id | 404 `USER_NOT_FOUND` |
| 37 | Extended i18n audit over `webapp/model` | all six `model.user.*` email keys resolve; a deliberately misspelled one fails the test |
| 38 | Extended i18n audit against a `key: 'someId'` literal | not reported — the namespace anchor keeps non-translation properties out |
| 39 | W-205's email-verify suite after the `beginAuthenticatedSession()` migration | green with no test edits — the refactor preserved behavior |

**As built:** the 39 above landed as 71 cases across three files — 24 model, 40 controller, 7 for
`beginAuthenticatedSession()` itself, which earned its own file once it became a public method with
a contract of its own to pin. Case 39's "no test edits" did not survive contact: the W-205 endpoint
suite mocked `_getRequiredSteps()` and `_completeLoginSession()` directly, so hiding them behind the
facade necessarily rewrote those mocks. The endpoint's *behavior* is unchanged and its assertions
still say the same things — only the seam they mock at moved, which is the seam the migration
existed to move. Whole unit suite green (113 suites, 2977 tests) via `npm run test:unit`; note that
this suite must be run with `--runInBand`, as it is configured to be — several files share globals
and fail spuriously under parallel workers, which predates this item.

Left to a manual pass against real SMTP: deliverability and rendering of all three mails in Gmail,
Apple Mail, and Outlook (confirming the bare reset URL auto-links and doesn't wrap); an
Outlook-Safe-Links-style prefetch of the reset URL followed by a real human click (the token must
still work); the full request → mail → set → auto-login round trip on a second device; and the
MFA-enabled variant of the same, confirming the MFA prompt appears before any session exists. Also
one admin pass: send a link from the Security panel, confirm it arrives and works end to end for the
user, and confirm the button reports the refusal reason (rather than a generic error) for an SSO and
a suspended account.

---

## Out of Scope / Future Work

- **Revoking other active sessions on reset.** The standard companion to a password reset, and
  deliberately not attempted here: the session store offers no way to enumerate a given user's
  sessions, so this needs its own work item (session registry keyed by userId, or a
  `passwordChangedAt` stamp compared against session issue time on every request). Until then the
  "your password was changed" email is the compensating control — it makes a silent takeover noisy.
- **A "password reset" audit surface.** Requests and confirms are logged (`user.passwordReset*`, via
  the standard `LogController` calls) and visible in Admin → Logs; nothing aggregates them.
- **W-205's `retryAfter` unit bug (adjacent, not fixed here).** `cacheCheckRateLimit()` returns
  milliseconds; `UserController.emailVerifySend()`/`emailVerify()` pass that value through unchanged
  and `email-verify.shtml`'s `startResendCooldown(seconds)` renders it as seconds, so an exhausted
  resend budget displays a cooldown roughly 1000x too long. W-206 avoids the same mistake by
  converting at the boundary (as W-204 does), but the one-line W-205 fix belongs to whoever owns that
  item — flagged here so it isn't lost.
- **Password strength feedback** beyond the existing `minLength` policy hint (a meter, breach-list
  checking) — a `passwordPolicy` enhancement, not a reset-flow one.

---

## Related Work Items

- **W-205** — email confirmation; every primitive this item reuses, and the doc whose shape this one
  follows. Its "Out of Scope" section names password reset as the intended next consumer
- **W-204** — login rate limiting; the per-IP limiter shape and the `app.conf` block copied here
- **W-201** — account status enforcement centralized in `login()`; the reason the confirm endpoint has
  to re-check status itself
- **W-197** — auth-oauth plugin; the source of the "SSO users set a password in-session, not by mail"
  position
- **W-195** — external-auth helpers: `hasLocalPassword`, `localAuthRestriction`,
  `completeExternalAuth()`/`_completeLoginSession()`
- **W-174** — the admin user-profile panels, including the hardcoded Security panel and its Set
  Password override, which the admin-send button joins
- **W-109** — multi-step login flow; the `nextStep`/`page` contract the reset page speaks
- **W-143** — Redis cache infrastructure; token and rate-limit wrappers
- **W-119** — the i18n usage audit tests this item extends to `webapp/model` and to the
  `sendEmailFromTranslation()` `key:` form
- **W-087** — email sending strategy; its original use-case list named password reset first

---

**Last Updated:** 2026-08-09
