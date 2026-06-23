import assert from "node:assert/strict";

process.env.NODE_ENV = "development";

const { createMemoryStorage } = await import("../server/storage");
const { canAccess, getDefaultLandingPath } = await import("../client/src/lib/permissions");

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

const applicator = { role: "funcionario", permissions: { registrarMaterials: true } };
assert.equal(canAccess(applicator, "viewDashboard"), false);
assert.equal(getDefaultLandingPath(applicator), "/controle-materiais");
assert.equal(getDefaultLandingPath({ role: "admin" }), "/dashboard");

console.log("Fluxos operacionais validados: aprovação idempotente, baixa de estoque e entrada por cargo.");
