import { createHash } from "node:crypto";
import {
  resolveMobileImportInventory,
  resolveMobileImportUser,
  type MobileImportInventoryItem,
  type MobileImportPreviewRow,
  type MobileImportUser,
} from "@shared/mobileNotesImport";
import { hasReturnableMaterialItems } from "@shared/materialReturnPolicy";
import {
  createMaterialRestoreFingerprint,
  isHistoricalMaterialResponsible,
  normalizeRestoreText,
} from "./material-restore-service";

const MONTHS_PT_BR = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

type MaterialPdfRecord = {
  kind: "retirada" | "entrada" | "saida";
  date: string;
  responsible: string;
  notes?: string | null;
  status?: string | null;
  sourceHash?: string | null;
  logicalIndex?: number | string | null;
  items: Array<{ productName?: string | null; materialName?: string | null; name?: string | null; quantity?: number | string | null; unit?: string | null; inventoryId?: number | string | null }>;
};

type MaterialPdfPreviewRecord = {
  temporaryId: string;
  originalData: {
    date: string;
    responsible: string;
    type: string;
    notes: string;
    status: string;
  };
  resolvedUser: { id: number; username: string } | null;
  unresolvedUser: string | null;
  items: MobileImportPreviewRow[];
  status: "ready" | "pending" | "duplicate" | "blocked";
  duplicate: boolean;
  errors: string[];
  pendingDetails?: Array<{
    originalText: string;
    type: string;
    reason: string;
    candidates: Array<{ label: string; score: number }>;
    action: string;
  }>;
};

type PreviewContext = {
  inventory: any[];
  users: any[];
  aliases: any[];
  existingWithdrawals: any[];
  existingMovements: any[];
};

function validDate(value: unknown) {
  const text = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function safeMonth(date: string, fallback?: string | null) {
  if (fallback) return fallback;
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? MONTHS_PT_BR[new Date().getMonth()] : parsed.toLocaleString("pt-BR", { month: "long", year: "numeric" });
}

function itemName(item: any) {
  return String(item?.productName || item?.materialName || item?.name || "").trim();
}

function materialImportHash(data: any) {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

function asRecords(data: any): MaterialPdfRecord[] {
  const withdrawals = Array.isArray(data?.withdrawals) ? data.withdrawals : [];
  const entries = Array.isArray(data?.entries) ? data.entries : [];
  const consumption = Array.isArray(data?.consumption) ? data.consumption : [];
  let order = 0;
  return [
    ...withdrawals.map((record: any) => ({
      kind: "retirada" as const,
      date: record.withdrawalDate || record.date,
      responsible: record.username || record.responsible || "",
      notes: record.notes || record.origin || "",
      status: record.status || "pendente",
      sourceHash: record.sourceHash,
      logicalIndex: record.logicalIndex ?? order++,
      items: Array.isArray(record.items) ? record.items : [],
    })),
    ...entries.map((record: any) => ({
      kind: "entrada" as const,
      date: record.date,
      responsible: record.responsible || record.username || "Entradas",
      notes: record.notes || record.origin || "",
      status: record.status || "registrado",
      sourceHash: record.sourceHash,
      logicalIndex: record.logicalIndex ?? order++,
      items: Array.isArray(record.items) && record.items.length ? record.items : [record],
    })),
    ...consumption.map((record: any) => ({
      kind: "saida" as const,
      date: record.date,
      responsible: record.responsible || record.username || "Saídas/Consumo",
      notes: record.notes || record.origin || "",
      status: record.status || "consumo",
      sourceHash: record.sourceHash,
      logicalIndex: record.logicalIndex ?? order++,
      items: Array.isArray(record.items) && record.items.length ? record.items : [record],
    })),
  ];
}

function inventoryCandidates(inventory: any[]): MobileImportInventoryItem[] {
  return inventory.map(item => ({
    id: Number(item.id),
    name: String(item.name || ""),
    type: item.type,
    unit: item.unit,
    quantity: Number(item.quantity || 0),
    source: "inventory" as const,
  }));
}

function userCandidates(users: any[]): MobileImportUser[] {
  return users.map(user => ({
    id: Number(user.id),
    username: String(user.username || ""),
    fullName: user.fullName || user.name,
    jobTitle: user.jobTitle,
    roleLabel: user.roleLabel,
    role: user.role,
  }));
}

function candidateList<T>(
  query: string,
  candidates: T[],
  label: (candidate: T) => string,
) {
  const key = normalizeRestoreText(query);
  if (!key) return [];
  return candidates
    .map(candidate => {
      const candidateLabel = label(candidate);
      const candidateKey = normalizeRestoreText(candidateLabel);
      const score = candidateKey === key ? 100 : candidateKey.includes(key) || key.includes(candidateKey) ? 70 : 0;
      return { label: candidateLabel, score };
    })
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function existingFingerprints(existingWithdrawals: any[], existingMovements: any[]) {
  const read = (value: unknown) => String(value || "").match(/fingerprint:([a-f0-9]{64})/i)?.[1];
  return new Set([
    ...existingWithdrawals.map(row => read(row.notes)).filter(Boolean),
    ...existingMovements.map(row => read(row.notes)).filter(Boolean),
  ] as string[]);
}

function rowFingerprint(record: MaterialPdfRecord, rows: MobileImportPreviewRow[]) {
  return createMaterialRestoreFingerprint({
    backupType: "controle-materiais",
    sourceHash: record.sourceHash,
    date: validDate(record.date),
    operationType: record.kind,
    responsible: record.responsible,
    items: rows.map(row => ({ inventoryId: row.inventoryId || undefined, productName: row.itemName || row.rawItem, quantity: row.quantity, unit: row.unit || "unid" })),
    origin: rows[0]?.rawText,
    observation: "Importação PDF Controle de Materiais",
    logicalIndex: `pdf-material-${record.logicalIndex}`,
  });
}

export function buildMaterialPdfImportPreview(data: any, context: PreviewContext) {
  const inventory = inventoryCandidates(context.inventory);
  const users = userCandidates(context.users);
  const fingerprints = existingFingerprints(context.existingWithdrawals, context.existingMovements);
  const records: MaterialPdfPreviewRecord[] = [];
  const rows: MobileImportPreviewRow[] = [];
  const warnings: string[] = [];
  let order = 0;

  for (const record of asRecords(data)) {
    const temporaryId = `pdf-material-${order}`;
    const date = validDate(record.date);
    const recordErrors: string[] = [];
    if (!date) recordErrors.push(`Data inválida: ${record.date || "sem data"}`);

    const userMatch = record.kind === "retirada" && !isHistoricalMaterialResponsible(record.responsible)
      ? resolveMobileImportUser(record.responsible, users, context.aliases || [])
      : { user: null, score: record.kind === "retirada" ? 100 : 0 };
    const unresolvedUser = record.kind === "retirada" && !isHistoricalMaterialResponsible(record.responsible) && (!userMatch.user || userMatch.score < 70)
      ? record.responsible || "sem responsável"
      : null;
    if (unresolvedUser) recordErrors.push(`Funcionário não encontrado: ${unresolvedUser}`);

    const itemRows = record.items.map((item, itemIndex) => {
      const rawItem = itemName(item);
      const quantity = Math.ceil(Number(item.quantity || 0));
      const explicitInventory = Number(item.inventoryId || 0);
      const explicitMatch = explicitInventory > 0 ? inventory.find(candidate => Number(candidate.id) === explicitInventory) : null;
      const match = explicitMatch ? { item: explicitMatch, score: 100, catalogOnly: false } : resolveMobileImportInventory(rawItem, inventory);
      const itemWarnings: string[] = [];
      if (!rawItem || quantity <= 0) itemWarnings.push("Material ou quantidade inválida");
      if (!match.item || match.score < 70 || match.catalogOnly) itemWarnings.push("Material não encontrado");
      const row: MobileImportPreviewRow = {
        id: `${temporaryId}-item-${itemIndex}`,
        sourceRecordId: temporaryId,
        sourceHash: record.sourceHash || null,
        order: order * 100 + itemIndex,
        date: date || new Date().toISOString().slice(0, 10),
        type: record.kind,
        quantity: Math.max(1, quantity || 1),
        rawText: `${record.responsible} - ${rawItem}`,
        rawItem,
        inventoryId: match.item && match.score >= 70 && !match.catalogOnly ? Number(match.item.id) : null,
        itemName: match.item && match.score >= 70 ? match.item.name : null,
        unit: match.item && match.score >= 70 ? match.item.unit || "unid" : item.unit || "unid",
        itemConfidence: match.score,
        rawEmployee: record.kind === "retirada" ? record.responsible : null,
        userId: record.kind === "retirada" && userMatch.user && userMatch.score >= 70 ? Number(userMatch.user.id) : null,
        username: record.kind === "retirada" && userMatch.user && userMatch.score >= 70 ? userMatch.user.username : null,
        userConfidence: record.kind === "retirada" ? userMatch.score : undefined,
        status: itemWarnings.length || unresolvedUser || !date ? "duvidoso" : "ok",
        warnings: [...recordErrors, ...itemWarnings],
      };
      return row;
    });

    const fingerprint = itemRows.every(row => row.inventoryId) ? rowFingerprint(record, itemRows) : "";
    const duplicate = Boolean(fingerprint && fingerprints.has(fingerprint));
    if (duplicate) {
      itemRows.forEach(row => {
        row.duplicate = true;
        row.duplicateReason = "DUPLICADO — JÁ IMPORTADO";
        row.status = "bloqueado";
        row.warnings = [...row.warnings, row.duplicateReason];
      });
    }

    rows.push(...itemRows);
    const pendingDetails = [
      ...(unresolvedUser ? [{
        originalText: record.responsible || "sem responsável",
        type: "funcionário",
        reason: "Responsável da retirada não foi encontrado com score seguro no cadastro de usuários.",
        candidates: candidateList(record.responsible, users, user => `${user.username}${user.fullName ? ` · ${user.fullName}` : ""}`),
        action: "Selecione o funcionário correto no preview ou cadastre o usuário antes da importação.",
      }] : []),
      ...itemRows
        .filter(row => !row.inventoryId || row.warnings?.some(warning => warning.toLowerCase().includes("material")))
        .map(row => ({
          originalText: row.rawItem || row.rawText,
          type: "material",
          reason: !row.rawItem ? "Nome do material ausente na linha do PDF." : "Material não encontrado no Estoque com score seguro.",
          candidates: candidateList(row.rawItem || row.rawText, inventory, item => item.name),
          action: "Selecione o material correto no preview ou cadastre o item no Estoque antes da importação.",
        })),
      ...itemRows
        .filter(row => row.warnings?.some(warning => warning.toLowerCase().includes("quantidade")))
        .map(row => ({
          originalText: row.rawText,
          type: "quantidade",
          reason: "Quantidade ausente ou inválida na linha do PDF.",
          candidates: [],
          action: "Revise o PDF original e ignore/corrija o item antes de importar.",
        })),
    ];
    records.push({
      temporaryId,
      originalData: {
        date: String(record.date || ""),
        responsible: record.responsible,
        type: record.kind,
        notes: String(record.notes || ""),
        status: String(record.status || ""),
      },
      resolvedUser: userMatch.user && userMatch.score >= 70 ? { id: Number(userMatch.user.id), username: userMatch.user.username } : null,
      unresolvedUser,
      items: itemRows,
      status: duplicate ? "duplicate" : recordErrors.length || itemRows.some(row => row.status !== "ok") ? "pending" : "ready",
      duplicate,
      errors: recordErrors,
      pendingDetails,
    });
    order++;
  }

  const readyRecords = records.filter(record => record.status === "ready").length;
  const pendingRecords = records.filter(record => record.status === "pending").length;
  const duplicateRecords = records.filter(record => record.status === "duplicate").length;
  const blockedRecords = records.filter(record => record.status === "blocked").length;
  const uniqueMaterialNames = new Set(rows.map(row => normalizeRestoreText(row.rawItem)).filter(Boolean)).size;
  const uniqueResponsibleNames = new Set(records.map(record => normalizeRestoreText(record.originalData.responsible)).filter(Boolean)).size;
  const unresolvedMaterials = new Set(rows.filter(row => !row.inventoryId).map(row => normalizeRestoreText(row.rawItem)).filter(Boolean)).size;
  const unresolvedUsers = new Set(records.filter(record => record.unresolvedUser).map(record => normalizeRestoreText(record.unresolvedUser || "")).filter(Boolean)).size;
  if (pendingRecords) warnings.push(`${pendingRecords} registro(s) aguardam resolução manual antes de importar.`);
  if (duplicateRecords) warnings.push(`${duplicateRecords} registro(s) já foram importados e serão ignorados.`);
  warnings.push(`${rows.length} ocorrência(s) avaliada(s), ${uniqueMaterialNames} material(is) único(s), ${uniqueResponsibleNames} responsável(is), ${unresolvedMaterials} material(is) e ${unresolvedUsers} responsável(is) precisam de confirmação.`);

  return {
    hash: materialImportHash(data),
    summary: {
      total: records.length,
      ready: readyRecords,
      pending: pendingRecords,
      duplicates: duplicateRecords,
      blocked: blockedRecords,
      importableRows: rows.filter(row => row.status === "ok" && !row.duplicate && row.inventoryId && (row.type !== "retirada" || row.userId)).length,
      occurrences: rows.length,
      uniqueMaterials: uniqueMaterialNames,
      uniqueResponsibleNames,
      unresolvedMaterials,
      unresolvedUsers,
    },
    records,
    rows,
    users,
    inventory,
    warnings,
  };
}

export function normalizeMaterialPdfRows(rows: unknown): MobileImportPreviewRow[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row: any, index) => ({
    id: String(row.id || `pdf-row-${index}`),
    sourceRecordId: row.sourceRecordId ? String(row.sourceRecordId) : null,
    sourceHash: row.sourceHash ? String(row.sourceHash) : null,
    order: Number.isFinite(Number(row.order)) ? Number(row.order) : index,
    date: validDate(row.date) || "",
    type: row.type === "entrada" || row.type === "retirada" ? row.type : "saida",
    quantity: Math.max(1, Math.trunc(Number(row.quantity) || 1)),
    rawText: String(row.rawText || row.rawItem || ""),
    rawItem: String(row.rawItem || row.itemName || ""),
    inventoryId: row.inventoryId ? Number(row.inventoryId) : null,
    itemName: row.itemName ? String(row.itemName) : null,
    unit: row.unit ? String(row.unit) : null,
    itemConfidence: Math.max(0, Math.min(100, Number(row.itemConfidence) || 0)),
    rawEmployee: row.rawEmployee ? String(row.rawEmployee) : null,
    userId: row.userId ? Number(row.userId) : null,
    username: row.username ? String(row.username) : null,
    userConfidence: row.userConfidence == null ? undefined : Math.max(0, Math.min(100, Number(row.userConfidence) || 0)),
    status: row.status === "ok" || row.status === "bloqueado" ? row.status : "duvidoso",
    warnings: Array.isArray(row.warnings) ? row.warnings.map(String) : [],
    ignored: Boolean(row.ignored),
    duplicate: Boolean(row.duplicate),
    duplicateReason: row.duplicateReason ? String(row.duplicateReason) : null,
  })).sort((a, b) => a.order - b.order);
}

export async function applyMaterialPdfImportRows(input: {
  rows: MobileImportPreviewRow[];
  storage: any;
  sessionUserId: number;
  sourceHash?: string | null;
  applyToStock?: boolean;
}) {
  const [inventoryItems, users, existingAliases, existingWithdrawals, existingMovements] = await Promise.all([
    input.storage.getInventoryItems(),
    input.storage.getUsers(),
    input.storage.getMobileImportAliases(),
    input.storage.getMaterialWithdrawals(),
    input.storage.getInventoryMovements(),
  ]);
  const inventoryById = new Map<number, any>(inventoryItems.map((item: any) => [Number(item.id), item]));
  const usersById = new Map<number, any>(users.map((user: any) => [Number(user.id), user]));
  const sessionUser: any = usersById.get(Number(input.sessionUserId)) || users.find((user: any) => user.role === "admin") || users[0] || null;
  const fingerprints = existingFingerprints(existingWithdrawals, existingMovements);
  const importable = input.rows.filter(row => !row.ignored && !row.duplicate && row.status === "ok" && row.inventoryId && row.quantity > 0 && validDate(row.date) && (row.type !== "retirada" || row.userId));
  const pending = input.rows.filter(row => !row.ignored && (row.status !== "ok" || row.duplicate || !row.inventoryId || (row.type === "retirada" && !row.userId)));
  const movements: any[] = [];
  const withdrawals: any[] = [];
  let skippedDuplicates = 0;
  const startedAt = Date.now();

  const groups = new Map<string, MobileImportPreviewRow[]>();
  for (const row of importable) {
    const key = row.type === "retirada"
      ? `${row.sourceRecordId || row.date}:${row.date}:${row.userId}`
      : `${row.sourceRecordId || row.id}:${row.type}:${row.date}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }

  for (const groupRows of groups.values()) {
    const first = groupRows[0];
    if (!first) continue;
    const items = groupRows.map(row => {
      const inventoryItem = inventoryById.get(Number(row.inventoryId));
      if (!inventoryItem) throw new Error(`Material não encontrado: ${row.rawItem}`);
      return {
        withdrawalId: 0,
        inventoryId: Number(inventoryItem.id),
        productName: inventoryItem.name,
        unit: inventoryItem.unit || "unid",
        quantity: Number(row.quantity),
      };
    });
    const fingerprint = createMaterialRestoreFingerprint({
      backupType: "controle-materiais",
      sourceHash: (first as any).sourceHash || input.sourceHash,
      date: first.date,
      operationType: first.type,
      responsible: first.username || first.rawEmployee || (first.type === "entrada" ? "Entradas" : "Saídas/Consumo"),
      items,
      origin: first.rawText,
      observation: "Importação PDF Controle de Materiais",
      logicalIndex: first.sourceRecordId || first.id,
    });
    if (fingerprints.has(fingerprint)) {
      skippedDuplicates++;
      continue;
    }
    fingerprints.add(fingerprint);

    if (first.type === "retirada") {
      const responsible: any = usersById.get(Number(first.userId));
      if (!responsible) throw new Error(`Funcionário não encontrado para ${first.rawEmployee || first.rawText}`);
      const hasReturnables = hasReturnableMaterialItems(items.map(item => ({
        productName: item.productName,
        type: inventoryById.get(Number(item.inventoryId))?.type,
      })));
      const withdrawal = await input.storage.createMaterialWithdrawal({
        userId: Number(responsible.id),
        username: responsible.username,
        workOrderId: null,
        jobId: null,
        clientName: null,
        withdrawalDate: first.date,
        status: hasReturnables ? "pendente" : "consumido",
        withdrawalPhoto: null,
        withdrawalSignature: null,
        notes: `Importação PDF Controle de Materiais | fingerprint:${fingerprint} | ${first.rawText}`,
        returnPhoto: null,
        returnSignature: null,
        returnNotes: null,
      }, items);
      withdrawals.push(withdrawal);
      for (const item of items) {
        const movement = await input.storage.createInventoryMovement({
          inventoryId: item.inventoryId,
          productName: item.productName,
          type: "SAÍDA",
          quantity: item.quantity,
          date: first.date,
          month: safeMonth(first.date),
          notes: `Origem: RESTAURACAO_PDF_MATERIAIS | Saldo ja refletido no PDF de Estoque | Retirada #${withdrawal.id} | fingerprint:${fingerprint} | Responsavel: ${responsible.username}`,
        }, { applyToStock: input.applyToStock !== false });
        movements.push(movement);
      }
      continue;
    }

    for (const item of items) {
      const movement = await input.storage.createInventoryMovement({
        inventoryId: item.inventoryId,
        productName: item.productName,
        type: first.type === "entrada" ? "ENTRADA" : "SAÍDA",
        quantity: item.quantity,
        date: first.date,
        month: safeMonth(first.date),
        notes: `Origem: RESTAURACAO_PDF_MATERIAIS | Saldo ja refletido no PDF de Estoque | ${first.type === "entrada" ? "Entrada" : "Saída/Consumo"} | fingerprint:${fingerprint} | ${first.rawText}`,
      }, { applyToStock: input.applyToStock !== false });
      movements.push(movement);
    }
  }

  const existingAliasKeys = new Set(existingAliases.map((item: any) => normalizeRestoreText(item.alias)));
  const aliasesToSave = Array.from(input.rows
    .filter(row => row.type === "retirada" && row.rawEmployee && row.userId && row.username)
    .reduce((map, row) => {
      const alias = String(row.rawEmployee || "").trim();
      const aliasKey = normalizeRestoreText(alias);
      if (!alias || !aliasKey || existingAliasKeys.has(aliasKey) || map.has(aliasKey)) return map;
      map.set(aliasKey, { alias, userId: Number(row.userId), username: String(row.username) });
      return map;
    }, new Map<string, { alias: string; userId: number; username: string }>()).values());
  const savedAliases: any[] = [];
  for (const aliasInput of aliasesToSave) {
    const aliasKey = normalizeRestoreText(aliasInput.alias);
    if (existingAliasKeys.has(aliasKey)) continue;
    savedAliases.push(await input.storage.createMobileImportAlias({
      alias: aliasInput.alias,
      userId: aliasInput.userId,
      username: aliasInput.username,
      createdByUserId: Number(sessionUser?.id || aliasInput.userId),
      createdByUsername: String(sessionUser?.username || aliasInput.username),
    }));
    existingAliasKeys.add(aliasKey);
  }

  return {
    withdrawals,
    movements,
    savedAliases,
    summary: {
      registrosImportados: withdrawals.length + movements.length,
      retiradasCriadas: withdrawals.length,
      movimentacoesCriadas: movements.length,
      entradasCriadas: movements.filter(movement => movement.type === "ENTRADA").length,
      saidasCriadas: movements.filter(movement => movement.type !== "ENTRADA").length,
      duplicadosIgnorados: skippedDuplicates,
      pendentesRestantes: pending.length,
      aliasesSalvos: savedAliases.length,
      linhasAvaliadas: input.rows.length,
      linhasImportaveis: importable.length,
      tempoMs: Date.now() - startedAt,
      relatorio: {
        modulo: "Controle de Materiais",
        retiradas: withdrawals.length,
        movimentos: movements.length,
        entradas: movements.filter(movement => movement.type === "ENTRADA").length,
        saidas: movements.filter(movement => movement.type !== "ENTRADA").length,
        pendencias: pending.length,
        duplicados: skippedDuplicates,
        aliases: savedAliases.length,
      },
    },
  };
}
