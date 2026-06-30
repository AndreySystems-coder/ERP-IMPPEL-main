import { isReturnableMaterialItem, normalizeReturnCondition } from "./materialReturnPolicy";

export type ReturnableInventoryItem = {
  id: number;
  name: string;
  type?: string | null;
  category?: string | null;
  quantity: number;
};

export type ReturnableWithdrawalItem = {
  inventoryId?: number | null;
  productName?: string | null;
  name?: string | null;
  quantity?: number | null;
  returnedQuantity?: number | null;
  condition?: string | null;
};

export type ReturnableWithdrawal = {
  status?: string | null;
  items?: ReturnableWithdrawalItem[];
};

export type ReturnableToolSummary = {
  inventoryId: number;
  total: number;
  available: number;
  inField: number;
  damaged: number;
  lost: number;
  maintenance: number;
};

function toCount(value: unknown) {
  return Math.max(0, Math.trunc(Number(value) || 0));
}

export function buildReturnableToolSummary(
  item: ReturnableInventoryItem,
  withdrawals: ReturnableWithdrawal[],
): ReturnableToolSummary {
  const summary: ReturnableToolSummary = {
    inventoryId: item.id,
    available: toCount(item.quantity),
    inField: 0,
    damaged: 0,
    lost: 0,
    maintenance: 0,
    total: toCount(item.quantity),
  };

  if (!isReturnableMaterialItem(item)) return summary;

  for (const withdrawal of withdrawals || []) {
    for (const withdrawalItem of withdrawal.items || []) {
      if (Number(withdrawalItem.inventoryId) !== Number(item.id)) continue;

      const quantity = toCount(withdrawalItem.quantity);
      const returnedQuantity = Math.min(quantity, toCount(withdrawalItem.returnedQuantity));
      const pendingQuantity = Math.max(0, quantity - returnedQuantity);
      const condition = normalizeReturnCondition(withdrawalItem.condition);

      summary.inField += pendingQuantity;
      if (returnedQuantity > 0 && condition === "danificado") summary.damaged += returnedQuantity;
      if (returnedQuantity > 0 && condition === "perdido") summary.lost += returnedQuantity;
      if (returnedQuantity > 0 && condition === "manutencao") summary.maintenance += returnedQuantity;
    }
  }

  summary.total = summary.available + summary.inField + summary.damaged + summary.lost + summary.maintenance;
  return summary;
}

export function buildReturnableToolSummaryMap(
  inventory: ReturnableInventoryItem[],
  withdrawals: ReturnableWithdrawal[],
) {
  return new Map(inventory.map(item => [item.id, buildReturnableToolSummary(item, withdrawals)]));
}
