// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { GET, POST } from "@/app/api/milk-supply/route";
import {
  seedUserId,
  setMockAuthUserId,
  branchIdByName,
  firstSupplierId,
} from "../helpers/setup";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

describe("/api/milk-supply", () => {
  let edId: string;
  let managerId: string;
  let branchCentralId: string;
  let supplierId: string;

  beforeAll(async () => {
    edId = await seedUserId("ED");
    managerId = await seedUserId("MANAGER");
    branchCentralId = await branchIdByName("Bwera Central");
    supplierId = await firstSupplierId();
  });

  it("valid creation → 201, totalCost computed correctly", async () => {
    await setMockAuthUserId(edId);
    const liters = 42.5;
    const costPerLiter = 1200;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const res = await POST(
      new Request("http://localhost/api/milk-supply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: ymd(yesterday),
          branchId: branchCentralId,
          supplierId,
          liters,
          costPerLiter,
          retailPricePerLiter: 1700,
        }),
      })
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { totalCost: number };
    expect(Number(body.totalCost)).toBe(liters * costPerLiter);
  });

  it("future date → 400", async () => {
    await setMockAuthUserId(edId);
    const future = new Date();
    future.setDate(future.getDate() + 3);
    const res = await POST(
      new Request("http://localhost/api/milk-supply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: ymd(future),
          branchId: branchCentralId,
          supplierId,
          liters: 10,
          costPerLiter: 1200,
          retailPricePerLiter: 1700,
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("negative liters → 400", async () => {
    await setMockAuthUserId(edId);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const res = await POST(
      new Request("http://localhost/api/milk-supply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: ymd(yesterday),
          branchId: branchCentralId,
          supplierId,
          liters: -5,
          costPerLiter: 1200,
          retailPricePerLiter: 1700,
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("Manager cannot post to unassigned branch → 403", async () => {
    await setMockAuthUserId(managerId);
    const otherBranchId = await branchIdByName("Bwera Kyabugimbi");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const res = await POST(
      new Request("http://localhost/api/milk-supply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: ymd(yesterday),
          branchId: otherBranchId,
          supplierId,
          liters: 5,
          costPerLiter: 1200,
          retailPricePerLiter: 1700,
        }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("GET returns 200 for authenticated ED", async () => {
    await setMockAuthUserId(edId);
    const res = await GET();
    expect(res.status).toBe(200);
  });
});
