export type InventoryItem = { id: number; name: string; unit: string; quantity: number };

export type UserItem = { id: number; username: string; role: string };

export type WorkOrder = { id: number; clientName: string; serviceType: string; status: string };

export type WithdrawalItem = {
  id?: number;
  inventoryId: number;
  productName: string;
  unit: string;
  quantity: number;
  returnedQuantity?: number;
  condition?: string;
};

export type Withdrawal = {
  id: number;
  userId: number;
  username: string;
  workOrderId: number | null;
  jobId: number | null;
  clientName: string | null;
  status: "pendente" | "retornado" | "parcial";
  withdrawalPhoto: string | null;
  withdrawalSignature: string | null;
  returnPhoto: string | null;
  returnSignature: string | null;
  notes: string | null;
  returnNotes: string | null;
  returnedAt: string | null;
  createdAt: string;
  items: WithdrawalItem[];
};

export type DiscountRule = {
  id: number;
  name: string;
  condition: string;
  discountType: string;
  discountValue: number;
  active: boolean;
  createdAt: string;
};

export type SalaryDiscount = {
  id: number;
  userId: number;
  username: string;
  withdrawalId: number;
  withdrawalItemId: number;
  productName: string;
  condition: string;
  ruleId: number | null;
  ruleName: string | null;
  discountAmount: number;
  status: string;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
};
