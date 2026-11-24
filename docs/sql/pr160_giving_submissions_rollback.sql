-- PR #160 — undo migration 0005_giving_submissions.
--
-- Use only with the PO's approval, in one of these two cases:
--
--   A. PR #160 is NOT deployed to production (not merged, or its deploy was
--      rolled back in Vercel). Safe: no running code uses the table.
--
--   B. PR #160 IS live. First roll production back in Vercel to the deploy
--      before PR #160 and confirm it is serving. Only then run this.
--      Dropping the table while PR #160 is live makes every staff save from
--      the Giving Station fail.
--
-- What is lost: only the submission keys. The offerings those submissions
-- created stay in "offerings", with their fund changes and audit entries.
-- Losing a key only means an old retry would no longer be recognised.
-- To keep a copy first, run:
--   SELECT * FROM public.giving_submissions;
-- and save the result.

BEGIN;

DROP TABLE IF EXISTS public.giving_submissions;  -- drops its index and sequence too

DELETE FROM "drizzle"."__drizzle_migrations"
WHERE hash = '4fcfc9760736a455b0cadb9a9b2497faf2853c5113f72229a809b0329692d7a3';

COMMIT;
