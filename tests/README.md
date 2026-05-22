# Tests

This directory holds Meteor + Mocha tests for the server-side code.

## Setup

1. Enable the test driver by uncommenting `meteortesting:mocha` in
   `.meteor/packages`.
2. Install npm deps:

   ```bash
   meteor npm install
   ```

3. Run once:

   ```bash
   meteor npm test
   ```

## Layout

- `helpers.tests.js` — pure-function helper coverage (no Mongo).
- `methods.tests.js` — DDP method smoke tests (jobs.create, jobs.deleteMine,
  adminSetJobStatus). Uses Mongo so the test command needs MongoDB
  available on `MONGO_URL`.

## CI

`.github/workflows/ci.yml` runs install, lint, then `meteor npm test`.
The test command runs the app in full-app mode with `settings-docker.json`
so server methods, collections, and startup code are available to the suite.
