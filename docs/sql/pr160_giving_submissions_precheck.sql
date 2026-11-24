-- PR #160 — migration 0005_giving_submissions: READ-ONLY checks before applying.
--
-- Run in the Supabase SQL editor (role postgres). Nothing here writes.
-- Every result must match the "expect" line. Stop if one does not.

-- 1. Who runs this. Expect: postgres
SELECT current_user;

-- 2. The new table must not exist yet. Expect: null
SELECT to_regclass('public.giving_submissions') AS giving_submissions;

-- 3. The migration record. Expect 5 rows (0000–0004) and the newest
--    created_at = 1793516228188 (0004_slip_split_items). No row with the
--    0005 hash below.
SELECT id, hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY created_at;

SELECT count(*) AS already_recorded
FROM drizzle.__drizzle_migrations
WHERE hash = '4fcfc9760736a455b0cadb9a9b2497faf2853c5113f72229a809b0329692d7a3';
-- Expect: 0

-- 4. Who owns the tables the app already writes to. Expect: postgres
--    (bank_signers and withdrawal_approvals belong to app_user; see
--    drizzle/README.md). The new table will be owned by postgres too.
SELECT tablename, tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('offerings', 'audit_logs', 'finance_accounts', 'line_slips')
ORDER BY tablename;

-- 5. How the app role gets its rights on tables postgres creates.
--    a) Rights on an existing postgres-owned table. Expect: true, true, true
SELECT
  has_table_privilege('app_user', 'public.offerings', 'SELECT') AS can_select,
  has_table_privilege('app_user', 'public.offerings', 'INSERT') AS can_insert,
  has_table_privilege('app_user', 'public.offerings', 'UPDATE') AS can_update;

--    b) Default privileges that apply to new tables and sequences.
--       If a row shows postgres granting to app_user (or to a role app_user
--       belongs to) for objtype r (tables) and S (sequences), the new table
--       inherits the rights and step 5 of the runbook can be skipped.
--       If not, step 5 (explicit GRANT) is required.
SELECT
  pg_get_userbyid(defaclrole) AS granted_by,
  defaclnamespace::regnamespace AS schema,
  defaclobjtype AS objtype,
  defaclacl AS acl
FROM pg_default_acl
ORDER BY 1, 2, 3;

--    c) Roles app_user belongs to (a default privilege may target one of them).
SELECT r.rolname AS member_of
FROM pg_auth_members m
JOIN pg_roles r ON r.oid = m.roleid
WHERE m.member = 'app_user'::regrole;
