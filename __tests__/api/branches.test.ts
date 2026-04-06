// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { GET, POST } from "@/app/api/branches/route";
import { prisma } from "@/lib/db/prisma";
import {
  seedUserId,
  setMockAuthUserId,
} from "../helpers/setup";

describe("/api/branches", () => {
  let edId: string;
  let managerId: string;
  let ownerId: string;
  let managedBranchIds: string[];

  beforeAll(async () => {
    edId = await seedUserId("ED");
    managerId = await seedUserId("MANAGER");
    ownerId = await seedUserId("OWNER");
    const rows = await prisma.branchManager.findMany({
      where: { managerId },
      select: { branchId: true },
    });
    managedBranchIds = rows.map((r) => r.branchId);
  });

  it("ED can create branch → 201", async () => {
    await setMockAuthUserId(edId);
    const name = `API Branch ${Date.now()}`;
    const res = await POST(
      new Request("http://localhost/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          location: "Integration test location",
          ownerId,
        }),
      })
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { name: string };
    expect(body.name).toBe(name);
  });

  it("ED duplicate name → 400", async () => {
    await setMockAuthUserId(edId);
    const res = await POST(
      new Request("http://localhost/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Bwera Central",
          location: "Somewhere",
          ownerId,
        }),
      })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBeDefined();
  });

  it("Manager cannot create branch → 403", async () => {
    await setMockAuthUserId(managerId);
    const res = await POST(
      new Request("http://localhost/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Blocked ${Date.now()}`,
          location: "X",
          ownerId,
        }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("Manager only sees assigned branches", async () => {
    await setMockAuthUserId(managerId);
    const res = await GET();
    expect(res.status).toBe(200);
    const branches = (await res.json()) as { id: string }[];
    expect(branches.length).toBeGreaterThan(0);
    for (const b of branches) {
      expect(managedBranchIds).toContain(b.id);
    }
  });
});
