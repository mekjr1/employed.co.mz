// A9.32 — PR 2 of Bootstrap-5 migration.
//
// Pre-PR 2 this file held the `AccountsTemplates.configure({...})` and
// `AccountsTemplates.addField(...)` calls that drove the
// `useraccounts:bootstrap` UI. PR 2 retired those packages
// (`useraccounts:bootstrap`, `useraccounts:iron-routing`,
// `useraccounts:core`) in favour of hand-rolled Blaze templates that
// talk to `Accounts.*` directly.
//
// The replacement lives in:
//   - client/views/account/auth.html         — sign-in / sign-up /
//     forgot-password / reset-password / verify-email templates
//   - client/views/account/auth.js           — handlers + i18n
//   - router.js                              — five iron-router routes
//   - server/accounts.js                     — Accounts.config +
//                                              Accounts.urls overrides
//
// This file is intentionally a no-op: no shared client+server auth
// code is needed any more. It is kept (rather than deleted) because
// references to `accounts.js` appear in the historical changelog and
// migration notes, and an empty module keeps `git blame` honest.
//
// Original PR 2 plan (rejected): leave `useraccounts:bootstrap`
// mounted as a rollback safety net. That failed in practice because
// `useraccounts:core/lib/server.js` calls
// `Accounts.config({ forbidClientAccountCreation: true })` at module
// load time and provides its own `ATCreateUserServer` method. New
// hand-rolled templates call `Accounts.createUser` directly, which
// the gate rejects with "Signups forbidden". The fix in this commit
// is to also remove the three useraccounts packages from
// `.meteor/packages` so the gate never engages.