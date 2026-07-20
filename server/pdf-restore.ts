type BackupType =
  | "usuarios"
  | "estoque"
  | "produtos"
  | "servicos"
  | "materiais"
  | "clientes"
  | "orcamentos"
  | "ordens-servico"
  | "financeiro"
  | "pos-venda"
  | "garantias";

type PdfItem = { text: string; x: number; y: number; page: number };
type PdfRow = { y: number; page: number; items: PdfItem[] };
type ErpPdfReportType = BackupType | "movimentacoes" | "backup-completo";

export type ErpPdfRestorePreview = {
  fileName: string;
  selectedType: BackupType;
  reportType: ErpPdfReportType;
  restoreType?: BackupType;
  title: string;
  headerTotal: number;
  extracted: number;
  newCount: number;
  existingCount: number;
  updatedCount: number;
  ignoredCount: number;
  errorCount: number;
  pendingCount: number;
  duplicateCount: number;
  fullyApplicableCount?: number;
  partiallyApplicableCount?: number;
  blockedCount?: number;
  unresolvedItemCount?: number;
  requiresPartialConfirmation?: boolean;
  warnings: string[];
  ignored: string[];
  pending: string[];
  errors: string[];
  rows: { name: string; detail: string; status: "novo" | "atualizar" | "existente" | "ignorado" | "pendente" | "erro" }[];
  dependencies?: {
    canApply: boolean;
    checks: Array<{
      name: string;
      required: boolean;
      found: number;
      missing: number;
      missingItems: string[];
      message: string;
    }>;
    warnings: string[];
    blockedReasons: string[];
  };
  backup?: any;
  canApply: boolean;
};

const REPORT_TYPES: Array<{ type: ErpPdfReportType; marker: string; restoreType?: BackupType }> = [
  { type: "usuarios", restoreType: "usuarios", marker: "tipo=usuarios" },
  { type: "produtos", restoreType: "produtos", marker: "tipo=produtos" },
  { type: "servicos", restoreType: "servicos", marker: "tipo=servicos" },
  { type: "estoque", restoreType: "estoque", marker: "tipo=estoque" },
  { type: "movimentacoes", restoreType: "estoque", marker: "tipo=movimentacoes" },
  { type: "clientes", restoreType: "clientes", marker: "tipo=clientes" },
  { type: "orcamentos", restoreType: "orcamentos", marker: "tipo=orcamentos" },
  { type: "ordens-servico", restoreType: "ordens-servico", marker: "tipo=ordens-servico" },
  { type: "financeiro", restoreType: "financeiro", marker: "tipo=financeiro" },
  { type: "garantias", restoreType: "garantias", marker: "tipo=garantias" },
  { type: "pos-venda", restoreType: "pos-venda", marker: "tipo=pos-venda" },
  { type: "materiais", restoreType: "materiais", marker: "tipo=materiais" },
  { type: "backup-completo", marker: "backup completo" },
];

const ROLE_TECHNICAL_BY_LABEL: Record<string, string> = {
  "Administrativo / Financeiro": "administrativo_financeiro",
  "Administrativo /": "administrativo_financeiro",
  "Comercial / Atendimento": "comercial_atendimento",
  "Marketing / Redes Sociais": "marketing_redes_sociais",
  "Equipe Técnica": "equipe_tecnica",
  "Equipe Técnica (Obras / Serviços)": "equipe_tecnica",
  "Gestor de Obras": "gestor_obras",
  "Gestão de EPIs, Uniformes e Botas": "gestao_epis",
  "Gestão de EPIs,": "gestao_epis",
  "Materiais e Equipamentos": "materiais_equipamentos",
  "Gestão de Funcionários": "gestao_funcionarios",
  "Obras / Operações": "obras_operacoes",
};

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeKey(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function parseMoney(value = "") {
  const clean = value.replace(/\s+/g, " ").replace(/^R\$\s*/i, "").trim();
  if (!clean || clean === "—" || clean === "-") return 0;

  if (clean.includes(",")) {
    return Number(clean.replace(/\./g, "").replace(",", ".")) || 0;
  }

  const match = clean.match(/(\d[\d.]*)/);
  return match ? Number(match[1]) || 0 : 0;
}

function parsePercent(value = "") {
  const match = value.match(/(-?\d+(?:[.,]\d+)?)\s*%?/);
  return match ? Number(match[1].replace(",", ".")) || 0 : 0;
}

function parseIntSafe(value = "") {
  const match = value.match(/-?\d+/);
  return match ? Number(match[0]) || 0 : 0;
}

function normalizeInitialPassword(value = "") {
  const normalized = value.trim();
  if (!normalized || /^(Senha alterada|Não disponível|—)$/i.test(normalized)) return "";
  const digits = normalized.replace(/\D/g, "");
  if (digits.length !== 8) return "";
  if (/^\d{4}/.test(normalized) && Number(digits.slice(4, 6)) <= 12) {
    return `${digits.slice(6, 8)}${digits.slice(4, 6)}${digits.slice(0, 4)}`;
  }
  return digits;
}

function birthDateFromInitialPassword(initialPassword = "") {
  const digits = initialPassword.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

function cell(row: PdfRow, minX: number, maxX: number) {
  return row.items
    .filter(item => item.x >= minX && item.x < maxX)
    .map(item => item.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function groupRows(items: PdfItem[]) {
  const rows: PdfRow[] = [];
  const sorted = [...items].sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  for (const item of sorted) {
    if (!item.text.trim()) continue;
    const found = rows.find(row => row.page === item.page && Math.abs(row.y - item.y) <= 2);
    if (found) found.items.push(item);
    else rows.push({ page: item.page, y: item.y, items: [item] });
  }
  return rows.map(row => ({ ...row, items: row.items.sort((a, b) => a.x - b.x) }));
}

async function extractPdf(data: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await (pdfjs as any).getDocument({ data, disableWorker: true, useWorkerFetch: false, isEvalSupported: false }).promise;
  const items: PdfItem[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    for (const raw of content.items as any[]) {
      const text = String(raw.str || "").trim();
      if (!text) continue;
      items.push({ text, x: Number(raw.transform?.[4] || 0), y: Number(raw.transform?.[5] || 0), page: pageNumber });
    }
  }
  const rawText = items.map(item => item.text).join("\n");
  return { rows: groupRows(items), rawText };
}

function detectReport(rawText: string) {
  const normalized = normalizeText(rawText);
  if (!normalized.includes("imppel erp") || !normalized.includes("estrutura erp")) {
    throw new Error("Este PDF não parece ter sido gerado pelo ERP IMPPEL.");
  }
  const found = REPORT_TYPES.find(report => normalized.includes(report.marker));
  if (!found) throw new Error("Relatório do ERP reconhecido, mas o tipo não pôde ser identificado com segurança.");
  const headerTotal = Number(rawText.match(/Total de registros:\s*(\d+)/i)?.[1] || rawText.match(/registros=(\d+)/i)?.[1] || 0);
  const title = rawText.split("\n").find(line => normalizeText(line).includes("imppel erp")) || `Relatório ${found.type}`;
  return { ...found, title, headerTotal };
}

function basePreview(fileName: string, selectedType: BackupType, report: ReturnType<typeof detectReport>): ErpPdfRestorePreview {
  return {
    fileName,
    selectedType,
    reportType: report.type,
    restoreType: report.restoreType,
    title: report.title,
    headerTotal: report.headerTotal,
    extracted: 0,
    newCount: 0,
    existingCount: 0,
    updatedCount: 0,
    ignoredCount: 0,
    errorCount: 0,
    pendingCount: 0,
    duplicateCount: 0,
    warnings: [],
    ignored: [],
    pending: [],
    errors: [],
    rows: [],
    canApply: false,
  };
}

function parseUsers(fileName: string, selectedType: BackupType, report: ReturnType<typeof detectReport>, rows: PdfRow[], rawText: string) {
  const preview = basePreview(fileName, selectedType, report);
  const users: any[] = [];
  const roles: any[] = [];
  const seenUsers = new Set<string>();
  const seenRoles = new Set<string>();

  for (const row of rows) {
    const login = cell(row, 35, 150);
    const senhaInicialRaw = cell(row, 150, 255);
    const nomeCompleto = cell(row, 255, 470);
    const cargoRaw = cell(row, 470, 640);
    const cargo = cargoRaw === "—" ? "" : cargoRaw;
    const perfilRaw = cell(row, 640, 745);
    const perfil = perfilRaw.split(" ")[0];
    const status = cell(row, 738, 820);
    if (!/^(Admin|[a-z][a-z0-9]+(?:\.[a-z0-9]+)+)$/i.test(login)) continue;
    const userKey = normalizeText(login);
    if (seenUsers.has(userKey)) {
      preview.duplicateCount++;
      preview.ignored.push(`Usuário duplicado no PDF: ${login}`);
      continue;
    }
    seenUsers.add(userKey);
    const isAdmin = normalizeText(login) === "admin";
    const senhaInicial = normalizeInitialPassword(senhaInicialRaw);
    const hasInitialPassword = Boolean(senhaInicial);
    const birthDate = birthDateFromInitialPassword(senhaInicial);
    users.push({
      login,
      username: login,
      senhaInicial: hasInitialPassword ? senhaInicial : "Data de nascimento pendente",
      initialPassword: hasInitialPassword ? senhaInicial : undefined,
      resetInitialPassword: !isAdmin && hasInitialPassword,
      nomeCompleto: nomeCompleto || login,
      fullName: nomeCompleto || login,
      birthDate,
      dataNascimento: birthDate,
      cargo: cargo || null,
      perfil: perfil || (isAdmin ? "admin" : "funcionario"),
      role: perfil === "admin" ? "admin" : "funcionario",
      status: status === "Inativo" ? "inativo" : "ativo",
      roleName: cargo ? (ROLE_TECHNICAL_BY_LABEL[cargo] || normalizeKey(cargo)) : null,
      roleLabel: cargo || null,
      jobTitle: cargo || null,
      mustChangePassword: false,
    });
    preview.rows.push({
      name: login,
      detail: `${nomeCompleto || "sem nome"} · ${cargo || "cargo pendente"} · ${hasInitialPassword ? `senha fixa aplicada: ${senhaInicial}` : "data de nascimento pendente"}`,
      status: isAdmin ? "ignorado" : cargo ? "novo" : "pendente",
    });
    if (isAdmin) {
      preview.ignoredCount++;
      preview.ignored.push("Admin será preservado e não será sobrescrito.");
    } else if (!cargo) {
      preview.pendingCount++;
      preview.pending.push(`${login}: cargo/perfil/status não foram extraídos com segurança.`);
    } else {
      preview.newCount++;
    }
  }

  for (const [label, name] of Object.entries(ROLE_TECHNICAL_BY_LABEL)) {
    if (!rawText.includes(label) && !rawText.includes(name)) continue;
    if (seenRoles.has(name)) continue;
    seenRoles.add(name);
    roles.push({ name, label, permissions: {}, isDefault: name === "equipe_tecnica" });
  }

  preview.extracted = users.length + roles.length;
  preview.existingCount = 1;
  preview.backup = { type: "usuarios", version: "erp-pdf-preview", exportedAt: new Date().toISOString(), data: { users, roles } };
  preview.canApply = users.some(user => user.username !== "Admin") || roles.length > 0;
  if (preview.pendingCount) preview.warnings.push("Alguns usuários ficaram pendentes por quebra de coluna no PDF.");
  return preview;
}

function parseProducts(fileName: string, selectedType: BackupType, report: ReturnType<typeof detectReport>, rows: PdfRow[]) {
  const preview = basePreview(fileName, selectedType, report);
  const products: any[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const parts = row.items.map(item => item.text).filter(Boolean);
    let name = cell(row, 35, 260);
    let category = cell(row, 260, 415);
    let brand = cell(row, 415, 500);
    let unit = cell(row, 500, 555);
    let salePrice = cell(row, 555, 660);
    let maxDiscount = cell(row, 660, 735);
    let active = cell(row, 735, 820);
    if ((!name || !category || !unit || !/R\$/.test(salePrice)) && parts.length >= 6 && /R\$/.test(parts.join(" "))) {
      [name, category, brand, unit, salePrice, maxDiscount, active = "Sim"] = parts;
    }
    if (!name || !category || !unit || !/R\$/.test(salePrice)) continue;
    if (/^(Produto|IMPPEL ERP)/i.test(name)) continue;
    const key = normalizeText(name);
    if (seen.has(key)) {
      preview.duplicateCount++;
      preview.ignored.push(`Produto duplicado no PDF: ${name}`);
      continue;
    }
    seen.add(key);
    products.push({ name, description: "", category, brand: brand === "—" ? "" : brand, unit, salePrice: parseMoney(salePrice), commission: 0, maxDiscount: parsePercent(maxDiscount), active: active !== "Não" });
    preview.rows.push({ name, detail: `${category} · ${brand || "sem marca"} · ${unit} · ${salePrice}`, status: "atualizar" });
  }
  preview.extracted = products.length;
  preview.updatedCount = products.length;
  preview.backup = { type: "produtos", version: "erp-pdf-preview", exportedAt: new Date().toISOString(), data: { products } };
  preview.canApply = products.length > 0;
  if (report.headerTotal && products.length !== report.headerTotal) {
    preview.pendingCount = Math.max(0, report.headerTotal - products.length);
    preview.warnings.push(`PDF informa ${report.headerTotal} produtos; ${products.length} foram extraídos com segurança.`);
  }
  return preview;
}

function parseServices(fileName: string, selectedType: BackupType, report: ReturnType<typeof detectReport>, rows: PdfRow[]) {
  const preview = basePreview(fileName, selectedType, report);
  const services: any[] = [];
  let current: any | null = null;
  const flush = () => {
    if (!current) return;
    if (!current.name || !current.pricePerUnit) {
      preview.pendingCount++;
      preview.pending.push(current.name || "Serviço sem nome/valor");
      preview.rows.push({ name: current.name || "Serviço pendente", detail: "Extração incerta", status: "pendente" });
    } else {
      services.push({ name: current.name.trim(), description: current.description.join(" ").replace(/\s+/g, " ").trim(), pricePerUnit: current.pricePerUnit, laborCostPerM2: current.laborCostPerM2 || 0, transportCostPerM2: current.transportCostPerM2 || 0, materialConsumptionPerM2: 0, serviceMaterials: null });
      preview.rows.push({ name: current.name.trim(), detail: `R$ ${current.pricePerUnit.toFixed(2)} · mão de obra R$ ${(current.laborCostPerM2 || 0).toFixed(2)}`, status: "atualizar" });
    }
    current = null;
  };
  for (const row of rows) {
    const namePart = cell(row, 35, 195);
    const descriptionPart = cell(row, 195, 660);
    const priceText = cell(row, 655, 695);
    const laborText = cell(row, 695, 740);
    const transportText = cell(row, 740, 820);
    const startsService = Boolean(namePart && /R\$/.test(priceText + laborText + transportText));
    if (startsService) {
      flush();
      current = { name: namePart, description: descriptionPart ? [descriptionPart] : [], pricePerUnit: parseMoney(priceText), laborCostPerM2: parseMoney(laborText), transportCostPerM2: parseMoney(transportText) };
      continue;
    }
    if (!current) continue;
    if (namePart && !/^(IMPPEL ERP|Serviço|Obra\/m)/i.test(namePart)) current.name = `${current.name} ${namePart}`;
    if (descriptionPart) current.description.push(descriptionPart);
    if (!current.pricePerUnit && /\d/.test(priceText)) current.pricePerUnit = parseMoney(priceText);
    if (!current.laborCostPerM2 && /R\$/.test(laborText)) current.laborCostPerM2 = parseMoney(laborText);
    if (!current.transportCostPerM2 && /R\$/.test(transportText)) current.transportCostPerM2 = parseMoney(transportText);
  }
  flush();
  const seen = new Set<string>();
  for (const service of services) {
    const key = normalizeText(service.name);
    if (seen.has(key)) {
      preview.duplicateCount++;
      preview.warnings.push(`Possível serviço duplicado no PDF: ${service.name}. Confira no preview antes de importar.`);
    } else {
      seen.add(key);
    }
  }
  preview.extracted = services.length;
  preview.updatedCount = services.length;
  preview.backup = { type: "servicos", version: "erp-pdf-preview", exportedAt: new Date().toISOString(), data: { services } };
  preview.canApply = services.length > 0;
  if (report.headerTotal && services.length !== report.headerTotal) {
    preview.pendingCount += Math.max(0, report.headerTotal - services.length);
    preview.warnings.push(`PDF informa ${report.headerTotal} serviços; ${services.length} foram extraídos com segurança.`);
  }
  return preview;
}

function validDateBr(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const iso = `${yyyy}-${mm}-${dd}`;
  const date = new Date(`${iso}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : iso;
}

function monthLabel(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleString("pt-BR", { month: "long", year: "numeric" });
}

function parseStock(fileName: string, selectedType: BackupType, report: ReturnType<typeof detectReport>, rows: PdfRow[]) {
  const preview = basePreview(fileName, selectedType, report);
  const items: any[] = [];
  const movements: any[] = [];
  const seenItems = new Set<string>();
  const seenMovements = new Set<string>();
  let inMovements = report.type === "movimentacoes";
  for (const row of rows) {
    const rowText = row.items.map(item => item.text).join(" ");
    if (/Histórico de Movimentações|Movimentações/i.test(rowText)) { inMovements = true; continue; }
    if (/Invalid Date/i.test(rowText)) {
      preview.ignoredCount++;
      preview.ignored.push(`Movimentação ignorada por data inválida: ${rowText.slice(0, 90)}`);
      continue;
    }
    if (!inMovements && report.type === "estoque") {
      const name = cell(row, 35, 275);
      const type = cell(row, 275, 370);
      const unit = cell(row, 465, 530);
      const quantity = cell(row, 530, 620);
      const minStock = cell(row, 620, 690);
      const price = cell(row, 690, 820);
      if (!name || !type || !unit || !/\d/.test(quantity)) continue;
      if (/^(Produto|IMPPEL ERP)/i.test(name)) continue;
      const key = normalizeText(name);
      if (seenItems.has(key)) {
        preview.duplicateCount++;
        preview.ignored.push(`Item de estoque duplicado no PDF: ${name}`);
        continue;
      }
      seenItems.add(key);
      const parsedStockPrice = parseMoney(price);
      items.push({ name, type, unit, quantity: parseIntSafe(quantity), minStock: parseIntSafe(minStock), pricePerUnit: 0 });
      if (parsedStockPrice > 0) {
        preview.warnings.push(`${name}: preço do PDF de estoque (${price}) não foi restaurado como preço unitário; mantenha o catálogo como fonte principal.`);
      }
      preview.rows.push({ name, detail: `${parseIntSafe(quantity)} ${unit} · mínimo ${parseIntSafe(minStock)}`, status: "atualizar" });
      continue;
    }
    const dateText = cell(row, 35, 140);
    const iso = validDateBr(dateText);
    if (!iso) continue;
    const productName = cell(row, 140, 360).replace(/\s+(ENTRADA|SAÍDA|AJUSTE)$/i, "").trim();
    const type = (cell(row, 360, 450).match(/ENTRADA|SAÍDA|AJUSTE/i)?.[0] || "SAÍDA").toUpperCase();
    const quantity = parseIntSafe(cell(row, 540, 615));
    const notes = cell(row, 615, 820) || "Importação por relatório ERP";
    if (!productName || !quantity) {
      preview.pendingCount++;
      preview.pending.push(`Movimentação pendente em ${dateText}: ${rowText}`);
      continue;
    }
    const key = `${iso}|${normalizeText(productName)}|${type}|${quantity}|${normalizeText(notes)}`;
    if (seenMovements.has(key)) {
      preview.duplicateCount++;
      preview.ignored.push(`Movimentação duplicada no PDF: ${productName} ${dateText}`);
      continue;
    }
    seenMovements.add(key);
    movements.push({ productName, type, quantity, date: iso, month: monthLabel(iso), notes });
  }
  preview.extracted = items.length + movements.length;
  preview.updatedCount = items.length;
  preview.newCount = movements.length;
  preview.backup = { type: "estoque", version: "erp-pdf-preview", exportedAt: new Date().toISOString(), preserveItemQuantitiesAfterMovements: report.type === "estoque", data: { items, movements } };
  preview.canApply = items.length > 0 || movements.length > 0;
  if (report.headerTotal && report.type === "estoque" && items.length !== report.headerTotal) {
    preview.pendingCount += Math.max(0, report.headerTotal - items.length);
    preview.warnings.push(`PDF informa ${report.headerTotal} itens de estoque; ${items.length} foram extraídos com segurança.`);
  }
  if (preview.ignoredCount) preview.warnings.push(`${preview.ignoredCount} linha(s) ignorada(s), incluindo datas inválidas quando existirem.`);
  return preview;
}

type ParsedMaterialPdfItem = { productName: string; quantity: number; unit: string };
type ParsedMaterialPdfRecord = {
  kind: "withdrawal" | "entry" | "consumption";
  date: string;
  responsible: string;
  itemsText: string;
  typeText: string;
  notes: string;
  statusText: string;
  page: number;
  rowY: number;
};
type MaterialColumnLayout = { responsible: number; items: number; type: number; notes: number; status: number };
type MaterialRowParts = { responsible: string; itemsText: string; typeText: string; notes: string; statusText: string };

const DEFAULT_MATERIAL_COLUMNS: MaterialColumnLayout = { responsible: 46, items: 142, type: 391, notes: 477, status: 681 };

function normalizeMaterialStatus(kind: ParsedMaterialPdfRecord["kind"], statusText = "") {
  const normalized = normalizeText(statusText);
  if (kind === "withdrawal") {
    if (normalized.includes("retornado")) return "retornado";
    if (normalized.includes("parcial")) return "parcial";
    return "pendente";
  }
  if (kind === "entry") return "registrado";
  return "consumo";
}

function classifyMaterialRecord(responsible: string, typeText = "") {
  const source = normalizeText(`${responsible} ${typeText}`);
  if (source.includes("entrada")) return "entry" as const;
  if (source.includes("saida") || source.includes("consumo")) return "consumption" as const;
  return "withdrawal" as const;
}

function hasValidMaterialType(parts: MaterialRowParts) {
  const normalizedType = normalizeText(parts.typeText);
  const normalizedResponsible = normalizeText(parts.responsible);
  return normalizedType.includes("retirada") ||
    normalizedType.includes("entrada") ||
    normalizedType.includes("saida") ||
    normalizedType.includes("consumo") ||
    normalizedResponsible === "entradas" ||
    normalizedResponsible.includes("saidas/consumo") ||
    normalizedResponsible.includes("saidas consumo");
}

function parseMaterialItems(value = ""): ParsedMaterialPdfItem[] {
  const text = value.replace(/\s+/g, " ").replace(/\s+,/g, ",").trim();
  if (!text) return [];
  const starts = [...text.matchAll(/(?:^|,\s+)(\d+(?:[,.]\d+)?)\s*x\s*/gi)];
  const items: ParsedMaterialPdfItem[] = [];
  for (let index = 0; index < starts.length; index++) {
    const match = starts[index];
    const next = starts[index + 1];
    const quantity = Number(String(match[1] || "0").replace(",", "."));
    const start = (match.index || 0) + match[0].length;
    const end = next?.index ?? text.length;
    const productName = text.slice(start, end).replace(/^\s*[,;-]+\s*/, "").replace(/\s*[,;-]+\s*$/, "").trim();
    if (!productName || !Number.isFinite(quantity) || quantity <= 0) continue;
    items.push({ productName, quantity: Math.ceil(quantity), unit: "unid" });
  }
  return items;
}

function materialRecordKey(record: ParsedMaterialPdfRecord, items: ParsedMaterialPdfItem[]) {
  const itemsKey = items.map(item => `${normalizeText(item.productName)}:${item.quantity}`).sort().join("|");
  return `${record.kind}|${record.date}|${normalizeText(record.responsible)}|${itemsKey}|${normalizeText(record.notes)}|${normalizeText(record.statusText)}`;
}

function isMaterialHeaderRow(rowText: string) {
  const normalized = normalizeText(rowText);
  return normalized.includes("responsavel") && normalized.includes("itens") && normalized.includes("tipo") && normalized.includes("status");
}

function isMaterialNoiseRow(rowText: string) {
  const normalized = normalizeText(rowText);
  return !normalized ||
    normalized.includes("imppel erp") ||
    normalized.includes("relatorio controle de materiais") ||
    normalized.includes("gerado em") ||
    normalized.includes("responsavel: admin") ||
    normalized.includes("total de registros") ||
    normalized.includes("estrutura erp") ||
    normalized.includes("periodo") ||
    normalized.includes("tipo=materiais") ||
    normalized.includes("pagina ") ||
    normalized.includes("documento confidencial") ||
    isMaterialHeaderRow(rowText);
}

function detectMaterialColumns(row: PdfRow): MaterialColumnLayout | null {
  const lookup = new Map<string, number>();
  for (const item of row.items) {
    const key = normalizeText(item.text);
    if (key === "responsavel") lookup.set("responsible", item.x);
    else if (key === "itens") lookup.set("items", item.x);
    else if (key === "tipo") lookup.set("type", item.x);
    else if (key.includes("origem") || key.includes("observacao")) lookup.set("notes", item.x);
    else if (key === "status") lookup.set("status", item.x);
  }
  if (!lookup.has("responsible") || !lookup.has("items") || !lookup.has("type") || !lookup.has("status")) return null;
  return {
    responsible: lookup.get("responsible") ?? DEFAULT_MATERIAL_COLUMNS.responsible,
    items: lookup.get("items") ?? DEFAULT_MATERIAL_COLUMNS.items,
    type: lookup.get("type") ?? DEFAULT_MATERIAL_COLUMNS.type,
    notes: lookup.get("notes") ?? DEFAULT_MATERIAL_COLUMNS.notes,
    status: lookup.get("status") ?? DEFAULT_MATERIAL_COLUMNS.status,
  };
}

function materialCell(row: PdfRow, columns: MaterialColumnLayout, column: keyof MaterialColumnLayout) {
  const order: Array<keyof MaterialColumnLayout> = ["responsible", "items", "type", "notes", "status"];
  const index = order.indexOf(column);
  const currentX = columns[column];
  const previousX = index > 0 ? columns[order[index - 1]] : currentX - 70;
  const nextX = index < order.length - 1 ? columns[order[index + 1]] : currentX + 180;
  const minX = index === 0 ? currentX - 20 : (previousX + currentX) / 2;
  const maxX = index === order.length - 1 ? nextX + 220 : (currentX + nextX) / 2;
  return cell(row, minX, maxX);
}

function isRecognizedMaterialResponsible(value = "") {
  const normalized = normalizeText(value).replace(/[,.;:-]+$/g, "").trim();
  if (!normalized) return false;
  if (normalized === "entradas" || normalized.includes("saidas/consumo") || normalized.includes("saidas consumo")) return true;
  if (/^[a-z][a-z0-9_-]+\.[a-z0-9_.-]+$/i.test(value.trim())) return true;
  if (/^(nao trabalha para nos|não trabalha para nós)$/i.test(value.trim())) return true;
  return /^[a-zà-ÿ]+(?:\s+[a-zà-ÿ]+){1,5}$/i.test(value.trim()) && !/[,.]$/.test(value.trim());
}
function splitMaterialTextSemantically(rowText: string): MaterialRowParts | null {
  const normalized = rowText.replace(/\s+/g, " ").trim();
  const statusMatch = normalized.match(/\s(pendente|parcial|retornado|consumo|registrado)\s*$/i);
  const statusText = statusMatch?.[1] || "";
  const withoutStatus = statusMatch ? normalized.slice(0, statusMatch.index).trim() : normalized;
  const typeMatch = withoutStatus.match(/\s(Retirada|Entrada|Sa[íi]da)\s/i);
  const typeText = typeMatch?.[1] || "";
  const beforeType = typeMatch ? withoutStatus.slice(0, typeMatch.index).trim() : withoutStatus;
  const notes = typeMatch ? withoutStatus.slice((typeMatch.index || 0) + typeMatch[0].length).trim() : "";
  const itemStart = beforeType.search(/(?:^|\s)(\d+(?:[,.]\d+)?)\s*x\s+\S/i);
  if (itemStart < 0) return null;
  const responsible = beforeType.slice(0, itemStart).trim();
  const itemsText = beforeType.slice(itemStart).trim();
  if (!responsible || !itemsText) return null;
  return { responsible, itemsText, typeText, notes, statusText };
}

function materialRowParts(row: PdfRow, columns: MaterialColumnLayout): MaterialRowParts {
  const rowText = row.items.map(item => item.text).join(" ").replace(/\s+/g, " ").trim();
  const byColumns: MaterialRowParts = {
    responsible: materialCell(row, columns, "responsible"),
    itemsText: materialCell(row, columns, "items"),
    typeText: materialCell(row, columns, "type"),
    notes: materialCell(row, columns, "notes"),
    statusText: materialCell(row, columns, "status"),
  };
  if (byColumns.responsible && byColumns.itemsText) return byColumns;
  const semantic = splitMaterialTextSemantically(rowText);
  if (!semantic) return byColumns;
  return {
    responsible: byColumns.responsible || semantic.responsible,
    itemsText: byColumns.itemsText || semantic.itemsText,
    typeText: byColumns.typeText || semantic.typeText,
    notes: byColumns.notes || semantic.notes,
    statusText: byColumns.statusText || semantic.statusText,
  };
}

function parseMaterials(fileName: string, selectedType: BackupType, report: ReturnType<typeof detectReport>, rows: PdfRow[], rawText: string) {
  const preview = basePreview(fileName, selectedType, report);
  const withdrawals: any[] = [];
  const entries: any[] = [];
  const consumption: any[] = [];
  const seen = new Set<string>();
  const records: ParsedMaterialPdfRecord[] = [];
  let currentDate = "";
  let current: ParsedMaterialPdfRecord | null = null;
  let columns = DEFAULT_MATERIAL_COLUMNS;
  let logicalBlocks = 0;

  const flush = () => {
    if (!current) return;
    logicalBlocks++;
    const items = parseMaterialItems(current.itemsText);
    if (!current.date || !current.responsible || items.length === 0) {
      preview.pendingCount++;
      preview.pending.push(`p${current.page} y${Math.round(current.rowY)} · ${current.date || "sem data"} · ${current.responsible || "sem responsável"}: itens não extraídos com segurança.`);
      preview.rows.push({ name: current.responsible || "Registro pendente", detail: current.itemsText || "Sem itens reconhecidos", status: "pendente" });
      current = null;
      return;
    }
    const key = materialRecordKey(current, items);
    if (seen.has(key)) {
      preview.duplicateCount++;
      preview.ignored.push(`Registro duplicado no PDF: ${current.responsible} em ${current.date}`);
      current = null;
      return;
    }
    seen.add(key);
    const sourceHash = normalizeKey(key).slice(0, 120);
    const status = normalizeMaterialStatus(current.kind, current.statusText);
    const base = {
      source: "ERP_PDF_MATERIAIS",
      sourceHash,
      date: current.date,
      month: monthLabel(current.date),
      responsible: current.responsible,
      notes: current.notes || "Importação PDF Controle de Materiais",
      status,
      items,
      originalType: current.typeText || null,
      originalStatus: current.statusText || null,
      fileName,
    };
    records.push(current);
    if (current.kind === "withdrawal") {
      withdrawals.push({
        ...base,
        username: current.responsible,
        userId: 0,
        workOrderId: null,
        jobId: null,
        clientName: null,
        withdrawalDate: current.date,
        withdrawalPhoto: "restauracao-pdf-materiais",
        withdrawalSignature: "restauracao-pdf-materiais",
        returnPhoto: null,
        returnSignature: null,
        returnNotes: null,
      });
      preview.rows.push({ name: current.responsible, detail: `${current.date} · Retirada · ${items.map(item => `${item.quantity}x ${item.productName}`).join(", ")}`, status: "novo" });
    } else if (current.kind === "entry") {
      entries.push({ ...base, type: "ENTRADA" });
      preview.rows.push({ name: "Entradas", detail: `${current.date} · ${items.map(item => `${item.quantity}x ${item.productName}`).join(", ")}`, status: "novo" });
    } else {
      consumption.push({ ...base, type: "SAÍDA" });
      preview.rows.push({ name: "Saídas/Consumo", detail: `${current.date} · ${items.map(item => `${item.quantity}x ${item.productName}`).join(", ")}`, status: "novo" });
    }
    current = null;
  };

  for (const row of rows) {
    const rowText = row.items.map(item => item.text).join(" ").replace(/\s+/g, " ").trim();
    if (!rowText) continue;
    const dateOnly = validDateBr(rowText);
    if (dateOnly) {
      flush();
      currentDate = dateOnly;
      continue;
    }
    const detectedColumns = detectMaterialColumns(row);
    if (detectedColumns) {
      columns = detectedColumns;
      continue;
    }
    if (isMaterialNoiseRow(rowText)) continue;

    const parts = materialRowParts(row, columns);
    const hasItemPattern = /(?:^|[,\s])(\d+(?:[,.]\d+)?)\s*x\s+\S/i.test(rowText);
    const startsRecord = Boolean(currentDate && parts.responsible && parts.itemsText && hasItemPattern && hasValidMaterialType(parts));

    if (startsRecord && current && !isRecognizedMaterialResponsible(parts.responsible)) {
      const continuedItems = parts.itemsText.includes(parts.responsible) ? parts.itemsText : `${parts.responsible} ${parts.itemsText}`;
      const itemSeparator = /^\d+(?:[,.]\d+)?\s*x\s+/i.test(continuedItems) && !/[,:;]\s*$/.test(current.itemsText) ? ", " : " ";
      current.itemsText = `${current.itemsText}${itemSeparator}${continuedItems}`.trim();
      if (parts.notes) current.notes = `${current.notes} ${parts.notes}`.trim();
      if (!current.statusText && parts.statusText) current.statusText = parts.statusText;
      continue;
    }

    if (startsRecord) {
      flush();
      current = {
        kind: classifyMaterialRecord(parts.responsible, parts.typeText),
        date: currentDate,
        responsible: parts.responsible,
        itemsText: parts.itemsText,
        typeText: parts.typeText,
        notes: parts.notes,
        statusText: parts.statusText,
        page: row.page,
        rowY: row.y,
      };
      continue;
    }

    if (current) {
      const continuationItems = parts.itemsText || (hasItemPattern ? rowText : "");
      const continuationNotes = parts.notes || (!continuationItems ? rowText : "");
      if (continuationItems) {
        const itemSeparator = /^\d+(?:[,.]\d+)?\s*x\s+/i.test(continuationItems) && !/[,:;]\s*$/.test(current.itemsText) ? ", " : " ";
        current.itemsText = `${current.itemsText}${itemSeparator}${continuationItems}`.trim();
      }
      if (continuationNotes) current.notes = `${current.notes} ${continuationNotes}`.trim();
      if (!current.typeText && parts.typeText) {
        current.typeText = parts.typeText;
        current.kind = classifyMaterialRecord(current.responsible, parts.typeText);
      }
      if (!current.statusText && parts.statusText) current.statusText = parts.statusText;
      continue;
    }

    if (currentDate && hasItemPattern) {
      preview.pendingCount++;
      preview.pending.push(`p${row.page} y${Math.round(row.y)} · ${currentDate}: linha com itens sem responsável: ${rowText.slice(0, 160)}`);
      preview.rows.push({ name: "Registro pendente", detail: rowText, status: "pendente" });
    }
  }
  flush();

  preview.extracted = withdrawals.length + entries.length + consumption.length;
  preview.newCount = preview.extracted;
  preview.backup = {
    type: "materiais",
    version: "erp-pdf-preview",
    exportedAt: new Date().toISOString(),
    data: { withdrawals, entries, consumption },
    meta: {
      parser: "parseMaterials",
      records: records.length,
      logicalBlocks,
      sourceFile: fileName,
      rawMarkerFound: normalizeText(rawText).includes("tipo=materiais"),
    },
  };
  const declaredTotal = report.headerTotal || 0;
  const identifiableTotal = logicalBlocks + preview.duplicateCount;
  const coverage = identifiableTotal ? preview.extracted / identifiableTotal : 1;
  preview.canApply = preview.extracted > 0 && preview.errorCount === 0 && preview.pendingCount === 0;
  if (declaredTotal && declaredTotal !== identifiableTotal) {
    preview.warnings.push(`PDF informa ${declaredTotal} registros no cabeçalho; ${identifiableTotal} bloco(s) operacional(is) com tipo de movimento foram identificado(s).`);
  }
  if (identifiableTotal && preview.extracted !== identifiableTotal) {
    preview.warnings.push(`${preview.extracted} de ${identifiableTotal} bloco(s) operacional(is) foram extraídos com segurança (${Math.round(coverage * 100)}%).`);
  }
  if (identifiableTotal >= 20 && coverage < 0.9) {
    preview.canApply = false;
    preview.warnings.push("Importação bloqueada: menos de 90% dos blocos operacionais identificáveis foram reconhecidos com segurança.");
  }
  preview.warnings.push(`Materiais: ${withdrawals.length} retirada(s), ${entries.length} entrada(s), ${consumption.length} saída(s)/consumo extraídas.`);
  return preview;
}function unsupportedPreview(fileName: string, selectedType: BackupType, report: ReturnType<typeof detectReport>) {
  const preview = basePreview(fileName, selectedType, report);
  preview.pendingCount = report.headerTotal || 1;
  preview.warnings.push("Este módulo foi reconhecido, mas ainda exige parser específico para importação segura por PDF.");
  preview.pending.push("Use preview para conferência; a importação automática fica bloqueada para evitar dados incorretos.");
  preview.rows.push({ name: report.title, detail: "Parser PDF específico pendente para este módulo", status: "pendente" });
  return preview;
}

export async function previewErpPdfBuffer(input: { fileName: string; selectedType: BackupType; data: Uint8Array }) {
  const { rows, rawText } = await extractPdf(input.data);
  const report = detectReport(rawText);
  if (report.restoreType && input.selectedType !== report.restoreType && !(input.selectedType === "estoque" && report.type === "movimentacoes")) {
    const preview = basePreview(input.fileName, input.selectedType, report);
    preview.errorCount = 1;
    preview.errors.push(`Módulo selecionado (${input.selectedType}) não confere com o PDF detectado (${report.restoreType}).`);
  return preview;
}
  if (report.type === "usuarios") return parseUsers(input.fileName, input.selectedType, report, rows, rawText);
  if (report.type === "produtos") return parseProducts(input.fileName, input.selectedType, report, rows);
  if (report.type === "servicos") return parseServices(input.fileName, input.selectedType, report, rows);
  if (report.type === "estoque" || report.type === "movimentacoes") return parseStock(input.fileName, input.selectedType, report, rows);
  if (report.type === "materiais") return parseMaterials(input.fileName, input.selectedType, report, rows, rawText);
  return unsupportedPreview(input.fileName, input.selectedType, report);
}

export const __testPdfRestoreParsing = {
  parseMoney,
  parseUsers,
  parseProducts,
  parseServices,
  parseStock,
  parseMaterials,
  parseMaterialItems,
  detectReport,
};
