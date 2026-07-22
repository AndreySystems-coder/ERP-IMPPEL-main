import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

process.env.NODE_ENV = "development";

const { createMemoryStorage } = await import("../server/storage");
const { ensureDefaultAdmin } = await import("../server/admin-bootstrap");
const {
  createMaterialRestoreFingerprint,
  isHistoricalMaterialResponsible,
  resolveMaterialRestoreItems,
} = await import("../server/material-restore-service");
const {
  applyMaterialPdfImportRows,
  buildMaterialPdfImportPreview,
} = await import("../server/material-pdf-import-service");
const { canAccess, getDefaultLandingPath } = await import("../client/src/lib/permissions");
const { generateInitialPassword } = await import("../shared/operationalUsers");
const { isMaterialWithdrawalPending, isReturnableMaterialItem, isConsumableMaterialItem, shouldRestoreReturnedQuantityToStock } = await import("../shared/materialReturnPolicy");
const { getEffectiveMaterialSaleDiscountLimit } = await import("../shared/materialSalesPolicy");
const { buildReturnableToolSummary } = await import("../shared/returnableToolSummary");
const { buildMobileNotesPreview } = await import("../shared/mobileNotesImport");
const { buildMaterialControlContract } = await import("../shared/materialControlBackup");
const { __testPdfRestoreParsing } = await import("../server/pdf-restore");

const previousAdminUsername = process.env.DEFAULT_ADMIN_USERNAME;
const previousAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
process.env.DEFAULT_ADMIN_USERNAME = "Admin";
process.env.DEFAULT_ADMIN_PASSWORD = "senha-admin-sintetica";

const emptyAdminStorage = createMemoryStorage();
const firstBootstrap = await ensureDefaultAdmin(emptyAdminStorage);
assert.equal(firstBootstrap.action, "created", "banco vazio deve criar Admin automaticamente");
assert.equal((await emptyAdminStorage.getUsers()).length, 1, "bootstrap não pode criar usuários extras");
assert.equal(await bcrypt.compare("senha-admin-sintetica", (await emptyAdminStorage.getUsers())[0].password), true, "senha do Admin deve ser bcrypt");
for (let index = 0; index < 10; index++) await ensureDefaultAdmin(emptyAdminStorage);
assert.equal((await emptyAdminStorage.getUsers()).length, 1, "startups repetidos não podem duplicar Admin");

const commonUserStorage = createMemoryStorage();
await commonUserStorage.createUser({ username: "aplicador.teste", password: "legado", role: "funcionario" } as any);
const commonBootstrap = await ensureDefaultAdmin(commonUserStorage);
assert.equal(commonBootstrap.action, "created", "banco com usuários comuns deve criar somente o Admin ausente");
assert.equal((await commonUserStorage.getUsers()).filter(user => user.username === "Admin").length, 1, "Admin deve existir uma única vez");
assert.equal((await commonUserStorage.getUsers()).filter(user => user.username === "aplicador.teste").length, 1, "bootstrap não pode apagar usuário comum");

const existingAdminStorage = createMemoryStorage();
await existingAdminStorage.createUser({ username: "admin", password: await bcrypt.hash("senha-existente", 4), role: "funcionario", fullName: "Outro Nome", status: "ativo" } as any);
const existingBootstrap = await ensureDefaultAdmin(existingAdminStorage);
const canonicalAdmin = (await existingAdminStorage.getUsers())[0];
assert.equal(existingBootstrap.action, "updated", "Admin legado deve ser normalizado sem duplicar");
assert.equal(canonicalAdmin.username, "Admin", "username do Admin deve ser canonicalizado");
assert.equal(canonicalAdmin.role, "admin", "role do Admin deve ser admin");
assert.equal(await bcrypt.compare("senha-existente", canonicalAdmin.password), true, "bootstrap não deve redefinir hash existente");

if (previousAdminUsername === undefined) delete process.env.DEFAULT_ADMIN_USERNAME;
else process.env.DEFAULT_ADMIN_USERNAME = previousAdminUsername;
if (previousAdminPassword === undefined) delete process.env.DEFAULT_ADMIN_PASSWORD;
else process.env.DEFAULT_ADMIN_PASSWORD = previousAdminPassword;

const storage = createMemoryStorage();
const inventory = await storage.createInventoryItem({ name: "Primer teste", type: "material", unit: "un", quantity: 5, minStock: 1, pricePerUnit: 10 });
const exactInventory = await storage.createInventoryItem({ name: "Viapol Manta Torodin 4 mm", type: "material", unit: "un", quantity: 10, minStock: 1, pricePerUnit: 0 });
const normalizedInventory = await storage.createInventoryItem({ name: "Impertela 1,05x50", type: "material", unit: "un", quantity: 5, minStock: 1, pricePerUnit: 0 });
const materialResolution = resolveMaterialRestoreItems(await storage.getInventoryItems(), [
  { productName: "Viapol Manta Torodin 4 mm", quantity: 2 },
  { productName: "Impertela 1,05 x 50", quantity: 1 },
  { productName: "Material inexistente", quantity: 1 },
]);
assert.equal(materialResolution.resolved.length, 2, "materiais devem resolver por nome exato e normalizado");
assert.equal(materialResolution.resolved[0].inventoryId, exactInventory.id, "nome exato deve resolver inventoryId válido");
assert.equal(materialResolution.resolved[1].inventoryId, normalizedInventory.id, "nome normalizado deve resolver inventoryId válido");
assert.deepEqual(materialResolution.unresolved, ["Material inexistente"], "material sem correspondência deve ficar bloqueado para revisão");
assert.equal(isHistoricalMaterialResponsible("Não trabalha para nós"), true, "responsável histórico deve ser identificado sem criar login");
assert.equal((await storage.getUsers()).some(user => user.username === "Não trabalha para nós"), false, "responsável histórico não pode virar conta de acesso");
const fingerprintOne = createMaterialRestoreFingerprint({
  backupType: "controle-materiais",
  sourceHash: "ca8ed68c167f",
  date: "2026-06-30",
  operationType: "retirada-item",
  responsible: "alexsandro.santos",
  items: materialResolution.resolved,
  origin: "Registro Rapido",
  observation: "Lequinho - raspador",
});
const fingerprintTwo = createMaterialRestoreFingerprint({
  backupType: "controle-materiais",
  sourceHash: "ca8ed68c167f",
  date: "2026-06-30",
  operationType: "retirada-item",
  responsible: "alexsandro.santos",
  items: [...materialResolution.resolved].reverse(),
  origin: "Registro Rapido",
  observation: "Lequinho - raspador",
});
assert.equal(fingerprintOne, fingerprintTwo, "fingerprint deve ser determinístico independentemente da ordem dos itens");
await storage.createInventoryMovement({
  inventoryId: exactInventory.id,
  productName: exactInventory.name,
  type: "SAÍDA",
  quantity: 2,
  date: "2026-06-30",
  notes: `RESTORE HISTORICO fingerprint:${fingerprintOne}`,
}, { applyToStock: false });
assert.equal((await storage.getInventoryItems()).find(item => item.id === exactInventory.id)?.quantity, 10, "movimento histórico de restore não deve alterar saldo já restaurado pelo Estoque");

const materialPdfStorage = createMemoryStorage();
const pdfUser = await materialPdfStorage.createUser({ username: "wellington.pires", password: "x", role: "funcionario", fullName: "Wellington Pires" } as any);
const pdfFuradeira = await materialPdfStorage.createInventoryItem({ name: "Furadeira", type: "ferramenta", unit: "un", quantity: 3, minStock: 0, pricePerUnit: 0 });
const pdfExtensao = await materialPdfStorage.createInventoryItem({ name: "Extensão elétrica", type: "ferramenta", unit: "un", quantity: 2, minStock: 0, pricePerUnit: 0 });
const materialPdfBackup = {
  withdrawals: [{
    sourceHash: "pdf-row-1",
    withdrawalDate: "2026-06-30",
    username: "wellington.pires",
    notes: "OS 15",
    status: "pendente",
    items: [
      { productName: "Furadeira", quantity: 1 },
      { productName: "Sika Re tipo III 4mm", quantity: 1 },
    ],
  }],
  entries: [{ sourceHash: "pdf-row-2", date: "2026-06-30", notes: "Compra", items: [{ productName: "Extensão elétrica", quantity: 1 }] }],
  consumption: [{ sourceHash: "pdf-row-3", date: "2026-06-30", notes: "Consumo", items: [{ productName: "Responsável", quantity: 0 }] }],
};
const materialPdfPreview = buildMaterialPdfImportPreview(materialPdfBackup, {
  inventory: await materialPdfStorage.getInventoryItems(),
  users: await materialPdfStorage.getUsers(),
  aliases: await materialPdfStorage.getMobileImportAliases(),
  existingWithdrawals: await materialPdfStorage.getMaterialWithdrawals(),
  existingMovements: await materialPdfStorage.getInventoryMovements(),
});
assert.equal(materialPdfPreview.summary.total, 3, "preview PDF de materiais deve manter registros estruturados");
assert.equal(materialPdfPreview.summary.ready, 1, "entrada com material reconhecido deve ficar pronta");
assert.equal(materialPdfPreview.summary.pending, 2, "material desconhecido e item invalido devem ficar pendentes");
assert.equal(materialPdfPreview.rows.some(row => row.rawItem === "Sika Re tipo III 4mm" && !row.inventoryId), true, "Sika Re tipo III 4mm deve exigir seleção manual");
const resolvedPdfRows = materialPdfPreview.rows.map(row => {
  if (row.rawItem === "Sika Re tipo III 4mm") {
    return { ...row, inventoryId: pdfExtensao.id, itemName: pdfExtensao.name, itemConfidence: 100, status: "ok", warnings: [] };
  }
  if (row.rawItem === "Responsável") return { ...row, ignored: true, status: "ignorado" };
  return row;
});
const materialPdfApply = await applyMaterialPdfImportRows({
  rows: resolvedPdfRows,
  storage: materialPdfStorage,
  sessionUserId: pdfUser.id,
  applyToStock: false,
});
assert.equal(materialPdfApply.summary.retiradasCriadas, 1, "PDF resolvido deve criar retirada pelo fluxo compartilhado");
assert.equal(materialPdfApply.summary.movimentacoesCriadas, 3, "PDF resolvido deve criar movimentos historicos de retirada e entrada");
assert.equal(materialPdfApply.summary.aliasesSalvos, 1, "aliases repetidos na mesma importacao devem ser deduplicados por batch");
assert.equal((await materialPdfStorage.getMobileImportAliases()).filter(alias => alias.alias === "wellington.pires").length, 1, "mesmo responsavel repetido no PDF nao pode criar alias duplicado");
assert.equal((await materialPdfStorage.getInventoryItems()).find(item => item.id === pdfFuradeira.id)?.quantity, 3, "restore historico por PDF nao deve alterar saldo da ferramenta");
const materialPdfDuplicatePreview = buildMaterialPdfImportPreview(materialPdfBackup, {
  inventory: await materialPdfStorage.getInventoryItems(),
  users: await materialPdfStorage.getUsers(),
  aliases: await materialPdfStorage.getMobileImportAliases(),
  existingWithdrawals: await materialPdfStorage.getMaterialWithdrawals(),
  existingMovements: await materialPdfStorage.getInventoryMovements(),
});
assert.equal(materialPdfDuplicatePreview.summary.duplicates >= 1, true, "segunda importacao do mesmo PDF deve sinalizar duplicidade semantica");

const product = await storage.createProduct({ name: "Primer teste", inventoryId: inventory.id, unit: "un", salePrice: 20, maxDiscount: 10, active: true });
const sale = await storage.createMaterialSale({
  createdByUserId: 2,
  createdByUsername: "aplicador",
  buyerName: "Cliente teste",
  items: JSON.stringify([{ productId: product.id, inventoryId: inventory.id, name: product.name, quantity: 2, unitPrice: 20, discountPercent: 5, total: 38 }]),
  subtotal: 40,
  discountAmount: 2,
  total: 38,
  status: "pendente",
});

const saleMovementBaseline = (await storage.getInventoryMovements()).length;
const approved = await storage.approveMaterialSale(sale.id, { id: 1, username: "admin" });
assert.equal(approved?.status, "aprovada");
assert.equal((await storage.getInventoryItems())[0].quantity, 3);
assert.equal((await storage.getInventoryMovements()).length, saleMovementBaseline + 1);
await storage.approveMaterialSale(sale.id, { id: 1, username: "admin" });
assert.equal((await storage.getInventoryMovements()).length, saleMovementBaseline + 1, "aprovação repetida duplicou a baixa");
assert.equal(getEffectiveMaterialSaleDiscountLimit({ maxDiscount: 0 }, 10), 10, "produto sem limite proprio deve usar limite geral");
assert.equal(getEffectiveMaterialSaleDiscountLimit({ maxDiscount: null }, 10), 10, "produto sem limite configurado deve usar limite geral");
assert.equal(getEffectiveMaterialSaleDiscountLimit({ maxDiscount: 5 }, 10), 5, "limite proprio menor deve prevalecer");

const lowStock = await storage.createInventoryItem({ name: "Produto sem estoque suficiente", type: "material", unit: "un", quantity: 1, minStock: 0, pricePerUnit: 5 });
const lowStockProduct = await storage.createProduct({ name: "Produto sem estoque suficiente", inventoryId: lowStock.id, unit: "un", salePrice: 15, maxDiscount: 0, active: true });
const blockedSale = await storage.createMaterialSale({
  createdByUserId: 2,
  createdByUsername: "aplicador",
  buyerName: "Cliente bloqueio",
  items: JSON.stringify([{ productId: lowStockProduct.id, inventoryId: lowStock.id, name: lowStockProduct.name, quantity: 2, unitPrice: 15, discountPercent: 0, total: 30 }]),
  subtotal: 30,
  discountAmount: 0,
  total: 30,
  status: "pendente",
});
await assert.rejects(
  () => storage.approveMaterialSale(blockedSale.id, { id: 1, username: "admin" }),
  /Estoque insuficiente/,
  "venda acima do estoque nao pode baixar saldo",
);
assert.equal((await storage.getInventoryItems()).find(item => item.id === lowStock.id)?.quantity, 1, "saldo deve permanecer intacto quando venda e bloqueada");

const duplicatedStock = await storage.createInventoryItem({ name: "Produto duplicado no carrinho", type: "material", unit: "un", quantity: 1, minStock: 0, pricePerUnit: 5 });
const duplicatedProduct = await storage.createProduct({ name: "Produto duplicado no carrinho", inventoryId: duplicatedStock.id, unit: "un", salePrice: 15, maxDiscount: 0, active: true });
const duplicatedSale = await storage.createMaterialSale({
  createdByUserId: 2,
  createdByUsername: "aplicador",
  buyerName: "Cliente duplicado",
  items: JSON.stringify([
    { productId: duplicatedProduct.id, inventoryId: duplicatedStock.id, name: duplicatedProduct.name, quantity: 1, unitPrice: 15, discountPercent: 0, total: 15 },
    { productId: duplicatedProduct.id, inventoryId: duplicatedStock.id, name: duplicatedProduct.name, quantity: 1, unitPrice: 15, discountPercent: 0, total: 15 },
  ]),
  subtotal: 30,
  discountAmount: 0,
  total: 30,
  status: "pendente",
});
await assert.rejects(
  () => storage.approveMaterialSale(duplicatedSale.id, { id: 1, username: "admin" }),
  /Estoque insuficiente/,
  "linhas duplicadas da mesma venda nao podem gerar estoque negativo",
);
assert.equal((await storage.getInventoryItems()).find(item => item.id === duplicatedStock.id)?.quantity, 1, "saldo deve permanecer intacto quando itens duplicados excedem estoque");

assert.equal(generateInitialPassword("24/12/1996"), "24121996", "senha fixa operacional deve usar DDMMAAAA");
assert.equal(isConsumableMaterialItem({ productName: "Viaplus 1000" }), true, "Viaplus deve ser consumivel");
const returnableToolNames = ["Aplicador de PU", "Marreta", "Talhadeira", "Lixadeira", "Furadeira", "Batedor para furadeira", "Mangueira", "Extensao", "Bomba de agua", "Soprador", "Vassoura"];
for (const toolName of returnableToolNames) {
  assert.equal(isReturnableMaterialItem({ productName: toolName, type: "ferramenta" }), true, `${toolName} deve ser retornavel`);
}
assert.equal(isReturnableMaterialItem({ productName: "Ferramenta marreta" }), true, "ferramenta deve ser retornavel");
assert.equal(isMaterialWithdrawalPending({ status: "consumido", items: [{ productName: "Viaplus 1000" }] }), false, "consumivel nao deve ficar pendente");
assert.equal(isMaterialWithdrawalPending({ status: "pendente", items: [{ productName: "Ferramenta marreta" }] }), true, "retornavel deve ficar pendente ate devolucao");
assert.equal(shouldRestoreReturnedQuantityToStock("bom"), true, "bom estado deve voltar ao disponivel");
assert.equal(shouldRestoreReturnedQuantityToStock("danificado"), false, "danificado nao deve voltar ao disponivel");
assert.equal(shouldRestoreReturnedQuantityToStock("perdido"), false, "perdido nao deve voltar ao disponivel");
assert.equal(shouldRestoreReturnedQuantityToStock("manutencao"), false, "manutencao nao deve voltar ao disponivel");

const toolForReturn = await storage.createInventoryItem({ name: "Ferramenta teste retorno", type: "ferramenta", unit: "un", quantity: 1, minStock: 0, pricePerUnit: 0 });
const withdrawalForReturn = await storage.createMaterialWithdrawal({
  userId: 2,
  username: "aplicador",
  status: "pendente",
  withdrawalDate: "2026-06-30",
  withdrawalPhoto: "foto",
  withdrawalSignature: "assinatura",
}, [{
  inventoryId: toolForReturn.id,
  productName: toolForReturn.name,
  unit: "un",
  quantity: 2,
  returnedQuantity: 0,
  condition: "bom",
}]);
await storage.updateMaterialWithdrawalItems(withdrawalForReturn.id, [{ id: withdrawalForReturn.items[0].id, returnedQuantity: 2, condition: "manutencao" }]);
await storage.updateMaterialWithdrawal(withdrawalForReturn.id, { status: "retornado" } as any);
const returnedWithdrawal = await storage.getMaterialWithdrawal(withdrawalForReturn.id);
assert.equal(returnedWithdrawal?.status, "retornado", "retirada com todos os itens devolvidos deve ficar retornado");
assert.equal(returnedWithdrawal?.items[0].returnedQuantity, 2, "quantidade devolvida deve persistir no item");
assert.equal(returnedWithdrawal?.items[0].condition, "manutencao", "condicao da ferramenta deve persistir no item");

const furadeiraSummary = buildReturnableToolSummary(
  { id: 101, name: "Furadeira", type: "ferramenta", quantity: 2 },
  [{ status: "pendente", items: [{ inventoryId: 101, productName: "Furadeira", quantity: 1, returnedQuantity: 0, condition: "bom" }] }],
);
assert.deepEqual(
  { total: furadeiraSummary.total, available: furadeiraSummary.available, inField: furadeiraSummary.inField },
  { total: 3, available: 2, inField: 1 },
  "furadeira retirada deve mostrar total 3, disponivel 2 e em campo 1",
);

const furadeiraReturnedSummary = buildReturnableToolSummary(
  { id: 101, name: "Furadeira", type: "ferramenta", quantity: 3 },
  [{ status: "retornado", items: [{ inventoryId: 101, productName: "Furadeira", quantity: 1, returnedQuantity: 1, condition: "bom" }] }],
);
assert.deepEqual(
  { total: furadeiraReturnedSummary.total, available: furadeiraReturnedSummary.available, inField: furadeiraReturnedSummary.inField },
  { total: 3, available: 3, inField: 0 },
  "furadeira boa devolvida deve voltar para disponivel",
);

const marretaSummary = buildReturnableToolSummary(
  { id: 102, name: "Marreta", type: "ferramenta", quantity: 1 },
  [{ status: "retornado", items: [{ inventoryId: 102, productName: "Marreta", quantity: 1, returnedQuantity: 1, condition: "danificado" }] }],
);
assert.deepEqual(
  { total: marretaSummary.total, available: marretaSummary.available, damaged: marretaSummary.damaged, inField: marretaSummary.inField },
  { total: 2, available: 1, damaged: 1, inField: 0 },
  "marreta danificada nao deve voltar ao disponivel",
);

const extensaoSummary = buildReturnableToolSummary(
  { id: 103, name: "Extensao", type: "ferramenta", quantity: 1 },
  [{ status: "retornado", items: [{ inventoryId: 103, productName: "Extensao", quantity: 1, returnedQuantity: 1, condition: "perdido" }] }],
);
assert.deepEqual(
  { total: extensaoSummary.total, available: extensaoSummary.available, lost: extensaoSummary.lost, inField: extensaoSummary.inField },
  { total: 2, available: 1, lost: 1, inField: 0 },
  "extensao perdida deve encerrar pendencia sem entrada no disponivel",
);

const viaplusSummary = buildReturnableToolSummary(
  { id: 104, name: "Viaplus 1000", type: "material", quantity: 8 },
  [{ status: "consumido", items: [{ inventoryId: 104, productName: "Viaplus 1000", quantity: 2, returnedQuantity: 0, condition: null }] }],
);
assert.deepEqual(
  { total: viaplusSummary.total, available: viaplusSummary.available, inField: viaplusSummary.inField },
  { total: 8, available: 8, inField: 0 },
  "viaplus consumivel nao deve criar pendencia de devolucao",
);

const mobileInventory = [
  "barra de asfalto", "drykomanta pp 4mm", "Viaplus 1000", "Viabit", "raspador", "Extensao", "soprador", "pincel", "suporte", "rolo de la",
  "Viaplus 7000", "Viafix", "Torodin 3mm", "cabo", "escada de montar", "Furadeira", "Batedor", "Marreta", "Talhadeira", "Vassoura", "colher de pedreiro", "broxa", "Torodin 4mm",
].map((name, index) => ({
  id: 300 + index,
  name,
  type: /furadeira|batedor|marreta|talhadeira|vassoura|extensao|soprador|raspador|escada|cabo/i.test(name) ? "ferramenta" : "material",
  unit: "un",
  quantity: 250,
}));
const mobilePreview = buildMobileNotesPreview({
  importYear: 2026,
  inventory: mobileInventory,
  users: [
    { id: 501, username: "leandro", fullName: "Leandro Aplicador", role: "funcionario" },
    { id: 502, username: "paulo", fullName: "Paulo Aplicador", role: "funcionario" },
    { id: 503, username: "jhones", fullName: "Jhones Aplicador", role: "funcionario" },
    { id: 504, username: "bruno", fullName: "Bruno Santos", role: "funcionario" },
  ],
  aliases: [{ alias: "Lequinho", userId: 501, username: "leandro" }],
  text: `30/06
10x barra de asfalto
2x drykomanta pp 4mm
3x 1000
1x viabit
Lequinho - raspador, extensão, soprador
1x pincel
1x suporte
1x rolo de lã

24/06
+ 192x 1000
+ 128x 7000
+ 10x viafix
+ 30x torodin 3mm

23/06
Paulo - cabo, escada de montar
Jhones - furadeira, batedor, 2x extensão, marreta, talhadeira, vassoura
Bruno - colher de pedreiro
3x broxa
2x torodin 4mm
2x 1000`,
});
assert.equal(mobilePreview.summary.canApply, true, "preview de anotacao do celular deve ficar apto com dados sinteticos");
assert.equal(mobilePreview.summary.entradas, 4, "linhas com + devem virar entradas");
assert.equal(mobilePreview.summary.saidas, 10, "linhas sem + devem virar saidas");
assert.equal(mobilePreview.summary.retiradas, 12, "linhas funcionario - itens devem virar retiradas individuais");
assert.equal(mobilePreview.rows.find(row => row.rawItem === "1000")?.itemName, "Viaplus 1000", "alias 1000 deve reconhecer Viaplus 1000");
assert.equal(mobilePreview.rows.find(row => row.rawEmployee === "Lequinho")?.userId, 501, "alias persistente de funcionario deve ser aplicado");
assert.equal(mobilePreview.rows.find(row => row.rawText.includes("barra de asfalto"))?.date, "2026-06-30", "data 30/06 deve aplicar nas linhas seguintes");
assert.equal(mobilePreview.rows.some(row => row.date.startsWith("2025-")), false, "anotacoes sem ano nao devem assumir 2025 automaticamente");

const pendingGroupedPreview = buildMobileNotesPreview({
  importYear: 2026,
  inventory: [
    { id: 701, name: "raspador", type: "ferramenta", unit: "un", quantity: 10 },
    { id: 702, name: "Extensao", type: "ferramenta", unit: "un", quantity: 1 },
    { id: 703, name: "Marreta", type: "ferramenta", unit: "un", quantity: 10 },
    { id: 704, name: "Furadeira", type: "ferramenta", unit: "un", quantity: 10 },
    { id: 705, name: "broxa", type: "material", unit: "un", quantity: 10 },
  ],
  users: [
    { id: 801, username: "leandro", fullName: "Lequinho Aplicador", role: "funcionario" },
    { id: 802, username: "jhones", fullName: "Jhones Aplicador", role: "funcionario" },
  ],
  aliases: [{ alias: "Lequinho", userId: 801, username: "leandro" }],
  text: `30/06
Lequinho - raspador, extensão, soprador
Jhones - 2x extensão, 1x marreta
Biro - furadeira
2x broxa
+ 20x broxa`,
});
const lequinhoRows = pendingGroupedPreview.rows.filter(row => row.rawText === "Lequinho - raspador, extensão, soprador");
const jhonesRows = pendingGroupedPreview.rows.filter(row => row.rawText === "Jhones - 2x extensão, 1x marreta");
const biroRows = pendingGroupedPreview.rows.filter(row => row.rawText === "Biro - furadeira");
assert.equal(lequinhoRows.length, 3, "Lequinho deve manter uma linha original agrupavel com 3 itens");
assert.deepEqual(jhonesRows.map(row => row.quantity), [2, 1], "Jhones deve preservar quantidades 2x extensao e 1x marreta");
assert.equal(biroRows.length, 1, "Biro deve gerar um card/linha de retirada pendente");
assert.equal(biroRows[0].userId, null, "Biro deve ficar pendente de funcionario quando nao houver usuario correspondente");
assert.equal(lequinhoRows.find(row => row.rawItem === "soprador")?.status, "duvidoso", "Soprador deve ficar pendente dentro do card de Lequinho quando nao existir no estoque");
assert.equal(pendingGroupedPreview.rows.some(row => row.stockWarning), true, "Estoque insuficiente deve virar alerta no preview, nao bloqueio");

const pdfRow = (cells: Array<[number, string]>, y = 700, page = 1) => ({
  y,
  page,
  items: cells.map(([x, text]) => ({ x, y, page, text })),
});
const report = (type: any, headerTotal = 0) => ({ type, restoreType: type === "movimentacoes" ? "estoque" : type, marker: `tipo=${type}`, title: `IMPPEL ERP tipo=${type}`, headerTotal });

assert.equal(__testPdfRestoreParsing.parseMoney("R$ 60.64"), 60.64);
assert.equal(__testPdfRestoreParsing.parseMoney("R$ 990.00"), 990);
assert.equal(__testPdfRestoreParsing.parseMoney("R$ 1923.00"), 1923);
assert.equal(__testPdfRestoreParsing.parseMoney("R$ 95.15"), 95.15);
assert.equal(__testPdfRestoreParsing.parseMoney("R$ 1.234,56"), 1234.56);

const productRows = Array.from({ length: 45 }, (_, index) => {
  const names = ["Viaplus 1000", "Viaplus 7000", "Barra de Asfalto"];
  const prices = ["R$ 60.64", "R$ 211.76", "R$ 1758.95"];
  return pdfRow([
    [40, names[index] || `Material Sintetico ${index + 1}`],
    [270, "Impermeabilizante"],
    [430, "Marca"],
    [510, "un"],
    [560, prices[index] || "R$ 10.00"],
    [670, "0%"],
    [750, "Sim"],
  ], 700 - index);
});
const productPreview = __testPdfRestoreParsing.parseProducts("produtos.pdf", "produtos", report("produtos", 45), productRows);
assert.equal(productPreview.backup.data.products.length, 45, "PDF de produtos deve extrair 45 produtos");
assert.equal(productPreview.backup.data.products.find((item: any) => item.name === "Viaplus 1000").salePrice, 60.64);
assert.equal(productPreview.backup.data.products.find((item: any) => item.name === "Viaplus 7000").salePrice, 211.76);
assert.equal(productPreview.backup.data.products.find((item: any) => item.name === "Barra de Asfalto").salePrice, 1758.95);

const serviceRows = Array.from({ length: 24 }, (_, index) => {
  const names = ["Impermeabilização piscina", "Manta líquida + tela V50", "Manta asfáltica poliéster 3mm"];
  const prices = ["R$ 95.15", "R$ 104.50", "R$ 80.04"];
  return pdfRow([
    [40, names[index] || `Servico Sintetico ${index + 1}`],
    [210, "Descrição segura"],
    [660, prices[index] || "R$ 50.00"],
    [705, "R$ 10.00"],
    [760, "R$ 5.00"],
  ], 700 - index);
});
const servicePreview = __testPdfRestoreParsing.parseServices("servicos.pdf", "servicos", report("servicos", 24), serviceRows);
assert.equal(servicePreview.backup.data.services.length, 24, "PDF de servicos deve extrair 24 servicos");
assert.equal(servicePreview.backup.data.services.find((item: any) => item.name === "Impermeabilização piscina").pricePerUnit, 95.15);
assert.equal(servicePreview.backup.data.services.find((item: any) => item.name === "Manta líquida + tela V50").pricePerUnit, 104.50);
assert.equal(servicePreview.backup.data.services.find((item: any) => item.name === "Manta asfáltica poliéster 3mm").pricePerUnit, 80.04);

const stockRows = Array.from({ length: 72 }, (_, index) => {
  const names = ["Furadeira", "Batedor", "Viapol Manta Comum 3 mm"];
  const types = ["ferramenta", "ferramenta", "consumivel"];
  return pdfRow([
    [40, names[index] || `Item Sintetico ${index + 1}`],
    [280, types[index] || "consumivel"],
    [380, types[index] === "ferramenta" ? "Retornavel" : "Consumivel"],
    [470, "un"],
    [540, "2"],
    [630, "1"],
    [700, "R$ 990.00"],
  ], 700 - index);
});
const stockMovementHeader = pdfRow([[40, "Histórico de Movimentações"]], 500);
const stockMovementRows = Array.from({ length: 44 }, (_, index) => pdfRow([
  [40, `${String((index % 28) + 1).padStart(2, "0")}/06/2026`],
  [150, index % 2 === 0 ? "Furadeira" : "Viapol Manta Comum 3 mm"],
  [370, index % 2 === 0 ? "ENTRADA" : "SAÍDA"],
  [544, String((index % 5) + 1)],
  [630, `Movimento sintetico ${index + 1}`],
], 480 - index));
const stockPreview = __testPdfRestoreParsing.parseStock("estoque.pdf", "estoque", report("estoque", 72), [...stockRows, stockMovementHeader, ...stockMovementRows]);
assert.equal(stockPreview.backup.data.items.length, 72, "PDF de estoque deve extrair 72 itens");
assert.equal(stockPreview.backup.data.movements.length, 44, "PDF de estoque deve extrair 44 movimentacoes historicas");
assert.equal(stockPreview.pending.filter((item: string) => item.includes("Movimentação pendente")).length, 0, "movimentacoes historicas nao devem ficar pendentes por falta de quantidade");
assert.equal(stockPreview.backup.data.movements[0].quantity, 1, "quantidade em X=544 deve ser capturada");
assert.deepEqual(
  (({ name, type, pricePerUnit }: any) => ({ name, type, pricePerUnit }))(stockPreview.backup.data.items.find((item: any) => item.name === "Furadeira")),
  { name: "Furadeira", type: "ferramenta", pricePerUnit: 0 },
  "Furadeira nao deve carregar tipo/preco sujo do PDF",
);
assert.equal(stockPreview.backup.data.items.find((item: any) => item.name === "Batedor").type, "ferramenta");
assert.equal(stockPreview.backup.data.items.find((item: any) => item.name === "Viapol Manta Comum 3 mm").type, "consumivel");

const userRows = [
  pdfRow([[40, "Admin"], [160, "Senha alterada"], [260, "Administrador"], [480, "—"], [650, "admin"], [760, "Ativo"]], 700),
  pdfRow([[40, "joao.silva"], [160, "15022001"], [260, "Joao Silva"], [480, "Equipe Técnica"], [650, "funcionario"], [760, "Ativo"]], 690),
  pdfRow([[40, "maria.souza"], [160, "Senha alterada"], [260, "Maria Souza"], [480, "Administrativo /"], [650, "funcionario"], [760, "Inativo"]], 680),
];
const userPreview = __testPdfRestoreParsing.parseUsers(
  "usuarios.pdf",
  "usuarios",
  report("usuarios", 3),
  userRows,
  "Administrativo / Financeiro\nComercial / Atendimento\nMarketing / Redes Sociais\nEquipe Técnica\nGestão de EPIs,\nMateriais e Equipamentos\nGestão de Funcionários\nObras / Operações",
);
const adminUser = userPreview.backup.data.users.find((user: any) => user.username === "Admin");
const joaoUser = userPreview.backup.data.users.find((user: any) => user.username === "joao.silva");
const mariaUser = userPreview.backup.data.users.find((user: any) => user.username === "maria.souza");
assert.equal(adminUser.role, "admin", "Admin deve continuar admin");
assert.equal(joaoUser.role, "funcionario", "Funcionario deve continuar funcionario");
assert.equal(mariaUser.status, "inativo", "Status Inativo deve ser preservado");
assert.equal(adminUser.cargo, null, "Cargo travessao do Admin deve virar null");
assert.ok(userPreview.backup.data.roles.some((role: any) => role.name === "gestao_epis"), "Cargo gestao_epis deve entrar no preview");
assert.ok(userPreview.backup.data.roles.some((role: any) => role.name === "materiais_equipamentos"), "Cargo materiais_equipamentos deve entrar no preview");

const materialDateRow = pdfRow([[40, "30/06/2026"]], 620);
const materialRows = [
  materialDateRow,
  pdfRow([[46, "Responsável"], [142, "Itens"], [391, "Tipo"], [477, "Origem/Observação"], [681, "Status"]], 615),
  pdfRow([[46, "wellington.pires"], [142, "1x Furadeira, 2x Extensão elétrica"], [391, "Retirada"], [477, "OS 15"], [681, "pendente"]], 610),
  pdfRow([[142, "15x Viaplus 1000 (18 kg)"]], 600),
  pdfRow([[46, "Entradas"], [142, "3x Marreta"], [391, "Entrada"], [477, "Compra NF 10"], [681, "registrado"]], 590),
  pdfRow([[46, "Saídas/Consumo"], [142, "2x Broxa"], [391, "Saída/Consumo"], [477, "Consumo obra"], [681, "consumo"]], 580),
  pdfRow([[46, "Saídas/Consumo"], [142, "2x Broxa"], [391, "Saída/Consumo"], [477, "Consumo obra"], [681, "consumo"]], 570),
];
const materialsPreview = __testPdfRestoreParsing.parseMaterials(
  "controle-materiais.pdf",
  "materiais",
  report("materiais", 4),
  materialRows,
  "IMPPEL ERP\ntipo=materiais\nControle de Materiais",
);
assert.equal(materialsPreview.canApply, true, "PDF de materiais deve habilitar importação quando extrai registros válidos");
assert.equal(materialsPreview.backup.data.withdrawals.length, 1, "PDF de materiais deve extrair retiradas");
assert.equal(materialsPreview.backup.data.entries.length, 1, "PDF de materiais deve extrair entradas");
assert.equal(materialsPreview.backup.data.consumption.length, 1, "PDF de materiais deve extrair saídas/consumo");
assert.equal(materialsPreview.duplicateCount, 1, "Registros repetidos no PDF de materiais devem ser deduplicados");
assert.equal(materialsPreview.backup.data.withdrawals[0].withdrawalDate, "2026-06-30", "Data historica da retirada deve ser preservada");
assert.deepEqual(
  materialsPreview.backup.data.withdrawals[0].items.map((item: any) => `${item.quantity}x ${item.productName}`),
  ["1x Furadeira", "2x Extensão elétrica", "15x Viaplus 1000 (18 kg)"],
  "Itens quebrados em multiplas linhas devem permanecer no mesmo registro",
);
assert.equal(materialsPreview.backup.data.entries[0].status, "registrado", "Entrada deve manter status operacional de movimentação concluída");
assert.equal(materialsPreview.backup.data.consumption[0].type, "SAÍDA", "Saída/consumo deve virar movimentação de saída");
assert.equal(__testPdfRestoreParsing.parseMaterialItems("2x Extensão elétrica, 15x Viaplus 1000 (18 kg)")[1].productName, "Viaplus 1000 (18 kg)");

const contractSource = buildMaterialControlContract({
  withdrawals: [{
    username: "wellington.pires",
    withdrawalDate: "2026-06-30",
    status: "pendente",
    notes: "Importado via Registro Rapido #ca8ed68c167f",
    items: [
      { productName: "Furadeira", quantity: 1 },
      { productName: "Extensão elétrica", quantity: 2 },
    ],
  }],
  movements: [
    { productName: "Broxa", type: "ENTRADA", quantity: 3, date: "2026-06-30", notes: "Registro rápido/estoque" },
    { productName: "Viaplus 1000", type: "SAÍDA", quantity: 4, date: "2026-06-30", notes: "Registro rápido/estoque" },
  ],
  period: "all",
  exportedAt: "2026-07-21T12:00:00.000Z",
});
const contractRowsForPdf = [
  pdfRow([[40, "30/06/2026"]], 700),
  pdfRow([[46, "Responsável"], [142, "Itens"], [391, "Tipo"], [477, "Origem/Observação"], [681, "Status"]], 690),
  ...contractSource.data.rows.map((row: any, index: number) => pdfRow([
    [46, row.responsible],
    [142, row.itemsText],
    [391, row.type],
    [477, row.notes],
    [681, row.status],
  ], 680 - index * 10)),
];
const contractRoundTripPreview = __testPdfRestoreParsing.parseMaterials(
  "controle-materiais-contrato.pdf",
  "materiais",
  report("materiais", contractSource.data.rows.length),
  contractRowsForPdf,
  "IMPPEL ERP\ntipo=materiais\nControle de Materiais",
);
assert.deepEqual(
  contractRoundTripPreview.backup.data.rows.map((row: any) => [row.date, row.responsible, row.itemsText, row.type, row.status]),
  contractSource.data.rows.map((row: any) => [row.date, row.responsible, row.itemsText, row.type, row.status]),
  "Contrato Controle de Materiais deve sobreviver ao ciclo exportar PDF -> importar PDF",
);
const realLayoutMaterialRows = [
  pdfRow([[40, "30/06/2026"]], 700),
  pdfRow([[46, "Responsável"], [142, "Itens"], [391, "Tipo"], [477, "Origem/Observação"], [681, "Status"]], 680),
  pdfRow([[46, "Saídas/Consumo"], [142, "3x P.U. Bisnaga 900 g, 1x Impertela 1,05x50, 1x Suporte de"], [391, "Saída"], [477, "Registro rápido/estoque"], [681, "consumo"]], 660),
  pdfRow([[142, "Rolo, 3x Broxa, 1x Luva de Raspa"]], 652),
  pdfRow([[46, "Responsável"], [142, "Itens"], [391, "Tipo"], [477, "Origem/Observação"], [681, "Status"]], 640),
  pdfRow([[142, "2x Pincel"], [477, "observação continuada"], [681, "consumo"]], 632),
  pdfRow([[46, "Entradas"], [142, "70x Sika Alu tipo III 4mm, 10x Barra de Asfalto"], [391, "Entrada"], [477, "Registro rápido/estoque"], [681, "registrado"]], 620),
  pdfRow([[46, "Não trabalha para nós"], [142, "1x Escada"], [391, "Retirada"], [477, "Importado via Registro Rapido"], [681, "pendente"]], 600),
];
const realLayoutPreview = __testPdfRestoreParsing.parseMaterials(
  "controle-materiais-real-layout.pdf",
  "materiais",
  report("materiais", 4),
  realLayoutMaterialRows,
  "IMPPEL ERP\ntipo=materiais\nControle de Materiais",
);
assert.equal(realLayoutPreview.canApply, true, "Layout real deve habilitar preview quando todos os blocos operacionais são reconhecidos");
assert.equal(realLayoutPreview.backup.data.consumption.length, 1, "Saída quebrada deve continuar em um único bloco lógico");
assert.equal(realLayoutPreview.backup.data.entries.length, 1, "Entrada deve ser reconhecida pelo conteúdo e pelas colunas reais");
assert.equal(realLayoutPreview.backup.data.withdrawals.length, 1, "Responsável com espaço deve ser aceito em retirada");
assert.deepEqual(
  realLayoutPreview.backup.data.consumption[0].items.map((item: any) => item.productName),
  ["P.U. Bisnaga 900 g", "Impertela 1,05x50", "Suporte de Rolo", "Broxa", "Luva de Raspa", "Pincel"],
  "Itens com medida 1,05x50 e continuação após cabeçalho repetido devem ser preservados",
);

const crossPageMaterialRows = [
  pdfRow([[40, "30/06/2026"]], 700, 1),
  pdfRow([[46, "Responsável"], [142, "Itens"], [391, "Tipo"], [477, "Origem/Observação"], [681, "Status"]], 680, 1),
  pdfRow([[46, "Saídas/Consumo"], [142, "32x Viaplus 1000, 6x Luva de"], [391, "Saída"], [477, "Registro Rapido #94224e6d3fcb"], [681, "consumo"]], 660, 1),
  pdfRow([[142, "Raspa, 2x Impertela 1,05x50, 1x Viapol Manta Torodin 4 mm"]], 740, 2),
  pdfRow([[142, "1x Aplicador de PU, 1x Suporte de Rolo, 1x Viabit Primer (base solvente)"]], 730, 2),
  pdfRow([[46, "luiz.silva"], [142, "1x Drykoprimer Comum 4 mm"], [391, "Retirada"], [477, "OS teste"], [681, "pendente"]], 720, 2),
];
const crossPagePreview = __testPdfRestoreParsing.parseMaterials(
  "controle-materiais-cross-page.pdf",
  "materiais",
  report("materiais", 2),
  crossPageMaterialRows,
  "IMPPEL ERP\ntipo=materiais\nControle de Materiais",
);
assert.equal(crossPagePreview.backup.data.consumption.length, 1, "Continuação entre páginas não deve criar novo registro sem Tipo válido");
assert.deepEqual(
  crossPagePreview.backup.data.consumption[0].items.map((item: any) => `${item.quantity}x ${item.productName}`),
  [
    "32x Viaplus 1000",
    "6x Luva de Raspa",
    "2x Impertela 1,05x50",
    "1x Viapol Manta Torodin 4 mm",
    "1x Aplicador de PU",
    "1x Suporte de Rolo",
    "1x Viabit Primer (base solvente)",
  ],
  "Itens reais quebrados entre linhas/páginas devem ser reconstruídos sem quebrar medidas como 1,05x50",
);
assert.equal(crossPagePreview.backup.data.withdrawals[0].items[0].productName, "Drykoprimer Comum 4 mm", "Linha com Tipo Retirada deve iniciar novo registro real");
const applicator = { role: "funcionario", permissions: { registrarMaterials: true } };
assert.equal(canAccess(applicator, "viewDashboard"), false);
assert.equal(getDefaultLandingPath(applicator), "/controle-materiais");
assert.equal(getDefaultLandingPath({ role: "admin" }), "/dashboard");

console.log("Fluxos operacionais validados: Admin idempotente, aprovação idempotente, baixa de estoque, contrato PDF de materiais, restore histórico sem impacto de saldo, ferramentas retornaveis, regra consumivel/retornavel e entrada por cargo.");
