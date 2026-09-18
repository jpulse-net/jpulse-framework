# W-223 AI agent framework for sites

**Status:** W-223 is published (`@jpulse-net/plugin-ai-core` 1.0.0, 2026-09-17).
W-224 is published (`@jpulse-net/plugin-ai-anthropic` 1.0.0 and
`@jpulse-net/plugin-ai-core` 1.0.1, 2026-09-17). **W-226** (chat panel,
client-host tools, `hello-ai`) is published
(`@jpulse-net/plugin-ai-core` 1.0.2 carrying `ai-mock` 1.0.2, 2026-09-17).
**W-227** (propose and apply) is published as `@jpulse-net/plugin-ai-core`
1.0.3 (bundle carries `ai-mock` 1.0.3; mock had no product change). **W-228**
(attachments, URL ingest, conversion call path, vision) is published as
`@jpulse-net/plugin-ai-core` 1.0.4 (bundle carries `ai-mock` 1.0.4; mock gained
a vision row). Five framework prerequisites are released — W-220
`jPulse.UI.floatPanel` (v2.0.0), W-221 plugin bundle build and installation
(v2.0.1), W-222 plugin and site translation merge (v2.0.2), W-225
awaitable `onCreate` (v2.0.3), and **W-229** document-conversion and
preview hook definitions (v2.0.4, blocks nothing, §21.1). **W-230**
(panel regions and site-owned slash commands) is published as
`@jpulse-net/plugin-ai-core` 1.0.5 (bundle carries `ai-mock` 1.0.5; mock
had no product change). **W-231** (extract `hello-ai` as a third bundle
member) is published as `@jpulse-net/plugin-ai-core` 1.0.6 (bundle
carries `ai-mock` 1.0.6 and `hello-ai` 1.0.6; mock lockstep only). §21
splits the agent into five items, W-223, W-224, and W-226 through
W-228, on those prerequisites. Deviations from this document are under
`### As Built`. Rev 12 specified W-227 against shipped 1.0.2, Rev 13 is
the as-built after implementation, Rev 14 specifies W-228, Rev 15 is
the as-built after 1.0.4, Rev 16 records that W-229 is four hooks, not
two, Rev 17 is the as-built after v2.0.4, Rev 18 is W-230 (specified
and shipped as 1.0.5), and Rev 19 is W-231 (specified and shipped as
1.0.6).


## Revision history

### Rev 19 — 2026-09-17 — W-231 extract hello-ai as a bundle companion

`hello-ai` leaves `ai-core` and becomes a third member of
`@jpulse-net/plugin-ai-core`, same shape as `ai-mock`. One install, one
publish. An admin can disable the demo without disabling AI. No
framework source change. The scratch pad is not rewritten. Shipped as
1.0.6.

| Section | Change |
|---|---|
| Header, §5.1, §22.1, §22.2 | Bundle is `ai-core` + `ai-mock` + `hello-ai`. Demo is not a view inside `ai-core` |
| §21 | W-231 published as 1.0.6; next AI item is unscheduled |
| As Built | Item 35 |

### Rev 18 — 2026-09-17 — W-230 panel regions and site-owned slash commands

The panel stops owning the whole surface. A site fills named anchors and
owns the complete command list; the framework keeps implementations
addressable by name. Defaults are generic and gated on data the panel
already holds. `examples` stays as the content slot of `/help`.
`describeScope()` is removed from the adapter.

| Section | Change |
|---|---|
| Header, §12.1, §12.2 | Named region anchors; ten gated defaults; last-wins catalog; clickable `/help` examples; context row plus `handle.context`; `describeScope` struck |
| §21 | W-230 is published as 1.0.5; next is W-231 |

### Rev 17 — 2026-09-17 — W-229 as built

No AI product change. The four hook definitions shipped in framework
v2.0.4. These lines are what the catalog and `docs/hooks.md` actually
contain.

| Section | Change |
|---|---|
| Header, §21.1, §22.2 | W-229 is v2.0.4; all five framework prerequisites are released |
| §14.3 | Output keys, `originalName`, `imageBase64` / `previewMime`; empty extract vs throw; convert retry vs preview single pick; `_isSameDefinition` includes `owner` |
| §16 | The four names are catalog rows, not future work |
| §22.3 | `docs/ai-agent.md` is framework orientation; the plugin guide stays the contract |
| As Built | Items 32–34 |

### Rev 16 — 2026-09-17 — W-229 is four hooks, not two

No AI product change. Reading the reference site showed the convert pair is
half of a four-hook family already shipped there: a file-attachment controller
with no AI near it defines `onDocumentPreviewRegister` /
`onDocumentPreview`, and one converter plugin registers all four. That is
§14.3's own ownership argument demonstrated rather than argued, so W-229
defines the sibling pair in the same item. The catalog is the contract, not a
dozen-line stub.

| Section | Change |
|---|---|
| Header, §14.3, §16, §21.1, §22.2 | W-229 is four framework-owned hooks (convert plus preview); §22.2's "roughly a dozen lines" becomes four definitions plus a `docs/hooks.md` section |

### Rev 15 — 2026-09-17 — W-228 as built

No new product decision. Attachments shipped in `@jpulse-net/plugin-ai-core`
1.0.4 (bundle carries `ai-mock` 1.0.4 with a vision row). These lines are
what the code wanted once it ran.

| Section | Change |
|---|---|
| Header, §21.7 | W-228 is 1.0.4; next AI items are W-230 then W-231; W-229 still pending |
| §9.6 | Manifest slot is filled; empty-sources policy when `list_sources` / `get_source` are withheld as `no-sources` |
| §12.1 | Chip chrome is tooltip + click details, not an outline expander. Compact compose, drop hover, toasts, `confirmDialog` URL add. Intercept hides on question-about-link wording. Hello AI breadcrumb is under site hello demos only |
| §14.1 | `adapter.sourceAttachable` is documented; the panel never calls it (no attach-to-object chrome) |
| As Built | Items 25–31 |

### Rev 14 — 2026-09-17 — W-228 specified; document conversion is framework-owned

Attachments were specified against the shipped code and against the reference
site's three attachment features rather than against §14's four bullets, and the
reading changed three things.

First, §14's claim that `onDocumentConvertRegister` / `onDocumentConvert` "are
already hook-shaped" was true of the *reference site*, not of the framework —
they are defined by that site's own AI controller and consumed by two of its
plugins, and the framework has never heard of them. Deciding who owns them is
therefore part of this item, and the answer is the framework (W-229), because a
name defined by `ai-core` would make a PDF converter a dependent of an AI
package. Two `HookManager` facts make that cheap: an undefined hook still
executes under its mode's default error policy, and an identical second
definition is a deliberate no-op. So caller and definer are decoupled and the
two releases are unordered.

Second, sources are client-hosted. In the reference site `get_source` is
`host: 'client'`, source text never leaves the tab, and the outline / window /
caps logic is already a pure module loaded in the browser and under Jest — which
is `ai-core`'s §8.2 shape exactly. Phase 1 therefore needs no collection, no
upload, and nothing in the loop, and two seams shipped in 1.0.0 already cover
its budget: `budget.max` accepts a settings key name and `countWhen` is what the
old `isSourceTextRead()` predicate was.

Third, the byte paths should stream. W-217 shipped `bodyMode: 'stream'` with
`StreamBody` and W-219 shipped the nginx location, and nothing in the tree uses
either; the framework's own guidance says not to buffer a file as base64 JSON,
which is what the reference site does. W-228 is the first consumer.

| Section | Change |
|---|---|
| Header, §21.1 | W-227 published as 1.0.3; a fifth prerequisite, W-229, pending and blocking nothing |
| §9.2 | Message `content` may be an array of `text` / `image` parts; unknown part types are absent rather than an error. `ai-anthropic` 1.0.0 already accepts it |
| §9.6 | What the manifest slot holds — metadata only, never source text — and that the reference site's per-source steering is a site fragment |
| §9.7 | `sourceRefs` on `aiTurns`: the durable half of the memory-only decision |
| §12.1 | Chips and the intercept card restated as W-228 against 1.0.3; `adapter.sourceAttachable`, `handle.sources()`, `handle.sourceFile(id)`, and why the original `File` has to stay reachable |
| §14 | Rewritten as §14.1–§14.5: client-hosted sources, `UrlFetch` ingest and the intercept card, framework-owned conversion hooks with ordered converter retry, Redis image staging with send-time vision gating and `data.media`, and the explicit non-goals |
| §16 | Two hooks `ai-core` executes but does not own |
| §20 | TD-15 conversation-scoped tool cache; TD-16 server-resolved and persistent sources |
| §21.7 | Four phases in detail, the `ai-mock` vision row as a real product change, and the named scope traps |
| §22.1, §22.2 | `webapp/utils/attachments/`; the third framework source file, and why ownership rather than capability made it an item |

### Rev 13 — 2026-09-16 — W-227 as built

No new product decision. Propose/apply shipped in `@jpulse-net/plugin-ai-core`
1.0.3. These lines are what the code wanted once it ran.

| Section | Change |
|---|---|
| Header, §21.6 | W-227 is 1.0.3; `ai-mock` is a version lockstep only; next item is W-228 |
| §13.2 | Persist still writes nothing on a read-only turn; the one extra write is `proposingOffered: true` when a proposing tool was offered and the reply claimed a card |
| §13.3 | Applied / undone flags go through `setProposals` via `applyProposalRecord` / `undoProposalRecord`, not `AiTurnModel.markApplied` / `markUndone` |
| §13.4 | The framework prompt sentence also says several proposing calls in one turn each get a card and every pending card stays applyable |
| §12.1 | Apply cards, Apply all, and the guard are 1.0.3 chrome. Transcript pins to the bottom on render, after layout, and on float-panel open. User prompts are right-aligned pills. `/tools` names render as `<code>` because local slash replies are plain text, not markdown |
| As Built | Items 20–24 |

### Rev 12 — 2026-09-16 — W-227 specified against the shipped code

Propose/apply was designed against `ai-core` 1.0.2 rather than against §13's
sketch, and the code answered two questions the sketch left open. First, two
of the three things §9.1 removes from the loop already exist in the tools
layer: the proposal counter is `budget: { key: 'proposals', max }` and the
"already carded" refusal is `dedupeArgs`, both from 1.0.0, so only the
false-claim guard and the two notes need a new home. Second, `onAiTurnAfter`
fires in the loop's `finally`, *after* the `completed` event has reached the
tab — and the panel answers `completed` by re-fetching the turn list. A
subscriber that were the only writer of proposal records would be racing the
request that renders them. So the record is **derived** by one pure function
over the turn's `toolCalls`, which the read path, both endpoints, and the
history notes all call; the subscription persists that list rather than
being the only source of it.

The AI plugins are new in this release train, so the spec was changed where
it improves DX rather than preserved: no name-prefix detection, no flat
proposal mirror on the turn, no `maxProposalsPerTurn` setting, and notes
computed on read instead of written into stored text. §18 already records
that the reference site has no supported upgrade path to preserve;
equivalence with what that site does today is tracked feature by feature in
the work item.

| Section | Change |
|---|---|
| §13 | **Rewritten** as the contract: `proposes: true` on the descriptor plus `data.proposal` in the envelope; framework-minted proposal ids; one derivation function over `toolCalls`; `onAiTurnAfter` persists rather than being the only writer; the endpoints are bookkeeping and the site's own write path is the enforcement point; the guard splits into a model-facing history note and user-facing panel chrome; the phrases are admin config with a shipped default |
| §9.1 | Where each removed piece landed: counting and dedupe are declarations on the site's tool, the notes are computed at history assembly, and a test asserts the loop source stays free of proposal vocabulary |
| §12.1 | The three `*Proposal` adapter methods land in 1.0.3. Apply calls the adapter *before* it records; a preview returns a node or plain text; Apply cards join the list of panel surfaces with the release that carries them |
| §16 | `onAiTurnAfter` gets its first consumer, which is also the check that defining a lifecycle hook ahead of its use was worth doing |
| §17 | The AI tab gains the false-claim phrase list |
| §19 | Propose/apply tests, including the loop-purity assertion and the read-only agent producing no record, card, or note |
| §20 | **New TD-14:** a hook for site-authored history notes |
| §21.6 | Three phases — server, panel, then `hello-ai` and docs. `hello-ai` grows one proposing tool, as a **pure module**, because proposing is read-plus-validate and only `applyProposal` writes |

### Rev 11 — 2026-09-16 — W-226 published; W-225 no longer open

No product change. Header, §21.1, and §22.2 now say both framework
prerequisites and the panel item are shipped. §5.1 records that `hello-ai`
is in 1.0.2. §12.1 marks attachments / URL-intercept as W-228 and the
proposal adapter methods as W-227 so they are not read as 1.0.2 surface.
The reload notice is the running-turn string, not a separate stuck prompt.

| Section | Change |
|---|---|
| Header, §21.1, §22.2 | W-225 is v2.0.3; `onCreate` is awaited. No open framework source change for the remaining AI items |
| §5.1, As Built 5 | `hello-ai` shipped in 1.0.2 |
| §11.1 | Opening sentence is the reference site, not jPulse 1.0.2 |
| §12.1 | Attachment / URL-intercept bullets are W-228; `*Proposal` adapter methods are W-227 |

### Rev 10 — 2026-09-16 — W-226 as built

No new product decision. The panel, client-host bridge, shared modules, and
`hello-ai` shipped in `@jpulse-net/plugin-ai-core` 1.0.2. These lines are
what the code wanted once it ran.

| Section | Change |
|---|---|
| §9.7, TD-13, §12.1 | The picker lists the last 20 threads, newest first. There is no archive/resume chrome. Archive remains the internal slot that `startNew` / `forceNew` frees so a new row can insert against the partial unique index |
| §11.2 | `broadcast` / `sendToClient` / `removeIfEmpty` must use the **instance** path, not the pattern-namespace template. Switching threads disconnects the old socket; that is not a reconnect |
| §12.1 | W-220's launcher is ghost geometry and focus-return only — the panel binds click → `toggle()`. Jumping dots while a turn waits for the first token. The outgoing prompt stays visible (`pendingUser`). Slash/local rows merge with turns by timestamp. `/model` is the only model surface |
| §21.5 | `hello-ai` has no scripted buttons; `/help` lists `examples`. `read_draft` returns `data.text` (32 KB) plus a 160-character excerpt. The turn loop emits `role: 'tool'` after `tool_use`. `historyToMessages` skips turns with no `agentText` |
| As Built | Items 13–19 |

### Rev 9 — 2026-09-16 — panel chrome matches the reference site's chat

| Section | Change |
|---|---|
| §12.1 | No model picker and no new-conversation button in the header. Conversation title, select, rename, and new sit on one row under the title; there is no thread side list. `/model` views and sets the pair in the transcript. The slash picker expands as you type; Enter executes and posts the command into the chat; Esc dismisses the picker without closing the panel |

### Rev 8 — 2026-09-16 — W-226 specified against the shipped code

The panel item was written against `ai-core` 1.0.1 and framework v2.0.3
rather than against this document alone. Most of what follows is a
clarification of Rev 7, not a new decision. One extension is deliberate:
the mock's targeted script takes a step sequence, because the demo turn
cannot be expressed as a single call.

| Section | Change |
|---|---|
| §11.2 | Role and disabled checks are read **inside** `onCreate`, not frozen into `requireRoles` at `initialize()`. The socket turn message carries `script` so it stays at parity with `POST .../turn` |
| §8.2 | Module route is `auth: 'user'` with immutable caching and a 409 on an unknown hash. The capability probe grows `retentionDays` beside the module manifest. Catalog path is `webapp/utils/ai-tools/` (site: `site/webapp/utils/ai-tools/`), not a new top-level `webapp/ai-tools/` — jPulse webapp dirs stay controller, model, view, utils, tests, translations. The purity root is still that catalog directory, not the rest of `utils/` |
| §12.1 | Slash catalog is five local commands (`/help`, `/tools`, `/model`, `/new`, `/cancel`) with `//` as the literal escape. Panel `id` is `ai-panel-<scopeType>-<scopeId>`; last thread id persists under its own key. `marked.min.js` is loaded on demand — it is not in `jpulse-header.tmpl` |
| §21.5 | `hello-ai` is a scratch pad with three tools, one per shape a site can write. Demo registrations are gated on `scopeType === 'hello-ai'`. A direct `mutates: true` write is not propose/apply. `ai-mock` gains `script.steps` with `$prior.<path>` |
| §22.1 | Demo hooks live in `helloAi.js`, not `aiCore.js` |

The write stays in W-226. `adapter.executeTool` exists because some client
tools have side effects, and a write is the plainest one; a read-only demo
would leave this item defining an adapter member it cannot show. Merging
W-227 was rejected: its Apply card targets a panel that does not exist
until phase 3 here, and §21.2 groups items so each ends usable and
testable.

### Rev 7 — 2026-09-16 — panel item designed against the code; W-225 split out

Designing the panel item against the shipped framework rather than the docs
turned up one blocking defect and four contract gaps. The item numbering moved
to make room: the framework fix is W-225, and the panel becomes W-226.

| Section | Change |
|---|---|
| Header, §21.1, §22.2 | **`onCreate` is synchronous.** A returned Promise is installed as the connection `ctx`, so an async handler's rejection is ignored and the connection is accepted. `docs/websockets.md` already advertises `onCreate: async`. This is W-225, a framework prerequisite, and §22.2's "no framework source file needs a change" no longer holds |
| §21.2, §21.5–§21.8 | Renumbered: panel is **W-226**, propose/apply **W-227**, attachments **W-228**. §21.5 is now the panel item's phase list against the four decisions below |
| §11.2 | **New:** namespace authorization. Per-thread `/api/1/ws/ai/:threadId` with ownership verified in an `await`ed `onCreate`, plus `removeIfEmpty()` on the last disconnect — pattern namespaces are never reclaimed automatically |
| §8.2 | Purity is **enforced**, not only tested: a module whose imports fall outside the allowlist is refused at import and at serve, and the scanner is exported so a site writes a one-line test. A plugin test cannot cover `site/webapp/ai-tools/`, which is exactly what gets served to a browser. The manifest returns `url`, and module resolution order and the collision rule are stated |
| §22.1 | `jp-ai-*` → **`plg-ai-*`**. `jp-*` is framework-only, and the documented plugin convention is `plg-<name>-*` (`auth-oauth` ships `plg-oauth-*`) |
| §21.5 | `ai-mock` gains a targeted tool script so `hello-ai` can drive a **named** client-host tool with real arguments; `[mock:tools]` only calls whatever happens to be first on the list |

### Rev 6 — 2026-09-16 — as built after W-224 publish

No design change. Anthropic 1.0.0 and `ai-core` 1.0.1 shipped; As Built and
§9.5 / §17 / §21.4 now describe the code.

| Section | Change |
|---|---|
| Header | W-224 published; W-225 is next |
| §9.5, §17, §21.4 | Selection surface and the Anthropic port are as shipped |
| As Built | Items 6–9 updated; items 10–12 |

### Rev 5 — 2026-09-15 — as built after 1.0.0 publish

No design change. The published bundle and the admin surfaces it grew during
release prep are recorded so W-224 ports against the code, not the sketch.

| Section | Change |
|---|---|
| Header | W-223 published; W-224 is next |
| §5.1 | Published package is `ai-core` + `ai-mock` only; `hello-ai` stays W-225 |
| §9.5, §17, §21.4 | Allowed-list fields and the probe menu shipped in W-223; remaining selection work and the Anthropic port are W-224 |
| As Built | Items 5–9 |

### Rev 4 — 2026-09-15 — as built after manual testing

No design change. The server core is implemented. A few contracts had to
move once they met Node 24, MongoDB upserts, and bootstrap globals.

| Section | Change |
|---|---|
| Header | Status is implemented; As Built records the deviations |
| §11.1, §17 | See As Built: cancel is POST, dumps are plugin-config |

### As Built

These ended up different from the spec below. None changes a
decision; each is the shape the code wanted once it existed.

1. **Cancel is `POST /api/1/ai/thread/:id/cancel`, not HTTP close.**
   POST+SSE on Node 24 often fires `req`/`res`/`socket` `close` or
   `aborted` when `express.json()` finishes the body, not when the
   client drops. Auto-aborting there would cancel every provider that
   honors `abortSignal`. The in-process flag plus Redis broadcast still
   abort the attached `AbortController`. Closing curl does not cancel.
2. **Debug dumps live on the plugin config page, not `app.conf`.** The
   checkbox is `debugDumps` on Admin → Plugins → ai-core. `loadSettings`
   imports `webapp/model/plugin.js` (the `hello-world` pattern).
   `global.PluginModel` is never assigned; `global.ConfigModel` is.
3. **Usage upsert cannot `$setOnInsert` and `$inc` the same counter.**
   MongoDB rejects that on insert. Identity fields go in `$setOnInsert`;
   counters only in `$inc`. A conflicting upsert threw after SSE
   `: connected` and looked like an immediate hang return.
4. **Quota after SSE headers is an `error` event.** `openSseTurn`
   writes headers before `onAiQuotaCheck`. An exceeded cap is
   `AI_QUOTA_EXCEEDED` on the stream, not a JSON HTTP 429.
5. **The published bundle is `ai-core` + `ai-mock` only.**
   `@jpulse-net/plugin-ai-core` 1.0.0 does not contain `hello-ai`. That
   view is W-226 and shipped in 1.0.2. The package was renamed from `@jpulse-net/plugin-ai`
   before first publish so later `@jpulse-net/plugin-ai-anthropic` /
   `plugin-ai-openai` sit as peers of the primary, not of a catch-all
   `plugin-ai`.
6. **The AI tab already has the allowed-list fields.** W-223 shipped
   `defaultProvider`, `defaultModel`, and `allowedModels` (JSON textarea
   of `{ provider, model, label }`; empty means every registered model).
   `GET /api/1/ai/capability` returns that menu filtered by providers
   that actually registered, plus `defaultModel`. W-224 1.0.1 added the
   rest of §9.5: `configured === false` drops a row, `runTurn` persists
   the pair via `setProviderModel`, `PUT /api/1/ai/thread/:id` accepts
   `provider`/`model` (400 `AI_MODEL_NOT_ALLOWED` if the pair is not on
   the live menu), and `?hasImages=1` greys non-vision rows
   `{ available: false, reason: 'vision' }`.
7. **Debug dumps are the plugin-config checkbox, not an `app.conf`
   primary.** `loadSettings` still OR's `appConfig.ai.debugDumps`, but
   the supported control is Admin → Plugins → ai-core. The AI tab
   description and the plugin-config help are HTML with links to the
   AI Core overview, usage, plugin-local configuration (including
   dumps), the guide, and plugin management.
8. **AI Core is in the site menu.** `jpulse-navigation.js` registers
   `jPulsePlugins.pages.aiCore` → `/jpulse-plugins/ai-core.shtml`.
   That page loads the capability probe (default model, menu, quota,
   tools) and links to `/api/1/ai/capability`. `ai-mock` is not in that
   menu (overkill; linked from the AI Core overview). Installed-plugin
   guide URLs must be `/jpulse-docs/installed-plugins/<name>/README` —
   a trailing slash is rewritten to `index.shtml` before markdown
   routing and 404s.
9. **The Anthropic plugin is a port, not a copy.**
   `tmp-bubblemap-app/plugins/ai-anthropic` (BubbleMap 1.6.6) was the
   source for SSE, Verify, and the password key. `@jpulse-net/plugin-ai-anthropic`
   1.0.0 emits the published shape (array `tool_use`, `cacheWrite` /
   `cacheRead`, `$/MTok`). Models and prices were refreshed 2026-09-15
   (Sonnet 5, Haiku 4.5, Opus 5, Fable 5.1) — not the dated BubbleMap
   snapshot. `anthropic-version` stays `2023-06-01`. No `LICENSE` file
   (same as `ai-core` 1.0.0).
10. **`pickDefaultModel` does not require both admin fields.** Exact
    pair if both match a live row; else the first live row of
    `defaultProvider`; else `menu[0]`. An empty allowed list keeps
    every configured provider, including `ai-mock`.
11. **Provider abort is silent; plugin timeout is `AI_TIMEOUT`.**
    Emitting `AI_CANCELED` on abort made the loop fail the turn before
    cancel could win. A failed `getSecret` registers `configured:
    false` instead of throwing. A price override is ignored unless
    every merged row has four finite rates.
12. **Plugin Jest is a root `jest.config.cjs`.** `npm test` from
    `plugins/ai-core` or `plugins/ai-anthropic` chdirs to the framework
    checkout. Both bump-version lists include that file.
13. **Pattern-namespace emit uses the instance path.**
    `createNamespace('/api/1/ws/ai/:threadId')` returns a template whose
    `.path` is the pattern. The registry lookup for `broadcast`,
    `sendToClient`, and `removeIfEmpty` is by path, so a call on the
    template logs `Namespace not found`. The first connect creates the
    literal instance; turn events go to that path.
14. **W-220's launcher is not a click binding.** It is ghost geometry
    and focus-return. `jPulse.ai.panel` binds the launcher `click` to
    `handle.toggle()`.
15. **The conversation picker is last-20, newest first.** `GET
    /api/1/ai/thread?limit=20` with no status filter. Archive is not a
    user-facing mailbox: `POST /api/1/ai/thread` with `forceNew: true`
    calls `startNew`, which archives every active row for the scope and
    inserts. `findOrCreateActive` stays the first-open path. Selecting
    an older row opens it; there is no resume API and no archive button.
16. **`hello-ai` has no scripted buttons.** `panel.create({ examples })`
    feeds `/help`. The structured `script` field remains for `curl` and
    sites. User-facing copy says scratch pad only (tool ids stay
    `read_draft` / `append_draft` / `propose_draft_rewrite`). The pad is page-local `.local-*`,
    `resize: both`, block-stacked under its label; the default layout
    is full width.
17. **A `tool_use` is followed by `role: 'tool'`.** Anthropic requires
    `tool_result` immediately after `tool_use`. The turn loop pushes
    those rows; `ai-mock` reads them (and still accepts a legacy user
    JSON array).
18. **`historyToMessages` skips turns with no `agentText`.** A failed
    or empty turn must not become a consecutive user role on the next
    request.
19. **`read_draft` returns the pad, not only an excerpt.** `data.text`
    is capped at 32 KB (`truncated` when clipped); `data.excerpt` is
    a 160-character preview.
20. **`onAiTurnAfter` persist writes `proposingOffered` on a claiming
    no-card turn.** A turn with no `data.proposal` still needs the
    guard and the history note; the flag is that mark. A read-only
    turn stays byte-identical to 1.0.2.
21. **Applied / undone are helpers, not model methods.**
    `AiTurnModel.setProposals` and `markProposingOffered` are the
    writes. `applyProposalRecord` / `undoProposalRecord` live in
    `utils/proposals/` with `applyThenRecord` / `undoThenRecord` so
    the panel and the tests share the adapter-first order.
22. **Local `/tools` is not markdown.** Slash replies go through
    `renderPlain`, so tool names become `<code>` after HTML escape.
    User prompts are right-aligned pills (`plg-ai-user`) with a
    primary inset bar.
23. **The transcript pins to the bottom after layout.** Setting
    `scrollTop` in the same turn as `innerHTML` lost the pin while
    the float panel still had no height. `onOpen` plus a double
    `requestAnimationFrame` is the open / switch / reload path.
24. **`hello-ai` 1.0.3 adds `propose_draft_rewrite`.** Pure module
    `proposeRewrite`, `proposes: true`, budget 3, `dedupeArgs`.
    User-facing copy still says scratch pad; the prompt fragment
    names propose versus append.
25. **Chip chrome is tooltip + click details, not an outline expander.**
    Hover is `jp-tooltip`; click toggles a compact metadata card with
    copy. Type icons (file / URL / image). **(+)** wraps on the same
    row as the last chip (`display: contents` on the chip wrap).
26. **The loop grew a thin `inputs.js` wrapper.** `turnLoop.js` calls
    `openUserContent`, `refsForTurn`, `turnExtras`, `followFromResult`,
    and `stripMedia`. No MIME, Redis, or base64 in that file.
    `data.media` is lifted in `execute.js`, not `envelope.js`.
27. **`sourceAttachable` is documented and unused.** `handle.sources()`
    and `handle.sourceFile(id)` exist. The panel never asks the
    predicate — no attach-to-object chip menu.
28. **Hello AI is under site hello demos only.** Removing the
    `jPulsePlugins` entry made the breadcrumb match `/hello-plugin/`.
    The plugin catalog page stays `/jpulse-plugins/ai-core.shtml`.
29. **Late panel UX.** Compact compose (Send beside the prompt). Drop
    hover is green/red. Refusals toast. Add-URL is `confirmDialog`
    (object-button `true` means dontClose). Vision gate clears
    `pendingUser` so the jumping dots stop.
30. **Intercept and prompt policy.** Hidden on question-about-link
    wording (`what` / `describe` / German question words). Empty
    sources get a policy block; the hello-ai fragment forbids "I have
    no web or file access" as a capability. A listed URL is ingested
    content, not a live fetch.
31. **Mock Vision replies `I can see <file>.`** unless
    `script.type === 'vision'`. It does not echo the flattened
    attached-image safety caption.
32. **Identical re-definition is a no-op only for the same owner.**
    `_isSameDefinition()` compares `owner`, so a site or plugin that
    re-defines `onDocument*` always conflicts, even word-for-word.
    The framework row wins; the loser is logged.
33. **Three field corrections vs the reference site.** Convert
    context includes `text`, `markdown`, `pages`, `meta`. Preview
    takes `originalName` and returns `imageBase64` plus `previewMime`,
    not `jpegBase64`.
34. **`docs/ai-agent.md` is framework orientation.** Install,
    configure, one-controller case. The versioned contract stays in
    `plugins/ai-core/docs/README.md`. Rev 3 said the guide would not
    be a framework page; both exist, for different readers.
35. **`hello-ai` is a third bundle member.** Same package as `ai-core`
    and `ai-mock`, own plugin directory, `autoEnable: true`. Disable
    it to hide `/hello-ai/`, its site-hello-demos entry, its dashboard
    card, and `readDraft` / `proposeRewrite`. The panel and `sources`
    stay on `ai-core`. 1.0.0 shipped two members; 1.0.2 shipped the
    demo as a view; this item is the reversal of that view decision.
    Published as 1.0.6. No hello-ai translation files (none existed to
    move). Demo tests live in `hello-ai`; write / slash / mock / vision
    stay in `ai-core`'s `hello-ai.test.js`. In-package dependency is
    `ai-core >=1.0.5`.

### Rev 3 — 2026-09-15 — prerequisites released, work split

No design change. The three prerequisites shipped, and §21 became a concrete
split rather than a sketch.

| Section | Change |
|---|---|
| Header, §5.1.1, §22.2 | W-220 / W-221 / W-222 are released; **zero** framework source files remain to change. `ai-core` ships translatable strings and the bundle installs in one command |
| §4.1, §12.1, §12.2, §18 | The reference site now uses `jPulse.UI.floatPanel` for both chat panels, so the panel *lifecycle* is already retired there; what remains for §12 is the chat content and the adapter |
| §21 | **Rewritten** as five work items (W-223 … W-227) with phases inside each, plus the standalone follow-ons |
| §7.5, §9.7, §23 | Open questions 3 and 4 decided: stay simple — per-scope gating is a named capability, and one active thread per scope stands. Expansion path and erosion risk recorded as **TD-12** and **TD-13** |
| §22.1, §22.3 | Each plugin directory is its own repository and its own commit, `ai-core` the primary. The guide therefore ships **inside the plugin** (`plugins/ai-core/docs/`), not as `docs/ai-agent.md` with `docs/plugins/` entries — the framework repo has no per-plugin pages |
| TD-11 | Renumbered against the split |

### Rev 2 — 2026-09-14 — simplification pass

Rev 1 was over-designed. Machinery whose only job was to keep a future
possible had been written into the default path, where every site would have
to read past it. This revision removes it. Changed sections, so rev 1 does not
need re-reading in full:

| Section | Change |
|---|---|
| §1.1 | **New.** The complete minimum a site writes, in one place, as the DX anchor |
| §3 | Terminology: dropped *principal*, *subject*, *snapshot*, *fidelity* |
| §5.1 | Bundle is `ai-core` + `ai-mock`; `ai-anthropic` is a separate package; `ai-openai` deferred to TD-11. New §5.1.1: plugin bootstrap checked against the code — **no gap**, only installation is missing, which is W-221 |
| §6 | **Rewritten.** Typed principals dropped. Identity stays the username, a service account is a user account, and `onBehalfOf` is one optional field |
| §7.1, §7.3 | Descriptor loses `requiresFields` and `host: 'auto'`; envelope loses `fidelity` |
| §8 | **Rewritten and halved.** Snapshot contract and the fidelity enum dropped. One shared pure module per tool, each host passes the data it has, the site owns the difference |
| §9.2, §9.5 | Provider descriptor gains `capabilities: { vision, … }` in place of flat `supportsVision` |
| §10.2 | **Simplified.** One quota subject, defaulting to the username. Multi-subject charging removed from the shipped path; a delegated model does it inside its own two hook handlers (TD-03) |
| §12.1 | Adapter loses `snapshot()`, gains the plainer `toolData()` |
| §16 | `onAiSnapshot` becomes `onAiToolData`; quota hook purposes reworded |
| §19 | Tests for fidelity, `host: 'auto'`, principals, and multi-subject quota removed |
| §20 | **Restructured** as `### TD-01` … `### TD-11` sections with room to expand, referenced by number throughout |
| §21 | Renumbered to the agreed sequence: W-220, W-221, W-222, W-223. W-222 gains plugin translation support |
| §22 | **Restructured** into plugin files, framework files, and docs. Every client-side path corrected from `webapp/` to `plugins/ai-core/webapp/`. `hello-ai` ships **inside `ai-core`** rather than in the site template. New §22.2 answers "what framework files change": **exactly one**, `webapp/utils/i18n.js`, with the other seven mechanisms verified as already sufficient |
| §23 | Questions 1, 2, 5, and 6 answered and removed |

Rev-1-versus-rev-2 commentary appears in this section only. The body states
the design as it stands; where a rejected alternative is worth naming, it is
named on its merits or recorded as a TD.

### Rev 1 — 2026-09-13/14

Initial design from the brainstorming sessions.


## Decisions taken

- The framework **does** ship AI. This deliberately reverses W-209 §13, which
  placed `ai-core` in site code so "the framework never learns the word AI" —
  see §5.1 for why that call changes and what survives from it.
- Distribution is an **AI bundle** (`ai-core` + `ai-mock`), released and
  versioned separately from the framework, with each provider as its own
  package depending on it (§5.1).
- `ai-core` is **three layers with a one-way dependency**: tools, then agent,
  then transport. The tools layer must be usable with no turn, no provider, and
  no browser — that is what an MCP server binds to (§5.2, §15).
- Site code never imports from `plugins/`. Coupling is `global.AiCore` plus
  hooks, the same idiom the framework already uses for `LogController`,
  `CommonUtils`, and `HookManager` (§5.3).
- Identity stays the **username** (§6.1). A service account is a user account.
  The one structural addition is `actor.onBehalfOf`, because retrofitting it
  would mean migrating every thread and every log query (§6.3).
- The **provider contract is adopted essentially as-is** from the reference
  site — `onAiProviderRegister` and `onAiComplete` are already clean and
  domain-free (§9.2) — with three deliberate changes made now because all are
  breaking to retrofit: tool calls become an **array** (§9.3), `emit` forwards
  **immediately** instead of being batched per round (§9.4), and capabilities
  become a **map** rather than flat booleans (§9.2).
- Quota is **named dimensions over named periods, charged to one subject that
  defaults to the username** (§10). The only concession to a future delegated
  model is that the subject is a resolved value rather than an assumption.
- Quota is enforced **at turn start only**, permissively: a turn that starts
  under its caps runs to completion even if it ends over (§10.3). Hardcoded for
  now; configurability is TD-02.
- Tool result size stays a **hardcoded cap** with no pagination (TD-01).
- Collections move from site ownership to framework ownership. At this
  deployment stage there are no backward-compatibility obligations (§18).
- A tool written for both hosts is **one shared pure module**, with each host
  passing it whatever data it has. No declared contract, no fidelity markers
  (§8).
- The **first three items cover server core, a provider, and the generic chat
  panel** — together they are the §1.1 experience. Propose/apply and
  attachments follow (§21).
- Propose/apply is **declared, not named**: `proposes: true` on the descriptor
  plus a proposal in the result envelope, never a `propose_` prefix. The record
  is derived from the finished turn, the apply endpoint is bookkeeping while the
  site's own write path stays the enforcement point, and the false-claim guard
  takes its phrases from site configuration (§13).
- Attachments are **read through a tool, never injected**: text sources live in
  the tab behind a client-host pure module and never reach the server, the prompt
  carries a metadata manifest only, and the one thing that does reach a provider
  message — an image — arrives as content parts assembled outside the loop
  (§14). Document conversion and preview are a **framework-owned, AI-free
  hook family** with converters and previewers as ordinary plugins (§14.3,
  W-229).
- The two-host tool split (`host: 'server' | 'client'`) is the answer to
  view-centric versus controller-centric, and it is **per tool, not per site**
  (§7.2). A controller-centric site additionally gets an HTTP/SSE turn path so
  it never needs the WebSocket at all (§11).
- The bundle ships a **`hello-ai` companion plugin**, in the spirit of
  `hello-todo` / `hello-world`, because the feature is complex enough that
  onboarding needs a running example rather than a document (§22). Disable
  that plugin to hide the demo without disabling AI.


---

## 1. Overview

BubbleMap, a jPulse site, has a working AI agent: a chat panel on the map, an
agent that reads the map through tools and *proposes* changes the user applies,
a per-user daily quota, and LLM providers supplied as plugins. It is roughly
17,000 lines and it is entirely site code. Throughout the rest of this document
it is "the reference site" — the design is about the capability, not about
maps.

This item makes that a framework capability, so a jPulse site gets an agent by
configuring one rather than building one, and so future agent use cases — an
MCP server, a document assistant, a support bot, a guest-facing chat — do not
each re-derive turn loops, quotas, tool authorization, and streaming transport.

The central finding from reviewing the reference implementation is that **the
hard architecture is already generic and the domain specifics are already
isolated**, but nothing is packaged. Three things in particular are better than
expected:

- The provider contract is domain-free today. The Anthropic provider translates
  the Anthropic wire format into a normalized event stream and knows nothing
  about the site's domain. A site writing `ai-proprietary` needs no contract
  change.
- Persistence is already scope-generic: the thread collection is keyed on
  `(scopeType, scopeId, createdBy)` with `scopeType: 'map'` as *data*.
- Every tool declares `host: 'server' | 'client'`. That one field is the
  view-centric / controller-centric interface, and it is already in production
  serving a mixed set.

What is *not* packaged, and what this design is mostly about: the tool layer is
fused to the turn loop, authorization takes an Express `req` that two call sites
already have to fabricate, per-turn budgets are hardcoded per domain concept,
quota is hardcoded to the requesting user, the UI is a Vue mixin on the site's
canvas component, and the view-centric tools are written twice because there is
no shared-module path.

### 1.1 The simple case

"Don't make me think" and "keep the design simple" only conflict when the
extension seams sit in the default path, so they are kept out of it. This
section is the yardstick the rest of the document is measured against:
**everything below is what a site writes for a working agent, and nothing else
in this document is mandatory.**

Install and enable, then set the API key and pick a model on the admin config
tab:

```
npx jpulse plugin install @jpulse-net/plugin-ai-core
npx jpulse plugin install @jpulse-net/plugin-ai-anthropic
```

One site controller, auto-registered by W-209's `static hooks` — this is the
entire server side:

```js
export default class DocAgentController {

    static hooks = {
        onAiScopeResolve:   { handler: 'aiScope' },
        onAiToolRegister:   { handler: 'aiTools' },
        onAiToolExecute:    { handler: 'aiExecute' },
        onAiPromptFragment: { handler: 'aiPrompt' }
    };

    static async aiScope(ctx) {
        const doc = await DocModel.getById(ctx.scopeId);
        ctx.scope = {
            label:    doc.title,
            canRead:  DocModel.canRead(doc, ctx.actor.username),
            canWrite: DocModel.canWrite(doc, ctx.actor.username),
            nouns:    { item: 'section', container: 'document' }
        };
    }

    static async aiTools(ctx) {
        ctx.tools.push({
            name:        'get_outline',
            description: 'Return the outline of the document.',
            schema:      { type: 'object', properties: {} },
            requires:    'scope:read'
        });
    }

    static async aiExecute(ctx) {
        if (ctx.tool.name === 'get_outline') {
            ctx.result = await DocModel.getOutline(ctx.scopeId);
        }
    }

    static async aiPrompt(ctx) {
        ctx.fragments.push('You are helping the user edit a structured document.');
    }
}
```

One line in the view:

```js
jPulse.ai.panel.create({ scopeType: 'doc', scopeId: docId });
```

That site now has a floating chat panel with conversation history, streaming
replies, cancel, markdown rendering, a model picker if the admin allowed more
than one model, a per-user daily quota that is enforced and reported, tool
authorization, an admin usage page, and logging. It never declared a host, a
quota subject, a budget, or a tool module.

The rest of this document is what a site reaches for when it has a specific
problem, and each entry is entered only by the sites that have it:

| A site needs… | …and reaches for |
|---|---|
| A tool whose data only the browser has | `host: 'client'` (§7.2) |
| That tool's logic not written twice | a shared tool module (§8) |
| The agent to propose changes rather than make them | propose and apply (§13) |
| A cap that is not per-user-per-day | quota dimensions, or the quota hook (§10) |
| Files or URLs attached to a conversation | attachments (§14) |
| An external model client to call its tools | `ai-mcp-server` (§15.1) |

A site that needs none of those never encounters any of them, and a reader
evaluating the design can stop after this section.


---

## 2. Out of Scope

- **Training, fine-tuning, embeddings, and vector search.** A site that wants
  retrieval implements it behind a tool.
- **Agent-to-agent orchestration.** One turn, one thread, one user.
- **Prompt authoring for any particular domain.** The framework owns prompt
  *assembly*; the words are the site's (§9.6).
- **A framework-hosted LLM or a bundled API key.** Every provider is a plugin
  with its own credentials.
- **Replacing the reference site's domain tools.** Reading a bubble tree,
  following a linked map, evaluating a formula, and proposing a subtree stay
  site code; they become registrations rather than built-ins.
- **The MCP server itself.** §15 constrains the core so an MCP server is
  possible without a rewrite; shipping one is a separate plugin and item.
- **Quota grants and allocation workflow.** §10.2 keeps it possible; building
  it is not in scope (TD-03).
- **Service accounts and guest access.** §6.3 reserves the one field they
  need; neither is implemented (TD-04).
- **The `ai-openai` provider.** The provider contract is proven by
  `ai-anthropic` and `ai-mock`; a second commercial provider adds coverage, not
  design (TD-11).
- **Cross-process turn migration.** A turn runs to completion in the process
  that started it, guarded by the existing Redis lease.


---

## 3. Terminology

| Term | Meaning |
|---|---|
| Thread | One conversation, scoped to `(scopeType, scopeId, username)` |
| Turn | One user message and everything the agent does in response |
| Round | One provider completion call inside a turn |
| Tool | A named capability the model may call, with a JSON Schema |
| Host | Where a tool executes: `server` (in process) or `client` (origin browser tab) |
| Origin tab | The browser tab that started the turn; the only one that can run client-host tools |
| Provider | A plugin that turns messages into a normalized completion event stream |
| Actor | Who is acting right now: username, roles, origin, scope (§6.2) |
| Subject | Who a turn's usage is charged to; the username unless a site says otherwise (§10.2) |
| Tool module | One pure function shared verbatim by both hosts (§8) |
| Proposal | A pending change the agent produced and the user may apply or undo |
| Scope | What a thread is about — a map, a document, a project |
| Context / target | The subtree a conversation is about, versus the item selected for this turn |


---

## 4. Current State: the reference implementation

### 4.1 Inventory

Scanned 2026-09-13 against the reference site v1.6.6.

| Layer | Lines | Principal files |
|---|---|---|
| Server controllers | 2,534 | `controller/aiAgent.js` (2,047), `controller/aiAgentWebsocket.js` (487) |
| Server models | 898 | `model/aiAgentThread.js` (322), `aiAgentTurn.js` (413), `aiAgentUsage.js` (163) |
| Server utils | 6,193 | `utils/aiTurnLoop.js` (1,046), `aiProposal.js` (882), `aiTools.js` (569), `aiFileText.js` (522), `aiPrompt.js` (394), `aiLinkedMap.js` (344), `aiToolHost.js` (315), and ten more |
| Browser | 7,384 | `view/map/map-canvas-ai.tmpl` (3,950), `ai-proposal.tmpl` (1,000), `ai-sources.tmpl` (944), `ai-projection.tmpl` (492), `ai-images.tmpl` (461), `map-canvas-ai-commands.tmpl` (414), `map-canvas-ai-tools.tmpl` (123) |
| Admin | 286 | `view/admin/ai-usage.shtml` |
| Providers | ~700 | the Anthropic provider plugin (~550), the mock provider plugin |

The browser counts predate the site's adoption of `jPulse.UI.floatPanel`
(W-220), which has since retired the per-panel drag, resize, persist, and ghost
lifecycle in both of its chat panels. The chat content those numbers are mostly
made of is unchanged.

### 4.2 What is already framework-shaped

**The provider contract.** `onAiProviderRegister` returns
`{ id, label, models, priceTable, maxTokens, supportsVision }`.
`onAiComplete` receives `{ threadId, model, system, messages, tools, emit,
abortSignal }` and emits `text_delta`, `tool_use`, `tool_use_truncated`,
`usage`, `done` (with `stopReason` normalized to `tool` / `length` / `end`),
and `error` (with `code`, `message`, and a `retryable` flag that drives the
429/529 retry). Four-way token accounting — input, output, cache write, cache
read — and a per-model price table are in the descriptor, not the loop.

**Persistence.** `scopeType` / `scopeId` on threads, a unique partial index on
the active thread per scope per user, reserve-then-settle usage counters that
already write both a daily (`YYYY-MM-DD`) and a monthly (`YYYY-MM`) document,
turn retention purging, and thread rollups.

**Concurrency.** A Redis single-flight lease keyed by thread, cancellation as
both a `cancelRequested` flag and a broadcast channel so any process can stop a
turn running in another.

**Two-host tool dispatch.** `aiToolHost.executeTool()` runs `host: 'server'`
tools in process and routes `host: 'client'` tools through an injected
`clientHost` function, which the WebSocket controller implements with
`WebSocketController.request()` against the origin tab. Transport failures are
translated into the same result envelope the loop already understands, with a
`stall` flag for a lost connection.

### 4.3 What is site-specific

Three categories, in increasing order of difficulty.

**Content.** The tool declarations in `aiTools.js`, the curated docs topics in
`aiDocs.js`, and the prompt constants in `aiPrompt.js` — around 40 lines of
domain vocabulary about bubbles, synapses, linked maps, and formulas. These
become registrations and fragments.

**Concepts leaked into the engine.** `aiTurnLoop.js` knows `propose_` as a name
prefix, counts "proposal cards", carries `claimsApplyWithoutProposal()` — a
twelve-branch regex for one specific hallucination failure mode — and enforces
three separate hardcoded budgets (`maxProposalsPerTurn`,
`maxSourceReadsPerTurn`, `maxImageFetchesPerTurn`) with an `isSourceTextRead()`
helper that decides which calls count. §7.4 replaces all of it with declarative
fields on the tool descriptor.

**The propose/apply lifecycle**, which is genuinely reusable and is treated as
its own layer in §13.

### 4.4 Duplication the framework should remove

Two patterns, both consequences of the view-centric architecture having no
supported path.

**Mirror modules.** `site/webapp/utils/aiProposal.js` (882 lines, ESM, server)
and `site/webapp/view/map/ai-proposal.tmpl` (1,000 lines, IIFE, browser) are
two implementations of the same validation logic; the template header says so
outright — *"Mirrors site/webapp/utils/aiProposal.js for the tab host."* The
same split exists for projection and source handling.

**`vm`-sandbox tests.** Because the browser copies live in `.tmpl` files, they
are unit-tested by reading the file, stripping Handlebars with a regex, and
evaluating the result in a Node `vm` context. It works, but it is a workaround
for logic that has nowhere else to live.

If the framework is going to bless the view-centric architecture, it has to
supply the shared-module path (§8), or every site reinvents both workarounds.

### 4.5 Two contract defects worth fixing before adoption

**One tool call per round.** The Anthropic adapter tracks a single `firstTool`
and emits only that; the loop reads one `toolUse`. Both Anthropic and OpenAI
emit parallel tool calls, so this silently serializes work the model intended
to parallelize, and any later fix is breaking for every provider plugin.

**Streaming is not live.** `context.emit` pushes into an `events` array and the
loop iterates it *after* `executeComplete` resolves, so tokens reach the
browser in one burst per round. Whether deliberate or not, it must be an
explicit decision in the framework contract, because it is a one-line change
now and an invasive one once sites depend on the batching.


---

## 5. Architecture

### 5.1 Packaging and distribution

W-209 §13 concluded that `ai-core` belongs in site code and that "the framework
never learns the word AI". That was right when AI was one application's
feature. The objective here is the opposite, so the call changes — but what
survives from it is the important part: **the hook registry does not gain AI
hooks.** `ai-core` defines its own hooks via `static hookDefinitions`, exactly
as W-209 made possible. `HookManager` still never contains the string
`onAiComplete`.

How jPulse distributes plugins today, confirmed against `package.json`:

| Plugin | Distribution |
|---|---|
| `hello-world` | inside the framework package (`files` lists `plugins/hello-world/`) |
| `auth-mfa` | separate npm package `@jpulse-net/plugin-auth-mfa` |
| `auth-oauth` | separate npm package `@jpulse-net/plugin-auth-oauth` |

The AI plugins follow the `auth-*` model rather than the `hello-world` model.
The bundle is drawn tightly:

| Package | Contains | Why |
|---|---|---|
| `@jpulse-net/plugin-ai-core` | `ai-core` + `ai-mock` + `hello-ai` | Everything needed to stand the server core up and see it work, with no API key and no spend. `hello-ai` was a view inside `ai-core` from 1.0.2 through 1.0.5. W-231 makes it a third bundle member so an admin can disable the demo without disabling AI |
| `@jpulse-net/plugin-ai-anthropic` | `ai-anthropic` | Depends on `ai-core`; installed only by a site that uses Anthropic |
| *(deferred)* | `ai-openai` | TD-11 |

The reasoning for bundling `ai-mock` with `ai-core` rather than shipping it
separately: a freshly installed `ai-core` with no provider is a feature that
cannot be demonstrated, and the first thing anyone does with it — including the
framework's own tests and the `hello-ai` plugin — is run a turn without spending
money. The mock is not an optional extra, it is how `ai-core` is testable at
all.

The reasoning for keeping providers out of the bundle: they are the part that
churns, they each carry a credential and a price table a site may not want, and
bundling four providers means a site running only its own `ai-proprietary`
plugin still carries three it will never enable. A third-party or site-private
provider is its own package declaring
`dependencies.plugins: { 'ai-core': '>=…' }` — the same shape as the ones the
bundle does not contain, which is the honest test that the contract is public.

The reasoning for a separate release rather than shipping inside the framework
package: a site that does not want AI should not carry three collections, a
WebSocket namespace, a config tab, and an admin page, and the AI release cadence
will be faster than the framework's for as long as the model landscape keeps
moving.

### 5.1.1 Is there a plugin bootstrap problem?

Checked against `webapp/utils/plugin-manager.js` and
`webapp/utils/hook-manager.js` rather than assumed. Three things could have
been problems, and **all three are already handled**:

- **Load order.** `ai-anthropic` registers a handler on `onAiComplete`, a hook
  *defined* by `ai-core`. `resolveLoadOrder()` topologically sorts on
  `dependencies.plugins`, `getActivePlugins()` returns that order, and
  `registerPluginHooks()` iterates it — so `ai-core` is always processed first.
  Belt and braces: `HookManager.register()` does not require a prior
  definition, so even an inverted order would work; definitions are
  introspection metadata, not a precondition.
- **Enable and disable integrity.** `enablePlugin()` refuses with
  `Missing required dependency: ai-core` when a dependency is absent or
  disabled, and `disablePlugin()` refuses with `Cannot disable: required by …`
  when an enabled plugin depends on the target. So `ai-anthropic` cannot be
  enabled without `ai-core`, and `ai-core` cannot be pulled out from under it.
- **Site controllers loading before the plugin.** A site controller declaring
  `static hooks = { onAiToolRegister: … }` is registered at site-registry time,
  which may precede `ai-core` defining the hook. W-209 made registration
  against an undefined hook recorded and retro-validated rather than an error,
  precisely for this case.

**The one real gap is installation, not bootstrap.** `dependencies.plugins` is
consulted for ordering and for enable/disable checks; it is never used to
*fetch* anything. A site that installs `@jpulse-net/plugin-ai-anthropic` on its
own gets a plugin that discovers correctly, refuses to enable, and says
`Missing required dependency: ai-core` — accurate, and unhelpful, because
nothing tells the admin which npm package supplies it.

That was **W-221**, released in v2.0.1: one npm package expands into several
plugin directories (which the bundle needs regardless, since it ships three),
and a plugin's declared dependency may name the npm package that supplies it,
which install then fetches. Nothing in the install path remains to build. What
it asks of these plugins is one line: `ai-anthropic` declares
`dependencies.plugins: { 'ai-core': { version: '>=…', npmPackage:
'@jpulse-net/plugin-ai-core' } }`, so installing the provider alone pulls in the
bundle that provides `ai-core` instead of refusing at enable time.

### 5.2 The three layers and the one-way rule

```
    ┌────────────────────────────────────────────────┐
    │  transport   HTTP/SSE turn route, WS namespace │
    │              chat panel, client tool bridge    │
    ├────────────────────────────────────────────────┤
    │  agent       turn loop, providers, prompt      │
    │              assembly, quota, threads, turns   │
    ├────────────────────────────────────────────────┤
    │  tools       registry, actor authorization,    │
    │              budgets, execution, envelope      │
    └────────────────────────────────────────────────┘
```

Dependencies point **downward only**. The tools layer must be usable with no
thread, no turn, no provider, no prompt, and no browser — because that is
exactly the surface an MCP server binds to (§15.1), and because it is the only
way tool authorization becomes unit-testable without mocking Express.

Today this boundary does not exist: `executeTool(name, args, turnCtx)` reads
`turnCtx.settings.docsTopics`, `turnCtx.supportsVision`, `turnCtx.selectionId`,
and `turnCtx.linkedMapNewFetchSpent` — the last of which is per-turn loop
bookkeeping living inside the tool host.

**The rule is CI-enforced.** A scan test asserts no module under the tools
layer imports from the agent or transport layers, in the same spirit as W-209's
scan test asserting every non-`planned` definition has a fire site. Without
that, the boundary erodes in the first bug fix.

### 5.3 Coupling: `global.AiCore` plus hooks

Site code must never write `import … from '../../plugins/ai-core/…'` — that is
a hard path dependency on an optional component, and it breaks the moment the
plugin is disabled.

Two mechanisms, both existing framework idiom:

- **`global.AiCore`**, published on plugin initialize, for imperative calls a
  site makes (`AiCore.registerTools()`, `AiCore.runTurn()`,
  `AiCore.listProviders()`). The framework already does this for
  `LogController`, `CommonUtils`, `PluginModel`, `HookManager`, and
  `RedisManager`.
- **Hooks**, for everything `ai-core` needs to *pull* from the site: tool
  registration, scope resolution, prompt fragments, quota policy (§16).

A site controller declaring `static hooks` is auto-registered since W-209, so
the site side is declarative and needs no boot-order knowledge. Registration
against an undefined hook is recorded and retro-validated, which matters here:
a site controller may well load before the `ai-core` plugin defines the hooks.


---

## 6. Identity and actor context

### 6.1 Identity stays the username

`thread.createdBy`, the usage document key, and log attribution are all
usernames, exactly as the reference site has them today. No index changes, and
nothing a site writes mentions identity beyond `ctx.actor.username`.

A typed identity — `user:jdoe`, `service:support-bot`, `pool:eng-platform` —
would buy three futures at the price of making every site learn a new concept
before writing its first tool, and none of the three needs it:

- **A service account is a user account.** A bot that acts registers as a user
  with a role, and from the schema's point of view it is
  `username: 'support-bot'`. No new type, no second authentication path, and
  the role system already scopes what it may do. Requiring the registration is
  a fair price for not having the concept.
- **Delegated quota does not need a typed key.** A pool is a named row in a
  future `aiGrants` collection; the usage counter never has to know whether
  `eng-platform` is a person or a budget. Prefixing is a convention a site can
  adopt inside its own quota handler if it wants one (§10.2, TD-03).
- **Guest access is deferred** (TD-04). When it lands, an anonymous session
  identifier is a string in a `createdBy` field like any other. What actually
  differs for guests is *retention*, and retention is a query, not a key
  format.

### 6.2 Actor context

The one abstraction this design does add, and it is not speculative — it fixes
something already broken. Tool authorization today reads `turnCtx.req`, and the
WebSocket path has no request, so it fabricates
`{ session: { user: { username, roles } }, user: { roles } }` in two places. A
fabricated request object is the design saying an abstraction is missing, and
MCP would be the third caller to need it.

```js
{
    username:   'jdoe',             // who is authenticated
    roles:      ['user', 'editor'],
    onBehalfOf: null,               // §6.3
    origin:     'web' | 'ws' | 'mcp' | 'api',
    scopeType:  'doc',
    scopeId:    'doc-uuid',
    req:        null                // optional, for tools that need request state
}
```

Tool authorization takes the actor. `req` remains available for the minority of
tools that want request state, but no framework path requires one. This is what
makes the four gates (§7.5) unit-testable without mocking Express, and what
lets an MCP server reuse the tools layer unchanged.

### 6.3 On-behalf-of

The exception case, and it costs one optional field. When a service account
acts for someone, `actor.onBehalfOf` names them.

Two rules, and the first is the one that matters:

1. **Every log line carries `onBehalfOf` when it is set.** A service account
   acting for someone is only acceptable if the audit trail says for whom. The
   AI path's `LogController` calls include it unconditionally rather than
   leaving it to each call site.
2. **Thread ownership is `onBehalfOf` when present**, so the conversation
   belongs to the person being served rather than accumulating under a bot's
   name.

Nothing in the first release sets it. Reserving it now costs one nullable
field on the actor, the thread, and the log line; adding it later means
migrating every thread and rewriting every log query that attributes activity
to a user. That asymmetry is the entire justification — it is the one piece of
future-proofing in this design that survived the simplification pass, and the
service-account authentication that would populate it is TD-04.


---

## 7. The tools layer

### 7.1 Tool descriptor

Registered through `onAiToolRegister` or `AiCore.registerTools()`. Everything
but `name`, `description`, and `schema` has a default.

```js
{
    name:           'get_tree',
    description:    'Return a compact view-tree of an item and its descendants.',
    schema:         { type: 'object', properties: { … } },   // JSON Schema
    host:           'server',       // 'server' | 'client'            §7.2
    module:         null,           // shared tool module name, if any  §8
    dataScope:      'call',         // 'call' | 'turn'; only with module §8.2
    requires:       'scope:read',   // capability name, or null
    mutates:        false,
    timeoutMs:      5000,
    group:          'read',         // admin policy grouping
    budget:         null,           // §7.4
    dedupeArgs:     false,          // §7.4
    exposeToMcp:    true,           // §15.1; ignored for host: 'client'
    owner:          'site'          // stamped, not supplied
}
```

`schema` is plain JSON Schema, which is what every provider wants — the
Anthropic adapter already passes it through as `input_schema`, and MCP's
`tools/list` calls the same thing `inputSchema`.

### 7.2 Two hosts: server and client

This is the answer to view-centric versus controller-centric, and the important
property is that it is **per tool**. The reference site is mixed today: reading
documentation, listing maps, following a linked map, and the image tools are
server-host, while reading the bubble tree, searching bubbles, evaluating a
formula, and every propose tool are client-host, because the server does not
render bubbles and has no formula engine.

- A **controller-centric** site declares everything server-host. It never needs
  the WebSocket (§11) and its tools are MCP-exposable (§15.1).
- A **view-centric** site declares tools client-host. The turn must then run
  over the WebSocket so the process holding the origin tab can call back into
  it.
- A **mixed** site is the normal case and needs no special handling.

`host` is declared, never inferred. An `'auto'` value that resolved against
declared data requirements is deliberately not offered; §8.1 has the reasoning
and TD-10 records what it costs.

Authorization is **always server-side**, whatever the host. A client-host tool
is a rendering and computation delegate, never a permission decision.

### 7.3 Result envelope

Unchanged from the reference site, because it is already right — it carries
what the model needs to recover from a failure, not just what went wrong.

```js
{
    ok:       true,
    data:     { … },       // the tool result
    summary:  'get_tree 42 items',  // one line, for the turn record and logs
    error:    '',          // user- and model-readable
    code:     '',          // machine-readable, AI_* or transport
    hint:     '',          // what the model should do instead
    ms:       12,
    media:    null,        // images returned to a vision model; stripped from
                           // the turn record and never accepted from a client
    stall:    false        // connection lost — end the turn, do not retry
}
```

The `hint` field is worth calling out as a deliberate design feature rather
than an afterthought: a failed tool that tells the model what to do instead
recovers within the turn, and the reference site's error paths use it heavily.

### 7.4 Declarative per-turn budgets

Today the loop hardcodes three budgets and special-cases which calls count
against them. `isSourceTextRead()` exists solely to decide that an outline-only
source read is free but one with a `section` or `offset` is not. That is domain
knowledge inside the engine.

Instead, the descriptor declares it:

```js
{
    name:   'get_source',
    budget: {
        key:         'sourceReads',
        max:         'maxSourceReadsPerTurn',   // settings key
        countWhen:   (args) => args.section != null || args.offset != null,
        overMessage: 'This turn already made %MAX% source reads…',
        overHint:    'Use the outline you already have, or reply.'
    },
    dedupeArgs: true
}
```

The loop enforces budgets and argument-identical deduplication generically.
Three hardcoded counters and one predicate disappear, and every future tool
gets the same protection without touching the engine.

### 7.5 Tool policy and authorization

Four gates, in order, all server-side, all before execution:

1. **Existence** — unknown name returns `AI_UNKNOWN_TOOL`.
2. **Capability** — the tool's `requires` against the actor's capabilities for
   this scope, resolved by `onAiScopeResolve` (§16).
3. **Admin policy** — the tool is in the site's enabled list. The reference
   site's union-with-reviewed-names seeding is worth carrying over: a tool
   added after the admin last saved is enabled by default, but a tool they
   explicitly unchecked stays off. Without that, every new tool is silently
   hidden on every existing deployment.
4. **Turn budget** — §7.4.

Capabilities are **named**, and the `canRead` / `canWrite` an
`onAiScopeResolve` handler returns are shipped sugar for `scope:read` and
`scope:write`. A site needing a narrower per-scope rule than read-versus-write
declares its own capability name in `requires` and grants or withholds it in
its own handler, rather than the framework growing a second, per-scope tool
list (TD-12).

The offered tool list is recomputed **every round**, not once per turn, because
permissions can change mid-conversation. The system prompt says so explicitly,
and that sentence should survive into the framework's default fragment. It is
computed in **one** function, which the turn loop's per-round call, the
capability probe, and MCP `tools/list` all go through; TD-12 is why that
matters later.


---

## 8. Shared tool modules

Optional. A site whose tools all run in one place never reads this section.

The problem it solves is real and expensive: the reference site writes several
tools twice, once for the server and once for the browser, roughly 2,000 lines
of deliberate duplication kept in sync by hand (§4.4).

### 8.1 The design

The governing observation: **the framework does not need to know what is in a
tool's data.** It needs to run one function in two places. Which host can
supply what is something only the site knows, and the framework can only ever
learn it by being told — so a declared data contract the framework then
validates buys *checking*, not capability, and charges the concept to every
site, including the ones with no shared tools at all.

So:

- A tool is **one module exporting one pure function**, shared verbatim by both
  hosts: `run(data, args) => result`. No I/O, no DOM, no database, no
  host-specific imports.
- **Each host passes the data it has.** On the server a site hook supplies it
  (`onAiToolData`); in the browser the panel adapter supplies it
  (`adapter.toolData()`). Same shape, by the site's own convention, checked by
  the site's own tests.
- **Where the two hosts differ, that is the site's problem, and the site is
  the only party equipped to solve it.** Either declare the tool
  `host: 'client'` and be done, or write a function that copes with the field
  being absent — return an outline instead of values — and say so in the result
  it returns.
- **`host` is declared**, `'server'` or `'client'`. No inference (TD-10).

The alternative worth naming, because it is the obvious one — a declared data
contract with per-field fidelity markers, so the framework can emit one
standard sentence to the model about degraded fields — is rejected because it
has the framework trying to *describe* a domain difference it cannot see. The
site writes that sentence itself, in its own tool result, more accurately. The
reference site's linked-map tool already does exactly that, telling the model
*"Titles are stored source, not evaluated values — a formula reads as
`=SUM(...)`, not the number."* That sentence is good, and it needs no type
system behind it.

So a result carries no fidelity information (§7.3) and a descriptor declares no
data requirements (§7.1); a tool that returned degraded data says so in its own
`data` and `summary`, which is what the model actually reads.

### 8.2 Mechanism

The boring half, and where essentially all the value is — it is the part that
removes the `.tmpl` and `vm` workarounds.

- **Location.** Tool modules live under the existing `utils/` tree —
  `site/webapp/utils/ai-tools/` for a site, `webapp/utils/ai-tools/` inside a
  plugin — as plain ES modules with a `.js` extension. Not templates, and not
  a new top-level `webapp/` directory. jPulse webapp dirs are `controller`,
  `model`, `view`, `utils`, `tests`, and `translations`; a dedicated
  `utils/ai-tools/` catalog keeps the purity root to siblings in that folder
  so a module cannot import the rest of `utils/` (or `fs`). Resolution is the
  framework's usual order, site first and then each active plugin in load
  order, so a site can override a plugin's module by name. Unlike
  `view/jpulse-common.js` this is *replace*, not append: a module is one
  function, and concatenating two of them is meaningless.
- **Server.** Ordinary `import`. Ordinary unit tests, in Node, with no `vm`
  sandbox and no Handlebars stripping.
- **Browser.** `ai-core` serves each module at a content-hashed URL and the
  panel loads it with dynamic `import()`. A real module: real source maps, real
  breakpoints, real stack traces.
- **Version pinning.** The capability probe returns a manifest of
  `{ name, hash, url }` — the `url` so the client never assembles a route, and
  the route can change without a client change. A tab whose loaded hash no
  longer matches the server's refuses to run the tool and prompts a reload,
  rather than silently running yesterday's logic against today's server. This
  matters more than it sounds — a long-lived tab is the normal case for a chat
  panel.
- **Purity is enforced, not merely tested.** A module whose import list falls
  outside the allowlist is refused — at server `import` and at serve — and the
  refusal is logged and surfaced as an unavailable tool rather than a broken
  page. The allowlist is deliberately the smallest one that is still useful:
  **relative imports of siblings inside the `ai-tools/` directory, and nothing
  else.** No bare specifiers at all, so `fs` cannot be reached and neither can
  a helper that transitively reaches it.

  A scan test is not sufficient on its own, which is worth stating because
  §8.2 originally called for one. A test living in `ai-core` can only scan
  `ai-core`'s own modules; `site/webapp/utils/ai-tools/` is never covered by it, and
  those are precisely the modules being shipped to a browser. So `ai-core`
  also **exports the scanner** — `AiCore.scanToolModules()` — for a site to
  assert over its own directory in one line, and refuses at runtime for the
  site that never writes that line. Purity is the only rule the site has to
  obey, so it is the one worth enforcing rather than documenting.

- **Serving.** `GET /api/1/ai/tool-module/:hash/:name.js` is `auth: 'user'`,
  `Content-Type: text/javascript`, `Cache-Control: public, max-age=31536000,
  immutable`. A request for a hash the server no longer has is a **409**,
  never a different body. These modules are site logic, not anonymous static
  assets.
- **Probe.** The capability probe returns `{ name, hash, url }` per module
  and also `retentionDays`, which the panel's retention notice needs and
  which is otherwise a second settings round trip.

A descriptor opts in by naming the module:

```js
{
    name:      'get_tree',
    host:      'client',            // the site's judgment, §7.2
    module:    'getTree',           // site/webapp/utils/ai-tools/getTree.js
    dataScope: 'call',              // 'call' | 'turn' — when to rebuild the data
    …
}
```

`dataScope` decides whether the data is built once per call or built once and
reused for every call in the turn. It defaults to `call`, so the always-correct
behavior is what a site gets without deciding; a tool over a large structure
that is expensive to build and stable within a turn sets `turn` deliberately.

Without `module`, a server-host tool is executed by `onAiToolExecute` as in
§1.1 — the common case, which involves none of this.

### 8.3 What the reference site gains

Its 882-line server proposal validator and 1,000-line browser mirror become one
module called from two places with different data. The parallel projection and
source implementations go the same way. Three `vm`-sandbox harnesses are
replaced by ordinary module tests.

What it does *not* get: tools that migrate from client to server by themselves
once the server can satisfy them. Several of its client-host tools — searching
bubbles, reading notes and tags — are client-host only because that is where
the code lived, not because that is where the data is, and each needs one word
of its declaration changed by hand. That is the deliberate trade recorded in
TD-10: a one-word edit made knowingly, against a resolution engine every site
would have to understand.

### 8.4 Scope of the mechanism

The serving, hashing, and manifest machinery is not AI-specific — it is a
general "module shared between server and browser" capability that AI happens
to be the first consumer of. The decision is to **build it inside `ai-core`
first** and promote it to the framework if a second consumer appears, rather
than designing a speculative general API now (TD-07).


---

## 9. The agent layer — adopted, with three contract changes

### 9.1 Turn loop

Adopted from `aiTurnLoop.js` with the domain knowledge extracted. The skeleton
is sound and battle-tested: reserve quota, acquire lease, create the turn
record, then loop rounds until the model returns text without a tool call, up
to `maxRoundsPerTurn`, checking cancellation and timeout each round, retrying
retryable provider errors with backoff, and finalizing with usage, cost, and
status.

What the framework version removes: the `propose_` prefix check, the proposal
counting, `claimsApplyWithoutProposal()`, and the two system notes about undone
and falsely-claimed proposals. Those move to the propose/apply layer (§13),
which subscribes to turn lifecycle events rather than living inside the loop.

Where each removed piece ends up, since "moved to §13" is not the same as
"rewritten there":

- the **prefix check** is replaced by `proposes: true` on the descriptor
  (§13). A name prefix is a naming convention pretending to be a contract —
  the same objection §9.2 raises against flat capability booleans.
- the **counter** and the "you already carded that" refusal are the tools
  layer's declarative `budget` and `dedupeArgs`, shipped in 1.0.0. They are
  declarations on the site's own tool, with the tool's own wording, so no
  framework code counts anything.
- the **two notes** are computed when history is assembled for the next
  prompt, from the persisted records — not appended to a turn while it runs.

The loop therefore gains nothing at all in W-227, and a test asserts it:
`turnLoop.js` source contains no proposal vocabulary. That makes the rule
above something CI enforces rather than something a reviewer must remember.

Statuses stay `completed` / `failed` / `canceled` / `stalled`.

### 9.2 Provider contract

Adopted as-is except for the capability map below and the two changes in §9.3
and §9.4.

```js
static hookDefinitions = {
    onAiProviderRegister: {
        description: 'Contribute a provider descriptor',
        contextKeys: ['providers'],
        onError:     'continue',    // one broken provider != no providers
        canModify:   true
    },
    onAiComplete: {
        description: 'Run one completion; emit normalized events',
        mode:        'executeForPlugin',
        contextKeys: ['threadId', 'model', 'system', 'messages', 'tools',
                      'emit', 'abortSignal', 'round'],
        onError:     'abort',       // a provider failure fails the turn
        canModify:   true
    }
};
```

The opposite `onError` policies on two hooks with the same owner in the same
release are exactly the case W-209 cited as proving per-hook policy beats
per-method.

The event vocabulary is unchanged. The descriptor gains one structural change,
made now because it is breaking later: **capabilities are a map, not flat
booleans.**

```js
{
    plugin:  'ai-anthropic',
    label:   'Anthropic Claude',
    models:  [ … ],
    capabilities: {
        vision: true               // …and whatever the second one turns out to be
    }
}
```

`supportsVision`, `supportsToolUse`, `supportsStreaming` as sibling top-level
booleans is a naming convention pretending to be a structure — nothing can
enumerate it, the panel cannot ask "what does this model do" without knowing
every key in advance, and adding one means touching every consumer that
switches on them. A map is enumerable, renders as a table on the admin page
without code, and lets a consumer read `capabilities[name]` for a name it
learned at runtime. Unknown keys are simply false, so a provider written
against an older core keeps working.

Only `vision` ships, because it is the only capability that currently changes
behavior (§9.5). Candidates for the second — reasoning traces, structured
output, prompt caching — are TD-05, and adding one is now additive rather than
a contract change.

With that, the Anthropic provider ports with a diff confined to the three
items in this section.

**Message content is a string or an array of parts.** A `user` message's
`content` may be plain text, or `[ { type: 'text', text }, { type: 'image',
mimeType, data } … ]` with base64 bytes in `data`. A provider maps the parts
onto its own wire shape and treats a part type it does not know as absent
rather than as an error, so a provider written against an older core keeps
working — the same rule the capability map follows. This belongs to the
provider contract rather than to §14 because it is what every consumer of
`onAiComplete` must tolerate, and it is the only structural concession the
contract makes to attachments. The shipped `ai-anthropic` 1.0.0 already accepts
it; `ai-mock` flattens text parts and drops the rest, which is why a mock model
that advertises `vision` also has to name the images it was handed (§21.7).

### 9.3 Parallel tool calls

`emit({ type: 'tool_use', … })` becomes
`emit({ type: 'tool_use', calls: [ { id, name, args }, … ] })`, and the loop
executes the batch. The first implementation may execute serially — the point
is that the *contract* carries an array from day one, because widening it later
breaks every provider plugin.

Execution order and budget accounting are defined: calls run in emitted order,
budgets are charged in that order, and the first `stall` ends the turn with the
remaining calls unexecuted and reported as such to the model.

### 9.4 Live streaming

`emit` forwards immediately. The loop still accumulates for the turn record,
but a text delta reaches the origin tab as it arrives rather than at the end of
the round. The transport layer supplies the sink; the loop no longer holds an
events array as the only path.

### 9.5 Provider and model selection

With two or more provider plugins installed, the question is who chooses.
Today the admin does: site config names one `defaultProvider` and
`defaultModel`, the thread records them, and each turn records them too — so
per-turn cost accounting is already correct for a mixed thread.

The design keeps the admin in control of the *menu* and gives the user the
*choice from it*:

- Admin config declares an **allowed list** of `{ provider, model, label }`
  entries and which is default. A single-entry list means no user choice, which
  is the current behavior and stays the default.
- The capability probe returns that list filtered by reality: a provider whose
  plugin is disabled or missing an API key disappears from the menu rather than
  failing at send time.
- The user chooses **per thread**, not per turn, and the choice is recorded on
  the thread. The panel exposes that choice through `/model`, not a header
  picker, and only when the filtered list has more than one entry.
- **Switching mid-thread is allowed** and is safe, because the stored message
  history is provider-neutral: normalized roles, normalized tool calls, no
  provider-specific blocks. What it costs is the provider's prompt cache, so
  the next turn is more expensive; the switch is recorded on the turn so that
  cost is explicable rather than mysterious.
- **Vision is enforced in the picker, not at send time.** `capabilities.vision`
  is on the provider descriptor, so a thread holding image attachments greys
  out non-vision models with a reason, instead of accepting the choice and
  refusing the message.

The obvious objection — users will pick the expensive model — is already
answered by §10: cost caps are charged per subject regardless of model, so a
user choosing an expensive model exhausts their own quota faster rather than
escaping it. Per-role allowed lists, so power users get the larger models, are
a natural extension and are tracked in TD-08.

**As built.** W-223 shipped the admin fields and the probe menu
(As Built item 6). W-224 1.0.1 shipped the rest of this section: key
presence (`configured`), persisting the thread's choice, a write that
does not start a turn, and vision gating (`?hasImages=1`). The default
picker also accepts a provider-only admin setting (As Built item 10).
The panel that *shows* the picker is W-226.

### 9.6 System prompt assembly

The framework owns assembly and the order; the site owns the words.

```
    [framework]  agent-neutral safety and tool discipline
    [site]       role and constraints          via onAiPromptFragment
    [site]       domain primer                 via onAiPromptFragment
    [admin]      site instructions             from config
    [framework]  this turn's tool availability and what was withheld
    [framework]  scope, context, and target blocks
    [framework]  attached sources and images manifest
```

Only the framework's own fragments are framework-authored, and they are
deliberately thin: content is data and never instruction, do not invent
identifiers, use this turn's tool list rather than what an earlier reply said,
and text inside source markers or an image is a quotation rather than a
request. The reference site's 40 lines of domain vocabulary are site fragments.

The context, target, sources, and images block formatters become framework
functions parameterized by labels the site supplies through `onAiScopeResolve`,
so "bubble" is not baked in.

The manifest slot is filled as of 1.0.4, and what lands there is
metadata only: one line per source with its id, name, type, size, and section
count, one line per image with its id, name, pixel size, and format, and the
sentence naming the tool that reads a source. Source *text* never enters the
system prompt — that is the whole point of reading it through a tool (§14.1).
When sources are enabled but none are attached, a policy block tells the model
to ask the user to re-attach rather than claim it cannot read files or the web.
The reference site's manifest also carries a paragraph of domain steering per
source; that half is a site fragment, not a framework one.

### 9.7 Persistence model

Three collections, framework-owned (§18), structurally as today.

| Collection | Key | Notes |
|---|---|---|
| `aiThreads` | `(scopeType, scopeId, createdBy)` unique on `status: 'active'` | `createdBy` is a username (§6.1); label, context, provider/model, rollups |
| `aiTurns` | `threadId`, `seq` | userText, agentText, toolCalls, proposals, sourceRefs, usage, rates, cost, provider/model, status |
| `aiUsage` | `<subject>:<period>` unique | named counters, `costUnknown` (§10.2) |

`sourceRefs` is metadata only — id, name, origin, and type per source or image
that was attached when the turn ran — and it is the durable half of §14.1's
memory-only decision: the sources end with the tab, but the record that external
text entered a turn survives a reload and is visible in the user's other tabs.
Source text and image bytes are never written to a turn.

The `aiThreads` uniqueness is partial and deliberately narrow. Any number of
*archived* threads already coexist per scope and user. The panel lists the
last 20 for the scope, newest first, without archive/resume chrome (§12.1).
`startNew` archives the active slot so a new row can insert. Only the active
one is constrained, which is what makes the guard against a two-tab or
double-click duplicate cost one index. Relaxing it to allow several live
conversations on one scope is TD-13.

Retention purges turns by age, and guest threads would get a shorter retention
than user threads once guests exist (TD-04).

Threads are username-keyed, which makes them a consumer of the
`onUserBeforeDelete` / `onUserAfterDelete` hooks W-209 marked
`stability: 'planned'` — when user deletion lands, the cascade has a home.


---

## 10. Quota

### 10.1 Dimensions and periods

The storage model already generalizes — `increment(subject, period, delta)`
takes an arbitrary delta and the period is a string, and monthly documents are
already written on every settle. Only the *caps* are fixed, as two daily
fields.

Caps become a list:

```js
[
    { dimension: 'requests',  period: 'day',   limit: 200 },
    { dimension: 'tokens',    period: 'day',   limit: 400000 },
    { dimension: 'cost',      period: 'month', limit: 25.00 },
    { dimension: 'toolCalls', period: 'day',   limit: 1000 }   // MCP, §15.1
]
```

Dimensions are named counters; `tokens` is the sum of `tokensIn` and
`tokensOut`, as today. Periods are `day` and `month` to start, with the period
key derived by a named function so `week` is additive (TD-09). A site that
wants the reference site's behavior sets one `requests`/`day` cap and one
`tokens`/`day` cap, which is the shipped default.

`costUnknown` is retained: an unknown model records `null` cost, never zero. A
cost cap cannot be enforced against a subject whose recorded cost is partly
unknown without saying so, so the admin usage page flags it.

### 10.2 The subject

**A turn is charged to one subject, and the subject is the requesting
username.** That is the entire shipped model, and it is what a site gets
without reading further.

The one seam, and it costs a field name. The usage document is keyed
`<subject>:<period>`, not `<username>:<period>`, and the quota hook returns the
subject rather than the framework assuming it:

```js
// shipped default, ai-core registered on its own onAiQuotaCheck hook
{ subject: actor.username, caps: [ … ] }

// what a future grant model's handler returns instead
{ subject: 'eng-platform-pool', caps: [ … ] }
```

That one field is enough for the delegated case, which is worth spelling out
because it is the reason no multi-subject machinery is needed. In a delegated
model a business unit holds a monthly pool, a director receives a pro-rated
share per eligible engineer, and engineers draw from that share on request — so
the site wants to record against the engineer *and* enforce against the pool.
It implements `onAiQuotaCheck` and `onAiQuotaSettle` and **writes whatever
documents it likes inside its own two handlers**, because a handler is code,
not a declaration. The framework needs no list of subjects, no per-subject
`enforce` flag, and no rollback ordering rule to permit that; it needs only to
stop assuming the subject is the user. Building the grant model is TD-03.

The shipped period-based policy is itself registered on those two hooks, so
there is exactly one code path, and a site replacing the policy is not on a
special branch — it is doing what `ai-core` does.

### 10.3 Enforcement timing

**Hardcoded and permissive:** caps are checked at **turn start only**. A turn
that starts under its caps runs to completion even if it ends over. There is no
mid-turn abort.

The rationale is that an agent cut off mid-turn is worse than a small overrun:
it may have produced a proposal it cannot describe, or a reply that trails off,
and the user has spent the tokens either way. The overrun is bounded by one
turn's `maxRoundsPerTurn` and the provider's `maxTokens`, and it is recorded
truthfully rather than clamped.

This differs from the reference site, which checks the token cap from round two
onward and appends *"(incomplete — daily token quota reached)"*. Making the
timing configurable — `quotaEnforcement: 'turn-start' | 'per-round'` — is
TD-02.


---

## 11. The transport layer

### 11.1 HTTP/SSE for controller-centric sites

On the reference site every turn starts over the WebSocket, because the
process holding the origin tab must be the one to call back into it for
client-host tools. A site with only server-host tools has no such constraint,
and forcing it through a per-thread WebSocket namespace is a large adoption
tax for no benefit.

`POST /api/1/ai/thread/:id/turn` with an SSE response gives that site the whole
feature over plain HTTP. `ai-core` picks the path automatically: if the resolved
tool list for the turn contains no client-host tool, HTTP is sufficient, and
the capability probe tells the client which to use. The §1.1 site never learns
that a WebSocket exists.

### 11.2 WebSocket for client-host tools

Unchanged in shape from the reference site: a per-thread namespace
(`/api/1/ws/ai/:threadId`), token deltas unicast to the origin tab, turn-level
events broadcast so the user's other tabs stay in sync, and
`WebSocketController.request()` for calling a tool in the origin tab with
transport failures mapped onto the result envelope (`CONNECTION_LOST` and
`NOT_CONNECTED` set `stall`; `REQUEST_TIMEOUT` and `RESULT_TOO_LARGE` get
recovery hints).

The 256 KB message cap stays, and oversized client replies remain the tab's
problem to report rather than the server's to discover. The framework's client
`send()` returns false rather than throwing when a payload exceeds the
negotiated `maxSize`, so the bridge checks the size itself and answers with
`AI_RESULT_TOO_LARGE` and a narrowing hint. A tool result that silently fails
to send would otherwise read to the server as a timeout.

**A turn starts over the socket, not over HTTP.** The process holding the
origin tab has to be the one that calls back into it, and an HTTP POST can
land on a different instance. On this path `POST .../turn` is not used; cancel
stays the HTTP route for both transports, because it must work from a tab that
is not the origin. The socket turn payload is `{ type: 'turn', data: { text,
provider, model, context, target, script } }` — `script` is on the message
because `POST .../turn` already accepts it and the two transports have to
stay at parity.

**Namespace authorization.** `requireAuth: true` disposes of anonymous
connections before `onCreate`. The allowed-role check and the master switch
are **not** frozen into `requireRoles` at `initialize()`: `createNamespace`
runs once, so a role list captured there goes stale the moment an admin
edits the AI tab, and it would diverge from the HTTP path, which calls
`roleAllowed()` per request. `onCreate` loads settings, rejects when AI is
disabled or the role is not allowed, then reads the thread and compares
`createdBy` to the session — and **this is why W-225 exists**, because
`onCreate` used to be called synchronously and an `async` handler's
rejection was discarded rather than honored.

Getting this wrong is not a small leak. `broadcast()` delivers to every client
in the namespace, and a client joins the namespace at handshake, so any check
that finishes *after* the upgrade has already let the socket receive another
user's conversation. The check has to gate the upgrade, not follow it.

Per-message ownership is still verified in the message handler, the same way
the HTTP routes verify it. The namespace check decides who may listen; the
handler check decides who may act.

**Namespaces are reclaimed explicitly.** A namespace created from a pattern
stays in the registry for the process's lifetime unless the application removes
it, so the last disconnect from a thread calls `removeIfEmpty()`. Without it
the registry grows by one entry per conversation ever opened, which the admin
WebSocket page would eventually make obvious and nothing else would.

**Emit on the instance path, not the pattern template.**
`createNamespace('/api/1/ws/ai/:threadId')` returns a template whose `.path`
is the pattern. `broadcast`, `sendToClient`, and `removeIfEmpty` look up by
path. Calling them on the template logs `Namespace not found` and the origin
tab never sees `completed`. The first connect creates the literal instance;
every turn event uses that path. Switching threads disconnects the previous
socket; that `disconnected` status is not a reconnect and must not show the
reconnecting notice.


---

## 12. The client layer

### 12.1 Chat panel and the site adapter

Built on `jPulse.UI.floatPanel` (W-220), which the reference site already runs
for both of its chat panels — so the shell is proven before this item starts.
The framework owns everything that is not about the site's data:

- conversation title, select, rename, and new-conversation on one row under the panel title — no thread side list
- the select lists the last 20 threads for the scope, newest first; archive is an internal slot, not chrome
- compose box, slash-command picker, keyboard handling, send and cancel
- `/model` to view and set the thread pair when more than one model is allowed (§9.5); not a header picker
- transport connect, reconnect, and turn reconciliation after a reload
- token streaming, jumping dots while waiting for the first token, the outgoing prompt kept visible as a right-aligned pill, scroll-to-bottom on render / after layout / on float-panel open, a running-turn notice after reload
- markdown rendering with pinned copy buttons
- quota and error surfaces, retention notices
- attachment chips for file, paste, and URL sources, and staged images, with the source state and the original `File` / `Blob` behind them (§14.1) — **W-228**, shipped in 1.0.4 (tooltip + click details; no outline expander)
- the URL-intercept card (§14.2) — **W-228**, shipped in 1.0.4 (hidden when the prompt is a question about the link)
- Apply cards, several per turn, "Apply all", and the false-claim guard — **W-227**, shipped in 1.0.3
- the client-host tool bridge and the tool-module loader (§8.4)

**Both transports sit behind one client API.** The probe says `http` or `ws`
(§11.1) and the panel asks for a turn without knowing which it got; the two
implementations converge on the same event stream, so every feature above is
written once. A panel that branched on transport would grow two of everything
and only one of them would stay tested.

**A reload cannot recover partial text, and that is accepted.** Token deltas
are unicast and nothing persists them mid-turn — only the finalized
`agentText` is stored (§9.7). So a reloaded tab reconnects, sees a turn still
running, says so, and renders the reply when the turn-level completion event
arrives. Persisting deltas to recover a few seconds of streaming would put a
write on the hot path of every token. If the turn was waiting on a client-host
tool in the tab that went away, the call answers `NOT_CONNECTED`, which sets
`stall` and ends the turn — the designed behavior rather than a special case.

The site supplies an adapter object rather than mixing methods into a
component:

```js
jPulse.ai.panel.create({
    scopeType: 'map',
    scopeId:   mapId,
    adapter: {
        toolData(toolName) { … },  // data for client-host tools, §8.1
        describeContext(value) { … },
        describeTarget()  { … },
        contextOptions()  { … },   // gates the context row and /context
        renderProposalPreview(proposal) { … },   // §13, W-227
        applyProposal(proposal) { … },           // W-227
        undoProposal(proposal)  { … },           // W-227
        sourceAttachable(source) { … }           // §14.1, W-228
    }
});
```

`toolData` plus `describeContext` / `describeTarget` are the only methods a
read-only agent needs, and `adapter` may be omitted entirely by a site with
no client-host tools — which is the §1.1 case. Scope labels live on
`onAiScopeResolve`; `describeScope()` was a documented adapter member the
panel never called and is removed. `executeTool` shipped in 1.0.2 as the
escape hatch for an impure client tool. The three `*Proposal` methods
are W-227, land in 1.0.3, and are called only when the site registered a
tool that proposes. `renderProposalPreview` may return a DOM node, or a
string that the panel escapes as text — a site wanting markup returns a
node, so no adapter injects markup by accident. `applyProposal` and
`undoProposal` perform the site's real write and resolve truthy on success;
the panel records the outcome **after** the adapter resolves, so a failed
write never marks a card applied (§13).

`contextOptions()` is W-230 and optional: a site that implements it gets a
framework row above the compose box and `/context`. The panel owns the
selected value, thread-scoped in the tab. `handle.context` is
`{ get, set, refresh }` so a page gesture can keep the select in sync.
`describeContext(value)` turns the value into the sentence on the turn; a
method that ignores the argument still works. An `unavailable` option stays
selectable and is never auto-picked.

The panel also accepts `regions` and `commands`. Regions sit at named
anchors (`header`, `transcriptTop`, `transcriptBottom`, `composeAbove`,
`composeBelow`) with site `priority` ordering only inside an anchor.
Framework chrome stays in fixed sibling slots. `render` returns a node, a
string the panel escapes, or `null`. `handle.regions.refresh(name)` covers
what the framework cannot observe. `commands` omitted keeps every applicable
default; passing the array is the complete list, last entry wins, and
`ctx.framework()` runs the builtin of that name. Defaults are generic:
`/help`, `/tools`, `/model`, `/new` (`clear`), `/cancel`, `/conversations`
(`resume`), `/quota`, `/sources`, `/status`, `/context`. `/model` and
`/status` are always listed. `when()` gates `/quota`, `/sources`, and
`/context` on data the panel already holds. `examples` is the content slot
of `/help`: `[[label]]` anywhere in a row is clickable and fills the
compose box without sending. Text after the brackets is a note, not a
second syntax. `/help` command names, `/model` pairs, and
`/conversations` rows use the same links.

`sourceAttachable` is W-228 and optional: a site implements it as a predicate
for which attached sources it would accept on one of its own objects, defaulting
to file-origin when absent. The 1.0.4 panel documents it and does not call it
(no attach-to-object chrome). The write is the site's `applyProposal`, and what
that write needs is the *original* bytes, which the panel holds and exposes on
the handle: `handle.sources()` returns the manifest rows and
`handle.sourceFile(id)` returns the retained `File` or `Blob`, or null once the
chip is gone. A site with no interest in attachments implements none of this and
still gets sources the model can read (§14.1).

Note what is *not* required on the adapter: `executeTool`. When a client-host
tool names a shared module (§8.2), the site supplies the data and the
framework's loader runs the module against it. A site with a client tool that
is not worth making a module still provides `executeTool` as an escape hatch,
but it is the exception rather than the interface. A missing `executeTool`
on a no-module client tool is a failed envelope naming the method, not a
timeout.

Panel defaults that keep the one-liner honest: `id` is
`ai-panel-<scopeType>-<scopeId>`; the default size is larger than
`floatPanel`'s 360×280; the last thread id persists under its own key
rather than inside the panel geometry. The client namespace is `jPulse.ai`,
the mirror of `global.AiCore`, not `jPulse.plugins.aiCore`. W-220's
`launcher` option is ghost geometry and focus-return only; the panel binds
the element's `click` to `handle.toggle()`.

**Slash commands are local and never sent to the model.** The catalog is
site-owned as of W-230. The framework defaults are `/help`, `/tools`
(offered tools with host, plus withheld and why; names render as `<code>`
because local slash replies are plain text, not markdown), `/model`
(prints the current pair and the allowed list; `/model <provider>/<model>`
sets the pair), `/new` (alias `/clear`), `/cancel`, `/conversations`
(alias `/resume`; `/conversations <n>` opens one), `/quota`, `/sources`,
`/status`, and `/context`. A leading `//` escapes, so `//help` is literal
text. The picker expands as you type `/`; Enter executes the highlighted
command and posts it into the transcript; Esc dismisses the picker and does
not close the panel. Slash and other local replies carry a timestamp and
merge with server turns by `createdAt`, so `/help` does not jump below a
later model reply. `run` may return a node; `/help` uses that for clickable
example rows.

**`/new` always inserts.** The unique index still allows one active thread
per scope and user. `POST /api/1/ai/thread` without `forceNew` is
`findOrCreateActive` (first send, empty list). With `forceNew: true` the
server archives the active slot and inserts. The picker does not filter by
status and does not label archived rows.

**`marked` is loaded on demand.** `jpulse-header.tmpl` includes Prism but
not `marked.min.js`. The panel injects `/common/marked/marked.min.js` once
when `window.marked` is absent, and falls back to escaped plain text if
that load fails. Asking the site to add a script tag would break the §1.1
one-liner; adding it to the framework header would be a framework edit.

### 12.2 What stays site code

The data the tools operate on, the computation engines a tool module needs,
proposal preview rendering and the apply itself, the labels for context and
target, any site region, and any command that is not a report of framework
state. Scope labels stay on `onAiScopeResolve`. The reference site's
bubble-shaped copy, `/pad`-class commands, and canvas-driven context
changes (`handle.context.set`) stay there. `/quota`, `/status`, `/sources`,
and `/conversations` are framework defaults that site deletes rather than
ports.

The migration cost to the reference site is real and worth stating, and it is
now smaller than it was. The panel *shell* is already `jPulse.UI.floatPanel`,
so drag, resize, persistence, stacking, and the ghost animation are no longer
site code. What remains is the chat itself: a set of Vue methods mixed into the
canvas component, reaching directly into the component's bubble list, synapse
list, title cache, formula evaluator, and page config. Becoming an adapter is a
genuine refactor. It is also what makes the panel reusable, and it is confined
to one repository and one work item.


---

## 13. Propose and apply

"The agent proposes, the user applies" is a reusable pattern, and any
write-capable agent worth trusting will want it. The framework owns the parts
that do not vary:

- the proposal record on the turn, with `applied` and `undone` flags
- `POST /api/1/ai/turn/:id/applied` and `/undone`
- the Apply card chrome in the panel, and the multi-card-per-turn case
- the "you claimed a proposal but no card exists" guard, generalized from a
  hardcoded regex list into a policy the site configures with its own phrases
- the history notes fed back to the model: which cards were applied, which were
  undone, and that only the *latest* proposal's undo matters

The site owns preview rendering, validation of the proposed change against its
own schema, and the apply and undo execution.

This is opt-in. A read-only agent never registers a write tool and never sees
any of it.

### 13.1 Declaring a proposal

Two declarations, and a site writes nothing else to join the pattern:

```js
{
    name:       'propose_draft_rewrite',
    description: '…',
    schema:     { … },
    host:       'client',
    module:     'proposeRewrite',   // pure: read and validate, never write
    requires:   'scope:write',
    proposes:   true,               // this call creates a card, not a change
    dedupeArgs: true,               // identical args twice is one card
    budget:     { key: 'proposals', max: 3, overMessage: '…%MAX%…' }
}
```

```js
// the tool's successful envelope
{ ok: true, data: { proposal: { kind, payload, preview } }, summary: '…' }
```

`proposes` sits beside `mutates` on the descriptor and travels with
`publicTool`, so the capability probe, `/tools`, the prompt, and the guard all
learn from one flag that this turn *offered* a way to propose. A result cannot
carry that information, which is why the flag exists in addition to the
envelope. And `mutates` stays **false** on a proposing tool, because the call
changes nothing — the contrast is the clearest one-line statement of the
pattern and belongs in the guide rather than being smoothed away.

`kind` is the site's own label, echoed back on the card and in the notes.
`payload` is whatever the site needs at apply time and is never interpreted by
the framework. `preview` is optional structured data for a site that would
rather hand the card content over than render a node.

The cap and the duplicate refusal are the tools layer's existing declarative
budget and argument dedupe (§7.4), which is what the reference site's loop was
counting by hand. A proposing tool that wants no cap simply declares no budget.

### 13.2 The record is derived, then persisted

One pure function is the source of truth: a persisted `turn.proposals` wins,
and otherwise the list is derived from the turn's `toolCalls` — successful
results carrying `data.proposal`, in call order — with each id minted from the
turn id and the provider's tool-call id. The read path, both endpoints, and the
history notes call that one function, which is §7.5's "one function answers
this question" rule applied to cards.

Deriving rather than writing mid-round is what keeps §9.1 honest, and it also
removes a race that the obvious implementation has. `onAiTurnAfter` fires in
the loop's `finally`, after `completed` has already reached the tab, and the
panel answers `completed` by re-fetching the turn list — so a subscriber that
were the *only* writer would be racing the request that renders its own cards,
and an Apply click could land on a turn with no `proposals` array yet. With
derivation available on every read path, ordering stops being a correctness
question: the subscription persists the list once, idempotently, and writes
nothing at all for a turn that produced no proposals — except
`proposingOffered: true` when a proposing tool was offered and the reply
matched a claim phrase, so the next prompt and the panel guard can see it
without rewriting `agentText`. A read-only agent's turns stay byte-identical
to 1.0.2.

Ids are minted by the framework rather than by the site because they must be
stable across re-derivation, which is exactly what a deterministic id from
`(turnId, toolCallId)` gives, and because it is code no site should have to
write. Flags live on each record; the reference site's flat mirror of the first
proposal on the turn document was its own backward compatibility and is not
carried forward (§18).

### 13.3 Apply is the site's write; the endpoint is bookkeeping

The order is fixed and worth stating, because the tempting order is wrong:

1. the panel calls `adapter.applyProposal(proposal)`, which performs the real
   write through the site's own authenticated API
2. only on success, the panel posts `POST /api/1/ai/turn/:id/applied` with the
   proposal id, and the framework marks the record

So `/applied` and `/undone` record *that the user applied it*. They are not the
enforcement point, and the guide says so plainly, because a reader will assume
otherwise. The framework cannot authorize a write it does not understand;
putting that decision in the layer with the least information would be
security theater. What the endpoints do enforce is theirs to enforce: the turn
exists, the session owns it — the same ownership check the WebSocket
`onCreate` makes (§11.2) — the proposal id is known, and repeating the call
changes nothing. A site needing an idempotency token puts it on its own write,
where it matters.

Undo is the same shape through `undoProposal`, and the framework never
reverses anything itself: it does not know what the change was.

Both endpoints are transport-neutral, so a controller-centric site (§11.1) gets
records, endpoints, and notes with no panel at all — what it does not get is
the card, which is panel chrome by definition.

### 13.4 What the model is told, and when

Three notes, all computed when history is assembled for the next prompt, from
the persisted records:

- per proposal turn, which of its cards were applied, which were not, and
  which were undone
- one note when the **latest** proposal's latest card was undone. An older undo
  must not read as if a later Apply had been rolled back, which is the whole
  reason this is a rule and not a per-card flag dump
- one note when the last claiming turn produced no card (§13.5)

Computing on read means stored `agentText` is never rewritten. The reference
site appended its missing-card note into the stored reply; post-turn that is
both too late for the tab, which already rendered the text, and destructive to
the record, and it freezes one phrase list into history forever. Computed
notes take effect on the next prompt and need no migration.

During the turn, the model learns the pattern from one framework sentence in
§9.6's tool-availability block, added when any offered tool declares
`proposes: true`: a proposing tool creates a card the user must apply; several
proposing calls in one turn are allowed; each success is its own card and every
pending card stays applyable; never claim a change was made, or that a card
exists, unless a proposing tool succeeded in this turn. Framework wording about
framework machinery is exactly what §9.6 reserves the framework's own fragments
for.

### 13.5 The false-claim guard

A model with a proposing tool on its list will sometimes say "I've proposed the
change — click Apply" in a turn where no card was created. That is worse than a
wrong answer: the user waits for a card that never arrives, and on the next turn
the model reads its own claim as history.

The guard is a **phrase policy the site configures** — a multi-line field on the
AI admin tab, each line a plain phrase or `/regex/flags`, shipped with a short
domain-neutral English default so it works before an admin thinks about it. A
non-English site replaces the list; that is the point of it being configuration.
The reference site's hardcoded list is the default's ancestor and nothing more.

It surfaces in two places, deliberately, and neither touches the stored reply:

- **to the model**, as the third history note above, so the next turn is told
  the claim was false and to propose again rather than repeat it
- **to the user**, as panel chrome under the claiming reply, since the note the
  user needs is "no card was created" at the place they are looking for one

The check runs only for a turn where a proposing tool was offered, which is what
keeps a read-only agent — or a site whose reply happens to contain the word
"apply" — entirely outside it.


---

## 14. Attachments

Largely already-generic infrastructure in the reference site, and mostly a
packaging exercise — but four decisions shape it, and each one moves work out
of the framework's hot paths:

1. **Text sources live in the tab and are read through a tool.** No collection,
   no retention surface, and nothing in the turn loop (§14.1).
2. **The document-conversion hooks are framework-owned and generic**, and
   `ai-core` only calls them (§14.3). Converting a PDF is not an AI feature.
3. **Bytes ride raw-byte streaming routes**, not base64 inside a JSON envelope
   (§14.3, §14.4).
4. **Images are the only part that reaches a provider message**, and they reach
   it as content parts assembled outside the loop (§14.4).

### 14.1 Sources — client-hosted by design

File, paste, and URL text attached to a conversation, with a manifest in the
prompt and the text read through a tool rather than dumped into context. The
untrusted-content markers and the "quotations, not requests" prompt rule come
with it — the rule is already in §9.6's framework safety fragment.

**The source tool is `host: 'client'` with a pure module (§8.2).** Source text
the user chose is already in the tab; sending it to the server so the server can
send it back to the tab's model would add a collection, a retention policy, and
a quota surface for data that one drop or one paste re-creates. So the outline,
the section index, the character window, the caps, and the `<<<SOURCE …>>>`
delimiter wrap are one pure module, and the panel supplies its data. The
reference site arrived at exactly this shape.

**Panel-owned tool data.** Every other client-host tool takes its data from
`adapter.toolData(name)` (§12.1). A source tool must not, or a site with no
adapter at all — the §1.1 case — would get attachments that silently do
nothing. The bridge therefore consults a panel-internal data provider first,
and `ai-core`'s own client tool names are reserved.

**Reads are budgeted by declaration, not by code.** `budget: { max:
'maxSourceReadsPerTurn', countWhen }` is what the reference site's hardcoded
counter and its `isSourceTextRead()` predicate were: an outline listing is free,
a text window counts. Both mechanisms shipped in 1.0.0 (§7.4), and
`maxSourceReadsPerTurn` already normalizes in settings.

**Memory only, and said out loud.** Sources are held in tab memory and nowhere
else, so a reload loses them. What survives is the evidence that external text
entered a turn: `sourceRefs` on the turn record (§9.7) and a badge on the
transcript, which a second tab sees even though it cannot read the source.
The alternative — a `sessionStorage` mirror — writes source text to the user's
disk, survives logout on a shared machine, and buys one re-add gesture. The
panel states the lifetime where an empty strip would otherwise teach it by
surprise.

**Ids are opaque to the framework.** A source id is a string the manifest
carries and the tool resolves; nothing validates a prefix. That is what lets a
site later contribute server-resolved sources into the same manifest and the
same tool without reshaping either (TD-16).

**The original bytes stay reachable.** The panel retains the `File` or pasted
`Blob` behind a chip, and exposes it — `handle.sources()` for the manifest rows
and `handle.sourceFile(id)` for the bytes — because the interesting site
features start there: attaching a document the user handed the agent onto the
site's own object needs the *original* file, not the panel's resized or clipped
copy. Which sources may be offered that way is the site's call, through an
optional `adapter.sourceAttachable(source)`; the default is file-origin only,
since a paste and a URL have no file to attach.

### 14.2 URL ingest — on the framework's `UrlFetch`

Rebuilt on `UrlFetch` (`docs/url-fetch.md`), which already provides the
private-address guard, the size and timeout ceilings, per-redirect
re-validation, and the rate-limit key that the reference site's URL ingest
partly re-implements. The caller narrows rather than widens: an accept list of
text types, a byte cap under the site ceiling, and `req` passed so an SSRF
attempt names who triggered it.

What `ai-core` adds on top is the part `UrlFetch` deliberately leaves out: an
HTML-to-markdown extraction kept small on purpose (readability-lite, no DOM
library), an empty-shell verdict for a client-rendered page that answers with
the paste instruction instead of a shell, a provenance snapshot (final URL,
fetch time, content type, byte count, digest, redirect count), and a per-code
user-facing message.

**The intercept card is a panel affordance, never an agent-callable fetch.**
A URL in the compose box offers to fetch it before the turn starts, and the
user accepts or sends the prompt as-is. An agent-callable `fetch_url` would
reintroduce the outbound channel that exfiltration mitigation currently relies
on not existing. If it is ever wanted, the shape already exists and needs no new
machinery: a tool with `proposes: true` (§13) is a consent card.

### 14.3 Document conversion — framework hooks, plugin converters

`onDocumentConvertRegister` and `onDocumentConvert` are **framework-owned and
generic** (W-229, §21.1), and so are their preview siblings
`onDocumentPreviewRegister` and `onDocumentPreview`. They name no AI
concept, and a converter or previewer plugin therefore depends on a
framework version rather than on `ai-core` — which is the honest
dependency, since converting a PDF to markdown has nothing to do with an
agent. The framework ships the four definitions, the catalog entries, and
nothing else: no converter, no previewer, and no caller. The preview pair
is in the same item because the reference site already ships it from a
file-attachment controller with no AI near it, and one converter plugin
registers all four.

**Definer and caller are decoupled, and the two releases landed independently.**
A hook still executes when it is undefined — `HookManager` falls back to the
mode's default error policy, which is `continue` for the `execute`-mode
register hooks and `abort` for the `executeForPlugin`-mode convert and
preview hooks, exactly the policies on the catalog rows. The definition
supplies the catalog entry, the documented context keys, and the policy; it
is not a gate. `ai-core` still calls the convert pair without defining
either. A site on a framework older than v2.0.4 still gets working
conversion with an `unverified` row; from v2.0.4 the four names are
`stability: 'planned'` framework rows (`since: '2.0.4'`).

A second definition is a no-op only when it is the same owner and the same
wording. `_isSameDefinition()` compares `owner`, so a site or plugin that
re-defines these names always conflicts, even word-for-word. The
framework's definition wins (seeded at module load) and the loser is
logged. That is the migration reminder for the reference site, not a break.

**Three corrections against the reference contract**, because the names
were new to the framework and their only users live in one site's
repository:

- Convert lists its **output** keys: `text`, `markdown`, `pages`, `meta`.
  A caller reads `markdown || text`.
- Preview takes `originalName` as an input (the text previewer selects on
  extension).
- The preview image field is `imageBase64`, not `jpegBase64`.
  `previewMime` is authoritative and defaults to `image/jpeg` when
  omitted.

Registration is still **per format**, not per plugin. A descriptor
declares `plugin` (the `executeForPlugin` join key — this plugin's own
name), `mimeTypes`, `extensions`, `label`, and for converters `maxPages`,
`unitLabel` (`page` / `sheet` / `slide`), and `rejects` as
`{ extensions, reason, suggest }` rows. Unknown fields pass through
(an `engine` id is the usual extra). Caps are the caller's: `ai-core`
merges the site's page limit with the converter's, applies its own
character cap and timeout, and turns an empty extract into a refusal
that names the reason.

**Empty extract and throw are different signals.** Empty text plus
`meta.empty` / `meta.emptyCode` means "I claimed this type and found
nothing — try the next claimant." `meta.emptyCode: 'no-text-layer'` is
the pinned value for a scanned page; that refusal must not promise a
paste workaround. A throw aborts the call (`onError: 'abort'`) and
ends the caller's attempt.

**Selection is the caller's job, and the two families differ.** Convert
matches a MIME type exactly and retries every claimant in registration
order until one returns text — that is what makes "extract first, OCR
on empty" a plugin install. Preview accepts wildcards (`text/*`, `*`),
where an exact type or extension match wins over a wildcard regardless
of array order, and picks one previewer with no retry.

**The upload is a streaming route.** A text file is read locally by the tab; a
PDF cannot be, so this is the one place a source's bytes reach the server.
`bodyMode: 'stream'` with `bodyLimit` and `StreamBody.pipe` (W-217, W-219) is
what the framework's own guidance asks for, and W-228 is its first consumer
anywhere. The converted text comes back as an ordinary in-tab source chip, so
§14.1's memory-only rule holds for a converted document too.

### 14.4 Images and vision

Staging with a TTL, an allowlist of MIME types, edge and byte caps, and
`capabilities.vision` gating from the provider descriptor (§9.5).

**Staging is Redis-only, park-on-send / read-once / delete.** The panel resizes
to a maximum edge, re-encodes to an allowed type, uploads the raw bytes to a
streaming route, and the server parks them under a key scoped to user, thread,
and image id with a short TTL. The turn reads each key once and deletes it.
There is no fallback to process memory, Mongo, or disk: an image that outlives
its turn is a copy of a user's file in a place nobody manages. Where Redis is
absent, the capability probe reports images unavailable and the panel hides the
affordance rather than failing at paste time.

**Gating happens at send, against the thread's pair — not at attach, against
the site default.** The menu already greys non-vision rows when the thread has
images (`gateModelsForVision`, 1.0.1), and refusing the attachment because the
*site default* lacks vision would block a user who has explicitly picked a
vision model. So an image may always be staged, and the send either carries it
or says why it cannot.

**Images reach the provider as content parts.** A user message's `content` may
be a string or an array of `{ type: 'text', text }` and `{ type: 'image',
mimeType, data }` parts, base64 in `data` (§9.2). An attachments module builds
those parts; the loop's only involvement is tolerating an array where it
previously pushed a string. Staging, TTL, MIME, caps, and base64 stay out of
`turnLoop.js`, and a test asserts it the way W-227's loop-purity test does.

**A tool may also return an image**, which is the second and last way images
enter a turn: a successful envelope sets `data.media` to an array of the same
parts, the envelope normalizer lifts it out of `data` at execute time so the
tool-result message the model reads stays text, and the parts become a follow-up
user message. This is the mirror of `data.proposal` (§13.1), and the per-turn
cap on how many images one turn may pull in is an ordinary declarative budget on
the tool (§7.4) rather than a loop counter.

The prompt manifest lists each image's id, name, pixel size, and format; the
turn record and the persisted tool call keep metadata only. Bytes never travel
over the WebSocket namespace — its envelope ceiling is shared across every
namespace, which is why the byte routes are REST.

### 14.5 What attachments deliberately do not include

No source text on the server and no cross-tab sources (§14.1, TD-16). No OCR,
which is a converter plugin on the same hooks (§14.3). No citations or page
anchors, which need a provenance surface in the transcript and in proposal
previews that does not exist yet. No agent-callable URL fetch (§14.2). No image
generation — the only bytes are the ones the user handed over.


---

## 15. MCP

### 15.1 jPulse as an MCP server

The controller-centric case that validates §5.2. An MCP client brings its own
model, so it uses the tools layer and nothing above it.

What it needs, all of which the design already provides:

- the tools layer with no agent-layer dependency (§5.2)
- the actor context, since there is no Express request (§6.2)
- client-host tools filtered out, which is a one-line filter on a declared
  field rather than a hand-maintained exposure list
- a tool-call quota dimension, since no tokens are consumed (§10.1), charged to
  a subject that may be a service account's username (§6.3, §10.2)
- descriptor translation, which is the same trivial mapping the Anthropic
  adapter already performs: `schema` becomes `inputSchema`, and the result
  envelope becomes MCP `content` blocks with `isError`

What it adds, in a separate `ai-mcp-server` plugin: the streamable-HTTP
transport and protocol handshake, out-of-band client authentication mapped onto
an actor, and an admin surface for which tools are exposed.

### 15.2 jPulse as an MCP client

The mirror, worth naming because it costs nothing now. An `ai-mcp-client`
plugin registers an external MCP server's tools into the local registry via
`onAiToolRegister` with `host: 'server'`, proxying execution. The only
constraint it places on this design is that the registry must tolerate
**asynchronous and per-turn** registration rather than assuming a static
declaration list — which is already required for a site that resolves tools per
scope.


---

## 16. Hook catalog

All `onAi*` hooks are defined by `ai-core` via `static hookDefinitions`. The
framework's `HookManager` gains no AI names.

| Hook | Mode | onError | Purpose |
|---|---|---|---|
| `onAiProviderRegister` | execute | continue | Contribute a provider descriptor |
| `onAiComplete` | executeForPlugin | abort | Run one completion |
| `onAiToolRegister` | execute | continue | Contribute tool descriptors |
| `onAiToolExecute` | executeForPlugin | abort | Execute an owner's server-host tool |
| `onAiToolData` | executeFirst | abort | Supply a shared tool module's data on the server (§8.1) |
| `onAiScopeResolve` | executeFirst | abort | Resolve scope, labels, and the actor's capabilities in it (§7.5) |
| `onAiPromptFragment` | execute | continue | Contribute system-prompt fragments |
| `onAiQuotaCheck` | executeFirst | abort | Resolve the subject and its caps, and reserve; veto by throwing |
| `onAiQuotaSettle` | execute | continue | Apply actual usage |
| `onAiTurnBefore` | execute | abort | Last veto point before a turn runs |
| `onAiTurnAfter` | execute | continue | Turn finished; the propose/apply layer listens here |

Four of these are what §1.1 uses; the rest are entered only by a site with the
matching problem. `ai-core` registers itself on `onAiQuotaCheck` and
`onAiQuotaSettle`, so those have a working default and a site overriding them
replaces a real implementation rather than filling a hole. From 1.0.3 it also
registers itself on `onAiTurnAfter`, where the propose/apply layer persists a
turn's proposal records (§13.2) — the hook was defined in 1.0.0 with no
consumer, and this is the check that defining it ahead of its use was right.

`onAiScopeResolve` is the one to get right: it is where a site says "this
thread is about document X, this user may read it, may not write it, and the
words for its parts are *section* and *document*". Everything domain-shaped in
the prompt and in authorization flows from it.

**Four hooks the framework owns and `ai-core` does not.**
`onDocumentConvertRegister` / `onDocumentConvert` and
`onDocumentPreviewRegister` / `onDocumentPreview` are framework-owned and
name no AI concept (W-229 v2.0.4, §14.3), so a converter or previewer
plugin depends on a framework version instead of on an AI plugin.
`ai-core` calls the convert pair without defining either, which is legal
— an undefined hook executes under its mode's default error policy, and
a definition supplies the catalog entry and the policy rather than
permission to call. That decoupling is why the framework release and the
bundle release could land in either order. The preview pair still has no
framework caller; it is in the same catalog so a plugin that implements
both families does not find half its hooks as `unverified` rows.


---

## 17. Configuration and admin

`ai-core` contributes a config tab through `ConfigModel.extendSchema()` — the
`static async initialize()` call site W-207 provides, which is what the
reference site already uses. Settings split as shipped in 1.0.0:

- **Admin tab (Site Configuration → AI)** — the master switch, allowed roles,
  `defaultProvider` / `defaultModel` / `allowedModels` (§9.5), quota caps
  (§10.1), loop limits (rounds, timeouts, context size), tool policy
  (`disabledTools` / `reviewedTools`), retention, auto-titling, site
  instructions, and — from 1.0.3 — the false-claim phrase list (§13.5),
  which is on this tab rather than in code because it is the kind of
  setting an admin tunes after reading one bad transcript. W-228 adds the
  attachment switches and caps here — sources on or off and their type list
  and character caps, URL ingest on or off with its host lists and byte cap,
  the conversion page and timeout limits, and the image type list, byte cap,
  maximum edge, and staging TTL (§14). The tab
  description is HTML with links to the AI Core overview, usage,
  plugin-local configuration (dumps live there), the guide, and plugin
  management. An empty `defaultModel` uses the first model of
  `defaultProvider` (As Built item 10).
- **Plugin config (Admin → Plugins → ai-core)** — `debugDumps` only, plus the
  same cross-links (including `/jpulse-plugins/ai-core.shtml`). Deliberately
  not on the AI tab, where they are easy to leave on. `loadSettings` reads
  `PluginModel` by import; `global.PluginModel` is never assigned.
- **app.conf (optional overrides)** — `ai.defaultProvider`, `ai.defaultModel`,
  `ai.promptOverride`, and `ai.debugDumps` (OR'd with the checkbox). Not the
  supported home for dumps.
- **Provider plugin config** — shipped on `@jpulse-net/plugin-ai-anthropic`
  1.0.0: API key as `type: 'password'` with `getSecret` on the server path
  and an unsaved-value Verify button, endpoint, timeout, max tokens, and a
  price-table override that must supply four finite rates per row. The
  BubbleMap tree was the port source; the published plugin speaks the
  `ai-core` 1.0.0 contract (As Built item 9).

An admin usage page reports per-subject requests, tokens, and cost by period,
with over-quota and `costUnknown` flagging — the reference site's AI usage page
generalized, with the subject column replacing its username column.


---

## 18. Compatibility and migration

Nothing in the framework changes incompatibly: every collection, route, hook,
and config key here is new, and `ai-core` disabled is the current behavior of
every existing site.

**Collection ownership transfers from the site to the framework.** At this
deployment stage that carries no obligations — the only site with these
collections is the reference site, under the same ownership as the framework, so
there is no supported upgrade path to preserve. A one-time rename of the three
collections is sufficient if conversation history is worth keeping; dropping and
recreating is also acceptable. Either way it is a step in the reference site's
migration, not framework machinery.

The migration is sequenced per layer rather than attempted at once. Rough shape:

1. Adopt the framework tool registry and actor context; delete the tool host,
   the policy half of the tool registry, and the four hand-rolled
   authorization gates.
2. Adopt the turn loop, models, quota, and transport; delete the turn loop, the
   three models, the AI WebSocket controller, and most of the AI controller.
3. Adopt the chat panel; convert the Vue mixin to an adapter and delete the
   generic remainder of the panel template. The drag, resize, and persist
   lifecycle is already gone — it moved to `jPulse.UI.floatPanel`.
4. Adopt shared tool modules, propose/apply, and attachments; collapse the
   mirror modules (§4.4) and retire the `vm`-sandbox harnesses.

Each step is independently shippable, and the mock provider makes each cutover
testable without spending tokens. Mapped onto §21: steps 1 and 2 follow W-223
and W-224, step 3 follows W-226, and step 4 follows W-226 through W-228.


---

## 19. Testing

- **Tools layer in isolation** — every gate with a plain actor object and no
  Express request; unknown tool, capability denial, policy denial, budget
  exhaustion, argument dedupe; the scan test asserting no agent-layer import.
- **Shared tool modules** — a module tested once as a plain function against
  hand-built data; the same module against data missing a field, asserting it
  degrades the way its author intended rather than throwing; the purity scan
  over the plugin's own modules, plus an impure fixture refused at import and
  at serve rather than merely reported; a stale module hash refusing to execute
  and prompting a reload; the same module run in Node and named by a
  client-host descriptor, which is the two-host claim of §8.3.
- **Turn loop** — rounds to completion; tool-call round trip with the array
  contract and more than one call; retryable versus fatal provider errors;
  cancel by flag and by broadcast; timeout; lease refusal rolling back the
  reservation; empty completion and truncated tool arguments.
- **Streaming** — a text delta is observable at the sink *before* the provider
  hook resolves. This is the regression test for §9.4 and the one that will
  actually catch a reversion.
- **Quota** — each dimension and period; a reservation rolled back when the
  turn fails to start; turn-start-only enforcement letting a turn overrun
  (§10.3); `costUnknown` never recorded as zero; a site handler returning a
  subject other than the username, and one replacing the shipped policy
  entirely.
- **Actor** — `onBehalfOf` present in every AI log line when set, and thread
  ownership following it.
- **Provider selection** — the allowed list filtered by disabled plugins and
  missing keys; non-vision models greyed out on a thread with images; a
  mid-thread switch recorded on the turn and the history replayed without
  provider-specific blocks.
- **Providers** — the mock provider drives the loop end to end with no network;
  the Anthropic adapter's SSE parser against split and malformed chunks, its
  four-way usage mapping, stop-reason normalization, and API-key redaction in
  errors.
- **Transport** — HTTP/SSE path chosen when no client-host tool is offered;
  WebSocket path when one is; transport failures mapped onto the envelope with
  `stall` set only for a lost connection; a namespace connect refused for a
  thread the session does not own, asserted *before* the upgrade rather than
  after; an oversized client reply reported as `AI_RESULT_TOO_LARGE` rather
  than left to time out.
- **Panel** — adapter contract with a stub adapter; the same panel driven over
  both transports through the one client API; reconnect and turn
  reconciliation after a simulated reload, including a running turn whose text
  arrives only on completion; no framework code reaching into site state.
- **Propose and apply** — records derived from a finished turn's `toolCalls`
  in call order, with ids stable across re-derivation and a persisted list
  winning; an apply endpoint refusing a turn the session does not own,
  idempotent on repeat, and self-healing on a turn whose records were never
  persisted; the cards note wording; only the latest proposal's undo
  producing the undone note; the false-claim note firing on a configured
  phrase and staying silent when no proposing tool was offered; a card that
  posts nothing when the site's `applyProposal` fails; and the loop-purity
  assertion that `turnLoop.js` contains no proposal vocabulary. The
  read-only case is a test rather than an assumption: no proposing tool
  means no record written, no card rendered, and no note added.
- **Attachments** — the source module as a plain function (outline, section,
  window, caps, delimiter wrap, and text that itself contains a source marker);
  a manifest carrying metadata and never text; an outline listing free of the
  read budget while a window read counts; each `UrlFetch` code mapped to a
  user-facing message, HTML extraction on hand-written fixtures, and the
  empty-shell verdict answering with the paste instruction; converter cap merge,
  ordered retry when the first claimant returns empty text, and both convert
  hooks executing while undefined; image MIME normalization, byte cap, TTL,
  read-once deleting the key, Redis absent reported as unavailable rather than
  throwing at send, and gating against the thread's model rather than the site
  default; `data.media` lifted out of `data` so the tool-result message stays
  text; and the loop-purity assertion that `turnLoop.js` contains no attachment
  vocabulary. Opt-in is a test rather than an assumption: sources disabled means
  no tool offered and no manifest block, and no vision means no image parts.
- **MCP readiness** — the tools layer exercised through a synthetic non-web
  actor, asserting client-host tools are filtered and server-host tools
  execute.


---

## 20. Deferred items and technical debt

Recorded deliberately, with the decision that produced each one, so a later
reader knows these were chosen rather than missed. Referenced as TD-NN
throughout the document.

### TD-01 Tool result size and pagination

**State.** A hardcoded byte cap. An oversized result returns
`RESULT_TOO_LARGE` with a `hint` telling the model to narrow its request — ask
for a subtree rather than a document, a page rather than a file. No pagination
and no cursor.

**Why deferred.** Pagination is not one feature but three: a cursor the model
must carry across calls, a per-tool notion of what "next" means, and a turn
budget so paging cannot become an infinite loop. The hint-and-retry path costs
one round trip and works for every tool without any of that.

**Trigger.** A tool whose genuinely useful result exceeds the cap and cannot be
narrowed by argument — the signal is a model that retries with narrower
arguments and still overflows.

### TD-02 Quota enforcement timing

**State.** Turn-start only, permissive: a turn that starts under its caps runs
to completion even if it ends over (§10.3). Hardcoded.

**Why deferred.** The rationale is in §10.3 — a turn cut off mid-flight may
leave a proposal it cannot describe, and the tokens are spent either way. The
overrun is bounded by `maxRoundsPerTurn` and the provider's `maxTokens`.

**Trigger.** A deployment with a hard external budget it must not exceed.
Shape: a `quotaEnforcement: 'turn-start' | 'per-round'` setting; the reference
site's existing per-round check, which appends *"(incomplete — daily token
quota reached)"*, is the implementation.

### TD-03 Quota delegation and grants

**State.** The subject is resolved rather than assumed (§10.2), so a site can
charge something other than the requester and can write additional documents
inside its own `onAiQuotaCheck` / `onAiQuotaSettle` handlers. Pools, grants,
pro-rating, a request-and-approve workflow, and the admin UI for all of it do
not exist.

**Why deferred.** The motivating model is specific and not yet needed: a
business unit holds a monthly pool, a director receives a pro-rated share per
eligible engineer, and engineers draw from that share on request, so heavy
users get more and light users waste nothing. That is a product, with an
approval flow and a reporting surface, not a framework primitive.

**Trigger.** A deployment that needs per-user token management beyond a flat
cap. Shape: an `aiGrants` collection plus one pair of hook implementations. No
change to counters, to reserve/settle, to the turn loop, or to any index.

### TD-04 Service accounts and guest access

**State.** `actor.onBehalfOf` exists and is logged (§6.3). There is no
service-account authentication path, no guest identity issuance, no per-guest
cap, and no guest retention policy.

**Why deferred.** Both cases are plausible and neither is requested. A public
site offering limited guest chat needs identity issuance and a short retention;
an internal site offering unmetered employee chat needs a service account
absorbing usage with per-employee recording for visibility. Both are reachable
because a service account is a user account (§6.1) and the subject is resolved
(§10.2).

**Trigger.** A public site offering guest chat, or an internal bot acting for
users.

### TD-05 Provider capability keys beyond `vision`

**State.** `capabilities` is a map (§9.2) and `vision` is the only key, because
it is the only capability that currently changes behavior. Unknown keys read
as false, so a provider written against an older core keeps working.

**Why deferred.** Adding a key is now additive rather than a contract change,
so there is no reason to guess at keys before something consumes them.

**Trigger.** The second capability that differs between providers and that the
framework must act on — reasoning traces, structured output, or prompt caching
are the candidates.

### TD-06 Parallel tool execution

**State.** The contract carries an array of calls (§9.3); the loop executes
them serially.

**Why deferred.** Widening the contract later would break every provider
plugin, so the array ships now. Actually running calls concurrently adds
interleaved budget accounting, partial-failure semantics, and a harder
cancellation story, for an unmeasured gain.

**Trigger.** Measured latency where parallelism would help — most plausibly a
turn that makes several independent client-host calls, each costing a
WebSocket round trip.

### TD-07 Shared modules as a framework capability

**State.** The conventional path, content-hash serving, manifest, version
pinning, and purity scan are built inside `ai-core` (§8.4).

**Why deferred.** It is a general "one module, two runtimes" capability that AI
merely happens to need first. Designing the general API before a second
consumer exists is how a speculative abstraction gets the wrong shape.

**Trigger.** A second, non-AI consumer. Then it moves up with its API informed
by two real users instead of one imagined one.

### TD-08 Per-role provider and model allowed lists

**State.** One site-wide allowed list of `{ provider, model, label }` with a
default (§9.5).

**Why deferred.** Cost is already contained by §10 — a user on an expensive
model exhausts their own quota faster rather than escaping it — so the list is
about policy, not protection.

**Trigger.** A site that wants power users on larger models. Shape: the allowed
list becomes role-keyed and the capability probe filters it by the actor's
roles, which is where it is already filtered by plugin availability.

### TD-09 Additional quota periods

**State.** `day` and `month`. The period key is produced by a named function,
so adding one is a function plus a config enum value.

**Trigger.** A site wanting `week`, or a billing-cycle period anchored to a
date other than the first of the month.

### TD-10 Automatic host selection

**State.** `host` is declared per tool, `'server'` or `'client'` (§7.2). The
deferred design is a third value, `'auto'`, resolved by matching each tool's
declared data requirements against what each host can supply, at a declared
fidelity per field.

**Why deferred.** §8.1 — it makes every site learn a data contract and a
fidelity enum so the framework can check something the site already knows. The
cost of not having it is one word in a declaration, changed by hand when the
situation changes.

**Trigger.** Evidence that sites get the declaration wrong in practice, or a
site large enough that tools genuinely migrate between hosts often. Note the
case it would have served: if the reference site ever gains a server-side
formula evaluator, its formula-dependent tools become server-capable and
someone must notice and re-declare them, rather than them moving on their own
and becoming MCP-exposable for free.

### TD-11 The `ai-openai` provider

**State.** Not planned for W-223 … W-228. `ai-anthropic` proves the contract
against a commercial provider and `ai-mock` proves it against none.

**Why deferred.** A second commercial provider adds coverage, not design, and
it would extend the work item without testing anything the first does not. The
model-selection surface (§9.5) is built and tested regardless, using the mock
and Anthropic as the two entries.

**Trigger.** Demand, or the desire to prove the contract against a second wire
format before declaring it stable. It is a standalone package
(`@jpulse-net/plugin-ai-openai`) and therefore a standalone work item that
needs no change to `ai-core`.

### TD-12 Per-scope tool policy

**State.** The admin enables tools site-wide (gate 3, §7.5), and the per-scope
decision is expressed as a *capability* (gate 2) rather than as a tool list.
`onAiScopeResolve` cannot narrow which tools are offered.

**Why deferred.** The motivating case is already covered twice over. The
reference site gates writes per map, and that is precisely gate 2:
`canWrite: false` withdraws every tool declaring `requires: 'scope:write'`.
Beyond read-versus-write, capabilities are **named**, so a site wanting a
finer per-scope rule declares its own name on the tool and grants or withholds
it in its own handler — no framework change, no second policy surface, and the
withheld tool is reported to the model by the same sentence as every other
withheld tool (§9.6). Adding a per-scope tool list now would mean two ways to
express one decision, and a site would have to learn which one wins.

**Trigger.** A site needing to narrow tools per scope where a capability name
is the wrong way to say it — most plausibly an admin-facing per-scope
override, since a capability is code and an override is data.

**Cost when it lands.** One filter. An optional `ctx.scope.toolsDenied` (or
`toolsAllowed`) read alongside the four gates, additive because a handler that
does not set it gets today's behavior. No hook signature changes, no new hook,
no stored state, and no index. The list is already recomputed every round and
already varies by actor and scope, so nothing downstream assumes a static set
— §15.2 requires that independently.

**What must not erode.** The offered list is computed by **one** function
(§7.5), which the turn loop, the capability probe, and MCP `tools/list` all
call. Three separate answers to "which tools does this actor get" is what
turns one filter into an archaeology exercise.

### TD-13 Several concurrent threads on one scope

**State.** One *active* thread per `(scopeType, scopeId, createdBy)`, enforced
by the partial unique index (§9.7). Archived threads are already unlimited.
The panel lists the last 20 (newest first), renames, and starts a new one
via `startNew`; there is no archive/resume chrome (§12.1).

**Why deferred.** One live conversation per user per thing is what the
reference site does and what a chat panel with a conversation list reads as.
The index is also the cheapest available guard against two tabs or a
double-click creating a duplicate active thread.

**Trigger.** A site wanting several live conversations on one scope — a long
research thread beside a quick question.

**Cost when it lands.** Small, and the migration runs in the *safe* direction:
dropping a unique index rewrites no documents, whereas adding one later would
require deduping first. Unlike `onBehalfOf` (§6.3), the asymmetry does not
argue for building it now. The change is the index, plus find-or-create
becoming list-and-select, plus an optional `threadId` on
`jPulse.ai.panel.create()`. Concurrency semantics do not change either: the
Redis single-flight lease is already keyed by thread, so "one turn at a time"
simply becomes per-thread instead of per-scope-and-user.

**What must not erode.** Nothing may key on `(scope, user)` as a stand-in for
the thread. The turn route and the WebSocket namespace already carry a
`threadId` (§11.1, §11.2) and must keep doing so, find-or-create lives in
exactly one model method, and anything the panel persists holds a `threadId`
rather than "the thread for this scope".

### TD-14 Site-authored history notes

**State.** The framework computes the three propose/apply notes when history is
assembled (§13.4), and the phrase list that triggers one of them is site
configuration. A site cannot add a note of its own — say "this document was
edited outside the conversation since that reply" — without an `onAiPromptFragment`
handler, which lands in the system prompt rather than in the message history
where a note about a specific past turn belongs.

**Why deferred.** There is one consumer, and it is the framework's own. A hook
designed for an imagined second consumer gets the wrong shape, which is the
same argument TD-07 makes about shared modules. The notes are also the part of
propose/apply most likely to be re-worded as real transcripts accumulate, and a
public hook would freeze the surface early.

**Trigger.** A site with a note that has to sit beside a particular turn rather
than in the system prompt. Shape: one `execute`-mode hook over the assembled
messages, with the framework's own annotator registered on it like
`onAiQuotaCheck` — so a site adds notes rather than replacing the shipped ones.

### TD-15 Conversation-scoped tool cache

**State.** `moduleDataCache` is a per-turn `Map`, which is the answer to §23's
first open question and nothing more. There is no thread-scoped cache, so a site
tool whose data is expensive to build — a converted document, a walk of a linked
structure — rebuilds it every turn or ships its own Redis cache.

**Why deferred.** The reference site has two such caches and they invalidate on
different things: one on a snapshot per conversation, the other on an id plus a
remote version. The cache key and the invalidation rule *are* the design, and
the framework knows neither. A helper that guessed would be worse than the four
lines a site writes against `RedisManager`.

**Trigger.** A second consumer inside the bundle, or a site whose tool data
build dominates its turns. Shape: `AiCore.threadCache(threadId, key, builder,
{ ttl })` over the existing Redis helper, with invalidation left to the caller
and the thread id as the only part the framework contributes.

### TD-16 Server-resolved and persistent sources

**State.** Sources are tab memory, read through a client-host module, and listed
in a manifest the panel builds (§14.1). A source cannot outlive the tab, be read
by a collaborator, or belong to the site's own object rather than to the
conversation.

**Why deferred.** The durable version is a different feature wearing the same
word. It needs the site's store, the site's access check on every read, and a
gesture that distinguishes "hand this to the agent" from "attach this to the
object" — all of which is site code by §12.2. The framework's share is small:
accept site-contributed rows in the manifest, and dispatch a read by id
ownership. That is why §14.1 keeps source ids opaque and refuses to validate a
prefix now, when it costs nothing.

**Trigger.** A site with a source that should survive a reload, be visible to a
collaborator, or be read in a second tab. Shape: the manifest merges panel rows
with rows a site supplies through its scope resolution, and the read tool routes
panel ids to the module and site ids to a server-host tool under the site's own
authorization.


---

## 21. Work items and phases

### 21.1 Framework prerequisites

None of the five contains any AI, and all are useful on their own:

| Item | Release | Scope |
|---|---|---|
| **W-220** | v2.0.0 | `jPulse.UI.floatPanel` — the chat panel is a floating panel (§12.1) |
| **W-221** | v2.0.1 | Plugin bundle build and installation — one npm package expanding into several plugin directories, and a declared plugin dependency resolving to an installable package name (§5.1.1) |
| **W-222** | v2.0.2 | Plugin and site translation merge — `ai-core` can ship translatable UI text (§22.2) |
| **W-225** | v2.0.3 | Awaitable `onCreate` — a WebSocket namespace can authorize a connection against the database before the upgrade (§11.2) |
| **W-229** | v2.0.4 | Document-conversion and preview hook definitions — four framework-owned, AI-free hooks so a PDF, Office, or preview plugin is a framework plugin rather than a dependent of an AI plugin (§14.3) |

The first three were released before W-223, so W-223 and W-224 shipped with
no framework source change. W-225 was the missing one; it shipped as v2.0.3
before W-226.

W-229 is a prerequisite in name only, and deliberately so: `ai-core` calls
the convert pair whether or not anything has defined them (§16), so W-228
phase 3 did not wait for it and it did not wait for W-228. It shipped as
v2.0.4. What the definitions buy is a canonical contract — one wording
every converter or previewer plugin can be written against, in the
catalog, with no AI package in the dependency chain. A definition that
lived in `ai-core` would work identically and say the wrong thing about
who owns document conversion.

It was missed because §22.2 checked each mechanism for *existence* and
`createNamespace` does support `onCreate` with `:param` namespaces. What
existence did not tell you is that the hook was invoked as
`const result = namespace.onCreate(req, ctx)` and dispatched on the result's
type, so a Promise — being an object — was installed as the connection
context. An `async` handler therefore did not fail loudly: its authorization
decision was discarded and **the connection was accepted**.
`docs/websockets.md` already showed `onCreate: async (req, ctx) => …`, and
the sibling `onMessage` was already awaited, so this was a defect in a
documented contract rather than a missing feature — which is why it was a
framework item on its own merits and not a patch inside the AI work.

### 21.2 The five AI items

Grouped so that each item ends at a state someone can use and test, and so
that no item spans two repositories. The reference site's migration (§18) is
separate work in its own repository.

| Item | Title | Ends at |
|---|---|---|
| **W-223** | ai: agent server core — tools and agent layers, mock provider | A controller-centric site runs complete turns over plain HTTP against `ai-mock`: tool authorization, quota, threads, streaming, admin config and usage |
| **W-224** | ai: Anthropic provider and model selection | The same turns run against a real model, and an admin publishes a menu of models the user picks from |
| **W-226** | ai: chat panel, client-host tools, and `hello-ai` | The §1.1 one-liner works, a view-centric site works, and `hello-ai` demonstrates all of it on the mock |
| **W-227** | ai: propose and apply | A write-capable agent proposes, and the user applies or undoes |
| **W-228** | ai: attachments — sources, URL ingest, conversion, vision | Files, pasted text, URLs, and images join a conversation |
| **W-231** | ai: extract `hello-ai` into a bundled companion plugin | The sample is a third member of `@jpulse-net/plugin-ai-core`. Disable it without disabling AI |

W-223, W-224, and W-226 are the "first release" referred to throughout: server
core, a real provider, and the panel. W-227 and W-228 are each independently
valuable, and neither blocks the other.

Where this splits differently from a layer-by-layer reading of §5.2: the
HTTP/SSE turn path (§11.1) lands in **W-223**, not with the rest of the
transport layer. It is what makes the server core demonstrable — a turn over
`curl`, with no browser in the picture — and it is the whole transport story
for a controller-centric site. The WebSocket and the client bridge (§11.2) go
with the panel in W-226, because nothing needs them until a client-host tool
executes.

### 21.3 W-223 — ai: agent server core

The whole server side, ending at a working headless agent.

| # | Phase | Contents |
|---|---|---|
| 1 | Tools layer | Registry, actor context (§6.2), the four gates (§7.5), declarative budgets and argument dedupe (§7.4), result envelope (§7.3), `static hookDefinitions` for the catalog (§16), `global.AiCore`, the layer-boundary scan test (§5.2) |
| 2 | Persistence and quota | `aiThreads` / `aiTurns` / `aiUsage` (§9.7), reserve-then-settle, named dimensions over periods, subject resolution, and `ai-core`'s own shipped policy registered on `onAiQuotaCheck` / `onAiQuotaSettle` (§10) |
| 3 | Agent layer | Turn loop with rounds, cancel, timeout, retry, and the Redis lease (§9.1); provider contract with array tool calls (§9.3), immediate emit (§9.4), and the capability map (§9.2); prompt assembly (§9.6); `ai-mock` |
| 4 | HTTP transport, admin, packaging | `POST /api/1/ai/thread/:id/turn` with SSE and the capability probe (§11.1); admin config tab and usage page (§17); `@jpulse-net/plugin-ai-core` bundle packaging on W-221 |

Phase 1 is the item's architectural floor and is also exactly the surface an
MCP server binds to, so it is built and tested with no thread, no turn, no
provider, and no browser in the picture. Phases 3 and 4 are what make the item
demonstrable, and the mock is what makes it demonstrable without an API key or
any spend.

Deliberately out: every client-host execution path. Phase 1 accepts and
filters `host: 'client'` descriptors; nothing runs one until W-226.

Two seams land in this item that are free now and awkward to retrofit: named
capabilities and a single tool-resolution function in phase 1 (TD-12), and
threadId-keyed routes with find-or-create in exactly one model method in
phase 2 (TD-13). Neither is extra work — both are a choice of where to put
code that gets written either way.

This is the largest of the five. If it wants to be smaller, the seam is
between phases 2 and 3 — phases 1 and 2 are the tools layer plus storage with
no turn loop at all, which is testable but not demonstrable.

### 21.4 W-224 — ai: Anthropic provider and model selection

**Shipped** 2026-09-17: `@jpulse-net/plugin-ai-anthropic` 1.0.0 and
`@jpulse-net/plugin-ai-core` 1.0.1.

| # | Phase | Contents |
|---|---|---|
| 1 | The provider | `@jpulse-net/plugin-ai-anthropic` 1.0.0 on the **published** contract: SSE parsing against split and malformed chunks, four-way token accounting (`tokensIn` / `tokensOut` / `cacheWrite` / `cacheRead`), `emit({ type: 'tool_use', calls: […] })` for **every** tool block in the round, stop-reason normalization, the price table in **$/MTok**, API-key redaction in errors, silent abort / `AI_TIMEOUT`, and the plugin-config tab with the unsaved-value Verify button (§17) |
| 2 | Selection surface | Remaining §9.5 work in `ai-core` 1.0.1: probe filtering by key presence (`configured` on the descriptor), persist the chosen pair on the thread when a turn or a write uses a different one, a write path that does not start a turn, vision gating in the menu (`?hasImages=1`), and a provider-only site default. The admin allowed list and the probe menu already shipped in W-223. The overview page shows the live probe. |

Separate from W-223 because it is a separate npm package with its own release
cadence, and because a provider written against the published contract is the
honest test that the contract is public (§5.1). Phase 2 needs two entries in
the menu — `ai-mock` and Anthropic — which is why the leftover selection work
lands here rather than in W-223.

**Port source.** `tmp-bubblemap-app/plugins/ai-anthropic` (BubbleMap 1.6.6):
`webapp/controller/aiAnthropic.js` (SSE, Messages API, Verify, prices) and
`webapp/view/jpulse-common.js` (Verify button). Keep the wire work; do not
copy the license, the T-092 / map vocabulary, or the unpublished event
shape. Contract diffs the port must make:

| BubbleMap 1.6.6 | Published `ai-core` 1.0.0 |
|---|---|
| Emits the **first** `tool_use` only, as `{ type: 'tool_use', id, name, args }` | `{ type: 'tool_use', calls: [ { id, name, args }, … ] }` for every completed tool block; `tool_use_truncated` for a block whose JSON never parses |
| Usage fields `cacheWriteTokens` / `cacheReadTokens` | `cacheWrite` / `cacheRead` — `addUsage` does not alias the old names, so cache tokens would silently cost $0 |
| `priceTable` registered as **per-token** rates (`$/MTok / 1e6`) | `$/MTok` — `computeCost` divides by 1e6 itself; registering pre-divided rates under-charges by a million |
| Descriptor `id` + `supportsVision: true` | `plugin` + `capabilities: { vision: true }` (`normalizeProvider` still accepts the old shape; new code uses the map) |
| Empty `dependencies.plugins` | `{ 'ai-core': { version: '>=1.0.0', npmPackage: '@jpulse-net/plugin-ai-core' } }` |
| Proprietary site plugin | Own repo `jpulse-net/plugin-ai-anthropic`, BSL like the other `@jpulse-net` plugins |

The loop ignores a `tool_use` event that has no `calls` array, so a literal
copy of the BubbleMap emit would run a "successful" text-less turn and never
execute tools. That is the honest-test failure this item exists to catch.

### 21.5 W-226 — ai: chat panel, client-host tools, and `hello-ai`

**Shipped** 2026-09-17: `@jpulse-net/plugin-ai-core` 1.0.2 carrying
`ai-mock` 1.0.2. Required W-225 (v2.0.3), so `jpulseVersion` is `>=2.0.3`.

| # | Phase | Contents |
|---|---|---|
| 1 | WebSocket and the client bridge | Per-thread namespace with ownership checked in an `await`ed `onCreate` and `removeIfEmpty()` on the last disconnect, the turn started over the socket, token deltas unicast to the origin tab, turn events broadcast to the user's other tabs, and `WebSocketController.request()` with transport failures mapped onto the result envelope and `stall` set only for a lost connection (§11.2) |
| 2 | Shared tool modules | The conventional path and its resolution order, content-hash serving, dynamic `import()`, the `{ name, hash, url }` manifest, stale-hash refusal with a reload prompt, `dataScope`, and purity enforced at import and at serve with the scanner exported (§8.2) |
| 3 | The panel | `jPulse.ai.panel` on `jPulse.UI.floatPanel`, the adapter contract (§12.1), one client API over both transports, conversation row (last 20, newest first), compose and slash commands, streaming with jumping dots, markdown with pinned copy buttons, reconnect and turn reconciliation, `/model` for the thread pair, and the quota and error surfaces |
| 4 | `hello-ai` and docs | The demo view and its tool modules, shipped inside the plugin (§22.1), the `ai-mock` targeted tool script, plus the panel and tool-module sections of `plugins/ai-core/docs/` (§22.3) |

Phase 3 is validated against `hello-ai` and deliberately **not** against the
reference site. An adapter contract proven only against the application it was
extracted from is not a contract.

**`hello-ai` is a scratch pad.** A textarea whose contents never reach the
server — unsaved edits and the current selection, the honest §7.2 case.
`scopeType` is `hello-ai`. Registrations are gated on that scope type: an
unconditional `onAiToolRegister` push would make `chooseTransport()` answer
`ws` for every page of every site that installed the bundle. Demo hooks
live in `helloAi.js`, not `aiCore.js`.

**Three tools, one per shape a site can write:**

| Tool | Host | Path |
|---|---|---|
| `read_draft` | client | module `readDraft`, `requires: 'scope:read'`. `data.text` is the pad (32 KB cap); `data.excerpt` is a 160-character preview |
| `append_draft` | client | no module, `adapter.executeTool`, `requires: 'scope:write'`, `mutates: true`, `budget: { key: 'writes', max: 3 }` |
| `get_hello_clock` | server | ordinary `onAiToolExecute` |

`append_draft` cannot be a module: appending to a textarea is a DOM write,
and a tool module is pure. That is why the write is in this item and not
deferred to W-227 — `executeTool` exists for side effects, and a read-only
demo would leave the adapter member undemonstrated. A direct write is not
propose/apply: it records no proposal and shows no Apply card.

The "one module, two hosts" claim of §8.3 is proven by a plugin test
running `readDraft.js` in Node against fixture data. Registering one module
twice under two tool names would show it in the UI at the cost of a
registration no real site would write.

**`ai-mock` gains a targeted tool script.** `[mock:tools]` calls whichever
tools happen to be first and second on the offered list, with empty arguments,
which is enough to drive the loop and not enough to demonstrate a tool. A
script naming a tool and its arguments, then summarizing the result in a second
round, is what makes `hello-ai` show a specific client-host call crossing the
bridge and coming back.

The targeted script also takes a **sequence**, which is a deliberate
extension of the single-call form above. "Summarize the draft and append
the summary" is a read then a write. The structured form is
`script: { type: 'tool', steps: [ { name, args }, … ] }` — one `tool_use`
per round in order, then a final text round. A step argument whose value is
`$prior.<dotted.path>` resolves against the previous round's first tool
result. `ai-mock` stays domain-free: it resolves a path against a result it
was handed. `hello-ai` has no scripted buttons: `/help` lists `examples`
from `panel.create`. The structured `script` field stays for `curl` and
sites; the `[mock:tool:…]` bracket form cannot carry a `]` inside the JSON
(objects and scalars are fine). Same package, so it ships in the same
version.

### 21.6 W-227 — ai: propose and apply

| # | Phase | Contents |
|---|---|---|
| 1 | Server | `proposes: true` on the descriptor and `data.proposal` in the envelope (§13.1); records derived by one function and persisted by the `onAiTurnAfter` subscription (§13.2); the apply and undo endpoints (§13.3); the three history notes and the one prompt sentence (§13.4); the phrase policy (§13.5). No loop edit, asserted by a test |
| 2 | Panel | Apply card chrome, several cards per turn with "Apply all", per-card states, the adapter-then-endpoint ordering, and the user-facing half of the false-claim guard |
| 3 | `hello-ai` and docs | One proposing tool as a **pure module**, the adapter trio on the demo's scratch pad, and the guide's propose/apply and direct-write-versus-proposal sections |

Opt-in throughout: a read-only agent registers no write tool and never
encounters any of it — no record is written, no card renders, and no note is
added to its history.

Phase 3 exists for the reason phase 4 of W-226 existed. Three adapter members
proven only against a stub adapter are not a validated contract, and card
chrome cannot be developed without something that renders inside it. The demo
tool is `host: 'client'` with a **module**, not `executeTool`, which makes the
architectural point in the place a developer will copy from: proposing is a
read plus a validation, so it is pure, and the only write in the whole pattern
is `adapter.applyProposal`. Set against `append_draft` on the same scratch pad,
the pair says what the guide would otherwise have to argue — a direct write is
for a change the user is watching and can undo by hand, propose/apply is for a
change that needs consent first. W-226 recorded that pedagogical risk when it
shipped the direct write first; this is where it is paid off.

`ai-mock` needs no product change: the structured `script.steps` with
`$prior.<dotted.path>` from 1.0.2 already drives "read the pad, then propose a
rewrite of what you read". The 1.0.3 bump on that member is version lockstep
only.

### 21.7 W-228 — ai: attachments

Shipped as `@jpulse-net/plugin-ai-core` 1.0.4. Rev 15 records the as-built.

| # | Phase | Contents |
|---|---|---|
| 1 | Sources | The source module and its panel-owned data, chips, the prompt manifest, `<<<SOURCE …>>>` markers, the declarative read budget, `sourceRefs` and the transcript badge, opaque ids, and the retained `File` behind `handle.sourceFile` / `adapter.sourceAttachable` (§14.1) |
| 2 | URL ingest | One endpoint on `UrlFetch` with a narrowed accept list and cap, the small HTML extractor and its empty-shell verdict, provenance, per-code messages, and the panel's intercept card (§14.2) |
| 3 | Document conversion | The convert endpoint on a streaming route, per-MIME descriptors, ordered retry across converters claiming one type, cap merge, and the empty-extract refusal. No converter ships (§14.3) |
| 4 | Images and vision | Redis staging with a TTL, MIME allowlist, edge and byte caps, send-time gating against the thread's pair, content parts, `data.media` for tool-returned images, and a vision row on the mock (§14.4) |

Phases 1 and 2 touch no framework source and no provider. Phase 3 is where
W-229's definitions belong and did not depend on them (§21.1); those
definitions later shipped in v2.0.4. Phase 4 is the
only one that reaches a provider message, and the reach is one line: the loop
tolerates an array `content` where it used to push a string, and everything about
staging, MIME, caps, and base64 lives beside it in `webapp/utils/attachments/` —
the same arrangement that kept propose/apply out of the loop, and asserted the
same way, by a test over `turnLoop.js` source.

**`ai-mock` needs a product change this time**, unlike W-227's lockstep bump.
It declares `capabilities: { vision: false }` and its content flattener drops
non-text parts, so with only the bundle installed the vision path cannot be
exercised at all — the menu never greys a row and no test can assert an image
arrived. A second model row that advertises vision and names the images it was
handed fixes both, and gives `hello-ai` a demonstrable gate rather than a
described one.

**The scope traps are named because they are large and inviting.** The reference
site's source and image prompt copy is mostly domain steering about placing
content on bubbles; only the manifest lines, the read-with-this-tool sentence,
and the quotation rule generalize, and the last already ships (§9.6). The HTML
extractor grows without limit if allowed to: readability-lite plus an empty-shell
verdict, and nothing more (§14.2). And phase 3 ships no converter, so a PDF drop
on a bare install is a clean refusal naming what to install rather than a
half-working extractor inside the bundle.

### 21.8 W-230 — panel regions and site-owned slash commands

Published as `@jpulse-net/plugin-ai-core` 1.0.5 (bundle carries
`ai-mock` 1.0.5; mock lockstep only). Specified in Rev 18 against shipped
1.0.4. The panel stops deciding the whole surface: named region anchors,
a site-owned command catalog with framework implementations addressable
by name, ten generic gated defaults, clickable `/help` examples, and a
context row gated on `adapter.contextOptions()`. `describeScope()` is
removed. No framework source change and no server route. `hello-ai`
demonstrates a site region, a site command, a hidden command, and
clickable examples, and proves that a site without `contextOptions()`
gets no context row.

### 21.9 W-231 — extract `hello-ai` into a bundled companion plugin

Published as `@jpulse-net/plugin-ai-core` 1.0.6 (bundle carries
`ai-mock` 1.0.6 and `hello-ai` 1.0.6; mock lockstep only). Specified in
Rev 19 against shipped 1.0.5. `hello-ai` moves from a view inside
`ai-core` to a third `bundle.members` name. Same npm package,
`autoEnable: true`, companion-guard `package.json`, no bump-version
conf. The pad is not rewritten. No framework source change.
`jpulseVersion` stays `>=2.0.3`.

### 21.10 Standalone follow-ons

Each its own item, written when wanted rather than scheduled now:

| Follow-on | Depends on | Note |
|---|---|---|
| `ai-mcp-server` | W-223 phase 1 only | The controller-centric case that validates the layer boundary (§15.1). Its own plugin, and it needs nothing from W-224 … W-228 — which is the whole point of drawing the boundary first (§5.2) |
| `ai-openai` | W-224 | TD-11. A standalone package needing no `ai-core` change |
| Reference-site migration | per layer, §18 | The site's own repository, sequenced against the items above |


---

## 22. Deliverables

Sketch only; each item in §21 carries its own list.

### 22.1 Plugin files — where essentially all the code lives

Everything client-side ships from inside the plugin, not from `webapp/`. W-098
append mode concatenates framework, site, and plugin copies of any `.js` or
`.css` under `view/`, so a plugin's `jpulse-common.js` extends the client
namespace with no framework involvement.

Each plugin directory is its own git repository and its own commit, as
`plugins/auth-mfa/` already is — `plugins/*` is gitignored by the framework
repo except `hello-world`. The bundle is therefore three repositories with
`ai-core` as the **primary**: it declares `bundle.members`, owns the published
package name and version, carries the only `webapp/bump-version.conf`, and is
the only directory that publish and bump are run from (§5.1, W-221).

- `plugins/ai-core/plugin.json` — manifest, `autoEnable`, config schema pointer
- `plugins/ai-core/webapp/controller/` — `static hookDefinitions` for the hook
  catalog (§16), `api*` methods for the routes, `static async initialize()` for
  `global.AiCore` and the config tab
- `plugins/ai-core/webapp/utils/{tools,agent,transport}/` — the three layers as
  separate directories under the plugin `utils/` convention, with the import
  boundary scan-enforced (§5.2)
- `plugins/ai-core/webapp/utils/proposals/` — propose/apply (§13), a peer of
  the three layers rather than a part of one: it reads finished turn records,
  annotates history, and subscribes to `onAiTurnAfter`, so it belongs to no
  layer's dependency chain and the turn loop stays unaware of it
- `plugins/ai-core/webapp/utils/attachments/` — sources, URL ingest,
  conversion, and image staging (§14), a peer for the same reason: it produces
  a prompt manifest and provider content parts, and the loop only tolerates the
  parts (W-228)
- `plugins/ai-core/webapp/model/` — `aiThreads`, `aiTurns`, `aiUsage` (§9.7)
- `plugins/ai-core/webapp/view/jpulse-common.js` — the `jPulse.ai` namespace:
  panel, transport, tool-module loader
- `plugins/ai-core/webapp/view/jpulse-common.css` — `plg-ai-*` chat classes over
  W-220's `jp-float-panel-*`. Not `jp-ai-*`: `jp-*` is framework-owned and
  read-only to everything else, and the documented plugin convention is
  `plg-<name>-*`, which `auth-oauth` already ships as `plg-oauth-*`. The panel
  reuses `jp-*` classes freely and creates none
- `plugins/ai-core/webapp/view/jpulse-navigation.js` — AI usage and AI Core
- `plugins/ai-core/webapp/view/admin/` — the usage page (§17)
- `plugins/ai-core/webapp/utils/ai-tools/sources.js` — panel-owned source
  tools. Demo modules do not live here
- `plugins/hello-ai/` — bundled companion (§5.1). Controller, scratch-pad
  view, `readDraft` / `proposeRewrite`, site-hello-demos nav, and the
  dashboard card. `autoEnable: true`. Disable it to hide the demo without
  disabling AI. Same `hello-world` precedent as before: a plugin can ship
  a view and its own navigation. It still runs on `ai-mock`
- `plugins/ai-mock/` — bundled with `ai-core` (§5.1)
- `plugins/ai-anthropic/` — separate package
- `plugins/ai-core/webapp/translations/` — `en.conf` and `de.conf`; a chat
  panel is heavy on UI text, and since v2.0.2 a plugin's strings merge into the
  framework set and a site can override any of them (W-222)
- bundle packaging on W-221: `bundle.members` on `ai-core`, `"files":
  ["plugins"]` plus the `prepack` / `postpack` staging scripts, and
  `dependencies.plugins` on `ai-anthropic` naming `@jpulse-net/plugin-ai-core`

### 22.2 Framework files that change

Checked against the code rather than assumed. **Three framework source files
needed a change; all three are released.**

`webapp/controller/websocket.js` was W-225 (§21.1) and shipped in v2.0.3:
`onCreate` used to be invoked without `await` and its result dispatched on
type, so an `async` handler's authorization decision was silently discarded
and the connection accepted. The AI panel authorizes a namespace against the
database in that hook (§11.2). Worth recording how the earlier revision of
this section got it wrong: it asked whether each mechanism *existed*, and
`onCreate` does. Existence and being usable for the purpose are different
questions, and only building the caller distinguishes them.

The released one was `webapp/utils/i18n.js`: `loadTranslations()` read a single
directory, `join(config.system.appDir, 'translations')`, and assigned each
language wholesale, so a plugin could not ship UI text and a site could not
override a string without editing framework-managed files. That shipped in
v2.0.2 (W-222) — translation `*.conf` files are collected and deep-merged from
the framework, then each active plugin in load order, then
`site/webapp/translations/`, and a plugin shipping only its default language is
backfilled rather than blank. `ai-core` is the first real consumer.

The third is `webapp/utils/hook-definitions.js`, and it shipped as W-229
in v2.0.4: four document-conversion and preview hook definitions plus a
`docs/hooks.md` section. Catalog and documentation, no converter, no
previewer, and no framework caller. This one is not a defect and not a
gap in a mechanism — every earlier revision of this section was right
that `ai-core` needs nothing from the framework to *call* the convert
pair. What it cannot do from inside a plugin is make the contract
canonical: a name defined by `ai-core` makes a PDF converter a dependent
of an AI package, which is the wrong shape for every non-AI consumer
document conversion will eventually have (§14.3). The preview pair is
the consumer that already exists in the reference site, defined by a
file-attachment controller. So the finding is about ownership rather
than capability, which is why it was a framework item on its own merits
rather than a patch inside the AI work — the same test W-225 had to
pass.

No other framework source change is required for W-227 or W-228. The remaining
framework-repo deliverable is docs, listed in §22.3.

Everything else `ai-core` needs already exists, which is the useful half of
this answer:

| `ai-core` needs | Already provided by |
|---|---|
| Client JS/CSS appended to `jpulse-common.*` | W-098 append mode, `view.js` `collectAllFiles()` |
| Views, navigation, static assets from a plugin | `PathResolver.resolveModuleWithPlugins()`; `hello-world` precedent |
| `/api/1/ai/*` routes | `SiteControllerRegistry` scans plugin controller dirs and auto-registers `api*` methods |
| Its own hooks, owned and introspectable | `static hookDefinitions` (W-209); `HookManager` gains no AI strings |
| An admin config tab | `ConfigModel.extendSchema()`, which `bootstrap.js` documents as callable by plugins |
| A per-thread WebSocket namespace | `WebSocketController.createNamespace()`, public and already supporting `:param` pattern namespaces. **Authorizing** one against the database is W-225 (v2.0.3) |
| Calling a tool in the origin tab | `WebSocketController.request()` (W-208), whose `NOT_CONNECTED` / `CONNECTION_LOST` / `REQUEST_TIMEOUT` codes map straight onto the envelope (§11.2) |
| Serving tool modules at a content-hashed URL | `static routes` on the plugin controller, which `SiteControllerRegistry` honors ahead of `api*` discovery — no static-asset machinery needed |
| Correct load order ahead of provider plugins | `resolveLoadOrder()` topological sort (§5.1.1) |
| Guest/anonymous-safe turn leases | existing `RedisManager` lease, used unchanged |
| Translatable plugin UI text, overridable by a site | W-222 translation merge (v2.0.2) |
| One package installing `ai-core` + `ai-mock` + `hello-ai` | W-221 bundle install and publish (v2.0.1). `hello-ai` was a view inside `ai-core` from W-226 1.0.2 through 1.0.5; W-231 makes it a third member |

### 22.3 Documentation

The guide ships **inside the plugin**, for the same reason the code does: each
plugin is its own repository and its own release, so its documentation travels
with the version it describes. That also matches how the framework already
handles plugin docs — `docs/plugins/` holds only the how-to guides (creating,
managing, publishing, architecture, API reference), there is no per-plugin page
for `auth-mfa` or `auth-oauth`, and a plugin's own `docs/` surfaces at runtime
under the gitignored `docs/installed-plugins/<name>/`.

- `plugins/ai-core/docs/README.md` — the guide, opening with §1.1's simple case
  and keeping the same order as this document: the tool descriptor, the two
  hosts, shared tool modules, the adapter contract, quota, and writing a
  provider plugin. It grows a section per item rather than landing at once
- `plugins/<name>/README.md` for `ai-core`, `ai-mock`, `hello-ai`, and
  `ai-anthropic` — install, enable, configure, hooks used, requirements,
  release notes. `hello-ai` is the sample; `ai-core` points at it
- `docs/ai-agent.md` — framework orientation (what an agent is, install,
  configure, the one-controller case). The versioned contract stays in
  `plugins/ai-core/docs/README.md`. Rev 3 said the guide would not be a
  framework page; both exist, for different readers
- in the framework repo, on whichever framework release accompanies a bundle
  release: cross-links from `docs/hooks.md` (a plugin owns the `onAi*`
  hooks; the framework owns `onDocument*`), `docs/genai-instructions.md`,
  `docs/genai-development.md`, `docs/security-and-auth.md`, and
  `docs/url-fetch.md`, plus the usual Latest Release Highlights and
  `docs/CHANGELOG.md` entries. These are a framework commit, never part of a
  plugin commit


---

## 23. Open Questions

Two remain, and both are answered in substance — what is still open is a
default that may want revisiting and a rule that may not be enforceable.
`hello-ai`'s home (§22), bundle granularity (§5.1), per-scope tool policy
(now TD-12), and thread scope granularity (now TD-13) were also open and are
decided.

1. **Tool data caching.** When a turn makes several calls against the same
   data, is that data built once per turn or once per call? Once per turn is
   cheaper and can go stale within a long turn; once per call is always
   correct and may rebuild a large structure repeatedly. The agreed answer is
   a per-tool declaration, `dataScope: 'turn' | 'call'`, defaulting to `call`
   so the safe behavior is the one a site gets without deciding. Open only in
   the sense that the default may want revisiting once real turn shapes exist.
2. **A tool needing data from both hosts.** A tool wanting a server-only field
   *and* a client-only field has no host that satisfies it. The agreed answer
   is that this is the site's error, reported at registration rather than at
   the first call: split it into two tools, or make the missing data available
   to the chosen host. The framework will not merge data across hosts, because
   that means a large structure crossing the wire per call with no party
   accountable for its size. Open only in that "reported at registration"
   needs the site to have declared enough for the check to be possible — with
   §8's simplification there is no field declaration, so this may reduce to a
   documented rule rather than an enforced one.
