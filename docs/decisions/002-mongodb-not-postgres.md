# ADR-002: MongoDB (not PostgreSQL)

**Status:** Accepted (divergence from portfolio standard)  
**Date:** Inherited from upstream  
**Context:** The portfolio standard (S-05) recommends PostgreSQL. Employed inherits MongoDB from the Meteor framework and the upstream `wework` codebase. Meteor's reactivity system (`livedata`, oplog tailing) is deeply coupled to MongoDB.  
**Decision:** Keep MongoDB. Migrating to PostgreSQL would require replacing Meteor's data layer, which is effectively a full rewrite.  
**Consequences:** Accepted divergence documented in `CLAUDE.md` standards table. MongoDB 5+ is pinned in Docker and production.
