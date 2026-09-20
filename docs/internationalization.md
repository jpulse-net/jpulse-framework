# jPulse Docs / Internationalization v2.0.6

User-facing text lives in `*.conf` translation files, not in controllers or views. The same key is resolved in the visitor's language in templates (`{{i18n.view.home.title}}`) and in controllers (`global.i18n.translate(req, 'controller.email.sendFailed', { error })`).

Framework, plugins, and the site contribute to **one merged tree**. A later source wins a single leaf and does not wipe sibling keys. Do not edit `webapp/translations/` — those files come back on `jpulse update`.

## Overview

| Who | Where | Role |
|---|---|---|
| Framework | `webapp/translations/` | Built-in UI and API strings (`en.conf`, `de.conf`) |
| Plugin | `plugins/<name>/webapp/translations/` | That plugin's strings, merged in plugin load order |
| Site | `site/webapp/translations/` | Overrides and site-only keys (last write wins a leaf) |

A missing plugin or site `translations/` directory is skipped. The framework directory is required.

Default language is `appConfig.utils.i18n.default` (framework default `en`). The visitor's language is `user.preferences.language` (My Settings). Guests and users with no preference get the default.

After every merge, languages other than the default are **backfilled** from it. A plugin or site may ship only `en.conf`; German (or any other loaded language) gets the English value for missing keys, and the startup log lists the gaps.

Restart the app after editing translation files. File cache may delay a live pick-up (`utils.i18n.cache`, default check every 10 minutes). Admins can force a reload with `POST /api/1/cache/refresh/i18n`.

## File format

Each `*.conf` file is a JavaScript object literal (not JSON — comments and backticks are allowed). The top-level key is the language code and must match the filename (`en.conf` → `en`).

```javascript
{
  en: {
    lang: 'English',
    view: {
      dashboard: {
        title: 'Dashboard',
        welcome: 'Welcome back, {{user.firstName}}.'
      }
    },
    controller: {
      dashboard: {
        loadFailed: 'Could not load the dashboard: {{error}}'
      }
    }
  }
}
```

`lang` is the display name on the language picker.

**Key layout** follows the framework files:

- `view.*` — templates, buttons, toasts, navigation, admin labels
- `controller.*` — API and email messages
- A plugin typically nests under `view.ui.<plugin>` (see `ai-core`) so it does not collide with `view.home`

**Placeholders**

| Where the string is used | Token | Who fills it |
|---|---|---|
| `i18n.translate(req, key, { firstName })` | `{{firstName}}` | The flat `context` object (one level, no dotted paths) |
| A `.shtml` template after the i18n pass | `{{user.firstName}}` | The second Handlebars pass (page context) |
| A `.js` view or runtime toast | `%ERROR%` | Client `.replace('%ERROR%', value)` — `{{token}}` would be eaten by the second pass |

Falsy context values are substituted (`{{firstName}}` with `''` becomes empty, not the literal `{{firstName}}`). Unknown tokens are left as-is.

A missing key returns the key path as the string and logs an error (`login.notAuthenticated` if that path does not exist).

## Merge order

At startup, `loadTranslations()` builds one tree:

1. **Framework** — every `webapp/translations/*.conf`
2. **Active plugins** — each `plugins/<name>/webapp/translations/` in plugin load order
3. **Site** — `site/webapp/translations/*.conf`

Then the default language backfills every other language.

```
framework  view.home.title = "Home"
plugin     view.ui.myPlugin.save = "Save"      // new leaf
site       view.home.title = "Start"           // overrides that leaf only
site       view.dashboard.title = "Dashboard"  // site-only key
```

`view.home.introduction` from the framework is still there after the site overrides `title`. Arrays and scalar leaves replace; nested objects merge.

A site that adds a new language file (`fr.conf`) is enough to register `fr`. Missing keys in that file are copied from the default language and logged.

## Views

Templates expand `{{i18n.*}}` in a **first pass**, then the rest of Handlebars.

```html
<title>{{i18n.view.dashboard.title}}</title>
<h1>{{i18n.view.dashboard.welcome}}</h1>
```

If the translation still contains `{{user.firstName}}`, the second pass fills it from the page context.

Inside `<script>`, use **backticks** so an apostrophe in the translation does not break JavaScript:

```html
<script>
jPulse.UI.toast.error(`{{i18n.view.dashboard.loadFailed}}`);
</script>
```

Runtime values the server does not know go in `%TOKEN%` form:

```html
<script>
jPulse.UI.toast.error(
    `{{i18n.view.error.networkError}}`.replace('%ERROR%', error.message)
);
</script>
```

A `{{i18n.path}}` that points at a **subtree** (not a string leaf) expands to a JSON literal. That is how a `.js` helper binds a whole namespace in one line. Details: [Handlebars](handlebars.md#i18n---internationalization).

## Controllers

`global.i18n` is the initialized instance (after bootstrap).

```javascript
const message = global.i18n.translate(
    req,
    'controller.dashboard.loadFailed',
    { error: error.message }
);
```

Language comes from `req.session.user.preferences.language`, then the default.

**Outbound email** must use the *recipient's* language, not the acting admin's:

```javascript
const body = global.i18n.translateForUser(
    recipientUser,
    'model.user.emailVerify',
    { firstName: recipientUser.firstName, verifyUrl, code }
);
```

`EmailController.sendEmailFromTranslation()` reads a whole unix-mail-style string (Subject header, blank line, body) from one key and runs the same `{{token}}` substitution. See [Sending Email](sending-email.md).

Other helpers: `global.i18n.getCodes()`, `hasLang(code)`, `getList()` for `[code, displayName]` pairs, `substitute(text, context)` when you already have a resolved string.

## Site overrides

`site/webapp/translations/en.conf` (and `de.conf` when you translate German):

```javascript
{
  en: {
    view: {
      home: {
        title: 'Start'
      },
      dashboard: {
        title: 'Dashboard',
        welcome: 'Welcome back, {{user.firstName}}.'
      }
    }
  }
}
```

Only the leaves you set change. You do not copy the whole framework file.

## Plugin strings

Ship `plugins/<name>/webapp/translations/en.conf`. You may omit other languages; backfill covers them.

```javascript
{
  en: {
    view: {
      ui: {
        myPlugin: {
          save: 'Save',
          saved: 'Saved.'
        }
      }
    },
    controller: {
      myPlugin: {
        denied: 'You cannot do that.'
      }
    }
  }
}
```

The view uses `{{i18n.view.ui.myPlugin.save}}`. The controller uses `global.i18n.translate(req, 'controller.myPlugin.denied')`.

A site can override a plugin leaf the same way it overrides a framework leaf.

## Adding a language

1. Set `utils.i18n.default` only if the default is not `en`.
2. Add `<code>.conf` next to the existing files (framework, plugin, or site).
3. Set `lang: 'Français'` (or the local name) for the picker.
4. Translate what you can; the rest is backfilled from the default and listed in the startup log.

The user picks a language under My Settings → Preferences. The value is `preferences.language`.

## See also

- [Site Customization](site-customization.md) — where site files live
- [Creating Plugins](plugins/creating-plugins.md) — plugin `translations/` directory
- [Handlebars](handlebars.md#i18n---internationalization) — subtree embedding
- [Template Reference](template-reference.md#internationalization-i18n) — view examples
- [Sending Email](sending-email.md) — `sendEmailFromTranslation`
- [Cache Infrastructure](cache-infrastructure.md) — translation file cache
