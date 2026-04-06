import type { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { format } from "date-fns";

const BRANCH_KEYS = new Set([
  "branchId",
  "sourceBranchId",
  "destinationBranchId",
]);

const SUPPLIER_KEYS = new Set(["supplierId"]);

const USER_KEYS = new Set([
  "ownerId",
  "recordedById",
  "managerId",
  "reviewedById",
]);

const MILK_SUPPLY_KEYS = new Set(["milkSupplyId"]);

export type AuditLogRow = {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  changes: unknown;
  createdAt: Date;
  user: { id: string; fullName: string; role: string };
};

export type EnrichedAuditLogRow = Omit<AuditLogRow, "changes"> & {
  /** Resolved display name for the row’s entity (entityId kept as-is). */
  entityName: string | null;
  changes: unknown;
};

type LabelMaps = {
  branches: Map<string, string>;
  suppliers: Map<string, string>;
  users: Map<string, string>;
  milkSupplies: Map<string, string>;
};

/** For each `idKey` present on an object, we add `nameKey` with the resolved label (IDs unchanged). */
const COMPANION_NAME_KEYS: {
  idKey: string;
  nameKey: string;
  map: keyof LabelMaps;
}[] = [
  { idKey: "branchId", nameKey: "branchName", map: "branches" },
  { idKey: "sourceBranchId", nameKey: "sourceBranchName", map: "branches" },
  {
    idKey: "destinationBranchId",
    nameKey: "destinationBranchName",
    map: "branches",
  },
  { idKey: "supplierId", nameKey: "supplierName", map: "suppliers" },
  { idKey: "ownerId", nameKey: "ownerName", map: "users" },
  { idKey: "recordedById", nameKey: "recordedByName", map: "users" },
  { idKey: "managerId", nameKey: "managerName", map: "users" },
  { idKey: "reviewedById", nameKey: "reviewedByName", map: "users" },
  { idKey: "milkSupplyId", nameKey: "milkSupplyName", map: "milkSupplies" },
];

function collectIdsFromChanges(
  changes: unknown,
  acc: {
    branches: Set<string>;
    suppliers: Set<string>;
    users: Set<string>;
    milkSupplies: Set<string>;
  }
): void {
  if (changes == null) return;
  if (typeof changes !== "object") return;
  if (Array.isArray(changes)) {
    for (const item of changes) collectIdsFromChanges(item, acc);
    return;
  }
  const o = changes as Record<string, unknown>;
  for (const [key, val] of Object.entries(o)) {
    if (key === "before" || key === "after") {
      collectIdsFromChanges(val, acc);
      continue;
    }
    if (typeof val === "string" && val.length >= 8) {
      if (BRANCH_KEYS.has(key)) acc.branches.add(val);
      else if (SUPPLIER_KEYS.has(key)) acc.suppliers.add(val);
      else if (USER_KEYS.has(key)) acc.users.add(val);
      else if (MILK_SUPPLY_KEYS.has(key)) acc.milkSupplies.add(val);
    }
    if (val != null && typeof val === "object") {
      collectIdsFromChanges(val, acc);
    }
  }
}

function collectEntityIdsForName(
  entityType: string,
  entityId: string,
  acc: {
    branches: Set<string>;
    suppliers: Set<string>;
    users: Set<string>;
    milkSupplies: Set<string>;
  }
): void {
  switch (entityType) {
    case "Branch":
      acc.branches.add(entityId);
      break;
    case "Supplier":
      acc.suppliers.add(entityId);
      break;
    case "User":
      acc.users.add(entityId);
      break;
    case "MilkSupply":
      acc.milkSupplies.add(entityId);
      break;
    default:
      break;
  }
}

function addCompanionNames(o: Record<string, unknown>, maps: LabelMaps): void {
  for (const { idKey, nameKey, map } of COMPANION_NAME_KEYS) {
    if (o[nameKey] !== undefined) continue;
    const id = o[idKey];
    if (typeof id !== "string" || id.length < 8) continue;
    const label = maps[map].get(id);
    if (label !== undefined) {
      o[nameKey] = label;
    }
  }
}

function enrichChangesDeep(changes: unknown, maps: LabelMaps): unknown {
  if (changes == null) return changes;
  if (typeof changes !== "object") return changes;
  if (Array.isArray(changes)) {
    return changes.map((item) => enrichChangesDeep(item, maps));
  }
  const o = changes as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (k === "before" || k === "after") {
      out[k] = enrichChangesDeep(v, maps);
      continue;
    }
    if (v != null && typeof v === "object" && !Array.isArray(v)) {
      out[k] = enrichChangesDeep(v, maps);
    } else {
      out[k] = v;
    }
  }
  addCompanionNames(out, maps);
  return out;
}

async function loadLabelMaps(acc: {
  branches: Set<string>;
  suppliers: Set<string>;
  users: Set<string>;
  milkSupplies: Set<string>;
}): Promise<LabelMaps> {
  const [branches, suppliers, users, milkSupplies] = await Promise.all([
    acc.branches.size > 0
      ? prisma.branch.findMany({
          where: { id: { in: [...acc.branches] } },
          select: { id: true, name: true },
        })
      : [],
    acc.suppliers.size > 0
      ? prisma.supplier.findMany({
          where: { id: { in: [...acc.suppliers] } },
          select: { id: true, name: true },
        })
      : [],
    acc.users.size > 0
      ? prisma.user.findMany({
          where: { id: { in: [...acc.users] } },
          select: { id: true, fullName: true },
        })
      : [],
    acc.milkSupplies.size > 0
      ? prisma.milkSupply.findMany({
          where: { id: { in: [...acc.milkSupplies] } },
          select: {
            id: true,
            date: true,
            branch: { select: { name: true } },
            supplier: { select: { name: true } },
          },
        })
      : [],
  ]);

  const milkSupplyMap = new Map<string, string>();
  for (const ms of milkSupplies) {
    const d = format(new Date(ms.date), "dd MMM yyyy");
    const label = `${d} · ${ms.branch.name} · ${ms.supplier.name}`;
    milkSupplyMap.set(ms.id, label);
  }

  return {
    branches: new Map(branches.map((b) => [b.id, b.name])),
    suppliers: new Map(suppliers.map((s) => [s.id, s.name])),
    users: new Map(users.map((u) => [u.id, u.fullName])),
    milkSupplies: milkSupplyMap,
  };
}

function entityNameFor(
  entityType: string,
  entityId: string,
  maps: LabelMaps
): string | null {
  if (entityType === "SystemSettings") {
    return "System settings";
  }
  switch (entityType) {
    case "Branch":
      return maps.branches.get(entityId) ?? null;
    case "Supplier":
      return maps.suppliers.get(entityId) ?? null;
    case "User":
      return maps.users.get(entityId) ?? null;
    case "MilkSupply":
      return maps.milkSupplies.get(entityId) ?? null;
    default:
      return null;
  }
}

/**
 * Adds parallel `*Name` fields next to known `*Id` keys in `changes` (IDs unchanged).
 * Adds `entityName` for the row when the entity type is resolvable.
 */
export async function enrichAuditLogRows(
  logs: AuditLogRow[]
): Promise<EnrichedAuditLogRow[]> {
  if (logs.length === 0) return [];

  const acc = {
    branches: new Set<string>(),
    suppliers: new Set<string>(),
    users: new Set<string>(),
    milkSupplies: new Set<string>(),
  };

  for (const log of logs) {
    collectIdsFromChanges(log.changes, acc);
    collectEntityIdsForName(log.entityType, log.entityId, acc);
  }

  const maps = await loadLabelMaps(acc);

  return logs.map((log) => ({
    ...log,
    changes:
      log.changes != null
        ? enrichChangesDeep(
            JSON.parse(JSON.stringify(log.changes)) as unknown,
            maps
          )
        : log.changes,
    entityName: entityNameFor(log.entityType, log.entityId, maps),
  }));
}
