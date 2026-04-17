/**
 * Collapse all suppliers into Fred Katalekwa (phone 0701000001).
 * Run: npx tsx scripts/consolidate-suppliers.ts
 */
import { consolidateSuppliersToFred } from "../lib/db/consolidate-suppliers";
import { prisma } from "../lib/db/prisma";

async function main() {
  const { fredId, deletedSupplierCount } = await consolidateSuppliersToFred();
  console.log(
    deletedSupplierCount === 0
      ? "Already a single supplier (Fred Katalekwa)."
      : `Removed ${deletedSupplierCount} extra supplier(s). Fred id: ${fredId}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
