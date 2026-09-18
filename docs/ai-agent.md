# jPulse Docs / AI Agent v2.0.4

A jPulse site gets an **agent** by installing plugins and registering tools — not by building a chat stack. The agent is scoped to one object on the page (a document, a ticket, a map). It can read and write that object through tools the site owns. The floating **chat panel** is the UI, not the product.

This page is orientation. The versioned contract lives with the plugin: [AI Core](installed-plugins/ai-core/README.md). For writing jPulse *with* an AI coding assistant, see [Generative AI Development](genai-development.md) instead.

Live demo with no API key: [`/hello-ai/`](/hello-ai/).

## What is possible

| Capability | What the user sees |
|---|---|
| Read and write site content | Tools the site registers. Authorization is the site's (`scope:read` / `scope:write`) |
| Client-host tools | Work that must stay in the tab (a scratch pad, a selection). Transport upgrades to WebSocket only when one of these is offered |
| Propose and apply | A tool can return a proposal instead of writing. Apply / Undo sit on a card. Use a direct write when the user is watching and can undo by hand |
| Attachments | Drop or paste a file, a URL, or an image. The model sees a manifest and reads through tools — source text is not dumped into the prompt |
| Mock provider | `ai-mock` answers without an API key, including a vision row for the image gate |
| Quota and usage | Per-subject caps on Site Configuration → AI. Usage is Admin → AI usage |

A PDF drop needs a converter plugin on the framework `onDocumentConvert*` hooks. None ships in the bundle; a bare install refuses the type and names what to install. See [Hooks](hooks.md#document-conversion-and-preview-hooks). Images need Redis; without it the panel hides the image affordance rather than failing at paste time.

There is no agent-callable web fetch. A URL in the compose box offers to ingest it *before* the turn. That path uses [URL Fetch](url-fetch.md).

## Install

Requires jPulse Framework >= 2.0.3.

```bash
npx jpulse plugin install @jpulse-net/plugin-ai-core
npx jpulse plugin install @jpulse-net/plugin-ai-anthropic
```

The first package is a bundle: it installs `ai-core` and `ai-mock`. Both have `autoEnable: true`. The second is the Anthropic provider (API key required for live models).

See [Managing Plugins](plugins/managing-plugins.md) for enable, disable, and update.

## Configure

1. **Site Configuration → AI** — master switch, allowed roles, default and allowed models, quota, loop limits, tool policy, retention, site instructions, the false-claim phrase list, and the source / URL / image caps.
2. **Admin → Plugins → ai-anthropic** — API key (password field), endpoint, timeout. Use Verify after saving.
3. **Admin → Plugins → ai-core** — debug dumps only. Leave them off.
4. **Live probe** — [`/jpulse-plugins/ai-core.shtml`](/jpulse-plugins/ai-core.shtml) shows which transport, models, and tools the site actually has.

An empty `defaultModel` uses the first model of `defaultProvider`. With only the bundle installed, that is the mock.

## The simple case

One site controller is the entire server side:

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

The namespace is `jPulse.ai`, not `jPulse.plugins.aiCore`. Until you register a client-host tool, the panel stays on HTTP. Cancel is `POST /api/1/ai/thread/:id/cancel`.

Open [`/hello-ai/`](/hello-ai/) for the scratch-pad demo (read, direct write, and propose/apply, no API key).

## Where to go next

| Topic | Where |
|---|---|
| Tool descriptor, adapter, propose/apply, attachments | [AI Core plugin guide](installed-plugins/ai-core/README.md) |
| `onAi*` hooks the agent plugin defines | Admin → Plugins → Hooks, and the plugin guide |
| Document convert and preview hooks (framework-owned, not AI) | [Hooks](hooks.md#document-conversion-and-preview-hooks) |
| URL ingest primitive | [URL Fetch](url-fetch.md) |
| Chat panel chrome | [UI Widget Reference](jpulse-ui-reference.md) (`jPulse.UI.floatPanel`) |
| Install / enable / update | [Managing Plugins](plugins/managing-plugins.md) |
