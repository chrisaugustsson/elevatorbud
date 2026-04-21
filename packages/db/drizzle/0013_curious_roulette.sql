-- Migrate elevators.inspection_month from free-text (Swedish month names
-- like "Maj", "Oktober") to a constrained integer 1–12.
--
-- The USING clause normalizes existing values in place:
--   - Swedish full/short names → integer via CASE
--   - Numeric strings ("5", "05") → integer if in range
--   - Everything else (typos, "?", "Okänt", …) → NULL
--
-- Running this against dev/prod preserves any already-correct values and
-- drops junk into NULL, rather than wiping the column outright. Rows
-- that end up NULL after this migration should be re-sourced from the
-- spreadsheet via an import pass.
ALTER TABLE "elevators" ALTER COLUMN "inspection_month" SET DATA TYPE integer USING (
  CASE lower(trim(trailing '.' from trim(inspection_month)))
    WHEN 'januari'   THEN 1  WHEN 'jan'  THEN 1
    WHEN 'februari'  THEN 2  WHEN 'feb'  THEN 2
    WHEN 'mars'      THEN 3  WHEN 'mar'  THEN 3
    WHEN 'april'     THEN 4  WHEN 'apr'  THEN 4
    WHEN 'maj'       THEN 5
    WHEN 'juni'      THEN 6  WHEN 'jun'  THEN 6
    WHEN 'juli'      THEN 7  WHEN 'jul'  THEN 7
    WHEN 'augusti'   THEN 8  WHEN 'aug'  THEN 8
    WHEN 'september' THEN 9  WHEN 'sep'  THEN 9  WHEN 'sept' THEN 9
    WHEN 'oktober'   THEN 10 WHEN 'okt'  THEN 10
    WHEN 'november'  THEN 11 WHEN 'nov'  THEN 11
    WHEN 'december'  THEN 12 WHEN 'dec'  THEN 12
    ELSE CASE
      WHEN inspection_month ~ '^[0-9]{1,2}$' AND inspection_month::int BETWEEN 1 AND 12
        THEN inspection_month::int
      ELSE NULL
    END
  END
);--> statement-breakpoint
ALTER TABLE "elevators" ADD CONSTRAINT "elevators_inspection_month_check" CHECK ("elevators"."inspection_month" IS NULL OR ("elevators"."inspection_month" >= 1 AND "elevators"."inspection_month" <= 12));
