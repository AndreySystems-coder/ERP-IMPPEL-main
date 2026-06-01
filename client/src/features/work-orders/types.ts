export interface WorkOrderMaterial {
  inventoryId?: number;
  name: string;
  quantity: number;
  unit: string;
  inventoryUnit?: string;
}

export interface ServiceProgress {
  serviceName: string;
  started: boolean;
  startDate?: string;
  endDate?: string;
  finished: boolean;
  realMaterials: { name: string; inventoryId?: number; plannedQty: number; realQty: number }[];
  observations?: string;
}

export interface WorkOrderMaterialReconciliationItem {
  key: string;
  inventoryId: number | null;
  name: string;
  planned: number;
  withdrawn: number;
  consumed: number;
  returned: number;
  availableFromWithdrawal: number;
  pending: number;
  directConsumed: number;
  plannedVariance: number;
  status: "ok" | "pending" | "exceeded" | "direct";
}

export interface WorkOrderMaterialReconciliationResponse {
  workOrderId: number;
  items: WorkOrderMaterialReconciliationItem[];
  summary: {
    planned: number;
    withdrawn: number;
    consumed: number;
    returned: number;
    pending: number;
    directConsumed: number;
  };
  hasPending: boolean;
  hasDirectConsumption: boolean;
  generatedAt: string;
}
