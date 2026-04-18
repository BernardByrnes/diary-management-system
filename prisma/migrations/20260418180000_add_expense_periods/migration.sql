-- Add periodStart and periodEnd to Expense for bi-monthly batch grouping.
-- Existing rows are backfilled using their date column:
--   day 1-15  → period 1st to 15th of that month
--   day 16-31 → period 16th to last day of that month

ALTER TABLE "Expense" ADD COLUMN "periodStart" TIMESTAMP(3);
ALTER TABLE "Expense" ADD COLUMN "periodEnd" TIMESTAMP(3);

UPDATE "Expense" SET
  "periodStart" = CASE
    WHEN EXTRACT(DAY FROM "date") <= 15
      THEN DATE_TRUNC('month', "date")
    ELSE DATE_TRUNC('month', "date") + INTERVAL '15 days'
  END,
  "periodEnd" = CASE
    WHEN EXTRACT(DAY FROM "date") <= 15
      THEN DATE_TRUNC('month', "date") + INTERVAL '14 days'
    ELSE (DATE_TRUNC('month', "date") + INTERVAL '1 month' - INTERVAL '1 day')
  END;

ALTER TABLE "Expense" ALTER COLUMN "periodStart" SET NOT NULL;
ALTER TABLE "Expense" ALTER COLUMN "periodEnd" SET NOT NULL;
ALTER TABLE "Expense" ALTER COLUMN "periodStart" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Expense" ALTER COLUMN "periodEnd" SET DEFAULT CURRENT_TIMESTAMP;
