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
  /ferrament/i,
  /equipament/i,
  /maquin|m�quin/i,
  /extens[a�]o/i,
  /marreta/i,
  /talhadeira/i,
  /escada/i,
  /furadeira/i,
  /lixadeira/i,
  /serra/i,
  /betoneira/i,
  /andaime/i,
  /compressor/i,
  /ma[�c]arico/i,
];

function normalizeMaterialText(value: unknown) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function isReturnableMaterialItem(item: { productName?: unknown; name?: unknown; type?: unknown; category?: unknown }) {
  const text = normalizeMaterialText([item.productName, item.name, item.type, item.category].filter(Boolean).join(" "));
  if (!text) return true;
  if (RETURNABLE_PATTERNS.some(pattern => pattern.test(text))) return true;
  if (CONSUMABLE_PATTERNS.some(pattern => pattern.test(text))) return false;
  return true;
}

export function isConsumableMaterialItem(item: { productName?: unknown; name?: unknown; type?: unknown; category?: unknown }) {
  return !isReturnableMaterialItem(item);
}

export function hasReturnableMaterialItems(items: Array<{ productName?: unknown; name?: unknown; type?: unknown; category?: unknown }>) {
  return items.some(isReturnableMaterialItem);
}

export function isMaterialWithdrawalPending(withdrawal: { status?: unknown; items?: Array<{ productName?: unknown; name?: unknown; type?: unknown; category?: unknown }> }) {
  const status = normalizeMaterialText(withdrawal.status);
  if (["retornado", "devolvido", "concluido", "concluida", "consumido", "consumida"].includes(status)) return false;
  return hasReturnableMaterialItems(Array.isArray(withdrawal.items) ? withdrawal.items : []);
}
