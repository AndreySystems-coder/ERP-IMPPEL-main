import assert from "node:assert/strict";

process.env.NODE_ENV = "development";

const { createMemoryStorage } = await import("../server/storage");
const { canAccess, getDefaultLandingPath } = await import("../client/src/lib/permissions");
const { generateInitialPassword } = await import("../shared/operationalUsers");
const { isMaterialWithdrawalPending, isReturnableMaterialItem, isConsumableMaterialItem } = await import("../shared/materialReturnPolicy");

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
assert.equal(isReturnableMaterialItem({ productName: "Ferramenta marreta" }), true, "ferramenta deve ser retornavel");
assert.equal(isMaterialWithdrawalPending({ status: "consumido", items: [{ productName: "Viaplus 1000" }] }), false, "consumivel nao deve ficar pendente");
assert.equal(isMaterialWithdrawalPending({ status: "pendente", items: [{ productName: "Ferramenta marreta" }] }), true, "retornavel deve ficar pendente ate devolucao");

const applicator = { role: "funcionario", permissions: { registrarMaterials: true } };
assert.equal(canAccess(applicator, "viewDashboard"), false);
assert.equal(getDefaultLandingPath(applicator), "/controle-materiais");
assert.equal(getDefaultLandingPath({ role: "admin" }), "/dashboard");

console.log("Fluxos operacionais validados: aprovação idempotente, baixa de estoque, senha fixa, regra consumivel/retornavel e entrada por cargo.");
