# W-155: WebSocket Dynamic Namespace Per Resource

## Status
- **Planned** — Option 2 (one namespace per map) from W-154 bubblemap use case

## Overview

Enable one WebSocket namespace per resource (e.g. per mapId for bubblemap.net) so CRUD over WS is naturally scoped: only clients connected to that resource receive broadcasts. No app-level client→resourceId tracking; the namespace path encodes the resource.

## Reference

- **Full use case and comparison:** W-154 design doc, section [Use case: Bubblemap (per-map CRUD over WS)](W-154-websocket-namespace-as-object.md#use-case-bubblemap-per-map-crud-over-ws) (Option 1 vs Option 2, scalability, performance).
- **Framework today:** Namespace must exist at connect time (`namespaces.get(pathname)` in upgrade). `createNamespace(path, options)` can be called at runtime.

## Approach

### Option 2a — Pre-create (no framework change)
- When user opens the resource (e.g. map view load or REST “get map”), app ensures namespace exists: `createNamespace(\`/api/1/ws/bubblemap/${mapId}\`)` if not already present (e.g. `!namespaces.has(path)` then create).
- Client connects to `jPulse.ws.connect(\`/api/1/ws/bubblemap/${mapId}\`)`. Message shape: `{ type, data }` (e.g. bubble-create, bubble-update, bubble-delete); mapId implied by path.
- Shared handler logic: one factory that returns onConnect/onMessage/onDisconnect (or a single “template” namespace config) keyed by path or mapId; same CRUD and authz for every map namespace.

### Option 2b — Lazy get-or-create (framework extension)
- Upgrade handler supports path pattern (e.g. `/api/1/ws/bubblemap/:mapId`): resolve mapId from path, get-or-create namespace, run authz (user can access this map), then complete upgrade.
- Namespace created on first connect; no need for app to call ensureNamespace before connect. Slightly more framework work; app is simpler (no explicit ensure on map open).
- **Where it runs / no Redis coordination:** Get-or-create is **local to the instance** that receives the WebSocket upgrade (one process handles the HTTP upgrade). There is **no Redis (or other) coordination** for “namespace exists.” Each instance keeps its own `namespaces` Map and creates a namespace only when that instance sees an upgrade for that path. Redis is used only for **broadcasting messages** (pub/sub) so instances can deliver to their local clients; Redis does not store or sync namespace existence.

**Pub/sub between instances is stateless:** Redis does not store who is connected or which instances have which namespaces. It only delivers **messages** (e.g. “here is a payload for namespace X”). Each instance that receives the message uses its **local** state (do I have that namespace? which clients are in it?) to decide whether and to whom to send. No shared connection or namespace state in Redis.

## Drop and resurrect (lifecycle)

Namespaces are **in-memory per process**; they are not persisted. So any “drop” is local to that instance, and “resurrect” is creating the namespace again when needed.

### When to drop (teardown)

| Scenario | Description | How | Priority |
|----------|-------------|-----|----------|
| **Last client disconnects** | No one is on this map; free the namespace object and its `clients` Map. | In `onDisconnect`, if `namespace.clients.size === 0` after remove, call e.g. `WebSocketController.removeNamespace(path)`. Framework today has no `removeNamespace`; could be added. | Optional (saves a small amount of memory per empty namespace). |
| **Resource deleted (map)** | Map was deleted; no one should connect anymore. | App calls `removeNamespace(path)` after deleting the map; disconnect remaining clients first if needed. | **Rare** — can be ignored in initial design; add when implementing map delete. |
| **Inactivity timeout (no clients for N min)** | Empty namespace sitting around. | Timer or periodic job: if `clients.size === 0` and last activity &gt; N ago, remove. Requires tracking last disconnect (or last message). | **Usually not needed** — see below. |
| **Process restart** | Server/PM2 restart. | All namespaces are dropped automatically (in-memory). No explicit “drop” step. | N/A |

**Drop on “no traffic” / inactivity?**
- **Long-lived idle tabs** (e.g. user leaves tab open over the weekend) are common. That means a namespace with one (or a few) connected clients, not “empty.” So inactivity drop would only apply to **empty** namespaces (last client left).
- **Cost of keeping namespaces:** One namespace is a small object (path, options, `clients` Map, stats). One idle client is one socket + one ping timer (e.g. every 30s). Tens or low hundreds of namespaces, each with a few idle clients, are **not very resource-intensive** on the server.
- **Recommendation:** Do **not** implement inactivity-based drop (e.g. “remove namespace if zero clients for 30 min”) unless profiling or scale (e.g. thousands of empty or idle namespaces) shows a need. Prefer simplicity: optional drop on “last client disconnects” is enough to reclaim memory when a map goes unused; otherwise leave namespaces in place.

### When to resurrect (create again)

| Scenario | Description | How |
|----------|-------------|-----|
| **User opens resource (2a)** | User navigates to map (page load or REST “get map”). | App ensures namespace exists: `if (!namespaces.has(path)) createNamespace(path, …)`. Client then connects to that path. |
| **First connect (2b)** | Client connects to `/api/1/ws/bubblemap/:mapId` before any “open map” call. | Upgrade handler matches path pattern, get-or-create namespace (create if missing), run authz, complete upgrade. Namespace is created on first connect. |
| **After process restart** | All namespaces were dropped. | Next “open map” (2a) or first connect (2b) creates the namespace again. No persistence; resurrection is always “create when needed.” |
| **After drop (last client left or inactivity)** | Namespace was torn down to save memory. | Same as above: next open (2a) or next connect (2b) creates it again. |

### Multi-instance (stateless)

- Each instance has its **own** `namespaces` Map. There is no shared “namespace exists” state across instances.
- Drop on instance A does not affect instance B (B may never have had that namespace if no client for that map hit B).
- Resurrection: whichever instance serves the next “open map” (2a) or **next WebSocket connect** (2b) creates the namespace. So no cross-instance coordination for drop/resurrect; each instance creates and drops namespaces independently based on local traffic.

### Scenario: Client A (instance A), Client B (instance B), same mapId 123; B closes tab; A continues CRUD; B reopens map

| Step | What happens | Handled? |
|------|----------------|----------|
| **Both on map 123** | Instance A has namespace map123 with client A. Instance B has namespace map123 with client B. (Each instance created it when its client opened/connected.) | Yes. |
| **Client A does CRUD** | Instance A: handler runs, persist, broadcast. Local: client A gets it. Redis: instance A publishes. Instance B: receives Redis, `_localBroadcast(namespacePath, payload)` → sends to local clients in that namespace (client B). So B sees A’s updates. | Yes. |
| **Client B closes tab** | Instance B: client B disconnects. Namespace map123 on B now has 0 clients; we may drop it (`removeNamespace`). Instance A unchanged (still has client A). | Yes. |
| **Client A continues CRUD** | Instance A: broadcast + Redis. Instance B: receives Redis, `_localBroadcast(path, payload)`. If B dropped the namespace, `namespaces.get(path)` is undefined → return early. No one on B to send to anyway. No crash. | Yes. |
| **Client B opens map 123 again** | B loads map page; page typically does REST “get map” (or similar) then `jPulse.ws.connect('/api/1/ws/bubblemap/123')`. **Problem with 2a:** `ensureNamespace(mapId)` runs on the instance that **serves the HTTP request** (e.g. GET map). The **WebSocket upgrade** can be sent to a **different instance** by the load balancer. So: if GET hits instance A, only instance A has the namespace. If the WS upgrade for B then goes to instance B, instance B does not have the namespace → “Unknown namespace” → socket destroyed → **client B fails to connect.** | **2a: only if the same instance serves “open map” and the WS upgrade** (e.g. sticky sessions). **2b: yes** — the instance that receives the upgrade get-or-creates the namespace, so it works regardless of which instance served the page. |

**So:** With **2a (pre-create only)**, the scenario is only handled properly if the load balancer uses **session affinity** (sticky sessions) so that client B’s “get map” and WS connect both hit the same instance. With **2b (get-or-create at upgrade)**, the instance that receives the WebSocket connect creates the namespace if missing, so client B reconnecting works no matter which instance serves the page or the upgrade. Recommendation: use **2b** if you cannot rely on sticky sessions; or use **2a + sticky sessions** and document that requirement.

### Optional framework support

- **`removeNamespace(path)`:** Removes namespace from `this.namespaces`, disconnects any remaining clients (optional), clears timers if any. Enables “drop on last client” and “drop when resource deleted” without app holding refs.
- **`onDisconnect` hook for “last client left”:** Framework could call an optional callback when `clients.size` becomes 0 (e.g. `namespace.onEmpty?.()`), so the app (or a shared helper) can call `removeNamespace`. Alternatively the app checks in its own `onDisconnect`: `if (namespace.getStats().clientCount === 0) removeNamespace(namespace.path)`.

## Scope

- **In scope:** Pattern and lifecycle for dynamic namespaces; bubblemap as reference (ensure/create, shared handlers, CRUD over WS, authz).
- **Out of scope:** Generic “multi-tenant” API; this is a pattern apps implement using existing `createNamespace` (2a) or extended upgrade (2b).

## Effort (estimate)

| Variant | Work | Days |
|--------|------|------|
| **2a only** | App: ensureNamespace on map open, shared handlers, bubble CRUD, client, authz. Docs. Tests. | **~5.5–6.5 d (small)** |
| **2b** | Framework: path-pattern + get-or-create + authz in upgrade. App: handlers, CRUD, client. Docs. Tests. | **~6.5–7 d (small–medium)** |

See work-items.md W-155 for detailed deliverables and effort breakdown.
