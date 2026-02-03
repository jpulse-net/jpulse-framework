# W-149: WebSocket Demo and CRUD Operations

## Status
- **Phase 1:** Complete (async onMessage + docs two-pattern)
- **Phase 2:** Complete (WS-CRUD demo: Sticky Notes, Redis store)
- **Phase 3:** Complete (hello-websocket overview, architecture, code-examples updated)

## Overview

Teach that WebSockets can be used in two distinct ways: (A) REST for CRUD with WebSocket for notifications so all views stay in sync, and (B) WebSocket for CRUD operations (e.g. collaborative canvas where updates are saved in real time on the server). Enhance the framework to support async `onMessage` handlers, document both patterns in `docs/websockets.md`, and add a new hello-websocket demo page that demonstrates WS-for-CRUD with a simple collaborative example (e.g. sticky notes or dots on a canvas).

## Objectives

1. **Document two usage patterns** — REST for CRUD + WS for sync vs WS for CRUD — with comparison table and "when to use which" guidance.
2. **Framework enhancement** — Support async `onMessage`: await handler when it returns a Promise; on rejection, send error to client (same format as sync throws).
3. **New demo** — One hello-websocket page/tab that demonstrates WS-for-CRUD: client sends create/update/delete over WebSocket; server persists and broadcasts; all clients see changes in real time.
4. **Consistency** — Update existing doc and hello-websocket overview, architecture, and code-examples to describe both patterns and link to the new demo.

---

## Detailed Specification

### 1. Two WebSocket Usage Patterns

#### Pattern A: REST for CRUD, WebSocket for notifications (sync all views)

- **Flow:** Client performs CRUD via REST (POST/PUT/DELETE). Server validates, persists, returns response, then **broadcasts** a notification over WebSocket (`entity-created`, `entity-updated`, `entity-deleted`). All connected clients (including the actor) update their views from that broadcast.
- **Use when:** Single source of truth (REST + DB), strong validation and error handling, and clients that may work without WebSocket (e.g. mobile app, scripts). WebSocket’s job is **notify** so every view stays in sync.
- **Example:** Existing collaborative todo (REST API + WS broadcasts). No change to behavior; doc and labels clarify this as Pattern A.

#### Pattern B: WebSocket for CRUD (real-time collaborative mutations)

- **Flow:** Client sends CRUD **actions** over WebSocket (e.g. `{ type: 'item-create', data }`, `{ type: 'item-update', id, data }`, `{ type: 'item-delete', id }`). Server validates, persists (via Redis store or model), and **broadcasts the outcome** to all clients (including sender). No REST for these mutations.
- **Use when:** Collaborative feel (e.g. shared canvas, live editor) where every small change is sent and saved in real time; WebSocket is the primary way to mutate and sync.
- **Example:** New demo (e.g. collaborative sticky notes or dots on a canvas).

#### Comparison (for docs)

| Aspect | Pattern A: REST + WS sync | Pattern B: WS for CRUD |
|--------|---------------------------|-------------------------|
| Who does the mutation? | REST endpoint | WebSocket handler (onMessage) |
| Persistence | REST handler writes to DB | WS handler (or code it calls) writes to DB |
| Sync to other clients | Broadcast after REST success | Broadcast after WS handler success |
| Best for | Forms, lists, "submit then sync" | Canvas, live collaboration, "edit in real time" |

---

### 2. Async onMessage (Framework Enhancement)

**Current behavior:** `webapp/controller/websocket.js` calls `namespace.onMessage(clientId, message, user)` without awaiting. Only **synchronous** throws are caught and sent back to the client. If the handler is async and does `await Model.create(...)`, a rejection (or throw after first await) is **not** caught and the client gets no error response.

**Enhancement:** In `_onMessage`:

1. Call `const result = namespace.onMessage(clientId, message, user);`
2. If `result != null && typeof result.then === 'function'`, then `await result`. If the Promise rejects, catch and send error to client using the same format as for sync throws (`_formatMessage(false, null, error.message, 500)` and `client.ws.send(JSON.stringify(errorMsg))`).
3. Document in `docs/websockets.md` that `onMessage` may be async; errors (sync throw or async rejection) are sent back to the client.

**Benefits:** CRUD-over-WS handlers can use async models (MongoDB, etc.) without wrapping in an async IIFE and try/catch; one place (framework) ensures errors are reported to the client; better DX and reliability.

**Scope:** Change only inside `_onMessage`; `_onMessage` must become async (or use a fire-and-forget then/catch on the Promise). If we await, we need to ensure the caller of `_onMessage` (the `ws.on('message', ...)` callback) can handle async — e.g. pass an async callback or use `void this._onMessage(...)` so the callback does not need to be async. Preferred: make `_onMessage` async and in the message handler do `void this._onMessage(...)` so we don’t leave unhandled rejections.

---

### 3. WS-for-CRUD Demo: Sticky Notes

**Choice:** Collaborative sticky notes on a canvas — add, move, edit text, delete. Clear CRUD and "collaborative canvas" feel.

**Namespace:** e.g. `/api/1/ws/hello-notes`.

**Message contract (client → server):**

- `note-create`: `{ type: 'note-create', x, y, text?, color? }` — server generates id, stores, broadcasts `note-created`.
- `note-update`: `{ type: 'note-update', id, x?, y?, text?, color? }` — server updates, broadcasts `note-updated`.
- `note-delete`: `{ type: 'note-delete', id }` — server removes, broadcasts `note-deleted`.

**Message contract (server → client):**

- `note-created`: `{ type: 'note-created', note, username }` — note = `{ id, x, y, text, color, createdAt, createdBy }`.
- `note-updated`: `{ type: 'note-updated', note, username }`.
- `note-deleted`: `{ type: 'note-deleted', noteId, username }`.

**Persistence / store backend:** jPulse does not run without Redis, so **assume Redis exists**. Use **Redis store only** for the demo — no in-memory fallback. Simplifies implementation and keeps educational focus: shared state via Redis so the demo works on PM2 cluster and multi-server. All workers read/write the same state via `RedisManager.cacheGetObject` / `cacheSetObject` (e.g. path `controller:hello-websocket:notes`, key `list` for full notes array, or one key per note id).

Schema per note: `id`, `x`, `y`, `text`, `color`, `createdAt`, `createdBy` (username). On connect, server sends `notes-init` with full list from Redis so new clients get state. In code, add comments where a MongoDB (or other) model could plug in for long-term persistence if desired.

**Hand-off (document in docs and code):** In `onMessage`, branch on `data.type`; call Redis store (getAll(), create(note), update(id, data), delete(id)); then `wsHandle.broadcast(...)`.

**Client: Vue vs canvas.** Hello-websocket is an SPA with components as templates (Vue). **Use Vue for the sticky-notes demo** — same stack as the rest of the demo (Emoji, Todo, Code Examples, Architecture), so one mental model: all tabs are Vue components. Vue’s reactive data fits WS messages well (push note-created/updated/deleted → update array/object → UI updates). Educational value: developers learn "WS for CRUD" in the same Vue/SPA context they already use in this demo; no extra concept (raw canvas API). A simple canvas (no Vue) would work but would be the only non-Vue tab and would dilute the "SPA + WebSocket" story. **Recommendation:** Vue component with a div "canvas" (position: relative) and absolute-positioned note elements; click to add, drag to move, inline edit text, button to delete; connect to `/api/1/ws/hello-notes`, send create/update/delete, handle `note-created` / `note-updated` / `note-deleted` to update local state.

---

### 4. Documentation Updates

**docs/websockets.md:**

- **Overview:** Add "Realtime CRUD sync (Pattern A)" and "WebSocket for CRUD (Pattern B)" as explicit use cases; one-line each.
- **New section:** "Two ways to use WebSocket" — Pattern A (REST for CRUD + WS for sync), Pattern B (WS for CRUD). Include comparison table and "When to use which" (forms/lists vs canvas/collaboration).
- **Pattern B subsection:** Describe flow (client sends action over WS → server validates, persists, broadcasts). Link to new demo. Optional: short code sketch (onMessage branches, calls store/model, broadcast).
- **Async onMessage:** In "Server-Side API" or "Registering Namespaces", state that `onMessage` may be async; if it returns a Promise, the framework awaits it and sends errors to the client on rejection.
- **Examples section:** Update "Hello WebSocket Demo" to list three demos: Emoji Cursor, Collaborative Todo (Pattern A), Sticky Notes / Canvas CRUD (Pattern B).

**Hello-websocket views/templates:**

- **Overview:** Describe two patterns; add third demo (Sticky notes / WS-for-CRUD).
- **Architecture:** Add Pattern B (WS for CRUD) flow; optionally show note-create → store → broadcast.
- **Code examples:** Add server and client snippets for WS-for-CRUD (onMessage with create/update/delete, broadcast; client send and onMessage for note-created/updated/deleted).

---

### 5. Hello-WebSocket App Structure (After Implementation)

- **Tabs/pages:** Overview | Emoji Cursor | Collaborative Todo (Pattern A) | Sticky Notes (Pattern B) | Code Examples | Architecture.
- **New tab:** "Sticky Notes" — same routing pattern as existing tabs; **new template** `site/webapp/view/hello-websocket/templates/sticky-notes-demo.tmpl` and namespace `/api/1/ws/hello-notes`. (Alternative filename: `notes-demo.tmpl`; prefer `sticky-notes-demo.tmpl` to match tab name.)
- **Controller:** Extend `site/webapp/controller/helloWebsocket.js` — register new namespace, **Redis notes store** only (no in-memory fallback; jPulse assumes Redis). onMessage branches for note-create/update/delete; call store then broadcast. Send full list on connect (`notes-init`) from Redis store.

---

## Implementation Plan

### Phase 1: Framework + Docs (two patterns + async)

**Goal:** Async onMessage support and documentation of both patterns without changing existing demo behavior.

1. **webapp/controller/websocket.js**
   - In `_onMessage`, after calling `namespace.onMessage(clientId, message, user)`, check if the return value is a thenable (Promise). If so, await it and in a catch block send error to client (same format as sync throw). Ensure the message event handler does not drop rejections (e.g. use `void this._onMessage(...)` if _onMessage is async).
   - Add unit test: async onMessage that rejects; expect client to receive error message.

2. **docs/websockets.md**
   - Add "Two ways to use WebSocket" section: Pattern A (REST for CRUD + WS for sync), Pattern B (WS for CRUD). Add comparison table and "When to use which."
   - In "Registering Namespaces" or "Server-Side API", document that `onMessage` may be async; framework awaits and sends errors on rejection.
   - Ensure existing "Hybrid REST + WebSocket" is explicitly labeled as Pattern A; add pointer to Pattern B section (to be demonstrated in new demo).

**Exit criteria:** Async handler works; doc clearly describes both patterns; existing tests pass.

---

### Phase 2: WS-for-CRUD Demo (sticky notes)

**Goal:** New hello-websocket tab and namespace with full WS-for-CRUD flow (create/update/delete over WS, **Redis store only**, broadcast).

1. **site/webapp/controller/helloWebsocket.js**
   - Add **Redis notes store** only (no in-memory fallback; jPulse assumes Redis). Use `RedisManager.cacheGetObject` / `cacheSetObject` for path e.g. `controller:hello-websocket:notes`, key `list` for full notes array (or one key per note id). Store API: getAll(), create(note), update(id, data), delete(id). Note shape: id, x, y, text, color, createdAt, createdBy.
   - Register namespace `/api/1/ws/hello-notes` with onConnect (send `notes-init` with getAll()), onMessage (async: branch note-create / note-update / note-delete; call store; broadcast), onDisconnect (optional: broadcast user-left if needed).
   - Use async onMessage and store methods; broadcast note-created / note-updated / note-deleted with username.

2. **site/webapp/view/hello-websocket/**
   - Add new template **`sticky-notes-demo.tmpl`**: Vue component (same SPA pattern as emoji-demo, todo-demo) with a div "canvas" (position: relative), absolute-positioned notes, click to add, drag to move, inline edit text, delete button; connect to `/api/1/ws/hello-notes`, send create/update/delete, handle note-created/updated/deleted to update local state.
   - Update **`routing.tmpl`**: add route and component for new tab "Sticky Notes" (e.g. hash `sticky-notes`, component from sticky-notes-demo.tmpl).
   - Add minimal styles for notes (position, drag, input) in index.shtml or in-component styles (local-*).

3. **Store backend**
   - Redis only. Comment in code where a MongoDB (or other) model could plug in for long-term persistence if desired.

**Exit criteria:** New tab works; multiple clients (and clients on different workers) see create/update/delete in real time; no REST for note mutations; notes-init returns correct full list from Redis store.

---

### Phase 3: Doc and Demo Polish

**Goal:** Overview, architecture, and code-examples consistently describe both patterns and link to the new demo.

1. **docs/websockets.md**
   - In "Examples" / "Hello WebSocket Demo", add third bullet: Sticky Notes (Pattern B — WS for CRUD). Add subsection for Pattern B with link to demo and short code sketch (onMessage → store → broadcast).
   - Ensure "Common Patterns" or equivalent lists Pattern A and Pattern B with one-line summary and link to demo.

2. **site/webapp/view/hello-websocket/templates/**
   - **overview.tmpl:** Add "Sticky Notes" as third demo; describe Pattern B (WS for CRUD); "When to use which" sentence.
   - **architecture.tmpl:** Add "Pattern B: WebSocket for CRUD" with flow (client sends action → onMessage → store → broadcast); optional code snippet.
   - **code-examples.tmpl:** Add "Pattern: WebSocket for CRUD" block — server onMessage (create/update/delete, broadcast) and client (send create/update/delete, onMessage note-created/updated/deleted).

3. **Cursor log / work-items**
   - Update W-149 deliverables in work-items.md to reflect completed paths (no file edits in this phase beyond docs and demo templates).

**Exit criteria:** Doc and demo are consistent; a new reader can understand both patterns and run both demos.

---

## Dependencies and Risks

- **Async _onMessage:** Call site of `_onMessage` is `ws.on('message', (data) => { this._onMessage(...); })`. Making `_onMessage` async and calling it with `void this._onMessage(...)` is sufficient; no need to make the listener async. Low risk.
- **Store backend:** jPulse does not run without Redis; assume Redis exists. Use **Redis store only** for notes — no in-memory fallback. Simplifies implementation and educational value: one shared store, works on PM2 cluster and multi-server.
- **No REST for notes:** Sticky-notes demo uses only WebSocket for mutations; contrasts clearly with todo demo (REST + WS).
- **Redis/multi-server:** Built into the framework. Sticky-notes namespace uses Redis for both broadcast and notes store — **in scope** for W-149.

---

## Out of Scope (W-149)

- Conflict resolution (last-write-wins per note is sufficient).
- Persistence of notes to MongoDB (Redis store is sufficient for demo; comments in code show where a model would go for long-term DB persistence).

---

## References

- Work item: `docs/dev/work-items.md` (W-149)
- Current WebSocket controller: `webapp/controller/websocket.js`
- Current demo: `site/webapp/controller/helloWebsocket.js`, `site/webapp/view/hello-websocket/`
- WebSocket docs: `docs/websockets.md`
