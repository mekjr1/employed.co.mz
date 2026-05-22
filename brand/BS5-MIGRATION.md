# Bootstrap 3 → 5 migration — plan & progress

> **Status (May 2026):** PR 1 — Foundation **complete**. PR 2 — useraccounts replacement **complete** (hand-rolled BS3-markup templates wired to `Accounts.*` API, useraccounts:* packages removed, all flows verified via Docker UAT). PR 3 — Template sweep + BS3 removal still pending.

## Why this is its own milestone

The visual rebrand (logo, colours, seals, brand moments, email) can ship today without touching the layout framework. Replacing Bootstrap 3 with 5 is a separate, structural change that touches **every template in the app** and requires removing two Meteor packages that have no BS5 equivalent.

Mixing the two — visual rebrand + framework swap — would compound risk: visual regressions from the rebrand would be indistinguishable from layout regressions from the BS5 swap. So we split.

## Progress checklist

### PR 1 — Foundation (partially complete)

- [x] `bootstrap@5.3.3` + `@popperjs/core@2.11.8` installed as **devDependencies** (excluded from prod runtime; see [package.json](../package.json))
- [x] [`imports/styles/_app-bs5.scss`](../imports/styles/_app-bs5.scss) staged — BS5 SCSS variable overrides mapped to brand tokens (indigo / amber / ink / cream)
- [x] [`imports/styles/_useraccounts-bs5.scss`](../imports/styles/_useraccounts-bs5.scss) scaffold staged — hooks for the PR 2 auth-flow templates
- [x] [`imports/styles/README.md`](../imports/styles/README.md) — activation cheatsheet for PR 2 / PR 3
- [ ] `meteor add fourseven:scss` — deferred to PR 2 (needs Atmosphere fetch + container rebuild)
- [ ] Move `_app-bs5.scss` from `imports/` to `client/` — deferred to PR 3 (would conflict with mounted BS3 stylesheet)

### PR 2 — useraccounts replacement (complete)

Shipped as **A9.32** (see [CHANGELOG](../CHANGELOG.md)). The auth surface is now ours to evolve; PR 3 will re-skin under BS5.

- [x] Hand-rolled `signIn` / `signUp` / `forgotPwd` / `resetPwd` / `verifyEmail` Blaze templates in [`client/views/account/auth.html`](../client/views/account/auth.html) (BS3 markup retained for now, BS5 re-skin in PR 3)
- [x] Submit handlers in [`client/views/account/auth.js`](../client/views/account/auth.js) wired directly to `Meteor.loginWithPassword`, `Accounts.createUser`, `Accounts.forgotPassword`, `Accounts.resetPassword`, `Accounts.verifyEmail`
- [x] Server-side `Accounts.config({ sendVerificationEmail: true })` + `Accounts.urls.{verifyEmail,resetPassword}` overrides in [`server/accounts.js`](../server/accounts.js)
- [x] Five new routes + inlined `ensureSignedIn` hook in [`router.js`](../router.js); `Tracker.nonreactive` guard prevents reactive re-fires racing the form-callback redirect
- [x] Removed packages: `useraccounts:bootstrap`, `useraccounts:iron-routing`, transitive `useraccounts:core` (commented in [`.meteor/packages`](../.meteor/packages) with A9.32 explanations)
- [x] [`.meteorignore`](../.meteorignore) added — keeps `brand/`, `design/`, `scripts/` out of Meteor's templating-compiler (boot was crashing on `<!DOCTYPE html>` in those folders)
- [x] [`both/accounts.js`](../both/accounts.js) stripped to a comment-only stub; [`.eslintrc.json`](../.eslintrc.json) global `AccountsTemplates` removed
- [x] End-to-end Docker UAT against `mz.lvh.me:3001`: sign-in, sign-up (auto-login + verification email to MailHog), forgot password (reset email to MailHog), `/myjobs` → `/sign-in` → submit → `/myjobs` round-trip with `postSignInRoute` preserved

### PR 3 — Template sweep + BS3 removal (not started)

See "Template surgery" table below. Mechanical class renames across every template, then `meteor remove nemo64:bootstrap peppelg:bootstrap-3-modal less`.

## Packages affected

```text
.meteor/packages
├── nemo64:bootstrap           ← BS3 source; NO BS5 alternative for Meteor
├── peppelg:bootstrap-3-modal  ← BS3 modal shim; needs full replacement
├── useraccounts:bootstrap     ← BS3 sign-in/sign-up templates; HUGE blocker
├── accounts-ui@1.4.2          ← uses BS3 markup
├── less                       ← can stay if we vendor BS5 SCSS, OR swap to fourseven:scss
```

## Strategy

We can't `meteor add bootstrap@5` — no package exists. Three viable strategies, ranked:

### Option A — Vendor BS5 via npm + remove nemo64

1. `meteor npm install --save bootstrap@5.3 @popperjs/core`
2. `meteor remove nemo64:bootstrap peppelg:bootstrap-3-modal useraccounts:bootstrap`
3. Add `meteor add fourseven:scss` for the SCSS compiler.
4. Import the BS5 SCSS in `client/lib/app.scss` (renamed from `.less`):
   ```scss
   $primary:       #4F46E5;
   $warning:       #F59E0B;
   $border-radius: 8px;
   @import "{}/node_modules/bootstrap/scss/bootstrap";
   ```
5. Import BS5 JS in a client entry: `import 'bootstrap';`
6. **Replace `useraccounts:bootstrap` with a hand‑rolled set of sign‑in / sign‑up / password‑reset templates** — this is the bulk of the work.
7. Migrate every template (see "Template surgery" below).

**Pros:** Cleanest end state. Standard BS5. Owns the upgrade path forever.
**Cons:** ~2 weeks of solo dev. Risk concentrated in useraccounts replacement.

### Option B — CDN BS5 + side‑by‑side migration

Load BS5 from a CDN, keep BS3 mounted for the legacy useraccounts surfaces, migrate template by template, finally remove BS3 when nothing references it. Lower risk per step but the codebase carries two frameworks for the duration.

### Option C — Stay on BS3 indefinitely

Acceptable if BS3 keeps rendering. The rebrand pass already overrides BS3 variables (`@brand-primary: #4F46E5;` in `journal.variables.import.less`) so visually the app is on the new brand. We just lose: modern accessibility defaults, floating labels, BS5 forms, the JS-without-jQuery wins.

## Recommended path

**Option A**, executed in three PRs:

1. **PR 1 — Foundation.** Add BS5 npm + fourseven:scss. Set up `app.scss` with variable overrides. Keep BS3 mounted. Verify both compile.
2. **PR 2 — useraccounts replacement.** Hand‑roll sign‑in, sign‑up, password‑reset, change‑password, verify‑email templates using BS5 markup. Wire to `Accounts.*` API directly. Remove `useraccounts:bootstrap`. This is the riskiest PR — gate on full E2E pass on a fresh Docker stack.
3. **PR 3 — Template surgery + BS3 removal.** Mass find/replace across templates (see table below). Remove `nemo64:bootstrap` and `peppelg:bootstrap-3-modal`. Rebuild assets. Visual diff every page.

## Template surgery

| BS3 | BS5 | Sweep |
| --- | --- | --- |
| `.panel`, `.panel-default`, `.panel-heading`, `.panel-body` | `.card`, `.card-header`, `.card-body` | global find/replace |
| `.label label-warning` | `.badge text-bg-warning` | global find/replace |
| `.label label-success` | `.badge text-bg-success` | global find/replace |
| `.btn-default` | `.btn-outline-secondary` | global find/replace |
| `.form-group > label + .form-control` | `.form-floating > .form-control + label` | per template |
| `.col-sm-12 col-md-8 col-md-offset-2` | `.col-12 col-md-8 offset-md-2` | regex sweep |
| `.col-xs-*` | `.col-*` (BS5 dropped `xs` prefix) | regex sweep |
| `.hidden-xs` | `.d-none d-sm-block` | regex sweep |
| `.pull-left` / `.pull-right` | `.float-start` / `.float-end` | regex sweep |
| `.text-muted` | `.text-secondary` (BS5 default) | optional |
| `<i class="glyphicon glyphicon-*">` | already 0 occurrences | none |
| `<i class="icon-bar">` (hamburger) | `.navbar-toggler-icon` SVG | header.html only |

## JS coupling (jQuery → vanilla)

Drop jQuery modal calls in these files:

```text
client/views/jobs/jobForms.js  $('#submitJobBtn').modal(...)
client/views/jobs/job.js       $('#deactivateConfirm').modal(...)
client/views/includes/header.js
client/lib/dialog.js           $.fn.modal(...)
```

BS5 modal pattern:

```js
import { Modal } from 'bootstrap';
const modal = new Modal(document.getElementById('myModal'));
modal.show();
// later:
modal.hide();
```

## Forms — floating labels

The biggest user‑facing change. Before:

```html
<div class="form-group">
  <label for="email">Email</label>
  <input type="email" class="form-control" id="email">
</div>
```

After:

```html
<div class="form-floating">
  <input type="email" class="form-control" id="email" placeholder="Email">
  <label for="email">Email</label>
</div>
```

The `placeholder` is required for the label animation. AutoForm doesn't emit BS5 markup; we'll either:

1. Override the `bootstrap3` AutoForm template with a custom `bootstrap5` template (~150 lines, one‑time write), OR
2. Drop AutoForm in favour of hand‑rolled forms (simpler long‑term, but the wizard in `jobForms.js` leans on AutoForm collection2 validation).

**Recommendation:** write the `bootstrap5` AutoForm template; submit it upstream to `aldeed/meteor-autoform` if it isn't already there.

## CSS variable overrides

Move from the LESS `@brand-*` variables to BS5 SCSS variables, then surface them as CSS custom properties so the brand kit and the app share tokens:

```scss
// app.scss
$primary:   #4F46E5;
$secondary: #6B7280;
$warning:   #F59E0B;
$danger:    #DC2626;
$success:   #15803D;
$info:      #2563EB;

$border-radius:    8px;
$border-radius-sm: 6px;
$border-radius-lg: 12px;

$font-family-base:     'Inter', system-ui, sans-serif;
$headings-font-family: 'Montserrat', $font-family-base;

@import "{}/node_modules/bootstrap/scss/bootstrap";

:root {
  --brand-indigo:     #{$primary};
  --brand-indigo-700: #4338CA;
  --brand-indigo-100: #E0E7FF;
  --brand-amber:      #{$warning};
  --brand-amber-700:  #B45309;
  --brand-dark:       #27272B;
  --brand-cream:      #FAFAF7;
}
```

Then the brand kit, in‑app status pills, and one‑off custom CSS all reference the same tokens.

## Test gate

After each PR:

1. `meteor test --once --driver-package meteortesting:mocha --full-app --port 4501` — unit tests green.
2. Playwright smoke chromium — home + job-detail + post-a-job + sign-in + sign-up.
3. Playwright journey chromium — full apply flow.
4. Playwright journey firefox — same (catches WebKit‑specific BS5 quirks).
5. Visual diff against a baseline screenshot captured BEFORE the BS5 PR — no surface should look worse.

## Effort estimate

| Phase | Effort |
| --- | --- |
| PR 1 — Foundation (BS5 npm + scss + parallel mount) | 1 day |
| PR 2 — useraccounts replacement (the long pole) | 4–7 days |
| PR 3 — Template surgery + BS3 removal | 3–5 days |
| Visual QA + accessibility audit | 2 days |
| **Total** | **~2 weeks solo** |

## What ships TODAY (the rebrand pass)

The rebrand PR being approved alongside this document gives you ~80% of the visual benefit at ~10% of the effort:

- ✅ All logo / favicon / theme_color updates
- ✅ Featured + Verified custom seals
- ✅ Status pill tokenisation + Flagged state
- ✅ Animated logo loading spinner
- ✅ Custom 404 + empty‑state illustrations
- ✅ Designed 1200×630 OG card
- ✅ Branded transactional email header
- ✅ Initials‑on‑indigo avatar SVG
- ✅ Brand kit folder with social/merch artefacts

What you DON'T get without the BS5 migration:

- ❌ Floating labels
- ❌ BS5 accessibility defaults on modals
- ❌ Removing jQuery dependency
- ❌ Dropping Font Awesome 4 (the custom SVG icon set rides with BS5 because both pass through every template)

When you're ready, open a new conversation and reference this file.
