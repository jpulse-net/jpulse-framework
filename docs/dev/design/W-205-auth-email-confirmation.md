# W-205: auth: signup with email confirmation

## Status

🚧 IN PROGRESS — spec solidified 2026-08-02. All open questions from W-198's tech-debt handoff
are resolved below (see `## Resolved Design Questions`).

- ✅ Phase 0 (shared plumbing) — 2026-08-03
- ✅ Phase 1 (model primitives) — 2026-08-03
- ✅ Phase 2 (auth controller wiring) — 2026-08-03
- ✅ Phase 3 (confirm route + user endpoints) — 2026-08-03
- ✅ Phase 4 (signup + admin email change) — 2026-08-03
- ✅ Phase 5 (views + email templates) — 2026-08-03
- ✅ Phase 6 (startup safety) — 2026-08-04
- ✅ Phase 7 (tests + docs) — 2026-08-04

Phase 1 deviates from the plan below in one way worth flagging: `issueEmailVerification()` calls
`EmailController` (originally `sendEmailFromTemplate()`, now `sendEmailFromTranslation()` — see the
post-Phase-5 correction below) via a *dynamic* `import()` rather than a static one, to avoid a
circular import (`model/user.js` → `controller/email.js` → `controller/handlebar.js` →
`controller/auth.js` → `model/user.js` — the first time a model has ever called into a
controller in this codebase). This is the same technique `email.js` already uses for
`metrics-registry.js`, and resolves immediately since it only runs long after bootstrap has
finished loading every module.

Phase 2 deviates from the plan in one way: the `EMAIL_VERIFY_INVALID_CODE`/`EMAIL_VERIFY_EXPIRED`/
`EMAIL_VERIFY_RATE_LIMITED` distinction from the model layer is preserved in the translated
*message text* returned inside the `STEP_FAILED` envelope, but not in the envelope's `code` field
itself - it stays `STEP_FAILED` for every step-validation failure, matching the existing
`auth-mfa` plugin's precedent (wrong TOTP vs. lockout are equally folded into one generic
`STEP_FAILED`/400 there). The distinct `EMAIL_VERIFY_*` codes are used verbatim, however, on the
resend early-return (`429` with `retryAfter`) and will be on Phase 3's standalone endpoints, since
neither goes through the shared step-failure envelope. The `emailVerify*` message/nag strings
Phase 2 itself needed were added to `en.conf`/`de.conf` now (not deferred to Phase 3, which adds
its own, separate set for the confirm route and standalone endpoints).

Phase 3 resolves the "original destination" gap flagged in the Security Considerations table (the
confirm link's onward `redirect` needing validation) differently than a literal reading of that row
suggests, and deliberately simpler than first planned:

- **No `redirect` query param on the mailed confirm link at all.** The destination instead rides
  `session.pendingAuth.redirect`, captured once - and validated once, at write time, by a new
  `CommonUtils.isSafeRedirectUrl(req, url)` (the server-side counterpart to `jPulse.url.isInternal()`,
  which never had one because no server code had ever needed to act on a redirect value before) -
  when the credentials step first sees `stepData.redirect` from the client (`login.shtml`'s own
  `?redirect=` param, now threaded through the request body) or when `completeExternalAuth()` computes
  `finalRedirect` for an SSO login. Both are the exact places a real destination is ever known
  server-side. `pending.redirect`'s lifetime is, by construction, identical to the window in which
  the confirm route could ever use it - once `pendingAuth` is gone or belongs to a different step,
  the confirm route already falls through to the generic "verified, you can continue" landing page
  regardless, so there is no scenario where a URL-embedded copy would ever be needed as a fallback.
  This removes a whole class of "validate the link's own param" concern instead of adding one: the
  mailed link is just `?token=...`, nothing else, and is therefore identical across signup, auto-issue,
  and resend. Re-validated defensively a second time, at read time in the confirm route right before
  the 302, since that is the one call site that actually emits a `Location` header from it.
- `AuthController._getRequiredSteps()`/`issueEmailVerification()` did **not** need a `redirectUrl`
  parameter after all, for the same reason - only the confirm route ever consumes `pending.redirect`,
  and it reads it from the session, not from anything threaded through the model/email layer.
- The confirm route (`UserController.confirmEmailVerify`) reuses `AuthController._getRequiredSteps()`
  and `_completeLoginSession()` directly (both already `static`, and `completeExternalAuth()` already
  sets the precedent of a second controller driving these two methods to finish a login outside
  `login()`'s own body) rather than adding a new intermediate wrapper - the confirm route's own
  branching (only touch `pendingAuth` when it matches this user *and* `email-verify` is the current
  step) is bespoke enough that a generic "continue pending step" helper would not simplify it.
- The two authenticated endpoints (`emailVerify`, `emailVerifySend`) live on `UserController`
  (`/api/1/user/email-verify*`, matching their route namespace) rather than `AuthController`, and
  reuse the Phase 2 `controller.auth.emailVerifyInvalidCode/Expired/RateLimited` strings for their
  failure responses rather than duplicating them under `controller.user.emailVerify.*` - same
  meaning, same wording, one source of truth for a user reading both surfaces in sequence (blocked
  at login, then later self-service in `nag` mode).

Phase 4 adds two new `UserModel` methods, `sendEmailChangedNotice()`/`sendEmailChangedAlert()`,
mirroring `issueEmailVerification()`'s established shape (dynamic import of `EmailController`,
`i18n.translateForUser()`, non-fatal try/catch). Both reference
`controller.user.emailChanged{Notice,Alert}.{subject,body}`, which - like `emailVerify.subject`/
`.body` since Phase 1 - do **not** exist in `en.conf`/`de.conf` yet: confirmed the i18n usage-audit
test (which would otherwise catch a "broken reference," as it did for Phase 2's `controller.auth.*`
strings) only scans `global.i18n.translate()` call sites, never `translateForUser()`, so leaving
these for Phase 5 (which adds the actual `.tmpl` files alongside their copy) is safe and matches
precedent rather than being an oversight. `UserController.signup()` awaits
`issueEmailVerification()` before responding (adding at most one SMTP round-trip to signup latency)
rather than firing it without awaiting, for consistency with the rest of that function's fully
sequential/awaited style (e.g. the `onUserAfterSave` hook immediately above it) - a send failure
still can't fail signup, since the method already swallows its own errors. `UserController.update()`
resets `emailVerifiedAt` to `null` alongside `emailVerified: false` on the same email change, since
Data & State's whole point of the field is telling "grandfathered" apart from "actually proved" -
leaving a stale proof date on the account's *old*, no-longer-current email would defeat that.

Phase 5 adds the actual UI/copy: `/auth/email-verify.shtml` (single page serving mid-login
pendingAuth, authenticated self-service "nag" mode, and the confirm link's `?status=verified|
expired|invalid` landings - including the cross-device "am I verified yet" poll, originally a
`step: 'email-verify', poll: true` branch on `AuthController.login()`, moved to its own
`GET /api/1/auth/pending-status` endpoint post-Phase-7 (see the correction note below) - both
share the exact `nextStep`/`page` contract as a successful code submission so the waiting tab
treats them identically); the status line in `settings.tmpl` (hidden entirely when the policy is
`'off'`); the
verified/unverified badge in `admin/users.shtml`'s email cell (same hide-when-`'off'` rule, needs
`controller.user.emailVerification` added to `app.conf`'s `contextFilter.alwaysAllow` since
`appConfig.controller.*` is otherwise stripped from page context); and the `emailVerified` checkbox
+ read-only "verified on" line in `admin/user-profile.shtml`. One refinement surfaced while wiring
the checkbox: `UserController.update()`'s reset condition changed from `updateData.emailVerified
=== undefined` (Phase 4) to `!== true`, since the checkbox now always submits its current state
(not just when touched) - gating on "not explicitly true" rather than "absent" keeps both that UI's
explicit-override checkbox and direct API callers working the same way, and the update response
gained an `emailVerifiedReset` flag so the admin page can toast an explanation rather than leaving
the admin to wonder why a checkbox they left checked came back unchecked after reload. Phase 5
originally created three `.tmpl` files as thin `{{body}}` wrappers per the "one primitive"
precedent noted above, with subject/body for all three (`email-verify`, `email-changed-notice`,
`email-changed-alert`) in `en.conf`/`de.conf` under `controller.user.emailVerify.{subject,body}`
and `controller.user.emailChanged{Notice,Alert}.{subject,body}` — both the `.tmpl` files and this
namespace were superseded by the post-Phase-5 correction below.

**Post-Phase-5 correction: email format simplified to translation-only, no `.tmpl` files.**
Reviewing the asset-path convention (assets mirror the *view* that uses them, e.g.
`webapp/view/jpulse-docs/` ↔ `webapp/static/assets/jpulse-docs/`) surfaced that
`webapp/static/assets/email/*.tmpl` didn't fit: no view uses these files, only `model/user.js`
does, and — worse — `webapp/static/` is served directly by nginx in production
(`templates/deploy/nginx.prod.conf`) with no `.tmpl` filtering, so framework template files there
are readable raw text in prod (a site's own `site/webapp/static/` is not exposed this way, which
is why the framework's own pre-existing `sendEmailFromTemplate()` convenience method — still used
by, e.g., `site/webapp/static/assets/contact/email.tmpl` — was never itself a problem; it only
became one for *framework-owned* templates). Investigating this also found the `.tmpl` files were
never actually reachable: `templatePath: 'email/email-verify.tmpl'` was missing the `assets/`
prefix `PathResolver.resolveAsset()` requires, so all three sends were silently failing with
`TEMPLATE_ERROR` since Phase 5 landed.

Rather than fix the path bug and invent a new template-placement convention, the email body is now
defined entirely in the translation file, unix-mail style — one translation key holds the whole
message (`Subject: …` header line, blank line, body), and `EmailController.
sendEmailFromTranslation(req, { user, key, context, to })` parses and sends it directly, with no
`.tmpl` file or `PathResolver` involved at all. `model.user.emailVerify` (etc.) changed from a
`{ subject, body }` object to a single string leaf; see `### i18n` below for the full format and
rationale, and `### Email templates` for why file-based templates were dropped instead of fixed.
This also folds in three smaller fixes made at the same time:
- `i18n.js`'s `_translate()`/new `substitute()` had a latent bug (`context[p1] || match`) where a
  legitimately falsy substitution value (e.g. an empty `firstName`) fell back to the literal
  `{{firstName}}` placeholder instead of substituting the empty string; fixed to `p1 in context ?
  context[p1] : match`.
- `sendEmail()`'s derived-HTML branch (escape → linkify → `<br/>`, added in Phase 0) is removed
  entirely rather than fixed further — see `### Email templates` below for why plain-text-only is
  preferred over any auto-derived HTML, once the plain-text-with-bare-URL decision was re-examined
  in this light.
- `apiSend()` (the authenticated `POST /api/1/email/send` endpoint) had its own separate, duplicate
  derived-HTML call; removed for the same reason and to keep the two send paths consistent.

A later refinement (still within the translation-only design above, no further correction needed):
`EmailController.ALLOWED_EMAIL_HEADERS` was broadened from `Subject`-only to the common envelope
headers (`Subject`, `To`, `Cc`, `Bcc`, `Reply-To`, `From`, matched case-insensitively), each
individually overridable by a matching `sendEmailFromTranslation()` option
(`to`/`cc`/`bcc`/`replyTo`/`from`) - a translation-supplied header is always just a *default*. This
was for future flexibility (e.g. a default `Cc:` on some later email), not something W-205's three
emails need today; none of `emailVerify`/`emailChangedNotice`/`emailChangedAlert` set anything but
`Subject:`. The header-injection protection is unaffected: headers still only ever come from the
literal translation text or the caller's explicit options, never from `context` substitution.

**Phase 6 — Startup safety, as built.** Two cooperating pieces, split the same way
`checkLocalAuthRestrictionSafety()` (W-195) is split from its own call site, but with one
deliberate difference from that precedent: the actual policy value is *never* frozen into
`appConfig` at boot.
- `UserModel.getEmailVerificationPolicy()` (`webapp/model/user.js`) is the one place the degrade
  rule lives: reads `controller.user.emailVerification` (default `'required'`) and returns `'nag'`
  instead whenever it's `'required'` but `global.EmailController.isConfigured()` is false. All
  three call sites that gate on this policy - `AuthController._getRequiredSteps()`,
  `AuthController._completeLoginSession()`, `UserController.signup()` - now call this instead of
  reading `global.appConfig` directly. Because it re-evaluates live on every call rather than
  reading a boot-time snapshot, an admin who fixes SMTP after startup gets `'required'`
  enforcement back immediately, with no restart - this was an explicit requirement, not an
  oversight (see the pre-existing `SMTP safety valve` paragraph above), so unlike
  `checkLocalAuthRestrictionSafety()`'s in-place `appConfig` mutation, this function does not
  touch `appConfig` at all.
- `checkEmailVerificationSafety()` (`webapp/utils/bootstrap.js`, called right after
  `EmailController.initialize()` in the bootstrap sequence, since it needs
  `EmailController.isConfigured()`) exists purely to make the degraded state visible at startup -
  logging the same loud, non-throwing warning `checkLocalAuthRestrictionSafety()` does, but never
  mutating `appConfig`, since the live check above already handles the actual behavior. A site
  that starts with `'required'` and no SMTP sees the warning once at boot and again never (no
  periodic re-check) - fixing SMTP silences future confusion but doesn't retroactively un-log the
  original warning, which is fine since it already told the admin what to fix.

This matches the plan's "SMTP-vs-`'required'` check in `bootstrap.js` following
`checkLocalAuthRestrictionSafety()`'s non-throwing pattern, plus the runtime degrade" - the
runtime-degrade half just turned out to need its own always-live function rather than living
inside the bootstrap check itself, precisely because the "no restart needed" requirement rules out
freezing the answer at boot.

**Phase 7 — Tests and docs, as built.** Unit-test coverage added 2026-08-04. New/extended test
files:
- `webapp/tests/unit/model/user-email-verification.test.js` (new) - the model primitives:
  `hasValidEmailVerification()`, `issueEmailVerification()` (both TTLs, the send limiter,
  send-failure-never-throws), `verifyEmailByToken()`/`verifyEmailByCode()` (both limiters, both
  expiry/invalid-vs-wrong distinctions, the shared `_completeEmailVerification()` flip+stamp+
  invalidate-both-secrets path), and `sendEmailChangedNotice()`/`sendEmailChangedAlert()`.
- `webapp/tests/unit/model/user-uniqueness-db.test.js` (extended) - the absent-field
  `emailVerified`/`emailVerifiedAt` backfill in `ensureIndexes()`: pins the exact filter/`$set`
  shape, confirms a second run is a no-op, and confirms an explicit `false` is structurally immune
  (the filter itself is what protects it).
- `webapp/tests/unit/controller/auth-controller.test.js` (extended) - `_getRequiredSteps()`
  across all three policy modes (including the priority-50-vs-100 sort against a plugin `mfa`
  step, and the no-re-issue-when-still-valid rule) and `_completeLoginSession()`'s `'nag'`
  toast (and its absence in `'required'`/`'off'`, and once already verified).
- `webapp/tests/unit/controller/user-email-verify-endpoints.test.js` (new) - the three
  `UserController` endpoints: `emailVerify()`, `emailVerifySend()` (including the
  already-verified/grandfathered no-send short-circuit), `confirmEmailVerify()` (same-browser
  mid-login advance/complete, cross-account `pendingAuth` isolation, the redirect-validation
  fallback, and the no-`page`/exception fallbacks), and `update()`'s admin email-change reset
  rule (reset+notices, the explicit-`true` override, the no-email-change no-op, and the
  `EMAIL_EXISTS` conflict).

Deliberately left to manual/exploratory testing rather than unit tests - anything needing a real
multi-request session across two HTTP calls (the actual `login()` → `email-verify` step →
`confirmEmailVerify()` round trip), a real clock (TTL expiry), a real SMTP server (deliverability,
client rendering), or two browsers/devices at once. See the "Test Plan" table below, and its
closing paragraph, for the specific cases and a manual pass checklist.

**Docs, as built (2026-08-04).** `docs/security-and-auth.md` gained an "Email Verification"
subsection (policy modes, the SMTP safety valve, grandfathering, the admin email-change reset
rule) plus two new rows in the App-Level Rate Limiting table; `docs/api-reference.md` gained an
"Email Verification" endpoint section (`confirm`/verify-by-code/resend) and corrected the stale
W-198-era `emailVerified` note on the user-update endpoint (it no longer describes an absent field
as verified - see the startup backfill above). `webapp/static/assets/jpulse-docs/*` needed no
separate edit - those files are hard-linked to their `docs/` counterparts (same inode), not
copies. `webapp/app.conf`'s `emailVerification` comment, which pointed at this internal design doc
(inaccessible to site admins), now points at `docs/security-and-auth.md#email-verification`
instead. Two stale `webapp/model/user.js` comments predating the Phase 7 backfill (still describing
the old W-198 "absent reads as grandfathered, no migration needed" behavior) were corrected to
describe the actual startup-backfill behavior. W-205's `features`/`deliverables` in
`docs/dev/work-items.md` were filled in (status left untouched, per standing instructions).

**Post-Phase-7 correction — cross-device poll moved off `login()` (2026-08-06).** Manual testing
surfaced a bug in the Phase 5 cross-device poll: the waiting tab's background poll (originally
`POST /api/1/auth/login` with `{ step: 'email-verify', poll: true }`) shared that endpoint's
per-IP `loginRateLimit` (Node-level) and, in production, nginx's stricter 5-req/min `login` zone -
both scoped to real credential-guessing attempts, not a benign "am I verified yet" read. A few
minutes of the client's 4s polling was enough to trip `429 RATE_LIMITED`, and the client had no
handling for that error, so it kept silently re-polling forever. Fixed by extracting the poll onto
its own `GET /api/1/auth/pending-status` endpoint (`AuthController.pendingStatus()`) with
deliberately no app-level rate limit of its own - it relies on nginx's generic `api` zone only,
the same way `GET /api/1/auth/status` already does. `login()`'s inline poll branch was removed
entirely; the shared "which step is still outstanding, and what's its timeout" logic it used was
extracted into `AuthController._getExpectedStep()`/`_pendingAuthTimeoutMs()` so both `login()` and
`pendingStatus()` apply the identical rule. Client-side (`email-verify.shtml`): polling interval
widened from 4s to 8s, and a consecutive-failure counter now stops auto-polling (falling back to
the always-visible manual "Check now" button) after 3 failures in a row, rather than retrying
forever in the background. `templates/deploy/nginx.prod.conf` gained a comment calling out that
`/api/1/auth/status` and `/api/1/auth/pending-status` are deliberately excluded from the `login`
zone's regex. See [REST API Reference — Pending Auth Status](../../api-reference.md#pending-auth-status)
and [Security & Authentication](../../security-and-auth.md#rate-limiting) for the resulting public
contract and rate-limit posture.

**Post-Phase-7 correction — shared-session polling tab, and warnings lost across a redirect
(2026-08-06).** Further manual testing (pasting the confirm link into a *second window sharing
the same session*, e.g. two tabs in the same incognito profile) surfaced two more gaps:

1. When the second window's `confirmEmailVerify()` call finishes the login (`_completeLoginSession()`
   sets `session.user` and deletes `session.pendingAuth` together), the *first* window's still-running
   `pendingStatus()` poll found no `pendingAuth` and returned `NO_PENDING_AUTH`, which the client
   rendered as a dead-end "nothing to verify, please sign in" - misleading, since that browser's
   session was in fact already fully authenticated (same cookie, shared by both windows). Fixed by
   having `pendingStatus()` check `req.session.user?.isAuthenticated` first and, if already true,
   return `{ success: true, nextStep: null }` immediately - the same "all done" shape the client
   already redirects on, so the first window now lands on the destination too instead of a dead end.
2. The MFA-nag toast that `_completeLoginSession()` generates was silently lost whenever login
   completed via a plain server redirect rather than the AJAX `login()` call - both
   `UserController.confirmEmailVerify()` (email confirm-link click) and the pre-existing
   `AuthController.completeExternalAuth()` (OAuth/LDAP/SAML plugin callbacks) call
   `_completeLoginSession()` and then just `res.redirect(destination)`, discarding the returned
   `warnings`. The client's only toast-delivery path, `jPulse.url.redirect(url, {toasts})`, queues via
   `sessionStorage` - a browser API Node has no access to from a server-issued `302`, so there was no
   existing mechanism to carry a toast across a *server* redirect at all. Fixed with a small,
   generic addition rather than a one-off patch: `CommonUtils.appendToastsToUrl(url, warnings)`
   base64-encodes the warnings into a `toasts` query param (no-op when there are none); the
   `jpulse-common.js` `dom.ready()` bootstrap decodes and shows it the same way it already shows the
   `sessionStorage` queue, then strips the param via `history.replaceState` so it never lingers in the
   address bar/history. Both `confirmEmailVerify()` and `completeExternalAuth()` now route their final
   redirect through it.

**Post-Phase-7 correction — the two fixes above still didn't surface the nag in either window
(2026-08-06).** The very next manual test (same two-window setup) still showed no MFA nag in
*either* window, exposing two more bugs, one in each of the two fixes just made:

1. `CommonUtils.appendToastsToUrl()`'s `toasts` param never survived to `/home/`: `confirmEmailVerify()`'s
   destination defaults to `/` (no explicit `redirect` was captured for this signup), and
   `webapp/routes.js`'s `router.get('/', ...)` unconditionally issues its own `res.redirect('/home/')` -
   a *second*, hard-coded redirect that discarded the query string (and therefore the `toasts` param)
   entirely. Fixed by having that handler forward its own incoming query string onto `/home/`.
2. The confirm-link window's own `_completeLoginSession()` call is a completely different HTTP
   request than the *waiting* window's `pendingStatus()` poll - the `{ success: true, nextStep: null }`
   shortcut added by the previous correction had nothing to say about warnings, because the poll
   never actually ran `_completeLoginSession()` itself (that already happened, in the *other* window's
   request) and so never saw its `warnings` return value. Fixed by having `_completeLoginSession()`
   also stash non-empty warnings onto `req.session.pendingWarnings` (self-cleaning - overwritten or
   deleted on every call, so nothing accumulates across logins); the `pendingStatus()` shortcut now
   drains (reads then deletes) that stash and includes it as `warnings` in its JSON response, which
   `email-verify.shtml`'s existing `handleStepResult()` already spreads into the toast list it queues
   via the client-side `jPulse.url.redirect(dest, {toasts})` - unaffected by the `/` → `/home/` hop
   above, since `sessionStorage` survives any number of intermediate redirects.

## Objectives

- Confirm that a local signup's email address is actually controlled by the person signing up.
  This is the missing half of W-198: that work item added the `emailVerified` primitive and closed
  the auth-oauth account-takeover by making the field default to `false`, but nothing in the
  framework can ever flip it to `true`, and no email is ever sent.
- Make it optional via an appConfig setting, so sites that don't want the extra step (intranet,
  admin-provisioned user base, no SMTP) can turn it off or soften it to a reminder.
- Close the secondary abuse of the same gap: email squatting as denial-of-service, where anyone can
  pre-claim a real address on a dummy account and permanently block the real owner from signing up.

**Design principle:** secure by default, frictionless for the user. Every decision below that trades
a little implementation complexity for one fewer user action is taken deliberately — the feature
sits directly in the signup and login path, where friction is most expensive.

---

## What Already Exists (built by prerequisites)

Almost all the infrastructure is already in place. This work item is mostly wiring plus one new page
and three email templates.

| Piece | Where | State |
|---|---|---|
| `emailVerified` field | `webapp/model/user.js` `baseSchema` (~line 67) | ✅ default `false` for new signups; **missing** field = grandfathered/verified |
| Policy config flag | `webapp/app.conf` `controller.user.emailVerification` (~line 359) | ✅ scaffold, default `'required'`, enforced nowhere |
| Admin write access | `webapp/controller/user.js` `adminFields` (~line 674) | ✅ API accepts it; **no UI control exists** |
| Multi-step login flow | `webapp/controller/auth.js` `_getRequiredSteps()` / step loop / `_completeLoginSession()` | ✅ generic, core checks can push steps directly (W-109 Scenario 7 precedent) |
| Client step routing | `webapp/view/auth/login.shtml` `handleNextStep()` (~line 515) | ✅ `case 'email-verify'` stub already redirects to `/auth/email-verify.shtml` |
| Warning → toast delivery | `_completeLoginSession()` warnings array + W-110 toast queue | ✅ nag messages need no client work |
| Template email sending | `EmailController.sendEmailFromTemplate()` (`webapp/controller/email.js`) | ✅ ready, **zero callers today** — originally planned as this item's first caller, superseded by the new `sendEmailFromTranslation()` (see the post-Phase-5 correction) |
| Token storage + TTL | `RedisManager.cacheSetToken()` / `cacheGetToken()` / `cacheDeleteToken()` | ✅ |
| Rate limiting | `RedisManager.cacheCheckRateLimit()` (fails open when Redis is down) | ✅ |
| Admin list data | `UserController._filterPublicProfileFields()` (~line 921) | ✅ admins already receive the whole user document minus `passwordHash` — no API change needed for the users table |

**Not existing, must be created:** `/auth/email-verify.shtml`, `EmailController.sendEmailFromTranslation()`
(no translation-based email had ever existed in this repo before this item — see the post-Phase-5
correction for why file-based `.tmpl` templates, the original plan, were dropped instead), the
confirm route, and the two admin UI surfaces.

---

## Architecture

### Core, not a plugin

Per W-198's handoff note: "the signup email isn't fake/squatted" is a baseline correctness property
of local signup, which is itself core. A plugin would default OFF for most installs, leaving the
squatting DoS open by default on every site that doesn't install it.

A second, independent reason surfaced during design: the admin UI this feature needs lives in
`webapp/view/admin/users.shtml` and `webapp/view/admin/user-profile.shtml`, both of which hand-code
every field they show (`user-profile.shtml` says so explicitly at ~line 518: "Administrative and
Security stay hardcoded"). A plugin could only reach those by overriding framework views — far worse
coupling than adding a field to the framework's own admin page.

### One primitive, three call sites

Verification logic lives once, in the model layer, and is invoked from three surfaces:

```
UserModel (model layer — the only place that knows how codes/tokens work)
    issueEmailVerification(req, user)     → generate link token + code, store, send
    verifyEmailByToken(req, token)        → link path
    verifyEmailByCode(req, userId, code)  → code path
    (both flip emailVerified = true, invalidate BOTH secrets, log)

Call site 1 — BLOCKING login step ('required' mode)
    POST /api/1/auth/login  { step: 'email-verify', code | resend }
    Rides the existing single login endpoint, per W-109's convention (auth-mfa's standalone
    verify endpoint was deliberately removed in favour of this). Uses session.pendingAuth.

Call site 2 — LINK CLICK (any device, no session needed)
    GET /api/1/user/email-verify/confirm?token=...
    Flips the flag from any browser. Completes a pending login only if the request happens to
    carry the matching pendingAuth session cookie.

Call site 3 — AUTHENTICATED self-service ('nag' mode, or post-admin-reset)
    POST /api/1/user/email-verify        { code }
    POST /api/1/user/email-verify/send
    Uses session.user; needed because a logged-in user has no pendingAuth to ride.
```

### Insertion points in the existing login flow

Three precise edits to `webapp/controller/auth.js`, all at existing shared choke points:

1. **`_getRequiredSteps()` (~line 215)** — push the core step before the `onAuthGetSteps` hook runs:
   `{ step: 'email-verify', priority: 50, page: '/auth/email-verify.shtml', data: { email: masked } }`.
   Priority 50 places it ahead of MFA's 100, matching W-109's priority table (verification before
   2FA). Because this one method serves both `login()` and `completeExternalAuth()`, SSO logins are
   covered with no extra code.
2. **Step-validation branch (~line 668-691)** — core validation runs *before* the
   `onAuthValidateStep` hook, since no plugin claims `email-verify` and the hook would otherwise
   return `valid: false` → `STEP_FAILED`. Mirrors the existing inline special-case for the
   `mfa-backup` alternative step (~line 655).
3. **`_completeLoginSession()` (~line 266)** — core pushes the nag warning into the same `warnings`
   array the `onAuthGetWarnings` hook contributes to.

---

## Policy Semantics

`controller.user.emailVerification` — `'off' | 'nag' | 'required'`, default `'required'`.

| Mode | Signup email | Login | Nag | Notes |
|---|---|---|---|---|
| `off` | none | never gated | none | `emailVerified` left untouched; no verification path offered anywhere |
| `nag` | sent | succeeds | toast every login until verified | recommended for sites migrating an existing user base |
| `required` | sent | blocked by `email-verify` step | n/a (blocked instead) | secure default |

**Three-state read rule.** Historically the field is `true`, `false`, or **absent**, where only an
explicit `false` means unverified — `true` *or absent* means verified, per W-198's grandfathering
convention. This item normalizes the absent state away with an idempotent startup backfill (see
`## Data & State`), after which every document carries an explicit boolean. Code still tests
`user.emailVerified === false` rather than `!user.emailVerified` as defence in depth, since the
comparison costs nothing and protects any deployment whose backfill was skipped (DB permissions, a
read-only replica, a site pinned to an older startup path).

**SMTP safety valve.** If the policy is `'required'` but `EmailController.isConfigured()` is false,
no verification mail can be sent and every new signup would be permanently unable to log in. The
framework degrades to `'nag'` behaviour at runtime and logs a loud, actionable startup warning,
following the non-throwing `checkLocalAuthRestrictionSafety()` (W-195) precedent in
`webapp/utils/bootstrap.js`. The check is evaluated where the gating happens, not frozen at boot, so
an admin who fixes SMTP starts getting enforcement without a restart. `emailVerified` still stays
`false` for those accounts, so the auth-oauth protection holds even while gating is degraded.

---

## Verification Secrets

Two secrets are issued per send, either one satisfies verification, and the first successful use
invalidates both.

| | Link token | Code |
|---|---|---|
| Format | 32 random bytes, base64url | 6 numeric digits |
| TTL | 24 hours | 30 minutes |
| Storage | bcrypt hash in Redis | bcrypt hash in Redis |
| Single-use | yes | yes |
| Purpose | primary, frictionless | fallback for cross-device / mangled-link mail |

**Why both.** A link is the frictionless path and handles the common case (webmail in another tab,
mail read on a phone) in one click. A code covers reading mail on a phone while logging in on a
desktop, and mail clients that break or rewrite links. The cost is one extra Redis value, so there
is no reason to force users into whichever one we happened to pick. This is the pattern Slack,
Notion, GitHub and Stripe all converged on: a prominent link, plus "or enter this code".

**Why the different TTLs.** The link is often clicked hours later (especially after an admin-driven
reset), so a short link TTL would manufacture friction exactly where we want none. The code is typed
during an active session, so 30 minutes is generous.

**Brute-force resistance comes from the attempt limiter, not from hashing.** A 6-digit space is
10⁶; bcrypt-hashing it in Redis is done for storage-convention consistency, but what actually makes
it safe is the per-account attempt limit below. The link token, by contrast, has real entropy.

| Limiter | Budget | Key |
|---|---|---|
| Sends (signup, resend, auto-issue) | 3 per 10 minutes | per account |
| Wrong code attempts | 5 per 15 minutes | per account |

Neither limiter adds a user-schema field: unlike auth-mfa's `failedAttempts`/`lockedUntil`, both live
in Redis via `cacheCheckRateLimit()`. There is no lockout state to display or for an admin to clear.

**Issue on demand, never speculatively.** A credential emailed "just in case" is guaranteed to be
stale by the time a disengaged user acts on it, and produces a confusing expired-link experience.
So a real credential is issued only when someone is about to use it:

- **at signup** — the user just acted, is expecting mail, and typically clicks within minutes, so
  on-demand and immediate coincide;
- **on arrival at the verify step** — if no unexpired credential exists for that user, one is issued
  automatically, so a user reset weeks ago lands on the verify page with fresh mail already sent and
  nothing to press. The "only if none is currently valid" guard keeps repeated login attempts from
  spamming, and makes the signup send self-healing if SMTP hiccupped;
- **on explicit resend**;
- **never on an admin email change** — see that flow below.

---

## Flows

### 1. Signup

```
POST /api/1/user/signup → UserModel.create() succeeds  (status stays 'active' as today)
    → issueEmailVerification(): link + code emailed
    → a send failure logs an error but does NOT fail signup (the verify step self-heals later)
→ existing redirect to the login page with the existing success message  (unchanged)
```

Signup response shape and status handling are deliberately untouched: enforcement happens at login,
so no client of the signup API has to change.

### 2. First login, `'required'` mode

```
POST /api/1/auth/login { step: 'credentials', ... }  → password valid
    → _getRequiredSteps() pushes email-verify (auto-issues a credential if none is valid)
    → { success: true, nextStep: 'email-verify', page: '/auth/email-verify.shtml',
        email: 'ja***@example.com' }
→ login.shtml's existing case 'email-verify' redirects there

Then whichever the user does first:

(a) clicks the link in the SAME browser
    GET /api/1/user/email-verify/confirm?token=...
    → flag flips; handler sees matching session.pendingAuth → completes the login
    → 302 to the original destination.        ← one click, fully logged in

(b) clicks the link on ANOTHER device
    → flag flips server-side; that device shows a "verified, you can continue" page
    → the waiting tab polls GET /api/1/auth/pending-status (8s interval, own endpoint - not
      /api/1/auth/login, so a poll never shares login()'s rate limiter/nginx zone), notices,
      and auto-advances to the next step / completes login

(c) types the code into the waiting tab
    POST /api/1/auth/login { step: 'email-verify', code: '123456' }
    → valid → flag flips → next step (e.g. MFA) or session created

Resend:
    POST /api/1/auth/login { step: 'email-verify', resend: true }
    → new link + code, rate-limited, step NOT marked complete
```

**`pendingAuth` window.** `PENDING_AUTH_TIMEOUT_MS` is 5 minutes, which is too short to wait for
mail. The window is extended to 30 minutes (matching the code TTL) **only while `email-verify` is
the current expected step**, reverting to 5 minutes once it completes. Scoping it this way limits how
long a password-validated-but-not-MFA-complete state can linger.

### 3. Login, `'nag'` mode

Session is created normally; a warning is pushed in `_completeLoginSession()` and surfaced as a toast
on **every** login until verified — no snooze or dismissal state, so no new schema field. The toast
links to `/auth/email-verify.shtml`, which in a logged-in session offers "send verification email"
and a code box.

### 4. Admin changes a user's email address

The reset is the security-relevant half of this work item. `emailVerified` asserts "we have proof the
account holder controls this inbox" — an admin typing an address supplies a *belief*, never that
proof. W-198 already flagged this exact path: an admin who is "malicious, compromised, or simply
mistaken" reassigning a user's email to someone else's real address hits the same unverified-linking
exposure on that account's next SSO login. A typo landing on a real mailbox produces it too.

```
PUT /api/1/user/:id  with a changed email, and no explicit emailVerified in the payload
    → emailVerified = false
    → informative notice to the NEW address — NO credential, nothing that can expire
      ("your address was set to this; you'll be asked to verify at your next sign-in")
    → security alert to the OLD address
      ("your account's email was changed to j***@new.example.com; if unexpected, contact your admin")
    → the reset is logged with the acting admin's username
```

**Explicit override wins.** An admin with genuine out-of-band proof ticks the `emailVerified`
checkbox in the same save, and that explicit value is honoured instead of the auto-reset. The
controller already distinguishes the two cases — it only applies the field when it is actually
present in the request (`webapp/controller/user.js` ~line 690). "Trust the admin" therefore remains
available, but as a conscious, logged act rather than an invisible default.

**Why no credential in the reset mail.** The user may not read mail for days; a 24-hour link would
be dead on arrival and they would click it only to get an error. The real credential is issued when
they reach the verify step (see "issue on demand" above), so the reset costs them zero extra clicks.

**Why notify the old address.** It is the only channel that reaches the legitimate owner if the
change was malicious rather than clerical. Without it, the reset protects the *system* silently; with
it, the *victim* gets a signal. Carries no credential.

**Typo case behaves correctly.** If the admin fat-fingered onto an unrelated real mailbox, that
stranger receives only a harmless heads-up, and the legitimate user cannot verify an address they
don't control — which is the intended outcome, and surfaces the typo instead of burying it.

Self-service email change does not exist today (`email` is admin-only), but the same rule applies
whenever it is added.

---

## Security Considerations

| Concern | Mitigation |
|---|---|
| The verify link must never authenticate | It only ever flips `emailVerified`. A session is created solely when the request carries a `pendingAuth` cookie whose `userId` matches the token — i.e. credentials were already validated in that same browser moments earlier. Letting inbox access alone create a session would quietly turn email into a password equivalent. **Not a magic-link login feature.** |
| Mail scanners / link prefetching (Outlook Safe Links, corporate mail security) | A prefetch can trigger the GET and burn the single-use token. Accepted rather than adding a confirm click that would tax every real user: a fetch by the recipient's own mail infrastructure is still evidence the message reached that mailbox, so the verification claim is not meaningfully weakened. Critically, a prefetcher carries no session cookie, so it can never obtain a session — at worst it flips a flag. |
| Open redirect on login completion | The mailed link carries no `redirect` param at all (see Phase 3 note above) - the eventual destination rides `session.pendingAuth.redirect`, validated with the new `CommonUtils.isSafeRedirectUrl()` both when captured (credentials step / SSO callback) and again immediately before the 302 (confirm route). |
| Token leaking via browser history / `Referer` | Single-use + 24h TTL; strip the token from the URL by redirecting to a clean URL after handling. |
| Code brute force | 5 wrong attempts per 15 minutes per account (Redis). |
| Send abuse / mail bombing | 3 sends per 10 minutes per account, plus the "only issue when none is valid" guard. |
| Grandfathered accounts silently treated as unverified | Every read tests `=== false`, never `!value`. Covered by unit tests. |
| Locking admins out of a fresh install | `'required'` + unconfigured SMTP degrades to nag with a loud startup warning. |
| Redis unavailable | `cacheCheckRateLimit()` already fails open (documented behaviour); verification itself fails closed, since no stored secret means no match — the user can retry once Redis is back. |
| Framework email template exposed via nginx's raw static serving (post-Phase-5 correction) | No `.tmpl` file at all — email copy lives only in the translation files (`webapp/translations/*.conf`), which are never served under `/static/`. |
| A `{{token}}` context value injecting a fake header into the mailed message (post-Phase-5 correction) | `sendEmailFromTranslation()` parses the envelope *before* substituting tokens — a header can only come from the translation's own text or the caller's explicit options, never from `context` — plus strips `\r`/`\n` from every substituted header value. |
| Cross-device poll locking the polling user out of login (post-Phase-7 correction) | The poll shared `POST /api/1/auth/login`'s per-IP rate limiter and nginx's `login` zone with real credential attempts, tripping `RATE_LIMITED` after a few minutes of background polling. Moved to its own `GET /api/1/auth/pending-status` endpoint with no app-level limit of its own (relies on nginx's generic `api` zone, same as `GET /api/1/auth/status`) — a status poll that guesses no secret shouldn't share either budget. |
| Misleading "nothing to verify" for a same-session second window that already completed login (post-Phase-7 correction) | `pendingStatus()` now checks `req.session.user?.isAuthenticated` first and reports `{ success: true, nextStep: null }` immediately if the shared session is already authenticated, rather than `NO_PENDING_AUTH` for a `pendingAuth` another tab already consumed. |
| MFA/email-verify nag lost on redirect-based login completion (post-Phase-7 correction) | `confirmEmailVerify()` and `completeExternalAuth()` both finish with a plain server `302`, which the client's `sessionStorage`-based toast queue can't reach. `CommonUtils.appendToastsToUrl()` base64-encodes the warnings into a `toasts` query param instead; the client bootstrap decodes, shows, and immediately strips it via `history.replaceState` so it never lingers in the address bar. Two follow-on fixes were needed for this to actually reach the user: `GET /`'s own hard-coded `res.redirect('/home/')` now forwards its incoming query string instead of discarding it, and `_completeLoginSession()` also stashes warnings onto `req.session.pendingWarnings` so a *different*, same-session waiting tab's `pendingStatus()` poll (a separate HTTP request that never itself ran `_completeLoginSession()`) can still drain and deliver them. |

---

## API Surface

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/1/auth/login` | none (uses `pendingAuth`) | existing endpoint; new `{ step: 'email-verify', code }` and `{ step: 'email-verify', resend: true }` payloads |
| GET | `/api/1/auth/pending-status` (post-Phase-7 correction) | none (uses `pendingAuth`) | cross-device "am I verified yet" poll - own endpoint, deliberately outside both `login()`'s per-IP rate limiter and nginx's `login` zone |
| GET | `/api/1/user/email-verify/confirm?token=` | none | link click; flips flag, completes a pending login only if the session matches, 302s onward |
| POST | `/api/1/user/email-verify` | session | logged-in code submission (nag mode) |
| POST | `/api/1/user/email-verify/send` | session | logged-in send/resend |

Routes are registered explicitly in `webapp/routes.js` (framework controllers are not
auto-discovered).

### Error codes

Returned inside the existing step-failure envelope (`STEP_FAILED`) or as the code on the standalone
endpoints:

| Code | Meaning |
|---|---|
| `EMAIL_VERIFY_INVALID_CODE` | wrong or already-used code |
| `EMAIL_VERIFY_INVALID_TOKEN` | wrong, already-used, or unknown link token |
| `EMAIL_VERIFY_EXPIRED` | secret existed but TTL elapsed |
| `EMAIL_VERIFY_RATE_LIMITED` | send or attempt budget exhausted; includes `retryAfter` |
| `EMAIL_VERIFY_SEND_FAILED` | SMTP rejected the message |
| `EMAIL_NOT_CONFIGURED` | no SMTP configured (also drives the degrade-to-nag path) |

---

## Data & State

**One new user-schema field.** `emailVerifiedAt` — nullable date, stamped only when someone actually
proves inbox ownership, left `null` otherwise. It exists so the backfill below stays lossless:
`emailVerified: true` with `emailVerifiedAt: null` means grandfathered, while a non-null date means
proved. Without it, materializing the absent state would permanently erase the distinction, ruling
out any later audit ("how many users actually proved their address?") or forced re-verification
campaign. It also gives support and the admin profile a useful "verified on 2026-08-03" line, and it
matches how auth-mfa already stamps `enrolledAt` / `lastUsedAt`.

Redis, via the existing wrappers:

```
controller:user:token:emailVerifyLink:<userId>     bcrypt hash of link token, TTL 86400
controller:user:token:emailVerifyCode:<userId>     bcrypt hash of 6-digit code, TTL 1800
rateLimit:controller:user:emailVerifySend:<userId>     3 / 600s
rateLimit:controller:user:emailVerifyAttempt:<userId>  5 / 900s
```

**Backfill: normalize the absent state, in one direction only.**

```javascript
// alongside UserModel.ensureIndexes(), same non-throwing style
{ emailVerified: { $exists: false } }  →  $set: { emailVerified: true, emailVerifiedAt: null }
```

This is safe to run on every startup and needs no "already ran" marker: it matches only documents
lacking the field, so after the first pass nothing matches and re-running is a no-op. It mirrors the
self-limiting email-lowercasing backfill already in `ensureIndexes()`. It writes only what W-198's
convention already meant — absent *was* "verified/grandfathered" — so no behaviour changes, the
interpretation is merely materialized, with `emailVerifiedAt: null` preserving the provenance.

**The opposite direction is explicitly rejected.** Turning an explicit `false` back into absent (or
into `true`) to grandfather accounts created between v1.7.6 and this release is *not* idempotent —
an unguarded version would re-run on every boot and silently un-verify every legitimately pending
new signup, disabling the feature. That cohort (a handful of test accounts on two deployments) either
verifies normally at next login, which now works, or gets ticked verified by an admin.

The point of the backfill is not code brevity — `=== false` and `!value` cost the same to write. It
is that the database becomes self-describing and future contributors have one less invariant to
remember, on every deployment rather than just the ones an operator remembers to patch by hand.

---

## UI

### `/auth/email-verify.shtml` (new)

One page serving both callers — `pendingAuth` mid-login and a live session — so there is one page to
build, translate, and learn:

- masked destination address (`ja***@example.com`);
- 6-digit code input;
- "Resend email" button (rate-limited, with a clear cooldown message);
- waiting/auto-advance state for the cross-device link click, with a "Continue" button as the no-JS
  fallback;
- status handling for `?status=verified|expired|invalid` when arriving from the confirm route.

### `webapp/view/user/settings.tmpl`

A status line plus a link to the verify page. Deliberately *not* a data-driven card action:
`coreDisplaySchema` is rendered by the hand-written `renderCoreSchemaBlock()` (W-175), which emits a
plain `jp-form-grid` and supports no `actions` / `handler` / `showIf` / `displayAs` — those exist
only in the plugin card renderer that auth-mfa uses. A link to the single verify page is both less
code and better UX than a second code-entry surface.

### `webapp/view/admin/users.shtml`

A small badge inside the existing Email cell (verified ✓ / unverified ⚠ with a tooltip), rather than
a seventh column — it is an attribute of the email, and the table is already wide. Pure view change
in `createUserRow()` (~line 344): admins already receive `emailVerified` in each row. No filter for
verified state in this item (that would need `UserModel.search()` query support).

### `webapp/view/admin/user-profile.shtml`

An `emailVerified` checkbox in the Administrative panel grid next to Email, saved with the rest of
the panel like every other field there. Today the field has no UI at all — W-198 added it only to the
API allowlist, so it is settable exclusively by a direct API call. Wiring points: populate in
`displayUser()` (~line 987), include in the save payloads (~lines 1190 and 1217), restore in the
reset path (~line 1155).

Alongside the checkbox, a read-only "verified on" line from `emailVerifiedAt` — a date for accounts
that actually proved ownership, and an explicit "not verified (grandfathered)" for the backfilled
ones, so an admin can tell the two apart at a glance.

One behaviour to get right: after an email change the box must visibly flip off with a toast
explaining that notices were sent, so the admin is not left wondering why the flag changed on its
own.

### Email templates — none; the translation *is* the template (post-Phase-5 correction)

No `.tmpl` files. The three emails below are each a single translation key (unix-mail-style
envelope — see `### i18n`), sent via `EmailController.sendEmailFromTranslation()`:

| Translation key | Trigger | Contains |
|---|---|---|
| `model.user.emailVerify` | signup, verify-step arrival, resend | verification URL + code fallback |
| `model.user.emailChangedNotice` | admin email change → new address | heads-up only, policy-aware wording |
| `model.user.emailChangedAlert` | admin email change → old address | security alert, masked new address |

**Why not file-based templates.** The framework's existing `sendEmailFromTemplate()` (file + i18n
templates for it are unaffected by this) resolves through `PathResolver.resolveAsset()`, which only
ever prepends `static/` — by design, since assets are conventionally view-owned and views live
under many different subdirectories. There is no existing convention for a *model*-owned template,
and inventing one under `webapp/static/assets/email/` turned out to be actively unsafe: nginx
serves `webapp/static/` directly in production (`templates/deploy/nginx.prod.conf`) with no
`.tmpl`-extension filtering, so a framework template placed there is readable as raw text by
anyone who requests its URL (a site's own `site/webapp/static/…` is not exposed this way, which is
why file templates remain fine for *site/plugin* use). Rather than invent a new, safe placement
convention, the whole email — subject and body — now lives in the translation file instead, with
no file on disk at all.

**Plain text, not HTML.** The body is plain text with the verification URL on its own line, no
trailing punctuation. Every mainstream client (Gmail, Outlook, Apple Mail, Thunderbird) auto-links
a bare URL in the text part, so a link costs nothing while an HTML button would drag in table
layouts, inline CSS, dark-mode handling, and per-client button rendering — for a transactional
message where plain text is both normal and more trustworthy-looking. `sendEmail()` no longer
auto-derives an HTML part when the caller doesn't supply one (see the post-Phase-5 correction note
above) — a derived part was low-value and made it impossible to ever send a genuinely text-only
email; callers that want HTML now provide it explicitly.

### i18n

All three emails are translated, like every other system message, and they live in the ordinary
translation files rather than in per-language template files (`email-verify.de.tmpl` and friends).
One translation system means adding a language is a `.conf` edit like everywhere else, and a new email
can never ship a broken key path in German: `auditAndFixTranslations()` (`webapp/utils/i18n.js` ~line
116) logs `warning: missing in de.conf: …` at startup and copies the English value into the German
tree, so an untranslated body degrades to English with tokens still substituted. Per-language template
files get no such audit.

The limit is worth knowing: that audit compares key *sets*, so it catches added and removed keys but
never an edit to an existing one. With whole-body keys, a later structural change to an email — adding
a line to the flow, say — is an edit rather than a new key, so nothing warns and German keeps
describing the old flow until someone updates it. That is the price of the granularity chosen below,
paid deliberately — and it is not specific to whole-body keys, since editing any existing string in
`en.conf` leaves its German counterpart equally stale and equally unwarned. The mitigation is the one
already in force for every other string: `en.conf` and `de.conf` are line-parallel, so the two bodies
live at the same key path and get updated in the same pass.

**Whole message per key, unix-mail style (post-Phase-5 correction).** Each email is one key — not
two (`subject`/`body`), as Phase 5 originally shipped it — holding the entire message as a
backtick literal: one or more `Name: value` header lines, a blank line, then the body:

```javascript
// webapp/translations/en.conf — flush-left continuation lines, or the file's
// indentation lands in the email body
emailVerify: `Subject: Confirm your email address

Hi {{firstName}},

Please confirm your email address by opening this link:

{{verifyUrl}}

Or enter this code: {{code}}
...`,
```

`EmailController._parseEmailMessage()` splits this into `{ headers, body }` on the first blank
line. `EmailController.ALLOWED_EMAIL_HEADERS` recognizes the common envelope headers —
`Subject`, `To`, `Cc`, `Bcc`, `Reply-To`, `From` — matched case-insensitively; only `Subject` is
required. The other headers exist for a future full-envelope use case (e.g. a default `Cc:` on a
digest email) without needing a parser change later, but every one is only a *default*:
`sendEmailFromTranslation()`'s own `to`/`cc`/`bcc`/`replyTo`/`from` options each override the
matching header when given, and the recipient specifically resolves as `options.to` > the
translation's `To:` header > `options.user.email`. This W-205 use case only ever sets `Subject:` —
recipients come from `sendEmailFromTranslation()`'s `user`/`to` options, not from the translation
text — so none of the other headers appear in `emailVerify` / `emailChangedNotice` /
`emailChangedAlert` today.

Splitting a body into per-paragraph keys would impose English sentence structure on every other
language, and transactional mail is exactly where that hurts — German has its own salutation and
closing conventions and merges sentences differently. A whole message lets a translator adapt it
rather than fill in slots. Two mechanics make this practical: translation files are evaluated as
JavaScript (`new Function` in `loadTranslations()`, `webapp/utils/i18n.js` ~line 203), so a backtick
literal holds a readable multi-line message; and the new `i18n.substitute(text, context)` (factored
out of `_translate()`, and reused by `sendEmailFromTranslation()`) substitutes `{{name}}` tokens, so
`{{verifyUrl}}` needs no new machinery. The `%TOKEN%` form used by `view/admin/system-status.shtml`
is deliberately not copied — it exists there only because that token must survive server-side
expansion and be replaced client-side with an anchor, which is not the case for mail.

**Substitution happens after parsing, not before, and separately per header vs. body.**
`sendEmailFromTranslation()` resolves the translation with an *empty* context
(`translateForUser(user, key, {})`), so the `{{token}}` placeholders come back intact; only then
does it parse the envelope and call `i18n.substitute()` on each parsed header value (stripping any
`\r`/`\n` the substituted value might contain) and separately on the body (substituted freely).
This order matters: if tokens were substituted into the raw envelope text *before* splitting on
the blank line, a token value containing `\n\nBcc: attacker@example.com` (e.g. a user-supplied
`firstName`) could inject a fake header into what the parser then reads as the envelope —
substituting after parsing, into already-separated header/body strings, makes that structurally
impossible.

**The falsy-substitution bug (post-Phase-5 fix).** The original substitution
(`context[p1] || match`) fell back to the literal `{{token}}` placeholder whenever the supplied
value was falsy — an empty `firstName` (a user who never set one) would print `Hi {{firstName}},`
instead of `Hi ,`. Fixed to `p1 in context ? context[p1] : match`, which only falls back to the
placeholder when the key is genuinely absent from `context`, not merely falsy.

**Recipient's language, never the requester's:**

```
lang = recipientUser.preferences.language || site default
```

This matters because `i18n.translate(req, …)` resolves from `req.session.user.preferences.language`
(~line 335) — the *acting* user. For signup and the verify step that happens to be right (no session
user yet → site default, which is what we want). For the admin email-change notices it would be
actively wrong, sending a German admin's action as a German notice to an English recipient.
`_translate(langCode, …)` already does the right thing but is underscore-private, so add a thin
public wrapper, `i18n.translateForUser(user, keyPath, context)`, and use it for all outbound mail so
the intent is legible at the call site:

```javascript
await EmailController.sendEmailFromTranslation(req, {
    user,
    key: 'model.user.emailVerify',
    context: { firstName, verifyUrl, code }
});
```

`translateForUser(user, keyPath, context)` is still the primitive underneath (called internally by
`sendEmailFromTranslation()` with an empty `context`, per the substitution-ordering note above);
model code no longer calls it directly for outbound mail.

**Namespace note (post-Phase-5 correction):** these keys live under `model.user.*`, not
`controller.user.*` — the framework's translation namespace mirrors `webapp/{utils,model,
controller,view}/`, matching `app.conf`'s own top-level split, and `model.user.js` is genuinely
the sole owner (defines the strings, and is the only caller via `translateForUser()`) even though
`UserController` is what triggers the send. This was initially placed under `controller.user.*`
in Phases 1/4/5 and corrected afterward. The JSON API response strings for the `emailVerify`
*endpoint* (`codeRequired`, `success`, `alreadyVerified`, `sendSuccess`, `internalError`) correctly
stay under `controller.user.emailVerify.*`, since `UserController` both defines and calls those.
Known gap: the i18n usage-audit test (`webapp/tests/unit/i18n/i18n-usage-audit.test.js`) only scans
`webapp/controller/**` for `global.i18n.translate(` calls, so `webapp/model/**` calls to
`translateForUser()` are invisible to it either way - not fixed as part of this correction.

**Why resolving fully in JavaScript, with no handlebars template involved at all.** An earlier
draft of this (Phase 5) kept a thin `.tmpl` wrapper containing only `{{body}}`, resolving
`subject`/`body` in JS and passing `body` in as Handlebars context. That indirection bought
nothing: `expandHandlebars()` injects the translation tree for `AuthController.getUserLanguage(req)`
— the *requester*, not the recipient — so a template-side `{{i18n.*}}` reference would need the
recipient's tree pushed in through `additionalContext` instead (which does take precedence,
`webapp/controller/handlebar.js` ~line 1222) to get the recipient's language right; resolving fully
in JS via `translateForUser()`/`sendEmailFromTranslation()` sidesteps that entirely, and leaves no
handlebars syntax in the substituted text for a second pass to misread.

**No site-override seam today — deliberately deferred, not solved here.** Translation loading
reads `appDir/translations` directly, with no `PathResolver` and no site merge, so
`site/webapp/translations/…` does not exist as an override path — a site cannot reword these emails
without editing the framework's own `en.conf`/`de.conf` (or monkey-patching at runtime). The
`.tmpl`-wrapper approach would have given a site *a* seam (rewrite the wrapper file), at the cost of
losing translation for that email entirely if used. Weighed against that, and given `en.conf`/
`de.conf` were already the *only* real translation source in this framework version, the design
takes the simpler shape now (single translation key, no template file, no site seam) rather than
half-solving overrides with an unsafe file placement. Site/plugin-specific translation overrides —
which would give every translated string, not just these three, a real override seam — are out of
scope for this item.

One authoring caveat: since translation files are evaluated as JavaScript, a literal `${` in copy
would be interpreted as a template-literal expression. It will not arise naturally in these strings,
but it is worth knowing when writing the German copy.

**Folded-in bug fix.** `UserController.signup()` hardcodes `preferences.language: 'en'` (~line 90)
while the adjacent `theme` line reads from config. On a non-English site every new signup is stamped
English, which then drives their verification email, their nag toasts, and their whole UI until they
change it by hand. Fixed here to read the configured default, since it directly determines the
language this feature sends in.

---

## Resolved Design Questions

W-198's tech-debt handoff left four questions open. All four, plus several that surfaced during this
design pass, are now settled:

| Question | Resolution |
|---|---|
| Code format, length, TTL | Link (32 bytes, 24h) primary + 6-digit code (30m) fallback, both single-use, first use invalidates both |
| Resend rate-limit numbers | 3 sends / 10 min; separately 5 wrong attempts / 15 min |
| Should an admin email change reset `emailVerified` and re-trigger sending? | Reset yes; re-trigger no — informative notice only, real credential issued on demand at the verify step. Explicit checkbox in the same save overrides the reset. Old address also gets a security alert |
| `'nag'` dismissal behaviour | None — toast every login until verified; no dismissal state, no new field |
| Core or plugin? | Core (baseline correctness property; plugin would default OFF; admin views are hand-coded framework files) |
| Gate at signup or at login? | At login, via the existing multi-step flow; signup response unchanged |
| Grandfathering pre-existing explicit-`false` accounts | Not grandfathered — they verify at next login (that path now works) or get ticked by an admin; reversing an explicit `false` is not idempotent and would disable the feature |
| The **absent** field state | Normalized away by an idempotent startup backfill (absent → `true`, `emailVerifiedAt: null`); `=== false` retained as defence in depth |
| Distinguishing grandfathered from actually-proved after the backfill | New nullable `emailVerifiedAt` date; `true` + `null` = grandfathered |
| `pendingAuth` 5-minute window vs email latency | Extended to 30 min only while `email-verify` is the current expected step |
| `'required'` + no SMTP | Degrade to nag behaviour + loud startup warning |
| Admin UI presentation | Badge in the users-table Email cell; plain checkbox in the admin profile's Administrative panel; no verified-state filter |
| HTML or plain-text email? | Plain text with a bare URL; `sendEmail()`'s auto-derived HTML part was removed entirely (not fixed) — a caller now gets exactly what it asks for, text-only unless it explicitly supplies `html` |
| Email i18n — overkill? | No: translated like every other system message, in the **recipient's** language (`preferences.language`, else site default), never the requester's; new `i18n.translateForUser()` wrapper |
| Where the email copy lives | In the normal translation files, **whole message per key**, unix-mail style (`Subject: …` header, blank line, body, one backtick literal, `{{token}}` params) — not per-paragraph keys, and no `.tmpl` file at all (removed post-Phase-5: unsafe placement under `webapp/static/`, no real site-override seam anyway); sent via `EmailController.sendEmailFromTranslation()` |
| Signup's hardcoded `preferences.language: 'en'` | Fixed here (reads the configured default) since it decides which language this feature mails in |

---

## Implementation Plan

Estimated ~13-15h including tests and docs.

**Phase 0 — Shared plumbing (~1.5h).** `webapp/controller/email.js`: fix the derived-HTML branch
(escape → linkify → `<br/>`). `webapp/utils/i18n.js`: add `translateForUser()`.
`webapp/model/user.js`: add the `emailVerifiedAt` field and the idempotent absent-field backfill
alongside `ensureIndexes()`. `webapp/controller/user.js`: fix signup's hardcoded language. Each of
these is independently useful and testable, so landing them first keeps the feature phases clean.

**Phase 1 — Model primitives (~3h).** `webapp/model/user.js`: `issueEmailVerification()`,
`verifyEmailByToken()`, `verifyEmailByCode()`, shared invalidation, both rate limiters, the
"only issue when none is valid" guard, `emailVerifiedAt` stamping. A `maskEmail()` helper in
`webapp/utils/common.js` if nothing equivalent exists.

**Phase 2 — Auth controller wiring (~2h).** Core step push in `_getRequiredSteps()`; core
validate/resend branch ahead of the `onAuthValidateStep` hook; nag warning in
`_completeLoginSession()`; step-scoped `pendingAuth` window.

**Phase 3 — Confirm route + user endpoints (~2h).** `GET /api/1/user/email-verify/confirm` with
same-browser login completion and redirect validation; the two authenticated endpoints; route
registration in `webapp/routes.js`; new error codes and strings in `webapp/translations/en.conf` and
`de.conf`.

**Phase 4 — Signup and admin email change (~1.5h).** Send at the end of `UserController.signup()`
(non-fatal); in `update()`, reset `emailVerified` on an email change unless explicitly provided, send
both notices, log the reset with the acting admin.

**Phase 5 — Views (~3h).** New `/auth/email-verify.shtml`; Settings status line; users-table badge;
admin profile checkbox (plus a "verified on" line from `emailVerifiedAt`) and its four wiring points;
the three thin `{{body}}` email templates plus their `subject`/`body` strings in `en.conf` and
`de.conf`.

**Phase 6 — Startup safety (~0.5h).** SMTP-vs-`'required'` check in `webapp/utils/bootstrap.js`
following `checkLocalAuthRestrictionSafety()`'s non-throwing pattern, plus the runtime degrade.

**Phase 7 — Tests and docs (~2.5h).** Unit tests for the Phase 0 plumbing (linkify/escape output,
backfill idempotency, `translateForUser()` resolution) and the model primitives
(issue/verify/invalidate, both TTLs, both limiters, the `=== false` rule, degrade-to-nag), plus the
auth-controller step behaviour across all three policy modes. Docs: `docs/security-and-auth.md`,
`docs/api-reference.md`, the relevant `webapp/static/assets/jpulse-docs/*` pages, this design doc's
status, and W-205's `features`/`deliverables` in `docs/dev/work-items.md`.

### Highest-risk items

1. ✅ Cross-device auto-advance polling — needs a cheap "am I verified yet" check that does not become
   a session-less information leak. Phase 5 initially resolved this with a poll of the existing login
   endpoint (a no-op `{ step: 'email-verify', poll: true }` payload); the post-Phase-7 correction above
   moved it to a narrowly scoped `GET /api/1/auth/pending-status` status endpoint keyed to
   `pendingAuth` instead, after the shared endpoint was found (in manual testing) to inherit
   `login()`'s rate limiting. A further manual-testing pass found `pendingStatus()` itself needed one
   more case: a *same-session* second window (not actually "another device", just another tab sharing
   the cookie) completing login out from under the first window's poll - see the second
   post-Phase-7 correction above.
2. ✅ Post-login warnings (e.g. the MFA nag) lost on any redirect-based login completion — neither
   `confirmEmailVerify()` nor the pre-existing `completeExternalAuth()` (OAuth/LDAP/SAML) had any way
   to surface `_completeLoginSession()`'s `warnings` once they moved to issuing a plain server `302`;
   the client's only toast-delivery path (`jPulse.url.redirect(url, {toasts})`) queues via
   `sessionStorage`, unreachable from Node. Fixed generically with
   `CommonUtils.appendToastsToUrl()` — see the second post-Phase-7 correction above.
3. ✅ Redirect validation reuse — resolved in Phase 3: no framework server-side equivalent existed
   (`jPulse.url.isInternal()` is client-only), so a new `CommonUtils.isSafeRedirectUrl()` was added and
   is now the one place this logic lives, used at both the write (credentials/SSO capture) and read
   (confirm-route 302) points. See the Phase 3 deviation note above for why the mailed link itself
   ended up not needing a `redirect` param at all.
4. ✅ The linkify pass in `sendEmail()` — Phase 0 initially resolved this with an escape → linkify →
   `<br/>` derived-HTML branch; the post-Phase-5 correction above removed that branch entirely
   instead (no HTML part unless a caller explicitly supplies one), which sidesteps the risk rather
   than mitigating it.

The HTML-email rendering risk flagged in the first draft is gone: plain-text mail, with no
auto-derived HTML part at all, removed it.

---

## Test Plan

| # | Case | Expected |
|---|---|---|
| 1 | Signup in `required` mode | account created, mail sent, login blocked by `email-verify` |
| 2 | Link clicked in same browser mid-login | flag flips, login completes, 302 to destination, one click |
| 3 | Link clicked on another device | flag flips; waiting tab auto-advances |
| 4 | Code typed in waiting tab | login proceeds |
| 5 | Code used after link already used | rejected (both invalidated) |
| 6 | Expired code / expired link | `EMAIL_VERIFY_EXPIRED`, resend offered |
| 7 | 6 wrong codes | 6th returns `EMAIL_VERIFY_RATE_LIMITED` with `retryAfter` |
| 8 | 4 resends in 10 min | 4th returns `EMAIL_VERIFY_RATE_LIMITED` |
| 9 | Arrival at verify step with no valid credential | one auto-issued; repeated arrivals do not re-send |
| 10 | `nag` mode, unverified | login succeeds, toast every time |
| 11 | `off` mode | no mail, no step, no toast |
| 12 | Pre-W-198 account (field absent) | backfilled to `true` / `emailVerifiedAt: null`; never gated, never nagged |
| 13 | Post-W-198 explicit `false` account | untouched by the backfill; gated, verifies normally |
| 14 | Admin changes email, no explicit flag | flag `false`, notice to new address, alert to old, no credential |
| 15 | Admin changes email + ticks verified | flag stays `true`, no reset |
| 16 | `required` + SMTP unconfigured | degrades to nag, startup warning logged, nobody locked out |
| 17 | MFA + email verify both pending | email-verify runs first (priority 50 vs 100), then MFA |
| 18 | SSO login for an explicit-`false` local account | auth-oauth still refuses with `LOCAL_EMAIL_NOT_VERIFIED` (unchanged by this item) |
| 19 | Link prefetched by a scanner (no cookie) | flag may flip; no session is ever created |
| 20 | Tampered `redirect` param on the confirm route | rejected / falls back to a safe default |
| 21 | Backfill run twice | second run matches nothing; no explicit `false` is ever touched |
| 22 | Successful verification | `emailVerifiedAt` stamped; grandfathered records keep `null` |
| 23 | Admin-change notices for a user whose language differs from the admin's | both mails in the *recipient's* language |
| 24 | Signup on a site whose default language is not English | new user gets the configured language, and the mail matches |
| 25 | Any of the three emails sent without an explicit `html` option | `mailOptions.html` is `undefined` — no auto-derived HTML part is attached (post-Phase-5 correction; superseded escape/linkify plan) |
| 26 | `sendEmailFromTranslation()` with a falsy (empty-string) context value | substituted as the empty string, not left as a literal `{{token}}` placeholder |
| 27 | `sendEmailFromTranslation()` context value containing `\r`/`\n` | stripped from every resolved header (e.g. the subject); body substitution is unaffected |
| 28 | `sendEmailFromTranslation()` with `options.to`/`cc`/`bcc`/`replyTo`/`from` and a translation defining the matching header | the explicit option wins over the translation's default |
| 29 | `sendEmailFromTranslation()` with no `options.to`, a translation `To:` header, and no `options.user` | the translation's `To:` header supplies the recipient |
| 30 | SMTP becomes configured after startup while policy is `required` (no restart) | `UserModel.getEmailVerificationPolicy()` returns `'required'` again on the very next call - it re-evaluates `EmailController.isConfigured()` live, never caching the answer from boot |
| 31 | `checkEmailVerificationSafety()` at startup for `nag`/`off`, or for `required` with SMTP configured | no warning logged, `appConfig` untouched either way (unlike `checkLocalAuthRestrictionSafety()`, this check never mutates config) |
| 32 | `GET /api/1/auth/pending-status` with no pendingAuth / an expired one (post-Phase-7 correction) | `NO_PENDING_AUTH`/`AUTH_EXPIRED` (400), session's `pendingAuth` cleared |
| 33 | `GET /api/1/auth/pending-status` while still unverified, once verified elsewhere, and once fully complete (post-Phase-7 correction) | echoes `email-verify` unchanged; advances to the next step; completes the login (same three outcomes `login()`'s old poll branch had) |
| 34 | `GET /api/1/auth/pending-status` while the expected step is `mfa` (not `email-verify`) (post-Phase-7 correction) | echoes `nextStep: 'mfa'` back with no DB read - no cross-device story for same-device steps |
| 35 | `GET /api/1/auth/pending-status` polled from a tab whose *shared session* (e.g. a second window) already completed login via `confirmEmailVerify()` | `{ success: true, nextStep: null }`, not `NO_PENDING_AUTH` - no DB read either |
| 36 | `confirmEmailVerify()`/`completeExternalAuth()` complete login with a non-empty `warnings` array | final redirect carries a `toasts=` query param that decodes (base64 → JSON) back to the same warnings |
| 37 | `GET /` with a `?toasts=...` query string (post-Phase-7 correction) | redirects to `/home/?toasts=...` - the query string survives this second, hard-coded redirect |
| 38 | `_completeLoginSession()` with a non-empty/empty `warnings` result (post-Phase-7 correction) | `req.session.pendingWarnings` is set to the warnings / deleted, respectively - never left stale from a previous login |
| 39 | `pendingStatus()`'s already-authenticated shortcut with a non-empty `session.pendingWarnings` (post-Phase-7 correction) | response includes `warnings` drained from the session; `session.pendingWarnings` is deleted after |

Manual end-to-end pass against a real SMTP server for the three device permutations (same browser,
phone + desktop, code-only), plus a live check that the admin-change mails land at both addresses,
and a visual check of the plain-text mail in at least Gmail, Apple Mail, and Outlook to confirm the
bare URL auto-links and does not wrap. Also manually confirm the waiting tab's polling survives a
simulated `pending-status` outage (stops after 3 failures, "Check now" still works) without ever
seeing a 429 against `/api/1/auth/login` in the console/network tab.

---

## Out of Scope / Future Work

- **Self-service email change** by the user (email is admin-only today). When added, the same reset
  rule applies; it would also want re-verification of the *new* address before the change takes
  effect, which is a slightly different flow than this item builds.
- **Verified-state filter** on the admin users page (needs `UserModel.search()` support).
- **`renderCoreSchemaBlock()` parity** with the plugin card renderer (`displayAs`, `actions`,
  `showIf`) — a legitimate W-175 follow-up, not needed here.
- **Password reset via email**, which does not exist in the framework at all today. It would reuse
  every primitive built here (token issue/verify, rate limits, template sending), and this item's
  shape should be treated as the reference for it.
- **Bounce/complaint handling** — no feedback loop exists; a permanently bouncing address currently
  just fails to verify.

---

## Related Work Items

- **W-198** — added the `emailVerified` primitive, the config scaffold, and the DB uniqueness fixes;
  its tech-debt section is this item's direct handoff
- **W-197** — auth-oauth plugin; the consumer of `emailVerified` and the reason it exists
- **W-195** — external-auth helpers (`completeExternalAuth`, `hasLocalPassword`,
  `checkLocalAuthRestrictionSafety` precedent)
- **W-109** — multi-step login flow; the machinery this item rides
- **W-110** — redirect toast queue; delivers the nag toast
- **W-143** — Redis cache infrastructure; token and rate-limit wrappers
- **W-175** — data-driven core settings (`coreDisplaySchema`, `renderCoreSchemaBlock`)
- **W-204** — login rate limiting; adjacent precedent for app-level limiters

---

## Design Notes (corrections made during this pass)

Three initial assumptions were wrong and are corrected above; recorded here so the reasoning is not
re-litigated later.

1. **"The nag UI comes for free from the data-driven card mechanism."** It does not.
   `coreDisplaySchema` is rendered by `renderCoreSchemaBlock()`, hand-written in `settings.tmpl` and
   `admin/user-profile.shtml`, which supports fields only — no actions, handlers, `showIf`, or
   `displayAs`. Those live exclusively in the plugin card renderer. This is a view-layer gap, not an
   architectural reason to make this a plugin, and it costs essentially nothing once the Settings
   side is just a link to the shared verify page.
2. **"A verify link can't work, because the multi-step flow is session-bound."** This conflated two
   jobs. Proving inbox ownership needs no session at all — a token identifies the account and the
   click proves control, from any device. Continuing a pending login is separate and does not have to
   happen in the link's browser: same-browser clicks complete it directly, other-device clicks let
   the waiting tab notice and advance. The link is therefore the *better* primary affordance, with
   the code demoted to fallback.
3. **"No backfill at all."** The first draft rejected every backfill, having reasoned about only one
   direction — turning an explicit `false` back into absent/`true`, which is genuinely unsafe because
   it is not idempotent and would re-run on each boot, silently un-verifying pending signups. The
   *opposite* direction (absent → `true`) is naturally self-limiting, since after one pass no
   document matches the `$exists: false` filter, and it never touches an explicit `false`. That
   distinction was missed initially. The absent state is therefore normalized after all, with
   `emailVerifiedAt` added so nothing is lost in the process.

---

**Last Updated:** 2026-08-06
