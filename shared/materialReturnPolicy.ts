const CONSUMABLE_PATTERNS = [
  /viaplus/i,
  /manta/i,
  /primer/i,
  /\bpu\b/i,
  /poliuretano/i,
  /fita\s*crepe/i,
  /broxa/i,
  /pincel/i,
  /rolo/i,
  /tela/i,
  /argamassa/i,
  /cimento/i,
  /areia/i,
  /aditivo/i,
  /selante/i,
  /vedacit/i,
  /impermeabilizante/i,
  /aplicad[oa]/i,
];

const RETURNABLE_PATTERNS = [
  /retornavel/i,
  /ferrament/i,
  /equipament/i,
  /maquina/i,
  /extensao/i,
  /marreta/i,
  /talhadeira/i,
  /escada/i,
  /furadeira/i,
  /lixadeira/i,
  /serra/i,
  /betoneira/i,
  /andaime/i,
  /compressor/i,
  /macarico/i,
  /aplicador\s+de\s+pu/i,
  /batedor/i,
  /mangueira/i,
  /bomba\s+de\s+agua/i,
  /soprador/i,
  /vassoura/i,
];

const EXPLICIT_CONSUMABLE_PATTERNS = [
  /consumivel/i,
  /consumo/i,
];

function normalizeMaterialText(value: unknown) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export type MaterialReturnPolicy = "retornavel" | "consumivel";
export type MaterialReturnCondition = "bom" | "danificado" | "perdido" | "manutencao";

export function getMaterialReturnPolicy(item: { productName?: unknown; name?: unknown; type?: unknown; category?: unknown }): MaterialReturnPolicy {
  const text = normalizeMaterialText([item.productName, item.name, item.type, item.category].filter(Boolean).join(" "));
  if (!text) return "retornavel";
  if (RETURNABLE_PATTERNS.some(pattern => pattern.test(text))) return "retornavel";
  if (EXPLICIT_CONSUMABLE_PATTERNS.some(pattern => pattern.test(text))) return "consumivel";
  if (CONSUMABLE_PATTERNS.some(pattern => pattern.test(text))) return "consumivel";
  return "retornavel";
}

export function getMaterialReturnPolicyLabel(item: { productName?: unknown; name?: unknown; type?: unknown; category?: unknown }) {
  return getMaterialReturnPolicy(item) === "retornavel" ? "Retornavel" : "Consumivel";
}

export function isReturnableMaterialItem(item: { productName?: unknown; name?: unknown; type?: unknown; category?: unknown }) {
  return getMaterialReturnPolicy(item) === "retornavel";
}

export function isConsumableMaterialItem(item: { productName?: unknown; name?: unknown; type?: unknown; category?: unknown }) {
  return getMaterialReturnPolicy(item) === "consumivel";
}

export function hasReturnableMaterialItems(items: Array<{ productName?: unknown; name?: unknown; type?: unknown; category?: unknown }>) {
  return items.some(isReturnableMaterialItem);
}

export function isMaterialWithdrawalPending(withdrawal: { status?: unknown; items?: Array<{ productName?: unknown; name?: unknown; type?: unknown; category?: unknown }> }) {
  const status = normalizeMaterialText(withdrawal.status);
  if (["retornado", "devolvido", "concluido", "concluida", "consumido", "consumida"].includes(status)) return false;
  return hasReturnableMaterialItems(Array.isArray(withdrawal.items) ? withdrawal.items : []);
}

export function normalizeReturnCondition(value: unknown): MaterialReturnCondition {
  const condition = normalizeMaterialText(value);
  if (["perdido", "perdida", "lost"].includes(condition)) return "perdido";
  if (["danificado", "danificada", "avariado", "avariada", "damaged"].includes(condition)) return "danificado";
  if (["manutencao", "manutencao preventiva", "manutencao corretiva", "maintenance"].includes(condition)) return "manutencao";
  return "bom";
}

export function shouldRestoreReturnedQuantityToStock(condition: unknown) {
  return normalizeReturnCondition(condition) === "bom";
}
