-- Add retailPricePerLiter to MilkTransfer so transferred milk carries the
-- retail price of its source delivery batch (FIFO pricing through transfers).
-- Nullable: existing transfers have no retail price recorded; new ones will.

ALTER TABLE "MilkTransfer" ADD COLUMN "retailPricePerLiter" DECIMAL(10,2);
