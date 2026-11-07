-- READ-ONLY diagnostic: withdrawals that may sit in the wrong counting round.
--
-- Why: before the fix, the "Bangkok date" helper read the UTC-stored timestamp as
-- Bangkok local time. A payout made on a counting Sunday from 14:00 to 23:59
-- Bangkok time skipped that Sunday's round and went to a later one (or stayed
-- unattached). See docs/FINAL_FINANCIAL_DATE_INTEGRITY_REPORT.md.
--
-- How to run (never against Production without the owner's approval):
--   1. Replace 'demo-church' below with the church id (the CHURCH_ID value).
--   2. Run on a copy of the data, or inside a read-only transaction:
--        BEGIN READ ONLY;  -- paste the queries  --  ROLLBACK;
--   3. Treat the output as a list to REVIEW. It is evidence, not a verdict.
--
-- This file contains SELECT statements only. It changes nothing. Do not move,
-- delete, or rewrite a bank record because of this output without the owner's
-- written approval and reconciliation against the passbook.
--
-- Method: for each withdrawal bank line, find the earliest round that the
-- corrected rule would have chosen when the line was written: a round that
-- existed (createdAt <= line createdAt), was still open (not posted or closed
-- before the line was written), and whose Bangkok date is on or after the
-- payout's Bangkok date. If that round is earlier than the round the line sits
-- in, or if the line sits in a round dated before the payout, the line is listed.
-- A round's status at that moment is rebuilt from postedAt and closedAt. A round
-- that was posted by hand with no postedAt can hide a case or add a false one.

-- ─── A. Lines in a round that the corrected rule would not have chosen ────────
WITH params AS (
  SELECT 'demo-church'::text AS church_id
),
paid AS (
  SELECT br.id            AS bank_record_id,
         br."withdrawalRequestId" AS request_id,
         br."sessionId"   AS attached_session_id,
         br.amount,
         br."createdAt"   AS attached_at,
         wr."disbursedAt" AS paid_at_utc,
         ((wr."disbursedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok')        AS paid_at_bangkok,
         ((wr."disbursedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok')::date  AS paid_date_bangkok
  FROM bank_records br
  JOIN withdrawal_requests wr ON wr.id = br."withdrawalRequestId"
  JOIN params p ON p.church_id = br."churchId"
  WHERE br.type = 'withdrawal'
    AND wr."disbursedAt" IS NOT NULL
),
rounds AS (
  SELECT cs.*,
         ((cs."serviceDate" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok')::date AS service_date_bangkok
  FROM counting_sessions cs
  JOIN params p ON p.church_id = cs."churchId"
)
SELECT a.request_id,
       a.bank_record_id,
       a.amount,
       a.paid_at_utc,
       a.paid_at_bangkok,
       att.id                    AS attached_session_id,
       att.service_date_bangkok  AS attached_service_date,
       att."serviceRound"        AS attached_round,
       att.status                AS attached_status,
       earlier.id                AS earlier_open_session_id,
       earlier.service_date_bangkok AS earlier_service_date,
       earlier."serviceRound"    AS earlier_round,
       earlier.status            AS earlier_status_now,
       CASE
         WHEN att.service_date_bangkok < a.paid_date_bangkok THEN 'ATTACHED_BEFORE_PAYOUT_DATE'
         ELSE 'SKIPPED_EARLIER_OPEN_ROUND'
       END AS reason
FROM paid a
JOIN rounds att ON att.id = a.attached_session_id
LEFT JOIN LATERAL (
  SELECT e.*
  FROM rounds e
  WHERE e.service_date_bangkok >= a.paid_date_bangkok
    AND (e."serviceDate", e."serviceRound", e.id) < (att."serviceDate", att."serviceRound", att.id)
    AND e."createdAt" <= a.attached_at
    AND (e."postedAt" IS NULL OR e."postedAt" > a.attached_at)
    AND (e."closedAt" IS NULL OR e."closedAt" > a.attached_at)
  ORDER BY e."serviceDate", e."serviceRound", e.id
  LIMIT 1
) earlier ON true
WHERE att.service_date_bangkok < a.paid_date_bangkok
   OR earlier.id IS NOT NULL
ORDER BY a.paid_at_utc, a.request_id;

-- ─── B. Paid requests with no bank line although an open round could take them ─
-- These wait for the next new round (the sweep runs only when a round opens).
WITH params AS (
  SELECT 'demo-church'::text AS church_id
)
SELECT wr.id          AS request_id,
       wr.amount,
       wr."disbursedAt" AS paid_at_utc,
       ((wr."disbursedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok') AS paid_at_bangkok,
       e.id           AS open_session_id,
       ((e."serviceDate" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok')::date AS open_service_date,
       e."serviceRound" AS open_round,
       e.status       AS open_status
FROM withdrawal_requests wr
JOIN params p ON p.church_id = wr."churchId"
LEFT JOIN bank_records br ON br."withdrawalRequestId" = wr.id
JOIN LATERAL (
  SELECT cs.*
  FROM counting_sessions cs
  WHERE cs."churchId" = wr."churchId"
    AND cs.status IN ('counting', 'counted', 'verified')
    AND ((cs."serviceDate" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok')::date
        >= ((wr."disbursedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok')::date
  ORDER BY cs."serviceDate", cs."serviceRound", cs.id
  LIMIT 1
) e ON true
WHERE wr.status = 'disbursed'
  AND wr."disbursedAt" IS NOT NULL
  AND br.id IS NULL
ORDER BY wr."disbursedAt", wr.id;
