import { createHash } from "node:crypto";

import {
  COMPLETE_BACKUP_MODULE_TABLES,
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
