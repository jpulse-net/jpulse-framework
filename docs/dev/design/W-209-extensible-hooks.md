# W-209 plugins: extensibe hook registry

**Status:** Spec reviewed and settled. Implementation not started.

**Decisions taken** (review session, 2026-08-12):

- Producer vocabulary is **define**, consumer vocabulary stays **register /
  handle**: `defineHook()` / `defineHooks()` and `static hookDefinitions`,
  alongside the unchanged `static hooks` (§6).
- A definition requires only `description`; everything else defaults or
  derives (§5.2).
- Hook names keep the existing `onBucketAction` camelCase convention for *all*
  owners, with a required `owner` for collision detection (§7).
- A handler registered against an undefined hook is still registered;
  unmatched registrations are reported once in a post-boot audit rather than
  warned about per registration (§8).
- **Cancellation is unified on throw-to-abort**, with a declared `onError`
  policy. `executeWithCancel()` and the return-`false` convention are removed
  (§10). This is the one deliberately breaking change, taken because the
  return-`false` contract does not actually work today (§4) and because its one
  real consumer had to hand-build both halves of the replacement (§10.4). That
  consumer migrates; the full list is §12.2.
- Site controllers become first-class on both sides: they may define hooks
  *and* auto-register `static hooks`, which only plugin controllers can do
  today (§5.3).
- `onGetInstanceStats` is renamed `onSystemGetStats`, removing the last
  `onBucketAction` exception (§7).
- Three hooks that are declared but never fired are marked
  `stability: 'planned'` rather than removed, and a scan test prevents any new
  ones (§9).

Long-term maintainability is preferred over backward compatibility throughout;
the two existing site deployments are under the same ownership and can be
updated alongside. See §12 for the complete list of what breaks.


---

## 1. Overview

`HookManager` today owns a hard-coded catalog of the hooks the framework
itself fires. Any other hook name works — `register()` warns and registers
anyway — but it is undocumented, unqueryable, and indistinguishable from a
typo.

This item makes the hook **contract** definable by whoever owns it. A plugin
or a site can define its own hooks, and the framework never needs to learn a
domain vocabulary. The immediate driver is an AI agent feature where each LLM
backend is a plugin (§13), but the shape is deliberately domain-free: the
framework should no more contain `onAiComplete` than the WebSocket layer
contains a bubble.

The need is not speculative. BubbleMap already ships a site-defined hook,
`onBubbleWidgetConfigBeforeSave`, guarding a security decision — undocumented,
unqueryable, and, as §10.4 shows, forced to reimplement by hand two things a
proper definition would have given it.

The core move is separating two roles that are currently conflated:

- A **producer** owns a hook: its name, when it fires, what the context
  carries, which execution mode applies, and what happens when a handler
  throws. Today the framework is the only producer, which is exactly why the
  catalog can be a literal.
- A **consumer** registers a handler. Plugins already do this via
  `static hooks = { … }`, and that stays unchanged.

Everything else in this design follows from letting anyone be a producer.

**No new execution machinery is needed** — one execution mode is in fact
*removed* (§10). That is worth stating up front, because it is the reason this
item is small.


---

## 2. Out of Scope

- **New execution modes.** Three remain after §10 and cover the known cases.
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
- **User deletion.** `onUserBeforeDelete` / `onUserAfterDelete` have no fire
  site because the framework has no `UserModel.delete()` at all (§9). Building
  one is its own work item; this item only stops the catalog from lying about
  it.


---

## 3. Terminology

| Term | Meaning |
|---|---|
| Hook | A named extension point, fired by its producer |
| Producer / owner | The component that **defines** a hook and calls one of the execute methods |
| Consumer / handler | Code **registered** to run when a hook fires |
| Definition | The contract: name, owner, mode, context keys, error policy, stability |
| Registration | A handler attached to a hook name |
| Catalog | All definitions, framework and third-party alike |
| Audit | The post-boot report of registrations with no matching definition, and related findings |

The vocabulary is deliberate and worth enforcing in code and docs alike:
**define** (producer) / **register** and **handle** (consumer) / **fire** and
**execute** (runtime). Today "declare" means the *consumer* side — the
`plugin-hooks.md` heading "Declare Hooks in Your Controller" is about
`static hooks` — so using "declare" for the producer API would make one word
mean both roles. Those existing headings are re-worded as part of this item.


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
| `getHooksByNamespace(prefix)` | Prefix filter over the catalog |
| `isValidHook(name)` | Name lookup in the catalog |

The catalog holds 15 hooks in four buckets: authentication (8), user lifecycle
(5), plugin config (1, `onPluginConfigBeforeSave`), system/metrics (1,
`onGetInstanceStats`).

### 4.1 The gaps this item closes

1. **The catalog is a literal**, so only the framework can document a hook.
2. **`context` is a prose string** (`'{ req, user, sessionData }'`) — readable
   by people, useless to code.
3. **No owner**, so collisions between two plugins are undetectable.
4. **No query surface** beyond a name lookup in an object.
5. **`isValidHook()` warns but registers**, which is the right leniency with the
   wrong ergonomics: the warning fires at registration time, when a missing
   definition may simply mean the producer has not loaded yet.

### 4.2 Findings from the code review — corrections to the first draft

The first draft of this spec was wrong on several points about the existing
code. Recording them here, because each one changes a deliverable.

**Hook documentation is already generated, and not where the draft said.**
`docs/api-reference.md` contains no hook table at all — only one prose link
(line 454). The canonical hook doc is `docs/plugins/plugin-hooks.md`, and its
three tables are *already* generated from the catalog by W-105's dynamic
content generators: `plugins-hooks-list`, `plugins-hooks-list-table`, and
`plugins-hooks-count` in `webapp/controller/markdown.js`. This shrinks the
documentation work (the generators exist) but hardens the migration into a
compatibility constraint, below.

**`context` and `canModify` are load-bearing, not decoration.**
`_generatePluginsHooksTable()` renders `hook.context` and `hook.canModify` into
every row and `_generatePluginsHooksList()` reads `canModify` / `canCancel`;
the test suite asserts both. Dropping them in favor of `contextKeys` and
`returns` would render `undefined` into the published tables. `canModify` is
also not derivable from `returns` — `onAuthAfterLogin` is `canModify: false`
yet returns the context, because the field documents *permission*, not
mechanism. Both are kept (§5.2, §11).

**Framework definitions cannot be scattered across the modules that fire
them.** The existing hook-manager test suite imports `HookManager` directly
with no bootstrap and expects `getAvailableHooks()` to be populated. Definitions
placed in `auth.js` / `user.js` / `plugin.js` would make the catalog dependent
on lazy import order and empty under test. They live in one seed module loaded
with `HookManager` (§5.3).

**The return-`false` cancellation contract does not work.**
`onUserBeforeSave` is documented `canCancel: true`, but every fire site calls
plain `execute()`, which assigns any non-`undefined` return into the context.
A handler returning `false` therefore sets `context = false`, and
`webapp/model/user.js` then reads `saveContext.userData` off `false` — a
TypeError swallowed into a generic "Failed to create user". The save is not
cancelled; it crashes obscurely. W-200 already recorded this (work item text
calls `canCancel: true` there "aspirational/inaccurate") but scoped its fix to
the new hook. `webapp/controller/user.js` additionally carries a comment
documenting the non-working contract, which is deleted by this item.

**`executeFirst()` has no production caller** anywhere in the framework or the
deployed sites — only its own unit tests and design documents. It is kept
regardless, because it is the natural dispatch mode and T-092 has a use for it.

**`executeWithCancel()` has exactly one production caller, and it is a security
gate.** An earlier draft of this document claimed it had none; that claim came
from searching this repository alone, where `.gitignore` excludes `plugins/*`
apart from `hello-world`, so even the locally installed plugins were invisible.
A scan across the framework and both deployed sites gives the real inventory in
§12.1. The one caller is BubbleMap's `onBubbleWidgetConfigBeforeSave` — a
site-defined hook, already in production, currently undefined in any catalog.
It is the first real third-party hook in the ecosystem and the best argument
this item has (§10.4).

**Three hooks are never fired.** `onUserBeforeDelete`, `onUserAfterDelete`, and
`onUserSyncProfile` have no fire site anywhere; there is no `UserModel.delete()`
in the framework. A plugin can register a handler today and wait forever with no
indication (§9).

**The generic executor contains a hook-specific special case.**
`execute()` tests `hookName === 'onGetInstanceStats'` to attach per-handler
elapsed timing to `context.stats[pluginName]`. A third-party hook cannot get
that, so neither should a framework hook by special case. Out of scope for this
item by decision, but the branch is renamed with the hook (§7) and generalizing
it later costs about two lines.

**`onGetInstanceStats` breaks the naming convention** and is the only hook that
does. Renamed rather than preserved as an exception (§7).

**Unrelated route bug, folded in.** `webapp/routes.js` registers
`/api/1/plugin/dependencies` *after* `/api/1/plugin/:name`, so Express matches
the parameterized route first and `PluginController.getDependencies()` is
unreachable — the request lands in `get()` with `name = 'dependencies'` and
returns 404 `PLUGIN_NOT_FOUND`. Nothing calls it, which is why it went
unnoticed. Fixed by a one-line reorder in the same commit that registers the
hook routes, since that commit touches the same block.


---

## 5. Design

### 5.1 Definition API

```js
HookManager.defineHook('onAiComplete', {
    owner:       'ai-core',
    description: 'Run one provider completion; return the normalized event stream',
    mode:        'executeForPlugin',
    contextKeys: ['threadId', 'model', 'messages', 'tools'],
    onError:     'abort',
    stability:   'experimental',
    since:       '1.0.0'
});

HookManager.defineHooks({ onAiProviderRegister: { … }, onAiComplete: { … } }, 'ai-core');
```

`defineHooks(map, owner)` is the common form: one component defining a family at
once, stamping `owner` on each entry so it cannot drift.

### 5.2 Definition fields

Only `description` is required. Everything else has a default or derives from
`mode`, because **defining a hook is voluntary** — registration never fails on
an undefined name (§8) — so every required field is a tax on the behavior this
item wants to encourage. A thin definition is strictly better than none, and
incompleteness is an *info*-level audit nudge rather than a gate.

| Field | Required | Default | Purpose |
|---|---|---|---|
| `description` | **yes** | — | One line, admin- and docs-facing |
| `owner` | stamped | `defineHooks()` arg, or the registering class's plugin/site name | Plugin name, `'site'`, or `'framework'`. Collision detection and query filtering |
| `mode` | no | `'execute'` | Which execute method is the contract: `execute`, `executeFirst`, `executeForPlugin` |
| `contextKeys` | no | `[]` | Machine-readable key list; the display `context` string is synthesized from it |
| `contextNote` | no | `''` | Prose override for the display string when key names alone are not enough |
| `onError` | no | derived from `mode` (§10) | `'continue'` \| `'abort'` — what a thrown handler error does to the producer |
| `canModify` | no | `false` | May a handler change the context? Documentation-facing permission, not mechanism |
| `returns` | no | derived from `mode` | `context` \| `value` \| `void` — what a handler is expected to return |
| `stability` | no | `'stable'` | `experimental` \| `stable` \| `deprecated` \| `planned` |
| `since` | no | `''` | Version that introduced the hook — the **owner's** version, not the framework's, for third-party hooks |
| `deprecatedBy` | no | `''` | Successor hook name, for the deprecation warning |

`mode` and `returns` earn their place because the execution modes behave
differently in the one way that matters to a handler author: whether to mutate
the context or return a value. Getting that wrong is the most common way to
write a broken handler, and today nothing records the answer.

`contextKeys` is what makes the catalog useful to tooling — generated docs, the
admin view, and optionally a dev-mode contract check (§14). The human-readable
`context` string that today's docs render is *derived* from it
(`['req','user','sessionData']` → `'{ req, user, sessionData }'`), which
reproduces all 15 current strings except `onSystemGetStats`, whose cosmetic type
hints move to `contextNote`.

`canCancel` is no longer a stored field. It is derived from `onError` for the
docs table and the admin view, which is what stopped it from drifting out of
sync with reality in the first place (§4.2).

### 5.3 Where definitions happen

- **Framework**: one seed module, `webapp/utils/hook-definitions.js`, imported
  by `hook-manager.js` at module load. These are ordinary definitions through
  the same public API — not a special case — but they are eagerly seeded so the
  catalog exists without bootstrap (required by the test suite, §4.2) and so a
  newcomer has one file to read for the whole framework catalog.
- **Plugins**: `static hookDefinitions = { … }` on the plugin controller,
  auto-defined by `PluginManager` exactly as `static hooks` is registered today.
- **Site code**: the same `static hookDefinitions` on a site controller,
  auto-defined by `SiteControllerRegistry` — plus, new in this item,
  auto-registration of `static hooks` for site controllers.

That last point closes an asymmetry: today only `PluginManager` reads
`static hooks`, so site code must hand-write
`global.HookManager.register('onUserBeforeSave', 'site', fn, 100)` inside
`initialize()`. Being able to define a hook in one line while needing a manual
call to handle one is exactly the friction this item exists to remove. The
registration loop moves out of `PluginManager._registerControllerHooks()` into
`HookManager.registerFromClass(owner, Controller)` and both registries call it.

**Implementation hazard:** `SiteControllerRegistry` also scans *plugin*
controllers (registry keys prefixed `plugin:`), whose hooks were already
registered at bootstrap step 7.4. The site path must filter on the `site`
source or every plugin hook is registered twice. Site registration also runs
*after* the controller's `initialize()`, so a handler can rely on state that
`initialize()` set up.

**Boot ordering** makes retro-validation (§8) mandatory rather than defensive:
plugin hooks register at step 7.4, while site controllers — including site hook
definitions — do not run until step 14. A plugin consuming a site-defined hook
therefore always registers before that hook exists. T-092 is exactly this case:
`ai-anthropic` registers `onAiComplete` at 7.4, `ai-core` (site) defines it at
14. Step 14 is skipped when `isTest`, so every audit path must tolerate an
empty site contribution.

### 5.4 Framework hooks become definitions

The built-in hooks migrate to definitions rather than staying a literal. This is
not cosmetic. If the built-in catalog remains a special case, every query,
audit, and doc-generation path needs two code paths forever, and the framework's
own hooks stay exempt from the validation everyone else gets.
`getAvailableHooks()` becomes a view over the catalog (§11).


---

## 6. Naming: define versus register

`static hooks` (consumer) is unchanged — it is what every existing plugin,
every doc example, and T-092's provider plugins already use. The producer-side
property is therefore named so it cannot be confused with it:

```js
class AiCoreController {

    // hooks this controller DEFINES - the contract, for others to handle
    static hookDefinitions = {
        onAiProviderRegister: {
            description: 'Contribute a provider descriptor: id, models, price table, capabilities',
            mode: 'execute', contextKeys: ['providers'], canModify: true
        },
        onAiComplete: {
            description: 'Run one completion; emit normalized events; return usage',
            mode: 'executeForPlugin', contextKeys: ['threadId', 'model', 'messages', 'tools'],
            onError: 'abort', canModify: true
        }
    };

    // hooks this controller HANDLES - unchanged syntax
    static hooks = {
        onUserAfterSave: { priority: 50 }
    };
}
```

`providesHooks` and `declaresHooks` were both considered and rejected:
`providesHooks` reads as a near-synonym of `hooks`, and `declaresHooks` collides
with the existing consumer-side use of "declare" (§3). "Definitions" cannot be
misread as "hooks I handle".

Renaming `static hooks` to `static hookHandlers` for full symmetry was
considered and **not** taken — T-092 §10.1 already specifies `static hooks` for
its provider plugins, and the churn buys nothing the doc wording cannot.


---

## 7. Ownership, collisions, and the naming convention

**Hook names keep `onBucketAction` camelCase for every owner**, framework and
third party alike. A namespaced alternative (`ai-core:complete`) would be
collision-proof by construction, but it splits the convention in two, breaks the
existing `static hooks` key style, and forces a migration for zero functional
gain. Collisions are instead *detected* via `owner`.

Rules:

- `owner` is present on every definition — passed to `defineHooks()`, or taken
  from the defining class's plugin/site name.
- An **identical** re-definition is idempotent — two plugins in a family may
  both define defensively without an error.
- A **conflicting** re-definition keeps the first, logs an error, and records
  both in the catalog so introspection shows the conflict. Defining must not
  throw: a plugin should not be able to abort boot by shipping a bad name.
- A recommended prefix derived from `owner` (`ai-core` → `onAiCore*` / `onAi*`)
  is **advisory only**, surfaced in the audit, not enforced. Enforcement would
  produce names nobody wants (`onAiCoreProviderRegister`) and would still not
  prevent collisions between unrelated owners.

**`onGetInstanceStats` → `onSystemGetStats`.** It is the only hook that breaks
the convention, and preserving a permanent exception inside the very item that
makes the convention machine-checkable is the wrong trade. There is one fire
site (`webapp/controller/health.js`), one catalog entry, and the `isStatsHook`
branch in `execute()`; no plugin in this repository registers it.


---

## 8. Validation and the Boot Audit

**Registration never fails on an undefined name.** A consumer plugin can
legitimately initialize before the producer that defines the hook — and per §5.3
always does, when a plugin consumes a site-defined hook — so an immediate
warning is a false alarm as often as a real finding.

- `register()` accepts any name and records unmatched ones as *unverified*.
- A late `defineHook()` **retro-validates**: any already-registered handler for
  that name moves out of the unverified set.
- After boot completes, a **single audit** runs and reports what remains. One
  clear list beats N scattered warnings.
- The audit is also available on demand through the query API, so a plugin
  enabled at runtime can be checked without a restart.

Audit findings and their log levels:

| Finding | Level |
|---|---|
| Handler on an undefined hook, **with a did-you-mean suggestion** | warning |
| Handler on a hook defined by a currently disabled plugin | warning |
| Handler on a `deprecated` hook (names `deprecatedBy`) | warning |
| Handler on a `planned` hook — defined but not yet fired (§9) | warning |
| Conflicting definition | error |
| Incomplete definition (description only) | info |
| Advisory owner-prefix mismatch | info |

The did-you-mean suggestion is the single highest-value line in the audit:
edit-distance matching against the catalog turns `onUserAfterSav` from a silent
no-op into `no definition; did you mean 'onUserAfterSave'?`. Typos are the most
common real failure this registry can catch, and today's message ("Unknown hook
'X' registered") tells the reader nothing they did not already know.

**Placement:** the audit is *computed* in `HookManager.getAudit()` and merely
*logged* by bootstrap, so `HealthController` can re-run it later for free. It
must run **after step 14**, not next to `checkLocalAuthRestrictionSafety()` at
step 7.5, or site definitions do not exist yet.


---

## 9. Definitions that never fire

`onUserBeforeDelete`, `onUserAfterDelete`, and `onUserSyncProfile` are in the
catalog and are fired nowhere. A plugin registers a handler, sees it in
`getRegisteredHooks()`, and waits forever.

They are **not removed**, because they are a real seam that near-term work
wants: T-092 keys `aiAgentThreads`, `aiAgentTurns`, and `aiAgentUsage` to a
username with cascade cleanup designed only for map deletion, and `auth-oauth`
is the natural consumer of profile sync. Deleting the names would remove the
extension points immediately before the features that need them.

Instead:

- All three are marked **`stability: 'planned'`**, which the docs table, the
  admin view, and the audit all surface, so "declared but not yet fired" is
  visible rather than silent.
- A **scan test** asserts that every `owner: 'framework'` definition *not*
  marked `planned` has a matching `execute*('<name>'` call site in the framework
  source. A future hook that is defined and never wired fails CI, and marking
  one `planned` becomes a deliberate act rather than an oversight.

Framework user deletion (a `UserModel.delete()` plus its cascade) is its own
work item; this item only stops the catalog from lying about it.


---

## 10. Cancellation and error policy

This is the one place where existing behavior changes, and the reason is that
today there are three different cancellation stories, only one of which works.

### 10.1 What changes

- **`executeWithCancel()` is deleted**, along with the "a handler returns
  `false` to cancel" convention. It has one production caller, which migrates
  (§10.4), and the convention it implements is the one that silently corrupts
  the context when used with `execute()` (§4.2).
- **`execute()` stops assigning a non-object return into the context.** That
  single guard removes the corruption path.
- **Cancellation is always: throw an `Error` whose message is safe to show the
  user.** That is the only mechanism that carries a *reason*, which any real
  rejection needs — the framework already surfaces exactly this in the one
  place cancellation works today (`CONFIG_SAVE_REJECTED`, a 400 with the
  handler's message).
- **Whether a throw aborts the producer is declared, not guessed**, via
  `onError`.

### 10.2 The `onError` policy

| `mode` | Default `onError` | Behavior |
|---|---|---|
| `execute` | `continue` | Handler error logged, next handler runs — today's behavior |
| `executeFirst` | `continue` | Handler error logged, next handler tried — today's behavior |
| `executeForPlugin` | `abort` | Handler error propagates to the caller — today's behavior (W-200) |

Every default reproduces current behavior, so an undefined hook and an
unmigrated caller both keep working. A definition overrides the default:
`onError: 'abort'` on a broadcast hook makes any handler's throw propagate,
naming the offending plugin.

The documented rule of thumb is **"Before hooks may veto, After hooks may
not."**

T-092 is the case that proves per-hook policy is needed rather than per-method:
`onAiProviderRegister` is a broadcast where one broken provider plugin must not
take down the whole provider list (`continue`), while `onAiComplete` is a
targeted dispatch where a provider failure must fail the turn rather than
silently return nothing (`abort`). Same owner, same release, opposite policies.

This also gives defining a hook its first concrete payoff beyond documentation:
`abort` semantics on a broadcast hook are only available to a producer that
defines its contract.

### 10.3 Call sites that change

- `onUserBeforeSave` is defined `onError: 'abort'`, making it the veto point it
  has always claimed to be. `UserModel.create()`, `UserModel.update()`, and
  `UserController.signup()` let the error surface with the handler's message,
  following the `CONFIG_SAVE_REJECTED` precedent (400 with the message verbatim).
- The stale comment in `webapp/controller/user.js` documenting the return-`false`
  contract is deleted.
- `onPluginConfigBeforeSave` is unchanged in behavior and **stops being an
  exception** — it is simply a hook whose mode defaults to `abort`. The
  five-line "cancel here means throw" paragraph disappears from the catalog,
  from `plugin-hooks.md`, and from the mental model.

### 10.4 The one existing consumer, and what its migration removes

BubbleMap's `onBubbleWidgetConfigBeforeSave` is a site-defined veto hook
guarding whether a user may add or change a Custom Script stage on a widget.
It is worth reading closely, because it independently arrived at both of this
section's conclusions and had to hand-build them.

The producer, `BubbleController._checkWidgetConfigSaveHook()`, passes a
`message` field *into* the context so a vetoing handler has somewhere to put its
reason, then reads it back out to build a 403 — a hand-rolled channel for
exactly what a thrown `Error` carries natively. The consumer,
`widget-chart-core`, wraps its handler in a `try`/`catch` whose comment states
the problem outright: `executeWithCancel` "would otherwise swallow a thrown
error and fail OPEN (continue as if nothing happened), which is the wrong
default for a security gate", so the catch converts any unexpected error into an
explicit `return false`.

Under this design both workarounds are deleted rather than ported. The hook is
defined `mode: 'execute'`, `onError: 'abort'`; a veto is
`throw new Error('You are not allowed to add or change a Custom Script…')`; the
producer wraps the `execute()` call in `try`/`catch` and maps `error.message`
onto the same `{ status: 403, code: 'WIDGET_CONFIG_SAVE_DENIED' }` response it
returns today. Failing closed on an unexpected error becomes the declared
default rather than something each handler author must remember, which for a
security gate is the whole point.

That a third party built these two mechanisms by hand, in the only place the
framework's cancellation story was ever used in earnest, is the strongest
available evidence that they belong in the definition rather than in each
caller.


---

## 11. Query Surface

```js
HookManager.getHook('onAiComplete');
// → { name, defined: true, active: true, definition: {...},
//     handlers: [{ plugin, priority }], unverified: false }

HookManager.findHooks({ owner: 'ai-core' });
HookManager.findHooks({ namePattern: /^onAuth/ });
HookManager.findHooks({ stability: 'deprecated', hasHandlers: true });
HookManager.getAudit();
```

`getHook()` returns definition and live registrations **merged**, so one call
answers "who owns this, who listens, and in what order" — the actual question
when debugging a hook that is not firing as expected. It is also T-092's
provider-availability probe: which plugins have handlers for `onAiComplete`
*is* the list of usable providers. `hasHandlers()` stays as the cheap check a
producer uses to skip building an expensive context when nobody is listening.

`getHooksByNamespace()` is retained — the doc generators and the test suite both
use it — reimplemented over `findHooks({ namePattern })`.

Three consumers justify building the surface:

- **`GET /api/1/hook`** and **`GET /api/1/hook/:name`** (admin-only): the "who
  listens to what" view, currently impossible to answer without reading source.
  Top-level and singular, matching every existing route (`/api/1/plugin`,
  `/api/1/user`, `/api/1/config`); *not* nested under `/api/1/plugin`, which
  would be a lie for framework- and site-owned hooks and would additionally be
  shadowed by `/api/1/plugin/:name` (§4.2).
- **The admin view**, as a panel on `webapp/view/admin/plugins.shtml`.
- **Documentation generation**, which already exists (§4.2) and only needs an
  `owner` filter parameter and Owner / Mode columns to stay truthful once third
  parties own hooks.


---

## 12. Compatibility and Breaking Changes

Unchanged:

- Every hook name except `onGetInstanceStats` (§7).
- `static hooks = { onX: { priority } }` consumer syntax.
- `getAvailableHooks()`, `getHooksByNamespace()`, `isValidHook()`,
  `getRegisteredHooks()`, `hasHandlers()`, `unregister()`, `getMetrics()` —
  same names, same shapes. `getAvailableHooks()` becomes a view returning all
  *active* definitions (not framework-only): every existing caller wants that,
  the published doc tables are namespace-filtered anyway, and `getMetrics()`
  reporting a dynamic `available` count is a correction rather than a
  regression.
- Each catalog entry keeps `description`, `context`, `canModify`, `canCancel`,
  so the W-105 generators and their tests keep working untouched (§4.2).

**Breaking — site and plugin code must be reviewed:**

| Change | Who is affected | Symptom if missed |
|---|---|---|
| `executeWithCancel()` removed | Any producer calling it | `TypeError: not a function` |
| Return-`false` cancellation removed | Any handler returning `false` | The return is ignored; the operation proceeds (previously it corrupted the context, so this is strictly safer) |
| `onUserBeforeSave` becomes `onError: 'abort'` | Any handler on that hook that throws | A throw now aborts the user save with a 400 instead of being logged and ignored |
| `onGetInstanceStats` → `onSystemGetStats` | Any plugin registering it | Handler silently never fires; the audit reports it as undefined with a did-you-mean |
| `HookManager.clear()` clears handlers only | Tests calling it expecting a full reset | Use `clearDefinitions()` for the catalog |

The existing `webapp/tests/unit/utils/hook-manager.test.js` suite is the
compatibility gate through the registry-core commit; the cancellation commit
deliberately rewrites its `executeWithCancel` block and `canCancel` assertions.

### 12.1 Ecosystem inventory (scanned 2026-08-12)

Across the framework, its locally installed plugins, and both deployed sites
(bubblemap.net, jpulse.net). Note that `.gitignore` excludes `plugins/*` apart
from `hello-world`, so a search of the framework repository alone does **not**
see the installed plugins — this inventory was taken with `--no-ignore` plus a
scan of each site checkout.

Every hook handler that exists anywhere:

| Owner | Registers |
|---|---|
| `auth-oauth` | `onAuthGetLoginProviders`, `onAuthGetSteps`, `onAuthValidateStep`, `onPluginConfigBeforeSave` |
| `auth-mfa` | `onAuthGetSteps`, `onAuthValidateStep`, `onAuthGetWarnings`, `onGetInstanceStats` |
| `hello-world` | `onAuthAfterLogin`, `onAuthBeforeSession` |
| `widget-chart-core` (BubbleMap) | `onBubbleWidgetConfigBeforeSave` — a site-defined hook |

Nothing registers `onUserBeforeSave`, so that breaking change has **no real
consumer**; nothing registers the three `planned` hooks either (§9).

### 12.2 Migration list

| Repository | File | Change |
|---|---|---|
| bubblemap-app | `site/webapp/controller/bubble.js` | `_checkWidgetConfigSaveHook()`: `executeWithCancel` → `execute` in a `try`/`catch`, mapping `error.message` onto the existing 403 `WIDGET_CONFIG_SAVE_DENIED`; drop the `message` field from the context; add `static hookDefinitions` defining `onBubbleWidgetConfigBeforeSave` with `onError: 'abort'` |
| bubblemap-app | `plugins/widget-chart-core/webapp/controller/widgetChartCore.js` | Two `return false` sites become `throw new Error(<the message it already writes to `context.message`>)`; the fail-closed `catch` comment and its workaround are deleted, since failing closed is now the declared default |
| bubblemap-app | `site/webapp/tests/unit/controller/bubble.test.js` | Five assertions against the `{ cancelled, cancelledBy }` envelope become assertions on the thrown-error path |
| auth-mfa (all three deployments) | `webapp/controller/mfaAuth.js` | `onGetInstanceStats` → `onSystemGetStats` in `static hooks` and the handler method name |
| auth-mfa (all three deployments) | `README.md` | One line naming the old hook |

Roughly fifteen lines, net negative once the two workarounds in §10.4 are
removed. No other site or plugin code is affected.


---

## 13. Worked Example: AI provider plugins (T-092)

This is the driver, and it shows the framework staying domain-free.

`ai-core` — site code in BubbleMap's case — defines the contract on its
controller, auto-registered by `SiteControllerRegistry` (§6 shows the full
class). The framework never learns the word "AI".

`ai-anthropic` and `ai-mock` handle those hooks with the unchanged
`static hooks` syntax (T-092 §10.1). The orchestrator then uses only what
already exists:

- `execute('onAiProviderRegister', { providers: [] })` to build the provider
  list at boot — `onError: 'continue'`, so one broken plugin costs one provider
  rather than the feature.
- `executeForPlugin('onAiComplete', selectedProvider, ctx)` to run a turn —
  targeted, `onError: 'abort'`, so a provider failure fails the turn instead of
  being logged and swallowed.
- `getHook('onAiComplete').handlers` for the capability probe that decides which
  providers are usable (T-092 §5.2, §11.4).

A second consumer — a payment provider, a search backend, an export format —
follows the same shape with no framework release.


---

## 14. Optional: dev-mode contract check

With `contextKeys` machine-readable, the manager can verify that the context a
producer passes actually contains the defined keys, **and** that the execute
method used matches the defined `mode` — one config flag, both checks, off in
production. Cheap, and it catches the contract drift that otherwise surfaces as
a handler reading `undefined`. Additive; can land after this item without
reshaping anything.


---

## 15. Testing

- **Definition**: `description`-only definition succeeds with correct defaults;
  `defineHooks()` owner stamping; `onError` / `returns` derived from `mode`;
  idempotent identical re-definition; conflicting re-definition keeps the first
  and records both; defining never throws.
- **Error policy**: each mode's default; an `abort` override on a broadcast hook
  propagates and names the plugin; `continue` logs and proceeds; `execute()` no
  longer assigns a non-object return into the context.
- **Audit**: unmatched registration reported once with a did-you-mean; late
  definition retro-validates and clears it; deprecated, planned, and
  disabled-owner findings; prefix mismatch is info only; `getAudit()` callable
  at runtime; audit tolerates the `isTest` path where step 14 never ran.
- **Catalog honesty**: the scan test asserting every non-`planned` framework
  definition has a fire site (§9).
- **Query**: `getHook()` merges definition and handlers; each `findHooks()`
  filter in isolation and combined; unknown name returns a well-formed
  "undefined" result rather than throwing.
- **Lifecycle**: disable marks definitions inactive and drops handlers;
  re-enable restores; a consumer of a disabled producer's hook shows the right
  audit message.
- **Producer surfaces**: plugin `static hookDefinitions` auto-defined; site
  `static hookDefinitions` auto-defined and site `static hooks` auto-registered;
  plugin controllers scanned by `SiteControllerRegistry` are **not** registered
  twice.
- **Compatibility**: `getAvailableHooks()` entries still carry `description`,
  `context`, `canModify`, `canCancel`; `getHooksByNamespace()` and
  `isValidHook()` unchanged; the W-105 doc generators render without `undefined`.
- **Call-site changes**: a throwing `onUserBeforeSave` handler aborts create,
  update, and signup with the handler's message; `onSystemGetStats` still
  produces per-plugin elapsed timing.


---

## 16. Commits

**1 — registry core and framework seed.** `webapp/utils/hook-definitions.js`;
`defineHook()` / `defineHooks()`; the definition store with owner, stability,
and collision policy; `getAvailableHooks()` / `getHooksByNamespace()` /
`isValidHook()` as views; `clear()` narrowed to handlers plus
`clearDefinitions()`; `getMetrics()` counts. No caller changes — the existing
test suite passes untouched, which proves the view.

**2 — one cancellation model.** Remove `executeWithCancel()` and the
return-`false` convention; `onError` policy honored by the three remaining
execute methods; `onUserBeforeSave` becomes a real veto point and its three call
sites surface the message; delete the stale comment;
`onGetInstanceStats` → `onSystemGetStats`; mark the three unfired hooks
`planned`.

**3 — query, audit, retro-validation.** `getHook()`, `findHooks()`,
`getAudit()`; the unverified set and retro-validation; did-you-mean; the
post-step-14 bootstrap audit and its banner line; the fire-site scan test.

**4 — producer and consumer surfaces.** `HookManager.registerFromClass()`
extracted; `PluginManager` auto-defines `static hookDefinitions` and marks
definitions inactive on disable; `SiteControllerRegistry` auto-defines and
auto-registers for site controllers only; the hello-world reference example.

**5 — visibility and docs.** `webapp/controller/hook.js` and its routes (plus
the `/api/1/plugin/dependencies` reorder); the admin hooks panel and its
translations; generator `owner` filter and new columns; all documentation.


---

## 17. Deliverables

| File | Change |
|---|---|
| `webapp/utils/hook-definitions.js` | **New.** The framework's hook definitions as data, seeded at module load |
| `webapp/utils/hook-manager.js` | Definition store, `defineHook`/`defineHooks`, collision and stability handling, `onError` policy, `executeWithCancel()` removed, unverified set with retro-validation, `getHook`/`findHooks`/`getAudit`, `registerFromClass`, `getAvailableHooks()` as a view, `clear()` / `clearDefinitions()` |
| `webapp/utils/plugin-manager.js` | Auto-define `static hookDefinitions`; delegate hook registration to `registerFromClass`; mark definitions inactive on disable, reactivate on enable |
| `webapp/utils/site-controller-registry.js` | Auto-define `static hookDefinitions` and auto-register `static hooks` for site-source controllers only, after `initialize()` |
| `webapp/utils/bootstrap.js` | Run the hook audit after step 14; banner summary and warning line |
| `webapp/model/user.js`, `webapp/controller/user.js` | `onUserBeforeSave` abort path surfaced on create / update / signup; stale return-`false` comment removed |
| `webapp/controller/health.js` | `onGetInstanceStats` → `onSystemGetStats` |
| `webapp/controller/hook.js` | **New.** Admin controller: `GET /api/1/hook`, `GET /api/1/hook/:name` |
| `webapp/routes.js` | Hook routes; `/api/1/plugin/dependencies` reordered above `/api/1/plugin/:name` |
| `webapp/controller/markdown.js` | Hook generators gain an `owner` filter and Owner / Mode columns |
| `webapp/view/admin/plugins.shtml` | Hooks panel: definitions, owners, listeners, audit findings |
| `webapp/translations/en.conf`, `de.conf` | Strings for the hooks panel |
| `plugins/hello-world/webapp/controller/helloPlugin.js` | Reference example: defines a hook and handles one |
| `webapp/tests/unit/utils/hook-manager.test.js` | Extended per §15; `executeWithCancel` block removed, `canCancel` assertions updated |
| `webapp/tests/unit/utils/hook-definitions.test.js` | **New.** Catalog honesty: fire-site scan for every non-`planned` framework definition |
| `webapp/tests/unit/utils/plugin-manager.test.js` | `hookDefinitions` auto-definition, inactive-on-disable |
| `webapp/tests/unit/utils/site-controller-registry.test.js` | Site `static hooks` auto-registration; plugin controllers not double-registered |
| `webapp/tests/unit/model/user-*.test.js`, `webapp/tests/unit/controller/user-*.test.js` | `onUserBeforeSave` abort path |
| `docs/plugins/plugin-hooks.md` | "Define your own hooks" section; rewritten cancellation section; the `onPluginConfigBeforeSave` exception paragraph removed; "Declare Hooks in Your Controller" re-worded to "Handle Hooks" |
| `docs/site-customization.md` | Site code as hook producer and consumer, from `initialize()` |
| `docs/api-reference.md` | `/api/1/hook` endpoints; pointer to `plugin-hooks.md` for the definition API |
| `docs/CHANGELOG.md`, `README.md`, `docs/README.md` | Release entry and highlight, including the breaking-change list (§12) |
| `docs/dev/design/W-209-extensible-hooks.md` | This document |


---

## 18. Open Questions

- [ ] Should `contextKeys` support nested paths (`req.user.username`) or stay
      flat top-level keys? Leaning flat, with an optional
      `{ key, type, description }` object form per entry for the docs, since the
      only mechanical use is "does the context carry these keys".
- [ ] Should the per-handler elapsed timing in `execute()` be generalized so the
      `onSystemGetStats` special case disappears (§4.2)? Deferred by decision;
      about two lines whenever the loop is next touched.
- [ ] Should a definition be able to state that it expects exactly one handler,
      so two registrations become an audit finding? Deferred — `executeForPlugin`
      already scopes by plugin, so the only case it catches is one plugin
      registering twice.
- [ ] Is `test-site-temp/webapp/utils/hook-manager.js` generated or tracked? If
      tracked, it needs the same treatment as the real file.
