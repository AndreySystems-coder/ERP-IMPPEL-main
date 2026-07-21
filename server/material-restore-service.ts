import { createHash } from "node:crypto";

export type InventoryLike = {
  id: number;
  name: string;
  unit?: string | null;
};

export type MaterialRestoreItemInput = {
  inventoryId?: number | string | null;
  productName?: string | null;
  materialName?: string | null;
  name?: string | null;
  unit?: string | null;
  quantity?: number | string | null;
  returnedQuantity?: number | string | null;
  condition?: string | null;
};

export type ResolvedMaterialRestoreItem = {
  withdrawalId: number;
  inventoryId: number;
  productName: string;
  unit: string;
  quantity: number;
  returnedQuantity: number | null;
  condition: string;
  sourceName: string;
  resolution: "explicit-id" | "exact-name" | "normalized-name";
};

export type MaterialRestoreResolution = {
  resolved: ResolvedMaterialRestoreItem[];
  unresolved: string[];
};

export function normalizeRestoreText(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeMaterialName(value: unknown) {
  return normalizeRestoreText(value)
    .replace(/(\d+)\s*,\s*(\d+)\s*x\s*(\d+)/g, "$1,$2x$3")
    .replace(/\b(\d+)\s*mm\b/g, "$1 mm")
    .replace(/[()]/g, " ")
    .replace(/[^\p{L}\p{N},.x\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isHistoricalMaterialResponsible(value: unknown) {
  const normalized = normalizeRestoreText(value);
  return normalized === "nao trabalha para nos" || normalized === "não trabalha para nós";
}

export function createInventoryResolver(inventory: InventoryLike[]) {
  const byId = new Map(inventory.map(item => [Number(item.id), item]));
  const byExactName = new Map(inventory.map(item => [String(item.name || "").trim(), item]));
  const byNormalizedName = new Map(inventory.map(item => [normalizeMaterialName(item.name), item]));

  return (item: MaterialRestoreItemInput) => {
    const explicit = Number(item.inventoryId || 0);
    if (explicit > 0 && byId.has(explicit)) {
      return { item: byId.get(explicit)!, resolution: "explicit-id" as const };
    }

    const name = String(item.productName || item.materialName || item.name || "").trim();
    const exact = byExactName.get(name);
    if (exact) return { item: exact, resolution: "exact-name" as const };

    const normalized = byNormalizedName.get(normalizeMaterialName(name));
    if (normalized) return { item: normalized, resolution: "normalized-name" as const };

    return null;
  };
}

export function resolveMaterialRestoreItems(
  inventory: InventoryLike[],
  items: MaterialRestoreItemInput[],
): MaterialRestoreResolution {
  const resolve = createInventoryResolver(inventory);
  const resolved: ResolvedMaterialRestoreItem[] = [];
  const unresolved: string[] = [];

  for (const item of items || []) {
    const sourceName = String(item.productName || item.materialName || item.name || "sem nome").trim();
    const match = resolve(item);
    const quantity = Math.ceil(Number(item.quantity || 0));

    if (!match || quantity <= 0) {
      unresolved.push(sourceName);
      continue;
    }

    resolved.push({
      withdrawalId: 0,
      inventoryId: Number(match.item.id),
      productName: String(match.item.name),
      unit: match.item.unit || item.unit || "unid",
      quantity,
      returnedQuantity: item.returnedQuantity ? Math.ceil(Number(item.returnedQuantity)) : null,
      condition: item.condition || "bom",
      sourceName,
      resolution: match.resolution,
    });
  }

  return { resolved, unresolved };
}

export function materialItemsFingerprint(items: Array<{ inventoryId?: number; productName?: string; quantity?: number; unit?: string }>) {
  return items
    .map(item => [
      Number(item.inventoryId || 0),
      normalizeMaterialName(item.productName),
      Math.ceil(Number(item.quantity || 0)),
      normalizeRestoreText(item.unit || "unid"),
    ].join(":"))
    .sort()
    .join("|");
}

export function createMaterialRestoreFingerprint(input: {
  backupType: "controle-materiais" | "estoque";
  sourceHash?: string | null;
  date?: string | null;
  operationType: string;
  responsible?: string | null;
  historicalResponsibleName?: string | null;
  items: Array<{ inventoryId?: number; productName?: string; quantity?: number; unit?: string }>;
  origin?: string | null;
  observation?: string | null;
  logicalIndex?: number | string | null;
}) {
  const canonical = {
    backupType: input.backupType,
    sourceHash: normalizeRestoreText(input.sourceHash),
    date: input.date || "",
    operationType: normalizeRestoreText(input.operationType),
    responsible: normalizeRestoreText(input.responsible || input.historicalResponsibleName),
    items: materialItemsFingerprint(input.items),
    origin: normalizeRestoreText(input.origin),
    observation: normalizeRestoreText(input.observation),
    logicalIndex: String(input.logicalIndex ?? ""),
  };

  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
