-- Baseline of the schema as it stood when promptPayId was added.
--
-- This file does nothing on purpose. Every table and column below already
-- exists: older databases got them from the SQL in drizzle/legacy/ and from
-- server/schema_init.ts, and a new database gets them from server/schema_init.ts
-- when the app first connects. Its job is to give drizzle-kit a snapshot
-- (drizzle/meta/0000_snapshot.json) of the current schema, so that
-- `drizzle-kit generate` writes only what changed since.
SELECT 1;
