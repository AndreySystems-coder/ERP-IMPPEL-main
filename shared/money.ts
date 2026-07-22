export function parseBrazilianMoney(value: unknown, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;

  const raw = String(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^R\$\s*/i, "")
    .trim();
  if (!raw || raw === "—" || raw === "-") return fallback;

  const negative = /^-/.test(raw) || /\(-?/.test(raw);
  const clean = raw.replace(/[^\d,.-]/g, "").replace(/^-/, "");
  if (!/\d/.test(clean)) return fallback;

  let normalized = clean;
  const comma = clean.lastIndexOf(",");
  const dot = clean.lastIndexOf(".");

  if (comma >= 0 && dot >= 0) {
    normalized = comma > dot
      ? clean.replace(/\./g, "").replace(",", ".")
      : clean.replace(/,/g, "");
  } else if (comma >= 0) {
    normalized = clean.replace(/\./g, "").replace(",", ".");
  } else if ((clean.match(/\./g) || []).length > 1) {
    normalized = clean.replace(/\./g, "");
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return fallback;
  return Number(((negative ? -parsed : parsed)).toFixed(2));
}
