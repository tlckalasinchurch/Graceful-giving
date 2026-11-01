-- What a donor declared when submitting a slip from the giving station.
-- Staff still confirm the real amount, category and fund during review.
ALTER TABLE "line_slips" ADD COLUMN IF NOT EXISTS "declaredAmount" numeric(15, 2);
ALTER TABLE "line_slips" ADD COLUMN IF NOT EXISTS "declaredCategory" "offering_category";
ALTER TABLE "line_slips" ADD COLUMN IF NOT EXISTS "declaredFundId" integer;
