import { afterEach, vi } from "vitest";
import { auth } from "@/lib/auth/auth";

declare global {
  // eslint-disable-next-line no-var
  var __BWERA_TEST_COOKIE__: string | undefined;
}

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({
      cookie: globalThis.__BWERA_TEST_COOKIE__ ?? "",
    }),
}));

/** Avoid loading NextAuth + `next/server` in Vitest; API tests drive `auth()` explicitly. */
vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

afterEach(() => {
  globalThis.__BWERA_TEST_COOKIE__ = "";
  vi.mocked(auth).mockReset();
});
