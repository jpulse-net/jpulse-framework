# W-155: WebSocket Dynamic Namespace Per Resource

## Status
- **Done** — Dynamic namespaces (one per resource) + WebSocket conn refactor (ctx-only identity). User-facing docs: [WebSocket Real-Time Communication](../../websockets.md) (dynamic namespaces, conn/ctx, onCreate, removeNamespace, reconnect, multi-instance).

## Overview

Enable one WebSocket namespace per resource (e.g. per mapId for bubblemap.net) so CRUD over WS is naturally scoped: only clients connected to that resource receive broadcasts. No app-level client→resourceId tracking; the namespace path encodes the resource.

W-155 also includes the **WebSocket conn refactor** (planned in W-154 as a follow-up): consolidate identity into **ctx** only so **conn** = `{ clientId, ctx }` (onMessage adds `message`); no `conn.user`. **ctx** = `{ username, ip, roles, firstName, lastName, initials, params }` built once at upgrade from session + request (no id; user operations are by username). **initials** from session user for convenience (e.g. avatar). **params** from path pattern (e.g. `{ mapId: '1234' }`) when using dynamic namespaces. Single source of truth for identity and logging; supports per-message authz via `conn.ctx.roles` without DB (e.g. map required roles from cache). See W-154 design doc for rationale; implementation is done as part of W-155.

## Reference

- **User-facing documentation:** [WebSocket Real-Time Communication](../../websockets.md) — dynamic namespaces (path patterns, onCreate, removeNamespace), conn/ctx API, reconnect and missed updates, multi-instance room count.
- **Full use case and comparison:** W-154 design doc, section [Use case: Bubblemap (per-map CRUD over WS)](W-154-websocket-namespace-as-object.md#use-case-bubblemap-per-map-crud-over-ws) (Option 1 vs Option 2, scalability, performance).
- **Framework (post W-155):** Handlers receive **conn** = `{ clientId, ctx }` (onMessage adds `message`); no `conn.user`. Dynamic namespaces via path pattern (e.g. `/api/1/ws/hello-rooms/:roomName`) with lazy get-or-create and `onCreate`.

## Approach

### Option 2a — Pre-create (literal paths, no framework change)
- When user opens the resource (e.g. REST "get bubbles by mapId"), app ensures namespace exists with literal path: `if (!WebSocketController.namespaces.has(path)) createNamespace(\`/api/1/ws/bubblemap/${mapId}\`, options)`.
- Client connects to `jPulse.ws.connect(\`/api/1/ws/bubblemap/${mapId}\`)`. Message shape: `{ type, data }` (e.g. bubble-create, bubble-update, bubble-delete); mapId implied by path.
- Shared handler logic: one factory that returns onConnect/onMessage/onDisconnect keyed by mapId; same CRUD and authz for every map namespace.
- Namespaces are literal: `/api/1/ws/bubblemap/1234`, `/api/1/ws/bubblemap/5678`, etc. — no pattern expansion at creation.
- **Multi-instance:** Requires sticky sessions (session affinity) so REST "get bubbles" and WS upgrade hit the same instance (otherwise the upgrade can go to an instance that didn't run the REST handler and doesn't have the namespace).

### Option 2b — Lazy get-or-create (pattern-based framework extension)
- App registers a path pattern (e.g. `/api/1/ws/bubblemap/:mapId`) with `createNamespace(pattern, options)` where `options` includes `onCreate` hook.
- On first connect to a path matching the pattern (e.g. `/api/1/ws/bubblemap/1234`), framework:
  1. Extracts params (`:mapId` → `1234`).
  2. Calls `onCreate(req, ctx)` where `ctx` has `params: { mapId: '1234' }` (plus user fields from session, ip from request).
  3. If `onCreate` returns updated `ctx` (or the same ctx), creates the namespace and completes the upgrade. If `onCreate` returns `null`, rejects the connection (destroys socket with close code).
- Pattern matching: simple regex (convert Express-style `:param` to regex capture groups); no lib dependency.
- Namespace created lazily on first connect; no need to call createNamespace in REST handler.
- **Multi-instance:** No sticky sessions required. Whichever instance receives the upgrade creates the namespace for that path.
- **Where it runs / no Redis coordination:** Get-or-create is **local to the instance** that receives the WebSocket upgrade. Each instance keeps its own `namespaces` Map and creates a namespace only when that instance sees an upgrade for a matching path. Redis is used only for **broadcasting messages** (pub/sub) so instances can deliver to their local clients; Redis does not store or sync namespace existence.

**Pub/sub between instances is stateless:** Redis does not store who is connected or which instances have which namespaces. It only delivers **messages** (e.g. "here is a payload for namespace X"). Each instance that receives the message uses its **local** state (do I have that namespace? which clients are in it?) to decide whether and to whom to send. No shared connection or namespace state in Redis.

## ctx Structure

After W-155, **ctx** has flat structure (no nesting) and includes:

- **`username`** (string) — from `req.session.user.username` or `'(guest)'` or `'_system'` (for system broadcasts).
- **`ip`** (string) — from `CommonUtils.getLogContext(req)`.
- **`roles`** (array) — from `req.session.user.roles` or `[]`.
- **`firstName`** (string) — from `req.session.user.firstName` or `''`.
- **`lastName`** (string) — from `req.session.user.lastName` or `''`.
- **`initials`** (string) — from `req.session.user.initials` or `''`.
- **`params`** (object, optional) — extracted from path pattern (e.g. `{ mapId: '1234' }`) when using dynamic namespaces (2b). Empty `{}` or omitted for static namespaces (2a) and existing namespaces.

**Guest/unauthenticated:** All fields present; username = `''`; others = `''` or `[]` as appropriate.

**System (e.g. REST broadcast with no conn):** username = `'_system'`, others default.

## onCreate Hook (Option 2b)

**Signature:** `onCreate(req, ctx) => ctx | null`

- **Input:**
  - `req` — Express request object from the WebSocket upgrade (session available).
  - `ctx` — Context object built by framework with user fields (username, ip, roles, firstName, lastName, initials) and `params` (extracted from path pattern).
- **Output:**
  - Return `ctx` (or modified ctx) to accept the connection and create the namespace.
  - Return `null` to reject the connection (socket destroyed with close code; no namespace created).
- **Use cases:**
  - Validate resource access (e.g. check if user has permission to access this mapId by comparing `ctx.roles` vs cached map required roles).
  - Amend `ctx` with resource-specific data if needed (e.g. add `mapName` from a cache).
  - Log the connection attempt.

**Example:**

```javascript
const ns = WebSocketController.createNamespace('/api/1/ws/bubblemap/:mapId', {
    requireAuth: false, // set true if only authenticated users can connect
    onCreate: (req, ctx) => {
        const { mapId } = ctx.params;
        // Check map access: compare ctx.roles vs cached map roles
        const mapRoles = MapCache.getRequiredRoles(mapId);
        if (mapRoles && !ctx.roles.some(r => mapRoles.includes(r))) {
            return null; // reject
        }
        return ctx; // accept
    }
});
```

## Authz

- **Map-level (connect time):** Use `requireAuth` / `requireRoles` options (framework enforces before `onCreate`) or check in `onCreate` hook (e.g. compare `ctx.roles` vs cached map required roles). Return `null` from `onCreate` to reject.
- **Bubble-level (per-message):** In `onMessage`, check `conn.ctx.roles` vs cached bubble access (if needed). Send error response and return early if denied. No separate hook; app logic.

## removeNamespace API

**Static method:** `WebSocketController.removeNamespace(path, options)`

- **`path`** (string) — Namespace path to remove.
- **`options`** (object, optional):
  - `removeIfEmpty` (boolean, default `true`) — Only remove if no clients connected. If `false`, force remove (disconnect remaining clients).

**Instance method:** `namespace.removeIfEmpty()`

- Convenience: calls `WebSocketController.removeNamespace(this.path, { removeIfEmpty: true })`.
- Returns `true` if removed, `false` if not removed (clients still connected).

**Behavior:**

- If `removeIfEmpty: true` and clients remain, does nothing (returns false or logs).
- If `removeIfEmpty: false` or no clients, disconnects any remaining clients, removes namespace from `this.namespaces`, clears timers.

**Usage:**

- In `onDisconnect`: `if (namespace.getStats().clientCount === 0) namespace.removeIfEmpty();`
- When resource deleted: `WebSocketController.removeNamespace(path, { removeIfEmpty: false });`

## DoS / Rate Limiting

- Framework already has Redis-based rate limiting (configurable in `app.conf`).
- **W-155:** Review existing rate limit settings and document recommended values for WebSocket connections in `app.conf` comments or docs.
- **Tech debt:** Specific WS connection rate limit (e.g. per IP, per session) can be added later if needed; not required for MVP.

## Drop and resurrect (lifecycle)

Namespaces are **in-memory per process**; they are not persisted. So any "drop" is local to that instance, and "resurrect" is creating the namespace again when needed.

### When to drop (teardown)

| Scenario | Description | How | Priority |
|----------|-------------|-----|----------|
| **Last client disconnects** | No one is on this resource; free the namespace object and its `clients` Map. | In `onDisconnect`, if `namespace.clients.size === 0` after remove, call `namespace.removeIfEmpty()`. | Optional (saves a small amount of memory per empty namespace). |
| **Resource deleted** | Resource was deleted; no one should connect anymore. | App calls `removeNamespace(path, { removeIfEmpty: false })` after deleting the resource. | **Rare** — can be ignored in initial design; add when implementing resource delete. |
| **Inactivity timeout** | Empty namespace sitting around. | Timer or periodic job: if `clients.size === 0` and last activity > N ago, remove. Requires tracking last disconnect. | **Usually not needed** — see below. |
| **Process restart** | Server/PM2 restart. | All namespaces are dropped automatically (in-memory). No explicit "drop" step. | N/A |

**Drop on "no traffic" / inactivity?**
- **Long-lived idle tabs** (e.g. user leaves tab open over the weekend) are common. That means a namespace with one (or a few) connected clients, not "empty." So inactivity drop would only apply to **empty** namespaces (last client left).
- **Cost of keeping namespaces:** One namespace is a small object (path, options, `clients` Map, stats). One idle client is one socket + one ping timer (e.g. every 30s). Tens or low hundreds of namespaces, each with a few idle clients, are **not very resource-intensive** on the server.
- **Recommendation:** Do **not** implement inactivity-based drop (e.g. "remove namespace if zero clients for 30 min") unless profiling or scale (e.g. thousands of empty or idle namespaces) shows a need. Prefer simplicity: optional drop on "last client disconnects" is enough to reclaim memory when a resource goes unused; otherwise leave namespaces in place.

### When to resurrect (create again)

| Scenario | Description | How |
|----------|-------------|-----|
| **User opens resource (2a)** | User navigates to resource (page load or REST call). | App ensures namespace exists: `if (!namespaces.has(path)) createNamespace(path, …)`. Client then connects to that path. |
| **First connect (2b)** | Client connects to `/api/1/ws/bubblemap/:mapId` (or any matching path). | Upgrade handler matches path pattern, get-or-create namespace (create if missing), run onCreate, complete upgrade. Namespace is created on first connect. |
| **After process restart** | All namespaces were dropped. | Next "open resource" (2a) or first connect (2b) creates the namespace again. No persistence; resurrection is always "create when needed." |
| **After drop (last client left)** | Namespace was torn down to save memory. | Same as above: next open (2a) or next connect (2b) creates it again. |

### Multi-instance (stateless)

- Each instance has its **own** `namespaces` Map. There is no shared "namespace exists" state across instances.
- Drop on instance A does not affect instance B (B may never have had that namespace if no client for that resource hit B).
- Resurrection: whichever instance serves the next "open resource" (2a) or **next WebSocket connect** (2b) creates the namespace. So no cross-instance coordination for drop/resurrect; each instance creates and drops namespaces independently based on local traffic.

### Scenario: Client A (instance A), Client B (instance B), same mapId 123; B closes tab; A continues CRUD; B reopens map

| Step | What happens | Handled? |
|------|----------------|----------|
| **Both on map 123** | Instance A has namespace map123 with client A. Instance B has namespace map123 with client B. (Each instance created it when its client opened/connected.) | Yes. |
| **Client A does CRUD** | Instance A: handler runs, persist, broadcast. Local: client A gets it. Redis: instance A publishes. Instance B: receives Redis, `_localBroadcast(namespacePath, payload)` → sends to local clients in that namespace (client B). So B sees A's updates. | Yes. |
| **Client B closes tab** | Instance B: client B disconnects. Namespace map123 on B now has 0 clients; we may drop it (`removeIfEmpty`). Instance A unchanged (still has client A). | Yes. |
| **Client A continues CRUD** | Instance A: broadcast + Redis. Instance B: receives Redis, `_localBroadcast(path, payload)`. If B dropped the namespace, `namespaces.get(path)` is undefined → return early. No one on B to send to anyway. No crash. | Yes. |
| **Client B opens map 123 again** | B loads map page; page typically does REST "get resource" then `jPulse.ws.connect('/api/1/ws/bubblemap/123')`. **Problem with 2a:** `ensureNamespace(mapId)` runs on the instance that **serves the HTTP request** (e.g. GET bubbles). The **WebSocket upgrade** can be sent to a **different instance** by the load balancer. So: if GET hits instance A, only instance A has the namespace. If the WS upgrade for B then goes to instance B, instance B does not have the namespace → "Unknown namespace" → socket destroyed → **client B fails to connect.** | **2a: only if the same instance serves "open resource" and the WS upgrade** (e.g. sticky sessions). **2b: yes** — the instance that receives the upgrade get-or-creates the namespace, so it works regardless of which instance served the page. |

**So:** With **2a (pre-create only)**, the scenario is only handled properly if the load balancer uses **session affinity** (sticky sessions) so that client B's REST call and WS connect both hit the same instance. With **2b (get-or-create at upgrade)**, the instance that receives the WebSocket connect creates the namespace if missing, so client B reconnecting works no matter which instance serves the page or the upgrade. **Recommendation:** use **2b** for multi-instance (typical deployment); or use **2a + sticky sessions** and document that requirement.

## Reference App: Dynamic Rooms in /hello-websocket/

- **Name:** "Dynamic Rooms"
- **Namespace pattern:** `/api/1/ws/hello-rooms/:roomName`
- **Room select:** "Amsterdam", "Berlin", "Cairo" (or similar cities).
- **Features:** Join a room by name; send/receive messages in that room; users in other rooms don't see them.
- **Purpose:** Demonstrate dynamic namespace pattern (2b) with simple chat; no persistence, no complex authz.

## Message and CRUD Contract

- **Payload shape:** `{ type, data }` where `type` is app-defined string (e.g. `'bubble-create'`, `'bubble-update'`, `'bubble-delete'`, `'chat-message'`) and `data` is event-specific body.
- **Unknown types:** App-specific. **Recommended:** Log unknown type at debug level and send error response to client (e.g. `{ type: 'error', data: { error: 'Unknown message type' } }`), or ignore silently. Do not crash or disconnect.
- **CRUD types (example for bubblemap):**
  - `bubble-create` — data: `{ x, y, text, ... }`. Handler: validate, persist, broadcast `{ type: 'bubble-created', data: { bubble, username } }`.
  - `bubble-update` — data: `{ id, updates }`. Handler: validate, persist, broadcast `{ type: 'bubble-updated', data: { bubble, username } }`.
  - `bubble-delete` — data: `{ id }`. Handler: validate, delete, broadcast `{ type: 'bubble-deleted', data: { bubbleId, username } }`.

## Scope

- **In scope:**
  1. **WebSocket conn refactor:** **conn** = `{ clientId, ctx }` / `{ clientId, message, ctx }` only; **ctx** = `{ username, ip, roles, firstName, lastName, initials, params }` (no id); no `conn.user`; framework builds ctx once at upgrade, stores on client, passes in every handler; app handlers (helloWebsocket, appCluster, admin/test namespaces) and tests updated to use `conn.ctx` only.
  2. **Dynamic namespaces (2b):** Pattern matching (Express-style `:param`), `onCreate` hook, get-or-create at upgrade, `removeNamespace` / `removeIfEmpty` API.
  3. **Reference app:** "Dynamic Rooms" in `/hello-websocket/` (new button, new demo template).
  4. **Docs:** New "Dynamic Namespaces" section in `websockets.md` (pattern registration, onCreate, lifecycle, example).
  5. **Tests:** Low-hanging fruit unit tests (pattern match, param extraction, onCreate behavior, removeIfEmpty).
- **Out of scope:**
  - Generic "multi-tenant" API beyond the pattern + onCreate mechanism.
  - Bubblemap full app (reference app is simpler).
  - Inactivity-based teardown (only "last client left" optional drop).
  - Specific WS connection rate limit (use existing Redis rate limit; review/document as tech debt).

## Tech Debt (deferred to future work)

### 1. WebSocket Connection Rate Limiting

- **Current state:** Framework has Redis-based rate limiting (configurable in `app.conf`); applies to all requests including WebSocket upgrades.
- **Gap:** No specific WS connection rate limit (e.g. per IP, per session, separate from HTTP rate limit).
- **Recommendation:** Review existing `app.conf` rate limit settings and document recommended values for WebSocket connections in comments or docs. If profiling shows a need for separate WS connection limits (e.g. to prevent WS-specific DoS), add as optional feature in future work item (e.g. W-156).
- **Impact:** Low priority; existing rate limit is sufficient for MVP.

### 2. Message Replay on Reconnect (missed updates)

- **Current state:** Framework auto-reconnects with progressive backoff. Client knows when reconnected via `onStatusChange(status)`. No built-in replay of missed messages during outage.
- **Gap:** If client is disconnected briefly (e.g. network hiccup), missed updates are not replayed. Client sees stale state until user refreshes or new updates arrive.
- **Options for handling missed updates:**

#### Option A: No replay, rely on client refresh (current baseline)
- Client notices disconnect/reconnect via `onStatusChange`.
- On reconnect, client shows "reconnected" message; user can manually refresh or app auto-refreshes current view.
- **Pros:** Simplest; no framework or app support needed.
- **Cons:** User may see stale data; manual refresh required; poor UX for collaborative apps.
- **Use case:** Ephemeral content (e.g. chat, live status) where history doesn't matter.

#### Option B: State sync on reconnect via REST (recommended baseline)
- On reconnect, client does REST call to get full current state (e.g. GET `/api/1/bubblemap/:mapId`).
- Client compares with local state and updates (replace or merge).
- **Pros:** Simple; always correct; no buffer; no sequence tracking; works for any resource.
- **Cons:** REST overhead (one extra request per reconnect); user sees a "jump" (not individual updates); doesn't show "who did what" during outage.
- **Use case:** Resource-based apps where full state is manageable (e.g. bubblemap with ~500 nodes).
- **Implementation:** Document pattern in `websockets.md`; no framework changes.
- **Example:**
  ```javascript
  ws.onStatusChange((status, oldStatus) => {
      if (oldStatus === 'reconnecting' && status === 'connected') {
          // Refresh current state via REST
          fetch(`/api/1/bubblemap/${mapId}`)
              .then(r => r.json())
              .then(data => { bubbles = data.bubbles; render(); });
      }
  });
  ```

#### Option C: Keep last N messages in buffer (app-level)
- Framework provides no built-in replay.
- App (e.g. bubblemap handler) keeps its own buffer of recent CRUD events (e.g. last 100) in memory or Redis.
- On reconnect, client requests replay from app: `{ type: 'sync', since: timestamp }` or `{ type: 'sync', lastSeq: 12345 }`.
- App handler sends buffered messages.
- **Pros:** Flexibility; app controls buffer size, retention, format; shows individual updates and "who did what."
- **Cons:** Every app has to implement it; buffer memory (per namespace or global); timestamp/sequence management; what if buffer overflows (client offline too long)?
- **Use case:** Apps that need fine-grained change history (e.g. collaborative editing, audit trail).
- **Implementation:** App-specific; document pattern in `websockets.md` as optional advanced technique.

#### Option D: Message counter / sequence numbers + buffer (framework-level)
- Server maintains per-namespace sequence counter; each broadcast gets a sequence number.
- Server keeps last N messages in a circular buffer (in-memory per namespace or global Redis).
- Client tracks last received sequence.
- On reconnect, client sends `{ type: 'sync', since: lastSeq }` and server replays buffered messages.
- Framework handles sequence assignment, buffer management, and replay.
- **Pros:** Smooth UX; no missed updates; user sees "who did what" during outage; consistent across all apps.
- **Cons:** Framework complexity; memory (buffer per namespace or shared); sequence management; overflow handling (client offline too long → buffer wrapped); app must handle replay messages.
- **Use case:** Apps with frequent updates where missing changes is unacceptable (e.g. stock ticker, live collaboration).
- **Implementation:** New framework feature (opt-in per namespace); significant work (~3-5d); add as W-156 or W-157.
- **API sketch:**
  ```javascript
  // Server: opt-in per namespace
  const ns = WebSocketController.createNamespace('/api/1/ws/bubblemap/:mapId', {
      enableReplay: true,        // enable message buffer + sequence
      replayBufferSize: 100      // keep last 100 messages
  });

  // Client: request replay on reconnect
  ws.onStatusChange((status, oldStatus) => {
      if (oldStatus === 'reconnecting' && status === 'connected') {
          ws.send({ type: 'sync', since: lastReceivedSeq });
      }
  });

  // Client: handle replay messages (same as regular messages)
  ws.onMessage((msg) => {
      if (msg.success && msg.data.seq) {
          lastReceivedSeq = msg.data.seq;
          // process msg.data as usual
      }
  });
  ```

#### Option E: Operational transform / CRDT
- Track operations (not just state); resolve conflicts on reconnect.
- **Pros:** Handles concurrent edits correctly; eventual consistency.
- **Cons:** Very complex; requires OT/CRDT library; overkill for most use cases.
- **Use case:** Real-time collaborative editing (e.g. Google Docs-style).
- **Implementation:** Out of scope; recommend third-party lib if needed.

---

#### Recommendation for W-155

**Adopt Option B (REST state sync on reconnect) as baseline; defer Options C, D, E as tech debt.**

**Why:**
- **Option B is simple, correct, and sufficient for MVP** (including bubblemap and Dynamic Rooms reference app).
- No framework changes; just document the pattern.
- Reference app (Dynamic Rooms) doesn't need replay (ephemeral chat; Option A is fine).
- Bubblemap can use Option B (REST GET on reconnect to refresh all bubbles).
- **Options C (app-level buffer) and D (framework-level buffer)** can be added later as optional features if apps need them (e.g. for collaborative editing or audit trail).
- **Option E (OT/CRDT)** is out of scope; recommend third-party lib.

**W-155 deliverables:**
- Document Option B (REST state sync) in `websockets.md` new section "Handling Reconnect and Missed Updates" with example.
- Mention Options C, D as future work (tech debt) for apps that need fine-grained replay.

**Future work (e.g. W-156 or W-157):**
- Add Option D (framework-level message buffer + sequence numbers) as opt-in feature for namespaces that need it.
- Add Option C example/pattern in docs for apps that want app-level buffer without framework support.

## Implementation Plan

### Phase 1: WebSocket conn Refactor (~1 d)

**Objective:** Consolidate identity into **ctx** only; eliminate `conn.user`; support dynamic namespaces.

**Framework changes:**
1. **websocket.js `_completeUpgrade`:** Build **ctx** from session user + request:
   - `username` from `req.session.user.username` or `'(guest)'`
   - `ip` from `CommonUtils.getLogContext(req)`
   - `roles` from `req.session.user.roles` or `[]`
   - `firstName`, `lastName`, `initials` from `req.session.user` or `''`
   - `params` = `{}` (empty for now; populated in Phase 2 for dynamic namespaces)
   - Pass **ctx** to `_onConnection(ws, namespace, ctx, clientUUID)` (remove `user`, `username`, `ip` separate params)
2. **websocket.js `_onConnection`:** Store **ctx** on client: `client = { ws, ctx, lastPing, lastPong }` (no `user`, `username`). Build **conn** = `{ clientId, ctx }` for onConnect.
3. **websocket.js `_onMessage`:** Get **ctx** from `client.ctx`. Build **conn** = `{ clientId, message, ctx }` (no `user`).
4. **websocket.js `_onDisconnect`:** Get **ctx** from `client.ctx`. Build **conn** = `{ clientId, ctx }` (no `user`).
5. **websocket.js active-users loop:** Replace `client.user.username` with `client.ctx.username`.

**App changes:**
1. **helloWebsocket.js:** All handlers (emoji, todo, notes): destructure `({ clientId, ctx })` or `({ clientId, message, ctx })` (remove `user`). Use `ctx.username` (and `ctx.firstName`, `ctx.lastName` where applicable) instead of `user?.username`.
2. **appCluster.js:** Comments: `conn = { clientId, ctx }` / `{ clientId, message, ctx }` (no `user`).
3. **Admin/test namespaces:** Already use only `conn.ctx`; update comments if needed.

**Tests:**
1. **websocket.test.js:** Update all `_onConnection` calls to pass **ctx** instead of `(user, username, ip)`. Update assertions: `conn.ctx` shape, no `conn.user`.

**Docs:**
1. **websockets.md:** Update conn shape and examples: `conn = { clientId, ctx }` / `{ clientId, message, ctx }`; **ctx** = `{ username, ip, roles, firstName, lastName, initials, params }`. Update all handler examples to use `conn.ctx` only.
2. **site/webapp/view/hello-websocket/templates/code-examples.tmpl:** Update server examples: destructure `({ clientId, ctx })`, use `ctx.username`.
3. **site/webapp/view/hello-websocket/templates/architecture.tmpl:** Update conn shape text and code samples.

**Deliverables:**
- Framework: ctx-only identity in websocket.js
- App: helloWebsocket, appCluster use `conn.ctx` only
- Tests: websocket.test.js updated
- Docs: websockets.md, code-examples.tmpl, architecture.tmpl updated

---

### Phase 2: Dynamic Namespaces (2b) (~4–5 d)

**Objective:** Pattern matching, onCreate hook, get-or-create at upgrade, removeNamespace API.

**Framework changes:**
1. **Pattern storage:** Add `this.patterns = []` to WebSocketController (array of `{ regex, template, options }`).
2. **createNamespace enhancement:** If `path` contains `:param`, treat as pattern:
   - Convert to regex (Express-style `:param` → capture group).
   - Store in `patterns` array with template path and options (including `onCreate` if provided).
   - Do not create a static namespace yet (lazy).
   - If path is literal (no `:param`), create static namespace as before.
3. **_handleUpgrade pattern matching:**
   - First try exact match: `namespaces.get(pathname)`.
   - If not found, try pattern match: iterate `patterns`, test `pathname` against regex, extract params.
   - If pattern matches, check if namespace for this literal path already exists (e.g. `/api/1/ws/bubblemap/1234`). If yes, use it. If no, create it:
     - Build **ctx** from session user + request + `params` (extracted from regex match).
     - Call `onCreate(req, ctx)` if provided. If returns `null`, destroy socket (close code 1008 or 1003). If returns ctx, continue.
     - Call `createNamespace(literalPath, options)` (without onCreate; it's already run). Use same handlers as pattern (or call a factory if provided).
     - Store in `namespaces` for this literal path.
   - Complete upgrade with the namespace.
4. **removeNamespace API:**
   - Add `static removeNamespace(path, options = {})`: get namespace, check `options.removeIfEmpty` (default true); if true and clients remain, return false. Else disconnect clients, delete from `namespaces`, clear timers.
   - Add `namespace.removeIfEmpty()`: convenience method, calls `WebSocketController.removeNamespace(this.path, { removeIfEmpty: true })`.
5. **Guest/system ctx:** Ensure all ctx fields present with defaults when no session (username = `'(guest)'` or `''`, others = `''` or `[]`).

**Docs:**
1. **websockets.md:** New section "Dynamic Namespaces (Per-Resource Rooms)":
   - When to use (per-resource isolation, natural broadcast scoping).
   - Pattern registration: `createNamespace('/api/1/ws/resource/:id', { onCreate })`.
   - onCreate hook: signature, return ctx or null, example.
   - Lifecycle: lazy create, removeIfEmpty, resurrect on next connect.
   - Multi-instance: no sticky sessions required; each instance creates namespaces for its clients.
   - Example: bubblemap or dynamic rooms.
2. **websockets.md:** New section "Handling Reconnect and Missed Updates":
   - Framework auto-reconnects; client sees status change.
   - Baseline: On reconnect, do REST call to refresh state.
   - Example: `ws.onStatusChange((status, oldStatus) => { if (oldStatus === 'reconnecting' && status === 'connected') refreshState(); })`.
   - Advanced (future): message buffer + sequence numbers (tech debt).

**Tests:**
1. **Unit tests (websocket.test.js):**
   - Pattern matching: `:param` extraction, multiple params, no match.
   - onCreate: return ctx (accept), return null (reject).
   - removeNamespace: removeIfEmpty behavior (with/without clients).
   - Dynamic namespace creation: first connect, get-or-create, same path on different instances.
2. **Integration test (optional):** Create dynamic namespace, connect two clients with different resourceIds, broadcast, assert scoped delivery.

**Deliverables:**
- Framework: pattern matching, onCreate, get-or-create, removeNamespace API in websocket.js
- Docs: websockets.md new sections (Dynamic Namespaces, Reconnect/Missed Updates)
- Tests: pattern match, onCreate, removeIfEmpty unit tests

---

### Phase 3: Reference App "Dynamic Rooms" (~1.5–2 d)

**Objective:** Demo dynamic namespaces in /hello-websocket/ with simple multi-room chat.

**App:**
1. **site/webapp/controller/helloWebsocket.js:**
   - Register pattern: `createNamespace('/api/1/ws/hello-rooms/:roomName', { requireAuth: false, onCreate: (req, ctx) => { LogController.logInfo(ctx, 'helloWebsocket.rooms.onCreate', \`Room: \${ctx.params.roomName}\`); return ctx; } })`.
   - Handlers: `onConnect` log join, broadcast join message. `onMessage` relay chat message with username and roomName (from `ctx.params.roomName`). `onDisconnect` broadcast leave message, optionally `removeIfEmpty()`.
2. **site/webapp/view/hello-websocket/templates/rooms-demo.tmpl:**
   - Room select: dropdown with "Amsterdam", "Berlin", "Cairo".
   - On room change: disconnect old WS (if any), connect to new: `jPulse.ws.connect(\`/api/1/ws/hello-rooms/\${roomName}\`)`.
   - Message input and send: `ws.send({ type: 'chat', data: { text: input.value } })`.
   - Message display: `onMessage` appends `\${payload.username}: \${payload.text}` to chat log.
   - Connection status indicator.
3. **site/webapp/view/hello-websocket/index.shtml:**
   - Add "Dynamic Rooms" tab/button.

**Docs:**
1. **site/webapp/view/hello-websocket/templates/code-examples.tmpl:** Add "Dynamic Namespaces" example (pattern registration, onCreate, connect with param).

**Deliverables:**
- Reference app: Dynamic Rooms demo in /hello-websocket/
- Docs: code example in code-examples.tmpl

---

### Phase 4: Final Polish and Testing (~0.5–1 d)

**Objective:** End-to-end testing, doc review, edge cases.

**Tasks:**
1. Manual testing: Dynamic Rooms (join different rooms, send/receive, reconnect, removeIfEmpty).
2. Manual testing: helloWebsocket demos still work after conn refactor (emoji, todo, notes).
3. Manual testing: Multi-instance (if feasible): start two instances, connect to same room from different instances, broadcast, assert both clients receive.
4. Review all docs (websockets.md, design docs, work-items) for consistency.
5. Check linter, run unit tests, fix any issues.

**Deliverables:**
- All demos working
- All tests passing
- Docs consistent

---

## Effort Summary

| Phase | Work | Days |
|-------|------|------|
| **Phase 1: conn refactor** | Framework ctx build; app handlers; tests; docs | **~1 d** |
| **Phase 2: Dynamic namespaces (2b)** | Framework pattern match, onCreate, removeNamespace; docs (new sections); tests | **~4–5 d** |
| **Phase 3: Reference app** | Dynamic Rooms in /hello-websocket/; code example | **~1.5–2 d** |
| **Phase 4: Final polish** | Manual testing, doc review, edge cases | **~0.5–1 d** |
| **Total** | | **~7–9 d (small–medium)** |

See work-items.md W-155 for detailed deliverables.
