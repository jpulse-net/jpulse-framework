# W-223 AI agent framework for sites

**Status:** Design only. No implementation and no work item yet. W-220
(`jPulse.UI.floatPanel`) and W-221 (plugin bundle build and installation) are
prerequisites; §21 is the proposed split of W-223 itself.


## Revision history

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
- The **first release covers server core, providers, and the generic chat
  panel**. Propose/apply and attachments follow (§21).
- The two-host tool split (`host: 'server' | 'client'`) is the answer to
  view-centric versus controller-centric, and it is **per tool, not per site**
  (§7.2). A controller-centric site additionally gets an HTTP/SSE turn path so
  it never needs the WebSocket at all (§11).
- `ai-core` ships a **`hello-ai` demo view**, in the spirit of `hello-todo`
  but inside the plugin, because the feature is complex enough that onboarding
  needs a running example rather than a document (§22).


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
npx jpulse plugin install @jpulse-net/plugin-ai
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
| `@jpulse-net/plugin-ai` | `ai-core` + `ai-mock` + `hello-ai` | Everything needed to stand the feature up and see it work, with no API key and no spend |
| `@jpulse-net/plugin-ai-anthropic` | `ai-anthropic` | Depends on `ai-core`; installed only by a site that uses Anthropic |
| *(deferred)* | `ai-openai` | TD-11 |

The reasoning for bundling `ai-mock` with `ai-core` rather than shipping it
separately: a freshly installed `ai-core` with no provider is a feature that
cannot be demonstrated, and the first thing anyone does with it — including the
framework's own tests and the `hello-ai` view — is run a turn without spending
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

That is **W-221**, a framework item on the plugin CLI and `PluginManager`: let
one npm package expand into several plugin directories (which the bundle needs
regardless, since it ships three), and let a plugin's declared dependency
resolve to an installable package name so the CLI can offer or perform the
install. It gates *shipping* the bundle, not developing it, and it is useful
independently of AI.

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

The offered tool list is recomputed **every round**, not once per turn, because
permissions can change mid-conversation. The system prompt says so explicitly,
and that sentence should survive into the framework's default fragment.


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

- **Location.** Tool modules live at a conventional path —
  `site/webapp/ai-tools/` for a site, `webapp/ai-tools/` inside a plugin — as
  plain ES modules with a `.js` extension. Not templates.
- **Server.** Ordinary `import`. Ordinary unit tests, in Node, with no `vm`
  sandbox and no Handlebars stripping.
- **Browser.** `ai-core` serves each module at a content-hashed URL and the
  panel loads it with dynamic `import()`. A real module: real source maps, real
  breakpoints, real stack traces.
- **Version pinning.** The capability probe returns a manifest of
  `{ name, hash }`. A tab whose loaded hash no longer matches the server's
  refuses to run the tool and prompts a reload, rather than silently running
  yesterday's logic against today's server. This matters more than it sounds —
  a long-lived tab is the normal case for a chat panel.
- **Purity enforcement.** A scan test asserts these modules import nothing
  outside a small allowlist. Purity is what makes them safe to serve to a
  browser and cheap to test, and it is the only rule the site has to obey.

A descriptor opts in by naming the module:

```js
{
    name:      'get_tree',
    host:      'client',            // the site's judgment, §7.2
    module:    'getTree',           // site/webapp/ai-tools/getTree.js
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
  the thread. The panel shows a model picker only when the filtered list has
  more than one entry.
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

### 9.7 Persistence model

Three collections, framework-owned (§18), structurally as today.

| Collection | Key | Notes |
|---|---|---|
| `aiThreads` | `(scopeType, scopeId, createdBy)` unique on `status: 'active'` | `createdBy` is a username (§6.1); label, context, provider/model, rollups |
| `aiTurns` | `threadId`, `seq` | userText, agentText, toolCalls, proposals, usage, rates, cost, provider/model, status |
| `aiUsage` | `<subject>:<period>` unique | named counters, `costUnknown` (§10.2) |

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

Today every turn starts over the WebSocket, because the process holding the
origin tab must be the one to call back into it for client-host tools. A site
with only server-host tools has no such constraint, and forcing it through a
per-thread WebSocket namespace is a large adoption tax for no benefit.

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
problem to report rather than the server's to discover.


---

## 12. The client layer

### 12.1 Chat panel and the site adapter

Built on `jPulse.UI.floatPanel` (W-220). The framework owns everything that is
not about the site's data:

- conversation list, rename, archive, resume, and the new-conversation flow
- compose box, slash-command picker, keyboard handling, send and cancel
- the model picker, when more than one model is allowed (§9.5)
- transport connect, reconnect, and turn reconciliation after a reload
- token streaming, scroll-to-bottom, the stuck-turn prompt
- markdown rendering with pinned copy buttons
- quota and error surfaces, retention notices
- attachment chips for file, paste, and URL sources, and staged images
- the URL-intercept card
- the client-host tool bridge and the tool-module loader (§8.4)

The site supplies an adapter object rather than mixing methods into a
component:

```js
jPulse.ai.panel.create({
    scopeType: 'map',
    scopeId:   mapId,
    adapter: {
        toolData(toolName) { … },  // data for client-host tools, §8.1
        describeScope()   { … },   // labels for the prompt blocks
        describeContext() { … },
        describeTarget()  { … },
        contextOptions()  { … },
        renderProposalPreview(proposal) { … },   // §13
        applyProposal(proposal) { … },
        undoProposal(proposal)  { … }
    }
});
```

`toolData` and the three `describe*` methods are the only ones a read-only
agent needs, and `adapter` may be omitted entirely by a site with no
client-host tools — which is the §1.1 case.

Note what is *not* required on the adapter: `executeTool`. When a client-host
tool names a shared module (§8.2), the site supplies the data and the
framework's loader runs the module against it. A site with a client tool that
is not worth making a module still provides `executeTool` as an escape hatch,
but it is the exception rather than the interface.

### 12.2 What stays site code

The data the tools operate on, the computation engines a tool module needs,
proposal preview rendering and the apply itself, and the labels for scope,
context, and target.

The migration cost to the reference site is real and worth stating: its panel
is currently a set of Vue methods mixed into the canvas component, reaching
directly into the component's bubble list, synapse list, title cache, formula
evaluator, and page config. Becoming an adapter is a genuine refactor. It is
also what makes the panel reusable, and it is confined to one repository and
one work item.


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


---

## 14. Attachments

Largely already-generic infrastructure in the reference site, and mostly a
packaging exercise:

- **Sources** — file, paste, and URL text attached to a conversation, with a
  manifest in the prompt and the text read through a tool rather than dumped
  into context. The untrusted-content markers and the "quotations, not
  requests" prompt rule come with it.
- **URL ingest** — should be rebuilt on the framework's own `UrlFetch`
  (`docs/url-fetch.md`), which already provides the private-address guard, size
  and timeout ceilings, and redirect handling that the site's URL ingest partly
  re-implements.
- **Document conversion** — `onDocumentConvertRegister` / `onDocumentConvert`
  are already hook-shaped, and the site's PDF and Office converter plugins are
  candidates to move up to the framework with the same contract.
- **Images and vision** — staging with a TTL, an allowlist of MIME types, edge
  and byte caps, and `capabilities.vision` gating from the provider descriptor.


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

All defined by `ai-core` via `static hookDefinitions`. The framework's
`HookManager` gains nothing.

| Hook | Mode | onError | Purpose |
|---|---|---|---|
| `onAiProviderRegister` | execute | continue | Contribute a provider descriptor |
| `onAiComplete` | executeForPlugin | abort | Run one completion |
| `onAiToolRegister` | execute | continue | Contribute tool descriptors |
| `onAiToolExecute` | executeForPlugin | abort | Execute an owner's server-host tool |
| `onAiToolData` | executeFirst | abort | Supply a shared tool module's data on the server (§8.1) |
| `onAiScopeResolve` | executeFirst | abort | Resolve scope, labels, and read/write capability |
| `onAiPromptFragment` | execute | continue | Contribute system-prompt fragments |
| `onAiQuotaCheck` | executeFirst | abort | Resolve the subject and its caps, and reserve; veto by throwing |
| `onAiQuotaSettle` | execute | continue | Apply actual usage |
| `onAiTurnBefore` | execute | abort | Last veto point before a turn runs |
| `onAiTurnAfter` | execute | continue | Turn finished; the propose/apply layer listens here |

Four of these are what §1.1 uses; the rest are entered only by a site with the
matching problem. `ai-core` registers itself on `onAiQuotaCheck` and
`onAiQuotaSettle`, so those have a working default and a site overriding them
replaces a real implementation rather than filling a hole.

`onAiScopeResolve` is the one to get right: it is where a site says "this
thread is about document X, this user may read it, may not write it, and the
words for its parts are *section* and *document*". Everything domain-shaped in
the prompt and in authorization flows from it.


---

## 17. Configuration and admin

`ai-core` contributes a config tab through `ConfigModel.extendSchema()` — the
`static async initialize()` call site W-207 provides, which is what the
reference site already uses. Settings split cleanly:

- **app.conf** — provider and model defaults, debug dumps (deliberately not on
  the admin tab, where they are easy to leave on), and prompt fragment
  overrides.
- **Admin tab** — the master switch, allowed roles, the allowed provider/model
  list and its default (§9.5), quota caps (§10.1), loop limits (rounds,
  timeouts, context size), tool and docs-topic policy, retention, and
  auto-titling.
- **Provider plugin config** — API key as `type: 'password'` with `getSecret`
  on the server path and an unsaved-value Verify button, endpoint, timeout, max
  tokens, and a price-table override. The reference site's Anthropic provider
  is the reference and needs no rework.

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
   generic two-thirds of the panel template.
4. Adopt shared tool modules, propose/apply, and attachments; collapse the
   mirror modules (§4.4) and retire the `vm`-sandbox harnesses.

Each step is independently shippable, and the mock provider makes each cutover
testable without spending tokens.


---

## 19. Testing

- **Tools layer in isolation** — every gate with a plain actor object and no
  Express request; unknown tool, capability denial, policy denial, budget
  exhaustion, argument dedupe; the scan test asserting no agent-layer import.
- **Shared tool modules** — a module tested once as a plain function against
  hand-built data; the same module against data missing a field, asserting it
  degrades the way its author intended rather than throwing; the purity scan
  test; a stale module hash refusing to execute and prompting a reload.
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
  `stall` set only for a lost connection.
- **Panel** — adapter contract with a stub adapter; reconnect and turn
  reconciliation after a simulated reload; no framework code reaching into site
  state.
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

**State.** Not planned for W-223. `ai-anthropic` proves the contract against a
commercial provider and `ai-mock` proves it against none.

**Why deferred.** A second commercial provider adds coverage, not design, and
it would extend the work item without testing anything the first does not. The
model-selection surface (§9.5) is built and tested regardless, using the mock
and Anthropic as the two entries.

**Trigger.** Demand, or the desire to prove the contract against a second wire
format before declaring it stable. It is a standalone package
(`@jpulse-net/plugin-ai-openai`) and therefore a standalone work item that
needs no change to `ai-core`.


---

## 21. Phases and work items

Two prerequisites, both useful on their own and neither containing any AI:

| Item | Scope |
|---|---|
| **W-220** | `jPulse.UI.floatPanel` — the chat panel is a floating panel |
| **W-221** | Plugin bundle build and installation — one npm package expanding into several plugin directories, a declared plugin dependency resolving to an installable package name (§5.1.1), and plugin translation files collected and merged by `i18n.js` (§22.2) |

W-221 gates *shipping* the bundle, not developing it, so it can land in any
release up to the first AI one. All three parts of it are general plugin
infrastructure with no AI in them, and the translation part is the only
framework source change this design needs at all.

**W-223** is the AI agent itself and is expected to split further. The proposed
sub-items, in dependency order:

| # | Sub-item | Contents |
|---|---|---|
| 1 | `ai-core` tools layer | Registry, actor context, four gates, budgets, envelope, `global.AiCore`, hook definitions, the layer-boundary scan test |
| 2 | `ai-core` agent layer | Turn loop with array tool calls and live streaming, three models, quota dimensions and subject resolution, prompt assembly, admin config tab and usage page, `ai-mock` |
| 3 | `ai-anthropic` | The provider, plus the allowed-list and model-selection surface (§9.5) proven against mock-plus-Anthropic |
| 4 | Transport and shared tool modules | HTTP/SSE turn path, WebSocket namespace, module serving, hashing, manifest, and pinning |
| 5 | Chat panel and `hello-ai` | `jPulse.ai.panel` on W-220, the adapter contract, and the demo view |
| 6 | Propose and apply | Proposal records, apply and undo endpoints, card chrome, the false-claim guard |
| 7 | Attachments | Sources, `UrlFetch`-based ingest, document conversion, image staging and vision |

Sub-items 1 through 3 are the "first release" referred to throughout: server
core, a real provider, and a mock. Sub-item 5 completes the §1.1 experience.
`ai-mcp-server` slots in any time after sub-item 1, which is the whole point of
drawing the layer boundary first (§5.2).

Sub-item 5 is validated against `hello-ai` and deliberately **not** against the
reference site. An adapter contract proven only against the application it was
extracted from is not a contract.


---

## 22. Deliverables

Sketch only; each sub-item carries its own list.

### 22.1 Plugin files — where essentially all the code lives

Everything client-side ships from inside the plugin, not from `webapp/`. W-098
append mode concatenates framework, site, and plugin copies of any `.js` or
`.css` under `view/`, so a plugin's `jpulse-common.js` extends the client
namespace with no framework involvement.

- `plugins/ai-core/plugin.json` — manifest, `autoEnable`, config schema pointer
- `plugins/ai-core/webapp/controller/` — `static hookDefinitions` for the hook
  catalog (§16), `api*` methods for the routes, `static async initialize()` for
  `global.AiCore` and the config tab
- `plugins/ai-core/webapp/{tools,agent,transport}/` — the three layers as
  separate directories with the import boundary scan-enforced (§5.2)
- `plugins/ai-core/webapp/model/` — `aiThreads`, `aiTurns`, `aiUsage` (§9.7)
- `plugins/ai-core/webapp/view/jpulse-common.js` — the `jPulse.ai` namespace:
  panel, transport, tool-module loader
- `plugins/ai-core/webapp/view/jpulse-common.css` — `jp-ai-*` chat classes over
  W-220's `jp-float-panel-*`
- `plugins/ai-core/webapp/view/jpulse-navigation.js` — the `hello-ai` nav entry
- `plugins/ai-core/webapp/view/admin/` — the usage page (§17)
- `plugins/ai-core/webapp/view/hello-ai/` plus
  `plugins/ai-core/webapp/ai-tools/` — the demo, shipped **inside the plugin**
  rather than in the site template. The feature is complex enough that
  onboarding needs something that runs, and in the plugin it is installable
  into an existing site for evaluation, arrives and updates with the code it
  demonstrates, and needs no site-template regeneration. `hello-world` is the
  precedent: it already ships `webapp/view/hello-plugin/index.shtml` and its
  own `jpulse-navigation.js` and `jpulse-common.css` from inside a plugin. It
  runs on `ai-mock`, so it works before any API key exists — which also makes
  it the fastest smoke test that an install succeeded
- `plugins/ai-mock/` — bundled with `ai-core` (§5.1)
- `plugins/ai-anthropic/` — separate package
- bundle packaging metadata, and the W-221 CLI and `PluginManager` change

### 22.2 Framework files that change

Checked against the code rather than assumed. **Exactly one framework source
file needs a change, and it is not AI-specific:**

- `webapp/utils/i18n.js` — `loadTranslations()` reads a single directory,
  `join(config.system.appDir, 'translations')`, and exits if it is missing.
  There is no site or plugin merge, no plugin in the repo has a `translations/`
  directory, and `hello-world` sidesteps the question by hardcoding English. A
  chat panel is heavy on UI text, so `ai-core` either gets plugin translations
  or ships untranslatable strings. The fix is to collect and merge `*.conf`
  from framework, site, and active plugins, the way
  `PathResolver.collectAllFiles()` already does for view assets — a **general
  plugin capability that belongs with W-221**, not inside `ai-core`. Merge
  order follows the file-resolution priority, so a site can override a
  plugin's string
- docs, listed in §22.3

Everything else `ai-core` needs already exists, which is the useful half of
this answer:

| `ai-core` needs | Already provided by |
|---|---|
| Client JS/CSS appended to `jpulse-common.*` | W-098 append mode, `view.js` `collectAllFiles()` |
| Views, navigation, static assets from a plugin | `PathResolver.resolveModuleWithPlugins()`; `hello-world` precedent |
| `/api/1/ai/*` routes | `SiteControllerRegistry` scans plugin controller dirs and auto-registers `api*` methods |
| Its own hooks, owned and introspectable | `static hookDefinitions` (W-209); `HookManager` gains no AI strings |
| An admin config tab | `ConfigModel.extendSchema()`, which `bootstrap.js` documents as callable by plugins |
| A per-thread WebSocket namespace | `WebSocketController.createNamespace()`, public and already supporting `:param` pattern namespaces |
| Correct load order ahead of provider plugins | `resolveLoadOrder()` topological sort (§5.1.1) |
| Guest/anonymous-safe turn leases | existing `RedisManager` lease, used unchanged |

### 22.3 Documentation

- `docs/ai-agent.md` — the guide, opening with §1.1's simple case and keeping
  the same order as this document: the tool descriptor, the two hosts, shared
  tool modules, the adapter contract, quota, and writing a provider plugin
- `docs/plugins/` entries for `ai-core`, `ai-mock`, and `ai-anthropic`;
  `docs/.markdown` publish list and sidebar
- cross-links from `docs/hooks.md` (the new hook owner),
  `docs/genai-instructions.md`, `docs/security-and-auth.md`, and
  `docs/url-fetch.md`


---

## 23. Open Questions

Four remain. Tool-data caching (§8.2), the merged-data case (§8.1),
`hello-ai`'s home (§22), and bundle granularity (§5.1) were also open and are
now decided.

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
3. **Per-scope versus per-site tool policy.** The admin enables tools
   site-wide, and the reference site gates writes per map. Should
   `onAiScopeResolve` be able to narrow the *tool list* as well as the
   capability, or is capability enough?
4. **Thread scope granularity.** One active thread per `(scope, user)` matches
   the reference site. Does a site need several concurrent threads on one
   scope, and if so does the unique index become advisory?
