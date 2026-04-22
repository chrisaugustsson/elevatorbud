-- Collapse the emergency-phone model/type pair into a single free-text
-- column. The old split was too rigid for the wide range of formats
-- customers actually write in the Excel "Nödtelefon" column — brand,
-- type, and model can appear in any order, some rows omit "Modell, ",
-- and the whole thing is often just a single copy-pasted phrase.
--
-- Steps:
--   1. Add `emergency_phone` (nullable text).
--   2. Backfill by joining existing model + type with ", ". If either
--      is null, use whichever is set. Empty string → null.
--   3. Drop the old columns.

ALTER TABLE "elevator_details" ADD COLUMN "emergency_phone" text;--> statement-breakpoint

UPDATE "elevator_details"
SET "emergency_phone" = NULLIF(
  CONCAT_WS(
    ', ',
    NULLIF(TRIM("emergency_phone_model"), ''),
    NULLIF(TRIM("emergency_phone_type"), '')
  ),
  ''
);--> statement-breakpoint

ALTER TABLE "elevator_details" DROP COLUMN "emergency_phone_model";--> statement-breakpoint
ALTER TABLE "elevator_details" DROP COLUMN "emergency_phone_type";
