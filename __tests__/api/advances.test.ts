// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { GET, POST } from "@/app/api/advances/route";
import { prisma } from "@/lib/db/prisma";
import {
  seedUserId,
  setMockAuthUserId,
  firstSupplierId,
  branchIdByName,
} from "../helpers/setup";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

describe("/api/advances", () => {
  let edId: string;
  let managerId: string;
  let supplierId: string;
  let branchId: string;

  beforeAll(async () => {
    edId = await seedUserId("ED");
    managerId = await seedUserId("MANAGER");
    supplierId = await firstSupplierId();
    branchId = await branchIdByName("Bwera Nyendo");
  });

  it("ED can create → 201", async () => {
    await setMockAuthUserId(edId);
    const amount = 25_000;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const res = await POST(
      new Request("http://localhost/api/advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientType: "SUPPLIER",
          amount,
          date: ymd(yesterday),
          purpose: "Integration test advance",
          supplierId,
          branchId,
        }),
      })
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { amount: string | number };
    expect(Number(body.amount)).toBe(amount);
  });

  it("Manager cannot create → 403", async () => {
    await setMockAuthUserId(managerId);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const res = await POST(
      new Request("http://localhost/api/advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientType: "SUPPLIER",
          amount: 1000,
          date: ymd(yesterday),
          purpose: "Should fail",
          supplierId,
        }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("outstanding balance updates correctly for supplier", async () => {
    const before = await prisma.advance.aggregate({
      _sum: { amount: true },
      where: {
        supplierId,
        recipientType: "SUPPLIER",
        isDeducted: false,
      },
    });
    const beforeTotal = Number(before._sum.amount ?? 0);

    const addAmount = 15_777;
    await setMockAuthUserId(edId);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const res = await POST(
      new Request("http://localhost/api/advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientType: "SUPPLIER",
          amount: addAmount,
          date: ymd(yesterday),
          purpose: "Outstanding balance test",
          supplierId,
          branchId,
        }),
      })
    );
    expect(res.status).toBe(201);

    const after = await prisma.advance.aggregate({
      _sum: { amount: true },
      where: {
        supplierId,
        recipientType: "SUPPLIER",
        isDeducted: false,
      },
    });
    const afterTotal = Number(after._sum.amount ?? 0);
    expect(afterTotal - beforeTotal).toBe(addAmount);
  });

  it("GET is ED-only — manager gets 403", async () => {
    await setMockAuthUserId(managerId);
    const res = await GET();
    expect(res.status).toBe(403);
  });
});
