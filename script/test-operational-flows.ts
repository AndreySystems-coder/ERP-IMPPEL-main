import assert from "node:assert/strict";

process.env.NODE_ENV = "development";

const { createMemoryStorage } = await import("../server/storage");
const { canAccess, getDefaultLandingPath } = await import("../client/src/lib/permissions");
const { generateInitialPassword } = await import("../shared/operationalUsers");
const { isMaterialWithdrawalPending, isReturnableMaterialItem, isConsumableMaterialItem, shouldRestoreReturnedQuantityToStock } = await import("../shared/materialReturnPolicy");
const { getEffectiveMaterialSaleDiscountLimit } = await import("../shared/materialSalesPolicy");
const { buildReturnableToolSummary } = await import("../shared/returnableToolSummary");
const { buildMobileNotesPreview } = await import("../shared/mobileNotesImport");

const storage = createMemoryStorage();
const inventory = await storage.createInventoryItem({ name: "Primer teste", type: "material", unit: "un", quantity: 5, minStock: 1, pricePerUnit: 10 });
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

const approved = await storage.approveMaterialSale(sale.id, { id: 1, username: "admin" });
assert.equal(approved?.status, "aprovada");
assert.equal((await storage.getInventoryItems())[0].quantity, 3);
assert.equal((await storage.getInventoryMovements()).length, 1);
await storage.approveMaterialSale(sale.id, { id: 1, username: "admin" });
assert.equal((await storage.getInventoryMovements()).length, 1, "aprovação repetida duplicou a baixa");
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

const applicator = { role: "funcionario", permissions: { registrarMaterials: true } };
assert.equal(canAccess(applicator, "viewDashboard"), false);
assert.equal(getDefaultLandingPath(applicator), "/controle-materiais");
assert.equal(getDefaultLandingPath({ role: "admin" }), "/dashboard");

console.log("Fluxos operacionais validados: aprovação idempotente, baixa de estoque, senha fixa, ferramentas retornaveis, regra consumivel/retornavel e entrada por cargo.");
