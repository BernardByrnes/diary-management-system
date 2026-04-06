-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "flaggedAt" TIMESTAMP(3),
ADD COLUMN     "flaggedById" TEXT,
ADD COLUMN     "isFlagged" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_flaggedById_fkey" FOREIGN KEY ("flaggedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
