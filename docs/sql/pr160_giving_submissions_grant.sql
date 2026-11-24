-- PR #160 — rights for the app role on the new table.
--
-- Needed ONLY if precheck step 5b showed no default privilege that already
-- gives app_user these rights on tables and sequences postgres creates.
-- Run after pr160_giving_submissions_apply.sql, as postgres, with approval.
--
-- The app reads a submission, inserts it, and updates its offering ids.
-- It never deletes one, so DELETE is not granted.

BEGIN;
GRANT SELECT, INSERT, UPDATE ON TABLE public.giving_submissions TO app_user;
GRANT USAGE, SELECT ON SEQUENCE public.giving_submissions_id_seq TO app_user;
COMMIT;
