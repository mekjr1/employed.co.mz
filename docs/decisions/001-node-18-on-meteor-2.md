# ADR-001: Meteor 2.7.1 on Node 18

**Status:** Accepted  
**Date:** 2025 (A9.11)  
**Context:** Meteor 2.7.1 ships with Node 14, which reached EOL in April 2023.  
**Decision:** Bump the runtime to Node 18 LTS in Docker and CI while staying on Meteor 2.7.1. The Meteor build toolchain still targets Node 14 internally, but the server bundle runs on Node 18 without issues.  
**Consequences:** We get security patches and modern Node APIs. A full Meteor 3 upgrade (which natively targets Node 20) is tracked separately in `docs/meteor-3-package-audit.md`.
