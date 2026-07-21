export type MaterialControlItem = {
  productName?: string | null;
  name?: string | null;
  materialName?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  inventoryId?: number | string | null;
};

export type MaterialControlBackupRow = {
  date: string;
  responsible: string;
  itemsText: string;
  type: "Retirada" | "Entrada" | "Saída";
  notes: string;
  status: string;
};

const MONTHS_PT_BR = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function normalizeDate(value: unknown) {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
}

function isPeriodMatch(date: string, period: string, year?: string | null, month?: string | null) {
  if (!date) return false;
  if (period === "all") return true;
  if (period === "year") return Boolean(year) && date.startsWith(`${year}-`);
  if (period === "month") return Boolean(year && month) && date.startsWith(`${year}-${String(month).padStart(2, "0")}`);
  return true;
}

export function formatMaterialControlItem(item: MaterialControlItem) {
  const quantity = Math.ceil(Number(item.quantity || 0));
  const name = String(item.productName || item.materialName || item.name || "").trim();
  if (!quantity || !name) return "";
  return `${quantity}x ${name}`;
}

export function formatMaterialControlItems(items: MaterialControlItem[]) {
  return asArray<MaterialControlItem>(items).map(formatMaterialControlItem).filter(Boolean).join(", ");
}

export function buildMaterialControlContract(input: {
  withdrawals?: any[];
  entries?: any[];
  consumption?: any[];
  movements?: any[];
  period?: string;
  year?: string | null;
  month?: string | null;
  exportedAt?: string;
}) {
  const period = input.period === "month" || input.period === "year" ? input.period : "all";
  const year = input.year && /^\d{4}$/.test(String(input.year)) ? String(input.year) : null;
  const month = input.month && /^\d{1,2}$/.test(String(input.month)) ? String(input.month).padStart(2, "0") : null;
  const label = period === "month" && year && month
    ? `${MONTHS_PT_BR[Number(month) - 1]}/${year}`
    : period === "year" && year
      ? year
      : "Todos os meses";

  const withdrawals = asArray<any>(input.withdrawals).filter(withdrawal =>
    isPeriodMatch(normalizeDate(withdrawal.withdrawalDate || withdrawal.date || withdrawal.createdAt), period, year, month)
  );

  const inputEntries = asArray<any>(input.entries);
  const inputConsumption = asArray<any>(input.consumption);
  const movements = asArray<any>(input.movements);
  const movementEntries = movements.filter(movement =>
    String(movement.type || "").toUpperCase() === "ENTRADA" &&
    isPeriodMatch(normalizeDate(movement.date), period, year, month)
  );
  const movementConsumption = movements.filter(movement => {
    const type = String(movement.type || "").toUpperCase();
    const isConsumption = type === "SAÍDA" || type === "SAIDA";
    const fromWithdrawal = String(movement.notes || "").toLowerCase().includes("retirada #");
    return isConsumption && !fromWithdrawal && isPeriodMatch(normalizeDate(movement.date), period, year, month);
  });
  const entries = inputEntries.length ? inputEntries : movementEntries;
  const consumption = inputConsumption.length ? inputConsumption : movementConsumption;

  const rows: MaterialControlBackupRow[] = [];
  for (const withdrawal of withdrawals) {
    const items = asArray<MaterialControlItem>(withdrawal.items);
    rows.push({
      date: normalizeDate(withdrawal.withdrawalDate || withdrawal.date || withdrawal.createdAt),
      responsible: String(withdrawal.username || withdrawal.responsible || "—"),
      itemsText: formatMaterialControlItems(items),
      type: "Retirada",
      notes: String(withdrawal.notes || withdrawal.origin || "Controle de Materiais"),
      status: String(withdrawal.status || "pendente"),
    });
  }
  for (const entry of entries) {
    const items = asArray<MaterialControlItem>(entry.items).length ? asArray<MaterialControlItem>(entry.items) : [entry];
    rows.push({
      date: normalizeDate(entry.date),
      responsible: String(entry.responsible || entry.username || "Entradas"),
      itemsText: formatMaterialControlItems(items),
      type: "Entrada",
      notes: String(entry.notes || entry.origin || "Registro rápido/estoque"),
      status: String(entry.status || "registrado"),
    });
  }
  for (const record of consumption) {
    const items = asArray<MaterialControlItem>(record.items).length ? asArray<MaterialControlItem>(record.items) : [record];
    rows.push({
      date: normalizeDate(record.date),
      responsible: String(record.responsible || record.username || "Saídas/Consumo"),
      itemsText: formatMaterialControlItems(items),
      type: "Saída",
      notes: String(record.notes || record.origin || "Registro rápido/estoque"),
      status: String(record.status || "consumo"),
    });
  }

  rows.sort((a, b) => a.date.localeCompare(b.date) || a.responsible.localeCompare(b.responsible) || a.type.localeCompare(b.type));

  const days = Array.from(rows.reduce((map, row) => {
    const list = map.get(row.date) || [];
    list.push(row);
    map.set(row.date, list);
    return map;
  }, new Map<string, MaterialControlBackupRow[]>()).entries()).map(([date, dayRows]) => ({ date, rows: dayRows }));

  return {
    type: "materiais",
    version: "2.0",
    exportedAt: input.exportedAt || new Date().toISOString(),
    filters: { period, year, month, label },
    data: {
      withdrawals,
      entries,
      consumption,
      rows,
      days,
    },
  };
}
