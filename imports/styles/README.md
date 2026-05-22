# `imports/styles/` — Bootstrap 5 staging area

> Files under `imports/` are **lazy-loaded** by Meteor. Nothing in this folder is bundled into the running app unless another module explicitly `import`s it.
>
> The Bootstrap 5 migration is checked in here so the rebrand PR can ship a foundation without changing a single rendered pixel. PR 2 and PR 3 will move these files into `client/` (or import them from a new client entry) to actually flip the framework.

## Files

| File | Purpose | Activated in |
| --- | --- | --- |
| [_app-bs5.scss](./_app-bs5.scss) | BS5 SCSS variable overrides for the brand palette, geometry, typography. Imports the full Bootstrap 5 SCSS bundle once uncommented. | PR 3 |
| [_useraccounts-bs5.scss](./_useraccounts-bs5.scss) | Auth-flow specific styling for the hand-rolled sign-in / sign-up / password-reset templates that replace `useraccounts:bootstrap`. | PR 2 |

## How to activate (cheatsheet)

### PR 2 — Replace `useraccounts:bootstrap`

```bash
# 1. add the SCSS compiler
meteor add fourseven:scss

# 2. write hand-rolled templates (TBD in PR 2)
#    client/views/account/{signIn,signUp,forgotPassword,resetPassword,verifyEmail,changePassword}.{html,js}

# 3. import the SCSS partials from a new client entry, e.g.
#    client/views/account/account.scss
#      @import "{employed:app}/imports/styles/_useraccounts-bs5";

# 4. wire router; remove the old packages
meteor remove useraccounts:bootstrap useraccounts:iron-routing
```

### PR 3 — Template sweep + BS3 removal

```bash
# 1. uncomment the `@import "{}/node_modules/bootstrap/scss/bootstrap";`
#    line at the bottom of imports/styles/_app-bs5.scss

# 2. create client/lib/app.scss and have it import the partial:
#      @import "{employed:app}/imports/styles/_app-bs5";

# 3. delete client/lib/custom.bootstrap.less + .json + .import.less
#    and client/lib/custom.bootstrap.mixins.import.less
#    (the BS3 sources)

# 4. find/replace the class names in templates per
#    brand/BS5-MIGRATION.md > "Template surgery"

# 5. drop the BS3 packages
meteor remove nemo64:bootstrap peppelg:bootstrap-3-modal less
```

## Why staged here and not under `client/`

Anything under `client/` is auto-compiled and shipped with the bundle. Auto-compiling these SCSS files alongside the still-mounted BS3 stylesheet would cause class-name collisions (`.btn`, `.row`, `.col-*`, `.alert`, `.modal`, …) — both frameworks define them with subtly different rules, and BS5's "improvements" would visually break BS3 templates.

`imports/` is Meteor's lazy-load zone: present in the repo, version-controlled, but inert until somebody imports them. That gives us a checked-in, reviewable foundation that doesn't ship until we say so.
