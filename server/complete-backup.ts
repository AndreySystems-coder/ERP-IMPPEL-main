import { createHash } from "node:crypto";

import {
  COMPLETE_BACKUP_MODULE_TABLES,
  type CompleteBackupData,
  type CompleteBackupModule,
  type IStorage,
} from "./storage";

export const COMPLETE_BACKUP_FORMAT = "imppel-erp-complete-backup";
export const COMPLETE_BACKUP_VERSION = "3.0";

export type CompleteBackupManifest = {
  format: string;
  version: string;
  erpVersion: string;
  createdAt: string;
  environment: string;
  includedModules: CompleteBackupModule[];
  notIncludedModules: string[];
  notIncluded: string[];
  counts: Record<string, number>;
  tableCounts: Record<string, number>;
  attachmentCounts: Record<string, number>;
  checksum: { algorithm: "sha256"; value: string; scope: "data" };
  fileChecksums?: Record<string, { algorithm: "sha256"; value: string; records?: number }>;
  security: {
    plaintextPasswordsIncluded: false;
    passwordHashesIncluded: boolean;
    secretsIncluded: false;
    note: string;
  };
  warnings: string[];
  restoreInstructions: string[];
};

export type CompleteBackupPackage = {
  type: "erp-completo";
  version: string;
  exportedAt: string;
  manifest: CompleteBackupManifest;
  data: Record<CompleteBackupModule, Record<string, unknown[]>>;
};

export type TechnicalBackupPayload = {
  type: string;
  version: string;
  exportedAt: string;
  module: CompleteBackupModule;
  tables: string[];
  data: Record<string, unknown[]>;
};

export type RestorePreviewTable = {
  table: string;
  incoming: number;
  current: number;
  newCount: number;
  updatedCount: number;
  duplicateCount: number;
  ignoredCount: number;
  conflictCount: number;
  conflicts: string[];
};

export type RestorePreview = {
  mode: "merge" | "replace";
  modules: CompleteBackupModule[];
  tables: RestorePreviewTable[];
  totals: {
    incoming: number;
    current: number;
    newCount: number;
    updatedCount: number;
    duplicateCount: number;
    ignoredCount: number;
    conflictCount: number;
  };
  relationships: string[];
  dependencies: string[];
};

export const TECHNICAL_BACKUP_TYPES: Record<string, { module: CompleteBackupModule; tables: string[]; label: string }> = {
  usuarios: { module: "usuarios", tables: ["users"], label: "Usuários" },
  cargos: { module: "usuarios", tables: ["roles"], label: "Cargos" },
  clientes: { module: "clientes", tables: ["clients"], label: "Clientes" },
  leads: { module: "leads", tables: ["leads"], label: "Leads" },
  produtos: { module: "catalogoMateriais", tables: ["products"], label: "Produtos" },
  servicos: { module: "catalogoServicos", tables: ["services"], label: "Serviços" },
  estoque: { module: "estoque", tables: ["inventory"], label: "Estoque" },
  movimentacoes: { module: "estoque", tables: ["inventoryMovements"], label: "Movimentações" },
  ordensServico: { module: "ordensServico", tables: ["workOrders", "jobTracking"], label: "Ordens de Serviço" },
  orcamentos: { module: "orcamentos", tables: ["jobs"], label: "Orçamentos" },
  garantias: { module: "garantias", tables: ["warranties", "warrantyIncidents", "contracts"], label: "Garantias" },
  financeiro: { module: "financeiro", tables: ["payments", "transactions"], label: "Financeiro" },
  materiais: { module: "controleMateriais", tables: ["materialWithdrawals", "materialWithdrawalItems", "obraConsumoLogs", "salaryDiscounts"], label: "Materiais" },
  configuracoes: { module: "configuracoes", tables: ["settings", "costConfig", "priorityRules", "jobStatuses", "whatsappFlows", "whatsappSendLogs", "whatsappTemplates", "quoteTemplates", "salaryDiscountRules"], label: "Configurações" },
  registrosObra: { module: "registrosObra", tables: ["obraRegistros", "productionLogs"], label: "Registros de Obra" },
  vendasMateriais: { module: "vendasMateriais", tables: ["materialSales"], label: "Vendas de Materiais" },
  posVenda: { module: "posVenda", tables: ["npsResponses", "maintenanceReminders"], label: "Pós-venda" },
  formasPagamento: { module: "formasPagamento", tables: ["paymentMethods"], label: "Formas de Pagamento" },
  condicoesPagamento: { module: "condicoesPagamento", tables: ["paymentConditions"], label: "Condições de Pagamento" },
};

function recordCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function hasContent(value: unknown) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed !== "[]" && trimmed !== "{}" && trimmed !== "null";
}

export function checksumCompleteBackupData(data: CompleteBackupPackage["data"]) {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

export async function buildCompleteBackupPackage(
  storage: IStorage,
  options: { environment: string; erpVersion?: string; createdAt?: string },
): Promise<CompleteBackupPackage> {
  const snapshot = await storage.getCompleteBackupData();
  snapshot.users = (snapshot.users || []).map((user: any) => {
    const passwordHash = /^\$2[aby]\$/.test(String(user.password || "")) ? user.password : null;
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      roleId: user.roleId,
      jobTitle: user.jobTitle,
      fullName: user.fullName ?? null,
      birthDate: user.birthDate ?? null,
      status: user.status ?? "ativo",
      mustChangePassword: !!user.mustChangePassword,
      createdAt: user.createdAt,
      passwordHash,
      requiresPasswordReset: !passwordHash,
    };
  });

  const modules = Object.fromEntries(
    (Object.entries(COMPLETE_BACKUP_MODULE_TABLES) as Array<[CompleteBackupModule, readonly string[]]>).map(
      ([moduleName, tableNames]) => [
        moduleName,
        Object.fromEntries(tableNames.map(tableName => [tableName, snapshot[tableName] || []])),
      ],
    ),
  ) as CompleteBackupPackage["data"];

  const tableCounts = Object.fromEntries(
    Object.entries(snapshot).map(([tableName, rows]) => [tableName, recordCount(rows)]),
  );
  const counts = Object.fromEntries(
    Object.entries(modules).map(([moduleName, tables]) => [
      moduleName,
      Object.values(tables).reduce((sum, rows) => sum + recordCount(rows), 0),
    ]),
  );
  const attachmentCounts = {
    fotosOrdensServico: (snapshot.workOrders || []).filter((row: any) => hasContent(row.photos)).length,
    fotosRegistrosObra: (snapshot.obraRegistros || []).filter((row: any) => hasContent(row.fotos)).length,
    fotosRetirada: (snapshot.materialWithdrawals || []).filter((row: any) => hasContent(row.withdrawalPhoto)).length,
    fotosDevolucao: (snapshot.materialWithdrawals || []).filter((row: any) => hasContent(row.returnPhoto)).length,
    assinaturasRetirada: (snapshot.materialWithdrawals || []).filter((row: any) => hasContent(row.withdrawalSignature)).length,
    assinaturasDevolucao: (snapshot.materialWithdrawals || []).filter((row: any) => hasContent(row.returnSignature)).length,
    contratosAssinados: (snapshot.contracts || []).filter((row: any) => hasContent(row.signedDocumentData)).length,
    anexosStatus: (snapshot.jobStatuses || []).filter((row: any) => hasContent(row.extraFileData)).length,
  };
  const createdAt = options.createdAt || new Date().toISOString();

  const manifest: CompleteBackupManifest = {
    format: COMPLETE_BACKUP_FORMAT,
    version: COMPLETE_BACKUP_VERSION,
    erpVersion: options.erpVersion || "1.0.0",
    createdAt,
    environment: options.environment,
    includedModules: Object.keys(modules) as CompleteBackupModule[],
    notIncludedModules: [],
    notIncluded: [
      "PDFs gerados e apenas baixados pelo navegador, quando nao foram gravados no banco",
      "Arquivos externos ao banco de dados",
      "Variaveis de ambiente, DATABASE_URL e SESSION_SECRET",
    ],
    counts,
    tableCounts,
    attachmentCounts,
    checksum: { algorithm: "sha256", value: checksumCompleteBackupData(modules), scope: "data" },
    security: {
      plaintextPasswordsIncluded: false,
      passwordHashesIncluded: true,
      secretsIncluded: false,
      note: "Somente hashes bcrypt restauraveis sao incluidos. Usuarios legados sem hash ficam marcados para redefinicao de senha.",
    },
    warnings: [
      "Guarde este pacote como dado privado; ele pode conter dados pessoais, fotos, assinaturas e documentos.",
      "A restauracao por substituicao remove somente os modulos selecionados e exige confirmacao forte.",
      "As copias em attachments/, photos/ e signatures/ servem para conferencia; a restauracao usa o JSON tecnico.",
    ],
    restoreInstructions: [
      "Configure DATABASE_URL, SESSION_SECRET e o Admin em uma instalacao limpa.",
      "Execute npm install, npm run db:push e inicie o ERP.",
      "Entre como Admin e abra Backups > Restauracao.",
      "Envie o ZIP, confira manifesto, checksums, preview e modulos selecionados.",
      "Use Mesclar por padrao. Em banco vazio, Substituir modulos selecionados preserva IDs originais.",
    ],
  };

  return { type: "erp-completo", version: COMPLETE_BACKUP_VERSION, exportedAt: createdAt, manifest, data: modules };
}

export function validateCompleteBackupPackage(value: any): asserts value is CompleteBackupPackage {
  if (value?.type !== "erp-completo" || value?.manifest?.format !== COMPLETE_BACKUP_FORMAT || !value?.data) {
    throw new Error("Pacote completo invalido ou sem manifesto.");
  }
  const expected = String(value.manifest?.checksum?.value || "");
  const actual = checksumCompleteBackupData(value.data);
  if (!expected || expected !== actual) {
    throw new Error("Falha de integridade: checksum do pacote nao confere.");
  }
}

export function flattenCompleteBackupData(
  packageData: CompleteBackupPackage,
  modules: CompleteBackupModule[],
) {
  const flatData: Record<string, any[]> = {};
  for (const moduleName of modules) {
    const moduleData = packageData.data[moduleName];
    for (const tableName of COMPLETE_BACKUP_MODULE_TABLES[moduleName]) {
      flatData[tableName] = Array.isArray(moduleData?.[tableName]) ? moduleData[tableName] : [];
    }
  }
  return flatData;
}

export function validateTechnicalBackupPayload(value: any): asserts value is TechnicalBackupPayload {
  const config = TECHNICAL_BACKUP_TYPES[String(value?.type || "")];
  if (!config || value?.version !== COMPLETE_BACKUP_VERSION || !value?.data || typeof value.data !== "object") {
    throw new Error("JSON tecnico invalido ou incompatível com esta versao do ERP.");
  }
  if (value.module !== config.module) {
    throw new Error("JSON tecnico invalido: modulo declarado nao confere com o tipo.");
  }
  const allowedTables = new Set(config.tables);
  for (const tableName of Object.keys(value.data)) {
    if (!allowedTables.has(tableName)) {
      throw new Error(`JSON tecnico invalido: tabela nao permitida para ${value.type} (${tableName}).`);
    }
  }
}

export function flattenTechnicalBackupPayload(payload: TechnicalBackupPayload) {
  validateTechnicalBackupPayload(payload);
  const config = TECHNICAL_BACKUP_TYPES[payload.type];
  const flatData: Record<string, any[]> = {};
  for (const tableName of config.tables) {
    flatData[tableName] = Array.isArray(payload.data?.[tableName]) ? payload.data[tableName] as any[] : [];
  }
  return { modules: [config.module], tables: config.tables, data: flatData };
}

const RELATIONSHIPS: Record<string, Array<{ field: string; target: string }>> = {
  users: [{ field: "roleId", target: "roles" }],
  leads: [{ field: "clientId", target: "clients" }],
  jobs: [{ field: "clientId", target: "clients" }, { field: "leadId", target: "leads" }],
  workOrders: [{ field: "jobId", target: "jobs" }, { field: "clientId", target: "clients" }],
  jobTracking: [{ field: "workOrderId", target: "workOrders" }],
  obraRegistros: [{ field: "workOrderId", target: "workOrders" }],
  productionLogs: [{ field: "workOrderId", target: "workOrders" }, { field: "userId", target: "users" }],
  materialWithdrawals: [{ field: "userId", target: "users" }, { field: "workOrderId", target: "workOrders" }, { field: "jobId", target: "jobs" }],
  materialWithdrawalItems: [{ field: "withdrawalId", target: "materialWithdrawals" }, { field: "inventoryId", target: "inventory" }],
  obraConsumoLogs: [{ field: "workOrderId", target: "workOrders" }, { field: "inventoryId", target: "inventory" }],
  salaryDiscounts: [{ field: "userId", target: "users" }, { field: "withdrawalId", target: "materialWithdrawals" }],
  inventoryMovements: [{ field: "inventoryId", target: "inventory" }],
  payments: [{ field: "jobId", target: "jobs" }],
  materialSales: [{ field: "createdByUserId", target: "users" }, { field: "approvedByUserId", target: "users" }],
  warranties: [{ field: "workOrderId", target: "workOrders" }, { field: "jobId", target: "jobs" }],
  warrantyIncidents: [{ field: "warrantyId", target: "warranties" }],
  contracts: [{ field: "workOrderId", target: "workOrders" }, { field: "jobId", target: "jobs" }],
  npsResponses: [{ field: "workOrderId", target: "workOrders" }, { field: "jobId", target: "jobs" }],
  maintenanceReminders: [{ field: "workOrderId", target: "workOrders" }, { field: "jobId", target: "jobs" }],
};

export function buildRestorePreview(
  currentData: CompleteBackupData,
  incomingData: CompleteBackupData,
  modules: CompleteBackupModule[],
  mode: "merge" | "replace",
  tableFilter?: string[],
): RestorePreview {
  const selectedTables = tableFilter?.length
    ? tableFilter
    : Array.from(new Set(modules.flatMap(moduleName => [...COMPLETE_BACKUP_MODULE_TABLES[moduleName]])));
  const incomingIds = Object.fromEntries(selectedTables.map(tableName => [
    tableName,
    new Set((incomingData[tableName] || []).map((row: any) => Number(row?.id)).filter(Boolean)),
  ]));
  const currentIds = Object.fromEntries(Object.entries(currentData).map(([tableName, rows]) => [
    tableName,
    new Set((Array.isArray(rows) ? rows : []).map((row: any) => Number(row?.id)).filter(Boolean)),
  ]));
  const dependencies = new Set<string>();
  const relationships = new Set<string>();

  const tables = selectedTables.map(tableName => {
    const rows = Array.isArray(incomingData[tableName]) ? incomingData[tableName] : [];
    const currentRows = Array.isArray(currentData[tableName]) ? currentData[tableName] : [];
    const seen = new Set<number>();
    const conflicts: string[] = [];
    let newCount = 0;
    let updatedCount = 0;
    let duplicateCount = 0;
    let ignoredCount = 0;
    let conflictCount = 0;

    for (const row of rows) {
      if (!row || typeof row !== "object") { ignoredCount++; continue; }
      const id = Number((row as any).id);
      if (id && seen.has(id)) { duplicateCount++; continue; }
      if (id) seen.add(id);
      if (mode === "merge" && id && currentIds[tableName]?.has(id)) updatedCount++;
      else newCount++;

      for (const relation of RELATIONSHIPS[tableName] || []) {
        const ref = Number((row as any)[relation.field]);
        if (!ref) continue;
        relationships.add(`${tableName}.${relation.field} -> ${relation.target}.id`);
        const existsInIncoming = incomingIds[relation.target]?.has(ref);
        const existsInCurrent = currentIds[relation.target]?.has(ref);
        if (!existsInIncoming && !existsInCurrent) {
          conflictCount++;
          conflicts.push(`${tableName}#${id || "sem-id"} referencia ${relation.target}#${ref}, mas o registro nao existe no pacote nem no banco atual.`);
        }
      }
    }

    for (const relation of RELATIONSHIPS[tableName] || []) dependencies.add(relation.target);

    return {
      table: tableName,
      incoming: rows.length,
      current: currentRows.length,
      newCount,
      updatedCount,
      duplicateCount,
      ignoredCount,
      conflictCount,
      conflicts: conflicts.slice(0, 20),
    };
  });

  const totals = tables.reduce(
    (sum, table) => ({
      incoming: sum.incoming + table.incoming,
      current: sum.current + table.current,
      newCount: sum.newCount + table.newCount,
      updatedCount: sum.updatedCount + table.updatedCount,
      duplicateCount: sum.duplicateCount + table.duplicateCount,
      ignoredCount: sum.ignoredCount + table.ignoredCount,
      conflictCount: sum.conflictCount + table.conflictCount,
    }),
    { incoming: 0, current: 0, newCount: 0, updatedCount: 0, duplicateCount: 0, ignoredCount: 0, conflictCount: 0 },
  );

  return { mode, modules, tables, totals, relationships: [...relationships], dependencies: [...dependencies] };
}
