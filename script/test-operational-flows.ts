import assert from "node:assert/strict";

process.env.NODE_ENV = "development";

const { createMemoryStorage } = await import("../server/storage");
const { canAccess, getDefaultLandingPath } = await import("../client/src/lib/permissions");
const { generateInitialPassword } = await import("../shared/operationalUsers");
const { isMaterialWithdrawalPending, isReturnableMaterialItem, isConsumableMaterialItem, shouldRestoreReturnedQuantityToStock } = await import("../shared/materialReturnPolicy");
const { buildReturnableToolSummary } = await import("../shared/returnableToolSummary");

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

const applicator = { role: "funcionario", permissions: { registrarMaterials: true } };
assert.equal(canAccess(applicator, "viewDashboard"), false);
assert.equal(getDefaultLandingPath(applicator), "/controle-materiais");
assert.equal(getDefaultLandingPath({ role: "admin" }), "/dashboard");

console.log("Fluxos operacionais validados: aprovação idempotente, baixa de estoque, senha fixa, ferramentas retornaveis, regra consumivel/retornavel e entrada por cargo.");
