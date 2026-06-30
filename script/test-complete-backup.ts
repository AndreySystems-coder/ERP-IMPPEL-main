import assert from "node:assert/strict";

process.env.NODE_ENV = "development";

const bcrypt = await import("bcryptjs");
const { unzipSync } = await import("fflate");
const {
  COMPLETE_BACKUP_MODULE_TABLES,
  createMemoryStorage,
} = await import("../server/storage");
const {
  buildCompleteBackupPackage,
  flattenCompleteBackupData,
  validateCompleteBackupPackage,
} = await import("../server/complete-backup");
const { buildCompleteBackupArchive, parseCompleteBackupFile, parseTechnicalBackupJsonFile } = await import("../client/src/lib/completeBackupArchive");

const modules = Object.keys(COMPLETE_BACKUP_MODULE_TABLES) as Array<keyof typeof COMPLETE_BACKUP_MODULE_TABLES>;
const passwordHash = await bcrypt.hash("senha-sintetica", 4);
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const syntheticData: Record<string, any[]> = {
  roles: [{ id: 1, name: "aplicador", label: "Aplicador", permissions: JSON.stringify({ registrarMaterials: true, viewObraRegistro: true }) }],
  users: [{ id: 1, username: "AdminTeste", password: passwordHash, role: "admin", roleId: null, jobTitle: "Administrador" }, { id: 2, username: "AplicadorTeste", password: passwordHash, role: "funcionario", roleId: 1, jobTitle: "Aplicador" }],
  clients: [{ id: 1, name: "Cliente Sintetico", phone: "15000000000" }],
  leads: [{ id: 1, name: "Lead Sintetico", phone: "15000000000", status: "Aprovado" }],
  jobs: [{ id: 1, leadId: 1, clientId: 1, clientName: "Cliente Sintetico", serviceType: "Teste", status: "Aprovado" }],
  workOrders: [{ id: 1, jobId: 1, clientId: 1, clientName: "Cliente Sintetico", serviceType: "Teste", status: "Em Progresso", photos: JSON.stringify([{ category: "before", data: png }]) }],
  jobTracking: [{ id: 1, workOrderId: 1, status: "Em Progresso" }],
  obraRegistros: [{ id: 1, workOrderId: 1, tipo: "antes", fotos: JSON.stringify([{ nome: "antes.png", data: png }]) }],
  productionLogs: [{ id: 1, workOrderId: 1, userId: 2, technicianName: "AplicadorTeste", date: "2026-06-23" }],
  inventory: [
    { id: 1, name: "Material Sintetico", type: "material", quantity: 8, minStock: 2, unit: "unid" },
    { id: 2, name: "Furadeira Sintetica", type: "ferramenta", quantity: 1, minStock: 0, unit: "unid" },
  ],
  inventoryMovements: [
    { id: 1, inventoryId: 1, productName: "Material Sintetico", type: "SAÍDA", quantity: 2, date: "2026-06-23" },
    { id: 2, inventoryId: 2, productName: "Furadeira Sintetica", type: "ENTRADA", quantity: 2, date: "2026-06-23" },
  ],
  products: [{ id: 1, name: "Produto Sintetico", price: 10 }],
  materialSales: [{ id: 1, createdByUserId: 2, createdByUsername: "AplicadorTeste", buyerName: "Comprador Teste", items: JSON.stringify([{ productId: 1, inventoryId: 1, name: "Produto Sintetico", quantity: 1, unitPrice: 10, discountPercent: 0, total: 10 }]), subtotal: 10, discountAmount: 0, total: 10, status: "pendente" }],
  services: [{ id: 1, name: "Servico Sintetico", pricePerUnit: 100 }],
  materialWithdrawals: [
    { id: 1, userId: 2, username: "AplicadorTeste", workOrderId: 1, status: "pendente", withdrawalPhoto: png, withdrawalSignature: png },
    { id: 2, userId: 2, username: "AplicadorTeste", workOrderId: 1, status: "retornado", withdrawalPhoto: png, withdrawalSignature: png, returnPhoto: png, returnSignature: png },
  ],
  materialWithdrawalItems: [
    { id: 1, withdrawalId: 1, inventoryId: 1, productName: "Material Sintetico", quantity: 2 },
    { id: 2, withdrawalId: 2, inventoryId: 2, productName: "Furadeira Sintetica", quantity: 1, returnedQuantity: 1, condition: "manutencao" },
  ],
  obraConsumoLogs: [{ id: 1, workOrderId: 1, inventoryId: 1, materialName: "Material Sintetico", quantity: 1 }],
  salaryDiscounts: [{ id: 1, userId: 2, withdrawalId: 1, amount: 1, status: "pendente" }],
  payments: [{ id: 1, jobId: 1, clientName: "Cliente Sintetico", amount: 100, status: "completed" }],
  transactions: [{ id: 1, type: "entrada", category: "Teste", amount: 100, date: "2026-06-23" }],
  warranties: [{ id: 1, workOrderId: 1, jobId: 1, clientName: "Cliente Sintetico", serviceType: "Teste", startDate: "2026-06-23", endDate: "2027-06-23" }],
  warrantyIncidents: [{ id: 1, warrantyId: 1, description: "Ocorrencia sintetica" }],
  contracts: [{ id: 1, workOrderId: 1, jobId: 1, clientName: "Cliente Sintetico", signedDocumentData: "data:application/pdf;base64,JVBERi0xLjQKJSVFT0YK", signedDocumentName: "contrato-teste.pdf" }],
  npsResponses: [{ id: 1, workOrderId: 1, jobId: 1, clientName: "Cliente Sintetico", score: 10 }],
  maintenanceReminders: [{ id: 1, workOrderId: 1, jobId: 1, clientName: "Cliente Sintetico", completedDate: "2026-06-23" }],
  settings: [{ id: 1, key: "teste", value: "1" }],
  costConfig: [{ id: 1, laborDailyRate: 100 }],
  priorityRules: [{ id: 1, serviceType: "Teste", points: 1 }],
  jobStatuses: [{ id: 1, name: "Aprovado", message: "Teste", extraFileName: "anexo.pdf", extraFileData: "data:application/pdf;base64,JVBERi0xLjQKJSVFT0YK" }],
  whatsappFlows: [{ id: 1, name: "Teste", trigger: "teste", message: "Teste" }],
  whatsappSendLogs: [{ id: 1, phone: "15000000000", message: "Teste", status: "sent" }],
  whatsappTemplates: [{ id: 1, name: "Teste", category: "teste", content: "Teste" }],
  quoteTemplates: [{ id: 1, name: "Teste", isDefault: true }],
  salaryDiscountRules: [{ id: 1, name: "Teste", percentage: 1 }],
  paymentMethods: [{ id: 1, name: "Pix", active: true }],
  paymentConditions: [{ id: 1, name: "À vista", active: true }],
};

for (const tableNames of Object.values(COMPLETE_BACKUP_MODULE_TABLES)) {
  for (const tableName of tableNames) syntheticData[tableName] ||= [];
}

const source = createMemoryStorage();
await source.restoreCompleteBackup(syntheticData, modules, "replace");
const backup = await buildCompleteBackupPackage(source, { environment: "synthetic-memory-test", erpVersion: "test" });
validateCompleteBackupPackage(backup);
const corruptedBackup = structuredClone(backup);
(corruptedBackup.data.clientes.clients[0] as any).name = "Pacote adulterado";
assert.throws(() => validateCompleteBackupPackage(corruptedBackup), /checksum/, "pacote adulterado não foi recusado");

const serialized = JSON.stringify(backup);
assert.equal(serialized.includes("senha-sintetica"), false, "senha em texto puro vazou no pacote");
assert.equal(serialized.includes("postgresql://"), false, "valor de DATABASE_URL vazou no pacote");
assert.equal(serialized.includes("session-secret-sintetico"), false, "valor de SESSION_SECRET vazou no pacote");
assert.equal(backup.manifest.security.plaintextPasswordsIncluded, false);
assert.equal(backup.manifest.security.secretsIncluded, false);
assert.equal((backup.data.usuarios.users[0] as any).passwordHash.startsWith("$2"), true);

const archive = await buildCompleteBackupArchive(backup);
const files = unzipSync(archive.bytes);
const parsedArchive = await parseCompleteBackupFile(new File([new Uint8Array(archive.bytes)], "backup-sintetico.zip", { type: "application/zip" }));
assert.equal(parsedArchive.manifest.checksum.value, backup.manifest.checksum.value, "parser do ZIP alterou o checksum");
const requiredFiles = [
  "manifest.json", "usuarios.json", "cargos.json", "clientes.json", "leads.json", "orcamentos.json",
  "ordensServico.json", "registrosObra.json", "materiais.json", "estoque.json", "movimentacoes.json",
  "produtos.json", "vendasMateriais.json", "servicos.json", "financeiro.json", "garantias.json",
  "posVenda.json", "configuracoes.json", "formasPagamento.json", "condicoesPagamento.json",
  "attachments/index.json", "relatorios/relatorio-conferencia.pdf", "ERP-IMPPEL-backup-completo.json",
];
requiredFiles.forEach(path => assert.ok(files[path], `arquivo ausente no ZIP: ${path}`));
const modularProducts = await parseTechnicalBackupJsonFile(new File([new Uint8Array(files["produtos.json"])], "produtos.json", { type: "application/json" }));
assert.equal(modularProducts.type, "produtos", "JSON modular não detectou o tipo correto");
assert.deepEqual(modularProducts.tables, ["products"], "JSON modular não declarou as tabelas corretas");
await assert.rejects(() => parseCompleteBackupFile(new File([new Uint8Array(files["ERP-IMPPEL-backup-completo.json"])], "ERP-IMPPEL-backup-completo.json", { type: "application/json" })), /somente ZIP/i);
assert.ok(Object.keys(files).some(path => path.startsWith("photos/") && path.endsWith(".png")), "fotos não foram extraídas");
assert.ok(Object.keys(files).some(path => path.startsWith("signatures/") && path.endsWith(".png")), "assinaturas não foram extraídas");
assert.ok(Object.keys(files).some(path => path.startsWith("generated-pdfs/") && path.endsWith(".pdf")), "PDF armazenado não foi extraído");
const conferenceText = new TextDecoder("latin1").decode(files["relatorios/relatorio-conferencia.pdf"]);
assert.ok(conferenceText.includes("Ferramentas e Equipamentos"), "relatório do backup não inclui seção de ferramentas");
assert.ok(conferenceText.includes("Furadeira Sintetica"), "relatório do backup não lista ferramenta retornável");

const target = createMemoryStorage();
const flatData = flattenCompleteBackupData(backup, modules);
flatData.users = flatData.users.map(user => ({ ...user, password: user.passwordHash, passwordHash: undefined }));
await target.restoreCompleteBackup(flatData, modules, "replace");
const restored = await target.getCompleteBackupData();

for (const [tableName, rows] of Object.entries(syntheticData)) {
  assert.equal(restored[tableName]?.length || 0, rows.length, `contagem divergente após restauração: ${tableName}`);
}
assert.equal(restored.jobs[0].clientId, 1);
assert.equal(restored.jobs[0].leadId, 1);
assert.equal(restored.workOrders[0].jobId, 1);
assert.equal(restored.materialWithdrawalItems[0].withdrawalId, 1);
assert.equal(restored.inventoryMovements[0].inventoryId, 1);
assert.equal(restored.materialSales[0].createdByUserId, 2);
assert.equal(restored.inventory.find(row => row.id === 2)?.type, "ferramenta", "ferramenta não foi restaurada como retornável");
assert.equal(restored.materialWithdrawalItems.find(row => row.id === 2)?.condition, "manutencao", "condição da ferramenta não foi restaurada");

const partialTarget = createMemoryStorage();
await partialTarget.restoreCompleteBackup({ settings: [{ id: 99, key: "preservar", value: "sim" }] }, ["configuracoes"], "replace");
await partialTarget.restoreCompleteBackup({ inventory: [{ id: 1, name: "Antigo", quantity: 1 }], inventoryMovements: [] }, ["estoque"], "replace");
let partialSnapshot = await partialTarget.getCompleteBackupData();
assert.equal(partialSnapshot.settings[0].key, "preservar", "substituição de estoque alterou módulo não selecionado");
await partialTarget.restoreCompleteBackup({ inventory: [{ id: 1, name: "Atualizado", quantity: 9 }, { id: 2, name: "Novo", quantity: 3 }], inventoryMovements: [] }, ["estoque"], "merge");
partialSnapshot = await partialTarget.getCompleteBackupData();
assert.equal(partialSnapshot.inventory.length, 2, "merge não adicionou registro ausente");
assert.equal(partialSnapshot.inventory.find(row => row.id === 1)?.quantity, 9, "merge não atualizou registro existente");

console.log(`Backup completo validado: ${backup.manifest.includedModules.length} módulos, ${Object.keys(files).length} arquivos, ${archive.attachmentCount} anexos sintéticos.`);
