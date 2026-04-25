-- Performance indexes for date-range and branch-scoped queries.
-- All created with IF NOT EXISTS so they are safe to re-run.

CREATE INDEX IF NOT EXISTS "MilkSupply_branchId_date_idx"       ON "MilkSupply"("branchId", "date");
CREATE INDEX IF NOT EXISTS "Sale_branchId_date_idx"             ON "Sale"("branchId", "date");
CREATE INDEX IF NOT EXISTS "Expense_branchId_date_idx"          ON "Expense"("branchId", "date");
CREATE INDEX IF NOT EXISTS "Expense_branchId_period_idx"        ON "Expense"("branchId", "periodStart", "periodEnd");
CREATE INDEX IF NOT EXISTS "BankDeposit_branchId_date_idx"      ON "BankDeposit"("branchId", "date");
CREATE INDEX IF NOT EXISTS "MilkTransfer_source_date_idx"       ON "MilkTransfer"("sourceBranchId", "date");
CREATE INDEX IF NOT EXISTS "MilkTransfer_dest_date_idx"         ON "MilkTransfer"("destinationBranchId", "date");
CREATE INDEX IF NOT EXISTS "SupplierPayment_supplier_status_idx" ON "SupplierPayment"("supplierId", "status");
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx"     ON "Notification"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx"      ON "AuditLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "StockSnapshot_branchId_date_idx"    ON "StockSnapshot"("branchId", "date");
