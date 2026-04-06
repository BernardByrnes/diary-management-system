-- AlterTable
ALTER TABLE "MilkSupply" ADD COLUMN "retailPricePerLiter" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "milkSupplyId" TEXT;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_milkSupplyId_fkey" FOREIGN KEY ("milkSupplyId") REFERENCES "MilkSupply"("id") ON DELETE SET NULL ON UPDATE CASCADE;
