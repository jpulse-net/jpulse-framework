# W-209 plugins: extensibe hook registry

**Status:** Spec for review.

**Decisions already taken** (see §6, §7): hook names keep the existing
`onBucketAction` camelCase convention for *all* owners, with a required `owner`
field for collision detection; a handler registered against an undeclared hook
is still registered, and unmatched registrations are reported once in a
post-boot audit rather than warned about per registration.

## 1. Overview

`HookManager` today owns a hard-coded catalog of the 15 hooks the framework
itself fires. Any other hook name works — `register()` warns and registers
anyway — but it is undocumented, unqueryable, and indistinguishable from a
typo.

This item makes the hook **contract** declarable by whoever owns it. A plugin
or a site can define its own hooks, and the framework never needs to learn a
domain vocabulary. The immediate driver is an AI agent feature where each LLM
backend is a plugin (§12), but the shape is deliberately domain-free: the
framework should no more contain `onAiComplete` than the WebSocket layer
contains a bubble.

The core move is separating two roles that are currently conflated:

- A **producer** owns a hook: its name, when it fires, what the context
  carries, and which execution mode applies. Today the framework is the only
  producer, which is exactly why the catalog can be a literal.
- A **consumer** registers a handler. Plugins already do this via
  `static hooks = { … }`, and that stays unchanged.

Everything else in this design follows from letting anyone be a producer.

**No new execution semantics are needed.** That is worth stating up front,
because it is the reason this item is small (§4).


---

## 2. Out of Scope

- **New execution modes.** Four already exist and cover the known cases (§4).
- **Domain-specific hooks in the framework.** Explicitly rejected — that is the
  motivation for this item, not a fallback.
- **Admin enable/disable of individual hooks.** A read-only introspection view
  is in scope; turning a hook off at runtime is a separate concern with real
  failure modes (half-initialized plugins).
- **Cross-process or distributed hooks.** `HookManager`'s stated design
  principle is "method calls, not messages (synchronous within process)". Hooks
  that must travel between processes belong on Redis pub/sub instead.
- **Client-side hooks.** This is a server-side registry.
- **Ordering guarantees beyond `priority`.** No dependency graph between
  handlers; priority remains the only lever.


---

## 3. Terminology

| Term | Meaning |
|---|---|
| Hook | A named extension point, fired by its producer |
| Producer / owner | The component that declares a hook and calls one of the execute methods |
| Consumer / handler | Code registered to run when a hook fires |
| Declaration | The contract: name, owner, mode, context keys, stability |
| Registration | A handler attached to a hook name |
| Catalog | All declarations, framework and third-party alike |
| Audit | The post-boot report of registrations with no matching declaration |


---

## 4. Current State

What `webapp/utils/hook-manager.js` already provides:

| Method | Behavior |
|---|---|
| `execute(name, ctx)` | Broadcast in priority order; context in and out; handler errors logged and swallowed |
| `executeWithCancel(name, ctx)` | As above, but a handler returning `false` cancels and reports `cancelledBy` |
| `executeFirst(name, ctx)` | First non-null/undefined return wins — dispatch |
| `executeForPlugin(name, pluginName, ctx)` | Only that plugin's handlers; **errors propagate** so a handler can abort the caller (W-200) |
| `hasHandlers(name)` | Whether anyone is listening |
| `unregister(pluginName)` | Drops a plugin's handlers on disable |
| `getRegisteredHooks()` | Name → `[{ plugin, priority }]` |
| `getAvailableHooks()` | The hard-coded catalog |

The catalog holds 15 hooks in four buckets: authentication (8), user lifecycle
(5), plugin config (1, `onPluginConfigBeforeSave`), system/metrics (1,
`onGetInstanceStats`).

The gaps, precisely:

1. **The catalog is a literal**, so only the framework can document a hook.
2. **`context` is a prose string** (`'{ req, user, sessionData }'`) — readable
   by people, useless to code.
3. **No owner**, so collisions between two plugins are undetectable.
4. **No query surface** beyond a name lookup in an object.
5. **`isValidHook()` warns but registers**, which is the right leniency with the
   wrong ergonomics: the warning fires at registration time, when a missing
   declaration may simply mean the producer has not loaded yet.

Note one existing inconsistency to preserve rather than fix here:
`onGetInstanceStats` does not follow `onBucketAction`. The convention already
has an exception.


---

## 5. Design

### 5.1 Declaration API

```js
HookManager.declareHook('onAiComplete', {
    owner:       'ai-core',
    description: 'Run one provider completion; return the normalized event stream',
    mode:        'executeForPlugin',
    contextKeys: ['threadId', 'model', 'messages', 'tools'],
    returns:     'context',
    canCancel:   false,
    stability:   'experimental',
    since:       '1.7.12'
});

HookManager.declareHooks({ onAiProviderRegister: { … }, onAiComplete: { … } }, 'ai-core');
```

`declareHooks(map, owner)` is sugar for the common case of one component
declaring a family at once, stamping `owner` on each entry so it cannot drift.

### 5.2 Declaration fields

| Field | Required | Purpose |
|---|---|---|
| `owner` | yes | Plugin name, `'site'`, or `'framework'`. Collision detection and query filtering |
| `description` | yes | One line, admin- and docs-facing |
| `mode` | yes | Which execute method is the contract: `execute`, `executeWithCancel`, `executeFirst`, `executeForPlugin` |
| `contextKeys` | yes | Machine-readable key list, replacing today's prose string |
| `returns` | yes | `context` \| `value` \| `void` — what a handler is expected to return |
| `canCancel` | no | Existing field; must be consistent with `mode` |
| `stability` | no | `experimental` \| `stable` \| `deprecated`; default `stable` |
| `since` | no | Version that introduced the hook |
| `deprecatedBy` | no | Successor hook name, for the deprecation warning |

`mode` and `returns` earn their place because four execution modes exist and
they behave differently in the one way that matters to a handler author:
whether to mutate the context or return a value. Getting that wrong is the most
common way to write a broken handler, and today nothing records the answer.

`contextKeys` is what makes the catalog useful to tooling — generated docs, an
admin view, and optionally a dev-mode contract check (§11).

### 5.3 Where declarations happen

- **Framework**: `declareHooks()` at boot, from the same module that owns each
  hook (see §10 on the migration).
- **Plugins**: a `static providesHooks = { … }` object on the plugin
  controller, auto-registered by `PluginManager` exactly as `static hooks` is
  today. The symmetry is the point — `static hooks` is "hooks I handle",
  `static providesHooks` is "hooks I define".
- **Site code**: in the site init hook from W-207. This makes **W-207 a hard
  dependency**: without it, site code has no call site, and a site is a
  first-class producer in this design.

### 5.4 Framework hooks become declarations

The 15 built-in hooks migrate to `declareHook()` calls rather than staying a
literal. This is not cosmetic. If the built-in catalog remains a special case,
every query, audit, and doc-generation path needs two code paths forever, and
the framework's own hooks stay exempt from the validation everyone else gets.
`getAvailableHooks()` becomes a view over the catalog (§10).


---

## 6. Naming and Ownership

**Decision: keep `onBucketAction` camelCase for every owner**, framework and
third party alike. A namespaced alternative (`ai-core:complete`) would be
collision-proof by construction, but it splits the convention in two, breaks
the existing `static hooks` key style, and forces a migration for zero
functional gain. Collisions are instead *detected* via `owner`.

Rules:

- `owner` is required on every declaration.
- An **identical** re-declaration is idempotent — two plugins in a family may
  both declare defensively without an error.
- A **conflicting** re-declaration keeps the first, logs an error, and records
  both in the catalog so introspection shows the conflict. Declaration must not
  throw: a plugin should not be able to abort boot by shipping a bad name.
- A recommended prefix derived from `owner` (`ai-core` → `onAiCore*` / `onAi*`)
  is **advisory only**, surfaced in the audit, not enforced. Enforcement would
  produce names nobody wants (`onAiCoreProviderRegister`) and would still not
  prevent collisions between unrelated owners.


---

## 7. Validation and the Boot Audit

**Decision: registration never fails on an undeclared name.** A consumer plugin
can legitimately initialize before the producer that declares the hook, so an
immediate warning is a false alarm as often as a real finding.

- `register()` accepts any name and records unmatched ones as *unverified*.
- A late `declareHook()` **retro-validates**: any already-registered handler for
  that name is moved out of the unverified set.
- After boot completes, a **single audit** runs and reports what remains:
  unmatched registrations grouped by hook name with their registering plugins,
  handlers on deprecated hooks, declaration conflicts, and advisory prefix
  mismatches. One clear list beats N scattered warnings.
- The audit is also available on demand through the query API, so a plugin
  enabled at runtime can be checked without a restart.

Log levels: unmatched registration is a **warning** (probably a typo, possibly
a disabled producer); a declaration conflict is an **error**; prefix mismatch is
**info**.


---

## 8. Query Surface

```js
HookManager.getHook('onAiComplete');
// → { declaration: {...}, handlers: [{ plugin, priority }], declared: true }

HookManager.findHooks({ owner: 'ai-core' });
HookManager.findHooks({ namePattern: /^onAuth/ });
HookManager.findHooks({ stability: 'deprecated', hasHandlers: true });
HookManager.getAudit();
```

`getHook()` returns declaration and live registrations **merged**, so one call
answers "who owns this, who listens, and in what order" — the actual question
when debugging a hook that is not firing as expected. `hasHandlers()` already
exists and stays as the cheap check a producer uses to skip building an
expensive context when nobody is listening.

Two consumers of the query surface justify building it:

- **`GET /api/1/hook`** (admin-only): a "who listens to what" view, the thing
  currently impossible to answer without reading source.
- **Documentation generation**: the hook table in `docs/api-reference.md` is
  hand-maintained today and will drift the moment third parties own hooks.
  Generating it from the catalog — the framework already has dynamic content
  generators for docs — makes the catalog the single source of truth.


---

## 9. Lifecycle

- **Disable**: `unregister(pluginName)` already drops handlers. Declarations by
  that plugin are marked **inactive** rather than deleted, so its consumers'
  registrations still make sense in the audit ("declared by a disabled plugin"
  is a far more useful message than "undeclared").
- **Re-enable**: declarations reactivate; no re-registration bookkeeping beyond
  what `PluginManager` already does.
- **Deprecation**: `stability: 'deprecated'` plus `deprecatedBy` produces a
  warning when a handler registers against it. This is how a hook contract
  evolves without a breaking release — which matters much more once owners
  outside the framework depend on it.


---

## 10. Backward Compatibility

Nothing existing changes behavior:

- The 15 hook names stay as they are.
- `static hooks = { onX: { priority } }` consumer syntax is untouched.
- `getAvailableHooks()` keeps working as a view over the catalog. Whether it
  returns all declarations or only `owner: 'framework'` is an open question
  (§16) — the framework-only filter preserves today's exact semantics.
- `isValidHook()` becomes "is declared", which is what callers already assume.
- The existing `webapp/tests/unit/utils/hook-manager.test.js` suite must pass
  unchanged; that is the compatibility gate.


---

## 11. Optional: dev-mode context check

With `contextKeys` machine-readable, the manager can verify that the context a
producer passes actually contains the declared keys, behind a config flag and
off in production. Cheap, and it catches the contract drift that otherwise
surfaces as a handler reading `undefined`. Listed as optional because it is
additive and can land later without reshaping anything.


---

## 12. Worked Example: AI provider plugins

This is the driver, and it shows the framework staying domain-free.

`ai-core` (site code in BubbleMap's case, per T-092) declares:

```js
HookManager.declareHooks({
    onAiProviderRegister: {
        description: 'Contribute a provider descriptor: id, models, price table, capabilities',
        mode: 'execute', contextKeys: ['providers'], returns: 'context'
    },
    onAiComplete: {
        description: 'Run one completion; emit normalized events; return usage',
        mode: 'executeForPlugin', contextKeys: ['threadId', 'model', 'messages', 'tools'],
        returns: 'context'
    }
}, 'ai-core');
```

`ai-anthropic` handles them with the existing `static hooks` syntax. The
orchestrator then uses only what already exists:

- `execute('onAiProviderRegister', { providers: [] })` to build the provider
  list at boot.
- `executeForPlugin('onAiComplete', selectedProvider, ctx)` to run a turn —
  targeted at the configured provider, with errors propagating so a provider
  failure fails the turn instead of being logged and swallowed. This is exactly
  what that mode was added for in W-200.
- `hasHandlers('onAiComplete')` for the capability probe that decides whether
  the feature is available at all.

The framework contributes the registry and never contains the word "AI". A
second consumer — a payment provider, a search backend, an export format —
follows the same shape with no framework release.


---

## 13. Testing

- **Declaration**: required-field validation, `declareHooks()` owner stamping,
  idempotent identical re-declaration, conflicting re-declaration keeps the
  first and records both, declaration never throws.
- **Audit**: unmatched registration reported once; late declaration
  retro-validates and clears it; deprecated-hook registration warned; prefix
  mismatch is info only; `getAudit()` callable at runtime.
- **Query**: `getHook()` merges declaration and handlers; each `findHooks()`
  filter in isolation and combined; unknown name returns a well-formed
  "undeclared" result rather than throwing.
- **Lifecycle**: disable marks declarations inactive and drops handlers;
  re-enable restores; a consumer of a disabled producer's hook shows the right
  audit message.
- **Compatibility**: the existing hook-manager suite passes unchanged;
  `getAvailableHooks()` still returns the framework's 15;
  `static hooks` registration unaffected.
- **Docs generation**, if adopted: generated hook table matches the catalog.


---

## 14. Phases

**Phase A — registry core.** `declareHook()` / `declareHooks()`, the
declaration store with owner and stability, collision policy, `isValidHook()`
redefined as "is declared". No caller changes yet.

**Phase B — migrate the framework's 15.** Declarations replace the literal;
`getAvailableHooks()` becomes a view. Proves the API on the framework's own
hooks before anyone else depends on it.

**Phase C — query and audit.** `getHook()`, `findHooks()`, `getAudit()`, the
post-boot audit, and the unverified/retro-validation path.

**Phase D — producer surfaces.** `static providesHooks` in `PluginManager`;
the site path via the W-207 init hook.

**Phase E — visibility.** `GET /api/1/hook`, the admin view, and generated hook
documentation.


---

## 15. Deliverables

| File | Change |
|---|---|
| `webapp/utils/hook-manager.js` | Declaration store, `declareHook`/`declareHooks`, collision and stability handling, unverified set with retro-validation, `getHook`/`findHooks`/`getAudit`, `getAvailableHooks()` as a view, `isValidHook()` redefined |
| `webapp/utils/plugin-manager.js` | Auto-register `static providesHooks` from plugin controllers; mark declarations inactive on disable, reactivate on enable |
| `webapp/utils/site-controller-registry.js` | Site declarations via the W-207 init hook (no change beyond W-207 itself) |
| `webapp/utils/bootstrap.js` | Run the post-boot hook audit and log its summary |
| `webapp/controller/hook.js` | New admin controller: `GET /api/1/hook` returning catalog, handlers, and audit |
| `webapp/view/admin/plugins.shtml` | Surface declared hooks and their listeners, or a dedicated hooks panel |
| `webapp/controller/markdown.js` | Dynamic content generator for the hook table, if docs generation is adopted |
| `webapp/tests/unit/utils/hook-manager.test.js` | Extend with §13 coverage; existing cases must pass unchanged |
| `webapp/tests/unit/utils/plugin-manager.test.js` | `providesHooks` auto-registration, inactive-on-disable |
| `docs/api-reference.md` | Declaration API, field reference, query API, audit semantics; hook table generated or regenerated |
| `docs/site-customization.md` | How site code declares hooks in the init hook |
| `docs/dev/design/W-209-extensible-hooks.md` | This document |


---

## 16. Open Questions

- [ ] Should `getAvailableHooks()` return all declarations or only
      `owner: 'framework'`? The filter preserves today's semantics exactly;
      returning everything is more useful but changes what existing callers see.
- [ ] Is `mode` worth validating against the execute method actually used at
      runtime? Detecting "declared `executeFirst`, fired with `execute`" is
      possible but adds a check on every fire.
- [ ] Should `contextKeys` support nested paths (`req.user.username`) or stay
      flat top-level keys?
- [ ] Does the audit belong in bootstrap, or in `HealthController` alongside the
      other startup safety checks (`checkLocalAuthRestrictionSafety` and
      friends), so it also runs on a config-driven re-check?
- [ ] Should a hook declaration be able to state that it expects exactly one
      handler (`executeForPlugin` dispatch targets), so two registrations become
      an audit finding?
- [ ] Naming for `static providesHooks` — alternatives are `declaresHooks` or
      `hookDefinitions`; `hooks` versus `providesHooks` should read clearly as
      handle-versus-define to a plugin author.
