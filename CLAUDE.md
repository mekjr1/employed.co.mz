# Employed - Architecture Notes

## Overview

Employed is a Meteor job board adapted from the original We Work Meteor codebase. The first target markets are Mexico and Mozambique.

## Technology Stack

- Framework: Meteor 2.7.1
- Runtime: Node.js 8.11.4
- Database: MongoDB
- UI: Bootstrap 3, Blaze, Iron Router
- Forms: AutoForm with Collection2 schemas
- Auth: Meteor Accounts with OAuth support

## Application Structure

```text
/both/           # Shared client/server code
  |-- collections/
  |-- lib/
/client/         # Client templates, helpers, and styles
  |-- views/
  |-- lib/
/server/         # Publications, methods, API, RSS, hooks
/public/         # Static assets
/router.js       # Route definitions
```

## Current Product Scope

- Public job listings for Mexico and Mozambique
- Job country field restricted to `Mexico` and `Mozambique`
- Admin approval workflow: `pending` -> `active` -> `filled`/`inactive`
- 90-day listing expiration
- Featured job payments via Stripe
- reCAPTCHA v3 protection for new job submissions
- RSS and JSON feeds for active jobs

## Configuration

The app requires a Meteor settings file. `settings-example.json` documents the expected values:

- Stripe publishable and secret keys
- reCAPTCHA v3 site and secret keys
- Admin notification email
- Sender email
- Optional development reCAPTCHA bypass

## Commands

```bash
meteor npm install
meteor --settings settings-example.json
npm run lint
```

## Notes

- Profile/developer-directory code still exists but is disabled in routes and navigation.
- New job creation goes through `server/methods.js` so reCAPTCHA can be verified server-side.
- `both/lib/constants.js` contains app name, country options, job types, and featured-job pricing constants.
- The project was originally imported from `nate-strauser/wework`; `upstream` points to that repository.
