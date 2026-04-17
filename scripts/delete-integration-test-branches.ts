/**
 * One-off: remove branches left over from integration tests.
 * Run: npx tsx scripts/delete-integration-test-branches.ts
 */
import { deleteIntegrationTestBranches } from "../lib/db/delete-branch-cascade";
import { prisma } from "../lib/db/prisma";

async function main() {
  const n = await deleteIntegrationTestBranches();
  console.log(`Removed ${n} integration-test branch(es).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
