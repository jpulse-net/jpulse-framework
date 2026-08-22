# jPulse Docs / URL Fetch v1.7.17

One framework-owned way to fetch a URL that a user, a saved configuration, or any other untrusted input chose. Use this instead of Node's `fetch()` or `http.request()` whenever the host is not a constant you compiled in.

The call resolves and never rejects — same envelope as `jPulse.api.call()` and `ws.request()`.

```js
const res = await UrlFetch.fetch(url);
if (!res.success) {
    // res.code, res.error, res.details
    return;
}
// res.text, res.status, res.finalUrl, res.redirects
```

Live demo (admins): `/hello-fetch/`.

---

## When to use it

| Situation | Use |
|---|---|
| User typed a URL, a widget saved one, a config field holds one | `UrlFetch.fetch` |
| You always call `https://api.your-vendor.com/...` | Ordinary `fetch()` is fine |
| You need a response cache | Keep the cache in the caller; this helper is the security primitive only |

Callers **narrow** the site ceiling. They cannot raise `maxBytes`, lengthen timeouts, add schemes, or turn the private-address guard on. `UrlFetch.getEffectiveOptions(callerOptions)` returns the values that will actually apply — use it in an admin UI or a provenance chip.

---

## Call

```js
const res = await UrlFetch.fetch(url, {
    method:             'GET',   // GET or POST only — not a site config key;
                                 // anything else is METHOD_NOT_ALLOWED
    headers:            {},      // hop-by-hop and Host are stripped
    body:               '',      // string, Buffer, or object (objects become JSON)
    as:                 'text',  // 'text' | 'json' | 'buffer'
    allowedHosts:       [],      // empty = no caller restriction
    blockedHosts:       [],      // unioned with the site list
    acceptContentTypes: [],      // empty = accept any type
    maxBytes:           1048576, // silently capped by utils.urlFetch.maxBytes
    timeoutMs:          15000,
    stallTimeoutMs:     5000,
    maxRedirects:       5,       // 0 = do not follow
    rateLimitKey:       '',      // optional; off unless set
    req:                req,     // Express req or { username, ip } so the log names who
    signal:             ac.signal
});
```

`allowedHosts` / `blockedHosts` accept an array or a comma/whitespace-separated string. Matching is case-insensitive and runs after IDN → punycode, so a Cyrillic lookalike cannot pass an ASCII allowlist. `example.com` is that host only; `*.example.com` is subdomains, not the apex. Blocked always wins.

Default `acceptContentTypes` is empty (accept anything). Pass `['text/*', 'application/json']` when you only want documents or APIs.

---

## Result

Always present: `success`, `code`, `error`, `details`, `status`, `headers`, `contentType`, `charset`, `bytes`, `encodedBytes`, `finalUrl`, `redirects`, `elapsedMs`. `finalUrl` and `redirects` never include embedded credentials.

On success `code` is `OK` and the body is in `text`, `json`, or `buffer` according to `as`.

A non-2xx that passed every guard is `success: false` with `code: 'UPSTREAM_ERROR'`, but `status`, `headers`, and the capped body are still filled in — upstream APIs put the real error in the body, and a cache wants `etag` / `last-modified`.

---

## Codes

| Code | Typical `details` | What to do |
|---|---|---|
| `OK` | — | Use the body |
| `INVALID_URL` | — | Check the string |
| `SCHEME_NOT_ALLOWED` | `{ scheme, allowed }` | Only `http` / `https` unless the site added more |
| `CREDENTIALS_IN_URL` | `{ host }` | Put secrets in `headers`, not in the URL |
| `HOST_NOT_ALLOWED` | `{ host }` | Add the host to the caller's `allowedHosts`, or leave that list empty |
| `HOST_BLOCKED` | `{ host }` | Site or caller `blockedHosts`, or a name like `localhost` / `*.local` / `*.internal` |
| `PRIVATE_ADDRESS` | `{ host, address }` | The name resolved to a non-public address. For local development set `utils.urlFetch.allowPrivateAddresses` to `true` |
| `DNS_FAILED` | `{ host }` | The name did not resolve |
| `TOO_MANY_REDIRECTS` | `{ redirects, limit }` | Lower hops or raise `maxRedirects` (up to the site ceiling) |
| `RESPONSE_TOO_LARGE` | `{ bytes, limit }` | Raise `maxBytes` up to `utils.urlFetch.maxBytes` |
| `CONTENT_TYPE_NOT_ALLOWED` | `{ contentType, allowed }` | Widen `acceptContentTypes` |
| `REQUEST_TIMEOUT` | `{ timeoutMs, phase }` | `phase` is `total` or `stall` |
| `RATE_LIMIT_EXCEEDED` | `{ retryAfterMs }` | Wait; pass a more specific `rateLimitKey` if this is a shared bucket |
| `UPSTREAM_ERROR` | `{ status }` | Read the body — the request was safe, the origin said no |
| `NETWORK_ERROR` | `{ cause }` | Connectivity / TLS / abort |
| `JSON_PARSE_ERROR` | `{ cause }` | `as: 'json'` and the body was not JSON; `text` still has the raw bytes |
| `METHOD_NOT_ALLOWED` | `{ method }` | GET or POST only |
| `INVALID_OPTIONS` | `{ as }` | `as` must be `text`, `json`, or `buffer` |

Messages name the limit and the config key that changes it, so you do not have to look the key up.

---

## What the guard actually does

1. **Pre-flight.** Scheme must be allowed. Embedded credentials (`https://user:pass@host`) are rejected. `localhost`, `*.localhost`, `*.local`, and `*.internal` are rejected by name. Host lists are compared after punycode normalization.
2. **Resolve, check every address, connect to the one you checked.** A public hostname whose A record points at `169.254.169.254` is rejected. IPv6 literals (including Node's bracketed `[::1]`) are classified as addresses without a DNS lookup. The connection uses a pinned `lookup` so a second DNS answer cannot sneak a private address in between check and connect.
3. **Redirects.** Each `Location` goes through the same guard. 301 / 302 / 303 become GET and drop the body; 307 / 308 keep method and body. `Authorization`, `Cookie`, and `Proxy-Authorization` are dropped on a cross-origin hop.
4. **Size.** `Content-Length` over the cap fails before a byte is read. Encoded and decoded bytes are counted while the body streams; a 2 KB gzip that inflates to gigabytes is aborted at `maxBytes`.
5. **Time.** A total deadline (`timeoutMs`) plus a stall timer (`stallTimeoutMs`) reset on every chunk.

Rejected IPv4 ranges: `0.0.0.0/8`, `10/8`, `100.64/10`, `127/8`, `169.254/16`, `172.16/12`, `192.0.0/24`, `192.168/16`, `198.18/15`, `224/4`, `240/4`. IPv6: `::`, `::1`, `fc00::/7`, `fe80::/10`, `64:ff9b::/96`, `ff00::/8`. IPv4-mapped IPv6 (`::ffff:a.b.c.d`) is unwrapped and re-checked as IPv4.

There is **no forward / egress-proxy support**. A site that can only reach the internet through a corporate proxy cannot use this helper yet — a proxy would also move DNS out of the guard.

---

## Configuration

`app.conf` → `utils.urlFetch` (override in `site/webapp/app.conf`). The numbers are both the default and the ceiling.

| Key | Default | Meaning |
|---|---|---|
| `maxBytes` | `10485760` (10 MB) | Encoded and decoded cap |
| `timeoutMs` | `30000` | Total deadline |
| `stallTimeoutMs` | `10000` | Idle gap between chunks |
| `maxRedirects` | `5` | `0` = return the 3xx |
| `allowedSchemes` | `['https', 'http']` | Caller may only remove schemes |
| `blockedHosts` | `[]` | Site-wide deny, applied on top of every caller |
| `userAgent` | empty → `jPulse-UrlFetch/<version>` | Default `User-Agent` when the caller omits one |
| `allowPrivateAddresses` | `false` | The one switch that turns the address guard off. Local development and tests only. Startup warns if this is `true` in production |
| `rateLimit.limit` | `60` | Used only when the caller passes `rateLimitKey` |
| `rateLimit.windowSeconds` | `60` | Sliding window for that key |

There is no site-wide *allow* list. Callers have different risk profiles: a human pasting a research URL into their own conversation is not the same as a saved widget pipeline. Each caller sets `allowedHosts` (or leaves it empty).

`GET` and `POST` are hard-coded. There is no `allowedMethods` key — `PUT` / `DELETE` / `HEAD` return `METHOD_NOT_ALLOWED` so an untrusted URL cannot become a write proxy.

`allowPrivateAddresses: true` is how you fetch `http://localhost:3000` while developing. Do not leave it on in production.

---

## Logging and metrics

Every attempt is logged through `LogController` (`url-fetch.fetch`) with host, code, status, decoded bytes, and elapsed ms. Pass `req` (or a `{ username, ip }` ctx) so an SSRF attempt names who triggered it.

Per-code counters are registered as the `urlFetch` metrics provider (`calls`, `OK`, `PRIVATE_ADDRESS`, …).

Rate limiting uses `RedisManager.cacheCheckRateLimit()` and fails open when Redis is down — same helper as login and password reset.

---

## Related

- [Security & Authentication](security-and-auth.md#url-fetch) — why this exists (SSRF)
- Hello Fetch demo — `/hello-fetch/` (admin-only endpoint on purpose)
