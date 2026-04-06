-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "organizationName" TEXT NOT NULL DEFAULT 'Bwera Cooperative Dairy',
    "currencySymbol" TEXT NOT NULL DEFAULT 'UGX',
    "financialYearStartMonth" INTEGER NOT NULL DEFAULT 1,
    "lactometerMin" DECIMAL(5,3) NOT NULL DEFAULT 1.026,
    "lactometerMax" DECIMAL(5,3) NOT NULL DEFAULT 1.032,
    "minReadingsPerWeek" INTEGER NOT NULL DEFAULT 2,
    "advanceWarningThreshold" DECIMAL(12,2) NOT NULL DEFAULT 500000,
    "discrepancyThreshold" DECIMAL(12,2) NOT NULL DEFAULT 5000,
    "customExpenseCategories" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);
