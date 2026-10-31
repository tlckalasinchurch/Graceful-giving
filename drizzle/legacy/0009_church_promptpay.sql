-- The PromptPay ID donors pay to. The giving station turns it into a QR code
-- with the amount filled in.
ALTER TABLE "church_profiles" ADD COLUMN IF NOT EXISTS "promptPayId" varchar(20);
