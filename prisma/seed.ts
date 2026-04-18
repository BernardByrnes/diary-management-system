/**
 * Seed file deprecated - ED creates all data through the app UI.
 * This file is kept as a reference for the data structure.
 *
 * To clear all data and start fresh, run:
 *   npx tsx scripts/cleanup-mock-data.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seed file is deprecated. ED creates all data through the app UI.");
  console.log("If you need to clear mock data, run: npx tsx scripts/cleanup-mock-data.ts");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });