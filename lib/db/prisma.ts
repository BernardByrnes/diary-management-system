import { PrismaClient, Prisma } from "@prisma/client";

const RETRYABLE_DB_CODES = new Set([
  "P1017", // Server has closed the connection
  "P1001", // Can't reach database server
  "P1008", // Operations timed out
]);

function isRetryable(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    RETRYABLE_DB_CODES.has(String((e as { code: string }).code))
  );
}

function makeClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const MAX = 3;
          for (let attempt = 1; attempt <= MAX; attempt++) {
            try {
              return await query(args);
            } catch (e) {
              if (attempt < MAX && isRetryable(e)) {
                await new Promise((r) => setTimeout(r, 400 * attempt));
                // Force Prisma to re-establish the connection (needed for Neon cold-start)
                await base.$disconnect().catch(() => {});
                await base.$connect().catch(() => {});
                continue;
              }
              throw e;
            }
          }
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof makeClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

export const prisma: ExtendedPrismaClient =
  globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Keep these exports for any existing usages
export function isRetryableDbError(e: unknown): boolean {
  return isRetryable(e);
}

export async function withDbRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < attempts - 1 && isRetryable(e)) {
        await new Promise((r) => setTimeout(r, 300 * (i + 1)));
        continue;
      }
      throw e;
    }
  }
  throw last;
}
