# W-147: Make Config Schema Extensible

## Status
🕑 PENDING

## Overview

Enable site and plugin developers to extend the site config schema in a data-driven way, and move selected "change over time" settings from app.conf into the config model. Initial scope: add a General tab with roles and adminRoles; make ConfigModel schema extendable so plugins/sites can define new config tabs without modifying framework code.

## Problem Statement

1. **Config schema is fixed.** Adding new config sections (e.g. business-specific: employee status, employee type, service accounts) requires editing `webapp/model/config.js` and `webapp/view/admin/config.shtml`. There is no plugin/site extension mechanism like UserModel's `extendSchema()`.

2. **Roles live in app.conf.** `controller.user.adminRoles` (and the effective list of assignable roles) are in app.conf. Site admins who want to add roles (e.g. eng-manager) must edit app.conf and redeploy. These settings change relatively frequently and should be editable via Admin UI.

## Solution

1. **Extendable config schema** (same pattern as UserModel): ConfigModel gets `baseSchema`, `schemaExtensions`, `extendSchema()`, `initializeSchema()`. Schema extensions define **tab-level** blocks: each extension adds a new top-level block under `data.*` that becomes its own tab in the admin config UI. Framework tabs: General, Email, Broadcast, Manifest; plugins/sites add tabs via `ConfigModel.extendSchema({ blockKey: { ... } })`.

2. **General tab (first / leftmost)** with two fields:
   - **roles** – array of role codes at this config level (the list of roles that can be assigned to users; e.g. when an admin edits a user profile, she can assign any of these).
   - **adminRoles** – array of role codes that count as admin (subset of roles).

3. **Bootstrap from schema defaults when missing.** On app launch, if the global config document does not have `data.general` (or roles/adminRoles), initialize it from **schema defaults** (hard-coded `['user','admin','root']` and `['admin','root']`). No read from app.conf; schema is the single source for bootstrap.

4. **Single source of truth at runtime.** All consumers of roles and adminRoles read **only** from site config (ConfigModel). No app.conf dependency at bootstrap or runtime.

5. **app.conf.** Roles and adminRoles are **not** needed in app.conf; defaults are hard-coded in the config schema. `controller.user.adminRoles` (and any roles list) in app.conf can be **removed** or left as deprecated/no-op for legacy tooling; framework does not read them.

6. **Scope.** Implement single global site config only. Design (schema, API, parent/id) so a future hierarchy (e.g. global → mainCampus, eastCoast, europe) or override mode is not prevented.

---

## Objectives

1. **Primary:** Config schema extendable for site/plugin developers; admin config UI data-driven from schema (new tabs from extensions without editing config.shtml).
2. **Secondary:** Roles and adminRoles in config model (General tab), editable via Admin UI; bootstrap from schema defaults when missing; consumers read only from config.

**Out of scope for this work item:**
- Config hierarchy implementation (global + children); only ensure design does not block it.
- Other app.conf settings (signup/login toggles, password policy, site name, i18n/theme, etc.); limit to "change over time" and roles only.

---

## Schema Design

### ConfigModel: baseSchema + extendSchema

Mirror UserModel pattern:

- **baseSchema** – framework definition including `data.general`, `data.email`, `data.broadcast`, `data.manifest`.
- **schema** – computed: baseSchema + schemaExtensions (deep-merged).
- **schemaExtensions** – array of extension objects (order preserved).
- **extendSchema(extension)** – append extension, recompute schema.
- **initializeSchema()** – (re)compute schema from baseSchema + schemaExtensions.

Extensions are **tab-scope**: each extension is a top-level block under `data`, e.g. `data.employees`, `data.serviceAccounts`. The admin config UI renders one tab per top-level block in `data` (framework blocks + extended blocks). Extension can include `_meta` (e.g. tabLabel, order) for display.

### General block (framework)

```javascript
data: {
    general: {
        roles:       { type: 'array', default: ['user', 'admin', 'root'] },   // role codes assignable at this level
        adminRoles: { type: 'array', default: ['admin', 'root'] }            // subset that count as admin
    },
    email: { ... },
    broadcast: { ... },
    manifest: { ... }
}
```

- **Default values** for new/migrated global config: `roles: ['user','admin','root']`, `adminRoles: ['admin','root']` (hard-coded in schema; no app.conf dependency).
- **Tab order:** Same pattern as user model (W-107: adminCard.order / userCard.order). Sort all tabs by **order: N**: framework blocks have implicit order (general=0, email=10, broadcast=20, manifest=30); extended blocks use **_meta.order** (default 999). Lower order = earlier tab. When order is equal, sort by block key (alpha). So plugin/site controls sequence with `_meta.order`; no alpha-only rule—order wins.

### Bootstrap / ensureGeneralDefaults

On app launch (or when loading global config), if `data.general` is missing or incomplete:

- Seed from **schema defaults** only: `roles: ['user','admin','root']`, `adminRoles: ['admin','root']` (hard-coded; no read from app.conf).
- Same concurrency-safe pattern as `ensureManifestDefaults`: read current doc, merge existing > overrides (if any) > schema defaults.

After `data.general` exists, do not overwrite it on subsequent runs.

### Validation

- **adminRoles ⊆ roles:** On save (config update), validate that every value in `adminRoles` is in `roles`. Reject otherwise.
- **Self-lockout:** An admin cannot remove an adminRole that she herself has. If the current user has role X and X is in `adminRoles`, the UI and/or API must prevent removing X from `adminRoles` (or require at least one other admin to remain). Validation or UI rule must enforce this.

---

## Consumer Changes

All current readers of `controller.user.adminRoles` (and any roles list) must read **only** from site config (ConfigModel), not from app.conf, at runtime.

**Consumers to update (read from config):**

- `webapp/routes.js` – adminRoles for admin routes
- `webapp/controller/auth.js` – isAuthorized, requireRole
- `webapp/controller/user.js` – admin checks, role change validation
- `webapp/controller/cache.js` – adminRoles
- `webapp/controller/health.js` – adminRoles for metrics/status
- `webapp/controller/handlebar.js` – isAdmin
- `webapp/controller/websocket.js` – requireRoles for admin namespace
- `webapp/model/user.js` – admin role counts, role aggregation
- `webapp/utils/site-controller-registry.js` – adminRoles for middleware

**Resolution:** At bootstrap (or first request after config load), resolve "effective roles" and "effective adminRoles" from the global config document and expose via a small helper or cached value so controllers/models do not hit the DB on every request. If config has no `data.general` yet, run ensureGeneralDefaults (seed from schema defaults) then use config. **Multi-server requirement:** Cache implementation must work in multi-server multi-instance deployment (e.g. per-instance cache with DB as source of truth, re-read when needed after config update; or shared cache such as Redis so all instances see the same values). Specific implementation is flexible; it must not assume single process.

**UserModel integration:** Effective assignable roles = **site roles (config data.general.roles) + additional plugin/site extended roles**. When config supplies `data.general.roles`, UserModel validation and `getEnum('roles')` use config roles as the base; plugin/site schema extensions add more roles to the effective list (union of config roles + extended enum).

---

## Admin Config UI

- **Tab order:** Sort by **order: N** (same as user model profile cards). Framework tabs: implicit order (general=0, email=10, broadcast=20, manifest=30). Extended tabs: **_meta.order** (default 999). Tie-break: block key (alpha).
- **General tab:** Form for `roles` and `adminRoles` (array of strings). UI choice: tag input, one-per-line, or multi-select. adminRoles should be constrained to subset of roles (e.g. multi-select from current roles list).
- **Validation in UI:** Enforce adminRoles ⊆ roles; prevent current user from removing her own admin role(s) (disable or hide remove for those, or show warning and block save).
- **All data-driven:** Tab list and **tab panel content** are both data-driven from ConfigModel.getSchema(), same as existing user config (admin/user profile cards from UserModel schema). One tab per key under `data`; each panel renders its fields from the schema for that block (framework blocks: general, email, broadcast, manifest; extended blocks: plugin/site blocks). No hard-coded panel markup per tab—render from schema so new tabs from plugins/sites work without editing config.shtml.

---

## app.conf

- **Roles and adminRoles are not needed in app.conf.** Defaults are hard-coded in the config schema; ensureGeneralDefaults uses schema defaults only. **Remove** `controller.user.adminRoles` (and any roles list) from app.conf in this release (once code stable); framework does not read them.
- **Scope of removal:**
  - Only `webapp/app.conf` (framework) defines `controller.user.adminRoles`
  - Site app.conf is generated from `templates/webapp/app.conf.dev.tmpl` and `app.conf.prod.tmpl`
    - those templates do **not** contain controller.user, adminRoles, or roles
  - `bin/` has no references to controller.user.adminRoles or app.conf roles
  - `templates/` has none
  - `site/` and `plugins/` have no references to controller.user.adminRoles or app.conf roles
    - site examples (e.g. hello-websocket requireRoles) pass role requirements to the framework
    - the framework resolves the actual admin list from config
  - No changes required in bin/, templates/, site/, or plugins/ for W-147

---

## Extension API (for plugins/sites)

```javascript
ConfigModel.extendSchema({
    myBlock: {
        _meta: {
            plugin: 'my-plugin',   // or site
            tabLabel: 'My Settings',
            order: 50
        },
        field1: { type: 'string', default: '' },
        field2: { type: 'array', default: [] }
    }
});
```

- **Scope:** Extension defines a **new tab** (new top-level block under `data`). No requirement to extend an existing tab in this design.
- **When:** Extensions applied during bootstrap (same as UserModel), before config is read.
- **Merge:** Deep merge into schema; block key must not conflict with framework blocks (general, email, broadcast, manifest). Plugin/site should use a unique prefix or namespace (e.g. plugin name) for block key.
- **Tab order:** Use **_meta.order** (number; default 999). Same as user model (W-107: adminCard.order / userCard.order). Lower order = earlier tab. Framework tabs use implicit order (0, 10, 20, 30); extended tabs use _meta.order so plugin/site controls sequence (e.g. order: 50 between broadcast and manifest).

---

## Backward Compatibility

Not a requirement for this work item; deployer controls the two existing sites. Migration: ensure General defaults run on first launch so global config gets `data.general`; thereafter consumers use config only.

---

## Future: Hierarchy / Override Mode

Config documents already have `parent` in schema. Design and implementation must not prevent:

- Multiple config documents (e.g. global, mainCampus, eastCoast, europe).
- Resolution of "effective" config for a scope (e.g. merge parent + child, or child overrides parent).
- roles/adminRoles per scope (e.g. global defines base list, child adds or overrides).

v1 implementation: single global config document only; resolution by config id 'global'. API and schema remain scope-ready (e.g. getConfig(scopeId), getEffectiveRoles(scopeId)) if that simplifies future hierarchy.

### Future: root vs admin

Currently there is no distinction between root and admin role; both have full admin access. In future:

- **root** – access to everything (no scope limit).
- **admin** – access to her site scope only (self and children in the config hierarchy).

When hierarchy and scope-aware auth are implemented, consumers (routes, AuthController, config UI, etc.) will need to treat root as global and admin as scope-bound.

---

## Deliverables (checklist)

- [ ] ConfigModel: baseSchema, schemaExtensions, extendSchema(), initializeSchema(), getSchema() (mirror UserModel).
- [ ] Add data.general.roles and data.general.adminRoles to baseSchema with defaults.
- [ ] ensureGeneralDefaults(id) (or extend ensureManifestDefaults) to seed from schema defaults when data.general missing (no app.conf read).
- [ ] All roles/adminRoles consumers read from config only; bootstrap/resolution helper or cached effective values.
- [ ] Admin config view: General tab first; form for roles and adminRoles; validation adminRoles ⊆ roles; prevent self-lockout.
- [ ] Admin config view: data-driven tabs and panel content from schema (all panels render from schema, same as user config; framework + extended blocks).
- [ ] Validation on config save: adminRoles ⊆ roles; self-lockout check (admin cannot remove her own admin role).
- [ ] app.conf: remove controller.user.adminRoles in this release (once code stable); no framework read. bin/, templates/, site/, plugins/: no changes (verified no references to roles/adminRoles).
- [ ] UserModel: use config roles for validation/getEnum when config general present (if applicable).
- [ ] Tests: unit for ConfigModel schema init, ensureGeneralDefaults, validation; integration for admin edit roles and consumer behavior.
- [ ] Docs: plugin/site extension API for config schema (extendSchema, tab scope).

---

## Implementation Plan

### Phase 1: ConfigModel schema extensibility

**Goal:** Mirror UserModel pattern so ConfigModel has baseSchema, schemaExtensions, extendSchema(), initializeSchema(), getSchema().

1. **Rename and split schema in `webapp/model/config.js`:**
   - Copy current `static schema` into `static baseSchema` (full structure including `_id`, `parent`, `data`, `createdAt`, etc.).
   - Add `data.general` to baseSchema (see Phase 2).
   - Set `static schema = null` (computed).
   - Add `static schemaExtensions = []`.
   - Implement `static initializeSchema()`: deep-merge baseSchema with each entry in schemaExtensions (use CommonUtils.deepMerge, same as UserModel), assign result to `schema`.
   - Implement `static applySchemaExtension(schema, extension)`: return CommonUtils.deepMerge(schema, extension).
   - Implement `static extendSchema(extension)`: push extension to schemaExtensions, then if schema !== null call initializeSchema().
   - Implement `static getSchema()`: return `this.schema ?? this.baseSchema` (so callers can use getSchema() and never see null).
   - Ensure all existing references to `ConfigModel.schema` in the same file (validate, applyDefaults, ensureManifestDefaults) use `this.getSchema()` or the computed `this.schema` after init.

2. **Bootstrap: call ConfigModel.initializeSchema()** in `webapp/utils/bootstrap.js` after UserModel.initializeSchema() (e.g. new Step 15.1). That way plugins can call ConfigModel.extendSchema() during their init, and ConfigModel schema is finalized after plugins load. Ensure ConfigModel is imported and available globally before that step (may need to load ConfigModel and set global.ConfigModel before or with ConfigController in Step 17, and call ConfigModel.initializeSchema() after Step 15).

3. **Tests:** Unit test that extendSchema() merges into schema, initializeSchema() applies extensions in order, getSchema() returns base when schema is null.

---

### Phase 2: General block and ensureGeneralDefaults

**Goal:** Add `data.general.roles` and `data.general.adminRoles` to baseSchema; implement ensureGeneralDefaults and wire it into config load path.

1. **Add `data.general` to baseSchema** in `webapp/model/config.js`:
   - `general: { roles: { type: 'array', default: ['user', 'admin', 'root'] }, adminRoles: { type: 'array', default: ['admin', 'root'] } }`.
   - Place `general` before `email` in `data` so tab order (General first) matches.

2. **applyDefaults:** In `applyDefaults()`, add block for `data.general`: if `!result.data.general` init `result.data.general = {}`; apply defaults for `roles` and `adminRoles` from baseSchema (or literal defaults ['user','admin','root'] and ['admin','root']).

3. **ensureGeneralDefaults(id, overrides = {}):** New method in ConfigModel (same pattern as ensureManifestDefaults):
   - Read current document by id.
   - If document not found, throw.
   - Build `completeGeneral` from: existing `data.general` > overrides > **schema defaults** (hard-coded `roles: ['user','admin','root']`, `adminRoles: ['admin','root']`). No read from app.conf.
   - Atomic update: `$set: { 'data.general': completeGeneral, updatedAt: new Date() }`, `$inc: { saveCount: 1 }`.
   - Return `findById(id)`.
   - Concurrency: same as ensureManifestDefaults (first write wins; existing values preserved).

4. **When to call ensureGeneralDefaults:** In `webapp/controller/health.js` inside `initialize()`:
   - After loading global config and after ensureManifestDefaults (if called), check whether `this.globalConfig?.data?.general` is missing or incomplete (e.g. missing `roles` or `adminRoles`).
   - If so, call `ConfigModel.ensureGeneralDefaults(defaultDocName)` (no overrides; uses schema defaults only) and assign result to `this.globalConfig`.
   - Ensures at app launch global config has data.general; thereafter no overwrite.

5. **validate():** Add validation for `data.general`: if present, `roles` must be array of strings, `adminRoles` must be array of strings; and every element of `adminRoles` must be in `roles` (adminRoles ⊆ roles). Reject with clear error if not.

6. **updateById():** When building `setOperation.$set`, add handling for `updateData.data.general`: set `data.general.roles` and `data.general.adminRoles` (same pattern as manifest). Optionally run general validation before update (Phase 6).

7. **Tests:** Unit test ensureGeneralDefaults: merges existing > overrides > schema defaults; preserves existing data.general when already present; atomic update.

---

### Phase 3: Effective roles cache and API

**Goal:** Consumers read roles and adminRoles only from site config; no per-request DB read. **Multi-server:** Implementation must work in multi-server multi-instance deployment (per-instance cache with DB as source of truth, or shared cache e.g. Redis); specific approach is flexible.

1. **Cache:** Add in-memory cache for global scope’s effective roles in **ConfigModel**:
   - `ConfigModel._effectiveGeneralCache = { roles: [], adminRoles: [], configId: null }` (or similar).
   - Populate when global config is loaded: in **HealthController.initialize()**, after ensureManifestDefaults and ensureGeneralDefaults, call `ConfigModel.setEffectiveGeneralCache(globalConfig.data.general)` (or set `ConfigModel._effectiveGeneralCache` from `this.globalConfig.data.general`).
   - Invalidate on config update: in **ConfigController** PUT handler (or ConfigModel.updateById), after successful update of default doc, call `ConfigModel.clearEffectiveGeneralCache()` or `ConfigModel.setEffectiveGeneralCache(updatedDoc.data.general)` so next getEffective* returns new values.

2. **API for consumers:**
   - Option A (recommended): `ConfigController.getEffectiveAdminRoles()` and `ConfigController.getEffectiveRoles()` (sync) return cached arrays for default scope. If cache is empty (e.g. test, or first request before health init), optionally fall back to async load: fetch config, ensureGeneralDefaults if needed, fill cache, then return (may require async variant or ensure bootstrap always runs first).
   - Option B: ConfigModel.getEffectiveAdminRoles(scopeId), getEffectiveRoles(scopeId) async; internally read config (and cache). Consumers would await; more invasive.
   - Implement Option A: ConfigController holds cache; getEffectiveAdminRoles() / getEffectiveRoles() return cache; HealthController.initialize() sets cache after loading global config; ConfigController.get() when returning config for default doc can also ensure cache is set (so first request to GET config fills cache if health init hasn’t run yet).

3. **Bootstrap order:** Ensure HealthController.initialize() runs before any route that needs adminRoles (it already does). So cache is populated at startup for normal app.

4. **Tests:** Unit test that getEffectiveAdminRoles() and getEffectiveRoles() return expected values after setEffectiveGeneralCache(); and return fallback when cache not set (define expected behavior for tests).

---

### Phase 4: Consumer updates (read from config only)

**Goal:** Every place that reads `global.appConfig?.user?.adminRoles` or `global.appConfig?.controller?.user?.adminRoles` uses ConfigModel.getEffectiveAdminRoles() (or equivalent) instead. Cache lives in ConfigModel so HealthController can set it at Step 10 before ConfigController exists at Step 17.

1. **Replace in each file:**
   - `webapp/routes.js`: `const adminRoles = ConfigModel.getEffectiveAdminRoles();` (ensure ConfigModel is imported). Use for requireRole(adminRoles) on admin routes.
   - `webapp/controller/auth.js`: Where isAuthorized or requireRole use adminRoles, get them via ConfigModel.getEffectiveAdminRoles().
   - `webapp/controller/user.js`: All adminRoles usages (admin checks, role change validation) → ConfigModel.getEffectiveAdminRoles().
   - `webapp/controller/cache.js`: adminRoles → ConfigModel.getEffectiveAdminRoles().
   - `webapp/controller/health.js`: adminRoles for metrics/status → ConfigModel.getEffectiveAdminRoles() (or from this.globalConfig.data.general.adminRoles if already loaded).
   - `webapp/controller/handlebar.js`: isAdmin / adminRoles → ConfigModel.getEffectiveAdminRoles().
   - `webapp/controller/websocket.js`: requireRoles for admin namespace → ConfigModel.getEffectiveAdminRoles().
   - `webapp/model/user.js`: countAdminUsers, role aggregation, etc. → ConfigModel.getEffectiveAdminRoles() (sync API required; ConfigModel is available when UserModel runs).
   - `webapp/utils/site-controller-registry.js`: adminRoles for middleware → ConfigModel.getEffectiveAdminRoles().

2. **Fallback when cache empty:** Define policy (e.g. return ['admin','root'] if cache not yet populated so tests and edge cases don’t break). Document in code.

3. **Tests:** Existing tests that mock appConfig.user.adminRoles should instead mock or set ConfigModel effective-general cache (or stub ConfigModel.getEffectiveAdminRoles). Update unit/integration tests accordingly.

---

### Phase 5: Admin config UI – General tab

**Goal:** General tab is first (left); form for roles and adminRoles; populate and save; validation in UI.

1. **Tab order in `webapp/view/admin/config.shtml`:**
   - Change tabs array so General is first: `{ id: 'general-tab', label: '…', panelId: 'general-panel' }`, then email, broadcast, manifest.
   - Default selected tab: `'general-tab'` instead of `'email-tab'`.

2. **HTML:** Add `general-panel` before `email-panel`. Inside: heading/description (e.g. "General – Roles and access"), two form sections:
   - **Roles:** Input for array of strings (e.g. tag input, or textarea one role per line, or comma-separated). Use consistent class `local-edit-field` and id/name that map to `data.general.roles`.
   - **Admin roles:** Same style; values must be subset of roles (multi-select from current roles list, or tag input with validation). Ensure id/name for `data.general.adminRoles`.

3. **JavaScript in same file:**
   - In `populateForm(config)`: read `data.general`; populate roles and adminRoles fields (e.g. join arrays to string for textarea, or set tag input values).
   - In `getFormData()`: add `general: { roles: [...], adminRoles: [...] }` parsed from form (split by newline or comma, trim, filter empty).
   - In `localGetDirtySnapshot` / dirty tracking: include general field ids so changes to roles/adminRoles mark form dirty.
   - Client-side validation before submit: adminRoles ⊆ roles (every admin role in roles list); if not, show error and prevent submit.
   - Self-lockout: If current user’s roles include an admin role, do not allow removing that role from adminRoles (disable that option or show warning and block save). Require current user from session (e.g. passed in template or from /api/1/user/me); compare with adminRoles and disable removing self’s admin roles.

4. **i18n:** Add keys for General tab label and field labels (e.g. `view.admin.config.general.label`, `view.admin.config.general.roles`, `view.admin.config.general.adminRoles`) in `webapp/translations/en.conf` and `de.conf`.

5. **Tests:** Manual or integration test: load config page, switch to General, edit roles and adminRoles, save; verify PUT payload and response; verify validation (adminRoles not subset of roles rejected; self-lockout prevented).

---

### Phase 6: Config controller – validation and self-lockout

**Goal:** Server-side validation on config update: adminRoles ⊆ roles; prevent self-lockout.

1. **ConfigController PUT handler** (or ConfigModel.updateById):
   - Before update, validate `data.general` if present: roles and adminRoles are arrays; every element of adminRoles is in roles.
   - Self-lockout check: get current user from req.session; if user has role X and X is in current adminRoles, and the update would remove X from adminRoles, reject (e.g. 400 "Cannot remove your own admin role"). Compare incoming data.general.adminRoles with current config; if current user’s admin roles are being reduced, reject.
   - Return clear error messages for validation and self-lockout.

2. **ConfigModel.validate()** (or dedicated validateGeneral): Already enforce adminRoles ⊆ roles in Phase 2; ensure it is called from update path. Self-lockout is contextual (requires current user), so enforce in controller, not in model.

3. **Tests:** Unit test ConfigModel validation (adminRoles ⊆ roles). Integration or unit test controller: self-lockout attempt returns 400; valid update succeeds.

---

### Phase 7: UserModel integration (optional)

**Goal:** Effective assignable roles = site roles (config data.general.roles) + additional plugin/site extended roles. UserModel validation and getEnum('roles') use this union.

1. **UserModel.getEnum('roles'):** Effective roles = ConfigModel.getEffectiveRoles() (config/site roles) ∪ plugin/site extended roles from schema. If config supplies roles, use config roles as base and merge with extended enum from UserModel schema extensions. Requires UserModel to call ConfigModel.getEffectiveRoles() (sync, cached) and combine with schema-extended roles.

2. **UserModel validation:** When validating user document (create/update), roles field must be subset of effective roles. Effective roles = config roles + plugin/site extended roles (union). Apply in validate or in controller before save.

3. **Tests:** Unit test getEnum('roles') returns config roles when cache is set; returns schema enum when cache empty. Test user create/update with role not in config fails validation.

---

### Phase 8: app.conf and bootstrap

**Goal:** Remove app.conf dependency for roles/adminRoles; ConfigModel.initializeSchema() runs at bootstrap.

1. **app.conf:** Remove `controller.user.adminRoles` from `webapp/app.conf` in this release (once code stable). No framework read; schema defaults are the single source for bootstrap.

2. **Bootstrap:** In `webapp/utils/bootstrap.js`, ensure ConfigModel is loaded and ConfigModel.initializeSchema() is called after UserModel.initializeSchema() (and after plugins load) so that ConfigModel.schema is final before any config read. If ConfigModel is not yet global, add step to load ConfigModel and set global.ConfigModel; then call initializeSchema(). Order: UserModel available → plugins loaded → UserModel.initializeSchema() → ConfigModel.initializeSchema() → ConfigController.initialize() → … .

---

### Phase 9: Data-driven tabs and panels (extensions)

**Goal:** Admin config view renders tabs and **panel content** from schema (all data-driven, same as existing user config profile cards). Extended blocks (from plugins/sites) become new tabs with rendered panels without editing config.shtml.

1. **Schema in API:** ConfigController.get (or config get response) returns schema when `includeSchema=1`. Ensure response includes full getSchema() (or data keys from schema) so client can render tab list and panel content. Tabs descriptor: array of { id, label, panelId, blockKey } for each top-level key under data (general, email, broadcast, manifest + extended keys). Extended keys use _meta.tabLabel or key as label.

2. **Admin config view:** Fetch config with includeSchema=1. Build tabs array from schema (one tab per key under data). **All panels data-driven:** Each tab panel renders its fields from the schema for that block—same pattern as user profile (admin/user cards from UserModel schema). Framework blocks (general, email, broadcast, manifest) and extended blocks all use the same render-from-schema approach; no hard-coded panel markup per tab. Form fields, labels, and validation come from schema (type, default, enum, _meta, etc.).

3. **Order:** Tab order = sort all blocks by **order: N** (same as user model). Framework blocks: implicit order (general=0, email=10, broadcast=20, manifest=30). Extended blocks: **_meta.order** (default 999). Tie-break: block key (alpha). Build sorted tabs array from schema.

4. **Tests:** Unit test that schema with one extension produces tabs including the new block with rendered panel; label from _meta.tabLabel.

---

### Phase 10: Tests and documentation

1. **Unit tests:**
   - ConfigModel: baseSchema, extendSchema, initializeSchema, getSchema (Phase 1).
   - ConfigModel: ensureGeneralDefaults merge order and idempotence (Phase 2).
   - ConfigModel: validate data.general (adminRoles ⊆ roles) (Phase 2/6).
   - ConfigController: getEffectiveAdminRoles / getEffectiveRoles return cache (Phase 3).
   - ConfigController: self-lockout rejection (Phase 6).

2. **Integration tests:**
   - GET /api/1/config/_default returns data.general after ensureGeneralDefaults.
   - Admin config page: General tab visible first; save general updates config; validation errors return 400.
   - Consumers (e.g. admin route) use config adminRoles (no app.conf dependency at runtime).

3. **Documentation:**
   - Plugin/site docs: how to call ConfigModel.extendSchema({ blockKey: { _meta, fields } }) to add a config tab; that extensions are tab-scope; when (bootstrap) and naming (avoid conflicting with general, email, broadcast, manifest).
   - Update api-reference or config docs with getEffectiveAdminRoles / getEffectiveRoles and General tab fields.

---

### Implementation order summary

| Order | Phase | Description |
|-------|--------|-------------|
| 1 | Phase 1 | ConfigModel baseSchema, extendSchema, initializeSchema, getSchema |
| 2 | Phase 2 | data.general in baseSchema; ensureGeneralDefaults; applyDefaults/validate/updateById |
| 3 | Phase 3 | Effective roles cache + ConfigController.getEffectiveAdminRoles/Roles |
| 4 | Phase 4 | All consumers use config only (replace app.conf reads) |
| 5 | Phase 8 | app.conf: remove adminRoles (this release); bootstrap ConfigModel.initializeSchema |
| 6 | Phase 5 | Admin UI General tab (HTML, JS, i18n) |
| 7 | Phase 6 | Server-side validation and self-lockout on config update |
| 8 | Phase 7 | UserModel getEnum/validation from config (optional) |
| 9 | Phase 9 | Data-driven tabs and panels from schema (all panels render from schema, same as user config) |
| 10 | Phase 10 | Tests and docs |

---

## References

- UserModel schema extension: `webapp/model/user.js` (baseSchema, extendSchema, initializeSchema).
- Config manifest bootstrap: `ConfigModel.ensureManifestDefaults` in `webapp/model/config.js`.
- Admin config view: `webapp/view/admin/config.shtml`.
- app.conf: `controller.user.adminRoles` can be removed (no framework read; schema defaults used).
- W-107: Data-driven user profile extensions (schema + _meta pattern).
