# W-154: WebSocket Namespace as Object (conn param, ctx for logging)

## Status
- **Phase 1:** Done — Log context (req or plain object), WebSocket client `ctx`, bootstrap order fix
- **Phase 2:** Done — Namespace as object (`createNamespace`), single `conn` param, `{ type, data }` payload, single-param client `onMessage(msg)`
- **Phase 3 (planned):** Payload `{ type, data, ctx }` with mandatory top-level ctx; `broadcast(data, ctx)`; Redis pub/sub aligned; broadcast log context from payload

**Note:** A follow-up to consolidate identity into **ctx** only (conn = `{ clientId, ctx }`, no `conn.user`; ctx = `{ username, ip, roles, firstName, lastName, initials }` — no id, user operations by username; initials for convenience) is planned as part of **W-155** (dynamic namespace), not as a separate W-154 phase.

## Overview

W-154 improves the WebSocket API and logging in two phases (done) and a third (planned): (1) LogController and WebSocket use a consistent context (Express `req` or plain `{ username?, ip? }`), and each WebSocket client has a `ctx` used for client-scoped log calls; (2) the WebSocket namespace is created via `createNamespace(path, options?)`, with handlers receiving a single `conn` and a consistent message payload; (3) app payload becomes `{ type, data, ctx }` with **ctx mandatory** at top level (default `{ username: '', ip: '0.0.0.0' }`), and `broadcast(data, ctx)` / `sendToClient(clientId, data, ctx)` so ctx flows in the payload—enabling correct broadcast logging and Redis relay. Client-side `onMessage` receives wire `{ success, data?, error?, code? }`; app payload in `msg.data` includes `ctx` for use in the browser when needed.

## Objectives (from work-items)

1. **LogController accepts Express req or context object** — WebSocket captures username and IP per client for logging.
2. **WebSocket API: namespace as object** — `createNamespace`, handlers receive single `conn` param; config at creation; optional chaining.
3. **Payload and broadcast (phase 3)** — Mandatory top-level `ctx` in every message; single level only; broadcast/sendToClient take `ctx`; Redis and logging use payload.ctx.

## What Was Accomplished

### Phase 1 — Log context and WebSocket ctx

- **`webapp/utils/common.js`**
  - `getLogContext(reqOrContext)` — accepts Express `req` or plain `{ username?, ip? }`. If the object has no Express shape (no `session`/`headers`), it is treated as context; otherwise request-based extraction is used.
  - `formatLogMessage(..., reqOrContext)` — passes through to `getLogContext(reqOrContext)`.

- **`webapp/controller/websocket.js`**
  - In `_completeUpgrade`, IP is read at call time via `global.CommonUtils?.getLogContext(request)` (with fallback to socket/connection) and passed to `_onConnection(..., ip)`.
  - Each client has `ctx = { username, ip }`. All client-scoped `LogController` calls use this `ctx`.

- **`webapp/utils/bootstrap.js`**
  - **Bootstrap order:** `global.CommonUtils = CommonUtils` is set in **Step 2** (right after appConfig), before LogController and before controllers that load WebSocket (e.g. appCluster in Step 10). This fixes `Cannot read properties of undefined (reading 'getLogContext')` during WebSocket upgrade.

### Phase 2 — Namespace as object, conn param, payload and client API

- **`webapp/controller/websocket.js`**
  - **`WebSocketNamespace` class** — `path`, `requireAuth`, `requireRoles`, `_onConnect`/`_onMessage`/`_onDisconnect`, `clients`, `stats`. Methods: `onConnect(fn)`, `onMessage(fn)`, `onDisconnect(fn)` (return `this`), `broadcast(data, fromUsername)` (phase 3: `broadcast(data, ctx)`), `sendToClient(clientId, data, fromUsername)` (phase 3: `sendToClient(clientId, data, ctx)`), `getStats()`.
  - **`createNamespace(path, options?)`** — Replaces `registerNamespace`; returns the namespace instance.
  - **Handlers:** `_onConnection` calls `namespace._onConnect(conn)` with `conn = { clientId, user, ctx }`. `_onMessage` uses `conn = { clientId, message, user, ctx }` and supports async. `_onDisconnect` uses `conn = { clientId, user, ctx }`.
  - Stats use `clientCount` from `clients.size`.

- **Message payload convention (current: phase 2)**
  - App payload: **`{ type, data }`** (`data` = event-specific body). Framework adds `username`. Wire envelope: `{ success, data?, error?, code? }`; app payload is inside `data`.
  - **Phase 3 (planned):** App payload **`{ type, data, ctx }`** with **ctx mandatory** at top level only. Default ctx when none supplied: `{ username: '', ip: '0.0.0.0' }`. No duplicate ctx inside `data`. Client receives `msg.data.ctx` in the browser when needed.

- **`webapp/controller/appCluster.js`**
  - Uses `createNamespace` and `(conn) => ...`. All logging uses `conn.ctx`. All sent messages use `{ type, data: { ... } }`.

- **`site/webapp/controller/helloWebsocket.js`**
  - Emoji, todo, notes use `createNamespace` and chained handlers with destructuring `({ clientId, user, ctx })` / `({ clientId, message, user, ctx })`. All logging uses `ctx`; all sends use `{ type, data: { ... } }`.

- **Client `jPulse.ws` (`webapp/view/jpulse-common.js`)**
  - `onMessage` has a single argument: full wire `msg`. Pattern: `if (msg.success) use msg.data; else use msg.error`. Pong: `msg.success && msg.data?.type === 'pong'`. appCluster handler uses `msg.data` as payload.

- **Demos and admin**
  - Demo templates: `.onMessage((msg) => { if (msg.success) this.handleXxxMessage(msg.data); })`; handlers use `payload = msg.data ?? {}`. Admin pages use single `(msg)` and `msg.success`/`msg.data`/`msg.error`.

- **Docs and tests**
  - code-examples.tmpl, architecture.tmpl: createNamespace, conn destructuring, `{ type, data }`, client `onMessage((msg) => { if (msg.success) use msg.data; })`. websocket.test.js: createNamespace, conn shape, broadcast `{ type, data }`.

## API Summary

### Server (phase 2 current; phase 3 in parentheses)
- `WebSocketController.createNamespace(path, options?)` → `WebSocketNamespace`
- `ns.onConnect(fn).onMessage(fn).onDisconnect(fn)` — `fn(conn)`
- `conn`: onConnect/onDisconnect `{ clientId, user, ctx }`; onMessage `{ clientId, message, user, ctx }`
- `ctx` = `{ username?, ip? }` (phase 3: default `{ username: '', ip: '0.0.0.0' }` when system/no user)
- **Phase 2:** `ns.broadcast(data, fromUsername)`, `ns.sendToClient(clientId, data, fromUsername)` — payload has `username` added by framework.
- **Phase 3:** `ns.broadcast(data, ctx)`, `ns.sendToClient(clientId, data, ctx)` — payload is `{ ...data, ctx }`; ctx mandatory (framework supplies default if null). Handlers call e.g. `ns.broadcast({ type, data: {...} }, conn.ctx)`.

### Client
- `jPulse.ws.connect(path).onMessage((msg) => { ... })` — `msg` = `{ success, data?, error?, code? }`; app payload in `msg.data`. Phase 3: `msg.data.ctx` always present (top level).

### Phase 3: Redis pub/sub and appCluster
- **Namespace Redis relay:** Same payload shape `{ type, data, ctx }` is published to Redis (no envelope). Subscriber receives it and calls `_localBroadcast(namespacePath, payload)`. `_localBroadcast` uses `payload.ctx` for `LogController.logInfo` so initiator username/IP appear on all instances. No `namespace._currentConn`; ctx comes only from the payload.
- **appCluster relay:** Server sends WS messages in aligned format `{ type, data, ctx }` (e.g. type `'broadcast'`, data `{ channel, data, timestamp }`, ctx mandatory). **No change to `jPulse.appCluster.broadcast.*` public API:** `subscribe(channel, callback, options)` and `publish(channel, data)` unchanged; callback continues to receive the same application `data`; ctx is on the wire and available as `msg.data.ctx` if needed later.

### Redis caching (out of scope for mandatory ctx)
- Redis is also used for **caching** (cacheGet/cacheSet, cacheGetObject/cacheSetObject): key-value state, not messages. No immediate need for ctx; no change to cache API or stored value shape.
- **Consistency (optional):** If a caller ever wants to attach context to a cached object (e.g. "who last wrote"), they may store `{ data, ctx? }` so the payload is in `.data` and optional `ctx` uses the same shape `{ username?, ip? }`. This is a convention only; the framework does not require or wrap cache values.

## Use case: Bubblemap (per-map CRUD over WS)

App has maps (collections), each map has bubbles/nodes (collection). CRUD over WebSocket is per mapId. Framework today registers namespaces at app start; upgrade does **exact path lookup** (`namespaces.get(pathname)`), so the namespace must exist when the client connects.

### Option 1: Single namespace, mapId in every message
- **Shape:** One namespace (e.g. `/api/1/ws/bubblemap`). Every message includes `mapId` + CRUD action + data.
- **Server:** Single `createNamespace` at startup. Handler branches on `message.mapId` (and action); validates map access (authz) per message; broadcast only to clients on same map (would require tracking which client is on which map, or broadcasting to all and client filters by mapId).
- **Client:** `jPulse.ws.connect('/api/1/ws/bubblemap')`; `send({ type: 'bubble-create', mapId, data: { ... } })`; in `onMessage`, filter by `msg.data.mapId`.
- **Pros:** No framework change; one connection per app (or per tab); simple URL; no dynamic namespaces. Works with current “register at start” model.
- **Cons:** Server must validate mapId and optionally scope broadcast (e.g. only clients subscribed to that map). If broadcast is “all in namespace,” every client gets every map’s updates and must filter; if you scope by mapId you need a subscription model (e.g. client says “I’m on map X” and server tracks it). Slightly larger messages (mapId in every payload).

### Option 2: One namespace per map (dynamic), path based on mapId
- **Shape:** Namespace path per map, e.g. `/api/1/ws/bubblemap/:mapId`. Message has CRUD action + data only (mapId implied by namespace).
- **Server:** Namespace must **exist before** the client connects (upgrade does `namespaces.get(pathname)`). So either: (a) **get-or-create on first use** — when user opens a map (e.g. REST “open map” or page load), server ensures `createNamespace(\`/api/1/ws/bubblemap/${mapId}\`)` has been called; or (b) **framework extension** — support path pattern (e.g. `/api/1/ws/bubblemap/*`) and in upgrade resolve mapId from path, then get-or-create namespace and optionally validate map access before upgrade. Same handler logic for all map namespaces (e.g. shared onMessage that does bubble CRUD).
- **Client:** `jPulse.ws.connect(\`/api/1/ws/bubblemap/${mapId}\`)`; `send({ type: 'bubble-create', data: { ... } })`; no mapId in message. One connection per map (reconnect when switching maps).
- **Pros:** Clear isolation: only clients on that map are in the namespace; broadcast is naturally scoped; smaller messages; authz can be done once at connect (and optionally per message). Matches “one room per map” mental model.
- **Cons:** Many maps ⇒ many namespaces (and many connections if user has multiple maps open). Namespace lifecycle: when to create (on first open / on first connect) and whether to ever remove (e.g. when map deleted and no clients). Option 2b requires framework support for path-pattern or get-or-create in upgrade.

### Scalability (tens to hundreds of maps; ~500 nodes per map)
- **500 nodes per map:** Node data lives in your data layer (DB/Redis), not in the WebSocket layer. Each CRUD message carries one node (or a delta). So “500 nodes” does not change server WS memory for either option.
- **Option 1 — Single namespace**
  - **Memory:** One namespace, one `clients` Map. Memory = O(**connected clients**). To scope broadcast by map you keep e.g. `Map<mapId, Set<clientId>>` (or client→mapId); that is also O(clients). So total **O(clients)**, independent of total number of maps in the DB. Scales to hundreds of maps as long as concurrent connections are reasonable (e.g. tens/hundreds of clients).
  - **Broadcast scope:** If you **don’t** scope: one CRUD event → send to all clients in the namespace. With 100 maps and 5 users per map (500 clients), every bubble update goes to 500 clients (499 redundant). **Not scalable.** If you **do** scope (track client→mapId, send only to clients on that map): one CRUD event → O(clients on that map). Same as Option 2. **Scalable.**
  - **Redis:** One channel for the namespace. Every broadcast includes mapId; instances (and their local filter) send only to clients on that map. Subscription count = 1 pattern. Fine.
- **Option 2 — One namespace per map**
  - **Memory:** O(**active maps**) namespace objects (only maps with ≥1 connected client) + O(**clients**) client records. Namespace overhead is small (path, options, empty or small `clients` Map, stats). Tens or hundreds of active namespaces = small extra memory. Scales to hundreds of maps as long as “active” maps (someone has the map open) is in the tens/low hundreds.
  - **Broadcast scope:** Natural. Broadcast for map X goes only to that namespace’s clients. No subscription map; no filtering. One CRUD event → O(clients on that map).
  - **Redis:** One channel per namespace path (e.g. `controller:websocket:broadcast:api:1:ws:bubblemap:map123`). Pattern subscription `controller:websocket:broadcast:*` still one subscription; channel names vary. Message volume = one Redis message per CRUD event (same as Option 1). Fine.

### Performance
- **Per-CRUD event (e.g. one bubble update):** With proper scoping in Option 1, both options send to **the same set of clients** (those on that map). So **same O(clients on that map)** work and network. Option 2 avoids maintaining and looking up a client→mapId structure; Option 1 requires it. Small CPU advantage to Option 2 for broadcast path.
- **Message size:** Option 1 carries mapId in every message (small). Option 2 omits it. Negligible difference.
- **Connection count:** Same in both: one connection per tab/session. Option 2 reconnects when switching maps (new path); Option 1 can keep one connection and send mapId. So Option 1 can have slightly fewer reconnects if users switch maps often in the same tab.
- **Worst case (Option 1 unscoped):** If you broadcast every CRUD to all clients in the single namespace, CPU and network grow with (total clients × total CRUD events). With many maps and many clients, this is **not scalable**. So Option 1 **must** implement client→mapId scoping for parity with Option 2.

### Recommendation
- **Short term / no framework change:** Option 1 is enough: one namespace, mapId (and action + data) in each message; **must** scope broadcast (track client→mapId, send only to clients on that map). Then memory and per-event performance match Option 2.
- **If you want natural scoping and smaller messages:** Option 2 with **pre-create** (option 2a): when user navigates to a map (or first REST call for that map), ensure `createNamespace(\`/api/1/ws/bubblemap/${mapId}\`)` has run (e.g. from a bubblemap controller that loads the map); then client connects. No framework change. Option 2b (path-pattern get-or-create) is a possible future extension for “lazy” namespace creation on first connect.

## Phase 3 (planned) — Deliverables

- **Payload:** All app payloads `{ type, data, ctx }`; ctx mandatory at top level only; default ctx `{ username: '', ip: '0.0.0.0' }`.
- **API:** `broadcast(data, ctx)`, `sendToClient(clientId, data, ctx)`; framework normalizes null/undefined ctx to default.
- **websocket.js:** Build payload as `{ ...data, ctx }`; publish that same object to Redis; `_localBroadcast(namespacePath, payload)` uses `payload.ctx` for logging.
- **Call sites:** helloWebsocket, appCluster, internal namespaces: pass `conn.ctx` (or default) to broadcast/sendToClient.
- **Client/templates:** Handle `msg.data.ctx` where needed; demos and admin can ignore or use for display.
- **appCluster:** Relay message shape `{ type, data, ctx }`; no change to `jPulse.appCluster.broadcast.subscribe/publish` or callback signature.

### Phase 3 implementation checklist (pub/sub ctx)

1. **Default ctx:** Define `const DEFAULT_CTX = { username: '', ip: '0.0.0.0' }` (or equivalent); use whenever ctx is null/undefined.
2. **websocket.js**
   - `broadcast(namespacePath, data, ctx)`: normalize `ctx = ctx ?? DEFAULT_CTX`; build `payload = { ...data, ctx }`; `_localBroadcast(namespacePath, payload)`; publish `payload` to Redis (same object, no envelope).
   - `_localBroadcast(namespacePath, payload)`: use `payload.ctx` (or DEFAULT_CTX) as first arg to `LogController.logInfo`; log message can use `payload.ctx?.username ?? 'system'` for "from."
   - `sendToClient(clientId, namespacePath, data, ctx)`: same payload shape `{ ...data, ctx }` with normalized ctx.
   - Redis subscriber callback: already receives `data` (the published payload); call `_localBroadcast(namespacePath, data)` — no change to callback signature; publisher now sends payload with ctx.
   - WebSocketNamespace: `broadcast(data, ctx)`, `sendToClient(clientId, data, ctx)` delegate to controller with path.
3. **Call sites:** helloWebsocket, appCluster (handleConnect, handleMessage, handleDisconnect, relayToInterestedClients), _registerAdminStatsNamespace, _registerTestNamespace: pass `conn.ctx` or DEFAULT_CTX to every broadcast/sendToClient.
4. **appCluster relayToInterestedClients:** Build client message as `{ success: true, data: { type: 'broadcast', data: { channel, data, timestamp }, ctx } }`; ctx from request (getLogContext(req)) when from REST, or from incoming payload when from Redis; default to DEFAULT_CTX if missing.
5. **Client/templates:** Ensure demos and admin handle `msg.data.ctx` (optional); wire envelope unchanged.
6. **Tests:** Update websocket.test.js for new signatures and payload shape; assert log calls receive ctx where applicable.
