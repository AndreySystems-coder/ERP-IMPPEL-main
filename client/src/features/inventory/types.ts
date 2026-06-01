export type InventoryItem = {
  id: number;
  name: string;
  type: string;
  unit?: string;
  quantity: number;
  minStock: number;
  pricePerUnit?: number;
};

export type Movement = {
  id: number;
  inventoryId: number;
  productName: string;
  type: string;
  quantity: number;
  date: string;
  month?: string;
  notes?: string;
};

export type BatchItem = {
  inventoryId: string;
  quantity: string;
  type: "ENTRADA" | "SAÍDA";
  searchText: string;
  dropdownOpen: boolean;
};

export interface QuickCountRow {
  inputName: string;
  qty: number;
  matchedItem: InventoryItem | null;
  confidence: number;
  diff: number;
  movType: "ENTRADA" | "SAÍDA" | null;
  isDuplicate?: boolean;
  isUncounted?: boolean;
}
