import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

export type CompleteBackupManifest = {
  format: string;
  version: string;
  erpVersion: string;
  createdAt: string;
  environment: string;
  includedModules: string[];
  notIncludedModules: string[];
  notIncluded: string[];
  counts: Record<string, number>;
  tableCounts: Record<string, number>;
  attachmentCounts: Record<string, number>;
  checksum: { algorithm: string; value: string; scope: string };
  fileChecksums?: Record<string, { algorithm: "sha256"; value: string; records?: number }>;
  security: {
    plaintextPasswordsIncluded: boolean;
    passwordHashesIncluded: boolean;
    secretsIncluded: boolean;
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
  data: Record<string, Record<string, any[]>>;
};

export const MODULE_LABELS: Record<string, string> = {
  usuarios: "Usuários e cargos",
  clientes: "Clientes",
  leads: "Leads",
  orcamentos: "Orçamentos",
  ordensServico: "Ordens de serviço",
  registrosObra: "Registros de obra e produção",
  controleMateriais: "Controle de materiais",
  estoque: "Estoque e movimentações",
  catalogoMateriais: "Catálogo de materiais/produtos",
  vendasMateriais: "Venda de materiais",
  catalogoServicos: "Catálogo de serviços",
  financeiro: "Financeiro",
  garantias: "Garantias, incidentes e contratos",
  posVenda: "Pós-venda e NPS",
  configuracoes: "Configurações e templates",
  formasPagamento: "Formas de pagamento",
  condicoesPagamento: "Condições de pagamento",
};

export const TABLE_LABELS: Record<string, string> = {
  users: "Usuários",
  roles: "Cargos",
  clients: "Clientes",
  leads: "Leads/CRM",
  jobs: "Orçamentos",
  workOrders: "Ordens de serviço",
  jobTracking: "Acompanhamento de OS",
  obraRegistros: "Registros de obra",
  productionLogs: "Produção",
  materialWithdrawals: "Retiradas/saídas",
  materialWithdrawalItems: "Itens retirados",
  obraConsumoLogs: "Consumo em obra",
  salaryDiscounts: "Responsabilidades/descontos",
  inventory: "Estoque atual",
  inventoryMovements: "Movimentações de estoque",
  products: "Catálogo de materiais/produtos",
  materialSales: "Pedidos e vendas de materiais",
  services: "Catálogo de serviços",
  payments: "Pagamentos",
  transactions: "Movimentações financeiras",
  warranties: "Garantias",
  warrantyIncidents: "Ocorrências de garantia",
  contracts: "Contratos",
  npsResponses: "NPS",
  maintenanceReminders: "Lembretes de pós-venda",
  settings: "Configurações",
  costConfig: "Custos e margens",
  priorityRules: "Regras de prioridade",
  jobStatuses: "Status e anexos",
  whatsappFlows: "Fluxos WhatsApp",
  whatsappSendLogs: "Histórico WhatsApp",
  whatsappTemplates: "Templates WhatsApp",
  quoteTemplates: "Templates de orçamento",
  salaryDiscountRules: "Regras de desconto",
  paymentMethods: "Formas de pagamento",
  paymentConditions: "Condições de pagamento",
};

type TechnicalFile = { path: string; data: unknown; records: number };
type ExtractedAttachment = { path: string; source: string; mimeType: string; bytes: Uint8Array };

function array(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function technicalPayload(backup: CompleteBackupPackage, name: string, data: unknown) {
  return { type: name, version: backup.version, exportedAt: backup.exportedAt, data };
}

function countNested(value: unknown) {
  if (Array.isArray(value)) return value.length;
  if (!value || typeof value !== "object") return 0;
  return Object.values(value).reduce((sum, item) => sum + (Array.isArray(item) ? item.length : 0), 0);
}

export function buildTechnicalFiles(backup: CompleteBackupPackage): TechnicalFile[] {
  const users = array(backup.data.usuarios?.users);
  const roles = array(backup.data.usuarios?.roles);
  const withdrawals = array(backup.data.controleMateriais?.materialWithdrawals);
  const withdrawalItems = array(backup.data.controleMateriais?.materialWithdrawalItems);
  const materialData = backup.data.controleMateriais || {};
  const inventoryData = backup.data.estoque || {};
  const warrantyData = backup.data.garantias || {};

  const definitions: Array<[string, string, unknown]> = [
    ["usuarios.json", "usuarios", { users }],
    ["cargos.json", "cargos", { roles }],
    ["clientes.json", "clientes", backup.data.clientes || {}],
    ["leads.json", "leads", backup.data.leads || {}],
    ["orcamentos.json", "orcamentos", backup.data.orcamentos || {}],
    ["ordens-servico.json", "ordens-servico", backup.data.ordensServico || {}],
    ["registros-obra.json", "registros-obra", backup.data.registrosObra || {}],
    ["controle-materiais.json", "controle-materiais", materialData],
    ["saidas-aberto.json", "saidas-aberto", { withdrawals: withdrawals.filter(row => row.status !== "retornado"), withdrawalItems }],
    ["devolucoes.json", "devolucoes", { withdrawals: withdrawals.filter(row => row.status === "retornado" || row.returnedAt), withdrawalItems }],
    ["responsabilidades.json", "responsabilidades", { withdrawals, withdrawalItems, salaryDiscounts: array(materialData.salaryDiscounts) }],
    ["estoque.json", "estoque", { inventory: array(inventoryData.inventory) }],
    ["movimentacoes-estoque.json", "movimentacoes-estoque", { inventoryMovements: array(inventoryData.inventoryMovements) }],
    ["catalogo-materiais.json", "catalogo-materiais", backup.data.catalogoMateriais || {}],
    ["vendas-materiais.json", "vendas-materiais", backup.data.vendasMateriais || {}],
    ["catalogo-servicos.json", "catalogo-servicos", backup.data.catalogoServicos || {}],
    ["financeiro.json", "financeiro", backup.data.financeiro || {}],
    ["garantias.json", "garantias", { warranties: array(warrantyData.warranties), warrantyIncidents: array(warrantyData.warrantyIncidents), contracts: array(warrantyData.contracts) }],
    ["pos-venda.json", "pos-venda", backup.data.posVenda || {}],
    ["configuracoes.json", "configuracoes", backup.data.configuracoes || {}],
    ["formas-pagamento.json", "formas-pagamento", backup.data.formasPagamento || {}],
    ["condicoes-pagamento.json", "condicoes-pagamento", backup.data.condicoesPagamento || {}],
  ];

  return definitions.map(([path, name, data]) => ({
    path,
    data: technicalPayload(backup, name, data),
    records: countNested(data),
  }));
}

function sanitizeFileName(value: unknown, fallback: string) {
  const cleaned = String(value || fallback)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || fallback;
}

function decodeStoredFile(value: unknown, fallbackExtension = "bin") {
  if (typeof value !== "string" || !value.trim()) return null;
  const match = value.match(/^data:([^;,]+)?(?:;[^,]*)?;base64,(.+)$/s);
  const mimeType = match?.[1] || "application/octet-stream";
  const encoded = match?.[2] || value;
  try {
    const binary = atob(encoded.replace(/\s/g, ""));
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const extension = mimeType.includes("png") ? "png"
      : mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg"
      : mimeType.includes("webp") ? "webp"
      : mimeType.includes("pdf") ? "pdf"
      : fallbackExtension;
    return { bytes, mimeType, extension };
  } catch {
    return null;
  }
}

function parsePhotos(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try { return array(JSON.parse(value)); } catch { return []; }
}

export function extractStoredAttachments(backup: CompleteBackupPackage): ExtractedAttachment[] {
  const result: ExtractedAttachment[] = [];
  const add = (folder: string, source: string, value: unknown, name: string) => {
    const decoded = decodeStoredFile(value);
    if (!decoded) return;
    const baseName = sanitizeFileName(name, "arquivo").replace(/\.[^.]+$/, "");
    const targetFolder = decoded.mimeType.includes("pdf") ? "generated-pdfs" : folder;
    result.push({ path: `${targetFolder}/${baseName}.${decoded.extension}`, source, mimeType: decoded.mimeType, bytes: decoded.bytes });
  };

  for (const workOrder of array(backup.data.ordensServico?.workOrders)) {
    parsePhotos(workOrder.photos).forEach((photo: any, index) => add(
      "photos",
      `workOrders#${workOrder.id}.photos[${index}]`,
      photo?.data,
      `os-${workOrder.id}-${photo?.category || "foto"}-${index + 1}`,
    ));
  }
  for (const record of array(backup.data.registrosObra?.obraRegistros)) {
    parsePhotos(record.fotos).forEach((photo: any, index) => add(
      "photos",
      `obraRegistros#${record.id}.fotos[${index}]`,
      photo?.data || photo?.base64,
      `registro-obra-${record.id}-${photo?.category || "foto"}-${index + 1}`,
    ));
  }
  for (const withdrawal of array(backup.data.controleMateriais?.materialWithdrawals)) {
    add("photos", `materialWithdrawals#${withdrawal.id}.withdrawalPhoto`, withdrawal.withdrawalPhoto, `retirada-${withdrawal.id}-foto`);
    add("photos", `materialWithdrawals#${withdrawal.id}.returnPhoto`, withdrawal.returnPhoto, `devolucao-${withdrawal.id}-foto`);
    add("signatures", `materialWithdrawals#${withdrawal.id}.withdrawalSignature`, withdrawal.withdrawalSignature, `retirada-${withdrawal.id}-assinatura`);
    add("signatures", `materialWithdrawals#${withdrawal.id}.returnSignature`, withdrawal.returnSignature, `devolucao-${withdrawal.id}-assinatura`);
  }
  for (const contract of array(backup.data.garantias?.contracts)) {
    add("attachments", `contracts#${contract.id}.signedDocumentData`, contract.signedDocumentData, `contrato-${contract.id}-${contract.signedDocumentName || "documento"}`);
  }
  for (const status of array(backup.data.configuracoes?.jobStatuses)) {
    add("attachments", `jobStatuses#${status.id}.extraFileData`, status.extraFileData, `status-${status.id}-${status.extraFileName || "anexo"}`);
  }

  return result;
}

async function sha256Hex(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? strToU8(value) : value;
  const copy = new Uint8Array(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function buildConferencePdf(backup: CompleteBackupPackage) {
  const doc = new jsPDF();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("ERP IMPPEL - Conferência do Backup Completo", 14, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Gerado em: ${new Date(backup.manifest.createdAt).toLocaleString("pt-BR")}`, 14, 25);
  doc.text(`Versão: ${backup.manifest.version} | Ambiente: ${backup.manifest.environment}`, 14, 31);
  autoTable(doc, {
    startY: 38,
    head: [["Módulo", "Registros"]],
    body: backup.manifest.includedModules.map(name => [MODULE_LABELS[name] || name, String(backup.manifest.counts[name] || 0)]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 58, 138] },
  });
  const y = Math.min(((doc as any).lastAutoTable?.finalY || 40) + 10, 260);
  doc.setFont("helvetica", "bold");
  doc.text("Atenção", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Este PDF é somente para conferência. A restauração usa o ZIP e os arquivos JSON técnicos.", 14, y + 6);
  return new Uint8Array(doc.output("arraybuffer"));
}

export async function buildCompleteBackupArchive(backup: CompleteBackupPackage) {
  validatePackageShape(backup);
  const files: Record<string, Uint8Array> = {};
  const checksums: NonNullable<CompleteBackupManifest["fileChecksums"]> = {};

  for (const technicalFile of buildTechnicalFiles(backup)) {
    const bytes = strToU8(JSON.stringify(technicalFile.data, null, 2));
    files[technicalFile.path] = bytes;
    checksums[technicalFile.path] = { algorithm: "sha256", value: await sha256Hex(bytes), records: technicalFile.records };
  }

  const attachments = extractStoredAttachments(backup);
  for (const attachment of attachments) {
    files[attachment.path] = attachment.bytes;
    checksums[attachment.path] = { algorithm: "sha256", value: await sha256Hex(attachment.bytes), records: 1 };
  }
  const attachmentIndex = strToU8(JSON.stringify(attachments.map(({ path, source, mimeType }) => ({ path, source, mimeType })), null, 2));
  files["attachments/index.json"] = attachmentIndex;
  checksums["attachments/index.json"] = { algorithm: "sha256", value: await sha256Hex(attachmentIndex), records: attachments.length };

  const conferencePdf = buildConferencePdf(backup);
  files["relatorios/relatorio-conferencia.pdf"] = conferencePdf;
  checksums["relatorios/relatorio-conferencia.pdf"] = { algorithm: "sha256", value: await sha256Hex(conferencePdf), records: 1 };

  files["photos/LEIA-ME.txt"] = strToU8("Fotos armazenadas no banco aparecem nesta pasta e continuam embutidas no JSON técnico para restauração.\r\n");
  files["signatures/LEIA-ME.txt"] = strToU8("Assinaturas armazenadas no banco aparecem nesta pasta. Trate estes arquivos como dados privados.\r\n");
  files["generated-pdfs/LEIA-ME.txt"] = strToU8("Somente PDFs armazenados no banco entram aqui. PDFs apenas baixados pelo navegador precisam ser guardados separadamente.\r\n");

  const manifest = { ...backup.manifest, fileChecksums: checksums };
  const enrichedBackup = { ...backup, manifest };
  files["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));
  files["ERP-IMPPEL-backup-completo.json"] = strToU8(JSON.stringify(enrichedBackup, null, 2));
  files["LEIA-ME.txt"] = strToU8([
    "BACKUP COMPLETO ERP IMPPEL",
    "Arquivo privado. Nao envie ao GitHub.",
    "Restaure pelo ERP em Backups > Restauracao usando este ZIP.",
    "Confira manifest.json e relatorios/relatorio-conferencia.pdf antes de apagar qualquer ambiente.",
    "PDFs gerados apenas no navegador e arquivos externos ao banco nao entram automaticamente.",
  ].join("\r\n"));

  return { bytes: zipSync(files, { level: 6 }), backup: enrichedBackup, attachmentCount: attachments.length };
}

function validatePackageShape(value: any): asserts value is CompleteBackupPackage {
  if (value?.type !== "erp-completo" || value?.manifest?.format !== "imppel-erp-complete-backup" || !value?.data) {
    throw new Error("Arquivo inválido: manifesto completo do ERP não encontrado.");
  }
  if (value.manifest.security?.plaintextPasswordsIncluded || value.manifest.security?.secretsIncluded) {
    throw new Error("Pacote recusado: o manifesto indica senha em texto puro ou segredo de ambiente.");
  }
}

async function validateDataChecksum(backup: CompleteBackupPackage) {
  const actual = await sha256Hex(JSON.stringify(backup.data));
  if (!backup.manifest.checksum?.value || actual !== backup.manifest.checksum.value) {
    throw new Error("Falha de integridade: checksum dos dados não confere.");
  }
}

export async function parseCompleteBackupFile(file: File): Promise<CompleteBackupPackage> {
  if (!file.name.toLowerCase().endsWith(".zip")) {
    const backup = JSON.parse(await file.text());
    validatePackageShape(backup);
    await validateDataChecksum(backup);
    return backup;
  }

  const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const packageFile = files["ERP-IMPPEL-backup-completo.json"];
  if (!packageFile) throw new Error("O ZIP não contém o arquivo técnico completo do ERP.");
  const backup = JSON.parse(strFromU8(packageFile));
  validatePackageShape(backup);
  await validateDataChecksum(backup);

  for (const [path, expected] of Object.entries(backup.manifest.fileChecksums || {})) {
    const bytes = files[path];
    if (!bytes) throw new Error(`Falha de integridade: arquivo ausente no ZIP (${path}).`);
    if (await sha256Hex(bytes) !== expected.value) {
      throw new Error(`Falha de integridade: checksum inválido (${path}).`);
    }
  }
  return backup;
}
