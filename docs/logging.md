# jPulse Docs / Server Logging v2.0.8

How the server writes the application log: the line format, the five `LogController` calls, and how to turn diagnostic volume up for one area without restarting.

## Line format

The format does not change by severity. Columns are tab-separated:

```
-\t<timestamp>\t<severity>\t<username>\tip:<ip>\tvm:<n>\tid:<n>\t<scope>\t<message>
```

Request banners use `====` instead of `-` / the severity so they stand out:

```
====	2026-09-20 12:30:55	====	peterthoeny	ip:::1	vm:4	id:0	===view.load===	/map/demo
-	2026-09-20 12:30:55	info	peterthoeny	ip:::1	vm:4	id:0	view.load	/map/demo, completed in 216ms
```

`debug` uses the same severity column as `info`, `warning`, and `ERROR`.

Scope is `[controller].[method]`. A dotless scope (`app`, `hook-manager`) is valid and is its own area.

## The five calls

| Call | When it prints | Use for |
|---|---|---|
| `logRequest(req, scope, message)` | Always | The `====` banner at the start of a user-facing action |
| `logInfo(req, scope, message)` | Always | One success/outcome line with timing: `success: 369 bubbles in 35ms` |
| `logWarning(req, scope, message)` | Always | Recoverable problems |
| `logError(req, scope, message)` | Always | Failures |
| `logDebug(req, scope, message)` | Only when the area is enabled | Internals: cache hits, include expansion, relay, per-connection chatter |

`req` may be an Express request or a plain `{ username, ip }` context (WebSocket). Passing `null` is allowed; the line then shows `(guest)` / `ip:0.0.0.0`.

**The test to apply:** a line that records a user-facing action with its outcome is `logInfo`. Anything that fires more than once per request per method is `logDebug`.

The document change log (`logChange` / the `log` collection) is separate. This page is stdout only.

## Areas

The **area** is the scope up to the first dot (`websocket._localBroadcast` → `websocket`). Matching is a prefix test: `redis` matches `redis-manager.cacheSet`, `web` matches `websocket._localBroadcast`, `handlebar.component` matches that one scope only. `*` matches everything.

`LogController.debugEnabled(areaOrScope)` is the producer-side guard for expensive messages. It is deliberately permissive when the query is broader than an enabled tag, so this never hides a line the gate would print:

```javascript
if (LogController.debugEnabled('websocket')) {
    LogController.logDebug(ctx, 'websocket._handleUpgrade',
        `Pattern matched: ${pattern}, extracted params: ${JSON.stringify(params)}`);
}
```

## Turning volume up

Boot default in `app.conf`:

```javascript
controller: {
    log: {
        maxMsgLength: 256,
        debug:        [],     // [] none; ['websocket'] one area; true or ['*'] all
        debugTtl:     30      // live override lifetime, minutes
    }
}
```

`JPULSE_LOG_DEBUG=websocket,redis-manager` overlays `debug` for that process.

The live toggle is the **Debug Areas** panel on `/admin/logs.shtml` (admin only). Checkboxes are grouped Framework / Site / Plugins and show how many debug lines were suppressed per area. The selection is ephemeral: it expires after `debugTtl` minutes, is cleared by restart, and is propagated to every instance over Redis when Redis is available. With Redis down it applies to the local process only.

`GET` / `PUT` `/api/1/log/debug` (admin) read and set the same state.

---

*Related: [Gen-AI Instructions](genai-instructions.md) (logging rules for generated controllers), [API Reference](api-reference.md), [WebSockets](websockets.md).*
