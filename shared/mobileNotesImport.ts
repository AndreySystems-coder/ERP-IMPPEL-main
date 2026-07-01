import { isReturnableMaterialItem } from "./materialReturnPolicy";

export type MobileImportKind = "entrada" | "saida" | "retirada";
export type MobileImportStatus = "ok" | "duvidoso" | "bloqueado" | "ignorado";

export type MobileImportInventoryItem = {
  id: number;
  name: string;
  type?: string | null;
  unit?: string | null;
  quantity?: number | null;
};

export type MobileImportUser = {
  id: number;
  username: string;
  fullName?: string | null;
  jobTitle?: string | null;
  roleLabel?: string | null;
  role?: string | null;
};

export type MobileImportAlias = {
  alias: string;
  userId: number;
  username?: string | null;
};

export type MobileImportPreviewRow = {
  id: string;
  order: number;
  date: string;
  type: MobileImportKind;
  quantity: number;
  rawText: string;
  rawItem: string;
  inventoryId: number | null;
  itemName: string | null;
  itemConfidence: number;
  rawEmployee?: string | null;
  userId?: number | null;
  username?: string | null;
  userConfidence?: number;
  status: MobileImportStatus;
  warnings: string[];
  ignored?: boolean;
};

export type MobileImportPreview = {
  rows: MobileImportPreviewRow[];
  ignored: MobileImportPreviewRow[];
  summary: {
    entradas: number;
    saidas: number;
    retiradas: number;
    duvidosos: number;
    bloqueados: number;
    ignorados: number;
    canApply: boolean;
  };
};

const MATERIAL_ALIASES: Array<[RegExp, string]> = [
  [/^1000$/i, "viaplus 1000"],
  [/^7000$/i, "viaplus 7000"],
  [/\bprime\b/gi, "primer"],
  [/\bviabit\b/gi, "viabit"],
  [/\bviafix\b/gi, "viafix"],
  [/\bextens[aã]o\b/gi, "extensao"],
  [/\bdryko\s*manta\b/gi, "drykomanta"],
  [/\bsika\s+alu\b/gi, "sika alu"],
  [/\bmanta\s+liquida\b/gi, "manta liquida"],
];

const DEFAULT_EMPLOYEE_ALIASES: Record<string, string[]> = {
  lequinho: ["lequinho", "alex", "leco"],
  biro: ["biro"],
  tio: ["tio"],
  borracha: ["borracha"],
  jhones: ["jhones", "jones"],
  elias: ["elias"],
  paulo: ["paulo"],
  bruno: ["bruno"],
  luan: ["luan"],
};

function normalize(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singularize(value: string) {
  return value.split(" ").map(word => {
    if (word.length > 4 && word.endsWith("s")) return word.slice(0, -1);
    return word;
  }).join(" ");
}

export function normalizeMobileImportText(value: unknown) {
  let normalized = normalize(value);
  for (const [pattern, replacement] of MATERIAL_ALIASES) normalized = normalized.replace(pattern, replacement);
  return singularize(normalized);
}

function scoreMatch(query: string, candidate: string) {
  const q = normalizeMobileImportText(query);
  const c = normalizeMobileImportText(candidate);
  if (!q || !c) return 0;
  if (q === c) return 100;
  if (q.includes(c) || c.includes(q)) return 88;
  const qWords = q.split(" ").filter(word => word.length > 1);
  const cWords = c.split(" ").filter(word => word.length > 1);
  const matched = qWords.filter(qw => cWords.some(cw => qw === cw || qw.includes(cw) || cw.includes(qw))).length;
  const numbers = q.match(/\d+/g) || [];
  if (numbers.length && !numbers.every(number => c.includes(number))) return 0;
  return qWords.length ? Math.round((matched / qWords.length) * 74) : 0;
}

function bestMatch<T>(query: string, values: T[], label: (value: T) => string) {
  return values.reduce<{ value: T | null; score: number }>((best, value) => {
    const score = scoreMatch(query, label(value));
    return score > best.score ? { value, score } : best;
  }, { value: null, score: 0 });
}

function parseQuantityItem(raw: string) {
  const text = raw.trim();
  let match = text.match(/^(\d+)\s*x?\s+(.+)$/i);
  if (match) return { quantity: Math.max(1, Math.trunc(Number(match[1]) || 1)), name: match[2].trim() };
  match = text.match(/^(.+?)\s+x?\s*(\d+)$/i);
  if (match) return { quantity: Math.max(1, Math.trunc(Number(match[2]) || 1)), name: match[1].trim() };
  return { quantity: 1, name: text };
}

function parseDateLine(raw: string, fallbackYear: number) {
  const match = raw.trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (!match) return null;
  const yearRaw = match[3] ? Number(match[3]) : fallbackYear;
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function userLabel(user: MobileImportUser) {
  return [user.username, user.fullName, user.jobTitle, user.roleLabel].filter(Boolean).join(" ");
}

function findUser(raw: string, users: MobileImportUser[], aliases: MobileImportAlias[]) {
  const key = normalize(raw);
  const savedAlias = aliases.find(alias => normalize(alias.alias) === key);
  if (savedAlias) {
    const user = users.find(candidate => Number(candidate.id) === Number(savedAlias.userId));
    if (user) return { user, score: 100 };
  }
  const defaultMatches = Object.entries(DEFAULT_EMPLOYEE_ALIASES).find(([, names]) => names.some(name => normalize(name) === key));
  if (defaultMatches) {
    const defaultName = defaultMatches[0];
    const user = users.find(candidate => normalize(userLabel(candidate)).includes(defaultName));
    if (user) return { user, score: 82 };
  }
  const match = bestMatch(raw, users.filter(user => user.role !== "admin"), userLabel);
  return { user: match.value, score: match.score };
}

function applyStockStatus(rows: MobileImportPreviewRow[], inventory: MobileImportInventoryItem[]) {
  const available = new Map(inventory.map(item => [Number(item.id), Math.max(0, Number(item.quantity) || 0)]));
  return rows.map(row => {
    if (row.ignored || !row.inventoryId) return row;
    const current = available.get(row.inventoryId) ?? 0;
    const item = inventory.find(candidate => Number(candidate.id) === Number(row.inventoryId));
    if (row.type === "entrada") {
      available.set(row.inventoryId, current + row.quantity);
      return row;
    }
    if (row.quantity > current) {
      return {
        ...row,
        status: "bloqueado" as MobileImportStatus,
        warnings: [...row.warnings, `Estoque insuficiente: disponível ${current} ${item?.unit || "un"}`],
      };
    }
    available.set(row.inventoryId, current - row.quantity);
    return row;
  });
}

export function buildMobileNotesPreview(input: {
  text: string;
  fallbackMonth?: string;
  inventory: MobileImportInventoryItem[];
  users: MobileImportUser[];
  aliases?: MobileImportAlias[];
}): MobileImportPreview {
  const now = new Date();
  const fallbackYear = input.fallbackMonth ? Number(input.fallbackMonth.slice(0, 4)) : now.getFullYear();
  const fallbackMonth = input.fallbackMonth && /^\d{4}-\d{2}$/.test(input.fallbackMonth) ? input.fallbackMonth : `${fallbackYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let currentDate = `${fallbackMonth}-01`;
  const rows: MobileImportPreviewRow[] = [];
  const ignored: MobileImportPreviewRow[] = [];
  let order = 0;

  for (const rawLine of input.text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const parsedDate = parseDateLine(line, fallbackYear);
    if (parsedDate) {
      currentDate = parsedDate;
      continue;
    }

    const base = { id: `row-${order}`, order, date: currentDate, rawText: line };
    order++;

    const employeeLine = line.match(/^(.+?)\s*[-–:]\s*(.+)$/);
    if (employeeLine && !line.startsWith("+")) {
      const employeeText = employeeLine[1].trim();
      const userMatch = findUser(employeeText, input.users, input.aliases || []);
      for (const part of employeeLine[2].split(/[,;]/).map(value => value.trim()).filter(Boolean)) {
        const parsed = parseQuantityItem(part);
        const itemMatch = bestMatch(parsed.name, input.inventory, item => item.name);
        const warnings: string[] = [];
        if (!userMatch.user || userMatch.score < 70) warnings.push("Funcionário pendente");
        if (!itemMatch.value || itemMatch.score < 70) warnings.push("Material duvidoso");
        rows.push({
          ...base,
          id: `row-${order}-${rows.length}`,
          type: "retirada",
          quantity: parsed.quantity,
          rawItem: parsed.name,
          inventoryId: itemMatch.score >= 70 ? itemMatch.value?.id || null : null,
          itemName: itemMatch.score >= 70 ? itemMatch.value?.name || null : null,
          itemConfidence: itemMatch.score,
          rawEmployee: employeeText,
          userId: userMatch.score >= 70 ? userMatch.user?.id || null : null,
          username: userMatch.score >= 70 ? userMatch.user?.username || null : null,
          userConfidence: userMatch.score,
          status: warnings.length ? "duvidoso" : "ok",
          warnings,
        });
      }
      continue;
    }

    const isEntry = line.startsWith("+");
    const parsed = parseQuantityItem(isEntry ? line.replace(/^\+\s*/, "") : line);
    if (!parsed.name) {
      ignored.push({ ...base, type: "saida", quantity: 0, rawItem: line, inventoryId: null, itemName: null, itemConfidence: 0, status: "ignorado", warnings: ["Linha não reconhecida"], ignored: true });
      continue;
    }
    const itemMatch = bestMatch(parsed.name, input.inventory, item => item.name);
    const warnings = itemMatch.score >= 70 ? [] : ["Material duvidoso"];
    rows.push({
      ...base,
      type: isEntry ? "entrada" : "saida",
      quantity: parsed.quantity,
      rawItem: parsed.name,
      inventoryId: itemMatch.score >= 70 ? itemMatch.value?.id || null : null,
      itemName: itemMatch.score >= 70 ? itemMatch.value?.name || null : null,
      itemConfidence: itemMatch.score,
      status: warnings.length ? "duvidoso" : "ok",
      warnings,
    });
  }

  const checkedRows = applyStockStatus(rows, input.inventory);
  const allIgnored = [...ignored, ...checkedRows.filter(row => row.ignored)];
  const activeRows = checkedRows.filter(row => !row.ignored);
  const summary = {
    entradas: activeRows.filter(row => row.type === "entrada" && row.status !== "bloqueado").length,
    saidas: activeRows.filter(row => row.type === "saida" && row.status !== "bloqueado").length,
    retiradas: activeRows.filter(row => row.type === "retirada" && row.status !== "bloqueado").length,
    duvidosos: activeRows.filter(row => row.status === "duvidoso").length,
    bloqueados: activeRows.filter(row => row.status === "bloqueado").length,
    ignorados: allIgnored.length,
    canApply: activeRows.length > 0 && activeRows.every(row => row.status === "ok" && row.inventoryId && (row.type !== "retirada" || row.userId)),
  };
  return { rows: checkedRows, ignored: allIgnored, summary };
}

export function summarizeMobileRows(rows: MobileImportPreviewRow[]) {
  return {
    entradas: rows.filter(row => !row.ignored && row.type === "entrada").length,
    saidas: rows.filter(row => !row.ignored && row.type === "saida").length,
    retiradas: rows.filter(row => !row.ignored && row.type === "retirada").length,
    ignorados: rows.filter(row => row.ignored).length,
    pendentes: rows.filter(row => row.status !== "ok" && !row.ignored).length,
    ferramentas: rows.filter(row => row.type === "retirada" && row.inventoryId).length,
  };
}
