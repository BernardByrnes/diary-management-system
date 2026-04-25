-- Add sourceMilkSupplyId to MilkTransfer for FIFO traceability
ALTER TABLE "MilkTransfer" ADD COLUMN "sourceMilkSupplyId" TEXT;

ALTER TABLE "MilkTransfer"
  ADD CONSTRAINT "MilkTransfer_sourceMilkSupplyId_fkey"
  FOREIGN KEY ("sourceMilkSupplyId") REFERENCES "MilkSupply"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "MilkTransfer_sourceMilkSupplyId_idx" ON "MilkTransfer"("sourceMilkSupplyId");
