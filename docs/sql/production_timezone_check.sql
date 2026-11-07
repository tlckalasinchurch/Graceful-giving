-- READ-ONLY checks of the database time zone. Run each statement on the
-- database that the application uses. Do not run SET, ALTER DATABASE or
-- ALTER ROLE. These statements change nothing.
--
-- Run through the same connection string and role the application uses
-- (DATABASE_URL, the Supabase transaction pooler, role app_user), because a
-- role or a pooler can set its own time zone.

-- 1. The time zone of this session. Expected: UTC (or Etc/UTC).
SHOW TIME ZONE;

-- 2. The same value, with the source of the setting.
SELECT name, setting, source, boot_val, reset_val
FROM pg_settings
WHERE name = 'TimeZone';

-- 3. Time zone settings stored on the database or the role (they override the server default).
SELECT d.datname, r.rolname, s.setconfig
FROM pg_db_role_setting s
LEFT JOIN pg_database d ON d.oid = s.setdatabase
LEFT JOIN pg_roles    r ON r.oid = s.setrole
WHERE s.setconfig::text ILIKE '%timezone%';

-- 4. What the default for the "now()" columns would store, compared with UTC.
--    The two values must be equal. If they differ by hours, DEFAULT now() on a
--    "timestamp without time zone" column stores local time, not UTC.
SELECT now()::timestamp           AS stored_by_default_now,
       (now() AT TIME ZONE 'UTC') AS utc_wall_clock,
       now()::timestamp = (now() AT TIME ZONE 'UTC') AS default_now_is_utc;
