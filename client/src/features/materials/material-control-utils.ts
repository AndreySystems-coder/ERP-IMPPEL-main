function parseMaterialDate(value: string) {
  if (!value) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00`);
  return new Date(value);
}

export function fmtDate(value: string) {
  if (!value) return "";
  const date = parseMaterialDate(value);
  return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

export function daysSince(value: string) {
  return Math.max(0, Math.floor((Date.now() - parseMaterialDate(value).getTime()) / 86400000));
}
