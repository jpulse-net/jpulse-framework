# W-258: ai-core: usage records by user, model, and scope; usage page with Day/Month switch

## Status

🚧 IN_PROGRESS — implemented 2026-10-01, not yet released. Product decisions were settled with
the work item owner in a brainstorming session before this draft (see `## Decisions`).
Target: `@jpulse-net/plugin-ai-core` 1.0.19 (bundle carries `ai-mock` 1.0.19 and `hello-ai`
1.0.19, lockstep). Headers stay at 1.0.18 until the version bump.

### As Built

- The retention log line is `aiCore.retention` / `success: purged N old turns` (startup and the
  daily timer share one function).
- An explicit `settings.caps` of `[]` means no cap. `DEFAULT_CAPS` apply only when `caps` was
  not passed. `mergeSettings()` always passes an array.
- "No price entry" is the by-model cell. A by-user, by-scope, or history row with `costUnknown`
  keeps the known sum and uses the warning color. The cost card's "some costs unknown" line
  uses that same color.
- The Plugin releases line for 1.0.19 is in both ai-core READMEs. The version bump is separate.
- A thread longer than the list window returns the newest turns. The completed, canceled, and stalled events are sent after the turn is saved.
- HTML with one `<article>` per section is read from `<main>` when that text is longer. The empty-shell message says the content loads dynamically. A failed fetch from the prompt shows that message in the chat and does not send the turn.

This document replaces parts of the W-223 design (`docs/dev/design/W-223-ai-agent.md`):
§9.7 (the `aiUsage` row), §10.1 (monthly documents), §10.2 (the subject), and in §17 the usage
page paragraph and the `app.conf` overrides. W-223 is updated to point here as part of this work
item.


## 1. Overview

The admin AI usage page is a raw dump of the `aiUsage` collection: one row per
`<subject>:<period>` document, daily and monthly documents mixed, cost as a raw float
(`0.18487799999999996`). Adding the rows up double-counts, and there is no breakdown by
model or by what the conversation was about.

BubbleMap overrides the page (`site/webapp/view/admin/ai-usage.shtml`) with stat cards and
"By user", "By map", and "By model" tables. That layout is the target, but the override reads a
response shape (`{ cards, byUser, byMap, byModel }`) that no API builds, so it renders zeros and
empty tables.

This work item:

- stores one usage record per day, user, provider/model, and scope, written once per turn; the
  collection keeps its name `aiUsage`, and the old documents are dropped before the upgrade
- drops monthly documents; a month is the sum of its days
- renames the quota "subject" to `username`
- chooses provider and model before the quota check, so the reservation lands on the same record
- runs the turn-retention purge daily, not only at startup
- renames the cap settings so the key says "per user" (`maxUserRequestsPerDay`,
  `maxUserTokensPerDay`) and adds a per-user monthly cost cap, `maxUserCostPerMonth`, on the AI
  Agent tab
- rebuilds the usage page: Day/Month switch, five stat cards, by-user, by-model, and by-scope
  tables, and a history table
- lets the code that defines a scope type name it ("Map") through a new hook, with or without
  i18n
- removes ai-core's `app.conf` reads; plugin settings live in MongoDB, values defined by code
  come from code through hooks


## 2. Current State

Findings from the code as of `@jpulse-net/plugin-ai-core` 1.0.18:

- **`aiUsage` documents.** `AiUsageModel` keys documents `<subject>:<periodKey>`, unique index
  `aiUsage_subject_period` on `key`. `onAiQuotaSettle` calls `settle()` twice per turn, once for
  the day key and once for the month key. The two writes are separate, so a crash between them
  leaves the month out of step for good
- **reservation.** `onAiQuotaCheck` reserves one request on the **day** document only
  (`reservedRequests`). A monthly request cap does not see turns in flight
- **no usage purge.** Nothing deletes `aiUsage` documents. Every month document equals the sum of
  its day documents
- **turn retention.** `retentionDays` (default 90) deletes `aiTurns` older than the cutoff, in
  `AiCoreController.initialize()` only. A server that stays up for months never purges
- **order in `runTurn`.** `onAiQuotaCheck` runs (`turnLoop.js` ~line 206) before the provider and
  model are chosen (~line 253). The reservation cannot know the model
- **scope.** Every thread has a required `scopeType` and `scopeId`. `onAiScopeResolve` returns
  `scope.label` (BubbleMap: the map name; `hello-ai`: "Hello AI scratch pad"). The resolved scope
  is available inside the round loop as `resolved.scope`
- **usage API.** `GET /api/1/ai/usage` (admin) returns the newest 200 documents with an
  `overQuota` flag computed from the site caps
- **caps.** Site settings produce two daily caps (`maxRequestsPerDay`, `maxTokensPerDay`). A site
  quota handler can return other caps, including monthly ones
- **capability probe.** `quotaSnapshot(username, caps)` feeds `quota.rows` in the capability
  response, read by the panel and by `/jpulse-plugins/ai-core.shtml`
- **`app.conf` reads.** `loadSettings()` merges `appConfig.ai` as a fallback for four settings
  that already live in MongoDB: `ai.defaultProvider` and `ai.defaultModel` (AI Agent tab),
  `ai.promptOverride` (AI Agent tab, site instructions), and `ai.debugDumps` (Admin → Plugins →
  ai-core). No site sets the `ai` section. `appConfig` is built from the framework `app.conf`,
  the site `app.conf`, and `app-secret.conf` only; a plugin cannot add a layer


## 3. Decisions

Settled with the work item owner before this draft:

1. **No monthly documents.** A month is derived from its days
2. **Usage numbers are kept indefinitely.** No automatic purge of usage records. A manual purge can
   come later if asked for
3. **One record type,** keyed by day, user, provider, model, and scope. Not one record type per
   breakdown: separate records would need several writes per turn (the drift problem again) and
   could not answer "which models did this user use on this map"
4. **`subject` becomes `username`** everywhere: record field, quota hook result, quota context,
   API, page. A service account or a quota pool is another kind of user
5. **No migration, no migration code.** The collection stays `aiUsage`; with only one record
   type, a "daily" suffix adds nothing. The admin drops the old collection with mongosh before
   starting 1.0.19 (§10)
6. **Provider and model are chosen before the quota check**
7. **Turn retention stays at 90 days by default and runs daily**
8. **The third breakdown is the thread scope.** The page shows one scope table that adapts:
   with one scope type in the selected period, the scope column header is that type's label
   ("Map") and there is no area column; with more than one, an "Area" column appears and the
   scope header is "Scope"
9. **Scope type labels come from code.** The code that defines a scope type names it, through a
   new hook `onAiScopeTypes` (§9). i18n is optional: a handler returns plain text or translates
   it
10. **Plugin settings live in MongoDB, not `app.conf`** (§9.3). ai-core's `app.conf` reads are
    removed
11. **History covers 60 days in Day mode** and 12 months in Month mode. Previous/next navigation
    of the whole page is TD-19
12. **Cap keys say "per user".** `maxRequestsPerDay` and `maxTokensPerDay` become
    `maxUserRequestsPerDay` and `maxUserTokensPerDay`; the new monthly cost cap is
    `maxUserCostPerMonth`, per user, not a site total. Labels say "per user" too (§5.5). Stored
    values are renamed with mongosh before the upgrade (§10). A site-wide monthly cap
    (`maxSiteCostPerMonth`) and business-unit budgets are TD-24
13. **`0` means no cap, for all three caps.** One rule; the daily caps no longer read `0` as
    "nothing allowed". Turning AI off stays with the AI Agent tab's on/off switch and allowed
    roles (§5.5)


## 4. Usage Record

### 4.1 Shape

One document per day, user, provider, model, and scope, in the collection `aiUsage`. The model
stays `AiUsageModel` in `webapp/model/aiUsage.js`; the document shape and the indexes change.

```js
{
    day: '2026-09-30',              // server-local calendar day, as periodKey('day') today
    username: 'peter',
    provider: 'anthropic',
    model: 'claude-sonnet-4.5',
    scopeType: 'map',
    scopeId: '66f1…',
    scopeLabel: 'Q3 Roadmap',       // newest non-empty label seen
    requests: 21,
    reservedRequests: 0,
    tokensIn: 61200,
    tokensOut: 29032,
    tokens: 90232,
    cacheWrite: 0,
    cacheRead: 0,
    toolCalls: 14,
    cost: 0.23928905,
    costUnknown: false,
    createdAt: ISODate(…),
    updatedAt: ISODate(…)
}
```

The six identity fields (`day`, `username`, `provider`, `model`, `scopeType`, `scopeId`) are the
record's key. There is no composed `key` string.

`day` is a string so a range is a string comparison (`'2026-09-01' <= day <= '2026-09-30'`) and a
month is a prefix. The day stays server-local, the same rule as today's `periodKey('day')`.

### 4.2 Indexes

| Name | Keys | Options | Used by |
|---|---|---|---|
| `aiUsage_identity` | `{ day: 1, username: 1, provider: 1, model: 1, scopeType: 1, scopeId: 1 }` | unique | upserts; page queries by day range (prefix `day`) |
| `aiUsage_user_day` | `{ username: 1, day: 1 }` | | quota sums, capability probe |

### 4.3 Writes

All writes are upserts on the identity. Counter fields never appear in `$setOnInsert` (MongoDB
rejects the same path in `$setOnInsert` and `$inc`), the rule the current model already follows.

- **`reserve(identity, { requests })`** — `$setOnInsert` identity and `createdAt`,
  `$inc: { reservedRequests }`, `$set: { updatedAt }`
- **`rollbackReserve(identity, { requests })`** — `$inc: { reservedRequests: -requests }`
- **`settle(identity, delta)`** — one update:
  - `$inc`: `reservedRequests: -requests`, `requests`, `tokensIn`, `tokensOut`, `tokens`,
    `cacheWrite`, `cacheRead`, `toolCalls`, and `cost` when it is a finite number
  - `$set`: `updatedAt`; `costUnknown: true` when the turn's cost is unknown (never written
    `false` over an earlier `true`); `scopeLabel` when the turn resolved a non-empty label
  - `$setOnInsert`: identity and `createdAt`

One turn is one reservation write and one settle write, both on the same document. A deleted map
keeps its last label on its usage rows; a renamed map shows the new name from its next turn on.

### 4.4 Reads

Model methods, all over a day range `{ fromDay, toDay }` (inclusive):

- **`sumForUser(username, range)`** — one `$group` over `aiUsage_user_day`. Returns `requests`
  (`requests + reservedRequests`), `tokens`, `tokensIn`, `tokensOut`, `cost`, `costUnknown`
  (any row true), `toolCalls`, and `cacheWrite` / `cacheRead`
- **`summarize(range)`** — the page breakdowns in **one** aggregation: `$match` on the day range,
  then `$facet` with four `$group` stages: totals, by `username`, by `provider` + `model`, and by
  `scopeType` + `scopeId`. Each group carries the same counters plus `lastUsed`
  (`$max updatedAt`). The scope group's label is the newest non-empty `scopeLabel` in the group
- **`history(range, per)`** — `$group` by `{ period, username }`, where `period` is `day` for
  `per` `'day'` and the first seven characters of `day` for `'month'`. A second query,
  because its range (60 days or 12 months) differs from the cards' range (today or this month)

**Where to aggregate.** Two options were compared:

| | Option 1: aggregate in MongoDB (chosen) | Option 2: ship raw rows, aggregate in the browser |
|---|---|---|
| Queries | one `$facet` for the breakdowns, one for history | one `find` over the widest range |
| Payload | grouped rows only: users + models + scopes + history rows | every record in the range. At 300 records a day: 9,000 for a month, 18,000 for 60 days of history (several MB of JSON) |
| Server-side work still needed | — | quota rows (caps are server settings), scope type labels (`onAiScopeTypes` runs on the server), conversations and failed/stalled (read `aiTurns`) |
| Coupling | the view reads the §7 shape | the view depends on the storage shape; a field change breaks the page |
| Reuse | the same aggregation serves an export or another client later | each client repeats the grouping |

Option 1 keeps the payload proportional to what the page shows, and the server has to run for
quota, labels, and turn counts anyway. `$facet` gives it option 2's single round trip for the
breakdowns.

A helper in `quota.js`, **`periodRange(period, now)`**, returns the range: `day` is
`{ fromDay: today, toDay: today }`, `month` is `{ fromDay: 'YYYY-MM-01', toDay: today }`. It
throws on an unknown period, as `periodKey` does. `week` (TD-09) is one more case here and needs
no new record type.


## 5. Quota

### 5.1 Order in `runTurn`

Today: `onAiTurnBefore` → `onAiQuotaCheck` (reserve) → lease → choose provider/model → create
turn.

New: `onAiTurnBefore` → **choose provider/model** → `onAiQuotaCheck` (reserve) → lease →
persist thread provider/model → create turn.

- `listProviders`, `filterAllowedModels`, and `chooseProviderModel` move above the quota check.
  None of them depends on quota
- "No provider is available" (`AI_NO_PROVIDER`) is now thrown before anything is reserved, so
  there is nothing to roll back
- `threadModel.setProviderModel()` stays after the lease, so a turn refused by quota does not
  change the thread's remembered model

### 5.2 Hook contract

**`onAiQuotaCheck`** context gains the turn's identity:

```js
{
    actor, settings, now, usageModel,
    thread,                         // scopeType, scopeId
    provider: 'anthropic',
    model: 'claude-sonnet-4.5'
}
```

A handler returns `{ username, caps }` (was `{ subject, caps }`). The shipped handler
(priority 1000) returns `{ username: actor.username, caps: settings.caps }`, checks each cap
against `sumForUser(username, periodRange(cap.period, now))`, then reserves one request on the
identity. `ctx.quota` becomes:

```js
{
    username: 'peter',
    caps: [ … ],
    identity: { day, username, provider, model, scopeType, scopeId },
    reserved: { requests: 1 },
    now
}
```

`identity.day` is fixed at the check. A turn that runs past midnight settles on the row it
reserved, as today.

**`onAiQuotaSettle`** context gains `scope` (the last `resolved.scope` the turn saw, for
`scope.label`). The shipped handler settles once on `quota.identity`, or rolls back the
reservation when `started === false`.

A site handler that charges someone else (a pool, a service account) returns that name as
`username`. Its rows are written under that name, with the turn's real provider, model, and
scope. The delegated grant model in W-223 §10.2 (record against the engineer, enforce against
the pool) is unchanged: such a site writes what it likes inside its own two handlers.

`contextKeys` in the hook catalog are updated to match (`onAiQuotaCheck`: add `thread`,
`provider`, `model`; `onAiQuotaSettle`: add `scope`). The hook descriptions say "username", not
"subject".

### 5.3 Caps

Unchanged: caps are a list of `{ dimension, period, limit }`; site settings produce the two
daily caps; `firstExceededCap` and the `costUnknown` rule stay. What changes is the read: a cap's
`used` value is the sum over `periodRange(cap.period)`, not one document. A monthly request cap
now counts reservations in flight, because they sit on day rows.

### 5.4 Capability probe

`quotaSnapshot(username, caps, now)` sums with `sumForUser` per cap. Its return is
`{ username, rows }` (was `{ subject, rows }`). Each row keeps `dimension`, `period`, `limit`,
`used`, `costUnknown`, and `periodKey` (`YYYY-MM-DD` or `YYYY-MM`), so the panel and
`/jpulse-plugins/ai-core.shtml` need no change beyond the rename.

### 5.5 Per-user caps: key rename and `maxUserCostPerMonth`

The two daily caps on the AI Agent tab are renamed, and a third, monthly cost cap is added:

| Field | Was | Type | Default | Label |
|---|---|---|---|---|
| `maxUserRequestsPerDay` | `maxRequestsPerDay` | number | `200` | "Daily request cap per user" (was "Daily request cap") |
| `maxUserTokensPerDay` | `maxTokensPerDay` | number | `400000` | "Daily token cap per user" (was "Daily token cap") |
| `maxUserCostPerMonth` | (new) | number | `0` | "Monthly cost cap per user (USD)" |

- **per user, in the key and the label.** All three caps apply to each user separately: each
  user's own requests and tokens today, and each user's own cost this month (the sum of their
  day records from the 1st to today). None is a total for the site. `maxRequestsPerDay` did
  not say which; the key pattern is now `max<Who><Dimension>Per<Period>`, so a future site-wide
  cap is `maxSiteCostPerMonth` (TD-24) and the two can't be confused
- **stored values.** The daily caps are stored in the `configs` collection (default document
  `global`) under `data.ai`. The old keys are renamed with mongosh before the upgrade (§10); no
  fallback to the old keys in code. Without the rename, the two daily caps fall back to their
  defaults (200 requests, 400000 tokens), and the old values stay in the document unread
- **translation keys** follow the field names: `view.ui.ai.config.maxUserRequestsPerDay`,
  `maxUserTokensPerDay`, `maxUserCostPerMonth`, each with a `...Help` key; the old
  `maxRequestsPerDay` and `maxTokensPerDay` keys are removed
- **`0` means no cap** (decision 13), the same for all three. `loadSettings()` reads each cap
  as follows:

  | Stored value | Meaning |
  |---|---|
  | missing (tab never saved) | code default: 200 requests, 400000 tokens, no cost cap |
  | finite number greater than `0` | the cap, added to `settings.caps` |
  | `0` or negative | no cap; nothing added to `settings.caps` |

  "Empty" is not a stored state: the framework's schema form saves an empty number field as
  the field's default (`webapp/view/jpulse-common.js`, number fields on save). Clearing a daily
  cap saves 200 or 400000 again; clearing the cost cap saves `0`
- **whole dollars.** The same form code parses number fields with `parseInt`, so the cost cap
  is whole US dollars ($25.50 is saved as 25). Accepted; cents would need a framework change
- **help text**, short, the label carries the rest:

  | Field | Help (en) | Help (de) |
  |---|---|---|
  | `maxUserRequestsPerDay` | "0: no cap." | "0: kein Limit." |
  | `maxUserTokensPerDay` | "0: no cap." | "0: kein Limit." |
  | `maxUserCostPerMonth` | "Whole US dollars. 0: no cap." | "Ganze US-Dollar. 0: kein Limit." |

  The calendar month in server time and the unpriced-model rule below go into the plugin
  README, not the help text
- de labels: "Tägliches Anfragenlimit pro Benutzer", "Tägliches Tokenlimit pro Benutzer",
  "Monatliches Kostenlimit pro Benutzer (USD)"
- **unknown cost blocks.** The existing rule in `firstExceededCap` (W-223 §10.1) applies
  unchanged: with a cost cap set, a user whose month has `costUnknown` is refused with
  "Quota cost is partly unknown; refusing new turns until it is resolved." A model without a
  price entry therefore locks its users out for the rest of the month while the cap is set. The
  usage page shows such rows as "no price entry" (§8.3), which is where an admin sees the cause.
  The fix is a price entry in the provider plugin's config
- **page.** In Month mode the by-user quota cell shows `$4.12 / $25.00`. In Day mode it is not
  shown, because only caps whose period matches the switch are listed (§7)
- **panel.** The capability probe returns the cap as one more `quota.rows` entry, and the panel's
  `/quota` command lists it. `runQuota()` in `view/jpulse-common.js` prints `used / limit` raw,
  which would show `cost (month): 4.123456 / 25`; cost rows are formatted as `$4.12 / $25.00`,
  the same format as the usage page (§8.4)
- **BubbleMap.** Its old `monthlyCostCap` (default 0, never copied, no reader) is the same idea;
  an admin who wants it sets `maxUserCostPerMonth` on the AI Agent tab


## 6. Turn Retention

- default stays 90 days; `0` keeps turns forever (already true)
- the purge runs at startup, then every 24 hours from a timer started in
  `AiCoreController.initialize()`, with `unref()` so it never holds the process open
- each run re-reads settings, so a changed `retentionDays` applies without a restart
- several app instances each run the same `deleteMany({ createdAt: { $lt: cutoff } })`;
  running it twice deletes nothing more
- each run that deletes something logs `success: purged N old turns` (existing line)
- the AI Agent tab gets help text on `retentionDays`: conversation turns older than this are
  deleted once a day; `0` keeps them; usage numbers are never deleted
- `aiUsage` is never purged by this job


## 7. Usage API

`GET /api/1/ai/usage?per=day|month`, admin only, `per` defaults to `day`. Any other value is a
400 (`AI_BAD_ARGS`).

`per` sets both the window of the cards, tables, and quota cells (today or this month) and the
step of the history (days or months): usage counted per day or per month, matching the cap keys
(`maxUserRequestsPerDay`, `maxUserCostPerMonth`). `period` stays where it means a time window or
a time value: the cap `{ dimension, period, limit }` (hook contract), `periodRange()`, and the
history row's `period: '2026-09-30'`.

```js
{
    success: true,
    data: {
        per: 'day',
        range: { fromDay: '2026-09-30', toDay: '2026-09-30' },
        cards: {
            requests: 21,
            tokens: 90232,
            cost: 0.23928905,
            costUnknown: false,
            conversations: 4,
            failedOrStalled: 1
        },
        byUser: [
            {
                username, requests, tokens, tokensIn, tokensOut, cost, costUnknown, lastUsed,
                quota: { overQuota: false, rows: [ { dimension, limit, used } ] }
            }
        ],
        byModel: [ { provider, model, requests, tokens, cost, costUnknown, lastUsed } ],
        byScope: [
            {
                scopeType, scopeTypeLabel, scopeId, scopeLabel,
                requests, tokens, cost, costUnknown, lastUsed
            }
        ],
        scopeTypes: [ { scopeType: 'map', label: 'Map' } ],
        history: [ { period: '2026-09-30', username, requests, tokens, cost, costUnknown } ]
    }
}
```

- **cards.** `requests`, `tokens`, `cost`, `costUnknown` sum `aiUsage` over the range.
  `conversations` is the number of distinct threads with at least one turn created in the range
  (`aiTurns`, `createdAt` index). `failedOrStalled` counts turns in the range with status
  `failed` or `stalled`. Both read turns, so they are limited by turn retention; at the 90-day
  default a month is always covered
- **byUser quota.** Checks the site caps whose period matches the switch (`day` caps in Day mode,
  `month` caps in Month mode) against that user's totals. No matching cap gives `rows: []`. Caps
  returned by a site quota handler for a specific user are not shown; the page cannot call the
  hook for every user (TD-20)
- **byModel.** `costUnknown` on a model row means at least one turn had no price entry
- **byScope.** `scopeLabel` falls back to `scopeId` when no label was ever seen.
  `scopeTypeLabel` comes from `onAiScopeTypes` (§9)
- **scopeTypes.** Only the scope types that have rows in the range, each with its label
- **history.** Day mode: one row per user per day for the last 60 days ending today. Month mode:
  one row per user per month for the last 12 months ending this month. Newest period first, then
  username
- **sorting.** `byUser`, `byModel`, and `byScope` are sorted by cost, highest first; rows with
  equal or unknown cost by tokens
- logging: `aiCore.apiUsage` request, success (`per, N users, N models, N scopes`), and error
  lines, as today


## 8. Usage Page

`plugins/ai-core/webapp/view/admin/ai-usage.shtml`. Framework classes only (`jp-page-header`,
`jp-btn-group`, `jp-stats-grid`, `jp-stat-card`, `jp-card`, `jp-table`), theme variables for the
two `local-*` warning colors. All text from `view.ui.ai.usage.*`.

```
AI usage                                    [ Day | Month ]  [AI Agent settings]
-----------------------------------------------------------------------------
[ 21 Requests today ] [ 90.2k Tokens today ] [ $0.24 Cost today ]
[ 4 Conversations today ] [ 1 Failed / stalled today ]

By user
User | Requests | Tokens | Cost | Last used | Quota

By provider / model
Provider / model | Requests | Tokens | Cost

Map                                  (or: By scope, with an Area column when mixed)
Map | Requests | Tokens | Cost | Last used

History
Day | User | Requests | Tokens | Cost
```

### 8.1 Day/Month switch

- a two-button `jp-btn-group` in the page header; the active button is the primary style
- the choice is in the URL (`?per=month`), the same name as the API parameter; a reload or a
  shared link keeps it; `history.replaceState` on switch, no full page reload
- default `day`
- every card label, section, and table follows the switch ("Requests today" / "Requests this
  month")

### 8.2 Cards

| Card | Day | Month |
|---|---|---|
| Requests | today | this month |
| Tokens | today | this month |
| Cost | today | this month |
| Conversations | threads with a turn today | threads with a turn this month |
| Failed / stalled | today | this month |

Caps are not on the cards. A cap is per user; `121 / 200` on a site total would read as a site
cap. When `costUnknown` is true, the cost card shows the known sum with a "some costs unknown"
line under it, rather than replacing the number.

### 8.3 Tables

- **By user.** Quota cell: `used / limit` per matching cap (`1.2k / 400k tokens`), "no cap" when
  none matches, over-quota rows in the danger color with "over quota"
- **By provider / model.** One `provider / model` cell. A `costUnknown` row shows "no price entry"
  in the warning color
- **Scope table, adaptive** (decision 8). From `scopeTypes` in the response:
  - **one scope type:** heading is the type label ("Map"); columns are that label, then
    Requests, Tokens, Cost, Last used; cells are `scopeLabel` ("Q3 Roadmap")
  - **more than one:** heading "By scope"; columns Area, Scope, Requests, Tokens, Cost, Last used;
    Area cells are the type labels
  - **none:** the section shows its empty line
- **History.** Period column header is "Day" or "Month" by the switch
- every table has its own empty line ("No usage today.", "No usage this month.")

BubbleMap keeps the layout of its override: its "By map" table is the scope table with one scope
type labeled "Map". One card changes meaning: its "Active conversations" counted active thread
slots, and every user who ever opened a map has one forever. "Conversations" counts threads that
had a turn in the period.

### 8.4 Formatting

- tokens: `832` / `90.2k` / `1.4M`, full number in the cell `title`
- cost: `$0.24`; a non-zero cost under one cent is `<$0.01`; unknown is `—`; full value in `title`
- dates: `jPulse.date.formatLocalDateAndTime()` for Last used
- cost is USD, the unit of the provider price tables

### 8.5 Admin card

The `adminCards.aiUsage` component stays. Its description changes from "Per-subject requests,
tokens, and cost by period." to text without "subject".


## 9. Scope Type Labels and Plugin Configuration

### 9.1 `onAiScopeTypes` hook

A scope type's label ("Map") is not an admin setting. The code that defines the scope type names
it. ai-core adds one hook to its catalog:

```js
onAiScopeTypes: {
    description: 'Name the scope types this site or plugin defines',
    mode: 'execute',
    onError: 'continue',
    canModify: true,
    contextKeys: ['req', 'scopeTypes'],
    since: '1.0.19'
}
```

`apiUsage` calls it once per request with `ctx.scopeTypes = []`. Each handler pushes
`{ scopeType, label }` for the types it owns. A site or plugin registers it next to its
`onAiScopeResolve` handler:

```js
static hooks = {
    onAiScopeResolve: { handler: 'onAiScopeResolve' },
    onAiScopeTypes:   { handler: 'onAiScopeTypes' }
};

static async onAiScopeTypes(ctx) {
    ctx.scopeTypes.push({ scopeType: SCOPE_TYPE, label: 'Map' });
}
```

- **i18n optional.** A handler returns plain text, or translates with
  `global.i18n.translate(ctx.req, '<key>')` in the admin's language
- **first wins.** If two handlers name the same type, the first one in hook order wins. Hook
  priority decides the order, so a site can override a plugin's label by registering with a
  lower priority number
- **fallback.** A type with no label shows the raw `scopeType` (`map`)
- **failure.** A handler that throws is logged and skipped (`onError: 'continue'`); the page
  still renders with raw types
- nothing is stored on a usage record; renaming a type label changes every row at once

`hello-ai` registers `onAiScopeTypes` for `hello-ai` → "Hello AI" in
`plugins/hello-ai/webapp/controller/helloAi.js`, as the reference for a plugin-owned scope type.

### 9.2 ai-core `app.conf` reads removed

`loadSettings()` no longer reads `appConfig.ai`. Each setting has one home:

| Removed `app.conf` key | Setting in MongoDB |
|---|---|
| `ai.defaultProvider` | Site Configuration → AI Agent, `defaultProvider` |
| `ai.defaultModel` | Site Configuration → AI Agent, `defaultModel` |
| `ai.promptOverride` | Site Configuration → AI Agent, `siteInstructions` |
| `ai.debugDumps` | Admin → Plugins → ai-core, `debugDumps` |

Settings resolve in two tiers: code defaults (`AI_CONFIG_DEFAULTS`), then MongoDB. The
`@description` of `settings.js` drops "optional app.conf.ai".

### 9.3 Plugin configuration convention

`appConfig` is assembled from the framework `app.conf`, the site `app.conf`, and
`app-secret.conf`. A plugin cannot add a layer, so a plugin section in the site's `app.conf`
would bypass the site → plugins → framework order everywhere else. The convention, documented in
`docs/plugins/creating-plugins.md` (Step 2, configuration):

- **plugin settings live in MongoDB:** the plugin's own config page (`plugin.json` config schema,
  Admin → Plugins → `<name>`), or a Site Configuration tab added with
  `ConfigModel.extendSchema()`. Production behavior on a Site Configuration tab, diagnostics on
  the plugin page (the split ai-core already uses)
- **values defined by code come from code,** through hooks (scope types and labels, tools,
  providers)
- **plugins read `app.conf` only for framework sections,** such as `system`
- **one home per setting.** Do not add an `app.conf` fallback for a MongoDB setting
- a plugin `app.conf` layer (framework, then plugin, then site) would be the consistent design if
  a deploy-time need appears, such as a setting needed before the database is up. Nothing needs
  it today (TD-23)


## 10. Upgrade: drop the old `aiUsage` documents, rename the cap keys

No migration and no migration code (decision 5). The upgrade steps, once per site, **before**
starting 1.0.19:

```js
// mongosh, connected to the site database, with the app stopped
db.aiUsage.drop()
db.configs.updateMany({}, { $rename: {
    'data.ai.maxRequestsPerDay': 'data.ai.maxUserRequestsPerDay',
    'data.ai.maxTokensPerDay': 'data.ai.maxUserTokensPerDay'
} })
```

Then start the app; `AiUsageModel.ensureIndexes()` creates `aiUsage_identity` and
`aiUsage_user_day` on the empty collection.

The rename is a no-op on config documents without those fields. If it is skipped, the two daily
caps fall back to their defaults (200 requests, 400000 tokens), and the old values stay in the
document unread. Recovery: run the rename and restart, or set the caps again on the AI Agent tab.

The drop is required, not cosmetic. If it is skipped:

- the old unique index `aiUsage_subject_period` on `key` stays. New records have no `key`, which
  the index treats as `null`, so the second new record fails with a duplicate key error. The
  quota reservation throws, and every AI turn fails at the quota check
- creating `aiUsage_identity` fails on the old documents (none of them has the identity fields);
  `initialize()` logs `error: indexes …` on every start
- old documents themselves are harmless to reads: they have no `day`, so no range query matches
  them

Recovery is the same command, then a restart. The release notes and the plugin README upgrade
note carry both commands and the order. Two sites run ai-core today (the jPulse site and
BubbleMap), both under the same ownership as the plugin.


## 11. Sites

- **BubbleMap** (follow-up in its own repo, not part of this work item):
  - delete `site/webapp/view/admin/ai-usage.shtml` so the plugin page shows
  - register `onAiScopeTypes` in `site/webapp/controller/aiAgent.js` (next to `onAiScopeResolve`,
    line 265) for `map` → "Map"
  - rename `subject` to `username` in its own quota handlers, if any
  - check which `controller.aiAgent.*` keys in its `app.conf` duplicate ai-core settings
    (`defaultProvider`, `defaultModel`, `maxRoundsPerTurn`, `turnTimeoutMs`, …) and whether its
    code still reads them. `controller.aiAgent` and `view.map.aiAgent` themselves stay: they are
    site settings for site code
  - remove quota leftovers nothing reads: `monthlyCostCap` in `AI_AGENT_DEFAULTS`
    (`aiAgent.js`, not in the copy list, no reader), and `quotaWarnPercent` /
    `aiCapability.quotaUsedPercent` in `app.conf` and `map-canvas.tmpl` (set, never computed;
    the ai-core panel warns from the capability probe's `quota.rows`)
  - `AI_AGENT_TO_AI_COPY` in `aiAgent.js` (lines 88-89): destinations become
    `maxUserRequestsPerDay` and `maxUserTokensPerDay`, and `aiAgent.test.js` (line 449) asserts
    the new key. The copy has already run on BubbleMap (it stops once `copiedFromAiAgent` or
    `defaultProvider` is set), so this only matters for a fresh install; the stored values are
    moved by the mongosh rename
  - the two mongosh steps before starting 1.0.19 (§10)
- **any other site:** the two mongosh steps before starting 1.0.19 (§10); rename `subject` in
  its own quota handlers, if any; update any code that reads or writes `data.ai.maxRequestsPerDay`
  or `data.ai.maxTokensPerDay`;
  register `onAiScopeTypes` if it wants a label; move any `ai.*` `app.conf` values to Site
  Configuration → AI Agent (no known site has them)


## 12. Testing

Unit tests in `plugins/ai-core/webapp/tests/unit/`:

- **`usage-update.test.js`** (rewrite): reserve, rollback, and settle hit one document per
  identity; two turns on the same identity add up; a different model or scope is a separate
  document; `costUnknown` stays true once set; `scopeLabel` is set when non-empty and kept when
  empty; counters never in `$setOnInsert`
- **`quota.test.js`**: `periodRange` for day and month; cap check sums all rows in the range across
  models and scopes; a monthly request cap counts `reservedRequests`; handler result uses
  `username`; a site handler's replacement `username` is used for the rows; `quotaSnapshot`
  returns `{ username, rows }`
- **`turn-loop.test.js`**: no provider → `AI_NO_PROVIDER` and no reservation; the reservation
  identity carries the chosen provider, model, and thread scope; settle uses the same identity
  and the resolved scope label; lease-held path rolls back on the same identity
- **new `usage-api.test.js`**: `per` validation (default `day`, other values 400); cards, byUser, byModel, byScope, history
  shapes; sorting; one vs several scope types in `scopeTypes`; labels from `onAiScopeTypes`,
  first handler wins, raw type when unnamed, a throwing handler does not break the response;
  quota rows use caps of the matching period only
- **retention**: the purge runs at startup and again after 24 hours (fake timers), re-reads
  `retentionDays`, and skips when it is `0`
- **`settings.test.js`**: `appConfig.ai` is ignored (the app.conf `debugDumps` case is replaced
  by "app.conf ai section has no effect"); the daily caps are read from `maxUserRequestsPerDay`
  and `maxUserTokensPerDay`, and the old keys are ignored; for each of the three caps, `0` or
  negative adds no cap and a positive value adds it; missing gives the code default (200,
  400000, no cost cap)
- **`quota.test.js`** (`0` means no cap): with both daily caps at `0`, turns run (today they are
  refused)
- **`quota.test.js`** (cost cap): a user over `maxUserCostPerMonth` this month is refused; costs from
  last month do not count; `costUnknown` in the month is refused with the "partly unknown"
  message while the cap is set, and allowed when it is not
- **`hello-ai.test.js`**: the `onAiScopeTypes` handler names `hello-ai`
- existing tests that use `subject` are updated

Manual: the page in Day and Month mode on the jPulse site (scope types from `hello-ai` only), and
on BubbleMap after its follow-up (one scope type, "Map" header).


## 13. Out of Scope

- per-user caps from a site quota handler on the usage page (TD-20)
- a date picker or previous/next navigation of the whole page (TD-19)
- a plugin `app.conf` layer (TD-23)
- manual purge of usage numbers (TD-21)
- per-model caps (TD-22)
- a site-wide monthly cap and business-unit budgets (TD-24)
- `week` period (W-223 TD-09; now one case in `periodRange`)
- the BubbleMap repo changes (§11)
- dropping the old `aiUsage` documents from code (§10)
- framework `docs/CHANGELOG.md` and Latest Release Highlights (plugin release)


## 14. Deferred Items and Technical Debt

Deferred items are recorded in W-223 §20, the single ai-core sequence. That section holds TD-19
through TD-24 from this redesign (usage-page navigation, per-user caps on the page, manual purge,
per-model caps, a plugin `app.conf` layer, and site-wide and business-unit budgets) and TD-25
(partly static HTML pages).


## 15. Implementation Plan

Seven phases, each ending with the ai-core unit suite green
(`npx jest plugins/ai-core/webapp/tests/unit --runInBand` from the framework root, plus
`plugins/hello-ai/webapp/tests/unit` where touched). Phases 1 to 4 are server-only and leave the
old page working against a changed API until phase 5, so they ship together as 1.0.19, not
separately.

### Phase 1: usage record and quota core

- `webapp/model/aiUsage.js`: new indexes (§4.2); `reserve`, `rollbackReserve`, `settle` on the
  identity (§4.3); `sumForUser` (§4.4). `getByKey`, `listByPeriod`, `listRecent`, and the `key`
  helpers are removed
- `webapp/utils/agent/quota.js`: `periodRange`; cap checks and `quotaSnapshot` through
  `sumForUser`; `username` replaces `subject`; reserve and settle on `quota.identity`;
  `readDimension` reads the summed totals
- `webapp/utils/agent/settings.js`: `appConfig.ai` no longer read (§9.2); `AI_CONFIG_DEFAULTS`
  and `mergeSettings()` use `maxUserRequestsPerDay` and `maxUserTokensPerDay`;
  `maxUserCostPerMonth` cap; `0` or negative adds no cap, for all three (§5.5); `@description`
  updated
- tests: `usage-update.test.js` rewritten; `quota.test.js` and `settings.test.js` updated, with
  the cost cap cases

### Phase 2: turn loop order and hook contract

- `webapp/utils/agent/turnLoop.js`: provider/model chosen before `onAiQuotaCheck` (§5.1);
  `thread`, `provider`, `model` in the check context; the last `resolved.scope` kept and passed
  to `onAiQuotaSettle`; lease-held rollback on the same identity
- `webapp/controller/aiCore.js`: hook catalog: `onAiQuotaCheck` / `onAiQuotaSettle` descriptions
  ("username") and `contextKeys`; new `onAiScopeTypes` entry (§9.1); capability probe returns
  `{ username, rows }`; AI Agent tab schema: `maxRequestsPerDay` and `maxTokensPerDay` renamed
  to `maxUserRequestsPerDay` and `maxUserTokensPerDay` (labels point at the new translation
  keys), `maxUserCostPerMonth` added after them
- `webapp/utils/transport/ws.js`: pass-through checked; it only forwards `usageModel`
- tests: `turn-loop.test.js` (order, identity, scope label, no provider → no reservation),
  `ws-bridge.test.js` and `thread-api.test.js` where they assert `subject`

### Phase 3: daily turn purge

- `webapp/controller/aiCore.js`: purge function shared by startup and a 24-hour `unref()` timer,
  re-reading `retentionDays` on each run (§6); `retentionDaysHelp` on the field
- tests: fake timers, startup run, second run after 24 hours, `0` skips

### Phase 4: usage API

- `webapp/model/aiUsage.js`: `summarize` (one `$facet`) and `history` (§4.4)
- `webapp/controller/aiCore.js`: `apiUsage` with `per` validation, cards (including the two
  `aiTurns` counts), byUser with quota rows of the matching period, byModel, byScope, scope type
  labels from `onAiScopeTypes`, history, sorting, logging (§7)
- tests: new `usage-api.test.js`

### Phase 5: usage page, panel, translations

- `webapp/view/admin/ai-usage.shtml`: rebuilt page (§8): header with Day/Month `jp-btn-group` and
  settings link, cards, by user, by provider/model, adaptive scope table, history, empty lines,
  formatting; admin card description
- `webapp/view/jpulse-common.js`: `/quota` formats cost rows as `$used / $limit` (§5.5)
- `webapp/translations/en.conf`, `de.conf`: new `view.ui.ai.usage.*` strings, `subject` removed,
  intro reworded; `config.maxRequestsPerDay` and `config.maxTokensPerDay` replaced by
  `config.maxUserRequestsPerDay` and `config.maxUserTokensPerDay` with "per user" labels, plus
  help keys for both; `config.maxUserCostPerMonth`, `config.maxUserCostPerMonthHelp`,
  `config.retentionDaysHelp`
- `plugins/hello-ai/webapp/controller/helloAi.js`: `onAiScopeTypes` handler (§9.1)
- tests: `hello-ai.test.js` for the handler; `panel-strip.test.js` or the slash test that covers
  `/quota`, if one asserts the line format

### Phase 6: documentation

- `plugins/ai-core/README.md`, `plugins/ai-core/docs/README.md`: usage page, the three per-user
  caps (`0` means no cap; cost cap in whole dollars, calendar month in server time, refused
  while the month has unpriced usage), `onAiScopeTypes` example, quota hook result `{ username, caps }`, daily retention, no
  `app.conf` settings, upgrade note with both mongosh steps and their order (§10)
- `docs/plugins/creating-plugins.md`: plugin configuration convention (§9.3)
- `docs/dev/design/W-223-ai-agent.md`: §9.7, §10.1, §10.2, §17 point here; TD-09 note; revision
  entry. TD-19 through TD-25 are in that document's §20.
- this document: `### As Built` under Status for anything that came out differently

### Phase 7: manual verification

On the jPulse site, with `ai-mock` (it has priced models and `mock-unpriced`):

1. note the two daily caps on the AI Agent tab; stop the app, run both mongosh steps (§10),
   start; `initialize()` logs no index error, and the AI Agent tab shows the same cap values
   under the new labels
2. a few turns as two users on `hello-ai`; the page in Day and Month mode shows cards, by user,
   by provider/model, the scope table with one type ("Hello AI" header), history
3. a turn on `mock-unpriced`: its model row shows "no price entry", the cost card shows "some
   costs unknown"
4. `maxUserCostPerMonth` set low: a user over it is refused; with the unpriced turn in the month,
   the "partly unknown" refusal; set to `0`: turns run again
5. `maxUserRequestsPerDay` reached: refused; the by-user quota cell shows over quota in Day mode;
   set to `0`: turns run again, and the field shows "0: no cap." as help
6. `/quota` in the panel shows the cost row as `$used / $limit`
7. switch persists in the URL across reload; no console errors; light and dark theme

On BubbleMap, after its follow-up (§11): one scope type, "Map" header, map names in the cells.
