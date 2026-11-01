-- Account state for LINE sign-in: new people start "pending" until an admin approves them.
-- Existing users stay "active".
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" varchar(12) DEFAULT 'active' NOT NULL;
