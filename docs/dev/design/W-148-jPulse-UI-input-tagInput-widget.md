# W-148: jPulse.UI.input.tagInput Widget

## Status
- **Phase 1:** ✅ Complete
- **Phase 2:** ✅ Complete (setAllValues/getAllValues)
- **Phase 3:** ✅ Complete (data-driven extension panels from schema)
- **Phase 4:** ✅ Complete (unified schema-driven tabs and panels: renderTabsAndPanelsFromSchema)

## Overview

Client-side widget to manage a list of items (tags/chips) in a single input field: type a word and press Enter to add a tag; each tag has a small "x" to remove. Value stored as comma-space separated string in the same element; init and read like any HTML input (don't make me think). Initial use: site config editor General => roles, adminRoles.

## Objectives

- Easier way to enter list items on configuration (e.g. roles list).
- Single HTML input enhanced by widget; value in that element (comma-space string).
- New input field type for data-driven user/config edit (e.g. type: 'tagInput' or 'tags').

## Features

- Input field looks like an HTML input field.
- Type a word (e.g. eng-manager) and hit Enter → shows up as a tag with rounded corners.
- Items show up in the order entered.
- Each item has a small "x" on the right to delete.
- Single element for init and read; widget syncs value back on every change (comma-space).

## Design

### Name and namespace

- **Widget:** `jPulse.UI.input.tagInput`
- **Namespace:** `jPulse.UI.input.*` for future input widgets (e.g. multiSelect).

### Single-element approach (don't make me think)

- Enhance one existing `<input>` — that element is the source of truth.
- **init(selectorOrElement)** — jQuery-style "enhance this field".
- **parseValue(str)** — Static: string → array (split on `/[\n\r,]+/`, trim, filter empty, dedupe, sort). Use when reading for getFormData.
- **formatValue(arr)** — Static: array → comma-space string (sort, then join(', ')). Use when setting in populateForm.
- **Read:** same as any input — `element.value` or form serialize; use `parseValue(el.value)` when you need an array.
- Widget syncs value back to the element on every change (comma-space).

**Namespace-level (jPulse.UI.input):**

- **initAll(container?)** — Lives on `jPulse.UI.input`, not on tagInput. Inits all input widget types in container: e.g. `[data-taginput]` → tagInput.init, later `[data-multiselect]` → multiSelect.init. One call: `jPulse.UI.input.initAll(configForm)`.

### Real-time character filter (data-pattern, generic for jPulse.UI.input.*)

- Optional **data-pattern** attribute: same syntax as HTML `pattern=""`, assumed anchored. When set, the typing input filters characters in real time (each character must match the pattern). Used by tagInput and available for other `jPulse.UI.input.*` widgets.
- Example: `data-pattern="[a-z0-9_-]+"` for roles (lowercase, digits, dash, underscore). On `input` the value is filtered; on Enter the tag is filtered before adding. Cursor position is preserved when filtering. Invalid regex is ignored (no filter).

### Roles normalization (config.shtml)

- **Lowercase + dash (kebab-case):** Roles and adminRoles are normalized to lowercase when reading and saving. In populateForm and getFormData, values are trimmed and lowercased so stored/displayed roles are always e.g. `admin`, `content-manager`. Self-lockout check normalizes `currentUserRoles` from `data-current-user-roles` to lowercase for matching.
- **Client-side validation:** On submit, roles are validated with `/^[a-z0-9_-]+$/` (match data-pattern). adminRoles ⊆ roles and self-lockout checks remain. Defense in depth alongside data-pattern and server validation.

### Phase 1 extras (implemented)

- **initAll:** Try-catch per element so one failing tagInput.init does not break the form.
- **populateForm:** Defensive check for `jPulse.UI.input.tagInput.formatValue`; fallback to `arr.join(', ')` if missing.

### Value format

- Comma-space separated string in the element. Split on newline, CR, or comma — **space is allowed inside a tag** (e.g. "eng manager"). Delimiters: `[\n\r,]`.
- Comma is reserved (cannot appear inside a single tag). N/A for roles/adminRoles and likely most future use cases.
- **Dedupe:** Remove duplicates (e.g. in parseValue when getting; or on add — lazy on get is ok).
- **Sort on set and get:** formatValue sorts the array before joining; parseValue sorts (and dedupes) before returning. **Not on change:** When the user adds/removes a tag in the UI, do not re-sort the list (append only) so items don't appear to "disappear" in a long list.

### Initial use

- Site config editor => General => roles, adminRoles.
- Replace current newline/comma textareas; same parse in getFormData; populateForm sets `input.value` from array join (comma-space).

### DX simplifications

- **jPulse.UI.input.initAll(container?)** — Namespace-level: inits all input widget types (tagInput for `[data-taginput]`, later multiSelect, etc.) in container. One call after populateForm; no listing ids. Extension panels get inited automatically.
- **tagInput.parseValue(str)** / **tagInput.formatValue(arr)** — Widget owns the value contract; consumer uses these for getFormData/populateForm when not using setAllValues/getAllValues.

Result for config.shtml: (1) add `data-taginput` to the two inputs; (2) after populateForm, `jPulse.UI.input.initAll(configForm)`; (3) populateForm uses `tagInput.formatValue(rolesArr)`; (4) getFormData uses `tagInput.parseValue(el.value)` for those fields. Phase 2: add `data-path` and use `jPulse.UI.input.setAllValues` / `getAllValues` if desired.

### Form-level setAllValues / getAllValues (Phase 2)

- **jPulse.UI.input.setAllValues(form, data)** — Set all form field values from a data object. For each field with `data-path`, read value from `data` by path. **Checkboxes:** set `el.checked` from value (true/false/'true'/'false'). **tagInput:** use `tagInput.formatValue(value)` before setting `el.value`. **Others:** set `el.value` from String(value).
- **jPulse.UI.input.getAllValues(form)** — Build a data object from form fields. For each field with `data-path`: **checkboxes** return `el.checked` (boolean); **tagInput** return `tagInput.parseValue(el.value)`; **others** return `el.value`. Assign into result by path via setByPath.

**When to use setAllValues/getAllValues vs setFormData/getFormData:** Use **setFormData(form, data, schema)** and **getFormData(form, schema)** when you have a **complete schema** (e.g. from API with includeSchema) and want one-line set/get with defaults, coercion, and normalize applied from the schema. Use **setAllValues(form, data)** and **getAllValues(form)** when you already have data in the right shape and no schema (e.g. simple forms, or you apply defaults/coercion yourself).

Convention: fields that participate need `data-path` (e.g. `general.roles`, `email.adminEmail`, `broadcast.enable`); tagInput fields also have `data-taginput`. **config.shtml:** All framework form fields (General, Email, Broadcast, Manifest) declare `data-path`, so populateForm builds one data object and calls `setAllValues(configForm, formData)`; getFormData calls `getAllValues(configForm)` then coerces numbers and normalizes roles. Extension panels stay on `data-block`/`data-field` (Phase 3 can add data-path there if desired).

### Schema-driven setFormData / getFormData (single-line set/get)

Two helpers in **jpulse-common.js** under `jPulse.UI.input` so any view can do the same (don't make me think).

- **jPulse.UI.input.setFormData(form, data, schema)** — Does everything for "set": applies schema defaults and `normalize` (e.g. lowercase) to `data`, then calls `setAllValues(form, result)`. Caller: `jPulse.UI.input.setFormData(configForm, config.data, configSchema)`.
- **jPulse.UI.input.getFormData(form, schema)** — Does everything for "get": calls `getAllValues(form)`, then coerces by `schema.type` (number, boolean) and applies `schema.normalize`, returns `{ data: result }`. Caller: `jPulse.UI.input.getFormData(configForm, configSchema)`.
- **Complete schema:** Helpers walk the full `schema.data`; no distinction between framework and extension blocks. One loop over the complete schema.
- **Boolean fields:** Defined in schema as `type: 'boolean'` (and `inputType: 'checkbox'` or `'select'` as needed); coercion is generic from schema.type.

### Phase 3: Schema for data-driven form

Schema fields drive both validation and UI. Extension panels (and optionally framework blocks) are rendered from this schema.

- **inputType** — Form control / widget type. Values: `'tagInput' | 'text' | 'password' | 'checkbox' | 'select' | 'textarea'`. TagInput is an addition to HTML input types (e.g. roles list). Determines which control is rendered and how setAllValues/getAllValues treat the field.
- **pattern** — Single key for both client and server: regex string used for real-time filtering (`data-pattern`) and for submit validation. No separate `validate` key.
- **normalize** — Optional (e.g. `'lowercase'`). Defines data normalization when reading/saving (e.g. roles to kebab-case).
- **sensitive** — Server-side only. When `sensitive: true`, value is not logged and may be masked in API responses. Use for secrets. Client-side masking is handled by **inputType: 'password'** (password field rendering).
- **subsetOf** — Optional path (e.g. `subsetOf: 'general.roles'`). Relational validation: value must be a subset of the referenced path (e.g. adminRoles ⊆ roles).
- **label / placeholder / option labels** — Schema holds i18n strings in **handlebar format** only, consistent with `expandI18nHandlebars()`: e.g. `'{{i18n.view.admin.config.general.roles}}'`, `'{{i18n.view.admin.config.general.rolesPlaceholder}}'`. Select options use `label` in the same format: `{ value: 'bsl', label: '{{i18n.view.admin.config.manifest.licenseTierBsl}}' }`. No special handling for options — any string value that matches the full handlebar pattern is expanded.
- **expandI18nDeep(req, obj)** — In i18n utils (not config model). Deep-walks the object; for any **string value** that matches the full handlebar pattern `{{i18n....}}`, replaces it with the translated string (same key extraction as `expandI18nHandlebars`). No third param (no fieldNames); detection is by value pattern only. All i18nised strings in the schema must be declared in handlebar format.
- **Where to resolve** — **Controller** resolves the schema at response time: model returns raw schema (`getSchema()`); controller calls `i18n.expandI18nDeep(req, schema)` before sending. Cache stores schema with unresolved handlebars; resolve when the schema is used.
- **Caveat:** Runtime strings (e.g. validation messages like "incorrect input") cannot be resolved from schema — acceptable limitation.
- **Field order** — Property order in the schema object defines field order within a block; no per-field `_meta.order`.

### Schema-driven tabs and panels (renderTabsAndPanelsFromSchema)

Unified tab strip and panel DOM from the same schema that drives setFormData/getFormData: one source of truth, one mental model (don't make me think).

- **jPulse.UI.tabs.renderTabsAndPanelsFromSchema(tabContainer, panelContainer, schema, data, options)** — In jpulse-common.js under `jPulse.UI.tabs`. Builds all tab buttons and all panel content from `schema.data`, then calls `jPulse.UI.tabs.register()` so tab switching works. **tabContainer** / **panelContainer**: DOM elements or ids (e.g. `'config-tabs'`, `'config-all-panels'`). **schema**: resolved config schema with `data` (each block has `_meta.order`, `_meta.tabLabel`, and field definitions). **data**: config data to populate panel fields. **options**: optional (e.g. panelHeight, slideAnimation, responsive; optional field-renderer override).
- **Single source:** All blocks (framework and extension) are in the schema with the same shape (`_meta.order`, `_meta.tabLabel`, fields with type/label/inputType/etc.). One schema-driven field renderer produces panel HTML for every block. No distinction between "framework" and "extension" in the UI layer.
- **Flow:** Sort blocks by `_meta.order`; for each block create one tab button (label from `_meta.tabLabel` or block key) and one panel div (e.g. `id = blockKey + '-panel'`), fill the panel with the result of the field renderer, append both; then register the tab group with the existing tabs API.
- **Schema requirement:** Framework blocks (general, email, broadcast, manifest) are defined in the schema with the same structure as extension blocks (fields with type, label, inputType, placeholder, etc.) so one renderer can build all panels. Any special UI (e.g. "Test email" button) is handled via optional callback or custom field/block type in the schema.
- **config.shtml with this helper:** One panel container (e.g. `#config-all-panels`); no static panel HTML; no `frameworkBlockKeys`, `buildTabsFromSchema`, `buildTabsAndRegister`, `registerFrameworkTabsOnly`, or `renderExtensionPanels`. After fetching config + schema, call `jPulse.UI.tabs.renderTabsAndPanelsFromSchema('#config-tabs', '#config-all-panels', configSchema, result.data)` then `setFormData`, `initAll`, and dirty tracking.

### Flow control and scope (schema-driven layout)

**Flow control:** Layout is driven by schema so blocks and fields can participate in a responsive flow.

- **maxColumns** (block `_meta`) — Preferred max number of columns for the block. Number; default **1**. Use **1** when the whole block should be single-column. Use **2** (or more) when fields can share rows. Responsive override forces 1 column on small viewports.
- **startNewRow** (field) — "Break to a new row." Position only; in 2-col the field still takes one column (50%), so the next field can sit beside it. Example: useTls checkbox has `startNewRow: true`, Test email button shares the same row.
- **fullWidth** (field) — "Span the full row width." Size only. Use when the block has **maxColumns > 1** and this field should be alone on its row at 100% width (e.g. broadcast.enable: `startNewRow: true, fullWidth: true`). Use both when you want new row + full width. Textareas get fullWidth automatically.

**View-only controls (virtual field-like):** Buttons or other non-data controls are defined in the schema as virtual field-like entries so they participate in the same flow as data fields (e.g. TLS checkbox and Test button with `maxColumns: 2`).

- **scope: ['view']** — Entry is view-only: rendered in the form (e.g. as a button) but not in getFormData/setFormData. No `data-path`; not part of config payload.
- **Virtual entry shape** — Same flow hints as fields: `maxColumns`, `startNewRow`, plus e.g. `type: 'button'`, `label: '{{i18n...}}'`, and either `callback: 'functionName'` (view resolves the function) or `action: 'testEmail'` (view maps action to handler). Rendered in the same flow container as data fields so layout (e.g. two-column row) is consistent.

**Scope control (consistent for view-only and model-only):** One property, **scope**, indicates which layer(s) a field or virtual entry belongs to.

- **scope: ['view']** — View only. Rendered in the form (e.g. virtual button). Not included in getFormData/setFormData. Use for view-only controls.
- **scope: ['model']** — Model (and/or controller) only. Not rendered in the form; excluded from form UI. Still in schema for validation, defaults, and server use (e.g. `broadcast.enabledAt`). Use for server-managed or computed fields.
- **Missing scope** — Default: all layers (model + view). Field is shown in the form and included in getFormData/setFormData.

**Rules:** Include in form render if `scope` is missing or includes `'view'`. Include in getFormData/setFormData if `scope` is missing or includes `'model'`. Virtual entries have `scope: ['view']` and no `data-path`.

---

## Integration: config.shtml

**File:** `webapp/view/admin/config.shtml`

### Current behavior

- General panel: two textareas `#generalRoles`, `#generalAdminRoles` with class `local-edit-field` (lines 166–171).
- **populateForm:** `element.value = rolesArr.join('\n')` (592–593).
- **getFormData:** reads `element.value`, then `parseRolesFromText` (637–639). `parseRolesFromText` splits on `[\n,]+`, trims, filters (575–578).
- **Validation:** adminRoles ⊆ roles (718–723); self-lockout (726–733).
- **Dirty:** `localGetDirtySnapshot` iterates `.local-edit-field` and records `el.value` (556–568).

### With tagInput

1. **Markup:** Replace each textarea with `<input type="text" id="generalRoles" name="generalRoles" class="jp-form-input local-edit-field" data-taginput ...>` (and same for generalAdminRoles).

2. **Init:** After `populateForm(result.data)` in `loadConfig` (line ~414): `jPulse.UI.input.initAll(configForm)`. One call; inits all input widget types (tagInput for `[data-taginput]`, General + any extension panels later).

3. **populateForm:** `generalRoles.value = jPulse.UI.input.tagInput.formatValue(rolesArr)` and same for adminRoles. Widget owns the format.

4. **getFormData:** `roles = jPulse.UI.input.tagInput.parseValue(document.getElementById('generalRoles').value)` and same for adminRoles. Widget owns the parse; can remove or keep `parseRolesFromText` for extension array textareas.

5. **Dirty:** **Form responsibility.** The form (config.shtml) owns dirty logic: `localGetDirtySnapshot`, `originalDirtySnapshot`, `checkDirty` on input/change, `updateButtonStates`. The widget does not know about dirty — it only syncs `element.value` on every change. As long as the enhanced input stays the value store and has class `local-edit-field`, the form's existing snapshot/compare logic works unchanged. If the widget wraps the input in a container, the snapshot must still read from the same input element (by id) so the form continues to own dirty.

6. **Focus on error:** `document.getElementById('generalAdminRoles').focus()` (722, 732). If the widget wraps the input, focus the enhanced container or the inner input so the user sees the right field.

### With Phase 2 (setAllValues / getAllValues) — all framework fields

- **Every** framework form field (General, Email, Broadcast, Manifest) has **data-path** (e.g. `general.roles`, `email.adminEmail`, `email.useTls`, `broadcast.enable`, `manifest.license.key`, `manifest.compliance.adminEmailOptIn`). **populateForm** builds one `formData` object (with role normalization and defaults) and calls `jPulse.UI.input.setAllValues(configForm, formData)`; extension panels are still populated in a separate loop. **getFormData** calls `jPulse.UI.input.getAllValues(configForm)` to read all data-path fields in one swoop, then coerces numbers (smtpPort, nagTime, disableTime) and adminEmailOptIn boolean, normalizes roles to lowercase, and merges extension-panel data. Fallback to manual field-by-field read/write if setAllValues/getAllValues missing. **With schema-driven helpers:** populateForm becomes `jPulse.UI.input.setFormData(configForm, config.data, configSchema)`; getFormData becomes `return jPulse.UI.input.getFormData(configForm, configSchema)` (single line each).

### Extension panels (Phase 3: data-driven form)

- Schema field **inputType: 'tagInput'** in `renderExtensionBlockFields` renders an input with `data-taginput`. `jPulse.UI.input.initAll(configForm)` after populateForm already inits them; no extra code. When building extension panels from schema, treat `inputType: 'tagInput'` like an array-valued field: render an input with `data-taginput` and use tagInput.formatValue/parseValue for value. See **Phase 3: Schema for data-driven form** above for full schema shape (inputType, pattern, normalize, sensitive, subsetOf, label/placeholder).

### With renderTabsAndPanelsFromSchema (unified schema-driven UI)

- **Single panel container:** Replace static panels (general-panel, email-panel, etc.) and `#config-extension-panels` with one `#config-all-panels`. **loadConfig:** After fetch, call `jPulse.UI.tabs.renderTabsAndPanelsFromSchema('config-tabs', 'config-all-panels', configSchema, result.data)` then `jPulse.UI.input.setFormData(configForm, result.data, configSchema)`, `jPulse.UI.input.initAll(configForm)`, and dirty tracking. No `frameworkBlockKeys`, no `buildTabsFromSchema` / `buildTabsAndRegister` / `registerFrameworkTabsOnly` / `renderExtensionPanels`; schema drives tabs and panel content in one place.

---

## Implementation notes

- **parseValue(str):** Split on `/[\n\r,]+/` (newline, CR, comma — **not** space; space allowed inside a tag). Trim each part, filter empty, **dedupe**, **sort**, return array. **formatValue(arr):** **Sort** array, then `arr.join(', ')` (comma-space).
- **Sort on set/get only:** When user adds/removes a tag in the UI, do **not** re-sort the displayed list (append only); re-sorting on every change could make items appear to "disappear" in a long list. Sort only when setting (formatValue/populateForm) and when getting (parseValue/getFormData).
- **DOM:** The element passed to `init(selectorOrElement)` must remain in the DOM and remain the value store: the widget updates its `.value` on every add/remove. If the widget adds a visual wrapper (e.g. container + tag divs), the same input element must keep its id and be the one the form reads for snapshot/getFormData.
- **CSS:** Use theme variables (`--jp-theme-*`) for tag/chip and remove button; keep the control looking like a single input (border, background). Framework style rules: no new `jp-*` classes without docs; page/site styles use `local-*` or `site-*`.
- **On add:** Trim the new tag before adding (so "  foo  " + Enter → tag "foo"). **Dedupe:** Remove duplicates (e.g. in parseValue on get; or skip adding if already present — lazy on get is ok).

---

## Phases (all in scope for W-148)

1. **Phase 1 — Core:** ✅ Widget (init, parseValue, formatValue with sort/dedupe, split `/[\n\r,]+/`), `jPulse.UI.input.initAll(container)`, config.shtml General roles/adminRoles wiring. Unit tests and docs. Plus data-pattern, role normalization, client-side validation.
2. **Phase 2 — setAllValues/getAllValues:** ✅ `jPulse.UI.input.setAllValues(form, data)` and `getAllValues(form)`; convention `data-path` + `data-taginput`; path helpers getByPath/setByPath; config.shtml opts in for general.roles and general.adminRoles.
3. **Phase 3 — Data-driven form:** Extension panels: schema uses **inputType** (e.g. `'tagInput' | 'text' | 'password' | 'checkbox' | 'select' | 'textarea'`); pattern, normalize, sensitive, subsetOf, label/placeholder (controller-resolved). Render fields from schema; `inputType: 'tagInput'` → input with `data-taginput`, formatValue/parseValue for value. **Schema-driven helpers:** `jPulse.UI.input.setFormData(form, data, schema)` and `jPulse.UI.input.getFormData(form, schema)` in jpulse-common.js; one-line set/get; complete schema; boolean fields as type: 'boolean'.
4. **Phase 4 — Unified schema-driven tabs and panels:** `jPulse.UI.tabs.renderTabsAndPanelsFromSchema(tabContainer, panelContainer, schema, data, options)` in jpulse-common.js; all blocks (framework + extension) in schema with same shape; one panel container in config.shtml; no static panels, no frameworkBlockKeys or separate tab/panel builders.
5. **Phase 5:** Unit tests (optional; some in jpulse-ui-tabs-schema.test.js)
6. **Phase 6:** ✅ Docs — see [Schema-driven config forms](../../front-end-development.md#-schema-driven-config-forms) (front-end-development.md)

---

## Deliverables

- **Phase 1:** ✅ Implemented. Plus data-pattern (generic), role normalization (lowercase), client-side validation, initAll try-catch, populateForm fallback.
- **Phase 2:** ✅ setAllValues(form, data) and getAllValues(form); getByPath/setByPath for dotted paths; config.shtml uses data-path on role inputs and setAllValues/getAllValues for general.roles and general.adminRoles.
- **Phase 3:** ✅ Extension panels: schema shape (inputType, pattern, normalize, sensitive, subsetOf, label/placeholder); controller resolves label/placeholder/options when serving schema; `inputType: 'tagInput'` → render input with `data-taginput` and data-path. Schema-driven helpers: **jPulse.UI.input.setFormData(form, data, schema)** and **jPulse.UI.input.getFormData(form, schema)** in jpulse-common.js; populateForm/getFormData reduce to one line each; complete schema (no framework/extension distinction); boolean fields defined as type: 'boolean' in schema.
- **Phase 4:** ✅ **jPulse.UI.tabs.renderTabsAndPanelsFromSchema(tabContainer, panelContainer, schema, data, options)** in jpulse-common.js; unified schema for all blocks; config.shtml: single panel container, one call to render tabs and panels from schema; no static panels or frameworkBlockKeys; virtual buttons (type: 'button', action), flow layout (maxColumns, startNewRow, fullWidth), help text, sanitizeHtml(html, strict).
- **Phase 5:** Unit tests (optional: jpulse-ui-tabs-schema.test.js — _walkSchemaFields, renderTabsAndPanelsFromSchema null checks; 4 DOM tests skipped)
- **Phase 6:** ✅ Docs — [Schema-driven config forms](../../front-end-development.md#-schema-driven-config-forms); blurb + link in plugin-api-reference.md and genai-instructions.md
