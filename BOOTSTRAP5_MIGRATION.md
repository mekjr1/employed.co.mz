# Bootstrap 5 + Font Awesome 6 migration plan

> **Status (May 2026):** PR 1 (Foundation) and PR 2 (useraccounts
> replacement) are **complete**. PR 3 (template sweep + BS3 removal)
> is pending. See [`brand/BS5-MIGRATION.md`](brand/BS5-MIGRATION.md)
> for the canonical progress tracker.
>
> This file preserves the original migration audit and rationale.
> For current status, always refer to `brand/BS5-MIGRATION.md`.

## Why

Bootstrap 3 reached end-of-life on **2019-07-24** and Font Awesome 4
on **2018-12-04**. They still work, but:

- No CVE backports. Any newly discovered XSS or DOM-clobbering bug in
  the JS bundle is permanent.
- Modern accessibility patterns (`prefers-reduced-motion`, ARIA live
  regions in modals, focus-trapping in offcanvas) were added in BS4/5.
- Mobile-first defaults differ; BS3 grid breakpoints (`sm` ≥ 768px) no
  longer match common device widths.

## Current usage map

These are the load-bearing BS3 / FA4 idioms in the repo today:

| Where | What | Migration touch |
| --- | --- | --- |
| [client/lib/custom.bootstrap.less](client/lib/custom.bootstrap.less) | Customised BS3 mixin import | Replace with BS5 SCSS entry; the Less variables are not 1:1 |
| [client/lib/custom.bootstrap.json](client/lib/custom.bootstrap.json) | `bootstrap3` package config | Drop, replace with `@meteorjs/bootstrap` or vanilla npm install |
| `peppelg:bootstrap-3-modal` | Modal.show / Modal.hide | Replace with Bootstrap 5 `data-bs-toggle="modal"` + a thin Blaze helper |
| `.btn-default`, `.btn-xs` | Button styles | BS5 uses `.btn-secondary`, removes `.btn-xs` (need a custom utility) |
| `.col-sm-*`, `.col-md-*` | Grid | Still works in BS5 but breakpoints shifted; revisit per-template |
| `.has-error` | Form validation | BS5 uses `.is-invalid` on the input itself |
| `<i class="fa fa-…">` | FA4 icons | FA6 uses `<i class="fa-solid fa-…">` (free) or kit script |
| `.fa-fw` | Fixed-width icon | Still present in FA6 as `.fa-fw` |
| `client/views/includes/header.html` | Navbar collapse | BS5 dropped `navbar-default`; needs new class names + JS data attrs |
| `client/views/jobs/jobsRecent.less` | Custom panels | BS5 removed `.panel`; use `.card` |
| `client/views/admin/adminJobs.html` | Tabs + tables + buttons | All three need class renames |
| `AppDialog` template ([client/views/includes/appDialog.html](client/views/includes/appDialog.html)) | Modal markup | Already custom; needs class renames only, not a rewrite |

## Proposed phasing

This is best as **three** PRs, not one:

1. **Phase 1 — Build pipeline.** Replace the `bootstrap3` Atmosphere
   package with an npm dependency on `bootstrap@5.x` + `popper.js`.
   Wire `@import` in the existing `custom.bootstrap.less` (BS5 ships
   SCSS but Less compilation can consume the compiled CSS). Verify
   `meteor build` still works.
2. **Phase 2 — Class rename sweep.** Mostly mechanical:
   - `.btn-default` → `.btn-secondary`
   - `.btn-xs` → custom utility class
   - `.has-error` → `.is-invalid` (and rewrite the surrounding markup
     so it lives on the input)
   - `.panel` → `.card`
   - `.navbar-default` → `.navbar-light bg-light`
   - `data-toggle` → `data-bs-toggle` (modal, dropdown, collapse)
   - `data-target` → `data-bs-target`
   - `data-dismiss` → `data-bs-dismiss`
3. **Phase 3 — FA4 → FA6.** Either install the free kit script or use
   `@fortawesome/fontawesome-free` from npm. Mostly an icon class
   rename (`fa fa-foo` → `fa-solid fa-foo`).

## Estimated effort

- Phase 1: ~1 day.
- Phase 2: ~3 days (touches every template; needs visual regression
  testing on each route).
- Phase 3: ~½ day.

## Risk

- **Modal replacement.** `peppelg:bootstrap-3-modal` exposes
  `Modal.show()` / `Modal.hide()` programmatic helpers consumed in
  [client/views/jobs/jobDeactivate.js](client/views/jobs/jobDeactivate.js)
  and [client/views/user/userProfile.js](client/views/user/userProfile.js).
  Both will need a thin compatibility shim around BS5's
  `bootstrap.Modal` constructor.
- **Blaze + jQuery + BS5.** BS5 dropped its hard jQuery dependency.
  The repo still pulls jQuery for Blaze helpers, so the data-attr
  bindings keep working, but verify in case anyone bypassed BS3 JS
  and reached for `$('#x').modal('show')` directly.
- **AutoForm + `.has-error`.** AutoForm renders `.has-error`
  automatically. Either configure AutoForm's BS5 template (community
  fork available) or post-process the rendered markup.

## Out of scope for A9.28

- Replacing AutoForm itself. (Tracked separately in
  `FIXES_PLAN.md` as a longer-term consideration.)
- Replacing Blaze. The migration assumes Blaze stays; only the CSS
  layer flips.

## When to start

Wait until the **A9.13** Galaxy/Docker deploy story is green on a
staging URL. The visual diff during this migration is large and
needs a non-prod environment for QA.
