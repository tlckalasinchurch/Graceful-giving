-- PR #160 — READ-ONLY checks after applying (and granting, if it was needed).

-- 1. Table and index exist. Expect: giving_submissions, giving_submissions_key_uniq
SELECT to_regclass('public.giving_submissions') AS table_name,
       to_regclass('public.giving_submissions_key_uniq') AS index_name;

-- 2. Columns. Expect 7 rows: id, churchId, submissionKey, userId,
--    fingerprint, offeringIds, createdAt
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'giving_submissions'
ORDER BY ordinal_position;

-- 3. Empty. Expect: 0
SELECT count(*) AS rows FROM public.giving_submissions;

-- 4. Recorded once, and it is now the newest row. Expect: 1 and 1795531702900
SELECT count(*) AS recorded
FROM drizzle.__drizzle_migrations
WHERE hash = '4fcfc9760736a455b0cadb9a9b2497faf2853c5113f72229a809b0329692d7a3';
SELECT max(created_at) AS newest FROM drizzle.__drizzle_migrations;

-- 5. The app role can use it. Expect: true for all four
SELECT
  has_table_privilege('app_user', 'public.giving_submissions', 'SELECT') AS can_select,
  has_table_privilege('app_user', 'public.giving_submissions', 'INSERT') AS can_insert,
  has_table_privilege('app_user', 'public.giving_submissions', 'UPDATE') AS can_update,
  has_sequence_privilege('app_user', 'public.giving_submissions_id_seq', 'USAGE') AS can_use_sequence;
